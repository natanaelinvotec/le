/* site-tpl-dobok.js — Template "Dobok" do site público por escola (pré-build #6, Taekwondo).
 *
 * Estrutura inspirada no demo de futebol do campo.bold-themes (demo-01/soccer); implementação 100% original.
 * Identidade: azul chung (cor principal) × vermelho hong (cor de botão/destaque), padrão de trigramas (gwae),
 * borda de "tábua quebrada" (kyukpa) entre seções, Saira Extra Condensed + Figtree, hangul (Black Han Sans).
 *
 * Seções: topo com destaques (agenda e avisos do APP) · placar de campeonatos (só se a escola lançar) · mural de avisos
 * (app) · graduação (escada real) + agenda (app + painel) · programas · horários (acordeão) · sobre o dojang · princípios
 * + depoimento · equipe · conquistas (só se lançar) · vídeos (só se lançar) · app · loja (só com produtos) · onde treinar
 * · redes · rodapé com parceiros.
 *
 * Regra da biblioteca: nada inventado — números, resultados, conquistas, vídeos, loja, parceiros e depoimento só
 * aparecem com dados reais da escola. Tudo que vem do painel é escapado (esc) e links passam por url().
 */
import { SECAO_LOJA, produtosLoja, ilustracao, linkCompra } from './site-loja.js';

export var meta = {
  nome: 'Dobok',
  descricao: 'Clube esportivo em azul e vermelho: destaques e mural ligados ao app, placar de medalhas, graduação em tabela, horários em acordeão, conquistas, vídeos e loja.',
  modalidades: ['taekwondo', 'todas']
};

var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var TIT = { c:'titulo', r:'Título', max:50 };
var DEST = { c:'destaque', r:'Parte final do título (em vermelho)', max:24 };
var DIAS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];
var MESES = [['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']];
var TIPO_TROFEU = [['ouro', 'Medalha de ouro'], ['prata', 'Medalha de prata'], ['bronze', 'Medalha de bronze'], ['trofeu', 'Troféu']];

export var schema = { secoes: [
  { id:'topo', r:'Topo', ajuda:'Os destaques do topo saem sozinhos do app: o próximo evento e o último aviso marcados com "Mostrar no site". Aqui você pode fixar até 3 destaques próprios.', campos:[
    { c:'titulo', r:'Título do destaque principal', max:40, ph:'Taekwondo para toda a família' }, { c:'texto', r:'Texto', t:'area', max:180 },
    { c:'botao', r:'Botão principal', max:28, ph:'Agendar aula experimental' }, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'slides', r:'Destaques fixos', t:'lista', max:3, resumo:'titulo', nomeItem:'Destaque', item:[ { c:'selo', r:'Etiqueta', max:30 }, { c:'titulo', r:'Título', max:40 }, { c:'foto', r:'Foto', t:'foto' }, { c:'link', r:'Link do botão (https://…)', t:'link', max:200 } ] } ] },
  { id:'resultados', r:'Placar de campeonatos', ajuda:'Até 2 campeonatos com o quadro de medalhas. Sem itens, o placar não aparece.', campos:[
    { c:'itens', r:'Campeonatos', t:'lista', max:2, resumo:'evento', nomeItem:'Campeonato', item:[ { c:'dia', r:'Dia', max:2, ph:'30' }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' },
      { c:'evento', r:'Campeonato', max:40 }, { c:'local', r:'Cidade / detalhe', max:50, ph:'Curitiba · 14 atletas' }, { c:'ouro', r:'Ouros', max:3 }, { c:'prata', r:'Pratas', max:3 }, { c:'bronze', r:'Bronzes', max:3 } ] } ] },
  { id:'mural', r:'Mural de avisos', ajuda:'Os avisos publicados no app com "Mostrar no site" entram aqui sozinhos. Sem avisos, a seção não aparece.', campos:[ SELO, TIT ] },
  { id:'graduacao', r:'Graduação', ajuda:'As faixas e cores vêm da escada cadastrada. Aqui você escreve o grau de cada uma (ex.: 10º gub), na mesma ordem.', campos:[
    TIT, { c:'itens', r:'Grau por faixa (na ordem da escada)', t:'lista', max:16, resumo:'grau', nomeItem:'Faixa', item:[ { c:'grau', r:'Grau', max:16, ph:'10º gub' } ] } ] },
  { id:'agenda', r:'Agenda', ajuda:'Eventos do app com "Mostrar no site" entram sozinhos. Use a lista só para eventos que não estão no app.', campos:[
    TIT, { c:'itens', r:'Eventos extras', t:'lista', max:6, resumo:'titulo', nomeItem:'Evento', item:[ { c:'dia', r:'Dia', max:2, ph:'22' }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' },
      { c:'tipo', r:'Tipo (ex.: Campeonato)', max:20 }, { c:'titulo', r:'Evento', max:50 }, { c:'local', r:'Local · horário', max:60 } ] } ] },
  { id:'programas', r:'Programas', ajuda:'Três programas em cartões.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 }, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'itens', r:'Programas', t:'lista', max:3, resumo:'titulo', nomeItem:'Programa', item:[ { c:'titulo', r:'Nome', max:24 }, { c:'texto', r:'Descrição', t:'area', max:120 } ] } ] },
  { id:'horarios', r:'Horários', ajuda:'Quadro da semana em acordeão. Sem aulas, a seção não aparece.', campos:[ TIT, { c:'nota', r:'Observação abaixo do quadro', max:140 },
    { c:'itens', r:'Aulas', t:'lista', max:30, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS, ph:'Dia da semana' }, { c:'aula', r:'Aula', max:40, ph:'Kyorugi' },
      { c:'horario', r:'Horário', max:20, ph:'19:00–20:30' }, { c:'local', r:'Núcleo / local', max:40 }, { c:'publico', r:'Público (ex.: Infantil)', max:24 } ] } ] },
  { id:'sobre', r:'Sobre', ajuda:'Bloco com foto e a assinatura do responsável (nome do cadastro).', campos:[ SELO, TIT, { c:'lead', r:'Frase de abertura', t:'area', max:200 }, { c:'texto', r:'Texto', t:'area', max:400 }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'principios', r:'Princípios e depoimento', ajuda:'No Taekwondo, os cinco princípios já vêm prontos. O depoimento só aparece se preenchido.', campos:[ TIT, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'depoimento', r:'Depoimento', t:'area', max:160 }, { c:'autor', r:'Quem disse', max:60, ph:'Mãe da Lívia, 9 anos' }, { c:'foto', r:'Foto do lado', t:'foto' } ] },
  { id:'equipe', r:'Equipe', ajuda:'Lista vazia = equipe do cadastro.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Pessoas', t:'lista', max:6, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:60 }, { c:'graduacao', r:'Graduação', max:40 }, { c:'bio', r:'Apresentação', t:'area', max:200 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'conquistas', r:'Conquistas', ajuda:'Medalhas e troféus da equipe. Sem itens, a seção não aparece.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Conquistas', t:'lista', max:10, resumo:'titulo', nomeItem:'Conquista', item:[ { c:'tipo', r:'Tipo', t:'select', opcoes:TIPO_TROFEU, ph:'Tipo' }, { c:'titulo', r:'Título', max:30 }, { c:'detalhe', r:'Detalhe (anos, quantidades)', max:50 } ] } ] },
  { id:'videos', r:'Vídeos', ajuda:'Vídeo em destaque e até 4 vídeos (links do YouTube/Instagram). Sem vídeos, a seção não aparece.', campos:[ SELO, TIT,
    { c:'link', r:'Link do vídeo em destaque (https://…)', t:'link', max:200 }, { c:'foto', r:'Capa do destaque', t:'foto' },
    { c:'itens', r:'Outros vídeos', t:'lista', max:4, resumo:'titulo', nomeItem:'Vídeo', item:[ { c:'titulo', r:'Título', max:40 }, { c:'categoria', r:'Categoria', max:20 }, { c:'link', r:'Link (https://…)', t:'link', max:200 }, { c:'foto', r:'Capa', t:'foto' } ] } ] },
  { id:'app', r:'App', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  SECAO_LOJA([ SELO, { c:'titulo', r:'Título', max:30, ph:'Loja' }, { c:'destaque', r:'Parte final do título (em vermelho)', max:20, ph:'oficial' } ]),
  { id:'nucleos', r:'Onde treinar', ajuda:'Núcleos com endereço, dias e WhatsApp. Lista vazia = núcleos do cadastro.', campos:[ SELO, TIT, DEST,
    { c:'lista', r:'Núcleos', t:'lista', max:9, resumo:'nome', nomeItem:'Núcleo', item:[ { c:'nome', r:'Nome', max:40 }, { c:'endereco', r:'Endereço', max:100 }, { c:'dias', r:'Dias / turmas', max:60 }, { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 } ] } ] },
  { id:'redes', r:'Redes sociais', ajuda:'Seguidores são opcionais (em mil). O Instagram do cadastro aparece sozinho.', campos:[ SELO, TIT, DEST,
    { c:'instagram', r:'Seguidores no Instagram (mil)', max:4 }, { c:'youtube', r:'Link do YouTube', t:'link', max:200 }, { c:'youtubeN', r:'Inscritos no YouTube (mil)', max:4 },
    { c:'facebook', r:'Link do Facebook', t:'link', max:200 }, { c:'facebookN', r:'Seguidores no Facebook (mil)', max:4 }, { c:'tiktok', r:'Link do TikTok', t:'link', max:200 }, { c:'tiktokN', r:'Seguidores no TikTok (mil)', max:4 } ] },
  { id:'contato', r:'Contato e rodapé', ajuda:'Endereço e Instagram vêm do cadastro. Com WhatsApp, o botão "Aula experimental" abre a conversa.', campos:[
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13, ph:'43999990000' }, { c:'msgWhatsapp', r:'Mensagem pronta', max:140 }, { c:'email', r:'E-mail', max:80 }, { c:'lema', r:'Lema do rodapé', max:40, ph:'Formamos faixas pretas' },
    { c:'parceiros', r:'Parceiros', t:'lista', max:6, resumo:'nome', nomeItem:'Parceiro', item:[ { c:'nome', r:'Nome', max:30 }, { c:'logo', r:'Logo', t:'foto', png:true }, { c:'link', r:'Site (https://…)', t:'link', max:120 } ] } ] }
] };

/* ---------------- textos padrão por modalidade (genéricos) ---------------- */
var TOPO = {
  taekwondo: ['Taekwondo para toda a *família*', 'Do primeiro chute à faixa preta, com acompanhamento de cada aluno pelo app.'],
  arena: ['Treine com quem *vive isso*', 'Técnica, disciplina e acompanhamento de cada aluno pelo app — do primeiro dia à próxima graduação.']
};
var PROG = {
  taekwondo: { selo:'Treino contínuo', titulo:'Um treino para cada', dest:'fase', texto:'Da primeira faixa ao pódio: turmas por idade e objetivo, com acompanhamento de cada aluno pelo app.',
    itens:[['Kyorugi', 'Luta olímpica com protetor eletrônico, tática e preparo para campeonatos.', '겨루기'], ['Poomsae', 'As formas do Taekwondo: precisão, equilíbrio e a base de cada exame de faixa.', '품새'], ['Tigrinhos', 'Coordenação, foco e respeito em aulas lúdicas para crianças.', '어린이']] },
  arena: { selo:'Treino contínuo', titulo:'Um treino para cada', dest:'fase', texto:'Turmas por idade e objetivo, com acompanhamento de cada aluno pelo app.',
    itens:[['Iniciantes', 'Fundamentos, condicionamento e confiança para começar do jeito certo.', ''], ['Avançado', 'Técnica refinada, treinos específicos e preparo para competir.', ''], ['Infantil', 'Coordenação, foco e respeito em aulas lúdicas para crianças.', '']] }
};
var TENETS = {
  taekwondo: [['예의', 'Cortesia', 'Ye-ui', 'respeito ao mestre, aos colegas e ao adversário.'], ['염치', 'Integridade', 'Yom-chi', 'saber o certo e agir de acordo.'],
    ['인내', 'Perseverança', 'In-nae', 'cada faixa é um passo, sem pular etapas.'], ['극기', 'Autocontrole', 'Guk-gi', 'força com medida, dentro e fora da luta.'], ['백절불굴', 'Espírito indomável', 'Baekjul-boolgool', 'cair sete vezes, levantar oito.']],
  arena: [['R', 'Respeito', '', 'ao professor, aos colegas e ao adversário.'], ['D', 'Disciplina', '', 'constância vence talento que não treina.'], ['F', 'Foco', '', 'atenção total ao que se está aprendendo.'],
    ['P', 'Perseverança', '', 'cada graduação é um passo, sem pular etapas.'], ['A', 'Autocontrole', '', 'força com medida, dentro e fora do treino.']]
};
var HAN = { mural:'도장', prog:'겨루기 · 품새', horas:'시간표', sobre:'도장', conq:'승리', video:'경기', app:'앱', loja:'도복', nuc:'도장', redes:'청 · 홍', marca:'태권도' };

/* ---------------- utilitários ---------------- */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null; }
function rgb(h){ return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function tri(h){ return rgb(h).join(','); }
function lum(h){ var c = rgb(h).map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function mix(a, b, p){ var x = rgb(a), y = rgb(b); return '#' + x.map(function(v, i){ var r = Math.round(v + (y[i] - v) * p); return (r < 16 ? '0' : '') + r.toString(16); }).join(''); }
function cores(s){
  var c = s.cores || {};
  var azul = hex6(c.principal) || '#0e2a66', verm = hex6(c.botao) || hex6(c.destaque) || '#e1262d';
  if(lum(azul) > 0.32) azul = mix(azul, '#000000', .55);          // fundo com texto branco precisa ser escuro
  if(lum(verm) < 0.035) verm = mix(verm, '#ffffff', .35);          // acento quase preto some no azul
  // principal e botão iguais (ex.: tudo vermelho): o fundo vira a versão escura da cor, o botão continua vivo.
  var contraste = function(x, y){ var a1 = lum(x) + .05, b1 = lum(y) + .05; return a1 > b1 ? a1 / b1 : b1 / a1; };
  if(contraste(azul, verm) < 2.2) azul = mix(azul, '#000000', .62);
  var t = { azul:azul, verm:verm };
  t.azul2 = mix(azul, '#ffffff', .12); t.azulEsc = mix(azul, '#000000', .35);
  t.vermEsc = mix(verm, '#000000', .3); t.vermClaro = lum(verm) < .12 ? mix(verm, '#ffffff', .4) : verm;
  t.vermInk = lum(verm) > .5 ? '#0a0f1e' : '#ffffff';
  t.rosado = mix(verm, '#ffffff', .93);
  t.azulTri = tri(azul); t.vermTri = tri(verm);
  return t;
}
function iniciais(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
function digitos(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
function hojeLocal(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
var MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
var GWAE = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\' viewBox=\'0 0 160 160\'%3E%3Cg fill=\'%23fff\'%3E%3Crect x=\'14\' y=\'18\' width=\'44\' height=\'7\'/%3E%3Crect x=\'14\' y=\'31\' width=\'44\' height=\'7\'/%3E%3Crect x=\'14\' y=\'44\' width=\'44\' height=\'7\'/%3E%3Crect x=\'96\' y=\'18\' width=\'19\' height=\'7\'/%3E%3Crect x=\'121\' y=\'18\' width=\'19\' height=\'7\'/%3E%3Crect x=\'96\' y=\'31\' width=\'19\' height=\'7\'/%3E%3Crect x=\'121\' y=\'31\' width=\'19\' height=\'7\'/%3E%3Crect x=\'96\' y=\'44\' width=\'19\' height=\'7\'/%3E%3Crect x=\'121\' y=\'44\' width=\'19\' height=\'7\'/%3E%3Crect x=\'14\' y=\'98\' width=\'19\' height=\'7\'/%3E%3Crect x=\'39\' y=\'98\' width=\'19\' height=\'7\'/%3E%3Crect x=\'14\' y=\'111\' width=\'44\' height=\'7\'/%3E%3Crect x=\'14\' y=\'124\' width=\'19\' height=\'7\'/%3E%3Crect x=\'39\' y=\'124\' width=\'19\' height=\'7\'/%3E%3Crect x=\'96\' y=\'98\' width=\'44\' height=\'7\'/%3E%3Crect x=\'96\' y=\'111\' width=\'19\' height=\'7\'/%3E%3Crect x=\'121\' y=\'111\' width=\'19\' height=\'7\'/%3E%3Crect x=\'96\' y=\'124\' width=\'44\' height=\'7\'/%3E%3C/g%3E%3C/svg%3E")';
// Bordas de tábua quebrada (geradas por script; terminam em x=1440). %C% = cor do fundo da seção seguinte.
var QUEBRA = ['M0 28 L39 17 L67 17 L82 9 L112 50 L135 42 L171 31 L186 52 L206 19 L251 22 L289 30 L306 17 L345 33 L382 34 L426 45 L462 37 L503 27 L522 32 L542 5 L585 39 L611 45 L647 34 L697 35 L713 45 L765 50 L793 6 L814 4 L833 25 L880 18 L915 53 L961 26 L989 53 L1009 22 L1032 35 L1056 14 L1084 39 L1124 37 L1164 16 L1207 52 L1236 5 L1252 17 L1273 10 L1292 18 L1307 52 L1327 25 L1355 19 L1407 35 L1424 18 L1440 36','M0 21 L38 35 L82 50 L115 7 L152 17 L175 2 L217 53 L232 28 L250 56 L270 50 L319 34 L346 35 L362 52 L406 23 L453 47 L490 46 L522 50 L571 53 L599 34 L650 9 L692 58 L724 38 L747 41 L784 22 L812 55 L848 9 L893 48 L933 44 L984 32 L1034 40 L1067 31 L1114 4 L1158 35 L1174 25 L1204 7 L1252 57 L1284 25 L1318 8 L1364 49 L1401 33 L1440 36','M0 8 L22 46 L70 18 L86 24 L101 23 L135 24 L180 14 L221 29 L271 9 L317 41 L359 38 L387 38 L425 52 L465 16 L490 18 L508 26 L536 30 L560 55 L597 22 L618 31 L656 39 L702 48 L717 28 L739 55 L765 43 L814 34 L837 39 L874 54 L896 58 L913 5 L957 7 L1009 37 L1056 15 L1096 38 L1134 19 L1166 56 L1190 36 L1238 52 L1276 41 L1319 38 L1354 14 L1368 55 L1414 3 L1440 36'];
function quebra(i, cor, traco){ var d = QUEBRA[i % QUEBRA.length];
  return '<div class="quebra baixo" aria-hidden="true"><svg viewBox="0 0 1440 64" preserveAspectRatio="none"><path fill="'+cor+'" d="'+d+' L1440 64 L0 64z"/>'+(traco ? '<path fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5" d="'+d+'"/>' : '')+'</svg></div>'; }
function ic(d){ return '<svg viewBox="0 0 12 12" fill="none" stroke-width="2"><path d="'+d+'"/></svg>'; }
var SETA = ic('M2 6h8M7 3l3 3-3 3');
var ICONES = [
  '<svg viewBox="0 0 96 96"><path d="M40 14c14-6 32 2 34 18 2 14-8 24-20 26l-6 1-8 26h-10l6-28c-10-6-12-24 4-43z"/><path d="M34 70h22"/><path d="M58 30c-4 0-8 4-8 8"/></svg>',
  '<svg viewBox="0 0 96 96"><rect x="14" y="20" width="68" height="8" rx="2"/><path d="M14 44h28M54 44h28"/><rect x="14" y="64" width="68" height="8" rx="2"/><circle cx="48" cy="48" r="44" stroke-dasharray="4 8"/></svg>',
  '<svg viewBox="0 0 96 96"><path d="M48 12l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z"/><path d="M30 84c6-6 12-8 18-8s12 2 18 8"/><path d="M44 76l4 8 4-8"/></svg>'
];
var ZAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>';
function trofeu(tipo){
  var cor = tipo === 'prata' ? '#A9B3C1' : tipo === 'bronze' ? '#C0763A' : '#E3A90B';
  var num = tipo === 'prata' ? '2º' : tipo === 'bronze' ? '3º' : '1º';
  if(tipo === 'trofeu') return '<svg viewBox="0 0 150 190" aria-hidden="true"><path d="M38 24h74l-6 70c-2 16-14 24-31 24s-29-8-31-24z" fill="#E3A90B"/><path d="M38 34H20c0 26 12 38 26 40M112 34h18c0 26-12 38-26 40" fill="none" stroke="#E3A90B" stroke-width="7"/><path d="M60 50h30M60 64h30" stroke="#fff" stroke-opacity=".5" stroke-width="4"/><rect x="66" y="118" width="18" height="18" fill="#C9930A"/><rect x="40" y="136" width="70" height="42" rx="4" style="fill:var(--azul)"/><rect x="56" y="152" width="38" height="10" rx="2" fill="#E3A90B"/></svg>';
  return '<svg viewBox="0 0 150 190" aria-hidden="true"><path d="M45 8h60l-18 58H63z" style="fill:var(--azul2)"/><path d="M45 8l18 58h-8L36 8z" style="fill:var(--verm)"/><path d="M105 8L87 66h8l19-58z" style="fill:var(--verm)"/><circle cx="75" cy="118" r="54" fill="'+cor+'"/><circle cx="75" cy="118" r="42" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><text x="75" y="133" text-anchor="middle" font-family="Saira Extra Condensed,Impact,sans-serif" font-weight="800" font-size="44" fill="#fff">'+num+'</text></svg>';
}

var CSS_BASE = '.db,.db *,.db *::before,.db *::after{box-sizing:border-box}\
.db h1,.db h2,.db h3,.db h4,.db p,.db blockquote{margin:0}\
.db img{max-width:100%;display:block}\
.db a{color:inherit;text-decoration:none}\
.db button{font:inherit;cursor:pointer}\
.db :focus-visible{outline:3px solid var(--verm);outline-offset:3px}\
.db h1,.db h2,.db h3{overflow-wrap:break-word;hyphens:auto}\
.db .ct{width:var(--ct);margin-inline:auto}\
.db .k{font:700 13px/1 var(--corpo);letter-spacing:.16em;text-transform:uppercase}\
.db .han{font-family:var(--han);font-weight:400;letter-spacing:0}\
.db .gwae{position:absolute;inset:0;pointer-events:none;opacity:.16;background-image:var(--gwae);background-size:120px 120px;transform:rotate(-12deg) scale(1.4);transform-origin:0 0;-webkit-mask-image:linear-gradient(90deg,#000 0%,rgba(0,0,0,.6) 30%,transparent 55%);mask-image:linear-gradient(90deg,#000 0%,rgba(0,0,0,.6) 30%,transparent 55%)}\
.db .quebra{position:absolute;left:0;right:0;height:64px;pointer-events:none;z-index:2}\
.db .quebra svg{width:100%;height:100%;display:block}\
.db .quebra.baixo{bottom:-1px}\
.db .tit{position:relative;padding-left:28px}\
.db .tit::before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:8px;background:var(--verm)}\
.db .tit .k{color:var(--suave);display:flex;align-items:center;gap:10px;flex-wrap:wrap}\
.db .tit .k .han{font-size:15px;color:var(--verm)}\
.db .tit h2{margin-top:10px;font:800 clamp(44px,6.4vw,92px)/.88 var(--disp);text-transform:uppercase;text-wrap:balance}\
.db .tit h2 em{font-style:normal;color:var(--verm)}\
.db .cab{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:40px}\
.db .mais{display:inline-flex;align-items:center;gap:10px;font:700 14px/1 var(--corpo);letter-spacing:.06em;text-transform:uppercase}\
.db .mais .ic{width:30px;height:30px;border-radius:50%;border:2px solid var(--verm);display:grid;place-items:center;transition:background .4s var(--ease),transform .4s var(--ease)}\
.db .mais .ic svg{width:12px;height:12px;stroke:var(--verm);transition:stroke .3s}\
.db .mais:hover .ic{background:var(--verm);transform:translateX(4px)}\
.db .mais:hover .ic svg{stroke:#fff}\
.db .app-tag{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:rgba(0,230,118,.14);color:#0b7a45;font:700 11px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase}\
.db .app-tag::before{content:"";width:7px;height:7px;border-radius:50%;background:#00E676;box-shadow:0 0 0 3px rgba(0,230,118,.25)}\
.db .app-tag.cl{background:rgba(255,255,255,.14);color:#fff}\
.db .btn{display:inline-flex;align-items:center;gap:10px;padding:16px 26px;font:800 15px/1 var(--corpo);letter-spacing:.06em;text-transform:uppercase;border:2px solid transparent;border-radius:4px;transition:transform .5s var(--ease),background .4s var(--ease),color .4s,box-shadow .5s var(--ease)}\
.db .btn svg{width:16px;height:16px}\
.db .btn-v{background:var(--verm);color:var(--verm-ink);box-shadow:0 12px 30px -10px rgba(var(--verm-tri),.7)}\
.db .btn-v:hover{transform:translateY(-3px);box-shadow:0 18px 40px -12px rgba(var(--verm-tri),.85)}\
.db .btn-c{border-color:rgba(255,255,255,.55);color:#fff}\
.db .btn-c:hover{background:#fff;color:var(--tinta)}\
.db .btn-e{background:var(--tinta);color:#fff}\
.db .btn-e:hover{background:var(--azul);transform:translateY(-3px)}\
.db .rv{opacity:1;transform:none;transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.db .rv.fora{opacity:0;transform:translateY(34px)}\
.db .topo{position:absolute;top:18px;left:0;right:0;z-index:30}\
.db .topo .barra{width:var(--ct);margin-inline:auto;display:flex;align-items:center;gap:24px;padding:10px 12px 10px 10px;border:1px solid rgba(255,255,255,.28);border-radius:14px;background:rgba(10,15,30,.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:background .5s var(--ease),border-color .5s,border-radius .5s,width .5s,padding .5s}\
.db .marca{display:flex;align-items:center;gap:12px;color:#fff;flex:none;min-width:0}\
.db .marca .selo{width:52px;height:52px;flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--azul);border:2px solid rgba(255,255,255,.85);font:800 20px/1 var(--disp);color:#fff}\
.db .marca .selo img{width:100%;height:100%;object-fit:cover}\
.db .marca b{font:800 22px/.9 var(--disp);text-transform:uppercase;letter-spacing:.02em;display:block}\
.db .marca small{font:600 10.5px/1 var(--corpo);letter-spacing:.2em;text-transform:uppercase;opacity:.75}\
.db .menu{display:flex;gap:20px;margin-left:auto}\
.db .menu .so-m{display:none}\
.db .menu a{color:#fff;font:600 14px/1 var(--corpo);letter-spacing:.06em;text-transform:uppercase;position:relative;padding:6px 0;white-space:nowrap}\
.db .menu a::after{content:"";position:absolute;left:0;right:100%;bottom:0;height:2px;background:var(--verm);transition:right .5s var(--ease)}\
.db .menu a:hover::after{right:0}\
.db .topo .barra>.btn{padding:13px 18px;font-size:13px;flex:none}\
.db .ham{display:none;margin-left:auto;width:46px;height:46px;border-radius:10px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;place-items:center}\
.db .ham span,.db .ham span::before,.db .ham span::after{display:block;width:20px;height:2px;background:currentColor;position:relative;transition:transform .4s var(--ease),background .3s}\
.db .ham span::before,.db .ham span::after{content:"";position:absolute;left:0}\
.db .ham span::before{top:-6px}\
.db .ham span::after{top:6px}\
.db .topo.aberto .ham span{background:transparent}\
.db .topo.aberto .ham span::before{transform:translateY(6px) rotate(45deg)}\
.db .topo.aberto .ham span::after{transform:translateY(-6px) rotate(-45deg)}\
.db .topo.fixo{position:fixed;top:0}\
.db .topo.fixo .barra{width:100%;border-radius:0;border-color:transparent;border-bottom:1px solid var(--linha);background:rgba(255,255,255,.94);padding-inline:max(20px,calc((100% - 1180px)/2))}\
.db .topo.fixo .marca,.db .topo.fixo .menu a,.db .topo.fixo .ham{color:var(--tinta)}\
.db .topo.fixo .ham{border-color:var(--linha)}\
.db .hero{position:relative;min-height:clamp(620px,92vh,860px);color:#fff;background:var(--azul);overflow:hidden;isolation:isolate}\
.db .slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.1s var(--ease),visibility 1.1s}\
.db .slide.ativo{opacity:1;visibility:visible}\
.db .slide>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.08);transition:transform 7s linear;color:transparent}\
.db .slide.ativo>img{transform:scale(1)}\
.db .slide::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(var(--azul-tri),.94) 0%,rgba(var(--azul-tri),.72) 38%,rgba(var(--azul-tri),.18) 70%,rgba(var(--verm-tri),.18) 100%),linear-gradient(0deg,rgba(10,15,30,.55),transparent 40%)}\
.db .hero .gwae{z-index:1}\
.db .slide .ct{position:relative;z-index:3;height:100%;display:flex;align-items:center;padding:120px 0 150px}\
.db .h-txt{position:relative;max-width:780px;padding-left:30px}\
.db .h-txt::before{content:"";position:absolute;left:0;top:6px;bottom:96px;width:9px;background:var(--verm)}\
.db .h-txt .k{display:flex;align-items:center;gap:12px;flex-wrap:wrap;opacity:.95}\
.db .h-txt h1{margin:16px 0 28px;font:800 clamp(52px,8vw,116px)/.86 var(--disp);text-transform:uppercase;text-wrap:balance}\
.db .h-txt h1 em{font-style:normal;background:linear-gradient(transparent 62%,rgba(var(--verm-tri),.9) 62%,rgba(var(--verm-tri),.9) 90%,transparent 90%)}\
.db .h-txt p{max-width:52ch;margin:-12px 0 26px;color:rgba(255,255,255,.85);font-size:18px}\
.db .h-txt .acoes{display:flex;gap:14px;flex-wrap:wrap}\
.db .slide .h-txt>*{opacity:0;transform:translateY(26px);transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.db .slide.ativo .h-txt>*{opacity:1;transform:none}\
.db .slide.ativo .h-txt>*:nth-child(2){transition-delay:.12s}\
.db .slide.ativo .h-txt>*:nth-child(3){transition-delay:.2s}\
.db .slide.ativo .h-txt>*:nth-child(4){transition-delay:.28s}\
.db .marcad{position:absolute;right:-1vw;bottom:110px;z-index:2;font:400 clamp(110px,19vw,300px)/1 var(--han);color:transparent;-webkit-text-stroke:1.5px rgba(255,255,255,.28);letter-spacing:-.02em;pointer-events:none;user-select:none;white-space:nowrap}\
.db .marcad.lat{font:900 clamp(90px,15vw,240px)/1 var(--disp);text-transform:uppercase}\
.db .pontos{position:absolute;right:max(20px,calc((100% - 1180px)/2));top:50%;transform:translateY(-50%);z-index:5;display:flex;flex-direction:column;gap:16px}\
.db .pontos button{width:14px;height:14px;border-radius:50%;border:2px solid #fff;background:transparent;padding:0;transition:transform .4s var(--ease),background .3s}\
.db .pontos button[aria-current="true"]{background:#fff;transform:scale(1.25)}\
.db .placar{position:relative;z-index:8;margin-top:-92px;display:grid;grid-template-columns:repeat(var(--n,2),minmax(0,1fr));gap:24px}\
.db .res{display:grid;grid-template-columns:76px 1fr;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(10,15,30,.45);transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.db .res:hover{transform:translateY(-6px);box-shadow:0 40px 70px -30px rgba(10,15,30,.5)}\
.db .dt{background:var(--tinta);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:14px 0}\
.db .dt b{font:800 38px/.85 var(--disp)}\
.db .dt span{font:700 12px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;opacity:.8}\
.db .res .cnt{padding:20px 24px;display:flex;align-items:center;gap:22px;flex-wrap:wrap;min-width:0}\
.db .res .ev{flex:1 1 200px;min-width:0}\
.db .res .ev b{display:block;font:800 26px/.95 var(--disp);text-transform:uppercase}\
.db .res .ev small{color:var(--suave);font-size:13.5px}\
.db .medalhas{display:flex;gap:16px}\
.db .med{display:flex;align-items:center;gap:8px}\
.db .med i{width:22px;height:22px;border-radius:50%;flex:none;box-shadow:inset 0 -3px 0 rgba(0,0,0,.18),0 0 0 3px rgba(0,0,0,.04)}\
.db .med .o{background:#E3A90B}\
.db .med .p{background:#A9B3C1}\
.db .med .b{background:#C0763A}\
.db .odo{display:inline-flex;font:800 40px/1 var(--disp);height:1em;overflow:hidden;font-variant-numeric:tabular-nums}\
.db .odo span{display:block;height:1em;overflow:hidden}\
.db .odo span b{display:block;font:inherit;transition:transform 1.8s var(--ease)}\
.db .odo span b i{display:block;font-style:normal;height:1em}\
.db .so-placar{height:40px}\
.db .mural{position:relative;padding:120px 0 150px;margin-top:-50px;background:var(--azul);color:#fff;overflow:hidden}\
.db .mural.sem-placar{margin-top:0;padding-top:100px}\
.db .mural>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.16;mix-blend-mode:luminosity;color:transparent}\
.db .mural .gwae{opacity:.1}\
.db .mural .ct{position:relative;z-index:3}\
.db .mural .tit::before{background:#fff}\
.db .mural .tit .k{color:rgba(255,255,255,.75)}\
.db .mural .tit .k .han{color:#fff}\
.db .mural .mais{color:#fff}\
.db .mural .mais .ic{border-color:#fff}\
.db .mural .mais .ic svg{stroke:#fff}\
.db .cards4{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:22px}\
.db .nota{background:#fff;color:var(--texto);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.db .nota:hover{transform:translateY(-8px);box-shadow:0 30px 50px -24px rgba(0,0,0,.55)}\
.db .nota .ft{aspect-ratio:16/10;overflow:hidden;background:var(--azul2)}\
.db .nota .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease);color:transparent}\
.db .nota:hover .ft img{transform:scale(1.07)}\
.db .nota .ft.aviso{display:grid;place-items:center;background:linear-gradient(135deg,var(--verm),var(--verm-esc));color:var(--verm-ink)}\
.db .nota .ft.aviso b{font:800 54px/.9 var(--disp);letter-spacing:.02em;text-transform:uppercase}\
.db .nota .tx{padding:20px 22px 22px;display:flex;flex-direction:column;gap:10px;flex:1}\
.db .nota .q{font:800 15px/1 var(--disp);letter-spacing:.06em;color:var(--verm);text-transform:uppercase}\
.db .nota h3{font:800 26px/.98 var(--disp);text-transform:uppercase}\
.db .nota p{color:var(--suave);font-size:14.5px}\
.db .dupla{padding:110px 0 90px}\
.db .dupla .grade{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px}\
.db .dupla .grade.solo{grid-template-columns:1fr}\
.db .dupla .grade>*{min-width:0}\
.db .dupla h2.p{margin:0 0 22px;font:800 clamp(40px,4.6vw,64px)/.9 var(--disp);text-transform:uppercase;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.db .dupla h2.p .mais{font-size:13px}\
.db .tw{overflow-x:auto;border:1px solid var(--linha);border-radius:14px;background:#fff}\
.db table.esc{width:100%;border-collapse:collapse;min-width:340px;font-variant-numeric:tabular-nums}\
.db .esc th{font:700 11.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave);text-align:left;padding:14px;background:var(--papel);border-bottom:1px solid var(--linha)}\
.db .esc td{padding:12px 14px;border-bottom:1px solid var(--linha);font:700 21px/1 var(--disp);text-transform:uppercase}\
.db .esc tr:last-child td{border-bottom:0}\
.db .esc tbody tr:nth-child(even) td{background:#FAFBFD}\
.db .esc td.n{color:var(--suave);font-size:18px;width:44px}\
.db .esc td.g{font:600 14px/1 var(--corpo);color:var(--suave);text-transform:none;white-space:nowrap}\
.db .fx{display:inline-block;width:46px;height:14px;border-radius:3px;vertical-align:middle;margin-right:12px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);position:relative;overflow:hidden}\
.db .fx::after{content:"";position:absolute;right:0;top:0;bottom:0;width:30%;background:var(--ponta,transparent)}\
.db .esc tbody tr:hover td{background:rgba(var(--azul-tri),.05)}\
.db .agenda{display:grid;grid-template-columns:1fr 1fr;gap:18px}\
.db .evt{display:grid;grid-template-columns:62px 1fr;background:#fff;border:1px solid var(--linha);border-radius:14px;overflow:hidden;transition:transform .5s var(--ease),box-shadow .5s var(--ease),border-color .4s}\
.db .evt:hover{transform:translateY(-5px);box-shadow:0 24px 40px -24px rgba(10,15,30,.35);border-color:transparent}\
.db .evt .dt{background:var(--verm);color:var(--verm-ink)}\
.db .evt .dt b{font-size:34px}\
.db .evt .cnt{min-width:0;padding:18px 18px 18px 20px;display:flex;flex-direction:column;gap:8px}\
.db .evt h3{font:800 clamp(24px,2.3vw,30px)/.95 var(--disp);text-transform:uppercase}\
.db .evt .lc{font:700 14px/1.2 var(--disp);letter-spacing:.06em;text-transform:uppercase;color:var(--suave)}\
.db .evt .tp{align-self:flex-start;font:700 11px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;padding:5px 8px;border-radius:4px;background:rgba(var(--azul-tri),.08);color:var(--azul)}\
.db .ag-vazia{background:#fff;border:1px dashed var(--linha);border-radius:14px;padding:28px;display:grid;gap:14px;justify-items:start}\
.db .ag-vazia p{color:var(--suave);max-width:46ch}\
.db .prog{position:relative;background:var(--tinta);color:#fff;padding:130px 0 0;overflow:hidden;isolation:isolate}\
.db .prog>img{position:absolute;right:0;top:0;width:58%;height:100%;object-fit:cover;z-index:-1;-webkit-mask-image:linear-gradient(90deg,transparent,#000 45%);mask-image:linear-gradient(90deg,transparent,#000 45%);opacity:.55;filter:saturate(.8);color:transparent}\
.db .prog::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--tinta) 30%,rgba(10,15,30,.3)),linear-gradient(0deg,rgba(var(--verm-tri),.25),transparent 60%)}\
.db .prog .tit .k{color:rgba(255,255,255,.7)}\
.db .prog .tit h2{font-size:clamp(52px,8vw,118px);max-width:760px}\
.db .prog p.lead{max-width:520px;color:rgba(255,255,255,.78);font-size:18px;margin:22px 0 30px}\
.db .prog .acoes{display:flex;gap:14px;flex-wrap:wrap}\
.db .trio{position:relative;z-index:3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;margin-top:80px}\
.db .pc{position:relative;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:16px;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);text-align:center;overflow:hidden;transition:transform .6s var(--ease)}\
.db .pc:hover{transform:translateY(-10px)}\
.db .pc .topo-ic{height:150px;display:grid;place-items:center}\
.db .pc .topo-ic svg{width:86px;height:86px;stroke:var(--verm);fill:none;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;transition:transform .7s var(--ease)}\
.db .pc:hover .topo-ic svg{transform:scale(1.1) rotate(-6deg)}\
.db .pc .base{background:var(--papel);color:var(--texto);padding:34px 24px 30px;display:flex;flex-direction:column;align-items:center;gap:12px;height:calc(100% - 150px)}\
.db .pc .base .han{font-size:15px;color:var(--verm)}\
.db .pc h3{font:800 34px/.92 var(--disp);text-transform:uppercase}\
.db .pc p{color:var(--suave);font-size:15px;max-width:30ch}\
.db .pc .mais{margin-top:auto}\
.db .prog-fundo{position:absolute;left:0;right:0;bottom:0;height:200px;background:var(--papel);z-index:1}\
.db .prog-fundo .quebra{top:-62px;bottom:auto}\
.db .horas{padding:100px 0 110px}\
.db .acord{border:1px solid var(--texto);border-radius:14px;overflow:hidden;background:#fff}\
.db .acord details{border-bottom:1px solid var(--texto)}\
.db .acord details:last-child{border-bottom:0}\
.db .acord summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 24px;cursor:pointer;font:800 clamp(24px,2.6vw,32px)/1 var(--disp);text-transform:uppercase;transition:background .3s,color .3s}\
.db .acord summary::-webkit-details-marker{display:none}\
.db .acord summary:hover{background:var(--papel)}\
.db .acord summary .cnt-a{font:600 13px/1 var(--corpo);color:var(--suave);text-transform:none;letter-spacing:0;margin-left:auto}\
.db .acord summary .mx{width:22px;height:22px;position:relative;flex:none}\
.db .acord summary .mx::before,.db .acord summary .mx::after{content:"";position:absolute;left:0;right:0;top:50%;height:2.5px;margin-top:-1.25px;background:currentColor;transition:transform .5s var(--ease)}\
.db .acord summary .mx::after{transform:rotate(90deg)}\
.db .acord details[open] summary .mx::after{transform:rotate(0)}\
.db .acord details[open] summary{color:var(--verm)}\
.db .aula{display:grid;grid-template-columns:44px auto 1fr auto;align-items:center;gap:18px;margin:0 24px;padding:14px 0;border-top:1px solid var(--linha)}\
.db .aula .ico{width:42px;height:42px;border-radius:50%;border:2px dashed var(--texto);display:grid;place-items:center;font:400 15px/1 var(--han)}\
.db .aula .ico svg{width:18px;height:18px}\
.db .aula .lc{display:block;font:600 12.5px/1 var(--corpo);color:var(--suave);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}\
.db .aula .hr{font:800 28px/1 var(--disp);color:var(--verm);font-variant-numeric:tabular-nums;white-space:nowrap}\
.db .aula .nm{font:700 26px/1 var(--disp);text-transform:uppercase;padding-left:18px;border-left:2px solid var(--texto);min-width:0}\
.db .aula .pb{font:700 11px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase;padding:6px 9px;border-radius:4px;background:var(--papel);color:var(--suave);white-space:nowrap}\
.db .acord details[open] .aula{animation:db-abre .6s var(--ease) both}\
.db .acord .nota-h{padding:14px 24px;color:var(--suave);font-size:14px;border-top:1px solid var(--texto);background:var(--papel)}\
@keyframes db-abre{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}\
.db .sobre{display:grid;grid-template-columns:1fr 1fr;background:#fff;min-height:620px}\
.db .sobre .foto{position:relative;overflow:hidden;color:#fff;display:flex;align-items:center;background:var(--azul)}\
.db .sobre .foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 30%;color:transparent}\
.db .sobre .foto::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(var(--azul-tri),.35),rgba(var(--azul-tri),.92)),linear-gradient(90deg,rgba(var(--verm-tri),.35),transparent 60%)}\
.db .sobre .foto .gwae{z-index:1;opacity:.14}\
.db .sobre .foto .tit{position:relative;z-index:2;margin-left:max(20px,calc((100vw - 1180px)/2));margin-right:30px}\
.db .sobre .foto .tit::before{background:#fff}\
.db .sobre .foto .tit .k{color:rgba(255,255,255,.85)}\
.db .sobre .foto .tit .k .han{color:#fff}\
.db .sobre .foto .tit h2{font-size:clamp(52px,6.2vw,96px)}\
.db .sobre .txt{position:relative;padding:90px max(20px,calc((100vw - 1180px)/2)) 90px 70px;display:flex;flex-direction:column;justify-content:center;overflow:hidden}\
.db .sobre .marca-d{position:absolute;right:-60px;top:50%;transform:translateY(-50%);width:440px;height:440px;opacity:.05;pointer-events:none;border-radius:50%;display:grid;place-items:center;background:var(--azul);color:#fff;font:900 180px/1 var(--disp);overflow:hidden}\
.db .sobre .marca-d img{width:100%;height:100%;object-fit:cover}\
.db .sobre .lead{font:italic 500 clamp(21px,2vw,26px)/1.45 var(--corpo);margin:0 0 22px;max-width:30ch;position:relative}\
.db .sobre .lead b{font-weight:800;color:var(--azul)}\
.db .sobre p.tx{color:var(--suave);max-width:52ch;margin:0 0 30px;position:relative}\
.db .sobre .ass{position:relative}\
.db .sobre .ass b{display:block;font:800 20px/1.1 var(--corpo)}\
.db .sobre .ass small{color:var(--suave)}\
.db .sobre .ass .rub{display:block;font:400 54px/1 "Mrs Saint Delafield",cursive;color:var(--verm);margin-top:6px;transform:rotate(-4deg);transform-origin:left}\
.db .princ{display:grid;grid-template-columns:1fr 1fr;background:#fff}\
.db .princ .lista{padding:80px 60px 80px max(20px,calc((100vw - 1180px)/2))}\
.db .princ .lista h2{margin:0 0 10px;font:800 clamp(38px,4vw,56px)/.9 var(--disp);text-transform:uppercase}\
.db .princ .lista>p{color:var(--suave);margin:0 0 26px;max-width:46ch}\
.db .tenet{display:grid;grid-template-columns:76px 1fr;gap:20px;align-items:center;padding:18px 0;border-top:1px solid var(--linha)}\
.db .tenet .hn{width:76px;height:76px;border-radius:14px;display:grid;place-items:center;text-align:center;background:rgba(var(--verm-tri),.08);color:var(--verm);font:400 23px/1.05 var(--han);transition:transform .6s var(--ease),background .4s,color .4s}\
.db .tenet .hn.lat{font:800 30px/1 var(--disp)}\
.db .tenet .hn.longo{font-size:16px}\
.db .tenet:hover .hn{background:var(--verm);color:var(--verm-ink);transform:rotate(-6deg)}\
.db .tenet b{display:block;font:800 26px/1 var(--disp);text-transform:uppercase}\
.db .tenet small{color:var(--suave);font-size:14.5px}\
.db .tenet em{font-style:normal;color:var(--azul);font-weight:700}\
.db .dep{position:relative;overflow:hidden;display:flex;align-items:center;color:#fff;min-height:560px;background:var(--azul)}\
.db .dep img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;color:transparent}\
.db .dep::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,15,30,.75),rgba(10,15,30,.25)),linear-gradient(0deg,rgba(var(--verm-tri),.45),transparent 55%)}\
.db .dep blockquote{position:relative;z-index:2;margin:0 40px 0 70px;padding-left:24px;border-left:4px solid #fff;max-width:520px}\
.db .dep blockquote::before{content:"\\201D";display:block;font:900 90px/.6 var(--disp);margin-bottom:6px}\
.db .dep blockquote p{margin:0 0 16px;font:800 clamp(30px,3vw,42px)/.98 var(--disp);text-transform:uppercase}\
.db .dep cite{font-style:normal;font-weight:600;opacity:.85}\
.db .equipe{padding:100px 0 90px;background:var(--papel)}\
.db .cards3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}\
.db .pessoa{background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.db .pessoa:hover{transform:translateY(-8px);box-shadow:0 30px 50px -28px rgba(10,15,30,.45)}\
.db .pessoa .ft{position:relative;aspect-ratio:4/5;overflow:hidden;background:var(--azul)}\
.db .pessoa .ft img{width:100%;height:100%;object-fit:cover;object-position:50% 25%;transition:transform 1s var(--ease);color:transparent}\
.db .pessoa:hover .ft img{transform:scale(1.05)}\
.db .pessoa .ft .ini{position:absolute;inset:0;display:grid;place-items:center;font:900 96px/1 var(--disp);color:rgba(255,255,255,.85)}\
.db .pessoa .ft .et{position:absolute;left:14px;top:14px;padding:6px 10px;border-radius:4px;background:var(--verm);color:var(--verm-ink);font:800 13px/1 var(--disp);letter-spacing:.08em;text-transform:uppercase}\
.db .pessoa .tx{padding:20px 22px 24px;display:flex;flex-direction:column;gap:8px}\
.db .pessoa .tx .k{color:var(--verm);font-size:11.5px}\
.db .pessoa h3{font:800 28px/.95 var(--disp);text-transform:uppercase}\
.db .pessoa p{color:var(--suave);font-size:14.5px}\
.db .conq{padding:110px 0 100px;background:#fff}\
.db .trilho{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(240px,1fr);gap:26px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 4px 24px;scrollbar-width:none}\
.db .trilho::-webkit-scrollbar{display:none}\
.db .tro{scroll-snap-align:start;text-align:center;padding:30px 18px 26px;border-radius:16px;transition:background .5s var(--ease)}\
.db .tro:hover{background:var(--papel)}\
.db .tro svg{width:150px;height:190px;margin:0 auto 18px;transition:transform .8s var(--ease)}\
.db .tro:hover svg{transform:translateY(-10px) rotate(-3deg)}\
.db .tro b{display:block;font:800 26px/1 var(--disp);text-transform:uppercase;margin-bottom:8px}\
.db .tro span{color:var(--suave);font-variant-numeric:tabular-nums}\
.db .setas{display:flex;gap:10px}\
.db .setas button{width:48px;height:48px;border-radius:50%;border:2px solid var(--texto);background:transparent;color:var(--texto);display:grid;place-items:center;transition:background .3s,color .3s,transform .4s var(--ease)}\
.db .setas button:hover{background:var(--texto);color:#fff;transform:scale(1.06)}\
.db .setas svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.5}\
.db .video{position:relative;color:#fff;background:var(--tinta);overflow:hidden;isolation:isolate}\
.db .video .alto{position:relative;min-height:540px;display:flex;align-items:flex-end;padding-bottom:70px}\
.db .video .alto>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 35%;z-index:-1;color:transparent}\
.db .video .alto::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,var(--tinta) 0%,rgba(10,15,30,.35) 55%,rgba(var(--azul-tri),.35)),linear-gradient(90deg,rgba(var(--verm-tri),.4),transparent 50%)}\
.db .video .tit::before{background:#fff}\
.db .video .tit .k{color:rgba(255,255,255,.8)}\
.db .video .tit .k .han{color:#fff}\
.db .play{display:inline-flex;align-items:center;gap:14px;margin-top:26px;font:800 15px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase}\
.db .play i{width:66px;height:66px;border-radius:50%;background:var(--verm);display:grid;place-items:center;position:relative}\
.db .play i::before{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid rgba(var(--verm-tri),.6);animation:db-pulsa 2.2s var(--ease) infinite}\
.db .play i svg{width:20px;height:20px;fill:#fff;margin-left:4px}\
@keyframes db-pulsa{from{transform:scale(.85);opacity:1}to{transform:scale(1.35);opacity:0}}\
.db .galeria{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:10px 0 150px}\
.db .galeria.curta{padding-bottom:110px}\
.db .vd{display:flex;flex-direction:column;gap:12px}\
.db .vd .ft{position:relative;aspect-ratio:16/10;border-radius:12px;overflow:hidden;background:var(--tinta2)}\
.db .vd .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease),filter .6s;color:transparent}\
.db .vd:hover .ft img{transform:scale(1.07);filter:brightness(.8)}\
.db .vd .ft::after{content:"";position:absolute;left:12px;bottom:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.92) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M7 5l8 5-8 5z\' fill=\'%230A0F1E\'/%3E%3C/svg%3E") center/16px no-repeat}\
.db .vd small{font:700 11.5px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.6)}\
.db .vd b{font:800 22px/1 var(--disp);text-transform:uppercase}\
.db .app{position:relative;padding:110px 0;background:var(--papel)}\
.db .app.depois-video{padding-top:20px}\
.db .app .grade{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:60px;align-items:center}\
.db .app .tit h2{font-size:clamp(46px,6vw,84px)}\
.db .app p.lead{color:var(--suave);font-size:18px;max-width:46ch;margin:22px 0 26px}\
.db .recursos{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;margin:0 0 30px;padding:0;list-style:none}\
.db .recursos li{display:flex;gap:12px;align-items:flex-start;font-weight:600}\
.db .recursos li::before{content:"";flex:none;width:20px;height:20px;margin-top:2px;border-radius:5px;background:var(--verm) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M5 10.5l3.2 3L15 7\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/14px no-repeat}\
.db .cel-w{position:relative;display:grid;place-items:center}\
.db .cel-w::before{content:"";position:absolute;width:86%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(var(--azul-tri),.18),transparent 65%)}\
.db .cel{position:relative;width:300px;max-width:100%;aspect-ratio:9/18.5;border-radius:42px;background:#0b0f1c;padding:12px;box-shadow:0 50px 80px -40px rgba(10,15,30,.6),inset 0 0 0 2px #2a3352;transform:rotate(-4deg);transition:transform 1s var(--ease)}\
.db .cel:hover{transform:rotate(0) translateY(-8px)}\
.db .tela{height:100%;border-radius:32px;overflow:hidden;background:linear-gradient(180deg,var(--azul) 0%,var(--azul-esc) 46%,#f3f5f9 46%);color:#fff;padding:22px 16px;display:flex;flex-direction:column;gap:12px;font-size:12px}\
.db .tela .tp{display:flex;align-items:center;gap:10px}\
.db .tela .av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font:800 16px/1 var(--disp);overflow:hidden}\
.db .tela .av img{width:100%;height:100%;object-fit:cover}\
.db .tela .tp b{font:800 17px/1 var(--disp);letter-spacing:.04em;display:block}\
.db .tela .tp small{opacity:.7;font-size:10.5px}\
.db .termo{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:12px}\
.db .termo .lb{display:flex;justify-content:space-between;font:700 10px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:9px}\
.db .termo .bar{height:12px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden}\
.db .termo .bar i{display:block;height:100%;width:72%;border-radius:99px;background:linear-gradient(90deg,var(--c1,#1C64C2),var(--c2,var(--verm)));transition:width 2s var(--ease)}\
.db .termo .bar.zero i{width:0}\
.db .termo .px{display:flex;justify-content:space-between;margin-top:9px;font:800 14px/1 var(--disp);letter-spacing:.04em;text-transform:uppercase;gap:8px}\
.db .mini{background:#fff;color:var(--texto);border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 20px -14px rgba(0,0,0,.4)}\
.db .mini i{width:30px;height:30px;border-radius:8px;flex:none;display:grid;place-items:center;font:800 14px/1 var(--disp);font-style:normal;color:var(--verm-ink);background:var(--verm)}\
.db .mini i.az{background:var(--azul);color:#fff}\
.db .mini b{display:block;font:800 14px/1.05 var(--disp);text-transform:uppercase}\
.db .mini small{color:var(--suave);font-size:10.5px}\
.db .loja{padding:100px 0 120px;background:var(--rosado)}\
.db .lj-lead{color:var(--suave);max-width:52ch;margin:-20px 0 34px}\
.db .prods{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:26px}\
.db .prod{text-align:center;display:flex;flex-direction:column;align-items:center}\
.db .prod .lj-ph{width:100%;aspect-ratio:1;display:grid;place-items:center;border-radius:16px;margin-bottom:18px;overflow:hidden;background:radial-gradient(circle at 50% 60%,#fff,rgba(255,255,255,0) 70%);transition:transform .7s var(--ease)}\
.db .prod .lj-ph img{width:100%;height:100%;object-fit:cover;border-radius:16px;color:transparent}\
.db .prod .lj-svg{display:block;width:78%}\
.db .prod .lj-svg svg{display:block;width:100%;height:auto;filter:drop-shadow(0 22px 22px rgba(10,15,30,.18))}\
.db .prod:hover .lj-ph{transform:translateY(-10px)}\
.db .prod h3{font:800 25px/1 var(--disp);text-transform:uppercase}\
.db .prod p{color:var(--suave);font-size:14px;margin-top:6px;max-width:30ch}\
.db .prod .pr{display:block;margin-top:8px;font:800 28px/1 var(--disp)}\
.db .prod .btn{margin-top:14px;padding:11px 16px;font-size:12px}\
.db .nucleos{padding:100px 0 110px;background:#fff}\
.db .nucs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}\
.db .nuc{border:1px solid var(--linha);border-radius:16px;padding:26px 24px;display:flex;flex-direction:column;gap:12px;transition:border-color .4s,box-shadow .6s var(--ease),transform .6s var(--ease)}\
.db .nuc:hover{border-color:transparent;box-shadow:0 30px 50px -30px rgba(10,15,30,.4);transform:translateY(-6px)}\
.db .nuc .k{color:var(--verm)}\
.db .nuc h3{font:800 32px/.95 var(--disp);text-transform:uppercase}\
.db .nuc p{color:var(--suave);font-size:15px}\
.db .nuc .btn{margin-top:auto;align-self:flex-start;padding:12px 16px;font-size:12.5px}\
.db .redes{position:relative;background:var(--verm);color:var(--verm-ink);padding:100px 0 110px;overflow:hidden;isolation:isolate}\
.db .redes>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;opacity:.22;mix-blend-mode:multiply;filter:grayscale(1);color:transparent}\
.db .redes .gwae{z-index:-1;opacity:.14}\
.db .redes .grade{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:40px;align-items:center}\
.db .redes .tit::before{background:currentColor}\
.db .redes .tit .k{color:inherit;opacity:.85}\
.db .redes .tit .k .han{color:inherit}\
.db .redes .tit h2 em{color:var(--tinta)}\
.db .socs{display:grid;grid-template-columns:1fr 1fr;gap:34px 30px}\
.db .soc{display:flex;flex-direction:column;gap:6px;min-width:0}\
.db .soc .num{display:flex;align-items:flex-end;gap:4px;font:800 clamp(56px,6vw,84px)/1 var(--disp)}\
.db .soc .num .odo{font-size:1em}\
.db .soc .num .suf{font-size:.5em;line-height:1.5}\
.db .soc .num.arroba{font-size:clamp(34px,3.6vw,52px);overflow-wrap:anywhere}\
.db .soc a{font:700 13px/1 var(--corpo);letter-spacing:.16em;text-transform:uppercase;display:flex;align-items:center;gap:8px}\
.db .soc a:hover{text-decoration:underline}\
.db .rod{background:#05070F;color:#fff;padding:70px 0 34px}\
.db .parc{display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap;padding-bottom:50px;border-bottom:1px solid rgba(255,255,255,.12)}\
.db .parc a,.db .parc span{font:800 26px/1 var(--disp);letter-spacing:.06em;text-transform:uppercase;opacity:.5;transition:opacity .4s}\
.db .parc a:hover{opacity:1}\
.db .parc img{max-height:54px;max-width:160px;width:auto;object-fit:contain;filter:grayscale(1) brightness(1.6)}\
.db .cols{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.2fr 1.3fr;gap:30px;padding:50px 0}\
.db .cols>div{min-width:0}\
.db .cols .lema{display:flex;align-items:center;gap:16px}\
.db .cols .lema .selo{width:84px;height:84px;flex:none;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--azul);border:2px solid #fff;font:800 30px/1 var(--disp)}\
.db .cols .lema .selo img{width:100%;height:100%;object-fit:cover}\
.db .cols .lema b{font:800 26px/.92 var(--disp);text-transform:uppercase;padding-left:16px;border-left:3px solid #fff;min-width:0}\
.db .cols .lema b em{font-style:normal;color:var(--verm-claro);display:block}\
.db .cols h4{margin:0 0 16px;font:800 20px/1 var(--disp);letter-spacing:.06em;text-transform:uppercase}\
.db .cols ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}\
.db .cols li a{color:rgba(255,255,255,.72);transition:color .3s}\
.db .cols li a:hover{color:#fff}\
.db .cont li{display:flex;gap:10px;color:rgba(255,255,255,.72);overflow-wrap:anywhere}\
.db .cont svg{width:16px;height:16px;flex:none;margin-top:4px;fill:var(--verm-claro)}\
.db .insta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\
.db .insta img{aspect-ratio:1;object-fit:cover;border-radius:6px;transition:transform .5s var(--ease),filter .4s;color:transparent;background:var(--tinta2)}\
.db .insta a:hover img{transform:scale(1.05);filter:brightness(1.1)}\
.db .cop{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;padding-top:24px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.55);font-size:14px}\
.db .cop a{color:#fff;font-weight:700}\
@media (max-width:1280px){.db .menu,.db .topo .barra>.btn{display:none}\
.db .topo.aberto .menu .so-m{display:block}\
.db .ham{display:grid}\
.db .topo.aberto .menu{display:flex;position:absolute;top:calc(100% + 8px);left:20px;right:20px;flex-direction:column;gap:0;background:var(--tinta);border-radius:14px;padding:10px 20px;box-shadow:0 30px 50px -20px rgba(0,0,0,.6)}\
.db .topo.aberto .menu a{color:#fff;padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px}}\
@media (max-width:1100px){.db .cards4{grid-template-columns:repeat(min(var(--n,4),2),minmax(0,1fr))}\
.db .dupla .grade{grid-template-columns:1fr}\
.db .cols{grid-template-columns:1fr 1fr 1fr}\
.db .cols>div:first-child{grid-column:1/-1}\
.db .galeria{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (max-width:900px){.db .placar{grid-template-columns:1fr}\
.db .trio{grid-template-columns:1fr;max-width:460px;margin-inline:auto}\
.db .prog-fundo{height:120px}\
.db .prog>img{width:100%;opacity:.3}\
.db .sobre,.db .princ{grid-template-columns:1fr}\
.db .sobre .foto{min-height:420px}\
.db .sobre .txt{padding:60px 20px}\
.db .princ .lista{padding:60px 20px}\
.db .dep{min-height:440px}\
.db .dep blockquote{margin:0 20px}\
.db .app .grade,.db .redes .grade{grid-template-columns:1fr}\
.db .agenda{grid-template-columns:1fr}}\
@media (max-width:620px){.db .topo{top:10px}\
.db .marca .selo{width:42px;height:42px}\
.db .marca b{font-size:19px}\
.db .slide .ct{padding:110px 0 170px;align-items:flex-start}\
.db .h-txt{padding-left:20px}\
.db .h-txt::before{width:6px}\
.db .marcad{bottom:150px}\
.db .pontos{flex-direction:row;top:auto;bottom:118px;transform:none;right:16px}\
.db .placar{margin-top:-80px}\
.db .res{grid-template-columns:62px 1fr}\
.db .res .cnt{padding:16px}\
.db .odo{font-size:34px}\
.db .cards4{grid-template-columns:1fr}\
.db .mural{padding:100px 0 120px}\
.db .aula{grid-template-columns:auto 1fr;gap:6px 14px;margin:0 16px}\
.db .aula .ico{display:none}\
.db .aula .nm{grid-column:1/-1;padding-left:0;border-left:0;font-size:23px}\
.db .aula .pb{grid-row:1;grid-column:2;justify-self:end}\
.db .acord summary{padding:14px 16px}\
.db .galeria{grid-template-columns:1fr 1fr;gap:14px}\
.db .vd b{font-size:18px}\
.db .recursos{grid-template-columns:1fr}\
.db .socs{gap:24px 16px}\
.db .cols{grid-template-columns:1fr 1fr}\
.db .prods{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}\
.db .prod h3{font-size:20px}}\
@media (prefers-reduced-motion:reduce){.db,.db *,.db *::before,.db *::after{animation:none!important;transition:none!important}\
.db .rv.fora{opacity:1;transform:none}}';

function css(t){
  return '\
.db{--azul:'+t.azul+';--azul2:'+t.azul2+';--azul-esc:'+t.azulEsc+';--azul-tri:'+t.azulTri+';--verm:'+t.verm+';--verm-esc:'+t.vermEsc+';--verm-claro:'+t.vermClaro+';--verm-ink:'+t.vermInk+';--verm-tri:'+t.vermTri+';\
 --tinta:#0a0f1e;--tinta2:#121a31;--papel:#f3f5f9;--linha:#dce1ea;--texto:#1b2233;--suave:#5d6679;--rosado:'+t.rosado+';--gwae:'+GWAE+';\
 --ease:cubic-bezier(.16,1,.3,1);--disp:"Saira Extra Condensed","Arial Narrow",Impact,sans-serif;--corpo:"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif;--han:"Black Han Sans","Noto Sans KR","Malgun Gothic",sans-serif;\
 --ct:min(1180px,calc(100% - 40px));\
 position:relative;background:var(--papel);color:var(--texto);font:400 16px/1.6 var(--corpo);-webkit-font-smoothing:antialiased;overflow-x:clip;display:flow-root}\
@media (max-width:620px){.db{--ct:calc(100% - 32px)}}\
' + CSS_BASE;
}

export function render(s, h){
  var esc = h.esc, url = h.url;
  var modReal = String(h.modalidade || s.modalidade || '').toLowerCase();
  var tkd = modReal === 'taekwondo';
  var chave = tkd ? 'taekwondo' : 'arena';
  var V = (h.VOCAB && (h.VOCAB[modReal] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && h.LIDER[modReal]) || 'Professor';
  var t = cores(s);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('db-fonts')){
    var l = document.createElement('link'); l.id = 'db-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Saira+Extra+Condensed:wght@600;700;800;900&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&family=Mrs+Saint+Delafield&display=swap';
    document.head.appendChild(l);
    var l2 = document.createElement('link'); l2.rel = 'stylesheet';
    l2.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&text=%EA%B0%84%EA%B2%A8%EA%B2%BD%EA%B5%B4%EA%B6%8C%EA%B7%B9%EA%B8%B0%EB%82%B4%EB%8F%84%EB%A3%A8%EB%A6%AC%EB%A6%B0%EB%B0%B1%EB%B3%B5%EB%B6%88%EC%83%88%EC%8A%B9%EC%8B%9C%EC%95%B1%EC%96%B4%EC%97%BC%EC%98%88%EC%9D%98%EC%9D%B4%EC%9D%B8%EC%9E%A5%EC%A0%88%EC%B2%AD%EC%B9%98%ED%83%9C%ED%91%9C%ED%92%88%ED%99%8D&display=swap';
    document.head.appendChild(l2);
  }
  var st = document.getElementById('db-css');
  if(!st){ st = document.createElement('style'); st.id = 'db-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function han(k){ return tkd && HAN[k] ? '<span class="han" lang="ko">'+HAN[k]+'</span>' : ''; }
  function titulo(sec, padT, padD){ var a = cx(sec, 'titulo', padT), d = cx(sec, 'destaque', padD || ''); return esc(a) + (d ? ' <em>'+esc(d)+'</em>' : ''); }
  function estrela(txt){ var p = String(txt || '').split('*'); return p.map(function(x, i){ return i % 2 ? '<em>'+esc(x)+'</em>' : esc(x); }).join(''); }
  function img(src, alt, extra){ var u = url(src); return u ? '<img src="'+esc(u)+'" alt="'+esc(alt || '')+'" loading="lazy" decoding="async"'+(extra || '')+'>' : ''; }
  function mais(href, txt, extra){ return '<a class="mais'+(extra || '')+'" href="'+esc(href)+'"><span class="ic">'+SETA+'</span>'+esc(txt)+'</a>'; }

  var R = function(rota){ return '/'+encodeURIComponent(s.slug)+'/'+rota; };
  var ins = R('inscricao'), login = R('login');
  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var todas = treino.concat(fachada, equipeF);
  var foto = function(i){ return todas.length ? todas[i % todas.length] : ''; };
  var logo = url(s.logo), ini = iniciais(s.nomeCurto || s.nome);
  var selo = function(){ return logo ? '<img src="'+esc(logo)+'" alt="">' : esc(ini); };
  var hoje = hojeLocal();

  var zap = digitos(cx('contato', 'whatsapp', '')); if(!/^\d{10,13}$/.test(zap)) zap = '';
  var zapHref = zap ? 'https://wa.me/'+(zap.length <= 11 ? '55' : '')+zap+'?text='+encodeURIComponent(cx('contato', 'msgWhatsapp', 'Olá! Quero agendar uma aula experimental na '+s.nomeCurto+'.')) : '';
  var ctaHref = zapHref || ins, ctaAlvo = zapHref ? ' target="_blank" rel="noopener noreferrer"' : '';

  // Agenda e avisos do app (agendaPublica) — já vêm sanitizados de site-escola.js; revalidados aqui.
  var doApp = (Array.isArray(s.agenda) ? s.agenda : []).filter(function(a){ return a && typeof a.titulo === 'string' && a.titulo.trim(); });
  var evApp = doApp.filter(function(a){ return a.tipo === 'evento' && /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') && a.data >= hoje; })
    .sort(function(a, b){ return a.data.localeCompare(b.data); });
  var avisos = doApp.filter(function(a){ return a.tipo === 'aviso'; }).sort(function(a, b){ return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); });
  function dataCurta(d){ return /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d.slice(8, 10) + ' ' + MES_CURTO[+d.slice(5, 7) - 1] : ''; }

  /* ---------- placar ---------- */
  var res = lista('resultados', 'itens', 2).filter(function(x){ return cs(x, 'evento'); });
  var placar = '';
  if(res.length){
    placar = '<div class="ct placar" style="--n:'+res.length+'">'+res.map(function(x){
      var m = +digitos(cs(x, 'mes')) || 0;
      var n = [digitos(cs(x, 'ouro')).slice(0, 3) || '0', digitos(cs(x, 'prata')).slice(0, 3) || '0', digitos(cs(x, 'bronze')).slice(0, 3) || '0'];
      return '<article class="res rv"><div class="dt"><b>'+esc(digitos(cs(x, 'dia')).slice(0, 2) || '–')+'</b><span>'+esc(m ? MES_CURTO[m - 1] : '')+'</span></div><div class="cnt"><div class="ev"><b>'+esc(cs(x, 'evento'))+'</b>'+(cs(x, 'local') ? '<small>'+esc(cs(x, 'local'))+'</small>' : '')+'</div>'
        + '<div class="medalhas" role="img" aria-label="'+esc(n[0]+' ouros, '+n[1]+' pratas, '+n[2]+' bronzes')+'"><div class="med"><i class="o"></i><span class="odo" data-n="'+n[0]+'">'+n[0]+'</span></div><div class="med"><i class="p"></i><span class="odo" data-n="'+n[1]+'">'+n[1]+'</span></div><div class="med"><i class="b"></i><span class="odo" data-n="'+n[2]+'">'+n[2]+'</span></div></div></div></article>';
    }).join('')+'</div>';
  }

  /* ---------- topo: destaques (painel → app → padrão) ---------- */
  var slides = [];
  lista('topo', 'slides', 3).forEach(function(x, i){ if(cs(x, 'titulo')) slides.push({ k:cs(x, 'selo'), h:esc(cs(x, 'titulo')), p:'', foto:url(cs(x, 'foto')) || foto(i + 1), bt:[[url(cs(x, 'link')) || ctaHref, 'Saiba mais', !!url(cs(x, 'link'))]], app:false }); });
  var tp = TOPO[chave];
  slides.unshift({ k:s.nomeCurto + (s.cidade ? ' · ' + s.cidade : ''), h:estrela(cx('topo', 'titulo', tp[0])), p:cx('topo', 'texto', tp[1]), foto:url(cx('topo', 'foto', '')) || fachada[0] || foto(0), bt:[[ctaHref, cx('topo', 'botao', 'Agendar aula experimental'), !!zapHref], ['#db-horarios', 'Horários', false]], app:false });
  if(evApp[0]) slides.push({ k:'Próximo evento · ' + dataCurta(evApp[0].data), h:esc(evApp[0].titulo), p:[evApp[0].local, evApp[0].hora].filter(Boolean).join(' · '), foto:foto(2), bt:[['#db-agenda', 'Ver na agenda', false]], app:true });
  if(avisos[0]) slides.push({ k:'Aviso', h:esc(avisos[0].titulo), p:avisos[0].texto || '', foto:foto(4), bt:[['#db-mural', 'Ver o mural', false]], app:true });
  slides = slides.slice(0, 4);
  var temH = lista('horarios', 'itens', 30).some(function(x){ return cs(x, 'aula') && cs(x, 'dia'); });
  var hero = '<section class="hero" id="db-inicio" aria-roledescription="carrossel" aria-label="Destaques">'
    + slides.map(function(x, i){
      return '<div class="slide'+(i ? '' : ' ativo')+'"'+(i ? ' aria-hidden="true"' : '')+'>'+(x.foto ? '<img src="'+esc(x.foto)+'" alt=""'+(i ? ' loading="lazy"' : '')+'>' : '')+'<div class="gwae"></div>'
        + '<div class="ct"><div class="h-txt"><div class="k"><span>'+esc(x.k)+'</span>'+(x.app ? '<span class="app-tag cl">Publicado no app</span>' : '')+'</div>'
        + (i ? '<h2 class="h1" style="margin:16px 0 28px;font:800 clamp(48px,7.4vw,108px)/.86 var(--disp);text-transform:uppercase;text-wrap:balance">'+x.h+'</h2>' : '<h1>'+x.h+'</h1>')
        + (x.p ? '<p>'+esc(x.p)+'</p>' : '')
        + '<div class="acoes">'+x.bt.filter(function(b){ return b[0] && (b[0] !== '#db-horarios' || temH); }).map(function(b, j){ return '<a class="btn '+(j ? 'btn-c' : 'btn-v')+'" href="'+esc(b[0])+'"'+(b[2] ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+esc(b[1])+'</a>'; }).join('')+'</div></div></div></div>';
    }).join('')
    + (tkd ? '<div class="marcad" aria-hidden="true" lang="ko">'+HAN.marca+'</div>' : '<div class="marcad lat" aria-hidden="true">'+esc(V.nomeMod)+'</div>')
    + (slides.length > 1 ? '<div class="pontos" role="tablist" aria-label="Escolher destaque">'+slides.map(function(x, i){ return '<button type="button" role="tab" aria-label="Destaque '+(i + 1)+'" aria-current="'+(i ? 'false' : 'true')+'"></button>'; }).join('')+'</div>' : '')
    + '</section>';

  /* ---------- mural (avisos do app) ---------- */
  var mural = '';
  if(avisos.length){
    mural = '<section class="mural'+(placar ? '' : ' sem-placar')+'" id="db-mural">'+(foto(5) ? '<img src="'+esc(foto(5))+'" alt="" aria-hidden="true" loading="lazy">' : '')+'<div class="gwae"></div><div class="ct">'
      + '<div class="cab"><div class="tit rv"><div class="k">'+han('mural')+esc(cx('mural', 'selo', 'Direto do '+V.local))+' <span class="app-tag cl">Sincronizado com o app</span></div><h2>'+esc(cx('mural', 'titulo', 'Mural de avisos'))+'</h2></div></div>'
      + '<div class="cards4" style="--n:'+Math.min(avisos.length, 4)+'">'+avisos.slice(0, 4).map(function(a, i){
        var d = /^\d{4}-\d{2}-\d{2}/.test(a.criadoEm || '') ? a.criadoEm.slice(0, 10) : (a.data || '');
        var f = i % 2 ? '' : foto(6 + i);
        return '<article class="nota rv"><div class="ft'+(f ? '' : ' aviso')+'">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '<b>Aviso</b>')+'</div><div class="tx">'+(d ? '<span class="q">'+esc(dataCurta(d))+'</span>' : '')+'<h3>'+esc(a.titulo)+'</h3>'+(a.texto ? '<p>'+esc(String(a.texto).slice(0, 140))+'</p>' : '')+'</div></article>';
      }).join('')+'</div></div>'+quebra(0, 'var(--papel)', true)+'</section>';
  }

  /* ---------- graduação + agenda ---------- */
  var escada = (Array.isArray(s.escada3) && s.escada3.length ? s.escada3.map(function(b){ var c = Array.isArray(b.cor) ? b.cor : [b.cor]; return { nome:b.nome, cor:hex6(c[0]) || '#9aa7b4', ponta:(hex6(c[2]) && hex6(c[2]) !== hex6(c[0])) ? hex6(c[2]) : '' }; })
    : (Array.isArray(s.escada) ? s.escada.map(function(b){ return { nome:b && b.nome, cor:(b && /^#[0-9a-f]{3,6}$/i.test(String(b.cor || '')) ? String(b.cor) : '#9aa7b4'), ponta:'' }; }) : []))
    .filter(function(b){ return b.nome; }).slice(0, 16);
  var graus = lista('graduacao', 'itens', 16);
  var gradHTML = escada.length ? '<div id="db-graduacao" class="rv"><h2 class="p">'+esc(cx('graduacao', 'titulo', 'Graduação'))+mais(login, 'Meu termômetro')+'</h2><div class="tw"><table class="esc"><thead><tr><th>#</th><th>'+esc(s.peca ? String(s.peca).charAt(0).toUpperCase() + String(s.peca).slice(1) : 'Faixa')+'</th>'+(graus.some(function(g){ return cs(g, 'grau'); }) ? '<th>Grau</th>' : '')+'</tr></thead><tbody>'
    + escada.map(function(b, j){ var g = cs(graus[j], 'grau'); return '<tr><td class="n">'+(j + 1)+'</td><td><span class="fx" style="background:'+esc(b.cor)+(b.ponta ? ';--ponta:'+esc(b.ponta) : '')+'"></span>'+esc(b.nome)+'</td>'+(graus.some(function(x){ return cs(x, 'grau'); }) ? '<td class="g">'+esc(g)+'</td>' : '')+'</tr>'; }).join('')
    + '</tbody></table></div></div>' : '';
  var evts = evApp.slice(0, 6).map(function(a){ return { dia:a.data.slice(8, 10), mes:MES_CURTO[+a.data.slice(5, 7) - 1], tipo:'Evento', titulo:a.titulo, local:[a.local || a.nucleo, a.hora].filter(Boolean).join(' · ') }; });
  lista('agenda', 'itens', 6).forEach(function(x){ var m = +digitos(cs(x, 'mes')); if(cs(x, 'titulo')) evts.push({ dia:digitos(cs(x, 'dia')).slice(0, 2), mes:m ? MES_CURTO[m - 1] : '', tipo:cs(x, 'tipo'), titulo:cs(x, 'titulo'), local:cs(x, 'local') }); });
  evts = evts.slice(0, 6);
  var agHTML = '<div id="db-agenda" class="rv"><h2 class="p">'+esc(cx('agenda', 'titulo', 'Agenda'))+(evApp.length ? ' <span class="app-tag">Sincronizado com o app</span>' : '')+'</h2>'
    + (evts.length ? '<div class="agenda">'+evts.map(function(e){ return '<article class="evt"><div class="dt"><b>'+esc(e.dia || '–')+'</b><span>'+esc(e.mes)+'</span></div><div class="cnt">'+(e.tipo ? '<span class="tp">'+esc(e.tipo)+'</span>' : '')+'<h3>'+esc(e.titulo)+'</h3>'+(e.local ? '<span class="lc">'+esc(e.local)+'</span>' : '')+'</div></article>'; }).join('')+'</div>'
      : '<div class="ag-vazia"><p>Campeonatos, exames de faixa e eventos da '+esc(s.nomeCurto)+' aparecem aqui assim que forem publicados no app.</p><a class="btn btn-e" href="'+esc(R('campeonatos'))+'">Ver campeonatos</a></div>')+'</div>';
  var dupla = '<section class="dupla"><div class="ct grade'+(gradHTML ? '' : ' solo')+'">'+gradHTML+agHTML+'</div></section>';

  /* ---------- programas ---------- */
  var pp = PROG[chave];
  var pItens = lista('programas', 'itens', 3).filter(function(x){ return cs(x, 'titulo'); });
  var plist = pItens.length ? pItens.map(function(x, i){ return [cs(x, 'titulo'), cs(x, 'texto'), (pp.itens[i] || [])[2] || '']; }) : pp.itens;
  var progFoto = url(cx('programas', 'foto', '')) || foto(3);
  var programas = '<section class="prog" id="db-programas">'+(progFoto ? '<img src="'+esc(progFoto)+'" alt="" aria-hidden="true" loading="lazy">' : '')+'<div class="ct">'
    + '<div class="tit rv"><div class="k">'+han('prog')+esc(cx('programas', 'selo', pp.selo))+'</div><h2>'+titulo('programas', pp.titulo, pp.dest)+'</h2></div>'
    + '<p class="lead rv">'+esc(cx('programas', 'texto', pp.texto))+'</p><div class="acoes rv"><a class="btn btn-v" href="'+esc(ins)+'">Matricule-se</a>'+(temH ? '<a class="btn btn-c" href="#db-horarios">Ver horários</a>' : '')+'</div>'
    + '<div class="trio">'+plist.map(function(x, i){ return '<article class="pc rv"><div class="topo-ic">'+ICONES[i % 3]+'</div><div class="base">'+(tkd && x[2] ? '<span class="han" lang="ko">'+x[2]+'</span>' : '')+'<h3>'+esc(x[0])+'</h3>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+mais(temH ? '#db-horarios' : ins, temH ? 'Ver horários' : 'Inscrever-se')+'</div></article>'; }).join('')+'</div></div>'
    + '<div class="prog-fundo">'+quebra(1, 'var(--papel)', false).replace('quebra baixo', 'quebra')+'</div></section>';

  /* ---------- horários (acordeão) ---------- */
  var aulas = lista('horarios', 'itens', 30).filter(function(x){ return cs(x, 'aula') && cs(x, 'dia'); });
  var horarios = '';
  if(aulas.length){
    var porDia = DIAS.map(function(d){ return [d[1], aulas.filter(function(x){ return cs(x, 'dia') === d[0]; })]; }).filter(function(d){ return d[1].length; });
    horarios = '<section class="horas" id="db-horarios"><div class="ct"><div class="cab"><div class="tit rv"><div class="k">'+han('horas')+'Quadro semanal</div><h2>'+esc(cx('horarios', 'titulo', 'Horários'))+'</h2></div>'+mais(ctaHref, 'Agendar aula experimental')+'</div>'
      + '<div class="acord rv">'+porDia.map(function(d, i){
        return '<details'+(i ? '' : ' open')+'><summary>'+esc(d[0])+' <span class="cnt-a">'+d[1].length+(d[1].length === 1 ? ' aula' : ' aulas')+'</span><span class="mx" aria-hidden="true"></span></summary>'
          + d[1].map(function(x){ return '<div class="aula"><span class="ico" aria-hidden="true">'+(tkd ? '<span lang="ko">도</span>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>')+'</span><div>'+(cs(x, 'local') ? '<span class="lc">'+esc(cs(x, 'local'))+'</span>' : '')+'<span class="hr">'+esc(cs(x, 'horario'))+'</span></div><span class="nm">'+esc(cs(x, 'aula'))+'</span>'+(cs(x, 'publico') ? '<span class="pb">'+esc(cs(x, 'publico'))+'</span>' : '<span></span>')+'</div>'; }).join('')+'</details>';
      }).join('')+(cx('horarios', 'nota', '') ? '<div class="nota-h">'+esc(cx('horarios', 'nota', ''))+'</div>' : '')+'</div></div></section>';
  }

  /* ---------- sobre ---------- */
  var sobreFoto = url(cx('sobre', 'foto', '')) || url(s.fotoLider) || equipeF[0] || foto(1);
  var lider = String(s.lider || (s.responsavel && s.responsavel.nome) || '').trim();
  var gradLider = (s.responsavel && s.responsavel.graduacao) || tituloLider;
  var sobre = '<section class="sobre" id="db-sobre"><div class="foto">'+(sobreFoto ? '<img src="'+esc(sobreFoto)+'" alt="'+esc(lider || s.nomeCurto)+'" loading="lazy">' : '')+'<div class="gwae"></div>'
    + '<div class="tit rv"><div class="k">'+han('sobre')+esc(cx('sobre', 'selo', 'Sobre o '+V.local))+'</div><h2>'+esc(cx('sobre', 'titulo', 'Disciplina que vira caráter'))+'</h2></div></div>'
    + '<div class="txt"><span class="marca-d" aria-hidden="true">'+selo()+'</span>'
    + '<p class="lead rv">'+(cx('sobre', 'lead', '') ? esc(cx('sobre', 'lead', '')) : 'A <b>'+esc(s.nome || s.nomeCurto)+'</b> forma atletas e cidadãos'+(s.cidade ? ' em '+esc(s.cidade) : '')+' — do primeiro treino à faixa preta.')+'</p>'
    + '<p class="tx rv">'+esc(cx('sobre', 'texto', 'Cada aluno tem a ficha, a frequência e o caminho até a próxima graduação no app, com o acompanhamento de perto da equipe de '+V.nomeMod+'.'))+'</p>'
    + (lider ? '<div class="ass rv"><b>'+esc(lider)+'</b><small>'+esc(gradLider)+'</small><span class="rub" aria-hidden="true">'+esc(lider.split(/\s+/).slice(0, 2).join(' '))+'</span></div>' : '')+'</div></section>';

  /* ---------- princípios + depoimento ---------- */
  var depo = cx('principios', 'depoimento', ''), depoFoto = url(cx('principios', 'foto', '')) || foto(7);
  var princ = '<section class="princ"><div class="lista"><h2 class="rv">'+esc(cx('principios', 'titulo', 'Os cinco princípios'))+'</h2><p class="rv">'+esc(cx('principios', 'texto', 'O que se aprende no tatame e se leva para casa, para a escola e para o trabalho.'))+'</p>'
    + TENETS[chave].map(function(x){ return '<div class="tenet rv"><span class="hn'+(tkd ? (x[0].length > 2 ? ' longo' : '') : ' lat')+'"'+(tkd ? ' lang="ko"' : '')+'>'+(tkd && x[0].length > 2 ? x[0].slice(0, 2)+'<br>'+x[0].slice(2) : x[0])+'</span><div><b>'+x[1]+'</b><small>'+(x[2] ? '<em>'+x[2]+'</em> · ' : '')+x[3]+'</small></div></div>'; }).join('')
    + '</div><div class="dep">'+(depoFoto ? '<img src="'+esc(depoFoto)+'" alt="" loading="lazy">' : '')+(depo ? '<blockquote class="rv"><p>'+esc(depo)+'</p>'+(cx('principios', 'autor', '') ? '<cite>'+esc(cx('principios', 'autor', ''))+'</cite>' : '')+'</blockquote>' : '')+'</div></section>';

  /* ---------- equipe ---------- */
  var pessoas = [];
  lista('equipe', 'itens', 6).forEach(function(m){ if(cs(m, 'nome')) pessoas.push({ nome:cs(m, 'nome'), grad:cs(m, 'graduacao'), bio:cs(m, 'bio'), foto:url(cs(m, 'foto')) }); });
  if(!pessoas.length && Array.isArray(s.equipe)) s.equipe.forEach(function(m){ if(m && m.nome) pessoas.push({ nome:String(m.nome), grad:String(m.graduacao || ''), bio:String(m.bio || ''), foto:url(m.foto) }); });
  if(!pessoas.length && lider) pessoas.push({ nome:lider, grad:gradLider, bio:'', foto:url(s.fotoLider) });
  var equipe = pessoas.length ? '<section class="equipe" id="db-equipe"><div class="ct"><div class="cab"><div class="tit rv"><div class="k">'+esc(cx('equipe', 'selo', 'Instrutores'))+'</div><h2>'+titulo('equipe', 'Quem treina', 'você')+'</h2></div></div><div class="cards3">'
    + pessoas.slice(0, 6).map(function(p, i){ return '<article class="pessoa rv"><div class="ft">'+(p.foto ? '<img src="'+esc(p.foto)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="ini">'+esc(iniciais(p.nome))+'</span>')+'<span class="et">'+esc(tituloLider)+'</span></div><div class="tx">'+(p.grad ? '<span class="k">'+esc(p.grad)+'</span>' : '')+'<h3>'+esc(p.nome)+'</h3>'+(p.bio ? '<p>'+esc(p.bio)+'</p>' : '')+'</div></article>'; }).join('')+'</div></div></section>' : '';

  /* ---------- conquistas ---------- */
  var conqs = lista('conquistas', 'itens', 10).filter(function(x){ return cs(x, 'titulo'); });
  var conquistas = conqs.length ? '<section class="conq" id="db-conquistas"><div class="ct"><div class="cab"><div class="tit rv"><div class="k">'+han('conq')+esc(cx('conquistas', 'selo', 'Tradição de pódio'))+'</div><h2>'+titulo('conquistas', 'Nossas', 'conquistas')+'</h2></div>'
    + (conqs.length > 3 ? '<div class="setas"><button type="button" data-tr="-1" aria-label="Anterior"><svg viewBox="0 0 16 16"><path d="M10 3L5 8l5 5"/></svg></button><button type="button" data-tr="1" aria-label="Próxima"><svg viewBox="0 0 16 16"><path d="M6 3l5 5-5 5"/></svg></button></div>' : '')+'</div>'
    + '<div class="trilho" tabindex="0" aria-label="Conquistas">'+conqs.map(function(x){ var tp = cs(x, 'tipo'); return '<div class="tro">'+trofeu(/^(ouro|prata|bronze|trofeu)$/.test(tp) ? tp : 'ouro')+'<b>'+esc(cs(x, 'titulo'))+'</b>'+(cs(x, 'detalhe') ? '<span>'+esc(cs(x, 'detalhe'))+'</span>' : '')+'</div>'; }).join('')+'</div></div></section>' : '';

  /* ---------- vídeos ---------- */
  var vLink = url(cx('videos', 'link', '')), vFoto = url(cx('videos', 'foto', ''));
  var vItens = lista('videos', 'itens', 4).filter(function(x){ return cs(x, 'titulo') && url(cs(x, 'link')); });
  var videos = '';
  if(vLink || vItens.length){
    videos = '<section class="video" id="db-videos">'+(vLink ? '<div class="alto">'+((vFoto || foto(8)) ? '<img src="'+esc(vFoto || foto(8))+'" alt="" loading="lazy">' : '')+'<div class="ct"><div class="tit rv"><div class="k">'+han('video')+esc(cx('videos', 'selo', 'Em vídeo'))+'</div><h2>'+esc(cx('videos', 'titulo', 'Assista à equipe em ação'))+'</h2></div>'
      + '<a class="play rv" href="'+esc(vLink)+'" target="_blank" rel="noopener noreferrer"><i><svg viewBox="0 0 20 20"><path d="M5 3l12 7-12 7z"/></svg></i>Assistir</a></div></div>' : '<div style="height:90px"></div>')
      + (vItens.length ? '<div class="ct galeria'+(vLink ? '' : ' curta')+'">'+vItens.map(function(x, i){ var f = url(cs(x, 'foto')) || foto(9 + i); return '<a class="vd rv" href="'+esc(url(cs(x, 'link')))+'" target="_blank" rel="noopener noreferrer"><div class="ft">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '')+'</div>'+(cs(x, 'categoria') ? '<small>'+esc(cs(x, 'categoria'))+'</small>' : '')+'<b>'+esc(cs(x, 'titulo'))+'</b></a>'; }).join('')+'</div>' : '<div style="height:110px"></div>')
      + quebra(2, 'var(--papel)', false)+'</section>';
  }

  /* ---------- app ---------- */
  var c1 = escada.length ? escada[Math.min(3, escada.length - 1)] : null, c2 = escada.length > 1 ? escada[Math.min(4, escada.length - 1)] : null;
  var proxEv = evApp[0];
  var appSec = '<section class="app'+(videos ? ' depois-video' : '')+'" id="db-app"><div class="ct grade"><div><div class="tit rv"><div class="k">'+han('app')+esc(cx('app', 'selo', 'Tudo no celular'))+'</div><h2>'+titulo('app', 'O '+V.local+' no seu', 'bolso')+'</h2></div>'
    + '<p class="lead rv">'+esc(cx('app', 'texto', 'Alunos e responsáveis acompanham a evolução, recebem os avisos na hora e pagam a mensalidade pelo app da '+s.nomeCurto+'.'))+'</p>'
    + '<ul class="recursos rv"><li>Termômetro até a próxima '+esc(s.peca || 'graduação')+'</li><li>Avisos e agenda em tempo real</li><li>Carteirinha digital</li><li>Mensalidade por PIX</li><li>Notas de cada avaliação</li><li>Inscrição em campeonatos</li></ul>'
    + '<a class="btn btn-e rv" href="'+esc(R('instalar'))+'">Instalar o app</a></div>'
    + '<div class="cel-w rv" aria-hidden="true"><div class="cel"><div class="tela"><div class="tp"><span class="av">'+selo()+'</span><div><b>ATLETA</b><small>'+esc(c1 ? c1.nome : 'Seu perfil')+'</small></div></div>'
    + '<div class="termo"><div class="lb"><span>Prontidão</span><span>72%</span></div><div class="bar" style="'+(c1 ? '--c1:'+esc(c1.cor)+';' : '')+(c2 ? '--c2:'+esc(c2.cor) : '')+'"><i></i></div><div class="px"><span>'+esc(c1 ? c1.nome : 'Atual')+'</span><span>→ '+esc(c2 ? c2.nome : 'Próxima')+'</span></div></div><div style="flex:1"></div>'
    + '<div class="mini"><i>'+esc(proxEv ? proxEv.data.slice(8, 10) : '✓')+'</i><div><b>'+esc(proxEv ? proxEv.titulo.slice(0, 26) : 'Check-in do treino')+'</b><small>'+esc(proxEv ? 'Agenda da equipe' : 'Presença registrada')+'</small></div></div>'
    + '<div class="mini"><i class="az">!</i><div><b>'+esc(avisos[0] ? avisos[0].titulo.slice(0, 26) : 'Novo aviso')+'</b><small>Mural do '+esc(V.local)+'</small></div></div>'
    + '<div class="mini"><i class="az">$</i><div><b>Mensalidade</b><small>Pague por PIX</small></div></div></div></div></div></div></section>';

  /* ---------- loja ---------- */
  var prods = produtosLoja(C, 8), loja = '';
  if(prods.length){
    var zapLoja = cx('loja', 'whatsapp', '') || zap;
    var coresLoja = { principal:t.azul, destaque:t.verm };
    loja = '<section class="loja" id="db-loja"><div class="ct"><div class="cab"><div class="tit rv"><div class="k">'+han('loja')+esc(cx('loja', 'selo', 'Vista a equipe'))+'</div><h2>'+titulo('loja', 'Loja', 'oficial')+'</h2></div></div>'
      + '<p class="lj-lead rv">'+esc(cx('loja', 'texto', 'Uniforme e equipamento escolhidos pela equipe para treinar com segurança.'))+'</p><div class="prods">'
      + prods.map(function(p){ var w = linkCompra(zapLoja, p), f = url(p.foto);
        return '<div class="prod rv"><div class="lj-ph">'+(f ? '<img src="'+esc(f)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="lj-svg" role="img" aria-label="'+esc(p.nome)+'">'+ilustracao(p.nome, coresLoja)+'</span>')+'</div><h3>'+esc(p.nome)+'</h3>'+(p.texto ? '<p>'+esc(p.texto)+'</p>' : '')+(p.preco ? '<span class="pr">'+esc(p.preco)+'</span>' : '')
          + (w ? '<a class="btn btn-e" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">Comprar</a>' : '')+'</div>'; }).join('')+'</div></div></section>';
  }

  /* ---------- onde treinar ---------- */
  var nucP = lista('nucleos', 'lista', 9).filter(function(x){ return cs(x, 'nome'); }).map(function(x){ var w = digitos(cs(x, 'whatsapp')); return { nome:cs(x, 'nome'), end:cs(x, 'endereco'), dias:cs(x, 'dias'), zap:/^\d{10,13}$/.test(w) ? w : '' }; });
  if(!nucP.length && Array.isArray(s.nucleosInfo)) s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucP.push({ nome:String(n.nome), end:[n.sede ? 'Sede' : '', n.cidade ? String(n.cidade) + (n.uf ? ' · ' + String(n.uf) : '') : ''].filter(Boolean).join(' — '), dias:'', zap:'' }); });
  var nucleos = '<section class="nucleos" id="db-nucleos"><div class="ct"><div class="cab"><div class="tit rv"><div class="k">'+han('nuc')+esc(cx('nucleos', 'selo', 'Aula experimental grátis'))+'</div><h2>'+titulo('nucleos', 'Onde', 'treinar')+'</h2></div></div>'
    + (nucP.length ? '<div class="nucs">'+nucP.map(function(n){ var w = n.zap ? 'https://wa.me/'+(n.zap.length <= 11 ? '55' : '')+n.zap+'?text='+encodeURIComponent('Olá! Quero agendar uma aula experimental no núcleo '+n.nome+'.') : ctaHref;
        return '<article class="nuc rv"><span class="k">Núcleo</span><h3>'+esc(n.nome)+'</h3>'+((n.end || n.dias) ? '<p>'+esc(n.end)+(n.end && n.dias ? '<br>' : '')+esc(n.dias)+'</p>' : '')+'<a class="btn btn-v" href="'+esc(w)+'"'+((n.zap || zapHref) ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+((n.zap || zapHref) ? ZAP.replace('<svg', '<svg width="16" height="16"')+' Chamar no WhatsApp' : 'Fazer inscrição')+'</a></article>'; }).join('')+'</div>'
      : '<div class="nucs"><article class="nuc rv"><span class="k">'+esc(s.cidade || '')+'</span><h3>'+esc(s.nomeCurto)+'</h3>'+(s.endereco ? '<p>'+esc(s.endereco)+'</p>' : '')+'<a class="btn btn-v" href="'+esc(ctaHref)+'"'+ctaAlvo+'>Aula experimental</a></article></div>')+'</div></section>';

  /* ---------- redes ---------- */
  var ig = String(s.instagram || '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);
  var redesL = [];
  if(ig) redesL.push(['Instagram', 'https://instagram.com/' + ig, digitos(cx('redes', 'instagram', '')).slice(0, 4), '@' + ig]);
  [['YouTube', 'youtube'], ['Facebook', 'facebook'], ['TikTok', 'tiktok']].forEach(function(r){ var u = url(cx('redes', r[1], '')); if(u) redesL.push([r[0], u, digitos(cx('redes', r[1] + 'N', '')).slice(0, 4), '']); });
  var redes = redesL.length ? '<section class="redes" id="db-redes">'+(foto(10) ? '<img src="'+esc(foto(10))+'" alt="" aria-hidden="true" loading="lazy">' : '')+'<div class="gwae"></div><div class="ct grade"><div class="tit rv"><div class="k">'+han('redes')+esc(cx('redes', 'selo', 'Siga a equipe'))+'</div><h2>'+titulo('redes', 'Acompanhe a', s.nomeCurto)+'</h2></div>'
    + '<div class="socs">'+redesL.map(function(r){ return '<div class="soc rv">'+(r[2] ? '<div class="num"><span class="odo" data-n="'+r[2]+'">'+r[2]+'</span><span class="suf">mil</span></div>' : '<div class="num arroba">'+esc(r[3] || r[0])+'</div>')+'<a href="'+esc(r[1])+'" target="_blank" rel="noopener noreferrer">'+esc(r[0])+' ↗</a></div>'; }).join('')+'</div></div></section>' : '';

  /* ---------- rodapé ---------- */
  var parcs = lista('contato', 'parceiros', 6).filter(function(p){ return cs(p, 'nome'); });
  var email = cx('contato', 'email', '').replace(/[^A-Za-z0-9._%+@-]/g, '');
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) email = '';
  var lema = cx('contato', 'lema', tkd ? 'Formamos *faixas pretas*' : 'Treine com *a gente*');
  var lemaP = lema.split('*');
  var instaFotos = treino.slice(0, 6);
  var navLinks = [avisos.length ? ['#db-mural', 'Mural'] : null, escada.length ? ['#db-graduacao', 'Graduação'] : null, ['#db-agenda', 'Agenda'], aulas.length ? ['#db-horarios', 'Horários'] : null, ['#db-sobre', esc(V.local.charAt(0).toUpperCase() + V.local.slice(1))], prods.length ? ['#db-loja', 'Loja'] : null, ['#db-nucleos', 'Contato']].filter(Boolean);
  var foot = '<footer class="rod"><div class="ct">'
    + (parcs.length ? '<div class="parc" aria-label="Parceiros">'+parcs.map(function(p){ var lg = url(cs(p, 'logo')), lk = url(cs(p, 'link')); var inner = lg ? '<img src="'+esc(lg)+'" alt="'+esc(cs(p, 'nome'))+'" loading="lazy">' : esc(cs(p, 'nome')); return lk ? '<a href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer">'+inner+'</a>' : '<span>'+inner+'</span>'; }).join('')+'</div>' : '')
    + '<div class="cols"><div><div class="lema"><span class="selo">'+selo()+'</span><b>'+esc(lemaP[0] || '')+(lemaP[1] ? '<em>'+esc(lemaP[1])+'</em>' : '')+'</b></div></div>'
    + '<div><h4>'+esc(V.local.charAt(0).toUpperCase() + V.local.slice(1))+'</h4><ul>'+navLinks.slice(0, 6).map(function(l){ return '<li><a href="'+l[0]+'">'+l[1]+'</a></li>'; }).join('')+'</ul></div>'
    + '<div><h4>Sistema</h4><ul><li><a href="'+esc(login)+'">Área do aluno</a></li><li><a href="'+esc(ins)+'">Inscrição</a></li><li><a href="'+esc(R('campeonatos'))+'">Campeonatos</a></li><li><a href="'+esc(R('instalar'))+'">Instalar o app</a></li></ul></div>'
    + '<div class="cont"><h4>Contato</h4><ul>'+(zap ? '<li>'+ZAP.replace('<svg', '<svg width="16" height="16"')+'<a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">'+esc(zap.length === 11 ? '('+zap.slice(0, 2)+') '+zap.slice(2, 7)+'-'+zap.slice(7) : zap)+'</a></li>' : '')
    + (email ? '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h20v14H2zM2 5l10 8 10-8"/></svg><a href="mailto:'+esc(email)+'">'+esc(email)+'</a></li>' : '')
    + ((s.endereco || s.cidade) ? '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z"/></svg>'+esc([s.endereco, [s.cidade, s.uf].filter(Boolean).join(' · ')].filter(Boolean).join(' — '))+'</li>' : '')+'</ul></div>'
    + '<div>'+(ig && instaFotos.length ? '<h4>No Instagram</h4><div class="insta">'+instaFotos.map(function(f){ return '<a href="https://instagram.com/'+esc(ig)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(f)+'" alt="" loading="lazy"></a>'; }).join('')+'</div>' : '')+'</div></div>'
    + '<div class="cop"><span>© '+new Date().getFullYear()+' '+esc(s.nome || s.nomeCurto)+'</span><span>Site e app por <a href="https://atletapay.com.br" target="_blank" rel="noopener">AtletaPay</a></span></div></div></footer>';

  var nav = '<header class="topo" id="db-topo"><div class="barra"><a class="marca" href="#db-inicio" aria-label="'+esc(s.nomeCurto)+' — início"><span class="selo">'+selo()+'</span><span><b>'+esc(s.nomeCurto)+'</b><small>'+esc(V.nomeMod)+'</small></span></a>'
    + '<nav class="menu" id="db-menu" aria-label="Seções">'+navLinks.map(function(l){ return '<a href="'+l[0]+'">'+l[1]+'</a>'; }).join('')+'<a class="so-m" href="#db-programas">Programas</a><a class="so-m" href="'+esc(login)+'">Área do aluno</a></nav>'
    + '<a class="btn btn-v" href="'+esc(ctaHref)+'"'+ctaAlvo+'>Aula experimental</a>'
    + '<button class="ham" id="db-ham" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="db-menu"><span></span></button></div></header>';

  site.className = 'db';
  site.innerHTML = nav + '<main>' + hero + placar + mural + dupla + programas + horarios + sobre + princ + equipe + conquistas + videos + appSec + loja + nucleos + redes + '</main>' + foot;
  wire(site);
}

/* ---------------- comportamento (ligado uma vez por elemento #site) ---------------- */
function wire(site){
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(site._db){ site._db.parar(); }
  var estado = { timers:[], obs:[] };
  estado.parar = function(){ estado.timers.forEach(clearInterval); estado.obs.forEach(function(o){ o.disconnect(); }); };
  site._db = estado;

  var topo = site.querySelector('#db-topo'), ham = site.querySelector('#db-ham');
  if(!site._dbRolagem){
    site._dbRolagem = true;
    window.addEventListener('scroll', function(){ var tp = site.querySelector('#db-topo'); if(tp) tp.classList.toggle('fixo', window.scrollY > 120); }, { passive:true });
  }
  if(topo) topo.classList.toggle('fixo', window.scrollY > 120);
  if(ham) ham.addEventListener('click', function(){ var a = topo.classList.toggle('aberto'); ham.setAttribute('aria-expanded', a ? 'true' : 'false'); });
  var menu = site.querySelector('#db-menu');
  if(menu) menu.addEventListener('click', function(e){ if(e.target.closest('a')){ topo.classList.remove('aberto'); ham.setAttribute('aria-expanded', 'false'); } });

  // destaques do topo
  var slides = [].slice.call(site.querySelectorAll('.slide')), pts = [].slice.call(site.querySelectorAll('.pontos button')), atual = 0;
  function vai(i){ atual = (i + slides.length) % slides.length; slides.forEach(function(sl, k){ sl.classList.toggle('ativo', k === atual); if(k === atual) sl.removeAttribute('aria-hidden'); else sl.setAttribute('aria-hidden', 'true'); }); pts.forEach(function(p, k){ p.setAttribute('aria-current', k === atual ? 'true' : 'false'); }); }
  function auto(){ estado.timers.forEach(clearInterval); estado.timers = []; if(!reduz && slides.length > 1) estado.timers.push(setInterval(function(){ vai(atual + 1); }, 6500)); }
  pts.forEach(function(p, k){ p.addEventListener('click', function(){ vai(k); auto(); }); });
  auto();

  // odômetros: o número final já está no HTML; com JS vira coluna de dígitos que rola ao entrar na tela
  var odos = [].slice.call(site.querySelectorAll('.odo'));
  odos.forEach(function(el){
    var n = String(el.getAttribute('data-n') || '0').replace(/\D/g, '') || '0'; el.textContent = '';
    n.split('').forEach(function(d){ var sp = document.createElement('span'), b = document.createElement('b'); for(var i = 0; i <= 9; i++){ var x = document.createElement('i'); x.textContent = i; b.appendChild(x); } b.style.transform = 'translateY(-' + (+d * 10) + '%)'; b.setAttribute('data-d', d); sp.appendChild(b); el.appendChild(sp); });
  });

  var tr = site.querySelector('.trilho');
  [].forEach.call(site.querySelectorAll('[data-tr]'), function(b){ b.addEventListener('click', function(){ var c = tr && tr.querySelector('.tro'); if(tr) tr.scrollBy({ left:(+b.getAttribute('data-tr')) * (c ? c.getBoundingClientRect().width + 26 : 300), behavior:reduz ? 'auto' : 'smooth' }); }); });

  if(!('IntersectionObserver' in window) || reduz) return;
  var alto = window.innerHeight;
  var rv = [].slice.call(site.querySelectorAll('.rv'));
  rv.forEach(function(el){ if(el.getBoundingClientRect().top > alto) el.classList.add('fora'); });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove('fora'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -8% 0px' });
  rv.forEach(function(el){ io.observe(el); }); estado.obs.push(io);
  odos.forEach(function(el){ if(el.getBoundingClientRect().top > alto) [].forEach.call(el.querySelectorAll('b'), function(b){ b.style.transition = 'none'; b.style.transform = 'translateY(0)'; }); });
  var io2 = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ [].forEach.call(e.target.querySelectorAll('b'), function(b, i){ b.style.transition = ''; b.style.transitionDelay = (i * .12) + 's'; b.style.transform = 'translateY(-' + (+b.getAttribute('data-d') * 10) + '%)'; }); io2.unobserve(e.target); } }); }, { threshold:.4 });
  odos.forEach(function(el){ io2.observe(el); }); estado.obs.push(io2);
  var barra = site.querySelector('.termo .bar');
  if(barra && barra.getBoundingClientRect().top > alto){ barra.classList.add('zero'); var io3 = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ barra.classList.remove('zero'); io3.disconnect(); } }, { threshold:.5 }); io3.observe(barra); estado.obs.push(io3); }
}
