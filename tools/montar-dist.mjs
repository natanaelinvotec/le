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

// 4. O service worker e os manifestos do app também precisam estar em /app/ (já copiados com o resto).
if (!existsSync(join(DIST, 'app', 'sw.js'))) throw new Error('dist/app/sw.js não existe');
if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/index.html (site da AtletaPay) não existe');

const tamanho = (d) => readdirSync(d).reduce((s, x) => { const p = join(d, x); const st = statSync(p); return s + (st.isDirectory() ? tamanho(p) : st.size); }, 0);
console.log(`dist pronto: ${n} itens do app em /app (${paginas} páginas com <base>), ${(tamanho(DIST) / 1048576).toFixed(1)} MB`);
