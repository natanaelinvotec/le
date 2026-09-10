// Service worker do site da Capoeira Liberdade e Expressão.
// Só existe para permitir "instalar" o site como app (PWA) e dar uma
// experiência melhor offline — não mexe em nada do Firestore/Storage.
const CACHE_NAME = "le-shell-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./gerenciar.html",
  "./manifest.webmanifest",
  "./support.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Se algum arquivo do "app shell" ainda não existir, não trava a instalação.
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só GET, e só do próprio site — deixa Firestore, Storage, fontes do
  // Google e o CDN da Font Awesome passarem direto pela rede, sem cache.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Navegação entre páginas (abrir index/app/gerenciar): tenta a rede
  // primeiro, pra sempre pegar conteúdo atualizado; só usa o cache se
  // estiver offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match("./app.html")))
    );
    return;
  }

  // Demais arquivos estáticos do site (css/js/imagens em assets/_ds):
  // cache primeiro (carrega rápido e funciona offline), atualiza em segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
