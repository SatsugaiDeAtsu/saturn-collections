// Saturn Collections helper for MyAnimeList (Cloudflare Worker)
// Needs two settings in Cloudflare (Worker -> Settings -> Variables and Secrets):
//   MAL_CLIENT_ID      (text)    your MAL Client ID
//   MAL_CLIENT_SECRET  (secret)  your MAL Client Secret
//   TWITCH_CLIENT_ID     (text)    for the IGDB game database
//   TWITCH_CLIENT_SECRET (secret)  for the IGDB game database
//   SPOTIFY_CLIENT_ID      (text)    from your Spotify developer app
//   SPOTIFY_CLIENT_SECRET  (secret)  from your Spotify developer app
//   SPOTIFY_REFRESH_TOKEN  (secret)  shown once after you open /spotify/login
//   LASTFM_API_KEY         (secret)  from last.fm/api/account/create
const ORIGIN = 'https://satsugaideatsu.github.io';  // only your site may use this helper
const MAL = 'https://api.myanimelist.net/v2';

// MyAnimeList sometimes fails for a moment (Cloudflare error 5xx, or an error page instead of data): try again a few times
async function malFetch(url, opts) {
  let last = null;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, opts && opts.body ? { ...opts, body: opts.body.toString() } : opts);
      const text = await r.text();
      let data = null;
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = null; }
      if (data !== null && r.status < 500) return { status: r.status, data };
      last = { status: r.status >= 500 ? r.status : 502, data: { error: 'MAL is having trouble (error ' + r.status + '). Try again in a few minutes.' } };
    } catch (e) {
      last = { status: 502, data: { error: 'Could not reach MAL. Try again in a few minutes.' } };
    }
    await new Promise(ok => setTimeout(ok, 700 * (i + 1)));
  }
  return last;
}
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

// ---------- Spotify (read-only: your top artists, plays, playlists, now playing) ----------
const SP_SCOPES = 'user-top-read user-read-recently-played user-read-currently-playing user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read user-follow-read';
let spToken = null, spExp = 0;
async function spAccess(env) {
  if (spToken && Date.now() < spExp) return spToken;
  const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET) }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: env.SPOTIFY_REFRESH_TOKEN }) });
  const j = await r.json();
  if (!j.access_token) throw new Error('Spotify login failed: ' + JSON.stringify(j));
  spToken = j.access_token; spExp = Date.now() + (j.expires_in - 120) * 1000;
  return spToken;
}
// only these read-only Spotify paths may be fetched through this helper
const SP_OK = [/^\/me$/, /^\/me\/top\/(artists|tracks)$/, /^\/me\/player\/recently-played$/, /^\/me\/player\/currently-playing$/, /^\/me\/playlists$/, /^\/playlists\/[A-Za-z0-9]+(\/items)?$/, /^\/me\/following$/, /^\/me\/albums$/, /^\/me\/tracks$/, /^\/artists\/[A-Za-z0-9]+(\/albums)?$/, /^\/albums\/[A-Za-z0-9]+$/, /^\/tracks\/[A-Za-z0-9]+$/, /^\/search$/];
const LFM_OK = ['user.getinfo', 'user.gettopartists', 'user.gettoptracks', 'user.gettopalbums', 'user.getrecenttracks', 'user.getweeklyartistchart', 'user.getweeklytrackchart', 'track.getinfo', 'artist.getinfo'];
const page = (title, body) => new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px system-ui;max-width:640px;margin:40px auto;padding:0 16px;background:#160a1c;color:#eee">${body}</body>`, { headers: { 'Content-Type': 'text/html;charset=utf-8' } });

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
        const r = await malFetch(`${MAL}/${type}?q=${encodeURIComponent(q)}&limit=16&nsfw=false&fields=${fields}`, { headers: { 'X-MAL-CLIENT-ID': env.MAL_CLIENT_ID } });
        return json(r.data, r.status);
      }
      // game search (IGDB)
      if (url.pathname === '/games') {
        const q = (url.searchParams.get('q') || '').replace(/"/g, '').slice(0, 80);
        const data = await igdb(env, `search "${q}"; fields name,url,summary,first_release_date,cover.image_id,platforms.name,platforms.abbreviation,genres.name,involved_companies.developer,involved_companies.company.name; limit 16;`);
        return json(data);
      }
      // book search (Goodreads' own quick search, so Urdu and lesser-known books turn up too)
      if (url.pathname === '/books') {
        const q = (url.searchParams.get('q') || '').slice(0, 80);
        const r = await fetch(`https://www.goodreads.com/book/auto_complete?format=json&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json' } });
        let d = [];
        try { d = JSON.parse(await r.text()); } catch (e) { d = []; }
        return json(Array.isArray(d) ? d : [], Array.isArray(d) ? 200 : 502);
      }
      // character and people search (MyAnimeList's own quick search)
      if (url.pathname === '/people') {
        const type = url.searchParams.get('type') === 'person' ? 'person' : 'character';
        const q = (url.searchParams.get('q') || '').slice(0, 64);
        const r = await fetch(`https://myanimelist.net/search/prefix.json?type=${type}&keyword=${encodeURIComponent(q)}&v=1`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'application/json' } });
        let d = {};
        try { d = JSON.parse(await r.text()); } catch (e) { d = {}; }
        return json(d, d.categories ? 200 : 502);
      }
      // sign-in: swap the code (or refresh token) for an access token
      if (url.pathname === '/token' && req.method === 'POST') {
        const b = await req.json();
        const body = new URLSearchParams({ client_id: env.MAL_CLIENT_ID, client_secret: env.MAL_CLIENT_SECRET });
        if (b.refresh_token) { body.set('grant_type', 'refresh_token'); body.set('refresh_token', b.refresh_token); }
        else { body.set('grant_type', 'authorization_code'); body.set('code', b.code); body.set('code_verifier', b.code_verifier); body.set('redirect_uri', b.redirect_uri); }
        const r = await malFetch('https://myanimelist.net/v1/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        return json(r.data, r.status);
      }
      // ---- Spotify: one-time sign-in, then read-only data ----
      if (url.pathname === '/spotify/login') {
        const q = new URLSearchParams({ client_id: env.SPOTIFY_CLIENT_ID, response_type: 'code', redirect_uri: url.origin + '/spotify/callback', scope: SP_SCOPES, show_dialog: 'true' });
        return Response.redirect('https://accounts.spotify.com/authorize?' + q, 302);
      }
      if (url.pathname === '/spotify/callback') {
        const code = url.searchParams.get('code');
        if (!code) return page('Spotify', '<h2>Sign-in was cancelled.</h2>');
        const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + btoa(env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET) }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: url.origin + '/spotify/callback' }) });
        const j = await r.json();
        if (!j.refresh_token) return page('Spotify', '<h2>Something went wrong</h2><pre style="white-space:pre-wrap">' + JSON.stringify(j).replace(/</g, '&lt;') + '</pre>');
        return page('Spotify connected', `<h2>Spotify connected ✓</h2><p>Copy this code and add it in Cloudflare (this Worker → Settings → Variables and Secrets) as a <b>Secret</b> named <b>SPOTIFY_REFRESH_TOKEN</b>. Don't share it with anyone.</p><textarea id="t" readonly style="width:100%;height:120px;background:#000;color:#9f9;font:13px monospace">${j.refresh_token}</textarea><p><button onclick="navigator.clipboard.writeText(document.getElementById('t').value);this.textContent='Copied ✓'" style="font-size:16px;padding:10px 18px">Copy</button></p><p>Then close this page.</p>`);
      }
      if (url.pathname === '/spotify/now') {
        const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: 'Bearer ' + await spAccess(env) } });
        if (r.status === 204) return json({ playing: false });
        const j = await r.json(), it = j.item;
        if (!it || !j.is_playing) return json({ playing: false });
        return json({ playing: true, id: it.id, n: it.name, ar: (it.artists || []).map(a => a.name).join(', '), img: ((it.album || {}).images || [])[0]?.url || '', url: (it.external_urls || {}).spotify || '' });
      }
      if (url.pathname.startsWith('/spotify/api/')) {
        const path = url.pathname.slice('/spotify/api'.length);
        if (!SP_OK.some(rx => rx.test(path))) return json({ error: 'not allowed' }, 403);
        const cache = caches.default, key = new Request(url.toString());
        const hit = await cache.match(key);
        if (hit) return new Response(hit.body, { status: hit.status, headers: { ...cors, 'Content-Type': 'application/json' } });
        const r = await fetch('https://api.spotify.com/v1' + path + url.search, { headers: { Authorization: 'Bearer ' + await spAccess(env) } });
        const out = new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=600' } });
        if (r.ok) await cache.put(key, out.clone());
        return out;
      }
      // ---- Last.fm (read-only) ----
      if (url.pathname === '/lastfm') {
        const p = new URLSearchParams(url.search), method = (p.get('method') || '').toLowerCase();
        if (!LFM_OK.includes(method)) return json({ error: 'not allowed' }, 403);
        p.set('api_key', env.LASTFM_API_KEY); p.set('format', 'json');
        const r = await fetch('https://ws.audioscrobbler.com/2.0/?' + p, { headers: { 'User-Agent': 'SaturnCollections/1.0' } });
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
          const r = await malFetch(target, { method: 'PATCH', headers: { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(b) });
          return json(r.data, r.status);
        }
        if (req.method === 'DELETE') {
          const r = await malFetch(target, { method: 'DELETE', headers: { Authorization: auth } });
          return json({ ok: r.status < 300, ...r.data }, r.status);
        }
      }
      return json({ ok: true, service: 'saturn-mal' });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
};
