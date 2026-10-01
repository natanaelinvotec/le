/* aniversarios.js — aba "Aniversários" do painel (Admin Master, Fundador e
responsável de núcleo) + o lembrete de 48 horas no topo do painel.

Escopo: o Admin e o Fundador veem o grupo todo (com filtro de núcleo); o
responsável vê os atletas do próprio núcleo. Tudo sai dos cadastros já
carregados pelo painel (usuarios.dataNasc) — nenhuma leitura extra do banco.
O aviso por notificação (48 h antes e no dia) é do servidor
(functions/src/aniversarios.js).

  iniciarAniversarios(ctx)   ctx = { usuarios(), nucleos(), sessao(), ehAdmin(), fundador(), toast(), salvarUsuario(id, dados), exportarExcel, exportarPDF }
  renderAniversarios()       desenha a aba
  lembrete48h()              faixa "aniversários nas próximas 48 h" no topo do painel */
import { coresDoCordao, nomeBonito } from './escola.js';

let C = null;
const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_CURTO = MESES.map((m) => m.slice(0, 3));
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIA = 86400000;

// ---------- datas ----------
export function lerNascimento(v) {
  const s = String(v || '').trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return { a: +m[1], m: +m[2], d: +m[3] };
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return { a: +m[3], m: +m[2], d: +m[1] };
  return null;
}
const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const noAno = (n, ano) => new Date(ano, n.m - 1, n.m === 2 && n.d === 29 && !bissexto(ano) ? 28 : n.d);
const hoje0 = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
function proximo(n, base = hoje0()) {
  let d = noAno(n, base.getFullYear());
  if (d < base) d = noAno(n, base.getFullYear() + 1);
  return { data: d, dias: Math.round((d - base) / DIA), idade: d.getFullYear() - n.a };
}
const idadeHoje = (n, base = hoje0()) => { const d = noAno(n, base.getFullYear()); return base.getFullYear() - n.a - (d > base ? 1 : 0); };
const quandoTexto = (dias) => (dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`);
const dataCurta = (d) => `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} · ${SEMANA_LONGA[d.getDay()]}`;

// ---------- dados ----------
const PAPEIS = ['aluno', 'instrutor', 'mestre'];
const ehAtleta = (u) => Array.isArray(u.papeis) && u.papeis.some((p) => PAPEIS.includes(p));
const inativo = (u) => u.ativo === false || u.statusAtual === 'Inativo';
const nomeNucleo = (id) => ((C.nucleos().find((n) => n.id === id) || {}).nome || '—');
const verTudo = () => C.ehAdmin() || C.fundador();
function escopo() {
  const s = C.sessao();
  return C.usuarios().filter((u) => ehAtleta(u) && (verTudo() || u.academiaId === s.academiaGerenciadaId));
}
function comAniversario(lista) {
  const base = hoje0();
  return lista.map((u) => { const n = lerNascimento(u.dataNasc); return n ? { u, n, ...proximo(n, base), idadeAtual: idadeHoje(n, base) } : null; }).filter(Boolean);
}
const faixaDe = (idade) => (idade < 12 ? 'kids' : idade < 18 ? 'teen' : 'adulto');
const ROT_FAIXA = { kids: 'Kids (até 11)', teen: '12 a 17 anos', adulto: 'Adultos (18+)' };

// ---------- estado da tela ----------
const st = { vista: 'calendario', mes: null, ano: null, diaSel: null, busca: '', nucleo: '', mesFiltro: '', periodo: '', faixa: '', status: 'ativos' };

function filtrados(todos) {
  const q = st.busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return todos.filter((x) => (!st.nucleo || x.u.academiaId === st.nucleo)
    && (st.status === 'todos' || !inativo(x.u))
    && (!st.mesFiltro || x.n.m === Number(st.mesFiltro))
    && (!st.periodo || x.dias <= Number(st.periodo))
    && (!st.faixa || faixaDe(x.idade) === st.faixa)
    && (!q || String(x.u.nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q)));
}

const avatar = (u, cls = '') => (u.fotoUrl && /^https:/.test(u.fotoUrl)
  ? `<img class="an-av ${cls}" src="${esc(u.fotoUrl)}" alt="" loading="lazy">`
  : `<span class="an-av ${cls}">${esc(String(u.nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase())}</span>`);
const faixaCordao = (u) => { const c = coresDoCordao(u.cordaoAtual || 'Iniciante', u); return `<span class="gs-cordao" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]}" title="Cordão ${esc(u.cordaoAtual || 'Iniciante')}"></span>`; };
function linkZap(x) {
  const tel = String(x.u.celular || '').replace(/\D/g, '');
  if (tel.length < 10) return '';
  const num = tel.startsWith('55') ? tel : `55${tel}`;
  const nome = String(nomeBonito(x.u.nome) || '').split(' ')[0];
  const txt = x.dias === 0 ? `Parabéns, ${nome}! Feliz aniversário! Que esse novo ano venha com muita saúde, alegria e muita capoeira. Shalom, capoeira!` : `Oi, ${nome}! Passando para lembrar que o seu aniversário está chegando. Shalom, capoeira!`;
  return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
}

// ---------- lembrete de 48 horas (topo do painel) ----------
export function lembrete48h() {
  if (!C) return;
  const lista = comAniversario(escopo().filter((u) => !inativo(u))).filter((x) => x.dias <= 2).sort((a, b) => a.dias - b.dias || String(a.u.nome).localeCompare(String(b.u.nome)));
  const badge = el('anBadge');
  if (badge) { badge.textContent = String(lista.length); badge.hidden = !lista.length; }
  const chave = `le.aniv.fechado.${hoje0().toISOString().slice(0, 10)}`;
  let fechado = false; try { fechado = localStorage.getItem(chave) === '1'; } catch (e) { /* ok */ }
  let faixa = el('anLembrete');
  if (!lista.length || fechado) { if (faixa) faixa.remove(); return; }
  if (!faixa) {
    const alvo = document.querySelector('#aba-alunos'); if (!alvo) return;
    faixa = document.createElement('div'); faixa.id = 'anLembrete'; faixa.className = 'an-lembrete';
    faixa.setAttribute('role', 'status');
    alvo.insertBefore(faixa, alvo.firstChild);
  }
  faixa.innerHTML = `<span class="an-lembrete-ic" aria-hidden="true"><i class="fas fa-cake-candles"></i></span>
    <div class="an-lembrete-txt"><b>Aniversários nas próximas 48 horas</b><span>${lista.slice(0, 5).map((x) => `${esc(String(nomeBonito(x.u.nome)).split(' ')[0])} <small>(${x.dias === 0 ? 'hoje' : x.dias === 1 ? 'amanhã' : 'em 2 dias'}, ${x.idade} anos)</small>`).join(' · ')}${lista.length > 5 ? ` e mais ${lista.length - 5}` : ''}</span></div>
    <button type="button" class="btn-mini" data-an="abrir">Ver aniversários</button>
    <button type="button" class="an-lembrete-x" data-an="fechar" aria-label="Fechar lembrete de hoje">×</button>`;
  faixa.querySelector('[data-an="abrir"]').onclick = () => window.mudarAba && window.mudarAba('aniversarios');
  faixa.querySelector('[data-an="fechar"]').onclick = () => { try { localStorage.setItem(chave, '1'); } catch (e) { /* ok */ } faixa.remove(); };
}

// ---------- aba ----------
export function renderAniversarios() {
  const box = el('anConteudo'); if (!box || !C) return;
  const base = hoje0();
  if (st.mes === null) { st.mes = base.getMonth(); st.ano = base.getFullYear(); }
  const todosAtletas = escopo();
  const todos = comAniversario(todosAtletas);
  const lista = filtrados(todos).sort((a, b) => a.dias - b.dias || String(a.u.nome).localeCompare(String(b.u.nome)));
  const semData = todosAtletas.filter((u) => !lerNascimento(u.dataNasc) && (st.status === 'todos' || !inativo(u)) && (!st.nucleo || u.academiaId === st.nucleo));
  const ativos = todos.filter((x) => (st.status === 'todos' || !inativo(x.u)) && (!st.nucleo || x.u.academiaId === st.nucleo));
  const proximos48 = ativos.filter((x) => x.dias <= 2).sort((a, b) => a.dias - b.dias);
  const noMes = ativos.filter((x) => x.n.m === base.getMonth() + 1).length;
  const em30 = ativos.filter((x) => x.dias <= 30).length;
  const tile = (n, r, cls = '') => `<div class="rg-tile ${cls}"><b>${n}</b><small>${esc(r)}</small></div>`;

  const nucleosOpc = verTudo() ? `<label class="an-filtro"><span>Núcleo</span><select id="anNucleo" class="input-padrao"><option value="">Grupo todo</option>${C.nucleos().filter((n) => n.ativo !== false).map((n) => `<option value="${esc(n.id)}" ${st.nucleo === n.id ? 'selected' : ''}>${esc(n.nome)}</option>`).join('')}</select></label>` : '';

  box.innerHTML = `
  <div class="an-proximos">
    <div class="an-proximos-cab"><span class="an-eyebrow"><i class="fas fa-bell"></i> Próximas 48 horas</span><small>O responsável do núcleo e o Admin Master também recebem o aviso no celular, 2 dias antes e no dia.</small></div>
    ${proximos48.length ? `<div class="an-cards">${proximos48.map((x) => { const z = linkZap(x); return `<article class="an-card ${x.dias === 0 ? 'hoje' : ''}">
      ${avatar(x.u, 'g')}<div class="an-card-txt"><span class="an-quando">${quandoTexto(x.dias)}</span><b>${esc(nomeBonito(x.u.nome))}</b><small>faz ${x.idade} anos · ${esc(dataCurta(x.data))}</small><small>${faixaCordao(x.u)} ${esc(x.u.cordaoAtual || 'Iniciante')}${verTudo() ? ` · ${esc(nomeNucleo(x.u.academiaId))}` : ''}</small></div>
      ${z ? `<a class="an-zap" href="${esc(z)}" target="_blank" rel="noopener" aria-label="Mandar parabéns no WhatsApp para ${esc(x.u.nome)}"><i class="fab fa-whatsapp"></i></a>` : ''}</article>`; }).join('')}</div>`
      : '<p class="an-vazio-48"><i class="fas fa-mug-hot"></i> Nenhum aniversário nas próximas 48 horas.</p>'}
  </div>
  <div class="rg-tiles">${tile(proximos48.length, 'nas próximas 48 h', proximos48.length ? 'alerta' : '')}${tile(noMes, `em ${MESES[base.getMonth()].toLowerCase()}`)}${tile(em30, 'nos próximos 30 dias')}${tile(ativos.length, 'com data cadastrada', 'ok')}${tile(semData.length, 'sem data de nascimento', semData.length ? 'ruim' : '')}</div>
  <div class="an-barra">
    <div class="rg-abas" role="tablist" aria-label="Visualização">${[['calendario', 'fa-calendar-days', 'Calendário'], ['lista', 'fa-list', 'Lista'], ['relatorio', 'fa-chart-column', 'Relatório']].map(([k, ic, r]) => `<button type="button" role="tab" aria-selected="${st.vista === k}" class="${st.vista === k ? 'on' : ''}" data-an-vista="${k}"><i class="fas ${ic}"></i> ${r}</button>`).join('')}</div>
    <span class="rg-exp"><button type="button" class="btn-mini exp-btn" data-an-exp="xlsx"><i class="fas fa-file-excel"></i> Excel</button><button type="button" class="btn-mini exp-btn" data-an-exp="pdf"><i class="fas fa-file-pdf"></i> PDF</button></span>
  </div>
  <div class="an-filtros">
    <label class="an-filtro an-busca"><span>Buscar</span><input id="anBusca" class="input-padrao" type="search" placeholder="Nome do atleta…" value="${esc(st.busca)}" autocomplete="off"></label>
    ${nucleosOpc}
    <label class="an-filtro"><span>Mês</span><select id="anMes" class="input-padrao"><option value="">Todos</option>${MESES.map((m, i) => `<option value="${i + 1}" ${String(st.mesFiltro) === String(i + 1) ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
    <label class="an-filtro"><span>Período</span><select id="anPeriodo" class="input-padrao"><option value="">Qualquer</option>${[[7, 'Próximos 7 dias'], [30, 'Próximos 30 dias'], [90, 'Próximos 90 dias']].map(([v, r]) => `<option value="${v}" ${String(st.periodo) === String(v) ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    <label class="an-filtro"><span>Idade</span><select id="anFaixa" class="input-padrao"><option value="">Todas</option>${Object.entries(ROT_FAIXA).map(([k, r]) => `<option value="${k}" ${st.faixa === k ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
    <label class="an-filtro"><span>Situação</span><select id="anStatus" class="input-padrao"><option value="ativos" ${st.status === 'ativos' ? 'selected' : ''}>Só ativos</option><option value="todos" ${st.status === 'todos' ? 'selected' : ''}>Ativos e inativos</option></select></label>
  </div>
  <div class="an-vista">${st.vista === 'calendario' ? calendarioHTML(lista) : st.vista === 'lista' ? listaHTML(lista) : relatorioHTML(lista)}</div>
  ${semDataHTML(semData)}`;
  ligar(box, lista, semData);
}

function calendarioHTML(lista) {
  const base = hoje0();
  const primeiroDia = new Date(st.ano, st.mes, 1); const diasNoMes = new Date(st.ano, st.mes + 1, 0).getDate();
  const porDia = new Map();
  lista.forEach((x) => { const d = noAno(x.n, st.ano); if (d.getMonth() !== st.mes) return; const k = d.getDate(); if (!porDia.has(k)) porDia.set(k, []); porDia.get(k).push(x); });
  const celulas = [];
  for (let i = 0; i < primeiroDia.getDay(); i++) celulas.push('<div class="an-dia vazio" aria-hidden="true"></div>');
  for (let d = 1; d <= diasNoMes; d++) {
    const data = new Date(st.ano, st.mes, d); const gente = porDia.get(d) || [];
    const ehHoje = +data === +base; const sel = st.diaSel === d;
    const diff = Math.round((data - base) / DIA);
    celulas.push(`<button type="button" class="an-dia${ehHoje ? ' hoje' : ''}${gente.length ? ' tem' : ''}${sel ? ' sel' : ''}${gente.length && diff >= 0 && diff <= 2 ? ' breve' : ''}" data-an-dia="${d}" aria-label="${d} de ${MESES[st.mes]}${gente.length ? `: ${gente.length} aniversário${gente.length > 1 ? 's' : ''}` : ''}" aria-pressed="${sel}">
      <span class="n">${d}</span>${gente.length ? `<span class="an-dia-gente">${gente.slice(0, 3).map((x) => avatar(x.u, 'p')).join('')}${gente.length > 3 ? `<em>+${gente.length - 3}</em>` : ''}</span>` : ''}</button>`);
  }
  const contaMes = (m) => lista.filter((x) => x.n.m === m + 1).length;
  const doDia = st.diaSel ? (porDia.get(st.diaSel) || []) : [];
  return `<div class="an-cal-wrap">
    <div class="an-cal card-padrao">
      <div class="an-cal-cab"><button type="button" class="an-nav" data-an-mes="-1" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button>
        <h3>${MESES[st.mes]} <span>${st.ano}</span></h3>
        <button type="button" class="an-nav" data-an-mes="1" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button>
        <button type="button" class="btn-mini an-hoje-bt" data-an-mes="0">Hoje</button></div>
      <div class="an-semana">${SEMANA.map((s) => `<span>${s}</span>`).join('')}</div>
      <div class="an-grade">${celulas.join('')}</div>
      <div class="an-ano" aria-label="Aniversários por mês">${MES_CURTO.map((m, i) => `<button type="button" class="${i === st.mes ? 'on' : ''}" data-an-ir="${i}">${m}<b>${contaMes(i) || ''}</b></button>`).join('')}</div>
    </div>
    <aside class="an-lado card-padrao" aria-live="polite">
      ${st.diaSel ? `<h3>${st.diaSel} de ${MESES[st.mes].toLowerCase()}</h3>${doDia.length ? `<div class="an-mini-lista">${doDia.map(itemCurto).join('')}</div>` : '<p class="gs-ajuda">Nenhum aniversário neste dia.</p>'}`
        : `<h3>${MESES[st.mes]}</h3>${porDia.size ? `<div class="an-mini-lista">${Array.from(porDia.entries()).sort((a, b) => a[0] - b[0]).flatMap(([, l]) => l).map(itemCurto).join('')}</div>` : '<p class="gs-ajuda">Nenhum aniversário neste mês com os filtros escolhidos.</p>'}`}
    </aside>
  </div>`;
}
function itemCurto(x) {
  const d = noAno(x.n, st.ano); const z = linkZap(x);
  return `<div class="an-mini">${avatar(x.u)}<span><b>${esc(nomeBonito(x.u.nome))}</b><small>${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')} · faz ${d.getFullYear() - x.n.a} anos${verTudo() ? ` · ${esc(nomeNucleo(x.u.academiaId))}` : ''}</small></span>${z ? `<a class="an-zap p" href="${esc(z)}" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}</div>`;
}
function listaHTML(lista) {
  if (!lista.length) return '<div class="empty-state"><i class="fas fa-cake-candles"></i>Nenhum aniversário com esses filtros.</div>';
  return `<div class="rg-tabela"><table class="an-tabela"><thead><tr><th>Quando</th><th>Atleta</th><th>Data</th><th>Faz</th><th>Cordão</th>${verTudo() ? '<th>Núcleo</th>' : ''}<th></th></tr></thead><tbody>${lista.slice(0, 500).map((x) => { const z = linkZap(x); return `<tr class="${x.dias <= 2 ? 'breve' : ''}">
    <td><span class="an-chip ${x.dias === 0 ? 'hoje' : x.dias <= 2 ? 'breve' : x.dias <= 30 ? 'mes' : ''}">${quandoTexto(x.dias)}</span></td>
    <td><span class="an-pessoa">${avatar(x.u)}<span><b>${esc(nomeBonito(x.u.nome))}</b>${inativo(x.u) ? '<small class="rg-sutil">inativo</small>' : ''}</span></span></td>
    <td>${esc(dataCurta(x.data))}</td><td class="rg-mono">${x.idade} anos</td>
    <td>${faixaCordao(x.u)} <small>${esc(x.u.cordaoAtual || 'Iniciante')}</small></td>
    ${verTudo() ? `<td>${esc(nomeNucleo(x.u.academiaId))}</td>` : ''}
    <td>${z ? `<a class="btn-mini an-zap-bt" href="${esc(z)}" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i> ${x.dias === 0 ? 'Parabéns' : 'Mensagem'}</a>` : '<small class="rg-sutil">sem celular</small>'}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function relatorioHTML(lista) {
  const porMes = MESES.map((_, i) => lista.filter((x) => x.n.m === i + 1).length);
  const max = Math.max(1, ...porMes);
  const atual = hoje0().getMonth();
  const faixas = Object.keys(ROT_FAIXA).map((k) => [k, lista.filter((x) => faixaDe(x.idadeAtual) === k).length]);
  const totalF = Math.max(1, lista.length);
  const media = lista.length ? (lista.reduce((s, x) => s + x.idadeAtual, 0) / lista.length).toFixed(1).replace('.', ',') : '—';
  const porNucleo = verTudo() ? Array.from(lista.reduce((m, x) => m.set(x.u.academiaId || '', (m.get(x.u.academiaId || '') || 0) + 1), new Map())).sort((a, b) => b[1] - a[1]) : [];
  return `<div class="an-rel">
    <div class="card-padrao an-rel-meses"><h3><i class="fas fa-chart-column"></i> Aniversários por mês</h3>
      <div class="an-colunas" role="img" aria-label="Aniversários por mês: ${porMes.map((n, i) => `${MESES[i]} ${n}`).join(', ')}">${porMes.map((n, i) => `<div class="an-col${i === atual ? ' atual' : ''}"><b>${n || ''}</b><i style="height:${Math.round((n / max) * 100)}%"></i><small>${MES_CURTO[i]}</small></div>`).join('')}</div></div>
    <div class="card-padrao"><h3><i class="fas fa-people-group"></i> Faixa etária (hoje)</h3>
      <div class="an-faixas">${faixas.map(([k, n]) => `<div class="an-faixa"><span>${ROT_FAIXA[k]}</span><i><em style="width:${Math.round((n / totalF) * 100)}%"></em></i><b>${n}</b></div>`).join('')}</div>
      <p class="gs-ajuda" style="margin-top:12px">Idade média: <b>${media}</b> anos · ${lista.length} atleta${lista.length === 1 ? '' : 's'} com data cadastrada.</p></div>
    ${porNucleo.length ? `<div class="card-padrao"><h3><i class="fas fa-location-dot"></i> Por núcleo</h3><div class="rg-barras">${porNucleo.map(([id, n]) => `<div class="an-faixa"><span>${esc(nomeNucleo(id))}</span><i><em style="width:${Math.round((n / totalF) * 100)}%"></em></i><b>${n}</b></div>`).join('')}</div></div>` : ''}
  </div>`;
}
function semDataHTML(semData) {
  if (!semData.length) return '';
  return `<details class="card-padrao an-semdata"${semData.length <= 8 ? ' open' : ''}><summary><i class="fas fa-circle-exclamation"></i> Sem data de nascimento <span class="pill pill-pendente">${semData.length}</span><small>Sem a data, o atleta fica de fora do calendário e dos avisos.</small></summary>
    <div class="an-semdata-lista">${semData.sort((a, b) => String(a.nome).localeCompare(String(b.nome))).slice(0, 200).map((u) => `<form class="an-semdata-item" data-an-nasc="${esc(u.id)}">${avatar(u)}<span><b>${esc(nomeBonito(u.nome))}</b><small>${verTudo() ? esc(nomeNucleo(u.academiaId)) : esc(u.cordaoAtual || 'Iniciante')}</small></span>
      <input type="date" class="input-padrao" name="nasc" max="${hoje0().toISOString().slice(0, 10)}" min="1920-01-01" required aria-label="Data de nascimento de ${esc(u.nome)}"><button type="submit" class="btn-mini btn-mini-aprovar">Salvar</button></form>`).join('')}</div></details>`;
}

function ligar(box, lista, semData) {
  const rerender = () => renderAniversarios();
  box.querySelectorAll('[data-an-vista]').forEach((b) => b.addEventListener('click', () => { st.vista = b.dataset.anVista; rerender(); }));
  box.querySelectorAll('[data-an-mes]').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.anMes);
    if (!d) { const h = hoje0(); st.mes = h.getMonth(); st.ano = h.getFullYear(); st.diaSel = h.getDate(); } else { const n = new Date(st.ano, st.mes + d, 1); st.mes = n.getMonth(); st.ano = n.getFullYear(); st.diaSel = null; }
    rerender();
  }));
  box.querySelectorAll('[data-an-ir]').forEach((b) => b.addEventListener('click', () => { st.mes = Number(b.dataset.anIr); st.diaSel = null; rerender(); }));
  box.querySelectorAll('[data-an-dia]').forEach((b) => b.addEventListener('click', () => { const d = Number(b.dataset.anDia); st.diaSel = st.diaSel === d ? null : d; rerender(); }));
  const sel = (id, k) => { const x = el(id); if (x) x.addEventListener('change', () => { st[k] = x.value; rerender(); }); };
  sel('anNucleo', 'nucleo'); sel('anMes', 'mesFiltro'); sel('anPeriodo', 'periodo'); sel('anFaixa', 'faixa'); sel('anStatus', 'status');
  const busca = el('anBusca');
  if (busca) {
    let t = null;
    busca.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { st.busca = busca.value; const pos = busca.selectionStart; rerender(); const nb = el('anBusca'); if (nb) { nb.focus(); try { nb.setSelectionRange(pos, pos); } catch (e) { /* ok */ } } }, 220); });
  }
  box.querySelectorAll('[data-an-exp]').forEach((b) => b.addEventListener('click', async () => {
    if (!lista.length) { C.toast('Nada para exportar com esses filtros.', 'error'); return; }
    const colunas = [{ chave: 'quando', titulo: 'Quando' }, { chave: 'data', titulo: 'Aniversário' }, { chave: 'nome', titulo: 'Atleta' }, { chave: 'faz', titulo: 'Faz (anos)' }, { chave: 'nasc', titulo: 'Nascimento' }, { chave: 'cordao', titulo: 'Cordão' }, { chave: 'nucleo', titulo: 'Núcleo' }, { chave: 'celular', titulo: 'Celular' }];
    const linhas = lista.map((x) => ({ quando: quandoTexto(x.dias), data: x.data.toLocaleDateString('pt-BR'), nome: nomeBonito(x.u.nome), faz: x.idade, nasc: `${String(x.n.d).padStart(2, '0')}/${String(x.n.m).padStart(2, '0')}/${x.n.a}`, cordao: x.u.cordaoAtual || 'Iniciante', nucleo: nomeNucleo(x.u.academiaId), celular: x.u.celular || '' }));
    const sub = [st.nucleo ? nomeNucleo(st.nucleo) : (verTudo() ? 'Grupo todo' : nomeNucleo(C.sessao().academiaGerenciadaId)), st.mesFiltro ? MESES[Number(st.mesFiltro) - 1] : '', st.periodo ? `próximos ${st.periodo} dias` : ''].filter(Boolean).join(' · ');
    try { C.toast('Preparando o arquivo…'); if (b.dataset.anExp === 'xlsx') await C.exportarExcel('Aniversarios', colunas, linhas); else await C.exportarPDF('Aniversários', colunas, linhas, sub); } catch (e) { console.error(e); C.toast('Não foi possível exportar agora.', 'error'); }
  }));
  box.querySelectorAll('[data-an-nasc]').forEach((f) => f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = f.nasc.value; const n = lerNascimento(v);
    if (!n || new Date(n.a, n.m - 1, n.d) > hoje0()) { C.toast('Data de nascimento inválida.', 'error'); return; }
    const btn = f.querySelector('button'); btn.disabled = true;
    try {
      const idade = idadeHoje(n);
      await C.salvarUsuario(f.dataset.anNasc, { dataNasc: v, idade });
      const u = C.usuarios().find((x) => x.id === f.dataset.anNasc); if (u) { u.dataNasc = v; u.idade = idade; }
      C.toast('Data de nascimento salva.', 'success');
      rerender(); lembrete48h();
    } catch (e) { console.error(e); C.toast('Sem permissão para editar este atleta.', 'error'); btn.disabled = false; }
  }));
}

export function iniciarAniversarios(ctx) {
  C = ctx;
  lembrete48h();
}
