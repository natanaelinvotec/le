// sw.js — app instalável (PWA): velocidade, modo offline e notificações push.
//
// VELOCIDADE (v6): as telas, scripts e estilos abrem DIRETO do aparelho
// (sem esperar a internet) e, ao mesmo tempo, o app confere com o servidor se
// algo mudou. Se mudou, ele baixa a versão nova de TODOS os arquivos guardados
// de uma vez (para nunca misturar arquivo velho com novo) e avisa a tela:
// aparece "Versão nova pronta · Atualizar". Quem não tocar recebe a versão nova
// automaticamente na próxima vez que abrir.
// Bibliotecas externas com versão no endereço (Firebase, React, Font Awesome,
// fontes) nunca mudam: ficam guardadas e não voltam a ser baixadas.
//
// Offline: sem internet o app abre com o que já foi carregado e o Firestore
// mostra os dados do cache local dele. Fotos já vistas ficam guardadas (até 250).
// Push: o Firebase Cloud Messaging entrega a notificação mesmo com o app fechado.
const VERSAO = 'le-app-v7';
const CACHE_TELAS = `${VERSAO}-telas`;
const CACHE_FOTOS = `${VERSAO}-fotos`;
const CACHE_LIBS = 'le-libs-v1'; // não depende da VERSAO: endereços versionados não mudam
const MAX_FOTOS = 250;
const MAX_LIBS = 80;

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

// Guardados já na instalação: abrir qualquer tela principal não depende da internet.
const ESSENCIAIS = [
  './', 'index.html', 'gerenciar.html', 'css/site.css', 'js/site.js', 'js/site-render.js', 'js/site-padrao.js', 'app.html', 'rede.html', 'admin.html', 'login.html', 'offline.html', 'instalar.html', 'instalar-rede.html',
  'css/rede.css', 'css/admin.css',
  'js/firebase.js', 'js/escola.js', 'js/shared.js', 'js/support.js', 'js/experiencia.js', 'js/notificacoes.js',
  'js/brasoes.js', 'js/conta.js', 'js/apresentacao.js', 'js/moderacao.js', 'js/lgpd.js', 'js/gestao.js', 'js/login.js',
  'carteirinha.html', 'css/carteirinha.css', 'js/carteirinha.js', 'js/carteirinha-comum.js', 'js/qr.js',
  'manifest.webmanifest', 'rede.webmanifest',
];
// Imagens essenciais vão para o cache de fotos (é lá que as imagens são procuradas).
const IMAGENS_ESSENCIAIS = ['assets/app-icon-192.png', 'assets/rede-icon-192.png', 'assets/logo-liberdade.png', 'assets/logo-liberdade150.png', 'assets/parceiros/celula-20anos.png'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Guarda o essencial sem travar a instalação se um arquivo falhar.
  const guardar = (nome, lista) => caches.open(nome).then((c) => Promise.all(lista.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))));
  e.waitUntil(Promise.all([guardar(CACHE_TELAS, ESSENCIAIS), guardar(CACHE_FOTOS, IMAGENS_ESSENCIAIS)]));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('le-app-') && !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const ehFoto = (url, req) => req.destination === 'image' || /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(url.pathname) || url.hostname === 'firebasestorage.googleapis.com';
// Endereço com versão fixa = conteúdo que nunca muda.
const ehLibFixa = (url) =>
  (url.hostname === 'www.gstatic.com' && /^\/firebasejs\/\d/.test(url.pathname)) ||
  (url.hostname === 'unpkg.com' && /@\d/.test(url.pathname)) ||
  (url.hostname === 'cdnjs.cloudflare.com' && /\/ajax\/libs\/[^/]+\/\d/.test(url.pathname)) ||
  (url.hostname === 'cdn.jsdelivr.net' && /@\d/.test(url.pathname)) ||
  url.hostname === 'fonts.gstatic.com';
// Externo sem versão no endereço (CSS do Google Fonts, jsdelivr "latest"): mostra o guardado e atualiza por trás.
const ehExternoVariavel = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'cdn.jsdelivr.net';
// Banco, login, App Check e reCAPTCHA nunca passam por aqui — o SDK cuida deles.
const ehApi = (url) => /firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseinstallations|fcmregistrations|firebaseappcheck|content-firebaseappcheck|googleapis\.com\/(v1|google\.firestore)/.test(url.hostname + url.pathname)
  || (url.hostname === 'www.google.com' && url.pathname.startsWith('/recaptcha'))
  || (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/recaptcha'));

async function limitar(nome, max) {
  const c = await caches.open(nome); const ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}
const guardavel = (r) => r && (r.ok || r.type === 'opaque');

// ---------- Novidade: detectar versão nova e atualizar tudo de uma vez ----------
// Assinatura de um arquivo = ETag/Last-Modified do GitHub Pages (ou o tamanho).
const assinatura = (r) => (r && (r.headers.get('etag') || r.headers.get('last-modified') || r.headers.get('content-length'))) || '';
let novidadePendente = false; // já baixou a versão nova e a tela aberta ainda é a velha
let atualizandoTudo = null;
let rodando = false;

async function avisarTelas() {
  novidadePendente = true;
  const abas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  abas.forEach((a) => a.postMessage({ tipo: 'le-nova-versao' }));
}
// Rebaixa cada arquivo do próprio site guardado no aparelho numa área SEPARADA
// e só troca tudo de uma vez no fim — a tela nunca lê metade nova, metade velha.
// Se faltar internet no meio, nada é trocado (fica a versão velha inteira).
const CACHE_NOVO = `${VERSAO}-novo`;
function atualizarTudo() {
  if (atualizandoTudo) return atualizandoTudo;
  rodando = true;
  atualizandoTudo = (async () => {
    const c = await caches.open(CACHE_TELAS);
    await caches.delete(CACHE_NOVO);
    const novo = await caches.open(CACHE_NOVO);
    const pedidos = await c.keys();
    let i = 0; let falhou = false;
    const trabalhador = async () => {
      while (i < pedidos.length && !falhou) {
        const req = pedidos[i++];
        try {
          const r = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
          if (r && r.ok && r.status === 200) await novo.put(req, r);
          else if (!r || r.status !== 404) falhou = true; // 404: arquivo saiu do site, fica o velho
        } catch (e) { falhou = true; }
      }
    };
    await Promise.all([trabalhador(), trabalhador(), trabalhador(), trabalhador()]);
    if (!falhou) {
      const prontos = await novo.keys();
      const respostas = await Promise.all(prontos.map((k) => novo.match(k)));
      await Promise.all(prontos.map((k, n) => c.put(k, respostas[n])));
    }
    await caches.delete(CACHE_NOVO);
    rodando = false;
    if (!falhou) await avisarTelas();
  })().finally(() => { rodando = false; setTimeout(() => { atualizandoTudo = null; }, 30000); });
  return atualizandoTudo;
}

// Confere um arquivo do site com o servidor. Igual: guarda. Diferente: NÃO troca
// só ele — dispara a troca de tudo (atualizarTudo), para não misturar versões.
async function conferir(chave, cache, guardada) {
  try {
    const r = await fetch(chave.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (!r || !r.ok || r.status !== 200) return r;
    if (guardada && assinatura(guardada) !== assinatura(r)) { atualizarTudo(); return r; }
    if (!rodando) await cache.put(chave, r.clone());
    return r;
  } catch (e) { return null; }
}

self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.tipo === 'le-tem-novidade' && novidadePendente && e.source) e.source.postMessage({ tipo: 'le-nova-versao' });
  if (d.tipo === 'le-aplicou') novidadePendente = false;
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Vídeo/áudio: o navegador pede em pedaços (Range) e o iPhone só toca com a resposta original.
  if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
  const url = new URL(req.url);
  if (ehApi(url)) return;

  // Modelos da tela ainda não preenchidos ({{ a.foto }}): o navegador tentava
  // baixar esses "endereços" a cada abertura. Responde vazio na hora.
  if (url.origin === self.location.origin && /%7B%7B|\{\{/.test(url.pathname)) {
    e.respondWith(new Response('', { status: 204 }));
    return;
  }

  if (ehLibFixa(url)) {
    e.respondWith(caches.open(CACHE_LIBS).then(async (c) => {
      const guardada = await c.match(req);
      if (guardada) return guardada;
      const r = await fetch(req);
      if (guardavel(r)) c.put(req, r.clone()).then(() => limitar(CACHE_LIBS, MAX_LIBS)).catch(() => {});
      return r;
    }));
    return;
  }

  if (ehFoto(url, req)) {
    // Foto: mostra a guardada na hora e atualiza por trás.
    e.respondWith(caches.open(CACHE_FOTOS).then(async (c) => {
      const guardada = await c.match(req);
      const rede = fetch(req).then((r) => { if (guardavel(r)) { c.put(req, r.clone()).then(() => limitar(CACHE_FOTOS, MAX_FOTOS)).catch(() => {}); } return r; }).catch(() => guardada || Response.error());
      if (guardada) { e.waitUntil(rede.catch(() => null)); return guardada; }
      return rede;
    }));
    return;
  }

  if (ehExternoVariavel(url)) {
    e.respondWith(caches.open(CACHE_LIBS).then(async (c) => {
      const guardada = await c.match(req);
      const rede = fetch(req).then((r) => { if (guardavel(r)) c.put(req, r.clone()).catch(() => {}); return r; });
      if (guardada) { e.waitUntil(rede.catch(() => null)); return guardada; }
      return rede;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Telas, scripts e estilos do próprio site: do aparelho na hora + conferência por trás.
  const navegacao = req.mode === 'navigate';
  // Tela aberta depois que a versão nova terminou de baixar já É a nova.
  if (navegacao && !rodando) novidadePendente = false;
  // Página: a chave é o endereço sem ?modo=... e sem #, para achar a tela guardada.
  const chave = navegacao ? new Request(url.origin + url.pathname) : req;
  e.respondWith(caches.open(CACHE_TELAS).then(async (c) => {
    const guardada = await c.match(chave);
    if (guardada) {
      e.waitUntil(conferir(chave, c, guardada));
      return guardada;
    }
    // Primeira vez (ou arquivo novo): internet; sem internet, o que tiver.
    try {
      const r = await fetch(req);
      if (r && r.ok && r.status === 200 && r.type === 'basic' && !r.redirected) c.put(chave, r.clone()).catch(() => {});
      return r;
    } catch (err) {
      const parecida = await c.match(req, { ignoreSearch: true });
      if (parecida) return parecida;
      if (navegacao) return (await c.match('offline.html')) || Response.error();
      return Response.error();
    }
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
