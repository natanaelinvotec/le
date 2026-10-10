// Migração capoeira-liberdade → atletapay-br (10/10/2026). Roda no GitHub Actions
// (.github/workflows/migrar.yml) com a conta de serviço do projeto NOVO:
//   node scripts/migrar-projeto.mjs limpar     apaga logins e banco do projeto novo (antes de importar de novo)
//   node scripts/migrar-projeto.mjs ajustar    depois dos imports: links das fotos, claims, endereço da Liberdade
//   node scripts/migrar-projeto.mjs conferir   conta logins, documentos e arquivos (relatório)
// Uso manual: GOOGLE_APPLICATION_CREDENTIALS=chave-nova.json node scripts/migrar-projeto.mjs conferir
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { migrarClaims, ESCOLA_PADRAO } from '../src/escolas.js';

process.env.TZ = 'America/Campo_Grande';
const PROJETO = process.env.PROJETO || 'atletapay-br';
const BUCKET = process.env.BUCKET || `${PROJETO}.firebasestorage.app`;
const BUCKET_ANTIGO = process.env.BUCKET_ANTIGO || 'capoeira-liberdade.firebasestorage.app';
// Endereço da Liberdade na plataforma (atletapay.com.br/liberdadeeexpressao); o id continua 'liberdade'.
const ENDERECO_LIBERDADE = 'liberdadeeexpressao';

initializeApp({ projectId: PROJETO, storageBucket: BUCKET });
const db = getFirestore(); const auth = getAuth(); const bucket = getStorage().bucket();
const ctx = { db, auth, bucket, messaging: null, vision: null, log: console, silencioso: true };
const acao = process.argv[2];

// ---------- limpar ----------
async function apagarLogins() {
  let n = 0; let token;
  do {
    const p = await auth.listUsers(1000, token);
    if (p.users.length) { const r = await auth.deleteUsers(p.users.map((u) => u.uid)); n += r.successCount; if (r.failureCount) console.warn('logins não apagados:', r.failureCount); }
    token = p.pageToken;
  } while (token);
  return n;
}
async function apagarColecao(ref) {
  let n = 0;
  for (;;) {
    const s = await ref.limit(300).get();
    if (s.empty) break;
    for (const d of s.docs) { for (const sub of await d.ref.listCollections()) n += await apagarColecao(sub); }
    const b = db.batch(); s.docs.forEach((d) => b.delete(d.ref)); await b.commit(); n += s.size;
  }
  return n;
}
async function limpar() {
  if (PROJETO === 'capoeira-liberdade') throw new Error('Nunca limpar o projeto antigo.');
  const logins = await apagarLogins();
  let docs = 0;
  for (const c of await db.listCollections()) docs += await apagarColecao(c);
  console.log(`limpo: ${logins} logins e ${docs} documentos apagados em ${PROJETO}`);
}

// ---------- ajustar ----------
// Troca o bucket antigo pelo novo em qualquer string, em qualquer profundidade (mapas e listas).
const PADRAO_ANTIGO = BUCKET_ANTIGO.replace(/[.]/g, '[.]') + '|capoeira-liberdade[.]appspot[.]com';
const RX_ANTIGO = new RegExp(PADRAO_ANTIGO); // sem 'g': .test() não guarda posição entre chamadas
const RX_TODOS = new RegExp(PADRAO_ANTIGO, 'g');
function trocar(v) {
  if (typeof v === 'string') return RX_ANTIGO.test(v) ? v.replace(RX_TODOS, BUCKET) : v;
  if (Array.isArray(v)) { let mudou = false; const n = v.map((x) => { const y = trocar(x); if (y !== x) mudou = true; return y; }); return mudou ? n : v; }
  if (v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    let mudou = false; const n = {};
    for (const [k, x] of Object.entries(v)) { const y = trocar(x); if (y !== x) mudou = true; n[k] = y; }
    return mudou ? n : v;
  }
  return v; // Timestamp, GeoPoint, DocumentReference, Buffer…: ficam como estão
}
async function reescreverLinks(ref, conta) {
  let ultimo = null;
  for (;;) {
    let q = ref.orderBy('__name__').limit(300); if (ultimo) q = q.startAfter(ultimo);
    const s = await q.get(); if (s.empty) break;
    const b = db.batch(); let nb = 0;
    for (const d of s.docs) {
      conta.lidos++;
      const dados = d.data(); const novo = trocar(dados);
      if (novo !== dados) { b.set(d.ref, novo); nb++; conta.mudados++; }
      for (const sub of await d.ref.listCollections()) await reescreverLinks(sub, conta);
    }
    if (nb) await b.commit();
    ultimo = s.docs[s.docs.length - 1];
  }
}
async function enderecoDaLiberdade() {
  const agora = new Date().toISOString();
  const e = db.doc(`escolas/${ESCOLA_PADRAO}`);
  if ((await e.get()).exists) await e.set({ slug: ENDERECO_LIBERDADE, atualizadoEm: agora }, { merge: true });
  const p = db.doc(`escolasPublicas/${ESCOLA_PADRAO}`);
  if ((await p.get()).exists) await p.set({ slug: ENDERECO_LIBERDADE, atualizadoEm: agora }, { merge: true });
  await db.doc(`escolasSlugs/${ENDERECO_LIBERDADE}`).set({ escolaId: ESCOLA_PADRAO, donoUid: null, criadoEm: agora }, { merge: true });
}
async function ajustar() {
  const conta = { lidos: 0, mudados: 0 };
  for (const c of await db.listCollections()) await reescreverLinks(c, conta);
  console.log(`links: ${conta.lidos} documentos lidos, ${conta.mudados} com links de foto trocados para ${BUCKET}`);
  const claims = await migrarClaims(ctx);
  console.log(`claims: ${claims} logins com escola e papéis`);
  await enderecoDaLiberdade();
  console.log(`endereço: escolas/${ESCOLA_PADRAO} → atletapay.com.br/${ENDERECO_LIBERDADE}`);
  await db.doc('sistema/migracao').set({ de: 'capoeira-liberdade', para: PROJETO, em: new Date().toISOString(), docsComLinksTrocados: conta.mudados, claims, etapa: process.env.ETAPA || '' }, { merge: true });
}

// ---------- conferir ----------
async function conferir() {
  let logins = 0; let comSenha = 0; let comClaims = 0; let token;
  do {
    const p = await auth.listUsers(1000, token);
    for (const u of p.users) { logins++; if (u.passwordHash) comSenha++; if (u.customClaims && u.customClaims.escolaId) comClaims++; }
    token = p.pageToken;
  } while (token);
  const colecoes = {};
  for (const c of await db.listCollections()) { const r = await c.count().get(); colecoes[c.id] = r.data().count; }
  const docs = Object.values(colecoes).reduce((a, b) => a + b, 0);
  let arquivos = 0; let bytes = 0; let antigos = 0; let pagina;
  do {
    const [fs, , resp] = await bucket.getFiles({ maxResults: 1000, autoPaginate: false, ...(pagina ? { pageToken: pagina } : {}) });
    for (const f of fs) { arquivos++; bytes += Number(f.metadata.size || 0); }
    pagina = resp && resp.pageToken;
  } while (pagina);
  // Ainda sobrou algum link para o bucket antigo?
  for (const c of await db.listCollections()) {
    const s = await c.limit(2000).get();
    for (const d of s.docs) if (RX_ANTIGO.test(JSON.stringify(d.data()))) antigos++;
  }
  const r = { projeto: PROJETO, logins, loginsComSenha: comSenha, loginsComClaims: comClaims, documentos: docs, colecoes, arquivos, arquivosMB: Math.round(bytes / 1048576), documentosComLinkAntigo: antigos };
  console.log(JSON.stringify(r, null, 2));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ${PROJETO}\n\n| | |\n|---|---|\n| Logins | ${logins} (${comSenha} com senha, ${comClaims} com escola no login) |\n| Documentos | ${docs} em ${Object.keys(colecoes).length} coleções |\n| Arquivos no Storage | ${arquivos} (${r.arquivosMB} MB) |\n| Documentos ainda com link antigo | ${antigos} |\n\n`);
  }
}

const acoes = { limpar, ajustar, conferir };
if (!acoes[acao]) { console.error('Uso: node scripts/migrar-projeto.mjs limpar|ajustar|conferir'); process.exit(2); }
await acoes[acao]();
