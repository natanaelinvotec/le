/* site-tpl-horizons.js — Template "horizons" do site público por escola (F4.3).
 *
 * Primeiro pré-build oficial da biblioteca. Layout próprio (não é variação do
 * "arena"): hero em cartão com corte diagonal, letreiro, 3 vertentes, bloco de
 * mestres com foto em moldura oval saindo do fundo, jornada, 3 programas,
 * contato em cartão sobre "mapa" e rodapé angulado.
 *
 * Contrato: renderHorizons(s, h)
 *   s — escola já mapeada por site-escola.js (mapEscola): nome, nomeCurto, slug,
 *       modalidade, cidade, uf, endereco, instagram, dominio, cores, lider, peca,
 *       logo, fotoLider, fotos{fachada[],treino[],equipe[]}, graduacoes[], escada,
 *       nucleos[], responsavel{nome,graduacao}, equipe[] (opcional, futuro).
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
\
.hz .foot{position:relative;z-index:4;background:var(--ink);color:var(--cream);margin-top:clamp(-150px,-11vw,-80px);padding:clamp(150px,15vw,210px) var(--g) clamp(28px,3vw,44px);clip-path:polygon(0 46%,49% 0,50.5% 48%,100% 16%,100% 100%,0 100%)}\
.hz .foot .in{max-width:1320px;margin-inline:auto;display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap}\
.hz .foot .logo{color:var(--white)}\
.hz .foot .cp{font-size:.9rem;opacity:.7}\
.hz .foot .cp b{color:var(--cream);font-weight:700}\
\
@media (prefers-reduced-motion:reduce){.hz *,.hz *::before,.hz *::after{animation:none!important;transition:none!important}.hz.js .rv{opacity:1;transform:none}.hz .hero h1 .l span{transform:none}.hz .hero .sub,.hz .hero .cta{opacity:1}.hz .coach .gi h2 span{clip-path:none}.hz.js .card.rv{transform:translateY(-50%)}}\
@media (max-width:1000px){.hz .vert,.hz .feats,.hz .progs{grid-template-columns:1fr 1fr}}\
@media (max-width:760px){.hz .nl{display:none}.hz .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:clamp(22px,3.4vw,52px);flex-direction:column;align-items:flex-start;gap:16px;background:var(--ink);color:var(--white);padding:22px 26px;border-radius:var(--r-md);box-shadow:0 24px 60px rgba(0,0,0,.4)}\
.hz .burger{display:inline-flex}.hz .hero{clip-path:polygon(0 0,100% 0,100% 100%,60% 100%,58% 96%,0 96%)}.hz .hero .tag{display:none}.hz .hero h1 .big{font-size:.98em}\
.hz .vert,.hz .feats,.hz .progs{grid-template-columns:1fr}.hz .mestre{grid-template-columns:1fr;gap:26px}.hz .mestre:nth-of-type(even) .pop{order:0}.hz .pop{width:min(100%,420px)}\
.hz .coach{clip-path:polygon(0 90px,48% 36px,49% 100px,100% 0,100% 100%,0 100%);padding-top:150px}\
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
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M6 3h12v6a6 6 0 0 1-12 0z"/><path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3"/></svg>'
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

  var ins = '/'+encodeURIComponent(s.slug)+'/inscricao';
  var login = '/'+encodeURIComponent(s.slug)+'/login';
  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var heroFoto = fachada[0] || equipeF[0] || treino[0] || '';
  var logo = url(s.logo);
  var ini = initials(s.nomeCurto);
  var heroT = HERO[modBase] || HERO.arena;
  var vert = VERTENTES[modBase] || VERTENTES.arena;
  var letreiro = LETREIRO[modBase] || LETREIRO.arena;

  var marca = '<a class="logo" href="#top"><span class="mk">'+(logo ? '<img src="'+esc(logo)+'" alt="'+esc('Logo '+s.nomeCurto)+'">' : esc(ini))+'</span>'
    + '<span>'+esc(s.nomeCurto)+'<small>'+esc(V.nomeMod)+'</small></span></a>';

  // --- NAV + HERO ---
  var nav = '<nav class="nav">'+marca
    + '<div class="nl" id="hz-nl"><a href="#hz-vertentes">Vertentes</a><a href="#hz-mestres">Equipe</a><a href="#hz-programas">Programas</a><a href="#hz-contato">Contato</a>'
    + '<a class="btn light" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></div>'
    + '<button class="burger" id="hz-burger" type="button" aria-expanded="false" aria-controls="hz-nl">Menu</button></nav>';

  var hero = '<header class="hero'+(heroFoto ? '' : ' noimg')+'" id="top">'+nav
    + (heroFoto ? '<div class="media"><img src="'+esc(heroFoto)+'" alt="'+esc(s.nome)+'" fetchpriority="high"></div>' : '')
    + '<div class="scrim" aria-hidden="true"></div>'
    + '<div class="in"><h1 class="d">'
    +   '<span class="l"><span style="animation-delay:.05s">'+esc(heroT[0])+'</span></span><br>'
    +   '<span class="big l"><span style="animation-delay:.22s">'+esc(heroT[1])+'</span></span></h1>'
    +   '<p class="sub k">'+esc(s.nome)+' · '+esc(V.nomeMod)+(s.cidade ? ' · '+esc(s.cidade) : '')+'</p>'
    +   '<div class="cta"><a class="btn" href="'+esc(ins)+'" data-magnet>Comece hoje '+I.arrow+'</a>'
    +   '<a class="btn ghost" href="'+esc(login)+'" data-magnet>Área do aluno</a></div></div>'
    + '<div class="hint" aria-hidden="true"><i></i>role</div>'
    + (s.cidade && s.uf ? '<div class="tag" aria-hidden="true">'+esc(s.cidade)+' · '+esc(s.uf)+'</div>' : '')
    + '</header>';

  // --- LETREIRO ---
  var faixa = letreiro.map(esc).join(' <b>·</b> ') + ' <b>·</b> ' + esc(s.nomeCurto) + ' <b>·</b>';
  var mq = '<div class="mq" aria-hidden="true"><div class="tr"><span>'+faixa+'</span><span>'+faixa+'</span></div></div>';

  // --- VERTENTES ---
  var vcards = vert.map(function(v, i){
    var f = treino[i] || '';
    return '<article class="vc rv" style="--i:'+i+'"><div class="ph"><span class="n">0'+(i+1)+'</span>'
      + (f ? '<img src="'+esc(f)+'" alt="'+esc(v[0]+' — '+s.nomeCurto)+'" loading="lazy">' : '<span class="ini">'+esc(initials(v[0]))+'</span>')
      + '</div><h3>'+esc(v[0])+'</h3><p>'+esc(v[1])+'</p></article>';
  }).join('');
  var vertentes = '<section class="sec w" id="hz-vertentes"><div class="hd rv"><span class="k">Três caminhos, um '+esc(V.local)+'</span>'
    + '<h2 class="d">Escolha sua vertente</h2></div><div class="vert st">'+vcards+'</div></section>';

  // --- EQUIPE (mestres) --- só pessoas cadastradas; nunca inventadas.
  var mestres = [];
  if(Array.isArray(s.equipe) && s.equipe.length){
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
  var titEquipe = mestres.length > 1 ? 'Equipe' : (tituloLider.toUpperCase() === 'MESTRE' ? 'Mestre' : tituloLider);
  var coach = '<section class="coach w" id="hz-mestres"><div class="gi rv" id="hz-gi"><span class="k">Quem conduz o '+esc(V.local)+'</span>'
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
  var jornada = '<section class="sec jor" id="hz-jornada"><div class="w"><div class="hd rv"><span class="k">Treinar. Evoluir. Vencer.</span>'
    + '<h2 class="d">O '+esc(V.nomeMod)+' leva o aluno numa jornada para a vida</h2></div><div class="feats st">'+feats+'</div></div></section>';

  // --- PROGRAMAS --- faixas de público genéricas (sem preço, sem horário inventado).
  var pfotos = [treino[3] || equipeF[0] || '', treino[4] || fachada[0] || '', treino[5] || treino[1] || ''];
  var progs = [
    ['Kids', 'Crianças', 'Infantil', 'Disciplina, coordenação e confiança em aulas pensadas para a idade.'],
    ['Todas as idades', 'Iniciantes bem-vindos', 'Treinamento progressivo', 'Turmas por graduação, do primeiro dia até o nível avançado.'],
    ['Adultos', 'Evolução', 'Treino avançado', 'Para quem já domina a base e quer ir além no '+V.luta+'.']
  ].map(function(p, i){
    var f = pfotos[i];
    return '<article class="pg rv'+(f ? '' : ' noimg')+'" style="--i:'+i+'">'+(f ? '<img src="'+esc(f)+'" alt="" loading="lazy">' : '')
      + '<span class="pill">'+esc(p[0])+'</span><span class="k">'+esc(p[1])+'</span><h3>'+esc(p[2])+'</h3><p>'+esc(p[3])+'</p>'
      + '<a class="btn light" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></article>';
  }).join('');
  var programas = '<section class="sec w" id="hz-programas"><div class="hd rv"><span class="k">Habilidades para a vida toda</span><h2 class="d">Programas</h2></div>'
    + '<div class="progs st">'+progs+'</div></section>';

  // --- CONTATO sobre o mapa ---
  var geo = s.geo && isFinite(s.geo.lat) && isFinite(s.geo.lng) ? s.geo : null;
  var mapa = geo
    ? '<iframe title="Mapa" src="https://www.openstreetmap.org/export/embed.html?bbox='+esc((geo.lng-0.06).toFixed(4))+'%2C'+esc((geo.lat-0.05).toFixed(4))+'%2C'+esc((geo.lng+0.06).toFixed(4))+'%2C'+esc((geo.lat+0.05).toFixed(4))+'&amp;layer=mapnik&amp;marker='+esc(geo.lat.toFixed(5))+'%2C'+esc(geo.lng.toFixed(5))+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    : mapaGrade();
  var mapsHref = s.endereco ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(s.endereco+(s.cidade ? ', '+s.cidade : '')+(s.uf ? ' - '+s.uf : '')) : '';
  var contato = '<section class="mapsec" id="hz-contato"><div class="cap" aria-hidden="true"></div><div class="mapwrap">'+mapa
    + '<div class="card rv"><h2 class="d">Fale com a gente</h2>'
    + '<p class="ds">Venha conhecer o '+esc(V.local)+'. A inscrição é feita pelo AtletaPay, rápida e segura.</p>'
    + '<div class="cc">'
    +   '<div><h4>'+I.pin+'Local</h4><p>'+(s.endereco ? esc(s.endereco)+'<br>' : '')+esc(s.cidade)+(s.uf ? ' · '+esc(s.uf) : '')+'</p></div>'
    +   '<div><h4>'+I.clock+'Treinos</h4><p>'+(nNuc ? esc(plural(nNuc, 'núcleo ativo', 'núcleos ativos')) : 'Horários no painel do aluno')+'</p></div>'
    +   '<div><h4>'+I.share+'Social</h4>'
    +     (s.instagram ? '<a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a>' : '')
    +     (s.dominio ? '<a href="https://'+esc(s.dominio)+'" target="_blank" rel="noopener noreferrer">'+esc(s.dominio)+'</a>' : '')
    +     '<a href="'+esc(login)+'">Área do aluno</a></div>'
    + '</div>'
    + '<div class="bk"><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição '+I.arrow+'</a></div></div>'
    + (mapsHref ? '<a class="btn light openmap" href="'+esc(mapsHref)+'" target="_blank" rel="noopener noreferrer" data-magnet>Abrir no Maps</a>' : '')
    + '</div></section>';

  // --- FOOTER ---
  var foot = '<footer class="foot"><div class="in">'+marca.replace('href="#top"', 'href="#top"')
    + '<p class="cp">© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b> · atletapay.com.br/'+esc(s.slug)+'</p></div></footer>';

  site.className = 'hz';
  site.innerHTML = hero + mq + vertentes + coach + jornada + programas + contato + foot;
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
    site.querySelectorAll('.vc .ph').forEach(function(ph){
      ph.style.transition = 'transform .6s cubic-bezier(.16,1,.3,1)';
      ph.addEventListener('mousemove', function(e){ var r = ph.getBoundingClientRect(), x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5; ph.style.transform = 'perspective(900px) rotateX('+(-y*6)+'deg) rotateY('+(x*8)+'deg)'; });
      ph.addEventListener('mouseleave', function(){ ph.style.transform = ''; });
    });
  }
}
