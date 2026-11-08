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
           f'?fields=list_status%7B{f1},{f2}%7D&limit=1000&nsfw=true')
    while url:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'X-MAL-CLIENT-ID': cid})
        with urllib.request.urlopen(req, timeout=40) as r:
            page = json.loads(r.read().decode('utf-8'))
        for it in page.get('data', []):
            ls = it.get('list_status') or {}
            out[it['node']['id']] = (int(ls.get(f1) or 0), 1 if ls.get(f2) else 0)
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
    old_rr = {m[0]: (m[14], m[15]) for m in site.get('manga', []) if len(m) > 15}
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
                  rr.get(m['manga_id'], (0, 0))[0], 1 if m.get('is_rereading') else rr.get(m['manga_id'], (0, 0))[1]])
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
            if res and res[0].get('poster_path'):
                f['img'] = 'https://image.tmdb.org/t/p/w342' + res[0]['poster_path']
                f['tmdb'] = res[0]['id']
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
                favs['company'].append(title); continue
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
    for g in games:
        gid = str(g.get('id'))
        prev = covers.get(gid)
        if g.get('img') or n >= 150:
            continue
        if prev and not prev.startswith('miss:'):
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
                img = steam_cover(g['t'])
            if not img:
                img = wiki_cover(g['t'])
        except Exception as e:
            log('game cover lookup failed for', g['t'], e)
        if img:
            open(os.path.join(gd, f'{gid}.jpg'), 'wb').write(img)
            covers[gid] = f'covers/g/{gid}.jpg'
        else:
            covers[gid] = 'miss:' + today
        time.sleep(0.5)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(covers, f, indent=0)
    site['gameCovers'] = {k: v for k, v in covers.items() if v and not v.startswith('miss:')}
    missing = [g['t'] for g in games if not g.get('img') and str(g.get('id')) not in site['gameCovers']]
    site['gameCoverMissing'] = missing
    log(f'game covers: looked up {n}, have {len(site["gameCovers"])}, missing {len(missing)}: {missing[:30]}')


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
                    open(fp, 'wb').write(b)
                    got += 1
            except Exception:
                fails += 1
            time.sleep(0.15)
    # Hall of Fame pictures (blog images, favourites): mirrored by their MAL path, so a changed blog picture gets a new copy
    want = set()
    blob = json.dumps(load_json(os.path.join(DATA, 'hof.json'), {})) + json.dumps(site.get('hofImages', {})) + json.dumps(site.get('hof', {}))
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
                open(fp, 'wb').write(b)
                got += 1
        except Exception:
            fails += 1
        time.sleep(0.15)
    keep = {p.replace('/', '_') for p in want}
    for f in os.listdir(ud):
        if f not in keep:
            os.remove(os.path.join(ud, f))  # picture no longer used anywhere
    site['mir'] = {k: sorted(int(f[:-4]) for f in os.listdir(os.path.join(root, k)) if f.endswith('.jpg')) for k in ('a', 'm')}
    site['mir']['u'] = sorted(p for p in want if os.path.exists(os.path.join(ud, p.replace('/', '_'))))
    log(f'cover mirror: +{got} new, {len(site["mir"]["a"])} anime / {len(site["mir"]["m"])} manga / {len(site["mir"]["u"])} hall of fame stored, {fails} failed')


for name, fn in [('anime', update_anime), ('manga', update_manga), ('letterboxd', update_letterboxd),
                 ('posters', update_posters), ('hall of fame', update_hof), ('book covers', update_book_covers), ('game covers', update_game_covers), ('medium', update_medium), ('grouvee', update_grouvee), ('cover mirror', update_cover_mirror)]:
    try:
        fn()
        status[name] = 'ok'
    except Exception as e:
        status[name] = f'kept previous data ({type(e).__name__}: {e})'
    log(name, '->', status[name])

for k in ('books', 'games', 'gvFav', 'gvProfile'):
    site.pop(k, None)
site['generated'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')
site['updateStatus'] = status
with open(os.path.join(DATA, 'site.json'), 'w', encoding='utf-8') as f:
    json.dump(site, f, ensure_ascii=False, separators=(',', ':'))
log('done')
