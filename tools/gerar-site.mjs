// Gera o index.html do site público com o conteúdo padrão já desenhado
// (abre instantâneo, funciona sem JavaScript e ajuda o Google a ler a página).
// Rode na raiz do repositório depois de mudar js/site-padrao.js, js/site-render.js
// ou tools/site-modelo.html:   node tools/gerar-site.mjs
// O conteúdo editado pelo painel (gerenciar.html) NÃO precisa disto: ele entra
// sozinho pelo Firestore.
import { readFileSync, writeFileSync } from 'node:fs';
import { renderizarSite, hojeLocal } from '../js/site-render.js';

const hoje = hojeLocal();
const versao = hoje.replace(/-/g, '');
const modelo = readFileSync(new URL('./site-modelo.html', import.meta.url), 'utf8');
const corpo = renderizarSite(null, hoje);
const html = modelo.replaceAll('__VERSAO__', versao).replace('__SITE__', () => corpo);
writeFileSync(new URL('../index.html', import.meta.url), html);
console.log(`index.html gerado (${Math.round(html.length / 1024)} KB, versão ${versao}).`);
