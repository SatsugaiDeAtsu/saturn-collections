/* Saturn Collections: one simple rule.
   Ask the site for the fresh copy. If it hasn't arrived after 4 seconds, show the saved copy
   instead (the fresh one is still saved for next time). Anime/manga covers never change, so
   once saved they are used straight away. */
const C='sc-v3';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==C)await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin||u.search)return;
  e.respondWith((async()=>{
    const c=await caches.open(C),key=r.mode==='navigate'?new URL('./',location).href:r;
    const hit=await c.match(key);
    if(hit&&/\/covers\/(a|m|u)\//.test(u.pathname))return hit;
    const net=fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok)c.put(key,res.clone());return res});
    if(!hit)return net;
    e.waitUntil(net.catch(()=>{}));
    return Promise.race([net.catch(()=>hit),new Promise(ok=>setTimeout(()=>ok(hit),4000))]);
  })());
});
