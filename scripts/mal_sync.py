"""Hourly: send edits waiting in data/mal_queue.json to MyAnimeList.

Uses its own MAL sign-in, kept in data/mal_sync.json locked (AES-GCM) with the passphrase in the
MAL_SYNC_KEY secret. Needs the secrets MAL_CLIENT_ID, MAL_CLIENT_SECRET and MAL_SYNC_KEY.
Newest change wins: if an entry was changed on MAL after the site edit, the site edit is dropped."""
import base64, json, os, sys, time, urllib.request, urllib.parse
from datetime import datetime
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
QF, SF, CF = os.path.join(DATA, 'mal_queue.json'), os.path.join(DATA, 'mal_sync.json'), os.path.join(DATA, 'mal_sync_code.json')
CID, CSEC, PASS = os.environ.get('MAL_CLIENT_ID', '').strip(), os.environ.get('MAL_CLIENT_SECRET', '').strip(), os.environ.get('MAL_SYNC_KEY', '').strip()
load = lambda p, d: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else d


def key(salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=200000).derive(PASS.encode())


def unlock(s):
    salt, iv, ct = (base64.b64decode(s[x]) for x in ('salt', 'iv', 'ct'))
    return AESGCM(key(salt)).decrypt(iv, ct, None).decode()


def lock(rt):
    salt, iv = os.urandom(16), os.urandom(12)
    b = lambda x: base64.b64encode(x).decode()
    return {'salt': b(salt), 'iv': b(iv), 'ct': b(AESGCM(key(salt)).encrypt(iv, rt.encode(), None)), 't': int(time.time() * 1000)}


def call(url, method='GET', data=None, tok=None, form=False):
    h = {'User-Agent': 'SaturnCollections/1.0'}
    if tok:
        h['Authorization'] = 'Bearer ' + tok
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode()
        h['Content-Type'] = 'application/x-www-form-urlencoded'
    with urllib.request.urlopen(urllib.request.Request(url, data=body, method=method, headers=h), timeout=40) as r:
        t = r.read().decode() or '{}'
        return json.loads(t)


def finish_setup():
    """The site saved a MAL sign-in code (locked): swap it for a sign-in here, where MAL is reachable."""
    c = load(CF, None)
    if not c:
        return
    os.remove(CF)
    try:
        d = json.loads(unlock(c))
    except Exception:
        print('could not unlock the sign-in code: the passphrase typed on the site must match MAL_SYNC_KEY. Set up hourly sync again.')
        return
    try:
        j = call('https://myanimelist.net/v1/oauth2/token', 'POST', {'client_id': CID, 'client_secret': CSEC, 'grant_type': 'authorization_code',
                                                                     'code': d['code'], 'code_verifier': d['v'], 'redirect_uri': d['r']})
    except Exception as e:
        body = e.read().decode('utf-8', 'replace')[:300] if hasattr(e, 'read') else ''
        print('MAL did not accept the sign-in code: set up hourly sync again.', e, body)
        return
    json.dump(lock(j['refresh_token']), open(SF, 'w', encoding='utf-8'))
    print('hourly sync set up')


def main():
    if not (CID and CSEC and PASS):
        print('missing secrets MAL_CLIENT_ID / MAL_CLIENT_SECRET / MAL_SYNC_KEY')
        sys.exit(1)
    finish_setup()
    q = load(QF, {}).get('q', [])
    s = load(SF, None)
    if not s:
        print('hourly sync not set up yet (no data/mal_sync.json)')
        return
    if not (CID and CSEC and PASS):
        print('missing secrets MAL_CLIENT_ID / MAL_CLIENT_SECRET / MAL_SYNC_KEY')
        sys.exit(1)
    stale = time.time() * 1000 - s.get('t', 0) > 6 * 86400000  # keep the sign-in alive even when nothing is waiting
    if not q and not stale:
        print('nothing waiting')
        return
    rt = unlock(s)
    try:
        j = call('https://myanimelist.net/v1/oauth2/token', 'POST', {'client_id': CID, 'client_secret': CSEC, 'grant_type': 'refresh_token', 'refresh_token': rt})
    except Exception as e:
        print('MAL sign-in failed (MAL down, or sign-in expired: set up hourly sync again):', e)
        return
    tok = j['access_token']
    if j.get('refresh_token'):
        json.dump(lock(j['refresh_token']), open(SF, 'w', encoding='utf-8'))
    done = []
    for it in q:
        kind, mid = it['k'], it['id']
        url = f'https://api.myanimelist.net/v2/{kind}/{mid}/my_list_status'
        try:
            cur = call(f'https://api.myanimelist.net/v2/{kind}/{mid}?fields=my_list_status', tok=tok).get('my_list_status') or {}
            up = cur.get('updated_at')
            if up and datetime.fromisoformat(up.replace('Z', '+00:00')).timestamp() * 1000 >= it['t']:
                print('newer change on MAL, dropping site edit:', kind, mid)
                done.append(it)
                continue
            if it.get('del'):
                if cur:
                    call(url, 'DELETE', tok=tok)
            else:
                call(url, 'PATCH', {k: v for k, v in (it.get('b') or {}).items() if v is not None}, tok=tok)
            done.append(it)
            print('synced', kind, mid)
        except Exception as e:
            print('MAL not taking it yet:', kind, mid, e)
            break
        time.sleep(0.5)
    if done:
        # put the synced values into the site's own copy now, so nothing jumps back while MAL's public list catches up
        sp = os.path.join(DATA, 'site.json')
        site = load(sp, {})
        for it in done:
            L = site.get(it['k'], [])
            row = next((r for r in L if r[0] == it['id']), None)
            if it.get('del'):
                if row:
                    L.remove(row)
                continue
            sv = it.get('s') or {}
            if not row and it.get('info'):
                inf = it['info']
                row = ([it['id'], inf.get('t', ''), '', 6, 0, 0, inf.get('n', 0), inf.get('type', ''), inf.get('img', ''), str(inf.get('y', '')), [], 0, 0, 0, 0]
                       if it['k'] == 'anime' else
                       [it['id'], inf.get('t', ''), '', 6, 0, 0, inf.get('n', 0), 0, inf.get('v', 0), inf.get('type', ''), inf.get('img', ''), str(inf.get('y', '')), [], 0, 0, 0, 0])
                L.append(row)
            if not row:
                continue
            row[3], row[4] = sv.get('st', row[3]), sv.get('sc', row[4])
            row[5] = sv.get('ep' if it['k'] == 'anime' else 'ch', row[5])
            up = 12 if it['k'] == 'anime' else 16
            if len(row) > up:
                row[up] = int(it['t'] / 1000)
            irw, ing, irt = (13, 14, 15) if it['k'] == 'anime' else (14, 15, 17)
            if len(row) > ing and sv.get('rw') is not None:
                while len(row) <= irt:
                    row.append(0)
                if sv['rw'] > (row[irw] or 0):
                    row[irt] = int(it['t'] / 1000)  # a rewatch/reread: Recent activity shows it as one
                row[irw] = sv['rw']
            if it['k'] == 'manga':
                row[7] = sv.get('vol', row[7])
            if sv.get('tags') is not None:
                site.setdefault('animeTags' if it['k'] == 'anime' else 'mangaTags', {})[str(it['id'])] = sv['tags']
        if site:
            json.dump(site, open(sp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        left = [x for x in q if not any(x['k'] == d['k'] and x['id'] == d['id'] and x['t'] == d['t'] for d in done)]
        # keep what was just synced for a few days, so the nightly update can't undo it if MAL's public list is slow to show it
        now = time.time() * 1000
        recent = [x for x in load(QF, {}).get('recent', []) if now - x.get('done', 0) < 3 * 86400000] + [dict(d, done=now) for d in done]
        json.dump({'q': left, 'recent': recent[-60:]}, open(QF, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(done)} synced, {len(q) - len(done)} still waiting')
    open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a').write(f'synced={len(done)}\n')


main()
