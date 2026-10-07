// Firebase — módulo único de configuração/inicialização, importado por
// todas as páginas novas (login.html, inscricao.html, admin.html, app.html).
// Antes esse config estava duplicado em vários arquivos (login.js/admin.js/
// inscricao.js), um deles até com um erro de digitação na apiKey.
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, initializeAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, onAuthStateChanged, signOut,
  browserLocalPersistence, indexedDBLocalPersistence,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, startAfter, arrayUnion,
  getCountFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDocsFromCache,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL, uploadBytes, deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { arrayRemove, increment, onSnapshot, writeBatch, deleteField } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { FIREBASE_CONFIG, APP_CHECK_SITE_KEY, ESCOLA } from './escola.js';

// Re-export do SDK: as páginas importam tudo daqui (uma versão só do
// Firebase em todo o app; e os testes locais conseguem simular num módulo só).
export {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter,
  arrayUnion, arrayRemove, increment, onSnapshot, writeBatch, deleteField, getCountFromServer,
  storageRef, uploadString, uploadBytes, getDownloadURL, deleteObject,
};

// Chaves públicas do projeto: ficam em escola.js (white-label).
export const firebaseConfig = FIREBASE_CONFIG;

const app = initializeApp(firebaseConfig);
export const firebaseApp = app;
// Login "manter-me sempre conectado" (localStorage). initializeAuth já nasce com
// essa persistência — antes era getAuth + await setPersistence, que segurava a
// página inteira até o Auth terminar de trocar de lugar a sessão.
// indexedDB fica como 2ª opção só para migrar sessões antigas gravadas lá.
export const auth = initializeAuth(app, { persistence: [browserLocalPersistence, indexedDBLocalPersistence] });
// Cache local ligado - visões repetidas na mesma sessão não voltam a ler do
// servidor o que não mudou (parte do esforço de reduzir leituras do Firestore).
// Cache local do Firestore compartilhado entre abas (painel + Rede abertos
// juntos): antes, a segunda aba ficava SEM cache e relia tudo do servidor.
export const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const storage = getStorage(app);

// ===== Multi-escola: a escola de quem está logado =====
// Vem do próprio login (custom claim `escolaId`, gravado pelo servidor em
// functions/src/escolas.js). As regras do banco usam o mesmo claim, então o app
// grava e consulta conteúdo de escola SEMPRE com este valor. Conta recém-criada
// ganha o claim alguns segundos depois do cadastro: esperamos e renovamos o login.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let escolaCache = { uid: null, p: null };
async function lerClaimEscola(u) {
  let t = await u.getIdTokenResult();
  for (let i = 0; !t.claims.escolaId && i < 8; i++) { await espera(i < 3 ? 1500 : 4000); t = await u.getIdTokenResult(true); }
  return typeof t.claims.escolaId === 'string' ? t.claims.escolaId : null;
}
export async function minhaEscolaId() {
  if (typeof auth.authStateReady === 'function') await auth.authStateReady();
  const u = auth.currentUser;
  if (!u) return null;
  if (escolaCache.uid !== u.uid || !escolaCache.p) escolaCache = { uid: u.uid, p: lerClaimEscola(u).catch(() => null) };
  return escolaCache.p;
}
onAuthStateChanged(auth, (u) => { if (!u || u.uid !== escolaCache.uid) escolaCache = { uid: null, p: null }; });
// Coleções de CONTEÚDO de escola: lista sempre filtrada pela escola; criação já leva escolaId.
export const COLECOES_DA_ESCOLA = new Set(['eventos', 'avisos', 'materiais', 'stories', 'campeonatos']);
export async function comMinhaEscola(dados) {
  const e = await minhaEscolaId();
  if (!e) throw new Error('Sua conta ainda está sendo preparada. Tente de novo em alguns segundos.');
  return { ...dados, escolaId: e };
}
// Consulta de uma coleção de escola, já com where('escolaId', '==', minha escola) + filtros extras.
// Sem escola (não logado / login ainda sem claim) devolve null: quem chama trata como "lista vazia".
export async function consultaDaEscola(col, ...filtros) {
  const e = await minhaEscolaId();
  if (!e) return null;
  return query(collection(db, col), where('escolaId', '==', e), ...filtros);
}

// App Check (reCAPTCHA Enterprise / "Fraud Defense"): só liga quando a chave do site
// estiver em escola.js. O provedor TEM de ser o mesmo registrado no Console → App Check
// (lá é Enterprise; com o provedor v3 clássico o servidor devolvia 400 e nunca emitia token).
// Liga DEPOIS que a tela abriu (modo monitoramento): o reCAPTCHA pesa ~800 KB e,
// ligado no início, o login e o banco esperavam o token (2–4 s a mais por tela).
// Firestore, Auth e Storage passam a mandar o token assim que ele existe.
// Antes de clicar em "Aplicar" no Console, troque APP_CHECK_IMEDIATO para true
// (docs/SEGURANCA.md) — senão as primeiras chamadas de cada tela seriam barradas.
const APP_CHECK_IMEDIATO = false;
function ligarAppCheck() {
  import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY), isTokenAutoRefreshEnabled: true });
  }).catch((e) => console.warn('App Check não carregou', e));
}
if (APP_CHECK_SITE_KEY && typeof window !== 'undefined') {
  if (APP_CHECK_IMEDIATO) ligarAppCheck();
  else {
    const depois = () => setTimeout(() => (window.requestIdleCallback || ((f) => f()))(ligarAppCheck, { timeout: 4000 }), 2500);
    if (document.readyState === 'complete') depois(); else window.addEventListener('load', depois, { once: true });
  }
}

// Upload de foto (carteirinha/perfil) - usado pela inscrição e pela troca de
// foto no painel. Retorna a URL pública já pronta para gravar no Firestore.
export async function enviarFoto(caminho, dataUrl) {
  const r = storageRef(storage, caminho);
  await uploadString(r, dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' });
  return getDownloadURL(r);
}
// Foto de perfil SEMPRE no Storage (pasta fotos/<uid>/) — no banco fica só o
// link. Antes a foto ia em texto (base64) dentro do cadastro, deixando cada
// leitura pesada. Se já vier um link https, devolve o próprio link.
export async function salvarFotoPerfil(uidAlvo, dataUrlOuLink) {
  const v = String(dataUrlOuLink || '');
  if (!v || /^https?:\/\//.test(v) || v.startsWith('assets/')) return v;
  if (!v.startsWith('data:image/')) throw new Error('Foto inválida.');
  return enviarFoto(`fotos/${uidAlvo}/perfil_${Date.now()}.jpg`, v);
}

// ===== Compressão de imagem (evita que uma foto de 15MB da galeria pese o
// banco/o storage) — redimensiona para no máximo `maxDim` no maior lado e
// recomprime em JPEG, descartando o arquivo grande original. 540px é o
// padrão combinado: suficiente pra reconhecer o aluno nos cards do app. =====
export async function comprimirImagemDataUrl(dataUrl, maxDim = 540, qualidade = 0.82) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    el.src = dataUrl;
  });
  const maiorLado = Math.max(img.width, img.height);
  const escala = maiorLado > maxDim ? maxDim / maiorLado : 1;
  const w = Math.max(1, Math.round(img.width * escala));
  const h = Math.max(1, Math.round(img.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', qualidade);
}

// Lê um File (do input da galeria) e devolve o dataURL já comprimido —
// usar sempre no lugar de ler o arquivo cru, tanto na inscrição quanto em
// qualquer tela de editar foto de perfil.
export function arquivoParaDataUrlComprimido(file, maxDim = 540, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem.'));
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => comprimirImagemDataUrl(leitor.result, maxDim, qualidade).then(resolve).catch(reject);
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.readAsDataURL(file);
  });
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
export const sair = () => { try { localStorage.removeItem('le.destino'); } catch (e) { /* ok */ } return signOut(auth); };

// Troca de senha feita pela própria pessoa (Meus dados / Minha conta / Rede).
// O Firebase exige login recente para mudar senha: por isso a pessoa digita a
// senha atual e reautenticamos antes de gravar a nova. A senha nunca passa
// pelo Firestore — fica só no Firebase Authentication.
export async function trocarSenha(senhaAtual, novaSenha) {
  const u = auth.currentUser;
  if (!u || !u.email) { const e = new Error('Sessão expirada.'); e.code = 'auth/no-current-user'; throw e; }
  const cred = EmailAuthProvider.credential(u.email, senhaAtual);
  await reauthenticateWithCredential(u, cred);
  await updatePassword(u, novaSenha);
}
export const emailDaSessao = () => (auth.currentUser && auth.currentUser.email) || '';
export const observarSessao = (cb) => onAuthStateChanged(auth, cb);
export const meuUid = () => auth.currentUser && auth.currentUser.uid;

// Autocadastro (inscrição pública) - cria a conta de verdade no Firebase Auth
// e o perfil em usuarios/{uid}, sempre com papeis:['aluno'] (o Firestore
// também garante isso nas regras, isto aqui é só a primeira camada).
// `dados` deve trazer pelo menos: nome, idade, academiaId, cordaoAtual,
// statusAtual, fotoUrl, responsavelUid (ou null), responsavelDe ([]).
// A foto sobe DEPOIS de criar o login (o Storage só aceita gravação de quem
// está logado, na própria pasta fotos/<uid>/). `consentimento` registra o
// aceite do termo de uso/privacidade (LGPD): versão, data e quem aceitou.
export async function criarConta(email, senha, dados, fotoDataUrl = '') {
  const emailNorm = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, emailNorm, senha);
  let fotoUrl = dados.fotoUrl || '';
  if (fotoDataUrl) { try { fotoUrl = await salvarFotoPerfil(cred.user.uid, fotoDataUrl); } catch (e) { console.warn('foto da inscrição não subiu', e); } }
  const perfil = {
    notas: {},
    responsavelUid: null,
    responsavelDe: [],
    academiaGerenciadaId: null,
    ...dados,
    fotoUrl,
    papeis: ['aluno'],
    cordaoAtual: 'Iniciante',
    email: emailNorm,
    ativo: true,
    criadoEm: new Date().toISOString(),
  };
  await setDoc(doc(db, 'usuarios', cred.user.uid), perfil);
  return { uid: cred.user.uid, ...perfil };
}

// Registro do aceite do termo (LGPD) — também usado quando o termo muda de versão.
export const registroConsentimento = (aceitoPor, usoImagem) => ({
  versaoTermo: ESCOLA.versaoTermo, aceitoEm: new Date().toISOString(), aceitoPor: String(aceitoPor || '').slice(0, 120),
  usoImagem: String(usoImagem || ''), navegador: String(navigator.userAgent || '').slice(0, 160),
});

// Pedido ao servidor (só Admin): grava em comandos/ e espera a resposta.
export async function pedirAoServidor(tipo, dados = {}, esperaMs = 120000) {
  const uid = auth.currentUser && auth.currentUser.uid;
  const ref = await addDoc(collection(db, 'comandos'), { ...dados, tipo, porUid: uid, status: 'pendente', criadoEm: new Date().toISOString() });
  return new Promise((resolve, reject) => {
    const fim = setTimeout(() => { parar(); reject(new Error('O servidor demorou para responder. Confira as funções no GitHub (aba Actions).')); }, esperaMs);
    const parar = onSnapshot(ref, (s) => {
      const d = s.data() || {};
      if (['ok', 'erro', 'negado'].includes(d.status)) { clearTimeout(fim); parar(); if (d.status === 'ok') resolve(d.resultado || {}); else reject(new Error(d.erro || 'Não foi possível.')); }
    }, (e) => { clearTimeout(fim); reject(e); });
  });
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
export const listar = async (col) => {
  if (COLECOES_DA_ESCOLA.has(col)) {
    const q = await consultaDaEscola(col);
    return q ? (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  }
  return (await getDocs(collection(db, col))).docs.map((d) => ({ id: d.id, ...d.data() }));
};
// "Do aparelho primeiro": o que o Firestore já guardou da última visita, na hora
// (0 leituras, sem esperar a internet). A tela pinta com isso e troca pelo dado
// do servidor logo em seguida. Devolve [] quando ainda não há nada guardado.
export const listarDoCache = async (col, academiaId = null) => {
  try {
    const q = academiaId ? query(collection(db, col), where('academiaId', '==', academiaId)) : collection(db, col);
    return (await getDocsFromCache(q)).docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return []; }
};
// Consulta simples por igualdade (provável pelas regras quando o campo é o
// mesmo que a regra confere — ex.: instrutorUid == uid do instrutor logado).
export const listarOnde = async (col, campo, valor) =>
  (await getDocs(query(collection(db, col), where(campo, '==', valor)))).docs.map((d) => ({ id: d.id, ...d.data() }));
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
// Coleção de escola: documento novo (ou antigo sem escola) recebe a escola de quem grava.
export const salvar = async (col, id, dados) => setDoc(doc(db, col, id),
  COLECOES_DA_ESCOLA.has(col) && dados && dados.escolaId === undefined ? await comMinhaEscola(dados) : dados, { merge: true });
export const buscar = async (col, id) => {
  const s = await getDoc(doc(db, col, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
};
export const criar = async (col, dados) => addDoc(collection(db, col), COLECOES_DA_ESCOLA.has(col) ? await comMinhaEscola(dados) : dados);
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

// ===== Solicitações (mestre/professor → admin; e aluno → mestre/admin no
// caso de vínculo de parentesco) =====
export const criarSolicitacao = (dados) =>
  addDoc(collection(db, 'solicitacoes'), { ...dados, status: 'pendente', criadoEm: new Date().toISOString() });
// Sem orderBy nas consultas de solicitações: "where + orderBy em outro campo"
// exige um índice composto no Firestore, e sem ele a consulta inteira falha
// ("The query requires an index") — era isso que derrubava a aba de
// Solicitações de todo mestre/professor ("Não foi possível carregar..."). A
// ordenação por data é feita aqui no cliente (listas pequenas).
const ordenarPorCriadoEmDesc = (docs) => docs
  .map((d) => ({ id: d.id, ...d.data() }))
  .sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')));

export const minhasSolicitacoes = async (uid) =>
  ordenarPorCriadoEmDesc((await getDocs(query(collection(db, 'solicitacoes'), where('solicitanteUid', '==', uid)))).docs);

// Solicitações pendentes de um núcleo (usado pelo mestre/professor para
// aprovar vínculos de parentesco dos próprios alunos, sem precisar do admin).
export const solicitacoesPendentesDoNucleo = async (academiaId) =>
  ordenarPorCriadoEmDesc((await getDocs(query(collection(db, 'solicitacoes'),
    where('academiaId', '==', academiaId), where('status', '==', 'pendente')))).docs);

// Vínculo de parentesco entre dois cadastros de aluno já existentes (ex.: mãe
// e filho que treinam juntos) — um pede, o mestre/professor do núcleo (ou o
// admin) aprova, e os dois cadastros passam a poder trocar de perfil um para
// o outro na tela de login/perfil do app (campo responsavelDe, em mão dupla).
export const criarSolicitacaoVinculoFamilia = (dados) =>
  criarSolicitacao({ ...dados, tipo: 'vinculo_familia' });

export async function aprovarVinculoFamilia(alunoUid, alunoRelacionadoUid) {
  await Promise.all([
    updateDoc(doc(db, 'usuarios', alunoUid), { responsavelDe: arrayUnion(alunoRelacionadoUid) }),
    updateDoc(doc(db, 'usuarios', alunoRelacionadoUid), { responsavelDe: arrayUnion(alunoUid) }),
  ]);
}

// Transferências de aluno pendentes de aprovação do PRÓPRIO mestre/professor
// de destino (não quem pediu, e sim quem vai receber o aluno no núcleo dele)
// — o aluno só muda de fato de academia depois que o professor de destino
// aceita, mesmo que quem pediu a transferência já tenha sido o admin ou o
// professor de origem.
// Precisa da cláusula de leitura por dadosPedido.destinoId no firestore.rules
// (bloco solicitacoes): o professor de DESTINO não é o solicitante nem o
// gestor do núcleo de origem, então sem ela a consulta é negada.
export const transferenciasPendentesParaDestino = async (destinoId) =>
  ordenarPorCriadoEmDesc((await getDocs(query(collection(db, 'solicitacoes'),
    where('tipo', '==', 'transferencia'), where('dadosPedido.destinoId', '==', destinoId), where('status', '==', 'pendente')))).docs);

// ===== Avisos (notificações dentro do app) =====
export const publicarAviso = async (dados) =>
  addDoc(collection(db, 'avisos'), await comMinhaEscola({ ...dados, criadoEm: new Date().toISOString() }));
export const listarAvisos = async (tamanho = 20) => {
  const q = await consultaDaEscola('avisos', orderBy('criadoEm', 'desc'), limit(tamanho));
  return q ? (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })) : [];
};

// ===== Materiais gerais (visíveis a todo mundo logado) =====
export const publicarMaterial = async (dados) => addDoc(collection(db, 'materiais'), await comMinhaEscola({ ...dados, criadoEm: new Date().toISOString() }));
export const listarMateriais = () => listar('materiais');
export const removerMaterial = (id) => deleteDoc(doc(db, 'materiais', id));
export const excluirUsuarioPermanente = (id) => deleteDoc(doc(db, 'usuarios', id));

// ===== Materiais de Formação (curados pelo Admin: vídeos, conduta, ética,
// preparação de graduação) — visíveis ao admin, a mestre/professor e a
// instrutor; o app.html só exibe a aba pra quem já tem 'instrutor' ou mais
// nos papeis. =====
export const publicarMaterialFormacao = (dados) => addDoc(collection(db, 'materiaisFormacao'), { ...dados, criadoEm: new Date().toISOString() });
export const listarMateriaisFormacao = () => listar('materiaisFormacao');
export const removerMaterialFormacao = (id) => deleteDoc(doc(db, 'materiaisFormacao', id));

// ===== Financeiro manual (sem API de pagamento) =====
export const lancarPagamento = (dados) => addDoc(collection(db, 'pagamentos'), { ...dados, criadoEm: new Date().toISOString() });
export const pagamentosDoAluno = async (alunoId) =>
  (await getDocs(query(collection(db, 'pagamentos'), where('alunoId', '==', alunoId)))).docs.map((d) => ({ id: d.id, ...d.data() }));
export const listarPagamentosDoNucleo = async (academiaId) =>
  (await getDocs(query(collection(db, 'pagamentos'), where('academiaId', '==', academiaId)))).docs.map((d) => ({ id: d.id, ...d.data() }));
export const marcarPagamento = (id, pago) => updateDoc(doc(db, 'pagamentos', id), { pago, pagoEm: pago ? new Date().toISOString() : null });
export const removerPagamento = (id) => deleteDoc(doc(db, 'pagamentos', id));

// ===== Papel instrutor: quem avalia cada aluno (atribuído pelo admin ou
// pelo mestre/professor responsável, dentro do próprio núcleo) =====
export const atribuirInstrutorAoAluno = (alunoId, instrutorUid) =>
  updateDoc(doc(db, 'usuarios', alunoId), { instrutorUid: instrutorUid || null });

// ===== Fundador (Mestre Profeta) — acesso geral. É um campo travado no
// próprio documento (usuarios/{uid}.acessoGeral === true), só alterável
// pelo Admin Master, e a regra do Firestore impede que o próprio usuário
// ou um mestre/professor mude esse campo — não existe forma de
// "transferir" essa marca por fora do painel do Admin Master. =====
export const souFundador = (perfil) => !!(perfil && perfil.acessoGeral === true);

// ===== Estrela viva =====
// Reflete o nível mais alto de graduação entre os alunos ATIVOS vinculados
// HOJE a este núcleo (quem foi transferido para outro núcleo do grupo não
// conta mais aqui; quem chegou transferido de outro núcleo também não
// conta ainda, aparece com a tag "direto Prof. X" até evoluir de novo já
// sob o professor atual). Mapeamento: 1 Escravo · 2 Fugitivo · 3 Quilombola
// · 4 Vagante · 5 Liberto · 6 Instrutor · 7 Professor (completar as 7
// libera a avaliação de mestre para quem formou).
export const ORDEM_ESTRELA = ['Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor'];
export function calcularEstrelaViva(academiaGerenciadaId, todosUsuarios) {
  if (!academiaGerenciadaId) return 0;
  let maxIdx = -1;
  todosUsuarios.forEach((u) => {
    if (u.academiaId !== academiaGerenciadaId) return;
    if (u.statusAtual === 'Inativo') return;
    if (u.origemTransferenciaDireta) return;
    const idx = ORDEM_ESTRELA.indexOf(u.cordaoAtual);
    if (idx > maxIdx) maxIdx = idx;
  });
  return maxIdx + 1;
}

// Alunos que já pertenceram a este núcleo e foram transferidos para outro
// dentro do próprio grupo — mostrados como card cinza "transferido ou
// inativo" no roster de origem, sem contar pra estrela.
export const listarTransferidosDoNucleo = async (academiaGerenciadaId) => {
  const snap = await getDocs(query(collection(db, 'usuarios'), where('academiaAnteriorId', '==', academiaGerenciadaId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((u) => u.academiaId !== academiaGerenciadaId);
};

// Transferência de aluno para outro núcleo do grupo — grava a origem para
// a estrela e para o rótulo "direto Prof. X" no novo núcleo.
export async function transferirAlunoParaNucleo(alunoId, nucleoAntigoId, novoNucleoId, novoNucleoNome) {
  await updateDoc(doc(db, 'usuarios', alunoId), {
    academiaId: novoNucleoId,
    academiaNome: novoNucleoNome,
    academiaAnteriorId: nucleoAntigoId,
    origemTransferenciaDireta: true,
  });
}

// ===== Despesas administrativas do Admin Master + rateio proporcional =====
// capacidade = alunos ativos do núcleo × mensalidade do núcleo — quem tem
// mais estrutura paga uma fatia maior da despesa, nunca a mesma parcela
// de quem tem menos alunos ou mensalidade menor.
export function calcularRateio(despesaValor, responsaveis) {
  const totalCapacidade = responsaveis.reduce((s, r) => s + (r.capacidade || 0), 0);
  if (totalCapacidade <= 0) {
    const partesIguais = Number((despesaValor / (responsaveis.length || 1)).toFixed(2));
    return responsaveis.map((r) => ({ ...r, valor: partesIguais }));
  }
  return responsaveis.map((r) => ({ ...r, valor: Number(((r.capacidade / totalCapacidade) * despesaValor).toFixed(2)) }));
}

export async function lancarDespesaComRateio(dadosDespesa, responsaveis) {
  const despesaRef = await addDoc(collection(db, 'despesasAdministrativas'), { ...dadosDespesa, criadoEm: new Date().toISOString() });
  const rateio = calcularRateio(dadosDespesa.valor, responsaveis);
  await Promise.all(rateio.map((r) => addDoc(collection(db, 'rateios'), {
    despesaId: despesaRef.id,
    despesaTitulo: dadosDespesa.titulo,
    responsavelUid: r.uid,
    responsavelNome: r.nome,
    valor: r.valor,
    status: 'pendente',
    criadoEm: new Date().toISOString(),
  })));
  return despesaRef.id;
}
export const meusRateios = async (uid) =>
  ordenarPorCriadoEmDesc((await getDocs(query(collection(db, 'rateios'), where('responsavelUid', '==', uid)))).docs);
export const todosRateios = () => listar('rateios');
export const marcarRateioPago = (id, pago) => updateDoc(doc(db, 'rateios', id), { status: pago ? 'pago' : 'pendente' });

// ===== Presenças (check-in por proximidade) =====
export const presencasDoUsuario = async (uid, max = 200) => {
  const snap = await getDocs(query(collection(db, 'presencas'), where('uid', '==', uid), limit(max)));
  const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  itens.sort((a, b) => (b.entradaEm?.toMillis?.() || 0) - (a.entradaEm?.toMillis?.() || 0));
  return itens;
};

// Alunos de OUTROS núcleos que treinaram neste (check-in do próprio aluno
// pelo Face ID em visita) — a presença fica gravada no núcleo de origem dele
// (nucleoId) com nucleoVisitadoId apontando pra cá.
export const presencasVisitantesDoNucleo = async (nucleoId, max = 100) => {
  const snap = await getDocs(query(collection(db, 'presencas'), where('nucleoVisitadoId', '==', nucleoId), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.nucleoId !== nucleoId);
};

export const presencasDoNucleo = async (nucleoId, max = 300) => {
  const snap = await getDocs(query(collection(db, 'presencas'), where('nucleoId', '==', nucleoId), limit(max)));
  const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  itens.sort((a, b) => (b.entradaEm?.toMillis?.() || 0) - (a.entradaEm?.toMillis?.() || 0));
  return itens;
};
