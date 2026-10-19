/* site-tpl-luva.js — Template "luva" do site público por escola (F4.3, pré-build #2).
 *
 * Direção: clube de luta de alto contraste. Carvão quase preto com grão de filme, UM acento
 * (a cor de botão/destaque da escola; padrão dourado), tipografia condensada pesada em caixa
 * alta (Big Shoulders Display) com corpo Barlow. Motivos: as cordas do ringue atravessando os
 * títulos e a fita de luva (listras diagonais) nas etiquetas. Fotos em P&B que ganham cor no hover.
 * Nasceu para boxe, serve qualquer modalidade (tabelas por modalidade abaixo).
 *
 * Seções: hero (3 linhas) · letreiro · 3 destaques · intro com contadores reais · "com contato /
 * sem contato" · 4 programas · níveis (escada real) · citação · equipe · horários da semana
 * (editáveis no painel) · App e Rede (ecossistema) · contato com mapa · rodapé Sistema.
 *
 * Contrato da biblioteca (site-templates.js): render(s, h) + schema + meta.
 *   s — escola mapeada por site-escola.js (mapEscola) + s.conteudo (siteConteudo/{escolaId}).
 *   h — { esc, url, VOCAB, LIDER, modalidadeBase }.
 * Segurança: todo texto por h.esc(); toda URL por h.url(); cor de faixa revalidada; nenhum
 * handler inline; links externos com rel="noopener noreferrer". Nada inventado: números só os
 * reais (escada, núcleos, equipe); horários/citação/WhatsApp só se a escola preencher.
 * Responsivo: 1280 (menu vira hambúrguer), 1100 (grades 2 col.), 760 (1 col.), 480 (horários 1 col.).
 */

/* ========================================================================== */
/*  Contrato da biblioteca: meta + schema                                      */
/* ========================================================================== */
import { SECAO_LOJA, produtosLoja, ilustracao, linkCompra } from './site-loja.js';
import { SECAO_AGENDA, eventosDoApp, avisosDoApp } from './site-agenda.js';

export var meta = {
  nome: 'Luva',
  descricao: 'Clube de luta em alto contraste: carvão com grão de filme, um acento forte, tipografia condensada pesada, cordas do ringue, níveis, horários da semana e o bloco do app.',
  modalidades: ['boxe', 'muaythai', 'mma', 'kickboxing', 'todas']
};

var SELO = { c:'selo', r:'Etiqueta (letras pequenas acima do título)', max:50 };
var DIAS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];
export var schema = { secoes: [
  { id:'hero', r:'Topo', ajuda:'Título em até três linhas (a última fica na cor de destaque). Sem foto aqui, entra a fachada do cadastro.', campos:[
    { c:'linha1', r:'Título — linha 1', max:16, ph:'Encontre' }, { c:'linha2', r:'Título — linha 2', max:16, ph:'o lutador' }, { c:'linha3', r:'Título — linha 3 (destaque)', max:16, ph:'em você' },
    { c:'texto', r:'Texto ao lado', t:'area', max:200 }, { c:'botao', r:'Botão principal', max:24, ph:'Comece hoje' }, { c:'foto', r:'Foto de fundo', t:'foto' } ] },
  { id:'letreiro', r:'Letreiro', ajuda:'As palavras que correm na faixa inclinada abaixo do topo.', campos:[
    { c:'palavras', r:'Palavras (separe por vírgula, até 8)', max:140, ph:'Jab, Direto, Cruzado, Gancho' } ] },
  { id:'destaques', r:'Destaques', ajuda:'Três argumentos curtos logo abaixo do topo.', campos:[
    { c:'itens', r:'Destaques', t:'lista', max:3, resumo:'titulo', nomeItem:'Destaque', item:[ { c:'titulo', r:'Título', max:40 }, { c:'texto', r:'Texto', t:'area', max:140 } ] } ] },
  { id:'intro', r:'O clube', ajuda:'Foto + texto de apresentação. Os números (níveis, núcleos, equipe) vêm do cadastro.', campos:[
    SELO, { c:'titulo', r:'Título', max:70, ph:'Boxe de verdade, para gente de verdade' }, { c:'texto', r:'Texto', t:'area', max:300 }, { c:'botao', r:'Botão', max:24 }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'split', r:'Dois caminhos', ajuda:'Dois blocos lado a lado (ex.: com contato / sem contato). Tópicos: um por linha.', campos:[
    { c:'titulo', r:'Título da seção', max:60, ph:'Com contato e sem contato' },
    { c:'itens', r:'Blocos', t:'lista', max:2, resumo:'titulo', nomeItem:'Bloco', item:[
      { c:'selo', r:'Etiqueta', max:40 }, { c:'titulo', r:'Título', max:30 }, { c:'topicos', r:'Tópicos (um por linha)', t:'area', max:400, linhas:4 }, { c:'botao', r:'Botão', max:24 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'programas', r:'Programas', ajuda:'Quatro programas em cartões com foto.', campos:[
    { c:'titulo', r:'Título da seção', max:60, ph:'Diversão. Condição. Boxe.' },
    { c:'itens', r:'Programas', t:'lista', max:4, resumo:'titulo', nomeItem:'Programa', item:[ { c:'titulo', r:'Nome', max:30 }, { c:'texto', r:'Descrição curta', t:'area', max:120 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'niveis', r:'Níveis', ajuda:'Os níveis e cores vêm da escada cadastrada. Aqui você dá uma etiqueta e um texto para cada um, na mesma ordem.', campos:[
    { c:'titulo', r:'Título da seção', max:60, ph:'Pronto para um você mais forte' }, { c:'texto', r:'Texto ao lado do botão', t:'area', max:200 }, { c:'botao', r:'Botão', max:30, ph:'Ver meu nível' },
    { c:'itens', r:'Textos por nível (na ordem da escada)', t:'lista', max:12, resumo:'selo', nomeItem:'Nível', item:[ { c:'selo', r:'Etiqueta', max:30 }, { c:'texto', r:'Descrição', t:'area', max:160 } ] } ] },
  { id:'citacao', r:'Citação', ajuda:'Frase grande sobre uma foto. Autor e cargo são opcionais.', campos:[
    { c:'texto', r:'Frase', max:60, ph:'Treine duro, lute fácil.' }, { c:'autor', r:'Autor', max:60 }, { c:'cargo', r:'Cargo / título', max:60 }, { c:'foto', r:'Foto de fundo', t:'foto' } ] },
  { id:'equipe', r:'Equipe', ajuda:'Quem conduz os treinos. Lista vazia = equipe do cadastro.', campos:[
    { c:'titulo', r:'Título da seção', max:60, ph:'Resultado vem de quem treina você' },
    { c:'itens', r:'Pessoas', t:'lista', max:6, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:60 }, { c:'graduacao', r:'Graduação / título', max:40 }, { c:'etiqueta', r:'Etiqueta (ex.: Treinador-chefe)', max:24 }, { c:'bio', r:'Apresentação', t:'area', max:200 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'horarios', r:'Horários', ajuda:'Quadro da semana. Sem itens, a seção não aparece.', campos:[
    { c:'titulo', r:'Título da seção', max:50, ph:'Semana no ringue' }, { c:'nota', r:'Observação abaixo do quadro', max:140, ph:'Horários sujeitos a alteração — o app avisa.' },
    { c:'itens', r:'Aulas', t:'lista', max:30, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS, ph:'Dia da semana' }, { c:'aula', r:'Aula', max:40, ph:'Sparring' }, { c:'horario', r:'Horário', max:20, ph:'19:30–21:00' }, { c:'local', r:'Local / núcleo', max:40 } ] } ] },
  SECAO_AGENDA(),
  SECAO_LOJA([ { c:'titulo', r:'Título da seção', max:50, ph:'Loja oficial' } ]),
  { id:'app', r:'App e Rede', campos:[ SELO, { c:'titulo', r:'Título', max:40, ph:'O clube inteiro no bolso' }, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  { id:'contato', r:'Contato', ajuda:'Endereço, mapa e Instagram vêm do cadastro. Com WhatsApp preenchido aparece "Falar no WhatsApp" (aula experimental).', campos:[
    SELO, { c:'titulo', r:'Título', max:40, ph:'Fale com a gente' }, { c:'texto', r:'Texto', t:'area', max:200 },
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13, ph:'67999990000' }, { c:'msgWhatsapp', r:'Mensagem pronta do WhatsApp', max:140, ph:'Olá! Quero agendar uma aula experimental.' } ] }
] };

/* ========================================================================== */
/*  Vocabulário por modalidade (defaults do template)                          */
/* ========================================================================== */
var HERO = {
  boxe:      ['Encontre', 'o lutador', 'em você'],
  muaythai:  ['Oito armas,', 'uma', 'disciplina'],
  mma:       ['Completo', 'por', 'natureza'],
  karate:    ['Técnica,', 'respeito,', 'resultado'],
  capoeira:  ['Onde a roda', 'não', 'para'],
  jiujitsu:  ['Base,', 'guarda,', 'finalização'],
  judo:      ['Caminho', 'suave, base', 'firme'],
  taekwondo: ['Chute alto,', 'cabeça', 'erguida'],
  arena:     ['Treine com', 'quem vive', 'isso']
};
var SIDE = {
  boxe: 'Técnica, condicionamento e cabeça fria. Treinos para quem quer competir e para quem quer só sair melhor do que entrou.',
  muaythai: 'Base, clinch e condicionamento de ringue. Para quem quer lutar e para quem quer a intensidade sem o contato.',
  mma: 'Em pé e no chão, com método. Da primeira aula à preparação de luta, no mesmo tatame.',
  arena: 'Técnica antes de força, respeito antes de tudo. Treinos para quem quer competir e para quem quer evoluir.'
};
var LETREIRO = {
  boxe: ['Jab', 'Direto', 'Cruzado', 'Gancho', 'Esquiva', 'Guarda alta'],
  muaythai: ['Teep', 'Clinch', 'Cotovelo', 'Joelho', 'Wai Kru', 'Disciplina'],
  mma: ['Striking', 'Grappling', 'Takedown', 'Cardio', 'Estratégia', 'Respeito'],
  karate: ['Kata', 'Kumite', 'Kihon', 'Budō', 'Disciplina', 'Respeito'],
  capoeira: ['Roda', 'Ginga', 'Berimbau', 'Axé', 'Malandragem', 'Respeito'],
  jiujitsu: ['Base', 'Guarda', 'Passagem', 'Finalização', 'Oss', 'Respeito'],
  judo: ['Ukemi', 'Nage-waza', 'Ne-waza', 'Randori', 'Rei', 'Respeito'],
  taekwondo: ['Poomsae', 'Kyorugi', 'Chagi', 'Dojang', 'Disciplina', 'Respeito'],
  arena: ['Técnica', 'Disciplina', 'Foco', 'Equipe', 'Evolução', 'Respeito']
};
var DESTAQUES = {
  boxe: [['Treinadores dedicados', 'Gente que vive o boxe todos os dias e corrige o detalhe que muda sua luta.'], ['Treino individual', 'Avaliação por critérios no app e um plano para cada nível, do primeiro jab ao sparring.'], ['Condicionamento sob medida', 'Força, cardio e mobilidade pensados para o ringue — e para a vida fora dele.']],
  arena: [['Equipe dedicada', 'Gente que vive a arte todos os dias e corrige o detalhe que muda o seu treino.'], ['Treino individual', 'Avaliação por critérios no app e um plano para cada nível, do primeiro dia à competição.'], ['Condicionamento sob medida', 'Força, cardio e mobilidade pensados para o treino — e para a vida fora dele.']]
};
var SPLIT = {
  boxe: { titulo:'Com contato e sem contato', itens:[
    { selo:'Treino técnico', titulo:'Sem contato', topicos:['Manopla e aparador: reação, distância e timing', 'Saco, corda e sombra com correção individual', 'Condicionamento com a intensidade do ringue, sem levar golpe'], botao:'Começar' },
    { selo:'Para quem quer lutar', titulo:'Com contato', topicos:['Sparring completo com capacete e protetor bucal', 'Supervisão em todos os rounds, sempre', 'Preparação para competições amadoras e federadas'], botao:'Saiba mais' } ] },
  arena: { titulo:'Técnica e treino livre', itens:[
    { selo:'Base', titulo:'Fundamentos', topicos:['Postura, base e defesa, repetidas até virar reflexo', 'Correção individual em cada aula', 'Condicionamento no ritmo de quem está começando'], botao:'Começar' },
    { selo:'Para quem já treina', titulo:'Treino avançado', topicos:['Aplicação com controle e supervisão', 'Estratégia e leitura do adversário', 'Preparação para competições'], botao:'Saiba mais' } ] }
};
var PROGS = {
  boxe: { titulo:'Diversão. Condição. Boxe.', itens:[['Sparring', 'Rounds controlados para quem já domina a base.'], ['Treino físico', 'Saco, corda e circuito: o cardio do boxe sem contato.'], ['Feminino', 'Turma exclusiva, técnica e defesa pessoal.'], ['Infantil', 'Coordenação, disciplina e confiança, sem contato.']] },
  arena: { titulo:'Diversão. Condição. Técnica.', itens:[['Fundamentos', 'A base técnica, do primeiro dia em diante.'], ['Condicionamento', 'Força e cardio no ritmo do treino.'], ['Feminino', 'Turma exclusiva, técnica e defesa pessoal.'], ['Infantil', 'Coordenação, disciplina e confiança.']] }
};
var MAXIMA = {
  boxe: 'Treine duro, lute fácil.', muaythai: 'Respeito antes do golpe.', mma: 'Completo é quem não para.',
  karate: 'Primeiro o respeito.', capoeira: 'Quem não ginga, não joga.', jiujitsu: 'A técnica vence a força.',
  judo: 'Ceder para vencer.', taekwondo: 'Chute alto, cabeça erguida.', arena: 'Treine duro, lute fácil.'
};
// Palavra em destaque na citação: a penúltima/última palavra ganha a cor do acento.
var INTRO = {
  boxe: ['Para todas as idades e níveis', 'Boxe de verdade, para gente de verdade', 'Nosso foco é treino funcional dinâmico e técnica correta de boxe. Quem chega para emagrecer e quem chega para competir dividem o mesmo ringue e o mesmo respeito.'],
  arena: ['Para todas as idades e níveis', 'Treino de verdade, para gente de verdade', 'Nosso foco é técnica correta e condicionamento com método. Quem chega para evoluir e quem chega para competir dividem o mesmo espaço e o mesmo respeito.']
};

/* ========================================================================== */
/*  CSS (escopado em .lv; acento vem da escola). Base gerada do mockup aprovado. */
/* ========================================================================== */
var CSS_BASE = '\
@keyframes lv-grain{0%{transform:translate(0,0)}20%{transform:translate(-2%,1%)}40%{transform:translate(1%,-2%)}60%{transform:translate(-1%,2%)}80%{transform:translate(2%,-1%)}100%{transform:translate(0,0)}}\
.lv .w{padding-inline:var(--g)}\
.lv .ct{max-width:1360px;margin-inline:auto}\
.lv .d{font-family:var(--display);font-weight:900;text-transform:uppercase;line-height:.9;letter-spacing:.005em;text-wrap:balance}\
.lv .k{font-family:var(--text);font-weight:700;font-size:.78rem;letter-spacing:.26em;text-transform:uppercase;color:var(--gold)}\
.lv .k.tape{display:inline-block;color:var(--gold-ink);padding:.45em .9em;background:repeating-linear-gradient(135deg,var(--gold) 0 10px,var(--gold-2) 10px 20px);clip-path:polygon(2% 0,100% 0,98% 100%,0 100%)}\
.lv .ropes{position:relative;display:flex;align-items:center;gap:22px;margin-bottom:clamp(36px,4vw,60px)}\
.lv .ropes::after{content:"";flex:1;height:22px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.22) 0 3px,transparent 3px 10px);min-width:60px}\
.lv .ropes.center{justify-content:center}\
.lv .ropes.center::before{content:"";flex:1;height:22px;background:repeating-linear-gradient(180deg,rgba(255,255,255,.22) 0 3px,transparent 3px 10px);min-width:60px}\
.lv .ropes h2{font-size:clamp(2.6rem,1.4rem + 5vw,6rem)}\
.lv .ropes h2 em{font-style:normal;color:var(--gold)}\
.lv .btn{position:relative;display:inline-flex;align-items:center;gap:.7em;white-space:nowrap;background:var(--gold);color:var(--gold-ink);font-family:var(--display);font-weight:800;font-size:clamp(1rem,.9rem + .4vw,1.25rem);letter-spacing:.06em;text-transform:uppercase;padding:.9em 1.6em;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);transition:transform .5s var(--ease),background .4s;isolation:isolate;overflow:hidden;cursor:pointer;border:0}\
.lv .btn::before{content:"";position:absolute;inset:0;background:var(--cream);transform:translateX(-101%);transition:transform .5s var(--ease);z-index:-1}\
.lv .btn:hover::before{transform:none}\
.lv .btn:hover{transform:translateY(-2px)}\
.lv .btn svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.lv .btn:hover svg{transform:translateX(5px)}\
.lv .btn.ghost{background:transparent;color:var(--cream);box-shadow:inset 0 0 0 2px var(--cream)}\
.lv .btn.ghost::before{background:var(--cream)}\
.lv .btn.ghost:hover{color:var(--ink)}\
.lv .nav{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:clamp(16px,2.2vw,30px) var(--g)}\
.lv .logo{display:flex;align-items:center;gap:12px;font-family:var(--display);font-weight:900;font-size:1.5rem;text-transform:uppercase;letter-spacing:.03em}\
.lv .logo .mk{width:46px;height:46px;background:var(--gold);color:var(--gold-ink);display:grid;place-items:center;clip-path:polygon(0 0,100% 0,100% 72%,72% 100%,0 100%);font-size:1.1rem;transition:transform .6s var(--ease)}\
.lv .logo:hover .mk{transform:rotate(-8deg) scale(1.06)}\
.lv .logo small{display:block;font-family:var(--text);font-weight:600;font-size:.66rem;letter-spacing:.3em;color:var(--gold);line-height:1}\
.lv .nl{display:flex;gap:clamp(12px,1.5vw,22px);align-items:center}\
.lv .nl a{position:relative;font-weight:600;font-size:.82rem;text-transform:uppercase;letter-spacing:.08em;padding:.3em 0}\
.lv .nl a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--gold);transform:scaleX(0);transform-origin:right;transition:transform .45s var(--ease)}\
.lv .nl a:hover::after{transform:scaleX(1);transform-origin:left}\
.lv .nl .btn{padding:.55em .95em;font-size:.9rem;margin-left:4px}\
.lv .burger{display:none;background:none;border:2px solid var(--cream);color:inherit;padding:.5em .9em;font:inherit;font-weight:700;cursor:pointer}\
.lv .hero{position:relative;min-height:clamp(640px,96svh,920px);display:flex;align-items:flex-end;isolation:isolate;overflow:hidden}\
.lv .hero .media{position:absolute;inset:0;z-index:-2}\
.lv .hero .media img{width:100%;height:100%;object-fit:cover;object-position:center 30%;filter:grayscale(.3) contrast(1.1);transform:scale(1.06);animation:lv-kb 20s cubic-bezier(.65,0,.35,1) infinite alternate}\
@keyframes lv-kb{to{transform:scale(1.16) translate(-1.5%,1%)}}\
.lv .hero .scrim{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(11,11,11,.55),rgba(11,11,11,.1) 40%,rgba(11,11,11,.92) 100%)}\
.lv .hero .ct{width:100%;padding:0 var(--g) clamp(40px,6vw,80px);display:grid;grid-template-columns:1.25fr .75fr;gap:24px;align-items:end}\
.lv .hero h1{font-size:clamp(3.2rem,1rem + 8.4vw,9.6rem);letter-spacing:-.005em}\
.lv .hero h1 .l{display:block;overflow:hidden;white-space:nowrap;padding-top:.1em;margin-top:-.1em}\
.lv .hero h1 .l span{display:block;transform:translateY(110%);animation:lv-rise .9s var(--ease) forwards}\
.lv .hero h1 .gold{color:var(--gold)}\
@keyframes lv-rise{to{transform:none}}\
@keyframes lv-fade{to{opacity:1}}\
.lv .hero .side{opacity:0;animation:lv-fade .9s var(--ease) .6s forwards;border-left:2px solid var(--gold);padding-left:22px;max-width:36ch}\
.lv .hero .side p{color:var(--mute)}\
.lv .hero .side .cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}\
.lv .hero .meta{position:absolute;top:clamp(90px,14vh,140px);right:var(--g);display:flex;flex-direction:column;gap:8px;align-items:flex-end;font-size:.78rem;letter-spacing:.2em;text-transform:uppercase;color:var(--mute)}\
.lv .hero .meta b{color:var(--cream)}\
.lv .hero .corner{position:absolute;left:var(--g);top:clamp(90px,14vh,140px);width:120px;height:120px;border-left:2px solid var(--gold);border-top:2px solid var(--gold);opacity:.8}\
.lv .mq{overflow:hidden;background:var(--gold);color:var(--gold-ink);padding:14px 0;transform:rotate(-1.2deg) scale(1.02);transform-origin:center;margin-block:-8px 0;position:relative;z-index:2}\
.lv .mq .tr{display:flex;gap:2.2rem;width:max-content;animation:lv-slide 26s linear infinite}\
.lv .mq span{font-family:var(--display);font-weight:900;font-size:clamp(1.3rem,1rem + 1.6vw,2.4rem);text-transform:uppercase;white-space:nowrap}\
.lv .mq i{font-style:normal;opacity:.55}\
@keyframes lv-slide{to{transform:translateX(-50%)}}\
.lv .sec{padding-block:clamp(84px,10vw,150px)}\
.lv .feats{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:var(--line)}\
.lv .ft{background:var(--carbon);padding:clamp(28px,3.4vw,46px);position:relative;overflow:hidden;transition:background .5s}\
.lv .ft::after{content:"";position:absolute;left:0;bottom:0;height:4px;width:100%;background:var(--gold);transform:scaleX(0);transform-origin:left;transition:transform .7s var(--ease)}\
.lv .ft:hover{background:var(--carbon-2)}\
.lv .ft:hover::after{transform:none}\
.lv .ft .n{font-family:var(--display);font-weight:900;font-size:4rem;line-height:1;color:transparent;-webkit-text-stroke:1.5px var(--gold);opacity:.9}\
.lv .ft h3{font-family:var(--display);font-weight:800;font-size:2rem;text-transform:uppercase;margin-top:14px;line-height:.95}\
.lv .ft p{color:var(--mute);margin-top:12px;max-width:34ch}\
.lv .ft a{display:inline-flex;gap:8px;align-items:center;margin-top:18px;color:var(--gold);font-weight:700;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase}\
.lv .ft a svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.lv .ft:hover a svg{transform:translateX(6px)}\
.lv .intro{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);align-items:center}\
.lv .intro .ph{position:relative;aspect-ratio:4/5;overflow:hidden;clip-path:polygon(0 0,100% 0,100% calc(100% - 60px),calc(100% - 60px) 100%,0 100%)}\
.lv .intro .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}\
.lv .intro .ph:hover img{transform:scale(1.06)}\
.lv .intro .ph .tag{position:absolute;left:18px;bottom:18px}\
.lv .intro h2{font-size:clamp(2.6rem,1.4rem + 5vw,5.6rem);margin-top:14px}\
.lv .intro h2 em{font-style:normal;color:var(--gold)}\
.lv .intro .lead{color:var(--mute);margin-top:18px;max-width:50ch;font-size:1.05em}\
.lv .nums{display:flex;gap:clamp(24px,4vw,60px);margin-top:30px;flex-wrap:wrap}\
.lv .nums div{border-top:2px solid var(--gold);padding-top:12px}\
.lv .nums b{display:block;font-family:var(--display);font-weight:900;font-size:clamp(3rem,2rem + 4vw,5.5rem);line-height:.9;color:var(--cream)}\
.lv .nums span{display:block;color:var(--mute);font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;margin-top:6px}\
.lv .intro .btn{margin-top:30px}\
.lv .split{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line)}\
.lv .half{position:relative;min-height:560px;display:flex;align-items:flex-end;padding:clamp(28px,3.4vw,52px);isolation:isolate;overflow:hidden;background:var(--carbon)}\
.lv .half img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;filter:grayscale(.5) contrast(1.05);transform:scale(1.03);transition:transform 1.2s var(--ease),filter .8s}\
.lv .half:hover img{transform:scale(1.1);filter:grayscale(0) contrast(1.05)}\
.lv .half::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(11,11,11,.1),rgba(11,11,11,.9) 70%)}\
.lv .half h3{font-family:var(--display);font-weight:900;font-size:clamp(2.4rem,1.6rem + 3vw,4.4rem);text-transform:uppercase;line-height:.9}\
.lv .half ul{list-style:none;margin:16px 0 0;padding:0;display:grid;gap:8px;color:var(--mute);max-width:44ch}\
.lv .half li{display:flex;gap:10px;align-items:flex-start}\
.lv .half li::before{content:"";flex:none;width:14px;height:14px;margin-top:.45em;background:var(--gold);clip-path:polygon(0 0,100% 0,100% 60%,60% 100%,0 100%)}\
.lv .half .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}\
.lv .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}\
.lv .tile{position:relative;aspect-ratio:3/4;overflow:hidden;isolation:isolate;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 28px),calc(100% - 28px) 100%,0 100%);background:var(--carbon)}\
.lv .tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;filter:grayscale(.7);transform:scale(1.03);transition:transform 1.1s var(--ease),filter .8s}\
.lv .tile::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(11,11,11,0) 30%,rgba(11,11,11,.9))}\
.lv .tile:hover img{transform:scale(1.1);filter:grayscale(0)}\
.lv .tile .n{position:absolute;top:16px;left:16px;font-family:var(--display);font-weight:900;font-size:2.2rem;color:var(--gold);line-height:1}\
.lv .tile h3{font-family:var(--display);font-weight:900;font-size:clamp(1.8rem,1.4rem + 1.4vw,2.8rem);text-transform:uppercase;line-height:.9}\
.lv .tile p{color:var(--mute);font-size:.92rem;margin-top:8px;max-width:26ch;max-height:0;opacity:0;overflow:hidden;transition:max-height .6s var(--ease),opacity .6s}\
.lv .tile:hover p{max-height:120px;opacity:1}\
.lv .tile a{display:inline-flex;gap:8px;align-items:center;margin-top:12px;color:var(--gold);font-weight:700;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase}\
.lv .progs .ac{display:flex;justify-content:center;margin-top:clamp(28px,4vw,48px)}\
.lv .niveis{display:grid;grid-template-columns:repeat(var(--n,4),1fr);gap:14px}\
.lv .nv{background:var(--carbon);padding:clamp(24px,3vw,40px) clamp(20px,2.4vw,32px);position:relative;overflow:hidden;transition:transform .6s var(--ease),background .5s}\
.lv .nv:hover{transform:translateY(-8px);background:var(--carbon-2)}\
.lv .nv .band{height:14px;background:var(--c,#555);margin-bottom:22px;clip-path:polygon(0 0,100% 0,96% 100%,0 100%);box-shadow:inset 0 -5px 0 rgba(0,0,0,.3)}\
.lv .nv .k{color:var(--mute)}\
.lv .nv h3{font-family:var(--display);font-weight:900;font-size:clamp(1.7rem,1.2rem + 1.3vw,2.2rem);text-transform:uppercase;line-height:.9;margin-top:8px;overflow-wrap:anywhere}\
.lv .nv p{color:var(--mute);margin-top:12px;font-size:.95rem}\
.lv .nv .et{position:absolute;right:-10px;top:14px;font-family:var(--display);font-weight:900;font-size:5rem;line-height:1;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.14)}\
.lv .niv .ac{display:flex;align-items:center;justify-content:center;gap:18px 30px;flex-wrap:wrap;margin-top:clamp(28px,4vw,48px);text-align:center}\
.lv .niv .ac p{color:var(--mute);max-width:46ch}\
.lv .quote{position:relative;min-height:70svh;display:grid;place-items:center;text-align:center;isolation:isolate;overflow:hidden;padding:clamp(80px,10vw,140px) var(--g)}\
.lv .quote img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;filter:grayscale(1) contrast(1.1);opacity:.55}\
.lv .quote::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse at center,rgba(11,11,11,.2),rgba(11,11,11,.95) 75%)}\
.lv .quote blockquote{margin:0;font-family:var(--display);font-weight:900;font-size:clamp(3rem,1.5rem + 8vw,9rem);text-transform:uppercase;line-height:.92}\
.lv .quote blockquote em{font-style:normal;color:var(--gold)}\
.lv .quote cite{display:block;margin-top:26px;font-style:normal;color:var(--mute);letter-spacing:.2em;text-transform:uppercase;font-size:.8rem}\
.lv .quote cite b{color:var(--cream);display:block;font-size:1rem;letter-spacing:.1em}\
.lv .coaches{display:grid;grid-template-columns:repeat(var(--n,3),1fr);gap:14px}\
.lv .co{position:relative;background:var(--carbon);overflow:hidden}\
.lv .co .ph{aspect-ratio:4/5;overflow:hidden;position:relative}\
.lv .co .ph img{width:100%;height:100%;object-fit:cover;object-position:center top;filter:grayscale(1) contrast(1.05);transition:transform 1.1s var(--ease),filter .8s}\
.lv .co:hover .ph img{transform:scale(1.06);filter:grayscale(0)}\
.lv .co .ph::after{content:"";position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(180deg,transparent,var(--carbon))}\
.lv .co .tx{padding:22px clamp(20px,2.4vw,30px) clamp(24px,2.6vw,34px);margin-top:-54px;position:relative}\
.lv .co .tx .k{color:var(--gold)}\
.lv .co h3{font-family:var(--display);font-weight:900;font-size:2.4rem;text-transform:uppercase;line-height:.9;margin-top:6px}\
.lv .co p{color:var(--mute);margin-top:10px;font-size:.95rem;max-width:40ch}\
.lv .co .lbl{position:absolute;top:16px;right:16px}\
.lv .sched{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;background:var(--line)}\
.lv .day{background:var(--carbon);padding:18px 16px 22px;min-height:220px}\
.lv .day h4{font-family:var(--display);font-weight:900;font-size:1.6rem;text-transform:uppercase;color:var(--gold)}\
.lv .day ul{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}\
.lv .day li{border-left:2px solid var(--gold);padding-left:10px}\
.lv .day li b{display:block;font-weight:700;font-size:.95rem}\
.lv .day li span{display:block;color:var(--mute);font-size:.8rem}\
.lv .day.off{color:var(--mute)}\
.lv .day.off h4{color:var(--mute);opacity:.6}\
.lv .hor .note{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between;margin-top:22px;color:var(--mute);font-size:.9rem}\
.lv .appsec{background:var(--gold);color:var(--gold-ink);clip-path:polygon(0 48px,100% 0,100% 100%,0 100%);padding:clamp(100px,12vw,170px) var(--g) clamp(80px,10vw,140px)}\
.lv .appsec .ct{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(36px,6vw,90px);align-items:center}\
.lv .appsec .k{color:var(--gold-ink);opacity:.7}\
.lv .appsec h2{font-size:clamp(2.6rem,1.4rem + 5vw,6rem);margin-top:10px}\
.lv .appsec .lead{margin-top:18px;max-width:50ch;opacity:.85;font-size:1.05em}\
.lv .rec{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}\
.lv .rec a{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:rgba(0,0,0,.08);border:1px solid rgba(0,0,0,.14);transition:background .4s,transform .4s var(--ease)}\
.lv .rec a:hover{background:rgba(0,0,0,.16);transform:translateX(4px)}\
.lv .rec .ic{flex:none;width:38px;height:38px;display:grid;place-items:center;background:var(--ink);color:var(--gold)}\
.lv .rec .ic svg{width:18px;height:18px}\
.lv .rec b{display:block;font-weight:700}\
.lv .rec small{display:block;opacity:.75;font-size:.85rem;line-height:1.4}\
.lv .appsec .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}\
.lv .appsec .btn{background:var(--ink);color:var(--cream)}\
.lv .appsec .btn::before{background:var(--cream)}\
.lv .appsec .btn:hover{color:var(--ink)}\
.lv .appsec .btn.ghost{background:transparent;color:var(--gold-ink);box-shadow:inset 0 0 0 2px var(--gold-ink)}\
.lv .phone{position:relative;width:min(100%,340px);margin-inline:auto;border-radius:52px;background:linear-gradient(160deg,#2a2a2a,#0a0a0a 45%,#1a1a1a);padding:12px;box-shadow:0 60px 100px -40px rgba(0,0,0,.8),0 0 0 1px rgba(255,255,255,.08),inset 0 0 0 2px #000;transition:transform .6s var(--ease);transform-style:preserve-3d}\
.lv .phone::before,.lv .phone::after{content:"";position:absolute;left:-3px;width:3px;border-radius:2px;background:#2a2a2a}\
.lv .phone::before{top:120px;height:36px}\
.lv .phone::after{top:170px;height:70px}\
.lv .phone .side{position:absolute;right:-3px;top:150px;width:3px;height:90px;border-radius:2px;background:#2a2a2a}\
.lv .phone .scr{position:relative;border-radius:42px;background:#0e0e0e;color:var(--cream);overflow:hidden;display:flex;flex-direction:column;aspect-ratio:9/19.3}\
.lv .phone .island{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:34%;height:28px;border-radius:16px;background:#000;z-index:3}\
.lv .phone .status{display:flex;justify-content:space-between;align-items:center;padding:16px 26px 0;font-weight:700;font-size:.78rem;letter-spacing:.02em;color:var(--cream)}\
.lv .phone .status span:last-child{display:flex;gap:5px;align-items:center}\
.lv .phone .status i{display:inline-block;width:16px;height:9px;border:1.5px solid var(--cream);border-radius:3px;position:relative}\
.lv .phone .status i::after{content:"";position:absolute;inset:1.5px;right:4px;background:var(--gold);border-radius:1px}\
.lv .phone .hdr{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 0}\
.lv .phone .hdr .who{display:flex;align-items:center;gap:10px}\
.lv .phone .hdr .av{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#8a6a10);display:grid;place-items:center;font-family:var(--display);font-weight:900;color:var(--gold-ink);font-size:1.1rem}\
.lv .phone .hdr small{display:block;font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}\
.lv .phone .hdr b{display:block;font-family:var(--display);font-weight:800;font-size:1.25rem;text-transform:uppercase;line-height:1}\
.lv .phone .hdr .bell{width:36px;height:36px;border-radius:50%;background:#1a1a1a;display:grid;place-items:center;color:var(--cream);position:relative}\
.lv .phone .hdr .bell::after{content:"";position:absolute;top:8px;right:9px;width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 2px #1a1a1a}\
.lv .phone .hdr .bell svg{width:16px;height:16px}\
.lv .phone .body{padding:16px 16px 0;display:grid;gap:10px;flex:1;align-content:start;min-width:0}\
.lv .phone .body>*{min-width:0}\
.lv .phone .card2{background:#171717;border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:14px 16px;overflow:hidden}\
.lv .phone .card2 .k{font-size:.58rem;letter-spacing:.2em;color:var(--mute)}\
.lv .phone .lvl{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px}\
.lv .phone .lvl b{font-family:var(--display);font-weight:900;font-size:1.3rem;text-transform:uppercase;line-height:1;letter-spacing:.01em}\
.lv .phone .lvl span{font-family:var(--display);font-weight:900;font-size:1.5rem;color:var(--gold);line-height:1}\
.lv .phone .therm{height:10px;background:#262626;border-radius:5px;margin-top:10px;overflow:hidden;position:relative}\
.lv .phone .therm i{position:absolute;inset:0;width:68%;border-radius:5px;background:linear-gradient(90deg,#546e7a,var(--gold));transform-origin:left;transform:scaleX(0);transition:transform 1.6s var(--ease) .3s}\
.lv .phone.in .therm i{transform:none}\
.lv .phone .nxt{display:flex;justify-content:space-between;gap:8px;font-size:.64rem;color:var(--mute);margin-top:8px;white-space:nowrap}\
.lv .phone .nxt span{overflow:hidden;text-overflow:ellipsis}\
.lv .phone .nxt b{color:var(--cream);font-weight:600}\
.lv .phone .acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\
.lv .phone .act{min-width:0;background:#171717;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:12px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:.6rem;font-weight:600;letter-spacing:.04em;color:var(--mute);text-align:center}\
.lv .phone .act svg{width:20px;height:20px;color:var(--gold)}\
.lv .phone .act.on{background:var(--gold);color:var(--gold-ink);border-color:var(--gold)}\
.lv .phone .act.on svg{color:var(--gold-ink)}\
.lv .phone .next{display:flex;align-items:center;gap:12px}\
.lv .phone .next>div{min-width:0}\
.lv .phone .next .dt{flex:none;width:48px;height:52px;border-radius:12px;background:var(--gold);color:var(--gold-ink);display:grid;place-items:center;font-family:var(--display);font-weight:900;line-height:.95;text-align:center;font-size:.72rem;text-transform:uppercase}\
.lv .phone .next .dt b{display:block;font-size:1.3rem}\
.lv .phone .next b.t{display:block;font-weight:700;font-size:.9rem}\
.lv .phone .next span{display:block;color:var(--mute);font-size:.72rem}\
.lv .phone .next .go{margin-left:auto;width:30px;height:30px;border-radius:50%;background:#262626;display:grid;place-items:center}\
.lv .phone .next .go svg{width:14px;height:14px;color:var(--gold)}\
.lv .phone .pres .dots{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;margin-top:10px}\
.lv .phone .pres .dots i{display:block;aspect-ratio:1;border-radius:4px;background:#262626}\
.lv .phone .pres .dots i.on{background:var(--gold)}\
.lv .phone .tabs{margin-top:auto;display:flex;justify-content:space-around;padding:12px 10px 22px;border-top:1px solid rgba(255,255,255,.06);background:#0b0b0b}\
.lv .phone .tabs span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.56rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}\
.lv .phone .tabs span.on{color:var(--gold)}\
.lv .phone .tabs svg{width:18px;height:18px}\
.lv .phone .home{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:34%;height:4px;border-radius:2px;background:rgba(255,255,255,.5)}\
.lv .appsec .phone-wrap{position:relative;display:grid;place-items:center}\
.lv .appsec .phone-wrap::before{content:"";position:absolute;width:min(70%,320px);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,.28),transparent 68%);filter:blur(10px);bottom:-6%}\
.lv .contact{display:grid;grid-template-columns:1fr 1fr;gap:2px;background:var(--line)}\
.lv .contact .card{background:var(--carbon);padding:clamp(28px,3.6vw,56px)}\
.lv .contact h2{font-size:clamp(2.6rem,1.4rem + 5vw,5.6rem)}\
.lv .contact h2 em{font-style:normal;color:var(--gold)}\
.lv .contact .ds{color:var(--mute);margin-top:16px;max-width:44ch}\
.lv .cc{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:30px}\
.lv .cc h4{display:flex;align-items:center;gap:8px;font-weight:700;font-size:.8rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold)}\
.lv .cc h4 svg{width:16px;height:16px}\
.lv .cc p,.lv .cc a{display:block;color:var(--cream);margin-top:8px;font-size:.95rem;line-height:1.5}\
.lv .cc a:hover{color:var(--gold)}\
.lv .contact .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}\
.lv .contact .map{position:relative;min-height:520px;background:#1a1a1a;overflow:hidden}\
.lv .contact .map iframe{position:absolute;inset:-6%;width:112%;height:112%;border:0;filter:grayscale(1) invert(.93) contrast(.95) brightness(.8) sepia(.25) hue-rotate(5deg);pointer-events:none}\
.lv .contact .map::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 120px rgba(11,11,11,.9);pointer-events:none}\
.lv .contact .map .openmap{position:absolute;right:18px;bottom:18px}\
.lv .foot{padding:clamp(40px,5vw,70px) var(--g) 28px;border-top:1px solid var(--line)}\
.lv .foot .ct{display:grid;grid-template-columns:1fr auto;gap:28px 40px;align-items:start}\
.lv .foot .sys{display:flex;flex-direction:column;align-items:flex-end;gap:10px}\
.lv .foot .sys .k{color:var(--mute);font-size:.68rem}\
.lv .foot .sys nav{display:flex;flex-wrap:wrap;gap:8px 22px;justify-content:flex-end}\
.lv .foot .sys a{font-size:.9rem;opacity:.85;position:relative;padding:.2em 0}\
.lv .foot .sys a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--gold);transform:scaleX(0);transform-origin:right;transition:transform .45s var(--ease)}\
.lv .foot .sys a:hover::after{transform:scaleX(1);transform-origin:left}\
.lv .foot .cp{grid-column:1/-1;border-top:1px solid var(--line);padding-top:18px;font-size:.88rem;color:var(--mute)}\
.lv .foot .cp b{color:var(--cream)}\
.lv.js .rv{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease)}\
.lv.js .rv.in{opacity:1;transform:none}\
.lv .st>*{transition-delay:calc(var(--i,0)*90ms)}\
.lv .agd-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:2px;background:var(--line)}\
.lv .agd-ev,.lv .agd-av{background:var(--carbon);padding:clamp(22px,3vw,40px)}\
.lv .agd ul{list-style:none;margin:18px 0 0;padding:0}\
.lv .agd li{display:grid;grid-template-columns:64px minmax(0,1fr);gap:18px;align-items:center;padding:16px 0;border-top:1px solid var(--line)}\
.lv .agd .dt{display:grid;place-items:center;width:64px;height:64px;background:var(--gold);color:var(--ink);font-family:var(--display);line-height:1;text-align:center}\
.lv .agd .dt b{font-size:1.7rem;display:block}.lv .agd .dt small{font-size:.62rem;letter-spacing:.2em;display:block;margin-top:2px}\
.lv .agd .dt.sem{background:var(--steel);color:var(--cream)}\
.lv .agd li b.t{display:block;color:var(--cream);font-size:1.05rem;font-weight:700}.lv .agd li span{color:var(--mute);font-size:.9rem}\
.lv .agd .av{display:flex;gap:14px;padding:16px 0;border-top:1px solid var(--line)}.lv .agd .av:first-of-type{margin-top:18px}\
.lv .agd .av .ic{width:38px;height:38px;flex:none;display:grid;place-items:center;border:1px solid var(--gold);color:var(--gold)}.lv .agd .av .ic svg{width:18px;height:18px}\
.lv .agd .av b{display:block;color:var(--cream)}.lv .agd .av p{margin:4px 0 0;color:var(--mute);font-size:.9rem;line-height:1.5}.lv .agd .av small{display:block;margin-top:6px;color:var(--gold);font-size:.72rem;letter-spacing:.14em}\
.lv .agd .sync{display:inline-flex;align-items:center;gap:8px;margin-top:22px;color:var(--mute);font-size:.82rem}.lv .agd .sync i{width:8px;height:8px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 4px rgba(255,255,255,.06)}\
@media (max-width:760px){.lv .agd-grid{grid-template-columns:1fr}}\
@media (prefers-reduced-motion:reduce){.lv *,.lv *::before,.lv *::after{animation:none!important;transition:none!important}.lv.js .rv{opacity:1;transform:none}.lv .hero h1 .l span{transform:none}.lv .hero .side{opacity:1}.lv .phone .therm i{transform:none}}\
@media (max-width:1280px){.lv .nl{display:none}.lv .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:var(--g);flex-direction:column;align-items:flex-start;gap:16px;background:var(--carbon);padding:22px 26px;border:1px solid var(--line)}.lv .burger{display:inline-flex}}\
@media (max-width:1100px){.lv .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:var(--g);flex-direction:column;align-items:flex-start;gap:16px;background:var(--carbon);padding:22px 26px;border:1px solid var(--line)}.lv .burger{display:inline-flex}.lv .tiles,.lv .niveis{grid-template-columns:1fr 1fr}.lv .sched{grid-template-columns:repeat(4,1fr)}.lv .appsec .ct{grid-template-columns:1fr}}\
@media (max-width:760px){.lv .hero .ct{grid-template-columns:1fr}.lv .hero .meta,.lv .hero .corner{display:none}.lv .feats,.lv .split,.lv .intro,.lv .coaches,.lv .contact{grid-template-columns:1fr}.lv .tiles,.lv .niveis{grid-template-columns:1fr}.lv .sched{grid-template-columns:repeat(2,1fr)}.lv .rec{grid-template-columns:1fr}.lv .foot .ct{grid-template-columns:1fr}.lv .foot .sys{align-items:flex-start}.lv .foot .sys nav{justify-content:flex-start}.lv .half{min-height:460px}.lv .ropes h2{font-size:clamp(2.4rem,1rem + 8vw,4rem)}}';

function css(t){
  return '\
.lv,.lv *,.lv *::before,.lv *::after{box-sizing:border-box}\
.lv{--ink:#0b0b0b;--carbon:#141414;--carbon-2:#1d1d1d;--steel:#2a2a2a;--line:rgba(255,255,255,.12);--cream:#f2efe9;--mute:#a8a39b;\
 --gold:'+t.acc+';--gold-2:'+t.acc2+';--gold-ink:'+t.accInk+';\
 --display:"Big Shoulders Display",Impact,"Arial Narrow",system-ui,sans-serif;--text:"Barlow",system-ui,sans-serif;--ease:cubic-bezier(.16,1,.3,1);--g:clamp(20px,5vw,96px);--r:14px;\
 position:relative;background:var(--ink);color:var(--cream);font-family:var(--text);font-size:clamp(1rem,.95rem + .3vw,1.125rem);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}\
.lv::after{content:"";position:fixed;inset:-50%;z-index:999;pointer-events:none;opacity:.07;mix-blend-mode:screen;background-image:'+GRAIN+';animation:lv-grain 1.2s steps(6) infinite}\
.lv h1,.lv h2,.lv h3,.lv h4,.lv p{margin:0}.lv a{color:inherit;text-decoration:none}.lv img{display:block;max-width:100%}.lv :focus-visible{outline:3px solid var(--gold);outline-offset:3px}\
' + CSS_BASE + '\
.lv .intro .ph .ini,.lv .co .ph .ini{display:grid;place-items:center;height:100%;font-family:var(--display);font-weight:900;font-size:clamp(4rem,3rem + 4vw,8rem);color:var(--gold);background:var(--carbon);opacity:.9}\
.lv .appsec .ac .btn img{width:24px;height:24px;border-radius:6px}\
.lv .phone .next .dt svg{width:22px;height:22px}.lv .phone .lvl span{font-family:var(--text);font-weight:600;font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;text-align:right;max-width:48%;line-height:1.2}.lv .ft h3,.lv .tile h3,.lv .nv h3{overflow-wrap:anywhere}.lv .phone .hdr .av{overflow:hidden}.lv .phone .hdr .av img{width:100%;height:100%;object-fit:cover}\
.lv .contact .map svg.grid{position:absolute;inset:0;width:100%;height:100%}\
.lv .hero.noimg .scrim{background:linear-gradient(180deg,var(--carbon),var(--ink))}\
@media (max-width:1100px){.lv .hero .ct{grid-template-columns:1fr;gap:28px}.lv .hero h1{font-size:clamp(3rem,1rem + 9vw,7rem)}.lv .hero .side{max-width:52ch}}\
\
.lv .lj-lead{color:var(--mute);max-width:60ch;margin:-18px 0 clamp(28px,3vw,44px)}\
.lv .lj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:clamp(16px,2vw,24px)}\
.lv .lj{position:relative;display:flex;flex-direction:column;background:var(--carbon);border:1px solid var(--line);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));transition:transform .6s var(--ease),border-color .4s}\
.lv .lj:hover{transform:translateY(-8px);border-color:var(--gold)}\
.lv .lj-ph{position:relative;aspect-ratio:1;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 58%,#f6f3ee 0,#e2dcd1 58%,#cfc7b9 100%)}\
.lv .lj-ph img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}\
.lv .lj-ph .lj-svg{display:block;width:78%;transition:transform .9s var(--ease)}.lv .lj-ph .lj-svg svg{display:block;width:100%;height:auto;filter:drop-shadow(0 18px 18px rgba(0,0,0,.25))}\
.lv .lj:hover .lj-ph img,.lv .lj:hover .lj-svg{transform:scale(1.06) rotate(-2deg)}\
.lv .lj-ph .tape{position:absolute;left:-30px;bottom:18px;width:140px;height:18px;transform:rotate(-12deg);background:repeating-linear-gradient(135deg,var(--gold) 0 10px,var(--ink) 10px 20px);opacity:.9}\
.lv .lj-tx{display:flex;flex-direction:column;gap:8px;padding:20px 20px 22px;flex:1}\
.lv .lj h3{font-family:var(--display);font-weight:900;font-size:1.7rem;line-height:.95;text-transform:uppercase;overflow-wrap:anywhere}\
.lv .lj p{color:var(--mute);font-size:.95rem}\
.lv .lj-ft{margin-top:auto;padding-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.lv .lj-ft b{font-size:1.9rem;font-weight:900;color:var(--gold)}.lv .lj-ft .btn{padding:.6em 1em;font-size:.95rem}\
@media (max-width:480px){.lv .ft h3{font-size:1.6rem}.lv .sched{grid-template-columns:1fr}.lv .day{min-height:0}.lv .niveis,.lv .coaches{grid-template-columns:1fr}.lv .cc{grid-template-columns:1fr}}';
}

/* ========================================================================== */
/*  Cor e utilidades                                                           */
/* ========================================================================== */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s : null; }
function readable(hex){
  var c = String(hex || '').replace('#', '');
  var r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  if(!(r >= 0) || !(g >= 0) || !(b >= 0)) return '#141414';
  return ((0.2126*r + 0.7152*g + 0.0722*b) / 255) > 0.55 ? '#141414' : '#f2efe9';
}
function lighten(hex, amt){
  var c = String(hex).replace('#',''), out = '#';
  for(var i = 0; i < 6; i += 2){ var v = parseInt(c.slice(i, i+2), 16); v = Math.round(v + (255 - v) * amt); out += ('0' + v.toString(16)).slice(-2); }
  return out;
}
function corFaixa(v){ var s = String(v || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : ''; }
function initials(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase(); }
function plural(n, a, b){ return n + ' ' + (n === 1 ? a : b); }
function pluralPeca(p){ var s = String(p || 'graduação').trim(); if(/ão$/i.test(s)) return s.replace(/ão$/i, 'ões'); if(/l$/i.test(s)) return s.replace(/l$/i, 'is'); if(/[sz]$/i.test(s)) return s; return s + 's'; }
var GRAIN = 'url("data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>') + '")';

/* ========================================================================== */
/*  Ícones                                                                     */
/* ========================================================================== */
function ic(d, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w || 2)+'" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'; }
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
  bell:  ic('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  home:  ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  user:  ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  ig:    ic('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>')
};

// Mapa decorativo (sem geo e sem endereço): malha escura.
function mapaGrade(){
  var out = '<svg class="grid" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="1200" height="800" fill="#161616"/>';
  var i; for(i = 0; i < 1200; i += 60) out += '<line x1="'+i+'" y1="0" x2="'+(i+140)+'" y2="800" stroke="#222" stroke-width="'+(i%180===0?10:4)+'"/>';
  for(i = -200; i < 900; i += 70) out += '<line x1="0" y1="'+i+'" x2="1200" y2="'+(i+120)+'" stroke="#222" stroke-width="'+(i%210===0?12:5)+'"/>';
  return out + '<path d="M0 520 C 300 470, 500 640, 820 560 S 1150 420, 1200 460" fill="none" stroke="#2a2a2a" stroke-width="26"/></svg>';
}

/* ========================================================================== */
/*  Render                                                                     */
/* ========================================================================== */
export function render(s, h){
  var esc = h.esc, url = h.url;
  var modBase = h.modalidadeBase || 'arena';
  var V = (h.VOCAB && (h.VOCAB[modBase] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && h.LIDER[modBase]) || 'Professor';
  var c = s.cores || {};
  var t = { acc: hex6(c.botao) || hex6(c.destaque) || '#d4a017' };
  t.acc2 = lighten(t.acc, .22); t.accInk = readable(t.acc);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('lv-fonts')){
    var l = document.createElement('link'); l.id = 'lv-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('lv-css');
  if(!st){ st = document.createElement('style'); st.id = 'lv-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  // Conteúdo do painel por cima dos padrões (mesmos helpers do Horizons).
  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function linhas(txt){ return String(txt || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, 6); }

  var R = function(rota){ return '/'+encodeURIComponent(s.slug)+'/'+rota; };
  var ins = R('inscricao'), login = R('login');
  var fotos = s.fotos || {};
  var treino = (fotos.treino || []).map(url).filter(Boolean);
  var fachada = (fotos.fachada || []).map(url).filter(Boolean);
  var equipeF = (fotos.equipe || []).map(url).filter(Boolean);
  var logo = url(s.logo), ini = initials(s.nomeCurto);
  var pecaPl = pluralPeca(s.peca);
  var proxPeca = (/a$/i.test(s.peca) ? 'à próxima ' : 'ao próximo ') + s.peca;

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

  var marca = '<a class="logo" href="#top"><span class="mk">'+(logo ? '<img src="'+esc(logo)+'" alt="'+esc('Logo '+s.nomeCurto)+'">' : esc(ini))+'</span><span>'+esc(s.nomeCurto)+'<small>'+esc(V.nomeMod)+'</small></span></a>';

  // --- horários (só do painel) ---
  var horItens = lista('horarios', 'itens', 30).filter(function(x){ return cs(x, 'aula'); });
  var temHor = horItens.length > 0;

  // --- NAV + HERO ---
  var nav = '<nav class="nav">'+marca
    + '<div class="nl" id="lv-nl"><a href="#lv-programas">Programas</a>'+(escada.length ? '<a href="#lv-niveis">Níveis</a>' : '')+'<a href="#lv-equipe">Equipe</a>'+(temHor ? '<a href="#lv-horarios">Horários</a>' : '')+((eventosDoApp(s, 1).length || avisosDoApp(s, 1).length) ? '<a href="#lv-agenda">Agenda</a>' : '')+(produtosLoja(C, 8).length ? '<a href="#lv-loja">Loja</a>' : '')+'<a href="#lv-app">App</a><a href="#lv-contato">Contato</a>'
    + '<a class="btn ghost" href="'+esc(login)+'">Área do aluno</a><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição</a></div>'
    + '<button class="burger" id="lv-burger" type="button" aria-expanded="false" aria-controls="lv-nl">Menu</button></nav>';
  var hp = HERO[modBase] || HERO.arena;
  var h1 = [cx('hero', 'linha1', hp[0]), cx('hero', 'linha2', hp[1]), cx('hero', 'linha3', hp[2])];
  var heroFoto = url(cx('hero', 'foto', '')) || fachada[0] || equipeF[0] || treino[0] || '';
  var hero = '<header class="hero'+(heroFoto ? '' : ' noimg')+'" id="top">'+nav
    + (heroFoto ? '<div class="media"><img src="'+esc(heroFoto)+'" alt="'+esc(s.nome)+'" fetchpriority="high"></div>' : '')
    + '<div class="scrim" aria-hidden="true"></div><div class="corner" aria-hidden="true"></div>'
    + '<div class="meta" aria-hidden="true">'+(s.cidade ? '<span>'+esc(s.cidade)+(s.uf ? ' · <b>'+esc(s.uf)+'</b>' : '')+'</span>' : '')+(nucs.length ? '<span>'+esc(plural(nucs.length, 'núcleo', 'núcleos'))+'</span>' : '')+'<span>Clube de <b>'+esc(V.nomeMod)+'</b></span></div>'
    + '<div class="ct"><h1 class="d"><span class="l"><span style="animation-delay:.05s">'+esc(h1[0])+'</span></span><span class="l"><span style="animation-delay:.18s">'+esc(h1[1])+'</span></span><span class="l gold"><span style="animation-delay:.31s">'+esc(h1[2])+'</span></span></h1>'
    + '<div class="side"><span class="k tape">'+esc(s.nome)+' · '+esc(V.nomeMod)+'</span><p>'+esc(cx('hero', 'texto', SIDE[modBase] || SIDE.arena))+'</p>'
    + '<div class="cta"><a class="btn" href="'+esc(ins)+'" data-magnet>'+esc(cx('hero', 'botao', 'Comece hoje'))+' '+I.arrow+'</a><a class="btn ghost" href="'+esc(login)+'">Área do aluno</a></div></div></div></header>';

  // --- LETREIRO ---
  var letreiro = LETREIRO[modBase] || LETREIRO.arena;
  var pal = cx('letreiro', 'palavras', ''); if(pal){ var pl = pal.split(',').map(function(p){ return p.trim(); }).filter(Boolean).slice(0, 8); if(pl.length) letreiro = pl; }
  var faixa = letreiro.map(esc).join(' <i>·</i> ') + ' <i>·</i> ' + esc(s.nomeCurto) + ' <i>·</i> ';
  var mq = '<div class="mq" aria-hidden="true"><div class="tr"><span>'+faixa+'</span><span>'+faixa+'</span></div></div>';

  // --- DESTAQUES ---
  var dPad = DESTAQUES[modBase] || DESTAQUES.arena;
  var dItens = lista('destaques', 'itens', 3).filter(function(x){ return cs(x, 'titulo'); });
  var dlist = dItens.length ? dItens.map(function(x){ return [cs(x, 'titulo'), cs(x, 'texto')]; }) : dPad;
  var dLinks = [['#lv-equipe', 'Conheça a equipe'], [escada.length ? '#lv-niveis' : '#lv-programas', escada.length ? 'Ver os níveis' : 'Ver programas'], ['#lv-programas', 'Ver programas']];
  var destaques = '<section class="sec w" id="lv-destaques"><div class="ct"><div class="feats st">'+dlist.map(function(d, i){
    return '<article class="ft rv" style="--i:'+i+'"><span class="n">0'+(i+1)+'</span><h3>'+esc(d[0])+'</h3><p>'+esc(d[1])+'</p><a href="'+dLinks[i][0]+'">'+dLinks[i][1]+' '+I.arrow+'</a></article>';
  }).join('')+'</div></div></section>';

  // --- INTRO + contadores reais ---
  var ip = INTRO[modBase] || INTRO.arena;
  var introFoto = url(cx('intro', 'foto', '')) || treino[0] || fachada[0] || '';
  var nEq = Array.isArray(s.equipe) ? s.equipe.length : 0;
  var nums = [];
  if(escada.length) nums.push([escada.length, pecaPl]);
  if(nucs.length) nums.push([nucs.length, nucs.length === 1 ? 'núcleo' : 'núcleos']);
  if(nEq > 1) nums.push([nEq, 'na equipe']);
  var intro = '<section class="w" id="lv-clube" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct intro">'
    + '<div class="ph rv">'+(introFoto ? '<img src="'+esc(introFoto)+'" alt="'+esc(s.nome)+'" loading="lazy">' : '<span class="ini">'+esc(ini)+'</span>')+'<span class="k tape tag">O clube</span></div>'
    + '<div class="rv"><span class="k">'+esc(cx('intro', 'selo', ip[0]))+'</span><h2 class="d">'+esc(cx('intro', 'titulo', ip[1]))+'</h2><p class="lead">'+esc(cx('intro', 'texto', ip[2]))+'</p>'
    + (nums.length ? '<div class="nums">'+nums.map(function(n){ return '<div><b data-count="'+n[0]+'">0</b><span>'+esc(n[1])+'</span></div>'; }).join('')+'</div>' : '')
    + '<a class="btn" href="#lv-contato" data-magnet>'+esc(cx('intro', 'botao', 'Sobre o clube'))+' '+I.arrow+'</a></div></div></section>';

  // --- SPLIT (dois caminhos) ---
  var sp = SPLIT[modBase] || SPLIT.arena;
  var spItens = lista('split', 'itens', 2).filter(function(x){ return cs(x, 'titulo'); });
  var spl = spItens.length ? spItens.map(function(x, i){ return { selo:cs(x, 'selo'), titulo:cs(x, 'titulo'), topicos:linhas(cs(x, 'topicos')), botao:cs(x, 'botao'), foto:url(cs(x, 'foto')) || treino[i+1] || '' }; })
                            : sp.itens.map(function(x, i){ return { selo:x.selo, titulo:x.titulo, topicos:x.topicos, botao:x.botao, foto:treino[i+1] || '' }; });
  var split = '<section class="w" id="lv-caminhos" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('split', 'titulo', sp.titulo))+'</h2></div><div class="split st">'
    + spl.map(function(x, i){
      return '<article class="half rv" style="--i:'+i+'">'+(x.foto ? '<img src="'+esc(x.foto)+'" alt="" loading="lazy">' : '')+'<div>'+(x.selo ? '<span class="k">'+esc(x.selo)+'</span>' : '')+'<h3>'+esc(x.titulo)+'</h3>'
        + (x.topicos.length ? '<ul>'+x.topicos.map(function(tp){ return '<li>'+esc(tp)+'</li>'; }).join('')+'</ul>' : '')
        + '<div class="ac"><a class="btn'+(i ? ' ghost' : '')+'" href="'+esc(ins)+'">'+esc(x.botao || 'Começar')+(i ? '' : ' '+I.arrow)+'</a></div></div></article>';
    }).join('')+'</div></div></section>';

  // --- PROGRAMAS (4) ---
  var pp = PROGS[modBase] || PROGS.arena;
  var pItens = lista('programas', 'itens', 4).filter(function(x){ return cs(x, 'titulo'); });
  var plist = pItens.length ? pItens.map(function(x, i){ return [cs(x, 'titulo'), cs(x, 'texto'), url(cs(x, 'foto')) || treino[i+3] || treino[i] || '']; })
                            : pp.itens.map(function(x, i){ return [x[0], x[1], treino[i+3] || treino[i] || '']; });
  var programas = '<section class="w progs" id="lv-programas" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct"><div class="ropes center rv"><h2 class="d">'+esc(cx('programas', 'titulo', pp.titulo))+'</h2></div><div class="tiles st">'
    + plist.map(function(x, i){
      return '<article class="tile rv'+(x[2] ? '' : ' noimg')+'" style="--i:'+i+'">'+(x[2] ? '<img src="'+esc(x[2])+'" alt="" loading="lazy">' : '')+'<span class="n">0'+(i+1)+'</span><h3>'+esc(x[0])+'</h3>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'<a href="'+esc(ins)+'">Inscrever-se →</a></article>';
    }).join('')+'</div><div class="ac"><a class="btn" href="'+esc(ins)+'" data-magnet>Comece hoje '+I.arrow+'</a></div></div></section>';

  // --- NÍVEIS (escada real) ---
  var niveis = '';
  if(escada.length){
    var nvTx = lista('niveis', 'itens', 12);
    var nTot = escada.length;
    niveis = '<section class="w niv" id="lv-niveis" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('niveis', 'titulo', 'Pronto para um você mais forte'))+'</h2></div>'
      + '<div class="niveis st" style="--n:'+Math.min(nTot, 4)+'">'+escada.map(function(b, j){
        var tx = nvTx[j] || {};
        var cor = b.cor || lighten('#546e7a', j / Math.max(1, nTot - 1) * .5);
        return '<article class="nv rv" style="--i:'+j+';--c:'+esc(cor)+'"><span class="et">'+(j < 9 ? '0' : '')+(j+1)+'</span><div class="band"></div><span class="k">'+esc(cs(tx, 'selo') || ('Etapa '+(j+1)+' de '+nTot))+'</span><h3>'+esc(b.nome)+'</h3>'+(cs(tx, 'texto') ? '<p>'+esc(cs(tx, 'texto'))+'</p>' : '')+'</article>';
      }).join('')+'</div>'
      + '<div class="ac rv"><p>'+esc(cx('niveis', 'texto', 'Cada aluno acompanha no app o termômetro de prontidão rumo '+proxPeca+', com as avaliações da equipe.'))+'</p><a class="btn" href="'+esc(login)+'" data-magnet>'+esc(cx('niveis', 'botao', 'Ver meu nível'))+' '+I.arrow+'</a></div></div></section>';
  }

  // --- CITAÇÃO ---
  var frase = cx('citacao', 'texto', MAXIMA[modBase] || MAXIMA.arena);
  var palavras = frase.split(/\s+/);
  var fraseHTML = palavras.map(function(w, i){ return (i === palavras.length - 1 || (palavras.length > 3 && i === Math.floor(palavras.length / 2) - 1)) ? '<em>'+esc(w)+'</em>' : esc(w); }).join(' ');
  var qFoto = url(cx('citacao', 'foto', '')) || treino[2] || treino[0] || '';
  var autor = cx('citacao', 'autor', ''), cargo = cx('citacao', 'cargo', '');
  var quote = '<section class="quote" id="lv-citacao">'+(qFoto ? '<img src="'+esc(qFoto)+'" alt="" loading="lazy">' : '')
    + '<div class="rv"><blockquote class="d">'+fraseHTML+'</blockquote>'+(autor ? '<cite><b>'+esc(autor)+'</b>'+esc(cargo || s.nomeCurto)+'</cite>' : '')+'</div></section>';

  // --- EQUIPE --- painel → cadastro → líder.
  var mestres = [];
  lista('equipe', 'itens', 6).forEach(function(m){ if(cs(m, 'nome')) mestres.push({ nome:cs(m, 'nome'), grad:cs(m, 'graduacao'), tag:cs(m, 'etiqueta'), bio:cs(m, 'bio'), foto:url(cs(m, 'foto')) }); });
  if(!mestres.length && Array.isArray(s.equipe) && s.equipe.length) s.equipe.forEach(function(m){ if(m && m.nome) mestres.push({ nome:m.nome, grad:m.graduacao || '', tag:'', bio:m.bio || '', foto:url(m.foto) }); });
  if(!mestres.length) mestres.push({ nome:s.lider, grad:(s.responsavel && s.responsavel.graduacao) || tituloLider, tag:'', bio:'', foto:url(s.fotoLider) });
  var equipe = '<section class="sec w" id="lv-equipe"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('equipe', 'titulo', 'Resultado vem de quem treina você'))+'</h2></div><div class="coaches st" style="--n:'+Math.min(mestres.length, 3)+'">'
    + mestres.slice(0, 6).map(function(m, i){
      return '<article class="co rv" style="--i:'+i+'"><div class="ph">'+(m.foto ? '<img src="'+esc(m.foto)+'" alt="'+esc(m.nome)+'" loading="lazy">' : '<span class="ini">'+esc(initials(m.nome))+'</span>')+'</div>'
        + '<span class="k tape lbl">'+esc(m.tag || (i === 0 ? tituloLider : tituloLider))+'</span><div class="tx">'+(m.grad ? '<span class="k">'+esc(m.grad)+'</span>' : '')+'<h3>'+esc(m.nome)+'</h3>'
        + '<p>'+esc(m.bio || ('À frente dos treinos de '+V.nomeMod+' na '+s.nomeCurto+', com técnica, respeito e atenção a cada aluno.'))+'</p></div></article>';
    }).join('')+'</div></div></section>';

  // --- HORÁRIOS (só do painel) ---
  var horarios = '';
  if(temHor){
    var porDia = {}; DIAS.forEach(function(d){ porDia[d[0]] = []; });
    horItens.forEach(function(x){ var d = String(cs(x, 'dia') || '').toLowerCase().replace(/[áàâã]/g, 'a').slice(0, 3); if(porDia[d]) porDia[d].push(x); });
    horarios = '<section class="w hor" id="lv-horarios" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('horarios', 'titulo', 'Semana no '+V.local))+'</h2></div><div class="sched st">'
      + DIAS.map(function(d, i){
        var its = porDia[d[0]];
        return '<div class="day'+(its.length ? '' : ' off')+' rv" style="--i:'+i+'"><h4>'+d[1].slice(0, 3)+'</h4><ul>'+(its.length ? its.map(function(x){ return '<li><b>'+esc(cs(x, 'aula'))+'</b><span>'+esc([cs(x, 'horario'), cs(x, 'local')].filter(Boolean).join(' · '))+'</span></li>'; }).join('') : '<li><b>Descanso</b><span>Sem aula</span></li>')+'</ul></div>';
      }).join('')+'</div>'
      + '<div class="note rv"><span>'+esc(cx('horarios', 'nota', 'Horários sujeitos a alteração — o app avisa. Check-in de presença em um toque.'))+'</span><a class="btn ghost" href="'+esc(zapHref || ins)+'"'+(zapHref ? ' target="_blank" rel="noopener noreferrer"' : '')+'>Agendar aula experimental</a></div></div></section>';
  }


  // --- AGENDA E AVISOS (só do app; sem dados, a seção não entra) ---
  var evApp = eventosDoApp(s, 4), avApp = avisosDoApp(s, 3), agenda = '';
  if(evApp.length || avApp.length){
    agenda = '<section class="w agd" id="lv-agenda" style="padding-bottom:clamp(84px,10vw,150px)"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('agenda', 'titulo', 'Agenda e avisos'))+'</h2></div><div class="agd-grid st">'
      + '<div class="agd-ev rv" style="--i:0"><span class="k">Próximos eventos</span><ul>'+(evApp.length ? evApp.map(function(e){
          return '<li><span class="dt'+(e.dia ? '' : ' sem')+'">'+(e.dia ? '<b>'+esc(e.dia)+'</b><small>'+esc(e.mes)+'</small>' : I.cal)+'</span><div><b class="t">'+esc(e.titulo)+'</b><span>'+esc([e.local, e.hora].filter(Boolean).join(' · '))+'</span></div></li>';
        }).join('') : '<li><span class="dt sem">'+I.cal+'</span><div><b class="t">Sem eventos marcados</b><span>Os próximos aparecem aqui assim que forem publicados no app.</span></div></li>')+'</ul>'
      + '<span class="sync"><i></i>Sincronizado com o app '+esc(s.nomeCurto)+'</span></div>'
      + '<div class="agd-av rv" style="--i:1"><span class="k">Avisos</span>'+(avApp.length ? avApp.map(function(a){
          return '<div class="av"><span class="ic">'+I.bell+'</span><div><b>'+esc(a.titulo)+'</b>'+(a.texto ? '<p>'+esc(a.texto)+'</p>' : '')+(a.quando ? '<small>'+esc(a.quando)+'</small>' : '')+'</div></div>';
        }).join('') : '<div class="av"><span class="ic">'+I.bell+'</span><div><b>Nenhum aviso no momento</b><p>Avisos publicados no app aparecem aqui.</p></div></div>')+'</div></div></div></section>';
  }

  // --- APP E REDE ---
  var rec = [
    [I.gauge, 'Termômetro de prontidão', 'Avaliações da equipe e o caminho '+proxPeca, login],
    [I.card,  'Carteirinha digital', 'Identificação do atleta com '+s.peca+' e núcleo', R('carteirinha')],
    [I.qr,    'Check-in no treino', 'Presença registrada em um toque', R('checkin')],
    [I.cal,   'Campeonatos e agenda', 'Eventos da equipe e inscrições', R('campeonatos')],
    [I.award, 'Certificados', 'Graduações e participações registradas', R('certificados')],
    [I.net,   'Rede da equipe', 'Avisos, stories e mensagens só para quem treina', R('rede')]
  ].map(function(r){ return '<li><a href="'+esc(r[3])+'"><span class="ic">'+r[0]+'</span><span><b>'+esc(r[1])+'</b><small>'+esc(r[2])+'</small></span></a></li>'; }).join('');
  var c1 = (escada[0] && escada[0].cor) || '#546e7a', c2 = (escada.length > 1 && escada[escada.length-1].cor) || t.acc;
  var prox = escada.length > 1 ? escada[1].nome : '';
  var phone = '<div class="phone-wrap"><div class="phone rv" aria-hidden="true" style="--c1:'+esc(c1)+';--c2:'+esc(c2)+'"><span class="side"></span><div class="scr"><div class="island"></div>'
    + '<div class="status"><span>19:24</span><span>●●● <i></i></span></div>'
    + '<div class="hdr"><div class="who"><span class="av">'+(logo ? '<img src="'+esc(logo)+'" alt="">' : esc(ini))+'</span><div><small>Boa noite, atleta</small><b>'+esc(s.nomeCurto)+'</b></div></div><span class="bell">'+I.bell+'</span></div>'
    + '<div class="body"><div class="card2"><span class="k">Termômetro de prontidão</span><div class="lvl"><b>'+esc(escada[0] ? escada[0].nome : 'Nível atual')+'</b><span>rumo '+esc(proxPeca)+'</span></div><div class="therm"><i></i></div>'+(prox ? '<div class="nxt"><span>Próximo: <b>'+esc(prox)+'</b></span><span>avaliações da equipe</span></div>' : '')+'</div>'
    + '<div class="acts"><span class="act on">'+I.qr+'Check-in</span><span class="act">'+I.card+'Carteirinha</span><span class="act">'+I.cal+'Agenda</span><span class="act">'+I.net+'Rede</span></div>'
    + '<div class="card2 next"><div class="dt">'+I.cal+'</div><div><b class="t">Próximo treino</b><span>'+esc(temHor ? 'Veja o quadro da semana' : 'Horários na área do aluno')+'</span></div><span class="go">'+I.arrow+'</span></div>'
    + '<div class="card2 pres"><span class="k">Presenças do mês</span><div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i></div><div class="nxt"><span>check-in em um toque</span><span>'+esc(s.nomeCurto)+'</span></div></div></div>'
    + '<div class="tabs"><span class="on">'+I.home+'Início</span><span>'+I.gauge+'Nível</span><span>'+I.cal+'Agenda</span><span>'+I.net+'Rede</span><span>'+I.user+'Perfil</span></div><span class="home"></span></div></div></div>';
  var appSec = '<section class="appsec" id="lv-app"><div class="ct"><div class="rv"><span class="k">'+esc(cx('app', 'selo', 'App AtletaPay · '+s.nomeCurto))+'</span><h2 class="d">'+esc(cx('app', 'titulo', 'O clube inteiro no bolso'))+'</h2>'
    + '<p class="lead">'+esc(cx('app', 'texto', 'Sem loja de aplicativos: instala direto deste site. '+s.peca.charAt(0).toUpperCase()+s.peca.slice(1)+', carteirinha, check-in e agenda no mesmo lugar.'))+'</p>'
    + '<ul class="rec">'+rec+'</ul><div class="ac"><a class="btn" href="'+esc(R('instalar'))+'" data-magnet><img src="assets/app-icon-192.png" alt="" width="24" height="24">Instalar o app</a><a class="btn ghost" href="'+esc(R('instalar-rede'))+'"><img src="assets/rede-icon-192.png" alt="" width="24" height="24">Instalar a Rede</a></div></div>'+phone+'</div></section>';

  // --- CONTATO + MAPA --- geo → OpenStreetMap (embed feito para iframe); só endereço → Google por endereço; nada → malha.
  var geo = s.geo && isFinite(Number(s.geo.lat)) && isFinite(Number(s.geo.lng)) ? { lat:Number(s.geo.lat), lng:Number(s.geo.lng) } : null;
  var enderecoFull = s.endereco ? s.endereco+(s.cidade ? ', '+s.cidade : '')+(s.uf ? ' - '+s.uf : '') : '';
  var mapa = geo
    ? '<iframe title="Mapa" src="https://www.openstreetmap.org/export/embed.html?bbox='+esc((geo.lng-0.013).toFixed(4))+'%2C'+esc((geo.lat-0.01).toFixed(4))+'%2C'+esc((geo.lng+0.013).toFixed(4))+'%2C'+esc((geo.lat+0.01).toFixed(4))+'&amp;layer=mapnik&amp;marker='+esc(geo.lat.toFixed(5))+'%2C'+esc(geo.lng.toFixed(5))+'" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    : (enderecoFull ? '<iframe title="Mapa" src="https://www.google.com/maps?q='+esc(encodeURIComponent(enderecoFull))+'&amp;z=16&amp;hl=pt-BR&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' : mapaGrade());
  var mapsQ = geo ? geo.lat.toFixed(6)+','+geo.lng.toFixed(6) : enderecoFull;
  var mapsHref = mapsQ ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mapsQ) : '';
  var contato = '<section class="sec w" id="lv-contato"><div class="ct"><div class="contact"><div class="card rv">'
    + '<span class="k">'+esc(cx('contato', 'selo', 'Estamos aqui para o seu próximo round'))+'</span><h2 class="d" style="margin-top:10px">'+esc(cx('contato', 'titulo', 'Fale com a gente'))+'</h2>'
    + '<p class="ds">'+esc(cx('contato', 'texto', 'Venha conhecer o '+V.local+'. A inscrição é feita pelo AtletaPay, rápida e segura'+(zap ? '; a primeira aula a gente marca pelo WhatsApp.' : '.')))+'</p>'
    + '<div class="cc"><div><h4>'+I.pin+'Local</h4><p>'+(s.endereco ? esc(s.endereco)+'<br>' : '')+esc(s.cidade)+(s.uf ? ' · '+esc(s.uf) : '')+'</p></div>'
    + '<div><h4>'+I.clock+'Treinos</h4><p>'+(nucs.length ? esc(plural(nucs.length, 'núcleo ativo', 'núcleos ativos'))+'<br>' : '')+(temHor ? 'Quadro da semana acima' : 'Horários na área do aluno')+'</p></div>'
    + '<div><h4>'+I.share+'Social</h4>'+(s.instagram ? '<a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a>' : '')+(s.dominio ? '<a href="https://'+esc(s.dominio)+'" target="_blank" rel="noopener noreferrer">'+esc(s.dominio)+'</a>' : '')+'<a href="'+esc(login)+'">Área do aluno</a></div>'
    + (zap ? '<div><h4>'+I.zap+'WhatsApp</h4><a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">'+esc(zapFmt)+'</a></div>' : '')+'</div>'
    + '<div class="ac"><a class="btn" href="'+esc(ins)+'" data-magnet>Fazer inscrição '+I.arrow+'</a>'+(zapHref ? '<a class="btn ghost" href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>' : '')+'</div></div>'
    + '<div class="map rv">'+mapa+(mapsHref ? '<a class="btn openmap" href="'+esc(mapsHref)+'" target="_blank" rel="noopener noreferrer">Abrir no Maps</a>' : '')+'</div></div></div></section>';

  // --- FOOTER ---
  var foot = '<footer class="foot"><div class="ct">'+marca
    + '<div class="sys"><span class="k">Sistema</span><nav aria-label="Sistema"><a href="'+esc(login)+'">Área do aluno</a><a href="'+esc(ins)+'">Inscrição</a><a href="'+esc(R('admin'))+'">Professores</a><a href="'+esc(R('instalar'))+'">Instalar o app</a><a href="'+esc(R('privacidade'))+'">Privacidade</a></nav></div>'
    + '<p class="cp">© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b> · atletapay.com.br/'+esc(s.slug)+'</p></div></footer>';

  site.className = 'lv';

  // --- LOJA OFICIAL (só com produtos; sem foto = desenho pelo nome) ---
  var prods = produtosLoja(C, 8), loja = '';
  var zapLoja = cx('loja', 'whatsapp', '') || cx('contato', 'whatsapp', '');
  var coresLoja = { principal:(s.cores && s.cores.principal) || '', destaque:(s.cores && (s.cores.botao || s.cores.destaque)) || '' };
  function ljMidia(p){ var f = url(p.foto); return f ? '<img src="'+esc(f)+'" alt="'+esc(p.nome)+'" loading="lazy">' : '<span class="lj-svg" role="img" aria-label="'+esc(p.nome)+'">'+ilustracao(p.nome, coresLoja)+'</span>'; }
  function ljBotao(p, cls, inner){ var w = linkCompra(zapLoja, p); return w ? '<a class="'+cls+'" href="'+esc(w)+'" target="_blank" rel="noopener noreferrer">'+inner+'</a>' : ''; }
  if(prods.length){
    loja = '<section class="sec w lojas" id="lv-loja"><div class="ct"><div class="ropes rv"><h2 class="d">'+esc(cx('loja', 'titulo', 'Loja oficial'))+'</h2></div>'
      + '<p class="lj-lead rv">'+esc(cx('loja', 'texto', 'Equipamento escolhido pela equipe para treinar do jeito certo — do primeiro treino ao dia da luta.'))+'</p><div class="lj-grid st">'
      + prods.map(function(x, i){ return '<article class="lj rv" style="--i:'+i+'"><div class="lj-ph">'+ljMidia(x)+'<span class="tape" aria-hidden="true"></span></div><div class="lj-tx"><h3>'+esc(x.nome)+'</h3>'+(x.texto ? '<p>'+esc(x.texto)+'</p>' : '')
        + '<div class="lj-ft">'+(x.preco ? '<b class="d">'+esc(x.preco)+'</b>' : '<span></span>')+ljBotao(x, 'btn', 'Comprar '+I.arrow)+'</div></div></article>'; }).join('')+'</div></div></section>';
  }
  site.innerHTML = hero + mq + destaques + intro + split + programas + niveis + quote + equipe + horarios + agenda + loja + appSec + contato + foot;
  wire(site);
}

/* ========================================================================== */
/*  Comportamento                                                              */
/* ========================================================================== */
function wire(site){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  site.classList.add('js');
  var burger = site.querySelector('#lv-burger'), nl = site.querySelector('#lv-nl');
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
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if(!e.isIntersecting) return; e.target.classList.add('in'); e.target.querySelectorAll('[data-count]').forEach(count); io.unobserve(e.target); }); }, { threshold:.14, rootMargin:'0px 0px -6% 0px' });
    site.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });
  } else {
    site.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); el.querySelectorAll('[data-count]').forEach(count); });
  }
  if(reduce) return;
  var heroImg = site.querySelector('.hero .media img'), ticking = false;
  addEventListener('scroll', function(){ if(ticking) return; ticking = true; requestAnimationFrame(function(){ if(heroImg && scrollY < innerHeight*1.2) heroImg.style.translate = '0 '+(scrollY*.18)+'px'; ticking = false; }); }, { passive:true });
  if(matchMedia('(hover:hover)').matches){
    site.querySelectorAll('[data-magnet]').forEach(function(b){
      b.addEventListener('mousemove', function(e){ var r = b.getBoundingClientRect(); b.style.transform = 'translate('+((e.clientX-r.left-r.width/2)*.22)+'px,'+((e.clientY-r.top-r.height/2)*.28)+'px)'; });
      b.addEventListener('mouseleave', function(){ b.style.transform = ''; });
    });
    var ph = site.querySelector('.phone');
    if(ph){
      ph.addEventListener('mousemove', function(e){ var r = ph.getBoundingClientRect(), x = (e.clientX-r.left)/r.width-.5, y = (e.clientY-r.top)/r.height-.5; ph.style.transform = 'perspective(900px) rotateX('+(-y*10)+'deg) rotateY('+(x*13)+'deg)'; });
      ph.addEventListener('mouseleave', function(){ ph.style.transform = ''; });
    }
  }
}
