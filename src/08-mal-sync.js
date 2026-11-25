/* ---------- MAL connection (through the Cloudflare helper) ---------- */
const SITE_URL='https://satsugaideatsu.github.io/saturn-collections/';
const MALA={get t(){return store.get('mal_auth',null)},set t(v){store.set('mal_auth',v)},get on(){return !!(this.t&&this.t.refresh_token)}};
function malConnect(){
  const v=Array.from(crypto.getRandomValues(new Uint8Array(48)),b=>('0'+b.toString(16)).slice(-2)).join('').slice(0,96);
  const st=Math.random().toString(36).slice(2);store.set('mal_pkce',{v,st});
  location.href=`https://myanimelist.net/v1/oauth2/authorize?response_type=code&client_id=${SET.malClientId}&code_challenge=${v}&code_challenge_method=plain&state=${st}&redirect_uri=${encodeURIComponent(SITE_URL)}`;
}
/* the hourly sync's own MAL sign-in, locked with the passphrase you saved in GitHub as MAL_SYNC_KEY */
async function malSyncSave(rt,file){
  let pass=prompt('Type the same passphrase you saved in GitHub as MAL_SYNC_KEY:');pass=pass&&pass.trim();if(!pass){toast('Hourly sync not set up (no passphrase).',true);return}
  const enc=new TextEncoder(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const base=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:200000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(rt)));
  const b64=u=>btoa(String.fromCharCode(...u));
  try{await ghSave(file||'data/mal_sync.json',{salt:b64(salt),iv:b64(iv),ct:b64(ct),t:Date.now()},'Hourly MAL sync: sign-in (locked)');D.malSync=1;toast(file?'Almost done: GitHub is finishing the MAL sign-in. Check the pencil menu in about 2 minutes.':'Hourly MAL sync is set up.')}catch(e){toast('Could not save: '+e.message,true)}}
async function malFinish(){
  const p=new URLSearchParams(location.search);const code=p.get('code'),st=p.get('state');if(!code)return;
  history.replaceState(null,'',location.pathname+location.hash);
  const pk=store.get('mal_pkce',null);if(!pk||pk.st!==st){toast('MAL sign-in expired. Try again.',true);return}
  if(store.get('mal_sync_setup',0)){store.set('mal_sync_setup',0);await malSyncSave(JSON.stringify({code,v:pk.v,r:SITE_URL}),'data/mal_sync_code.json');return}
  try{const r=await fetch(SET.workerUrl+'/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,code_verifier:pk.v,redirect_uri:SITE_URL})});const j=await r.json();
    if(!r.ok||!j.access_token)throw new Error(j.message||j.error||'MAL said no');
    if(store.get('mal_sync_setup',0)){store.set('mal_sync_setup',0);await malSyncSave(j.refresh_token);return}
    MALA.t={...j,exp:Date.now()+(j.expires_in-60)*1000};toast('MyAnimeList connected')}
  catch(e){toast('MAL sign-in failed: '+(/JSON|token/i.test(e.message)?'MAL had a hiccup. Please tap the button and Allow again.':e.message),true)}
}
async function malToken(){const a=MALA.t;if(!a)throw new Error('Connect MAL first (pencil button).');if(Date.now()<a.exp)return a.access_token;
  const r=await fetch(SET.workerUrl+'/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:a.refresh_token})});const j=await r.json();
  if(!r.ok||!j.access_token){MALA.t=null;throw new Error('MAL sign-in expired. Connect again.')}MALA.t={...j,exp:Date.now()+(j.expires_in-60)*1000};return j.access_token}
/* ---------- site first, MAL second: edits save here, and wait for MAL if it is down ---------- */
const MQF='data/mal_queue.json';
function malApplyQ(){(D.malQ||[]).forEach(it=>{const L=it.k==='anime'?anime:manga;let x=L.find(e=>e.id===it.id);
  if(it.del){if(x)L.splice(L.indexOf(x),1);return}
  if(!x&&it.info){x=Object.assign({id:it.id,t:it.info.t,alt:'',img:it.info.img||'',type:it.info.type||'',y:it.info.y||'',g:it.info.g||[],mal:0,rw:0,rwing:0,tags:'',n:norm(it.info.t)},it.k==='anime'?{ep:0,eps:it.info.n||0}:{ch:0,chs:it.info.n||0,vol:0,vols:it.info.v||0});L.push(x)}
  if(x){if(it.s&&it.s.rw>(x.rw||0)){x.rwt=Math.floor((it.t||Date.now())/1000);x.up=Math.max(x.up||0,x.rwt)}Object.assign(x,it.s||{});x.pend=1}})}
async function malQueue(it){let cur;try{cur=await ghLoad(MQF)}catch(e){cur={q:[]}}cur.q=(cur.q||[]).filter(x=>!(x.k===it.k&&x.id===it.id));cur.q.push(it);
  await ghSave(MQF,cur,'MAL waiting list: '+(it.info&&it.info.t||it.k+' '+it.id));D.malQ=cur.q}
async function malUnqueue(done){if(!done.length)return;let cur;try{cur=await ghLoad(MQF)}catch(e){return}
  cur.q=(cur.q||[]).filter(x=>!done.some(d=>d.k===x.k&&d.id===x.id&&d.t===x.t));await ghSave(MQF,cur,'MAL waiting list: synced '+done.length);D.malQ=cur.q}
// try to send everything waiting (when the site is opened in edit mode)
async function malFlush(manual){const Q=(D.malQ||[]).slice();if(!Q.length||!MALA.on||!ED.token){if(manual)toast(!Q.length?'Nothing waiting.':!MALA.on?'This device is not connected to MAL: pencil → Connect MyAnimeList, then Sync now.':'Turn editing on first.',true);return}
  const done=[];let err='';for(const it of Q){try{await malSave(it.k,it.id,it.b,it.del);done.push(it)}catch(e){err=e.message||String(e);break}}
  if(done.length){await malUnqueue(done).catch(()=>{});malApplyQ();render();toast(`Synced ${done.length} change${done.length>1?'s':''} to MyAnimeList.`)}
  else if(manual){
    // MAL is often unreachable from some regions while working fine elsewhere: hand it to the sync job on GitHub
    if(D.malSync&&!/expired|Connect/i.test(err)){try{let cur=await ghLoad(MQF);cur.nudge=Date.now();await ghSave(MQF,cur,'MAL sync: try from GitHub');toast('MAL is not reachable from here right now, so GitHub will send it. Check again in about 2 minutes.')}catch(e){toast('Not synced yet: '+e.message,true)}}
    else toast('Not synced yet. MAL said: '+err+(/expired|Connect/i.test(err)?' (pencil → Connect MyAnimeList)':D.malSync?'':' · Set up hourly sync so GitHub can send it instead.'),true)}}
async function malSave(kind,id,body,del){
  const tok=await malToken();
  const r=await fetch(`${SET.workerUrl}/list/${kind}/${id}`,{method:del?'DELETE':'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:del?undefined:JSON.stringify(body)});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||j.error||('MAL error '+r.status))}
  if(ED.token){ghSave('data/mal_touch.json',{t:Date.now()},'Refresh after MAL edit').catch(()=>{})}
}
const AS={1:'watching',2:'completed',3:'on_hold',4:'dropped',6:'plan_to_watch'},MS={1:'reading',2:'completed',3:'on_hold',4:'dropped',6:'plan_to_read'};
function editMal(kind,x,fromSearch){
  if(x&&x.local)return editLocalManga(x);
  const isA=kind==='anime';const S=isA?AST:MST;const isNew=!x||!x.st;x=x||{};
  const md=((_MD||_MP)[isA?'a':'m']||{})[x.id||x.malId]||{};
  const tot=isA?(x.eps||md.n||0):(x.chs||md.n||0),totV=isA?0:(x.vols||md.v||0);
  modal(kind,(isNew?'Add to MAL · ':'Edit on MAL · ')+(isA?'Anime':'Manga'),`<div style="grid-column:1/-1"><h2>${esc(x.t||'')}</h2><div class="eform">
  ${fld('m_st','Status',String(x.st||6),'select:'+[1,2,3,4,6].map(k=>k+'='+S[k][0]).join('|'))}
  ${fld('m_sc','Your score (0 = none)',x.sc||0,'number','min="0" max="10" step="1"')}
  ${isA?fld('m_ep','Episodes watched'+(tot?' (of '+tot+')':''),x.ep||0,'number','min="0"'):fld('m_ch','Chapters read'+(tot?' (of '+tot+')':''),x.ch||0,'number','min="0"')}
  ${isA?'':fld('m_vol','Volumes read',x.vol||0,'number','min="0"')}
  ${fld('m_rw',isA?'Times rewatched':'Times reread',x.rw||0,'number','min="0"')}
  ${fld('m_tags','Your note (MAL tags)',x.tags||'','textarea')}
  </div><div class="small" id="m_err" style="color:var(--s4)"></div>
  <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn pri" id="m_save">${isNew?'Add to my list':'Save to MAL'}</button>${isNew?'':'<button class="btn" id="m_del" style="margin-left:auto;color:var(--s4)">Remove from list</button>'}</div></div>`);
  const sel=$('#m_st');sel.onchange=()=>{if(sel.value==='2'){if(tot){const f=$(isA?'#m_ep':'#m_ch');if(f)f.value=tot}if(totV&&$('#m_vol'))$('#m_vol').value=totV}};
  $('#m_save').onclick=async()=>{
    const st=+gv('m_st'),sc=+gv('m_sc')||0;const body={status:(isA?AS:MS)[st],score:sc,tags:gv('m_tags')};
    if(isA){body.num_watched_episodes=+gv('m_ep')||0;body.num_times_rewatched=+gv('m_rw')||0}else{body.num_chapters_read=+gv('m_ch')||0;body.num_volumes_read=+gv('m_vol')||0;body.num_times_reread=+gv('m_rw')||0}
    if(st===2){if(isA){if(tot&&body.num_watched_episodes<tot)body.num_watched_episodes=tot}else{if(tot&&body.num_chapters_read<tot)body.num_chapters_read=tot;if(totV&&body.num_volumes_read<totV)body.num_volumes_read=totV}}
    $('#m_save').textContent='Saving…';
    const id=x.id||x.malId,sv=Object.assign({st,sc,tags:body.tags},isA?{ep:body.num_watched_episodes,rw:body.num_times_rewatched}:{ch:body.num_chapters_read,vol:body.num_volumes_read,rw:body.num_times_reread},{up:Math.floor(Date.now()/1000)});
    try{await malSave(kind,id,body);
      if(!isNew)Object.assign(x,sv);delete x.pend;
      closeM();render();toast('Saved to MyAnimeList. The site catches up in a couple of minutes.')}
    catch(e){
      if(!ED.token){$('#m_err').textContent=e.message;$('#m_save').textContent=isNew?'Add to my list':'Save to MAL';return}
      // MAL did not take it: keep it on the site and let MAL catch up later
      const info=isNew?{t:x.t,img:x.img||'',type:x.type||x.meta||'',y:x.y||'',n:tot||0,v:totV||0,g:x.g||[]}:null;
      try{await malQueue({k:kind,id,b:body,s:sv,t:Date.now(),info});malApplyQ();closeM();render();toast(/Connect|expired|sign/i.test(e.message)?'Saved on your site. Your MAL sign-in on this device has expired: open the pencil and tap Connect MyAnimeList, then it will sync.':'Saved on your site. MyAnimeList isn\'t answering, so it will catch up automatically.',/Connect|expired|sign/i.test(e.message))}
      catch(e2){$('#m_err').textContent='Could not save: '+e2.message;$('#m_save').textContent=isNew?'Add to my list':'Save to MAL'}}
  };
  const d=$('#m_del');if(d)d.onclick=async()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to remove';return}
    try{await malSave(kind,x.id,null,true);const L=isA?anime:manga;const i=L.indexOf(x);if(i>=0)L.splice(i,1);closeM();render();toast('Removed from MyAnimeList')}
    catch(e){if(!ED.token){$('#m_err').textContent=e.message;return}try{await malQueue({k:kind,id:x.id,del:true,t:Date.now()});malApplyQ();closeM();render();toast('Removed on your site. MyAnimeList will catch up automatically.')}catch(e2){$('#m_err').textContent=e2.message}}};
}

function editLocalManga(x){
  modal('manga','Edit · kept on this site',`<div style="grid-column:1/-1"><h2>${esc(x.t)}</h2><div class="eform">
  ${fld('x_st','Status',String(x.st||6),'select:'+[1,2,3,4,6].map(k=>k+'='+MST[k][0]).join('|'))}
  ${fld('x_sc','Your score (0 = none)',x.sc||0,'number','min="0" max="10" step="1"')}
  ${fld('x_rw','Times reread',x.rw||0,'number','min="0"')}
  ${fld('x_note','Your note',x.tags||'','textarea')}
  </div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri" id="x_save">Save</button><button class="btn" id="x_del" style="margin-left:auto;color:var(--s4)">Remove</button></div></div>`);
  const save=async del=>{toast('Saving…');
    try{const cur=await ghLoad('data/manga_extra.json');cur.items=cur.items||[];const i=cur.items.findIndex(y=>y.id===x.id);
      if(del){if(i>=0)cur.items.splice(i,1)}else if(i>=0){Object.assign(cur.items[i],{st:+gv('x_st'),sc:+gv('x_sc')||0,rw:+gv('x_rw')||0,note:gv('x_note'),up:Math.floor(Date.now()/1000)});if(+gv('x_st')===2){const it=cur.items[i];if(it.vols)it.vol=it.vols;if(it.chs)it.ch=it.chs}}
      await ghSave('data/manga_extra.json',cur,(del?'Remove ':'Update ')+x.t);
      if(del){const k=manga.indexOf(x);if(k>=0)manga.splice(k,1)}else {Object.assign(x,{st:+gv('x_st'),sc:+gv('x_sc')||0,rw:+gv('x_rw')||0,tags:gv('x_note'),up:Math.floor(Date.now()/1000)});if(x.st===2){if(x.vols)x.vol=x.vols;if(x.chs)x.ch=x.chs}}
      closeM();render();toast('Saved.')}catch(e){toast('Not saved: '+e.message,true)}};
  $('#x_save').onclick=()=>save(false);
  const d=$('#x_del');d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent='Tap again to remove';return}save(true)};
}

