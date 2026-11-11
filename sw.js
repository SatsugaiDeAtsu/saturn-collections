/* Saturn Collections: keeps pictures and icons on the device so pages open fast.
   Lists (data/*.json) and the page itself always come fresh from the site first,
   so edits show straight away; the saved copy is only used when offline. */
const PICS='sc-pics-v1',PAGE='sc-page-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(![PICS,PAGE].includes(k))await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(/\/(covers|assets)\//.test(p)&&!u.search){
    // show the saved picture at once, refresh it quietly in the background
    e.respondWith((async()=>{
      const c=await caches.open(PICS),hit=await c.match(r);
      const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>hit);
      if(hit){e.waitUntil(net);return hit}
      return net;
    })());
    return;
  }
  if(r.mode==='navigate'||(/\/data\/[^/]+\.json$/.test(p)&&!u.search)||/\/(index\.html)?$/.test(p)){
    e.respondWith((async()=>{
      const c=await caches.open(PAGE);
      try{const res=await fetch(r,{cache:'no-cache'});if(res.ok)c.put(r,res.clone());return res}
      catch(err){const hit=await c.match(r,{ignoreSearch:r.mode==='navigate'});if(hit)return hit;throw err}
    })());
  }
});
