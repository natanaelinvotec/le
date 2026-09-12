// Firebase — módulo único de configuração/inicialização, importado por
// todas as páginas novas (login.html, inscricao.html, admin.html, app.html).
// Antes esse config estava duplicado em vários arquivos (login.js/admin.js/
// inscricao.js), um deles até com um erro de digitação na apiKey.
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged, signOut,
  setPersistence, browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter,
  getCountFromServer, initializeFirestore, persistentLocalCache,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBkwCDziiV-Uh7MLzsy9OYJmA_LMnn7jbg',
  authDomain: 'capoeira-liberdade.firebaseapp.com',
  projectId: 'capoeira-liberdade',
  storageBucket: 'capoeira-liberdade.firebasestorage.app',
  messagingSenderId: '492022804215',
  appId: '1:492022804215:web:c61aed556d9f1aa9576df2',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Cache local ligado - visões repetidas na mesma sessão não voltam a ler do
// servidor o que não mudou (parte do esforço de reduzir leituras do Firestore).
export const db = initializeFirestore(app, { localCache: persistentLocalCache() });
export const storage = getStorage(app);
await setPersistence(auth, browserLocalPersistence); // "manter-me sempre conectado"

// Upload de foto (carteirinha/perfil) - usado pela inscrição e pela troca de
// foto no painel. Retorna a URL pública já pronta para gravar no Firestore.
export async function enviarFoto(caminho, dataUrl) {
  const r = storageRef(storage, caminho);
  await uploadString(r, dataUrl, 'data_url');
  return getDownloadURL(r);
}

// Senha padrão sugerida quando o admin cria uma conta nova (professor/mestre) -
// a pessoa troca depois em "Meus dados". Não tem mais nenhum papel de
// segurança (a senha real de cada um é validada pelo Firebase Auth).
export const SENHA_PADRAO = 'capoeira2026';

// ===== Sessão =====
export async function entrar(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
  const perfil = await getDoc(doc(db, 'usuarios', cred.user.uid));
  if (!perfil.exists()) throw new Error('Conta sem perfil cadastrado. Fale com a administração.');
  return { uid: cred.user.uid, ...perfil.data() };
}
export const recuperarSenha = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());
export const sair = () => signOut(auth);
export const observarSessao = (cb) => onAuthStateChanged(auth, cb);
export const meuUid = () => auth.currentUser && auth.currentUser.uid;

// Autocadastro (inscrição pública) - cria a conta de verdade no Firebase Auth
// e o perfil em usuarios/{uid}, sempre com papeis:['aluno'] (o Firestore
// também garante isso nas regras, isto aqui é só a primeira camada).
// `dados` deve trazer pelo menos: nome, idade, academiaId, cordaoAtual,
// statusAtual, fotoUrl, responsavelUid (ou null), responsavelDe ([]).
export async function criarConta(email, senha, dados) {
  const emailNorm = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, emailNorm, senha);
  const perfil = {
    notas: {},
    responsavelUid: null,
    responsavelDe: [],
    academiaGerenciadaId: null,
    ...dados,
    papeis: ['aluno'],
    email: emailNorm,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };
  await setDoc(doc(db, 'usuarios', cred.user.uid), perfil);
  return { uid: cred.user.uid, ...perfil };
}

// Criação de conta feita PELO ADMIN (ex.: novo professor/mestre) sem derrubar
// a própria sessão do admin - usa uma segunda instância do Firebase só para
// criar o usuário no Auth, depois fecha essa instância. A gravação do perfil
// em usuarios/{uid} é feita pela sessão normal do admin (por isso pode
// receber qualquer papel/academiaGerenciadaId em `dados` - as regras do
// Firestore só permitem isso para quem já está logado como admin).
export async function criarContaComoAdmin(email, senha, dados) {
  const emailNorm = email.trim().toLowerCase();
  const secApp = initializeApp(firebaseConfig, 'secundario-' + Date.now());
  try {
    const secAuth = getAuth(secApp);
    const cred = await createUserWithEmailAndPassword(secAuth, emailNorm, senha);
    const uid = cred.user.uid;
    await signOut(secAuth);
    const perfil = {
      notas: {},
      responsavelUid: null,
      responsavelDe: [],
      academiaGerenciadaId: null,
      ...dados,
      email: emailNorm,
      ativo: true,
      criadoEm: new Date().toISOString(),
    };
    await setDoc(doc(db, 'usuarios', uid), perfil);
    return { uid, ...perfil };
  } finally {
    await deleteApp(secApp);
  }
}

// ===== Coleções genéricas =====
export const listar = async (col) => (await getDocs(collection(db, col))).docs.map((d) => ({ id: d.id, ...d.data() }));
export const listarPorAcademia = async (col, academiaId, tamanho = 50, cursor = null) => {
  let q = query(collection(db, col), where('academiaId', '==', academiaId), limit(tamanho));
  if (cursor) q = query(collection(db, col), where('academiaId', '==', academiaId), startAfter(cursor), limit(tamanho));
  const snap = await getDocs(q);
  return { itens: snap.docs.map((d) => ({ id: d.id, ...d.data() })), ultimoDoc: snap.docs[snap.docs.length - 1] || null };
};
// Contagem via agregação do servidor - custa 1 leitura, não N (a principal
// economia de leituras nos relatórios do painel).
export const contar = async (col, condicoes = []) => {
  let q = collection(db, col);
  if (condicoes.length) q = query(q, ...condicoes.map(([campo, op, valor]) => where(campo, op, valor)));
  const snap = await getCountFromServer(q);
  return snap.data().count;
};
export const salvar = (col, id, dados) => setDoc(doc(db, col, id), dados, { merge: true });
export const buscar = async (col, id) => {
  const s = await getDoc(doc(db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
};
export const criar = (col, dados) => addDoc(collection(db, col), dados);
export const atualizar = (col, id, dados) => updateDoc(doc(db, col, id), dados);
export const remover = (col, id) => deleteDoc(doc(db, col, id));

// ===== Avaliações com histórico (subcoleção de usuarios/{uid}) =====
export const salvarAvaliacao = (uid, dados) =>
  addDoc(collection(db, 'usuarios', uid, 'avaliacoes'), { ...dados, criadoEm: new Date().toISOString() });
export const historicoAvaliacoes = async (uid) =>
  (await getDocs(query(collection(db, 'usuarios', uid, 'avaliacoes'), orderBy('criadoEm', 'desc')))).docs.map((d) => d.data());

// ===== Núcleos/academias (leitura pública p/ aparecer na inscrição) =====
export const listarNucleosAtivos = async () =>
  (await getDocs(query(collection(db, 'nucleos'), where('ativo', '==', true)))).docs.map((d) => ({ id: d.id, ...d.data() }));

// ===== Solicitações (mestre/professor → admin) =====
export const criarSolicitacao = (dados) =>
  addDoc(collection(db, 'solicitacoes'), { ...dados, status: 'pendente', criadoEm: new Date().toISOString() });
export const minhasSolicitacoes = async (uid) =>
  (await getDocs(query(collection(db, 'solicitacoes'), where('solicitanteUid', '==', uid), orderBy('criadoEm', 'desc')))).docs.map((d) => ({ id: d.id, ...d.data() }));

// ===== Avisos (notificações dentro do app) =====
export const publicarAviso = (dados) =>
  addDoc(collection(db, 'avisos'), { ...dados, criadoEm: new Date().toISOString() });
export const listarAvisos = async (tamanho = 20) =>
  (await getDocs(query(collection(db, 'avisos'), orderBy('criadoEm', 'desc'), limit(tamanho)))).docs.map((d) => ({ id: d.id, ...d.data() }));

// ===== Materiais de estudo publicados pelo Master Admin =====
export const publicarMaterial = (dados) => addDoc(collection(db, 'materiais'), { ...dados, criadoEm: new Date().toISOString() });
export const listarMateriais = () => listar('materiais');

// ===== Financeiro =====
export const lancarPagamento = (dados) => addDoc(collection(db, 'pagamentos'), { ...dados, criadoEm: new Date().toISOString() });
export const pagamentosDoAluno = async (alunoId) =>
  (await getDocs(query(collection(db, 'pagamentos'), where('alunoId', '==', alunoId)))).docs.map((d) => d.data());
