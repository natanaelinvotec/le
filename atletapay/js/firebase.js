/* firebase.js — AtletaPay (site e cadastro das escolas).

Mesmo projeto Firebase do app (as escolas, os donos e os leads ficam nas
coleções escolas/, donos/, escolasSlugs/ e leads/, protegidas em
firebase/firestore.rules do repositório le). Só chave pública entra aqui. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  initializeAuth, browserLocalPersistence, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, updateProfile, signOut,
  verifyPasswordResetCode, confirmPasswordReset, applyActionCode, checkActionCode,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBkwCDziIv-Uh7MLzsy9OYJmA_LMnn7jbg',
  authDomain: 'capoeira-liberdade.firebaseapp.com',
  projectId: 'capoeira-liberdade',
  storageBucket: 'capoeira-liberdade.firebasestorage.app',
  messagingSenderId: '492022804215',
  appId: '1:492022804215:web:c61aed556d9f1aa9576df2',
};
// App Check (reCAPTCHA Enterprise / "Fraud Defense"): a mesma chave e o mesmo provedor do
// app — o provedor registrado no Console → App Check é Enterprise. Monitoramento por enquanto.
const APP_CHECK_SITE_KEY = '6LccBdQtAAAAANJl-I6rIh-fMLOrl-RHaikSEjfY';

const app = initializeApp(FIREBASE_CONFIG);
export const auth = initializeAuth(app, { persistence: [browserLocalPersistence] });
// E-mails do Firebase (nova senha, confirmação) em português.
auth.languageCode = 'pt-BR';
export const db = getFirestore(app);
export const storage = getStorage(app);
export { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, writeBatch, storageRef, uploadString, getDownloadURL };

if (APP_CHECK_SITE_KEY && typeof window !== 'undefined') {
  const ligar = () => import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }).catch(() => {});
  const depois = () => setTimeout(() => (window.requestIdleCallback || ((f) => f()))(ligar, { timeout: 4000 }), 2500);
  if (document.readyState === 'complete') depois(); else window.addEventListener('load', depois, { once: true });
}

export const observarSessao = (cb) => onAuthStateChanged(auth, cb);
export const meuUid = () => auth.currentUser && auth.currentUser.uid;
export const sair = () => signOut(auth);
// Nova senha: o link do e-mail abre atletapay.com.br/conta (Console → Authentication → Modelos →
// URL de ação) e, no fim, devolve a pessoa para `voltarPara` (a tela de onde ela pediu).
// Endereço de volta não autorizado no Authentication → manda o e-mail mesmo assim, sem a volta.
export async function recuperarSenha(email, voltarPara = `${location.origin}${location.pathname}`) {
  const em = String(email).trim().toLowerCase();
  try { await sendPasswordResetEmail(auth, em, { url: voltarPara }); }
  catch (e) { if (/unauthorized-continue-uri|invalid-continue-uri|missing-continue-uri/.test((e && e.code) || '')) await sendPasswordResetEmail(auth, em); else throw e; }
}
// Página de ação da conta (conta.html): valida e aplica o código que veio no link do e-mail.
export const conferirCodigoSenha = (codigo) => verifyPasswordResetCode(auth, codigo);
export const gravarNovaSenha = (codigo, senha) => confirmPasswordReset(auth, codigo, senha);
export const aplicarCodigo = (codigo) => applyActionCode(auth, codigo);
export const conferirCodigo = (codigo) => checkActionCode(auth, codigo);
export async function entrar(email, senha) { return (await signInWithEmailAndPassword(auth, String(email).trim().toLowerCase(), senha)).user; }
export async function criarConta(nome, email, senha) {
  const cred = await createUserWithEmailAndPassword(auth, String(email).trim().toLowerCase(), senha);
  try { await updateProfile(cred.user, { displayName: String(nome).trim().slice(0, 80) }); } catch (e) { /* ok */ }
  try { await sendEmailVerification(cred.user); } catch (e) { /* ok */ }
  return cred.user;
}

// Mensagens de erro do Auth em português simples.
export function erroAmigavel(e) {
  const c = (e && e.code) || '';
  if (/email-already-in-use/.test(c)) return 'Este e-mail já tem conta. Entre com a senha ou use "Esqueci minha senha".';
  if (/invalid-email/.test(c)) return 'E-mail inválido.';
  if (/weak-password/.test(c)) return 'Senha fraca: use pelo menos 8 caracteres.';
  if (/wrong-password|invalid-credential|user-not-found/.test(c)) return 'E-mail ou senha não conferem.';
  if (/too-many-requests/.test(c)) return 'Muitas tentativas. Aguarde um minuto e tente de novo.';
  if (/expired-action-code/.test(c)) return 'Este link expirou. Peça um link novo na tela de entrar.';
  if (/invalid-action-code/.test(c)) return 'Este link já foi usado ou não é válido. Peça um link novo na tela de entrar.';
  if (/user-disabled/.test(c)) return 'Esta conta está desativada. Fale com o suporte da AtletaPay.';
  if (/password-does-not-meet-requirements/.test(c)) return 'A senha não atende às regras de segurança: use pelo menos 8 caracteres, com letras e números.';
  if (/network-request-failed/.test(c)) return 'Sem internet agora. Tente de novo.';
  if (/permission-denied/.test(c)) return 'Sem permissão para gravar. Confira se o e-mail foi verificado.';
  return (e && e.message) || 'Não deu certo agora. Tente de novo.';
}

// Upload de imagem (logo/fotos) já comprimida: devolve a URL pública.
export async function comprimir(file, maxDim = 1600, qualidade = 0.86) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const esc = Math.min(1, maxDim / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const png = /png|svg/.test(file.type); // logo com transparência fica PNG
  return c.toDataURL(png ? 'image/png' : 'image/jpeg', qualidade);
}
export async function enviarImagem(caminho, dataUrl) {
  const r = storageRef(storage, caminho);
  await uploadString(r, dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' });
  return getDownloadURL(r);
}
