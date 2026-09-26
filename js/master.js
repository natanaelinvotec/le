/* master.js — Painel do Fundador (Admin Master / Fundador com acessoGeral).
Rota própria, exclusiva de quem tem papel 'admin' OU acessoGeral. Visão consolidada da rede
inteira (todos os núcleos): alunos ativos, estrela viva, pendências
financeiras e quem tem acessoGeral (fundador) ligado. Não duplica a gestão
operacional (isso continua em admin.html) — é só o painel de cima, de
observação e auditoria.
*/
import {
observarSessao, entrar, sair, buscar, listar, calcularEstrelaViva, souFundador, ORDEM_ESTRELA,
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
let perfilMaster = null; // perfil de quem está logado (pra o cabeçalho)

const ICONE_SOLIC_MASTER = { mensalidade: 'green fa-credit-card', evento: 'gold fa-calendar-day', transferencia: 'red fa-right-left', vinculo_familia: 'purple fa-user-group' };

function iniciais(nome) {
return String(nome || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'CL';
}

// Cabeçalho do mockup: anel nas cores do grupo, nome, chips (ACESSO GERAL /
// ADMIN / cordão). Tudo lido do próprio cadastro em usuarios/{uid}.
function renderizarCabecalhoFundador(perfil) {
const wrap = document.getElementById('cabecalhoFundador');
if (!wrap || !perfil) return;
const ehAdminLiteral = (perfil.papeis || []).includes('admin');
wrap.innerHTML = `
<div class="fundador-anel"><div class="fundador-anel-miolo">${perfil.fotoUrl ? `<img src="${escapeHTML(perfil.fotoUrl)}" alt="">` : escapeHTML(iniciais(perfil.nome))}</div></div>
<div class="fundador-cabecalho-info">
<span class="eyebrow">Painel do Fundador</span>
<h1>${escapeHTML(perfil.nome || perfil.email || 'Fundador')}</h1>
<div class="fundador-chips">
${souFundador(perfil) ? '<span class="pill pill-gold"><i class="fas fa-star"></i> Acesso Geral</span>' : ''}
${ehAdminLiteral ? '<span class="pill pill-navy">Admin Master</span>' : ''}
${perfil.cordaoAtual ? `<span class="pill pill-neutra">Cordão ${escapeHTML(perfil.cordaoAtual)}</span>` : ''}
</div>
<p>Cordão giratório nas cores do grupo (azul, verde e dourado) — o mesmo selo de identidade usado no perfil de cada membro. Os números abaixo são da rede inteira, lidos direto do cadastro.</p>
</div>`;
}

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
if (perfilLogado) perfilMaster = perfilLogado;
renderizarCabecalhoFundador(perfilMaster);
const kpis = document.getElementById('kpisMaster');
const tabela = document.getElementById('tabelaNucleosMaster');
const listaF = document.getElementById('listaFundadores');
const listaSolic = document.getElementById('listaSolicitacoesMaster');
const indicador = document.getElementById('indicadorEstrelas');
const contador = document.getElementById('contadorSolicMaster');
kpis.innerHTML = '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>'.repeat(4);
tabela.innerHTML = '';
listaF.innerHTML = '';
if (listaSolic) listaSolic.innerHTML = '';

try {
const [usuarios, nucleos, pagamentos, solicitacoes, presencas, eventos] = await Promise.all([
listar('usuarios'), listar('nucleos'), listar('pagamentos'), listar('solicitacoes'), listar('presencas'), listar('eventos'),
]);
todosUsuariosMaster = usuarios;
const hojeStr = new Date().toISOString().slice(0, 10);
const eventosFuturos = eventos.filter((e) => (e.data || '') >= hojeStr);

const alunos = usuarios.filter((u) => (u.papeis || []).includes('aluno'));
const alunosAtivos = alunos.filter((a) => a.statusAtual !== 'Inativo');
const nucleosAtivos = nucleos.filter((n) => n.ativo);
const pendentes = pagamentos.filter((p) => !p.pago);
const totalPendente = pendentes.reduce((s, p) => s + (Number(p.valor) || 0), 0);
const fundadores = usuarios.filter((u) => u.acessoGeral === true);
const solicPendentes = solicitacoes.filter((s) => s.status === 'pendente');
solicitacoesCacheMaster = solicPendentes;
// Sem "confirmação aos 30 min": conta check-ins reais dos últimos 30 dias.
const limite30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
const dataDe = (p) => (p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm));
const checkins30 = presencas.filter((p) => dataDe(p).getTime() >= limite30);
const alunosAtivos30 = new Set(checkins30.map((p) => p.uid)).size;

// Tiles do mockup (p.4): núcleos ativos, presença geral, solicitações
// pendentes, batizados/eventos marcados — e mais três da rede. Tudo real.
const tiles = [
{ cor: 'navy', valor: String(nucleosAtivos.length), rotulo: 'núcleos ativos', icone: 'fa-building' },
{ cor: 'teal', valor: String(checkins30.length), rotulo: 'check-ins nos últimos 30 dias', icone: 'fa-location-dot', nota: checkins30.length ? `${alunosAtivos30} aluno${alunosAtivos30 === 1 ? '' : 's'} treinando · ${presencas.length} no total` : 'sem check-ins registrados' },
{ cor: solicPendentes.length ? 'gold' : 'teal', valor: String(solicPendentes.length), rotulo: 'solicitações pendentes', icone: 'fa-clock' },
{ cor: eventosFuturos.length ? 'red' : 'teal', valor: String(eventosFuturos.length), rotulo: eventosFuturos.length === 1 ? 'evento/batizado marcado' : 'eventos/batizados marcados', icone: 'fa-calendar-day' },
{ cor: 'green', valor: String(alunosAtivos.length), rotulo: 'alunos ativos na rede', icone: 'fa-user-group' },
{ cor: totalPendente > 0 ? 'red' : 'green', valor: 'R$ ' + totalPendente.toFixed(0), rotulo: 'pendências financeiras', icone: 'fa-credit-card', nota: `${pendentes.length} mensalidade${pendentes.length === 1 ? '' : 's'} em aberto` },
{ cor: 'gold', valor: String(fundadores.length), rotulo: 'contas com acesso geral', icone: 'fa-crown' },
];
kpis.innerHTML = tiles.map((t, i) => `
<div class="kpi-tile kpi-${t.cor}" style="--card-index:${i}">
<i class="fas ${t.icone}"></i>
<span class="kpi-valor">${escapeHTML(t.valor)}</span>
<span class="kpi-rotulo">${escapeHTML(t.rotulo)}</span>
${t.nota ? `<span class="kpi-nota">${escapeHTML(t.nota)}</span>` : ''}
</div>`).join('');

// Indicador 7 estrelas (cartão navy do mockup): uma linha por núcleo ativo,
// com a estrela viva real e a corda mais alta já formada nele.
if (indicador) {
const linhas = nucleosAtivos.map((n) => {
const e = calcularEstrelaViva(n.id, usuarios);
const corda = e > 0 ? ORDEM_ESTRELA[e - 1] : null;
return `<div class="card-navy-linha"><div><strong>${escapeHTML(n.nome || n.id)}</strong><small>${e}/7${corda ? ' · ' + escapeHTML(corda) : ' · nenhuma corda formada ainda'}</small></div><span class="estrelas"><span class="on">${'★'.repeat(e)}</span><span class="off">${'★'.repeat(7 - e)}</span></span></div>`;
}).join('');
indicador.innerHTML = `
<h3><i class="fas fa-star"></i> Indicador 7 estrelas</h3>
<p>As 7 estrelas seguem a escada de cordas (Escravo → Professor). Cada núcleo acende uma estrela para cada corda já formada entre seus alunos ativos.</p>
${linhas ? `<div class="card-navy-lista">${linhas}</div>` : '<p class="vazio">Nenhum núcleo ativo cadastrado ainda.</p>'}`;
}
if (contador) contador.textContent = `${solicPendentes.length} pendente${solicPendentes.length === 1 ? '' : 's'}`;

if (listaSolic) {
if (!solicPendentes.length) {
listaSolic.innerHTML = '<div class="empty-state"><i class="fas fa-circle-check"></i>Nenhuma solicitação pendente no momento.</div>';
} else {
listaSolic.innerHTML = solicPendentes.map((s) => {
const nucleo = nucleos.find((n) => n.id === s.academiaId);
const solicitante = usuarios.find((u) => u.id === s.solicitanteUid);
const ic = (ICONE_SOLIC_MASTER[s.tipo] || 'navy fa-clipboard').split(' ');
return `
<div class="lista-item">
<span class="lista-icone ${ic[0]}"><i class="fas ${ic[1]}"></i></span>
<div class="lista-item-info">
<strong>${escapeHTML(ROTULOS_TIPO_SOLIC[s.tipo] || s.tipo || 'Solicitação')} — ${escapeHTML(nucleo ? nucleo.nome : (s.academiaId || ''))} <span class="pill pill-pendente">pendente</span></strong>
<span>${descreverSolicitacaoMaster(s)} · pedido por ${escapeHTML(solicitante ? solicitante.nome : 'alguém do núcleo')}</span>
</div>
<div class="lista-item-actions">
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
const cores = ['', 'verde', 'dourado'];
tabela.innerHTML = nucleos.map((n, i) => {
const responsavel = usuarios.find((u) => u.id === n.professorUid);
const alunosDoNucleo = alunos.filter((a) => a.academiaId === n.id && a.statusAtual !== 'Inativo');
const estrela = calcularEstrelaViva(n.id, usuarios);
const pendenteNucleo = pendentes.filter((p) => p.academiaId === n.id).reduce((s, p) => s + (Number(p.valor) || 0), 0);
const ehSede = !!(responsavel && souFundador(responsavel));
return `
<div class="academia-card ${ehSede ? 'nucleo-sede' : ''}" style="--card-index:${i}">
<div class="nucleo-topo">
<div class="nucleo-icone ${cores[i % cores.length]}"><i class="fas fa-${ehSede ? 'crown' : 'building'}"></i></div>
<div class="nucleo-titulo">
<h4>${escapeHTML(n.nome || 'Núcleo')}</h4>
<p>${responsavel ? `${escapeHTML(responsavel.nome)} · Cordão ${escapeHTML(responsavel.cordaoAtual || '—')}` : 'Sem responsável definido'}</p>
</div>
<div class="nucleo-chips">
${ehSede ? '<span class="pill pill-gold">SEDE</span>' : ''}
<span class="pill ${n.ativo ? 'pill-aprovado' : 'pill-neutra'}">${n.ativo ? 'ATIVO' : 'INATIVO'}</span>
</div>
</div>
<div class="nucleo-stats">
<div class="nucleo-stat"><strong class="teal">${alunosDoNucleo.length}</strong><small>alunos ativos</small></div>
<div class="nucleo-stat"><strong class="navy">R$ ${Number(n.mensalidadeValor || 0).toFixed(0)}</strong><small>mensalidade</small></div>
<div class="nucleo-stat"><strong style="color:${pendenteNucleo > 0 ? 'var(--accent-red)' : 'var(--green)'}">R$ ${pendenteNucleo.toFixed(0)}</strong><small>pendências</small></div>
</div>
<div class="nucleo-estrelas">
<div><strong>${estrela} ${estrela === 1 ? 'estrela' : 'estrelas'}</strong><small>${estrela > 0 ? 'corda mais alta: ' + escapeHTML(ORDEM_ESTRELA[estrela - 1]) : 'nenhuma corda formada ainda'}</small></div>
<span class="estrelas"><span class="on">${'★'.repeat(estrela)}</span><span class="off">${'★'.repeat(7 - estrela)}</span></span>
</div>
</div>`;
}).join('');
}

if (!fundadores.length) {
listaF.innerHTML = '<div class="empty-state"><i class="fas fa-crown"></i>Nenhuma conta com acesso geral configurada.</div>';
} else {
listaF.innerHTML = fundadores.map((f) => `
<div class="lista-item">
<span class="lista-icone gold"><i class="fas fa-crown"></i></span>
<div class="lista-item-info"><strong>${escapeHTML(f.nome || f.email || 'Sem nome')}</strong><span>${escapeHTML(f.email || '')}${f.cordaoAtual ? ' · Cordão ' + escapeHTML(f.cordaoAtual) : ''}</span></div>
<span class="pill pill-gold"><i class="fas fa-star"></i> Acesso Geral</span>
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
