/* master.js — Painel do Fundador (Admin Master). Rota própria, exclusiva de
quem tem papel 'admin' em usuarios/{uid}.papeis. Visão consolidada da rede
inteira (todos os núcleos): alunos ativos, estrela viva, pendências
financeiras e quem tem acessoGeral (fundador) ligado. Não duplica a gestão
operacional (isso continua em admin.html) — é só o painel de cima, de
observação e auditoria.
*/
import {
observarSessao, entrar, sair, buscar, listar, calcularEstrelaViva,
} from './firebase.js';
import { escapeHTML } from './shared.js';

const telaLogin = document.getElementById('telaLogin');
const telaBloqueado = document.getElementById('telaBloqueado');
const appMaster = document.getElementById('appMaster');
const loginMsg = document.getElementById('loginMsg');
const formLogin = document.getElementById('formLogin');

function mostrarTela(tela) {
[telaLogin, telaBloqueado, appMaster].forEach((t) => t.classList.add('oculto'));
tela.classList.remove('oculto');
}

observarSessao(async (user) => {
if (!user) { mostrarTela(telaLogin); return; }
try {
const perfil = await buscar('usuarios', user.uid);
if (!perfil || !(perfil.papeis || []).includes('admin')) {
mostrarTela(telaBloqueado);
return;
}
mostrarTela(appMaster);
await carregarVisaoGeral();
} catch (e) {
console.error(e);
mostrarTela(telaLogin);
}
});

formLogin.addEventListener('submit', async (e) => {
e.preventDefault();
const btn = document.getElementById('btnEntrarMaster');
loginMsg.textContent = '';
btn.disabled = true;
btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
try {
await entrar(document.getElementById('loginEmail').value, document.getElementById('loginSenha').value);
// observarSessao acima decide entre painel e bloqueio.
} catch (err) {
console.error(err);
loginMsg.textContent = 'E-mail ou senha inválidos.';
} finally {
btn.disabled = false;
btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Entrar';
}
});

document.getElementById('btnLogoutMaster').addEventListener('click', () => sair());
document.getElementById('btnSairBloqueado').addEventListener('click', () => sair());

async function carregarVisaoGeral() {
const kpis = document.getElementById('kpisMaster');
const tabela = document.getElementById('tabelaNucleosMaster');
const listaF = document.getElementById('listaFundadores');
kpis.innerHTML = '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>'.repeat(4);
tabela.innerHTML = '';
listaF.innerHTML = '';

try {
const [usuarios, nucleos, pagamentos] = await Promise.all([
listar('usuarios'), listar('nucleos'), listar('pagamentos'),
]);

const alunos = usuarios.filter((u) => (u.papeis || []).includes('aluno'));
const alunosAtivos = alunos.filter((a) => a.statusAtual !== 'Inativo');
const nucleosAtivos = nucleos.filter((n) => n.ativo);
const pendentes = pagamentos.filter((p) => !p.pago);
const totalPendente = pendentes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
const fundadores = usuarios.filter((u) => u.acessoGeral === true);

kpis.innerHTML = `
<div class="kpi-card"><span>Núcleos Ativos</span><strong>${nucleosAtivos.length}</strong></div>
<div class="kpi-card kpi-sucesso"><span>Alunos Ativos na Rede</span><strong>${alunosAtivos.length}</strong></div>
<div class="kpi-card ${totalPendente > 0 ? 'kpi-alerta' : ''}"><span>Pendências Financeiras</span><strong>R$ ${totalPendente.toFixed(2)}</strong></div>
<div class="kpi-card"><span>Contas com Acesso Geral</span><strong>${fundadores.length}</strong></div>
`;

if (!nucleos.length) {
tabela.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i>Nenhum núcleo cadastrado ainda.</div>';
} else {
tabela.innerHTML = nucleos.map((n, i) => {
const responsavel = usuarios.find((u) => u.id === n.professorUid);
const alunosDoNucleo = alunos.filter((a) => a.academiaId === n.id && a.statusAtual !== 'Inativo');
const estrela = calcularEstrelaViva(n.id, usuarios);
const pendenteNucleo = pendentes.filter((p) => p.academiaId === n.id).reduce((s, p) => s + (Number(p.valor) || 0), 0);
const estrelasHtml = estrela > 0
? `<span class="estrela-viva"><span style="color:var(--star-filled)">${'★'.repeat(estrela)}</span><span style="color:var(--star-empty)">${'★'.repeat(7 - estrela)}</span></span>`
: '';
return `
<div class="academia-card nucleo-master-card" style="--card-index:${i}">
<h4>${escapeHTML(n.nome || 'Núcleo')}${!n.ativo ? ' <span class="badge" style="background:#999;">Inativo</span>' : ''}</h4>
<p>Responsável: <strong>${escapeHTML(responsavel ? responsavel.nome : '—')}</strong></p>
<p>Alunos ativos: <strong>${alunosDoNucleo.length}</strong></p>
<p>Mensalidade: <strong>R$ ${Number(n.mensalidadeValor || 0).toFixed(2)}</strong></p>
<p>Pendências: <strong style="color:${pendenteNucleo > 0 ? '#E74C3C' : '#00B140'}">R$ ${pendenteNucleo.toFixed(2)}</strong></p>
${estrelasHtml}
</div>`;
}).join('');
}

if (!fundadores.length) {
listaF.innerHTML = '<div class="empty-state"><i class="fas fa-crown"></i>Nenhuma conta com acesso geral configurada.</div>';
} else {
listaF.innerHTML = fundadores.map((f) => `
<div class="lista-item">
<div class="lista-item-info"><strong>${escapeHTML(f.nome || f.email || 'Sem nome')}</strong><span>${escapeHTML(f.email || '')}</span></div>
<span class="pill pill-aprovado">Acesso Geral</span>
</div>`).join('');
}
} catch (e) {
console.error(e);
kpis.innerHTML = '';
tabela.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>Erro ao carregar a visão geral da rede. Tente recarregar a página.</div>';
}
}
