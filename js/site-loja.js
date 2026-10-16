/* ==========================================================================
 * site-loja.js — peças compartilhadas da "Loja oficial" dos templates de site.
 *
 * Cada template desenha a loja no próprio estilo; aqui ficam só:
 *   - SECAO_LOJA(extra)        → a seção do schema "Meu site" (mesmos campos em todos os templates);
 *   - produtosLoja(C)          → produtos válidos do painel (nome obrigatório, textos cortados);
 *   - ilustracao(nome, cores)  → desenho SVG do produto escolhido pelo NOME, para produto sem foto
 *                                (ex.: "Luva de boxe 12oz" → luva; "Dobok" → dobok; "Berimbau" → berimbau);
 *   - linkCompra(zap, p)       → link do WhatsApp com a mensagem do pedido (ou '' sem número válido).
 *
 * Regra da biblioteca: nada inventado. Sem produtos cadastrados, a loja não aparece.
 * Segurança: o SVG é montado só com cores validadas (#rrggbb) — nenhum texto do usuário entra nele.
 * ========================================================================== */

var MESMOS = [
  { c:'nome', r:'Nome', max:40, ph:'Luva de boxe 12oz' }, { c:'texto', r:'Descrição', t:'area', max:120 },
  { c:'preco', r:'Preço', max:16, ph:'R$ 90,00' }, { c:'foto', r:'Foto (sem foto, entra um desenho pelo nome)', t:'foto' }
];

// Seção do schema. `pre` = campos de título no padrão do template (cada um tem o seu).
export function SECAO_LOJA(pre){
  return { id:'loja', r:'Loja oficial', ajuda:'Sem produtos, a seção não aparece. Produto sem foto ganha um desenho automático pelo nome (luva, faixa, kimono, dobok, caneleira, protetor, shorts, camiseta, berimbau…). "Comprar" abre o WhatsApp da loja com o pedido pronto.',
    campos:(pre || []).concat([ { c:'texto', r:'Texto', t:'area', max:200 }, { c:'whatsapp', r:'WhatsApp da loja (só números, com DDD)', max:13, ph:'67999990000' },
      { c:'produtos', r:'Produtos', t:'lista', max:8, resumo:'nome', nomeItem:'Produto', item:MESMOS } ]) };
}

function corta(v, n){ return (typeof v === 'string') ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : ''; }

export function produtosLoja(C, max){
  var l = C && C.loja && Array.isArray(C.loja.produtos) ? C.loja.produtos : [];
  return l.filter(function(p){ return p && typeof p === 'object' && corta(p.nome, 40); }).slice(0, max || 8)
    .map(function(p){ return { nome:corta(p.nome, 40), texto:corta(p.texto, 120), preco:corta(p.preco, 16), foto:corta(p.foto, 400) }; });
}

export function linkCompra(zap, p){
  var n = String(zap || '').replace(/\D/g, '');
  if(n.length < 10 || n.length > 13) return '';
  if(n.length <= 11) n = '55' + n;
  var msg = 'Olá! Quero comprar: ' + p.nome + (p.preco ? ' (' + p.preco + ')' : '') + '.';
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
}

/* ---------------- desenhos ---------------- */
function hex(v, pad){ return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : pad; }
function sombra(){ return '<ellipse cx="100" cy="186" rx="58" ry="7" fill="#000" opacity=".12"/>'; }
function abre(){ return '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'; }

var D = {
  // jaqueta de arte marcial (kimono / karategi / judogi / dobok)
  gi:function(a, b, gola){ return sombra()
    + '<path d="M64 30l36 14 36-14 44 26-15 44-21-10v94H56V90l-21 10-15-44z" fill="#fbfbf8" stroke="#d9dde3" stroke-width="2"/>'
    + '<path d="M56 90v94h88V90" fill="#000" opacity=".03"/>'
    + '<path d="M64 30l36 52 36-52" fill="none" stroke="'+gola+'" stroke-width="13" stroke-linejoin="round"/>'
    + '<path d="M100 82v102" stroke="#d9dde3" stroke-width="2"/>'
    + '<rect x="56" y="128" width="88" height="13" fill="'+b+'"/><path d="M96 141l-10 36 9 2 9-30 9 30 9-2-10-36z" fill="'+b+'"/>'
    + '<circle cx="124" cy="104" r="9" fill="'+a+'"/><circle cx="124" cy="104" r="5" fill="#fff" opacity=".6"/>'; },
  // calça de capoeira (abadá)
  abada:function(a, b){ return sombra()
    + '<path d="M62 30h76l10 154h-34l-14-104-14 104H52z" fill="#fbfbf8" stroke="#d9dde3" stroke-width="2"/>'
    + '<rect x="60" y="30" width="80" height="16" rx="3" fill="#eef0f2" stroke="#d9dde3" stroke-width="2"/>'
    + '<path d="M86 46c-6 16-10 26-18 34M114 46c6 16 10 26 18 34" stroke="'+b+'" stroke-width="7" stroke-linecap="round" fill="none"/>'
    + '<path d="M66 150h30M104 150h30" stroke="'+a+'" stroke-width="5" opacity=".55"/>'; },
  // faixa amarrada
  faixa:function(a, b){ return sombra()
    + '<rect x="18" y="88" width="164" height="22" rx="4" fill="'+a+'"/><rect x="18" y="88" width="164" height="7" rx="3" fill="#fff" opacity=".18"/>'
    + '<path d="M86 76h28l8 23-8 23H86l-8-23z" fill="'+a+'"/><path d="M86 76h28l8 23-8 23H86l-8-23z" fill="#000" opacity=".22"/>'
    + '<path d="M90 120l-26 60 16 5 20-56zM110 120l24 60-16 5-16-54z" fill="'+a+'"/>'
    + '<rect x="140" y="91" width="28" height="16" fill="'+b+'"/><rect x="146" y="91" width="4" height="16" fill="#fff" opacity=".5"/>'; },
  // cordão de capoeira (corda trançada)
  cordao:function(a, b){ var s = '', i; for(i = 0; i < 9; i++){ s += '<ellipse cx="'+(40 + i * 15)+'" cy="96" rx="11" ry="7" transform="rotate(-35 '+(40 + i * 15)+' 96)" fill="'+(i % 2 ? b : a)+'"/>'; }
    return sombra() + s + '<path d="M95 104c-6 30-14 54-24 74M108 104c8 28 18 52 30 70" stroke="'+a+'" stroke-width="12" stroke-linecap="round" fill="none"/>'
      + '<path d="M95 104c-6 30-14 54-24 74M108 104c8 28 18 52 30 70" stroke="'+b+'" stroke-width="4" stroke-dasharray="6 8" stroke-linecap="round" fill="none"/>'
      + '<circle cx="71" cy="178" r="8" fill="'+b+'"/><circle cx="138" cy="174" r="8" fill="'+b+'"/>'; },
  // prajied (braçadeira do muay thai)
  prajied:function(a, b){ return sombra()
    + '<path d="M40 120c0-32 26-52 60-52s60 20 60 52" fill="none" stroke="'+a+'" stroke-width="22" stroke-linecap="round"/>'
    + '<path d="M40 120c0-32 26-52 60-52s60 20 60 52" fill="none" stroke="'+b+'" stroke-width="6" stroke-dasharray="3 9"/>'
    + '<path d="M150 120l14 52M160 118l20 48" stroke="'+a+'" stroke-width="9" stroke-linecap="round"/>'
    + '<circle cx="155" cy="122" r="12" fill="'+a+'"/><circle cx="155" cy="122" r="12" fill="#000" opacity=".2"/>'; },
  // mongkon (coroa do muay thai)
  mongkon:function(a, b){ return sombra()
    + '<ellipse cx="100" cy="92" rx="62" ry="40" fill="none" stroke="'+a+'" stroke-width="18"/>'
    + '<ellipse cx="100" cy="92" rx="62" ry="40" fill="none" stroke="'+b+'" stroke-width="5" stroke-dasharray="4 8"/>'
    + '<path d="M100 132c0 18-6 34-14 50" stroke="'+a+'" stroke-width="13" stroke-linecap="round" fill="none"/>'
    + '<path d="M82 176l8 8 12-6" stroke="'+b+'" stroke-width="5" fill="none" stroke-linecap="round"/>'; },
  // luva de boxe / muay thai
  luva:function(a, b){ return sombra()
    + '<path d="M62 70c0-30 18-46 44-46 30 0 50 18 50 50v34c0 20-10 30-24 36H86c-14-4-24-16-24-34z" fill="'+a+'"/>'
    + '<path d="M62 92c-16 2-24 12-22 26s14 20 26 16l8-3" fill="'+a+'"/><path d="M62 92c-16 2-24 12-22 26s14 20 26 16l8-3" fill="#000" opacity=".16"/>'
    + '<path d="M80 40c12-8 30-8 44 0" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".35" fill="none"/>'
    + '<rect x="80" y="142" width="56" height="40" rx="6" fill="'+b+'"/><rect x="80" y="150" width="56" height="6" fill="#fff" opacity=".35"/>'
    + '<path d="M90 120h36" stroke="#000" stroke-width="3" opacity=".18"/>'; },
  // luva de MMA (dedos abertos)
  luvammma:function(a, b){ return sombra()
    + '<path d="M58 84h82c10 0 16 6 16 16v32c0 16-10 26-26 26H84c-16 0-26-12-26-28z" fill="'+a+'"/>'
    + '<path d="M64 84V58M84 84V50M104 84V50M124 84V56" stroke="#e8c7a6" stroke-width="15" stroke-linecap="round"/>'
    + '<path d="M58 96h98" stroke="#000" stroke-width="4" opacity=".18"/><path d="M58 104h98" stroke="#000" stroke-width="2" opacity=".12"/>'
    + '<rect x="76" y="156" width="58" height="26" rx="5" fill="'+b+'"/><path d="M38 116c-4 12 4 22 20 20" stroke="'+a+'" stroke-width="16" stroke-linecap="round" fill="none"/>'; },
  // caneleira
  caneleira:function(a, b){ return sombra()
    + '<path d="M74 22h52c8 0 12 6 12 14v92c0 10-6 16-14 20l-6 18H82l-6-18c-8-4-14-10-14-20V36c0-8 4-14 12-14z" fill="'+a+'"/>'
    + '<path d="M84 166h32l10 16H74z" fill="'+a+'"/><path d="M84 166h32l10 16H74z" fill="#000" opacity=".2"/>'
    + '<path d="M86 34v104M100 30v110M114 34v104" stroke="#fff" stroke-width="3" opacity=".22"/>'
    + '<rect x="62" y="56" width="76" height="12" fill="'+b+'"/><rect x="62" y="110" width="76" height="12" fill="'+b+'"/>'; },
  // protetor de tronco (hogu / colete)
  protetor:function(a, b){ return sombra()
    + '<path d="M56 30h88l10 34-6 98c-16 14-32 20-48 20s-32-6-48-20l-6-98z" fill="'+a+'"/>'
    + '<path d="M100 30v152c16 0 32-6 48-20l6-98-10-34z" fill="'+b+'"/>'
    + '<path d="M78 30c4 18 12 26 22 26s18-8 22-26" fill="none" stroke="#fff" stroke-width="5"/>'
    + '<circle cx="100" cy="110" r="24" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"/>'; },
  // capacete
  capacete:function(a, b){ return sombra()
    + '<path d="M50 110c0-44 22-76 50-76s50 32 50 76v26c0 16-10 26-26 26h-8v-44H84v44h-8c-16 0-26-10-26-26z" fill="'+a+'"/>'
    + '<path d="M66 98c8-32 20-48 34-48" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="7" stroke-linecap="round"/>'
    + '<rect x="84" y="150" width="32" height="10" rx="4" fill="'+b+'"/><circle cx="66" cy="124" r="8" fill="#000" opacity=".25"/><circle cx="134" cy="124" r="8" fill="#000" opacity=".25"/>'; },
  // protetor bucal
  bucal:function(a, b){ return sombra()
    + '<path d="M40 120c0-40 28-70 60-70s60 30 60 70c-12 10-24 4-30-8-6-12-18-18-30-18s-24 6-30 18c-6 12-18 18-30 8z" fill="'+a+'"/>'
    + '<path d="M58 104c8-22 24-36 42-36s34 14 42 36" fill="none" stroke="#fff" stroke-width="6" opacity=".35" stroke-linecap="round"/>'
    + '<rect x="40" y="150" width="120" height="28" rx="14" fill="'+b+'" opacity=".9"/>'; },
  // bandagem (rolo)
  bandagem:function(a, b){ return sombra()
    + '<ellipse cx="80" cy="96" rx="44" ry="44" fill="'+a+'"/><ellipse cx="80" cy="96" rx="30" ry="30" fill="#000" opacity=".12"/><ellipse cx="80" cy="96" rx="12" ry="12" fill="#fff"/>'
    + '<path d="M116 120c20 10 40 22 60 50l-18 12c-16-22-34-34-54-42z" fill="'+a+'"/><path d="M150 168l10-8 8 12-10 8z" fill="'+b+'"/>'
    + '<path d="M44 96a36 36 0 0 1 72 0" fill="none" stroke="#fff" stroke-width="3" opacity=".3"/>'; },
  // shorts de luta
  shorts:function(a, b){ return sombra()
    + '<path d="M44 42h112l18 120-58 8-16-60-16 60-58-8z" fill="'+a+'"/>'
    + '<rect x="44" y="34" width="112" height="24" rx="4" fill="'+b+'"/><path d="M56 46h88" stroke="#fff" stroke-width="3" opacity=".45"/>'
    + '<path d="M54 140l52 8M146 140l-30 6" stroke="'+b+'" stroke-width="7" opacity=".9"/>'
    + '<path d="M70 80l20 28M130 80l-20 28" stroke="#fff" stroke-width="5" opacity=".25" stroke-linecap="round"/>'; },
  // camiseta / rash guard
  camiseta:function(a, b){ return sombra()
    + '<path d="M70 28c8 10 18 14 30 14s22-4 30-14l46 24-16 40-22-10v100H62V82l-22 10-16-40z" fill="'+a+'"/>'
    + '<path d="M70 28c8 10 18 14 30 14s22-4 30-14" fill="none" stroke="'+b+'" stroke-width="6"/>'
    + '<circle cx="100" cy="100" r="22" fill="none" stroke="'+b+'" stroke-width="6"/><path d="M90 100h20M100 90v20" stroke="'+b+'" stroke-width="5"/>'
    + '<path d="M62 160h76" stroke="#fff" stroke-width="3" opacity=".25"/>'; },
  // berimbau
  berimbau:function(a, b){ return sombra()
    + '<path d="M70 16c38 40 44 120 18 170" fill="none" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round"/>'
    + '<path d="M70 16c-6 60-4 120 18 170" fill="none" stroke="#c9b48a" stroke-width="2"/>'
    + '<circle cx="104" cy="150" r="30" fill="#c99a52"/><circle cx="104" cy="150" r="30" fill="#000" opacity=".12"/><circle cx="104" cy="150" r="14" fill="#5b3a1a"/>'
    + '<path d="M86 132c10-6 22-6 30 0" stroke="'+b+'" stroke-width="6" fill="none"/>'
    + '<path d="M128 70l36 40" stroke="#5b3a1a" stroke-width="5" stroke-linecap="round"/><ellipse cx="150" cy="58" rx="12" ry="16" fill="'+a+'"/>'; },
  // pandeiro
  pandeiro:function(a, b){ var s = '', i; for(i = 0; i < 8; i++){ var ang = i * Math.PI / 4, x = 100 + Math.cos(ang) * 66, y = 100 + Math.sin(ang) * 66; s += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="9" fill="#c9cdd4" stroke="#8b929c" stroke-width="2"/>'; }
    return sombra() + '<circle cx="100" cy="100" r="72" fill="'+a+'"/><circle cx="100" cy="100" r="60" fill="#f2e6cf"/><circle cx="100" cy="100" r="60" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="8"/>'
      + s + '<circle cx="100" cy="100" r="20" fill="'+b+'" opacity=".25"/>'; },
  // atabaque
  atabaque:function(a, b){ return sombra()
    + '<path d="M62 30h76l-10 150H72z" fill="#9b6a36"/><path d="M62 30h76l-10 150H72z" fill="'+a+'" opacity=".25"/>'
    + '<ellipse cx="100" cy="30" rx="38" ry="10" fill="#f2e6cf" stroke="#5b3a1a" stroke-width="3"/>'
    + '<path d="M66 60l64 40M134 60l-64 40M70 110l58 36M130 110l-58 36" stroke="'+b+'" stroke-width="4"/><rect x="66" y="96" width="68" height="10" fill="'+b+'"/>'; },
  // manopla / thai pad
  manopla:function(a, b){ return sombra()
    + '<path d="M60 38h80c12 0 20 8 20 20v76c0 22-18 40-40 40H80c-22 0-40-18-40-40V58c0-12 8-20 20-20z" fill="'+a+'"/>'
    + '<circle cx="100" cy="98" r="34" fill="none" stroke="'+b+'" stroke-width="10"/><circle cx="100" cy="98" r="12" fill="'+b+'"/>'
    + '<path d="M58 54h84" stroke="#fff" stroke-width="5" opacity=".25" stroke-linecap="round"/>'; },
  // corda de pular
  pular:function(a, b){ return sombra()
    + '<path d="M54 52c-20 70 10 126 46 126s66-56 46-126" fill="none" stroke="'+a+'" stroke-width="6"/>'
    + '<rect x="42" y="18" width="22" height="46" rx="10" fill="'+b+'"/><rect x="136" y="18" width="22" height="46" rx="10" fill="'+b+'"/>'; },
  // bastão / faca de treino
  bastao:function(a, b){ return sombra()
    + '<rect x="94" y="16" width="14" height="170" rx="7" transform="rotate(30 100 100)" fill="#b27a3c"/>'
    + '<path d="M120 40l30 18-46 78-12-8z" fill="#a9b1bc" transform="translate(-60 30)"/><rect x="36" y="150" width="34" height="14" rx="5" transform="rotate(-58 53 157)" fill="'+a+'"/>'
    + '<rect x="92" y="96" width="18" height="10" transform="rotate(30 100 100)" fill="'+b+'"/>'; },
  // mochila / bolsa
  bolsa:function(a, b){ return sombra()
    + '<path d="M70 66c0-20 14-34 30-34s30 14 30 34" fill="none" stroke="'+b+'" stroke-width="8"/>'
    + '<rect x="30" y="66" width="140" height="106" rx="22" fill="'+a+'"/><rect x="30" y="100" width="140" height="10" fill="'+b+'"/>'
    + '<rect x="84" y="124" width="32" height="20" rx="6" fill="#fff" opacity=".85"/>'; },
  // garrafa
  garrafa:function(a, b){ return sombra()
    + '<rect x="72" y="46" width="56" height="134" rx="18" fill="'+a+'"/><rect x="84" y="22" width="32" height="28" rx="6" fill="'+b+'"/>'
    + '<rect x="72" y="96" width="56" height="34" fill="#fff" opacity=".85"/><path d="M82 60v24" stroke="#fff" stroke-width="5" opacity=".35" stroke-linecap="round"/>'; },
  // genérico: sacola
  sacola:function(a, b){ return sombra()
    + '<path d="M76 70V58c0-14 10-24 24-24s24 10 24 24v12" fill="none" stroke="'+b+'" stroke-width="8"/>'
    + '<path d="M46 70h108l-8 112H54z" fill="'+a+'"/><path d="M46 70h108l-2 22H48z" fill="#fff" opacity=".18"/>'
    + '<circle cx="100" cy="128" r="18" fill="'+b+'"/>'; }
};

// Ordem importa: "corda de pular" antes de "cordão"; "luva de mma" antes de "luva".
var REGRAS = [
  [/pular|jump/, 'pular'], [/mongkol|mongkon|coroa/, 'mongkon'], [/prajied|pra\s?jied|bra[cç]adeira/, 'prajied'],
  [/cord[aã]o|corda de capoeira|cordel/, 'cordao'], [/faixa|belt|obi/, 'faixa'],
  [/dobok/, 'dobok'], [/kimono|quimono|karategi|judogi|\bgi\b|uniforme|keikogi/, 'gi'], [/abad[aá]|cal[cç]a/, 'abada'],
  [/(luva|luvinha).*(mma|grappling|dedo)|mma.*luva/, 'luvammma'], [/luva|glove/, 'luva'],
  [/canel|shin/, 'caneleira'], [/hogu|colete|protetor (de )?(tronco|peito)|peitoral/, 'protetor'],
  [/capacete|head ?guard|protetor de cabe/, 'capacete'], [/bucal|mouth/, 'bucal'], [/bandag|atadura|wrap/, 'bandagem'],
  [/shorts?|bermuda|cal[cç][aã]o/, 'shorts'], [/camis|regata|rash|dry ?fit|moletom|jaqueta|agasalho/, 'camiseta'],
  [/berimbau/, 'berimbau'], [/pandeiro/, 'pandeiro'], [/atabaque|tambor/, 'atabaque'],
  [/manopla|aparador|thai ?pad|pad\b|raquete|foco/, 'manopla'], [/bast[aã]o|faca|bo\b|tonfa|nunchaku/, 'bastao'],
  [/mochila|bolsa|bag/, 'bolsa'], [/squeeze|garrafa|copo/, 'garrafa'], [/protetor|prote[cç][aã]o/, 'protetor']
];

export function tipoProduto(nome){
  var n = String(nome || '').toLowerCase();
  for(var i = 0; i < REGRAS.length; i++){ if(REGRAS[i][0].test(n)) return REGRAS[i][1]; }
  return 'sacola';
}

// cores: { principal, destaque } da escola. Devolve o <svg> pronto (string segura).
export function ilustracao(nome, cores){
  var a = hex(cores && cores.principal, '#1b2233'), b = hex(cores && cores.destaque, '#e1262d');
  var t = tipoProduto(nome);
  var corpo = t === 'dobok' ? D.gi(a, b, '#111111') : t === 'gi' ? D.gi(a, b, '#dfe3e8') : D[t](a, b);
  return abre() + corpo + '</svg>';
}
