/* ---------- modal ---------- */
function modal(k,label,inner){
  $('#modal').innerHTML=`<div class="mh" style="border-bottom:3px solid ${MED[k].c}"><span><i style="width:8px;height:8px;background:${MED[k].c};display:inline-block"></i>${esc(label)}</span><button id="mx" aria-label="Close">✕</button></div><div class="mb">${inner}</div>`;
  $('#ov').classList.add('show');$('#mx').onclick=closeM;
  if(__sh){const sh=__sh;__sh=null;const b=document.createElement('button');b.id='m_share';b.type='button';b.className='mhshare';b.title='Share';b.setAttribute('aria-label','Share');b.innerHTML=$('#sharebtn').innerHTML;b.onclick=()=>shareLink(sh.u,sh.t);$('#modal .mh').insertBefore(b,$('#mx'))}
  const me=$('#m_edit'),bs=$('#modal .bigscore');
  if(me&&bs){const btn=document.createElement('button');btn.type='button';btn.id='m_edit';btn.className='bsedit';btn.innerHTML='<b>✎</b><small>Edit</small>';btn.title='Edit';me.replaceWith(document.createComment(''));
    const st=[...bs.children].find(d=>{const b=d.querySelector('b');return b&&b.textContent==='■'});if(st)st.after(btn);else bs.appendChild(btn)}
  else if(me){me.classList.add('mhedit');$('#modal .mh').insertBefore(me,$('#mx'))}
}
function closeM(){$('#ov').classList.remove('show');__sh=null;if((location.hash||'').startsWith('#item/'))history.replaceState(null,'','#'+route)}
$('#ov').onclick=e=>{if(e.target.id==='ov')closeM()};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeM()});

/* ---------- search ---------- */
$('#gform').onsubmit=e=>{e.preventDefault();const q=$('#gq').value.trim();if(!q)return;state.search.q=q;state.search.res={};if(location.hash!=='#search')location.hash='search';else render()};
function localHits(q){
  const n=norm(q);if(!n)return{anime:[],manga:[],films:[],games:[],books:[],stories:[]};
  const words=n.split(' ');
  const m=s=>words.every(w=>s.includes(w));
  return{hofp:hofPeople().filter(p=>m(p.n)),anime:anime.filter(a=>m(a.n)),manga:manga.filter(x=>m(x.n)),films:films.concat(seriesOwn).filter(f=>m(f.n)),games:games.filter(g=>m(g.n)),books:books.filter(b=>m(b.n)),stories:[...works,...mediumOnly(),...(DR?DR.works:[])].filter(w=>m(norm(w.t+' '+(w.tags||[]).join(' ')+' '+(w.blurb||'')+' '+wKind(w))))};
}
let HOFP=null;
function hofPeople(){if(HOFP)return HOFP;const out=[],seen=new Set(),H=D.hof||{},F=H.malFavs||{};
  const add=(k,id,name,pic)=>{if(seen.has(k+id))return;seen.add(k+id);out.push({k,id:+id,name,pic:pic||HIMG(k,+id),sub:(D.hofSub||{})[k+id]||KLAB[k],n:norm(name+' '+((D.hofSub||{})[k+id]||''))})};
  (F.character||[]).forEach(([id,t])=>add('c',id,t));(F.people||[]).forEach(([id,t])=>add('p',id,t));
  JSON.stringify(H).replace(/"([cp])(\d+)~([^~"]+)(?:~([^"]*))?"/g,(_,k,id,nm,pic)=>{add(k,id,nm,pic);return ''});
  return HOFP=out}
function ownMatch(kind,title,year){
  const n=norm(title);
  if(kind==='anime')return anime.find(a=>norm(a.t)===n||(a.alt&&norm(a.alt)===n));
  if(kind==='films')return films.find(f=>f.n===n&&(!year||!f.y||Math.abs(f.y-year)<=1));
  if(kind==='games')return games.find(g=>norm(g.t)===n);
  if(kind==='manga')return manga.find(x=>norm(x.t)===n||(x.alt&&norm(x.alt)===n));
  if(kind==='books')return books.find(b=>norm(b.t)===n||norm(b.t).startsWith(n+' '));
}
function rSearch(){
  const S=state.search;
  $('#gq').value=S.q;
  if(!S.q){$('#app').innerHTML=`${banner('search','Search everything','Your collection, plus the whole catalog of anime, manga, films, series, games, books, characters and people.',[],'Search')}<div class="box box-b"><p style="margin-bottom:10px">Search your own collection, and the whole catalog of anime, manga, films, series, games, books, characters and people.</p><form id="sform" style="display:flex;gap:0"><input id="sq" type="search" placeholder="Try “Vinland Saga”, “Inception” or “Elden Ring”" style="flex:1;border:1px solid var(--line2);padding:10px 12px;background:var(--panel);outline:none"><button class="btn pri" style="border-radius:0">Search</button></form></div>`;
    $('#sform').onsubmit=e=>{e.preventDefault();const q=$('#sq').value.trim();if(q){S.q=q;S.res={};render()}};$('#sq').focus();return}
  const L=localHits(S.q);
  const tot=L.hofp.length+L.anime.length+L.manga.length+L.films.length+L.games.length+L.books.length+L.stories.length;
  const sec=(k,items,mk)=>items.length?`<div class="sect" style="--c:${MED[k].c}"><h2><i></i>${MED[k].name} <span class="muted mono">${items.length}</span></h2><div class="cgrid" style="margin-top:0">${items.slice(0,12).map(mk).join('')}</div></div>`:'';
  window.__L=L;
  $('#app').innerHTML=`${banner('search','“'+S.q+'”','',[[tot,'in your collection']],'Search')}
  <div class="box"><div class="box-h"><h2>In your collection</h2></div><div class="box-b" style="padding-top:0">
  ${tot?'':'<div class="muted" style="padding-top:14px">Nothing in your lists matches that.</div>'}
  ${sec('hofp',L.hofp,(p,i)=>`<div class="card" data-hp="${i}">${cover(p.name,p.pic)}<div class="meta"><div class="tt">${esc(p.name)}</div><div class="ss"><span>${esc(p.sub)}</span></div></div></div>`)}
  ${sec('anime',L.anime,(a,i)=>`<div class="card" data-l="anime:${i}">${cover(a.t,a.img,(a.sc?`<span class="badge">${a.sc}</span>`:'')+`<span class="sline" style="--sc:${AST[a.st][1]}"></span>`)}<div class="meta"><div class="tt">${esc(a.t)}</div><div class="ss"><span>${AST[a.st][0]}</span></div></div></div>`)}
  ${sec('manga',L.manga,(x,i)=>`<div class="card" data-l="manga:${i}">${cover(x.t,x.img,(x.sc?`<span class="badge">${x.sc}</span>`:'')+`<span class="sline" style="--sc:${MST[x.st][1]}"></span>`)}<div class="meta"><div class="tt">${esc(x.t)}</div><div class="ss"><span>${MST[x.st][0]}</span></div></div></div>`)}
  ${sec('books',L.books,(b,i)=>`<div class="card" data-l="books:${i}">${cover(b.t,b.img||'',b.r?`<span class="badge">${b.r}★</span>`:'')}<div class="meta"><div class="tt">${esc(b.t)}</div><div class="ss"><span>${esc(b.a)}</span></div></div></div>`)}
  ${sec('films',L.films,(f,i)=>`<div class="card" data-l="films:${i}">${cover(f.t,f.img||f.tvimg||'',f.r?`<span class="badge">${f.r}★</span>`:'')}<div class="meta"><div class="tt">${esc(f.t)}</div><div class="ss"><span>${f.tv?'Series':f.y}</span><span>${f.tv?SST[f.sst||'w'][0]:f.s==='l'?'Watchlist':'Watched'}</span></div></div></div>`)}
  ${sec('games',L.games,(g,i)=>`<div class="card" data-l="games:${i}">${cover(g.t,g.img||'',gBadge(g)+gDlcStack(g))}<div class="meta"><div class="tt">${esc(g.t)}</div>${gDlcLine(g)}<div class="ss"><span>${esc(g.shelf)}</span></div></div></div>`)}
  ${L.stories.length?`<div class="sect" style="--c:var(--story)"><h2><i></i>Writing <span class="muted mono">${L.stories.length}</span></h2><div class="cgrid" style="margin-top:0">${L.stories.slice(0,12).map(w=>`<div class="card" data-wr="${esc(w.id)}">${wcover(w)}<div class="meta"><div class="tt">${esc(w.t)}</div><div class="ss"><span>${esc(wKind(w))}</span><span>${wMin(w)} min</span></div></div></div>`).join('')}</div></div>`:''}
  </div></div>
  <div id="s_mus"></div>
  <div class="box" style="margin-top:16px"><div class="box-h"><h2>Search everywhere</h2><span class="small muted" id="xmode"></span></div>
  <div class="tabs" style="border:0;border-bottom:1px solid var(--line)">${['anime','manga','films','games','books','characters','people','artists'].map(k=>`<button data-x="${k}" class="${S.ext===k?'on':''}" style="--c:${MED[k].c}">${k==='films'?'Films & series':MED[k].name}</button>`).join('')}</div>
  <div class="box-b" id="xbody"></div>
  <div class="small muted srccred">Where results come from: anime and manga from MyAnimeList; characters and people from MyAnimeList through Jikan; films and series from TMDB (The Movie Database); games from IGDB; books from Goodreads, Google Books or Open Library. Your own collection comes from MyAnimeList, Letterboxd, Medium and this site.</div></div>`;
  document.querySelectorAll('[data-wr]').forEach(el=>el.onclick=()=>openWork(L.stories.find(x=>x.id===el.dataset.wr)));
  document.querySelectorAll('[data-hp]').forEach(el=>el.onclick=()=>{const p=L.hofp[+el.dataset.hp];openMal({k:p.k,id:p.id,name:p.name,pic:p.pic})});
  document.querySelectorAll('[data-l]').forEach(el=>el.onclick=()=>{const [k,i]=el.dataset.l.split(':');const x=L[k][+i];({anime:openAnime,manga:openManga,books:openBook,films:openFilm,games:openGame})[k](x)});
  document.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>{S.ext=b.dataset.x;document.querySelectorAll('[data-x]').forEach(x=>x.classList.toggle('on',x===b));extSearch()});
  extSearch();
  muLoad().then(()=>{const el=$('#s_mus');if(!el||!MU||!MU.artists)return;const W=norm(S.q).split(' ').filter(Boolean);const m=s=>W.every(w=>norm(s).includes(w));
    const A=Object.entries(MU.artists).filter(([,a])=>m(a.n)).slice(0,12),T=Object.entries(MU.tracks).filter(([,t])=>m(t.n)).slice(0,8);
    if(!A.length&&!T.length)return;
    el.innerHTML=`<div class="box" style="margin-top:16px"><div class="box-h" style="border-top:3px solid var(--music)"><h2>In your music</h2></div><div class="box-b">${A.length?`<div class="martists" style="margin-top:0">${A.map(([id])=>mArtTile(id)).join('')}</div>`:''}${T.length?`<div class="mcompact" style="margin-top:12px">${T.map(([id],i)=>mRow(id,i)).join('')}</div>`:''}</div></div>`;mBind(el)});
}

/* external search: direct APIs when the page can reach them, Claude otherwise */
let mode=null; // 'api' | 'claude' | 'none'
let sampleFn=null;
async function detectMode(){
  if(mode)return mode;
  if(!/claude\.(ai|site)|claudeusercontent/.test(location.hostname)){mode='api';return mode}
  try{if(window.claude&&window.claude.use){sampleFn=await window.claude.use('sample');}}catch(e){}
  mode=sampleFn?'claude':'none';return mode;
}
const OUT={manga:q=>`https://myanimelist.net/manga.php?q=${encodeURIComponent(q)}`,books:q=>`https://www.goodreads.com/search?q=${encodeURIComponent(q)}`,anime:q=>`https://myanimelist.net/anime.php?q=${encodeURIComponent(q)}`,films:q=>`https://letterboxd.com/search/films/${encodeURIComponent(q)}/`,games:q=>`https://howlongtobeat.com/?q=${encodeURIComponent(q)}`};
const OUTN={manga:'MyAnimeList',books:'Goodreads',anime:'MyAnimeList',films:'Letterboxd',games:'HowLongToBeat',characters:'MyAnimeList',people:'MyAnimeList'};
OUT.artists=q=>`https://open.spotify.com/search/${encodeURIComponent(q)}/artists`;OUTN.artists='Spotify';OUT.characters=q=>`https://myanimelist.net/character.php?q=${encodeURIComponent(q)}`;OUT.people=q=>`https://myanimelist.net/people.php?q=${encodeURIComponent(q)}`;
const lev=(a,b)=>{if(Math.abs(a.length-b.length)>2)return 9;const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]};
/* keep results that actually contain what was typed (a small typo is fine), so loose matches don't drown the real ones */
const closeTo=(q,r)=>{const W=norm(q).split(' ').filter(w=>w.length>1);if(!W.length)return true;const T=norm([r.t,r.alt,r.a].filter(Boolean).join(' ')).split(' ');
  return W.every(w=>T.some(x=>x===w||x.startsWith(w)||(w.length>=4&&x.length>=4&&lev(w,x)<=(w.length>=7?2:1))))};
const SRC={anime:'MyAnimeList',manga:'MyAnimeList',films:'TMDB',games:'IGDB',books:'Goodreads',characters:'MyAnimeList (through Jikan)',people:'MyAnimeList (through Jikan)',artists:'Spotify'};
/* AniList: only a backup for search when MAL is down. Titles, covers, episodes and genres; never AniList's scores or favourites */
async function anilistSearch(kind,q){
  const Q=`query($s:String){Page(perPage:16){media(search:$s,type:${kind==='anime'?'ANIME':'MANGA'},isAdult:false){idMal title{romaji english} format episodes chapters volumes startDate{year} coverImage{large} genres description(asHtml:false)}}}`;
  const j=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:Q,variables:{s:q}})}).then(r=>r.json());
  return (((j.data||{}).Page||{}).media||[]).filter(m=>m.idMal).map(m=>({malId:m.idMal,t:m.title.english||m.title.romaji,alt:m.title.english&&m.title.english!==m.title.romaji?m.title.romaji:'',y:(m.startDate||{}).year||'',
    meta:[(m.format||'').replace('_',' '),m.episodes?m.episodes+' eps':'',m.chapters?m.chapters+' ch':'','details via AniList'].filter(Boolean).join(' · '),sum:(m.description||'').replace(/<[^>]+>/g,'').slice(0,600),img:(m.coverImage||{}).large||'',url:`https://myanimelist.net/${kind}/${m.idMal}`,g:m.genres||[],n:m.episodes||m.chapters||0,v:m.volumes||0,al:1}))}
async function viaApi(kind,q){
  if(kind==='artists')return (await spSearch('artist',q)).map(a=>({spId:a.id,t:a.t,img:a.img,y:'',meta:'Artist',sum:''}));
  if((kind==='anime'||kind==='manga')&&SET.workerUrl){
    // MAL's search sometimes fails for a moment: try up to 4 times before giving up
    let r=null,err=null;
    for(let i=0;i<4;i++){
      try{const res=await fetch(`${SET.workerUrl}/search?type=${kind}&q=${encodeURIComponent(q)}${i?'&_='+i:''}`,{cache:'no-store'});const j=await res.json();if(res.ok&&j&&Array.isArray(j.data)){r=j;break}err=new Error((j&&(j.message||j.error))||('MAL said '+res.status))}catch(e){err=e}
      await new Promise(ok=>setTimeout(ok,[600,1200,2500][i]||0));
    }
    if(!r){const al=await anilistSearch(kind,q).catch(()=>null);if(al&&al.length)return al;throw err||new Error('MAL search failed')}
    return (r.data||[]).map(({node:n})=>({malId:n.id,t:(n.alternative_titles&&n.alternative_titles.en)||n.title,alt:(n.alternative_titles&&n.alternative_titles.en&&n.alternative_titles.en!==n.title)?n.title:'',y:(n.start_season&&n.start_season.year)||(n.start_date||'').slice(0,4),meta:[(n.media_type||'').toUpperCase().replace('_',' '),n.num_episodes?n.num_episodes+' eps':'',n.num_chapters?n.num_chapters+' ch':'',n.mean?'MAL '+n.mean:''].filter(Boolean).join(' · '),sum:n.synopsis||'',img:n.main_picture&&(n.main_picture.large||n.main_picture.medium),url:`https://myanimelist.net/${kind}/${n.id}`,g:(n.genres||[]).map(g=>g.name)}));
  }
  if(kind==='manga'){
    const r=await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=16&sfw=true`).then(r=>r.json());
    return (r.data||[]).map(a=>({t:a.title_english||a.title,alt:a.title_english&&a.title_english!==a.title?a.title:'',y:(a.published&&a.published.prop&&a.published.prop.from&&a.published.prop.from.year)||'',meta:[a.type,a.chapters?a.chapters+' ch':'',a.score?'MAL '+a.score:''].filter(Boolean).join(' · '),sum:a.synopsis||'',img:a.images&&a.images.jpg&&a.images.jpg.image_url,url:a.url,g:(a.genres||[]).map(g=>g.name)}));
  }
  if(kind==='books'){
    if(SET.workerUrl){try{const g=await fetch(`${SET.workerUrl}/books?q=${encodeURIComponent(q)}`).then(r=>r.json());
      if(Array.isArray(g)&&g.length){SRC.books='Goodreads';return g.slice(0,16).map(b=>({gid:b.bookId,t:b.bookTitleBare||b.title,alt:'',y:'',a:(b.author&&b.author.name)||'',meta:[(b.author&&b.author.name)||'',b.avgRating?'Goodreads '+(+b.avgRating).toFixed(2):'',b.numPages?b.numPages+' pages':''].filter(Boolean).join(' · '),sum:((b.description&&b.description.html)||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,400),img:(b.imageUrl||'').replace(/\._[A-Z]{2}\d+_\./,'.'),url:'https://www.goodreads.com'+(b.bookUrl||''),p:b.numPages||''}))}}catch(e){}}
    try{const g=await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=20&printType=books`).then(r=>{if(!r.ok)throw 0;return r.json()});
      if(g.items&&g.items.length){SRC.books='Google Books';return g.items.map(({volumeInfo:v,id})=>({t:v.title+(v.subtitle&&v.subtitle.length<40?': '+v.subtitle:''),alt:'',y:(v.publishedDate||'').slice(0,4),a:(v.authors||[]).slice(0,2).join(', '),meta:[(v.authors||[]).slice(0,2).join(', '),v.pageCount?v.pageCount+' pages':''].filter(Boolean).join(' · '),sum:(v.description||'').slice(0,400),img:v.imageLinks&&(v.imageLinks.thumbnail||v.imageLinks.smallThumbnail)?(v.imageLinks.thumbnail||v.imageLinks.smallThumbnail).replace(/^http:/,'https:').replace('&edge=curl',''):'',url:v.infoLink||('https://books.google.com/books?id='+id),g:(v.categories||[]).slice(0,4),p:v.pageCount||''}))}}catch(e){}
    SRC.books='Open Library';
    const r=await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=16&fields=title,author_name,first_publish_year,cover_i,key,number_of_pages_median,subject`).then(r=>r.json());
    return (r.docs||[]).map(b=>({t:b.title,alt:'',y:b.first_publish_year||'',meta:[(b.author_name||[]).slice(0,2).join(', '),b.number_of_pages_median?b.number_of_pages_median+' pages':''].filter(Boolean).join(' · '),sum:'',img:b.cover_i?`https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`:'',url:'https://openlibrary.org'+b.key,g:(b.subject||[]).slice(0,4),a:(b.author_name||[]).slice(0,2).join(', '),p:b.number_of_pages_median||''}));
  }
  if(kind==='anime'){
    const r=await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=16&sfw=true`).then(r=>r.json());
    return (r.data||[]).map(a=>({t:a.title_english||a.title,alt:a.title_english&&a.title_english!==a.title?a.title:'',y:a.year||(a.aired&&a.aired.prop&&a.aired.prop.from&&a.aired.prop.from.year)||'',meta:[a.type,a.episodes?a.episodes+' eps':'',a.score?'MAL '+a.score:''].filter(Boolean).join(' · '),sum:a.synopsis||'',img:a.images&&a.images.jpg&&a.images.jpg.image_url,url:a.url,g:(a.genres||[]).map(g=>g.name)}));
  }
  if(kind==='films'&&SET.tmdbKey){
    const [mv,tv]=await Promise.all(['movie','tv'].map(k=>fetch(`https://api.themoviedb.org/3/search/${k}?api_key=${SET.tmdbKey}&query=${encodeURIComponent(q)}&include_adult=false`).then(r=>r.json()).catch(()=>({}))));
    const A=(mv.results||[]).map(m=>({mv:m.id,t:m.title,alt:m.original_title!==m.title?m.original_title:'',y:(m.release_date||'').slice(0,4),meta:'Film'+(m.vote_average?' · TMDB '+m.vote_average.toFixed(1):''),sum:m.overview||'',img:m.poster_path?'https://image.tmdb.org/t/p/w342'+m.poster_path:'',url:'https://www.themoviedb.org/movie/'+m.id,pop:m.popularity||0}));
    const B=(tv.results||[]).map(m=>({tv:m.id,t:m.name,alt:m.original_name!==m.name?m.original_name:'',y:(m.first_air_date||'').slice(0,4),meta:'TV series'+(m.vote_average?' · TMDB '+m.vote_average.toFixed(1):''),sum:m.overview||'',img:m.poster_path?'https://image.tmdb.org/t/p/w342'+m.poster_path:'',url:'https://www.themoviedb.org/tv/'+m.id,pop:m.popularity||0}));
    return [...A,...B].sort((p,q)=>q.pop-p.pop).slice(0,20);
  }
  if(kind==='characters'||kind==='people'){
    const tfetch=(u,ms)=>{const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);return fetch(u,{signal:c.signal}).finally(()=>clearTimeout(t))};
    // MyAnimeList's own quick search through your helper first (fast); Jikan as the fallback
    if(SET.workerUrl){try{const j=await tfetch(`${SET.workerUrl}/people?type=${kind==='people'?'person':'character'}&q=${encodeURIComponent(q)}`,9000).then(r=>r.json());
      const items=((j.categories||[])[0]||{}).items;
      if(Array.isArray(items)){SRC[kind]='MyAnimeList';const flip=n=>n&&n.split(', ').length===2?n.split(', ').reverse().join(' '):n;
        return items.map(c=>{const P=c.payload||{};return {malId:c.id,t:flip(c.name),alt:P.alternative_name||'',y:'',meta:[(P.related_works||[]).slice(0,2).join(', '),P.favorites?fmt(String(P.favorites).replace(/,/g,''))+' favourites':'',P.birthday&&P.birthday!=='Unknown'?'born '+P.birthday:''].filter(Boolean).join(' · '),sum:'',img:(c.image_url||c.thumbnail_url||'').replace(/\/r\/\d+x\d+\//,'/').split('?')[0],url:c.url}})}}catch(e){}}
    let r;try{r=await tfetch(`https://api.jikan.moe/v4/${kind}?q=${encodeURIComponent(q)}&limit=16&order_by=favorites&sort=desc`,12000).then(r=>r.json())}catch(e){throw new Error('timeout')}
    SRC[kind]='MyAnimeList (through Jikan)';
    return (r.data||[]).map(c=>({malId:c.mal_id,t:c.name,alt:c.name_kanji||[c.family_name,c.given_name].filter(Boolean).join(' ')||'',y:'',meta:[c.favorites?fmt(c.favorites)+' favourites':'',c.birthday?'born '+fdate(c.birthday.slice(0,10)):''].filter(Boolean).join(' · '),sum:(c.about||'').replace(/\s+/g,' ').slice(0,400),img:c.images&&c.images.jpg&&c.images.jpg.image_url,url:c.url}));
  }
  if(kind==='games'&&SET.workerUrl&&SET.igdb){
    const r=await fetch(`${SET.workerUrl}/games?q=${encodeURIComponent(q)}`).then(r=>r.json());
    return (Array.isArray(r)?r:[]).map(g=>({igdb:g.id,t:g.name,alt:'',y:g.first_release_date?new Date(g.first_release_date*1000).getUTCFullYear():'',meta:[(g.involved_companies||[]).filter(c=>c.developer).map(c=>c.company&&c.company.name).filter(Boolean)[0],(g.platforms||[]).map(p=>p.abbreviation||p.name).slice(0,3).join(', ')].filter(Boolean).join(' · '),sum:g.summary||'',img:g.cover?`https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`:'',url:g.url||'',g:(g.genres||[]).map(x=>x.name),pf:(g.platforms||[]).map(p=>p.abbreviation||p.name),dev:(g.involved_companies||[]).filter(c=>c.developer).map(c=>c.company&&c.company.name).filter(Boolean),rel:g.first_release_date?new Date(g.first_release_date*1000).toISOString().slice(0,10):''}));
  }
  if(kind==='games'&&SET.rawgKey){
    const r=await fetch(`https://api.rawg.io/api/games?key=${SET.rawgKey}&search=${encodeURIComponent(q)}&page_size=16`).then(r=>r.json());
    return (r.results||[]).map(g=>({t:g.name,alt:'',y:(g.released||'').slice(0,4),meta:(g.platforms||[]).map(p=>p.platform.name).slice(0,3).join(', '),sum:'',img:g.background_image||'',url:'https://rawg.io/games/'+g.slug,g:(g.genres||[]).map(x=>x.name)}));
  }
  const hint=kind==='films'?'film':'video game';
  const u=`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q+' '+hint)}&gsrlimit=20&prop=pageimages|pageprops|description|extracts&ppprop=page_image&exintro=1&explaintext=1&exsentences=2&piprop=thumbnail&pithumbsize=300`;
  const r=await fetch(u).then(r=>r.json());
  const pages=Object.values((r.query&&r.query.pages)||{}).sort((a,b)=>a.index-b.index);
  const re=kind==='films'?/film|movie/i:/video game|game/i;
  // box art and posters are 'non-free' files, which the thumbnail field leaves out: look them up directly
  const want=pages.filter(p=>re.test(p.description||'')&&p.pageprops&&p.pageprops.page_image);
  if(want.length){try{const ii=await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=300&titles=${encodeURIComponent(want.map(p=>'File:'+p.pageprops.page_image).join('|'))}`).then(r=>r.json());
    const byName={};Object.values((ii.query&&ii.query.pages)||{}).forEach(f=>{const i=(f.imageinfo||[])[0];if(i)byName[f.title.replace(/^File:/,'').replace(/ /g,'_')]=i.thumburl||i.url});
    const nz=(ii.query&&ii.query.normalized)||[];nz.forEach(n=>{const k=n.to.replace(/^File:/,'').replace(/ /g,'_');if(byName[k])byName[n.from.replace(/^File:/,'').replace(/ /g,'_')]=byName[k]});
    want.forEach(p=>{const u=byName[p.pageprops.page_image];if(u)p.thumbnail={source:u}})}catch(e){}}
  return pages.filter(p=>re.test(p.description||'')).map(p=>{const ym=(p.description||'').match(/\b(19|20)\d\d\b/);return{t:p.title.replace(/ \((\d{4} )?(film|video game|American film|.*film)\)$/i,''),y:ym?ym[0]:'',meta:p.description||'',sum:p.extract||'',img:p.thumbnail&&p.thumbnail.source,url:'https://en.wikipedia.org/wiki/'+encodeURIComponent(p.title.replace(/ /g,'_'))}});
}
async function viaClaude(kind,q){
  const what={anime:'anime titles (series, films or OVAs)',manga:'manga, manhwa or light novels',books:'books (any language, including Urdu)',films:'films (movies)',games:'video games'}[kind];
  const prompt=`You are a catalog search engine. Find up to 10 real ${what} that best match the search query: "${q}". Include the exact title if it exists, then related entries (sequels, same franchise, close matches). Reply with ONLY a JSON array, no prose. Each item: {"title":string,"alt":string (original or romaji title, or ""),"year":number,"meta":string (for anime: type and episode count; for manga: author and chapter count; for books: author; for films: director; for games: developer and main platforms),"summary":string (max 30 words),"genres":[string]}. If nothing matches, reply [].`;
  let val;
  try{val=await sampleFn.json(prompt,{modelTier:'quick'})}
  catch(e){
    if(e&&e.code)throw e;
    const r=await sampleFn(prompt,{modelTier:'quick'});const m=(r.text||'').match(/\[[\s\S]*\]/);val=m?JSON.parse(m[0]):[];
  }
  if(!Array.isArray(val))val=(val&&(val.results||val.items))||[];
  return val.map(x=>({t:x.title,alt:x.alt||'',y:x.year||'',meta:x.meta||'',sum:x.summary||'',img:'',url:'',g:x.genres||[]}));
}
async function extSearch(){
  const S=state.search,kind=S.ext,q=S.q,box=$('#xbody');
  const key=kind+'|'+q;
  if(S.res[key]){showExt(S.res[key],kind,q);return}
  box.innerHTML=`<div class="muted"><span class="spin"></span>Searching ${MED[kind].name.toLowerCase()}…</div>`;
  const m=await detectMode();
  $('#xmode').textContent=m==='api'?'Live results':m==='claude'?'Answered by Claude':'';
  if(m==='none'){box.innerHTML=`<div class="muted">Live search isn't available here.</div>${outLinks(kind,q)}`;return}
  try{
    const res=m==='api'?await viaApi(kind,q):await viaClaude(kind,q);
    if(res===null){box.innerHTML=`<div class="muted">Game search needs a game database key. Until then:</div>${outLinks(kind,q)}`;return}
    S.res[key]=res;if(state.search.ext===kind&&state.search.q===q)showExt(res,kind,q);
  }catch(e){
    const msg=e&&e.code==='not_granted'?'Search with Claude was not allowed on this page.':e&&e.code==='rate_limited'?'Too many searches for now. Try again in a minute.':'Search failed. Try again.';
    box.innerHTML=`<div class="muted">${esc(msg)}</div><div style="margin-top:10px"><button class="btn" id="xretry">Retry</button></div>${outLinks(kind,q)}`;
    const b=$('#xretry');if(b)b.onclick=extSearch;
  }
}
function outLinks(kind,q){return `<div class="note">Also search on <a class="link" href="${OUT[kind](q)}" target="_blank" rel="noopener">${OUTN[kind]} ↗</a></div>`}
function showExt(res,kind,q){
  const box=$('#xbody');
  let note='';
  if(kind==='books'&&res.length){const near=res.filter(r=>closeTo(q,r));if(near.length)res=near;else{note=`<div class="note" style="margin:0 0 10px">Nothing matches “${esc(q)}” closely. These are the nearest results.</div>`;res=res.slice(0,5)}}
  const own=r=>r.tv?films.concat(seriesOwn).find(f=>String(f.tv)===String(r.tv)):(kind==='characters'||kind==='people'||kind==='artists')?null:ownMatch(kind,r.t,+r.y);
  if(!res.length){box.innerHTML=`<div class="muted">No ${MED[kind].name.toLowerCase()} found for “${esc(q)}”.</div>${outLinks(kind,q)}`;return}
  box.innerHTML=`${note}<div class="sres" style="margin-top:0">${res.map((r,i)=>{const o=own(r);return `<div class="xr" data-r="${i}">${cover(r.t,r.img)}<div><div class="tt">${esc(r.t)}${o?'<span class="own">In your list</span>':''}${r.tv?'<span class="own" style="background:var(--panel2);color:var(--ink2)">Series</span>':''}</div>${r.alt?`<div class="small muted">${esc(r.alt)}</div>`:''}<div class="small muted">${esc([r.y,r.meta].filter(Boolean).join(' · '))}</div><p>${esc(r.sum)}</p></div></div>`}).join('')}</div>
  ${mode==='claude'?'<div class="note">These results come from Claude\'s knowledge, so very new releases may be missing. Open one to jump to it on '+OUTN[kind]+'.</div>':`<div class="small muted" style="margin-top:8px">Results from ${esc(SRC[kind]||'')}.</div>`}${outLinks(kind,q)}`;
  box.querySelectorAll('[data-r]').forEach(el=>el.onclick=()=>{const r=res[+el.dataset.r];if(kind==='artists')return openArtist(r.spId,{t:r.t,img:r.img});const o=own(r);if(o){({anime:openAnime,manga:openManga,books:openBook,films:openFilm,games:openGame})[kind](o);return}
    if((kind==='characters'||kind==='people')&&hofPeople().some(p=>p.k===(kind==='people'?'p':'c')&&p.id===r.malId))return openMal({k:kind==='people'?'p':'c',id:r.malId,name:r.t,pic:r.img});
    openExt(kind,r)});
}
function openExt(kind,r){
  const canAdd=OWNER()&&((kind==='anime'||kind==='manga')?!!r.malId:kind==='films'?!!(r.tv||r.mv):(kind==='books'||kind==='games'));
  setTimeout(()=>{const b=$('#x_add');if(!b)return;b.onclick=()=>{
    if(!ED.on){toast(ED.token?'Turn editing on first (pencil button at the top).':'Set up editing first (pencil button at the top).',true);editSetup();return}
    if(kind==='anime'||kind==='manga')return editMal(kind,{malId:r.malId,t:r.t,img:r.img||'',type:(r.meta||'').split(' · ')[0],y:r.y||'',g:r.g||[],eps:kind==='anime'?(r.n||0):0,chs:kind==='manga'?(r.n||0):0,vols:r.v||0});
    if(kind==='films'&&r.tv)return editSeries({id:r.tv,t:r.t,y:r.y,img:r.img||'',st:'l'});
    if(kind==='films')return editFilmLocal({__new:1,t:r.t,y:+r.y||0,tmdb:r.mv,img:r.img||'',s:'w'});
    const y=String(r.y||'');
    if(kind==='books')return editBook({__new:1,t:r.t,a:r.a||'',p:r.p||'',y:y,img:r.img||'',st:'toread',sh:[]});
    editGame({__new:1,t:r.t,img:r.img||'',pf:r.pf||[],g:r.g||[],dev:r.dev||[],rel:r.rel||(y?y+'-01-01':''),shelf:'Wish List'});
  }},0);
  const label=kind==='films'&&r.tv?'Series':{anime:'Anime',manga:'Manga',books:'Book',films:'Film',games:'Game',characters:'Character',people:'Person'}[kind];
  modal(kind,label+' · not in your list',`${cover(r.t,r.img)}<div><h2>${esc(r.t)} <span class="muted" style="font-weight:500">${esc(r.y)}</span></h2>${r.alt?`<div class="muted">${esc(r.alt)}</div>`:''}
  <div class="kv">${r.meta?`<div>Details</div><div>${esc(r.meta)}</div>`:''}${r.g&&r.g.length?`<div>Genres</div><div>${r.g.map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>`:''}</div>
  ${r.sum?`<div class="review" style="--c:${MED[kind].c}">${esc(r.sum)}</div>`:''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${canAdd?'<button class="btn pri" id="x_add">+ Add to my list</button>':''}<a class="btn${canAdd?'':' pri'}" href="${r.url&&(r.malId||r.gid)?r.url:OUT[kind](r.t)}" target="_blank" rel="noopener">${r.malId?'Open on MyAnimeList':r.gid?'Open on Goodreads':'Find on '+OUTN[kind]} ↗</a>${r.url?`<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Source ↗</a>`:''}</div></div>`);
}

{const US=D.updateStatus||{};const bad=Object.entries(US).filter(([k,v])=>v!=='ok');
$('#foot').innerHTML=`<p style="margin:0 0 6px"><b>Saturn Collections</b> is Rajeel Javed's (SatsugaiDeAtsu) personal collection of anime, manga, films, series, games, books and original stories.</p>Saturn Collections · data from MyAnimeList, Letterboxd, Goodreads, Grouvee, Medium, TMDB, HowLongToBeat and Wikipedia · last refreshed ${fdate(D.generated)}${OWNER()&&bad.length?`<div style="margin-top:6px;color:var(--s4)">Last update had trouble with: ${bad.map(([k,v])=>`<b>${esc(k)}</b> <span class="muted">(${esc(String(v).slice(0,90))})</span>`).join(' · ')}. The previous data is still shown.</div>`:''}${OWNER()&&(D.repoMB||0)>500?`<div style="margin-top:6px;color:var(--s3)">Storage is at ${D.repoMB} MB. Time for the picture clean-up we talked about.</div>`:''}`;}
syncEditBtn();
malFinish();
if(ED.on&&(D.malQ||[]).length)setTimeout(()=>malFlush(false),3000);
go();
})();
