/* ---------- overview ---------- */
function statusBar(parts,extra){const tot=parts.reduce((s,p)=>s+p[1],0)||1;return `<div class="sbar">${parts.map(p=>`<i style="width:${p[1]/tot*100}%;background:${p[2]}" title="${esc(p[0])}: ${p[1]}"></i>`).join('')}</div><div class="legend">${parts.map(p=>`<span><b style="background:${p[2]}"></b>${esc(p[0])} ${fmt(p[1])}</span>`).join('')}${(extra||[]).map(p=>`<span class="lx"><b style="border-color:${p[2]}"></b>${esc(p[0])} ${fmt(p[1])}</span>`).join('')}</div>`}
function dist(vals,labels,c){const mx=Math.max(...vals,1);return `<div style="--n:${vals.length};--c:${c}"><div class="dist">${vals.map((v,i)=>`<div style="height:${v/mx*100}%" title="${labels[i]}: ${v}"></div>`).join('')}</div><div class="distl">${labels.map(l=>`<span>${l}</span>`).join('')}</div></div>`}
function rOverview(){
  const ac=s=>anime.filter(a=>a.st===s).length;
  const scored=anime.filter(a=>a.sc>0);
  const epsW=anime.reduce((s,a)=>s+(a.st===2?(a.eps||a.ep):a.ep),0);
  const fw=films.filter(f=>f.s==='w'),fr=fw.filter(f=>f.r>0);
  const gs=k=>games.filter(g=>g.shelf===k).length;
  const gr=games.filter(g=>g.r>0);
  const wPub=[...works,...mediumOnly()],words=wPub.reduce((s,x)=>s+(x.words||0),0);
  // activity
  const act=[];
  // "Rewatched" / "Reread" when the last change was a rewatch (count went up), "Rewatching" / "Rereading" while one is going
  const rwLbl=(x,v)=>x.rwing&&x.st!==2?(v==='a'?'Rewatching':'Rereading'):(x.rwt&&x.rwt>=x.up-300)?`${v==='a'?'Rewatched':'Reread'}${x.rw>1?' ×'+x.rw:''}`:'';
  anime.filter(a=>a.up).sort((a,b)=>b.up-a.up).slice(0,12).forEach(a=>act.push({img:a.img,d:new Date(a.up*1000).toISOString(),k:'anime',t:a.t,w:`${rwLbl(a,'a')||AST[a.st][0]}${a.sc?` · scored ${a.sc}`:''}${a.st===1&&a.eps?` · ep ${a.ep}/${a.eps}`:''}`,o:()=>openAnime(a)}));
  manga.filter(m=>m.up).sort((a,b)=>b.up-a.up).slice(0,12).forEach(m=>act.push({img:m.img,d:new Date(m.up*1000).toISOString(),k:'manga',t:m.t,w:`${rwLbl(m,'m')||MST[m.st][0]}${m.sc?` · scored ${m.sc}`:''}${m.st===1&&m.ch?` · ch ${m.ch}${m.chs?'/'+m.chs:''}`:''}`,o:()=>openManga(m)}));
  // newest of: finished, status changed, added. A reread shows as "Reread" when finished, "Rereading" while reading
  const bDay=b=>[b.dr||'',b.sd||'',b.d||''].sort().pop();
  books.filter(b=>b.dr||b.sd||(b.d&&b.d>'2026-11-08')).sort((a,b)=>bDay(b).localeCompare(bDay(a))).slice(0,8).forEach(b=>{const day=bDay(b),fin=b.dr&&b.dr===day&&b.st==='read';
    act.push({img:b.img||'',d:day,k:'books',t:b.t,w:b.st==='reading'&&b.rr>0?'Rereading':fin?`${b.rrd&&b.rrd>=b.dr?`Reread${b.rr>1?' ×'+b.rr:''}`:'Finished'}${b.r?` · ${b.r}★`:''}`:b.sd&&b.sd===day?(BST[b.st]?BST[b.st][0]:'Moved'):`Added to ${BST[b.st]?BST[b.st][0]:'shelf'}`,o:()=>openBook(b)})});
  films.filter(f=>f.wd).sort((a,b)=>(b.lt||b.wd).localeCompare(a.lt||a.wd)).slice(0,12).forEach(f=>act.push({img:f.img||'',d:(f.lt&&f.lt.slice(0,10)>=f.wd)?f.lt:f.wd+'T23:59:59Z',k:'films',t:`${f.t} (${f.y})`,w:`${(f.rwd||[]).includes(f.wd)?'Rewatched':'Watched'}${f.r?` · ${stars(f.r)}`:''}`,o:()=>openFilm(f)}));
  games.filter(g=>g.added).sort((a,b)=>b.added.localeCompare(a.added)).slice(0,10).forEach(g=>act.push({img:g.img||'',d:g.added,k:'games',t:g.t,w:`${g.shelf==='Replaying'?'Replaying':g.rpd&&g.rpd===g.added?`Replayed${g.rp>1?' ×'+g.rp:''}`:'Added to '+g.shelf}${g.r?` · ${g.r}/5`:''}`,o:()=>openGame(g)}));
  wPub.forEach(w=>act.push({img:w.cover||'',d:w.up||w.date,k:'stories',t:w.t,w:w.mo?'Published on Medium':`${w.up&&w.up>w.date?'Updated':'Wrote'} · ${wKind(w)}`,o:()=>openWork(w)}));
  act.sort((a,b)=>b.d.localeCompare(a.d));
  const acts=act.slice(0,15);
  window.__acts=acts;
  // favorites
  const shuf=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
  const pools={music:shuf(((D.musicSum||{}).covers||[]).map(([t,img])=>({t,img}))),anime:shuf(anime.filter(a=>a.st!==6&&a.img)),manga:shuf(manga.filter(m=>m.st!==6&&m.img)),films:shuf(films.filter(f=>f.s==='w'&&f.img)),books:shuf(books.filter(b=>b.st!=='toread'&&b.img)),games:shuf(games.filter(g=>g.shelf!=='Backlog'&&g.shelf!=='Wish List'&&g.img))};
  // build a row where no two neighbours (including the loop seam) are the same kind of media
  const mix=n=>{const out=[];let last=null,first=null;
    for(let i=0;i<n;i++){let ks=Object.keys(pools).filter(k=>pools[k].length&&k!==last);
      if(i===n-1&&ks.length>1)ks=ks.filter(k=>k!==first)||ks;
      if(!ks.length)break;const k=ks[Math.floor(Math.random()*ks.length)];
      out.push(pools[k].shift());last=k;if(i===0)first=k}
    return out};
  const rowA=mix(60),rowB=mix(60);const W=[...rowA,...rowB];
  // films, songs and books in the strip use the small copies kept on the site (covers/s/) when there is one
  const SK=u=>{const p=u.split('?')[0].replace(/\/+$/,'').split('/');return p[2][0]+'_'+p[p.length-1].replace(/[^A-Za-z0-9_.-]/g,'_').slice(-80)};
  const MIRS=new Set((D.mir||{}).s||[]);const SIMG=u=>u&&/^https?:\/\//.test(u)&&MIRS.has(SK(u))?'covers/s/'+SK(u)+'.jpg':u;
  const row=(arr,dir)=>`<div class="mq ${dir}"><div class="mqt">${[...arr,...arr].map(x=>`<div class="mqi">${cover(x.t,SIMG(x.img),'','')}</div>`).join('')}</div></div>`;
  const wallTop=W.length>8?`<section class="marquee" aria-label="Favourites">${row(rowA,'l')}</section>`:'';
  const wallBot=W.length>8?`<section class="marquee" aria-label="Favourites">${row(rowB,'r')}</section>`:'';
  const nowItems=[
    ...anime.filter(a=>a.st===1).map(a=>({k:'anime',t:a.t,img:a.img,sub:'Watching',p:a.eps?a.ep/a.eps:0,pl:a.eps?`ep ${a.ep}/${a.eps}`:`ep ${a.ep}`,o:()=>openAnime(a)})),
    ...manga.filter(m=>m.st===1).map(m=>({k:'manga',t:m.t,img:m.img,sub:'Reading',p:m.chs?m.ch/m.chs:0,pl:`ch ${m.ch}${m.chs?'/'+m.chs:''}`,o:()=>openManga(m)})),
    ...games.filter(g=>g.shelf==='Playing'||g.shelf==='Replaying').map(g=>({k:'games',t:g.t,img:g.img||'',sub:g.shelf,p:0,pl:(g.pf||[])[0]||'',o:()=>openGame(g)})),
    ...books.filter(b=>b.st==='reading').map(b=>({k:'books',t:b.t,img:b.img||'',sub:'Reading',p:0,pl:b.a,o:()=>openBook(b)})),
    ...films.filter(f=>f.wd).sort((a,b)=>b.wd.localeCompare(a.wd)).slice(0,1).map(f=>({k:'films',t:f.t,img:f.img||'',sub:'Last watched',p:0,pl:f.r?stars(f.r):fdate(f.wd),o:()=>openFilm(f)}))];
  window.__now=nowItems;
  const art=k=>`<div class="art">${artBg(HEX[k],k.length*17,k)}</div>`;
  $('#app').innerHTML=`<div>
  ${banner('overview','SatsugaiDeAtsu','<span id="quote" class="quote"></span>',[],'House of DeAtsu')}
  <section class="box prof" style="grid-template-columns:1fr;padding:12px 16px">
    <div>${ED.on?'<button class="btn" id="qedit" style="float:right">Edit quotes</button>':''}
      <div class="links">
        <a class="chip" href="https://myanimelist.net/profile/SatsugaiDeAtsu" target="_blank" rel="noopener"><b style="width:8px;height:8px;background:var(--anime)"></b>MyAnimeList</a>
        <a class="chip" href="https://letterboxd.com/SatsugaiDeAtsu/" target="_blank" rel="noopener"><b style="width:8px;height:8px;background:var(--film)"></b>Letterboxd</a>
        <a class="chip" href="https://www.grouvee.com/user/186222-SatsugaiDeAtsu/" target="_blank" rel="noopener"><b style="width:8px;height:8px;background:var(--game)"></b>Grouvee</a>
        <a class="chip" href="https://www.goodreads.com/user/show/206271423" target="_blank" rel="noopener"><b style="width:8px;height:8px;background:var(--book)"></b>Goodreads</a>
        <a class="chip" href="https://medium.com/@rajeeljaved" target="_blank" rel="noopener"><b style="width:8px;height:8px;background:var(--story)"></b>Medium</a>
      </div>
    </div>
  </section>
  <div style="margin-top:16px">${wallTop}</div>
  <section class="grid stats" style="margin-top:2px">
    <a class="box stat" href="#anime" style="--c:var(--anime)">${art('anime')}<span class="ic">${ico('anime')}</span><div class="lab"><span>Anime</span><span>${scored.length?avg(scored.map(a=>a.sc)).toFixed(2)+' avg':''}</span></div><div class="num">${fmt(anime.filter(a=>a.st!==6).length)}</div><div class="sub">${fmt(epsW)} episodes watched · ${fmt(anime.reduce((s,a)=>s+a.rw,0))} rewatches</div>
      ${statusBar([1,2,3,4,6].map(s=>[AST[s][0],ac(s),AST[s][1]]),[['Rewatched',anime.filter(a=>a.rw>0).length,'#b48cff']])}</a>
    <a class="box stat" href="#manga" style="--c:var(--manga)">${art('manga')}<span class="ic">${ico('manga')}</span><div class="lab"><span>Manga</span><span>${(()=>{const s=manga.filter(m=>m.sc);return s.length?avg(s.map(m=>m.sc)).toFixed(2)+' avg':''})()}</span></div><div class="num">${fmt(manga.filter(m=>m.st!==6).length)}</div><div class="sub">${fmt(manga.reduce((s,m)=>s+m.ch,0))} chapters read · ${fmt(manga.reduce((s,m)=>s+m.rw,0))} rereads</div>
      ${statusBar([1,2,3,4,6].map(s=>[MST[s][0],manga.filter(m=>m.st===s).length,MST[s][1]]),[['Reread',manga.filter(m=>m.rw>0).length,'#b48cff']])}</a>
    <a class="box stat" href="#films" style="--c:var(--film)">${art('films')}<span class="ic">${ico('films')}</span><div class="lab"><span>Films</span><span>${fr.length?avg(fr.map(f=>f.r)).toFixed(2)+'★ avg':''}</span></div><div class="num">${fmt(fw.length)}</div><div class="sub">${fmt(fr.length)} rated · ${fmt(films.reduce((s,f)=>s+f.rw,0))} rewatches</div>
      ${statusBar([['Watched',fw.length,'var(--film)'],['Watchlist',films.length-fw.length,'var(--s6)']],[...(fr.length!==fw.length?[['Rated',fr.length,'var(--film)']]:[]),['Rewatched',films.filter(f=>f.rw>0).length,'#b48cff']])}</a>
    <a class="box stat" href="#games" style="--c:var(--game)">${art('games')}<span class="ic">${ico('games')}</span><div class="lab"><span>Games</span><span>${gr.length?avg(gr.map(g=>g.r)).toFixed(2)+'/5 avg':''}</span></div><div class="num">${fmt(games.filter(g=>g.shelf!=='Backlog'&&g.shelf!=='Wish List').length)}</div><div class="sub">${gs('Played')} played · ${gs('Playing')} playing · ${games.reduce((s,g)=>s+g.rp,0)} replays</div>
      ${statusBar(Object.keys(GSH).map(k=>[k,gs(k),GSH[k]]),[['Replayed',games.filter(g=>g.rp>0||g.shelf==='Replaying').length,'#b48cff']])}</a>
    <a class="box stat" href="#books" style="--c:var(--book)">${art('books')}<span class="ic">${ico('books')}</span><div class="lab"><span>Books</span><span>${(()=>{const s=books.filter(b=>b.r);return s.length?avg(s.map(b=>b.r)).toFixed(2)+'★ avg':''})()}</span></div><div class="num">${fmt(books.filter(b=>b.st!=='toread').length)}</div><div class="sub">${books.filter(b=>b.st==='read').length} read · ${books.filter(b=>b.ur).length} in Urdu</div>
      ${statusBar(Object.keys(BST).map(k=>[BST[k][0],books.filter(b=>b.st===k).length,BST[k][1]]).filter(p=>p[1]))}</a>
    <a class="box stat" href="#stories" style="--c:var(--story)">${art('stories')}<span class="ic">${ico('stories')}</span><div class="lab"><span>Writing</span><span>${works.reduce((s,w)=>s+(w.chn||['']).length,0)} chapters</span></div><div class="num">${wPub.length}</div><div class="sub">${fmt(words)} words written · ${wTime(Math.round(words/230))} to read · ${wPinned().length} pinned</div>
      ${statusBar(WSEC.map(([k,l],i)=>[l,wPub.filter(w=>w.sec===k).length,['var(--story)','var(--s3)','var(--s2)','var(--s6)'][i]]))}</a>
    ${(()=>{const M=D.musicSum;if(!M)return'';const PC=['#3ccf8a','#2fa7d6','#b48cff','#f0c43c','#f06f88','#f08a50','#7be0c0','#d4a062','#9aa6ff','#e07ad0','#66d17a'];
      return `<a class="box stat mstat" href="#music" style="--c:var(--music)">${art('music')}<span class="ic">${ico('music')}</span><div class="lab"><span>Music</span><span>${M.top?'Top now: '+esc(M.top):''}</span></div><div class="num">${fmt(M.songs)}</div><div class="sub">songs · ${fmt(M.artists)} artists${M.lms?`<br><b>${fmt(Math.round(M.lms/3600000))} h</b> listened · ${fmt(M.lplays)} plays since ${M.since}`:''}</div>
      <div class="sbar">${M.lists.map((p,i)=>`<i style="width:${p[1]/M.lists.reduce((s,x)=>s+x[1],0)*100}%;background:${PC[i%PC.length]}" title="${esc(p[0])}: ${p[1]}"></i>`).join('')}</div><div class="small muted" style="margin-top:6px">${M.lists.length} playlists</div></a>`})()}
  </section>
  <div style="margin-top:14px">${wallBot}</div>
  <section class="grid two ovtop" style="margin-top:16px">
    <div class="box"><div class="box-h"><h2>Recent activity</h2><span class="small muted">last 15, across everything</span></div>
      <div class="actscroll">${acts.map((a,i)=>`<div class="act" data-a="${i}" style="--c:${MED[a.k].c}"><span class="k"></span><div class="athumb">${cover(a.t,a.img||'','','mini')}</div><div class="t"><div>${esc(a.t)}</div><div class="small muted">${esc(MED[a.k].name)} · ${esc(a.w)}</div></div><div class="w">${ago(a.d)}</div></div>`).join('')}</div></div>
    <div class="box" id="ov_time"><div class="box-h"><h2>Time spent</h2><button class="btn" id="pickme">🎲 Pick something for me</button></div><div class="box-b tspent"><div class="muted small">Adding it up…</div></div></div>
  </section>
  <div id="ov_more"></div>
  ${favRow('Favorite films','films',ovFavItems('films'))}
  ${favRow('Favorite games','games',ovFavItems('games'))}
  ${favRow('Favorite anime','anime',ovFavItems('anime'))}
  ${favRow('Favorite manga','manga',ovFavItems('manga'))}
  ${favRow('Favorite singers','singers',ovFavItems('singers'))}
  ${showcase()}
  <div id="ov_music"></div>
  <div class="more"><a class="btn" href="#hof">Open the Hall of Fame →</a> <a class="btn" href="#wrapped">See your Wrapped →</a></div></div>
  `;

  document.querySelectorAll('.act').forEach(el=>el.onclick=()=>acts[+el.dataset.a].o());
  bindShowcase();
  {const r=$('.actscroll .act');if(r&&r.offsetHeight)$('.actscroll').style.maxHeight=(r.offsetHeight*3)+'px'}
  startQuotes();
  const qe=$('#qedit');if(qe)qe.onclick=editQuotes;
  overviewExtra();
  ovMusic();
}
const FAVS={};
/* ---------- overview extras: up next, airing, continue the series, time spent, pick for me ---------- */
async function overviewExtra(){
  const box=$('#ov_more');if(!box)return;
  // the overview only needs a small part of the big detail files, kept in data/ov_*.json
  const [oM,oF]=await Promise.all([_MD||loadJ('data/ov_mal.json').then(x=>x||loadJ('data/mal_details.json')),_FD||loadJ('data/ov_film.json').then(x=>x||loadJ('data/film_details.json'))]);
  const OM=oM||{a:{},m:{}},OF=oF||{f:{},col:{}};
  if($('#ov_more')!==box)return;
  const MD=OM;const A=id=>MD.a[id]||{};
  // ---- time spent (manga: 5 min a chapter; books: 50 pages an hour) ----
  const aH=anime.reduce((s,a)=>{const d=A(a.id);const eps=a.st===2?(a.eps||d.n||a.ep):a.ep;return s+(d.dur?eps*d.dur/3600*(1+(a.rw||0)):0)},0);
  const fH=films.filter(f=>f.s==='w').reduce((s,f)=>{const d=OF.f[f.tmdb];return s+(d&&d.rt?d.rt/60*(1+(f.rw||0)):0)},0);
  const gH=games.reduce((s,g)=>s+(g.hrs||0),0);
  const mH=manga.reduce((s,m)=>s+(m.st===2?(m.chs||m.ch):m.ch)*(1+(m.rw||0)),0)*5/60;
  const bH=books.filter(b=>b.st==='read').reduce((s,b)=>s+(+b.p||0),0)/50;
  const uH=((D.musicSum||{}).lms||0)/3600000;
  const wH=[...works,...mediumOnly()].filter(w=>!w.priv).reduce((s,w)=>s+(w.words||0),0)/230/60; // my writing, by time to read
  const dh=(h,note)=>`${fmt(Math.round(h))} h<small>${(h/24).toFixed(1)} days${note?' · '+note:''}</small>`;
  const tb=$('#ov_time .tspent');
  if(tb)tb.innerHTML=`<div style="--c:var(--anime)"><b>${dh(aH)}</b><span>Anime</span></div><div style="--c:var(--manga)"><b>${dh(mH)}</b><span>Manga</span></div><div style="--c:var(--film)"><b>${dh(fH)}</b><span>Films</span></div>
    <div style="--c:var(--game)"><b>${dh(gH)}</b><span>Games</span></div><div style="--c:var(--book)"><b>${dh(bH)}</b><span>Books</span></div><div style="--c:var(--story)"><b>${dh(wH,'time to read')}</b><span>Writing</span></div>${uH?`<div style="--c:var(--music)"><b>${dh(uH,fmt((D.musicSum||{}).lplays||0)+' plays')}</b><span>Music</span></div>`:''}<div style="--c:var(--accent)" class="${uH?'':'tall'}"><b>${dh(aH+mH+fH+gH+bH+uH+wH)}</b><span>Altogether</span></div>
`;
  const pm=$('#pickme');if(pm)pm.onclick=pickForMe;
  // ---- continue the series ----
  const cont=[];const seen=new Set();
  for(const [k,L,key] of [['a',anime,'ra'],['m',manga,'rm']])for(const x of L.filter(x=>x.st===2)){
    for(const [id,rel] of ((MD[k][x.id]||{})[key]||[])){if(rel!=='sequel'||seen.has(k+id))continue;const d=MD[k][id];if(!d||d.x||d.gone)continue;
      const own=L.find(o=>o.id===id);if(own&&own.st!==6)continue;seen.add(k+id);cont.push({k,id,d,from:x,own})}}
  cont.sort((p,q)=>(q.d.sd||'').localeCompare(p.d.sd||''));
  // ---- airing ----
  const air=anime.filter(a=>(a.st===1||a.st===6)&&A(a.id).st==='currently_airing').map(a=>({a,n:nextAir(A(a.id))})).filter(x=>x.n).sort((p,q)=>p.n.t-q.n.t);
  // ---- genres for every medium ----
  // each title counts once, under its main theme: the first genre where the source ranks them (films, books),
  // otherwise its specific theme (Psychological, Mystery, Isekai...) over broad genres like Romance or Action
  // ---- what each title is about: tags grouped into story themes; a title counts once, under its most telling theme ----
  const theme=(L,kind,key,tags)=>{const c={};L.forEach(x=>{const g=mainGenre(kind,key(x),tags(x));c[g]=(c[g]||0)+1});
    const E=Object.entries(c).sort((a,b)=>(a[0]==='Not tagged yet')-(b[0]==='Not tagged yet')||b[1]-a[1]);
    return E};
  const bars=(T,c,sub)=>{const mx=Math.max(1,...T.map(x=>x[1]));return T.length?`<div class="hbars">${T.map(([g,n])=>`<div class="hbar" style="--c:${c}"><span>${esc(g)}</span><div class="tr"><i style="width:${n/mx*100}%"></i></div><span class="mono muted">${n}</span></div>`).join('')}</div>`:'<div class="muted small">Nothing yet.</div>'};
  const cnt=(L,k,names)=>Object.entries(names).map(([v,n])=>[n,L.filter(x=>String(x[k])===v).length]).filter(x=>x[1]).map(([n,v])=>`${v} ${n}`).join(' · ');
  const aL=anime.filter(a=>a.st!==6),mL=manga.filter(m=>m.st!==6),fL=films.filter(f=>f.s==='w'&&!f.tv),gL=games.filter(g=>g.shelf!=='Backlog'&&g.shelf!=='Wish List'),bL=books.filter(b=>b.st!=='toread');
  const G={anime:theme(aL,'anime',a=>a.id,a=>A(a.id).g||a.g),manga:theme(mL,'manga',m=>m.id,m=>(MD.m[m.id]||{}).g||m.g),
    films:theme(fL,'films',f=>f.tmdb||f.u,f=>(OF.f[f.tmdb]||{}).g||[]),games:theme(gL,'games',g=>g.id,g=>g.g||[]),
    books:theme(bL,'books',b=>b.id,b=>((D.bookMeta||{})[b.id]||{}).gg||[])};
  const GS={anime:cnt(aL,'st',{1:'watching',2:'completed',3:'on hold',4:'dropped'}),manga:cnt(mL,'st',{1:'reading',2:'completed',3:'on hold',4:'dropped'}),films:`${fmt(fL.length)} films watched`,
    games:cnt(gL,'shelf',{Played:'played',Playing:'playing',Replaying:'replaying',Retired:'retired'}),books:cnt(bL,'st',{read:'read',reading:'reading',dnf:'not finished',hold:'on hold'})};
  // ---- scores for every medium ----
  const sa=anime.filter(a=>a.sc),sm=manga.filter(m=>m.sc),sf=films.filter(f=>f.s==='w'&&f.r),sg=games.filter(g=>g.r),sb=books.filter(b=>b.r);
  const ten=L=>Array.from({length:10},(_,i)=>L.filter(x=>x.sc===i+1).length);
  const five=(L,steps)=>steps.map(v=>L.filter(x=>x.r===v).length);
  const tabsBox=(id,title,items,note)=>`<div class="box"><div class="box-h"><h3>${title}</h3><div class="mtabs" data-g="${id}">${items.map((it,i)=>`<button type="button" class="${i?'':'on'}" data-i="${i}" style="--c:${it.c}">${it.n}</button>`).join('')}</div></div><div class="box-b" id="${id}">${items[0].h}</div>${note?`<div class="small muted" style="padding:0 14px 12px">${note}</div>`:''}</div>`;
  const GI=[['Anime','var(--anime)',bars(G.anime,'var(--anime)',GS.anime)],['Manga','var(--manga)',bars(G.manga,'var(--manga)',GS.manga)],['Films','var(--film)',bars(G.films,'var(--film)',GS.films)],['Games','var(--game)',bars(G.games,'var(--game)',GS.games)],['Books','var(--book)',bars(G.books,'var(--book)',GS.books)],...((D.musicSum||{}).genres&&D.musicSum.genres.length?[['Music','var(--music)',bars(D.musicSum.genres.slice(0,15),'var(--music)')+`<div class="small muted" style="margin-top:6px">Counted by number of songs in my playlists, using each artist's main genre (from Last.fm).</div>`]]:[])].map(([n,c,h])=>({n,c,h}));
  const SI=[['Anime','var(--anime)',`<div class="small muted" style="margin-bottom:6px">${sa.length} scored</div>`+dist(ten(sa),[1,2,3,4,5,6,7,8,9,10],'var(--anime)')],
    ['Manga','var(--manga)',`<div class="small muted" style="margin-bottom:6px">${sm.length} scored</div>`+dist(ten(sm),[1,2,3,4,5,6,7,8,9,10],'var(--manga)')],
    ['Films','var(--film)',`<div class="small muted" style="margin-bottom:6px">${sf.length} rated</div>`+dist(five(sf,[.5,1,1.5,2,2.5,3,3.5,4,4.5,5]),['½','1','','2','','3','','4','','5'],'var(--film)')],
    ['Games','var(--game)',`<div class="small muted" style="margin-bottom:6px">${sg.length} rated</div>`+dist(five(sg,[1,2,3,4,5]),[1,2,3,4,5],'var(--game)')],
    ['Books','var(--book)',`<div class="small muted" style="margin-bottom:6px">${sb.length} rated</div>`+dist(five(sb,[1,2,3,4,5]),[1,2,3,4,5],'var(--book)')]].map(([n,c,h])=>({n,c,h}));
  const ctile=(c,i)=>`<button type="button" class="reltile" data-ci="${i}" style="--c:${c.k==='a'?'var(--anime)':'var(--manga)'}">${cover(c.d.t,c.d.img?`https://cdn.myanimelist.net/images/${c.k==='a'?'anime':'manga'}/${c.d.img}.jpg`:'','')}<span class="rl">${esc(TYN[c.d.ty]||'')}${c.d.sd?' · '+c.d.sd.slice(0,4):''}</span><span class="rn">${esc(c.d.t)}</span><span class="rs">after ${esc(c.from.t)}</span></button>`;
  box.innerHTML=`
  ${cont.length?`<section class="box" style="margin-top:16px"><div class="box-h" style="border-top:3px solid var(--anime)"><h2>Continue the series</h2><span class="small muted">${cont.length} sequels you haven't started · scroll →</span></div><div class="box-b"><div class="hslide">${cont.map(ctile).join('')}</div></div></section>`:''}
  <section class="ovgrid" style="margin-top:16px">
    ${tabsBox('ov_sc','Scores',SI)}${tabsBox('ov_gen','Top genres',GI,'Each title counts once, under what its story is mainly about. Seasons, films and specials count separately.')}
    <div class="box ovair"><div class="box-h"><h3>Airing</h3><span class="small muted">in your time</span></div><div class="box-b unl">${air.length?air.map(({a,n},i)=>`<div class="unx" data-ai="${i}"><div class="ut">${cover(a.t,a.img||'','')}</div><div class="ui"><div class="un">${esc(a.t)}</div><div class="us">${esc(n.when)} · <b>${esc(n.in)}</b>${a.st===6?' · plan to watch':''}</div></div></div>`).join(''):'<div class="muted small">None of the shows you\'re watching are airing right now.</div>'}</div></div>
  </section>`;
  box.querySelectorAll('.mtabs').forEach(t=>t.querySelectorAll('button').forEach(b=>b.onclick=()=>{t.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));const L=t.dataset.g==='ov_gen'?GI:SI;$('#'+t.dataset.g).innerHTML=L[+b.dataset.i].h}));
  box.querySelectorAll('[data-ai]').forEach(el=>el.onclick=()=>openAnime(air[+el.dataset.ai].a));
  const openC=c=>{if(c.own)return (c.k==='a'?openAnime:openManga)(c.own);const kind=c.k==='a'?'anime':'manga';loadSyn().then(MS=>openExt(kind,{malId:c.id,t:c.d.t,y:(c.d.sd||'').slice(0,4),img:c.d.img?`https://cdn.myanimelist.net/images/${kind}/${c.d.img}.jpg`:'',meta:[TYN[c.d.ty]||'',c.d.n?c.d.n+(c.k==='a'?' eps':' ch'):'',c.d.mal?'MAL '+c.d.mal:'',`sequel to ${c.from.t}`].filter(Boolean).join(' · '),sum:MS[c.k][c.id]||'',url:`https://myanimelist.net/${kind}/${c.id}`}))};
  box.querySelectorAll('[data-ci]').forEach(el=>el.onclick=()=>openC(cont[+el.dataset.ci]));
}
function pickForMe(){
  modal('overview','Pick something for me',`<div style="grid-column:1/-1"><div class="eform">
    ${fld('pk_k','From','anime','select:anime=Anime (plan to watch)|manga=Manga (plan to read)|films=Films (watchlist)|games=Games (backlog and wish list)|books=Books (want to read)')}
    ${fld('pk_len','Length','any','select:any=Any length|short=Short (a film, or 13 episodes or fewer, or under 15 hours)|long=Long')}
    ${fld('pk_g','Genre (optional)','','text','placeholder="e.g. Romance, Horror"')}
  </div><div style="margin-top:12px"><button class="btn pri" id="pk_go">🎲 Pick</button></div><div id="pk_out" style="margin-top:16px"></div></div>`);
  const go=()=>{const k=gv('pk_k'),len=gv('pk_len'),g=gv('pk_g').trim().toLowerCase();
    const MD=_MD||{a:{},m:{}},FD=_FD||{f:{}};
    let L=k==='anime'?anime.filter(a=>a.st===6):k==='manga'?manga.filter(m=>m.st===6):k==='films'?films.filter(f=>f.s==='l'):k==='games'?games.filter(x=>x.shelf==='Backlog'||x.shelf==='Wish List'):books.filter(b=>b.st==='toread');
    const short=x=>k==='anime'?((x.eps||(MD.a[x.id]||{}).n||99)<=13):k==='manga'?((x.chs||999)<=60):k==='films'?true:k==='games'?((x.avg||99)<15):(+x.p||999)<300;
    if(len==='short')L=L.filter(short);if(len==='long')L=L.filter(x=>!short(x));
    if(g)L=L.filter(x=>((x.g||[]).join(' ')+' '+((FD.f[x.tmdb]||{}).g||[]).join(' ')+' '+(x.sh||[]).join(' ')).toLowerCase().includes(g));
    if(!L.length){$('#pk_out').innerHTML='<div class="muted">Nothing matches. Try a different length or genre.</div>';return}
    const x=L[Math.floor(Math.random()*L.length)];
    $('#pk_out').innerHTML=`<div class="pick" id="pk_x"><div class="pc">${cover(x.t,x.img||'','')}</div><div><div class="un" style="font-size:17px;font-weight:700">${esc(x.t)}</div><div class="us muted small" style="margin-top:4px">${L.length} to choose from · tap to open</div></div></div><button class="btn" id="pk_again" style="margin-top:10px">Pick again</button>`;
    $('#pk_x').onclick=()=>({anime:openAnime,manga:openManga,films:openFilm,games:openGame,books:openBook})[k](x);$('#pk_again').onclick=go};
  $('#pk_go').onclick=go;
}
function favRow(title,k,items){
  FAVS[k]=items;
  setTimeout(()=>document.querySelectorAll(`[data-fk="${k}"]`).forEach(el=>el.onclick=()=>{if(Date.now()-(window.__favDragEnd||0)<500)return;items[+el.dataset.i].o()}));
  setTimeout(()=>{document.querySelectorAll(`[data-fadd="${k}"]`).forEach(el=>el.onclick=()=>addOvFav(k));bindFavDrag(k);document.querySelectorAll(`[data-fk="${k}"] [data-fdel]`).forEach(el=>el.onclick=e=>{e.stopPropagation();delOvFav(k,+el.dataset.fdel,el)})});
  if(!items.length&&!ED.on)return'';
  return `<section class="box" style="margin-top:16px"><div class="box-h" style="border-top:3px solid ${MED[k].c}"><h2>${esc(title)}</h2><a class="link small" href="#${k==='singers'?'music':k}">View all</a></div><div class="box-b"><div class="grid favs">${items.map((it,i)=>`<div class="card" data-fk="${k}" data-i="${i}">${cover(it.t,it.img,(it.b?`<span class="badge">${esc(it.b)}</span>`:'')+(it.x||'')+(ED.on&&it.fi!=null?`<button type="button" class="favx" data-fdel="${it.fi}" title="Take off favourites" aria-label="Remove">✕</button><span class="favh" data-fdrag="${k}" title="Drag to reorder" aria-label="Drag to reorder">⠿</span>`:''))}<div class="meta"><div class="tt">${esc(it.t)}</div>${it.line||''}<div class="ss"><span>${esc(it.sub)}</span></div></div></div>`).join('')}${ED.on?`<button type="button" class="favadd" data-fadd="${k}" style="--c:${MED[k].c}" aria-label="Add a favourite"><span>+</span><small>Add</small></button>`:''}</div></div></section>`;
}


/* main genre: what a title is mainly about. Your own pick (data/themes.json) wins; otherwise its tags decide.
   Anime and manga: the most telling tag wins (Isekai over Action over Romance...); setting and fan-service tags never decide. */
const GW={Isekai:['Isekai',10],Reincarnation:['Isekai',9],Villainess:['Isekai',9],Sports:['Sports',10],'Team Sports':['Sports',10],'Combat Sports':['Sports',10],Racing:['Sports',10],
  Music:['Music',9],'Idols (Female)':['Music',9],'Idols (Male)':['Music',9],'Performing Arts':['Music',8],Mecha:['Sci-Fi',8],Psychological:['Psychological',8],'High Stakes Game':['Psychological',7.5],
  Horror:['Horror',7.6],Mystery:['Mystery',7],Detective:['Mystery',7],Military:['Military',6.5],'Video Game':['Gaming',6.5],'Strategy Game':['Gaming',6],Samurai:['Action',5],
  'Sci-Fi':['Sci-Fi',6],Space:['Sci-Fi',6],'Time Travel':['Sci-Fi',3.7],Suspense:['Mystery',5.5],'Organized Crime':['Action',5.5],Survival:['Action',5.2],Action:['Action',5],'Martial Arts':['Action',5],'Super Power':['Action',5],
  Romance:['Romance',4.5],'Love Polygon':['Romance',4.5],'Love Status Quo':['Romance',4.5],Harem:['Romance',4.5],'Reverse Harem':['Romance',4.5],'Boys Love':['Romance',4.5],'Girls Love':['Romance',4.5],
  Fantasy:['Fantasy',4],Mythology:['Fantasy',4],'Urban Fantasy':['Fantasy',4],'Mahou Shoujo':['Fantasy',4],Supernatural:['Fantasy',3.6],Vampire:['Fantasy',3.6],Adventure:['Fantasy',3.5],
  Drama:['Drama',4.6],Medical:['Drama',4.6],'Slice of Life':['Slice of Life',2.8],Iyashikei:['Slice of Life',2.8],CGDCT:['Slice of Life',2.8],Gourmet:['Slice of Life',2.8],Childcare:['Slice of Life',2.8],Workplace:['Slice of Life',2.5],
  Comedy:['Comedy',2],Parody:['Comedy',6.2],'Gag Humor':['Comedy',6.2]};
const GORDER={films:[['Horror',['Horror']],['Documentary',['Documentary']],['War',['War']],['Western',['Western']],['Crime',['Crime']],['Thriller',['Thriller','Mystery']],['Sci-Fi',['Science Fiction']],['Romance',['Romance']],['Fantasy',['Fantasy']],['Music',['Music']],['Action',['Action']],['Adventure',['Adventure']],['Comedy',['Comedy']],['Drama',['Drama']]],
  games:[['Shooter',['Shooter']],['RPG',['Role-playing (RPG)']],['Fighting',['Fighting']],['Brawler',["Hack and slash/Beat 'em up"]],['Racing',['Racing']],['Sports',['Sport']],['Strategy',['Strategy','Tactical','Turn-based strategy (TBS)','Real Time Strategy (RTS)']],['Puzzle',['Puzzle','Quiz/Trivia']],['Platformer',['Platform']],['Simulation',['Simulator']],['Music',['Music']],['Adventure',['Adventure','Point-and-click']]],
  books:[['Horror',['Horror']],['Thriller',['Mystery','Thriller','Crime','Suspense']],['Romance',['Romance']],['Fantasy',['Fantasy','Magic','High Fantasy','Supernatural','Paranormal']],['Sci-Fi',['Science Fiction','Dystopia']],['Psychology',['Psychology']],['Philosophy',['Philosophy']],['Spirituality',['Spirituality','Islam','Religion','Faith','Christian']],['Self-help',['Self Help','Personal Development','Productivity']],['Biography',['Biography','Memoir','Autobiography','Biography Memoir']],['Poetry',['Poetry']],['Children',['Childrens','Middle Grade','Picture Books']],['Adventure',['Adventure']],['Contemporary',['Contemporary','Realistic Fiction','Literary Fiction','Short Stories']]]};
const BOOKMETA=new Set(['Fiction','Nonfiction','Classics','Young Adult','Novels','Literature','Audiobook','Book Club','Manga','Light Novel','Japanese Literature','Russian Literature','Turkish Literature','Pakistan','India','Japan','Scotland','Russia','Turkish','Love','Family','School','Science','Inspirational','Adult','Adult Fiction','Middle Grade','Literary Fiction','Football','Humor','Contemporary']);
const BOOKNAME={Childrens:"Children's",'Self Help':'Self-help','Science Fiction Fantasy':'Science Fiction'};
const GLIST={anime:[...new Set(Object.values(GW).map(x=>x[0]))],films:GORDER.films.map(x=>x[0]),games:GORDER.games.map(x=>x[0]),books:[...GORDER.books.map(x=>x[0]),'Nonfiction','Fiction']};GLIST.manga=GLIST.anime;GLIST.books=[...new Set(Object.values(D.bookMeta||{}).flatMap(v=>(v.gg||[]).filter(t=>!BOOKMETA.has(t)).map(t=>BOOKNAME[t]||t)))].sort();
function mainGenre(kind,key,tags){
  const own=(D.themes||{})[kind[0]+':'+key];if(own)return own;
  tags=tags||[];if(!tags.length)return 'Not tagged yet';
  if(kind==='anime'||kind==='manga'){let best=null;tags.forEach(t=>{const w=GW[t];if(w&&(!best||w[1]>best[1]))best=w});return best?best[0]:'Comedy'}
  if(kind==='books'){const g=tags.find(t=>!BOOKMETA.has(t));return g?(BOOKNAME[g]||g):(tags.includes('Nonfiction')?'Nonfiction':'Fiction')}
  for(const [cat,ts] of GORDER[kind])if(tags.some(t=>ts.includes(t)))return cat;
  return kind==='books'?(tags.includes('Nonfiction')?'Nonfiction':'Fiction'):'Other';
}
/* a "Main genre" row in a title's info; while editing, tap ✎ to pick it yourself */
function genreRow(kind,key,tags){
  const kv=$('#modal .kv');if(!kv||$('#modal [data-gen]'))return;
  const g=mainGenre(kind,key,tags),mine=!!(D.themes||{})[kind[0]+':'+key];
  kv.insertAdjacentHTML('beforeend',`<div>Main genre</div><div data-gen="1">${esc(g)}${mine?' <span class="muted small">(your pick)</span>':''}${ED.on?` <button type="button" class="btn genbtn" title="Choose the main genre">✎</button>`:''}</div>`);
  const b=$('#modal .genbtn');if(!b)return;
  b.onclick=()=>{const cell=$('#modal [data-gen]');cell.innerHTML=`<select id="gen_s">${['',...GLIST[kind]].map(x=>`<option value="${esc(x)}" ${x===(mine?g:'')?'selected':''}>${x?esc(x):'Decide from its tags'}</option>`).join('')}</select> <button type="button" class="btn pri" id="gen_ok">Save</button>`;
    $('#gen_ok').onclick=async()=>{const v=$('#gen_s').value;toast('Saving…');
      try{let cur;try{cur=await ghLoad('data/themes.json')}catch(e){cur={}}const k=kind[0]+':'+key;if(v)cur[k]=v;else delete cur[k];
        await ghSave('data/themes.json',cur,'Main genre for '+key);D.themes=cur;cell.innerHTML=`${esc(mainGenre(kind,key,tags))}${v?' <span class="muted small">(your pick)</span>':''}`;toast('Saved.')}
      catch(e){toast('Not saved: '+e.message,true)}}};
}

/* overview favourites: their own list (data/ovfavs.json), separate from the profile favourites shown in the Hall of Fame */
function ovFavList(k){
  const O=D.ovFavs&&D.ovFavs[k];if(O)return O;
  if(k==='singers')return [];
  if(k==='films')return D.lbFavUris.map(u=>filmUri[u]).filter(Boolean).map(f=>({t:f.t,y:f.y,img:f.img||''}));
  if(k==='games')return D.gvFav.map(n=>({t:n}));
  return (D.hof.malFavs[k]||[]).map(([id,t,sub])=>({id,t,sub}));
}
function ovFavItems(k){
  return ovFavList(k).map((x,fi)=>{
    if(k==='singers')return {fi,t:x.t,img:x.img||'',sub:x.sub||'Singer',o:()=>openArtistAny(x)};
    if(k==='films'){const f=x.tv?films.concat(seriesOwn).find(o=>String(o.tv)===String(x.tv)):filmByKey[norm(x.t)+'|'+x.y]||films.find(o=>x.tmdb&&o.tmdb===x.tmdb);
      return f?{fi,t:f.t,img:f.img||f.tvimg||x.img||'',sub:f.tv?'Series':f.y,b:f.r?f.r+'★':'',o:()=>openFilm(f)}:{fi,t:x.t,img:x.img||'',sub:x.tv?'Series':x.y||'',o:()=>window.open(x.url||OUT.films(x.t),'_blank','noopener')}}
    if(k==='games'){const g=games.find(o=>o.id===x.id)||games.find(o=>o.t===x.t);
      return g?{fi,t:g.t,img:g.img||'',sub:g.pf[0]||'',b:g.r?g.r+'/5':'',x:gDlcStack(g),line:gDlcLine(g),o:()=>openGame(g)}:{fi,t:x.t,img:x.img||'',sub:x.y||'',o:()=>window.open(x.url||OUT.games(x.t),'_blank','noopener')}}
    const L=k==='anime'?anime:manga,o=L.find(y=>y.id===x.id);
    return o?{fi,t:o.t,img:o.img,sub:x.sub||[o.type,o.y].filter(Boolean).join(' · '),b:o.sc?String(o.sc):'',o:()=>(k==='anime'?openAnime:openManga)(o)}:{fi,t:x.t,img:x.img||'',sub:x.sub||'',o:()=>window.open(`https://myanimelist.net/${k}/${x.id}`,'_blank','noopener')}});
}
async function saveOvFavs(k,list,msg){
  toast('Saving…');
  try{let cur;try{cur=await ghLoad('data/ovfavs.json')}catch(e){cur={}}
    ['films','games','anime','manga','singers'].forEach(x=>{if(!cur[x])cur[x]=ovFavList(x)});cur[k]=list;
    await ghSave('data/ovfavs.json',cur,msg);D.ovFavs=cur;toast('Saved.');refreshFavRow(k);return true}
  catch(e){toast('Not saved: '+e.message,true);return false}
}
/* reorder favourites: drag a card with the mouse, or press and hold it on a phone (the ⠿ grip starts at once) */
function bindFavDrag(k){
  document.querySelectorAll(`[data-fk="${k}"]`).forEach(card=>{
    if(card.__drag)return;card.__drag=1;
    card.querySelectorAll('img').forEach(im=>im.draggable=false);
    card.addEventListener('dragstart',e=>e.preventDefault());
    card.addEventListener('pointerdown',e=>{
      if(!ED.on||e.button>0||e.target.closest('.favx'))return;
      const grip=!!e.target.closest('.favh'),touch=e.pointerType!=='mouse';
      const sx=e.clientX,sy=e.clientY;let started=false,timer=null,lx=sx,ly=sy,ghost,dx,dy,grid=card.parentElement;
      const begin=()=>{started=true;const r=card.getBoundingClientRect();dx=lx-r.left;dy=ly-r.top;
        ghost=card.cloneNode(true);ghost.removeAttribute('data-fk');ghost.className+=' favghost';Object.assign(ghost.style,{width:r.width+'px',left:r.left+'px',top:r.top+'px'});document.body.appendChild(ghost);
        card.classList.add('favdragging');document.body.classList.add('dragging');if(navigator.vibrate&&touch)navigator.vibrate(15)};
      const block=ev=>{if(started||grip)ev.preventDefault()};
      const move=ev=>{lx=ev.clientX;ly=ev.clientY;
        if(!started){const d=Math.hypot(lx-sx,ly-sy);
          if(grip||!touch){if(d>6)begin();else return}
          else{if(d>10){cleanup();}return}}
        ev.preventDefault();
        ghost.style.left=(lx-dx)+'px';ghost.style.top=(ly-dy)+'px';
        const over=[...grid.querySelectorAll('.card[data-fk]')].find(c=>{if(c===card)return false;const b=c.getBoundingClientRect();return lx>b.left&&lx<b.right&&ly>b.top&&ly<b.bottom});
        if(over){const b=over.getBoundingClientRect();grid.insertBefore(card,lx<b.left+b.width/2?over:over.nextSibling);const add=grid.querySelector('.favadd');if(add)grid.appendChild(add)}};
      const cleanup=()=>{clearTimeout(timer);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('touchmove',block)};
      const up=()=>{cleanup();if(!started)return;
        ghost.remove();card.classList.remove('favdragging');document.body.classList.remove('dragging');window.__favDragEnd=Date.now();
        const order=[...grid.querySelectorAll('.card[data-fk]')].map(c=>+c.dataset.i);
        if(order.some((v,i)=>v!==i)){const L=ovFavList(k);saveOvFavs(k,order.map(i=>L[i]),'Reorder overview favourites')}};
      if(touch&&!grip)timer=setTimeout(begin,350);
      if(grip)e.preventDefault();
      window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('touchmove',block,{passive:false});
    });
    card.addEventListener('click',e=>{if(Date.now()-(window.__favDragEnd||0)<600){e.stopImmediatePropagation();e.preventDefault()}},true);
    card.addEventListener('contextmenu',e=>{if(card.classList.contains('favdragging'))e.preventDefault()});
  });
}
const FAVT={films:'Favorite films',games:'Favorite games',anime:'Favorite anime',manga:'Favorite manga',singers:'Favorite singers'};
function refreshFavRow(k){
  const el=document.querySelector(`[data-fk="${k}"],[data-fadd="${k}"]`),sec=el&&el.closest('section');
  if(!sec||route!=='overview')return;
  const y=window.scrollY,tmp=document.createElement('div');tmp.innerHTML=favRow(FAVT[k],k,ovFavItems(k));
  if(tmp.firstElementChild)sec.replaceWith(tmp.firstElementChild);else sec.remove();window.scrollTo(0,y);
}
function delOvFav(k,i,el){
  if(el.dataset.sure!=='1'){el.dataset.sure='1';el.textContent='Remove?';el.classList.add('sure');setTimeout(()=>{if(el.isConnected){el.dataset.sure='';el.textContent='✕';el.classList.remove('sure')}},3000);return}
  const L=ovFavList(k).slice(),x=L.splice(i,1)[0];saveOvFavs(k,L,'Take '+(x&&x.t||'a favourite')+' off the overview');
}
function addOvFav(k){
  if(k==='singers'){const have=ovFavList(k);return mSearchModal('artist','Add a favourite singer',x=>{if(have.some(h=>h.id===x.id))return toast('Already in your favourites.');saveOvFavs(k,[...have,{id:x.id,t:x.t,img:x.img||''}],'Add '+x.t+' to favourite singers').then(ok=>{if(ok)closeM()})})}
  const name={films:'film or series',games:'game',anime:'anime',manga:'manga'}[k];
  modal(k,'Add a favourite',`<div style="grid-column:1/-1"><h2>Add a favourite ${esc(name)}</h2>
  <form id="fv_f" style="display:flex;margin-top:12px"><input id="fv_q" placeholder="Search for a ${esc(name)}" style="flex:1;border:1px solid var(--line2);padding:10px 12px;background:var(--panel);outline:none"><button class="btn pri" style="border-radius:0">Search</button></form>
  <div id="fv_res" style="margin-top:12px"><div class="small muted">Your own ${k==='films'?'films and series':k} show first, then everything else.</div></div></div>`);
  const have=ovFavList(k);
  const pick=async x=>{if(have.some(h=>(x.id!=null&&h.id===x.id)||(x.tv&&String(h.tv)===String(x.tv))||(!x.id&&!x.tv&&norm(h.t)===norm(x.t)&&String(h.y||'')===String(x.y||''))))return toast('Already in your favourites.');
    if(await saveOvFavs(k,[...have,x],'Add '+x.t+' to overview favourites'))closeM()};
  const go=async()=>{const q=gv('fv_q');if(!q)return;const box=$('#fv_res');
    const n=norm(q),W=n.split(' '),m=s=>W.every(w=>s.includes(w));
    const mine=(k==='films'?films.concat(seriesOwn):k==='games'?games:k==='anime'?anime:manga).filter(x=>m(x.n)).slice(0,12)
      .map(x=>k==='films'?(x.tv?{t:x.t,y:x.y,tv:x.tv,img:x.img||x.tvimg||''}:{t:x.t,y:x.y,img:x.img||''}):k==='games'?{t:x.t,id:x.id,img:x.img||''}:{id:x.id,t:x.t,img:x.img||''});
    const tile=(x,i,src)=>`<button type="button" class="ptile" data-fv="${src}:${i}">${cover(x.t,x.img||'','')}<span class="pn">${esc(x.t)}</span><span class="ps">${esc([x.tv?'Series':'',x.y||'',src==='m'?'in your list':''].filter(Boolean).join(' · '))}</span></button>`;
    box.innerHTML=`${mine.length?`<div class="small muted" style="margin-bottom:6px">In your list</div><div class="pgrid">${mine.map((x,i)=>tile(x,i,'m')).join('')}</div>`:''}<div id="fv_ext" style="margin-top:14px"><div class="muted small"><span class="spin"></span>Searching everywhere…</div></div>`;
    const bind=(L,src)=>box.querySelectorAll(`[data-fv^="${src}:"]`).forEach(b=>b.onclick=()=>pick(L[+b.dataset.fv.split(':')[1]]));
    bind(mine,'m');
    let ext=[];try{const r=await viaApi(k,q);ext=(r||[]).map(x=>k==='films'?(x.tv?{t:x.t,y:x.y,tv:x.tv,img:x.img||'',url:x.url}:{t:x.t,y:x.y,img:x.img||'',url:x.url}):k==='games'?{t:x.t,y:x.y,img:x.img||'',url:x.url}:{id:x.malId,t:x.t,img:x.img||'',sub:[x.meta.split(' · ')[0],x.y].filter(Boolean).join(' · ')}).filter(x=>k==='games'||k==='films'||x.id)}catch(e){}
    const ex=$('#fv_ext');if(!ex)return;
    ex.innerHTML=ext.length?`<div class="small muted" style="margin-bottom:6px">Everywhere</div><div class="pgrid">${ext.slice(0,16).map((x,i)=>tile(x,i,'e')).join('')}</div>`:(mine.length?'':'<div class="muted small">Nothing found. Try another spelling.</div>');
    bind(ext,'e')};
  $('#fv_f').onsubmit=e=>{e.preventDefault();go()};$('#fv_q').focus();
}

