/* gestao.js — ferramentas novas do painel (admin.html):
   - Indicadores por núcleo: frequência, alunos sumidos, inadimplência, crescimento;
   - Graduação: aptos pelo termômetro, troca de cordão em lote e certificado em PDF;
   - Eventos: agenda com inscrições ("Eu vou") e lançamento de taxa;
   - Exportar para Excel e PDF (alunos, presenças, financeiro, inscritos);
   - Auditoria (quem fez o quê) e pedidos LGPD (exclusão de conta) — Admin.
   Regra de ouro: todo número vem de leitura real do Firestore; sem dado, "—". */
import {
  db, collection, doc, query, where, orderBy, limit, getDocs, updateDoc, addDoc, deleteDoc, setDoc, arrayUnion,
  listar, listarPagamentosDoNucleo, lancarPagamento, pedirAoServidor,
} from './firebase.js';
import { ESCOLA, CORDOES_ADULTO, prontidao, proximoCordao, coresDoCordao, META_PRONTIDAO, escadaDe } from './escola.js';

let C = null; // contexto vindo do admin.js
const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataDe = (v) => (v && v.toDate ? v.toDate() : new Date(v));
const DIA = 86400000;
const hojeISO = () => new Date().toISOString().slice(0, 10);
const mesISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const nomeNucleo = (id) => ((C.nucleos().find((n) => n.id === id) || {}).nome || id || 'Grupo');
const alunosDe = (nid) => C.usuarios().filter((u) => (u.papeis || []).includes('aluno') && (!nid || u.academiaId === nid));
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

// ---------- carregar bibliotecas (cdnjs) só quando precisar ----------
const scripts = {};
function carregarScript(url) {
  if (!scripts[url]) scripts[url] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('Sem internet para carregar a ferramenta de exportação.')); document.head.appendChild(s); });
  return scripts[url];
}
const LIB = {
  xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
};
async function jsPDFPronto(comTabela) {
  await carregarScript(LIB.jspdf);
  if (comTabela) await carregarScript(LIB.autotable);
  return window.jspdf.jsPDF;
}
async function imagemComoDataUrl(src) {
  const r = await fetch(src); const b = await r.blob();
  return new Promise((res) => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });
}
const nomeArquivo = (base) => `${base}-${hojeISO()}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9-]+/g, '-').toLowerCase();

// ---------- EXPORTAR ----------
// colunas: [{ chave, titulo }]; linhas: objetos.
export async function exportarExcel(titulo, colunas, linhas) {
  await carregarScript(LIB.xlsx);
  const dados = [colunas.map((c) => c.titulo), ...linhas.map((l) => colunas.map((c) => l[c.chave] ?? ''))];
  const ws = window.XLSX.utils.aoa_to_sheet(dados);
  ws['!cols'] = colunas.map((c) => ({ wch: Math.min(40, Math.max(10, c.titulo.length + 2, ...linhas.slice(0, 200).map((l) => String(l[c.chave] ?? '').length + 1))) }));
  const wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, titulo.slice(0, 31));
  window.XLSX.writeFile(wb, `${nomeArquivo(titulo)}.xlsx`);
}
export async function exportarPDF(titulo, colunas, linhas, subtitulo = '') {
  const JsPDF = await jsPDFPronto(true);
  const pdf = new JsPDF({ orientation: colunas.length > 5 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  let logo = null; try { logo = await imagemComoDataUrl(ESCOLA.logoPequeno); } catch (e) { /* sem logo */ }
  if (logo) pdf.addImage(logo, 'PNG', 40, 28, 42, 42);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(0, 45, 114); pdf.text(titulo, logo ? 92 : 40, 48);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(90, 100, 110);
  pdf.text(`${ESCOLA.nome}${subtitulo ? ` · ${subtitulo}` : ''} · gerado em ${new Date().toLocaleString('pt-BR')}`, logo ? 92 : 40, 64);
  pdf.autoTable({
    startY: 84, head: [colunas.map((c) => c.titulo)], body: linhas.map((l) => colunas.map((c) => String(l[c.chave] ?? ''))),
    styles: { fontSize: 8.5, cellPadding: 5 }, headStyles: { fillColor: [56, 158, 146], textColor: 255 }, alternateRowStyles: { fillColor: [234, 242, 241] },
    margin: { left: 40, right: 40 },
  });
  pdf.save(`${nomeArquivo(titulo)}.pdf`);
}
function botoesExportar(id, rotulo) {
  return `<div class="exp-grupo" role="group" aria-label="Exportar ${esc(rotulo)}"><span>${esc(rotulo)}</span><button type="button" class="btn-mini exp-btn" data-exportar="${id}" data-formato="xlsx"><i class="fas fa-file-excel"></i> Excel</button><button type="button" class="btn-mini exp-btn" data-exportar="${id}" data-formato="pdf"><i class="fas fa-file-pdf"></i> PDF</button></div>`;
}
const EXPORTS = {
  alunos: async (nid) => ({
    titulo: 'Alunos', sub: nid ? nomeNucleo(nid) : 'Grupo todo',
    colunas: [{ chave: 'nome', titulo: 'Nome' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'idade', titulo: 'Idade' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'celular', titulo: 'Celular' }, { chave: 'status', titulo: 'Status' }, { chave: 'prontidao', titulo: 'Prontidão' }, { chave: 'desde', titulo: 'No grupo desde' }],
    linhas: alunosDe(nid).sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map((a) => ({ nome: a.nome || '', cordao: a.cordaoAtual || 'Iniciante', idade: a.idade || '', nucleo: nomeNucleo(a.academiaId), celular: a.celular || '', status: a.statusAtual || 'Ativo', prontidao: prontidao(a) == null ? '—' : `${prontidao(a)}%`, desde: a.criadoEm ? new Date(a.criadoEm).toLocaleDateString('pt-BR') : '' })),
  }),
  presencas: async (nid) => {
    const itens = await presencasPeriodo(nid, 90);
    const nomes = new Map(C.usuarios().map((u) => [u.id, u.nome]));
    return {
      titulo: 'Presenças (90 dias)', sub: nid ? nomeNucleo(nid) : 'Grupo todo',
      colunas: [{ chave: 'data', titulo: 'Data' }, { chave: 'hora', titulo: 'Hora' }, { chave: 'aluno', titulo: 'Aluno' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'visitou', titulo: 'Treinou em' }, { chave: 'origem', titulo: 'Registro' }],
      linhas: itens.sort((a, b) => dataDe(b.entradaEm) - dataDe(a.entradaEm)).map((p) => ({ data: dataDe(p.entradaEm).toLocaleDateString('pt-BR'), hora: dataDe(p.entradaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), aluno: nomes.get(p.uid) || p.nome || p.uid, nucleo: nomeNucleo(p.nucleoId), visitou: p.nucleoVisitadoId && p.nucleoVisitadoId !== p.nucleoId ? nomeNucleo(p.nucleoVisitadoId) : '', origem: p.origem === 'faceid' ? 'Face ID' : 'Manual' })),
    };
  },
  financeiro: async (nid) => {
    const pags = await pagamentosDe(nid);
    return {
      titulo: 'Financeiro', sub: nid ? nomeNucleo(nid) : 'Grupo todo',
      colunas: [{ chave: 'aluno', titulo: 'Aluno' }, { chave: 'tipo', titulo: 'Tipo' }, { chave: 'ref', titulo: 'Referência' }, { chave: 'valor', titulo: 'Valor' }, { chave: 'situacao', titulo: 'Situação' }, { chave: 'pagoEm', titulo: 'Pago em' }, { chave: 'nucleo', titulo: 'Núcleo' }],
      linhas: pags.sort((a, b) => String(b.competencia || '').localeCompare(String(a.competencia || ''))).map((p) => ({ aluno: p.alunoNome || '', tipo: p.tipo === 'adicional' ? (p.descricao || 'Adicional') : 'Mensalidade', ref: p.competencia || '', valor: brl(p.valor), situacao: p.pago ? 'Pago' : 'Pendente', pagoEm: p.pagoEm ? new Date(p.pagoEm).toLocaleDateString('pt-BR') : '', nucleo: nomeNucleo(p.academiaId) })),
    };
  },
};
async function exportar(tipo, formato, nid, extra) {
  try {
    C.toast('Preparando o arquivo…');
    const d = extra || await EXPORTS[tipo](nid);
    if (!d.linhas.length) { C.toast('Nada para exportar ainda.', 'error'); return; }
    if (formato === 'xlsx') await exportarExcel(d.titulo, d.colunas, d.linhas); else await exportarPDF(d.titulo, d.colunas, d.linhas, d.sub);
  } catch (e) { console.error(e); C.toast(e.message || 'Não foi possível exportar agora.', 'error'); }
}

// ---------- leituras ----------
const cachePres = new Map();
async function presencasPeriodo(nid, dias) {
  const nucleos = nid ? [nid] : C.nucleos().map((n) => n.id);
  const desde = new Date(Date.now() - dias * DIA);
  const partes = await Promise.all(nucleos.map(async (id) => {
    const k = `${id}:${dias}`;
    if (cachePres.has(k)) return cachePres.get(k);
    try {
      const s = await getDocs(query(collection(db, 'presencas'), where('nucleoId', '==', id), where('entradaEm', '>=', desde), limit(3000)));
      const itens = s.docs.map((d) => ({ id: d.id, ...d.data() })); cachePres.set(k, itens); return itens;
    } catch (e) { console.warn('presenças', id, e && e.message); return []; }
  }));
  return partes.flat();
}
async function pagamentosDe(nid) {
  try { return nid ? await listarPagamentosDoNucleo(nid) : await listar('pagamentos'); } catch (e) { return []; }
}
function seletorNucleo(id, valor) {
  if (!C.ehAdmin() && !C.fundador()) return '';
  return `<select id="${id}" class="input-padrao gs-sel" aria-label="Núcleo"><option value="">Grupo todo</option>${C.nucleos().filter((n) => n.ativo !== false).map((n) => `<option value="${esc(n.id)}" ${n.id === valor ? 'selected' : ''}>${esc(n.nome)}</option>`).join('')}</select>`;
}
const nucleoPadrao = () => (C.ehAdmin() || C.fundador() ? '' : C.sessao().academiaGerenciadaId || '');

// ================= INDICADORES =================
let nucIndic = null;
async function renderIndicadores() {
  const box = el('gsIndicadores'); if (!box) return;
  if (nucIndic === null) nucIndic = nucleoPadrao();
  if (!C.ehAdmin() && !C.fundador() && !nucIndic) { box.innerHTML = '<div class="empty-state"><i class="fas fa-chart-line"></i>Os indicadores aparecem quando você for responsável por um núcleo.</div>'; return; }
  box.innerHTML = '<div class="card-padrao"><p><i class="fas fa-spinner fa-spin"></i> Calculando com os dados reais…</p></div>';
  const alunos = alunosDe(nucIndic || null);
  const ativos = alunos.filter((a) => a.statusAtual !== 'Inativo');
  const [pres, pags] = await Promise.all([presencasPeriodo(nucIndic || null, 90), pagamentosDe(nucIndic || null)]);
  const agora = Date.now();
  // frequência: check-ins nos últimos 30 dias ÷ alunos ativos ÷ semanas
  const pres30 = pres.filter((p) => agora - dataDe(p.entradaEm).getTime() <= 30 * DIA);
  const freq = ativos.length ? pres30.length / ativos.length / (30 / 7) : null;
  // última presença de cada aluno
  const ultima = new Map(); pres.forEach((p) => { const t = dataDe(p.entradaEm).getTime(); if (!ultima.has(p.uid) || ultima.get(p.uid) < t) ultima.set(p.uid, t); });
  const sumidos = ativos.map((a) => ({ a, t: ultima.get(a.id) || null })).filter((x) => !x.t || agora - x.t > 21 * DIA)
    .map((x) => ({ ...x, dias: x.t ? Math.floor((agora - x.t) / DIA) : null })).sort((x, y) => (y.dias ?? 999) - (x.dias ?? 999));
  // semanas (8) para o gráfico
  const semanas = Array.from({ length: 8 }, (_, i) => { const fim = agora - i * 7 * DIA; return { rot: new Date(fim - 6 * DIA).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), n: pres.filter((p) => { const t = dataDe(p.entradaEm).getTime(); return t <= fim && t > fim - 7 * DIA; }).length }; }).reverse();
  const maxSem = Math.max(1, ...semanas.map((s) => s.n));
  // inadimplência do mês atual e do anterior (mensalidades lançadas)
  const mAtual = mesISO(); const dAnt = new Date(); dAnt.setMonth(dAnt.getMonth() - 1); const mAnt = mesISO(dAnt);
  const mens = pags.filter((p) => p.tipo !== 'adicional');
  const doMes = (m) => mens.filter((p) => p.competencia === m);
  const devendo = pags.filter((p) => !p.pago);
  const porAluno = new Map(); devendo.forEach((p) => { const k = p.alunoId || p.alunoNome; const x = porAluno.get(k) || { nome: p.alunoNome || 'Aluno', total: 0, itens: 0, alunoId: p.alunoId }; x.total += Number(p.valor) || 0; x.itens++; porAluno.set(k, x); });
  const semLancamento = ativos.filter((a) => !doMes(mAtual).some((p) => p.alunoId === a.id));
  const inad = (m) => { const l = doMes(m); return l.length ? Math.round((l.filter((p) => !p.pago).length / l.length) * 100) : null; };
  // crescimento
  const novosMes = alunos.filter((a) => a.criadoEm && a.criadoEm.slice(0, 7) === mAtual).length;
  const novosAnt = alunos.filter((a) => a.criadoEm && a.criadoEm.slice(0, 7) === mAnt).length;
  const cresc = novosAnt ? Math.round(((novosMes - novosAnt) / novosAnt) * 100) : null;
  const whats = (a) => { const d = soDigitos(a.celular); return d.length >= 10 ? `https://wa.me/55${d}?text=${encodeURIComponent(`Oi, ${String(a.nome || '').split(' ')[0]}! Sentimos sua falta no treino. Está tudo bem?`)}` : ''; };
  const tile = (cor, valor, rotulo, nota) => `<div class="kpi-tile kpi-${cor}"><span class="kpi-valor">${esc(valor)}</span><span class="kpi-rotulo">${esc(rotulo)}</span>${nota ? `<span class="kpi-nota">${esc(nota)}</span>` : ''}</div>`;
  box.innerHTML = `
  <div class="gs-barra">${seletorNucleo('gsNucIndic', nucIndic)}<div class="gs-exportar">${botoesExportar('alunos', 'Alunos')}${botoesExportar('presencas', 'Presenças')}${botoesExportar('financeiro', 'Financeiro')}</div></div>
  <div class="kpis-gestao gs-kpis">
    ${tile('teal', String(ativos.length), 'alunos ativos', `${alunos.length - ativos.length} inativos`)}
    ${tile('green', freq == null ? '—' : freq.toFixed(1).replace('.', ','), 'treinos por aluno/semana', `${pres30.length} check-ins em 30 dias`)}
    ${tile(sumidos.length ? 'gold' : 'teal', String(sumidos.length), 'alunos sumidos', 'sem treinar há 3+ semanas')}
    ${tile(inad(mAtual) ? 'red' : 'teal', inad(mAtual) == null ? '—' : `${inad(mAtual)}%`, 'inadimplência no mês', inad(mAnt) == null ? 'mês anterior: —' : `mês anterior: ${inad(mAnt)}%`)}
    ${tile('navy', String(novosMes), 'novos no mês', cresc == null ? `mês anterior: ${novosAnt}` : `${cresc >= 0 ? '+' : ''}${cresc}% sobre o mês anterior`)}
  </div>
  <div class="gs-grade">
    <div class="card-padrao"><h3><i class="fas fa-chart-column"></i> Check-ins por semana</h3><p class="gs-ajuda">Últimas 8 semanas (Face ID + marcação manual).</p>
      <div class="gs-barras" role="img" aria-label="Check-ins por semana">${semanas.map((s, i) => `<div class="gs-col" style="--h:${Math.round((s.n / maxSem) * 100)}%;--i:${i}"><b>${s.n}</b><i></i><small>${s.rot}</small></div>`).join('')}</div></div>
    <div class="card-padrao"><h3><i class="fas fa-user-clock"></i> Alunos sumidos <span class="pill pill-pendente">${sumidos.length}</span></h3><p class="gs-ajuda">Sem presença registrada há mais de 21 dias — um convite de volta costuma funcionar.</p>
      <div class="lista-simples gs-lista">${sumidos.slice(0, 40).map((x) => `<div class="lista-item"><div class="lista-item-info"><strong>${esc(x.a.nome)}</strong><span>${x.dias == null ? 'sem presença nos últimos 90 dias' : `${x.dias} dias sem treinar`} · ${esc(x.a.cordaoAtual || 'Iniciante')}</span></div><div class="lista-item-actions">${whats(x.a) ? `<a class="btn-mini btn-mini-aprovar" href="${esc(whats(x.a))}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> Chamar</a>` : '<span class="gs-sem">sem celular</span>'}</div></div>`).join('') || '<div class="empty-state"><i class="fas fa-fire"></i>Todo mundo treinou nas últimas 3 semanas!</div>'}</div></div>
    <div class="card-padrao"><h3><i class="fas fa-hand-holding-dollar"></i> Em aberto <span class="pill pill-pendente">${porAluno.size}</span></h3><p class="gs-ajuda">Valores lançados e ainda não marcados como pagos (mensalidades e adicionais).</p>
      <div class="lista-simples gs-lista">${Array.from(porAluno.values()).sort((a, b) => b.total - a.total).slice(0, 40).map((x) => `<div class="lista-item"><div class="lista-item-info"><strong>${esc(x.nome)}</strong><span>${x.itens} lançamento${x.itens > 1 ? 's' : ''} em aberto</span></div><div class="lista-item-actions"><b class="gs-valor">${brl(x.total)}</b></div></div>`).join('') || '<div class="empty-state"><i class="fas fa-check"></i>Nada em aberto.</div>'}</div>
      ${semLancamento.length && (nucIndic || !C.ehAdmin()) ? `<p class="gs-ajuda" style="margin-top:10px"><i class="fas fa-circle-info"></i> ${semLancamento.length} aluno${semLancamento.length > 1 ? 's' : ''} ativo${semLancamento.length > 1 ? 's' : ''} sem mensalidade lançada em ${mAtual.slice(5)}/${mAtual.slice(0, 4)}.</p>` : ''}</div>
  </div>`;
  const sel = el('gsNucIndic'); if (sel) sel.addEventListener('change', () => { nucIndic = sel.value; renderIndicadores(); });
  box.querySelectorAll('[data-exportar]').forEach((b) => b.addEventListener('click', () => exportar(b.dataset.exportar, b.dataset.formato, nucIndic || null)));
}

// ================= GRADUAÇÃO (batizado / troca de cordão) =================
let gradMostrarTodos = false; const gradSel = new Set(); let gradFeitos = [];
async function renderGraduacao() {
  const box = el('gsGraduacao'); if (!box) return;
  const nid = C.ehAdmin() || C.fundador() ? (el('gsNucGrad') ? el('gsNucGrad').value : nucleoPadrao()) : C.sessao().academiaGerenciadaId;
  if (!C.ehAdmin() && !C.fundador() && !nid && !C.instrutor()) { box.innerHTML = '<div class="empty-state"><i class="fas fa-ribbon"></i>A graduação em lote aparece quando você for responsável por um núcleo.</div>'; return; }
  let eventos = []; try { eventos = (await listar('eventos')).filter((e) => e.data && e.data >= new Date(Date.now() - 60 * DIA).toISOString().slice(0, 10)).sort((a, b) => a.data.localeCompare(b.data)); } catch (e) { eventos = []; }
  const lista = alunosDe(nid || null).filter((a) => a.statusAtual !== 'Inativo').map((a) => ({ a, p: prontidao(a), prox: proximoCordao(a) }))
    .filter((x) => x.prox && x.prox.nome !== (x.a.cordaoAtual || 'Iniciante'))
    .filter((x) => gradMostrarTodos || (x.p != null && x.p >= META_PRONTIDAO))
    .sort((x, y) => (y.p ?? -1) - (x.p ?? -1));
  const faixa = (cor) => `<span class="gs-cordao" style="--c1:${cor[0]};--c2:${cor[1]};--c3:${cor[2]}"></span>`;
  box.innerHTML = `
  <div class="gs-barra">${seletorNucleo('gsNucGrad', nid)}<label class="gs-check"><input type="checkbox" id="gsGradTodos" ${gradMostrarTodos ? 'checked' : ''}> Mostrar também quem ainda não atingiu ${META_PRONTIDAO}%</label></div>
  <div class="card-padrao">
    <h3><i class="fas fa-ribbon"></i> ${gradMostrarTodos ? 'Alunos ativos' : `Aptos à troca de cordão (prontidão ≥ ${META_PRONTIDAO}%)`} <span class="pill pill-aprovado">${lista.length}</span></h3>
    <p class="gs-ajuda">A prontidão vem das notas lançadas no prontuário. Marque quem vai graduar, confirme a data e o evento e registre — o cordão, a linha do tempo e os brasões atualizam sozinhos.</p>
    <div class="gs-grad-lista">${lista.map(({ a, p, prox }) => `<label class="gs-grad"><input type="checkbox" data-grad="${esc(a.id)}" ${gradSel.has(a.id) ? 'checked' : ''}>
      <span class="gs-grad-nome"><b>${esc(a.nome)}</b><small>${esc(nomeNucleo(a.academiaId))}${a.idade ? ` · ${esc(a.idade)} anos` : ''}</small></span>
      <span class="gs-grad-troca">${faixa(coresDoCordao(a.cordaoAtual || 'Iniciante', a))}<small>${esc(a.cordaoAtual || 'Iniciante')}</small><i class="fas fa-arrow-right"></i>${faixa(prox.cor)}<small><b>${esc(prox.nome)}</b></small></span>
      <span class="gs-pront ${p != null && p >= META_PRONTIDAO ? 'ok' : ''}"><i style="width:${p || 0}%"></i><small>${p == null ? 'sem notas' : `${p}%`}</small></span></label>`).join('') || `<div class="empty-state"><i class="fas fa-hourglass-half"></i>${gradMostrarTodos ? 'Nenhum aluno ativo.' : `Ninguém atingiu ${META_PRONTIDAO}% ainda. Lance as notas no prontuário ou marque "Mostrar também".`}</div>`}</div>
    <div class="gs-grad-form">
      <label><span>Data da graduação</span><input type="date" id="gsGradData" class="input-padrao" value="${hojeISO()}"></label>
      <label><span>Evento (opcional)</span><select id="gsGradEvento" class="input-padrao"><option value="">—</option>${eventos.map((e) => `<option value="${esc(e.id)}">${esc(e.nome || 'Evento')} · ${esc(e.data.slice(8, 10) + '/' + e.data.slice(5, 7))}</option>`).join('')}</select></label>
      <button type="button" class="btn-detalhes" id="gsGradSalvar" ${gradSel.size ? '' : 'disabled'}><i class="fas fa-award"></i> Registrar graduação (${gradSel.size})</button>
    </div>
  </div>
  ${gradFeitos.length ? `<div class="card-padrao gs-feitos"><h3><i class="fas fa-certificate"></i> Graduados agora <span class="pill pill-aprovado">${gradFeitos.length}</span></h3><p class="gs-ajuda">${gradFeitos.map((g) => `${esc(g.nome)} → ${esc(g.cordao)}`).join(' · ')}</p><button type="button" class="btn-detalhes" id="gsCertificados"><i class="fas fa-file-pdf"></i> Baixar certificados (PDF)</button></div>` : ''}`;
  const sel = el('gsNucGrad'); if (sel) sel.addEventListener('change', () => { gradSel.clear(); renderGraduacao(); });
  el('gsGradTodos').addEventListener('change', (e) => { gradMostrarTodos = e.target.checked; renderGraduacao(); });
  box.querySelectorAll('[data-grad]').forEach((c) => c.addEventListener('change', () => { if (c.checked) gradSel.add(c.dataset.grad); else gradSel.delete(c.dataset.grad); const b = el('gsGradSalvar'); b.disabled = !gradSel.size; b.innerHTML = `<i class="fas fa-award"></i> Registrar graduação (${gradSel.size})`; }));
  el('gsGradSalvar').addEventListener('click', () => registrarGraduacoes(lista, eventos));
  const bc = el('gsCertificados'); if (bc) bc.addEventListener('click', () => gerarCertificados(gradFeitos));
}
async function registrarGraduacoes(lista, eventos) {
  const alvos = lista.filter((x) => gradSel.has(x.a.id));
  if (!alvos.length) return;
  const data = el('gsGradData').value || hojeISO();
  const ev = eventos.find((e) => e.id === el('gsGradEvento').value) || null;
  if (!confirm(`Registrar a troca de cordão de ${alvos.length} aluno${alvos.length > 1 ? 's' : ''} em ${data.split('-').reverse().join('/')}${ev ? ` (${ev.nome})` : ''}?`)) return;
  const btn = el('gsGradSalvar'); btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando…';
  const s = C.sessao(); const em = new Date(`${data}T12:00:00`).toISOString();
  const res = await Promise.allSettled(alvos.map(async ({ a, prox }) => {
    const marco = { cordao: prox.nome, anterior: a.cordaoAtual || 'Iniciante', em, por: s.uid, porNome: s.nome || '', ...(ev ? { eventoId: ev.id, eventoNome: ev.nome || '' } : {}) };
    const historico = (Array.isArray(a.historicoGraduacoes) ? a.historicoGraduacoes.slice() : []).concat([marco]).slice(-30);
    await updateDoc(doc(db, 'usuarios', a.id), { cordaoAtual: prox.nome, historicoGraduacoes: historico });
    a.cordaoAtual = prox.nome; a.historicoGraduacoes = historico;
    return { id: a.id, nome: a.nome, cordao: prox.nome, anterior: marco.anterior, em, nucleo: nomeNucleo(a.academiaId), evento: ev ? ev.nome : '', idade: a.idade };
  }));
  const ok = res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const falhas = res.length - ok.length;
  gradFeitos = ok; gradSel.clear();
  C.toast(falhas ? `${ok.length} graduado(s); ${falhas} sem permissão.` : `${ok.length} graduação(ões) registrada(s). Parabéns!`, falhas ? 'error' : 'success');
  try { await C.recarregarUsuarios(); } catch (e) { /* ok */ }
  renderGraduacao();
}
// Certificado A4 deitado, um por página, com as cores do cordão novo.
export async function gerarCertificados(lista) {
  if (!lista || !lista.length) return;
  try {
    C && C.toast('Gerando certificados…');
    const JsPDF = await jsPDFPronto(false);
    const pdf = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let logo = null; try { logo = await imagemComoDataUrl(ESCOLA.logo); } catch (e) { /* sem logo */ }
    const hex = (h) => { const x = String(h).replace('#', ''); const f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x; return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)]; };
    lista.forEach((g, i) => {
      if (i) pdf.addPage();
      const W = 297; const H = 210;
      const cor = coresDoCordao(g.cordao, { idade: g.idade });
      pdf.setFillColor(234, 242, 241); pdf.rect(0, 0, W, H, 'F');
      // moldura nas três cores do cordão
      [0, 1, 2].forEach((k) => { pdf.setFillColor(...hex(cor[k])); pdf.rect(10 + k * 3, 10 + k * 3, W - 20 - k * 6, H - 20 - k * 6, 'F'); });
      pdf.setFillColor(255, 255, 255); pdf.rect(20, 20, W - 40, H - 40, 'F');
      pdf.setDrawColor(0, 45, 114); pdf.setLineWidth(0.4); pdf.rect(24, 24, W - 48, H - 48);
      if (logo) pdf.addImage(logo, 'PNG', W / 2 - 17, 30, 34, 34);
      pdf.setTextColor(56, 158, 146); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.text(ESCOLA.nome.toUpperCase(), W / 2, 72, { align: 'center', charSpace: 1.2 });
      pdf.setTextColor(0, 45, 114); pdf.setFontSize(30); pdf.text('Certificado de Graduação', W / 2, 88, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(13); pdf.setTextColor(60, 70, 80);
      pdf.text('Certificamos que', W / 2, 102, { align: 'center' });
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(24); pdf.setTextColor(13, 33, 29); pdf.text(String(g.nome || ''), W / 2, 116, { align: 'center' });
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(13); pdf.setTextColor(60, 70, 80);
      const quando = new Date(g.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      pdf.text(`recebeu o cordão ${g.cordao}${g.anterior ? ` (antes: ${g.anterior})` : ''} em ${quando}${g.evento ? `, no ${g.evento}` : ''},`, W / 2, 128, { align: 'center' });
      pdf.text(`pelo seu empenho na ${ESCOLA.modalidade} — ${g.nucleo}.`, W / 2, 136, { align: 'center' });
      // faixa do cordão
      [0, 1, 2].forEach((k) => { pdf.setFillColor(...hex(cor[k])); pdf.rect(W / 2 - 45 + k * 30, 144, 30, 5, 'F'); });
      pdf.setDrawColor(200, 206, 210); pdf.rect(W / 2 - 45, 144, 90, 5);
      pdf.setDrawColor(0, 45, 114); pdf.line(50, 176, 125, 176); pdf.line(W - 125, 176, W - 50, 176);
      pdf.setFontSize(10); pdf.setTextColor(60, 70, 80);
      pdf.text('Responsável do núcleo', 87.5, 182, { align: 'center' }); pdf.text(`${ESCOLA.mestre} — Presidente`, W - 87.5, 182, { align: 'center' });
      pdf.setFontSize(8); pdf.setTextColor(140, 150, 160); pdf.text(`${ESCOLA.cidade} - ${ESCOLA.uf} · registro ${String(g.id || '').slice(0, 8)}-${new Date(g.em).getFullYear()}`, W / 2, 196, { align: 'center' });
    });
    pdf.save(`${nomeArquivo('certificados-graduacao')}.pdf`);
  } catch (e) { console.error(e); C && C.toast(e.message || 'Não foi possível gerar os certificados.', 'error'); }
}

// ================= EVENTOS (agenda + inscrições) =================
async function renderEventos() {
  const box = el('gsEventos'); if (!box) return;
  const podeCriar = C.ehAdmin() || C.fundador();
  box.innerHTML = '<div class="card-padrao"><p><i class="fas fa-spinner fa-spin"></i> Carregando…</p></div>';
  let eventos = []; try { eventos = await listar('eventos'); } catch (e) { eventos = []; }
  const meuNuc = C.sessao().academiaGerenciadaId;
  eventos = eventos.filter((e) => e.data).sort((a, b) => b.data.localeCompare(a.data));
  const conf = await Promise.all(eventos.map(async (e) => { try { return (await getDocs(collection(db, 'eventos', e.id, 'confirmados'))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (x) { return []; } }));
  const hoje = hojeISO();
  box.innerHTML = `
  ${podeCriar ? `<div class="card-padrao"><h3><i class="fas fa-calendar-plus"></i> Novo evento</h3>
    <form id="gsFormEvento" class="gs-form-evento">
      <label><span>Nome</span><input class="input-padrao" name="nome" required maxlength="80" placeholder="Batizado e troca de cordões 2026"></label>
      <label><span>Data</span><input class="input-padrao" type="date" name="data" required></label>
      <label><span>Hora</span><input class="input-padrao" type="time" name="hora"></label>
      <label><span>Núcleo</span><select class="input-padrao" name="academiaId"><option value="">Grupo todo</option>${C.nucleos().map((n) => `<option value="${esc(n.id)}">${esc(n.nome)}</option>`).join('')}</select></label>
      <label class="gs-largo"><span>Local (endereço)</span><input class="input-padrao" name="local" maxlength="140"></label>
      <label><span>Taxa (R$, opcional)</span><input class="input-padrao" type="number" name="taxa" min="0" step="0.01"></label>
      <label class="gs-largo"><span>Descrição</span><textarea class="input-padrao" name="descricao" rows="2" maxlength="400"></textarea></label>
      <button type="submit" class="btn-detalhes"><i class="fas fa-check"></i> Publicar evento</button>
    </form><p class="gs-ajuda">Todo mundo do núcleo (ou do grupo) recebe o aviso e se inscreve pela Rede / app com "Eu vou".</p></div>`
    : `<div class="card-padrao"><p class="gs-ajuda"><i class="fas fa-circle-info"></i> Eventos novos são criados pelo Admin/Fundador. Para marcar um evento no seu núcleo, <a href="#" onclick="mudarAba('solicitacoes', event)">abra uma solicitação</a>.</p></div>`}
  <div class="lista-simples">${eventos.map((e, i) => {
    const lista = conf[i].filter((c) => podeCriar || !meuNuc || c.academiaId === meuNuc || e.academiaId === meuNuc);
    return `<div class="card-padrao gs-evento ${e.data < hoje ? 'passado' : ''}"><div class="gs-ev-topo"><div class="gs-ev-data"><b>${e.data.slice(8, 10)}</b><small>${new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>
      <div class="gs-ev-info"><strong>${esc(e.nome || 'Evento')}</strong><span>${e.hora ? esc(e.hora) + ' · ' : ''}${esc(e.academiaId ? nomeNucleo(e.academiaId) : 'Grupo todo')}${e.local ? ` · ${esc(e.local)}` : ''}${e.taxa ? ` · taxa ${brl(e.taxa)}` : ''}</span></div>
      <span class="pill ${lista.length ? 'pill-aprovado' : 'pill-pendente'}">${lista.length} inscrito${lista.length === 1 ? '' : 's'}</span></div>
      <details><summary>Ver inscritos</summary><div class="gs-inscritos">${lista.map((c) => `<span>${esc(c.nome || '')}${c.cordaoAtual ? ` <small>${esc(c.cordaoAtual)}</small>` : ''}</span>`).join('') || '<em>Ninguém inscrito ainda.</em>'}</div></details>
      <div class="gs-ev-acoes">
        <button type="button" class="btn-mini" data-exp-ev="${esc(e.id)}" data-formato="xlsx" ${lista.length ? '' : 'disabled'}><i class="fas fa-file-excel"></i> Inscritos (Excel)</button>
        <button type="button" class="btn-mini" data-exp-ev="${esc(e.id)}" data-formato="pdf" ${lista.length ? '' : 'disabled'}><i class="fas fa-file-pdf"></i> Lista (PDF)</button>
        ${e.taxa && lista.length ? `<button type="button" class="btn-mini btn-mini-aprovar" data-taxa-ev="${esc(e.id)}"><i class="fas fa-receipt"></i> Lançar taxa aos inscritos</button>` : ''}
        <a class="btn-mini" href="rede.html#album/${encodeURIComponent(e.id)}"><i class="fas fa-images"></i> Álbum</a>
        ${podeCriar ? `<button type="button" class="btn-mini btn-mini-rejeitar" data-apagar-ev="${esc(e.id)}"><i class="fas fa-trash-can"></i> Apagar</button>` : ''}
      </div></div>`;
  }).join('') || '<div class="empty-state"><i class="far fa-calendar"></i>Nenhum evento marcado ainda.</div>'}</div>`;
  const form = el('gsFormEvento');
  if (form) form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); const fd = new FormData(form);
    const dados = { nome: String(fd.get('nome') || '').trim(), data: fd.get('data'), hora: fd.get('hora') || '', academiaId: fd.get('academiaId') || null, local: String(fd.get('local') || '').trim(), descricao: String(fd.get('descricao') || '').trim(), criadoEm: new Date().toISOString(), criadoPor: C.sessao().uid };
    if (fd.get('taxa')) dados.taxa = Number(fd.get('taxa')) || 0;
    try { await addDoc(collection(db, 'eventos'), dados); C.toast('Evento publicado — o grupo foi avisado.'); renderEventos(); } catch (e) { C.toast('Não foi possível publicar (permissão).', 'error'); }
  });
  box.querySelectorAll('[data-exp-ev]').forEach((b) => b.addEventListener('click', () => {
    const i = eventos.findIndex((e) => e.id === b.dataset.expEv); const e = eventos[i];
    const lista = conf[i].filter((c) => podeCriar || !meuNuc || c.academiaId === meuNuc || e.academiaId === meuNuc);
    exportar('evento', b.dataset.formato, null, { titulo: `Inscritos - ${e.nome || 'evento'}`, sub: `${e.data.split('-').reverse().join('/')}`, colunas: [{ chave: 'nome', titulo: 'Nome' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'em', titulo: 'Inscrito em' }], linhas: lista.map((c) => ({ nome: c.nome || '', cordao: c.cordaoAtual || '', nucleo: c.academiaId ? nomeNucleo(c.academiaId) : '', em: c.em ? new Date(c.em).toLocaleString('pt-BR') : '' })) });
  }));
  box.querySelectorAll('[data-taxa-ev]').forEach((b) => b.addEventListener('click', async () => {
    const i = eventos.findIndex((e) => e.id === b.dataset.taxaEv); const e = eventos[i];
    const usuarios = new Map(C.usuarios().map((u) => [u.id, u]));
    const alvos = conf[i].map((c) => usuarios.get(c.id)).filter((u) => u && (C.ehAdmin() || u.academiaId === meuNuc));
    if (!alvos.length) { C.toast('Nenhum inscrito do seu núcleo para lançar.', 'error'); return; }
    if (!confirm(`Lançar a taxa de ${brl(e.taxa)} ("${e.nome}") para ${alvos.length} inscrito(s)? Fica como "Pendente" no Financeiro.`)) return;
    const res = await Promise.allSettled(alvos.map((u) => lancarPagamento({ alunoId: u.id, alunoNome: u.nome || '', academiaId: u.academiaId || null, valor: Number(e.taxa) || 0, competencia: e.data.slice(0, 7), pago: false, tipo: 'adicional', descricao: `Taxa: ${e.nome || 'evento'}`.slice(0, 60), eventoId: e.id, lancadoPor: C.sessao().uid })));
    const ok = res.filter((r) => r.status === 'fulfilled').length;
    C.toast(`${ok} taxa(s) lançada(s)${ok < alvos.length ? `; ${alvos.length - ok} sem permissão` : ''}.`);
  }));
  box.querySelectorAll('[data-apagar-ev]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Apagar este evento? As inscrições somem da agenda.')) return;
    try { await deleteDoc(doc(db, 'eventos', b.dataset.apagarEv)); C.toast('Evento apagado.'); renderEventos(); } catch (e) { C.toast('Sem permissão.', 'error'); }
  }));
}

// ================= AUDITORIA =================
async function renderAuditoria() {
  const box = el('gsAuditoria'); if (!box) return;
  box.innerHTML = '<div class="card-padrao"><p><i class="fas fa-spinner fa-spin"></i> Carregando…</p></div>';
  let itens = [];
  try { itens = (await getDocs(query(collection(db, 'auditoria'), orderBy('quando', 'desc'), limit(200)))).docs.map((d) => ({ id: d.id, ...d.data() })); }
  catch (e) { box.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i>Auditoria indisponível (só Admin Master e Fundador, e depois que as funções do servidor forem publicadas).</div>'; return; }
  const ICONE = { usuarios: 'fa-user', posts: 'fa-image', pagamentos: 'fa-sack-dollar', nucleos: 'fa-building', config: 'fa-sliders', solicitacoes: 'fa-clipboard-check', presencas: 'fa-location-dot', eventos: 'fa-calendar', avisos: 'fa-bullhorn' };
  const desenhar = (filtro) => {
    const f = String(filtro || '').toLowerCase();
    const lista = itens.filter((a) => !f || `${a.resumo} ${a.alvoNome} ${a.quemNome}`.toLowerCase().includes(f));
    el('gsAudLista').innerHTML = lista.map((a) => `<details class="lista-item gs-aud"><summary><span class="gs-aud-ic"><i class="fas ${ICONE[a.colecao] || 'fa-circle'}"></i></span><span class="lista-item-info"><strong>${esc(a.resumo || '')}</strong><span>${esc(new Date(a.quando).toLocaleString('pt-BR'))}</span></span></summary>
      <div class="gs-aud-det">${a.antes ? `<div><b>Antes</b><pre>${esc(JSON.stringify(a.antes, null, 1))}</pre></div>` : ''}${a.depois ? `<div><b>Depois</b><pre>${esc(JSON.stringify(a.depois, null, 1))}</pre></div>` : ''}</div></details>`).join('') || '<div class="empty-state"><i class="fas fa-magnifying-glass"></i>Nada encontrado.</div>';
  };
  box.innerHTML = `<div class="card-padrao"><p class="gs-ajuda">Registro automático feito pelo servidor: papéis, graduações, notas, brasões concedidos, núcleos, pagamentos, solicitações, posts ocultados e presenças manuais. Guardado por 2 anos; ninguém edita.</p>
    <input type="search" id="gsAudBusca" class="input-padrao" placeholder="Buscar por pessoa ou ação…" aria-label="Buscar na auditoria"></div>
    <div class="lista-simples" id="gsAudLista"></div>`;
  desenhar('');
  el('gsAudBusca').addEventListener('input', (e) => desenhar(e.target.value));
}

// ================= LGPD (pedidos de exclusão) + ferramentas do servidor =================
async function renderLGPD() {
  const box = el('gsLGPD'); if (!box) return;
  let pedidos = [];
  try { pedidos = (await getDocs(query(collection(db, 'solicitacoes'), where('tipo', '==', 'exclusao_conta'), limit(100)))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { pedidos = []; }
  pedidos.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
  const pend = pedidos.filter((p) => p.status === 'pendente');
  box.innerHTML = `
  <div class="card-padrao"><h3><i class="fas fa-user-shield"></i> Pedidos de exclusão de conta <span class="pill ${pend.length ? 'pill-pendente' : 'pill-aprovado'}">${pend.length}</span></h3>
    <p class="gs-ajuda">Ao confirmar, o servidor apaga login, cadastro, cartão público, publicações, stories, fotos, presenças, conversas diretas e notificações. Pagamentos ficam anonimizados (obrigação fiscal). Não dá para desfazer.</p>
    <div class="lista-simples">${pedidos.map((p) => `<div class="lista-item"><div class="lista-item-info"><strong>${esc(p.solicitanteNome || p.solicitanteUid)} <span class="pill ${p.status === 'pendente' ? 'pill-pendente' : 'pill-aprovado'}">${esc(p.status)}</span></strong><span>${esc(new Date(p.criadoEm).toLocaleString('pt-BR'))}${p.dadosPedido && p.dadosPedido.motivo ? ` · "${esc(p.dadosPedido.motivo)}"` : ''}</span></div>
      ${p.status === 'pendente' ? `<div class="lista-item-actions"><button class="btn-mini btn-mini-rejeitar" data-excluir="${esc(p.solicitanteUid)}" data-nome="${esc(p.solicitanteNome || '')}"><i class="fas fa-user-xmark"></i> Excluir conta</button><button class="btn-mini" data-recusar="${esc(p.id)}">Recusar</button></div>` : ''}</div>`).join('') || '<div class="empty-state"><i class="fas fa-check"></i>Nenhum pedido.</div>'}</div></div>
  <div class="card-padrao"><h3><i class="fas fa-server"></i> Servidor</h3><p class="gs-ajuda">Recalcula o cartão público (cordão, presenças e brasões) de todo mundo a partir dos dados reais — use depois de importar dados ou se algum brasão parecer atrasado.</p>
    <div class="gs-ev-acoes"><button type="button" class="btn-detalhes" id="gsRecalcular"><i class="fas fa-rotate"></i> Recalcular brasões de todos</button><button type="button" class="btn-mini" id="gsMigrar"><i class="fas fa-wand-magic-sparkles"></i> Rodar migrações pendentes</button></div><p class="gs-ajuda" id="gsServidorRes"></p></div>`;
  box.querySelectorAll('[data-excluir]').forEach((b) => b.addEventListener('click', async () => {
    const nome = b.dataset.nome || 'este atleta';
    if (!confirm(`Excluir DEFINITIVAMENTE a conta de ${nome} e os dados dele? Não dá para desfazer.`)) return;
    if ((prompt('Para confirmar, digite EXCLUIR') || '').trim().toUpperCase() !== 'EXCLUIR') return;
    b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo…';
    try { const r = await pedirAoServidor('excluirConta', { uid: b.dataset.excluir }); C.toast(`Conta excluída (${r.posts || 0} posts, ${r.presencas || 0} presenças).`); await C.recarregarUsuarios(); renderLGPD(); }
    catch (e) { C.toast(e.message || 'Não foi possível excluir.', 'error'); b.disabled = false; b.textContent = 'Excluir conta'; }
  }));
  box.querySelectorAll('[data-recusar]').forEach((b) => b.addEventListener('click', async () => { try { await updateDoc(doc(db, 'solicitacoes', b.dataset.recusar), { status: 'rejeitado' }); renderLGPD(); } catch (e) { C.toast('Sem permissão.', 'error'); } }));
  const rodar = async (tipo, botao) => { botao.disabled = true; el('gsServidorRes').textContent = 'Trabalhando… pode levar alguns minutos.'; try { const r = await pedirAoServidor(tipo, {}, 540000); el('gsServidorRes').textContent = `Pronto: ${JSON.stringify(r)}`; } catch (e) { el('gsServidorRes').textContent = e.message; } finally { botao.disabled = false; } };
  el('gsRecalcular').addEventListener('click', (e) => rodar('recalcularTodos', e.currentTarget));
  el('gsMigrar').addEventListener('click', (e) => rodar('migrar', e.currentTarget));
}

// ---------- integração com o admin.js ----------
const TELAS = { indicadores: renderIndicadores, graduacao: renderGraduacao, eventos: renderEventos, auditoria: renderAuditoria, lgpd: renderLGPD };
export function abrirTela(nome) { const f = TELAS[nome]; if (f && C) f().catch((e) => { console.error(e); C.toast('Não foi possível abrir agora.', 'error'); }); }
// ctx: { sessao(), usuarios(), nucleos(), toast(msg, tipo), ehAdmin(), ehGestor(), fundador(), instrutor(), recarregarUsuarios() }
export function iniciarGestao(ctx) {
  C = ctx;
  // Botões de exportar nas abas que já existiam (Alunos e Financeiro).
  const nucFin = () => (C.ehAdmin() ? (document.getElementById('filtroAcademia')?.value || null) : (C.sessao().academiaGerenciadaId || null));
  const cab = (aba) => document.querySelector(`#aba-${aba} .section-header`);
  [['alunos', 'alunos'], ['financeiro', 'financeiro'], ['presenca', 'presencas']].forEach(([aba, tipo]) => {
    const h = cab(aba); if (!h || h.querySelector('.exp-grupo') || (aba !== 'alunos' && !C.ehGestor())) return;
    const w = document.createElement('div'); w.innerHTML = botoesExportar(tipo, 'Exportar'); const g = w.firstElementChild; h.appendChild(g);
    g.querySelectorAll('[data-exportar]').forEach((b) => b.addEventListener('click', () => exportar(tipo, b.dataset.formato, aba === 'alunos' && !C.ehAdmin() ? (C.sessao().academiaGerenciadaId || null) : nucFin())));
  });
}
