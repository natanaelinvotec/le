// service-worker.js — DESATIVADO (mantido só para limpar aparelhos antigos).
// Versões antigas do site registravam este arquivo com cache "primeiro do
// cache", o que podia mostrar telas desatualizadas. Hoje o app usa sw.js.
// Quando um aparelho antigo buscar este arquivo, ele apaga os caches velhos,
// cancela o próprio registro e recarrega as abas abertas (uma única vez).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith('le-shell-')).map((n) => caches.delete(n)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: 'window' });
    abas.forEach((aba) => { try { aba.navigate(aba.url); } catch (e) { /* ok */ } });
  })());
});
