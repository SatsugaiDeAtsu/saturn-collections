/* ---------- games ---------- */
function rGames(){
  listPage({key:'games',title:'Games',bst:()=>[[games.length,'games'],[games.filter(g=>g.shelf==='Played').length,'played'],[fmt(Math.round(games.reduce((s,g)=>s+g.hrs,0)))+'h','hours played'],[games.reduce((s,g)=>s+g.rp,0),'replays']],sub:`${games.length} games`,
    items:()=>games,
    tabs:[...Object.keys(GSH).map(k=>[k,k,k==='Playing'?g=>g.shelf==='Playing'||g.shelf==='Replaying':g=>g.shelf===k]),['replayed','Replayed',g=>g.rp>0||g.shelf==='Replaying'],['reviewed','Reviewed',g=>!!g.rv]],
    sorts:[['added','Date added'],['rating','Your rating'],['release','Release date'],['title','Title']],
    sorter:k=>({added:(a,b)=>b.added.localeCompare(a.added),rating:(a,b)=>b.r-a.r||b.added.localeCompare(a.added),release:(a,b)=>(b.rel||'').localeCompare(a.rel||''),title:cmpT})[k],
    card:(g,i)=>`<div class="card" data-i="${i}">${cover(g.t,g.img||'',gBadge(g)+gDlcStack(g)+`<span class="sline" style="--sc:${GSH[g.shelf]||'var(--s6)'}"></span>`)}<div class="meta"><div class="tt">${esc(g.t)}</div>${gDlcLine(g)}<div class="ss"><span>${esc(g.shelf)}</span><span>${g.rel?g.rel.slice(0,4):''}</span></div></div></div>`,
    thead:'<th style="width:5px;padding:0"></th><th class="hm">#</th><th></th><th>Game</th><th style="text-align:center">Rating</th><th>Shelf</th><th class="hm">Platform</th><th class="hm" style="text-align:center">Released</th>',
    row:(g,i)=>`<tr data-i="${i}"><td class="st" style="--sc:${GSH[g.shelf]||'var(--s6)'}"></td><td class="num hm">${i+1}</td><td style="width:54px">${cover(g.t,g.img||'','','mini')}</td><td><div class="ti">${esc(g.t)}</div><div class="alt">${esc(g.dev[0]||'')}${gPlayedDlc(g).length?` · <span style="color:var(--game)">DLC: ${esc(gPlayedDlc(g).map(d=>d.n).join(', '))}</span>`:''}${g.hrs?` · ${g.hrs}h`:''}${g.rp?` · replayed ${g.rp}×`:''}</div></td><td class="sc">${g.r?g.r+'/5':'<span class="muted">–</span>'}</td><td class="small">${esc(g.shelf)}</td><td class="small hm">${esc(g.pf.join(', '))}</td><td class="c mono small hm">${g.rel?g.rel.slice(0,4):''}</td></tr>`,
    open:openGame});
}
function openGame(g){
  const hrs=g.hrs||g.log.reduce((s,p)=>s+(p.seconds_played||0),0)/3600;
  modal('games','Game',`${cover(g.t,g.img||'')}<div><h2>${esc(g.t)}</h2>${g.dev.length?`<div class="muted">${esc(g.dev.join(', '))}</div>`:''}
  ${gDlcLine(g)}
  <div class="bigscore"><div><b>${g.r?g.r+'/5':'–'}</b><small>Your rating</small></div><div><b style="color:${GSH[g.shelf]||'var(--s6)'}">■</b><small>${esc(g.shelf)}</small></div>${hrs?`<div><b>${g.hrsEst?'≈':''}${Math.round(hrs*10)/10}h</b><small>${g.hrsEst?'Hours (estimate)':'Hours played'}</small></div>`:''}<div><b>${g.rp}</b><small>Times replayed</small></div></div>
  <div class="kv">${(()=>{const rw=((D.gameMeta||{})[g.id]||{}).rw||{};const pf=g.pf.length?g.pf:(rw.pf||[]);return (pf.length?`<div>Platforms</div><div>${pf.map(p=>`<span class="tag">${esc(p)}</span>`).join('')}</div>`:'')+(rw.mc?`<div>Metacritic</div><div><b style="color:${rw.mc>=75?'var(--s2)':rw.mc>=50?'var(--s3)':'var(--s4)'}">${rw.mc}</b></div>`:'')+(rw.age?`<div>Age rating</div><div>${esc(rw.age)}</div>`:'')+(rw.tags&&rw.tags.length?`<div>Tags</div><div>${rw.tags.map(p=>`<span class="tag">${esc(p)}</span>`).join('')}</div>`:'')})()}${g.g.length?`<div>Genres</div><div>${g.g.map(p=>`<span class="tag">${esc(p)}</span>`).join('')}</div>`:''}${g.fr.length?`<div>Franchise</div><div>${esc(g.fr.join(', '))}</div>`:''}${g.pub.length?`<div>Publisher</div><div>${esc(g.pub.join(', '))}</div>`:''}${g.avg?`<div>Average length</div><div>${g.avg}h main story (HowLongToBeat)</div>`:''}<div>Released</div><div>${g.rel?fdate(g.rel):'–'}</div><div>Added</div><div>${g.added?fdate(g.added):'–'}</div>
  ${g.log.map(p=>`<div>Play log</div><div>${[p.date_started&&p.date_started!=='None'?'Started '+fdate(p.date_started):'',p.date_finished&&p.date_finished!=='None'?'Finished '+fdate(p.date_finished):'',p.level_of_completion||'',p.notes?esc(p.notes):''].filter(Boolean).join(' · ')||'–'}</div>`).join('')}</div>
  ${(()=>{const sh=(((D.gameMeta||{})[g.id]||{}).rw||{}).shots||[];return sh.length?`<div class="gshots">${sh.map(u=>`<a href="${esc(u.replace('/resize/640/-/','/'))}" target="_blank" rel="noopener"><img data-src="${esc(u)}" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></a>`).join('')}</div>`:''})()}
  ${gameSeries(g)}${g.dlcs.length?`<div class="sect" style="--c:var(--game);margin-top:14px"><h2><i></i>DLC <span class="muted mono">${g.dlcs.filter(d=>d.p).length}/${g.dlcs.length} played</span></h2><div class="dlcgrid">${g.dlcs.map((d,i)=>dlcTile(d,i,false)).join('')}</div></div>`:''}
  ${g.rv?`<div class="review" style="--c:var(--game)">${g.rvt?`<b>${esc(g.rvt)}</b>\n`:''}${esc(g.rv)}</div>`:''}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">${ED.on?`<button class="btn pri" id="m_edit">Edit</button>`:''}<a class="btn pri" href="${esc(g.u||'https://www.grouvee.com/search/?q='+encodeURIComponent(g.t))}" target="_blank" rel="noopener">Open on Grouvee ↗</a></div></div>`);
  const me=$('#m_edit');if(me)me.onclick=()=>editGame(g);
  genreRow('games',g.id,g.g||[]);
}

