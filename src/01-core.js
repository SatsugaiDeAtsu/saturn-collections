/* Saturn Collections: the site. Edit the files in src/ (one per section), then run: python3 tools/build.py */
(async function(){
"use strict";
let D,SET={};try{const j=u=>fetch(u,{cache:'no-cache'}).then(r=>r.json());const [a,g,b,s,q,wr,mx,se,ov,th,fl,mq,msy,fr]=await Promise.all([j('data/site.json'),j('data/games.json'),j('data/books.json'),j('data/settings.json').catch(()=>({})),j('data/quotes.json').catch(()=>({quotes:[]})),j('data/writing.json').catch(()=>({works:[]})),j('data/manga_extra.json').catch(()=>({items:[]})),j('data/series.json').catch(()=>({series:[]})),j('data/ovfavs.json').catch(()=>null),j('data/themes.json').catch(()=>({})),j('data/films_local.json').catch(()=>({films:[]})),j('data/mal_queue.json').catch(()=>({q:[]})),j('data/mal_sync.json').catch(()=>null),j('data/film_ratings.json').catch(()=>({}))]);D=Object.assign(a,g,b,q,wr);D.mangaExtra=mx.items||[];D.ovFavs=ov;D.themes=th||{};D.series=se.series||[];D.filmsLocal=(fl&&fl.films)||[];D.malQ=(mq&&mq.q)||[];D.malSync=!!(msy&&msy.ct);D.filmR=fr||{};SET=s}catch(e){document.getElementById('app').innerHTML='<div class="empty">Could not load data/site.json.</div>';return}
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const fmt=n=>Number(n).toLocaleString('en-US');
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fdate=s=>{if(!s)return'';const d=new Date(s.length<=10?s+'T00:00:00Z':s);if(isNaN(d))return'';return d.getUTCDate()+' '+MON[d.getUTCMonth()]+' '+d.getUTCFullYear()};
const ago=s=>{const d=new Date(s.length<=10?s+'T00:00:00Z':s);const days=Math.floor((Date.now()-d)/864e5);if(days<1)return'today';if(days<2)return'yesterday';if(days<31)return days+'d ago';if(days<365)return Math.floor(days/30)+'mo ago';return Math.floor(days/365)+'y ago'};
const store={get(k,d){try{const v=localStorage.getItem('sc_'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('sc_'+k,JSON.stringify(v))}catch(e){}}};

/* ---------- theme ---------- */
const root=document.documentElement;
let theme=store.get('theme',null);
if(!theme){try{theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){theme='light'}}
root.dataset.theme=theme;
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#editbtn'))editSetup()});
document.addEventListener('pointerdown',e=>{const c=e.target.closest&&e.target.closest('.card,.couple');if(!c)return;const g=!!c.querySelector('.cover.gold');c.classList.remove('tap','tapgold');void c.offsetWidth;c.classList.add(g?'tapgold':'tap');setTimeout(()=>c.classList.remove('tap','tapgold'),700)});
$('#theme').onclick=()=>{theme=theme==='dark'?'light':'dark';root.dataset.theme=theme;store.set('theme',theme)};


/* ---------- icons & art ---------- */
const IC={
 wrapped:'<rect x="3" y="8" width="18" height="13"/><path d="M3 12h18M12 8v13M12 8c-2-5-7-5-7-2s5 2 7 2c2 0 7 1 7-2s-5-3-7 2"/>',
 overview:'<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
 hof:'<path d="M3 7l4.5 4L12 4l4.5 7L21 7v11H3z"/><path d="M3 21h18"/>',
 anime:'<rect x="2.5" y="6" width="19" height="13"/><path d="M8 2.5l4 3.5 4-3.5"/><path d="M6 21.5h12"/>',
 manga:'<rect x="2.5" y="3" width="19" height="18"/><path d="M12 3v18M2.5 11h9.5M12 14h9.5"/>',
 films:'<rect x="2.5" y="4" width="19" height="16"/><path d="M6.5 4v16M17.5 4v16M2.5 9h4M2.5 15h4M17.5 9h4M17.5 15h4"/>',
 games:'<rect x="2.5" y="7" width="19" height="11"/><path d="M8 10v5M5.5 12.5h5"/><rect x="14.5" y="10" width="2" height="2"/><rect x="17" y="13" width="2" height="2"/>',
 books:'<rect x="3" y="15" width="18" height="5"/><rect x="5" y="9.5" width="15" height="5.5"/><rect x="4" y="4" width="13" height="5.5"/>',
 stories:'<path d="M12 2.5l6 7-6 12-6-12z"/><path d="M12 9.5v6"/>',
 music:'<path d="M9 18V4.5l11-2V16"/><rect x="3.5" y="15.5" width="5.5" height="5"/><rect x="14.5" y="13.5" width="5.5" height="5"/>',
 search:'<rect x="3" y="3" width="12" height="12"/><path d="M15 15l6 6"/>',
 star:'<path d="M12 2.5l2.8 6.3 6.7.5-5.1 4.4 1.6 6.6L12 16.8l-6 3.5 1.6-6.6-5.1-4.4 6.7-.5z"/>',
 mask:'<path d="M3 5h18v6c0 5-4 9-9 9s-9-4-9-9z"/><rect x="6.5" y="9" width="4" height="3"/><rect x="13.5" y="9" width="4" height="3"/>',
 heart:'<path d="M12 21L3 12V6l3-3h3l3 3 3-3h3l3 3v6z"/>',
 couple:'<rect x="2.5" y="7" width="11" height="11"/><rect x="10.5" y="4" width="11" height="11"/>',
 bolt:'<path d="M13.5 2.5L4.5 13.5h6l-1 8 9-11h-6z"/>',
 ten:'<rect x="2.5" y="4" width="19" height="16"/><path d="M7 8.5v7M10.5 8.5h6v7h-6z"/>',
 user:'<rect x="8" y="3" width="8" height="8"/><path d="M3.5 21v-6h17v6"/>'
};
const ico=(k,cls)=>`<svg class="ico ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="miter" stroke-linecap="square" aria-hidden="true">${IC[k]||IC.star}</svg>`;
const RING='<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><path d="M6 37c-4 6 10 6 26-1s28-17 26-22" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="#fff"/></svg>';
/* ---------- artwork ---------- */
const LOGO=(s)=>`<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lgP" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5c86"/><stop offset=".55" stop-color="#b8264a"/><stop offset="1" stop-color="#6a2fc4"/></linearGradient><linearGradient id="lgR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f6d27a" stop-opacity="0"/><stop offset=".3" stop-color="#f6d27a"/><stop offset=".7" stop-color="#fff2c9"/><stop offset="1" stop-color="#f6d27a" stop-opacity="0"/></linearGradient></defs><path d="M6 37c-4 6 10 6 26-1s28-17 26-22" fill="none" stroke="url(#lgR)" stroke-width="2.4" opacity=".55"/><circle cx="32" cy="32" r="15" fill="url(#lgP)"/><path d="M19 27c5-2 18-2 26 2" stroke="#fff" stroke-opacity=".25" stroke-width="2" fill="none"/><path d="M6 37c-4 6 10 6 26-1s28-17 26-22" fill="none" stroke="url(#lgR)" stroke-width="2.4" stroke-dasharray="0 23 60" /><circle cx="51" cy="14" r="1.6" fill="#fff"/><circle cx="12" cy="18" r="1" fill="#fff" opacity=".7"/></svg>`;
const STARS=(n,x0,x1,seed)=>{let h=seed||3,s='';const r=()=>{h=(h*9301+49297)%233280;return h/233280};for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),y=r()*200,o=.25+r()*.6,z=r()<.15?1.8:.9;s+=`<circle class="${z>1?'star':''}" style="animation-delay:-${(r()*4).toFixed(1)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${z}" fill="#fff" opacity="${o.toFixed(2)}"/>`}return s};
const ART={
 anime:c=>`<circle class="glow" cx="700" cy="70" r="70" fill="#ffd0de" opacity=".14"/><circle cx="700" cy="70" r="46" fill="#ffe7ef" opacity=".92"/>
  <g class="cloud" opacity=".18"><rect x="420" y="58" width="120" height="10" rx="5" fill="#fff"/><rect x="450" y="70" width="80" height="8" rx="4" fill="#fff"/></g><g class="cloud c2" opacity=".12"><rect x="600" y="132" width="140" height="9" rx="4" fill="#fff"/></g>
  <g fill="#14081a" opacity=".95"><rect x="560" y="96" width="210" height="9"/><rect x="548" y="88" width="234" height="9"/><rect x="580" y="112" width="170" height="7"/><rect x="590" y="105" width="10" height="95"/><rect x="730" y="105" width="10" height="95"/></g>
  <g fill="${c}"><rect x="548" y="88" width="234" height="3" opacity=".9"/></g>
  <path d="M820 20 C760 30 720 60 690 40 M780 24 c-8 10-6 22 4 30" stroke="#3a1a2e" stroke-width="5" fill="none"/>
  ${[[760,40],[742,52],[790,58],[722,30],[800,30],[770,70]].map(([x,y],i)=>`<g class="bloom" style="animation-delay:${i*.4}s" transform="translate(${x} ${y}) rotate(${i*31})"><ellipse rx="9" ry="5" fill="#ffb3c8"/><ellipse rx="5" ry="9" fill="#ff9fbb" opacity=".85"/><circle r="2" fill="#fff4f7"/></g>`).join('')}
  ${Array.from({length:26},(_,i)=>{const x=380+((i*37)%460),d=(i*0.71)%9,dur=6+(i%6);return `<g class="petal" style="animation-delay:-${d}s;animation-duration:${dur}s"><g class="sway2" style="animation-delay:-${(i*.3)%2}s"><ellipse cx="${x}" cy="-10" rx="${4+i%3}" ry="${2.5+(i%2)}" fill="${i%3?'#ffb3c8':'#ff8fb0'}" opacity=".85"/></g></g>`}).join('')}
  <g stroke="#fff" stroke-opacity=".12" stroke-width="2">${[0,1,2,3,4,5].map(i=>`<line x1="${430+i*8}" y1="${200-i*30}" x2="${380+i*8}" y2="${210-i*30}"/>`).join('')}</g>`,
 manga:c=>`<g transform="translate(470 18) rotate(-4)"><g class="jolt"><rect width="150" height="100" fill="#fff"/><rect x="158" width="170" height="60" fill="#fff"/><rect x="158" y="68" width="170" height="110" fill="#fff"/><rect y="108" width="150" height="70" fill="#fff"/>
  <g fill="#1c0e22" opacity=".85">${Array.from({length:60},(_,i)=>`<circle cx="${8+(i%10)*14+(Math.floor(i/10)%2)*7}" cy="${8+Math.floor(i/10)*15}" r="${(1.2+(i%10)*.32).toFixed(1)}"/>`).join('')}</g>
  <svg x="158" y="68" width="170" height="110" viewBox="158 68 170 110"><g class="spin" stroke="#1c0e22" stroke-width="2">${Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return `<line x1="243" y1="123" x2="${(243+Math.cos(a)*160).toFixed(0)}" y2="${(123+Math.sin(a)*160).toFixed(0)}"/>`}).join('')}</g></svg><circle cx="243" cy="123" r="22" fill="#fff"/>
  <g class="bob"><path d="M175 10 h90 v34 h-50 l-14 12 v-12 h-26 z" fill="#fff" stroke="#1c0e22" stroke-width="2.5"/><text x="220" y="34" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-weight="700" font-size="18" fill="#1c0e22">!?</text></g>
  <g transform="rotate(-8 20 160)"><text class="pop" x="20" y="160" font-family="sans-serif" font-weight="900" font-size="40" fill="${c}">ドン!</text></g></g></g>`,
 films:c=>`<g transform="translate(520 0)"><path class="beam" d="M150 0 L300 200 L40 200 Z" fill="#fff" opacity=".07"/><circle cx="150" cy="-6" r="16" fill="#fff" opacity=".4"/>
  <g transform="translate(150 105) rotate(-12)"><rect x="-90" y="-10" width="180" height="70" fill="#f2e9f5"/><g class="clap"><rect x="-90" y="-36" width="180" height="22" fill="#1c0e22"/>
  ${[0,1,2,3,4].map(i=>`<rect x="${-80+i*36}" y="-34" width="16" height="22" fill="#f2e9f5" transform="skewX(-25)"/>`).join('')}</g>
  <rect x="-90" y="-10" width="180" height="10" fill="${c}"/><text x="-78" y="30" font-family="JetBrains Mono,monospace" font-size="12" fill="#1c0e22">SCENE 01  TAKE 3</text><text x="-78" y="50" font-family="JetBrains Mono,monospace" font-size="12" fill="#1c0e22">ROLL A</text></g></g>
  <g transform="translate(470 150)"><rect x="0" y="0" width="360" height="34" fill="#0c060f"/><g class="strip">${Array.from({length:34},(_,i)=>`<rect x="${6+i*21}" y="4" width="11" height="6" fill="#f2e9f5" opacity=".75"/><rect x="${6+i*21}" y="24" width="11" height="6" fill="#f2e9f5" opacity=".75"/>`).join('')}${[0,1,2,3,4,5,6,7,8,9].map(i=>`<rect x="${10+i*70}" y="12" width="60" height="10" fill="${c}" opacity="${.35+(i%5)*.12}"/>`).join('')}</g></g>`,
 games:c=>`<g transform="translate(560 40)"><g class="float"><path d="M20 20 h140 a28 28 0 0 1 28 28 l12 58 a20 20 0 0 1 -36 14 l-24 -30 h-80 l-24 30 a20 20 0 0 1 -36 -14 l12 -58 a28 28 0 0 1 28 -28z" fill="#f2e9f5"/>
  <rect x="38" y="46" width="12" height="36" fill="#1c0e22"/><rect x="26" y="58" width="36" height="12" fill="#1c0e22"/>
  <circle class="press" style="animation-delay:0s" cx="140" cy="52" r="8" fill="${c}"/><circle class="press" style="animation-delay:.5s" cx="158" cy="68" r="8" fill="#ff5c86"/><circle class="press" style="animation-delay:1s" cx="122" cy="68" r="8" fill="#6a2fc4"/><circle class="press" style="animation-delay:1.5s" cx="140" cy="84" r="8" fill="#f0c43c"/>
  <rect x="80" y="40" width="16" height="6" fill="#93879a"/><rect x="100" y="40" width="16" height="6" fill="#93879a"/></g></g>
  <g transform="translate(470 20)">${[0,1,2,3,4].map(i=>`<path class="${i<4?'beat':''}" style="animation-delay:${i*.15}s" transform="translate(${i*20} 0)" d="M2 4h4v-2h4v2h4v6h-2v2h-2v2h-2v2h-2v-2h-2v-2h-2v-2h-2z" fill="${i<4?'#ff5c86':'#45334f'}"/>`).join('')}</g>
  <text class="blink" x="472" y="186" font-family="JetBrains Mono,monospace" font-size="13" letter-spacing="3" fill="#fff" opacity=".7">PRESS START ▶</text>`,
 books:c=>`<g transform="translate(560 30)"><path d="M120 40 C90 22 40 20 0 30 v120 c40-10 90-8 120 10z" fill="#f7eedf"/><path d="M120 40 C150 22 200 20 240 30 v120 c-40-10-90-8-120 10z" fill="#fff8ec"/><path d="M120 40v120" stroke="#c9b48e" stroke-width="2"/>
  ${[0,1,2,3,4,5,6].map(i=>`<line x1="18" y1="${52+i*13}" x2="${100-(i%3)*8}" y2="${50+i*13}" stroke="#c9b48e" stroke-width="2"/><line x1="140" y1="${50+i*13}" x2="${222-(i%2)*14}" y2="${52+i*13}" stroke="#c9b48e" stroke-width="2"/>`).join('')}
  <path class="sway" d="M170 30 v48 l10-8 10 8 v-48" fill="${c}"/><path class="flip" d="M120 40 C150 22 200 20 240 30 v120 c-40-10-90-8-120 10z" fill="#fff3df" stroke="#e6d6b8"/></g>
  <g transform="translate(460 120)">${[['#c8324f',70],['#6a2fc4',60],['#d9a514',80],['#24a896',66]].map(([col,w],i)=>`<rect x="${i*6}" y="${60-i*18}" width="${w}" height="16" fill="${col}"/><rect x="${i*6+6}" y="${64-i*18}" width="${w-20}" height="2" fill="#fff" opacity=".5"/>`).join('')}</g>
  <text x="520" y="40" font-family="Noto Nastaliq Urdu,serif" font-size="22" fill="#fff" opacity=".35">کتاب</text>`,
 stories:c=>`<g transform="translate(560 24)"><rect x="0" y="10" width="160" height="150" fill="#fff8ec" transform="rotate(-6)"/>${[0,1,2,3,4,5,6,7].map(i=>`<line class="ink" style="animation-delay:${i*.6}s" pathLength="1" x1="16" y1="${40+i*14}" x2="${140-(i%3)*18}" y2="${40+i*14}" stroke="#5a3d2a" stroke-width="2" transform="rotate(-6)"/>`).join('')}
  <g class="quill"><path d="M150 150 C190 90 230 40 250 0 C235 50 210 100 165 160 Z" fill="#f2e9f5"/><path d="M150 150 L240 10" stroke="${c}" stroke-width="2"/><path d="M150 150 l-8 16 l14-8z" fill="#1c0e22"/></g>
  <rect x="200" y="120" width="44" height="40" fill="#1c0e22"/><rect x="208" y="110" width="28" height="12" fill="#1c0e22"/><rect x="200" y="130" width="44" height="6" fill="${c}"/>
  <circle cx="120" cy="170" r="6" fill="#1c0e22"/><circle cx="132" cy="178" r="3" fill="#1c0e22"/></g>`,
 music:c=>`<g transform="translate(560 18)"><g class="float"><path d="M40 120 V90 a90 90 0 0 1 180 0 V120" fill="none" stroke="#efe6f5" stroke-width="12" stroke-linecap="round"/><path d="M40 120 V90 a90 90 0 0 1 180 0 V120" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".7"/>
  <rect x="18" y="104" width="44" height="66" rx="18" fill="#1c0e22" stroke="#efe6f5" stroke-width="4"/><rect x="198" y="104" width="44" height="66" rx="18" fill="#1c0e22" stroke="#efe6f5" stroke-width="4"/><rect x="28" y="114" width="16" height="46" rx="8" fill="${c}"/><rect x="216" y="114" width="16" height="46" rx="8" fill="${c}"/></g>
  ${[0,1,2,3,4].map(i=>`<rect class="eq" style="animation-delay:-${(i*.37).toFixed(2)}s" x="${92+i*16}" y="110" width="9" height="60" fill="${i%2?'#efe6f5':c}"/>`).join('')}
  <g class="note1"><path d="M-20 60 v-38 l24 -6 v34" fill="none" stroke="#efe6f5" stroke-width="4"/><circle cx="-26" cy="62" r="7" fill="#efe6f5"/><circle cx="-2" cy="56" r="7" fill="#efe6f5"/></g>
  <g class="note2"><path d="M262 40 v-30" stroke="${c}" stroke-width="4"/><path d="M262 10 q14 6 10 20" fill="none" stroke="${c}" stroke-width="4"/><circle cx="256" cy="42" r="7" fill="${c}"/></g></g>`,
 hof:c=>`<g transform="translate(600 30)"><g class="float"><clipPath id="crownClip"><path d="M10 120 L0 30 L45 70 L80 0 L115 70 L160 30 L150 120 Z"/></clipPath><path d="M10 120 L0 30 L45 70 L80 0 L115 70 L160 30 L150 120 Z" fill="${c}"/><path d="M10 120 L0 30 L45 70 L80 0 L80 120Z" fill="#fff" opacity=".18"/><rect x="10" y="120" width="140" height="18" fill="#f0c43c"/><g clip-path="url(#crownClip)"><rect class="shine" x="-60" y="0" width="40" height="140" fill="#fff" opacity=".35" transform="skewX(-20)"/></g>
  <circle class="twinkle" cx="80" cy="84" r="10" fill="#c8324f"/><circle cx="35" cy="98" r="6" fill="#6a2fc4"/><circle cx="125" cy="98" r="6" fill="#6a2fc4"/><circle cx="0" cy="30" r="6" fill="#fff2c9"/><circle cx="80" cy="0" r="7" fill="#fff2c9"/><circle cx="160" cy="30" r="6" fill="#fff2c9"/></g></g>
  ${[0,1,2,3,4,5].map(i=>`<ellipse cx="${560-i*2}" cy="${160-i*22}" rx="12" ry="5" fill="#f0c43c" opacity=".55" transform="rotate(${-40+i*8} ${560-i*2} ${160-i*22})"/><ellipse cx="${800+i*2}" cy="${160-i*22}" rx="12" ry="5" fill="#f0c43c" opacity=".55" transform="rotate(${40-i*8} ${800+i*2} ${160-i*22})"/>`).join('')}`,
 overview:c=>`<g transform="translate(560 -20) scale(3.6)">${LOGO(64).replace(/<svg[^>]*>|<\/svg>/g,'').replace(/lg([PR])/g,'lgO$1')}</g>`,
 search:c=>`<g transform="translate(620 30)"><circle cx="60" cy="60" r="48" fill="none" stroke="#f2e9f5" stroke-width="12"/><circle cx="60" cy="60" r="40" fill="#fff" opacity=".06"/><rect x="96" y="104" width="22" height="70" fill="${c}" transform="rotate(-45 107 139)"/><path d="M36 44 a30 30 0 0 1 22 -14" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/></g>`
};
function artBg(c,seed,k){
  const glow=`<radialGradient id="gw${seed}" cx="85%" cy="40%" r="60%"><stop offset="0" stop-color="${c}" stop-opacity=".55"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  return `<svg class="bg" viewBox="0 0 820 200" preserveAspectRatio="xMaxYMid ${k?'meet':'slice'}" aria-hidden="true"><defs>${glow}</defs><rect width="820" height="200" fill="url(#gw${seed})"/>${STARS(40,340,820,seed)}${k&&ART[k]?ART[k](c):''}</svg>`;
}

const HEX={wrapped:'#d0508c',anime:'#8a50e0',manga:'#d23d5c',films:'#e8733a',games:'#24a896',books:'#b07a38',stories:'#d0508c',music:'#1f9d63',hof:'#e3b11c',search:'#c8325a',overview:'#c8325a'};
function banner(k,title,sub,stats,kicker){
  return `<section class="banner${k==='overview'?' ovb':''}" style="--c:${HEX[k]}">${artBg(HEX[k],title.length*13,k)}<div class="in">${k==='overview'?`<div class="emb ava"><img src="assets/avatar.webp" alt=""></div>`:`<div class="bico">${ico(k)}</div>`}<div><div class="kick">${esc(kicker||'Saturn Collections')}</div><h1>${esc(title)}</h1>${sub?`<div class="sub">${sub}</div>`:''}</div>${stats&&stats.length?`<div class="bst">${stats.map(([n,l])=>`<span><b>${n}</b>${esc(l)}</span>`).join('')}</div>`:''}</div></section>`;
}

/* ---------- covers ---------- */
let imgOK=true; // flips to false if remote images are blocked
const PAL=['#7a3fd1','#c8324f','#e2672b','#1f8a7c','#a12f31','#8e2f6e','#8a5a14','#5b3c88','#3f2a63','#b03a6e','#6b2440','#6b4d2e'];
const hash=s=>{let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h)};
const initials=t=>{const w=String(t).replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).filter(x=>!/^(the|a|an|of|and|no|to|wa|ga)$/i.test(x));return ((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase()};
const MIRU=new Set();const LOC=u=>{if(!u)return u;let m=/myanimelist\.net\/images\/(.+?\.(?:jpe?g|png|webp|gif))(\?.*)?$/i.exec(u),k=m&&m[1];if(!k){m=/image\.myanimelist\.net\/ui\/([\w-]+)/.exec(u);k=m&&'ui/'+m[1]+'.jpg'}return k&&MIRU.has(k)?'covers/u/'+k.replace(/\//g,'_'):u};
function cover(title,img,extra,cls){
  img=LOC(img);
  const c=PAL[hash(title)%PAL.length];
  const im=(img&&imgOK)?(cls==='eager'?`<img src="${esc(img)}" alt="" referrerpolicy="no-referrer" onerror="window.__imgFail&&window.__imgFail(this)">`:`<img data-src="${esc(img)}" alt="" referrerpolicy="no-referrer" onerror="window.__imgFail&&window.__imgFail(this)">`):'';
  // scores out of 10 are plain numbers; out of 5 they end in ★ or /5. Gold for a perfect score, purple for 8–9 (or 4–4.75 out of 5)
  const bm=/class="badge">([\d.]+)(★|\/5)?</.exec(extra||'');let gold=false,pur=false;
  if(bm){const v=+bm[1],five=!!bm[2];gold=five?v>=5:v>=10;pur=!gold&&(five?v>=4:v>=8)}
  return `<div class="cover ${cls||''}${gold?' gold':''}${pur?' pur':''}" style="--tc:${c}">${RING}<div class="ini">${esc(initials(title))}</div><div class="ct">${esc(title)}</div>${im}${extra||''}</div>`;
}
window.__imgFail=el=>{const n=+(el.dataset.try||0);if(n<4){el.dataset.try=n+1;const u=el.src.split('?')[0];setTimeout(()=>{el.src=u+'?r='+(n+1)},1500*(n+1));return}el.remove()};
/* our own lazy loader: native loading="lazy" was stalling on some devices */
const lazyIO='IntersectionObserver' in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=e.target;lazyIO.unobserve(i);if(i.dataset.src){i.src=i.dataset.src;i.removeAttribute('data-src')}}}),{rootMargin:'800px 400px'}):null;
// moving strips: load each cover while it is still about 5 covers away from showing (on both sides), so none appears blank
const stripIO=mq=>mq.__io||(mq.__io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const i=e.target;mq.__io.unobserve(i);if(i.dataset.src){i.src=i.dataset.src;i.removeAttribute('data-src')}}}),{root:mq,rootMargin:'0px 520px'}));
const lazyScan=()=>document.querySelectorAll('img[data-src]').forEach(i=>{if(i.__lz)return;i.__lz=1;const mq='IntersectionObserver' in window&&i.closest('.mq');if(mq)stripIO(mq).observe(i);else if(lazyIO)lazyIO.observe(i);else{i.src=i.dataset.src;i.removeAttribute('data-src')}});
new MutationObserver(lazyScan).observe(document.documentElement,{childList:true,subtree:true});

/* ---------- data model ---------- */
const AST={1:['Watching','var(--s1)'],2:['Completed','var(--s2)'],3:['On-Hold','var(--s3)'],4:['Dropped','var(--s4)'],6:['Plan to Watch','var(--s6)']};
const TAGS=D.animeTags||{};
((D.mir||{}).u||[]).forEach(x=>MIRU.add(x));
const MIRA=new Set((D.mir||{}).a||[]),MIRM=new Set((D.mir||{}).m||[]);
const anime=D.anime.map(a=>({tags:TAGS[a[0]]||'',id:a[0],t:a[1],alt:a[2],st:a[3],sc:a[4],ep:a[5],eps:a[6],type:a[7],img:MIRA.has(a[0])?`covers/a/${a[0]}.jpg`:/^http/.test(a[8]||'')?a[8]:a[8]?`https://cdn.myanimelist.net/images/anime/${a[8]}.jpg`:'',y:a[9],g:a[10].map(i=>D.animeGenres[i]),mal:a[11],up:a[12],rw:a[13]||0,rwing:a[14]||0,rwt:a[15]||0,n:norm(a[1]+' '+a[2])}));
const filmByKey={};
const films=D.films.map((f,i)=>{const o=Object.assign({},f,{i,logs:f.n,rw:f.rw||0,n:norm(f.t)});filmByKey[norm(f.t)+'|'+f.y]=o;return o});
/* films added by hand on this site (data/films_local.json); one Letterboxd already has is skipped */
function mergeLocalFilms(){for(let i=films.length-1;i>=0;i--)if(films[i].lf)films.splice(i,1);
  (D.filmsLocal||[]).forEach((x,k)=>{const key=norm(x.t)+'|'+(+x.y||0);if(filmByKey[key]&&!filmByKey[key].lf)return;
    const o={t:x.t,y:+x.y||0,u:x.tmdb?`https://letterboxd.com/tmdb/${x.tmdb}/`:`https://letterboxd.com/search/${encodeURIComponent(x.t)}/`,d:x.d||'',r:+x.r||0,s:x.s==='l'?'l':'w',n:norm(x.t),logs:x.s==='l'?0:1,rv:x.rv||'',lk:x.lk||0,wd:x.wd||'',img:x.img||'',tmdb:x.tmdb||0,rw:+x.rw||0,i:-1,lf:1,lix:k};
    films.push(o);filmByKey[key]=o})}
mergeLocalFilms();
// ratings changed here for films Letterboxd won't send again (data/film_ratings.json)
const fKey=f=>norm(f.t)+'|'+(f.y||'');
films.forEach(f=>{const o=(D.filmR||{})[fKey(f)];if(o&&o.r){f.lbr=f.r;f.r=o.r;f.rov=1}});
const filmUri={};films.forEach(f=>filmUri[f.u]=f);
/* TV series: kept on this site (data/series.json) plus anything Letterboxd logged that is really a series */
const SST={w:['Watched','var(--s2)'],c:['Watching','var(--s1)'],l:['Watchlist','var(--s6)'],h:['On hold','var(--s3)'],d:['Dropped','var(--s4)']};
const seriesOwn=[];
function rebuildSeries(){seriesOwn.length=0;const lb={};films.forEach(f=>{if(f.tv)lb[f.tv]=f});
  films.forEach(f=>{if(f.tv&&!f.sst)f.sst=f.s==='w'?'w':'l'});
  (D.series||[]).forEach((x,k)=>{const f=lb[x.id];if(f){Object.assign(f,{sst:x.st||f.sst,s:x.st==='l'?'l':'w',r:x.r||f.r,rv:x.note||f.rv,lk:x.lk||f.lk,rw:x.rw||f.rw,ep:x.ep||0,own:1,ix:k});return}
    seriesOwn.push({ep:x.ep||0,tv:x.id,t:x.t,y:+x.y||0,img:x.img||'',s:x.st==='l'?'l':'w',sst:x.st||'w',r:x.r||0,rw:x.rw||0,lk:x.lk||0,rv:x.note||'',d:x.d||'',wd:x.wd||'',n:norm(x.t),u:'',own:1,ix:k,logs:0})})}
rebuildSeries();
const listsFor=f=>D.filmLists.filter(l=>l.items.some(([t,y])=>norm(t)===f.n&&y===f.y)).map(l=>l.name);
const GSH={'Playing':'var(--s1)','Replaying':'#b48cff','Played':'var(--s2)','Backlog':'var(--s3)','Retired':'var(--s4)','Wish List':'var(--s6)'};
const GPLAYED={Played:1,Playing:1,Replaying:1,Retired:1};
const GDEF=g=>{const m=(D.gameMeta||{})[g.id]||{};const mine=g.dlcs||[];const pl=new Set(mine.filter(d=>d.p).map(d=>d.n.toLowerCase()));
  const names=[...(m.dlc||[]),...mine.map(d=>d.n)].filter((n,i,a)=>a.findIndex(x=>x.toLowerCase()===n.toLowerCase())===i);
  const rp=g.rp||0,avg=m.avg||0;let hrs=g.hrs||0,est=!!g.hrsEst;
  if(!hrs&&avg&&GPLAYED[g.shelf]){hrs=Math.round(avg*(1+rp)*10)/10;est=true}
  const base=g.img||(D.gameCovers||{})[g.id]||'';
  return {rp,avg,hrs,hrsEst:est,dlcs:names.map(n=>({n,p:pl.has(n.toLowerCase())?1:0,img:(m.dimg||{})[n]||'',base,mine:!(m.dlc||[]).some(x=>x.toLowerCase()===n.toLowerCase())}))}};
const gPlayedDlc=g=>(g.dlcs||[]).filter(d=>d.p);
const gDlcStack=g=>{const P=gPlayedDlc(g);return P.length?`<div class="dlcstack">${P.slice(0,3).map(d=>`<img src="${esc(LOC(d.img||d.base))}" alt="" title="${esc(d.n)}">`).join('')}</div>`:''};
const gDlcLine=g=>{const P=gPlayedDlc(g);return P.length?`<div class="dlcline"><span class="dlcb">DLC</span><span class="dlcn">${P.map(d=>esc(d.n)).join('<i>·</i>')}</span></div>`:''};
const gBadge=g=>g.r?`<span class="badge">${g.r}/5</span>`:'';
const dlcTile=(d,i,edit)=>`<${edit?'button type="button"':'div'} class="dlct${d.p?' on':''}" ${edit?`data-dp="${i}" aria-pressed="${d.p?'true':'false'}"`:''} title="${esc(d.n)}${d.p?' · played':''}">${cover(d.n,d.img||d.base,`${d.img?'':'<span class="dlctag">DLC</span>'}${d.p?'<span class="dlcok">✓</span>':''}`)}<span class="dn">${esc(d.n)}</span>${edit&&d.mine?`<span class="x" data-dx="${i}" role="button" aria-label="Remove">✕</span>`:''}</${edit?'button':'div'}>`;
const games=D.games.map((g,i)=>Object.assign({i,n:norm(g.t+' '+(g.fr||[]).join(' '))},g,{img:g.img||(D.gameCovers||{})[g.id]||''},GDEF(g)));
const stories=D.stories;
const MED={overview:{c:'var(--accent)',name:'Edit mode'},hof:{c:'var(--gold)',name:'Hall of Fame'},manga:{c:'var(--manga)',name:'Manga'},books:{c:'var(--book)',name:'Books'},anime:{c:'var(--anime)',name:'Anime'},films:{c:'var(--film)',name:'Films'},games:{c:'var(--game)',name:'Games'},stories:{c:'var(--story)',name:'Stories'},music:{c:'var(--music)',name:'Music'},singers:{c:'var(--music)',name:'Singers'},artists:{c:'var(--music)',name:'Artists'},characters:{c:'#24a896',name:'Characters'},people:{c:'#d9a514',name:'People'},hofp:{c:'var(--gold)',name:'Hall of Fame'}};
const stars=r=>{if(!r)return'';const f=Math.floor(r);return '★'.repeat(f)+(r%1?'½':'')};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;

/* ---------- nav / routing ---------- */
const ROUTES=[['overview','Overview','#e9ecf5'],['hof','Hall of Fame','#f0c43c'],['anime','Anime','#a77ef0'],['manga','Manga','#f06f88'],['films','Films','#f08a50'],['games','Games','#3cc5b2'],['books','Books','#d4a062'],['stories','Stories','#ec7ab0'],['music','Music','#3ccf8a'],['search','Search','#e9ecf5'],['wrapped','Wrapped','#ff6d93']];
$('#nav').innerHTML=ROUTES.map(([k,l,c])=>`<a href="#${k}" data-r="${k}" style="--c:${c}">${k==='overview'?'<img src="assets/logo-80.png" alt="" width="18" height="18" style="display:block;filter:drop-shadow(0 0 4px rgba(255,31,75,.5))">':ico(k)}${l}</a>`).join('');
let route='overview';
const state={anime:{tab:'all',q:'',sort:'updated',view:store.get('view_anime','table'),type:'',lim:60},films:{tab:'watched',q:'',sort:'watched',view:store.get('view_films','grid'),lim:60},games:{tab:'all',q:'',sort:'added',view:store.get('view_games','grid'),lim:60},manga:{tab:'all',q:'',sort:'score',view:store.get('view_manga','grid'),type:'',lim:60},books:{tab:'all',q:'',sort:'rating',view:store.get('view_books','grid'),shelf:'',lim:60},search:{q:'',ext:'anime',res:{},busy:false}};
function go(){
  let h=(location.hash||'').replace('#','');
  if(h==='edit'){store.set('owner',true);syncEditBtn();history.replaceState(null,'','#overview');h='overview';setTimeout(editSetup,300)}
  if(h==='hof'&&route!=='hof')hofSeg='home';
  if(!h.startsWith('item/'))$('#ov').classList.remove('show');
  if(h.startsWith('item/')){const p=h.split('/'),k=p[1],id=decodeURIComponent(p.slice(2).join('/'));
    if(SHK[k]){route=SHK[k][0];document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===route));render();setTimeout(()=>openFromLink(k,id),50);return}}
  if(h.startsWith('read/')){const p=h.split('/');RD={id:decodeURIComponent(p[1]||''),n:Math.max(0,(parseInt(p[2])||1)-1)};route='read';document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r==='stories'));render();window.scrollTo(0,0);return}
  if(!ROUTES.some(r=>r[0]===h))h='overview';
  route=h;
  document.querySelectorAll('#nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===h));
  render();window.scrollTo(0,0);
}
window.addEventListener('hashchange',go);
/* sharing: works the same in the browser and in the home-screen app (which has no address bar) */
const BASEURL=location.origin+location.pathname;
async function shareLink(url,title){
  try{if(navigator.share){await navigator.share({title:title||'Saturn Collections',url});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(e){prompt('Copy this link:',url)}
}
const PAGEN={overview:'Overview',hof:'Hall of Fame',anime:'Anime',manga:'Manga',films:'Films',games:'Games',books:'Books',stories:'Stories',music:'Music',search:'Search',wrapped:'Wrapped'};
$('#sharebtn').onclick=()=>{
  if(route==='read'&&RD){const w=[...works,...(DR?DR.works:[])].find(x=>x.id===RD.id);return shareLink(BASEURL+'#read/'+encodeURIComponent(RD.id),w?w.t+' · Rajeel Javed':'Saturn Collections')}
  shareLink(BASEURL+'#'+route,(PAGEN[route]||'')+' · Saturn Collections')};
let __sh=null;
const SHK={a:['anime',x=>x.id],m:['manga',x=>x.id],f:['films',x=>norm(x.t)+'|'+(+x.y||0)],s:['films',x=>x.id],g:['games',x=>x.id||('i'+x.i)],b:['books',x=>x.id],w:['stories',x=>x.id]};
function shareWrap(k,fn){return function(x){try{if(x&&!x.__new)__sh={u:BASEURL+'#item/'+k+'/'+encodeURIComponent(SHK[k][1](x)),t:(x.t||x.title||'')+' · Saturn Collections'}}catch(e){__sh=null}return fn.apply(this,arguments)}}
function openFromLink(k,id){
  const f={a:()=>anime.find(x=>String(x.id)===id),m:()=>manga.find(x=>String(x.id)===id),f:()=>films.find(x=>norm(x.t)+'|'+(+x.y||0)===id),
    s:()=>(seriesOwn||[]).find(x=>String(x.id)===id),g:()=>games.find(x=>String(x.id||('i'+x.i))===id),b:()=>books.find(x=>String(x.id)===id),w:()=>wById(id)}[k];
  const it=f&&f();if(!it){toast('That item is no longer on the list.');return}
  ({a:openAnime,m:openManga,f:openFilm,s:openSeries,g:openGame,b:openBook,w:openWork})[k](it)}
openAnime=shareWrap('a',openAnime);openManga=shareWrap('m',openManga);openFilm=shareWrap('f',openFilm);openSeries=shareWrap('s',openSeries);openGame=shareWrap('g',openGame);openBook=shareWrap('b',openBook);openStory=shareWrap('w',openStory);
function render(){({wrapped:rWrapped,manga:rManga,books:rBooks,hof:rHof,overview:rOverview,anime:rAnime,films:rFilms,games:rGames,stories:rStories,music:rMusic,read:rRead,search:rSearch})[route]()}

