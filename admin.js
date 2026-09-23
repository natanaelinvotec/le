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
buscar, listar, listarOnde, listarPorAcademia, salvar, atualizar, remover, criar,
criarSolicitacao, minhasSolicitacoes, criarContaComoAdmin,
solicitacoesPendentesDoNucleo, aprovarVinculoFamilia, transferenciasPendentesParaDestino,
publicarAviso, listarAvisos,
comprimirImagemDataUrl, arquivoParaDataUrlComprimido,
calcularEstrelaViva, souFundador, ORDEM_ESTRELA,
publicarMaterial, listarMateriais, removerMaterial, excluirUsuarioPermanente,
publicarMaterialFormacao, listarMateriaisFormacao, removerMaterialFormacao,
lancarPagamento, listarPagamentosDoNucleo, marcarPagamento,
lancarDespesaComRateio, todosRateios, marcarRateioPago,
  presencasDoNucleo, presencasVisitantesDoNucleo,
} from './firebase.js';
import { escapeHTML, sanitizeInput, debounce, gerarSlug } from './shared.js';
import { configurarFaceId, atualizarContextoFaceId, pararFaceId } from './faceid.js';

let sessaoAtual = null; // { uid, nome, email, papeis, academiaId, academiaGerenciadaId, ... }

const ehAdmin = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('admin');
const ehMestre = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('mestre');
const ehInstrutorLogado = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('instrutor');
const ehGestor = () => ehAdmin() || ehMestre();

/* ---------------------- CASCATA DE FORMAÇÃO ---------------------- */
// Quem formou esta pessoa: se já tiver formadorUid gravado, mantém (a posição na
// cascata é permanente mesmo que a pessoa troque de núcleo depois). Senão,
// deriva do professorUid do núcleo onde ela treinava (academiaId) no momento
// da promoção.
function obterFormadorUid(pessoa, listaNucleos) {
if (!pessoa) return null;
if (pessoa.formadorUid) return pessoa.formadorUid;
if (pessoa.instrutorUid && pessoa.instrutorUid !== pessoa.id) return pessoa.instrutorUid;
if (pessoa.instrutorSupervisorUid && pessoa.instrutorSupervisorUid !== pessoa.id) return pessoa.instrutorSupervisorUid;
const nucleoOrigem = (listaNucleos || []).find((n) => n.id === pessoa.academiaId);
if (nucleoOrigem && nucleoOrigem.professorUid && nucleoOrigem.professorUid !== pessoa.id) {
return nucleoOrigem.professorUid;
}
return null;
}

/* ---------------------- CASCATA DE FORMACAO (niveis agregados) ---------------------- */
// Em vez de uma arvore pessoa-por-pessoa (que nao escala em nucleos com 80+ alunos),
// a cascata agrupa por nivel: cartao individual so pro mestre/professor que administra
// um nucleo; instrutor e aluno aparecem como cartoes agregados (contagem), calculados
// ao vivo a partir de quem formou quem (formadorUid / instrutorUid / instrutorSupervisorUid
// / nucleo.professorUid). O fundador ve o grupo inteiro a partir dele; cada mestre ve
// a propria ramificacao pra baixo, do jeito que foi promovido.

function obterFilhosDiretosFormacao(uid, listaUsuarios, listaNucleos) {
  return listaUsuarios.filter((u) => u.id !== uid && obterFormadorUid(u, listaNucleos) === uid);
}

function coletarDescendentesFormacao(uid, listaUsuarios, listaNucleos, visitados) {
  visitados = visitados || new Set();
  const resultado = [];
  const filhos = obterFilhosDiretosFormacao(uid, listaUsuarios, listaNucleos);
  filhos.forEach((f) => {
    if (visitados.has(f.id)) return;
    visitados.add(f.id);
    resultado.push(f);
    resultado.push.apply(resultado, coletarDescendentesFormacao(f.id, listaUsuarios, listaNucleos, visitados));
  });
  return resultado;
}

function contarTotalAtletasGrupo(uid, listaUsuarios, listaNucleos) {
  return coletarDescendentesFormacao(uid, listaUsuarios, listaNucleos).length;
}

function pessoaEhMestreFormacao(pessoa) {
  return !!(pessoa && pessoa.papeis && pessoa.papeis.includes('mestre'));
}

function pessoaEhInstrutorFormacao(pessoa) {
  return !!(pessoa && pessoa.papeis && pessoa.papeis.includes('instrutor'));
}

function cascataCorPorEvolucao(pessoa) {
  const porc = calcularPorcentagemEvolucaoDe(pessoa);
  return porc >= 70 ? 'cascata-verde' : 'cascata-azul';
}

function construirCascataPersonCardHTML(pessoa, propria) {
  const cor = cascataCorPorEvolucao(pessoa);
  const classeExtra = propria ? ' cascata-pessoa-propria' : '';
  return '<div class="cascata-pessoa-card ' + cor + classeExtra + '" data-cascata-uid="' + escapeHTML(pessoa.id) + '" onmouseenter="window.__cascataHoverPessoa(this)" onmouseleave="window.__cascataHoverFim()" onclick="window.__cascataAbrirFoto(this)">' +
    (propria ? '<span class="cascata-pessoa-selo"><i class="fas fa-crown"></i></span>' : '') +
    '<img class="cascata-pessoa-foto" src="' + escapeHTML(pessoa.fotoUrl || 'https://via.placeholder.com/64') + '" alt="' + escapeHTML(pessoa.nome || '') + '">' +
    '<span class="cascata-pessoa-nome">' + escapeHTML(pessoa.nome || 'Sem nome') + '</span>' +
    '<span class="cascata-pessoa-cordao">' + escapeHTML(pessoa.cordaoAtual || 'Iniciante') + '</span>' +
    '</div>';
}

function construirCascataContagemCardHTML(lista, rotulo, icone) {
  const vazio = lista.length === 0;
  let avatares = '';
  if (!vazio) {
    avatares = lista.map((p) => {
      const cor = cascataCorPorEvolucao(p);
      return '<img class="cascata-avatar-mini ' + cor + '" data-cascata-uid="' + escapeHTML(p.id) + '" src="' + escapeHTML(p.fotoUrl || 'https://via.placeholder.com/64') + '" alt="' + escapeHTML(p.nome || '') + '" onmouseenter="window.__cascataHoverPessoa(this)" onmouseleave="window.__cascataHoverFim()" onclick="event.stopPropagation(); window.__cascataAbrirFoto(this)">';
    }).join('');
  }
  return '<div class="cascata-contagem-card' + (vazio ? ' cascata-contagem-vazia' : '') + '"' + (vazio ? '' : ' onclick="window.__cascataToggleGrupo(this)"') + '>' +
    '<i class="fas ' + icone + '"></i>' +
    '<span class="cascata-contagem-numero">' + lista.length + '</span>' +
    '<span class="cascata-contagem-rotulo">' + escapeHTML(rotulo) + '</span>' +
    (vazio ? '' : '<span class="cascata-contagem-expandir"><i class="fas fa-chevron-down"></i></span><div class="cascata-avatares-grid oculto">' + avatares + '</div>') +
    '</div>';
}

// Árvore de Formação (quem formou quem) — recursiva de verdade: o Mestre
// Profeta vem primeiro, embaixo dele os mestres/professores/instrutores/
// alunos que ele formou diretamente, e cada um desses que também formou
// gente (virou mestre/professor/instrutor) ganha seu próprio galho recursivo
// com professores/instrutores/alunos dele — e assim por diante, até acabarem
// os descendentes. Um "visitados" evita loop infinito se algum dado tiver
// um ciclo (formadorUid apontando em círculo).
function construirNoFormacaoHTML(pessoa, listaUsuarios, listaNucleos, ehRaiz, visitados) {
  if (visitados.has(pessoa.id)) return '';
  visitados.add(pessoa.id);
  const filhos = obterFilhosDiretosFormacao(pessoa.id, listaUsuarios, listaNucleos);
  const filhosGalho = filhos.filter((p) => pessoaEhMestreFormacao(p) || pessoaEhInstrutorFormacao(p));
  const alunosDiretos = filhos.filter((p) => !pessoaEhMestreFormacao(p) && !pessoaEhInstrutorFormacao(p));

  const cardHTML = construirCascataPersonCardHTML(pessoa, ehRaiz);
  // Só aparece o cartão de "alunos diretos" quando ele existe de verdade —
  // sem tile fixo mostrando "0" sem função nenhuma.
  const alunosHTML = alunosDiretos.length
    ? '<div class="formacao-no-extra">' + construirCascataContagemCardHTML(alunosDiretos, alunosDiretos.length === 1 ? 'aluno direto' : 'alunos diretos', 'fa-users') + '</div>'
    : '';
  const classeFilhos = 'formacao-filhos' + (filhosGalho.length > 1 ? ' formacao-filhos-multi' : '');
  const filhosHTML = filhosGalho.length
    ? '<div class="' + classeFilhos + '">' + filhosGalho.map((f) => '<div class="formacao-galho">' + construirNoFormacaoHTML(f, listaUsuarios, listaNucleos, false, visitados) + '</div>').join('') + '</div>'
    : '';
  return '<div class="formacao-no">' + cardHTML + alunosHTML + filhosHTML + '</div>';
}

function construirArvoreFormacaoHTML(raizUid, listaUsuarios, listaNucleos) {
  const raiz = listaUsuarios.find((u) => u.id === raizUid);
  if (!raiz) return '';
  return '<div class="formacao-arvore-scroll"><div class="formacao-raiz">' +
    construirNoFormacaoHTML(raiz, listaUsuarios, listaNucleos, true, new Set()) +
    '</div></div>';
}

window.__cascataToggleGrupo = function (el) {
  el.classList.toggle('cascata-contagem-aberta');
  const grid = el.querySelector('.cascata-avatares-grid');
  if (grid) grid.classList.toggle('oculto');
};

window.__cascataHoverPessoa = function (el) {
  const uid = el.getAttribute('data-cascata-uid');
  const pessoa = (todosUsuarios || []).find((u) => u.id === uid);
  if (!pessoa) return;
  let tip = document.getElementById('cascataTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'cascataTooltip';
    tip.className = 'cascata-tooltip';
    document.body.appendChild(tip);
  }
  const porc = calcularPorcentagemEvolucaoDe(pessoa);
  const corStatus = porc >= 70 ? 'verde' : 'azul';
  const textoStatus = porc >= 70 ? 'Evolucao em dia' : 'Evolucao em andamento';
  tip.innerHTML = '<strong>' + escapeHTML(pessoa.nome || 'Sem nome') + '</strong>' +
    '<span>' + escapeHTML(pessoa.cordaoAtual || 'Iniciante') + '</span>' +
    '<span class="cascata-tooltip-status cascata-tooltip-' + corStatus + '"><i class="fas fa-circle"></i> ' + textoStatus + '</span>';
  const rect = el.getBoundingClientRect();
  tip.style.left = (rect.left + rect.width / 2) + 'px';
  tip.style.top = (rect.top + window.scrollY - 12) + 'px';
  tip.classList.add('cascata-tooltip-visivel');
};

window.__cascataHoverFim = function () {
  const tip = document.getElementById('cascataTooltip');
  if (tip) tip.classList.remove('cascata-tooltip-visivel');
};

window.__cascataFecharFoto = function () {
  const modal = document.getElementById('cascataFotoModal');
  if (modal) modal.classList.remove('cascata-foto-modal-aberto');
};

window.__cascataAbrirFoto = function (el) {
  const uid = el.getAttribute('data-cascata-uid');
  const pessoa = (todosUsuarios || []).find((u) => u.id === uid);
  if (!pessoa) return;
  let modal = document.getElementById('cascataFotoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cascataFotoModal';
    modal.className = 'cascata-foto-modal';
    modal.addEventListener('click', function (e) { if (e.target === modal) window.__cascataFecharFoto(); });
    document.body.appendChild(modal);
  }
  modal.innerHTML = '<div class="cascata-foto-modal-conteudo">' +
    '<button type="button" class="cascata-foto-modal-fechar" onclick="window.__cascataFecharFoto()"><i class="fas fa-times"></i></button>' +
    '<img src="' + escapeHTML(pessoa.fotoUrl || 'https://via.placeholder.com/300') + '" alt="' + escapeHTML(pessoa.nome || '') + '">' +
    '<h3>' + escapeHTML(pessoa.nome || 'Sem nome') + '</h3>' +
    '<p>' + escapeHTML(pessoa.cordaoAtual || 'Iniciante') + '</p>' +
    '</div>';
  modal.classList.add('cascata-foto-modal-aberto');
};

function renderizarArvoreFormacao() {
  const wrap = document.getElementById('arvoreFormacaoContainer');
  if (!wrap) return;
  let raizUid = null;
  if (sessaoAtual && (souFundador(sessaoAtual) || ehMestre() || (sessaoAtual.papeis || []).includes('instrutor'))) {
    raizUid = sessaoAtual.uid;
  }
  if (!raizUid) { wrap.innerHTML = ''; return; }
  const html = construirArvoreFormacaoHTML(raizUid, todosUsuarios, todosNucleos);
  wrap.innerHTML = html || '<span class="cascata-vazio">Ninguém formado ainda a partir deste cadastro.</span>';
}


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
} catch (e) {
console.error(e);
irParaLogin();
return;
}
// Erro em alguma parte do painel NÃO pode derrubar a sessão de quem tem
// acesso: antes qualquer exceção aqui mandava o mestre/professor de volta
// pro login como se ele não tivesse permissão (parecia "logar e desconectar").
try {
await iniciarPainel();
} catch (e) {
console.error('Erro ao montar o painel:', e);
const telaCarregando = document.getElementById('telaCarregando');
if (telaCarregando) telaCarregando.classList.add('oculto');
appPainel.classList.remove('oculto');
toast('Uma parte do painel não carregou. Recarregue a página; se continuar, me avise com o print.', 'error', 8000);
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
// admin-fundador: o link pro Painel do Fundador (master.html) precisa
// aparecer também pro Mestre Profeta (acessoGeral), não só pro papel
// literal 'admin' — senão o próprio fundador nunca vê o botão.
else if (chave === 'admin-fundador') visivel = admin || souFundador(sessaoAtual);
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
// Caches usados pela "Visão geral" (tiles de KPI da aba Alunos). Só guardam
// o que já foi lido de verdade nesta sessão — nada aqui é estimado.
let avisosVisiveisCache = null;     // array de avisos ativos visíveis (null = ainda não carregou)
let eventosCache = null;            // eventos/{id} (null = ainda não carregou)
let presencasNucleoCache = null;    // { nucleoId, itens } — última leitura de presenças (reaproveitada pelo Face ID)

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
// Cabeçalho no padrão do mockup: eyebrow em caixa alta + título forte
// (sem faixa colorida). Admin vê o grupo todo; mestre/professor vê o
// próprio núcleo; instrutor sem núcleo vê só a turma dele.
const eyebrowAlunos = document.getElementById('eyebrowAbaAlunos');
const tituloGrid = document.getElementById('tituloGridAlunos');
if (ehAdmin()) {
if (eyebrowAlunos) eyebrowAlunos.textContent = 'Admin Master · visão geral';
document.getElementById('tituloAbaAlunos').textContent = 'Todos os Alunos';
if (tituloGrid) tituloGrid.textContent = 'Todos os alunos do grupo';
} else if (instrutorSolo) {
if (eyebrowAlunos) eyebrowAlunos.textContent = 'Instrutor';
document.getElementById('tituloAbaAlunos').textContent = 'Meus Alunos';
if (tituloGrid) tituloGrid.textContent = 'Alunos sob minha responsabilidade';
} else {
if (eyebrowAlunos) eyebrowAlunos.textContent = souFundador(sessaoAtual) ? 'Núcleo · sede do grupo' : 'Meu núcleo';
document.getElementById('tituloAbaAlunos').textContent = nomeNucleoProprio || 'Meus Alunos';
if (tituloGrid) tituloGrid.textContent = 'Alunos do núcleo';
}
document.getElementById('tituloAbaSolicitacoes').innerHTML = '<i class="fas fa-clipboard-check"></i> ' + (ehAdmin() ? 'Solicitações recebidas' : 'Solicitações');

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
document.getElementById('nav-links').classList.toggle('show');
});

mostrarSkeletons();
renderizarKpisGestao();
await Promise.all([
carregarNucleos(),
carregarUsuarios(),
carregarSolicitacoes(),
carregarAvisos(),
carregarMateriais(),
carregarFormacao(),
carregarFinanceiro(),
carregarRateios(),
  carregarPresencas(),
carregarEventosResumo(),
]);

renderizarNucleosUI();
atualizarEstrelaHeader();
renderizarKpisGestao();
configurarFaceId({
obterContexto: obterContextoFaceId,
criar,
toast,
escapeHTML,
aoRegistrar: () => carregarPresencas(),
});
await atualizarContextoFaceId();
}

/* ===================== FACE ID (contexto do painel) =====================
   Quem pode usar: qualquer conta vinculada a um núcleo — mestre/professor
   responsável (alunos do próprio núcleo), instrutor (alunos atribuídos a
   ele, presença gravada no núcleo onde cada um treina) e o Admin Master
   (núcleo escolhido no seletor de Presenças). Tudo vem de todosUsuarios,
   já lido com as permissões da própria sessão. */
async function obterContextoFaceId() {
if (!sessaoAtual) return null;
const instrutorSolo = !ehGestor() && ehInstrutorLogado();
let nucleoAlvo = null;
let alunos = [];
if (ehAdmin()) {
nucleoAlvo = document.getElementById('filtroAcademiaPresenca')?.value || null;
if (!nucleoAlvo) return { alunos: [], nucleoNome: null };
alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && u.academiaId === nucleoAlvo && u.statusAtual !== 'Inativo');
} else if (ehGestor() && sessaoAtual.academiaGerenciadaId) {
nucleoAlvo = sessaoAtual.academiaGerenciadaId;
alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && u.academiaId === nucleoAlvo && u.statusAtual !== 'Inativo');
} else if (instrutorSolo || ehInstrutorLogado()) {
alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && u.instrutorUid === sessaoAtual.uid && u.statusAtual !== 'Inativo');
} else {
return { alunos: [], nucleoNome: null };
}
const nucleoDoc = nucleoAlvo ? todosNucleos.find((n) => n.id === nucleoAlvo) : null;
let presencasHoje = [];
if (nucleoAlvo) {
if (presencasNucleoCache && presencasNucleoCache.nucleoId === nucleoAlvo) presencasHoje = presencasNucleoCache.itens;
else { try { presencasHoje = await presencasDoNucleo(nucleoAlvo, 200); } catch (e) { presencasHoje = []; } }
}
return {
nucleoId: nucleoAlvo,
nucleoNome: nucleoDoc ? nucleoDoc.nome : (nucleoAlvo || null),
alunos,
presencasHoje,
registradoPor: sessaoAtual.uid,
registradoPorNome: sessaoAtual.nome || sessaoAtual.email || '',
nucleoIdPara: (aluno) => nucleoAlvo || aluno.academiaId || null,
salvarDescritor: (aluno, descritor, hash) => atualizar('usuarios', aluno.id, { faceDescriptor: descritor, faceDescriptorFotoHash: hash }),
};
}

// Eventos/batizados marcados — leitura real de eventos/{id} (allow read: if
// logado()), só pra contar os futuros no tile da Visão geral.
async function carregarEventosResumo() {
try {
eventosCache = await listar('eventos');
} catch (e) {
console.warn('Eventos indisponíveis para a visão geral.', e);
eventosCache = null;
}
}

/* ===================== VISÃO GERAL (tiles de KPI, mockup p.4/5) =====================
   Regra de ouro: cada número vem de dados já lidos do Firestore nesta sessão.
   Enquanto uma fonte não carregou (cache null) o tile mostra "—" — nunca um
   número inventado. Cada tile leva para a aba que detalha aquele número. */
function renderizarKpisGestao() {
const wrap = document.getElementById('kpisGestao');
if (!wrap || !sessaoAtual) return;
const instrutorSolo = !ehGestor() && ehInstrutorLogado();
const hoje = new Date().toISOString().slice(0, 10);
const alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno'));
const alunosAtivos = alunos.filter((a) => a.statusAtual !== 'Inativo');
const pendentes = solicitacoesCache.filter((s) => s.status === 'pendente');
const eventosFuturos = eventosCache ? eventosCache.filter((e) => (e.data || '') >= hoje) : null;
const nucleoProprio = sessaoAtual.academiaGerenciadaId || null;
const presencaCache = presencasNucleoCache && (ehAdmin() || presencasNucleoCache.nucleoId === nucleoProprio) ? presencasNucleoCache : null;
const inicioMesKpi = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const checkinsMes = presencaCache ? presencaCache.itens.filter((p) => (p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm)) >= inicioMesKpi).length : null;

const tiles = [];
const tile = (cor, valor, rotulo, aba, icone, nota) => tiles.push({ cor, valor, rotulo, aba, icone, nota });

tile('teal', todosUsuarios.length ? String(alunosAtivos.length) : '—', ehAdmin() ? 'alunos ativos no grupo' : (instrutorSolo ? 'alunos sob minha responsabilidade' : 'alunos ativos no núcleo'), null, 'fa-user-group');
if (ehAdmin()) tile('navy', todosNucleos.length ? String(todosNucleos.filter((n) => n.ativo).length) : '—', 'núcleos ativos', 'nucleos', 'fa-building');
if (ehGestor()) tile(pendentes.length ? 'gold' : 'teal', String(pendentes.length), 'solicitações pendentes', 'solicitacoes', 'fa-clock');
tile('green', checkinsMes != null ? String(checkinsMes) : '—', 'check-ins neste mês', 'presenca', 'fa-location-dot', checkinsMes != null ? `${presencaCache.itens.length} no total` : (ehAdmin() ? 'selecione um núcleo em Presenças' : 'sem check-ins lidos ainda'));
tile('navy', avisosVisiveisCache ? String(avisosVisiveisCache.length) : '—', 'avisos ativos', 'avisos', 'fa-bell');
tile(eventosFuturos && eventosFuturos.length ? 'red' : 'teal', eventosFuturos ? String(eventosFuturos.length) : '—', eventosFuturos && eventosFuturos.length === 1 ? 'evento/batizado marcado' : 'eventos/batizados marcados', null, 'fa-calendar-day');

wrap.innerHTML = tiles.map((t, i) => `
<div class="kpi-tile kpi-${t.cor}" style="--card-index:${i}" ${t.aba ? `data-aba="${t.aba}" role="button" tabindex="0" onclick="mudarAba('${t.aba}')" onkeydown="if(event.key==='Enter')mudarAba('${t.aba}')"` : ''}>
<i class="fas ${t.icone}"></i>
<span class="kpi-valor">${escapeHTML(t.valor)}</span>
<span class="kpi-rotulo">${escapeHTML(t.rotulo)}</span>
${t.nota ? `<span class="kpi-nota">${escapeHTML(t.nota)}</span>` : ''}
</div>`).join('');
}

function atualizarEstrelaHeader() {
const span = document.getElementById('estrelaHeaderAlunos');
if (!span) return;
const heroVisivel = !document.getElementById('heroFundador')?.classList.contains('oculto');
if (ehAdmin() || !sessaoAtual.academiaGerenciadaId || heroVisivel) { span.classList.add('oculto'); return; }
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
if (evt && evt.preventDefault) evt.preventDefault();
document.querySelectorAll('.aba-content, .nav-item').forEach((el) => el.classList.remove('active'));
const alvo = document.getElementById(`aba-${abaId}`);
if (!alvo) return;
alvo.classList.add('active');
if (evt && evt.currentTarget && evt.currentTarget.classList) {
evt.currentTarget.classList.add('active');
} else {
// Chamado por um tile da Visão geral (sem evento de clique no menu):
// acende o item do menu correspondente mesmo assim.
const item = Array.from(document.querySelectorAll('.nav-item')).find((a) => (a.getAttribute('onclick') || '').includes(`mudarAba('${abaId}'`));
if (item) item.classList.add('active');
}
document.getElementById('nav-links').classList.remove('show');
if (abaId !== 'presenca') pararFaceId(); // libera a câmera do Face ID ao sair da aba
window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.irParaRelatorios = function (evt) {
window.mudarAba('alunos', evt);
setTimeout(() => { document.getElementById('secao-graficos').scrollIntoView({ behavior: 'smooth' }); }, 100);
};

/* ===================== NÚCLEOS ===================== */
async function carregarNucleos() {
try {
todosNucleos = await listar('nucleos');
renderizarNucleosUI();
} catch (e) {
console.error(e);
toast('Não foi possível carregar os núcleos.', 'error');
}
}

// Renderiza toda a UI dependente de núcleos (selects + cards + estrela viva).
// Separado de carregarNucleos() para poder ser chamado de novo depois que
// todosUsuarios terminar de carregar (carregarNucleos() e carregarUsuarios()
// rodam em paralelo via Promise.all, então na primeira passada todosUsuarios
// pode ainda estar vazio/desatualizado — isso fazia o select de "responsável"
// nunca mostrar pessoas existentes e a estrela viva aparecer sempre em 0/7).
function renderizarNucleosUI() {
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
// Cartão de núcleo no padrão do mockup (p.3/p.6): ícone, nome, responsável ·
// cordão, chips (SEDE / ATIVO), três mini-stats e a faixa navy das estrelas.
// Tudo real: alunos ativos e estrela viva vêm de todosUsuarios; mensalidade
// e endereço do próprio documento do núcleo — o que não existe fica "—".
const cores = ['', 'verde', 'dourado'];
lista.innerHTML = todosNucleos.map((n, i) => {
const estrelas = calcularEstrelaViva(n.id, todosUsuarios);
const resp = todosUsuarios.find((u) => u.id === n.professorUid);
const alunosAtivos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno') && u.academiaId === n.id && u.statusAtual !== 'Inativo').length;
const ehSede = !!(resp && souFundador(resp));
const cordaoMaisAlta = estrelas > 0 ? (ORDEM_ESTRELA[estrelas - 1] || '') : '';
return `
<div class="academia-card ${ehSede ? 'nucleo-sede' : ''}" style="--card-index:${i}">
<div class="nucleo-topo">
<div class="nucleo-icone ${cores[i % cores.length]}"><i class="fas fa-${ehSede ? 'crown' : 'building'}"></i></div>
<div class="nucleo-titulo">
<h4>${escapeHTML(n.nome)}</h4>
<p>${resp ? `${escapeHTML(resp.nome || 'Responsável')} · Cordão ${escapeHTML(resp.cordaoAtual || '—')}` : 'Sem responsável definido'}</p>
</div>
<div class="nucleo-chips">
${ehSede ? '<span class="pill pill-gold">SEDE</span>' : ''}
<span class="pill ${n.ativo ? 'pill-aprovado' : 'pill-neutra'}">${n.ativo ? 'ATIVO' : 'INATIVO'}</span>
</div>
</div>
${resp ? `<div class="nucleo-responsavel"><img src="${escapeHTML(resp.fotoUrl || 'https://via.placeholder.com/36')}" alt=""><span><strong>${escapeHTML(resp.nome || '')}</strong>${souFundador(resp) ? 'Acesso Geral · Fundador' : 'Responsável do núcleo'}</span></div>` : '<p class="nucleo-sem-responsavel">Use "Editar" para atribuir um responsável.</p>'}
<div class="nucleo-stats">
<div class="nucleo-stat"><strong class="teal">${alunosAtivos}</strong><small>alunos ativos</small></div>
<div class="nucleo-stat"><strong class="navy">${n.mensalidadeValor ? `R$ ${Number(n.mensalidadeValor).toFixed(0)}` : '—'}</strong><small>mensalidade</small></div>
<div class="nucleo-stat"><strong title="${escapeHTML(n.endereco || '')}">${n.endereco ? escapeHTML(n.endereco.split(',')[0]) : '—'}</strong><small>local</small></div>
</div>
<div class="nucleo-estrelas">
<div><strong>${estrelas} ${estrelas === 1 ? 'estrela' : 'estrelas'}</strong><small>${cordaoMaisAlta ? `corda mais alta: ${escapeHTML(cordaoMaisAlta)}` : 'nenhuma corda formada ainda'}</small></div>
<span class="estrelas"><span class="on">${'★'.repeat(estrelas)}</span><span class="off">${'★'.repeat(7 - estrelas)}</span></span>
</div>
<div class="academia-actions">
<button class="btn-edit-ac" onclick="abrirEditarNucleo('${n.id}')"><i class="fas fa-pen"></i> Editar núcleo</button>
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
      const endereco = sanitizeInput(document.getElementById('enderecoNucleo').value);
      const latitude = parseFloat(document.getElementById('latitudeNucleo').value) || null;
      const longitude = parseFloat(document.getElementById('longitudeNucleo').value) || null;
      const raioMetros = Number(document.getElementById('raioNucleo').value) || 15;
const slug = gerarSlug(nome);
const respSelecionado = document.getElementById('responsavelNucleo').value;

let professorUid;
let professorNome;
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
professorNome = nomeResp;
} else {
professorUid = respSelecionado;
const respAtual = todosUsuarios.find((u) => u.id === professorUid);
professorNome = (respAtual && respAtual.nome) || '';
const papeisNovos = Array.from(new Set([...(respAtual?.papeis || ['aluno']), 'mestre']));
const formadorUidNovo = obterFormadorUid(respAtual, todosNucleos);
await atualizar('usuarios', professorUid, { papeis: papeisNovos, academiaGerenciadaId: slug, ...(formadorUidNovo ? { formadorUid: formadorUidNovo } : {}) });
}

// professorNome fica salvo no próprio núcleo (denormalizado) porque o app
// do aluno (app.html) não tem permissão para ler o documento de outro
// usuário em usuarios/{uid} — só assim a tela de Núcleos consegue mostrar
// o nome do professor sem exigir uma regra de leitura mais aberta.
await salvar('nucleos', slug, { nome, mensalidadeValor, professorUid, professorNome, ativo: true, endereco, latitude, longitude, raioMetros });
toast('Núcleo criado com sucesso!');
formNovoNucleo.reset();
document.getElementById('camposNovoResponsavel').style.display = 'grid';
await Promise.all([carregarNucleos(), carregarUsuarios()]);
renderizarNucleosUI();
} catch (err) {
console.error(err);
toast(err && err.code === 'auth/email-already-in-use' ? 'Este e-mail já tem cadastro.' : 'Erro ao criar núcleo.', 'error');
} finally {
btn.disabled = false;
}
});
}

window.usarLocalizacaoAtual = function (latId, lngId) {
  if (!navigator.geolocation) { toast('Geolocalização não disponível neste navegador.'); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      document.getElementById(latId).value = pos.coords.latitude.toFixed(6);
      document.getElementById(lngId).value = pos.coords.longitude.toFixed(6);
      toast('Localização capturada!');
    },
    () => toast('Não foi possível obter sua localização.'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

window.abrirEditarNucleo = function (id) {
nucleoEditandoID = id;
const n = todosNucleos.find((x) => x.id === id);
if (!n) return;
document.getElementById('editNomeNucleo').value = n.nome || '';
document.getElementById('editMensalidadeNucleo').value = n.mensalidadeValor || '';
document.getElementById('editAtivoNucleo').value = n.ativo === false ? 'false' : 'true';
      document.getElementById('editEnderecoNucleo').value = n.endereco || '';
      document.getElementById('editLatitudeNucleo').value = n.latitude || '';
      document.getElementById('editLongitudeNucleo').value = n.longitude || '';
      document.getElementById('editRaioNucleo').value = n.raioMetros || 15;
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
const novoResponsavelUsuario = novoResponsavelId ? todosUsuarios.find((u) => u.id === novoResponsavelId) : null;
const professorNome = novoResponsavelUsuario ? (novoResponsavelUsuario.nome || '') : (nucleoAtual ? (nucleoAtual.professorNome || '') : '');

await atualizar('nucleos', nucleoEditandoID, {
nome: sanitizeInput(document.getElementById('editNomeNucleo').value),
mensalidadeValor: Number(document.getElementById('editMensalidadeNucleo').value) || 0,
ativo: document.getElementById('editAtivoNucleo').value === 'true',
professorUid: novoResponsavelId,
professorNome,
      endereco: sanitizeInput(document.getElementById('editEnderecoNucleo').value),
      latitude: parseFloat(document.getElementById('editLatitudeNucleo').value) || null,
      longitude: parseFloat(document.getElementById('editLongitudeNucleo').value) || null,
      raioMetros: Number(document.getElementById('editRaioNucleo').value) || 15,
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
const formadorUidNovo = obterFormadorUid(novo, todosNucleos);
await atualizar('usuarios', novoResponsavelId, {
papeis: Array.from(new Set([...(novo?.papeis || ['aluno']), 'mestre'])),
academiaGerenciadaId: nucleoEditandoID,
...(formadorUidNovo ? { formadorUid: formadorUidNovo } : {}),
});
}
}

toast('Núcleo atualizado!');
window.fecharModalNucleo();
await Promise.all([carregarNucleos(), carregarUsuarios()]);
renderizarNucleosUI();
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
// Instrutor solo: só os alunos atribuídos a ele (instrutorUid), mais o
// próprio perfil. Consulta filtrada por instrutorUid — listar a coleção
// inteira é negado pelas regras pra quem não é admin, e derrubava o painel.
const meus = await listarOnde('usuarios', 'instrutorUid', sessaoAtual.uid);
todosUsuarios = meus.some((u) => u.id === sessaoAtual.uid) ? meus : meus.concat([{ id: sessaoAtual.uid, ...sessaoAtual }]);
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

// O fundador (Acesso Geral) também treina como aluno no próprio núcleo que
// administra — em vez de misturar o registro dele no meio da grade normal
// da PRÓPRIA tela de gestão dele, ele ganha um cartão de destaque no topo
// (igual à tela que o próprio aluno vê no app) e some da grade comum aqui,
// sem duplicar. Isso só vale pra esta view (o próprio fundador logado); no
// painel do Admin Master de verdade (outra conta, vendo "Todos os Alunos"),
// o registro dele continua aparecendo normalmente na grade, como qualquer
// outro aluno, pra manter o "Avaliar/Editar" acessível por lá.
// ehInstrutorLogado() incluído aqui também — antes só mestre/fundador ganhavam
// o cartão de destaque, e o instrutor via a tela sem cabeçalho nenhum.
// O próprio registro do responsável nem sempre está na lista carregada: a
// Prof.ª Taynara, o Mestre Omar e o Instrutor Leiliano TREINAM na Academia
// Mestre Profeta (academiaId) mas ADMINISTRAM o próprio núcleo
// (academiaGerenciadaId) — e a lista de um gestor só traz quem treina no
// núcleo dele. Por isso o cartão só aparecia pro Mestre Profeta. Agora o
// cartão usa o cadastro real da sessão (usuarios/{uid}, já lido no login),
// preferindo a cópia da lista quando ela existir (pode estar mais recente
// depois de uma edição pelo modal).
const querCartao = (souFundador(sessaoAtual) || ehMestre() || ehInstrutorLogado()) && !ehAdmin();
const meuRegistro = querCartao
? (filtrados.find((a) => a.id === sessaoAtual.uid) || todosUsuarios.find((u) => u.id === sessaoAtual.uid) || { id: sessaoAtual.uid, ...sessaoAtual })
: null;
renderizarHeroFundador(meuRegistro);
// A antiga faixa verde virou um título simples (eyebrow + nome do núcleo, sem
// fundo colorido). A estrela viva do cabeçalho só aparece pra quem NÃO tem o
// cartão de destaque — pra quem tem, ela já está dentro do cartão.
const estrelaHeader = document.getElementById('estrelaHeaderAlunos');
if (estrelaHeader && meuRegistro) estrelaHeader.classList.add('oculto');
renderizarArvoreFormacao();
renderizarGrid(meuRegistro ? filtrados.filter((a) => a.id !== meuRegistro.id) : filtrados);
renderizarKpisGestao();
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
const statusCor = a.statusAtual === 'Ativo' ? '#389E92' : '#D32F2F';
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

// Cartão de destaque do fundador (Acesso Geral) no topo de "Meus Alunos" —
// mesmo visual de status que o próprio app.html mostra pro aluno: anel de
// progresso, estrela viva do núcleo e o cordão "rodando" nas cores reais do
// cordão atual dele (Mestre/Presidente = branco/verde/azul).
// Selo do cartão conforme quem é a pessoa: fundador, mestre/professor
// responsável por núcleo, ou instrutor. O título vem do cordão real
// (cordaoAtual) — "Professor", "Instrutor", "Mestre"... — não é inventado.
function seloHeroHTML(a) {
if (souFundador(a)) return '<i class="fas fa-crown"></i> Acesso Geral · Fundador';
const papeis = a.papeis || [];
if (papeis.includes('mestre') && a.academiaGerenciadaId) return `<i class="fas fa-map-marker-alt"></i> Responsável do Núcleo${a.cordaoAtual ? ' · ' + escapeHTML(a.cordaoAtual) : ''}`;
if (papeis.includes('instrutor')) return '<i class="fas fa-user-graduate"></i> Instrutor';
return '<i class="fas fa-user"></i> Responsável';
}

// "Direto <quem formou>": o fundador é "Direto Liberdade e Expressão"; os
// demais são diretos do responsável pelo núcleo onde treinam (o nome do
// responsável vem do próprio nome do núcleo — "Academia Mestre Profeta" →
// "Mestre Profeta"; "Academia Professora Taynara" → "Professora Taynara").
// Se a pessoa tem formadorUid gravado e ele administra um núcleo conhecido,
// esse núcleo vence (a posição na cascata é permanente).
function rotuloDiretoDe(pessoa) {
if (souFundador(pessoa)) return 'Direto Liberdade e Expressão';
let nucleo = null;
if (pessoa.formadorUid) nucleo = todosNucleos.find((n) => n.professorUid === pessoa.formadorUid) || null;
if (!nucleo && pessoa.academiaId) nucleo = todosNucleos.find((n) => n.id === pessoa.academiaId) || null;
const nomeNucleo = nucleo ? (nucleo.nome || '') : (pessoa.academiaNome || '');
const mestre = String(nomeNucleo).replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim();
return mestre ? `Direto ${mestre}` : 'Direto Liberdade e Expressão';
}

function construirHeroCardHTML(a, todosUsuarios, mostrarTotalGrupo) {

const idade = Number(a.idade) || 0;
const lista = idade < 12 ? cordoesKids : cordoesAdulto;
let idx = lista.findIndex((c) => c.nome === (a.cordaoAtual || 'Iniciante'));
if (idx === -1) idx = 0;
const cor = lista[idx].cor;
const porcentagem = calcularPorcentagemEvolucaoDe(a);
const estrelaCount = a.academiaGerenciadaId ? calcularEstrelaViva(a.academiaGerenciadaId, todosUsuarios) : 0;
const volta = (porcentagem / 100).toFixed(3);
const estrelasHtml = estrelaCount > 0
? `<span style="color:var(--star-filled)">${'★'.repeat(estrelaCount)}</span><span style="color:rgba(255,255,255,.32)">${'★'.repeat(7 - estrelaCount)}</span> <span class="hero-fundador-estrela-num">${estrelaCount}/7 estrela viva</span>`
: '';

return `
<div class="hero-fundador-card">
<div class="hero-fundador-topo">
<div class="hero-fundador-anel" style="background:conic-gradient(#00E676 0turn ${volta}turn, rgba(255,255,255,.16) ${volta}turn 1turn);">
<div class="hero-fundador-anel-miolo">
<img src="${escapeHTML(a.fotoUrl || 'https://via.placeholder.com/90')}" alt="Foto de ${escapeHTML(a.nome || 'Fundador')}">
</div>
</div>
<div class="hero-fundador-info">
<span class="hero-fundador-selo">${seloHeroHTML(a)}</span>
<h2>${escapeHTML(a.nome || 'Responsável')}</h2>
<span class="hero-fundador-nucleo"><i class="fas fa-link"></i> ${escapeHTML(rotuloDiretoDe(a))}</span>
${mostrarTotalGrupo ? `<span class="hero-fundador-total-grupo"><i class="fas fa-users"></i> Total de atletas do grupo: ${contarTotalAtletasGrupo(a.id, todosUsuarios, todosNucleos)}</span>` : ''}
<span class="hero-fundador-cordao">Cordão ${escapeHTML(a.cordaoAtual || 'Iniciante')}</span>
<div class="hero-fundador-estrelas">${estrelasHtml}</div>
</div>
<div class="hero-fundador-pct">${porcentagem}<span>%</span></div>
</div>
<div class="cordao-track hero-fundador-cordao-track">
<div class="cordao-fill" style="width:${porcentagem}%; --c1:${cor[0]}; --c2:${cor[1]}; --c3:${cor[2]};"></div>
</div>
</div>`;
}

function renderizarHeroFundador(a) {
const wrap = document.getElementById('heroFundador');
if (!wrap) return;
if (!a) { wrap.classList.add('oculto'); wrap.innerHTML = ''; return; }
wrap.innerHTML = construirHeroCardHTML(a, todosUsuarios, true);
wrap.classList.remove('oculto');
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

window.excluirAlunoPermanentemente = async function () {
  if (!usuarioSelecionado) return;
  const nomeAlvo = usuarioSelecionado.nome || 'este aluno';
  if (!confirm('Excluir permanentemente ' + nomeAlvo + '? Essa acao apaga o cadastro, o historico de avaliacoes e NAO pode ser desfeita.')) return;
  if (!confirm('Tem certeza mesmo? A exclusao de ' + nomeAlvo + ' e definitiva.')) return;
  try {
    await excluirUsuarioPermanente(usuarioSelecionado.id);
    toast('Aluno excluido permanentemente.');
    fecharModal();
    await carregarUsuarios();
  } catch (e) {
    console.error(e);
    toast('Erro ao excluir aluno permanentemente.', 'error');
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

// Ícone à esquerda por tipo de pedido (visual do mockup p.5) + rótulo curto.
const ICONE_SOLIC = { mensalidade: 'green fa-credit-card', evento: 'gold fa-calendar-day', transferencia: 'red fa-right-left', vinculo_familia: 'purple fa-user-group' };
const ROTULO_SOLIC = { mensalidade: 'mensalidade', evento: 'evento', transferencia: 'transferência', vinculo_familia: 'vínculo de família' };
function iconeSolicitacaoHTML(s) {
const def = (ICONE_SOLIC[s.tipo] || 'navy fa-clipboard').split(' ');
return `<span class="lista-icone ${def[0]}"><i class="fas ${def[1]}"></i></span>`;
}
function pillTipoSolicitacao(s) {
return `<span class="pill pill-teal">${escapeHTML(ROTULO_SOLIC[s.tipo] || s.tipo || 'pedido')}</span>`;
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
${iconeSolicitacaoHTML(s)}
<div class="lista-item-info">
<strong>${escapeHTML(s.solicitanteNome || 'Mestre/Professor')} ${pillTipoSolicitacao(s)}</strong>
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
${iconeSolicitacaoHTML(s)}
<div class="lista-item-info">
<strong>${escapeHTML(s.solicitanteNome || 'Mestre/Professor')} ${pillTipoSolicitacao(s)}</strong>
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
${iconeSolicitacaoHTML(s)}
<div class="lista-item-info">
<strong>${escapeHTML(descreverSolicitacao(s))}</strong>
<span>${s.criadoEm ? new Date(s.criadoEm).toLocaleDateString('pt-BR') : ''}</span>
</div>
<div class="lista-item-actions">
<span class="pill pill-${s.status}">${s.status === 'pendente' ? 'Pendente' : (s.status === 'aprovado' ? 'Aprovado' : 'Rejeitado')}</span>
${s.status === 'pendente' ? `<button class="btn-mini btn-mini-rejeitar" onclick="cancelarSolicitacao('${s.id}')">Cancelar</button>` : ''}
</div>
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
${iconeSolicitacaoHTML(s)}
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
${iconeSolicitacaoHTML(s)}
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
renderizarKpisGestao();
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
renderizarNucleosUI();
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

// Cancelar uma solicitação PRÓPRIA ainda pendente — hoje quem manda um
// pedido (mensalidade, evento, transferência) não tinha como desistir dele.
// Só apaga o documento, sem aplicar efeito nenhum (é diferente de rejeitar,
// que é o admin recusando o pedido de outra pessoa).
window.cancelarSolicitacao = async function (id) {
if (!confirm('Cancelar esta solicitação? Ela será removida.')) return;
try {
await remover('solicitacoes', id);
toast('Solicitação cancelada.');
await carregarSolicitacoes();
} catch (e) {
console.error(e);
toast('Erro ao cancelar solicitação.', 'error');
}
};

/* ===================== AVISOS ===================== */
function avisoExpirado(a) {
// Sem data = aviso sem prazo, nunca expira sozinho. Com data, some da
// lista assim que o dia passar (comparação lexicográfica 'YYYY-MM-DD',
// mesmo padrão já usado nos eventos futuros do app).
if (!a.data) return false;
const hoje = new Date().toISOString().slice(0, 10);
return a.data < hoje;
}

async function carregarAvisos() {
try {
const avisos = await listarAvisos(20);
const doNucleo = (ehAdmin() || souFundador(sessaoAtual)) ? avisos : avisos.filter((a) => !a.academiaId || a.academiaId === sessaoAtual.academiaGerenciadaId);
const visiveis = doNucleo.filter((a) => !avisoExpirado(a));
avisosVisiveisCache = visiveis;
renderizarKpisGestao();
const lista = document.getElementById('listaAvisos');
const podeExcluir = ehAdmin() || souFundador(sessaoAtual);
lista.innerHTML = visiveis.length
? visiveis.map((a) => {
const detalhes = [
a.data ? new Date(a.data + 'T00:00:00').toLocaleDateString('pt-BR') : '',
a.hora || '',
a.local ? escapeHTML(a.local) : '',
].filter(Boolean).join(' · ');
const iconeTipo = { evento: 'gold fa-calendar-day', financeiro: 'green fa-credit-card', geral: 'navy fa-bell' }[a.tipo] || 'navy fa-bell';
return `
<div class="lista-item">
<span class="lista-icone ${iconeTipo.split(' ')[0]}"><i class="fas ${iconeTipo.split(' ')[1]}"></i></span>
<div class="lista-item-info">
<strong>${escapeHTML(a.titulo)} <span class="pill pill-teal">${escapeHTML(a.tipo || 'geral')}</span>${a.academiaId ? '' : ' <span class="pill pill-neutra">todos os núcleos</span>'}</strong>
<span>${escapeHTML(a.texto)}</span>
${detalhes ? `<span style="color:var(--primary-teal); font-weight:700;"><i class="fas fa-calendar-days"></i> ${detalhes}</span>` : ''}
</div>
${podeExcluir ? `<div class="lista-item-actions"><button class="btn-mini btn-mini-rejeitar" onclick="excluirAviso('${a.id}')">Excluir</button></div>` : ''}
</div>`;
}).join('')
: '<div class="empty-state"><i class="fas fa-bell-slash"></i>Nenhum aviso publicado ainda.</div>';
} catch (e) {
console.error(e);
toast('Não foi possível carregar os avisos.', 'error');
}
}

window.excluirAviso = async function (id) {
if (!confirm('Excluir este aviso?')) return;
try {
await remover('avisos', id);
toast('Aviso excluído.');
await carregarAvisos();
} catch (e) {
console.error(e);
toast('Erro ao excluir aviso.', 'error');
}
};

const formNovoAviso = document.getElementById('formNovoAviso');
if (formNovoAviso) {
formNovoAviso.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = formNovoAviso.querySelector('button[type="submit"]');
btn.disabled = true;
try {
const academiaId = (ehAdmin() || souFundador(sessaoAtual)) ? (document.getElementById('avisoAcademia').value || null) : sessaoAtual.academiaGerenciadaId;
await publicarAviso({
titulo: sanitizeInput(document.getElementById('avisoTitulo').value),
texto: sanitizeInput(document.getElementById('avisoTexto').value),
tipo: document.getElementById('avisoTipo').value,
data: document.getElementById('avisoData').value || null,
hora: document.getElementById('avisoHora').value || null,
local: sanitizeInput(document.getElementById('avisoLocal').value) || null,
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
pagamentosCache = { nucleoId: nucleoAlvo || null, itens: pagamentos };
desenharGraficos(alunosFiltradosAtuais());
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

/* ===================== GRÁFICOS ====================== */
async function carregarPresencas() {
  const resumo = document.getElementById('presencaResumoCard');
  const cont = document.getElementById('listaPresencas');
  const sel = document.getElementById('filtroAcademiaPresenca');
  if (!resumo || !cont) return;
  let nucleoAlvo = sessaoAtual && sessaoAtual.academiaGerenciadaId ? sessaoAtual.academiaGerenciadaId : null;
  if (ehAdmin()) {
    if (sel) {
      sel.style.display = '';
      if (sel.options.length <= 1) {
        sel.innerHTML = '<option value="">Selecione um núcleo</option>' + (todosNucleos || []).map((n) => `<option value="${n.id}">${escapeHTML(n.nome || n.id)}</option>`).join('');
        sel.onchange = () => carregarPresencas();
      }
      nucleoAlvo = sel.value || null;
    }
  } else if (sel) {
    sel.style.display = 'none';
  }
  if (!nucleoAlvo) {
    resumo.innerHTML = ehInstrutorLogado() && !ehGestor()
      ? '<p>O resumo por núcleo é do responsável pelo núcleo. Como instrutor, use o Face ID acima para marcar a presença dos seus alunos.</p>'
      : '<p>Selecione um núcleo para ver as presenças.</p>';
    cont.innerHTML = '';
    atualizarContextoFaceId();
    return;
  }
  let itens = [];
  try {
    itens = await presencasDoNucleo(nucleoAlvo, 300);
    presencasNucleoCache = { nucleoId: nucleoAlvo, itens };
  } catch (e) {
    resumo.innerHTML = '<p>Não foi possível carregar as presenças agora.</p>';
    cont.innerHTML = '';
    return;
  }
  // Sem "confirmação aos 30 min": toda presença registrada (Face ID do
  // professor, Face ID do próprio aluno ou marcação manual) já vale como
  // presença. Os números aqui são só contagens reais do que foi gravado.
  const total = itens.length;
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const hojeStr = agora.toDateString();
  const dataDe = (p) => (p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm));
  const noMes = itens.filter((p) => dataDe(p) >= inicioMes);
  const hoje = itens.filter((p) => dataDe(p).toDateString() === hojeStr);
  const alunosHoje = new Set(hoje.map((p) => p.uid)).size;
  const visitasFora = itens.filter((p) => p.visitante === true);
  let visitantesAqui = [];
  try { visitantesAqui = await presencasVisitantesDoNucleo(nucleoAlvo, 100); } catch (e) { visitantesAqui = []; }
  presencasNucleoCache = { nucleoId: nucleoAlvo, itens, visitantesAqui };
  renderizarKpisGestao();
  const nomeNucleoCurto = (id) => { const n = (todosNucleos || []).find((x) => x.id === id); return n ? String(n.nome || id).replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '') : (id || ''); };
  resumo.innerHTML = `<div class="presenca-resumo-grid">
    <div class="presenca-stat"><span class="presenca-stat-valor">${noMes.length}</span><span class="presenca-stat-label">check-ins neste mês</span></div>
    <div class="presenca-stat"><span class="presenca-stat-valor">${alunosHoje}</span><span class="presenca-stat-label">aluno${alunosHoje === 1 ? '' : 's'} presente${alunosHoje === 1 ? '' : 's'} hoje</span></div>
    <div class="presenca-stat"><span class="presenca-stat-valor">${total}</span><span class="presenca-stat-label">check-ins no total</span></div>
    <div class="presenca-stat"><span class="presenca-stat-valor">${visitasFora.length}</span><span class="presenca-stat-label">treinos em outros núcleos</span></div>
  </div>`;
  const porAluno = {};
  itens.forEach((p) => {
    const key = p.uid || 'desconhecido';
    if (!porAluno[key]) {
      const u = (todosUsuarios || []).find((x) => x.id === key);
      porAluno[key] = { total: 0, mes: 0, ultima: 0, ultimaVisita: '', faceid: 0, nome: u ? u.nome : 'Aluno', foto: u ? u.fotoUrl : '' };
    }
    porAluno[key].total += 1;
    const d = dataDe(p); const t = d.getTime() || 0;
    if (d >= inicioMes) porAluno[key].mes += 1;
    if (String(p.origem || '').startsWith('faceid')) porAluno[key].faceid += 1;
    if (t > porAluno[key].ultima) {
      porAluno[key].ultima = t;
      porAluno[key].ultimaVisita = p.visitante && p.nucleoVisitadoId ? `Treino ${p.nucleoVisitadoNome ? String(p.nucleoVisitadoNome).replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '') : nomeNucleoCurto(p.nucleoVisitadoId)}` : '';
    }
  });
  const linhas = Object.values(porAluno)
    .sort((a, b) => b.ultima - a.ultima)
    .map((a) => {
      const dataStr = a.ultima ? new Date(a.ultima).toLocaleDateString('pt-BR') : '-';
      return `<div class="lista-item"><span class="lista-icone ${a.faceid ? 'green' : ''}"><i class="fas ${a.faceid ? 'fa-face-viewfinder' : 'fa-location-dot'}"></i></span><div class="lista-item-info"><strong>${escapeHTML(a.nome)}${a.ultimaVisita ? ` <span class="pill pill-gold">${escapeHTML(a.ultimaVisita)}</span>` : ''}</strong><span>${a.mes} neste mês · ${a.total} no total · último check-in: ${dataStr}${a.faceid ? ` · ${a.faceid} por Face ID` : ''}</span></div></div>`;
    })
    .join('');
  const blocoVisitantes = visitantesAqui.length
    ? `<div class="secao-titulo" style="margin-top:22px;"><h3>Visitantes de outros núcleos</h3><span class="pill pill-gold">${visitantesAqui.length}</span></div>` +
      visitantesAqui.sort((a, b) => dataDe(b) - dataDe(a)).slice(0, 30).map((p) => `<div class="lista-item"><span class="lista-icone gold"><i class="fas fa-person-walking-arrow-right"></i></span><div class="lista-item-info"><strong>${escapeHTML(p.alunoNome || 'Aluno visitante')}</strong><span>de ${escapeHTML(nomeNucleoCurto(p.nucleoId))} · ${dataDe(p).toLocaleDateString('pt-BR')}</span></div></div>`).join('')
    : '';
  cont.innerHTML = (linhas || '<p>Nenhum check-in registrado ainda.</p>') + blocoVisitantes;
  atualizarContextoFaceId();
  desenharGraficos(alunosFiltradosAtuais());
}

function obterCorPorCordao(nome) {
const mapa = {
Iniciante: '#CCCCCC',
Escravo: '#4F4F4F', Fugitivo: '#DAA520', Quilombola: '#DAA520', Vagante: '#D32F2F',
Liberto: '#D32F2F', Instrutor: '#DAA520', Professor: '#D32F2F', Mestre: '#F5F5F5',
'Mestre/Presidente': '#00B140',
};
return mapa[nome] || '#389E92';
}

/* ===================== RELATÓRIOS (Inteligência do Núcleo) =====================
   Todos os gráficos e frases saem de dados já lidos nesta sessão: alunos
   (todosUsuarios), check-ins (presencasNucleoCache), notas, mensalidades
   (pagamentosCache) e datas de cadastro. Quando uma fonte não existe pro
   escopo atual, o gráfico mostra "sem dados" — nunca um número inventado. */
const COR_SERIE = '#15907F';       // uma cor só pra magnitude (barras/linhas de uma série)
const COR_SERIE_2 = '#002D72';
const COR_BOM = '#008300';         // status: em dia / apto
const COR_ALERTA = '#C98500';      // status: atenção
const COR_RUIM = '#D32F2F';        // status: pendente / inativo
const COR_GRADE = 'rgba(13,33,29,0.08)';
const COR_TEXTO = '#5B6B68';
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
let pagamentosCache = null;         // { nucleoId, itens } — preenchido em carregarFinanceiro
let presencasRelatorioPendente = null;

const dataPresenca = (p) => (p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm));
function inicioSemana(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; } // segunda-feira
function nomeCurto(nome) { const partes = String(nome || 'Aluno').trim().split(/\s+/); return partes.length > 1 ? `${partes[0]} ${partes[1][0]}.` : partes[0]; }

function prontidaoDe(a) {
const idadeAluno = Number(a.idade) || 0;
const rank = a.cordaoAtual || 'Iniciante';
let idxCordao = (idadeAluno < 12 ? cordoesKids : cordoesAdulto).findIndex((c) => c.nome === rank);
if (idxCordao === -1) idxCordao = 0;
const crit = criteriosRegras.filter((c) => (idadeAluno < 12 ? c.reqKids : idxCordao >= (c.reqAdulto - 1)));
if (!a.notas || !crit.length) return { pct: null, crit, avaliado: false };
let total = 0; let avaliados = 0;
crit.forEach((c) => { if (a.notas[c.id] !== undefined) { total += Number(a.notas[c.id]) || 0; avaliados++; } });
if (!avaliados) return { pct: null, crit, avaliado: false };
return { pct: Math.round((total / (crit.length * 10)) * 100), crit, avaliado: true };
}

// Escopo do relatório: gestor = próprio núcleo; admin = núcleo do filtro (ou grupo todo).
function escopoRelatorio() {
if (ehAdmin()) {
const ac = selectFiltroAcademia ? selectFiltroAcademia.value : '';
return { nucleoId: ac || null, rotulo: ac ? (todosNucleos.find((n) => n.id === ac)?.nome || ac) : 'Grupo inteiro' };
}
const id = sessaoAtual?.academiaGerenciadaId || null;
return { nucleoId: id, rotulo: id ? (todosNucleos.find((n) => n.id === id)?.nome || id) : 'Meus alunos' };
}

function presencasDoEscopo(escopo) {
if (!escopo.nucleoId) return null; // grupo inteiro: não há leitura de presenças de todos os núcleos aqui
if (presencasNucleoCache && presencasNucleoCache.nucleoId === escopo.nucleoId) return presencasNucleoCache.itens;
// Admin trocou o filtro: lê as presenças desse núcleo uma vez e redesenha.
if (ehAdmin() && presencasRelatorioPendente !== escopo.nucleoId) {
presencasRelatorioPendente = escopo.nucleoId;
presencasDoNucleo(escopo.nucleoId, 400).then((itens) => {
presencasNucleoCache = { nucleoId: escopo.nucleoId, itens, visitantesAqui: [] };
presencasRelatorioPendente = null;
desenharGraficos(alunosFiltradosAtuais());
}).catch(() => { presencasRelatorioPendente = null; });
}
return null;
}

function alunosFiltradosAtuais() {
const alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno'));
const ac = ehAdmin() && selectFiltroAcademia ? selectFiltroAcademia.value : '';
return alunos.filter((a) => ac === '' || a.academiaId === ac);
}

function desenharGraficos(alunosAtuais) {
const escopo = escopoRelatorio();
const rotuloEscopo = document.getElementById('relatoriosEscopo');
if (rotuloEscopo) rotuloEscopo.textContent = escopo.rotulo;
const ativos = alunosAtuais.filter((a) => a.statusAtual !== 'Inativo');
const presencas = presencasDoEscopo(escopo);
const agora = new Date();
const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
const insights = [];

/* ---- Frequência semanal (8 semanas) ---- */
if (presencas) {
const semanas = [];
const base = inicioSemana(agora);
for (let i = 7; i >= 0; i--) { const d = new Date(base); d.setDate(d.getDate() - i * 7); semanas.push({ inicio: d, fim: new Date(d.getTime() + 7 * 86400000), n: 0 }); }
presencas.forEach((p) => { const d = dataPresenca(p); const sem = semanas.find((sm) => d >= sm.inicio && d < sm.fim); if (sem) sem.n++; });
criarGrafico('chartFrequenciaSemanal', 'line', semanas.map((sm) => `${String(sm.inicio.getDate()).padStart(2, '0')}/${MESES_CURTO[sm.inicio.getMonth()]}`), [{ label: 'check-ins', data: semanas.map((sm) => sm.n), borderColor: COR_SERIE, backgroundColor: 'rgba(21,144,127,0.12)', fill: true, tension: 0.35, pointRadius: 4, pointBackgroundColor: COR_SERIE, borderWidth: 2 }], { escalaY: true });
const atual = semanas[7].n; const anterior = semanas[6].n;
if (atual || anterior) insights.push({ icone: 'fa-chart-line', cor: atual >= anterior ? 'green' : 'gold', titulo: `${atual} check-in${atual === 1 ? '' : 's'} nesta semana`, texto: anterior ? `${atual >= anterior ? '+' : ''}${atual - anterior} em relação à semana passada (${anterior})` : 'semana passada não teve check-ins' });

/* ---- Dia da semana ---- */
const porDia = [0, 0, 0, 0, 0, 0, 0];
presencas.forEach((p) => { porDia[dataPresenca(p).getDay()]++; });
const ordemDias = [1, 2, 3, 4, 5, 6, 0];
criarGrafico('chartDiaSemana', 'bar', ordemDias.map((i) => DIAS_SEMANA[i]), [{ label: 'check-ins', data: ordemDias.map((i) => porDia[i]), backgroundColor: COR_SERIE, borderRadius: 4, maxBarThickness: 34 }], { escalaY: true });
const maxDia = Math.max(...porDia);
if (maxDia > 0) { const dia = porDia.indexOf(maxDia); insights.push({ icone: 'fa-calendar-week', cor: 'teal', titulo: `${DIAS_SEMANA[dia]} é o dia mais forte`, texto: `${maxDia} check-in${maxDia === 1 ? '' : 's'} registrados nesse dia da semana` }); }

/* ---- Ranking do mês ---- */
const porAluno = {};
presencas.filter((p) => dataPresenca(p) >= inicioMes).forEach((p) => { porAluno[p.uid] = (porAluno[p.uid] || 0) + 1; });
const ranking = Object.entries(porAluno).map(([uid, n]) => ({ nome: nomeCurto((alunosAtuais.find((a) => a.id === uid) || todosUsuarios.find((a) => a.id === uid) || {}).nome), n })).sort((a, b) => b.n - a.n).slice(0, 10);
criarGrafico('chartRankingPresenca', 'bar', ranking.map((r) => r.nome), [{ label: 'check-ins no mês', data: ranking.map((r) => r.n), backgroundColor: COR_SERIE, borderRadius: 4, maxBarThickness: 22 }], { horizontal: true, escalaY: true }, 'Nenhum check-in neste mês ainda.');
if (ranking.length) insights.push({ icone: 'fa-medal', cor: 'gold', titulo: `${ranking[0].nome} lidera a presença do mês`, texto: `${ranking[0].n} check-in${ranking[0].n === 1 ? '' : 's'} desde o dia 1` });

/* ---- Sem check-in há 30+ dias ---- */
const ultimo = {};
presencas.forEach((p) => { const t = dataPresenca(p).getTime(); if (!ultimo[p.uid] || t > ultimo[p.uid]) ultimo[p.uid] = t; });
const limite30 = agora.getTime() - 30 * 86400000;
const sumidos = ativos.filter((a) => !ultimo[a.id] || ultimo[a.id] < limite30);
if (ativos.length && presencas.length) insights.push({ icone: 'fa-user-clock', cor: sumidos.length ? 'red' : 'green', titulo: sumidos.length ? `${sumidos.length} aluno${sumidos.length === 1 ? '' : 's'} sem check-in há 30+ dias` : 'Todos os alunos ativos treinaram nos últimos 30 dias', texto: sumidos.length ? sumidos.slice(0, 3).map((a) => nomeCurto(a.nome)).join(', ') + (sumidos.length > 3 ? ` e mais ${sumidos.length - 3}` : '') : 'ótimo sinal de retenção' });
} else {
['chartFrequenciaSemanal', 'chartDiaSemana', 'chartRankingPresenca'].forEach((id) => mostrarVazio(id, escopo.nucleoId ? 'Carregando check-ins do núcleo...' : 'Escolha um núcleo em "Filtros Avançados" para ver a frequência.'));
}

/* ---- Prontidão para graduação ---- */
const prontidoes = ativos.map((a) => ({ a, ...prontidaoDe(a) })).filter((x) => x.avaliado).sort((x, y) => y.pct - x.pct);
criarGrafico('chartProntidao', 'bar', prontidoes.map((x) => nomeCurto(x.a.nome)), [{ label: '% de prontidão', data: prontidoes.map((x) => x.pct), backgroundColor: prontidoes.map((x) => (x.pct >= 70 ? COR_BOM : (x.pct >= 50 ? COR_ALERTA : COR_SERIE))), borderRadius: 4, maxBarThickness: 18 }], { horizontal: true, max: 100, sufixo: '%', linhaMeta: 70 }, 'Nenhum aluno avaliado ainda — as notas são lançadas em Avaliar/Editar.');
const aptos = prontidoes.filter((x) => x.pct >= 70);
if (prontidoes.length) insights.push({ icone: 'fa-graduation-cap', cor: aptos.length ? 'green' : 'teal', titulo: aptos.length ? `${aptos.length} aluno${aptos.length === 1 ? '' : 's'} pront${aptos.length === 1 ? 'o' : 'os'} para graduar` : 'Ninguém atingiu 70% ainda', texto: aptos.length ? aptos.slice(0, 3).map((x) => `${nomeCurto(x.a.nome)} (${x.pct}%)`).join(', ') + (aptos.length > 3 ? ` e mais ${aptos.length - 3}` : '') : `${prontidoes.length} avaliado${prontidoes.length === 1 ? '' : 's'} · melhor: ${nomeCurto(prontidoes[0].a.nome)} com ${prontidoes[0].pct}%` });
const naoAvaliados = ativos.length - prontidoes.length;
if (naoAvaliados > 0 && ativos.length) insights.push({ icone: 'fa-clipboard-question', cor: 'gold', titulo: `${naoAvaliados} aluno${naoAvaliados === 1 ? '' : 's'} ainda sem avaliação`, texto: 'lance as notas em Avaliar/Editar pra eles entrarem no termômetro' });

/* ---- Pontos fortes / a desenvolver ---- */
const soma = {}; const qtd = {};
ativos.forEach((a) => { const { crit } = prontidaoDe(a); if (!a.notas) return; crit.forEach((c) => { if (a.notas[c.id] !== undefined) { soma[c.txt] = (soma[c.txt] || 0) + (Number(a.notas[c.id]) || 0); qtd[c.txt] = (qtd[c.txt] || 0) + 1; } }); });
const medias = Object.keys(soma).map((k) => ({ k, m: soma[k] / qtd[k] })).sort((x, y) => y.m - x.m);
criarGrafico('chartFundamentos', 'bar', medias.map((x) => x.k), [{ label: 'média', data: medias.map((x) => Number(x.m.toFixed(1))), backgroundColor: COR_SERIE, borderRadius: 4, maxBarThickness: 18 }], { horizontal: true, max: 10 }, 'Sem notas lançadas ainda.');
if (medias.length >= 2) insights.push({ icone: 'fa-dumbbell', cor: 'teal', titulo: `Ponto forte: ${medias[0].k} (${medias[0].m.toFixed(1)})`, texto: `a desenvolver: ${medias[medias.length - 1].k} (${medias[medias.length - 1].m.toFixed(1)})` });

/* ---- Pirâmide ---- */
const rankCount = {};
ativos.forEach((a) => { const r = a.cordaoAtual || 'Iniciante'; rankCount[r] = (rankCount[r] || 0) + 1; });
const piram = ordemCordoes.filter((n) => rankCount[n]);
criarGrafico('chartPiramide', 'bar', piram, [{ label: 'alunos', data: piram.map((n) => rankCount[n]), backgroundColor: piram.map((n) => obterCorPorCordao(n)), borderColor: '#CFD9D6', borderWidth: 1, borderRadius: 4, maxBarThickness: 40 }], { escalaY: true }, 'Nenhum aluno ativo.');

/* ---- Matrículas por mês (12 meses) ---- */
const meses = [];
for (let i = 11; i >= 0; i--) { const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1); meses.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: `${MESES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, n: 0 }); }
let comData = 0;
alunosAtuais.forEach((a) => { if (!a.criadoEm) return; comData++; const m = meses.find((x) => String(a.criadoEm).startsWith(x.chave)); if (m) m.n++; });
criarGrafico('chartMatriculas', 'bar', meses.map((m) => m.rotulo), [{ label: 'novas matrículas', data: meses.map((m) => m.n), backgroundColor: COR_SERIE_2, borderRadius: 4, maxBarThickness: 28 }], { escalaY: true }, comData ? null : 'Os cadastros ainda não têm data de matrícula registrada.');
const ult90 = alunosAtuais.filter((a) => a.criadoEm && (agora - new Date(a.criadoEm)) <= 90 * 86400000).length;
if (comData) insights.push({ icone: 'fa-user-plus', cor: 'navy', titulo: `${ult90} nova${ult90 === 1 ? '' : 's'} matrícula${ult90 === 1 ? '' : 's'} nos últimos 90 dias`, texto: `${ativos.length} aluno${ativos.length === 1 ? '' : 's'} ativo${ativos.length === 1 ? '' : 's'} no total` });

/* ---- Faixas etárias ---- */
const faixas = [{ r: 'até 7', min: 0, max: 7 }, { r: '8–11', min: 8, max: 11 }, { r: '12–17', min: 12, max: 17 }, { r: '18–29', min: 18, max: 29 }, { r: '30–44', min: 30, max: 44 }, { r: '45+', min: 45, max: 200 }];
const porFaixa = faixas.map((f) => ativos.filter((a) => { const i = Number(a.idade) || 0; return i >= f.min && i <= f.max; }).length);
criarGrafico('chartIdades', 'bar', faixas.map((f) => f.r), [{ label: 'alunos', data: porFaixa, backgroundColor: COR_SERIE, borderRadius: 4, maxBarThickness: 34 }], { escalaY: true }, 'Nenhum aluno ativo.');

/* ---- Financeiro 6 meses ---- */
const pags = pagamentosCache && (pagamentosCache.nucleoId === escopo.nucleoId || (ehAdmin() && !escopo.nucleoId && !pagamentosCache.nucleoId)) ? pagamentosCache.itens : null;
if (pags) {
const comps = [];
for (let i = 5; i >= 0; i--) { const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1); comps.push({ chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, rotulo: `${MESES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, pago: 0, pendente: 0 }); }
pags.forEach((pg) => { const c = comps.find((x) => x.chave === pg.competencia); if (!c) return; if (pg.pago) c.pago += Number(pg.valor) || 0; else c.pendente += Number(pg.valor) || 0; });
const temValor = comps.some((c) => c.pago || c.pendente);
criarGrafico('chartFinanceiro', 'bar', comps.map((c) => c.rotulo), [
{ label: 'recebido', data: comps.map((c) => Math.round(c.pago)), backgroundColor: COR_BOM, borderRadius: 4, maxBarThickness: 26 },
{ label: 'em aberto', data: comps.map((c) => Math.round(c.pendente)), backgroundColor: COR_RUIM, borderRadius: 4, maxBarThickness: 26 },
], { escalaY: true, legenda: true, prefixo: 'R$ ' }, temValor ? null : 'Nenhuma mensalidade lançada nos últimos 6 meses.');
const abertoTotal = pags.filter((pg) => !pg.pago).reduce((sm, pg) => sm + (Number(pg.valor) || 0), 0);
const alunosAberto = new Set(pags.filter((pg) => !pg.pago).map((pg) => pg.alunoId)).size;
if (pags.length) insights.push({ icone: 'fa-credit-card', cor: abertoTotal > 0 ? 'red' : 'green', titulo: abertoTotal > 0 ? `R$ ${abertoTotal.toFixed(0)} em mensalidades em aberto` : 'Mensalidades em dia', texto: abertoTotal > 0 ? `${alunosAberto} aluno${alunosAberto === 1 ? '' : 's'} com pendência` : `${pags.length} lançamento${pags.length === 1 ? '' : 's'} no histórico` });
} else {
mostrarVazio('chartFinanceiro', 'Abra a aba Financeiro uma vez para carregar as mensalidades deste escopo.');
}

/* ---- Alunos por núcleo (admin) / Retenção ---- */
if (ehAdmin()) {
const porNucleo = {};
ativos.forEach((a) => { const k = a.academiaNome || a.academiaId || 'Sem núcleo'; porNucleo[k] = (porNucleo[k] || 0) + 1; });
const chaves = Object.keys(porNucleo).sort((x, y) => porNucleo[y] - porNucleo[x]);
criarGrafico('chartAcademias', 'bar', chaves, [{ label: 'alunos ativos', data: chaves.map((k) => porNucleo[k]), backgroundColor: COR_SERIE_2, borderRadius: 4, maxBarThickness: 22 }], { horizontal: true, escalaY: true }, 'Nenhum aluno ativo.');
}
const inativos = alunosAtuais.length - ativos.length;
criarGrafico('chartStatus', 'doughnut', ['Ativos', 'Inativos / pausa'], [{ data: [ativos.length, inativos], backgroundColor: [COR_BOM, '#CFD9D6'], borderColor: '#fff', borderWidth: 2 }], { legenda: true, rosca: true }, alunosAtuais.length ? null : 'Nenhum aluno.');
if (alunosAtuais.length) insights.push({ icone: 'fa-heart-pulse', cor: inativos ? 'gold' : 'green', titulo: `${Math.round((ativos.length / alunosAtuais.length) * 100)}% de retenção`, texto: `${ativos.length} ativo${ativos.length === 1 ? '' : 's'} · ${inativos} inativo${inativos === 1 ? '' : 's'}/pausa` });

renderizarInsights(insights);
}

function renderizarInsights(lista) {
const wrap = document.getElementById('relatoriosInsights');
if (!wrap) return;
wrap.innerHTML = lista.length
? lista.slice(0, 8).map((i) => `<div class="insight"><span class="lista-icone ${i.cor}"><i class="fas ${i.icone}"></i></span><div><strong>${escapeHTML(i.titulo)}</strong><span>${escapeHTML(i.texto)}</span></div></div>`).join('')
: '<div class="empty-state"><i class="fas fa-chart-simple"></i>Os insights aparecem conforme alunos, notas e check-ins forem sendo registrados.</div>';
}

function mostrarVazio(canvasId, msg) {
const canvas = document.getElementById(canvasId);
if (!canvas) return;
if (chartsInstances[canvasId]) { chartsInstances[canvasId].destroy(); delete chartsInstances[canvasId]; }
const wrap = canvas.parentElement;
let vazio = wrap.querySelector('.chart-vazio');
if (!vazio) { vazio = document.createElement('div'); vazio.className = 'chart-vazio'; wrap.appendChild(vazio); }
vazio.textContent = msg;
vazio.style.display = 'flex';
}

// datasets: array de datasets do Chart.js já prontos. opts: { horizontal, escalaY,
// max, sufixo, prefixo, legenda, rosca, linhaMeta }. vazioMsg: mensagem quando
// não há dados (todos zero ou sem rótulos).
function criarGrafico(canvasId, type, labels, datasets, opts = {}, vazioMsg = 'Sem dados ainda.') {
const canvas = document.getElementById(canvasId);
if (!canvas || typeof Chart === 'undefined') return;
const temDado = labels.length && datasets.some((ds) => (ds.data || []).some((v) => Number(v) > 0));
if (!temDado) { mostrarVazio(canvasId, vazioMsg || 'Sem dados ainda.'); return; }
const vazio = canvas.parentElement.querySelector('.chart-vazio');
if (vazio) vazio.style.display = 'none';
if (chartsInstances[canvasId]) { chartsInstances[canvasId].destroy(); delete chartsInstances[canvasId]; }
const fmt = (v) => `${opts.prefixo || ''}${Number(v).toLocaleString('pt-BR')}${opts.sufixo || ''}`;
const eixoValor = { beginAtZero: true, max: opts.max, grid: { color: COR_GRADE, drawBorder: false }, ticks: { color: COR_TEXTO, font: { family: 'Manrope', size: 11 }, precision: 0, callback: (v) => fmt(v) } };
const eixoCategoria = { grid: { display: false }, ticks: { color: COR_TEXTO, font: { family: 'Manrope', size: 11 }, autoSkip: false } };
const plugins = { legend: { display: !!opts.legenda, position: 'bottom', labels: { color: COR_TEXTO, font: { family: 'Manrope', size: 11 }, boxWidth: 10, boxHeight: 10, borderRadius: 3, useBorderRadius: true } }, tooltip: { backgroundColor: '#0D211D', titleFont: { family: 'Sora', size: 12 }, bodyFont: { family: 'Manrope', size: 12 }, padding: 10, cornerRadius: 10, callbacks: { label: (c) => ` ${c.dataset.label || ''}: ${fmt(c.parsed.y ?? c.parsed.x ?? c.parsed)}`.replace(/^ : /, ' ') } } };
const plugLinhaMeta = opts.linhaMeta ? [{ id: 'linhaMeta', afterDatasetsDraw(chart) { const { ctx, scales } = chart; const eixo = opts.horizontal ? scales.x : scales.y; if (!eixo) return; const pos = eixo.getPixelForValue(opts.linhaMeta); ctx.save(); ctx.strokeStyle = COR_ALERTA; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5; ctx.beginPath(); if (opts.horizontal) { ctx.moveTo(pos, chart.chartArea.top); ctx.lineTo(pos, chart.chartArea.bottom); } else { ctx.moveTo(chart.chartArea.left, pos); ctx.lineTo(chart.chartArea.right, pos); } ctx.stroke(); ctx.fillStyle = COR_ALERTA; ctx.font = '700 11px Manrope'; ctx.fillText(`meta ${opts.linhaMeta}${opts.sufixo || ''}`, opts.horizontal ? pos + 6 : chart.chartArea.left + 6, opts.horizontal ? chart.chartArea.top + 12 : pos - 6); ctx.restore(); } }] : [];
chartsInstances[canvasId] = new Chart(canvas.getContext('2d'), {
type,
data: { labels, datasets },
options: {
responsive: true, maintainAspectRatio: false,
indexAxis: opts.horizontal ? 'y' : 'x',
animation: { duration: 500, easing: 'easeOutQuart' },
cutout: opts.rosca ? '68%' : undefined,
scales: (type === 'doughnut' || type === 'pie') ? {} : (opts.horizontal ? { x: eixoValor, y: eixoCategoria } : { x: eixoCategoria, y: eixoValor }),
plugins,
},
plugins: plugLinhaMeta,
});
}

window.addEventListener('beforeunload', () => {
Object.values(chartsInstances).forEach((c) => { try { c.destroy(); } catch (_) { /* noop */ } });
chartsInstances = {};
});
