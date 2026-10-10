// Service worker "de saída" do endereço antigo (capoeira-liberdade.web.app): troca o sw.js que
// estava guardado no aparelho por este, que apaga os caches, se desinstala e recarrega as abas
// — a página nova (index.html) então leva a pessoa para atletapay.com.br.
const VERSAO = 'le-app-saida';
self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try { for (const k of await caches.keys()) await caches.delete(k); } catch (err) { /* ok */ }
    try { await self.registration.unregister(); } catch (err) { /* ok */ }
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) { try { c.navigate(c.url); } catch (err) { /* ok */ } }
  })());
});
self.addEventListener('fetch', () => { /* sem cache: tudo vai à rede */ });
