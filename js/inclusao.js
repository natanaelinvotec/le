/* inclusao.js — atenção e inclusão: as condições que o professor precisa conhecer
   (TEA, TDAH, PC, SD, DI, DV/DA, TDC), o laço de conscientização de cada uma
   (SVG desenhado aqui, sem imagem externa) e os ajudantes usados pela inscrição,
   pelo painel e pelos relatórios.

   Onde mora no banco: usuarios/{uid}.inclusao = { condicoes: ['TEA', …], observacoes: '' }.
   Lista vazia = "Sem limitações". É informação sensível (LGPD): só o próprio
   aluno/responsável, o professor do núcleo e a administração leem; NUNCA entra
   no cartão público (perfisPublicos), na Rede, na carteirinha nem no certificado
   — o servidor monta o cartão público campo a campo e este não está lá. */

export const SEM_LIMITACOES = 'Sem limitações';

// cores = faixa(s) do laço; 'padrao' muda o desenho: 'quebra-cabeca' (TEA),
// 'duas' (SD: azul e amarelo, um em cada braço) e 'listras' (DV/DA: azul e branco).
export const CONDICOES = [
  { id: 'TEA', sigla: 'TEA', nome: 'Transtorno do Espectro Autista', cores: ['#2E7BD6', '#E53935', '#F9C80E', '#43A047'], padrao: 'quebra-cabeca', dica: 'Rotina previsível, avisos antes de mudanças, atenção a sons altos e toque.' },
  { id: 'TDAH', sigla: 'TDAH', nome: 'Transtorno do Déficit de Atenção com Hiperatividade', cores: ['#F26A1B'], dica: 'Instruções curtas, uma por vez; movimento ajuda a manter o foco.' },
  { id: 'PC', sigla: 'PC', nome: 'Paralisia Cerebral', cores: ['#3F7A3A'], dica: 'Adaptar movimentos e tempo; cuidado com equilíbrio e quedas.' },
  { id: 'SD', sigla: 'SD', nome: 'Síndrome de Down (Trissomia 21)', cores: ['#1976D2', '#FFD600'], padrao: 'duas', dica: 'Reforço positivo, demonstração visual; atenção a hipotonia e articulações.' },
  { id: 'DI', sigla: 'DI', nome: 'Deficiência Intelectual', cores: ['#F39C12'], dica: 'Passos simples e repetidos; confirmar entendimento antes de avançar.' },
  { id: 'DVDA', sigla: 'DV / DA', nome: 'Deficiência Visual / Deficiência Auditiva', cores: ['#1F3C88', '#FFFFFF'], padrao: 'listras', dica: 'Descrever movimentos em voz alta (DV) ou mostrar e sinalizar (DA); posicionar perto do professor.' },
  { id: 'TDC', sigla: 'TDC', nome: 'Transtorno do Desenvolvimento da Coordenação', cores: ['#3B3F8F'], dica: 'Decompor o movimento, mais repetições, elogiar o progresso e não a perfeição.' },
];
const porId = Object.fromEntries(CONDICOES.map((c) => [c.id, c]));
export const condicaoDe = (id) => porId[String(id || '').toUpperCase().replace(/[^A-Z]/g, '')] || null;
export const nomeDe = (id) => { const c = condicaoDe(id); return c ? c.nome : String(id || ''); };
export const siglaDe = (id) => { const c = condicaoDe(id); return c ? c.sigla : String(id || ''); };

// Deixa o campo sempre no mesmo formato (aceita o formato antigo, lista solta ou nada).
export function normalizarInclusao(v) {
  const lista = Array.isArray(v) ? v : (v && Array.isArray(v.condicoes) ? v.condicoes : []);
  const condicoes = [...new Set(lista.map((x) => (condicaoDe(x) || {}).id).filter(Boolean))];
  const observacoes = v && !Array.isArray(v) && typeof v.observacoes === 'string' ? v.observacoes.slice(0, 400) : '';
  return { condicoes, observacoes };
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
@media print{.laco-chip::after{display:none}}`;
  document.head.appendChild(s);
}
