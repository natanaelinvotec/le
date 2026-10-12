/* gerar-pdfs-inclusao.mjs — gera os PDFs "Material da equipe · Atenção e inclusão"
   de cada arte marcial (menos capoeira, que tem a versão própria à mão).
   Conteúdo: tools/inclusao-conteudo.mjs (linguagem neutra). Saída: materiais/inclusao/.
   Arquivos: <condicao>-<arte>.pdf (1 por condição) + guia-inclusao-<arte>.pdf (guia completo).

   Uso:  node tools/gerar-pdfs-inclusao.mjs            (todas as artes)
         node tools/gerar-pdfs-inclusao.mjs jiujitsu   (uma arte)
   Depois registre as artes em js/inclusao.js → MATERIAIS_EXISTENTES. */
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { termosDa, MODALIDADES } from '../js/modalidades.js';
import { CONDICOES, lacoSVG } from '../js/inclusao.js';
import { condicoes, eticaSigilo, rodapeApp, apoiosNeutros, termos } from './inclusao-conteudo.mjs';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const PASTA = join(RAIZ, 'materiais', 'inclusao');
mkdirSync(PASTA, { recursive: true });

// Tipo de treino por arte: muda só a linguagem de contato/impacto (nunca inventa técnica).
const TIPO = {
  jiujitsu: 'agarre', judo: 'agarre', wrestling: 'agarre',
  karate: 'trocacao', taekwondo: 'trocacao', muaythai: 'trocacao', boxe: 'trocacao', kickboxing: 'trocacao',
  mma: 'misto', kravmaga: 'misto', kungfu: 'misto', outra: 'misto',
};
const ARTES = Object.keys(TIPO);

const CORES = { verde: '#389E92', azul: '#002D72', destaque: '#00E676', neutro: '#EAF2F1', vinho: '#D32F2F', aviso: '#8A6D00' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const li = (xs) => `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
const corDa = (id) => (CONDICOES.find((c) => c.id === id) || CONDICOES[0]).cores;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font:13px/1.5 'DejaVu Sans','Segoe UI',system-ui,sans-serif;color:#17302c}
.kicker{font-size:9.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:${CORES.verde}}
h1{font-size:23px;line-height:1.12;color:${CORES.azul};margin:4px 0 2px;font-weight:800}
.sub{font-size:12.5px;color:#5B6B68;font-weight:700;margin-bottom:10px}
.intro{font-size:13px;color:#2b4a46;background:${CORES.neutro};border-left:4px solid ${CORES.verde};padding:10px 13px;border-radius:0 10px 10px 0;margin:8px 0 14px}
h2{font-size:13.5px;color:${CORES.azul};font-weight:800;margin:14px 0 5px;display:flex;align-items:center;gap:7px}
h2::before{content:"";width:10px;height:10px;border-radius:3px;background:${CORES.verde};flex:none}
h2.evitar::before{background:${CORES.vinho}}
h2.sinais::before{background:${CORES.aviso}}
ul{margin:0 0 4px;padding-left:4px;list-style:none}
li{position:relative;padding:2px 0 2px 16px;font-size:12.5px;color:#243b37}
li::before{content:"";position:absolute;left:2px;top:9px;width:6px;height:6px;border-radius:50%;background:${CORES.verde}}
.titlinha{display:flex;align-items:center;gap:14px}
.titlinha .laco{flex:none}
.etica{margin-top:16px;padding:12px 14px;border:1px solid rgba(0,45,114,.14);border-radius:12px;background:#fff}
.etica h2{margin-top:0}
.appnote{margin-top:12px;font-size:10.5px;color:#5B6B68;line-height:1.45;border-top:1px dashed rgba(0,45,114,.2);padding-top:8px}
.page-break{break-before:page}
.princ li::before{background:${CORES.azul}}
.fluxo{display:grid;grid-template-columns:132px 1fr;gap:0;border:1px solid rgba(0,45,114,.14);border-radius:12px;overflow:hidden;margin-top:6px}
.fluxo .et{background:${CORES.neutro};font-weight:800;color:${CORES.azul};font-size:12px;padding:9px 11px;border-bottom:1px solid #fff}
.fluxo .tx{padding:9px 11px;font-size:12px;border-bottom:1px solid rgba(0,45,114,.08)}
.apoios{columns:2;column-gap:26px;margin-top:6px}
.apoios div{break-inside:avoid;font-size:12px;padding:3px 0 3px 20px;position:relative}
.apoios div::before{content:"\\2610";position:absolute;left:0;top:2px;color:${CORES.verde};font-size:13px}
.resumo{margin-top:6px}
.resumo .cond{break-inside:avoid;margin:10px 0;padding-left:12px;border-left:3px solid ${CORES.verde}}
.resumo h3{font-size:13px;color:${CORES.azul};margin-bottom:3px}
.resumo .mini{font-size:11px;color:#5B6B68;margin:2px 0}
.refs{margin-top:12px;font-size:10.5px;color:#5B6B68;line-height:1.45}`;

function paginaCondicao(T, id, c) {
  const cor = corDa(id);
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
    <div class="kicker">Material da equipe · Atenção e inclusão · ${esc(T.arte)}</div>
    <div class="titlinha">${lacoSVG(id, 46)}<div><h1>${esc(c.sigla)} — ${esc(c.nome)}</h1>
      <div class="sub">Como acolher e ensinar ${esc(T.noLocal)}</div></div></div>
    <div class="intro">${esc(c.intro)}</div>
    <h2>Como pode aparecer ${esc(T.noLocal)}</h2>${li(c.comoAparece)}
    <h2>O que ajuda — marque na ficha de adaptação do app o que funciona com este atleta</h2>${li(c.ajuda)}
    <h2 class="evitar">O que evitar</h2>${li(c.evitar)}
    <h2 class="sinais">Sinais para pausar e conversar com a família</h2>${li(c.sinais)}
    <div class="etica"><h2>${esc(eticaSigilo(T).titulo)}</h2>${li(eticaSigilo(T).itens)}</div>
    <div class="appnote">${esc(rodapeApp)}</div></body></html>`;
}

function paginaGuia(T, conds) {
  const princ = [
    `Adapte o movimento, não o aluno. Mantenha o nome, a intenção e o lugar ${T.noLocal}; mude altura, apoio e intensidade.`,
    'Previsibilidade acolhe. Mesma sequência de aula, avisos antes das mudanças e sinais combinados ajudam quase todo mundo — não só quem tem uma condição.',
    'Uma instrução por vez; demonstre; confirme. O trio que mais funciona com TDAH, DI, TDC e SD — e com iniciantes em geral.',
    'A família é parceira. Ela sabe o que funciona em casa e na escola. A ficha de adaptação do app é o lugar de registrar isso.',
    `Sigilo é respeito. A condição é dado sensível (LGPD): visível só ao núcleo e à administração; nunca na Rede, na carteirinha, no certificado ou em conversa ${T.noLocal}.`,
    'Você não diagnostica. O app registra o que a família ou o atleta informou. Se algo preocupa, converse com a família sem rótulos.',
  ];
  const fluxo = [
    ['1. Inscrição', 'A ficha começa com "Sem limitações". A família pode escolher uma ou mais condições, marcar o que ajuda na aula e deixar orientações. Cada condição vira um laço no canto da foto.'],
    ['2. Painel do professor', 'O laço aparece no card do atleta; o filtro "Atenção e inclusão" lista quem precisa de atenção. No card Avaliar/Editar o professor ajusta a condição, a ficha de adaptação e as orientações, e encontra o PDF de cada condição.'],
    ['3. Chamada', 'Quando o atleta chega (Face ID ou manual), um aviso mostra os laços, a ficha de adaptação e as orientações — por 45 segundos, no tablet do professor.'],
    ['4. App do aluno / família', 'Em Perfil → Atenção e inclusão, o próprio atleta ou o responsável legal atualiza a ficha quando algo muda. As regras do banco só deixam esse campo ser alterado pela família.'],
    ['5. Relatórios', 'Relatórios → Atenção e inclusão reúne os atletas do núcleo (ou de todo o grupo, para o Admin) por condição, com exportação para a equipe e um relatório anonimizado para parcerias.'],
    ['6. Brasão Inclusão', 'O responsável de núcleo que mantém atletas de inclusão ativos há pelo menos 6 meses recebe o brasão de inclusão — calculado no servidor, só com totais (ninguém é identificado).'],
  ];
  const apoios = apoiosNeutros(T);
  const resumo = Object.entries(conds).map(([id, c]) => `<div class="cond"><h3>${esc(c.sigla)} — ${esc(c.nome)}</h3>
    <div class="mini">${esc(c.intro)}</div>
    <div class="mini"><b>O que ajuda:</b> ${esc(c.ajuda.slice(0, 4).join(' '))}</div>
    <div class="mini"><b>O que evitar:</b> ${esc(c.evitar.slice(0, 2).join(' '))}</div></div>`).join('');
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
    <div class="kicker">Material da equipe · Atenção e inclusão · ${esc(T.arte)}</div>
    <h1>Inclusão ${esc(T.noLocal)} — guia da equipe</h1>
    <div class="sub">As 7 condições, a ficha de adaptação e o fluxo no app</div>
    <div class="intro">Inclusão não é um projeto paralelo: é ${esc(T.oLocal)} funcionando para todo mundo. Este guia reúne, em linguagem de treino, o que o professor precisa saber sobre as sete condições que o app registra, a ficha de adaptação e o fluxo que o AtletaPay usa para que a informação certa chegue na hora certa — e só para quem precisa.</div>
    <h2>Princípios</h2><div class="princ">${li(princ)}</div>
    <h2>Como funciona no app</h2>
    <div class="fluxo">${fluxo.map(([e, t]) => `<div class="et">${esc(e)}</div><div class="tx">${esc(t)}</div>`).join('')}</div>
    <div class="page-break"></div>
    <h2>Ficha de adaptação — os 18 apoios</h2>
    <p style="font-size:11.5px;color:#5B6B68;margin:3px 0 4px">As mesmas opções que aparecem na inscrição, no painel e no app do aluno. O pontinho verde no app indica o apoio que costuma ajudar na condição marcada, mas a ficha é do atleta: marca-se o que funciona com ele.</p>
    <div class="apoios">${apoios.map((a) => `<div>${esc(a)}</div>`).join('')}</div>
    <h2>As sete condições, em resumo</h2>
    <p style="font-size:11.5px;color:#5B6B68;margin:3px 0 0">O PDF individual de cada condição traz a versão completa (como aparece ${esc(T.noLocal)}, o que ajuda, o que evitar, sinais para pausar).</p>
    <div class="resumo">${resumo}</div>
    <div class="etica"><h2>${esc(eticaSigilo(T).titulo)}</h2>${li(eticaSigilo(T).itens)}</div>
    <div class="refs">Referências gerais para aprofundar (consulte com a família e com a escola): Lei Brasileira de Inclusão (Lei 13.146/2015); Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva (MEC); materiais do Comitê Paralímpico Brasileiro sobre esporte adaptado. Este guia é apoio pedagógico e não substitui orientação de profissionais de saúde e educação.</div>
    </body></html>`;
}

const rodape = (arte) => `<div style="width:100%;font:7.5px 'Segoe UI',sans-serif;color:#8aa0a0;padding:0 14mm;display:flex;justify-content:space-between">
  <span>${esc(arte)} · AtletaPay — Material da equipe · Apoio pedagógico, não substitui profissionais de saúde e educação.</span>
  <span>pág. <span class="pageNumber"></span></span></div>`;

async function gerar(artes) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const page = await browser.newPage();
  let n = 0;
  for (const art of artes) {
    if (!MODALIDADES[art] || art === 'capoeira') { console.warn('pulando', art); continue; }
    const T = termos({ ...termosDa(art), oLocal: (termosDa(art).local === 'roda' ? 'a roda' : `o ${termosDa(art).local}`) }, TIPO[art] || 'misto');
    const conds = condicoes(T);
    const pdfOpts = { format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: rodape(T.arte), margin: { top: '12mm', bottom: '14mm', left: '14mm', right: '14mm' } };
    for (const c of CONDICOES) {
      await page.setContent(paginaCondicao(T, c.id, conds[c.id]), { waitUntil: 'networkidle' });
      const buf = await page.pdf(pdfOpts);
      writeFileSync(join(PASTA, `${c.id.toLowerCase()}-${art}.pdf`), buf); n++;
    }
    await page.setContent(paginaGuia(T, conds), { waitUntil: 'networkidle' });
    writeFileSync(join(PASTA, `guia-inclusao-${art}.pdf`), await page.pdf(pdfOpts)); n++;
    console.log(`✓ ${art} (${T.arte}) — 8 PDFs`);
  }
  await browser.close();
  console.log(`\n${n} PDFs gerados em materiais/inclusao/`);
}

const alvo = process.argv.slice(2).filter((a) => ARTES.includes(a));
gerar(alvo.length ? alvo : ARTES);
