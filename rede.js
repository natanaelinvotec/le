/* rede.js — Rede Liberdade (feed interno do grupo).

Modelo de dados (pensado pra custar pouco no Firestore — cobra-se por
documento lido/escrito, não por tamanho):
- perfisPublicos/{uid}: { nome, nomeBusca, fotoUrl, cordaoAtual, academiaId,
  academiaNome, atualizadoEm } — cartão público leve, escrito pela própria
  pessoa ao abrir a rede. É o que permite buscar/seguir amigos sem abrir a
  leitura de usuarios/{uid} (que continua privado).
- posts/{id}: { autorUid, autorNome, autorFoto, autorAcademiaId,
  autorAcademiaNome, autorCordao, texto, fotoUrl (link no Storage, nunca a
  imagem dentro do documento), criadoEm (ISO), curtidas: [uids],
  comentariosCount }.
- posts/{id}/comentarios/{cid}: { autorUid, autorNome, autorFoto, texto, criadoEm }.
- usuarios/{uid}.seguindo: [uids] (no próprio cadastro).
Leituras por abertura do feed: 1 página = 20 posts (20 leituras) + os
comentários só quando a pessoa abre. Foto comprimida a 1080px/0.72 antes de
subir (~150-250 KB) e guardada no Storage; o Firestore guarda só a URL. */
import { db, storage, auth, observarSessao, buscar, atualizar, arquivoParaDataUrlComprimido } from './firebase.js';
import { escapeHTML } from './shared.js';
import {
collection, doc, addDoc, getDocs, getDoc, updateDoc, deleteDoc, setDoc, query, where, orderBy, limit, startAfter,
arrayUnion, arrayRemove, increment,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { ref as storageRef, uploadString, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

const el = (id) => document.getElementById(id);
const PAGINA = 20;
let uid = null;
let perfil = null;
let seguindo = new Set();
let feedAtual = 'grupo';
let ultimoDoc = null;
let posts = [];
let fotoDataUrl = null;
let carregando = false;
let toastTimer = null;

function toast(msg) {
let t = document.querySelector('.toast');
if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
t.textContent = msg; t.style.display = 'block';
clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2800);
}
function iniciais(nome) { return String(nome || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?'; }
function avatarHTML(nome, foto, mini = false) {
return foto ? `<img class="avatar ${mini ? 'mini' : ''}" src="${escapeHTML(foto)}" alt="">` : `<div class="avatar ${mini ? 'mini' : ''}">${escapeHTML(iniciais(nome))}</div>`;
}
function tempoRelativo(iso) {
const d = new Date(iso); const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
if (s < 60) return 'agora'; if (s < 3600) return `${Math.floor(s / 60)} min`; if (s < 86400) return `${Math.floor(s / 3600)} h`;
if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
function nomeCurtoNucleo(nome) { return String(nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim(); }
const ehModerador = () => !!(perfil && ((perfil.papeis || []).includes('admin') || perfil.acessoGeral === true));
const gerencia = (academiaId) => !!(perfil && (perfil.papeis || []).includes('mestre') && perfil.academiaGerenciadaId && perfil.academiaGerenciadaId === academiaId);
const podeApagar = (p) => p.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId);

// Cartão público próprio: sempre sincronizado com o cadastro ao abrir a rede.
async function sincronizarPerfilPublico() {
const dados = {
nome: perfil.nome || perfil.email || 'Capoeirista',
nomeBusca: String(perfil.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
fotoUrl: perfil.fotoUrl || '',
cordaoAtual: perfil.cordaoAtual || '',
academiaId: perfil.academiaId || null,
academiaNome: perfil.academiaNome || '',
atualizadoEm: new Date().toISOString(),
};
try { await setDoc(doc(db, 'perfisPublicos', uid), dados, { merge: true }); } catch (e) { console.warn('perfil público', e); }
}

/* ---------------- FEED ---------------- */
function renderPost(p) {
const curtido = (p.curtidas || []).includes(uid);
const meta = [p.autorCordao ? `<span class="chip teal">${escapeHTML(p.autorCordao)}</span>` : '', p.autorAcademiaNome ? `<span class="chip neutra">${escapeHTML(nomeCurtoNucleo(p.autorAcademiaNome))}</span>` : '', `<span>${tempoRelativo(p.criadoEm)}</span>`].filter(Boolean).join('');
return `
<article class="card post" data-id="${p.id}">
<div class="post-topo">
${avatarHTML(p.autorNome, p.autorFoto)}
<div style="min-width:0; flex:1;"><div class="nome">${escapeHTML(p.autorNome || 'Capoeirista')}</div><div class="meta">${meta}</div></div>
${podeApagar(p) ? `<button class="post-menu" data-acao="apagar" title="Apagar post" aria-label="Apagar post"><i class="fas fa-trash-can"></i></button>` : ''}
</div>
${p.texto ? `<p class="post-texto">${escapeHTML(p.texto)}</p>` : ''}
${p.fotoUrl ? `<img class="post-foto" src="${escapeHTML(p.fotoUrl)}" alt="Foto do post" loading="lazy">` : ''}
<div class="post-acoes">
<button class="acao ${curtido ? 'curtido' : ''}" data-acao="curtir"><i class="${curtido ? 'fas' : 'far'} fa-heart"></i> ${(p.curtidas || []).length || ''}</button>
<button class="acao" data-acao="comentar"><i class="far fa-comment"></i> ${p.comentariosCount || ''}</button>
${p.autorUid !== uid ? `<button class="acao" data-acao="seguir" data-uid="${escapeHTML(p.autorUid)}"><i class="fas ${seguindo.has(p.autorUid) ? 'fa-user-check' : 'fa-user-plus'}"></i> ${seguindo.has(p.autorUid) ? 'Seguindo' : 'Seguir'}</button>` : ''}
</div>
<div class="comentarios oculto" data-comentarios></div>
</article>`;
}

function filtrar(lista) {
if (feedAtual === 'amigos') return lista.filter((p) => seguindo.has(p.autorUid));
if (feedAtual === 'meus') return lista.filter((p) => p.autorUid === uid);
return lista;
}

function renderFeed() {
const feed = el('feed');
const visiveis = filtrar(posts);
if (!visiveis.length) {
const msg = feedAtual === 'amigos'
? (seguindo.size ? 'Quem você segue ainda não publicou nada por aqui.' : 'Você ainda não segue ninguém. Toque em "Seguir" num post ou no ícone de adicionar amigos lá em cima.')
: (feedAtual === 'meus' ? 'Você ainda não publicou. Conta aí como foi o treino!' : 'Ninguém publicou ainda — seja o primeiro a compartilhar um momento do grupo.');
feed.innerHTML = `<div class="vazio"><i class="fas fa-users" style="color:var(--muted);"></i>${msg}</div>`;
} else {
feed.innerHTML = visiveis.map(renderPost).join('');
}
el('btnMais').classList.toggle('oculto', !ultimoDoc);
}

async function carregarFeed(mais = false) {
if (carregando) return;
carregando = true;
try {
let q = query(collection(db, 'posts'), orderBy('criadoEm', 'desc'), limit(PAGINA));
if (mais && ultimoDoc) q = query(collection(db, 'posts'), orderBy('criadoEm', 'desc'), startAfter(ultimoDoc), limit(PAGINA));
const snap = await getDocs(q);
const novos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
posts = mais ? posts.concat(novos) : novos;
ultimoDoc = snap.docs.length === PAGINA ? snap.docs[snap.docs.length - 1] : null;
renderFeed();
} catch (e) {
console.error(e);
el('feed').innerHTML = '<div class="vazio">Não foi possível carregar o feed agora. Confira se as regras do Firestore da rede já foram publicadas.</div>';
} finally { carregando = false; }
}

/* ---------------- AÇÕES ---------------- */
async function curtir(p, btn) {
const curtido = (p.curtidas || []).includes(uid);
try {
await updateDoc(doc(db, 'posts', p.id), { curtidas: curtido ? arrayRemove(uid) : arrayUnion(uid) });
p.curtidas = curtido ? (p.curtidas || []).filter((u) => u !== uid) : [...(p.curtidas || []), uid];
btn.classList.toggle('curtido', !curtido);
btn.innerHTML = `<i class="${curtido ? 'far' : 'fas'} fa-heart"></i> ${p.curtidas.length || ''}`;
} catch (e) { console.error(e); toast('Não deu pra curtir agora.'); }
}

async function apagar(p, card) {
if (!confirm('Apagar este post?')) return;
try {
await deleteDoc(doc(db, 'posts', p.id));
posts = posts.filter((x) => x.id !== p.id);
card.remove();
if (!filtrar(posts).length) renderFeed();
toast('Post apagado.');
} catch (e) { console.error(e); toast('Sem permissão pra apagar este post.'); }
}

async function alternarSeguir(alvoUid) {
const ja = seguindo.has(alvoUid);
try {
await atualizar('usuarios', uid, { seguindo: ja ? arrayRemove(alvoUid) : arrayUnion(alvoUid) });
if (ja) seguindo.delete(alvoUid); else seguindo.add(alvoUid);
el('qtdSeguindo').textContent = seguindo.size ? `(${seguindo.size})` : '';
renderFeed();
toast(ja ? 'Você deixou de seguir.' : 'Agora você segue essa pessoa!');
} catch (e) { console.error(e); toast('Não foi possível atualizar.'); }
}

async function abrirComentarios(p, card) {
const box = card.querySelector('[data-comentarios]');
if (!box.classList.contains('oculto')) { box.classList.add('oculto'); return; }
box.classList.remove('oculto');
box.innerHTML = '<p class="contador">Carregando comentários...</p>';
try {
const snap = await getDocs(query(collection(db, 'posts', p.id, 'comentarios'), orderBy('criadoEm', 'asc'), limit(50)));
const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
box.innerHTML = (lista.map((c) => `
<div class="comentario" data-cid="${c.id}">${avatarHTML(c.autorNome, c.autorFoto, true)}<div class="bolha"><strong>${escapeHTML(c.autorNome || 'Capoeirista')} <small>· ${tempoRelativo(c.criadoEm)}</small></strong>${escapeHTML(c.texto)}</div>${(c.autorUid === uid || p.autorUid === uid || ehModerador()) ? `<button class="post-menu" data-acao="apagar-comentario" aria-label="Apagar comentário" style="width:28px;height:28px;"><i class="fas fa-xmark"></i></button>` : ''}</div>`).join('') || '<p class="contador">Nenhum comentário ainda.</p>') +
`<form class="novo-comentario" data-form-comentario><input type="text" maxlength="400" placeholder="Escreva um comentário..." required><button type="submit" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></form>`;
} catch (e) { console.error(e); box.innerHTML = '<p class="contador">Não foi possível carregar os comentários.</p>'; }
}

async function comentar(p, card, form) {
const input = form.querySelector('input');
const texto = input.value.trim();
if (!texto) return;
form.querySelector('button').disabled = true;
try {
await addDoc(collection(db, 'posts', p.id, 'comentarios'), { autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '', texto, criadoEm: new Date().toISOString() });
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(1) }); p.comentariosCount = (p.comentariosCount || 0) + 1; } catch (e) { /* contador é só cosmético */ }
input.value = '';
card.querySelector('[data-comentarios]').classList.add('oculto');
await abrirComentarios(p, card);
const btn = card.querySelector('[data-acao="comentar"]'); if (btn) btn.innerHTML = `<i class="far fa-comment"></i> ${p.comentariosCount || ''}`;
} catch (e) { console.error(e); toast('Não foi possível comentar.'); }
finally { form.querySelector('button').disabled = false; }
}

async function apagarComentario(p, card, cid) {
try {
await deleteDoc(doc(db, 'posts', p.id, 'comentarios', cid));
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(-1) }); p.comentariosCount = Math.max(0, (p.comentariosCount || 1) - 1); } catch (e) { /* cosmético */ }
card.querySelector('[data-comentarios]').classList.add('oculto');
await abrirComentarios(p, card);
} catch (e) { console.error(e); toast('Sem permissão pra apagar esse comentário.'); }
}

/* ---------------- PUBLICAR ---------------- */
async function publicar() {
const texto = el('texto').value.trim();
if (!texto && !fotoDataUrl) return;
const btn = el('btnPublicar');
btn.disabled = true; btn.textContent = 'Publicando...';
try {
let fotoUrl = null;
if (fotoDataUrl) {
const r = storageRef(storage, `rede/${uid}/${Date.now()}.jpg`);
await uploadString(r, fotoDataUrl, 'data_url');
fotoUrl = await getDownloadURL(r);
}
await addDoc(collection(db, 'posts'), {
autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '',
autorAcademiaId: perfil.academiaId || null, autorAcademiaNome: perfil.academiaNome || '', autorCordao: perfil.cordaoAtual || '',
texto, fotoUrl, criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0,
});
el('texto').value = ''; fotoDataUrl = null; el('preview').classList.add('oculto'); atualizarContador();
feedAtual = 'grupo'; marcarAba();
await carregarFeed(false);
toast('Publicado! Axé.');
} catch (e) {
console.error(e);
toast(/storage|unauthorized|permission/i.test(String(e && (e.code || e.message))) ? 'A foto não pôde subir: confira as regras do Storage (pasta rede/).' : 'Não foi possível publicar agora.');
} finally { btn.disabled = false; btn.textContent = 'Publicar'; }
}
function atualizarContador() {
const n = el('texto').value.length;
el('contador').textContent = `${n}/800`;
el('btnPublicar').disabled = !(n > 0 || fotoDataUrl);
}

/* ---------------- AMIGOS ---------------- */
function renderPessoas(lista) {
const wrap = el('listaPessoas');
if (!lista.length) { wrap.innerHTML = '<p class="contador" style="padding:10px 0;">Ninguém encontrado.</p>'; return; }
wrap.innerHTML = lista.filter((p) => p.id !== uid).map((p) => `
<div class="pessoa">${avatarHTML(p.nome, p.fotoUrl)}<div class="info"><strong>${escapeHTML(p.nome)}</strong><span>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</span></div><button class="btn-seguir ${seguindo.has(p.id) ? 'seguindo' : ''}" data-uid="${escapeHTML(p.id)}">${seguindo.has(p.id) ? 'Seguindo' : 'Seguir'}</button></div>`).join('');
}
async function sugestoes() {
try {
let lista = [];
if (perfil.academiaId) lista = (await getDocs(query(collection(db, 'perfisPublicos'), where('academiaId', '==', perfil.academiaId), limit(20)))).docs.map((d) => ({ id: d.id, ...d.data() }));
if (lista.length < 5) {
const geral = (await getDocs(query(collection(db, 'perfisPublicos'), limit(20)))).docs.map((d) => ({ id: d.id, ...d.data() }));
geral.forEach((g) => { if (!lista.some((x) => x.id === g.id)) lista.push(g); });
}
renderPessoas(lista);
} catch (e) { console.error(e); el('listaPessoas').innerHTML = '<p class="contador">Não foi possível carregar sugestões.</p>'; }
}
let buscaTimer = null;
async function buscarPessoas(termo) {
const q = termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
if (!q) { sugestoes(); return; }
try {
const snap = await getDocs(query(collection(db, 'perfisPublicos'), where('nomeBusca', '>=', q), where('nomeBusca', '<=', q + ''), limit(15)));
renderPessoas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
} catch (e) { console.error(e); }
}

/* ---------------- BOOT ---------------- */
function marcarAba() { document.querySelectorAll('.aba').forEach((b) => b.classList.toggle('ativa', b.dataset.feed === feedAtual)); }

observarSessao(async (user) => {
el('telaCarregando').classList.add('oculto');
if (!user) { el('telaSemSessao').classList.remove('oculto'); return; }
uid = user.uid;
try { perfil = await buscar('usuarios', uid); } catch (e) { perfil = null; }
if (!perfil) { el('telaSemSessao').classList.remove('oculto'); return; }
seguindo = new Set(Array.isArray(perfil.seguindo) ? perfil.seguindo : []);
el('app').classList.remove('oculto');
el('meuAvatar').outerHTML = avatarHTML(perfil.nome, perfil.fotoUrl).replace('class="avatar', 'id="meuAvatar" class="avatar');
el('qtdSeguindo').textContent = seguindo.size ? `(${seguindo.size})` : '';
sincronizarPerfilPublico();
carregarFeed(false);

el('texto').addEventListener('input', atualizarContador);
el('btnFoto').addEventListener('click', () => el('inputFoto').click());
el('inputFoto').addEventListener('change', async (ev) => {
const f = ev.target.files && ev.target.files[0];
if (!f) return;
try { fotoDataUrl = await arquivoParaDataUrlComprimido(f, 1080, 0.72); el('previewImg').src = fotoDataUrl; el('preview').classList.remove('oculto'); atualizarContador(); }
catch (e) { console.error(e); toast('Não consegui ler essa imagem.'); }
ev.target.value = '';
});
el('btnTirarFoto').addEventListener('click', () => { fotoDataUrl = null; el('preview').classList.add('oculto'); atualizarContador(); });
el('btnPublicar').addEventListener('click', publicar);
el('btnMais').addEventListener('click', () => carregarFeed(true));
el('abas').addEventListener('click', (ev) => { const b = ev.target.closest('.aba'); if (!b) return; feedAtual = b.dataset.feed; marcarAba(); renderFeed(); });
el('btnAmigos').addEventListener('click', () => { el('painelAmigos').classList.toggle('oculto'); if (!el('painelAmigos').classList.contains('oculto')) { sugestoes(); el('buscaPessoa').focus(); } });
el('btnFecharAmigos').addEventListener('click', () => el('painelAmigos').classList.add('oculto'));
el('buscaPessoa').addEventListener('input', (ev) => { clearTimeout(buscaTimer); buscaTimer = setTimeout(() => buscarPessoas(ev.target.value), 300); });
el('listaPessoas').addEventListener('click', (ev) => { const b = ev.target.closest('.btn-seguir'); if (!b) return; alternarSeguir(b.dataset.uid).then(() => { const ja = seguindo.has(b.dataset.uid); b.classList.toggle('seguindo', ja); b.textContent = ja ? 'Seguindo' : 'Seguir'; }); });

el('feed').addEventListener('click', (ev) => {
const card = ev.target.closest('.post'); if (!card) return;
const p = posts.find((x) => x.id === card.dataset.id); if (!p) return;
const btn = ev.target.closest('[data-acao]'); if (!btn) return;
const acao = btn.dataset.acao;
if (acao === 'curtir') curtir(p, btn);
else if (acao === 'apagar') apagar(p, card);
else if (acao === 'comentar') abrirComentarios(p, card);
else if (acao === 'seguir') alternarSeguir(btn.dataset.uid);
else if (acao === 'apagar-comentario') { const c = ev.target.closest('.comentario'); if (c) apagarComentario(p, card, c.dataset.cid); }
});
el('feed').addEventListener('submit', (ev) => {
const form = ev.target.closest('[data-form-comentario]'); if (!form) return;
ev.preventDefault();
const card = form.closest('.post'); const p = posts.find((x) => x.id === card.dataset.id);
if (p) comentar(p, card, form);
});
});
