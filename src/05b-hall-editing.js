/* ---------- Hall of Fame editing on the site ----------
   Lists are named by a ref:  b:<blog>:<section> (honorary, character corner, waifus; data/hof.json),
   c / sp (couples, special couples; data/hof.json), mf:<key> (music favourites; data/music_favs.json),
   gv (favourite games; data/games.json), ov:<kind> (Overview favourites; data/ovfavs.json).
   Once anything in data/hof.json is edited here it is marked siteEdited, and the nightly update
   stops reading the MAL blogs, so the site is the source from then on. */
// which page a blog section belongs on: its own mark, otherwise its title
const hSeg=(s,gi)=>s[3]||(gi!==0?'':/manga/i.test(s[0])?'m':/character/i.test(s[0])?'c':/anime/i.test(s[0])?'a':'');
const hCode=x=>`${x.k}${x.id}~${String(x.name||'').replace(/~/g,' ')}${x.img?'~'+x.img:''}`;
const hDelBtn=(ref,pos)=>`<button type="button" class="favx" data-hdel="${ref}|${pos}" aria-label="Remove">✕</button>`;
const hTools=ref=>`<span class="htools"><button class="btn" data-hadd="${ref}">＋ Add</button><button class="btn" data-hord="${ref}">⇅ Reorder</button>${ref.startsWith('b:')?`<button class="btn" data-hsec="${ref}">✎ Section</button>`:''}</span>`;
function hofList(H,ref){const p=ref.split(':');
  if(p[0]==='b'){const s=((H.blog[+p[1]]||{}).secs||[])[+p[2]];return s?s[2]:null}
  if(p[0]==='c')return H.couples;if(p[0]==='sp')return H.specialCouples.pairs;return null}
function hofRedraw(){if(route!=='hof')return;const y=scrollY;rHof();scrollTo(0,y)}
// save a change to data/hof.json, starting from the newest copy on GitHub
async function hofSave(fn,msg){toast('Saving…');
  try{let base;try{base=await ghLoad('data/hof.json')}catch(e){base=JSON.parse(JSON.stringify(D.hof))}
    if(fn(base)===false)return false;base.siteEdited=1;await ghSave('data/hof.json',base,msg);D.hof=base;toast('Saved.');hofRedraw();return true}
  catch(e){toast('Not saved: '+e.message,true);return false}}
// the items of a list, as name + picture, for the reorder window
function hofRows(ref){
  if(ref.startsWith('mf:'))return (MF[ref.slice(3)]||[]).map(x=>({label:x.t||x.n,img:x.img||''}));
  if(ref==='gv')return D.gvFav.map(n=>{const g=games.find(x=>x.t===n);return {label:n,img:g&&g.img||''}});
  const L=hofList(D.hof,ref)||[];
  if(ref==='c'||ref==='sp')return L.map(([n,show,cs])=>{const [kid,,pic]=(cs[0]||'').split('~');return {label:n+(show?' · '+show:''),img:pic||HIMG(kid&&kid[0],+String(kid).slice(1))}});
  return L.map(c=>{const [kid,n,pic]=c.split('~');return {label:n,img:pic||HIMG(kid[0],+kid.slice(1))}})}
function reorderModal(title,rows,onSave){let L=rows.map((x,i)=>Object.assign({i},x));
  modal('anime',title,`<div style="grid-column:1/-1"><h2>${esc(title)}</h2><div class="small muted">Move with ▲ ▼ (or Top), then save.</div><div id="ro_l" class="rolist"></div>
  <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="ro_s">Save order</button><button class="btn" id="ro_c">Cancel</button></div></div>`);
  const draw=()=>{$('#ro_l').innerHTML=L.map((x,j)=>`<div class="rorow"><span class="mono muted">${j+1}</span>${x.img?`<img src="${esc(LOC(x.img))}" alt="" referrerpolicy="no-referrer">`:'<i></i>'}<span class="ron">${esc(x.label)}</span><button class="btn" data-ro="${j}:top" ${j?'':'disabled'}>Top</button><button class="btn" data-ro="${j}:-1" ${j?'':'disabled'}>▲</button><button class="btn" data-ro="${j}:1" ${j<L.length-1?'':'disabled'}>▼</button></div>`).join('');
    document.querySelectorAll('[data-ro]').forEach(b=>b.onclick=()=>{const [j,d]=b.dataset.ro.split(':');const a=+j,x=L.splice(a,1)[0];L.splice(d==='top'?0:a+(+d),0,x);const y=$('#ro_l').scrollTop;draw();$('#ro_l').scrollTop=y})};
  draw();$('#ro_c').onclick=closeM;
  $('#ro_s').onclick=async()=>{if(L.every((x,j)=>x.i===j))return closeM();if(await onSave(L.map(x=>x.i)))closeM()}}
// put items in a new order; anything added elsewhere in the meantime stays, at the end
const reordered=(cur,old,order)=>{const key=x=>JSON.stringify(x);const want=order.map(i=>old[i]).filter(x=>x!=null);const ks=new Set(want.map(key));return [...want.filter(x=>cur.some(y=>key(y)===key(x))),...cur.filter(x=>!ks.has(key(x)))]};
async function hofReorder(ref){
  const title='Reorder · '+(ref.startsWith('mf:')?MFS.find(s=>s[0]===ref.slice(3))[1]:ref==='gv'?'Favourite games':ref==='c'?'Favourite anime couples':ref==='sp'?'A special mention':hofList(D.hof,ref)?D.hof.blog[+ref.split(':')[1]].secs[+ref.split(':')[2]][0]:'');
  reorderModal(title,hofRows(ref),async order=>{
    if(ref.startsWith('mf:')){const k=ref.slice(3),L=MF[k]||[];return saveMF({[k]:order.map(i=>L[i])},'Music favourites: reorder')}
    if(ref==='gv'){D.gvFav=order.map(i=>D.gvFav[i]);persist('games','Reorder favourite games','');return true}
    const old=hofList(D.hof,ref).slice();
    return hofSave(H=>{const L=hofList(H,ref);if(!L)return false;const n=reordered(L,old,order);L.length=0;L.push(...n)},'Hall of Fame: reorder')})}
async function hofDel(ref,pos,btn){
  if(btn.dataset.sure!=='1'){btn.dataset.sure='1';btn.textContent='Remove?';btn.classList.add('sure');setTimeout(()=>{if(btn.isConnected){btn.dataset.sure='';btn.textContent='✕';btn.classList.remove('sure')}},3000);return}
  if(ref==='gv'){const n=D.gvFav[pos];D.gvFav=D.gvFav.filter(x=>x!==n);persist('games','Remove '+n+' from favourite games','');return}
  const x=(hofList(D.hof,ref)||[])[pos];if(x==null)return;const key=JSON.stringify(x);
  hofSave(H=>{const L=hofList(H,ref);const i=L?L.findIndex(y=>JSON.stringify(y)===key):-1;if(i<0)return false;L.splice(i,1)},'Hall of Fame: remove '+(Array.isArray(x)?x[0]:x.split('~')[1]))}
// search for something to add: characters and people come from Jikan (MAL's public mirror), anime and manga from the usual search
const HKIND={c:'Characters',p:'People',a:'Anime',m:'Manga'};
function pickHof(kinds,title,onPick){let k=kinds[0];
  modal('anime',title,`<div style="grid-column:1/-1"><h2>${esc(title)}</h2>${kinds.length>1?`<div class="mseg" id="hp_k">${kinds.map(x=>`<button data-hk="${x}" class="${x===k?'on':''}">${HKIND[x]}</button>`).join('')}</div>`:''}
  <form id="hp_f" style="display:flex;margin-top:12px"><input id="hp_q" placeholder="Search by name (English or Japanese)" style="flex:1;border:1px solid var(--line2);padding:10px 12px;background:var(--panel);outline:none"><button class="btn pri" style="border-radius:0">Search</button></form>
  <div id="hp_res" style="margin-top:12px"><div class="small muted">Ones already on your site show first, then all of MyAnimeList.</div></div></div>`);
  document.querySelectorAll('[data-hk]').forEach(b=>b.onclick=()=>{k=b.dataset.hk;document.querySelectorAll('[data-hk]').forEach(x=>x.classList.toggle('on',x===b));if(gv('hp_q'))go()});
  const nm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  const tile=(x,i,src)=>`<button type="button" class="ptile" data-hp="${src}:${i}">${cover(x.name,x.img||'','',x.k==='c'||x.k==='p'?'':'')}<span class="pn">${esc(x.name)}</span><span class="ps">${esc(x.sub||'')}</span></button>`;
  const go=async()=>{const q=gv('hp_q');if(!q)return;const box=$('#hp_res'),W=nm(q).split(' '),m=s=>W.every(w=>nm(s).includes(w)),kk=k;
    const seen=new Set(),mine=[];const add=(id,name,img,sub)=>{if(seen.has(id)||!m(name))return;seen.add(id);mine.push({k:kk,id,name,img,sub})};
    if(kk==='a'||kk==='m')(kk==='a'?anime:manga).forEach(x=>add(x.id,x.t,x.img,'in your list'));
    const H=D.hof;[...H.blog.flatMap(b=>b.secs.flatMap(s=>s[2])),...H.couples.flatMap(c=>c[2]),...H.specialCouples.pairs.flatMap(c=>c[2])].forEach(c=>{const [kid,n,pic]=c.split('~');if(kid[0]===kk)add(+kid.slice(1),n,pic||HIMG(kk,+kid.slice(1)),'on your site')});
    ((H.malFavs||{})[{a:'anime',m:'manga',c:'character',p:'people'}[kk]]||[]).forEach(([id,n])=>add(id,n,HIMG(kk,id),'MAL favourite'));
    const list=mine.slice(0,12);
    box.innerHTML=`${list.length?`<div class="small muted" style="margin-bottom:6px">On your site</div><div class="pgrid">${list.map((x,i)=>tile(x,i,'m')).join('')}</div>`:''}<div id="hp_ext" style="margin-top:14px"><div class="muted small"><span class="spin"></span>Searching MyAnimeList…</div></div>`;
    box.querySelectorAll('[data-hp^="m:"]').forEach(b=>b.onclick=()=>onPick(list[+b.dataset.hp.slice(2)]));
    let ext=[];
    try{if(kk==='c'||kk==='p'){const j=await fetch(`https://api.jikan.moe/v4/${kk==='c'?'characters':'people'}?q=${encodeURIComponent(q)}&limit=12&order_by=favorites&sort=desc`).then(r=>r.json());
        ext=(j.data||[]).map(x=>({k:kk,id:x.mal_id,name:x.name,img:((x.images||{}).jpg||{}).image_url||'',sub:[x.name_kanji||x.family_name&&x.given_name&&`${x.family_name} ${x.given_name}`,x.favorites?fmt(x.favorites)+' favourites':''].filter(Boolean).join(' · ')}))}
      else{const r=await viaApi(kk==='a'?'anime':'manga',q);ext=(r||[]).filter(x=>x.malId).map(x=>({k:kk,id:x.malId,name:x.t,img:x.img||'',sub:[x.meta&&x.meta.split(' · ')[0],x.y].filter(Boolean).join(' · ')}))}}catch(e){}
    ext=ext.filter(x=>!seen.has(x.id)).map(x=>(x.img=x.img&&!/questionmark/.test(x.img)?x.img.replace(/\?.*$/,''):'',x));
    const ex=$('#hp_ext');if(!ex||kk!==k)return;ex.innerHTML=ext.length?`<div class="small muted" style="margin-bottom:6px">On MyAnimeList</div><div class="pgrid">${ext.map((x,i)=>tile(x,i,'e')).join('')}</div>`:'<div class="muted small">Nothing more found. MyAnimeList may be busy, try again in a moment.</div>';
    ex.querySelectorAll('[data-hp^="e:"]').forEach(b=>b.onclick=()=>onPick(ext[+b.dataset.hp.slice(2)]))};
  $('#hp_f').onsubmit=e=>{e.preventDefault();go()};$('#hp_q').focus()}
function hofAdd(ref){
  if(ref.startsWith('mf:')){const t=document.querySelector(`[data-mfadd="${ref.slice(3)}"]`);if(t)t.click();return}
  if(ref==='gv')return pickGame();
  if(ref==='c'||ref==='sp')return addCouple(ref);
  const p=ref.split(':'),s=D.hof.blog[+p[1]].secs[+p[2]],seg=hSeg(s,+p[1]);
  const first=(s[2][0]||'')[0];const kinds=seg==='a'?['a']:seg==='m'?['m']:first==='p'||/\b(va|people|seiyuu)/i.test(s[0])?['p','c']:['c','p'];
  pickHof(kinds,'Add to '+s[0],x=>{const L=hofList(D.hof,ref);if(L.some(c=>c.startsWith(x.k+x.id+'~')))return toast('Already there.');
    hofSave(H=>{const T=hofList(H,ref);if(!T||T.some(c=>c.startsWith(x.k+x.id+'~')))return false;T.push(hCode(x))},'Hall of Fame: add '+x.name+' to '+s[0]).then(ok=>{if(ok)closeM()})})}
// a couple: pick both characters, then name it
function addCouple(ref){const st=[];
  const step=()=>pickHof(['c'],st.length?`Second character (with ${st[0].name})`:'First character of the couple',x=>{st.push(x);if(st.length<2)return step();
    const [a,b]=st,f=n=>String(n).split(' ')[0];
    modal('anime','Add a couple',`<div style="grid-column:1/-1"><h2>Add a couple</h2><div class="eform">${fld('cp_n','Couple name',f(a.name)+' and '+f(b.name))}${fld('cp_s','Anime',(D.charInfo&&D.charInfo[a.id]&&((D.charInfo[a.id].anime||[])[0]||[])[1])||'')}</div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn pri" id="cp_ok">Add couple</button></div></div>`);
    $('#cp_ok').onclick=()=>hofSave(H=>{(ref==='sp'?H.specialCouples.pairs:H.couples).push([gv('cp_n')||'Couple',gv('cp_s'),[hCode(a),hCode(b)]])},'Hall of Fame: add couple '+gv('cp_n')).then(ok=>{if(ok)closeM()})});
  step()}
function pickGame(){
  modal('games','Add a favourite game',`<div style="grid-column:1/-1"><h2>Add a favourite game</h2><input id="pg_q" placeholder="Filter your games" style="width:100%;margin-top:12px;border:1px solid var(--line2);padding:10px 12px;background:var(--panel);outline:none"><div id="pg_l" class="pgrid" style="margin-top:12px"></div></div>`);
  const draw=()=>{const n=norm(gv('pg_q'));const L=games.filter(g=>!D.gvFav.includes(g.t)&&(!n||norm(g.t).includes(n))).slice(0,40);
    $('#pg_l').innerHTML=L.map((g,i)=>`<button type="button" class="ptile" data-pg="${i}">${cover(g.t,g.img||'','')}<span class="pn">${esc(g.t)}</span><span class="ps">${esc(g.shelf||'')}</span></button>`).join('')||'<div class="muted small">No games match.</div>';
    document.querySelectorAll('[data-pg]').forEach(b=>b.onclick=()=>{const g=L[+b.dataset.pg];D.gvFav=[...D.gvFav,g.t];closeM();persist('games','Add '+g.t+' to favourite games','')})};
  $('#pg_q').oninput=draw;draw()}
// rename, describe or delete a blog section; or start a new one
function hofSection(ref){const p=ref.split(':'),s=D.hof.blog[+p[1]].secs[+p[2]];
  modal('anime','Section',`<div style="grid-column:1/-1"><h2>Section</h2><div class="eform">${fld('hs_t','Title',s[0])}${fld('hs_d','Description',s[1],'textarea')}</div>
  <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" id="hs_ok">Save</button><button class="btn" id="hs_del" style="margin-left:auto;color:var(--s4)">Delete section</button></div></div>`);
  const same=x=>x&&x[0]===s[0]&&JSON.stringify(x[2])===JSON.stringify(s[2]);
  $('#hs_ok').onclick=()=>hofSave(H=>{const t=H.blog[+p[1]].secs.find(same);if(!t)return false;const seg=hSeg(t,+p[1]);t[0]=gv('hs_t')||t[0];t[1]=gv('hs_d');if(seg&&!t[3])t[3]=seg},'Hall of Fame: edit section '+s[0]).then(ok=>{if(ok)closeM()});
  const d=$('#hs_del');d.onclick=()=>{if(d.dataset.sure!=='1'){d.dataset.sure='1';d.textContent=`Tap again to delete (${s[2].length} inside)`;return}
    hofSave(H=>{const L=H.blog[+p[1]].secs,i=L.findIndex(same);if(i<0)return false;L.splice(i,1)},'Hall of Fame: delete section '+s[0]).then(ok=>{if(ok)closeM()})}}
function hofNewSection(where){const [gi,seg]=where.split(':');
  modal('anime','New section',`<div style="grid-column:1/-1"><h2>New section</h2><div class="eform">${fld('hs_t','Title','')}${fld('hs_d','Description','','textarea')}</div>
  <div style="margin-top:12px"><button class="btn pri" id="hs_ok">Create</button></div></div>`);
  $('#hs_ok').onclick=()=>{const t=gv('hs_t');if(!t)return toast('Give it a title.',true);
    hofSave(H=>{H.blog[+gi].secs.push(seg?[t,gv('hs_d'),[],seg]:[t,gv('hs_d'),[]])},'Hall of Fame: new section '+t).then(ok=>{if(ok)closeM()})}}
function hofEditBind(){if(!ED.on)return;
  document.querySelectorAll('[data-hadd]').forEach(b=>b.onclick=()=>hofAdd(b.dataset.hadd));
  document.querySelectorAll('[data-hord]').forEach(b=>b.onclick=()=>hofReorder(b.dataset.hord));
  document.querySelectorAll('[data-hsec]').forEach(b=>b.onclick=()=>hofSection(b.dataset.hsec));
  document.querySelectorAll('[data-hnew]').forEach(b=>b.onclick=()=>hofNewSection(b.dataset.hnew));
  document.querySelectorAll('[data-hdel]').forEach(b=>b.onclick=e=>{e.stopPropagation();e.preventDefault();const [ref,pos]=b.dataset.hdel.split('|');hofDel(ref,+pos,b)})}

/* ---------- "Add to": every Overview and Hall of Fame list that fits a character, person, anime, manga, singer or song ---------- */
function addToLists(it){const H=D.hof,L=[];
  const blog=(gi,seg,grp)=>H.blog[gi].secs.forEach((s,si)=>{if(!seg||hSeg(s,gi)===seg)L.push({grp,label:s[0],ref:`b:${gi}:${si}`})});
  if(it.k==='c'||it.k==='p'){blog(0,'c','Hall · Honorary favourites');blog(1,'','Hall · Character corner');blog(2,'','Hall · Waifus')}
  if(it.k==='a'||it.k==='m'){L.push({grp:'Overview',label:it.k==='a'?'Favorite anime':'Favorite manga',ref:'ov:'+(it.k==='a'?'anime':'manga')});blog(0,it.k,'Hall · Honorary favourites')}
  if(it.k==='artist'){L.push({grp:'Overview',label:'Favorite singers',ref:'ov:singers'});MFS.filter(s=>s[2]==='artist').forEach(s=>L.push({grp:'Hall · Music',label:s[1],ref:'mf:'+s[0]}))}
  if(it.k==='song')MFS.filter(s=>s[2]==='song').forEach(s=>L.push({grp:'Hall · Music',label:s[1],ref:'mf:'+s[0]}));
  return L}
function addToHas(ref,it){
  if(ref.startsWith('ov:'))return ovFavList(ref.slice(3)).some(x=>String(x.id)===String(it.id));
  if(ref.startsWith('mf:'))return (MF[ref.slice(3)]||[]).some(x=>x.id===it.id);
  return (hofList(D.hof,ref)||[]).some(c=>c.startsWith(it.k+it.id+'~'))}
async function addToToggle(ref,it){const has=addToHas(ref,it);
  if(ref.startsWith('ov:')){const k=ref.slice(3),L=ovFavList(k);return saveOvFavs(k,has?L.filter(x=>String(x.id)!==String(it.id)):[...L,{id:it.id,t:it.name,img:it.img||''}],(has?'Take ':'Add ')+it.name+(has?' off':' to')+' overview favourites')}
  if(ref.startsWith('mf:')){const k=ref.slice(3),L=MF[k]||[];const x=it.k==='artist'?{id:it.id,t:it.name,img:it.img||''}:{id:it.id,n:it.name,ar:it.ar||[],al:it.al||'',img:it.img||'',ms:it.ms||0,y:it.y||''};
    return saveMF({[k]:has?L.filter(y=>y.id!==it.id):[...L,x]},'Music favourites: '+(has?'remove ':'add ')+it.name)}
  return hofSave(H=>{const T=hofList(H,ref);if(!T)return false;const i=T.findIndex(c=>c.startsWith(it.k+it.id+'~'));if(has){if(i<0)return false;T.splice(i,1)}else{if(i>=0)return false;T.push(hCode({k:it.k,id:it.id,name:it.name,img:it.img}))}},'Hall of Fame: '+(has?'remove ':'add ')+it.name)}
async function addToModal(it){await mfLoad();const L=addToLists(it);
  modal(it.k==='artist'||it.k==='song'?'music':'anime','Add to',`<div style="grid-column:1/-1"><h2>Add ${esc(it.name)} to…</h2><div class="small muted">Tap a list to add or take it off. ✓ means it's already there.</div><div id="at_l" style="margin-top:12px"></div></div>`);
  const draw=()=>{let g='';$('#at_l').innerHTML=L.map((x,i)=>{const h=g!==x.grp?`<div class="small muted" style="margin:12px 0 6px">${esc(x.grp)}</div>`:'';g=x.grp;const on=addToHas(x.ref,it);
      return `${h}<button type="button" class="atrow${on?' on':''}" data-at2="${i}"><b>${on?'✓':'＋'}</b><span>${esc(x.label)}</span></button>`}).join('')||'<div class="muted">No lists fit this one.</div>';
    document.querySelectorAll('[data-at2]').forEach(b=>b.onclick=async()=>{if(b.disabled)return;b.disabled=true;b.querySelector('b').innerHTML='<span class="spin"></span>';await addToToggle(L[+b.dataset.at2].ref,it);if($('#at_l'))draw()})};
  draw()}
// adds the "Add to" button to the window that is open (edit mode only)
function addToHook(it){if(!ED.on||!OWNER())return;const m=$('#modal');if(!m)return;const a=m.querySelector('a.btn[target="_blank"]');const row=a&&a.parentElement;if(!row||row.querySelector('[data-addto]'))return;
  const b=document.createElement('button');b.className='btn';b.dataset.addto=1;b.textContent='＋ Add to…';b.onclick=()=>addToModal(it);row.appendChild(b)}
