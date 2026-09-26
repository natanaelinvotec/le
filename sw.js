const CACHE='le-app-v2';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('le-app-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r0=e.request;
  if(r0.method!=='GET')return;
  // Vídeo/áudio (apresentações) vão direto pela rede: o navegador pede em pedaços (Range)
  // e o iPhone só toca se receber a resposta parcial original.
  if(r0.headers.has('range')||r0.destination==='video'||r0.destination==='audio')return;
  e.respondWith(fetch(r0).then(r=>{if(r.ok&&r.status===200){const c=r.clone();caches.open(CACHE).then(k=>k.put(r0,c)).catch(()=>{});}return r;}).catch(()=>caches.match(r0)));
});
