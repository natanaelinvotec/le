/* master.js — Painel do Fundador (Admin Master). Rota própria, exclusiva de
quem tem papel 'admin' em usuarios/{uid}.papeis. Visão consolidada da rede
inteira (todos os núcleos): alunos ativos, estrela viva, pendências
financeiras e quem tem acessoGeral (fundador) ligado. Não duplica a gestão
operacional (isso continua em admin.html) — é só o painel de cima, de
observação e auditoria.
*/
import {
observarSessao, entrar, sair, buscar, listar, calcularEstrelaViva, souFundador,
atualizar, salvar, aprovarVinculoFamilia,
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

// Entra quem tem papel 'admin' OU acessoGeral (o fundador do grupo, Mestre
// Profeta — que administra um núcleo como mestre mas não tem o papel
// literal 'admin'). Antes só 'admin' entrava aqui, então o próprio fundador
// nunca conseguia abrir o Painel do Fundador de verdade.
observarSessao(async (user) => {
if (!user) { mostrarTela(telaLogin); return; }
try {
const perfil = await buscar('usuarios', user.uid);
if (!perfil || !((perfil.papeis || []).includes('admin') || souFundador(perfil))) {
mostrarTela(telaBloqueado);
return;
}
mostrarTela(appMaster);
await carregarVisaoGeral(perfil);
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

let todosUsuariosMaster = [];
let solicitacoesCacheMaster = [];

const ROTULOS_TIPO_SOLIC = { mensalidade: 'mensalidade', evento: 'evento', transferencia: 'transferência', vinculo_familia: 'vínculo de família' };

function descreverSolicitacaoMaster(s) {
const d = s.dadosPedido || {};
if (s.tipo === 'mensalidade') return `Alterar mensalidade para R$ ${Number(d.novoValor || 0).toFixed(2)}`;
if (s.tipo === 'evento') return `${escapeHTML(d.nome || 'Evento')} — ${escapeHTML(d.data || 'data a definir')}`;
if (s.tipo === 'transferencia') return `Transferir para ${escapeHTML(d.destinoNome || 'outro núcleo')}`;
if (s.tipo === 'vinculo_familia') return 'Vínculo de família (responsável ↔ aluno)';
return 'Solicitação';
}

async function carregarVisaoGeral(perfilLogado) {
const kpis = document.getElementById('kpisMaster');
const tabela = document.getElementById('tabelaNucleosMaster');
const listaF = document.getElementById('listaFundadores');
const listaSolic = document.getElementById('listaSolicitacoesMaster');
kpis.innerHTML = '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>'.repeat(4);
tabela.innerHTML = '';
listaF.innerHTML = '';
if (listaSolic) listaSolic.innerHTML = '';

try {
const [usuarios, nucleos, pagamentos, solicitacoes, presencas] = await Promise.all([
listar('usuarios'), listar('nucleos'), listar('pagamentos'), listar('solicitacoes'), listar('presencas'),
]);
todosUsuariosMaster = usuarios;

const alunos = usuarios.filter((u) => (u.papeis || []).includes('aluno'));
const alunosAtivos = alunos.filter((a) => a.statusAtual !== 'Inativo');
const nucleosAtivos = nucleos.filter((n) => n.ativo);
const pendentes = pagamentos.filter((p) => !p.pago);
const totalPendente = pendentes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
const fundadores = usuarios.filter((u) => u.acessoGeral === true);
const solicPendentes = solicitacoes.filter((s) => s.status === 'pendente');
solicitacoesCacheMaster = solicPendentes;
const confirmadas = presencas.filter((p) => p.confirmadoAos30 === true);
const presencaGeralPct = presencas.length ? Math.round((confirmadas.length / presencas.length) * 100) : null;

kpis.innerHTML = `
<div class="kpi-card"><span>Núcleos Ativos</span><strong>${nucleosAtivos.length}</strong></div>
<div class="kpi-card kpi-sucesso"><span>Alunos Ativos na Rede</span><strong>${alunosAtivos.length}</strong></div>
<div class="kpi-card"><span>Presença Geral</span><strong>${presencaGeralPct != null ? presencaGeralPct + '%' : '—'}</strong></div>
<div class="kpi-card ${solicPendentes.length > 0 ? 'kpi-alerta' : ''}"><span>Solicitações Pendentes</span><strong>${solicPendentes.length}</strong></div>
<div class="kpi-card ${totalPendente > 0 ? 'kpi-alerta' : ''}"><span>Pendências Financeiras</span><strong>R$ ${totalPendente.toFixed(2)}</strong></div>
<div class="kpi-card"><span>Contas com Acesso Geral</span><strong>${fundadores.length}</strong></div>
`;

if (listaSolic) {
if (!solicPendentes.length) {
listaSolic.innerHTML = '<div class="empty-state"><i class="fas fa-circle-check"></i>Nenhuma solicitação pendente no momento.</div>';
} else {
listaSolic.innerHTML = solicPendentes.map((s) => {
const nucleo = nucleos.find((n) => n.id === s.academiaId);
const solicitante = usuarios.find((u) => u.id === s.solicitanteUid);
return `
<div class="lista-item">
<div class="lista-item-info">
<strong>${escapeHTML(ROTULOS_TIPO_SOLIC[s.tipo] || s.tipo || 'Solicitação')} — ${escapeHTML(nucleo ? nucleo.nome : (s.academiaId || ''))} <span class="pill pill-pendente">pendente</span></strong>
<span>${descreverSolicitacaoMaster(s)} · pedido por ${escapeHTML(solicitante ? solicitante.nome : 'alguém do núcleo')}</span>
</div>
<div style="display:flex; gap:8px;">
<button class="btn-mini btn-mini-aprovar" onclick="window.__masterAprovarSolicitacao('${s.id}')">Aprovar</button>
<button class="btn-mini btn-mini-rejeitar" onclick="window.__masterRejeitarSolicitacao('${s.id}')">Rejeitar</button>
</div>
</div>`;
}).join('');
}
}

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

// Aprovar/rejeitar direto do Painel do Fundador — mesmo efeito aplicado que
// no painel de gestão (admin.js): mensalidade atualiza o núcleo, evento cria
// o documento em eventos, transferência muda o academiaId do aluno, vínculo
// de família usa a mesma função de sempre. Precisa das regras do Firestore
// com souFundador() aditivo em usuarios/nucleos/eventos/solicitacoes.
window.__masterAprovarSolicitacao = async function (id) {
const sol = solicitacoesCacheMaster.find((s) => s.id === id);
if (!sol) { alert('Solicitação não encontrada — recarregue a página e tente de novo.'); return; }
try {
if (sol.tipo === 'mensalidade') {
await atualizar('nucleos', sol.academiaId, { mensalidadeValor: Number(sol.dadosPedido.novoValor) || 0 });
} else if (sol.tipo === 'evento') {
await salvar('eventos', `${sol.academiaId}-${Date.now()}`, {
nome: sol.dadosPedido.nome, data: sol.dadosPedido.data, descricao: sol.dadosPedido.descricao || '',
academiaId: sol.academiaId, criadoEm: new Date().toISOString(),
});
} else if (sol.tipo === 'transferencia') {
const alunoAtual = todosUsuariosMaster.find((u) => u.id === sol.dadosPedido.alunoUid);
await atualizar('usuarios', sol.dadosPedido.alunoUid, {
academiaId: sol.dadosPedido.destinoId, academiaNome: sol.dadosPedido.destinoNome,
academiaAnteriorId: alunoAtual ? alunoAtual.academiaId : sol.academiaId,
origemTransferenciaDireta: true,
});
} else if (sol.tipo === 'vinculo_familia') {
await aprovarVinculoFamilia(sol.solicitanteUid, sol.dadosPedido.alunoRelacionadoUid);
}
await atualizar('solicitacoes', id, { status: 'aprovado' });
await carregarVisaoGeral();
} catch (e) {
console.error(e);
alert('Erro ao aprovar a solicitação. Confirme se as regras do Firestore já foram publicadas com o acesso do fundador.');
}
};

window.__masterRejeitarSolicitacao = async function (id) {
if (!confirm('Rejeitar esta solicitação?')) return;
try {
await atualizar('solicitacoes', id, { status: 'rejeitado' });
await carregarVisaoGeral();
} catch (e) {
console.error(e);
alert('Erro ao rejeitar a solicitação.');
}
};
