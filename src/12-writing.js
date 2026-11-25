/* ---------- writing: stories, articles, other, private drafts ---------- */
const WSEC=[['stories','Stories'],['wip','Works in progress'],['articles','Articles'],['other','Other']];
const WST={complete:'Complete',ongoing:'Ongoing',hiatus:'On hiatus'};
const PEN=()=>SET.penName||'Rajeel Javed';
let works=[];
function rebuildWorks(){works=(D.works||[]).slice();
  // a story posted on Medium is linked to its page here by title, so it isn't listed twice
  works.forEach(w=>{if(!w.medium){const s=(D.stories||[]).find(s=>norm(s.title)===norm(w.t));if(s)w.medium=s.link}})}
rebuildWorks();
const titleCase=t=>/[a-z]/.test(t)?t:t.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
const mediumOnly=()=>stories.filter(s=>!works.some(w=>w.medium&&w.medium.split('?')[0]===s.link.split('?')[0])).map(s=>({id:'m:'+s.link,t:titleCase(s.title),sec:(s.tags||[]).includes('articles')?'articles':'stories',st:'complete',date:s.date,tags:s.tags||[],blurb:s.blurb,words:s.words,medium:s.link,mo:1,chn:['']}));
let DR=null,DRPW='';
const wsS={sec:'stories'};
const wAll=()=>[...works,...(DR?DR.works:[])];
const wById=id=>wAll().find(w=>w.id===id);
const wMin=w=>Math.max(1,Math.round((w.words||0)/230));
const wKind=w=>w.sec==='articles'?'Article':w.sec==='other'?((w.tags||[]).includes('poem')?'Poem':'Short'):w.sec==='wip'?'Work in progress':'Story';
const wPinned=()=>works.filter(w=>w.pin).sort((a,b)=>a.pin-b.pin);
const wcount=h=>(String(h||'').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)||[]).length;
const chName=(w,i)=>{const L=w.chn||[];if(L[i])return L[i];let k=0;for(let j=0;j<=i;j++)if(!L[j])k++;return 'Chapter '+k};
const wSlug=t=>{const b=norm(t).replace(/ /g,'-').slice(0,60)||'piece';let s=b,i=2;while(wAll().some(w=>w.id===s))s=b+'-'+(i++);return s};
const autoBlurb=h=>{const d=document.createElement('div');d.innerHTML=h||'';const t=(d.textContent||'').replace(/\s+/g,' ').trim();if(t.length<=220)return t;return t.slice(0,220).replace(/\s+\S*$/,'')+'…'};
function wcover(w,extra){
  const c=PAL[hash(w.t||'?')%PAL.length];
  return `<div class="wcov" style="--tc:${c}">${w.cover?`<img data-src="${esc(w.cover)}" alt="" ${w.cp?`style="object-position:${esc(w.cp)}"`:''} onerror="this.remove()">`:''}<div class="wct"><span class="wk">${esc(wKind(w))}</span><b>${esc(w.t||'Untitled')}</b><i class="orn">❦</i><span class="wk">${esc(PEN())}</span></div>${w.priv?'<span class="wlock" title="Private draft">🔒</span>':''}${extra||''}</div>`;
}
function wcard(w){
  const n=(w.chn||['']).length,last=store.get('rd_'+w.id,0),own=ED.on&&!w.mo;
  const tags=(w.tags||[]).filter(t=>!/^(stories|articles|poem|short)$/i.test(t)).slice(0,4);
  return `<article class="wcard" data-w="${esc(w.id)}">${wcover(w)}<div class="wb">
    <div class="wkick">${fdate(w.date)} · ${esc(wKind(w))}${w.st!=='complete'?` · <span class="wip">${WST[w.st]||'Ongoing'}</span>`:''}</div>
    <h3>${esc(w.t)}</h3>
    <p>${esc(w.blurb||'')}${w.blurb&&!/[.!?…"”’)]$/.test(w.blurb.trim())?'…':''}</p>
    <div class="wmeta"><span>${n>1?n+' chapters · ':''}${fmt(w.words||0)} words · ${wMin(w)} min read</span>${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="wact">${w.mo?`<a class="btn pri" href="${esc(w.medium)}" target="_blank" rel="noopener">Read on Medium ↗</a>`:`<a class="btn pri" href="#read/${encodeURIComponent(w.id)}${n>1&&last>0?'/'+(last+1):''}">${n>1&&last>0?'Continue · '+esc(chName(w,last)):'Read'}</a>${w.medium?`<a class="btn" href="${esc(w.medium)}" target="_blank" rel="noopener">Medium ↗</a>`:''}`}
    ${own&&!w.priv?`<button class="btn wpin${w.pin?' on':''}" data-pin="${esc(w.id)}" title="${w.pin?'Take it off':'Put it on'} the Literary showcase">${w.pin?'★ Pinned':'☆ Pin'}</button>`:''}${own?`<button class="btn" data-wed="${esc(w.id)}">✎ Edit</button>`:''}</div>
  </div></article>`;
}
/* story page: completed stories open a details page first, like a book */
const wHasPage=w=>w&&!w.mo&&!w.priv&&w.sec==='stories'&&w.st==='complete';
function openWork(w){if(!w)return;if(w.mo)return void window.open(w.medium,'_blank','noopener');if(wHasPage(w))return openStory(w);location.hash='read/'+encodeURIComponent(w.id)}
const wTime=m=>m<60?m+' min':Math.floor(m/60)+' h'+(m%60?' '+m%60+' min':'');
function openStory(w){
  const n=(w.chn||['']).length,last=store.get('rd_'+w.id,0),id=encodeURIComponent(w.id);
  const gen=(w.gen&&w.gen.length?w.gen:(w.tags||[]).filter(t=>!/^(stories|articles|poem|short|fiction)$/i.test(t)));
  const chw=w.chw||[];
  /* chapter minutes share out the story's total, so they always add up to it */
  const chm=(()=>{const T=wMin(w),W=chw.reduce((a,b)=>a+b,0)||1,ex=chw.map(c=>c*T/W),m=ex.map(Math.floor);let left=T-m.reduce((a,b)=>a+b,0);
    ex.map((e,i)=>[e-m[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0){m[i]++;left--}});return m.map(x=>Math.max(1,x))})();
  modal('stories','Story',`<div class="mwcov">${wcover(w).replace('data-src=','src=')}</div><div><h2>${esc(w.t)}</h2><div class="muted">by ${esc(PEN())}</div>
  <div class="bigscore"><div><b>${fmt(w.words||0)}</b><small>Words</small></div><div><b>${wTime(wMin(w))}</b><small>To read</small></div><div><b>${n}</b><small>${n>1?'Chapters':'Chapter'}</small></div></div>
  <div class="kv">${gen.length?`<div>Genres</div><div>${gen.map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>`:''}<div>Status</div><div>Complete</div><div>Published</div><div>${fdate(w.date)}</div>${w.medium?`<div>Also on</div><div><a href="${esc(w.medium)}" target="_blank" rel="noopener">Medium ↗</a></div>`:''}</div>
  <div class="wsum">${esc(w.sum||w.blurb||'').split(/\n+/).map(x=>`<p>${x}</p>`).join('')}</div>
  ${n>1?`<div class="sect" style="--c:var(--story);margin-top:16px"><h2><i></i>Chapters <span class="muted mono">${n}</span></h2><ol class="wtoc">${(w.chn||[]).map((c,i)=>`<li><a href="#read/${id}/${i+1}"><span>${esc(chName(w,i))}</span><span class="muted mono small">${chw[i]?fmt(chw[i])+' words · '+wTime(chm[i]):''}</span></a></li>`).join('')}</ol></div>`:''}
  <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn pri" href="#read/${id}${n>1&&last>0?'/'+(last+1):''}">${n>1&&last>0?'Continue · '+esc(chName(w,last)):'Start reading'}</a>${n>1&&last>0?`<a class="btn" href="#read/${id}/1">From the start</a>`:''}${ED.on?`<button class="btn" id="m_wed">✎ Edit</button>`:''}</div></div>`);
  const e=$('#m_wed');if(e)e.onclick=()=>editWork(w);
}
/* private drafts: AES-GCM, key from the passphrase with PBKDF2-SHA256 (250k rounds) */
const u8=b=>Uint8Array.from(atob(b),c=>c.charCodeAt(0));
const b64u=a=>{const u=new Uint8Array(a);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
async function dkey(pw,salt){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:250000,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
const savedPw=()=>{try{return sessionStorage.getItem('sc_drpw')||store.get('drpw','')}catch(e){return store.get('drpw','')}};
async function drFetch(){if(ED.token){try{return await ghLoad('data/drafts.json')}catch(e){}}const r=await fetch('data/drafts.json?_='+Date.now(),{cache:'no-store'});if(!r.ok)return null;return r.json()}
async function unlockDrafts(pw){
  const f=await drFetch();
  if(!f||!f.data){DR={works:[]};DRPW=pw;return}
  const key=await dkey(pw,u8(f.salt));let pt;
  try{pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:u8(f.iv)},key,u8(f.data))}catch(e){throw new Error('That passphrase did not open them.')}
  DR=JSON.parse(new TextDecoder().decode(pt));DR.works=(DR.works||[]).map(w=>Object.assign(w,{priv:1}));DRPW=pw;
}
async function saveDrafts(pw){
  pw=pw||DRPW;if(!DR||!pw)throw new Error('Unlock your private drafts first.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await dkey(pw,salt);
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(DR)));
  await ghSave('data/drafts.json',{v:1,salt:b64u(salt),iv:b64u(iv),data:b64u(ct)},'Update private drafts');
}
async function tryAutoUnlock(){if(DR||!OWNER())return false;const pw=savedPw();if(!pw)return false;try{await unlockDrafts(pw);return true}catch(e){return false}}
/* GitHub helpers for removing files and saving pictures */
async function ghDelete(path,msg){
  const api=`https://api.github.com/repos/${REPO}/contents/${path}`,h={Authorization:'Bearer '+ED.token,Accept:'application/vnd.github+json'};
  const cur=await fetch(api+'?ref=main&_='+Date.now(),{headers:h,cache:'no-store'});if(cur.status===404)return;if(!cur.ok)throw new Error('GitHub error '+cur.status);
  const r=await fetch(api,{method:'DELETE',headers:h,body:JSON.stringify({message:msg,sha:(await cur.json()).sha,branch:'main'})});
  if(!r.ok&&r.status!==404){const e=await r.json().catch(()=>({}));throw new Error(e.message||('GitHub error '+r.status))}
}
async function ghPutB64(path,data,msg){
  const api=`https://api.github.com/repos/${REPO}/contents/${path}`,h={Authorization:'Bearer '+ED.token,Accept:'application/vnd.github+json'};
  const cur=await fetch(api+'?ref=main&_='+Date.now(),{headers:h,cache:'no-store'});const sha=cur.ok?(await cur.json()).sha:undefined;
  const r=await fetch(api,{method:'PUT',headers:h,body:JSON.stringify({message:msg,content:data,sha,branch:'main'})});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.message||('GitHub error '+r.status))}
}
function shrinkImg(src,max){return new Promise((res,rej)=>{const go=u=>{const im=new Image();im.onload=()=>{const k=Math.min(1,max/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.86))};im.onerror=()=>rej(new Error('That file is not a picture I can read.'));im.src=u};
  if(typeof src==='string')go(src);else{const r=new FileReader();r.onload=()=>go(r.result);r.onerror=()=>rej(r.error);r.readAsDataURL(src)}})}
async function uploadPic(src,base,dir){const url=await shrinkImg(src,1000);const path=`covers/${dir||'w'}/${base||'pic'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}.jpg`;await ghPutB64(path,url.split(',')[1],'Add a picture for writing');return{path,url}}
/* keep only the formatting a story needs; works for text pasted from Word, Google Docs or the web */
function cleanHTML(html,keepData){
  const src=new DOMParser().parseFromString('<body>'+html+'</body>','text/html').body;
  const out=document.createElement('div');let cur=null;
  const SKIP=/^(SCRIPT|STYLE|META|LINK|TITLE|HEAD|NOSCRIPT|IFRAME|OBJECT|EMBED|SVG|BUTTON|INPUT|SELECT|TEXTAREA|O:P|XML)$/;
  const BLOCK=/^(P|DIV|H[1-6]|BLOCKQUOTE|UL|OL|LI|HR|TABLE|TBODY|THEAD|TR|TD|TH|SECTION|ARTICLE|HEADER|FOOTER|MAIN|CENTER|FIGURE|PRE)$/;
  const INL={B:'strong',STRONG:'strong',I:'em',EM:'em',U:'u',S:'s',STRIKE:'s',DEL:'s',SUP:'sup',SUB:'sub'};
  const sty=n=>(n.getAttribute('style')||'').toLowerCase();
  const al=n=>{const a=(/text-align:\s*(center|right)/.exec(sty(n))||[])[1]||(n.getAttribute('align')||'').toLowerCase();if(n.tagName==='CENTER'||a==='center'||n.classList.contains('c'))return'c';if(a==='right'||n.classList.contains('r'))return'r';return''};
  const img=n=>{const p=n.getAttribute('data-path')||n.getAttribute('src')||'';if(!/^(covers\/|https:\/\/)/.test(p)&&!(keepData&&/^data:image\//.test(p)))return null;const e=document.createElement('img');e.setAttribute('src',p);e.setAttribute('alt',n.getAttribute('alt')||'');return e};
  function inl(n,dst){for(const c of Array.from(n.childNodes)){
    if(c.nodeType===3){const t=c.nodeValue.replace(/ /g,' ');if(t)dst.appendChild(document.createTextNode(t));continue}
    if(c.nodeType!==1||SKIP.test(c.tagName))continue;
    const T=c.tagName,s=sty(c);
    if(T==='BR'){dst.appendChild(document.createElement('br'));continue}
    if(T==='IMG'){const e=img(c);if(e)dst.appendChild(e);continue}
    if(T==='HR')continue;
    let d=dst,t=INL[T];
    if(T==='B'&&/font-weight:\s*(normal|[1-4]00)/.test(s))t=null; // Google Docs wraps everything in <b style="font-weight:normal">
    if(t){const e=document.createElement(t);dst.appendChild(e);d=e}
    else{if(/font-weight:\s*(bold|[6-9]00)/.test(s)){const e=document.createElement('strong');d.appendChild(e);d=e}if(/font-style:\s*italic/.test(s)){const e=document.createElement('em');d.appendChild(e);d=e}if(/text-decoration[^;]*underline/.test(s)){const e=document.createElement('u');d.appendChild(e);d=e}}
    inl(c,d)}}
  const para=cls=>{const p=document.createElement('p');if(cls)p.className=cls;out.appendChild(p);return p};
  function blk(n){for(const c of Array.from(n.childNodes)){
    if(c.nodeType===3){if(!c.nodeValue.trim()&&!cur)continue;if(!cur)cur=para('');cur.appendChild(document.createTextNode(c.nodeValue.replace(/ /g,' ')));continue}
    if(c.nodeType!==1||SKIP.test(c.tagName))continue;
    const T=c.tagName;
    if(T==='HR'){const h=document.createElement('hr');h.className='scene';out.appendChild(h);cur=null;continue}
    if(T==='IMG'){const e=img(c);if(e){const p=para('c');p.appendChild(e)}cur=null;continue}
    if(T==='UL'||T==='OL'){const l=document.createElement(T.toLowerCase());Array.from(c.children).forEach(li=>{const e=document.createElement('li');inl(li,e);l.appendChild(e)});out.appendChild(l);cur=null;continue}
    if(T==='BLOCKQUOTE'&&Array.from(c.children).some(k=>BLOCK.test(k.tagName))){const q=document.createElement('blockquote');out.appendChild(q);Array.from(c.childNodes).forEach(k=>{if(k.nodeType===1&&BLOCK.test(k.tagName)){const p=document.createElement('p');inl(k,p);q.appendChild(p)}else if(k.nodeType===3&&k.nodeValue.trim()){const p=document.createElement('p');p.textContent=k.nodeValue;q.appendChild(p)}});cur=null;continue}
    if(T==='BLOCKQUOTE'||/^H[1-6]$/.test(T)){const e=document.createElement(T==='BLOCKQUOTE'?'blockquote':'h3');const a=al(c);if(a)e.className=a;inl(c,e);out.appendChild(e);cur=null;continue}
    if(BLOCK.test(T)){if(Array.from(c.children).some(k=>BLOCK.test(k.tagName))){cur=null;blk(c);cur=null;continue}cur=null;inl(c,para(al(c)));continue}
    if(!cur)cur=para('');const tmp=document.createElement('div');tmp.appendChild(c.cloneNode(true));inl(tmp,cur)}}
  blk(src);out.normalize();
  out.querySelectorAll('p,h3,li,blockquote').forEach(b=>{while(b.lastChild&&b.lastChild.nodeName==='BR'&&b.childNodes.length>1)b.lastChild.remove();if(b.lastChild&&b.lastChild.nodeType===3)b.lastChild.nodeValue=b.lastChild.nodeValue.replace(/\s+$/,'');if(b.firstChild&&b.firstChild.nodeType===3)b.firstChild.nodeValue=b.firstChild.nodeValue.replace(/^\s+/,'')});
  // keep a single deliberate blank line, drop the rest of the empty paragraphs
  let prevEmpty=true;Array.from(out.children).forEach(b=>{const empty=!b.textContent.trim()&&!b.querySelector('img')&&b.tagName!=='HR';if(empty){if(prevEmpty||!b.querySelector('br'))b.remove();else b.innerHTML='<br>';}prevEmpty=empty});
  while(out.lastElementChild&&!out.lastElementChild.textContent.trim()&&!out.lastElementChild.querySelector('img')&&out.lastElementChild.tagName!=='HR')out.lastElementChild.remove();
  return out.innerHTML;
}
const WCACHE={};
async function wChapters(w){
  if(w.priv)return w.ch||[];
  if(WCACHE[w.id])return WCACHE[w.id];
  const r=await fetch('data/writing/'+encodeURIComponent(w.id)+'.json',{cache:'no-cache'});
  if(!r.ok)throw new Error('Could not open this piece ('+r.status+').');
  return WCACHE[w.id]=(await r.json()).ch||[];
}
async function wMetaSave(fn,msg){const cur=await ghLoad('data/writing.json');cur.works=cur.works||[];fn(cur.works);await ghSave('data/writing.json',cur,msg);D.works=cur.works;rebuildWorks()}
const WMETA=['id','t','sec','st','date','tags','blurb','sum','gen','words','cover','cp','medium','pin','chn','chw','up'];
async function saveWork(E,verb){
  const wasPriv=!!(DR&&DR.works.some(x=>x.id===E.id)),wasPub=works.some(x=>x.id===E.id);
  E.ch=E.ch.map(c=>({t:(c.t||'').trim(),h:c.h||''}));
  E.chw=E.ch.map(c=>wcount(c.h));E.words=E.chw.reduce((a,b)=>a+b,0);E.chn=E.ch.map(c=>c.t);
  if(!E.blurb)E.blurb=autoBlurb((E.ch[0]||{}).h);
  E.up=new Date().toISOString().slice(0,10);
  const meta={};WMETA.forEach(k=>{const v=E[k];if(v!=null&&v!==''&&!(Array.isArray(v)&&!v.length&&k==='tags'))meta[k]=v});meta.tags=E.tags||[];meta.pin=E.priv?0:(E.pin||0);
  toast('Saving…');
  try{
    if(E.priv){
      if(!DR)throw new Error('Unlock your private drafts first.');
      const d=Object.assign({},meta,{priv:1,ch:E.ch}),at=DR.works.findIndex(x=>x.id===E.id);
      if(at>=0)DR.works[at]=d;else DR.works.unshift(d);
      await saveDrafts();
      if(wasPub){await wMetaSave(L=>{const i=L.findIndex(x=>x.id===E.id);if(i>=0)L.splice(i,1)},'Move a piece to private drafts');await ghDelete('data/writing/'+E.id+'.json','Move a piece to private drafts');delete WCACHE[E.id]}
    }else{
      await ghSave('data/writing/'+E.id+'.json',{ch:E.ch},`${verb||'Update'} ${E.t}`);
      WCACHE[E.id]=E.ch;
      await wMetaSave(L=>{const i=L.findIndex(x=>x.id===E.id);if(i>=0)L[i]=meta;else L.unshift(meta)},`${verb||'Update'} ${E.t}`);
      if(wasPriv){DR.works=DR.works.filter(x=>x.id!==E.id);await saveDrafts()}
    }
    toast('Saved. The live site catches up in about a minute.');return true;
  }catch(e){toast('Not saved: '+e.message,true);return false}
}
async function deleteWork(w){
  toast('Deleting…');
  try{
    if(w.priv){DR.works=DR.works.filter(x=>x.id!==w.id);await saveDrafts()}
    else{await wMetaSave(L=>{const i=L.findIndex(x=>x.id===w.id);if(i>=0)L.splice(i,1)},'Delete '+w.t);await ghDelete('data/writing/'+w.id+'.json','Delete '+w.t);delete WCACHE[w.id]}
    toast('Deleted.');return true;
  }catch(e){toast('Not deleted: '+e.message,true);return false}
}
async function togglePin(id){
  const w=works.find(x=>x.id===id);if(!w)return;
  const next=w.pin?0:Math.max(0,...works.map(x=>x.pin||0))+1;
  toast('Saving…');
  try{await wMetaSave(L=>{const x=L.find(y=>y.id===id);if(x)x.pin=next;let k=1;L.filter(y=>y.pin).sort((a,b)=>a.pin-b.pin).forEach(y=>y.pin=k++)},(next?'Pin ':'Unpin ')+w.t);toast(next?'Pinned to the Literary showcase.':'Taken off the showcase.');render()}catch(e){toast('Not saved: '+e.message,true)}
}
async function movePin(i,d){
  const P=wPinned(),j=i+d;if(j<0||j>=P.length)return;
  const order=P.map(w=>w.id);[order[i],order[j]]=[order[j],order[i]];
  toast('Saving…');
  try{await wMetaSave(L=>{L.forEach(x=>{const k=order.indexOf(x.id);if(k>=0)x.pin=k+1})},'Reorder the Literary showcase');toast('Saved.');render()}catch(e){toast('Not saved: '+e.message,true)}
}
function showcase(){
  const P=wPinned(),RC=works.filter(w=>w.sec==='stories'&&!w.priv&&!w.pin).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,3);
  if(!P.length&&!RC.length&&!ED.on)return'';
  const tile=(w,i,pinned)=>`<div class="lst" data-rd="${esc(w.id)}" tabindex="0" role="link">${wcover(w,`<div class="wbl"><span>${esc(w.blurb||'')}</span></div>`)}<div class="tt">${esc(w.t)}</div><div class="ss">${esc(wKind(w))} · ${(w.chn||['']).length>1?w.chn.length+' chapters':wMin(w)+' min read'}</div>${pinned&&ED.on?`<div class="lsmv"><button data-lsm="${i}:-1" ${i?'':'disabled'} title="Move left">‹</button><button data-lsu="${esc(w.id)}" title="Take off the showcase">✕</button><button data-lsm="${i}:1" ${i<P.length-1?'':'disabled'} title="Move right">›</button></div>`:''}</div>`;
  return `<section class="box lshow" style="margin-top:16px"><div class="box-h"><h2>Literary showcase</h2><a class="small link" href="#stories">All writing →</a></div><div class="box-b">${P.length||RC.length?`<div class="lsrow">${P.map((w,i)=>tile(w,i,1)).join('')}${RC.map((w,i)=>tile(w,i,0)).join('')}</div>`:'<div class="muted small">Pin pieces on the Stories page to show them here.</div>'}</div></section>`;
}
function bindShowcase(){
  document.querySelectorAll('.lst').forEach(el=>{const open=()=>{openWork(wById(el.dataset.rd))};el.onclick=e=>{if(e.target.closest('button'))return;open()};el.onkeydown=e=>{if(e.key==='Enter')open()}});
  document.querySelectorAll('[data-lsm]').forEach(b=>b.onclick=e=>{e.stopPropagation();const [i,d]=b.dataset.lsm.split(':').map(Number);movePin(i,d)});
  document.querySelectorAll('[data-lsu]').forEach(b=>b.onclick=e=>{e.stopPropagation();togglePin(b.dataset.lsu)});
}
async function rStories(){
  const S=wsS,own=OWNER();
  if(S.sec==='drafts'&&!own)S.sec='stories';
  if(S.sec==='drafts'&&!DR&&savedPw()){$('#app').innerHTML='<div class="muted" style="padding:40px;text-align:center">Unlocking…</div>';await tryAutoUnlock();if(route!=='stories')return}
  const all=[...works,...mediumOnly()];
  const words=all.reduce((s,w)=>s+(w.words||0),0),chs=works.reduce((s,w)=>s+(w.chn||['']).length,0);
  const cnt=k=>all.filter(w=>w.sec===k).length;
  const tabs=WSEC.map(([k,l])=>`<button data-ws="${k}" class="${S.sec===k?'on':''}" style="--c:var(--story)">${l}<span class="n">${cnt(k)}</span></button>`).join('')+(own?`<button data-ws="drafts" class="${S.sec==='drafts'?'on':''}" style="--c:var(--story)">🔒 Private drafts${DR?`<span class="n">${DR.works.length}</span>`:''}</button>`:'');
  let body;
  if(S.sec==='drafts'){
    body=DR?`${DR.works.length?`<div class="wlist">${DR.works.slice().sort((a,b)=>(b.up||b.date||'').localeCompare(a.up||a.date||'')).map(wcard).join('')}</div>`:'<div class="box box-b muted" style="margin-top:14px">No private drafts yet.</div>'}
      <div class="box box-b drtools" style="margin-top:14px"><div><b>Private drafts</b><div class="small muted">Saved encrypted with your passphrase. Visitors never see this tab, and the saved file can't be read without the passphrase.</div></div><div class="drbtns"><button class="btn" id="dr_cp">Change passphrase</button><button class="btn" id="dr_lock">Lock</button></div><form id="dr_cpf" class="drform" hidden><input id="dr_n1" type="password" placeholder="New passphrase (8+ characters)" autocomplete="new-password"><input id="dr_n2" type="password" placeholder="Type it again" autocomplete="new-password"><button class="btn pri">Save new passphrase</button><div id="dr_cpm" class="small muted"></div></form></div>`
    :`<div class="box box-b drlock"><div class="drico">🔒</div><h3>Private drafts are locked</h3><p class="small muted">They're stored encrypted. Only your passphrase opens them. Visitors never see this tab.</p><form id="dr_f" class="drform"><input id="dr_pw" type="password" placeholder="Passphrase" autocomplete="current-password"><label class="small chkline"><input type="checkbox" id="dr_rem"> Remember on this device</label><button class="btn pri">Unlock</button><div id="dr_err" class="small" style="color:var(--accent)"></div></form></div>`;
  }else{
    const L=all.filter(w=>w.sec===S.sec).sort((a,b)=>(a.pin?0:1)-(b.pin?0:1)||(a.pin||0)-(b.pin||0)||(b.date||'').localeCompare(a.date||''));
    body=L.length?`<div class="wlist">${L.map(wcard).join('')}</div>`:'<div class="box box-b muted" style="margin-top:14px">Nothing here yet.</div>';
  }
  $('#app').innerHTML=`${banner('stories','Stories & writing',`Stories, articles and the odd poem, by ${esc(PEN())}.`,[[all.length,'pieces'],[fmt(words),'words'],[chs,'chapters']],'Writing')}
  <div class="wtop"><div class="tabs">${tabs}</div>${ED.on?'<button class="btn pri" id="wnew">+ New piece</button>':''}</div>
  ${body}
  ${S.sec!=='drafts'?'<div class="note">Pieces also published on Medium link back there, and new Medium posts show up here on their own.</div>':''}`;
  document.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>{S.sec=b.dataset.ws;rStories()});
  document.querySelectorAll('.wcard').forEach(el=>el.onclick=e=>{if(e.target.closest('a,button'))return;openWork([...all,...(DR?DR.works:[])].find(x=>x.id===el.dataset.w))});
  document.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>togglePin(b.dataset.pin));
  document.querySelectorAll('[data-wed]').forEach(b=>b.onclick=()=>editWork(wById(b.dataset.wed)));
  const wn=$('#wnew');if(wn)wn.onclick=()=>editWork(null);
  const f=$('#dr_f');if(f)f.onsubmit=async e=>{e.preventDefault();const pw=$('#dr_pw').value;if(!pw)return;$('#dr_err').textContent='Opening…';
    try{await unlockDrafts(pw);try{if($('#dr_rem').checked)store.set('drpw',pw);else sessionStorage.setItem('sc_drpw',pw)}catch(x){}rStories()}catch(err){$('#dr_err').textContent=err.message}};
  const lk=$('#dr_lock');if(lk)lk.onclick=()=>{DR=null;DRPW='';store.set('drpw','');try{sessionStorage.removeItem('sc_drpw')}catch(x){}rStories()};
  const cp=$('#dr_cp');if(cp)cp.onclick=()=>{$('#dr_cpf').hidden=!$('#dr_cpf').hidden};
  const cpf=$('#dr_cpf');if(cpf)cpf.onsubmit=async e=>{e.preventDefault();const a=$('#dr_n1').value,b=$('#dr_n2').value;
    if(a.length<8){$('#dr_cpm').textContent='Use at least 8 characters.';return}if(a!==b){$('#dr_cpm').textContent='The two don\'t match.';return}
    if(!ED.token){$('#dr_cpm').textContent='Turn on edit mode first.';return}
    $('#dr_cpm').textContent='Saving…';try{await saveDrafts(a);DRPW=a;if(store.get('drpw',''))store.set('drpw',a);try{if(sessionStorage.getItem('sc_drpw'))sessionStorage.setItem('sc_drpw',a)}catch(x){}$('#dr_cpm').textContent='Done. Use the new passphrase from now on.';$('#dr_n1').value=$('#dr_n2').value=''}catch(err){$('#dr_cpm').textContent='Not saved: '+err.message}};
}
/* reader */
let RD={id:'',n:0};
async function rRead(){
  const tok={};rRead.tok=tok;
  let w=wById(RD.id);
  if(!w&&!works.some(x=>x.id===RD.id)&&await tryAutoUnlock())w=wById(RD.id);
  if(!w){$('#app').innerHTML=`<div class="box box-b" style="margin-top:20px"><h2>Not found</h2><p class="muted" style="margin:6px 0 12px">${OWNER()&&!DR?'If this is a private draft, unlock your drafts on the Stories page first.':'This piece isn\'t here any more.'}</p><a class="btn" href="#stories">← Back to writing</a></div>`;return}
  $('#app').innerHTML='<div class="reader"><div class="muted" style="padding:60px;text-align:center">Opening…</div></div>';
  let ch;try{ch=await wChapters(w)}catch(e){$('#app').innerHTML=`<div class="box box-b" style="margin-top:20px"><p>${esc(e.message)}</p><a class="btn" href="#stories">← Back to writing</a></div>`;return}
  if(route!=='read'||rRead.tok!==tok)return;
  if(!ch.length)ch=[{t:'',h:''}];
  const n=Math.min(RD.n,ch.length-1),multi=ch.length>1,c=ch[n],id=encodeURIComponent(w.id);
  if(multi)store.set('rd_'+w.id,n);
  const fs=store.get('rd_fs',19),poem=(w.tags||[]).includes('poem');
  $('#app').innerHTML=`<div class="rdbar"><i id="rdprog"></i></div><div class="reader">
  <div class="rdtop"><a href="#stories" class="rdback">← Writing</a><div class="rdctl">${multi?`<select id="rd_ch" aria-label="Chapter">${ch.map((x,i)=>`<option value="${i}" ${i===n?'selected':''}>${esc(chName(w,i))}</option>`).join('')}</select>`:''}<button class="btn" id="rd_sm" title="Smaller text" aria-label="Smaller text">A−</button><button class="btn" id="rd_lg" title="Larger text" aria-label="Larger text">A+</button><button class="btn" id="rd_sh" title="Share this story">Share</button>${ED.on?`<button class="btn" id="rd_ed">✎ Edit${multi?' chapter':''}</button>`:''}</div></div>
  <article class="rdpaper" id="rdp" style="--fs:${fs}px">
    <header class="rdh">${n===0||!multi?`<div class="rdk">${esc(wKind(w))}${w.st!=='complete'?' · '+(WST[w.st]||''):''}${w.priv?' · 🔒 Private':''}</div><h1>${esc(w.t)}</h1><div class="rdm">${esc(PEN())} · ${fdate(w.date)} · ${multi?ch.length+' chapters · ':''}${fmt(w.words||0)} words · ${wMin(w)} min read</div>`:`<div class="rdk"><a href="#read/${id}">${esc(w.t)}</a></div>`}${multi?`<h2 class="rdch">${esc(chName(w,n))}</h2>`:''}</header>
    <div class="rdtext${poem?' poem':''}">${c.h||'<p class="muted">Nothing written here yet.</p>'}</div>
    ${multi?`<nav class="rdnav">${n>0?`<a href="#read/${id}/${n}" class="prev"><small>Previous</small>${esc(chName(w,n-1))}</a>`:'<span></span>'}${n<ch.length-1?`<a href="#read/${id}/${n+2}" class="next"><small>Next</small>${esc(chName(w,n+1))}</a>`:`<span class="rdend">${w.st==='complete'?(/the end\W*$/i.test((c.h||'').replace(/<[^>]+>/g,' ').trim())?'':'The end'):'To be continued…'}</span>`}</nav>`:`<div class="rdend1">${w.st==='complete'?'❦':'<span class="rdend">To be continued…</span>'}</div>`}
    ${w.medium?`<div class="rdfoot small muted">Also on <a class="link" href="${esc(w.medium)}" target="_blank" rel="noopener">Medium ↗</a></div>`:''}
  </article>
  <div class="rdbottom"><a href="#stories" class="rdback">← Writing</a><a href="#" class="rdback" onclick="window.scrollTo({top:0,behavior:'smooth'});return false">Back to top ↑</a></div>
  ${multi?`<div class="box rdtoc"><div class="box-h"><h2>Chapters</h2><span class="small muted">${fmt(w.words||0)} words</span></div><ol>${ch.map((x,i)=>`<li class="${i===n?'on':''}"><a href="#read/${id}/${i+1}"><span>${esc(chName(w,i))}</span><span class="mono small muted">${fmt((w.chw||[])[i]||wcount(x.h))} words</span></a></li>`).join('')}</ol></div>`:''}
  </div>`;
  const setFs=d=>{const v=Math.max(15,Math.min(26,store.get('rd_fs',19)+d));store.set('rd_fs',v);$('#rdp').style.setProperty('--fs',v+'px')};
  $('#rd_sm').onclick=()=>setFs(-1);$('#rd_lg').onclick=()=>setFs(1);$('#rd_sh').onclick=()=>shareLink(BASEURL+'#read/'+encodeURIComponent(w.id),w.t+' · Rajeel Javed');
  const sel=$('#rd_ch');if(sel)sel.onchange=()=>{location.hash=`read/${id}/${+sel.value+1}`};
  const ed=$('#rd_ed');if(ed)ed.onclick=()=>chapEditor({label:w.t+(multi?' · '+chName(w,n):''),t:c.t||'',h:c.h||'',key:w.id+'_'+n,named:multi,onSave:async(h,t)=>{const E=Object.assign({},w,{tags:(w.tags||[]).slice(),ch:ch.map(x=>({...x}))});E.ch[n]={t,h};const ok=await saveWork(E);if(ok){if(!w.priv)WCACHE[w.id]=E.ch}return ok},onClose:()=>render()});
  rdProg();
}
function rdProg(){const p=$('#rdprog');if(!p)return;const h=document.documentElement,max=h.scrollHeight-h.clientHeight;p.style.width=(max>0?Math.min(100,h.scrollTop/max*100):0)+'%'}
window.addEventListener('scroll',()=>{if(route==='read')rdProg()},{passive:true});
document.addEventListener('keydown',e=>{if(route!=='read'||$('#ov').classList.contains('show')||$('#wed')||e.altKey||e.ctrlKey||e.metaKey)return;const a=document.activeElement;if(a&&(/INPUT|TEXTAREA|SELECT/.test(a.tagName)||a.isContentEditable))return;
  const l=e.key==='ArrowRight'?$('.rdnav .next'):e.key==='ArrowLeft'?$('.rdnav .prev'):null;if(l)location.hash=l.getAttribute('href').slice(1)});
/* chapter editor */
let mammothP=null;
const loadMammoth=()=>mammothP||(mammothP=new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';s.onload=()=>res(window.mammoth);s.onerror=()=>{mammothP=null;rej(new Error('Could not load the Word file reader.'))};document.head.appendChild(s)}));
function chapEditor(o){
  const old=$('#wed');if(old)old.remove();
  const box=document.createElement('div');box.id='wed';box.className='wed';
  box.innerHTML=`<div class="wedbar">
    <div class="wedt"><span class="lbl">${esc(o.label||'')}</span>${o.named!==false?`<input id="wed_t" placeholder="Chapter name (optional, leave empty for “Chapter N”)" value="${esc(o.t||'')}">`:''}</div>
    <div class="wedtools" role="toolbar">
      <button data-c="bold" title="Bold (Ctrl+B)"><b>B</b></button><button data-c="italic" title="Italic (Ctrl+I)"><i>I</i></button><button data-c="underline" title="Underline (Ctrl+U)"><u>U</u></button>
      <button data-c="h3" title="Heading">H</button><button data-c="quote" title="Quote">❝</button><button data-c="center" title="Centre the line">≡</button><button data-c="scene" title="Scene break">⁂</button>
      <button data-c="img" title="Insert a picture">🖼</button><button data-c="docx" title="Bring in a Word file (.docx)">W</button><button data-c="clear" title="Clear formatting">Tx</button>
      <button data-c="undo" title="Undo">↶</button><button data-c="redo" title="Redo">↷</button>
    </div>
    <div class="wedsave"><span id="wed_wc" class="small muted mono"></span><button class="btn" id="wed_x">Close</button><button class="btn pri" id="wed_s">Save</button></div>
  </div>
  <div class="wedpage"><div id="wed_rb" class="wedrb" hidden></div><div id="wed_c" class="rdtext wedc" contenteditable="true" spellcheck="true"></div></div>
  <input type="file" id="wed_f" accept="image/*" hidden><input type="file" id="wed_d" accept=".docx" hidden>`;
  document.body.appendChild(box);document.body.classList.add('noscroll');
  const ed=$('#wed_c'),bk='wbk_'+(o.key||'x');
  ed.innerHTML=o.h||'<p><br></p>';
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch(e){}
  let dirty=false,closing=0;
  const wc=()=>{$('#wed_wc').textContent=fmt(wcount(ed.innerHTML))+' words'};wc();
  const mark=()=>{dirty=true;wc();clearTimeout(mark.t);mark.t=setTimeout(()=>store.set(bk,{h:ed.innerHTML,t:($('#wed_t')||{}).value||'',at:Date.now()}),1500)};
  const b=store.get(bk,null);
  if(b&&b.h&&b.h!==o.h){const rb=$('#wed_rb');rb.hidden=false;rb.innerHTML=`Unsaved text from ${new Date(b.at).toLocaleString()} is still on this device. <button class="btn" id="wed_rs">Bring it back</button> <button class="btn" id="wed_rd">Discard it</button>`;
    $('#wed_rs').onclick=()=>{ed.innerHTML=b.h;if($('#wed_t')&&b.t)$('#wed_t').value=b.t;rb.hidden=true;mark()};$('#wed_rd').onclick=()=>{store.set(bk,null);rb.hidden=true}}
  ed.addEventListener('input',mark);const ti=$('#wed_t');if(ti)ti.addEventListener('input',mark);
  ed.addEventListener('paste',e=>{e.preventDefault();const cd=e.clipboardData,html=cd.getData('text/html'),txt=cd.getData('text/plain');
    if(html){document.execCommand('insertHTML',false,cleanHTML(html,true))}
    else if(!/\n/.test(txt))document.execCommand('insertText',false,txt);
    else document.execCommand('insertHTML',false,txt.split(/\r?\n/).map(l=>l.trim()?'<p>'+esc(l)+'</p>':'').join(''));
    mark()});
  const blockOf=()=>{const s=getSelection();if(!s.rangeCount)return null;let n=s.anchorNode;while(n&&n!==ed){if(n.nodeType===1&&n.parentNode===ed)return n;n=n.parentNode}return null};
  const fmtBlock=t=>{const cur=(document.queryCommandValue('formatBlock')||'').toLowerCase();document.execCommand('formatBlock',false,cur===t?'<p>':'<'+t+'>')};
  box.querySelectorAll('[data-c]').forEach(btn=>btn.onmousedown=e=>e.preventDefault());
  box.querySelectorAll('[data-c]').forEach(btn=>btn.onclick=async()=>{const c=btn.dataset.c;ed.focus();
    if(c==='bold'||c==='italic'||c==='underline'||c==='undo'||c==='redo')document.execCommand(c);
    else if(c==='h3')fmtBlock('h3');else if(c==='quote')fmtBlock('blockquote');
    else if(c==='center'){const bl=blockOf();if(bl&&bl.tagName!=='HR')bl.classList.toggle('c')}
    else if(c==='scene')document.execCommand('insertHTML',false,'<hr class="scene"><p><br></p>');
    else if(c==='clear')document.execCommand('removeFormat');
    else if(c==='img')$('#wed_f').click();
    else if(c==='docx')$('#wed_d').click();
    mark()});
  $('#wed_f').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const url=await shrinkImg(f,1000);ed.focus();document.execCommand('insertHTML',false,`<p class="c"><img src="${url}" alt=""></p><p><br></p>`);mark()}catch(err){toast(err.message,true)}};
  $('#wed_d').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;toast('Reading the Word file…');
    try{const m=await loadMammoth();const r=await m.convertToHtml({arrayBuffer:await f.arrayBuffer()});
      const tmp=document.createElement('div');tmp.innerHTML=cleanHTML(r.value,true);
      for(const im of tmp.querySelectorAll('img[src^="data:"]')){try{im.setAttribute('src',await shrinkImg(im.getAttribute('src'),1000))}catch(x){im.remove()}}
      if(!ed.textContent.trim())ed.innerHTML=tmp.innerHTML;else{ed.focus();document.execCommand('insertHTML',false,tmp.innerHTML)}mark();toast('Brought in. Check it over, then Save.')}catch(err){toast(err.message,true)}};
  const close=()=>{box.remove();document.body.classList.remove('noscroll');if(o.onClose)o.onClose()};
  $('#wed_x').onclick=()=>{if(dirty&&!closing){closing=1;$('#wed_x').textContent='Close without saving?';setTimeout(()=>{closing=0;const x=$('#wed_x');if(x)x.textContent='Close'},3500);return}store.set(bk,null);close()};
  const save=async()=>{const sb=$('#wed_s');if(sb.disabled)return;sb.disabled=true;sb.textContent='Saving…';
    try{const base=(o.key||'pic').replace(/_\d+$/,'').slice(0,40);
      for(const im of ed.querySelectorAll('img[src^="data:"]')){if(im.dataset.path)continue;const {path}=await uploadPic(im.getAttribute('src'),base);im.dataset.path=path}
      const h=cleanHTML(ed.innerHTML),t=(($('#wed_t')||{}).value||'').trim();
      const ok=await o.onSave(h,t);
      if(ok){dirty=false;store.set(bk,null)}
    }catch(err){toast('Not saved: '+err.message,true)}
    sb.disabled=false;sb.textContent='Save'};
  $('#wed_s').onclick=save;
  box.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}});
  setTimeout(()=>ed.focus(),50);
}
/* piece editor */
async function editWork(w){
  let isNew=!w,E;
  if(isNew)E={id:'',t:'',sec:['stories','wip','articles','other'].includes(wsS.sec)?wsS.sec:'stories',st:'complete',date:new Date().toISOString().slice(0,10),tags:[],blurb:'',cover:'',medium:'',pin:0,priv:wsS.sec==='drafts'?1:0,ch:[{t:'',h:''}]};
  else{try{E=Object.assign({},w,{tags:(w.tags||[]).slice(),ch:(await wChapters(w)).map(c=>({t:c.t||'',h:c.h||''}))});E.priv=w.priv?1:0}catch(e){toast(e.message,true);return}}
  if(E.sec==='wip'&&E.st==='complete'&&isNew)E.st='ongoing';
  modal('stories',isNew?'New piece':'Edit piece',`<div style="grid-column:1/-1"><h2>${isNew?'A new piece':esc(E.t)}</h2>
  <div class="eform">
    ${fld('w_t','Title',E.t)}
    ${fld('w_sec','Section',E.sec,'select:stories=Stories|wip=Works in progress|articles=Articles|other=Other (poems, shorts)')}
    ${fld('w_st','Status',E.st,'select:complete=Complete|ongoing=Ongoing|hiatus=On hiatus')}
    ${fld('w_date','Date written',E.date,'date')}
    ${fld('w_tags','Tags (comma separated)',(E.tags||[]).join(', '))}
    ${fld('w_med','Medium link (optional)',E.medium,'url')}
    ${fld('w_bl','Short description (leave empty to use the opening lines)',E.blurb,'textarea')}
    ${fld('w_sum','Back-cover summary (shown on the story page; no spoilers)',E.sum||'','textarea')}
    ${fld('w_gen','Genres (comma separated, shown on the story page)',(E.gen||[]).join(', '))}
    <div class="ef" style="grid-column:1/-1"><span>Cover picture</span><div class="wcovrow"><div id="w_cprev" class="wcovp">${wcover(E)}</div><div class="wcovc"><input id="w_cov" placeholder="Picture link, or upload one" value="${esc(E.cover||'')}"><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" type="button" id="w_up">Upload picture</button><button class="btn" type="button" id="w_cx">No picture</button></div><span class="small muted">Without a picture, a title cover is drawn for it.</span></div></div><input type="file" id="w_upf" accept="image/*" hidden></div>
    <label class="ef"><span>Visibility</span><span class="chkline"><input type="checkbox" id="w_priv" ${E.priv?'checked':''}> Private draft (passphrase-locked, hidden from visitors)</span></label>
    <label class="ef"><span>Literary showcase</span><span class="chkline"><input type="checkbox" id="w_pin" ${E.pin?'checked':''} ${E.priv?'disabled':''}> Pinned on the overview</span></label>
  </div>
  <div class="ef" style="margin-top:16px"><span>Chapters</span><div id="w_chs" class="wchs"></div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center"><button class="btn" type="button" id="w_cha">+ Add chapter</button><span class="small muted">One chapter reads as a one-shot. Unnamed chapters show as “Chapter 1, 2, 3…”.</span></div></div>
  <div style="margin-top:18px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" id="w_save">${isNew?'Create':'Save'}</button>${isNew?'':'<button class="btn" id="w_del" style="margin-left:auto">Delete…</button>'}</div></div>`);
  const draw=()=>{$('#w_chs').innerHTML=E.ch.map((c,i)=>`<div class="wch"><span class="mono small muted">${i+1}</span><input data-ct="${i}" value="${esc(c.t)}" placeholder="${esc(chName({chn:E.ch.map((x,j)=>j===i?'':x.t)},i))}" aria-label="Chapter ${i+1} name"><span class="small muted mono wcw">${fmt(wcount(c.h))} w</span><button class="btn" type="button" data-ce="${i}">✎ Write</button><button class="btn" type="button" data-cu="${i}" ${i?'':'disabled'} aria-label="Move up">↑</button><button class="btn" type="button" data-cd="${i}" ${i<E.ch.length-1?'':'disabled'} aria-label="Move down">↓</button><button class="btn" type="button" data-cx="${i}" ${E.ch.length>1?'':'disabled'} aria-label="Remove chapter">✕</button></div>`).join('');
    document.querySelectorAll('[data-ct]').forEach(el=>el.oninput=()=>{E.ch[+el.dataset.ct].t=el.value});
    document.querySelectorAll('[data-cu],[data-cd]').forEach(b=>b.onclick=()=>{const i=+(b.dataset.cu??b.dataset.cd),j=b.dataset.cu!=null?i-1:i+1;[E.ch[i],E.ch[j]]=[E.ch[j],E.ch[i]];draw()});
    document.querySelectorAll('[data-cx]').forEach(b=>b.onclick=()=>{if(b.dataset.sure){E.ch.splice(+b.dataset.cx,1);draw();return}b.dataset.sure=1;b.textContent='Remove?';setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent='✕'}},3000)});
    document.querySelectorAll('[data-ce]').forEach(b=>b.onclick=()=>{collect();const i=+b.dataset.ce;chapEditor({label:(E.t||'New piece')+(E.ch.length>1?' · '+chName({chn:E.ch.map(x=>x.t)},i):''),t:E.ch[i].t,h:E.ch[i].h,key:(E.id||'new')+'_'+i,named:true,onSave:async(h,t)=>{E.ch[i]={t,h};const ok=await doSave(true);return ok},onClose:()=>{if($('#w_chs'))draw()}})});
  };
  const collect=()=>{if(!$('#w_t'))return;E.t=gv('w_t');E.sec=gv('w_sec');E.st=gv('w_st');E.date=gv('w_date')||E.date;E.tags=gv('w_tags').split(',').map(s=>s.trim()).filter(Boolean);E.medium=gv('w_med');E.blurb=gv('w_bl');E.sum=gv('w_sum');E.gen=gv('w_gen').split(',').map(x=>x.trim()).filter(Boolean);E.cover=gv('w_cov');E.priv=$('#w_priv').checked?1:0;
    const pin=$('#w_pin').checked&&!E.priv,had=(works.find(x=>x.id===E.id)||{}).pin;E.pin=pin?(had||Math.max(0,...works.map(x=>x.pin||0))+1):0};
  const doSave=async quiet=>{collect();
    if(!E.t){toast('Give it a title first.',true);return false}
    if(E.priv&&!DR){if(!(await tryAutoUnlock())){toast('Unlock your private drafts first (Stories → Private drafts).',true);return false}}
    if(!E.id)E.id=wSlug(E.t);
    if(E.cover&&E.cover.startsWith('data:')){const {path}=await uploadPic(E.cover,E.id);E.cover=path}
    const ok=await saveWork(E,isNew?'Add':'Update');if(ok){isNew=false;const sb=$('#w_save');if(sb)sb.textContent='Save'}return ok};
  draw();
  $('#w_cha').onclick=()=>{E.ch.push({t:'',h:''});draw()};
  $('#w_priv').onchange=()=>{$('#w_pin').disabled=$('#w_priv').checked;if($('#w_priv').checked)$('#w_pin').checked=false};
  const prev=()=>{collect();$('#w_cprev').innerHTML=wcover(Object.assign({},E,{cover:E.cover}))};
  $('#w_cov').onchange=prev;$('#w_t').onchange=prev;$('#w_sec').onchange=prev;
  $('#w_cx').onclick=()=>{$('#w_cov').value='';prev()};
  $('#w_up').onclick=()=>$('#w_upf').click();
  $('#w_upf').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const url=await shrinkImg(f,800);$('#w_cov').value=url;prev()}catch(err){toast(err.message,true)}};
  $('#w_save').onclick=async()=>{const sb=$('#w_save');sb.disabled=true;const ok=await doSave();sb.disabled=false;if(ok){closeM();render()}};
  const del=$('#w_del');if(del)del.onclick=async()=>{if(!del.dataset.sure){del.dataset.sure=1;del.textContent='Delete for good?';setTimeout(()=>{if(del.isConnected){delete del.dataset.sure;del.textContent='Delete…'}},3500);return}
    if(await deleteWork(w)){closeM();if(route==='read')location.hash='stories';else render()}};
}

