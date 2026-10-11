/* sdk-demo.js — "Firebase" de mentira, em memória, para a VITRINE DE DEMONSTRAÇÃO (v38.2).

Como funciona: as páginas /demo e /demo/fundador (geradas por tools/montar-dist.mjs a partir de
admin.html e master.html) têm um <script type="importmap"> que troca as URLs do SDK do Firebase
(https://www.gstatic.com/firebasejs/10.12.0/firebase-*.js) por ESTE arquivo. O resto do app
(js/firebase.js, admin.js, gestao.js, turmas.js…) roda igualzinho ao de verdade, só que lendo e
gravando num banco que mora na memória da aba. Nada sai do navegador: nenhum login, nenhuma
leitura do banco real, nenhuma gravação. Recarregar a página volta tudo ao exemplo inicial.

Também serve de banco falso para os testes locais (tests/ e o smoke com Playwright): defina
globalThis.__BANCO_DEMO__ = { colecao: { id: {...} } } antes de carregar a página para usar
outros dados, e globalThis.__CONTAS_DEMO__ = { 'email': { uid, senha, claims } } para testar login.

Implementa só o que o app usa (lista conferida em js/ em 11/10/2026). Se alguma tela nova usar
uma função que não existe aqui, o import falha na hora — é só acrescentar abaixo. */
import { BANCO_INICIAL, SESSAO_DEMO } from './dados-demo.js';

const EH_DEMO = !globalThis.__BANCO_DEMO__ && !globalThis.__CONTAS_DEMO__;
const atraso = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const novoId = () => Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');

/* ============================== Timestamp ============================== */
export class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static fromMillis(ms) { return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6); }
  static fromDate(d) { return Timestamp.fromMillis(d.getTime()); }
  static now() { return Timestamp.fromMillis(Date.now()); }
  toMillis() { return this.seconds * 1000 + Math.floor(this.nanoseconds / 1e6); }
  toDate() { return new Date(this.toMillis()); }
  toJSON() { return this.toDate().toISOString(); }
  isEqual(o) { return o instanceof Timestamp && o.toMillis() === this.toMillis(); }
  valueOf() { return String(this.toMillis()).padStart(15, '0'); }
}
// Cópia funda que preserva Timestamp e Date (structuredClone perderia a classe).
function clonar(v) {
  if (v instanceof Timestamp) return new Timestamp(v.seconds, v.nanoseconds);
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = clonar(v[k]); return o; }
  return v;
}
// Nos dados de exemplo, { __ts: ms } vira Timestamp (o JSON não tem esse tipo).
function reviver(v) {
  if (Array.isArray(v)) return v.map(reviver);
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'number' && Object.keys(v).length === 1) return Timestamp.fromMillis(v.__ts);
    const o = {}; for (const k of Object.keys(v)) o[k] = reviver(v[k]); return o;
  }
  return v;
}

/* ============================== App ============================== */
const APPS = new Map();
export const SDK_VERSION = '10.12.0-demo';
export function initializeApp(options = {}, nome = '[DEFAULT]') {
  const name = typeof nome === 'string' ? nome : (nome && nome.name) || '[DEFAULT]';
  if (APPS.has(name)) return APPS.get(name);
  const app = { name, options: { ...options }, automaticDataCollectionEnabled: false };
  APPS.set(name, app);
  return app;
}
export const getApp = (name = '[DEFAULT]') => APPS.get(name) || initializeApp({}, name);
export const getApps = () => [...APPS.values()];
export async function deleteApp(app) { if (app) APPS.delete(app.name); }

/* ============================== Banco em memória ============================== */
// path do documento ("usuarios/abc", "eventos/e1/confirmados/u1") → dados
const BANCO = new Map();
(function carregar() {
  const fonte = globalThis.__BANCO_DEMO__ || BANCO_INICIAL || {};
  for (const [chave, docs] of Object.entries(fonte)) {
    for (const [id, dados] of Object.entries(docs || {})) BANCO.set(`${chave}/${id}`, reviver(clonar(dados)));
  }
}());
const OUVINTES = new Set();
function avisarMudanca() { for (const o of [...OUVINTES]) { try { o(); } catch (e) { console.warn('demo onSnapshot', e); } } }

const db = { type: 'firestore', toJSON: () => ({}) };
export const getFirestore = () => db;
export const initializeFirestore = () => db;
export const persistentLocalCache = (o = {}) => ({ kind: 'persistent', ...o });
export const persistentMultipleTabManager = () => ({ kind: 'multiTab' });
export const persistentSingleTabManager = () => ({ kind: 'singleTab' });
export const memoryLocalCache = () => ({ kind: 'memory' });
export const connectFirestoreEmulator = () => {};
export const enableIndexedDbPersistence = async () => {};

const juntar = (...partes) => partes.flatMap((p) => String(p).split('/')).filter(Boolean).join('/');
function caminhoDe(base) { return base && base.path ? base.path : ''; }

function refDoc(path) {
  const partes = path.split('/');
  const id = partes[partes.length - 1];
  return { type: 'document', id, path, firestore: db, get parent() { return refColecao(partes.slice(0, -1).join('/')); }, withConverter() { return this; } };
}
function refColecao(path) {
  const partes = path.split('/');
  return { type: 'collection', id: partes[partes.length - 1], path, firestore: db, withConverter() { return this; } };
}
export function collection(base, ...segs) { return refColecao(juntar(caminhoDe(base), ...segs)); }
export function doc(base, ...segs) {
  if (base && base.type === 'collection' && segs.length === 0) return refDoc(`${base.path}/${novoId()}`);
  return refDoc(juntar(caminhoDe(base), ...segs));
}
export function collectionGroup(_db, id) { return { type: 'group', id, path: id, firestore: db }; }

/* ---------- Constraints ---------- */
export const where = (campo, op, valor) => ({ k: 'where', campo: String(campo), op, valor });
export const orderBy = (campo, dir = 'asc') => ({ k: 'orderBy', campo: String(campo), dir });
export const limit = (n) => ({ k: 'limit', n });
export const limitToLast = (n) => ({ k: 'limitToLast', n });
export const startAfter = (...v) => ({ k: 'startAfter', v });
export const startAt = (...v) => ({ k: 'startAt', v });
export const endBefore = (...v) => ({ k: 'endBefore', v });
export const endAt = (...v) => ({ k: 'endAt', v });
export const documentId = () => '__name__';
export function query(base, ...cs) {
  const anteriores = base.type === 'query' ? base.cs : [];
  const origem = base.type === 'query' ? base.origem : base;
  return { type: 'query', path: origem.path, origem, cs: [...anteriores, ...cs.filter(Boolean)], firestore: db };
}
export const and = (...cs) => ({ k: 'and', cs });
export const or = (...cs) => ({ k: 'or', cs });

/* ---------- Leitura de campos e comparação ---------- */
function lerCampo(dados, campo, id) {
  if (campo === '__name__') return id;
  return String(campo).split('.').reduce((o, k) => (o == null ? undefined : o[k]), dados);
}
function normal(v) {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (v && typeof v === 'object' && v.type === 'document') return v.path;
  return v;
}
function comparar(a, b) {
  a = normal(a); b = normal(b);
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0);
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}
const igual = (a, b) => comparar(a, b) === 0 && normal(a) !== undefined;
function passa(c, dados, id) {
  if (c.k === 'and') return c.cs.every((x) => passa(x, dados, id));
  if (c.k === 'or') return c.cs.some((x) => passa(x, dados, id));
  if (c.k !== 'where') return true;
  const v = lerCampo(dados, c.campo, id);
  switch (c.op) {
    case '==': return igual(v, c.valor);
    case '!=': return v !== undefined && !igual(v, c.valor);
    case '<': return v !== undefined && comparar(v, c.valor) < 0;
    case '<=': return v !== undefined && comparar(v, c.valor) <= 0;
    case '>': return v !== undefined && comparar(v, c.valor) > 0;
    case '>=': return v !== undefined && comparar(v, c.valor) >= 0;
    case 'in': return Array.isArray(c.valor) && c.valor.some((x) => igual(v, x));
    case 'not-in': return v !== undefined && Array.isArray(c.valor) && !c.valor.some((x) => igual(v, x));
    case 'array-contains': return Array.isArray(v) && v.some((x) => igual(x, c.valor));
    case 'array-contains-any': return Array.isArray(v) && Array.isArray(c.valor) && v.some((x) => c.valor.some((y) => igual(x, y)));
    default: return false;
  }
}

/* ---------- Snapshots ---------- */
function snapDoc(path) {
  const existe = BANCO.has(path);
  const dados = existe ? clonar(BANCO.get(path)) : undefined;
  const ref = refDoc(path);
  return {
    id: ref.id, ref, metadata: { fromCache: false, hasPendingWrites: false },
    exists: () => existe,
    data: () => (existe ? clonar(dados) : undefined),
    get: (campo) => (existe ? clonar(lerCampo(dados, campo, ref.id)) : undefined),
  };
}
function docsDaColecao(path, grupo = false) {
  const n = path.split('/').length;
  const lista = [];
  for (const chave of BANCO.keys()) {
    const partes = chave.split('/');
    if (grupo ? partes[partes.length - 2] === path : (partes.length === n + 1 && chave.startsWith(`${path}/`))) lista.push(chave);
  }
  return lista;
}
function executar(q) {
  const origem = q.type === 'query' ? q.origem : q;
  const cs = q.type === 'query' ? q.cs : [];
  let docs = docsDaColecao(origem.path, origem.type === 'group').map((p) => ({ p, d: BANCO.get(p), id: p.split('/').pop() }));
  docs = docs.filter((x) => cs.every((c) => passa(c, x.d, x.id)));
  const ordens = cs.filter((c) => c.k === 'orderBy');
  if (ordens.length) {
    docs = docs.filter((x) => ordens.every((o) => lerCampo(x.d, o.campo, x.id) !== undefined));
    docs.sort((a, b) => {
      for (const o of ordens) { const r = comparar(lerCampo(a.d, o.campo, a.id), lerCampo(b.d, o.campo, b.id)); if (r) return o.dir === 'desc' ? -r : r; }
      return a.id < b.id ? -1 : 1;
    });
  } else docs.sort((a, b) => (a.id < b.id ? -1 : 1));
  const depois = cs.find((c) => c.k === 'startAfter' || c.k === 'startAt');
  if (depois) {
    const alvo = depois.v[0];
    let i = -1;
    if (alvo && typeof alvo === 'object' && alvo.ref) i = docs.findIndex((x) => x.p === alvo.ref.path);
    else if (ordens.length) i = docs.findIndex((x) => comparar(lerCampo(x.d, ordens[0].campo, x.id), alvo) * (ordens[0].dir === 'desc' ? -1 : 1) >= 0) - (depois.k === 'startAt' ? 1 : 0);
    if (i >= 0) docs = docs.slice(depois.k === 'startAt' ? i : i + 1);
    else if (depois.k === 'startAfter' && alvo && alvo.ref) docs = [];
  }
  const lim = cs.filter((c) => c.k === 'limit').pop();
  if (lim) docs = docs.slice(0, lim.n);
  const ult = cs.filter((c) => c.k === 'limitToLast').pop();
  if (ult) docs = docs.slice(-ult.n);
  return docs.map((x) => snapDoc(x.p));
}
function snapQuery(q) {
  const docs = executar(q);
  return { docs, size: docs.length, empty: docs.length === 0, metadata: { fromCache: false }, query: q, forEach: (f) => docs.forEach(f), docChanges: () => docs.map((d, i) => ({ type: 'added', doc: d, oldIndex: -1, newIndex: i })) };
}

export async function getDoc(ref) { await atraso(); return snapDoc(ref.path); }
export const getDocFromCache = getDoc;
export const getDocFromServer = getDoc;
export async function getDocs(q) { await atraso(); return snapQuery(q); }
export const getDocsFromCache = getDocs;
export const getDocsFromServer = getDocs;
export async function getCountFromServer(q) { await atraso(); const n = executar(q).length; return { data: () => ({ count: n }) }; }
export const getCount = getCountFromServer;
export async function getAggregateFromServer(q, spec) {
  const docs = executar(q); const out = {};
  for (const [k, a] of Object.entries(spec || {})) out[k] = a.t === 'count' ? docs.length : docs.reduce((s, d) => s + (Number(d.get(a.campo)) || 0), 0) / (a.t === 'avg' ? (docs.length || 1) : 1);
  return { data: () => out };
}
export const count = () => ({ t: 'count' });
export const sum = (campo) => ({ t: 'sum', campo });
export const average = (campo) => ({ t: 'avg', campo });

/* ---------- Escrita ---------- */
const SENTINELA = Symbol('sentinela');
export const arrayUnion = (...v) => ({ [SENTINELA]: 'union', v });
export const arrayRemove = (...v) => ({ [SENTINELA]: 'remove', v });
export const increment = (n) => ({ [SENTINELA]: 'inc', n });
export const deleteField = () => ({ [SENTINELA]: 'del' });
export const serverTimestamp = () => ({ [SENTINELA]: 'ts' });
function resolver(atual, novo) {
  if (!novo || typeof novo !== 'object' || !(SENTINELA in novo)) return clonar(novo);
  switch (novo[SENTINELA]) {
    case 'union': { const a = Array.isArray(atual) ? clonar(atual) : []; for (const x of novo.v) if (!a.some((y) => igual(y, x) && JSON.stringify(y) === JSON.stringify(x))) a.push(clonar(x)); return a; }
    case 'remove': return (Array.isArray(atual) ? atual : []).filter((y) => !novo.v.some((x) => JSON.stringify(x) === JSON.stringify(y)));
    case 'inc': return (Number(atual) || 0) + novo.n;
    case 'ts': return Timestamp.now();
    default: return undefined;
  }
}
const ehDel = (v) => v && typeof v === 'object' && v[SENTINELA] === 'del';
function aplicarObjeto(alvo, dados, merge) {
  for (const [k, v] of Object.entries(dados)) {
    if (ehDel(v)) { delete alvo[k]; continue; }
    if (merge && v && typeof v === 'object' && !Array.isArray(v) && !(SENTINELA in v) && !(v instanceof Timestamp) && !(v instanceof Date) && alvo[k] && typeof alvo[k] === 'object' && !Array.isArray(alvo[k])) aplicarObjeto(alvo[k], v, true);
    else alvo[k] = resolver(alvo[k], v);
  }
  return alvo;
}
function aplicarCaminho(alvo, campo, v) {
  const partes = String(campo).split('.');
  let o = alvo;
  for (const p of partes.slice(0, -1)) { if (!o[p] || typeof o[p] !== 'object') o[p] = {}; o = o[p]; }
  const ult = partes[partes.length - 1];
  if (ehDel(v)) delete o[ult]; else o[ult] = resolver(o[ult], v);
}
function gravarSet(ref, dados, opcoes = {}) {
  const merge = !!(opcoes && (opcoes.merge || opcoes.mergeFields));
  const base = merge && BANCO.has(ref.path) ? clonar(BANCO.get(ref.path)) : {};
  BANCO.set(ref.path, aplicarObjeto(base, dados || {}, merge));
}
function gravarUpdate(ref, a, ...resto) {
  if (!BANCO.has(ref.path)) { const e = new Error(`No document to update: ${ref.path}`); e.code = 'not-found'; throw e; }
  const atual = clonar(BANCO.get(ref.path));
  if (typeof a === 'string') { const pares = [a, ...resto]; for (let i = 0; i < pares.length; i += 2) aplicarCaminho(atual, pares[i], pares[i + 1]); }
  else for (const [k, v] of Object.entries(a || {})) aplicarCaminho(atual, k, v);
  BANCO.set(ref.path, atual);
}
// O servidor de verdade responde aos "comandos" (js/firebase.js pedirAoServidor). Aqui: "ok" na hora.
function talvezResponderComando(ref) {
  if (!ref.path.startsWith('comandos/')) return;
  setTimeout(() => {
    if (!BANCO.has(ref.path)) return;
    BANCO.set(ref.path, { ...BANCO.get(ref.path), status: 'ok', resultado: { demonstracao: true, mensagem: 'Na demonstração nada é gravado de verdade.' } });
    avisarMudanca();
  }, 500);
}
export async function setDoc(ref, dados, opcoes) { await atraso(); gravarSet(ref, dados, opcoes); talvezResponderComando(ref); avisarMudanca(); }
export async function addDoc(col, dados) { await atraso(); const ref = refDoc(`${col.path}/${novoId()}`); gravarSet(ref, dados); talvezResponderComando(ref); avisarMudanca(); return ref; }
export async function updateDoc(ref, a, ...resto) { await atraso(); gravarUpdate(ref, a, ...resto); avisarMudanca(); }
export async function deleteDoc(ref) { await atraso(); BANCO.delete(ref.path); avisarMudanca(); }
export function writeBatch() {
  const ops = [];
  const b = {
    set(ref, d, o) { ops.push(() => gravarSet(ref, d, o)); return b; },
    update(ref, a, ...r) { ops.push(() => gravarUpdate(ref, a, ...r)); return b; },
    delete(ref) { ops.push(() => BANCO.delete(ref.path)); return b; },
    async commit() { await atraso(); ops.forEach((f) => f()); avisarMudanca(); },
  };
  return b;
}
export async function runTransaction(_db, fn) {
  const t = {
    get: async (ref) => snapDoc(ref.path),
    set(ref, d, o) { gravarSet(ref, d, o); return t; },
    update(ref, a, ...r) { gravarUpdate(ref, a, ...r); return t; },
    delete(ref) { BANCO.delete(ref.path); return t; },
  };
  const r = await fn(t); avisarMudanca(); return r;
}

/* ---------- Tempo real ---------- */
export function onSnapshot(alvo, ...args) {
  let opcoes = {}; if (args[0] && typeof args[0] === 'object' && !args[0].next && typeof args[0] !== 'function') opcoes = args.shift();
  let prox = args[0]; let erro = args[1];
  if (prox && typeof prox === 'object') { erro = prox.error; prox = prox.next; }
  void opcoes;
  let ativo = true;
  let ultimo = null;
  const emitir = () => {
    if (!ativo) return;
    try {
      const s = alvo.type === 'document' ? snapDoc(alvo.path) : snapQuery(alvo);
      const assinatura = JSON.stringify(alvo.type === 'document' ? (s.exists() ? s.data() : null) : s.docs.map((d) => [d.id, d.data()]));
      if (assinatura === ultimo) return;
      ultimo = assinatura;
      prox && prox(s);
    } catch (e) { erro ? erro(e) : console.warn('demo onSnapshot', e); }
  };
  OUVINTES.add(emitir);
  setTimeout(emitir, 0);
  return () => { ativo = false; OUVINTES.delete(emitir); };
}

/* ============================== Auth ============================== */
export const browserLocalPersistence = { type: 'LOCAL' };
export const browserSessionPersistence = { type: 'SESSION' };
export const indexedDBLocalPersistence = { type: 'LOCAL' };
export const inMemoryPersistence = { type: 'NONE' };
export const browserPopupRedirectResolver = {};
const b64url = (o) => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const tokenFalso = (claims) => `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ ...claims, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.demo`;
function lerToken(t) {
  try { const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(p)))); } catch (e) { return {}; }
}
function criarUsuario(auth, { uid, email = '', displayName = null, claims = {} }) {
  const u = {
    uid, email, displayName, emailVerified: true, isAnonymous: false, providerData: [], phoneNumber: null, photoURL: null,
    metadata: { creationTime: new Date().toUTCString(), lastSignInTime: new Date().toUTCString() },
    async getIdToken() { return tokenFalso({ ...claims, user_id: uid, sub: uid, email }); },
    async getIdTokenResult() { const token = await u.getIdToken(); return { token, claims: { ...claims, user_id: uid, sub: uid, email }, authTime: new Date().toISOString(), issuedAtTime: new Date().toISOString(), expirationTime: new Date(Date.now() + 3600e3).toISOString(), signInProvider: 'password' }; },
    async reload() {},
    async delete() {},
    toJSON() {
      return { uid, email, emailVerified: true, isAnonymous: false, providerData: [], displayName, apiKey: auth.config.apiKey, appName: auth.name,
        stsTokenManager: { accessToken: tokenFalso({ ...claims, user_id: uid, sub: uid, email }), refreshToken: 'demo', expirationTime: Date.now() + 3600e3 }, createdAt: String(Date.now()), lastLoginAt: String(Date.now()) };
    },
  };
  return u;
}
const AUTHS = new Map();
const chaveDe = (auth) => `firebase:authUser:${auth.config.apiKey}:${auth.name}`;
function persistir(auth) {
  if (EH_DEMO) return; // a demonstração não grava login nenhum no navegador
  try { if (auth.currentUser) localStorage.setItem(chaveDe(auth), JSON.stringify(auth.currentUser.toJSON())); else localStorage.removeItem(chaveDe(auth)); } catch (e) { /* ok */ }
}
function novoAuth(app) {
  if (AUTHS.has(app.name)) return AUTHS.get(app.name);
  const ouvintes = new Set();
  const auth = {
    app, name: app.name, config: { apiKey: (app.options && app.options.apiKey) || 'demo' }, languageCode: null, tenantId: null, settings: {},
    currentUser: null,
    _avisar() { for (const f of [...ouvintes]) { try { f(auth.currentUser); } catch (e) { console.warn('demo auth', e); } } },
    async authStateReady() {},
    onAuthStateChanged(f) { ouvintes.add(f); setTimeout(() => ouvintes.has(f) && f(auth.currentUser), 0); return () => ouvintes.delete(f); },
    onIdTokenChanged(f) { return auth.onAuthStateChanged(f); },
    async signOut() { return signOut(auth); },
    useDeviceLanguage() {},
  };
  if (EH_DEMO) {
    if (app.name === '[DEFAULT]' || /^escola-/.test(app.name)) auth.currentUser = criarUsuario(auth, SESSAO_DEMO);
  } else {
    try {
      const salvo = localStorage.getItem(chaveDe(auth));
      if (salvo) { const j = JSON.parse(salvo); auth.currentUser = criarUsuario(auth, { uid: j.uid, email: j.email, claims: lerToken(j.stsTokenManager.accessToken) }); }
    } catch (e) { /* ok */ }
  }
  AUTHS.set(app.name, auth);
  return auth;
}
export const initializeAuth = (app) => novoAuth(app);
export const getAuth = (app = getApp()) => novoAuth(app);
export const onAuthStateChanged = (auth, f) => auth.onAuthStateChanged(typeof f === 'function' ? f : f.next);
export const onIdTokenChanged = onAuthStateChanged;
export const setPersistence = async () => {};
export const connectAuthEmulator = () => {};
function erroAuth(code) { const e = new Error(`Firebase: Error (${code}).`); e.code = code; return e; }
export async function signInWithEmailAndPassword(auth, email, senha) {
  await atraso(150);
  const contas = globalThis.__CONTAS_DEMO__ || {};
  const c = contas[String(email).toLowerCase()];
  if (!c || c.senha !== senha) throw erroAuth('auth/invalid-credential');
  auth.currentUser = criarUsuario(auth, { uid: c.uid, email: String(email).toLowerCase(), claims: c.claims || {} });
  persistir(auth); auth._avisar();
  return { user: auth.currentUser, providerId: 'password', operationType: 'signIn' };
}
export async function createUserWithEmailAndPassword(auth, email) {
  await atraso(150);
  const u = criarUsuario(auth, { uid: novoId(), email: String(email).toLowerCase(), claims: {} });
  auth.currentUser = u; persistir(auth); auth._avisar();
  return { user: u, providerId: 'password', operationType: 'signIn' };
}
export async function signOut(auth) {
  auth.currentUser = null; persistir(auth); auth._avisar();
  // Na vitrine, "Sair" volta para o site da AtletaPay.
  if (EH_DEMO && (auth.name === '[DEFAULT]' || /^escola-/.test(auth.name)) && typeof location !== 'undefined') setTimeout(() => location.assign('/'), 50);
}
export const sendPasswordResetEmail = async () => {};
export const sendEmailVerification = async () => {};
export const confirmPasswordReset = async () => {};
export const verifyPasswordResetCode = async () => 'demo@atletapay.com.br';
export const applyActionCode = async () => {};
export const updateProfile = async (u, p) => { Object.assign(u, p || {}); };
export const updatePassword = async () => {};
export const updateEmail = async () => {};
export const reauthenticateWithCredential = async (u) => ({ user: u });
export const EmailAuthProvider = { PROVIDER_ID: 'password', credential: (email, password) => ({ providerId: 'password', email, password }) };
export const fetchSignInMethodsForEmail = async () => [];

/* ============================== Storage ============================== */
const ARQUIVOS = new Map();
const storage = { type: 'storage' };
export const getStorage = () => storage;
export const ref = (_s, path = '') => ({ fullPath: String(path), name: String(path).split('/').pop(), bucket: 'demo', toString: () => `gs://demo/${path}` });
export async function uploadString(r, texto, formato) { await atraso(80); ARQUIVOS.set(r.fullPath, formato === 'data_url' ? texto : `data:text/plain,${encodeURIComponent(texto)}`); return { ref: r, metadata: { fullPath: r.fullPath } }; }
export async function uploadBytes(r, bytes, meta = {}) {
  await atraso(80);
  let url = 'data:,';
  try { url = URL.createObjectURL(bytes instanceof Blob ? bytes : new Blob([bytes], { type: meta.contentType || 'application/octet-stream' })); } catch (e) { /* ok */ }
  ARQUIVOS.set(r.fullPath, url);
  return { ref: r, metadata: { fullPath: r.fullPath, contentType: meta.contentType } };
}
export const uploadBytesResumable = (r, bytes, meta) => { const p = uploadBytes(r, bytes, meta); return { on: (_e, _p, erro, fim) => { p.then(() => fim && fim(), erro); }, then: (...a) => p.then(...a), snapshot: { ref: r } }; };
export async function getDownloadURL(r) { if (ARQUIVOS.has(r.fullPath)) return ARQUIVOS.get(r.fullPath); throw Object.assign(new Error('demo: arquivo não existe'), { code: 'storage/object-not-found' }); }
export async function deleteObject(r) { ARQUIVOS.delete(r.fullPath); }
export const getMetadata = async (r) => ({ fullPath: r.fullPath, size: 0 });
export const listAll = async () => ({ items: [], prefixes: [] });

/* ============================== Messaging / App Check / Functions ============================== */
export const isSupported = async () => false;
export const getMessaging = () => ({ type: 'messaging' });
export const getToken = async () => '';
export const deleteToken = async () => true;
export const onMessage = () => () => {};
export const initializeAppCheck = () => ({ type: 'appCheck' });
export class ReCaptchaEnterpriseProvider { constructor(k) { this.k = k; } }
export class ReCaptchaV3Provider { constructor(k) { this.k = k; } }
export const getFunctions = () => ({ type: 'functions' });
export const httpsCallable = () => async () => ({ data: { demonstracao: true } });
export const getAnalytics = () => ({});
export const logEvent = () => {};

// Para os testes e para a faixa "Demonstração" poderem olhar o banco.
export const __demo = { BANCO, EH_DEMO, Timestamp, executar: (q) => executar(q).map((d) => ({ id: d.id, ...d.data() })) };
