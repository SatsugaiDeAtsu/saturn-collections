/* ---------- manga ---------- */
const MST={1:['Reading','var(--s1)'],2:['Completed','var(--s2)'],3:['On-Hold','var(--s3)'],4:['Dropped','var(--s4)'],6:['Plan to Read','var(--s6)']};
const MTAGS=D.mangaTags||{};
const XMANGA=x=>({tags:x.note||'',id:x.id,t:x.t,alt:x.alt||'',st:x.st||6,sc:x.sc||0,ch:x.ch||0,chs:x.chs||0,vol:x.vol||0,vols:x.vols||0,type:x.ty||'Novel',img:x.img||'',y:x.y||0,g:x.g||[],mal:0,rw:x.rw||0,rwing:0,up:x.up||0,n:norm(x.t+' '+(x.alt||'')+' '+(x.en||'')),local:1,au:x.au||'',jt:x.jt||'',d:x.d||''});
const manga=D.manga.map(m=>({tags:MTAGS[m[0]]||'',id:m[0],t:m[1],alt:m[2],st:m[3],sc:m[4],ch:m[5],chs:m[6],vol:m[7],vols:m[8],type:m[9],img:MIRM.has(m[0])?`covers/m/${m[0]}.jpg`:/^http/.test(m[10]||'')?m[10]:m[10]?`https://cdn.myanimelist.net/images/manga/${m[10]}.jpg`:'',y:m[11],g:m[12].map(i=>D.mangaGenres[i]),mal:m[13],rw:m[14]||0,rwt:m[17]||0,rwing:m[15]||0,up:m[16]||0,n:norm(m[1]+' '+m[2])}));
(D.mangaExtra||[]).forEach(x=>manga.push(XMANGA(x)));
malApplyQ();
function rManga(){
  const sc=manga.filter(m=>m.sc>0);
  const types=[...new Set(manga.map(m=>m.type))].sort();
  listPage({key:'manga',title:'Manga list',sub:`From MyAnimeList · updated ${fdate(D.generated)}`,
    bst:()=>[[fmt(manga.length),'entries'],[fmt(manga.reduce((s,m)=>s+m.ch,0)),'chapters read'],[fmt(manga.reduce((s,m)=>s+m.rw,0)),'rereads'],[avg(sc.map(m=>m.sc)).toFixed(2),'mean score']],
    items:()=>manga,
    tabs:[['1','Reading',m=>m.st===1],['2','Completed',m=>m.st===2],['3','On-Hold',m=>m.st===3],['4','Dropped',m=>m.st===4],['6','Plan to Read',m=>m.st===6],['rw','Reread',m=>m.rw>0||m.rwing]],
    sorts:[['score','Your score'],['mal','MAL score'],['title','Title'],['year','Year (newest)'],['ch','Chapters read']],
    extra:S=>`<select id="ltype" aria-label="Type"><option value="">All types</option>${types.map(t=>`<option ${S.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select>`,
    bindExtra:(S,body)=>{$('#ltype').onchange=e=>{S.type=e.target.value;body()}},
    xfilter:(m,S)=>!S.type||m.type===S.type,
    sorter:k=>({score:(a,b)=>b.sc-a.sc||b.mal-a.mal,mal:(a,b)=>b.mal-a.mal,title:cmpT,year:(a,b)=>b.y-a.y,ch:(a,b)=>b.ch-a.ch})[k],
    card:(m,i)=>`<div class="card" data-i="${i}">${cover(m.t,m.img,(m.sc?`<span class="badge">${m.sc}</span>`:'')+`<span class="sline" style="--sc:${MST[m.st][1]}"></span>`)}<div class="meta"><div class="tt">${esc(m.t)}</div><div class="ss"><span>${esc(m.type)}${m.y?' · '+m.y:''}</span><span>${m.ch?m.ch+' ch':''}</span></div></div></div>`,
    thead:'<th style="width:5px;padding:0"></th><th class="hm">#</th><th></th><th>Title</th><th style="text-align:center">Score</th><th class="hm" style="text-align:center">Type</th><th style="text-align:center">Chapters</th><th class="hm" style="text-align:center">MAL</th>',
    row:(m,i)=>`<tr data-i="${i}"><td class="st" style="--sc:${MST[m.st][1]}"></td><td class="num hm">${i+1}</td><td style="width:54px">${cover(m.t,m.img,'','mini')}</td><td><div class="ti">${esc(m.t)}</div>${m.alt?`<div class="alt">${esc(m.alt)}</div>`:''}</td><td class="sc">${m.sc||'<span class="muted">–</span>'}</td><td class="c hm">${esc(m.type)}</td><td class="c mono small">${m.ch}<span class="muted">/${m.chs||'?'}</span></td><td class="c mono small hm">${m.mal?m.mal.toFixed(2):'–'}</td></tr>`,
    open:openManga});
}
/* ---------- connections: sequels, prequels, films, OVAs, series ---------- */
let _MD=null,_FD=null;
// a title's page only needs its own franchise: load that small file (data/mal/g/*.json), not the whole 3 MB file
let _MI=null;const _MP={a:{},m:{}},_MG={};
async function mdFor(k,id){if(_MD)return _MD;
  if(!_MI)_MI=loadJ('data/mal/idx.json').catch(()=>null);const I=await _MI;
  const g=I&&I[k]&&I[k][id];
  if(!g){_MD=await loadJ('data/mal_details.json')||{a:{},m:{}};return _MD}
  if(!_MG[g])_MG[g]=loadJ(`data/mal/g/${g}.json`).catch(()=>null).then(o=>{if(o){Object.assign(_MP.a,o.a||{});Object.assign(_MP.m,o.m||{})}return o});
  if(!(await _MG[g])){_MD=await loadJ('data/mal_details.json')||{a:{},m:{}};return _MD}
  return _MP}
const loadJ=(p)=>fetch(p,{cache:'no-cache'}).then(r=>r.ok?r.json():null).catch(()=>null);
const RELN={sequel:'Sequel',prequel:'Prequel',side_story:'Side story',parent_story:'Main story',alternative_version:'Alternative version',alternative_setting:'Alternative setting',spin_off:'Spin-off',summary:'Recap',full_story:'Full story',other:'Other',character:'Same characters',adaptation:'Adaptation'};
const RELO=['prequel','sequel','parent_story','side_story','full_story','summary','alternative_version','alternative_setting','spin_off','adaptation','other','character'];
const TYN={tv:'TV',movie:'Film',ova:'OVA',ona:'ONA',special:'Special',music:'Music',tv_special:'TV special',cm:'CM',pv:'PV',manga:'Manga',light_novel:'Light novel',novel:'Novel',one_shot:'One-shot',manhwa:'Manhwa',manhua:'Manhua',doujinshi:'Doujin'};
const hm=min=>{min=Math.round(min);if(!min)return'';const h=Math.floor(min/60),m=min%60;return h?`${h} h${m?' '+m+' min':''}`:`${m} min`};
function relTile(k,id,rel,d){
  const own=(k==='a'?anime:manga).find(x=>x.id===+id);
  const img=own?own.img:(d.img?(d.mi?`covers/r/${k}_${d.img.replace(/\//g,'_')}.jpg`:`https://cdn.myanimelist.net/images/${k==='a'?'anime':'manga'}/${d.img}.jpg`):'');
  const st=own?(k==='a'?AST:MST)[own.st]:null;
  return `<button type="button" class="reltile" data-rk="${k}" data-rid="${id}" title="${esc(own?own.t:d.t)}">${cover(own?own.t:d.t,img,own&&own.sc?`<span class="badge">${own.sc}</span>`:'')}<span class="rl">${esc(RELN[rel]||rel)}${d.ty?` · ${esc(TYN[d.ty]||d.ty.toUpperCase())}`:''}</span><span class="rn">${esc(own?own.t:d.t)}</span><span class="rs" style="color:${st?st[1]:'var(--ink3)'}">${st?esc(st[0]):'Not in your list'}</span></button>`;
}
function bindRel(det){
  document.querySelectorAll('#m_x [data-rk]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.rk,id=+b.dataset.rid,own=(k==='a'?anime:manga).find(x=>x.id===id);
    if(own)return (k==='a'?openAnime:openManga)(own);
    const d=det[k][id]||{t:b.getAttribute('title')||''};const kind=k==='a'?'anime':'manga';
    openExt(kind,{malId:id,t:d.t,alt:d.jt||'',y:(d.sd||'').slice(0,4),sum:(_MS&&_MS[k][id])||'',img:d.img?`https://cdn.myanimelist.net/images/${kind}/${d.img}.jpg`:'',meta:[TYN[d.ty]||'',d.n?d.n+(k==='a'?' eps':' ch'):'',k==='a'&&d.dur?hm(d.dur/60)+' each':'',d.mal?'MAL '+d.mal:'',(d.stu||d.au||[]).join(', ')].filter(Boolean).join(' · '),url:`https://myanimelist.net/${kind}/${id}`});
  });
}
async function malExtra(k,x){
  const box=$('#m_x');if(!box)return;
  const det=await mdFor(k,x.id);
  if(!$('#m_x')||$('#m_x')!==box)return;
  const me=det[k][x.id];
  if(!me){box.innerHTML=`<div class="small muted" style="margin-top:10px">Episode length and related entries for this one arrive with the next update.</div>`;return}
  const ok=(kk,id)=>{const d=det[kk][id];return d&&!d.x&&!d.gone};
  const ok2k=k==='a'?'m':'a',stub={};(me.ad||[]).forEach(r=>{if(!det[ok2k][r[0]])stub[ok2k+r[0]]={t:r[2]||'',ty:''}});
  const okr=(kk,id)=>ok(kk,id)||(!det[kk][id]&&!!stub[kk+id]);
  let h='',lenH='';
  // length
  if(k==='a'&&me.dur){const per=me.dur/60,eps=me.n||x.eps||0,film=me.ty==='movie'||eps===1;
    const mine=(x.st===2?(x.eps||eps):x.ep)*per*(1+(x.rw||0));
    lenH=`<div class="kv" style="margin-top:0"><div>Length</div><div>${film?hm(per):`${hm(per)} per episode${eps?` · ${hm(per*eps)} in total`:''}`}</div>${mine>0?`<div>Your time</div><div>about ${hm(mine)}${x.rw?' including rewatches':''}</div>`:''}</div>`}
  // direct relations
  const ok2=k==='a'?'m':'a';const cross=(me.ad||[]).map(r=>[ok2,r[0],r[1]==='adaptation'?'adaptation':(r[1]||'other')]);
  const rels=[...(me.ra||[]).map(r=>['a',r[0],r[1]]),...(me.rm||[]).map(r=>['m',r[0],r[1]]),...cross].filter((r,i,A)=>okr(r[0],r[1])&&A.findIndex(z=>z[0]===r[0]&&z[1]===r[1])===i)
    .sort((p,q)=>(p[0]===k?0:1)-(q[0]===k?0:1)||RELO.indexOf(p[2])-RELO.indexOf(q[2]));
  if(rels.length)h+=`<div class="sect" style="--c:${k==='a'?'var(--anime)':'var(--manga)'};margin-top:14px"><h2><i></i>Related</h2><div class="relgrid">${rels.map(r=>relTile(r[0],r[1],r[2],det[r[0]][r[1]]||stub[r[0]+r[1]])).join('')}</div></div>`;
  // the whole franchise in release order (same medium)
  const key=k==='a'?'ra':'rm',seen=new Set([x.id]),q=[x.id];
  while(q.length&&seen.size<80){const id=q.shift(),d=det[k][id];if(!d)continue;(d[key]||[]).forEach(([n,rel])=>{if(rel!=='character'&&!seen.has(n)&&ok(k,n)){seen.add(n);q.push(n)}})}
  if(seen.size>2){
    const list=[...seen].map(id=>[id,det[k][id]||{t:x.t,sd:''}]).sort((p,q)=>(p[1].sd||'9999').localeCompare(q[1].sd||'9999'));
    h+=`<details class="sect fran" style="--c:${k==='a'?'var(--anime)':'var(--manga)'};margin-top:14px" open><summary><h2><i></i>Full series in release order <span class="muted mono">${list.length}</span></h2></summary><ol class="franl">${list.map(([id,d])=>{const own=(k==='a'?anime:manga).find(o=>o.id===id),st=own?(k==='a'?AST:MST)[own.st]:null,cur=id===x.id;
      return `<li class="${cur?'cur':''}"><button type="button" ${cur?'disabled':''} data-rk="${k}" data-rid="${id}"><span class="fd mono">${esc((d.sd||'').slice(0,7)||'—')}</span><span class="ft">${esc(TYN[d.ty]||(d.ty||'').toUpperCase())}</span><span class="fn">${esc(own?own.t:d.t)}${k==='a'&&d.dur&&(d.ty==='movie'||d.n===1)?` <span class="muted">· ${hm(d.dur/60)}</span>`:k==='a'&&d.n?` <span class="muted">· ${d.n} ep</span>`:''}</span><span class="fs" style="color:${st?st[1]:'var(--ink3)'}">${cur?'You are here':st?esc(st[0])+(own.sc?' · '+own.sc:''):'Not in your list'}</span></button></li>`}).join('')}</ol></details>`;
  }
  // studio / author, airing, synopsis
  loadSyn();
  let top='';
  if(k==='a'&&me.stu&&me.stu.length)top+=`<div>Studio</div><div>${me.stu.map(esc).join(', ')}</div>`;
  if(k==='m'&&me.au&&me.au.length)top+=`<div>Author</div><div>${me.au.map(esc).join(', ')}</div>`;
  if(k==='a'&&me.st==='currently_airing'){const nx=nextAir(me);top+=`<div>Airing</div><div>Every ${esc(cap(me.bc?me.bc[0]:''))}${nx?` · next episode ${esc(nx.when)} (${esc(nx.in)})`:''}</div>`}
  else if(me.st==='not_yet_aired'||me.st==='not_yet_published')top+=`<div>Status</div><div>Not out yet${me.sd?' · starts '+esc(me.sd):''}</div>`;
  const info=$('#m_info'),head=(top?`<div class="kv" style="margin-top:0">${top}</div>`:'')+lenH;
  if(info){info.innerHTML=head;box.innerHTML=h;const rb=document.querySelector('#m_tabs [data-at="rel"]');if(rb&&!h)rb.hidden=true;mTabsCheck()}
  else box.innerHTML=head+h;
  bindRel(det);
  genreRow(k==='a'?'anime':'manga',x.id,me.g||x.g);
  if(k==='a'&&me.src){const kv=$('#modal .kv');const t=kv&&[...kv.children].find(d=>d.textContent==='Type');if(t&&t.nextElementSibling){t.nextElementSibling.insertAdjacentHTML('afterend',`<div>Source</div><div>${esc(SRCN[me.src]||cap(me.src.replace(/_/g,' ')))}</div>`)}}
}
const SRCN={original:'Original',manga:'Manga','4_koma_manga':'4-koma manga',web_manga:'Web manga',digital_manga:'Digital manga',novel:'Novel',light_novel:'Light novel',visual_novel:'Visual novel',game:'Game',card_game:'Card game',book:'Book',picture_book:'Picture book',radio:'Radio',music:'Music',web_novel:'Web novel',mixed_media:'Mixed media',other:'Other'};
let _MS=null;async function loadSyn(){if(!_MS)_MS=await loadJ('data/mal_syn.json')||{a:{},m:{}};return _MS}
const cap=s=>s?s[0].toUpperCase()+s.slice(1):'';
const DOW=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
function nextAir(d){if(!d.bc)return null;const day=DOW.indexOf(d.bc[0]);if(day<0)return null;const [hh,mm]=(d.bc[1]||'00:00').split(':').map(Number);
  // MAL gives Japan time (UTC+9): find the next such moment, then show it in your own time
  const now=Date.now(),J=new Date(now+9*3600e3),diff=(day-J.getUTCDay()+7)%7;
  let t=Date.UTC(J.getUTCFullYear(),J.getUTCMonth(),J.getUTCDate()+diff,hh,mm||0)-9*3600e3;if(t<=now)t+=7*86400e3;t=new Date(t);
  const ms=t-now,dd=Math.floor(ms/86400e3),hr=Math.floor(ms%86400e3/3600e3);
  return {t,when:t.toLocaleString(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'}),in:dd?`in ${dd} day${dd>1?'s':''}${hr?` ${hr} h`:''}`:hr?`in ${hr} h`:'within the hour'}}
async function filmExtra(f){
  const box=$('#m_x');if(!box||!f.tmdb)return;
  if(!_FD)_FD=await loadJ('data/film_details.json')||{f:{},col:{}};
  if($('#m_x')!==box)return;
  const me=_FD.f[f.tmdb];if(!me)return;
  let h=`<div class="kv" style="margin-top:0">${me.dir&&me.dir.length?`<div>Director</div><div>${me.dir.map(esc).join(', ')}</div>`:''}${me.cast&&me.cast.length?`<div>Starring</div><div>${me.cast.map(esc).join(', ')}</div>`:''}${me.g&&me.g.length?`<div>Genres</div><div>${me.g.map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>`:''}${me.rt?`<div>Length</div><div>${hm(me.rt)}${f.s==='w'&&f.rw?` · about ${hm(me.rt*(1+f.rw))} with rewatches`:''}</div>`:''}</div>${me.ov&&f.s!=='w'?`<div class="syn">${esc(me.ov)}</div>`:''}`;
  const col=me.col&&_FD.col[me.col];
  if(col&&col.p.length>1){
    h+=`<div class="sect" style="--c:var(--film);margin-top:14px"><h2><i></i>${esc(col.n)} <span class="muted mono">${col.p.length} films</span></h2><div class="relgrid">${col.p.map(([id,t,d,pp],i)=>{const own=films.find(x=>x.tmdb===id),cur=id===f.tmdb;
      return `<button type="button" class="reltile${cur?' cur':''}" data-fid="${id}" ${cur?'disabled':''}>${cover(t,own&&own.img||(pp?'https://image.tmdb.org/t/p/w185'+pp:''),own&&own.r?`<span class="badge">${own.r}★</span>`:'')}<span class="rl">Part ${i+1}${d?' · '+d.slice(0,4):''}</span><span class="rn">${esc(t)}</span><span class="rs" style="color:${cur?'var(--film)':own?(own.s==='w'?'var(--s2)':'var(--s6)'):'var(--ink3)'}">${cur?'You are here':own?(own.s==='w'?'Watched':'On watchlist'):'Not logged'}</span></button>`}).join('')}</div></div>`;
  }
  box.innerHTML=h;genreRow('films',f.tmdb||f.u,me.g||[]);
  box.querySelectorAll('[data-fid]').forEach(b=>b.onclick=()=>{const id=+b.dataset.fid,own=films.find(x=>x.tmdb===id);if(own)return openFilm(own);window.open('https://letterboxd.com/tmdb/'+id,'_blank','noopener')});
}
function gameSeries(g){
  const fr=(g.fr||[])[0];if(!fr)return '';
  const L=games.filter(x=>(x.fr||[]).includes(fr)).sort((a,b)=>(a.rel||'9999').localeCompare(b.rel||'9999'));
  if(L.length<2)return '';
  return `<div class="sect" style="--c:var(--game);margin-top:14px"><h2><i></i>${esc(fr)} series <span class="muted mono">${L.length} in your list</span></h2><div class="relgrid">${L.map(x=>`<button type="button" class="reltile${x===g?' cur':''}" data-gi="${x.i}" ${x===g?'disabled':''}>${cover(x.t,x.img||'',gBadge(x))}<span class="rl">${x.rel?x.rel.slice(0,4):''}</span><span class="rn">${esc(x.t)}</span><span class="rs" style="color:${x===g?'var(--game)':GSH[x.shelf]||'var(--ink3)'}">${x===g?'You are here':esc(x.shelf)}</span></button>`).join('')}</div></div>`;
}
const BSER=t=>{const m=/\(([^()#]+?),?\s*#\s*([\d.]+)\)\s*$/.exec(t||'');return m?{n:m[1].trim(),i:+m[2]}:null};
function bookSeries(b){
  const me=BSER(b.t);if(!me)return '';
  const sk=n=>norm(n).replace(/^the /,'');
  const L=books.filter(x=>{const s=BSER(x.t);return s&&sk(s.n)===sk(me.n)}).sort((a,c)=>BSER(a.t).i-BSER(c.t).i);
  me.n=L.map(x=>BSER(x.t).n).sort((a,c)=>c.length-a.length)[0]||me.n;
  return `<div class="sect" style="--c:var(--book);margin-top:14px"><h2><i></i>${esc(me.n)} <span class="muted mono">book ${me.i}</span></h2>${L.length>1?`<div class="relgrid">${L.map(x=>`<button type="button" class="reltile${x===b?' cur':''}" data-bi="${x.i}" ${x===b?'disabled':''}>${cover(x.t,x.img||'',x.r?`<span class="badge">${x.r}★</span>`:'')}<span class="rl">Book ${BSER(x.t).i}</span><span class="rn">${esc(x.t.replace(/\s*\([^()]*#[^()]*\)\s*$/,''))}</span><span class="rs" style="color:${x===b?'var(--book)':BST[x.st][1]}">${x===b?'You are here':esc(BST[x.st][0])}</span></button>`).join('')}</div>`:`<div class="small muted">The only book from this series in your list.</div>`}</div>`;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-gi],[data-bi]');if(!b||!b.closest('#modal'))return;if(b.dataset.gi!=null){const g=games.find(x=>x.i===+b.dataset.gi);if(g)openGame(g)}else{const x=books.find(x=>x.i===+b.dataset.bi);if(x)openBook(x)}});
function openManga(m){
  modal('manga','Manga',`${cover(m.t,m.img)}<div><h2>${esc(m.t)}</h2>${m.alt?`<div class="muted">${esc(m.alt)}</div>`:''}
  <div class="bigscore"><div><b>${m.sc||'–'}</b><small>Your score</small></div><div><b>${m.mal?m.mal.toFixed(2):'–'}</b><small>MAL score</small></div><div><b style="color:${MST[m.st][1]}">■</b><small>${MST[m.st][0]}</small></div></div>
  <div class="kv"><div>Type</div><div>${esc(m.type)}</div>${m.local&&!m.chs?'':`<div>Chapters</div><div>${m.ch} read of ${m.chs||'?'}</div>`}${m.vols||m.vol?`<div>Volumes</div><div>${m.vol} read of ${m.vols||'?'}</div>`:''}<div>Reread</div><div>${m.rw} time${m.rw===1?'':'s'}${m.rwing?' · rereading now':''}</div><div>Published</div><div>${m.y||'–'}</div><div>Genres</div><div>${m.g.map(g=>`<span class="tag">${esc(g)}</span>`).join('')||'–'}</div></div>
  ${m.pend?'<div class="note" style="margin-top:10px">⏳ Your latest change is saved here and waiting for MyAnimeList to come back.</div>':''}
  <div id="m_x"></div>
  ${m.tags?`<div class="review" style="--c:var(--manga)">${esc(m.tags)}</div>`:''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${ED.on?'<button class="btn pri" id="m_edit">Edit</button>':''}${m.local?`<span class="small muted" style="align-self:center">Not on MyAnimeList, so it's kept on this site.</span>`:`<a class="btn${ED.on?'':' pri'}" href="https://myanimelist.net/manga/${m.id}" target="_blank" rel="noopener">Open on MyAnimeList ↗</a>`}</div></div>`);
  const me=$('#m_edit');if(me)me.onclick=()=>editMal('manga',m);
  if(m.local){const kv=$('#modal .kv');if(kv&&(m.au||m.jt))kv.insertAdjacentHTML('beforeend',`${m.au?`<div>Author</div><div>${esc(m.au)}</div>`:''}${m.jt?`<div>Japanese</div><div>${esc(m.jt)}</div>`:''}`);if(m.d){$('#m_x').innerHTML=`<div class="syn">${esc(m.d)}</div>`}}
  else malExtra('m',m);
}

