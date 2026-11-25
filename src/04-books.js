/* ---------- books ---------- */
const BST={read:['Read','var(--s2)'],reading:['Reading','var(--s1)'],toread:['Want to read','var(--s6)'],dnf:['Did not finish','var(--s4)'],hold:['On hold','var(--s3)']};
const BCOV=D.bookCovers||{};
const books=D.books.map((b,i)=>Object.assign({},b,{img:b.img||BCOV[b.id]||'',i,title:b.t,n:norm(b.t+' '+b.a+' '+b.sh.join(' '))}));
const bstars=r=>{if(!r)return'';const full=Math.floor(r),part=r-full;return '★'.repeat(full)+(part>=.5?'½':'')};
function rBooks(){
  const shelves=[...new Set(books.flatMap(b=>b.sh))].sort();
  const rd=books.filter(b=>b.st==='read');
  listPage({key:'books',title:'Books',sub:`${books.length} books`,
    bst:()=>[[rd.length,'read'],[fmt(rd.reduce((s,b)=>s+b.p,0)),'pages'],[books.filter(b=>b.ur).length,'Urdu']],
    items:()=>books,
    tabs:[['read','Read',b=>b.st==='read'],['reading','Reading',b=>b.st==='reading'],['toread','Want to read',b=>b.st==='toread'],['dnf','Did not finish',b=>b.st==='dnf'],['hold','On hold',b=>b.st==='hold']],
    sorts:[['rating','Your rating'],['title','Title'],['author','Author'],['year','Year (newest)'],['pages','Pages']],
    extra:S=>`<select id="lshelf" aria-label="Shelf"><option value="">All shelves</option>${shelves.map(t=>`<option ${S.shelf===t?'selected':''}>${esc(t)}</option>`).join('')}</select>`,
    bindExtra:(S,body)=>{$('#lshelf').onchange=e=>{S.shelf=e.target.value;body()}},
    xfilter:(b,S)=>!S.shelf||b.sh.includes(S.shelf),
    sorter:k=>({rating:(a,b)=>b.r-a.r,title:cmpT,author:(a,b)=>a.a.localeCompare(b.a),year:(a,b)=>b.y-a.y,pages:(a,b)=>b.p-a.p})[k],
    card:(b,i)=>`<div class="card book" data-i="${i}">${cover(b.t,b.img||'',(b.r?`<span class="badge">${b.r}★</span>`:'')+`<span class="sline" style="--sc:${BST[b.st][1]}"></span>`)}<div class="meta"><div class="tt">${esc(b.t)}</div><div class="ss"><span>${esc(b.a)}</span></div></div></div>`,
    thead:'<th style="width:5px;padding:0"></th><th class="hm">#</th><th></th><th>Book</th><th>Rating</th><th>Status</th><th class="hm" style="text-align:center">Pages</th>',
    row:(b,i)=>`<tr data-i="${i}"><td class="st" style="--sc:${BST[b.st][1]}"></td><td class="num hm">${i+1}</td><td style="width:54px">${cover(b.t,b.img||'','','mini')}</td><td><div class="ti">${esc(b.t)}</div><div class="alt">${esc(b.a)}${b.ur?` · <span class="urdu">${esc(b.ur)}</span>`:''}</div></td><td><span class="stars" style="color:var(--book)">${bstars(b.r)}</span></td><td class="small">${BST[b.st][0]}</td><td class="c mono small hm">${b.p||''}</td></tr>`,
    open:openBook});
}
function openBook(b){
  modal('books','Book',`${cover(b.t,b.img||'')}<div><h2>${esc(b.t)}</h2>${b.ur?`<div class="urdu" style="font-size:18px">${esc(b.ur)}</div>`:''}<div class="muted">${esc(b.a)}</div>
  ${(()=>{const bm=(D.bookMeta||{})[b.id]||{};b.__bm=bm;return ''})()}
  <div class="bigscore"><div><b class="stars" style="color:var(--book)">${b.r?bstars(b.r):'–'}</b><small>${b.r?b.r+' / 5':'Not rated'}</small></div><div><b style="color:${BST[b.st][1]}">■</b><small>${BST[b.st][0]}</small></div>${b.__bm.ga?`<div><b>${b.__bm.ga.toFixed(2)}</b><small>Goodreads avg</small></div>`:''}</div>
  <div class="kv">${b.p||b.__bm.gp?`<div>Pages</div><div>${b.p||b.__bm.gp}</div>`:''}${b.y?`<div>First published</div><div>${b.y}</div>`:''}${b.__bm.gg&&b.__bm.gg.length?`<div>Genres</div><div>${b.__bm.gg.filter(g=>!(b.a==='Yoru Sumino'&&/^(Light Novel|Manga)$/.test(g))).map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div>`:''}${b.__bm.ga?`<div>Goodreads</div><div>${b.__bm.ga.toFixed(2)} average from ${fmt(b.__bm.gn||0)} ratings</div>`:''}${b.sh.length?`<div>Shelves</div><div>${b.sh.map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div>`:''}</div>
  ${b.__bm.gd||b.__bm.syn?`<div class="syn">${esc(b.__bm.gd||b.__bm.syn)}</div>`:''}
  ${bookSeries(b)}
  ${b.rv?`<div class="review" style="--c:var(--book)">${esc(b.rv)}</div>`:''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${ED.on?`<button class="btn pri" id="m_edit">Edit</button>`:''}${(()=>{const gid=/^\d+$/.test(String(b.id))?b.id:b.__bm.gid;return `<a class="btn${ED.on?'':' pri'}" href="${gid?'https://www.goodreads.com/book/show/'+esc(gid):'https://www.goodreads.com/search?q='+encodeURIComponent(b.t+' '+b.a)}" target="_blank" rel="noopener">Open on Goodreads ↗</a>`})()}</div></div>`);
  const me=$('#m_edit');if(me)me.onclick=()=>editBook(b);
  genreRow('books',b.id,((D.bookMeta||{})[b.id]||{}).gg||[]);
}

