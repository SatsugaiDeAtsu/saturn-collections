/* ---------- generic list page ---------- */
const ICON_GRID='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="6" height="6"/><rect x="8" y="0" width="6" height="6"/><rect x="0" y="8" width="6" height="6"/><rect x="8" y="8" width="6" height="6"/></svg>';
const ICON_LIST='<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="14" height="3"/><rect x="0" y="5.5" width="14" height="3"/><rect x="0" y="11" width="14" height="3"/></svg>';
function listPage(cfg){
  const S=state[cfg.key];
  if(!cfg.tabs.some(t=>t[0]===S.tab))S.tab=({anime:'2',manga:'2',games:'Played',books:'read'})[cfg.key]||cfg.tabs[0][0];
  const all=cfg.items();
  const counts={};cfg.tabs.forEach(([k,,f])=>counts[k]=all.filter(f).length);
  const app=$('#app');
  app.innerHTML=`${banner(cfg.key,cfg.title,cfg.sub,cfg.bst?cfg.bst():[],cfg.kicker)}
  <div class="tabs" style="--c:${MED[cfg.key].c}">${cfg.tabs.map(([k,l])=>`<button data-t="${k}" class="${S.tab===k?'on':''}">${l}<span class="n">${counts[k]}</span></button>`).join('')}</div>
  <div class="toolbar">
    <input id="lq" type="search" placeholder="Filter this list…" value="${esc(S.q)}">
    ${cfg.extra?cfg.extra(S):''}
    <select id="ls" aria-label="Sort">${cfg.sorts.map(([k,l])=>`<option value="${k}" ${S.sort===k?'selected':''}>${l}</option>`).join('')}</select>
    <div class="seg"><button data-v="grid" class="${S.view==='grid'?'on':''}" aria-label="Grid view">${ICON_GRID}</button><button data-v="table" class="${S.view==='table'?'on':''}" aria-label="Table view">${ICON_LIST}</button></div>
  </div>
  <div id="lbody"></div>`;
  const body=()=>{
    const tf=cfg.tabs.find(t=>t[0]===S.tab)[2];
    const q=norm(S.q);
    let rows=all.filter(tf).filter(x=>!q||x.n.includes(q)).filter(x=>!cfg.xfilter||cfg.xfilter(x,S));
    rows.sort(cfg.sorter(S.sort));
    const shown=rows.slice(0,S.lim);
    let h='';
    const pre=cfg.xhead&&cfg.xhead(S)?`<div style="margin:12px 0 0">${cfg.xhead(S)}</div>`:'';
    if(cfg.special&&cfg.special(S)){h=cfg.special(S)}
    else if(!rows.length)h='<div class="empty">Nothing here yet.</div>';
    else if(S.view==='grid')h=`<div class="cgrid">${shown.map((x,i)=>cfg.card(x,i)).join('')}</div>`;
    else h=`<table class="lt"><thead><tr>${cfg.thead}</tr></thead><tbody>${shown.map((x,i)=>cfg.row(x,i)).join('')}</tbody></table>`;
    if(!(cfg.special&&cfg.special(S))&&rows.length>S.lim)h+=`<div class="more"><button class="btn" id="lmore">Show more (${fmt(rows.length-S.lim)} left)</button></div>`;
    $('#lbody').innerHTML=pre+h;
    $('#lbody').querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>cfg.open(shown[+el.dataset.i]));
    if(cfg.bind)cfg.bind();
    const sa=$('#sr_add');if(sa)sa.onclick=findSeries;
    const m=$('#lmore');if(m)m.onclick=()=>{S.lim+=120;body()};
  };
  app.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{S.tab=b.dataset.t;S.lim=60;app.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));body()});
  $('#lq').oninput=e=>{S.q=e.target.value;S.lim=60;body()};
  $('#ls').onchange=e=>{S.sort=e.target.value;body()};
  app.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{S.view=b.dataset.v;store.set('view_'+cfg.key,S.view);app.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));body()});
  if(cfg.bindExtra)cfg.bindExtra(S,body);
  if(ED.on&&(cfg.key==='games'||cfg.key==='books')){const b=document.createElement('button');b.className='btn pri';b.textContent=cfg.key==='games'?'+ Add game':'+ Add book';b.onclick=()=>cfg.key==='games'?editGame():editBook();app.querySelector('.toolbar').prepend(b)}
  body();
}
const cmpT=(a,b)=>a.t.localeCompare(b.t);

/* ---------- anime ---------- */
function rAnime(){
  const types=[...new Set(anime.map(a=>a.type))].sort();
  listPage({key:'anime',title:'Anime list',bst:()=>[[fmt(anime.length),'entries'],[fmt(anime.reduce((s,a)=>s+(a.st===2?(a.eps||a.ep):a.ep),0)),'episodes'],[fmt(anime.reduce((s,a)=>s+a.rw,0)),'rewatches'],[avg(anime.filter(a=>a.sc).map(a=>a.sc)).toFixed(2),'mean score']],sub:`${fmt(anime.length)} entries · from MyAnimeList · updated ${fdate(D.generated)}`,
    items:()=>anime,
    tabs:[['1','Watching',a=>a.st===1],['2','Completed',a=>a.st===2],['3','On-Hold',a=>a.st===3],['4','Dropped',a=>a.st===4],['6','Plan to Watch',a=>a.st===6],['rw','Rewatched',a=>a.rw>0||a.rwing]],
    sorts:[['updated','Last updated'],['score','Your score'],['mal','MAL score'],['title','Title'],['year','Year (newest)'],['eps','Episodes']],
    extra:S=>`<select id="ltype" aria-label="Type"><option value="">All types</option>${types.map(t=>`<option ${S.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select>`,
    bindExtra:(S,body)=>{$('#ltype').onchange=e=>{S.type=e.target.value;body()}},
    xfilter:(a,S)=>!S.type||a.type===S.type,
    sorter:k=>({updated:(a,b)=>b.up-a.up,score:(a,b)=>b.sc-a.sc||b.mal-a.mal,mal:(a,b)=>b.mal-a.mal,title:cmpT,year:(a,b)=>b.y-a.y,eps:(a,b)=>b.eps-a.eps})[k],
    card:(a,i)=>`<div class="card" data-i="${i}">${cover(a.t,a.img,(a.sc?`<span class="badge">${a.sc}</span>`:'')+`<span class="sline" style="--sc:${AST[a.st][1]}"></span>`)}<div class="meta"><div class="tt">${esc(a.t)}</div><div class="ss"><span>${esc(a.type)}${a.y?' · '+a.y:''}</span><span>${a.eps?a.ep+'/'+a.eps:a.ep||''}</span></div></div></div>`,
    thead:'<th style="width:5px;padding:0"></th><th class="hm">#</th><th></th><th>Title</th><th style="text-align:center">Score</th><th class="hm" style="text-align:center">Type</th><th style="text-align:center">Progress</th><th class="hm" style="text-align:center">MAL</th>',
    row:(a,i)=>`<tr data-i="${i}"><td class="st" style="--sc:${AST[a.st][1]}"></td><td class="num hm">${i+1}</td><td style="width:54px">${cover(a.t,a.img,'','mini')}</td><td><div class="ti">${esc(a.t)}</div>${a.alt?`<div class="alt">${esc(a.alt)}</div>`:''}</td><td class="sc">${a.sc||'<span class="muted">–</span>'}</td><td class="c hm">${esc(a.type)}</td><td class="c mono small">${a.st===2&&a.eps?a.eps:a.ep}<span class="muted">/${a.eps||'?'}</span></td><td class="c mono small hm">${a.mal?a.mal.toFixed(2):'–'}</td></tr>`,
    open:openAnime});
}
function openAnime(a){
  modal('anime','Anime',`${cover(a.t,a.img)}<div><h2>${esc(a.t)}</h2>${a.alt?`<div class="muted">${esc(a.alt)}</div>`:''}
  <div class="bigscore"><div><b>${a.sc||'–'}</b><small>Your score</small></div><div><b>${a.mal?a.mal.toFixed(2):'–'}</b><small>MAL score</small></div><div><b style="color:${AST[a.st][1]}">■</b><small>${AST[a.st][0]}</small></div></div>
  <div class="kv"><div>Type</div><div>${esc(a.type)}</div><div>Episodes</div><div>${a.st===2&&a.eps?a.eps:a.ep} watched of ${a.eps||'?'}</div><div>Rewatched</div><div>${a.rw} time${a.rw===1?'':'s'}${a.rwing?' · rewatching now':''}</div><div>Aired</div><div>${a.y||'–'}</div><div>Genres</div><div>${a.g.map(g=>`<span class="tag">${esc(g)}</span>`).join('')||'–'}</div>${a.up?`<div>Updated</div><div>${fdate(new Date(a.up*1000).toISOString())}</div>`:''}</div>
  ${a.pend?'<div class="note" style="margin-top:10px">⏳ Your latest change is saved here and waiting for MyAnimeList to come back.</div>':''}
  <div id="m_info"></div>
  <div class="mtab2" id="m_tabs" hidden><button data-at="rel">Related</button><button data-at="mus" hidden>Music</button></div>
  <div id="m_x" hidden></div><div id="m_mus" hidden></div>
  ${a.tags?`<div class="review" style="--c:var(--anime)">${esc(a.tags)}</div>`:''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${ED.on?'<button class="btn pri" id="m_edit">Edit</button>':''}<a class="btn${ED.on?'':' pri'}" href="https://myanimelist.net/anime/${a.id}" target="_blank" rel="noopener">Open on MyAnimeList ↗</a></div></div>`);
  const me=$('#m_edit');if(me)me.onclick=()=>editMal('anime',a);
  malExtra('a',a);animeSongs(a);
  document.querySelectorAll('#m_tabs [data-at]').forEach(b=>b.onclick=()=>{const w=b.classList.contains('on')?'':b.dataset.at;document.querySelectorAll('#m_tabs [data-at]').forEach(x=>x.classList.toggle('on',x.dataset.at===w));$('#m_x').hidden=w!=='rel';$('#m_mus').hidden=w!=='mus'});
}
/* openings and endings (from MAL), matched to my Spotify music */
function themeParse(s){s=String(s).replace(/[“”]/g,'"');const m=String(s).match(/^(?:#?\d+:\s*)?"(.+?)"\s*(?:by\s+(.+?))?\s*(\((?:eps?|episodes?)[^)]*\))?\s*$/i);
  if(!m)return {t:s,ar:'',eps:''};let t=m[1],ar=(m[2]||'').replace(/\s*\((?:eps?|episodes?)[^)]*\)\s*$/i,'').trim();
  const jp=t.match(/^(.*?)\s*\(([^)]+)\)$/);return {t:jp?jp[1]:t,alt:jp?jp[2]:'',ar,eps:(m[3]||'').replace(/[()]/g,'')}}
async function animeSongs(a){
  await new Promise(ok=>setTimeout(ok,50));
  const d=((await mdFor('a',a.id)).a||{})[a.id]||{};
  const op=d.op||[],ed=d.ed||[];if(!op.length&&!ed.length)return;
  await Promise.all([muLoad(),mhLoad()]);
  const box=$('#m_mus');if(!box)return;
  // match by song title AND artist (a title alone can belong to many songs)
  const idx={},add=(k,id,ar)=>{(idx[k]=idx[k]||[]).push({id,ar:norm(ar)})};
  if(MU&&MU.tracks)for(const [id,t] of Object.entries(MU.tracks)){const k=mBase(t.n);if(k)(t.ar||[]).forEach(a=>add(k,id,a[1]))}
  if(MH&&MH.tracks)for(const [id,t] of Object.entries(MH.tracks)){const k=mBase(t[4]);if(k)add(k,id,t[5])}
  const find=(titles,artist)=>{const A=norm(artist);if(!A)return null;for(const t of titles){for(const c of (idx[mBase(t)]||[])){if(c.ar&&(A.includes(c.ar)||c.ar.includes(A.split(' (')[0])))return c.id}}return null};
  const row=(s,i,kind)=>{const p=themeParse(s);const id=find([p.t,p.alt].filter(Boolean),p.ar);if(id)mhKnow(id);const q=encodeURIComponent(p.t+' '+p.ar.replace(/\s*\(.*?\)/g,''));
    const h=id?mhT(id):null;
    return `<div class="mrow"><span class="no">${kind}${i+1}</span><span></span><div style="min-width:0"><div class="tt">${esc(p.t)}${p.alt?` <span class="muted">(${esc(p.alt)})</span>`:''}</div><div class="ar">${esc(p.ar)}${p.eps?` · <span class="muted">${esc(p.eps)}</span>`:''}${id&&h&&h[1]?`<span class="mplays">${fmt(h[1])} plays · ${mhH(h[0])}</span>`:''}</div></div><div class="al"></div><div class="du"></div>
      <div class="act2">${id?`<button class="mbtn" data-mplay="track:${id}" aria-label="Play">▶</button><a class="mbtn sp" href="${SPU('track',id)}" target="_blank" rel="noopener"><span class="spt">Spotify </span>↗</a>`:`<a class="mbtn" href="https://open.spotify.com/search/${q}" target="_blank" rel="noopener">Find on Spotify ↗</a>`}</div></div>`};
  box.innerHTML=`<div class="sect" style="--c:var(--music);margin-top:6px"><h2><i></i>Openings &amp; endings</h2><div class="mscroll mcompact" style="max-height:420px">${op.map((s,i)=>row(s,i,'OP')).join('')}${ed.map((s,i)=>row(s,i,'ED')).join('')}</div></div>`;
  const tb=document.querySelector('#m_tabs [data-at="mus"]');if(tb){tb.hidden=false;tb.textContent=`Music · ${op.length+ed.length}`}mTabsCheck();mBind(box)}
// show the tab bar only when a tab has something in it
function mTabsCheck(){const t=$('#m_tabs');if(!t)return;const rel=$('#m_x'),relOk=rel&&rel.innerHTML.trim()!=='',rb=t.querySelector('[data-at="rel"]');if(rb)rb.hidden=!relOk;t.hidden=![...t.querySelectorAll('[data-at]')].some(b=>!b.hidden)}

/* ---------- films ---------- */
function rFilms(){
  const FM=f=>!f.tv;
  listPage({key:'films',title:'Films',bst:()=>[[films.filter(f=>f.s==='w'&&FM(f)).length,'watched'],[films.filter(f=>FM(f)).reduce((s,f)=>s+f.rw,0),'rewatches'],[films.filter(f=>f.tv).length+seriesOwn.length,'series'],[avg(films.filter(f=>f.r&&FM(f)).map(f=>f.r)).toFixed(2)+'★','average']],sub:`${fmt(films.filter(f=>f.s==='w'&&FM(f)).length)} watched · from Letterboxd, series kept here`,
    items:()=>films.concat(seriesOwn),
    tabs:[['watched','Watched',f=>f.tv?f.sst==='w':f.s==='w'],['watching','Watching',f=>!!f.tv&&f.sst==='c'],['liked','Liked',f=>!!f.lk],['rewatched','Rewatched',f=>f.rw>0],['watchlist','Watchlist',f=>f.tv?f.sst==='l':f.s==='l'],['series','Series',f=>!!f.tv&&f.sst!=='l'],['lists','Lists',()=>false]],
    sorts:[['watched','Recently watched'],['added','Date added'],['rating','Your rating'],['year','Release year'],['title','Title']],
    sorter:k=>({watched:(a,b)=>(b.wd||b.d).localeCompare(a.wd||a.d),added:(a,b)=>b.d.localeCompare(a.d),rating:(a,b)=>b.r-a.r||(b.wd||'').localeCompare(a.wd||''),year:(a,b)=>b.y-a.y,title:cmpT})[k],
    card:(f,i)=>`<div class="card" data-i="${i}">${cover(f.t,f.img||f.tvimg||'',(f.r?`<span class="badge">${f.r}★</span>`:'')+(f.tv?`<span class="sline" style="--sc:${SST[f.sst||'w'][1]}"></span><span class="tvtag">Series</span>`:f.s==='l'?`<span class="sline" style="--sc:var(--s6)"></span>`:''))}<div class="meta"><div class="tt">${esc(f.t)}</div><div class="ss"><span>${f.tv?esc(SST[f.sst||'w'][0]):f.y||''}</span><span class="ficons">${f.lk?'<i title="Liked">♥</i>':''}${f.rw?`<i class="rwi" title="Rewatched ${f.rw} time${f.rw>1?'s':''}">↻</i>`:''}${f.rv?'<i title="Reviewed">✎</i>':''}</span></div></div></div>`,
    thead:'<th class="hm">#</th><th></th><th>Film</th><th style="text-align:center">Year</th><th>Rating</th><th class="hm" style="text-align:center">Watched</th>',
    row:(f,i)=>`<tr data-i="${i}"><td class="num hm">${i+1}</td><td style="width:54px">${cover(f.t,f.img||f.tvimg||'','','mini')}</td><td><div class="ti">${esc(f.t)} ${f.lk?'<span style="color:var(--film)">♥</span>':''}${f.rw?' <span class="rwi" title="Rewatched">↻</span>':''}</div>${f.tv?`<div class="alt">Series · ${esc(SST[f.sst||'w'][0])}</div>`:f.rv?'<div class="alt">Reviewed</div>':''}</td><td class="c mono small">${f.y||''}</td><td><span class="stars">${stars(f.r)}</span></td><td class="c small hm">${f.wd?fdate(f.wd):f.s==='l'?'<span class="muted">Watchlist</span>':''}</td></tr>`,
    special:S=>S.tab==='lists'?filmLists():null,
    xhead:S=>S.tab==='series'&&ED.on?'<button class="btn pri" id="sr_add">+ Add series</button>':'',
    bind:()=>{document.querySelectorAll('[data-lf]').forEach(el=>el.onclick=()=>{const f=filmByKey[el.dataset.lf];if(f)openFilm(f);else window.open('https://letterboxd.com/search/films/'+encodeURIComponent(el.dataset.t)+'/','_blank')})},
    open:openFilm});
}
function filmLists(){
  return D.filmLists.map(l=>`<section class="box" style="margin-top:14px"><div class="box-h" style="border-top:3px solid var(--film)"><h2>${esc(l.name)}</h2><span class="small muted">${l.items.length} films${l.desc?' · '+esc(l.desc):''}</span></div><div class="box-b"><div class="grid favs">${l.items.map(([t,y],i)=>{const f=filmByKey[norm(t)+'|'+y];return `<div class="card" data-lf="${esc(norm(t)+'|'+y)}" data-t="${esc(t)}">${cover(t,'',f&&f.r?`<span class="badge">${f.r}★</span>`:`<span class="badge">${i+1}</span>`)}<div class="meta"><div class="tt">${esc(t)}</div><div class="ss"><span>${y}</span></div></div></div>`}).join('')}</div></div></section>`).join('');
}
function rateFilm(f){
  const opts=[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5];
  modal('films','Change my rating',`<div style="grid-column:1/-1"><h2>${esc(f.t)} <span class="muted">${f.y||''}</span></h2>
  <p class="muted small" style="margin:6px 0 12px">For films Letterboxd won't send again. This stays even if Letterboxd keeps the old rating.${f.rov&&f.lbr?' Letterboxd has '+stars(f.lbr)+'.':''}</p>
  <div class="rpick">${opts.map(r=>`<button class="btn${f.r===r?' pri':''}" data-fr="${r}">${stars(r)}</button>`).join('')}</div>
  ${f.rov?`<div style="margin-top:12px"><button class="btn" data-fr="0">Use Letterboxd's rating again</button></div>`:''}<div id="fr_err" class="muted small" style="margin-top:8px"></div></div>`);
  document.querySelectorAll('[data-fr]').forEach(b=>b.onclick=async()=>{const r=+b.dataset.fr;$('#fr_err').textContent='Saving…';
    try{let cur;try{cur=await ghLoad('data/film_ratings.json')}catch(e){cur={}}const k=fKey(f);
      if(r)cur[k]={r,t:f.t,at:new Date().toISOString().slice(0,10)};else delete cur[k];
      await ghSave('data/film_ratings.json',cur,(r?'Rating: ':'Rating back to Letterboxd: ')+f.t);D.filmR=cur;
      if(r){if(!f.rov)f.lbr=f.r;f.r=r;f.rov=1}else{f.r=f.lbr||f.r;f.rov=0}
      closeM();render();toast('Rating saved.')}catch(e){$('#fr_err').textContent='Not saved: '+e.message}})}
function openFilm(f){
  if(f.tv)return openSeries(f);
  const ls=listsFor(f);
  modal('films','Film',`${cover(f.t,f.img||'')}<div><h2>${esc(f.t)} <span class="muted" style="font-weight:500">${f.y||''}</span></h2>
  <div class="bigscore"><div><b class="stars">${f.r?stars(f.r):'–'}</b><small>Your rating${f.rov?` · changed here${f.lbr?' (Letterboxd: '+stars(f.lbr)+')':''}`:''}</small></div><div><b>${f.logs||(f.s==='w'?1:0)}</b><small>Times logged</small></div>${f.lf&&ED.on?'<button class="btn pri" id="m_fedit">Edit</button>':''}${!f.lf&&ED.on&&OWNER()?'<button class="btn" id="m_frate">Change my rating</button>':''}<div><b>${f.lk?'♥':'–'}</b><small>Liked</small></div></div>
  <div class="kv"><div>Status</div><div>${f.s==='w'?'Watched':'On watchlist'}</div>${f.wd?`<div>Last watched</div><div>${fdate(f.wd)}</div>`:''}${f.s==='w'?`<div>Rewatched</div><div>${f.rw} time${f.rw===1?'':'s'}</div>`:''}<div>Added</div><div>${fdate(f.d)}</div>${ls.length?`<div>In lists</div><div>${ls.map(l=>`<span class="tag">${esc(l)}</span>`).join('')}</div>`:''}</div>
  <div id="m_x"></div>
  ${f.rv?`<div class="review" style="--c:var(--film)">${esc(f.rv)}</div>`:''}
  <div style="margin-top:14px"><a class="btn pri" href="${esc(f.u)}" target="_blank" rel="noopener">Open on Letterboxd ↗</a></div></div>`);
  filmExtra(f);
  const fe=$('#m_fedit');if(fe)fe.onclick=()=>editFilmLocal(D.filmsLocal[f.lix]);
  const fr=$('#m_frate');if(fr)fr.onclick=()=>rateFilm(f);
}
async function editFilmLocal(x){
  const isNew=!!x.__new;
  if(isNew){const have=filmByKey[norm(x.t)+'|'+(+x.y||0)];if(have&&!have.lf){toast('Already in your films (from Letterboxd).');return openFilm(have)}if(have&&have.lf)x=D.filmsLocal[have.lix]}
  const isAdd=!!x.__new;
  modal('films',isAdd?'Add film':'Edit film',`<div style="grid-column:1/-1"><h2>${esc(x.t)} <span class="muted" style="font-weight:500">${esc(x.y||'')}</span></h2><div class="eform">
  ${fld('fl_s','Status',x.s==='l'?'l':'w','select:w=Watched|l=Watchlist')}
  ${fld('fl_r','Your rating (0 to 5)',x.r||0,'number','min="0" max="5" step="0.5"')}
  ${fld('fl_wd','Watched on',x.wd||(isAdd?new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10):''),'date')}
  ${fld('fl_rw','Times rewatched',x.rw||0,'number','min="0" step="1"')}
  <label class="ef"><span>Liked</span><span class="chkline"><input type="checkbox" id="fl_lk" ${x.lk?'checked':''}> ♥ Liked it</span></label>
  ${fld('fl_rv','Your review (optional)',x.rv||'','textarea')}
  </div><div class="small muted" style="margin-top:8px">Kept on this site. If you log it on Letterboxd later, the Letterboxd entry takes over.</div>
  <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="fl_save">${isAdd?'Add to my films':'Save'}</button>${isAdd?'':'<button class="btn" id="fl_del" style="margin-left:auto;color:var(--s4)">Remove</button>'}</div></div>`);
  const sync=()=>{const w=gv('fl_s')==='w';['fl_wd','fl_rw','fl_r'].forEach(id=>{const e=$('#'+id);if(e)e.closest('.ef').style.display=w?'':'none'})};
  $('#fl_s').addEventListener('change',sync);sync();
  const save=async del=>{toast('Saving…');
    try{let cur;try{cur=await ghLoad('data/films_local.json')}catch(e){cur={films:[]}}cur.films=cur.films||[];
      const k=f=>norm(f.t)+'|'+(+f.y||0),i=cur.films.findIndex(f=>k(f)===k(x)),w=gv('fl_s')==='w';
      const o={t:x.t,y:+x.y||0,tmdb:x.tmdb||0,img:x.img||'',s:w?'w':'l',r:w?+gv('fl_r')||0:0,wd:w?gv('fl_wd'):'',rw:w?+gv('fl_rw')||0:0,lk:$('#fl_lk').checked?1:0,rv:gv('fl_rv'),d:(i>=0&&cur.films[i].d)||new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10)};
      if(del){if(i>=0)cur.films.splice(i,1)}else if(i>=0)cur.films[i]=o;else cur.films.unshift(o);
      await ghSave('data/films_local.json',cur,(del?'Remove film ':isAdd?'Add film ':'Update film ')+x.t);
      D.filmsLocal=cur.films;Object.keys(filmByKey).forEach(q=>{if(filmByKey[q].lf)delete filmByKey[q]});mergeLocalFilms();films.forEach(f=>{if(f.lf)filmUri[f.u]=f});
      closeM();render();toast(del?'Removed.':'Saved.')}catch(e){toast('Not saved: '+e.message,true)}};
  $('#fl_save').onclick=()=>save(false);
  const d=$('#fl_del');if(d)d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to remove';return}save(true)};
}

let _SD=null;
async function openSeries(f){
  if(!_SD)_SD=await loadJ('data/series_details.json')||{};
  if(!_SD[f.tv]&&SET.tmdbKey){try{const x=await fetch(`https://api.themoviedb.org/3/tv/${f.tv}?api_key=${SET.tmdbKey}&append_to_response=aggregate_credits`).then(r=>r.json());
    if(x&&x.id)_SD[f.tv]={c:1,t:x.name,y:(x.first_air_date||'').slice(0,4),ly:(x.last_air_date||'').slice(0,4),img:x.poster_path?'https://image.tmdb.org/t/p/w342'+x.poster_path:'',ns:x.number_of_seasons||0,ne:x.number_of_episodes||0,rt:(x.episode_run_time||[])[0]||(x.last_episode_to_air||{}).runtime||0,st:x.status||'',g:(x.genres||[]).map(g=>g.name).slice(0,4),by:(x.created_by||[]).map(c=>c.name).slice(0,2),net:(x.networks||[]).map(n=>n.name).slice(0,2),cast:((x.aggregate_credits||{}).cast||[]).map(c=>c.name).slice(0,5),ov:(x.overview||'').slice(0,500)}}catch(e){}}
  const d=_SD[f.tv]||{},st=SST[f.sst||'w'],own=f.own&&(D.series||[])[f.ix];
  modal('films','Series',`${cover(f.t,f.img||f.tvimg||d.img||'')}<div><h2>${esc(f.t)} <span class="muted" style="font-weight:500">${esc(d.y||f.y||'')}${d.ly&&d.ly!==d.y?'–'+esc(d.ly):''}</span></h2>
  <div class="bigscore"><div><b class="stars">${f.r?stars(f.r):'–'}</b><small>Your rating</small></div><div><b style="color:${st[1]}">■</b><small>${st[0]}</small></div>${ED.on?'<button class="btn pri" id="m_edit">Edit</button>':''}<div><b>${f.lk?'♥':'–'}</b><small>Liked</small></div></div>
  <div class="kv">${d.ns?`<div>Seasons</div><div>${d.ns}</div>`:''}<div>Episodes</div><div>${(()=>{const w=f.sst==='w'?(f.ep||d.ne||0):(f.ep||0);return d.ne?(w?`${fmt(w)} watched of ${fmt(d.ne)}`:fmt(d.ne)):'–'})()}</div><div>Episode length</div><div>${d.rt?hm(d.rt):'–'}</div>${d.rt&&d.ne?`<div>Whole series</div><div>about ${hm(d.rt*d.ne)}${f.rw?` · ${hm(d.rt*d.ne*(1+f.rw))} with rewatches`:''}</div>`:''}${d.st?`<div>Status</div><div>${esc(d.st)}</div>`:''}${d.by&&d.by.length?`<div>Created by</div><div>${d.by.map(esc).join(', ')}</div>`:''}${d.net&&d.net.length?`<div>Network</div><div>${d.net.map(esc).join(', ')}</div>`:''}${d.cast&&d.cast.length?`<div>Starring</div><div>${d.cast.map(esc).join(', ')}</div>`:''}${d.g&&d.g.length?`<div>Genres</div><div>${d.g.map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>`:''}${f.rw?`<div>Rewatched</div><div>${f.rw} time${f.rw>1?'s':''}</div>`:''}${f.wd?`<div>Watched</div><div>${fdate(f.wd)}</div>`:''}</div>
  ${d.ov&&f.sst!=='w'?`<div class="syn">${esc(d.ov)}</div>`:''}
  ${f.rv?`<div class="review" style="--c:var(--film)">${esc(f.rv)}</div>`:''}
  ${!d.c?'<div class="small muted" style="margin-top:10px">Couldn\'t reach TMDB just now, so seasons and episodes are missing. Try again in a moment.</div>':''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${f.u?`<a class="btn" href="${esc(f.u)}" target="_blank" rel="noopener">Open on Letterboxd ↗</a>`:''}<a class="btn${f.u?'':' pri'}" href="https://www.themoviedb.org/tv/${f.tv}" target="_blank" rel="noopener">Open on TMDB ↗</a></div></div>`);
  const me=$('#m_edit');if(me)me.onclick=()=>editSeries(own||{id:f.tv,t:f.t,y:f.y,img:f.img||f.tvimg||'',st:f.sst||'w',r:f.r||0,rw:f.rw||0,lk:f.lk||0,note:f.rv||'',wd:f.wd||'',ep:f.sst==='w'?((_SD||{})[f.tv]||{}).ne||0:0});
}
async function editSeries(x){
  if(!_SD)_SD=await loadJ('data/series_details.json')||{};
  if(!(_SD[x.id]||{}).ne&&SET.tmdbKey){try{const t=await fetch(`https://api.themoviedb.org/3/tv/${x.id}?api_key=${SET.tmdbKey}`).then(r=>r.json());if(t&&t.id)_SD[x.id]=Object.assign(_SD[x.id]||{},{ne:t.number_of_episodes||0,ns:t.number_of_seasons||0})}catch(e){}}
  const isNew=!(D.series||[]).some(s=>String(s.id)===String(x.id));
  modal('films',isNew?'Add series':'Edit series',`<div style="grid-column:1/-1"><h2>${esc(x.t)}</h2><div class="eform">
  ${fld('sv_st','Status',['w','c','l'].includes(x.st)?x.st:x.st==='h'||x.st==='d'?'c':'l','select:w=Watched|c=Watching|l=Watchlist')}
  ${fld('sv_r','Your rating (0 to 5)',x.r||0,'number','min="0" max="5" step="0.5"')}
  ${fld('sv_ep','Episodes watched'+((_SD||{})[x.id]&&_SD[x.id].ne?' (of '+_SD[x.id].ne+')':''),x.ep||0,'number','min="0" step="1"')}
  ${fld('sv_rw','Times rewatched',x.rw||0,'number','min="0" step="1"')}
  ${fld('sv_wd','Finished on',x.wd||'','date')}
  <label class="ef"><span>Liked</span><span class="chkline"><input type="checkbox" id="sv_lk" ${x.lk?'checked':''}> ♥ Liked it</span></label>
  ${fld('sv_note','Your note',x.note||'','textarea')}
  </div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="sv_save">${isNew?'Add to my series':'Save'}</button>${isNew?'':'<button class="btn" id="sv_del" style="margin-left:auto;color:var(--s4)">Remove</button>'}</div></div>`);
  const tot=((_SD||{})[x.id]||{}).ne||0;
  $('#sv_st').addEventListener('change',()=>{if($('#sv_st').value==='w'){if(tot)$('#sv_ep').value=tot;if(!$('#sv_wd').value)$('#sv_wd').value=new Date().toISOString().slice(0,10)}});
  const save=async del=>{toast('Saving…');
    try{let cur;try{cur=await ghLoad('data/series.json')}catch(e){cur={series:[]}}cur.series=cur.series||[];
      const i=cur.series.findIndex(s=>String(s.id)===String(x.id));
      const o={id:x.id,t:x.t,y:String(x.y||''),img:x.img||'',st:gv('sv_st'),r:+gv('sv_r')||0,rw:+gv('sv_rw')||0,ep:gv('sv_st')==='w'&&tot?Math.max(tot,+gv('sv_ep')||0):+gv('sv_ep')||0,wd:gv('sv_wd'),lk:$('#sv_lk').checked?1:0,note:gv('sv_note'),d:(i>=0&&cur.series[i].d)||new Date().toISOString().slice(0,10)};
      if(del){if(i>=0)cur.series.splice(i,1)}else if(i>=0)cur.series[i]=o;else cur.series.unshift(o);
      await ghSave('data/series.json',cur,(del?'Remove series ':isNew?'Add series ':'Update series ')+x.t);
      D.series=cur.series;films.forEach(f=>{if(f.tv){delete f.own;delete f.ix}});rebuildSeries();closeM();render();toast(del?'Removed.':'Saved. Details arrive with the next update.')}catch(e){toast('Not saved: '+e.message,true)}};
  $('#sv_save').onclick=()=>save(false);
  const d=$('#sv_del');if(d)d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to remove';return}save(true)};
}
async function findSeries(){
  modal('films','Add series',`<div style="grid-column:1/-1"><h2>Add a TV series</h2><div class="ef" style="margin-top:10px"><span>Find it</span><div style="display:flex"><input id="sr_q" placeholder="Series title" style="flex:1"><button class="btn" id="sr_go" style="border-radius:0">Find</button></div></div><div id="sr_res" style="margin-top:12px"></div></div>`);
  const go=async()=>{const q=gv('sr_q');if(!q)return;$('#sr_res').innerHTML='<div class="muted"><span class="spin"></span>Searching…</div>';
    try{const r=await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${SET.tmdbKey}&query=${encodeURIComponent(q)}`).then(r=>r.json());const L=(r.results||[]).slice(0,10);
      $('#sr_res').innerHTML=L.length?`<div class="sres" style="margin-top:0">${L.map((t,i)=>`<div class="xr" data-sr="${i}">${cover(t.name,t.poster_path?'https://image.tmdb.org/t/p/w342'+t.poster_path:'')}<div><div class="tt">${esc(t.name)}</div><div class="small muted">${esc((t.first_air_date||'').slice(0,4))}${t.original_name&&t.original_name!==t.name?' · '+esc(t.original_name):''}</div><p>${esc(t.overview||'')}</p></div></div>`).join('')}</div>`:'<div class="muted">No series found.</div>';
      document.querySelectorAll('[data-sr]').forEach(el=>el.onclick=()=>{const t=L[+el.dataset.sr];editSeries({id:t.id,t:t.name,y:(t.first_air_date||'').slice(0,4),img:t.poster_path?'https://image.tmdb.org/t/p/w342'+t.poster_path:'',st:'l'})})}
    catch(e){$('#sr_res').innerHTML='<div class="muted">Search failed. Try again.</div>'}};
  $('#sr_go').onclick=go;$('#sr_q').onkeydown=e=>{if(e.key==='Enter')go()};$('#sr_q').focus();
}

