import re, urllib.request, json, html, sys
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
def get(u):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':UA,'Accept':'text/html,*/*'}),timeout=40)
        return r.status, r.read().decode('utf-8','replace')
    except Exception as e:
        return str(e), ''
def show(label,h,key,n=2500,before=200):
    i=h.find(key)
    print(f'===== {label} [{key}] at {i}')
    if i>=0: print(re.sub(r'\s+',' ',h[max(0,i-before):i+n]))
for pid in (869, 44281):
    st,h=get(f'https://myanimelist.net/people/{pid}'); print('PEOPLE',pid,st,len(h))
    for k in ('Given name','Birthday','Member Favorites','Voice Acting Roles','Anime Staff Positions','Published Manga'):
        show(pid,h,k,1800 if k!='Voice Acting Roles' else 4000)
st,h=get('https://myanimelist.net/profile/SatsugaiDeAtsu'); print('PROFILE',st,len(h))
show('profile',h,'company_favorites',2500,50)
st,h=get('https://www.goodreads.com/book/show/6690'); print('GOODREADS',st,len(h))
m=re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',h,re.S)
print('next data', bool(m))
if m:
    d=json.loads(m.group(1)); ap=d.get('props',{}).get('pageProps',{}).get('apolloState',{})
    for k,v in ap.items():
        if k.startswith('Book:'):
            print('BOOK', k, {x:(str(v.get(x))[:300]) for x in ('title','description','bookGenres','details','work')})
        if k.startswith('Work:'):
            print('WORK', k, str(v.get('stats'))[:300])
show('gr',h,'averageRating',300)
st,h=get('https://www.grouvee.com/search/?q=Elden+Ring'); print('GROUVEE',st,len(h)); show('grouvee',h,'/games/',600)
st,h=get('https://www.igdb.com/search?type=1&q=Elden+Ring'); print('IGDB',st,len(h))
