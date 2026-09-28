// sw.js — app instalável (PWA): modo offline + notificações push.
// Offline: as telas, os scripts e os estilos ficam guardados no aparelho; as
// fotos já vistas também (até 250). Sem internet o app abre com o que já foi
// carregado e o Firestore mostra os dados do cache local dele.
// Push: o Firebase Cloud Messaging entrega a notificação mesmo com o app fechado.
const VERSAO = 'le-app-v5';
const CACHE_TELAS = `${VERSAO}-telas`;
const CACHE_FOTOS = `${VERSAO}-fotos`;
const MAX_FOTOS = 250;

// Mesmo projeto de js/escola.js (FIREBASE_CONFIG). Ao clonar para outra escola, troque aqui também.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBkwCDziIv-Uh7MLzsy9OYJmA_LMnn7jbg',
  authDomain: 'capoeira-liberdade.firebaseapp.com',
  projectId: 'capoeira-liberdade',
  storageBucket: 'capoeira-liberdade.firebasestorage.app',
  messagingSenderId: '492022804215',
  appId: '1:492022804215:web:c61aed556d9f1aa9576df2',
};
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
  firebase.initializeApp(FIREBASE_CONFIG);
  firebase.messaging(); // mostra sozinho as notificações que chegam com o app fechado
} catch (e) { /* sem internet na instalação: o push volta na próxima atualização */ }

const ESSENCIAIS = [
  './', 'index.html', 'app.html', 'rede.html', 'admin.html', 'login.html', 'offline.html',
  'css/rede.css', 'css/admin.css',
  'js/firebase.js', 'js/escola.js', 'js/shared.js', 'js/rede.js', 'js/admin.js', 'js/support.js', 'js/experiencia.js', 'js/notificacoes.js',
  'js/brasoes.js', 'js/conta.js', 'js/apresentacao.js', 'js/moderacao.js',
  'manifest.webmanifest', 'rede.webmanifest',
  'assets/app-icon-192.png', 'assets/rede-icon-192.png', 'assets/logo-liberdade.png', 'assets/logo-liberdade150.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Guarda o essencial sem travar a instalação se um arquivo falhar.
  e.waitUntil(caches.open(CACHE_TELAS).then((c) => Promise.all(ESSENCIAIS.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null)))));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('le-app-') && !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const ehFoto = (url, req) => req.destination === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url.pathname) || url.hostname === 'firebasestorage.googleapis.com';
const ehEstatico = (url) => url.origin === self.location.origin || /(^|\.)gstatic\.com$|fonts\.googleapis\.com$|fonts\.gstatic\.com$|cdnjs\.cloudflare\.com$|cdn\.jsdelivr\.net$/.test(url.hostname);

async function limitar(nome, max) {
  const c = await caches.open(nome); const ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Vídeo/áudio: o navegador pede em pedaços (Range) e o iPhone só toca com a resposta original.
  if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
  const url = new URL(req.url);
  // Banco e login (Firestore/Auth) nunca passam pelo cache daqui — o SDK tem o cache dele.
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseinstallations|fcmregistrations|googleapis\.com\/(v1|google\.firestore)/.test(url.hostname + url.pathname)) return;

  if (ehFoto(url, req)) {
    // Foto: mostra a guardada na hora e atualiza por trás.
    e.respondWith(caches.open(CACHE_FOTOS).then(async (c) => {
      const guardada = await c.match(req);
      const rede = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) { c.put(req, r.clone()).then(() => limitar(CACHE_FOTOS, MAX_FOTOS)); } return r; }).catch(() => guardada);
      return guardada || rede;
    }));
    return;
  }
  if (!ehEstatico(url)) return;
  // Telas, scripts e estilos: internet primeiro (sempre a versão nova); sem internet, o guardado.
  // Mesmo site: confere com o servidor (no-cache) para nunca misturar arquivo velho com novo.
  // (navegação de página não aceita Request novo com opções — vai como veio)
  const pedido = url.origin === self.location.origin && req.mode !== 'navigate' ? new Request(req, { cache: 'no-cache' }) : req;
  e.respondWith(fetch(pedido).then((r) => {
    if (r && r.ok && r.status === 200) { const copia = r.clone(); caches.open(CACHE_TELAS).then((c) => c.put(req, copia)).catch(() => {}); }
    return r;
  }).catch(async () => {
    const c = await caches.open(CACHE_TELAS);
    const achou = await c.match(req) || await c.match(req, { ignoreSearch: true });
    if (achou) return achou;
    if (req.mode === 'navigate') return (await c.match('offline.html')) || Response.error();
    return Response.error();
  }));
});

// Toque na notificação: abre (ou foca) o app no link da notificação.
self.addEventListener('notificationclick', (e) => {
  const dados = (e.notification && e.notification.data) || {};
  const link = (dados.FCM_MSG && dados.FCM_MSG.data && dados.FCM_MSG.data.link) || dados.link || 'app.html';
  e.notification.close();
  const alvo = new URL(link, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((abas) => {
    const mesma = abas.find((a) => a.url.split('#')[0] === alvo.split('#')[0]);
    if (mesma) { mesma.focus(); return mesma.navigate(alvo).catch(() => null); }
    return self.clients.openWindow(alvo);
  }));
});
