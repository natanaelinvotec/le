/* lgpd.js — direitos do titular (LGPD) direto no app:
   - baixar uma cópia dos próprios dados (arquivo .json);
   - pedir a exclusão da conta (o Admin Master confirma no painel e o servidor apaga). */
import { db, collection, doc, getDoc, getDocs, query, where, limit, addDoc, talvezComEscola } from './firebase.js';

const limpar = (v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(limpar);
  if (v && typeof v === 'object') { const o = {}; Object.entries(v).forEach(([k, x]) => { if (k !== 'faceDescriptor') o[k] = limpar(x); }); return o; }
  return v;
};
async function lista(q) { try { return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...limpar(d.data()) })); } catch (e) { return [{ erro: 'sem permissão de leitura' }]; } }

export async function exportarMeusDados(uid) {
  const [u, pub] = await Promise.all([getDoc(doc(db, 'usuarios', uid)), getDoc(doc(db, 'perfisPublicos', uid))]);
  const dados = {
    geradoEm: new Date().toISOString(),
    aviso: 'Cópia dos seus dados no app do grupo (LGPD, art. 18). O descritor facial usado no check-in não é exportado por segurança.',
    cadastro: u.exists() ? limpar(u.data()) : null,
    perfilPublico: pub.exists() ? limpar(pub.data()) : null,
    presencas: await lista(query(collection(db, 'presencas'), where('uid', '==', uid), limit(2000))),
    pagamentos: await lista(query(collection(db, 'pagamentos'), where('alunoId', '==', uid), limit(2000))),
    avaliacoes: await lista(collection(db, 'usuarios', uid, 'avaliacoes')),
    publicacoes: await lista(query(collection(db, 'posts'), where('autorUid', '==', uid), limit(1000))),
    solicitacoes: await lista(query(collection(db, 'solicitacoes'), where('solicitanteUid', '==', uid), limit(200))),
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return dados;
}

export async function pedirExclusaoDaConta(uid, nome, academiaId, motivo = '') {
  const ja = await getDocs(query(collection(db, 'solicitacoes'), where('solicitanteUid', '==', uid), limit(50)));
  if (ja.docs.some((d) => d.data().tipo === 'exclusao_conta' && d.data().status === 'pendente')) return { jaExistia: true };
  await addDoc(collection(db, 'solicitacoes'), await talvezComEscola({
    tipo: 'exclusao_conta', solicitanteUid: uid, solicitanteNome: nome || '', academiaId: academiaId || null,
    dadosPedido: { motivo: String(motivo || '').slice(0, 300) }, status: 'pendente', criadoEm: new Date().toISOString(),
  }));
  return { jaExistia: false };
}
