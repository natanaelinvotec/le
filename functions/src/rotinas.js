// Rotinas: limpeza diária, migrações (uma vez só) e exclusão de conta (LGPD).
import { randomUUID } from 'node:crypto';
import { sincronizarPerfil } from './perfil.js';
import { sincronizarCarteirinha, apagarCarteirinha } from './carteirinha.js';
import { responsaveisDe, apagarSubcolecao, apagarArquivosDoStorage } from './gatilhos.js';

const DIA = 86400000;

async function emPaginas(consulta, fn, tamanho = 300) {
  let ultimo = null; let total = 0;
  for (;;) {
    let q = consulta.limit(tamanho);
    if (ultimo) q = q.startAfter(ultimo);
    const s = await q.get();
    if (s.empty) break;
    for (const d of s.docs) { await fn(d); total++; }
    ultimo = s.docs[s.docs.length - 1];
    if (s.size < tamanho) break;
  }
  return total;
}

// ---------- Todo dia de madrugada ----------
export async function rotinaDiaria(ctx) {
  const agora = Date.now();
  const r = { storiesApagados: 0, notificacoesApagadas: 0, auditoriaApagada: 0, perfis: 0, conversas: 0 };
  // 1. Stories vencidos há mais de 1 dia: apaga o documento e a foto.
  const velhos = await ctx.db.collection('stories').where('expiraEm', '<', new Date(agora - DIA).toISOString()).limit(300).get();
  for (const d of velhos.docs) {
    await apagarArquivosDoStorage(ctx, [d.data().midiaUrl], `rede/${d.data().autorUid}/`);
    await d.ref.delete(); r.storiesApagados++;
  }
  // 2. Notificações com mais de 90 dias (retenção mínima — LGPD).
  const notif = await ctx.db.collectionGroup('itens').where('criadoEm', '<', new Date(agora - 90 * DIA).toISOString()).limit(500).get();
  await Promise.all(notif.docs.map((d) => d.ref.delete())); r.notificacoesApagadas = notif.size;
  // 3. Auditoria guardada por 2 anos.
  const aud = await ctx.db.collection('auditoria').where('quando', '<', new Date(agora - 730 * DIA).toISOString()).limit(500).get();
  await Promise.all(aud.docs.map((d) => d.ref.delete())); r.auditoriaApagada = aud.size;
  // 4. Brasões que dependem do tempo (aniversário de capoeira, sequência de semanas).
  //    As presenças são relidas para "no mês" e "semanas seguidas" virarem o dia certo.
  //    Junto: a carteirinha (emite as que faltam e acerta a validade — uma
  //    mensalidade lançada hoje no núcleo muda a regra de todos os alunos dele).
  r.carteirinhas = 0;
  r.perfis = await emPaginas(ctx.db.collection('usuarios').orderBy('__name__'), async (d) => {
    await sincronizarPerfil(ctx, d.id, { presencas: true }).catch(() => null);
    if ((d.data().papeis || []).includes('aluno')) { await sincronizarCarteirinha(ctx, d.id).then(() => { r.carteirinhas++; }).catch(() => null); }
  });
  // 5. Conversas de menores sem o responsável legal anotado.
  const conv = await ctx.db.collection('conversas').where('envolveMenor', '==', true).limit(300).get();
  for (const d of conv.docs) {
    if (Array.isArray(d.data().responsaveisIds)) continue;
    await d.ref.update({ responsaveisIds: await responsaveisDe(ctx, d.data().participantes || []) }); r.conversas++;
  }
  return r;
}

// ---------- Migrações (rodam uma vez; ficam marcadas em config/migracoes) ----------
export async function migrarPosts(ctx) {
  let n = 0;
  await emPaginas(ctx.db.collection('posts').orderBy('__name__'), async (d) => {
    const p = d.data();
    const publico = p.oculto !== true && p.revisao !== 'pendente';
    if (p.publico === publico && typeof p.oculto === 'boolean') return;
    await d.ref.update({ publico, oculto: p.oculto === true }); n++;
  });
  return n;
}

// Foto em texto (base64) dentro do Firestore → arquivo no Storage + só o link no banco.
export async function migrarFotos(ctx) {
  if (!ctx.bucket) return 0;
  let n = 0;
  await emPaginas(ctx.db.collection('usuarios').orderBy('__name__'), async (d) => {
    const foto = d.data().fotoUrl;
    const m = typeof foto === 'string' && foto.match(/^data:(image\/[a-z+]+);base64,(.+)$/);
    if (!m) return;
    const caminho = `fotos/${d.id}/perfil_migrada_${Date.now()}.jpg`;
    const token = randomUUID();
    await ctx.bucket.file(caminho).save(Buffer.from(m[2], 'base64'), { contentType: m[1], metadata: { cacheControl: 'public,max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } } });
    const url = `https://firebasestorage.googleapis.com/v0/b/${ctx.bucket.name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`;
    await d.ref.update({ fotoUrl: url }); n++;
  });
  return n;
}

export async function migrarPerfis(ctx) {
  return emPaginas(ctx.db.collection('usuarios').orderBy('__name__'), (d) => sincronizarPerfil(ctx, d.id, { presencas: true, rede: true, formacao: true }).catch((e) => (ctx.log || console).warn('perfil', d.id, e && e.message)));
}

export async function migrarConversas(ctx) {
  let n = 0;
  await emPaginas(ctx.db.collection('conversas').orderBy('__name__'), async (d) => {
    if (d.data().tipo !== 'direta' || Array.isArray(d.data().responsaveisIds)) return;
    await d.ref.update({ responsaveisIds: await responsaveisDe(ctx, d.data().participantes || []) }); n++;
  });
  return n;
}

export const MIGRACOES = [
  ['m1_posts_publico', migrarPosts],
  ['m2_fotos_storage', migrarFotos],
  ['m3_perfis_servidor', migrarPerfis],
  ['m4_conversas_responsaveis', migrarConversas],
];

// forcar: roda de novo mesmo as já marcadas (ex.: "Recalcular tudo" no painel).
export async function executarMigracoes(ctx, { forcar = false, somente = null } = {}) {
  const ref = ctx.db.doc('config/migracoes');
  const s = await ref.get(); const feitas = s.exists ? s.data() : {};
  const resultado = {};
  for (const [nome, fn] of MIGRACOES) {
    if (somente && !somente.includes(nome)) continue;
    if (feitas[nome] && !forcar) { resultado[nome] = 'já feita'; continue; }
    const n = await fn(ctx);
    resultado[nome] = n;
    await ref.set({ [nome]: new Date().toISOString() }, { merge: true });
  }
  return resultado;
}

// ---------- Exclusão de conta (LGPD) — só o Admin dispara ----------
// Apaga o login, o cadastro, o cartão público, publicações, stories, fotos,
// presenças, conversas diretas e notificações. Pagamentos ficam (obrigação
// fiscal), mas anonimizados.
export async function excluirConta(ctx, uid, { porUid = null, porNome = '' } = {}) {
  const r = { posts: 0, stories: 0, presencas: 0, pagamentosAnonimizados: 0, conversas: 0, mensagensGrupo: 0 };
  const su = await ctx.db.doc(`usuarios/${uid}`).get();
  const nome = su.exists ? su.data().nome || '' : '';
  const posts = await ctx.db.collection('posts').where('autorUid', '==', uid).limit(500).get();
  for (const d of posts.docs) {
    await apagarSubcolecao(ctx, `posts/${d.id}/comentarios`);
    await d.ref.delete(); r.posts++;
  }
  const stories = await ctx.db.collection('stories').where('autorUid', '==', uid).limit(500).get();
  for (const d of stories.docs) { await d.ref.delete(); r.stories++; }
  const pres = await ctx.db.collection('presencas').where('uid', '==', uid).limit(2000).get();
  for (const d of pres.docs) { await d.ref.delete(); r.presencas++; }
  const pags = await ctx.db.collection('pagamentos').where('alunoId', '==', uid).limit(2000).get();
  for (const d of pags.docs) { await d.ref.update({ alunoId: `excluido_${randomUUID().slice(0, 8)}`, alunoNome: '(conta excluída)' }); r.pagamentosAnonimizados++; }
  const convs = await ctx.db.collection('conversas').where('participantes', 'array-contains', uid).limit(500).get();
  for (const d of convs.docs) {
    if (d.data().tipo === 'direta') { await apagarSubcolecao(ctx, `conversas/${d.id}/mensagens`); await d.ref.delete(); r.conversas++; }
  }
  const msgs = await ctx.db.collectionGroup('mensagens').where('autorUid', '==', uid).limit(2000).get();
  for (const d of msgs.docs) { await d.ref.delete(); r.mensagensGrupo++; }
  await apagarSubcolecao(ctx, `notificacoes/${uid}/itens`);
  await apagarSubcolecao(ctx, `usuarios/${uid}/dispositivos`);
  await apagarSubcolecao(ctx, `usuarios/${uid}/avaliacoes`);
  await ctx.db.doc(`perfisPublicos/${uid}`).delete().catch(() => {});
  await ctx.db.doc(`apresentacoes/${uid}`).delete().catch(() => {});
  if (ctx.bucket) {
    for (const prefixo of [`rede/${uid}/`, `fotos/${uid}/`, `apresentacoes/${uid}/`, `carteirinha/${uid}/`]) {
      try { await ctx.bucket.deleteFiles({ prefix: prefixo }); } catch (e) { /* ok */ }
    }
  }
  // Carteirinha: verificação pública, foto pública e pedido de foto saem já
  // (não depende do gatilho de usuarios, que roda depois).
  const sci = await ctx.db.doc(`carteirinhasIndice/${uid}`).get();
  await apagarCarteirinha(ctx, uid, sci.exists ? sci.data() : null);
  await ctx.db.doc(`usuarios/${uid}`).delete().catch(() => {});
  if (ctx.auth) { try { await ctx.auth.deleteUser(uid); } catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; } }
  const pend = await ctx.db.collection('solicitacoes').where('solicitanteUid', '==', uid).limit(50).get();
  for (const d of pend.docs) { if (d.data().tipo === 'exclusao_conta') await d.ref.update({ status: 'concluida', concluidaEm: new Date().toISOString() }); }
  await ctx.db.collection('auditoria').add({
    quando: new Date().toISOString(), quemUid: porUid, quemNome: porNome, colecao: 'usuarios', docId: uid, alvoNome: nome,
    acao: 'excluiu a conta', campos: [], resumo: `${porNome || 'Admin'} excluiu a conta de ${nome || uid} (LGPD)`, antes: null, depois: r,
  });
  return r;
}

// ---------- Pedidos do painel (comandos/{id}) ----------
// Só vale se quem gravou o pedido é Admin Master (conferido aqui de novo,
// além das regras do Firestore).
export async function executarComando(ctx, ev) {
  const { id } = ev.params; const c = ev.depois; if (!c) return null;
  const ref = ctx.db.doc(`comandos/${id}`);
  const quemUid = ev.authId || c.porUid;
  const s = quemUid ? await ctx.db.doc(`usuarios/${quemUid}`).get() : null;
  const quem = s && s.exists ? s.data() : null;
  if (!quem || !(quem.papeis || []).includes('admin') || (ev.authId && c.porUid !== ev.authId)) {
    await ref.update({ status: 'negado', erro: 'Só o Admin Master pode pedir isso.', terminadoEm: new Date().toISOString() });
    return null;
  }
  await ref.update({ status: 'executando', iniciadoEm: new Date().toISOString() });
  try {
    let resultado;
    if (c.tipo === 'excluirConta') {
      if (!c.uid || c.uid === quemUid) throw new Error('Escolha outro atleta (o Admin não exclui a própria conta por aqui).');
      resultado = await excluirConta(ctx, String(c.uid), { porUid: quemUid, porNome: quem.nome || '' });
    } else if (c.tipo === 'recalcularAtleta') {
      const r = await sincronizarPerfil(ctx, String(c.uid), { presencas: true, rede: true, formacao: true });
      resultado = { brasoes: r.dados ? r.dados.brasoesTotal : 0 };
    } else if (c.tipo === 'recalcularTodos') {
      resultado = await executarMigracoes(ctx, { forcar: true, somente: ['m3_perfis_servidor'] });
    } else if (c.tipo === 'migrar') {
      resultado = await executarMigracoes(ctx);
    } else throw new Error(`Pedido desconhecido: ${c.tipo}`);
    await ref.update({ status: 'ok', resultado, terminadoEm: new Date().toISOString() });
    return resultado;
  } catch (e) {
    await ref.update({ status: 'erro', erro: String((e && e.message) || e), terminadoEm: new Date().toISOString() });
    return null;
  }
}
