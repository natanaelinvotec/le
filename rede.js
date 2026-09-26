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
Leituras por abertura do feed: stories (1 consulta) + avisos (1) + 20 posts. */
import {
db, storage, observarSessao, buscar, atualizar, listar, contar, presencasDoUsuario, souFundador, arquivoParaDataUrlComprimido,
collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter,
arrayUnion, arrayRemove, increment, onSnapshot, storageRef, uploadString, uploadBytes, getDownloadURL,
} from './firebase.js';
import { escapeHTML } from './shared.js';
import { abrirApresentacao, temApresentacao, textoCargo } from './apresentacao.js';
import { BRASOES, SERIES, avaliar as avaliarBrasoes, consolidar as consolidarBrasoes, resumirPresencas, urlThumb, urlPng, urlGlb, textoMetrica, porId as brasaoPorId } from './brasoes.js';

/* ===================== CONSTANTES (mesmas do painel) ===================== */
const ORDEM_CORDOES = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
const CORDOES_ADULTO = [
{ nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Escravo', cor: ['#4F4F4F', '#4F4F4F', '#4F4F4F'] },
{ nome: 'Fugitivo', cor: ['#4F4F4F', '#DAA520', '#4F4F4F'] }, { nome: 'Quilombola', cor: ['#DAA520', '#DAA520', '#DAA520'] },
{ nome: 'Vagante', cor: ['#4F4F4F', '#D32F2F', '#4F4F4F'] }, { nome: 'Liberto', cor: ['#D32F2F', '#D32F2F', '#D32F2F'] },
{ nome: 'Instrutor', cor: ['#4F4F4F', '#DAA520', '#D32F2F'] }, { nome: 'Professor', cor: ['#FFFFFF', '#D32F2F', '#FFFFFF'] },
{ nome: 'Mestre', cor: ['#F5F5F5', '#F5F5F5', '#F5F5F5'] }, { nome: 'Mestre/Presidente', cor: ['#FFFFFF', '#00B140', '#002D72'] },
];
const CORDOES_KIDS = [
{ nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] }, { nome: 'Escravo', cor: ['#D3D3D3', '#D3D3D3', '#D3D3D3'] },
{ nome: 'Fugitivo', cor: ['#D3D3D3', '#EEDC82', '#D3D3D3'] }, { nome: 'Quilombola', cor: ['#EEDC82', '#EEDC82', '#EEDC82'] },
];
const CRITERIOS = [
{ id: 'c1', reqAdulto: 0, reqKids: true }, { id: 'c2', reqAdulto: 3, reqKids: false }, { id: 'c3', reqAdulto: 0, reqKids: true },
{ id: 'c4', reqAdulto: 0, reqKids: true }, { id: 'c5', reqAdulto: 0, reqKids: true }, { id: 'c6', reqAdulto: 0, reqKids: true },
{ id: 'c7', reqAdulto: 0, reqKids: true }, { id: 'c8', reqAdulto: 0, reqKids: true }, { id: 'c9', reqAdulto: 5, reqKids: false },
{ id: 'c10', reqAdulto: 5, reqKids: false }, { id: 'c11', reqAdulto: 5, reqKids: false }, { id: 'c12', reqAdulto: 5, reqKids: false },
{ id: 'c13', reqAdulto: 0, reqKids: true }, { id: 'c14', reqAdulto: 0, reqKids: true }, { id: 'c15', reqAdulto: 0, reqKids: true },
];
const PAGINA = 20;
const LIMITE_TEXTO = 800;
const MAX_MIDIAS = 4;
const IMG_MAX_DIM = 1280;      // maior lado da foto de post
const IMG_ALVO_KB = 350;       // tamanho alvo por foto — preserva o Storage
const STORY_MAX_DIM = 1080;
const STORY_ALVO_KB = 300;
const VIDEO_MAX_MB = 12;
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
let ultimoDoc = null;
let avisos = [];
let stories = [];
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
const lista = pessoa && pessoa.menor && (Number(pessoa.idade) || 0) < 12 ? CORDOES_KIDS : CORDOES_ADULTO;
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

function porcentagemEvolucao(u) {
if (!u || !u.notas || !Object.keys(u.notas).length) return null;
const idade = Number(u.idade) || 0; const rank = u.cordaoAtual || 'Iniciante';
let idx = (idade < 12 ? CORDOES_KIDS : CORDOES_ADULTO).findIndex((c) => c.nome === rank); if (idx === -1) idx = 0;
const ativos = CRITERIOS.filter((c) => (idade < 12 ? c.reqKids : idx >= (c.reqAdulto - 1)));
if (!ativos.length) return null;
let total = 0; ativos.forEach((c) => { if (u.notas[c.id] !== undefined) total += Number(u.notas[c.id]) || 0; });
return Math.min(100, Math.floor((total / (ativos.length * 10)) * 100));
}
function proximoCordao(pessoa) {
const lista = pessoa && (Number(pessoa.idade) || 0) < 12 && pessoa.menor ? CORDOES_KIDS : CORDOES_ADULTO;
const i = lista.findIndex((c) => c.nome === (pessoa.cordaoAtual || 'Iniciante'));
return lista[Math.min(lista.length - 1, (i === -1 ? 0 : i) + 1)];
}
// Texto com #hashtags e @menções clicáveis (sempre escapado antes).
function formatarTexto(txt) {
return escapeHTML(txt || '')
.replace(/(^|\s)#([\p{L}\p{N}_]{2,40})/gu, (m, pre, tag) => `${pre}<button type="button" class="hash" data-hash="${escapeHTML(tag.toLowerCase())}">#${tag}</button>`)
.replace(/(^|\s)@([\p{L}\p{N}_.]{2,40})/gu, (m, pre, nome) => `${pre}<span class="mencao">@${nome}</span>`);
}
const extrairHashtags = (txt) => Array.from(new Set((String(txt || '').match(/#[\p{L}\p{N}_]{2,40}/gu) || []).map((h) => h.slice(1).toLowerCase())));

async function pubDe(alvoUid) {
if (!alvoUid) return null;
if (pubCache.has(alvoUid)) return pubCache.get(alvoUid);
try { const s = await getDoc(doc(db, 'perfisPublicos', alvoUid)); const v = s.exists() ? { id: s.id, ...s.data() } : null; pubCache.set(alvoUid, v); return v; }
catch (e) { return null; }
}
async function pubsDeNucleo(academiaId, max = 60) {
const snap = await getDocs(query(collection(db, 'perfisPublicos'), where('academiaId', '==', academiaId), limit(max)));
const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() })); lista.forEach((p) => pubCache.set(p.id, p)); return lista;
}
const nucleoDe = (id) => nucleos.find((n) => n.id === id) || null;
// Apresentação em vídeo do responsável do núcleo (nucleos/{id}.apresentacao).
// A foto do perfil continua a clássica; o vídeo só toca quando alguém toca no botão.
function apresentarResponsavel(n, resp, alvo) {
if (!temApresentacao(n)) return Promise.resolve();
const ap = n.apresentacao;
const pessoa = resp || { id: n.professorUid, nome: n.professorNome || '' };
const chips = [
pessoa.cordaoAtual ? { texto: `Cordão ${pessoa.cordaoAtual}`, ouro: true } : null,
rotuloDiretoDe(pessoa) ? { texto: rotuloDiretoDe(pessoa) } : null,
n.nome ? { texto: n.nome } : null,
].filter(Boolean);
return abrirApresentacao({ videoUrl: ap.videoUrl, inicioNome: ap.inicioNome, comSom: true, cargo: textoCargo(pessoa, ap.titulo), nome: pessoa.nome || n.professorNome || '', chips, corda: coresCordao(pessoa), alvo: alvo || null });
}
function rotuloDiretoDe(pub) {
if (!pub) return '';
if (pub.fundador) return 'Direto Liberdade e Expressão';
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
async function subirDataUrl(caminho, dataUrl) { const r = storageRef(storage, caminho); await uploadString(r, dataUrl, 'data_url'); return getDownloadURL(r); }

/* ===================== PERFIL PÚBLICO (sincronização honesta) ===================== */
// resumirPresencas vem de brasoes.js (mesma conta em toda a rede).
let configBrasoes = {};
async function sincronizarPerfilPublico() {
let resumo = null;
try { resumo = resumirPresencas(await presencasDoUsuario(uid, 400)); } catch (e) { /* sem leitura de presenças: não inventa */ }
const menor = souMenor();
const dados = {
nome: perfil.nome || perfil.email || 'Capoeirista',
nomeBusca: String(perfil.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
fotoUrl: perfil.fotoUrl || '',
cordaoAtual: perfil.cordaoAtual || 'Iniciante',
idade: menor ? (Number(perfil.idade) || 0) : null, // idade só pra escolher a escada kids; adulto não expõe
menor,
academiaId: perfil.academiaId || null,
academiaNome: perfil.academiaNome || '',
academiaGerenciadaId: perfil.academiaGerenciadaId || null,
mestre: papeis().includes('mestre'), instrutor: papeis().includes('instrutor'), fundador: souFundador(perfil),
usoImagemOk: String(perfil.usoImagem || '').toUpperCase().startsWith('AUTORIZO') && !String(perfil.usoImagem || '').toUpperCase().startsWith('NÃO'),
historicoGraduacoes: Array.isArray(perfil.historicoGraduacoes) ? perfil.historicoGraduacoes : [],
prontidao: porcentagemEvolucao(perfil),
criadoEm: perfil.criadoEm || null,
seguindoCount: seguindo.size,
atualizadoEm: new Date().toISOString(),
};
if (resumo) dados.resumoPresencas = resumo;
if (!meuPub || meuPub.privado === undefined) dados.privado = menor; // menor nasce privado
// Resumo da Rede (posts, melhores momentos, curtidas recebidas) — recalculado
// no máximo a cada 6h pra não gastar leitura à toa.
const antigoRede = meuPub && meuPub.resumoRede;
if (!antigoRede || (Date.now() - new Date(antigoRede.calculadoEm || 0).getTime()) > 6 * 3600 * 1000) {
try {
const meus = await postsDoAutor(uid);
dados.resumoRede = { posts: meus.length, momentos: meus.filter((p) => p.melhorMomento).length, curtidas: meus.reduce((sm, p) => sm + ((p.curtidas || []).length), 0), calculadoEm: new Date().toISOString() };
} catch (e) { /* sem leitura: não inventa */ }
} else dados.resumoRede = antigoRede;
// Formação: alunos do núcleo que administro com troca de cordão registrada por mim.
if (perfil.academiaGerenciadaId) {
try { const alunos = await pubsDeNucleo(perfil.academiaGerenciadaId, 120); dados.resumoFormacao = { formados: alunos.filter((a) => (a.historicoGraduacoes || []).some((h) => h.por === uid)).length, calculadoEm: new Date().toISOString() }; } catch (e) { /* ok */ }
}
// Brasões: avalia com os dados reais e consolida com o que já estava desbloqueado.
const avaliacao = avaliarBrasoes({ ...dados, brasoesManuais: perfil.brasoesManuais || {}, brasoes: (meuPub && meuPub.brasoes) || {} }, configBrasoes);
const cons = consolidarBrasoes(avaliacao, (meuPub && meuPub.brasoes) || {});
const tinhaMapa = !!(meuPub && meuPub.brasoes); // 1ª sincronização não faz festa de tudo de uma vez
dados.brasoes = cons.mapa; dados.brasoesTotal = cons.total;
try { await setDoc(doc(db, 'perfisPublicos', uid), dados, { merge: true }); meuPub = { ...(meuPub || {}), ...dados, id: uid }; pubCache.set(uid, meuPub); }
catch (e) { console.warn('perfil público', e); }
try { if ((perfil.brasoesTotal || 0) !== cons.total) { await atualizar('usuarios', uid, { brasoesTotal: cons.total }); perfil.brasoesTotal = cons.total; } } catch (e) { /* ok */ }
if (cons.novos.length && tinhaMapa) setTimeout(() => celebrarBrasoes(cons.novos), 600);
}

/* ===================== ROTEADOR ===================== */
const ROTAS = { feed: renderFeed, explorar: renderExplorar, publicar: renderPublicar, mensagens: renderMensagens, perfil: renderPerfil, nucleo: renderNucleo, moderacao: renderModeracao, tag: renderTag, brasoes: renderBrasoes };
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
const snap = await getDocs(query(collection(db, 'stories'), where('expiraEm', '>', new Date().toISOString()), orderBy('expiraEm', 'asc'), limit(120)));
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
function storiesHTML() {
const grupos = gruposStories();
return `<div class="stories">
<button type="button" class="story novo" data-story-novo><span class="anel"><span class="avatar"><i class="fas fa-plus"></i></span></span><span>Seu story</span></button>
${grupos.map((g) => `<button type="button" class="story ${g.visto ? 'visto' : ''} ${g.nucleo ? 'nucleo' : ''}" data-story="${escapeHTML(g.chave)}">${g.nucleo ? `<span class="anel" style="--c1:#00B140;--c2:#002D72;--c3:#389E92"><span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span></span>` : anelHTML({ ...g, nome: g.nome })}<span>${escapeHTML(g.id === uid ? 'Você' : (g.nucleo ? nomeCurtoNucleo(g.nome) : String(g.nome || '').split(' ')[0]))}</span></button>`).join('')}
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
toast('Comprimindo a foto…');
try {
const img = await comprimirAdaptativo(file, STORY_MAX_DIM, STORY_ALVO_KB);
const url = await subirDataUrl(`rede/${uid}/story_${Date.now()}.jpg`, img.dataUrl);
const agora = new Date();
await addDoc(collection(db, 'stories'), {
autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '', autorCordao: perfil.cordaoAtual || '',
nucleoId: comoNucleo ? meuNucleoGerenciado() : (perfil.academiaId || null), nucleoNome: comoNucleo ? (nucleoDe(meuNucleoGerenciado()) || {}).nome || '' : (perfil.academiaNome || ''),
comoNucleo, midiaUrl: url, texto: texto.slice(0, 200), criadoEm: agora.toISOString(), expiraEm: new Date(agora.getTime() + 24 * 3600 * 1000).toISOString(),
});
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
return `<div class="midias" data-midias>
<div class="faixa">${m.map((x, i) => x.tipo === 'video' ? `<video src="${escapeHTML(x.url)}" controls playsinline preload="metadata"></video>` : `<img src="${escapeHTML(x.url)}" alt="" loading="lazy" data-ver="${i}">`).join('')}</div>
${m.length > 1 ? `<span class="cont">1/${m.length}</span><div class="pontos">${m.map((x, i) => `<i class="${i ? '' : 'ativo'}"></i>`).join('')}</div>` : ''}${local}
</div>`;
}
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
<div class="post-topo"><button type="button" class="anel-btn" data-perfil="${escapeHTML(p.autorUid)}" style="background:none;border:0;padding:0">${anelHTML(autor)}</button>
<div class="quem"><button type="button" class="nome" data-perfil="${escapeHTML(p.autorUid)}">${escapeHTML(p.autorNome || 'Capoeirista')}</button><div class="meta">${meta}</div></div>
<button type="button" class="post-menu" data-acao="menu" aria-label="Opções"><i class="fas fa-ellipsis"></i></button></div>
${revisao}
${p.texto ? `<p class="post-texto">${formatarTexto(p.texto)}</p>` : ''}
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
async function carregarPosts(mais = false) {
let q = query(collection(db, 'posts'), orderBy('criadoEm', 'desc'), limit(PAGINA));
if (mais && ultimoDoc) q = query(collection(db, 'posts'), orderBy('criadoEm', 'desc'), startAfter(ultimoDoc), limit(PAGINA));
const snap = await getDocs(q);
const novos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
posts = mais ? posts.concat(novos) : novos;
ultimoDoc = snap.docs.length === PAGINA ? snap.docs[snap.docs.length - 1] : null;
await Promise.all(Array.from(new Set(novos.map((p) => p.autorUid))).map(pubDe));
}
async function carregarAvisos() {
try {
const snap = await getDocs(query(collection(db, 'avisos'), orderBy('criadoEm', 'desc'), limit(8)));
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
if (!soRedesenhar) { await Promise.all([carregarStories(), carregarAvisos(), posts.length ? Promise.resolve() : carregarPosts(false)]); }
const visiveis = filtrarPosts(posts);
vista.innerHTML = `
${storiesHTML()}
<div class="abas" id="abasFeed">${[['rede', 'Rede'], ['nucleo', 'Meu núcleo'], ['seguindo', 'Seguindo'], ['salvos', 'Salvos']].map(([k, t]) => `<button type="button" data-f="${k}" class="${filtroFeed === k ? 'ativa' : ''}">${t}</button>`).join('')}</div>
${filtroFeed === 'rede' ? avisos.map(avisoHTML).join('') : ''}
<div id="listaPosts">${visiveis.length ? visiveis.map(postHTML).join('') : `<div class="vazio"><i class="fas fa-users"></i><b>${filtroFeed === 'salvos' ? 'Nada salvo ainda' : filtroFeed === 'seguindo' ? 'Ninguém que você segue publicou' : filtroFeed === 'nucleo' ? 'Seu núcleo ainda não publicou' : 'Ninguém publicou ainda'}</b>${filtroFeed === 'rede' ? 'Seja o primeiro a compartilhar um momento do treino.' : 'Toque em Explorar pra descobrir atletas e núcleos.'}</div>`}</div>
${ultimoDoc ? '<button type="button" class="btn-mais" id="btnMaisPosts">Carregar mais</button>' : ''}`;
el('abasFeed').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; filtroFeed = b.dataset.f; renderFeed(null, vista, true); });
const btnMais = el('btnMaisPosts'); if (btnMais) btnMais.addEventListener('click', async () => { btnMais.disabled = true; try { await carregarPosts(true); renderFeed(null, vista, true); } catch (e) { toast('Não deu pra carregar mais.'); btnMais.disabled = false; } });
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
const podeApagar = podeModerar(p);
abrirFolha(`<h3>Post de ${escapeHTML(p.autorNome || '')}</h3>
<div style="display:grid;gap:8px">
${p.autorUid === uid ? `<button type="button" class="btn-claro" data-m="momento"><i class="fas fa-star"></i> ${p.melhorMomento ? 'Tirar de melhores momentos' : 'Marcar como melhor momento'}</button>` : ''}
<button type="button" class="btn-claro" data-m="perfil"><i class="far fa-user"></i> Ver perfil do autor</button>
${p.autorUid !== uid ? `<button type="button" class="btn-claro" data-m="denunciar"><i class="fas fa-flag"></i> Denunciar este post</button>` : ''}
${podeApagar ? `<button type="button" class="btn-perigo" data-m="apagar"><i class="fas fa-trash-can"></i> Apagar post</button>` : ''}
</div>`, async (m) => {
if (m === 'perfil') ir(`perfil/${p.autorUid}`);
if (m === 'momento') { try { await updateDoc(doc(db, 'posts', p.id), { melhorMomento: !p.melhorMomento }); p.melhorMomento = !p.melhorMomento; card.outerHTML = postHTML(p); toast(p.melhorMomento ? 'Agora é um melhor momento ⭐' : 'Removido dos melhores momentos.'); } catch (e) { toast('Não foi possível alterar.'); } }
if (m === 'denunciar') { const motivo = prompt('Por que este post deve ser revisado?'); if (motivo) { try { await addDoc(collection(db, 'denuncias'), { postId: p.id, autorPostUid: p.autorUid, autorPostAcademiaId: p.autorAcademiaId || null, denuncianteUid: uid, denuncianteNome: perfil.nome || '', motivo: motivo.slice(0, 300), criadoEm: new Date().toISOString(), status: 'aberta' }); toast('Denúncia enviada aos responsáveis. Obrigado.'); } catch (e) { toast('Não foi possível enviar a denúncia.'); } } }
if (m === 'apagar') { if (!confirm('Apagar este post?')) return; try { await deleteDoc(doc(db, 'posts', p.id)); posts = posts.filter((x) => x.id !== p.id); card.remove(); toast('Post apagado.'); } catch (e) { toast('Sem permissão pra apagar este post.'); } }
});
}
async function abrirComentarios(p, card) {
const box = card.querySelector('[data-comentarios]');
if (!box.classList.contains('oculto')) { box.classList.add('oculto'); return; }
box.classList.remove('oculto'); box.innerHTML = '<p class="contador">Carregando comentários…</p>';
try {
const snap = await getDocs(query(collection(db, 'posts', p.id, 'comentarios'), orderBy('criadoEm', 'asc'), limit(60)));
const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
box.innerHTML = (lista.map((c) => `<div class="comentario" data-cid="${c.id}">${avatarHTML({ id: c.autorUid, nome: c.autorNome, fotoUrl: c.autorFoto }, 'mini')}<div class="bolha"><strong>${escapeHTML(c.autorNome || 'Capoeirista')} <small>· ${tempoRelativo(c.criadoEm)}</small></strong>${formatarTexto(c.texto)}</div>${(c.autorUid === uid || p.autorUid === uid || ehModerador() || gerencia(p.autorAcademiaId)) ? `<button type="button" class="post-menu" data-acao="apagar-comentario" aria-label="Apagar comentário" style="width:28px;height:28px"><i class="fas fa-xmark"></i></button>` : ''}</div>`).join('') || '<p class="contador">Nenhum comentário ainda.</p>')
+ `<form class="novo-comentario" data-form-comentario><input type="text" maxlength="400" placeholder="Escreva um comentário…" required><button type="submit" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></form>`;
} catch (e) { console.error(e); box.innerHTML = '<p class="contador">Não foi possível carregar os comentários.</p>'; }
}
async function comentar(p, card, form) {
const input = form.querySelector('input'); const texto = input.value.trim(); if (!texto) return;
form.querySelector('button').disabled = true;
try {
await addDoc(collection(db, 'posts', p.id, 'comentarios'), { autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '', texto, criadoEm: new Date().toISOString() });
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(1) }); p.comentariosCount = (p.comentariosCount || 0) + 1; } catch (e) { /* cosmético */ }
card.querySelector('[data-comentarios]').classList.add('oculto'); await abrirComentarios(p, card);
const btn = card.querySelector('[data-acao="comentar"]'); if (btn) btn.innerHTML = `<i class="far fa-comment"></i> ${p.comentariosCount || ''}`;
} catch (e) { console.error(e); toast('Não foi possível comentar.'); } finally { form.querySelector('button').disabled = false; }
}
async function apagarComentario(p, card, cid) {
try {
await deleteDoc(doc(db, 'posts', p.id, 'comentarios', cid));
try { await updateDoc(doc(db, 'posts', p.id), { comentariosCount: increment(-1) }); p.comentariosCount = Math.max(0, (p.comentariosCount || 1) - 1); } catch (e) { /* cosmético */ }
card.querySelector('[data-comentarios]').classList.add('oculto'); await abrirComentarios(p, card);
} catch (e) { toast('Sem permissão pra apagar esse comentário.'); }
}
// Delegação: um listener só pra toda a vista (posts aparecem em várias telas).
function ligarEventosVista() {
const vista = el('vista');
vista.addEventListener('click', (ev) => {
const hash = ev.target.closest('.hash'); if (hash) { ir(`tag/${hash.dataset.hash}`); return; }
const perfilBtn = ev.target.closest('[data-perfil]'); if (perfilBtn) { ir(`perfil/${perfilBtn.dataset.perfil}`); return; }
const nucBtn = ev.target.closest('[data-nucleo]'); if (nucBtn && nucBtn.dataset.nucleo) { ir(`nucleo/${nucBtn.dataset.nucleo}`); return; }
const salaBtn = ev.target.closest('[data-brasoes]'); if (salaBtn) { ir(`brasoes/${salaBtn.dataset.brasoes}`); return; }
const brBtn = ev.target.closest('[data-brasao]'); if (brBtn) { const alvo = vista.dataset.pubBrasoes || (location.hash.split('/')[1]) || uid; pubDe(alvo).then((pub) => abrirBrasao(brBtn.dataset.brasao, pub || meuPub || {})); return; }
const st = ev.target.closest('[data-story]'); if (st) { abrirStories(st.dataset.story); return; }
if (ev.target.closest('[data-story-novo]')) { el('inputStory').click(); return; }
const ver = ev.target.closest('[data-ver]'); if (ver && ver.tagName === 'IMG') { abrirMidia(`<img src="${escapeHTML(ver.src)}" alt="">`); return; }
const card = ev.target.closest('.post'); if (!card) return;
const p = posts.find((x) => x.id === card.dataset.id) || (card.__post); if (!p) return;
const btn = ev.target.closest('[data-acao]'); if (!btn) return;
const acao = btn.dataset.acao;
if (acao === 'curtir') curtir(p, btn); else if (acao === 'salvar') salvar(p, btn); else if (acao === 'comentar') abrirComentarios(p, card);
else if (acao === 'compartilhar') compartilhar(p); else if (acao === 'menu') menuPost(p, card);
else if (acao === 'apagar-comentario') { const c = ev.target.closest('.comentario'); if (c) apagarComentario(p, card, c.dataset.cid); }
else if (acao === 'revisar-ok') { updateDoc(doc(db, 'posts', p.id), { revisao: 'ok', revisadoPor: uid }).then(() => { p.revisao = 'ok'; card.outerHTML = postHTML(p); toast('Post aprovado.'); }).catch(() => toast('Sem permissão pra aprovar.')); }
});
vista.addEventListener('submit', (ev) => {
const form = ev.target.closest('[data-form-comentario]'); if (!form) return; ev.preventDefault();
const card = form.closest('.post'); const p = posts.find((x) => x.id === card.dataset.id) || card.__post; if (p) comentar(p, card, form);
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
const snap = await getDocs(query(collection(db, 'posts'), where('autorUid', '==', alvoUid), limit(90)));
return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}
function gradeHTML(lista, vazio) {
if (!lista.length) return `<div class="vazio"><i class="fas fa-image"></i>${vazio}</div>`;
return `<div class="grade">${lista.map((p, i) => { const m = midiasDe(p)[0]; return `<button type="button" data-abrir-post="${p.id}" class="${i === 0 && p.melhorMomento ? 'grande' : ''}">${m.tipo === 'video' ? `<video src="${escapeHTML(m.url)}" preload="metadata" muted></video><i class="fas fa-video ic"></i>` : `<img src="${escapeHTML(m.url)}" alt="" loading="lazy">`}${midiasDe(p).length > 1 ? '<i class="fas fa-layer-group ic"></i>' : ''}${p.melhorMomento ? '<span class="selo">★ momento</span>' : ''}</button>`; }).join('')}</div>`;
}
/* ===================== BRASÕES (catálogo real em brasoes.js) ===================== */
// Dados de avaliação a partir do perfil público (o que a pessoa publicou sobre si).
function dadosBrasoesDe(pub) {
const manuais = {}; Object.entries(pub.brasoes || {}).forEach(([id, v]) => { if (v && v.manual) manuais[id] = { em: v.em, porNome: v.por || null }; });
return { cordaoAtual: pub.cordaoAtual, fundador: !!pub.fundador, historicoGraduacoes: pub.historicoGraduacoes || [], criadoEm: pub.criadoEm, resumoPresencas: pub.resumoPresencas || null, resumoRede: pub.resumoRede || null, resumoFormacao: pub.resumoFormacao || null, academiaId: pub.academiaId, academiaGerenciadaId: pub.academiaGerenciadaId, brasoesManuais: manuais, brasoes: pub.brasoes || {} };
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
</div>`);
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
// Festa de brasão novo (momento de pico): mostra a peça grande com brilho.
function celebrarBrasoes(ids) {
const lista = ids.map(brasaoPorId).filter(Boolean); if (!lista.length) return;
const a = lista[0];
const f = abrirFolha(`<div class="celebra"><span class="eyebrow">${lista.length > 1 ? `${lista.length} brasões novos` : 'Brasão novo'}</span><h2>${escapeHTML(a.nome)}</h2><div class="celebra-palco"><img src="${urlPng(a)}" alt=""></div><p>${escapeHTML(a.como || '')}</p>${lista.length > 1 ? `<div class="brasoes-grade" style="margin-top:8px">${lista.slice(1, 5).map((x) => `<span class="brasao ganho"><img src="${urlThumb(x)}" alt=""><b>${escapeHTML(x.nome)}</b></span>`).join('')}</div>` : ''}<button type="button" class="btn-verde" data-m="ok" style="width:100%;margin-top:14px">Axé!</button></div>`);
f.querySelector('.conteudo').classList.add('celebra-folha');
}
function trajetoriaHTML(pub) {
const hist = (pub.historicoGraduacoes || []).slice().sort((a, b) => new Date(b.em) - new Date(a.em));
const prox = proximoCordao(pub); const cProx = (pub.menor && (pub.idade || 0) < 12 ? CORDOES_KIDS : CORDOES_ADULTO).find((c) => c.nome === prox.nome) || prox;
const cAtual = coresCordao(pub);
const eventos = [
`<div class="ev futuro"><b>${escapeHTML(prox.nome)}</b><small>Próxima meta${pub.prontidao != null ? ` · prontidão ${pub.prontidao}%` : ' · sem avaliação lançada'}</small><div class="cord" style="--c1:${cProx.cor[0]};--c2:${cProx.cor[1]};--c3:${cProx.cor[2]}"></div></div>`,
...(hist.length ? hist.map((h, i) => { const cor = (CORDOES_ADULTO.find((c) => c.nome === h.cordao) || CORDOES_KIDS.find((c) => c.nome === h.cordao) || { cor: cAtual }).cor; return `<div class="ev ${i === 0 ? '' : ''}"><b>${escapeHTML(h.cordao)}</b><small>${new Date(h.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}${h.porNome ? ` · por ${escapeHTML(h.porNome)}` : ''}</small><div class="cord" style="--c1:${cor[0]};--c2:${cor[1]};--c3:${cor[2]}"></div></div>`; })
: [`<div class="ev"><b>${escapeHTML(pub.cordaoAtual || 'Iniciante')}</b><small>Cordão atual (as próximas trocas de cordão feitas pelo mestre entram aqui automaticamente)</small><div class="cord" style="--c1:${cAtual[0]};--c2:${cAtual[1]};--c3:${cAtual[2]}"></div></div>`]),
pub.criadoEm ? `<div class="ev ouro"><b>Entrou no grupo</b><small>${new Date(pub.criadoEm).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}${pub.academiaNome ? ` · ${escapeHTML(nomeCurtoNucleo(pub.academiaNome))}` : ''}</small></div>` : '',
];
return `<div class="tl">${eventos.join('')}</div>`;
}
async function renderPerfil(param, vista) {
const alvo = param || uid; const meu = alvo === uid;
if (meu) await sincronizarPerfilPublico();
pubCache.delete(alvo); const pub = await pubDe(alvo);
if (!pub) { vista.innerHTML = '<div class="vazio"><i class="far fa-user"></i><b>Perfil não encontrado</b>Essa pessoa ainda não abriu a Rede Liberdade.</div>'; return; }
el('tituloTopo').textContent = meu ? 'Meu perfil' : pub.nome;
const podeVer = podeVerPerfil(pub);
const sigo = seguindo.has(alvo); const pedi = (pub.pedidosSeguir || []).includes(uid);
const nuc = nucleoDe(pub.academiaId); const gerenciado = pub.academiaGerenciadaId ? nucleoDe(pub.academiaGerenciadaId) : null;
const titulo = [pub.cordaoAtual ? `${escapeHTML(pub.cordaoAtual)}${nuc ? ` no núcleo ${escapeHTML(nomeCurtoNucleo(nuc.nome))}` : ''}` : '', gerenciado ? `Responsável pelo núcleo ${escapeHTML(nomeCurtoNucleo(gerenciado.nome))}` : '', pub.resumoPresencas && pub.resumoPresencas.total ? `${pub.resumoPresencas.total} presença${pub.resumoPresencas.total === 1 ? '' : 's'} registrada${pub.resumoPresencas.total === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ');
let lista = []; try { lista = podeVer ? (await postsDoAutor(alvo)).filter(visivelParaMim) : []; } catch (e) { lista = []; }
const momentos = lista.filter((p) => p.melhorMomento && midiasDe(p).length);
const comMidia = lista.filter((p) => midiasDe(p).length);
const r = pub.resumoPresencas;
vista.innerHTML = `
<div class="perfil-capa">${pub.capaUrl ? `<img src="${escapeHTML(pub.capaUrl)}" alt="">` : ''}<div class="acoes-capa">${meu ? `<button type="button" class="btn-icone" id="btnCapa" title="Trocar capa"><i class="fas fa-image"></i></button><button type="button" class="btn-icone" id="btnEditarBio" title="Editar perfil"><i class="fas fa-pen"></i></button>` : `<button type="button" class="btn-icone" id="btnMsgPerfil" title="Mensagem"><i class="far fa-comment"></i></button>`}</div></div>
<div class="perfil-topo">${anelHTML(pub)}<div class="bt">${temApresentacao(gerenciado) ? '<button type="button" class="btn-claro btn-apresentacao" id="btnAprPerfil" title="Ver a apresentação em vídeo"><i class="fas fa-play"></i> Apresentação</button>' : ''}${meu ? `<button type="button" class="btn-verde" id="btnFotoPerfil" style="padding:8px 14px;font-size:.76rem"><i class="fas fa-camera"></i> Foto</button>` : `<button type="button" class="${sigo ? 'btn-claro' : 'btn-navy'}" id="btnSeguir">${sigo ? '<i class="fas fa-user-check"></i> Seguindo' : pedi ? '<i class="fas fa-clock"></i> Pedido enviado' : `<i class="fas fa-user-plus"></i> ${pub.privado ? 'Pedir pra seguir' : 'Seguir'}`}</button>`}</div></div>
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
<div class="titulo-sec">Graduações <span class="contador">linha do tempo</span></div><div class="card">${trajetoriaHTML(pub)}</div>
<div class="titulo-sec">Formação <span class="contador">direto de</span></div>${formacaoHTML(pub)}`;
else painel.innerHTML = `${brasoesResumoHTML(pub)}<div class="progresso" style="margin-top:10px"><div class="l"><span>Prontidão para ${escapeHTML(proximoCordao(pub).nome)}</span><span>${pub.prontidao != null ? pub.prontidao + '%' : '—'}</span></div><div class="barra"><i style="width:${pub.prontidao || 0}%;--c1:${coresCordao(pub)[0]};--c2:${coresCordao(pub)[1]};--c3:${coresCordao(pub)[2]}"></i></div><small>${pub.prontidao == null ? 'Sem notas lançadas pelo responsável ainda.' : pub.prontidao >= 70 ? 'Meta de 70% atingida nos critérios avaliados.' : 'Meta: 70% nos critérios avaliados pelo responsável do núcleo.'}</small></div>
<div class="progresso" style="margin-top:8px"><div class="l"><span>Presenças no mês</span><span>${r ? r.noMes : '—'}</span></div><div class="barra"><i style="width:${r ? Math.min(100, r.noMes * 100 / 12) : 0}%;--c1:#0B5C52;--c2:#389E92;--c3:#00E676"></i></div><small>${r ? `Total registrado pelo Face ID/painel: ${r.total}. Atualizado ${tempoRelativo(r.calculadoEm)}.` : 'Sem presença registrada — as conquistas destravam a partir das presenças do Face ID.'}</small></div>`;
painel.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(lista.find((p) => p.id === b.dataset.abrirPost))));
};
desenhar();
const abas = el('abasPerfil'); if (abas) abas.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; perfilAba = b.dataset.a; abas.querySelectorAll('button').forEach((x) => x.classList.toggle('ativa', x === b)); desenhar(); });
if (meu) {
el('swPriv').addEventListener('click', async (ev) => { const on = !ev.currentTarget.classList.contains('on'); try { await updateDoc(doc(db, 'perfisPublicos', uid), { privado: on }); meuPub.privado = on; ev.currentTarget.classList.toggle('on', on); el('privTxt').textContent = on ? 'Só quem você aceitar vê seus posts e momentos' : 'Toda a rede vê seus posts e momentos'; } catch (e) { toast('Não foi possível alterar.'); } });
el('btnFotoPerfil').addEventListener('click', () => el('inputFotoPerfil').click());
el('btnCapa').addEventListener('click', () => el('inputCapa').click());
el('btnEditarBio').addEventListener('click', () => editarBio(pub));
if (el('listaPedidos')) renderPedidos(pub);
} else {
el('btnSeguir').addEventListener('click', () => alternarSeguir(pub).then(() => renderPerfil(param, vista)));
el('btnMsgPerfil').addEventListener('click', () => abrirDireta(pub));
}
if (el('btnAprPerfil')) el('btnAprPerfil').addEventListener('click', () => apresentarResponsavel(gerenciado, pub, vista.querySelector('.perfil-topo .avatar')));
}
function formacaoHTML(pub) {
const n = nucleoDe(pub.academiaId); const prof = n && n.professorUid && n.professorUid !== pub.id ? (pubCache.get(n.professorUid) || { id: n.professorUid, nome: n.professorNome || 'Responsável' }) : null;
if (pub.fundador) return '<div class="formador"><span class="avatar" style="background:var(--gold);color:#241900"><i class="fas fa-crown"></i></span><div><b>Liberdade e Expressão</b><small>Fundador do grupo</small></div></div>';
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
if (!btn) return; const a = btn.dataset.acao;
if (a === 'curtir') curtir(p, btn); else if (a === 'salvar') salvar(p, btn); else if (a === 'comentar') abrirComentarios(p, card); else if (a === 'compartilhar') compartilhar(p); else if (a === 'menu') { f.remove(); menuPost(p, card); }
else if (a === 'apagar-comentario') { const c = ev.target.closest('.comentario'); if (c) apagarComentario(p, card, c.dataset.cid); }
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
</form>`);
el('formBio').addEventListener('submit', async (ev) => {
ev.preventDefault(); const fd = new FormData(ev.target);
const dados = { apelido: String(fd.get('apelido') || '').trim(), bio: String(fd.get('bio') || '').trim(), funcoes: String(fd.get('funcoes') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6), cidade: String(fd.get('cidade') || '').trim() };
try { await updateDoc(doc(db, 'perfisPublicos', uid), dados); Object.assign(meuPub, dados); pubCache.delete(uid); document.querySelector('.folha')?.remove(); toast('Perfil atualizado.'); renderPerfil(null, el('vista')); } catch (e) { toast('Não foi possível salvar.'); }
});
}
async function trocarFotoPerfil(file) {
toast('Comprimindo a foto…');
try {
const img = await comprimirAdaptativo(file, 540, 120);
const url = await subirDataUrl(`fotos_alunos/${Date.now()}_${uid}.jpg`, img.dataUrl);
await atualizar('usuarios', uid, { fotoUrl: url }); perfil.fotoUrl = url;
await updateDoc(doc(db, 'perfisPublicos', uid), { fotoUrl: url }); pubCache.delete(uid);
toast('Foto atualizada em todo o app.'); renderPerfil(null, el('vista'));
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
getDocs(query(collection(db, 'posts'), where('nucleoId', '==', id), limit(90))),
pubsDeNucleo(id, 80), n.professorUid ? pubDe(n.professorUid) : Promise.resolve(null),
]);
await Promise.all(Array.from(new Set(snapPosts.docs.map((d) => d.data().autorUid))).map(pubDe));
const lista = snapPosts.docs.map((d) => ({ id: d.id, ...d.data() })).filter(visivelParaMim).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
lista.forEach((p) => { if (!posts.some((x) => x.id === p.id)) posts.push(p); });
const momentos = lista.filter((p) => p.melhorMomento && midiasDe(p).length);
const avisosNuc = lista.filter((p) => p.tipo === 'aviso');
const ordemAtletas = atletas.slice().sort((a, b) => (ORDEM_CORDOES.indexOf(b.cordaoAtual) - ORDEM_CORDOES.indexOf(a.cordaoAtual)) || String(a.nome).localeCompare(String(b.nome)));
vista.innerHTML = `
<div class="nucleo-cabecalho"><span class="avatar"><i class="fas fa-people-group"></i></span><div style="flex:1;min-width:0"><span class="eyebrow" style="color:rgba(255,255,255,.75)">Núcleo</span><h2>${escapeHTML(n.nome)}</h2>${prof ? `<small>Responsável: ${escapeHTML(prof.nome)}</small>` : (n.professorNome ? `<small>Responsável: ${escapeHTML(n.professorNome)}</small>` : '')}${n.endereco ? `<small><i class="fas fa-location-dot"></i> ${escapeHTML(n.endereco)}</small>` : ''}<div class="pills"><span class="pill"><i class="fas fa-users"></i> ${atletas.length} na rede</span><span class="pill"><i class="fas fa-star"></i> ${momentos.length} momentos</span>${perfil.academiaId === id ? '<span class="pill"><i class="fas fa-house"></i> seu núcleo</span>' : ''}</div>${temApresentacao(n) ? '<button type="button" class="btn-apresentacao-nucleo" id="btnAprNucleo"><i class="fas fa-play"></i> Ver apresentação</button>' : ''}</div></div>
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
if (el('btnAprNucleo')) el('btnAprNucleo').addEventListener('click', () => apresentarResponsavel(n, prof, null));
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
${ev ? `<div class="evento"><div class="data"><b>${ev.data.slice(8, 10)}</b><small>${new Date(ev.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}</small></div><b class="n">${escapeHTML(ev.nome || 'Evento')}</b><small>${ev.descricao ? escapeHTML(ev.descricao) + ' · ' : ''}${nucleoDe(ev.academiaId) ? escapeHTML(nomeCurtoNucleo(nucleoDe(ev.academiaId).nome)) : 'Grupo'}${confirmados ? ` · ${confirmados.size} confirmado${confirmados.size === 1 ? '' : 's'}` : ''}</small><div class="acoes-ev"><button type="button" class="btn-claro" id="btnEuVou">${euVou ? '<i class="fas fa-check"></i> Eu vou' : '<i class="far fa-calendar-check"></i> Eu vou'}</button>${eventos.length > 1 ? `<span class="pill" style="background:rgba(255,255,255,.18);color:#fff">+${eventos.length - 1} evento${eventos.length > 2 ? 's' : ''}</span>` : ''}</div></div>` : ''}
<div class="titulo-sec">Núcleos da rede</div>
<div class="nucleos">${nucleos.filter((n) => n.ativo !== false).map((n) => `<button type="button" class="nuc" data-nucleo="${escapeHTML(n.id)}"><span class="avatar" style="background:${corAvatar(n.id)}"><i class="fas fa-people-group"></i></span><b>${escapeHTML(n.nome)}</b><small>${n.professorNome ? escapeHTML(n.professorNome) : ''}</small>${n.id === perfil.academiaId ? '<span class="pill teal">seu núcleo</span>' : (n.professorUid && (pubCache.get(n.professorUid) || {}).fundador ? '<span class="pill gold">Fundador</span>' : '')}</button>`).join('')}</div>
${sugeridos.length ? `<div class="titulo-sec">Sugestões pra você <span class="contador">do seu núcleo</span></div><div class="card" id="sugestoes">${sugeridos.map((p) => `<div class="pessoa">${anelHTML(p)}<button type="button" class="q" data-perfil="${p.id}"><b>${escapeHTML(p.nome)}</b><small>${[p.cordaoAtual, nomeCurtoNucleo(p.academiaNome)].filter(Boolean).map(escapeHTML).join(' · ')}</small></button><button type="button" class="btn-navy" data-seguir="${p.id}">${p.privado ? 'Pedir' : 'Seguir'}</button></div>`).join('')}</div>` : ''}
<div class="titulo-sec">Momentos da rede <span class="contador">recentes</span></div>
${comMidia.length ? `<div class="mosaico">${comMidia.map((p) => { const m = midiasDe(p)[0]; return `<button type="button" data-abrir-post="${p.id}">${m.tipo === 'video' ? `<video src="${escapeHTML(m.url)}" muted preload="metadata"></video>` : `<img src="${escapeHTML(m.url)}" alt="" loading="lazy">`}</button>`; }).join('')}</div>` : '<div class="vazio"><i class="fas fa-image"></i>Ainda não há fotos publicadas na rede.</div>'}`;
vista.querySelectorAll('[data-abrir-post]').forEach((b) => b.addEventListener('click', () => abrirPost(posts.find((p) => p.id === b.dataset.abrirPost))));
vista.querySelectorAll('[data-seguir]').forEach((b) => b.addEventListener('click', async () => { await alternarSeguir(sugeridos.find((x) => x.id === b.dataset.seguir)); b.textContent = seguindo.has(b.dataset.seguir) ? 'Seguindo' : 'Seguir'; }));
if (ev && el('btnEuVou')) el('btnEuVou').addEventListener('click', async () => { try { if (euVou) await deleteDoc(doc(db, 'eventos', ev.id, 'confirmados', uid)); else await setDoc(doc(db, 'eventos', ev.id, 'confirmados', uid), { nome: perfil.nome || '', em: new Date().toISOString() }); renderExplorar(null, vista); } catch (e) { toast('Não foi possível confirmar (regras do Firestore).'); } });
let timer = null;
el('buscaPessoa').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => buscar_(e.target.value), 300); });
async function buscar_(termo) {
const box = el('resultadoBusca'); const q = termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
if (!q) { box.innerHTML = ''; return; }
if (q.startsWith('#')) { ir(`tag/${q.slice(1)}`); return; }
const nucs = nucleos.filter((n) => String(n.nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
let pessoas = []; try { pessoas = (await getDocs(query(collection(db, 'perfisPublicos'), where('nomeBusca', '>=', q), where('nomeBusca', '<=', q + ''), limit(12)))).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { /* ok */ }
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
composicao = { midias: [], melhorMomento: false, nucleoId: perfil.academiaId || null, marcados: [], visibilidade: 'rede', aviso: false, hoje: null };
// Núcleo/treino sugerido pela presença real de hoje (Face ID / painel)
try { const pres = await presencasDoUsuario(uid, 10); const h = hoje0(); const deHoje = pres.find((p) => dataDe(p.entradaEm) >= h); if (deHoje) { composicao.hoje = deHoje; composicao.nucleoId = deHoje.nucleoVisitadoId || deHoje.nucleoId || composicao.nucleoId; } } catch (e) { /* sem leitura */ }
let colegas = []; try { colegas = (await pubsDeNucleo(composicao.nucleoId || perfil.academiaId, 60)).filter((p) => p.id !== uid); } catch (e) { /* ok */ }
const nucSel = nucleoDe(composicao.nucleoId);
vista.innerHTML = `<div class="card compor">
<div class="quem">${anelHTML({ ...perfil, id: uid })}<div><b>${escapeHTML(perfil.nome || '')}</b><button type="button" class="visib" id="btnVisib"><i class="fas fa-users"></i> <span>Toda a rede</span> ▾</button></div></div>
<textarea id="texto" maxlength="${LIMITE_TEXTO}" placeholder="O que rolou no treino hoje? Use #hashtags e @nomes"></textarea>
<div style="display:flex;justify-content:space-between;align-items:center"><span class="contador" id="contador">0/${LIMITE_TEXTO}</span><span class="contador" id="pesoInfo"></span></div>
<div class="midias-sel" id="midiasSel"></div>
<div class="opcoes">
<div class="opc"><div class="ic g"><i class="fas fa-star"></i></div><div class="t"><b>Marcar como melhor momento</b><small>Vai pros seus destaques e pros momentos do núcleo, com selo dourado</small></div><button type="button" class="switch cinza" id="swMomento" aria-label="Melhor momento"></button></div>
<div class="opc"><div class="ic n"><i class="fas fa-location-dot"></i></div><div class="t"><b>Núcleo do treino</b><small id="nucInfo">${composicao.hoje ? `Detectado pela sua presença de hoje às ${dataDe(composicao.hoje.entradaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sem presença registrada hoje — escolha o núcleo'}</small></div><select id="selNucleo">${nucleos.filter((n) => n.ativo !== false).map((n) => `<option value="${escapeHTML(n.id)}" ${n.id === composicao.nucleoId ? 'selected' : ''}>${escapeHTML(nomeCurtoNucleo(n.nome))}</option>`).join('')}<option value="" ${!composicao.nucleoId ? 'selected' : ''}>Sem núcleo</option></select></div>
<div class="opc" style="flex-wrap:wrap"><div class="ic"><i class="fas fa-user-tag"></i></div><div class="t"><b>Marcar atletas</b><small id="marcInfo">${colegas.length ? 'Toque pra marcar quem estava no treino' : 'Ninguém do núcleo abriu a rede ainda'}</small></div><span class="val mono" id="marcQtd">0</span><div class="marcar-lista" id="marcarLista" style="width:100%">${colegas.map((c) => `<button type="button" class="pill" data-marcar="${c.id}" data-img="${c.usoImagemOk ? '1' : '0'}">${escapeHTML(c.nome.split(' ').slice(0, 2).join(' '))}${c.usoImagemOk ? '' : ' <i class="fas fa-eye-slash" title="sem termo de imagem"></i>'}</button>`).join('')}</div></div>
<div class="opc"><div class="ic"><i class="fas fa-shield-halved"></i></div><div class="t"><b>Proteger rostos</b><small id="rostosInfo">Detecta rostos nas fotos e deixa você desfocar quem não autorizou imagem</small></div><button type="button" class="val" id="btnRostos" disabled>Detectar</button></div>
${ehGestor() || ehModerador() ? `<div class="opc"><div class="ic" style="background:var(--green-soft);color:#1E8449"><i class="fas fa-bullhorn"></i></div><div class="t"><b>Publicar como aviso do núcleo</b><small>Aparece destacado em verde pra todo mundo no feed</small></div><button type="button" class="switch cinza" id="swAviso" aria-label="Aviso"></button></div>` : ''}
</div>
<div style="margin-top:14px"><button type="button" class="btn-verde" id="btnPublicar" style="width:100%;padding:13px" disabled><i class="fas fa-paper-plane"></i> Publicar na rede</button><p class="contador" style="text-align:center;margin-top:8px">Publique com respeito — o grupo tem crianças. Fotos são comprimidas automaticamente antes de subir.</p></div>
</div>`;
const texto = el('texto');
const atualizar_ = () => { el('contador').textContent = `${texto.value.length}/${LIMITE_TEXTO}`; el('btnPublicar').disabled = !(texto.value.trim() || composicao.midias.length); el('btnRostos').disabled = !composicao.midias.some((m) => m.tipo === 'imagem'); };
texto.addEventListener('input', atualizar_);
el('swMomento').addEventListener('click', (e) => { composicao.melhorMomento = !composicao.melhorMomento; e.currentTarget.classList.toggle('on', composicao.melhorMomento); });
const swAviso = el('swAviso'); if (swAviso) swAviso.addEventListener('click', (e) => { composicao.aviso = !composicao.aviso; e.currentTarget.classList.toggle('on', composicao.aviso); if (composicao.aviso && !ehModerador() && meuNucleoGerenciado()) { composicao.nucleoId = meuNucleoGerenciado(); el('selNucleo').value = composicao.nucleoId; } if (composicao.aviso) toast(`Este post vai sair como aviso do núcleo ${nomeCurtoNucleo((nucleoDe(composicao.nucleoId) || {}).nome || '')}.`); });
el('selNucleo').addEventListener('change', (e) => { composicao.nucleoId = e.target.value || null; });
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
if (f.size > VIDEO_MAX_MB * 1024 * 1024) { toast(`Vídeo acima de ${VIDEO_MAX_MB} MB — grave um trecho mais curto.`); continue; }
const info = await duracaoVideo(f);
if (!(info.dur <= VIDEO_MAX_SEG)) { toast(`Vídeo com mais de ${VIDEO_MAX_SEG} s — corte um trecho curto.`); continue; }
composicao.midias.push({ tipo: 'video', arquivo: f, previewUrl: URL.createObjectURL(f), original: f.size, final: f.size, dur: info.dur });
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
btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publicando…';
try {
const nuc = nucleoDe(composicao.nucleoId);
const midias = [];
for (const m of composicao.midias) {
if (m.tipo === 'video') { const r = storageRef(storage, `rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.mp4`); await uploadBytes(r, m.arquivo, { contentType: m.arquivo.type || 'video/mp4' }); midias.push({ url: await getDownloadURL(r), tipo: 'video', dur: Math.round(m.dur || 0) }); }
else { midias.push({ url: await subirDataUrl(`rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`, m.dataUrl), tipo: 'imagem', w: m.w, h: m.h }); }
}
const semTermo = composicao.marcados.some((x) => !x.usoImagemOk) && !composicao.midias.some((m) => m.rostos && m.rostos.some((r) => r.borrado));
const precisaRevisao = midias.length > 0 && (souMenor() || semTermo);
const ehAviso = composicao.aviso && (ehModerador() || gerencia(composicao.nucleoId));
const docPost = {
autorUid: uid, autorNome: perfil.nome || '', autorFoto: perfil.fotoUrl || '', autorAcademiaId: perfil.academiaId || null, autorAcademiaNome: perfil.academiaNome || '', autorCordao: perfil.cordaoAtual || '',
autorMenor: !!souMenor(), texto, fotoUrl: midias.find((m) => m.tipo === 'imagem')?.url || null, midias,
tipo: ehAviso ? 'aviso' : 'post', melhorMomento: !!composicao.melhorMomento && !ehAviso,
nucleoId: nuc ? nuc.id : null, nucleoNome: nuc ? nuc.nome : '', marcados: composicao.marcados.map((m) => ({ uid: m.uid, nome: m.nome })),
visibilidade: composicao.visibilidade, hashtags: extrairHashtags(texto), revisao: precisaRevisao ? 'pendente' : 'ok',
criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0,
};
await addDoc(collection(db, 'posts'), docPost);
posts = []; ultimoDoc = null; filtroFeed = 'rede';
toast(precisaRevisao ? 'Publicado! O responsável do núcleo vai revisar as fotos.' : 'Publicado! Axé.');
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
await setDoc(doc(db, 'conversas', id), {
tipo: 'direta', participantes: [uid, pub.id], nomes: { [uid]: perfil.nome || '', [pub.id]: pub.nome || '' }, fotos: { [uid]: perfil.fotoUrl || '', [pub.id]: pub.fotoUrl || '' },
nucleosIds: Array.from(new Set([perfil.academiaId, pub.academiaId].filter(Boolean))), envolveMenor: !!(souMenor() || pub.menor),
criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), ultimaMsg: '', ultimoAutor: null,
});
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
if (ehGestor()) consultas.push(tentar(query(collection(db, 'conversas'), where('nucleosIds', 'array-contains', meuNucleoGerenciado()), limit(30))));
const partes = await Promise.all(consultas);
const mapa = new Map(); partes.flat().forEach((x) => mapa.set(x.id, { id: x.id, ...x.data() }));
return Array.from(mapa.values()).sort((a, b) => new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0));
}
async function garantirGrupoDoNucleo() {
if (!ehGestor()) return;
const nid = meuNucleoGerenciado(); const id = `nucleo_${nid}`;
try { const s = await getDoc(doc(db, 'conversas', id)); if (!s.exists()) await setDoc(doc(db, 'conversas', id), { tipo: 'grupo', nucleoId: nid, nome: (nucleoDe(nid) || {}).nome || 'Meu núcleo', participantes: [uid], nucleosIds: [nid], criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), ultimaMsg: 'Grupo do núcleo criado', ultimoAutor: uid }); } catch (e) { /* ok */ }
}
function nomeConversa(c) { if (c.tipo === 'grupo') return c.nome || 'Grupo'; const outro = (c.participantes || []).find((p) => p !== uid) || uid; return (c.nomes || {})[outro] || 'Conversa'; }
function fotoConversa(c) { if (c.tipo === 'grupo') return null; const outro = (c.participantes || []).find((p) => p !== uid); return { id: outro, nome: nomeConversa(c), fotoUrl: (c.fotos || {})[outro] || '' }; }
async function renderMensagens(param, vista) {
if (param) return renderChat(param, vista);
el('tituloTopo').textContent = 'Mensagens';
await garantirGrupoDoNucleo();
const lista = await minhasConversas();
const lidas = JSON.parse(localStorage.getItem('rede.lidas') || '{}');
vista.innerHTML = `<div class="busca"><i class="fas fa-magnifying-glass" style="color:var(--soft)"></i><input id="buscaConv" type="search" placeholder="Buscar atleta pra conversar…" autocomplete="off"></div><div id="resConv"></div>
<div class="card">${lista.map((c) => { const f = fotoConversa(c); const nova = c.atualizadoEm && (!lidas[c.id] || lidas[c.id] < c.atualizadoEm) && c.ultimoAutor && c.ultimoAutor !== uid; return `<button type="button" class="conv ${c.tipo === 'grupo' ? 'grupo' : ''}" data-conv="${c.id}">${c.tipo === 'grupo' ? `<span class="avatar" style="background:var(--navy)"><i class="fas fa-people-group"></i></span>` : avatarHTML(f)}<div class="q"><b>${escapeHTML(nomeConversa(c))}</b><small>${escapeHTML(c.ultimaMsg || 'Sem mensagens ainda')}</small></div><div class="meta">${c.atualizadoEm ? tempoRelativo(c.atualizadoEm) : ''}${nova ? '<br><span class="n">•</span>' : ''}</div></button>`; }).join('') || '<div class="vazio" style="border:0"><i class="far fa-comment"></i><b>Nenhuma conversa ainda</b>Abra o perfil de um atleta e toque no balão pra conversar.</div>'}</div>
<p class="contador" style="text-align:center;padding:0 12px"><i class="fas fa-shield-halved"></i> Conversas com menores ficam visíveis ao responsável do núcleo. Menores só conversam com pessoas do próprio núcleo.</p>`;
vista.querySelectorAll('[data-conv]').forEach((b) => b.addEventListener('click', () => ir(`mensagens/${b.dataset.conv}`)));
let timer = null;
el('buscaConv').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(async () => {
const q = e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); const box = el('resConv'); if (!q) { box.innerHTML = ''; return; }
try { const pessoas = (await getDocs(query(collection(db, 'perfisPublicos'), where('nomeBusca', '>=', q), where('nomeBusca', '<=', q + ''), limit(10)))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== uid);
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
${c.envolveMenor || c.tipo === 'grupo' ? `<div class="aviso-chat"><i class="fas fa-shield-halved"></i> ${c.tipo === 'grupo' ? 'Grupo do núcleo — o responsável modera as mensagens.' : 'Conversa visível ao responsável do núcleo — o grupo tem crianças.'}</div>` : ''}
<div class="mensagens" id="msgs"><p class="contador" style="text-align:center">Carregando…</p></div>
<div class="digitar"><button type="button" class="btn-icone" id="btnFotoChat" aria-label="Foto"><i class="fas fa-camera"></i></button><textarea id="msgTexto" rows="1" maxlength="1000" placeholder="Mensagem…"></textarea><button type="button" class="btn-icone enviar" id="btnEnviarMsg" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></div>
</div>`;
el('btnVoltarChat').addEventListener('click', () => ir('mensagens'));
const box = el('msgs');
chatUnsub = onSnapshot(query(collection(db, 'conversas', id, 'mensagens'), orderBy('criadoEm', 'desc'), limit(60)), (snap) => {
const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
box.innerHTML = msgs.map((m) => `<div class="balao ${m.autorUid === uid ? 'meu' : 'dele'}">${c.tipo === 'grupo' && m.autorUid !== uid ? `<span class="de">${escapeHTML(m.autorNome || '')}</span>` : ''}${m.midiaUrl ? `<img src="${escapeHTML(m.midiaUrl)}" alt="" data-ver="0">` : ''}${m.texto ? formatarTexto(m.texto) : ''}<time>${new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('') || '<p class="contador" style="text-align:center">Diga um "Axé" pra começar.</p>';
box.scrollTop = box.scrollHeight; window.scrollTo({ top: document.body.scrollHeight });
const lidas = JSON.parse(localStorage.getItem('rede.lidas') || '{}'); lidas[id] = new Date().toISOString(); localStorage.setItem('rede.lidas', JSON.stringify(lidas));
}, (err) => { console.error(err); box.innerHTML = '<p class="contador" style="text-align:center">Sem permissão pra ler esta conversa.</p>'; });
const enviar = async (texto, midiaUrl) => {
if (!texto && !midiaUrl) return;
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
async function renderModeracao(param, vista) {
if (!(ehModerador() || ehGestor())) { ir('feed'); return; }
el('tituloTopo').textContent = 'Moderação';
let denuncias = []; let pendentes = [];
// gestor: a consulta já traz o filtro do núcleo (é o que a regra consegue provar)
try { const qd = ehModerador() ? query(collection(db, 'denuncias'), where('status', '==', 'aberta'), limit(50)) : query(collection(db, 'denuncias'), where('status', '==', 'aberta'), where('autorPostAcademiaId', '==', meuNucleoGerenciado()), limit(50)); denuncias = (await getDocs(qd)).docs.map((d) => ({ id: d.id, ...d.data() })); } catch (e) { console.warn('denuncias', e); }
try { pendentes = (await getDocs(query(collection(db, 'posts'), where('revisao', '==', 'pendente'), limit(50)))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => ehModerador() || gerencia(p.autorAcademiaId) || gerencia(p.nucleoId)); } catch (e) { /* ok */ }
pendentes.forEach((p) => { if (!posts.some((x) => x.id === p.id)) posts.push(p); });
vista.innerHTML = `<div class="titulo-sec">Posts aguardando revisão <span class="pill gold">${pendentes.length}</span></div>${pendentes.map(postHTML).join('') || '<div class="vazio"><i class="fas fa-check"></i>Nada pendente. Posts de menores e com atletas sem termo de imagem aparecem aqui.</div>'}
<div class="titulo-sec">Denúncias abertas <span class="pill red">${denuncias.length}</span></div>${denuncias.map((d) => `<div class="card denuncia"><i class="fas fa-flag" style="color:var(--red)"></i><div class="q"><b>${escapeHTML(d.motivo)}</b><small>por ${escapeHTML(d.denuncianteNome || '')} · ${tempoRelativo(d.criadoEm)}</small></div><div style="display:grid;gap:6px"><button type="button" class="btn-claro" data-ver-post="${d.postId}">Ver post</button><button type="button" class="btn-perigo" data-apagar-post="${d.postId}" data-den="${d.id}">Apagar post</button><button type="button" class="btn-claro" data-fechar-den="${d.id}">Ignorar</button></div></div>`).join('') || '<div class="vazio"><i class="fas fa-flag"></i>Nenhuma denúncia aberta.</div>'}`;
vista.querySelectorAll('[data-ver-post]').forEach((b) => b.addEventListener('click', async () => { const s = await getDoc(doc(db, 'posts', b.dataset.verPost)); if (s.exists()) abrirPost({ id: s.id, ...s.data() }); else toast('Esse post já foi apagado.'); }));
vista.querySelectorAll('[data-fechar-den]').forEach((b) => b.addEventListener('click', async () => { try { await updateDoc(doc(db, 'denuncias', b.dataset.fecharDen), { status: 'fechada', fechadaPor: uid }); b.closest('.card').remove(); } catch (e) { toast('Sem permissão.'); } }));
vista.querySelectorAll('[data-apagar-post]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Apagar o post denunciado?')) return; try { await deleteDoc(doc(db, 'posts', b.dataset.apagarPost)); await updateDoc(doc(db, 'denuncias', b.dataset.den), { status: 'fechada', fechadaPor: uid, acao: 'post apagado' }); b.closest('.card').remove(); toast('Post apagado.'); } catch (e) { toast('Não foi possível apagar.'); } }));
}

/* ===================== TEMA ===================== */
function aplicarTema(t) { document.documentElement.setAttribute('data-theme', t); document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'dark' ? '#0E1715' : '#F5F9F8'); el('btnTema').innerHTML = `<i class="fas ${t === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>`; try { localStorage.setItem('rede.tema', t); } catch (e) { /* ok */ } }

/* ===================== BOOT ===================== */
observarSessao(async (user) => {
el('telaCarregando').classList.add('oculto');
if (!user) { el('telaSemSessao').classList.remove('oculto'); return; }
uid = user.uid;
try { perfil = await buscar('usuarios', uid); } catch (e) { perfil = null; }
if (!perfil) { el('telaSemSessao').classList.remove('oculto'); return; }
seguindo = new Set(Array.isArray(perfil.seguindo) ? perfil.seguindo : []);
salvos = new Set(Array.isArray(perfil.salvos) ? perfil.salvos : []);
try { nucleos = await listar('nucleos'); } catch (e) { nucleos = []; }
try { configBrasoes = (await buscar('config', 'brasoes')) || {}; } catch (e) { configBrasoes = {}; }
if (!configBrasoes.nucleoFundadorId) { // padrão honesto: o núcleo cujo responsável tem Acesso Geral
try { const pubs = await Promise.all(nucleos.filter((n) => n.professorUid).map((n) => pubDe(n.professorUid))); const i = pubs.findIndex((p) => p && p.fundador); if (i >= 0) configBrasoes.nucleoFundadorId = nucleos.filter((n) => n.professorUid)[i].id; } catch (e) { /* ok */ }
}
meuPub = await pubDe(uid);
el('app').classList.remove('oculto');
let tema = 'light'; try { tema = localStorage.getItem('rede.tema') || 'light'; } catch (e) { /* ok */ }
aplicarTema(tema);
el('btnTema').addEventListener('click', () => aplicarTema(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
if (ehModerador() || ehGestor()) el('btnModeracao').style.display = '';
el('btnModeracao').addEventListener('click', () => ir('moderacao'));
el('btnMensagensTopo').addEventListener('click', () => ir('mensagens'));
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
if (location.hash.startsWith('#post/')) { const id = location.hash.slice(6); try { const s = await getDoc(doc(db, 'posts', id)); if (s.exists()) { location.hash = '#feed'; setTimeout(() => abrirPost({ id: s.id, ...s.data() }), 400); } } catch (e) { /* ok */ } }
roteia();
});
