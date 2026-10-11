/* modalidades.js — escadas de graduação de cada arte marcial (multi-escola / AtletaPay).

Arquivo COMPARTILHADO: existe igual em js/modalidades.js (app) e em
functions/src/compartilhado/modalidades.js (servidor). Um teste do servidor
confere que os dois são idênticos — mudou um, copie para o outro.

Cada graduação: { nome, cor: [faixa1, faixa2, faixa3] } (o mesmo formato dos
cordões da capoeira em js/escola.js, para as telas desenharem igual) e, quando a
arte usa graus, `graus` = quantos graus aquela graduação admite. `codigo` é o
nome técnico da graduação na arte ("8º kyu", "10º gub", "1º dan", "P1") — só texto.
A ESCOLA guarda a própria escada (escolas/{id}.escada, gravada na ativação a
partir daqui); a escola pode ajustar a dela depois sem mudar o padrão.

Cada arte traz também `identidade` (ícone, termos e saudação) para as telas
usarem a linguagem certa: no boxe é "ringue" e "sparring", no judô é "tatame" e
"randori", na capoeira é "roda" e "jogo". Fontes das escadas: ver docs/ARTES.md. */

const C = {
  branca: '#F4F4F4', cinza: '#9E9E9E', preta: '#151515', azul: '#1E4FD8', azulClara: '#5BA7F7', roxa: '#6A2C91', marrom: '#6B3E26',
  amarela: '#F2C200', laranja: '#F57C00', verde: '#2E9D44', vermelha: '#C62828', neutra: '#C8CED6',
};
const lisa = (nome, cor, graus = 0) => ({ nome, cor: [cor, cor, cor], ...(graus ? { graus } : {}) });
const listrada = (nome, fora, meio, graus = 0) => ({ nome, cor: [fora, meio, fora], ...(graus ? { graus } : {}) });

// Jiu-Jitsu — quadro de graduação da CBJJ (enviado pelo Natanael em 08/10/2026).
// Títulos: Aluno (branca → azul), Instrutor (roxa, marrom), Professor (preta, graus 1–6),
// Mestre (coral 7º e 8º, vermelha 9º e 10º). Infantil (até 15 anos): branca, cinza,
// amarela, laranja e verde, todas lisas até 4 graus. Tempos:
//   permanenciaMeses = tempo mínimo NA faixa antes da próxima (azul 2 anos, roxa 1 ano e meio, marrom 1 ano);
//   grausMeses[i]    = tempo mínimo para chegar ao grau i+1 da preta (1º: 3 anos de faixa preta; 2º e 3º: 3 anos
//                      do grau anterior; 4º a 6º: 5 anos do grau anterior);
//   requisitoMeses   = tempo mínimo no grau anterior para chegar a esta (coral 7º e 8º: 7 anos; vermelha 9º: 10 anos).
// ponteira = a barra onde vão os graus (preta nas coloridas, vermelha na preta).
const faixa = (nome, cor, extra = {}) => ({ nome, cor: [cor, cor, cor], ...extra });
const JIUJITSU = {
  idadeKids: 16,
  adulto: [
    faixa('Branca', C.branca, { titulo: 'Aluno', ponteira: C.preta, graus: 4, requisito: 'Iniciante, qualquer idade' }),
    faixa('Azul', C.azul, { titulo: 'Aluno', ponteira: C.preta, graus: 4, idadeMin: 16, permanenciaMeses: 24 }),
    faixa('Roxa', C.roxa, { titulo: 'Instrutor', ponteira: C.preta, graus: 4, idadeMin: 16, permanenciaMeses: 18 }),
    faixa('Marrom', C.marrom, { titulo: 'Instrutor', ponteira: C.preta, graus: 4, idadeMin: 18, permanenciaMeses: 12 }),
    faixa('Preta', C.preta, { titulo: 'Professor', ponteira: C.vermelha, graus: 6, idadeMin: 19, grausMeses: [36, 36, 36, 60, 60, 60] }),
    { nome: 'Coral vermelha e preta', cor: [C.vermelha, C.preta, C.vermelha], padrao: 'blocos', titulo: 'Mestre', grauDan: 7, idadeMin: 19, requisitoMeses: 84 },
    { nome: 'Coral vermelha e branca', cor: [C.vermelha, C.branca, C.vermelha], padrao: 'blocos', titulo: 'Mestre', grauDan: 8, idadeMin: 19, requisitoMeses: 84 },
    faixa('Vermelha', C.vermelha, { titulo: 'Mestre', grauDan: 9, idadeMin: 19, requisitoMeses: 120,
      nota: '10º grau: apenas os pioneiros do Jiu-Jitsu da família Gracie — Carlos, Oswaldo, George, Gastão e Hélio Gracie.' }),
  ],
  kids: [
    faixa('Branca', C.branca, { titulo: 'Aluno', ponteira: C.preta, graus: 4, requisito: 'Iniciante, qualquer idade' }),
    faixa('Cinza', C.cinza, { titulo: 'Aluno', ponteira: C.preta, graus: 4, idadeMin: 4, idadeMax: 15 }),
    faixa('Amarela', C.amarela, { titulo: 'Aluno', ponteira: C.preta, graus: 4, idadeMin: 7, idadeMax: 15 }),
    faixa('Laranja', C.laranja, { titulo: 'Aluno', ponteira: C.preta, graus: 4, idadeMin: 10, idadeMax: 15 }),
    faixa('Verde', C.verde, { titulo: 'Aluno', ponteira: C.preta, graus: 4, idadeMin: 13, idadeMax: 15 }),
  ],
  criterios: ['Postura e base', 'Quedas', 'Guarda', 'Passagem de guarda', 'Raspagens', 'Finalizações', 'Defesa pessoal',
    'Respeito', 'Disciplina', 'Pontualidade', 'Frequência', 'Higiene', 'Aprendizado'],
};

// Judô — Regulamento de Graduação da CBJ (09/02/2011). Uma única sequência de kyu com idade
// mínima e carência; acima de 16 anos não precisa cumprir a sequência das faixas básicas e
// intermediárias (§ 4º do art. 2º), por isso a escada ADULTA vai direto pelas cores cheias e a
// INFANTIL (até 14 anos) usa as pontas. permanenciaMeses = carência mínima NA faixa antes da próxima.
// Preta: 1º dan aos 16 (1 ano de marrom competindo; 2 sem competir) e depois 2º dan 4 anos, 3º 5 anos,
// 4º e 5º 6 anos (grausMeses). Vermelha e branca (6º a 8º dan) e vermelha (9º e 10º) são faixas de mestre.
const kyu = (nome, cor, codigo, idadeMin, permanenciaMeses, extra = {}) => faixa(nome, cor, { codigo, titulo: 'Aluno', idadeMin, permanenciaMeses, ...extra });
const JUDO = {
  idadeKids: 15,
  adulto: [
    faixa('Branca', C.branca, { codigo: 'iniciante', titulo: 'Aluno', requisito: 'Iniciante, qualquer idade', permanenciaMeses: 3 }),
    kyu('Cinza', C.cinza, '10º kyu', 5, 6),
    kyu('Azul', C.azul, '8º kyu', 7, 6),
    kyu('Amarela', C.amarela, '6º kyu', 9, 12),
    kyu('Laranja', C.laranja, '4º kyu', 11, 12),
    kyu('Verde', C.verde, '3º kyu', 12, 12),
    kyu('Roxa', C.roxa, '2º kyu', 13, 12),
    kyu('Marrom', C.marrom, '1º kyu', 14, 12, { nota: 'Para a preta: 1 ano de marrom competindo ou 2 anos sem competir.' }),
    faixa('Preta', C.preta, { codigo: '1º dan', titulo: 'Sensei', ponteira: C.vermelha, grauDan: 1, graus: 4, idadeMin: 16, grausMeses: [48, 60, 72, 72] }),
    { nome: 'Vermelha e branca', cor: [C.vermelha, C.branca, C.vermelha], padrao: 'blocos', codigo: '6º dan', titulo: 'Mestre', grauDan: 6, graus: 2, idadeMin: 44, requisitoMeses: 84 },
    faixa('Vermelha', C.vermelha, { codigo: '9º dan', titulo: 'Mestre', grauDan: 9, graus: 1, idadeMin: 69, requisitoMeses: 108 }),
  ],
  kids: [
    faixa('Branca', C.branca, { codigo: 'iniciante', titulo: 'Aluno', requisito: 'Iniciante, qualquer idade', permanenciaMeses: 3 }),
    kyu('Branca ponta cinza', C.branca, '11º kyu', 4, 3, { ponteira: C.cinza, idadeMax: 14 }),
    kyu('Cinza', C.cinza, '10º kyu', 5, 6, { idadeMax: 14 }),
    kyu('Cinza ponta azul', C.cinza, '9º kyu', 6, 6, { ponteira: C.azul, idadeMax: 14 }),
    kyu('Azul', C.azul, '8º kyu', 7, 6, { idadeMax: 14 }),
    kyu('Azul ponta amarela', C.azul, '7º kyu', 8, 6, { ponteira: C.amarela, idadeMax: 14 }),
    kyu('Amarela', C.amarela, '6º kyu', 9, 12, { idadeMax: 14 }),
    kyu('Amarela ponta laranja', C.amarela, '5º kyu', 10, 12, { ponteira: C.laranja, idadeMax: 14 }),
    kyu('Laranja', C.laranja, '4º kyu', 11, 12, { idadeMax: 14 }),
    kyu('Verde', C.verde, '3º kyu', 12, 12, { idadeMax: 14 }),
    kyu('Roxa', C.roxa, '2º kyu', 13, 12, { idadeMax: 14 }),
    kyu('Marrom', C.marrom, '1º kyu', 14, 12, { idadeMax: 14 }),
  ],
  criterios: ['Ukemi (quedas)', 'Nage-waza (projeções)', 'Ne-waza (solo)', 'Kumi-kata (pegada)', 'Randori', 'Etiqueta (rei) e disciplina', 'Frequência', 'Aprendizado'],
};

// Karatê — sistema de kyu/dan. A sequência de cores muda conforme o estilo e a federação
// (a CBKT/Karatê Tradicional, por exemplo, começa na cinza e na azul); a mais comum no Brasil
// (Shotokan) é esta. A escola ajusta a dela em Graduação. Preta: 1º ao 5º dan como graus.
const KARATE = {
  idadeKids: 0,
  adulto: [
    faixa('Branca', C.branca, { codigo: 'iniciante', titulo: 'Aluno', requisito: 'Iniciante, qualquer idade' }),
    faixa('Amarela', C.amarela, { codigo: '7º kyu', titulo: 'Aluno' }),
    faixa('Vermelha', C.vermelha, { codigo: '6º kyu', titulo: 'Aluno' }),
    faixa('Laranja', C.laranja, { codigo: '5º kyu', titulo: 'Aluno' }),
    faixa('Verde', C.verde, { codigo: '4º kyu', titulo: 'Aluno' }),
    faixa('Roxa', C.roxa, { codigo: '3º kyu', titulo: 'Aluno' }),
    faixa('Marrom', C.marrom, { codigo: '2º e 1º kyu', titulo: 'Aluno', graus: 2, ponteira: C.preta, nota: 'Os graus marcam o 2º e o 1º kyu dentro da marrom.' }),
    faixa('Preta', C.preta, { codigo: '1º dan', titulo: 'Sensei', ponteira: C.vermelha, grauDan: 1, graus: 4, idadeMin: 16 }),
  ],
  kids: null,
  criterios: ['Kihon (fundamentos)', 'Kata', 'Kumite', 'Postura (dachi)', 'Kime (potência)', 'Etiqueta e disciplina', 'Frequência', 'Aprendizado'],
};

// Taekwondo (WT/Kukkiwon, como a CBTKD usa) — gub do 10º ao 1º com as "pontas" entre as cores,
// depois a preta (dan). Menores de 15 anos recebem POOM (faixa vermelha e preta) em vez de dan,
// por isso a escada infantil termina no Poom (1º ao 4º poom como graus).
const gub = (nome, cor, codigo, extra = {}) => faixa(nome, cor, { codigo, titulo: 'Aluno', ...extra });
const TKD_CORES = [
  gub('Branca', C.branca, '10º gub', { requisito: 'Iniciante, qualquer idade' }),
  gub('Branca ponta amarela', C.branca, '9º gub', { ponteira: C.amarela }),
  gub('Amarela', C.amarela, '8º gub'),
  gub('Amarela ponta verde', C.amarela, '7º gub', { ponteira: C.verde }),
  gub('Verde', C.verde, '6º gub'),
  gub('Verde ponta azul', C.verde, '5º gub', { ponteira: C.azul }),
  gub('Azul', C.azul, '4º gub'),
  gub('Azul ponta vermelha', C.azul, '3º gub', { ponteira: C.vermelha }),
  gub('Vermelha', C.vermelha, '2º gub'),
  gub('Vermelha ponta preta', C.vermelha, '1º gub', { ponteira: C.preta }),
];
const TAEKWONDO = {
  idadeKids: 15,
  adulto: [...TKD_CORES, faixa('Preta', C.preta, { codigo: '1º dan', titulo: 'Sabom', ponteira: C.amarela, grauDan: 1, graus: 8, idadeMin: 15 })],
  kids: [...TKD_CORES.map((g) => ({ ...g, idadeMax: 14 })), { nome: 'Poom', cor: [C.vermelha, C.preta, C.vermelha], padrao: 'blocos', codigo: '1º poom', titulo: 'Aluno', grauDan: 1, graus: 3, idadeMax: 14, nota: 'Poom: faixa preta dos menores de 15 anos; vira dan ao completar 15.' }],
  criterios: ['Chutes (chagi)', 'Poomsae', 'Kyorugi (combate)', 'Base e postura', 'Flexibilidade', 'Etiqueta e disciplina', 'Frequência', 'Aprendizado'],
};

// Muay Thai — na Tailândia não há graduação; no Brasil a Confederação Brasileira de Muay Thai (CBMT)
// usa o prajied/kruang com estas cores, sempre com a "ponta" anunciando a próxima cor:
// branca → vermelha → azul-clara → azul-escura (instrutor) → preta (professor) → preta e branca (mestre)
// → preta, branca e vermelha (grão-mestre). Muitas academias usam um arco-íris próprio
// (branca, amarela, laranja, verde, azul, roxa, vermelha, marrom, preta) — a escola troca em Graduação.
const prajied = (nome, cor, titulo, extra = {}) => faixa(nome, cor, { titulo, ...extra });
const MUAYTHAI = {
  idadeKids: 0,
  adulto: [
    prajied('Branca', C.branca, 'Aluno', { requisito: 'Iniciante, qualquer idade' }),
    prajied('Branca ponta vermelha', C.branca, 'Aluno', { ponteira: C.vermelha }),
    prajied('Vermelha', C.vermelha, 'Aluno'),
    prajied('Vermelha ponta azul-clara', C.vermelha, 'Aluno', { ponteira: C.azulClara }),
    prajied('Azul-clara', C.azulClara, 'Aluno'),
    prajied('Azul-clara ponta azul-escura', C.azulClara, 'Aluno', { ponteira: C.azul }),
    prajied('Azul-escura', C.azul, 'Instrutor'),
    prajied('Azul-escura ponta preta', C.azul, 'Instrutor master', { ponteira: C.preta }),
    prajied('Preta', C.preta, 'Professor (Kru)'),
    { nome: 'Preta e branca', cor: [C.preta, C.branca, C.preta], padrao: 'blocos', titulo: 'Mestre' },
    { nome: 'Preta, branca e vermelha', cor: [C.preta, C.branca, C.vermelha], padrao: 'blocos', titulo: 'Grão-mestre' },
  ],
  kids: null,
  criterios: ['Base e guarda', 'Socos e cotovelos', 'Chutes e joelhadas', 'Clinch', 'Defesas e esquivas', 'Condicionamento', 'Wai Kru e respeito', 'Frequência'],
};

// Kickboxing — graduação da CBKB (WAKO): branca, laranja, azul, amarela, verde, marrom,
// marrom ponta preta e preta (dan). A ordem é mesmo esta (laranja e azul antes da amarela).
const KICKBOXING = {
  idadeKids: 0,
  adulto: [
    faixa('Branca', C.branca, { titulo: 'Aluno', requisito: 'Iniciante, qualquer idade' }),
    faixa('Laranja', C.laranja, { titulo: 'Aluno' }),
    faixa('Azul', C.azul, { titulo: 'Aluno' }),
    faixa('Amarela', C.amarela, { titulo: 'Aluno' }),
    faixa('Verde', C.verde, { titulo: 'Aluno' }),
    faixa('Marrom', C.marrom, { titulo: 'Aluno' }),
    faixa('Marrom ponta preta', C.marrom, { titulo: 'Monitor', ponteira: C.preta }),
    faixa('Preta', C.preta, { codigo: '1º dan', titulo: 'Instrutor', ponteira: C.vermelha, grauDan: 1, graus: 4, idadeMin: 16 }),
  ],
  kids: null,
  criterios: ['Guarda e base', 'Socos', 'Chutes', 'Defesas e esquivas', 'Combinações', 'Condicionamento', 'Sparring', 'Frequência'],
};

// Krav Maga — escolhido o sistema de NÍVEIS da IKMF (International Krav Maga Federation):
// Practitioner P1–P5, Graduate G1–G5, Expert E1–E5 (acima disso, Master). Não há faixa: a
// graduação é um remendo (patch) no uniforme; as cores aqui são só visuais para as telas.
// Escolas da linha FSAKM (faixas branca → preta) trocam a escada em Graduação.
const nivel = (nome, cor, codigo, titulo, extra = {}) => faixa(nome, cor, { codigo, titulo, ...extra });
const KRAVMAGA = {
  idadeKids: 0,
  adulto: [
    nivel('Iniciante', C.neutra, 'P0', 'Aluno', { requisito: 'Iniciante, qualquer idade' }),
    nivel('Practitioner 1', C.amarela, 'P1', 'Aluno'), nivel('Practitioner 2', C.amarela, 'P2', 'Aluno'), nivel('Practitioner 3', C.amarela, 'P3', 'Aluno'),
    nivel('Practitioner 4', C.amarela, 'P4', 'Aluno'), nivel('Practitioner 5', C.amarela, 'P5', 'Aluno'),
    nivel('Graduate 1', C.azul, 'G1', 'Graduado'), nivel('Graduate 2', C.azul, 'G2', 'Graduado'), nivel('Graduate 3', C.azul, 'G3', 'Graduado'),
    nivel('Graduate 4', C.azul, 'G4', 'Graduado'), nivel('Graduate 5', C.azul, 'G5', 'Graduado'),
    nivel('Expert 1', C.preta, 'E1', 'Expert'), nivel('Expert 2', C.preta, 'E2', 'Expert'), nivel('Expert 3', C.preta, 'E3', 'Expert'),
    nivel('Expert 4', C.preta, 'E4', 'Expert'), nivel('Expert 5', C.preta, 'E5', 'Expert'),
  ],
  kids: null,
  criterios: ['Postura e base', 'Golpes (socos e chutes)', 'Defesas contra agarrões', 'Defesa contra armas', 'Consciência situacional', 'Condicionamento', 'Controle emocional', 'Frequência'],
};

// Artes sem faixa (boxe, MMA, wrestling): níveis que o treinador reconhece.
const NIVEIS_LUTA = ['Iniciante', 'Intermediário', 'Avançado', 'Competidor', 'Profissional'];
const NIVEIS_COR = { Iniciante: C.neutra, Intermediário: C.azul, Avançado: C.roxa, Competidor: C.vermelha, Profissional: C.preta };
const niveis = (nomes) => nomes.map((n, i) => ({ nome: n, cor: [NIVEIS_COR[n] || C.neutra, NIVEIS_COR[n] || C.neutra, NIVEIS_COR[n] || C.neutra], codigo: `nível ${i + 1}` }));

// Texto de requisito de uma graduação (o que o quadro e o app mostram).
const anos = (m) => { const a = m / 12; return a === 1 ? '1 ano' : Number.isInteger(a) ? `${a} anos` : a === 1.5 ? '1 ano e meio' : `${m} meses`; };
export function idadeTexto(g) {
  if (!g) return '';
  if (g.requisito) return g.requisito;
  if (g.idadeMax) return `${g.idadeMin} a ${g.idadeMax} anos`;
  return g.idadeMin ? `${g.idadeMin} anos ou mais` : 'Qualquer idade';
}
export function tempoTexto(g, grau = 0) {
  if (!g) return '';
  if (g.grausMeses && grau > 0) return grau === 1 ? `Mínimo ${anos(g.grausMeses[0])} de faixa ${g.nome.toLowerCase()}` : `Mínimo ${anos(g.grausMeses[grau - 1])} do grau anterior`;
  if (g.requisitoMeses) return `Mínimo ${anos(g.requisitoMeses)} do grau anterior`;
  if (g.permanenciaMeses) return `Mínimo ${anos(g.permanenciaMeses)} na faixa`;
  return '';
}

// Tempo em texto curto: "8 meses", "1 ano e 3 meses", "2 anos".
export function tempoCurto(m) {
  const n = Math.max(0, Math.floor(Number(m) || 0));
  if (n < 12) return n === 1 ? '1 mês' : `${n} meses`;
  const a = Math.floor(n / 12); const r = n % 12;
  return `${a === 1 ? '1 ano' : `${a} anos`}${r ? ` e ${r === 1 ? '1 mês' : `${r} meses`}` : ''}`;
}

// v34 — confere tempo mínimo e idade do quadro de graduação ANTES de o professor salvar.
// Não bloqueia (o professor decide); devolve avisos para a tela:
//   [{ nivel: 'ok' | 'atencao' | 'info', texto }]
// lista = escada da pessoa (adulto ou kids); pessoa = { cordaoAtual, grausAtual, idade, historicoGraduacoes }.
// Datas: a troca de faixa é a linha do histórico em que a pessoa ENTROU na faixa (anterior diferente);
// o grau é a última linha daquela faixa com aquele grau.
export function conferirTempo(lista, pessoa, novoNome, novoGraus = 0, hoje = new Date()) {
  const av = [];
  if (!Array.isArray(lista) || !lista.length || !pessoa) return av;
  const atualNome = pessoa.cordaoAtual && lista.some((g) => g.nome === pessoa.cordaoAtual) ? pessoa.cordaoAtual : lista[0].nome;
  const atualGraus = Math.max(0, Number(pessoa.grausAtual) || 0);
  const iA = lista.findIndex((g) => g.nome === atualNome);
  const iN = lista.findIndex((g) => g.nome === novoNome);
  if (iN < 0) return av;
  const novo = lista[iN]; const atual = lista[iA];
  const idade = Number(pessoa.idade) || 0;
  const hist = Array.isArray(pessoa.historicoGraduacoes) ? pessoa.historicoGraduacoes : [];
  const ultima = (f) => { for (let i = hist.length - 1; i >= 0; i -= 1) { const h = hist[i]; if (h && f(h)) return h.em || null; } return null; };
  const entrouNaFaixa = ultima((h) => h.cordao === atualNome && h.anterior !== atualNome);
  const ultimoGrau = atualGraus ? ultima((h) => h.cordao === atualNome && (Number(h.grau) || 0) === atualGraus) : null;
  const mesesDesde = (iso) => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? Math.floor((hoje.getTime() - t) / (30.44 * 86400000)) : null; };
  const conferir = (req, desde, rotulo) => {
    if (!req) return;
    const m = mesesDesde(desde);
    if (m === null) av.push({ nivel: 'info', texto: `Tempo mínimo: ${tempoCurto(req)} ${rotulo}. A data não está no app — confira antes de graduar.` });
    else if (m < req) av.push({ nivel: 'atencao', texto: `Tempo mínimo: ${tempoCurto(req)} ${rotulo}. Faz ${tempoCurto(m)} — faltam ${tempoCurto(req - m)}.` });
    else av.push({ nivel: 'ok', texto: `Tempo mínimo cumprido: ${tempoCurto(m)} ${rotulo} (mínimo ${tempoCurto(req)}).` });
  };
  if (iN > iA) {
    if (novo.idadeMin && idade && idade < novo.idadeMin) av.push({ nivel: 'atencao', texto: `A faixa ${novo.nome} pede ${novo.idadeMin} anos ou mais (tem ${idade}).` });
    if (novo.idadeMax && idade && idade > novo.idadeMax) av.push({ nivel: 'atencao', texto: `A faixa ${novo.nome} vai só até ${novo.idadeMax} anos (tem ${idade}).` });
    if (iN > iA + 1) av.push({ nivel: 'info', texto: `Pula ${iN - iA - 1 === 1 ? '1 faixa' : `${iN - iA - 1} faixas`} de uma vez — se a pessoa já tinha a faixa antes do app, marque "já tinha".` });
    else if (novo.requisitoMeses) conferir(novo.requisitoMeses, ultimoGrau || entrouNaFaixa, atualGraus ? `no ${atualGraus}º grau` : `na faixa ${atualNome}`);
    else if (atual && atual.permanenciaMeses) conferir(atual.permanenciaMeses, entrouNaFaixa, `na faixa ${atualNome}`);
  } else if (iN === iA && novoGraus > atualGraus) {
    if (novoGraus > atualGraus + 1) av.push({ nivel: 'info', texto: `Sobe ${novoGraus - atualGraus} graus de uma vez.` });
    else if (Array.isArray(atual.grausMeses) && atual.grausMeses[novoGraus - 1]) {
      conferir(atual.grausMeses[novoGraus - 1], atualGraus ? ultimoGrau : entrouNaFaixa, atualGraus ? `desde o ${atualGraus}º grau` : `de faixa ${atualNome.toLowerCase()}`);
    }
  }
  return av;
}

// Escada só com nomes (as do catálogo da AtletaPay) → cores pelo nome da cor.
function escadaDeNomes(nomes, graus = 0) {
  const cor = (n) => { const k = Object.keys(C).find((c) => String(n).toLowerCase().startsWith(c)); return C[k || 'neutra']; };
  return nomes.map((n) => lisa(n, cor(n), graus));
}
const CRITERIOS_GERAIS = ['Técnica', 'Condicionamento', 'Respeito', 'Disciplina', 'Pontualidade', 'Frequência', 'Eventos e competições', 'Higiene', 'Aprendizado', 'Fundamentos'];

// Identidade de cada arte para as telas: ícone (classe do Font Awesome 6 já carregado no app),
// termoTreino (como se chama a sessão), termoLuta (o combate de treino), termoLocal (onde se treina)
// e saudacao (o que se diz ao entrar). Tudo em minúsculas, pronto para entrar no meio da frase.
const identidade = (icone, termoTreino, termoLuta, termoLocal, saudacao) => ({ icone, termoTreino, termoLuta, termoLocal, saudacao });

export const MODALIDADES = {
  capoeira: { nome: 'Capoeira', lider: 'Mestre', peca: 'cordão', idadeKids: 12, adulto: null, kids: null, criterios: null, // a Liberdade usa js/escola.js
    identidade: identidade('fa-drum', 'treino', 'jogo', 'roda', 'Salve') },
  jiujitsu: { nome: 'Jiu-jitsu', lider: 'Professor', peca: 'faixa', ...JIUJITSU, identidade: identidade('fa-user-ninja', 'treino', 'rola', 'tatame', 'Oss') },
  judo: { nome: 'Judô', lider: 'Sensei', peca: 'faixa', ...JUDO, identidade: identidade('fa-people-arrows', 'treino', 'randori', 'tatame', 'Oss') },
  karate: { nome: 'Karatê', lider: 'Sensei', peca: 'faixa', ...KARATE, identidade: identidade('fa-hand-fist', 'treino', 'kumite', 'dojo', 'Oss') },
  taekwondo: { nome: 'Taekwondo', lider: 'Sabom', peca: 'faixa', ...TAEKWONDO, identidade: identidade('fa-shoe-prints', 'treino', 'kyorugi', 'dojang', 'Taekwon') },
  muaythai: { nome: 'Muay Thai', lider: 'Kru', peca: 'prajied', ...MUAYTHAI, identidade: identidade('fa-hand-fist', 'treino', 'sparring', 'ringue', 'Sawasdee') },
  boxe: { nome: 'Boxe', lider: 'Treinador', peca: 'nível', idadeKids: 0, adulto: niveis(NIVEIS_LUTA), kids: null,
    criterios: ['Guarda e base', 'Jab e direto', 'Ganchos e uppercuts', 'Esquivas e bloqueios', 'Movimentação de pés', 'Condicionamento', 'Sparring', 'Frequência'],
    identidade: identidade('fa-hand-back-fist', 'treino', 'sparring', 'ringue', 'Bom treino') },
  kickboxing: { nome: 'Kickboxing', lider: 'Treinador', peca: 'faixa', ...KICKBOXING, identidade: identidade('fa-bolt', 'treino', 'sparring', 'ringue', 'Bom treino') },
  mma: { nome: 'MMA', lider: 'Coach', peca: 'nível', idadeKids: 0, adulto: niveis(NIVEIS_LUTA), kids: null,
    criterios: ['Striking (luta em pé)', 'Wrestling e quedas', 'Grappling (solo)', 'Defesa de queda', 'Clinch e grade', 'Condicionamento', 'Sparring', 'Disciplina'],
    identidade: identidade('fa-shield-halved', 'treino', 'sparring', 'tatame', 'Bom treino') },
  wrestling: { nome: 'Wrestling (luta olímpica)', lider: 'Treinador', peca: 'nível', idadeKids: 0, adulto: niveis(['Iniciante', 'Intermediário', 'Avançado', 'Competidor']), kids: null,
    criterios: ['Base e postura', 'Quedas (takedowns)', 'Defesa de queda (sprawl)', 'Pegadas e controle', 'Trabalho de solo', 'Condicionamento', 'Disciplina', 'Frequência'],
    identidade: identidade('fa-people-arrows', 'treino', 'combate', 'tatame', 'Bom treino') },
  kravmaga: { nome: 'Krav Maga', lider: 'Instrutor', peca: 'nível', ...KRAVMAGA, identidade: identidade('fa-shield-halved', 'treino', 'simulação', 'tatame', 'Kida') },
  kungfu: { nome: 'Kung Fu', lider: 'Sifu', peca: 'faixa', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Amarela', 'Verde', 'Azul', 'Marrom', 'Preta']), kids: null,
    criterios: ['Posturas (bases)', 'Formas (taolu)', 'Golpes de mão', 'Chutes', 'Sanda (combate)', 'Flexibilidade', 'Disciplina', 'Frequência'],
    identidade: identidade('fa-dragon', 'treino', 'sanda', 'kwoon', 'Ni hao') },
  outra: { nome: 'Outra arte marcial', lider: 'Professor', peca: 'graduação', idadeKids: 0, adulto: escadaDeNomes(['Iniciante', 'Intermediário', 'Avançado']), kids: null, criterios: CRITERIOS_GERAIS,
    identidade: identidade('fa-medal', 'treino', 'sparring', 'tatame', 'Bom treino') },
};

// Identidade da arte (ícone, termos, saudação). Arte desconhecida → a de "outra".
export const identidadeDa = (modalidade) => (MODALIDADES[modalidade] || MODALIDADES.outra).identidade;
// Termos da arte para montar frases: { treino, luta, local, saudacao, arte, lider, peca }.
export function termosDa(modalidade) {
  const m = MODALIDADES[modalidade] || MODALIDADES.outra; const i = m.identidade;
  return { treino: i.termoTreino, luta: i.termoLuta, local: i.termoLocal, saudacao: i.saudacao, arte: m.nome, lider: m.lider, peca: m.peca };
}

// Escada padrão que a escola recebe na ativação. graduacoesDoCadastro: a lista simples
// que o dono confirmou no cadastro (usada quando a modalidade não tem escada própria).
export function escadaPadrao(modalidade, graduacoesDoCadastro = []) {
  const m = MODALIDADES[modalidade] || MODALIDADES.outra;
  const adulto = m.adulto || (graduacoesDoCadastro.length ? escadaDeNomes(graduacoesDoCadastro) : MODALIDADES.outra.adulto);
  return {
    modalidade: MODALIDADES[modalidade] ? modalidade : 'outra',
    peca: m.peca, lider: m.lider, idadeKids: m.idadeKids || 0,
    adulto, kids: m.kids || null, criterios: m.criterios || CRITERIOS_GERAIS,
  };
}

// Qual lista vale para a pessoa (infantil abaixo de idadeKids, quando a escola tem).
export function listaDa(escada, idade) {
  const i = Number(idade) || 0;
  return escada && escada.kids && escada.kids.length && i > 0 && i < (escada.idadeKids || 0) ? escada.kids : (escada && escada.adulto) || [];
}

// Graduação de quem acabou de entrar ('Iniciante' é o valor neutro da inscrição).
export const graduacaoInicial = (escada, idade) => (listaDa(escada, idade)[0] || { nome: 'Iniciante' }).nome;

// "Preta · 3º grau", "Azul · 1º grau", "Roxa", "Coral vermelha e preta · 7º grau".
// grad (opcional): a graduação da escada — as faixas de mestre já são um grau (grauDan).
export function rotuloGraduacao(nome, graus, grad = null) {
  const g = Math.max(0, Math.floor(Number(graus) || 0));
  if (grad && grad.grauDan) return `${nome} · ${grad.grauDan + g}º grau`;
  return g ? `${nome} · ${g}º grau` : String(nome || '');
}

// Graduação do responsável a partir do que ele escreveu no cadastro ("Faixa preta 3º grau").
// Devolve { nome, graus } — a mais alta da escada adulta cujo nome aparece no texto; senão a última.
export function graduacaoDoTexto(escada, texto) {
  const lista = (escada && escada.adulto) || [];
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sem = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let achada = null;
  lista.forEach((g) => { if (t && t.includes(sem(g.nome))) achada = g; });
  const g = achada || lista[lista.length - 1] || { nome: 'Iniciante' };
  const m = /(\d{1,2})\s*(?:º|o|°)?\s*grau/.exec(t);
  const graus = m ? Math.min(Number(m[1]), g.graus || 0) : 0;
  return { nome: g.nome, graus };
}

// Limpa uma escada vinda do banco (escola pode ter editado): só campos conhecidos e tamanhos razoáveis.
export function escadaLimpa(e) {
  if (!e || typeof e !== 'object') return null;
  const cor = (c) => (/^#[0-9a-f]{3,6}$/i.test(String(c)) ? String(c) : C.neutra);
  const lista = (l) => (Array.isArray(l) ? l.slice(0, 40).filter((g) => g && typeof g.nome === 'string' && g.nome.trim())
    .map((g) => {
      const n = (v, max) => (Number(v) > 0 ? Math.min(max, Math.floor(Number(v))) : null);
      const t = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
      const extra = {
        graus: n(g.graus, 10), titulo: t(g.titulo, 20), ponteira: /^#[0-9a-f]{3,6}$/i.test(String(g.ponteira)) ? String(g.ponteira) : null,
        padrao: g.padrao === 'blocos' ? 'blocos' : null, idadeMin: n(g.idadeMin, 99), idadeMax: n(g.idadeMax, 99),
        permanenciaMeses: n(g.permanenciaMeses, 600), requisitoMeses: n(g.requisitoMeses, 600), grauDan: n(g.grauDan, 10),
        grausMeses: Array.isArray(g.grausMeses) ? g.grausMeses.slice(0, 10).map((m) => n(m, 600) || 0) : null,
        requisito: t(g.requisito, 80), nota: t(g.nota, 200), codigo: t(g.codigo, 20),
      };
      return { nome: g.nome.trim().slice(0, 40), cor: (Array.isArray(g.cor) ? g.cor : [g.cor, g.cor, g.cor]).slice(0, 3).map(cor),
        ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== null)) };
    }) : null);
  const adulto = lista(e.adulto);
  if (!adulto || !adulto.length) return null;
  const kids = lista(e.kids);
  return {
    modalidade: String(e.modalidade || 'outra').slice(0, 30), peca: String(e.peca || 'graduação').slice(0, 20), lider: String(e.lider || 'Professor').slice(0, 30),
    idadeKids: Math.min(18, Math.max(0, Math.floor(Number(e.idadeKids) || 0))), adulto, kids: kids && kids.length ? kids : null,
    criterios: Array.isArray(e.criterios) ? e.criterios.filter((c) => typeof c === 'string').slice(0, 20).map((c) => c.slice(0, 40)) : CRITERIOS_GERAIS,
  };
}
