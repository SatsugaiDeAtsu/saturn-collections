"""Build the site's code and stamp versions:

1. joins src/*.js (in name order, one file per section of the site) into assets/app.js,
   which is the one file the site downloads. Edit the src/ files, not assets/app.js.
2. stamps the current versions of assets/app.css and assets/app.js into index.html,
   so browsers fetch a changed file straight away and keep an unchanged one.

    python3 tools/build.py
"""
import glob, hashlib, os, re
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
parts = sorted(glob.glob(os.path.join(ROOT, 'src', '*.js')))
assert parts, 'no src/*.js files'
js = ''.join(open(f, encoding='utf-8').read() for f in parts)
with open(os.path.join(ROOT, 'assets', 'app.js'), 'w', encoding='utf-8') as f:
    f.write(js)
ver = {}
for f in ('app.css', 'app.js'):
    ver[f] = hashlib.sha1(open(os.path.join(ROOT, 'assets', f), 'rb').read()).hexdigest()[:10]
p = os.path.join(ROOT, 'index.html')
h = open(p, encoding='utf-8').read()
for f, v in ver.items():
    h, n = re.subn(r'assets/' + re.escape(f) + r'\?v=[\w]+', f'assets/{f}?v={v}', h)
    assert n == 1, f'{f} link not found in index.html'
open(p, 'w', encoding='utf-8').write(h)
print(f'joined {len(parts)} files into assets/app.js; stamped', ver)
