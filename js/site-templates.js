/* site-templates.js — registro da biblioteca de templates do site por escola (F4.3).
 *
 * Fonte única para o site público (site-escola.js) e para a aba "Meu site" do painel
 * (site-gerenciar.js). Para criar um template novo basta:
 *   1. criar js/site-tpl-<nome>.js exportando { render, schema, meta };
 *   2. acrescentar uma linha em TEMPLATES abaixo.
 * O seletor da aba e o gerenciador passam a conhecer o template sozinhos.
 *
 * Contrato de um módulo de template (js/site-tpl-<nome>.js):
 *   export function render(s, h)   — monta o site em #site. s = escola mapeada (site-escola.js),
 *                                   com s.conteudo = siteConteudo/{escolaId} (textos/fotos do painel,
 *                                   mesclados POR CIMA dos padrões do template). h = { esc, url, VOCAB, LIDER, modalidadeBase }.
 *   export var schema               — seções e campos editáveis (formato abaixo). A aba monta o formulário por ele.
 *   export var meta                 — { nome, descricao, modalidades[] } (miniatura vem deste registro).
 *
 * Formato do schema:
 *   { secoes: [ { id, r (rótulo), ajuda, campos: [ campo ] } ] }
 *   campo = { c (chave), r (rótulo), t?: 'texto'|'area'|'foto'|'lista'|'link'|'select', max?: n (caracteres ou itens),
 *             opcoes?: [[valor, rótulo]] (select), linhas?: n (area),
 *             ph?: placeholder, png?: true (foto com transparência), item?: [campo] (campos de cada item da lista),
 *             resumo?: chave do item usada como título na lista }
 *   O conteúdo gravado espelha o schema: secoes[id][c] = texto | url | [ {c: valor} ].
 *
 * O "arena" é o layout embutido em site-escola.js (um por modalidade); não tem módulo nem
 * schema próprio ainda — aparece no seletor para a escola poder voltar ao visual padrão.
 */

export var TEMPLATES = {
  arena: {
    nome: 'Arena',
    descricao: 'O visual padrão da AtletaPay, com a cara da modalidade da escola (cores, faixa e vocabulário).',
    modalidades: ['todas'],
    modulo: null,       // layout embutido (site-escola.js)
    miniatura: 'assets/templates/arena.svg'
  },
  horizons: {
    nome: 'Horizons',
    descricao: 'Hero em cartão com corte diagonal, letreiro, vertentes, equipe em 3D, escada de graduação, núcleos e o bloco do app.',
    modalidades: ['todas'],
    modulo: './site-tpl-horizons.js',
    miniatura: 'assets/templates/horizons.svg'
  },
  luva: {
    nome: 'Luva',
    descricao: 'Clube de luta em alto contraste: carvão com grão de filme, um acento forte, tipografia condensada, cordas do ringue, níveis, horários da semana e o bloco do app.',
    modalidades: ['boxe', 'muaythai', 'mma', 'todas'],
    modulo: './site-tpl-luva.js',
    miniatura: 'assets/templates/luva.svg'
  }
};

export var TEMPLATE_PADRAO = 'arena';

export function templateExiste(id){ return typeof id === 'string' && Object.prototype.hasOwnProperty.call(TEMPLATES, id); }

// Só os templates com layout próprio (módulo carregado sob demanda).
export function layoutsComModulo(){
  var out = {};
  Object.keys(TEMPLATES).forEach(function(k){ if(TEMPLATES[k].modulo) out[k] = TEMPLATES[k].modulo; });
  return out;
}

// Carrega o módulo de um template (ou null para o arena). Falha → null (quem chama decide o fallback).
export async function carregarTemplate(id){
  var t = templateExiste(id) ? TEMPLATES[id] : null;
  if(!t || !t.modulo) return null;
  try{ return await import(t.modulo); }catch(e){ console.warn('site-templates: módulo "'+id+'" falhou', e); return null; }
}
