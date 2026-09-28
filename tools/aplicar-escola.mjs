// Aplica js/escola.js nos arquivos que não conseguem importar JavaScript:
// manifestos do app e da Rede, sw.js (config do Firebase), .firebaserc e o
// projeto do GitHub Actions. Uso (na raiz do repositório): node tools/aplicar-escola.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { ESCOLA, FIREBASE_CONFIG } from '../js/escola.js';

const ler = (p) => readFileSync(p, 'utf8');
const gravar = (p, s) => { writeFileSync(p, s); console.log('atualizado:', p); };

const app = JSON.parse(ler('manifest.webmanifest'));
app.name = ESCOLA.nome; app.short_name = ESCOLA.nomeCurto;
app.description = `Portal do atleta, da família e do painel de gestão — ${ESCOLA.nome}.`;
app.background_color = ESCOLA.cores.navy; app.theme_color = ESCOLA.cores.navy;
(app.shortcuts || []).forEach((s) => { if (/rede\.html#feed/.test(s.url)) { s.name = ESCOLA.nomeRede; } });
gravar('manifest.webmanifest', `${JSON.stringify(app, null, 2)}\n`);

const rede = JSON.parse(ler('rede.webmanifest'));
rede.name = ESCOLA.nomeRede; rede.short_name = ESCOLA.nomeRede;
rede.description = `A rede social interna do ${ESCOLA.nome} — com atalho para o seu painel de gestão.`;
rede.theme_color = ESCOLA.cores.teal;
gravar('rede.webmanifest', `${JSON.stringify(rede, null, 2)}\n`);

const sw = ler('sw.js').replace(/const FIREBASE_CONFIG = \{[\s\S]*?\};/, `const FIREBASE_CONFIG = ${JSON.stringify(FIREBASE_CONFIG, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:').replace(/"/g, "'")};`);
gravar('sw.js', sw);

gravar('.firebaserc', `${JSON.stringify({ projects: { default: FIREBASE_CONFIG.projectId } }, null, 2)}\n`);
gravar('.github/workflows/firebase.yml', ler('.github/workflows/firebase.yml').replace(/PROJETO: .*/, `PROJETO: ${FIREBASE_CONFIG.projectId}`));
gravar('functions/scripts/migrar.mjs', ler('functions/scripts/migrar.mjs').replace(/process\.env\.PROJETO \|\| '[^']*'/, `process.env.PROJETO || '${FIREBASE_CONFIG.projectId}'`));
console.log('\nPronto. Troque também os ícones em assets/ (app-icon-*, rede-icon-*) e o logo.');
