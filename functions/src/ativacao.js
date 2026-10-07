// Ativação automática de uma escola da AtletaPay (etapa 2 do plano multi-escola).
//
// Gatilho: escolas/{id} passa a status 'ativa' (botão "Ativar" do Mega painel,
// atletapay/master.html) ou o Admin pede "Tentar de novo" (ativacao.status = 'pedido').
// O servidor então, num lote só:
//   1. cria a sede da escola: nucleos/{id}-sede (escolaId = id, professor = dono);
//   2. dá ao dono o papel de Fundador DAQUELA escola: usuarios/{dono} com
//      papeis aluno+mestre, academiaId/academiaGerenciadaId = sede, acessoGeral
//      (desde a 1c, acessoGeral só vale dentro da própria escola — regras);
//   3. grava a escada de graduações da modalidade em escolas/{id}.escada
//      (Jiu-Jitsu com graus e faixas infantis — compartilhado/modalidades.js);
//   4. registra o resultado em escolas/{id}.ativacao (ok / erro com o motivo).
// O login do dono ganha escola e papéis pelo gatilho de usuarios (claims).
// Idempotente: ativação 'ok' não roda de novo; reativar uma escola pausada não recria nada.
import { ESCOLA_PADRAO } from './escolas.js';
import { escadaPadrao, escadaLimpa, graduacaoDoTexto } from './compartilhado/modalidades.js';
import { notificar } from './notificar.js';

export const nucleoSedeDe = (id) => `${id}-sede`;
const TXT = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// Precisa ativar agora? Só na passagem para 'ativa' (ou no pedido de nova tentativa).
export function precisaAtivar(id, antes, depois) {
  if (!depois || id === ESCOLA_PADRAO || depois.status !== 'ativa') return false;
  const a = depois.ativacao || {};
  if (a.status === 'ok') return false;
  if (a.status === 'pedido') return true;
  return !antes || antes.status !== 'ativa';
}

export async function ativarEscola(ctx, id, e, { porUid = null } = {}) {
  const agora = new Date().toISOString();
  const ref = ctx.db.doc(`escolas/${id}`);
  const falhar = async (erro) => {
    await ref.update({ ativacao: { status: 'erro', erro, em: agora, porUid } });
    (ctx.log || console).warn('ativação', id, erro);
    return { ok: false, erro };
  };
  const dono = e.donoUid;
  if (!dono) return falhar('A escola não tem dono (donoUid).');
  const nucleoId = nucleoSedeDe(id);
  const [sn, su] = await Promise.all([ctx.db.doc(`nucleos/${nucleoId}`).get(), ctx.db.doc(`usuarios/${dono}`).get()]);
  if (sn.exists && (sn.data().escolaId || ESCOLA_PADRAO) !== id) return falhar(`O núcleo ${nucleoId} já existe em outra escola.`);
  const u = su.exists ? su.data() : null;
  // Uma pessoa pertence a UMA escola: se o e-mail do dono já é aluno de outra, não mistura.
  if (u && u.escolaId && u.escolaId !== id) return falhar(`A conta do dono já é cadastro da escola "${u.escolaId}". Peça para ele criar a escola com outro e-mail, ou mude o cadastro antigo antes.`);

  const escada = escadaLimpa(e.escada) || escadaPadrao(e.modalidade, Array.isArray(e.graduacoes) ? e.graduacoes : []);
  const resp = e.responsavel || {};
  const nomeDono = TXT(resp.nome, 80) || TXT(e.donoNome, 80) || (u && u.nome) || 'Responsável';
  const grad = graduacaoDoTexto(escada, resp.graduacao);
  const nomeEscola = TXT(e.nomeCurto, 40) || TXT(e.nome, 80) || id;

  const lote = ctx.db.batch();
  lote.set(ctx.db.doc(`nucleos/${nucleoId}`), {
    nome: nomeEscola, escolaId: id, sede: true, ativo: true, professorUid: dono, professorNome: nomeDono,
    cidade: TXT(e.cidade, 60), uf: TXT(e.uf, 2), endereco: TXT(e.endereco, 140), mensalidadeValor: null,
    ...(sn.exists ? {} : { criadoEm: agora }), atualizadoEm: agora,
  }, { merge: true });
  const papeis = Array.from(new Set([...((u && Array.isArray(u.papeis)) ? u.papeis : []), 'aluno', 'mestre']));
  lote.set(ctx.db.doc(`usuarios/${dono}`), {
    nome: (u && u.nome) || nomeDono,
    email: (u && u.email) || TXT(e.donoEmail, 120).toLowerCase(),
    celular: (u && u.celular) || TXT(e.donoCelular, 30),
    papeis, escolaId: id,
    academiaId: (u && u.academiaId) || nucleoId, academiaNome: (u && u.academiaNome) || nomeEscola,
    academiaGerenciadaId: nucleoId, acessoGeral: true,
    ...(u ? {} : {
      cordaoAtual: grad.nome, grausAtual: grad.graus, statusAtual: 'Ativo', ativo: true, notas: {},
      responsavelUid: null, responsavelDe: [], origem: 'atletapay', criadoEm: agora,
    }),
    atualizadoEm: agora,
  }, { merge: true });
  lote.update(ref, {
    ativacao: { status: 'ok', nucleoId, donoUid: dono, em: agora, porUid },
    escada, ativadaEm: e.ativadaEm || agora, ...(porUid ? { ativadaPor: porUid } : {}),
  });
  lote.set(ctx.db.collection('auditoria').doc(), {
    escolaId: id, quando: agora, quemUid: porUid, quemNome: '', colecao: 'escolas', docId: id, alvoNome: TXT(e.nome, 80), acao: 'ativou a escola',
    campos: ['status'], resumo: `Escola ${TXT(e.nome, 80) || id} ativada: sede ${nucleoId}, Fundador ${nomeDono}`, antes: null, depois: { nucleoId, donoUid: dono },
  });
  await lote.commit();
  try {
    await notificar(ctx, [dono], { tipo: 'escola', titulo: `${nomeEscola} está no ar!`, texto: 'Seu painel de Fundador já está liberado. Mande o link de inscrição para os seus alunos.', link: 'admin.html' });
  } catch (er) { (ctx.log || console).warn('ativação: aviso ao dono', id, er && er.message); }
  return { ok: true, nucleoId, donoUid: dono, escada: escada.modalidade };
}

// Gatilho de escolas/{id} (index.js chama depois de aoEscreverEscola).
export async function aoAtivarEscola(ctx, ev) {
  const id = ev.params.id;
  if (!precisaAtivar(id, ev.antes, ev.depois)) return null;
  return ativarEscola(ctx, id, ev.depois, { porUid: ev.authId || null });
}
