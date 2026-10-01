// Aniversários: todo dia de manhã o servidor avisa o responsável de cada núcleo
// (e o Admin Master, com o resumo do grupo) de quem faz aniversário daqui a
// 48 horas — dá tempo de preparar a roda, o "parabéns" e a mensagem — e de
// novo no próprio dia. Um aviso por núcleo por dia (idFixo: rodar 2x não duplica).
import { notificar, gestoresDoNucleo, admins } from './notificar.js';

const DIA = 86400000;
// dataNasc vem da inscrição como "AAAA-MM-DD" (também aceita "DD/MM/AAAA").
export function lerNascimento(v) {
  const s = String(v || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return { a: +m[1], m: +m[2], d: +m[3] };
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return { a: +m[3], m: +m[2], d: +m[1] };
  return null;
}
const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
// Aniversário num ano (29/02 vira 28/02 nos anos comuns).
export function aniversarioNoAno(n, ano) {
  const d = n.m === 2 && n.d === 29 && !bissexto(ano) ? 28 : n.d;
  return new Date(ano, n.m - 1, d);
}
const ehAtleta = (u) => Array.isArray(u.papeis) && u.papeis.some((p) => ['aluno', 'instrutor', 'mestre'].includes(p));
const ativo = (u) => u.ativo !== false && u.statusAtual !== 'Inativo';
const ymd = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const primeiro = (n) => String(n || 'Atleta').trim().split(/\s+/)[0];

// Quem faz aniversário exatamente "daqui a N dias" (0 = hoje).
export function aniversariantesEm(usuarios, hoje, dias) {
  const alvo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias);
  return usuarios.filter((u) => ehAtleta(u) && ativo(u)).map((u) => {
    const n = lerNascimento(u.dataNasc); if (!n) return null;
    const dia = aniversarioNoAno(n, alvo.getFullYear());
    if (dia.getMonth() !== alvo.getMonth() || dia.getDate() !== alvo.getDate()) return null;
    return { uid: u.id, nome: u.nome || 'Atleta', idade: alvo.getFullYear() - n.a, academiaId: u.academiaId || null };
  }).filter(Boolean);
}

export async function processarAniversarios(ctx, hoje = new Date()) {
  const s = await ctx.db.collection('usuarios').limit(3000).get();
  const usuarios = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  const adms = await admins(ctx);
  let avisos = 0;
  for (const [dias, quando] of [[2, 'em 48 horas'], [0, 'hoje']]) {
    const lista = aniversariantesEm(usuarios, hoje, dias);
    if (!lista.length) continue;
    const data = new Date(hoje.getTime() + dias * DIA).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const frase = (l) => l.slice(0, 6).map((a) => `${primeiro(a.nome)} (${a.idade} anos)`).join(', ') + (l.length > 6 ? ` e mais ${l.length - 6}` : '');
    const titulo = (l) => (dias ? `Aniversário ${quando}: ${l.length === 1 ? primeiro(l[0].nome) : `${l.length} atletas`}` : `Hoje é aniversário de ${l.length === 1 ? primeiro(l[0].nome) : `${l.length} atletas`}!`);
    // Responsável de cada núcleo: só os alunos dele.
    const porNucleo = new Map();
    lista.forEach((a) => { const k = a.academiaId || ''; if (!porNucleo.has(k)) porNucleo.set(k, []); porNucleo.get(k).push(a); });
    for (const [nid, l] of porNucleo) {
      const gestores = (await gestoresDoNucleo(ctx, nid)).filter((g) => !adms.includes(g));
      if (!gestores.length) continue;
      await notificar(ctx, gestores, {
        tipo: 'aniversario', titulo: titulo(l), texto: `${frase(l)} — ${data}. Que tal preparar o parabéns na roda?`, link: 'admin.html#aniversarios', aniversariantes: l.map((a) => a.uid).slice(0, 30), dias,
      }, { idFixo: `aniv_${dias}_${ymd(hoje)}_${nid || 'sem'}` });
      avisos++;
    }
    // Admin Master: o resumo do grupo inteiro.
    if (adms.length) {
      await notificar(ctx, adms, {
        tipo: 'aniversario', titulo: titulo(lista), texto: `${frase(lista)} — ${data}.`, link: 'admin.html#aniversarios', aniversariantes: lista.map((a) => a.uid).slice(0, 30), dias,
      }, { idFixo: `aniv_${dias}_${ymd(hoje)}_grupo` });
      avisos++;
    }
  }
  return avisos;
}
