import json, os, sys, time
src = open(os.path.join(os.path.dirname(__file__), 'update.py')).read()
src = src[:src.index("\nfor name, fn in [('anime', update_anime)")]
g = {'__file__': os.path.join(os.path.dirname(__file__), 'update.py'), '__name__': 'probe'}
exec(compile(src, 'update.py', 'exec'), g)
for pid in ('869', '44281', '1882'):
    try:
        d = g['people_page'](pid); print('PERSON', pid, json.dumps(d, ensure_ascii=False)[:1500])
    except Exception as e:
        print('PERSON FAIL', pid, repr(e))
    time.sleep(2)
try:
    print('STUDIO', json.dumps(g['company_page']('858'), ensure_ascii=False)[:800])
except Exception as e:
    print('STUDIO FAIL', repr(e))
for bid in ('6690', '18376394'):
    try:
        print('BOOK', bid, json.dumps(g['gr_book'](bid), ensure_ascii=False)[:800])
    except Exception as e:
        print('BOOK FAIL', bid, repr(e))
try:
    h = g['gr_session_get']('https://www.goodreads.com/search?q=Metamorphosis+Kafka&search_type=books')
    import re; print('GRSEARCH', re.findall(r'href="/book/show/(\d+)', h)[:3])
except Exception as e:
    print('GRSEARCH FAIL', repr(e))
try:
    print('GRAUTO', g['get']('https://www.goodreads.com/book/auto_complete?format=json&q=haalim')[:1200])
except Exception as e:
    print('GRAUTO FAIL', repr(e))
try:
    d = g['mal_detail']('anime', 1535, g['settings'].get('malClientId')); print('MALV3', d.get('g'), d.get('src'))
except Exception as e:
    print('MALV3 FAIL', repr(e))
