/* inclusao.js — atenção e inclusão: as condições que o professor precisa conhecer
   (TEA, TDAH, PC, SD, DI, DV/DA, TDC), o laço de conscientização de cada uma
   (SVG desenhado aqui, sem imagem externa) e os ajudantes usados pela inscrição,
   pelo painel e pelos relatórios.

   Onde mora no banco: usuarios/{uid}.inclusao = { condicoes: ['TEA', …], apoios: ['aviso-mudanca', …], observacoes: '' }.
   Lista de condições vazia = "Sem limitações". `apoios` é a ficha de adaptação: o que
   funciona com ESSE atleta na aula (marcado pelo responsável, pelo professor ou na inscrição). É informação sensível (LGPD): só o próprio
   aluno/responsável, o professor do núcleo e a administração leem; NUNCA entra
   no cartão público (perfisPublicos), na Rede, na carteirinha nem no certificado
   — o servidor monta o cartão público campo a campo e este não está lá.

   Turmas por arte (v37): os textos foram escritos para a capoeira (roda, berimbau, ginga).
   Toda função que mostra texto aceita `arte` (chave de js/modalidades.js) e troca os termos
   pela linguagem da arte (adaptarTexto): "na roda" vira "no tatame"/"no ringue", "berimbau"
   vira "comando do professor", "ginga" vira "movimento base". Os PDFs só existem na versão
   capoeira (materiais/inclusao): para as outras artes o cartão avisa "guia geral (adaptado de
   capoeira) — versão para <arte> em preparação". */
import { termosDa, MODALIDADES } from './modalidades.js';

export const SEM_LIMITACOES = 'Sem limitações';

// cores = faixa(s) do laço; 'padrao' muda o desenho: 'quebra-cabeca' (TEA),
// 'duas' (SD: azul e amarelo, um em cada braço) e 'listras' (DV/DA: azul e branco).
export const CONDICOES = [
  { id: 'TEA', sigla: 'TEA', nome: 'Transtorno do Espectro Autista', cores: ['#2E7BD6', '#E53935', '#F9C80E', '#43A047'], padrao: 'quebra-cabeca', dica: 'Rotina previsível, avisos antes de mudanças, atenção a sons altos e toque.', sugeridos: ['aviso-mudanca', 'rotina-fixa', 'som-baixo', 'pedir-toque', 'pausas'] },
  { id: 'TDAH', sigla: 'TDAH', nome: 'Transtorno do Déficit de Atenção com Hiperatividade', cores: ['#F26A1B'], dica: 'Instruções curtas, uma por vez; movimento ajuda a manter o foco.', sugeridos: ['instrucao-curta', 'perto-professor', 'tarefa-ativa', 'pausas'] },
  { id: 'PC', sigla: 'PC', nome: 'Paralisia Cerebral', cores: ['#3F7A3A'], dica: 'Adaptar movimentos e tempo; cuidado com equilíbrio e quedas.', sugeridos: ['movimento-adaptado', 'tempo-extra', 'apoio-fisico', 'acompanhante'] },
  { id: 'SD', sigla: 'SD', nome: 'Síndrome de Down (Trissomia 21)', cores: ['#1976D2', '#FFD600'], padrao: 'duas', dica: 'Reforço positivo, demonstração visual; atenção a hipotonia e articulações.', sugeridos: ['demonstracao', 'reforco-positivo', 'movimento-adaptado', 'tempo-extra'] },
  { id: 'DI', sigla: 'DI', nome: 'Deficiência Intelectual', cores: ['#F39C12'], dica: 'Passos simples e repetidos; confirmar entendimento antes de avançar.', sugeridos: ['instrucao-curta', 'demonstracao', 'confirmar', 'tempo-extra', 'reforco-positivo'] },
  { id: 'DVDA', sigla: 'DV / DA', nome: 'Deficiência Visual / Deficiência Auditiva', cores: ['#1F3C88', '#FFFFFF'], padrao: 'listras', dica: 'Descrever movimentos em voz alta (DV) ou mostrar e sinalizar (DA); posicionar perto do professor.', sugeridos: ['perto-professor', 'descricao-oral', 'sinais-visuais', 'apoio-fisico'] },
  { id: 'TDC', sigla: 'TDC', nome: 'Transtorno do Desenvolvimento da Coordenação', cores: ['#3B3F8F'], dica: 'Decompor o movimento, mais repetições, elogiar o progresso e não a perfeição.', sugeridos: ['movimento-adaptado', 'demonstracao', 'tempo-extra', 'reforco-positivo'] },
];

// Ficha de adaptação: apoios práticos que o professor aplica na aula. Cada condição
// sugere alguns (sugeridos acima), mas a ficha é do ATLETA — marca-se o que funciona com ele.
export const APOIOS = [
  { id: 'aviso-mudanca', nome: 'Avisar antes de mudar a atividade', icone: 'fa-bell' },
  { id: 'rotina-fixa', nome: 'Manter a mesma sequência de aula', icone: 'fa-list-ol' },
  { id: 'instrucao-curta', nome: 'Instruções curtas, uma por vez', icone: 'fa-comment-dots' },
  { id: 'demonstracao', nome: 'Mostrar o movimento antes de pedir', icone: 'fa-eye' },
  { id: 'descricao-oral', nome: 'Descrever o movimento em voz alta', icone: 'fa-volume-high' },
  { id: 'sinais-visuais', nome: 'Combinar sinais visuais (mãos, gestos)', icone: 'fa-hands' },
  { id: 'perto-professor', nome: 'Ficar perto do professor na roda', icone: 'fa-person-chalkboard' },
  { id: 'som-baixo', nome: 'Evitar som alto perto do ouvido (berimbau, palmas)', icone: 'fa-volume-xmark' },
  { id: 'pedir-toque', nome: 'Pedir antes de tocar / corrigir pelo corpo', icone: 'fa-hand' },
  { id: 'pausas', nome: 'Pausas combinadas durante a aula', icone: 'fa-pause' },
  { id: 'tarefa-ativa', nome: 'Dar função ativa (bater palma, puxar canto)', icone: 'fa-drum' },
  { id: 'movimento-adaptado', nome: 'Adaptar o movimento (altura, apoio, quedas)', icone: 'fa-person-walking' },
  { id: 'tempo-extra', nome: 'Mais tempo e mais repetições', icone: 'fa-hourglass-half' },
  { id: 'apoio-fisico', nome: 'Apoio físico ou referência tátil (parede, corda)', icone: 'fa-hands-holding' },
  { id: 'confirmar', nome: 'Confirmar que entendeu antes de avançar', icone: 'fa-circle-check' },
  { id: 'reforco-positivo', nome: 'Elogiar o progresso, não a perfeição', icone: 'fa-thumbs-up' },
  { id: 'acompanhante', nome: 'Acompanhante ou mediador na aula', icone: 'fa-people-arrows' },
  { id: 'dupla-fixa', nome: 'Jogar com dupla de confiança', icone: 'fa-user-group' },
];
const apoioPorId = Object.fromEntries(APOIOS.map((a) => [a.id, a]));
export const apoioDe = (id) => apoioPorId[String(id || '')] || null;
export const apoiosSugeridos = (condicoes) => [...new Set((condicoes || []).flatMap((id) => (condicaoDe(id) || {}).sugeridos || []))];
const porId = Object.fromEntries(CONDICOES.map((c) => [c.id, c]));
export const condicaoDe = (id) => porId[String(id || '').toUpperCase().replace(/[^A-Z]/g, '')] || null;
export const nomeDe = (id) => { const c = condicaoDe(id); return c ? c.nome : String(id || ''); };
export const siglaDe = (id) => { const c = condicaoDe(id); return c ? c.sigla : String(id || ''); };

/* ---------- linguagem da arte ---------- */
const ARTE_PADRAO = 'capoeira';
const arteOk = (arte) => (arte && MODALIDADES[arte] ? arte : ARTE_PADRAO);
// "no tatame" / "no ringue" / "na roda" (roda é a única feminina).
const noLocal = (local) => (local === 'roda' ? 'na roda' : `no ${local}`);
// Troca os termos da capoeira pela linguagem da arte. Capoeira (ou arte desconhecida): texto igual.
// Ordem importa: expressões maiores antes das palavras soltas.
export function adaptarTexto(texto, arte) {
  const a = arteOk(arte); const t = String(texto || '');
  if (a === ARTE_PADRAO || !t) return t;
  const T = termosDa(a); const arteMin = T.arte.toLowerCase();
  const trocas = [
    [/Inclusão na roda/g, `Inclusão ${noLocal(T.local)}`],
    [/\bna roda\b/g, noLocal(T.local)], [/\bda roda\b/g, `do ${T.local}`], [/\bà roda\b/g, `ao ${T.local}`],
    [/\brodas\b/g, `${T.luta}s`], [/\broda\b/g, T.local], [/\bRoda\b/g, T.local.charAt(0).toUpperCase() + T.local.slice(1)],
    [/toque do berimbau/gi, 'comando do professor'], [/\bberimbau\b/gi, 'comando do professor'],
    [/\batabaque\b/gi, 'palmas'], [/\bpandeiro\b/gi, 'palmas'],
    [/bater palma, puxar canto/g, `marcar o tempo, organizar o ${T.local}`], [/puxar canto/g, 'marcar o tempo'],
    [/\bladainha\b/gi, 'saudação'], [/\bcantos?\b/g, 'contagem'],
    [/\bgingar\b/gi, 'fazer o movimento base'], [/\bginga\b/gi, 'movimento base'],
    [/Jogar com/g, `Fazer o ${T.luta} com`], [/\bjogar\b/g, `fazer o ${T.luta}`], [/\bjoga\b/g, `faz o ${T.luta}`], [/\bjogo\b/g, T.luta],
    [/\bcordão\b/g, T.peca], [/\bcordões\b/g, `${T.peca}s`],
    [/\bcapoeirista\b/gi, 'atleta'], [/\bcapoeira\b/g, arteMin], [/\bCapoeira\b/g, T.arte],
  ];
  return trocas.reduce((acc, [re, por]) => acc.replace(re, por), t);
}
// Dica de uma condição e os apoios sugeridos, já na linguagem da arte.
export function dicasPara(condicao, arte) {
  const c = condicaoDe(condicao); if (!c) return null;
  return { id: c.id, sigla: c.sigla, nome: c.nome, dica: adaptarTexto(c.dica, arte), sugeridos: (c.sugeridos || []).map((id) => ({ id, nome: nomeApoio(id, arte) })) };
}
// Nome de um apoio na linguagem da arte ("Ficar perto do professor no tatame").
export const nomeApoio = (id, arte) => { const a = apoioDe(id); return a ? adaptarTexto(a.nome, arte) : String(id || ''); };
// A lista de apoios inteira na linguagem da arte (mesmos ids e ícones).
export const apoiosDaArte = (arte) => APOIOS.map((a) => ({ ...a, nome: adaptarTexto(a.nome, arte) }));

// Deixa o campo sempre no mesmo formato (aceita o formato antigo, lista solta ou nada).
export function normalizarInclusao(v) {
  const lista = Array.isArray(v) ? v : (v && Array.isArray(v.condicoes) ? v.condicoes : []);
  const condicoes = [...new Set(lista.map((x) => (condicaoDe(x) || {}).id).filter(Boolean))];
  const observacoes = v && !Array.isArray(v) && typeof v.observacoes === 'string' ? v.observacoes.slice(0, 400) : '';
  const apoios = condicoes.length && v && !Array.isArray(v) && Array.isArray(v.apoios) ? [...new Set(v.apoios.filter((a) => apoioDe(a)))] : [];
  return { condicoes, apoios, observacoes };
}
export const temInclusao = (u) => normalizarInclusao(u && u.inclusao).condicoes.length > 0;
export const resumoInclusao = (u) => { const { condicoes } = normalizarInclusao(u && u.inclusao); return condicoes.length ? condicoes.map(siglaDe).join(', ') : SEM_LIMITACOES; };

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let seq = 0; const SAL = Math.random().toString(36).slice(2, 6);

// O laço: duas curvas grossas que se cruzam (braço direito por baixo, braço
// esquerdo por cima), como o laço de fita. Cada padrão pinta de um jeito.
export function lacoSVG(id, px = 22, extra = '') {
  const c = condicaoDe(id); if (!c) return '';
  const uid = `laco-${c.id}-${SAL}-${++seq}`;
  const bracoDir = 'M33 9 C 25 9 23 15 23 21 C 23 35 38 45 46 60';
  const bracoEsq = 'M18 60 C 26 45 41 35 41 21 C 41 15 39 9 33 9';
  let defs = ''; let corDir = c.cores[0]; let corEsq = c.cores[0];
  if (c.padrao === 'quebra-cabeca') {
    defs = `<pattern id="${uid}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${c.cores[0]}"/><rect x="5" width="5" height="5" fill="${c.cores[1]}"/><rect y="5" width="5" height="5" fill="${c.cores[2]}"/><rect x="5" y="5" width="5" height="5" fill="${c.cores[3]}"/><circle cx="5" cy="2.5" r="1.6" fill="${c.cores[3]}"/><circle cx="2.5" cy="7.5" r="1.6" fill="${c.cores[1]}"/></pattern>`;
    corDir = corEsq = `url(#${uid})`;
  } else if (c.padrao === 'listras') {
    defs = `<pattern id="${uid}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><rect width="3" height="6" fill="${c.cores[0]}"/><rect x="3" width="3" height="6" fill="${c.cores[1]}"/></pattern>`;
    corDir = corEsq = `url(#${uid})`;
  } else if (c.padrao === 'duas') { corDir = c.cores[1]; corEsq = c.cores[0]; }
  return `<svg class="laco" viewBox="0 0 64 64" width="${px}" height="${px}" aria-hidden="true" focusable="false" ${extra}><defs>${defs}</defs>
    <path d="${bracoDir}" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="14" stroke-linecap="round"/>
    <path d="${bracoDir}" fill="none" stroke="${corDir}" stroke-width="10" stroke-linecap="round"/>
    <path d="${bracoEsq}" fill="none" stroke="rgba(255,255,255,.92)" stroke-width="14" stroke-linecap="round"/>
    <path d="${bracoEsq}" fill="none" stroke="${corEsq}" stroke-width="10" stroke-linecap="round"/></svg>`;
}

// Os laços de uma pessoa, prontos para o canto da foto (classe .lacos-foto) ou
// para uma linha de chips (classe .lacos-linha). Passar o mouse mostra o nome.
export function lacosHTML(inclusao, { px = 22, classe = 'lacos-foto', comSigla = false } = {}) {
  const { condicoes } = normalizarInclusao(inclusao);
  if (!condicoes.length) return '';
  return `<span class="${esc(classe)}" role="list" aria-label="Atenção e inclusão: ${esc(condicoes.map(nomeDe).join(', '))}">${condicoes.map((id) => `<span class="laco-chip" role="listitem" data-condicao="${esc(id)}" data-nome="${esc(siglaDe(id))} · ${esc(nomeDe(id))}" title="${esc(siglaDe(id))} — ${esc(nomeDe(id))}" tabindex="0">${lacoSVG(id, px)}${comSigla ? `<b>${esc(siglaDe(id))}</b>` : ''}</span>`).join('')}</span>`;
}

// Ficha de adaptação para editar (checkboxes). Os sugeridos pelas condições marcadas
// ganham a classe "sugerido" (pontinho verde) — a escolha continua sendo do humano.
export function apoiosChecklistHTML(inclusao, { nome = 'apoios', arte = ARTE_PADRAO } = {}) {
  const { condicoes, apoios } = normalizarInclusao(inclusao);
  const sug = new Set(apoiosSugeridos(condicoes));
  return `<div class="apoios-lista" role="group" aria-label="Ficha de adaptação">${apoiosDaArte(arte).map((a) => `<label class="apoio-item${apoios.includes(a.id) ? ' on' : ''}${sug.has(a.id) ? ' sugerido' : ''}" title="${sug.has(a.id) ? 'Sugerido para a(s) condição(ões) marcada(s)' : ''}"><input type="checkbox" name="${esc(nome)}" value="${esc(a.id)}" ${apoios.includes(a.id) ? 'checked' : ''}><i class="fas ${esc(a.icone)}" aria-hidden="true"></i><span>${esc(a.nome)}</span></label>`).join('')}</div>`;
}
// Liga o comportamento do checklist (classe .on ao marcar; re-marca sugeridos quando as condições mudam).
export function ligarChecklist(raiz, lerCondicoes) {
  if (!raiz) return;
  raiz.querySelectorAll('.apoio-item input').forEach((i) => i.addEventListener('change', () => i.closest('label').classList.toggle('on', i.checked)));
  raiz.atualizarSugeridos = () => { const sug = new Set(apoiosSugeridos(lerCondicoes ? lerCondicoes() : [])); raiz.querySelectorAll('.apoio-item').forEach((l) => l.classList.toggle('sugerido', sug.has(l.querySelector('input').value))); };
}
export const apoiosMarcados = (raiz) => raiz ? [...raiz.querySelectorAll('.apoio-item input:checked')].map((i) => i.value) : [];
// Material da equipe: um PDF por condição + o guia completo, servidos como arquivos
// estáticos do app (materiais/inclusao/*.pdf). Ficam fora do Firestore de propósito:
// não dependem de regra, abrem offline depois do primeiro acesso e são iguais para todas as escolas.
export const PASTA_MATERIAIS = 'materiais/inclusao';
// O que existe de verdade na pasta materiais/inclusao (o navegador não lista pasta — atualize
// aqui ao subir um PDF novo). Versões por arte entram como `<arte>: ['tea', …, 'guia']` e o
// arquivo se chama `<condicao>-<arte>.pdf` / `guia-inclusao-<arte>.pdf`.
const COND_E_GUIA = ['tea', 'tdah', 'pc', 'sd', 'di', 'dvda', 'tdc', 'guia'];
export const MATERIAIS_EXISTENTES = {
  capoeira: COND_E_GUIA, // versão própria (roda, berimbau, ginga), escrita à mão
  // Demais artes: PDFs gerados por tools/gerar-pdfs-inclusao.mjs (linguagem neutra adaptada à arte).
  jiujitsu: COND_E_GUIA, judo: COND_E_GUIA, karate: COND_E_GUIA, taekwondo: COND_E_GUIA,
  muaythai: COND_E_GUIA, boxe: COND_E_GUIA, kickboxing: COND_E_GUIA, mma: COND_E_GUIA,
  wrestling: COND_E_GUIA, kravmaga: COND_E_GUIA, kungfu: COND_E_GUIA, outra: COND_E_GUIA,
};
const temArquivo = (chave, arte) => Array.isArray(MATERIAIS_EXISTENTES[arte]) && MATERIAIS_EXISTENTES[arte].includes(chave);
export const urlGuia = (arte = ARTE_PADRAO) => (arteOk(arte) === ARTE_PADRAO ? `${PASTA_MATERIAIS}/guia-inclusao-capoeira.pdf` : `${PASTA_MATERIAIS}/guia-inclusao-${arteOk(arte)}.pdf`);
export const urlMaterial = (id, arte = ARTE_PADRAO) => { const c = condicaoDe(id); if (!c) return urlGuia(arte); const a = arteOk(arte); return a === ARTE_PADRAO ? `${PASTA_MATERIAIS}/${c.id.toLowerCase()}.pdf` : `${PASTA_MATERIAIS}/${c.id.toLowerCase()}-${a}.pdf`; };
// Qual arquivo mostrar para esta arte: o próprio da arte quando existe; senão o guia geral
// (versão capoeira) com legenda; se nem o geral existe, url null (link desabilitado).
//   → { url, proprio, legenda }
export function materialDisponivel(id, arte = ARTE_PADRAO) {
  const a = arteOk(arte); const c = condicaoDe(id); const chave = c ? c.id.toLowerCase() : 'guia';
  const nomeArte = (MODALIDADES[a] || MODALIDADES.outra).nome;
  if (temArquivo(chave, a)) return { url: c ? urlMaterial(c.id, a) : urlGuia(a), proprio: true, legenda: '' };
  if (temArquivo(chave, ARTE_PADRAO)) return { url: c ? urlMaterial(c.id) : urlGuia(), proprio: a === ARTE_PADRAO, legenda: a === ARTE_PADRAO ? '' : `guia geral (adaptado de capoeira) — versão para ${nomeArte} em preparação` };
  return { url: null, proprio: false, legenda: 'material em preparação' };
}
// modo 'linha' (dentro do modal/relatório) ou 'cards' (aba Formação). `arte` troca os textos e a legenda dos PDFs.
export function materiaisHTML(condicoes, { modo = 'linha', base = '', arte = ARTE_PADRAO } = {}) {
  const a = arteOk(arte);
  const lista = modo === 'cards' ? CONDICOES.map((c) => c.id) : normalizarInclusao({ condicoes }).condicoes;
  const link = (m, classe, conteudo, titulo = '') => (m.url
    ? `<a class="${classe}" href="${esc(base + m.url)}" target="_blank" rel="noopener" title="${esc(titulo || m.legenda)}">${conteudo}</a>`
    : `<span class="${classe} mat-indisponivel" aria-disabled="true" title="${esc(m.legenda)}">${conteudo}</span>`);
  const guia = materialDisponivel('guia', a);
  if (modo === 'linha') {
    if (!lista.length) return '';
    const itens = lista.map((id) => { const m = materialDisponivel(id, a); return link(m, 'mat-link', `<i class="fas fa-file-pdf" aria-hidden="true"></i> ${esc(siglaDe(id))}${m.proprio ? '' : ' <i class="fas fa-circle-info mat-geral" aria-hidden="true"></i>'}`); }).join(' ');
    const aviso = a !== ARTE_PADRAO ? ` <small class="mat-legenda">${esc(guia.legenda || 'guia geral (adaptado de capoeira)')}</small>` : '';
    return `<b>Material da equipe:</b> ${itens} ${link(guia, 'mat-link', '<i class="fas fa-book-open" aria-hidden="true"></i> Guia completo')}${aviso}`;
  }
  const cards = lista.map((id) => { const c = condicaoDe(id); const m = materialDisponivel(id, a); return link(m, 'mat-card', `${lacoSVG(id, 30)}<span><b>${esc(c.sigla)}</b><small>${esc(c.nome)}</small>${m.proprio ? '' : `<small class="mat-legenda">${esc(m.legenda)}</small>`}</span><i class="fas fa-file-pdf" aria-hidden="true"></i>`); }).join('');
  const subGuia = adaptarTexto('Inclusão na roda: princípios, as 7 condições, ficha de adaptação e o que fazer na aula', a);
  return `<div class="mat-cards">${cards}${link(guia, 'mat-card mat-card-guia', `<i class="fas fa-book-open" aria-hidden="true"></i><span><b>Guia completo</b><small>${esc(subGuia)}</small>${guia.proprio ? '' : `<small class="mat-legenda">${esc(guia.legenda)}</small>`}</span><i class="fas fa-file-pdf" aria-hidden="true"></i>`)}</div>`;
}

// Ficha de adaptação só para ler (chips), usada na chamada, nos relatórios e no app do aluno.
export function apoiosHTML(inclusao, { classe = 'apoios-chips', arte = ARTE_PADRAO } = {}) {
  const { apoios } = normalizarInclusao(inclusao);
  if (!apoios.length) return '';
  return `<ul class="${esc(classe)}" aria-label="Ficha de adaptação">${apoios.map((id) => { const a = apoioDe(id); return a ? `<li><i class="fas ${esc(a.icone)}" aria-hidden="true"></i>${esc(adaptarTexto(a.nome, arte))}</li>` : ''; }).join('')}</ul>`;
}

// CSS único para todas as telas (injetado uma vez): laços no canto inferior
// direito da foto, dica ao passar o mouse/focar, chips em linha.
export function garantirEstilos() {
  if (typeof document === 'undefined' || document.getElementById('estilos-inclusao')) return;
  const s = document.createElement('style'); s.id = 'estilos-inclusao';
  s.textContent = `
.foto-com-lacos{position:relative;display:inline-block;flex:none;line-height:0}
.lacos-foto{position:absolute;right:-6px;bottom:-4px;display:flex;flex-direction:row-reverse;gap:0;line-height:0}
.lacos-foto .laco-chip{margin-left:-8px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}
.lacos-linha{display:inline-flex;flex-wrap:wrap;gap:6px;align-items:center;vertical-align:middle}
.lacos-linha .laco-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 8px 3px 4px;border-radius:999px;background:rgba(0,45,114,.06);border:1px solid rgba(0,45,114,.12);font-size:.74rem;font-weight:800;color:#002D72;line-height:1}
.laco-chip{position:relative;cursor:help;outline:none}
.laco-chip:focus-visible{box-shadow:0 0 0 3px #00E676;border-radius:999px}
.laco-chip::after{content:attr(data-nome);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%) translateY(4px);background:#0D211D;color:#fff;font:600 .72rem/1.3 "Manrope","Segoe UI",sans-serif;padding:6px 9px;border-radius:8px;white-space:nowrap;max-width:260px;opacity:0;pointer-events:none;transition:opacity .18s cubic-bezier(.16,1,.3,1),transform .18s cubic-bezier(.16,1,.3,1);z-index:30;text-align:center}
.laco-chip:hover::after,.laco-chip:focus-visible::after{opacity:1;transform:translateX(-50%) translateY(0)}
.lacos-foto .laco-chip::after{left:auto;right:0;transform:translateY(4px)}
.lacos-foto .laco-chip:hover::after,.lacos-foto .laco-chip:focus-visible::after{transform:translateY(0)}
@media (max-width:600px){.laco-chip::after{white-space:normal;width:max-content;max-width:200px}}
@media print{.laco-chip::after{display:none}}
.apoios-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;margin-top:6px}
.apoio-item{position:relative;display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(0,45,114,.14);border-radius:12px;background:#fff;font-size:.78rem;line-height:1.25;cursor:pointer;transition:border-color .2s,background .2s,transform .35s cubic-bezier(.16,1,.3,1)}
.apoio-item:hover{transform:translateY(-1px)}
.apoio-item input{margin:0;accent-color:#389E92;flex:none}
.apoio-item i{color:#389E92;width:16px;text-align:center;flex:none}
.apoio-item.on{background:rgba(56,158,146,.1);border-color:#389E92}
.apoio-item.sugerido::after{content:"";position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:#00E676;box-shadow:0 0 0 2px #fff}
.apoios-chips{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:5px}
.apoios-chips li{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:rgba(0,45,114,.07);color:#002D72;font-size:.72rem;font-weight:700;line-height:1.3}
.apoios-chips li i{color:#389E92;font-size:.7rem}
.aviso-inclusao{display:flex;gap:12px;align-items:flex-start;margin:10px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,rgba(56,158,146,.12),rgba(0,45,114,.08));border:1px solid rgba(56,158,146,.35);box-shadow:0 8px 22px rgba(0,45,114,.08);animation:aviso-inclusao-in .5s cubic-bezier(.16,1,.3,1)}
.aviso-inclusao .lacos-linha{flex:none;margin-top:2px}
.aviso-inclusao h4{margin:0 0 2px;font-size:.9rem;color:#002D72}
.aviso-inclusao p{margin:0;font-size:.78rem;color:#2b4a46;line-height:1.4}
.aviso-inclusao .fechar{margin-left:auto;flex:none;border:0;background:transparent;color:#002D72;font-size:1.1rem;cursor:pointer;line-height:1}
@keyframes aviso-inclusao-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.mat-link{display:inline-flex;align-items:center;gap:4px;margin:2px 4px 2px 0;padding:2px 8px;border-radius:999px;background:rgba(0,45,114,.07);color:#002D72;font-weight:700;font-size:.74rem;text-decoration:none}
.mat-link:hover{background:rgba(56,158,146,.18)}
.mat-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:10px}
.mat-card{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid rgba(0,45,114,.12);border-radius:14px;background:#fff;color:#002D72;text-decoration:none;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s}
.mat-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,45,114,.12)}
.mat-card span{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}
.mat-card b{font-size:.86rem}.mat-card small{font-size:.72rem;color:#5B6B68}
.mat-card>i{color:#D32F2F;font-size:1.1rem;flex:none}
.mat-card-guia{grid-column:1/-1;background:linear-gradient(135deg,rgba(56,158,146,.14),rgba(0,45,114,.08))}
.mat-card-guia>i:first-child{color:#389E92;font-size:1.5rem}
.mat-legenda{display:block;margin-top:2px;font-size:.68rem;font-weight:600;color:#8A6D00}
.mat-link .mat-geral{font-size:.64rem;color:#8A6D00}
.mat-indisponivel{opacity:.55;cursor:not-allowed;pointer-events:none}`;
  document.head.appendChild(s);
}
