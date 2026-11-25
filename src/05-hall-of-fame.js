/* ---------- hall of fame ---------- */
const MALK={a:'anime',m:'manga',c:'character',p:'people'};
const KLAB={a:'Anime',m:'Manga',c:'Character',p:'Person'};
let hofSeg='home';
const HOFITEMS=[];
function hItem(code,extra){
  const [kid,name,pic]=code.split('~');const k=kid[0],id=+kid.slice(1);
  const own=k==='a'?anime.find(x=>x.id===id):k==='m'?manga.find(x=>x.id===id):null;
  const idx=HOFITEMS.push({k,id,name,own,pic})-1;
  const sub=(k==='c'||k==='p')&&(D.hofSub||{})[k+id]||extra||KLAB[k];
  return `<div class="card" data-h="${idx}">${cover(own?own.t:name,pic||(own&&own.img?own.img:HIMG(k,id)),(own&&own.sc?`<span class="badge">${own.sc}</span>`:''))}<div class="meta"><div class="tt">${esc(name)}</div><div class="ss"><span>${esc(sub)}</span></div></div></div>`;
}
const HIMG=(k,id)=>(D.hofImages||{})[k+id]||'';
function coupleCards(list){
  return `<div class="couples">${list.map(([n,show,cs])=>`<div class="couple"><div class="pair">${cs.map(c=>{const [kid,nm,pic]=c.split('~');const idx=HOFITEMS.push({k:kid[0],id:+kid.slice(1),name:nm,pic})-1;return `<div data-h="${idx}" style="cursor:pointer">${cover(nm,pic||HIMG(kid[0],+kid.slice(1)))}</div>`}).join('')}</div><div class="meta"><b>${esc(n)}</b><span>${esc(show)}</span></div></div>`).join('')}</div>`;
}
function rHof(){
  HOFITEMS.length=0;
  if(hofSeg==='home')return rHofHome();
  if(hofSeg==='music'&&(!MU||!MF||!MH)){$('#app').innerHTML='<div class="muted" style="padding:40px;text-align:center">Loading music…</div>';Promise.all([muLoad(),mfLoad(),mhLoad()]).then(()=>{if(route==='hof'&&hofSeg==='music')rHof()});return}
  const H=D.hof,F=H.malFavs;
  const grid=items=>`<div class="hgrid">${items}</div>`;
  const groups=[];
  const G=(id,title,desc,icon,c,src,secs)=>groups.push({id,title,desc,icon,c,src,secs});
  const sec=(id,title,desc,inner,cls)=>({id,title,desc,inner,cls});
  const blogUrl=e=>`https://myanimelist.net/blog.php?eid=${e}`;
  const fil=(arr,re)=>arr.filter(s=>re.test(s[0]));
  const hon=H.blog[0].secs, chr=H.blog[1].secs, wai=H.blog[2].secs;
  if(hofSeg==='anime'){
    G('g-mal','MAL favourites','My official top anime and studios on MyAnimeList.','star','#8a50e0','https://myanimelist.net/profile/SatsugaiDeAtsu',[
      sec('s-mal-a','Top anime','',grid(F.anime.map(([id,t,sub])=>hItem('a'+id+'~'+t,sub)).join(''))),
      sec('s-mal-s','Top studios','',grid(F.company.map(studioTile).join('')))]);
    G('g-hon','Honorary favourites','Shows special to me beyond the top 10, plus my nurturing legacy.','star','#d9a514',blogUrl(804802),
      fil(hon,/anime/i).map(([t,d,it],i)=>sec('s-hon-'+i,t.replace(/^Honorary mentions: /,'Honorary mentions · '),d,grid(it.map(c=>hItem(c)).join('')))));
    const p10=anime.filter(a=>a.sc===10).sort((a,b)=>b.mal-a.mal);
    G('g-a10','Perfect 10s','Every anime I scored 10 out of 10 on MAL.','ten','#8a50e0','',[sec('s-a10','Scored 10','',grid(p10.map(a=>hItem('a'+a.id+'~'+a.t,a.type+(a.y?' · '+a.y:''))).join('')))]);
  }else if(hofSeg==='chars'){
    G('g-malc','MAL favourites','My official top characters and people on MyAnimeList.','star','#8a50e0','https://myanimelist.net/profile/SatsugaiDeAtsu',[
      sec('s-mal-c','Top characters','',grid(F.character.map(([id,t,sub])=>hItem('c'+id+'~'+t,sub)).join(''))),
      sec('s-mal-p','Top people','',grid(F.people.map(([id,t])=>hItem('p'+id+'~'+t)).join('')))]);
    G('g-honc','Honorary favourites','Characters special to me beyond the top 10.','star','#d9a514',blogUrl(804802),
      fil(hon,/character/i).map(([t,d,it],i)=>sec('s-honc-'+i,t.replace(/^Honorary mentions: /,'Honorary mentions · '),d,grid(it.map(c=>hItem(c)).join('')))));
    G('g-chr','Character corner','Parents, battalions, villains, the ones I hate, and the people behind it all.','mask','#24a896',blogUrl(804802),
      chr.map(([t,d,it],i)=>sec('s-chr-'+i,t,d,grid(it.map(c=>hItem(c)).join('')),/hate/i.test(t)?'hated':'')).concat((H.people||[]).map(([t,d,it],i)=>sec('s-ppl-'+i,t,d,grid(it.map(c=>hItem(c)).join(''))))));
  }else if(hofSeg==='waifus'){
    G('g-wai','Waifus','A blog of its own: the goddess, the waifus, the battalion and more.','heart','#d24a7a',blogUrl(804810),
      wai.map(([t,d,it],i)=>sec('s-wai-'+i,t,d,grid(it.map(c=>hItem(c)).join('')))));
  }else if(hofSeg==='music'){
    const segb=(k)=>`<div class="mseg">${[['short_term','Last 4 weeks'],['medium_term','Last 6 months'],['long_term',"Spotify's ranking"],...(MH&&MH.tot?[['hist','All Time']]:[])].map(([r,l])=>`<button data-hms="${k}:${r}" class="${hmS[k]===r?'on':''}">${l}</button>`).join('')}</div>`;
    const note=k=>(MF.notes||{})[k]||'';
    const fs=MFS.filter(([k])=>ED.on||(MF[k]||[]).length);
    if(fs.length)G('g-mfav','Music favourites','The songs and singers I keep coming back to, picked by hand.','heart','#1f9d63','',fs.map(([k,l,kind])=>sec('s-mf-'+k,l,note(k),mfCards(k,kind))));
    if(MU&&MU.top){G('g-mtop','Top artists',"Spotify's ranking mixes how much and how recently I listen. All Time is the real total of hours since 2021.",'star','#1f9d63','',[sec('s-mta','Top artists','',segb('a')+(hmS.a==='hist'?`<div class="martists">${Object.entries(MH.artists).sort((a,b)=>b[1][0]-a[1][0]).slice(0,50).map(([n,v],i)=>{const id=Object.keys(MU.artists).find(k=>MU.artists[k].n===n);return id?mArtTile(id,i).replace('</button>',`<div class="rk">${mhH(v[0])}</div></button>`):`<div class="mart"><div class="pic"><b>${esc(initials(n))}</b></div><div class="nm">${esc(n)}</div><div class="rk">#${i+1} · ${mhH(v[0])}</div></div>`}).join('')}</div>`:`<div class="martists">${(MU.top.artists[hmS.a]||[]).map(mArtTile).join('')}</div>`))]);
      G('g-mts','Top songs',"Spotify's ranking mixes how much and how recently I play. All Time counts real plays since 2021.",'music','#1f9d63','',[sec('s-mts','Top songs','',segb('s')+`<div class="box mcompact">${(hmS.s==='hist'?MH.songs.slice(0,50).map(x=>{mhKnow(x.id);return x.id}):(MU.top.tracks[hmS.s]||[])).map((id,i)=>mRow(id,i)).join('')}</div>`)])}
  }else if(hofSeg==='couples'){
    G('g-cou','Couples','Favourite anime couples, and two special cases.','couple','#e8733a',blogUrl(804809),[
      sec('s-cou','Favourite anime couples','The name says it all.',coupleCards(H.couples)),
      sec('s-cou-sp','A special mention',H.specialCouples.desc,coupleCards(H.specialCouples.pairs))]);
  }else if(hofSeg==='manga'){
    G('g-mmal','MAL favourites','My official top manga on MyAnimeList.','star','#d24a5f','https://myanimelist.net/profile/SatsugaiDeAtsu',[sec('s-mm','Top manga','',grid(F.manga.map(([id,t,sub])=>hItem('m'+id+'~'+t,sub)).join('')))]);
    G('g-mhon','Honorary favourites','Manga special to me like my favs, even outside the top 10.','star','#d9a514',blogUrl(804802),
      fil(hon,/manga/i).map(([t,d,it],i)=>sec('s-mhon-'+i,t.replace(/^Honorary mentions: /,'Honorary mentions · '),d,grid(it.map(c=>hItem(c)).join('')))));
    const p10=manga.filter(m=>m.sc===10).sort((a,b)=>b.mal-a.mal);
    G('g-m10','Perfect 10s','Every manga I scored 10 out of 10.','ten','#d24a5f','',[sec('s-m10','Scored 10','',grid(p10.map(m=>hItem('m'+m.id+'~'+m.t,m.type+(m.y?' · '+m.y:''))).join('')))]);
  }else if(hofSeg==='films'){
    const fc=(t,y)=>{const f=filmByKey[norm(t)+'|'+y];const idx=HOFITEMS.push({film:f||null,t,y})-1;return `<div class="card" data-h="${idx}">${cover(t,f&&f.img||'',f&&f.r?`<span class="badge">${f.r}★</span>`:'')}<div class="meta"><div class="tt">${esc(t)}</div><div class="ss"><span>${y||''}</span><span>${f&&f.lk?'♥':''}</span></div></div></div>`};
    const favF=D.lbFavUris.map(u=>filmUri[u]).filter(Boolean);
    G('g-ftop','Letterboxd top 4','The four films on my Letterboxd profile.','star','#e8733a','https://letterboxd.com/SatsugaiDeAtsu/',[sec('s-ftop','Top 4','',grid(favF.map(f=>fc(f.t,f.y)).join('')))]);
    G('g-flist','My lists','Lists I made on Letterboxd.','films','#e8733a','https://letterboxd.com/SatsugaiDeAtsu/lists/',D.filmLists.map((l,i)=>sec('s-fl'+i,l.name,l.desc,grid(l.items.map(([t,y])=>fc(t,y)).join('')))));
    const five=films.filter(f=>f.r===5);
    G('g-f5','Five stars','Every film I rated ★★★★★.','ten','#e8733a','',[sec('s-f5','Rated five stars','',grid(five.map(f=>fc(f.t,f.y)).join('')))]);
  }else if(hofSeg==='games'){
    const gc=g=>{const idx=HOFITEMS.push({game:g})-1;return `<div class="card" data-h="${idx}">${cover(g.t,g.img||'',gBadge(g)+gDlcStack(g))}<div class="meta"><div class="tt">${esc(g.t)}</div>${gDlcLine(g)}<div class="ss"><span>${esc(g.shelf)}</span></div></div></div>`};
    const favG=D.gvFav.map(n=>games.find(g=>g.t===n)).filter(Boolean);
    G('g-gtop','Favourite games','My favourite games, in order.','star','#8a55e6','',[sec('s-gtop','Favourites','',grid(favG.map(gc).join('')))]);
    G('g-g5','Also rated 5/5','','ten','#8a55e6','',[sec('s-g5','Five out of five','',grid(games.filter(g=>g.r===5&&!D.gvFav.includes(g.t)).map(gc).join('')))]);
    G('g-grv','Games I wrote about','My reviews.','stories','#8a55e6','',[sec('s-grv','Reviewed','',grid(games.filter(g=>g.rv).sort((a,b)=>b.r-a.r).map(gc).join('')))]);
  }else{
    const bc=b=>{const idx=HOFITEMS.push({book:b})-1;return `<div class="card book" data-h="${idx}">${cover(b.t,b.img||'',b.r?`<span class="badge">${b.r}★</span>`:'')}<div class="meta"><div class="tt">${esc(b.t)}</div><div class="ss"><span>${esc(b.a)}</span></div></div></div>`};
    G('g-b5','Five stars','Books I rated 5 out of 5.','ten','#b07a38','',[sec('s-b5','Five stars','',grid(books.filter(b=>b.r>=5).map(bc).join('')))]);
    const shelfNames={childhood:'Childhood',memoire:'Memoire',urdu:'Urdu',spiritual:'Spiritual',philosophy:'Philosophy',psychology:'Psychology'};
    G('g-bsh','My shelves','Shelves I keep.','books','#b07a38','',Object.keys(shelfNames).filter(k=>books.some(b=>b.sh.includes(k))).map(k=>sec('s-bsh-'+k,shelfNames[k],'',grid(books.filter(b=>b.sh.includes(k)).map(bc).join('')))));
  }
  const A=D.hof.about;
  const segs=[['anime','Anime','var(--anime)'],['manga','Manga','var(--manga)'],['films','Films','var(--film)'],['games','Games','var(--game)'],['books','Books','var(--book)'],['music','Music','var(--music)'],['chars','Characters','#24a896'],['waifus','Waifus','#d24a7a'],['couples','Couples','#e8733a']];
  $('#app').innerHTML=`
  ${banner('hof',"Saturn's throne room",'',[[groups.length,'collections'],[groups.reduce((s,g)=>s+g.secs.length,0),'sections']],'Hall of Fame')}
  <section class="box hof-hero" style="grid-template-columns:1fr;padding:16px 20px"><div><p style="margin:0">${esc(A.paras[1])}</p>
    <details style="margin-top:8px"><summary class="link" style="cursor:pointer">Read the full introduction</summary><div style="margin-top:10px">${A.paras.map(p=>`<p>${esc(p)}</p>`).join('')}<a class="link" href="https://myanimelist.net/blog.php?eid=${A.post}" target="_blank" rel="noopener">Continue on MAL ↗</a></div></details></div></section>
  <div class="segtabs"><button data-seg="home" style="--c:var(--gold)">← Hall</button>${segs.map(([k,l,c])=>`<button data-seg="${k}" class="${hofSeg===k?'on':''}" style="--c:${c}">${ico({chars:'mask',waifus:'heart',couples:'couple'}[k]||k)} ${l}</button>`).join('')}</div>
  <div class="jgroups">${groups.map(g=>`<div class="jg" style="--c:${g.c}"><span class="jl" data-j="${g.id}">${ico(g.icon)}${esc(g.title)}</span>${g.secs.length>1?g.secs.map(s=>`<a href="#hof" data-j="${s.id}">${esc(s.title)}</a>`).join(''):''}</div>`).join('')}</div>
  ${groups.map(g=>`<div class="grp" id="${g.id}" style="--c:${g.c}">${artBg(g.c,g.title.length*7,'')}<div class="gi">${ico(g.icon)}</div><div><h2>${esc(g.title)}</h2>${g.desc?`<p>${esc(g.desc)}</p>`:''}</div>${g.src?`<a href="${g.src}" target="_blank" rel="noopener">Source ↗</a>`:''}</div>
    ${g.secs.map(s=>`<section class="box hsec ${s.cls||''}" id="${s.id}" style="--c:${/hate/i.test(s.title)?'var(--s4)':g.c}"><div class="box-h"><h2>${esc(s.title)}</h2></div>${s.desc?`<div class="desc">${esc(s.desc)}</div>`:''}<div class="box-b">${s.inner}</div></section>`).join('')}`).join('')}`;
  document.querySelectorAll('[data-seg]').forEach(b=>b.onclick=()=>{hofSeg=b.dataset.seg;rHof();window.scrollTo(0,0)});
  if(hofSeg==='music'){mfBind();document.querySelectorAll('[data-hms]').forEach(b=>b.onclick=()=>{const [k,r]=b.dataset.hms.split(':');hmS[k]=r;const y=scrollY;rHof();scrollTo(0,y)})}
  document.querySelectorAll('[data-j]').forEach(a=>a.onclick=e=>{e.preventDefault();const el=document.getElementById(a.dataset.j);if(el)el.scrollIntoView({behavior:'smooth'})});
  document.querySelectorAll('[data-st]').forEach(el=>el.onclick=()=>openStudio(F.company[+el.dataset.st]));
  document.querySelectorAll('[data-h]').forEach(el=>el.onclick=()=>{const it=HOFITEMS[+el.dataset.h];
    if('film' in it){if(it.film)return openFilm(it.film);return window.open('https://letterboxd.com/search/films/'+encodeURIComponent(it.t)+'/','_blank')}
    if(it.game)return openGame(it.game);
    if(it.book)return openBook(it.book);
    if(it.own)return it.k==='a'?openAnime(it.own):openManga(it.own);
    openMal(it)});
}
let tileT=null;
const BIG=u=>u&&/cdn\.myanimelist\.net\/images\/(anime|manga)\/\d+\/\d+\.jpg$/.test(u)?u.replace(/\.jpg$/,'l.jpg'):u;
function hofTiles(){
  const H=D.hof,F=H.malFavs;const ci=c=>{const [kid,,pic]=c.split('~');return pic||HIMG(kid[0],+kid.slice(1))};
  const imgsA=[...F.anime.map(([id])=>{const a=anime.find(x=>x.id===id);return a?a.img:HIMG('a',id)}),...anime.filter(a=>a.sc===10).map(a=>a.img)];
  const imgsM=[...F.manga.map(([id])=>{const m=manga.find(x=>x.id===id);return m?m.img:HIMG('m',id)}),...manga.filter(m=>m.sc===10).map(m=>m.img)];
  const favF=D.lbFavUris.map(u=>filmUri[u]).filter(Boolean);
  const imgsF=[...favF,...films.filter(f=>f.r===5)].map(f=>f.img);
  const imgsG=games.filter(g=>g.r===5||D.gvFav.includes(g.t)).map(g=>g.img);
  const imgsB=books.filter(b=>b.r>=5).map(b=>b.img);
  const imgsC=[...F.character.map(([id])=>HIMG('c',id)),...H.blog[0].secs.filter(s=>/character/i.test(s[0])).flatMap(s=>s[2].map(ci)),...H.blog[1].secs.flatMap(s=>s[2].map(ci))];
  const imgsW=H.blog[2].secs.flatMap(s=>s[2].map(ci));
  const imgsCo=H.couples.flatMap(c=>c[2].map(ci));
  return [
    ['anime','Anime','var(--anime)','anime',imgsA,`${F.anime.length} favourites · ${anime.filter(a=>a.sc===10).length} perfect 10s`],
    ['manga','Manga','var(--manga)','manga',imgsM,`${F.manga.length} favourites · ${manga.filter(m=>m.sc===10).length} perfect 10s`],
    ['chars','Characters and People','#24a896','mask',imgsC,`Top 10, honorary and character corner`],
    ['waifus','Waifus','#d24a7a','heart',imgsW,`${H.blog[2].secs.length} sections`],
    ['couples','Couples','#e8733a','couple',imgsCo,`${H.couples.length} couples`],
    ['films','Films','var(--film)','films',imgsF,`Top 4 · ${D.filmLists.length} lists · ${films.filter(f=>f.r===5).length} five stars`],
    ['games','Games','var(--game)','games',imgsG,`${D.gvFav.length} favourites`],
    ['books','Books','var(--book)','books',imgsB,`${books.filter(b=>b.r>=5).length} five stars`],
    ['music','Music','var(--music)','music',(D.musicSum&&D.musicSum.pics)||[],'Favourite songs and singers, top artists and songs']
  ].map(([k,l,c,ic,imgs,sub])=>({k,l,c,ic,imgs:[...new Set(imgs.filter(Boolean).map(BIG))].map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]).slice(0,12),sub}));
}
function rHofHome(){
  const A=D.hof.about;const T=hofTiles();
  $('#app').innerHTML=`${banner('hof',"Saturn's throne room",'Pick a wing.',[],'Hall of Fame')}
  <section class="box hof-hero" style="grid-template-columns:1fr;padding:16px 20px"><div><p style="margin:0">${esc(A.paras[1])}</p>
    <details style="margin-top:8px"><summary class="link" style="cursor:pointer">Read the full introduction</summary><div style="margin-top:10px">${A.paras.map(p=>`<p>${esc(p)}</p>`).join('')}<a class="link" href="https://myanimelist.net/blog.php?eid=${A.post}" target="_blank" rel="noopener">Continue on MAL ↗</a></div></details></div></section>
  ${spotlight()}
  <div class="htiles">${T.map((x,i)=>`<button class="htile" data-wing="${x.k}" style="--c:${x.c}"><div class="hbg">${x.imgs.slice(0,2).map((im,j)=>`<img class="${j?'':'on'}" src="${esc(LOC(im))}" alt="" referrerpolicy="no-referrer">`).join('')||artBg(HEX.hof,i*9,'')}</div><div class="hshade"></div><div class="hlab"><span class="hic">${ico(x.ic)}</span><b>${esc(x.l)}</b><small>${esc(x.sub)}</small></div></button>`).join('')}</div>`;
  document.querySelectorAll('[data-wing]').forEach(b=>b.onclick=()=>{hofSeg=b.dataset.wing;rHof();window.scrollTo(0,0)});
  startSpot();
  clearInterval(tileT);let step=1;
  tileT=setInterval(()=>{if(route!=='hof'||hofSeg!=='home')return clearInterval(tileT);
    document.querySelectorAll('.htile').forEach((el,i)=>{const L=T[i].imgs;if(L.length<2)return;if((step+i)%3)return;const imgs=el.querySelectorAll('.hbg img');const cur=[...imgs].find(im=>im.classList.contains('on'));const other=[...imgs].find(im=>im!==cur);
      const idx=(+(el.dataset.idx||1)+1)%L.length;el.dataset.idx=idx;other.src=LOC(L[idx]);other.onload=()=>{cur.classList.remove('on');other.classList.add('on')}});step++},1400);
}
let spotI=0,spotT=null;
let SPOT=null;
function spotList(){
  if(SPOT)return SPOT;const H=D.hof,P=[];const add=(code,label)=>{const [kid,nm,pic]=code.split('~');const k=kid[0],id=+kid.slice(1);P.push({k,id,t:nm,img:pic||HIMG(k,id),label})};
  (H.malFavs.character||[]).forEach(([id,t,sub])=>P.push({k:'c',id,t,img:HIMG('c',id),label:'Top 10 characters on MAL',sub}));
  (H.malFavs.people||[]).forEach(([id,t])=>P.push({k:'p',id,t,img:HIMG('p',id),label:'Top 10 people on MAL'}));
  (H.blog[0].secs||[]).forEach(([s,d,it])=>it.forEach(c=>add(c,'Honorary favourites · '+s)));
  (H.blog[1].secs||[]).forEach(([s,d,it])=>it.forEach(c=>add(c,'Character corner · '+s)));
  anime.filter(a=>a.sc===10&&a.img).forEach(a=>P.push({own:a,k:'a',id:a.id,t:a.t,img:a.img,label:'Anime · scored 10',note:a.tags}));
  manga.filter(m=>m.sc===10&&m.img).forEach(m=>P.push({own:m,k:'m',id:m.id,t:m.t,img:m.img,label:'Manga · scored 10',note:m.tags}));
  films.filter(f=>f.r===5&&f.img).forEach(f=>P.push({film:f,t:f.t,img:f.img,label:'Film · five stars',note:f.rv}));
  books.filter(b=>b.r>=5&&b.img).forEach(b=>P.push({book:b,t:b.t,img:b.img,label:'Book · five stars',note:b.rv}));
  games.filter(g=>g.r===5).forEach(g=>P.push({game:g,t:g.t,img:g.img||'',label:'Game · 5/5',note:g.rv}));
  const seen=new Set();SPOT=P.filter(x=>{const key=(x.k||'')+(x.id||x.t);if(seen.has(key)||!x.img)return false;seen.add(key);return true}).map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]).slice(0,30);
  return SPOT;
}
function spotlight(){const L=spotList();if(!L.length)return'';const c=L[spotI%L.length];
  const href=c.k&&!c.own?`https://myanimelist.net/${MALK[c.k]}/${c.id}`:'';
  return `<section class="box spot" id="spot">${c.img?`<div class="blur" style="background-image:url('${esc(LOC(c.img))}')"></div>`:''}<div class="pic">${c.img?`<img src="${esc(BIG(LOC(c.img)))}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${esc(c.img)}'">`:cover(c.t,'')}</div><div><div class="kick small" style="text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--gold)">Spotlight · ${esc(c.label)}</div><h2>${esc(c.t)}</h2>${c.sub?`<div class="muted">${esc(c.sub)}</div>`:''}${c.note?`<p class="spotnote">${esc(c.note.length>220?c.note.slice(0,220)+'…':c.note)}</p>`:''}<div class="dots">${L.map((_,i)=>`<button aria-label="Show ${esc(L[i].t)}" data-spot="${i}" class="${i===spotI%L.length?'on':''}"></button>`).join('')}</div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" id="spotopen">Open</button><button class="btn" id="spotnext">Next →</button>${href?`<a class="btn" href="${href}" target="_blank" rel="noopener">MAL ↗</a>`:''}</div></div></section>`}
function startSpot(){clearInterval(spotT);const bind=()=>{document.querySelectorAll('[data-spot]').forEach(b=>b.onclick=()=>{spotI=+b.dataset.spot;swap();startSpot()});
    const L=spotList(),c=L[spotI%L.length];const o=$('#spotopen');if(o)o.onclick=()=>{if(c.own)return c.k==='a'?openAnime(c.own):openManga(c.own);if(c.film)return openFilm(c.film);if(c.book)return openBook(c.book);if(c.game)return openGame(c.game);openMal({k:c.k,id:c.id,name:c.t})};
    const n=$('#spotnext');if(n)n.onclick=()=>{spotI++;swap();startSpot()}};
  const swap=()=>{const el=$('#spot');if(!el)return clearInterval(spotT);const tmp=document.createElement('div');tmp.innerHTML=spotlight();el.replaceWith(tmp.firstElementChild);bind()};
  bind();spotT=setInterval(()=>{if(route!=='hof')return clearInterval(spotT);spotI++;swap()},6000)}
function studioTile(c,i){
  if(!Array.isArray(c))c=[0,c,''];const s=(D.studios||{})[c[0]]||{},pic=s.loc||s.img||c[2];
  return `<div class="card stile" data-st="${i}"><div class="slogo">${pic?`<img data-src="${esc(pic)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:`<b>${esc(initials(c[1]))}</b>`}</div><div class="meta"><div class="tt">${esc(c[1])}</div><div class="ss"><span>${s.est?'Est. '+esc(s.est.slice(-4)):'Studio'}</span></div></div></div>`;
}
function openStudio(c){
  if(!Array.isArray(c))c=[0,c,''];const s=(D.studios||{})[c[0]]||{},pic=s.loc||s.img||c[2];
  modal('anime','Studio',`<div class="slogo big">${pic?`<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">`:''}</div><div><h2>${esc(c[1])}</h2>${s.jp?`<div class="muted">${esc(s.jp)}</div>`:''}
  <div class="bigscore">${s.fav?`<div><b>${fmt(s.fav)}</b><small>MAL favourites</small></div>`:''}${s.est?`<div><b>${esc(s.est.slice(-4))}</b><small>Established</small></div>`:''}${(()=>{const n=anime.filter(a=>((_MD||{a:{}}).a[a.id]||{}).stu&&_MD.a[a.id].stu.includes(c[1])).length;return n?`<div><b>${n}</b><small>In your list</small></div>`:''})()}</div>
  ${s.est?`<div class="kv"><div>Established</div><div>${esc(s.est)}</div></div>`:''}
  ${s.about?`<div class="review" style="--c:var(--anime)">${esc(s.about)}</div>`:''}
  <div style="margin-top:14px">${c[0]?`<a class="btn pri" href="https://myanimelist.net/anime/producer/${c[0]}" target="_blank" rel="noopener">Studio page on MyAnimeList ↗</a>`:''}</div></div>`);
}
const bdAge=bd=>{if(!bd||!/\d{4}/.test(bd))return 0;const d=new Date(bd);if(isNaN(d))return 0;const n=new Date();let a=n.getFullYear()-d.getFullYear();if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;return a>0&&a<120?a:0};
async function openPerson(it){
  if(!D.peopleInfo){try{D.peopleInfo=await fetch('data/people_info.json',{cache:'no-cache'}).then(r=>r.json())}catch(e){D.peopleInfo={p:{},s:{}}}}
  const p=(D.peopleInfo.p||{})[it.id];
  if(!p){modal('anime','Person',`${cover(it.name,it.pic||HIMG('p',it.id))}<div><h2>${esc(it.name)}</h2><div class="muted">Their details arrive with the next update.</div><div style="margin-top:14px"><a class="btn pri" href="https://myanimelist.net/people/${it.id}" target="_blank" rel="noopener">Open on MyAnimeList ↗</a></div></div>`);return}
  const age=bdAge(p.bd),L=p.labels||[];
  const an=(id,t)=>{const o=anime.find(a=>a.id===id);return o?o.t:t};
  modal('anime','Person',`${cover(p.name||it.name,it.pic||HIMG('p',it.id)||p.img)}<div><h2>${esc(p.name||it.name)}</h2>${p.jp?`<div class="muted">${esc(p.jp)}</div>`:''}
  <div class="plabels">${L.map(l=>`<span class="plab">${esc(l)}</span>`).join('')}</div>
  <div class="bigscore">${p.fav?`<div><b>${fmt(p.fav)}</b><small>MAL favourites</small></div>`:''}${age?`<div><b>${age}</b><small>Years old</small></div>`:''}${p.nva?`<div><b>${fmt(p.nva)}</b><small>Characters voiced</small></div>`:''}${p.nworks?`<div><b>${fmt(p.nworks)}</b><small>Published works</small></div>`:''}</div>
  <div class="kv"><div>Known as</div><div>${esc(L.join(', ')||'–')}</div>${p.bd?`<div>Birthday</div><div>${esc(p.bd)}${age?` (${age})`:''}</div>`:''}${p.alt?`<div>Other names</div><div>${esc(p.alt)}</div>`:''}${(p.facts||[]).map(([k,v])=>`<div>${esc(k)}</div><div>${esc(v)}</div>`).join('')}${p.nmain?`<div>Main roles</div><div>${fmt(p.nmain)}</div>`:''}</div>
  ${p.va&&p.va.length?`<div class="sect" style="--c:var(--anime);margin-top:14px"><h2><i></i>Most loved characters</h2><div class="pgrid">${p.va.map((c,i)=>`<button type="button" class="ptile" data-pc="${i}">${cover(c[1],c[2],'','')}<span class="pn">${esc(c[1])}</span><span class="ps">${esc(an(c[3],c[4]))}</span></button>`).join('')}</div></div>`:''}
  ${p.works&&p.works.length?`<div class="sect" style="--c:var(--manga);margin-top:14px"><h2><i></i>Best known works</h2><div class="pgrid">${p.works.map((w,i)=>{const o=manga.find(m=>m.id===w[0]);return `<button type="button" class="ptile" data-pw="${i}">${cover(o?o.t:w[1],o?o.img:w[2],o&&o.sc?`<span class="badge">${o.sc}</span>`:'','')}<span class="pn">${esc(o?o.t:w[1])}</span><span class="ps">${esc((w[3]||'').split(',')[0])}${w[5]?' · '+esc(w[5]):''}</span></button>`}).join('')}</div></div>`:''}
  ${!p.works&&!p.va&&p.staff&&p.staff.length?`<div class="sect" style="--c:var(--anime);margin-top:14px"><h2><i></i>Anime work</h2><div class="kv" style="margin-top:0">${p.staff.map(x=>`<div>${esc(x[2])}</div><div>${esc(an(x[0],x[1]))}</div>`).join('')}</div></div>`:''}
  ${p.about?`<div class="review" style="--c:var(--anime)">${esc(p.about)}</div>`:''}
  <div style="margin-top:14px"><a class="btn pri" href="https://myanimelist.net/people/${it.id}" target="_blank" rel="noopener">Full profile on MyAnimeList ↗</a></div></div>`);
  document.querySelectorAll('[data-pc]').forEach(b=>b.onclick=()=>{const c=p.va[+b.dataset.pc];openMal({k:'c',id:c[0],name:c[1],pic:c[2]})});
  document.querySelectorAll('[data-pw]').forEach(b=>b.onclick=()=>{const w=p.works[+b.dataset.pw];const o=manga.find(m=>m.id===w[0]);if(o)return openManga(o);openExt('manga',{malId:w[0],t:w[1],img:w[2],meta:[(w[3]||''),w[4]?fmt(w[4])+' members':''].filter(Boolean).join(' · '),url:'https://myanimelist.net/manga/'+w[0]})});
}
async function openMal(it){
  if(it.k==='p')return openPerson(it);
  if(it.k==='c'&&!D.charInfo){try{D.charInfo=await fetch('data/char_info.json',{cache:'no-cache'}).then(r=>r.json())}catch(e){D.charInfo={}}}
  const ci=it.k==='c'?(D.charInfo||{})[it.id]:null;
  if(ci){
    const link=(k,x)=>{const own=(k==='anime'?anime:manga).find(o=>o.id===x[0]);return `<a class="tag link" href="${own?'#':'https://myanimelist.net/'+k+'/'+x[0]}" ${own?`data-own="${k}:${x[0]}"`:'target="_blank" rel="noopener"'}>${esc(own?own.t:x[1])}${x[2]&&x[2]!=='Main'?` <span class="muted">· ${esc(x[2])}</span>`:''}</a>`};
    modal('anime','Character',`${cover(it.name,it.pic||HIMG(it.k,it.id))}<div><h2>${esc(ci.name||it.name)}</h2>${ci.jp?`<div class="muted">${esc(ci.jp)}</div>`:''}
    ${ci.fav?`<div class="bigscore"><div><b>${fmt(ci.fav)}</b><small>MAL favourites</small></div></div>`:''}
    <div class="kv">${(ci.facts||[]).map(([k,v])=>`<div>${esc(k)}</div><div>${esc(v)}</div>`).join('')}
    ${ci.anime&&ci.anime.length?`<div>Anime</div><div>${ci.anime.slice(0,6).map(x=>link('anime',x)).join('')}</div>`:''}
    ${ci.manga&&ci.manga.length?`<div>Manga</div><div>${ci.manga.slice(0,4).map(x=>link('manga',x)).join('')}</div>`:''}
    ${ci.va&&ci.va.length?`<div>Voiced by</div><div>${ci.va.map(v=>`<a class="tag link" href="https://myanimelist.net/people/${v[0]}" target="_blank" rel="noopener">${esc(v[1])} <span class="muted">· ${esc(v[2])}</span></a>`).join('')}</div>`:''}</div>
    ${ci.about?`<div class="review" style="--c:var(--anime)">${esc(ci.about)}</div>`:''}
    <div style="margin-top:14px"><a class="btn pri" href="https://myanimelist.net/character/${it.id}" target="_blank" rel="noopener">Full profile on MyAnimeList ↗</a></div></div>`);
    document.querySelectorAll('[data-own]').forEach(a=>a.onclick=e=>{e.preventDefault();const [k,id]=a.dataset.own.split(':');const o=(k==='anime'?anime:manga).find(x=>x.id===+id);if(o)(k==='anime'?openAnime:openManga)(o)});
    return;
  }
  modal(it.k==='m'?'manga':'anime',KLAB[it.k],`${cover(it.name,it.pic||HIMG(it.k,it.id))}<div><h2>${esc(it.name)}</h2><div class="muted">${esc(KLAB[it.k])} on MyAnimeList</div>
  <div style="margin-top:14px"><a class="btn pri" href="https://myanimelist.net/${MALK[it.k]}/${it.id}" target="_blank" rel="noopener">Open on MyAnimeList ↗</a></div></div>`);
}

