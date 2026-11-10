import re, urllib.request, json, html
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA,'Accept':'text/html,*/*'}),timeout=40)
        return r.status, r.read().decode('utf-8','replace')
    except Exception as e:
        return str(e), ''
st,h=get('https://myanimelist.net/people/44281');h=re.sub(r'\s+',' ',h)
i=h.find('Published Manga');part=h[i:i+40000]
for row in re.findall(r'<tr class="js-people-manga.*?</tr>',part):
    t=re.findall(r'href="https://myanimelist\.net/manga/(\d+)/[^"]*"[^>]*>([^<]+)</a>',row)
    print('ROW', t[:1], re.findall(r'<small>([^<]*)</small>',row)[:3], re.findall(r'anime-info-text">([^<]*)<',row), re.findall(r'js-people-favorites" style="display: none;">(\d+)',row))
print(re.sub(r'\s+',' ',part[:200]))
row=re.search(r'<tr class="js-people-manga.*?</tr>',part)
print('RAWROW', row.group(0)[:2500] if row else None)
for cid in (858,):
    st,h=get(f'https://myanimelist.net/anime/producer/{cid}');print('COMPANY',st,len(h))
    for k in ('og:image','Established','Member Favorites','Japanese'):
        j=h.find(k);print(k, re.sub(r'\s+',' ',h[max(0,j-100):j+300]) if j>=0 else None)
st,h=get('https://www.goodreads.com/search?q=Metamorphosis+Kafka');print('GRSEARCH',st,len(h));print(re.findall(r'href="(/book/show/[^"?]+)',h)[:5])
