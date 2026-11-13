#!/usr/bin/env python3
"""Refreshes data/site.json from the live sources.

Runs daily on GitHub Actions. Each source is updated on its own: if one
fails (site down, blocked, format change) the previous data for it is kept.

Live sources:   MyAnimeList (anime + manga lists, incl. your tags),
                Letterboxd RSS, Medium RSS, Goodreads RSS.
Manual imports: drop a new export into data/imports/ and the next run uses it:
                - Grouvee:    data/imports/grouvee_export.json
                - Letterboxd: data/imports/letterboxd/  (unzipped export folder)
                - Goodreads:  data/imports/goodreads_library_export.csv
"""
import csv, json, os, re, sys, glob, html, time
import socket
_gai = socket.getaddrinfo
# GitHub's runners have no IPv6 route; some sites (Jikan) answer IPv6 first, which made requests hang. Use IPv4.
socket.getaddrinfo = lambda *a, **k: [r for r in _gai(*a, **k) if r[0] == socket.AF_INET] or _gai(*a, **k)
import urllib.request, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
IMP = os.path.join(DATA, 'imports')

MAL_USER = 'SatsugaiDeAtsu'
LETTERBOXD_USER = 'satsugaideatsu'
MEDIUM_USER = 'rajeeljaved'
GOODREADS_ID = '206271423'

UA = 'Mozilla/5.0 (compatible; SaturnCollections/1.0; +https://github.com/SatsugaiDeAtsu/saturn-collections)'
log = lambda *a: print('[update]', *a, flush=True)


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(3 * (i + 1))


def save_img(path, data, max_w=600):
    """Store a picture. Ones wider than 600 px (twice the biggest size the site shows them at) are scaled down;
    smaller ones are saved exactly as downloaded, so nothing visible changes."""
    try:
        from PIL import Image
        import io
        im = Image.open(io.BytesIO(data))
        if im.width > max_w:
            im = im.convert('RGB').resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)
            out = io.BytesIO()
            im.save(out, 'JPEG', quality=90, optimize=True, progressive=True)
            if out.tell() < len(data):
                data = out.getvalue()
    except Exception:
        pass
    with open(path, 'wb') as f:
        f.write(data)


def repo_size():
    """Repo size in MB (GitHub reports it), so the site can tell you when it's time to tidy old pictures."""
    try:
        site['repoMB'] = round(json.loads(get('https://api.github.com/repos/SatsugaiDeAtsu/saturn-collections', tries=1)).get('size', 0) / 1024)
    except Exception:
        pass


def load_json(p, default):
    try:
        with open(p, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


site = load_json(os.path.join(DATA, 'site.json'), {})
settings = load_json(os.path.join(DATA, 'settings.json'), {})
site['hof'] = load_json(os.path.join(DATA, 'hof.json'), site.get('hof', {}))
status = {}


def year2(s):
    if not s:
        return 0
    yy = s[-2:]
    if not yy.isdigit():
        return 0
    v = int(yy)
    return 2000 + v if v <= 30 else 1900 + v


def mal_list(kind):
    out = []
    for off in range(0, 20000, 300):
        page = json.loads(get(f'https://myanimelist.net/{kind}list/{MAL_USER}/load.json?status=7&offset={off}'))
        out += page
        if len(page) < 300:
            break
        time.sleep(1.5)
    return out


def mal_rewatches(kind='anime'):
    """Times rewatched/reread per entry, from the official MAL API (load.json doesn't carry it)."""
    cid = settings.get('malClientId')
    if not cid:
        return None
    out = {}
    f1, f2 = ('num_times_rewatched', 'is_rewatching') if kind == 'anime' else ('num_times_reread', 'is_rereading')
    url = (f'https://api.myanimelist.net/v2/users/{MAL_USER}/{kind}list'
           f'?fields=list_status%7B{f1},{f2},updated_at%7D&limit=1000&nsfw=true')
    while url:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'X-MAL-CLIENT-ID': cid})
        with urllib.request.urlopen(req, timeout=40) as r:
            page = json.loads(r.read().decode('utf-8'))
        for it in page.get('data', []):
            ls = it.get('list_status') or {}
            up = ls.get('updated_at') or ''
            try:
                up = int(datetime.fromisoformat(up.replace('Z', '+00:00')).timestamp()) if up else 0
            except Exception:
                up = 0
            out[it['node']['id']] = (int(ls.get(f1) or 0), 1 if ls.get(f2) else 0, up)
        url = (page.get('paging') or {}).get('next')
        time.sleep(1)
    return out


# ---------------- MAL anime ----------------
def update_anime():
    rows = mal_list('anime')
    old_rw = {a[0]: (a[13], a[14]) for a in site.get('anime', []) if len(a) > 14}
    try:
        rw = mal_rewatches()
    except Exception as e:
        log('rewatch counts unavailable, keeping previous:', e)
        rw = None
    if rw is None:
        rw = old_rw
    genres, A, tags = [], [], {}
    for a in rows:
        gn = [g['name'] for g in (a.get('genres') or [])]
        if 'Hentai' in gn:
            continue
        gi = []
        for g in gn:
            if g not in genres:
                genres.append(g)
            gi.append(genres.index(g))
        eng = a.get('anime_title_eng') or ''
        title = eng if eng and eng != a['anime_title'] else a['anime_title']
        alt = a['anime_title'] if title != a['anime_title'] else ''
        img = re.sub(r'^.*images/anime/', '', (a.get('anime_image_path') or '').split('?')[0]).replace('.jpg', '')
        A.append([a['anime_id'], title, alt, a['status'], a['score'], a['num_watched_episodes'], a['anime_num_episodes'],
                  a.get('anime_media_type_string') or '', img, year2(a.get('anime_start_date_string')), gi,
                  float(a.get('anime_score_val') or 0), int(a.get('updated_at') or 0),
                  rw.get(a['anime_id'], (0, 0))[0], 1 if a.get('is_rewatching') else rw.get(a['anime_id'], (0, 0))[1]])
        note = '\n'.join(x for x in [str(a.get('tags') or '').strip(), str(a.get('notes') or '').strip()] if x)
        if note:
            tags[str(a['anime_id'])] = note
    if len(A) < 50:
        raise RuntimeError(f'only {len(A)} anime returned')
    site['anime'], site['animeGenres'], site['animeTags'] = A, genres, tags


# ---------------- MAL manga ----------------
def update_manga():
    rows = mal_list('manga')
    old_rr = {m[0]: (m[14], m[15], m[16] if len(m) > 16 else 0) for m in site.get('manga', []) if len(m) > 15}
    try:
        rr = mal_rewatches('manga')
    except Exception as e:
        log('reread counts unavailable, keeping previous:', e)
        rr = None
    if rr is None:
        rr = old_rr
    allow = set(settings.get('manga_allow', []))
    genres, M, mtags = [], [], {}
    for m in rows:
        gn = [g['name'] for g in (m.get('genres') or [])]
        if 'Hentai' in gn:
            continue
        if 'Erotica' in gn and m['manga_id'] not in allow:
            continue
        gi = []
        for g in gn:
            if g == 'Erotica':
                continue
            if g not in genres:
                genres.append(g)
            gi.append(genres.index(g))
        eng = m.get('manga_english') or ''
        title = eng if eng and eng != m['manga_title'] else m['manga_title']
        alt = m['manga_title'] if title != m['manga_title'] else ''
        img = re.sub(r'^.*images/manga/', '', (m.get('manga_image_path') or '').split('?')[0]).replace('.jpg', '')
        M.append([m['manga_id'], title, alt, m['status'], m['score'], m['num_read_chapters'], m['manga_num_chapters'],
                  m['num_read_volumes'], m['manga_num_volumes'], m.get('manga_media_type_string') or '', img,
                  year2(m.get('manga_start_date_string')), gi, float(m.get('manga_score_val') or 0),
                  rr.get(m['manga_id'], (0, 0))[0], 1 if m.get('is_rereading') else rr.get(m['manga_id'], (0, 0))[1],
                  int(m.get('updated_at') or 0) or (rr.get(m['manga_id'], (0, 0, 0)) + (0,))[2]])
        note = '\n'.join(x for x in [str(m.get('tags') or '').strip(), str(m.get('notes') or '').strip()] if x)
        if note:
            mtags[str(m['manga_id'])] = note
    if len(M) < 20:
        raise RuntimeError(f'only {len(M)} manga returned')
    site['manga'], site['mangaGenres'], site['mangaTags'] = M, genres, mtags


# ---------------- Letterboxd ----------------
LBNS = {'letterboxd': 'https://letterboxd.com', 'tmdb': 'https://themoviedb.org', 'dc': 'http://purl.org/dc/elements/1.1/'}
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()


def letterboxd_import():
    """Rebuild films from an unzipped Letterboxd export, if one was uploaded."""
    base = os.path.join(IMP, 'letterboxd')
    if not os.path.exists(os.path.join(base, 'watched.csv')):
        return False
    rd = lambda p: list(csv.DictReader(open(os.path.join(base, p), encoding='utf-8'))) if os.path.exists(os.path.join(base, p)) else []
    old = {norm(f['t']) + '|' + str(f['y']): f for f in site.get('films', [])}
    F = {}
    key = lambda n, y: norm(n) + '|' + str(int(y or 0))
    def blank(r, s):
        o = {'t': r['Name'], 'y': int(r['Year'] or 0), 'u': r['Letterboxd URI'], 'd': r['Date'], 'r': 0, 's': s, 'n': 0, 'rv': '', 'lk': 0}
        prev = old.get(key(r['Name'], r['Year']))
        if prev and prev.get('img'):
            o['img'] = prev['img']
        return o
    for w in rd('watched.csv'):
        F[key(w['Name'], w['Year'])] = blank(w, 'w')
    for r in rd('ratings.csv'):
        k = key(r['Name'], r['Year'])
        F.setdefault(k, blank(r, 'w'))['r'] = float(r['Rating'] or 0)
    for e in rd('diary.csv'):
        k = key(e['Name'], e['Year'])
        if k in F:
            F[k]['n'] += 1
            wd = e['Watched Date'] or e['Date']
            if wd > F[k].get('wd', ''):
                F[k]['wd'] = wd
            if e.get('Rewatch') == 'Yes':
                F[k].setdefault('rwd', []).append(wd)
    for e in rd('reviews.csv'):
        k = key(e['Name'], e['Year'])
        if k in F and e['Review'].strip():
            F[k]['rv'] = e['Review'].strip()
    for l in rd('likes/films.csv'):
        k = key(l['Name'], l['Year'])
        if k in F:
            F[k]['lk'] = 1
    for w in rd('watchlist.csv'):
        k = key(w['Name'], w['Year'])
        if k not in F:
            F[k] = blank(w, 'l')
    for f in F.values():
        f['rw'] = max(len(f.get('rwd', [])), f['n'] - 1, 0)
    site['films'] = list(F.values())
    L = []
    for p in sorted(glob.glob(os.path.join(base, 'lists', '*.csv'))):
        txt = open(p, encoding='utf-8').read().split('\n')
        meta = list(csv.DictReader(txt[1:3]))[0]
        items = list(csv.DictReader(txt[4:]))
        L.append({'name': meta['Name'].strip(), 'desc': meta['Description'], 'url': meta['URL'],
                  'items': [[i['Name'], int(i['Year'] or 0)] for i in items if i.get('Name')]})
    if L:
        site['filmLists'] = L
    prof = rd('profile.csv')
    if prof:
        site['lbFavUris'] = [u.strip() for u in prof[0].get('Favorite Films', '').split(',') if u.strip()]
        site.setdefault('lbProfile', {})['bio'] = prof[0].get('Bio', '')
    return True


def update_letterboxd():
    imported = letterboxd_import()
    xml = get(f'https://letterboxd.com/{LETTERBOXD_USER}/rss/')
    root = ET.fromstring(xml)
    films = site.setdefault('films', [])
    idx = {norm(f['t']) + '|' + str(f['y']): f for f in films}
    n = 0
    for it in root.iter('item'):
        t = it.findtext('letterboxd:filmTitle', namespaces=LBNS)
        if not t:
            continue  # lists etc.
        y = int(it.findtext('letterboxd:filmYear', '0', LBNS) or 0)
        k = norm(t) + '|' + str(y)
        f = idx.get(k)
        if not f:
            f = {'t': t, 'y': y, 'u': it.findtext('link') or '', 'd': '', 'r': 0, 's': 'w', 'n': 0, 'rv': '', 'lk': 0}
            films.append(f); idx[k] = f; n += 1
        f['s'] = 'w'
        wd = it.findtext('letterboxd:watchedDate', '', LBNS)
        if wd and it.findtext('letterboxd:rewatch', '', LBNS) == 'Yes' and wd not in f.setdefault('rwd', []):
            f['rwd'].append(wd)
            f['rw'] = max(f.get('rw', 0), len(f['rwd']))
        if wd:
            if wd > f.get('wd', ''):
                f['wd'] = wd
            if not f.get('d'):
                f['d'] = wd
        rt = it.findtext('letterboxd:memberRating', '', LBNS)
        if rt:
            f['r'] = float(rt)
        if it.findtext('letterboxd:memberLike', '', LBNS) == 'Yes':
            f['lk'] = 1
        desc = it.findtext('description') or ''
        m = re.search(r'<img src="([^"]+)"', desc)
        if m:
            f['img'] = m.group(1)
        txt = re.sub(r'<[^>]+>', ' ', desc)
        txt = html.unescape(re.sub(r'\s+', ' ', txt)).strip()
        if txt and not txt.startswith('Watched on') and len(txt) > 3:
            f['rv'] = txt
    log(f'letterboxd: {n} new films' + (' (rebuilt from export)' if imported else ''))


def update_letterboxd_watched():
    """Films marked watched on Letterboxd (the eye) never reach the diary feed, so read the Films pages too.
    Anything there that the site doesn't have yet is added to the list; watchlist films now watched move over.
    Nothing is ever removed here."""
    films = site.setdefault('films', [])
    idx = {norm(f['t']) + '|' + str(f.get('y') or 0): f for f in films}
    slug_of = lambda u: (re.search(r'/film/([^/]+)/', u or '') or [None, None])[1]
    by_slug = {slug_of(f.get('u')): f for f in films if slug_of(f.get('u'))}
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    seen = added = moved = 0
    for page in range(1, 60):
        url = f'https://letterboxd.com/{LETTERBOXD_USER}/films/' + (f'page/{page}/' if page > 1 else '')
        h = None
        for tr in range(4 if page == 1 else 1):  # Letterboxd often refuses later pages to scripts; page 1 holds the newest 72
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                                                           'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9'})
                with urllib.request.urlopen(req, timeout=40) as rs:
                    h = rs.read().decode('utf-8', 'replace')
                break
            except Exception as e:
                log(f'letterboxd films page {page}: {e} (try {tr + 1})')
                time.sleep(6 * (tr + 1))
        if h is None:
            break  # keep what the earlier pages gave
        items = re.findall(r'<li class="griditem">(.*?)</li>', h, re.S)
        if not items:
            break
        for it in items:
            nm = re.search(r'data-item-full-display-name="([^"]*)"', it) or re.search(r'data-item-name="([^"]*)"', it)
            sl = re.search(r'data-item-slug="([^"]*)"', it)
            if not nm or not sl:
                continue
            seen += 1
            name = html.unescape(nm.group(1)); slug = sl.group(1)
            m = re.match(r'(.*) \((\d{4})\)$', name)
            t, y = (m.group(1), int(m.group(2))) if m else (name, 0)
            rt = re.search(r'rated-(\d+)', it); r = int(rt.group(1)) / 2 if rt else 0
            lk = 1 if 'icon-liked' in it else 0
            f = by_slug.get(slug) or idx.get(norm(t) + '|' + str(y))
            if not f:
                f = {'t': t, 'y': y, 'u': f'https://letterboxd.com/film/{slug}/', 'd': today, 'r': r, 's': 'w', 'n': 0, 'rv': '', 'lk': lk}
                films.append(f); idx[norm(t) + '|' + str(y)] = f; by_slug[slug] = f; added += 1
                continue
            if f.get('s') != 'w':
                f['s'] = 'w'; f['d'] = today; moved += 1
            if r and not f.get('r'):
                f['r'] = r
            if lk:
                f['lk'] = 1
        time.sleep(1.5)
    log(f'letterboxd films pages: {seen} seen, {added} new, {moved} moved from watchlist')


def update_posters():
    key = settings.get('tmdbKey')
    if not key:
        return
    done = 0
    for f in site.get('films', []):
        if f.get('img') or f.get('tmdbTried') or done >= 200:
            continue
        q = urllib.parse.quote(f['t'])
        try:
            r = json.loads(get(f'https://api.themoviedb.org/3/search/movie?api_key={key}&query={q}&year={f["y"]}', tries=1))
            res = r.get('results') or []
            if not res and f['y']:
                r = json.loads(get(f'https://api.themoviedb.org/3/search/movie?api_key={key}&query={q}', tries=1))
                res = r.get('results') or []
            res = [x for x in res if norm(x.get('title')) == norm(f['t'])]
            if res and res[0].get('poster_path'):
                f['img'] = 'https://image.tmdb.org/t/p/w342' + res[0]['poster_path']
            else:
                f['tmdbTried'] = 1
        except Exception:
            pass
        done += 1
        time.sleep(0.25)
    log(f'tmdb: looked up {done} posters')


from html.parser import HTMLParser

MAL = 'https://myanimelist.net'
KIND = {'anime': 'a', 'manga': 'm', 'character': 'c', 'people': 'p'}
LINK = re.compile(r'(?:https?://myanimelist\.net)?/(anime|manga|character|people)/(\d+)')


class BlogTokens(HTMLParser):
    """Turns a MAL blog entry into a stream of text / link / line-break tokens."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0; self.on = False; self.toks = []; self.link = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if not self.on:
            if tag == 'div' and 'blog_detail_content_wrapper' in (a.get('class') or ''):
                self.on = True; self.depth = 1
            return
        if tag in ('br',):
            self.toks.append(('br',)); return
        if tag not in ('img', 'hr', 'input', 'meta', 'link'):
            self.depth += 1
        if tag == 'a':
            m = LINK.search(a.get('href') or '')
            self.link = [KIND[m.group(1)], int(m.group(2)), '', ''] if m else None
        elif tag == 'img' and self.link is not None:
            self.link[3] = a.get('data-src') or a.get('src') or ''
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
    def handle_endtag(self, tag):
        if not self.on or tag in ('br', 'img', 'hr', 'input', 'meta', 'link'):
            return
        if tag == 'a' and self.link is not None:
            self.toks.append(('link', *self.link)); self.link = None
        if tag in ('div', 'p', 'li', 'tr', 'center', 'table', 'h1', 'h2', 'h3', 'h4', 'h5'):
            self.toks.append(('br',))
        self.depth -= 1
        if self.depth <= 0:
            self.on = False
    def handle_data(self, d):
        if not self.on:
            return
        t = re.sub(r'\s+', ' ', d).strip()
        if not t:
            return
        if self.link is not None:
            self.link[2] += t
        else:
            self.toks.append(('text', t))


def blog_sections(eid):
    p = BlogTokens(); p.feed(get(f'{MAL}/blog.php?eid={eid}'))
    secs, cur, last_link = [], None, False
    for tk in p.toks:
        if tk[0] == 'br':
            continue
        if tk[0] == 'text':
            if cur is None or last_link or cur['items']:
                cur = {'h': tk[1], 'd': [], 'items': []}; secs.append(cur)
            else:
                cur['d'].append(tk[1])
            last_link = False
        else:
            if cur is None:
                cur = {'h': '', 'd': [], 'items': []}; secs.append(cur)
            cur['items'].append(tk[1:]); last_link = True
    return [s for s in secs if s['items']]


def nice(t):
    t = re.sub(r'\s+', ' ', t).strip()
    if t.isupper() or sum(c.isupper() for c in t) > len(t) * 0.6:
        t = t.lower()
        t = t[:1].upper() + t[1:]
        t = re.sub(r"\bsaturn's\b", "Saturn's", t)
        t = re.sub(r'\b(va|mal)\b', lambda m: m.group(1).upper(), t)
        t = re.sub(r'\bi\b', 'I', t)
    return t


def update_hof():
    hof = load_json(os.path.join(DATA, 'hof.json'), {})
    cache = load_json(os.path.join(DATA, 'hof_cache.json'), {})
    fetched = [0]
    def info(k, i, img=''):
        code = f'{k}{i}'
        c = cache.get(code)
        if not c or not c.get('n'):
            c = {'n': '', 'img': ''}
            try:
                h = get(f'{MAL}/{ {"a":"anime","m":"manga","c":"character","p":"people"}[k] }/{i}', tries=2)
                m = re.search(r'<meta property="og:title" content="([^"]*)"', h)
                im = re.search(r'<meta property="og:image" content="([^"]*)"', h)
                c['n'] = html.unescape(m.group(1)) if m else ''
                c['img'] = im.group(1) if im else ''
            except Exception:
                pass
            fetched[0] += 1
            time.sleep(1.0)
        if img:
            c['img'] = img          # your own picture from the blog wins
        cache[code] = c
        return c
    # favourites from the profile page
    prof = get(f'{MAL}/profile/{MAL_USER}')
    favs = {'anime': [], 'manga': [], 'character': [], 'people': [], 'company': []}
    for m in re.finditer(r'id="(anime|manga|character|characters|people|person|company)_favorites"(.*?)</ul>', prof, re.S):
        kind, body = {'person': 'people', 'characters': 'character'}.get(m.group(1), m.group(1)), m.group(2)
        for li in re.finditer(r'<a href="([^"]+)"[^>]*>(.*?)</a>', body, re.S):
            href, inner = li.group(1), li.group(2)
            title = re.search(r'<span class="title[^"]*">(.*?)</span>', inner, re.S)
            users = re.search(r'<span class="users">(.*?)</span>', inner, re.S)
            img = re.search(r'data-src="([^"]+)"', inner)
            title = html.unescape(re.sub(r'<[^>]+>', '', title.group(1)).strip()) if title else ''
            if kind == 'company':
                cm = re.search(r'/producer/(\d+)', href)
                favs['company'].append([int(cm.group(1)) if cm else 0, title, img.group(1) if img else '']); continue
            lm = LINK.search(href)
            if not lm:
                continue
            k, i = KIND[lm.group(1)], int(lm.group(2))
            sub = html.unescape(re.sub(r'<[^>]+>', '', users.group(1)).strip()).replace('\xb7', ' · ') if users else ''
            pic = re.sub(r'/r/\d+x\d+/', '/', img.group(1).split('?')[0]) if img else ''
            if pic:
                cache.setdefault(f'{k}{i}', {'n': title, 'img': ''})['img'] = pic
                cache[f'{k}{i}']['n'] = cache[f'{k}{i}'].get('n') or title
            favs[{'a': 'anime', 'm': 'manga', 'c': 'character', 'p': 'people'}[k]].append([i, (title.split(', ')[1] + ' ' + title.split(', ')[0]) if k in 'cp' and title.count(', ') == 1 else title, sub])
    if len(favs['anime']) >= 3 and len(favs['character']) >= 3:
        for k in ('people', 'company', 'manga'):
            if not favs[k]:
                favs[k] = hof.get('malFavs', {}).get(k, [])
        hof['malFavs'] = favs
    log('favourites found:', {k: len(v) for k, v in favs.items()})
    # blog posts
    def flip(k, n):
        if k in 'cp' and n.count(', ') == 1:
            a, b = n.split(', ')
            return f'{b} {a}'
        return n
    def items(s):
        out = []
        for k, i, txt, img in s['items']:
            c = info(k, i, '')
            name = flip(k, c["n"] or txt or "?").replace('~', ' ')
            # each link keeps its own picture from the blog, so the same character can appear with different pictures
            out.append(f'{k}{i}~{name}~{img}' if img else f'{k}{i}~{name}')
        return out
    hon_chr = blog_sections(804802)
    log('blog 804802 sections:', len(hon_chr))
    hon, chr_ = [], []
    prev = ''
    for s in hon_chr:
        h = nice(s['h']); d = nice(' '.join(s['d']))
        if re.match(r'honorary favou?rite', h, re.I):
            prev = re.sub(r'(?i)honorary favou?rite ', '', h)
            hon.append([h, d, items(s)])
        elif re.match(r'honorary mentions', h, re.I) and prev:
            hon.append([f'Honorary mentions: {prev}', d, items(s)])
        else:
            chr_.append([h, d, items(s)])
    wai = [[nice(s['h']), nice(' '.join(s['d'])), items(s)] for s in blog_sections(804810)]
    cou = blog_sections(804809)
    couples, special, sdesc, in_special = [], [], '', False
    def split_name(text):
        """'some intro sentence. Name And Name ( Show )' -> ('intro', 'Name and Name', 'Show')"""
        m = re.search(r'([^.!?]*?)\s*\(\s*([^()]*?)\s*\)\s*$', text)
        if not m:
            return text, '', ''
        intro = text[:m.start()].strip()
        name = m.group(1).strip()
        return intro, re.sub(r'\s+And\s+', ' and ', name), m.group(2)
    for s in cou:
        h = s['h']; d = ' '.join(s['d'])
        intro = ''
        if re.match(r'(?i)favou?rite anime couples|a special mention', h):
            if re.match(r'(?i)a special mention', h):
                in_special = True
            intro, name, show = split_name(d)
            if in_special and intro:
                sdesc = intro
        else:
            _, name, show = split_name((h + ' ' + d).strip())
            if not name:
                name, show = h, d
        pair = items(s)
        for extra in settings.get('hof_add', {}).get(name, []):
            if extra not in pair:
                pair.insert(0, extra)
        (special if in_special else couples).append([name, show, pair])
    if len(hon) >= 4 and len(chr_) >= 4 and len(wai) >= 4:
        hof['blog'] = [{'post': 804802, 'secs': hon}, {'post': 804802, 'secs': chr_}, {'post': 804810, 'secs': wai}]
        hof['people'] = []
    if len(couples) >= 10:
        hof['couples'] = couples
        hof['specialCouples'] = {'desc': sdesc or hof.get('specialCouples', {}).get('desc', ''), 'pairs': special}
    with open(os.path.join(DATA, 'hof.json'), 'w', encoding='utf-8') as f:
        json.dump(hof, f, ensure_ascii=False, indent=1)
    with open(os.path.join(DATA, 'hof_cache.json'), 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)
    site['hof'] = hof
    site['hofImages'] = {k: v['img'] for k, v in cache.items() if v.get('img')}
    log(f'hall of fame: refreshed from MAL, looked up {fetched[0]} new names')


def mirror_book_covers():
    """Copies of book covers kept with the site (covers/b), so they don't depend on Goodreads or Open Library."""
    path = os.path.join(DATA, 'book_covers.json')
    covers = load_json(path, {})
    bd = os.path.join(os.path.dirname(DATA), 'covers', 'b')
    os.makedirs(bd, exist_ok=True)
    for bid, v in list(covers.items()):
        if isinstance(v, str) and v.startswith('http'):
            try:
                save_img(os.path.join(bd, f'{bid}.jpg'), get_bytes(v))
                covers[bid] = f'covers/b/{bid}.jpg'
            except Exception as e:
                log('book cover copy failed', bid, e)
            time.sleep(0.3)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(covers, f, indent=0)
    site['bookCovers'] = {k: v for k, v in covers.items() if v}


def update_book_covers():
    """Find covers for books that have none (Open Library). Stored separately in
    data/book_covers.json so the updater never edits books.json (which you edit on the site)."""
    books = load_json(os.path.join(DATA, 'books.json'), {}).get('books', [])
    path = os.path.join(DATA, 'book_covers.json')
    covers = load_json(path, {})
    n = 0
    for b in books:
        bid = str(b.get('id'))
        if b.get('img') or bid in covers or n >= 80:
            continue
        title = re.sub(r'\s*\(.*?\)\s*', ' ', b['t']).split(':')[0].strip()
        q = urllib.parse.urlencode({'title': title, 'author': b.get('a', ''), 'limit': 3, 'fields': 'cover_i'})
        try:
            docs = json.loads(get(f'https://openlibrary.org/search.json?{q}', tries=2)).get('docs') or []
            cov = next((d['cover_i'] for d in docs if d.get('cover_i')), None)
            covers[bid] = f'https://covers.openlibrary.org/b/id/{cov}-M.jpg' if cov else ''
        except Exception:
            pass
        n += 1
        time.sleep(0.6)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(covers, f, indent=0)
    site['bookCovers'] = {k: v for k, v in covers.items() if v}
    log(f'book covers: looked up {n}, have {len(site["bookCovers"])}')


def steam_cover(title):
    """Portrait cover from Steam (no key needed): store search, then the app's library artwork."""
    import difflib
    res = json.loads(get('https://store.steampowered.com/api/storesearch/?l=english&cc=us&term=' + urllib.parse.quote(title), tries=2))
    best, score = None, 0
    strip = lambda n: re.sub(r'\b(legacy|enhanced|definitive|remastered|remaster|edition|complete|goty|game of the year|director s cut|the trilogy)\b', '', norm(n)).strip()
    for it in res.get('items') or []:
        r = max(difflib.SequenceMatcher(None, norm(it.get('name')), norm(title)).ratio(),
                1.0 if strip(it.get('name')) == strip(title) else 0)
        if r > score:
            best, score = it, r
    if not best or score < 0.82:
        return None
    appid = best['id']
    q = json.dumps({'ids': [{'appid': appid}], 'context': {'language': 'english', 'country_code': 'US'},
                    'data_request': {'include_assets': True}}, separators=(',', ':'))
    urls = []
    try:
        it = json.loads(get('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' + urllib.parse.quote(q), tries=2))
        item = (it.get('response', {}).get('store_items') or [{}])[0]
        a = item.get('assets') or {}
        fmt = a.get('asset_url_format') or ''
        for k in ('library_capsule_2x', 'library_capsule'):
            if a.get(k) and fmt:
                urls.append('https://shared.cloudflare.steamstatic.com/store_item_assets/' + fmt.replace('${FILENAME}', a[k]))
    except Exception as e:
        log('steam assets failed for', title, e)
    urls += [f'https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg']
    for u in urls:
        try:
            b = get_bytes(u)
            if len(b) > 3000:
                return b
        except Exception:
            pass
    return None


def wiki_cover(title):
    """Box art from the game's Wikipedia article (the infobox image, which is usually the cover)."""
    u = ('https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrlimit=5&prop=pageprops|description'
         '&ppprop=page_image&gsrsearch=' + urllib.parse.quote(title + ' video game'))
    pages = sorted(json.loads(get(u, tries=2)).get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    for p in pages:
        img = (p.get('pageprops') or {}).get('page_image')
        if not img or 'game' not in (p.get('description') or '').lower():
            continue
        if norm(re.sub(r'\s*\(.*?\)$', '', p['title'])) != norm(title):
            continue  # only the game's own article, never a series page
        ii = json.loads(get('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&iiurlwidth=500&titles='
                            + urllib.parse.quote('File:' + img), tries=2))
        for pg in ii.get('query', {}).get('pages', {}).values():
            info = (pg.get('imageinfo') or [{}])[0]
            if info.get('width') and info['height'] < info['width'] * 1.05:
                continue  # a logo or screenshot, not box art
            src = info.get('thumburl') or info.get('url')
            if src:
                return get_bytes(src)
    return None


def update_game_covers():
    """Covers for games that have none. Default: Steam, then Wikipedia (no keys). With settings.igdb on: IGDB through the Cloudflare helper.
    Pictures are saved in covers/g/, results remembered in data/game_covers.json."""
    games = load_json(os.path.join(DATA, 'games.json'), {}).get('games', [])
    path = os.path.join(DATA, 'game_covers.json')
    covers = load_json(path, {})
    gd = os.path.join(os.path.dirname(DATA), 'covers', 'g')
    os.makedirs(gd, exist_ok=True)
    use_igdb = settings.get('igdb') and settings.get('workerUrl')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    n = 0
    for gid, v in list(covers.items()):
        if v.startswith('http'):  # a picked picture (Wikipedia box art etc.): download it once
            try:
                b = get_bytes(v)
                if len(b) > 2000:
                    save_img(os.path.join(gd, f'{gid}.jpg'), b)
                    covers[gid] = f'covers/g/{gid}.jpg?v={today}'
            except Exception as e:
                log('cover download failed', v, e)
            time.sleep(0.3)
    for g in games:
        gid = str(g.get('id'))
        prev = covers.get(gid)
        if g.get('img') or n >= 150:
            continue
        if prev and not prev.startswith('miss:') and not prev.startswith('http'):
            continue
        if prev and prev.startswith('http'):
            continue
        if prev and prev[5:] > (datetime.now(timezone.utc) - timedelta(days=14)).strftime('%Y-%m-%d'):
            continue  # tried recently, try again in two weeks
        n += 1
        img = None
        try:
            if use_igdb:
                res = json.loads(get(settings['workerUrl'] + '/games?q=' + urllib.parse.quote(g['t']), tries=2))
                hit = next((x for x in res if x.get('cover') and norm(x['name']) == norm(g['t'])), None) or next((x for x in res if x.get('cover')), None)
                if hit:
                    img = get_bytes(f"https://images.igdb.com/igdb/image/upload/t_cover_big/{hit['cover']['image_id']}.jpg")
            if not img:
                img = wiki_cover(g['t'])   # original box art first
            if not img:
                img = steam_cover(g['t'])
        except Exception as e:
            log('game cover lookup failed for', g['t'], e)
        if img:
            save_img(os.path.join(gd, f'{gid}.jpg'), img)
            covers[gid] = f'covers/g/{gid}.jpg'
        else:
            covers[gid] = 'miss:' + today
        time.sleep(0.5)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(covers, f, indent=0)
    site['gameCovers'] = {k: v for k, v in covers.items() if v and not v.startswith('miss:') and not v.startswith('http')}
    missing = [g['t'] for g in games if not g.get('img') and str(g.get('id')) not in site['gameCovers']]
    site['gameCoverMissing'] = missing
    log(f'game covers: looked up {n}, have {len(site["gameCovers"])}, missing {len(missing)}: {missing[:30]}')


def hltb_search(title, token):
    body = {'searchType': 'games', 'searchTerms': re.sub(r'[:\-]', ' ', title).split(), 'searchPage': 1, 'size': 40,
            'searchOptions': {'games': {'userId': 0, 'platform': '', 'sortCategory': 'popular', 'rangeCategory': 'main',
                                        'rangeTime': {'min': None, 'max': None},
                                        'gameplay': {'perspective': '', 'flow': '', 'genre': '', 'difficulty': ''},
                                        'rangeYear': {'min': '', 'max': ''}, 'modifier': ''},
                              'users': {'sortCategory': 'postcount'}, 'lists': {'sortCategory': 'follows'},
                              'filter': '', 'sort': 0, 'randomizer': 0}, 'useCache': True}
    req = urllib.request.Request('https://howlongtobeat.com/api/search/site', data=json.dumps(body).encode(), method='POST',
                                 headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36',
                                          'Content-Type': 'application/json', 'Referer': 'https://howlongtobeat.com/',
                                          'Origin': 'https://howlongtobeat.com', 'x-auth-token': token})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode()).get('data', [])


JUNK_DLC = re.compile(r'soundtrack|\bost\b|art ?book|wallpaper|avatar|costume|outfit|\bskins?\b|cosmetic|pre-?order|upgrade|deluxe|season pass|'
                      r'bundle|currency|coins|points|booster|\bxp\b|sticker|emote|theme|weapon pack|bonus|digital|edition|demo|'
                      r'starter|cheat|unlock|time saver|supporter|tracks?\b|music|poster|calling card|camo|reticle|operator|blueprint|'
                      r'tracer|\bkit\b|\bset\b|paint|livery|sound pack|voice pack|horse|mount|pet\b|character|legend pack|squad pack|'
                      r'weapon|\bvo\b|slots|annual pass|season|battle ?pass|\bpro\b|redsec|nuketown|mask|helmet|gear|vehicle|car pack|bling|'
                      r'\bpack\b|\bpass\b|toy box|map|multiplayer|co-?op|arena|challenge|survivor mode|mode\b', re.I)
STORY_DLC = re.compile(r'expansion|episode|chapter|story|campaign|\bsaga\b|\btale', re.I)


def steam_dlcs(title, year):
    """Story/map DLC names for a game, from Steam (only when the store has the exact game)."""
    res = json.loads(get('https://store.steampowered.com/api/storesearch/?l=english&cc=us&term=' + urllib.parse.quote(title), tries=2))
    clean = lambda n: norm(re.sub(r'[™®©]', '', n or ''))
    hit = next((it for it in res.get('items') or [] if clean(it.get('name')) == norm(title)), None)
    if not hit:
        return None
    info = json.loads(get(f"https://store.steampowered.com/api/appdetails?l=english&appids={hit['id']}", tries=2)).get(str(hit['id']), {}).get('data') or {}
    rel = (info.get('release_date') or {}).get('date') or ''
    if year and re.search(r'(19|20)\d\d', rel) and abs(int(re.search(r'(19|20)\d\d', rel).group(0)) - int(year)) > 2:
        return None  # a remake or a different game with the same name
    ids = info.get('dlc') or []
    names = []
    for i in range(0, len(ids), 30):
        q = json.dumps({'ids': [{'appid': x} for x in ids[i:i + 30]], 'context': {'language': 'english', 'country_code': 'US'},
                        'data_request': {'include_release': True}}, separators=(',', ':'))
        r = json.loads(get('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' + urllib.parse.quote(q), tries=2))
        for it in r.get('response', {}).get('store_items') or []:
            n = re.sub(r'[™®©]', '', it.get('name') or '').strip()
            if n.lower().startswith(title.lower()):
                n = n[len(title):].strip(' :-–')
            rel_ts = (it.get('release') or {}).get('steam_release_date') or 0
            recent = rel_ts and time.time() - rel_ts < 400 * 86400  # anything released in the last year counts as worth listing
            if n and not JUNK_DLC.search(n) and (STORY_DLC.search(n) or recent):
                names.append(re.sub(r'\s*\b(content pack|map pack|dlc)\b\s*', ' ', n, flags=re.I).strip(' :-–') or n)
        time.sleep(0.5)
    return names


def dlc_picture(game, dlc):
    """Box art for a DLC: its Wikipedia article if it has one, else its Steam artwork."""
    for title in (f'{game}: {dlc}', f'{game} – {dlc}', dlc):
        try:
            u = ('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageprops|description&ppprop=page_image&redirects=1&titles='
                 + urllib.parse.quote(title))
            pg = next(iter(json.loads(get(u, tries=1)).get('query', {}).get('pages', {}).values()), {})
            img, ds = (pg.get('pageprops') or {}).get('page_image'), (pg.get('description') or '').lower()
            if img and norm(dlc) in norm(pg.get('title')) and re.search(r'expansion|downloadable|dlc|video game|episode', ds):
                ii = json.loads(get('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size&iiurlwidth=400&titles='
                                    + urllib.parse.quote('File:' + img), tries=1))
                info = (next(iter(ii.get('query', {}).get('pages', {}).values()), {}).get('imageinfo') or [{}])[0]
                if info.get('height', 0) >= info.get('width', 1):
                    return get_bytes(info.get('thumburl') or info['url'])
        except Exception:
            pass
        time.sleep(0.4)
    try:
        res = json.loads(get('https://store.steampowered.com/api/storesearch/?l=english&cc=us&term=' + urllib.parse.quote(f'{game} {dlc}'), tries=1))
        hit = next((it for it in res.get('items') or [] if norm(dlc) in norm(it.get('name'))), None)
        if hit:
            q = json.dumps({'ids': [{'appid': hit['id']}], 'context': {'language': 'english', 'country_code': 'US'},
                            'data_request': {'include_assets': True}}, separators=(',', ':'))
            it = (json.loads(get('https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=' + urllib.parse.quote(q), tries=1))
                  .get('response', {}).get('store_items') or [{}])[0]
            a = it.get('assets') or {}
            for k in ('library_capsule', 'library_capsule_2x', 'main_capsule', 'header'):
                if a.get(k) and a.get('asset_url_format'):
                    b = get_bytes('https://shared.cloudflare.steamstatic.com/store_item_assets/' + a['asset_url_format'].replace('${FILENAME}', a[k]))
                    if len(b) > 3000:
                        return b
    except Exception:
        pass
    return None


def update_dlc_pictures():
    """A picture for every DLC in the lists (kept in covers/d/). Ones without a picture are retried every two weeks."""
    path = os.path.join(DATA, 'game_meta.json')
    meta = load_json(path, {})
    games = {str(g['id']): g['t'] for g in load_json(os.path.join(DATA, 'games.json'), {}).get('games', [])}
    dd = os.path.join(os.path.dirname(DATA), 'covers', 'd')
    os.makedirs(dd, exist_ok=True)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    retry = (datetime.now(timezone.utc) - timedelta(days=14)).strftime('%Y-%m-%d')
    t0, got = time.time(), 0
    for gid, m in meta.items():
        imgs = m.setdefault('dimg', {})
        for name in m.get('dlc', []):
            have = imgs.get(name, '')
            if have.startswith('http'):  # a picked picture: download it once
                try:
                    b = get_bytes(have)
                    fn = f"{gid}_{re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')}.jpg"
                    save_img(os.path.join(dd, fn), b)
                    imgs[name] = 'covers/d/' + fn
                    got += 1
                except Exception as e:
                    log('dlc picture failed', name, e)
                continue
            if have.startswith('covers/') or (have.startswith('miss:') and have[5:] > retry) or time.time() - t0 > 360 or gid not in games:
                continue
            b = dlc_picture(games[gid], name)
            if b:
                fn = f"{gid}_{re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')}.jpg"
                save_img(os.path.join(dd, fn), b)
                imgs[name] = 'covers/d/' + fn
                got += 1
            else:
                imgs[name] = 'miss:' + today
        if not imgs:
            m.pop('dimg', None)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=0)
    site['gameMeta'] = {k: {x: v[x] for x in ('avg', 'dlc', 'syn') if v.get(x)} | ({'dimg': {n: p for n, p in v['dimg'].items() if p.startswith('covers/')}} if v.get('dimg') else {})
                        for k, v in meta.items()}
    log(f'dlc pictures: +{got}')


REL_KEEP = {'sequel', 'prequel', 'side_story', 'parent_story', 'alternative_version', 'alternative_setting', 'spin_off',
            'summary', 'full_story', 'other', 'character'}


def mal_detail(kind, mid, cid):
    f = ('id,title,alternative_titles,main_picture,media_type,start_date,status,genres,related_anime,related_manga,synopsis,mean,'
         + ('num_episodes,average_episode_duration,broadcast,studios,start_season,source' if kind == 'anime' else 'num_chapters,num_volumes,authors{first_name,last_name}'))
    req = urllib.request.Request(f'https://api.myanimelist.net/v2/{kind}/{mid}?fields={f}', headers={'User-Agent': UA, 'X-MAL-CLIENT-ID': cid})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode('utf-8'))
    pic = ((d.get('main_picture') or {}).get('medium') or '')
    o = {'t': (d.get('alternative_titles') or {}).get('en') or d.get('title'), 'ty': d.get('media_type') or '', 'sd': d.get('start_date') or '',
         'img': re.sub(r'^.*/images/' + kind + '/', '', pic.split('?')[0]).replace('.jpg', '').replace('.webp', '')}
    if (d.get('alternative_titles') or {}).get('en') and d['alternative_titles']['en'] != d.get('title'):
        o['jt'] = d.get('title')
    gn = [g['name'] for g in d.get('genres') or []]
    if 'Hentai' in gn or 'Erotica' in gn:
        o['x'] = 1  # adult: never shown
    o['g'] = [x for x in gn if x not in ('Hentai', 'Erotica')]  # genres plus themes (Psychological, Isekai...)
    if d.get('source'):
        o['src'] = d['source']
    o['st'] = d.get('status') or ''
    if d.get('mean'):
        o['mal'] = d['mean']
    syn = re.sub(r'\s*\[Written by MAL Rewrite\]\s*', '', d.get('synopsis') or '').strip()
    if syn:
        cut = syn[:420]
        o['syn'] = (cut[:cut.rfind('. ') + 1] if len(syn) > 420 and '. ' in cut else cut).strip()
    if kind == 'anime':
        o['n'] = d.get('num_episodes') or 0
        o['dur'] = d.get('average_episode_duration') or 0
        bc = d.get('broadcast') or {}
        if bc.get('day_of_the_week'):
            o['bc'] = [bc['day_of_the_week'], bc.get('start_time') or '']
        o['stu'] = [x['name'] for x in d.get('studios') or []][:3]
    else:
        o['au'] = [' '.join(x for x in [(a.get('node') or {}).get('first_name'), (a.get('node') or {}).get('last_name')] if x) for a in d.get('authors') or []][:3]
        o['n'] = d.get('num_chapters') or 0
        o['v'] = d.get('num_volumes') or 0
    o['ra'] = [[x['node']['id'], x['relation_type']] for x in d.get('related_anime') or [] if x.get('relation_type') in REL_KEEP]
    o['rm'] = [[x['node']['id'], x['relation_type']] for x in d.get('related_manga') or []]
    # titles of related entries, so they can be shown before their own details are fetched
    o['_nb'] = [['a', x['node']['id'], x['node']['title'], ((x['node'].get('main_picture') or {}).get('medium') or '')] for x in d.get('related_anime') or []] + \
               [['m', x['node']['id'], x['node']['title'], ((x['node'].get('main_picture') or {}).get('medium') or '')] for x in d.get('related_manga') or []]
    return o


def mal_page_links(kind, mid):
    """Anime<->manga links ('Adaptation' etc.) from the Related Entries part of a MAL page."""
    other = 'manga' if kind == 'anime' else 'anime'
    h = re.sub(r'\s+', ' ', get(f'https://myanimelist.net/{kind}/{mid}', tries=2))
    i = h.find('related-entries')
    if i < 0:
        i = h.find('Related Entries')
    if i < 0:
        return []
    part = h[i:i + 60000]
    out, seen = [], set()
    # tile layout: <div class="relation"> Adaptation (Manga) </div> <div class="title"><a href=".../manga/ID/...">Title</a>
    for rel, oid, t in re.findall(r'class="relation">\s*([A-Za-z -]+?)\s*(?:\([^)]*\))?\s*</div>(?:(?!class="relation").){0,600}?<a href="https://myanimelist\.net/' + other + r'/(\d+)/[^"]*"[^>]*>([^<]+)</a>', part):
        if oid not in seen:
            seen.add(oid); out.append([int(oid), rel.strip().lower().replace(' ', '_').replace('-', '_'), html.unescape(t).strip()])
    # table layout: <td ...>Adaptation:</td><td ...><ul class="entries"><li><a href=".../manga/ID/...">Title</a> ...
    for rel, cell in re.findall(r'<td[^>]*>\s*([A-Za-z -]+?):\s*</td>\s*<td[^>]*>(.*?)</td>', part):
        for oid, t in re.findall(r'href="https://myanimelist\.net/' + other + r'/(\d+)/[^"]*"[^>]*>([^<]+)</a>', cell):
            if oid not in seen:
                seen.add(oid); out.append([int(oid), rel.strip().lower().replace(' ', '_').replace('-', '_'), html.unescape(t).strip()])
    return out[:12]


def update_mal_details():
    """Episode length and how every anime/manga connects to others (sequels, prequels, films, OVAs...),
    for everything in your lists and whatever they link to. Kept in data/mal_details.json; refreshed every 45 days."""
    cid = settings.get('malClientId')
    path = os.path.join(DATA, 'mal_details.json')
    det = load_json(path, {'a': {}, 'm': {}})
    allow = set(settings.get('manga_allow', []))
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    old = (datetime.now(timezone.utc) - timedelta(days=45)).strftime('%Y-%m-%d')
    mine = [('anime', 'a', a[0]) for a in site.get('anime', [])] + [('manga', 'm', m[0]) for m in site.get('manga', [])]
    # what your entries link to, one step out
    nbs = []
    for kind, k, mid in mine:
        for kk, nid, _t, _p in det[k].get(str(mid), {}).get('_nb', []):
            nbs.append(('anime' if kk == 'a' else 'manga', kk, nid))
        for nid, _r, _t in det[k].get(str(mid), {}).get('ad', []):
            nbs.append(('manga', 'm', nid) if k == 'a' else ('anime', 'a', nid))
    queue = sorted(set(mine), key=lambda x: det[x[1]].get(str(x[2]), {}).get('c', '')) + sorted(set(nbs), key=lambda x: det[x[1]].get(str(x[2]), {}).get('c', ''))
    t0, n, fails = time.time(), 0, 0
    for kind, k, mid in queue:
        cur = det[k].get(str(mid))
        fresh = cur and cur.get('c', '') > old and cur.get('v') == 3
        if cur and cur.get('st') == 'currently_airing' and cur.get('c', '') < today:
            fresh = False  # airing shows: refresh daily so episode counts and times stay right
        if fresh or time.time() - t0 > 3600 or fails > 25:
            continue
        try:
            o = mal_detail(kind, mid, cid)
            if k == 'm' and mid in allow:
                o.pop('x', None)
            o['c'] = today
            o['v'] = 3
            keep = (cur or {}).get('ad')  # adaptation links found earlier
            if keep is not None:
                o['ad'] = keep
            det[k][str(mid)] = o
            n += 1
        except Exception as e:
            if '404' in str(e):
                det[k][str(mid)] = {'gone': 1, 'c': today, 'v': 3}
            else:
                fails += 1
                log('mal details failed', kind, mid, e)
        time.sleep(0.8)
    # anime <-> manga links: MAL's official data leaves these out, so read them from the MAL page itself
    t1, jn = time.time(), 0
    for kind, k, mid in sorted(set(mine), key=lambda x: det[x[1]].get(str(x[2]), {}).get('adc', '')):
        cur = det[k].get(str(mid))
        if not cur or cur.get('adc', '') > old or time.time() - t1 > 1800:
            continue
        try:
            cur['ad'] = mal_page_links(kind, mid)
            cur['adc'] = today
            jn += 1
        except Exception as e:
            log('related entries failed', kind, mid, e)
            if '404' not in str(e):
                break
        time.sleep(1.0)
    # synopses go in their own file (loaded only when needed)
    syn = {'a': {}, 'm': {}}
    for k in ('a', 'm'):
        for i, o in det[k].items():
            if o.get('syn'):
                syn[k][i] = o.pop('syn')
    old_syn = load_json(os.path.join(DATA, 'mal_syn.json'), {'a': {}, 'm': {}})
    for k in ('a', 'm'):
        old_syn[k].update(syn[k])
    with open(os.path.join(DATA, 'mal_syn.json'), 'w', encoding='utf-8') as f:
        json.dump(old_syn, f, ensure_ascii=False, separators=(',', ':'))
    for k in ('a', 'm'):
        for o in det[k].values():
            o.pop('_nbp', None)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(det, f, ensure_ascii=False, separators=(',', ':'))
    log(f'mal details: +{n} fetched, +{jn} anime-manga links,, {len(det["a"])} anime / {len(det["m"])} manga known, {fails} failed')


def update_film_details():
    """Runtime and film series (collections) from TMDB, for every film with a TMDB id. Kept in data/film_details.json."""
    key = settings.get('tmdbKey')
    if not key:
        return
    path = os.path.join(DATA, 'film_details.json')
    det = load_json(path, {'f': {}, 'col': {}})
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    old = (datetime.now(timezone.utc) - timedelta(days=90)).strftime('%Y-%m-%d')
    t0, n = time.time(), 0
    lpath = os.path.join(DATA, 'films_local.json')
    local = load_json(lpath, {'films': []})
    for fm in site.get('films', []) + local.get('films', []):
        tid = fm.get('tmdb')
        if not tid or fm.get('tv') or (det['f'].get(str(tid), {}).get('c', '') > old and det['f'].get(str(tid), {}).get('v') == 3) or time.time() - t0 > 600:
            continue
        try:
            d = json.loads(get(f'https://api.themoviedb.org/3/movie/{tid}?api_key={key}&append_to_response=credits', tries=1))
            o = {'rt': d.get('runtime') or 0, 'c': today, 'v': 3, 'tt': d.get('title') or '', 'pp': d.get('poster_path') or ''}
            cr = d.get('credits') or {}
            o['dir'] = [x['name'] for x in cr.get('crew') or [] if x.get('job') == 'Director'][:2]
            o['cast'] = [x['name'] for x in sorted(cr.get('cast') or [], key=lambda x: x.get('order', 99))][:5]
            o['g'] = [x['name'] for x in d.get('genres') or []][:4]
            ov = (d.get('overview') or '').strip()
            if ov:
                o['ov'] = ov[:500]
            col = d.get('belongs_to_collection')
            if col:
                o['col'] = col['id']
                if det['col'].get(str(col['id']), {}).get('c', '') <= old:
                    cd = json.loads(get(f'https://api.themoviedb.org/3/collection/{col["id"]}?api_key={key}', tries=1))
                    det['col'][str(col['id'])] = {'n': cd.get('name') or col.get('name'), 'c': today,
                                                  'p': sorted([[x['id'], x.get('title'), x.get('release_date') or '', x.get('poster_path') or '']
                                                               for x in cd.get('parts') or []], key=lambda x: x[2] or '9999')}
            det['f'][str(tid)] = o
            n += 1
        except Exception as e:
            log('tmdb details failed', tid, e)
        time.sleep(0.15)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(det, f, ensure_ascii=False, separators=(',', ':'))
    for fm in site.get('films', []):
        pp = det['f'].get(str(fm.get('tmdb')), {}).get('pp')
        if fm.get('needImg') and pp:
            fm['img'] = 'https://image.tmdb.org/t/p/w342' + pp
            fm.pop('needImg', None)
    fixed = 0
    for fm in local.get('films', []):  # films added by hand on the site get their poster here
        pp = det['f'].get(str(fm.get('tmdb')), {}).get('pp')
        if not fm.get('img') and pp:
            fm['img'] = 'https://image.tmdb.org/t/p/w342' + pp
            fixed += 1
    if fixed:
        with open(lpath, 'w', encoding='utf-8') as f:
            json.dump(local, f, ensure_ascii=False, indent=1)
    site['filmDir'] = {k: v['dir'][0] for k, v in det['f'].items() if v.get('dir')}
    log(f'film details: +{n}, {len(det["f"])} films, {len(det["col"])} series')


def update_summaries():
    """Short descriptions for games (Wikipedia) and books (Open Library), kept in game_meta.json / book_meta.json."""
    gpath = os.path.join(DATA, 'game_meta.json')
    gm = load_json(gpath, {})
    t0, n = time.time(), 0
    for g in load_json(os.path.join(DATA, 'games.json'), {}).get('games', []):
        m = gm.setdefault(str(g['id']), {})
        if 'syn' in m or time.time() - t0 > 240:
            continue
        y = (g.get('rel') or '')[:4]
        txt = ''
        for cand in ([f"{g['t']} ({y} video game)"] if y else []) + [f"{g['t']} (video game)", g['t']]:
            try:
                u = ('https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|description&exintro=1&explaintext=1&exsentences=3&redirects=1&titles='
                     + urllib.parse.quote(cand))
                pg = next(iter(json.loads(get(u, tries=1)).get('query', {}).get('pages', {}).values()), {})
                if 'missing' not in pg and 'game' in (pg.get('description') or '').lower() and pg.get('extract'):
                    txt = pg['extract'].strip()
                    break
            except Exception:
                pass
            time.sleep(0.3)
        m['syn'] = txt[:500]
        n += 1
    with open(gpath, 'w', encoding='utf-8') as f:
        json.dump(gm, f, ensure_ascii=False, indent=0)
    bpath = os.path.join(DATA, 'book_meta.json')
    bm = load_json(bpath, {})
    for b in load_json(os.path.join(DATA, 'books.json'), {}).get('books', []):
        bid = str(b.get('id'))
        if bid in bm or time.time() - t0 > 400:
            continue
        txt = ''
        try:
            title = re.sub(r'\s*\(.*?\)\s*', ' ', b['t']).strip()
            q = urllib.parse.urlencode({'title': title, 'author': b.get('a', ''), 'limit': 1, 'fields': 'key'})
            docs = json.loads(get('https://openlibrary.org/search.json?' + q, tries=1)).get('docs') or []
            if docs:
                w = json.loads(get('https://openlibrary.org' + docs[0]['key'] + '.json', tries=1))
                dsc = w.get('description') or ''
                txt = (dsc.get('value') if isinstance(dsc, dict) else dsc) or ''
                txt = re.sub(r'\s*\(?\[source\]\(.*?\)\)?|-{3,}.*$', '', txt, flags=re.S).strip()
        except Exception:
            pass
        bm[bid] = {'syn': txt[:600]}
        n += 1
        time.sleep(0.4)
    with open(bpath, 'w', encoding='utf-8') as f:
        json.dump(bm, f, ensure_ascii=False, indent=0)
    site['bookMeta'] = {k: v for k, v in bm.items() if v.get('syn')}
    log(f'summaries: +{n}')


def update_game_meta():
    """Average length and the DLC list for every game. Runs through a few games each day so each one is re-checked about
    once a week; new DLC is added on its own (from Steam), nothing you ticked is ever removed. Kept in data/game_meta.json."""
    path = os.path.join(DATA, 'game_meta.json')
    meta = load_json(path, {})
    games = load_json(os.path.join(DATA, 'games.json'), {}).get('games', [])
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).strftime('%Y-%m-%d')
    order = sorted(games, key=lambda g: (meta.get(str(g['id']), {}).get('chk', ''), g['t']))
    done, added = 0, []
    for g in order:
        m = meta.setdefault(str(g['id']), {})
        if m.get('chk', '') > week_ago or done >= 20:
            continue
        done += 1
        m['chk'] = today
        try:
            names = steam_dlcs(g['t'], (g.get('rel') or '')[:4])
        except Exception as e:
            log('steam dlc lookup failed for', g['t'], e)
            continue
        for n in names or []:
            have = [norm(x) for x in m.setdefault('dlc', [])]
            if not any(h and (norm(n) == h or norm(n) in h or h in norm(n)) for h in have):
                m['dlc'].append(n)
                added.append(f"{g['t']}: {n}")
        if not m.get('dlc'):
            m.pop('dlc', None)
        time.sleep(0.7)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=0)
    site['gameMeta'] = {k: {x: v[x] for x in ('avg', 'dlc', 'syn') if v.get(x)} for k, v in meta.items()}
    log(f'game meta: checked {done}, new DLC: {added}')


def char_page(cid):
    """Basic details of a MAL character, read from its page."""
    h = re.sub(r'\s+', ' ', get(f'https://myanimelist.net/character/{cid}'))
    txt = lambda x: html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
    o = {}
    m = re.search(r'<h2 class="normal_header"[^>]*>(.*?)</h2>(.*?)(?:<div|<table|Voice Actors)', h)
    if m:
        jp = re.search(r'<small>\((.*?)\)</small>', m.group(1))
        if jp:
            o['jp'] = html.unescape(jp.group(1))
        o['name'] = txt(re.sub(r'<span.*', '', m.group(1)))
        lines = [txt(x) for x in re.split(r'<br\s*/?>', m.group(2))]
        facts, about = [], []
        for ln in lines:
            fm = re.match(r"^([A-Z][\w .'/()-]{0,28}):\s*(.{1,80})$", ln)
            if fm and not about:
                facts.append([fm.group(1), fm.group(2)])
            elif ln:
                about.append(ln)
        if facts:
            o['facts'] = facts[:10]
        ab = ' '.join(x for x in about if not x.startswith('(Source'))
        if ab:
            cut = ab[:320]
            o['about'] = (cut[:cut.rfind('. ') + 1] if '. ' in cut else cut) or cut
    f = re.search(r'Member Favorites:\s*([\d,]+)', h)
    if f:
        o['fav'] = int(f.group(1).replace(',', ''))
    for key, a1, a2, kind in (('anime', 'Animeography', 'Mangaography', 'anime'), ('manga', 'Mangaography', 'Member Favorites', 'manga')):
        i, j = h.find(a1), h.find(a2)
        if i < 0:
            continue
        part = h[i:j if j > i else i + 20000]
        rows = re.findall(r'<a href="https://myanimelist\.net/' + kind + r'/(\d+)/[^"]*">([^<]+)</a>.*?<small>([^<]+)</small>', part)
        if rows:
            o[key] = [[int(a), html.unescape(t), r] for a, t, r in rows[:12]]
    v = h.find('Voice Actors')
    if v > 0:
        vas = re.findall(r'<a href="https://myanimelist\.net/people/(\d+)/[^"]*">([^<]+)</a> <div[^>]*><small>([^<]+)</small>', h[v:v + 30000])
        if vas:
            o['va'] = [[int(a), html.unescape(n), l] for a, n, l in vas if l in ('Japanese', 'English')][:4]
    return o


def update_char_info():
    """Basic MAL details for every character in the Hall of Fame. A few new ones each run; each is refreshed every two months."""
    path = os.path.join(DATA, 'char_info.json')
    info = load_json(path, {})
    hof = load_json(os.path.join(DATA, 'hof.json'), {})
    ids = set(re.findall(r'"c(\d+)~', json.dumps(hof)))
    ids |= {str(c[0]) for c in (site.get('hof', {}).get('malFavs', {}).get('character') or [])}
    old = (datetime.now(timezone.utc) - timedelta(days=60)).strftime('%Y-%m-%d')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    t0, n, fails = time.time(), 0, 0
    for cid in sorted(ids, key=lambda c: info.get(c, {}).get('chk', '')):
        if info.get(cid, {}).get('chk', '') > old or time.time() - t0 > 420 or fails > 5:
            continue
        try:
            d = char_page(cid)
            if d.get('name'):
                d['chk'] = today
                info[cid] = d
                n += 1
        except Exception as e:
            fails += 1
            log('character page failed', cid, e)
        time.sleep(2.5)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, indent=0)
    site.pop('charInfo', None)  # the site loads data/char_info.json only when a character is opened
    log(f'character details: +{n}, have {len(info)} of {len(ids)}')


def get_bytes(u):
    req = urllib.request.Request(u, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


# ---------------- Medium ----------------
def update_medium():
    root = ET.fromstring(get(f'https://medium.com/feed/@{MEDIUM_USER}'))
    ns = {'content': 'http://purl.org/rss/1.0/modules/content/'}
    old = {s['link']: s for s in site.get('stories', [])}
    for it in root.iter('item'):
        link = (it.findtext('link') or '').split('?')[0]
        body = it.findtext('content:encoded', '', ns)
        txt = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body))).strip()
        try:
            date = datetime.strptime(it.findtext('pubDate'), '%a, %d %b %Y %H:%M:%S %Z').strftime('%Y-%m-%d')
        except Exception:
            date = old.get(link, {}).get('date', '')
        old[link] = {'title': it.findtext('title'), 'link': link, 'date': date,
                     'tags': [c.text for c in it.findall('category')], 'words': len(txt.split()),
                     'blurb': ' '.join(txt.split()[:40])}
    site['stories'] = sorted(old.values(), key=lambda s: s['date'], reverse=True)


# ---------------- Goodreads ----------------
GR_ST = {'read': 'read', 'currently-reading': 'reading', 'to-read': 'toread', 'did-not-finish': 'dnf',
         'on-hold': 'hold', 'paused': 'hold'}


def book_from(t, a, rating, shelves, pages, year, added, read, review, bid, img=''):
    ur = ''
    if ' / ' in t:
        t, ur = t.split(' / ', 1)
    sh = [s.strip() for s in shelves if s.strip()]
    st = next((GR_ST[s] for s in sh if s in GR_ST), 'read')
    return {'id': str(bid), 't': t.strip(), 'ur': ur.strip(), 'a': a, 'r': float(rating or 0), 'st': st,
            'sh': [s for s in sh if s not in GR_ST], 'p': int(pages or 0), 'y': int(year or 0),
            'd': added, 'dr': read, 'rv': review, 'img': img}


def update_goodreads():
    p = os.path.join(IMP, 'goodreads_library_export.csv')
    books = None
    if os.path.exists(p):
        books = []
        for r in csv.DictReader(open(p, encoding='utf-8')):
            books.append(book_from(r['Title'], r['Author'], r['My Rating'], r['Bookshelves'].split(',') + [r['Exclusive Shelf']],
                                   r['Number of Pages'], r['Original Publication Year'] or r['Year Published'],
                                   r['Date Added'].replace('/', '-'), r['Date Read'].replace('/', '-'), r['My Review'], r['Book Id']))
    try:
        feed = []
        for page in range(1, 30):
            root = ET.fromstring(get(f'https://www.goodreads.com/review/list_rss/{GOODREADS_ID}?shelf=%23ALL%23&page={page}'))
            items = list(root.iter('item'))
            if not items:
                break
            for it in items:
                def tx(tag):
                    return (it.findtext(tag) or '').strip()
                def gdate(s):
                    try:
                        return datetime.strptime(s[:25].strip(), '%a, %d %b %Y %H:%M:%S').strftime('%Y-%m-%d')
                    except Exception:
                        return ''
                rv = html.unescape(re.sub(r'<[^>]+>', ' ', tx('user_review'))).strip()
                feed.append(book_from(tx('title'), tx('author_name'), tx('user_rating') or 0, tx('user_shelves').split(',') or ['read'],
                                      it.findtext('book/num_pages') or 0, tx('book_published') or 0, gdate(tx('user_date_added')),
                                      gdate(tx('user_read_at')), rv, tx('book_id'), tx('book_large_image_url') or tx('book_image_url')))
        if feed:
            books = feed
            log(f'goodreads: {len(feed)} books from RSS')
    except Exception as e:
        log('goodreads RSS unavailable (profile must be public):', e)
    if books is not None:
        site['books'] = books
    else:
        raise RuntimeError('no Goodreads RSS and no import file')


# ---------------- Grouvee (manual export only) ----------------
def update_grouvee():
    p = os.path.join(IMP, 'grouvee_export.json')
    if not os.path.exists(p):
        log('grouvee: no new export, keeping current games')
        return
    g = json.load(open(p, encoding='utf-8'))
    rv = {r['game']['url']: r for r in g.get('reviews', [])}
    pl = {}
    for x in g.get('play_log', []):
        pl.setdefault(x['game']['url'], []).append(x)
    G = []
    for c in g['collection']:
        sh = c['shelves']
        shelf = sorted(sh.items(), key=lambda x: x[1]['date_added'])[-1] if sh else ('', {'date_added': ''})
        r = rv.get(c['url'])
        G.append({'id': c['id'], 't': c['name'], 'shelf': shelf[0], 'shelves': list(sh.keys()), 'added': shelf[1]['date_added'][:10],
                  'pf': list(c['platforms'].keys()), 'r': c['rating'] or (r['rating'] if r else 0) or 0, 'g': list(c['genres'].keys()),
                  'fr': list(c['franchises'].keys()), 'dev': list(c['developers'].keys()), 'pub': list(c['publishers'].keys()),
                  'rel': c['release_date'], 'u': c['url'],
                  'rv': (r['text'] if r else c['review']) or '', 'rvt': (r['title'] if r else c['review_title']) or '', 'rvd': (r['date'][:10] if r else ''),
                  'log': [{k: v for k, v in x.items() if k != 'game'} for x in pl.get(c['url'], [])]})
    out = {'games': G, 'gvFav': [f['name'] for f in g['account'].get('favorite_games', [])],
           'gvProfile': {'about': g['account'].get('profile', {}).get('about', ''), 'joined': g['account']['date_joined'][:10]}}
    with open(os.path.join(DATA, 'games.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    os.rename(p, p + '.imported')
    log(f'grouvee: {len(G)} games imported into data/games.json (one-time)')


def update_cover_mirror():
    """Keep a copy of every MAL anime/manga cover on GitHub Pages, so the site doesn't depend on MAL's image server."""
    root = os.path.join(os.path.dirname(DATA), 'covers')
    t0, got, fails = time.time(), 0, 0
    for kind, key, ix in (('anime', 'a', 8), ('manga', 'm', 10)):
        d = os.path.join(root, key)
        os.makedirs(d, exist_ok=True)
        for row in site.get(kind, []):
            if time.time() - t0 > 900 or fails > 40:
                break
            img, fp = row[ix], os.path.join(d, f'{row[0]}.jpg')
            if not img or os.path.exists(fp):
                continue
            try:
                req = urllib.request.Request(f'https://cdn.myanimelist.net/images/{kind}/{img}.jpg', headers={'User-Agent': UA})
                with urllib.request.urlopen(req, timeout=30) as r:
                    b = r.read()
                if len(b) > 1500:
                    save_img(fp, b)
                    got += 1
            except Exception:
                fails += 1
            time.sleep(0.15)
    # Hall of Fame pictures (blog images, favourites): mirrored by their MAL path, so a changed blog picture gets a new copy
    want = set()
    blob = json.dumps(load_json(os.path.join(DATA, 'hof.json'), {})) + json.dumps(site.get('hofImages', {})) + json.dumps(site.get('hof', {}))
    blob += json.dumps(load_json(os.path.join(DATA, 'people_info.json'), {}))
    for m in re.finditer(r'myanimelist\.net/images/([^"~\s?]+?\.(?:jpe?g|png|webp|gif))', blob, re.I):
        want.add(m.group(1))
    src = {p: 'https://cdn.myanimelist.net/images/' + p for p in want}
    for m in re.finditer(r'image\.myanimelist\.net/ui/([\w-]+)', blob):
        k = 'ui/' + m.group(1) + '.jpg'
        want.add(k)
        src[k] = 'https://image.myanimelist.net/ui/' + m.group(1)
    ud = os.path.join(root, 'u')
    os.makedirs(ud, exist_ok=True)
    for path in sorted(want):
        fp = os.path.join(ud, path.replace('/', '_'))
        if os.path.exists(fp) or time.time() - t0 > 1200 or fails > 60:
            continue
        try:
            req = urllib.request.Request(src[path], headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                b = r.read()
            if len(b) > 1500:
                save_img(fp, b)
                got += 1
        except Exception:
            fails += 1
        time.sleep(0.15)
    keep = {p.replace('/', '_') for p in want} | {f for f in os.listdir(ud) if f.startswith('studio_')}
    for f in os.listdir(ud):
        if f not in keep:
            os.remove(os.path.join(ud, f))  # picture no longer used anywhere
    site['mir'] = {k: sorted(int(f[:-4]) for f in os.listdir(os.path.join(root, k)) if f.endswith('.jpg')) for k in ('a', 'm')}
    site['mir']['u'] = sorted(p for p in want if os.path.exists(os.path.join(ud, p.replace('/', '_'))))
    log(f'cover mirror: +{got} new, {len(site["mir"]["a"])} anime / {len(site["mir"]["m"])} manga / {len(site["mir"]["u"])} hall of fame stored, {fails} failed')


# ---------------- Hall of Fame: people and studios ----------------
SOCIAL = re.compile(r'^(twitter|x|instagram|youtube|tiktok|blog|profile|website|official site|official website|facebook|weibo|niconico|pixiv|line|agency|official blog|bluesky|threads)$', re.I)


def _small_pic(u):
    """MAL serves list thumbnails as /r/84x124/images/...; the full picture lives at /images/..."""
    return re.sub(r'/r/\d+x\d+/', '/', (u or '').split('?')[0])


def _franchise_key(t):
    t = norm(re.split(r'[:(]', t)[0])
    t = re.sub(r'\b(season|part|the movie|movie|gaiden|side story|special|zero|z|final|light novel|novel|anthology|\d+)\b.*$', '', t).strip()
    return t or norm(t)


def people_page(pid):
    """Details of a MAL person: birthday, what they do, their most loved characters (voice actors) or best known works (authors)."""
    h = re.sub(r'\s+', ' ', get(f'{MAL}/people/{pid}', tries=2))
    txt = lambda x: html.unescape(re.sub(r'<[^>]+>', '', x)).strip()
    o = {}
    m = re.search(r'<meta property="og:title" content="([^"]*)"', h)
    if m:
        o['name'] = html.unescape(m.group(1)).replace(' - MyAnimeList.net', '').strip()
    m = re.search(r'<meta property="og:image" content="([^"]*)"', h)
    if m and 'questionmark' not in m.group(1):
        o['img'] = m.group(1)
    fam = re.search(r'<span class="dark_text">Family name:</span>\s*([^<]*)', h)
    giv = re.search(r'<span class="dark_text">Given name:</span>\s*([^<]*)', h)
    jp = ' '.join(x.group(1).strip() for x in (fam, giv) if x and x.group(1).strip())
    if jp:
        o['jp'] = jp
    m = re.search(r'<span class="dark_text">Birthday:</span>\s*([^<]*)', h)
    if m and m.group(1).strip() and m.group(1).strip() != 'Unknown':
        o['bd'] = m.group(1).strip()
    m = re.search(r'<span class="dark_text">Alternate names:</span>\s*([^<]*)', h)
    if m and m.group(1).strip():
        o['alt'] = html.unescape(m.group(1).strip())[:80]
    m = re.search(r'Member Favorites:</span>\s*([\d,]+)', h)
    if m:
        o['fav'] = int(m.group(1).replace(',', ''))
    m = re.search(r'js-people-informantion-more">(.*?)</div>', h)
    if m:
        facts, about = [], []
        for ln in [txt(x) for x in re.split(r'<br\s*/?>', m.group(1))]:
            fm = re.match(r"^([A-Z][\w .'/()-]{0,24}):\s*(.{1,80})$", ln)
            if fm and not about:
                if not SOCIAL.match(fm.group(1).strip()):
                    facts.append([fm.group(1).strip(), fm.group(2).strip()])
            elif ln and not re.match(r'^(source|sources)\b', ln, re.I):
                about.append(ln)
        if facts:
            o['facts'] = facts[:6]
        ab = ' '.join(about)
        if ab:
            cut = ab[:360]
            o['about'] = (cut[:cut.rfind('. ') + 1] if len(ab) > 360 and '. ' in cut else cut).strip()
    # voice acting: every role, then the five most loved characters
    i, j = h.find('Voice Acting Roles'), h.find('Anime Staff Positions')
    chars = {}
    for row in re.findall(r'<tr class="js-people-character.*?</tr>', h[i:j] if 0 <= i < j else ''):
        a = re.search(r'href="https://myanimelist\.net/anime/(\d+)/[^"]*" class="js-people-title">([^<]+)</a>', row)
        c = re.search(r'href="https://myanimelist\.net/character/(\d+)/[^"]*">([^<]+)</a>', row)
        if not a or not c:
            continue
        fav = re.search(r'js-people-favorites" style="display: none;">(\d+)', row)
        date = re.search(r'entry-date" style="display: none">(\d+)', row)
        role = 'Main' if re.search(r'>\s*Main\s*(?:&nbsp;)?\s*</div>', row) else 'Supporting'
        pic = re.findall(r'data-src="(https://cdn\.myanimelist\.net/r/\d+x\d+/images/characters/[^"]+)"', row)
        name = html.unescape(c.group(2)).strip()
        if name.count(', ') == 1:
            name = ' '.join(reversed(name.split(', ')))
        cid = int(c.group(1))
        d = date.group(1) if date else '9'
        cur = chars.get(cid)
        if not cur or d < cur['d']:  # keep the character's first show
            chars[cid] = {'id': cid, 'n': name, 'img': _small_pic(pic[0]) if pic else '', 'aid': int(a.group(1)),
                          'at': html.unescape(a.group(2)).strip(), 'fav': int(fav.group(1)) if fav else 0, 'r': role, 'd': d}
    if chars:
        top = sorted(chars.values(), key=lambda x: -x['fav'])[:5]
        o['va'] = [[x['id'], x['n'], x['img'], x['aid'], x['at'], x['fav']] for x in top]
        o['nva'] = len(chars)
        o['nmain'] = sum(1 for x in chars.values() if x['r'] == 'Main')
    # anime staff work
    k = h.find('Published Manga')
    staff = []
    for row in re.findall(r'<tr class="js-people-staff.*?</tr>', h[j:k] if 0 <= j < k else ''):
        a = re.search(r'href="https://myanimelist\.net/anime/(\d+)/[^"]*" class="js-people-title">([^<]+)</a>', row)
        pos = re.search(r'</a>\s*<small>([^<]+)</small>', row) or re.search(r'<small>([^<]+)</small>', row)
        mem = re.search(r'js-people-favorites" style="display: none;">(\d+)', row)
        if a:
            staff.append([int(a.group(1)), html.unescape(a.group(2)).strip(), html.unescape(pos.group(1)).strip() if pos else '', int(mem.group(1)) if mem else 0])
    # written / drawn works
    works = []
    for row in re.findall(r'<tr class="js-people-manga.*?</tr>', h[k:] if k >= 0 else ''):
        a = re.search(r'href="https://myanimelist\.net/manga/(\d+)/[^"]*" class="js-people-title">([^<]+)</a>', row)
        role = re.search(r'</a>\s*<small>([^<]+)</small>', row)
        ty = re.search(r'manga-info-text">([^<]*)<', row)
        mem = re.search(r'js-people-favorites" style="display: none;">(\d+)', row)
        pic = re.findall(r'data-src="(https://cdn\.myanimelist\.net/r/\d+x\d+/images/manga/[^"]+)"', row)
        if a:
            works.append({'id': int(a.group(1)), 't': html.unescape(a.group(2)).strip(), 'r': html.unescape(role.group(1)).strip() if role else '',
                          'ty': (ty.group(1).strip() if ty else ''), 'm': int(mem.group(1)) if mem else 0, 'img': _small_pic(pic[0]) if pic else ''})
    # what they do
    labels = []
    if chars:
        labels.append('Voice actor')
    roles = ' '.join(w['r'] for w in works)
    if works:
        novels = any('novel' in w['ty'].lower() and 'Story' in w['r'] for w in works)
        if 'Story & Art' in roles:
            labels.append('Mangaka')
        elif 'Story' in roles:
            labels.append('Novelist' if novels else 'Author')
        if re.search(r'(?<!Story & )\bArt\b', roles):
            labels.append('Artist')
    POS = [('Theme Song Performance', 'Singer'), ('Director', 'Director'), ('Original Creator', 'Original creator'), ('Series Composition', 'Writer'),
           ('Script', 'Writer'), ('Character Design', 'Character designer'), ('Music', 'Composer'), ('Producer', 'Producer'), ('Key Animation', 'Animator'),
           ('Animation Director', 'Animator')]
    cnt = {}
    for _a, _t, pos, _m in staff:
        for key, lab in POS:
            if key.lower() in pos.lower():
                cnt[lab] = cnt.get(lab, 0) + 1
                break
    for lab, _n in sorted(cnt.items(), key=lambda x: -x[1]):
        if lab not in labels and len(labels) < 3 and not (lab == 'Original creator' and set(labels) & {'Mangaka', 'Novelist', 'Author'}):
            labels.append(lab)
    o['labels'] = labels or ['Staff']
    # best known works, one per franchise
    seen, best = [], []
    for w in sorted(works, key=lambda x: -x['m']):
        key = _franchise_key(w['t'])
        if any(key == s2 or (key.startswith(s2 + ' ') and len(s2.split()) >= 2) or (s2.startswith(key + ' ') and len(key.split()) >= 2) for s2 in seen):
            continue
        seen.append(key)
        best.append([w['id'], w['t'], w['img'], w['ty'], w['m'], w['r']])
        if len(best) == 5:
            break
    if best:
        o['works'] = best
        o['nworks'] = len(works)
    if staff:
        o['staff'] = sorted(staff, key=lambda x: -x[3])[:5]
        o['nstaff'] = len(staff)
    return o


def company_page(cid):
    h = re.sub(r'\s+', ' ', get(f'{MAL}/anime/producer/{cid}', tries=2))
    o = {}
    m = re.search(r'<meta property="og:image" content="([^"]*)"', h)
    if m:
        o['img'] = m.group(1)
    for key, lab in (('jp', 'Japanese'), ('est', 'Established')):
        m = re.search(r'<span class="dark_text">' + lab + r':</span>\s*([^<]*)', h)
        if m and m.group(1).strip():
            o[key] = html.unescape(m.group(1).strip())
    m = re.search(r'Member Favorites:</span>\s*([\d,]+)', h)
    if m:
        o['fav'] = int(m.group(1).replace(',', ''))
    m = re.search(r'Member Favorites:</span>\s*[\d,]+\s*</div>\s*<div class="spaceit_pad">\s*<span>(.*?)</span>', h)
    if m:
        ab = html.unescape(re.sub(r'<[^>]+>', ' ', m.group(1)))
        ab = re.sub(r'\s+', ' ', ab).strip()
        cut = ab[:360]
        o['about'] = (cut[:cut.rfind('. ') + 1] if len(ab) > 360 and '. ' in cut else cut).strip()
    o['n'] = len(set(re.findall(r'href="https://myanimelist\.net/anime/(\d+)/', h)))
    return o


def update_people_info():
    """Hall of Fame people (voice actors, authors) and studios, read from their MAL pages; refreshed monthly.
    Also works out the line shown under each character and person tile."""
    path = os.path.join(DATA, 'people_info.json')
    info = load_json(path, {'p': {}, 's': {}})
    hof = load_json(os.path.join(DATA, 'hof.json'), {})
    ids = set(re.findall(r'"p(\d+)~', json.dumps(hof))) | {str(p[0]) for p in hof.get('malFavs', {}).get('people') or []}
    old = (datetime.now(timezone.utc) - timedelta(days=30)).strftime('%Y-%m-%d')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    t0, n, fails = time.time(), 0, 0
    for pid in sorted(ids, key=lambda c: info['p'].get(c, {}).get('chk', '')):
        if info['p'].get(pid, {}).get('chk', '') > old or time.time() - t0 > 600 or fails > 4:
            continue
        try:
            d = people_page(pid)
            if d.get('name'):
                d['chk'] = today
                info['p'][pid] = d
                n += 1
        except Exception as e:
            fails += 1
            log('person page failed', pid, e)
        time.sleep(2.0)
    sd = os.path.join(os.path.dirname(DATA), 'covers', 'u')
    os.makedirs(sd, exist_ok=True)
    for c in hof.get('malFavs', {}).get('company') or []:
        if not isinstance(c, list) or not c[0]:
            continue
        cid = str(c[0])
        if info['s'].get(cid, {}).get('chk', '') > old or time.time() - t0 > 700:
            continue
        try:
            d = company_page(cid)
            d['name'] = c[1]
            pic = d.get('img') or c[2]
            if pic:
                b = get_bytes(pic)
                if len(b) > 500:
                    with open(os.path.join(sd, f'studio_{cid}.png'), 'wb') as f:
                        f.write(b)
                    d['loc'] = f'covers/u/studio_{cid}.png'
            d['chk'] = today
            info['s'][cid] = d
        except Exception as e:
            log('studio page failed', cid, e)
        time.sleep(2.0)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, separators=(',', ':'))
    # the line under each tile: a character's own show, a person's job
    ci = load_json(os.path.join(DATA, 'char_info.json'), {})
    eng = {a[0]: a[1] for a in site.get('anime', [])}
    engm = {m[0]: m[1] for m in site.get('manga', [])}
    sub = {}
    for cid, c in ci.items():
        A = c.get('anime') or []
        pool = [x for x in A if x[2] == 'Main'] or A
        pool = [x for x in pool if x[0] in eng] or pool  # a show you've seen beats a spin-off you haven't
        if pool:
            pick = min(pool, key=lambda x: x[0])  # the earliest entry is the original series
            sub['c' + cid] = eng.get(pick[0]) or pick[1]
        elif c.get('manga'):
            M = [x for x in c['manga'] if x[2] == 'Main'] or c['manga']
            pick = min(M, key=lambda x: (len(x[1]), x[0]))
            sub['c' + cid] = engm.get(pick[0]) or pick[1]
    for pid, p in info['p'].items():
        sub['p' + pid] = ' · '.join(p.get('labels') or [])
    site['hofSub'] = sub
    site['studios'] = {k: {x: v[x] for x in ('loc', 'img', 'est', 'fav', 'jp', 'about', 'n') if v.get(x)} for k, v in info['s'].items()}
    log(f'people: +{n}, have {len(info["p"])} of {len(ids)} people, {len(info["s"])} studios')


# ---------------- Goodreads book details ----------------
def gr_session_get(url):
    """Goodreads search sets a cookie and redirects; a cookie jar lets the redirect finish."""
    import http.cookiejar
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    op.addheaders = [('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'), ('Accept', 'text/html,*/*')]
    with op.open(url, timeout=40) as r:
        return r.read().decode('utf-8', 'replace')


def crisp(t, n=380):
    t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<br\s*/?>', ' ', re.sub(r'<(?!br)[^>]+>', '', t or '')))).strip()
    if len(t) <= n:
        return t
    cut = t[:n]
    i = max(cut.rfind('. '), cut.rfind('! '), cut.rfind('? '))
    return (cut[:i + 1] if i > 120 else cut.rsplit(' ', 1)[0] + '…').strip()


def gr_book_html(bid, h):
    """Goodreads sometimes serves the page without its data block; read what's visible instead."""
    o = {'gid': str(bid)}
    m = re.search(r'data-testid="description".*?<span class="Formatted">(.*?)</span>', h, re.S)
    if m:
        o['gd'] = crisp(m.group(1))
    g = [html.unescape(x) for x in re.findall(r'href="https://www\.goodreads\.com/genres/[^"]+"[^>]*>\s*<span class="Button__labelItem">([^<]+)</span>', h)]
    if g:
        o['gg'] = list(dict.fromkeys(g))[:6]
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S):
        try:
            j = json.loads(ld)
        except Exception:
            continue
        ar = j.get('aggregateRating') or {}
        if ar.get('ratingValue'):
            o['ga'] = round(float(ar['ratingValue']), 2)
            o['gn'] = int(ar.get('ratingCount') or 0)
        if j.get('numberOfPages'):
            o['gp'] = j['numberOfPages']
    if len(o) == 1:
        raise RuntimeError('no book data on the page')
    return o


def gr_book(bid):
    h = ''
    for i in range(3):
        try:
            h = gr_session_get(f'https://www.goodreads.com/book/show/{bid}') if i != 1 else get(f'https://www.goodreads.com/book/show/{bid}', tries=1)
        except Exception:
            h = ''
        if '__NEXT_DATA__' in h:
            break
        time.sleep(6 * (i + 1))
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', h, re.S)
    if not m:
        return gr_book_html(bid, h)
    ap = json.loads(m.group(1)).get('props', {}).get('pageProps', {}).get('apolloState', {})
    books = [v for k, v in ap.items() if k.startswith('Book:') and v.get('title')]
    book = next((b for b in books if str(b.get('legacyId')) == str(bid)), None) or next((b for b in books if b.get('description')), None)
    if not book:
        raise RuntimeError('book not found in page data')
    o = {'gid': str(bid)}
    if book.get('description'):
        o['gd'] = crisp(book['description'])
    g = [x.get('genre', {}).get('name') for x in book.get('bookGenres') or []]
    o['gg'] = [x for x in g if x][:6]
    w = ap.get(((book.get('work') or {}).get('__ref')) or '', {})
    st = w.get('stats') or {}
    if st.get('averageRating'):
        o['ga'] = round(float(st['averageRating']), 2)
        o['gn'] = int(st.get('ratingsCount') or 0)
    pages = (book.get('details') or {}).get('numPages')
    if pages:
        o['gp'] = pages
    if book.get('imageUrl'):
        o['gimg'] = re.sub(r'\._[A-Z]{2}\d+_\.', '.', book['imageUrl'])
    return o


def update_book_details():
    """Description, genres and average rating for every book, from its Goodreads page. Refreshed every 90 days."""
    bpath = os.path.join(DATA, 'book_meta.json')
    bm = load_json(bpath, {})
    old = (datetime.now(timezone.utc) - timedelta(days=90)).strftime('%Y-%m-%d')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    t0, n, fails = time.time(), 0, 0
    for b in load_json(os.path.join(DATA, 'books.json'), {}).get('books', []):
        bid = str(b.get('id'))
        m = bm.setdefault(bid, {})
        if m.get('gchk', '') > old or time.time() - t0 > 900 or fails > 12:
            continue
        try:
            gid = bid if bid.isdigit() else m.get('gid')
            if not gid:
                q = urllib.parse.quote_plus(f"{re.sub(r'[(].*?[)]', '', b['t']).strip()} {b.get('a', '')}")
                hs = gr_session_get(f'https://www.goodreads.com/search?q={q}&search_type=books')
                f = re.search(r'href="/book/show/(\d+)', hs)
                if not f and b.get('jt'):  # no English edition: try the original title
                    hs = gr_session_get(f"https://www.goodreads.com/search?q={urllib.parse.quote_plus(b['jt'])}&search_type=books")
                    f = re.search(r'href="/book/show/(\d+)', hs)
                if not f:
                    m['gchk'] = today
                    continue
                gid = f.group(1)
            m.update(gr_book(gid))
            m['gchk'] = today
            n += 1
        except Exception as e:
            fails += 1
            log('goodreads details failed', bid, b.get('t'), e)
        time.sleep(4)
    with open(bpath, 'w', encoding='utf-8') as f:
        json.dump(bm, f, ensure_ascii=False, indent=0)
    site['bookMeta'] = {k: {x: v[x] for x in ('syn', 'gd', 'gg', 'ga', 'gn', 'gid', 'gp') if v.get(x)} for k, v in bm.items() if v.get('syn') or v.get('gd') or v.get('gg')}
    # books added on the site without a picture take the Goodreads cover
    cpath = os.path.join(DATA, 'book_covers.json')
    covers = load_json(cpath, {})
    for b in load_json(os.path.join(DATA, 'books.json'), {}).get('books', []):
        bid = str(b.get('id'))
        if not b.get('img') and bm.get(bid, {}).get('gimg'):
            covers[bid] = bm[bid]['gimg']
    with open(cpath, 'w', encoding='utf-8') as f:
        json.dump(covers, f, indent=0)
    site['bookCovers'] = {k: v for k, v in covers.items() if v}
    log(f'goodreads details: +{n}, {fails} failed')


# ---------------- extra novels and manga that MAL doesn't have ----------------
def update_manga_extra():
    """data/manga_extra.json holds manga and novels missing from MyAnimeList. Fill in their covers from Open Library."""
    path = os.path.join(DATA, 'manga_extra.json')
    ex = load_json(path, {'items': []})
    d = os.path.join(os.path.dirname(DATA), 'covers', 'x')
    os.makedirs(d, exist_ok=True)
    n = 0
    for it in ex.get('items', []):
        fp = os.path.join(d, f"{it['id']}.jpg")
        if os.path.exists(fp):
            it['img'] = f"covers/x/{it['id']}.jpg"
            continue
        try:
            q = urllib.parse.urlencode({'title': it.get('en') or it['t'], 'author': it.get('au', ''), 'limit': 5, 'fields': 'cover_i,title,first_publish_year'})
            docs = json.loads(get('https://openlibrary.org/search.json?' + q, tries=2)).get('docs') or []
            cov = next((x['cover_i'] for x in docs if x.get('cover_i')), None)
            if cov:
                b = get_bytes(f'https://covers.openlibrary.org/b/id/{cov}-L.jpg')
                if len(b) > 2000:
                    save_img(fp, b)
                    it['img'] = f"covers/x/{it['id']}.jpg"
                    n += 1
        except Exception as e:
            log('extra cover failed', it.get('t'), e)
        time.sleep(0.5)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(ex, f, ensure_ascii=False, indent=1)
    log(f'extra manga/novels: {len(ex.get("items", []))}, +{n} covers')


# ---------------- films: find TMDB ids, tell films from series ----------------
def update_film_ids():
    """Every film's TMDB id, read from its own Letterboxd page (the page says which TMDB entry it is, and whether
    it's a film or a TV series). Searching TMDB by title picked wrong entries before: a making-of documentary
    for Moon Knight and Squid Game, a short instead of iHostage. Checked once per film."""
    t0, n, fixed, fails = time.time(), 0, 0, 0
    for fm in site.get('films', []):
        if fm.get('lbid') or time.time() - t0 > 900 or fails >= 6:
            continue
        u = fm.get('u') or ''
        if not u:
            continue
        try:
            h = get(u, tries=2)
            m = re.search(r'data-tmdb-id="(\d+)"', h)
            ty = re.search(r'data-tmdb-type="(\w+)"', h)
            if not m:
                fm['lbid'] = 'none'
                continue
            tid, kind = int(m.group(1)), (ty.group(1) if ty else 'movie')
            tmdb_img = 'image.tmdb.org' in (fm.get('img') or '')
            if kind == 'tv':
                if fm.get('tv') != tid:
                    fixed += 1
                fm['tv'] = tid
                fm.pop('tmdb', None)
                if tmdb_img:
                    fm.pop('img', None)  # that poster belonged to the wrong entry; the series poster is used instead
            else:
                if fm.get('tmdb') != tid:
                    fixed += 1
                    if tmdb_img or not fm.get('img'):
                        fm['needImg'] = 1
                fm['tmdb'] = tid
                fm.pop('tv', None)
                fm.pop('tvimg', None)
            fm['lbid'] = 1
            for k in ('idTried', 'idOk', 'tmdbTried'):
                fm.pop(k, None)
            n += 1
            fails = 0
        except Exception as e:
            fails += 1
            log('letterboxd film page failed', fm.get('t'), e)
        time.sleep(1.0)
    # Letterboxd itself files a few series under a making-of special (Moon Knight, Squid Game). When the TMDB title
    # doesn't match and there's a TV series with exactly the Letterboxd title and year, it's that series.
    key = settings.get('tmdbKey')
    det = load_json(os.path.join(DATA, 'film_details.json'), {'f': {}})
    for fm in site.get('films', []):
        d = det['f'].get(str(fm.get('tmdb')), {}) if fm.get('tmdb') else {}
        if not key or fm.get('tv') or fm.get('tvChk') or not d.get('tt') or norm(d['tt']) == norm(fm['t']):
            continue
        fm['tvChk'] = 1
        try:
            r = json.loads(get(f"https://api.themoviedb.org/3/search/tv?api_key={key}&query={urllib.parse.quote(fm['t'])}", tries=1)).get('results') or []
            hit = next((x for x in r if norm(x.get('name')) == norm(fm['t']) and (not fm.get('y') or abs(int((x.get('first_air_date') or '0')[:4] or 0) - int(fm['y'])) <= 1)), None)
            if hit:
                fm['tv'] = hit['id']
                fm.pop('tmdb', None)
                if 'image.tmdb.org' in (fm.get('img') or ''):
                    fm.pop('img', None)
                fixed += 1
        except Exception as e:
            log('tv check failed', fm.get('t'), e)
        time.sleep(0.3)
    log(f'film ids: checked {n} on Letterboxd, corrected {fixed}')


def update_series():
    """TV series you keep on the site (data/series.json): poster, seasons, episodes and length from TMDB."""
    key = settings.get('tmdbKey')
    path = os.path.join(DATA, 'series.json')
    sr = load_json(path, {'series': []})
    if not key:
        return
    old = (datetime.now(timezone.utc) - timedelta(days=30)).strftime('%Y-%m-%d')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    det = load_json(os.path.join(DATA, 'series_details.json'), {})
    ids = {str(s['id']) for s in sr.get('series', []) if s.get('id')} | {str(f['tv']) for f in site.get('films', []) if f.get('tv')}
    n = 0
    for tid in ids:
        if det.get(tid, {}).get('c', '') > old:
            continue
        try:
            d = json.loads(get(f'https://api.themoviedb.org/3/tv/{tid}?api_key={key}&append_to_response=aggregate_credits', tries=1))
            o = {'c': today, 't': d.get('name') or '', 'y': (d.get('first_air_date') or '')[:4], 'img': ('https://image.tmdb.org/t/p/w342' + d['poster_path']) if d.get('poster_path') else '',
                 'ns': d.get('number_of_seasons') or 0, 'ne': d.get('number_of_episodes') or 0, 'rt': (d.get('episode_run_time') or [0])[0] if d.get('episode_run_time') else 0,
                 'st': d.get('status') or '', 'g': [x['name'] for x in d.get('genres') or []][:4], 'by': [x['name'] for x in d.get('created_by') or []][:2],
                 'net': [x['name'] for x in d.get('networks') or []][:2], 'cast': [x['name'] for x in ((d.get('aggregate_credits') or {}).get('cast') or [])][:5],
                 'ov': (d.get('overview') or '')[:500], 'ly': (d.get('last_air_date') or '')[:4]}
            if not o['rt'] and (d.get('last_episode_to_air') or {}).get('runtime'):
                o['rt'] = d['last_episode_to_air']['runtime']
            det[tid] = o
            n += 1
        except Exception as e:
            log('tmdb series failed', tid, e)
        time.sleep(0.2)
    for fm in site.get('films', []):
        if fm.get('tv') and det.get(str(fm['tv']), {}).get('img'):
            fm['tvimg'] = det[str(fm['tv'])]['img']
    with open(os.path.join(DATA, 'series_details.json'), 'w', encoding='utf-8') as f:
        json.dump(det, f, ensure_ascii=False, separators=(',', ':'))
    log(f'series details: +{n}, {len(det)} known')


for name, fn in [('anime', update_anime), ('manga', update_manga), ('letterboxd', update_letterboxd), ('letterboxd films', update_letterboxd_watched),
                 ('posters', update_posters), ('hall of fame', update_hof), ('book covers', update_book_covers), ('game covers', update_game_covers), ('medium', update_medium), ('book copies', mirror_book_covers), ('grouvee', update_grouvee), ('film ids', update_film_ids), ('film details', update_film_details), ('series', update_series), ('mal details', update_mal_details), ('summaries', update_summaries), ('book details', update_book_details), ('game meta', update_game_meta), ('dlc pictures', update_dlc_pictures), ('characters', update_char_info), ('people', update_people_info), ('extra manga', update_manga_extra), ('cover mirror', update_cover_mirror)]:
    try:
        fn()
        status[name] = 'ok'
    except Exception as e:
        status[name] = f'kept previous data ({type(e).__name__}: {e})'
    log(name, '->', status[name])

for k in ('books', 'games', 'gvFav', 'gvProfile'):
    site.pop(k, None)
repo_size()
site['generated'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
site['updateStatus'] = status
with open(os.path.join(DATA, 'site.json'), 'w', encoding='utf-8') as f:
    json.dump(site, f, ensure_ascii=False, separators=(',', ':'))
log('done')
