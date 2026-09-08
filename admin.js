/* admin.js — v2
   Melhorias de segurança e UX:
   - Guarda de sessão centralizada (shared.js) em vez de checagem manual solta no topo do arquivo.
   - TODO conteúdo dinâmico inserido via innerHTML passa por escapeHTML() — mitiga XSS armazenado
     (ex.: um nome de aluno contendo "<img onerror=...>" não executa mais).
   - Senha de professor nunca mais é gravada em texto puro (senhaHash).
   - Notificações via toast (não bloqueantes) substituem a maioria dos alert().
   - Gráficos: cada Chart.js é destruído antes de recriar (evita vazamento de memória) — reforçado
     com um registro central de instâncias.
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHTML, sanitizeInput, hashPassword, exigirSessao, debounce } from "./shared.js";

const usuarioLogado = exigirSessao('sessaoCapoeira', ['admin', 'professor']);
// exigirSessao já redireciona para login.html se inválido; se chegou aqui, a sessão existe.

const firebaseConfig = {
  apiKey: "AIzaSyBkwCDziiV-Uh7MLzsy9OYJmA_LMnn7jbg",
  authDomain: "capoeira-liberdade.firebaseapp.com",
  projectId: "capoeira-liberdade",
  storageBucket: "capoeira-liberdade.firebasestorage.app",
  messagingSenderId: "492022804215",
  appId: "1:492022804215:web:c61aed556d9f1aa9576df2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalizarAcademia = (nome) => {
    if (!nome) return 'Não informada';
    return nome.replace(/^Academia\s+/i, '').trim();
};

let todosAlunos = [];
let listaAcademias = [];
let academiasDBGlobais = [];
let alunoSelecionado = null;
let academiaEditandoID = null;
let deleteConfirm = false;
let chartsInstances = {};

const academiasPadrao = [
    "Mestre Profeta", "Professora Taynara", "Mestre Abraão",
    "Mestre Omar", "Mestre Carlinhos", "Professor Maick",
    "Professor Tigoy", "Professor Rafinha", "Instrutor Leiliano",
    "Professor Lebrinha"
];

const ordemCordoes = [
    "Iniciante", "Cinza Claro", "Cinza e Bege", "Bege",
    "Escravo", "Fugitivo", "Quilombola", "Vagante",
    "Liberto", "Instrutor", "Professor", "Mestre"
];

const cordoesAdulto = [
    { nome: "Iniciante", cor: ['#CCC','#CCC','#CCC'] }, { nome: "Escravo", cor: ['#4F4F4F','#4F4F4F','#4F4F4F'] },
    { nome: "Fugitivo", cor: ['#4F4F4F','#F5DEB3','#4F4F4F'] }, { nome: "Quilombola", cor: ['#DAA520','#DAA520','#DAA520'] },
    { nome: "Vagante", cor: ['#D2691E','#D32F2F','#D2691E'] }, { nome: "Liberto", cor: ['#D32F2F','#D32F2F','#D32F2F'] },
    { nome: "Instrutor", cor: ['#4F4F4F','#F5DEB3','#D32F2F'] }, { nome: "Professor", cor: ['#D32F2F','#FFFFFF','#D32F2F'] },
    { nome: "Mestre", cor: ['#F5F5F5','#F5F5F5','#F5F5F5'] }
];
const cordoesKids = [
    { nome: "Iniciante", cor: ['#CCC','#CCC','#CCC'] }, { nome: "Cinza Claro", cor: ['#D3D3D3','#D3D3D3','#D3D3D3'] },
    { nome: "Cinza e Bege", cor: ['#D3D3D3','#F5DEB3','#D3D3D3'] }, { nome: "Bege", cor: ['#F5DEB3','#F5DEB3','#F5DEB3'] }
];
const criteriosRegras = [
    { id: 'c1', txt: 'Ginga e Base', reqAdulto: 0, reqKids: true }, { id: 'c2', txt: 'Acrobacias', reqAdulto: 3, reqKids: false },
    { id: 'c3', txt: 'Respeito', reqAdulto: 0, reqKids: true }, { id: 'c4', txt: 'Disciplina', reqAdulto: 0, reqKids: true },
    { id: 'c5', txt: 'Pontualidade', reqAdulto: 0, reqKids: true }, { id: 'c6', txt: 'Freq. Aulas', reqAdulto: 0, reqKids: true },
    { id: 'c7', txt: 'Freq. Rodas', reqAdulto: 0, reqKids: true }, { id: 'c8', txt: 'Eventos', reqAdulto: 0, reqKids: true },
    { id: 'c9', txt: 'Pandeiro', reqAdulto: 5, reqKids: false }, { id: 'c10', txt: 'Atabaque', reqAdulto: 5, reqKids: false },
    { id: 'c11', txt: 'Berimbau', reqAdulto: 5, reqKids: false }, { id: 'c12', txt: 'Canta/Responde', reqAdulto: 5, reqKids: false },
    { id: 'c13', txt: 'Higiene', reqAdulto: 0, reqKids: true }, { id: 'c14', txt: 'Aprendizado', reqAdulto: 0, reqKids: true },
    { id: 'c15', txt: 'Fundamentos', reqAdulto: 0, reqKids: true }
];

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
    el.textContent = mensagem; // textContent: seguro contra XSS
    container.appendChild(el);
    setTimeout(() => {
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 320);
    }, duracaoMs);
}

document.addEventListener('DOMContentLoaded', async () => {
    const profileSpan = document.querySelector('.admin-profile span');
    if (profileSpan) profileSpan.textContent = usuarioLogado.nome;

    if (usuarioLogado.role === 'professor') {
        const abaAcademias = document.querySelector('a[onclick="mudarAba(\'academias\')"]');
        const abaFinanceiro = document.querySelector('a[onclick="mudarAba(\'financeiro\')"]');
        if (abaAcademias) abaAcademias.style.display = 'none';
        if (abaFinanceiro) abaFinanceiro.style.display = 'none';

        const headerAlunos = document.querySelector('#aba-alunos .section-header h2');
        if (headerAlunos) {
            headerAlunos.textContent = `Alunos - Academia ${usuarioLogado.academia}`;
        }
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
    }

    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        document.getElementById('nav-links').classList.toggle('show');
    });

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (confirm("Deseja realmente sair da conta?")) {
                sessionStorage.removeItem('sessaoCapoeira');
                window.location.href = 'login.html';
            }
        });
    }

    mostrarSkeletons();
    await carregarAcademias();
    await carregarAlunos();
});

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

window.mudarAba = function (abaId) {
    document.querySelectorAll('.aba-content, .nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`aba-${abaId}`).classList.add('active');
    event.currentTarget.classList.add('active');
    document.getElementById('nav-links').classList.remove('show');
};

window.irParaRelatorios = function () {
    window.mudarAba('alunos');
    setTimeout(() => { document.getElementById('secao-graficos').scrollIntoView({ behavior: 'smooth' }); }, 100);
};

async function carregarAcademias() {
    try {
        const snap = await getDocs(collection(db, "academias"));
        academiasDBGlobais = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let nomesUnicos = new Set(academiasPadrao);
        academiasDBGlobais.forEach(ac => nomesUnicos.add(normalizarAcademia(ac.nome)));
        listaAcademias = Array.from(nomesUnicos).map(nome => ({ nome }));

        let selectHtml = '<option value="">Todas as Academias</option>';
        listaAcademias.forEach(ac => selectHtml += `<option value="${escapeHTML(ac.nome)}">${escapeHTML(ac.nome)}</option>`);

        const listaPainel = document.getElementById('listaAcademiasPainel');
        if (listaPainel) {
            if (academiasDBGlobais.length === 0) {
                listaPainel.innerHTML = `<div class="empty-state"><i class="fas fa-school"></i>Nenhuma academia cadastrada ainda.</div>`;
            } else {
                listaPainel.innerHTML = academiasDBGlobais.map((ac, i) => {
                    const nomeLimpo = normalizarAcademia(ac.nome);
                    return `
                    <div class="academia-card" style="--card-index:${i}">
                        <h4><i class="fas fa-map-marker-alt"></i> ${escapeHTML(nomeLimpo)}</h4>
                        <p><strong>Prof:</strong> ${escapeHTML(ac.professor || 'Não informado')}</p>
                        <p><strong>Contato:</strong> ${escapeHTML(ac.email || 'Não informado')}</p>
                        <div class="academia-actions">
                            <button class="btn-edit-ac" onclick="abrirEditarAcademia('${ac.id}')"><i class="fas fa-edit"></i> Editar</button>
                            <button class="btn-del-ac" onclick="excluirAcademia('${ac.id}', '${escapeHTML(nomeLimpo).replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Excluir</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }
        const filtroAcademia = document.getElementById('filtroAcademia');
        if (filtroAcademia) filtroAcademia.innerHTML = selectHtml;
    } catch (e) {
        console.error(e);
        toast('Não foi possível carregar as academias.', 'error');
    }
}

const formNovaAcademia = document.getElementById('formNovaAcademia');
if (formNovaAcademia) {
    formNovaAcademia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = formNovaAcademia.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        try {
            const nomeRaw = sanitizeInput(document.getElementById('nomeAcademia').value);
            const professor = sanitizeInput(document.getElementById('nomeProfessor').value);
            const email = sanitizeInput(document.getElementById('emailProfessor').value).trim().toLowerCase();
            const senha = document.getElementById('senhaProfessor').value;

            if (senha.length < 6) { toast('A senha deve ter ao menos 6 caracteres.', 'error'); return; }

            const senhaHash = await hashPassword(senha);
            await addDoc(collection(db, "academias"), {
                nome: normalizarAcademia(nomeRaw),
                professor,
                email,
                senhaHash,
                data: new Date().toISOString()
            });
            toast("Academia cadastrada com sucesso!");
            e.target.reset();
            await carregarAcademias();
            await carregarAlunos();
        } catch (err) {
            console.error(err);
            toast("Erro ao criar academia.", 'error');
        } finally {
            btnSubmit.disabled = false;
        }
    });
}

window.excluirAcademia = async function (id, nome) {
    if (confirm(`Deseja REALMENTE excluir a academia "${nome}"? Esta ação não pode ser desfeita.`)) {
        try {
            await deleteDoc(doc(db, "academias", id));
            toast("Academia excluída.");
            await carregarAcademias();
            await carregarAlunos();
        } catch (e) {
            console.error(e);
            toast("Erro ao excluir academia.", 'error');
        }
    }
};

window.abrirEditarAcademia = function (id) {
    academiaEditandoID = id;
    const ac = academiasDBGlobais.find(a => a.id === id);
    if (ac) {
        document.getElementById('editNomeAcademia').value = normalizarAcademia(ac.nome);
        document.getElementById('editNomeProfessor').value = ac.professor || '';
        document.getElementById('editEmailProfessor').value = ac.email || '';
        document.getElementById('editSenhaProfessor').value = "";
        document.getElementById('modalEditarAcademia').style.display = 'flex';
    }
};
window.fecharModalAcademia = () => document.getElementById('modalEditarAcademia').style.display = 'none';

const formEditAcademia = document.getElementById('formEditAcademia');
if (formEditAcademia) {
    formEditAcademia.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = formEditAcademia.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        try {
            const nomeRaw = sanitizeInput(document.getElementById('editNomeAcademia').value);
            const objUpdate = {
                nome: normalizarAcademia(nomeRaw),
                professor: sanitizeInput(document.getElementById('editNomeProfessor').value),
                email: sanitizeInput(document.getElementById('editEmailProfessor').value).trim().toLowerCase()
            };
            const s = document.getElementById('editSenhaProfessor').value;
            if (s.trim() !== "") {
                if (s.trim().length < 6) { toast('A nova senha deve ter ao menos 6 caracteres.', 'error'); btnSubmit.disabled = false; return; }
                objUpdate.senhaHash = await hashPassword(s.trim());
            }

            await updateDoc(doc(db, "academias", academiaEditandoID), objUpdate);
            toast("Dados atualizados com sucesso!");
            fecharModalAcademia();
            await carregarAcademias();
            await carregarAlunos();
        } catch (e) {
            console.error(e);
            toast("Erro ao editar academia.", 'error');
        } finally {
            btnSubmit.disabled = false;
        }
    });
}

async function carregarAlunos() {
    try {
        const snap = await getDocs(collection(db, "alunos"));
        todosAlunos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        aplicarFiltros();
    } catch (e) {
        console.error(e);
        toast('Não foi possível carregar os alunos.', 'error');
        const grid = document.getElementById('gridAlunos');
        if (grid) grid.innerHTML = `<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>Erro ao carregar os dados. Tente recarregar a página.</div>`;
    }
}

const selectFiltroAcademia = document.getElementById('filtroAcademia');
if (selectFiltroAcademia) selectFiltroAcademia.addEventListener('change', aplicarFiltros);

const inputBusca = document.getElementById('buscaGeral');
if (inputBusca) inputBusca.addEventListener('input', debounce(aplicarFiltros, 200));

function aplicarFiltros() {
    let ac = document.getElementById('filtroAcademia') ? document.getElementById('filtroAcademia').value : "";
    const txt = document.getElementById('buscaGeral') ? document.getElementById('buscaGeral').value.toLowerCase() : "";

    if (usuarioLogado.role === 'professor') {
        ac = usuarioLogado.academia;
    }

    const filtrados = todosAlunos.filter(a => {
        const localLimpo = normalizarAcademia(a.localTreino);
        return (ac === "" || localLimpo === ac) && (txt === "" || (a.nome || '').toLowerCase().includes(txt));
    });

    renderizarGrid(filtrados);
    desenharGraficos(filtrados);
}

function renderizarGrid(alunos) {
    const grid = document.getElementById('gridAlunos');
    if (!grid) return;

    let optAc = '<option value="">Transferir para...</option>';
    listaAcademias.forEach(ac => { optAc += `<option value="${escapeHTML(ac.nome)}">${escapeHTML(ac.nome)}</option>`; });

    if (alunos.length === 0) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-user-slash"></i>Nenhum aluno encontrado com os filtros atuais.</div>`;
        return;
    }

    grid.innerHTML = alunos.map((a, i) => {
        const localLimpo = normalizarAcademia(a.localTreino);
        const htmlTransferencia = usuarioLogado.role === 'admin'
            ? `<select class="select-encaminhar" onchange="transferirAluno('${a.id}', this.value)">${optAc}</select>`
            : '';
        const statusCor = a.statusAtual === 'Ativo' ? '#389E92' : '#E74C3C';

        return `
            <div class="aluno-card" style="--card-index:${i}">
                <div class="card-top">
                    <img src="${escapeHTML(a.fotoUrl || 'https://via.placeholder.com/70')}" class="card-foto" alt="Foto de ${escapeHTML(a.nome || 'aluno')}" loading="lazy">
                    <div class="card-info">
                        <h3>${escapeHTML(a.nome || 'Sem nome')}</h3>
                        <p>Rank: <strong>${escapeHTML(a.cordaoAtual || 'Iniciante')}</strong></p>
                        <p>Idade: <strong>${escapeHTML(a.idade ?? '-')} anos</strong></p>
                        <p>Academia: <strong>${escapeHTML(localLimpo)}</strong></p>
                        <p>Status: <strong style="color:${statusCor}">${escapeHTML(a.statusAtual || 'Ativo')}</strong></p>
                    </div>
                </div>
                <div class="card-bottom" style="${usuarioLogado.role === 'professor' ? 'justify-content: flex-end;' : ''}">
                    ${htmlTransferencia}
                    <button class="btn-detalhes" onclick="abrirModal('${a.id}')">Avaliar / Editar</button>
                </div>
            </div>`;
    }).join('');
}

window.transferirAluno = async function (idAluno, novaAcademia) {
    if (novaAcademia === "") return;
    if (confirm(`Confirmar transferência para ${novaAcademia}?`)) {
        try {
            await updateDoc(doc(db, "alunos", idAluno), { localTreino: normalizarAcademia(novaAcademia) });
            toast("Aluno transferido!");
            await carregarAlunos();
        } catch (e) {
            console.error(e);
            toast("Erro ao transferir aluno.", 'error');
        }
    }
};

let notasAtuais = {};
let criteriosAtivos = [];

window.abrirModal = function (id) {
    alunoSelecionado = todosAlunos.find(a => a.id === id);
    if (!alunoSelecionado) return;
    deleteConfirm = false;

    const btnExcluir = document.getElementById('btnExcluirModal');
    btnExcluir.textContent = "Excluir Aluno";
    btnExcluir.classList.remove('confirm-danger');

    document.getElementById('modFoto').src = alunoSelecionado.fotoUrl || 'https://via.placeholder.com/90';
    document.getElementById('modNomeTitulo').textContent = alunoSelecionado.nome || 'Aluno';
    document.getElementById('modAcademia').textContent = normalizarAcademia(alunoSelecionado.localTreino);

    document.getElementById('modNomeInput').value = alunoSelecionado.nome || '';
    document.getElementById('modIdadeInput').value = alunoSelecionado.idade || '';
    document.getElementById('modFotoInput').value = alunoSelecionado.fotoUrl || '';
    document.getElementById('modStatus').value = alunoSelecionado.statusAtual || 'Ativo';

    const selCordao = document.getElementById('modCordao');
    selCordao.innerHTML = '';
    const idadeNumero = Number(alunoSelecionado.idade) || 0;
    const listaCordoesLocal = idadeNumero < 12 ? cordoesKids : cordoesAdulto;

    listaCordoesLocal.forEach((c, index) => { selCordao.innerHTML += `<option value="${escapeHTML(c.nome)}" data-idx="${index}">${escapeHTML(c.nome)}</option>`; });
    selCordao.value = alunoSelecionado.cordaoAtual || "Iniciante";

    notasAtuais = { ...(alunoSelecionado.notas || {}) };
    gerarCriteriosUI(listaCordoesLocal, idadeNumero);
    document.getElementById('modalAvaliacao').style.display = 'flex';
    selCordao.onchange = () => gerarCriteriosUI(listaCordoesLocal, idadeNumero);
};

function gerarCriteriosUI(listaCordoesLocal, idadeNumero) {
    const grid = document.getElementById('gridCriterios');
    let idxCordaoAtual = listaCordoesLocal.findIndex(c => c.nome === document.getElementById('modCordao').value);
    if (idxCordaoAtual === -1) idxCordaoAtual = 0;
    const proximoCordao = listaCordoesLocal[idxCordaoAtual + 1] || listaCordoesLocal[idxCordaoAtual];

    document.getElementById('textoEvolucao').innerHTML = `Progresso para: <strong>${escapeHTML(proximoCordao.nome)}</strong>`;
    const cssCordao = document.getElementById('cordaoTrancado');
    cssCordao.style.setProperty('--c1', proximoCordao.cor[0]);
    cssCordao.style.setProperty('--c2', proximoCordao.cor[1]);
    cssCordao.style.setProperty('--c3', proximoCordao.cor[2]);

    criteriosAtivos = criteriosRegras.filter(crit => idadeNumero < 12 ? crit.reqKids : idxCordaoAtual >= (crit.reqAdulto - 1));

    grid.innerHTML = criteriosAtivos.map(crit => {
        if (notasAtuais[crit.id] === undefined) notasAtuais[crit.id] = 0;
        let htmlStars = '';
        for (let i = 1; i <= 10; i++) htmlStars += `<i class="fas fa-star" data-val="${i}"></i>`;
        return `<div class="crit-item"><span>${escapeHTML(crit.txt)}</span><div class="stars-row" data-id="${crit.id}">${htmlStars}</div></div>`;
    }).join('');

    document.querySelectorAll('.stars-row').forEach(row => {
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
    criteriosAtivos.forEach(c => { if (notasAtuais[c.id]) totalPontos += Number(notasAtuais[c.id]); });
    const maxPontos = criteriosAtivos.length * 10;
    let porc = maxPontos > 0 ? (totalPontos / maxPontos) * 100 : 0;

    document.getElementById('porcentagemEvolucao').textContent = `${Math.floor(porc > 100 ? 100 : porc)}%`;
    const cssCordao = document.getElementById('cordaoTrancado');
    cssCordao.style.width = `${porc > 100 ? 100 : porc}%`;
    cssCordao.style.boxShadow = porc >= 70 ? "0 0 15px rgba(0, 230, 118, 0.8)" : "none";
}

window.excluirAlunoBtn = async function () {
    const btn = document.getElementById('btnExcluirModal');
    if (!deleteConfirm) {
        btn.textContent = "Tem certeza? Excluir";
        btn.classList.add('confirm-danger');
        deleteConfirm = true;
        setTimeout(() => { deleteConfirm = false; btn.textContent = "Excluir Aluno"; btn.classList.remove('confirm-danger'); }, 4000);
    } else {
        try {
            await deleteDoc(doc(db, "alunos", alunoSelecionado.id));
            toast("Cadastro excluído.");
            fecharModal();
            await carregarAlunos();
        } catch (e) {
            console.error(e);
            toast("Erro ao excluir aluno.", 'error');
        }
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

        await updateDoc(doc(db, "alunos", alunoSelecionado.id), {
            nome: novoNome,
            idade: novaIdade,
            fotoUrl: novaFoto,
            statusAtual: document.getElementById('modStatus').value,
            cordaoAtual: document.getElementById('modCordao').value,
            notas: notasAtuais
        });
        toast("Prontuário atualizado com sucesso!");
        fecharModal();
        await carregarAlunos();
    } catch (e) {
        console.error(e);
        toast("Erro ao salvar alterações.", 'error');
    } finally {
        btn.innerHTML = '<i class="fas fa-save"></i> Atualizar Prontuário';
        btn.disabled = false;
    }
};

window.fecharModal = () => document.getElementById('modalAvaliacao').style.display = 'none';

function obterCorPorCordao(nome) {
    const mapa = {
        'Iniciante': '#CCCCCC', 'Cinza Claro': '#D3D3D3', 'Cinza e Bege': '#C0C0C0', 'Bege': '#DEB887',
        'Escravo': '#555555', 'Fugitivo': '#8B7D6B', 'Quilombola': '#DAA520', 'Vagante': '#CD5C5C',
        'Liberto': '#D32F2F', 'Instrutor': '#800000', 'Professor': '#F08080', 'Mestre': '#F5F5F5'
    };
    return mapa[nome] || '#389E92';
}

function desenharGraficos(alunosAtuais) {
    let aptos = 0, desenv = 0, rankCount = {}, academiaCount = {}, ativos = 0, inativos = 0, kids = 0, adultos = 0;
    let fundamentosSoma = {}, fundamentosQtd = {};
    criteriosRegras.forEach(c => { fundamentosSoma[c.txt] = 0; fundamentosQtd[c.txt] = 0; });

    alunosAtuais.forEach(a => {
        const idadeAluno = Number(a.idade) || 0;
        if (idadeAluno < 12) kids++; else adultos++;
        if (a.statusAtual === 'Ativo') ativos++; else inativos++;
        const local = normalizarAcademia(a.localTreino); academiaCount[local] = (academiaCount[local] || 0) + 1;
        const rank = a.cordaoAtual || 'Iniciante'; rankCount[rank] = (rankCount[rank] || 0) + 1;

        let idxCordao = cordoesAdulto.findIndex(c => c.nome === rank);
        if (idadeAluno < 12) idxCordao = cordoesKids.findIndex(c => c.nome === rank);
        if (idxCordao === -1) idxCordao = 0;

        let critAtivosAluno = criteriosRegras.filter(crit => idadeAluno < 12 ? crit.reqKids : idxCordao >= (crit.reqAdulto - 1));
        let maxPontos = critAtivosAluno.length * 10;
        let totalPontosAluno = 0;

        if (a.notas) {
            critAtivosAluno.forEach(c => {
                if (a.notas[c.id] !== undefined) {
                    let notaVal = Number(a.notas[c.id]);
                    totalPontosAluno += notaVal;
                    fundamentosSoma[c.txt] += notaVal;
                    fundamentosQtd[c.txt] += 1;
                }
            });
            let porc = maxPontos > 0 ? (totalPontosAluno / maxPontos) * 100 : 0;
            if (maxPontos > 0 && porc >= 70) aptos++; else desenv++;
        } else { desenv++; }
    });

    let labelFundamentos = [], dataFundamentos = [];
    for (let crit in fundamentosSoma) {
        if (fundamentosQtd[crit] > 0) { labelFundamentos.push(crit); dataFundamentos.push((fundamentosSoma[crit] / fundamentosQtd[crit]).toFixed(1)); }
    }

    const colorTeal = '#389E92', colorBlue = '#002D72', colorGreen = '#00E676', colorRed = '#E74C3C', colorYellow = '#F5B041';

    criarGrafico('chartTermometro', 'pie', ['Aptos (Candidatos Formatura)', 'Em Desenvolvimento'], [aptos, desenv], [colorGreen, colorYellow]);
    criarGrafico('chartStatus', 'doughnut', ['Ativos', 'Inativos/Pausa'], [ativos, inativos], [colorTeal, colorRed]);

    let piramideLabels = [], piramideData = [], piramideColors = [];
    ordemCordoes.forEach(nomeCordao => {
        if (rankCount[nomeCordao] !== undefined) {
            piramideLabels.push(nomeCordao);
            piramideData.push(rankCount[nomeCordao]);
            piramideColors.push(obterCorPorCordao(nomeCordao));
        }
    });

    criarGrafico('chartPiramide', 'bar', piramideLabels, piramideData, piramideColors, true);
    criarGrafico('chartFundamentos', 'bar', labelFundamentos, dataFundamentos, colorTeal, true);

    const boxAcademias = document.getElementById('chartAcademias')?.closest('.chart-box');
    if (Object.keys(academiaCount).length > 1) {
        criarGrafico('chartAcademias', 'doughnut', Object.keys(academiaCount), Object.values(academiaCount), [colorTeal, colorBlue, colorGreen, colorYellow, '#8E44AD']);
        if (boxAcademias) boxAcademias.style.display = 'flex';
    } else if (boxAcademias) {
        boxAcademias.style.display = 'none';
    }

    criarGrafico('chartIdades', 'pie', ['Kids (Sub-12)', 'Adultos'], [kids, adultos], [colorGreen, colorBlue]);
}

/** Cria (ou recria) um gráfico Chart.js. SEMPRE destrói a instância anterior
 *  associada ao canvasId antes de criar uma nova — evita vazamento de memória
 *  (contextos WebGL/Canvas2D órfãos) ao trocar filtros repetidamente. */
function criarGrafico(canvasId, type, labels, data, colors, hideLegend = false) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (chartsInstances[canvasId]) {
        chartsInstances[canvasId].destroy();
        delete chartsInstances[canvasId];
    }

    chartsInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 1 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 650, easing: 'easeOutQuart' },
            plugins: { legend: { display: !hideLegend } }
        }
    });
}

// Ao sair da página, destrói todos os gráficos ativos explicitamente.
window.addEventListener('beforeunload', () => {
    Object.values(chartsInstances).forEach(c => { try { c.destroy(); } catch (_) {} });
    chartsInstances = {};
});
