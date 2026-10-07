/* rede.js — Rede Liberdade 2.0 (rede social interna do grupo).

Princípio: NADA aqui é inventado. Todo número, foto, cordão, conquista e
presença vem do Firestore/Storage e só aparece quando existe de verdade —
senão mostra "—" ou um texto honesto.

Coleções (custo baixo: cobra-se por documento lido/escrito, não por tamanho):
- perfisPublicos/{uid}   cartão público que a própria pessoa grava ao abrir a
                         rede (nome, foto, capa, cordão, núcleo, bio, apelido,
                         funções, privado, menor, usoImagemOk, historicoGraduacoes,
                         resumoPresencas, seguidores[], pedidosSeguir[], seguindoCount).
- posts/{id}             texto (≤800), midias[{url,tipo}], tipo post|aviso,
                         melhorMomento, nucleoId/Nome, marcados[], visibilidade,
                         curtidas[], comentariosCount, revisao (pendente|ok).
- posts/{id}/comentarios/{cid}
- stories/{id}           foto+texto por 24h (expiraEm), pessoal ou "como núcleo".
- conversas/{id}         direta (2 participantes, id = uids ordenados) ou grupo
                         do núcleo (nucleoId); mensagens na subcoleção.
- eventos/{id}/confirmados/{uid}   "eu vou" num evento.
- denuncias/{id}         denúncia de post (lida pelos moderadores).
- usuarios/{uid}         (privado) seguindo[], salvos[] — só o dono lê.
- notificacoes/{uid}/itens  central de notificações (escrita pelo servidor).
O cartão público (cordão, presenças, brasões…) é calculado pelo SERVIDOR
(functions/src/perfil.js); aqui a pessoa só edita bio, capa e privacidade.
Posts: a rede só lê os com publico == true (+ os próprios) — post ocultado
ou em revisão não sai nem pela API.
Leituras por abertura do feed: stories (1 consulta) + avisos (1) + 20 posts. */
import {
db, storage, observarSessao, buscar, atualizar, listar, contar, presencasDoUsuario, souFundador, arquivoParaDataUrlComprimido,
collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter,
arrayUnion, arrayRemove, increment, onSnapshot, storageRef, uploadString, uploadBytes, getDownloadURL, salvarFotoPerfil,
consultaDaEscola, comMinhaEscola, ondeEscola, talvezComEscola,
} from './firebase.js';
import { escapeHTML } from './shared.js';
import { ESCOLA, CORDOES_ADULTO, CORDOES_KIDS, ORDEM_CORDOES, linkMapa as linkMapaEscola, proximoCordao as proximoCordaoEscola } from './escola.js';
import { termosOfensivos, MOTIVOS_DENUNCIA } from './moderacao.js';
import { iniciarExperiencia, abrirAcessibilidade, instalar, estaInstalado, tutorial, pedirAceiteSeNecessario } from './experiencia.js';
import { ligarContador, listar as listarNotificacoes, marcarTodasLidas, itemHTML as notificacaoHTML, CSS_NOTIF, ativarPush, desativarPush, estadoPush, ouvirPushComAppAberto } from './notificacoes.js';
import { pedirExclusaoDaConta } from './lgpd.js';
import { apresentacaoDe, tocarApresentacao, gerenciarApresentacao, abrirTrocaSenha, definirAutor, podeTerApresentacao } from './conta.js?v=20261006';
import { BRASOES, SERIES, avaliar as avaliarBrasoes, consolidar as consolidarBrasoes, resumirPresencas, urlThumb, urlPng, urlGlb, textoMetrica, porId as brasaoPorId } from './brasoes.js?v=20261006';

/* ===================== CONSTANTES ===================== */
// Cordões, cores e critérios ficam em escola.js (white-label).
const PAGINA = 20;
const LIMITE_TEXTO = 800;
const MAX_MIDIAS = 4;
const IMG_MAX_DIM = 1280;      // maior lado da foto de post
const IMG_ALVO_KB = 350;       // tamanho alvo por foto — preserva o Storage
const STORY_MAX_DIM = 1080;
const STORY_ALVO_KB = 300;
const VIDEO_MAX_MB = 12;       // depois de comprimido (limite do Storage)
const VIDEO_BRUTO_MAX_MB = 80; // o que dá pra escolher da galeria antes de comprimir
const VIDEO_MAX_SEG = 20;
const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.esm.js';
const MODELOS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
const AVATAR_CORES = ['#002D72', '#0B5C52', '#8E44AD', '#B9770E', '#1B5FC2', '#00794F'];

/* ===================== ESTADO ===================== */
const el = (id) => document.getElementById(id);
let uid = null;
let perfil = null;          // usuarios/{uid} (privado)
let meuPub = null;          // perfisPublicos/{uid}
let seguindo = new Set();
let salvos = new Set();
let nucleos = [];
const pubCache = new Map(); // uid → perfil público
let posts = [];             // feed carregado
const postsAvulsos = new Map(); // posts de outras telas (núcleo, moderação, álbum) — não entram no feed
const postPorId = (id) => posts.find((x) => x.id === id) || postsAvulsos.get(id) || null;
const guardarAvulsos = (lista) => lista.forEach((p) => { if (!posts.some((x) => x.id === p.id)) postsAvulsos.set(p.id, p); });
let ultimoDoc = null;
let avisos = [];
let stories = [];
let preCargaFeed = null;      // feed já baixando desde o login (ver BOOT)
let filtroFeed = 'rede';
let carregando = false;
let toastTimer = null;
let chatUnsub = null;
let rotaAtual = '';
const storiesVistos = new Set(JSON.parse(localStorage.getItem('rede.storiesVistos') || '[]'));

/* ===================== UTILIDADES ===================== */
function toast(msg) {
const t = el('toast'); t.textContent = msg; t.classList.add('on');
clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
}
// Diz ONDE a permissão faltou: Storage (foto) ou Firestore (regras do banco).
function explicarErro(e, oque) {
const code = String((e && e.code) || ''); const msg = String((e && e.message) || '');
if (code.startsWith('storage/')) return `A foto não subiu (${code.replace('storage/', '')}): confira as regras do Storage, pasta rede/.`;
if (code === 'permission-denied' || /insufficient permissions/i.test(msg)) return `O banco recusou ${oque} (permission-denied): as regras novas do Firestore ainda não estão publicadas.`;
return `Não foi possível publicar ${oque} agora${code ? ` (${code})` : ''}.`;
}
const iniciais = (nome) => String(nome || '?').replace(/^(mestre|prof\.?|professora?|instrutora?)\s+/i, '').trim().split(/\s+/).slice(0, 2).map((p) => (p[0] || '').toUpperCase()).join('') || '?';
const corAvatar = (id) => AVATAR_CORES[[...String(id || '')].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_CORES.length];
function avatarHTML(pessoa, classe = '') {
const foto = pessoa && pessoa.fotoUrl && !/placeholder/i.test(pessoa.fotoUrl) ? pessoa.fotoUrl : '';
return foto ? `<img class="avatar ${classe}" src="${escapeHTML(foto)}" alt="" loading="lazy">`
: `<span class="avatar ${classe}" style="background:${corAvatar(pessoa && (pessoa.id || pessoa.uid || pessoa.nome))}">${escapeHTML(iniciais(pessoa && pessoa.nome))}</span>`;
}
function coresCordao(pessoa) {
const lista = pessoa && pessoa.menor && (Number(pessoa.idade) || 0) > 0 && (Number(pessoa.idade) || 0) < 12 ? CORDOES_KIDS : CORDOES_ADULTO;
const item = lista.find((c) => c.nome === (pessoa && pessoa.cordaoAtual || 'Iniciante')) || lista[0];
return item.cor;
}
function anelHTML(pessoa, classeAvatar = '') {
const c = coresCordao(pessoa);
return `<span class="anel" style="--c1:${c[0]};--c2:${c[1]};--c3:${c[2]}">${avatarHTML(pessoa, classeAvatar)}</span>`;
}
function tempoRelativo(iso) {
const d = new Date(iso); const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
if (s < 60) return 'agora'; if (s < 3600) return `${Math.floor(s / 60)} min`; if (s < 86400) return `${Math.floor(s / 3600)} h`;
if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
const nomeCurtoNucleo = (nome) => String(nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim();
const hoje0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dataDe = (v) => (v && v.toDate ? v.toDate() : new Date(v));
const fmtKB = (bytes) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
const bytesDataUrl = (d) => Math.round((d.length - d.indexOf(',') - 1) * 3 / 4);
const papeis = () => (perfil && perfil.papeis) || [];
const ehAdmin = () => papeis().includes('admin');
const ehModerador = () => ehAdmin() || souFundador(perfil);
const ehGestor = () => papeis().includes('mestre') && !!(perfil && perfil.academiaGerenciadaId);
const meuNucleoGerenciado = () => (perfil && perfil.academiaGerenciadaId) || null;
const gerencia = (academiaId) => !!academiaId && meuNucleoGerenciado() === academiaId;
const podeModerar = (p) => p.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId) || gerencia(p.nucleoId);
const souMenor = () => perfil && Number(perfil.idade) > 0 && Number(perfil.idade) < 18;
const podeVerPerfil = (pub) => !pub.privado || pub.id === uid || ehModerador() || gerencia(pub.academiaId) || (pub.seguidores || []).includes(uid);

const proximoCordao = (pessoa) => proximoCordaoEscola(pessoa && pessoa.menor ? pessoa : { ...(pessoa || {}), idade: null });
// Texto com #hashtags e @menções clicáveis (sempre escapado antes).
// mencoes: [{uid, nome, token}] gravados junto do texto — o @token vira link pro perfil.
function formatarTexto(txt, mencoes = []) {
const porToken = new Map((mencoes || []).filter((m) => m && m.token && m.uid).map((m) => [String(m.token).toLowerCase(), m.uid]));
return escapeHTML(txt || '')
.replace(/(^|\s)#([\p{L}\p{N}_]{2,40})/gu, (m, pre, tag) => `${pre}<button type="button" class="hash" data-hash="${escapeHTML(tag.toLowerCase())}">#${tag}</button>`)
.replace(/(^|\s)@([\p{L}\p{N}_.]{2,40})/gu, (m, pre, nome) => { const alvo = porToken.get(nome.toLowerCase()); return alvo ? `${pre}<button type="button" class="mencao" data-perfil="${escapeHTML(alvo)}">@${nome}</button>` : `${pre}<span class="mencao">@${nome}</span>`; });
}
const extrairHashtags = (txt) => Array.from(new Set((String(txt || '').match(/#[\p{L}\p{N}_]{2,40}/gu) || []).map((h) => h.slice(1).toLowerCase())));

async function pubDe(alvoUid) {
if (!alvoUid) return null;
if (pubCache.has(alvoUid)) return pubCache.get(alvoUid);
try { const s = await getDoc(doc(db, 'perfisPublicos', alvoUid)); const v = s.exists() ? { id: s.id, ...s.data() } : null; pubCache.set(alvoUid, v); return v; }
catch (e) { return null; }
}
async function pubsDeNucleo(academiaId, max = 60) {
const snap = await getDocs(query(collection(db, 'perfisPublicos'), ...(await ondeEscola()), where('academiaId', '==', academiaId), limit(max)));
const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })); lista.forEach((p) => pubCache.set(p.id, p)); return lista;
}
const nucleoDe = (id) => nucleos.find((n) => n.id === id) || null;
// Apresentação em vídeo da pessoa (apresentacoes/{uid}, ver conta.js).
// A foto do perfil continua a clássica; o vídeo só toca quando alguém toca no botão.
function apresentarPessoa(pessoa, ap, alvo) {
const gerenciado = pessoa && pessoa.academiaGerenciadaId ? nucleoDe(pessoa.academiaGerenciadaId) : null;
return tocarApresentacao(pessoa, ap, { alvo: alvo || null, comSom: true, direto: rotuloDiretoDe(pessoa), nucleoNome: gerenciado ? gerenciado.nome : '' });
}
// Endereço → rotas (Google Maps; no celular o sistema oferece Maps/Waze).
const linkMapa = linkMapaEscola;
function rotuloDiretoDe(pub) {
if (!pub) return '';
if (pub.fundador) return ESCOLA.rotuloLinhagem;
const n = nucleoDe(pub.academiaId);
return n ? `Direto ${nomeCurtoNucleo(n.nome)}` : (pub.academiaNome ? `Direto ${nomeCurtoNucleo(pub.academiaNome)}` : '');
}

/* ===================== COMPRESSÃO ADAPTATIVA (preserva o Storage) ===================== */
// Redimensiona e vai baixando a qualidade até caber no alvo. Devolve o dataURL
// final e os tamanhos pra mostrar ao usuário ("4,2 MB → 290 KB").
async function comprimirAdaptativo(file, maxDim, alvoKB) {
const bruto = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('leitura')); r.readAsDataURL(file); });
const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('imagem')); i.src = bruto; });
let dim = maxDim; let melhor = null;
for (let rodada = 0; rodada < 3 && !melhor; rodada++) {
const escala = Math.min(1, dim / Math.max(img.width, img.height));
const w = Math.max(1, Math.round(img.width * escala)); const h = Math.max(1, Math.round(img.height * escala));
const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
canvas.getContext('2d').drawImage(img, 0, 0, w, h);
for (let q = 0.85; q >= 0.5; q -= 0.07) {
const d = canvas.toDataURL('image/jpeg', q);
if (bytesDataUrl(d) <= alvoKB * 1024) { melhor = { dataUrl: d, w, h }; break; }
if (q - 0.07 < 0.5 && rodada === 2) melhor = { dataUrl: d, w, h }; // último recurso: menor qualidade no menor tamanho
}
dim = Math.round(dim * 0.8);
}
return { ...melhor, original: file.size, final: bytesDataUrl(melhor.dataUrl) };
}
function duracaoVideo(file) {
return new Promise((res) => {
const v = document.createElement('video'); v.preload = 'metadata';
v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res({ dur: v.duration, w: v.videoWidth, h: v.videoHeight }); };
v.onerror = () => res({ dur: NaN }); v.src = URL.createObjectURL(file);
});
}
// Vídeo: recomprime no próprio celular (canvas + MediaRecorder, até 960 px e
// ~1,6 Mbps) — um vídeo de 25 MB da câmera costuma virar 3–4 MB. Se o
// navegador não souber fazer isso, devolve null e sobe o original.
async function comprimirVideo(file, aoProgresso) {
if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
const tipo = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
if (!tipo) return null;
const url = URL.createObjectURL(file);
const v = document.createElement('video'); v.src = url; v.playsInline = true; v.preload = 'auto';
try {
await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error('video')); });
const escala = Math.min(1, 960 / Math.max(v.videoWidth || 960, v.videoHeight || 960));
const w = Math.max(2, Math.round((v.videoWidth * escala) / 2) * 2); const h = Math.max(2, Math.round((v.videoHeight * escala) / 2) * 2);
const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
const stream = canvas.captureStream(30);
let audioCtx = null;
try { // o som vai pro arquivo sem tocar no alto-falante
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const fonte = audioCtx.createMediaElementSource(v); const destino = audioCtx.createMediaStreamDestination();
fonte.connect(destino); destino.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
} catch (e) { v.muted = true; }
const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 1600000, audioBitsPerSecond: 96000 });
const partes = []; rec.ondataavailable = (e) => { if (e.data && e.data.size) partes.push(e.data); };
const parou = new Promise((res) => { rec.onstop = res; });
const desenhar = () => { if (v.ended || v.paused) return; ctx.drawImage(v, 0, 0, w, h); if (aoProgresso && v.duration) aoProgresso(Math.min(99, Math.round((v.currentTime / v.duration) * 100))); requestAnimationFrame(desenhar); };
rec.start(250); await v.play(); desenhar();
await new Promise((res) => { v.onended = res; });
rec.stop(); await parou;
if (audioCtx) audioCtx.close().catch(() => {});
const blob = new Blob(partes, { type: tipo.split(';')[0] });
if (!blob.size || blob.size >= file.size) return null;
return new File([blob], `video.${tipo.includes('mp4') ? 'mp4' : 'webm'}`, { type: tipo.split(';')[0] });
} catch (e) { console.warn('compressão de vídeo', e); return null; }
finally { URL.revokeObjectURL(url); }
}
// Capa do vídeo (1º quadro) — o feed mostra a capa e só baixa o vídeo no play.
async function capaDoVideo(file) {
const url = URL.createObjectURL(file);
try {
const v = document.createElement('video'); v.src = url; v.muted = true; v.playsInline = true; v.preload = 'auto';
await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; });
v.currentTime = Math.min(0.5, (v.duration || 1) / 2);
await new Promise((res) => { v.onseeked = res; setTimeout(res, 1500); });
const escala = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
const c = document.createElement('canvas'); c.width = Math.round(v.videoWidth * escala); c.height = Math.round(v.videoHeight * escala);
c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
return c.toDataURL('image/jpeg', 0.72);
} catch (e) { return null; } finally { URL.revokeObjectURL(url); }
}
async function subirDataUrl(caminho, dataUrl) { const r = storageRef(storage, caminho); await uploadString(r, dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' }); return getDownloadURL(r); }

/* ===================== CARTÃO PÚBLICO (calculado no servidor) ===================== */
// O servidor (Cloud Functions) recalcula o cartão quando algo muda: cadastro,
// presença, post, curtida, concessão de brasão. Aqui só:
//  - pedimos um recálculo se o cartão não existe ou está velho (> 12h);
//  - ouvimos o cartão ao vivo e festejamos brasão novo uma vez por aparelho.
let configBrasoes = {};
let pararCartao = null;
const CHAVE_VISTOS = () => `rede.brasoesVistos.${uid}`;
function verificarBrasoesNovos() {
if (!meuPub || !meuPub.brasoes) return;
const atuais = Object.keys(meuPub.brasoes);
let vistos = null; try { vistos = JSON.parse(localStorage.getItem(CHAVE_VISTOS()) || 'null'); } catch (e) { vistos = null; }
try { localStorage.setItem(CHAVE_VISTOS(), JSON.stringify(atuais)); } catch (e) { /* ok */ }
if (!Array.isArray(vistos)) return; // 1ª vez neste aparelho: não festeja tudo de uma vez
const novos = atuais.filter((id) => !vistos.includes(id));
if (novos.length) setTimeout(() => celebrarBrasoes(novos), 600);
}
async function sincronizarPerfilPublico() {
pubCache.delete(uid); meuPub = await pubDe(uid);
const velho = !meuPub || !meuPub.sincronizadoEm || (Date.now() - new Date(meuPub.sincronizadoEm).getTime()) > 12 * 3600 * 1000;
if (velho) { try { await atualizar('usuarios', uid, { sincronizarEm: new Date().toISOString() }); } catch (e) { /* sem permissão: segue com o que tem */ } }
if (meuPub && (meuPub.seguindoCount || 0) !== seguindo.size) { try { await updateDoc(doc(db, 'perfisPublicos', uid), { seguindoCount: seguindo.size }); meuPub.seguindoCount = seguindo.size; } catch (e) { /* ok */ } }
verificarBrasoesNovos();
if (!pararCartao) {
pararCartao = onSnapshot(doc(db, 'perfisPublicos', uid), (sn) => {
if (!sn.exists()) return;
const eraNovo = !meuPub;
meuPub = { id: uid, ...sn.data() }; pubCache.set(uid, meuPub); verificarBrasoesNovos();
// O servidor acabou de criar o cartão: se a pessoa estava esperando no próprio perfil, mostra.
if (eraNovo && ['perfil', 'brasoes'].includes(rotaAtual) && !(location.hash.split('/')[1])) roteia();
}, () => { /* sem leitura ao vivo */ });
}
}

/* ===================== ROTEADOR ===================== */
const ROTAS = { feed: renderFeed, explorar: renderExplorar, publicar: renderPublicar, mensagens: renderMensagens, perfil: renderPerfil, nucleo: renderNucleo, moderacao: renderModeracao, tag: renderTag, brasoes: renderBrasoes, agenda: renderAgenda, album: renderAlbum, notificacoes: renderNotificacoes, ajustes: renderAjustes, post: renderPostUnico };
function ir(rota) { location.hash = '#' + rota; }
async function roteia() {
const h = (location.hash || '#feed').slice(1); const [nome, param] = h.split('/');
if (chatUnsub) { chatUnsub(); chatUnsub = null; }
rotaAtual = nome;
document.querySelectorAll('.nav-inferior button').forEach((b) => b.classList.toggle('ativo', b.dataset.rota === nome || (nome === 'perfil' && !param && b.dataset.rota === 'perfil')));
el('tituloTopo').textContent = 'Rede Liberdade';
const vista = el('vista'); vista.innerHTML = '<div class="tela-centro" style="min-height:40vh"><div class="spinner"></div></div>'; vista.dataset.pubBrasoes = nome === 'perfil' ? (param || uid) : '';
try { await (ROTAS[nome] || renderFeed)(param, vista); }
catch (e) { console.error(e); vista.innerHTML = `<div class="vazio"><i class="fas fa-triangle-exclamation"></i><b>Não deu pra abrir esta tela</b>${escapeHTML(e && e.message || '')}<br><small>Se for a primeira vez, confira se as regras novas do Firestore já foram publicadas.</small></div>`; }
window.scrollTo({ top: 0 });
}

/* ===================== STORIES ===================== */
async function carregarStories() {
try {
const q = await consultaDaEscola('stories', where('expiraEm', '>', new Date().toISOString()), orderBy('expiraEm', 'asc'), limit(120));
const snap = q ? await getDocs(q) : { docs: [] };
stories = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.midiaUrl);
} catch (e) { console.warn('stories', e); stories = []; }
}
function gruposStories() {
const grupos = new Map();
stories.forEach((s) => {
const chave = s.comoNucleo ? `n:${s.nucleoId}` : `u:${s.autorUid}`;
if (!grupos.has(chave)) grupos.set(chave, { chave, nucleo: !!s.comoNucleo, id: s.comoNucleo ? s.nucleoId : s.autorUid, nome: s.comoNucleo ? (s.nucleoNome || 'Núcleo') : s.autorNome, fotoUrl: s.comoNucleo ? '' : s.autorFoto, cordaoAtual: s.autorCordao, itens: [] });
grupos.get(chave).itens.push(s);
});
const lista = Array.from(grupos.values()).map((g) => ({ ...g, visto: g.itens.every((s) => storiesVistos.has(s.id)) }));
lista.sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0) || (a.visto - b.visto) || (a.nucleo ? -1 : 1));
return lista;
}
// Stories em cards verticais (3:4): o 1º é "Seu story" (fundo branco, avatar
// central com "+" azul); os demais mostram a própria mídia do story de fundo,
// com o mini-avatar no canto (anel colorido = ainda não visto).
function storiesHTML() {
const grupos = gruposStories();
const eu = { ...(meuPub || {}), ...(perfil || {}), id: uid };
const card = (g, k) => {
const capa = (g.itens.find((s) => !storiesVistos.has(s.id)) || g.itens[0] || {}).midiaUrl || '';
const nome = g.id === uid ? 'Você' : (g.nucleo ? nomeCurtoNucleo(g.nome) : String(g.nome || '').split(' ')[0]);
const mini = g.nucleo ? '<span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span>' : avatarHTML({ ...g, nome: g.nome });
return `<button type="button" class="story-card ${g.visto ? 'visto' : ''} ${g.nucleo ? 'nucleo' : ''}" data-story="${escapeHTML(g.chave)}" style="--i:${k + 1}" aria-label="Story de ${escapeHTML(nome)}${g.visto ? ' (visto)' : ''}">
${capa ? `<img class="sc-fundo" src="${escapeHTML(capa)}" alt="" loading="lazy" draggable="false">` : ''}<span class="sc-sombra"></span>
<span class="sc-mini">${mini}</span><span class="sc-nome">${escapeHTML(nome)}</span></button>`;
};
return `<div class="stories" role="list">
<button type="button" class="story-card novo" data-story-novo style="--i:0" aria-label="Publicar seu story"><span class="sc-av">${avatarHTML(eu)}<i class="sc-mais" aria-hidden="true">+</i></span><span class="sc-nome">Seu story</span></button>
${grupos.map(card).join('')}
</div>`;
}

let storyAtual = { itens: [], i: 0, timer: null };
function abrirStories(chave) {
const g = gruposStories().find((x) => x.chave === chave); if (!g) return;
storyAtual = { itens: g.itens.slice().sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)), i: 0, timer: null, grupo: g };
el('storyViewer').classList.remove('oculto'); mostrarStory();
}
function mostrarStory() {
const { itens, i, grupo } = storyAtual; const s = itens[i]; if (!s) { fecharStories(); return; }
storiesVistos.add(s.id); localStorage.setItem('rede.storiesVistos', JSON.stringify(Array.from(storiesVistos).slice(-300)));
el('storyProgresso').innerHTML = itens.map((x, k) => `<i class="${k < i ? 'visto' : k === i ? 'ativo' : ''}"></i>`).join('');
el('storyAutor').innerHTML = `<div style="display:flex;align-items:center;gap:10px">${grupo.nucleo ? '<span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span>' : avatarHTML({ nome: s.autorNome, fotoUrl: s.autorFoto, id: s.autorUid })}<div><b>${escapeHTML(grupo.nucleo ? s.nucleoNome : s.autorNome)}</b><small>${grupo.nucleo ? `por ${escapeHTML(s.autorNome)} · ` : ''}${tempoRelativo(s.criadoEm)}</small></div></div>`;
el('storyMidia').innerHTML = `<img src="${escapeHTML(s.midiaUrl)}" alt="">`;
el('storyTexto').textContent = s.texto || '';
el('storyRodape').innerHTML = (s.autorUid === uid || ehModerador() || gerencia(s.nucleoId)) ? `<button type="button" class="btn-perigo" data-apagar-story="${s.id}"><i class="fas fa-trash-can"></i> Apagar</button>` : `<button type="button" class="btn-claro" data-perfil-story="${escapeHTML(s.autorUid)}"><i class="far fa-user"></i> Ver perfil</button>`;
clearTimeout(storyAtual.timer); storyAtual.timer = setTimeout(() => proximoStory(1), 6000);
}
function proximoStory(dir) { storyAtual.i += dir; if (storyAtual.i < 0) storyAtual.i = 0; if (storyAtual.i >= storyAtual.itens.length) { fecharStories(); return; } mostrarStory(); }
function fecharStories() { clearTimeout(storyAtual.timer); el('storyViewer').classList.add('oculto'); if (rotaAtual === 'feed') renderFeed(null, el('vista'), true); }
async function publicarStory(file) {
const comoNucleo = ehGestor() && confirm(`Publicar este story como o núcleo "${nomeCurtoNucleo((nucleoDe(meuNucleoGerenciado()) || {}).nome || 'meu núcleo')}"?\n(OK = como núcleo · Cancelar = no meu nome)`);
const texto = prompt('Legenda do story (opcional):', '') || '';
if (texto && barrarOfensa(texto)) return;
toast('Comprimindo a foto…');
try {
const img = await comprimirAdaptativo(file, STORY_MAX_DIM, STORY_ALVO_KB);
const url = await subirDataUrl(`rede/${uid}/story_${Date.now()}.jpg`, img.dataUrl);
const agora = new Date();
await addDoc(collection(db, 'stories'), await comMinhaEscola({
autorUid: uid, autorNome: perfil.nome || '', autorFoto: /^https:/.test(perfil.fotoUrl || '') ? perfil.fotoUrl : '', autorCordao: perfil.cordaoAtual || '',
nucleoId: comoNucleo ? meuNucleoGerenciado() : (perfil.academiaId || null), nucleoNome: comoNucleo ? (nucleoDe(meuNucleoGerenciado()) || {}).nome || '' : (perfil.academiaNome || ''),
comoNucleo, midiaUrl: url, texto: texto.slice(0, 200), criadoEm: agora.toISOString(), expiraEm: new Date(agora.getTime() + 24 * 3600 * 1000).toISOString(),
}));
toast(`Story publicado (${fmtKB(img.original)} → ${fmtKB(img.final)}). Some em 24h.`);
await carregarStories(); if (rotaAtual === 'feed') renderFeed(null, el('vista'), true);
} catch (e) { console.error(e); toast(explicarErro(e, 'o story')); }
}

/* ===================== FEED ===================== */
function midiasDe(p) {
if (Array.isArray(p.midias) && p.midias.length) return p.midias;
return p.fotoUrl ? [{ url: p.fotoUrl, tipo: 'imagem' }] : [];
}
function midiasHTML(p) {
const m = midiasDe(p); if (!m.length) return '';
const local = p.nucleoNome ? `<span class="tag-local"><i class="fas fa-location-dot"></i> ${escapeHTML(nomeCurtoNucleo(p.nucleoNome))}</span>` : '';
// 3 ou mais fotos (sem vídeo): "cartas em leque" — uma no centro e duas ao
// fundo, inclinadas. Toque na lateral (ou arraste) para girar; toque na do
// centro para ampliar. Vídeo ou 1–2 fotos seguem no carrossel de sempre.
if (m.length >= 3 && m.every((x) => x.tipo !== 'video')) {
return `<div class="leque" data-leque data-k="0" data-n="${m.length}" aria-roledescription="galeria" aria-label="${m.length} fotos">
${m.map((x, i) => `<button type="button" class="carta" data-carta="${i}" data-pos="${posCarta(i, 0, m.length)}" style="--o:${i}" aria-label="Foto ${i + 1} de ${m.length}"><img src="${escapeHTML(x.url)}" alt="${escapeHTML(altDe(p, i))}" loading="lazy" draggable="false"></button>`).join('')}
<span class="cont">1/${m.length}</span>${local}
</div>`;
}
return `<div class="midias" data-midias>
<div class="faixa">${m.map((x, i) => x.tipo === 'video' ? `<video src="${escapeHTML(x.url)}" ${x.posterUrl ? `poster="${escapeHTML(x.posterUrl)}"` : ''} controls playsinline preload="${x.posterUrl ? 'none' : 'metadata'}"></video>` : `<img src="${escapeHTML(x.url)}" alt="${escapeHTML(altDe(p, i))}" loading="lazy" data-ver="${i}">`).join('')}</div>
${m.length > 1 ? `<span class="cont">1/${m.length}</span><div class="pontos">${m.map((x, i) => `<i class="${i ? '' : 'ativo'}"></i>`).join('')}</div>` : ''}${local}
</div>`;
}
// Texto alternativo das fotos (leitor de tela): autor, legenda e quem está marcado.
function altDe(p, i) {
const marc = (p.marcados || []).map((x) => x.nome).filter(Boolean);
return `Foto ${i + 1} de ${p.autorNome || 'um atleta'}${p.texto ? `: ${String(p.texto).slice(0, 80)}` : ''}${marc.length ? ` — com ${marc.slice(0, 3).join(', ')}` : ''}`;
}
function posCarta(i, k, n) { const r = (i - k + n) % n; return r === 0 ? 'c' : (r === 1 ? 'd' : (r === n - 1 ? 'e' : 'x')); }
function girarLeque(leque, dir) {
const n = Number(leque.dataset.n) || 0; if (n < 2) return;
const k = ((Number(leque.dataset.k) || 0) + dir + n) % n; leque.dataset.k = k;
leque.querySelectorAll('[data-carta]').forEach((c) => { c.dataset.pos = posCarta(Number(c.dataset.carta), k, n); c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
const cont = leque.querySelector('.cont'); if (cont) cont.textContent = `${k + 1}/${n}`;
}
// Interações do leque ficam no documento (feed, perfil, núcleo e post aberto).
(function ligarLeques() {
const finoMouse = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
let arrasto = null;
document.addEventListener('click', (ev) => {
const carta = ev.target.closest('[data-carta]'); if (!carta) return;
const leque = carta.closest('[data-leque]'); if (!leque) return;
if (arrasto && arrasto.moveu) { arrasto = null; return; }
const pos = carta.dataset.pos;
if (pos === 'c') { const img = carta.querySelector('img'); if (img) abrirMidia(`<img src="${escapeHTML(img.src)}" alt="">`); }
else girarLeque(leque, pos === 'e' ? -1 : 1);
});
document.addEventListener('keydown', (ev) => {
const leque = ev.target.closest && ev.target.closest('[data-leque]'); if (!leque) return;
if (ev.key === 'ArrowRight') { ev.preventDefault(); girarLeque(leque, 1); leque.querySelector('[data-pos="c"]')?.focus({ preventScroll: true }); }
if (ev.key === 'ArrowLeft') { ev.preventDefault(); girarLeque(leque, -1); leque.querySelector('[data-pos="c"]')?.focus({ preventScroll: true }); }
});
document.addEventListener('pointerdown', (ev) => { const leque = ev.target.closest('[data-leque]'); arrasto = leque ? { leque, x: ev.clientX, y: ev.clientY, moveu: false } : null; });
document.addEventListener('pointerup', (ev) => {
if (!arrasto) return; const dx = ev.clientX - arrasto.x; const dy = ev.clientY - arrasto.y;
if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { arrasto.moveu = true; girarLeque(arrasto.leque, dx < 0 ? 1 : -1); } else arrasto = null;
});
if (!finoMouse) return;
// Mouse: a carta do centro inclina em 3D seguindo o cursor, com brilho.
document.addEventListener('pointermove', (ev) => {
const leque = ev.target.closest('[data-leque]'); if (!leque) return;
const c = leque.querySelector('[data-pos="c"]'); if (!c) return;
const r = c.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width; const py = (ev.clientY - r.top) / r.height;
if (px < -0.2 || px > 1.2 || py < -0.2 || py > 1.2) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); return; }
c.style.setProperty('--ry', `${((px - 0.5) * 14).toFixed(2)}deg`); c.style.setProperty('--rx', `${((0.5 - py) * 12).toFixed(2)}deg`);
c.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`); c.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
});
document.addEventListener('pointerout', (ev) => {
const leque = ev.target.closest && ev.target.closest('[data-leque]'); if (!leque || leque.contains(ev.relatedTarget)) return;
leque.querySelectorAll('[data-carta]').forEach((c) => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); });
});
})();
function postHTML(p) {
const curtido = (p.curtidas || []).includes(uid); const salvo = salvos.has(p.id);
const autor = { id: p.autorUid, nome: p.autorNome, fotoUrl: p.autorFoto, cordaoAtual: p.autorCordao };
const tipo = p.tipo === 'aviso' ? 'aviso' : (p.melhorMomento ? 'momento' : '');
const meta = [p.autorCordao ? `<span class="pill teal">${escapeHTML(p.autorCordao)}</span>` : '', p.autorAcademiaNome ? `<button type="button" class="pill neutra" data-nucleo="${escapeHTML(p.autorAcademiaId || '')}">${escapeHTML(nomeCurtoNucleo(p.autorAcademiaNome))}</button>` : '', `<span>${tempoRelativo(p.criadoEm)}</span>`, p.visibilidade === 'nucleo' ? '<span class="pill neutra"><i class="fas fa-lock"></i> só o núcleo</span>' : ''].filter(Boolean).join('');
const marcados = (p.marcados || []).length ? `<div class="marcados"><i class="fas fa-user-tag"></i> com ${(p.marcados || []).map((m) => `<button type="button" data-perfil="${escapeHTML(m.uid)}">${escapeHTML(m.nome)}</button>`).join(', ')}</div>` : '';
const curtidores = (p.curtidas || []).length ? `<div class="curtidas-linha"><span class="pilha">${(p.curtidas || []).slice(0, 3).map((u) => avatarHTML(pubCache.get(u) || { id: u, nome: (pubCache.get(u) || {}).nome || '·' })).join('')}</span> ${(p.curtidas || []).length} ${(p.curtidas || []).length === 1 ? 'curtida' : 'curtidas'}</div>` : '';
const revisao = p.revisao === 'pendente' && (ehModerador() || gerencia(p.autorAcademiaId) || gerencia(p.nucleoId)) ? `<div class="revisao"><i class="fas fa-shield-halved"></i> Post aguardando revisão do responsável do núcleo${p.autorMenor ? ' (autor menor de idade)' : ''}.<button type="button" class="btn-claro" data-acao="revisar-ok">Aprovar</button></div>` : '';
return `<article class="card post ${tipo}" data-id="${p.id}">
${tipo === 'momento' ? `<div class="selo-momento"><i class="fas fa-star"></i> Melhor momento${p.nucleoNome ? ` · ${escapeHTML(nomeCurtoNucleo(p.nucleoNome))}` : ''}</div>` : ''}
${tipo === 'aviso' ? `<div class="selo-aviso"><i class="fas fa-bullhorn"></i> Aviso do núcleo${p.nucleoNome ? ` · ${escapeHTML(nomeCurtoNucleo(p.nucleoNome))}` : ''}</div>` : ''}
${p.comoNucleo && p.nucleoId ? `<div class="post-topo"><button type="button" class="anel-btn" data-nucleo="${escapeHTML(p.nucleoId)}" style="background:none;border:0;padding:0" aria-label="Abrir o núcleo"><span class="anel anel-nucleo"><span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span></span></button>
<div class="quem"><button type="button" class="nome" data-nucleo="${escapeHTML(p.nucleoId)}">${escapeHTML(p.nucleoNome || 'Núcleo')} <span class="pill navy" style="font-size:.56rem;vertical-align:middle"><i class="fas fa-people-group"></i> núcleo</span></button><div class="meta"><span>por <button type="button" class="link-autor" data-perfil="${escapeHTML(p.autorUid)}">${escapeHTML(String(p.autorNome || '').split(' ').slice(0, 2).join(' '))}</button></span><span>${tempoRelativo(p.criadoEm)}</span></div></div>` : `<div class="post-topo"><button type="button" class="anel-btn" data-perfil="${escapeHTML(p.autorUid)}" style="background:none;border:0;padding:0">${anelHTML(autor)}</button>
<div class="quem"><button type="button" class="nome" data-perfil="${escapeHTML(p.autorUid)}">${escapeHTML(p.autorNome || 'Capoeirista')}</button><div class="meta">${meta}</div></div>`}
<button type="button" class="post-menu" data-acao="menu" aria-label="Opções"><i class="fas fa-ellipsis"></i></button></div>
${revisao}
${p.oculto ? `<div class="revisao oculto-aviso"><i class="fas fa-eye-slash"></i> Post ocultado pelo Admin Master — ${p.autorUid === uid ? 'só você e o Admin veem.' : 'só o autor e você veem.'}</div>` : ''}
${p.revisao === 'pendente' && p.autorUid === uid && !(ehModerador() || gerencia(p.autorAcademiaId) || gerencia(p.nucleoId)) ? `<div class="revisao"><i class="fas fa-hourglass-half"></i> ${p.moderacaoAuto ? 'O filtro automático mandou este post para revisão.' : 'Aguardando a revisão do responsável do núcleo.'} Só você vê por enquanto.</div>` : ''}
${p.texto ? `<p class="post-texto">${formatarTexto(p.texto, p.mencoes)}</p>` : ''}
${p.eventoId ? `<button type="button" class="tag-evento" data-album="${escapeHTML(p.eventoId)}"><i class="fas fa-images"></i> Álbum: ${escapeHTML(p.eventoNome || 'evento')}</button>` : ''}
${midiasHTML(p)}
${marcados}
<div class="post-acoes">
<button type="button" class="acao ${curtido ? 'curtido' : ''}" data-acao="curtir"><i class="${curtido ? 'fas' : 'far'} fa-heart"></i> ${(p.curtidas || []).length || ''}</button>
<button type="button" class="acao" data-acao="comentar"><i class="far fa-comment"></i> ${p.comentariosCount || ''}</button>
<button type="button" class="acao" data-acao="compartilhar" aria-label="Compartilhar"><i class="far fa-paper-plane"></i></button>
<button type="button" class="acao ultimo ${salvo ? 'salvo' : ''}" data-acao="salvar" aria-label="Salvar"><i class="${salvo ? 'fas' : 'far'} fa-bookmark"></i></button>
</div>
${curtidores}
<div class="comentarios oculto" data-comentarios></div>
</article>`;
}
function avisoHTML(a) {
const n = a.academiaId ? nucleoDe(a.academiaId) : null;
const quando = a.data ? new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + (a.hora ? ` · ${a.hora}` : '') : '';
return `<article class="card aviso-card" data-aviso="${a.id}"><div class="ic"><i class="fas fa-bullhorn"></i></div><div style="flex:1;min-width:0"><span class="eyebrow" style="color:#1E8449">Aviso ${n ? `do ${escapeHTML(nomeCurtoNucleo(n.nome))}` : 'do grupo'}</span><b>${escapeHTML(a.titulo || 'Aviso')}</b><p>${escapeHTML(a.texto || '')}</p><div class="info">${quando ? `<span><i class="far fa-calendar"></i> ${quando}</span>` : ''}${a.local ? `<span><i class="fas fa-location-dot"></i> ${escapeHTML(a.local)}</span>` : ''}<span>${tempoRelativo(a.criadoEm)}</span></div></div></article>`;
}
// Um post só aparece pra quem pode vê-lo: respeita visibilidade, perfil
// privado e a revisão pendente (foto de menor / sem termo de imagem fica
// visível só pro autor e pra quem modera, até o responsável aprovar).
function visivelParaMim(p) {
if (p.oculto && p.autorUid !== uid && !ehAdmin()) return false; // ocultado pelo Admin Master
if (p.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId) || gerencia(p.nucleoId)) return true;
if (p.revisao === 'pendente' && midiasDe(p).length) return false;
if (p.visibilidade === 'nucleo' && p.nucleoId !== perfil.academiaId) return false;
if (p.visibilidade === 'seguidores' && !((pubCache.get(p.autorUid) || {}).seguidores || []).includes(uid)) return false;
const pub = pubCache.get(p.autorUid);
if (pub && pub.privado && !podeVerPerfil(pub) && p.tipo !== 'aviso') return false;
return true;
}
function filtrarPosts(lista) {
return lista.filter((p) => {
if (!visivelParaMim(p)) return false;
if (filtroFeed === 'nucleo') return p.nucleoId === perfil.academiaId || p.autorAcademiaId === perfil.academiaId;
if (filtroFeed === 'seguindo') return seguindo.has(p.autorUid) || p.autorUid === uid;
if (filtroFeed === 'salvos') return salvos.has(p.id);
return true;
});
}
// A rede só consegue ler posts com publico == true (as regras garantem). Na
// primeira página entram também os meus 10 mais recentes (inclusive os que
// estão em revisão ou ocultados, com o aviso).
async function carregarPosts(mais = false) {
// Multi-escola: o feed é da escola de quem está logado (índice escolaId + publico + criadoEm).
const filtro = [...(await ondeEscola()), where('publico', '==', true), orderBy('criadoEm', 'desc')];
let q = query(collection(db, 'posts'), ...filtro, limit(PAGINA));
if (mais && ultimoDoc) q = query(collection(db, 'posts'), ...filtro, startAfter(ultimoDoc), limit(PAGINA));
// Públicos e "os meus" saem juntos (antes um esperava o outro).
const meusP = mais ? null : getDocs(query(collection(db, 'posts'), where('autorUid', '==', uid), orderBy('criadoEm', 'desc'), limit(10))).catch(() => null);
const snap = await getDocs(q);
let novos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
if (!mais) {
const meus = await meusP; // null = índice ainda sendo criado: segue só com os públicos
if (meus) {
const ids = new Set(novos.map((p) => p.id));
meus.docs.forEach((d) => { if (!ids.has(d.id)) novos.push({ id: d.id, ...d.data() }); });
novos.sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
}
}
const ja = new Set(mais ? posts.map((p) => p.id) : []);
posts = mais ? posts.concat(novos.filter((p) => !ja.has(p.id))) : novos;
ultimoDoc = snap.docs.length === PAGINA ? snap.docs[snap.docs.length - 1] : null;
await Promise.all(Array.from(new Set(novos.map((p) => p.autorUid))).map(pubDe));
}
async function carregarAvisos() {
try {
const qAvisos = await consultaDaEscola('avisos', orderBy('criadoEm', 'desc'), limit(8));
const snap = qAvisos ? await getDocs(qAvisos) : { docs: [] };
const h = hoje0();
avisos = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => {
if (a.academiaId && a.academiaId !== perfil.academiaId && !gerencia(a.academiaId) && !ehModerador()) return false;
if (a.data) return new Date(a.data + 'T23:59:59') >= h;
return (Date.now() - new Date(a.criadoEm).getTime()) < 14 * 86400000;
}).slice(0, 3);
} catch (e) { console.warn('avisos', e); avisos = []; }
}
async function renderFeed(param, vista, soRedesenhar = false) {
vista = vista || el('vista');
if (!soRedesenhar) {
if (preCargaFeed) { const p = preCargaFeed; preCargaFeed = null; await Promise.all([p, carregarAvisos()]); }
else await Promise.all([carregarStories(), carregarAvisos(), posts.length ? Promise.resolve() : carregarPosts(false)]);
}
const visiveis = filtrarPosts(posts);
vista.innerHTML = `
${storiesHTML()}
<div class="abas" id="abasFeed">${[['rede', 'Rede'], ['nucleo', 'Meu núcleo'], ['seguindo', 'Seguindo'], ['salvos', 'Salvos']].map(([k, t]) => `<button type="button" data-f="${k}" class="${filtroFeed === k ? 'ativa' : ''}">${t}</button>`).join('')}</div>
${filtroFeed === 'rede' ? avisos.map(avisoHTML).join('') : ''}
<div id="listaPosts">${visiveis.length ? visiveis.map(postHTML).join('') : `<div class="vazio"><i class="fas fa-users"></i><b>${filtroFeed === 'salvos' ? 'Nada salvo ainda' : filtroFeed === 'seguindo' ? 'Ninguém que você segue publicou' : filtroFeed === 'nucleo' ? 'Seu núcleo ainda não publicou' : 'Ninguém publicou ainda'}</b>${filtroFeed === 'rede' ? 'Seja o primeiro a compartilhar um momento do treino.' : 'Toque em Explorar pra descobrir atletas e núcleos.'}</div>`}</div>
${ultimoDoc ? '<button type="button" class="btn-mais" id="btnMaisPosts">Carregar mais</button>' : (visiveis.length ? '<p class="contador fim-feed">Você viu tudo por aqui.</p>' : '')}`;
el('abasFeed').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; filtroFeed = b.dataset.f; renderFeed(null, vista, true); });
const btnMais = el('btnMaisPosts');
if (btnMais) {
const carregarMais = async () => { if (btnMais.disabled) return; btnMais.disabled = true; btnMais.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando…'; const y = window.scrollY; try { await carregarPosts(true); await renderFeed(null, vista, true); window.scrollTo({ top: y }); } catch (e) { toast('Não deu pra carregar mais.'); btnMais.disabled = false; btnMais.textContent = 'Carregar mais'; } };
btnMais.addEventListener('click', carregarMais);
// Rolagem infinita: chegou perto do fim, carrega a próxima página sozinho.
if ('IntersectionObserver' in window) { const ob = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { ob.disconnect(); carregarMais(); } }, { rootMargin: '600px 0px' }); ob.observe(btnMais); }
}
}

/* ===================== AÇÕES EM POSTS ===================== */
async function curtir(p, btn) {
const curtido = (p.curtidas || []).includes(uid);
try {
await updateDoc(doc(db, 'posts', p.id), { curtidas: curtido ? arrayRemove(uid) : arrayUnion(uid) });
p.curtidas = curtido ? (p.curtidas || []).filter((u) => u !== uid) : [...(p.curtidas || []), uid];
btn.classList.toggle('curtido', !curtido); btn.innerHTML = `<i class="${curtido ? 'far' : 'fas'} fa-heart"></i> ${p.curtidas.length || ''}`;
} catch (e) { console.error(e); toast('Não deu pra curtir agora.'); }
}
async function salvar(p, btn) {
const ja = salvos.has(p.id);
try {
await atualizar('usuarios', uid, { salvos: ja ? arrayRemove(p.id) : arrayUnion(p.id) });
if (ja) salvos.delete(p.id); else salvos.add(p.id);
btn.classList.toggle('salvo', !ja); btn.innerHTML = `<i class="${ja ? 'far' : 'fas'} fa-bookmark"></i>`;
toast(ja ? 'Removido dos salvos.' : 'Salvo no seu perfil.');
} catch (e) { console.error(e); toast('Não foi possível salvar.'); }
}
async function compartilhar(p) {
const url = `${location.origin}${location.pathname}#post/${p.id}`;
try { if (navigator.share) await navigator.share({ title: 'Rede Liberdade', text: (p.texto || '').slice(0, 120), url }); else { await navigator.clipboard.writeText(url); toast('Link copiado (só quem tem cadastro abre).'); } } catch (e) { /* cancelado */ }
}
function menuPost(p, card) {
const podeApagar = p.autorUid === uid; // só quem publicou apaga
const podeOcultar = ehAdmin(); // Admin Master oculta qualquer post ofensivo
abrirFolha(`<h3>Post de ${escapeHTML(p.autorNome || '')}</h3>
<div style="display:grid;gap:8px">
${p.autorUid === uid ? `<button type="button" class="btn-claro" data-m="momento"><i class="fas fa-star"></i> ${p.melhorMomento ? 'Tirar de melhores momentos' : 'Marcar como melhor momento'}</button>` : ''}
<button type="button" class="btn-claro" data-m="perfil"><i class="far fa-user"></i> Ver perfil do autor</button>
${p.autorUid !== uid ? `<button type="button" class="btn-claro" data-m="denunciar"><i class="fas fa-flag"></i> Denunciar este post</button>` : ''}
${podeOcultar ? `<button type="button" class="btn-claro" data-m="ocultar"><i class="fas ${p.oculto ? 'fa-eye' : 'fa-eye-slash'}"></i> ${p.oculto ? 'Mostrar o post de novo (Admin)' : 'Ocultar da rede (Admin)'}</button>` : ''}
${podeApagar ? `<button type="button" class="btn-perigo" data-m="apagar"><i class="fas fa-trash-can"></i> Apagar post</button>` : ''}
</div>`, async (m) => {
if (m === 'perfil') ir(`perfil/${p.autorUid}`);
if (m === 'momento') { try { await updateDoc(doc(db, 'posts', p.id), { melhorMomento: !p.melhorMomento }); p.melhorMomento = !p.melhorMomento; card.outerHTML = postHTML(p); toast(p.melhorMomento ? 'Agora é um melhor momento ⭐' : 'Removido dos melhores momentos.'); } catch (e) { toast('Não foi possível alterar.'); } }
if (m === 'denunciar') denunciar({ tipoAlvo: 'post', postId: p.id, autorPostUid: p.autorUid, autorPostAcademiaId: p.autorAcademiaId || null });
if (m === 'ocultar') { await alternarOcultoPost(p, card); return; }
if (m === 'apagar') { if (p.autorUid !== uid) return; if (!confirm('Apagar este post?')) return; try { await deleteDoc(doc(db, 'posts', p.id)); posts = posts.filter((x) => x.id !== p.id); card.remove(); toast('Post apagado.'); } catch (e) { toast('Sem permissão pra apagar este post.'); } }
});
}
// Ocultar (Admin Master): o post some da rede para todos; só o autor e o Admin
// continuam vendo, com o aviso. Não apaga nada — dá pra mostrar de novo.
async function alternarOcultoPost(p, card) {
if (!ehAdmin()) return;
const ocultar = !p.oculto;
if (ocultar && !confirm('Ocultar este post da rede? Ele some para todos; só o autor e você continuam vendo.')) return;
// "publico" acompanha: oculto nunca aparece; ao mostrar de novo, volta se a revisão estiver ok.
const dados = { oculto: ocultar, ocultadoPor: uid, ocultadoEm: new Date().toISOString(), publico: !ocultar && (p.revisao || 'ok') === 'ok' };
try { await updateDoc(doc(db, 'posts', p.id), dados); Object.assign(p, dados); if (card && card.isConnected) card.outerHTML = postHTML(p); toast(ocultar ? 'Post ocultado da rede.' : 'Post visível de novo.'); }
catch (e) { console.error(e); toast(explicarErro(e, 'o post')); }
}
// Denúncia com motivo (post ou comentário): vai para o Admin e o responsável do núcleo.
function denunciar(alvo) {
abrirFolha(`<h3>Denunciar ${alvo.tipoAlvo === 'comentario' ? 'comentário' : 'post'} <button type="button" class="btn-icone" data-m="fechar"><i class="fas fa-xmark"></i></button></h3>
<p class="contador" style="margin-bottom:10px">Ninguém fica sabendo quem denunciou. O responsável do núcleo e o Admin Master analisam.</p>
<div style="display:grid;gap:8px">${MOTIVOS_DENUNCIA.map((m) => `<button type="button" class="btn-claro" data-m="${m.id}" style="justify-content:flex-start"><i class="fas fa-flag" style="color:var(--red)"></i> ${escapeHTML(m.rotulo)}</button>`).join('')}</div>`, async (m) => {
if (m === 'fechar') return;
const rot = (MOTIVOS_DENUNCIA.find((x) => x.id === m) || {}).rotulo || 'Outro';
const extra = m === 'outro' ? (prompt('Conte em poucas palavras o que aconteceu:') || '') : '';
try {
await addDoc(collection(db, 'denuncias'), await talvezComEscola({ ...alvo, denuncianteUid: uid, denuncianteNome: perfil.nome || '', motivoId: m, motivo: `${rot}${extra ? `: ${extra}` : ''}`.slice(0, 300), criadoEm: new Date().toISOString(), status: 'aberta' }));
toast('Denúncia enviada. Obrigado por cuidar da rede.');
} catch (e) { toast('Não foi possível enviar a denúncia.'); }
});
}

// ---- @menções: sugestões enquanto digita (textarea do post ou campo de comentário) ----
function ligarMencoes(campo, mapa) {
let caixa = null; let timer = null;
const fechar = () => { if (caixa) { caixa.remove(); caixa = null; } };
campo.addEventListener('blur', () => setTimeout(fechar, 200));
campo.addEventListener('input', () => {
clearTimeout(timer);
const antes = campo.value.slice(0, campo.selectionStart || campo.value.length);
const m = antes.match(/(^|\s)@([\p{L}\p{N}_.]{1,30})$/u);
if (!m) { fechar(); return; }
const termo = m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, ' ');
timer = setTimeout(async () => {
let pessoas = [];
try { pessoas = (await getDocs(query(collection(db, 'perfisPublicos'), ...(await ondeEscola()), where('nomeBusca', '>=', termo), where('nomeBusca', '<=', termo + '\uf8ff'), limit(6)))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((x) => x.id !== uid); } catch (e) { pessoas = []; }
fechar(); if (!pessoas.length) return;
caixa = document.createElement('div'); caixa.className = 'mencao-sugestoes'; caixa.setAttribute('role', 'listbox');
caixa.innerHTML = pessoas.map((x) => `<button type="button" role="option" data-uid="${escapeHTML(x.id)}">${avatarHTML(x, 'mini')}<span><b>${escapeHTML(x.nome)}</b><small>${escapeHTML([x.cordaoAtual, nomeCurtoNucleo(x.academiaNome)].filter(Boolean).join(' · '))}</small></span></button>`).join('');
campo.insertAdjacentElement('afterend', caixa);
caixa.addEventListener('mousedown', (ev) => ev.preventDefault());
caixa.addEventListener('click', (ev) => {
const b = ev.target.closest('[data-uid]'); if (!b) return;
const x = pessoas.find((y) => y.id === b.dataset.uid); if (!x) return;
const token = String(x.nome || '').trim().split(/\s+/).slice(0, 2).join('_');
const pos = campo.selectionStart || campo.value.length;
const ini = antes.length - m[2].length - 1;
campo.value = campo.value.slice(0, ini) + '@' + token + ' ' + campo.value.slice(pos);
mapa.set(token.toLowerCase(), { uid: x.id, nome: x.nome, token });
campo.focus(); const c = ini + token.length + 2; campo.setSelectionRange(c, c);
campo.dispatchEvent(new Event('input')); fechar();
});
}, 250);
});
}
// Só vale a menção cujo @token continua no texto final.
const mencoesDoTexto = (texto, mapa) => Array.from(mapa.values()).filter((m) => new RegExp(`(^|\\s)@${m.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|[.,!?])`, 'iu').test(texto)).slice(0, 10);
// Filtro de palavras antes de publicar (o servidor confere de novo).
function barrarOfensa(texto) {
const t = termosOfensivos(texto, configBrasoes.palavrasExtras || []);
if (t.length) { toast(`Troque "${t[0]}" — a rede tem crianças. Publique com respeito.`); return true; }
return false;
}

const mencoesComentario = new WeakMap(); // form → Map(token → {uid,nome,token})
function comentarioHTML(c, p, filhos = []) {
const podeApagar = c.autorUid === uid || p.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId);
const escondido = c.oculto === true;
if (escondido && !(c.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId))) return '';
return `<div class="comentario ${c.respostaA ? 'resposta' : ''}" data-cid="${c.id}">${avatarHTML({ id: c.autorUid, nome: c.autorNome, fotoUrl: c.autorFoto }, 'mini')}<div class="bolha-wrap"><div class="bolha ${escondido ? 'escondido' : ''}"><strong>${escapeHTML(c.autorNome || 'Capoeirista')} <small>· ${tempoRelativo(c.criadoEm)}</small></strong>${escondido ? '<em class="aviso-mod"><i class="fas fa-eye-slash"></i> Escondido pelo filtro automático — só você e a moderação veem.</em>' : ''}${c.respostaANome ? `<span class="em-resposta">↪ ${escapeHTML(c.respostaANome)}</span>` : ''}${formatarTexto(c.texto, c.mencoes)}</div>
<div class="coment-acoes">${c.respostaA ? '' : `<button type="button" data-acao="responder" data-nome="${escapeHTML(String(c.autorNome || '').split(' ')[0])}">Responder</button>`}${c.autorUid !== uid ? '<button type="button" data-acao="denunciar-comentario">Denunciar</button>' : ''}${podeApagar ? '<button type="button" data-acao="apagar-comentario">Apagar</button>' : ''}</div>
${filhos.map((f) => comentarioHTML(f, p)).join('')}</div></div>`;
}
async function abrirComentarios(p, card, manterAberto = false) {
const box = card.querySelector('[data-comentarios]');
if (!manterAberto && !box.classList.contains('oculto')) { box.classList.add('oculto'); return; }
box.classList.remove('oculto'); box.innerHTML = '<p class="contador">Carregando comentários…</p>';
try {
const snap = await getDocs(query(collection(db, 'posts', p.id, 'comentarios'), orderBy('criadoEm', 'asc'), limit(100)));
const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
const raiz = lista.filter((c) => !c.respostaA || !lista.some((x) => x.id === c.respostaA));
const html = raiz.map((c) => comentarioHTML(c, p, lista.filter((x) => x.respostaA === c.id))).join('');
box.innerHTML = (html || '<p class="contador">Nenhum comentário ainda. Comece a conversa!</p>')
+ `<form class="novo-comentario" data-form-comentario><div class="respondendo oculto" data-respondendo></div><div class="linha-comentar"><input type="text" maxlength="400" placeholder="Escreva um comentário… use @ para marcar" required aria-label="Comentário"><button type="submit" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></div></form>`;
const form = box.querySelector('[data-form-comentario]'); const mapa = new Map(); mencoesComentario.set(form, mapa);
ligarMencoes(form.querySelector('input'), mapa);
} catch (e) { console.error(e); box.innerHTML = '<p class="contador">Não foi possível carregar os comentários.</p>'; }
}
function prepararResposta(card, cid, nome) {
const form = card.querySelector('[data-form-comentario]'); if (!form) return;
form.dataset.respostaA = cid; form.dataset.respostaNome = nome;
const r = form.querySelector('[data-respondendo]'); r.classList.remove('oculto');
r.innerHTML = `Respondendo <b>${escapeHTML(nome)}</b> <button type="button" data-acao="cancelar-resposta" aria-label="Cancelar resposta"><i class="fas fa-xmark"></i></button>`;
const inp = form.querySelector('input'); inp.focus();
}
async function comentar(p, card, form) {
const input = form.querySelector('input'); const texto = input.value.trim(); if (!texto) return;
if (barrarOfensa(texto)) return;
const botao = form.querySelector('button[type="submit"]'); botao.disabled = true;
const mapa = mencoesComentario.get(form) || new Map();
const dados = { autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '', texto, criadoEm: new Date().toISOString() };
if (form.dataset.respostaA) { dados.respostaA = form.dataset.respostaA; dados.respostaANome = form.dataset.respostaNome || ''; }
const mencoes = mencoesDoTexto(texto, mapa); if (mencoes.length) dados.mencoes = mencoes;
try {
await addDoc(collection(db, 'posts', p.id, 'comentarios'), dados);
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(1) }); p.comentariosCount = (p.comentariosCount || 0) + 1; } catch (e) { /* cosmético */ }
await abrirComentarios(p, card, true);
const btn = card.querySelector('[data-acao="comentar"]'); if (btn) btn.innerHTML = `<i class="far fa-comment"></i> ${p.comentariosCount || ''}`;
} catch (e) { console.error(e); toast('Não foi possível comentar.'); } finally { botao.disabled = false; }
}
async function apagarComentario(p, card, cid) {
if (!confirm('Apagar este comentário?')) return;
try {
await deleteDoc(doc(db, 'posts', p.id, 'comentarios', cid));
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(-1) }); p.comentariosCount = Math.max(0, (p.comentariosCount || 1) - 1); } catch (e) { /* cosmético */ }
await abrirComentarios(p, card, true);
} catch (e) { toast('Sem permissão pra apagar esse comentário.'); }
}
// Ações dentro de um card de post (feed, perfil, núcleo, post aberto).
function acaoNoPost(p, card, btn, ev) {
const acao = btn.dataset.acao;
if (acao === 'curtir') curtir(p, btn); else if (acao === 'salvar') salvar(p, btn); else if (acao === 'comentar') abrirComentarios(p, card);
else if (acao === 'compartilhar') compartilhar(p); else if (acao === 'menu') menuPost(p, card);
else if (acao === 'apagar-comentario') { const c = ev.target.closest('.comentario'); if (c) apagarComentario(p, card, c.dataset.cid); }
else if (acao === 'responder') { const c = ev.target.closest('.comentario'); if (c) prepararResposta(card, c.dataset.cid, btn.dataset.nome || ''); }
else if (acao === 'cancelar-resposta') { const f = card.querySelector('[data-form-comentario]'); if (f) { delete f.dataset.respostaA; delete f.dataset.respostaNome; f.querySelector('[data-respondendo]').classList.add('oculto'); } }
else if (acao === 'denunciar-comentario') { const c = ev.target.closest('.comentario'); if (c) denunciar({ tipoAlvo: 'comentario', postId: p.id, comentarioId: c.dataset.cid, autorPostUid: p.autorUid, autorPostAcademiaId: p.autorAcademiaId || null }); }
else if (acao === 'revisar-ok') { updateDoc(doc(db, 'posts', p.id), { revisao: 'ok', revisadoPor: uid, publico: !p.oculto }).then(() => { p.revisao = 'ok'; p.publico = !p.oculto; card.outerHTML = postHTML(p); toast('Post aprovado.'); }).catch(() => toast('Sem permissão pra aprovar.')); }
}
// Delegação: um listener só pra toda a vista (posts aparecem em várias telas).
function ligarEventosVista() {
const vista = el('vista');
vista.addEventListener('click', (ev) => {
const hash = ev.target.closest('.hash'); if (hash) { ir(`tag/${hash.dataset.hash}`); return; }
const perfilBtn = ev.target.closest('[data-perfil]'); if (perfilBtn) { ir(`perfil/${perfilBtn.dataset.perfil}`); return; }
const nucBtn = ev.target.closest('[data-nucleo]'); if (nucBtn && nucBtn.dataset.nucleo) { ir(`nucleo/${nucBtn.dataset.nucleo}`); return; }
const salaBtn = ev.target.closest('[data-brasoes]'); if (salaBtn) { ir(`brasoes/${salaBtn.dataset.brasoes}`); return; }
const albumBtn = ev.target.closest('[data-album]'); if (albumBtn) { ir(`album/${albumBtn.dataset.album}`); return; }
const agendaBtn = ev.target.closest('[data-agenda]'); if (agendaBtn) { ir(agendaBtn.dataset.agenda ? `agenda/${agendaBtn.dataset.agenda}` : 'agenda'); return; }
const brBtn = ev.target.closest('[data-brasao]'); if (brBtn) { const alvo = vista.dataset.pubBrasoes || (location.hash.split('/')[1]) || uid; pubDe(alvo).then((pub) => abrirBrasao(brBtn.dataset.brasao, pub || meuPub || {})); return; }
const st = ev.target.closest('[data-story]'); if (st) { abrirStories(st.dataset.story); return; }
if (ev.target.closest('[data-story-novo]')) { el('inputStory').click(); return; }
const ver = ev.target.closest('[data-ver]'); if (ver && ver.tagName === 'IMG') { abrirMidia(`<img src="${escapeHTML(ver.src)}" alt="">`); return; }
const card = ev.target.closest('.post'); if (!card) return;
const p = postPorId(card.dataset.id) || card.__post; if (!p) return;
const btn = ev.target.closest('[data-acao]'); if (!btn) return;
acaoNoPost(p, card, btn, ev);
});
vista.addEventListener('submit', (ev) => {
const form = ev.target.closest('[data-form-comentario]'); if (!form) return; ev.preventDefault();
const card = form.closest('.post'); const p = postPorId(card.dataset.id) || card.__post; if (p) comentar(p, card, form);
});
// carrossel: atualiza contador/pontos ao rolar
vista.addEventListener('scroll', (ev) => {
const faixa = ev.target; if (!faixa.classList || !faixa.classList.contains('faixa')) return;
const i = Math.round(faixa.scrollLeft / faixa.clientWidth); const wrap = faixa.parentElement;
const cont = wrap.querySelector('.cont'); if (cont) cont.textContent = `${i + 1}/${faixa.children.length}`;
wrap.querySelectorAll('.pontos i').forEach((d, k) => d.classList.toggle('ativo', k === i));
}, true);
}
function abrirMidia(html) { el('midiaConteudo').innerHTML = html; el('midiaViewer').classList.remove('oculto'); }
function abrirFolha(html, aoClicar) {
const f = document.createElement('div'); f.className = 'folha'; f.innerHTML = `<div class="conteudo">${html}</div>`;
f.addEventListener('click', (ev) => { if (ev.target === f) { f.remove(); return; } const b = ev.target.closest('[data-m]'); if (b) { f.remove(); aoClicar && aoClicar(b.dataset.m, b); } });
document.body.appendChild(f); return f;
}

/* ===================== PERFIL DO ATLETA ===================== */
let perfilAba = 'momentos';
async function postsDoAutor(alvoUid) {
const filtros = [...(await ondeEscola()), where('autorUid', '==', alvoUid)];
if (alvoUid !== uid && !ehModerador()) filtros.push(where('publico', '==', true));
const snap = await getDocs(query(collection(db, 'posts'), ...filtros, limit(90)));
return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}
function gradeHTML(lista, vazio) {
if (!lista.length) return `<div class="vazio"><i class="fas fa-image"></i>${vazio}</div>`;
return `<div class="grade">${lista.map((p, i) => { const m = midiasDe(p)[0]; return `<button type="button" data-abrir-post="${p.id}" class="${i === 0 && p.melhorMomento ? 'grande' : ''}">${m.tipo === 'video' ? `<video src="${escapeHTML(m.url)}" preload="metadata" muted></video><i class="fas fa-video ic"></i>` : `<img src="${escapeHTML(m.url)}" alt="" loading="lazy">`}${midiasDe(p).length > 1 ? '<i class="fas fa-layer-group ic"></i>' : ''}${p.melhorMomento ? '<span class="selo">★ momento</span>' : ''}</button>`; }).join('')}</div>`;
}
/* ===================== BRASÕES (catálogo real em brasoes.js) ===================== */
// Dados de avaliação a partir do perfil público (o que a pessoa publicou sobre si).
function dadosBrasoesDe(pub) {
const manuais = {}; const doAdmin = {};
Object.entries(pub.brasoes || {}).forEach(([id, v]) => { if (v && v.manual) (v.admin ? doAdmin : manuais)[id] = { em: v.em, porNome: v.por || null }; });
return {
cordaoAtual: pub.cordaoAtual, fundador: !!pub.fundador, historicoGraduacoes: pub.historicoGraduacoes || [], criadoEm: pub.criadoEm,
resumoPresencas: pub.resumoPresencas || null, resumoRede: pub.resumoRede || null, resumoFormacao: pub.resumoFormacao || null, resumoCompromisso: pub.resumoCompromisso || null, resumoCompeticoes: pub.resumoCompeticoes || null,
academiaId: pub.academiaId, academiaGerenciadaId: pub.academiaGerenciadaId, uid: pub.id, brasoesManuais: manuais, brasoesAdmin: doAdmin, brasoes: pub.brasoes || {},
// Brasões 46–71: tudo o que o cartão público já mostra sobre a pessoa (certificados, seguidores, capa/bio, vídeo e assinatura).
certificados: Array.isArray(pub.certificados) ? pub.certificados : [], seguidoresTotal: Array.isArray(pub.seguidores) ? pub.seguidores.length : 0,
fotoUrl: pub.fotoUrl || '', capaUrl: pub.capaUrl || '', bio: pub.bio || '', temApresentacao: pub.temApresentacao === true, temAssinatura: pub.temAssinatura === true,
};
}
function avaliacaoDe(pub) { return avaliarBrasoes(dadosBrasoesDe(pub), configBrasoes).filter((a) => a.ativo); }
function brasaoCardHTML(a, tam = '') {
const pct = a.progresso && a.progresso.meta ? Math.round(a.progresso.atual * 100 / a.progresso.meta) : 0;
return `<button type="button" class="brasao ${a.ganho ? 'ganho' : 'bloq'} ${tam}" data-brasao="${escapeHTML(a.id)}" title="${escapeHTML(a.nome)}">
<img src="${urlThumb(a)}" alt="" loading="lazy">
<b>${escapeHTML(a.nome)}</b>
${a.ganho ? `<small>${a.em ? new Date(a.em).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : 'conquistado'}</small>` : (a.progresso ? `<small class="mono">${a.progresso.atual}/${a.progresso.meta}</small><i class="brasao-prog"><i style="width:${pct}%"></i></i>` : `<small>${a.regra.tipo === 'manual' ? 'concessão' : 'bloqueado'}</small>`)}
</button>`;
}
// Resumo na aba Conquistas: total, os últimos ganhos e o próximo mais perto.
function brasoesResumoHTML(pub) {
const av = avaliacaoDe(pub); const ganhos = av.filter((a) => a.ganho).sort((x, y) => new Date(y.em || 0) - new Date(x.em || 0));
const proximos = av.filter((a) => !a.ganho && a.progresso && a.progresso.atual > 0).sort((x, y) => (y.progresso.atual / y.progresso.meta) - (x.progresso.atual / x.progresso.meta)).slice(0, 3);
return `<div class="titulo-sec">Brasões <span class="pill gold">${ganhos.length}/${av.length}</span></div>
<div class="brasoes-grade">${ganhos.slice(0, 6).map((a) => brasaoCardHTML(a)).join('') || '<div class="vazio" style="grid-column:1/-1"><i class="fas fa-medal"></i>Ainda sem brasões — o primeiro vem com a primeira presença registrada.</div>'}</div>
${proximos.length ? `<div class="titulo-sec" style="margin-top:8px">Quase lá</div><div class="brasoes-grade">${proximos.map((a) => brasaoCardHTML(a)).join('')}</div>` : ''}
<button type="button" class="btn-mais" data-brasoes="${escapeHTML(pub.id)}" style="margin-top:10px"><i class="fas fa-medal"></i> Ver a Sala de Brasões (${av.length})</button>`;
}
// Sala de Brasões: todos, por série, com progresso real.
async function renderBrasoes(param, vista) {
const alvo = param || uid; const meu = alvo === uid;
if (meu) await sincronizarPerfilPublico();
pubCache.delete(alvo); const pub = await pubDe(alvo);
if (!pub) { vista.innerHTML = '<div class="vazio"><i class="fas fa-medal"></i><b>Perfil não encontrado</b></div>'; return; }
if (!podeVerPerfil(pub)) { vista.innerHTML = '<div class="vazio"><i class="fas fa-lock"></i><b>Perfil privado</b>Peça pra seguir pra ver os brasões.</div>'; return; }
el('tituloTopo').textContent = meu ? 'Meus brasões' : `Brasões de ${pub.nome.split(' ')[0]}`;
const av = avaliacaoDe(pub); const ganhos = av.filter((a) => a.ganho).length;
const cordaoAtual = av.find((a) => a.serie === 'cordoes' && a.ganho && a.regra.meta === pub.cordaoAtual) || av.filter((a) => a.serie === 'cordoes' && a.ganho).pop();
vista.innerHTML = `
<div class="sala-topo">${cordaoAtual ? `<img src="${urlPng(cordaoAtual)}" alt="" class="sala-hero" data-brasao="${cordaoAtual.id}">` : ''}<div><span class="eyebrow">Sala de Brasões</span><h2>${escapeHTML(pub.nome)}</h2><p>${ganhos} de ${av.length} brasões conquistados${cordaoAtual ? ` · cordão ${escapeHTML(pub.cordaoAtual || 'Iniciante')}` : ''}</p><div class="barra" style="margin-top:8px"><i style="width:${Math.round(ganhos * 100 / Math.max(1, av.length))}%;--c1:#DAA520;--c2:#00B140;--c3:#002D72"></i></div></div></div>
${Object.entries(SERIES).map(([k, sr]) => { const itens = av.filter((a) => a.serie === k); if (!itens.length) return ''; const g = itens.filter((a) => a.ganho).length; return `<div class="titulo-sec"><span><i class="fas ${sr.icone}" style="color:var(--teal);margin-right:6px"></i>${sr.nome}</span><span class="contador">${g}/${itens.length}</span></div><p class="contador" style="margin:-4px 4px 6px">${sr.sub}</p><div class="brasoes-grade">${itens.map((a) => brasaoCardHTML(a)).join('')}</div>`; }).join('')}
<p class="contador" style="text-align:center;padding:8px 12px 0">Todo brasão é calculado de dados reais do app (presenças do Face ID, graduações registradas pelo mestre, publicações na Rede) ou concedido pelo responsável do núcleo.</p>`;
vista.dataset.pubBrasoes = alvo;
}
let modelViewerCarregado = false;
async function abrirBrasao(id, pub) {
const av = avaliacaoDe(pub); const a = av.find((x) => x.id === id) || avaliarBrasoes({}, configBrasoes).find((x) => x.id === id); if (!a) return;
const glb = a.ganho && urlGlb(a);
const f = abrirFolha(`<h3>${escapeHTML(a.nome)} <button type="button" class="btn-icone" data-m="fechar"><i class="fas fa-xmark"></i></button></h3>
<div class="brasao-detalhe ${a.ganho ? '' : 'bloq'}">
<div class="brasao-palco" id="brasaoPalco"><img src="${urlPng(a)}" alt="${escapeHTML(a.nome)}"></div>
<div class="pills" style="justify-content:center;display:flex;gap:6px;flex-wrap:wrap">${a.ganho ? `<span class="pill verde"><i class="fas fa-check"></i> Conquistado${a.em ? ` em ${new Date(a.em).toLocaleDateString('pt-BR')}` : ''}</span>` : '<span class="pill neutra"><i class="fas fa-lock"></i> Bloqueado</span>'}${a.nivel ? `<span class="pill gold">${escapeHTML(a.nivel[0].toUpperCase() + a.nivel.slice(1))}</span>` : ''}<span class="pill navy">${escapeHTML(SERIES[a.serie].nome)}</span>${a.manual && a.por ? `<span class="pill teal">por ${escapeHTML(a.por)}</span>` : ''}</div>
${a.descricao ? `<p class="bio" style="text-align:center;margin-top:10px">${escapeHTML(a.descricao)}</p>` : ''}
<div class="opc" style="margin-top:12px"><div class="ic"><i class="fas fa-bullseye"></i></div><div class="t"><b>Como conquistar</b><small>${escapeHTML(a.como || textoMetrica(a))}</small></div></div>
${a.progresso && !a.ganho ? `<div class="progresso" style="margin-top:8px"><div class="l"><span>${escapeHTML(textoMetrica(a))}</span><span>${a.progresso.atual}/${a.progresso.meta}</span></div><div class="barra"><i style="width:${Math.round(a.progresso.atual * 100 / a.progresso.meta)}%;--c1:#0B5C52;--c2:#389E92;--c3:#00E676"></i></div></div>` : ''}
${glb ? `<button type="button" class="btn-claro" id="btnGirar" style="width:100%;justify-content:center;margin-top:10px"><i class="fas fa-cube"></i> Ver em 3D e girar</button>` : ''}
${a.ganho && (pub.id || uid) === uid ? `<button type="button" class="btn-verde" id="btnCompartilharBrasao" style="width:100%;justify-content:center;margin-top:10px"><i class="fas fa-share-nodes"></i> Compartilhar este brasão</button>` : ''}
</div>`);
const btnComp = f.querySelector('#btnCompartilharBrasao');
if (btnComp) btnComp.addEventListener('click', () => { f.remove(); abrirFestaBrasoes([a.id], true); });
const btn3d = f.querySelector('#btnGirar');
if (btn3d) btn3d.addEventListener('click', async () => {
btn3d.disabled = true; btn3d.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando 3D…';
try {
if (!modelViewerCarregado) { await import('https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js'); modelViewerCarregado = true; }
f.querySelector('#brasaoPalco').innerHTML = `<model-viewer src="${glb}" camera-controls auto-rotate environment-image="neutral" shadow-intensity="0" exposure="1.1" style="width:100%;height:280px;background:transparent" alt="${escapeHTML(a.nome)} em 3D"></model-viewer>`;
btn3d.remove();
} catch (e) { btn3d.disabled = false; btn3d.innerHTML = '<i class="fas fa-cube"></i> Ver em 3D e girar'; toast('Não foi possível carregar o 3D agora.'); }
});
}
// Festa de brasão (e compartilhar: stories, WhatsApp, Rede) — a mesma do app (js/celebrar.js).
function abrirFestaBrasoes(ids, soCompartilhar = false) {
import('./celebrar.js?v=20261002').then((m) => m.abrirFesta({ tipo: 'brasao', nome: perfil.nome || (meuPub && meuPub.nome) || '', brasoes: ids, compartilhar: soCompartilhar }, { uid, perfil }))
.catch(() => { if (!soCompartilhar) celebrarBrasoesSimples(ids); });
}
function celebrarBrasoes(ids) { abrirFestaBrasoes(ids, false); }
// Festa de brasão novo (momento de pico): mostra a peça grande com brilho (reserva, se o módulo não carregar).
function celebrarBrasoesSimples(ids) {
const lista = ids.map(brasaoPorId).filter(Boolean); if (!lista.length) return;
const a = lista[0];
const f = abrirFolha(`<div class="celebra"><span class="eyebrow">${lista.length > 1 ? `${lista.length} brasões novos` : 'Brasão novo'}</span><h2>${escapeHTML(a.nome)}</h2><div class="celebra-palco"><img src="${urlPng(a)}" alt=""></div><p>${escapeHTML(a.como || '')}</p>${lista.length > 1 ? `<div class="brasoes-grade" style="margin-top:8px">${lista.slice(1, 5).map((x) => `<span class="brasao ganho"><img src="${urlThumb(x)}" alt=""><b>${escapeHTML(x.nome)}</b></span>`).join('')}</div>` : ''}<button type="button" class="btn-verde" data-m="ok" style="width:100%;margin-top:14px">${escapeHTML(ESCOLA.fraseCelebracao)}</button></div>`);
f.querySelector('.conteudo').classList.add('celebra-folha');
}
// Certificados publicados no perfil (servidor: perfisPublicos.certificados).
const certsDe = (pub) => (Array.isArray(pub.certificados) ? pub.certificados : []).filter((c) => c && /^[A-Z0-9]{6,20}$/.test(String(c.codigo || '')));
const escadaPub = (pub) => (pub.menor && (pub.idade || 0) < 12 ? CORDOES_KIDS : CORDOES_ADULTO);
const corDoCordaoPub = (nome, pub) => (escadaPub(pub).find((c) => c.nome === nome) || CORDOES_ADULTO.find((c) => c.nome === nome) || CORDOES_KIDS.find((c) => c.nome === nome) || { cor: coresCordao(pub) }).cor;
const linkCertificado = (codigo) => `certificado.html#${encodeURIComponent(codigo)}`;
function trajetoriaHTML(pub) {
const escada = escadaPub(pub).map((c) => c.nome);
const certs = certsDe(pub);
const hist = (pub.historicoGraduacoes || []).filter((h) => h && h.cordao);
// Um marco por troca registrada + os cordões que só têm certificado (anteriores ao app).
const marcos = hist.map((h) => ({ cordao: h.cordao, em: h.em, porNome: h.porNome, legado: h.legado === true, evento: h.eventoNome || '' }));
certs.forEach((c) => { if (!marcos.some((m) => m.cordao === c.cordao)) marcos.push({ cordao: c.cordao, em: c.data ? `${c.data}T12:00:00` : null, legado: c.legado === true || !c.data, evento: c.evento || '' }); });
marcos.sort((a, b) => (escada.indexOf(b.cordao) - escada.indexOf(a.cordao)) || (new Date(b.em || 0) - new Date(a.em || 0)));
const certDo = (m) => { const doCordao = certs.filter((c) => c.cordao === m.cordao); const dia = m.em && !m.legado ? String(m.em).slice(0, 10) : ''; return doCordao.find((c) => dia && c.data === dia) || doCordao.find((c) => (m.legado ? c.legado : !c.legado)) || doCordao[0] || null; };
const prox = proximoCordao(pub); const cProx = escadaPub(pub).find((c) => c.nome === prox.nome) || prox;
const cAtual = coresCordao(pub);
const eventos = [
`<div class="ev futuro"><b>${escapeHTML(prox.nome)}</b><small>Próxima meta${pub.prontidao != null ? ` · prontidão ${pub.prontidao}%` : ' · sem avaliação lançada'}</small><div class="cord" style="--c1:${cProx.cor[0]};--c2:${cProx.cor[1]};--c3:${cProx.cor[2]}"></div></div>`,
...(marcos.length ? marcos.map((m) => { const cor = corDoCordaoPub(m.cordao, pub); const c = certDo(m); const quando = m.legado ? 'Graduação anterior ao app' : new Date(m.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); return `<div class="ev"><b>${escapeHTML(m.cordao)}</b><small>${escapeHTML(quando)}${m.evento && !m.legado ? ` · ${escapeHTML(m.evento)}` : ''}${m.porNome && !m.legado ? ` · por ${escapeHTML(m.porNome)}` : ''}</small><div class="cord" style="--c1:${cor[0]};--c2:${cor[1]};--c3:${cor[2]}"></div>${c ? `<a class="ver-cert" href="${linkCertificado(c.codigo)}"><i class="fas fa-award"></i> Ver certificado</a>` : ''}</div>`; })
: [`<div class="ev"><b>${escapeHTML(pub.cordaoAtual || 'Iniciante')}</b><small>Cordão atual (as próximas trocas de cordão feitas pelo mestre entram aqui automaticamente)</small><div class="cord" style="--c1:${cAtual[0]};--c2:${cAtual[1]};--c3:${cAtual[2]}"></div></div>`]),
pub.criadoEm ? `<div class="ev ouro"><b>Entrou no grupo</b><small>${new Date(pub.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}${pub.academiaNome ? ` · ${escapeHTML(nomeCurtoNucleo(pub.academiaNome))}` : ''}</small></div>` : '',
];
return `<div class="tl">${eventos.join('')}</div>`;
}
// Galeria de certificados/cordões do perfil: um "mini certificado" por cordão.
function galeriaCertificadosHTML(pub, meu) {
const escada = escadaPub(pub).map((c) => c.nome);
const certs = certsDe(pub).slice().sort((a, b) => (escada.indexOf(b.cordao) - escada.indexOf(a.cordao)) || String(b.data || '').localeCompare(String(a.data || '')));
if (!certs.length) return '';
return `<div class="titulo-sec">Certificados <span class="contador">${certs.length} ${certs.length === 1 ? 'cordão' : 'cordões'}</span>${meu ? '<a class="contador" href="certificados.html" style="margin-left:auto;color:var(--teal);font-weight:800;text-decoration:none">ver todos</a>' : ''}</div>
<div class="galeria-cert">${certs.map((c) => { const cor = corDoCordaoPub(c.cordao, pub); const leg = c.legado || !c.data; return `<a class="mini-cert" href="${linkCertificado(c.codigo)}" aria-label="Certificado do Cordão ${escapeHTML(c.cordao)}">
<span class="faixa" style="--c1:${cor[0]};--c2:${cor[1]};--c3:${cor[2]}"><i></i></span>
<span class="corpo"><small>CERTIFICADO</small><b>Cordão ${escapeHTML(c.cordao)}</b><em>${leg ? 'anterior ao app' : escapeHTML(c.data.split('-').reverse().join('/'))}${c.evento && !leg ? ` · ${escapeHTML(String(c.evento).slice(0, 26))}` : ''}</em></span>
<span class="selo" aria-hidden="true"><i class="fas fa-award"></i></span></a>`; }).join('')}</div>`;
}
async function renderPerfil(param, vista) {
const alvo = param || uid; const meu = alvo === uid;
if (meu) await sincronizarPerfilPublico();
pubCache.delete(alvo); const pub = await pubDe(alvo);
if (!pub) { vista.innerHTML = meu ? '<div class="vazio"><div class="spinner" style="margin:0 auto 10px"></div><b>Preparando o seu cartão</b>O servidor está juntando presenças, graduações e brasões. Leva só alguns segundos.</div>' : '<div class="vazio"><i class="far fa-user"></i><b>Perfil não encontrado</b>Essa pessoa ainda não abriu a Rede Liberdade.</div>'; return; }
el('tituloTopo').textContent = meu ? 'Meu perfil' : pub.nome;
const podeVer = podeVerPerfil(pub);
const sigo = seguindo.has(alvo); const pedi = (pub.pedidosSeguir || []).includes(uid);
const nuc = nucleoDe(pub.academiaId); const gerenciado = pub.academiaGerenciadaId ? nucleoDe(pub.academiaGerenciadaId) : null;
const aprPerfil = await apresentacaoDe(pub.id || alvo);
const titulo = [pub.cordaoAtual ? `${escapeHTML(pub.cordaoAtual)}${nuc ? ` no núcleo ${escapeHTML(nomeCurtoNucleo(nuc.nome))}` : ''}` : '', gerenciado ? `Responsável pelo núcleo ${escapeHTML(nomeCurtoNucleo(gerenciado.nome))}` : '', pub.resumoPresencas && pub.resumoPresencas.total ? `${pub.resumoPresencas.total} presença${pub.resumoPresencas.total === 1 ? '' : 's'} registrada${pub.resumoPresencas.total === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
let lista = []; try { lista = podeVer ? (await postsDoAutor(alvo)).filter(visivelParaMim) : []; } catch (e) { lista = []; }
const momentos = lista.filter((p) => p.melhorMomento && midiasDe(p).length);
const comMidia = lista.filter((p) => midiasDe(p).length);
const r = pub.resumoPresencas;
vista.innerHTML = `
<div class="perfil-capa">${pub.capaUrl ? `<img src="${escapeHTML(pub.capaUrl)}" alt="">` : ''}<div class="acoes-capa">${meu ? `<button type="button" class="btn-icone" id="btnCapa" title="Trocar capa" aria-label="Trocar capa"><i class="fas fa-image"></i></button><button type="button" class="btn-icone" id="btnEditarBio" title="Editar perfil" aria-label="Editar perfil"><i class="fas fa-pen"></i></button><button type="button" class="btn-icone" id="btnAjustes" title="Ajustes, notificações e privacidade" aria-label="Ajustes"><i class="fas fa-gear"></i></button>` : `<button type="button" class="btn-icone" id="btnMsgPerfil" title="Mensagem"><i class="far fa-comment"></i></button>`}</div></div>
<div class="perfil-topo">${anelHTML(pub)}<div class="bt">${aprPerfil ? '<button type="button" class="btn-claro btn-apresentacao" id="btnAprPerfil" title="Ver a apresentação em vídeo"><i class="fas fa-play"></i> Apresentação</button>' : ''}${meu ? `<button type="button" class="btn-verde" id="btnFotoPerfil" style="padding:8px 14px;font-size:.76rem"><i class="fas fa-camera"></i> Foto</button>` : `<button type="button" class="${sigo ? 'btn-claro' : 'btn-navy'}" id="btnSeguir">${sigo ? '<i class="fas fa-user-check"></i> Seguindo' : pedi ? '<i class="fas fa-clock"></i> Pedido enviado' : `<i class="fas fa-user-plus"></i> ${pub.privado ? 'Pedir pra seguir' : 'Seguir'}`}</button>`}</div></div>
<div class="perfil-nome"><h2>${escapeHTML(pub.nome)} ${pub.fundador ? '<i class="fas fa-crown verif" title="Fundador" style="color:var(--gold)"></i>' : (pub.mestre || pub.instrutor) ? '<i class="fas fa-circle-check verif" title="Responsável de núcleo"></i>' : ''}</h2>
${pub.apelido ? `<div class="apelido">"${escapeHTML(pub.apelido)}"</div>` : ''}
${titulo ? `<div class="titulo">${titulo}</div>` : ''}
<div class="pills">${pub.cordaoAtual ? `<span class="pill teal">${escapeHTML(pub.cordaoAtual)}</span>` : ''}${nuc ? `<button type="button" class="pill navy" data-nucleo="${escapeHTML(nuc.id)}"><i class="fas fa-location-dot"></i> ${escapeHTML(nomeCurtoNucleo(nuc.nome))}</button>` : ''}${pub.fundador ? '<span class="pill gold"><i class="fas fa-crown"></i> Fundador</span>' : (rotuloDiretoDe(pub) ? `<span class="pill gold"><i class="fas fa-link"></i> ${escapeHTML(rotuloDiretoDe(pub))}</span>` : '')}${r && r.semanasSeguidas >= 2 ? `<span class="pill verde"><i class="fas fa-fire"></i> ${r.semanasSeguidas} semanas seguidas</span>` : ''}${(pub.funcoes || []).map((f) => `<span class="pill roxo">${escapeHTML(f)}</span>`).join('')}${pub.privado ? '<span class="pill neutra"><i class="fas fa-lock"></i> privado</span>' : ''}</div></div>
<div class="stats"><div class="stat"><b>${podeVer ? lista.length : '—'}</b><small>posts</small></div><div class="stat"><b>${(pub.seguidores || []).length}</b><small>seguidores</small></div><button type="button" class="stat" data-brasoes="${escapeHTML(pub.id)}" style="cursor:pointer"><b>${pub.brasoesTotal ?? '—'}</b><small>brasões</small></button><div class="stat"><b>${r ? r.total : '—'}</b><small>presenças</small></div></div>
${meu ? `<div class="priv"><i class="fas fa-lock"></i><div class="tx"><b>Perfil privado</b><span id="privTxt">${pub.privado ? 'Só quem você aceitar vê seus posts e momentos' : 'Toda a rede vê seus posts e momentos'}</span></div><button type="button" class="switch ${pub.privado ? 'on' : ''}" id="swPriv" aria-label="Perfil privado"></button></div>` : ''}
${meu && (pub.pedidosSeguir || []).length ? `<div class="card" id="pedidos"><div class="titulo-sec" style="padding:0 0 8px">Pedidos pra seguir <span class="pill gold">${pub.pedidosSeguir.length}</span></div><div id="listaPedidos"><p class="contador">Carregando…</p></div></div>` : ''}
${!podeVer ? `<div class="vazio"><i class="fas fa-lock"></i><b>Perfil privado</b>Peça pra seguir — quando ${escapeHTML(pub.nome.split(' ')[0])} aceitar, os momentos aparecem aqui.</div>` : `
<div class="abas" id="abasPerfil">${[['momentos', 'Momentos'], ['trajetoria', 'Trajetória'], ['conquistas', 'Conquistas']].map(([k, t]) => `<button type="button" data-a="${k}" class="${perfilAba === k ? 'ativa' : ''}">${t}</button>`).join('')}</div>
<div id="painelPerfil"></div>`}`;
const painel = el('painelPerfil');
const desenhar = () => {
if (!painel) return;
if (perfilAba === 'momentos') painel.innerHTML = `${momentos.length ? `<div class="titulo-sec">Melhores momentos <span class="pill gold">${momentos.length}</span></div><div class="destaques">${momentos.slice(0, 12).map((p) => { const m = midiasDe(p)[0]; return `<button type="button" class="dest" data-abrir-post="${p.id}">${m.tipo === 'video' ? `<video class="foto" src="${escapeHTML(m.url)}" muted preload="metadata"></video>` : `<img class="foto" src="${escapeHTML(m.url)}" alt="">`}${escapeHTML((p.nucleoNome ? nomeCurtoNucleo(p.nucleoNome) : (p.texto || 'Momento')).slice(0, 14))}</button>`; }).join('')}</div>` : ''}<div class="titulo-sec">Galeria <span class="contador">${comMidia.length} com foto/vídeo · ${lista.length} posts</span></div>${gradeHTML(comMidia, meu ? 'Suas fotos e vídeos de treino aparecem aqui. Toque em + pra publicar.' : 'Ainda sem fotos ou vídeos.')}${lista.filter((p) => !midiasDe(p).length).length ? `<div class="titulo-sec" style="margin-top:6px">Só texto</div>${lista.filter((p) => !midiasDe(p).length).slice(0, 10).map((p) => { const c = postHTML(p); return c; }).join('')}` : ''}`;
else if (perfilAba === 'trajetoria') painel.innerHTML = `<div class="card"><div class="titulo-sec" style="padding:0 0 6px">Sobre</div>${pub.bio ? `<p class="bio">${formatarTexto(pub.bio)}</p>` : `<p class="bio" style="color:var(--muted)">${meu ? 'Conte sua história na capoeira — toque no lápis lá em cima.' : 'Ainda sem biografia.'}</p>`}${pub.cidade ? `<div class="bio-linha"><i class="fas fa-location-dot"></i> ${escapeHTML(pub.cidade)}</div>` : ''}${pub.criadoEm ? `<div class="bio-linha"><i class="far fa-calendar"></i> No grupo desde ${new Date(pub.criadoEm).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>` : ''}${(pub.funcoes || []).length ? `<div class="bio-linha"><i class="fas fa-briefcase"></i> ${pub.funcoes.map(escapeHTML).join(' · ')}</div>` : ''}${r && r.ultima ? `<div class="bio-linha"><i class="fas fa-check"></i> Último treino registrado ${tempoRelativo(r.ultima)}</div>` : ''}</div>
${galeriaCertificadosHTML(pub, meu)}
<div class="titulo-sec">Graduações <span class="contador">linha do tempo</span></div><div class="card">${trajetoriaHTML(pub)}</div>
<div class="titulo-sec">Formação <span class="contador">direto de</span></div>${formacaoHTML(pub)}`;
else painel.innerHTML = `${brasoesResumoHTML(pub)}<div class="progresso" style="margin-top:10px"><div class="l"><span>Prontidão para ${escapeHTML(proximoCordao(pub).nome)}</span><span>${pub.prontidao != null ? pub.prontidao + '%' : '—'}</span></div><div class="barra"><i style="width:${pub.prontidao || 0}%;--c1:${coresCordao(pub)[0]};--c2:${coresCordao(pub)[1]};--c3:${coresCordao(pub)[2]}"></i></div><small>${pub.prontidao == null ? 'Sem notas lançadas pelo responsável ainda.' : pub.prontidao >= 70 ? 'Meta de 70% atingida nos critérios avaliados.' : 'Meta: 70% nos critérios avaliados pelo responsável do núcleo.'}</small></div>
<div class="progresso" style="margin-top:8px"><div class="l"><span>Presenças no mês</span><span>${r ? r.noMes : '—'}</span></div><div class="barra"><i style="width:${r ? Math.min(100, r.noMes * 100 / 12) : 0}%;--c1:#0B5C52;--c2:#389E92;--c3:#00E676"></i></div><small>${r ? `Total registrado pelo Face ID/painel: ${r.total}. Atualizado ${tempoRelativo(r.calculadoEm)}.` : 'Sem presença registrada — as conquistas destravam a partir das presenças do Face ID.'}</small></div>`;
painel.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(lista.find((p) => p.id === b.dataset.abrirPost))));
};
desenhar();
const abas = el('abasPerfil'); if (abas) abas.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; perfilAba = b.dataset.a; abas.querySelectorAll('button').forEach((x) => x.classList.toggle('ativa', x === b)); desenhar(); });
if (meu) {
// Perfil privado. O botão é guardado ANTES do await: depois dele o
// ev.currentTarget vira null e dava erro (era o "não funciona" do botão).
const swPriv = el('swPriv');
swPriv.setAttribute('role', 'switch'); swPriv.setAttribute('aria-checked', String(!!pub.privado));
swPriv.addEventListener('click', async () => {
const on = !swPriv.classList.contains('on');
swPriv.classList.toggle('on', on); swPriv.disabled = true; // resposta na hora; desfaz se o banco recusar
try {
await updateDoc(doc(db, 'perfisPublicos', uid), { privado: on, atualizadoEm: new Date().toISOString() });
if (meuPub) meuPub.privado = on; pubCache.delete(uid);
swPriv.setAttribute('aria-checked', String(on));
el('privTxt').textContent = on ? 'Só quem você aceitar vê seus posts e momentos' : 'Toda a rede vê seus posts e momentos';
toast(on ? 'Perfil privado: só quem você aceitar vê seus momentos.' : 'Perfil aberto para a rede.');
} catch (e) { console.error(e); swPriv.classList.toggle('on', !on); toast('Não foi possível alterar a privacidade agora.'); }
finally { swPriv.disabled = false; }
});
el('btnFotoPerfil').addEventListener('click', () => el('inputFotoPerfil').click());
el('btnCapa').addEventListener('click', () => el('inputCapa').click());
el('btnEditarBio').addEventListener('click', () => editarBio(pub));
el('btnAjustes').addEventListener('click', () => ir('ajustes'));
if (el('listaPedidos')) renderPedidos(pub);
} else {
el('btnSeguir').addEventListener('click', () => alternarSeguir(pub).then(() => renderPerfil(param, vista)));
el('btnMsgPerfil').addEventListener('click', () => abrirDireta(pub));
}
if (el('btnAprPerfil')) el('btnAprPerfil').addEventListener('click', () => apresentarPessoa(pub, aprPerfil, vista.querySelector('.perfil-topo .avatar')));
}
function formacaoHTML(pub) {
const n = nucleoDe(pub.academiaId); const prof = n && n.professorUid && n.professorUid !== pub.id ? (pubCache.get(n.professorUid) || { id: n.professorUid, nome: n.professorNome || 'Responsável' }) : null;
if (pub.fundador) return '<div class="formador"><span class="avatar" style="background:var(--gold);color:#241900"><i class="fas fa-crown"></i></span><div><b>${escapeHTML(ESCOLA.nomeCurto)}</b><small>Fundador do grupo</small></div></div>';
if (!prof) return '<p class="contador" style="padding:4px">Formador ainda não identificado no cadastro.</p>';
return `<button type="button" class="formador" data-perfil="${escapeHTML(prof.id)}">${avatarHTML(prof)}<div><b>${escapeHTML(prof.nome)}</b><small>Responsável ${n ? `pelo ${escapeHTML(nomeCurtoNucleo(n.nome))}` : ''}</small></div><i class="fas fa-chevron-right" style="margin-left:auto;color:var(--soft)"></i></button>`;
}
function abrirPost(p) {
if (!p) return;
const f = abrirFolha(`<h3>Publicação <button type="button" class="btn-icone" data-m="fechar"><i class="fas fa-xmark"></i></button></h3>${postHTML(p)}`);
const card = f.querySelector('.post'); card.__post = p;
card.addEventListener('click', (ev) => {
const btn = ev.target.closest('[data-acao]'); const pf = ev.target.closest('[data-perfil]'); const ver = ev.target.closest('[data-ver]');
if (pf) { f.remove(); ir(`perfil/${pf.dataset.perfil}`); return; }
if (ver && ver.tagName === 'IMG') { abrirMidia(`<img src="${escapeHTML(ver.src)}" alt="">`); return; }
if (!btn) return;
if (btn.dataset.acao === 'menu') { f.remove(); menuPost(p, card); return; }
acaoNoPost(p, card, btn, ev);
});
card.addEventListener('submit', (ev) => { const form = ev.target.closest('[data-form-comentario]'); if (!form) return; ev.preventDefault(); comentar(p, card, form); });
}
async function alternarSeguir(pub) {
const alvo = pub.id; const ja = seguindo.has(alvo);
try {
if (ja) {
await atualizar('usuarios', uid, { seguindo: arrayRemove(alvo) }); seguindo.delete(alvo);
try { await updateDoc(doc(db, 'perfisPublicos', alvo), { seguidores: arrayRemove(uid) }); } catch (e) { /* ok */ }
toast('Você deixou de seguir.');
} else if (pub.privado && !ehModerador()) {
await updateDoc(doc(db, 'perfisPublicos', alvo), { pedidosSeguir: arrayUnion(uid) }); toast('Pedido enviado. Quando aceitar, você passa a ver os momentos.');
} else {
await atualizar('usuarios', uid, { seguindo: arrayUnion(alvo) }); seguindo.add(alvo);
try { await updateDoc(doc(db, 'perfisPublicos', alvo), { seguidores: arrayUnion(uid) }); } catch (e) { /* ok */ }
toast('Agora você segue essa pessoa!');
}
pubCache.delete(alvo);
try { await updateDoc(doc(db, 'perfisPublicos', uid), { seguindoCount: seguindo.size }); } catch (e) { /* ok */ }
} catch (e) { console.error(e); toast('Não foi possível atualizar.'); }
}
async function renderPedidos(pub) {
const box = el('listaPedidos'); const pedidos = await Promise.all((pub.pedidosSeguir || []).map(pubDe));
box.innerHTML = pedidos.filter(Boolean).map((p) => `<div class="pessoa">${avatarHTML(p)}<button type="button" class="q" data-perfil="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</small></button><button type="button" class="btn-navy" data-aceitar="${p.id}">Aceitar</button><button type="button" class="btn-claro" data-recusar="${p.id}">Recusar</button></div>`).join('') || '<p class="contador">Sem pedidos.</p>';
box.addEventListener('click', async (ev) => {
const ac = ev.target.closest('[data-aceitar]'); const rc = ev.target.closest('[data-recusar]'); if (!ac && !rc) return;
const quem = (ac || rc).dataset.aceitar || (ac || rc).dataset.recusar;
try { await updateDoc(doc(db, 'perfisPublicos', uid), ac ? { pedidosSeguir: arrayRemove(quem), seguidores: arrayUnion(quem) } : { pedidosSeguir: arrayRemove(quem) }); (ac || rc).closest('.pessoa').remove(); toast(ac ? 'Agora essa pessoa segue você.' : 'Pedido recusado.'); } catch (e) { toast('Não foi possível responder.'); }
});
}
function editarBio(pub) {
abrirFolha(`<h3>Editar perfil <button type="button" class="btn-icone" data-m="fechar"><i class="fas fa-xmark"></i></button></h3>
<form class="form-bio" id="formBio">
<label>Apelido de capoeira</label><input name="apelido" maxlength="30" value="${escapeHTML(pub.apelido || '')}" placeholder="ex.: Formiga">
<label>Sobre você (biografia do atleta)</label><textarea name="bio" maxlength="600" placeholder="Como começou, o que te move na capoeira, metas…">${escapeHTML(pub.bio || '')}</textarea>
<label>Funções no grupo (separe por vírgula)</label><input name="funcoes" maxlength="120" value="${escapeHTML((pub.funcoes || []).join(', '))}" placeholder="ex.: bateria, auxiliar da turma kids">
<label>Cidade</label><input name="cidade" maxlength="60" value="${escapeHTML(pub.cidade || perfil.cidade || '')}">
<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="submit" class="btn-verde">Salvar</button></div>
</form>
<div class="conta-atalhos"><button type="button" class="btn-claro" id="btnBioSenha"><i class="fas fa-key"></i> Trocar senha</button>${podeTerApresentacao(perfil) ? '<button type="button" class="btn-claro btn-apresentacao" id="btnBioApr"><i class="fas fa-play"></i> Minha apresentação</button>' : ''}</div>`);
el('btnBioSenha').addEventListener('click', () => abrirTrocaSenha());
if (el('btnBioApr')) el('btnBioApr').addEventListener('click', () => gerenciarApresentacao({ ...perfil, id: uid }, { extras: { direto: rotuloDiretoDe(pub), nucleoNome: (nucleoDe(perfil.academiaGerenciadaId) || {}).nome || '' }, aoMudar: () => renderPerfil(null, el('vista')) }));
el('formBio').addEventListener('submit', async (ev) => {
ev.preventDefault(); const fd = new FormData(ev.target);
const dados = { apelido: String(fd.get('apelido') || '').trim().slice(0, 30), bio: String(fd.get('bio') || '').trim().slice(0, 600), funcoes: String(fd.get('funcoes') || '').split(',').map((s) => s.trim().slice(0, 40)).filter(Boolean).slice(0, 6), cidade: String(fd.get('cidade') || '').trim().slice(0, 60), atualizadoEm: new Date().toISOString() };
if (barrarOfensa(`${dados.apelido} ${dados.bio} ${dados.funcoes.join(' ')}`)) return;
try { await updateDoc(doc(db, 'perfisPublicos', uid), dados); Object.assign(meuPub, dados); pubCache.delete(uid); document.querySelector('.folha')?.remove(); toast('Perfil atualizado.'); renderPerfil(null, el('vista')); } catch (e) { toast('Não foi possível salvar.'); }
});
}
async function trocarFotoPerfil(file) {
toast('Comprimindo a foto…');
try {
const img = await comprimirAdaptativo(file, 540, 120);
const url = await salvarFotoPerfil(uid, img.dataUrl);
await atualizar('usuarios', uid, { fotoUrl: url }); perfil.fotoUrl = url; pubCache.delete(uid);
toast('Foto atualizada. Em instantes aparece em todo o app.'); setTimeout(() => renderPerfil(null, el('vista')), 1500);
} catch (e) { console.error(e); toast('Não foi possível trocar a foto.'); }
}
async function trocarCapa(file) {
toast('Comprimindo a capa…');
try {
const img = await comprimirAdaptativo(file, 1400, 260);
const url = await subirDataUrl(`rede/${uid}/capa_${Date.now()}.jpg`, img.dataUrl);
await updateDoc(doc(db, 'perfisPublicos', uid), { capaUrl: url }); pubCache.delete(uid);
toast(`Capa atualizada (${fmtKB(img.original)} → ${fmtKB(img.final)}).`); renderPerfil(null, el('vista'));
} catch (e) { console.error(e); toast('Não foi possível trocar a capa.'); }
}

/* ===================== PÁGINA DO NÚCLEO ===================== */
let nucleoAba = 'momentos';
async function renderNucleo(id, vista) {
const n = nucleoDe(id) || await buscar('nucleos', id);
if (!n) { vista.innerHTML = '<div class="vazio"><i class="fas fa-people-group"></i><b>Núcleo não encontrado</b></div>'; return; }
el('tituloTopo').textContent = n.nome;
const [snapPosts, atletas, prof] = await Promise.all([
getDocs(query(collection(db, 'posts'), ...(await ondeEscola()), where('nucleoId', '==', id), ...(gerencia(id) || ehModerador() ? [] : [where('publico', '==', true)]), limit(90))),
pubsDeNucleo(id, 80), n.professorUid ? pubDe(n.professorUid) : Promise.resolve(null),
]);
const aprNucleo = n.professorUid ? await apresentacaoDe(n.professorUid) : null;
await Promise.all(Array.from(new Set(snapPosts.docs.map((d) => d.data().autorUid))).map(pubDe));
const lista = snapPosts.docs.map((d) => ({ id: d.id, ...d.data() })).filter(visivelParaMim).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
guardarAvulsos(lista);
const momentos = lista.filter((p) => p.melhorMomento && midiasDe(p).length);
const avisosNuc = lista.filter((p) => p.tipo === 'aviso');
const ordemAtletas = atletas.slice().sort((a, b) => (ORDEM_CORDOES.indexOf(b.cordaoAtual) - ORDEM_CORDOES.indexOf(a.cordaoAtual)) || String(a.nome).localeCompare(String(b.nome)));
vista.innerHTML = `
<div class="nucleo-cabecalho"><span class="avatar"><i class="fas fa-people-group"></i></span><div style="flex:1;min-width:0"><span class="eyebrow" style="color:rgba(255,255,255,.75)">Núcleo</span><h2>${escapeHTML(n.nome)}</h2>${prof ? `<small>Responsável: ${escapeHTML(prof.nome)}</small>` : (n.professorNome ? `<small>Responsável: ${escapeHTML(n.professorNome)}</small>` : '')}${n.endereco || (n.latitude && n.longitude) ? `<a class="nucleo-endereco" href="${escapeHTML(linkMapa(n))}" target="_blank" rel="noopener" title="Abrir rota no mapa"><i class="fas fa-location-dot"></i> ${escapeHTML(n.endereco || 'Ver no mapa')} <i class="fas fa-diamond-turn-right"></i></a>` : ''}<div class="pills"><span class="pill"><i class="fas fa-users"></i> ${atletas.length} na rede</span><span class="pill"><i class="fas fa-star"></i> ${momentos.length} momentos</span>${perfil.academiaId === id ? '<span class="pill"><i class="fas fa-house"></i> seu núcleo</span>' : ''}</div><div class="nucleo-botoes">${aprNucleo ? '<button type="button" class="btn-apresentacao-nucleo" id="btnAprNucleo"><i class="fas fa-play"></i> Ver apresentação</button>' : ''}${gerencia(id) || (ehModerador() && meuNucleoGerenciado() === id) ? '<button type="button" class="btn-apresentacao-nucleo btn-postar-nucleo" id="btnPostarNucleo"><i class="fas fa-pen"></i> Postar como o núcleo</button>' : ''}</div></div></div>
<div class="abas" id="abasNucleo">${[['momentos', 'Momentos'], ['posts', 'Publicações'], ['atletas', 'Atletas']].map(([k, t]) => `<button type="button" data-a="${k}" class="${nucleoAba === k ? 'ativa' : ''}">${t}</button>`).join('')}</div>
<div id="painelNucleo"></div>`;
const painel = el('painelNucleo');
const desenhar = () => {
if (nucleoAba === 'momentos') painel.innerHTML = `${prof ? `<button type="button" class="formador" data-perfil="${escapeHTML(prof.id)}">${anelHTML(prof)}<div><b>${escapeHTML(prof.nome)}</b><small>${escapeHTML(prof.cordaoAtual || '')} · responsável do núcleo</small></div><i class="fas fa-chevron-right" style="margin-left:auto;color:var(--soft)"></i></button>` : ''}<div class="titulo-sec">Melhores momentos do núcleo <span class="pill gold">${momentos.length}</span></div>${gradeHTML(momentos, 'Quando alguém do núcleo marcar um post como "melhor momento", ele fica guardado aqui.')}`;
else if (nucleoAba === 'posts') painel.innerHTML = `${avisosNuc.length ? avisosNuc.slice(0, 2).map(postHTML).join('') : ''}${lista.filter((p) => p.tipo !== 'aviso').map(postHTML).join('') || '<div class="vazio"><i class="fas fa-pen"></i>Nenhuma publicação marcada com este núcleo ainda.</div>'}`;
else painel.innerHTML = `<div class="card">${ordemAtletas.map((p) => `<div class="pessoa">${anelHTML(p)}<button type="button" class="q" data-perfil="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${escapeHTML(p.cordaoAtual || '')}${p.academiaGerenciadaId ? ' · responsável de núcleo' : ''}${p.privado ? ' · privado' : ''}</small></button>${p.id !== uid ? `<button type="button" class="${seguindo.has(p.id) ? 'btn-claro' : 'btn-navy'}" data-seguir="${p.id}">${seguindo.has(p.id) ? 'Seguindo' : (p.privado ? 'Pedir' : 'Seguir')}</button>` : ''}</div>`).join('') || '<p class="contador">Ninguém deste núcleo abriu a rede ainda.</p>'}</div>`;
painel.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(lista.find((p) => p.id === b.dataset.abrirPost))));
painel.querySelectorAll('[data-seguir]').forEach((b) => b.addEventListener('click', async () => { const p = atletas.find((x) => x.id === b.dataset.seguir); await alternarSeguir(p); desenhar(); }));
};
desenhar();
if (el('btnPostarNucleo')) el('btnPostarNucleo').addEventListener('click', () => ir('publicar/nucleo'));
if (el('btnAprNucleo')) el('btnAprNucleo').addEventListener('click', () => apresentarPessoa(prof || { id: n.professorUid, nome: n.professorNome || '' }, aprNucleo, null));
el('abasNucleo').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; nucleoAba = b.dataset.a; el('abasNucleo').querySelectorAll('button').forEach((x) => x.classList.toggle('ativa', x === b)); desenhar(); });
}

/* ===================== EXPLORAR ===================== */
async function renderExplorar(param, vista) {
el('tituloTopo').textContent = 'Explorar';
if (!posts.length) { try { await carregarPosts(false); } catch (e) { /* segue */ } }
let eventos = []; try { eventos = (await listar('eventos')).filter((e) => e.data && new Date(e.data + 'T23:59:59') >= hoje0()).sort((a, b) => a.data.localeCompare(b.data)); } catch (e) { /* sem eventos */ }
const tags = {}; posts.forEach((p) => extrairHashtags(p.texto).forEach((t) => { tags[t] = (tags[t] || 0) + 1; }));
const topTags = Object.entries(tags).sort((a, b) => b[1] - a[1]).slice(0, 8);
const comMidia = filtrarPosts(posts).filter((p) => midiasDe(p).length).slice(0, 12);
let sugeridos = []; try { sugeridos = perfil.academiaId ? (await pubsDeNucleo(perfil.academiaId, 40)).filter((p) => p.id !== uid && !seguindo.has(p.id)).slice(0, 5) : []; } catch (e) { /* ok */ }
const ev = eventos[0];
let confirmados = null; if (ev) { try { confirmados = await getDocs(collection(db, 'eventos', ev.id, 'confirmados')); } catch (e) { confirmados = null; } }
const euVou = confirmados ? confirmados.docs.some((d) => d.id === uid) : false;
vista.innerHTML = `
<div class="busca"><i class="fas fa-magnifying-glass" style="color:var(--soft)"></i><input id="buscaPessoa" type="search" placeholder="Atletas, núcleos, #hashtags…" autocomplete="off"></div>
<div id="resultadoBusca"></div>
${topTags.length ? `<div class="chips">${topTags.map(([t, n]) => `<button type="button" class="pill ${n > 1 ? 'teal' : 'neutra'} hash" data-hash="${escapeHTML(t)}">#${escapeHTML(t)} <span class="mono" style="opacity:.7">${n}</span></button>`).join('')}</div>` : ''}
${ev ? `<div class="evento"><div class="data"><b>${ev.data.slice(8, 10)}</b><small>${new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</small></div><b class="n">${escapeHTML(ev.nome || 'Evento')}</b><small>${ev.descricao ? escapeHTML(ev.descricao) + ' · ' : ''}${nucleoDe(ev.academiaId) ? escapeHTML(nomeCurtoNucleo(nucleoDe(ev.academiaId).nome)) : 'Grupo'}${confirmados ? ` · ${confirmados.size} confirmado${confirmados.size === 1 ? '' : 's'}` : ''}</small><div class="acoes-ev"><button type="button" class="btn-claro" id="btnEuVou">${euVou ? '<i class="fas fa-check"></i> Eu vou' : '<i class="far fa-calendar-check"></i> Eu vou'}</button><button type="button" class="btn-claro" data-agenda="${escapeHTML(ev.id)}">Detalhes</button>${eventos.length > 1 ? `<button type="button" class="pill" data-agenda="" style="background:rgba(255,255,255,.18);color:#fff;border:0">+${eventos.length - 1} evento${eventos.length > 2 ? 's' : ''}</button>` : ''}</div></div>` : `<button type="button" class="btn-mais" data-agenda=""><i class="far fa-calendar"></i> Agenda de eventos e álbuns</button>`}
<div class="titulo-sec">Núcleos da rede</div>
<div class="nucleos">${nucleos.filter((n) => n.ativo !== false).map((n) => `<button type="button" class="nuc" data-nucleo="${escapeHTML(n.id)}"><span class="avatar" style="background:${corAvatar(n.id)}"><i class="fas fa-people-group"></i></span><b>${escapeHTML(n.nome)}</b><small>${n.professorNome ? escapeHTML(n.professorNome) : ''}</small>${n.id === perfil.academiaId ? '<span class="pill teal">seu núcleo</span>' : (n.professorUid && (pubCache.get(n.professorUid) || {}).fundador ? '<span class="pill gold">Fundador</span>' : '')}</button>`).join('')}</div>
${sugeridos.length ? `<div class="titulo-sec">Sugestões pra você <span class="contador">do seu núcleo</span></div><div class="card" id="sugestoes">${sugeridos.map((p) => `<div class="pessoa">${anelHTML(p)}<button type="button" class="q" data-perfil="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</small></button><button type="button" class="btn-navy" data-seguir="${p.id}">${p.privado ? 'Pedir' : 'Seguir'}</button></div>`).join('')}</div>` : ''}
<div class="titulo-sec">Momentos da rede <span class="contador">recentes</span></div>
${comMidia.length ? `<div class="mosaico">${comMidia.map((p) => { const m = midiasDe(p)[0]; return `<button type="button" data-abrir-post="${p.id}">${m.tipo === 'video' ? `<video src="${escapeHTML(m.url)}" muted preload="metadata"></video>` : `<img src="${escapeHTML(m.url)}" alt="" loading="lazy">`}</button>`; }).join('')}</div>` : '<div class="vazio"><i class="fas fa-image"></i>Ainda não há fotos publicadas na rede.</div>'}`;
vista.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(posts.find((p) => p.id === b.dataset.abrirPost))));
vista.querySelectorAll('[data-seguir]').forEach((b) => b.addEventListener('click', async () => { await alternarSeguir(sugeridos.find((x) => x.id === b.dataset.seguir)); b.textContent = seguindo.has(b.dataset.seguir) ? 'Seguindo' : 'Seguir'; }));
if (ev && el('btnEuVou')) el('btnEuVou').addEventListener('click', async () => { try { if (euVou) await deleteDoc(doc(db, 'eventos', ev.id, 'confirmados', uid)); else await setDoc(doc(db, 'eventos', ev.id, 'confirmados', uid), { nome: perfil.nome || '', em: new Date().toISOString(), academiaId: perfil.academiaId || null, cordaoAtual: (meuPub && meuPub.cordaoAtual) || perfil.cordaoAtual || '', fotoUrl: /^https:/.test(perfil.fotoUrl || '') ? perfil.fotoUrl : '' }); renderExplorar(null, vista); } catch (e) { toast('Não foi possível confirmar (regras do Firestore).'); } });
let timer = null;
el('buscaPessoa').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => buscar_(e.target.value), 300); });
async function buscar_(termo) {
const box = el('resultadoBusca'); const q = termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
if (!q) { box.innerHTML = ''; return; }
if (q.startsWith('#')) { ir(`tag/${q.slice(1)}`); return; }
const nucs = nucleos.filter((n) => String(n.nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
let pessoas = []; try { pessoas = (await getDocs(query(collection(db, 'perfisPublicos'), ...(await ondeEscola()), where('nomeBusca', '>=', q), where('nomeBusca', '<=', q + ''), limit(12)))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { /* ok */ }
box.innerHTML = `<div class="card">${nucs.map((n) => `<div class="pessoa"><span class="avatar" style="border-radius:12px;background:${corAvatar(n.id)}"><i class="fas fa-people-group"></i></span><button type="button" class="q" data-nucleo="${escapeHTML(n.id)}"><b>${escapeHTML(n.nome)}</b><small>núcleo</small></button></div>`).join('')}${pessoas.map((p) => `<div class="pessoa">${anelHTML(p)}<button type="button" class="q" data-perfil="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</small></button></div>`).join('') || (nucs.length ? '' : '<p class="contador" style="padding:6px">Ninguém encontrado.</p>')}</div>`;
}
}
async function renderTag(tag, vista) {
el('tituloTopo').textContent = `#${tag}`;
if (!posts.length) await carregarPosts(false);
const lista = filtrarPosts(posts).filter((p) => extrairHashtags(p.texto).includes(tag));
vista.innerHTML = `<div class="titulo-sec"><span>#${escapeHTML(tag)}</span><span class="contador">${lista.length} post${lista.length === 1 ? '' : 's'} carregados</span></div>${lista.map(postHTML).join('') || '<div class="vazio"><i class="fas fa-hashtag"></i>Nenhum post carregado com essa hashtag.</div>'}`;
}

/* ===================== PUBLICAR ===================== */
let composicao = { midias: [], melhorMomento: false, nucleoId: null, marcados: [], visibilidade: 'rede', aviso: false };
async function renderPublicar(param, vista) {
el('tituloTopo').textContent = 'Nova publicação';
composicao = { midias: [], melhorMomento: false, nucleoId: perfil.academiaId || null, marcados: [], visibilidade: 'rede', aviso: false, hoje: null, comoNucleo: false, mencoes: new Map(), eventoId: null, eventoNome: '' };
// Eventos de até 10 dias atrás (ou de hoje): o post pode entrar no álbum do evento.
let eventosRecentes = []; try { const h = hoje0(); eventosRecentes = (await listar('eventos')).filter((e) => e.data && new Date(e.data + 'T12:00:00') <= new Date(h.getTime() + 86400000) && new Date(e.data + 'T12:00:00') >= new Date(h.getTime() - 10 * 86400000)).sort((a, b) => b.data.localeCompare(a.data)); } catch (e) { /* sem eventos */ }
const podeComoNucleo = !!meuNucleoGerenciado() && (ehGestor() || ehModerador());
if (param === 'nucleo' && podeComoNucleo) { composicao.comoNucleo = true; }
// Núcleo/treino sugerido pela presença real de hoje (Face ID / painel)
try { const pres = await presencasDoUsuario(uid, 10); const h = hoje0(); const deHoje = pres.find((p) => dataDe(p.entradaEm) >= h); if (deHoje) { composicao.hoje = deHoje; composicao.nucleoId = deHoje.nucleoVisitadoId || deHoje.nucleoId || composicao.nucleoId; } } catch (e) { /* sem leitura */ }
let colegas = []; try { colegas = (await pubsDeNucleo(composicao.nucleoId || perfil.academiaId, 60)).filter((p) => p.id !== uid); } catch (e) { /* ok */ }
if (composicao.comoNucleo) composicao.nucleoId = meuNucleoGerenciado();
const nucSel = nucleoDe(composicao.nucleoId);
const nucMeu = nucleoDe(meuNucleoGerenciado());
vista.innerHTML = `<div class="card compor">
<div class="quem" id="quemPublica">${composicao.comoNucleo ? `<span class="anel anel-nucleo"><span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span></span>` : anelHTML({ ...perfil, id: uid })}<div><b id="quemNome">${escapeHTML(composicao.comoNucleo ? (nucMeu ? nucMeu.nome : 'Meu núcleo') : (perfil.nome || ''))}</b><button type="button" class="visib" id="btnVisib"><i class="fas fa-users"></i> <span>Toda a rede</span> ▾</button></div></div>
<textarea id="texto" maxlength="${LIMITE_TEXTO}" placeholder="O que rolou no treino hoje? Use #hashtags e @nomes"></textarea>
<div style="display:flex;justify-content:space-between;align-items:center"><span class="contador" id="contador">0/${LIMITE_TEXTO}</span><span class="contador" id="pesoInfo"></span></div>
<div class="midias-sel" id="midiasSel"></div>
<div class="opcoes">
<div class="opc"><div class="ic g"><i class="fas fa-star"></i></div><div class="t"><b>Marcar como melhor momento</b><small>Vai pros seus destaques e pros momentos do núcleo, com selo dourado</small></div><button type="button" class="switch cinza" id="swMomento" aria-label="Melhor momento"></button></div>
<div class="opc"><div class="ic n"><i class="fas fa-location-dot"></i></div><div class="t"><b>Núcleo do treino</b><small id="nucInfo">${composicao.hoje ? `Detectado pela sua presença de hoje às ${dataDe(composicao.hoje.entradaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sem presença registrada hoje — escolha o núcleo'}</small></div><select id="selNucleo">${nucleos.filter((n) => n.ativo !== false).map((n) => `<option value="${escapeHTML(n.id)}" ${n.id === composicao.nucleoId ? 'selected' : ''}>${escapeHTML(nomeCurtoNucleo(n.nome))}</option>`).join('')}<option value="" ${!composicao.nucleoId ? 'selected' : ''}>Sem núcleo</option></select></div>
<div class="opc" style="flex-wrap:wrap"><div class="ic"><i class="fas fa-user-tag"></i></div><div class="t"><b>Marcar atletas</b><small id="marcInfo">${colegas.length ? 'Toque pra marcar quem estava no treino' : 'Ninguém do núcleo abriu a rede ainda'}</small></div><span class="val mono" id="marcQtd">0</span><div class="marcar-lista" id="marcarLista" style="width:100%">${colegas.map((c) => `<button type="button" class="pill" data-marcar="${c.id}" data-img="${c.usoImagemOk ? '1' : '0'}">${escapeHTML(c.nome.split(' ').slice(0, 2).join(' '))}${c.usoImagemOk ? '' : ' <i class="fas fa-eye-slash" title="sem termo de imagem"></i>'}</button>`).join('')}</div></div>
<div class="opc"><div class="ic"><i class="fas fa-shield-halved"></i></div><div class="t"><b>Proteger rostos</b><small id="rostosInfo">Detecta rostos nas fotos e deixa você desfocar quem não autorizou imagem</small></div><button type="button" class="val" id="btnRostos" disabled>Detectar</button></div>
${eventosRecentes.length ? `<div class="opc"><div class="ic g"><i class="fas fa-images"></i></div><div class="t"><b>Álbum do evento</b><small>As fotos entram no álbum do evento, com quem você marcou</small></div><select id="selEvento" aria-label="Álbum do evento"><option value="">Nenhum</option>${eventosRecentes.map((e) => `<option value="${escapeHTML(e.id)}">${escapeHTML(e.nome || 'Evento')} · ${escapeHTML(e.data.slice(8, 10) + '/' + e.data.slice(5, 7))}</option>`).join('')}</select></div>` : ''}
${podeComoNucleo ? `<div class="opc"><div class="ic" style="background:var(--sky-soft);color:var(--sky-texto)"><i class="fas fa-people-group"></i></div><div class="t"><b>Publicar como o núcleo</b><small>Sai com o nome e o selo de ${escapeHTML(nucMeu ? nomeCurtoNucleo(nucMeu.nome) : 'seu núcleo')} (você aparece como quem publicou)</small></div><button type="button" class="switch cinza ${composicao.comoNucleo ? 'on' : ''}" id="swComoNucleo" aria-label="Publicar como o núcleo"></button></div>` : ''}
${ehGestor() || ehModerador() ? `<div class="opc"><div class="ic" style="background:var(--green-soft);color:#1E8449"><i class="fas fa-bullhorn"></i></div><div class="t"><b>Publicar como aviso do núcleo</b><small>Aparece destacado em verde pra todo mundo no feed</small></div><button type="button" class="switch cinza" id="swAviso" aria-label="Aviso"></button></div>` : ''}
</div>
<div style="margin-top:14px"><button type="button" class="btn-verde" id="btnPublicar" style="width:100%;padding:13px" disabled><i class="fas fa-paper-plane"></i> Publicar na rede</button><p class="contador" style="text-align:center;margin-top:8px">Publique com respeito — o grupo tem crianças. Fotos são comprimidas automaticamente antes de subir.</p></div>
</div>`;
const texto = el('texto');
const atualizar_ = () => { el('contador').textContent = `${texto.value.length}/${LIMITE_TEXTO}`; el('btnPublicar').disabled = !(texto.value.trim() || composicao.midias.length); el('btnRostos').disabled = !composicao.midias.some((m) => m.tipo === 'imagem'); };
texto.addEventListener('input', atualizar_);
ligarMencoes(texto, composicao.mencoes);
const selEv = el('selEvento'); if (selEv) selEv.addEventListener('change', (e) => { const ev = eventosRecentes.find((x) => x.id === e.target.value); composicao.eventoId = ev ? ev.id : null; composicao.eventoNome = ev ? (ev.nome || 'Evento') : ''; });
el('swMomento').addEventListener('click', (e) => { composicao.melhorMomento = !composicao.melhorMomento; e.currentTarget.classList.toggle('on', composicao.melhorMomento); });
const swAviso = el('swAviso'); if (swAviso) swAviso.addEventListener('click', (e) => { composicao.aviso = !composicao.aviso; e.currentTarget.classList.toggle('on', composicao.aviso); if (composicao.aviso && !ehModerador() && meuNucleoGerenciado()) { composicao.nucleoId = meuNucleoGerenciado(); el('selNucleo').value = composicao.nucleoId; } if (composicao.aviso) toast(`Este post vai sair como aviso do núcleo ${nomeCurtoNucleo((nucleoDe(composicao.nucleoId) || {}).nome || '')}.`); });
el('selNucleo').addEventListener('change', (e) => { composicao.nucleoId = e.target.value || null; });
const swComo = el('swComoNucleo');
if (swComo) swComo.addEventListener('click', (e) => {
composicao.comoNucleo = !composicao.comoNucleo; e.currentTarget.classList.toggle('on', composicao.comoNucleo);
if (composicao.comoNucleo) { composicao.nucleoId = meuNucleoGerenciado(); el('selNucleo').value = composicao.nucleoId; }
const q = el('quemPublica'); if (q) { const av = q.querySelector('.anel'); if (av) av.outerHTML = composicao.comoNucleo ? '<span class="anel anel-nucleo"><span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span></span>' : anelHTML({ ...perfil, id: uid }); }
el('quemNome').textContent = composicao.comoNucleo ? ((nucleoDe(meuNucleoGerenciado()) || {}).nome || 'Meu núcleo') : (perfil.nome || '');
});
el('btnVisib').addEventListener('click', () => abrirFolha(`<h3>Quem pode ver</h3><div style="display:grid;gap:8px"><button type="button" class="btn-claro" data-m="rede"><i class="fas fa-users"></i> Toda a rede Liberdade</button><button type="button" class="btn-claro" data-m="nucleo"><i class="fas fa-people-group"></i> Só o meu núcleo</button><button type="button" class="btn-claro" data-m="seguidores"><i class="fas fa-user-check"></i> Só quem me segue</button></div>`, (m) => { composicao.visibilidade = m; el('btnVisib').querySelector('span').textContent = m === 'rede' ? 'Toda a rede' : m === 'nucleo' ? 'Só o núcleo' : 'Só seguidores'; }));
el('marcarLista').addEventListener('click', (ev) => {
const b = ev.target.closest('[data-marcar]'); if (!b) return; const c = colegas.find((x) => x.id === b.dataset.marcar);
const i = composicao.marcados.findIndex((m) => m.uid === c.id);
if (i >= 0) composicao.marcados.splice(i, 1); else composicao.marcados.push({ uid: c.id, nome: c.nome, usoImagemOk: !!c.usoImagemOk, menor: !!c.menor });
b.classList.toggle('on', i < 0); el('marcQtd').textContent = composicao.marcados.length;
if (i < 0 && !c.usoImagemOk) toast(`${c.nome.split(' ')[0]} não tem termo de imagem — use "Proteger rostos" antes de publicar.`);
});
el('btnRostos').addEventListener('click', () => protegerRostos());
el('btnPublicar').addEventListener('click', () => publicar(texto.value.trim()));
desenharMidias(); atualizar_();
}
function desenharMidias() {
const box = el('midiasSel'); if (!box) return;
box.innerHTML = composicao.midias.map((m, i) => `<div class="item">${m.tipo === 'video' ? `<video src="${m.previewUrl}" muted></video>` : `<img src="${m.dataUrl}" alt="">`}<button type="button" class="x" data-rm="${i}" aria-label="Remover"><i class="fas fa-xmark"></i></button>${i === 0 ? '<span class="capa">CAPA</span>' : `<button type="button" class="capa" data-capa="${i}" style="background:rgba(255,255,255,.85)">tornar capa</button>`}<span class="peso">${fmtKB(m.final)}</span>${m.rostos ? `<span class="rostos"><i class="fas fa-shield-halved"></i> ${m.rostos.filter((r) => r.borrado).length}/${m.rostos.length}</span>` : ''}</div>`).join('')
+ (composicao.midias.length < MAX_MIDIAS ? `<button type="button" class="add" id="btnAddMidia"><i class="fas fa-camera" style="font-size:1.1rem"></i>Foto ou vídeo<small style="font-size:.52rem">até ${MAX_MIDIAS}</small></button>` : '');
const add = el('btnAddMidia'); if (add) add.addEventListener('click', () => el('inputMidia').click());
box.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { composicao.midias.splice(Number(b.dataset.rm), 1); desenharMidias(); el('texto').dispatchEvent(new Event('input')); }));
box.querySelectorAll('[data-capa]').forEach((b) => b.addEventListener('click', () => { const [m] = composicao.midias.splice(Number(b.dataset.capa), 1); composicao.midias.unshift(m); desenharMidias(); }));
const eco = composicao.midias.reduce((s, m) => s + (m.original - m.final), 0);
el('pesoInfo').innerHTML = composicao.midias.length ? `<i class="fas fa-leaf" style="color:var(--green)"></i> ${fmtKB(composicao.midias.reduce((s, m) => s + m.final, 0))} pra subir${eco > 0 ? ` · economizou ${fmtKB(eco)}` : ''}` : '';
}
async function adicionarMidias(files) {
for (const f of Array.from(files)) {
if (composicao.midias.length >= MAX_MIDIAS) { toast(`Máximo de ${MAX_MIDIAS} mídias por post.`); break; }
try {
if (f.type.startsWith('video/')) {
if (f.size > VIDEO_BRUTO_MAX_MB * 1024 * 1024) { toast(`Vídeo muito grande (${fmtKB(f.size)}) — grave um trecho mais curto.`); continue; }
const info = await duracaoVideo(f);
if (!(info.dur <= VIDEO_MAX_SEG)) { toast(`Vídeo com mais de ${VIDEO_MAX_SEG} s — corte um trecho curto.`); continue; }
let arquivo = f;
if (f.size > 4 * 1024 * 1024 || Math.max(info.w || 0, info.h || 0) > 1280) {
toast('Comprimindo o vídeo… (leva o tempo do vídeo)');
const menor = await comprimirVideo(f, (pct) => { const pi = el('pesoInfo'); if (pi) pi.textContent = `Comprimindo vídeo… ${pct}%`; });
if (menor) arquivo = menor;
}
if (arquivo.size > VIDEO_MAX_MB * 1024 * 1024) { toast(`Mesmo comprimido o vídeo passou de ${VIDEO_MAX_MB} MB — grave um trecho mais curto.`); continue; }
const capa = await capaDoVideo(arquivo);
composicao.midias.push({ tipo: 'video', arquivo, previewUrl: URL.createObjectURL(arquivo), original: f.size, final: arquivo.size, dur: info.dur, capa });
} else if (f.type.startsWith('image/')) {
toast('Comprimindo…');
const img = await comprimirAdaptativo(f, IMG_MAX_DIM, IMG_ALVO_KB);
composicao.midias.push({ tipo: 'imagem', ...img });
} else toast('Arquivo não suportado.');
} catch (e) { console.error(e); toast('Não consegui ler esse arquivo.'); }
}
desenharMidias(); el('texto').dispatchEvent(new Event('input'));
}
// ---- proteção de rostos (face-api, carregado só quando pedido) ----
let faceapi = null;
async function carregarFaceApi() {
if (faceapi) return faceapi;
toast('Carregando detector de rostos…');
const mod = await import(FACEAPI_URL); faceapi = mod.default || mod;
await faceapi.nets.tinyFaceDetector.loadFromUri(MODELOS_URL);
return faceapi;
}
async function protegerRostos() {
try {
const fa = await carregarFaceApi();
for (const m of composicao.midias) {
if (m.tipo !== 'imagem') continue;
const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = m.dataUrl; });
const det = await fa.detectAllFaces(img, new fa.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }));
// padrão honesto: se há alguém marcado sem termo de imagem, ou o autor é menor, começa tudo desfocado
const comecaBorrado = souMenor() || composicao.marcados.some((x) => !x.usoImagemOk);
m.rostos = det.map((d) => ({ x: d.box.x / img.width, y: d.box.y / img.height, w: d.box.width / img.width, h: d.box.height / img.height, borrado: comecaBorrado }));
m.dataUrlOriginal = m.dataUrlOriginal || m.dataUrl;
}
const total = composicao.midias.reduce((s, m) => s + ((m.rostos || []).length), 0);
if (!total) { toast('Nenhum rosto detectado nas fotos.'); return; }
editorRostos(0);
} catch (e) { console.error(e); toast('Não foi possível carregar o detector (precisa de internet).'); }
}
function editorRostos(idx) {
const imgs = composicao.midias.filter((m) => m.tipo === 'imagem'); const m = imgs[idx]; if (!m) { aplicarDesfoques().then(() => { desenharMidias(); toast('Rostos protegidos.'); }); return; }
const f = abrirFolha(`<h3>Proteger rostos · foto ${idx + 1}/${imgs.length} <button type="button" class="btn-icone" data-m="fechar"><i class="fas fa-xmark"></i></button></h3><p class="contador" style="margin-bottom:8px">Toque num rosto pra alternar nítido/desfocado. Desfoque quem não autorizou o uso de imagem — principalmente crianças.</p><div class="editor-rostos" id="edRostos"><canvas></canvas>${m.rostos.map((r, i) => `<button type="button" class="rosto ${r.borrado ? 'borrado' : ''}" data-r="${i}" style="left:${r.x * 100}%;top:${r.y * 100}%;width:${r.w * 100}%;height:${r.h * 100}%"></button>`).join('')}</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button type="button" class="btn-claro" id="edTodos">Desfocar todos</button><button type="button" class="btn-verde" id="edOk">${idx + 1 < imgs.length ? 'Próxima foto' : 'Concluir'}</button></div>`);
const canvas = f.querySelector('canvas'); const img = new Image(); img.onload = () => { canvas.width = img.width; canvas.height = img.height; canvas.getContext('2d').drawImage(img, 0, 0); }; img.src = m.dataUrlOriginal || m.dataUrl;
f.querySelectorAll('.rosto').forEach((b) => b.addEventListener('click', () => { const r = m.rostos[Number(b.dataset.r)]; r.borrado = !r.borrado; b.classList.toggle('borrado', r.borrado); }));
f.querySelector('#edTodos').addEventListener('click', () => { m.rostos.forEach((r) => { r.borrado = true; }); f.querySelectorAll('.rosto').forEach((b) => b.classList.add('borrado')); });
f.querySelector('#edOk').addEventListener('click', () => { f.remove(); editorRostos(idx + 1); });
}
async function aplicarDesfoques() {
for (const m of composicao.midias) {
if (m.tipo !== 'imagem' || !m.rostos) continue;
const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = m.dataUrlOriginal || m.dataUrl; });
const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
m.rostos.filter((r) => r.borrado).forEach((r) => {
const x = r.x * c.width - r.w * c.width * 0.15, y = r.y * c.height - r.h * c.height * 0.2, w = r.w * c.width * 1.3, h = r.h * c.height * 1.4;
// pixeliza: reduz e amplia de volta a região (funciona em todo navegador, sem filter)
const peq = document.createElement('canvas'); peq.width = Math.max(2, Math.round(w / 14)); peq.height = Math.max(2, Math.round(h / 14));
peq.getContext('2d').drawImage(c, x, y, w, h, 0, 0, peq.width, peq.height);
ctx.imageSmoothingEnabled = false; ctx.drawImage(peq, 0, 0, peq.width, peq.height, x, y, w, h); ctx.imageSmoothingEnabled = true;
});
m.dataUrl = c.toDataURL('image/jpeg', 0.8); m.final = bytesDataUrl(m.dataUrl);
}
}
async function publicar(texto) {
const btn = el('btnPublicar'); if (!texto && !composicao.midias.length) return;
if (texto && barrarOfensa(texto)) return;
// Foto/vídeo precisa do cartão público (o servidor confere se é menor e o cordão).
if (composicao.midias.length && !meuPub) { toast('Seu cartão ainda está sendo preparado pelo servidor — tente de novo em alguns segundos.'); sincronizarPerfilPublico(); return; }
btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando…';
try {
const midias = [];
for (const m of composicao.midias) {
if (m.tipo === 'video') {
const ext = /webm/.test(m.arquivo.type) ? 'webm' : 'mp4';
const r = storageRef(storage, `rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
await uploadBytes(r, m.arquivo, { contentType: m.arquivo.type || 'video/mp4', cacheControl: 'public,max-age=31536000' });
const item = { url: await getDownloadURL(r), tipo: 'video', dur: Math.round(m.dur || 0) };
if (m.capa) { try { item.posterUrl = await subirDataUrl(`rede/${uid}/capa_${Date.now()}.jpg`, m.capa); } catch (e) { /* sem capa */ } }
midias.push(item);
}
else { midias.push({ url: await subirDataUrl(`rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`, m.dataUrl), tipo: 'imagem', w: m.w, h: m.h }); }
}
const semTermo = composicao.marcados.some((x) => !x.usoImagemOk) && !composicao.midias.some((m) => m.rostos && m.rostos.some((r) => r.borrado));
const precisaRevisao = midias.length > 0 && (souMenor() || semTermo);
const comoNucleo = !!composicao.comoNucleo && !!meuNucleoGerenciado() && (ehModerador() || gerencia(composicao.nucleoId));
if (comoNucleo) composicao.nucleoId = meuNucleoGerenciado();
const ehAviso = composicao.aviso && (ehModerador() || gerencia(composicao.nucleoId));
const nuc = nucleoDe(composicao.nucleoId);
const docPost = {
autorUid: uid, autorNome: perfil.nome || '', autorFoto: /^https:/.test(perfil.fotoUrl || '') ? perfil.fotoUrl : '', autorAcademiaId: perfil.academiaId || null, autorAcademiaNome: perfil.academiaNome || '', autorCordao: (meuPub && meuPub.cordaoAtual) || '',
autorMenor: !!souMenor(), texto, fotoUrl: midias.find((m) => m.tipo === 'imagem')?.url || null, midias,
tipo: ehAviso ? 'aviso' : 'post', melhorMomento: !!composicao.melhorMomento && !ehAviso,
nucleoId: nuc ? nuc.id : null, nucleoNome: nuc ? nuc.nome : '', marcados: composicao.marcados.map((m) => ({ uid: m.uid, nome: m.nome })),
visibilidade: composicao.visibilidade, hashtags: extrairHashtags(texto), revisao: precisaRevisao ? 'pendente' : 'ok',
oculto: false, publico: !precisaRevisao,
criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0,
...(mencoesDoTexto(texto, composicao.mencoes).length ? { mencoes: mencoesDoTexto(texto, composicao.mencoes) } : {}),
...(composicao.eventoId ? { eventoId: composicao.eventoId, eventoNome: composicao.eventoNome } : {}),
...(comoNucleo ? { comoNucleo: true } : {}),
};
await addDoc(collection(db, 'posts'), await talvezComEscola(docPost));
posts = []; ultimoDoc = null; filtroFeed = 'rede';
toast(precisaRevisao ? 'Publicado! O responsável do núcleo vai revisar as fotos.' : ESCOLA.frasePublicado);
ir('feed');
} catch (e) {
console.error(e);
toast(explicarErro(e, 'a publicação'));
btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar na rede';
}
}

/* ===================== MENSAGENS ===================== */
const chaveDireta = (a, b) => [a, b].sort().join('__');
async function abrirDireta(pub) {
const id = chaveDireta(uid, pub.id);
try {
const s = await getDoc(doc(db, 'conversas', id));
if (!s.exists()) {
await setDoc(doc(db, 'conversas', id), await talvezComEscola({
tipo: 'direta', participantes: [uid, pub.id], nomes: { [uid]: perfil.nome || '', [pub.id]: pub.nome || '' }, fotos: { [uid]: perfil.fotoUrl || '', [pub.id]: pub.fotoUrl || '' },
nucleosIds: Array.from(new Set([perfil.academiaId, pub.academiaId].filter(Boolean))), envolveMenor: !!(souMenor() || pub.menor),
criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), ultimaMsg: '', ultimoAutor: null,
}));
}
ir(`mensagens/${id}`);
} catch (e) { console.error(e); toast(pub.menor || souMenor() ? 'Conversa não permitida: menores só falam com o próprio núcleo.' : 'Não foi possível abrir a conversa (regras do Firestore).'); }
}
// Cada consulta carrega SÓ a cláusula que a regra do Firestore consegue provar
// (array-contains em participantes; tipo == 'grupo' + nucleoId; nucleosIds).
// Uma consulta negada não derruba as outras.
async function minhasConversas() {
const tentar = async (q) => { try { return (await getDocs(q)).docs; } catch (e) { console.warn('conversas', e && e.code, e && e.message); return []; } };
const consultas = [tentar(query(collection(db, 'conversas'), where('participantes', 'array-contains', uid), limit(50)))];
if (perfil.academiaId) consultas.push(tentar(query(collection(db, 'conversas'), where('tipo', '==', 'grupo'), where('nucleoId', '==', perfil.academiaId), limit(5))));
if (ehGestor()) consultas.push(tentar(query(collection(db, 'conversas'), where('tipo', '==', 'grupo'), where('nucleoId', '==', meuNucleoGerenciado()), limit(5))));
// Pai/mãe cadastrado como responsável legal acompanha as conversas do filho menor.
consultas.push(tentar(query(collection(db, 'conversas'), where('responsaveisIds', 'array-contains', uid), limit(40))));
const partes = await Promise.all(consultas);
const mapa = new Map(); partes.flat().forEach((x) => mapa.set(x.id, { id: x.id, ...x.data() }));
return Array.from(mapa.values()).sort((a, b) => new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0));
}
async function garantirGrupoDoNucleo() {
if (!ehGestor()) return;
const nid = meuNucleoGerenciado(); const id = `nucleo_${nid}`;
try { const s = await getDoc(doc(db, 'conversas', id)); if (!s.exists()) await setDoc(doc(db, 'conversas', id), await talvezComEscola({ tipo: 'grupo', nucleoId: nid, nome: (nucleoDe(nid) || {}).nome || 'Meu núcleo', participantes: [uid], nucleosIds: [nid], criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), ultimaMsg: 'Grupo do núcleo criado', ultimoAutor: uid })); } catch (e) { /* ok */ }
}
const acompanho = (c) => c.tipo === 'direta' && !(c.participantes || []).includes(uid) && (c.responsaveisIds || []).includes(uid);
function nomeConversa(c) { if (c.tipo === 'grupo') return c.nome || 'Grupo'; if (acompanho(c)) return (c.participantes || []).map((u) => String((c.nomes || {})[u] || '').split(' ')[0]).join(' e '); const outro = (c.participantes || []).find((p) => p !== uid) || uid; return (c.nomes || {})[outro] || 'Conversa'; }
function fotoConversa(c) { if (c.tipo === 'grupo') return null; const outro = (c.participantes || []).find((p) => p !== uid); return { id: outro, nome: nomeConversa(c), fotoUrl: (c.fotos || {})[outro] || '' }; }
async function renderMensagens(param, vista) {
if (param) return renderChat(param, vista);
el('tituloTopo').textContent = 'Mensagens';
await garantirGrupoDoNucleo();
const lista = await minhasConversas();
const lidas = JSON.parse(localStorage.getItem('rede.lidas') || '{}');
vista.innerHTML = `<div class="busca"><i class="fas fa-magnifying-glass" style="color:var(--soft)"></i><input id="buscaConv" type="search" placeholder="Buscar atleta pra conversar…" autocomplete="off"></div><div id="resConv"></div>
<div class="card">${lista.filter((c) => !acompanho(c)).map((c) => { const f = fotoConversa(c); const nova = c.atualizadoEm && (!lidas[c.id] || lidas[c.id] < c.atualizadoEm) && c.ultimoAutor && c.ultimoAutor !== uid; return `<button type="button" class="conv ${c.tipo === 'grupo' ? 'grupo' : ''}" data-conv="${c.id}">${c.tipo === 'grupo' ? `<span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span>` : avatarHTML(f)}<div class="q"><b>${escapeHTML(nomeConversa(c))}</b><small>${escapeHTML(c.ultimaMsg || 'Sem mensagens ainda')}</small></div><div class="meta">${c.atualizadoEm ? tempoRelativo(c.atualizadoEm) : ''}${nova ? '<br><span class="n">•</span>' : ''}</div></button>`; }).join('') || '<div class="vazio" style="border:0"><i class="far fa-comment"></i><b>Nenhuma conversa ainda</b>Abra o perfil de um atleta e toque no balão pra conversar.</div>'}</div>
${lista.some(acompanho) ? `<div class="titulo-sec">Conversas que você acompanha <span class="contador">responsável legal</span></div><div class="card">${lista.filter(acompanho).map((c) => `<button type="button" class="conv" data-conv="${c.id}"><span class="avatar" style="background:var(--gold);color:#241900"><i class="fas fa-user-shield"></i></span><div class="q"><b>${escapeHTML(nomeConversa(c))}</b><small>${escapeHTML(c.ultimaMsg || 'Sem mensagens ainda')}</small></div><div class="meta">${c.atualizadoEm ? tempoRelativo(c.atualizadoEm) : ''}</div></button>`).join('')}</div>` : ''}
<p class="contador" style="text-align:center;padding:0 12px"><i class="fas fa-shield-halved"></i> Menores conversam só com pessoas do próprio núcleo, e o responsável legal (pai, mãe ou quem estiver cadastrado) pode acompanhar as conversas do filho.</p>`;
vista.querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => ir(`mensagens/${b.dataset.conv}`)));
let timer = null;
el('buscaConv').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(async () => {
const q = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); const box = el('resConv'); if (!q) { box.innerHTML = ''; return; }
try { const pessoas = (await getDocs(query(collection(db, 'perfisPublicos'), ...(await ondeEscola()), where('nomeBusca', '>=', q), where('nomeBusca', '<=', q + ''), limit(10)))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== uid);
box.innerHTML = `<div class="card">${pessoas.map((p) => `<div class="pessoa">${anelHTML(p)}<button type="button" class="q" data-abrir-direta="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</small></button><i class="far fa-comment" style="color:var(--teal)"></i></div>`).join('') || '<p class="contador" style="padding:6px">Ninguém encontrado.</p>'}</div>`;
box.querySelectorAll('[data-abrir-direta]').forEach((b) => b.addEventListener('click', () => abrirDireta(pessoas.find((p) => p.id === b.dataset.abrirDireta))));
} catch (err) { /* ok */ }
}, 300); });
}
async function renderChat(id, vista) {
const s = await getDoc(doc(db, 'conversas', id)); if (!s.exists()) { vista.innerHTML = '<div class="vazio"><i class="far fa-comment"></i><b>Conversa não encontrada</b></div>'; return; }
const c = { id: s.id, ...s.data() }; const f = fotoConversa(c);
el('tituloTopo').textContent = nomeConversa(c);
vista.innerHTML = `<div class="chat">
<div style="display:flex;align-items:center;gap:10px;padding:2px 4px 8px"><button type="button" class="btn-icone" id="btnVoltarChat" aria-label="Voltar"><i class="fas fa-arrow-left"></i></button>${c.tipo === 'grupo' ? '<span class="avatar" style="background:var(--navy);border-radius:14px"><i class="fas fa-people-group"></i></span>' : `<button type="button" style="background:none;border:0;padding:0" data-perfil="${escapeHTML(f.id)}">${avatarHTML(f)}</button>`}<div style="flex:1;min-width:0"><b style="font-family:var(--display);font-size:.9rem;display:block">${escapeHTML(nomeConversa(c))}</b><small class="contador">${c.tipo === 'grupo' ? 'grupo do núcleo' : 'conversa direta'}</small></div></div>
${acompanho(c) ? '<div class="aviso-chat"><i class="fas fa-user-shield"></i> Você acompanha esta conversa como responsável legal. Só leitura.</div>' : (c.envolveMenor || c.tipo === 'grupo' ? `<div class="aviso-chat"><i class="fas fa-shield-halved"></i> ${c.tipo === 'grupo' ? 'Grupo do núcleo — o responsável modera as mensagens.' : 'Conversa com menor de idade: o responsável legal pode acompanhar.'}</div>` : '')}
<div class="mensagens" id="msgs"><p class="contador" style="text-align:center">Carregando…</p></div>
${acompanho(c) ? '' : '<div class="digitar"><button type="button" class="btn-icone" id="btnFotoChat" aria-label="Foto"><i class="fas fa-camera"></i></button><textarea id="msgTexto" rows="1" maxlength="1000" placeholder="Mensagem…" aria-label="Mensagem"></textarea><button type="button" class="btn-icone enviar" id="btnEnviarMsg" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></div>'}
</div>`;
el('btnVoltarChat').addEventListener('click', () => ir('mensagens'));
const box = el('msgs');
chatUnsub = onSnapshot(query(collection(db, 'conversas', id, 'mensagens'), orderBy('criadoEm', 'desc'), limit(60)), (snap) => {
const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
box.innerHTML = msgs.map((m) => `<div class="balao ${m.autorUid === uid ? 'meu' : 'dele'}">${c.tipo === 'grupo' && m.autorUid !== uid ? `<span class="de">${escapeHTML(m.autorNome || '')}</span>` : ''}${m.midiaUrl ? `<img src="${escapeHTML(m.midiaUrl)}" alt="" data-ver="0">` : ''}${m.texto ? formatarTexto(m.texto) : ''}<time>${new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('') || '<p class="contador" style="text-align:center">Diga um "Axé" pra começar.</p>';
box.scrollTop = box.scrollHeight; window.scrollTo({ top: document.body.scrollHeight });
const lidas = JSON.parse(localStorage.getItem('rede.lidas') || '{}'); lidas[id] = new Date().toISOString(); localStorage.setItem('rede.lidas', JSON.stringify(lidas));
}, (err) => { console.error(err); box.innerHTML = '<p class="contador" style="text-align:center">Sem permissão pra ler esta conversa.</p>'; });
if (acompanho(c)) return; // responsável legal: só leitura
const enviar = async (texto, midiaUrl) => {
if (!texto && !midiaUrl) return;
if (texto && barrarOfensa(texto)) return;
try {
await addDoc(collection(db, 'conversas', id, 'mensagens'), { autorUid: uid, autorNome: perfil.nome || '', texto: texto || '', midiaUrl: midiaUrl || null, criadoEm: new Date().toISOString() });
await updateDoc(doc(db, 'conversas', id), { ultimaMsg: (texto || '📷 Foto').slice(0, 80), ultimoAutor: uid, atualizadoEm: new Date().toISOString(), ...(c.tipo === 'grupo' ? { participantes: arrayUnion(uid) } : {}) });
} catch (e) { console.error(e); toast('Não foi possível enviar.'); }
};
const ta = el('msgTexto');
el('btnEnviarMsg').addEventListener('click', () => { const t = ta.value.trim(); ta.value = ''; enviar(t); });
ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el('btnEnviarMsg').click(); } });
el('btnFotoChat').addEventListener('click', () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = async () => { const f = inp.files[0]; if (!f) return; toast('Comprimindo…'); try { const img = await comprimirAdaptativo(f, 1024, 220); const url = await subirDataUrl(`rede/${uid}/msg_${Date.now()}.jpg`, img.dataUrl); enviar('', url); } catch (e) { toast('Não foi possível enviar a foto.'); } }; inp.click(); });
}

/* ===================== MODERAÇÃO ===================== */
// Cada consulta traz o filtro que a regra do Firestore consegue provar.
async function renderModeracao(param, vista) {
if (!(ehModerador() || ehGestor())) { ir('feed'); return; }
el('tituloTopo').textContent = 'Moderação';
const pegar = async (q) => { try { return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { console.warn('moderação', e && e.message); return []; } };
const col = collection(db, 'posts');
const fe = await ondeEscola(); // Fundador: só a própria escola (as regras exigem o filtro)
let pendentes = []; let ocultos = []; let denuncias = [];
if (ehModerador()) {
pendentes = await pegar(query(col, ...fe, where('revisao', '==', 'pendente'), limit(60)));
if (ehAdmin()) ocultos = await pegar(query(col, ...fe, where('oculto', '==', true), limit(40)));
denuncias = await pegar(query(collection(db, 'denuncias'), ...fe, where('status', '==', 'aberta'), limit(60)));
} else {
const mid = meuNucleoGerenciado();
const [a, b] = await Promise.all([pegar(query(col, where('revisao', '==', 'pendente'), where('autorAcademiaId', '==', mid), limit(60))), pegar(query(col, where('revisao', '==', 'pendente'), where('nucleoId', '==', mid), limit(60)))]);
const m = new Map(); a.concat(b).forEach((x) => m.set(x.id, x)); pendentes = Array.from(m.values());
denuncias = await pegar(query(collection(db, 'denuncias'), where('status', '==', 'aberta'), where('autorPostAcademiaId', '==', mid), limit(60)));
}
pendentes.sort((x, y) => String(y.criadoEm).localeCompare(String(x.criadoEm)));
guardarAvulsos(pendentes.concat(ocultos));
const pontinho = el('pontoModeracao'); if (pontinho) pontinho.classList.toggle('oculto', !(pendentes.length + denuncias.length));
const denunciaHTML = (d) => `<div class="card denuncia"><i class="fas ${d.tipoAlvo === 'comentario' ? 'fa-comment-slash' : 'fa-flag'}" style="color:var(--red)"></i><div class="q"><b>${escapeHTML(d.motivo || '')}</b><small>${d.tipoAlvo === 'comentario' ? 'comentário · ' : ''}${d.denuncianteUid === 'sistema' ? 'filtro automático' : `por ${escapeHTML(d.denuncianteNome || '')}`} · ${tempoRelativo(d.criadoEm)}</small></div><div style="display:grid;gap:6px">
<button type="button" class="btn-claro" data-ver-post="${escapeHTML(d.postId || '')}">Ver post</button>
${d.tipoAlvo === 'comentario' ? `<button type="button" class="btn-perigo" data-apagar-coment="${escapeHTML(d.comentarioId || '')}" data-post="${escapeHTML(d.postId || '')}" data-den="${d.id}"><i class="fas fa-trash-can"></i> Apagar comentário</button>` : (ehAdmin() ? `<button type="button" class="btn-perigo" data-ocultar-post="${escapeHTML(d.postId || '')}" data-den="${d.id}"><i class="fas fa-eye-slash"></i> Ocultar post</button>` : '')}
<button type="button" class="btn-claro" data-fechar-den="${d.id}">Manter</button></div></div>`;
vista.innerHTML = `<div class="titulo-sec">Posts aguardando revisão <span class="pill gold">${pendentes.length}</span></div>${pendentes.map((p) => `${p.moderacaoAuto ? `<p class="contador mod-auto"><i class="fas fa-robot"></i> Filtro automático: ${escapeHTML((p.moderacaoAuto.motivos || []).join(', '))}</p>` : ''}${postHTML(p)}`).join('') || '<div class="vazio"><i class="fas fa-check"></i>Nada pendente. Fotos de menores, fotos com atleta sem termo de imagem e o que o filtro automático segurar aparecem aqui.</div>'}
<div class="titulo-sec">Denúncias abertas <span class="pill red">${denuncias.length}</span></div>${denuncias.map(denunciaHTML).join('') || '<div class="vazio"><i class="fas fa-flag"></i>Nenhuma denúncia aberta.</div>'}
${ehAdmin() ? `<div class="titulo-sec">Posts ocultados <span class="pill neutra">${ocultos.length}</span></div>${ocultos.map(postHTML).join('') || '<div class="vazio"><i class="fas fa-eye"></i>Nenhum post ocultado.</div>'}` : ''}`;
vista.querySelectorAll('[data-ver-post]').forEach((b) => b.addEventListener('click', async () => { try { const s2 = await getDoc(doc(db, 'posts', b.dataset.verPost)); if (s2.exists()) abrirPost({ id: s2.id, ...s2.data() }); else toast('Esse post já foi apagado.'); } catch (e) { toast('Sem permissão para abrir.'); } }));
const fecharDen = async (id, acao) => updateDoc(doc(db, 'denuncias', id), { status: 'fechada', fechadaPor: uid, fechadaEm: new Date().toISOString(), ...(acao ? { acao } : {}) });
vista.querySelectorAll('[data-fechar-den]').forEach((b) => b.addEventListener('click', async () => { try { await fecharDen(b.dataset.fecharDen, 'mantido'); b.closest('.card').remove(); toast('Denúncia encerrada.'); } catch (e) { toast('Sem permissão.'); } }));
vista.querySelectorAll('[data-apagar-coment]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Apagar o comentário denunciado?')) return; try { await deleteDoc(doc(db, 'posts', b.dataset.post, 'comentarios', b.dataset.apagarComent)); try { await updateDoc(doc(db, 'posts', b.dataset.post), { comentariosCount: increment(-1) }); } catch (e) { /* ok */ } await fecharDen(b.dataset.den, 'comentário apagado'); b.closest('.card').remove(); toast('Comentário apagado.'); } catch (e) { toast('Sem permissão para apagar.'); } }));
vista.querySelectorAll('[data-ocultar-post]').forEach((b) => b.addEventListener('click', async () => { if (!ehAdmin() || !confirm('Ocultar o post denunciado da rede?')) return; try { await updateDoc(doc(db, 'posts', b.dataset.ocultarPost), { oculto: true, ocultadoPor: uid, ocultadoEm: new Date().toISOString(), publico: false }); await fecharDen(b.dataset.den, 'post ocultado'); b.closest('.card').remove(); posts.forEach((x) => { if (x.id === b.dataset.ocultarPost) { x.oculto = true; x.publico = false; } }); toast('Post ocultado da rede.'); } catch (e) { toast(explicarErro(e, 'o post')); } }));
}

/* ===================== POST ABERTO (link compartilhado / notificação) ===================== */
async function renderPostUnico(id, vista) {
el('tituloTopo').textContent = 'Publicação';
let p = postPorId(id);
if (!p) { try { const sn = await getDoc(doc(db, 'posts', id)); if (sn.exists()) { p = { id: sn.id, ...sn.data() }; guardarAvulsos([p]); } } catch (e) { p = null; } }
if (!p) { vista.innerHTML = '<div class="vazio"><i class="fas fa-lock"></i><b>Publicação indisponível</b>Ela foi apagada, está em revisão ou é de um perfil privado.</div>'; return; }
await pubDe(p.autorUid);
vista.innerHTML = `<button type="button" class="btn-claro" id="btnVoltarFeed" style="margin-bottom:10px"><i class="fas fa-arrow-left"></i> Voltar ao feed</button>${postHTML(p)}`;
el('btnVoltarFeed').addEventListener('click', () => ir('feed'));
const card = vista.querySelector('.post'); if (card) abrirComentarios(p, card, true);
}

/* ===================== AGENDA DE EVENTOS (inscrição "Eu vou") ===================== */
const dataCurta = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
async function renderAgenda(id, vista) {
el('tituloTopo').textContent = 'Agenda';
let eventos = []; try { eventos = (await listar('eventos')).filter((e) => e.data); } catch (e) { eventos = []; }
const h = hoje0();
const proximos = eventos.filter((e) => new Date(e.data + 'T23:59:59') >= h).sort((a, b) => a.data.localeCompare(b.data));
const passados = eventos.filter((e) => new Date(e.data + 'T23:59:59') < h && new Date(e.data + 'T12:00:00') > new Date(h.getTime() - 120 * 86400000)).sort((a, b) => b.data.localeCompare(a.data));
if (id) {
const ev = eventos.find((e) => e.id === id);
if (!ev) { vista.innerHTML = '<div class="vazio"><i class="far fa-calendar"></i><b>Evento não encontrado</b></div>'; return; }
let conf = []; try { conf = (await getDocs(collection(db, 'eventos', id, 'confirmados'))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { conf = []; }
const euVou = conf.some((c) => c.id === uid); const futuro = new Date(ev.data + 'T23:59:59') >= h;
const nuc = nucleoDe(ev.academiaId);
vista.innerHTML = `<div class="evento grande"><div class="data"><b>${ev.data.slice(8, 10)}</b><small>${new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</small></div><b class="n">${escapeHTML(ev.nome || 'Evento')}</b><small>${escapeHTML(dataCurta(ev.data))}${ev.hora ? ` · ${escapeHTML(ev.hora)}` : ''}${nuc ? ` · ${escapeHTML(nomeCurtoNucleo(nuc.nome))}` : ' · Grupo todo'}</small>
${ev.descricao ? `<p class="ev-desc">${escapeHTML(ev.descricao)}</p>` : ''}${ev.local ? `<a class="nucleo-endereco" href="${escapeHTML(linkMapa({ endereco: ev.local }))}" target="_blank" rel="noopener"><i class="fas fa-location-dot"></i> ${escapeHTML(ev.local)} <i class="fas fa-diamond-turn-right"></i></a>` : ''}
${ev.taxa ? `<span class="pill" style="background:rgba(255,255,255,.18);color:#fff;margin-top:6px"><i class="fas fa-ticket"></i> Taxa: ${Number(ev.taxa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>` : ''}
<div class="acoes-ev">${futuro ? `<button type="button" class="${euVou ? 'btn-verde' : 'btn-claro'}" id="btnEuVou">${euVou ? '<i class="fas fa-check"></i> Inscrito — toque para sair' : '<i class="far fa-calendar-check"></i> Eu vou'}</button>` : ''}<button type="button" class="btn-claro" data-album="${escapeHTML(id)}"><i class="fas fa-images"></i> Álbum</button></div></div>
<div class="titulo-sec">Confirmados <span class="pill teal">${conf.length}</span></div>
<div class="card">${conf.length ? conf.sort((a, b) => String(a.nome).localeCompare(String(b.nome))).map((c) => `<div class="pessoa">${avatarHTML({ id: c.id, nome: c.nome, fotoUrl: c.fotoUrl })}<button type="button" class="q" data-perfil="${escapeHTML(c.id)}"><b>${escapeHTML(c.nome || '')}</b><small>${escapeHTML([c.cordaoAtual, nomeCurtoNucleo((nucleoDe(c.academiaId) || {}).nome)].filter(Boolean).join(' · '))}</small></button></div>`).join('') : '<p class="contador">Ninguém confirmou ainda. Seja o primeiro!</p>'}</div>`;
const b = el('btnEuVou');
if (b) b.addEventListener('click', async () => {
b.disabled = true;
try {
if (euVou) await deleteDoc(doc(db, 'eventos', id, 'confirmados', uid));
else await setDoc(doc(db, 'eventos', id, 'confirmados', uid), { nome: perfil.nome || '', em: new Date().toISOString(), academiaId: perfil.academiaId || null, cordaoAtual: (meuPub && meuPub.cordaoAtual) || perfil.cordaoAtual || '', fotoUrl: /^https:/.test(perfil.fotoUrl || '') ? perfil.fotoUrl : '' });
toast(euVou ? 'Inscrição cancelada.' : 'Inscrição confirmada! Te vemos lá.');
renderAgenda(id, vista);
} catch (e) { toast('Não foi possível confirmar agora.'); b.disabled = false; }
});
return;
}
const cartao = (e) => `<button type="button" class="ev-linha" data-agenda="${escapeHTML(e.id)}"><span class="d"><b>${e.data.slice(8, 10)}</b><small>${new Date(e.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></span><span class="t"><b>${escapeHTML(e.nome || 'Evento')}</b><small>${escapeHTML(dataCurta(e.data))}${e.hora ? ` · ${escapeHTML(e.hora)}` : ''}${nucleoDe(e.academiaId) ? ` · ${escapeHTML(nomeCurtoNucleo(nucleoDe(e.academiaId).nome))}` : ' · Grupo'}</small></span><i class="fas fa-chevron-right"></i></button>`;
vista.innerHTML = `<div class="titulo-sec">Próximos eventos <span class="pill teal">${proximos.length}</span></div>
<div class="card lista-ev">${proximos.map(cartao).join('') || '<p class="contador">Nenhum evento marcado. Quando o grupo marcar batizado, roda ou oficina, aparece aqui.</p>'}</div>
${passados.length ? `<div class="titulo-sec">Aconteceram <span class="contador">álbuns</span></div><div class="card lista-ev">${passados.map(cartao).join('')}</div>` : ''}`;
}

/* ===================== ÁLBUM DO EVENTO ===================== */
async function renderAlbum(id, vista) {
let ev = null; try { ev = await buscar('eventos', id); } catch (e) { ev = null; }
el('tituloTopo').textContent = ev ? `Álbum · ${ev.nome || 'evento'}` : 'Álbum';
const pegar = async (q) => { try { return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { return []; } };
const [pub, meus] = await Promise.all([pegar(query(collection(db, 'posts'), ...(await ondeEscola()), where('eventoId', '==', id), where('publico', '==', true), limit(120))), pegar(query(collection(db, 'posts'), where('eventoId', '==', id), where('autorUid', '==', uid), limit(40)))]);
const m = new Map(); pub.concat(meus).forEach((p) => m.set(p.id, p));
const lista = Array.from(m.values()).filter((p) => midiasDe(p).length).sort((a, b) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
guardarAvulsos(lista);
const pessoas = new Map(); lista.forEach((p) => (p.marcados || []).forEach((x) => pessoas.set(x.uid, x.nome)));
let filtro = null;
const desenhar = () => {
const itens = filtro ? lista.filter((p) => (p.marcados || []).some((x) => x.uid === filtro) || p.autorUid === filtro) : lista;
vista.innerHTML = `${ev ? `<button type="button" class="btn-claro" data-agenda="${escapeHTML(id)}" style="margin-bottom:10px"><i class="far fa-calendar"></i> ${escapeHTML(ev.nome || 'Evento')} · ${escapeHTML(dataCurta(ev.data))}</button>` : ''}
${pessoas.size ? `<div class="chips">${[['', 'Todos']].concat(Array.from(pessoas.entries())).map(([u, n]) => `<button type="button" class="pill ${(filtro || '') === u ? 'teal' : 'neutra'}" data-filtro="${escapeHTML(u)}">${escapeHTML(String(n).split(' ')[0])}</button>`).join('')}</div>` : ''}
${gradeHTML(itens, 'Ainda sem fotos deste evento. Ao publicar, escolha o evento em "Álbum do evento".')}`;
vista.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(lista.find((p) => p.id === b.dataset.abrirPost))));
vista.querySelectorAll('[data-filtro]').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.filtro || null; desenhar(); }));
};
desenhar();
}

/* ===================== NOTIFICAÇÕES ===================== */
async function renderNotificacoes(param, vista) {
el('tituloTopo').textContent = 'Notificações';
const e = estadoPush();
vista.innerHTML = `${e === 'default' ? '<div class="card push-convite"><i class="fas fa-bell"></i><div><b>Avisos no celular</b><small>Curtidas, comentários, mensagens, brasões e eventos — mesmo com o app fechado.</small></div><button type="button" class="btn-verde" id="btnAtivarPush">Ativar</button></div>' : ''}
<div class="card"><div class="nt-lista" id="ntLista"><p class="contador">Carregando…</p></div></div>`;
const b = el('btnAtivarPush');
if (b) b.addEventListener('click', async () => { b.disabled = true; try { const ok = await ativarPush(uid); toast(ok ? 'Pronto! Você vai receber os avisos neste aparelho.' : 'Permissão não concedida.'); renderNotificacoes(null, vista); } catch (err) { toast(err.message); b.disabled = false; } });
try {
const lista = await listarNotificacoes(uid, 60);
el('ntLista').innerHTML = lista.length ? lista.map(notificacaoHTML).join('') : '<div class="vazio" style="border:0"><i class="far fa-bell"></i><b>Nada por aqui ainda</b>Quando alguém curtir, comentar ou te marcar, aparece aqui.</div>';
await marcarTodasLidas(uid, lista);
} catch (err) { el('ntLista').innerHTML = '<p class="contador">Não foi possível carregar agora.</p>'; }
}

/* ===================== AJUSTES (privacidade, notificações, acessibilidade, LGPD) ===================== */
async function renderAjustes(param, vista) {
el('tituloTopo').textContent = 'Ajustes';
const push = estadoPush(); const pushLigado = push === 'granted' && perfil.notificacoesPush !== false;
vista.innerHTML = `<div class="card conf-lista">
<div class="conf"><i class="fas fa-bell"></i><div><b>Notificações no celular</b><small>${push === 'denied' ? 'Bloqueadas no navegador — libere nas configurações do site.' : push === 'indisponivel' ? 'No iPhone, instale a Rede na tela inicial primeiro.' : 'Curtidas, comentários, mensagens, brasões e eventos.'}</small></div>${push === 'denied' || push === 'indisponivel' ? '' : `<button type="button" class="switch cinza ${pushLigado ? 'on' : ''}" id="swPush" role="switch" aria-checked="${pushLigado}" aria-label="Notificações no celular"></button>`}</div>
<button type="button" class="conf" id="cfA11y"><i class="fas fa-universal-access"></i><div><b>Acessibilidade</b><small>Tamanho do texto e alto contraste</small></div><i class="fas fa-chevron-right"></i></button>
<button type="button" class="conf" id="cfInstalar"><i class="fas fa-mobile-screen-button"></i><div><b>${estaInstalado() ? 'Rede instalada neste aparelho' : 'Instalar a Rede no celular'}</b><small>Ícone próprio na tela inicial, que abre direto na Rede</small></div><i class="fas fa-chevron-right"></i></button>
<button type="button" class="conf" id="cfTutorial"><i class="fas fa-circle-question"></i><div><b>Ver o tutorial de novo</b><small>Como funciona a Rede em 4 passos</small></div><i class="fas fa-chevron-right"></i></button>
</div>
<div class="titulo-sec">Seus dados <span class="contador">LGPD</span></div>
<div class="card conf-lista">
<a class="conf" href="privacidade.html" target="_blank" rel="noopener"><i class="fas fa-shield-halved"></i><div><b>Política de privacidade</b><small>Como o grupo cuida dos seus dados</small></div><i class="fas fa-arrow-up-right-from-square"></i></a>
<button type="button" class="conf perigo" id="cfExcluir"><i class="fas fa-user-xmark"></i><div><b>Pedir exclusão da conta</b><small>O Admin Master confirma e o sistema apaga seus dados</small></div><i class="fas fa-chevron-right"></i></button>
</div>`;
const sw = el('swPush');
if (sw) sw.addEventListener('click', async () => {
const ligar = !sw.classList.contains('on'); sw.disabled = true;
try {
if (ligar) { const ok = await ativarPush(uid); if (!ok) throw new Error('Permissão não concedida.'); await atualizar('usuarios', uid, { notificacoesPush: true }); perfil.notificacoesPush = true; }
else { await desativarPush(uid); await atualizar('usuarios', uid, { notificacoesPush: false }); perfil.notificacoesPush = false; }
sw.classList.toggle('on', ligar); sw.setAttribute('aria-checked', String(ligar)); toast(ligar ? 'Notificações ligadas neste aparelho.' : 'Notificações desligadas.');
} catch (e) { toast(e.message || 'Não foi possível mudar agora.'); } finally { sw.disabled = false; }
});
el('cfA11y').addEventListener('click', abrirAcessibilidade);
el('cfInstalar').addEventListener('click', () => instalar({ nome: ESCOLA.nomeRede, icone: 'assets/rede-icon-192.png' }));
el('cfTutorial').addEventListener('click', () => tutorialRede(true));
el('cfExcluir').addEventListener('click', async () => {
if (!confirm('Pedir a exclusão da sua conta e dos seus dados? O Admin Master confirma e o sistema apaga cadastro, publicações, presenças e conversas. Pagamentos ficam anonimizados (obrigação fiscal).')) return;
const motivo = prompt('Quer contar o motivo? (opcional)') || '';
try { const r = await pedirExclusaoDaConta(uid, perfil.nome || '', perfil.academiaId || null, motivo); toast(r.jaExistia ? 'Seu pedido já está com o Admin Master.' : 'Pedido enviado ao Admin Master.'); } catch (e) { toast('Não foi possível enviar o pedido agora.'); }
});
}
function tutorialRede(forcar = false) {
tutorial('rede', [
{ icone: 'fa-house', titulo: `Bem-vindo à ${ESCOLA.nomeRede}`, texto: 'A rede fechada do grupo: só entra quem tem cadastro. Aqui ficam os stories, os avisos do núcleo e os momentos do treino.' },
{ icone: 'fa-plus', titulo: 'Publique o treino', texto: 'Toque no + para postar fotos e vídeos. Marque quem treinou com você, escolha o álbum do evento e use @ para mencionar alguém.' },
{ icone: 'fa-medal', titulo: 'Brasões de verdade', texto: 'Presenças, graduações e publicações viram brasões automaticamente. O responsável do núcleo também concede destaques.' },
{ icone: 'fa-shield-halved', titulo: 'Rede segura', texto: 'Fotos de crianças passam pela revisão do responsável do núcleo, e você pode denunciar qualquer post ou comentário no menu ⋯.' },
], { forcar });
}

/* ===================== TEMA ===================== */
function aplicarTema(t) { document.documentElement.setAttribute('data-theme', t); document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0E1715' : '#F5F9F8'); el('btnTema').innerHTML = `<i class="fas ${t === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`; try { localStorage.setItem('rede.tema', t); } catch (e) { /* ok */ } }

/* ===================== BOOT ===================== */
iniciarExperiencia();
{ const st = document.createElement('style'); st.textContent = CSS_NOTIF; document.head.appendChild(st); }
observarSessao(async (user) => {
el('telaCarregando').classList.add('oculto');
if (!user) { el('telaSemSessao').classList.remove('oculto'); return; }
uid = user.uid;
// Velocidade: o feed (stories + posts) começa a baixar JÁ, junto com o cadastro,
// em vez de esperar 5 leituras em fila. No celular cada ida ao banco custa
// 150–400 ms — em fila eram ~2 s só de espera.
const rotaInicial = (location.hash || '#feed').slice(1).split('/')[0];
if (!rotaInicial || rotaInicial === 'feed') preCargaFeed = Promise.all([carregarStories(), carregarPosts(false).catch(() => null)]);
const ok = (p, padrao) => p.catch(() => padrao);
const [perfilLido, nucleosLidos, cfgBrasoes, cfgModeracao, meuPubLido] = await Promise.all([
ok(buscar('usuarios', uid), null), ok(listar('nucleos'), []), ok(buscar('config', 'brasoes'), {}), ok(buscar('config', 'moderacao'), null), ok(pubDe(uid), null),
]);
perfil = perfilLido;
if (!perfil) { el('telaSemSessao').classList.remove('oculto'); return; }
definirAutor({ uid, nome: perfil.nome || '' });
seguindo = new Set(Array.isArray(perfil.seguindo) ? perfil.seguindo : []);
salvos = new Set(Array.isArray(perfil.salvos) ? perfil.salvos : []);
nucleos = nucleosLidos || [];
configBrasoes = cfgBrasoes || {};
configBrasoes.palavrasExtras = (cfgModeracao && Array.isArray(cfgModeracao.palavras)) ? cfgModeracao.palavras : [];
if (!configBrasoes.nucleoFundadorId) { // padrão honesto: o núcleo cujo responsável tem Acesso Geral
try { const pubs = await Promise.all(nucleos.filter((n) => n.professorUid).map((n) => pubDe(n.professorUid))); const i = pubs.findIndex((p) => p && p.fundador); if (i >= 0) configBrasoes.nucleoFundadorId = nucleos.filter((n) => n.professorUid)[i].id; } catch (e) { /* ok */ }
}
// Presidente do Grupo travado em uma pessoa: se o Admin ainda não gravou
// config.presidenteUid, vale o responsável do núcleo do Fundador.
if (!configBrasoes.presidenteUid && configBrasoes.nucleoFundadorId) { const nf = nucleos.find((n) => n.id === configBrasoes.nucleoFundadorId); if (nf && nf.professorUid) configBrasoes.presidenteUid = nf.professorUid; }
meuPub = meuPubLido;
el('app').classList.remove('oculto');
// Voltar: quem tem painel (Admin, Fundador, responsável com núcleo) volta pro
// painel do núcleo — antes caía no app como aluno e perdia as ferramentas.
// Se a pessoa veio da área de atleta (app.html?modo=aluno), volta pra lá.
{
const temPainel = ehAdmin() || souFundador(perfil) || (!!perfil.academiaGerenciadaId && (papeis().includes('mestre') || papeis().includes('instrutor')));
let origem = null; try { origem = sessionStorage.getItem('rede.voltar'); } catch (e) { /* ok */ }
const destino = origem && /^(admin\.html|app\.html(\?modo=aluno)?)$/.test(origem) ? origem : (temPainel ? 'admin.html' : 'app.html');
const bv = el('btnVoltarApp');
if (bv) {
bv.href = destino; bv.title = destino.startsWith('admin') ? 'Ir para o painel de gestão' : 'Ir para o app do atleta'; bv.setAttribute('aria-label', bv.title);
const rot = bv.querySelector('span'); if (rot) rot.textContent = destino.startsWith('admin') ? 'Painel' : 'App';
const ic = bv.querySelector('i'); if (ic) ic.className = destino.startsWith('admin') ? 'fas fa-gauge-high' : 'fas fa-house-user';
}
}
let tema = 'light'; try { tema = localStorage.getItem('rede.tema') || 'light'; } catch (e) { /* ok */ }
aplicarTema(tema);
el('btnTema').addEventListener('click', () => aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
if (ehModerador() || ehGestor()) el('btnModeracao').style.display = '';
el('btnModeracao').addEventListener('click', () => ir('moderacao'));
el('btnMensagensTopo').addEventListener('click', () => ir('mensagens'));
const sino = el('btnNotificacoes');
if (sino) {
sino.addEventListener('click', () => ir('notificacoes'));
ligarContador(uid, (n) => { const b = el('contNotif'); if (!b) return; b.textContent = n > 9 ? '9+' : String(n); b.classList.toggle('oculto', !n); sino.setAttribute('aria-label', n ? `Notificações: ${n} novas` : 'Notificações'); });
}
ouvirPushComAppAberto((n) => toast(`${n.title || 'Nova notificação'}${n.body ? ` — ${n.body}` : ''}`));
document.querySelector('.nav-inferior').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) ir(b.dataset.rota); });
el('btnFecharStory').addEventListener('click', fecharStories);
el('storyAnt').addEventListener('click', () => proximoStory(-1)); el('storyProx').addEventListener('click', () => proximoStory(1));
el('storyRodape').addEventListener('click', async (ev) => { const ap = ev.target.closest('[data-apagar-story]'); const pf = ev.target.closest('[data-perfil-story]'); if (pf) { fecharStories(); ir(`perfil/${pf.dataset.perfilStory}`); } if (ap && confirm('Apagar este story?')) { try { await deleteDoc(doc(db, 'stories', ap.dataset.apagarStory)); stories = stories.filter((s) => s.id !== ap.dataset.apagarStory); fecharStories(); toast('Story apagado.'); } catch (e) { toast('Sem permissão.'); } } });
el('btnFecharMidia').addEventListener('click', () => el('midiaViewer').classList.add('oculto'));
el('midiaViewer').addEventListener('click', (ev) => { if (ev.target === el('midiaViewer')) el('midiaViewer').classList.add('oculto'); });
el('inputStory').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) publicarStory(f); });
el('inputMidia').addEventListener('change', (ev) => { const fs = ev.target.files; adicionarMidias(fs); ev.target.value = ''; });
el('inputFotoPerfil').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) trocarFotoPerfil(f); });
el('inputCapa').addEventListener('change', (ev) => { const f = ev.target.files[0]; ev.target.value = ''; if (f) trocarCapa(f); });
ligarEventosVista();
sincronizarPerfilPublico(); // em paralelo: não trava a primeira tela
window.addEventListener('hashchange', roteia);
roteia();
if (location.hash === '#instalar') setTimeout(() => instalar({ nome: ESCOLA.nomeRede, icone: 'assets/rede-icon-192.png' }), 500);
else { pedirAceiteSeNecessario(perfil, (d) => atualizar('usuarios', uid, d)); setTimeout(() => tutorialRede(false), 900); }
});
