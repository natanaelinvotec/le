/* campeonatos.js — Campeonatos (interno e externo).

Rotas (hash):
  #                      lista de campeonatos
  #novo                  criar (organizador)
  #c/ID                  detalhe: visão, inscrições, categorias, chaves, pódio
  #c/ID/chave/CAT        uma chave em destaque
  #area/ID/CAT           Tela de área (placar para TV / tablet)

Quem organiza: Admin Master, Fundador e o responsável do núcleo que criou o
campeonato (ou qualquer responsável, quando o campeonato é do grupo inteiro).
Atletas se inscrevem (sexo e peso declarados) e acompanham as chaves. As
regras (categorias, sorteio, avanço, pódio) estão em campeonato-motor.js. */
import { observarSessao, db, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, limit, onSnapshot, listar, listarPorAcademia, souFundador, minhaEscolaId, comMinhaEscola } from './firebase.js';
import { ESCOLA, coresDoCordao, nomeBonito, ORDEM_CORDOES } from './escola.js';
import { ehAtleta, iniciais, faixas } from './carteirinha-comum.js';
import * as M from './campeonato-motor.js?v=20261002';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
const pagina = el('pagina');
const dataBR = (ymd) => (/^\d{4}-\d{2}-\d{2}/.test(ymd || '') ? ymd.slice(0, 10).split('-').reverse().join('/') : '—');
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const idNovo = () => `camp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
let toastTimer = null;
function toast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800); }

/* ---------- sessão e papéis ---------- */
let uid = null; let perfil = {}; let nucleos = [];
const papeis = () => (perfil && perfil.papeis) || [];
const ehAdmin = () => papeis().includes('admin') || souFundador(perfil);
const ehGestor = () => papeis().includes('mestre') && !!perfil.academiaGerenciadaId;
const podeCriar = () => ehAdmin() || ehGestor();
const organiza = (c) => !!c && (ehAdmin() || (ehGestor() && (c.academiaId === perfil.academiaGerenciadaId || c.organizadorUid === uid || !c.academiaId)));
const nomeNucleo = (id) => { const n = nucleos.find((x) => x.id === id); return n ? n.nome : (id || ''); };
const neonDe = (cordao) => { const c = coresDoCordao(cordao || 'Iniciante'); return c.find((x) => !/^#(4F4F4F|CCC|D3D3D3|F5F5F5|FFFFFF|FFF)$/i.test(x)) || '#7FD3C7'; };
const cordaoChip = (cordao, grande = false) => `<i class="cordao${grande ? ' grande' : ''}" style="--listras:${faixas(coresDoCordao(cordao || 'Iniciante'))};--neon:${neonDe(cordao)}" title="${esc(cordao || '')}" aria-label="Cordão ${esc(cordao || '')}"></i>`;
const avatarHtml = (p, cls = 'av') => (p && /^https:/.test(p.fotoUrl || '') ? `<img class="${cls}" src="${esc(p.fotoUrl)}" alt="">` : `<span class="${cls}" aria-hidden="true">${esc(iniciais(p && (p.apelido || p.nome)))}</span>`);
const nomeCurto = (p) => (p && p.apelido) ? p.apelido : nomeBonito((p && p.nome) || 'Atleta').split(' ').slice(0, 2).join(' ');

/* ---------- estado ---------- */
let campeonatos = []; let desligarLista = null;
let atual = null; let inscritos = []; let chaves = {}; let desligarDet = []; let abaAtual = 'visao';
const ETAPAS = [['inscricoes', 'Inscrições'], ['categorias', 'Categorias'], ['chaves', 'Chaves'], ['andamento', 'Em andamento'], ['encerrado', 'Encerrado']];
const rotuloStatus = (s) => (ETAPAS.find((e) => e[0] === s) || ['', s])[1];

observarSessao(async (user) => {
  if (!user) { location.replace('login.html'); return; }
  if (uid === user.uid) return;
  uid = user.uid;
  try {
    const s = await getDoc(doc(db, 'usuarios', uid)); perfil = s.exists() ? s.data() : {};
    nucleos = await listar('nucleos').catch(() => []);
    el('btVoltar').href = podeCriar() ? 'admin.html' : 'app.html';
    window.addEventListener('hashchange', rotear);
    rotear();
  } catch (e) { console.error(e); pagina.innerHTML = `<div class="vazio"><i class="fas fa-triangle-exclamation"></i><b>Não foi possível abrir</b><p>Confira a internet e tente de novo.</p></div>`; }
});

function rotear() {
  const h = location.hash.replace(/^#/, '');
  desligarDetalhe();
  document.body.classList.remove('area');
  const area = /^area\/([^/]+)\/(.+)$/.exec(h);
  const det = /^c\/([^/]+)(?:\/chave\/(.+))?$/.exec(h);
  if (area) { abrirArea(decodeURIComponent(area[1]), decodeURIComponent(area[2])); return; }
  if (h === 'novo') { if (!podeCriar()) { location.hash = ''; return; } renderNovo(); return; }
  if (det) { abrirDetalhe(decodeURIComponent(det[1]), det[2] ? decodeURIComponent(det[2]) : null); return; }
  renderLista();
}
function desligarDetalhe() { desligarDet.forEach((f) => { try { f(); } catch (e) { /* ok */ } }); desligarDet = []; }
function barra(titulo, acoesHtml = '') { el('tituloBarra').textContent = titulo; el('acoesBarra').innerHTML = acoesHtml; }

/* ====================== LISTA ====================== */
function renderLista() {
  barra('Campeonatos', podeCriar() ? `<a class="bt bt-verde bt-sm" href="#novo"><i class="fas fa-plus"></i> Novo</a>` : '');
  if (!desligarLista) {
    // Duas escutas: os campeonatos da MINHA escola e os "entre escolas" de qualquer escola (as regras só deixam isso).
    desligarLista = () => {}; // marca como ligado enquanto descobre a escola
    const partes = { minha: [], abertos: [] };
    const juntar = () => {
      const porId = new Map([...partes.abertos, ...partes.minha].map((c) => [c.id, c]));
      campeonatos = [...porId.values()].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
      if (!location.hash || location.hash === '#') desenharLista();
    };
    const semAcesso = (e) => { console.error(e); pagina.innerHTML = `<div class="vazio"><i class="fas fa-lock"></i><b>Sem acesso aos campeonatos</b><p>Entre com a sua conta de atleta ou do núcleo.</p></div>`; };
    minhaEscolaId().then((escola) => {
      const offs = [onSnapshot(query(collection(db, 'campeonatos'), where('tipo', '==', 'externo'), limit(60)), (s) => { partes.abertos = s.docs.map((d) => ({ id: d.id, ...d.data() })); juntar(); }, semAcesso)];
      if (escola) offs.push(onSnapshot(query(collection(db, 'campeonatos'), where('escolaId', '==', escola), limit(60)), (s) => { partes.minha = s.docs.map((d) => ({ id: d.id, ...d.data() })); juntar(); }, semAcesso));
      desligarLista = () => offs.forEach((f) => f());
    });
  } else desenharLista();
}
function desenharLista() {
  const hoje = hojeIso();
  const abertos = campeonatos.filter((c) => c.status !== 'encerrado');
  const encerrados = campeonatos.filter((c) => c.status === 'encerrado');
  const card = (c) => `
    <article class="card card-camp link" data-abrir="${esc(c.id)}" tabindex="0" role="link" aria-label="${esc(c.nome)}">
      <div class="topo"><span class="data"><i class="fas fa-calendar-day"></i> ${dataBR(c.data)}${c.hora ? ` · ${esc(c.hora)}` : ''}</span><span class="pill ${c.tipo === 'externo' ? 'ouro' : 'teal'}">${c.tipo === 'externo' ? 'Entre escolas' : 'Interno'}</span></div>
      <h3>${esc(c.nome)}</h3>
      <div class="local"><i class="fas fa-location-dot"></i> ${esc(c.local || '')}${c.cidade ? ` — ${esc(c.cidade)}` : ''}</div>
      <div class="kpis"><span><b>${Number(c.inscritosTotal) || 0}</b>inscritos</span><span><b>${(c.categorias || []).length}</b>categorias</span><span><b>${Number(c.lutasFeitas) || 0}</b>lutas</span></div>
      <div class="rodape"><span class="pill ${c.status === 'andamento' ? 'verde vivo' : c.status === 'encerrado' ? '' : 'teal'}">${esc(rotuloStatus(c.status))}</span>${c.status === 'inscricoes' && c.data >= hoje ? '<span class="pill verde">Inscrições abertas</span>' : ''}${c.demo ? '<span class="pill ouro">Demonstração</span>' : ''}</div>
    </article>`;
  pagina.innerHTML = `
    <section class="hero">
      <div><span class="eyebrow">Competição</span><h1>Campeonatos</h1><p class="sub">Chaves por graduação, peso e sexo; resultados na hora, pódio com brasão e post na Rede. Internos do grupo e abertos entre escolas.</p></div>
      ${podeCriar() ? `<div class="bts"><a class="bt bt-verde" href="#novo"><i class="fas fa-plus"></i> Novo campeonato</a>${!campeonatos.some((c) => c.demo) ? '<button type="button" class="bt bt-vidro" id="btDemo"><i class="fas fa-wand-magic-sparkles"></i> Carregar demonstração</button>' : ''}</div>` : ''}
    </section>
    ${abertos.length ? `<div class="grade-camp">${abertos.map(card).join('')}</div>` : `<div class="vazio"><i class="fas fa-trophy"></i><b>Nenhum campeonato aberto</b><p>${podeCriar() ? 'Crie o primeiro ou carregue a demonstração para ver o módulo funcionando.' : 'Quando o núcleo abrir um campeonato, ele aparece aqui para você se inscrever.'}</p></div>`}
    ${encerrados.length ? `<div class="divisor" aria-hidden="true"></div><h2 style="margin-bottom:12px">Encerrados</h2><div class="grade-camp">${encerrados.map(card).join('')}</div>` : ''}`;
  pagina.querySelectorAll('[data-abrir]').forEach((a) => { const ir = () => { location.hash = `c/${encodeURIComponent(a.dataset.abrir)}`; }; a.addEventListener('click', ir); a.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(); } }); });
  const d = el('btDemo'); if (d) d.addEventListener('click', carregarDemo);
}

/* ====================== NOVO ====================== */
function renderNovo() {
  barra('Novo campeonato', '');
  const cordaoChips = ORDEM_CORDOES.map((c) => `<span class="chip">${cordaoChip(c)} ${esc(c)}</span>`).join('');
  pagina.innerHTML = `
    <section class="hero"><div><span class="eyebrow">Novo</span><h1>Criar campeonato</h1><p class="sub">Defina o básico agora; categorias e chaves são geradas depois, a partir dos inscritos.</p></div></section>
    <form class="form" id="formNovo" autocomplete="off">
      <div class="linha">
        <div class="campo" style="grid-column:1/-1"><label for="fNome">Nome</label><input id="fNome" required maxlength="80" placeholder="Ex.: Campeonato Interno Liberdade 2026"></div>
        <div class="campo"><label>Tipo</label><div class="segment" id="fTipo"><button type="button" aria-pressed="true" data-v="interno">Interno</button><button type="button" aria-pressed="false" data-v="externo">Entre escolas</button></div></div>
        <div class="campo"><label for="fData">Data</label><input id="fData" type="date" required value="${hojeIso()}"></div>
        <div class="campo"><label for="fHora">Horário</label><input id="fHora" type="time" value="09:00"></div>
        <div class="campo"><label for="fLocal">Local</label><input id="fLocal" maxlength="80" placeholder="Ginásio, academia, praça…"></div>
        <div class="campo"><label for="fCidade">Cidade / UF</label><input id="fCidade" maxlength="60" value="${esc(`${ESCOLA.cidade} / ${ESCOLA.uf}`)}"></div>
        ${ehAdmin() ? `<div class="campo"><label for="fNucleo">Núcleo organizador</label><select id="fNucleo"><option value="">Grupo inteiro</option>${nucleos.map((n) => `<option value="${esc(n.id)}">${esc(n.nome)}</option>`).join('')}</select></div>` : ''}
        <div class="campo" style="grid-column:1/-1"><label for="fDesc">Descrição (opcional)</label><textarea id="fDesc" maxlength="600" placeholder="Programação, regras resumidas, premiação…"></textarea></div>
        <div class="campo" style="grid-column:1/-1"><label for="fReg">Regulamento (link, opcional)</label><input id="fReg" type="url" placeholder="https://…pdf"><small class="ajuda">PDF já publicado no Drive, no site ou nos Materiais do painel.</small></div>
      </div>
      <h2>Categorias</h2>
      <div class="linha">
        <div class="campo"><label>Dividir por sexo</label><div class="segment" id="fSexos"><button type="button" aria-pressed="true" data-v="1">Sim</button><button type="button" aria-pressed="false" data-v="0">Não</button></div></div>
        <div class="campo"><label>Dividir por idade</label><div class="segment" id="fIdades"><button type="button" aria-pressed="false" data-v="1">Sim</button><button type="button" aria-pressed="true" data-v="0">Não</button></div><small class="ajuda">Infantil (até 11), Juvenil (12–17), Adulto (18–39), Master (40+). Obrigatório se houver menores.</small></div>
        <div class="campo" style="grid-column:1/-1"><label for="fPesos">Tetos de peso (kg), separados por vírgula</label><input id="fPesos" value="64, 73, 82, 91"><small class="ajuda">Gera Pena (até 64), Leve (até 73), Médio (até 82), Meio-pesado (até 91) e Pesado (acima). Deixe vazio para não dividir por peso.</small></div>
        <div class="campo" style="grid-column:1/-1"><label>Grupos de graduação</label><div class="chips" id="fGrupos">${M.GRUPOS_CORDAO_PADRAO.map((g) => `<span class="chip on">${esc(g.nome)}</span>`).join('')}</div><small class="ajuda">Cordões vizinhos competem juntos: ${esc(M.GRUPOS_CORDAO_PADRAO.map((g) => g.cordoes.join(', ')).join(' | '))}.</small><div class="chips" style="margin-top:8px">${cordaoChips}</div></div>
        <div class="campo"><label for="fMin">Mínimo de atletas por categoria</label><input id="fMin" type="number" min="2" max="8" value="3"><small class="ajuda">Abaixo disso o sistema sugere fundir com a categoria vizinha.</small></div>
      </div>
      <div class="acoes"><button type="submit" class="bt bt-verde"><i class="fas fa-check"></i> Criar campeonato</button><a class="bt bt-vidro" href="#">Cancelar</a></div>
    </form>`;
  pagina.querySelectorAll('.segment').forEach((s) => s.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; s.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }));
  const seg = (id) => pagina.querySelector(`#${id} [aria-pressed="true"]`).dataset.v;
  el('formNovo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bt = e.target.querySelector('[type="submit"]'); bt.disabled = true;
    try {
      const pesosTxt = el('fPesos').value.split(/[,;\s]+/).map(Number).filter((n) => n > 0).sort((a, b) => a - b);
      const nomesPeso = ['Pena', 'Leve', 'Médio', 'Meio-pesado', 'Pesado', 'Superpesado'];
      const pesos = pesosTxt.length ? pesosTxt.map((max, i) => ({ id: `p${i + 1}`, nome: nomesPeso[i] || `Faixa ${i + 1}`, max })).concat([{ id: `p${pesosTxt.length + 1}`, nome: nomesPeso[pesosTxt.length] || 'Acima', max: null }]) : [];
      const id = idNovo();
      const academiaId = ehAdmin() ? (el('fNucleo') ? el('fNucleo').value || null : null) : perfil.academiaGerenciadaId;
      await setDoc(doc(db, 'campeonatos', id), await comMinhaEscola({
        nome: el('fNome').value.trim().slice(0, 80), tipo: seg('fTipo'), data: el('fData').value, hora: el('fHora').value || '', local: el('fLocal').value.trim().slice(0, 80), cidade: el('fCidade').value.trim().slice(0, 60),
        descricao: el('fDesc').value.trim().slice(0, 600), regulamentoUrl: /^https:\/\//.test(el('fReg').value.trim()) ? el('fReg').value.trim() : '',
        academiaId, academiaNome: academiaId ? nomeNucleo(academiaId) : '', organizadorUid: uid, organizadorNome: perfil.nome || '',
        status: 'inscricoes', inscritosTotal: 0, lutasFeitas: 0, categorias: [],
        config: { sexos: seg('fSexos') === '1', idades: seg('fIdades') === '1' ? M.IDADES_PADRAO : null, pesos, gruposCordao: M.GRUPOS_CORDAO_PADRAO, minimoPorCategoria: Math.max(2, Math.min(8, Number(el('fMin').value) || 3)) },
        criadoEm: new Date().toISOString(), demo: false,
      }));
      toast('Campeonato criado'); location.hash = `c/${encodeURIComponent(id)}`;
    } catch (er) { console.error(er); toast('Não deu para criar agora. Tente de novo.'); bt.disabled = false; }
  });
}

/* ====================== DEMONSTRAÇÃO ====================== */
async function carregarDemo() {
  const bt = el('btDemo'); if (bt) bt.disabled = true;
  try {
    const id = `demo_${Date.now().toString(36)}`;
    const ns = nucleos.length ? nucleos.slice(0, 3) : [{ id: 'demo', nome: 'Núcleo Demonstração' }];
    const atletas = M.atletasDemo(ns, 7);
    // Configuração enxuta para a demonstração encher as categorias: 2 faixas de peso, 2 grupos de cordão.
    const config = { sexos: true, idades: null, minimoPorCategoria: 3, pesos: [{ id: 'p1', nome: 'Leve', max: 75 }, { id: 'p2', nome: 'Pesado', max: null }], gruposCordao: [{ id: 'iniciantes', nome: 'Iniciante a Fugitivo', cordoes: ['Iniciante', 'Escravo', 'Fugitivo'] }, { id: 'graduados', nome: 'Quilombola em diante', cordoes: ['Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'] }] };
    const academiaId = ehAdmin() ? null : perfil.academiaGerenciadaId;
    await setDoc(doc(db, 'campeonatos', id), await comMinhaEscola({
      nome: 'Campeonato Interno Liberdade 2026 (demonstração)', tipo: 'interno', data: hojeIso(), hora: '09:00', local: 'Ginásio do núcleo', cidade: `${ESCOLA.cidade} / ${ESCOLA.uf}`,
      descricao: 'Dados fictícios para apresentação do módulo: 32 atletas, categorias por graduação, peso e sexo, chaves de eliminação simples. Pode ser apagado a qualquer momento.',
      regulamentoUrl: '', academiaId, academiaNome: academiaId ? nomeNucleo(academiaId) : '', organizadorUid: uid, organizadorNome: perfil.nome || '',
      status: 'inscricoes', inscritosTotal: atletas.length, lutasFeitas: 0, categorias: [], config, criadoEm: new Date().toISOString(), demo: true,
    }));
    await Promise.all(atletas.map((a) => setDoc(doc(db, 'campeonatos', id, 'inscricoes', a.uid), { ...a, em: new Date().toISOString(), por: uid, pesagemOk: true })));
    toast('Demonstração carregada'); location.hash = `c/${encodeURIComponent(id)}`;
  } catch (e) { console.error(e); toast('Não deu para carregar a demonstração.'); if (bt) bt.disabled = false; }
}

/* ====================== DETALHE ====================== */
function abrirDetalhe(id, chaveEmFoco) {
  pagina.innerHTML = `<div class="carregando"><span class="giro" aria-hidden="true"></span><p>Abrindo o campeonato…</p></div>`;
  atual = null; inscritos = []; chaves = {}; abaAtual = chaveEmFoco ? 'chaves' : (abaAtual === 'visao' ? 'visao' : abaAtual);
  if (chaveEmFoco) catFoco = chaveEmFoco;
  desligarDet.push(onSnapshot(doc(db, 'campeonatos', id), (s) => {
    if (!s.exists()) { pagina.innerHTML = `<div class="vazio"><i class="fas fa-trophy"></i><b>Campeonato não encontrado</b><p>Pode ter sido apagado.</p><a class="bt bt-vidro" href="#">Voltar</a></div>`; return; }
    atual = { id: s.id, ...s.data() }; desenharDetalhe();
  }, (e) => { console.error(e); pagina.innerHTML = `<div class="vazio"><i class="fas fa-lock"></i><b>Sem acesso</b></div>`; }));
  desligarDet.push(onSnapshot(collection(db, 'campeonatos', id, 'inscricoes'), (s) => { inscritos = s.docs.map((d) => ({ uid: d.id, ...d.data() })); if (atual) desenharDetalhe(); }));
  desligarDet.push(onSnapshot(collection(db, 'campeonatos', id, 'chaves'), (s) => { chaves = {}; s.docs.forEach((d) => { chaves[d.id] = M.desempacotar(d.data()); }); if (atual) desenharDetalhe(); }));
}
let catFoco = null;
function categoriasAtuais() {
  if (Array.isArray(atual.categorias) && atual.categorias.length) return atual.categorias;
  return [];
}
function desenharDetalhe() {
  const c = atual; const org = organiza(c);
  barra(c.nome, org ? `<button type="button" class="bt bt-vidro bt-sm" id="btEditar" title="Editar"><i class="fas fa-pen"></i></button>` : '');
  const idxStatus = ETAPAS.findIndex((e) => e[0] === c.status);
  const cats = categoriasAtuais();
  const minhaInsc = inscritos.find((i) => i.uid === uid);
  const lutasTotal = Object.values(chaves).reduce((s, ch) => s + M.resumoChave(ch).lutas, 0);
  const lutasFeitas = Object.values(chaves).reduce((s, ch) => s + M.resumoChave(ch).feitas, 0);
  const abas = [['visao', 'Visão geral', null], ['inscricoes', 'Inscrições', inscritos.length], ['categorias', 'Categorias', cats.length], ['chaves', 'Chaves', Object.keys(chaves).length], ['podio', 'Pódio', Object.values(chaves).filter((ch) => ch.status === 'encerrada').length]];
  pagina.innerHTML = `
    <section class="det-topo">
      <div>
        <span class="eyebrow">${c.tipo === 'externo' ? 'Campeonato entre escolas' : 'Campeonato interno'}${c.demo ? ' · demonstração' : ''}</span>
        <h1>${esc(c.nome)}</h1>
        <div class="meta"><span><i class="fas fa-calendar-day"></i>${dataBR(c.data)}${c.hora ? ` às ${esc(c.hora)}` : ''}</span><span><i class="fas fa-location-dot"></i>${esc(c.local || '—')}${c.cidade ? `, ${esc(c.cidade)}` : ''}</span>${c.academiaNome ? `<span><i class="fas fa-house-flag"></i>${esc(c.academiaNome)}</span>` : '<span><i class="fas fa-people-group"></i>Grupo inteiro</span>'}${c.regulamentoUrl ? `<a href="${esc(c.regulamentoUrl)}" target="_blank" rel="noopener"><i class="fas fa-file-pdf"></i>Regulamento</a>` : ''}</div>
        <div class="etapas" aria-label="Etapa">${ETAPAS.map((e, i) => `<span class="${i < idxStatus ? 'feita' : i === idxStatus ? 'atual' : ''}">${i < idxStatus ? '<i class="fas fa-check"></i>' : ''}${e[1]}</span>`).join('')}</div>
      </div>
      <div class="bts" style="display:flex;gap:8px;flex-wrap:wrap">${botaoPrincipal(c, org, minhaInsc)}</div>
    </section>
    <div class="kpis-linha"><div class="kpi"><small>Inscritos</small><b>${inscritos.length}</b></div><div class="kpi"><small>Categorias</small><b>${cats.length}</b></div><div class="kpi"><small>Lutas</small><b>${lutasFeitas}<span style="font-size:.9rem;color:var(--texto-3)">/${lutasTotal}</span></b></div><div class="kpi"><small>Núcleos</small><b>${new Set(inscritos.map((i) => i.academiaId || '—')).size}</b></div></div>
    <div class="abas" role="tablist">${abas.map(([k, t, n]) => `<button type="button" role="tab" data-aba="${k}" aria-selected="${abaAtual === k}">${t}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>
    <section id="abaConteudo"></section>`;
  pagina.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => { abaAtual = b.dataset.aba; desenharDetalhe(); }));
  const ed = el('btEditar'); if (ed) ed.addEventListener('click', editarCampeonato);
  ligarBotaoPrincipal(c, org, minhaInsc);
  const cont = el('abaConteudo');
  if (abaAtual === 'visao') cont.innerHTML = visaoHtml(c, cats);
  else if (abaAtual === 'inscricoes') { cont.innerHTML = inscricoesHtml(c, org, cats); ligarInscricoes(c, org); }
  else if (abaAtual === 'categorias') { cont.innerHTML = categoriasHtml(c, org, cats); ligarCategorias(c, org); }
  else if (abaAtual === 'chaves') { cont.innerHTML = chavesHtml(c, org, cats); ligarChaves(c, org); }
  else if (abaAtual === 'podio') { cont.innerHTML = podioHtml(c, org, cats); ligarPodio(c, org); }
}
function botaoPrincipal(c, org, minhaInsc) {
  const bts = [];
  if (c.status === 'inscricoes') {
    if (ehAtleta(perfil) && !minhaInsc) bts.push('<button type="button" class="bt bt-verde" id="btInscrever"><i class="fas fa-hand"></i> Quero competir</button>');
    if (minhaInsc) bts.push('<span class="pill verde" style="height:44px;padding:0 16px"><i class="fas fa-check"></i> Você está inscrito</span>');
    if (org) bts.push(`<button type="button" class="bt ${minhaInsc || !ehAtleta(perfil) ? 'bt-verde' : 'bt-vidro'}" id="btGerarCat" ${inscritos.length < 2 ? 'disabled' : ''}><i class="fas fa-layer-group"></i> Gerar categorias</button>`);
  } else if (c.status === 'categorias' && org) {
    bts.push('<button type="button" class="bt bt-verde" id="btGerarChaves"><i class="fas fa-sitemap"></i> Montar chaves</button>');
    bts.push('<button type="button" class="bt bt-vidro" id="btReabrir"><i class="fas fa-rotate-left"></i> Reabrir inscrições</button>');
  } else if ((c.status === 'chaves' || c.status === 'andamento') && org) {
    const todas = Object.values(chaves); const prontas = todas.length && todas.every((ch) => ch.status === 'encerrada');
    bts.push(`<button type="button" class="bt ${prontas ? 'bt-ouro' : 'bt-vidro'}" id="btEncerrar" ${prontas ? '' : 'title="Encerre todas as chaves antes"'}><i class="fas fa-flag-checkered"></i> Encerrar campeonato</button>`);
  } else if (c.status === 'encerrado') bts.push('<span class="pill ouro" style="height:44px;padding:0 16px"><i class="fas fa-trophy"></i> Encerrado</span>');
  if (org) bts.push('<button type="button" class="bt bt-vidro bt-sm bt-perigo" id="btApagar" title="Apagar campeonato"><i class="fas fa-trash"></i></button>');
  return bts.join('');
}
function ligarBotaoPrincipal(c, org) {
  const on = (id, fn) => { const b = el(id); if (b) b.addEventListener('click', fn); };
  on('btInscrever', () => folhaInscricao(c, { uid, nome: perfil.nome, fotoUrl: perfil.fotoUrl, cordao: perfil.cordaoAtual, academiaId: perfil.academiaId, academiaNome: perfil.academiaNome, idade: perfil.idade, apelido: perfil.apelido || '' }, false));
  on('btGerarCat', () => gerarCategorias(c));
  on('btGerarChaves', () => gerarChaves(c));
  on('btReabrir', async () => { await updateDoc(doc(db, 'campeonatos', c.id), { status: 'inscricoes' }); toast('Inscrições reabertas'); });
  on('btEncerrar', () => encerrarCampeonato(c));
  on('btApagar', () => apagarCampeonato(c));
}

/* ---------- visão geral ---------- */
function visaoHtml(c, cats) {
  const porNucleo = {}; inscritos.forEach((i) => { const k = i.academiaNome || nomeNucleo(i.academiaId) || 'Sem núcleo'; porNucleo[k] = (porNucleo[k] || 0) + 1; });
  const porSexo = { M: inscritos.filter((i) => i.sexo === 'M').length, F: inscritos.filter((i) => i.sexo === 'F').length };
  const prox = Object.entries(chaves).map(([catId, ch]) => ({ catId, luta: M.proximaLuta(ch), ch })).filter((x) => x.luta);
  return `
    ${c.descricao ? `<p class="sub" style="margin-bottom:16px">${esc(c.descricao)}</p>` : ''}
    <div class="grade-cat">
      <div class="card"><h3>Por núcleo</h3><div class="nomes" style="margin-top:10px">${Object.entries(porNucleo).sort((a, b) => b[1] - a[1]).map(([n, q]) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--borda)"><span>${esc(n)}</span><b>${q}</b></div>`).join('') || '<span class="sub">Ninguém inscrito ainda.</span>'}</div></div>
      <div class="card"><h3>Perfil dos inscritos</h3><div class="eixos" style="margin-top:10px"><span class="pill teal">${porSexo.M} masc.</span><span class="pill teal">${porSexo.F} fem.</span>${c.config && c.config.pesos && c.config.pesos.length ? `<span class="pill">${c.config.pesos.length} faixas de peso</span>` : ''}${c.config && c.config.idades ? '<span class="pill">por idade</span>' : ''}</div><div class="nomes">${cats.length ? `${cats.length} categorias${cats.some((x) => x.poucos) ? `, ${cats.filter((x) => x.poucos).length} com poucos atletas` : ''}.` : 'Categorias ainda não geradas.'}</div></div>
      <div class="card"><h3>Agora na área</h3><div class="nomes" style="margin-top:10px">${prox.length ? prox.slice(0, 4).map((x) => { const l = x.luta; return `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--borda)"><span>${esc(nomeCurto(x.ch.atletas[l.a]))} <i style="color:var(--ouro-claro)">vs</i> ${esc(nomeCurto(x.ch.atletas[l.b]))}</span>${l.aoVivo ? '<span class="pill verde vivo">ao vivo</span>' : `<a href="#area/${encodeURIComponent(c.id)}/${encodeURIComponent(x.catId)}" class="pill">tela</a>`}</div>`; }).join('') : '<span class="sub">Nenhuma luta pendente.</span>'}</div></div>
    </div>`;
}

/* ---------- inscrições ---------- */
function inscricoesHtml(c, org, cats) {
  const catNome = (id) => { const k = cats.find((x) => x.id === id); return k ? k.nome : ''; };
  const lista = inscritos.slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  return `
    <div class="chave-barra"><div><h2>Inscritos <span class="pill">${lista.length}</span></h2><p class="sub">Sexo e peso declarados na inscrição; o organizador confere na pesagem.</p></div>
      ${org && c.status === 'inscricoes' ? `<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="bt bt-vidro bt-sm" id="btAddAluno"><i class="fas fa-user-plus"></i> Inscrever atleta</button></div>` : ''}</div>
    <div class="pessoas">${lista.map((i) => `
      <div class="pessoa">${avatarHtml(i)}<div class="q"><b>${esc(nomeBonito(i.nome))}${i.apelido ? ` <span style="color:var(--teal-claro)">“${esc(i.apelido)}”</span>` : ''}</b><small>${cordaoChip(i.cordao)} ${esc(i.cordao || '')} · ${esc(i.academiaNome || nomeNucleo(i.academiaId) || '—')} · ${i.sexo === 'F' ? 'Fem.' : i.sexo === 'M' ? 'Masc.' : '<span style="color:var(--ouro-claro)">sexo?</span>'} · ${i.peso ? `${esc(i.peso)} kg` : '<span style="color:var(--ouro-claro)">peso?</span>'}${i.idade ? ` · ${esc(i.idade)} anos` : ''}${i.categoriaId ? `<span class="pill teal">${esc(catNome(i.categoriaId))}</span>` : ''}</small></div>
        <div class="acoes">${(org || i.uid === uid) && c.status === 'inscricoes' ? `<button type="button" class="mini-bt" data-editar="${esc(i.uid)}" aria-label="Editar"><i class="fas fa-pen"></i></button><button type="button" class="mini-bt perigo" data-remover="${esc(i.uid)}" aria-label="Remover"><i class="fas fa-xmark"></i></button>` : ''}</div></div>`).join('') || '<div class="vazio"><i class="fas fa-user-group"></i><b>Ninguém inscrito ainda</b></div>'}</div>`;
}
function ligarInscricoes(c, org) {
  const add = el('btAddAluno'); if (add) add.addEventListener('click', () => folhaEscolherAluno(c));
  pagina.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => { const i = inscritos.find((x) => x.uid === b.dataset.editar); if (i) folhaInscricao(c, i, true); }));
  pagina.querySelectorAll('[data-remover]').forEach((b) => b.addEventListener('click', async () => {
    const i = inscritos.find((x) => x.uid === b.dataset.remover); if (!i) return;
    if (!confirm(`Remover ${nomeBonito(i.nome)} do campeonato?`)) return;
    await deleteDoc(doc(db, 'campeonatos', c.id, 'inscricoes', i.uid));
    await updateDoc(doc(db, 'campeonatos', c.id), { inscritosTotal: Math.max(0, inscritos.length - 1) }).catch(() => {});
    toast('Inscrição removida');
  }));
}
function folhaInscricao(c, pessoa, editando) {
  const f = abrirFolha(`
    <span class="eyebrow">${editando ? 'Editar inscrição' : 'Inscrição'}</span><h2>${esc(nomeBonito(pessoa.nome || 'Atleta'))}</h2>
    <p class="sub">${esc(c.nome)} · ${dataBR(c.data)}</p>
    <form class="form" id="fInsc" style="margin-top:14px">
      <div class="linha">
        <div class="campo"><label>Sexo</label><div class="segment" id="iSexo"><button type="button" aria-pressed="${pessoa.sexo === 'M'}" data-v="M">Masculino</button><button type="button" aria-pressed="${pessoa.sexo === 'F'}" data-v="F">Feminino</button></div></div>
        <div class="campo"><label for="iPeso">Peso (kg)</label><input id="iPeso" type="number" min="20" max="200" step="0.1" required value="${esc(pessoa.peso || '')}" placeholder="Ex.: 72"></div>
        <div class="campo"><label for="iApelido">Apelido na capoeira (opcional)</label><input id="iApelido" maxlength="24" value="${esc(pessoa.apelido || '')}" placeholder="Como é chamado na roda"></div>
        <div class="campo"><label for="iCordao">Cordão</label><select id="iCordao">${ORDEM_CORDOES.map((k) => `<option ${k === (pessoa.cordao || 'Iniciante') ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div>
      </div>
      <div class="acoes"><button type="submit" class="bt bt-verde"><i class="fas fa-check"></i> ${editando ? 'Salvar' : 'Confirmar inscrição'}</button><button type="button" class="bt bt-vidro" data-fechar>Cancelar</button></div>
    </form>`);
  f.querySelector('#iSexo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; f.querySelectorAll('#iSexo button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  f.querySelector('#fInsc').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sexo = (f.querySelector('#iSexo [aria-pressed="true"]') || {}).dataset; if (!sexo) { toast('Escolha o sexo'); return; }
    const dados = { uid: pessoa.uid, nome: pessoa.nome || 'Atleta', apelido: f.querySelector('#iApelido').value.trim().slice(0, 24), fotoUrl: /^https:/.test(pessoa.fotoUrl || '') ? pessoa.fotoUrl : '', cordao: f.querySelector('#iCordao').value, academiaId: pessoa.academiaId || null, academiaNome: pessoa.academiaNome || nomeNucleo(pessoa.academiaId) || '', sexo: sexo.v, peso: Math.round(Number(f.querySelector('#iPeso').value) * 10) / 10, idade: Number(pessoa.idade) || null, demo: !!pessoa.demo, em: pessoa.em || new Date().toISOString(), por: uid, pesagemOk: !!pessoa.pesagemOk };
    try {
      await setDoc(doc(db, 'campeonatos', c.id, 'inscricoes', pessoa.uid), dados);
      if (!editando) await updateDoc(doc(db, 'campeonatos', c.id), { inscritosTotal: inscritos.length + 1 }).catch(() => {});
      toast(editando ? 'Inscrição atualizada' : 'Inscrição confirmada!'); f.remove();
    } catch (er) { console.error(er); toast('Não deu para salvar. Tente de novo.'); }
  });
}
async function folhaEscolherAluno(c) {
  const f = abrirFolha(`<span class="eyebrow">Inscrever atleta</span><h2>Quem vai competir?</h2><div class="campo" style="margin:12px 0"><input id="buscaAluno" placeholder="Buscar pelo nome…" autofocus></div><div class="pessoas" id="listaAlunos"><div class="carregando"><span class="giro"></span></div></div>`);
  let alunos = [];
  try {
    if (ehAdmin() && !c.academiaId) alunos = await listar('usuarios');
    else { const r = await listarPorAcademia('usuarios', c.academiaId || perfil.academiaGerenciadaId, 400); alunos = r.itens; }
  } catch (e) { alunos = []; }
  alunos = alunos.filter((u) => ehAtleta(u) && u.ativo !== false && !inscritos.some((i) => i.uid === u.id)).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  const desenhar = (termo = '') => {
    const t = termo.trim().toLowerCase();
    const lista = alunos.filter((u) => !t || String(u.nome || '').toLowerCase().includes(t)).slice(0, 40);
    f.querySelector('#listaAlunos').innerHTML = lista.map((u) => `<button type="button" class="pessoa" data-uid="${esc(u.id)}" style="text-align:left;color:#fff">${avatarHtml(u)}<span class="q"><b>${esc(nomeBonito(u.nome))}</b><small>${cordaoChip(u.cordaoAtual)} ${esc(u.cordaoAtual || '')} · ${esc(u.academiaNome || nomeNucleo(u.academiaId))}</small></span><i class="fas fa-chevron-right"></i></button>`).join('') || '<div class="vazio"><b>Ninguém encontrado</b></div>';
    f.querySelectorAll('[data-uid]').forEach((b) => b.addEventListener('click', () => { const u = alunos.find((x) => x.id === b.dataset.uid); f.remove(); folhaInscricao(c, { uid: u.id, nome: u.nome, fotoUrl: u.fotoUrl, cordao: u.cordaoAtual, academiaId: u.academiaId, academiaNome: u.academiaNome, idade: u.idade, apelido: u.apelido || '' }, false); }));
  };
  desenhar(); f.querySelector('#buscaAluno').addEventListener('input', (e) => desenhar(e.target.value));
}

/* ---------- categorias ---------- */
async function gerarCategorias(c) {
  const { categorias, inscritos: comCat, pendentes } = M.gerarCategorias(c.config, inscritos);
  if (pendentes.length) { toast(`${pendentes.length} inscrito(s) sem sexo ou peso — complete antes de gerar`); abaAtual = 'inscricoes'; desenharDetalhe(); return; }
  try {
    await Promise.all(comCat.map((i) => updateDoc(doc(db, 'campeonatos', c.id, 'inscricoes', i.uid), { categoriaId: i.categoriaId })));
    await updateDoc(doc(db, 'campeonatos', c.id), { categorias: categorias.map((k) => ({ ...k })), status: 'categorias', inscritosTotal: inscritos.length });
    abaAtual = 'categorias'; toast(`${categorias.length} categorias geradas`);
  } catch (e) { console.error(e); toast('Não deu para gerar as categorias.'); }
}
function categoriasHtml(c, org, cats) {
  if (!cats.length) return `<div class="vazio"><i class="fas fa-layer-group"></i><b>Categorias ainda não geradas</b><p>${org ? 'Com os inscritos completos (sexo e peso), clique em "Gerar categorias".' : 'O organizador gera as categorias quando as inscrições fecham.'}</p></div>`;
  const nomeDe = (u) => { const i = inscritos.find((x) => x.uid === u); return i ? nomeCurto(i) : '?'; };
  return `
    <div class="chave-barra"><div><h2>Categorias <span class="pill">${cats.length}</span></h2><p class="sub">Graduação × sexo × peso${c.config && c.config.idades ? ' × idade' : ''}. Categorias com menos de ${esc((c.config && c.config.minimoPorCategoria) || 3)} atletas podem ser fundidas com a vizinha.</p></div>
      ${org && c.status === 'categorias' ? `<button type="button" class="bt bt-vidro bt-sm" id="btRegerar"><i class="fas fa-rotate"></i> Gerar de novo</button>` : ''}</div>
    <div class="grade-cat">${cats.map((k) => `
      <article class="card card-cat${k.poucos ? ' poucos' : ''}">
        <h3>${esc(k.nome)}</h3>
        <div class="eixos">${k.fundida ? '<span class="pill ouro">fundida</span>' : ''}${k.poucos ? '<span class="pill ouro"><i class="fas fa-triangle-exclamation"></i> poucos atletas</span>' : ''}${chaves[k.id] ? `<span class="pill ${chaves[k.id].status === 'encerrada' ? '' : 'verde'}">${chaves[k.id].status === 'encerrada' ? 'chave encerrada' : chaves[k.id].status === 'andamento' ? 'em disputa' : 'chave pronta'}</span>` : ''}</div>
        <div class="n">${k.inscritos.length}<small>atletas</small></div>
        <div class="nomes">${k.inscritos.map(nomeDe).join(', ')}</div>
        ${org && c.status === 'categorias' && cats.length > 1 ? `<div class="fundir"><select data-fundir="${esc(k.id)}"><option value="">Fundir com…</option>${cats.filter((o) => o.id !== k.id).map((o) => `<option value="${esc(o.id)}">${esc(o.nome)} (${o.inscritos.length})</option>`).join('')}</select></div>` : ''}
        <div class="rodape">${chaves[k.id] ? `<a class="bt bt-vidro bt-sm" href="#c/${encodeURIComponent(c.id)}/chave/${encodeURIComponent(k.id)}"><i class="fas fa-sitemap"></i> Ver chave</a>` : '<span></span>'}</div>
      </article>`).join('')}</div>`;
}
function ligarCategorias(c, org) {
  const rg = el('btRegerar'); if (rg) rg.addEventListener('click', () => gerarCategorias(c));
  pagina.querySelectorAll('[data-fundir]').forEach((s) => s.addEventListener('change', async () => {
    if (!s.value) return;
    const cats = categoriasAtuais();
    const r = M.fundirCategorias(cats, inscritos, s.dataset.fundir, s.value);
    try {
      await Promise.all(r.inscritos.filter((i, idx) => i.categoriaId !== inscritos[idx].categoriaId).map((i) => updateDoc(doc(db, 'campeonatos', c.id, 'inscricoes', i.uid), { categoriaId: i.categoriaId })));
      await updateDoc(doc(db, 'campeonatos', c.id), { categorias: r.categorias });
      toast('Categorias fundidas');
    } catch (e) { console.error(e); toast('Não deu para fundir.'); }
  }));
}

/* ---------- chaves ---------- */
async function gerarChaves(c) {
  const cats = categoriasAtuais(); if (!cats.length) return;
  try {
    const semente = Date.now() % 100000;
    await Promise.all(cats.map((k, i) => {
      const atletas = k.inscritos.map((u) => inscritos.find((x) => x.uid === u)).filter(Boolean);
      const ch = M.montarChave(atletas, { semente: semente + i });
      return setDoc(doc(db, 'campeonatos', c.id, 'chaves', k.id), M.empacotar({ ...ch, categoriaId: k.id, categoriaNome: k.nome }));
    }));
    await updateDoc(doc(db, 'campeonatos', c.id), { status: 'chaves' });
    abaAtual = 'chaves'; catFoco = cats[0].id; toast('Chaves montadas — sorteio separa atletas do mesmo núcleo');
  } catch (e) { console.error(e); toast('Não deu para montar as chaves.'); }
}
function chavesHtml(c, org, cats) {
  const ids = Object.keys(chaves);
  if (!ids.length) return `<div class="vazio"><i class="fas fa-sitemap"></i><b>Chaves ainda não montadas</b><p>${org ? 'Depois de conferir as categorias, clique em "Montar chaves".' : 'O organizador monta as chaves após as inscrições.'}</p></div>`;
  if (!catFoco || !chaves[catFoco]) catFoco = ids.find((k) => M.proximaLuta(chaves[k])) || ids[0];
  const ch = chaves[catFoco]; const r = M.resumoChave(ch);
  return `
    <div class="chips" style="margin-bottom:14px">${cats.filter((k) => chaves[k.id]).map((k) => `<button type="button" class="chip" aria-pressed="${k.id === catFoco}" data-cat="${esc(k.id)}">${esc(k.nome)} <span class="n" style="opacity:.7">${k.inscritos.length}</span></button>`).join('')}</div>
    <div class="chave-barra"><div><h2>${esc(ch.categoriaNome || catFoco)}</h2><p class="sub">${r.atletas} atletas · ${r.rodadas} rodadas · ${r.feitas}/${r.lutas} lutas${ch.status === 'encerrada' ? ' · encerrada' : ''}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="bt bt-vidro bt-sm" href="#area/${encodeURIComponent(c.id)}/${encodeURIComponent(catFoco)}"><i class="fas fa-tv"></i> Tela de área</a>${org && ch.status !== 'encerrada' && c.status !== 'encerrado' ? `<button type="button" class="bt bt-vidro bt-sm" id="btResortear"><i class="fas fa-shuffle"></i> Sortear de novo</button>` : ''}</div></div>
    <div class="chave-caixa" id="chaveSvg">${chaveSvg(ch, org && c.status !== 'encerrado')}</div>
    <div class="chave-legenda"><span style="--c:var(--verde)">vencedor / luta ao vivo</span><span style="--c:rgba(255,255,255,.35)">aguardando</span><span style="--c:var(--ouro)">bye (passa direto)</span></div>`;
}
function ligarChaves(c, org) {
  pagina.querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => { catFoco = b.dataset.cat; desenharDetalhe(); }));
  const rs = el('btResortear'); if (rs) rs.addEventListener('click', async () => {
    const ch = chaves[catFoco]; if (!ch) return;
    if (M.resumoChave(ch).feitas && !confirm('Esta chave já tem resultados. Sortear de novo apaga todos. Continuar?')) return;
    const k = categoriasAtuais().find((x) => x.id === catFoco);
    const atletas = (k ? k.inscritos : Object.keys(ch.atletas)).map((u) => inscritos.find((x) => x.uid === u)).filter(Boolean);
    const nova = M.montarChave(atletas, { semente: Date.now() % 100000 });
    await setDoc(doc(db, 'campeonatos', c.id, 'chaves', catFoco), M.empacotar({ ...nova, categoriaId: catFoco, categoriaNome: ch.categoriaNome || '' }));
    toast('Chave sorteada de novo');
  });
  if (org && c.status !== 'encerrado') pagina.querySelectorAll('.luta[data-luta]').forEach((g) => g.addEventListener('click', () => folhaResultado(c, catFoco, g.dataset.luta)));
}
// Chave em SVG: colunas por rodada, caixas com os dois atletas (listras do cordão), ligações.
function chaveSvg(ch, clicavel) {
  const R = ch.rodadas.length; if (!R) return '<p class="sub" style="padding:16px">Chave vazia.</p>';
  const W = 232, H = 72, GX = 56, GY = 18, TOPO = 36;
  const col = (r) => 16 + r * (W + GX);
  const altura1 = ch.rodadas[0].length * (H + GY);
  const yLuta = (r, i) => { const bloco = altura1 / ch.rodadas[r].length; return TOPO + i * bloco + bloco / 2 - H / 2; };
  const largura = col(R - 1) + W + 16; const alturaTotal = TOPO + altura1 + 10;
  let s = `<svg viewBox="0 0 ${largura} ${alturaTotal}" width="${largura}" height="${alturaTotal}" role="img" aria-label="Chave da categoria ${esc(ch.categoriaNome || '')}">`;
  s += '<defs>';
  Object.entries(ch.atletas).forEach(([u, a]) => { const c = coresDoCordao(a.cordao || 'Iniciante'); s += `<linearGradient id="g_${esc(u)}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c[0]}"/><stop offset=".33" stop-color="${c[0]}"/><stop offset=".34" stop-color="${c[1]}"/><stop offset=".66" stop-color="${c[1]}"/><stop offset=".67" stop-color="${c[2]}"/><stop offset="1" stop-color="${c[2]}"/></linearGradient>`; });
  s += '</defs>';
  ch.rodadas.forEach((rod, r) => {
    s += `<text class="rodada-titulo" x="${col(r)}" y="18">${esc(M.nomeRodada(r, R))}</text>`;
    rod.forEach((l, i) => {
      const x = col(r), y = yLuta(r, i);
      // ligação para a próxima
      if (r < R - 1) { const ny = yLuta(r + 1, Math.floor(i / 2)) + H / 2; const mx = x + W + GX / 2; s += `<path class="ligacao${l.vencedor ? ' feita' : ''}" d="M${x + W} ${y + H / 2} H${mx} V${ny} H${x + W + GX}"/>`; }
      const linha = (u, lado) => {
        const yy = y + (lado === 'a' ? 0 : H / 2);
        if (!u) return `<text class="vazio" x="${x + 16}" y="${yy + 23}">${l.bye && lado === 'b' ? 'bye' : 'aguardando…'}</text>`;
        const a = ch.atletas[u] || { nome: '?' }; const venceu = l.vencedor === u; const perdeu = l.vencedor && !venceu;
        const pl = l.placar ? (lado === 'a' ? l.placar[0] : l.placar[1]) : null;
        return `<g class="${venceu ? 'vencedor' : perdeu ? 'perdedor' : ''}"><rect x="${x + 6}" y="${yy + 8}" width="6" height="${H / 2 - 16}" rx="3" fill="url(#g_${esc(u)})"/><text class="nome" x="${x + 20}" y="${yy + 19}">${esc(nomeCurto(a)).slice(0, 22)}${venceu ? ' ✓' : ''}</text><text class="nucleo" x="${x + 20}" y="${yy + 31}">${esc(`${a.cordao || ''}${a.academiaNome ? ` · ${a.academiaNome}` : ''}`.slice(0, 30))}</text>${pl != null ? `<text class="placar" x="${x + W - 14}" y="${yy + 24}" text-anchor="end">${pl}</text>` : ''}</g>`;
      };
      s += `<g class="luta${l.aoVivo ? ' vivo' : ''}${l.vencedor && !l.bye ? ' feita' : ''}" ${clicavel && !l.bye && l.a && l.b ? `data-luta="${esc(l.id)}" tabindex="0" role="button" aria-label="Registrar resultado"` : ''} transform="translate(0,0)"><rect class="fundo" x="${x}" y="${y}" width="${W}" height="${H}" rx="12"/><line x1="${x + 6}" x2="${x + W - 6}" y1="${y + H / 2}" y2="${y + H / 2}" stroke="rgba(255,255,255,.1)"/>${linha(l.a, 'a')}${linha(l.b, 'b')}${l.bye ? `<rect x="${x + W - 10}" y="${y + 6}" width="4" height="${H - 12}" rx="2" fill="var(--ouro)" opacity=".8"/>` : ''}</g>`;
    });
  });
  return `${s}</svg>`;
}
function folhaResultado(c, catId, lutaId) {
  const ch = chaves[catId]; const ac = M.lutaPorId(ch, lutaId); if (!ac) return;
  const l = ac.luta; const A = ch.atletas[l.a]; const B = ch.atletas[l.b];
  let venc = l.vencedor || null; let pa = l.placar ? l.placar[0] : 0; let pb = l.placar ? l.placar[1] : 0;
  const lado = (u, a, pts) => `<div class="lado" role="button" tabindex="0" data-venc="${esc(u)}" aria-pressed="${venc === u}" style="--neon:${neonDe(a.cordao)}">${avatarHtml(a)}<b>${esc(nomeCurto(a))}</b>${cordaoChip(a.cordao)}<small>${esc(a.academiaNome || '')}</small><span class="pontos"><button type="button" data-menos="${esc(u)}" aria-label="Menos um ponto">−</button><output id="pts_${esc(u)}">${pts}</output><button type="button" data-mais="${esc(u)}" aria-label="Mais um ponto">+</button></span></div>`;
  const f = abrirFolha(`
    <span class="eyebrow">${esc(M.nomeRodada(ac.rodada, ch.rodadas.length))} · ${esc(ch.categoriaNome || '')}</span><h2>Resultado da luta</h2>
    <p class="sub">Toque no vencedor. Os pontos são opcionais (jogo avaliado por notas ou luta por pontos).</p>
    <div class="duelo">${lado(l.a, A, pa)}<div class="vs">vs</div>${lado(l.b, B, pb)}</div>
    <div class="form"><div class="acoes"><button type="button" class="bt bt-verde" id="btSalvarRes" ${venc ? '' : 'disabled'}><i class="fas fa-check"></i> Confirmar vencedor</button><button type="button" class="bt bt-vidro" id="btAoVivo"><i class="fas fa-tower-broadcast"></i> ${l.aoVivo ? 'Tirar do ar' : 'Marcar ao vivo'}</button>${l.vencedor ? '<button type="button" class="bt bt-vidro bt-perigo" id="btDesfazer"><i class="fas fa-rotate-left"></i> Desfazer</button>' : ''}<button type="button" class="bt bt-vidro" data-fechar>Fechar</button></div></div>`);
  const salvarBt = f.querySelector('#btSalvarRes');
  f.addEventListener('click', (e) => {
    const mais = e.target.closest('[data-mais]'); const menos = e.target.closest('[data-menos]');
    if (mais || menos) { e.stopPropagation(); const u = (mais || menos).dataset.mais || (mais || menos).dataset.menos; if (u === l.a) pa = Math.max(0, pa + (mais ? 1 : -1)); else pb = Math.max(0, pb + (mais ? 1 : -1)); f.querySelector(`#pts_${CSS.escape(u)}`).textContent = u === l.a ? pa : pb; return; }
    const ld = e.target.closest('.lado'); if (ld) { venc = ld.dataset.venc; f.querySelectorAll('.lado').forEach((x) => x.setAttribute('aria-pressed', String(x === ld))); salvarBt.disabled = false; }
  });
  f.addEventListener('keydown', (e) => { const ld = e.target.closest('.lado'); if (ld && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); ld.click(); } });
  salvarBt.addEventListener('click', async () => {
    try { const nova = M.registrarResultado(ch, lutaId, venc, pa || pb ? [pa, pb] : null); await salvarChave(c, catId, nova); toast(nova.status === 'encerrada' ? 'Chave encerrada — pódio definido!' : 'Resultado registrado'); f.remove(); } catch (er) { toast(er.message || 'Não deu para registrar.'); }
  });
  f.querySelector('#btAoVivo').addEventListener('click', async () => { await salvarChave(c, catId, M.marcarAoVivo(ch, l.aoVivo ? null : lutaId)); f.remove(); });
  const des = f.querySelector('#btDesfazer'); if (des) des.addEventListener('click', async () => { try { await salvarChave(c, catId, M.registrarResultado(ch, lutaId, null)); toast('Resultado desfeito'); f.remove(); } catch (er) { toast(er.message); } });
}
async function salvarChave(c, catId, nova) {
  await setDoc(doc(db, 'campeonatos', c.id, 'chaves', catId), M.empacotar({ ...nova, categoriaId: catId, categoriaNome: (chaves[catId] || {}).categoriaNome || '' }));
  const feitas = Object.entries(chaves).reduce((s, [k, ch]) => s + M.resumoChave(k === catId ? nova : ch).feitas, 0);
  const patch = { lutasFeitas: feitas }; if (c.status === 'chaves' && feitas > 0) patch.status = 'andamento';
  await updateDoc(doc(db, 'campeonatos', c.id), patch).catch(() => {});
}

/* ---------- pódio ---------- */
function podioHtml(c, org, cats) {
  const prontas = Object.entries(chaves).filter(([, ch]) => ch.status === 'encerrada' && ch.podio);
  if (!prontas.length) return `<div class="vazio"><i class="fas fa-medal"></i><b>Nenhum pódio ainda</b><p>Quando a final de uma categoria terminar, o pódio aparece aqui.</p></div>`;
  const degrau = (ch, u, cls, pos) => { if (!u) return `<div class="degrau ${cls}"><span class="av">—</span><b>—</b><div class="bloco">${pos}</div></div>`; const a = ch.atletas[u] || {}; return `<div class="degrau ${cls}"><span class="medalha">${pos}</span>${avatarHtml(a)}<b>${esc(nomeCurto(a))}</b>${cordaoChip(a.cordao)}<small>${esc(a.academiaNome || '')}</small><div class="bloco">${pos}º</div></div>`; };
  return `<div class="podios">${prontas.map(([k, ch]) => `<section class="podio"><div class="chave-barra"><h3>${esc(ch.categoriaNome || k)}</h3><a class="bt bt-vidro bt-sm" href="#c/${encodeURIComponent(c.id)}/chave/${encodeURIComponent(k)}">Ver chave</a></div><div class="colunas">${degrau(ch, ch.podio[1], 'prata', 2)}${degrau(ch, ch.podio[0], 'ouro', 1)}${degrau(ch, ch.podio[2], 'bronze', 3)}</div>${ch.podio[3] ? `<p class="sub" style="text-align:center;margin-top:10px">3º lugar também: <b>${esc(nomeCurto(ch.atletas[ch.podio[3]] || {}))}</b></p>` : ''}</section>`).join('')}</div>
    ${c.status === 'encerrado' ? `<p class="sub" style="margin-top:16px;text-align:center"><i class="fas fa-medal" style="color:var(--ouro-claro)"></i> Campeonato encerrado: os atletas do pódio recebem o brasão <b>Subiu ao pódio</b> e o resultado foi publicado na Rede.</p>` : ''}`;
}
function ligarPodio() { /* nada interativo além dos links */ }

/* ---------- ações do organizador ---------- */
async function encerrarCampeonato(c) {
  const todas = Object.values(chaves);
  if (!todas.length || !todas.every((ch) => ch.status === 'encerrada')) { toast('Encerre todas as chaves antes de encerrar o campeonato'); abaAtual = 'chaves'; desenharDetalhe(); return; }
  if (!confirm('Encerrar o campeonato? Os resultados viram brasões e um post na Rede. Não dá para reabrir.')) return;
  try {
    const podios = Object.entries(chaves).map(([k, ch]) => ({ categoriaId: k, categoriaNome: ch.categoriaNome || '', podio: ch.podio, atletas: ch.podio.filter(Boolean).map((u) => ({ uid: u, nome: ch.atletas[u].nome, apelido: ch.atletas[u].apelido || '', cordao: ch.atletas[u].cordao, academiaId: ch.atletas[u].academiaId || null, academiaNome: ch.atletas[u].academiaNome || '' })) }));
    await updateDoc(doc(db, 'campeonatos', c.id), { status: 'encerrado', encerradoEm: new Date().toISOString(), encerradoPor: uid, podios });
    abaAtual = 'podio'; toast('Campeonato encerrado!');
  } catch (e) { console.error(e); toast('Não deu para encerrar.'); }
}
async function apagarCampeonato(c) {
  if (!confirm(`Apagar "${c.nome}" com inscrições e chaves? Não dá para desfazer.`)) return;
  try {
    const subs = await Promise.all([getDocs(collection(db, 'campeonatos', c.id, 'inscricoes')), getDocs(collection(db, 'campeonatos', c.id, 'chaves'))]);
    await Promise.all(subs.flatMap((s) => s.docs.map((d) => deleteDoc(d.ref))));
    await deleteDoc(doc(db, 'campeonatos', c.id));
    toast('Campeonato apagado'); location.hash = '';
  } catch (e) { console.error(e); toast('Não deu para apagar.'); }
}
function editarCampeonato() {
  const c = atual;
  const f = abrirFolha(`<span class="eyebrow">Editar</span><h2>${esc(c.nome)}</h2><form class="form" id="fEd" style="margin-top:12px"><div class="linha"><div class="campo" style="grid-column:1/-1"><label for="eNome">Nome</label><input id="eNome" maxlength="80" value="${esc(c.nome)}"></div><div class="campo"><label for="eData">Data</label><input id="eData" type="date" value="${esc(c.data || '')}"></div><div class="campo"><label for="eHora">Horário</label><input id="eHora" type="time" value="${esc(c.hora || '')}"></div><div class="campo"><label for="eLocal">Local</label><input id="eLocal" maxlength="80" value="${esc(c.local || '')}"></div><div class="campo"><label for="eCidade">Cidade / UF</label><input id="eCidade" maxlength="60" value="${esc(c.cidade || '')}"></div><div class="campo" style="grid-column:1/-1"><label for="eDesc">Descrição</label><textarea id="eDesc" maxlength="600">${esc(c.descricao || '')}</textarea></div><div class="campo" style="grid-column:1/-1"><label for="eReg">Regulamento (link)</label><input id="eReg" type="url" value="${esc(c.regulamentoUrl || '')}"></div></div><div class="acoes"><button type="submit" class="bt bt-verde">Salvar</button><button type="button" class="bt bt-vidro" data-fechar>Cancelar</button></div></form>`);
  f.querySelector('#fEd').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await updateDoc(doc(db, 'campeonatos', c.id), { nome: f.querySelector('#eNome').value.trim().slice(0, 80) || c.nome, data: f.querySelector('#eData').value || c.data, hora: f.querySelector('#eHora').value || '', local: f.querySelector('#eLocal').value.trim().slice(0, 80), cidade: f.querySelector('#eCidade').value.trim().slice(0, 60), descricao: f.querySelector('#eDesc').value.trim().slice(0, 600), regulamentoUrl: /^https:\/\//.test(f.querySelector('#eReg').value.trim()) ? f.querySelector('#eReg').value.trim() : '' }); toast('Salvo'); f.remove(); } catch (er) { toast('Não deu para salvar.'); }
  });
}

/* ====================== TELA DE ÁREA ====================== */
let relogio = { total: 180, resta: 180, rodando: false, timer: null };
function abrirArea(campId, catId) {
  document.body.classList.add('area');
  el('barra').hidden = true;
  pagina.className = 'area-tela'; pagina.innerHTML = `<div class="carregando"><span class="giro"></span></div>`;
  let camp = null; let ch = null;
  const redesenhar = () => { if (camp && ch) desenharArea(camp, catId, ch); };
  desligarDet.push(onSnapshot(doc(db, 'campeonatos', campId), (s) => { camp = s.exists() ? { id: s.id, ...s.data() } : null; redesenhar(); }));
  desligarDet.push(onSnapshot(doc(db, 'campeonatos', campId, 'chaves', catId), (s) => { ch = s.exists() ? M.desempacotar(s.data()) : null; if (ch) chaves[catId] = ch; redesenhar(); }));
  desligarDet.push(() => { el('barra').hidden = false; pagina.className = 'pagina'; pararRelogio(); });
}
function fmt(seg) { return `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`; }
function pararRelogio() { clearInterval(relogio.timer); relogio.timer = null; relogio.rodando = false; }
function desenharArea(camp, catId, ch) {
  const org = organiza(camp);
  const luta = M.proximaLuta(ch);
  const prox = ch.rodadas.flat().filter((l) => !l.vencedor && l.a && l.b && l !== luta).slice(0, 6);
  const marca = `<div class="marca"><img src="assets/logo-liberdade150.png" alt=""><span>Grupo de Capoeira ${esc(ESCOLA.nomeCurto)}<br><span style="color:var(--texto-3)">${esc(camp.nome)}</span></span></div>`;
  if (!luta) {
    const p = ch.podio || [];
    pagina.innerHTML = `<div class="area-cab"><div class="t"><small>${esc(ch.categoriaNome || '')}</small><b>${esc(camp.nome)}</b></div><a class="bt bt-vidro bt-sm" href="#c/${encodeURIComponent(camp.id)}/chave/${encodeURIComponent(catId)}"><i class="fas fa-xmark"></i> Sair</a></div>
      <div class="area-fim">${ch.status === 'encerrada' ? `<span class="eyebrow">Categoria encerrada</span><h2>${esc(nomeCurto(ch.atletas[p[0]] || {}))} é campeão${(ch.atletas[p[0]] || {}).sexo === 'F' ? '' : ''}!</h2><div class="podio" style="width:min(100%,720px)"><div class="colunas">${['prata', 'ouro', 'bronze'].map((cls, i) => { const u = p[[1, 0, 2][i]]; const a = u ? ch.atletas[u] : null; return `<div class="degrau ${cls}">${a ? `<span class="medalha">${[2, 1, 3][i]}</span>${avatarHtml(a)}<b>${esc(nomeCurto(a))}</b>${cordaoChip(a.cordao)}<small>${esc(a.academiaNome || '')}</small>` : '<b>—</b>'}<div class="bloco">${[2, 1, 3][i]}º</div></div>`; }).join('')}</div></div>` : '<span class="eyebrow">Aguardando</span><h2>As próximas lutas dependem de resultados anteriores</h2>'}</div>
      <div class="area-rodape"><div></div>${marca}</div>`;
    return;
  }
  const A = ch.atletas[luta.a]; const B = ch.atletas[luta.b];
  const pl = luta.placar || [0, 0];
  const atleta = (u, a, i) => `<section class="area-atleta" style="--neon:${neonDe(a.cordao)}" data-lado="${u}">${avatarHtml(a)}<b>${esc(nomeCurto(a))}</b>${cordaoChip(a.cordao, true)}<small>${esc(a.cordao || '')}${a.academiaNome ? ` · ${esc(a.academiaNome)}` : ''}</small><div class="pontos" id="pts${i}">${pl[i]}</div>${org ? `<div class="mais-menos"><button type="button" data-ponto="${i}:-1" aria-label="Menos">−</button><button type="button" data-ponto="${i}:1" aria-label="Mais">+</button></div><button type="button" class="bt bt-verde bt-sm" data-vence="${esc(u)}"><i class="fas fa-trophy"></i> Venceu</button>` : ''}</section>`;
  pagina.innerHTML = `
    <div class="area-cab"><div class="t"><small>${esc(ch.categoriaNome || '')} · ${esc(M.nomeRodada(M.lutaPorId(ch, luta.id).rodada, ch.rodadas.length))}</small><b>${esc(camp.nome)}</b></div><div style="display:flex;gap:8px;align-items:center">${luta.aoVivo ? '<span class="pill verde vivo">AO VIVO</span>' : (org ? `<button type="button" class="bt bt-vidro bt-sm" id="btVivo"><i class="fas fa-tower-broadcast"></i> Ao vivo</button>` : '')}<a class="bt bt-vidro bt-sm" href="#c/${encodeURIComponent(camp.id)}/chave/${encodeURIComponent(catId)}" aria-label="Sair"><i class="fas fa-xmark"></i></a></div></div>
    <div class="area-duelo">${atleta(luta.a, A, 0)}<div class="area-meio"><div class="vs">vs</div><div class="relogio${relogio.resta === 0 ? ' fim' : ''}" id="relogio">${fmt(relogio.resta)}</div>${org ? `<div class="ctl"><button type="button" class="bt bt-vidro bt-sm" id="btRel">${relogio.rodando ? '<i class="fas fa-pause"></i> Pausar' : '<i class="fas fa-play"></i> Iniciar'}</button><button type="button" class="bt bt-vidro bt-sm" id="btRelZera" title="Zerar"><i class="fas fa-rotate-left"></i></button><select id="selTempo" class="bt bt-vidro bt-sm" style="padding:0 10px" aria-label="Tempo da luta"><option value="90" ${relogio.total === 90 ? 'selected' : ''}>1:30</option><option value="120" ${relogio.total === 120 ? 'selected' : ''}>2:00</option><option value="180" ${relogio.total === 180 ? 'selected' : ''}>3:00</option><option value="300" ${relogio.total === 300 ? 'selected' : ''}>5:00</option></select></div>` : ''}</div>${atleta(luta.b, B, 1)}</div>
    <div class="area-rodape"><div class="proximas">${prox.map((l) => `<div class="prox"><small>a seguir</small><b>${esc(nomeCurto(ch.atletas[l.a]))} vs ${esc(nomeCurto(ch.atletas[l.b]))}</b></div>`).join('') || '<div class="prox"><small>a seguir</small><b>Última luta da categoria</b></div>'}</div>${marca}</div>`;
  if (!org) return;
  const salvar = (nova) => salvarChave(camp, catId, nova);
  const relEl = el('relogio');
  const tic = () => { relogio.resta = Math.max(0, relogio.resta - 1); relEl.textContent = fmt(relogio.resta); if (relogio.resta === 0) { pararRelogio(); relEl.classList.add('fim'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } };
  el('btRel').addEventListener('click', () => { if (relogio.rodando) { pararRelogio(); } else { if (relogio.resta === 0) relogio.resta = relogio.total; relogio.rodando = true; relogio.timer = setInterval(tic, 1000); } desenharArea(camp, catId, ch); });
  el('btRelZera').addEventListener('click', () => { pararRelogio(); relogio.resta = relogio.total; desenharArea(camp, catId, ch); });
  el('selTempo').addEventListener('change', (e) => { pararRelogio(); relogio.total = Number(e.target.value); relogio.resta = relogio.total; desenharArea(camp, catId, ch); });
  const v = el('btVivo'); if (v) v.addEventListener('click', () => salvar(M.marcarAoVivo(ch, luta.id)));
  pagina.querySelectorAll('[data-ponto]').forEach((b) => b.addEventListener('click', async () => {
    const [i, d] = b.dataset.ponto.split(':').map(Number); const p = (luta.placar || [0, 0]).slice(); p[i] = Math.max(0, p[i] + d);
    const nova = JSON.parse(JSON.stringify(ch)); const l2 = M.lutaPorId(nova, luta.id).luta; l2.placar = p; l2.aoVivo = true; if (nova.status === 'pronta') nova.status = 'andamento';
    await salvar(nova);
  }));
  pagina.querySelectorAll('[data-vence]').forEach((b) => b.addEventListener('click', async () => {
    const u = b.dataset.vence; const a = ch.atletas[u];
    if (!confirm(`Confirmar ${nomeCurto(a)} como vencedor?`)) return;
    try { pararRelogio(); relogio.resta = relogio.total; await salvar(M.registrarResultado(ch, luta.id, u, luta.placar)); } catch (er) { toast(er.message); }
  }));
}

/* ---------- folha ---------- */
function abrirFolha(html) {
  const f = document.createElement('div'); f.className = 'folha'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true');
  f.innerHTML = `<div class="conteudo">${html}</div>`;
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-fechar]')) f.remove(); });
  const tecla = (e) => { if (e.key === 'Escape') { f.remove(); document.removeEventListener('keydown', tecla); } };
  document.addEventListener('keydown', tecla);
  document.body.appendChild(f);
  const foco = f.querySelector('input, button, select'); if (foco) setTimeout(() => foco.focus({ preventScroll: true }), 50);
  return f;
}
