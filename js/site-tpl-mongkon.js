/* site-tpl-mongkon.js — Template "mongkon" do site público por escola (F4.3, pré-build #4).
 *
 * Direção: formas redondas. Preto quente + creme + dourado (o acento é a cor de botão/destaque
 * da escola), tipografia Unbounded (display) + Manrope (texto). Motivos: o mongkon e o prajied —
 * anéis giratórios em volta das fotos, níveis desenhados como cordas com nó, botões-pílula com
 * preenchimento circular, cartões de cantos grandes, letreiro em pílula. Nasceu para Muay Thai,
 * serve qualquer modalidade (tabelas por modalidade abaixo).
 *
 * Seções: hero em cartão redondo (2 linhas, última palavra em destaque) · letreiro pílula · 3 destaques ·
 * intro com foto em anel + contadores reais · "com contato / sem contato" · 4 programas · níveis (escada
 * real como prajieds) · atleta em destaque (pôster; só se a escola preencher nome + foto) · equipe em anéis ·
 * horários da semana (editáveis) · App e Rede (cartão creme) · contato com mapa · rodapé Sistema.
 *
 * Contrato da biblioteca (site-templates.js): render(s, h) + schema + meta.
 *   s — escola mapeada por site-escola.js (mapEscola) + s.conteudo (siteConteudo/{escolaId}).
 *   h — { esc, url, VOCAB, LIDER, modalidadeBase, modalidade }.
 * Segurança: todo texto por h.esc(); toda URL por h.url(); cor de faixa revalidada; nenhum handler
 * inline; links externos com rel="noopener noreferrer". Nada inventado: números só os reais (escada,
 * núcleos, equipe); horários/atleta/WhatsApp só se a escola preencher.
 * Responsivo: 1280 (menu vira hambúrguer), 1100 (grades 2 col.), 760 (1 col.), 480 (horários 1 col.).
 */

/* ========================================================================== */
/*  Contrato da biblioteca: meta + schema                                      */
/* ========================================================================== */
export var meta = {
  nome: 'Mongkon',
  descricao: 'Formas redondas: preto quente com dourado, fotos em anéis giratórios, níveis como cordas (prajieds), botões-pílula, pôster do atleta em destaque, horários e o bloco do app em cartão creme.',
  modalidades: ['muaythai', 'boxe', 'mma', 'kickboxing', 'todas']
};

var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var DIAS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];
export var schema = { secoes: [
  { id:'hero', r:'Topo', ajuda:'Título em duas linhas — a última palavra da segunda linha fica na cor de destaque. Sem foto aqui, entra a fachada do cadastro.', campos:[
    { c:'linha1', r:'Título — linha 1', max:18, ph:'Oito armas,' }, { c:'linha2', r:'Título — linha 2 (última palavra em destaque)', max:22, ph:'uma disciplina.' },
    { c:'texto', r:'Texto do cartão', t:'area', max:200 }, { c:'botao', r:'Botão principal', max:24, ph:'Comece hoje' }, { c:'foto', r:'Foto de fundo', t:'foto' } ] },
  { id:'letreiro', r:'Letreiro', ajuda:'As palavras que correm na pílula dourada abaixo do topo.', campos:[
    { c:'palavras', r:'Palavras (separe por vírgula, até 8)', max:140, ph:'Teep, Clinch, Cotovelo, Joelho, Wai Kru' } ] },
  { id:'destaques', r:'Destaques', ajuda:'Três argumentos curtos logo abaixo do topo.', campos:[
    { c:'itens', r:'Destaques', t:'lista', max:3, resumo:'titulo', nomeItem:'Destaque', item:[ { c:'titulo', r:'Título', max:40 }, { c:'texto', r:'Texto', t:'area', max:140 } ] } ] },
  { id:'intro', r:'O clube', ajuda:'Foto em anel + texto de apresentação. Os números (níveis, núcleos, equipe) vêm do cadastro.', campos:[
    SELO, { c:'titulo', r:'Título (a palavra entre *asteriscos* fica em destaque)', max:70, ph:'Muay Thai de *verdade*, para gente de verdade' }, { c:'texto', r:'Texto', t:'area', max:300 }, { c:'botao', r:'Botão', max:24 }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'split', r:'Dois caminhos', ajuda:'Dois blocos lado a lado (ex.: com contato / sem contato). Tópicos: um por linha.', campos:[
    { c:'titulo', r:'Título da seção (palavra entre *asteriscos* em destaque)', max:60, ph:'Com contato *e* sem contato' },
    { c:'itens', r:'Blocos', t:'lista', max:2, resumo:'titulo', nomeItem:'Bloco', item:[
      { c:'selo', r:'Etiqueta', max:40 }, { c:'titulo', r:'Título', max:30 }, { c:'topicos', r:'Tópicos (um por linha)', t:'area', max:400, linhas:4 }, { c:'botao', r:'Botão', max:24 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'programas', r:'Programas', ajuda:'Quatro programas em cartões com foto (a descrição aparece ao passar o mouse).', campos:[
    { c:'titulo', r:'Título da seção (palavra entre *asteriscos* em destaque)', max:60, ph:'Diversão. *Condição.* Muay Thai.' },
    { c:'itens', r:'Programas', t:'lista', max:4, resumo:'titulo', nomeItem:'Programa', item:[ { c:'titulo', r:'Nome', max:30 }, { c:'texto', r:'Descrição curta', t:'area', max:120 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'niveis', r:'Níveis', ajuda:'Os níveis e cores vêm da escada cadastrada (cada um vira uma corda). Aqui você dá uma legenda para cada um, na mesma ordem.', campos:[
    { c:'titulo', r:'Título da seção (palavra entre *asteriscos* em destaque)', max:60, ph:'A escada de *prajieds* da equipe' }, { c:'texto', r:'Texto ao lado do botão', t:'area', max:200 }, { c:'botao', r:'Botão', max:30, ph:'Ver minha graduação' },
    { c:'itens', r:'Legendas por nível (na ordem da escada)', t:'lista', max:12, resumo:'selo', nomeItem:'Nível', item:[ { c:'selo', r:'Legenda (ex.: Prajied · etapa 1)', max:30 } ] } ] },
  { id:'atleta', r:'Atleta em destaque', ajuda:'Pôster de um atleta da equipe. Só aparece com nome e foto preenchidos (foto PNG com fundo transparente fica melhor). Cartel é opcional.', campos:[
    { c:'nome', r:'Nome do atleta', max:60 }, { c:'titulo', r:'Frase grande (palavra entre *asteriscos* em destaque)', max:40, ph:'Treine *duro*, lute fácil.' }, { c:'texto', r:'Texto', t:'area', max:260 },
    { c:'foto', r:'Foto (PNG com fundo transparente)', t:'foto', png:true }, { c:'vitorias', r:'Vitórias', max:3 }, { c:'derrotas', r:'Derrotas', max:3 }, { c:'empates', r:'Empates', max:3 }, { c:'botao', r:'Botão', max:30, ph:'Treinar com a equipe' } ] },
  { id:'equipe', r:'Equipe', ajuda:'Quem conduz os treinos. Lista vazia = equipe do cadastro.', campos:[
    { c:'titulo', r:'Título da seção (palavra entre *asteriscos* em destaque)', max:60, ph:'Resultado vem de *quem* treina você' },
    { c:'itens', r:'Pessoas', t:'lista', max:6, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:60 }, { c:'graduacao', r:'Graduação / título', max:40 }, { c:'bio', r:'Apresentação', t:'area', max:200 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'horarios', r:'Horários', ajuda:'Quadro da semana. Sem itens, a seção não aparece.', campos:[
    { c:'titulo', r:'Título da seção (palavra entre *asteriscos* em destaque)', max:50, ph:'Semana no *ringue*' }, { c:'nota', r:'Observação abaixo do quadro', max:140, ph:'Horários sujeitos a alteração — o app avisa.' },
    { c:'itens', r:'Aulas', t:'lista', max:30, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS, ph:'Dia da semana' }, { c:'aula', r:'Aula', max:40, ph:'Sparring' }, { c:'horario', r:'Horário', max:20, ph:'19:30–21:00' }, { c:'local', r:'Local / núcleo', max:40 } ] } ] },
  { id:'app', r:'App e Rede', campos:[ SELO, { c:'titulo', r:'Título', max:40, ph:'O clube inteiro no bolso' }, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  { id:'contato', r:'Contato', ajuda:'Endereço, mapa e Instagram vêm do cadastro. Com WhatsApp preenchido aparece "Falar no WhatsApp" (aula experimental).', campos:[
    SELO, { c:'titulo', r:'Título (palavra entre *asteriscos* em destaque)', max:40, ph:'Fale com *a gente*' }, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13, ph:'67999990000' }, { c:'msgWhatsapp', r:'Mensagem pronta do WhatsApp', max:140, ph:'Olá! Quero agendar uma aula experimental.' } ] }
] };

/* ========================================================================== */
/*  Vocabulário por modalidade (defaults do template). Chave = modalidade real  */
/*  quando existe na tabela; senão a base (modalidadeBase); senão 'arena'.      */
/* ========================================================================== */
var HERO = {
  muaythai:  ['Oito armas,', 'uma disciplina.'],
  boxe:      ['Encontre', 'o lutador em você.'],
  mma:       ['Completo', 'por natureza.'],
  kickboxing:['Pernas e punhos,', 'uma só cabeça.'],
  karate:    ['Técnica, respeito,', 'resultado.'],
  capoeira:  ['Onde a roda', 'não para.'],
  jiujitsu:  ['Base, guarda,', 'finalização.'],
  judo:      ['Caminho suave,', 'base firme.'],
  taekwondo: ['Chute alto,', 'cabeça erguida.'],
  kravmaga:  ['Simples, direto,', 'eficiente.'],
  arena:     ['Treine com quem', 'vive isso.']
};
var SIDE = {
  muaythai: 'Base, clinch e condicionamento de ringue. Para quem quer lutar e para quem quer a intensidade sem o contato.',
  boxe: 'Técnica, condicionamento e cabeça fria. Treinos para quem quer competir e para quem quer só sair melhor do que entrou.',
  mma: 'Em pé e no chão, com método. Da primeira aula à preparação de luta, no mesmo tatame.',
  arena: 'Técnica antes de força, respeito antes de tudo. Treinos para quem quer competir e para quem quer evoluir.'
};
var LETREIRO = {
  muaythai: ['Teep', 'Clinch', 'Cotovelo', 'Joelho', 'Wai Kru', 'Mongkon'],
  boxe: ['Jab', 'Direto', 'Cruzado', 'Gancho', 'Esquiva', 'Guarda alta'],
  mma: ['Striking', 'Grappling', 'Takedown', 'Cardio', 'Estratégia', 'Respeito'],
  kickboxing: ['Low kick', 'Jab', 'Joelho', 'Esquiva', 'Cardio', 'Disciplina'],
  karate: ['Kata', 'Kumite', 'Kihon', 'Budō', 'Disciplina', 'Respeito'],
  capoeira: ['Roda', 'Ginga', 'Berimbau', 'Axé', 'Malandragem', 'Respeito'],
  jiujitsu: ['Base', 'Guarda', 'Passagem', 'Finalização', 'Oss', 'Respeito'],
  judo: ['Ukemi', 'Nage-waza', 'Ne-waza', 'Randori', 'Rei', 'Respeito'],
  taekwondo: ['Poomsae', 'Kyorugi', 'Chagi', 'Dojang', 'Disciplina', 'Respeito'],
  kravmaga: ['Defesa', 'Simulação', 'Reação', 'Controle', 'Kida', 'Confiança'],
  arena: ['Técnica', 'Disciplina', 'Foco', 'Equipe', 'Evolução', 'Respeito']
};
var DESTAQUES = {
  muaythai: [['Kru dedicados', 'Gente que vive o Muay Thai todos os dias e corrige o detalhe que muda sua luta.'], ['Treino individual', 'Avaliação por critérios no app e um plano por prajied, do primeiro teep ao sparring.'], ['Condicionamento de ringue', 'Força, cardio e clinch pensados para os cinco rounds — e para a vida fora deles.']],
  boxe: [['Treinadores dedicados', 'Gente que vive o boxe todos os dias e corrige o detalhe que muda sua luta.'], ['Treino individual', 'Avaliação por critérios no app e um plano para cada nível, do primeiro jab ao sparring.'], ['Condicionamento sob medida', 'Força, cardio e mobilidade pensados para o ringue — e para a vida fora dele.']],
  arena: [['Equipe dedicada', 'Gente que vive a arte todos os dias e corrige o detalhe que muda o seu treino.'], ['Treino individual', 'Avaliação por critérios no app e um plano para cada nível, do primeiro dia à competição.'], ['Condicionamento sob medida', 'Força, cardio e mobilidade pensados para o treino — e para a vida fora dele.']]
};
var SPLIT = {
  muaythai: { titulo:'Com contato *e* sem contato', itens:[
    { selo:'Treino técnico', titulo:'Sem contato', topicos:['Thai pads e aparadores: reação, distância e timing', 'Saco, corda e sombra com correção individual', 'Condicionamento de ringue, sem levar golpe'], botao:'Começar' },
    { selo:'Para quem quer lutar', titulo:'Com contato', topicos:['Sparring e clinch com caneleira, capacete e bucal', 'Supervisão em todos os rounds, sempre', 'Preparação para eventos amadores e federados'], botao:'Saiba mais' } ] },
  boxe: { titulo:'Com contato *e* sem contato', itens:[
    { selo:'Treino técnico', titulo:'Sem contato', topicos:['Manopla e aparador: reação, distância e timing', 'Saco, corda e sombra com correção individual', 'Condicionamento com a intensidade do ringue, sem levar golpe'], botao:'Começar' },
    { selo:'Para quem quer lutar', titulo:'Com contato', topicos:['Sparring completo com capacete e protetor bucal', 'Supervisão em todos os rounds, sempre', 'Preparação para competições amadoras e federadas'], botao:'Saiba mais' } ] },
  arena: { titulo:'Técnica *e* treino livre', itens:[
    { selo:'Base', titulo:'Fundamentos', topicos:['Postura, base e defesa, repetidas até virar reflexo', 'Correção individual em cada aula', 'Condicionamento no ritmo de quem está começando'], botao:'Começar' },
    { selo:'Para quem já treina', titulo:'Treino avançado', topicos:['Aplicação com controle e supervisão', 'Estratégia e leitura do adversário', 'Preparação para competições'], botao:'Saiba mais' } ] }
};
var PROGS = {
  muaythai: { titulo:'Diversão. *Condição.* Muay Thai.', itens:[['Sparring', 'Rounds controlados para quem já domina a base.'], ['Clinch e joelhos', 'A arma que define o Muay Thai, com segurança.'], ['Feminino', 'Turma exclusiva, técnica e condicionamento.'], ['Infantil', 'Coordenação, disciplina e confiança, sem contato.']] },
  boxe: { titulo:'Diversão. *Condição.* Boxe.', itens:[['Sparring', 'Rounds controlados para quem já domina a base.'], ['Treino físico', 'Saco, corda e circuito: o cardio do boxe sem contato.'], ['Feminino', 'Turma exclusiva, técnica e defesa pessoal.'], ['Infantil', 'Coordenação, disciplina e confiança, sem contato.']] },
  arena: { titulo:'Diversão. *Condição.* Técnica.', itens:[['Fundamentos', 'A base técnica, do primeiro dia em diante.'], ['Condicionamento', 'Força e cardio no ritmo do treino.'], ['Feminino', 'Turma exclusiva, técnica e defesa pessoal.'], ['Infantil', 'Coordenação, disciplina e confiança.']] }
};
var INTRO = {
  muaythai: ['Para todas as idades e níveis', 'Muay Thai de *verdade*, para gente de verdade', 'Nosso foco é técnica correta, condicionamento e respeito ao ritual. Quem chega para emagrecer e quem chega para competir dividem o mesmo ringue e o mesmo Wai Kru.'],
  boxe: ['Para todas as idades e níveis', 'Boxe de *verdade*, para gente de verdade', 'Nosso foco é treino funcional dinâmico e técnica correta de boxe. Quem chega para emagrecer e quem chega para competir dividem o mesmo ringue e o mesmo respeito.'],
  arena: ['Para todas as idades e níveis', 'Treino de *verdade*, para gente de verdade', 'Nosso foco é técnica correta e condicionamento com método. Quem chega para evoluir e quem chega para competir dividem o mesmo espaço e o mesmo respeito.']
};

/* ========================================================================== */
/*  CSS (escopado em .mg; acento vem da escola). Base gerada do mockup aprovado. */
/* ========================================================================== */
var CSS_BASE = '\
.mg .w{padding-inline:var(--g)}\
.mg .ct{max-width:1360px;margin-inline:auto}\
.mg .d{font-family:var(--display);font-weight:800;line-height:1;letter-spacing:-.02em;text-wrap:balance}\
.mg .d em{font-style:normal;color:var(--gold)}\
.mg .k{font-family:var(--text);font-weight:700;font-size:.78rem;letter-spacing:.24em;text-transform:uppercase;color:var(--gold)}\
.mg .k.ring{display:inline-flex;align-items:center;gap:10px}\
.mg .k.ring::before{content:"";width:14px;height:14px;border-radius:50%;border:3px solid var(--gold)}\
.mg .btn{position:relative;display:inline-flex;align-items:center;gap:.7em;background:var(--gold);color:var(--gold-ink);font-family:var(--display);font-weight:800;font-size:clamp(.82rem,.78rem + .25vw,.95rem);letter-spacing:.02em;padding:1em 1.8em;border-radius:var(--pill);border:0;cursor:pointer;isolation:isolate;overflow:hidden;white-space:nowrap;transition:transform .5s var(--ease),box-shadow .5s var(--ease),color .4s}\
.mg .btn::before{content:"";position:absolute;left:50%;top:50%;width:0;height:0;border-radius:50%;background:var(--cream);transform:translate(-50%,-50%);transition:width .6s var(--ease),height .6s var(--ease);z-index:-1}\
.mg .btn:hover::before{width:260%;height:600%}\
.mg .btn:hover{transform:translateY(-2px);box-shadow:0 18px 40px -18px rgba(@ACC@,.6)}\
.mg .btn svg{width:1.1em;height:1.1em;transition:transform .5s var(--ease)}\
.mg .btn:hover svg{transform:translateX(4px)}\
.mg .btn.ghost{background:transparent;color:var(--cream);box-shadow:inset 0 0 0 2px rgba(239,230,214,.5)}\
.mg .btn.ghost::before{background:var(--cream)}\
.mg .btn.ghost:hover{color:var(--ink);box-shadow:inset 0 0 0 2px var(--cream)}\
.mg .btn.dark{background:var(--ink);color:var(--cream)}\
.mg .btn.dark::before{background:var(--gold)}\
.mg .btn.dark:hover{color:var(--gold-ink)}\
.mg .circ{display:inline-grid;place-items:center;width:50px;height:50px;border-radius:50%;box-shadow:inset 0 0 0 2px rgba(239,230,214,.4);transition:transform .4s var(--ease),background .4s,color .4s}\
.mg .circ svg{width:18px;height:18px}\
.mg .circ:hover{transform:translateY(-3px) rotate(-8deg);background:var(--gold);color:var(--gold-ink);box-shadow:none}\
.mg .nav{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:clamp(18px,2.4vw,32px) clamp(22px,3.4vw,52px);color:var(--cream)}\
.mg .logo{display:flex;align-items:center;gap:12px;font-family:var(--display);font-weight:800;font-size:1.1rem;letter-spacing:-.01em}\
.mg .logo .mk{width:48px;height:48px;border-radius:50%;border:3px solid var(--gold);display:grid;place-items:center;font-size:1rem;color:var(--gold);transition:transform .6s var(--ease),background .4s,color .4s}\
.mg .logo:hover .mk{transform:rotate(-12deg);background:var(--gold);color:var(--gold-ink)}\
.mg .logo small{display:block;font-family:var(--text);font-weight:600;font-size:.62rem;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);line-height:1;margin-top:3px}\
.mg .nl{display:flex;gap:clamp(6px,1vw,14px);align-items:center}\
.mg .nl a{position:relative;font-weight:600;font-size:.9rem;padding:.5em .9em;border-radius:var(--pill);transition:background .4s}\
.mg .nl a:hover{background:rgba(239,230,214,.1)}\
.mg .nl .btn{padding:.7em 1.3em;font-size:.8rem;margin-left:6px}\
.mg .burger{display:none;background:none;border:2px solid currentColor;color:inherit;border-radius:var(--pill);padding:.55em 1em;font:inherit;font-weight:700;cursor:pointer}\
.mg .hero{position:relative;margin:var(--m);min-height:clamp(640px,calc(100svh - var(--m)*2),900px);border-radius:var(--r);overflow:hidden;isolation:isolate;display:flex;align-items:flex-end;background:var(--carbon)}\
.mg .hero .media{position:absolute;inset:0;z-index:-2}\
.mg .hero .media img{width:100%;height:100%;object-fit:cover;object-position:center 35%;transform:scale(1.06);animation:mg-kb 20s cubic-bezier(.65,0,.35,1) infinite alternate}\
@keyframes mg-kb{to{transform:scale(1.15) translate(-1.5%,1%)}}\
.mg .hero .scrim{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(15,13,11,.55),rgba(15,13,11,.05) 40%,rgba(15,13,11,.9) 100%)}\
.mg .hero .ct{width:100%;padding:0 clamp(24px,4vw,64px) clamp(32px,4vw,56px);display:grid;grid-template-columns:1.25fr .75fr;gap:28px;align-items:end}\
.mg .hero h1{font-size:clamp(2.6rem,1rem + 6.4vw,6.4rem);letter-spacing:-.03em}\
.mg .hero h1 .l{display:block;overflow:hidden;padding-top:.08em;margin-top:-.08em}\
.mg .hero h1 .l span{display:block;transform:translateY(110%);animation:mg-rise .9s var(--ease) forwards}\
@keyframes mg-rise{to{transform:none}}\
@keyframes mg-fade{to{opacity:1}}\
.mg .hero .side{background:rgba(15,13,11,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid var(--line);border-radius:var(--r2);padding:clamp(18px,2.4vw,28px);opacity:0;animation:mg-fade .9s var(--ease) .6s forwards}\
.mg .hero .side p{color:var(--cream-2);font-size:.98rem}\
.mg .hero .side .cta{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}\
.mg .hero .chips{position:absolute;top:clamp(90px,14vh,140px);right:clamp(22px,3.4vw,52px);display:grid;gap:10px;justify-items:end}\
.mg .hero .chip{display:inline-flex;align-items:center;gap:10px;background:rgba(15,13,11,.5);backdrop-filter:blur(10px);border:1px solid var(--line);border-radius:var(--pill);padding:.5em 1em .5em .6em;font-size:.82rem;color:var(--cream-2);opacity:0;animation:mg-fade .9s var(--ease) forwards}\
.mg .hero .chip i{width:28px;height:28px;border-radius:50%;background:var(--gold);color:var(--gold-ink);display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:.8rem;font-style:normal}\
.mg .hero .tag{position:absolute;left:clamp(22px,3.4vw,52px);top:clamp(96px,14vh,146px);width:118px;height:118px;border-radius:50%;border:3px solid var(--gold);display:grid;place-items:center;text-align:center;font-family:var(--display);font-weight:800;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);animation:mg-spin 18s linear infinite;opacity:.9}\
@keyframes mg-spin{to{transform:rotate(360deg)}}\
.mg .mq{margin:0 var(--m);background:var(--gold);color:var(--gold-ink);border-radius:var(--pill);overflow:hidden;padding:14px 0;transform:translateY(-50%);position:relative;z-index:3}\
.mg .mq .tr{display:flex;gap:2.4rem;width:max-content;animation:mg-slide 28s linear infinite}\
.mg .mq span{font-family:var(--display);font-weight:800;font-size:clamp(1rem,.9rem + .8vw,1.5rem);white-space:nowrap}\
.mg .mq i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--gold-ink);margin:0 .2em;vertical-align:middle;opacity:.6}\
@keyframes mg-slide{to{transform:translateX(-50%)}}\
.mg .sec{padding-block:clamp(70px,9vw,130px)}\
.mg .hd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;margin-bottom:clamp(36px,5vw,64px)}\
.mg .hd h2{font-size:clamp(2rem,1.2rem + 3.6vw,4.2rem)}\
.mg .hd.left{align-items:flex-start;text-align:left}\
.mg .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,2vw,24px)}\
.mg .ft{background:var(--carbon);border:1px solid var(--line);border-radius:var(--r2);padding:clamp(26px,3vw,40px);position:relative;overflow:hidden;transition:transform .6s var(--ease),border-color .5s}\
.mg .ft::after{content:"";position:absolute;right:-60px;bottom:-60px;width:180px;height:180px;border-radius:50%;background:var(--gold);opacity:.08;transition:transform .8s var(--ease)}\
.mg .ft:hover{transform:translateY(-8px);border-color:rgba(@ACC@,.5)}\
.mg .ft:hover::after{transform:scale(1.7)}\
.mg .ft .n{width:54px;height:54px;border-radius:50%;border:3px solid var(--gold);display:grid;place-items:center;font-family:var(--display);font-weight:800;color:var(--gold);transition:background .5s,color .5s,transform .6s var(--ease)}\
.mg .ft:hover .n{background:var(--gold);color:var(--gold-ink);transform:rotate(360deg)}\
.mg .ft h3{font-family:var(--display);font-weight:800;font-size:1.35rem;margin-top:22px;line-height:1.1}\
.mg .ft p{color:var(--mute);margin-top:12px}\
.mg .ft a{display:inline-flex;gap:8px;align-items:center;margin-top:18px;color:var(--gold);font-weight:700;font-size:.82rem;letter-spacing:.12em;text-transform:uppercase}\
.mg .ft a svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.mg .ft:hover a svg{transform:translateX(6px)}\
.mg .intro{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);align-items:center}\
.mg .ringph{position:relative;width:min(100%,520px);aspect-ratio:1;margin-inline:auto}\
.mg .ringph .ph{position:absolute;inset:6%;border-radius:50%;overflow:hidden;background:var(--carbon)}\
.mg .ringph .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}\
.mg .ringph:hover .ph img{transform:scale(1.08)}\
.mg .ringph .rg{position:absolute;inset:0;border-radius:50%;border:3px solid var(--gold);border-right-color:transparent;border-bottom-color:transparent;animation:mg-spin 14s linear infinite}\
.mg .ringph .rg.b{inset:-3%;border-color:transparent;border-left-color:rgba(@ACC@,.45);animation-duration:22s;animation-direction:reverse}\
.mg .ringph .bd{position:absolute;right:2%;bottom:6%;background:var(--gold);color:var(--gold-ink);border-radius:var(--pill);padding:.6em 1.1em;font-family:var(--display);font-weight:800;font-size:.8rem}\
.mg .intro h2{font-size:clamp(2.2rem,1.3rem + 4vw,4.8rem);margin-top:14px}\
.mg .intro .lead{color:var(--mute);margin-top:18px;max-width:50ch;font-size:1.05em}\
.mg .nums{display:flex;gap:12px;margin-top:28px;flex-wrap:wrap}\
.mg .nums div{border:1px solid var(--line);border-radius:var(--r2);padding:16px 22px;min-width:120px}\
.mg .nums b{display:block;font-family:var(--display);font-weight:800;font-size:clamp(1.8rem,1.3rem + 1.8vw,2.8rem);line-height:1;color:var(--gold)}\
.mg .nums span{display:block;color:var(--mute);font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;margin-top:6px}\
.mg .intro .btn{margin-top:28px}\
.mg .split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(14px,2vw,24px)}\
.mg .half{position:relative;min-height:540px;border-radius:var(--r);overflow:hidden;isolation:isolate;display:flex;align-items:flex-end;padding:clamp(26px,3.4vw,48px);background:var(--carbon)}\
.mg .half img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transform:scale(1.03);transition:transform 1.2s var(--ease)}\
.mg .half:hover img{transform:scale(1.1)}\
.mg .half::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(15,13,11,.05),rgba(15,13,11,.92) 70%)}\
.mg .half h3{font-family:var(--display);font-weight:800;font-size:clamp(1.8rem,1.3rem + 2vw,3rem);line-height:1}\
.mg .half ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:8px;color:var(--cream-2);max-width:44ch}\
.mg .half li{display:flex;gap:10px;align-items:flex-start}\
.mg .half li::before{content:"";flex:none;width:12px;height:12px;border-radius:50%;border:3px solid var(--gold);margin-top:.5em}\
.mg .half .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}\
.mg .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,24px)}\
.mg .tile{position:relative;aspect-ratio:3/4;border-radius:var(--r2);overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;background:var(--carbon)}\
.mg .tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transform:scale(1.03);transition:transform 1.1s var(--ease)}\
.mg .tile::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(15,13,11,0) 35%,rgba(15,13,11,.92))}\
.mg .tile:hover img{transform:scale(1.1)}\
.mg .tile .n{position:absolute;top:16px;left:16px;width:44px;height:44px;border-radius:50%;background:rgba(15,13,11,.55);backdrop-filter:blur(8px);border:1px solid var(--line);display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:.85rem;color:var(--gold)}\
.mg .tile h3{font-family:var(--display);font-weight:800;font-size:clamp(1.3rem,1.1rem + .8vw,1.8rem);line-height:1}\
.mg .tile p{color:var(--mute);font-size:.9rem;margin-top:8px;max-height:0;opacity:0;overflow:hidden;transition:max-height .6s var(--ease),opacity .6s}\
.mg .tile:hover p{max-height:120px;opacity:1}\
.mg .tile a{display:inline-flex;gap:8px;align-items:center;margin-top:12px;color:var(--gold);font-weight:700;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase}\
.mg .progs .ac{display:flex;justify-content:center;margin-top:clamp(28px,4vw,44px)}\
.mg .praj{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:clamp(12px,1.6vw,20px)}\
.mg .pj{background:var(--carbon);border:1px solid var(--line);border-radius:var(--r2);padding:22px 16px 18px;text-align:center;transition:transform .6s var(--ease),border-color .5s}\
.mg .pj:hover{transform:translateY(-8px);border-color:rgba(@ACC@,.5)}\
.mg .pj .rope{position:relative;width:96px;height:96px;margin:0 auto 16px;border-radius:50%;border:14px solid var(--c,#777);box-shadow:inset 0 0 0 2px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.14),0 10px 30px -14px rgba(0,0,0,.8);transition:transform .6s var(--ease)}\
.mg .pj .rope::before{content:"";position:absolute;left:50%;top:-22px;width:10px;height:30px;border-radius:5px;background:var(--c,#777);transform:translateX(-50%) rotate(-18deg);box-shadow:inset 0 0 0 2px rgba(0,0,0,.2)}\
.mg .pj .rope::after{content:"";position:absolute;inset:-18px;border-radius:50%;border:2px dashed rgba(@ACC@,.0);transition:border-color .6s}\
.mg .pj:hover .rope{transform:rotate(-20deg) scale(1.06)}\
.mg .pj:hover .rope::after{border-color:rgba(@ACC@,.45)}\
.mg .pj .num{font-family:var(--display);font-weight:800;font-size:.7rem;letter-spacing:.2em;color:var(--mute)}\
.mg .pj h3{font-family:var(--display);font-weight:800;font-size:1.05rem;margin-top:6px}\
.mg .pj small{display:block;color:var(--mute);font-size:.78rem;margin-top:4px}\
.mg .niv .ac{display:flex;align-items:center;justify-content:center;gap:18px 30px;flex-wrap:wrap;margin-top:clamp(28px,4vw,48px);text-align:center}\
.mg .niv .ac p{color:var(--mute);max-width:46ch}\
.mg .poster{margin:0 var(--m);border-radius:var(--r);overflow:hidden;background:#0b0a09;display:grid;grid-template-columns:1.1fr .9fr;align-items:stretch}\
.mg .poster .ph{position:relative;min-height:520px;background:radial-gradient(ellipse at 50% 60%,rgba(@ACC@,.22),rgba(11,10,9,0) 62%),#0b0a09}\
.mg .poster .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;padding:clamp(16px,2.4vw,36px);filter:drop-shadow(0 30px 50px rgba(0,0,0,.6))}\
.mg .poster .tx{padding:clamp(28px,4vw,64px);display:flex;flex-direction:column;justify-content:center;gap:16px;background:radial-gradient(ellipse at left,rgba(@ACC@,.12),transparent 60%)}\
.mg .poster h2{font-size:clamp(2.2rem,1.3rem + 3.6vw,4.6rem)}\
.mg .poster p{color:var(--mute);max-width:44ch}\
.mg .poster .rec{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}\
.mg .poster .rec div{border:1px solid var(--line);border-radius:var(--r2);padding:14px 20px}\
.mg .poster .rec b{display:block;font-family:var(--display);font-weight:800;font-size:1.6rem;color:var(--gold);line-height:1}\
.mg .poster .rec span{display:block;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--mute);margin-top:4px}\
.mg .coaches{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(18px,3vw,40px)}\
.mg .co{text-align:center;padding:10px}\
.mg .co .ringph{width:min(100%,300px)}\
.mg .co .ringph .rg{animation-duration:20s}\
.mg .co h3{font-family:var(--display);font-weight:800;font-size:1.5rem;margin-top:22px;line-height:1.05}\
.mg .co .k{display:block;margin-top:8px}\
.mg .co p{color:var(--mute);margin:12px auto 0;max-width:34ch;font-size:.95rem}\
.mg .sched{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}\
.mg .day{background:var(--carbon);border:1px solid var(--line);border-radius:var(--r2);padding:18px 14px 20px;min-height:220px}\
.mg .day h4{font-family:var(--display);font-weight:800;font-size:1.1rem;color:var(--gold)}\
.mg .day ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}\
.mg .day li{border-left:3px solid var(--gold);border-radius:3px;padding-left:10px}\
.mg .day li b{display:block;font-weight:700;font-size:.92rem}\
.mg .day li span{display:block;color:var(--mute);font-size:.78rem}\
.mg .day.off{opacity:.55}\
.mg .hor .note{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:22px;color:var(--mute);font-size:.9rem}\
.mg .appsec{margin:0 var(--m);background:var(--cream);color:var(--ink);border-radius:var(--r);padding:clamp(60px,8vw,110px) clamp(24px,5vw,80px);position:relative;overflow:hidden}\
.mg .appsec::before{content:"";position:absolute;width:60vw;height:60vw;max-width:900px;max-height:900px;border-radius:50%;background:radial-gradient(circle,rgba(@ACC@,.35),transparent 62%);right:-20%;top:-30%}\
.mg .appsec .ct{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(36px,6vw,90px);align-items:center;position:relative}\
.mg .appsec .k{color:var(--ember)}\
.mg .appsec h2{font-size:clamp(2.2rem,1.3rem + 4vw,4.8rem);margin-top:12px}\
.mg .appsec .lead{margin-top:18px;max-width:50ch;color:#5d5346;font-size:1.05em}\
.mg .rec2{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}\
.mg .rec2 a{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:rgba(255,255,255,.55);border-radius:18px;transition:background .4s,transform .4s var(--ease)}\
.mg .rec2 a:hover{background:#fff;transform:translateX(4px)}\
.mg .rec2 .ic{flex:none;width:40px;height:40px;border-radius:50%;background:var(--ink);color:var(--gold);display:grid;place-items:center}\
.mg .rec2 .ic svg{width:18px;height:18px}\
.mg .rec2 b{display:block;font-weight:700}\
.mg .rec2 small{display:block;color:#5d5346;font-size:.85rem;line-height:1.4}\
.mg .appsec .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}\
.mg .appsec .btn.ghost{color:var(--ink);box-shadow:inset 0 0 0 2px var(--ink)}\
.mg .appsec .btn.ghost::before{background:var(--ink)}\
.mg .appsec .btn.ghost:hover{color:var(--cream)}\
.mg .phone{position:relative;width:min(100%,330px);margin-inline:auto;border-radius:48px;background:linear-gradient(160deg,#2a2a2a,#0a0a0a 45%,#1a1a1a);padding:12px;box-shadow:0 60px 100px -40px rgba(15,13,11,.7),inset 0 0 0 2px #000;transition:transform .6s var(--ease)}\
.mg .phone .scr{position:relative;border-radius:38px;background:var(--ink);color:var(--cream);overflow:hidden;display:flex;flex-direction:column;aspect-ratio:9/18.6}\
.mg .phone .island{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:34%;height:26px;border-radius:14px;background:#000;z-index:3}\
.mg .phone .status{display:flex;justify-content:space-between;padding:16px 24px 0;font-weight:700;font-size:.76rem}\
.mg .phone .hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}\
.mg .phone .hdr .who{display:flex;align-items:center;gap:10px}\
.mg .phone .hdr .av{width:40px;height:40px;border-radius:50%;border:3px solid var(--gold);display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:.8rem;color:var(--gold)}\
.mg .phone .hdr small{display:block;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}\
.mg .phone .hdr b{display:block;font-family:var(--display);font-weight:800;font-size:1rem;line-height:1}\
.mg .phone .body{padding:14px 14px 0;display:grid;gap:10px;align-content:start}\
.mg .phone .body>*{min-width:0}\
.mg .phone .card2{background:var(--carbon-2);border-radius:20px;padding:14px 16px;overflow:hidden}\
.mg .phone .card2 .k{font-size:.56rem;letter-spacing:.2em;color:var(--mute)}\
.mg .phone .lvl{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;margin-top:6px}\
.mg .phone .lvl b{font-family:var(--display);font-weight:800;font-size:1.1rem;line-height:1}\
.mg .phone .lvl span{font-size:.56rem;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);text-align:right;line-height:1.2;max-width:48%}\
.mg .phone .therm{height:10px;border-radius:5px;background:#2a241b;margin-top:10px;position:relative;overflow:hidden}\
.mg .phone .therm i{position:absolute;inset:0;width:64%;border-radius:5px;background:linear-gradient(90deg,#8c6d3a,var(--gold-2));transform-origin:left;transform:scaleX(0);transition:transform 1.6s var(--ease) .3s}\
.mg .phone.in .therm i{transform:none}\
.mg .phone .acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\
.mg .phone .act{background:var(--carbon-2);border-radius:16px;padding:12px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:.56rem;font-weight:600;color:var(--mute);text-align:center;min-width:0}\
.mg .phone .act svg{width:20px;height:20px;color:var(--gold)}\
.mg .phone .act.on{background:var(--gold);color:var(--gold-ink)}\
.mg .phone .act.on svg{color:var(--gold-ink)}\
.mg .phone .next{display:flex;align-items:center;gap:12px}\
.mg .phone .next .dt{flex:none;width:46px;height:46px;border-radius:50%;background:var(--gold);color:var(--gold-ink);display:grid;place-items:center}\
.mg .phone .next .dt svg{width:22px;height:22px}\
.mg .phone .next b{display:block;font-weight:700;font-size:.9rem}\
.mg .phone .next span{display:block;color:var(--mute);font-size:.72rem}\
.mg .phone .pres .dots{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;margin-top:10px}\
.mg .phone .pres .dots i{display:block;aspect-ratio:1;border-radius:50%;background:#2a241b}\
.mg .phone .pres .dots i.on{background:var(--gold)}\
.mg .phone .nxt{display:flex;justify-content:space-between;gap:8px;font-size:.62rem;color:var(--mute);margin-top:8px;white-space:nowrap}\
.mg .phone .nxt b{color:var(--cream);font-weight:600}\
.mg .phone .tabs{margin-top:auto;display:flex;justify-content:space-around;padding:12px 8px 22px;border-top:1px solid var(--line);background:#0a0908}\
.mg .phone .tabs span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.54rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}\
.mg .phone .tabs span.on{color:var(--gold)}\
.mg .phone .tabs svg{width:18px;height:18px}\
.mg .contact{margin:0 var(--m);border-radius:var(--r);overflow:hidden;position:relative;min-height:620px;background:#1a1712;isolation:isolate}\
.mg .contact iframe,.mg .contact svg.grid{position:absolute;inset:-6%;width:112%;height:112%;border:0;filter:grayscale(1) invert(.93) contrast(.95) brightness(.75) sepia(.35);pointer-events:none;z-index:-1}\
.mg .contact::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 140px rgba(15,13,11,.95);pointer-events:none;z-index:0}\
.mg .contact .card{position:relative;z-index:2;margin:clamp(24px,4vw,60px);width:min(560px,calc(100% - 48px));background:var(--carbon);border:1px solid var(--line);border-radius:var(--r2);padding:clamp(26px,3.2vw,44px);box-shadow:0 40px 90px -40px rgba(0,0,0,.8)}\
.mg .contact h2{font-size:clamp(1.9rem,1.3rem + 2.2vw,3rem)}\
.mg .contact .ds{color:var(--mute);margin-top:14px;max-width:40ch}\
.mg .cc{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:26px}\
.mg .cc h4{display:flex;align-items:center;gap:8px;font-weight:700;font-size:.78rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}\
.mg .cc h4 svg{width:16px;height:16px}\
.mg .cc p,.mg .cc a{display:block;color:var(--cream-2);margin-top:8px;font-size:.92rem;line-height:1.5}\
.mg .cc a:hover{color:var(--gold)}\
.mg .contact .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}\
.mg .contact .openmap{position:absolute;right:clamp(18px,3vw,40px);bottom:clamp(18px,3vw,40px);z-index:2}\
.mg .foot{padding:clamp(50px,6vw,80px) var(--g) 28px}\
.mg .foot .ct{display:grid;grid-template-columns:1fr auto;gap:26px 40px;align-items:start}\
.mg .foot .sys{display:flex;flex-direction:column;align-items:flex-end;gap:12px}\
.mg .foot .sys .k{color:var(--mute);font-size:.68rem}\
.mg .foot .sys nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}\
.mg .foot .sys a{font-size:.88rem;padding:.4em .9em;border-radius:var(--pill);border:1px solid var(--line);transition:background .4s,border-color .4s}\
.mg .foot .sys a:hover{background:var(--gold);color:var(--gold-ink);border-color:var(--gold)}\
.mg .foot .cp{grid-column:1/-1;border-top:1px solid var(--line);padding-top:18px;font-size:.88rem;color:var(--mute)}\
.mg .foot .cp b{color:var(--cream)}\
.mg.js .rv{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease)}\
.mg.js .rv.in{opacity:1;transform:none}\
.mg .st>*{transition-delay:calc(var(--i,0)*90ms)}\
@media (prefers-reduced-motion:reduce){.mg *,.mg *::before,.mg *::after{animation:none!important;transition:none!important}.mg.js .rv{opacity:1;transform:none}.mg .hero h1 .l span{transform:none}.mg .hero .side,.mg .hero .chip{opacity:1}.mg .phone .therm i{transform:none}}\
@media (max-width:1280px){.mg .nl{display:none}.mg .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:clamp(22px,3.4vw,52px);flex-direction:column;align-items:flex-start;gap:8px;background:var(--carbon);padding:18px;border:1px solid var(--line);border-radius:var(--r2)}.mg .burger{display:inline-flex}}\
@media (max-width:1100px){.mg .hero .ct{grid-template-columns:1fr}.mg .hero .chips,.mg .hero .tag{display:none}.mg .tiles{grid-template-columns:1fr 1fr}.mg .sched{grid-template-columns:repeat(4,1fr)}.mg .appsec .ct,.mg .intro,.mg .poster{grid-template-columns:1fr}.mg .poster .ph{min-height:0;aspect-ratio:1.1}}\
@media (max-width:760px){.mg .hero .media img{object-position:68% 30%}.mg .hero .side .k{font-size:.66rem;letter-spacing:.14em;align-items:flex-start}.mg .feats,.mg .split,.mg .coaches,.mg .tiles{grid-template-columns:1fr}.mg .sched{grid-template-columns:repeat(2,1fr)}.mg .rec2{grid-template-columns:1fr}.mg .foot .ct{grid-template-columns:1fr}.mg .foot .sys{align-items:flex-start}.mg .foot .sys nav{justify-content:flex-start}.mg .half{min-height:440px}.mg .mq{transform:translateY(-40%)}.mg .contact .card{margin:16px;width:calc(100% - 32px)}.mg .contact .openmap{display:none}.mg .cc{grid-template-columns:1fr}}\
@media (max-width:480px){.mg .sched{grid-template-columns:1fr}.mg .day{min-height:0}.mg .praj{grid-template-columns:1fr 1fr}}\
';

function css(t){
  return '\
.mg,.mg *,.mg *::before,.mg *::after{box-sizing:border-box}\
.mg{--ink:#0f0d0b;--carbon:#17140f;--carbon-2:#211c15;--cream:#efe6d6;--cream-2:#e4d8c3;--mute:#a8998a;--white:#fff;--line:rgba(239,230,214,.12);\
 --gold:'+t.acc+';--gold-2:'+t.acc2+';--gold-ink:'+t.accInk+';--ember:'+t.ember+';\
 --display:"Unbounded",system-ui,sans-serif;--text:"Manrope",system-ui,sans-serif;--ease:cubic-bezier(.16,1,.3,1);--g:clamp(20px,5vw,96px);--m:clamp(12px,2vw,28px);--r:clamp(28px,4vw,56px);--r2:28px;--pill:999px;\
 position:relative;background:var(--ink);color:var(--cream);font-family:var(--text);font-size:clamp(1rem,.95rem + .3vw,1.125rem);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:clip;display:flow-root}\
.mg h1,.mg h2,.mg h3,.mg h4,.mg p{margin:0}.mg a{color:inherit;text-decoration:none}.mg img{display:block;max-width:100%}.mg :focus-visible{outline:3px solid var(--gold);outline-offset:3px;border-radius:6px}\
' + CSS_BASE.split('@ACC@').join(t.accTri) + '\
.mg .ringph .ph .ini{display:grid;place-items:center;height:100%;font-family:var(--display);font-weight:800;font-size:clamp(3rem,2rem + 4vw,7rem);color:var(--gold);background:var(--carbon-2)}\
.mg .co .ringph .ph .ini{font-size:clamp(2.4rem,2rem + 2vw,4rem)}\
.mg .hero.noimg .scrim{background:radial-gradient(ellipse at 70% 20%,'+t.accRgb+'.28),transparent 55%),linear-gradient(180deg,var(--carbon-2),var(--ink))}\
.mg .tile.noimg{background:linear-gradient(160deg,var(--carbon-2),var(--carbon))}\
.mg .appsec .ac .btn img{width:24px;height:24px;border-radius:6px}\
.mg .phone .hdr .av{overflow:hidden}.mg .phone .hdr .av img{width:100%;height:100%;object-fit:cover}\
.mg .ft h3,.mg .tile h3,.mg .pj h3,.mg .co h3{overflow-wrap:anywhere}\
.mg .contact .grid{position:absolute;inset:0;width:100%;height:100%}\
.mg .poster .ph .ini{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:clamp(4rem,3rem + 6vw,10rem);color:var(--gold);opacity:.35}\
.mg .hero h1 .l em{font-style:normal;color:var(--gold)}\
.mg .ringph img,.mg .tile img,.mg .half img,.mg .poster img,.mg .hero .media img{color:transparent;font-size:0}';
}

/* ========================================================================== */
/*  Cor e utilidades                                                           */
/* ========================================================================== */
function hex6(v){ var s = String(v || '').trim(); if(/^#[0-9a-f]{3}$/i.test(s)) s = '#'+s[1]+s[1]+s[2]+s[2]+s[3]+s[3]; return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null; }
function rgb(hex){ var c = String(hex).replace('#',''); return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]; }
function lum(hex){ var c = rgb(hex); return (0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]) / 255; }
function readable(hex){ return lum(hex) > 0.55 ? '#17140f' : '#efe6d6'; }
function lighten(hex, amt){
  var c = String(hex).replace('#',''), out = '#';
  for(var i = 0; i < 6; i += 2){ var v = parseInt(c.slice(i, i+2), 16); v = Math.round(v + (255 - v) * amt); out += ('0' + v.toString(16)).slice(-2); }
  return out;
}
function corFaixa(v){ var s = String(v || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : ''; }
function initials(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase(); }
function plural(n, a, b){ return n + ' ' + (n === 1 ? a : b); }
function pluralPeca(p){ var s = String(p || 'graduação').trim(); if(/ão$/i.test(s)) return s.replace(/ão$/i, 'ões'); if(/l$/i.test(s)) return s.replace(/l$/i, 'is'); if(/[sz]$/i.test(s)) return s; return s + 's'; }
function numInt(v){ var n = parseInt(String(v || '').replace(/\D/g, ''), 10); return isFinite(n) && n >= 0 ? n : null; }

/* ========================================================================== */
/*  Ícones                                                                     */
/* ========================================================================== */
function ic(d, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w || 2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>'; }
var I = {
  arrow: ic('<path d="M4 12h15M13 6l6 6-6 6"/>', 2.6),
  pin:   ic('<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
  clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  share: ic('<path d="M4 20l6-6M14 4l6 6M10 14l4-4"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="7" r="3"/>'),
  zap:   ic('<path d="M4 20l1.3-3.9A8 8 0 1 1 8.2 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z"/>'),
  gauge: ic('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.5-5.5"/>'),
  card:  ic('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>'),
  qr:    ic('<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h3v3M20 14v6h-3"/>'),
  cal:   ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  award: ic('<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/>'),
  net:   ic('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M10.5 13l-4 3M13.5 13l4 3"/>'),
  home:  ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  user:  ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')
};

// Mapa decorativo (sem geo e sem endereço): malha quente.
function mapaGrade(){
  var out = '<svg class="grid" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1200" height="800" fill="#1a1712"/>';
  var i; for(i = 0; i < 1200; i += 60) out += '<line x1="'+i+'" y1="0" x2="'+(i+140)+'" y2="800" stroke="#241f18" stroke-width="'+(i%180===0?10:4)+'"/>';
  for(i = -200; i < 900; i += 70) out += '<line x1="0" y1="'+i+'" x2="1200" y2="'+(i+120)+'" stroke="#241f18" stroke-width="'+(i%210===0?12:5)+'"/>';
  return out + '<path d="M0 520 C 300 470, 500 640, 820 560 S 1150 420, 1200 460" fill="none" stroke="#2c261d" stroke-width="26"/></svg>';
}

/* ========================================================================== */
/*  Render                                                                     */
/* ========================================================================== */
export function render(s, h){
  var esc = h.esc, url = h.url;
  var modBase = h.modalidadeBase || 'arena';
  var modReal = String(h.modalidade || modBase || '').toLowerCase();
  function tab(T){ return T[modReal] || T[modBase] || T.arena; }
  var V = (h.VOCAB && (h.VOCAB[modReal] || h.VOCAB[modBase] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && (h.LIDER[modReal] || h.LIDER[modBase])) || 'Professor';
  var c = s.cores || {};
  var t = { acc: hex6(c.botao) || hex6(c.destaque) || '#c8912e' };
  if(lum(t.acc) < 0.12) t.acc = lighten(t.acc, .45); // acento quase preto não funciona sobre o fundo escuro
  t.acc2 = lighten(t.acc, .22); t.accInk = readable(t.acc); t.accTri = rgb(t.acc).join(','); t.accRgb = 'rgba('+t.accTri+',';
  var princ = hex6(c.principal);
  t.ember = (princ && lum(princ) < 0.4 && princ !== t.acc) ? princ : '#a8261f'; // etiqueta sobre o cartão creme: precisa ser escura

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('mg-fonts')){
    var l = document.createElement('link'); l.id = 'mg-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Unbounded:wght@700;800&family=Manrope:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('mg-css');
  if(!st){ st = document.createElement('style'); st.id = 'mg-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  // Conteúdo do painel por cima dos padrões (mesmos helpers dos outros templates).
  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function linhas(txt){ return String(txt || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, 6); }
  // Título com *palavra* em destaque → <em>. Tudo escapado por partes.
  function tit(txt){ var p = String(txt || '').split('*'); return p.map(function(x, i){ return i % 2 ? '<em>'+esc(x)+'</em>' : esc(x); }).join(''); }
  function semAst(txt){ return String(txt || '').split('*').join(''); }
  // Última palavra em destaque (hero, linha 2).
  function ultimaEm(txt){ var w = String(txt || '').trim().split(/\s+/); if(w.length < 2) return '<em>'+esc(txt)+'</em>'; var u = w.pop(); var m = u.match(/^(.*?)([.!?,…]*)$/); return esc(w.join(' '))+' <em>'+esc(m[1])+'</em>'+esc(m[2]); }

  var R = function(rota){ return '/'+encodeURIComponent(s.slug)+'/'+rota; };
  var ins = R('inscricao'), login = R('login');
  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var logo = url(s.logo), ini = initials(s.nomeCurto);
  var peca = String(s.peca || 'graduação');
  var pecaPl = pluralPeca(peca);
  var pecaCap = peca.charAt(0).toUpperCase()+peca.slice(1);
  var proxPeca = (/a$/i.test(peca) ? 'à próxima ' : 'ao próximo ') + peca;

  var escada = [];
  if(Array.isArray(s.escada) && s.escada.length) s.escada.forEach(function(b){ if(b && b.nome) escada.push({ nome:String(b.nome), cor:corFaixa(b.cor) }); });
  else if(Array.isArray(s.graduacoes)) s.graduacoes.forEach(function(n){ if(typeof n === 'string' && n.trim()) escada.push({ nome:n.trim(), cor:'' }); });
  escada = escada.slice(0, 12);
  var nucs = [];
  if(Array.isArray(s.nucleosInfo) && s.nucleosInfo.length) s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucs.push({ nome:String(n.nome), sede:n.sede === true, cidade:String(n.cidade || ''), uf:String(n.uf || '') }); });
  else if(Array.isArray(s.nucleos)) s.nucleos.forEach(function(n){ if(typeof n === 'string' && n.trim()) nucs.push({ nome:n.trim(), sede:false, cidade:'', uf:'' }); });

  var zap = cx('contato', 'whatsapp', '').replace(/\D/g, ''); if(!/^\d{10,13}$/.test(zap)) zap = '';
  var zapHref = zap ? 'https://wa.me/'+(zap.length <= 11 ? '55' : '')+zap+'?text='+encodeURIComponent(cx('contato', 'msgWhatsapp', 'Olá! Quero agendar uma aula experimental na '+s.nomeCurto+'.')) : '';
  var zapFmt = zap ? (zap.length === 11 ? '('+zap.slice(0,2)+') '+zap.slice(2,7)+'-'+zap.slice(7) : zap) : '';

  var marca = '<a class="logo" href="#top"><span class="mk">'+(logo ? '<img src="'+esc(logo)+'" alt="'+esc('Logo '+s.nomeCurto)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : esc(ini))+'</span><span>'+esc(s.nomeCurto)+'<small>'+esc(V.nomeMod)+'</small></span></a>';

  // --- horários (só do painel) ---
  var horItens = lista('horarios', 'itens', 30).filter(function(x){ return cs(x, 'aula'); });
  var temHor = horItens.length > 0;
  // --- atleta em destaque (só do painel: nome + foto) ---
  var atlNome = cx('atleta', 'nome', ''), atlFoto = url(cx('atleta', 'foto', ''));
  var temAtleta = !!(atlNome && atlFoto);

  // --- NAV + HERO ---
  var nav = '<nav class="nav">'+marca
    + '<div class="nl" id="mg-nl"><a href="#mg-programas">Programas</a>'+(escada.length ? '<a href="#mg-niveis">Níveis</a>' : '')+'<a href="#mg-equipe">Equipe</a>'+(temHor ? '<a href="#mg-horarios">Horários</a>' : '')+'<a href="#mg-app">App</a><a href="#mg-contato">Contato</a>'
    + '<a class="btn ghost" href="'+esc(login)+'">Área do aluno</a><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></div>'
    + '<button class="burger" id="mg-burger" type="button" aria-expanded="false" aria-controls="mg-nl">Menu</button></nav>';
  var hp = tab(HERO);
  var h1a = cx('hero', 'linha1', hp[0]), h1b = cx('hero', 'linha2', hp[1]);
  var heroFoto = url(cx('hero', 'foto', '')) || fachada[0] || equipeF[0] || treino[0] || '';
  var nomeW = String(s.nome || s.nomeCurto).trim().split(/\s+/);
  var tagHTML = nomeW.length > 1 ? esc(nomeW[0])+'<br>'+esc(nomeW.slice(1).join(' ')) : esc(s.nomeCurto)+'<br>'+esc(V.nomeMod);
  var chips = [];
  if(escada.length) chips.push('<i>'+escada.length+'</i>'+esc(pecaPl)+' na escada');
  if(nucs.length) chips.push('<i>'+nucs.length+'</i>'+esc(plural(nucs.length, 'núcleo', 'núcleos'))+(s.cidade ? ' em '+esc(s.cidade) : ''));
  chips.push('<i>✓</i>inscrição pelo AtletaPay');
  var hero = '<header class="hero'+(heroFoto ? '' : ' noimg')+'" id="top">'+nav
    + (heroFoto ? '<div class="media"><img src="'+esc(heroFoto)+'" alt="'+esc(s.nome)+'" fetchpriority="high"></div>' : '')
    + '<div class="scrim" aria-hidden="true"></div>'
    + '<div class="tag" aria-hidden="true">'+tagHTML+'</div>'
    + '<div class="chips" aria-hidden="true">'+chips.map(function(ch, i){ return '<span class="chip" style="animation-delay:'+(.8 + i*.2)+'s">'+ch+'</span>'; }).join('')+'</div>'
    + '<div class="ct"><h1 class="d"><span class="l"><span style="animation-delay:.05s">'+esc(h1a)+'</span></span><span class="l"><span style="animation-delay:.2s">'+ultimaEm(h1b)+'</span></span></h1>'
    + '<div class="side"><span class="k ring">'+esc(s.nome)+' · '+esc(V.nomeMod)+'</span><p style="margin-top:12px">'+esc(cx('hero', 'texto', tab(SIDE)))+'</p>'
    + '<div class="cta"><a class="btn" href="'+esc(ins)+'" data-magnet>'+esc(cx('hero', 'botao', 'Comece hoje'))+' '+I.arrow+'</a><a class="btn ghost" href="'+esc(login)+'">Área do aluno</a></div></div></div></header>';

  // --- LETREIRO (pílula) ---
  var letreiro = tab(LETREIRO);
  var pal = cx('letreiro', 'palavras', ''); if(pal){ var pl = pal.split(',').map(function(p){ return p.trim(); }).filter(Boolean).slice(0, 8); if(pl.length) letreiro = pl; }
  var faixa = letreiro.map(esc).join(' <i></i> ') + ' <i></i> ' + esc(s.nomeCurto) + ' <i></i> ';
  var mq = '<div class="mq" aria-hidden="true"><div class="tr"><span>'+faixa+'</span><span>'+faixa+'</span></div></div>';

  // --- DESTAQUES ---
  var dItens = lista('destaques', 'itens', 3).filter(function(x){ return cs(x, 'titulo'); });
  var dlist = dItens.length ? dItens.map(function(x){ return [cs(x, 'titulo'), cs(x, 'texto')]; }) : tab(DESTAQUES);
  var dLinks = [['#mg-equipe', 'Conheça a equipe'], [escada.length ? '#mg-niveis' : '#mg-programas', escada.length ? 'Ver os níveis' : 'Ver programas'], ['#mg-programas', 'Ver programas']];
  var destaques = '<section class="w" id="mg-destaques" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct feats st">'+dlist.map(function(d, i){
    return '<article class="ft rv" style="--i:'+i+'"><span class="n">0'+(i+1)+'</span><h3>'+esc(d[0])+'</h3>'+(d[1] ? '<p>'+esc(d[1])+'</p>' : '')+'<a href="'+dLinks[i][0]+'">'+dLinks[i][1]+' '+I.arrow+'</a></article>';
  }).join('')+'</div></section>';

  // --- INTRO (foto em anel) + contadores reais ---
  var ip = tab(INTRO);
  var introFoto = url(cx('intro', 'foto', '')) || treino[0] || fachada[0] || '';
  var nEq = Array.isArray(s.equipe) ? s.equipe.length : 0;
  var nums = [];
  if(escada.length) nums.push([escada.length, pecaPl]);
  if(nucs.length) nums.push([nucs.length, nucs.length === 1 ? 'núcleo' : 'núcleos']);
  if(nEq > 1) nums.push([nEq, 'na equipe']);
  var intro = '<section class="w" id="mg-clube" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct intro">'
    + '<div class="ringph rv"><span class="rg"></span><span class="rg b"></span><div class="ph">'+(introFoto ? '<img src="'+esc(introFoto)+'" alt="'+esc(s.nome)+'" loading="lazy">' : '<span class="ini">'+esc(ini)+'</span>')+'</div><span class="bd">O clube</span></div>'
    + '<div class="rv"><span class="k ring">'+esc(cx('intro', 'selo', ip[0]))+'</span><h2 class="d">'+tit(cx('intro', 'titulo', ip[1]))+'</h2><p class="lead">'+esc(cx('intro', 'texto', ip[2]))+'</p>'
    + (nums.length ? '<div class="nums">'+nums.map(function(n){ return '<div><b data-count="'+n[0]+'">0</b><span>'+esc(n[1])+'</span></div>'; }).join('')+'</div>' : '')
    + '<a class="btn" href="#mg-contato" data-magnet>'+esc(cx('intro', 'botao', 'Sobre o clube'))+' '+I.arrow+'</a></div></div></section>';

  // --- SPLIT (dois caminhos) ---
  var sp = tab(SPLIT);
  var spItens = lista('split', 'itens', 2).filter(function(x){ return cs(x, 'titulo'); });
  var spl = spItens.length ? spItens.map(function(x, i){ return { selo:cs(x, 'selo'), titulo:cs(x, 'titulo'), topicos:linhas(cs(x, 'topicos')), botao:cs(x, 'botao'), foto:url(cs(x, 'foto')) || treino[i+1] || '' }; })
                            : sp.itens.map(function(x, i){ return { selo:x.selo, titulo:x.titulo, topicos:x.topicos, botao:x.botao, foto:treino[i+1] || '' }; });
  var split = '<section class="w" id="mg-caminhos" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct"><div class="hd rv"><span class="k ring">Dois caminhos</span><h2 class="d">'+tit(cx('split', 'titulo', sp.titulo))+'</h2></div><div class="split st">'
    + spl.map(function(x, i){
      return '<article class="half rv" style="--i:'+i+'">'+(x.foto ? '<img src="'+esc(x.foto)+'" alt="" loading="lazy">' : '')+'<div>'+(x.selo ? '<span class="k">'+esc(x.selo)+'</span>' : '')+'<h3>'+esc(x.titulo)+'</h3>'
        + (x.topicos.length ? '<ul>'+x.topicos.map(function(tp){ return '<li>'+esc(tp)+'</li>'; }).join('')+'</ul>' : '')
        + '<div class="ac"><a class="btn'+(i ? ' ghost' : '')+'" href="'+esc(ins)+'">'+esc(x.botao || 'Começar')+(i ? '' : ' '+I.arrow)+'</a></div></div></article>';
    }).join('')+'</div></div></section>';

  // --- PROGRAMAS (4 azulejos) ---
  var pp = tab(PROGS);
  var pItens = lista('programas', 'itens', 4).filter(function(x){ return cs(x, 'titulo'); });
  var plist = pItens.length ? pItens.map(function(x, i){ return [cs(x, 'titulo'), cs(x, 'texto'), url(cs(x, 'foto')) || treino[i+3] || treino[i] || '']; })
                            : pp.itens.map(function(x, i){ return [x[0], x[1], treino[i+3] || treino[i] || '']; });
  var programas = '<section class="w progs" id="mg-programas" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct"><div class="hd rv"><span class="k ring">Habilidades para a vida toda</span><h2 class="d">'+tit(cx('programas', 'titulo', pp.titulo))+'</h2></div><div class="tiles st">'
    + plist.map(function(x, i){
      return '<article class="tile rv'+(x[2] ? '' : ' noimg')+'" style="--i:'+i+'">'+(x[2] ? '<img src="'+esc(x[2])+'" alt="" loading="lazy">' : '')+'<span class="n">0'+(i+1)+'</span><h3>'+esc(x[0])+'</h3>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'<a href="'+esc(ins)+'">Inscrever-se →</a></article>';
    }).join('')+'</div><div class="ac"><a class="btn" href="'+esc(ins)+'" data-magnet>Comece hoje '+I.arrow+'</a></div></div></section>';

  // --- NÍVEIS (escada real como prajieds) ---
  var niveis = '';
  if(escada.length){
    var nvTx = lista('niveis', 'itens', 12);
    var nTot = escada.length;
    niveis = '<section class="w niv" id="mg-niveis" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct"><div class="hd rv"><span class="k ring">Graduação real, direto do app</span><h2 class="d">'+tit(cx('niveis', 'titulo', 'A escada de *'+pecaPl+'* da '+s.nomeCurto))+'</h2></div>'
      + '<div class="praj st">'+escada.map(function(b, j){
        var tx = nvTx[j] || {};
        var cor = b.cor || lighten('#546e7a', j / Math.max(1, nTot - 1) * .5);
        return '<div class="pj rv" style="--i:'+j+';--c:'+esc(cor)+'"><div class="rope"></div><span class="num">'+(j < 9 ? '0' : '')+(j+1)+'</span><h3>'+esc(b.nome)+'</h3><small>'+esc(cs(tx, 'selo') || (pecaCap+' · etapa '+(j+1)))+'</small></div>';
      }).join('')+'</div>'
      + '<div class="ac rv"><p>'+esc(cx('niveis', 'texto', 'Cada aluno acompanha no app o termômetro de prontidão rumo '+proxPeca+', com as avaliações do '+tituloLider+'.'))+'</p><a class="btn" href="'+esc(login)+'" data-magnet>'+esc(cx('niveis', 'botao', 'Ver minha graduação'))+' '+I.arrow+'</a></div></div></section>';
  }

  // --- ATLETA EM DESTAQUE (pôster; só do painel) ---
  var poster = '';
  if(temAtleta){
    var rec = [[numInt(cx('atleta', 'vitorias', '')), 'vitórias'], [numInt(cx('atleta', 'derrotas', '')), 'derrotas'], [numInt(cx('atleta', 'empates', '')), 'empates']].filter(function(r){ return r[0] !== null; });
    poster = '<section class="poster rv" id="mg-atleta"><div class="ph"><img src="'+esc(atlFoto)+'" alt="'+esc(atlNome+', atleta da '+s.nomeCurto)+'" loading="lazy"></div>'
      + '<div class="tx"><span class="k ring">Atleta em destaque</span><h2 class="d">'+tit(cx('atleta', 'titulo', 'Treine *duro*, lute fácil.'))+'</h2><p>'+esc(cx('atleta', 'texto', atlNome+' representa a '+s.nome+' nos eventos. O mesmo '+V.local+', a mesma equipe, o mesmo app que acompanha a sua evolução.'))+'</p>'
      + (rec.length ? '<div class="rec">'+rec.map(function(r){ return '<div><b>'+r[0]+'</b><span>'+r[1]+'</span></div>'; }).join('')+'</div>' : '')
      + '<a class="btn" href="'+esc(ins)+'" style="align-self:flex-start;margin-top:8px" data-magnet>'+esc(cx('atleta', 'botao', 'Treinar com a equipe'))+' '+I.arrow+'</a></div></section>';
  }

  // --- EQUIPE (anéis) --- painel → cadastro → líder.
  var mestres = [];
  lista('equipe', 'itens', 6).forEach(function(m){ if(cs(m, 'nome')) mestres.push({ nome:cs(m, 'nome'), grad:cs(m, 'graduacao'), bio:cs(m, 'bio'), foto:url(cs(m, 'foto')) }); });
  if(!mestres.length && Array.isArray(s.equipe) && s.equipe.length) s.equipe.forEach(function(m){ if(m && m.nome) mestres.push({ nome:m.nome, grad:m.graduacao || '', bio:m.bio || '', foto:url(m.foto) }); });
  if(!mestres.length) mestres.push({ nome:s.lider, grad:(s.responsavel && s.responsavel.graduacao) || tituloLider, bio:'', foto:url(s.fotoLider) });
  var equipe = '<section class="sec w" id="mg-equipe"><div class="ct"><div class="hd rv"><span class="k ring">Quem conduz o '+esc(V.local)+'</span><h2 class="d">'+tit(cx('equipe', 'titulo', 'Resultado vem de *quem* treina você'))+'</h2></div><div class="coaches st" style="--n:'+Math.min(mestres.length, 3)+'">'
    + mestres.slice(0, 6).map(function(m, i){
      return '<article class="co rv" style="--i:'+i+'"><div class="ringph"><span class="rg"></span><div class="ph">'+(m.foto ? '<img src="'+esc(m.foto)+'" alt="'+esc(m.nome)+'" loading="lazy">' : '<span class="ini">'+esc(initials(m.nome))+'</span>')+'</div></div>'
        + '<h3>'+esc(m.nome)+'</h3><span class="k">'+esc(m.grad || tituloLider)+'</span>'
        + '<p>'+esc(m.bio || ('À frente dos treinos de '+V.nomeMod+' na '+s.nomeCurto+', com técnica, respeito e atenção a cada aluno.'))+'</p></article>';
    }).join('')+'</div></div></section>';

  // --- HORÁRIOS (só do painel) ---
  var horarios = '';
  if(temHor){
    var porDia = {}; DIAS.forEach(function(d){ porDia[d[0]] = []; });
    horItens.forEach(function(x){ var d = String(cs(x, 'dia') || '').toLowerCase().replace(/[áàâã]/g, 'a').slice(0, 3); if(porDia[d]) porDia[d].push(x); });
    horarios = '<section class="w hor" id="mg-horarios" style="padding-bottom:clamp(70px,9vw,130px)"><div class="ct"><div class="hd rv"><span class="k ring">Sessões de treino</span><h2 class="d">'+tit(cx('horarios', 'titulo', 'Semana no *'+V.local+'*'))+'</h2></div><div class="sched st">'
      + DIAS.map(function(d, i){
        var its = porDia[d[0]];
        return '<div class="day'+(its.length ? '' : ' off')+' rv" style="--i:'+i+'"><h4>'+d[1].slice(0, 3)+'</h4><ul>'+(its.length ? its.map(function(x){ return '<li><b>'+esc(cs(x, 'aula'))+'</b><span>'+esc([cs(x, 'horario'), cs(x, 'local')].filter(Boolean).join(' · '))+'</span></li>'; }).join('') : '<li><b>Descanso</b><span>Sem aula</span></li>')+'</ul></div>';
      }).join('')+'</div>'
      + '<div class="note rv"><span>'+esc(cx('horarios', 'nota', 'Horários sujeitos a alteração — o app avisa. Check-in de presença em um toque.'))+'</span><a class="btn ghost" href="'+esc(zapHref || ins)+'"'+(zapHref ? ' target="_blank" rel="noopener noreferrer"' : '')+'>Agendar aula experimental</a></div></div></section>';
  }

  // --- APP E REDE (cartão creme) ---
  var rec2 = [
    [I.gauge, 'Termômetro de prontidão', 'Avaliações do '+tituloLider+' e o caminho '+proxPeca, login],
    [I.card,  'Carteirinha digital', 'Identificação do atleta com '+peca+' e núcleo', R('carteirinha')],
    [I.qr,    'Check-in no treino', 'Presença registrada em um toque', R('checkin')],
    [I.cal,   'Campeonatos e agenda', 'Eventos da equipe e inscrições', R('campeonatos')],
    [I.award, 'Certificados', 'Graduações e participações registradas', R('certificados')],
    [I.net,   'Rede da equipe', 'Avisos, stories e mensagens só para quem treina', R('rede')]
  ].map(function(r){ return '<li><a href="'+esc(r[3])+'"><span class="ic">'+r[0]+'</span><span><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></span></a></li>'; }).join('');
  var nivelAtual = escada.length > 1 ? escada[1].nome : (escada[0] ? escada[0].nome : 'Nível atual');
  var phone = '<div class="phone rv" aria-hidden="true"><div class="scr"><div class="island"></div>'
    + '<div class="status"><span>19:24</span><span>●●● ▮</span></div>'
    + '<div class="hdr"><div class="who"><span class="av">'+(logo ? '<img src="'+esc(logo)+'" alt="">' : esc(ini))+'</span><div><small>Boa noite, atleta</small><b>'+esc(s.nomeCurto)+'</b></div></div></div>'
    + '<div class="body"><div class="card2"><span class="k">Termômetro de prontidão</span><div class="lvl"><b>'+esc(nivelAtual)+'</b><span>rumo '+esc(proxPeca)+'</span></div><div class="therm"><i></i></div></div>'
    + '<div class="acts"><span class="act on">'+I.qr+'Check-in</span><span class="act">'+I.card+'Carteirinha</span><span class="act">'+I.cal+'Agenda</span><span class="act">'+I.net+'Rede</span></div>'
    + '<div class="card2 next"><div class="dt">'+I.cal+'</div><div><b>Próximo treino</b><span>'+esc(temHor ? 'Veja o quadro da semana' : 'Horários na área do aluno')+'</span></div></div>'
    + '<div class="card2 pres"><span class="k">Presenças do mês</span><div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i></div><div class="nxt"><span>check-in em um toque</span><span>'+esc(s.nomeCurto)+'</span></div></div></div>'
    + '<div class="tabs"><span class="on">'+I.home+'Início</span><span>'+I.gauge+esc(pecaCap)+'</span><span>'+I.cal+'Agenda</span><span>'+I.user+'Perfil</span></div></div></div>';
  var appSec = '<section class="appsec" id="mg-app"><div class="ct"><div class="rv"><span class="k ring">'+esc(cx('app', 'selo', 'App AtletaPay · '+s.nomeCurto))+'</span><h2 class="d">'+esc(semAst(cx('app', 'titulo', 'O clube inteiro no bolso')))+'</h2>'
    + '<p class="lead">'+esc(cx('app', 'texto', 'Sem loja de aplicativos: instala direto deste site. '+pecaCap+', carteirinha, check-in e agenda no mesmo lugar.'))+'</p>'
    + '<ul class="rec2">'+rec2+'</ul><div class="ac"><a class="btn dark" href="'+esc(R('instalar'))+'" data-magnet><img src="assets/app-icon-192.png" alt="" width="24" height="24">Instalar o app</a><a class="btn ghost" href="'+esc(R('instalar-rede'))+'"><img src="assets/rede-icon-192.png" alt="" width="24" height="24">Instalar a Rede</a></div></div>'+phone+'</div></section>';

  // --- CONTATO + MAPA --- geo → OpenStreetMap; só endereço → Google por endereço; nada → malha.
  var geo = s.geo && isFinite(Number(s.geo.lat)) && isFinite(Number(s.geo.lng)) ? { lat:Number(s.geo.lat), lng:Number(s.geo.lng) } : null;
  var enderecoFull = s.endereco ? s.endereco+(s.cidade ? ', '+s.cidade : '')+(s.uf ? ' - '+s.uf : '') : '';
  var mapa = geo
    ? '<iframe title="Mapa" src="https://www.openstreetmap.org/export/embed.html?bbox='+esc((geo.lng-0.013).toFixed(4))+'%2C'+esc((geo.lat-0.01).toFixed(4))+'%2C'+esc((geo.lng+0.013).toFixed(4))+'%2C'+esc((geo.lat+0.01).toFixed(4))+'&amp;layer=mapnik&amp;marker='+esc(geo.lat.toFixed(5))+'%2C'+esc(geo.lng.toFixed(5))+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    : (enderecoFull ? '<iframe title="Mapa" src="https://www.google.com/maps?q='+esc(encodeURIComponent(enderecoFull))+'&amp;z=16&amp;hl=pt-BR&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' : mapaGrade());
  var mapsQ = geo ? geo.lat.toFixed(6)+','+geo.lng.toFixed(6) : enderecoFull;
  var mapsHref = mapsQ ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mapsQ) : '';
  var contato = '<section class="contact" id="mg-contato" style="margin-top:clamp(70px,9vw,130px)">'+mapa
    + '<div class="card rv"><span class="k ring">'+esc(cx('contato', 'selo', 'Estamos aqui para o seu próximo round'))+'</span><h2 class="d" style="margin-top:12px">'+tit(cx('contato', 'titulo', 'Fale com *a gente*'))+'</h2>'
    + '<p class="ds">'+esc(cx('contato', 'texto', 'Venha conhecer o '+V.local+'. A inscrição é feita pelo AtletaPay, rápida e segura'+(zap ? '; a primeira aula a gente marca pelo WhatsApp.' : '.')))+'</p>'
    + '<div class="cc"><div><h4>'+I.pin+'Local</h4><p>'+(s.endereco ? esc(s.endereco)+'<br>' : '')+esc(s.cidade || '')+(s.uf ? ' · '+esc(s.uf) : '')+'</p></div>'
    + '<div><h4>'+I.clock+'Treinos</h4><p>'+(nucs.length ? esc(plural(nucs.length, 'núcleo ativo', 'núcleos ativos'))+'<br>' : '')+(temHor ? 'Quadro da semana acima' : 'Horários na área do aluno')+'</p></div>'
    + '<div><h4>'+I.share+'Social</h4>'+(s.instagram ? '<a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a>' : '')+(s.dominio ? '<a href="https://'+esc(s.dominio)+'" target="_blank" rel="noopener noreferrer">'+esc(s.dominio)+'</a>' : '')+'<a href="'+esc(login)+'">Área do aluno</a></div>'
    + (zap ? '<div><h4>'+I.zap+'WhatsApp</h4><a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">'+esc(zapFmt)+'</a></div>' : '')+'</div>'
    + '<div class="ac"><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição '+I.arrow+'</a>'+(zapHref ? '<a class="btn ghost" href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>' : '')+'</div></div>'
    + (mapsHref ? '<a class="btn ghost openmap" href="'+esc(mapsHref)+'" target="_blank" rel="noopener noreferrer">Abrir no Maps</a>' : '')+'</section>';

  // --- FOOTER ---
  var foot = '<footer class="foot"><div class="ct">'+marca
    + '<div class="sys"><span class="k">Sistema</span><nav aria-label="Sistema"><a href="'+esc(login)+'">Área do aluno</a><a href="'+esc(ins)+'">Inscrição</a><a href="'+esc(R('admin'))+'">Professores</a><a href="'+esc(R('instalar'))+'">Instalar o app</a><a href="'+esc(R('privacidade'))+'">Privacidade</a></nav></div>'
    + '<p class="cp">© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b> · atletapay.com.br/'+esc(s.slug)+'</p></div></footer>';

  site.className = 'mg';
  site.innerHTML = hero + mq + destaques + intro + split + programas + niveis + poster + equipe + horarios + appSec + contato + foot;
  wire(site);
}

/* ========================================================================== */
/*  Comportamento                                                              */
/* ========================================================================== */
function wire(site){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  site.classList.add('js');
  var burger = site.querySelector('#mg-burger'), nl = site.querySelector('#mg-nl');
  if(burger && nl){
    burger.addEventListener('click', function(){ var o = nl.classList.toggle('open'); burger.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    nl.addEventListener('click', function(e){ if(e.target.closest('a')){ nl.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); } });
  }
  function count(b){
    var end = parseInt(b.getAttribute('data-count'), 10) || 0, dur = reduce ? 0 : 1400, t0 = null;
    if(!dur){ b.textContent = String(end); return; }
    requestAnimationFrame(function step(ts){ t0 = t0 || ts; var p = Math.min(1, (ts - t0)/dur), e = 1 - Math.pow(1 - p, 3); b.textContent = String(Math.round(end*e)); if(p < 1) requestAnimationFrame(step); });
  }
  if('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return; e.target.classList.add('in'); e.target.querySelectorAll('[data-count]').forEach(count); io.unobserve(e.target); }); }, { threshold:.12, rootMargin:'0px 0px -6% 0px' });
    site.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  } else {
    site.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(count); });
  }
  if(reduce) return;
  var heroImg = site.querySelector('.hero .media img'), ticking = false;
  addEventListener('scroll', function(){ if(ticking) return; ticking = true; requestAnimationFrame(function(){ if(heroImg && scrollY < innerHeight*1.2) heroImg.style.translate = '0 '+(scrollY*.16)+'px'; ticking = false; }); }, { passive:true });
  if(matchMedia('(hover:hover)').matches){
    site.querySelectorAll('[data-magnet]').forEach(function(b){
      b.addEventListener('mousemove', function(e){ var r = b.getBoundingClientRect(); b.style.transform = 'translate('+((e.clientX-r.left-r.width/2)*.2)+'px,'+((e.clientY-r.top-r.height/2)*.26)+'px)'; });
      b.addEventListener('mouseleave', function(){ b.style.transform = ''; });
    });
    var ph = site.querySelector('.phone');
    if(ph){
      ph.addEventListener('mousemove', function(e){ var r = ph.getBoundingClientRect(), x = (e.clientX-r.left)/r.width-.5, y = (e.clientY-r.top)/r.height-.5; ph.style.transform = 'perspective(900px) rotateX('+(-y*10)+'deg) rotateY('+(x*13)+'deg)'; });
      ph.addEventListener('mouseleave', function(){ ph.style.transform = ''; });
    }
  }
}
