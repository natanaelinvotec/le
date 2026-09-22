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
  deleteDoc, query, where, orderBy, limit, startAfter, arrayUnion,
  getCountFromServer, initializeFirestore, persistentLocalCache,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadString, getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBkwCDziIv-Uh7MLzsy9OYJmA_LMnn7jbg',
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
export const publicarAviso = (dados) =>
  addDoc(collection(db, 'avisos'), { ...dados, criadoEm: new Date().toISOString() });
export const listarAvisos = async (tamanho = 20) =>
  (await getDocs(query(collection(db, 'avisos'), orderBy('criadoEm', 'desc'), limit(tamanho)))).docs.map((d) => ({ id: d.id, ...d.data() }));

// ===== Materiais gerais (visíveis a todo mundo logado) =====
export const publicarMaterial = (dados) => addDoc(collection(db, 'materiais'), { ...dados, criadoEm: new Date().toISOString() });
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

export const presencasDoNucleo = async (nucleoId, max = 300) => {
  const snap = await getDocs(query(collection(db, 'presencas'), where('nucleoId', '==', nucleoId), limit(max)));
  const itens = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  itens.sort((a, b) => (b.entradaEm?.toMillis?.() || 0) - (a.entradaEm?.toMillis?.() || 0));
  return itens;
};
