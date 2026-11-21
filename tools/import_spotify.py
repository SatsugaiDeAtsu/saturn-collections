"""Spotify Extended Streaming History -> data/music_history.json (totals only: no IP, country or device)."""
import json, glob, sys, os, collections
from datetime import datetime, timedelta
src, out = sys.argv[1], sys.argv[2]
EXC = set(json.load(open(sys.argv[3], encoding='utf-8')).get('music_exclude', [])) if len(sys.argv) > 3 else set()
rows = []
for f in sorted(glob.glob(os.path.join(src, 'Streaming_History_Audio_*.json'))):
    rows += json.load(open(f, encoding='utf-8'))
rows = [r for r in rows if r.get('spotify_track_uri') and r.get('ms_played', 0) > 0 and (r.get('master_metadata_album_artist_name') or '') not in EXC]
rows.sort(key=lambda r: r['ts'])
PK = timedelta(hours=5)  # Pakistan time for hour-of-day and day boundaries
T, A = {}, {}
years, months, hours, wd, days = {}, collections.Counter(), [0]*24, [0]*7, set()
yT, yA = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
yP = collections.Counter()
for r in rows:
    tid = r['spotify_track_uri'].split(':')[-1]
    ms = r['ms_played']; play = ms >= 30000
    lt = datetime.strptime(r['ts'], '%Y-%m-%dT%H:%M:%SZ') + PK
    d = lt.strftime('%Y-%m-%d'); y = d[:4]
    t = T.setdefault(tid, [0, 0, d, d, r.get('master_metadata_track_name') or '', r.get('master_metadata_album_artist_name') or '', r.get('master_metadata_album_album_name') or ''])
    t[0] += ms; t[1] += play; t[3] = d
    an = t[5]
    a = A.setdefault(an, [0, 0, d]); a[0] += ms; a[1] += play
    months[d[:7]] += ms; hours[lt.hour] += ms; wd[lt.weekday()] += ms; days.add(d)
    yT[y][tid] += ms; yA[y][an] += ms; yP[y] += play
for y in sorted(yT):
    years[y] = {'ms': sum(yT[y].values()), 'plays': yP[y], 'songs': len(yT[y]), 'artists': len(yA[y]),
                'ta': [[n, ms] for n, ms in yA[y].most_common(15)], 'tt': [[i, ms] for i, ms in yT[y].most_common(15)]}
res = {'from': rows[0]['ts'][:10], 'end': rows[-1]['ts'], 'tot': {'ms': sum(t[0] for t in T.values()), 'plays': sum(t[1] for t in T.values()),
       'songs': len(T), 'artists': len(A), 'days': len(days)},
       'years': years, 'months': dict(sorted(months.items())), 'hours': hours, 'wd': wd,
       'tracks': {i: t for i, t in T.items()}, 'artists': {n: a for n, a in A.items()}}
json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(res['tot'], len(json.dumps(res, ensure_ascii=False)) // 1024, 'KB')
