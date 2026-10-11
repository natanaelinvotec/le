// Monta a pasta `dist/` que o Firebase Hosting publica no site atletapay-br (atletapay.com.br):
//   dist/            ← o site da plataforma (pasta atletapay/): vitrine, cadastro, painel, master, conta
//   dist/app/        ← o app das escolas (a raiz deste repositório), com <base href="/app/">
// Com a base fixa, atletapay.com.br/<escola>/login (reescrito para /app/login.html pelo
// firebase.json) carrega js/, css/ e assets/ de /app/… — a escola vem do 1º pedaço do caminho
// (js/escola-atual.js). Roda no GitHub Actions (hosting.yml); para testar: node tools/montar-dist.mjs
import { cpSync, mkdirSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const DIST = join(RAIZ, 'dist');
// O que NÃO é o app (fica fora de dist/app). apresentacoes/ e docs/ são pesados e não são servidos.
const FORA = new Set(['.git', '.github', 'atletapay', 'dist', 'docs', 'firebase', 'functions', 'node_modules', 'tests', 'tools', 'apresentacoes', 'firebase.json', '.firebaserc', 'README.md', 'CNAME']);
const EXT_FORA = /\.(md|mjs|zip|rar|psd|log)$/i;

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, 'app'), { recursive: true });

// 1. Site da plataforma na raiz.
cpSync(join(RAIZ, 'atletapay'), DIST, { recursive: true, filter: (p) => !/\/(README\.md|CNAME|\.[^/]+)$/.test(p) });

// 2. App em dist/app.
let n = 0;
for (const nome of readdirSync(RAIZ)) {
  if (FORA.has(nome) || nome.startsWith('.') || EXT_FORA.test(nome)) continue;
  cpSync(join(RAIZ, nome), join(DIST, 'app', nome), { recursive: true, filter: (p) => !EXT_FORA.test(p) && !/\/\.[^/]+$/.test(p) });
  n++;
}

// 3. <base href="/app/"> em cada página do app (logo depois de <head>, antes de qualquer link relativo).
let paginas = 0;
for (const nome of readdirSync(join(DIST, 'app'))) {
  if (!nome.endsWith('.html')) continue;
  const f = join(DIST, 'app', nome);
  let html = readFileSync(f, 'utf8');
  if (/<base\s/i.test(html)) continue;
  const m = /<head[^>]*>/i.exec(html);
  if (!m) { console.warn('sem <head>:', nome); continue; }
  html = `${html.slice(0, m.index + m[0].length)}\n<base href="/app/">${html.slice(m.index + m[0].length)}`;
  writeFileSync(f, html);
  paginas++;
}

// 3b. Vitrine de demonstração (atletapay.com.br/demo e /demo/fundador — firebase.json):
// cópias do Painel de Gestão e do Painel do Fundador com um import map que troca o SDK do Firebase
// por js/demo/sdk-demo.js (banco em memória com a escola fictícia de js/demo/dados-demo.js).
// Geradas aqui a cada publicação, assim a vitrine é sempre o painel de verdade da versão atual.
const SDK_DEMO = '/app/js/demo/sdk-demo.js';
const MODULOS_SDK = ['app', 'auth', 'firestore', 'firestore-lite', 'storage', 'messaging', 'app-check', 'functions', 'analytics'];
const importMap = JSON.stringify({ imports: Object.fromEntries(MODULOS_SDK.map((m) => [`https://www.gstatic.com/firebasejs/10.12.0/firebase-${m}.js`, SDK_DEMO])) });
function paginaDemo(origem, destino, titulo) {
  let html = readFileSync(join(DIST, 'app', origem), 'utf8');
  const base = /<base href="\/app\/">/i.exec(html);
  if (!base) throw new Error(`demo: ${origem} sem <base>`);
  // Sem service worker (a vitrine não precisa de offline nem do aviso "Versão nova") e sem os
  // tutoriais de primeira visita, sem gravar nada no navegador de quem está olhando.
  const semSwNemTutorial = '<script>try{delete Navigator.prototype.serviceWorker}catch(e){}try{var g=Storage.prototype.getItem;Storage.prototype.getItem=function(k){return /^le\\.tutorial\\./.test(k)?"demo":g.call(this,k)}}catch(e){}</script>';
  const cabeca = `\n<script type="importmap">${importMap}</script>\n${semSwNemTutorial}\n<meta name="robots" content="noindex">\n<meta name="description" content="Demonstração do AtletaPay com uma escola fictícia: turmas de várias artes marciais, graduações, presenças, mensalidades e o Painel do Fundador.">`;
  html = html.slice(0, base.index + base[0].length) + cabeca + html.slice(base.index + base[0].length);
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${titulo}</title>`);
  html = html.replace(/<\/body>/i, '<script type="module" src="js/demo/vitrine.js"></script>\n</body>');
  writeFileSync(join(DIST, 'app', destino), html);
}
paginaDemo('admin.html', 'demo.html', 'Demonstração · Painel de Gestão · AtletaPay');
paginaDemo('master.html', 'demo-fundador.html', 'Demonstração · Painel do Fundador · AtletaPay');

// 4. O service worker e os manifestos do app também precisam estar em /app/ (já copiados com o resto).
if (!existsSync(join(DIST, 'app', 'sw.js'))) throw new Error('dist/app/sw.js não existe');
if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/index.html (site da AtletaPay) não existe');

const tamanho = (d) => readdirSync(d).reduce((s, x) => { const p = join(d, x); const st = statSync(p); return s + (st.isDirectory() ? tamanho(p) : st.size); }, 0);
console.log(`dist pronto: ${n} itens do app em /app (${paginas} páginas com <base>), ${(tamanho(DIST) / 1048576).toFixed(1)} MB`);
