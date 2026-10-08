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
import { listaDa, graduacaoInicial, rotuloGraduacao } from './compartilhado/modalidades.js';
import { notificar } from './notificar.js';
import { escadaDaEscola } from './escada-escola.js';
import { emitirCertificadoEscola } from './certificado-escola.js';

export { escadaDaEscola };

const primeiroNome = (n) => String(n || 'Atleta').split(' ')[0];
// Id da festa/aviso de graduação (o mesmo que o "desfazer graduação" apaga).
export const idAvisoGraduacao = (cordao, graus) => `grad_${String(cordao).replace(/[^\w]+/g, '-')}_${Number(graus) || 0}`.slice(0, 120);

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
  const gA = Number(antes.grausAtual) || 0; const gD = Math.min(Number(depois.grausAtual) || 0, 10);
  // Passou da escada infantil para a adulta (ex.: Verde → Azul aos 16): também é faixa nova.
  const daOutraEscada = iA < 0 && iD >= 0 && antes.cordaoAtual !== depois.cordaoAtual &&
    [...(escada.kids || []), ...(escada.adulto || [])].some((g) => g.nome === antes.cordaoAtual);
  const subiuFaixa = (iA >= 0 && iD > iA) || daOutraEscada; // de "Iniciante" para a 1ª faixa não é festa (é o passo 1)
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
  const idFixo = idAvisoGraduacao(depois.cordaoAtual, gD);
  const titulo = subiuFaixa ? `${Peca} ${rotulo}!` : `Novo grau: ${rotulo}!`;
  // Linha do histórico desta troca: faixa nova = a linha em que ENTROU na faixa (o lote não grava grau);
  // grau novo = a linha daquela faixa com aquele grau.
  const hist = Array.isArray(depois.historicoGraduacoes) ? depois.historicoGraduacoes : [];
  const linha = [...hist].reverse().find((h) => h && h.cordao === depois.cordaoAtual &&
    (subiuFaixa ? h.anterior !== depois.cordaoAtual : (Number(h.grau) || 0) === gD)) || {};
  // "Já tinha" (lançamento de graduação anterior ao app): sem certificado e sem festa.
  if (linha.legado) return subiuFaixa ? 'faixa' : 'grau';
  // v34: certificado da faixa/grau (data e evento da linha do histórico gravada pelo professor).
  let cert = null;
  try {
    cert = await emitirCertificadoEscola(ctx, uid, depois, item, {
      cordao: depois.cordaoAtual, graus: gD, anterior: antes.cordaoAtual || '', anteriorGraus: gA,
      em: linha.em || null, eventoId: linha.eventoId || null,
    });
  } catch (e) { (ctx.log || console).warn('certificado da escola', uid, e && e.message); }
  if (cert) dados.certificado = cert.codigo;
  await notificar(ctx, [uid], { ...dados, titulo, texto: cert ? 'Parabéns! O certificado já está no app.' : 'Parabéns pela nova graduação! Veja na sua trajetória.' }, { idFixo });
  if (depois.responsavelUid && depois.responsavelUid !== uid) {
    await notificar(ctx, [depois.responsavelUid], { ...dados, titulo: `${primeiroNome(depois.nome)}: ${subiuFaixa ? `${peca} ${rotulo}` : `novo grau (${rotulo})`}!`, texto: 'Parabéns pela nova graduação.' }, { idFixo });
  }
  return subiuFaixa ? 'faixa' : 'grau';
}
