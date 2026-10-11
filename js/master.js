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
db, collection, query, where, getDocs, consultaDaEscola,
} from './firebase.js';
import { escapeHTML } from './shared.js';
import { ESCOLA } from './escola.js';
import { COR_PADRAO, corOk, contarPorTurma, turmaIdDe, definirTurmaAtiva, nomeArte, descricaoHorario } from './turmas.js';

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
// v37: visão por turma (não trava o resto do painel se a coleção ainda não existir).
carregarVisaoPorTurma({ usuarios, nucleos, pagamentos }).catch((e) => { console.warn('visão por turma', e); const box = document.getElementById('visaoTurmas'); if (box) box.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation"></i>Não foi possível carregar as turmas agora.</div>'; });
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
transferenciaId: sol.id,
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

// ===================== v37: Visão global por turma =====================
// Turmas de TODOS os núcleos da escola (coleção `turmas`, query direta por escolaId), alunos por
// turma (contarPorTurma), mensalidade prevista (turma.mensalidade × ativos não isentos; sem
// mensalidade na turma vale a do núcleo), recebido no mês e em aberto (pagamentos por alunoId).
// Quem não tem turmaId conta na "turma do núcleo" (a padrão, virtual).
const brlMaster = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const mesChave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
let dadosTurmasMaster = null; // { linhas, meses } — guardado para o filtro "Turma"
let filtroTurmaMaster = '';

async function listarTurmasDaEscola() {
let q = await consultaDaEscola('turmas');
// Sem claim ainda (conta recém-criada) a escola é a do próprio app (white-label).
if (!q) q = query(collection(db, 'turmas'), where('escolaId', '==', ESCOLA.id));
const s = await getDocs(q);
return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.ativa !== false);
}

// Monta as linhas (uma por turma + a turma do núcleo de cada núcleo) com os números do mês.
export function montarVisaoPorTurma({ usuarios = [], nucleos = [], pagamentos = [], turmas = [], agora = new Date() } = {}) {
const ehAluno = (u) => (u.papeis || []).includes('aluno');
const ativo = (u) => u.statusAtual !== 'Inativo' && u.ativo !== false;
const mesAtual = mesChave(agora);
const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1); return { chave: mesChave(d), rotulo: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}` }; });
const linhas = [];
const chaveDe = new Map(); // alunoId -> chave da linha (academiaId|turmaId)
nucleos.filter((n) => n.ativo !== false).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''))).forEach((n) => {
const turmasDoNucleo = turmas.filter((t) => t.academiaId === n.id).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
const alunosDoNucleo = usuarios.filter((u) => ehAluno(u) && u.academiaId === n.id);
const ativos = alunosDoNucleo.filter(ativo);
const contagem = contarPorTurma(ativos, turmasDoNucleo);
const ids = new Set(turmasDoNucleo.map((t) => t.id));
const chaveAluno = (u) => { const id = turmaIdDe(u); return `${n.id}|${id && ids.has(id) ? id : ''}`; };
alunosDoNucleo.forEach((u) => chaveDe.set(u.id, chaveAluno(u)));
const professor = usuarios.find((u) => u.id === n.professorUid);
const linhaDe = (t) => {
const chave = `${n.id}|${t ? t.id : ''}`;
const meus = ativos.filter((u) => chaveAluno(u) === chave);
const pagantes = meus.filter((u) => u.isentoMensalidade !== true);
const mensal = t && Number(t.mensalidade) > 0 ? Number(t.mensalidade) : (Number(n.mensalidadeValor) > 0 ? Number(n.mensalidadeValor) : 0);
return {
chave, academiaId: n.id, turmaId: t ? t.id : '', padrao: !t, nucleoNome: n.nome || n.id,
nome: t ? String(t.nome || 'Turma') : `${n.nome || 'Núcleo'} · turma do núcleo`, arte: t ? t.arte : (ESCOLA.modalidade || 'capoeira'),
cor: corOk(t ? t.cor : (ESCOLA.cores && ESCOLA.cores.teal), COR_PADRAO), horario: t ? descricaoHorario(t) : '',
professor: t && t.professorNome ? t.professorNome : (professor ? professor.nome : ''),
alunos: Number(contagem[t ? t.id : ''] || 0), mensalidade: mensal, previsto: mensal * pagantes.length,
recebido: 0, aberto: 0, porMes: Object.fromEntries(meses.map((m) => [m.chave, 0])),
};
};
// A turma do núcleo só aparece quando tem gente ou quando o núcleo ainda não criou turmas.
const padrao = linhaDe(null);
if (padrao.alunos > 0 || !turmasDoNucleo.length) linhas.push(padrao);
turmasDoNucleo.forEach((t) => linhas.push(linhaDe(t)));
});
const porChave = new Map(linhas.map((l) => [l.chave, l]));
pagamentos.forEach((p) => {
if (!p) return;
const chave = (p.alunoId && chaveDe.get(p.alunoId)) || (p.academiaId ? `${p.academiaId}|` : null);
const l = chave && porChave.get(chave);
if (!l) return;
const valor = Number(p.valor) || 0;
const comp = String(p.competencia || '');
if (p.pago) {
if (comp === mesAtual) l.recebido += valor;
if (l.porMes[comp] !== undefined) l.porMes[comp] += valor;
} else l.aberto += valor;
});
const total = (campo, lista = linhas) => lista.reduce((s, l) => s + (Number(l[campo]) || 0), 0);
return { linhas, meses, mesAtual, totais: { alunos: total('alunos'), previsto: total('previsto'), recebido: total('recebido'), aberto: total('aberto') } };
}

async function carregarVisaoPorTurma({ usuarios, nucleos, pagamentos }) {
const box = document.getElementById('visaoTurmas'); if (!box) return;
box.innerHTML = '<div class="skeleton-card"><div class="skeleton-line w-60"></div><div class="skeleton-line w-40"></div></div>';
const turmas = await listarTurmasDaEscola();
dadosTurmasMaster = montarVisaoPorTurma({ usuarios, nucleos, pagamentos, turmas });
const sel = document.getElementById('filtroTurmaMaster');
if (sel) {
const atual = filtroTurmaMaster;
sel.innerHTML = '<option value="">todas</option>' + dadosTurmasMaster.linhas.map((l) => `<option value="${escapeHTML(l.chave)}">${escapeHTML(l.padrao ? l.nome : `${l.nome} · ${l.nucleoNome}`)}</option>`).join('');
if (dadosTurmasMaster.linhas.some((l) => l.chave === atual)) sel.value = atual; else filtroTurmaMaster = '';
if (!sel.dataset.ligado) { sel.dataset.ligado = '1'; sel.addEventListener('change', () => { filtroTurmaMaster = sel.value; desenharVisaoPorTurma(); }); }
}
desenharVisaoPorTurma();
}

function desenharVisaoPorTurma() {
const box = document.getElementById('visaoTurmas'); if (!box || !dadosTurmasMaster) return;
const { linhas: todas, meses } = dadosTurmasMaster;
const linhas = filtroTurmaMaster ? todas.filter((l) => l.chave === filtroTurmaMaster) : todas;
if (!todas.length) { box.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i>Nenhum núcleo ativo ainda — as turmas aparecem aqui assim que existirem.</div>'; return; }
const soma = (campo) => linhas.reduce((s, l) => s + (Number(l[campo]) || 0), 0);
const totais = { alunos: soma('alunos'), previsto: soma('previsto'), recebido: soma('recebido'), aberto: soma('aberto') };
const pct = totais.previsto ? Math.round((totais.recebido / totais.previsto) * 100) : null;
const tiles = [
{ cor: 'teal', valor: String(totais.alunos), rotulo: 'alunos ativos', icone: 'fa-user-group', nota: `${linhas.length} turma${linhas.length === 1 ? '' : 's'}` },
{ cor: 'navy', valor: brlMaster(totais.previsto), rotulo: 'previsto no mês', icone: 'fa-calculator', nota: 'mensalidade × ativos não isentos' },
{ cor: 'green', valor: brlMaster(totais.recebido), rotulo: 'recebido no mês', icone: 'fa-circle-check', nota: pct == null ? 'sem mensalidade definida' : `${pct}% do previsto` },
{ cor: totais.aberto > 0 ? 'red' : 'teal', valor: brlMaster(totais.aberto), rotulo: 'em aberto', icone: 'fa-hand-holding-dollar', nota: 'lançado e ainda não pago' },
];
const maxAlunos = Math.max(1, ...linhas.map((l) => l.alunos));
const totalMes = (m) => linhas.reduce((s, l) => s + (l.porMes[m.chave] || 0), 0);
const maxMes = Math.max(1, ...meses.map(totalMes));
const temRecebido = meses.some((m) => totalMes(m) > 0);
const nomeCurto = (l) => (l.padrao ? `${l.nucleoNome} (núcleo)` : l.nome);
box.innerHTML = `
<div class="kpi-grid">${tiles.map((t, i) => `<div class="kpi-tile kpi-${t.cor}" style="--card-index:${i}"><i class="fas ${t.icone}"></i><span class="kpi-valor">${escapeHTML(t.valor)}</span><span class="kpi-rotulo">${escapeHTML(t.rotulo)}</span><span class="kpi-nota">${escapeHTML(t.nota)}</span></div>`).join('')}</div>
<div class="vt-grade">
<div class="card-padrao"><h3><i class="fas fa-chart-bar"></i> Alunos por turma</h3><p class="vt-ajuda">Alunos ativos de cada turma, na cor dela. A turma do núcleo reúne quem ainda não tem turma.</p>
<div class="vt-barras" role="img" aria-label="Alunos por turma">${linhas.map((l) => `<div class="vt-barra" style="--turma:${escapeHTML(l.cor)}"><span class="vt-cor"></span><span>${escapeHTML(nomeCurto(l))}<small>${escapeHTML(l.padrao ? nomeArte(l.arte) : `${nomeArte(l.arte)} · ${l.nucleoNome}`)}</small></span><span class="vt-trilho"><i style="--w:${Math.round((l.alunos / maxAlunos) * 100)}%"></i></span><b>${l.alunos}</b></div>`).join('')}</div></div>
<div class="card-padrao"><h3><i class="fas fa-coins"></i> Recebido por mês, por turma</h3><p class="vt-ajuda">Mensalidades marcadas como pagas, por competência, nos últimos 6 meses — cada cor é uma turma.</p>
${temRecebido ? `<div class="vt-meses" role="img" aria-label="Recebido por mês">${meses.map((m, i) => { const tot = totalMes(m); return `<div class="vt-mes"><b>${escapeHTML(brlMaster(tot))}</b><span class="vt-pilha" style="--h:${Math.round((tot / maxMes) * 100)}%;--i:${i}">${linhas.filter((l) => l.porMes[m.chave] > 0).map((l) => `<i style="--turma:${escapeHTML(l.cor)};--p:${tot ? Math.round((l.porMes[m.chave] / tot) * 100) : 0}%" title="${escapeHTML(nomeCurto(l))}: ${escapeHTML(brlMaster(l.porMes[m.chave]))}"></i>`).join('')}</span><small>${escapeHTML(m.rotulo)}</small></div>`; }).join('')}</div>
<div class="vt-legenda">${linhas.map((l) => `<span style="--turma:${escapeHTML(l.cor)}"><i></i>${escapeHTML(nomeCurto(l))}</span>`).join('')}</div>` : '<p class="vt-vazio">Nenhuma mensalidade paga registrada nos últimos 6 meses.</p>'}</div>
</div>
${tabelaTurmasMaster(linhas, totais)}`;
box.querySelectorAll('[data-abrir-turma]').forEach((b) => b.addEventListener('click', () => {
// Marca a turma ativa do núcleo neste aparelho e abre o painel de gestão já nela.
definirTurmaAtiva(b.dataset.academia, b.dataset.abrirTurma || '');
window.location.href = 'admin.html';
}));
}

function tabelaTurmasMaster(linhas, totais) {
const porNucleo = new Map();
linhas.forEach((l) => { if (!porNucleo.has(l.academiaId)) porNucleo.set(l.academiaId, []); porNucleo.get(l.academiaId).push(l); });
const celulaRec = (l) => `<td class="num">${escapeHTML(brlMaster(l.recebido))} <small>/ ${escapeHTML(brlMaster(l.previsto))}</small></td>`;
const linhaHTML = (l) => `<tr class="${l.chave === filtroTurmaMaster ? 'vt-ativa' : ''}" style="--turma:${escapeHTML(l.cor)}">
<td><span class="vt-nome"><span class="vt-cor" style="background:${escapeHTML(l.cor)}"></span><span><b>${escapeHTML(l.nome)}</b>${l.horario ? `<small>${escapeHTML(l.horario)}</small>` : (l.padrao ? '<small>quem não tem turma</small>' : '')}</span></span></td>
<td>${escapeHTML(nomeArte(l.arte))}</td><td>${escapeHTML(l.professor || '—')}</td>
<td class="num">${l.alunos}</td><td class="num">${l.mensalidade ? escapeHTML(brlMaster(l.mensalidade)) : '—'}</td>${celulaRec(l)}
<td class="num ${l.aberto > 0 ? 'vt-aberto' : 'vt-ok'}">${escapeHTML(brlMaster(l.aberto))}</td>
<td><button type="button" class="btn-mini" data-abrir-turma="${escapeHTML(l.turmaId)}" data-academia="${escapeHTML(l.academiaId)}"><i class="fas fa-arrow-up-right-from-square"></i> Abrir turma</button></td></tr>`;
const subtotal = (lista, rotulo) => { const t = (c) => lista.reduce((s, l) => s + (Number(l[c]) || 0), 0); return `<tr class="vt-total"><td colspan="3">${escapeHTML(rotulo)}</td><td class="num">${t('alunos')}</td><td></td><td class="num">${escapeHTML(brlMaster(t('recebido')))} <small>/ ${escapeHTML(brlMaster(t('previsto')))}</small></td><td class="num ${t('aberto') > 0 ? 'vt-aberto' : 'vt-ok'}">${escapeHTML(brlMaster(t('aberto')))}</td><td></td></tr>`; };
const corpo = Array.from(porNucleo.values()).map((lista) => `<tr class="vt-nucleo"><td colspan="8"><i class="fas fa-building"></i> ${escapeHTML(lista[0].nucleoNome)}</td></tr>${lista.map(linhaHTML).join('')}${lista.length > 1 ? subtotal(lista, `Total · ${lista[0].nucleoNome}`) : ''}`).join('');
return `<div class="vt-tabela"><table><thead><tr><th>Turma</th><th>Arte</th><th>Professor</th><th class="num">Alunos</th><th class="num">Mensalidade</th><th class="num">Recebido / previsto</th><th class="num">Em aberto</th><th></th></tr></thead>
<tbody>${corpo}${subtotal(linhas, 'Total da academia')}</tbody></table></div>`;
}
