"""Hourly: send edits waiting in data/mal_queue.json to MyAnimeList.

Uses its own MAL sign-in, kept in data/mal_sync.json locked (AES-GCM) with the passphrase in the
MAL_SYNC_KEY secret. Needs the secrets MAL_CLIENT_ID, MAL_CLIENT_SECRET and MAL_SYNC_KEY.
Newest change wins: if an entry was changed on MAL after the site edit, the site edit is dropped."""
import base64, json, os, sys, time, urllib.request, urllib.parse
from datetime import datetime, timezone
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

DATA = os.path.join(os.path.dirname(__file__), '..', 'data')
QF, SF = os.path.join(DATA, 'mal_queue.json'), os.path.join(DATA, 'mal_sync.json')
CID, CSEC, PASS = os.environ.get('MAL_CLIENT_ID', ''), os.environ.get('MAL_CLIENT_SECRET', ''), os.environ.get('MAL_SYNC_KEY', '')
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


def main():
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
        left = [x for x in q if not any(x['k'] == d['k'] and x['id'] == d['id'] and x['t'] == d['t'] for d in done)]
        json.dump({'q': left}, open(QF, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(done)} synced, {len(q) - len(done)} still waiting')
    open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a').write(f'synced={len(done)}\n')


main()
