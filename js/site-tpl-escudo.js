/* site-tpl-escudo.js — Template "escudo" do site público por escola (F4.3, pré-build #3).
 *
 * Direção: academia esportiva clara e energética. Marinho profundo com hachura diagonal
 * sutil, UM acento (cor de botão/destaque da escola; padrão amarelo tático), paralelogramos
 * em botões, molduras, etiquetas e amostras de cor, bordas de seção inclinadas, tipografia
 * condensada em caixa alta (Barlow Condensed) com a palavra-chave em itálico no acento.
 * Nasceu para Krav Maga / defesa pessoal; serve qualquer modalidade (tabelas abaixo).
 *
 * Seções: hero (texto + foto inclinada + contadores reais) · faixa de 4 serviços · quadro de
 * graduação (escada real, em tabela) + agenda (editável) · princípios · para quem é · chamada
 * "eleve o seu nível" · equipe · quadro semanal em tabela (editável) · App e Rede · parceiros
 * (logos editáveis) + galeria (fotos de treino) · rodapé em colunas com contato e Sistema.
 *
 * Contrato da biblioteca (site-templates.js): render(s, h) + schema + meta.
 *   h — { esc, url, VOCAB, LIDER, modalidadeBase, modalidade }.
 * Segurança: todo texto por h.esc(); toda URL por h.url(); cor de faixa revalidada; nenhum
 * handler inline; links externos com rel="noopener noreferrer". Nada inventado: números só os
 * reais; agenda/horários/parceiros/WhatsApp só se a escola preencher.
 * Responsivo: 1280 (menu vira hambúrguer), 1100 (hero 1 col., pares em 1 col.), 760 (1 col.;
 * tabelas rolam no próprio contêiner), 480 (galeria 2 col.).
 */

export var meta = {
  nome: 'Escudo',
  descricao: 'Academia esportiva clara: marinho com hachura, acento tático, paralelogramos, quadro de graduação em tabela, agenda, quadro semanal, parceiros e galeria.',
  modalidades: ['kravmaga', 'judo', 'taekwondo', 'todas']
};

var DIAS = [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']];
var MESES = [['01', 'Jan'], ['02', 'Fev'], ['03', 'Mar'], ['04', 'Abr'], ['05', 'Mai'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Ago'], ['09', 'Set'], ['10', 'Out'], ['11', 'Nov'], ['12', 'Dez']];
export var schema = { secoes: [
  { id:'hero', r:'Topo', ajuda:'Título em duas linhas (a palavra em destaque fica em itálico no acento) + linha menor com o nome. Sem foto aqui, entra a fachada do cadastro.', campos:[
    { c:'linha1', r:'Título — linha 1', max:18, ph:'Formamos' }, { c:'linha2', r:'Título — linha 2', max:18, ph:'pessoas' }, { c:'destaque', r:'Palavra em destaque (fim da linha 2)', max:14, ph:'prontas' },
    { c:'texto', r:'Texto', t:'area', max:220 }, { c:'botao', r:'Botão principal', max:24, ph:'Comece hoje' }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'servicos', r:'Serviços', ajuda:'A faixa colorida com quatro argumentos logo abaixo do topo.', campos:[
    { c:'itens', r:'Serviços', t:'lista', max:4, resumo:'titulo', nomeItem:'Serviço', item:[ { c:'titulo', r:'Título', max:34 }, { c:'texto', r:'Texto', t:'area', max:120 } ] } ] },
  { id:'graduacao', r:'Quadro de graduação', ajuda:'As graduações e cores vêm da escada cadastrada. Aqui você nomeia a etapa de cada uma, na mesma ordem.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Escada da escola' }, { c:'titulo', r:'Título', max:40, ph:'Quadro de graduação' }, { c:'botao', r:'Botão', max:30, ph:'Ver minha graduação' },
    { c:'itens', r:'Etapas (na ordem da escada)', t:'lista', max:12, resumo:'etapa', nomeItem:'Etapa', item:[ { c:'etapa', r:'Nome da etapa', max:24, ph:'Iniciante' }, { c:'sigla', r:'Sigla (coluna da direita)', max:6, ph:'P1' } ] } ] },
  { id:'agenda', r:'Agenda', ajuda:'Próximos eventos. Sem itens, mostra só o link para os campeonatos.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Próximos' }, { c:'titulo', r:'Título', max:30, ph:'Agenda' },
    { c:'itens', r:'Eventos', t:'lista', max:6, resumo:'titulo', nomeItem:'Evento', item:[ { c:'dia', r:'Dia (número)', max:2, ph:'08' }, { c:'mes', r:'Mês', t:'select', opcoes:MESES, ph:'Mês' }, { c:'titulo', r:'Evento', max:50 }, { c:'local', r:'Local / detalhe', max:60 }, { c:'hora', r:'Hora', max:8, ph:'09:00' } ] } ] },
  { id:'principios', r:'Princípios', ajuda:'Bloco com foto à esquerda. Tópicos: um por linha.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Quem somos' }, { c:'titulo', r:'Título', max:40, ph:'Princípios da escola' }, { c:'destaque', r:'Parte do título em destaque', max:20, ph:'da escola' },
    { c:'texto', r:'Texto', t:'area', max:400 }, { c:'topicos', r:'Tópicos (um por linha)', t:'area', max:300, linhas:3 }, { c:'botao', r:'Botão', max:30 }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'publico', r:'Para quem é', ajuda:'Bloco com foto à direita. Tópicos: um por linha.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Para todos' }, { c:'titulo', r:'Título', max:40 }, { c:'destaque', r:'Parte do título em destaque', max:20 },
    { c:'texto', r:'Texto', t:'area', max:400 }, { c:'topicos', r:'Tópicos (um por linha)', t:'area', max:300, linhas:3 }, { c:'botao', r:'Botão', max:30 }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'cta', r:'Chamada', ajuda:'Faixa escura com texto e foto.', campos:[
    { c:'selo', r:'Etiqueta', max:40 }, { c:'titulo', r:'Título', max:40, ph:'Eleve o seu nível' }, { c:'destaque', r:'Parte do título em destaque', max:20, ph:'nível' },
    { c:'texto', r:'Texto', t:'area', max:300 }, { c:'botao', r:'Botão', max:24, ph:'Comece hoje' }, { c:'foto', r:'Foto', t:'foto' } ] },
  { id:'equipe', r:'Equipe', ajuda:'Lista vazia = equipe do cadastro.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Instrutores' }, { c:'titulo', r:'Título', max:40, ph:'Quem treina você' },
    { c:'itens', r:'Pessoas', t:'lista', max:6, resumo:'nome', nomeItem:'Pessoa', item:[ { c:'nome', r:'Nome', max:60 }, { c:'graduacao', r:'Graduação / título', max:40 }, { c:'etiqueta', r:'Etiqueta (ex.: Instrutor-chefe)', max:24 }, { c:'bio', r:'Apresentação', t:'area', max:200 }, { c:'foto', r:'Foto', t:'foto' } ] } ] },
  { id:'horarios', r:'Horários', ajuda:'Quadro semanal em tabela. Sem itens, a seção não aparece.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Sessões de treino' }, { c:'titulo', r:'Título', max:40, ph:'Quadro semanal' }, { c:'nota', r:'Observação abaixo do quadro', max:140 },
    { c:'itens', r:'Aulas', t:'lista', max:30, resumo:'aula', nomeItem:'Aula', item:[ { c:'dia', r:'Dia', t:'select', opcoes:DIAS, ph:'Dia da semana' }, { c:'aula', r:'Aula', max:40 }, { c:'horario', r:'Horário', max:20, ph:'19:00–20:30' }, { c:'local', r:'Local / núcleo', max:40 } ] } ] },
  { id:'app', r:'App e Rede', campos:[ { c:'selo', r:'Etiqueta', max:50 }, { c:'titulo', r:'Título', max:40, ph:'A escola no bolso' }, { c:'texto', r:'Texto', t:'area', max:220 } ] },
  { id:'parceiros', r:'Parceiros e galeria', ajuda:'Logos dos parceiros (PNG sem fundo fica melhor). A galeria usa as fotos de treino do cadastro; aqui você pode trocar até 6.', campos:[
    { c:'selo', r:'Etiqueta', max:40, ph:'Parceiros' }, { c:'titulo', r:'Título', max:40, ph:'Quem treina com a gente' },
    { c:'itens', r:'Parceiros', t:'lista', max:8, resumo:'nome', nomeItem:'Parceiro', item:[ { c:'nome', r:'Nome', max:30 }, { c:'logo', r:'Logo', t:'foto', png:true }, { c:'link', r:'Site (https://…)', t:'link', max:120 } ] },
    { c:'fotos', r:'Fotos da galeria', t:'lista', max:6, resumo:'legenda', nomeItem:'Foto', item:[ { c:'foto', r:'Foto', t:'foto' }, { c:'legenda', r:'Legenda curta', max:30 } ] } ] },
  { id:'contato', r:'Contato', ajuda:'Endereço e Instagram vêm do cadastro. Com WhatsApp aparece o número no rodapé e "Agendar aula experimental" abre a conversa.', campos:[
    { c:'frase', r:'Frase do rodapé', max:140, ph:'Todo mundo volta para casa.' },
    { c:'whatsapp', r:'WhatsApp (só números, com DDD)', max:13, ph:'67999990000' }, { c:'msgWhatsapp', r:'Mensagem pronta do WhatsApp', max:140 } ] }
] };

/* ========================================================================== */
/*  Vocabulário por modalidade                                                 */
/* ========================================================================== */
var HERO = { // [linha1, linha2, destaque]
  kravmaga: ['Formamos', 'pessoas', 'prontas'], judo: ['Caminho', 'suave, base', 'firme'], taekwondo: ['Chute alto,', 'cabeça', 'erguida'],
  karate: ['Técnica,', 'respeito,', 'resultado'], jiujitsu: ['Base,', 'guarda,', 'finalização'], capoeira: ['Onde a roda', 'não', 'para'],
  boxe: ['Encontre', 'o lutador', 'em você'], muaythai: ['Oito armas,', 'uma', 'disciplina'], mma: ['Completo', 'por', 'natureza'],
  arena: ['Formamos', 'atletas', 'completos']
};
var LEAD = {
  kravmaga: 'Defesa pessoal realista para o dia a dia: técnica simples, decisão rápida e condicionamento. Turmas para iniciantes, mulheres, jovens e preparação avançada.',
  arena: 'Técnica correta, condicionamento com método e respeito em primeiro lugar. Turmas para iniciantes, jovens, adultos e quem quer competir.'
};
var SERVICOS = {
  kravmaga: [['Treino intensivo em grupo', 'Aulas em turma com cenários reais, do básico ao avançado.'], ['Desenvolvimento avançado', 'Preparação para graduação e para quem quer ir além da defesa básica.'], ['Técnicas por situação', 'Agarrões, ameaças com objetos, chão, múltiplos agressores: uma resposta para cada cenário.'], ['Condicionamento personalizado', 'Força, cardio e resistência ao estresse, no ritmo de cada aluno.']],
  arena: [['Treino intensivo em grupo', 'Aulas em turma, do básico ao avançado, com correção individual.'], ['Desenvolvimento avançado', 'Preparação para graduação e competição.'], ['Técnica por fundamento', 'Cada fundamento repetido até virar reflexo.'], ['Condicionamento personalizado', 'Força, cardio e mobilidade no ritmo de cada aluno.']]
};
var PRINCIPIOS = {
  kravmaga: { selo:'Quem somos', titulo:'Princípios', destaque:'da escola', texto:'Formamos alunos capazes de reconhecer o perigo, decidir rápido e voltar para casa. Técnica simples, repetida sob pressão, para qualquer idade e condição física.', topicos:['Programas por nível, do iniciante ao instrutor', 'Acompanhamento individual e avaliação por critérios no app', 'Workshops abertos e cursos de férias'], botao:'Programas e turmas' },
  arena: { selo:'Quem somos', titulo:'Princípios', destaque:'da escola', texto:'Técnica antes de força, respeito antes de tudo. Formamos atletas e pessoas, no tempo de cada um.', topicos:['Programas por graduação, do iniciante ao avançado', 'Acompanhamento individual e avaliação por critérios no app', 'Eventos e treinos abertos'], botao:'Programas e turmas' }
};
var PUBLICO = {
  kravmaga: { selo:'Para todos', titulo:'Defesa pessoal', destaque:'para todos', texto:'Turmas abertas para a comunidade e um caminho de alto desempenho para quem quer se graduar e virar instrutor. Mulheres, jovens, adultos e profissionais de segurança treinam no mesmo tatame, cada um no seu ritmo.', topicos:['Feminino: cenários reais e confiança', 'Jovens: disciplina, limites e prevenção', 'Avançado: múltiplos agressores e armas'], botao:'Conheça a equipe' },
  arena: { selo:'Para todos', titulo:'Treino', destaque:'para todos', texto:'Turmas abertas para a comunidade e um caminho de alto desempenho para quem quer competir. Crianças, jovens e adultos treinam sob a mesma bandeira, cada um no seu ritmo.', topicos:['Infantil: coordenação, disciplina e confiança', 'Adultos: técnica e condicionamento', 'Competição: preparação completa'], botao:'Conheça a equipe' }
};
var CTA = {
  kravmaga: { selo:'Krav Maga coaching', titulo:'Eleve o seu', destaque:'nível', texto:'Construa a base, melhore a técnica e teste sob pressão com o programa de alto desempenho. Avaliação por critérios, termômetro de prontidão e a próxima graduação sempre à vista.' },
  arena: { selo:'Alto desempenho', titulo:'Eleve o seu', destaque:'nível', texto:'Construa a base, melhore a técnica e evolua com acompanhamento individual. Avaliação por critérios, termômetro de prontidão e a próxima graduação sempre à vista.' }
};

/* ========================================================================== */
/*  CSS (escopado em .es; marinho e acento vêm da escola). Base gerada do mockup aprovado. */
/* ========================================================================== */
var CSS_BASE = '\
.es .w{padding-inline:var(--g)}\
.es .ct{max-width:1360px;margin-inline:auto}\
.es .d{font-family:var(--display);font-weight:800;text-transform:uppercase;line-height:.92;letter-spacing:.005em;text-wrap:balance}\
.es .d em{font-style:italic;color:var(--acc)}\
.es .k{font-family:var(--display);font-weight:700;font-size:.9rem;letter-spacing:.22em;text-transform:uppercase;color:var(--mute)}\
.es .k::before{content:"";display:inline-block;width:28px;height:3px;background:var(--acc);margin-right:10px;vertical-align:middle;transform:skewX(var(--sk))}\
.es .btn{position:relative;display:inline-flex;align-items:center;gap:.6em;background:var(--acc);color:var(--acc-ink);font-family:var(--display);font-weight:800;font-size:clamp(1rem,.9rem + .4vw,1.2rem);letter-spacing:.08em;text-transform:uppercase;padding:.85em 1.7em;transform:skewX(var(--sk));transition:transform .5s var(--ease),box-shadow .5s var(--ease);isolation:isolate;overflow:hidden;border:0;cursor:pointer;white-space:nowrap}\
.es .btn>*{display:inline-block;transform:skewX(calc(var(--sk)*-1))}\
.es .btn::before{content:"";position:absolute;inset:0;background:var(--navy);transform:translateX(-101%);transition:transform .5s var(--ease);z-index:-1}\
.es .btn:hover{color:var(--white);transform:skewX(var(--sk)) translateY(-2px);box-shadow:0 16px 30px -16px rgba(12,26,43,.5)}\
.es .btn:hover::before{transform:none}\
.es .btn svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.es .btn:hover svg{transform:skewX(calc(var(--sk)*-1)) translateX(4px)}\
.es .btn.ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 2px currentColor}\
.es .btn.ghost::before{background:var(--acc)}\
.es .btn.ghost:hover{color:var(--acc-ink);box-shadow:inset 0 0 0 2px var(--acc)}\
.es .btn.dark{background:var(--navy);color:var(--white)}\
.es .btn.dark::before{background:var(--acc)}\
.es .btn.dark:hover{color:var(--acc-ink)}\
.es .nav{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:clamp(16px,2.2vw,28px) var(--g);color:var(--white)}\
.es .logo{display:flex;align-items:center;gap:12px;font-family:var(--display);font-weight:800;font-size:1.55rem;text-transform:uppercase;letter-spacing:.02em}\
.es .logo .mk{width:46px;height:46px;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;transform:skewX(var(--sk));font-size:1.15rem;transition:transform .6s var(--ease)}\
.es .logo .mk span{display:block;transform:skewX(calc(var(--sk)*-1))}\
.es .logo:hover .mk{transform:skewX(var(--sk)) rotate(-6deg)}\
.es .logo small{display:block;font-family:var(--text);font-weight:600;font-size:.64rem;letter-spacing:.3em;color:var(--acc);line-height:1}\
.es .nl{display:flex;gap:clamp(12px,1.6vw,24px);align-items:center}\
.es .nl a{position:relative;font-family:var(--display);font-weight:700;font-size:.98rem;text-transform:uppercase;letter-spacing:.08em;padding:.3em 0;white-space:nowrap}\
.es .nl a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:var(--acc);transform:scaleX(0) skewX(var(--sk));transform-origin:right;transition:transform .45s var(--ease)}\
.es .nl a:hover::after{transform:scaleX(1) skewX(var(--sk));transform-origin:left}\
.es .nl .btn{padding:.55em 1.1em;font-size:.95rem;margin-left:6px}\
.es .burger{display:none;background:none;border:2px solid currentColor;color:inherit;padding:.5em .9em;font:inherit;font-weight:700;cursor:pointer}\
.es .hero{position:relative;background:var(--navy);color:var(--white);min-height:clamp(620px,92svh,860px);display:grid;grid-template-columns:1.05fr .95fr;align-items:center;overflow:hidden;isolation:isolate}\
.es .hero::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-60deg,rgba(255,255,255,.03) 0 2px,transparent 2px 22px);z-index:0}\
.es .hero .tx{position:relative;z-index:2;padding:clamp(130px,18vh,180px) var(--g) clamp(60px,8vw,100px)}\
.es .hero .k{color:var(--acc-2)}\
.es .hero h1{font-size:clamp(2.8rem,1rem + 6.2vw,6.8rem);margin-top:14px}\
.es .hero h1 .l{display:block;overflow:hidden;padding-top:.08em;margin-top:-.08em}\
.es .hero h1 .l span{display:block;transform:translateY(110%);animation:es-rise .9s var(--ease) forwards}\
.es .hero h1 .sub{font-size:.44em;font-weight:700;letter-spacing:.06em;white-space:nowrap}\
.es .hero p.lead{margin-top:20px;max-width:50ch;color:rgba(255,255,255,.78);opacity:0;animation:es-fade .9s var(--ease) .55s forwards}\
.es .hero .cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:30px;opacity:0;animation:es-fade .9s var(--ease) .75s forwards}\
.es .hero .ph{position:relative;z-index:1;height:100%;min-height:420px;clip-path:polygon(16% 0,100% 0,100% 100%,0 100%);overflow:hidden}\
.es .hero .ph img{width:100%;height:100%;object-fit:cover;object-position:center;transform:scale(1.06);animation:es-kb 18s cubic-bezier(.65,0,.35,1) infinite alternate}\
.es .hero .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--navy) 0,rgba(12,26,43,.2) 35%,transparent 60%)}\
.es .hero .stripe{position:absolute;right:0;bottom:0;width:38%;height:14px;background:var(--acc);clip-path:polygon(4% 0,100% 0,100% 100%,0 100%);z-index:3}\
.es .hero .stat{display:flex;gap:clamp(20px,3vw,44px);margin-top:clamp(28px,4vw,44px);padding-top:22px;border-top:1px solid rgba(255,255,255,.14);opacity:0;animation:es-fade .9s var(--ease) .95s forwards}\
.es .hero .stat b{display:block;font-family:var(--display);font-weight:800;font-size:clamp(1.8rem,1.3rem + 1.8vw,3rem);line-height:1;color:var(--acc)}\
.es .hero .stat span{display:block;font-size:.74rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.7)}\
@keyframes es-rise{to{transform:none}}\
@keyframes es-fade{to{opacity:1}}\
@keyframes es-kb{to{transform:scale(1.16) translate(-1.5%,1%)}}\
.es .serv{background:var(--acc);color:var(--acc-ink);clip-path:polygon(0 0,100% 3vw,100% 100%,0 calc(100% - 3vw));margin-top:-3vw;position:relative;z-index:4;padding:clamp(70px,8vw,110px) var(--g) clamp(80px,9vw,120px)}\
.es .serv .ct{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}\
.es .sv{padding:clamp(18px,2vw,28px);border-left:2px solid rgba(12,26,43,.18);transition:transform .5s var(--ease)}\
.es .sv:hover{transform:translateY(-6px)}\
.es .sv .n{font-family:var(--display);font-weight:800;font-size:2.6rem;line-height:1;opacity:.35}\
.es .sv h3{font-family:var(--display);font-weight:800;font-size:clamp(1.4rem,1.1rem + .9vw,1.8rem);text-transform:uppercase;line-height:.95;margin-top:8px;max-width:14ch;overflow-wrap:anywhere}\
.es .sv p{margin-top:8px;font-size:.95rem;opacity:.8;max-width:30ch}\
.es .sv a{display:inline-flex;gap:8px;align-items:center;margin-top:14px;font-family:var(--display);font-weight:800;font-size:.95rem;letter-spacing:.1em;text-transform:uppercase}\
.es .sv a svg{width:1em;height:1em;transition:transform .5s var(--ease)}\
.es .sv:hover a svg{transform:translateX(6px)}\
.es .sec{padding-block:clamp(84px,10vw,150px)}\
.es .hd{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-bottom:clamp(24px,3vw,40px)}\
.es .hd h2{font-size:clamp(2.4rem,1.4rem + 4vw,5rem)}\
.es .duo{display:grid;grid-template-columns:1.15fr .85fr;gap:clamp(28px,4vw,60px);align-items:start}\
.es .duo>*,.es .sched .ct,.es .sched .ct>*{min-width:0}\
.es .tw{overflow-x:auto;-webkit-overflow-scrolling:touch}\
.es .tbl{width:100%;border-collapse:collapse;font-size:.98rem;background:var(--white);box-shadow:0 30px 60px -40px rgba(12,26,43,.35)}\
.es .tbl th{font-family:var(--display);font-weight:700;font-size:.85rem;letter-spacing:.18em;text-transform:uppercase;color:var(--mute);text-align:left;padding:14px 16px;border-bottom:2px solid var(--navy)}\
.es .tbl td{padding:14px 16px;border-bottom:1px solid var(--line);vertical-align:middle}\
.es .tbl tr{transition:background .35s}\
.es .tbl tbody tr:hover{background:var(--paper)}\
.es .tbl .num{font-family:var(--display);font-weight:800;font-size:1.3rem;color:var(--mute);width:56px}\
.es .tbl .sw{display:inline-block;width:38px;height:12px;background:var(--c,#999);transform:skewX(var(--sk));margin-right:12px;vertical-align:middle;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}\
.es .tbl .nm{font-family:var(--display);font-weight:800;font-size:1.35rem;text-transform:uppercase}\
.es .tbl .bar{height:8px;background:var(--paper-2);position:relative;min-width:120px}\
.es .tbl .bar i{position:absolute;inset:0;width:var(--p);background:var(--navy);transform-origin:left;transform:scaleX(0);transition:transform 1.2s var(--ease)}\
.es .in .tbl .bar i{transform:none}\
.es .tbl .pct{font-family:var(--display);font-weight:800;color:var(--navy);text-align:right;white-space:nowrap}\
.es .ev{display:grid;gap:10px}\
.es .evi{display:grid;grid-template-columns:76px 1fr auto;gap:16px;align-items:center;background:var(--white);padding:14px 16px;box-shadow:0 30px 60px -40px rgba(12,26,43,.35);transition:transform .5s var(--ease),box-shadow .5s var(--ease)}\
.es .evi:hover{transform:translateX(6px);box-shadow:0 30px 60px -30px rgba(12,26,43,.45)}\
.es .evi .dt{background:var(--navy);color:var(--white);text-align:center;padding:10px 6px;transform:skewX(var(--sk));font-family:var(--display);font-weight:800;line-height:.95;text-transform:uppercase}\
.es .evi .dt span{display:block;transform:skewX(calc(var(--sk)*-1))}\
.es .evi .dt b{display:block;font-size:1.8rem;color:var(--acc)}\
.es .evi h4{font-family:var(--display);font-weight:800;font-size:1.3rem;text-transform:uppercase;line-height:1}\
.es .evi p{color:var(--mute);font-size:.9rem;margin-top:2px}\
.es .evi .hr{font-family:var(--display);font-weight:800;font-size:1.1rem;color:var(--navy)}\
.es .blk{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);align-items:center}\
.es .blk.rev .ph{order:2}\
.es .blk .ph{position:relative;aspect-ratio:5/4;overflow:hidden;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)}\
.es .blk .ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}\
.es .blk:hover .ph img{transform:scale(1.06)}\
.es .blk .ph::after{content:"";position:absolute;left:0;bottom:0;width:46%;height:12px;background:var(--acc);clip-path:polygon(0 0,100% 0,96% 100%,0 100%)}\
.es .blk h2{font-size:clamp(2.4rem,1.4rem + 4vw,5rem);margin-top:12px}\
.es .blk .lead{color:var(--mute);margin-top:18px;max-width:52ch}\
.es .blk ul{list-style:none;margin:20px 0 0;padding:0;display:grid;gap:10px}\
.es .blk li{display:flex;gap:12px;align-items:flex-start}\
.es .blk li::before{content:"";flex:none;width:12px;height:12px;margin-top:.5em;background:var(--acc);transform:skewX(var(--sk))}\
.es .blk .btn{margin-top:28px}\
.es .alt{background:var(--white)}\
.es .cta2{position:relative;background:var(--navy);color:var(--white);overflow:hidden;clip-path:polygon(0 3vw,100% 0,100% calc(100% - 3vw),0 100%);padding:clamp(100px,12vw,170px) 0}\
.es .cta2::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-60deg,rgba(255,255,255,.03) 0 2px,transparent 2px 22px)}\
.es .cta2 .ct{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);align-items:center;position:relative}\
.es .cta2 .k{color:var(--acc-2)}\
.es .cta2 h2{font-size:clamp(2.6rem,1.4rem + 5vw,6.2rem);margin-top:12px}\
.es .cta2 p{margin-top:18px;color:rgba(255,255,255,.78);max-width:50ch}\
.es .cta2 .btn{margin-top:28px}\
.es .cta2 .ph{position:relative;aspect-ratio:4/3;clip-path:polygon(12% 0,100% 0,88% 100%,0 100%);overflow:hidden}\
.es .cta2 .ph img{width:100%;height:100%;object-fit:cover;filter:saturate(1.05)}\
.es .coaches{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2vw,28px)}\
.es .co{background:var(--white);overflow:hidden;position:relative;box-shadow:0 30px 60px -40px rgba(12,26,43,.35);transition:transform .6s var(--ease)}\
.es .co:hover{transform:translateY(-8px)}\
.es .co .ph{aspect-ratio:4/5;overflow:hidden;position:relative}\
.es .co .ph img{width:100%;height:100%;object-fit:cover;object-position:center top;transition:transform 1.1s var(--ease)}\
.es .co:hover .ph img{transform:scale(1.06)}\
.es .co .ph::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:40px;background:var(--white);clip-path:polygon(0 100%,100% 0,100% 100%)}\
.es .co .tx{padding:14px clamp(18px,2vw,26px) clamp(22px,2.4vw,30px)}\
.es .co .tx .k{font-size:.78rem}\
.es .co h3{font-family:var(--display);font-weight:800;font-size:2rem;text-transform:uppercase;line-height:.95;margin-top:6px}\
.es .co p{color:var(--mute);font-size:.95rem;margin-top:8px}\
.es .co .tag{position:absolute;top:16px;left:-6px;background:var(--acc);color:var(--acc-ink);font-family:var(--display);font-weight:800;font-size:.85rem;letter-spacing:.14em;text-transform:uppercase;padding:.45em 1em .45em 1.3em;transform:skewX(var(--sk))}\
.es .co .tag span{display:block;transform:skewX(calc(var(--sk)*-1))}\
.es .sched .tbl td:first-child{font-family:var(--display);font-weight:800;font-size:1.2rem;text-transform:uppercase;color:var(--navy);width:120px}\
.es .sched .tbl td .lc{color:var(--mute);font-size:.9rem}\
.es .sched .tbl td .hr{font-family:var(--display);font-weight:700;font-size:1.1rem}\
.es .sched .tbl tbody tr.first td{border-top:2px solid var(--navy)}\
.es .sched .note{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-top:22px;color:var(--mute);font-size:.9rem}\
.es .appsec{background:var(--white);clip-path:polygon(0 0,100% 3vw,100% 100%,0 100%);padding:clamp(100px,12vw,160px) var(--g) clamp(84px,10vw,140px)}\
.es .appsec .ct{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(36px,6vw,90px);align-items:center}\
.es .appsec h2{font-size:clamp(2.6rem,1.4rem + 5vw,6rem);margin-top:12px}\
.es .appsec .lead{margin-top:18px;max-width:52ch;color:var(--mute)}\
.es .rec{list-style:none;margin:28px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px}\
.es .rec a{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;background:var(--paper);border-left:3px solid var(--acc);transition:background .4s,transform .4s var(--ease)}\
.es .rec a:hover{background:var(--paper-2);transform:translateX(4px)}\
.es .rec .ic{flex:none;width:38px;height:38px;display:grid;place-items:center;background:var(--navy);color:var(--acc);transform:skewX(var(--sk))}\
.es .rec .ic svg{width:18px;height:18px;transform:skewX(calc(var(--sk)*-1))}\
.es .rec b{display:block;font-weight:700}\
.es .rec small{display:block;color:var(--mute);font-size:.85rem;line-height:1.4}\
.es .appsec .ac{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}\
.es .phone{position:relative;width:min(100%,330px);margin-inline:auto;border-radius:48px;background:linear-gradient(160deg,#2a2a2a,#0a0a0a 45%,#1a1a1a);padding:12px;box-shadow:0 60px 100px -40px rgba(12,26,43,.6),0 0 0 1px rgba(255,255,255,.08),inset 0 0 0 2px #000;transition:transform .6s var(--ease)}\
.es .phone .scr{position:relative;border-radius:38px;background:var(--navy);color:var(--white);overflow:hidden;display:flex;flex-direction:column;aspect-ratio:9/18.6}\
.es .phone .island{position:absolute;left:50%;top:12px;transform:translateX(-50%);width:34%;height:26px;border-radius:14px;background:#000;z-index:3}\
.es .phone .status{display:flex;justify-content:space-between;padding:16px 24px 0;font-weight:700;font-size:.76rem}\
.es .phone .hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 18px 0}\
.es .phone .hdr .who{display:flex;align-items:center;gap:10px}\
.es .phone .hdr .av{width:40px;height:40px;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;font-family:var(--display);font-weight:800;transform:skewX(var(--sk))}\
.es .phone .hdr .av span{transform:skewX(calc(var(--sk)*-1))}\
.es .phone .hdr small{display:block;font-size:.64rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.6)}\
.es .phone .hdr b{display:block;font-family:var(--display);font-weight:800;font-size:1.25rem;text-transform:uppercase;line-height:1}\
.es .phone .body{padding:14px 14px 0;display:grid;gap:10px;align-content:start}\
.es .phone .body>*{min-width:0}\
.es .phone .card2{background:var(--navy-2);padding:14px 16px;overflow:hidden}\
.es .phone .card2 .k{font-size:.58rem;letter-spacing:.2em;color:rgba(255,255,255,.6)}\
.es .phone .card2 .k::before{display:none}\
.es .phone .lvl{display:flex;justify-content:space-between;align-items:flex-end;margin-top:6px;gap:8px}\
.es .phone .lvl b{font-family:var(--display);font-weight:800;font-size:1.4rem;text-transform:uppercase;line-height:1}\
.es .phone .lvl span{font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:var(--acc);text-align:right;line-height:1.2}\
.es .phone .therm{height:10px;background:var(--navy-3);margin-top:10px;position:relative;overflow:hidden;transform:skewX(var(--sk))}\
.es .phone .therm i{position:absolute;inset:0;width:62%;background:linear-gradient(90deg,#8aa0b8,var(--acc));transform-origin:left;transform:scaleX(0);transition:transform 1.6s var(--ease) .3s}\
.es .phone.in .therm i{transform:none}\
.es .phone .acts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\
.es .phone .act{background:var(--navy-2);padding:12px 4px 10px;display:flex;flex-direction:column;align-items:center;gap:7px;font-size:.58rem;font-weight:600;color:rgba(255,255,255,.7);text-align:center;min-width:0}\
.es .phone .act svg{width:20px;height:20px;color:var(--acc)}\
.es .phone .act.on{background:var(--acc);color:var(--acc-ink)}\
.es .phone .act.on svg{color:var(--acc-ink)}\
.es .phone .next{display:flex;align-items:center;gap:12px}\
.es .phone .next .dt{flex:none;width:46px;height:50px;background:var(--acc);color:var(--acc-ink);display:grid;place-items:center;transform:skewX(var(--sk))}\
.es .phone .next .dt svg{width:22px;height:22px;transform:skewX(calc(var(--sk)*-1))}\
.es .phone .next b{display:block;font-weight:700;font-size:.9rem}\
.es .phone .next span{display:block;color:rgba(255,255,255,.6);font-size:.72rem}\
.es .phone .pres .dots{display:grid;grid-template-columns:repeat(12,1fr);gap:5px;margin-top:10px}\
.es .phone .pres .dots i{display:block;aspect-ratio:1;background:var(--navy-3);transform:skewX(var(--sk))}\
.es .phone .pres .dots i.on{background:var(--acc)}\
.es .phone .nxt{display:flex;justify-content:space-between;gap:8px;font-size:.64rem;color:rgba(255,255,255,.6);margin-top:8px;white-space:nowrap}\
.es .phone .nxt b{color:var(--white);font-weight:600}\
.es .phone .tabs{margin-top:auto;display:flex;justify-content:space-around;padding:12px 8px 22px;border-top:1px solid rgba(255,255,255,.08);background:#081220}\
.es .phone .tabs span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.55rem;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,.55)}\
.es .phone .tabs span.on{color:var(--acc)}\
.es .phone .tabs svg{width:18px;height:18px}\
.es .partners{display:flex;flex-wrap:wrap;gap:clamp(14px,2vw,26px);align-items:center;justify-content:center}\
.es .pt{width:clamp(120px,14vw,180px);aspect-ratio:3/2;background:var(--white);display:grid;place-items:center;font-family:var(--display);font-weight:800;font-size:1.4rem;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);transform:skewX(var(--sk));transition:transform .5s var(--ease),color .4s,background .4s;box-shadow:0 20px 40px -30px rgba(12,26,43,.4)}\
.es .pt span{display:block;transform:skewX(calc(var(--sk)*-1))}\
.es .pt:hover{transform:skewX(var(--sk)) translateY(-6px);background:var(--navy);color:var(--acc)}\
.es .gal{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-top:clamp(40px,5vw,70px)}\
.es .gal a{position:relative;aspect-ratio:1;overflow:hidden;background:var(--paper-2)}\
.es .gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease),filter .6s}\
.es .gal a:hover img{transform:scale(1.08)}\
.es .gal a::after{content:"";position:absolute;inset:0;background:var(--navy);opacity:0;transition:opacity .5s}\
.es .gal a:hover::after{opacity:.35}\
.es .gal .tag{position:absolute;left:10px;bottom:10px;z-index:2;color:var(--white);font-family:var(--display);font-weight:700;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;opacity:0;transition:opacity .5s}\
.es .gal a:hover .tag{opacity:1}\
.es .foot{background:var(--navy);color:var(--white);padding:clamp(60px,7vw,100px) var(--g) 28px;position:relative;clip-path:polygon(0 3vw,100% 0,100% 100%,0 100%);margin-top:3vw}\
.es .foot .ct{display:grid;grid-template-columns:1.3fr 1fr 1fr 1.2fr;gap:28px 40px}\
.es .foot .logo{color:var(--white)}\
.es .foot p.about{color:rgba(255,255,255,.7);margin-top:16px;max-width:36ch;font-size:.95rem}\
.es .foot h4{font-family:var(--display);font-weight:700;font-size:.9rem;letter-spacing:.22em;text-transform:uppercase;color:var(--acc);margin-bottom:14px}\
.es .foot nav{display:grid;gap:8px}\
.es .foot nav a{opacity:.85;position:relative;width:max-content;padding:.1em 0}\
.es .foot nav a::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--acc);transform:scaleX(0);transform-origin:right;transition:transform .45s var(--ease)}\
.es .foot nav a:hover::after{transform:scaleX(1);transform-origin:left}\
.es .foot .cont p{color:rgba(255,255,255,.8);font-size:.95rem;margin-bottom:8px}\
.es .foot .cp{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.12);padding-top:18px;font-size:.88rem;color:rgba(255,255,255,.6);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}\
.es .foot .cp b{color:var(--white)}\
.es.js .rv{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease)}\
.es.js .rv.in{opacity:1;transform:none}\
.es .st>*{transition-delay:calc(var(--i,0)*90ms)}\
@media (prefers-reduced-motion:reduce){.es *,.es *::before,.es *::after{animation:none!important;transition:none!important}.es.js .rv{opacity:1;transform:none}.es .hero h1 .l span{transform:none}.es .hero p.lead,.es .hero .cta{opacity:1}.es .phone .therm i,.es .tbl .bar i{transform:none}}\
@media (max-width:1280px){.es .nl{display:none}.es .nl.open{display:flex;position:absolute;top:calc(100% + 6px);right:var(--g);flex-direction:column;align-items:flex-start;gap:16px;background:var(--navy);padding:22px 26px;border:1px solid rgba(255,255,255,.12);color:var(--white)}.es .burger{display:inline-flex}}\
@media (max-width:1100px){.es .hero{grid-template-columns:1fr}.es .hero .ph{min-height:46vh;clip-path:polygon(0 12%,100% 0,100% 100%,0 100%)}.es .hero .ph::after{background:linear-gradient(180deg,var(--navy) 0,rgba(12,26,43,.2) 40%,transparent 70%)}.es .hero .stat{gap:18px}.es .serv .ct{grid-template-columns:1fr 1fr}.es .duo,.es .appsec .ct,.es .cta2 .ct{grid-template-columns:1fr}.es .foot .ct{grid-template-columns:1fr 1fr}.es .gal{grid-template-columns:repeat(3,1fr)}}\
@media (max-width:760px){.es .tbl .bar{min-width:70px}.es .tbl .nm{font-size:1.1rem}.es .serv .ct,.es .blk,.es .coaches{grid-template-columns:1fr}.es .blk.rev .ph{order:0}.es .rec{grid-template-columns:1fr}.es .foot .ct{grid-template-columns:1fr}.es .tbl th:nth-child(3),.es .tbl td:nth-child(3){display:none}.es .sched .tbl td:first-child{width:auto}.es .evi{grid-template-columns:64px 1fr}.es .evi .hr{grid-column:2}}';

function css(t){
  return '\
.es,.es *,.es *::before,.es *::after{box-sizing:border-box}\
.es{--navy:'+t.navy+';--navy-2:'+t.navy2+';--navy-3:'+t.navy3+';--paper:#f4f6f9;--paper-2:#e9edf3;--white:#fff;--ink:'+t.navy+';--mute:#5b6878;--line:#dbe2ea;\
 --acc:'+t.acc+';--acc-2:'+t.acc2+';--acc-ink:'+t.accInk+';\
 --display:"Barlow Condensed","Arial Narrow",Impact,system-ui,sans-serif;--text:"Barlow",system-ui,sans-serif;--ease:cubic-bezier(.16,1,.3,1);--g:clamp(20px,5vw,96px);--sk:-12deg;\
 position:relative;background:var(--paper);color:var(--ink);font-family:var(--text);font-size:clamp(1rem,.95rem + .3vw,1.125rem);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:clip}\
.es h1,.es h2,.es h3,.es h4,.es p{margin:0}.es a{color:inherit;text-decoration:none}.es img{display:block;max-width:100%}.es :focus-visible{outline:3px solid var(--acc);outline-offset:3px}\
' + CSS_BASE + '\
.es .logo .mk img,.es .phone .hdr .av img{width:100%;height:100%;object-fit:cover}.es .logo .mk span,.es .phone .hdr .av span{width:100%;height:100%;display:grid;place-items:center;overflow:hidden}\
.es .blk .ph .ini,.es .co .ph .ini{display:grid;place-items:center;height:100%;font-family:var(--display);font-weight:800;font-size:clamp(4rem,3rem + 4vw,8rem);color:var(--acc);background:var(--navy)}\
.es .hero.noimg .ph{background:var(--navy-2)}\
.es .duo.solo{grid-template-columns:1fr;max-width:820px}\
.es .evazio{background:var(--white);padding:clamp(22px,3vw,34px);box-shadow:0 30px 60px -40px rgba(12,26,43,.35);display:grid;gap:16px;justify-items:start}.es .evazio p{color:var(--mute);max-width:46ch}\
.es .pt img{max-width:70%;max-height:60%;object-fit:contain}\
.es .btn span img{display:inline-block;vertical-align:-5px;margin-right:4px;border-radius:5px}\
.es .coaches{grid-template-columns:repeat(var(--n,3),1fr)}\
.es .phone .therm i{background:linear-gradient(90deg,var(--c1,#8aa0b8),var(--c2,var(--acc)))}\
@media (max-width:760px){.es .coaches{grid-template-columns:1fr}}\
@media (max-width:480px){.es .gal{grid-template-columns:repeat(2,1fr)}.es .partners{gap:10px}.es .pt{width:44%}}';
}

/* ========================================================================== */
/*  Cor e utilidades                                                           */
/* ========================================================================== */
function hex6(v){ var s = String(v || '').trim(); return /^#[0-9a-f]{6}$/i.test(s) ? s : null; }
function readable(hex){
  var c = String(hex || '').replace('#', '');
  var r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  if(!(r >= 0) || !(g >= 0) || !(b >= 0)) return '#0c1a2b';
  return ((0.2126*r + 0.7152*g + 0.0722*b) / 255) > 0.55 ? '#0c1a2b' : '#ffffff';
}
function mix(hex, to, amt){
  var a = String(hex).replace('#',''), b = String(to).replace('#',''), out = '#';
  for(var i = 0; i < 6; i += 2){ var v = Math.round(parseInt(a.slice(i,i+2),16)*(1-amt) + parseInt(b.slice(i,i+2),16)*amt); out += ('0'+v.toString(16)).slice(-2); }
  return out;
}
function corFaixa(v){ var s = String(v || '').trim(); return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : ''; }
function initials(n){ var p = String(n || '').trim().split(/\s+/).filter(Boolean); if(!p.length) return 'A'; return ((p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase(); }
function plural(n, a, b){ return n + ' ' + (n === 1 ? a : b); }
function pluralPeca(p){ var s = String(p || 'graduação').trim(); if(/ão$/i.test(s)) return s.replace(/ão$/i, 'ões'); if(/l$/i.test(s)) return s.replace(/l$/i, 'is'); if(/[sz]$/i.test(s)) return s; return s + 's'; }
function cap(s){ s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

function ic(d, w){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(w || 2)+'" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'; }
var I = {
  arrow: ic('<path d="M4 12h15M13 6l6 6-6 6"/>', 2.6),
  gauge: ic('<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4.5-5.5"/>'),
  card:  ic('<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="12" r="2.2"/><path d="M14 10h4M14 14h4"/>'),
  qr:    ic('<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h3v3M20 14v6h-3"/>'),
  cal:   ic('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  award: ic('<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/>'),
  net:   ic('<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="18" r="2.5"/><circle cx="19" cy="18" r="2.5"/><path d="M12 7.5v4M10.5 13l-4 3M13.5 13l4 3"/>'),
  home:  ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  user:  ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')
};

/* ========================================================================== */
/*  Render                                                                     */
/* ========================================================================== */
export function render(s, h){
  var esc = h.esc, url = h.url;
  var modBase = h.modalidadeBase || 'arena';
  var modKey = (h.modalidade && (HERO[h.modalidade] || LEAD[h.modalidade])) ? h.modalidade : modBase; // tabelas: modalidade real → base → arena
  var V = (h.VOCAB && (h.VOCAB[h.modalidade] || h.VOCAB[modBase] || h.VOCAB.arena)) || { nomeMod:'Artes marciais', local:'academia', luta:'treino' };
  var tituloLider = (h.LIDER && (h.LIDER[h.modalidade] || h.LIDER[modBase])) || 'Professor';
  var c = s.cores || {};
  var t = { navy: hex6(c.principal) || '#0c1a2b', acc: hex6(c.botao) || hex6(c.destaque) || '#ffc400' };
  // principal muito clara não funciona como "marinho" (texto branco em cima): escurece.
  if(readable(t.navy) !== '#ffffff') t.navy = mix(t.navy, '#0c1a2b', .75);
  t.navy2 = mix(t.navy, '#ffffff', .07); t.navy3 = mix(t.navy, '#ffffff', .16); t.acc2 = mix(t.acc, '#ffffff', .3); t.accInk = readable(t.acc);

  var site = document.getElementById('site');
  if(!site) return;
  if(!document.getElementById('es-fonts')){
    var l = document.createElement('link'); l.id = 'es-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,800&family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
    document.head.appendChild(l);
  }
  var st = document.getElementById('es-css');
  if(!st){ st = document.createElement('style'); st.id = 'es-css'; document.head.appendChild(st); }
  st.textContent = css(t);

  var C = (s.conteudo && s.conteudo.secoes && typeof s.conteudo.secoes === 'object') ? s.conteudo.secoes : {};
  function cx(sec, campo, pad){ var v = C[sec] && C[sec][campo]; return (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 400) : pad; }
  function lista(sec, campo, max){ var v = C[sec] && C[sec][campo]; return Array.isArray(v) ? v.filter(function(x){ return x && typeof x === 'object'; }).slice(0, max || 6) : []; }
  function cs(o, k){ return (o && typeof o[k] === 'string') ? o[k].trim().slice(0, 400) : ''; }
  function linhas(txt){ return String(txt || '').split('\n').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, 6); }
  // Título com parte em destaque: "Princípios" + "da escola" → Princípios <em>da escola</em>
  function tit(sec, pad){ var tt = cx(sec, 'titulo', pad.titulo), d = cx(sec, 'destaque', pad.destaque || ''); return esc(tt) + (d ? ' <em>'+esc(d)+'</em>' : ''); }

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
  if(Array.isArray(s.nucleosInfo) && s.nucleosInfo.length) s.nucleosInfo.forEach(function(n){ if(n && n.nome) nucs.push({ nome:String(n.nome) }); });
  else if(Array.isArray(s.nucleos)) s.nucleos.forEach(function(n){ if(typeof n === 'string' && n.trim()) nucs.push({ nome:n.trim() }); });
  var nEq = Array.isArray(s.equipe) ? s.equipe.length : 0;

  var zap = cx('contato', 'whatsapp', '').replace(/\D/g, ''); if(!/^\d{10,13}$/.test(zap)) zap = '';
  var zapHref = zap ? 'https://wa.me/'+(zap.length <= 11 ? '55' : '')+zap+'?text='+encodeURIComponent(cx('contato', 'msgWhatsapp', 'Olá! Quero agendar uma aula experimental na '+s.nomeCurto+'.')) : '';
  var zapFmt = zap ? (zap.length === 11 ? '('+zap.slice(0,2)+') '+zap.slice(2,7)+'-'+zap.slice(7) : zap) : '';

  var horItens = lista('horarios', 'itens', 30).filter(function(x){ return cs(x, 'aula'); });
  var agItens = lista('agenda', 'itens', 6).filter(function(x){ return cs(x, 'titulo'); });
  var temHor = horItens.length > 0;

  var marca = '<a class="logo" href="#top"><span class="mk"><span>'+(logo ? '<img src="'+esc(logo)+'" alt="'+esc('Logo '+s.nomeCurto)+'">' : esc(ini))+'</span></span><span>'+esc(s.nomeCurto)+'<small>'+esc(V.nomeMod)+'</small></span></a>';
  var seta = I.arrow;

  // --- NAV + HERO ---
  var nav = '<nav class="nav">'+marca
    + '<div class="nl" id="es-nl"><a href="#es-clube">Clube</a>'+(escada.length ? '<a href="#es-graduacao">Graduação</a>' : '')+'<a href="#es-equipe">Equipe</a>'+(temHor ? '<a href="#es-horarios">Horários</a>' : '')+'<a href="#es-app">App</a><a href="#es-contato">Contato</a>'
    + '<a class="btn ghost" href="'+esc(login)+'"><span>Área do aluno</span></a><a class="btn" href="'+esc(ins)+'" data-magnet><span>Fazer inscrição</span></a></div>'
    + '<button class="burger" id="es-burger" type="button" aria-expanded="false" aria-controls="es-nl">Menu</button></nav>';
  var hp = HERO[modKey] || HERO.arena;
  var heroFoto = url(cx('hero', 'foto', '')) || fachada[0] || equipeF[0] || treino[0] || '';
  var nums = [];
  if(escada.length) nums.push([escada.length, pecaPl]);
  if(nucs.length) nums.push([nucs.length, nucs.length === 1 ? 'núcleo' : 'núcleos']);
  if(nEq > 1) nums.push([nEq, 'na equipe']);
  var hero = '<header class="hero'+(heroFoto ? '' : ' noimg')+'" id="top">'+nav
    + '<div class="tx"><span class="k">'+esc(s.nome)+(s.cidade ? ' · '+esc(s.cidade)+(s.uf ? ', '+esc(s.uf) : '') : '')+'</span>'
    + '<h1 class="d"><span class="l"><span style="animation-delay:.05s">'+esc(cx('hero', 'linha1', hp[0]))+'</span></span><span class="l"><span style="animation-delay:.18s">'+esc(cx('hero', 'linha2', hp[1]))+' <em>'+esc(cx('hero', 'destaque', hp[2]))+'</em></span></span><span class="l sub"><span style="animation-delay:.31s">'+esc(V.nomeMod)+' '+esc(s.nomeCurto)+'</span></span></h1>'
    + '<p class="lead">'+esc(cx('hero', 'texto', LEAD[modKey] || LEAD.arena))+'</p>'
    + '<div class="cta"><a class="btn" href="'+esc(ins)+'" data-magnet><span>'+esc(cx('hero', 'botao', 'Comece hoje'))+'</span>'+seta+'</a><a class="btn ghost" href="#es-clube"><span>Sobre nós</span></a></div>'
    + (nums.length ? '<div class="stat" aria-hidden="true">'+nums.map(function(n){ return '<div><b data-count="'+n[0]+'">0</b><span>'+esc(n[1])+'</span></div>'; }).join('')+'</div>' : '')
    + '</div>'
    + '<div class="ph">'+(heroFoto ? '<img src="'+esc(heroFoto)+'" alt="'+esc(s.nome)+'" fetchpriority="high">' : '')+'</div>'
    + '<span class="stripe" aria-hidden="true"></span></header>';

  // --- SERVIÇOS ---
  var svPad = SERVICOS[modKey] || SERVICOS.arena;
  var svItens = lista('servicos', 'itens', 4).filter(function(x){ return cs(x, 'titulo'); });
  var svl = svItens.length ? svItens.map(function(x){ return [cs(x, 'titulo'), cs(x, 'texto')]; }) : svPad;
  var svLinks = ['#es-publico', escada.length ? '#es-graduacao' : '#es-clube', '#es-clube', temHor ? '#es-horarios' : '#es-contato'];
  var servicos = '<section class="serv" id="es-servicos"><div class="ct st">'+svl.map(function(x, i){
    return '<article class="sv rv" style="--i:'+i+'"><span class="n">0'+(i+1)+'</span><h3>'+esc(x[0])+'</h3>'+(x[1] ? '<p>'+esc(x[1])+'</p>' : '')+'<a href="'+(svLinks[i] || '#es-clube')+'">Saiba mais '+seta+'</a></article>';
  }).join('')+'</div></section>';

  // --- QUADRO DE GRADUAÇÃO + AGENDA ---
  var duo = '';
  var gradHTML = '';
  if(escada.length){
    var et = lista('graduacao', 'itens', 12), n = escada.length;
    gradHTML = '<div class="rv"><div class="hd"><div><span class="k">'+esc(cx('graduacao', 'selo', 'Escada da escola'))+'</span><h2 class="d">'+tit('graduacao', { titulo:'Quadro de', destaque:'graduação' })+'</h2></div>'
      + '<a class="btn dark" href="'+esc(login)+'"><span>'+esc(cx('graduacao', 'botao', 'Ver minha graduação'))+'</span></a></div>'
      + '<div class="tw"><table class="tbl"><thead><tr><th>#</th><th>'+esc(cap(s.peca))+'</th><th>Etapa</th><th>Progressão</th><th></th></tr></thead><tbody>'
      + escada.map(function(b, j){
        var e = et[j] || {};
        var p = Math.round((j + 1) / n * 100);
        return '<tr><td class="num">'+(j+1)+'</td><td>'+(b.cor ? '<span class="sw" style="--c:'+esc(b.cor)+'"></span>' : '')+'<span class="nm">'+esc(b.nome)+'</span></td><td>'+esc(cs(e, 'etapa') || ('Etapa '+(j+1)))+'</td><td><div class="bar"><i style="--p:'+p+'%"></i></div></td><td class="pct">'+esc(cs(e, 'sigla') || (p+'%'))+'</td></tr>';
      }).join('')+'</tbody></table></div></div>';
  }
  var agHTML = '<div class="rv" id="es-agenda"><div class="hd"><div><span class="k">'+esc(cx('agenda', 'selo', 'Próximos'))+'</span><h2 class="d">'+esc(cx('agenda', 'titulo', 'Agenda'))+'</h2></div><a class="btn ghost" href="'+esc(R('campeonatos'))+'"><span>Todos os eventos</span></a></div>'
    + (agItens.length ? '<div class="ev st">'+agItens.map(function(x, i){
        var mes = MESES.filter(function(m){ return m[0] === cs(x, 'mes'); })[0];
        var dia = cs(x, 'dia').replace(/\D/g, '').slice(0, 2);
        return '<a class="evi rv" href="'+esc(R('campeonatos'))+'" style="--i:'+i+'"><div class="dt"><span>'+esc(mes ? mes[1] : '')+'<b>'+esc(dia || '—')+'</b></span></div><div><h4>'+esc(cs(x, 'titulo'))+'</h4>'+(cs(x, 'local') ? '<p>'+esc(cs(x, 'local'))+'</p>' : '')+'</div>'+(cs(x, 'hora') ? '<span class="hr">'+esc(cs(x, 'hora'))+'</span>' : '')+'</a>';
      }).join('')+'</div>'
      : '<div class="evazio"><p>Os eventos, campeonatos e exames da '+esc(s.nomeCurto)+' aparecem aqui e no app. Alunos recebem aviso e fazem a inscrição em um toque.</p><a class="btn" href="'+esc(R('campeonatos'))+'"><span>Ver campeonatos</span>'+seta+'</a></div>')
    + '</div>';
  duo = '<section class="sec w" id="es-graduacao"><div class="ct duo'+(gradHTML ? '' : ' solo')+'">'+gradHTML+agHTML+'</div></section>';

  // --- PRINCÍPIOS / PÚBLICO (blocos imagem + texto) ---
  function bloco(sec, pad, foto, rev, id, linkBtn, ghost){
    var tp = linhas(cx(sec, 'topicos', '')); if(!tp.length) tp = pad.topicos;
    return '<section class="sec w'+(rev ? '' : ' alt')+'" id="'+id+'"><div class="ct blk'+(rev ? ' rev' : '')+'">'
      + '<div class="ph rv">'+(foto ? '<img src="'+esc(foto)+'" alt="'+esc(s.nome)+'" loading="lazy">' : '<span class="ini">'+esc(ini)+'</span>')+'</div>'
      + '<div class="rv"><span class="k">'+esc(cx(sec, 'selo', pad.selo))+'</span><h2 class="d">'+tit(sec, pad)+'</h2><p class="lead">'+esc(cx(sec, 'texto', pad.texto))+'</p>'
      + (tp.length ? '<ul>'+tp.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>' : '')
      + '<a class="btn'+(ghost ? ' ghost' : '')+'" href="'+esc(linkBtn)+'"'+(ghost ? '' : ' data-magnet')+'><span>'+esc(cx(sec, 'botao', pad.botao))+'</span>'+(ghost ? '' : seta)+'</a></div></div></section>';
  }
  var principios = bloco('principios', PRINCIPIOS[modKey] || PRINCIPIOS.arena, url(cx('principios', 'foto', '')) || treino[0] || '', false, 'es-clube', '#es-publico', false);
  var publico = bloco('publico', PUBLICO[modKey] || PUBLICO.arena, url(cx('publico', 'foto', '')) || treino[1] || '', true, 'es-publico', '#es-equipe', true);

  // --- CHAMADA ---
  var cp = CTA[modKey] || CTA.arena;
  var ctaFoto = url(cx('cta', 'foto', '')) || treino[2] || fachada[0] || '';
  var cta = '<section class="cta2" id="es-cta"><div class="ct w"><div class="rv"><span class="k">'+esc(cx('cta', 'selo', cp.selo))+'</span><h2 class="d">'+tit('cta', cp)+'</h2><p>'+esc(cx('cta', 'texto', cp.texto))+'</p>'
    + '<a class="btn" href="'+esc(ins)+'" data-magnet><span>'+esc(cx('cta', 'botao', 'Comece hoje'))+'</span>'+seta+'</a></div>'
    + '<div class="ph rv">'+(ctaFoto ? '<img src="'+esc(ctaFoto)+'" alt="" loading="lazy">' : '')+'</div></div></section>';

  // --- EQUIPE ---
  var mestres = [];
  lista('equipe', 'itens', 6).forEach(function(m){ if(cs(m, 'nome')) mestres.push({ nome:cs(m, 'nome'), grad:cs(m, 'graduacao'), tag:cs(m, 'etiqueta'), bio:cs(m, 'bio'), foto:url(cs(m, 'foto')) }); });
  if(!mestres.length && Array.isArray(s.equipe) && s.equipe.length) s.equipe.forEach(function(m){ if(m && m.nome) mestres.push({ nome:m.nome, grad:m.graduacao || '', tag:'', bio:m.bio || '', foto:url(m.foto) }); });
  if(!mestres.length) mestres.push({ nome:s.lider, grad:(s.responsavel && s.responsavel.graduacao) || tituloLider, tag:'', bio:'', foto:url(s.fotoLider) });
  var equipe = '<section class="sec w" id="es-equipe"><div class="ct"><div class="hd rv"><div><span class="k">'+esc(cx('equipe', 'selo', 'Instrutores'))+'</span><h2 class="d">'+tit('equipe', { titulo:'Quem', destaque:'treina você' })+'</h2></div></div>'
    + '<div class="coaches st" style="--n:'+Math.min(mestres.length, 3)+'">'+mestres.slice(0, 6).map(function(m, i){
      return '<article class="co rv" style="--i:'+i+'"><div class="ph">'+(m.foto ? '<img src="'+esc(m.foto)+'" alt="'+esc(m.nome)+'" loading="lazy">' : '<span class="ini">'+esc(initials(m.nome))+'</span>')+'</div>'
        + '<span class="tag"><span>'+esc(m.tag || tituloLider)+'</span></span><div class="tx">'+(m.grad ? '<span class="k">'+esc(m.grad)+'</span>' : '')+'<h3>'+esc(m.nome)+'</h3><p>'+esc(m.bio || ('À frente dos treinos de '+V.nomeMod+' na '+s.nomeCurto+', com técnica, respeito e atenção a cada aluno.'))+'</p></div></article>';
    }).join('')+'</div></div></section>';

  // --- HORÁRIOS (tabela; só do painel) ---
  var horarios = '';
  if(temHor){
    var porDia = {}; DIAS.forEach(function(d){ porDia[d[0]] = []; });
    horItens.forEach(function(x){ var d = String(cs(x, 'dia') || '').toLowerCase().replace(/[áàâã]/g, 'a').slice(0, 3); if(porDia[d]) porDia[d].push(x); });
    var rows = '';
    DIAS.forEach(function(d){ porDia[d[0]].forEach(function(x, i){ rows += '<tr'+(i === 0 ? ' class="first"' : '')+'><td>'+(i === 0 ? esc(d[1].slice(0, 3)) : '')+'</td><td>'+esc(cs(x, 'aula'))+'</td><td class="lc">'+esc(cs(x, 'local'))+'</td><td class="hr">'+esc(cs(x, 'horario'))+'</td></tr>'; }); });
    horarios = '<section class="sec w alt sched" id="es-horarios"><div class="ct"><div class="hd rv"><div><span class="k">'+esc(cx('horarios', 'selo', 'Sessões de treino'))+'</span><h2 class="d">'+tit('horarios', { titulo:'Quadro', destaque:'semanal' })+'</h2></div>'
      + '<a class="btn ghost" href="'+esc(zapHref || ins)+'"'+(zapHref ? ' target="_blank" rel="noopener noreferrer"' : '')+'><span>Agendar aula experimental</span></a></div>'
      + '<div class="tw rv"><table class="tbl"><thead><tr><th>Dia</th><th>Aula</th><th>Local</th><th>Horário</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      + '<div class="note rv"><span>'+esc(cx('horarios', 'nota', 'Horários sujeitos a alteração — o app avisa. Check-in de presença em um toque.'))+'</span></div></div></section>';
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
  var c1 = (escada[0] && escada[0].cor) || '#8aa0b8', c2 = (escada.length > 1 && escada[escada.length-1].cor) || t.acc;
  var proxEv = agItens[0] || null;
  var phone = '<div class="phone rv" aria-hidden="true" style="--c1:'+esc(c1)+';--c2:'+esc(c2)+'"><div class="scr"><div class="island"></div>'
    + '<div class="status"><span>19:24</span><span>●●● ▮</span></div>'
    + '<div class="hdr"><div class="who"><span class="av"><span>'+(logo ? '<img src="'+esc(logo)+'" alt="">' : esc(ini))+'</span></span><div><small>Boa noite, atleta</small><b>'+esc(s.nomeCurto)+'</b></div></div></div>'
    + '<div class="body"><div class="card2"><span class="k">Termômetro de prontidão</span><div class="lvl"><b>'+esc(escada[0] ? escada[0].nome : cap(s.peca))+'</b><span>rumo '+esc(proxPeca)+'</span></div><div class="therm"><i></i></div></div>'
    + '<div class="acts"><span class="act on">'+I.qr+'Check-in</span><span class="act">'+I.card+'Carteirinha</span><span class="act">'+I.cal+'Agenda</span><span class="act">'+I.net+'Rede</span></div>'
    + '<div class="card2 next"><div class="dt">'+I.cal+'</div><div><b>'+esc(proxEv ? cs(proxEv, 'titulo') : 'Próximo treino')+'</b><span>'+esc(proxEv ? [cs(proxEv, 'dia') && cs(proxEv, 'mes') ? cs(proxEv, 'dia')+'/'+cs(proxEv, 'mes') : '', cs(proxEv, 'hora'), cs(proxEv, 'local')].filter(Boolean).join(' · ') : (temHor ? 'Veja o quadro semanal' : 'Horários na área do aluno'))+'</span></div></div>'
    + '<div class="card2 pres"><span class="k">Presenças do mês</span><div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i class="on"></i></div><div class="nxt"><span>check-in em um toque</span><span>'+esc(s.nomeCurto)+'</span></div></div></div>'
    + '<div class="tabs"><span class="on">'+I.home+'Início</span><span>'+I.gauge+esc(cap(s.peca))+'</span><span>'+I.cal+'Agenda</span><span>'+I.user+'Perfil</span></div></div></div>';
  var appSec = '<section class="appsec" id="es-app"><div class="ct"><div class="rv"><span class="k">'+esc(cx('app', 'selo', 'App AtletaPay · '+s.nomeCurto))+'</span><h2 class="d">'+tit('app', { titulo:'A escola', destaque:'no bolso' })+'</h2>'
    + '<p class="lead">'+esc(cx('app', 'texto', 'Sem loja de aplicativos: instala direto deste site. '+cap(s.peca)+', carteirinha, check-in e agenda no mesmo lugar.'))+'</p>'
    + '<ul class="rec">'+rec+'</ul><div class="ac"><a class="btn dark" href="'+esc(R('instalar'))+'" data-magnet><span><img src="assets/app-icon-192.png" alt="" width="22" height="22"> Instalar o app</span></a><a class="btn ghost" href="'+esc(R('instalar-rede'))+'"><span><img src="assets/rede-icon-192.png" alt="" width="22" height="22"> Instalar a Rede</span></a></div></div>'+phone+'</div></section>';

  // --- PARCEIROS + GALERIA ---
  var pts = lista('parceiros', 'itens', 8).filter(function(x){ return cs(x, 'nome') || url(cs(x, 'logo')); });
  var gfotos = lista('parceiros', 'fotos', 6).map(function(x){ return { foto:url(cs(x, 'foto')), legenda:cs(x, 'legenda') }; }).filter(function(x){ return x.foto; });
  if(!gfotos.length) gfotos = treino.slice(3, 9).concat(treino.slice(0, 3)).slice(0, 6).map(function(f){ return { foto:f, legenda:'' }; });
  var parceiros = '';
  if(pts.length || gfotos.length){
    parceiros = '<section class="sec w" id="es-parceiros"><div class="ct">'
      + (pts.length ? '<div class="hd rv"><div><span class="k">'+esc(cx('parceiros', 'selo', 'Parceiros'))+'</span><h2 class="d">'+tit('parceiros', { titulo:'Quem treina', destaque:'com a gente' })+'</h2></div></div>'
        + '<div class="partners st">'+pts.map(function(x, i){
          var lg = url(cs(x, 'logo')), lk = url(cs(x, 'link'));
          var inner = lg ? '<img src="'+esc(lg)+'" alt="'+esc(cs(x, 'nome'))+'" loading="lazy">' : esc(cs(x, 'nome'));
          return lk ? '<a class="pt rv" href="'+esc(lk)+'" target="_blank" rel="noopener noreferrer" style="--i:'+i+'"><span>'+inner+'</span></a>' : '<span class="pt rv" style="--i:'+i+'"><span>'+inner+'</span></span>';
        }).join('')+'</div>' : '')
      + (gfotos.length ? '<div class="gal rv">'+gfotos.map(function(g){
          var tag = g.legenda || (s.instagram ? '@'+s.instagram : s.nomeCurto);
          var a = s.instagram ? '<a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">' : '<span>';
          return a+'<img src="'+esc(g.foto)+'" alt="" loading="lazy"><span class="tag">'+esc(tag)+'</span>'+(s.instagram ? '</a>' : '</span>');
        }).join('')+'</div>' : '')
      + '</div></section>';
  }

  // --- FOOTER (contato) ---
  var foot = '<footer class="foot" id="es-contato"><div class="ct">'
    + '<div>'+marca+'<p class="about">'+esc(cx('contato', 'frase', V.nomeMod+' em '+(s.cidade || 'sua cidade')+'. Inscrição pelo AtletaPay, rápida e segura.'))+'</p></div>'
    + '<div><h4>Escola</h4><nav><a href="#es-clube">O clube</a>'+(escada.length ? '<a href="#es-graduacao">Graduação</a>' : '')+'<a href="#es-equipe">Equipe</a>'+(temHor ? '<a href="#es-horarios">Horários</a>' : '')+'<a href="#es-agenda">Agenda</a></nav></div>'
    + '<div><h4>Sistema</h4><nav><a href="'+esc(login)+'">Área do aluno</a><a href="'+esc(ins)+'">Inscrição</a><a href="'+esc(R('admin'))+'">Professores</a><a href="'+esc(R('instalar'))+'">Instalar o app</a><a href="'+esc(R('privacidade'))+'">Privacidade</a></nav></div>'
    + '<div class="cont"><h4>Contato</h4>'+(s.endereco ? '<p>'+esc(s.endereco)+'<br>'+esc(s.cidade)+(s.uf ? ' · '+esc(s.uf) : '')+'</p>' : (s.cidade ? '<p>'+esc(s.cidade)+(s.uf ? ' · '+esc(s.uf) : '')+'</p>' : ''))
    +   (zap ? '<p><a href="'+esc(zapHref)+'" target="_blank" rel="noopener noreferrer">WhatsApp '+esc(zapFmt)+'</a></p>' : '')
    +   (s.instagram ? '<p><a href="https://instagram.com/'+esc(encodeURIComponent(s.instagram))+'" target="_blank" rel="noopener noreferrer">@'+esc(s.instagram)+'</a></p>' : '')
    +   (s.dominio ? '<p><a href="https://'+esc(s.dominio)+'" target="_blank" rel="noopener noreferrer">'+esc(s.dominio)+'</a></p>' : '')
    +   '<a class="btn" href="'+esc(ins)+'" style="margin-top:8px"><span>Fazer inscrição</span></a></div>'
    + '<p class="cp"><span>© '+new Date().getFullYear()+' '+esc(s.nome)+' · Site gerado pelo <b>AtletaPay</b></span><span>atletapay.com.br/'+esc(s.slug)+'</span></p></div></footer>';

  site.className = 'es';
  site.innerHTML = hero + servicos + duo + principios + publico + cta + equipe + horarios + appSec + parceiros + foot;
  wire(site);
}

/* ========================================================================== */
/*  Comportamento                                                              */
/* ========================================================================== */
function wire(site){
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches;
  site.classList.add('js');
  var burger = site.querySelector('#es-burger'), nl = site.querySelector('#es-nl');
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
    site.querySelectorAll('.rv').forEach(function(el){ el.classList.add('in'); });
  }
  site.querySelectorAll('.hero .stat [data-count]').forEach(function(b){ setTimeout(function(){ count(b); }, 600); });
  if(reduce) return;
  var heroImg = site.querySelector('.hero .ph img'), ticking = false;
  addEventListener('scroll', function(){ if(ticking) return; ticking = true; requestAnimationFrame(function(){ if(heroImg && scrollY < innerHeight*1.2) heroImg.style.translate = '0 '+(scrollY*.15)+'px'; ticking = false; }); }, { passive:true });
  if(matchMedia('(hover:hover)').matches){
    site.querySelectorAll('[data-magnet]').forEach(function(b){
      b.addEventListener('mousemove', function(e){ var r = b.getBoundingClientRect(); b.style.transform = 'skewX(-12deg) translate('+((e.clientX-r.left-r.width/2)*.2)+'px,'+((e.clientY-r.top-r.height/2)*.26)+'px)'; });
      b.addEventListener('mouseleave', function(){ b.style.transform = ''; });
    });
    var ph = site.querySelector('.phone');
    if(ph){
      ph.addEventListener('mousemove', function(e){ var r = ph.getBoundingClientRect(), x = (e.clientX-r.left)/r.width-.5, y = (e.clientY-r.top)/r.height-.5; ph.style.transform = 'perspective(900px) rotateX('+(-y*10)+'deg) rotateY('+(x*13)+'deg)'; });
      ph.addEventListener('mouseleave', function(){ ph.style.transform = ''; });
    }
  }
}
