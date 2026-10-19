/* site-tpl-ippon.js — Template "Ippon" do site público por escola (pré-build #8, Judô).
 *
 * Estrutura inspirada no demo de futebol americano do campo.bold-themes (demo-01/football); implementação 100% original.
 * Identidade: índigo do judogi (cor principal), amarelo do tatame (cor de destaque) e vermelho do sol (cor de botão),
 * faixa de tatame trançado com bordas de pincel sumi, hanko vermelho antes dos títulos, Bebas Neue + Outfit e kanji
 * (Noto Serif JP, só os caracteres usados) quando a modalidade é judô.
 *
 * Seções: topo com destaques (painel → agenda/avisos do APP) · faixa de tatame com placar de judô (só se lançado),
 * mural (app) e vídeos (só se lançados) · "força & respeito" e "formando judocas" (texto + números reais + foto) ·
 * graduação (faixas + kyu/dan) + agenda · quadro semanal em grade + núcleos · dojô (programas) · judoca do mês (só se
 * preenchido) · equipe em carrossel · app · loja · redes · rodapé.
 *
 * Regra da biblioteca: nada inventado. Tudo do painel passa por esc(); links e fotos por url().
 */
import { SECAO_LOJA, produtosLoja, ilustracao, linkCompra } from './site-loja.js';

export var meta = {
  nome: 'Ippon',
  descricao: 'Dojô em índigo e tatame: destaques e mural do app, placar de judô (ippon, waza-ari), graduação por kyu, quadro semanal em grade, judoca do mês, equipe em carrossel e loja.',
  modalidades: ['judo', 'todas']
};

var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var TIT = { c:'titulo', r:'Título', max:50 };
var DEST = { c:'destaque', r:'Parte final do título (na cor de destaque)', max:24 };
var DIAS = [['seg', 'Segunda', 'Seg'], ['ter', 'Terça', 'Ter'], ['qua', 'Quarta', 'Qua'], ['qui', 'Quinta', 'Qui'], ['sex', 'Sexta', 'Sex'], ['sab', 'Sábado', 'Sáb'], ['dom', 'Domingo', 'Dom']];
var MESES = [['01','Jan'],['02','Fev'],['03','Mar'],['04','Abr'],['05','Mai'],['06','Jun'],['07','Jul'],['08','Ago'],['09','Set'],['10','Out'],['11','Nov'],['12','Dez']];
var RESULTADOS = [['ippon', 'Ippon'], ['waza-ari', 'Waza-ari'], ['decisao', 'Decisão'], ['hansoku', 'Hansoku-make']];
var JUDOGI = [['azul', 'Azul'], ['branco', 'Branco']];
var TIPOS = [['adulto', 'Adulto / iniciantes'], ['infantil', 'Infantil'], ['competicao', 'Competição / randori']];
var NUM = { c:'numeros', r:'Números (até 2; vazio = números reais do cadastro)', t:'lista', max:2, resumo:'valor', nomeItem:'Número', item:[ { c:'valor', r:'Valor', max:6 }, { c:'rotulo', r:'Rótulo', max:28 } ] };

export var schema = { secoes: [
  { id:'topo', r:'Topo', ajuda:'Os destaques do topo saem sozinhos do app: o próximo evento e o último aviso marcados com "Mostrar no site". Aqui você define o destaque principal e pode fixar até 3 outros.', campos:[
    { c:'titulo', r:'Título (palavra entre *asteriscos* na cor do tatame)', max:60, ph:'O *caminho* suave' }, { c:'texto', r:'Texto', t:'area', max:180 },
    { c:'botao', r:'Botão principal', max:28, ph:'Agendar aula experimental' }, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'slides', r:'Destaques fixos', t:'lista', max:3, resumo:'titulo', nomeItem:'Destaque', item:[ { c:'selo', r:'Etiqueta', max:30 }, { c:'titulo', r:'Título (*palavra* em destaque)', max:60 }, { c:'foto', r:'Foto', t:'foto' }, { c:'link', r:'Link do botão (https://…)', t:'link', max:200 } ] } ] },
  { id:'resultados', r:'Placar de lutas', ajuda:'Até 2 lutas em destaque logo abaixo do topo. Sem itens, o placar não aparece.', campos:[
    { c:'itens', r:'Lutas', t:'lista', max:2, resumo:'atleta', nomeItem:'Luta', item:[ { c:'dia', r:'Dia', max:2 }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' },
      { c:'atleta', r:'Atleta da escola', max:30 }, { c:'judogi', r:'Judogi do atleta', t:'select', opcoes:JUDOGI, ph:'Cor' }, { c:'categoria', r:'Categoria (ex.: -57 kg)', max:20 },
      { c:'adversario', r:'Adversário', max:30 }, { c:'equipeAdv', r:'Equipe do adversário', max:30 },
      { c:'resultado', r:'Resultado', t:'select', opcoes:RESULTADOS, ph:'Resultado' }, { c:'tecnica', r:'Golpe · fase', max:40, ph:'Uchi-mata · final' }, { c:'shidos', r:'Punições (shido) do atleta', max:1, ph:'0' } ] } ] },
  { id:'mural', r:'Mural de avisos', ajuda:'Os avisos publicados no app com "Mostrar no site" entram aqui sozinhos. Sem avisos, a seção não aparece.', campos:[ SELO, TIT, DEST ] },
  { id:'videos', r:'Vídeos', ajuda:'Galeria em carrossel (links do YouTube/Instagram). Sem vídeos, a galeria não aparece.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Vídeos', t:'lista', max:8, resumo:'titulo', nomeItem:'Vídeo', item:[ { c:'titulo', r:'Título', max:50 }, { c:'categoria', r:'Categoria', max:24 }, { c:'link', r:'Link (https://…)', t:'link', max:200 }, { c:'foto', r:'Capa', t:'foto' } ] } ] },
  { id:'forca', r:'Bloco "Força & respeito"', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:260 }, { c:'foto', r:'Foto', t:'foto' }, NUM ] },
  { id:'formando', r:'Bloco "Formando judocas"', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:260 }, { c:'foto', r:'Foto', t:'foto' }, NUM ] },
  { id:'graduacao', r:'Graduação', ajuda:'As faixas e cores vêm da escada cadastrada. Aqui você escreve o grau de cada uma (ex.: 7º kyu), na mesma ordem.', campos:[ TIT,
    { c:'itens', r:'Grau por faixa (na ordem da escada)', t:'lista', max:16, resumo:'grau', nomeItem:'Faixa', item:[ { c:'grau', r:'Grau', max:12, ph:'7º kyu' } ] } ] },
  { id:'agenda', r:'Agenda', ajuda:'Eventos do app com "Mostrar no site" entram sozinhos. Use a lista só para eventos que não estão no app.', campos:[ TIT,
    { c:'itens', r:'Eventos extras', t:'lista', max:6, resumo:'titulo', nomeItem:'Evento', item:[ { c:'dia', r:'Dia', max:2 }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' }, { c:'titulo', r:'Evento', max:50 }, { c:'local', r:'Local · horário', max:60 } ] } ] },
  { id:'horarios', r:'Quadro de horários', ajuda:'Grade da semana (horários nas linhas, dias nas colunas). Sem aulas, o quadro não aparece.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Aulas', t:'lista', max:40, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS.map(function(d){ return [d[0], d[1]]; }), ph:'Dia' },
      { c:'horario', r:'Horário de início', max:8, ph:'19h' }, { c:'aula', r:'Aula', max:24, ph:'Competição' }, { c:'local', r:'Núcleo', max:24 }, { c:'tipo', r:'Cor', t:'select', opcoes:TIPOS, ph:'Tipo' } ] } ] },
  { id:'nucleos', r:'Núcleos', ajuda:'Endereço e WhatsApp de cada núcleo. Lista vazia = núcleos do cadastro.', campos:[
    { c:'lista', r:'Núcleos', t:'lista', max:6, resumo:'nome', nomeItem:'Núcleo', item:[ { c:'nome', r:'Nome', max:40 }, { c:'endereco', r:'Endereço', max:100 }, { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 } ] } ] },
  { id:'programas', r:'Programas (dojô)', ajuda:'Bloco escuro com foto de fundo e até 4 programas.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 }, { c:'foto', r:'Foto de fundo', t:'foto' },
    { c:'itens', r:'Programas', t:'lista', max:4, resumo:'titulo', nomeItem:'Programa', item:[ { c:'titulo', r:'Nome', max:24 }, { c:'texto', r:'Descrição', t:'area', max:100 } ] } ] },
  { id:'judoca', r:'Judoca do mês', ajuda:'Só aparece com nome e foto. Barras e números da temporada são opcionais.', campos:[
    { c:'nome', r:'Nome', max:40 }, { c:'grau', r:'Graduação em destaque (ex.: 1º)', max:4, ph:'1º' }, { c:'texto', r:'Linha de baixo', max:80, ph:'Judoca do mês · faixa preta · -57 kg' }, { c:'foto', r:'Foto', t:'foto' },
    { c:'barras', r:'Barras (até 3)', t:'lista', max:3, resumo:'rotulo', nomeItem:'Barra', item:[ { c:'rotulo', r:'Rótulo', max:24, ph:'Ippons' }, { c:'valor', r:'Porcentagem (0–100)', max:3 } ] },
    { c:'ano', r:'Temporada', max:4 }, { c:'lutas', r:'Lutas', max:4 }, { c:'ippons', r:'Ippons', max:4 }, { c:'medalhas', r:'Medalhas', max:4 } ] },
  { id:'equipe', r:'Equipe', ajuda:'Carrossel com senseis e atletas. Lista vazia = equipe do cadastro.', campos:[ SELO, TIT, DEST,
    { c:'itens', r:'Pessoas', t:'lista', max:12, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:40 }, { c:'grau', r:'Grau (ex.: 5º)', max:4 }, { c:'nivel', r:'Dan ou kyu', t:'select', opcoes:[['DAN', 'Dan'], ['KYU', 'Kyu']], ph:'Dan/kyu' },
      { c:'funcao', r:'Função (ex.: Sensei · infantil)', max:40 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'app', r:'App', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  SECAO_LOJA([ SELO, { c:'titulo', r:'Título', max:30, ph:'Loja' }, { c:'destaque', r:'Parte final do título', max:20, ph:'oficial' } ]),
  { id:'redes', r:'Redes sociais', ajuda:'O Instagram do cadastro aparece sozinho. Seguidores são opcionais (em mil).', campos:[ SELO, { c:'hashtag', r:'Hashtag', max:24, ph:'#KaizenJudo' },
    { c:'instagramN', r:'Seguidores no Instagram (mil)', max:4 }, { c:'youtube', r:'YouTube (https://…)', t:'link', max:200 }, { c:'youtubeN', r:'Inscritos (mil)', max:4 },
    { c:'facebook', r:'Facebook (https://…)', t:'link', max:200 }, { c:'facebookN', r:'Seguidores (mil)', max:4 }, { c:'tiktok', r:'TikTok (https://…)', t:'link', max:200 }, { c:'tiktokN', r:'Seguidores (mil)', max:4 } ] },
  { id:'contato', r:'Contato e rodapé', ajuda:'Endereço e Instagram vêm do cadastro. Com WhatsApp, "Aula experimental" abre a conversa.', campos:[
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 }, { c:'msgWhatsapp', r:'Mensagem pronta', max:140 }, { c:'email', r:'E-mail', max:80 }, { c:'lema', r:'Lema do rodapé (*palavra* em destaque)', max:30, ph:'Caminho *suave*' },
    { c:'parceiros', r:'Parceiros', t:'lista', max:6, resumo:'nome', nomeItem:'Parceiro', item:[ { c:'nome', r:'Nome', max:30 }, { c:'logo', r:'Logo', t:'foto', png:true }, { c:'link', r:'Site (https://…)', t:'link', max:120 } ] } ] }
] };

/* ---------------- textos padrão (genéricos) ---------------- */
var TXT = {
  judo: { topo:'O *caminho* suave', topoTx:'Do primeiro rolamento à faixa preta: judô para crianças e adultos, com a graduação acompanhada pelo app.',
    forca:['Desde a primeira queda', 'Força', '& respeito', 'O judô começa pelo ukemi: aprender a cair para levantar sem medo. Técnica, disciplina e cortesia no tatame e fora dele.'],
    formando:['Escola de judocas', 'Formando', 'judocas', 'Turmas por idade e objetivo, avaliação de cada aluno pelo app e o caminho até a faixa preta com critérios claros.'],
    prog:['Programas', 'Entre para o', 'dojô', 'Do primeiro ukemi ao shiai: escolha a turma certa e acompanhe cada avaliação pelo app.'],
    itens:[['Infantil', 'Quedas seguras, coordenação e respeito para as crianças.'], ['Adulto', 'Técnica de pé e de chão para todos os níveis.'], ['Competição', 'Randori, shiai e preparo para os campeonatos.'], ['Kata', 'As formas tradicionais, rumo à faixa preta.']] },
  arena: { topo:'Treine com quem *vive isso*', topoTx:'Técnica, disciplina e acompanhamento de cada aluno pelo app — do primeiro dia à próxima graduação.',
    forca:['Desde o primeiro treino', 'Força', '& respeito', 'Técnica, disciplina e cortesia dentro e fora do treino, com professores acompanhando cada aluno de perto.'],
    formando:['Escola de atletas', 'Formando', 'atletas', 'Turmas por idade e objetivo, avaliação de cada aluno pelo app e critérios claros de graduação.'],
    prog:['Programas', 'Entre para a', 'equipe', 'Escolha a turma certa e acompanhe cada avaliação pelo app.'],
    itens:[['Infantil', 'Coordenação, foco e respeito em aulas para crianças.'], ['Adulto', 'Fundamentos e condicionamento para todos os níveis.'], ['Competição', 'Treino específico e preparo para os campeonatos.'], ['Avançado', 'Técnica refinada para quem quer ir além.']] }
};
var KJ = { mural:'礼', videos:'技', forca:'心', formando:'道', horas:'場', prog:'一', equipe:'礼', app:'心', loja:'道', hero:'柔道', sol1:'柔', sol2:'道', lema1:'精力善用', lema2:'自他共栄', judoca:'一本' };

/* ---------------- utilitários ---------------- */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null; }
function rgb(h){ return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function tri(h){ return rgb(h).join(','); }
function lum(h){ var c = rgb(h).map(function(v){ v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }
function mix(a, b, p){ var x = rgb(a), y = rgb(b); return '#' + x.map(function(v, i){ var r = Math.round(v + (y[i] - v) * p); return (r < 16 ? '0' : '') + r.toString(16); }).join(''); }
function cores(s){
  var c = s.cores || {};
  var ai = hex6(c.principal) || '#0f1b38', tat = hex6(c.destaque) || '#e6c75a', aka = hex6(c.botao) || '#c8102e';
  if(lum(ai) > .05) ai = mix(ai, '#070b18', .72);                  // fundo escuro com texto branco
  if(lum(tat) < .3) tat = mix(tat, '#ffffff', .6);                  // a faixa de tatame precisa ser clara
  if(lum(aka) > .7 || Math.abs(lum(aka) - lum(tat)) < .05) aka = '#c8102e';
  var t = { ai:ai, tat:tat, aka:aka };
  t.ai2 = mix(ai, '#ffffff', .07); t.ai3 = mix(ai, '#ffffff', .14);
  t.tat2 = mix(tat, '#000000', .1); t.tatTxt = mix(tat, '#000000', .38);
  t.akaInk = lum(aka) > .45 ? '#0f1b38' : '#ffffff';
  t.aiTri = tri(ai); t.tatTri = tri(tat); t.akaTri = tri(aka);
  return t;
}
function iniciais(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); }
function digitos(v){ return String(v == null ? '' : v).replace(/\D/g, ''); }
function hojeLocal(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function horaNum(h){ var m = String(h || '').match(/(\d{1,2})\s*[h:.]?\s*(\d{2})?/); return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 9999; }
var MES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
var ICO_STAT = {
  faixa:'<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="15" width="32" height="10" rx="2"/><path d="M18 15v10M22 15v10"/></svg>',
  pin:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4c-7 0-12 5-12 12 0 9 12 20 12 20s12-11 12-20c0-7-5-12-12-12z"/><circle cx="20" cy="16" r="4"/></svg>',
  pessoa:'<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="14" r="7"/><path d="M6 36c0-8 6-13 14-13s14 5 14 13"/></svg>',
  taca:'<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 6h16v8a8 8 0 01-16 0z"/><path d="M12 9H6c0 5 3 8 6 8M28 9h6c0 5-3 8-6 8M20 22v8M13 34h14"/></svg>'
};
var ICO_PROG = [
  '<svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="18" r="9"/><path d="M20 62l6-24h18l6 24M26 38l-8-8M44 38l8-8"/></svg>',
  '<svg viewBox="0 0 70 70" aria-hidden="true"><rect x="8" y="28" width="54" height="14" rx="3"/><path d="M30 42l-6 20M40 42l6 20"/></svg>',
  '<svg viewBox="0 0 70 70" aria-hidden="true"><path d="M22 10h26v14a13 13 0 01-26 0z"/><path d="M22 14H12c0 8 5 13 10 13M48 14h10c0 8-5 13-10 13M35 37v13M24 60h22"/></svg>',
  '<svg viewBox="0 0 70 70" aria-hidden="true"><path d="M14 54c6-20 16-34 34-40M22 58c4-12 10-20 20-24"/><circle cx="52" cy="12" r="5"/></svg>'
];
var SETA_E = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>', SETA_D = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';
// Bordas de pincel (geradas por script; vão até x=1440). Respingos acima do traço.
var PINCEL = [['M0 80 L0 32.7 L12 42.9 L19 26.4 L29 32.6 L43 49.4 L59 30.2 L79 40.6 L95 27.8 L111 26.8 L125 46.1 L142 51.8 L161 38.4 L181 28.7 L190 53.0 L206 34.4 L218 35.8 L234 51.3 L255 50.0 L271 30.6 L293 51.3 L310 31.9 L325 26.2 L347 28.5 L360 30.2 L378 39.8 L385 46.1 L405 53.5 L427 23.9 L433 31.5 L449 22.8 L460 52.8 L472 38.9 L489 42.7 L505 52.3 L517 46.2 L528 53.4 L543 26.3 L558 26.6 L574 27.7 L588 45.0 L605 29.4 L622 53.0 L635 42.6 L647 34.8 L663 34.4 L681 26.8 L699 34.7 L718 32.7 L731 45.5 L742 35.3 L755 50.0 L766 44.2 L779 32.3 L794 31.3 L813 31.1 L832 44.0 L844 29.6 L862 33.6 L875 37.8 L896 23.7 L916 53.6 L937 52.0 L955 49.4 L969 34.1 L979 27.9 L990 41.5 L1007 51.9 L1027 33.1 L1036 34.4 L1050 37.6 L1066 35.6 L1086 39.4 L1097 31.5 L1116 30.8 L1137 48.6 L1143 43.6 L1150 33.6 L1165 37.8 L1183 9.6 L1191 27.9 L1211 28.4 L1222 34.8 L1238 42.4 L1247 35.2 L1262 46.0 L1269 31.0 L1285 47.9 L1304 43.4 L1316 39.9 L1328 45.4 L1338 41.0 L1346 37.9 L1366 52.2 L1386 48.1 L1399 29.4 L1416 50.8 L1433 46.5 L1440 40.0 L1440 80Z','<circle cx="846" cy="4" r="1.4"/><circle cx="1115" cy="5" r="1.2"/><circle cx="143" cy="25" r="1.4"/><circle cx="34" cy="24" r="1.3"/><circle cx="1215" cy="20" r="3.1"/><circle cx="1371" cy="18" r="3.0"/><circle cx="52" cy="22" r="2.3"/><circle cx="1030" cy="7" r="2.9"/><circle cx="1346" cy="5" r="1.8"/><circle cx="812" cy="24" r="1.6"/><circle cx="259" cy="10" r="2.5"/><circle cx="1085" cy="13" r="1.9"/><circle cx="571" cy="12" r="2.0"/><circle cx="120" cy="16" r="3.4"/><circle cx="594" cy="22" r="1.4"/><circle cx="995" cy="22" r="2.7"/><circle cx="745" cy="16" r="2.6"/><circle cx="1292" cy="8" r="1.2"/><circle cx="1077" cy="26" r="2.3"/><circle cx="638" cy="21" r="1.5"/><circle cx="385" cy="9" r="2.5"/><circle cx="453" cy="10" r="2.7"/><circle cx="1373" cy="11" r="2.8"/><circle cx="595" cy="24" r="2.5"/><circle cx="385" cy="9" r="1.1"/><circle cx="690" cy="13" r="1.4"/>'],['M0 80 L0 38.7 L21 39.0 L36 31.2 L52 48.2 L63 28.5 L80 27.2 L102 44.3 L110 26.4 L117 31.3 L124 39.0 L143 40.5 L157 44.5 L168 53.9 L187 45.8 L197 25.3 L209 49.7 L230 34.2 L251 39.2 L263 28.0 L282 33.6 L293 53.0 L301 32.9 L308 48.3 L323 38.5 L341 29.7 L348 37.8 L359 53.2 L370 50.8 L382 49.9 L390 53.7 L400 47.6 L410 28.1 L426 32.8 L438 38.7 L451 42.1 L460 30.3 L479 33.0 L497 52.3 L518 50.7 L531 22.5 L541 45.7 L560 42.7 L569 30.9 L584 49.9 L594 51.7 L601 33.5 L608 30.9 L623 29.7 L643 53.5 L660 42.4 L667 26.5 L684 42.6 L698 46.5 L720 28.1 L737 51.2 L755 48.2 L766 45.2 L786 37.7 L806 42.0 L818 42.3 L825 43.9 L846 46.4 L863 42.3 L883 28.3 L889 42.8 L899 45.6 L915 51.8 L921 34.4 L930 30.7 L947 38.4 L958 44.6 L971 48.6 L991 36.8 L1002 29.8 L1021 49.8 L1043 33.8 L1056 33.7 L1068 43.5 L1079 49.5 L1093 20.6 L1099 45.8 L1110 31.8 L1124 26.7 L1133 19.5 L1147 43.6 L1165 52.8 L1175 39.3 L1181 39.2 L1190 33.6 L1207 40.6 L1225 37.0 L1245 28.4 L1263 29.6 L1279 51.5 L1294 50.6 L1315 39.0 L1324 46.2 L1341 46.1 L1361 53.5 L1376 48.1 L1396 50.0 L1404 38.3 L1422 31.4 L1429 48.4 L1440 40.0 L1440 80Z','<circle cx="1135" cy="7" r="1.4"/><circle cx="744" cy="21" r="3.1"/><circle cx="993" cy="27" r="2.2"/><circle cx="1367" cy="6" r="1.6"/><circle cx="758" cy="11" r="2.8"/><circle cx="920" cy="17" r="3.1"/><circle cx="806" cy="11" r="2.0"/><circle cx="1217" cy="26" r="1.5"/><circle cx="1225" cy="27" r="2.3"/><circle cx="825" cy="9" r="2.3"/><circle cx="725" cy="19" r="1.1"/><circle cx="1396" cy="16" r="2.0"/><circle cx="1154" cy="18" r="2.2"/><circle cx="995" cy="6" r="2.3"/><circle cx="596" cy="27" r="3.3"/><circle cx="388" cy="15" r="1.3"/><circle cx="624" cy="24" r="3.3"/><circle cx="686" cy="12" r="1.5"/><circle cx="890" cy="26" r="1.3"/><circle cx="1122" cy="5" r="1.5"/><circle cx="327" cy="20" r="1.8"/><circle cx="512" cy="19" r="1.3"/><circle cx="1052" cy="7" r="2.3"/><circle cx="361" cy="9" r="2.3"/><circle cx="629" cy="13" r="2.0"/><circle cx="762" cy="8" r="1.5"/>'],['M0 80 L0 41.3 L20 34.1 L31 37.6 L39 38.5 L50 54.0 L66 37.7 L79 30.8 L92 48.2 L101 44.9 L115 32.2 L134 40.4 L152 42.4 L164 43.3 L172 52.3 L180 30.2 L187 37.1 L203 39.1 L220 35.0 L237 53.1 L259 31.7 L280 26.6 L301 29.8 L321 52.9 L339 47.3 L345 43.6 L366 24.5 L380 16.8 L394 29.6 L402 26.9 L422 31.6 L442 32.8 L462 47.3 L481 42.0 L498 33.8 L508 50.8 L525 38.2 L539 51.1 L552 30.2 L565 44.1 L576 52.3 L589 32.2 L610 30.9 L627 20.3 L633 41.4 L647 34.7 L658 35.0 L675 42.9 L683 33.0 L689 36.4 L698 32.2 L708 35.4 L719 44.5 L737 38.5 L759 48.3 L769 29.6 L789 47.0 L806 46.6 L813 48.7 L832 46.8 L849 36.3 L857 45.5 L877 48.5 L883 32.5 L902 45.8 L911 38.5 L927 27.7 L937 46.0 L948 50.4 L962 50.5 L979 32.8 L993 34.5 L1010 51.0 L1018 33.6 L1035 44.0 L1050 27.9 L1069 29.1 L1080 30.8 L1100 34.9 L1114 29.2 L1120 40.3 L1126 53.9 L1143 47.6 L1159 44.6 L1167 46.3 L1184 44.1 L1201 28.4 L1207 33.4 L1227 44.4 L1244 31.8 L1256 48.4 L1267 33.9 L1277 36.8 L1287 29.3 L1304 32.6 L1320 53.4 L1327 52.5 L1337 31.6 L1348 34.7 L1362 28.2 L1372 51.6 L1380 35.9 L1399 27.1 L1415 46.7 L1429 32.2 L1440 40.0 L1440 80Z','<circle cx="373" cy="11" r="1.0"/><circle cx="124" cy="18" r="3.5"/><circle cx="1297" cy="12" r="1.9"/><circle cx="935" cy="16" r="3.0"/><circle cx="289" cy="13" r="3.4"/><circle cx="413" cy="20" r="2.1"/><circle cx="715" cy="24" r="3.4"/><circle cx="819" cy="28" r="1.7"/><circle cx="466" cy="12" r="1.8"/><circle cx="1421" cy="8" r="3.1"/><circle cx="1031" cy="19" r="2.2"/><circle cx="1223" cy="5" r="3.3"/><circle cx="530" cy="10" r="1.0"/><circle cx="1141" cy="5" r="3.1"/><circle cx="330" cy="27" r="2.5"/><circle cx="1420" cy="5" r="1.9"/><circle cx="1439" cy="5" r="1.8"/><circle cx="515" cy="15" r="2.7"/><circle cx="551" cy="13" r="1.8"/><circle cx="541" cy="21" r="3.2"/><circle cx="792" cy="11" r="3.4"/><circle cx="409" cy="21" r="2.9"/><circle cx="732" cy="11" r="1.8"/><circle cx="1045" cy="27" r="3.3"/><circle cx="647" cy="19" r="2.2"/><circle cx="371" cy="24" r="2.5"/>']];
function pincel(i, cls){ var p = PINCEL[i % PINCEL.length]; return '<div class="pincel '+cls+'" aria-hidden="true"><svg viewBox="0 0 1440 80" preserveAspectRatio="none"><path style="fill:var(--tatami)" d="'+p[0]+'"/><g style="fill:var(--tatami)">'+p[1]+'</g></svg></div>'; }

var CSS_BASE = '.ip,.ip *,.ip *::before,.ip *::after{box-sizing:border-box}\
.ip img{max-width:100%;display:block}\
.ip a{color:inherit;text-decoration:none}\
.ip button{font:inherit;cursor:pointer}\
.ip h1,.ip h2,.ip h3,.ip h4,.ip p,.ip blockquote,.ip figure{margin:0}\
.ip h1,.ip h2,.ip h3{overflow-wrap:break-word;font-weight:400}\
.ip :focus-visible{outline:3px solid var(--aka);outline-offset:3px;border-radius:4px}\
.ip .ct{width:var(--ct);margin-inline:auto}\
.ip .k{font:600 12.5px/1 var(--corpo);letter-spacing:.18em;text-transform:uppercase}\
.ip .kj{font-family:var(--kanji);font-weight:900}\
.ip .tit{position:relative;padding-left:26px}\
.ip .tit::before{content:"";position:absolute;left:0;top:6px;bottom:6px;width:7px;background:var(--tatami)}\
.ip .tit .k{color:var(--suave);display:flex;align-items:center;gap:10px;flex-wrap:wrap}\
.ip .tit h2{margin-top:8px;font:400 clamp(48px,6.4vw,92px)/.88 var(--disp);letter-spacing:.01em;text-wrap:balance}\
.ip .tit h2 em{font-style:normal;color:var(--tatami-txt)}\
.ip .hanko{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:5px;background:var(--aka);color:#fff;font:900 13px/1 var(--kanji);transform:rotate(-6deg)}\
.ip .cab{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:34px}\
.ip .mais{display:inline-flex;align-items:center;gap:10px;font:600 13px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase}\
.ip .mais i{width:28px;height:28px;border-radius:50%;border:2px solid currentColor;display:grid;place-items:center;font-style:normal;transition:transform .4s var(--ease),background .3s,color .3s}\
.ip .mais:hover i{transform:translateX(4px);background:var(--texto);color:var(--washi)}\
.ip .app-tag{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;background:rgba(0,230,118,.14);color:#0b7a45;font:700 10.5px/1 var(--corpo);letter-spacing:.08em;text-transform:uppercase}\
.ip .app-tag::before{content:"";width:7px;height:7px;border-radius:50%;background:#00E676;box-shadow:0 0 0 3px rgba(0,230,118,.25)}\
.ip .app-tag.cl{background:rgba(255,255,255,.14);color:#fff}\
.ip .btn{display:inline-flex;align-items:center;gap:10px;padding:15px 26px;border-radius:99px;font:700 14px/1 var(--corpo);letter-spacing:.06em;text-transform:uppercase;border:2px solid transparent;transition:transform .5s var(--ease),box-shadow .5s var(--ease),background .4s,color .4s}\
.ip .btn-t{background:var(--tatami);color:var(--tatami-ink)}\
.ip .btn-t:hover{transform:translateY(-3px);box-shadow:0 16px 30px -14px rgba(var(--tatami-tri),.9)}\
.ip .btn-c{border-color:rgba(255,255,255,.7);color:#fff}\
.ip .btn-c:hover{background:#fff;color:var(--ai)}\
.ip .btn-ai{background:var(--ai);color:#fff}\
.ip .btn-ai:hover{background:var(--aka)}\
.ip .btn .pl{width:22px;height:22px;border-radius:50%;border:2px solid currentColor;display:grid;place-items:center}\
.ip .btn .pl svg{width:9px;height:9px;fill:currentColor;margin-left:2px}\
.ip .rv{transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.ip .rv.fora{opacity:0;transform:translateY(30px)}\
.ip .tatami{position:relative;background-color:var(--tatami);background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.035) 0 2px,transparent 2px 7px),repeating-linear-gradient(0deg,rgba(255,255,255,.09) 0 1px,transparent 1px 4px),linear-gradient(180deg,rgba(255,255,255,.08),rgba(0,0,0,.05))}\
.ip .tatami .tit::before{background:var(--ai)}\
.ip .tatami .tit .k{color:rgba(var(--ai-tri),.75)}\
.ip .tatami .tit h2 em{color:var(--aka)}\
.ip .pincel{position:absolute;left:0;right:0;height:80px;pointer-events:none;z-index:3}\
.ip .pincel svg{display:block;width:100%;height:100%}\
.ip .pincel.cima{top:-79px}\
.ip .pincel.baixo{bottom:-79px;transform:scaleY(-1)}\
.ip .topo{position:fixed;top:0;left:0;right:0;z-index:40;background:var(--ai);color:#fff;transition:box-shadow .5s var(--ease),background .4s}\
.ip .topo .ct{display:flex;align-items:center;gap:30px;height:78px}\
.ip .topo.fixo{box-shadow:0 14px 40px -24px rgba(0,0,0,.8);background:rgba(var(--ai-tri),.96);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}\
.ip .marca{display:flex;align-items:center;gap:12px;flex:none}\
.ip .marca .selo{width:46px;height:46px}\
.ip .marca b{display:block;font:400 26px/.9 var(--disp);letter-spacing:.04em}\
.ip .marca small{font:600 10px/1 var(--corpo);letter-spacing:.22em;text-transform:uppercase;opacity:.7}\
.ip .menu{display:flex;gap:26px}\
.ip .menu a{font:600 13px/1 var(--corpo);letter-spacing:.1em;text-transform:uppercase;padding:10px 0;position:relative;opacity:.9}\
.ip .menu a::after{content:"";position:absolute;left:50%;bottom:2px;width:6px;height:6px;border-radius:50%;background:var(--aka);transform:translateX(-50%) scale(0);transition:transform .4s var(--ease)}\
.ip .menu a:hover::after{transform:translateX(-50%) scale(1)}\
.ip .dir{margin-left:auto;display:flex;align-items:center;gap:16px}\
.ip .dir .ic{width:20px;height:20px;opacity:.85}\
.ip .topo .btn{padding:13px 22px;font-size:12.5px}\
.ip .ham{display:none;width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.35);background:transparent;color:#fff;place-items:center}\
.ip .ham span,.ip .ham span::before,.ip .ham span::after{display:block;width:20px;height:2px;background:currentColor;position:relative;transition:transform .4s var(--ease),background .3s}\
.ip .ham span::before,.ip .ham span::after{content:"";position:absolute;left:0}\
.ip .ham span::before{top:-6px}\
.ip .ham span::after{top:6px}\
.ip .topo.aberto .ham span{background:transparent}\
.ip .topo.aberto .ham span::before{transform:translateY(6px) rotate(45deg)}\
.ip .topo.aberto .ham span::after{transform:translateY(-6px) rotate(-45deg)}\
.ip .hero{position:relative;height:clamp(640px,94vh,880px);margin-top:78px;background:var(--ai);color:#fff;overflow:hidden;isolation:isolate}\
.ip .slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity 1.2s var(--ease),visibility 1.2s}\
.ip .slide.ativo{opacity:1;visibility:visible}\
.ip .slide>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.06);transition:transform 8s linear}\
.ip .slide.ativo>img{transform:scale(1)}\
.ip .slide::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(var(--ai-tri),.92) 0%,rgba(var(--ai-tri),.55) 45%,rgba(var(--ai-tri),.1) 80%),linear-gradient(0deg,rgba(var(--ai-tri),.7),transparent 35%)}\
.ip .slide .ct{position:relative;z-index:2;height:100%;display:flex;align-items:center;padding:20px 0 200px}\
.ip .h-txt{position:relative;max-width:720px;padding-left:30px}\
.ip .h-txt::before{content:"";position:absolute;left:0;top:10px;bottom:90px;width:8px;background:var(--tatami)}\
.ip .h-txt .k{display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:rgba(255,255,255,.9)}\
.ip .h-txt h1{margin:16px 0 30px;font:400 clamp(60px,8.4vw,124px)/.86 var(--disp);letter-spacing:.01em;text-wrap:balance}\
.ip .h-txt h1 em{font-style:normal;color:var(--tatami)}\
.ip .h-txt .acoes{display:flex;gap:14px;flex-wrap:wrap}\
.ip .slide .h-txt>*{opacity:0;transform:translateY(24px);transition:opacity .9s var(--ease),transform .9s var(--ease)}\
.ip .slide.ativo .h-txt>*{opacity:1;transform:none}\
.ip .slide.ativo .h-txt>*:nth-child(2){transition-delay:.12s}\
.ip .slide.ativo .h-txt>*:nth-child(3){transition-delay:.24s}\
.ip .kanji-hero{position:absolute;z-index:1;right:max(20px,calc((100% - 1180px)/2 + 40px));bottom:210px;display:grid;place-items:center;width:clamp(150px,18vw,250px);aspect-ratio:1;pointer-events:none}\
.ip .kanji-hero::before{content:"";position:absolute;inset:0;border-radius:50%;background:var(--aka);opacity:.9;mix-blend-mode:multiply}\
.ip .kanji-hero span{position:relative;writing-mode:vertical-rl;font:900 clamp(56px,7vw,96px)/1 var(--kanji);color:#fff;letter-spacing:.06em}\
.ip .pontos{position:absolute;z-index:4;right:max(20px,calc((100% - 1180px)/2 - 30px));top:40%;display:flex;flex-direction:column;gap:14px}\
.ip .pontos button{width:13px;height:13px;padding:0;border-radius:50%;border:2px solid #fff;background:transparent;transition:transform .4s var(--ease),background .3s}\
.ip .pontos button[aria-current="true"]{background:#fff;transform:scale(1.25)}\
.ip .banda{padding:0 0 120px}\
.ip .placar{position:relative;z-index:6;margin-top:-140px;display:grid;grid-template-columns:1fr 1fr;gap:22px;transform:translateY(0)}\
.ip .res{display:grid;grid-template-columns:68px 1fr;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 30px 60px -30px rgba(var(--ai-tri),.6);transition:transform .6s var(--ease)}\
.ip .res:hover{transform:translateY(-6px)}\
.ip .res .dt{background:var(--ai);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}\
.ip .res .dt b{font:400 40px/.9 var(--disp)}\
.ip .res .dt span{font:700 11px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;opacity:.75}\
.ip .res .cnt{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;padding:18px 22px}\
.ip .lado b{display:block;font:400 26px/1 var(--disp);letter-spacing:.02em}\
.ip .lado small{display:flex;align-items:center;gap:6px;color:var(--suave);font-size:12.5px;margin-top:4px}\
.ip .lado .jg{width:12px;height:12px;border-radius:3px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}\
.ip .lado.d{text-align:right}\
.ip .lado.d small{justify-content:flex-end}\
.ip .res .meio{text-align:center}\
.ip .res .meio strong{display:block;font:400 34px/1 var(--disp);color:var(--aka);letter-spacing:.04em}\
.ip .res .meio span{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave)}\
.ip .placa{display:flex;gap:6px;justify-content:center;margin-top:8px}\
.ip .placa i{font:700 11px/1 var(--corpo);font-style:normal;width:22px;height:22px;border-radius:5px;display:grid;place-items:center;background:var(--washi);color:var(--suave)}\
.ip .placa i.ok{background:var(--ai);color:#fff}\
.ip .mural{padding-top:90px}\
.ip .mural .cab .mais{color:var(--ai)}\
.ip .notas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}\
.ip .nota{background:#fff;border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 50px -36px rgba(var(--ai-tri),.7);transition:transform .6s var(--ease)}\
.ip .nota:hover{transform:translateY(-8px)}\
.ip .nota .ft{aspect-ratio:16/10;overflow:hidden;background:var(--ai2)}\
.ip .nota .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}\
.ip .nota:hover .ft img{transform:scale(1.06)}\
.ip .nota .tx{padding:20px 22px 24px;display:flex;flex-direction:column;gap:10px;flex:1}\
.ip .nota .q{font:600 12px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--aka)}\
.ip .nota h3{font:400 30px/.95 var(--disp);letter-spacing:.01em}\
.ip .nota p{color:var(--suave);font-size:14.5px}\
.ip .videos{padding-top:80px}\
.ip .trilho-w{position:relative}\
.ip .trilho{display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 66px)/4);gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:6px}\
.ip .trilho::-webkit-scrollbar{display:none}\
.ip .vd{scroll-snap-align:start;display:flex;flex-direction:column;gap:10px}\
.ip .vd .ft{position:relative;aspect-ratio:4/3;border-radius:12px;overflow:hidden;background:var(--ai2)}\
.ip .vd .ft img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}\
.ip .vd:hover .ft img{transform:scale(1.07)}\
.ip .vd .ft::after{content:"";position:absolute;left:12px;top:12px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.95) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M7 5l8 5-8 5z\' fill=\'%230f1b38\'/%3E%3C/svg%3E") center/15px no-repeat}\
.ip .vd small{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:rgba(var(--ai-tri),.65)}\
.ip .vd b{font:400 22px/1 var(--disp);letter-spacing:.02em}\
.ip .seta{position:absolute;top:34%;width:44px;height:44px;border-radius:50%;border:2px solid var(--ai);background:var(--tatami);color:var(--ai);display:grid;place-items:center;transition:background .3s,color .3s}\
.ip .seta:hover{background:var(--ai);color:#fff}\
.ip .seta.e{left:-58px}\
.ip .seta.d{right:-58px}\
.ip .seta svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.5}\
.ip .split{display:grid;grid-template-columns:1fr 1fr;background:var(--washi)}\
.ip .split.cinza{background:#eeebe2}\
.ip .split .txt{padding:110px 60px 110px max(20px,calc((100vw - 1180px)/2));display:flex;flex-direction:column;justify-content:center}\
.ip .split.inv .txt{padding:110px max(20px,calc((100vw - 1180px)/2)) 110px 70px}\
.ip .split .tit h2{font-size:clamp(56px,7vw,104px)}\
.ip .split p.lead{color:var(--suave);max-width:46ch;margin:22px 0 18px;font-size:17px}\
.ip .stats{display:flex;gap:44px;flex-wrap:wrap;margin-top:34px}\
.ip .stat{display:grid;grid-template-columns:auto 1fr;gap:2px 14px;align-items:center}\
.ip .stat svg{grid-row:span 2;width:40px;height:40px;stroke:var(--tatami2);fill:none;stroke-width:2}\
.ip .stat b{font:400 64px/.9 var(--disp);color:var(--ai);font-variant-numeric:tabular-nums}\
.ip .stat small{font:700 11px/1.2 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave)}\
.ip .quadro{position:relative;display:grid;place-items:center;padding:60px;overflow:hidden;background:#eeebe2}\
.ip .split.cinza .quadro{background:var(--washi)}\
.ip .quadro .moldura{position:relative;width:min(470px,100%);aspect-ratio:4/5;border:1px solid rgba(var(--ai-tri),.18);padding:14px;background:#fff}\
.ip .quadro .moldura img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15) contrast(1.05)}\
.ip .quadro .sol{position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:var(--aka);display:grid;place-items:center;color:#fff;font:900 60px/1 var(--kanji);box-shadow:0 20px 40px -20px rgba(var(--aka-tri),.8)}\
.ip .quadro .vert{position:absolute;left:24px;bottom:30px;writing-mode:vertical-rl;font:900 70px/1 var(--kanji);color:rgba(var(--ai-tri),.08);letter-spacing:.1em}\
.ip .dupla{padding:110px 0}\
.ip .dupla .grade{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:40px}\
.ip .dupla .grade>*{min-width:0}\
.ip .dupla h2.p{font:400 clamp(46px,4.8vw,66px)/.9 var(--disp);margin-bottom:22px;display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.ip .tab{border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 24px 50px -40px rgba(var(--ai-tri),.7)}\
.ip .tab .hd{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:var(--ai);color:#fff;font:400 20px/1 var(--disp);letter-spacing:.06em}\
.ip .tab .hd a{font:700 11px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;opacity:.8}\
.ip .tab table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}\
.ip .tab th{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase;color:var(--suave);text-align:left;padding:10px 18px;background:#faf8f2}\
.ip .tab td{padding:10px 18px;border-top:1px solid var(--linha);font:400 22px/1 var(--disp);letter-spacing:.02em}\
.ip .tab td.n{width:40px;color:var(--suave)}\
.ip .tab td.g{font:600 13px/1 var(--corpo);color:var(--suave);white-space:nowrap}\
.ip .tab tr:hover td{background:rgba(var(--tatami-tri),.12)}\
.ip .obi{display:inline-block;vertical-align:middle;margin-right:12px;width:62px;height:13px;border-radius:2px;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.14);position:relative}\
.ip .obi.duo{background:linear-gradient(90deg,var(--c) 50%,var(--c2) 50%)}\
.ip .evts{display:grid;grid-template-columns:1fr 1fr;gap:16px}\
.ip .evt{display:grid;grid-template-columns:60px 1fr;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px -34px rgba(var(--ai-tri),.7);transition:transform .5s var(--ease)}\
.ip .evt:hover{transform:translateY(-4px)}\
.ip .evt .dt{background:var(--tatami);color:var(--tatami-ink);display:flex;flex-direction:column;align-items:center;justify-content:center}\
.ip .evt .dt b{font:400 34px/.9 var(--disp)}\
.ip .evt .dt span{font:700 10.5px/1 var(--corpo);letter-spacing:.14em;text-transform:uppercase}\
.ip .evt .cnt{padding:16px 18px;display:flex;flex-direction:column;gap:6px;min-width:0}\
.ip .evt h3{font:400 27px/.95 var(--disp);letter-spacing:.01em}\
.ip .evt small{color:var(--suave);font:600 12px/1.2 var(--corpo);letter-spacing:.08em;text-transform:uppercase}\
.ip .horas{padding:0 0 110px}\
.ip .grade-h{overflow-x:auto;background:#fff;border-radius:16px;box-shadow:0 24px 50px -40px rgba(var(--ai-tri),.7)}\
.ip .grade-h table{width:100%;min-width:760px;border-collapse:collapse;table-layout:fixed}\
.ip .grade-h th{padding:14px 10px;background:var(--ai);color:#fff;font:400 20px/1 var(--disp);letter-spacing:.06em}\
.ip .grade-h th:first-child{width:86px}\
.ip .grade-h td{padding:8px;border-top:1px solid var(--linha);border-left:1px solid var(--linha);vertical-align:top;height:74px}\
.ip .grade-h td.h{border-left:0;font:400 22px/1 var(--disp);color:var(--suave);text-align:center;vertical-align:middle}\
.ip .aula{display:block;height:100%;border-radius:10px;padding:8px 10px;background:rgba(var(--tatami-tri),.28);border-left:4px solid var(--tatami2);transition:transform .4s var(--ease),box-shadow .4s}\
.ip .aula:hover{transform:translateY(-2px);box-shadow:0 10px 20px -14px rgba(var(--ai-tri),.6)}\
.ip .aula b{display:block;font:400 18px/1 var(--disp);letter-spacing:.02em}\
.ip .aula small{font-size:11.5px;color:var(--suave)}\
.ip .aula.kids{background:rgba(var(--aka-tri),.08);border-color:var(--aka)}\
.ip .aula.comp{background:rgba(var(--ai-tri),.08);border-color:var(--ai)}\
.ip .legenda{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-size:13px;color:var(--suave)}\
.ip .legenda span{display:flex;align-items:center;gap:8px}\
.ip .legenda i{width:14px;height:14px;border-radius:4px;background:rgba(var(--tatami-tri),.5);border-left:3px solid var(--tatami2)}\
.ip .legenda i.kids{background:rgba(var(--aka-tri),.12);border-color:var(--aka)}\
.ip .legenda i.comp{background:rgba(var(--ai-tri),.12);border-color:var(--ai)}\
.ip .nucs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:46px}\
.ip .nuc{background:#fff;border-radius:16px;padding:22px 22px 24px;display:flex;flex-direction:column;gap:8px;border-top:5px solid var(--tatami);transition:transform .5s var(--ease),box-shadow .5s var(--ease)}\
.ip .nuc:hover{transform:translateY(-6px);box-shadow:0 26px 40px -30px rgba(var(--ai-tri),.6)}\
.ip .nuc .k{color:var(--aka)}\
.ip .nuc h3{font:400 32px/.95 var(--disp)}\
.ip .nuc p{color:var(--suave);font-size:14.5px}\
.ip .nuc .btn{align-self:flex-start;margin-top:8px;padding:11px 16px;font-size:12px}\
.ip .dojo{position:relative;background:var(--ai);color:#fff;padding:140px 0 130px;overflow:hidden;isolation:isolate}\
.ip .dojo>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;opacity:.35}\
.ip .dojo::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,var(--ai) 25%,rgba(var(--ai-tri),.55) 70%,rgba(var(--ai-tri),.3))}\
.ip .dojo .tit::before{background:var(--tatami)}\
.ip .dojo .tit .k{color:rgba(255,255,255,.75)}\
.ip .dojo .tit h2{font-size:clamp(60px,8vw,118px);max-width:700px}\
.ip .dojo .tit h2 em{color:var(--tatami)}\
.ip .dojo p.lead{max-width:520px;color:rgba(255,255,255,.8);font-size:18px;margin:22px 0 30px}\
.ip .dojo .acoes{display:flex;gap:14px;flex-wrap:wrap}\
.ip .quatro{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;margin-top:70px}\
.ip .qc{border:1px solid rgba(255,255,255,.16);border-radius:16px;padding:30px 22px;text-align:center;background:rgba(255,255,255,.04);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:transform .6s var(--ease),background .4s,border-color .4s}\
.ip .qc:hover{transform:translateY(-8px);background:rgba(255,255,255,.08);border-color:var(--tatami)}\
.ip .qc svg{width:70px;height:70px;stroke:var(--tatami);fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;margin:0 auto 18px}\
.ip .qc b{display:block;font:400 30px/.95 var(--disp);letter-spacing:.02em}\
.ip .qc p{color:rgba(255,255,255,.7);font-size:14px;margin-top:8px}\
.ip .mvp{position:relative;padding:110px 0 0;background:var(--washi);overflow:hidden}\
.ip .mvp .grade{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:30px;align-items:end}\
.ip .mnome{display:grid;grid-template-columns:auto 1fr;gap:0 24px;align-items:center}\
.ip .mnome .gr{grid-row:span 3;font:400 clamp(90px,11vw,150px)/.8 var(--disp);color:var(--tatami-txt);padding-right:24px;border-right:6px solid var(--tatami)}\
.ip .mnome small{font:400 clamp(30px,3.4vw,46px)/1 var(--disp);color:var(--ai)}\
.ip .mnome b{font:400 clamp(70px,9vw,132px)/.82 var(--disp);color:var(--tatami-txt);font-weight:400}\
.ip .mnome span{font-size:15px;color:var(--suave);margin-top:10px}\
.ip .barras{display:grid;gap:14px;max-width:340px;margin:40px 0}\
.ip .barras div{font:700 11px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;color:var(--suave);display:grid;grid-template-columns:1fr auto;gap:8px}\
.ip .barras div i{grid-column:1/-1;height:7px;border-radius:99px;background:#e6e2d6;overflow:hidden;position:relative}\
.ip .barras div i::after{content:"";position:absolute;inset:0 auto 0 0;width:var(--v);background:linear-gradient(90deg,rgba(var(--tatami-tri),.4),var(--tatami2));border-radius:inherit;transition:width 1.8s var(--ease)}\
.ip .barras.zero i::after{width:0}\
.ip .temporada{display:flex;align-items:center;gap:24px;background:#fff;border-radius:16px;box-shadow:0 30px 60px -36px rgba(var(--ai-tri),.6);padding:18px 24px;margin-bottom:70px;max-width:600px;flex-wrap:wrap}\
.ip .temporada .lb{font:400 22px/1 var(--disp);letter-spacing:.04em}\
.ip .temporada .lb em{display:block;font-style:normal;color:var(--aka)}\
.ip .temporada div{text-align:center;padding-left:22px;border-left:1px solid var(--linha)}\
.ip .temporada div b{display:block;font:400 46px/1 var(--disp);color:var(--ai);font-variant-numeric:tabular-nums}\
.ip .temporada div small{font:700 10.5px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;color:var(--suave)}\
.ip .mfoto{position:relative;align-self:end;aspect-ratio:4/5}\
.ip .mfoto::before{content:"";position:absolute;left:14%;right:-2%;top:16%;aspect-ratio:1;border-radius:50%;background:var(--aka);opacity:.92}\
.ip .mfoto img{position:relative;width:100%;height:100%;object-fit:cover;object-position:50% 20%;-webkit-mask-image:linear-gradient(180deg,#000 80%,transparent);mask-image:linear-gradient(180deg,#000 80%,transparent);border-radius:20px 20px 0 0}\
.ip .mfoto .kj{position:absolute;right:-6px;bottom:30px;writing-mode:vertical-rl;color:#fff;font-size:44px;text-shadow:0 4px 18px rgba(0,0,0,.35);letter-spacing:.1em}\
.ip .equipe{padding:110px 0 100px;background:#fff}\
.ip .elenco{display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 44px)/3);gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}\
.ip .elenco::-webkit-scrollbar{display:none}\
.ip .pess{scroll-snap-align:start;position:relative;aspect-ratio:4/5;border-radius:16px;overflow:hidden;background:var(--ai2);color:#fff}\
.ip .pess img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;transition:transform 1s var(--ease)}\
.ip .pess:hover img{transform:scale(1.05)}\
.ip .pess::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(var(--ai-tri),.95) 0%,rgba(var(--ai-tri),.15) 45%,transparent 65%)}\
.ip .pess .tx{position:absolute;left:20px;right:20px;bottom:20px;z-index:2;display:grid;grid-template-columns:auto 1fr;gap:2px 16px;align-items:center}\
.ip .pess .gr{grid-row:span 3;font:400 54px/.85 var(--disp);color:var(--tatami);padding-right:16px;border-right:2px solid rgba(255,255,255,.5);text-align:center}\
.ip .pess .gr small{display:block;font:600 10px/1 var(--corpo);letter-spacing:.14em;color:#fff;opacity:.75;margin-top:4px}\
.ip .pess b{font:400 28px/.95 var(--disp);letter-spacing:.02em}\
.ip .pess b span{color:var(--tatami)}\
.ip .pess .fn{font-size:12.5px;opacity:.8}\
.ip .pontos2{display:flex;gap:10px;justify-content:center;margin-top:26px}\
.ip .pontos2 button{width:11px;height:11px;border-radius:50%;border:2px solid var(--ai);background:transparent;padding:0;transition:background .3s,transform .3s}\
.ip .pontos2 button[aria-current="true"]{background:var(--ai);transform:scale(1.2)}\
.ip .app{padding:110px 0;background:var(--washi)}\
.ip .app .grade{display:grid;grid-template-columns:minmax(0,6fr) minmax(0,5fr);gap:60px;align-items:center}\
.ip .app p.lead{color:var(--suave);font-size:18px;max-width:46ch;margin:22px 0 26px}\
.ip .recursos{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;margin:0 0 30px;padding:0;list-style:none}\
.ip .recursos li{display:flex;gap:12px;font-weight:600}\
.ip .recursos li::before{content:"";flex:none;width:20px;height:20px;margin-top:2px;border-radius:50%;background:var(--aka) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\'%3E%3Cpath d=\'M5 10.5l3.2 3L15 7\' fill=\'none\' stroke=\'%23fff\' stroke-width=\'2.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E") center/14px no-repeat}\
.ip .cel{width:290px;max-width:100%;margin-inline:auto;aspect-ratio:9/18.5;border-radius:42px;background:#0b0f1c;padding:12px;box-shadow:0 50px 80px -40px rgba(var(--ai-tri),.7),inset 0 0 0 2px #2a3352;transform:rotate(-3deg);transition:transform 1s var(--ease)}\
.ip .cel:hover{transform:rotate(0) translateY(-8px)}\
.ip .tela{height:100%;border-radius:32px;overflow:hidden;background:var(--washi);display:flex;flex-direction:column}\
.ip .tela .tp{background:var(--ai);color:#fff;padding:22px 16px 18px;display:flex;flex-direction:column;gap:14px}\
.ip .tela .who{display:flex;gap:10px;align-items:center}\
.ip .tela .av{width:38px;height:38px;border-radius:50%;background:var(--aka);display:grid;place-items:center;font:400 18px/1 var(--disp)}\
.ip .tela .who b{font:400 19px/1 var(--disp);letter-spacing:.06em;display:block}\
.ip .tela .who small{opacity:.7;font-size:10.5px}\
.ip .tela .lb{display:flex;justify-content:space-between;font:700 10px/1 var(--corpo);letter-spacing:.12em;text-transform:uppercase;opacity:.8}\
.ip .tela .bar{height:12px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden}\
.ip .tela .bar i{display:block;height:100%;width:68%;border-radius:99px;background:linear-gradient(90deg,#f2c524,#ef7d1a)}\
.ip .tela .lista{padding:14px;display:flex;flex-direction:column;gap:10px;font-size:12px}\
.ip .mini{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:12px;background:#fff}\
.ip .mini i{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font:400 16px/1 var(--disp);font-style:normal;background:var(--tatami);color:var(--tatami-ink);flex:none}\
.ip .mini b{display:block;font:400 17px/1 var(--disp);letter-spacing:.02em}\
.ip .mini small{color:var(--suave);font-size:10.5px}\
.ip .loja{padding:110px 0;background:#fff}\
.ip .prods{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}\
.ip .prod{display:flex;flex-direction:column;gap:6px}\
.ip .prod .ph{aspect-ratio:1;border-radius:16px;background:var(--washi);background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.025) 0 2px,transparent 2px 7px);display:grid;place-items:center;margin-bottom:12px;transition:transform .7s var(--ease)}\
.ip .prod:hover .ph{transform:translateY(-8px)}\
.ip .prod .ph svg{width:76%;height:auto;filter:drop-shadow(0 18px 18px rgba(var(--ai-tri),.2))}\
.ip .prod h3{font:400 28px/.95 var(--disp);letter-spacing:.01em}\
.ip .prod p{color:var(--suave);font-size:14px}\
.ip .prod .pf{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:auto;padding-top:10px}\
.ip .prod .pf b{font:400 30px/1 var(--disp);color:var(--ai)}\
.ip .prod .btn{padding:10px 16px;font-size:12px}\
.ip .redes{padding:110px 0 120px}\
.ip .redes .grade{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);gap:40px;align-items:center}\
.ip .redes .tit h2{font-size:clamp(52px,6.4vw,96px);color:var(--ai);overflow-wrap:anywhere}\
.ip .socs{display:grid;grid-template-columns:1fr 1fr;gap:28px 30px}\
.ip .soc b{display:block;font:400 clamp(56px,6vw,82px)/.9 var(--disp);color:var(--ai);font-variant-numeric:tabular-nums}\
.ip .soc a{font:700 12px/1 var(--corpo);letter-spacing:.16em;text-transform:uppercase;color:var(--ai);opacity:.8}\
.ip .rod{background:var(--ai);color:#fff;padding:70px 0 30px}\
.ip .rod .k.c{display:block;text-align:center;color:rgba(255,255,255,.6);margin-bottom:26px}\
.ip .parc{display:flex;justify-content:space-around;align-items:center;gap:26px;flex-wrap:wrap;padding-bottom:46px;border-bottom:1px solid rgba(255,255,255,.12)}\
.ip .parc span{font:400 30px/1 var(--disp);letter-spacing:.06em;opacity:.6;transition:opacity .3s}\
.ip .parc span:hover{opacity:1}\
.ip .cols{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.2fr 1.3fr;gap:30px;padding:46px 0}\
.ip .cols>div{min-width:0}\
.ip .lema{display:flex;align-items:center;gap:16px}\
.ip .lema .selo{width:74px;height:74px;flex:none}\
.ip .lema b{font:400 30px/.92 var(--disp);letter-spacing:.02em;padding-left:16px;border-left:2px solid #fff}\
.ip .lema b em{display:block;font-style:normal;color:var(--tatami)}\
.ip .cols h4{font:400 22px/1 var(--disp);letter-spacing:.08em;margin-bottom:16px}\
.ip .cols ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}\
.ip .cols li,.ip .cols li a{color:rgba(255,255,255,.72);font-size:14.5px}\
.ip .cols li a:hover{color:#fff}\
.ip .insta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}\
.ip .insta img{aspect-ratio:1;object-fit:cover;border-radius:8px;background:var(--ai2)}\
.ip .cop{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:22px;border-top:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.5);font-size:13.5px}\
.ip .cop a{color:#fff;font-weight:700}\
@media (max-width:1280px){.ip .seta.e{left:-6px}\
.ip .seta.d{right:-6px}}\
@media (max-width:1180px){.ip .menu,.ip .dir .ic,.ip .topo .dir .btn{display:none}\
.ip .ham{display:grid}\
.ip .topo.aberto .menu{display:flex;position:absolute;top:100%;left:0;right:0;flex-direction:column;gap:0;background:var(--ai);padding:6px 20px 16px;box-shadow:0 30px 40px -20px rgba(0,0,0,.6)}\
.ip .topo.aberto .menu a{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)}}\
@media (max-width:1024px){.ip .notas{grid-template-columns:repeat(2,minmax(0,1fr))}\
.ip .trilho{grid-auto-columns:calc((100% - 22px)/2)}\
.ip .dupla .grade,.ip .app .grade,.ip .redes .grade{grid-template-columns:1fr}\
.ip .quatro,.ip .prods{grid-template-columns:repeat(2,minmax(0,1fr))}\
.ip .elenco{grid-auto-columns:calc((100% - 22px)/2)}\
.ip .cols{grid-template-columns:1fr 1fr 1fr}\
.ip .cols>div:first-child{grid-column:1/-1}}\
@media (max-width:860px){.ip .placar{grid-template-columns:1fr;margin-top:-170px}\
.ip .split,.ip .split.inv{grid-template-columns:1fr}\
.ip .split.inv .quadro{order:2}\
.ip .split .txt,.ip .split.inv .txt{padding:80px 20px}\
.ip .quadro{padding:50px 30px}\
.ip .mvp .grade{grid-template-columns:1fr}\
.ip .mfoto{max-width:400px;width:100%;margin-inline:auto}\
.ip .nucs{grid-template-columns:1fr}\
.ip .kanji-hero{display:none}}\
@media (max-width:620px){.ip .hero{height:auto;min-height:700px}\
.ip .slide .ct{align-items:flex-start;padding:70px 0 300px}\
.ip .h-txt{padding-left:20px}\
.ip .h-txt::before{width:6px}\
.ip .pontos{flex-direction:row;top:auto;bottom:320px;right:16px}\
.ip .placar{margin-top:-280px}\
.ip .res .cnt{grid-template-columns:1fr;text-align:center}\
.ip .lado.d{text-align:center}\
.ip .lado small,.ip .lado.d small{justify-content:center}\
.ip .notas,.ip .evts,.ip .quatro{grid-template-columns:1fr}\
.ip .trilho,.ip .elenco{grid-auto-columns:82%}\
.ip .seta{display:none}\
.ip .stats{gap:26px}\
.ip .stat b{font-size:52px}\
.ip .recursos{grid-template-columns:1fr}\
.ip .prods{grid-template-columns:1fr 1fr;gap:14px}\
.ip .prod h3{font-size:22px}\
.ip .prod .pf{flex-direction:column;align-items:flex-start}\
.ip .temporada div{padding-left:14px}\
.ip .socs{gap:22px 16px}\
.ip .cols{grid-template-columns:1fr 1fr}}\
@media (prefers-reduced-motion:reduce){.ip,.ip *,.ip *::before,.ip *::after{transition:none!important;animation:none!important}\
.ip .rv.fora{opacity:1;transform:none}}\
.ip .dojo .tit h2 em,.ip .h-txt h1 em{color:var(--tatami)}\
.ip .hanko.lat{font-family:var(--disp);font-size:15px;font-weight:400}\
.ip .h-txt .h1{margin:16px 0 30px;font:400 clamp(54px,7.4vw,108px)/.86 var(--disp);letter-spacing:.01em;text-wrap:balance}\
.ip .h-txt .h1 em{font-style:normal;color:var(--tatami)}\
.ip .h-txt p{max-width:52ch;margin:-14px 0 26px;color:rgba(255,255,255,.88);font-size:17px}\
.ip .marca .selo{border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--ai2);border:2px solid var(--tatami);font:400 22px/1 var(--disp);color:#fff}\
.ip .marca .selo img,.ip .lema .selo img,.ip .tela .av img{width:100%;height:100%;object-fit:cover}\
.ip .lema .selo{border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--ai2);border:2px solid var(--tatami);font:400 30px/1 var(--disp)}\
.ip .tela .av{overflow:hidden}\
.ip .placar.um{grid-template-columns:minmax(0,640px)}\
.ip .notas.n1{grid-template-columns:minmax(0,420px)}\
.ip .notas.n2{grid-template-columns:repeat(2,minmax(0,1fr))}\
.ip .banda.sem-placar .mural{padding-top:120px}\
.ip .split .stats:empty{display:none}\
.ip .quatro.n3{grid-template-columns:repeat(3,minmax(0,1fr))}\
.ip .pess .ini{position:absolute;inset:0;display:grid;place-items:center;font:400 120px/1 var(--disp);color:rgba(255,255,255,.18)}\
.ip .pess .gr.sem{display:none}\
.ip .pess .tx.sg{grid-template-columns:1fr}\
.ip .ag-vazia{background:#fff;border-radius:14px;padding:26px;display:grid;gap:14px;justify-items:start;box-shadow:0 20px 40px -34px rgba(var(--ai-tri),.7)}\
.ip .ag-vazia p{color:var(--suave);max-width:46ch}\
.ip .prod .ph{overflow:hidden}\
.ip .prod .ph img{width:100%;height:100%;object-fit:cover;border-radius:16px}\
.ip .parc img{max-height:50px;max-width:150px;object-fit:contain;filter:grayscale(1) brightness(1.8)}\
.ip .parc a{opacity:.6;transition:opacity .3s}\
.ip .parc a:hover{opacity:1}\
.ip .cols li{overflow-wrap:anywhere}\
.ip .soc .arroba{display:block;font:400 clamp(34px,3.6vw,52px)/.95 var(--disp);color:var(--ai);overflow-wrap:anywhere}\
.ip .topo .menu .so-m{display:none}\
@media (max-width:1180px){.ip .topo.aberto .menu .so-m{display:block}}\
@media (max-width:1024px){.ip .quatro.n3{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (max-width:620px){.ip .quatro.n3,.ip .notas.n2{grid-template-columns:1fr}}';

function css(t){
  return '\
.ip{--ai:'+t.ai+';--ai2:'+t.ai2+';--ai3:'+t.ai3+';--ai-tri:'+t.aiTri+';--tatami:'+t.tat+';--tatami2:'+t.tat2+';--tatami-tri:'+t.tatTri+';--tatami-ink:'+t.ai+';--tatami-txt:'+t.tatTxt+';\
 --aka:'+t.aka+';--aka-tri:'+t.akaTri+';--aka-ink:'+t.akaInk+';--washi:#f6f4ee;--branco:#fff;--linha:#e3dfd2;--texto:#141a2c;--suave:#5d6274;\
 --ease:cubic-bezier(.16,1,.3,1);--disp:"Bebas Neue","Arial Narrow",Impact,sans-serif;--corpo:"Outfit",system-ui,-apple-system,"Segoe UI",sans-serif;--kanji:"Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif;--ct:min(1180px,calc(100% - 40px));\
 position:relative;background:var(--washi);color:var(--texto);font:400 16px/1.6 var(--corpo);-webkit-font-smoothing:antialiased;overflow-x:clip;display:flow-root}\
@media (max-width:620px){.ip{--ct:calc(100% - 32px)}}\
' + CSS_BASE;
}

export function render(s, h){
  var esc = h.esc, url = h.url;
  var modReal = String(h.modalidade || s.modalidade || '').toLowerCase();
  var judo = modReal === 'judo';
  var X = TXT[judo ? 'judo' : 'arena'];
  var V = (h.VOCAB && (h.VOCAB[modReal] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && h.LIDER[modReal]) || 'Professor';
  var t = cores(s);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('ip-fonts')){
    var l = document.createElement('link'); l.id = 'ip-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
    var l2 = document.createElement('link'); l2.rel = 'stylesheet';
    l2.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&text=%E4%B8%80%E4%BB%96%E5%85%B1%E5%8A%9B%E5%96%84%E5%A0%B4%E5%BF%83%E6%8A%80%E6%9C%AC%E6%9F%94%E6%A0%84%E7%94%A8%E7%A4%BC%E7%B2%BE%E8%87%AA%E9%81%93&display=swap';
    document.head.appendChild(l2);
  }
  var st = document.getElementById('ip-css');
  if(!st){ st = document.createElement('style'); st.id = 'ip-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function estrela(txt){ var p = String(txt || '').split('*'); return p.map(function(x, i){ return i % 2 ? '<em>'+esc(x)+'</em>' : esc(x); }).join(''); }
  function titulo(sec, padT, padD){ var a = cx(sec, 'titulo', padT), d = cx(sec, 'destaque', padD || ''); return esc(a) + (d ? ' <em>'+esc(d)+'</em>' : ''); }
  function hanko(k){ return judo ? '<span class="hanko kj" lang="ja" aria-hidden="true">'+KJ[k]+'</span>' : '<span class="hanko lat" aria-hidden="true">'+esc(ini.charAt(0))+'</span>'; }
  function cab(sec, k, selo, tit, extra){ return '<div class="tit rv"><div class="k">'+hanko(k)+esc(cx(sec, 'selo', selo))+(extra || '')+'</div><h2>'+tit+'</h2></div>'; }
  function mais(href, txt, simbolo, alvo){ return '<a class="mais" href="'+esc(href)+'"'+(alvo ? ' target="_blank" rel="noopener noreferrer"' : '')+'><i aria-hidden="true">'+(simbolo || '›')+'</i>'+esc(txt)+'</a>'; }

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

  var escada = (Array.isArray(s.escada) ? s.escada : []).filter(function(b){ return b && b.nome; }).slice(0, 16)
    .map(function(b){ return { nome:String(b.nome), cor:hex6(b.cor) || '#9aa7b4' }; });

  var doApp = (Array.isArray(s.agenda) ? s.agenda : []).filter(function(a){ return a && typeof a.titulo === 'string' && a.titulo.trim(); });
  var evApp = doApp.filter(function(a){ return a.tipo === 'evento' && /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') && a.data >= hoje; }).sort(function(a, b){ return a.data.localeCompare(b.data); });
  var avisos = doApp.filter(function(a){ return a.tipo === 'aviso'; }).sort(function(a, b){ return String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')); });
  function dataCurta(d){ return /^\d{4}-\d{2}-\d{2}/.test(d || '') ? d.slice(8, 10) + ' · ' + MES_CURTO[+d.slice(5, 7) - 1] : ''; }

  /* ---------- topo ---------- */
  var slides = [{ k:s.nomeCurto + (s.cidade ? ' · ' + s.cidade : ''), h:estrela(cx('topo', 'titulo', X.topo)), p:cx('topo', 'texto', X.topoTx), foto:url(cx('topo', 'foto', '')) || fachada[0] || foto(0), bt:[ctaHref, cx('topo', 'botao', 'Agendar aula experimental'), !!zapHref], app:false }];
  lista('topo', 'slides', 3).forEach(function(x, i){ if(cs(x, 'titulo')) slides.push({ k:cs(x, 'selo'), h:estrela(cs(x, 'titulo')), p:'', foto:url(cs(x, 'foto')) || foto(i + 1), bt:[url(cs(x, 'link')) || ctaHref, 'Saiba mais', !!url(cs(x, 'link'))], app:false }); });
  if(evApp[0]) slides.push({ k:'Próximo evento · ' + dataCurta(evApp[0].data), h:esc(evApp[0].titulo), p:[evApp[0].local, evApp[0].hora].filter(Boolean).join(' · '), foto:foto(2), bt:['#ip-agenda', 'Ver na agenda', false], app:true });
  if(avisos[0]) slides.push({ k:'Aviso', h:esc(avisos[0].titulo), p:avisos[0].texto || '', foto:foto(4), bt:['#ip-mural', 'Ver o mural', false], app:true });
  slides = slides.slice(0, 4);
  var hero = '<section class="hero" id="ip-inicio" aria-roledescription="carrossel" aria-label="Destaques">'
    + slides.map(function(x, i){
      return '<div class="slide'+(i ? '' : ' ativo')+'"'+(i ? ' aria-hidden="true"' : '')+'>'+(x.foto ? '<img src="'+esc(x.foto)+'" alt=""'+(i ? ' loading="lazy"' : '')+'>' : '')
        + '<div class="ct"><div class="h-txt"><div class="k"><span>'+esc(x.k)+'</span>'+(x.app ? '<span class="app-tag cl">Publicado no app</span>' : '')+'</div>'
        + (i ? '<h2 class="h1">'+x.h+'</h2>' : '<h1>'+x.h+'</h1>') + (x.p ? '<p>'+esc(x.p)+'</p>' : '')
        + '<div class="acoes"><a class="btn btn-t" href="'+esc(x.bt[0])+'"'+(x.bt[2] ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+esc(x.bt[1])+'</a></div></div></div></div>';
    }).join('')
    + (judo ? '<div class="kanji-hero" aria-hidden="true"><span lang="ja">'+KJ.hero+'</span></div>' : '')
    + (slides.length > 1 ? '<div class="pontos" role="tablist" aria-label="Escolher destaque">'+slides.map(function(x, i){ return '<button type="button" role="tab" aria-label="Destaque '+(i + 1)+'" aria-current="'+(i ? 'false' : 'true')+'"></button>'; }).join('')+'</div>' : '')
    + '</section>';

  /* ---------- faixa de tatame: placar + mural + vídeos ---------- */
  var res = lista('resultados', 'itens', 2).filter(function(x){ return cs(x, 'atleta') && cs(x, 'adversario'); });
  var NOMES_RES = { ippon:'Ippon', 'waza-ari':'Waza-ari', decisao:'Decisão', hansoku:'Hansoku-make' };
  function chip(c){ return '<i class="jg" style="background:'+(c === 'azul' ? '#1f4fbf' : '#ffffff')+'"></i>'; }
  var placar = res.length ? '<div class="ct placar'+(res.length === 1 ? ' um' : '')+'">'+res.map(function(x){
    var m = +digitos(cs(x, 'mes')), r = NOMES_RES[cs(x, 'resultado')] ? cs(x, 'resultado') : '';
    var gi = cs(x, 'judogi') === 'branco' ? 'branco' : 'azul', giAdv = gi === 'azul' ? 'branco' : 'azul';
    var sh = Math.min(3, +digitos(cs(x, 'shidos')) || 0);
    var placa = '<div class="placa" role="img" aria-label="'+esc((r ? NOMES_RES[r] : 'Resultado') + (sh ? ', ' + sh + ' punição(ões)' : ''))+'"><i'+(r === 'ippon' ? ' class="ok"' : '')+'>I</i><i'+(r === 'waza-ari' ? ' class="ok"' : '')+'>W</i><i'+(sh ? ' class="ok"' : '')+'>S</i></div>';
    return '<article class="res rv"><div class="dt"><b>'+esc(digitos(cs(x, 'dia')).slice(0, 2) || '–')+'</b><span>'+esc(m ? MES_CURTO[m - 1] : '')+'</span></div><div class="cnt">'
      + '<div class="lado"><b>'+esc(cs(x, 'atleta'))+'</b><small>'+chip(gi)+esc([s.nomeCurto, cs(x, 'categoria')].filter(Boolean).join(' · '))+'</small></div>'
      + '<div class="meio">'+(r ? '<strong>'+NOMES_RES[r]+'</strong>' : '')+(cs(x, 'tecnica') ? '<span>'+esc(cs(x, 'tecnica'))+'</span>' : '')+placa+'</div>'
      + '<div class="lado d"><b>'+esc(cs(x, 'adversario'))+'</b><small>'+esc(cs(x, 'equipeAdv'))+chip(giAdv)+'</small></div></div></article>';
  }).join('')+'</div>' : '';
  var mural = '';
  if(avisos.length){
    var av = avisos.slice(0, 3);
    mural = '<div class="ct mural" id="ip-mural"><div class="cab">'+cab('mural', 'mural', 'Direto do '+V.local, titulo('mural', 'Mural de', 'avisos'), ' <span class="app-tag">Sincronizado com o app</span>')+'</div>'
      + '<div class="notas'+(av.length < 3 ? ' n'+av.length : '')+'">'+av.map(function(a, i){ var d = /^\d{4}-\d{2}-\d{2}/.test(a.criadoEm || '') ? a.criadoEm.slice(0, 10) : (a.data || ''); var f = foto(5 + i);
        return '<article class="nota rv"><div class="ft">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '')+'</div><div class="tx">'+(d ? '<span class="q">'+esc(dataCurta(d))+'</span>' : '')+'<h3>'+esc(a.titulo)+'</h3>'+(a.texto ? '<p>'+esc(String(a.texto).slice(0, 140))+'</p>' : '')+'</div></article>'; }).join('')+'</div></div>';
  }
  var vids = lista('videos', 'itens', 8).filter(function(x){ return cs(x, 'titulo') && url(cs(x, 'link')); });
  var videos = vids.length ? '<div class="ct videos" id="ip-videos"><div class="cab">'+cab('videos', 'videos', 'Em vídeo', titulo('videos', 'Galeria de', 'vídeos'))+'</div><div class="trilho-w">'
    + (vids.length > 4 ? '<button type="button" class="seta e" aria-label="Vídeos anteriores" data-alvo="ip-trilho" data-dir="-1">'+SETA_E+'</button>' : '')
    + '<div class="trilho" id="ip-trilho" tabindex="0" aria-label="Vídeos">'+vids.map(function(x, i){ var f = url(cs(x, 'foto')) || foto(8 + i); return '<a class="vd" href="'+esc(url(cs(x, 'link')))+'" target="_blank" rel="noopener noreferrer"><div class="ft">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '')+'</div>'+(cs(x, 'categoria') ? '<small>'+esc(cs(x, 'categoria'))+'</small>' : '')+'<b>'+esc(cs(x, 'titulo'))+'</b></a>'; }).join('')+'</div>'
    + (vids.length > 4 ? '<button type="button" class="seta d" aria-label="Próximos vídeos" data-alvo="ip-trilho" data-dir="1">'+SETA_D+'</button>' : '')+'</div></div>' : '';
  var banda = (placar || mural || videos) ? '<section class="banda tatami'+(placar ? '' : ' sem-placar')+'">'+pincel(0, 'cima')+placar+mural+videos+pincel(1, 'baixo')+'</section>' : '';

  /* ---------- dois blocos (texto + números + foto) ---------- */
  var qtdNuc = Array.isArray(s.nucleosInfo) ? s.nucleosInfo.length : (Array.isArray(s.nucleos) ? s.nucleos.length : 0);
  var professores = Array.isArray(s.equipe) ? s.equipe.filter(function(m){ return m && m.nome; }).length : 0;
  function nums(sec, padrao){
    var n = lista(sec, 'numeros', 2).filter(function(x){ return cs(x, 'valor') && cs(x, 'rotulo'); }).map(function(x, i){ return [cs(x, 'valor'), cs(x, 'rotulo'), i ? ICO_STAT.taca : ICO_STAT.faixa]; });
    return n.length ? n : padrao;
  }
  var n1 = nums('forca', [escada.length ? [String(escada.length), (s.peca || 'faixa') + (escada.length > 1 ? 's na escada' : ' na escada'), ICO_STAT.faixa] : null, qtdNuc ? [String(qtdNuc), qtdNuc > 1 ? 'Núcleos' : 'Núcleo', ICO_STAT.pin] : null].filter(Boolean));
  var n2 = nums('formando', professores ? [[String(professores), professores > 1 ? (judo ? 'Senseis' : 'Professores') : (judo ? 'Sensei' : 'Professor'), ICO_STAT.pessoa]] : []);
  function bloco(sec, dados, n, f, inv, cinza, kSol, kLema, link){
    var fx = url(cx(sec, 'foto', '')) || f;
    var txt = '<div class="txt">'+cab(sec, sec, dados[0], titulo(sec, dados[1], dados[2]))+'<p class="lead rv">'+esc(cx(sec, 'texto', dados[3]))+'</p>'+link
      + '<div class="stats rv">'+n.map(function(x){ return '<div class="stat">'+x[2]+'<b>'+esc(x[0])+'</b><small>'+esc(x[1])+'</small></div>'; }).join('')+'</div></div>';
    var fig = '<figure class="quadro"><div class="moldura rv">'+(fx ? '<img src="'+esc(fx)+'" alt="" loading="lazy">' : '')+(judo ? '<span class="sol kj" lang="ja" aria-hidden="true">'+KJ[kSol]+'</span>' : '')+'</div>'+(judo ? '<span class="vert kj" lang="ja" aria-hidden="true">'+KJ[kLema]+'</span>' : '')+'</figure>';
    return '<section class="split'+(inv ? ' inv' : '')+(cinza ? ' cinza' : '')+'"'+(sec === 'forca' ? ' id="ip-dojo"' : '')+'>'+(inv ? fig + txt : txt + fig)+'</section>';
  }
  var temH = lista('horarios', 'itens', 40).some(function(x){ return cs(x, 'aula') && cs(x, 'dia') && cs(x, 'horario'); });
  var blocos = bloco('forca', X.forca, n1, foto(1), false, false, 'sol1', 'lema1', mais(temH ? '#ip-horarios' : ctaHref, 'Aula experimental'))
    + bloco('formando', X.formando, n2, url(s.fotoLider) || equipeF[0] || foto(3), true, true, 'sol2', 'lema2', escada.length ? mais('#ip-graduacao', 'Ver a graduação') : '');

  /* ---------- graduação + agenda ---------- */
  var graus = lista('graduacao', 'itens', 16);
  var temGrau = graus.some(function(g){ return cs(g, 'grau'); });
  var gradHTML = escada.length ? '<div class="rv" id="ip-graduacao"><h2 class="p">'+esc(cx('graduacao', 'titulo', 'Graduação'))+'</h2><div class="tab"><div class="hd"><span>'+(judo ? 'Faixas e kyu' : esc(String(s.peca || 'Graduação').charAt(0).toUpperCase() + String(s.peca || 'graduação').slice(1)) + 's')+'</span><a href="'+esc(login)+'">Meu termômetro ›</a></div>'
    + '<div style="overflow-x:auto"><table><thead><tr><th>#</th><th>'+esc(s.peca || 'Faixa')+'</th>'+(temGrau ? '<th>Grau</th>' : '')+'</tr></thead><tbody>'
    + escada.map(function(b, j){ return '<tr><td class="n">'+(j + 1)+'</td><td><span class="obi" style="--c:'+esc(b.cor)+'" aria-hidden="true"></span>'+esc(b.nome)+'</td>'+(temGrau ? '<td class="g">'+esc(cs(graus[j], 'grau') || '—')+'</td>' : '')+'</tr>'; }).join('')
    + '</tbody></table></div></div></div>' : '';
  var evts = evApp.slice(0, 4).map(function(a){ return { dia:a.data.slice(8, 10), mes:MES_CURTO[+a.data.slice(5, 7) - 1], titulo:a.titulo, local:[a.local || a.nucleo, a.hora].filter(Boolean).join(' · ') }; });
  lista('agenda', 'itens', 6).forEach(function(x){ var m = +digitos(cs(x, 'mes')); if(cs(x, 'titulo')) evts.push({ dia:digitos(cs(x, 'dia')).slice(0, 2), mes:m ? MES_CURTO[m - 1] : '', titulo:cs(x, 'titulo'), local:cs(x, 'local') }); });
  evts = evts.slice(0, 6);
  var agHTML = '<div class="rv" id="ip-agenda"><h2 class="p">'+esc(cx('agenda', 'titulo', 'Agenda'))+(evApp.length ? ' <span class="app-tag">Sincronizado com o app</span>' : '')+'</h2>'
    + (evts.length ? '<div class="evts">'+evts.map(function(e){ return '<article class="evt"><div class="dt"><b>'+esc(e.dia || '–')+'</b><span>'+esc(e.mes)+'</span></div><div class="cnt"><h3>'+esc(e.titulo)+'</h3>'+(e.local ? '<small>'+esc(e.local)+'</small>' : '')+'</div></article>'; }).join('')+'</div>'
      : '<div class="ag-vazia"><p>Campeonatos, exames de faixa e eventos da '+esc(s.nomeCurto)+' aparecem aqui assim que forem publicados no app.</p><a class="btn btn-ai" href="'+esc(R('campeonatos'))+'">Ver campeonatos</a></div>')+'</div>';
  var dupla = '<section class="dupla"><div class="ct grade" style="'+(gradHTML ? '' : 'grid-template-columns:1fr')+'">'+gradHTML+agHTML+'</div></section>';

  /* ---------- quadro de horários (grade) + núcleos ---------- */
  var aulas = lista('horarios', 'itens', 40).filter(function(x){ return cs(x, 'aula') && cs(x, 'dia') && cs(x, 'horario'); });
  var nucs = lista('nucleos', 'lista', 6).filter(function(x){ return cs(x, 'nome'); }).map(function(x){ var w = digitos(cs(x, 'whatsapp')); return { nome:cs(x, 'nome'), end:cs(x, 'endereco'), zap:/^\d{10,13}$/.test(w) ? w : '' }; });
  if(!nucs.length && Array.isArray(s.nucleosInfo)) s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucs.push({ nome:String(n.nome), end:[n.sede ? 'Sede' : '', n.cidade ? String(n.cidade) + (n.uf ? ' · ' + String(n.uf) : '') : ''].filter(Boolean).join(' — '), zap:'' }); });
  var grade = '';
  if(aulas.length){
    var dias = DIAS.filter(function(d){ return d[0] !== 'dom' || aulas.some(function(x){ return cs(x, 'dia') === 'dom'; }); });
    var horas = [];
    aulas.forEach(function(x){ var hh = cs(x, 'horario').slice(0, 8); if(horas.indexOf(hh) < 0) horas.push(hh); });
    horas.sort(function(a, b){ return horaNum(a) - horaNum(b); });
    var CLS = { infantil:' kids', competicao:' comp' };
    grade = '<div class="grade-h rv" tabindex="0" aria-label="Quadro de horários"><table><thead><tr><th scope="col">Hora</th>'+dias.map(function(d){ return '<th scope="col"><abbr title="'+d[1]+'" style="text-decoration:none">'+d[2]+'</abbr></th>'; }).join('')+'</tr></thead><tbody>'
      + horas.map(function(hh){ return '<tr><td class="h">'+esc(hh)+'</td>'+dias.map(function(d){ var a = aulas.filter(function(x){ return cs(x, 'dia') === d[0] && cs(x, 'horario').slice(0, 8) === hh; });
        return '<td>'+a.map(function(x){ return '<span class="aula'+(CLS[cs(x, 'tipo')] || '')+'"><b>'+esc(cs(x, 'aula'))+'</b>'+(cs(x, 'local') ? '<small>'+esc(cs(x, 'local'))+'</small>' : '')+'</span>'; }).join('')+'</td>'; }).join('')+'</tr>'; }).join('')
      + '</tbody></table></div><div class="legenda"><span><i></i>Adulto e iniciantes</span><span><i class="kids"></i>Infantil</span><span><i class="comp"></i>Competição e randori</span></div>';
  }
  var horarios = (grade || nucs.length) ? '<section class="horas" id="ip-horarios"><div class="ct">'+(grade ? '<div class="cab">'+cab('horarios', 'horas', 'Semana no '+V.local, titulo('horarios', 'Quadro de', 'horários'))+'</div>'+grade : '<div class="cab">'+cab('horarios', 'horas', 'Aula experimental', titulo('horarios', 'Onde', 'treinar'))+'</div>')
    + (nucs.length ? '<div class="nucs">'+nucs.map(function(n){ var w = n.zap ? 'https://wa.me/'+(n.zap.length <= 11 ? '55' : '')+n.zap+'?text='+encodeURIComponent('Olá! Quero agendar uma aula experimental no núcleo '+n.nome+'.') : ctaHref;
        return '<article class="nuc rv"><span class="k">Núcleo</span><h3>'+esc(n.nome)+'</h3>'+(n.end ? '<p>'+esc(n.end)+'</p>' : '')+'<a class="btn btn-ai" href="'+esc(w)+'"'+((n.zap || zapHref) ? ' target="_blank" rel="noopener noreferrer"' : '')+'>'+((n.zap || zapHref) ? 'WhatsApp' : 'Inscrição')+'</a></article>'; }).join('')+'</div>' : '')+'</div></section>' : '';

  /* ---------- dojô (programas) ---------- */
  var pIt = lista('programas', 'itens', 4).filter(function(x){ return cs(x, 'titulo'); }).map(function(x){ return [cs(x, 'titulo'), cs(x, 'texto')]; });
  if(!pIt.length) pIt = X.itens;
  var progFoto = url(cx('programas', 'foto', '')) || foto(6);
  var programas = '<section class="dojo" id="ip-programas">'+(progFoto ? '<img src="'+esc(progFoto)+'" alt="" aria-hidden="true" loading="lazy">' : '')+'<div class="ct">'
    + cab('programas', 'prog', X.prog[0], titulo('programas', X.prog[1], X.prog[2]))+'<p class="lead rv">'+esc(cx('programas', 'texto', X.prog[3]))+'</p>'
    + '<div class="acoes rv"><a class="btn btn-t" href="'+esc(ins)+'">Matricule-se</a><a class="btn btn-c" href="#ip-equipe">Conheça a equipe</a></div>'
    + '<div class="quatro'+(pIt.length === 3 ? ' n3' : '')+'">'+pIt.map(function(x, i){ return '<article class="qc rv">'+ICO_PROG[i % 4]+'<b>'+esc(x[0])+'</b>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'</article>'; }).join('')+'</div></div></section>';

  /* ---------- judoca do mês ---------- */
  var jNome = cx('judoca', 'nome', ''), jFoto = url(cx('judoca', 'foto', ''));
  var judoca = '';
  if(jNome && jFoto){
    var jn = jNome.split(/\s+/), jPrim = jn.length > 1 ? jn.slice(0, -1).join(' ') : '', jUlt = jn[jn.length - 1];
    var bars = lista('judoca', 'barras', 3).filter(function(x){ return cs(x, 'rotulo') && digitos(cs(x, 'valor')); });
    var tmp = [['lutas', 'Lutas'], ['ippons', 'Ippons'], ['medalhas', 'Medalhas']].filter(function(x){ return digitos(cx('judoca', x[0], '')); });
    var gr = cx('judoca', 'grau', '').slice(0, 4);
    judoca = '<section class="mvp" id="ip-judoca"><div class="ct grade"><div>'
      + '<div class="mnome rv"'+(gr ? '' : ' style="grid-template-columns:1fr"')+'>'+(gr ? '<span class="gr">'+esc(gr)+'</span>' : '')+(jPrim ? '<small>'+esc(jPrim)+'</small>' : '')+'<b>'+esc(jUlt)+'</b>'+(cx('judoca', 'texto', '') ? '<span>'+esc(cx('judoca', 'texto', ''))+'</span>' : '')+'</div>'
      + (bars.length ? '<div class="barras rv">'+bars.map(function(x){ var v = Math.min(100, +digitos(cs(x, 'valor'))); return '<div>'+esc(cs(x, 'rotulo'))+'<span>'+v+'%</span><i style="--v:'+v+'%"></i></div>'; }).join('')+'</div>' : '<div style="height:40px"></div>')
      + (tmp.length ? '<div class="temporada rv"><span class="lb">Temporada'+(digitos(cx('judoca', 'ano', '')) ? '<em>'+esc(digitos(cx('judoca', 'ano', '')).slice(0, 4))+'</em>' : '')+'</span>'+tmp.map(function(x){ return '<div><b>'+esc(digitos(cx('judoca', x[0], '')).slice(0, 4))+'</b><small>'+x[1]+'</small></div>'; }).join('')+'</div>' : '<div style="height:70px"></div>')
      + '</div><div class="mfoto rv"><img src="'+esc(jFoto)+'" alt="'+esc(jNome)+'" loading="lazy">'+(judo ? '<span class="kj" lang="ja" aria-hidden="true">'+KJ.judoca+'</span>' : '')+'</div></div></section>';
  }

  /* ---------- equipe (carrossel) ---------- */
  var pessoas = lista('equipe', 'itens', 12).filter(function(m){ return cs(m, 'nome'); }).map(function(m){ return { nome:cs(m, 'nome'), grau:cs(m, 'grau').slice(0, 4), nivel:cs(m, 'nivel').slice(0, 3), funcao:cs(m, 'funcao'), foto:url(cs(m, 'foto')) }; });
  if(!pessoas.length && Array.isArray(s.equipe)) s.equipe.forEach(function(m){ if(!m || !m.nome) return; var g = String(m.graduacao || ''), mm = g.match(/(\d{1,2})\s*º\s*(dan|kyu|grau)/i);
    pessoas.push({ nome:String(m.nome), grau:mm ? mm[1] + 'º' : '', nivel:mm ? mm[2].toUpperCase() : '', funcao:g.replace(/\s*·?\s*\d{1,2}\s*º\s*(dan|kyu|grau)/i, '').trim() || tituloLider, foto:url(m.foto) }); });
  if(!pessoas.length && s.lider) pessoas.push({ nome:String(s.lider), grau:'', nivel:'', funcao:(s.responsavel && s.responsavel.graduacao) || tituloLider, foto:url(s.fotoLider) });
  var equipe = pessoas.length ? '<section class="equipe" id="ip-equipe"><div class="ct"><div class="cab">'+cab('equipe', 'equipe', judo ? 'Senseis e equipe' : 'Professores e equipe', titulo('equipe', 'Quem está no', V.local))
    + (pessoas.length > 3 ? '<div style="display:flex;gap:10px"><button type="button" class="seta" style="position:static" aria-label="Anterior" data-alvo="ip-elenco" data-dir="-1">'+SETA_E+'</button><button type="button" class="seta" style="position:static" aria-label="Próximo" data-alvo="ip-elenco" data-dir="1">'+SETA_D+'</button></div>' : '')+'</div>'
    + '<div class="elenco" id="ip-elenco" tabindex="0" aria-label="Equipe">'+pessoas.map(function(p){ var nm = p.nome.split(/\s+/), prim = nm.length > 1 ? nm.slice(0, -1).join(' ') : nm[0], ult = nm.length > 1 ? nm[nm.length - 1] : '';
      return '<article class="pess">'+(p.foto ? '<img src="'+esc(p.foto)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="ini" aria-hidden="true">'+esc(iniciais(p.nome))+'</span>')
        + '<div class="tx'+(p.grau ? '' : ' sg')+'">'+(p.grau ? '<span class="gr">'+esc(p.grau)+(p.nivel ? '<small>'+esc(p.nivel)+'</small>' : '')+'</span>' : '')+'<b>'+esc(prim)+(ult ? ' <span>'+esc(ult)+'</span>' : '')+'</b>'+(p.funcao ? '<span class="fn">'+esc(p.funcao)+'</span>' : '')+'</div></article>'; }).join('')+'</div>'
    + (pessoas.length > 3 ? '<div class="pontos2" id="ip-pontos" aria-hidden="true"></div>' : '')+'</div></section>' : '';

  /* ---------- app ---------- */
  var cA = escada.length > 3 ? escada[3] : escada[0], cB = escada.length > 4 ? escada[4] : null;
  var appSec = '<section class="app" id="ip-app"><div class="ct grade"><div>'+cab('app', 'app', 'Tudo no celular', titulo('app', 'O '+V.local+' no seu', 'bolso'))
    + '<p class="lead rv">'+esc(cx('app', 'texto', 'Alunos e responsáveis acompanham a evolução, recebem os avisos na hora e pagam a mensalidade pelo app da '+s.nomeCurto+'.'))+'</p>'
    + '<ul class="recursos rv"><li>Termômetro até a próxima '+esc(s.peca || 'graduação')+'</li><li>Avisos e agenda em tempo real</li><li>Carteirinha digital</li><li>Mensalidade por PIX</li><li>Notas de cada avaliação</li><li>Inscrição em campeonatos</li></ul>'
    + '<a class="btn btn-ai rv" href="'+esc(R('instalar'))+'">Instalar o app</a></div>'
    + '<div class="rv" aria-hidden="true"><div class="cel"><div class="tela"><div class="tp"><div class="who"><span class="av">'+selo()+'</span><div><b>ATLETA</b><small>'+esc(cA ? cA.nome : 'Seu perfil')+'</small></div></div><div class="lb"><span>Prontidão</span><span>68%</span></div>'
    + '<div class="bar"><i style="'+(cA ? 'background:linear-gradient(90deg,'+esc(cA.cor)+','+esc(cB ? cB.cor : t.tat)+')' : '')+'"></i></div><div class="lb"><span>'+esc(cA ? cA.nome : 'Atual')+'</span><span>→ '+esc(cB ? cB.nome : 'Próxima')+'</span></div></div>'
    + '<div class="lista">'+(evApp[0] ? '<div class="mini"><i>'+esc(evApp[0].data.slice(8, 10))+'</i><div><b>'+esc(evApp[0].titulo.slice(0, 24))+'</b><small>Agenda da equipe</small></div></div>' : '')
    + (avisos[0] ? '<div class="mini"><i>!</i><div><b>'+esc(avisos[0].titulo.slice(0, 24))+'</b><small>Mural do '+esc(V.local)+'</small></div></div>' : '')
    + '<div class="mini"><i>✓</i><div><b>Check-in feito</b><small>Presença registrada</small></div></div><div class="mini"><i>$</i><div><b>Mensalidade</b><small>Pague por PIX</small></div></div></div></div></div></div></div></section>';

  /* ---------- loja ---------- */
  var prods = produtosLoja(C, 8), loja = '';
  if(prods.length){
    var zapLoja = cx('loja', 'whatsapp', '') || zap, coresLoja = { principal:t.ai, destaque:t.aka };
    loja = '<section class="loja" id="ip-loja"><div class="ct"><div class="cab">'+cab('loja', 'loja', 'Vista o '+V.local, titulo('loja', 'Loja', 'oficial'))+'</div>'
      + (cx('loja', 'texto', '') ? '<p class="rv" style="color:var(--suave);max-width:56ch;margin:-14px 0 30px">'+esc(cx('loja', 'texto', ''))+'</p>' : '')
      + '<div class="prods">'+prods.map(function(p){ var w = linkCompra(zapLoja, p), f = url(p.foto);
        return '<div class="prod rv"><div class="ph">'+(f ? '<img src="'+esc(f)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="lj-svg" role="img" aria-label="'+esc(p.nome)+'" style="display:contents">'+ilustracao(p.nome, coresLoja)+'</span>')+'</div><h3>'+esc(p.nome)+'</h3>'+(p.texto ? '<p>'+esc(p.texto)+'</p>' : '')
          + '<div class="pf">'+(p.preco ? '<b>'+esc(p.preco)+'</b>' : '<span></span>')+(w ? '<a class="btn btn-ai" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">Comprar</a>' : '')+'</div></div>'; }).join('')+'</div></div></section>';
  }

  /* ---------- redes (tatame) ---------- */
  var redesL = [];
  if(ig) redesL.push(['Instagram', 'https://instagram.com/' + ig, digitos(cx('redes', 'instagramN', '')).slice(0, 4)]);
  [['YouTube', 'youtube'], ['Facebook', 'facebook'], ['TikTok', 'tiktok']].forEach(function(r){ var u = url(cx('redes', r[1], '')); if(u) redesL.push([r[0], u, digitos(cx('redes', r[1] + 'N', '')).slice(0, 4)]); });
  var hashtag = cx('redes', 'hashtag', '').replace(/[^\p{L}\p{N}_#]/gu, '').slice(0, 24) || ('#' + String(s.nomeCurto || '').replace(/[^\p{L}\p{N}]/gu, ''));
  if(hashtag.charAt(0) !== '#') hashtag = '#' + hashtag;
  var redes = redesL.length ? '<section class="redes tatami" id="ip-redes">'+pincel(2, 'cima')+'<div class="ct grade"><div class="tit rv"><div class="k">'+esc(cx('redes', 'selo', 'Siga a equipe'))+'</div><h2>'+esc(hashtag)+'</h2></div>'
    + '<div class="socs">'+redesL.map(function(r){ return '<div class="soc rv">'+(r[2] ? '<b>'+esc(r[2])+'K+</b>' : '<span class="arroba">'+esc(r[0] === 'Instagram' ? '@' + ig : r[0])+'</span>')+'<a href="'+esc(r[1])+'" target="_blank" rel="noopener noreferrer">'+esc(r[0])+' ↗</a></div>'; }).join('')+'</div></div></section>' : '';

  /* ---------- rodapé ---------- */
  var parcs = lista('contato', 'parceiros', 6).filter(function(p){ return cs(p, 'nome'); });
  var email = cx('contato', 'email', '').replace(/[^A-Za-z0-9._%+@-]/g, ''); if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) email = '';
  var lema = cx('contato', 'lema', judo ? 'Caminho *suave*' : 'Treine com *a gente*').split('*');
  var navLinks = [avisos.length ? ['#ip-mural', 'Mural'] : null, escada.length ? ['#ip-graduacao', 'Graduação'] : null, ['#ip-agenda', 'Agenda'], aulas.length ? ['#ip-horarios', 'Horários'] : null, ['#ip-programas', judo ? 'Dojô' : 'Programas'], pessoas.length ? ['#ip-equipe', 'Equipe'] : null, prods.length ? ['#ip-loja', 'Loja'] : null].filter(Boolean);
  var foot = '<footer class="rod"><div class="ct">'
    + (parcs.length ? '<span class="k c">Parceiros</span><div class="parc">'+parcs.map(function(p){ var lg = url(cs(p, 'logo')), lk = url(cs(p, 'link')); var inner = lg ? '<img src="'+esc(lg)+'" alt="'+esc(cs(p, 'nome'))+'" loading="lazy">' : esc(cs(p, 'nome')); return lk ? '<a href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer">'+inner+'</a>' : '<span>'+inner+'</span>'; }).join('')+'</div>' : '')
    + '<div class="cols"><div><div class="lema"><span class="selo">'+selo()+'</span><b>'+esc(lema[0] || '')+(lema[1] ? '<em>'+esc(lema[1])+'</em>' : '')+'</b></div></div>'
    + '<div><h4>'+esc(V.local.charAt(0).toUpperCase() + V.local.slice(1))+'</h4><ul>'+navLinks.slice(0, 6).map(function(x){ return '<li><a href="'+x[0]+'">'+x[1]+'</a></li>'; }).join('')+'</ul></div>'
    + '<div><h4>Sistema</h4><ul><li><a href="'+esc(login)+'">Área do aluno</a></li><li><a href="'+esc(ins)+'">Inscrição</a></li><li><a href="'+esc(R('campeonatos'))+'">Campeonatos</a></li><li><a href="'+esc(R('instalar'))+'">Instalar o app</a></li></ul></div>'
    + '<div><h4>Contato</h4><ul>'+(zap ? '<li><a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">'+esc(zap.length === 11 ? '('+zap.slice(0, 2)+') '+zap.slice(2, 7)+'-'+zap.slice(7) : zap)+'</a></li>' : '')+(email ? '<li><a href="mailto:'+esc(email)+'">'+esc(email)+'</a></li>' : '')
    + ((s.endereco || s.cidade) ? '<li>'+esc([s.endereco, [s.cidade, s.uf].filter(Boolean).join(' · ')].filter(Boolean).join(' — '))+'</li>' : '')+'</ul></div>'
    + '<div>'+(ig && treino.length ? '<h4>No Instagram</h4><div class="insta">'+treino.slice(0, 6).map(function(f){ return '<a href="https://instagram.com/'+esc(ig)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(f)+'" alt="" loading="lazy"></a>'; }).join('')+'</div>' : '')+'</div></div>'
    + '<div class="cop"><span>© '+new Date().getFullYear()+' '+esc(s.nome || s.nomeCurto)+'</span><span>Site e app por <a href="https://atletapay.com.br" target="_blank" rel="noopener">AtletaPay</a></span></div></div></footer>';

  var nav = '<header class="topo" id="ip-topo"><div class="ct"><a class="marca" href="#ip-inicio" aria-label="'+esc(s.nomeCurto)+' — início"><span class="selo">'+selo()+'</span><span><b>'+esc(s.nomeCurto)+'</b><small>'+esc(V.nomeMod + (s.cidade ? ' · ' + s.cidade : ''))+'</small></span></a>'
    + '<nav class="menu" id="ip-menu" aria-label="Seções">'+navLinks.map(function(x){ return '<a href="'+x[0]+'">'+x[1]+'</a>'; }).join('')+'<a class="so-m" href="'+esc(login)+'">Área do aluno</a></nav>'
    + '<div class="dir"><a class="btn btn-t" href="'+esc(ctaHref)+'"'+ctaAlvo+'>Aula experimental</a><button class="ham" id="ip-ham" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="ip-menu"><span></span></button></div></div></header>';

  site.className = 'ip';
  site.innerHTML = nav + '<main>' + hero + banda + blocos + dupla + horarios + programas + judoca + equipe + appSec + loja + redes + '</main>' + foot;
  wire(site);
}

/* ---------------- comportamento ---------------- */
function wire(site){
  var reduz = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(site._ip) site._ip.parar();
  var estado = { timers:[], obs:[] };
  estado.parar = function(){ estado.timers.forEach(clearInterval); estado.obs.forEach(function(o){ o.disconnect(); }); };
  site._ip = estado;

  var topo = site.querySelector('#ip-topo'), ham = site.querySelector('#ip-ham'), menu = site.querySelector('#ip-menu');
  if(!site._ipRolagem){ site._ipRolagem = true; window.addEventListener('scroll', function(){ var tp = site.querySelector('#ip-topo'); if(tp) tp.classList.toggle('fixo', window.scrollY > 40); }, { passive:true }); }
  if(ham) ham.addEventListener('click', function(){ var a = topo.classList.toggle('aberto'); ham.setAttribute('aria-expanded', a ? 'true' : 'false'); });
  if(menu) menu.addEventListener('click', function(e){ if(e.target.closest('a')){ topo.classList.remove('aberto'); if(ham) ham.setAttribute('aria-expanded', 'false'); } });

  var sl = [].slice.call(site.querySelectorAll('.slide')), pt = [].slice.call(site.querySelectorAll('.pontos button')), at = 0;
  function vai(i){ at = (i + sl.length) % sl.length; sl.forEach(function(x, k){ x.classList.toggle('ativo', k === at); if(k === at) x.removeAttribute('aria-hidden'); else x.setAttribute('aria-hidden', 'true'); }); pt.forEach(function(p, k){ p.setAttribute('aria-current', k === at ? 'true' : 'false'); }); }
  function auto(){ estado.timers.forEach(clearInterval); estado.timers = []; if(!reduz && sl.length > 1) estado.timers.push(setInterval(function(){ vai(at + 1); }, 6500)); }
  pt.forEach(function(p, k){ p.addEventListener('click', function(){ vai(k); auto(); }); }); auto();

  [].forEach.call(site.querySelectorAll('[data-alvo]'), function(b){
    b.addEventListener('click', function(){ var tr = site.querySelector('#' + b.getAttribute('data-alvo')); if(!tr || !tr.firstElementChild) return; tr.scrollBy({ left:(+b.getAttribute('data-dir')) * (tr.firstElementChild.getBoundingClientRect().width + 22), behavior:reduz ? 'auto' : 'smooth' }); });
  });
  var el = site.querySelector('#ip-elenco'), pe = site.querySelector('#ip-pontos');
  if(el && pe){
    var cards = el.children; pe.innerHTML = '';
    for(var i = 0; i < cards.length; i++){ var d = document.createElement('button'); d.type = 'button'; d.tabIndex = -1; pe.appendChild(d); }
    var marca = function(){ var w = cards[0].getBoundingClientRect().width + 22, idx = Math.round(el.scrollLeft / Math.max(1, w)); [].forEach.call(pe.children, function(b, k){ b.setAttribute('aria-current', k === idx ? 'true' : 'false'); }); };
    el.addEventListener('scroll', marca, { passive:true }); marca();
  }

  if(!('IntersectionObserver' in window) || reduz) return;
  var alto = window.innerHeight;
  var rv = [].slice.call(site.querySelectorAll('.rv'));
  rv.forEach(function(x){ if(x.getBoundingClientRect().top > alto) x.classList.add('fora'); });
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove('fora'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -8% 0px' });
  rv.forEach(function(x){ io.observe(x); }); estado.obs.push(io);
  var br = site.querySelector('.barras');
  if(br && br.getBoundingClientRect().top > alto){ br.classList.add('zero'); var io2 = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ br.classList.remove('zero'); io2.disconnect(); } }, { threshold:.5 }); io2.observe(br); estado.obs.push(io2); }
}
