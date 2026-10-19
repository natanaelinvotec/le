/* modelos-site.js — os modelos de site que o cadastro (etapa 5) e o painel do dono oferecem.

Fonte única: o registro real da biblioteca de templates do app (/app/js/site-templates.js), o mesmo
que o site da escola (site-escola.js), a aba "Meu site" e a vitrine usam. Acrescentar um template
lá faz ele aparecer aqui sozinho — basta o print em assets/site/tpl/<id>.webp (o Arena, visual
padrão embutido, usa a miniatura do app).

O que fica gravado em escolas/{id}: `template` (id do registro; o servidor copia para
escolasPublicas e o site lê) e `modelo` (mesmo id — campo histórico do checklist do painel e do
Master). Ids antigos do catálogo (roda, tatame, arena, dojo, quintal) continuam válidos para
leitura: LEGADO diz qual template corresponde a cada um. */
import { TEMPLATES, TEMPLATE_PADRAO, templateExiste } from '/app/js/site-templates.js?v=50';

const ORDEM = ['guarda', 'ippon', 'dobok', 'ginga', 'mongkon', 'luva', 'escudo', 'horizons', 'arena'];
const LEGADO = { roda: 'ginga', tatame: 'guarda', dojo: 'dobok', quintal: 'horizons', arena: 'arena' };
const NOMES_ARTE = { capoeira: 'capoeira', jiujitsu: 'jiu-jitsu', judo: 'judô', karate: 'karatê', taekwondo: 'taekwondo', muaythai: 'muay thai', boxe: 'boxe', kickboxing: 'kickboxing', mma: 'MMA', kungfu: 'kung fu', kravmaga: 'krav maga', wrestling: 'wrestling' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const normalizarModelo = (id) => (templateExiste(id) ? id : (LEGADO[id] || null));

export function listaModelos(modalidade) {
  const mod = String(modalidade || '').toLowerCase();
  const ids = Object.keys(TEMPLATES).sort((a, b) => (ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99));
  const lista = ids.map((id) => {
    const t = TEMPLATES[id]; const para = (t.modalidades || []).filter((m) => m !== 'todas');
    return { id, nome: t.nome, descricao: t.descricao || '', para, indicado: para.includes(mod), todas: !para.length,
      imagem: t.modulo ? `assets/site/tpl/${id}.webp` : `/app/${t.miniatura || 'assets/templates/arena.svg'}`,
      noAr: Array.isArray(t.noAr) && t.noAr[0] ? t.noAr[0] : null };
  });
  return [...lista.filter((m) => m.indicado), ...lista.filter((m) => !m.indicado)];
}

export const sugeridoPara = (modalidade) => (listaModelos(modalidade).find((m) => m.indicado) || { id: TEMPLATE_PADRAO }).id;
export const nomeModelo = (id) => { const t = TEMPLATES[normalizarModelo(id)]; return t ? t.nome : (id ? String(id) : ''); };
export const paraTexto = (m) => (m.todas ? 'Serve para qualquer arte' : 'Desenhado para ' + m.para.map((a) => NOMES_ARTE[a] || a).join(', '));

// Cartão do seletor (mesmo markup no cadastro e no painel). `atual` marca o selecionado.
export function cartaoModelo(m, atual) {
  return `<button type="button" class="opcao opcao-site" data-modelo="${esc(m.id)}" aria-pressed="${m.id === atual}">`
    + `<span class="opcao-site__img"><img src="${esc(m.imagem)}" alt="" loading="lazy" decoding="async">${m.indicado ? '<i class="opcao-site__selo">Indicado</i>' : ''}${m.noAr ? '<i class="opcao-site__selo opcao-site__selo--ar">No ar</i>' : ''}</span>`
    + `<b>${esc(m.nome)}</b><small>${esc(paraTexto(m))}</small><small class="opcao-site__desc">${esc(m.descricao)}</small></button>`;
}
