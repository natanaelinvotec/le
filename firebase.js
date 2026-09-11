// Firebase — cole o firebaseConfig do seu projeto e pronto.
// Console do Firebase → Configurações do projeto → Seus apps → Web.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBkwCDziIv-Uh7MLzsy9OYJmA_LMnn7jbg',
  authDomain: 'capoeira-liberdade.firebaseapp.com',
  projectId: 'capoeira-liberdade',
  storageBucket: 'capoeira-liberdade.firebasestorage.app',
  messagingSenderId: '492022804215',
  appId: '1:492022804215:web:c61aed556d9f1aa9576df2'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
await setPersistence(auth, browserLocalPersistence); // "manter-me sempre conectado"

export const SENHA_PADRAO = 'capoeira2026';

export async function entrar(email, senha) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
  const perfil = await getDoc(doc(db, 'usuarios', cred.user.uid));
  return { uid: cred.user.uid, ...(perfil.exists() ? perfil.data() : {}) };
}
export const recuperarSenha = (email) => sendPasswordResetEmail(auth, email);
export const sair = () => signOut(auth);
export const observarSessao = (cb) => onAuthStateChanged(auth, cb);

// Coleções do grupo
export const listar = async (col) => (await getDocs(collection(db, col))).docs.map((d) => ({ id: d.id, ...d.data() }));
export const listarPorAcademia = async (col, academia) =>
  (await getDocs(query(collection(db, col), where('academia', '==', academia)))).docs.map((d) => ({ id: d.id, ...d.data() }));
export const salvar = (col, id, dados) => setDoc(doc(db, col, id), dados, { merge: true });
export const criar = (col, dados) => addDoc(collection(db, col), dados);
export const atualizar = (col, id, dados) => updateDoc(doc(db, col, id), dados);
export const remover = (col, id) => deleteDoc(doc(db, col, id));

// Avaliações com histórico
export const salvarAvaliacao = (alunoId, dados) =>
  addDoc(collection(db, 'alunos', alunoId, 'avaliacoes'), { ...dados, criadoEm: new Date().toISOString() });
export const historicoAvaliacoes = async (alunoId) =>
  (await getDocs(query(collection(db, 'alunos', alunoId, 'avaliacoes'), orderBy('criadoEm', 'desc')))).docs.map((d) => d.data());

// Materiais de estudo publicados pelo Master Admin
export const publicarMaterial = (dados) => addDoc(collection(db, 'materiais'), { ...dados, criadoEm: new Date().toISOString() });
export const listarMateriais = () => listar('materiais');

// Financeiro
export const lancarPagamento = (dados) => addDoc(collection(db, 'pagamentos'), { ...dados, criadoEm: new Date().toISOString() });
export const pagamentosDoAluno = async (alunoId) =>
  (await getDocs(query(collection(db, 'pagamentos'), where('alunoId', '==', alunoId)))).docs.map((d) => d.data());
