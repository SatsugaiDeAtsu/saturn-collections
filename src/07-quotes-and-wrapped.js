/* ---------- rotating quotes ---------- */
let quoteT=null,quoteI=Math.floor(Math.random()*1000);
function startQuotes(){
  clearInterval(quoteT);if(!window.__QS)window.__QS=(D.quotes||[]).filter(q=>q&&q.t).map(q=>[Math.random(),q]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]);const Q=window.__QS;if(!Q.length)return;
  const show=()=>{const el=$('#quote');if(!el)return clearInterval(quoteT);const q=Q[quoteI%Q.length];quoteI++;
    el.classList.remove('in','out','q-m','q-l');void el.offsetWidth;const L=q.t.length;if(L>260)el.classList.add('q-l');else if(L>120)el.classList.add('q-m');
    const w=q.t.split(' ');const first=w.shift()||'',last=w.length?w.pop():'';
    el.innerHTML=`<span class="qt"><span class="nw"><span class="qm">“</span>${esc(first)}</span>${w.length?' '+esc(w.join(' ')):''}${last?` <span class="nw">${esc(last)}<span class="qm">”</span></span>`:'<span class="qm">”</span>'}</span><span class="qby">(${esc(q.by||'Unknown')})</span>`;
    // shrink long quotes until they fit the box, so nothing is ever cut off
    el.style.fontSize='';el.style.justifyContent='flex-start';let fs=parseFloat(getComputedStyle(el).fontSize);
    while(el.scrollHeight>el.clientHeight+1&&fs>10){fs-=.5;el.style.fontSize=fs+'px'}
    el.style.justifyContent='';el.classList.add('in')};
  const next=()=>{const el=$('#quote');if(!el||route!=='overview')return;const q=Q[(quoteI)%Q.length];const ms=Math.min(18000,5000+q.t.length*35)+3000;quoteT=setTimeout(()=>{const e2=$('#quote');if(!e2||route!=='overview')return;e2.classList.add('out');setTimeout(()=>{show();next()},600)},ms)};
  clearTimeout(quoteT);show();quoteI--;next();quoteI++;
}
function editQuotes(){
  modal('overview','Quotes',`<div style="grid-column:1/-1"><h2>Your quotes</h2><p class="muted small" style="margin:6px 0 10px">One quote per line. To add who said it, end the line with — Name. They rotate on the Overview every few seconds.</p>
  <textarea id="q_all" rows="14" style="width:100%;font:inherit;padding:10px;border:1px solid var(--line2);background:var(--panel);color:var(--ink)">${esc((D.quotes||[]).map(q=>q.t+(q.by?' — '+q.by:'')).join('\n'))}</textarea>
  <div style="margin-top:12px"><button class="btn pri" id="q_save">Save quotes</button></div></div>`);
  $('#q_save').onclick=async()=>{const lines=$('#q_all').value.split('\n').map(s=>s.trim()).filter(Boolean);
    D.quotes=lines.map(l=>{const m=l.match(/^(.*?)\s+[—-]{1,2}\s+([^—-]+)$/);return m?{t:m[1].replace(/^["“]|["”]$/g,''),by:m[2].trim()}:{t:l.replace(/^["“]|["”]$/g,''),by:''}});
    closeM();render();toast('Saving…');try{await ghSave('data/quotes.json',{quotes:D.quotes},'Update quotes');toast('Saved. Live in about a minute.')}catch(e){toast('Not saved: '+e.message,true)}};
}

/* ---------- wrapped ---------- */
let wrYear=null;
function rWrapped(){
  const yOf=d=>d?+String(d).slice(0,4):0;
  const aY=a=>a.up?new Date(a.up*1000).getUTCFullYear():0;
  const years=[...new Set([...((D.musicSum||{}).hyears||[]),...films.map(f=>yOf(f.wd)),...books.map(b=>yOf(b.dr)),...games.map(g=>yOf(g.added)),...anime.filter(a=>a.st===2).map(aY)])].filter(y=>y>2000).sort((a,b)=>b-a);
  if(!wrYear||!years.includes(wrYear))wrYear=years[0];
  const Y=wrYear;
  const fa=anime.filter(a=>a.st===2&&aY(a)===Y), ff=films.filter(f=>yOf(f.wd)===Y), fb=books.filter(b=>b.st==='read'&&yOf(b.dr)===Y), fg=games.filter(g=>yOf(g.added)===Y&&g.shelf==='Played');
  const eps=fa.reduce((s,a)=>s+(a.eps||a.ep),0);
  const gc={};fa.forEach(a=>a.g.forEach(g=>gc[g]=(gc[g]||0)+1));const topG=Object.entries(gc).sort((a,b)=>b[1]-a[1]).slice(0,5);const gm=topG[0]?topG[0][1]:1;
  const months=Array(12).fill(0);ff.forEach(f=>months[+f.wd.slice(5,7)-1]++);fa.forEach(a=>months[new Date(a.up*1000).getUTCMonth()]++);
  const bm=months.indexOf(Math.max(...months));
  const best=[...fa.map(a=>({t:a.t,img:a.img,s:a.sc/2,b:String(a.sc),o:()=>openAnime(a)})),...ff.map(f=>({t:f.t,img:f.img||'',s:f.r,b:f.r+'★',o:()=>openFilm(f)})),...fb.map(b=>({t:b.t,img:b.img||'',s:b.r,b:b.r+'★',o:()=>openBook(b)}))].filter(x=>x.s).sort((a,b)=>b.s-a.s).slice(0,10);
  window.__wr=best;
  $('#app').innerHTML=`${banner('wrapped','Your '+Y+' Wrapped','Everything you finished this year, in one place.',[],'Saturn Collections')}
  <div class="wr-years">${years.map(y=>`<button data-y="${y}" class="${y===Y?'on':''}">${y}</button>`).join('')}</div>
  <div class="wr-hero">
    <div class="box wr-num" style="--c:var(--anime)"><b>${fa.length}</b><span>anime completed</span><div class="small muted">${fmt(eps)} episodes</div></div>
    <div class="box wr-num" style="--c:var(--film)"><b>${ff.length}</b><span>films watched</span><div class="small muted">${ff.filter(f=>f.r).length} rated</div></div>
    <div class="box wr-num" style="--c:var(--book)"><b>${fb.length}</b><span>books finished</span><div class="small muted">${fmt(fb.reduce((s,b)=>s+b.p,0))} pages</div></div>
    <div class="box wr-num" style="--c:var(--game)"><b>${fg.length}</b><span>games played</span><div class="small muted">added to Played</div></div>
    <div class="box wr-num" style="--c:var(--accent)"><b>${MON[bm]}</b><span>busiest month</span><div class="small muted">${months[bm]} things finished</div></div>
  </div>
  ${best.length?`<section class="box" style="margin-top:16px"><div class="box-h" style="border-top:3px solid var(--gold)"><h2>Top of ${Y}</h2><span class="small muted">your highest scores this year</span></div><div class="box-b"><div class="grid favs">${best.map((x,i)=>`<div class="card" data-wr="${i}">${cover(x.t,x.img,`<span class="badge">${esc(x.b)}</span>`)}<div class="meta"><div class="tt">${esc(x.t)}</div></div></div>`).join('')}</div></div></section>`:''}
  <section class="grid two" style="margin-top:16px">
    <div class="box"><div class="box-h"><h3>Month by month</h3><span class="small muted">anime and films finished</span></div><div class="box-b">${dist(months,MON.map(m=>m[0]),'var(--accent)')}</div></div>
    <div class="box"><div class="box-h"><h3>Top genres</h3><span class="small muted">anime completed in ${Y}</span></div><div class="box-b">${topG.length?topG.map(([g,n])=>`<div class="hbar" style="--c:var(--anime)"><span>${esc(g)}</span><div class="tr"><i style="width:${n/gm*100}%"></i></div><span class="mono muted">${n}</span></div>`).join(''):'<div class="muted">No anime completed this year.</div>'}</div></div>
  </section>
  <div id="wr_music"></div>
  <div class="note">Anime are counted by the date you last updated them on MAL, so a show finished earlier but updated this year shows up here.</div>`;
  document.querySelectorAll('[data-y]').forEach(b=>b.onclick=()=>{wrYear=+b.dataset.y;rWrapped()});
  document.querySelectorAll('[data-wr]').forEach(el=>el.onclick=()=>best[+el.dataset.wr].o());
  Promise.all([muLoad(),mhLoad()]).then(()=>{const el=$('#wr_music');if(!el||!MH||!MH.years||!MH.years[Y])return;const R=MH.years[Y];R.tt.forEach(([id])=>mhKnow(id));
    const art=n=>{const id=Object.keys(MU.artists).find(k=>MU.artists[k].n===n);return id?`<a href="#" data-mar="${id}">${esc(n)}</a>`:esc(n)};
    el.innerHTML=`<section class="box" style="margin-top:16px"><div class="box-h" style="border-top:3px solid var(--music)"><h2>Music in ${Y}</h2><span class="small muted">${mhH(R.ms)} · ${fmt(R.plays)} plays · ${fmt(R.songs)} songs · ${fmt(R.artists)} artists</span></div>
    <div class="box-b"><section class="grid two"><div><h3 style="margin-bottom:8px">Top artists</h3>${hbarsM(R.ta.slice(0,5).map(([n,ms],i)=>[`${i+1}. ${art(n)}`,ms,mhH(ms)]),'var(--music)')}</div><div><h3 style="margin-bottom:8px">Top songs</h3><div class="mcompact">${R.tt.slice(0,5).map(([id],i)=>mRow(id,i)).join('')}</div></div></section></div></section>`;mBind(el)});
}

