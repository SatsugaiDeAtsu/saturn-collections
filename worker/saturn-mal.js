// Saturn Collections helper for MyAnimeList (Cloudflare Worker)
// Needs two settings in Cloudflare (Worker -> Settings -> Variables and Secrets):
//   MAL_CLIENT_ID      (text)    your MAL Client ID
//   MAL_CLIENT_SECRET  (secret)  your MAL Client Secret
const ORIGIN = 'https://satsugaideatsu.github.io';
const MAL = 'https://api.myanimelist.net/v2';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    try {
      // search anime / manga (public, uses the Client ID)
      if (url.pathname === '/search') {
        const type = url.searchParams.get('type') === 'manga' ? 'manga' : 'anime';
        const q = (url.searchParams.get('q') || '').slice(0, 64);
        const fields = type === 'anime'
          ? 'alternative_titles,start_season,num_episodes,mean,media_type,synopsis,genres'
          : 'alternative_titles,start_date,num_chapters,mean,media_type,synopsis,genres';
        const r = await fetch(`${MAL}/${type}?q=${encodeURIComponent(q)}&limit=16&nsfw=false&fields=${fields}`, { headers: { 'X-MAL-CLIENT-ID': env.MAL_CLIENT_ID } });
        return json(await r.json(), r.status);
      }
      // sign-in: swap the code (or refresh token) for an access token
      if (url.pathname === '/token' && req.method === 'POST') {
        const b = await req.json();
        const body = new URLSearchParams({ client_id: env.MAL_CLIENT_ID, client_secret: env.MAL_CLIENT_SECRET });
        if (b.refresh_token) { body.set('grant_type', 'refresh_token'); body.set('refresh_token', b.refresh_token); }
        else { body.set('grant_type', 'authorization_code'); body.set('code', b.code); body.set('code_verifier', b.code_verifier); body.set('redirect_uri', b.redirect_uri); }
        const r = await fetch('https://myanimelist.net/v1/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        return json(await r.json(), r.status);
      }
      // update or remove a list entry
      const m = url.pathname.match(/^\/list\/(anime|manga)\/(\d+)$/);
      if (m) {
        const auth = req.headers.get('Authorization') || '';
        if (!auth) return json({ error: 'not signed in' }, 401);
        const target = `${MAL}/${m[1]}/${m[2]}/my_list_status`;
        if (req.method === 'PATCH') {
          const b = await req.json();
          const r = await fetch(target, { method: 'PATCH', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) });
          return json(await r.json().catch(() => ({})), r.status);
        }
        if (req.method === 'DELETE') {
          const r = await fetch(target, { method: 'DELETE', headers: { Authorization: auth } });
          return json({ ok: r.ok }, r.status);
        }
      }
      return json({ ok: true, service: 'saturn-mal' });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
};
