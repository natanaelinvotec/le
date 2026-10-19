/* site-tpl-guarda.js — Template "Guarda" do site público por escola (pré-build #7, Jiu-jitsu).
 *
 * Estrutura inspirada no demo de basquete do campo.bold-themes (D1_BasketClub); implementação 100% original.
 * Identidade: fundo claro, tinta quase preta (derivada da cor principal), acento = cor de botão/destaque da escola
 * (padrão roxo, a cor da faixa roxa), Oswald + Plus Jakarta Sans, botões em pílula e a "ponta de faixa com graus"
 * como assinatura antes de cada título.
 *
 * Seções: topo com destaques (painel → agenda/avisos do APP) · cartões de luta (só se a escola lançar) · mural (app)
 * · agenda (app + painel) + graduação com faixas e graus · programas (4 cartões com foto) · onde treinar (núcleos +
 * mapa) + horários em abas por dia · depoimento sobre foto · sobre + pilares · números (painel ou contagem real) +
 * foto em arco · equipe em abas (professores / competição) · atleta do mês (só se preenchido) · app · loja · rodapé.
 *
 * Regra da biblioteca: nada inventado. Tudo do painel passa por esc(); links e fotos por url().
 */
import { SECAO_LOJA, produtosLoja, ilustracao, linkCompra } from './site-loja.js';

export var meta = {
  nome: 'Guarda',
  descricao: 'Clube claro com faixas e graus: destaques e mural do app, cartões de luta, graduação com faixas desenhadas, horários por dia, equipe em abas, atleta do mês e loja.',
  modalidades: ['jiujitsu', 'todas']
};

var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var TIT = { c:'titulo', r:'Título', max:50 };
var DEST = { c:'destaque', r:'Parte final do título (na cor de destaque)', max:24 };
var DIAS = [['seg', 'Segunda', 'Seg'], ['ter', 'Terça', 'Ter'], ['qua', 'Quarta', 'Qua'], ['qui', 'Quinta', 'Qui'], ['sex', 'Sexta', 'Sex'], ['sab', 'Sábado', 'Sáb'], ['dom', 'Domingo', 'Dom']];
var MESES = [['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']];
var MEDALHAS = [['ouro', 'Ouro'], ['prata', 'Prata'], ['bronze', 'Bronze']];
var PESSOA = [ { c:'nome', r:'Nome', max:60 }, { c:'faixa', r:'Faixa (ex.: Preta, Roxa)', max:20 }, { c:'graduacao', r:'Linha de baixo (ex.: 3º grau · Fundador)', max:50 }, { c:'foto', r:'Foto', t:'foto' } ];

export var schema = { secoes: [
  { id:'topo', r:'Topo', ajuda:'Os destaques do topo saem sozinhos do app: o próximo evento e o último aviso marcados com "Mostrar no site". Aqui você define o destaque principal e pode fixar até 3 outros.', campos:[
    { c:'titulo', r:'Título (palavra entre *asteriscos* fica vazada)', max:50, ph:'O tatame é para *todos*' }, { c:'texto', r:'Texto', t:'area', max:180 },
    { c:'botao', r:'Botão principal', max:28, ph:'Agendar aula experimental' }, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'slides', r:'Destaques fixos', t:'lista', max:3, resumo:'titulo', nomeItem:'Destaque', item:[ { c:'selo', r:'Etiqueta', max:30 }, { c:'titulo', r:'Título', max:50 }, { c:'foto', r:'Foto', t:'foto' }, { c:'link', r:'Link do botão (https://…)', t:'link', max:200 } ] } ] },
  { id:'lutas', r:'Resultados de luta', ajuda:'Até 2 resultados em destaque logo abaixo do topo. Sem itens, os cartões não aparecem.', campos:[
    { c:'itens', r:'Resultados', t:'lista', max:2, resumo:'atleta', nomeItem:'Resultado', item:[ { c:'dia', r:'Dia', max:2, ph:'30' }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' },
      { c:'atleta', r:'Atleta', max:40 }, { c:'faixa', r:'Faixa', max:20, ph:'Roxa' }, { c:'categoria', r:'Categoria', max:40, ph:'Adulto · Leve' },
      { c:'medalha', r:'Medalha', t:'select', opcoes:MEDALHAS, ph:'Medalha' }, { c:'evento', r:'Campeonato', max:40 }, { c:'detalhe', r:'Detalhe', max:80, ph:'4 lutas · final por triângulo' } ] } ] },
  { id:'mural', r:'Mural de avisos', ajuda:'Os avisos publicados no app com "Mostrar no site" entram aqui sozinhos. Sem avisos, a seção não aparece.', campos:[ SELO, TIT ] },
  { id:'agenda', r:'Agenda', ajuda:'Eventos do app com "Mostrar no site" entram sozinhos. Use a lista só para eventos que não estão no app.', campos:[ TIT,
    { c:'itens', r:'Eventos extras', t:'lista', max:6, resumo:'titulo', nomeItem:'Evento', item:[ { c:'dia', r:'Dia', max:2 }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' }, { c:'titulo', r:'Evento', max:50 }, { c:'local', r:'Local · horário', max:60 } ] } ] },
  { id:'graduacao', r:'Graduação', ajuda:'As faixas e cores vêm da escada cadastrada. Aqui você informa quantos graus cada faixa tem (na mesma ordem).', campos:[ TIT,
    { c:'itens', r:'Graus por faixa (na ordem da escada)', t:'lista', max:16, resumo:'graus', nomeItem:'Faixa', item:[ { c:'graus', r:'Quantos graus', max:2, ph:'4' } ] } ] },
  { id:'programas', r:'Programas', ajuda:'Até 4 programas em cartões com foto. Sem foto aqui, entram as fotos de treino do cadastro.', campos:[ SELO, TIT, DEST, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'itens', r:'Programas', t:'lista', max:4, resumo:'titulo', nomeItem:'Programa', item:[ { c:'titulo', r:'Nome', max:30 }, { c:'texto', r:'Descrição', t:'area', max:120 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'onde', r:'Onde treinar', ajuda:'Núcleos com endereço e WhatsApp. Lista vazia = núcleos do cadastro. O mapa usa a localização do cadastro.', campos:[ SELO, TIT, DEST,
    { c:'lista', r:'Núcleos', t:'lista', max:6, resumo:'nome', nomeItem:'Núcleo', item:[ { c:'nome', r:'Nome', max:40 }, { c:'endereco', r:'Endereço', max:100 }, { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 } ] } ] },
  { id:'horarios', r:'Horários', ajuda:'Aulas da semana em abas por dia. Sem aulas, a seção não aparece.', campos:[ TIT,
    { c:'itens', r:'Aulas', t:'lista', max:30, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS.map(function(d){ return [d[0], d[1]]; }), ph:'Dia da semana' },
      { c:'horario', r:'Horário', max:20, ph:'19:30' }, { c:'aula', r:'Aula', max:40, ph:'Avançado · competição' }, { c:'local', r:'Núcleo · duração', max:50 }, { c:'publico', r:'Público', max:24, ph:'Todas as faixas' } ] } ] },
  { id:'depoimento', r:'Depoimento', ajuda:'Frase grande sobre a foto. Sem frase, a faixa mostra só as fotos.', campos:[ { c:'texto', r:'Depoimento', t:'area', max:160 }, { c:'autor', r:'Quem disse', max:60 }, { c:'foto1', r:'Foto da esquerda', t:'foto' }, { c:'foto2', r:'Foto do depoimento', t:'foto' } ] },
  { id:'sobre', r:'Sobre', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:300 }, { c:'video', r:'Link de vídeo (https://…)', t:'link', max:200 }, { c:'foto', r:'Capa do vídeo', t:'foto' },
    { c:'pilares', r:'Pilares', t:'lista', max:4, resumo:'titulo', nomeItem:'Pilar', item:[ { c:'titulo', r:'Título', max:30 }, { c:'texto', r:'Texto', t:'area', max:100 } ] } ] },
  { id:'numeros', r:'Números', ajuda:'Até 4 números. Vazio = os números reais do cadastro (faixas na escada, núcleos, professores).', campos:[ SELO, TIT, DEST, { c:'foto', r:'Foto do arco', t:'foto' },
    { c:'itens', r:'Números', t:'lista', max:4, resumo:'valor', nomeItem:'Número', item:[ { c:'valor', r:'Valor', max:6, ph:'48' }, { c:'rotulo', r:'Rótulo', max:28, ph:'Medalhas em 2026' } ] } ] },
  { id:'equipe', r:'Equipe', ajuda:'Professores (lista vazia = equipe do cadastro) e, opcional, a equipe de competição — vira uma segunda aba.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Professores', t:'lista', max:6, resumo:'nome', nomeItem:'Professor', item:PESSOA },
    { c:'competicao', r:'Equipe de competição', t:'lista', max:9, resumo:'nome', nomeItem:'Atleta', item:PESSOA } ] },
  { id:'atleta', r:'Atleta do mês', ajuda:'Só aparece com nome e foto. Barras e números da temporada são opcionais.', campos:[
    { c:'nome', r:'Nome', max:40 }, { c:'selo', r:'Etiqueta vertical', max:24, ph:'Atleta do mês' }, { c:'texto', r:'Linha de baixo', max:80, ph:'Roxa · Adulto · Leve' }, { c:'foto', r:'Foto', t:'foto' },
    { c:'barras', r:'Barras (até 3)', t:'lista', max:3, resumo:'rotulo', nomeItem:'Barra', item:[ { c:'rotulo', r:'Rótulo', max:24, ph:'Finalizações' }, { c:'valor', r:'Porcentagem (0–100)', max:3, ph:'67' } ] },
    { c:'ano', r:'Temporada', max:4, ph:'2026' }, { c:'lutas', r:'Lutas', max:4 }, { c:'vitorias', r:'Vitórias', max:4 }, { c:'finalizacoes', r:'Finalizações', max:4 } ] },
  { id:'app', r:'App', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  SECAO_LOJA([ SELO, { c:'titulo', r:'Título', max:30, ph:'Loja' }, { c:'destaque', r:'Parte final do título', max:20, ph:'oficial' } ]),
  { id:'contato', r:'Contato e rodapé', ajuda:'Endereço e Instagram vêm do cadastro. Com WhatsApp, "Aula experimental" abre a conversa.', campos:[
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 }, { c:'msgWhatsapp', r:'Mensagem pronta', max:140 }, { c:'email', r:'E-mail', max:80 }, { c:'lema', r:'Lema do rodapé (*palavras* na cor de destaque)', max:40, ph:'Técnica antes *de força*' },
    { c:'youtube', r:'YouTube (https://…)', t:'link', max:200 },
    { c:'parceiros', r:'Parceiros', t:'lista', max:6, resumo:'nome', nomeItem:'Parceiro', item:[ { c:'nome', r:'Nome', max:30 }, { c:'logo', r:'Logo', t:'foto', png:true }, { c:'link', r:'Site (https://…)', t:'link', max:120 } ] } ] }
] };

/* ---------------- textos padrão (genéricos) ---------------- */
var TOPO = { jiujitsu:'O tatame é para *todos*', arena:'Treine com quem *vive isso*' };
var TOPO_TX = { jiujitsu:'Jiu-jitsu com kimono e sem kimono, para crianças e adultos — com a graduação acompanhada pelo app.', arena:'Técnica, disciplina e acompanhamento de cada aluno pelo app — do primeiro dia à próxima graduação.' };
var PROG = {
  jiujitsu: { titulo:'Um programa para', dest:'cada corpo', itens:[['Jiu-jitsu com kimono', 'Fundamentos, pegadas e a base de cada graduação.'], ['No-gi', 'Ritmo, wrestling e finalizações sem pegada no pano.'], ['Kids', 'Coordenação, confiança e respeito, com graus por etapa.'], ['Feminino', 'Turma só de mulheres, do básico à competição.']] },
  arena: { titulo:'Um programa para', dest:'cada fase', itens:[['Iniciantes', 'Fundamentos e confiança para começar do jeito certo.'], ['Avançado', 'Técnica refinada e preparo para competir.'], ['Kids', 'Coordenação, foco e respeito em aulas lúdicas.'], ['Condicionamento', 'Força, fôlego e mobilidade para o treino render.']] }
};
var PILARES = {
  jiujitsu: [['Defesa pessoal', 'Controle e alavanca, não tamanho.'], ['Finalizações', 'Triângulo, chave e estrangulamento com segurança.'], ['Graduação clara', 'Graus e faixas com critérios no app.'], ['Comunidade', 'Open mat, eventos e uma equipe que puxa junto.']],
  arena: [['Defesa pessoal', 'Confiança para se proteger no dia a dia.'], ['Técnica', 'Aula estruturada por etapas, do básico ao avançado.'], ['Graduação clara', 'Critérios e evolução acompanhados no app.'], ['Comunidade', 'Eventos e uma equipe que puxa junto.']]
};
var SOBRE = { jiujitsu:['Técnica antes de força,', 'sempre'], arena:['Técnica, respeito e', 'evolução'] };
// cores de faixa por nome (quando o nome não bate com a escada da escola)
var FAIXA = { branca:'#f4f4f2', cinza:'#9aa3ad', amarela:'#f2c524', laranja:'#ef7d1a', verde:'#2f9e44', azul:'#1c64c2', roxa:'#6f42c1', marrom:'#6b3e1e', preta:'#141414', coral:'#c62828', vermelha:'#c62828', bordo:'#7b1c2c' };

/* ---------------- utilitários ---------------- */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null; }
function rgb(h){ return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function tri(h){ return rgb(h).join(','); }
function lum(h){ var c = rgb(h).map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function mix(a, b, p){ var x = rgb(a), y = rgb(b); return '#' + x.map(function(v, i){ var r = Math.round(v + (y[i] - v) * p); return (r < 16 ? '0' : '') + r.toString(16); }).join(''); }
function cores(s){
  var c = s.cores || {};
  var pri = hex6(c.principal) || '#16161b', acc = hex6(c.botao) || hex6(c.destaque) || '#6d28d9';
  var tinta = lum(pri) < .03 ? pri : mix(pri, '#0b0b10', .78);          // seções escuras: a principal bem escura
  if(lum(acc) > .8) acc = lum(pri) > .03 ? pri : '#6d28d9';                 // acento quase branco não aparece no claro
  var t = { tinta:tinta, acc:acc };
  t.tinta2 = mix(tinta, '#ffffff', .07); t.carvao = mix(tinta, '#ffffff', .13);
  t.accTxt = lum(acc) > .32 ? mix(acc, '#000000', .42) : acc;              // texto na cor de destaque sobre o branco
  t.accClaro = mix(acc, '#ffffff', .86);
  t.accLuz = lum(acc) < .2 ? mix(acc, '#ffffff', .62) : acc;               // destaque sobre fundo escuro
  t.accInk = lum(acc) > .45 ? '#111116' : '#ffffff';
  t.accTri = tri(acc);
  return t;
}
function iniciais(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
function digitos(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
function hojeLocal(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function semAcento(v){ return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
var MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
var SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var ICO = {
  insta:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 5a5 5 0 100 10 5 5 0 000-10zm6-1.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM12 9a3 3 0 110 6 3 3 0 010-6z"/></svg>',
  yt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 00-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 001 7.2 31 31 0 00.5 12a31 31 0 00.5 4.8 3 3 0 002.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 002.1-2.1 31 31 0 00.5-4.8 31 31 0 00-.5-4.8zM9.8 15.1V8.9l5.7 3.1z"/></svg>',
  aviso:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l6 4V5L8 9z"/><path d="M18 8a5 5 0 010 8"/></svg>'
};
var PILAR_ICO = [
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6l20 8v16c0 14-9 24-20 28C21 54 12 44 12 30V14z"/><path d="M24 32l6 6 12-12"/></svg>',
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10 56 52H8z"/><path d="M32 26 44 46H20z"/></svg>',
  '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="22" width="48" height="20" rx="3"/><path d="M40 22v20M46 22v20M50 22v20"/></svg>',
  '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="22" cy="22" r="8"/><circle cx="42" cy="22" r="8"/><path d="M8 52c0-10 6-16 14-16s14 6 14 16M28 52c0-10 6-16 14-16s14 6 14 16"/></svg>'
];
var STAT_ICO = [
  '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="15" width="32" height="10" rx="2"/><path d="M26 15v10M30 15v10"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4c-7 0-12 5-12 12 0 9 12 20 12 20s12-11 12-20c0-7-5-12-12-12z"/><circle cx="20" cy="16" r="4"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="14" r="7"/><path d="M6 36c0-8 6-13 14-13s14 5 14 13"/></svg>',
  '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 6h16v8a8 8 0 01-16 0z"/><path d="M12 9H6c0 5 3 8 6 8M28 9h6c0 5-3 8-6 8M20 22v8M13 34h14"/></svg>'
];
function mapaDesenho(n){
  var pins = [[138, 92], [250, 140], [318, 62], [80, 170], [190, 60], [340, 190]].slice(0, Math.max(1, Math.min(n, 6)));
  return '<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="400" height="250" fill="#f7f7f9"/><g stroke="#e3e3ea" stroke-width="6" fill="none"><path d="M0 60h400M0 150h400M0 210h400M60 0v250M170 0v250M290 0v250"/><path d="M0 240 400 20" stroke-width="10"/></g><g stroke="#ececf2" stroke-width="2"><path d="M0 100h400M0 30h400M110 0v250M230 0v250M350 0v250"/></g><path d="M20 250c40-60 90-80 140-90s110-40 150-110" stroke="#cfe3f7" stroke-width="12" fill="none"/>'
    + pins.map(function(p){ return '<path d="M'+(p[0]-18)+' '+p[1]+'c0-10 8-18 18-18s18 8 18 18c0 14-18 30-18 30s-18-16-18-30z" style="fill:var(--acc)"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="6" fill="#fff"/>'; }).join('') + '</svg>';
}

var CSS_BASE = '.gu,.gu *,.gu *::before,.gu *::after{box-sizing:border-box}\
.gu img{max-width:100%;display:block}\
.gu a{color:inherit;text-decoration:none}\
.gu button{font:inherit;cursor:pointer}\
.gu h1,.gu h2,.gu h3,.gu h4,.gu p,.gu blockquote{margin:0}\
.gu h1,.gu h2,.gu h3{overflow-wrap:break-word}\
.gu :focus-visible{outline:3px solid var(--acc);outline-offset:3px;border-radius:6px}\
.gu .ct{width:var(--ct);margin-inline:auto}\
.gu .k{font:700 12.5px/1 var(--corpo);letter-spacing:.16em;text-transform:uppercase}\
.gu .ponta{display:inline-flex;align-items:center;height:12px;width:58px;border-radius:2px;background:var(--cor,var(--acc));position:relative;overflow:hidden;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}\
.gu .ponta::after{content:"";position:absolute;right:6px;top:0;bottom:0;width:26px;background:var(--faixa-ponta) repeating-linear-gradient(90deg,transparent 0 3px,#fff 3px 5px,transparent 5px 7px) 4px 0/20px 100% no-repeat}\
.gu .tit{display:flex;flex-direction:column;gap:12px}\
.gu .tit .k{display:flex;align-items:center;gap:12px;color:var(--suave)}\
.gu .tit h2{font:700 clamp(40px,5.6vw,80px)/.95 var(--disp);text-transform:uppercase;letter-spacing:-.005em;text-wrap:balance}\
.gu .tit h2 em{font-style:normal;color:var(--acc-txt)}\
.gu .cab{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:36px}\
.gu .link{display:inline-flex;align-items:center;gap:8px;font:700 13px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase;padding:10px 0;border-bottom:2px solid transparent;transition:border-color .4s,gap .4s var(--ease)}\
.gu .link svg{width:16px;height:16px;stroke:var(--acc)}\
.gu .link:hover{border-color:var(--acc-txt);gap:12px}\
.gu .app-tag{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:rgba(0,230,118,.14);color:#0b7a45;font:700 10.5px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase}\
.gu .app-tag::before{content:"";width:7px;height:7px;border-radius:50%;background:#00E676;box-shadow:0 0 0 3px rgba(0,230,118,.25)}\
.gu .btn{display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:99px;font:700 14px/1 var(--corpo);letter-spacing:.04em;text-transform:uppercase;border:2px solid transparent;transition:transform .5s var(--ease),box-shadow .5s var(--ease),background .4s,color .4s}\
.gu .btn svg{width:18px;height:18px}\
.gu .btn-a{background:var(--acc);color:var(--acc-ink);box-shadow:0 14px 30px -12px rgba(var(--acc-tri),.75)}\
.gu .btn-a:hover{transform:translateY(-3px);box-shadow:0 20px 40px -14px rgba(var(--acc-tri),.9)}\
.gu .btn-c{border-color:currentColor}\
.gu .btn-c:hover{background:var(--texto);color:#fff;border-color:var(--texto)}\
.gu .btn.esc{background:var(--tinta);color:#fff}\
.gu .btn.esc:hover{background:var(--acc)}\
.gu .rv{transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.gu .rv.fora{opacity:0;transform:translateY(30px)}\
.gu .topo{position:absolute;top:0;left:0;right:0;z-index:30;color:#fff;transition:background .5s var(--ease),color .4s,box-shadow .5s}\
.gu .topo .ct{display:flex;align-items:center;gap:28px;height:86px}\
.gu .marca{display:flex;align-items:center;gap:12px;flex:none}\
.gu .marca .selo{width:48px;height:48px}\
.gu .marca b{display:block;font:700 21px/1 var(--disp);text-transform:uppercase;letter-spacing:.02em}\
.gu .marca small{font:600 10.5px/1 var(--corpo);letter-spacing:.2em;text-transform:uppercase;opacity:.75}\
.gu .sep{width:1px;height:34px;background:currentColor;opacity:.25}\
.gu .menu{display:flex;gap:24px}\
.gu .menu a{font:600 13.5px/1 var(--corpo);letter-spacing:.06em;text-transform:uppercase;position:relative;padding:8px 0}\
.gu .menu a::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:2px;background:var(--acc);transform:scaleX(0);transform-origin:left;transition:transform .5s var(--ease)}\
.gu .menu a:hover::after,.gu .menu a.ativo::after{transform:scaleX(1)}\
.gu .dir{margin-left:auto;display:flex;align-items:center;gap:16px}\
.gu .soc-mini{display:flex;gap:14px}\
.gu .soc-mini a{opacity:.85}\
.gu .soc-mini svg{width:17px;height:17px;fill:currentColor}\
.gu .topo .btn{padding:12px 18px;font-size:12.5px}\
.gu .ham{display:none;width:44px;height:44px;border-radius:12px;border:1px solid currentColor;background:transparent;color:inherit;place-items:center}\
.gu .ham span,.gu .ham span::before,.gu .ham span::after{display:block;width:20px;height:2px;background:currentColor;position:relative;transition:transform .4s var(--ease),background .3s}\
.gu .ham span::before,.gu .ham span::after{content:"";position:absolute;left:0}\
.gu .ham span::before{top:-6px}\
.gu .ham span::after{top:6px}\
.gu .topo.aberto .ham span{background:transparent}\
.gu .topo.aberto .ham span::before{transform:translateY(6px) rotate(45deg)}\
.gu .topo.aberto .ham span::after{transform:translateY(-6px) rotate(-45deg)}\
.gu .topo.fixo{position:fixed;background:rgba(255,255,255,.95);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:var(--texto);box-shadow:0 10px 30px -20px rgba(0,0,0,.4)}\
.gu .topo.fixo .ct{height:70px}\
.gu .hero{position:relative;height:clamp(640px,96vh,900px);background:var(--tinta);color:#fff;overflow:hidden;isolation:isolate}\
.gu .slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.2s var(--ease),visibility 1.2s}\
.gu .slide.ativo{opacity:1;visibility:visible}\
.gu .slide>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.06);transition:transform 8s linear}\
.gu .slide.ativo>img{transform:scale(1)}\
.gu .slide::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(17,17,22,.82) 0%,rgba(17,17,22,.45) 45%,rgba(17,17,22,.05) 75%),linear-gradient(0deg,#fff 0%,rgba(255,255,255,.9) 8%,rgba(255,255,255,0) 30%)}\
.gu .slide .ct{position:relative;z-index:2;height:100%;display:flex;align-items:center;padding:60px 0 210px}\
.gu .h-txt{max-width:720px}\
.gu .h-txt .k{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:rgba(255,255,255,.9)}\
.gu .h-txt h1{margin:18px 0 28px;font:700 clamp(48px,6.6vw,96px)/.92 var(--disp);text-transform:uppercase;text-wrap:balance}\
.gu .h-txt h1 em{color:transparent;-webkit-text-stroke:2px #fff;paint-order:stroke}\
.gu .slide .h-txt>*{opacity:0;transform:translateY(24px);transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.gu .slide.ativo .h-txt>*{opacity:1;transform:none}\
.gu .slide.ativo .h-txt>*:nth-child(2){transition-delay:.12s}\
.gu .slide.ativo .h-txt>*:nth-child(3){transition-delay:.24s}\
.gu .pontos{position:absolute;z-index:4;right:max(20px,calc((100% - 1180px)/2));top:44%;display:flex;flex-direction:column;gap:14px}\
.gu .pontos button{width:12px;height:12px;padding:0;border-radius:99px;border:2px solid #fff;background:transparent;transition:height .5s var(--ease),background .3s}\
.gu .pontos button[aria-current="true"]{background:#fff;height:30px}\
.gu .lutas{position:relative;z-index:6;margin-top:-170px;display:grid;grid-template-columns:1fr 1fr;gap:22px}\
.gu .luta{display:grid;grid-template-columns:70px 1fr;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 30px 60px -28px rgba(17,17,22,.45);transition:transform .6s var(--ease)}\
.gu .luta:hover{transform:translateY(-6px)}\
.gu .luta .dt{background:var(--tinta);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}\
.gu .luta .dt b{font:700 34px/.9 var(--disp)}\
.gu .luta .dt span{font:700 11px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;opacity:.7}\
.gu .luta .cnt{display:grid;grid-template-columns:1fr auto;gap:6px 18px;align-items:center;padding:20px 24px}\
.gu .luta .who b{display:block;font:700 22px/1 var(--disp);text-transform:uppercase}\
.gu .luta .who span{display:flex;align-items:center;gap:8px;margin-top:8px;color:var(--suave);font-size:13px}\
.gu .luta .who .ponta{width:40px;height:9px}\
.gu .luta .who .ponta::after{width:18px;right:4px;background-size:14px 100%}\
.gu .medal{display:flex;align-items:center;gap:10px;font:700 34px/1 var(--disp);text-transform:uppercase}\
.gu .medal i{width:30px;height:30px;border-radius:50%;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}\
.gu .medal.ouro i{background:#E3A90B}\
.gu .medal.prata i{background:#A9B3C1}\
.gu .luta .met{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--linha);font-size:13px;color:var(--suave)}\
.gu .luta .met b{color:var(--texto)}\
.gu .mural{padding:90px 0 80px}\
.gu .notas{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}\
.gu .nota{display:flex;flex-direction:column;gap:14px}\
.gu .nota .ft{aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:var(--nevoa)}\
.gu .nota .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}\
.gu .nota:hover .ft img{transform:scale(1.06)}\
.gu .nota .ft.aviso{display:grid;place-items:center;background:var(--acc);color:var(--acc-ink)}\
.gu .nota .ft.aviso svg{width:56px;height:56px;stroke:currentColor;fill:none;stroke-width:2}\
.gu .nota .q{font:600 12px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave)}\
.gu .nota h3{font:600 22px/1.1 var(--disp);text-transform:uppercase}\
.gu .nota p{color:var(--suave);font-size:14px}\
.gu .dupla{padding:70px 0 110px;border-top:1px solid var(--linha)}\
.gu .dupla .grade{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:40px}\
.gu .dupla .grade>*{min-width:0}\
.gu .dupla h2.p{font:700 clamp(36px,4vw,56px)/.95 var(--disp);text-transform:uppercase;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.gu .evts{display:grid;grid-template-columns:1fr 1fr;gap:16px}\
.gu .evt{display:grid;grid-template-columns:58px 1fr;border:1px solid var(--linha);border-radius:16px;overflow:hidden;transition:box-shadow .5s var(--ease),transform .5s var(--ease)}\
.gu .evt:hover{transform:translateY(-4px);box-shadow:0 24px 40px -26px rgba(17,17,22,.4)}\
.gu .evt .dt{background:var(--acc);color:var(--acc-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}\
.gu .evt .dt b{font:700 30px/.9 var(--disp)}\
.gu .evt .dt span{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase}\
.gu .evt .cnt{padding:16px 18px;display:flex;flex-direction:column;gap:6px;min-width:0}\
.gu .evt h3{font:600 22px/1.05 var(--disp);text-transform:uppercase}\
.gu .evt small{color:var(--suave);font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:700}\
.gu .tab{border-radius:16px;overflow:hidden;border:1px solid var(--linha)}\
.gu .tab .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:var(--tinta);color:#fff;font:600 16px/1 var(--disp);letter-spacing:.06em;text-transform:uppercase}\
.gu .tab .hd a{font:700 11px/1 var(--corpo);letter-spacing:.12em;opacity:.8}\
.gu .tab table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}\
.gu .tab th{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave);text-align:left;padding:10px 18px;background:var(--nevoa)}\
.gu .tab td{padding:11px 18px;border-top:1px solid var(--linha);font:600 17px/1 var(--disp);text-transform:uppercase}\
.gu .tab td.n{width:40px;color:var(--suave)}\
.gu .tab tr:hover td{background:rgba(var(--acc-tri),.05)}\
.gu .belt{display:inline-block;vertical-align:middle;margin-right:12px;width:70px;height:13px;border-radius:2px;position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12);background:var(--c)}\
.gu .belt::after{content:"";position:absolute;right:8px;top:0;bottom:0;width:26px;background:var(--p,#111)}\
.gu .graus{display:inline-flex;gap:3px}\
.gu .graus i{width:5px;height:13px;border-radius:1px;background:var(--linha)}\
.gu .graus i.ok{background:var(--texto)}\
.gu .prog{position:relative;background:var(--tinta);color:#fff;padding:120px 0 0;isolation:isolate}\
.gu .prog>img{position:absolute;inset:0 0 auto auto;width:62%;height:78%;object-fit:cover;z-index:-1;opacity:.5;-webkit-mask-image:linear-gradient(90deg,transparent,#000 50%);mask-image:linear-gradient(90deg,transparent,#000 50%)}\
.gu .prog .tit .k{color:rgba(255,255,255,.7)}\
.gu .prog .tit h2{font-size:clamp(52px,7.4vw,108px);max-width:640px}\
.gu .prog .tit h2 em{color:var(--acc-claro)}\
.gu .prog-cards{position:relative;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-top:70px;transform:translateY(90px);margin-bottom:0}\
.gu .pg{background:#fff;color:var(--texto);border-radius:18px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(0,0,0,.45);transition:transform .6s var(--ease)}\
.gu .pg:hover{transform:translateY(-8px)}\
.gu .pg .ft{aspect-ratio:4/3;overflow:hidden}\
.gu .pg .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}\
.gu .pg:hover .ft img{transform:scale(1.07)}\
.gu .pg .tx{padding:18px 20px 22px;display:flex;flex-direction:column;gap:6px}\
.gu .pg .tx .k{color:var(--acc-txt);font-size:11px}\
.gu .pg h3{font:700 26px/1 var(--disp);text-transform:uppercase}\
.gu .pg p{color:var(--suave);font-size:14px}\
.gu .onde{padding:190px 0 110px;background:var(--nevoa)}\
.gu .onde .grade{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:start}\
.gu .enderecos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:26px 0 22px}\
.gu .enderecos b{display:block;font:600 16px/1.1 var(--disp);text-transform:uppercase;margin-bottom:6px}\
.gu .enderecos span{color:var(--suave);font-size:13px;display:block}\
.gu .enderecos a{display:inline-flex;margin-top:8px;font:700 11px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase;color:var(--acc-txt)}\
.gu .mapa{position:relative;aspect-ratio:16/10;border-radius:18px;overflow:hidden;background:#fff;border:1px solid var(--linha)}\
.gu .mapa svg{width:100%;height:100%}\
.gu .dias{display:flex;gap:6px;flex-wrap:wrap;margin:22px 0 16px}\
.gu .dias button{border:1px solid var(--linha);background:#fff;border-radius:99px;padding:9px 14px;font:700 12px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase;color:var(--suave);transition:background .3s,color .3s,border-color .3s}\
.gu .dias button[aria-selected="true"]{background:var(--tinta);border-color:var(--tinta);color:#fff}\
.gu .aulas{background:#fff;border-radius:18px;border:1px solid var(--linha);padding:6px 22px}\
.gu .aula{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:center;padding:16px 0;border-top:1px solid var(--linha)}\
.gu .aula:first-child{border-top:0}\
.gu .aula .hr{font:700 26px/1 var(--disp);font-variant-numeric:tabular-nums;color:var(--acc-txt);white-space:nowrap}\
.gu .aula b{display:block;font:600 21px/1.05 var(--disp);text-transform:uppercase}\
.gu .aula small{color:var(--suave);font-size:12.5px}\
.gu .aula .pb{font:700 10.5px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase;padding:7px 10px;border-radius:99px;background:var(--acc-claro);color:var(--acc-txt);white-space:nowrap}\
.gu .aulas[hidden]{display:none}\
.gu .split{display:grid;grid-template-columns:1fr 1fr;min-height:520px}\
.gu .split .a{position:relative;overflow:hidden}\
.gu .split img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}\
.gu .split .b{position:relative;overflow:hidden;color:#fff;display:flex;align-items:center}\
.gu .split .b::after{content:"";position:absolute;inset:0;background:rgba(var(--acc-tri),.82);mix-blend-mode:multiply}\
.gu .split .b::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(var(--acc-tri),.6),transparent 60%)}\
.gu .split blockquote{position:relative;z-index:2;margin:0 60px;max-width:440px}\
.gu .split blockquote::before{content:"\\201C";display:block;font:700 96px/.5 var(--disp);margin-bottom:16px}\
.gu .split blockquote p{font:700 clamp(28px,2.8vw,40px)/1.05 var(--disp);text-transform:uppercase}\
.gu .split cite{display:block;margin-top:16px;font-style:normal;font-weight:600;opacity:.85}\
.gu .sobre{padding:110px 0}\
.gu .sobre .grade{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:60px;align-items:center}\
.gu .sobre .tit h2{font-size:clamp(40px,4.8vw,68px)}\
.gu .sobre .vid{display:grid;grid-template-columns:150px 1fr;gap:20px;margin-top:30px;align-items:center}\
.gu .sobre .thumb{position:relative;aspect-ratio:4/3;border-radius:14px;overflow:hidden}\
.gu .sobre .thumb img{width:100%;height:100%;object-fit:cover}\
.gu .sobre .thumb::after{content:"";position:absolute;inset:0;margin:auto;width:46px;height:46px;border-radius:50%;background:rgba(255,255,255,.95) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M7 5l8 5-8 5z\' fill=\'%23111116\'/%3E%3C/svg%3E") center/18px no-repeat;box-shadow:0 0 0 8px rgba(255,255,255,.3)}\
.gu .sobre .vid p{color:var(--suave);font-size:14.5px}\
.gu .pilares{display:grid;grid-template-columns:1fr 1fr;gap:40px 30px}\
.gu .pilar svg{width:64px;height:64px;stroke:var(--acc);fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;margin-bottom:16px;transition:transform .6s var(--ease)}\
.gu .pilar:hover svg{transform:translateY(-4px) rotate(-4deg)}\
.gu .pilar b{display:block;font:700 22px/1.05 var(--disp);text-transform:uppercase}\
.gu .pilar p{color:var(--suave);font-size:14px;margin-top:6px}\
.gu .numeros{display:grid;grid-template-columns:1fr 1fr}\
.gu .numeros .esq{background:var(--tinta);color:#fff;padding:90px 60px 90px max(20px,calc((100vw - 1180px)/2));display:flex;flex-direction:column;justify-content:center}\
.gu .numeros .tit .k{color:rgba(255,255,255,.7)}\
.gu .numeros .tit h2 em{color:var(--acc-claro)}\
.gu .stats{display:grid;grid-template-columns:1fr 1fr;gap:30px 36px;margin-top:40px}\
.gu .stat{display:grid;grid-template-columns:44px 1fr;gap:6px 14px;align-items:center}\
.gu .stat svg{grid-row:span 2;width:40px;height:40px;stroke:var(--acc-claro);fill:none;stroke-width:2}\
.gu .stat b{font:700 52px/1 var(--disp);font-variant-numeric:tabular-nums}\
.gu .stat small{font:700 11px/1.2 var(--corpo);letter-spacing:.12em;text-transform:uppercase;opacity:.7}\
.gu .numeros .dir{position:relative;background:var(--acc-claro);overflow:hidden;display:grid;place-items:center;min-height:520px;margin:0}\
.gu .arco{position:relative;z-index:2;width:min(360px,70%);aspect-ratio:3/4;border-radius:999px 999px 24px 24px;overflow:hidden;box-shadow:0 40px 60px -30px rgba(var(--acc-tri),.6)}\
.gu .arco img{width:100%;height:100%;object-fit:cover;object-position:50% 20%}\
.gu .tri{position:absolute;z-index:1}\
.gu .tri.a{left:12%;top:16%;width:120px;transform:rotate(-14deg)}\
.gu .tri.b{right:10%;bottom:12%;width:150px;transform:rotate(18deg)}\
.gu .digital{position:absolute;right:8%;top:8%;width:170px;height:170px;z-index:1;opacity:.85}\
.gu .equipe{padding:110px 0 90px}\
.gu .abas{display:flex;gap:6px;flex-wrap:wrap}\
.gu .abas button{border:0;background:transparent;border-radius:99px;padding:10px 16px;font:700 12.5px/1 var(--corpo);letter-spacing:.06em;color:var(--suave);transition:background .3s,color .3s}\
.gu .abas button[aria-selected="true"]{background:var(--acc);color:var(--acc-ink)}\
.gu .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}\
.gu .cards[hidden]{display:none}\
.gu .pess{position:relative;aspect-ratio:3/4;border-radius:18px;overflow:hidden;background:radial-gradient(circle at 50% 20%,var(--carvao),var(--tinta));color:#fff;isolation:isolate}\
.gu .pess .wm{position:absolute;inset:7% 0 auto;z-index:0;opacity:.14;font:700 min(92px,calc(520px / var(--wl,6)))/.85 var(--disp);white-space:nowrap;overflow:hidden;text-transform:uppercase;text-align:center;letter-spacing:-.02em}\
.gu .pess img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;transition:transform 1s var(--ease)}\
.gu .pess:hover img{transform:scale(1.05)}\
.gu .pess::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(17,17,22,.95) 0%,rgba(17,17,22,.2) 45%,transparent 70%)}\
.gu .pess .tx{position:absolute;left:20px;right:20px;bottom:20px;z-index:2;display:grid;grid-template-columns:auto 1fr;gap:4px 14px;align-items:end}\
.gu .pess .tx .belt{grid-row:span 2;width:12px;height:56px;margin:0;align-self:stretch;border-radius:2px}\
.gu .pess .tx .belt::after{left:0;right:0;width:auto;top:auto;bottom:6px;height:18px}\
.gu .pess b{font:700 26px/1 var(--disp);text-transform:uppercase}\
.gu .pess b span{display:block;color:var(--acc-claro)}\
.gu .pess small{font-size:12.5px;opacity:.8}\
.gu .destaque{position:relative;padding:40px 0 0;overflow:hidden}\
.gu .destaque .grade{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:30px;align-items:end}\
.gu .dnome{display:grid;grid-template-columns:auto 1fr;gap:0 24px;align-items:center;padding-top:30px}\
.gu .dnome .cat{grid-row:span 3;writing-mode:vertical-rl;transform:rotate(180deg);font:700 15px/1 var(--corpo);letter-spacing:.2em;text-transform:uppercase;color:var(--acc-txt);border-left:4px solid var(--acc);padding-left:14px}\
.gu .dnome small{font:600 26px/1 var(--disp);text-transform:uppercase}\
.gu .dnome b{font:700 clamp(64px,9vw,128px)/.85 var(--disp);text-transform:uppercase;color:var(--acc-txt)}\
.gu .dnome span{font-size:15px;color:var(--suave);margin-top:10px}\
.gu .barras{display:grid;gap:14px;max-width:360px;margin:40px 0}\
.gu .barras div{font:700 11px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;color:var(--suave);display:grid;grid-template-columns:1fr auto;gap:8px}\
.gu .barras div i{grid-column:1/-1;height:6px;border-radius:99px;background:var(--linha);overflow:hidden;position:relative}\
.gu .barras div i::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--v);background:linear-gradient(90deg,rgba(var(--acc-tri),.5),var(--acc));border-radius:inherit;transition:width 1.8s var(--ease)}\
.gu .barras.zero i::after{width:0}\
.gu .temporada{display:flex;align-items:center;gap:26px;background:#fff;border-radius:18px;box-shadow:0 30px 60px -34px rgba(17,17,22,.45);padding:20px 26px;margin-bottom:60px;max-width:600px;flex-wrap:wrap}\
.gu .temporada .lb{font:700 15px/1.1 var(--disp);text-transform:uppercase}\
.gu .temporada .lb em{display:block;font-style:normal;color:var(--acc-txt)}\
.gu .temporada div{text-align:center;padding-left:22px;border-left:1px solid var(--linha)}\
.gu .temporada div b{display:block;font:700 40px/1 var(--disp);font-variant-numeric:tabular-nums}\
.gu .temporada div small{font:700 10.5px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;color:var(--suave)}\
.gu .dfoto{position:relative;align-self:end;aspect-ratio:3/4;border-radius:999px 999px 0 0;overflow:hidden;background:var(--acc-claro)}\
.gu .dfoto img{width:100%;height:100%;object-fit:cover;object-position:50% 15%}\
.gu .app{background:var(--nevoa);padding:110px 0}\
.gu .app .grade{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:60px;align-items:center}\
.gu .app p.lead{color:var(--suave);font-size:18px;max-width:46ch;margin:22px 0 26px}\
.gu .recursos{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;margin:0 0 30px;padding:0;list-style:none}\
.gu .recursos li{display:flex;gap:12px;font-weight:600}\
.gu .recursos li::before{content:"";flex:none;width:20px;height:20px;margin-top:2px;border-radius:99px;background:var(--acc) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M5 10.5l3.2 3L15 7\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/14px no-repeat}\
.gu .cel{width:290px;max-width:100%;margin-inline:auto;aspect-ratio:9/18.5;border-radius:42px;background:#0b0b0f;padding:12px;box-shadow:0 50px 80px -40px rgba(17,17,22,.6),inset 0 0 0 2px #2a2a33;transform:rotate(3deg);transition:transform 1s var(--ease)}\
.gu .cel:hover{transform:rotate(0) translateY(-8px)}\
.gu .tela{height:100%;border-radius:32px;overflow:hidden;background:#fff;display:flex;flex-direction:column}\
.gu .tela .tp{background:var(--tinta);color:#fff;padding:22px 16px 18px;display:flex;flex-direction:column;gap:14px}\
.gu .tela .who{display:flex;gap:10px;align-items:center}\
.gu .tela .av{width:38px;height:38px;border-radius:50%;background:var(--acc);display:grid;place-items:center;font:700 15px/1 var(--disp)}\
.gu .tela .who b{font:700 16px/1 var(--disp);letter-spacing:.06em;display:block}\
.gu .tela .who small{opacity:.7;font-size:10.5px}\
.gu .tela .belt-g{display:flex;align-items:center;gap:10px}\
.gu .tela .belt-g .belt{width:100%;margin:0;height:16px}\
.gu .tela .lb{display:flex;justify-content:space-between;font:700 10px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;opacity:.8}\
.gu .tela .lista{padding:14px;display:flex;flex-direction:column;gap:10px;font-size:12px}\
.gu .mini{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:var(--nevoa)}\
.gu .mini i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font:700 13px/1 var(--disp);font-style:normal;background:var(--acc);color:var(--acc-ink);flex:none}\
.gu .mini b{display:block;font:600 14px/1.05 var(--disp);text-transform:uppercase}\
.gu .mini small{color:var(--suave);font-size:10.5px}\
.gu .loja{padding:110px 0}\
.gu .prods{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}\
.gu .prod{border:1px solid var(--linha);border-radius:18px;padding:18px 18px 22px;display:flex;flex-direction:column;gap:6px;transition:box-shadow .5s var(--ease),transform .5s var(--ease),border-color .4s}\
.gu .prod:hover{transform:translateY(-6px);border-color:transparent;box-shadow:0 30px 50px -30px rgba(17,17,22,.4)}\
.gu .prod .ph{aspect-ratio:1;border-radius:14px;background:radial-gradient(circle at 50% 60%,#fff 0,var(--nevoa) 70%);display:grid;place-items:center;margin-bottom:10px}\
.gu .prod .ph svg{width:76%;height:auto;filter:drop-shadow(0 16px 16px rgba(17,17,22,.18));transition:transform .8s var(--ease)}\
.gu .prod:hover .ph svg{transform:scale(1.06) rotate(-2deg)}\
.gu .prod h3{font:600 22px/1.05 var(--disp);text-transform:uppercase}\
.gu .prod p{color:var(--suave);font-size:13.5px}\
.gu .prod b{font:700 26px/1 var(--disp);margin-top:auto;padding-top:10px}\
.gu .prod .btn{align-self:flex-start;padding:11px 18px;font-size:12px;margin-top:8px}\
.gu .rod{background:#08080b;color:#fff;padding:60px 0 30px}\
.gu .rod .k.c{display:block;text-align:center;color:rgba(255,255,255,.6);margin-bottom:26px}\
.gu .parc{display:flex;justify-content:space-around;align-items:center;gap:26px;flex-wrap:wrap;padding-bottom:46px;border-bottom:1px solid rgba(255,255,255,.12)}\
.gu .parc span{font:700 24px/1 var(--disp);letter-spacing:.04em;text-transform:uppercase;opacity:.55;transition:opacity .3s}\
.gu .parc span:hover{opacity:1}\
.gu .cols{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.2fr 1.3fr;gap:30px;padding:46px 0}\
.gu .cols>div{min-width:0}\
.gu .lema{display:flex;align-items:center;gap:16px}\
.gu .lema .selo{width:70px;height:70px;flex:none}\
.gu .lema b{font:700 24px/.95 var(--disp);text-transform:uppercase;padding-left:16px;border-left:2px solid #fff}\
.gu .lema b em{display:block;font-style:normal;color:var(--acc-claro)}\
.gu .cols h4{font:600 17px/1 var(--disp);letter-spacing:.08em;text-transform:uppercase;margin-bottom:16px}\
.gu .cols ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}\
.gu .cols li,.gu .cols li a{color:rgba(255,255,255,.7);font-size:14.5px}\
.gu .cols li a:hover{color:#fff}\
.gu .insta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\
.gu .insta img{aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--tinta2)}\
.gu .cop{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:22px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:13.5px}\
.gu .cop a{color:#fff;font-weight:700}\
@media (max-width:1180px){.gu .menu,.gu .soc-mini,.gu .topo .sep,.gu .topo .dir .btn{display:none}\
.gu .ham{display:grid}\
.gu .topo.aberto .menu{display:flex;position:absolute;top:100%;left:20px;right:20px;flex-direction:column;gap:0;background:var(--tinta);color:#fff;border-radius:16px;padding:8px 20px;box-shadow:0 30px 50px -20px rgba(0,0,0,.6)}\
.gu .topo.aberto .menu a{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)}}\
@media (max-width:1024px){.gu .notas,.gu .prog-cards,.gu .prods{grid-template-columns:repeat(2,minmax(0,1fr))}\
.gu .dupla .grade,.gu .onde .grade,.gu .sobre .grade,.gu .app .grade{grid-template-columns:1fr}\
.gu .cols{grid-template-columns:1fr 1fr 1fr}\
.gu .cols>div:first-child{grid-column:1/-1}\
.gu .onde{padding-top:290px}}\
@media (max-width:860px){.gu .lutas{grid-template-columns:1fr;margin-top:-190px}\
.gu .split,.gu .numeros{grid-template-columns:1fr}\
.gu .split .a{min-height:320px}\
.gu .split .b{min-height:420px}\
.gu .numeros .esq{padding:70px 20px}\
.gu .cards{grid-template-columns:repeat(2,minmax(0,1fr))}\
.gu .destaque .grade{grid-template-columns:1fr}\
.gu .dfoto{max-width:380px;margin-inline:auto;width:100%}}\
@media (max-width:620px){.gu .slide .ct{align-items:flex-start;padding:120px 0 300px}\
.gu .pontos{flex-direction:row;top:auto;bottom:330px;right:16px}\
.gu .pontos button[aria-current="true"]{height:12px;width:30px}\
.gu .lutas{margin-top:-290px}\
.gu .luta{grid-template-columns:56px 1fr}\
.gu .luta .cnt{grid-template-columns:1fr;padding:16px}\
.gu .medal{font-size:28px}\
.gu .notas,.gu .evts,.gu .prog-cards,.gu .prods,.gu .cards,.gu .enderecos{grid-template-columns:1fr}\
.gu .prods{grid-template-columns:1fr 1fr;gap:14px}\
.gu .prog-cards{transform:translateY(60px)}\
.gu .onde{padding-top:140px}\
.gu .split blockquote{margin:0 24px}\
.gu .stats{grid-template-columns:1fr 1fr;gap:24px}\
.gu .stat b{font-size:40px}\
.gu .pilares{grid-template-columns:1fr 1fr;gap:28px 18px}\
.gu .sobre .vid{grid-template-columns:110px 1fr}\
.gu .aula{grid-template-columns:auto 1fr;gap:6px 14px}\
.gu .aula .pb{grid-column:1/-1;justify-self:start}\
.gu .recursos{grid-template-columns:1fr}\
.gu .temporada div{padding-left:14px}\
.gu .cols{grid-template-columns:1fr 1fr}}\
@media (prefers-reduced-motion:reduce){.gu,.gu *,.gu *::before,.gu *::after{transition:none!important;animation:none!important}\
.gu .rv.fora{opacity:1;transform:none}}\
.gu .mapa iframe{width:100%;height:100%;border:0;display:block;filter:grayscale(.3)}\
.gu .pess .ini{position:absolute;inset:0;display:grid;place-items:center;font:700 110px/1 var(--disp);color:rgba(255,255,255,.18)}\
.gu .ag-vazia{border:1px dashed var(--linha);border-radius:16px;padding:26px;display:grid;gap:14px;justify-items:start}\
.gu .ag-vazia p{color:var(--suave);max-width:46ch}\
.gu .prod .ph img{width:100%;height:100%;object-fit:cover;border-radius:14px}\
.gu .prod .ph{overflow:hidden}\
.gu .marca .selo{border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--tinta);border:2px solid currentColor;font:700 18px/1 var(--disp);color:#fff}\
.gu .marca .selo img,.gu .lema .selo img,.gu .tela .av img{width:100%;height:100%;object-fit:cover}\
.gu .lema .selo{border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--tinta2);border:2px solid #fff;font:700 26px/1 var(--disp)}\
.gu .tela .av{overflow:hidden}\
.gu .notas.n1,.gu .notas.n2,.gu .notas.n3{grid-template-columns:repeat(var(--n),minmax(0,1fr))}\
.gu .lutas.um{grid-template-columns:minmax(0,640px)}\
.gu .prog-cards.n3{grid-template-columns:repeat(3,minmax(0,1fr))}\
.gu .split.solo{grid-template-columns:1fr}\
.gu .numeros .dir.sem{display:none}\
.gu .numeros.solo{grid-template-columns:1fr}\
.gu .parc img{max-height:50px;max-width:150px;object-fit:contain;filter:grayscale(1) brightness(1.7)}\
.gu .parc a{opacity:.6;transition:opacity .3s}\
.gu .parc a:hover{opacity:1}\
.gu .cont li{overflow-wrap:anywhere}\
.gu .topo .menu .so-m{display:none}\
@media (max-width:1180px){.gu .topo.aberto .menu .so-m{display:block}}\
@media (max-width:1024px){.gu .notas.n3{grid-template-columns:repeat(2,minmax(0,1fr))}\
.gu .prog-cards.n3{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (max-width:620px){.gu .notas.n1,.gu .notas.n2,.gu .notas.n3,.gu .prog-cards.n3{grid-template-columns:1fr}}\
.gu .h-txt .h1{margin:18px 0 28px;font:700 clamp(44px,6vw,88px)/.92 var(--disp);text-transform:uppercase;text-wrap:balance}\
.gu .h-txt p{max-width:52ch;margin:-12px 0 24px;color:rgba(255,255,255,.88);font-size:17px}\
.gu .dnome b{overflow-wrap:anywhere}';

function css(t){
  return '\
.gu{--tinta:'+t.tinta+';--tinta2:'+t.tinta2+';--carvao:'+t.carvao+';--acc:'+t.acc+';--acc-txt:'+t.accTxt+';--acc-tri:'+t.accTri+';--acc-claro:'+t.accClaro+';--acc-luz:'+t.accLuz+';--acc-ink:'+t.accInk+';\
 --papel:#ffffff;--nevoa:#f5f5f7;--linha:#e5e5ea;--texto:#16161b;--suave:#62626e;--faixa-ponta:#111;\
 --ease:cubic-bezier(.16,1,.3,1);--disp:"Oswald","Arial Narrow",Impact,sans-serif;--corpo:"Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;--ct:min(1180px,calc(100% - 40px));\
 position:relative;background:var(--papel);color:var(--texto);font:400 16px/1.6 var(--corpo);-webkit-font-smoothing:antialiased;overflow-x:clip;display:flow-root}\
@media (max-width:620px){.gu{--ct:calc(100% - 32px)}}\
' + CSS_BASE;
}

export function render(s, h){
  var esc = h.esc, url = h.url;
  var modReal = String(h.modalidade || s.modalidade || '').toLowerCase();
  var bjj = modReal === 'jiujitsu';
  var chave = bjj ? 'jiujitsu' : 'arena';
  var V = (h.VOCAB && (h.VOCAB[modReal] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && h.LIDER[modReal]) || 'Professor';
  var t = cores(s);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('gu-fonts')){
    var l = document.createElement('link'); l.id = 'gu-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('gu-css');
  if(!st){ st = document.createElement('style'); st.id = 'gu-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function estrela(txt){ var p = String(txt || '').split('*'); return p.map(function(x, i){ return i % 2 ? '<em>'+esc(x)+'</em>' : esc(x); }).join(''); }
  function titulo(sec, padT, padD){ var a = cx(sec, 'titulo', padT), d = cx(sec, 'destaque', padD || ''); return esc(a) + (d ? ' <em>'+esc(d)+'</em>' : ''); }
  function ponta(cor){ return '<i class="ponta"'+(cor ? ' style="--cor:'+esc(cor)+'"' : '')+' aria-hidden="true"></i>'; }
  function cab(sec, selo, tit, extra){ return '<div class="tit rv"><div class="k">'+ponta()+esc(cx(sec, 'selo', selo))+(extra || '')+'</div><h2>'+tit+'</h2></div>'; }

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
  var ig = String(s.instagram || '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30);
  var yt = url(cx('contato', 'youtube', ''));

  // escada (faixas) + cor por nome para cartões
  var escada = (Array.isArray(s.escada) ? s.escada : []).filter(function(b){ return b && b.nome; }).slice(0, 16)
    .map(function(b){ return { nome:String(b.nome), cor:hex6(b.cor) || FAIXA[semAcento(b.nome).split(/[\s/-]+/)[0]] || '#9aa7b4' }; });
  function corFaixa(nome){
    var n = semAcento(nome); if(!n) return '';
    for(var i = 0; i < escada.length; i++){ if(semAcento(escada[i].nome) === n) return escada[i].cor; }
    var p = n.split(/[\s/·-]+/)[0];
    for(var j = 0; j < escada.length; j++){ if(semAcento(escada[j].nome).split(/[\s/-]+/)[0] === p) return escada[j].cor; }
    return FAIXA[p] || '';
  }
  function belt(cor, extra){ var preta = cor && lum(cor) < .02; return '<span class="belt'+(extra || '')+'" style="--c:'+esc(cor || '#9aa7b4')+(preta ? ';--p:#c62828' : '')+'" aria-hidden="true"></span>'; }

  // app (agendaPublica)
  var doApp = (Array.isArray(s.agenda) ? s.agenda : []).filter(function(a){ return a && typeof a.titulo === 'string' && a.titulo.trim(); });
  var evApp = doApp.filter(function(a){ return a.tipo === 'evento' && /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') && a.data >= hoje; }).sort(function(a, b){ return a.data.localeCompare(b.data); });
  var avisos = doApp.filter(function(a){ return a.tipo === 'aviso'; }).sort(function(a, b){ return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); });
  function dataCurta(d){ return /^\d{4}-\d{2}-\d{2}/.test(d || '') ? d.slice(8, 10) + ' · ' + MES_CURTO[+d.slice(5, 7) - 1] : ''; }

  /* ---------- topo ---------- */
  var slides = [{ k:s.nomeCurto + (s.cidade ? ' · ' + s.cidade : ''), h:estrela(cx('topo', 'titulo', TOPO[chave])), p:cx('topo', 'texto', TOPO_TX[chave]), foto:url(cx('topo', 'foto', '')) || fachada[0] || foto(0), bt:[ctaHref, cx('topo', 'botao', 'Agendar aula experimental'), !!zapHref], app:false }];
  lista('topo', 'slides', 3).forEach(function(x, i){ if(cs(x, 'titulo')) slides.push({ k:cs(x, 'selo'), h:esc(cs(x, 'titulo')), p:'', foto:url(cs(x, 'foto')) || foto(i + 1), bt:[url(cs(x, 'link')) || ctaHref, 'Saiba mais', !!url(cs(x, 'link'))], app:false }); });
  if(evApp[0]) slides.push({ k:'Próximo evento · ' + dataCurta(evApp[0].data), h:esc(evApp[0].titulo), p:[evApp[0].local, evApp[0].hora].filter(Boolean).join(' · '), foto:foto(2), bt:['#gu-agenda', 'Ver na agenda', false], app:true });
  if(avisos[0]) slides.push({ k:'Aviso', h:esc(avisos[0].titulo), p:avisos[0].texto || '', foto:foto(4), bt:['#gu-mural', 'Ver o mural', false], app:true });
  slides = slides.slice(0, 4);
  var hero = '<section class="hero" id="gu-inicio" aria-roledescription="carrossel" aria-label="Destaques">'
    + slides.map(function(x, i){
      return '<div class="slide'+(i ? '' : ' ativo')+'"'+(i ? ' aria-hidden="true"' : '')+'>'+(x.foto ? '<img src="'+esc(x.foto)+'" alt=""'+(i ? ' loading="lazy"' : '')+'>' : '')
        + '<div class="ct"><div class="h-txt"><div class="k"><span>'+esc(x.k)+'</span>'+(x.app ? '<span class="app-tag" style="background:rgba(255,255,255,.14);color:#fff">Publicado no app</span>' : '')+'</div>'
        + (i ? '<h2 class="h1">'+x.h+'</h2>' : '<h1>'+x.h+'</h1>')
        + (x.p ? '<p>'+esc(x.p)+'</p>' : '')
        + '<div><a class="btn btn-a" href="'+esc(x.bt[0])+'"'+(x.bt[2] ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+esc(x.bt[1])+' '+SETA+'</a></div></div></div></div>';
    }).join('')
    + (slides.length > 1 ? '<div class="pontos" role="tablist" aria-label="Escolher destaque">'+slides.map(function(x, i){ return '<button type="button" role="tab" aria-label="Destaque '+(i + 1)+'" aria-current="'+(i ? 'false' : 'true')+'"></button>'; }).join('')+'</div>' : '')
    + '</section>';

  /* ---------- cartões de luta ---------- */
  var lts = lista('lutas', 'itens', 2).filter(function(x){ return cs(x, 'atleta'); });
  var lutas = lts.length ? '<div class="ct lutas'+(lts.length === 1 ? ' um' : '')+'">'+lts.map(function(x){
    var m = +digitos(cs(x, 'mes')), med = /^(ouro|prata|bronze)$/.test(cs(x, 'medalha')) ? cs(x, 'medalha') : '';
    var cat = [cs(x, 'faixa'), cs(x, 'categoria')].filter(Boolean).join(' · ');
    return '<article class="luta rv"><div class="dt"><b>'+esc(digitos(cs(x, 'dia')).slice(0, 2) || '–')+'</b><span>'+esc(m ? MES_CURTO[m - 1] : '')+'</span></div><div class="cnt">'
      + '<div class="who"><b>'+esc(cs(x, 'atleta'))+'</b>'+(cat ? '<span>'+ponta(corFaixa(cs(x, 'faixa')))+esc(cat)+'</span>' : '')+'</div>'
      + (med ? '<div class="medal '+med+'"><i></i>'+esc(med.charAt(0).toUpperCase() + med.slice(1))+'</div>' : '<span></span>')
      + ((cs(x, 'evento') || cs(x, 'detalhe')) ? '<div class="met">'+(cs(x, 'evento') ? '<b>'+esc(cs(x, 'evento'))+'</b>' : '')+(cs(x, 'evento') && cs(x, 'detalhe') ? ' · ' : '')+esc(cs(x, 'detalhe'))+'</div>' : '')+'</div></article>';
  }).join('')+'</div>' : '<div class="sem-lutas" style="height:30px"></div>';

  /* ---------- mural ---------- */
  var mural = '';
  if(avisos.length){
    var av = avisos.slice(0, 4);
    mural = '<section class="mural" id="gu-mural"><div class="ct"><div class="cab">'+cab('mural', 'Direto do '+V.local, esc(cx('mural', 'titulo', 'Mural de avisos')), ' <span class="app-tag">Sincronizado com o app</span>')+'</div>'
      + '<div class="notas'+(av.length < 4 ? ' n'+av.length : '')+'" style="--n:'+av.length+'">'+av.map(function(a, i){
        var d = /^\d{4}-\d{2}-\d{2}/.test(a.criadoEm || '') ? a.criadoEm.slice(0, 10) : (a.data || ''); var f = i % 3 === 1 ? '' : foto(5 + i);
        return '<article class="nota rv"><div class="ft'+(f ? '' : ' aviso')+'">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : ICO.aviso)+'</div>'+(d ? '<span class="q">'+esc(dataCurta(d))+'</span>' : '')+'<h3>'+esc(a.titulo)+'</h3>'+(a.texto ? '<p>'+esc(String(a.texto).slice(0, 140))+'</p>' : '')+'</article>';
      }).join('')+'</div></div></section>';
  }

  /* ---------- agenda + graduação ---------- */
  var evts = evApp.slice(0, 4).map(function(a){ return { dia:a.data.slice(8, 10), mes:MES_CURTO[+a.data.slice(5, 7) - 1], titulo:a.titulo, local:[a.local || a.nucleo, a.hora].filter(Boolean).join(' · ') }; });
  lista('agenda', 'itens', 6).forEach(function(x){ var m = +digitos(cs(x, 'mes')); if(cs(x, 'titulo')) evts.push({ dia:digitos(cs(x, 'dia')).slice(0, 2), mes:m ? MES_CURTO[m - 1] : '', titulo:cs(x, 'titulo'), local:cs(x, 'local') }); });
  evts = evts.slice(0, 6);
  var agHTML = '<div class="rv" id="gu-agenda"><h2 class="p">'+esc(cx('agenda', 'titulo', 'Agenda'))+(evApp.length ? ' <span class="app-tag">Sincronizado com o app</span>' : '')+'</h2>'
    + (evts.length ? '<div class="evts">'+evts.map(function(e){ return '<article class="evt"><div class="dt"><b>'+esc(e.dia || '–')+'</b><span>'+esc(e.mes)+'</span></div><div class="cnt"><h3>'+esc(e.titulo)+'</h3>'+(e.local ? '<small>'+esc(e.local)+'</small>' : '')+'</div></article>'; }).join('')+'</div>'
      : '<div class="ag-vazia"><p>Campeonatos, exames de faixa e eventos da '+esc(s.nomeCurto)+' aparecem aqui assim que forem publicados no app.</p><a class="btn esc" href="'+esc(R('campeonatos'))+'">Ver campeonatos</a></div>')+'</div>';
  var graus = lista('graduacao', 'itens', 16);
  var temGraus = bjj || graus.some(function(g){ return digitos(cs(g, 'graus')); });
  var gradHTML = escada.length ? '<div class="rv" id="gu-graduacao"><h2 class="p">'+esc(cx('graduacao', 'titulo', 'Graduação'))+'</h2><div class="tab"><div class="hd"><span>'+esc(String(s.peca || 'faixa').charAt(0).toUpperCase() + String(s.peca || 'faixa').slice(1))+'s da equipe</span><a href="'+esc(login)+'">Meu termômetro ›</a></div>'
    + '<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>'+esc(s.peca || 'Faixa')+'</th>'+(temGraus ? '<th>Graus</th>' : '')+'</tr></thead><tbody>'
    + escada.map(function(b, j){
      var g = digitos(cs(graus[j], 'graus')); var n = g ? Math.min(10, +g) : (bjj ? (j === escada.length - 1 && lum(b.cor) < .02 ? 6 : 4) : 0);
      return '<tr><td class="n">'+(j + 1)+'</td><td>'+belt(b.cor)+esc(b.nome)+'</td>'+(temGraus ? '<td><span class="graus" aria-label="'+n+' graus">'+new Array(n + 1).join('<i class="ok"></i>')+'</span></td>' : '')+'</tr>';
    }).join('')+'</tbody></table></div></div></div>' : '';
  var dupla = '<section class="dupla"><div class="ct grade" style="'+(gradHTML ? '' : 'grid-template-columns:1fr')+'">'+agHTML+gradHTML+'</div></section>';

  /* ---------- programas ---------- */
  var pp = PROG[chave];
  var pIt = lista('programas', 'itens', 4).filter(function(x){ return cs(x, 'titulo'); });
  var plist = pIt.length ? pIt.map(function(x, i){ return [cs(x, 'titulo'), cs(x, 'texto'), url(cs(x, 'foto')) || foto(6 + i)]; }) : pp.itens.map(function(x, i){ return [x[0], x[1], foto(6 + i)]; });
  var progFoto = url(cx('programas', 'foto', '')) || fachada[0] || foto(1);
  var programas = '<section class="prog" id="gu-programas">'+(progFoto ? '<img src="'+esc(progFoto)+'" alt="" aria-hidden="true" loading="lazy">' : '')+'<div class="ct">'
    + '<div class="tit rv"><div class="k">'+ponta('#ffffff')+esc(cx('programas', 'selo', 'Treino contínuo'))+'</div><h2>'+titulo('programas', pp.titulo, pp.dest)+'</h2></div>'
    + '<div class="prog-cards'+(plist.length === 3 ? ' n3' : '')+'">'+plist.map(function(x){ return '<article class="pg rv"><div class="ft">'+(x[2] ? '<img src="'+esc(x[2])+'" alt="'+esc(x[0])+'" loading="lazy">' : '')+'</div><div class="tx"><span class="k">Programa</span><h3>'+esc(x[0])+'</h3>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'</div></article>'; }).join('')+'</div></div></section>';

  /* ---------- onde treinar + horários ---------- */
  var nucs = lista('onde', 'lista', 6).filter(function(x){ return cs(x, 'nome'); }).map(function(x){ var w = digitos(cs(x, 'whatsapp')); return { nome:cs(x, 'nome'), end:cs(x, 'endereco'), zap:/^\d{10,13}$/.test(w) ? w : '' }; });
  if(!nucs.length && Array.isArray(s.nucleosInfo)) s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucs.push({ nome:String(n.nome), end:[n.sede ? 'Sede' : '', n.cidade ? String(n.cidade) + (n.uf ? ' · ' + String(n.uf) : '') : ''].filter(Boolean).join(' — '), zap:'' }); });
  if(!nucs.length) nucs.push({ nome:s.nomeCurto, end:[s.endereco, s.cidade].filter(Boolean).join(' — '), zap:'' });
  var geo = s.geo && isFinite(Number(s.geo.lat)) && isFinite(Number(s.geo.lng)) ? { lat:Number(s.geo.lat), lng:Number(s.geo.lng) } : null;
  var mapa = geo ? '<iframe title="Mapa" src="https://www.openstreetmap.org/export/embed.html?bbox='+esc((geo.lng - 0.013).toFixed(4))+'%2C'+esc((geo.lat - 0.01).toFixed(4))+'%2C'+esc((geo.lng + 0.013).toFixed(4))+'%2C'+esc((geo.lat + 0.01).toFixed(4))+'&amp;layer=mapnik&amp;marker='+esc(geo.lat.toFixed(5))+'%2C'+esc(geo.lng.toFixed(5))+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' : mapaDesenho(nucs.length);
  var aulas = lista('horarios', 'itens', 30).filter(function(x){ return cs(x, 'aula') && cs(x, 'dia'); });
  var porDia = DIAS.map(function(d){ return [d, aulas.filter(function(x){ return cs(x, 'dia') === d[0]; }).sort(function(a, b){ return cs(a, 'horario').localeCompare(cs(b, 'horario')); })]; }).filter(function(d){ return d[1].length; });
  var horHTML = porDia.length ? '<div class="rv" id="gu-horarios"><div class="tit"><div class="k">'+ponta()+'Semana no '+esc(V.local)+'</div><h2>'+esc(cx('horarios', 'titulo', 'Horários'))+'</h2></div>'
    + '<div class="dias" role="tablist" aria-label="Dia da semana">'+porDia.map(function(d, i){ return '<button type="button" role="tab" aria-selected="'+(i ? 'false' : 'true')+'" data-dia="'+d[0][0]+'" aria-label="'+d[0][1]+'">'+d[0][2]+'</button>'; }).join('')+'</div>'
    + porDia.map(function(d, i){ return '<div class="aulas" role="tabpanel" data-dia="'+d[0][0]+'"'+(i ? ' hidden' : '')+'>'+d[1].map(function(x){ return '<div class="aula"><span class="hr">'+esc(cs(x, 'horario'))+'</span><div><b>'+esc(cs(x, 'aula'))+'</b>'+(cs(x, 'local') ? '<small>'+esc(cs(x, 'local'))+'</small>' : '')+'</div>'+(cs(x, 'publico') ? '<span class="pb">'+esc(cs(x, 'publico'))+'</span>' : '<span></span>')+'</div>'; }).join('')+'</div>'; }).join('')+'</div>' : '';
  var onde = '<section class="onde'+(lts.length || avisos.length ? '' : '')+'" id="gu-onde"><div class="ct grade" style="'+(horHTML ? '' : 'grid-template-columns:1fr')+'"><div class="rv">'+'<div class="tit"><div class="k">'+ponta()+esc(cx('onde', 'selo', 'Aula experimental grátis'))+'</div><h2>'+titulo('onde', 'Onde', 'treinar')+'</h2></div>'
    + '<div class="enderecos">'+nucs.map(function(n){ var w = n.zap ? 'https://wa.me/'+(n.zap.length <= 11 ? '55' : '')+n.zap+'?text='+encodeURIComponent('Olá! Quero agendar uma aula experimental no núcleo '+n.nome+'.') : ctaHref; return '<div><b>'+esc(n.nome)+'</b>'+(n.end ? '<span>'+esc(n.end)+'</span>' : '')+'<a href="'+esc(w)+'"'+((n.zap || zapHref) ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+((n.zap || zapHref) ? 'WhatsApp ›' : 'Inscrição ›')+'</a></div>'; }).join('')+'</div>'
    + '<div class="mapa">'+mapa+'</div></div>'+horHTML+'</div></section>';

  /* ---------- depoimento ---------- */
  var dTx = cx('depoimento', 'texto', ''), f1 = url(cx('depoimento', 'foto1', '')) || foto(9), f2 = url(cx('depoimento', 'foto2', '')) || foto(10);
  var split = (dTx || (f1 && f2)) ? '<section class="split'+(f1 ? '' : ' solo')+'">'+(f1 ? '<div class="a"><img src="'+esc(f1)+'" alt="" loading="lazy"></div>' : '')
    + '<div class="b">'+(f2 ? '<img src="'+esc(f2)+'" alt="" aria-hidden="true" loading="lazy">' : '')+(dTx ? '<blockquote class="rv"><p>'+esc(dTx)+'</p>'+(cx('depoimento', 'autor', '') ? '<cite>'+esc(cx('depoimento', 'autor', ''))+'</cite>' : '')+'</blockquote>' : '')+'</div></section>' : '';

  /* ---------- sobre + pilares ---------- */
  var so = SOBRE[chave], vid = url(cx('sobre', 'video', '')), vfoto = url(cx('sobre', 'foto', '')) || foto(11);
  var pil = lista('sobre', 'pilares', 4).filter(function(x){ return cs(x, 'titulo'); }).map(function(x){ return [cs(x, 'titulo'), cs(x, 'texto')]; });
  if(!pil.length) pil = PILARES[chave];
  var sobreTx = cx('sobre', 'texto', 'A '+(s.nome || s.nomeCurto)+' forma alunos e atletas'+(s.cidade ? ' em '+s.cidade : '')+': aula estruturada por etapas, treino com orientação e graduação acompanhada no app.');
  var sobre = '<section class="sobre" id="gu-sobre"><div class="ct grade"><div class="rv">'+'<div class="tit"><div class="k">'+ponta()+esc(cx('sobre', 'selo', 'Sobre a equipe'))+'</div><h2>'+titulo('sobre', so[0], so[1])+'</h2></div>'
    + '<div class="vid" style="'+(vid ? '' : 'grid-template-columns:1fr')+'">'+(vid ? '<a class="thumb" href="'+esc(vid)+'" target="_blank" rel="noopener noreferrer" aria-label="Assistir ao vídeo">'+(vfoto ? '<img src="'+esc(vfoto)+'" alt="" loading="lazy">' : '')+'</a>' : '')+'<p>'+esc(sobreTx)+'</p></div></div>'
    + '<div class="pilares">'+pil.map(function(x, i){ return '<div class="pilar rv">'+PILAR_ICO[i % 4]+'<b>'+esc(x[0])+'</b>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'</div>'; }).join('')+'</div></div></section>';

  /* ---------- números ---------- */
  var nums = lista('numeros', 'itens', 4).filter(function(x){ return cs(x, 'valor') && cs(x, 'rotulo'); }).map(function(x){ return [cs(x, 'valor'), cs(x, 'rotulo')]; });
  var professores = (Array.isArray(s.equipe) ? s.equipe.filter(function(m){ return m && m.nome; }).length : 0);
  var qtdNuc = Array.isArray(s.nucleosInfo) ? s.nucleosInfo.length : (Array.isArray(s.nucleos) ? s.nucleos.length : 0);
  if(!nums.length){
    if(escada.length) nums.push([String(escada.length), (s.peca || 'faixa') + (escada.length > 1 ? 's na escada' : ' na escada')]);
    if(qtdNuc) nums.push([String(qtdNuc), qtdNuc > 1 ? 'Núcleos' : 'Núcleo']);
    if(professores) nums.push([String(professores), professores > 1 ? 'Professores' : 'Professor']);
  }
  var arco = url(cx('numeros', 'foto', '')) || url(s.fotoLider) || equipeF[0] || foto(3);
  var numeros = nums.length ? '<section class="numeros'+(arco ? '' : ' solo')+'"><div class="esq"><div class="tit rv"><div class="k">'+ponta('#ffffff')+esc(cx('numeros', 'selo', 'Construindo campeões'))+'</div><h2>'+titulo('numeros', 'A equipe em', 'números')+'</h2></div>'
    + '<div class="stats">'+nums.map(function(x, i){ return '<div class="stat rv">'+STAT_ICO[i % 4]+'<b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div>'; }).join('')+'</div></div>'
    + (arco ? '<figure class="dir"><svg class="tri a" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 0 100 90H0z" style="fill:var(--acc)"/></svg><svg class="tri b" viewBox="0 0 100 90" aria-hidden="true"><path d="M50 0 100 90H0z" style="fill:var(--tinta)"/></svg>'
      + '<svg class="digital" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" style="stroke:var(--acc)" stroke-width="2.2"><circle cx="50" cy="50" r="46" stroke-dasharray="40 6 18 6"/><circle cx="50" cy="50" r="38" stroke-dasharray="22 5 30 5"/><circle cx="50" cy="50" r="30" stroke-dasharray="14 5 26 5"/><circle cx="50" cy="50" r="22" stroke-dasharray="18 4 10 4"/><circle cx="50" cy="50" r="14" stroke-dasharray="8 4 12 4"/><circle cx="50" cy="50" r="6"/></g></svg>'
      + '<div class="arco"><img src="'+esc(arco)+'" alt="" loading="lazy"></div></figure>' : '')+'</section>' : '';

  /* ---------- equipe (abas) ---------- */
  function pessoas(lst){ return lst.filter(function(m){ return cs(m, 'nome'); }).map(function(m){ return { nome:cs(m, 'nome'), faixa:cs(m, 'faixa'), linha:cs(m, 'graduacao'), foto:url(cs(m, 'foto')) }; }); }
  var profs = pessoas(lista('equipe', 'itens', 6));
  if(!profs.length && Array.isArray(s.equipe)) s.equipe.forEach(function(m){ if(m && m.nome) profs.push({ nome:String(m.nome), faixa:'', linha:String(m.graduacao || ''), foto:url(m.foto) }); });
  if(!profs.length && s.lider) profs.push({ nome:String(s.lider), faixa:'', linha:(s.responsavel && s.responsavel.graduacao) || tituloLider, foto:url(s.fotoLider) });
  var comp = pessoas(lista('equipe', 'competicao', 9));
  var marcaD = esc(String(s.nomeCurto || '').split(/\s+/)[0] || '');
  function cartao(p){
    var cor = corFaixa(p.faixa) || (escada.length ? escada[escada.length - 1].cor : '');
    var nm = p.nome.split(/\s+/), prim = nm.slice(0, -1).join(' ') || nm[0], ult = nm.length > 1 ? nm[nm.length - 1] : '';
    return '<article class="pess rv"><span class="wm" aria-hidden="true" style="--wl:'+Math.max(4, marcaD.length)+'">'+marcaD+'</span>'+(p.foto ? '<img src="'+esc(p.foto)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="ini" aria-hidden="true">'+esc(iniciais(p.nome))+'</span>')
      + '<div class="tx">'+belt(cor)+'<b>'+esc(prim)+(ult ? ' <span>'+esc(ult)+'</span>' : '')+'</b><small>'+esc([p.faixa ? 'Faixa ' + p.faixa.toLowerCase() : '', p.linha].filter(Boolean).join(' · ') || tituloLider)+'</small></div></article>';
  }
  var equipe = profs.length ? '<section class="equipe" id="gu-equipe"><div class="ct"><div class="cab">'+cab('equipe', 'Conheça a equipe', titulo('equipe', 'Quem está no', V.local))
    + (comp.length ? '<div class="abas" role="tablist" aria-label="Grupos da equipe"><button type="button" role="tab" aria-selected="true" data-grupo="prof">Professores</button><button type="button" role="tab" aria-selected="false" data-grupo="comp">Competição</button></div>' : '')+'</div>'
    + '<div class="cards" role="tabpanel" data-grupo="prof">'+profs.map(cartao).join('')+'</div>'
    + (comp.length ? '<div class="cards" role="tabpanel" data-grupo="comp" hidden>'+comp.map(cartao).join('')+'</div>' : '')+'</div></section>' : '';

  /* ---------- atleta do mês ---------- */
  var aNome = cx('atleta', 'nome', ''), aFoto = url(cx('atleta', 'foto', ''));
  var destaque = '';
  if(aNome && aFoto){
    var an = aNome.split(/\s+/), aPrim = an.length > 1 ? an.slice(0, -1).join(' ') : '', aUlt = an[an.length - 1];
    var bars = lista('atleta', 'barras', 3).filter(function(x){ return cs(x, 'rotulo') && digitos(cs(x, 'valor')); });
    var tmp = [['lutas', 'Lutas'], ['vitorias', 'Vitórias'], ['finalizacoes', 'Finalizações']].filter(function(x){ return digitos(cx('atleta', x[0], '')); });
    destaque = '<section class="destaque" id="gu-atleta"><div class="ct grade"><div>'
      + '<div class="dnome rv"><span class="cat">'+esc(cx('atleta', 'selo', 'Atleta do mês'))+'</span>'+(aPrim ? '<small>'+esc(aPrim)+'</small>' : '')+'<b>'+esc(aUlt)+'</b>'+(cx('atleta', 'texto', '') ? '<span>'+esc(cx('atleta', 'texto', ''))+'</span>' : '')+'</div>'
      + (bars.length ? '<div class="barras rv">'+bars.map(function(x){ var v = Math.min(100, +digitos(cs(x, 'valor'))); return '<div>'+esc(cs(x, 'rotulo'))+'<span>'+v+'%</span><i style="--v:'+v+'%"></i></div>'; }).join('')+'</div>' : '<div style="height:40px"></div>')
      + (tmp.length ? '<div class="temporada rv"><span class="lb">Temporada'+(digitos(cx('atleta', 'ano', '')) ? '<em>'+esc(digitos(cx('atleta', 'ano', '')).slice(0, 4))+'</em>' : '')+'</span>'+tmp.map(function(x){ return '<div><b>'+esc(digitos(cx('atleta', x[0], '')).slice(0, 4))+'</b><small>'+x[1]+'</small></div>'; }).join('')+'</div>' : '<div style="height:60px"></div>')
      + '</div><div class="dfoto rv"><img src="'+esc(aFoto)+'" alt="'+esc(aNome)+'" loading="lazy"></div></div></section>';
  }

  /* ---------- app ---------- */
  var cAtual = escada.length > 1 ? escada[1] : escada[0];
  var appSec = '<section class="app" id="gu-app"><div class="ct grade"><div>'+cab('app', 'Tudo no celular', titulo('app', 'A equipe no seu', 'bolso'))
    + '<p class="lead rv">'+esc(cx('app', 'texto', 'Alunos e responsáveis acompanham '+(bjj ? 'graus e faixas' : 'a graduação')+', recebem os avisos na hora e pagam a mensalidade pelo app da '+s.nomeCurto+'.'))+'</p>'
    + '<ul class="recursos rv"><li>Termômetro até '+(bjj ? 'o próximo grau' : 'a próxima graduação')+'</li><li>Avisos e agenda em tempo real</li><li>Carteirinha digital</li><li>Mensalidade por PIX</li><li>Check-in do treino</li><li>Inscrição em campeonatos</li></ul>'
    + '<a class="btn esc rv" href="'+esc(R('instalar'))+'">Instalar o app</a></div>'
    + '<div class="rv" aria-hidden="true"><div class="cel"><div class="tela"><div class="tp"><div class="who"><span class="av">'+selo()+'</span><div><b>ATLETA</b><small>'+esc(cAtual ? cAtual.nome : 'Seu perfil')+'</small></div></div>'
    + '<div class="lb"><span>'+(bjj ? 'Próximo grau' : 'Prontidão')+'</span><span>80%</span></div><div class="belt-g">'+belt(cAtual ? cAtual.cor : t.acc)+'</div></div>'
    + '<div class="lista">'+(evApp[0] ? '<div class="mini"><i>'+esc(evApp[0].data.slice(8, 10))+'</i><div><b>'+esc(evApp[0].titulo.slice(0, 24))+'</b><small>Agenda da equipe</small></div></div>' : '')
    + (avisos[0] ? '<div class="mini"><i>!</i><div><b>'+esc(avisos[0].titulo.slice(0, 24))+'</b><small>Mural do '+esc(V.local)+'</small></div></div>' : '')
    + '<div class="mini"><i>✓</i><div><b>Check-in feito</b><small>Presença registrada</small></div></div><div class="mini"><i>$</i><div><b>Mensalidade</b><small>Pague por PIX</small></div></div></div></div></div></div></div></section>';

  /* ---------- loja ---------- */
  var prods = produtosLoja(C, 8), loja = '';
  if(prods.length){
    var zapLoja = cx('loja', 'whatsapp', '') || zap;
    var coresLoja = { principal:t.tinta, destaque:t.acc };
    loja = '<section class="loja" id="gu-loja"><div class="ct"><div class="cab">'+cab('loja', 'Vista a equipe', titulo('loja', 'Loja', 'oficial'))+'</div>'
      + (cx('loja', 'texto', '') ? '<p class="rv" style="color:var(--suave);max-width:56ch;margin:-14px 0 30px">'+esc(cx('loja', 'texto', ''))+'</p>' : '')
      + '<div class="prods">'+prods.map(function(p){ var w = linkCompra(zapLoja, p), f = url(p.foto);
        return '<div class="prod rv"><div class="ph">'+(f ? '<img src="'+esc(f)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span role="img" aria-label="'+esc(p.nome)+'" style="display:contents">'+ilustracao(p.nome, coresLoja)+'</span>')+'</div><h3>'+esc(p.nome)+'</h3>'+(p.texto ? '<p>'+esc(p.texto)+'</p>' : '')+(p.preco ? '<b>'+esc(p.preco)+'</b>' : '')
          + (w ? '<a class="btn esc" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">Comprar</a>' : '')+'</div>'; }).join('')+'</div></div></section>';
  }

  /* ---------- rodapé ---------- */
  var parcs = lista('contato', 'parceiros', 6).filter(function(p){ return cs(p, 'nome'); });
  var email = cx('contato', 'email', '').replace(/[^A-Za-z0-9._%+@-]/g, ''); if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) email = '';
  var lema = cx('contato', 'lema', bjj ? 'Técnica antes *de força*' : 'Treine com *a gente*').split('*');
  var navLinks = [avisos.length ? ['#gu-mural', 'Mural'] : null, ['#gu-agenda', 'Agenda'], ['#gu-programas', 'Programas'], porDia.length ? ['#gu-horarios', 'Horários'] : null, profs.length ? ['#gu-equipe', 'Equipe'] : null, prods.length ? ['#gu-loja', 'Loja'] : null, ['#gu-onde', 'Contato']].filter(Boolean);
  var foot = '<footer class="rod"><div class="ct">'
    + (parcs.length ? '<span class="k c">Parceiros</span><div class="parc">'+parcs.map(function(p){ var lg = url(cs(p, 'logo')), lk = url(cs(p, 'link')); var inner = lg ? '<img src="'+esc(lg)+'" alt="'+esc(cs(p, 'nome'))+'" loading="lazy">' : esc(cs(p, 'nome')); return lk ? '<a href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer">'+inner+'</a>' : '<span>'+inner+'</span>'; }).join('')+'</div>' : '')
    + '<div class="cols"><div><div class="lema"><span class="selo">'+selo()+'</span><b>'+esc(lema[0] || '')+(lema[1] ? '<em>'+esc(lema[1])+'</em>' : '')+'</b></div></div>'
    + '<div><h4>Equipe</h4><ul>'+navLinks.slice(0, 6).map(function(l){ return '<li><a href="'+l[0]+'">'+l[1]+'</a></li>'; }).join('')+'</ul></div>'
    + '<div><h4>Sistema</h4><ul><li><a href="'+esc(login)+'">Área do aluno</a></li><li><a href="'+esc(ins)+'">Inscrição</a></li><li><a href="'+esc(R('campeonatos'))+'">Campeonatos</a></li><li><a href="'+esc(R('instalar'))+'">Instalar o app</a></li></ul></div>'
    + '<div class="cont"><h4>Contato</h4><ul>'+(zap ? '<li><a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">'+esc(zap.length === 11 ? '('+zap.slice(0, 2)+') '+zap.slice(2, 7)+'-'+zap.slice(7) : zap)+'</a></li>' : '')+(email ? '<li><a href="mailto:'+esc(email)+'">'+esc(email)+'</a></li>' : '')
    + ((s.endereco || s.cidade) ? '<li>'+esc([s.endereco, [s.cidade, s.uf].filter(Boolean).join(' · ')].filter(Boolean).join(' — '))+'</li>' : '')+'</ul></div>'
    + '<div>'+(ig && treino.length ? '<h4>No Instagram</h4><div class="insta">'+treino.slice(0, 6).map(function(f){ return '<a href="https://instagram.com/'+esc(ig)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(f)+'" alt="" loading="lazy"></a>'; }).join('')+'</div>' : '')+'</div></div>'
    + '<div class="cop"><span>© '+new Date().getFullYear()+' '+esc(s.nome || s.nomeCurto)+'</span><span>Site e app por <a href="https://atletapay.com.br" target="_blank" rel="noopener">AtletaPay</a></span></div></div></footer>';

  var nav = '<header class="topo" id="gu-topo"><div class="ct"><a class="marca" href="#gu-inicio" aria-label="'+esc(s.nomeCurto)+' — início"><span class="selo">'+selo()+'</span><span><b>'+esc(s.nomeCurto)+'</b><small>'+esc(V.nomeMod)+'</small></span></a><span class="sep" aria-hidden="true"></span>'
    + '<nav class="menu" id="gu-menu" aria-label="Seções">'+navLinks.map(function(l){ return '<a href="'+l[0]+'">'+l[1]+'</a>'; }).join('')+'<a class="so-m" href="'+esc(login)+'">Área do aluno</a></nav>'
    + '<div class="dir"><div class="soc-mini">'+(ig ? '<a href="https://instagram.com/'+esc(ig)+'" target="_blank" rel="noopener noreferrer" aria-label="Instagram">'+ICO.insta+'</a>' : '')+(yt ? '<a href="'+esc(yt)+'" target="_blank" rel="noopener noreferrer" aria-label="YouTube">'+ICO.yt+'</a>' : '')+'</div>'
    + '<a class="btn btn-a" href="'+esc(ctaHref)+'"'+ctaAlvo+'>Aula experimental</a><button class="ham" id="gu-ham" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="gu-menu"><span></span></button></div></div></header>';

  site.className = 'gu';
  site.innerHTML = nav + '<main>' + hero + lutas + mural + dupla + programas + onde + split + sobre + numeros + equipe + destaque + appSec + loja + '</main>' + foot;
  wire(site);
}

/* ---------------- comportamento ---------------- */
function wire(site){
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(site._gu) site._gu.parar();
  var estado = { timers:[], obs:[] };
  estado.parar = function(){ estado.timers.forEach(clearInterval); estado.obs.forEach(function(o){ o.disconnect(); }); };
  site._gu = estado;

  var topo = site.querySelector('#gu-topo'), ham = site.querySelector('#gu-ham'), menu = site.querySelector('#gu-menu');
  if(!site._guRolagem){ site._guRolagem = true; window.addEventListener('scroll', function(){ var tp = site.querySelector('#gu-topo'); if(tp) tp.classList.toggle('fixo', window.scrollY > 100); }, { passive:true }); }
  if(topo) topo.classList.toggle('fixo', window.scrollY > 100);
  if(ham) ham.addEventListener('click', function(){ var a = topo.classList.toggle('aberto'); ham.setAttribute('aria-expanded', a ? 'true' : 'false'); });
  if(menu) menu.addEventListener('click', function(e){ if(e.target.closest('a')){ topo.classList.remove('aberto'); if(ham) ham.setAttribute('aria-expanded', 'false'); } });

  var sl = [].slice.call(site.querySelectorAll('.slide')), pt = [].slice.call(site.querySelectorAll('.pontos button')), at = 0;
  function vai(i){ at = (i + sl.length) % sl.length; sl.forEach(function(x, k){ x.classList.toggle('ativo', k === at); if(k === at) x.removeAttribute('aria-hidden'); else x.setAttribute('aria-hidden', 'true'); }); pt.forEach(function(p, k){ p.setAttribute('aria-current', k === at ? 'true' : 'false'); }); }
  function auto(){ estado.timers.forEach(clearInterval); estado.timers = []; if(!reduz && sl.length > 1) estado.timers.push(setInterval(function(){ vai(at + 1); }, 6500)); }
  pt.forEach(function(p, k){ p.addEventListener('click', function(){ vai(k); auto(); }); }); auto();

  // abas (dias da semana e grupos da equipe): mesmo comportamento, com setas do teclado
  function abas(lista, attr, raiz){
    if(!lista) return;
    var bts = [].slice.call(lista.querySelectorAll('button'));
    var paineis = [].slice.call((raiz || lista.parentNode).querySelectorAll('[role="tabpanel"][data-'+attr+']'));
    function sel(b){ bts.forEach(function(x){ x.setAttribute('aria-selected', x === b ? 'true' : 'false'); x.tabIndex = x === b ? 0 : -1; }); paineis.forEach(function(p){ p.hidden = p.getAttribute('data-'+attr) !== b.getAttribute('data-'+attr); }); }
    bts.forEach(function(b, i){ b.tabIndex = i ? -1 : 0; b.addEventListener('click', function(){ sel(b); }); b.addEventListener('keydown', function(e){ var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if(d){ var n = bts[(i + d + bts.length) % bts.length]; n.focus(); sel(n); e.preventDefault(); } }); });
  }
  abas(site.querySelector('.dias'), 'dia');
  abas(site.querySelector('.abas'), 'grupo', site.querySelector('#gu-equipe'));

  if(!('IntersectionObserver' in window) || reduz) return;
  var alto = window.innerHeight;
  var rv = [].slice.call(site.querySelectorAll('.rv'));
  rv.forEach(function(el){ if(el.getBoundingClientRect().top > alto) el.classList.add('fora'); });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove('fora'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -8% 0px' });
  rv.forEach(function(el){ io.observe(el); }); estado.obs.push(io);
  var br = site.querySelector('.barras');
  if(br && br.getBoundingClientRect().top > alto){ br.classList.add('zero'); var io2 = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ br.classList.remove('zero'); io2.disconnect(); } }, { threshold:.5 }); io2.observe(br); estado.obs.push(io2); }
}
