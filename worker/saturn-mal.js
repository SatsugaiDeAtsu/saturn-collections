// Saturn Collections helper for MyAnimeList (Cloudflare Worker)
// Needs two settings in Cloudflare (Worker -> Settings -> Variables and Secrets):
//   MAL_CLIENT_ID      (text)    your MAL Client ID
//   MAL_CLIENT_SECRET  (secret)  your MAL Client Secret
//   TWITCH_CLIENT_ID     (text)    for the IGDB game database
//   TWITCH_CLIENT_SECRET (secret)  for the IGDB game database
const ORIGIN = 'https://satsugaideatsu.github.io';  // only your site may use this helper
const MAL = 'https://api.myanimelist.net/v2';
let igdbToken = null, igdbExp = 0;
async function igdb(env, body) {
  if (!igdbToken || Date.now() > igdbExp) {
    const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${env.TWITCH_CLIENT_ID}&client_secret=${env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`, { method: 'POST' });
    const j = await r.json();
    if (!j.access_token) throw new Error('Twitch login failed: ' + JSON.stringify(j));
    igdbToken = j.access_token; igdbExp = Date.now() + (j.expires_in - 300) * 1000;
  }
  const r = await fetch('https://api.igdb.com/v4/games', { method: 'POST', headers: { 'Client-ID': env.TWITCH_CLIENT_ID, Authorization: 'Bearer ' + igdbToken, Accept: 'application/json' }, body });
  return r.json();
}

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
      // game search (IGDB)
      if (url.pathname === '/games') {
        const q = (url.searchParams.get('q') || '').replace(/"/g, '').slice(0, 80);
        const data = await igdb(env, `search "${q}"; fields name,url,summary,first_release_date,cover.image_id,platforms.name,platforms.abbreviation,genres.name,involved_companies.developer,involved_companies.company.name; limit 16;`);
        return json(data);
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
