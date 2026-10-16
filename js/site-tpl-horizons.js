/* site-tpl-horizons.js — Template "horizons" do site público por escola (F4.3).
 *
 * Primeiro pré-build oficial da biblioteca. Layout próprio (não é variação do
 * "arena"): hero em cartão com corte diagonal, letreiro, 3 vertentes, bloco de
 * mestres com foto em moldura oval saindo do fundo, jornada, graduação (escada
 * real), 3 programas, núcleos, "App e Rede" (funções do ecossistema AtletaPay),
 * contato em cartão sobre "mapa" e rodapé angulado com links do Sistema.
 *
 * Ecossistema: as mesmas portas que o site Liberdade expõe, nas rotas por escola
 * (/<slug>/login, inscricao, instalar, instalar-rede, carteirinha, checkin,
 * campeonatos, certificados, rede, admin, privacidade — ver firebase.json).
 *
 * Contrato: renderHorizons(s, h)
 *   s — escola já mapeada por site-escola.js (mapEscola): nome, nomeCurto, slug,
 *       modalidade, cidade, uf, endereco, instagram, dominio, cores, lider, peca,
 *       logo, fotoLider, fotos{fachada[],treino[],equipe[]}, graduacoes[],
 *       escada[{nome,cor}], nucleos[], nucleosInfo[{nome,sede,cidade,uf}],
 *       responsavel{nome,graduacao}, equipe[] (opcional), geo{lat,lng} (opcional).
 *   h — utilidades do gerador: { esc, url, VOCAB, LIDER, modalidadeBase }.
 *
 * Segurança: todo texto passa por h.esc(); toda URL por h.url() (só https:// ou
 * caminho local). Nenhum handler inline; links externos com rel="noopener".
 * Conteúdo: só o que a escola cadastrou + vocabulário por modalidade. Nada de
 * números, pessoas ou preços inventados.
 * Cores: "sempre por cima" — principal no bloco de mestres e no topo do mapa,
 * botao nos CTAs, destaque nos detalhes; texto escolhido por contraste.
 */

/* ========================================================================== */
/*  Contrato da biblioteca (site-templates.js): meta + schema                  */
/* ========================================================================== */
export var meta = {
  nome: 'Horizons',
  descricao: 'Hero em cartão com corte diagonal, letreiro, vertentes, equipe em 3D, escada de graduação, núcleos e o bloco do app.',
  modalidades: ['todas']
};

// O que a escola pode trocar na aba "Meu site". Tudo é OPCIONAL: campo vazio = padrão do
// template (texto da modalidade / dado do cadastro). Fotos e pessoas do cadastro continuam
// valendo quando a lista correspondente estiver vazia.
var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
export var schema = { secoes: [
  { id:'hero', r:'Topo', ajuda:'A primeira tela. Sem texto aqui, o título vem da modalidade e a foto de fundo é a fachada do cadastro.', campos:[
    { c:'linha1', r:'Título — primeira linha', max:28, ph:'Onde nascem' },
    { c:'linha2', r:'Título — segunda linha (fica em caixa alta)', max:20, ph:'faixas-pretas' },
    { c:'sub', r:'Linha abaixo do título', max:80, ph:'Nome da escola · modalidade · cidade' },
    { c:'botao', r:'Botão principal', max:24, ph:'Comece hoje' },
    { c:'foto', r:'Foto de fundo', t:'foto' } ] },
  { id:'letreiro', r:'Letreiro', ajuda:'As palavras que correm na faixa logo abaixo do topo.', campos:[
    { c:'palavras', r:'Palavras (separe por vírgula, até 8)', max:140, ph:'Kata, Kumite, Kihon, Disciplina' } ] },
  { id:'vertentes', r:'Vertentes', ajuda:'Três caminhos de treino. Sem fotos aqui, entram as fotos de treino do cadastro.', campos:[
    SELO, { c:'titulo', r:'Título', max:40, ph:'Escolha sua vertente' },
    { c:'itens', r:'Vertentes', t:'lista', max:3, resumo:'titulo', nomeItem:'Vertente', item:[
      { c:'titulo', r:'Nome', max:30 }, { c:'texto', r:'Descrição', t:'area', max:160 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'equipe', r:'Equipe', ajuda:'Quem conduz os treinos. A foto recortada (PNG/WebP sem fundo) dá o efeito 3D; sem ela, a foto comum entra na moldura oval. Lista vazia = equipe do cadastro.', campos:[
    { c:'selo', r:'Etiqueta', max:50, ph:'Quem conduz o dojo' }, { c:'titulo', r:'Palavra grande', max:14, ph:'Equipe' },
    { c:'itens', r:'Pessoas', t:'lista', max:6, resumo:'nome', nomeItem:'Pessoa', item:[
      { c:'nome', r:'Nome', max:60 }, { c:'graduacao', r:'Graduação / título', max:40, ph:'Sensei · 5º Dan' },
      { c:'bio', r:'Apresentação', t:'area', max:240 }, { c:'foto', r:'Foto', t:'foto' },
      { c:'fotoRecorte', r:'Foto recortada, sem fundo (efeito 3D)', t:'foto', png:true } ] } ] },
  { id:'jornada', r:'Jornada', ajuda:'Os números (graduações, núcleos) vêm do cadastro.', campos:[
    { c:'selo', r:'Etiqueta', max:50, ph:'Treinar. Evoluir. Vencer.' }, { c:'titulo', r:'Título', max:90 } ] },
  { id:'graduacao', r:'Graduação', ajuda:'As faixas e cores vêm da escada cadastrada pela escola. Aqui só os textos.', campos:[
    { c:'selo', r:'Etiqueta', max:50, ph:'Graduação real, direto do app' }, { c:'titulo', r:'Título', max:60 },
    { c:'texto', r:'Texto ao lado do botão', t:'area', max:200 }, { c:'botao', r:'Botão', max:30, ph:'Ver minha graduação' } ] },
  { id:'programas', r:'Programas', ajuda:'Três faixas de público. Sem fotos aqui, entram fotos do cadastro.', campos:[
    { c:'selo', r:'Etiqueta', max:50, ph:'Habilidades para a vida toda' }, { c:'titulo', r:'Título', max:40, ph:'Programas' },
    { c:'itens', r:'Programas', t:'lista', max:3, resumo:'titulo', nomeItem:'Programa', item:[
      { c:'etiqueta', r:'Etiqueta no canto (ex.: Kids)', max:20 }, { c:'selo', r:'Linha pequena', max:30 },
      { c:'titulo', r:'Título', max:40 }, { c:'texto', r:'Descrição', t:'area', max:160 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'nucleos', r:'Núcleos', ajuda:'Os núcleos vêm do cadastro da escola. Aqui só os textos.', campos:[
    { c:'selo', r:'Etiqueta', max:50 }, { c:'titulo', r:'Título', max:40, ph:'Onde treinar' } ] },
  { id:'app', r:'App e Rede', campos:[
    { c:'selo', r:'Etiqueta', max:50 }, { c:'titulo', r:'Título', max:40, ph:'A equipe inteira no bolso' },
    { c:'texto', r:'Texto', t:'area', max:220 } ] },
  { id:'contato', r:'Contato', ajuda:'Endereço, mapa e Instagram vêm do cadastro. Com WhatsApp preenchido, aparece o botão "Falar no WhatsApp" (aula experimental).', campos:[
    { c:'titulo', r:'Título', max:40, ph:'Fale com a gente' }, { c:'texto', r:'Texto', t:'area', max:160 },
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13, ph:'67999990000' },
    { c:'msgWhatsapp', r:'Mensagem pronta do WhatsApp', max:140, ph:'Olá! Quero agendar uma aula experimental.' } ] }
] };

/* ========================================================================== */
/*  Vocabulário por modalidade (defaults do template)                          */
/* ========================================================================== */
var HERO = {
  karate:    ['Onde nascem', 'faixas‑pretas'],
  capoeira:  ['Onde a roda', 'não para'],
  jiujitsu:  ['Onde se forja', 'a faixa'],
  judo:      ['Caminho suave,', 'base firme'],
  taekwondo: ['Chute alto,', 'cabeça erguida'],
  muaythai:  ['A arte das', 'oito armas'],
  boxe:      ['Guarda alta,', 'coração firme'],
  mma:       ['Completo', 'por natureza'],
  arena:     ['Treine com', 'quem vive isso']
};

// Três vertentes por modalidade: nome + descrição curta (fatos gerais da arte, não da escola).
var VERTENTES = {
  karate: [
    ['Kata', 'As formas tradicionais: precisão, respiração e força aplicada em cada movimento.'],
    ['Kumite', 'O combate esportivo: distância, timing e controle, com progressão segura.'],
    ['Infantil', 'Coordenação, foco e respeito num ambiente lúdico e seguro.']
  ],
  capoeira: [
    ['Roda', 'O jogo, a ginga e o diálogo de corpo onde tudo acontece.'],
    ['Música e ritmo', 'Berimbau, pandeiro e canto: a capoeira se aprende também de ouvido.'],
    ['Infantil', 'Movimento, cultura e disciplina para crianças, no tempo de cada uma.']
  ],
  jiujitsu: [
    ['Fundamentos', 'Posição, base e defesa: o alfabeto do jiu-jitsu, repetido até virar reflexo.'],
    ['Rola', 'O sparring no chão: aplicar a técnica com controle e segurança.'],
    ['Kids', 'Confiança e respeito no tatame, com aulas pensadas para a idade.']
  ],
  judo: [
    ['Nage-waza', 'As projeções: desequilíbrio, entrada e queda com técnica.'],
    ['Ne-waza', 'O trabalho de solo: imobilizações e controle.'],
    ['Infantil', 'Disciplina, quedas seguras e amizade desde cedo.']
  ],
  taekwondo: [
    ['Poomsae', 'As formas: precisão e equilíbrio em cada sequência.'],
    ['Kyorugi', 'O combate esportivo: chutes rápidos e estratégia.'],
    ['Infantil', 'Flexibilidade, foco e respeito em aulas dinâmicas.']
  ],
  muaythai: [
    ['Base e clinch', 'Postura, distância e o agarre que define o Muay Thai.'],
    ['Sparring', 'Troca controlada, sempre com supervisão.'],
    ['Infantil', 'Condicionamento e disciplina com segurança em primeiro lugar.']
  ],
  boxe: [
    ['Técnica', 'Guarda, jab, direto e movimentação: a base de tudo.'],
    ['Sparring', 'Aplicação controlada com equipamento completo.'],
    ['Infantil', 'Coordenação e autoconfiança sem contato pesado.']
  ],
  mma: [
    ['Striking', 'A luta em pé: socos, chutes e defesa.'],
    ['Grappling', 'Quedas e solo: controle e finalização.'],
    ['Iniciantes', 'Entrada gradual, com técnica antes de intensidade.']
  ],
  arena: [
    ['Fundamentos', 'A base técnica, repetida com atenção até virar naturalidade.'],
    ['Treino avançado', 'Para quem já domina a base e quer evoluir.'],
    ['Infantil', 'Disciplina e movimento para crianças, no ritmo de cada uma.']
  ]
};

var LETREIRO = {
  karate:   ['Kata', 'Kumite', 'Kihon', 'Budō', 'Disciplina', 'Respeito'],
  capoeira: ['Roda', 'Ginga', 'Berimbau', 'Axé', 'Malandragem', 'Respeito'],
  jiujitsu: ['Base', 'Guarda', 'Passagem', 'Finalização', 'Oss', 'Respeito'],
  judo:     ['Ukemi', 'Nage-waza', 'Ne-waza', 'Randori', 'Rei', 'Respeito'],
  taekwondo:['Poomsae', 'Kyorugi', 'Chagi', 'Dojang', 'Disciplina', 'Respeito'],
  muaythai: ['Teep', 'Clinch', 'Wai Kru', 'Mongkon', 'Disciplina', 'Respeito'],
  boxe:     ['Jab', 'Direto', 'Gancho', 'Esquiva', 'Guarda', 'Respeito'],
  mma:      ['Striking', 'Grappling', 'Takedown', 'Cardio', 'Estratégia', 'Respeito'],
  arena:    ['Técnica', 'Disciplina', 'Foco', 'Equipe', 'Evolução', 'Respeito']
};

/* ========================================================================== */
/*  Cor                                                                        */
/* ========================================================================== */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s : null; }
function readable(hex){
  var c = String(hex || '').replace('#', '');
  var r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  if(!(r >= 0) || !(g >= 0) || !(b >= 0)) return '#ffffff';
  return ((0.2126*r + 0.7152*g + 0.0722*b) / 255) > 0.62 ? '#141414' : '#fff8f3';
}

/* ========================================================================== */
/*  CSS (escopado em .hz; tokens vêm da escola)                                */
/* ========================================================================== */
function css(t){
  return '\
.hz,.hz *{box-sizing:border-box}\
.hz{--cream:#f3f0e8;--cream-2:#e9e5db;--ink:#131313;--ink-2:#2a2a2a;--muted:#5d5a55;--white:#fff;\
 --acc:'+t.acc+';--acc-ink:'+t.accInk+';--btn:'+t.btn+';--btn-ink:'+t.btnInk+';--dest:'+t.dest+';\
 --display:"Syne",system-ui,sans-serif;--text:"DM Sans",system-ui,sans-serif;\
 --r-lg:28px;--r-md:20px;--pill:999px;--m:clamp(16px,2.4vw,36px);--g:clamp(20px,5vw,96px);\
 --ease:cubic-bezier(.16,1,.3,1);\
 background:var(--cream);color:var(--ink);font-family:var(--text);font-size:clamp(1rem,.95rem + .3vw,1.125rem);line-height:1.6;overflow-x:clip;-webkit-font-smoothing:antialiased}\
.hz h1,.hz h2,.hz h3,.hz h4,.hz p{margin:0}\
.hz a{color:inherit;text-decoration:none}\
.hz img{display:block;max-width:100%}\
.hz :focus-visible{outline:3px solid var(--dest);outline-offset:3px;border-radius:4px}\
.hz .d{font-family:var(--display);font-weight:800;letter-spacing:-.02em;line-height:.92;text-wrap:balance}\
.hz .k{font-family:var(--display);font-weight:700;font-size:clamp(.8rem,.75rem + .3vw,.95rem);letter-spacing:.22em;text-transform:uppercase}\
.hz .w{padding-inline:var(--g)}\
.hz .btn{position:relative;display:inline-flex;align-items:center;gap:.7em;isolation:isolate;overflow:hidden;background:var(--btn);color:var(--btn-ink);border:0;border-radius:var(--pill);cursor:pointer;font-family:var(--display);font-weight:700;font-size:clamp(.85rem,.8rem + .25vw,1rem);letter-spacing:.08em;text-transform:uppercase;padding:1.05em 1.9em;transition:transform .5s var(--ease),box-shadow .5s var(--ease);will-change:transform}\
.hz .btn::before{content:"";position:absolute;inset:0;background:var(--ink);transform:translateY(101%);transition:transform .55s var(--ease);z-index:-1;border-radius:inherit}\
.hz .btn:hover::before{transform:translateY(0)}\
.hz .btn:hover{color:var(--white);box-shadow:0 18px 40px -16px rgba(0,0,0,.45)}\
.hz .btn:active{transform:scale(.97)!important}\
.hz .btn svg{width:1.1em;height:1.1em;transition:transform .5s var(--ease)}\
.hz .btn:hover svg{transform:translateX(5px)}\
.hz .btn.ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}\
.hz .btn.ghost::before{background:var(--white)}\
.hz .btn.ghost:hover{color:var(--ink);box-shadow:inset 0 0 0 2px var(--white)}\
.hz .btn.light{background:var(--white);color:var(--ink)}\
.hz .btn.light::before{background:var(--btn)}\
.hz .btn.light:hover{color:var(--btn-ink)}\
.hz .circ{display:inline-grid;place-items:center;width:48px;height:48px;border-radius:50%;box-shadow:inset 0 0 0 2px currentColor;transition:transform .4s var(--ease),background .4s var(--ease),color .4s var(--ease)}\
.hz .circ svg{width:18px;height:18px}\
.hz .circ:hover{transform:translateY(-3px) rotate(-6deg);background:var(--white);color:var(--acc)}\
\
.hz .nav{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:clamp(18px,2.4vw,34px) clamp(22px,3.4vw,52px);color:var(--white)}\
.hz .logo{display:flex;align-items:center;gap:12px;font-family:var(--display);font-weight:800;font-size:clamp(1.05rem,1rem + .4vw,1.35rem);letter-spacing:.02em}\
.hz .logo .mk{width:46px;height:46px;flex:none;border-radius:50%;background:var(--white);color:var(--ink);display:grid;place-items:center;font-size:.95rem;overflow:hidden;transition:transform .6s var(--ease)}\
.hz .logo .mk img{width:100%;height:100%;object-fit:cover}\
.hz .logo:hover .mk{transform:rotate(-8deg) scale(1.06)}\
.hz .logo small{display:block;font-family:var(--text);font-weight:500;font-size:.68em;letter-spacing:.22em;text-transform:uppercase;opacity:.85;line-height:1}\
.hz .nl{display:flex;gap:clamp(14px,2vw,30px);align-items:center}\
.hz .nl a{position:relative;font-weight:500;font-size:.95rem;padding:.3em 0;opacity:.92}\
.hz .nl a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .45s var(--ease)}\
.hz .nl a:hover::after{transform:scaleX(1);transform-origin:left}\
.hz .nl .btn{padding:.75em 1.4em;font-size:.8rem}\
.hz .burger{display:none;background:none;border:2px solid currentColor;color:inherit;border-radius:var(--pill);padding:.55em 1em;cursor:pointer;font:inherit;font-weight:600;font-size:.85rem}\
\
.hz .hero{position:relative;margin:var(--m);min-height:calc(100svh - var(--m)*2);border-radius:var(--r-lg);overflow:hidden;color:var(--white);display:flex;align-items:center;justify-content:center;text-align:center;isolation:isolate;background:var(--acc);clip-path:polygon(0 0,100% 0,100% 100%,56% 100%,54% 94%,0 94%)}\
.hz .hero .media{position:absolute;inset:0;z-index:-2;overflow:hidden}\
.hz .hero .media img{width:100%;height:100%;object-fit:cover;object-position:center 30%;transform:scale(1.08);animation:hz-kb 18s cubic-bezier(.65,0,.35,1) infinite alternate;will-change:transform}\
@keyframes hz-kb{from{transform:scale(1.08)}to{transform:scale(1.18) translate(-1.5%,1.5%)}}\
.hz .hero .scrim{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.42),rgba(0,0,0,.18) 45%,rgba(0,0,0,.55))}\
.hz .hero.noimg .scrim{background:none}\
.hz .hero .in{position:relative;padding:clamp(110px,16vh,160px) var(--g) clamp(120px,18vh,180px);max-width:min(94%,1320px)}\
.hz .hero h1{font-size:clamp(2.1rem,.9rem + 5.6vw,5.8rem);text-shadow:0 10px 40px rgba(0,0,0,.35);white-space:nowrap}\
.hz .hero h1 .big{display:block;font-size:1.06em;text-transform:uppercase;letter-spacing:-.03em}\
.hz .hero h1 .l{display:inline-block;overflow:hidden;vertical-align:bottom;padding-block:.08em;margin-block:-.08em}\
.hz .hero h1 .l span{display:inline-block;transform:translateY(110%);animation:hz-rise .9s var(--ease) forwards}\
.hz .hero .sub{margin-top:clamp(18px,2.4vw,28px);opacity:0;animation:hz-fade .9s var(--ease) .55s forwards}\
.hz .hero .cta{margin-top:clamp(28px,3.4vw,40px);opacity:0;animation:hz-fade .9s var(--ease) .75s forwards;display:flex;gap:12px;justify-content:center;flex-wrap:wrap}\
@keyframes hz-rise{to{transform:translateY(0)}}@keyframes hz-fade{to{opacity:1}}\
.hz .hero .hint{position:absolute;left:50%;bottom:calc(6% + 22px);transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;font-size:.75rem;letter-spacing:.2em;text-transform:uppercase;opacity:.85}\
.hz .hero .hint i{display:block;width:2px;height:34px;background:currentColor;transform-origin:top;animation:hz-drop 1.6s cubic-bezier(.65,0,.35,1) infinite}\
@keyframes hz-drop{0%{transform:scaleY(0)}50%{transform:scaleY(1)}100%{transform:scaleY(0);transform-origin:bottom}}\
.hz .hero .tag{position:absolute;right:clamp(18px,3vw,40px);bottom:calc(6% + 18px);font-family:var(--display);font-weight:700;font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;background:var(--white);color:var(--ink);border-radius:var(--pill);padding:.6em 1.1em}\
\
.hz .mq{overflow:hidden;padding:clamp(18px,2.4vw,30px) 0;border-block:2px solid var(--ink);margin:0 var(--m)}\
.hz .mq .tr{display:flex;gap:3rem;width:max-content;animation:hz-slide 28s linear infinite}\
.hz .mq span{font-family:var(--display);font-weight:800;font-size:clamp(1.3rem,1rem + 1.6vw,2.4rem);text-transform:uppercase;white-space:nowrap}\
.hz .mq b{color:var(--acc)}\
@keyframes hz-slide{to{transform:translateX(-50%)}}\
\
.hz section{position:relative}\
.hz .sec{padding-block:clamp(84px,10vw,150px)}\
.hz .hd{display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center;margin-bottom:clamp(44px,5vw,72px)}\
.hz .hd h2{font-size:clamp(2.2rem,1.3rem + 4.2vw,4.6rem)}\
.hz .hd .k{color:var(--acc)}\
.hz.js .rv{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease)}\
.hz.js .rv.in{opacity:1;transform:none}\
.hz .st>*{transition-delay:calc(var(--i,0)*90ms)}\
\
.hz .vert{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(22px,3vw,40px);max-width:1320px;margin-inline:auto}\
.hz .vc{text-align:center}\
.hz .vc .ph{position:relative;aspect-ratio:4/5;border-radius:var(--r-md);overflow:hidden;background:var(--cream-2);isolation:isolate;display:grid;place-items:center}\
.hz .vc .ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.02);transition:transform 1s var(--ease)}\
.hz .vc .ph::after{content:"";position:absolute;inset:0;background:var(--acc);mix-blend-mode:multiply;opacity:0;transition:opacity .6s var(--ease)}\
.hz .vc:hover .ph img{transform:scale(1.08) rotate(-.6deg)}\
.hz .vc:hover .ph::after{opacity:.35}\
.hz .vc .ph .ini{font-family:var(--display);font-weight:800;font-size:clamp(3rem,2rem + 5vw,7rem);color:var(--acc);opacity:.25;letter-spacing:-.04em}\
.hz .vc .ph .n{position:absolute;top:16px;left:16px;z-index:2;width:46px;height:46px;display:grid;place-items:center;border-radius:50%;background:var(--white);color:var(--ink);font-family:var(--display);font-weight:800;font-size:.95rem;transition:transform .6s var(--ease),background .6s var(--ease),color .6s var(--ease)}\
.hz .vc:hover .ph .n{transform:rotate(360deg);background:var(--acc);color:var(--acc-ink)}\
.hz .vc h3{margin-top:26px;font-family:var(--display);font-weight:800;font-size:clamp(1.6rem,1.3rem + 1.2vw,2.3rem);color:var(--acc);transition:letter-spacing .5s var(--ease)}\
.hz .vc:hover h3{letter-spacing:.02em}\
.hz .vc p{margin:12px auto 0;max-width:34ch;color:var(--muted)}\
\
.hz .coach{background:var(--acc);color:var(--acc-ink);margin-top:clamp(40px,6vw,80px);padding-top:clamp(250px,24vw,340px);padding-bottom:clamp(90px,10vw,150px);clip-path:polygon(0 170px,46% 60px,47.5% 190px,100% 0,100% 100%,0 100%)}\
.hz .coach .gi{text-align:center;margin-bottom:clamp(60px,8vw,120px)}\
.hz .coach .gi .k{opacity:.85}\
.hz .coach .gi h2{font-size:clamp(3.2rem,1rem + 11vw,11rem);line-height:.85;letter-spacing:-.04em;text-transform:uppercase;color:transparent;-webkit-text-stroke:2px var(--acc-ink);position:relative}\
.hz .coach .gi h2 span{position:absolute;inset:0;color:var(--acc-ink);-webkit-text-stroke:0;clip-path:inset(0 100% 0 0);transition:clip-path 1.6s var(--ease)}\
.hz .coach .gi.in h2 span{clip-path:inset(0 0 0 0)}\
.hz .mestre{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);align-items:center;max-width:1240px;margin-inline:auto;padding-block:clamp(40px,5vw,70px)}\
.hz .mestre:nth-of-type(even) .pop{order:2}\
.hz .pop{position:relative;width:min(100%,540px);margin-inline:auto;animation:hz-float 6.5s ease-in-out infinite}\
.hz .mestre:nth-of-type(even) .pop{animation-delay:-3s}\
.hz .pop .ov{aspect-ratio:3/4;border-radius:50%/36%;overflow:hidden;background:var(--cream);filter:drop-shadow(0 34px 38px rgba(0,0,0,.38));transition:transform 1s var(--ease),filter 1s var(--ease);transform-origin:50% 90%;display:grid;place-items:center}\
.hz .pop .ov img{width:100%;height:100%;object-fit:cover;object-position:center top}\
.hz .pop .ov .ini{font-family:var(--display);font-weight:800;font-size:clamp(3rem,2rem + 6vw,8rem);color:var(--acc);letter-spacing:-.04em}\
.hz .pop img.cut{width:100%;height:auto;filter:drop-shadow(0 34px 38px rgba(0,0,0,.38));transition:transform 1s var(--ease);transform-origin:50% 90%}\
.hz .mestre:hover .pop .ov,.hz .mestre:hover .pop img.cut{transform:translateY(-12px) scale(1.035) rotate(-1deg)}\
@keyframes hz-float{50%{transform:translateY(-9px)}}\
.hz .mestre .tx .k{opacity:.85}\
.hz .mestre .tx h3{font-family:var(--display);font-weight:800;font-size:clamp(2.2rem,1.4rem + 3.2vw,4.2rem);letter-spacing:-.03em;line-height:.95;margin-top:8px}\
.hz .mestre .tx .ld{margin-top:18px;font-size:clamp(1.1rem,1rem + .5vw,1.35rem);line-height:1.4;max-width:34ch}\
.hz .mestre .tx .bio{margin-top:16px;max-width:52ch;opacity:.9}\
.hz .mestre .tx .ac{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:28px}\
\
.hz .jor{padding-bottom:clamp(36px,4vw,60px)}\
.hz .jor .hd h2{max-width:22ch}\
.hz .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(22px,3vw,40px);max-width:1240px;margin-inline:auto;text-align:center}\
.hz .ft{padding:clamp(28px,3vw,40px) 22px;border-radius:var(--r-md);background:var(--white);position:relative;overflow:hidden;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.hz .ft::before{content:"";position:absolute;left:0;right:0;top:0;height:6px;background:var(--acc);transform:scaleX(0);transform-origin:left;transition:transform .7s var(--ease)}\
.hz .ft:hover{transform:translateY(-8px);box-shadow:0 30px 60px -30px rgba(0,0,0,.35)}\
.hz .ft:hover::before{transform:scaleX(1)}\
.hz .ft .ic{width:64px;height:64px;margin:0 auto 18px;display:grid;place-items:center;border-radius:50%;background:var(--cream);color:var(--acc);transition:transform .6s var(--ease),background .6s var(--ease),color .6s var(--ease)}\
.hz .ft:hover .ic{transform:rotate(-12deg) scale(1.08);background:var(--acc);color:var(--acc-ink)}\
.hz .ft .ic svg{width:30px;height:30px}\
.hz .ft h3{font-family:var(--display);font-weight:800;font-size:1.35rem}\
.hz .ft p{margin-top:10px;color:var(--muted);max-width:30ch;margin-inline:auto}\
.hz .ft b{display:block;font-family:var(--display);font-weight:800;font-size:clamp(2rem,1.4rem + 2vw,3rem);color:var(--acc);letter-spacing:-.03em;line-height:1;margin-bottom:6px}\
\
.hz #hz-programas{padding-top:clamp(48px,6vw,88px)}\
.hz .progs{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,2.4vw,28px);max-width:1320px;margin-inline:auto}\
.hz .pg{position:relative;border-radius:var(--r-lg);overflow:hidden;min-height:520px;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(24px,3vw,36px);color:var(--white);isolation:isolate;background:var(--ink)}\
.hz .pg img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transform:scale(1.03);transition:transform 1.1s var(--ease)}\
.hz .pg::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.05) 20%,rgba(0,0,0,.78))}\
.hz .pg.noimg::before{background:var(--acc);opacity:.92}\
.hz .pg:hover img{transform:scale(1.1)}\
.hz .pg .k{opacity:.9}\
.hz .pg h3{font-family:var(--display);font-weight:800;font-size:clamp(1.6rem,1.2rem + 1.6vw,2.4rem);letter-spacing:-.02em;line-height:1;margin-top:10px;max-width:14ch}\
.hz .pg p{margin-top:12px;opacity:.9;max-width:30ch}\
.hz .pg .btn{margin-top:22px;align-self:flex-start}\
.hz .pg .pill{position:absolute;top:22px;right:22px;background:var(--white);color:var(--ink);border-radius:var(--pill);padding:.5em 1em;font-family:var(--display);font-weight:700;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}\
\
.hz .mapsec{position:relative;margin-top:clamp(70px,9vw,130px);isolation:isolate}\
.hz .mapsec .cap{position:absolute;top:0;left:0;right:0;height:clamp(120px,15vw,210px);background:var(--acc);z-index:2;clip-path:polygon(0 0,100% 0,100% 28%,48.5% 70%,47% 100%,0 58%)}\
.hz .mapwrap{position:relative;height:clamp(680px,84vh,900px);background:#e8e8e2;overflow:hidden}\
.hz .mapwrap iframe,.hz .mapwrap svg.grid{position:absolute;inset:-8%;width:116%;height:116%;border:0;filter:grayscale(1) contrast(.92) brightness(1.05);pointer-events:none}\
.hz .mapwrap svg.grid{filter:none;opacity:.9}\
.hz .card{position:absolute;z-index:3;left:clamp(16px,9vw,140px);top:50%;transform:translateY(-50%);width:min(560px,calc(100% - 32px));background:var(--white);color:var(--ink);border-radius:var(--r-md);padding:clamp(26px,3.2vw,42px);box-shadow:0 36px 80px -34px rgba(0,0,0,.4)}\
.hz.js .card.rv{transform:translateY(calc(-50% + 26px))}.hz.js .card.rv.in{transform:translateY(-50%)}\
.hz .card h2{font-size:clamp(1.9rem,1.3rem + 2.2vw,3rem)}\
.hz .card .ds{margin-top:14px;color:var(--muted);max-width:38ch}\
.hz .card .cc{display:grid;grid-template-columns:1.2fr 1fr .9fr;gap:20px;margin-top:26px}\
.hz .card .cc h4{display:flex;align-items:center;gap:8px;font-family:var(--display);font-weight:800;font-size:.95rem;margin-bottom:8px}\
.hz .card .cc h4 svg{width:18px;height:18px;color:var(--acc);flex:none}\
.hz .card .cc p,.hz .card .cc a{font-size:.88rem;line-height:1.55;color:var(--ink-2);display:block;word-break:break-word}\
.hz .card .cc a:hover{color:var(--acc)}\
.hz .card .bk{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:28px}\
.hz .mapwrap .openmap{position:absolute;right:clamp(16px,3vw,40px);bottom:clamp(100px,13vw,180px);z-index:3}\
.hz .card .btn.ghost::before{background:var(--ink)}.hz .card .btn.ghost:hover{color:var(--white);box-shadow:inset 0 0 0 2px var(--ink)}\
\
.hz .foot{position:relative;z-index:4;background:var(--ink);color:var(--cream);margin-top:clamp(-150px,-11vw,-80px);padding:clamp(150px,15vw,210px) var(--g) clamp(28px,3vw,44px);clip-path:polygon(0 46%,49% 0,50.5% 48%,100% 16%,100% 100%,0 100%)}\
.hz .foot .in{max-width:1320px;margin-inline:auto;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}\
.hz .foot .logo{color:var(--white)}\
.hz .foot .cp{font-size:.9rem;opacity:.7}\
.hz .foot .cp b{color:var(--cream);font-weight:700}\
.hz .foot .in{display:grid;grid-template-columns:1fr auto;gap:26px 40px;align-items:start}\
.hz .foot .sys{display:flex;flex-direction:column;align-items:flex-end;gap:12px}\
.hz .foot .sys .k{opacity:.55;font-size:.7rem}\
.hz .foot .sys nav{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:flex-end}\
.hz .foot .sys a{position:relative;font-size:.92rem;opacity:.85;padding:.2em 0}\
.hz .foot .sys a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:currentColor;transform:scaleX(0);transform-origin:right;transition:transform .45s var(--ease)}\
.hz .foot .sys a:hover::after{transform:scaleX(1);transform-origin:left}\
.hz .foot .cp{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.12);padding-top:18px}\
\
.hz .grad{padding-top:clamp(30px,4vw,60px);padding-bottom:clamp(40px,5vw,70px)}\
.hz .belts{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:clamp(12px,1.6vw,22px);max-width:1320px;margin-inline:auto}\
.hz .blt{text-align:center;padding:16px 10px 14px;border-radius:var(--r-md);background:var(--white);transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.hz .blt:hover{transform:translateY(-8px);box-shadow:0 30px 60px -30px rgba(0,0,0,.35)}\
.hz .blt .num{display:block;font-family:var(--display);font-weight:700;font-size:.72rem;letter-spacing:.2em;color:var(--muted)}\
.hz .blt .band{position:relative;height:46px;margin:12px -4px 14px;border-radius:8px;background:var(--c,#cfcac0);box-shadow:inset 0 0 0 1px rgba(0,0,0,.1),inset 0 -8px 0 rgba(0,0,0,.14);transition:transform .6s var(--ease)}\
.hz .blt .band::before{content:"";position:absolute;left:14%;top:0;bottom:0;width:7%;background:rgba(0,0,0,.18);border-radius:3px}\
.hz .blt .band::after{content:"";position:absolute;right:12%;top:30%;bottom:30%;width:4px;background:rgba(255,255,255,.55);border-radius:2px}\
.hz .blt:hover .band{transform:scaleY(1.12) rotate(-2deg)}\
.hz .blt h3{font-family:var(--display);font-weight:800;font-size:1.05rem;line-height:1.15}\
.hz .blt small{display:block;margin-top:4px;color:var(--muted);font-size:.78rem}\
.hz .gradcta{display:flex;align-items:center;justify-content:center;gap:18px 28px;flex-wrap:wrap;margin-top:clamp(36px,4vw,56px);text-align:center}\
.hz .gradcta p{color:var(--muted);max-width:46ch}\
\
.hz #hz-nucleos{padding-top:clamp(40px,5vw,70px);padding-bottom:0}\
.hz .nucs{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:clamp(16px,2vw,26px);max-width:1320px;margin-inline:auto}\
.hz .nc{position:relative;display:flex;flex-direction:column;gap:10px;padding:clamp(24px,2.6vw,34px);border-radius:var(--r-md);background:var(--white);overflow:hidden;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}\
.hz .nc::after{content:"";position:absolute;right:-40px;bottom:-40px;width:140px;height:140px;border-radius:50%;background:var(--acc);opacity:.08;transition:transform .8s var(--ease)}\
.hz .nc:hover{transform:translateY(-8px);box-shadow:0 30px 60px -30px rgba(0,0,0,.35)}\
.hz .nc:hover::after{transform:scale(1.6)}\
.hz .nc .ic{width:52px;height:52px;display:grid;place-items:center;border-radius:50%;background:var(--cream);color:var(--acc)}\
.hz .nc .ic svg{width:24px;height:24px}\
.hz .nc h3{font-family:var(--display);font-weight:800;font-size:1.4rem;letter-spacing:-.01em;padding-right:70px}\
.hz .nc .sede{position:absolute;top:18px;right:18px;font-family:var(--display);font-weight:700;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;background:var(--acc);color:var(--acc-ink);border-radius:var(--pill);padding:.5em .9em}\
.hz .nc p{color:var(--muted);font-size:.95rem;line-height:1.5}\
.hz .nc .go{margin-top:auto;display:inline-flex;align-items:center;gap:8px;font-family:var(--display);font-weight:700;font-size:.85rem;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);position:relative;z-index:1}\
.hz .nc .go svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.hz .nc:hover .go svg{transform:translateX(5px)}\
\
.hz .appsec{background:var(--ink);color:var(--cream);margin:clamp(50px,6vw,90px) var(--m) 0;border-radius:var(--r-lg);padding:clamp(64px,8vw,120px) clamp(24px,5vw,80px);position:relative;overflow:hidden;isolation:isolate}\
.hz .appsec::before{content:"";position:absolute;width:60vw;height:60vw;max-width:900px;max-height:900px;border-radius:50%;background:radial-gradient(circle,var(--acc),transparent 60%);opacity:.38;right:-20%;top:-30%;z-index:-1;filter:blur(40px)}\
.hz .appgrid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(36px,6vw,90px);align-items:center;max-width:1320px;margin-inline:auto}\
.hz .appsec .k{opacity:.8}\
.hz .appsec h2{font-size:clamp(2.2rem,1.3rem + 4.2vw,4.6rem);margin-top:10px}\
.hz .appsec .lead{margin-top:18px;max-width:52ch;opacity:.85;font-size:clamp(1.05rem,1rem + .4vw,1.25rem)}\
.hz .rec{list-style:none;margin:30px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:12px}\
.hz .rec a{display:flex;gap:14px;align-items:flex-start;height:100%;padding:16px 18px;border-radius:16px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:background .5s var(--ease),transform .5s var(--ease)}\
.hz .rec a:hover{background:rgba(255,255,255,.12);transform:translateX(4px)}\
.hz .rec .ic{flex:none;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:var(--btn);color:var(--btn-ink)}\
.hz .rec .ic svg{width:20px;height:20px}\
.hz .rec b{display:block;font-family:var(--display);font-weight:700;font-size:1rem}\
.hz .rec small{display:block;opacity:.72;font-size:.85rem;line-height:1.4;margin-top:2px}\
.hz .appsec .ac{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:30px}\
.hz .appsec .ac .btn img{width:26px;height:26px;border-radius:7px}\
.hz .appsec .btn.ghost{color:var(--cream)}.hz .appsec .btn.ghost:hover{color:var(--ink)}\
.hz .phone{position:relative;width:min(100%,320px);margin-inline:auto;border-radius:44px;background:#0b0b0b;box-shadow:0 50px 90px -40px rgba(0,0,0,.8),inset 0 0 0 2px rgba(255,255,255,.12);padding:14px;transition:transform .6s var(--ease)}\
.hz .phone .scr{height:100%;border-radius:32px;background:var(--cream);color:var(--ink);overflow:hidden;display:flex;flex-direction:column}\
.hz .phone .notch{position:absolute;left:50%;top:14px;transform:translateX(-50%);width:36%;height:26px;border-radius:0 0 18px 18px;background:#0b0b0b;z-index:2}\
.hz .phone .top{background:var(--acc);color:var(--acc-ink);padding:54px 22px 22px;display:flex;align-items:center;gap:12px}\
.hz .phone .top .mk{width:44px;height:44px;flex:none;border-radius:50%;background:var(--white);color:var(--ink);display:grid;place-items:center;font-family:var(--display);font-weight:800;overflow:hidden}\
.hz .phone .top .mk img{width:100%;height:100%;object-fit:cover}\
.hz .phone .top b{display:block;font-family:var(--display);font-weight:800;font-size:1rem;line-height:1.1}\
.hz .phone .top small{display:block;font-size:.68rem;opacity:.85;letter-spacing:.14em;text-transform:uppercase;margin-top:3px}\
.hz .phone .body{padding:18px 18px 34px;display:flex;flex-direction:column;gap:12px}\
.hz .phone .tile{background:var(--white);border-radius:16px;padding:14px 16px}\
.hz .phone .tile .k{font-size:.62rem;letter-spacing:.18em;color:var(--muted);opacity:1}\
.hz .phone .tile h4{font-family:var(--display);font-weight:800;font-size:1rem;margin-top:4px}\
.hz .phone .therm{height:12px;border-radius:6px;background:var(--cream-2);margin-top:10px;overflow:hidden;position:relative}\
.hz .phone .therm i{position:absolute;inset:0;width:62%;border-radius:6px;background:linear-gradient(90deg,var(--c1),var(--c2));transform-origin:left;transform:scaleX(0);transition:transform 1.6s var(--ease) .3s}\
.hz .phone.in .therm i{transform:none}\
.hz .phone .row{display:flex;gap:10px}\
.hz .phone .row .tile{flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:6px}\
.hz .phone .row .tile svg{width:22px;height:22px;color:var(--acc)}\
.hz .phone .row .tile span{font-family:var(--display);font-weight:700;font-size:.78rem}\
\
@media (prefers-reduced-motion:reduce){.hz *,.hz *::before,.hz *::after{animation:none!important;transition:none!important}.hz.js .rv{opacity:1;transform:none}.hz .hero h1 .l span{transform:none}.hz .hero .sub,.hz .hero .cta{opacity:1}.hz .coach .gi h2 span{clip-path:none}.hz.js .card.rv{transform:translateY(-50%)}.hz .phone .therm i{transform:none}}\
@media (max-width:1100px){.hz .nl{display:none}.hz .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:clamp(22px,3.4vw,52px);flex-direction:column;align-items:flex-start;gap:16px;background:var(--ink);color:var(--white);padding:22px 26px;border-radius:var(--r-md);box-shadow:0 24px 60px rgba(0,0,0,.4)}\
.hz .burger{display:inline-flex}}\
@media (max-width:1000px){.hz .vert,.hz .feats,.hz .progs{grid-template-columns:1fr 1fr}.hz .appgrid{grid-template-columns:1fr}.hz .phone{width:min(100%,280px)}}\
@media (max-width:760px){.hz .hero{clip-path:polygon(0 0,100% 0,100% 100%,60% 100%,58% 96%,0 96%)}.hz .hero .tag{display:none}.hz .hero h1 .big{font-size:.98em}\
.hz .vert,.hz .feats,.hz .progs{grid-template-columns:1fr}.hz .mestre{grid-template-columns:1fr;gap:26px}.hz .mestre:nth-of-type(even) .pop{order:0}.hz .pop{width:min(100%,420px)}\
.hz .coach{clip-path:polygon(0 90px,48% 36px,49% 100px,100% 0,100% 100%,0 100%);padding-top:150px}\
.hz .belts{grid-template-columns:repeat(auto-fit,minmax(104px,1fr))}.hz .rec{grid-template-columns:1fr}\
.hz .foot .in{grid-template-columns:1fr}.hz .foot .sys{align-items:flex-start}.hz .foot .sys nav{justify-content:flex-start}\
.hz .card .cc{grid-template-columns:1fr 1fr}.hz .mapwrap .openmap{display:none}.hz .pg{min-height:440px}}';
}

/* ========================================================================== */
/*  Ícones (inline, sem dependência)                                           */
/* ========================================================================== */
var I = {
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  pin:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l6-6M14 4l6 6M10 14l4-4"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="7" r="3"/></svg>',
  ig:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  book:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V5l8 4 8-4v14l-8 4z"/><path d="M12 9v14"/></svg>',
  user:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0z"/><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3"/></svg>',
  // Ecossistema AtletaPay (app do aluno)
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.5-5.5"/><circle cx="12" cy="16" r="1.6" fill="currentColor"/></svg>',
  card:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/></svg>',
  qr:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h3v3M20 14v6h-3"/></svg>',
  cal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/></svg>',
  zap:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.3-3.9A8 8 0 1 1 8.2 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z"/></svg>',
  net:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M10.5 13l-4 3M13.5 13l4 3"/></svg>'
};

/* ========================================================================== */
/*  Pedaços                                                                    */
/* ========================================================================== */
function initials(n){
  var p = String(n || '').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return 'A';
  return ((p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase();
}
function plural(n, a, b){ return n + ' ' + (n === 1 ? a : b); }
// Plural da peça de graduação: faixa→faixas, cordão→cordões, nível→níveis, prajied→prajieds.
function pluralPeca(p){
  var s = String(p || 'graduação').trim();
  if(/ão$/i.test(s)) return s.replace(/ão$/i, 'ões');
  if(/l$/i.test(s)) return s.replace(/l$/i, 'is');
  if(/[sz]$/i.test(s)) return s;
  return s + 's';
}
// Cor de faixa vinda do cadastro: só #rgb/#rrggbb; fora disso, neutro (nunca injeta CSS).
function corFaixa(v){ var s = String(v || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : ''; }

// Mapa: SVG de malha urbana estilizada (fallback quando a escola não tem coordenadas).
function mapaGrade(){
  var out = '<svg class="grid" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'
    + '<rect width="1200" height="800" fill="#e9e9e3"/>';
  var i;
  for(i = 0; i < 1200; i += 60){ out += '<line x1="'+i+'" y1="0" x2="'+(i+140)+'" y2="800" stroke="#fff" stroke-width="'+(i%180===0?10:4)+'"/>'; }
  for(i = -200; i < 900; i += 70){ out += '<line x1="0" y1="'+i+'" x2="1200" y2="'+(i+120)+'" stroke="#fff" stroke-width="'+(i%210===0?12:5)+'"/>'; }
  out += '<path d="M0 520 C 300 470, 500 640, 820 560 S 1150 420, 1200 460" fill="none" stroke="#cfd9d2" stroke-width="26" opacity=".9"/>'
    + '<circle cx="640" cy="400" r="10" fill="#b9c2bb"/></svg>';
  return out;
}

/* ========================================================================== */
/*  Render                                                                     */
/* ========================================================================== */
export function renderHorizons(s, h){
  var esc = h.esc, url = h.url;
  var modBase = h.modalidadeBase || 'arena';
  var V = (h.VOCAB && (h.VOCAB[modBase] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && h.LIDER[modBase]) || 'Professor';
  var c = s.cores || {};
  var t = {
    acc: hex6(c.principal) || '#1b2a4a', dest: hex6(c.destaque) || '#389E92', btn: hex6(c.botao) || '#e4432e'
  };
  t.accInk = readable(t.acc); t.btnInk = readable(t.btn);

  var site = document.getElementById('site');
  if(!site) return;

  // Fontes + CSS do template (uma vez)
  if(!document.getElementById('hz-fonts')){
    var l = document.createElement('link'); l.id = 'hz-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('hz-css');
  if(!st){ st = document.createElement('style'); st.id = 'hz-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  // Rotas do ecossistema AtletaPay desta escola (firebase.json: /<slug>/<rota> → /app/<rota>.html;
  // cada página descobre a escola pelo primeiro segmento do caminho).
  var R = function(rota){ return '/'+encodeURIComponent(s.slug)+'/'+rota; };
  var ins = R('inscricao');
  var login = R('login');

  // Escada de graduação: cores reais do cadastro (s.escada) ou só os nomes (s.graduacoes).
  var escada = [];
  if(Array.isArray(s.escada) && s.escada.length){
    s.escada.forEach(function(b){ if(b && b.nome) escada.push({ nome:String(b.nome), cor:corFaixa(b.cor) }); });
  } else if(Array.isArray(s.graduacoes)){
    s.graduacoes.forEach(function(n){ if(typeof n === 'string' && n.trim()) escada.push({ nome:n.trim(), cor:'' }); });
  }
  escada = escada.slice(0, 20);
  var pecaPl = pluralPeca(s.peca);
  // "rumo à próxima faixa" / "rumo ao próximo cordão|nível|prajied" (gênero pela terminação).
  var proxPeca = (/a$/i.test(s.peca) ? 'à próxima ' : 'ao próximo ') + s.peca;

  // Núcleos: com campos públicos (nucleosInfo) ou só nomes (nucleos).
  var nucs = [];
  if(Array.isArray(s.nucleosInfo) && s.nucleosInfo.length){
    s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucs.push({ nome:String(n.nome), sede:n.sede === true, cidade:String(n.cidade || ''), uf:String(n.uf || '') }); });
  } else if(Array.isArray(s.nucleos)){
    s.nucleos.forEach(function(n){ if(typeof n === 'string' && n.trim()) nucs.push({ nome:n.trim(), sede:false, cidade:'', uf:'' }); });
  }
  nucs = nucs.slice(0, 12);

  // Conteúdo editado no painel (siteConteudo/{escolaId}.secoes), POR CIMA dos padrões.
  // Só strings/arrays no formato do schema são aceitos; o resto é ignorado em silêncio.
  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }

  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var heroFoto = url(cx('hero', 'foto', '')) || fachada[0] || equipeF[0] || treino[0] || '';
  var logo = url(s.logo);
  var ini = initials(s.nomeCurto);
  var heroPad = HERO[modBase] || HERO.arena;
  var heroT = [cx('hero', 'linha1', heroPad[0]), cx('hero', 'linha2', heroPad[1])];
  var vert = VERTENTES[modBase] || VERTENTES.arena;
  var letreiro = LETREIRO[modBase] || LETREIRO.arena;
  var palavras = cx('letreiro', 'palavras', '');
  if(palavras){ var pl = palavras.split(',').map(function(p){ return p.trim(); }).filter(Boolean).slice(0, 8); if(pl.length) letreiro = pl; }
  var zap = cx('contato', 'whatsapp', '').replace(/\D/g, '');
  if(!/^\d{10,13}$/.test(zap)) zap = '';
  var zapHref = zap ? 'https://wa.me/'+(zap.length <= 11 ? '55' : '')+zap+'?text='+encodeURIComponent(cx('contato', 'msgWhatsapp', 'Olá! Quero agendar uma aula experimental na '+s.nomeCurto+'.')) : '';

  var marca = '<a class="logo" href="#top"><span class="mk">'+(logo ? '<img src="'+esc(logo)+'" alt="'+esc('Logo '+s.nomeCurto)+'">' : esc(ini))+'</span>'
    + '<span>'+esc(s.nomeCurto)+'<small>'+esc(V.nomeMod)+'</small></span></a>';

  // --- NAV + HERO ---
  var nav = '<nav class="nav">'+marca
    + '<div class="nl" id="hz-nl"><a href="#hz-vertentes">Vertentes</a><a href="#hz-mestres">Equipe</a>'
    + (escada.length ? '<a href="#hz-graduacao">Graduação</a>' : '<a href="#hz-programas">Programas</a>')
    + (nucs.length ? '<a href="#hz-nucleos">Núcleos</a>' : '')
    + '<a href="#hz-app">App</a><a href="#hz-contato">Contato</a>'
    + '<a class="btn ghost" href="'+esc(login)+'">Área do aluno</a>'
    + '<a class="btn light" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></div>'
    + '<button class="burger" id="hz-burger" type="button" aria-expanded="false" aria-controls="hz-nl">Menu</button></nav>';

  var hero = '<header class="hero'+(heroFoto ? '' : ' noimg')+'" id="top">'+nav
    + (heroFoto ? '<div class="media"><img src="'+esc(heroFoto)+'" alt="'+esc(s.nome)+'" fetchpriority="high"></div>' : '')
    + '<div class="scrim" aria-hidden="true"></div>'
    + '<div class="in"><h1 class="d">'
    +   '<span class="l"><span style="animation-delay:.05s">'+esc(heroT[0])+'</span></span><br>'
    +   '<span class="big l"><span style="animation-delay:.22s">'+esc(heroT[1])+'</span></span></h1>'
    +   '<p class="sub k">'+esc(cx('hero', 'sub', s.nome+' · '+V.nomeMod+(s.cidade ? ' · '+s.cidade : '')))+'</p>'
    +   '<div class="cta"><a class="btn" href="'+esc(ins)+'" data-magnet>'+esc(cx('hero', 'botao', 'Comece hoje'))+' '+I.arrow+'</a>'
    +   '<a class="btn ghost" href="'+esc(login)+'" data-magnet>Área do aluno</a></div></div>'
    + '<div class="hint" aria-hidden="true"><i></i>role</div>'
    + (s.cidade && s.uf ? '<div class="tag" aria-hidden="true">'+esc(s.cidade)+' · '+esc(s.uf)+'</div>' : '')
    + '</header>';

  // --- LETREIRO ---
  var faixa = letreiro.map(esc).join(' <b>·</b> ') + ' <b>·</b> ' + esc(s.nomeCurto) + ' <b>·</b>';
  var mq = '<div class="mq" aria-hidden="true"><div class="tr"><span>'+faixa+'</span><span>'+faixa+'</span></div></div>';

  // --- VERTENTES ---
  var vItens = lista('vertentes', 'itens', 3).filter(function(v){ return cs(v, 'titulo'); });
  var vlist = vItens.length ? vItens.map(function(v, i){ return [cs(v, 'titulo'), cs(v, 'texto'), url(cs(v, 'foto')) || treino[i] || '']; })
                            : vert.map(function(v, i){ return [v[0], v[1], treino[i] || '']; });
  var vcards = vlist.map(function(v, i){
    var f = v[2];
    return '<article class="vc rv" style="--i:'+i+'"><div class="ph"><span class="n">0'+(i+1)+'</span>'
      + (f ? '<img src="'+esc(f)+'" alt="'+esc(v[0]+' — '+s.nomeCurto)+'" loading="lazy">' : '<span class="ini">'+esc(initials(v[0]))+'</span>')
      + '</div><h3>'+esc(v[0])+'</h3><p>'+esc(v[1])+'</p></article>';
  }).join('');
  var vertentes = '<section class="sec w" id="hz-vertentes"><div class="hd rv"><span class="k">'+esc(cx('vertentes', 'selo', 'Três caminhos, um '+V.local))+'</span>'
    + '<h2 class="d">'+esc(cx('vertentes', 'titulo', 'Escolha sua vertente'))+'</h2></div><div class="vert st">'+vcards+'</div></section>';

  // --- EQUIPE (mestres) --- painel (siteConteudo) → cadastro (equipe[]) → líder. Nunca inventadas.
  var mestres = [];
  lista('equipe', 'itens', 6).forEach(function(m){ if(cs(m, 'nome')) mestres.push({ nome:cs(m, 'nome'), grad:cs(m, 'graduacao'), bio:cs(m, 'bio'), foto:url(cs(m, 'foto')), cut:url(cs(m, 'fotoRecorte')) }); });
  if(!mestres.length && Array.isArray(s.equipe) && s.equipe.length){
    s.equipe.forEach(function(m){ if(m && m.nome) mestres.push({ nome:m.nome, grad:m.graduacao||'', bio:m.bio||'', foto:url(m.foto), cut:url(m.fotoRecorte) }); });
  }
  if(!mestres.length){
    mestres.push({ nome:s.lider, grad:(s.responsavel && s.responsavel.graduacao) || tituloLider, bio:'', foto:url(s.fotoLider), cut:'' });
  }
  var mcards = mestres.slice(0, 6).map(function(m){
    var fig = m.cut ? '<img class="cut" src="'+esc(m.cut)+'" alt="'+esc(m.nome)+'" loading="lazy">'
      : '<div class="ov">'+(m.foto ? '<img src="'+esc(m.foto)+'" alt="'+esc(m.nome)+'" loading="lazy">' : '<span class="ini">'+esc(initials(m.nome))+'</span>')+'</div>';
    var lead = m.bio ? esc(m.bio) : esc('À frente da '+s.nomeCurto+' em '+(s.cidade || 'sua cidade')+', conduz os treinos de '+V.nomeMod+' com técnica, respeito e atenção a cada aluno.');
    return '<article class="mestre rv"><div class="pop">'+fig+'</div><div class="tx">'
      + '<span class="k">'+esc(m.grad || tituloLider)+'</span><h3>'+esc(m.nome)+'</h3>'
      + '<p class="ld">'+lead+'</p>'
      + '<div class="ac"><a class="btn ghost" href="'+esc(ins)+'" data-magnet>Treinar com a equipe</a>'
      + (s.instagram ? '<a class="circ" href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer" aria-label="Instagram">'+I.ig+'</a>' : '')
      + '</div></div></article>';
  }).join('');
  var titEquipe = cx('equipe', 'titulo', mestres.length > 1 ? 'Equipe' : (tituloLider.toUpperCase() === 'MESTRE' ? 'Mestre' : tituloLider)).slice(0, 14);
  var coach = '<section class="coach w" id="hz-mestres"><div class="gi rv" id="hz-gi"><span class="k">'+esc(cx('equipe', 'selo', 'Quem conduz o '+V.local))+'</span>'
    + '<h2 class="d" aria-label="'+esc(titEquipe)+'">'+esc(titEquipe)+'<span aria-hidden="true">'+esc(titEquipe)+'</span></h2></div>'+mcards+'</section>';

  // --- JORNADA --- números só os reais (núcleos, graduações); o resto é texto do template.
  var nGrad = Array.isArray(s.graduacoes) ? s.graduacoes.length : (s.escada ? s.escada.length : 0);
  var nNuc = (s.nucleos || []).length;
  var feats = [
    { ic:I.book, b: nGrad ? String(nGrad) : '', h: nGrad ? plural(nGrad, 'graduação', 'graduações') : 'Programa completo', p:'Do primeiro treino ao topo da escada de '+esc(s.peca)+', com metas claras por etapa.' },
    { ic:I.user, b:'', h:'Equipe qualificada', p:'Treinos conduzidos por quem vive o '+esc(V.nomeMod)+' no dia a dia, com atenção individual.' },
    { ic:nNuc ? I.pin : I.trophy, b: nNuc ? String(nNuc) : '', h: nNuc ? plural(nNuc, 'núcleo', 'núcleos') : 'Preparação completa', p: nNuc ? 'Lugares para treinar sob a mesma bandeira, em '+esc(s.cidade || 'sua cidade')+'.' : 'Base, condicionamento e '+esc(V.luta)+' para quem quer evoluir de verdade.' }
  ].map(function(f, i){
    return '<div class="ft rv" style="--i:'+i+'"><div class="ic">'+f.ic+'</div>'+(f.b ? '<b>'+esc(f.b)+'</b>' : '')+'<h3>'+f.h+'</h3><p>'+f.p+'</p></div>';
  }).join('');
  var jornada = '<section class="sec jor" id="hz-jornada"><div class="w"><div class="hd rv"><span class="k">'+esc(cx('jornada', 'selo', 'Treinar. Evoluir. Vencer.'))+'</span>'
    + '<h2 class="d">'+esc(cx('jornada', 'titulo', 'O '+V.nomeMod+' leva o aluno numa jornada para a vida'))+'</h2></div><div class="feats st">'+feats+'</div></div></section>';

  // --- PROGRAMAS --- faixas de público genéricas (sem preço, sem horário inventado).
  var pfotos = [treino[3] || equipeF[0] || '', treino[4] || fachada[0] || '', treino[5] || treino[1] || ''];
  var pPad = [
    ['Kids', 'Crianças', 'Infantil', 'Disciplina, coordenação e confiança em aulas pensadas para a idade.'],
    ['Todas as idades', 'Iniciantes bem-vindos', 'Treinamento progressivo', 'Turmas por graduação, do primeiro dia até o nível avançado.'],
    ['Adultos', 'Evolução', 'Treino avançado', 'Para quem já domina a base e quer ir além no '+V.luta+'.']
  ];
  var pItens = lista('programas', 'itens', 3).filter(function(p){ return cs(p, 'titulo'); });
  var plist = pItens.length ? pItens.map(function(p, i){ return [cs(p, 'etiqueta'), cs(p, 'selo'), cs(p, 'titulo'), cs(p, 'texto'), url(cs(p, 'foto')) || pfotos[i] || '']; })
                            : pPad.map(function(p, i){ return p.concat([pfotos[i] || '']); });
  var progs = plist.map(function(p, i){
    var f = p[4];
    return '<article class="pg rv'+(f ? '' : ' noimg')+'" style="--i:'+i+'">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '')
      + (p[0] ? '<span class="pill">'+esc(p[0])+'</span>' : '')+(p[1] ? '<span class="k">'+esc(p[1])+'</span>' : '')+'<h3>'+esc(p[2])+'</h3><p>'+esc(p[3])+'</p>'
      + '<a class="btn light" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></article>';
  }).join('');
  var programas = '<section class="sec w" id="hz-programas"><div class="hd rv"><span class="k">'+esc(cx('programas', 'selo', 'Habilidades para a vida toda'))+'</span><h2 class="d">'+esc(cx('programas', 'titulo', 'Programas'))+'</h2></div>'
    + '<div class="progs st">'+progs+'</div></section>';

  // --- GRADUAÇÃO --- a escada real da escola (cores do cadastro). Botão leva ao app (login).
  var grad = '';
  if(escada.length){
    var pecaCap = s.peca.charAt(0).toUpperCase() + s.peca.slice(1);
    var tiles = escada.map(function(b, j){
      return '<div class="blt rv" style="--i:'+j+(b.cor ? ';--c:'+esc(b.cor) : '')+'"><span class="num">'+(j < 9 ? '0' : '')+(j+1)+'</span>'
        + '<div class="band" aria-hidden="true"></div><h3>'+esc(b.nome)+'</h3><small>'+esc(pecaCap)+' · etapa '+(j+1)+'</small></div>';
    }).join('');
    grad = '<section class="sec w grad" id="hz-graduacao"><div class="hd rv"><span class="k">'+esc(cx('graduacao', 'selo', 'Graduação real, direto do app'))+'</span>'
      + '<h2 class="d">'+esc(cx('graduacao', 'titulo', 'A escada de '+pecaPl+' da '+s.nomeCurto))+'</h2></div>'
      + '<div class="belts st">'+tiles+'</div>'
      + '<div class="gradcta rv"><p>'+esc(cx('graduacao', 'texto', 'Cada aluno acompanha no app o termômetro de prontidão rumo '+proxPeca+', com as avaliações feitas pela equipe.'))+'</p>'
      + '<a class="btn" href="'+esc(login)+'" data-magnet>'+esc(cx('graduacao', 'botao', 'Ver minha graduação'))+' '+I.arrow+'</a></div></section>';
  }

  // --- NÚCLEOS --- só os cadastrados (nucleosPublicos). Sem horário/endereço inventado.
  var nucleos = '';
  if(nucs.length){
    var ncards = nucs.map(function(n, i){
      var loc = [n.cidade, n.uf].filter(Boolean).join(' · ');
      return '<article class="nc rv" style="--i:'+i+'">'+(n.sede ? '<span class="sede">Sede</span>' : '')
        + '<div class="ic">'+I.pin+'</div><h3>'+esc(n.nome)+'</h3>'
        + '<p>'+(loc ? esc(loc)+'<br>' : '')+'Dias e horários na área do aluno.</p>'
        + '<a class="go" href="'+esc(ins)+'">Treinar aqui '+I.arrow+'</a></article>';
    }).join('');
    nucleos = '<section class="sec w" id="hz-nucleos"><div class="hd rv"><span class="k">'+esc(cx('nucleos', 'selo', plural(nucs.length, 'núcleo', 'núcleos')+' sob a mesma bandeira'))+'</span>'
      + '<h2 class="d">'+esc(cx('nucleos', 'titulo', 'Onde treinar'))+'</h2></div><div class="nucs st">'+ncards+'</div></section>';
  }

  // --- APP E REDE --- funções do app de gestão (mesmas do site Liberdade), apontando para as rotas reais.
  var rec = [
    [I.gauge, 'Termômetro de prontidão', 'Avaliações da equipe e o caminho '+proxPeca, login],
    [I.card,  'Carteirinha digital',     'Identificação do atleta com graduação e núcleo', R('carteirinha')],
    [I.qr,    'Check-in no treino',      'Presença registrada em um toque', R('checkin')],
    [I.cal,   'Campeonatos e agenda',    'Eventos da equipe e inscrições', R('campeonatos')],
    [I.award, 'Certificados',            'Graduações e participações registradas', R('certificados')],
    [I.net,   'Rede da equipe',          'Avisos, stories e mensagens só para quem treina', R('rede')]
  ].map(function(r){
    return '<li><a href="'+esc(r[3])+'"><span class="ic">'+r[0]+'</span><span><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></span></a></li>';
  }).join('');
  var c1 = (escada[0] && escada[0].cor) || t.dest, c2 = (escada.length && escada[escada.length-1].cor) || t.acc;
  var phone = '<div class="phone rv" aria-hidden="true" style="--c1:'+esc(c1)+';--c2:'+esc(c2)+'"><div class="notch"></div><div class="scr">'
    + '<div class="top"><span class="mk">'+(logo ? '<img src="'+esc(logo)+'" alt="">' : esc(ini))+'</span><div><b>'+esc(s.nomeCurto)+'</b><small>Área do aluno</small></div></div>'
    + '<div class="body"><div class="tile"><span class="k">Termômetro de prontidão</span><h4>Rumo '+esc(proxPeca)+'</h4><div class="therm"><i></i></div></div>'
    + '<div class="row"><div class="tile">'+I.card+'<span>Carteirinha</span></div><div class="tile">'+I.qr+'<span>Check-in</span></div></div>'
    + '<div class="row"><div class="tile">'+I.cal+'<span>Agenda</span></div><div class="tile">'+I.net+'<span>Rede</span></div></div>'
    + '</div></div></div>';
  var appSec = '<section class="appsec" id="hz-app"><div class="appgrid"><div class="rv">'
    + '<span class="k">'+esc(cx('app', 'selo', 'App AtletaPay · '+s.nomeCurto))+'</span><h2 class="d">'+esc(cx('app', 'titulo', 'A equipe inteira no bolso'))+'</h2>'
    + '<p class="lead">'+esc(cx('app', 'texto', 'Sem loja de aplicativos: o aluno instala direto deste site. Graduação, carteirinha, check-in e agenda no mesmo lugar.'))+'</p>'
    + '<ul class="rec">'+rec+'</ul>'
    + '<div class="ac"><a class="btn" href="'+esc(R('instalar'))+'" data-magnet><img src="assets/app-icon-192.png" alt="" width="26" height="26">Instalar o app</a>'
    + '<a class="btn ghost" href="'+esc(R('instalar-rede'))+'" data-magnet><img src="assets/rede-icon-192.png" alt="" width="26" height="26">Instalar a Rede</a></div>'
    + '</div>'+phone+'</div></section>';

  // --- CONTATO sobre o mapa ---
  // Mapa real (Google Maps embed, sem chave de API): por coordenadas (s.geo) ou, na falta delas,
  // pelo endereço cadastrado. Só sem nenhum dos dois é que entra a malha SVG decorativa.
  var geo = s.geo && isFinite(Number(s.geo.lat)) && isFinite(Number(s.geo.lng)) ? { lat:Number(s.geo.lat), lng:Number(s.geo.lng) } : null;
  var enderecoFull = s.endereco ? s.endereco+(s.cidade ? ', '+s.cidade : '')+(s.uf ? ' - '+s.uf : '') : '';
  var mapaQ = geo ? geo.lat.toFixed(6)+','+geo.lng.toFixed(6) : enderecoFull;
  var mapa = mapaQ
    ? '<iframe title="Mapa" src="https://www.google.com/maps?q='+esc(encodeURIComponent(mapaQ))+'&amp;z=16&amp;hl=pt-BR&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>'
    : mapaGrade();
  var mapsHref = mapaQ ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mapaQ) : '';
  var contato = '<section class="mapsec" id="hz-contato"><div class="cap" aria-hidden="true"></div><div class="mapwrap">'+mapa
    + '<div class="card rv"><h2 class="d">'+esc(cx('contato', 'titulo', 'Fale com a gente'))+'</h2>'
    + '<p class="ds">'+esc(cx('contato', 'texto', 'Venha conhecer o '+V.local+'. A inscrição é feita pelo AtletaPay, rápida e segura.'))+'</p>'
    + '<div class="cc">'
    +   '<div><h4>'+I.pin+'Local</h4><p>'+(s.endereco ? esc(s.endereco)+'<br>' : '')+esc(s.cidade)+(s.uf ? ' · '+esc(s.uf) : '')+'</p></div>'
    +   '<div><h4>'+I.clock+'Treinos</h4><p>'+(nNuc ? esc(plural(nNuc, 'núcleo ativo', 'núcleos ativos')) : 'Horários no painel do aluno')+'</p></div>'
    +   '<div><h4>'+I.share+'Social</h4>'
    +     (s.instagram ? '<a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a>' : '')
    +     (s.dominio ? '<a href="https://'+esc(s.dominio)+'" target="_blank" rel="noopener noreferrer">'+esc(s.dominio)+'</a>' : '')
    +     '<a href="'+esc(login)+'">Área do aluno</a></div>'
    + '</div>'
    + '<div class="bk"><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição '+I.arrow+'</a>'
    + (zapHref ? '<a class="btn ghost" href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer" data-magnet>'+I.zap+'Falar no WhatsApp</a>' : '')
    + '</div></div>'
    + (mapsHref ? '<a class="btn light openmap" href="'+esc(mapsHref)+'" target="_blank" rel="noopener noreferrer" data-magnet>Abrir no Maps</a>' : '')
    + '</div></section>';

  // --- FOOTER ---
  var foot = '<footer class="foot"><div class="in">'+marca
    + '<div class="sys"><span class="k">Sistema</span><nav aria-label="Sistema">'
    +   '<a href="'+esc(login)+'">Área do aluno</a><a href="'+esc(ins)+'">Inscrição</a><a href="'+esc(R('admin'))+'">Professores</a>'
    +   '<a href="'+esc(R('instalar'))+'">Instalar o app</a><a href="'+esc(R('privacidade'))+'">Privacidade</a></nav></div>'
    + '<p class="cp">© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b> · atletapay.com.br/'+esc(s.slug)+'</p></div></footer>';

  site.className = 'hz';
  site.innerHTML = hero + mq + vertentes + coach + jornada + grad + programas + nucleos + appSec + contato + foot;
  wire(site);
}

// Nome genérico para o despacho do gerador (LAYOUTS em site-escola.js).
export { renderHorizons as render };

/* ========================================================================== */
/*  Comportamento                                                              */
/* ========================================================================== */
function wire(site){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  site.classList.add('js');

  var burger = site.querySelector('#hz-burger'), nl = site.querySelector('#hz-nl');
  if(burger && nl){
    burger.addEventListener('click', function(){ var o = nl.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    nl.addEventListener('click', function(e){ if(e.target.closest('a')){ nl.classList.remove('open'); burger.setAttribute('aria-expanded','false'); } });
  }

  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold:.14, rootMargin:'0px 0px -6% 0px' });
    site.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  } else {
    site.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); });
  }

  if(reduce) return;

  var heroImg = site.querySelector('.hero .media img'), pops = site.querySelectorAll('.pop .ov, .pop img.cut');
  var ticking = false;
  addEventListener('scroll', function(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){
      var y = scrollY;
      if(heroImg && y < innerHeight*1.2) heroImg.style.translate = '0 '+(y*0.18)+'px';
      pops.forEach(function(p){ var r = p.getBoundingClientRect(); if(r.bottom < 0 || r.top > innerHeight) return; var off = (r.top + r.height/2 - innerHeight/2)/innerHeight; p.style.translate = '0 '+(off*-28)+'px'; });
      ticking = false;
    });
  }, { passive:true });

  if(matchMedia('(hover:hover)').matches){
    site.querySelectorAll('[data-magnet]').forEach(function(b){
      b.addEventListener('mousemove', function(e){ var r = b.getBoundingClientRect(), x = e.clientX - r.left - r.width/2, y = e.clientY - r.top - r.height/2; b.style.transform = 'translate('+(x*.22)+'px,'+(y*.28)+'px)'; });
      b.addEventListener('mouseleave', function(){ b.style.transform = ''; });
    });
    site.querySelectorAll('.vc .ph, .phone').forEach(function(ph){
      var amp = ph.classList.contains('phone') ? 10 : 6;
      ph.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
      ph.addEventListener('mousemove', function(e){ var r = ph.getBoundingClientRect(), x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5; ph.style.transform = 'perspective(900px) rotateX('+(-y*amp)+'deg) rotateY('+(x*amp*1.3)+'deg)'; });
      ph.addEventListener('mouseleave', function(){ ph.style.transform = ''; });
    });
  }
}
