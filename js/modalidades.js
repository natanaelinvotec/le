/* modalidades.js — escadas de graduação de cada arte marcial (multi-escola / AtletaPay).

Arquivo COMPARTILHADO: existe igual em js/modalidades.js (app) e em
functions/src/compartilhado/modalidades.js (servidor). Um teste do servidor
confere que os dois são idênticos — mudou um, copie para o outro.

Cada graduação: { nome, cor: [faixa1, faixa2, faixa3] } (o mesmo formato dos
cordões da capoeira em js/escola.js, para as telas desenharem igual) e, quando a
arte usa graus, `graus` = quantos graus aquela graduação admite.
A ESCOLA guarda a própria escada (escolas/{id}.escada, gravada na ativação a
partir daqui); a escola pode ajustar a dela depois sem mudar o padrão. */

const C = {
  branca: '#F4F4F4', cinza: '#9E9E9E', preta: '#151515', azul: '#1E4FD8', roxa: '#6A2C91', marrom: '#6B3E26',
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

export const MODALIDADES = {
  capoeira: { nome: 'Capoeira', lider: 'Mestre', peca: 'cordão', idadeKids: 12, adulto: null, kids: null, criterios: null }, // a Liberdade usa js/escola.js
  jiujitsu: { nome: 'Jiu-jitsu', lider: 'Professor', peca: 'faixa', ...JIUJITSU },
  judo: { nome: 'Judô', lider: 'Sensei', peca: 'faixa', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Cinza', 'Azul', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta']), kids: null, criterios: CRITERIOS_GERAIS },
  karate: { nome: 'Karatê', lider: 'Sensei', peca: 'faixa', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Amarela', 'Vermelha', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta']), kids: null, criterios: CRITERIOS_GERAIS },
  taekwondo: { nome: 'Taekwondo', lider: 'Sabom', peca: 'faixa', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Amarela', 'Verde', 'Azul', 'Vermelha', 'Preta']), kids: null, criterios: CRITERIOS_GERAIS },
  muaythai: { nome: 'Muay Thai', lider: 'Kru', peca: 'prajied', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Vermelha', 'Marrom', 'Preta']), kids: null, criterios: CRITERIOS_GERAIS },
  boxe: { nome: 'Boxe', lider: 'Treinador', peca: 'nível', idadeKids: 0, adulto: escadaDeNomes(['Iniciante', 'Intermediário', 'Avançado', 'Competidor']), kids: null, criterios: CRITERIOS_GERAIS },
  mma: { nome: 'MMA', lider: 'Coach', peca: 'nível', idadeKids: 0, adulto: escadaDeNomes(['Iniciante', 'Intermediário', 'Avançado', 'Competidor']), kids: null, criterios: CRITERIOS_GERAIS },
  kungfu: { nome: 'Kung Fu', lider: 'Sifu', peca: 'faixa', idadeKids: 0, adulto: escadaDeNomes(['Branca', 'Amarela', 'Verde', 'Azul', 'Marrom', 'Preta']), kids: null, criterios: CRITERIOS_GERAIS },
  outra: { nome: 'Outra arte marcial', lider: 'Professor', peca: 'graduação', idadeKids: 0, adulto: escadaDeNomes(['Iniciante', 'Intermediário', 'Avançado']), kids: null, criterios: CRITERIOS_GERAIS },
};

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
        requisito: t(g.requisito, 80), nota: t(g.nota, 200),
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
