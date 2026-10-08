// sw.js — app instalável (PWA): cache "pesado" para celular e navegador,
// modo offline e notificações push.
//
// VELOCIDADE (v17): TUDO abre do aparelho — telas, scripts, estilos, fontes,
// ícones, bibliotecas do Firebase e fotos. Nada é conferido com o servidor a
// cada abertura (antes, cada arquivo era reconferido toda vez: dezenas de
// pedidos em paralelo brigando com o banco pela internet do celular).
// A ÚNICA coisa que manda baixar de novo é a linha VERSAO abaixo — e uma
// checagem leve, uma vez por dia, para o app instalado que fica aberto.
//
// Offline: sem internet o app abre com o que já foi carregado e o Firestore
// mostra os dados do cache local dele. Fotos já vistas ficam guardadas (até 800).
// Push: o Firebase Cloud Messaging entrega a notificação mesmo com o app fechado.
const VERSAO = 'le-app-v31'; // ← mude SÓ isto a cada atualização publicada (ver quadro abaixo)
const CACHE_TELAS = `${VERSAO}-telas`;
const CACHE_FOTOS = `${VERSAO}-fotos`;
const CACHE_LIBS = 'le-libs-v1'; // não depende da VERSAO: endereços versionados não mudam
const MAX_FOTOS = 800; // fotos de alunos, brasões e Rede guardadas no aparelho
const MAX_LIBS = 120;

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

// ============================================================================
// COMO ATUALIZAR O APP DEPOIS DE SUBIR ARQUIVOS NOVOS
// Troque SÓ a linha "const VERSAO" lá em cima (ex.: le-app-v17 → le-app-v18).
// O navegador percebe que este sw.js mudou, baixa tudo de novo numa tacada só,
// apaga o cache antigo e mostra "Versão nova pronta · Atualizar" em quem
// estiver com o app aberto. Quem abrir depois já entra na versão nova.
// Não precisa mexer em ?v= nos HTMLs: este cache ignora o ?v= dos arquivos
// do próprio site (a versão é a VERSAO acima).
// ============================================================================

// Guardados já na instalação: qualquer tela abre do aparelho, sem internet.
const ESSENCIAIS = [
  './', 'index.html', 'login.html', 'app.html', 'admin.html', 'rede.html', 'gerenciar.html', 'offline.html', 'instalar.html', 'instalar-rede.html',
  'brasoes.html', 'carteirinhas.html', 'carteirinha.html', 'certificado.html', 'certificados.html', 'campeonatos.html', 'master.html', 'checkin.html', 'v.html', 'inscricao.html', 'privacidade.html',
  'css/site.css', 'css/rede.css', 'css/admin.css', 'css/carteirinha.css', 'css/certificado.css', 'css/certificados.css', 'css/campeonatos.css', 'css/master.css', 'css/gerenciar.css', 'css/inscricao.css',
  'js/firebase.js', 'js/escola.js', 'js/shared.js', 'js/support.js', 'js/experiencia.js', 'js/notificacoes.js',
  'js/brasoes.js', 'js/brasoes-admin.js', 'js/inclusao.js', 'js/conta.js', 'js/apresentacao.js', 'js/moderacao.js', 'js/lgpd.js', 'js/gestao.js', 'js/login.js', 'js/admin.js', 'js/rede.js', 'js/master.js', 'js/faceid.js',
  'js/carteirinha.js', 'js/carteirinhas.js', 'js/carteirinha-comum.js', 'js/qr.js', 'js/verificar.js', 'js/checkin.js', 'js/inscricao.js', 'js/gerenciar.js',
  'js/certificado.js', 'js/certificado-render.js', 'js/certificados.js', 'js/campeonatos.js', 'js/campeonato-motor.js', 'js/celebrar.js', 'js/card-story.js', 'js/assinatura.js', 'js/aniversarios.js',
  'js/site.js', 'js/site-render.js', 'js/site-padrao.js', 'js/escola-atual.js', 'js/modalidades.js', 'js/faixas.js',
  'manifest.webmanifest', 'rede.webmanifest',
];
// Imagens essenciais vão para o cache de fotos (é lá que as imagens são procuradas).
const IMAGENS_ESSENCIAIS = ['assets/app-icon-192.png', 'assets/rede-icon-192.png', 'assets/logo-liberdade.png', 'assets/logo-liberdade150.png', 'assets/marca/brasao-1024.png', 'assets/parceiros/celula-20anos.png'];
// Bibliotecas externas que o painel e o app usam sempre: já ficam guardadas na
// instalação (endereço com versão = nunca mudam = nunca baixam de novo).
const LIBS_ESSENCIAIS = [
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-lite.js', 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // Guarda o essencial sem travar a instalação se um arquivo falhar.
  const guardar = (nome, lista, opcoes) => caches.open(nome).then((c) => Promise.all(lista.map((u) => fetch(new Request(u, opcoes)).then((r) => { if (guardavel(r)) return c.put(chaveDe(new Request(u)), r); return null; }).catch(() => null))));
  e.waitUntil(Promise.all([
    guardar(CACHE_TELAS, ESSENCIAIS, { cache: 'reload', credentials: 'same-origin' }),
    guardar(CACHE_FOTOS, IMAGENS_ESSENCIAIS, { cache: 'reload' }),
    caches.open(CACHE_LIBS).then(async (c) => { for (const u of LIBS_ESSENCIAIS) { if (!(await c.match(u))) await fetch(u).then((r) => (guardavel(r) ? c.put(u, r) : null)).catch(() => null); } }),
  ]));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith('le-app-') && !k.startsWith(VERSAO)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim())
    // Quem está com o app aberto na versão velha vê "Versão nova pronta · Atualizar".
    .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .then((abas) => { if (abas.length) { novidadePendente = true; abas.forEach((a) => a.postMessage({ tipo: 'le-nova-versao' })); } }));
});

const ehFoto = (url, req) => req.destination === 'image' || /\.(png|jpe?g|webp|gif|svg|ico)(\?|$)/i.test(url.pathname) || url.hostname === 'firebasestorage.googleapis.com';
// Endereço com versão fixa = conteúdo que nunca muda.
const ehLibFixa = (url) =>
  (url.hostname === 'www.gstatic.com' && /^\/firebasejs\/\d/.test(url.pathname)) ||
  (url.hostname === 'unpkg.com' && /@\d/.test(url.pathname)) ||
  (url.hostname === 'cdnjs.cloudflare.com' && /\/ajax\/libs\/[^/]+\/\d/.test(url.pathname)) ||
  (url.hostname === 'cdn.jsdelivr.net' && /@\d/.test(url.pathname)) ||
  url.hostname === 'fonts.gstatic.com';
// Externo sem versão no endereço (CSS do Google Fonts, jsdelivr "latest"): guarda e usa do aparelho;
// confere com o servidor só na checagem diária.
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
// Chave de cache dos arquivos do próprio site: sem ?v=... e sem #. Assim o
// pré-cache da instalação serve os pedidos reais (que vêm com ?v=) e uma
// mudança de ?v= não força download — a versão é a VERSAO deste arquivo.
const chaveDe = (req) => { const u = new URL(req.url, self.location.href); return u.origin === self.location.origin ? new Request(u.origin + u.pathname) : req; };

// ---------- Versão nova ----------
let novidadePendente = false; // o app aberto ainda é a versão velha
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.tipo === 'le-tem-novidade' && novidadePendente && e.source) e.source.postMessage({ tipo: 'le-nova-versao' });
  if (d.tipo === 'le-aplicou') novidadePendente = false;
});
// Checagem diária (app instalado que fica dias aberto): lê este sw.js no
// servidor e, se a VERSAO lá for outra, manda o navegador instalar a nova.
// Uma leitura pequena por dia — e não uma conferência de cada arquivo a cada abertura.
const META = 'le-meta';
const INTERVALO_CHECAGEM = 12 * 3600000;
async function checarVersaoNoServidor() {
  try {
    const meta = await caches.open(META);
    const ultima = await meta.match('ultima-checagem');
    if (ultima && Date.now() - Number(await ultima.text()) < INTERVALO_CHECAGEM) return;
    await meta.put('ultima-checagem', new Response(String(Date.now())));
    const r = await fetch(self.location.href, { cache: 'no-cache' });
    if (!r.ok) return;
    const m = /const VERSAO = '([^']+)'/.exec(await r.text());
    if (m && m[1] !== VERSAO) await self.registration.update();
  } catch (e) { /* sem internet: tenta no próximo dia */ }
}

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

  // Bibliotecas externas com versão fixa e CSS de fontes: do aparelho; baixa uma vez só.
  if (ehLibFixa(url) || ehExternoVariavel(url)) {
    e.respondWith(caches.open(CACHE_LIBS).then(async (c) => {
      const guardada = await c.match(req);
      if (guardada) return guardada;
      const r = await fetch(req);
      if (guardavel(r)) c.put(req, r.clone()).then(() => limitar(CACHE_LIBS, MAX_LIBS)).catch(() => {});
      return r;
    }));
    return;
  }

  // Fotos e imagens (Storage e do site): do aparelho; baixa uma vez só.
  // Toda foto nova no Storage tem endereço novo (carimbo de data), então a
  // guardada nunca fica "velha". As do site trocam junto com a VERSAO.
  if (ehFoto(url, req)) {
    e.respondWith(caches.open(CACHE_FOTOS).then(async (c) => {
      const chave = url.origin === self.location.origin ? chaveDe(req) : req;
      const guardada = await c.match(chave);
      if (guardada) return guardada;
      try {
        const r = await fetch(req);
        if (guardavel(r)) c.put(chave, r.clone()).then(() => limitar(CACHE_FOTOS, MAX_FOTOS)).catch(() => {});
        return r;
      } catch (err) { return Response.error(); }
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Telas, scripts e estilos do próprio site: do aparelho, sem conferir cada
  // arquivo a cada abertura. A atualização é pela VERSAO (ver o quadro no topo).
  const navegacao = req.mode === 'navigate';
  if (navegacao) { novidadePendente = false; e.waitUntil(checarVersaoNoServidor()); }
  const chave = chaveDe(req);
  e.respondWith(caches.open(CACHE_TELAS).then(async (c) => {
    const guardada = await c.match(chave);
    if (guardada) return guardada;
    // Arquivo que não estava no pré-cache: baixa uma vez e guarda.
    try {
      const r = await fetch(req);
      if (r && r.ok && r.status === 200 && r.type === 'basic' && !r.redirected) c.put(chave, r.clone()).catch(() => {});
      return r;
    } catch (err) {
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
