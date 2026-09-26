/* brasoes-admin.js — gerenciamento dos brasões (brasoes.html).
Quem entra: Admin Master, Fundador (acessoGeral) e responsáveis de núcleo
(papel mestre + academiaGerenciadaId). Escopo:
- Admin/Fundador: grupo inteiro; podem ativar/desativar brasões, editar textos
  e definir o núcleo do Fundador (config/brasoes).
- Responsável: só o próprio núcleo; concede/revoga brasões MANUAIS aos alunos dele.
Fontes: perfisPublicos (contagem real de quem já tem cada brasão e ranking),
usuarios (concessões manuais — campo brasoesManuais), config/brasoes. */
import { db, observarSessao, buscar, listar, listarPorAcademia, atualizar, souFundador, collection, doc, getDocs, setDoc, updateDoc, deleteField, query, where, limit } from './firebase.js';
import { escapeHTML, sanitizeInput } from './shared.js';
import { BRASOES, SERIES, avaliar, textoMetrica, urlThumb, urlPng, ehManual, porId } from './brasoes.js';

const el = (id) => document.getElementById(id);
let uid = null, perfil = null, config = {}, nucleos = [], pubs = [], usuarios = [];
let toastTimer = null;
function toast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800); }
const papeis = () => (perfil && perfil.papeis) || [];
const ehAdmin = () => papeis().includes('admin');
const ehModerador = () => ehAdmin() || souFundador(perfil);
const ehGestor = () => papeis().includes('mestre') && !!(perfil && perfil.academiaGerenciadaId);
const meuNucleo = () => perfil.academiaGerenciadaId || null;
const nomeNucleo = (id) => { const n = nucleos.find((x) => x.id === id); return n ? n.nome : (id || '—'); };
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('') || '?';
const avatar = (p) => p.fotoUrl ? `<img class="av" src="${escapeHTML(p.fotoUrl)}" alt="">` : `<span class="av">${escapeHTML(iniciais(p.nome))}</span>`;
function abrirFolha(html) { const f = document.createElement('div'); f.className = 'folha'; f.innerHTML = `<div class="conteudo">${html}</div>`; f.addEventListener('click', (ev) => { if (ev.target === f || ev.target.closest('[data-fechar]')) f.remove(); }); document.body.appendChild(f); return f; }

/* ---------- carga ---------- */
async function carregar() {
nucleos = await listar('nucleos').catch(() => []);
config = (await buscar('config', 'brasoes').catch(() => null)) || {};
if (ehModerador()) {
[pubs, usuarios] = await Promise.all([listar('perfisPublicos').catch(() => []), listar('usuarios').catch(() => [])]);
} else {
const [ps, us] = await Promise.all([
getDocs(query(collection(db, 'perfisPublicos'), where('academiaId', '==', meuNucleo()), limit(300))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
listarPorAcademia('usuarios', meuNucleo(), 300).then((r) => r.itens).catch(() => []),
]);
pubs = ps; usuarios = us;
}
if (!config.nucleoFundadorId) { const f = pubs.find((p) => p.fundador && p.academiaGerenciadaId); if (f) config.nucleoFundadorId = f.academiaGerenciadaId; }
}
// quantos atletas (do escopo) já têm cada brasão — do que eles consolidaram no perfil público
function contagens() { const c = {}; BRASOES.forEach((b) => { c[b.id] = 0; }); pubs.forEach((p) => Object.keys(p.brasoes || {}).forEach((id) => { if (c[id] !== undefined) c[id]++; })); return c; }
const ativo = (id) => !(config.ativos && config.ativos[id] === false);
const texto = (b) => ({ nome: (config.textos && config.textos[b.id] && config.textos[b.id].nome) || b.nome, como: (config.textos && config.textos[b.id] && config.textos[b.id].como) || b.como });

/* ---------- render ---------- */
function renderKpis() {
const c = contagens(); const ativos = BRASOES.filter((b) => ativo(b.id)).length;
const conquistas = Object.values(c).reduce((s, n) => s + n, 0);
const comBrasao = pubs.filter((p) => (p.brasoesTotal || 0) > 0).length;
const manuais = usuarios.reduce((s, u) => s + Object.keys(u.brasoesManuais || {}).length, 0);
const raros = BRASOES.filter((b) => ativo(b.id) && c[b.id] > 0).sort((a, b) => c[a.id] - c[b.id]);
el('kpis').innerHTML = [
['kpi-teal', ativos, `brasões ativos de ${BRASOES.length}`, 'fa-medal'],
['kpi-gold', conquistas, 'conquistas no grupo', 'fa-trophy'],
['kpi-navy', `${comBrasao}<small style="font-size:.9rem;color:var(--text-muted)">/${pubs.length}</small>`, 'atletas com brasão · na Rede', 'fa-users'],
['kpi-green', manuais, 'concessões manuais', 'fa-award'],
].map(([k, v, r, i], idx) => `<div class="kpi-tile ${k}" style="--card-index:${idx}"><i class="fas ${i}"></i><div class="kpi-valor mono">${v}</div><div class="kpi-rotulo">${r}</div></div>`).join('')
+ (raros.length ? `<div class="kpi-tile" style="--card-index:4;flex-direction:row;align-items:center;gap:12px"><img src="${urlThumb(raros[0])}" alt="" style="width:52px;height:52px;object-fit:contain"><div><div class="kpi-rotulo">Mais raro conquistado</div><div style="font-family:var(--font-display);font-weight:800;font-size:.92rem">${escapeHTML(texto(raros[0]).nome)}</div><small class="kpi-rotulo">${c[raros[0].id]} atleta${c[raros[0].id] > 1 ? 's' : ''}</small></div></div>` : '');
el('escopoTexto').textContent = ehModerador() ? `Grupo inteiro · ${pubs.length} atletas já abriram a Rede Liberdade.` : `Núcleo ${nomeNucleo(meuNucleo())} · ${pubs.length} atletas na Rede. Você concede os brasões manuais aos seus alunos; ativar/desativar é do Admin/Fundador.`;
}
function renderCatalogo() {
const c = contagens();
el('catalogo').innerHTML = Object.entries(SERIES).map(([k, sr]) => {
const itens = BRASOES.filter((b) => b.serie === k);
return `<div class="serie-cab"><h3><i class="fas ${sr.icone}"></i> ${sr.nome} <span class="pill pill-neutra">${itens.length}</span></h3><small>${escapeHTML(sr.sub)}</small></div>
<div class="bra-grid">${itens.map((b) => { const t = texto(b); const on = ativo(b.id); return `<div class="bra-card ${on ? '' : 'inativo'}" data-id="${b.id}">
${ehManual(b) ? '<span class="pill pill-gold tag" title="Concedido pelo responsável">manual</span>' : (b.nivel ? `<span class="pill pill-neutra tag">${b.nivel}</span>` : '')}
${on ? '' : '<span class="pill pill-rejeitado tag-off">inativo</span>'}
<img src="${urlThumb(b)}" alt="">
<b>${escapeHTML(t.nome)}</b>
<span class="metrica">${escapeHTML(textoMetrica(b))}</span>
<span class="qtd">${c[b.id]} atleta${c[b.id] === 1 ? '' : 's'}</span>
<div class="acoes">
<button type="button" class="btn-mini" data-ver="${b.id}"><i class="fas fa-eye"></i></button>
${ehManual(b) ? `<button type="button" class="btn-mini btn-mini-aprovar" data-conceder="${b.id}"><i class="fas fa-award"></i> Conceder</button>` : ''}
${ehModerador() ? `<button type="button" class="btn-mini" data-editar="${b.id}"><i class="fas fa-pen"></i></button><button type="button" class="switch ${on ? 'on' : ''}" data-toggle="${b.id}" title="${on ? 'Desativar' : 'Ativar'}" aria-label="Ativo"></button>` : ''}
</div></div>`; }).join('')}</div>`;
}).join('');
}
function renderConcessoes() {
const linhas = [];
usuarios.forEach((u) => Object.entries(u.brasoesManuais || {}).forEach(([id, v]) => { const b = porId(id); if (b) linhas.push({ u, b, v }); }));
linhas.sort((a, b) => new Date(b.v.em || 0) - new Date(a.v.em || 0));
el('concessoes').innerHTML = linhas.map(({ u, b, v }) => `<div class="linha-conc"><img src="${urlThumb(b)}" alt=""><div class="q"><strong>${escapeHTML(u.nome || '')}</strong> · ${escapeHTML(texto(b).nome)}<small>${v.em ? new Date(v.em).toLocaleDateString('pt-BR') : ''}${v.porNome ? ` · por ${escapeHTML(v.porNome)}` : ''}${v.obs ? ` · ${escapeHTML(v.obs)}` : ''} · ${escapeHTML(nomeNucleo(u.academiaId))}</small></div>${(ehModerador() || u.academiaId === meuNucleo()) ? `<button type="button" class="btn-mini btn-mini-rejeitar" data-revogar="${u.id}" data-brasao="${b.id}"><i class="fas fa-rotate-left"></i> Revogar</button>` : ''}</div>`).join('')
|| '<div class="empty-state"><i class="fas fa-award"></i>Nenhuma concessão manual ainda. Use "Conceder brasão" para premiar quem participou de uma roda, evento ou mostrou um destaque.</div>';
}
function renderRanking() {
const top = pubs.filter((p) => (p.brasoesTotal || 0) > 0).sort((a, b) => (b.brasoesTotal || 0) - (a.brasoesTotal || 0) || String(a.nome).localeCompare(String(b.nome))).slice(0, 15);
el('ranking').innerHTML = top.map((p, i) => `<div class="rank"><span class="pos">${i + 1}</span>${avatar(p)}<div class="q"><strong>${escapeHTML(p.nome)}</strong><small>${escapeHTML(p.cordaoAtual || '')} · ${escapeHTML(nomeNucleo(p.academiaId))}</small></div><span class="n">${p.brasoesTotal}</span></div>`).join('')
|| '<p class="cascata-vazio">Ninguém consolidou brasões ainda — eles são calculados quando o atleta abre a Rede Liberdade.</p>';
}
function renderTudo() { renderKpis(); renderCatalogo(); renderConcessoes(); renderRanking(); }

/* ---------- ações ---------- */
function verBrasao(id) {
const b = porId(id); const t = texto(b); const c = contagens()[id];
const donos = pubs.filter((p) => p.brasoes && p.brasoes[id]).sort((a, z) => new Date((a.brasoes[id] || {}).em || 0) - new Date((z.brasoes[id] || {}).em || 0));
abrirFolha(`<h3>${escapeHTML(t.nome)} <button type="button" class="btn-mini" data-fechar><i class="fas fa-xmark"></i></button></h3>
<div style="text-align:center"><img src="${urlPng(b)}" alt="" style="width:200px;height:200px;object-fit:contain;filter:drop-shadow(0 16px 24px rgba(0,45,114,.3))"></div>
<p style="font-size:.86rem;margin-top:8px"><strong>Como conquistar:</strong> ${escapeHTML(t.como || '')}</p>
<p style="font-size:.82rem;color:var(--text-muted);margin-top:4px"><strong>Métrica:</strong> ${escapeHTML(textoMetrica(b))}${b.nivel ? ` · nível ${b.nivel}` : ''} · ${SERIES[b.serie].nome}</p>
${b.descricao ? `<p style="font-size:.82rem;color:var(--text-muted);margin-top:4px">${escapeHTML(b.descricao)}</p>` : ''}
<div class="secao-titulo" style="margin:16px 0 8px"><h3 style="font-size:.9rem">Quem já tem <span class="pill pill-teal">${c}</span></h3></div>
<div class="lista-atletas">${donos.map((p) => `<button type="button" style="cursor:default">${avatar(p)} ${escapeHTML(p.nome)}<small>${p.brasoes[id].em ? new Date(p.brasoes[id].em).toLocaleDateString('pt-BR') : ''}${p.brasoes[id].manual ? ' · manual' : ''}</small></button>`).join('') || '<p class="cascata-vazio" style="padding:10px">Ninguém ainda.</p>'}</div>`);
}
function editarTexto(id) {
const b = porId(id); const t = texto(b);
const f = abrirFolha(`<h3>Editar ${escapeHTML(b.nome)} <button type="button" class="btn-mini" data-fechar><i class="fas fa-xmark"></i></button></h3>
<form id="fEdit"><div class="form-group-mod"><label>Nome exibido</label><input class="input-padrao" name="nome" maxlength="40" value="${escapeHTML(t.nome)}"></div>
<div class="form-group-mod" style="margin-top:10px"><label>Como conquistar (texto que o atleta lê)</label><textarea class="input-padrao" name="como" maxlength="200" rows="3">${escapeHTML(t.como || '')}</textarea></div>
<p style="font-size:.76rem;color:var(--text-muted);margin-top:8px"><i class="fas fa-lock"></i> A métrica (${escapeHTML(textoMetrica(b))}) não é editável: o número está gravado na arte da medalha.</p>
<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn-mini" data-fechar>Cancelar</button><button type="submit" class="btn-salvar-modal">Salvar</button></div></form>`);
f.querySelector('#fEdit').addEventListener('submit', async (ev) => {
ev.preventDefault(); const fd = new FormData(ev.target);
const textos = { ...(config.textos || {}) }; textos[id] = { nome: sanitizeInput(String(fd.get('nome') || '')).slice(0, 40) || b.nome, como: sanitizeInput(String(fd.get('como') || '')).slice(0, 200) };
try { await setDoc(doc(db, 'config', 'brasoes'), { textos, atualizadoEm: new Date().toISOString(), por: uid }, { merge: true }); config.textos = textos; f.remove(); renderTudo(); toast('Texto atualizado.'); } catch (e) { console.error(e); toast('Sem permissão pra salvar (regras do Firestore).'); }
});
}
async function alternarAtivo(id, btn) {
const ativos = { ...(config.ativos || {}) }; const novo = !ativo(id); ativos[id] = novo;
try { await setDoc(doc(db, 'config', 'brasoes'), { ativos, atualizadoEm: new Date().toISOString(), por: uid }, { merge: true }); config.ativos = ativos; renderTudo(); toast(novo ? 'Brasão ativado.' : 'Brasão desativado — some da Sala de Brasões de todos.'); } catch (e) { console.error(e); toast('Sem permissão pra alterar.'); }
}
function conceder(brasaoInicial) {
const manuais = BRASOES.filter(ehManual);
const alunos = usuarios.filter((u) => (u.papeis || []).includes('aluno') && u.id !== uid).sort((a, b) => String(a.nome).localeCompare(String(b.nome)));
let selB = brasaoInicial || null, selU = null;
const f = abrirFolha(`<h3>Conceder brasão <button type="button" class="btn-mini" data-fechar><i class="fas fa-xmark"></i></button></h3>
<label>1 · Escolha o brasão</label><div class="escolha-brasao" id="escB">${manuais.map((b) => `<button type="button" data-b="${b.id}" class="${b.id === selB ? 'sel' : ''}"><img src="${urlThumb(b)}" alt="">${escapeHTML(texto(b).nome)}</button>`).join('')}</div>
<label style="margin-top:12px">2 · Escolha o atleta</label><input class="input-padrao" id="buscaAluno" placeholder="Buscar pelo nome…"><div class="lista-atletas" id="listaAl"></div>
<label style="margin-top:12px">3 · Observação (opcional — aparece no perfil)</label><input class="input-padrao" id="obsConc" maxlength="80" placeholder="ex.: Roda aberta da Praça, 18/10">
<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn-mini" data-fechar>Cancelar</button><button type="button" class="btn-salvar-modal" id="btnOkConc" disabled><i class="fas fa-award"></i> Conceder</button></div>`);
const lista = f.querySelector('#listaAl'); const ok = f.querySelector('#btnOkConc');
const desenharLista = (q = '') => { const qq = q.toLowerCase(); lista.innerHTML = alunos.filter((u) => String(u.nome || '').toLowerCase().includes(qq)).slice(0, 60).map((u) => `<button type="button" data-u="${u.id}" class="${u.id === selU ? 'sel' : ''}">${avatar(u)} ${escapeHTML(u.nome || '')}<small>${escapeHTML(u.cordaoAtual || '')}${selB && u.brasoesManuais && u.brasoesManuais[selB] ? ' · já tem' : ''}</small></button>`).join('') || '<p class="cascata-vazio" style="padding:10px">Nenhum atleta encontrado no seu escopo.</p>'; };
desenharLista();
const atualizarOk = () => { ok.disabled = !(selB && selU); };
f.querySelector('#escB').addEventListener('click', (ev) => { const b = ev.target.closest('[data-b]'); if (!b) return; selB = b.dataset.b; f.querySelectorAll('#escB button').forEach((x) => x.classList.toggle('sel', x === b)); desenharLista(f.querySelector('#buscaAluno').value); atualizarOk(); });
lista.addEventListener('click', (ev) => { const b = ev.target.closest('[data-u]'); if (!b) return; selU = b.dataset.u; lista.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b)); atualizarOk(); });
f.querySelector('#buscaAluno').addEventListener('input', (ev) => desenharLista(ev.target.value));
ok.addEventListener('click', async () => {
const u = alunos.find((x) => x.id === selU); const b = porId(selB); if (!u || !b) return;
ok.disabled = true;
try {
await updateDoc(doc(db, 'usuarios', u.id), { [`brasoesManuais.${b.id}`]: { em: new Date().toISOString(), por: uid, porNome: perfil.nome || '', obs: sanitizeInput(f.querySelector('#obsConc').value || '').slice(0, 80) } });
u.brasoesManuais = { ...(u.brasoesManuais || {}), [b.id]: { em: new Date().toISOString(), por: uid, porNome: perfil.nome || '' } };
f.remove(); renderTudo(); toast(`${texto(b).nome} concedido a ${u.nome.split(' ')[0]}. Aparece no perfil quando ele abrir a Rede.`);
} catch (e) { console.error(e); ok.disabled = false; toast('Sem permissão pra conceder a este atleta.'); }
});
}
async function revogar(uidAlvo, brasaoId) {
const u = usuarios.find((x) => x.id === uidAlvo); const b = porId(brasaoId); if (!u || !b) return;
if (!confirm(`Revogar "${texto(b).nome}" de ${u.nome}?`)) return;
try { await updateDoc(doc(db, 'usuarios', u.id), { [`brasoesManuais.${b.id}`]: deleteField() }); delete u.brasoesManuais[b.id]; renderTudo(); toast('Brasão revogado. Sai do perfil quando o atleta abrir a Rede.'); } catch (e) { console.error(e); toast('Sem permissão pra revogar.'); }
}
function configurar() {
const f = abrirFolha(`<h3>Configurações dos brasões <button type="button" class="btn-mini" data-fechar><i class="fas fa-xmark"></i></button></h3>
<div class="form-group-mod"><label>Núcleo do Fundador (base dos brasões "Visitou a sede do Fundador" e "Direto Liberdade e Expressão")</label><select class="input-padrao" id="selFund"><option value="">— detectar automaticamente —</option>${nucleos.map((n) => `<option value="${escapeHTML(n.id)}" ${config.nucleoFundadorId === n.id ? 'selected' : ''}>${escapeHTML(n.nome)}</option>`).join('')}</select></div>
<p style="font-size:.78rem;color:var(--text-muted);margin-top:10px">Ativar/desativar cada brasão e editar textos fica nos cartões do catálogo. Brasão desativado some da Sala de Brasões de todos e não conta no total.</p>
<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn-mini" data-fechar>Cancelar</button><button type="button" class="btn-salvar-modal" id="okCfg">Salvar</button></div>`);
f.querySelector('#okCfg').addEventListener('click', async () => {
const v = f.querySelector('#selFund').value || null;
try { await setDoc(doc(db, 'config', 'brasoes'), { nucleoFundadorId: v, atualizadoEm: new Date().toISOString(), por: uid }, { merge: true }); config.nucleoFundadorId = v; f.remove(); renderTudo(); toast('Configuração salva.'); } catch (e) { toast('Sem permissão pra salvar.'); }
});
}

/* ---------- boot ---------- */
observarSessao(async (user) => {
el('telaCarregando').classList.add('oculto');
if (!user) { el('telaBloqueado').classList.remove('oculto'); return; }
uid = user.uid;
try { perfil = await buscar('usuarios', uid); } catch (e) { perfil = null; }
if (!perfil || !(ehModerador() || ehGestor())) { el('telaBloqueado').classList.remove('oculto'); return; }
el('appBrasoes').classList.remove('oculto');
try { await carregar(); } catch (e) { console.error(e); toast('Não foi possível carregar tudo — confira as regras do Firestore.'); }
if (ehModerador()) el('btnConfig').classList.remove('oculto');
renderTudo();
el('btnConceder').addEventListener('click', () => conceder(null));
el('btnConfig').addEventListener('click', configurar);
el('catalogo').addEventListener('click', (ev) => {
const v = ev.target.closest('[data-ver]'); if (v) return verBrasao(v.dataset.ver);
const c = ev.target.closest('[data-conceder]'); if (c) return conceder(c.dataset.conceder);
const e = ev.target.closest('[data-editar]'); if (e) return editarTexto(e.dataset.editar);
const t = ev.target.closest('[data-toggle]'); if (t) return alternarAtivo(t.dataset.toggle, t);
});
el('concessoes').addEventListener('click', (ev) => { const r = ev.target.closest('[data-revogar]'); if (r) revogar(r.dataset.revogar, r.dataset.brasao); });
});
