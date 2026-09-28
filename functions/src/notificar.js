// Notificações: grava na central do app (notificacoes/{uid}/itens) e manda
// push para os aparelhos da pessoa (usuarios/{uid}/dispositivos). O push usa o
// Firebase Cloud Messaging; aparelho com token vencido é removido sozinho.

const TOKENS_INVALIDOS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

// item: { tipo, titulo, texto, link (relativo, ex.: 'rede.html#post/ID'), de: {uid,nome,foto} }
// opcoes.idFixo: grava sempre no mesmo documento (ex.: curtidas do mesmo post
// viram UMA notificação que vai sendo atualizada, em vez de 50).
// opcoes.push: false = só na central (sem vibrar o celular).
export async function notificar(ctx, uids, item, opcoes = {}) {
  if (ctx.silencioso) return { gravadas: 0, enviadas: 0 }; // migrações não notificam ninguém
  const alvos = Array.from(new Set((uids || []).filter(Boolean))).filter((u) => !(item.de && item.de.uid === u));
  if (!alvos.length) return { gravadas: 0, enviadas: 0 };
  const agora = new Date().toISOString();
  const registro = { ...item, lida: false, criadoEm: agora };
  let enviadas = 0;
  for (const uid of alvos) {
    const col = ctx.db.collection(`notificacoes/${uid}/itens`);
    let mandarPush = opcoes.push !== false;
    if (opcoes.idFixo) {
      const ref = col.doc(opcoes.idFixo);
      const antes = await ref.get();
      // Mesmo assunto de novo em menos de 15 min: atualiza a central, sem vibrar de novo.
      if (antes.exists && antes.data().pushEm && (Date.now() - new Date(antes.data().pushEm).getTime()) < 15 * 60000) mandarPush = false;
      await ref.set({ ...registro, ...(mandarPush ? { pushEm: agora } : {}) }, { merge: true });
    } else {
      await col.add(registro);
    }
    if (mandarPush) enviadas += await enviarPush(ctx, uid, item);
  }
  return { gravadas: alvos.length, enviadas };
}

export async function enviarPush(ctx, uid, item) {
  if (!ctx.messaging) return 0;
  const su = await ctx.db.doc(`usuarios/${uid}`).get();
  if (su.exists && su.data().notificacoesPush === false) return 0; // a pessoa desligou o push
  const snap = await ctx.db.collection(`usuarios/${uid}/dispositivos`).limit(10).get();
  if (snap.empty) return 0;
  const docs = snap.docs.filter((d) => d.data().token);
  const mensagens = docs.map((d) => {
    const base = String(d.data().base || '').replace(/\/?$/, '/');
    const baseOk = /^https:\/\//.test(base);
    const webpush = { notification: { tag: String(item.tag || item.tipo || 'le') } };
    if (baseOk) {
      webpush.notification.icon = `${base}assets/app-icon-192.png`;
      webpush.notification.badge = `${base}assets/app-favicon-32.png`;
      webpush.fcmOptions = { link: base + String(item.link || 'app.html').replace(/^\//, '') };
    }
    return {
      token: d.data().token,
      notification: { title: String(item.titulo || 'Capoeira').slice(0, 80), body: String(item.texto || '').slice(0, 180) },
      data: { tipo: String(item.tipo || ''), link: String(item.link || '') },
      webpush,
    };
  });
  if (!mensagens.length) return 0;
  const res = await ctx.messaging.sendEach(mensagens);
  let ok = 0;
  await Promise.all(res.responses.map(async (r, i) => {
    if (r.success) { ok++; return; }
    const code = r.error && r.error.code;
    if (TOKENS_INVALIDOS.has(code)) await docs[i].ref.delete().catch(() => {});
  }));
  return ok;
}

// Quem administra um núcleo (para avisos de denúncia/revisão).
export async function gestoresDoNucleo(ctx, nucleoId) {
  if (!nucleoId) return [];
  const n = await ctx.db.doc(`nucleos/${nucleoId}`).get();
  return n.exists && n.data().professorUid ? [n.data().professorUid] : [];
}

export async function admins(ctx) {
  const s = await ctx.db.collection('usuarios').where('papeis', 'array-contains', 'admin').limit(10).get();
  return s.docs.map((d) => d.id);
}

// Todo mundo de um núcleo (ou do grupo inteiro, com nucleoId vazio).
export async function membros(ctx, nucleoId) {
  const q = nucleoId ? ctx.db.collection('usuarios').where('academiaId', '==', nucleoId) : ctx.db.collection('usuarios');
  const s = await q.limit(1000).get();
  return s.docs.filter((d) => d.data().ativo !== false).map((d) => d.id);
}
