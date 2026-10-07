/* gestao.js — ferramentas novas do painel (admin.html):
   - Indicadores por núcleo: frequência, alunos sumidos, inadimplência, crescimento;
   - Graduação: aptos pelo termômetro, troca de cordão em lote e certificado em PDF;
   - Eventos: agenda com inscrições ("Eu vou") e lançamento de taxa;
   - Exportar para Excel e PDF (alunos, presenças, financeiro, inscritos);
   - Auditoria (quem fez o quê) e pedidos LGPD (exclusão de conta) — Admin.
   Regra de ouro: todo número vem de leitura real do Firestore; sem dado, "—". */
import {
  db, collection, doc, query, where, orderBy, limit, getDocs, updateDoc, addDoc, deleteDoc, setDoc, arrayUnion,
  listar, listarPagamentosDoNucleo, lancarPagamento, pedirAoServidor, getDoc, comMinhaEscola,
} from './firebase.js';
import { ESCOLA, CORDOES_ADULTO, prontidao, proximoCordao, coresDoCordao, META_PRONTIDAO, escadaDe } from './escola.js';
import { situacao as situacaoCarteirinha, textoValidade } from './carteirinha-comum.js';
import { CONDICOES, lacosHTML, lacoSVG, normalizarInclusao, resumoInclusao, SEM_LIMITACOES, apoiosHTML, apoioDe, materiaisHTML } from './inclusao.js?v=20261006';

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
    colunas: [{ chave: 'nome', titulo: 'Nome' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'idade', titulo: 'Idade' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'celular', titulo: 'Celular' }, { chave: 'status', titulo: 'Status' }, { chave: 'prontidao', titulo: 'Prontidão' }, { chave: 'inclusao', titulo: 'Atenção e inclusão' }, { chave: 'desde', titulo: 'No grupo desde' }],
    linhas: alunosDe(nid).sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map((a) => ({ nome: a.nome || '', cordao: a.cordaoAtual || 'Iniciante', idade: a.idade || '', nucleo: nomeNucleo(a.academiaId), celular: a.celular || '', status: a.statusAtual || 'Ativo', prontidao: prontidao(a) == null ? '—' : `${prontidao(a)}%`, inclusao: resumoInclusao(a), desde: a.criadoEm ? new Date(a.criadoEm).toLocaleDateString('pt-BR') : '' })),
  }),
  presencas: async (nid) => {
    const itens = await presencasPeriodo(nid, 90);
    const nomes = new Map(C.usuarios().map((u) => [u.id, u.nome]));
    return {
      titulo: 'Presenças (90 dias)', sub: nid ? nomeNucleo(nid) : 'Grupo todo',
      colunas: [{ chave: 'data', titulo: 'Data' }, { chave: 'hora', titulo: 'Hora' }, { chave: 'aluno', titulo: 'Aluno' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'visitou', titulo: 'Treinou em' }, { chave: 'origem', titulo: 'Registro' }],
      linhas: itens.sort((a, b) => dataDe(b.entradaEm) - dataDe(a.entradaEm)).map((p) => ({ data: dataDe(p.entradaEm).toLocaleDateString('pt-BR'), hora: dataDe(p.entradaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), aluno: nomes.get(p.uid) || p.nome || p.uid, nucleo: nomeNucleo(p.nucleoId), visitou: p.nucleoVisitadoId && p.nucleoVisitadoId !== p.nucleoId ? nomeNucleo(p.nucleoVisitadoId) : '', origem: p.origem === 'faceid' ? 'Face ID' : p.origem === 'faceid-foto' ? 'Foto da turma' : 'Manual' })),
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
  <div class="card-padrao" id="gsAssinaturas"><h3><i class="fas fa-signature"></i> Assinaturas dos certificados</h3><p class="gs-ajuda">Carregando…</p></div>
  ${C.ehAdmin() ? `<div class="card-padrao"><h3><i class="fas fa-rotate-left"></i> Graduações registradas (últimos 60 dias)</h3><p class="gs-ajuda">Registrou errado? O Admin Master desfaz: o cordão volta ao anterior, o certificado é cancelado e o responsável do núcleo é avisado para registrar de novo. Só a última troca de cada atleta pode ser desfeita.</p>${tabelaGraduacoes(graduacoesDe(nid || null, 60), true)}</div>` : ''}
  ${gradFeitos.length ? `<div class="card-padrao gs-feitos"><h3><i class="fas fa-certificate"></i> Graduados agora <span class="pill pill-aprovado">${gradFeitos.length}</span></h3><p class="gs-ajuda">${gradFeitos.map((g) => `${esc(g.nome)} → ${esc(g.cordao)}`).join(' · ')}</p><button type="button" class="btn-detalhes" id="gsCertificados"><i class="fas fa-file-pdf"></i> Certificados oficiais (PDF)</button></div>` : ''}`;
  const sel = el('gsNucGrad'); if (sel) sel.addEventListener('change', () => { gradSel.clear(); renderGraduacao(); });
  el('gsGradTodos').addEventListener('change', (e) => { gradMostrarTodos = e.target.checked; renderGraduacao(); });
  box.querySelectorAll('[data-grad]').forEach((c) => c.addEventListener('change', () => { if (c.checked) gradSel.add(c.dataset.grad); else gradSel.delete(c.dataset.grad); const b = el('gsGradSalvar'); b.disabled = !gradSel.size; b.innerHTML = `<i class="fas fa-award"></i> Registrar graduação (${gradSel.size})`; }));
  el('gsGradSalvar').addEventListener('click', () => registrarGraduacoes(lista, eventos));
  renderAssinaturas(nid || null);
  const bc = el('gsCertificados'); if (bc) bc.addEventListener('click', () => gerarCertificados(gradFeitos));
  ligarDesfazer(box, renderGraduacao);
}

// ---------- assinaturas reais dos certificados ----------
// Todo certificado leva DUAS assinaturas: o Fundador (Mestre Profeta) e o
// responsável do núcleo do aluno. Cada um cadastra a sua (desenho ou foto);
// o Admin Master pode cadastrar por eles.
function fundadorUid() {
  const us = C.usuarios();
  const f = us.find((u) => u.acessoGeral === true && u.academiaGerenciadaId) || us.find((u) => u.acessoGeral === true);
  if (!f) return null;
  const n = C.nucleos().find((x) => x.id === f.academiaGerenciadaId);
  return (n && n.professorUid) || f.id;
}
async function renderAssinaturas(nid) {
  const box = el('gsAssinaturas'); if (!box) return;
  const eu = C.sessao().uid;
  const fund = fundadorUid();
  const nuc = nid ? C.nucleos().find((x) => x.id === nid) : null;
  const pessoas = [];
  if (fund) pessoas.push({ uid: fund, papel: 'Fundador do grupo', titulo: ESCOLA.mestre });
  const tituloNuc = (n) => String(n.nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]s?\s+)?/i, '').trim();
  // Um núcleo escolhido: o responsável dele. "Grupo todo" (Admin): todos os responsáveis.
  (nuc ? [nuc] : (C.ehAdmin() ? C.nucleos().filter((n) => n.ativo !== false) : [])).forEach((n) => { if (n.professorUid) pessoas.push({ uid: n.professorUid, papel: 'Responsável do núcleo', titulo: tituloNuc(n) }); });
  const vistas = new Set(); const lista = pessoas.filter((p) => (vistas.has(p.uid + p.papel) ? false : vistas.add(p.uid + p.papel)));
  const urls = {};
  await Promise.all(Array.from(new Set(lista.map((p) => p.uid))).map((u) => getDoc(doc(db, 'assinaturas', u)).then((x) => { if (x.exists() && /^https:\/\/firebasestorage\.googleapis\.com\//.test(x.data().url || '')) urls[u] = x.data().url; }).catch(() => null)));
  if (!el('gsAssinaturas')) return;
  const nomeDe = (u) => ((C.usuarios().find((x) => x.id === u) || {}).nome || (u === eu ? C.sessao().nome : '') || 'Responsável');
  box.innerHTML = `<h3><i class="fas fa-signature"></i> Assinaturas dos certificados</h3>
    <p class="gs-ajuda">Todo certificado sai com duas assinaturas: ${esc(ESCOLA.mestre)} (Fundador) e o responsável do núcleo do aluno${nuc && nuc.professorUid === fund ? ' — neste núcleo, o próprio Fundador assina as duas' : ''}. Quem ainda não cadastrou aparece com o nome em cursiva. A troca vale também para os certificados já emitidos.</p>
    <div class="gs-ass-lista">${lista.map((p) => { const pode = p.uid === eu || C.ehAdmin(); const u = urls[p.uid]; return `<div class="gs-ass">
      <div class="gs-ass-risco">${u ? `<img src="${esc(u)}" alt="Assinatura de ${esc(nomeDe(p.uid))}">` : `<span>${esc(nomeDe(p.uid))}</span>`}</div><hr>
      <b>${esc(p.titulo || nomeDe(p.uid))}</b><small>${esc(p.papel)} · ${u ? '<span class="gs-ass-ok">assinatura cadastrada</span>' : 'nome em cursiva'}</small>
      ${pode ? `<button type="button" class="btn-mini" data-assinar="${esc(p.uid)}" data-nome="${esc(nomeDe(p.uid))}" data-titulo="${esc(p.titulo || '')}" data-atual="${esc(u || '')}"><i class="fas fa-pen-nib"></i> ${u ? 'Trocar' : (p.uid === eu ? 'Cadastrar a minha' : 'Cadastrar')}</button>` : ''}
    </div>`; }).join('') || '<div class="empty-state"><i class="fas fa-signature"></i>Escolha um núcleo para ver quem assina.</div>'}</div>`;
  box.querySelectorAll('[data-assinar]').forEach((b) => b.addEventListener('click', async () => {
    const { abrirAssinatura } = await import('./assinatura.js?v=20260930b');
    const r = await abrirAssinatura({ uid: b.dataset.assinar, nome: b.dataset.nome, titulo: b.dataset.titulo, atual: b.dataset.atual, toast: C.toast });
    if (r) renderAssinaturas(nid);
  }));
}

// ---------- graduações registradas (relatório + desfazer) ----------
const ORDEM_GRAD = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
// Todas as trocas de cordão para cima registradas (historicoGraduacoes), das mais novas para as mais velhas.
function graduacoesDe(nid, dias = null) {
  const desde = dias ? Date.now() - dias * DIA : 0;
  const out = [];
  C.usuarios().filter((u) => !nid || u.academiaId === nid).forEach((u) => {
    const hist = Array.isArray(u.historicoGraduacoes) ? u.historicoGraduacoes : [];
    hist.forEach((h, i) => {
      if (!h || !h.cordao) return;
      const t = new Date(h.em || 0).getTime();
      if (dias && !(t >= desde)) return;
      out.push({ u, h, ultima: i === hist.length - 1 && (u.cordaoAtual || 'Iniciante') === h.cordao, subiu: ORDEM_GRAD.indexOf(h.cordao) > ORDEM_GRAD.indexOf(h.anterior || 'Iniciante'), t });
    });
  });
  return out.sort((a, b) => b.t - a.t);
}
function tabelaGraduacoes(lista, comDesfazer) {
  if (!lista.length) return '<div class="empty-state"><i class="fas fa-ribbon"></i>Nenhuma troca de cordão registrada neste período.</div>';
  const faixa = (nome, u) => { const c = coresDoCordao(nome, u); return `<span class="gs-cordao" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]}"></span>`; };
  return `<div class="rg-tabela"><table><thead><tr><th>Data</th><th>Atleta</th><th>Núcleo</th><th>Troca</th><th>Graduado por</th><th>Evento</th><th>Certificado</th>${comDesfazer ? '<th></th>' : ''}</tr></thead><tbody>${lista.slice(0, 300).map(({ u, h, ultima }) => `<tr>
    <td>${esc(new Date(h.em).toLocaleDateString('pt-BR'))}</td><td><b>${esc(u.nome || '')}</b></td><td>${esc(nomeNucleo(u.academiaId))}</td>
    <td class="rg-troca">${faixa(h.anterior || 'Iniciante', u)}<small>${esc(h.anterior || 'Iniciante')}</small><i class="fas fa-arrow-right"></i>${faixa(h.cordao, u)}<small><b>${esc(h.cordao)}</b></small></td>
    <td>${esc(h.porNome || '—')}</td><td>${h.legado ? '<small class="rg-sutil">Já tinha (antes do app)</small>' : esc(h.eventoNome || '—')}</td>
    <td><button type="button" class="btn-mini" data-cert-uid="${esc(u.id)}" data-cert-cordao="${esc(h.cordao)}" data-cert-em="${esc(h.em)}"><i class="fas fa-award"></i> PDF</button></td>
    ${comDesfazer ? `<td>${ultima ? `<button type="button" class="btn-mini" data-desfazer="${esc(u.id)}" data-cordao="${esc(h.cordao)}" data-em="${esc(h.em)}"><i class="fas fa-rotate-left"></i> Desfazer</button>` : '<small class="rg-sutil">—</small>'}</td>` : ''}</tr>`).join('')}</tbody></table></div>`;
}
function ligarDesfazer(raiz, depois) {
  raiz.querySelectorAll('[data-cert-uid]').forEach((x) => x.addEventListener('click', () => gerarCertificados([{ id: x.dataset.certUid, cordao: x.dataset.certCordao, em: x.dataset.certEm }], 6000)));
  raiz.querySelectorAll('[data-desfazer]').forEach((b) => b.addEventListener('click', async () => {
    if (!C.ehAdmin()) return;
    const u = C.usuarios().find((x) => x.id === b.dataset.desfazer);
    const nome = (u && u.nome) || 'o atleta';
    const motivo = window.prompt(`Desfazer a graduação de ${nome} (${b.dataset.cordao})?\n\nO cordão volta ao anterior, o certificado é cancelado e o responsável do núcleo é avisado para registrar de novo.\n\nMotivo (aparece para o responsável do núcleo):`, 'Registro com erro');
    if (motivo === null) return;
    b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Desfazendo…';
    try {
      const r = await pedirAoServidor('desfazerGraduacao', { uid: b.dataset.desfazer, cordao: b.dataset.cordao, em: b.dataset.em, motivo: String(motivo).slice(0, 200) });
      C.toast(`Graduação desfeita: ${nome} voltou para ${r.cordao || 'o cordão anterior'}.`, 'success');
      if (C.recarregarUsuarios) await C.recarregarUsuarios();
      depois();
    } catch (e) { console.error(e); C.toast(e.message || 'Não foi possível desfazer agora.', 'error'); b.disabled = false; b.innerHTML = '<i class="fas fa-rotate-left"></i> Desfazer'; }
  }));
}

// ---------- RELATÓRIOS GERAIS (atletas, carteirinhas, graduações) ----------
// Tudo sai dos cadastros já carregados no painel (usuarios/*, com o espelho
// .carteirinha que o servidor grava): nenhuma leitura extra do banco.
let rgAba = 'atletas'; let rgFiltroCart = 'todas'; let rgDias = 90; let rgFiltroIncl = 'todas'; let exportarParceria = null;
const PAPEIS_ATLETA = ['aluno', 'instrutor', 'mestre'];
const ehAtletaU = (u) => (u.papeis || []).some((p) => PAPEIS_ATLETA.includes(p));
const inativo = (u) => u.statusAtual === 'Inativo' || u.ativo === false;
function funcaoDe(u) {
  const c = u.cordaoAtual || '';
  if (u.academiaGerenciadaId || (u.papeis || []).includes('mestre')) return ['Mestre', 'Mestre/Presidente'].includes(c) ? 'Mestre' : 'Professor(a)';
  if ((u.papeis || []).includes('instrutor') || c === 'Instrutor') return 'Instrutor(a)';
  return 'Aluno(a)';
}
function sitCart(u) {
  const c = u.carteirinha;
  if (!c || !c.codigo) return 'naoemitida';
  return situacaoCarteirinha(c);
}
const ROT_CART = { valida: ['Válidas', 'pill-aprovado'], vencida: ['Vencidas', 'pill-rejeitado'], semfoto: ['Sem foto aprovada', 'pill-pendente'], inativa: ['Inativas', 'pill-neutra'], naoemitida: ['Não emitidas', 'pill-neutra'] };
const tile = (n, rotulo, cor = '') => `<div class="rg-tile ${cor}"><b>${n}</b><small>${esc(rotulo)}</small></div>`;

export function renderRelatoriosGerais(nid) {
  const box = el('gsRelatorios'); if (!box || !C) return;
  if (!C.ehAdmin() && !C.ehGestor() && !C.fundador()) { box.innerHTML = ''; return; }
  const escopo = C.ehAdmin() || C.fundador() ? (nid || null) : (C.sessao().academiaGerenciadaId || null);
  const pessoas = C.usuarios().filter((u) => ehAtletaU(u) && (!escopo || u.academiaId === escopo || u.academiaGerenciadaId === escopo));
  const rotEscopo = escopo ? nomeNucleo(escopo) : 'Grupo todo';
  el('rgEscopo') && (el('rgEscopo').textContent = rotEscopo);
  let corpo = ''; let exportar = null; exportarParceria = null;
  if (rgAba === 'atletas') {
    const ativos = pessoas.filter((u) => !inativo(u)); const inat = pessoas.filter(inativo);
    const porFuncao = {}; ativos.forEach((u) => { const f = funcaoDe(u); porFuncao[f] = (porFuncao[f] || 0) + 1; });
    const porCordao = {}; ativos.forEach((u) => { const c = u.cordaoAtual || 'Iniciante'; porCordao[c] = (porCordao[c] || 0) + 1; });
    const maxC = Math.max(1, ...Object.values(porCordao));
    corpo = `<div class="rg-tiles">${tile(pessoas.length, 'atletas cadastrados')}${tile(ativos.length, 'ativos', 'ok')}${tile(inat.length, 'inativos', inat.length ? 'ruim' : '')}${['Aluno(a)', 'Instrutor(a)', 'Professor(a)', 'Mestre'].map((f) => tile(porFuncao[f] || 0, f.replace('(a)', 's').replace('Mestre', 'mestres').toLowerCase())).join('')}</div>
      <div class="rg-duas"><div class="card-padrao"><h3><i class="fas fa-ribbon"></i> Ativos por cordão</h3><div class="rg-barras">${ORDEM_GRAD.filter((c) => porCordao[c]).map((c) => { const cor = coresDoCordao(c); return `<div class="rg-barra"><span class="gs-cordao" style="--c1:${cor[0]};--c2:${cor[1]};--c3:${cor[2]}"></span><small>${esc(c)}</small><i style="width:${Math.round((porCordao[c] / maxC) * 100)}%"></i><b>${porCordao[c]}</b></div>`; }).join('') || '<p class="gs-ajuda">Sem atletas ativos.</p>'}</div></div>
      <div class="card-padrao"><h3><i class="fas fa-user-slash"></i> Inativos <span class="pill pill-neutra">${inat.length}</span></h3>${inat.length ? `<div class="rg-lista">${inat.slice(0, 60).map((u) => `<span><b>${esc(u.nome || '')}</b><small>${esc(nomeNucleo(u.academiaId))} · ${esc(u.cordaoAtual || 'Iniciante')}</small></span>`).join('')}</div>` : '<p class="gs-ajuda">Nenhum atleta inativo.</p>'}</div></div>`;
    exportar = () => ({ titulo: 'Atletas', sub: rotEscopo, colunas: [{ chave: 'nome', titulo: 'Nome' }, { chave: 'funcao', titulo: 'Função' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'situacao', titulo: 'Situação' }, { chave: 'desde', titulo: 'No grupo desde' }],
      linhas: pessoas.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map((u) => ({ nome: u.nome || '', funcao: funcaoDe(u), cordao: u.cordaoAtual || 'Iniciante', nucleo: nomeNucleo(u.academiaId), situacao: inativo(u) ? 'Inativo' : 'Ativo', desde: u.criadoEm ? new Date(u.criadoEm).toLocaleDateString('pt-BR') : '' })) });
  } else if (rgAba === 'carteirinhas') {
    const conta = {}; pessoas.forEach((u) => { const s = sitCart(u); conta[s] = (conta[s] || 0) + 1; });
    const benef = pessoas.reduce((n, u) => n + ((u.carteirinha && Array.isArray(u.carteirinha.beneficiarios)) ? u.carteirinha.beneficiarios.length : 0), 0);
    const bolsistas = pessoas.filter((u) => u.isentoMensalidade === true).length;
    const lista = pessoas.filter((u) => rgFiltroCart === 'todas' || sitCart(u) === rgFiltroCart).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    corpo = `<div class="rg-tiles">${Object.entries(ROT_CART).map(([k, [r]]) => tile(conta[k] || 0, r.toLowerCase(), k === 'valida' ? 'ok' : k === 'vencida' ? 'ruim' : k === 'semfoto' ? 'alerta' : '')).join('')}${tile(benef, 'beneficiários')}${tile(bolsistas, 'bolsistas')}</div>
      <div class="rg-filtros" role="group" aria-label="Filtrar carteirinhas">${[['todas', 'Todas']].concat(Object.entries(ROT_CART).map(([k, [r]]) => [k, r])).map(([k, r]) => `<button type="button" class="btn-mini${rgFiltroCart === k ? ' on' : ''}" data-rg-filtro="${k}" aria-pressed="${rgFiltroCart === k}">${esc(r)}</button>`).join('')}<a class="btn-mini" href="carteirinhas.html"><i class="fas fa-id-card"></i> Aprovar fotos</a></div>
      ${lista.length ? `<div class="rg-tabela"><table><thead><tr><th>Atleta</th><th>Núcleo</th><th>Matrícula</th><th>Situação</th><th>Validade</th><th>Beneficiários</th><th></th></tr></thead><tbody>${lista.slice(0, 400).map((u) => { const s = sitCart(u); const c = u.carteirinha || {}; return `<tr><td><b>${esc(u.nome || '')}</b><small class="rg-sutil">${esc(funcaoDe(u))}</small></td><td>${esc(nomeNucleo(u.academiaId))}</td><td class="rg-mono">${esc(c.matricula || '—')}</td><td><span class="pill ${ROT_CART[s][1]}">${esc(ROT_CART[s][0].replace(/s$/, '').replace('Sem foto aprovada', 'Sem foto').replace('Não emitida', 'Não emitida'))}</span></td><td>${esc(c.codigo ? textoValidade(c) : '—')}</td><td>${Array.isArray(c.beneficiarios) ? c.beneficiarios.length : 0}</td><td>${c.codigo ? `<a class="btn-mini" href="v.html#${esc(encodeURIComponent(c.codigo))}" target="_blank" rel="noopener">Conferir</a>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty-state"><i class="fas fa-id-card"></i>Nenhuma carteirinha nesta situação.</div>'}`;
    exportar = () => ({ titulo: 'Carteirinhas', sub: rotEscopo, colunas: [{ chave: 'nome', titulo: 'Atleta' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'matricula', titulo: 'Matrícula' }, { chave: 'situacao', titulo: 'Situação' }, { chave: 'validade', titulo: 'Validade' }, { chave: 'benef', titulo: 'Beneficiários' }, { chave: 'bolsista', titulo: 'Bolsista' }],
      linhas: lista.map((u) => { const c = u.carteirinha || {}; const s = sitCart(u); return { nome: u.nome || '', nucleo: nomeNucleo(u.academiaId), matricula: c.matricula || '', situacao: ROT_CART[s][0], validade: c.codigo ? textoValidade(c) : '', benef: Array.isArray(c.beneficiarios) ? c.beneficiarios.length : 0, bolsista: u.isentoMensalidade === true ? 'Sim' : '' }; }) });
  } else if (rgAba === 'inclusao') {
    // Atenção e inclusão: quem precisa de atenção, por condição e por núcleo,
    // com as orientações da ficha e o contato do responsável. Só para quem já
    // pode ler usuarios/ (Admin, fundador, gestor do núcleo) — o dado é sensível.
    const comAtencao = pessoas.filter((u) => normalizarInclusao(u.inclusao).condicoes.length);
    const porCond = {}; comAtencao.forEach((u) => normalizarInclusao(u.inclusao).condicoes.forEach((c) => { porCond[c] = (porCond[c] || 0) + 1; }));
    const porNucleo = {}; comAtencao.forEach((u) => { const n = nomeNucleo(u.academiaId); porNucleo[n] = (porNucleo[n] || 0) + 1; });
    const menores = comAtencao.filter((u) => Number(u.idade) < 18).length;
    const lista = comAtencao.filter((u) => rgFiltroIncl === 'todas' || normalizarInclusao(u.inclusao).condicoes.includes(rgFiltroIncl)).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
    const pct = pessoas.length ? Math.round((comAtencao.length / pessoas.length) * 100) : 0;
    corpo = `<div class="rg-tiles">${tile(comAtencao.length, `atletas com atenção (${pct}% de ${pessoas.length})`, 'ok')}${tile(menores, 'menores de 18 com atenção')}${tile(Object.keys(porNucleo).length, 'núcleos com atletas de inclusão')}${CONDICOES.filter((c) => porCond[c.id]).map((c) => `<div class="rg-tile rg-tile-laco" title="${esc(c.nome)}">${lacoSVG(c.id, 30)}<b>${porCond[c.id]}</b><small>${esc(c.sigla)}</small></div>`).join('')}</div>
      <div class="rg-filtros" role="group" aria-label="Filtrar por condição"><button type="button" class="btn-mini${rgFiltroIncl === 'todas' ? ' on' : ''}" data-rg-incl="todas" aria-pressed="${rgFiltroIncl === 'todas'}">Todas</button>${CONDICOES.map((c) => `<button type="button" class="btn-mini${rgFiltroIncl === c.id ? ' on' : ''}" data-rg-incl="${c.id}" aria-pressed="${rgFiltroIncl === c.id}" title="${esc(c.nome)}">${lacoSVG(c.id, 16)} ${esc(c.sigla)}</button>`).join('')}</div>
      ${lista.length ? `<div class="rg-tabela"><table><thead><tr><th>Atleta</th><th>Núcleo</th><th>Idade</th><th>Condições</th><th>Ficha de adaptação</th><th>Orientações do cadastro</th><th>Responsável</th></tr></thead><tbody>${lista.slice(0, 400).map((u) => { const i = normalizarInclusao(u.inclusao); const r = u.responsavelContato || {}; return `<tr><td><b>${esc(u.nome || '')}</b><small class="rg-sutil">${esc(u.cordaoAtual || 'Iniciante')} · ${esc(funcaoDe(u))}</small></td><td>${esc(nomeNucleo(u.academiaId))}</td><td>${esc(u.idade ?? '—')}</td><td>${lacosHTML(i, { px: 20, classe: 'lacos-linha', comSigla: true })}</td><td class="rg-obs">${apoiosHTML(i) || '<span class="rg-sutil">— ainda sem ficha</span>'}</td><td class="rg-obs">${esc(i.observacoes || '—')}</td><td>${r.nome ? `${esc(r.nome)}<small class="rg-sutil">${esc(r.parentesco || '')} ${esc(r.telefone || '')}</small>` : (u.celular ? esc(u.celular) : '—')}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty-state"><i class="fas fa-ribbon"></i>${comAtencao.length ? 'Nenhum atleta com esta condição.' : `Nenhum atleta marcado com atenção neste escopo — todos "${SEM_LIMITACOES}".`}</div>`}
      <p class="gs-ajuda" style="margin-top:10px">${materiaisHTML(Object.keys(porCond).length ? Object.keys(porCond) : CONDICOES.map((c) => c.id))}</p>
      <div class="rg-filtros" style="margin-top:8px"><button type="button" class="btn-mini" data-rg-parceria="pdf" title="Só totais e percentuais — nenhum atleta é identificado"><i class="fas fa-handshake"></i> Relatório para parcerias (anonimizado) — PDF</button><button type="button" class="btn-mini" data-rg-parceria="xlsx"><i class="fas fa-file-excel"></i> Anonimizado — Excel</button></div>
      <p class="gs-ajuda" style="margin-top:10px"><i class="fas fa-lock"></i> Dado sensível (LGPD): use só para adaptar o treino e orientar a equipe. Não divulgue a lista. Exportar gera um arquivo local — guarde com o mesmo cuidado. Para apresentar a escolas, prefeituras e patrocinadores, use o <b>relatório para parcerias</b>: ele só traz totais e percentuais.</p>`;
    exportar = () => ({ titulo: 'Atenção e inclusão', sub: rotEscopo + (rgFiltroIncl === 'todas' ? '' : ` · ${rgFiltroIncl}`), colunas: [{ chave: 'nome', titulo: 'Atleta' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'idade', titulo: 'Idade' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'condicoes', titulo: 'Condições' }, { chave: 'apoios', titulo: 'Ficha de adaptação' }, { chave: 'obs', titulo: 'Orientações' }, { chave: 'resp', titulo: 'Responsável' }, { chave: 'contato', titulo: 'Contato' }],
      linhas: lista.map((u) => { const i = normalizarInclusao(u.inclusao); const r = u.responsavelContato || {}; return { nome: u.nome || '', nucleo: nomeNucleo(u.academiaId), idade: u.idade ?? '', cordao: u.cordaoAtual || 'Iniciante', condicoes: i.condicoes.map((c) => { const k = CONDICOES.find((x) => x.id === c); return k ? `${k.sigla} (${k.nome})` : c; }).join('; '), apoios: i.apoios.map((a) => (apoioDe(a) || {}).nome || a).join('; '), obs: i.observacoes || '', resp: r.nome || '', contato: r.telefone || u.celular || '' }; }) });
    // Relatório para parcerias: SÓ agregados (totais, percentuais, faixas etárias, por núcleo e por condição).
    // Nenhum nome, idade exata ou contato — é o que se pode mostrar a escola, prefeitura e patrocinador.
    exportarParceria = () => {
      const faixa = (u) => { const i = Number(u.idade); return !i ? 'sem idade' : i <= 12 ? 'até 12 anos' : i < 18 ? '13 a 17 anos' : '18 anos ou mais'; };
      const porFaixa = {}; comAtencao.forEach((u) => { porFaixa[faixa(u)] = (porFaixa[faixa(u)] || 0) + 1; });
      const ativosIncl = comAtencao.filter((u) => u.ativo !== false && u.statusAtual !== 'Inativo').length;
      const comFicha = comAtencao.filter((u) => normalizarInclusao(u.inclusao).apoios.length).length;
      const linhas = [
        { grupo: 'Visão geral', indicador: 'Atletas no escopo', valor: pessoas.length },
        { grupo: 'Visão geral', indicador: 'Atletas com atenção e inclusão', valor: `${comAtencao.length} (${pct}%)` },
        { grupo: 'Visão geral', indicador: 'Atletas de inclusão ativos (treinando)', valor: ativosIncl },
        { grupo: 'Visão geral', indicador: 'Com ficha de adaptação preenchida', valor: comFicha },
        { grupo: 'Visão geral', indicador: 'Núcleos com atletas de inclusão', valor: Object.keys(porNucleo).length },
      ].concat(CONDICOES.filter((c) => porCond[c.id]).map((c) => ({ grupo: 'Por condição', indicador: `${c.sigla} — ${c.nome}`, valor: porCond[c.id] })))
        .concat(Object.entries(porFaixa).map(([f, n]) => ({ grupo: 'Por faixa etária', indicador: f, valor: n })))
        .concat(Object.entries(porNucleo).sort((a, b) => b[1] - a[1]).map(([n, q]) => ({ grupo: 'Por núcleo', indicador: n, valor: q })));
      return { titulo: 'Inclusão na roda — relatório para parcerias', sub: `${rotEscopo} · ${new Date().toLocaleDateString('pt-BR')} · dados agregados, sem identificação de atletas (LGPD)`, colunas: [{ chave: 'grupo', titulo: 'Grupo' }, { chave: 'indicador', titulo: 'Indicador' }, { chave: 'valor', titulo: 'Valor' }], linhas };
    };
  } else {
    const lista = graduacoesDe(escopo, rgDias || null).filter((g) => g.subiu && !g.h.legado);
    const porCordao = {}; lista.forEach((g) => { porCordao[g.h.cordao] = (porCordao[g.h.cordao] || 0) + 1; });
    const eventos = new Set(lista.map((g) => g.h.eventoNome).filter(Boolean));
    corpo = `<div class="rg-filtros" role="group" aria-label="Período">${[[30, '30 dias'], [90, '90 dias'], [365, '12 meses'], [0, 'Tudo']].map(([d, r]) => `<button type="button" class="btn-mini${rgDias === d ? ' on' : ''}" data-rg-dias="${d}" aria-pressed="${rgDias === d}">${r}</button>`).join('')}</div>
      <div class="rg-tiles">${tile(lista.length, 'trocas de cordão', 'ok')}${tile(new Set(lista.map((g) => g.u.id)).size, 'atletas graduados')}${tile(eventos.size, 'batizados/eventos')}${ORDEM_GRAD.filter((c) => porCordao[c]).slice(-4).map((c) => tile(porCordao[c], `para ${c}`)).join('')}</div>
      ${tabelaGraduacoes(lista, C.ehAdmin())}`;
    exportar = () => ({ titulo: 'Graduações', sub: `${rotEscopo} · ${rgDias ? `últimos ${rgDias} dias` : 'todo o período'}`, colunas: [{ chave: 'data', titulo: 'Data' }, { chave: 'nome', titulo: 'Atleta' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'de', titulo: 'Cordão anterior' }, { chave: 'para', titulo: 'Novo cordão' }, { chave: 'por', titulo: 'Graduado por' }, { chave: 'evento', titulo: 'Evento' }],
      linhas: lista.map(({ u, h }) => ({ data: new Date(h.em).toLocaleDateString('pt-BR'), nome: u.nome || '', nucleo: nomeNucleo(u.academiaId), de: h.anterior || 'Iniciante', para: h.cordao, por: h.porNome || '', evento: h.eventoNome || '' })) });
  }
  box.innerHTML = `<div class="rg-abas" role="tablist" aria-label="Relatórios gerais">${[['atletas', 'fa-users', 'Atletas ativos e inativos'], ['carteirinhas', 'fa-id-card', 'Carteirinhas'], ['graduacoes', 'fa-award', 'Graduações'], ['inclusao', 'fa-ribbon', 'Atenção e inclusão']].map(([k, ic, r]) => `<button type="button" role="tab" aria-selected="${rgAba === k}" class="${rgAba === k ? 'on' : ''}" data-rg-aba="${k}"><i class="fas ${ic}"></i> ${r}</button>`).join('')}
    <span class="rg-exp"><button type="button" class="btn-mini exp-btn" data-rg-exp="xlsx"><i class="fas fa-file-excel"></i> Excel</button><button type="button" class="btn-mini exp-btn" data-rg-exp="pdf"><i class="fas fa-file-pdf"></i> PDF</button></span></div>
    <div class="rg-corpo">${corpo}</div>`;
  box.querySelectorAll('[data-rg-aba]').forEach((b) => b.addEventListener('click', () => { rgAba = b.dataset.rgAba; renderRelatoriosGerais(nid); }));
  box.querySelectorAll('[data-rg-filtro]').forEach((b) => b.addEventListener('click', () => { rgFiltroCart = b.dataset.rgFiltro; renderRelatoriosGerais(nid); }));
  box.querySelectorAll('[data-rg-dias]').forEach((b) => b.addEventListener('click', () => { rgDias = Number(b.dataset.rgDias); renderRelatoriosGerais(nid); }));
  box.querySelectorAll('[data-rg-incl]').forEach((b) => b.addEventListener('click', () => { rgFiltroIncl = b.dataset.rgIncl; renderRelatoriosGerais(nid); }));
  box.querySelectorAll('[data-rg-exp]').forEach((b) => b.addEventListener('click', () => { const d = exportar(); exportarRel(b.dataset.rgExp, d); }));
  box.querySelectorAll('[data-rg-parceria]').forEach((b) => b.addEventListener('click', () => { if (exportarParceria) exportarRel(b.dataset.rgParceria, exportarParceria()); }));
  ligarDesfazer(box, () => renderRelatoriosGerais(nid));
}
async function exportarRel(formato, d) {
  try {
    if (!d.linhas.length) { C.toast('Nada para exportar ainda.', 'error'); return; }
    C.toast('Preparando o arquivo…');
    if (formato === 'xlsx') await exportarExcel(d.titulo, d.colunas, d.linhas); else await exportarPDF(d.titulo, d.colunas, d.linhas, d.sub);
  } catch (e) { console.error(e); C.toast(e.message || 'Não foi possível exportar agora.', 'error'); }
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
// Certificados OFICIAIS (os mesmos do QR, certificado.html): o servidor emite um
// por troca de cordão logo depois do registro; aqui só esperamos ele aparecer em
// certificadosDe/{uid} e abrimos todos juntos, prontos para imprimir/salvar em PDF.
// lista = [{ id, cordao, em? }]
async function codigosDosCertificados(lista, esperarMs) {
  const fim = Date.now() + esperarMs;
  const achados = new Map();
  while (true) {
    await Promise.all(lista.filter((g) => !achados.has(`${g.id}|${g.cordao}`)).map(async (g) => {
      try {
        const s = await getDoc(doc(db, 'certificadosDe', g.id));
        const itens = s.exists() && Array.isArray(s.data().itens) ? s.data().itens : [];
        const doCordao = itens.filter((i) => i.cordao === g.cordao);
        const dia = g.em ? String(g.em).slice(0, 10) : '';
        const it = doCordao.find((i) => dia && i.data === dia) || doCordao.find((i) => !i.legado) || doCordao[doCordao.length - 1];
        if (it && it.codigo) achados.set(`${g.id}|${g.cordao}`, it.codigo);
      } catch (e) { /* sem permissão ou offline: tenta de novo */ }
    }));
    if (achados.size >= lista.length || Date.now() > fim) break;
    await new Promise((r) => setTimeout(r, 2500));
  }
  return lista.map((g) => achados.get(`${g.id}|${g.cordao}`)).filter(Boolean);
}
export async function gerarCertificados(lista, esperarMs = 45000) {
  if (!lista || !lista.length) return;
  // A janela abre já no clique (senão o navegador bloqueia) e recebe o endereço depois.
  const janela = window.open('', '_blank');
  if (janela) { try { janela.document.write('<p style="font:600 16px system-ui;padding:24px;color:#002D72">Preparando os certificados oficiais…</p>'); } catch (e) { /* ok */ } }
  C && C.toast('Preparando os certificados oficiais…');
  const codigos = await codigosDosCertificados(lista, esperarMs);
  if (!codigos.length) {
    if (janela) janela.close();
    C && C.toast('Os certificados ainda estão sendo emitidos. Tente de novo em alguns segundos.', 'error');
    return;
  }
  const url = new URL(`certificado.html?imprimir=1#${codigos.map(encodeURIComponent).join(',')}`, location.href).href;
  if (janela && !janela.closed) janela.location.href = url; else window.location.href = url;
  if (codigos.length < lista.length) C && C.toast(`${codigos.length} de ${lista.length} certificados prontos; os outros saem em instantes.`, 'error');
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
    try { await addDoc(collection(db, 'eventos'), await comMinhaEscola(dados)); C.toast('Evento publicado — o grupo foi avisado.'); renderEventos(); } catch (e) { C.toast('Não foi possível publicar (permissão).', 'error'); }
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
