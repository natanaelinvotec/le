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

// Jiu-Jitsu (padrão IBJJF): adulto a partir de 16 anos; infantil de 4 a 15.
const JIUJITSU = {
  idadeKids: 16,
  adulto: [
    lisa('Branca', C.branca, 4), lisa('Azul', C.azul, 4), lisa('Roxa', C.roxa, 4), lisa('Marrom', C.marrom, 4),
    lisa('Preta', C.preta, 6), listrada('Coral vermelha e preta', C.vermelha, C.preta), listrada('Coral vermelha e branca', C.vermelha, C.branca),
    lisa('Vermelha', C.vermelha),
  ],
  kids: [
    lisa('Branca', C.branca, 4),
    listrada('Cinza e branca', C.cinza, C.branca, 4), lisa('Cinza', C.cinza, 4), listrada('Cinza e preta', C.cinza, C.preta, 4),
    listrada('Amarela e branca', C.amarela, C.branca, 4), lisa('Amarela', C.amarela, 4), listrada('Amarela e preta', C.amarela, C.preta, 4),
    listrada('Laranja e branca', C.laranja, C.branca, 4), lisa('Laranja', C.laranja, 4), listrada('Laranja e preta', C.laranja, C.preta, 4),
    listrada('Verde e branca', C.verde, C.branca, 4), lisa('Verde', C.verde, 4), listrada('Verde e preta', C.verde, C.preta, 4),
  ],
  criterios: ['Postura e base', 'Quedas', 'Guarda', 'Passagem de guarda', 'Raspagens', 'Finalizações', 'Defesa pessoal',
    'Respeito', 'Disciplina', 'Pontualidade', 'Frequência', 'Higiene', 'Aprendizado'],
};

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

// "Preta · 3º grau", "Azul · 1 grau", "Roxa".
export function rotuloGraduacao(nome, graus) {
  const g = Math.max(0, Math.floor(Number(graus) || 0));
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
    .map((g) => ({ nome: g.nome.trim().slice(0, 40), cor: (Array.isArray(g.cor) ? g.cor : [g.cor, g.cor, g.cor]).slice(0, 3).map(cor), ...(Number(g.graus) > 0 ? { graus: Math.min(10, Math.floor(Number(g.graus))) } : {}) })) : null);
  const adulto = lista(e.adulto);
  if (!adulto || !adulto.length) return null;
  const kids = lista(e.kids);
  return {
    modalidade: String(e.modalidade || 'outra').slice(0, 30), peca: String(e.peca || 'graduação').slice(0, 20), lider: String(e.lider || 'Professor').slice(0, 30),
    idadeKids: Math.min(18, Math.max(0, Math.floor(Number(e.idadeKids) || 0))), adulto, kids: kids && kids.length ? kids : null,
    criterios: Array.isArray(e.criterios) ? e.criterios.filter((c) => typeof c === 'string').slice(0, 20).map((c) => c.slice(0, 40)) : CRITERIOS_GERAIS,
  };
}
