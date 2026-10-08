// Graduação nas escolas da plataforma que NÃO são a escola nº 1 (Jiu-Jitsu, Judô…).
//
// A escola nº 1 (capoeira) continua com a lógica de sempre em gatilhos.js
// (certificados, festa "Troquei de cordão", brasões de cordão). As outras usam a
// escada gravada na ativação (escolas/{id}.escada — compartilhado/modalidades.js):
//   • cadastro novo como "Iniciante" (o valor neutro da inscrição) vira a 1ª
//     graduação da escada pela idade (Branca no Jiu-Jitsu, adulto ou infantil);
//   • subir de faixa ou de grau avisa o atleta (e o responsável legal) e abre a
//     festa na tela principal do app — com as cores da faixa.
import { ESCOLA_PADRAO } from './escolas.js';
import { escadaLimpa, escadaPadrao, listaDa, graduacaoInicial, rotuloGraduacao } from './compartilhado/modalidades.js';
import { notificar } from './notificar.js';

const primeiroNome = (n) => String(n || 'Atleta').split(' ')[0];

export async function escadaDaEscola(ctx, escolaId) {
  if (!ctx._escadas) ctx._escadas = new Map();
  if (ctx._escadas.has(escolaId)) return ctx._escadas.get(escolaId);
  const s = await ctx.db.doc(`escolas/${escolaId}`).get();
  const e = s.exists ? s.data() : {};
  const escada = escadaLimpa(e.escada) || escadaPadrao(e.modalidade || 'outra', Array.isArray(e.graduacoes) ? e.graduacoes : []);
  ctx._escadas.set(escolaId, escada);
  return escada;
}

export const ehOutraEscola = (u) => !!(u && u.escolaId && u.escolaId !== ESCOLA_PADRAO);

// Devolve o que fez (para os testes): 'inicial' | 'faixa' | 'grau' | null.
export async function aoGraduarNaEscola(ctx, uid, antes, depois) {
  if (!ehOutraEscola(depois)) return null;
  const escada = await escadaDaEscola(ctx, depois.escolaId);
  const lista = listaDa(escada, depois.idade);
  // 1) Cadastro novo (ou ainda "Iniciante"): primeira graduação da escada.
  if ((depois.cordaoAtual || 'Iniciante') === 'Iniciante' && !lista.some((g) => g.nome === 'Iniciante')) {
    await ctx.db.doc(`usuarios/${uid}`).update({ cordaoAtual: graduacaoInicial(escada, depois.idade), grausAtual: 0 });
    return 'inicial';
  }
  if (!antes) return null;
  const iA = lista.findIndex((g) => g.nome === antes.cordaoAtual);
  const iD = lista.findIndex((g) => g.nome === depois.cordaoAtual);
  const gA = Number(antes.grausAtual) || 0; const gD = Number(depois.grausAtual) || 0;
  const subiuFaixa = iA >= 0 && iD > iA; // de "Iniciante" para a 1ª faixa não é festa (é o passo 1)
  const subiuGrau = iD >= 0 && iD === iA && gD > gA;
  if (!subiuFaixa && !subiuGrau) return null;
  const item = lista[iD];
  const rotulo = rotuloGraduacao(depois.cordaoAtual, gD, item);
  const peca = String(escada.peca || 'faixa');
  const Peca = peca.charAt(0).toUpperCase() + peca.slice(1);
  const dados = {
    tipo: 'cordao', link: `rede.html#perfil/${uid}`, atletaUid: uid, atletaNome: String(depois.nome || '').slice(0, 80),
    cordao: depois.cordaoAtual, graus: gD, anterior: antes.cordaoAtual || '', cores: item.cor,
  };
  const idFixo = `grad_${String(depois.cordaoAtual).replace(/[^\w]+/g, '-')}_${gD}`.slice(0, 120);
  const titulo = subiuFaixa ? `${Peca} ${rotulo}!` : `Novo grau: ${rotulo}!`;
  await notificar(ctx, [uid], { ...dados, titulo, texto: 'Parabéns pela nova graduação! Veja na sua trajetória.' }, { idFixo });
  if (depois.responsavelUid && depois.responsavelUid !== uid) {
    await notificar(ctx, [depois.responsavelUid], { ...dados, titulo: `${primeiroNome(depois.nome)}: ${subiuFaixa ? `${peca} ${rotulo}` : `novo grau (${rotulo})`}!`, texto: 'Parabéns pela nova graduação.' }, { idFixo });
  }
  return subiuFaixa ? 'faixa' : 'grau';
}
