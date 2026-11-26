/* ---------- listening history (Spotify download, data/music_history.json: totals only) ---------- */
let MH=null;const mhLoad=async()=>MH||(MH=mhIndex(await loadJ('data/music_history.json')));
// the same song can have several Spotify IDs (album, single, re-release): add them up by title + artist
const mhKey=(n,a)=>mBase(n)+'|'+norm(a||'');
function mhIndex(m){if(!m||!m.tracks)return m;const K={};
  for(const [id,t] of Object.entries(m.tracks)){const k=mhKey(t[4],t[5]);const x=K[k]||(K[k]={ms:0,p:0,f:t[2],l:t[3],id,best:-1});x.ms+=t[0];x.p+=t[1];if(t[2]<x.f)x.f=t[2];if(t[3]>x.l)x.l=t[3];if(t[1]>x.best){x.best=t[1];x.id=id}}
  m.byKey=K;m.songs=Object.values(K).sort((a,b)=>b.p-a.p||b.ms-a.ms);return m}
const mhH=ms=>{const h=ms/3600000;return h>=10?fmt(Math.round(h))+' h':h>=1?(Math.round(h*10)/10)+' h':Math.max(1,Math.round(ms/60000))+' min'};
// plays logged each night since the download ended, added on top
const mhLogK=()=>{if(MH.logK)return MH.logK;if(!MU||!MU.log||!MH.end)return {};const K={};
  MU.log.filter(r=>r.t>MH.end).forEach(r=>{const t=MU.tracks[r.id];if(!t)return;const k=mhKey(t.n,((t.ar||[])[0]||[])[1]);const x=K[k]||(K[k]=[0,0,r.t.slice(0,10)]);x[0]+=t.ms||0;x[1]++;if(r.t.slice(0,10)>x[2])x[2]=r.t.slice(0,10)});return MH.logK=K};
const mhT=id=>{if(!MH||!MH.tracks)return null;const t=(MU&&MU.tracks[id])||MKN.t[id];
  if(MH.byKey){const keys=t?(t.ar||[[0,'']]).map(a=>mhKey(t.n,a[1])):[];if(MH.tracks[id])keys.push(mhKey(MH.tracks[id][4],MH.tracks[id][5]));
    const L=mhLogK();for(const k of keys){const x=MH.byKey[k],y=L[k];if(x||y)return [(x?x.ms:0)+(y?y[0]:0),(x?x.p:0)+(y?y[1]:0),x?x.f:y[2],y?y[2]:x.l]}}
  return MH.tracks[id]||null};
const mhA=n=>{if(!MH||!n)return null;if(MH.artists[n])return MH.artists[n];const k=norm(n);const e=Object.entries(MH.artists).find(([x])=>norm(x)===k);return e?e[1]:null};
const mhStat=(id,quiet)=>{if(!MH||!MH.tracks)return'';const h=mhT(id);if(!(h&&h[1])&&(quiet||!MH.byKey))return'';return h&&h[1]?`<span class="mplays">${fmt(h[1])} play${h[1]===1?'':'s'} · ${mhH(h[0])}</span>`:`<span class="mplays" style="opacity:.55">not played yet</span>`};
// a song from the history that is not in my playlists: make it showable
const mhKnow=id=>{if(MU&&MU.tracks[id]||MKN.t[id])return;const h=MH&&MH.tracks&&MH.tracks[id];if(!h)return;const aid=MU&&Object.keys(MU.artists).find(k=>MU.artists[k].n===h[5]);MKN.t[id]={n:h[4],ar:[[aid||'',h[5]]],al:h[6],img:h[7]?(/^http/.test(h[7])?h[7]:'https://i.scdn.co/image/'+h[7]):'',ms:h[8]||0}};
const hbarsM=(L,c)=>{const mx=Math.max(1,...L.map(x=>x[1]));return `<div class="hbars">${L.map(([g,n,lab])=>`<div class="hbar" style="--c:${c}"><span>${g}</span><div class="tr"><i style="width:${n/mx*100}%"></i></div><span class="mono muted">${lab||n}</span></div>`).join('')}</div>`};
const msS={y:''};
function mStatsBody(){
  if(!MH||!MH.tot)return '<div class="muted" style="padding:20px">Listening history not loaded.</div>';
  const T=MH.tot,ys=Object.keys(MH.years).sort();if(!msS.y)msS.y=ys[ys.length-1];const Y=MH.years[msS.y];
  const art=n=>{const id=MU&&Object.keys(MU.artists).find(k=>MU.artists[k].n===n);return id?`<a href="#" data-mar="${id}">${esc(n)}</a>`:esc(n)};
  const allA=Object.entries(MH.artists).sort((a,b)=>b[1][0]-a[1][0]).slice(0,20).map(([n,v],i)=>[`${i+1}. ${art(n)}`,v[0],mhH(v[0])]);
  const allT=MH.songs.slice(0,30).map(x=>x.id);allT.forEach(mhKnow);Y.tt.forEach(([id])=>mhKnow(id));
  const last24=Object.entries(MH.months).slice(-24);
  return `<div class="wr-hero" style="margin-top:14px">
    <div class="box wr-num" style="--c:var(--music)"><b>${fmt(Math.round(T.ms/3600000))}</b><span>hours listened</span><div class="small muted">${(T.ms/864e5).toFixed(1)} days of music</div></div>
    <div class="box wr-num" style="--c:var(--music)"><b>${fmt(T.plays)}</b><span>plays</span><div class="small muted">30 seconds or more</div></div>
    <div class="box wr-num" style="--c:var(--music)"><b>${fmt(T.songs)}</b><span>songs heard</span><div class="small muted">${fmt(T.artists)} artists</div></div>
    <div class="box wr-num" style="--c:var(--music)"><b>${fmt(T.days)}</b><span>days with music</span><div class="small muted">since ${fdate(MH.from)}</div></div>
  </div>
  <section class="grid two" style="margin-top:16px">
    <div class="box"><div class="box-h"><h3>Hours by year</h3></div><div class="box-b">${hbarsM(ys.map(y=>[y,MH.years[y].ms,mhH(MH.years[y].ms)]),'var(--music)')}</div></div>
    <div class="box"><div class="box-h"><h3>Last 24 months</h3><span class="small muted">hours</span></div><div class="box-b">${dist(last24.map(([,ms])=>Math.round(ms/3600000)),last24.map(([m])=>MON[+m.slice(5)-1][0]),'var(--music)')}</div></div>
    <div class="box"><div class="box-h"><h3>Time of day</h3><span class="small muted">Pakistan time</span></div><div class="box-b">${dist(MH.hours.map(ms=>Math.round(ms/3600000)),MH.hours.map((_,i)=>i%6?'':i),'var(--music)')}</div></div>
    <div class="box"><div class="box-h"><h3>Day of the week</h3></div><div class="box-b">${hbarsM(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>[d,MH.wd[i],mhH(MH.wd[i])]),'var(--music)')}</div></div>
  </section>
  <section class="box" style="margin-top:16px"><div class="box-h"><h2>Year by year</h2></div><div class="box-b">
    <div class="wr-years" style="margin:0 0 12px">${ys.map(y=>`<button data-msy="${y}" class="${y===msS.y?'on':''}">${y}</button>`).join('')}</div>
    <div class="small muted" style="margin-bottom:10px">${mhH(Y.ms)} · ${fmt(Y.plays)} plays · ${fmt(Y.songs)} songs · ${fmt(Y.artists)} artists</div>
    <section class="grid two"><div><h3 style="margin-bottom:8px">Top artists</h3>${hbarsM(Y.ta.slice(0,10).map(([n,ms],i)=>[`${i+1}. ${art(n)}`,ms,mhH(ms)]),'var(--music)')}</div>
    <div><h3 style="margin-bottom:8px">Top songs</h3><div class="mcompact">${Y.tt.slice(0,10).map(([id],i)=>mRow(id,i)).join('')}</div></div></section></div></section>
  <section class="grid two" style="margin-top:16px">
    <div class="box"><div class="box-h"><h2>Most listened artists</h2><span class="small muted">since ${MH.from.slice(0,4)}</span></div><div class="box-b">${hbarsM(allA,'var(--music)')}</div></div>
    <div class="box"><div class="box-h"><h2>Most played songs</h2><span class="small muted">since ${MH.from.slice(0,4)}</span></div><div class="mscroll" style="max-height:640px;border:0">${allT.map((id,i)=>mRow(id,i)).join('')}</div></div>
  </section>
  <div class="note">From Spotify's full listening history (up to ${fdate(MH.end.slice(0,10))}). A play counts when a song ran 30 seconds or more, the same rule Spotify uses.</div>`}
/* ---------- music: Spotify (+ Last.fm counts) ---------- */
let MU=null;const muLoad=async()=>MU||(MU=await loadJ('data/music.json'));
const muS={tab:'',rng:'short_term',q:'',lim:100,sort:store.get('msort','pl')};
const MSORT=[['pl','Playlist order'],['new','Recently added'],['old','Oldest added'],['t','Title'],['ar','Artist'],['al','Album'],['len','Length']];
const SPU=(k,id)=>`https://open.spotify.com/${k}/${id}`;
const MLIST=()=>{const rx=new RegExp(SET.music_lists||'^[A-Z0-9]+\\s*:');const pl=MU.playlists||[];return [...pl.filter(p=>p.liked),...pl.filter(p=>p.own&&!p.liked&&rx.test(p.n)).sort((a,b)=>a.n.localeCompare(b.n))]};
const mLabel=n=>n.replace(/^[A-Z0-9]+\s*:\s*/,'').trim();
const mDur=ms=>{const s=Math.round((ms||0)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const mHrs=ms=>{const h=ms/3600000;return h>=1?Math.round(h*10)/10+' h':Math.round(ms/60000)+' min'};
/* plain Spotify embed: plays full songs (with a seek bar) when signed in to Spotify in this browser */
function mPlay(kind,id){let p=$('#mplayer');if(!p){p=document.createElement('div');p.id='mplayer';document.body.appendChild(p)}
  p.innerHTML=`<iframe src="https://open.spotify.com/embed/${kind}/${id}?theme=0" height="${kind==='track'?80:352}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe><button class="x" aria-label="Close player">✕</button>`;
  p.querySelector('.x').onclick=()=>{p.remove();document.body.style.paddingBottom=''};document.body.style.paddingBottom=(kind==='track'?100:372)+'px'}
const MKN={t:{},a:{}};
const mArtLinks=t=>(t.ar||[]).map(([id,n])=>id?`<a href="#" data-mar="${id}">${esc(n)}</a>`:esc(n)).join(', ');
const mRow=(id,i,extra)=>{const t=MU.tracks[id]||MKN.t[id];if(!t)return'';MKN.t[id]=t;return `<div class="mrow"><span class="no">${i+1}</span>${t.img?`<img data-src="${esc(t.img)}" alt="" referrerpolicy="no-referrer">`:'<span></span>'}<div style="min-width:0"><div class="tt">${esc(t.n)}</div><div class="ar">${mArtLinks(t)}${extra?` · <span class="muted">${extra}</span>`:''}${mhStat(id,!!extra)}</div></div><div class="al">${esc(t.al||'')}</div><div class="du">${t.ms?mDur(t.ms):''}</div><div class="act2">${id.startsWith('q:')?'':`<button class="mbtn" data-mplay="track:${id}" aria-label="Play ${esc(t.n)}">▶</button>`}<a class="mbtn sp" href="${id.startsWith('q:')?'https://open.spotify.com/search/'+encodeURIComponent(t.n+' '+((t.ar||[])[0]||[])[1]):SPU('track',id)}" target="_blank" rel="noopener" aria-label="Open on Spotify"><span class="spt">Spotify </span>↗</a></div></div>`};
const mArtTile=(id,i)=>{const a=MU.artists[id]||MKN.a[id]||{n:'?'};MKN.a[id]=a;return `<button class="mart" data-mar="${id}"><div class="pic">${a.img?`<img data-src="${esc(a.img)}" alt="" referrerpolicy="no-referrer">`:`<b>${esc(initials(a.n))}</b>`}</div><div class="nm">${esc(a.n)}</div>${i!=null?`<div class="rk">#${i+1}${(()=>{const x=mhA(a.n);return x?' · '+mhH(x[0]):''})()}</div>`:''}</button>`};
function mBind(root){root=root||document;
  root.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=e=>{e.preventDefault();const [k,id]=b.dataset.mplay.split(':');mPlay(k,id)});
  root.querySelectorAll('[data-mar]').forEach(b=>b.onclick=e=>{e.preventDefault();openArtist(b.dataset.mar)});
  root.querySelectorAll('[data-msong]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-mplay],a,.favx'))return;e.preventDefault();openSong(b.dataset.msong)})}
/* one song = one title: remixes, acoustic, live, versions and the like count as the same song */
const mBase=n=>String(n||'').toLowerCase().replace(/\s*[\(\[【（][^\)\]】）]*[\)\]】）]/g,'').replace(/\s+[-–—~]\s+.*$/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const mUniq=ids=>{const seen=new Set(),out=[];ids.forEach(id=>{const t=MU.tracks[id]||MKN.t[id];if(!t)return;const k=mBase(t.n)+'|'+((t.ar||[])[0]||[])[0];if(seen.has(k))return;seen.add(k);out.push(id)});return out};
/* every song an artist has released (albums and singles), counted live so new releases show up; kept a day on this device */
async function artistDisc(id,onProg){
  const key='disc_'+id,c=store.get(key,null);if(c&&Date.now()-c.t<864e5)return c.L;
  const W=SET.workerUrl;const J=async u=>{for(let k=0;k<4;k++){const r=await fetch(W+'/spotify/api'+u);if(r.ok)return r.json();if(r.status!==429&&r.status<500)throw r.status;await new Promise(ok=>setTimeout(ok,1500*(k+1)))}throw 'busy'};
  let albums=[],off=0;
  while(off<600){const j=await J(`/artists/${id}/albums?include_groups=album,single&limit=10&offset=${off}`);albums.push(...(j.items||[]));if(!j.next)break;off+=10}
  const L=[],seen=new Set();let done=0,failed=0;
  const one=async a=>{try{const al=await J('/albums/'+a.id);const img=((al.images||[])[0]||{}).url||'';
    ((al.tracks||{}).items||[]).forEach(t=>{if(!(t.artists||[]).some(x=>x.id===id))return;const b=mBase(t.name);if(!b||seen.has(b))return;seen.add(b);
      L.push({id:t.id,n:t.name,b,ar:(t.artists||[]).map(x=>[x.id,x.name]),al:al.name,img,ms:t.duration_ms||0,y:(al.release_date||'').slice(0,4)})})}catch(e){failed++}
    onProg&&onProg(++done,albums.length)};
  albums.sort((a,b)=>(a.album_type==='album'?0:1)-(b.album_type==='album'?0:1)||(a.release_date||'').localeCompare(b.release_date||''));
  for(let i=0;i<albums.length;i+=3)await Promise.all(albums.slice(i,i+3).map(one));
  if(failed)throw 'partial';store.set(key,{t:Date.now(),L});return L}
async function openArtist(id,ext){await Promise.all([muLoad(),mhLoad()]);const a=MU.artists[id]||MKN.a[id]||(ext&&{n:ext.t,img:ext.img})||{n:'Artist'};
  const mine=mUniq(Object.entries(MU.tracks).filter(([,t])=>(t.ar||[]).some(x=>x[0]===id)).map(([k])=>k));
  const mineB=new Set(mine.map(s=>mBase((MU.tracks[s]||{}).n)));
  const inL=MLIST().filter(p=>p.items.some(x=>mine.includes(x))).map(p=>p.n);
  const rk=['short_term','medium_term','long_term'].map((r,i)=>{const n=(MU.top.artists[r]||[]).indexOf(id);return n>=0?`#${n+1} ${['last 4 weeks','last 6 months','all time'][i]}`:''}).filter(Boolean);
  modal('music','Artist',`<div class="mart" style="cursor:default;max-width:220px"><div class="pic">${a.img?`<img src="${esc(a.img)}" alt="" referrerpolicy="no-referrer">`:`<b>${esc(initials(a.n))}</b>`}</div></div><div><h2>${esc(a.n)}</h2>
  ${rk.length?`<div class="muted" style="margin:4px 0 10px">Your top artist: ${rk.join(' · ')}</div>`:''}
  <div class="kv"><div>Songs in your playlists</div><div><b>${mine.length}</b> <span class="muted" id="m_tot">/ counting…</span></div>${(()=>{const x=mhA(a.n);return x?`<div>Listened</div><div><b>${mhH(x[0])}</b> · ${fmt(x[1])} plays · since ${fdate(x[2])}</div>`:''})()}${inL.length?`<div>In playlists</div><div>${inL.map(n=>`<span class="tag">${esc(n)}</span>`).join('')}</div>`:''}</div>
  <div style="margin:14px 0;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-mplay="artist:${id}">▶ Play</button><a class="btn pri" href="${SPU('artist',id)}" target="_blank" rel="noopener">Open on Spotify ↗</a></div>
  <div class="mseg"><button class="on" data-al="in">In your playlists <span class="mono">${mine.length}</span></button><button data-al="out">Not in your playlists <span class="mono" id="m_outn">…</span></button></div>
  <div class="mscroll" id="m_list"></div></div>`);
  addToHook({k:'artist',id,name:a.n,img:a.img||''});
  let out=null,cur='in';
  const show=w=>{cur=w;document.querySelectorAll('[data-al]').forEach(b=>b.classList.toggle('on',b.dataset.al===w));const box=$('#m_list');if(!box)return;
    if(w==='in')box.innerHTML=mine.map((s,i)=>mRow(s,i)).join('')||'<div class="muted small" style="padding:10px">None of their songs are in your playlists yet.</div>';
    else box.innerHTML=out?(out.map((t,i)=>{MKN.t[t.id]=t;return mRow(t.id,i,t.y)}).join('')||'<div class="muted small" style="padding:10px">You have every song they released. 🎉</div>'):'<div class="muted small" style="padding:10px"><span class="spin"></span>Counting their songs…</div>';
    box.scrollTop=0;mBind($('#modal'))};
  show('in');
  document.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>show(b.dataset.al));
  if(!SET.workerUrl)return;
  try{const L=await artistDisc(id,(d,n)=>{const el=$('#m_tot');if(el)el.textContent=`/ counting… ${d} of ${n} releases`});
    const tot=new Set([...L.map(t=>t.b),...mineB]).size;out=L.filter(t=>!mineB.has(t.b));
    const el=$('#m_tot');if(el)el.textContent='/ '+tot+' songs released';const on=$('#m_outn');if(on)on.textContent=out.length;
    if(cur==='out')show('out')}
  catch(e){const el=$('#m_tot');if(el)el.textContent='/ Spotify is busy, open again in a minute';const on=$('#m_outn');if(on)on.textContent='–'}
}

async function rMusic(){
  $('#app').innerHTML='<div class="muted" style="padding:40px;text-align:center">Loading music…</div>';
  await Promise.all([muLoad(),mhLoad()]);if(route!=='music')return;
  if(!MU||!MU.tracks){$('#app').innerHTML=banner('music','Music','Not connected to Spotify yet.',[],'Music');return}
  const L=MLIST(),S=muS;if(!S.tab)S.tab=L[0]?L[0].id:'top';
  const uniq=new Set(mUniq([...new Set(L.flatMap(p=>p.items))])),totMs=[...uniq].reduce((s,id)=>s+((MU.tracks[id]||{}).ms||0),0);
  const lf=MU.lastfm||{};
  if(S.tab!=='stats'&&!L.some(p=>p.id===S.tab))S.tab=L[0]?L[0].id:'';
  const tabs=(MH&&MH.tot?`<button data-mt="stats" class="${S.tab==='stats'?'on':''}"><span class="mlk" style="background:linear-gradient(135deg,#1f9d63,#f0c43c)">📊</span><b>Listening stats</b></button>`:'')+L.map(p=>`<button data-mt="${p.id}" class="${S.tab===p.id?'on':''}">${p.liked?'<span class="mlk">♥</span>':p.img?`<img src="${esc(p.img)}" alt="" referrerpolicy="no-referrer">`:''}<span class="ml">${p.liked?'♥':esc(p.n.split(':')[0])}</span><b>${esc(p.liked?p.n:mLabel(p.n))}</b><span class="n">${fmt(p.items.length)}</span></button>`).join('');
  let body=S.tab==='stats'?mStatsBody():'';const pl=L.find(p=>p.id===S.tab);
  if(pl){const q=norm(S.q),ad=pl.added||[],T=id=>MU.tracks[id]||{};
    let idx=pl.items.map((id,i)=>i).filter(i=>{if(!q)return true;const t=T(pl.items[i]);return norm(t.n+' '+(t.ar||[]).map(x=>x[1]).join(' ')+' '+t.al).includes(q)});
    const by={new:(a,b)=>(ad[b]||'').localeCompare(ad[a]||''),old:(a,b)=>(ad[a]||'').localeCompare(ad[b]||''),t:(a,b)=>(T(pl.items[a]).n||'').localeCompare(T(pl.items[b]).n||''),ar:(a,b)=>((T(pl.items[a]).ar||[[0,'']])[0][1]||'').localeCompare((T(pl.items[b]).ar||[[0,'']])[0][1]||''),al:(a,b)=>(T(pl.items[a]).al||'').localeCompare(T(pl.items[b]).al||''),len:(a,b)=>(T(pl.items[b]).ms||0)-(T(pl.items[a]).ms||0)}[S.sort];
    if(by)idx.sort(by);const items=idx.map(i=>pl.items[i]),adds=idx.map(i=>ad[i]);
    const ms=pl.items.reduce((s,id)=>s+((MU.tracks[id]||{}).ms||0),0);
    body=`<div class="mhead">${pl.img?`<img src="${esc(pl.img)}" alt="" referrerpolicy="no-referrer">`:''}<div><div class="kick muted small">${pl.liked?'♥':esc(pl.n.split(':')[0])}</div><h2>${esc(pl.liked?pl.n:mLabel(pl.n))}</h2><div class="muted small">${pl.items.length} songs · ${mHrs(ms)}</div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${pl.liked?'':`<button class="btn" data-mplay="playlist:${pl.id}">▶ Play playlist</button>`}<a class="btn pri" href="${pl.liked?'https://open.spotify.com/collection/tracks':SPU('playlist',pl.id)}" target="_blank" rel="noopener">Open on Spotify ↗</a></div></div></div>
      <div class="mtools"><input class="mfilter" id="mq" placeholder="Find a song or artist in this playlist" value="${esc(S.q)}"><select id="msort" aria-label="Sort songs">${MSORT.map(([k,l])=>`<option value="${k}"${S.sort===k?' selected':''}>${l}</option>`).join('')}</select></div>
      <div class="box">${items.slice(0,S.lim).map((id,i)=>mRow(id,i,(S.sort==='new'||S.sort==='old')&&adds[i]?'added '+fdate(adds[i]):'')).join('')||'<div class="box-b muted">No match.</div>'}</div>
      ${items.length>S.lim?`<div class="more"><button class="btn" id="mmore">Show more (${items.length-S.lim} left)</button></div>`:''}`}

  $('#app').innerHTML=`${banner('music','Music','What I listen to, sorted the way I sort it.',[[fmt(uniq.size),'songs'],[fmt(new Set([...uniq].flatMap(id=>((MU.tracks[id]||{}).ar||[]).map(x=>x[0]))).size),'artists'],[mHrs(totMs),'of music'],...(MH&&MH.tot?[[fmt(Math.round(MH.tot.ms/3600000))+' h','listened since '+MH.from.slice(0,4)]]:lf.plays?[[fmt(lf.plays),'plays counted']]:[])],'Music')}
  <div class="mslide"><button class="marr" data-marr="-1" aria-label="Scroll left">‹</button><div class="mlists" id="mlists">${tabs}</div><button class="marr" data-marr="1" aria-label="Scroll right">›</button></div>${body}`;
  {const ml=$('#mlists'),on=ml&&ml.querySelector('.on');if(on)ml.scrollLeft=on.offsetLeft-ml.clientWidth/2+on.offsetWidth/2;
   document.querySelectorAll('[data-marr]').forEach(b=>b.onclick=()=>ml.scrollBy({left:+b.dataset.marr*ml.clientWidth*.8,behavior:'smooth'}))}
  document.querySelectorAll('[data-mt]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.mt;S.q='';S.lim=100;rMusic()});
  const mq=$('#mq');if(mq){mq.oninput=()=>{S.q=mq.value;S.lim=100;clearTimeout(mq.__t);mq.__t=setTimeout(()=>{rMusic().then(()=>{const n=$('#mq');n.focus();n.setSelectionRange(n.value.length,n.value.length)})},250)}}
  const mm=$('#mmore');if(mm)mm.onclick=()=>{S.lim+=200;rMusic()};
  const ms2=$('#msort');if(ms2)ms2.onchange=()=>{S.sort=ms2.value;store.set('msort',S.sort);S.lim=100;rMusic()};
  document.querySelectorAll('[data-msy]').forEach(b=>b.onclick=()=>{msS.y=b.dataset.msy;const y=scrollY;rMusic().then(()=>scrollTo(0,y))});
  mBind();
}
const mAgo=t=>{const d=(Date.now()-new Date(t))/1000;return d<3600?Math.max(1,Math.round(d/60))+' min ago':d<86400?Math.round(d/3600)+' h ago':Math.round(d/86400)+' d ago'};
const ovMS={a:'short_term',s:'short_term'};let ovRecent=null,ovRecentAt=0;
let OVM=null;
async function ovMusic(){const box=$('#ov_music');if(!box)return;OVM=OVM||await loadJ('data/ov_music.json');
  // the full music file has no All Time lists, so those always come from the overview file
  const MO=MU?Object.assign({},MU,OVM?{hist:OVM.hist,h:OVM.h,tracks:Object.assign({},OVM.tracks,MU.tracks),artists:Object.assign({},OVM.artists,MU.artists)}:{}):OVM;if(!MO||!MO.top||!$('#ov_music'))return;
  const MU0=MU,MH0=MH;MU=MO;if(!MH&&MO.h)MH={tracks:MO.h.t,artists:MO.h.a};
  // recently played comes live from Spotify (last 50), falling back to the nightly copy
  if((!ovRecent||Date.now()-ovRecentAt>60000)&&SET.workerUrl){try{let j=null;const mn=Math.floor(Date.now()/60000)*60000;for(let k=0;k<2&&!j;k++){j=await fetch(SET.workerUrl+'/spotify/api/me/player/recently-played?limit=50&before='+mn).then(r=>r.ok?r.json():null);if(!j)await new Promise(ok=>setTimeout(ok,1500))}const EXC=new Set(SET.music_exclude||[]);
    const spR=j&&j.items?j.items.filter(it=>it.track&&!(it.track.artists||[]).some(a=>EXC.has(a.name))).map(it=>{const t=it.track;MKN.t[t.id]=MKN.t[t.id]||{n:t.name,ar:(t.artists||[]).map(a=>[a.id,a.name]),al:(t.album||{}).name||'',img:((t.album||{}).images||[])[0]?.url||'',ms:t.duration_ms||0};return {t:it.played_at,id:t.id}}):null;
    // Last.fm has every play, offline ones too once the Spotify app syncs; Spotify's own list often skips those
    let lf=null;if(SET.lastfm){try{lf=await fetch(`${SET.workerUrl}/lastfm?method=user.getrecenttracks&user=${encodeURIComponent(SET.lastfm)}&limit=50`).then(r=>r.ok?r.json():null)}catch(e){}}
    const kk=(n,a)=>mBase(n)+'|'+mBase(a),known=new Map();
    [MO.tracks||{},MKN.t,(MU&&MU.tracks)||{}].forEach(T=>Object.entries(T).forEach(([id,t])=>(t.ar||[]).forEach(a=>{const k=kk(t.n,a[1]);if(!known.has(k)&&!id.startsWith('q:'))known.set(k,id)})));
    const lfR=((lf&&lf.recenttracks&&lf.recenttracks.track)||[]).filter(x=>x.date&&!EXC.has((x.artist||{})['#text'])).map(x=>{const n=x.name,a=(x.artist||{})['#text']||'',k=kk(n,a);let id=known.get(k);
      if(!id){id='q:'+k;const im=((x.image||[]).slice(-1)[0]||{})['#text']||'';MKN.t[id]={n,ar:[['',a]],al:(x.album||{})['#text']||'',img:/2a96cbd8b46e442fc41c2b86b821562f/.test(im)?'':im,ms:0}}
      return {t:new Date(x.date.uts*1000).toISOString(),id}});
    if(spR||lfR.length){const all=[...(spR||[])];
      // Spotify's time is when a song ended, Last.fm's when it started: the same song within 20 minutes is one play
      lfR.forEach(r=>{const t=+new Date(r.t);if(!all.some(x=>x.id===r.id&&Math.abs(+new Date(x.t)-t)<1200000))all.push(r)});
      all.sort((a,b)=>b.t.localeCompare(a.t));ovRecentAt=Date.now();ovRecent=all.slice(0,50)}}catch(e){}}
  const rec=ovRecent||MO.log||MO.recent||[];
  const R=[['short_term','4 weeks'],['medium_term','6 months'],['long_term',"Spotify's"],...(MO.hist?[['hist','All Time']]:[])];
  const seg=(k)=>`<div class="mseg sm">${R.map(([r,l])=>`<button data-ovm="${k}:${r}" class="${ovMS[k]===r?'on':''}">${l}</button>`).join('')}</div>`;
  const AL=ovMS.a==='hist'?MO.hist.a:(MO.top.artists[ovMS.a]||[]),SL=ovMS.s==='hist'?MO.hist.s:((MO.top.tracks||{})[ovMS.s]||[]);
  box.innerHTML=`<section class="ovmus"><div class="box"><div class="box-h"><h2>Top artists</h2>${seg('a')}</div><div class="martists">${AL.slice(0,10).map(mArtTile).join('')}</div></div>
  <div class="box"><div class="box-h"><h2>Top songs</h2>${seg('s')}</div><div class="mcompact">${SL.slice(0,10).map((id,i)=>mRow(id,i)).join('')}</div></div></section>
  <section class="box" style="margin-top:16px"><div class="box-h"><h2>Recently played</h2><span class="small muted">${ovRecent?'live from Spotify and Last.fm':'updated nightly'} · last ${rec.length}</span></div><div class="mcompact mscroll" style="border:0;max-height:330px">${rec.slice(0,50).map((r,i)=>mRow(r.id,i,r.t?mAgo(r.t):'')).join('')}</div></section>`;
  mBind(box);MU=MU0;MH=MH0;
  box.querySelectorAll('[data-ovm]').forEach(b=>b.onclick=()=>{const [k,r]=b.dataset.ovm.split(':');ovMS[k]=r;ovMusic()})}
const openArtistAny=x=>openArtist(x.id,x);
async function openSong(id){await Promise.all([muLoad(),mhLoad()]);const t=MU.tracks[id]||MKN.t[id]||(MF&&mfAll().find(x=>x.id===id));if(!t)return window.open(SPU('track',id),'_blank','noopener');
  const inL=MLIST().filter(p=>p.items.includes(id)).map(p=>p.liked?p.n:p.n);
  modal('music','Song',`<div class="msqr">${t.img?`<img src="${esc(t.img)}" alt="" referrerpolicy="no-referrer">`:''}</div><div><h2>${esc(t.n)}</h2><div class="ar" style="margin:4px 0 10px">${mArtLinks(t)}</div>
  <div class="kv">${t.al?`<div>Album</div><div>${esc(t.al)}${t.y?' · '+t.y:''}</div>`:''}${t.ms?`<div>Length</div><div>${mDur(t.ms)}</div>`:''}${(()=>{const x=mhT(id);return x?`<div>Listened</div><div><b>${fmt(x[1])} plays</b> · ${mhH(x[0])}</div><div>First played</div><div>${fdate(x[2])}</div><div>Last played</div><div>${fdate(x[3])}</div>`:''})()}${inL.length?`<div>In playlists</div><div>${inL.map(n=>`<span class="tag">${esc(n)}</span>`).join('')}</div>`:''}</div>
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-mplay="track:${id}">▶ Play</button><a class="btn pri" href="${SPU('track',id)}" target="_blank" rel="noopener">Open on Spotify ↗</a></div></div>`);
  mBind($('#modal'));addToHook({k:'song',id,name:t.n,ar:t.ar||[],al:t.al||'',img:t.img||'',ms:t.ms||0,y:t.y||''})}
/* Spotify search through the helper: songs or artists */
async function spSearch(type,q){if(!SET.workerUrl)return [];
  let j=null;for(let k=0;k<3&&!j;k++){const r=await fetch(`${SET.workerUrl}/spotify/api/search?q=${encodeURIComponent(q)}&type=${type}&limit=10`);if(r.ok)j=await r.json();else await new Promise(ok=>setTimeout(ok,1500*(k+1)))}if(!j)throw new Error('busy');
  const img=o=>((o&&o.images)||[])[0]?.url||'';
  if(type==='artist')return ((j.artists||{}).items||[]).map(a=>({id:a.id,t:a.name,img:img(a)}));
  return ((j.tracks||{}).items||[]).map(t=>({id:t.id,n:t.name,t:t.name,ar:(t.artists||[]).map(a=>[a.id,a.name]),al:(t.album||{}).name||'',img:img(t.album),ms:t.duration_ms||0,y:((t.album||{}).release_date||'').slice(0,4)}))}
function mSearchModal(type,title,onPick){
  modal('music',title,`<div style="grid-column:1/-1"><h2>${esc(title)}</h2>
  <form id="ms_f" style="display:flex;margin-top:12px"><input id="ms_q" placeholder="Search ${type==='artist'?'an artist':'a song'}" style="flex:1;border:1px solid var(--line2);padding:10px 12px;background:var(--panel);outline:none"><button class="btn pri" style="border-radius:0">Search</button></form>
  <div id="ms_res" style="margin-top:12px"><div class="small muted">Your own library shows first, then all of Spotify.</div></div></div>`);
  // matching keeps Japanese and other scripts (norm() keeps only a-z and 0-9)
  const nm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const go=async()=>{const q=gv('ms_q');if(!q)return;const box=$('#ms_res');await muLoad();const n=nm(q),W=n.split(' ');const m=s=>W.every(w=>nm(s).includes(w));
    const mine=type==='artist'?Object.entries(MU.artists).filter(([,a])=>m(a.n)).slice(0,12).map(([id,a])=>({id,t:a.n,img:a.img})):Object.entries(MU.tracks).filter(([,t])=>m(t.n+' '+(t.ar||[]).map(x=>x[1]).join(' '))).slice(0,12).map(([id,t])=>Object.assign({id,t:t.n},t));
    const tile=(x,i,src)=>`<button type="button" class="ptile" data-ms="${src}:${i}">${cover(x.t,x.img||'','',type==='artist'?'round':'sq')}<span class="pn">${esc(x.t)}</span><span class="ps">${esc(type==='artist'?(src==='m'?'in your library':''):(x.ar||[]).map(a=>a[1]).join(', '))}</span></button>`;
    box.innerHTML=`${mine.length?`<div class="small muted" style="margin-bottom:6px">In your library</div><div class="pgrid">${mine.map((x,i)=>tile(x,i,'m')).join('')}</div>`:''}<div id="ms_ext" style="margin-top:14px"><div class="muted small"><span class="spin"></span>Searching Spotify…</div></div>`;
    const bind=(L,src)=>box.querySelectorAll(`[data-ms^="${src}:"]`).forEach(b=>b.onclick=()=>onPick(L[+b.dataset.ms.split(':')[1]]));bind(mine,'m');
    let ext=[];try{ext=await spSearch(type,q)}catch(e){}
    const ex=$('#ms_ext');if(!ex)return;ex.innerHTML=ext.length?`<div class="small muted" style="margin-bottom:6px">On Spotify</div><div class="pgrid">${ext.map((x,i)=>tile(x,i,'e')).join('')}</div>`:'<div class="muted small">Nothing more found on Spotify.</div>';bind(ext,'e')};
  $('#ms_f').onsubmit=e=>{e.preventDefault();go()};$('#ms_q').focus()}
/* Hall of Fame music favourites (data/music_favs.json) */
let MF=null;const mfLoad=async()=>MF||(MF=await loadJ('data/music_favs.json')||{});
const MFS=[['songs','Favourite songs','song'],['en','Favourite singers · English','artist'],['jp','Favourite singers · Japanese','artist'],['anime','Favourite anime songs','song'],['hof','Hall of Fame','song']];
const mfAll=()=>MFS.filter(s=>s[2]==='song').flatMap(s=>MF[s[0]]||[]);
async function saveMF(cur,msg){toast('Saving…');try{let base;try{base=await ghLoad('data/music_favs.json')}catch(e){base={}}Object.assign(base,cur);await ghSave('data/music_favs.json',base,msg);MF=base;toast('Saved.');if(route==='hof')hofRedraw();return true}catch(e){toast('Not saved: '+e.message,true);return false}}
function mfCards(key,kind){const L=MF[key]||[];
  const card=(x,i)=>kind==='artist'?`<div class="card martc" data-mar="${esc(x.id)}" style="position:relative">${ED.on?`<button type="button" class="favx" data-mfdel="${key}:${i}" aria-label="Remove">✕</button>`:''}${cover(x.t,x.img||'','','round')}<div class="meta"><div class="tt">${esc(x.t)}</div></div></div>`
    :`<div class="card msongc" data-msong="${esc(x.id)}">${cover(x.n||x.t,x.img||'',`<button type="button" class="mplayb" data-mplay="track:${esc(x.id)}" aria-label="Play">▶</button>`+(ED.on?`<button type="button" class="favx" data-mfdel="${key}:${i}" aria-label="Remove">✕</button>`:''),'sq')}<div class="meta"><div class="tt">${esc(x.n||x.t)}</div><div class="ss"><span>${esc((x.ar||[]).map(a=>a[1]).join(', '))}</span></div></div></div>`;
  return `<div class="hgrid">${L.map(card).join('')}${ED.on?`<button type="button" class="card favadd" data-mfadd="${key}"><div class="cover sq"><b>+</b></div><div class="meta"><div class="tt">Add</div></div></button>`:''}</div>`+(ED.on?`<div style="margin-top:8px"><button class="btn" data-mfnote="${key}">✎ ${MF.notes&&MF.notes[key]?'Edit':'Add'} a note</button></div>`:'')}
function mfBind(){
  document.querySelectorAll('[data-mfadd]').forEach(b=>b.onclick=()=>{const key=b.dataset.mfadd,kind=MFS.find(s=>s[0]===key)[2];
    mSearchModal(kind,'Add to '+MFS.find(s=>s[0]===key)[1],x=>{const L=MF[key]||[];if(L.some(y=>y.id===x.id))return toast('Already there.');
      const it=kind==='artist'?{id:x.id,t:x.t,img:x.img||''}:{id:x.id,n:x.n||x.t,ar:x.ar||[],al:x.al||'',img:x.img||'',ms:x.ms||0,y:x.y||''};
      saveMF({[key]:[...L,it]},'Music favourites: add '+(it.t||it.n)).then(ok=>{if(ok)closeM()})})});
  document.querySelectorAll('[data-mfdel]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [key,i]=b.dataset.mfdel.split(':');const L=(MF[key]||[]).slice(),x=L[+i];
    if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Remove?';b.classList.add('sure');setTimeout(()=>{if(b.isConnected){b.dataset.sure='';b.textContent='✕';b.classList.remove('sure')}},3000);return}
    L.splice(+i,1);saveMF({[key]:L},'Music favourites: remove '+(x&&(x.t||x.n)||''))});
  document.querySelectorAll('[data-mfnote]').forEach(b=>b.onclick=()=>{const key=b.dataset.mfnote,cur=(MF.notes||{})[key]||'';const v=prompt('A short note for this section (leave empty to remove):',cur);if(v===null)return;
    saveMF({notes:Object.assign({},MF.notes||{},{[key]:v.trim()})},'Music favourites: note')});
  mBind()}
const hmS={a:'short_term',s:'short_term'};
/* now playing badge in the header */
async function nowPlaying(){if(!SET.workerUrl)return;const b=$('#npb');if(!b)return;
  try{const j=await fetch(SET.workerUrl+'/spotify/now').then(r=>r.json());
    if(j&&j.playing){b.href=j.url||'#';b.title='Listening now on Spotify';b.innerHTML=`${j.img?`<img src="${esc(j.img)}" alt="">`:''}<i></i><span><b>${esc(j.n)}</b>${esc(j.ar)}</span>`;b.hidden=false}else b.hidden=true}catch(e){b.hidden=true}}
nowPlaying();setInterval(()=>{if(!document.hidden)nowPlaying()},60000);

