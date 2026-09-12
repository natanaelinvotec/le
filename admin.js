/* admin.js — v3: painel único para Admin Master e Mestre/Professor.
   Autenticado por Firebase Authentication (não mais sessionStorage/hash).
   - Admin: vê e gerencia todos os usuários, cria/edita núcleos, aprova ou
     rejeita solicitações, publica avisos para todo mundo, dispara redefinição
     de senha de qualquer conta.
   - Mestre/professor: vê e avalia só os alunos do próprio núcleo
     (academiaGerenciadaId), não transfere aluno nem edita mensalidade/evento
     direto — precisa abrir uma solicitação para o admin aprovar.
*/
import {
    observarSessao, entrar, recuperarSenha, sair,
    buscar, listar, listarPorAcademia, salvar, atualizar,
    criarSolicitacao, minhasSolicitacoes, criarContaComoAdmin,
    publicarAviso, listarAvisos,
} from './firebase.js';
import { escapeHTML, sanitizeInput, debounce, gerarSlug } from './shared.js';

let sessaoAtual = null; // { uid, nome, email, papeis, academiaId, academiaGerenciadaId, ... }

const ehAdmin = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('admin');
const ehMestre = () => !!sessaoAtual && (sessaoAtual.papeis || []).includes('mestre');

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
const telaLogin = document.getElementById('telaLogin');
const appPainel = document.getElementById('appPainel');
const formLogin = document.getElementById('formLogin');
const loginMsg = document.getElementById('loginMsg');

function mostrarTelaLogin() {
    telaLogin.classList.remove('oculto');
    appPainel.classList.add('oculto');
}

observarSessao(async (user) => {
    if (!user) { sessaoAtual = null; mostrarTelaLogin(); return; }
    try {
        const perfil = await buscar('usuarios', user.uid);
        if (!perfil || !((perfil.papeis || []).includes('admin') || (perfil.papeis || []).includes('mestre'))) {
            toast('Esta conta não tem acesso ao painel de gestão. Use o app do aluno.', 'error');
            await sair();
            mostrarTelaLogin();
            return;
        }
        sessaoAtual = { uid: user.uid, ...perfil };
        await iniciarPainel();
    } catch (e) {
        console.error(e);
        mostrarTelaLogin();
    }
});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnEntrarPainel');
    const email = document.getElementById('loginEmail').value;
    const senha = document.getElementById('loginSenha').value;
    loginMsg.textContent = '';
    loginMsg.classList.remove('ok');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    try {
        const perfil = await entrar(email, senha);
        if (!((perfil.papeis || []).includes('admin') || (perfil.papeis || []).includes('mestre'))) {
            await sair();
            loginMsg.textContent = 'Esta conta é de aluno/responsável e não tem acesso a este painel.';
            return;
        }
        // observarSessao acima cuida de iniciar o painel.
    } catch (err) {
        console.error(err);
        loginMsg.textContent = 'E-mail ou senha inválidos.';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Entrar';
    }
});

document.getElementById('btnEsqueciSenhaPainel').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    if (!email) { loginMsg.textContent = 'Digite seu e-mail no campo acima primeiro.'; return; }
    try {
        await recuperarSenha(email);
    } catch (_) { /* mensagem genérica de qualquer forma, não revela se o e-mail existe */ }
    loginMsg.textContent = 'Se este e-mail existir em nossa base, enviamos um link de redefinição de senha.';
    loginMsg.classList.add('ok');
});

document.getElementById('btnLogout').addEventListener('click', () => {
    if (confirm('Deseja realmente sair da conta?')) sair();
});

/* ===================== ESTADO GERAL ===================== */
let todosUsuarios = [];
let todosNucleos = [];
let usuarioSelecionado = null;
let nucleoEditandoID = null;
let statusToggleConfirm = false;
let chartsInstances = {};

async function iniciarPainel() {
    telaLogin.classList.add('oculto');
    appPainel.classList.remove('oculto');

    const admin = ehAdmin();
    document.querySelectorAll('[data-papel="admin"]').forEach((el) => { el.style.display = admin ? '' : 'none'; });
    document.querySelectorAll('[data-papel="mestre"]').forEach((el) => { el.style.display = admin ? 'none' : ''; });

    document.getElementById('nomePerfilLogado').textContent = sessaoAtual.nome || sessaoAtual.email;

    let nomeNucleoProprio = '';
    if (!admin && sessaoAtual.academiaGerenciadaId) {
        const nuc = await buscar('nucleos', sessaoAtual.academiaGerenciadaId);
        nomeNucleoProprio = nuc ? nuc.nome : sessaoAtual.academiaGerenciadaId;
    }
    document.getElementById('tituloAbaAlunos').textContent = admin ? 'Todos os Alunos' : `Meus Alunos — ${nomeNucleoProprio}`;
    document.getElementById('tituloAbaSolicitacoes').textContent = admin ? 'Solicitações Recebidas' : 'Minhas Solicitações';

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('nav-links').classList.toggle('show');
    });

    mostrarSkeletons();
    await Promise.all([
        carregarNucleos(),
        carregarUsuarios(),
        carregarSolicitacoes(),
        carregarAvisos(),
    ]);
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
            lista.innerHTML = todosNucleos.map((n, i) => `
                <div class="academia-card" style="--card-index:${i}">
                    <h4><i class="fas fa-map-marker-alt"></i> ${escapeHTML(n.nome)}</h4>
                    <p><strong>Mensalidade:</strong> ${n.mensalidadeValor ? `R$ ${Number(n.mensalidadeValor).toFixed(2)}` : 'Não informada'}</p>
                    <p><strong>Status:</strong> ${n.ativo ? 'Ativo' : 'Inativo'}</p>
                    <div class="academia-actions">
                        <button class="btn-edit-ac" onclick="abrirEditarNucleo('${n.id}')"><i class="fas fa-edit"></i> Editar</button>
                    </div>
                </div>`).join('');
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
            await atualizar('nucleos', nucleoEditandoID, {
                nome: sanitizeInput(document.getElementById('editNomeNucleo').value),
                mensalidadeValor: Number(document.getElementById('editMensalidadeNucleo').value) || 0,
                ativo: document.getElementById('editAtivoNucleo').value === 'true',
            });
            toast('Núcleo atualizado!');
            window.fecharModalNucleo();
            await carregarNucleos();
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
        } else {
            const { itens } = await listarPorAcademia('usuarios', sessaoAtual.academiaGerenciadaId || '__none__', 300);
            todosUsuarios = itens;
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
if (selectFiltroAcademia) selectFiltroAcademia.addEventListener('change', aplicarFiltros);

const inputBusca = document.getElementById('buscaGeral');
if (inputBusca) inputBusca.addEventListener('input', debounce(aplicarFiltros, 200));

function aplicarFiltros() {
    const alunos = todosUsuarios.filter((u) => (u.papeis || []).includes('aluno'));
    const ac = ehAdmin() && selectFiltroAcademia ? selectFiltroAcademia.value : '';
    const txt = inputBusca ? inputBusca.value.toLowerCase() : '';

    const filtrados = alunos.filter((a) => (ac === '' || a.academiaId === ac) && (txt === '' || (a.nome || '').toLowerCase().includes(txt)));

    renderizarGrid(filtrados);
    desenharGraficos(filtrados);
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

        return `
            <div class="aluno-card" style="--card-index:${i}">
                <div class="card-top">
                    <img src="${escapeHTML(a.fotoUrl || 'https://via.placeholder.com/70')}" class="card-foto" alt="Foto de ${escapeHTML(a.nome || 'aluno')}" loading="lazy">
                    <div class="card-info">
                        <h3>${escapeHTML(a.nome || 'Sem nome')} ${(a.papeis || []).includes('mestre') ? '<span class="badge">Mestre</span>' : ''}</h3>
                        <p>Rank: <strong>${escapeHTML(a.cordaoAtual || 'Iniciante')}</strong></p>
                        <p>Idade: <strong>${escapeHTML(a.idade ?? '-')} anos</strong></p>
                        <p>Núcleo: <strong>${escapeHTML(a.academiaNome || a.academiaId || '-')}</strong></p>
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
            await atualizar('usuarios', idAluno, { academiaId: novoNucleoId, academiaNome: nucleo.nome });
            toast('Aluno transferido!');
            await carregarUsuarios();
        } catch (e) {
            console.error(e);
            toast('Erro ao transferir aluno.', 'error');
        }
    }
};

/* --- Modal de avaliação/edição (cordão + critérios), igual ao sistema
   anterior, agora lendo/gravando em usuarios/{id}. --- */
const ordemCordoes = [
    'Iniciante', 'Cinza Claro', 'Cinza e Bege', 'Bege',
    'Escravo', 'Fugitivo', 'Quilombola', 'Vagante',
    'Liberto', 'Instrutor', 'Professor', 'Mestre',
];
const cordoesAdulto = [
    { nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Escravo', cor: ['#4F4F4F', '#4F4F4F', '#4F4F4F'] },
    { nome: 'Fugitivo', cor: ['#4F4F4F', '#F5DEB3', '#4F4F4F'] }, { nome: 'Quilombola', cor: ['#DAA520', '#DAA520', '#DAA520'] },
    { nome: 'Vagante', cor: ['#D2691E', '#D32F2F', '#D2691E'] }, { nome: 'Liberto', cor: ['#D32F2F', '#D32F2F', '#D32F2F'] },
    { nome: 'Instrutor', cor: ['#4F4F4F', '#F5DEB3', '#D32F2F'] }, { nome: 'Professor', cor: ['#D32F2F', '#FFFFFF', '#D32F2F'] },
    { nome: 'Mestre', cor: ['#F5F5F5', '#F5F5F5', '#F5F5F5'] },
];
const cordoesKids = [
    { nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Cinza Claro', cor: ['#D3D3D3', '#D3D3D3', '#D3D3D3'] },
    { nome: 'Cinza e Bege', cor: ['#D3D3D3', '#F5DEB3', '#D3D3D3'] }, { nome: 'Bege', cor: ['#F5DEB3', '#F5DEB3', '#F5DEB3'] },
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

let notasAtuais = {};
let criteriosAtivos = [];

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

    const selCordao = document.getElementById('modCordao');
    selCordao.innerHTML = '';
    const idadeNumero = Number(usuarioSelecionado.idade) || 0;
    const listaCordoesLocal = idadeNumero < 12 ? cordoesKids : cordoesAdulto;

    listaCordoesLocal.forEach((c, index) => { selCordao.innerHTML += `<option value="${escapeHTML(c.nome)}" data-idx="${index}">${escapeHTML(c.nome)}</option>`; });
    selCordao.value = usuarioSelecionado.cordaoAtual || 'Iniciante';

    notasAtuais = { ...(usuarioSelecionado.notas || {}) };
    gerarCriteriosUI(listaCordoesLocal, idadeNumero);
    document.getElementById('modalAvaliacao').style.display = 'flex';
    selCordao.onchange = () => gerarCriteriosUI(listaCordoesLocal, idadeNumero);
};

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

    document.querySelectorAll('.stars-row').forEach((row) => {
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

window.salvarEdicaoAluno = async function () {
    const btn = document.getElementById('btnSalvarModal');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
    btn.disabled = true;
    try {
        const novoNome = sanitizeInput(document.getElementById('modNomeInput').value);
        const novaIdade = Number(document.getElementById('modIdadeInput').value);
        const novaFoto = sanitizeInput(document.getElementById('modFotoInput').value);

        if (!novoNome) { toast('O nome do aluno não pode ficar vazio.', 'error'); return; }
        if (!Number.isFinite(novaIdade) || novaIdade < 0 || novaIdade > 120) { toast('Informe uma idade válida.', 'error'); return; }

        await atualizar('usuarios', usuarioSelecionado.id, {
            nome: novoNome,
            idade: novaIdade,
            fotoUrl: novaFoto,
            statusAtual: document.getElementById('modStatus').value,
            cordaoAtual: document.getElementById('modCordao').value,
            notas: notasAtuais,
        });
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
            if (!aluno || !destino) { toast('Selecione o aluno e o núcleo de destino.', 'error'); return; }
            await enviarSolicitacao('transferencia', {
                alunoUid,
                alunoNome: aluno.nome,
                destinoId,
                destinoNome: destino.nome,
                motivo: sanitizeInput(document.getElementById('solicTransferMotivo').value),
            });
        } catch (err) { console.error(err); toast('Erro ao enviar solicitação.', 'error'); }
    });
}

function descreverSolicitacao(s) {
    if (s.tipo === 'mensalidade') return `Alterar mensalidade para R$ ${Number(s.dadosPedido?.novoValor || 0).toFixed(2)}`;
    if (s.tipo === 'evento') return `Criar evento "${s.dadosPedido?.nome || ''}" em ${s.dadosPedido?.data || '-'}`;
    if (s.tipo === 'transferencia') return `Transferir ${s.dadosPedido?.alunoNome || ''} para ${s.dadosPedido?.destinoNome || ''}`;
    return s.tipo;
}

async function carregarSolicitacoes() {
    try {
        if (ehAdmin()) {
            const todas = await listar('solicitacoes');
            todas.sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
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
        } else {
            const minhas = await minhasSolicitacoes(sessaoAtual.uid);
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
        }
    } catch (e) {
        console.error(e);
        toast('Não foi possível carregar as solicitações.', 'error');
    }
}

window.aprovarSolicitacao = async function (id) {
    try {
        const sol = (await listar('solicitacoes')).find((s) => s.id === id);
        if (!sol) return;
        if (sol.tipo === 'mensalidade') {
            await atualizar('nucleos', sol.academiaId, { mensalidadeValor: Number(sol.dadosPedido.novoValor) || 0 });
        } else if (sol.tipo === 'evento') {
            await salvar('eventos', `${sol.academiaId}-${Date.now()}`, {
                nome: sol.dadosPedido.nome, data: sol.dadosPedido.data, descricao: sol.dadosPedido.descricao || '',
                academiaId: sol.academiaId, criadoEm: new Date().toISOString(),
            });
        } else if (sol.tipo === 'transferencia') {
            await atualizar('usuarios', sol.dadosPedido.alunoUid, {
                academiaId: sol.dadosPedido.destinoId, academiaNome: sol.dadosPedido.destinoNome,
            });
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

/* ===================== GRÁFICOS ===================== */
function obterCorPorCordao(nome) {
    const mapa = {
        Iniciante: '#CCCCCC', 'Cinza Claro': '#D3D3D3', 'Cinza e Bege': '#C0C0C0', Bege: '#DEB887',
        Escravo: '#555555', Fugitivo: '#8B7D6B', Quilombola: '#DAA520', Vagante: '#CD5C5C',
        Liberto: '#D32F2F', Instrutor: '#800000', Professor: '#F08080', Mestre: '#F5F5F5',
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
