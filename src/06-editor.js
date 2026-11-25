/* ---------- editor (games & books, saved to GitHub) ---------- */
const REPO='SatsugaiDeAtsu/saturn-collections';
const ED={get token(){return store.get('gh_token','')},set token(v){store.set('gh_token',v)},get on(){return !!store.get('edit_on',false)&&!!this.token},set on(v){store.set('edit_on',!!v)}};
const b64=s=>btoa(unescape(encodeURIComponent(s)));
async function ghSave(path,obj,msg){
  const api=`https://api.github.com/repos/${REPO}/contents/${path}`;
  const h={Authorization:'Bearer '+ED.token,Accept:'application/vnd.github+json'};
  const cur=await fetch(api+'?ref=main&_='+Date.now(),{headers:h,cache:'no-store'});
  if(cur.status===401||cur.status===403)throw new Error('GitHub refused the token. Check that it has Contents: read and write for saturn-collections.');
  let sha=cur.ok?(await cur.json()).sha:undefined;
  for(let i=0;i<3;i++){
    const r=await fetch(api,{method:'PUT',headers:h,body:JSON.stringify({message:msg,content:b64(JSON.stringify(obj,null,0)),sha,branch:'main'})});
    if(r.ok)return;
    const e=await r.json().catch(()=>({}));
    const m=/is at ([0-9a-f]{40})/.exec(e.message||'');
    if(r.status===409&&m){sha=m[1];continue}
    throw new Error(e.message||('GitHub error '+r.status));
  }
  throw new Error('GitHub kept reporting a newer version. Try again in a minute.');
}
function toast(msg,bad){let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';document.body.appendChild(el)}el.textContent=msg;el.className='show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>el.className='',bad?7000:3500)}
function editSetup(){
  modal('overview','Edit mode',`<div style="grid-column:1/-1"><h2>Turn on editing</h2>
  <p class="muted" style="margin:6px 0 12px">Paste your GitHub access token. It's saved only in this browser on this device and is sent only to GitHub.</p>
  <input id="tok" type="password" placeholder="github_pat_..." style="width:100%;padding:10px;border:1px solid var(--line2);background:var(--panel)" value="">
  <div id="tokerr" class="small" style="color:var(--s4);margin-top:6px"></div>
  <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><b>MyAnimeList</b><p class="muted small" style="margin:4px 0 8px">${MALA.on?'Connected. Anime and manga edits go straight to MAL.':'Connect once so anime and manga edits save to MAL.'}</p><button class="btn" id="malc">${MALA.on?'Reconnect MAL':'Connect MAL'}</button>${MALA.on?' <button class="btn" id="malx">Disconnect</button>':''}</div>
  ${ED.token?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><b>MAL sync</b><p class="muted small" style="margin:4px 0 8px">${(D.malQ||[]).length?`⏳ ${(D.malQ||[]).length} change${(D.malQ||[]).length>1?'s':''} waiting for MyAnimeList.`:'Nothing waiting. Everything is on MyAnimeList.'} ${D.malSync?'Hourly sync is on.':'Hourly sync is not set up yet.'}</p><button class="btn" id="mq_now">Sync now</button> <button class="btn" id="mq_hour">${D.malSync?'Reconnect':'Set up'} hourly sync</button></div>`:''}
  ${ED.token?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><b>Refresh now</b><p class="muted small" style="margin:4px 0 8px">Pull the latest from MAL, Letterboxd, your blogs and Medium without waiting for the nightly update. Takes about 3 to 5 minutes, then reload the page.</p><button class="btn" id="refnow">Refresh my data</button> <span id="refmsg" class="small muted"></span></div>`:''}
  ${ED.token?`<div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><b>Approved manga</b><p class="muted small" style="margin:4px 0 8px">Manga that MAL tags as Erotica only show up once you approve them here. Paste a MAL manga link or ID.</p>
  <div style="display:flex"><input id="ma_in" placeholder="https://myanimelist.net/manga/12345" style="flex:1;padding:8px;border:1px solid var(--line2);background:var(--panel);color:var(--ink)"><button class="btn" id="ma_add" style="border-radius:0">Approve</button></div>
  <div id="ma_list" class="small" style="margin-top:8px">${(SET.manga_allow||[]).map(id=>`<span class="chip" style="margin:0 6px 6px 0">${id} <a href="#" data-ma="${id}" aria-label="Remove ${id}" style="color:var(--s4)">✕</a></span>`).join('')||'<span class="muted">None yet.</span>'}</div><div id="ma_msg" class="small muted"></div></div>`:''}
  <div style="margin-top:16px;padding-top:12px;border-top:1px solid var(--line)"><b>Clear saved copy</b><p class="muted small" style="margin:4px 0 8px">Removes the pictures and lists this browser has saved, then reloads fresh from the site. Your token and settings stay.</p><button class="btn" onclick="scClear()">Clear and reload</button></div>
  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" id="toksave">Save and turn on</button>${ED.token?'<button class="btn" id="tokoff">Turn off editing</button><button class="btn" id="tokdel">Forget token and hide editing on this device</button>':''}</div></div>`);
  const rn=$('#refnow');if(rn)rn.onclick=async()=>{rn.disabled=true;$('#refmsg').textContent='Starting…';try{await ghSave('data/mal_touch.json',{t:Date.now()},'Manual refresh');$('#refmsg').textContent='Started. Reload the site in about 5 minutes.'}catch(e){$('#refmsg').textContent='Could not start: '+e.message;rn.disabled=false}};
  $('#toksave').onclick=async()=>{const v=$('#tok').value.trim()||ED.token;if(!v){$('#tokerr').textContent='Paste a token first.';return}
    $('#tokerr').textContent='Checking…';
    const r=await fetch(`https://api.github.com/repos/${REPO}`,{headers:{Authorization:'Bearer '+v}}).catch(()=>null);
    if(!r||!r.ok){$('#tokerr').textContent='That token did not work for saturn-collections.';return}
    const j=await r.json();if(!j.permissions||!j.permissions.push){$('#tokerr').textContent='The token works but cannot save. Give it Contents: read and write.';return}
    ED.token=v;ED.on=true;closeM();syncEditBtn();render();toast('Editing is on')};
  const saveAllow=async(list,msg)=>{$('#ma_msg').textContent='Saving…';
    try{const cur=await ghLoad('data/settings.json');cur.manga_allow=list;Object.assign(SET,cur);await ghSave('data/settings.json',cur,msg);await ghSave('data/mal_touch.json',{t:Date.now()},'Refresh after approving manga');$('#ma_msg').textContent='Saved. The manga list refreshes in a couple of minutes.';editSetup()}catch(e){$('#ma_msg').textContent='Not saved: '+e.message}};
  const maa=$('#ma_add');if(maa)maa.onclick=()=>{const m=(gv('ma_in').match(/(?:manga\/)?(\d+)/)||[])[1];if(!m){$('#ma_msg').textContent='Paste a MAL manga link or its number.';return}
    const id=+m;const L=SET.manga_allow||[];if(L.includes(id)){$('#ma_msg').textContent='Already approved.';return}saveAllow([...L,id],'Approve manga '+id)};
  document.querySelectorAll('[data-ma]').forEach(a=>a.onclick=e=>{e.preventDefault();const id=+a.dataset.ma;saveAllow((SET.manga_allow||[]).filter(x=>x!==id),'Unapprove manga '+id)});
  {const a=$('#mq_now');if(a)a.onclick=()=>malFlush(true);const b=$('#mq_hour');if(b)b.onclick=()=>{store.set('mal_sync_setup',1);malConnect()}}
  $('#malc').onclick=malConnect;const mx=$('#malx');if(mx)mx.onclick=()=>{MALA.t=null;closeM();toast('MAL disconnected on this device')};
  const off=$('#tokoff');if(off)off.onclick=()=>{ED.on=false;closeM();syncEditBtn();render()};
  const del=$('#tokdel');if(del)del.onclick=()=>{ED.token='';ED.on=false;store.set('owner',false);store.set('drpw','');DR=null;try{sessionStorage.removeItem('sc_drpw')}catch(x){}closeM();syncEditBtn();render();toast('Token removed from this browser')};
}
const OWNER=()=>!!store.get('owner',false)||!!ED.token;
function syncEditBtn(){const b=$('#editbtn');if(b){b.style.display=OWNER()?'':'none';b.classList.toggle('on',ED.on);b.title=ED.on?'Editing is on':'Edit mode'}}
const fld=(id,label,val,type,extra)=>`<label class="ef"><span>${label}</span>${type==='textarea'?`<textarea id="${id}" rows="4">${esc(val||'')}</textarea>`:type&&type.startsWith('select:')?`<select id="${id}">${type.slice(7).split('|').map(o=>{const [v,l]=o.split('=');return `<option value="${esc(v)}" ${String(val)===v?'selected':''}>${esc(l||v)}</option>`}).join('')}</select>`:`<input id="${id}" type="${type||'text'}" value="${esc(val==null?'':val)}" ${extra||''}>`}</label>`;
const gv=id=>{const el=$('#'+id);return el?el.value.trim():''};
const list=s=>s.split(',').map(x=>x.trim()).filter(Boolean);
const today=()=>new Date().toISOString().slice(0,10);
function rebuildGames(){games.length=0;D.games.forEach((g,i)=>games.push(Object.assign({i,n:norm(g.t+' '+(g.fr||[]).join(' '))},g,{img:g.img||(D.gameCovers||{})[g.id]||''},GDEF(g))))}
function rebuildBooks(){books.length=0;D.books.forEach((b,i)=>books.push(Object.assign({},b,{img:b.img||BCOV[b.id]||'',i,title:b.t,n:norm(b.t+' '+b.a+' '+(b.sh||[]).join(' '))})))}
async function ghLoad(path){
  const r=await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=main&_=${Date.now()}`,{headers:{Authorization:'Bearer '+ED.token,Accept:'application/vnd.github.raw+json'},cache:'no-store'});
  if(!r.ok)throw new Error('Could not read the latest copy ('+r.status+')');return r.json();
}
async function persist(kind,msg,id,del){
  toast('Saving…');
  try{
    // start from the newest saved file so changes made elsewhere (or by updates) are never lost
    const path=kind==='games'?'data/games.json':'data/books.json',key=kind==='games'?'games':'books';
    const cur=await ghLoad(path);const L=cur[key]||[];const mine=D[key].find(x=>x.id===id);
    const at=L.findIndex(x=>x.id===id);
    if(del){if(at>=0)L.splice(at,1)}else if(mine){if(at>=0)L[at]=mine;else L.unshift(mine)}
    if(kind==='games'){cur.gvFav=D.gvFav;cur.gvProfile=cur.gvProfile||D.gvProfile}
    cur[key]=L;await ghSave(path,cur,msg);
    D[key].length=0;L.forEach(x=>D[key].push(x));if(kind==='games')rebuildGames();else rebuildBooks();render();
    toast('Saved. The live site updates in about a minute.');
  }catch(e){toast('Not saved: '+e.message,true)}
}
function editGame(g){
  const isNew=!g||!!g.__new;g=g||{};
  modal('games',isNew?'Add game':'Edit game',`<div style="grid-column:1/-1"><h2>${isNew?'Add a game':esc(g.t)}</h2>
  ${isNew?`<div class="ef" style="margin-bottom:10px"><span>Find it (fills in the details)</span><div style="display:flex"><input id="g_q" placeholder="Game title" value="${esc(g.t||'')}" style="flex:1"><button class="btn" id="g_find" style="border-radius:0">Find</button></div><div id="g_res" class="small"></div></div>`:''}<div class="eform">
  ${fld('e_t','Title',g.t)}
  ${fld('e_shelf','Shelf',g.shelf||'Backlog','select:Playing|Replaying|Played|Backlog|Wish List|Retired')}
  ${fld('e_r','Your rating (0 to 5)',g.r||0,'number','min="0" max="5" step="0.5"')}
  ${fld('e_rp','Times replayed',g.rp||0,'number','min="0" step="1"')}
  ${fld('e_hrs','Hours played',g.hrsEst?'':(g.hrs||''),'number','min="0" step="0.5"'+(g.hrsEst&&g.hrs?' placeholder="≈ '+g.hrs+' (estimate, type your own)"':''))}
  <div class="ef" style="grid-column:1/-1"><span>DLC</span><div class="small muted" id="e_dds" style="margin-bottom:6px"></div><div id="e_dlcs" class="dlcgrid"></div><div style="display:flex;margin-top:6px"><input id="e_dlcn" placeholder="Missing one? Type its name" style="flex:1"><button class="btn" id="e_dlca" type="button" style="border-radius:0">Add</button></div></div>
  ${fld('e_pf','Platforms (comma separated)',(g.pf||[]).join(', '))}
  ${fld('e_g','Genres (comma separated)',(g.g||[]).join(', '))}
  ${fld('e_dev','Developer',(g.dev||[]).join(', '))}
  ${fld('e_rel','Release date',g.rel||'','date')}
  ${fld('e_rvt','Review title',g.rvt)}
  ${fld('e_rv','Review',g.rv,'textarea')}
  ${fld('e_img','Cover image link (optional, leave empty for the automatic cover)',!isNew&&D.games[g.i]?D.games[g.i].img||'':g.img||'','url','placeholder="https://..."')}
  <label class="ef"><span>Favourite</span><select id="e_fav"><option value="0">No</option><option value="1" ${D.gvFav.includes(g.t)?'selected':''}>Yes</option></select></label>
  </div><div class="small" id="e_err" style="color:var(--s4)"></div>
  <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="e_save">${isNew?'Add game':'Save changes'}</button>${isNew?'':'<button class="btn" id="e_del" style="margin-left:auto;color:var(--s4)">Delete</button>'}</div></div>`);
  let DL=(g.dlcs||[]).map(d=>({...d}));
  const drawD=()=>{$('#e_dds').textContent=DL.length?`Tap the ones you've played · ${DL.filter(d=>d.p).length} of ${DL.length} played`:'No story DLC known for this game. New ones are picked up each week, or add one below.';
    $('#e_dlcs').innerHTML=DL.map((d,i)=>dlcTile(d,i,true)).join('');
    document.querySelectorAll('[data-dp]').forEach(c=>c.onclick=e=>{if(e.target.closest('[data-dx]'))return;e.preventDefault();DL[+c.dataset.dp].p=DL[+c.dataset.dp].p?0:1;drawD()});
    document.querySelectorAll('[data-dx]').forEach(b=>b.onclick=e=>{e.preventDefault();DL.splice(+b.dataset.dx,1);drawD()})};
  drawD();$('#e_dlca').onclick=()=>{const n=gv('e_dlcn').trim();if(!n)return;DL.push({n,p:0,mine:1,img:'',base:g.img||''});$('#e_dlcn').value='';drawD()};
  const gf=$('#g_find');if(gf)gf.onclick=async()=>{const q=gv('g_q');if(!q)return;$('#g_res').textContent='Searching…';
    try{const L=await viaApi('games',q);$('#g_res').innerHTML=L&&L.length?L.slice(0,6).map((x,i)=>`<a class="link" href="#games" data-gp="${i}" style="display:block;padding:4px 0">${esc(x.t)} ${x.y?'('+x.y+')':''} · ${esc(x.meta)}</a>`).join(''):'Nothing found. Fill it in by hand.';
      document.querySelectorAll('[data-gp]').forEach(a=>a.onclick=e=>{e.preventDefault();const x=L[+a.dataset.gp];$('#e_t').value=x.t;$('#e_pf').value=(x.pf||[]).join(', ');$('#e_g').value=(x.g||[]).join(', ');$('#e_dev').value=(x.dev||[]).join(', ');if(x.rel)$('#e_rel').value=x.rel;$('#e_img').value=x.img||'';$('#g_res').textContent='Filled in. Check it and save.'})}
    catch(e){$('#g_res').textContent='Search failed. Fill it in by hand.'}};
  const SHX=new Set(['read','currently-reading','to-read']);
  let SH=[...new Set(books.flatMap(x=>x.sh||[]).filter(x=>!SHX.has(x)))].sort();let MY=new Set(($('#e_shl')?(typeof b!=='undefined'?(b.sh||[]):[]):[]).filter(x=>!SHX.has(x)));
  const drawSh=()=>{$('#e_shs').textContent=MY.size?[...MY].join(', ')+' ▾':'Choose shelves ▾';
    $('#e_shl').innerHTML=SH.map(x=>`<label class="shrow"><input type="checkbox" value="${esc(x)}" ${MY.has(x)?'checked':''}> ${esc(x)}</label>`).join('')||'<span class="muted small">No shelves yet.</span>';
    $('#e_shl').querySelectorAll('input').forEach(c=>c.onchange=()=>{c.checked?MY.add(c.value):MY.delete(c.value);$('#e_sh').value=[...MY].join(', ');$('#e_shs').textContent=MY.size?[...MY].join(', ')+' ▾':'Choose shelves ▾'})};
  if($('#e_shl')){drawSh();$('#e_sha').onclick=()=>{const n=gv('e_shn').toLowerCase().replace(/\s+/g,'-');if(!n)return;if(!SH.includes(n))SH.push(n);MY.add(n);$('#e_shn').value='';$('#e_sh').value=[...MY].join(', ');drawSh()}}
  {const sh=$('#e_shelf');if(sh)sh.addEventListener('change',()=>{const h=$('#e_hrs');if(sh.value==='Played'&&h&&!h.value&&g&&g.avg)h.value=g.avg})}
  $('#e_save').onclick=()=>{
    const t=gv('e_t');if(!t){$('#e_err').textContent='Give it a title.';return}
    const raw=isNew?{id:Date.now(),u:'',fr:[],pub:[],log:[],shelves:[],rvd:''}:D.games[g.i];
    const oldT=raw.t;const shelf=gv('e_shelf');
    if(isNew||raw.shelf!==shelf)raw.added=today();
    if(!isNew&&((raw.shelf==='Replaying'&&shelf!=='Replaying'&&shelf!=='Wish List'&&shelf!=='Backlog')||(+gv('e_rp')||0)>(raw.rp||0))){raw.rpd=today();raw.added=today()}
    Object.assign(raw,{img:gv('e_img'),t,shelf,shelves:[shelf],r:+gv('e_r')||0,pf:list(gv('e_pf')),g:list(gv('e_g')),dev:list(gv('e_dev')),rel:gv('e_rel'),rvt:gv('e_rvt'),rv:gv('e_rv'),rp:+gv('e_rp')||0,dlcs:DL.filter(d=>d.p||d.mine).map(d=>({n:d.n,p:d.p?1:0}))});
    const nh=+gv('e_hrs')||0;if(nh){raw.hrs=nh;delete raw.hrsEst}else if(gv('e_hrs')===''&&!raw.hrsEst){delete raw.hrs}
    if(raw.rv&&!raw.rvd)raw.rvd=today();
    if(isNew)D.games.unshift(raw);
    D.gvFav=D.gvFav.filter(n=>n!==oldT&&n!==t);if(gv('e_fav')==='1')D.gvFav.push(t);
    rebuildGames();closeM();render();persist('games',(isNew?'Add game: ':'Edit game: ')+t,raw.id);
  };
  const d=$('#e_del');if(d)d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to delete';return}
    D.games.splice(g.i,1);D.gvFav=D.gvFav.filter(n=>n!==g.t);rebuildGames();closeM();render();persist('games','Delete game: '+g.t,g.id,true)};
}
function editBook(b){
  const isNew=!b||!!b.__new;b=b||{};
  modal('books',isNew?'Add book':'Edit book',`<div style="grid-column:1/-1"><h2>${isNew?'Add a book':esc(b.t)}</h2>
  ${isNew?`<div class="ef" style="margin-bottom:10px"><span>Find it (fills in the details)</span><div style="display:flex"><input id="e_q" placeholder="Title or author" style="flex:1"><button class="btn" id="e_find" style="border-radius:0">Find</button></div><div id="e_res" class="small"></div></div>`:''}
  <div class="eform">
  ${fld('e_t','Title',b.t)}
  ${fld('e_ur','Urdu title (optional)',b.ur)}
  ${fld('e_a','Author',b.a)}
  ${fld('e_st','Status',b.st||'toread','select:read=Read|reading=Reading|toread=Want to read|dnf=Did not finish|hold=On hold')}
  ${fld('e_r','Your rating (0 to 5)',b.r||0,'number','min="0" max="5" step="0.25"')}
  ${fld('e_p','Pages',b.p||'','number','min="0"')}
  ${fld('e_y','First published (year)',b.y||'','number')}
  ${fld('e_dr','Date finished',b.dr||'','date')}
  ${fld('e_rr','Times reread',b.rr||0,'number','min="0" step="1"')}
  <div class="ef" style="grid-column:1/-1"><span>Shelves</span><input type="hidden" id="e_sh" value="${esc((b.sh||[]).join(', '))}"><details class="shdd"><summary id="e_shs"></summary><div id="e_shl" class="shl"></div><div style="display:flex;margin-top:8px"><input id="e_shn" placeholder="New shelf name" style="flex:1"><button class="btn" type="button" id="e_sha" style="border-radius:0">Create</button></div></details></div>
  ${fld('e_rv','Review',b.rv,'textarea')}
  ${fld('e_img','Cover image link (optional)',!isNew&&D.books[b.i]?D.books[b.i].img||'':b.img||'','url','placeholder="https://..."')}<div class="ef"><span>Or your own picture</span><div style="display:flex;gap:8px;align-items:center"><button type="button" class="btn" id="e_up">Upload a cover</button><span class="small muted" id="e_upm"></span></div><input type="file" id="e_upf" accept="image/*" hidden></div></div>
  <div class="small" id="e_err" style="color:var(--s4)"></div>
  <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="e_save">${isNew?'Add book':'Save changes'}</button>${isNew?'':'<button class="btn" id="e_del" style="margin-left:auto;color:var(--s4)">Delete</button>'}</div></div>`);
  const f=$('#e_find');if(f)f.onclick=async()=>{const q=gv('e_q');if(!q)return;$('#e_res').textContent='Searching…';
    try{const r=await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,first_publish_year,cover_i,number_of_pages_median`).then(r=>r.json());
      const docs=r.docs||[];$('#e_res').innerHTML=docs.length?docs.map((d,i)=>`<a class="link" href="#books" data-pick="${i}" style="display:block;padding:4px 0">${esc(d.title)} · ${esc((d.author_name||[])[0]||'')} ${d.first_publish_year||''}</a>`).join(''):'Nothing found. Fill it in by hand.';
      document.querySelectorAll('[data-pick]').forEach(a=>a.onclick=e=>{e.preventDefault();const d=docs[+a.dataset.pick];$('#e_t').value=d.title;$('#e_a').value=(d.author_name||[])[0]||'';$('#e_y').value=d.first_publish_year||'';$('#e_p').value=d.number_of_pages_median||'';$('#e_img').value=d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`:'';$('#e_res').textContent='Filled in. Check it and save.'});
    }catch(e){$('#e_res').textContent='Search failed. Fill it in by hand.'}};
  const SHX=new Set(['read','currently-reading','to-read']);
  let SH=[...new Set(books.flatMap(x=>x.sh||[]).filter(x=>!SHX.has(x)))].sort();let MY=new Set(($('#e_shl')?(typeof b!=='undefined'?(b.sh||[]):[]):[]).filter(x=>!SHX.has(x)));
  const drawSh=()=>{$('#e_shs').textContent=MY.size?[...MY].join(', ')+' ▾':'Choose shelves ▾';
    $('#e_shl').innerHTML=SH.map(x=>`<label class="shrow"><input type="checkbox" value="${esc(x)}" ${MY.has(x)?'checked':''}> ${esc(x)}</label>`).join('')||'<span class="muted small">No shelves yet.</span>';
    $('#e_shl').querySelectorAll('input').forEach(c=>c.onchange=()=>{c.checked?MY.add(c.value):MY.delete(c.value);$('#e_sh').value=[...MY].join(', ');$('#e_shs').textContent=MY.size?[...MY].join(', ')+' ▾':'Choose shelves ▾'})};
  if($('#e_shl')){drawSh();$('#e_sha').onclick=()=>{const n=gv('e_shn').toLowerCase().replace(/\s+/g,'-');if(!n)return;if(!SH.includes(n))SH.push(n);MY.add(n);$('#e_shn').value='';$('#e_sh').value=[...MY].join(', ');drawSh()}}
  {const st=$('#e_st');if(st)st.addEventListener('change',()=>{if(st.value==='read'&&$('#e_dr')&&!$('#e_dr').value)$('#e_dr').value=new Date().toISOString().slice(0,10)})}
  {const u=$('#e_up');if(u){u.onclick=()=>$('#e_upf').click();$('#e_upf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('#e_upm').textContent='Uploading…';
    try{const {path}=await uploadPic(f,'book-'+(b.id||'new'),'b');$('#e_img').value=path;$('#e_upm').textContent='Uploaded. Save to keep it.'}catch(err){$('#e_upm').textContent='Not uploaded: '+err.message}}}}
  $('#e_save').onclick=()=>{
    const t=gv('e_t');if(!t){$('#e_err').textContent='Give it a title.';return}
    const raw=isNew?{id:'s'+Date.now(),d:today()}:D.books[b.i];
    const st=gv('e_st'),rr=+gv('e_rr')||0;
    if(!isNew&&raw.st!==st)raw.sd=today();
    if(rr>(raw.rr||0)){raw.rrd=today();if(st==='read'&&gv('e_dr')===(raw.dr||''))$('#e_dr').value=today()}
    raw.rr=rr;
    Object.assign(raw,{t,ur:gv('e_ur'),a:gv('e_a'),st,r:+gv('e_r')||0,p:+gv('e_p')||0,y:+gv('e_y')||0,dr:gv('e_dr')||(st==='read'&&raw.st!=='read'?today():raw.dr||''),sh:list(gv('e_sh')),rv:gv('e_rv'),img:gv('e_img')});
    if(isNew)D.books.unshift(raw);
    rebuildBooks();closeM();render();persist('books',(isNew?'Add book: ':'Edit book: ')+t,raw.id);
  };
  const d=$('#e_del');if(d)d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to delete';return}
    D.books.splice(b.i,1);rebuildBooks();closeM();render();persist('books','Delete book: '+b.t,b.id,true)};
}

