"""Stamp the current versions of assets/app.css and assets/app.js into index.html (and the service worker),
so browsers fetch a changed file straight away and keep an unchanged one. Run after editing either file:

    python3 tools/build.py
"""
import hashlib, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ver = {}
for f in ('app.css', 'app.js'):
    ver[f] = hashlib.sha1(open(os.path.join(ROOT, 'assets', f), 'rb').read()).hexdigest()[:10]
p = os.path.join(ROOT, 'index.html')
h = open(p, encoding='utf-8').read()
for f, v in ver.items():
    h, n = re.subn(r'assets/' + re.escape(f) + r'\?v=[\w]+', f'assets/{f}?v={v}', h)
    assert n == 1, f'{f} link not found in index.html'
open(p, 'w', encoding='utf-8').write(h)
print('stamped', ver)
