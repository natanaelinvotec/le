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
 * noAr (opcional, por template): sites prontos com o visual, mostrados na vitrine — [{ nome, url https, cidade }].
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
    modulo: './site-tpl-horizons.js?v=49',
    miniatura: 'assets/templates/horizons.svg'
  },
  luva: {
    nome: 'Luva',
    descricao: 'Clube de luta em alto contraste: carvão com grão de filme, um acento forte, tipografia condensada, cordas do ringue, níveis, horários da semana e o bloco do app.',
    modalidades: ['boxe', 'muaythai', 'mma', 'todas'],
    modulo: './site-tpl-luva.js?v=49',
    miniatura: 'assets/templates/luva.svg'
  },
  escudo: {
    nome: 'Escudo',
    descricao: 'Academia esportiva clara: marinho com hachura, acento tático, paralelogramos, quadro de graduação em tabela, agenda, quadro semanal, parceiros e galeria.',
    modalidades: ['kravmaga', 'judo', 'taekwondo', 'todas'],
    modulo: './site-tpl-escudo.js?v=49',
    miniatura: 'assets/templates/escudo.svg'
  },
  mongkon: {
    nome: 'Mongkon',
    descricao: 'Formas redondas: preto quente com dourado, fotos em anéis giratórios, níveis como cordas (prajieds), botões-pílula, pôster do atleta em destaque, horários e o bloco do app em cartão creme.',
    modalidades: ['muaythai', 'boxe', 'mma', 'todas'],
    modulo: './site-tpl-mongkon.js?v=49',
    miniatura: 'assets/templates/mongkon.svg'
  },
  ginga: {
    nome: 'Ginga',
    descricao: 'O site da Liberdade e Expressão para a sua escola: fotos em arco, cordões que crescem, núcleos com WhatsApp, corpo docente, agenda e avisos do app, loja e aula experimental.',
    modalidades: ['capoeira', 'todas'],
    modulo: './site-tpl-ginga.js?v=49',
    miniatura: 'assets/templates/ginga.svg',
    // Sites já no ar com este visual (a vitrine mostra "Conheça quem já usa"). Os de escolas da
    // plataforma entram sozinhos quando a AtletaPay liga "Mostrar na vitrine" no painel Master.
    noAr: [{ nome: 'Capoeira Liberdade e Expressão', url: 'https://liberdadeeexpressao.com.br', cidade: 'Campo Grande · MS' }]
  },
  dobok: {
    nome: 'Dobok',
    descricao: 'Clube esportivo em azul e vermelho: destaques e mural ligados ao app, placar de medalhas, graduação em tabela, horários em acordeão, conquistas, vídeos e loja oficial.',
    modalidades: ['taekwondo', 'todas'],
    modulo: './site-tpl-dobok.js?v=49',
    miniatura: 'assets/templates/dobok.svg'
  },
  guarda: {
    nome: 'Guarda',
    descricao: 'Clube claro com faixas e graus: destaques e mural do app, cartões de luta, graduação com faixas desenhadas, horários por dia, equipe em abas, atleta do mês e loja oficial.',
    modalidades: ['jiujitsu', 'todas'],
    modulo: './site-tpl-guarda.js?v=49',
    miniatura: 'assets/templates/guarda.svg'
  },
  ippon: {
    nome: 'Ippon',
    descricao: 'Dojô em índigo e tatame: destaques e mural do app, placar de judô (ippon, waza-ari), graduação por kyu, quadro semanal em grade, judoca do mês, equipe em carrossel e loja oficial.',
    modalidades: ['judo', 'todas'],
    modulo: './site-tpl-ippon.js?v=49',
    miniatura: 'assets/templates/ippon.svg'
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
