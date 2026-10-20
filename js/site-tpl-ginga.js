/* site-tpl-ginga.js — Template "ginga" do site público por escola (F4.3, pré-build #5).
 *
 * Clone, para outras escolas, do site do Grupo Capoeira Liberdade e Expressão
 * (liberdadeeexpressao.com.br: js/site-render.js + css/site.css). Mesma estrutura e os mesmos
 * efeitos: hero com slides em arco + legenda, anéis e ondas, faixa corrida, três pilares,
 * cordões que crescem, núcleos com filtros e WhatsApp, corpo docente com aro animado, agenda com
 * o próximo evento em destaque, bloco do app, loja, chamada com formulário e parceiros.
 *
 * O logo da escola orbita a foto do topo ao passar o mouse / tocar (como no site original da
 * Liberdade — aqui vale para qualquer escola com logo no cadastro). EXCLUSIVO DA LIBERDADE
 * (não entra aqui): a escada de cordões dela; os prints do app (têm dados pessoais — aqui as
 * telas do app são desenhadas em HTML com dados de exemplo).
 *
 * Integração com o app: s.agenda (site-escola.js lê agendaPublica/{id}, espelho que o SERVIDOR
 * grava quando um evento ou aviso é publicado no app com "Mostrar no site") entra na agenda e no
 * mural de avisos. Eventos digitados no painel "Meu site" somam com os do app.
 *
 * Contrato da biblioteca (site-templates.js): render(s, h) + schema + meta.
 * Segurança: todo texto por h.esc(); toda URL por h.url() (fotos) ou https-only (links);
 * WhatsApp só com dígitos; nada de handler inline. Nada inventado: números só os reais
 * (núcleos, equipe, cordões); loja, parceiros e eventos só se a escola preencher/publicar.
 * Responsivo: 1100 (tablet) e 860 (celular, menu hambúrguer) — os do site original.
 */

/* ========================================================================== */
/*  Contrato da biblioteca: meta + schema                                      */
/* ========================================================================== */
import { ilustracao } from './site-loja.js';

export var meta = {
  nome: 'Ginga',
  descricao: 'O site da Liberdade e Expressão para a sua escola: topo com fotos em arco, cordões que crescem, núcleos com WhatsApp, corpo docente, agenda e avisos do app, loja, aula experimental e parceiros.',
  modalidades: ['capoeira', 'todas']
};

var SIM = [['', 'Não'], ['1', 'Sim']];
var MESES_OP = [['01', 'Janeiro'], ['02', 'Fevereiro'], ['03', 'Março'], ['04', 'Abril'], ['05', 'Maio'], ['06', 'Junho'], ['07', 'Julho'], ['08', 'Agosto'], ['09', 'Setembro'], ['10', 'Outubro'], ['11', 'Novembro'], ['12', 'Dezembro']];
var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var TIT = { c:'titulo', r:'Título', max:40 };
var DEST = { c:'destaque', r:'Final do título (em itálico)', max:40 };
export var schema = { secoes: [
  { id:'topo', r:'Topo', ajuda:'Título em duas partes (a segunda em itálico) e as fotos que passam no arco. Sem fotos aqui, entram as fotos de treino do cadastro.', campos:[
    { c:'selo', r:'Etiqueta (ex.: cidades)', max:60 }, { c:'titulo', r:'Título', max:24, ph:'Quem ginga' }, { c:'destaque', r:'Final do título (itálico)', max:24, ph:'não para.' },
    { c:'texto', r:'Texto', t:'area', max:240 }, { c:'botao', r:'Botão principal', max:32, ph:'Agende uma aula experimental' }, { c:'botao2', r:'Botão secundário', max:32, ph:'Ache o núcleo mais perto' },
    { c:'slides', r:'Fotos do arco', t:'lista', max:5, resumo:'titulo', nomeItem:'Foto', item:[ { c:'foto', r:'Foto', t:'foto' }, { c:'selo', r:'Etiqueta', max:24 }, { c:'titulo', r:'Título', max:30 }, { c:'texto', r:'Legenda', t:'area', max:100 } ] } ] },
  { id:'numeros', r:'Números', ajuda:'Até 3 números abaixo do topo. Vazio = os números reais do cadastro (núcleos, equipe, cordões).', campos:[
    { c:'itens', r:'Números', t:'lista', max:3, resumo:'valor', nomeItem:'Número', item:[ { c:'valor', r:'Valor', max:8, ph:'15+' }, { c:'rotulo', r:'Rótulo', max:24, ph:'Anos de história' } ] } ] },
  { id:'faixa', r:'Faixa corrida', campos:[ { c:'palavras', r:'Frases (separe por vírgula, até 8)', max:240, ph:'Infantil, juvenil e adulto, Batizado e troca de cordas' } ] },
  { id:'arte', r:'A arte', ajuda:'Três pilares com foto.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:300 },
    { c:'pilares', r:'Pilares', t:'lista', max:3, resumo:'titulo', nomeItem:'Pilar', item:[ { c:'titulo', r:'Título', max:30 }, { c:'texto', r:'Texto', t:'area', max:180 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'graduacao', r:'Graduação', ajuda:'Os cordões e as cores vêm da escada cadastrada da escola.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:300 },
    { c:'infantil', r:'Nota da trilha infantil', max:140 }, { c:'botao', r:'Botão', max:32, ph:'Ver meu termômetro no app' } ] },
  { id:'nucleos', r:'Núcleos', ajuda:'Cada núcleo com dias, horário, endereço e WhatsApp. Lista vazia = os núcleos do cadastro (só o nome).', campos:[ SELO, TIT, DEST,
    { c:'nota', r:'Observação abaixo dos cartões', t:'area', max:240 }, { c:'convite', r:'Mensagem pronta do WhatsApp', max:140, ph:'Olá! Quero agendar uma aula experimental.' },
    { c:'lista', r:'Núcleos', t:'lista', max:12, resumo:'nome', nomeItem:'Núcleo', item:[ { c:'nome', r:'Professor / núcleo', max:40 }, { c:'bairro', r:'Bairro', max:40 },
      { c:'dias', r:'Dias', max:40, ph:'Segunda, quarta e sexta' }, { c:'horario', r:'Horário', max:30, ph:'19h00 às 20h30' }, { c:'endereco', r:'Endereço', max:100 },
      { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13 }, { c:'foto', r:'Foto do professor', t:'foto' },
      { c:'infantil', r:'Tem turma infantil?', t:'select', opcoes:SIM }, { c:'noite', r:'Tem turma à noite?', t:'select', opcoes:SIM } ] } ] },
  { id:'mestres', r:'Corpo docente', ajuda:'Lista vazia = a equipe do cadastro.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'lista', r:'Pessoas', t:'lista', max:12, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:40 }, { c:'cargo', r:'Cargo', max:40 }, { c:'foto', r:'Foto', t:'foto' }, { c:'instagram', r:'Instagram (link https)', t:'link', max:120 } ] } ] },
  { id:'agenda', r:'Agenda', ajuda:'Eventos e avisos publicados no app com "Mostrar no site" entram aqui sozinhos. Use a lista abaixo só para eventos que não estão no app.', campos:[ SELO, TIT, DEST,
    { c:'foto', r:'Foto do destaque', t:'foto' }, { c:'aviso', r:'Observação', max:160 },
    { c:'lista', r:'Eventos extras', t:'lista', max:10, resumo:'titulo', nomeItem:'Evento', item:[ { c:'titulo', r:'Evento', max:60 }, { c:'dia', r:'Dia', max:2, ph:'21' }, { c:'mes', r:'Mês', t:'select', opcoes:MESES_OP, ph:'Mês' }, { c:'ano', r:'Ano', max:4, ph:'2026' },
      { c:'horario', r:'Horário', max:12, ph:'19h00' }, { c:'local', r:'Local', max:60 }, { c:'mapa', r:'Endereço para o mapa', max:120 }, { c:'fotos', r:'Álbum de fotos (link https)', t:'link', max:200 } ] } ] },
  { id:'app', r:'App e Rede', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:240 } ] },
  { id:'loja', r:'Loja', ajuda:'Sem produtos, a seção não aparece.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 }, { c:'whatsapp', r:'WhatsApp da loja', max:13 },
    { c:'produtos', r:'Produtos', t:'lista', max:6, resumo:'nome', nomeItem:'Produto', item:[ { c:'nome', r:'Nome', max:40 }, { c:'texto', r:'Descrição', t:'area', max:120 }, { c:'preco', r:'Preço', max:16, ph:'R$ 90,00' }, { c:'foto', r:'Foto (sem foto, entra um desenho pelo nome)', t:'foto' } ] } ] },
  { id:'chamada', r:'Aula experimental', ajuda:'Com núcleos com WhatsApp, aparece o formulário que abre o WhatsApp do núcleo escolhido. Sem WhatsApp, o botão leva à inscrição.', campos:[ TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'foto', r:'Foto de fundo', t:'foto' }, { c:'formTitulo', r:'Título do formulário', max:40 }, { c:'formAjuda', r:'Texto abaixo do botão', max:80 } ] },
  { id:'parceiros', r:'Parceiros', ajuda:'Sem parceiros, a seção não aparece.', campos:[ SELO, TIT, DEST, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'lista', r:'Parceiros', t:'lista', max:4, resumo:'nome', nomeItem:'Parceiro', item:[ { c:'nome', r:'Nome', max:40 }, { c:'logo', r:'Logo', t:'foto', png:true }, { c:'frase', r:'Frase (a última palavra fica em itálico)', max:60 },
      { c:'destaque', r:'Benefício em destaque', max:12, ph:'20%' }, { c:'beneficio', r:'Benefício', max:80 }, { c:'como', r:'Como usar', t:'area', max:200 },
      { c:'whatsapp', r:'WhatsApp', max:13 }, { c:'mensagem', r:'Mensagem pronta', max:160 }, { c:'link', r:'Site', max:120 } ] } ] },
  { id:'rodape', r:'Rodapé', ajuda:'Endereço e Instagram vêm do cadastro.', campos:[ { c:'texto', r:'Texto', t:'area', max:200 }, { c:'telefone', r:'Telefone', max:20 }, { c:'facebook', r:'Facebook (link https)', t:'link', max:120 } ] }
] };

/* ========================================================================== */
/*  Textos padrão por modalidade (genéricos — nada de dado da Liberdade)       */
/* ========================================================================== */
var TOPO = {
  capoeira: ['Quem ginga', 'não para.', 'Capoeira para crianças, jovens e adultos — com roda, bateria e um professor acompanhando cada passo, da primeira ginga à troca de corda.'],
  arena: ['Treine com quem', 'vive isso.', 'Técnica, disciplina e um professor acompanhando cada passo — do primeiro dia à próxima graduação.']
};
var FAIXA = {
  capoeira: ['Ginga e roda', 'Berimbau, pandeiro e atabaque', 'Batizado e troca de cordas', 'Presença, graduação e agenda no app'],
  arena: ['Técnica e disciplina', 'Turmas por nível', 'Graduação acompanhada no app', 'Presença e agenda no app']
};
var ARTE = {
  capoeira: { selo:'A ARTE', titulo:'Três coisas acontecem', destaque:'ao mesmo tempo', texto:'Na roda ninguém é só atleta. Se joga com o corpo, se canta com o grupo e se toca a bateria que comanda o ritmo — é essa combinação que ensina respeito, disciplina e malícia.',
    pilares:[['A ginga', 'Base, esquiva e movimento contínuo. É o primeiro fundamento que todo aluno aprende — e o que nunca se para de treinar.'], ['A roda', 'O jogo acontece no centro, mas a roda é feita por todos: quem canta, quem bate palma e quem espera a vez de entrar.'], ['A bateria', 'Berimbau, pandeiro e atabaque ditam o toque. O capoeirista também canta e responde.']] },
  arena: { selo:'O TREINO', titulo:'Três coisas acontecem', destaque:'em cada aula', texto:'Técnica, condicionamento e respeito — juntos, em todas as turmas.',
    pilares:[['Técnica', 'Fundamentos repetidos até virar reflexo, com correção individual.'], ['Condicionamento', 'Força e fôlego no ritmo de cada aluno.'], ['Respeito', 'Disciplina e cuidado com o colega de treino.']] }
};

/* ========================================================================== */
/*  CSS: o css/site.css da Liberdade escopado em .gi, com as cores da escola     */
/* ========================================================================== */
var CSS_BASE = '\
.gi .sem-foto{display:block;width:100%;height:100%;min-height:120px;background:linear-gradient(135deg,var(--linha),var(--fundo))}\
.gi .pular{position:absolute;left:-999px;top:8px;z-index:100;background:var(--verde);color:var(--verde-ink);padding:10px 16px;border-radius:10px;font-weight:800}\
.gi .pular:focus{left:12px}\
.gi .bt{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:9px;height:46px;padding:0 20px;border-radius:999px;font-weight:800;font-size:14px;border:0;cursor:pointer;font-family:inherit;white-space:nowrap;transition:transform .35s var(--ease),box-shadow .35s var(--ease),background .3s}\
.gi .bt::after{content:\'\';position:absolute;top:0;left:-70%;width:45%;height:100%;background:linear-gradient(115deg,transparent,rgba(255,255,255,.55),transparent);transform:skewX(-20deg);transition:left .8s var(--ease);pointer-events:none}\
.gi .bt:hover{transform:translateY(-2px)}\
.gi .bt:hover::after{left:135%}\
.gi .bt:active{transform:scale(.97)}\
.gi .bt svg{transition:transform .4s var(--ease)}\
.gi .bt:hover svg{transform:translateX(4px)}\
.gi .bt-grande{height:58px;padding:0 28px;font-size:16px}\
.gi .bt-verde{background:var(--verde);color:var(--verde-ink)}\
.gi .bt-verde:hover{color:var(--verde-ink);box-shadow:0 16px 34px -14px rgba(@VERDE@,.7)}\
.gi .bt-linha{border:1px solid rgba(255,255,255,.3);color:#fff;background:transparent}\
.gi .bt-linha:hover{color:#fff;border-color:var(--verde)}\
.gi .bt-branco{background:#fff;color:var(--marinho)}\
.gi .bt-branco:hover{color:var(--marinho)}\
.gi .bt-marinho{background:var(--marinho);color:#fff;border-radius:14px;flex:1}\
.gi .bt-marinho:hover{color:#fff;background:var(--marinho-2)}\
.gi .bt-claro{background:var(--fundo);color:var(--marinho);height:40px}\
.gi .bt-claro:hover{background:var(--verde);color:var(--marinho)}\
.gi .bt-icone{width:46px;padding:0;border-radius:14px;background:var(--fundo);color:var(--marinho)}\
.gi .pulsa{animation:gi-pulsa 2.6s var(--ease) infinite}\
@keyframes gi-pulsa{0%{box-shadow:0 0 0 0 rgba(@VERDE@,.55)}70%{box-shadow:0 0 0 16px rgba(@VERDE@,0)}100%{box-shadow:0 0 0 0 rgba(@VERDE@,0)}}\
.gi section{margin-top:0}\
.gi .nav{background:transparent;border-bottom:0;backdrop-filter:none;-webkit-backdrop-filter:none;position:fixed;top:0;left:0;right:0;z-index:50;height:84px;padding:0 var(--gutter);display:flex;align-items:center;justify-content:space-between;gap:24px;transition:background .45s var(--ease),height .45s var(--ease),box-shadow .45s}\
.gi.rolou .nav{background:rgba(@NOITE@,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);height:70px;box-shadow:0 12px 30px -18px rgba(0,0,0,.6)}\
.gi .marca{display:flex;align-items:center;gap:12px;color:#fff;flex-shrink:0}\
.gi .marca:hover{color:#fff}\
.gi .marca img{width:50px;height:50px;border-radius:50%;background:#fff;transition:transform .8s var(--ease)}\
.gi .marca:hover img{transform:scale(1.08)}\
.gi .marca span{display:flex;flex-direction:column;line-height:1.1}\
.gi .marca b{font-family:\'Sora\',sans-serif;font-size:17px}\
.gi .marca small{font-size:10.5px;letter-spacing:.2em;color:var(--teal-claro);font-weight:700}\
.gi .links{display:flex;gap:30px;font-weight:600;font-size:15px}\
.gi .nl{color:rgba(255,255,255,.8);position:relative;padding:6px 0;white-space:nowrap}\
.gi .nl::after{content:\'\';position:absolute;left:0;right:0;bottom:-2px;height:2px;border-radius:2px;background:var(--verde);transform:scaleX(0);transform-origin:left;transition:transform .45s var(--ease)}\
.gi .nl:hover{color:var(--verde)}\
.gi .nl:hover::after{transform:scaleX(1)}\
.gi .acoes{display:flex;gap:10px;align-items:center}\
.gi .hamb{display:none;width:46px;height:46px;border:0;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;align-items:center;justify-content:center}\
.gi .so-celular{display:none}\
.gi .hero{position:relative;overflow:hidden;background:var(--noite);color:#fff;padding:120px var(--gutter) 0;min-height:min(920px,100svh)}\
.gi .anel{position:absolute;pointer-events:none}\
.gi .anel svg{width:100%;height:100%;overflow:visible}\
.gi .anel-a{right:-180px;top:60px;width:900px;height:900px;animation:gi-gira 80s linear infinite}\
.gi .anel-b{right:-60px;top:180px;width:660px;height:660px;animation:gi-gira 120s linear infinite reverse}\
.gi .girando .anel-a{animation-duration:14s}\
.gi .girando .anel-b{animation-duration:20s}\
.gi .onda{position:absolute;right:60px;top:300px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(@MENTA@,.5);animation:gi-onda 4.5s var(--ease) infinite;opacity:0;pointer-events:none}\
.gi .onda.d2{animation-delay:1.5s}\
.gi .onda.d3{animation-delay:3s}\
@keyframes gi-onda{0%{transform:scale(.55);opacity:.8}100%{transform:scale(1.25);opacity:0}}\
@keyframes gi-gira{to{transform:rotate(360deg)}}\
.gi .hero-grade{position:relative;display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:end;max-width:1300px;margin:0 auto}\
.gi .hero-texto{display:flex;flex-direction:column;gap:28px;padding-bottom:150px;animation:gi-sobe 1s var(--ease) both}\
@keyframes gi-sobe{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}\
.gi .pilula{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 10px;border-radius:999px;background:rgba(@TEAL@,.16);color:var(--teal-claro);font-size:12.5px;font-weight:700;letter-spacing:.08em}\
.gi .pilula i{width:8px;height:8px;border-radius:50%;background:var(--verde);animation:gi-pisca 2s ease-in-out infinite}\
@keyframes gi-pisca{50%{opacity:.3}}\
.gi .hero h1{font-size:clamp(56px,7.4vw,108px);font-weight:800;line-height:.95;letter-spacing:-.035em}\
.gi .hero h1 em,.gi .tit em{font-family:\'Instrument Serif\',serif;font-style:italic;font-weight:400;letter-spacing:-.01em}\
.gi .hero h1 em{color:var(--menta);font-size:1.12em}\
.gi .hero-texto>p{max-width:560px;color:rgba(255,255,255,.78);font-size:clamp(16px,1.4vw,20px);line-height:1.6}\
.gi .hero-bts{display:flex;gap:14px;flex-wrap:wrap}\
.gi .hero-foto{position:relative;display:flex;justify-content:center;align-items:flex-end}\
.gi .orbita{position:absolute;inset:-46px;border-radius:50%;animation:gi-gira 7s linear infinite;animation-play-state:paused;pointer-events:none;z-index:3}\
.gi .orbita .sat{position:absolute;right:4%;top:6%;width:25%;aspect-ratio:1;border-radius:50%;background:#fff;object-fit:cover;box-shadow:0 0 0 8px rgba(@VERDE@,.18),0 20px 40px -12px rgba(0,0,0,.5);animation:gi-gira 7s linear infinite reverse;animation-play-state:paused}\
.gi .girando .orbita,.gi .girando .orbita .sat{animation-play-state:running}\
.gi .rastro{position:absolute;inset:-46px;border-radius:50%;border:2px dashed rgba(@VERDE@,0);transition:border-color .6s;pointer-events:none}\
.gi .girando .rastro{border-color:rgba(@VERDE@,.45)}\
.gi .palco{position:relative;width:min(470px,100%);aspect-ratio:47/70;outline:none}\
.gi .janela{position:absolute;inset:0;border-radius:999px 999px 0 0;overflow:hidden;background:var(--noite-2)}\
.gi .slide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.2s var(--ease)}\
.gi .slide.on{opacity:1;animation:gi-kenburns 6.5s ease-out both}\
@keyframes gi-kenburns{from{transform:scale(1.14) translate(1.5%,1%)}to{transform:scale(1) translate(0,0)}}\
.gi .sombra{position:absolute;left:0;right:0;bottom:0;height:160px;background:linear-gradient(180deg,rgba(@NOITE@,0),rgba(@NOITE@,.7))}\
.gi .pontos{position:absolute;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:8px;z-index:2}\
.gi .ponto{width:10px;height:10px;border-radius:999px;border:0;padding:0;background:rgba(255,255,255,.4);cursor:pointer;transition:all .5s var(--ease)}\
.gi .ponto.on{width:34px;background:var(--verde)}\
.gi .ponto::before{content:\'\';display:block;width:44px;height:44px;margin:-17px 0 0 -17px}\
.gi .legenda{position:absolute;left:-24px;bottom:130px;width:220px;padding:18px 20px;border-radius:22px;background:rgba(255,255,255,.96);color:var(--marinho);box-shadow:0 24px 50px -20px rgba(0,0,0,.55);display:flex;flex-direction:column;gap:5px}\
.gi .legenda.troca{animation:gi-legenda .8s var(--ease)}\
@keyframes gi-legenda{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}\
.gi .l-selo{font-size:11px;letter-spacing:.18em;font-weight:800;color:var(--teal)}\
.gi .l-tit{font-family:\'Sora\',sans-serif;font-size:20px}\
.gi .l-txt{font-size:13px;color:var(--suave);line-height:1.45}\
.gi .numeros{position:absolute;left:var(--gutter);bottom:0;width:min(700px,calc(100% - 2*var(--gutter)));height:104px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.12)}\
.gi .numeros div{display:flex;flex-direction:column;justify-content:center;gap:4px}\
.gi .numeros b{font-family:\'Sora\',sans-serif;font-size:34px}\
.gi .numeros div:last-child b{color:var(--verde)}\
.gi .numeros span{font-size:11.5px;letter-spacing:.16em;font-weight:700;color:var(--teal-claro);text-transform:uppercase}\
.gi .faixa{height:64px;background:var(--teal);color:#fff;display:flex;align-items:center;overflow:hidden;font-weight:700;font-size:15px;letter-spacing:.04em;white-space:nowrap}\
.gi .marquee{display:flex;gap:28px;width:max-content;animation:gi-marquee 34s linear infinite}\
.gi .marquee:hover{animation-play-state:paused}\
.gi .marquee i{color:var(--marinho);font-style:normal}\
@keyframes gi-marquee{to{transform:translateX(-50%)}}\
.gi .sec{padding:72px var(--gutter);max-width:1440px;margin:0 auto}\
.gi .sec.branco{max-width:none;background:#fff}\
.gi .sec.branco>*{max-width:1248px;margin-left:auto;margin-right:auto}\
.gi .selo{display:block;font-size:13px;letter-spacing:.22em;font-weight:800;color:var(--teal);margin-bottom:14px}\
.gi .tit{font-size:clamp(36px,4.2vw,58px);font-weight:800;line-height:1.02;color:var(--marinho)}\
.gi .tit em{color:var(--teal);font-size:1.1em}\
.gi .lead{font-size:17px;line-height:1.7;color:var(--texto);max-width:540px}\
.gi .cab{margin-bottom:52px}\
.gi .cab.dupla{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:64px;align-items:end}\
.gi .cab.linha{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;flex-wrap:wrap}\
.gi .grade-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}\
.gi .card{background:#fff;border-radius:var(--raio);transition:transform .45s var(--ease),box-shadow .45s var(--ease)}\
.gi .card:hover{transform:translateY(-6px);box-shadow:0 26px 50px -26px rgba(@MARINHO@,.4)}\
.gi .zoom .foto{overflow:hidden;height:280px}\
.gi .zoom .foto img{width:100%;height:100%;object-fit:cover;transition:transform 1.1s var(--ease),filter .8s}\
.gi .zoom:hover .foto img{transform:scale(1.08) rotate(.6deg);filter:saturate(1.15)}\
.gi .card .corpo{padding:26px 28px 30px;display:flex;flex-direction:column;gap:10px}\
.gi .card h3{font-size:24px;font-weight:800;color:var(--marinho);letter-spacing:-.02em}\
.gi .card h3 em{font-family:\'Instrument Serif\',serif;font-style:italic;font-weight:400;color:var(--teal);font-size:28px;margin-right:6px}\
.gi .card p{font-size:15.5px;line-height:1.6;color:var(--suave)}\
.gi.js .revela{opacity:0;transform:translateY(28px)}\
.gi.js .revela.visto{opacity:1;transform:none;transition:opacity .9s var(--ease),transform .9s var(--ease),box-shadow .45s var(--ease)}\
.gi.js .revela.visto:hover{transform:translateY(-6px)}\
.gi .bloco-escuro{position:relative;overflow:hidden;margin:0 clamp(12px,2.8vw,40px);border-radius:40px;color:#fff;padding:72px clamp(20px,4vw,56px)}\
.gi .bloco-escuro .tit{color:#fff}\
.gi .bloco-escuro .tit em{color:var(--menta)}\
.gi .bloco-escuro .selo{color:var(--teal-claro)}\
.gi .bloco-escuro .lead{color:rgba(255,255,255,.78)}\
.gi .grad{background:var(--marinho)}\
.gi .anel-canto{position:absolute;right:-120px;top:-140px;width:520px;height:520px;border-radius:50%;border:1px dashed rgba(@TCLARO@,.35);animation:gi-gira 60s linear infinite;pointer-events:none}\
.gi .cordoes{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:18px;align-items:end;position:relative;margin-bottom:44px}\
.gi .cordao{display:flex;flex-direction:column;align-items:center;gap:14px;transition:transform .5s var(--ease)}\
.gi .cordao:hover{transform:translateY(-10px) scale(1.06)}\
.gi .corda{width:30px;height:var(--h);border-radius:15px;background:linear-gradient(var(--a) 0 33.3%,var(--b) 33.3% 66.6%,var(--c) 66.6%);box-shadow:0 0 0 1px rgba(255,255,255,.25),0 14px 26px -12px rgba(0,0,0,.6);transform-origin:bottom;animation:gi-cresce 1.2s var(--ease) both}\
.gi .cordao:nth-child(2) .corda{animation-delay:.06s}\
.gi .cordao:nth-child(3) .corda{animation-delay:.12s}\
.gi .cordao:nth-child(4) .corda{animation-delay:.18s}\
.gi .cordao:nth-child(5) .corda{animation-delay:.24s}\
.gi .cordao:nth-child(6) .corda{animation-delay:.3s}\
.gi .cordao:nth-child(7) .corda{animation-delay:.36s}\
.gi .cordao:nth-child(8) .corda{animation-delay:.42s}\
@keyframes gi-cresce{from{transform:scaleY(.2);opacity:0}to{transform:none;opacity:1}}\
.gi .cordao b{font-size:13px;text-align:center;line-height:1.25;min-height:34px}\
.gi .grad-rodape{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;padding:22px 26px;border-radius:22px;background:rgba(255,255,255,.07);font-size:15px;color:rgba(255,255,255,.82)}\
.gi .filtros{display:flex;gap:6px;padding:6px;border-radius:999px;background:#fff;flex-wrap:wrap}\
.gi .filtros button{height:42px;padding:0 18px;border:0;border-radius:999px;background:transparent;color:var(--marinho);font:700 14px \'Manrope\',sans-serif;cursor:pointer;transition:background .3s,color .3s}\
.gi .filtros button.on{background:var(--marinho);color:#fff}\
.gi .nucleo{padding:26px;display:flex;flex-direction:column;gap:18px}\
.gi .nucleo[hidden]{display:none}\
.gi .pessoa{display:flex;align-items:center;gap:16px}\
.gi .pessoa h3{font-size:20px}\
.gi .mini{display:block;font-size:11.5px;letter-spacing:.14em;font-weight:800;color:var(--teal);text-transform:uppercase}\
.gi .aro{position:relative;display:inline-block;flex-shrink:0;border-radius:50%;padding:4px}\
.gi .aro::before{content:\'\';position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--verde),var(--teal),var(--ouro),var(--verde));animation:gi-gira 3s linear infinite;animation-play-state:paused}\
.gi .card:hover .aro::before{animation-play-state:running}\
.gi .aro img,.gi .aro .sem-foto{position:relative;width:62px;height:62px;min-height:0;border-radius:50%;object-fit:cover;border:3px solid #fff}\
.gi .aro.grande img,.gi .aro.grande .sem-foto{width:112px;height:112px}\
.gi .info{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:14.5px;color:var(--texto)}\
.gi .info li{display:flex;gap:10px;align-items:flex-start}\
.gi .info svg{flex-shrink:0;color:var(--teal)}\
.gi .nucleo-bts{display:flex;gap:10px;margin-top:auto}\
.gi .nota{margin-top:24px;font-size:15px;color:var(--suave);line-height:1.6}\
.gi .vazio-filtro{margin-top:18px;font-weight:700;color:var(--marinho)}\
.gi .mestres{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px}\
.gi .mestre{display:flex;flex-direction:column;align-items:center;gap:12px;padding:22px 10px 24px;background:var(--fundo-2);text-align:center}\
.gi .mestre b{font-family:\'Sora\',sans-serif;font-size:16px;color:var(--marinho);line-height:1.2}\
.gi .mestre>span:last-child{font-size:12.5px;color:var(--suave);line-height:1.4}\
.gi .play{position:absolute;right:2px;bottom:4px;width:34px;height:34px;border-radius:50%;background:var(--marinho);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px var(--fundo-2);transition:transform .4s var(--ease)}\
.gi .mestre:hover .play{transform:scale(1.15)}\
.gi .agenda{display:grid;grid-template-columns:1.05fr .95fr;gap:40px;align-items:start}\
.gi .destaque{position:relative;border-radius:32px;overflow:hidden;min-height:520px;color:#fff}\
.gi .destaque>img,.gi .destaque>.sem-foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 60%}\
.gi .kb{animation:gi-kblento 18s ease-in-out infinite alternate}\
@keyframes gi-kblento{from{transform:scale(1)}to{transform:scale(1.12) translate(-2%,-1%)}}\
.gi .veu{position:absolute;inset:0;background:linear-gradient(180deg,rgba(@NOITE@,0) 25%,rgba(@NOITE@,.94) 100%)}\
.gi .dest-txt{position:absolute;left:36px;right:36px;bottom:34px;display:flex;flex-direction:column;gap:14px}\
.gi .dest-txt h3{font-size:clamp(28px,3vw,40px);line-height:1.05}\
.gi .dest-txt p{color:rgba(255,255,255,.86);font-weight:600}\
.gi .tag-verde{align-self:flex-start;padding:7px 14px;border-radius:999px;background:var(--verde);color:var(--verde-ink);font-size:12px;font-weight:800;letter-spacing:.14em}\
.gi .linha-bts{display:flex;gap:12px;flex-wrap:wrap;align-items:center}\
.gi .eventos{display:flex;flex-direction:column;margin-top:26px}\
.gi .evento{display:grid;grid-template-columns:64px minmax(0,1fr) auto;gap:18px;align-items:center;padding:16px 8px 16px 0;border-bottom:1px solid var(--linha);border-radius:12px;transition:padding .45s var(--ease),background .45s}\
.gi .evento:hover{padding-left:12px;background:rgba(@TEAL@,.07)}\
.gi .data{display:flex;flex-direction:column;align-items:center;line-height:1}\
.gi .data b{font-family:\'Sora\',sans-serif;font-size:26px;color:var(--marinho)}\
.gi .data small{font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--teal)}\
.gi .ev-txt{display:flex;flex-direction:column;gap:3px}\
.gi .ev-txt b{font-size:16px;color:var(--tinta)}\
.gi .ev-txt small{font-size:13.5px;color:var(--suave)}\
.gi .ev-acao{font-size:13px;font-weight:800;color:var(--teal);display:flex;align-items:center;gap:6px}\
.gi .app{background:var(--noite);display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}\
.gi .brilho{position:absolute;left:44%;top:50%;width:640px;height:640px;margin:-320px 0 0 -40px;border-radius:50%;background:radial-gradient(circle,rgba(@TEAL@,.35),rgba(@TEAL@,0) 65%);animation:gi-respira 8s ease-in-out infinite;pointer-events:none}\
@keyframes gi-respira{50%{transform:scale(1.15);opacity:.7}}\
.gi .app-txt{position:relative;display:flex;flex-direction:column;gap:22px}\
.gi .recursos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 22px;max-width:540px}\
.gi .recursos li{display:flex;gap:12px;align-items:flex-start}\
.gi .recursos i{flex-shrink:0;width:30px;height:30px;border-radius:10px;background:rgba(@VERDE@,.14);color:var(--verde);display:flex;align-items:center;justify-content:center}\
.gi .recursos b{display:block;font-size:15px}\
.gi .recursos small{font-size:13px;color:rgba(255,255,255,.64);line-height:1.45}\
.gi .icones{display:flex;gap:10px}\
.gi .icones img{width:48px;height:48px;border-radius:13px;background:#fff;transition:transform .5s var(--ease)}\
.gi .icones img:hover{transform:rotate(-8deg) scale(1.1)}\
.gi .app-prints{position:relative;min-height:640px}\
.gi .print{position:absolute;margin:0;width:min(290px,46%)}\
.gi .print img{width:100%;filter:drop-shadow(0 40px 50px rgba(0,0,0,.55));transition:transform .8s var(--ease)}\
.gi .print:hover img{transform:scale(1.04)}\
.gi .print figcaption{position:absolute;padding:8px 14px;border-radius:999px;background:#fff;color:var(--marinho);font-size:12px;font-weight:800;white-space:nowrap}\
.gi .print figcaption.verde{background:var(--verde);color:var(--verde-ink)}\
.gi .p1{left:2%;top:70px;rotate:-5deg}\
.gi .p1 figcaption{left:20px;top:-18px}\
.gi .p2{left:48%;top:20px;rotate:5deg}\
.gi .p2 figcaption{right:10px;bottom:-12px}\
.gi .flutua{animation:gi-flutua 6s ease-in-out infinite}\
.gi .flutua.d2{animation-delay:-3s}\
@keyframes gi-flutua{0%,100%{translate:0 0}50%{translate:0 -14px}}\
.gi .produto{padding:14px;display:grid;grid-template-columns:150px minmax(0,1fr);gap:18px;align-items:center}\
.gi .produto .foto{height:180px;border-radius:18px}\
.gi .produto .corpo{padding:0 10px 0 0;gap:8px}\
.gi .produto h3{font-size:19px}\
.gi .produto p{font-size:13.5px}\
.gi .preco{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px}\
.gi .preco b{font-family:\'Sora\',sans-serif;font-size:20px}\
.gi .chamada{position:relative;overflow:hidden;margin:0 clamp(12px,2.8vw,40px) 0;border-radius:40px;min-height:600px;display:flex;align-items:center}\
.gi .chamada .fundo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 40%}\
.gi .veu-lado{position:absolute;inset:0;background:linear-gradient(90deg,rgba(@NOITE@,.96) 0%,rgba(@NOITE@,.86) 48%,rgba(@NOITE@,.35) 100%)}\
.gi .chamada-grade{position:relative;width:100%;min-width:0;padding:64px clamp(20px,4vw,56px);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,440px);gap:48px;align-items:center}\
.gi .chamada .tit{color:#fff;font-size:clamp(38px,4.6vw,66px)}\
.gi .chamada .tit em{color:var(--menta)}\
.gi .chamada .lead{color:rgba(255,255,255,.82);margin-top:18px}\
.gi .form-aula{background:#fff;border-radius:28px;padding:30px;display:flex;flex-direction:column;gap:14px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6)}\
.gi .form-aula>b{font-family:\'Sora\',sans-serif;font-size:22px;color:var(--marinho)}\
.gi .form-aula label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:700;color:var(--texto)}\
.gi .form-aula input,.gi .form-aula select{width:100%;min-width:0;height:50px;border:1px solid var(--linha);border-radius:12px;padding:0 14px;font:500 15px \'Manrope\',sans-serif;color:var(--tinta);background:#fff;transition:border-color .3s,box-shadow .3s}\
.gi .form-aula input:focus,.gi .form-aula select:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 4px rgba(@TEAL@,.18)}\
.gi .ajuda{font-size:12.5px;color:var(--suave);text-align:center}\
.gi .parceiros{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,520px),1fr));gap:26px}\
.gi .parceiro{position:relative;overflow:hidden;background:#fff;border-radius:var(--raio);display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:stretch;box-shadow:0 30px 60px -40px rgba(@MARINHO@,.45)}\
.gi .so-um .parceiro{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}\
.gi .parc-logo{position:relative;display:flex;align-items:center;justify-content:center;padding:40px 32px;background:radial-gradient(120% 90% at 50% 45%,#fff 40%,var(--fundo) 100%);isolation:isolate}\
.gi .parc-aura{position:absolute;width:74%;aspect-ratio:1;border-radius:50%;z-index:-1;background:conic-gradient(from 0deg,rgba(@TEAL@,.22),rgba(@VERDE@,.16),rgba(@TEAL@,.22));filter:blur(28px);animation:gi-parc-gira 14s linear infinite}\
@keyframes gi-parc-gira{to{transform:rotate(360deg)}}\
.gi .parc-img{width:min(280px,100%);height:auto;transition:transform .9s var(--ease);filter:drop-shadow(0 18px 24px rgba(@MARINHO@,.18))}\
.gi .parceiro:hover .parc-img{transform:scale(1.05) rotate(-2deg)}\
.gi .parc-txt{padding:40px 44px;display:flex;flex-direction:column;gap:16px;justify-content:center;border-left:1px solid var(--linha)}\
.gi .parc-selo{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--marinho);background:var(--fundo);padding:7px 12px;border-radius:999px}\
.gi .parc-selo svg{color:var(--teal)}\
.gi .parc-frase{font-size:clamp(28px,3vw,42px);font-weight:800;line-height:1.05;color:var(--marinho);text-wrap:balance}\
.gi .parc-frase em{font-family:\'Instrument Serif\',serif;font-style:italic;font-weight:400;color:var(--teal);font-size:1.12em}\
.gi .parc-oferta{display:flex;align-items:center;gap:16px}\
.gi .parc-oferta b{font-family:\'Sora\',sans-serif;font-size:clamp(34px,3.4vw,48px);font-weight:800;letter-spacing:-.04em;line-height:1;background:linear-gradient(100deg,var(--teal),var(--marinho));-webkit-background-clip:text;background-clip:text;color:transparent;white-space:nowrap}\
.gi .parc-oferta span{font-size:15px;font-weight:700;line-height:1.4;color:var(--tinta);max-width:220px}\
.gi .parc-como{font-size:15px;line-height:1.6;color:var(--suave);padding:14px 16px;border-radius:16px;background:var(--fundo)}\
.gi .parc-bts{display:flex;gap:10px;flex-wrap:wrap}\
@media (prefers-reduced-motion:reduce){.gi .parc-aura{animation:none}}\
@media (max-width:860px){.gi .parceiro,.gi .so-um .parceiro{grid-template-columns:1fr}.gi .parc-logo{padding:30px 24px 18px}.gi .parc-img{width:min(210px,70%)}.gi .parc-txt{padding:24px 20px 28px;border-left:0;border-top:1px solid var(--linha)}.gi .parc-oferta{flex-wrap:wrap;gap:8px 14px}}\
.gi .rodape{padding:64px var(--gutter) 40px;max-width:1440px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:40px;font-size:14px;color:var(--texto)}\
.gi .rodape>div{display:flex;flex-direction:column;gap:10px}\
.gi .rod-marca img{width:56px;height:56px;border-radius:50%;background:#fff}\
.gi .rod-marca b{font-family:\'Sora\',sans-serif;font-size:20px;color:var(--marinho);line-height:1.1}\
.gi .rod-marca p{line-height:1.6;color:var(--suave);max-width:320px}\
.gi .copy{grid-column:1/-1;border-top:1px solid var(--linha);padding-top:24px;font-size:13px;color:var(--suave)}\
@media (max-width:1100px){.gi .links{gap:18px;font-size:14px}.gi .esconde-celular{display:none}.gi .hero-grade{grid-template-columns:1fr .8fr;gap:32px}.gi .cordoes{gap:10px}.gi .cordao b{font-size:11.5px}.gi .app{grid-template-columns:1fr}.gi .app-prints{min-height:560px}.gi .grade-3{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (max-width:860px){.gi .nav{height:68px}.gi .marca img{width:40px;height:40px}.gi .marca small{display:none}.gi .hamb{display:flex}.gi .acoes .bt-verde{display:none}.gi .links{position:fixed;inset:68px 0 auto 0;flex-direction:column;gap:0;padding:12px 20px 24px;background:rgba(@NOITE@,.98);backdrop-filter:blur(14px);transform:translateY(-120%);transition:transform .5s var(--ease);box-shadow:0 30px 40px -20px rgba(0,0,0,.6)}.gi.menu-aberto .links{transform:none}.gi .links .nl{padding:14px 4px;font-size:17px;border-bottom:1px solid rgba(255,255,255,.08)}.gi .so-celular{display:block}.gi .hero{padding-top:88px;min-height:0}.gi .hero-grade{grid-template-columns:1fr;gap:26px}.gi .hero-foto{order:-1}.gi .palco{width:min(300px,78vw)}.gi .legenda{display:none}.gi .hero-texto{padding-bottom:130px;gap:20px}.gi .hero-bts .bt{flex:1 1 100%}.gi .anel-a{right:-420px;top:-40px}.gi .anel-b{display:none}.gi .onda{right:-60px;top:40px;width:340px;height:340px}.gi .numeros{height:96px}.gi .numeros b{font-size:26px}.gi .numeros span{font-size:10px;letter-spacing:.1em}.gi .sec{padding:72px 16px}.gi .cab{margin-bottom:32px}.gi .cab.dupla{grid-template-columns:1fr;gap:18px}.gi .grade-3{grid-template-columns:1fr}.gi .zoom .foto{height:220px}.gi .bloco-escuro{padding:56px 18px;border-radius:28px}.gi .cordoes{gap:6px}.gi .corda{width:22px;height:calc(var(--h) * .7)}.gi .cordao b{font-size:11px;min-height:0;height:82px;writing-mode:vertical-rl;transform:rotate(180deg);text-align:left;letter-spacing:.02em}.gi .agenda{grid-template-columns:1fr}.gi .destaque{min-height:440px}.gi .dest-txt{left:20px;right:20px;bottom:22px}.gi .recursos{grid-template-columns:1fr}.gi .app-prints{min-height:420px}.gi .print{width:48%}.gi .p1{left:0;top:40px}.gi .p2{left:50%;top:0}.gi .produto{grid-template-columns:110px minmax(0,1fr)}.gi .produto .foto{height:140px}.gi .chamada{min-height:0}.gi .chamada-grade{grid-template-columns:minmax(0,1fr);padding:44px 18px;gap:28px}.gi .veu-lado{background:linear-gradient(180deg,rgba(@NOITE@,.95),rgba(@NOITE@,.8))}.gi .rodape{grid-template-columns:1fr 1fr;padding:56px 16px 28px}.gi .rod-marca{grid-column:1/-1}.gi .mestres{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media (max-width:860px){.gi .orbita,.gi .rastro{inset:-26px}.gi .sec{padding:52px var(--gutter)}.gi .bloco-escuro{padding:52px clamp(20px,4vw,56px)}}\
@media (max-width:380px){.gi .hero h1{font-size:50px}}\
.gi .parc-bts .bt{height:48px;flex:1 1 210px;justify-content:center;gap:8px}\
.gi .parc-bt-site svg{color:var(--teal)}\
.gi /* ---- telas do app desenhadas (substituem os prints com dados pessoais) ---- */\
.tela{position:relative;aspect-ratio:273/555;border-radius:38px;padding:10px 10px 0;background:#fff;box-shadow:0 0 0 7px #111,0 0 0 8px #3a3a3a;overflow:hidden;font-family:\'Manrope\',sans-serif;color:#0D211D;display:flex;flex-direction:column;gap:8px;filter:drop-shadow(0 40px 50px rgba(0,0,0,.55));transition:transform .8s var(--ease)}\
.gi .print:hover .tela{transform:scale(1.04)}\
.gi .tela small{font-size:9px;color:#5b6b70;line-height:1.3}\
.gi .tela b{font-weight:800}\
.gi .t-status{display:flex;align-items:center;justify-content:space-between;margin:-10px -10px 0;padding:10px 18px 8px;background:var(--marinho);color:#fff;font-size:10px}\
.gi .tela-rede .t-status{background:var(--teal)}\
.gi .t-status .ilha{width:64px;height:16px;border-radius:10px;background:#000}\
.gi .t-status i{width:22px;height:8px;border-radius:3px;background:#fff;opacity:.9}\
.gi .t-topo{display:flex;align-items:center;gap:8px;padding:2px 2px 0}\
.gi .t-topo>div{flex:1;display:flex;flex-direction:column;line-height:1.15}\
.gi .t-topo>div b{font-family:\'Sora\',sans-serif;font-size:13px;color:var(--marinho)}\
.gi .t-av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--teal);color:#fff;font:800 11px \'Sora\',sans-serif;box-shadow:0 0 0 2px #fff,0 0 0 4px var(--verde)}\
.gi .t-sino{width:24px;height:24px;border-radius:50%;border:1px solid #dde7e5}\
.gi .t-app{padding:5px 8px;border-radius:9px;background:var(--teal);color:#fff;font:800 9px \'Manrope\',sans-serif}\
.gi .t-chips{display:flex;gap:5px;flex-wrap:wrap}\
.gi .t-chips span{font-size:8.5px;font-weight:800;padding:3px 7px;border-radius:999px}\
.gi .ch-verde{background:#E3F7EE;color:#167a4a}\
.gi .ch-ouro{background:#FFF3D6;color:#9a6a00}\
.gi .ch-azul{background:#E4EDFB;color:#1c4fa0}\
.gi .t-prog{display:flex;justify-content:space-between;align-items:center;font-size:9px}\
.gi .t-prog>b{color:var(--teal);font-size:10px}\
.gi .t-barra{height:9px;border-radius:5px;background:#e9efee;overflow:hidden}\
.gi .t-barra i{display:block;width:72%;height:100%;background:repeating-linear-gradient(-45deg,#e53935 0 6px,#fff 6px 12px);border-radius:5px}\
.gi .t-grade{display:grid;grid-template-columns:1fr 1fr;gap:6px}\
.gi .t-grade>div{border:1px solid #e3ecea;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:2px;min-width:0}\
.gi .t-grade b{font-size:10px;color:var(--marinho)}\
.gi .t-grade .num{font:800 16px \'Sora\',sans-serif;color:var(--teal)}\
.gi .t-grade .num.ouro{color:var(--ouro)}\
.gi .ico{width:18px;height:18px;border-radius:6px;margin-bottom:4px}\
.gi .ic-a{background:#E3F7EE}\
.gi .ic-b{background:#E8F5E9}\
.gi .t-rede{border-radius:12px;padding:10px;background:#1fb760;color:#fff;display:flex;flex-direction:column}\
.gi .t-rede b{font-size:11px}\
.gi .t-rede small{color:rgba(255,255,255,.85)}\
.gi .t-abas{margin:auto -10px 0;display:flex;justify-content:space-around;align-items:center;padding:9px 6px 14px;border-top:1px solid #e6eeec;background:#fff;font-size:8px;font-weight:700;color:#7b8a8e}\
.gi .t-abas .on{color:var(--marinho);background:#E4EDFB;padding:4px 8px;border-radius:999px}\
.gi .t-abas .mais{width:24px;height:24px;border-radius:50%;background:#1fb760;color:#fff;display:grid;place-items:center;font-size:14px}\
.gi .t-capa{position:relative;height:84px;border-radius:14px;background:linear-gradient(135deg,var(--teal),var(--marinho));margin-bottom:18px}\
.gi .t-avg{position:absolute;left:10px;bottom:-18px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:#F4EBD0;color:var(--marinho);font:800 13px \'Sora\',sans-serif;box-shadow:0 0 0 3px #fff}\
.gi .t-nome{display:flex;flex-direction:column;gap:2px}\
.gi .t-nome b{font-family:\'Sora\',sans-serif;font-size:12.5px;color:var(--marinho)}\
.gi .t-nums{display:grid;grid-template-columns:repeat(3,1fr);text-align:center}\
.gi .t-nums b{display:block;font:800 13px \'Sora\',sans-serif;color:var(--marinho)}\
.gi .t-priv{position:relative;border-radius:12px;padding:9px 40px 9px 10px;background:var(--marinho);color:#fff;display:flex;flex-direction:column}\
.gi .t-priv b{font-size:10px}\
.gi .t-priv small{color:rgba(255,255,255,.75)}\
.gi .t-priv i{position:absolute;right:10px;top:50%;width:26px;height:15px;margin-top:-7.5px;border-radius:9px;background:#1fb760}\
.gi .t-priv i::after{content:\'\';position:absolute;right:2px;top:2px;width:11px;height:11px;border-radius:50%;background:#fff}\
.gi .icones .ic-app,.gi .icones .ic-rede{width:48px;height:48px;border-radius:13px;display:grid;place-items:center;font:800 15px \'Sora\',sans-serif;transition:transform .5s var(--ease)}\
.gi .icones .ic-app{background:#fff;color:var(--marinho)}\
.gi .icones .ic-rede{background:var(--verde);color:var(--marinho)}\
.gi .icones span:hover{transform:rotate(-8deg) scale(1.1)}\
.gi /* ---- Ginga: extras do template (avisos do app,.gi núcleos sem WhatsApp) ---- */\
.avisos{margin-top:30px;display:flex;flex-direction:column;gap:10px}\
.gi .avisos>b{font-family:\'Sora\',sans-serif;font-size:15px;color:var(--marinho);display:flex;align-items:center;gap:8px}\
.gi .avisos>b i{width:8px;height:8px;border-radius:50%;background:var(--verde);animation:gi-pisca 2s ease-in-out infinite}\
.gi .aviso{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:start;padding:14px 16px;border-radius:16px;background:#fff;box-shadow:0 14px 30px -24px rgba(0,45,114,.5)}\
.gi .aviso .av-ic{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:rgba(56,158,146,.14);color:var(--teal)}\
.gi .aviso b{display:block;font-size:15px;color:var(--tinta)}\
.gi .aviso p{font-size:13.5px;line-height:1.5;color:var(--suave);margin-top:2px}\
.gi .aviso small{display:block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);margin-top:6px}\
.gi .app-tag{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--teal)}\
.gi .chamada-cta{background:#fff;border-radius:28px;padding:30px;display:flex;flex-direction:column;gap:14px;box-shadow:0 40px 80px -30px rgba(0,0,0,.6)}\
.gi .chamada-cta>b{font-family:\'Sora\',sans-serif;font-size:22px;color:var(--marinho)}\
.gi .chamada-cta p{font-size:14.5px;line-height:1.6;color:var(--suave)}\
.gi .marca .mk{width:50px;height:50px;border-radius:50%;background:#fff;color:var(--marinho);display:grid;place-items:center;font:800 16px \'Sora\',sans-serif;flex-shrink:0}\
.gi .rod-marca .mk{width:56px;height:56px;border-radius:50%;background:var(--marinho);color:#fff;display:grid;place-items:center;font:800 18px \'Sora\',sans-serif}\
.gi .legenda .l-txt:empty{display:none}\
@media (max-width:860px){.gi .marca .mk{width:40px;height:40px;font-size:13px}}\
';

function css(t){
  var base = CSS_BASE.split('@TEAL@').join(t.tealRgb).split('@VERDE@').join(t.verdeRgb).split('@NOITE@').join(t.noiteRgb)
    .split('@MARINHO@').join(t.marinhoRgb).split('@MENTA@').join(t.mentaRgb).split('@TCLARO@').join(t.tclaroRgb);
  return '\
.gi,.gi *,.gi *::before,.gi *::after{box-sizing:border-box}\
.gi{--noite:'+t.noite+';--noite-2:'+t.noite2+';--marinho:'+t.marinho+';--marinho-2:'+t.marinho2+';--teal:'+t.teal+';--teal-claro:'+t.tclaro+';--menta:'+t.menta+';--verde:'+t.verde+';--verde-ink:'+t.verdeInk+';\
 --fundo:'+t.fundo+';--fundo-2:'+t.fundo2+';--branco:#FFFFFF;--tinta:#0D211D;--texto:#3C4F58;--suave:#4A5D66;--linha:'+t.linha+';--ouro:#DAA520;\
 --ease:cubic-bezier(.16,1,.3,1);--gutter:clamp(16px,6.6vw,96px);--raio:28px;\
 position:relative;font-family:"Manrope",system-ui,sans-serif;color:var(--tinta);background:var(--fundo);-webkit-font-smoothing:antialiased;overflow-x:clip}\
.gi img{max-width:100%;display:block}.gi a{color:var(--marinho);text-decoration:none}.gi a:hover{color:var(--teal)}\
.gi :focus-visible{outline:3px solid var(--verde);outline-offset:3px;border-radius:8px}\
.gi h1,.gi h2,.gi h3{margin:0;font-family:"Sora",sans-serif;letter-spacing:-.03em}.gi p{margin:0}\
' + base + '\
.gi .produto .foto.desenho{display:grid;place-items:center;background:radial-gradient(circle at 50% 58%,#fff 0,var(--fundo-2) 60%,var(--linha) 100%)}\
.gi .produto .lj-svg{display:block;width:88%;transition:transform .9s var(--ease)}.gi .produto .lj-svg svg{display:block;width:100%;height:auto;filter:drop-shadow(0 12px 12px rgba(0,0,0,.18))}\
.gi .produto:hover .lj-svg{transform:scale(1.06) rotate(-2deg)}';
}

/* ========================================================================== */
/*  Cor e utilidades                                                           */
/* ========================================================================== */
function hex6(v){ var s = String(v || '').trim(); if(/^#[0-9a-f]{3}$/i.test(s)) s = '#'+s[1]+s[1]+s[2]+s[2]+s[3]+s[3]; return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null; }
function rgb(hex){ var c = String(hex).replace('#',''); return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]; }
function lum(hex){ var c = rgb(hex); return (0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]) / 255; }
function mix(a, b, p){ var x = rgb(a), y = rgb(b), out = '#'; for(var i = 0; i < 3; i++){ var v = Math.round(x[i] + (y[i] - x[i]) * p); out += ('0' + v.toString(16)).slice(-2); } return out; }
function tri(hex){ return rgb(hex).join(','); }
function cores(s){
  var c = s.cores || {};
  var marinho = hex6(c.principal) || '#002d72', teal = hex6(c.destaque) || '#389e92', verde = hex6(c.botao) || '#00e676';
  if(lum(marinho) > 0.45) marinho = mix(marinho, '#000000', .55);      // fundo escuro com texto branco precisa ser escuro
  var t = { marinho:marinho, teal:teal, verde:verde };
  t.noite = mix(marinho, '#000000', .45); t.noite2 = mix(marinho, '#000000', .2); t.marinho2 = mix(marinho, '#ffffff', .12);
  t.menta = mix(teal, '#ffffff', .55); t.tclaro = mix(teal, '#ffffff', .45);
  t.fundo = mix(teal, '#ffffff', .9); t.fundo2 = mix(teal, '#ffffff', .95); t.linha = mix(teal, '#ffffff', .78);
  t.verdeInk = lum(verde) > 0.5 ? marinho : '#ffffff';
  t.tealRgb = tri(teal); t.verdeRgb = tri(verde); t.noiteRgb = tri(t.noite); t.marinhoRgb = tri(marinho); t.mentaRgb = tri(t.menta); t.tclaroRgb = tri(t.tclaro);
  return t;
}
var digitos = function(v){ return String(v == null ? '' : v).replace(/\D/g, ''); };
function linkWhats(numero, texto){ var d = digitos(numero); if(d.length < 10 || d.length > 13) return ''; if(!(d.indexOf('55') === 0 && d.length >= 12)) d = '55' + d; return 'https://wa.me/' + d + (texto ? '?text=' + encodeURIComponent(texto) : ''); }
var linkMapa = function(e){ return e ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e) : ''; };
var urlLink = function(u){ var s = String(u == null ? '' : u).trim(); return /^https:\/\/[^\s"'<>\\]+$/i.test(s) ? s : ''; };
var urlSite = function(u){ var s = String(u == null ? '' : u).trim(); if(urlLink(s)) return s; return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/[^\s"'<>\\]*)?$/i.test(s) ? 'https://' + s : ''; };
var hostDe = function(u){ try{ return new URL(u).hostname.replace(/^www\./, ''); }catch(e){ return ''; } };
var posicao = function(p){ return /^\d{1,3}% \d{1,3}%$/.test(String(p || '')) ? p : '50% 50%'; };
function iniciais(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase(); }
function pluralPeca(p){ var s = String(p || 'graduação').trim(); if(/ão$/i.test(s)) return s.replace(/ão$/i, 'ões'); if(/l$/i.test(s)) return s.replace(/l$/i, 'is'); if(/[sz]$/i.test(s)) return s; return s + 's'; }
function hojeLocal(){ try{ return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()); }catch(e){ return new Date().toISOString().slice(0, 10); } }
var MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
var MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/* ========================================================================== */
/*  Ícones (traço, sem emoji) — os mesmos do site original                     */
/* ========================================================================== */
var I = {
  seta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  pino: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  pessoa: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  relogio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  conversa: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.2A8.5 8.5 0 1 1 21 12z"/></svg>',
  rota: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  certo: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  baixar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  globo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  mais: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  sino: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>'
};

/* ========================================================================== */
/*  Render                                                                     */
/* ========================================================================== */
export function render(s, h){
  var esc = h.esc, url = h.url;
  var modReal = String(h.modalidade || s.modalidade || '').toLowerCase();
  var chave = modReal === 'capoeira' ? 'capoeira' : 'arena';
  var V = (h.VOCAB && (h.VOCAB[modReal] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia' };
  var tituloLider = (h.LIDER && h.LIDER[modReal]) || 'Professor';
  var t = cores(s);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('gi-fonts')){
    var l = document.createElement('link'); l.id = 'gi-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('gi-css');
  if(!st){ st = document.createElement('style'); st.id = 'gi-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  // Conteúdo do painel "Meu site" por cima dos padrões.
  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function img(src, alt, extra){ var u = url(src); return u ? '<img src="'+esc(u)+'" alt="'+esc(alt)+'" loading="lazy" decoding="async"'+(extra || '')+'>' : '<span class="sem-foto" role="img" aria-label="'+esc(alt)+'"></span>'; }
  function titulo(tit, dest, tag){ tag = tag || 'h2'; return '<'+tag+' class="tit">'+esc(tit)+(dest ? ' <em>'+esc(dest)+'</em>' : '')+'</'+tag+'>'; }
  function selo(x){ return x ? '<span class="selo">'+esc(x)+'</span>' : ''; }

  var R = function(rota){ return '/'+encodeURIComponent(s.slug)+'/'+rota; };
  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var todas = treino.concat(fachada, equipeF);
  var foto = function(i){ return todas.length ? todas[i % todas.length] : ''; };
  var logo = url(s.logo), ini = iniciais(s.nomeCurto);
  var peca = String(s.peca || 'graduação'), pecaPl = pluralPeca(peca), pecaCap = peca.charAt(0).toUpperCase() + peca.slice(1);
  var nomeRede = 'Rede ' + s.nomeCurto;
  var hoje = hojeLocal();

  // Escada (3 faixas de cor por cordão quando o cadastro tem; senão a cor única repetida).
  var escada = (Array.isArray(s.escada3) && s.escada3.length ? s.escada3 : (Array.isArray(s.escada) ? s.escada.map(function(b){ return { nome:b.nome, cor:[b.cor, b.cor, b.cor] }; }) : []))
    .filter(function(b){ return b && b.nome; }).slice(0, 14)
    .map(function(b){ var c = (Array.isArray(b.cor) ? b.cor : [b.cor]).map(hex6); var a = c[0] || '#9aa7b4'; return { nome:String(b.nome), cor:[a, c[1] || a, c[2] || a] }; });

  // Núcleos: painel (completos) → cadastro (só nome/cidade).
  var nucPainel = lista('nucleos', 'lista', 12).filter(function(x){ return cs(x, 'nome'); }).map(function(x){
    return { nome:cs(x, 'nome'), bairro:cs(x, 'bairro'), dias:cs(x, 'dias'), horario:cs(x, 'horario'), endereco:cs(x, 'endereco'), whatsapp:cs(x, 'whatsapp'), foto:cs(x, 'foto'), infantil:cs(x, 'infantil') === '1', noite:cs(x, 'noite') === '1' };
  });
  var nucCadastro = (Array.isArray(s.nucleosInfo) ? s.nucleosInfo : []).filter(function(n){ return n && n.nome; }).map(function(n){
    return { nome:String(n.nome), bairro:n.sede ? 'Sede' : (n.cidade ? String(n.cidade) + (n.uf ? ' · ' + String(n.uf) : '') : ''), dias:'', horario:'', endereco:'', whatsapp:'', foto:'', infantil:false, noite:false };
  });
  var nucs = nucPainel.length ? nucPainel : nucCadastro;

  // Corpo docente: painel → equipe do cadastro → responsável.
  var mestres = lista('mestres', 'lista', 12).filter(function(x){ return cs(x, 'nome'); }).map(function(x){ return { nome:cs(x, 'nome'), cargo:cs(x, 'cargo'), foto:cs(x, 'foto'), instagram:cs(x, 'instagram') }; });
  if(!mestres.length && Array.isArray(s.equipe)) s.equipe.forEach(function(m){ if(m && m.nome) mestres.push({ nome:String(m.nome), cargo:String(m.graduacao || ''), foto:m.foto || '', instagram:'' }); });
  if(!mestres.length && s.lider) mestres.push({ nome:String(s.lider), cargo:(s.responsavel && s.responsavel.graduacao) || tituloLider, foto:s.fotoLider || '', instagram:'' });

  // Agenda: eventos do app (agendaPublica) + eventos extras do painel. Avisos: só do app.
  var doApp = Array.isArray(s.agenda) ? s.agenda : [];
  var eventos = doApp.filter(function(a){ return a.tipo === 'evento' && a.titulo; }).map(function(a){ return { titulo:a.titulo, d:/^\d{4}-\d{2}-\d{2}$/.test(a.data || '') ? a.data : '', local:a.local || a.nucleo || '', horario:a.hora || '', mapa:a.local || '', fotos:'', app:true }; });
  lista('agenda', 'lista', 10).forEach(function(x){
    var tt = cs(x, 'titulo'); if(!tt) return;
    var dia = digitos(cs(x, 'dia')).slice(0, 2), mes = digitos(cs(x, 'mes')).slice(0, 2), ano = digitos(cs(x, 'ano')).slice(0, 4) || hoje.slice(0, 4);
    var d = (dia && mes) ? ano + '-' + ('0'+mes).slice(-2) + '-' + ('0'+dia).slice(-2) : '';
    eventos.push({ titulo:tt, d:/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '', local:cs(x, 'local'), horario:cs(x, 'horario'), mapa:cs(x, 'mapa'), fotos:cs(x, 'fotos'), app:false });
  });
  var avisos = doApp.filter(function(a){ return a.tipo === 'aviso' && a.titulo; }).slice(0, 4);

  // Quem atende a aula experimental pelo WhatsApp (núcleos do painel com número).
  var comWhats = nucs.filter(function(x){ return linkWhats(x.whatsapp); });

  /* ---------- navegação ---------- */
  var links = [['#grupo', 'O grupo']].concat(escada.length ? [['#graduacao', 'Graduação']] : [], nucs.length ? [['#nucleos', 'Núcleos']] : [], [['#mestres', 'Equipe'], ['#agenda', 'Agenda']], lista('loja', 'produtos', 6).length ? [['#loja', 'Loja']] : [], [['#app', 'App']]);
  var marcaImg = logo ? '<img src="'+esc(logo)+'" alt="" width="52" height="52">' : '<span class="mk">'+esc(ini)+'</span>';
  var nav = '<header class="nav" id="gi-topo">'
    + '<a class="marca" href="#inicio" aria-label="'+esc(s.nome)+' — início">'+marcaImg+'<span><b>'+esc(s.nomeCurto)+'</b><small>'+esc(V.nomeMod.toUpperCase())+(s.lider ? ' · '+esc(String(s.lider).toUpperCase()) : '')+'</small></span></a>'
    + '<nav class="links" id="gi-menu" aria-label="Principal">'+links.map(function(x){ return '<a class="nl" href="'+x[0]+'">'+x[1]+'</a>'; }).join('')
    + '<a class="nl so-celular" href="'+esc(R('login'))+'">Área do aluno</a><a class="nl so-celular" href="'+esc(R('instalar'))+'">Instalar o app</a></nav>'
    + '<div class="acoes"><a class="bt bt-linha esconde-celular" href="'+esc(R('login'))+'">'+I.pessoa+' Área do aluno</a><a class="bt bt-verde" href="#aula">Aula experimental</a>'
    + '<button class="hamb" type="button" aria-label="Abrir menu" aria-controls="gi-menu" aria-expanded="false">'+I.menu+'</button></div></header>';

  /* ---------- hero ---------- */
  var tp = TOPO[chave];
  var slidesP = lista('topo', 'slides', 5).filter(function(x){ return url(cs(x, 'foto')); }).map(function(x){ return { foto:url(cs(x, 'foto')), selo:cs(x, 'selo'), titulo:cs(x, 'titulo'), texto:cs(x, 'texto') }; });
  var slides = slidesP.length ? slidesP : todas.slice(0, 3).map(function(u, i){ return { foto:u, selo:s.nomeCurto.toUpperCase(), titulo:['Nosso grupo', 'Nos treinos', 'Nossa gente'][i], texto:'' }; });
  var s0 = slides[0] || { selo:'', titulo:'', texto:'' };
  var nEq = mestres.length;
  var numeros = lista('numeros', 'itens', 3).filter(function(x){ return cs(x, 'valor'); }).map(function(x){ return { valor:cs(x, 'valor'), rotulo:cs(x, 'rotulo') }; });
  if(!numeros.length){
    if(nucs.length) numeros.push({ valor:String(nucs.length), rotulo:nucs.length === 1 ? 'Núcleo' : 'Núcleos' });
    if(nEq > 1) numeros.push({ valor:String(nEq), rotulo:'Na equipe' });
    if(escada.length) numeros.push({ valor:String(escada.length), rotulo:pecaPl.charAt(0).toUpperCase() + pecaPl.slice(1) });
  }
  var seloTopo = cx('topo', 'selo', s.cidade ? (String(s.cidade) + (s.uf ? ' · ' + String(s.uf) : '')).toUpperCase() : '');
  var hero = '<section class="hero" id="inicio" data-hero>'
    + '<div class="anel anel-a" aria-hidden="true"><svg viewBox="0 0 900 900"><circle cx="450" cy="450" r="449" fill="none" stroke="rgba('+t.tealRgb+',.45)" stroke-width="1.2" stroke-dasharray="2 12"/><circle cx="450" cy="1" r="6" fill="'+t.verde+'"/></svg></div>'
    + '<div class="anel anel-b" aria-hidden="true"><svg viewBox="0 0 660 660"><circle cx="330" cy="330" r="329" fill="none" stroke="rgba('+t.tclaroRgb+',.3)" stroke-width="1"/><circle cx="1" cy="330" r="4" fill="'+t.menta+'"/></svg></div>'
    + '<span class="onda" aria-hidden="true"></span><span class="onda d2" aria-hidden="true"></span><span class="onda d3" aria-hidden="true"></span>'
    + '<div class="hero-grade"><div class="hero-texto">'+(seloTopo ? '<span class="pilula"><i></i>'+esc(seloTopo)+'</span>' : '')
    + '<h1>'+esc(cx('topo', 'titulo', tp[0]))+'<br><em>'+esc(cx('topo', 'destaque', tp[1]))+'</em></h1><p>'+esc(cx('topo', 'texto', tp[2]))+'</p>'
    + '<div class="hero-bts"><a class="bt bt-verde bt-grande pulsa" href="#aula">'+esc(cx('topo', 'botao', 'Agende uma aula experimental'))+' '+I.seta+'</a>'
    + (nucs.length ? '<a class="bt bt-linha bt-grande" href="#nucleos">'+I.pino+' '+esc(cx('topo', 'botao2', 'Ache o núcleo mais perto'))+'</a>' : '')+'</div></div>'
    + '<div class="hero-foto"><div class="palco" data-palco tabindex="0" aria-label="'+(logo ? 'Fotos do grupo — toque para girar o logo' : 'Fotos do grupo')+'">'+(logo ? '<span class="rastro" aria-hidden="true"></span>' : '')+'<div class="janela">'
    + slides.map(function(x, i){ return '<img class="slide'+(i === 0 ? ' on' : '')+'" src="'+esc(x.foto)+'" alt="'+esc(x.titulo || 'Foto do grupo')+'" data-selo="'+esc(x.selo)+'" data-titulo="'+esc(x.titulo)+'" data-texto="'+esc(x.texto)+'"'+(i === 0 ? ' fetchpriority="high"' : ' loading="lazy"')+'>'; }).join('')
    + (slides.length ? '' : '<span class="sem-foto" role="img" aria-label="'+esc(s.nome)+'"></span>')
    + '<span class="sombra" aria-hidden="true"></span></div>'
    + (logo ? '<div class="orbita" aria-hidden="true"><img class="sat" src="'+esc(logo)+'" alt=""></div>' : '')
    + (slides.length > 1 ? '<div class="pontos">'+slides.map(function(_, i){ return '<button type="button" class="ponto'+(i === 0 ? ' on' : '')+'" data-ir="'+i+'" aria-label="Ver foto '+(i+1)+'"></button>'; }).join('')+'</div>' : '')
    + '</div>'+(s0.titulo ? '<div class="legenda" aria-live="polite"><span class="l-selo">'+esc(s0.selo)+'</span><b class="l-tit">'+esc(s0.titulo)+'</b><span class="l-txt">'+esc(s0.texto)+'</span></div>' : '')+'</div></div>'
    + (numeros.length ? '<div class="numeros" style="grid-template-columns:repeat('+numeros.length+',minmax(0,1fr))">'+numeros.map(function(n){ return '<div><b>'+esc(n.valor)+'</b><span>'+esc(n.rotulo)+'</span></div>'; }).join('')+'</div>' : '')
    + '</section>';

  /* ---------- faixa ---------- */
  var frases = FAIXA[chave].concat(s.cidade ? [String(s.cidade) + (s.uf ? ' / ' + String(s.uf) : '')] : []);
  var fx = cx('faixa', 'palavras', ''); if(fx){ var fl = fx.split(',').map(function(p){ return p.trim(); }).filter(Boolean).slice(0, 8); if(fl.length) frases = fl; }
  var um = frases.map(function(x){ return '<span>'+esc(x)+'</span><i aria-hidden="true">●</i>'; }).join('');
  var faixa = '<div class="faixa" aria-label="'+esc(frases.join(', '))+'"><div class="marquee" aria-hidden="true">'+um+um+'</div></div>';

  /* ---------- a arte ---------- */
  var ap = ARTE[chave];
  var pilP = lista('arte', 'pilares', 3).filter(function(x){ return cs(x, 'titulo'); });
  var pilares = pilP.length ? pilP.map(function(x, i){ return { titulo:cs(x, 'titulo'), texto:cs(x, 'texto'), foto:cs(x, 'foto') || foto(i + 1) }; }) : ap.pilares.map(function(p, i){ return { titulo:p[0], texto:p[1], foto:foto(i + 1) }; });
  var arte = '<section class="sec" id="grupo"><div class="cab dupla"><div>'+selo(cx('arte', 'selo', ap.selo))+titulo(cx('arte', 'titulo', ap.titulo), cx('arte', 'destaque', ap.destaque))+'</div><p class="lead">'+esc(cx('arte', 'texto', ap.texto))+'</p></div>'
    + '<div class="grade-3">'+pilares.map(function(p, i){ return '<article class="card zoom revela"><div class="foto">'+img(p.foto, p.titulo)+'</div><div class="corpo"><h3><em>'+('0'+(i+1))+'</em> '+esc(p.titulo)+'</h3><p>'+esc(p.texto)+'</p></div></article>'; }).join('')+'</div></section>';

  /* ---------- graduação ---------- */
  var grad = '';
  if(escada.length){
    var nC = escada.length;
    grad = '<section class="bloco-escuro grad" id="graduacao"><span class="anel-canto" aria-hidden="true"></span>'
      + '<div class="cab dupla"><div>'+selo(cx('graduacao', 'selo', 'GRADUAÇÃO'))+titulo(cx('graduacao', 'titulo', 'O caminho'), cx('graduacao', 'destaque', 'do '+peca))+'</div>'
      + '<p class="lead">'+esc(cx('graduacao', 'texto', 'A troca de '+peca+' acontece com a avaliação do '+tituloLider.toLowerCase()+'. O aluno acompanha cada critério, nota a nota, pelo app.'))+'</p></div>'
      + '<div class="cordoes" style="--n:'+nC+'">'+escada.map(function(c, i){ return '<div class="cordao" style="--h:'+(160 + i * Math.round(160 / Math.max(1, nC - 1)))+'px"><span class="corda" style="--a:'+esc(c.cor[0])+';--b:'+esc(c.cor[1])+';--c:'+esc(c.cor[2])+'"></span><b>'+esc(c.nome.replace('/', ' / '))+'</b></div>'; }).join('')+'</div>'
      + '<div class="grad-rodape"><span>'+esc(cx('graduacao', 'infantil', 'Cada aluno vê no app o termômetro rumo '+(/a$/i.test(peca) ? 'à próxima ' : 'ao próximo ')+peca+'.'))+'</span><a class="bt bt-branco" href="'+esc(R('login'))+'">'+esc(cx('graduacao', 'botao', 'Ver meu termômetro no app'))+' '+I.seta+'</a></div></section>';
  }

  /* ---------- núcleos ---------- */
  var nucleos = '';
  if(nucs.length){
    var convite = cx('nucleos', 'convite', 'Olá! Quero agendar uma aula experimental na '+s.nomeCurto+'.');
    var filtros = nucPainel.length && nucPainel.some(function(x){ return x.infantil || x.noite; });
    nucleos = '<section class="sec" id="nucleos"><div class="cab linha"><div>'+selo(cx('nucleos', 'selo', 'ONDE TREINAR'))+titulo(cx('nucleos', 'titulo', 'Ache o núcleo'), cx('nucleos', 'destaque', 'mais perto'))+'</div>'
      + (filtros ? '<div class="filtros" role="group" aria-label="Filtrar núcleos"><button type="button" class="on" data-filtro="todos" aria-pressed="true">Todos</button><button type="button" data-filtro="infantil" aria-pressed="false">Infantil</button><button type="button" data-filtro="noite" aria-pressed="false">Noite</button></div>' : '')+'</div>'
      + '<div class="grade-3 nucleos">'+nucs.map(function(x){
        var w = linkWhats(x.whatsapp, convite);
        return '<article class="card nucleo revela" data-infantil="'+(x.infantil ? 1 : 0)+'" data-noite="'+(x.noite ? 1 : 0)+'">'
          + '<div class="pessoa"><span class="aro">'+(url(x.foto) ? img(x.foto, x.nome) : '<span class="sem-foto" role="img" aria-label="'+esc(x.nome)+'"></span>')+'</span><div>'+(x.bairro ? '<span class="mini">'+esc(x.bairro)+'</span>' : '')+'<h3>'+esc(x.nome)+'</h3></div></div>'
          + ((x.dias || x.horario || x.endereco) ? '<ul class="info">'+(x.dias ? '<li>'+I.cal+esc(x.dias)+'</li>' : '')+(x.horario ? '<li>'+I.relogio+esc(x.horario)+'</li>' : '')+(x.endereco ? '<li>'+I.pino+esc(x.endereco)+'</li>' : '')+'</ul>' : '<ul class="info"><li>'+I.relogio+'Horários na área do aluno</li></ul>')
          + '<div class="nucleo-bts">'+(w ? '<a class="bt bt-marinho" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">'+I.conversa+' Chamar no WhatsApp</a>' : '<a class="bt bt-marinho" href="'+esc(R('inscricao'))+'">'+I.seta+' Fazer inscrição</a>')
          + (x.endereco ? '<a class="bt bt-icone" href="'+esc(linkMapa(x.endereco))+'" target="_blank" rel="noopener noreferrer" aria-label="Como chegar — '+esc(x.nome)+'">'+I.rota+'</a>' : '')+'</div></article>';
      }).join('')+'</div><p class="vazio-filtro" hidden>Nenhum núcleo com esse filtro — fale com a secretaria.</p>'
      + (cx('nucleos', 'nota', '') ? '<p class="nota">'+esc(cx('nucleos', 'nota', ''))+'</p>' : '')+'</section>';
  }

  /* ---------- corpo docente ---------- */
  var docentes = '<section class="sec branco" id="mestres"><div class="cab linha"><div>'+selo(cx('mestres', 'selo', 'CORPO DOCENTE'))+titulo(cx('mestres', 'titulo', 'Quem ensina'), cx('mestres', 'destaque', chave === 'capoeira' ? 'na roda' : 'no '+V.local))+'</div>'
    + '<p class="lead">'+esc(cx('mestres', 'texto', 'A equipe que conduz os treinos da '+s.nomeCurto+'.'))+'</p></div>'
    + '<div class="mestres">'+mestres.map(function(x){
      var link = urlLink(x.instagram), tag = link ? 'a' : 'div';
      return '<'+tag+' class="card mestre revela"'+(link ? ' href="'+esc(link)+'" target="_blank" rel="noopener noreferrer"' : '')+'><span class="aro grande">'+img(x.foto, x.nome)+(link ? '<i class="play">'+I.play+'</i>' : '')+'</span><b>'+esc(x.nome)+'</b><span>'+esc(x.cargo)+'</span></'+tag+'>';
    }).join('')+'</div></section>';

  /* ---------- agenda + avisos ---------- */
  var futuros = eventos.filter(function(e){ return e.d && e.d >= hoje; }).sort(function(a, b){ return a.d.localeCompare(b.d); });
  var passados = eventos.filter(function(e){ return !e.d || e.d < hoje; }).sort(function(a, b){ return (b.d || '').localeCompare(a.d || ''); });
  var destaque = futuros[0] || null;
  var resto = futuros.slice(1).concat(passados).slice(0, 5);
  var quando = function(e){ if(!e.d) return ''; var p = e.d.split('-').map(Number); return p[2]+' de '+MESES_LONGOS[p[1]-1]+' de '+p[0]; };
  var linha = function(e){
    var p = (e.d || '--').split('-'), fotosE = urlLink(e.fotos), passado = e.d && e.d < hoje;
    var alvo = passado && fotosE ? fotosE : (e.mapa ? linkMapa(e.mapa) : '');
    return '<a class="evento"'+(alvo ? ' href="'+esc(alvo)+'" target="_blank" rel="noopener noreferrer"' : '')+'><span class="data"><b>'+esc(p[2] || '—')+'</b><small>'+esc(p[1] ? MESES[Number(p[1]) - 1] : '')+'</small></span>'
      + '<span class="ev-txt"><b>'+esc(e.titulo)+'</b><small>'+esc(e.local)+(passado || !e.horario ? '' : ' · '+esc(e.horario))+'</small></span>'
      + '<span class="ev-acao">'+(passado ? (fotosE ? 'Ver fotos' : 'Realizado') : (e.mapa ? 'Como chegar' : 'No app'))+' '+I.mais+'</span></a>';
  };
  var fotoAgenda = url(cx('agenda', 'foto', '')) || foto(4) || foto(0);
  var agenda = '<section class="sec agenda" id="agenda"><div class="destaque zoom-lento">'+img(fotoAgenda, 'Roda do grupo', ' class="kb"')+'<span class="veu" aria-hidden="true"></span>'
    + '<div class="dest-txt">'+(destaque ? '<span class="tag-verde">PRÓXIMO EVENTO</span><h3>'+esc(destaque.titulo)+'</h3><p>'+esc(quando(destaque))+(destaque.local ? ' · '+esc(destaque.local) : '')+(destaque.horario ? ' · '+esc(destaque.horario) : '')+'</p>'
      + '<div class="linha-bts"><a class="bt bt-branco" href="'+esc(R('login'))+'">Quero participar</a>'+(destaque.mapa ? '<a class="bt bt-linha" href="'+esc(linkMapa(destaque.mapa))+'" target="_blank" rel="noopener noreferrer">Como chegar</a>' : '')+'</div>'
      : '<span class="tag-verde">AGENDA</span><h3>Novos eventos em breve</h3><p>Acompanhe pelo app'+(s.instagram ? ' e pelo Instagram do grupo' : '')+'.</p>')+'</div></div>'
    + '<div class="agenda-lista">'+selo(cx('agenda', 'selo', 'AGENDA E AVISOS'))+titulo(cx('agenda', 'titulo', chave === 'capoeira' ? 'Batizados, rodas' : 'Eventos, aulões'), cx('agenda', 'destaque', 'e apresentações'))
    + '<div class="eventos">'+(resto.map(linha).join('') || '<p class="nota">'+(destaque ? 'Nenhum outro evento por enquanto.' : 'Os eventos publicados no app aparecem aqui.')+'</p>')+'</div>'
    + (avisos.length ? '<div class="avisos" aria-label="Avisos do grupo"><b><i aria-hidden="true"></i>Avisos do grupo</b>'+avisos.map(function(a){
        var dt = /^\d{4}-\d{2}-\d{2}$/.test(a.data || '') ? a.data.split('-').reverse().slice(0, 2).join('/') : '';
        return '<div class="aviso"><span class="av-ic">'+I.sino+'</span><div><b>'+esc(a.titulo)+'</b>'+(a.texto ? '<p>'+esc(a.texto)+'</p>' : '')+((dt || a.local) ? '<small>'+esc([dt, a.hora, a.local].filter(Boolean).join(' · '))+'</small>' : '')+'</div></div>';
      }).join('')+'</div>' : '')
    + (cx('agenda', 'aviso', '') ? '<p class="nota">'+esc(cx('agenda', 'aviso', ''))+'</p>' : '<p class="nota"><span class="app-tag">'+I.certo+' Sincronizado com o app</span> Eventos e avisos publicados no app aparecem aqui sozinhos.</p>')+'</div></section>';

  /* ---------- app ---------- */
  var cAtual = escada[Math.min(3, Math.max(0, escada.length - 2))] || { nome:'Atual' }, cProx = escada[Math.min(4, escada.length - 1)] || { nome:'Próxima' };
  var telaApp = '<div class="tela tela-app"><div class="t-status"><b>16:37</b><span class="ilha"></span><i></i></div>'
    + '<div class="t-topo"><span class="t-av">'+esc(ini)+'</span><div><small>Bem-vindo de volta!</small><b>ATLETA</b></div><span class="t-sino"></span></div>'
    + '<div class="t-chips"><span class="ch-verde">'+esc(pecaCap)+': '+esc(cAtual.nome)+'</span><span class="ch-ouro">'+esc(s.nomeCurto)+'</span></div>'
    + '<div class="t-prog"><small>Próxim'+(/a$/i.test(peca) ? 'a' : 'o')+' '+esc(peca)+': <b>'+esc(cProx.nome)+'</b></small><b>72%</b></div><div class="t-barra"><i></i></div>'
    + '<div class="t-grade"><div><span class="ico ic-a"></span><b>Minha evolução</b><small>notas e '+esc(pecaPl)+'</small></div><div><span class="ico ic-b"></span><b>Financeiro</b><small>mensalidades</small></div><div><b class="num">9</b><small>presenças no mês</small></div><div><b class="num ouro">3</b><small>semanas seguidas</small></div></div>'
    + '<div class="t-rede"><b>'+esc(nomeRede)+'</b><small>fotos e momentos dos treinos</small></div><div class="t-abas"><span class="on">Início</span><span>Materiais</span><span>Núcleos</span><span>Perfil</span></div></div>';
  var telaRede = '<div class="tela tela-rede"><div class="t-status"><b>16:38</b><span class="ilha"></span><i></i></div>'
    + '<div class="t-topo"><span class="t-app">App</span><div><small>'+esc(s.nomeCurto.toUpperCase())+'</small><b>Meu perfil</b></div></div>'
    + '<div class="t-capa"><span class="t-avg">'+esc(ini)+'</span></div><div class="t-nome"><b>SEU PERFIL</b><small>Atleta da '+esc(s.nomeCurto)+'</small></div>'
    + '<div class="t-chips"><span class="ch-azul">'+esc((escada[2] || cAtual).nome)+'</span><span class="ch-verde">3 semanas seguidas</span></div>'
    + '<div class="t-nums"><div><b>18</b><small>posts</small></div><div><b>64</b><small>seguidores</small></div><div><b>7</b><small>brasões</small></div></div>'
    + '<div class="t-priv"><b>Perfil privado</b><small>Só quem você aceitar vê seus posts</small><i></i></div><div class="t-abas"><span>Início</span><span>Explorar</span><span class="mais">+</span><span>Mensagens</span><span class="on">Perfil</span></div></div>';
  var recursos = [['Termômetro do '+peca, 'Notas de cada critério, rumo à próxima graduação'], ['Presença no treino', 'Check-in no núcleo em um toque'], ['Mensalidade', 'Situação e histórico de pagamentos'], ['Agenda e inscrições', 'Eventos, aulões e campeonatos'], [nomeRede, 'Stories, avisos e mensagens do grupo'], ['Conta família', 'Pais acompanham os filhos']];
  var app = '<section class="bloco-escuro app" id="app"><span class="brilho" aria-hidden="true"></span><div class="app-txt">'+selo(cx('app', 'selo', 'APP DO GRUPO'))+titulo(cx('app', 'titulo', 'O grupo inteiro'), cx('app', 'destaque', 'no bolso'))
    + '<p class="lead">'+esc(cx('app', 'texto', 'Sem loja de aplicativos: instala direto do site, com dois ícones — o app do aluno e a '+nomeRede+', a rede social fechada do grupo.'))+'</p>'
    + '<ul class="recursos">'+recursos.map(function(r){ return '<li><i>'+I.certo+'</i><span><b>'+esc(r[0])+'</b><small>'+esc(r[1])+'</small></span></li>'; }).join('')+'</ul>'
    + '<div class="linha-bts"><a class="bt bt-verde bt-grande" href="'+esc(R('instalar'))+'">'+I.baixar+' Instalar o app e a Rede</a><span class="icones"><span class="ic-app" role="img" aria-label="Ícone do app">'+esc(ini)+'</span><span class="ic-rede" role="img" aria-label="Ícone da '+esc(nomeRede)+'">R</span></span></div></div>'
    + '<div class="app-prints" aria-hidden="true"><figure class="print p1 flutua">'+telaApp+'<figcaption>App do aluno</figcaption></figure><figure class="print p2 flutua d2">'+telaRede+'<figcaption class="verde">'+esc(nomeRede)+'</figcaption></figure></div></section>';

  /* ---------- loja (só com produtos) ---------- */
  var produtos = lista('loja', 'produtos', 6).filter(function(p){ return cs(p, 'nome'); });
  var loja = '';
  if(produtos.length){
    var zapLoja = cx('loja', 'whatsapp', '');
    loja = '<section class="sec" id="loja"><div class="cab linha"><div>'+selo(cx('loja', 'selo', 'LOJA OFICIAL'))+titulo(cx('loja', 'titulo', chave === 'capoeira' ? 'O uniforme' : 'Loja'), cx('loja', 'destaque', chave === 'capoeira' ? 'e os instrumentos' : 'oficial'))+'</div>'
      + '<p class="lead">'+esc(cx('loja', 'texto', chave === 'capoeira' ? 'Uniforme com o brasão do grupo e materiais selecionados pelos professores.' : 'Uniforme e equipamento escolhidos pelos professores, com a marca da escola.'))+'</p></div>'
      + '<div class="grade-3">'+produtos.map(function(p){
        var w = linkWhats(zapLoja, 'Olá! Quero comprar: '+cs(p, 'nome')+(cs(p, 'preco') ? ' ('+cs(p, 'preco')+')' : '')+'.');
        return '<article class="card produto zoom revela"><div class="foto'+(url(cs(p, 'foto')) ? '' : ' desenho')+'">'+(url(cs(p, 'foto')) ? img(cs(p, 'foto'), cs(p, 'nome')) : '<span class="lj-svg" role="img" aria-label="'+esc(cs(p, 'nome'))+'">'+ilustracao(cs(p, 'nome'), { principal:t.marinho, destaque:t.verde })+'</span>')+'</div><div class="corpo"><h3>'+esc(cs(p, 'nome'))+'</h3><p>'+esc(cs(p, 'texto'))+'</p>'
          + '<div class="preco"><b>'+esc(cs(p, 'preco'))+'</b>'+(w ? '<a class="bt bt-claro" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">Comprar</a>' : '')+'</div></div></article>';
      }).join('')+'</div></section>';
  }

  /* ---------- chamada (aula experimental) ---------- */
  var fotoCham = url(cx('chamada', 'foto', '')) || foto(2) || foto(0);
  var formulario = comWhats.length
    ? '<form class="form-aula" novalidate><b>'+esc(cx('chamada', 'formTitulo', 'Agende sua aula experimental'))+'</b>'
      + '<label for="gi-aula-nome">Nome<input id="gi-aula-nome" name="nome" type="text" autocomplete="name" maxlength="80" placeholder="Seu nome" required></label>'
      + '<label for="gi-aula-idade">Para quem é a aula?<select id="gi-aula-idade" name="publico"><option>Para mim (adulto)</option><option>Para meu filho(a)</option><option>Para a família toda</option></select></label>'
      + '<label for="gi-aula-nucleo">Núcleo<select id="gi-aula-nucleo" name="nucleo">'+comWhats.map(function(x, i){ return '<option value="'+i+'" data-w="'+esc(digitos(x.whatsapp))+'">'+esc((x.bairro ? x.bairro + ' — ' : '') + x.nome)+'</option>'; }).join('')+'</select></label>'
      + '<button class="bt bt-verde bt-grande" type="submit">Quero minha aula '+I.seta+'</button><small class="ajuda" aria-live="polite">'+esc(cx('chamada', 'formAjuda', 'O professor do núcleo responde pelo WhatsApp.'))+'</small></form>'
    : '<div class="chamada-cta"><b>'+esc(cx('chamada', 'formTitulo', 'Faça sua inscrição'))+'</b><p>A inscrição é feita pelo app da escola, rápida e segura. Depois é só combinar o primeiro treino com o professor.</p><a class="bt bt-verde bt-grande" href="'+esc(R('inscricao'))+'">Fazer inscrição '+I.seta+'</a></div>';
  var chamada = '<section class="chamada" id="aula">'+(fotoCham ? img(fotoCham, 'O grupo reunido', ' class="kb fundo"') : '')+'<span class="veu-lado" aria-hidden="true"></span>'
    + '<div class="chamada-grade"><div>'+titulo(cx('chamada', 'titulo', 'Sua vaga'), cx('chamada', 'destaque', 'já está aberta'))+'<p class="lead">'+esc(cx('chamada', 'texto', 'Traga roupa leve e chegue 10 minutos antes. O resto o grupo ensina.'))+'</p></div>'+formulario+'</div></section>';

  /* ---------- parceiros (só se a escola cadastrar) ---------- */
  var parcs = lista('parceiros', 'lista', 4).filter(function(p){ return cs(p, 'nome'); });
  var parceiros = '';
  if(parcs.length){
    parceiros = '<section class="sec" id="parceiros"><div class="cab linha"><div>'+selo(cx('parceiros', 'selo', 'PARCEIROS DO GRUPO'))+titulo(cx('parceiros', 'titulo', 'Quem treina com a gente'), cx('parceiros', 'destaque', 'ganha mais'))+'</div>'
      + '<p class="lead">'+esc(cx('parceiros', 'texto', 'Benefícios para os atletas do grupo e a família deles. Para usar, é só mostrar a carteirinha virtual do app.'))+'</p></div>'
      + '<div class="parceiros'+(parcs.length === 1 ? ' so-um' : '')+'">'+parcs.map(function(p){
        var nome = cs(p, 'nome'), msg = cs(p, 'mensagem') || ('Olá, sou da '+s.nomeCurto+' e gostaria de usar o benefício de atleta!');
        var w = linkWhats(cs(p, 'whatsapp'), msg), lk = urlSite(cs(p, 'link'));
        var frase = cs(p, 'frase'), corte = frase.lastIndexOf(' ');
        var fraseHtml = corte > 0 ? esc(frase.slice(0, corte))+' <em>'+esc(frase.slice(corte + 1))+'</em>' : esc(frase);
        return '<article class="parceiro revela"><div class="parc-logo"><span class="parc-aura" aria-hidden="true"></span>'+img(cs(p, 'logo'), 'Logo '+nome, ' class="parc-img"')+'</div><div class="parc-txt">'
          + '<span class="parc-selo">'+I.certo+' Parceiro oficial · '+esc(nome)+'</span>'+(frase ? '<h3 class="parc-frase">'+fraseHtml+'</h3>' : '')
          + ((cs(p, 'destaque') || cs(p, 'beneficio')) ? '<p class="parc-oferta">'+(cs(p, 'destaque') ? '<b>'+esc(cs(p, 'destaque'))+'</b>' : '')+(cs(p, 'beneficio') ? '<span>'+esc(cs(p, 'beneficio'))+'</span>' : '')+'</p>' : '')
          + (cs(p, 'como') ? '<p class="parc-como">'+esc(cs(p, 'como'))+'</p>' : '')
          + ((w || lk) ? '<div class="parc-bts">'+(lk ? '<a class="bt bt-claro parc-bt-site" href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer">'+I.globo+' Visitar '+esc(hostDe(lk) || 'o site')+'</a>' : '')+(w ? '<a class="bt bt-verde parc-bt-whats" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">'+I.conversa+' Atendimento online</a>' : '')+'</div>' : '')+'</div></article>';
      }).join('')+'</div></section>';
  }

  /* ---------- rodapé ---------- */
  var fb = urlLink(cx('rodape', 'facebook', ''));
  var rodape = '<footer class="rodape"><div class="rod-marca">'+(logo ? '<img src="'+esc(logo)+'" alt="" width="56" height="56">' : '<span class="mk">'+esc(ini)+'</span>')+'<b>'+esc(V.nomeMod)+'<br>'+esc(s.nomeCurto)+'</b>'
    + '<p>'+esc(cx('rodape', 'texto', s.nome + (s.cidade ? ' · ' + s.cidade + (s.uf ? ' / ' + s.uf : '') : '') + '.'))+'</p></div>'
    + '<div><span class="mini">CONTATO</span>'+(cx('rodape', 'telefone', '') ? '<p>'+esc(cx('rodape', 'telefone', ''))+'</p>' : '')+(s.endereco ? '<p>'+esc(s.endereco)+'</p>' : '')+(s.cidade ? '<p>'+esc(s.cidade)+(s.uf ? '/' + esc(s.uf) : '')+'</p>' : '')+'</div>'
    + '<div><span class="mini">REDES</span>'+(s.instagram ? '<a href="https://www.instagram.com/'+esc(encodeURIComponent(s.instagram))+'/" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a>' : '')+(fb ? '<a href="'+esc(fb)+'" target="_blank" rel="noopener noreferrer">Facebook</a>' : '')+'<a href="'+esc(R('rede'))+'">'+esc(nomeRede)+'</a></div>'
    + '<div><span class="mini">SISTEMA</span><a href="'+esc(R('login'))+'">Área do aluno</a><a href="'+esc(R('inscricao'))+'">Ficha de inscrição</a><a href="'+esc(R('admin'))+'">Painel do professor</a><a href="'+esc(R('instalar'))+'">Instalar o app e a Rede</a><a href="'+esc(R('privacidade'))+'">Privacidade</a></div>'
    + '<p class="copy">© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b>.</p></footer>';

  site.className = 'gi';
  site.innerHTML = nav + '<main id="gi-conteudo">' + hero + faixa + arte + grad + nucleos + docentes + agenda + app + loja + chamada + parceiros + '</main>' + rodape;
  wire(site, s.nomeCurto, V.nomeMod);
}

/* ========================================================================== */
/*  Comportamento (o mesmo do site original, sem o brasão em órbita)           */
/* ========================================================================== */
var timerSlide = null, ouvintes = null;
function wire(site, nomeCurto, nomeMod){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  site.classList.add('js');
  clearInterval(timerSlide);
  // Slider do topo
  var slides = [].slice.call(site.querySelectorAll('.slide')), pontos = [].slice.call(site.querySelectorAll('.ponto')), leg = site.querySelector('.legenda'), atual = 0;
  function ir(i){
    atual = (i + slides.length) % slides.length;
    slides.forEach(function(x, n){ x.classList.toggle('on', n === atual); });
    pontos.forEach(function(p, n){ p.classList.toggle('on', n === atual); p.setAttribute('aria-current', n === atual ? 'true' : 'false'); });
    var sl = slides[atual];
    if(leg){ leg.classList.remove('troca'); void leg.offsetWidth; leg.classList.add('troca'); leg.querySelector('.l-selo').textContent = sl.dataset.selo || ''; leg.querySelector('.l-tit').textContent = sl.dataset.titulo || ''; leg.querySelector('.l-txt').textContent = sl.dataset.texto || ''; }
  }
  function iniciar(){ clearInterval(timerSlide); if(slides.length > 1) timerSlide = setInterval(function(){ ir(atual + 1); }, 5500); }
  pontos.forEach(function(p){ p.addEventListener('click', function(){ ir(Number(p.dataset.ir) || 0); iniciar(); }); });
  var janela = site.querySelector('.janela');
  if(janela && slides.length > 1){ var x0 = null; janela.addEventListener('touchstart', function(e){ x0 = e.touches[0].clientX; }, { passive:true }); janela.addEventListener('touchend', function(e){ if(x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if(Math.abs(dx) > 40){ ir(atual + (dx < 0 ? 1 : -1)); iniciar(); } x0 = null; }); }
  iniciar();
  // Entrada suave
  var itens = [].slice.call(site.querySelectorAll('.revela'));
  if(!('IntersectionObserver' in window) || reduce) itens.forEach(function(el){ el.classList.add('visto'); });
  else { var obs = new IntersectionObserver(function(es){ es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('visto'); obs.unobserve(en.target); } }); }, { rootMargin:'0px 0px -8% 0px' }); itens.forEach(function(el, i){ el.style.transitionDelay = ((i % 3) * 90) + 'ms'; obs.observe(el); }); }
  // Mouse, foco, toque ou Enter nas fotos: o logo orbita a foto e os anéis aceleram.
  var hero = site.querySelector('[data-hero]'), palco = site.querySelector('[data-palco]');
  if(hero && palco){
    var ligaGiro = function(){ hero.classList.add('girando'); }, desligaGiro = function(){ hero.classList.remove('girando'); };
    palco.addEventListener('mouseenter', ligaGiro); palco.addEventListener('mouseleave', desligaGiro);
    palco.addEventListener('focus', ligaGiro); palco.addEventListener('blur', desligaGiro);
    palco.addEventListener('touchstart', function(){ hero.classList.toggle('girando'); }, { passive:true });
    palco.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); hero.classList.toggle('girando'); } });
  }
  // Cliques e envio: ouvintes ligados UMA vez no #site (a prévia do painel redesenha várias vezes).
  site._gi = { nomeCurto:nomeCurto, nomeMod:nomeMod };
  if(!site._giLigado){ site._giLigado = true; ligarCliques(site); }
  // Topo sólido ao rolar (um ouvinte só, mesmo redesenhando na prévia)
  if(ouvintes) removeEventListener('scroll', ouvintes);
  var rolando = false;
  ouvintes = function(){ if(rolando) return; rolando = true; requestAnimationFrame(function(){ site.classList.toggle('rolou', scrollY > 40); rolando = false; }); };
  addEventListener('scroll', ouvintes, { passive:true });
  ouvintes();
}
function ligarCliques(site){
  site.addEventListener('click', function(e){
    var hamb = e.target.closest('.hamb');
    if(hamb){ var ab = site.classList.toggle('menu-aberto'); hamb.setAttribute('aria-expanded', String(ab)); hamb.setAttribute('aria-label', ab ? 'Fechar menu' : 'Abrir menu'); return; }
    if(e.target.closest('#gi-menu a')){ site.classList.remove('menu-aberto'); var hb = site.querySelector('.hamb'); if(hb){ hb.setAttribute('aria-expanded', 'false'); hb.setAttribute('aria-label', 'Abrir menu'); } }
    var f = e.target.closest('[data-filtro]');
    if(f){
      var tipo = f.dataset.filtro, n = 0;
      site.querySelectorAll('[data-filtro]').forEach(function(b){ b.classList.toggle('on', b === f); b.setAttribute('aria-pressed', String(b === f)); });
      site.querySelectorAll('.nucleo').forEach(function(c){ var ok = tipo === 'todos' || c.dataset[tipo] === '1'; c.hidden = !ok; if(ok) n++; });
      var vz = site.querySelector('.vazio-filtro'); if(vz) vz.hidden = n > 0;
    }
  });
  site.addEventListener('submit', function(e){
    var form = e.target.closest('.form-aula'); if(!form) return;
    e.preventDefault();
    var ajuda = form.querySelector('.ajuda');
    var nome = String(form.nome.value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
    if(nome.length < 2){ ajuda.textContent = 'Escreva seu nome para o professor saber quem vai chegar.'; form.nome.focus(); return; }
    var opt = form.nucleo.selectedOptions[0], numero = opt ? String(opt.dataset.w || '').replace(/\D/g, '') : '';
    if(!numero){ ajuda.textContent = 'Escolha um núcleo.'; return; }
    var g = site._gi || {};
    var msg = 'Olá! Sou '+nome+'. Quero agendar uma aula experimental de '+String(g.nomeMod || '').toLowerCase()+' ('+form.publico.value.toLowerCase()+') na '+(g.nomeCurto || '')+', núcleo '+opt.textContent.trim()+'.';
    var d = numero.indexOf('55') === 0 && numero.length >= 12 ? numero : '55' + numero;
    window.open('https://wa.me/'+d+'?text='+encodeURIComponent(msg), '_blank', 'noopener');
    ajuda.textContent = 'Abrimos o WhatsApp do núcleo com a sua mensagem pronta. É só enviar!';
  });
}
