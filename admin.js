/* admin.js — v4: painel único para Admin Master, Mestre/Professor e Instrutor.
Autenticado por Firebase Authentication (não mais sessionStorage/hash).
- Admin Master: vê e gerencia todos os usuários, cria/edita núcleos, aprova ou
rejeita solicitações, publica avisos/materiais/formação para todo mundo,
dispara redefinição de senha, lança despesas administrativas com rateio,
concede papel de instrutor e o campo de acesso geral do fundador.
- Mestre/professor: vê e avalia só os alunos do próprio núcleo
(academiaGerenciadaId), acompanha o financeiro do próprio núcleo e dos
instrutores em formação sob sua responsabilidade; não transfere aluno nem
edita mensalidade/evento direto — precisa abrir uma solicitação para o
admin aprovar.
- Instrutor: acesso restrito a avaliar os próprios alunos (instrutorUid) e
ao conteúdo de Formação; sem ferramentas financeiras próprias.
*/
import {
observarSessao, recuperarSenha, sair,
buscar, listar, listarPorAcademia, salvar, atualizar,
criarSolicitacao, minhasSolicitacoes, criarContaComoAdmin,
solicitacoesPendentesDoNucleo, aprovarVinculoFamilia, transferenciasPendentesParaDestino,
publicarAviso, listarAvisos,
comprimirImagemDataUrl, arquivoParaDataUrlComprimido,
calcularEstrelaViva, souFundador,
publicarMaterial, listarMateriais, removerMaterial,
publicarMaterialFormacao, listarMateriaisFormacao, removerMaterialFormacao,
lancarPagamento, listarPagamentosDoNucleo, marcarPagamento,
lancarDespesaComRateio, todosRateios, marcarRateioPago,
} from './firebase.js';
import { escapeHTML, sanitizeInput, debounce, gerarSlug } from './shared.js';

let sessaoAtual = null; // { uid, nome, email, papeis, academiaId, academiaGerenciadaId, ... }

const ehAdmin = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('admin');
const ehMestre = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('mestre');
const ehInstrutorLogado = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('instrutor');
const ehGestor = () => ehAdmin() || ehMestre();

/* ---------------------- TOASTS ---------------------- */
function garantirToastContainer() {
let c = document.getElementById('toastContainer');
if (!c) {
c = document.createElement('div');
c.id = 'toastContainer';
c.className = 'toast-container';
c.setAttribute('aria-live', 'polite');
document.body.appendChild(c);
}
return c;
}
function toast(mensagem, tipo = 'success', duracaoMs = 3500) {
const container = garantirToastContainer();
const el = document.createElement('div');
el.className = `toast ${tipo}`;
el.textContent = mensagem;
container.appendChild(el);
setTimeout(() => {
el.classList.add('leaving');
setTimeout(() => el.remove(), 320);
}, duracaoMs);
}

/* ===================== LOGIN / SESSÃO ===================== */
// login.html é a única porta de entrada do sistema agora — este painel não
// tem mais formulário de login próprio. Quem chega aqui sem sessão válida
// (ou logado mas sem papel de admin/mestre/instrutor) é mandado pra lá.
const appPainel = document.getElementById('appPainel');

function irParaLogin(motivo) {
window.location.href = motivo ? `login.html?erro=${motivo}` : 'login.html';
}

function temAcessoAoPainel(perfil) {
const p = (perfil && perfil.papeis) || [];
return p.includes('admin') || p.includes('mestre') || p.includes('instrutor');
}

observarSessao(async (user) => {
if (!user) { sessaoAtual = null; irParaLogin(); return; }
try {
const perfil = await buscar('usuarios', user.uid);
if (!perfil || !temAcessoAoPainel(perfil)) {
await sair();
irParaLogin('sem-acesso');
return;
}
sessaoAtual = { uid: user.uid, ...perfil };
await iniciarPainel();
} catch (e) {
console.error(e);
irParaLogin();
}
});

document.getElementById('btnLogout').addEventListener('click', async () => {
if (!confirm('Deseja realmente sair da conta?')) return;
await sair();
irParaLogin();
});

/* ===================== VISIBILIDADE POR PAPEL ===================== */
// data-papel="admin"     → só Admin Master
// data-papel="mestre"    → só mestre/professor (não-admin, não-instrutor-solo)
// data-papel="gestor"    → admin OU mestre/professor
// data-papel="instrutor" → só instrutor (sem mestre/admin)
// data-papel="formacao"  → admin, mestre/professor OU instrutor
// data-papel="all"       → todo mundo com acesso ao painel
function aplicarVisibilidadePapeis() {
const admin = ehAdmin();
const gestor = ehGestor();
const instrutorSolo = !gestor && ehInstrutorLogado();
document.querySelectorAll('[data-papel]').forEach((el) => {
const chave = el.getAttribute('data-papel');
let visivel = true;
if (chave === 'admin') visivel = admin;
else if (chave === 'mestre') visivel = gestor && !admin;
else if (chave === 'gestor') visivel = gestor;
else if (chave === 'instrutor') visivel = instrutorSolo || admin;
else if (chave === 'formacao') visivel = admin || gestor || ehInstrutorLogado();
el.style.display = visivel ? '' : 'none';
});
}

/* ===================== ESTADO GERAL ===================== */
let todosUsuarios = [];
let todosNucleos = [];
let usuarioSelecionado = null;
let nucleoEditandoID = null;
let statusToggleConfirm = false;
let chartsInstances = {};
let solicitacoesCache = []; // última leitura de solicitações visíveis a esta sessão (evita listar('solicitacoes') sem filtro, que um gestor não-admin não tem permissão de ler por inteiro)

async function iniciarPainel() {
const telaCarregando = document.getElementById('telaCarregando');
if (telaCarregando) telaCarregando.classList.add('oculto');
appPainel.classList.remove('oculto');

aplicarVisibilidadePapeis();

document.getElementById('faixaAdminMaster').classList.toggle('oculto', !ehAdmin());
document.getElementById('faixaFundador').classList.toggle('oculto', !souFundador(sessaoAtual));

document.getElementById('nomePerfilLogado').textContent = sessaoAtual.nome || sessaoAtual.email;

let nomeNucleoProprio = '';
if (!ehAdmin() && sessaoAtual.academiaGerenciadaId) {
const nuc = await buscar('nucleos', sessaoAtual.academiaGerenciadaId);
nomeNucleoProprio = nuc ? nuc.nome : sessaoAtual.academiaGerenciadaId;
}
const instrutorSolo = !ehGestor() && ehInstrutorLogado();
document.getElementById('tituloAbaAlunos').textContent = ehAdmin()
? 'Todos os Alunos'
: (instrutorSolo ? 'Meus Alunos (Instrutor)' : `Meus Alunos — ${nomeNucleoProprio}`);
document.getElementById('tituloAbaSolicitacoes').textContent = ehAdmin() ? 'Solicitações Recebidas' : 'Minhas Solicitações';

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
document.getElementById('nav-links').classList.toggle('show');
});

mostrarSkeletons();
await Promise.all([
carregarNucleos(),
carregarUsuarios(),
carregarSolicitacoes(),
carregarAvisos(),
carregarMateriais(),
carregarFormacao(),
carregarFinanceiro(),
carregarRateios(),
]);

atualizarEstrelaHeader();
}

function atualizarEstrelaHeader() {
const span = document.getElementById('estrelaHeaderAlunos');
if (!span) return;
if (ehAdmin() || !sessaoAtual.academiaGerenciadaId) { span.classList.add('oculto'); return; }
const n = calcularEstrelaViva(sessaoAtual.academiaGerenciadaId, todosUsuarios);
span.innerHTML = `<span style="color:var(--star-filled)">${'★'.repeat(n)}</span><span style="color:var(--star-empty)">${'★'.repeat(7 - n)}</span> ${n}/7`;
span.classList.remove('oculto');
}

function mostrarSkeletons(qtd = 6) {
const grid = document.getElementById('gridAlunos');
if (!grid) return;
let html = '';
for (let i = 0; i < qtd; i++) {
html += `
<div class="skeleton-card">
<div style="display:flex; gap:15px; align-items:center;">
<div class="skeleton-avatar"></div>
<div style="flex:1;">
<div class="skeleton-line w-60"></div>
<div class="skeleton-line w-40"></div>
</div>
</div>
<div class="skeleton-line w-80"></div>
</div>`;
}
grid.innerHTML = html;
}

window.mudarAba = function (abaId, evt) {
document.querySelectorAll('.aba-content, .nav-item').forEach((el) => el.classList.remove('active'));
document.getElementById(`aba-${abaId}`).classList.add('active');
if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
document.getElementById('nav-links').classList.remove('show');
};

window.irParaRelatorios = function (evt) {
window.mudarAba('alunos', evt);
setTimeout(() => { document.getElementById('secao-graficos').scrollIntoView({ behavior: 'smooth' }); }, 100);
};

/* ===================== NÚCLEOS ===================== */
async function carregarNucleos() {
try {
todosNucleos = await listar('nucleos');

// Select de filtro (sidebar, admin)
const filtro = document.getElementById('filtroAcademia');
if (filtro) {
filtro.innerHTML = '<option value="">Todos os Núcleos</option>' +
todosNucleos.map((n) => `<option value="${escapeHTML(n.id)}">${escapeHTML(n.nome)}</option>`).join('');
}
// Select de destino de transferência (mestre)
const destino = document.getElementById('solicTransferDestino');
if (destino) {
destino.innerHTML = '<option value="">Núcleo de destino...</option>' +
todosNucleos.filter((n) => n.ativo && n.id !== sessaoAtual.academiaGerenciadaId)
.map((n) => `<option value="${escapeHTML(n.id)}">${escapeHTML(n.nome)}</option>`).join('');
}
// Select de aviso por núcleo (admin)
const avisoAcademia = document.getElementById('avisoAcademia');
if (avisoAcademia) {
avisoAcademia.innerHTML = '<option value="">Todos os núcleos</option>' +
todosNucleos.map((n) => `<option value="${escapeHTML(n.id)}">${escapeHTML(n.nome)}</option>`).join('');
}

if (!ehAdmin()) return;

const lista = document.getElementById('listaNucleosPainel');
if (todosNucleos.length === 0) {
lista.innerHTML = '<div class="empty-state"><i class="fas fa-school"></i>Nenhum núcleo cadastrado ainda.</div>';
} else {
lista.innerHTML = todosNucleos.map((n, i) => {
const estrelas = calcularEstrelaViva(n.id, todosUsuarios);
return `
<div class="academia-card" style="--card-index:${i}">
<h4><i class="fas fa-map-marker-alt"></i> ${escapeHTML(n.nome)}</h4>
<p><strong>Mensalidade:</strong> ${n.mensalidadeValor ? `R$ ${Number(n.mensalidadeValor).toFixed(2)}` : 'Não informada'}</p>
<p><strong>Status:</strong> ${n.ativo ? 'Ativo' : 'Inativo'}</p>
<p class="estrela-viva" style="margin-left:0; color:var(--text-dark);"><strong>Estrela:</strong> <span style="color:var(--star-filled)">${'★'.repeat(estrelas)}</span><span style="color:var(--star-empty)">${'★'.repeat(7 - estrelas)}</span> (${estrelas}/7)</p>
<div class="academia-actions">
<button class="btn-edit-ac" onclick="abrirEditarNucleo('${n.id}')"><i class="fas fa-edit"></i> Editar</button>
</div>
</div>`;
}).join('');
}

// Select "responsável" do form de novo núcleo: qualquer usuário que ainda não administra núcleo próprio
const selResp = document.getElementById('responsavelNucleo');
if (selResp) {
const disponiveis = todosUsuarios.filter((u) => !u.academiaGerenciadaId);
selResp.innerHTML = '<option value="__novo__">— Cadastrar pessoa nova —</option>' +
disponiveis.map((u) => `<option value="${escapeHTML(u.id)}">${escapeHTML(u.nome)} (${escapeHTML(u.email)})</option>`).join('');
}
} catch (e) {
console.error(e);
toast('Não foi possível carregar os núcleos.', 'error');
}
}

const selResponsavelNucleo = document.getElementById('responsavelNucleo');
if (selResponsavelNucleo) {
selResponsavelNucleo.addEventListener('change', () => {
document.getElementById('camposNovoResponsavel').style.display = selResponsavelNucleo.value === '__novo__' ? 'grid' : 'none';
});
}

const formNovoNucleo = document.getElementById('formNovoNucleo');
if (formNovoNucleo) {
formNovoNucleo.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovoNucleo.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const nome = sanitizeInput(document.getElementById('nomeNucleo').value);
const mensalidadeValor = Number(document.getElementById('mensalidadeNucleo').value) || 0;
const slug = gerarSlug(nome);
const respSelecionado = document.getElementById('responsavelNucleo').value;

let professorUid;
if (respSelecionado === '__novo__') {
const nomeResp = sanitizeInput(document.getElementById('nomeNovoResponsavel').value);
const emailResp = sanitizeInput(document.getElementById('emailNovoResponsavel').value);
const senhaResp = document.getElementById('senhaNovoResponsavel').value;
if (!nomeResp || !emailResp || senhaResp.length < 6) {
toast('Preencha nome, e-mail e uma senha de ao menos 6 caracteres para a pessoa nova.', 'error');
return;
}
const novo = await criarContaComoAdmin(emailResp, senhaResp, {
nome: nomeResp,
papeis: ['aluno', 'mestre'],
academiaId: slug,
academiaNome: nome,
academiaGerenciadaId: slug,
idade: 0,
cordaoAtual: 'Professor',
statusAtual: 'Ativo',
fotoUrl: '',
});
professorUid = novo.uid;
} else {
professorUid = respSelecionado;
const respAtual = todosUsuarios.find((u) => u.id === professorUid);
const papeisNovos = Array.from(new Set([...(respAtual?.papeis || ['aluno']), 'mestre']));
await atualizar('usuarios', professorUid, { papeis: papeisNovos, academiaGerenciadaId: slug });
}

await salvar('nucleos', slug, { nome, mensalidadeValor, professorUid, ativo: true });
toast('Núcleo criado com sucesso!');
formNovoNucleo.reset();
document.getElementById('camposNovoResponsavel').style.display = 'grid';
await Promise.all([carregarNucleos(), carregarUsuarios()]);
} catch (err) {
console.error(err);
toast(err && err.code === 'auth/email-already-in-use' ? 'Este e-mail já tem cadastro.' : 'Erro ao criar núcleo.', 'error');
} finally {
btn.disabled = false;
}
});
}

window.abrirEditarNucleo = function (id) {
nucleoEditandoID = id;
const n = todosNucleos.find((x) => x.id === id);
if (!n) return;
document.getElementById('editNomeNucleo').value = n.nome || '';
document.getElementById('editMensalidadeNucleo').value = n.mensalidadeValor || '';
document.getElementById('editAtivoNucleo').value = n.ativo === false ? 'false' : 'true';
// Responsável: qualquer mestre/professor/instrutor (ou aluno) que ainda não
// administra OUTRO núcleo, mais quem já administra este (pré-selecionado).
const selResp = document.getElementById('editResponsavelNucleo');
if (selResp) {
const elegiveis = todosUsuarios.filter((u) => !u.academiaGerenciadaId || u.academiaGerenciadaId === n.id);
selResp.innerHTML = '<option value="">— Nenhum —</option>' +
elegiveis.map((u) => `<option value="${escapeHTML(u.id)}" ${u.id === n.professorUid ? 'selected' : ''}>${escapeHTML(u.nome)}${u.email ? ` (${escapeHTML(u.email)})` : ''}</option>`).join('');
}
document.getElementById('modalEditarNucleo').style.display = 'flex';
};
window.fecharModalNucleo = () => { document.getElementById('modalEditarNucleo').style.display = 'none'; };

const formEditNucleo = document.getElementById('formEditNucleo');
if (formEditNucleo) {
formEditNucleo.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formEditNucleo.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const nucleoAtual = todosNucleos.find((x) => x.id === nucleoEditandoID);
const responsavelAnteriorId = nucleoAtual ? (nucleoAtual.professorUid || null) : null;
const selResp = document.getElementById('editResponsavelNucleo');
const novoResponsavelId = selResp ? (selResp.value || null) : responsavelAnteriorId;

await atualizar('nucleos', nucleoEditandoID, {
nome: sanitizeInput(document.getElementById('editNomeNucleo').value),
mensalidadeValor: Number(document.getElementById('editMensalidadeNucleo').value) || 0,
ativo: document.getElementById('editAtivoNucleo').value === 'true',
professorUid: novoResponsavelId,
});

// Vínculo mudou: solta o responsável antigo (perde papel mestre + o núcleo
// gerenciado) e concede ao novo (mesmo princípio de "Papéis especiais") —
// a pessoa continua treinando normalmente como aluno, só ganha/perde o
// painel de gestão do núcleo.
if (novoResponsavelId !== responsavelAnteriorId) {
if (responsavelAnteriorId) {
const antigo = todosUsuarios.find((u) => u.id === responsavelAnteriorId);
if (antigo) {
await atualizar('usuarios', responsavelAnteriorId, {
papeis: (antigo.papeis || []).filter((p) => p !== 'mestre'),
academiaGerenciadaId: null,
});
}
}
if (novoResponsavelId) {
const novo = todosUsuarios.find((u) => u.id === novoResponsavelId);
await atualizar('usuarios', novoResponsavelId, {
papeis: Array.from(new Set([...(novo?.papeis || ['aluno']), 'mestre'])),
academiaGerenciadaId: nucleoEditandoID,
});
}
}

toast('Núcleo atualizado!');
window.fecharModalNucleo();
await Promise.all([carregarNucleos(), carregarUsuarios()]);
} catch (err) {
console.error(err);
toast('Erro ao editar núcleo.', 'error');
} finally {
btn.disabled = false;
}
});
}

/* ===================== USUÁRIOS / ALUNOS ===================== */
async function carregarUsuarios() {
try {
if (ehAdmin()) {
todosUsuarios = await listar('usuarios');
} else if (ehGestor()) {
const { itens } = await listarPorAcademia('usuarios', sessaoAtual.academiaGerenciadaId || '__none__', 300);
todosUsuarios = itens;
} else if (ehInstrutorLogado()) {
// Instrutor solo: só os alunos atribuídos a ele (instrutorUid), mais o próprio perfil.
const todos = await listar('usuarios');
todosUsuarios = todos.filter((u) => u.instrutorUid === sessaoAtual.uid || u.id === sessaoAtual.uid);
} else {
todosUsuarios = [];
}
aplicarFiltros();
} catch (e) {
console.error(e);
toast('Não foi possível carregar os alunos.', 'error');
const grid = document.getElementById('gridAlunos');
if (grid) grid.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>Erro ao carregar os dados. Tente recarregar a página.</div>';
}
}

const selectFiltroAcademia = document.getElementById('filtroAcademia');
if (selectFiltroAcademia) selectFiltroAcademia.addEventListener('change', () => { aplicarFiltros(); carregarFinanceiro(); });

const inputBusca = document.getElementById('buscaGeral');
if (inputBusca) inputBusca.addEventListener('input', debounce(aplicarFiltros, 200));

function aplicarFiltros() {
const alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno'));
const ac = ehAdmin() && selectFiltroAcademia ? selectFiltroAcademia.value : '';
const txt = inputBusca ? inputBusca.value.toLowerCase() : '';

const filtrados = alunos.filter((a) => (ac === '' || a.academiaId === ac) && (txt === '' || (a.nome || '').toLowerCase().includes(txt)));

renderizarGrid(filtrados);
desenharGraficos(filtrados);
renderizarCascata();
}

/* ===================== CASCATA DE FORMAÇÃO (Mestre → Instrutores → Alunos) ===================== */
function renderizarCascata() {
const wrap = document.getElementById('cascataContainer');
const aviso = document.getElementById('cascataAvisoSelecione');
if (!wrap) return;

let nucleoId = '';
let pessoasDoNucleo = [];
let mestreInfo = null;

if (ehAdmin()) {
nucleoId = selectFiltroAcademia ? selectFiltroAcademia.value : '';
if (!nucleoId) { wrap.innerHTML = ''; if (aviso) aviso.classList.remove('oculto'); return; }
if (aviso) aviso.classList.add('oculto');
pessoasDoNucleo = todosUsuarios.filter((u) => u.academiaId === nucleoId);
const nucleo = todosNucleos.find((n) => n.id === nucleoId);
mestreInfo = nucleo ? todosUsuarios.find((u) => u.id === nucleo.professorUid) : null;
} else if (ehGestor()) {
nucleoId = sessaoAtual.academiaGerenciadaId;
if (aviso) aviso.classList.add('oculto');
if (!nucleoId) { wrap.innerHTML = '<span class="cascata-vazio">Este cadastro ainda não administra um núcleo próprio.</span>'; return; }
pessoasDoNucleo = todosUsuarios.filter((u) => u.academiaId === nucleoId);
mestreInfo = { id: sessaoAtual.uid, nome: sessaoAtual.nome };
} else {
return;
}

const instrutores = pessoasDoNucleo.filter((u) => (u.papeis || []).includes('instrutor'));
const todosAlunosNucleo = pessoasDoNucleo.filter((u) => (u.papeis || []).includes('aluno'));
const instrutorIds = new Set(instrutores.map((i) => i.id));
const porInstrutor = instrutores.map((instr) => ({
instrutor: instr,
alunos: todosAlunosNucleo.filter((a) => a.instrutorUid === instr.id),
}));
const diretos = todosAlunosNucleo.filter((a) => !a.instrutorUid && !instrutorIds.has(a.id));

const chip = (a) => `<img class="cascata-aluno-chip" src="${escapeHTML(a.fotoUrl || 'https://via.placeholder.com/34')}" title="${escapeHTML(a.nome || 'Aluno')} (${escapeHTML(a.cordaoAtual || 'Iniciante')}) — ${calcularPorcentagemEvolucaoDe(a)}% de evolução" alt="${escapeHTML(a.nome || 'Aluno')}">`;

const ramos = [
...porInstrutor.map(({ instrutor, alunos }) => `
<div class="cascata-ramo">
<div class="cascata-instrutor-node">
<i class="fas fa-user-graduate"></i>
<strong>${escapeHTML(instrutor.nome || 'Instrutor')}</strong>
<span class="cascata-contagem">${alunos.length} aluno${alunos.length === 1 ? '' : 's'}</span>
</div>
<div class="cascata-alunos-lista">${alunos.length ? alunos.map(chip).join('') : '<span class="cascata-vazio">Sem alunos atribuídos</span>'}</div>
</div>`),
diretos.length ? `
<div class="cascata-ramo">
<div class="cascata-instrutor-node cascata-direto">
<i class="fas fa-user-shield"></i>
<strong>Diretos do Mestre</strong>
<span class="cascata-contagem">${diretos.length} aluno${diretos.length === 1 ? '' : 's'}</span>
</div>
<div class="cascata-alunos-lista">${diretos.map(chip).join('')}</div>
</div>` : '',
].filter(Boolean).join('');

wrap.innerHTML = `
<div class="cascata-mestre">
<i class="fas fa-crown"></i>
<strong>${escapeHTML(mestreInfo ? mestreInfo.nome : 'Mestre/Professor')}</strong>
</div>
<div class="cascata-ramos">${ramos || '<span class="cascata-vazio">Ainda não há instrutores ou alunos vinculados a este núcleo.</span>'}</div>
`;
}

function renderizarGrid(alunos) {
const grid = document.getElementById('gridAlunos');
if (!grid) return;

let optAc = '<option value="">Transferir para...</option>';
todosNucleos.filter((n) => n.ativo).forEach((n) => { optAc += `<option value="${escapeHTML(n.id)}">${escapeHTML(n.nome)}</option>`; });

if (alunos.length === 0) {
grid.innerHTML = '<div class="empty-state"><i class="fas fa-user-slash"></i>Nenhum aluno encontrado com os filtros atuais.</div>';
return;
}

grid.innerHTML = alunos.map((a, i) => {
const htmlTransferencia = ehAdmin()
? `<select class="select-encaminhar" onchange="transferirAluno('${a.id}', this.value)">${optAc}</select>`
: '';
const statusCor = a.statusAtual === 'Ativo' ? '#389E92' : '#E74C3C';
const ehMestreCard = (a.papeis || []).includes('mestre');
const ehInstrutorCard = (a.papeis || []).includes('instrutor');
const estrelaCount = ehMestreCard && a.academiaGerenciadaId ? calcularEstrelaViva(a.academiaGerenciadaId, todosUsuarios) : 0;
const estrelasHtml = estrelaCount > 0
? `<span class="estrela-viva" title="${estrelaCount}/7 estrelas"><span style="color:var(--star-filled)">${'★'.repeat(estrelaCount)}</span><span style="color:var(--star-empty)">${'★'.repeat(7 - estrelaCount)}</span></span>`
: '';
const badges = `${ehMestreCard ? '<span class="badge">Mestre</span>' : ''}${ehInstrutorCard ? '<span class="badge" style="background:#B9770E;">Instrutor</span>' : ''}`;
const tagTransferido = a.academiaAnteriorId && !ehAdmin() ? '' : '';

return `
<div class="aluno-card" style="--card-index:${i}${a.origemTransferenciaDireta ? '; opacity:0.85' : ''}">
<div class="card-top">
<img src="${escapeHTML(a.fotoUrl || 'https://via.placeholder.com/70')}" class="card-foto" alt="Foto de ${escapeHTML(a.nome || 'aluno')}" loading="lazy">
<div class="card-info">
<h3>${escapeHTML(a.nome || 'Sem nome')} ${badges}${estrelasHtml}</h3>
<p>Rank: <strong>${escapeHTML(a.cordaoAtual || 'Iniciante')}</strong></p>
<p>Idade: <strong>${escapeHTML(a.idade ?? '-')} anos</strong></p>
<p>Núcleo: <strong>${escapeHTML(a.academiaNome || a.academiaId || '-')}</strong>${a.origemTransferenciaDireta ? ' <span style="color:var(--text-muted);">(direto)</span>' : ''}</p>
<p>Status: <strong style="color:${statusCor}">${escapeHTML(a.statusAtual || 'Ativo')}</strong></p>
</div>
</div>
<div class="card-bottom" style="${!ehAdmin() ? 'justify-content: flex-end;' : ''}">
${htmlTransferencia}
<button class="btn-detalhes" onclick="abrirModal('${a.id}')">Avaliar / Editar</button>
</div>
</div>`;
}).join('');
}

window.transferirAluno = async function (idAluno, novoNucleoId) {
if (!novoNucleoId) return;
const nucleo = todosNucleos.find((n) => n.id === novoNucleoId);
if (!nucleo) return;
if (confirm(`Confirmar transferência para ${nucleo.nome}?`)) {
try {
const aluno = todosUsuarios.find((u) => u.id === idAluno);
await atualizar('usuarios', idAluno, {
academiaId: novoNucleoId,
academiaNome: nucleo.nome,
academiaAnteriorId: aluno ? aluno.academiaId : null,
origemTransferenciaDireta: true,
});
toast('Aluno transferido!');
await carregarUsuarios();
} catch (e) {
console.error(e);
toast('Erro ao transferir aluno.', 'error');
}
}
};

/* --- Modal de avaliação/edição (cordão + critérios), igual ao sistema
anterior, agora lendo/gravando em usuarios/{id}. Quando o usuário
selecionado é mestre/professor ou instrutor, a avaliação troca para os
critérios de desempenho de formador (canto, condução de eventos,
progressão de alunos formados, qualidade técnica, instrumental). --- */
const ordemCordoes = [
'Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante',
'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente',
];
// Cores atualizadas em 2026-09 — combinações "cor A e cor B" viram gradiente
// [A, B, A]; combinações de 3 cores seguem a ordem citada literalmente.
// "Bege" foi substituído por dourado em todo o código (não existe mais bege).
const cordoesAdulto = [
{ nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Escravo', cor: ['#4F4F4F', '#4F4F4F', '#4F4F4F'] },
{ nome: 'Fugitivo', cor: ['#4F4F4F', '#DAA520', '#4F4F4F'] }, { nome: 'Quilombola', cor: ['#DAA520', '#DAA520', '#DAA520'] },
{ nome: 'Vagante', cor: ['#4F4F4F', '#D32F2F', '#4F4F4F'] }, { nome: 'Liberto', cor: ['#D32F2F', '#D32F2F', '#D32F2F'] },
{ nome: 'Instrutor', cor: ['#4F4F4F', '#DAA520', '#D32F2F'] }, { nome: 'Professor', cor: ['#FFFFFF', '#D32F2F', '#FFFFFF'] },
{ nome: 'Mestre', cor: ['#F5F5F5', '#F5F5F5', '#F5F5F5'] },
// Rank mais alto, exclusivo do fundador do grupo (Mestre Profeta) — mostrado
// só como opção pra quem já tem acessoGeral (ver abrirModal). Cores da logo:
// branco, verde e azul.
{ nome: 'Mestre/Presidente', cor: ['#FFFFFF', '#00B140', '#002D72'] },
];
// Infantil (<12 anos) reaproveita os MESMOS nomes de graduação do adulto
// (Escravo/Fugitivo/Quilombola), só que em tons mais claros — o aluno segue
// pra escada adulta normalmente ao completar 12 anos.
const cordoesKids = [
{ nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Escravo', cor: ['#D3D3D3', '#D3D3D3', '#D3D3D3'] },
{ nome: 'Fugitivo', cor: ['#D3D3D3', '#EEDC82', '#D3D3D3'] }, { nome: 'Quilombola', cor: ['#EEDC82', '#EEDC82', '#EEDC82'] },
];
const criteriosRegras = [
{ id: 'c1', txt: 'Ginga e Base', reqAdulto: 0, reqKids: true }, { id: 'c2', txt: 'Acrobacias', reqAdulto: 3, reqKids: false },
{ id: 'c3', txt: 'Respeito', reqAdulto: 0, reqKids: true }, { id: 'c4', txt: 'Disciplina', reqAdulto: 0, reqKids: true },
{ id: 'c5', txt: 'Pontualidade', reqAdulto: 0, reqKids: true }, { id: 'c6', txt: 'Freq. Aulas', reqAdulto: 0, reqKids: true },
{ id: 'c7', txt: 'Freq. Rodas', reqAdulto: 0, reqKids: true }, { id: 'c8', txt: 'Eventos', reqAdulto: 0, reqKids: true },
{ id: 'c9', txt: 'Pandeiro', reqAdulto: 5, reqKids: false }, { id: 'c10', txt: 'Atabaque', reqAdulto: 5, reqKids: false },
{ id: 'c11', txt: 'Berimbau', reqAdulto: 5, reqKids: false }, { id: 'c12', txt: 'Canta/Responde', reqAdulto: 5, reqKids: false },
{ id: 'c13', txt: 'Higiene', reqAdulto: 0, reqKids: true }, { id: 'c14', txt: 'Aprendizado', reqAdulto: 0, reqKids: true },
{ id: 'c15', txt: 'Fundamentos', reqAdulto: 0, reqKids: true },
];
// Avaliação de formadores (mestre/professor/instrutor) — dimensões diferentes
// da graduação de aluno, conforme definido para o grupo.
const criteriosFormador = [
{ id: 'f1', txt: 'Canto' }, { id: 'f2', txt: 'Condução de Eventos' },
{ id: 'f3', txt: 'Progressão de Alunos Formados' }, { id: 'f4', txt: 'Qualidade Técnica' },
{ id: 'f5', txt: 'Instrumental' },
];

// Porcentagem de evolução de QUALQUER usuário (aluno, instrutor, mestre —
// todo mundo treina como aluno), fora do contexto do modal aberto. Usada no
// gráfico de pirâmide e no tooltip da Cascata de Formação.
function calcularPorcentagemEvolucaoDe(usuario) {
if (!usuario) return 0;
const idade = Number(usuario.idade) || 0;
const rank = usuario.cordaoAtual || 'Iniciante';
let idx = (idade < 12 ? cordoesKids : cordoesAdulto).findIndex((c) => c.nome === rank);
if (idx === -1) idx = 0;
const ativos = criteriosRegras.filter((crit) => (idade < 12 ? crit.reqKids : idx >= (crit.reqAdulto - 1)));
const maxPontos = ativos.length * 10;
if (maxPontos === 0) return 0;
let total = 0;
if (usuario.notas) ativos.forEach((c) => { if (usuario.notas[c.id] !== undefined) total += Number(usuario.notas[c.id]) || 0; });
const porc = (total / maxPontos) * 100;
return Math.floor(porc > 100 ? 100 : porc);
}

let notasAtuais = {};
let notasFormadorAtuais = {};
let criteriosAtivos = [];
let avaliandoFormador = false;

window.abrirModal = function (id) {
usuarioSelecionado = todosUsuarios.find((a) => a.id === id);
if (!usuarioSelecionado) return;
statusToggleConfirm = false;

const btnStatus = document.getElementById('btnExcluirModal');
const ativo = usuarioSelecionado.statusAtual !== 'Inativo';
btnStatus.innerHTML = ativo ? '<i class="fas fa-user-slash"></i> Desativar Aluno' : '<i class="fas fa-user-check"></i> Reativar Aluno';
btnStatus.classList.remove('confirm-danger');

document.getElementById('modFoto').src = usuarioSelecionado.fotoUrl || 'https://via.placeholder.com/90';
document.getElementById('modNomeTitulo').textContent = usuarioSelecionado.nome || 'Aluno';
document.getElementById('modAcademia').textContent = usuarioSelecionado.academiaNome || usuarioSelecionado.academiaId || '-';

document.getElementById('modNomeInput').value = usuarioSelecionado.nome || '';
document.getElementById('modIdadeInput').value = usuarioSelecionado.idade || '';
document.getElementById('modFotoInput').value = usuarioSelecionado.fotoUrl || '';
document.getElementById('modStatus').value = usuarioSelecionado.statusAtual || 'Ativo';

// Papéis especiais (admin)
const chkInstrutor = document.getElementById('modPapelInstrutor');
const chkFundador = document.getElementById('modAcessoGeral');
if (chkInstrutor) chkInstrutor.checked = (usuarioSelecionado.papeis || []).includes('instrutor');
if (chkFundador) chkFundador.checked = !!usuarioSelecionado.acessoGeral;
const selSupervisor = document.getElementById('modSupervisorInstrutor');
if (selSupervisor) {
const mestres = todosUsuarios.filter((u) => (u.papeis || []).includes('mestre'));
selSupervisor.innerHTML = mestres.length
? mestres.map((u) => `<option value="${escapeHTML(u.id)}" ${u.id === usuarioSelecionado.instrutorSupervisorUid ? 'selected' : ''}>${escapeHTML(u.nome)}</option>`).join('')
: '<option value="">Nenhum mestre cadastrado ainda</option>';
}
const selInstrutorDoAluno = document.getElementById('modInstrutorDoAluno');
if (selInstrutorDoAluno) {
const instrutoresDoNucleo = todosUsuarios.filter((u) => (u.papeis || []).includes('instrutor') && u.academiaId === usuarioSelecionado.academiaId);
selInstrutorDoAluno.innerHTML = '<option value="">Nenhum</option>' +
instrutoresDoNucleo.map((u) => `<option value="${escapeHTML(u.id)}" ${u.id === usuarioSelecionado.instrutorUid ? 'selected' : ''}>${escapeHTML(u.nome)}</option>`).join('');
}

// Avaliação: todo mundo (inclusive mestre/professor/instrutor) treina e é
// avaliado como aluno — a graduação/cordão SEMPRE aparece. Quem também tem
// papel de mestre/instrutor ganha, ADICIONALMENTE, o bloco de Avaliação de
// Formador logo abaixo (as duas seções juntas, nenhuma some a outra).
avaliandoFormador = (usuarioSelecionado.papeis || []).some((p) => p === 'mestre' || p === 'instrutor');
document.getElementById('cordaoContainerWrap').style.display = 'block';
document.getElementById('wrapModCordao').style.display = 'block';
document.getElementById('tituloCriteriosModal').textContent = 'Critérios de Evolução (0 a 10)';

const selCordao = document.getElementById('modCordao');
selCordao.innerHTML = '';
const idadeNumero = Number(usuarioSelecionado.idade) || 0;
const listaCordoesBase = idadeNumero < 12 ? cordoesKids : cordoesAdulto;
// "Mestre/Presidente" é o rank mais alto, exclusivo do fundador do grupo
// (acessoGeral) — some da lista de opções pra qualquer outra pessoa.
const listaCordoesLocal = usuarioSelecionado.acessoGeral
? listaCordoesBase
: listaCordoesBase.filter((c) => c.nome !== 'Mestre/Presidente');
listaCordoesLocal.forEach((c, index) => { selCordao.innerHTML += `<option value="${escapeHTML(c.nome)}" data-idx="${index}">${escapeHTML(c.nome)}</option>`; });
selCordao.value = usuarioSelecionado.cordaoAtual || 'Iniciante';
notasAtuais = { ...(usuarioSelecionado.notas || {}) };
gerarCriteriosUI(listaCordoesLocal, idadeNumero);
selCordao.onchange = () => gerarCriteriosUI(listaCordoesLocal, idadeNumero);

const wrapFormador = document.getElementById('wrapCriteriosFormador');
if (avaliandoFormador) {
wrapFormador.style.display = 'block';
notasFormadorAtuais = { ...(usuarioSelecionado.notasProfessor || {}) };
gerarCriteriosFormadorUI();
} else {
wrapFormador.style.display = 'none';
notasFormadorAtuais = {};
}

document.getElementById('modalAvaliacao').style.display = 'flex';
};

function gerarCriteriosFormadorUI() {
const grid = document.getElementById('gridCriteriosFormador');
grid.innerHTML = criteriosFormador.map((crit) => {
if (notasFormadorAtuais[crit.id] === undefined) notasFormadorAtuais[crit.id] = 0;
let htmlStars = '';
for (let i = 1; i <= 10; i++) htmlStars += `<i class="fas fa-star" data-val="${i}"></i>`;
return `<div class="crit-item"><span>${escapeHTML(crit.txt)}</span><div class="stars-row" data-id="${crit.id}">${htmlStars}</div></div>`;
}).join('');

grid.querySelectorAll('.stars-row').forEach((row) => {
const idCrit = row.getAttribute('data-id');
const stars = Array.from(row.querySelectorAll('i'));
stars.forEach((s, idx) => { if (idx < notasFormadorAtuais[idCrit]) s.classList.add('ativa'); });
stars.forEach((star, index) => {
star.addEventListener('mousedown', () => atualizarNotaFormador(idCrit, index + 1, stars));
star.addEventListener('touchstart', (e) => { e.preventDefault(); atualizarNotaFormador(idCrit, index + 1, stars); });
});
});
}
function atualizarNotaFormador(idCrit, valor, starsArray) {
notasFormadorAtuais[idCrit] = valor;
starsArray.forEach((s, i) => { if (i < valor) s.classList.add('ativa'); else s.classList.remove('ativa'); });
}

function gerarCriteriosUI(listaCordoesLocal, idadeNumero) {
const grid = document.getElementById('gridCriterios');
let idxCordaoAtual = listaCordoesLocal.findIndex((c) => c.nome === document.getElementById('modCordao').value);
if (idxCordaoAtual === -1) idxCordaoAtual = 0;
const proximoCordao = listaCordoesLocal[idxCordaoAtual + 1] || listaCordoesLocal[idxCordaoAtual];

document.getElementById('textoEvolucao').innerHTML = `Progresso para: <strong>${escapeHTML(proximoCordao.nome)}</strong>`;
const cssCordao = document.getElementById('cordaoTrancado');
cssCordao.style.setProperty('--c1', proximoCordao.cor[0]);
cssCordao.style.setProperty('--c2', proximoCordao.cor[1]);
cssCordao.style.setProperty('--c3', proximoCordao.cor[2]);

criteriosAtivos = criteriosRegras.filter((crit) => (idadeNumero < 12 ? crit.reqKids : idxCordaoAtual >= (crit.reqAdulto - 1)));

grid.innerHTML = criteriosAtivos.map((crit) => {
if (notasAtuais[crit.id] === undefined) notasAtuais[crit.id] = 0;
let htmlStars = '';
for (let i = 1; i <= 10; i++) htmlStars += `<i class="fas fa-star" data-val="${i}"></i>`;
return `<div class="crit-item"><span>${escapeHTML(crit.txt)}</span><div class="stars-row" data-id="${crit.id}">${htmlStars}</div></div>`;
}).join('');

grid.querySelectorAll('.stars-row').forEach((row) => {
const idCrit = row.getAttribute('data-id');
const stars = Array.from(row.querySelectorAll('i'));
stars.forEach((s, idx) => { if (idx < notasAtuais[idCrit]) s.classList.add('ativa'); });
stars.forEach((star, index) => {
star.addEventListener('mousedown', () => atualizarNota(idCrit, index + 1, stars));
star.addEventListener('touchstart', (e) => { e.preventDefault(); atualizarNota(idCrit, index + 1, stars); });
});
});
calcularPorcentagem();
}

function atualizarNota(idCrit, valor, starsArray) {
notasAtuais[idCrit] = valor;
starsArray.forEach((s, i) => { if (i < valor) s.classList.add('ativa'); else s.classList.remove('ativa'); });
calcularPorcentagem();
}

function calcularPorcentagem() {
let totalPontos = 0;
criteriosAtivos.forEach((c) => { if (notasAtuais[c.id]) totalPontos += Number(notasAtuais[c.id]); });
const maxPontos = criteriosAtivos.length * 10;
const porc = maxPontos > 0 ? (totalPontos / maxPontos) * 100 : 0;

document.getElementById('porcentagemEvolucao').textContent = `${Math.floor(porc > 100 ? 100 : porc)}%`;
const cssCordao = document.getElementById('cordaoTrancado');
cssCordao.style.width = `${porc > 100 ? 100 : porc}%`;
cssCordao.style.boxShadow = porc >= 70 ? '0 0 15px rgba(0, 230, 118, 0.8)' : 'none';
}

window.alternarStatusAlunoBtn = async function () {
const btn = document.getElementById('btnExcluirModal');
const desativando = usuarioSelecionado.statusAtual !== 'Inativo';
if (!statusToggleConfirm) {
btn.textContent = desativando ? 'Tem certeza? Desativar' : 'Tem certeza? Reativar';
btn.classList.add('confirm-danger');
statusToggleConfirm = true;
setTimeout(() => {
statusToggleConfirm = false;
btn.innerHTML = desativando ? '<i class="fas fa-user-slash"></i> Desativar Aluno' : '<i class="fas fa-user-check"></i> Reativar Aluno';
btn.classList.remove('confirm-danger');
}, 4000);
} else {
try {
const novoStatus = desativando ? 'Inativo' : 'Ativo';
await atualizar('usuarios', usuarioSelecionado.id, { statusAtual: novoStatus, ativo: !desativando });
toast(desativando ? 'Aluno desativado.' : 'Aluno reativado.');
window.fecharModal();
await carregarUsuarios();
} catch (e) {
console.error(e);
toast('Erro ao atualizar o status do aluno.', 'error');
}
}
};

window.resetarSenhaAluno = async function () {
if (!usuarioSelecionado || !usuarioSelecionado.email) return;
if (!confirm(`Enviar e-mail de redefinição de senha para ${usuarioSelecionado.email}?`)) return;
try {
await recuperarSenha(usuarioSelecionado.email);
toast('E-mail de redefinição enviado.');
} catch (e) {
console.error(e);
toast('Erro ao enviar redefinição de senha.', 'error');
}
};

// Upload de foto pela galeria no modal (admin/gestor editando qualquer perfil)
const btnModGaleria = document.getElementById('btnModGaleria');
const modInputGaleria = document.getElementById('modInputGaleria');
if (btnModGaleria && modInputGaleria) {
btnModGaleria.addEventListener('click', () => modInputGaleria.click());
modInputGaleria.addEventListener('change', async () => {
const arquivo = modInputGaleria.files && modInputGaleria.files[0];
if (!arquivo) return;
const status = document.getElementById('modFotoStatus');
try {
if (status) status.textContent = 'Ajustando o tamanho da foto...';
const comprimida = await arquivoParaDataUrlComprimido(arquivo, 540, 0.82);
document.getElementById('modFotoInput').value = comprimida;
document.getElementById('modFoto').src = comprimida;
if (status) status.textContent = 'Foto pronta (será salva ao Atualizar Prontuário).';
} catch (err) {
console.error(err);
toast('Não foi possível usar essa imagem.', 'error');
if (status) status.textContent = '';
} finally {
modInputGaleria.value = '';
}
});
}

window.salvarEdicaoAluno = async function () {
const btn = document.getElementById('btnSalvarModal');
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
btn.disabled = true;
try {
const novoNome = sanitizeInput(document.getElementById('modNomeInput').value);
const novaIdade = Number(document.getElementById('modIdadeInput').value);
const novaFoto = document.getElementById('modFotoInput').value;

if (!novoNome) { toast('O nome do aluno não pode ficar vazio.', 'error'); return; }
if (!Number.isFinite(novaIdade) || novaIdade < 0 || novaIdade > 120) { toast('Informe uma idade válida.', 'error'); return; }

const dadosAtualizados = {
nome: novoNome,
idade: novaIdade,
fotoUrl: novaFoto,
statusAtual: document.getElementById('modStatus').value,
};

// Graduação/fundamentos de aluno: sempre grava (todo mundo treina, mesmo
// quem também é mestre/professor/instrutor).
dadosAtualizados.cordaoAtual = document.getElementById('modCordao').value;
dadosAtualizados.notas = notasAtuais;
// Avaliação de formador: grava só pra quem tem o papel de mestre/instrutor
// (a seção só aparece nesse caso).
if (avaliandoFormador) {
dadosAtualizados.notasProfessor = notasFormadorAtuais;
}

if (ehGestor()) {
const selInstrutor = document.getElementById('modInstrutorDoAluno');
if (selInstrutor) dadosAtualizados.instrutorUid = selInstrutor.value || null;
}

if (ehAdmin()) {
const papeisAtuais = usuarioSelecionado.papeis || ['aluno'];
const querInstrutor = !!document.getElementById('modPapelInstrutor').checked;
let papeisNovos = papeisAtuais.filter((p) => p !== 'instrutor');
if (querInstrutor) papeisNovos.push('instrutor');
dadosAtualizados.papeis = papeisNovos;
dadosAtualizados.instrutorSupervisorUid = querInstrutor ? (document.getElementById('modSupervisorInstrutor').value || null) : null;
dadosAtualizados.acessoGeral = !!document.getElementById('modAcessoGeral').checked;
}

await atualizar('usuarios', usuarioSelecionado.id, dadosAtualizados);
toast('Prontuário atualizado com sucesso!');
window.fecharModal();
await carregarUsuarios();
} catch (e) {
console.error(e);
toast('Erro ao salvar alterações.', 'error');
} finally {
btn.innerHTML = '<i class="fas fa-save"></i> Atualizar Prontuário';
btn.disabled = false;
}
};

window.fecharModal = () => { document.getElementById('modalAvaliacao').style.display = 'none'; };

/* ===================== SOLICITAÇÕES ===================== */
window.abrirFormSolicitacao = function (tipo) {
document.querySelectorAll('.form-solicitacao').forEach((f) => { f.style.display = 'none'; });
const form = document.getElementById(`formSolic${tipo.charAt(0).toUpperCase()}${tipo.slice(1)}`);
if (form) form.style.display = 'grid';
if (tipo === 'transferencia') {
const selAluno = document.getElementById('solicTransferAluno');
const meusAlunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno'));
selAluno.innerHTML = '<option value="">Selecione o aluno...</option>' +
meusAlunos.map((a) => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.nome)}</option>`).join('');
}
};

async function enviarSolicitacao(tipo, dadosPedido) {
await criarSolicitacao({
tipo,
academiaId: sessaoAtual.academiaGerenciadaId,
solicitanteUid: sessaoAtual.uid,
solicitanteNome: sessaoAtual.nome,
dadosPedido,
});
toast('Solicitação enviada ao admin!');
document.querySelectorAll('.form-solicitacao').forEach((f) => { f.style.display = 'none'; f.reset(); });
await carregarSolicitacoes();
}

const formSolicMensalidade = document.getElementById('formSolicMensalidade');
if (formSolicMensalidade) {
formSolicMensalidade.addEventListener('submit', async (e) => {
e.preventDefault();
try {
await enviarSolicitacao('mensalidade', {
novoValor: Number(document.getElementById('solicMensalidadeValor').value) || 0,
justificativa: sanitizeInput(document.getElementById('solicMensalidadeJustificativa').value),
});
} catch (err) { console.error(err); toast('Erro ao enviar solicitação.', 'error'); }
});
}
const formSolicEvento = document.getElementById('formSolicEvento');
if (formSolicEvento) {
formSolicEvento.addEventListener('submit', async (e) => {
e.preventDefault();
try {
await enviarSolicitacao('evento', {
nome: sanitizeInput(document.getElementById('solicEventoNome').value),
data: document.getElementById('solicEventoData').value,
descricao: sanitizeInput(document.getElementById('solicEventoDescricao').value),
});
} catch (err) { console.error(err); toast('Erro ao enviar solicitação.', 'error'); }
});
}
const formSolicTransferencia = document.getElementById('formSolicTransferencia');
if (formSolicTransferencia) {
formSolicTransferencia.addEventListener('submit', async (e) => {
e.preventDefault();
try {
const alunoUid = document.getElementById('solicTransferAluno').value;
const destinoId = document.getElementById('solicTransferDestino').value;
const aluno = todosUsuarios.find((a) => a.id === alunoUid);
const destino = todosNucleos.find((n) => n.id === destinoId);
const origem = todosNucleos.find((n) => n.id === sessaoAtual.academiaGerenciadaId);
if (!aluno || !destino) { toast('Selecione o aluno e o núcleo de destino.', 'error'); return; }
await enviarSolicitacao('transferencia', {
alunoUid,
alunoNome: aluno.nome,
destinoId,
destinoNome: destino.nome,
academiaOrigemNome: origem ? origem.nome : '',
motivo: sanitizeInput(document.getElementById('solicTransferMotivo').value),
});
} catch (err) { console.error(err); toast('Erro ao enviar solicitação.', 'error'); }
});
}

function descreverSolicitacao(s) {
if (s.tipo === 'mensalidade') return `Alterar mensalidade para R$ ${Number(s.dadosPedido?.novoValor || 0).toFixed(2)}`;
if (s.tipo === 'evento') return `Criar evento "${s.dadosPedido?.nome || ''}" em ${s.dadosPedido?.data || '-'}`;
if (s.tipo === 'transferencia') return `Transferir ${s.dadosPedido?.alunoNome || ''} para ${s.dadosPedido?.destinoNome || ''}`;
if (s.tipo === 'vinculo_familia') return `Vínculo de parentesco com ${s.dadosPedido?.alunoRelacionadoNome || 'outro aluno'} (${s.dadosPedido?.grauParentesco || 'parentesco não informado'})`;
return s.tipo;
}

async function carregarSolicitacoes() {
try {
if (ehAdmin()) {
const todas = await listar('solicitacoes');
todas.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
solicitacoesCache = todas;
const pendentes = todas.filter((s) => s.status === 'pendente');
const historico = todas.filter((s) => s.status !== 'pendente');

const listaP = document.getElementById('listaSolicPendentes');
listaP.innerHTML = pendentes.length
? pendentes.map((s) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(s.solicitanteNome || 'Mestre/Professor')}</strong>
<span>${escapeHTML(descreverSolicitacao(s))}</span>
</div>
<div class="lista-item-actions">
<button class="btn-mini btn-mini-aprovar" onclick="aprovarSolicitacao('${s.id}')">Aprovar</button>
<button class="btn-mini btn-mini-rejeitar" onclick="rejeitarSolicitacao('${s.id}')">Rejeitar</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-inbox"></i>Nenhuma solicitação pendente.</div>';

const listaH = document.getElementById('listaSolicHistorico');
listaH.innerHTML = historico.length
? historico.slice(0, 30).map((s) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(s.solicitanteNome || 'Mestre/Professor')}</strong>
<span>${escapeHTML(descreverSolicitacao(s))}</span>
</div>
<span class="pill pill-${s.status}">${s.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}</span>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-clock-rotate-left"></i>Sem histórico ainda.</div>';
} else if (ehGestor()) {
const minhas = await minhasSolicitacoes(sessaoAtual.uid);
solicitacoesCache = minhas.slice();
const lista = document.getElementById('listaMinhasSolic');
lista.innerHTML = minhas.length
? minhas.map((s) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(descreverSolicitacao(s))}</strong>
<span>${new Date(s.criadoEm).toLocaleDateString('pt-BR')}</span>
</div>
<span class="pill pill-${s.status}">${s.status === 'pendente' ? 'Pendente' : (s.status === 'aprovado' ? 'Aprovado' : 'Rejeitado')}</span>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-inbox"></i>Você ainda não enviou nenhuma solicitação.</div>';

// Pedidos de vínculo de parentesco dos próprios alunos — o mestre/
// professor aprova direto, sem precisar passar pelo admin.
const listaFam = document.getElementById('listaSolicFamiliaPendentes');
if (listaFam && sessaoAtual.academiaGerenciadaId) {
const pendentesNucleo = (await solicitacoesPendentesDoNucleo(sessaoAtual.academiaGerenciadaId))
.filter((s) => s.tipo === 'vinculo_familia');
solicitacoesCache = solicitacoesCache.concat(pendentesNucleo.filter((s) => !solicitacoesCache.some((c) => c.id === s.id)));
listaFam.innerHTML = pendentesNucleo.length
? pendentesNucleo.map((s) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(s.solicitanteNome || 'Aluno')}</strong>
<span>${escapeHTML(descreverSolicitacao(s))}</span>
</div>
<div class="lista-item-actions">
<button class="btn-mini btn-mini-aprovar" onclick="aprovarSolicitacao('${s.id}')">Aprovar</button>
<button class="btn-mini btn-mini-rejeitar" onclick="rejeitarSolicitacao('${s.id}')">Rejeitar</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-user-group"></i>Nenhum pedido de vínculo de parentesco pendente.</div>';
} else if (listaFam) {
listaFam.innerHTML = '<div class="empty-state"><i class="fas fa-user-group"></i>Este cadastro ainda não administra um núcleo próprio.</div>';
}

// Transferências de aluno esperando o aceite do PRÓPRIO núcleo (alguém —
// admin ou o professor de origem — pediu pra mandar um aluno pra cá; só
// muda de fato depois que este professor aprova).
const listaTransfer = document.getElementById('listaTransferPendentes');
if (listaTransfer && sessaoAtual.academiaGerenciadaId) {
const transferPendentes = await transferenciasPendentesParaDestino(sessaoAtual.academiaGerenciadaId);
solicitacoesCache = solicitacoesCache.concat(transferPendentes.filter((s) => !solicitacoesCache.some((c) => c.id === s.id)));
listaTransfer.innerHTML = transferPendentes.length
? transferPendentes.map((s) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(s.dadosPedido?.alunoNome || 'Aluno')}</strong>
<span>Pedido por ${escapeHTML(s.solicitanteNome || 'alguém do grupo')} · vem de ${escapeHTML(s.dadosPedido?.academiaOrigemNome || 'outro núcleo')}</span>
</div>
<div class="lista-item-actions">
<button class="btn-mini btn-mini-aprovar" onclick="aprovarSolicitacao('${s.id}')">Aceitar aluno</button>
<button class="btn-mini btn-mini-rejeitar" onclick="rejeitarSolicitacao('${s.id}')">Recusar</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-right-left"></i>Nenhuma transferência aguardando seu aceite.</div>';
} else if (listaTransfer) {
listaTransfer.innerHTML = '<div class="empty-state"><i class="fas fa-right-left"></i>Este cadastro ainda não administra um núcleo próprio.</div>';
}
}
} catch (e) {
console.error(e);
toast('Não foi possível carregar as solicitações.', 'error');
}
}

window.aprovarSolicitacao = async function (id) {
try {
// Usa o que já foi carregado na tela (solicitacoesCache) em vez de listar('solicitacoes')
// sem filtro — um mestre/professor não-admin não tem permissão de ler a coleção inteira,
// só o que é dele ou do próprio núcleo, então essa leitura sem filtro falharia para ele.
const sol = solicitacoesCache.find((s) => s.id === id);
if (!sol) { toast('Solicitação não encontrada — recarregue a página e tente de novo.', 'error'); return; }
if (sol.tipo === 'mensalidade') {
await atualizar('nucleos', sol.academiaId, { mensalidadeValor: Number(sol.dadosPedido.novoValor) || 0 });
} else if (sol.tipo === 'evento') {
await salvar('eventos', `${sol.academiaId}-${Date.now()}`, {
nome: sol.dadosPedido.nome, data: sol.dadosPedido.data, descricao: sol.dadosPedido.descricao || '',
academiaId: sol.academiaId, criadoEm: new Date().toISOString(),
});
} else if (sol.tipo === 'transferencia') {
const alunoAtual = todosUsuarios.find((u) => u.id === sol.dadosPedido.alunoUid);
await atualizar('usuarios', sol.dadosPedido.alunoUid, {
academiaId: sol.dadosPedido.destinoId, academiaNome: sol.dadosPedido.destinoNome,
academiaAnteriorId: alunoAtual ? alunoAtual.academiaId : sol.academiaId,
origemTransferenciaDireta: true,
});
} else if (sol.tipo === 'vinculo_familia') {
await aprovarVinculoFamilia(sol.solicitanteUid, sol.dadosPedido.alunoRelacionadoUid);
}
await atualizar('solicitacoes', id, { status: 'aprovado' });
toast('Solicitação aprovada e aplicada!');
await Promise.all([carregarSolicitacoes(), carregarUsuarios(), carregarNucleos()]);
} catch (e) {
console.error(e);
toast('Erro ao aprovar solicitação.', 'error');
}
};

window.rejeitarSolicitacao = async function (id) {
if (!confirm('Rejeitar esta solicitação?')) return;
try {
await atualizar('solicitacoes', id, { status: 'rejeitado' });
toast('Solicitação rejeitada.');
await carregarSolicitacoes();
} catch (e) {
console.error(e);
toast('Erro ao rejeitar solicitação.', 'error');
}
};

/* ===================== AVISOS ===================== */
async function carregarAvisos() {
try {
const avisos = await listarAvisos(20);
const visiveis = ehAdmin() ? avisos : avisos.filter((a) => !a.academiaId || a.academiaId === sessaoAtual.academiaGerenciadaId);
const lista = document.getElementById('listaAvisos');
lista.innerHTML = visiveis.length
? visiveis.map((a) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(a.titulo)} <span class="pill pill-aprovado">${escapeHTML(a.tipo || 'geral')}</span></strong>
<span>${escapeHTML(a.texto)}</span>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-bell-slash"></i>Nenhum aviso publicado ainda.</div>';
} catch (e) {
console.error(e);
toast('Não foi possível carregar os avisos.', 'error');
}
}

const formNovoAviso = document.getElementById('formNovoAviso');
if (formNovoAviso) {
formNovoAviso.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovoAviso.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const academiaId = ehAdmin() ? (document.getElementById('avisoAcademia').value || null) : sessaoAtual.academiaGerenciadaId;
await publicarAviso({
titulo: sanitizeInput(document.getElementById('avisoTitulo').value),
texto: sanitizeInput(document.getElementById('avisoTexto').value),
tipo: document.getElementById('avisoTipo').value,
academiaId,
autorUid: sessaoAtual.uid,
autorNome: sessaoAtual.nome,
});
toast('Aviso publicado!');
formNovoAviso.reset();
await carregarAvisos();
} catch (err) {
console.error(err);
toast('Erro ao publicar aviso.', 'error');
} finally {
btn.disabled = false;
}
});
}

/* ===================== MATERIAIS (gerais) ===================== */
async function carregarMateriais() {
try {
const materiais = await listarMateriais();
materiais.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
const lista = document.getElementById('listaMateriais');
if (!lista) return;
lista.innerHTML = materiais.length
? materiais.map((m) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(m.titulo)} <span class="pill pill-aprovado">${escapeHTML(m.tipo || 'link')}</span></strong>
<span>${escapeHTML(m.descricao || '')}</span>
<a href="${escapeHTML(m.url)}" target="_blank" rel="noopener" style="font-size:0.85rem; color:var(--primary-teal); font-weight:700;">Abrir material <i class="fas fa-arrow-up-right-from-square"></i></a>
</div>
<div class="lista-item-actions" data-papel="admin">
<button class="btn-mini btn-mini-rejeitar" onclick="removerMaterialUI('${m.id}')">Remover</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-folder-open"></i>Nenhum material publicado ainda.</div>';
aplicarVisibilidadePapeis();
} catch (e) {
console.error(e);
toast('Não foi possível carregar os materiais.', 'error');
}
}

window.removerMaterialUI = async function (id) {
if (!confirm('Remover este material?')) return;
try { await removerMaterial(id); toast('Material removido.'); await carregarMateriais(); }
catch (e) { console.error(e); toast('Erro ao remover material.', 'error'); }
};

const formNovoMaterial = document.getElementById('formNovoMaterial');
if (formNovoMaterial) {
formNovoMaterial.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovoMaterial.querySelector('button[type="submit"]');
btn.disabled = true;
try {
await publicarMaterial({
titulo: sanitizeInput(document.getElementById('materialTitulo').value),
descricao: sanitizeInput(document.getElementById('materialDescricao').value),
url: document.getElementById('materialUrl').value.trim(),
tipo: document.getElementById('materialTipo').value,
autorUid: sessaoAtual.uid,
});
toast('Material publicado!');
formNovoMaterial.reset();
await carregarMateriais();
} catch (err) { console.error(err); toast('Erro ao publicar material.', 'error'); }
finally { btn.disabled = false; }
});
}

/* ===================== FORMAÇÃO ===================== */
async function carregarFormacao() {
try {
const conteudos = await listarMateriaisFormacao();
conteudos.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
const lista = document.getElementById('listaFormacao');
if (!lista) return;
const rotulos = { video: 'Vídeo', conduta: 'Conduta', etica: 'Ética', graduacao: 'Preparação de Graduação' };
lista.innerHTML = conteudos.length
? conteudos.map((m) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(m.titulo)} <span class="pill pill-pendente">${escapeHTML(rotulos[m.categoria] || m.categoria || 'geral')}</span></strong>
<span>${escapeHTML(m.descricao || '')}</span>
<a href="${escapeHTML(m.url)}" target="_blank" rel="noopener" style="font-size:0.85rem; color:var(--primary-teal); font-weight:700;">Abrir conteúdo <i class="fas fa-arrow-up-right-from-square"></i></a>
</div>
<div class="lista-item-actions" data-papel="admin">
<button class="btn-mini btn-mini-rejeitar" onclick="removerFormacaoUI('${m.id}')">Remover</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-graduation-cap"></i>Nenhum conteúdo de formação publicado ainda.</div>';
aplicarVisibilidadePapeis();
} catch (e) {
console.error(e);
// Instrutor/gestor sem nenhum conteúdo ainda não é erro grave — só loga.
console.warn('Formação indisponível ou vazia.', e);
}
}

window.removerFormacaoUI = async function (id) {
if (!confirm('Remover este conteúdo de formação?')) return;
try { await removerMaterialFormacao(id); toast('Conteúdo removido.'); await carregarFormacao(); }
catch (e) { console.error(e); toast('Erro ao remover conteúdo.', 'error'); }
};

const formNovaFormacao = document.getElementById('formNovaFormacao');
if (formNovaFormacao) {
formNovaFormacao.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovaFormacao.querySelector('button[type="submit"]');
btn.disabled = true;
try {
await publicarMaterialFormacao({
titulo: sanitizeInput(document.getElementById('formacaoTitulo').value),
categoria: document.getElementById('formacaoCategoria').value,
url: document.getElementById('formacaoUrl').value.trim(),
descricao: sanitizeInput(document.getElementById('formacaoDescricao').value),
autorUid: sessaoAtual.uid,
});
toast('Conteúdo de formação publicado!');
formNovaFormacao.reset();
await carregarFormacao();
} catch (err) { console.error(err); toast('Erro ao publicar conteúdo.', 'error'); }
finally { btn.disabled = false; }
});
}

/* ===================== FINANCEIRO (manual) ===================== */
async function carregarFinanceiro() {
const bloqueado = document.getElementById('financeiroBloqueado');
const conteudo = document.getElementById('financeiroConteudo');
if (!bloqueado || !conteudo) return;

const nucleoAlvo = ehAdmin() ? (document.getElementById('filtroAcademia')?.value || null) : sessaoAtual.academiaGerenciadaId;

if (!ehAdmin() && !sessaoAtual.academiaGerenciadaId) {
bloqueado.classList.remove('oculto');
conteudo.classList.add('oculto');
return;
}
bloqueado.classList.add('oculto');
conteudo.classList.remove('oculto');

const selAluno = document.getElementById('pagamentoAluno');
if (selAluno) {
const alunosAlvo = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && (!nucleoAlvo || u.academiaId === nucleoAlvo));
selAluno.innerHTML = '<option value="">Selecione o aluno...</option>' + alunosAlvo.map((a) => `<option value="${escapeHTML(a.id)}">${escapeHTML(a.nome)}</option>`).join('');
}

try {
const pagamentos = nucleoAlvo ? await listarPagamentosDoNucleo(nucleoAlvo) : await listar('pagamentos');
pagamentos.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
let totalPago = 0; let totalPendente = 0; let emDia = 0;
pagamentos.forEach((p) => { if (p.pago) { totalPago += Number(p.valor) || 0; emDia++; } else { totalPendente += Number(p.valor) || 0; } });
document.getElementById('finTotalPago').textContent = 'R$ ' + totalPago.toFixed(2);
document.getElementById('finTotalPendente').textContent = 'R$ ' + totalPendente.toFixed(2);
document.getElementById('finAlunosDia').textContent = String(emDia);

const lista = document.getElementById('listaPagamentos');
lista.innerHTML = pagamentos.length
? pagamentos.slice(0, 60).map((p) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(p.alunoNome || 'Aluno')} <span class="pill ${p.pago ? 'pill-aprovado' : 'pill-pendente'}">${p.pago ? 'Pago' : 'Pendente'}</span></strong>
<span>${escapeHTML(p.competencia || '')} · R$ ${Number(p.valor || 0).toFixed(2)}</span>
</div>
<div class="lista-item-actions">
<button class="btn-mini ${p.pago ? 'btn-mini-rejeitar' : 'btn-mini-aprovar'}" onclick="alternarPagamentoUI('${p.id}', ${!p.pago})">${p.pago ? 'Marcar não pago' : 'Marcar pago'}</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-sack-dollar"></i>Nenhum pagamento lançado ainda.</div>';
} catch (e) {
console.error(e);
console.warn('Financeiro indisponível ou vazio.', e);
}
}

window.alternarPagamentoUI = async function (id, pago) {
try { await marcarPagamento(id, pago); toast(pago ? 'Marcado como pago!' : 'Marcado como pendente.'); await carregarFinanceiro(); }
catch (e) { console.error(e); toast('Erro ao atualizar pagamento.', 'error'); }
};

const formNovoPagamento = document.getElementById('formNovoPagamento');
if (formNovoPagamento) {
formNovoPagamento.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovoPagamento.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const alunoId = document.getElementById('pagamentoAluno').value;
const aluno = todosUsuarios.find((u) => u.id === alunoId);
if (!aluno) { toast('Selecione um aluno.', 'error'); return; }
await lancarPagamento({
alunoId,
alunoNome: aluno.nome,
academiaId: aluno.academiaId,
competencia: document.getElementById('pagamentoCompetencia').value,
valor: Number(document.getElementById('pagamentoValor').value) || 0,
pago: false,
});
toast('Mensalidade lançada!');
formNovoPagamento.reset();
await carregarFinanceiro();
} catch (err) { console.error(err); toast('Erro ao lançar mensalidade.', 'error'); }
finally { btn.disabled = false; }
});
}

/* ===================== DESPESAS ADMINISTRATIVAS / RATEIO ===================== */
async function carregarRateios() {
if (!ehAdmin()) return;
try {
const rateios = await todosRateios();
rateios.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
const lista = document.getElementById('listaRateios');
if (!lista) return;
lista.innerHTML = rateios.length
? rateios.slice(0, 60).map((r) => `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(r.despesaTitulo || 'Despesa')} — ${escapeHTML(r.responsavelNome || '')} <span class="pill ${r.status === 'pago' ? 'pill-aprovado' : 'pill-pendente'}">${r.status === 'pago' ? 'Pago' : 'Pendente'}</span></strong>
<span>Parcela: R$ ${Number(r.valor || 0).toFixed(2)}</span>
</div>
<div class="lista-item-actions">
<button class="btn-mini ${r.status === 'pago' ? 'btn-mini-rejeitar' : 'btn-mini-aprovar'}" onclick="alternarRateioUI('${r.id}', ${r.status !== 'pago'})">${r.status === 'pago' ? 'Marcar pendente' : 'Marcar pago'}</button>
</div>
</div>`).join('')
: '<div class="empty-state"><i class="fas fa-scale-balanced"></i>Nenhuma despesa lançada ainda.</div>';
} catch (e) {
console.error(e);
console.warn('Rateios indisponíveis ou vazios.', e);
}
}

window.alternarRateioUI = async function (id, pago) {
try { await marcarRateioPago(id, pago); toast('Status do rateio atualizado.'); await carregarRateios(); }
catch (e) { console.error(e); toast('Erro ao atualizar rateio.', 'error'); }
};

const formNovaDespesa = document.getElementById('formNovaDespesa');
if (formNovaDespesa) {
formNovaDespesa.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovaDespesa.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const titulo = sanitizeInput(document.getElementById('despesaTitulo').value);
const categoria = document.getElementById('despesaCategoria').value;
const valor = Number(document.getElementById('despesaValor').value) || 0;

const responsaveis = [];
for (const n of todosNucleos) {
const responsavel = todosUsuarios.find((u) => u.id === n.professorUid);
if (!responsavel) continue;
const qtdAlunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && u.academiaId === n.id && u.statusAtual !== 'Inativo').length;
const capacidade = qtdAlunos * (Number(n.mensalidadeValor) || 0);
responsaveis.push({ uid: responsavel.id, nome: responsavel.nome, capacidade });
}
if (!responsaveis.length) { toast('Nenhum núcleo com responsável cadastrado para ratear.', 'error'); return; }

await lancarDespesaComRateio({ titulo, categoria, valor }, responsaveis);
toast('Despesa lançada e rateada entre os responsáveis!');
formNovaDespesa.reset();
await carregarRateios();
} catch (err) { console.error(err); toast('Erro ao lançar despesa.', 'error'); }
finally { btn.disabled = false; }
});
}

/* ===================== GRÁFICOS ===================== */
function obterCorPorCordao(nome) {
const mapa = {
Iniciante: '#CCCCCC',
Escravo: '#4F4F4F', Fugitivo: '#DAA520', Quilombola: '#DAA520', Vagante: '#D32F2F',
Liberto: '#D32F2F', Instrutor: '#DAA520', Professor: '#D32F2F', Mestre: '#F5F5F5',
'Mestre/Presidente': '#00B140',
};
return mapa[nome] || '#389E92';
}

function desenharGraficos(alunosAtuais) {
let aptos = 0; let desenv = 0; const rankCount = {}; const academiaCount = {}; let ativos = 0; let inativos = 0; let kids = 0; let adultos = 0;
const fundamentosSoma = {}; const fundamentosQtd = {};
criteriosRegras.forEach((c) => { fundamentosSoma[c.txt] = 0; fundamentosQtd[c.txt] = 0; });

alunosAtuais.forEach((a) => {
const idadeAluno = Number(a.idade) || 0;
if (idadeAluno < 12) kids++; else adultos++;
if (a.statusAtual === 'Ativo') ativos++; else inativos++;
const local = a.academiaNome || a.academiaId || 'Não informado'; academiaCount[local] = (academiaCount[local] || 0) + 1;
const rank = a.cordaoAtual || 'Iniciante'; rankCount[rank] = (rankCount[rank] || 0) + 1;

let idxCordao = cordoesAdulto.findIndex((c) => c.nome === rank);
if (idadeAluno < 12) idxCordao = cordoesKids.findIndex((c) => c.nome === rank);
if (idxCordao === -1) idxCordao = 0;

const critAtivosAluno = criteriosRegras.filter((crit) => (idadeAluno < 12 ? crit.reqKids : idxCordao >= (crit.reqAdulto - 1)));
const maxPontos = critAtivosAluno.length * 10;
let totalPontosAluno = 0;

if (a.notas) {
critAtivosAluno.forEach((c) => {
if (a.notas[c.id] !== undefined) {
const notaVal = Number(a.notas[c.id]);
totalPontosAluno += notaVal;
fundamentosSoma[c.txt] += notaVal;
fundamentosQtd[c.txt] += 1;
}
});
const porc = maxPontos > 0 ? (totalPontosAluno / maxPontos) * 100 : 0;
if (maxPontos > 0 && porc >= 70) aptos++; else desenv++;
} else { desenv++; }
});

const labelFundamentos = []; const dataFundamentos = [];
Object.keys(fundamentosSoma).forEach((crit) => {
if (fundamentosQtd[crit] > 0) { labelFundamentos.push(crit); dataFundamentos.push((fundamentosSoma[crit] / fundamentosQtd[crit]).toFixed(1)); }
});

const colorTeal = '#389E92'; const colorBlue = '#002D72'; const colorGreen = '#00E676'; const colorRed = '#E74C3C'; const colorYellow = '#F5B041';

criarGrafico('chartTermometro', 'pie', ['Aptos (Candidatos Formatura)', 'Em Desenvolvimento'], [aptos, desenv], [colorGreen, colorYellow]);
criarGrafico('chartStatus', 'doughnut', ['Ativos', 'Inativos/Pausa'], [ativos, inativos], [colorTeal, colorRed]);

const piramideLabels = []; const piramideData = []; const piramideColors = [];
ordemCordoes.forEach((nomeCordao) => {
if (rankCount[nomeCordao] !== undefined) {
piramideLabels.push(nomeCordao);
piramideData.push(rankCount[nomeCordao]);
piramideColors.push(obterCorPorCordao(nomeCordao));
}
});

criarGrafico('chartPiramide', 'bar', piramideLabels, piramideData, piramideColors, true);
criarGrafico('chartFundamentos', 'bar', labelFundamentos, dataFundamentos, colorTeal, true);

if (ehAdmin()) {
const boxAcademias = document.getElementById('chartAcademias')?.closest('.chart-box');
if (Object.keys(academiaCount).length > 1) {
criarGrafico('chartAcademias', 'doughnut', Object.keys(academiaCount), Object.values(academiaCount), [colorTeal, colorBlue, colorGreen, colorYellow, '#8E44AD']);
if (boxAcademias) boxAcademias.style.display = 'flex';
} else if (boxAcademias) {
boxAcademias.style.display = 'none';
}
}

criarGrafico('chartIdades', 'pie', ['Kids (Sub-12)', 'Adultos'], [kids, adultos], [colorGreen, colorBlue]);
}

function criarGrafico(canvasId, type, labels, data, colors, hideLegend = false) {
const canvas = document.getElementById(canvasId);
if (!canvas) return;
const ctx = canvas.getContext('2d');

if (chartsInstances[canvasId]) {
chartsInstances[canvasId].destroy();
delete chartsInstances[canvasId];
}

chartsInstances[canvasId] = new Chart(ctx, {
type,
data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 1 }] },
options: {
responsive: true,
maintainAspectRatio: false,
animation: { duration: 650, easing: 'easeOutQuart' },
plugins: { legend: { display: !hideLegend } },
},
});
}

window.addEventListener('beforeunload', () => {
Object.values(chartsInstances).forEach((c) => { try { c.destroy(); } catch (_) { /* noop */ } });
chartsInstances = {};
});
