/* checkin.js — Presença por Face ID do próprio aluno, em qualquer núcleo.

Verificação 1:1: a câmera compara o rosto na tela com a FOTO DE PERFIL do
aluno logado (usuarios/{uid}.fotoUrl). Se bater com segurança em quadros
seguidos, grava em presencas/{id}:
  uid, alunoNome, nucleoId (núcleo DE ORIGEM do aluno — é onde o mestre dele
  vê a presença), nucleoVisitadoId/Nome (onde ele treinou de fato), visitante
  (true quando treinou fora), origem 'faceid-aluno', confirmadoAos30 true (o
  reconhecimento é a confirmação; não existe mais "confirmar aos 30 min").
Tudo roda no aparelho; nenhuma imagem da câmera é enviada. O descritor da
foto (128 números) fica salvo no próprio cadastro pra não recalcular. */
import { observarSessao, buscar, listarNucleosAtivos, criar, atualizar, presencasDoUsuario, sair } from './firebase.js';
import { escapeHTML } from './shared.js';

const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.esm.js';
const MODELOS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
const LIMIAR = 0.5;               // distância máxima pra aceitar que é a mesma pessoa
const QUADROS_SEGUIDOS = 3;
const INTERVALO_MS = 400;

const el = (id) => document.getElementById(id);
let faceapi = null;
let stream = null;
let timer = null;
let ocupado = false;
let perfil = null;
let uid = null;
let nucleos = [];
let meuDescritor = null;
let seguidos = 0;
let registrado = false;

function status(txt, erro = false) {
const box = el('status');
box.classList.remove('oculto');
box.classList.toggle('erro', !!erro);
box.querySelector('i').className = `fas ${erro ? 'fa-triangle-exclamation' : 'fa-face-smile'}`;
el('statusTexto').textContent = txt;
}

function nomeCurtoNucleo(nome) { return String(nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim(); }
function hashFoto(f) { let h = 0; const s = String(f || ''); for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return `${s.length}:${h}`; }
const dataDe = (p) => (p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm));

function nucleoSelecionado() { return nucleos.find((n) => n.id === el('selNucleo').value) || null; }

function atualizarInfoNucleo() {
const n = nucleoSelecionado();
const info = el('nucleoInfo');
if (!n) { info.innerHTML = ''; return; }
const visita = n.id !== perfil.academiaId;
info.innerHTML = visita
? `<span class="chip gold"><i class="fas fa-person-walking-arrow-right"></i> Treino ${escapeHTML(nomeCurtoNucleo(n.nome))}</span><span class="chip teal">fica no seu núcleo: ${escapeHTML(nomeCurtoNucleo(perfil.academiaNome || perfil.academiaId || 'seu núcleo'))}</span>`
: `<span class="chip green"><i class="fas fa-house"></i> Seu núcleo</span>`;
}

async function carregarHistorico() {
const wrap = el('historico');
try {
const itens = await presencasDoUsuario(uid, 30);
const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
const mes = itens.filter((p) => dataDe(p) >= inicioMes).length;
el('chipMes').textContent = `${mes} neste mês`;
wrap.innerHTML = itens.length
? itens.slice(0, 8).map((p) => {
const d = dataDe(p);
const visita = p.visitante && p.nucleoVisitadoId;
return `<div class="hist-item"><i class="fas ${String(p.origem || '').startsWith('faceid') ? 'fa-face-viewfinder' : 'fa-location-dot'}"></i><div><strong>${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong> · ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>${visita ? `<span class="chip gold">Treino ${escapeHTML(nomeCurtoNucleo(p.nucleoVisitadoNome || p.nucleoVisitadoId))}</span>` : '<span class="chip green">presente</span>'}</div>`;
}).join('')
: '<p class="dica" style="margin:0;">Nenhum check-in ainda — o primeiro é agora.</p>';
} catch (e) { console.error(e); wrap.innerHTML = '<p class="dica" style="margin:0;">Não foi possível carregar o histórico.</p>'; }
}

function jaRegistrouHoje(itens, nucleoVisitadoId) {
const hoje = new Date().toDateString();
return itens.some((p) => dataDe(p).toDateString() === hoje && (p.nucleoVisitadoId || p.nucleoId) === nucleoVisitadoId);
}

async function carregarBiblioteca() {
if (faceapi) return;
status('Carregando o reconhecimento facial (a primeira vez demora um pouco)...');
faceapi = await import(FACEAPI_URL);
await Promise.all([
faceapi.nets.tinyFaceDetector.loadFromUri(MODELOS_URL),
faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELOS_URL),
faceapi.nets.faceRecognitionNet.loadFromUri(MODELOS_URL),
]);
}
const opcoes = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

async function prepararMeuRosto() {
if (!perfil.fotoUrl || /placeholder/i.test(perfil.fotoUrl)) throw new Error('SEM_FOTO');
const hash = hashFoto(perfil.fotoUrl);
if (Array.isArray(perfil.faceDescriptor) && perfil.faceDescriptor.length === 128 && perfil.faceDescriptorFotoHash === hash) {
meuDescritor = new Float32Array(perfil.faceDescriptor); return;
}
status('Lendo a sua foto de perfil...');
const img = await new Promise((res, rej) => { const i = new Image(); if (!perfil.fotoUrl.startsWith('data:')) i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('FOTO_ILEGIVEL')); i.src = perfil.fotoUrl; });
const det = await faceapi.detectSingleFace(img, opcoes()).withFaceLandmarks(true).withFaceDescriptor();
if (!det) throw new Error('SEM_ROSTO_NA_FOTO');
meuDescritor = det.descriptor;
try { await atualizar('usuarios', uid, { faceDescriptor: Array.from(det.descriptor), faceDescriptorFotoHash: hash }); } catch (e) { console.warn('não salvou descritor', e); }
}

async function ligarCamera() {
const video = el('video');
stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false });
video.srcObject = stream;
await video.play();
el('toque').classList.add('oculto');
el('guia').classList.remove('oculto');
}

function desligarCamera() {
clearInterval(timer); timer = null;
if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
el('video').srcObject = null;
el('guia').classList.add('oculto');
}

async function registrar(n) {
const agora = new Date();
const visitante = n.id !== perfil.academiaId;
await criar('presencas', {
uid,
alunoNome: perfil.nome || '',
nucleoId: perfil.academiaId || n.id,
nucleoVisitadoId: n.id,
nucleoVisitadoNome: n.nome || n.id,
visitante,
entradaEm: agora,
confirmadoAos30: true,
confirmadoEm: agora,
origem: 'faceid-aluno',
registradoPor: uid,
});
registrado = true;
desligarCamera();
el('palco').classList.add('oculto');
const suc = el('sucesso');
suc.classList.remove('oculto');
el('sucessoTitulo').textContent = visitante ? `Treino ${nomeCurtoNucleo(n.nome)} registrado!` : 'Presença registrada!';
el('sucessoTexto').textContent = visitante
? `Sua presença de hoje (${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}) ficou no seu núcleo, marcada como treino em ${nomeCurtoNucleo(n.nome)}. O professor que recebeu você também vê.`
: `${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${n.nome}. Bom treino, axé!`;
carregarHistorico();
}

async function analisar() {
if (ocupado || !stream || registrado) return;
const video = el('video'); const canvas = el('canvas');
if (video.readyState < 2) return;
ocupado = true;
try {
if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
const det = await faceapi.detectSingleFace(video, opcoes()).withFaceLandmarks(true).withFaceDescriptor();
if (!det) { seguidos = 0; status('Centralize o rosto dentro da moldura...'); return; }
const b = det.detection.box;
ctx.strokeStyle = '#00E676'; ctx.lineWidth = 3; ctx.beginPath();
if (typeof ctx.roundRect === 'function') ctx.roundRect(b.x, b.y, b.width, b.height, 16); else ctx.rect(b.x, b.y, b.width, b.height);
ctx.stroke();
const dist = faceapi.euclideanDistance(det.descriptor, meuDescritor);
if (dist > LIMIAR) { seguidos = 0; status(`Não reconheci você ainda (${Math.round((1 - dist) * 100)}% parecido). Tire óculos escuros/boné e melhore a luz.`); return; }
seguidos += 1;
status(`É você, ${(perfil.nome || '').split(' ')[0]}! Confirmando ${seguidos}/${QUADROS_SEGUIDOS}...`);
if (seguidos >= QUADROS_SEGUIDOS) {
const n = nucleoSelecionado();
if (!n) { status('Escolha o núcleo onde você está treinando.', true); seguidos = 0; return; }
try {
const itens = await presencasDoUsuario(uid, 20);
if (jaRegistrouHoje(itens, n.id)) { status('Você já registrou presença hoje neste núcleo.', true); registrado = true; desligarCamera(); return; }
} catch (e) { /* segue mesmo sem histórico */ }
status('Registrando presença...');
await registrar(n);
}
} catch (e) {
console.error(e);
status('Não foi possível gravar a presença. Confira sua conexão e tente de novo.', true);
seguidos = 0;
} finally { ocupado = false; }
}

async function iniciar() {
if (stream || registrado) return;
try {
if (!navigator.mediaDevices?.getUserMedia) { status('Este navegador não dá acesso à câmera.', true); return; }
await carregarBiblioteca();
await prepararMeuRosto();
await ligarCamera();
status('Câmera ligada — olhe para a frente.');
seguidos = 0;
timer = setInterval(analisar, INTERVALO_MS);
} catch (e) {
console.error(e);
const m = String(e && e.message);
if (m === 'SEM_FOTO') status('Você ainda não tem foto de perfil. Adicione uma foto no seu perfil (app → Perfil) para usar o Face ID.', true);
else if (m === 'SEM_ROSTO_NA_FOTO' || m === 'FOTO_ILEGIVEL') status('Não achei um rosto na sua foto de perfil. Troque por uma foto de frente, com o rosto visível.', true);
else if (/Permission|NotAllowed|denied/i.test(m)) status('Permissão de câmera negada. Libere a câmera para este site e tente de novo.', true);
else status('Não foi possível iniciar o reconhecimento agora.', true);
}
}

observarSessao(async (user) => {
el('telaCarregando').classList.add('oculto');
if (!user) { el('telaSemSessao').classList.remove('oculto'); return; }
uid = user.uid;
try { perfil = await buscar('usuarios', uid); } catch (e) { perfil = null; }
if (!perfil || !(perfil.papeis || []).includes('aluno')) {
el('telaSemSessao').classList.remove('oculto');
el('telaSemSessao').querySelector('p').textContent = 'O check-in por Face ID é para contas de aluno. Professores registram presença pelo painel de gestão.';
return;
}
el('app').classList.remove('oculto');
el('quem').innerHTML = `${perfil.fotoUrl ? `<img src="${escapeHTML(perfil.fotoUrl)}" alt="">` : ''}<span>${escapeHTML((perfil.nome || '').split(' ')[0])}</span>`;
try { nucleos = (await listarNucleosAtivos()).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')); } catch (e) { nucleos = []; }
const sel = el('selNucleo');
sel.innerHTML = nucleos.map((n) => `<option value="${escapeHTML(n.id)}">${escapeHTML(n.nome || n.id)}${n.id === perfil.academiaId ? ' (meu núcleo)' : ''}</option>`).join('');
// Núcleo pré-escolhido: ?nucleo=ID (vindo do aviso de proximidade) → o mais próximo pelo GPS → o meu.
const param = new URLSearchParams(location.search).get('nucleo');
if (param && nucleos.some((n) => n.id === param)) sel.value = param;
else if (nucleos.some((n) => n.id === perfil.academiaId)) sel.value = perfil.academiaId;
atualizarInfoNucleo();
sel.addEventListener('change', atualizarInfoNucleo);
if (!param && navigator.geolocation) {
navigator.geolocation.getCurrentPosition((pos) => {
let melhor = null;
nucleos.filter((n) => typeof n.latitude === 'number' && typeof n.longitude === 'number').forEach((n) => {
const d = Math.hypot((n.latitude - pos.coords.latitude) * 111320, (n.longitude - pos.coords.longitude) * 111320 * Math.cos(pos.coords.latitude * Math.PI / 180));
if (d <= 300 && (!melhor || d < melhor.d)) melhor = { n, d };
});
if (melhor && !stream && !registrado) { sel.value = melhor.n.id; atualizarInfoNucleo(); el('dicaNucleo').textContent = `Detectamos que você está em ${melhor.n.nome} (pelo GPS). Se não for isso, troque acima.`; }
}, () => {}, { enableHighAccuracy: true, timeout: 8000 });
}
carregarHistorico();
const palco = el('palco');
palco.addEventListener('click', iniciar);
palco.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') iniciar(); });
el('btnOutro').textContent = 'Sair da conta (outro aluno entra)';
el('btnOutro').addEventListener('click', async () => { desligarCamera(); await sair(); location.href = 'login.html'; });
});
window.addEventListener('beforeunload', desligarCamera);
