/* dados-demo.js — a escola FICTÍCIA da vitrine de demonstração (v38.2).

"Academia Horizonte" não existe: nomes, fotos (desenhadas aqui mesmo, sem foto de ninguém),
valores e presenças são inventados e as datas acompanham o dia de hoje, para a vitrine estar
sempre "viva". Mostra o que um mestre de várias artes tem no AtletaPay: jiu-jitsu adulto (turma
padrão do núcleo), jiu-jitsu kids com graus vermelhos, muay thai com prajied, capoeira com cordas,
dois núcleos, mensalidades, presenças, pedidos, eventos e a árvore de formação.

Lido só por js/demo/sdk-demo.js. O id da escola, `demo`, é reservado (ninguém consegue
cadastrar uma escola com esse endereço). */
import { escadaPadrao, escadaLimpa, listaDa } from '../modalidades.js';
import { ESCADA_CAPOEIRA } from '../escola.js';

export const ESCOLA_DEMO = 'demo';
const E = ESCOLA_DEMO;

/* ---------- utilidades determinísticas (a mesma vitrine para todo mundo) ---------- */
let semente = 20261011;
const rnd = () => { semente = (semente * 1664525 + 1013904223) % 4294967296; return semente / 4294967296; };
const escolher = (l) => l[Math.floor(rnd() * l.length)];
const entre = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const HOJE = new Date();
const diasAtras = (n, h = 19, m = 0) => { const d = new Date(HOJE); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d; };
const iso = (d) => d.toISOString();
const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const mesesAtras = (n) => { const d = new Date(HOJE.getFullYear(), HOJE.getMonth() - n, 10, 12); return d; };
const competencia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const nascido = (idade) => { const d = new Date(HOJE); d.setFullYear(d.getFullYear() - idade); d.setMonth(entre(0, 11)); d.setDate(entre(1, 27)); return dia(d); };
const ts = (d) => ({ __ts: d.getTime() });

/* ---------- avatares desenhados (canvas → PNG; o app só aceita https, relativo ou PNG/JPEG em base64) ---------- */
const PELES = ['#F2D1B3', '#E0AC86', '#C68863', '#9C6644', '#7A4A2E', '#5C3A21'];
const CABELOS = ['#1F1A17', '#3B2A20', '#6B4423', '#2B2B2B', '#8C5A2B', '#121212'];
function avatar(nome, fundo, kimono = '#FFFFFF', faixa = '#1E1E1E', crianca = false) {
  try {
    if (typeof document === 'undefined') return '';
    const c = document.createElement('canvas'); c.width = 160; c.height = 160;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 160, 160); gr.addColorStop(0, fundo); gr.addColorStop(1, '#002D72');
    g.fillStyle = gr; g.fillRect(0, 0, 160, 160);
    // brilho suave
    g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.arc(30, 20, 70, 0, Math.PI * 2); g.fill();
    const pele = escolher(PELES); const cabelo = escolher(CABELOS);
    const cab = crianca ? 26 : 30; const cy = crianca ? 72 : 66;
    // ombros com kimono e gola em V
    g.fillStyle = kimono; g.beginPath(); g.ellipse(80, 168, 62, 50, 0, Math.PI, 0); g.fill();
    g.fillStyle = pele; g.beginPath(); g.moveTo(66, 120); g.lineTo(80, 146); g.lineTo(94, 120); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 118); g.lineTo(80, 152); g.lineTo(100, 118); g.stroke();
    // faixa na base
    g.fillStyle = faixa; g.fillRect(18, 150, 124, 10);
    // pescoço e rosto
    g.fillStyle = pele; g.fillRect(70, cy + cab - 6, 20, 24);
    g.beginPath(); g.arc(80, cy, cab, 0, Math.PI * 2); g.fill();
    // cabelo
    g.fillStyle = cabelo; g.beginPath(); g.arc(80, cy - 4, cab + 1, Math.PI * 1.05, Math.PI * 1.95); g.fill();
    if (rnd() < 0.45) { g.beginPath(); g.ellipse(80, cy - cab + 6, cab * 0.9, 10, 0, 0, Math.PI * 2); g.fill(); }
    // olhos e sorriso
    g.fillStyle = '#1B1B1B'; g.beginPath(); g.arc(70, cy + 2, 3, 0, Math.PI * 2); g.arc(90, cy + 2, 3, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1B1B1B'; g.lineWidth = 2.5; g.beginPath(); g.arc(80, cy + 10, 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    void nome;
    return c.toDataURL('image/png');
  } catch (e) { return ''; }
}

/* ---------- escadas ---------- */
const ESCADA_JJ = escadaLimpa(escadaPadrao('jiujitsu'));
const ESCADA_MUAY = { ...escadaLimpa(escadaPadrao('muaythai')), peca: 'prajied' };
const ESCADA_CAPO = { ...escadaLimpa(ESCADA_CAPOEIRA), peca: 'corda' };
const CORES_FAIXA = { Branca: '#F5F5F5', Azul: '#1E4FD8', Roxa: '#6B2FA3', Marrom: '#6B3E1F', Preta: '#141414', Cinza: '#8C8C8C', Amarela: '#F2C200', Laranja: '#F07800', Verde: '#169B45' };

/* ---------- escola, núcleos e turmas ---------- */
const SEDE = 'demo-sede';
const BAIRRO = 'demo-jardim';
const escolasPublicas = {
  [E]: {
    id: E, slug: 'demo', nome: 'Academia Horizonte', nomeCurto: 'Horizonte', status: 'ativa',
    modalidade: 'jiujitsu', lider: 'Professor', pecaGraduacao: 'faixa', escada: ESCADA_JJ,
    responsavel: { nome: 'Prof. Rafael Monteiro', graduacao: 'Faixa preta 3º grau' },
    cidade: 'Campo Grande', uf: 'MS', logo: null, nucleoSede: SEDE,
    cores: { teal: '#389E92', navy: '#002D72', verde: '#00E676', fundo: '#EAF2F1' },
    demonstracao: true,
  },
};

const pessoas = {};
const add = (id, p) => { pessoas[id] = { escolaId: E, ativo: true, statusAtual: 'Ativo', consentimento: { versaoTermo: '2026-09-26', em: iso(diasAtras(200)) }, criadoEm: iso(diasAtras(entre(60, 700))), notas: {}, ...p }; return id; };
const notas = (base, n = 15) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i + 1}`, Math.max(3, Math.min(10, base + entre(-2, 2)))]));
const carteirinha = (i) => ({ codigo: `HZ-${String(1000 + i)}`, matricula: String(2026000 + i), ativo: true, fotoAprovada: true, controle: 'mensalidade', validaAte: dia(new Date(HOJE.getFullYear() + 1, 0, 31)) });

// Equipe
const RAFAEL = add('demo-rafael', {
  nome: 'Rafael Monteiro', email: 'rafael@exemplo.atletapay.com.br', papeis: ['aluno', 'mestre', 'admin'], acessoGeral: true,
  academiaId: SEDE, academiaNome: 'Horizonte · Centro', academiaGerenciadaId: SEDE, cordaoAtual: 'Preta', grausAtual: 3, idade: 41, dataNasc: nascido(41),
  celular: '(67) 99999-0001', fotoUrl: avatar('Rafael', '#389E92', '#FFFFFF', '#141414'), notas: notas(9), notasProfessor: { f1: 10, f2: 9, f3: 10, f4: 9, f5: 10 },
  historicoGraduacoes: [{ cordao: 'Preta', anterior: 'Marrom', grau: 0, em: iso(diasAtras(2900)), porNome: 'Mestre (linhagem)' }, { cordao: 'Preta', grau: 3, anteriorGrau: 2, em: iso(diasAtras(400)), porNome: 'Mestre (linhagem)' }],
});
const CAMILA = add('demo-camila', {
  nome: 'Camila Duarte', papeis: ['aluno', 'mestre'], academiaId: BAIRRO, academiaNome: 'Horizonte · Jardim dos Estados', academiaGerenciadaId: BAIRRO,
  cordaoAtual: 'Preta', grausAtual: 1, idade: 34, dataNasc: nascido(34), formadorUid: RAFAEL, fotoUrl: avatar('Camila', '#2F6FED', '#FFFFFF', '#141414'), notas: notas(9), notasProfessor: { f1: 9, f2: 10, f3: 9, f4: 9, f5: 9 },
  historicoGraduacoes: [{ cordao: 'Preta', anterior: 'Marrom', grau: 0, em: iso(diasAtras(700)), por: RAFAEL, porNome: 'Rafael Monteiro' }],
});
const THIAGO = add('demo-thiago', {
  nome: 'Thiago Sales', papeis: ['aluno', 'instrutor'], academiaId: SEDE, academiaNome: 'Horizonte · Centro', cordaoAtual: 'Marrom', grausAtual: 2, idade: 27, dataNasc: nascido(27),
  formadorUid: RAFAEL, instrutorSupervisorUid: RAFAEL, fotoUrl: avatar('Thiago', '#D98E04', '#FFFFFF', CORES_FAIXA.Marrom), notas: notas(8), notasProfessor: { f1: 9, f2: 8, f3: 9, f4: 8, f5: 9 },
});
const BRUNO = add('demo-bruno', {
  nome: 'Bruno Teixeira (Kru Bruno)', papeis: ['aluno', 'instrutor'], academiaId: SEDE, academiaNome: 'Horizonte · Centro', turmaId: 'demo-t-muay', cordaoAtual: 'Preta', grausAtual: 0, idade: 36, dataNasc: nascido(36),
  formadorUid: RAFAEL, fotoUrl: avatar('Bruno', '#E5484D', '#1E1E1E', '#141414'), notas: notas(9),
});
const LUANA = add('demo-luana', {
  nome: 'Luana Ferraz (Contramestre Lua)', papeis: ['aluno', 'instrutor'], academiaId: SEDE, academiaNome: 'Horizonte · Centro', turmaId: 'demo-t-capo', cordaoAtual: 'Professor', grausAtual: 0, idade: 38, dataNasc: nascido(38),
  formadorUid: RAFAEL, fotoUrl: avatar('Luana', '#0E9F6E', '#FFFFFF', '#6B2FA3'), notas: notas(9),
});

const nucleos = {
  [SEDE]: { nome: 'Horizonte · Centro', mensalidadeValor: 180, professorUid: RAFAEL, professorNome: 'Rafael Monteiro', ativo: true, endereco: 'Rua das Garças, 1200 · Centro · Campo Grande/MS', latitude: -20.4628, longitude: -54.6152, raioMetros: 120, escolaId: E, criadoEm: iso(diasAtras(900)) },
  [BAIRRO]: { nome: 'Horizonte · Jardim dos Estados', mensalidadeValor: 150, professorUid: CAMILA, professorNome: 'Camila Duarte', ativo: true, endereco: 'Av. Afonso Pena, 4100 · Jardim dos Estados', latitude: -20.4497, longitude: -54.5907, raioMetros: 120, escolaId: E, criadoEm: iso(diasAtras(420)) },
};

const turmas = {
  'demo-t-kids': { escolaId: E, academiaId: SEDE, nome: 'Jiu-jitsu · Kids', arte: 'jiujitsu', cor: '#D98E04', graduacao: 'faixas', escada: ESCADA_JJ, professorUid: THIAGO, professorNome: 'Thiago Sales', mensalidade: 140, horarios: [{ dias: ['seg', 'qua'], hora: '17:30' }], dias: ['seg', 'qua'], hora: '17:30', ativa: true, padrao: false, criadoEm: iso(diasAtras(300)) },
  'demo-t-muay': { escolaId: E, academiaId: SEDE, nome: 'Muay Thai', arte: 'muaythai', cor: '#E5484D', graduacao: 'prajied', escada: ESCADA_MUAY, professorUid: BRUNO, professorNome: 'Bruno Teixeira', mensalidade: 160, horarios: [{ dias: ['ter', 'qui'], hora: '20:00' }, { dias: ['sab'], hora: '10:00' }], dias: ['ter', 'qui'], hora: '20:00', ativa: true, padrao: false, criadoEm: iso(diasAtras(240)) },
  'demo-t-capo': { escolaId: E, academiaId: SEDE, nome: 'Capoeira · Adultos', arte: 'capoeira', cor: '#0E9F6E', graduacao: 'cordas', escada: ESCADA_CAPO, professorUid: LUANA, professorNome: 'Luana Ferraz', mensalidade: 120, horarios: [{ dias: ['seg', 'qua'], hora: '19:30' }, { dias: ['sex'], hora: '18:00' }], dias: ['seg', 'qua'], hora: '19:30', ativa: true, padrao: false, criadoEm: iso(diasAtras(180)) },
};

/* ---------- alunos ---------- */
const NOMES_ADULTOS = ['Ana Beatriz Lima', 'Pedro Henrique Rocha', 'Juliana Matos', 'Gustavo Pereira', 'Larissa Campos', 'Diego Almeida', 'Fernanda Souza', 'Mateus Ribeiro', 'Carolina Nunes', 'Rodrigo Barros', 'Patrícia Gomes', 'Felipe Carvalho', 'Aline Martins', 'Vinícius Araújo', 'Bianca Freitas', 'Leonardo Dias'];
const NOMES_KIDS = ['Miguel Costa', 'Alice Fernandes', 'Davi Moreira', 'Helena Cardoso', 'Arthur Pinto', 'Laura Teixeira', 'Heitor Mendes', 'Valentina Rocha'];
const NOMES_MUAY = ['Renata Vieira', 'Caio Moura', 'Tatiane Ramos', 'Igor Batista', 'Sabrina Lopes', 'Marcelo Duarte'];
const NOMES_CAPO = ['João Vitor Santana', 'Mariana Quintela', 'Ícaro Nascimento', 'Paula Regina Cruz', 'Samuel Brito'];
const NOMES_JARDIM = ['Eduardo Fonseca', 'Lívia Andrade', 'Bruno Cesar Lima', 'Gabriela Torres', 'Otávio Prado', 'Natália Reis'];

let n = 0;
const alunos = [];
function aluno(nome, { academiaId, turmaId, idade, escada, formador, cor, kimono = '#FFFFFF', inativo = false, extras = {} }) {
  n += 1;
  const lista = listaDa(escada, idade);
  const nivel = Math.min(lista.length - 1, Math.floor(Math.pow(rnd(), 1.8) * Math.min(lista.length, idade < 16 ? 5 : 5)));
  const grad = lista[nivel] || lista[0];
  const graus = grad.graus ? entre(0, grad.graus === 6 ? 2 : grad.graus) : 0;
  const id = add(`demo-a${n}`, {
    nome, papeis: ['aluno'], academiaId, academiaNome: nucleos[academiaId].nome, ...(turmaId ? { turmaId } : {}),
    cordaoAtual: grad.nome, grausAtual: graus, ...(idade < 16 && graus === 4 && rnd() < 0.6 ? { grausVermelhos: entre(1, 3) } : {}),
    idade, dataNasc: nascido(idade), celular: `(67) 9${entre(8100, 9999)}-${entre(1000, 9999)}`, formadorUid: formador,
    fotoUrl: avatar(nome, cor, kimono, CORES_FAIXA[grad.nome] || '#7A7A7A', idade < 16),
    notas: notas(entre(5, 9)), carteirinha: carteirinha(n),
    ...(inativo ? { statusAtual: 'Inativo', ativo: false } : {}),
    ...(idade < 18 ? { responsavelContato: { nome: `Responsável de ${nome.split(' ')[0]}`, parentesco: escolher(['Mãe', 'Pai', 'Avó']), telefone: `(67) 9${entre(8100, 9999)}-${entre(1000, 9999)}` } } : {}),
    historicoGraduacoes: nivel > 0 ? [{ cordao: grad.nome, anterior: lista[nivel - 1].nome, grau: 0, em: iso(diasAtras(entre(90, 500))), por: formador, porNome: pessoas[formador] ? pessoas[formador].nome : '' }] : [],
    ...extras,
  });
  alunos.push(id);
  return id;
}
NOMES_ADULTOS.forEach((nome, i) => aluno(nome, { academiaId: SEDE, idade: entre(18, 45), escada: ESCADA_JJ, formador: i % 3 === 0 ? THIAGO : RAFAEL, cor: '#389E92', inativo: i === 13, extras: i === 4 ? { inclusao: { condicoes: ['TDAH'], apoios: ['Instruções curtas'], observacoes: 'Rende melhor nos primeiros 40 minutos.' } } : {} }));
NOMES_KIDS.forEach((nome, i) => aluno(nome, { academiaId: SEDE, turmaId: 'demo-t-kids', idade: entre(5, 13), escada: ESCADA_JJ, formador: THIAGO, cor: '#D98E04', extras: i === 2 ? { inclusao: { condicoes: ['TEA'], apoios: ['Rotina previsível', 'Aviso antes de mudar de exercício'], observacoes: '' } } : {} }));
NOMES_MUAY.forEach((nome) => aluno(nome, { academiaId: SEDE, turmaId: 'demo-t-muay', idade: entre(19, 40), escada: ESCADA_MUAY, formador: BRUNO, cor: '#E5484D', kimono: '#1E1E1E' }));
NOMES_CAPO.forEach((nome) => aluno(nome, { academiaId: SEDE, turmaId: 'demo-t-capo', idade: entre(17, 44), escada: ESCADA_CAPO, formador: LUANA, cor: '#0E9F6E' }));
NOMES_JARDIM.forEach((nome) => aluno(nome, { academiaId: BAIRRO, idade: entre(16, 38), escada: ESCADA_JJ, formador: CAMILA, cor: '#2F6FED' }));
// Um aluno kids com os 4 graus brancos e graus vermelhos por cima (regra pedida para o jiu-jitsu infantil).
pessoas['demo-a17'] = { ...pessoas['demo-a17'], cordaoAtual: 'Cinza', grausAtual: 4, grausVermelhos: 2 };

/* ---------- presenças (últimos 60 dias) ---------- */
const presencas = {};
let np = 0;
const DIAS_DA_TURMA = { '': [1, 3, 5], 'demo-t-kids': [1, 3], 'demo-t-muay': [2, 4, 6], 'demo-t-capo': [1, 3, 5] };
for (const id of [...alunos, THIAGO, BRUNO, LUANA, CAMILA]) {
  const p = pessoas[id];
  if (p.statusAtual !== 'Ativo') continue;
  const assiduidade = 0.35 + rnd() * 0.6;
  const dias = DIAS_DA_TURMA[p.turmaId || ''] || [1, 3, 5];
  for (let d = 0; d < 60; d += 1) {
    const data = diasAtras(d, p.turmaId === 'demo-t-kids' ? 17 : 19, entre(20, 59));
    if (!dias.includes(data.getDay()) || rnd() > assiduidade) continue;
    np += 1;
    presencas[`demo-p${np}`] = { uid: id, alunoNome: p.nome, nucleoId: p.academiaId, visitante: false, origem: rnd() < 0.7 ? 'faceid' : 'manual', registradoPor: p.academiaId === BAIRRO ? CAMILA : RAFAEL, entradaEm: ts(data), escolaId: E };
  }
}

/* ---------- mensalidades (6 meses) ---------- */
const pagamentos = {};
let npg = 0;
for (const id of alunos) {
  const p = pessoas[id];
  const valor = p.turmaId ? turmas[p.turmaId].mensalidade : nucleos[p.academiaId].mensalidadeValor;
  for (let m = 5; m >= 0; m -= 1) {
    if (p.statusAtual !== 'Ativo' && m < 2) continue;
    const ref = mesesAtras(m);
    const pago = m > 0 ? rnd() > 0.04 : rnd() > 0.3;
    npg += 1;
    pagamentos[`demo-pg${npg}`] = { alunoId: id, alunoNome: p.nome, academiaId: p.academiaId, ...(p.turmaId ? { turmaId: p.turmaId } : {}), tipo: 'mensalidade', descricao: `Mensalidade ${competencia(ref)}`, competencia: competencia(ref), valor, pago, ...(pago ? { pagoEm: iso(new Date(ref.getFullYear(), ref.getMonth(), entre(3, 12), 10)) } : {}), criadoEm: iso(new Date(ref.getFullYear(), ref.getMonth(), 1, 8)), escolaId: E };
  }
}

/* ---------- pedidos, avisos, eventos, materiais, auditoria ---------- */
const solicitacoes = {
  'demo-s1': { tipo: 'transferencia', academiaId: BAIRRO, solicitanteUid: CAMILA, solicitanteNome: 'Camila Duarte', status: 'pendente', criadoEm: iso(diasAtras(1, 10)), escolaId: E, dadosPedido: { alunoUid: 'demo-a39', alunoNome: pessoas['demo-a39'] ? pessoas['demo-a39'].nome : 'Aluno', destinoId: SEDE, destinoNome: 'Horizonte · Centro', academiaOrigemNome: 'Horizonte · Jardim dos Estados', motivo: 'Mudou de bairro e vai treinar no Centro.' } },
  'demo-s2': { tipo: 'mensalidade', academiaId: BAIRRO, solicitanteUid: CAMILA, solicitanteNome: 'Camila Duarte', status: 'pendente', criadoEm: iso(diasAtras(3, 15)), escolaId: E, dadosPedido: { novoValor: 160, justificativa: 'Reajuste anual do aluguel do tatame.' } },
  'demo-s3': { tipo: 'evento', academiaId: SEDE, solicitanteUid: THIAGO, solicitanteNome: 'Thiago Sales', status: 'pendente', criadoEm: iso(diasAtras(2, 9)), escolaId: E, dadosPedido: { nome: 'Aulão kids de Dia das Crianças', data: dia(diasAtras(-9)), descricao: 'Aula aberta para trazer um amigo.' } },
  'demo-s4': { tipo: 'mensalidade', academiaId: SEDE, solicitanteUid: THIAGO, solicitanteNome: 'Thiago Sales', status: 'aprovado', criadoEm: iso(diasAtras(40, 9)), escolaId: E, dadosPedido: { novoValor: 140, justificativa: 'Turma kids com valor próprio.' } },
};
const avisos = {
  'demo-av1': { titulo: 'Graduação de fim de ano', texto: 'Avaliações de faixa nas duas últimas semanas de novembro. Confira a sua prontidão no app.', tipo: 'evento', data: dia(diasAtras(-30)), hora: '09:00', local: 'Horizonte · Centro', academiaId: null, autorUid: RAFAEL, autorNome: 'Rafael Monteiro', criadoEm: iso(diasAtras(2)), escolaId: E },
  'demo-av2': { titulo: 'Mensalidades por Pix', texto: 'A cobrança do mês já está no app. O Pix cai na hora para a academia.', tipo: 'financeiro', data: null, academiaId: null, autorUid: RAFAEL, autorNome: 'Rafael Monteiro', criadoEm: iso(diasAtras(5)), escolaId: E },
  'demo-av3': { titulo: 'Sábado: treino aberto de Muay Thai', texto: 'Traga um amigo para a aula das 10h.', tipo: 'geral', data: dia(diasAtras(-5)), hora: '10:00', local: 'Horizonte · Centro', academiaId: SEDE, autorUid: BRUNO, autorNome: 'Bruno Teixeira', criadoEm: iso(diasAtras(1)), escolaId: E },
};
const eventos = {
  'demo-ev1': { nome: 'Campeonato interno Horizonte', data: dia(diasAtras(-21)), hora: '08:30', academiaId: null, local: 'Ginásio Guanandizão', descricao: 'Chaves por faixa e peso. Kids pela manhã.', taxa: 60, criadoEm: iso(diasAtras(12)), escolaId: E },
  'demo-ev2': { nome: 'Batizado e troca de cordas', data: dia(diasAtras(-35)), hora: '15:00', academiaId: SEDE, local: 'Horizonte · Centro', descricao: 'Roda com convidados da turma de capoeira.', taxa: 40, criadoEm: iso(diasAtras(8)), escolaId: E },
  'demo-ev3': { nome: 'Seminário de defesa pessoal', data: dia(diasAtras(-12)), hora: '19:00', academiaId: BAIRRO, local: 'Horizonte · Jardim', descricao: 'Aberto ao público.', taxa: 0, criadoEm: iso(diasAtras(6)), escolaId: E },
};
const confirmados = {};
alunos.slice(0, 14).forEach((id) => { confirmados[id] = { nome: pessoas[id].nome, cordaoAtual: pessoas[id].cordaoAtual, academiaId: pessoas[id].academiaId, em: iso(diasAtras(entre(0, 6))) }; });
const materiais = {
  'demo-m1': { titulo: 'Regras da competição (resumo)', descricao: 'Pontuação, vantagens e punições.', url: 'https://atletapay.com.br/', tipo: 'pdf', criadoEm: iso(diasAtras(30)), escolaId: E },
  'demo-m2': { titulo: 'Aula online: guarda fechada', descricao: 'Fundamentos para faixas brancas.', url: 'https://atletapay.com.br/', tipo: 'video', criadoEm: iso(diasAtras(14)), escolaId: E },
};
const materiaisFormacao = {
  'demo-mf1': { titulo: 'Conduta no tatame', categoria: 'conduta', url: 'https://atletapay.com.br/', descricao: 'Respeito, higiene e segurança.', criadoEm: iso(diasAtras(60)) },
  'demo-mf2': { titulo: 'Como avaliar para a próxima faixa', categoria: 'graduacao', url: 'https://atletapay.com.br/', descricao: 'Critérios e tempo mínimo.', criadoEm: iso(diasAtras(45)) },
};
const auditoria = {};
[['Graduação registrada', 'demo-a3', 'Rafael Monteiro'], ['Mensalidade marcada como paga', 'demo-a8', 'Rafael Monteiro'], ['Nova turma criada: Capoeira · Adultos', null, 'Rafael Monteiro'], ['Grau adicionado', 'demo-a17', 'Thiago Sales'], ['Presença manual', 'demo-a20', 'Bruno Teixeira'], ['Transferência pedida', 'demo-a39', 'Camila Duarte']]
  .forEach(([resumo, alvo, quem], i) => { auditoria[`demo-au${i}`] = { quando: iso(diasAtras(i, 18 - i)), resumo, alvoNome: alvo && pessoas[alvo] ? pessoas[alvo].nome : '', quemNome: quem, colecao: 'usuarios', escolaId: E }; });
const rateios = {};
const perfisPublicos = {};
for (const id of Object.keys(pessoas)) perfisPublicos[id] = { nome: pessoas[id].nome, escolaId: E, academiaId: pessoas[id].academiaId, brasoes: { 'primeira-presenca': { em: iso(diasAtras(entre(30, 300))) }, ...(rnd() < 0.6 ? { 'dez-presencas': { em: iso(diasAtras(entre(5, 120))) } } : {}) } };

export const SESSAO_DEMO = { uid: RAFAEL, email: pessoas[RAFAEL].email, displayName: 'Rafael Monteiro', claims: { escolaId: E, papeis: pessoas[RAFAEL].papeis, acessoGeral: true } };

export const BANCO_INICIAL = {
  escolasPublicas, nucleos, turmas, usuarios: pessoas, presencas, pagamentos, solicitacoes, avisos, eventos,
  'eventos/demo-ev1/confirmados': confirmados, materiais, materiaisFormacao, auditoria, rateios, perfisPublicos,
  plataforma: { publico: { emailsProprios: false } },
};
