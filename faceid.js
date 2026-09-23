/* faceid.js — Check-in por reconhecimento facial (tablet do professor).

Como funciona, em uma frase: a câmera do painel compara o rosto de quem está
na frente do tablet com a FOTO DE PERFIL de cada aluno do núcleo e, quando
reconhece com segurança, grava a presença em presencas/{id} (origem 'faceid').

Decisões importantes:
- Tudo roda no navegador (face-api / TensorFlow.js carregados sob demanda do
  jsDelivr, só quando o professor aperta "Iniciar câmera"). Nenhum quadro da
  câmera sai do aparelho nem é gravado em lugar nenhum.
- O "cadastro do rosto" de cada aluno é o vetor de 128 números (descritor)
  calculado a partir da foto de perfil dele (usuarios/{uid}.fotoUrl). Ele fica
  salvo no próprio cadastro (faceDescriptor) pra não recalcular a cada aula, e
  é refeito sozinho se a foto mudar (faceDescriptorFotoHash).
- Só reconhece quem tem foto de perfil real e legível: aluno sem foto, ou cuja
  foto não tem um rosto detectável, aparece na lista de "sem rosto cadastrado"
  e pode ser marcado manualmente — nunca é "chutado".
- Registra uma presença por aluno por sessão de câmera, e nunca duas no mesmo
  dia pro mesmo núcleo (confere o histórico já carregado quando ele existe).
*/

const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.esm.js';
const MODELOS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
const LIMIAR_DISTANCIA = 0.5;        // menor = mais rigoroso (0.6 é o padrão da lib; 0.5 evita confundir irmãos/parecidos)
const QUADROS_PARA_CONFIRMAR = 3;    // quantos quadros seguidos reconhecendo a mesma pessoa antes de registrar
const INTERVALO_MS = 450;            // tempo entre análises (tablet aguenta bem)

let faceapi = null;
let modelosProntos = false;
let stream = null;
let timer = null;
let usandoTraseira = false;
let matcher = null;
let rotulos = {};                    // uid -> aluno
let contagemSeguida = { uid: null, n: 0 };
let registradosNaSessao = new Map(); // uid -> Date
let contexto = null;
let deps = null;
let ocupado = false;

function el(id) { return document.getElementById(id); }

function hashFoto(fotoUrl) {
// hash simples e estável só pra saber se a foto mudou desde o último cálculo
let h = 0; const s = String(fotoUrl || '');
for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
return `${s.length}:${h}`;
}

function status(texto, erro = false) {
const st = el('faceidStatus');
if (!st) return;
st.classList.toggle('erro', !!erro);
st.innerHTML = `<i class="fas ${erro ? 'fa-triangle-exclamation' : 'fa-face-smile'}"></i> ${texto}`;
}

async function carregarBiblioteca() {
if (faceapi && modelosProntos) return;
status('Carregando o reconhecimento facial (primeira vez demora um pouco)...');
faceapi = await import(FACEAPI_URL);
await Promise.all([
faceapi.nets.tinyFaceDetector.loadFromUri(MODELOS_URL),
faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELOS_URL),
faceapi.nets.faceRecognitionNet.loadFromUri(MODELOS_URL),
]);
modelosProntos = true;
}

function opcoesDetector() {
return new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
}

async function carregarImagem(src) {
return new Promise((resolve, reject) => {
const img = new Image();
if (!String(src).startsWith('data:')) img.crossOrigin = 'anonymous';
img.onload = () => resolve(img);
img.onerror = () => reject(new Error('foto ilegível'));
img.src = src;
});
}

// Calcula (ou reaproveita) o descritor de cada aluno com foto. Salva no
// cadastro quando puder (gestor do núcleo / instrutor do aluno / admin).
async function prepararRostos() {
const { alunos, salvarDescritor } = contexto;
const comRosto = [];
const semRosto = [];
for (const a of alunos) {
if (!a.fotoUrl || /placeholder/i.test(a.fotoUrl)) { semRosto.push({ aluno: a, motivo: 'sem foto de perfil' }); continue; }
const hash = hashFoto(a.fotoUrl);
if (Array.isArray(a.faceDescriptor) && a.faceDescriptor.length === 128 && a.faceDescriptorFotoHash === hash) {
comRosto.push({ aluno: a, descritor: new Float32Array(a.faceDescriptor) });
continue;
}
try {
status(`Lendo a foto de ${a.nome || 'aluno'}...`);
const img = await carregarImagem(a.fotoUrl);
const det = await faceapi.detectSingleFace(img, opcoesDetector()).withFaceLandmarks(true).withFaceDescriptor();
if (!det) { semRosto.push({ aluno: a, motivo: 'rosto não encontrado na foto' }); continue; }
comRosto.push({ aluno: a, descritor: det.descriptor });
try { await salvarDescritor(a, Array.from(det.descriptor), hash); a.faceDescriptor = Array.from(det.descriptor); a.faceDescriptorFotoHash = hash; } catch (e) { console.warn('Não deu pra salvar o descritor de', a.nome, e); }
} catch (e) {
semRosto.push({ aluno: a, motivo: 'foto não pôde ser lida' });
}
}
rotulos = {};
comRosto.forEach(({ aluno }) => { rotulos[aluno.id] = aluno; });
matcher = comRosto.length
? new faceapi.FaceMatcher(comRosto.map(({ aluno, descritor }) => new faceapi.LabeledFaceDescriptors(aluno.id, [descritor])), LIMIAR_DISTANCIA)
: null;

const enrol = el('faceidEnrol');
if (enrol) {
enrol.innerHTML = `<span class="kpi-valor mono">${comRosto.length}/${alunos.length}</span><span class="kpi-rotulo">alunos com rosto cadastrado</span>` +
(semRosto.length ? `<small>Sem rosto: ${semRosto.map((s) => `${deps.escapeHTML(s.aluno.nome || 'aluno')} (${s.motivo})`).join(', ')}. Atualize a foto de perfil deles em Avaliar/Editar.</small>` : '<small>Todos os alunos deste núcleo podem ser reconhecidos pela foto de perfil.</small>');
}
return comRosto.length;
}

function jaRegistradoHoje(uid) {
if (registradosNaSessao.has(uid)) return true;
const hoje = new Date().toDateString();
return (contexto.presencasHoje || []).some((p) => {
if (p.uid !== uid) return false;
const d = p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm);
return d.toDateString() === hoje;
});
}

function mostrarMatch(aluno, confianca, registrado) {
const box = el('faceidMatch');
if (!box) return;
box.classList.remove('oculto');
box.innerHTML = `
<img src="${deps.escapeHTML(aluno.fotoUrl)}" alt="">
<div class="faceid-match-info"><strong>${deps.escapeHTML(aluno.nome || 'Aluno')}</strong><small>${deps.escapeHTML(aluno.cordaoAtual || '')} · ${Math.round(confianca * 100)}% de semelhança</small></div>
<span class="pill ${registrado ? 'pill-aprovado' : 'pill-pendente'}">${registrado ? 'Presença registrada' : 'Reconhecendo...'}</span>`;
}

function esconderMatch() { const box = el('faceidMatch'); if (box) box.classList.add('oculto'); }

function adicionarNaLista(aluno, origem) {
const lista = el('faceidLista');
if (!lista) return;
if (lista.querySelector('.cascata-vazio')) lista.innerHTML = '';
const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
lista.insertAdjacentHTML('afterbegin', `
<div class="faceid-item">
<img src="${deps.escapeHTML(aluno.fotoUrl || 'https://via.placeholder.com/34')}" alt="">
<div><strong>${deps.escapeHTML(aluno.nome || 'Aluno')}</strong><small>${hora} · ${origem === 'faceid' ? 'reconhecido pela câmera' : 'marcado manualmente'}</small></div>
<span class="pill pill-aprovado"><i class="fas fa-check"></i></span>
</div>`);
}

async function registrarPresenca(aluno, origem) {
if (jaRegistradoHoje(aluno.id)) {
deps.toast(`${aluno.nome || 'Aluno'} já tem presença registrada hoje neste núcleo.`);
registradosNaSessao.set(aluno.id, new Date());
return false;
}
const nucleoId = contexto.nucleoIdPara(aluno);
if (!nucleoId) { deps.toast('Este aluno não está vinculado a um núcleo — não dá pra registrar presença.', 'error'); return false; }
const agora = new Date();
await deps.criar('presencas', {
uid: aluno.id,
nucleoId,
entradaEm: agora,
confirmadoAos30: true,           // o professor viu a pessoa na academia: presença confirmada na hora
confirmadoEm: agora,
origem,                          // 'faceid' | 'manual'
registradoPor: contexto.registradoPor,
registradoPorNome: contexto.registradoPorNome,
});
registradosNaSessao.set(aluno.id, agora);
adicionarNaLista(aluno, origem);
deps.toast(`Presença de ${aluno.nome || 'aluno'} registrada!`);
if (deps.aoRegistrar) deps.aoRegistrar();
return true;
}

async function analisarQuadro() {
if (ocupado || !stream || !faceapi) return;
const video = el('faceidVideo');
const canvas = el('faceidCanvas');
if (!video || video.readyState < 2 || !canvas) return;
ocupado = true;
try {
const dims = { width: video.videoWidth, height: video.videoHeight };
if (canvas.width !== dims.width || canvas.height !== dims.height) { canvas.width = dims.width; canvas.height = dims.height; }
const ctx = canvas.getContext('2d');
ctx.clearRect(0, 0, canvas.width, canvas.height);
const deteccoes = await faceapi.detectAllFaces(video, opcoesDetector()).withFaceLandmarks(true).withFaceDescriptors();
if (!deteccoes.length) {
status(matcher ? 'Procurando um rosto na frente da câmera...' : 'Nenhum aluno com rosto cadastrado neste núcleo — use a marcação manual.');
contagemSeguida = { uid: null, n: 0 };
esconderMatch();
return;
}
// Espelha o desenho quando a câmera frontal está espelhada no CSS.
const espelhar = !usandoTraseira;
let melhor = null;
for (const d of deteccoes) {
const box = d.detection.box;
const x = espelhar ? canvas.width - box.x - box.width : box.x;
ctx.strokeStyle = '#00E676'; ctx.lineWidth = 3;
ctx.beginPath();
if (typeof ctx.roundRect === 'function') ctx.roundRect(x, box.y, box.width, box.height, 14); else ctx.rect(x, box.y, box.width, box.height);
ctx.stroke();
if (!matcher) continue;
const m = matcher.findBestMatch(d.descriptor);
if (m.label !== 'unknown' && (!melhor || m.distance < melhor.distance)) melhor = { uid: m.label, distance: m.distance };
}
if (!melhor) {
status(`${deteccoes.length === 1 ? 'Rosto detectado' : deteccoes.length + ' rostos detectados'}, mas não bateu com nenhum aluno cadastrado.`);
contagemSeguida = { uid: null, n: 0 };
esconderMatch();
return;
}
const aluno = rotulos[melhor.uid];
const confianca = Math.max(0, Math.min(1, 1 - melhor.distance));
if (contagemSeguida.uid === melhor.uid) contagemSeguida.n += 1; else contagemSeguida = { uid: melhor.uid, n: 1 };
if (registradosNaSessao.has(melhor.uid)) {
status(`${aluno.nome || 'Aluno'} reconhecido — presença já registrada hoje.`);
mostrarMatch(aluno, confianca, true);
return;
}
if (contagemSeguida.n < QUADROS_PARA_CONFIRMAR) {
status(`Reconhecendo ${aluno.nome || 'aluno'}... (${contagemSeguida.n}/${QUADROS_PARA_CONFIRMAR})`);
mostrarMatch(aluno, confianca, false);
return;
}
status(`Registrando presença de ${aluno.nome || 'aluno'}...`);
try {
await registrarPresenca(aluno, 'faceid');
mostrarMatch(aluno, confianca, true);
} catch (e) {
console.error(e);
status('Não foi possível gravar a presença (confira as regras do Firestore publicadas).', true);
}
} catch (e) {
console.error(e);
status('Erro ao analisar a imagem da câmera.', true);
} finally {
ocupado = false;
}
}

async function iniciarCamera() {
const video = el('faceidVideo');
const palco = el('faceidPalco');
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { status('Este navegador não dá acesso à câmera.', true); return; }
try {
if (stream) stream.getTracks().forEach((t) => t.stop());
stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: usandoTraseira ? { ideal: 'environment' } : 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
video.srcObject = stream;
await video.play();
palco.classList.toggle('faceid-traseira', usandoTraseira);
} catch (e) {
console.error(e);
status('Permissão de câmera negada ou câmera indisponível.', true);
throw e;
}
}

export async function iniciarFaceId() {
if (!contexto || !deps) return;
const btnIniciar = el('btnFaceidIniciar'); const btnParar = el('btnFaceidParar'); const btnVirar = el('btnFaceidVirar');
btnIniciar.disabled = true;
try {
const ctx = await deps.obterContexto();
if (!ctx || !ctx.alunos) { status('Selecione um núcleo pra usar o Face ID.', true); return; }
contexto = ctx;
await carregarBiblioteca();
const qtd = await prepararRostos();
await iniciarCamera();
btnIniciar.classList.add('oculto'); btnParar.classList.remove('oculto'); btnVirar.classList.remove('oculto');
status(qtd ? 'Câmera ligada. Aponte para o aluno.' : 'Câmera ligada, mas nenhum aluno tem rosto cadastrado — use a marcação manual.');
clearInterval(timer);
timer = setInterval(analisarQuadro, INTERVALO_MS);
} catch (e) {
console.error(e);
if (!el('faceidStatus').classList.contains('erro')) status('Não foi possível iniciar o reconhecimento facial agora.', true);
} finally {
btnIniciar.disabled = false;
}
}

export function pararFaceId() {
clearInterval(timer); timer = null;
if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
const video = el('faceidVideo'); if (video) video.srcObject = null;
const canvas = el('faceidCanvas'); if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
esconderMatch();
contagemSeguida = { uid: null, n: 0 };
const btnIniciar = el('btnFaceidIniciar'); const btnParar = el('btnFaceidParar'); const btnVirar = el('btnFaceidVirar');
if (btnIniciar) btnIniciar.classList.remove('oculto');
if (btnParar) btnParar.classList.add('oculto');
if (btnVirar) btnVirar.classList.add('oculto');
status('Câmera desligada');
}

// Preenche o select de marcação manual e reseta a sessão quando o núcleo alvo muda.
export async function atualizarContextoFaceId() {
if (!deps) return;
const ctx = await deps.obterContexto();
if (stream) {
// Câmera ligada: só atualiza os dados (alunos/presenças de hoje) sem
// zerar a sessão de reconhecimentos em andamento.
contexto = ctx || contexto;
return;
}
contexto = ctx || { alunos: [] };
registradosNaSessao = new Map();
const sel = el('faceidManualAluno');
if (sel) {
sel.innerHTML = '<option value="">Selecione o aluno...</option>' +
(contexto.alunos || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '')).map((a) => `<option value="${deps.escapeHTML(a.id)}">${deps.escapeHTML(a.nome || 'Aluno')}</option>`).join('');
}
const sub = el('faceidSubtitulo');
if (sub) sub.textContent = contexto.nucleoNome
? `Núcleo: ${contexto.nucleoNome}. Aponte a câmera do tablet para o aluno: o app reconhece pela foto de perfil e marca a presença sozinho.`
: (contexto.alunos && contexto.alunos.length ? 'Seus alunos: aponte a câmera para o aluno e a presença é marcada no núcleo onde ele treina.' : 'Selecione um núcleo (ou vincule-se a um) para usar o Face ID.');
const enrol = el('faceidEnrol');
if (enrol && !stream) {
const comDescritor = (contexto.alunos || []).filter((a) => Array.isArray(a.faceDescriptor) && a.faceDescriptor.length === 128).length;
enrol.innerHTML = `<span class="kpi-valor mono">${(contexto.alunos || []).length ? `${comDescritor}/${contexto.alunos.length}` : '—'}</span><span class="kpi-rotulo">alunos com rosto cadastrado</span><small>Os demais são lidos da foto de perfil na hora que a câmera liga.</small>`;
}
const lista = el('faceidLista');
if (lista) lista.innerHTML = '<p class="cascata-vazio">Ninguém reconhecido ainda.</p>';
}

// Liga os botões. `dependencias`: { obterContexto, criar, toast, escapeHTML, aoRegistrar }
export function configurarFaceId(dependencias) {
deps = dependencias;
contexto = { alunos: [] };
const btnIniciar = el('btnFaceidIniciar'); const btnParar = el('btnFaceidParar'); const btnVirar = el('btnFaceidVirar'); const btnManual = el('btnFaceidManual');
if (!btnIniciar) return;
btnIniciar.addEventListener('click', iniciarFaceId);
btnParar.addEventListener('click', pararFaceId);
btnVirar.addEventListener('click', async () => { usandoTraseira = !usandoTraseira; try { await iniciarCamera(); } catch (e) { /* status já avisou */ } });
btnManual.addEventListener('click', async () => {
const sel = el('faceidManualAluno');
const aluno = (contexto.alunos || []).find((a) => a.id === sel.value);
if (!aluno) { deps.toast('Selecione um aluno.', 'error'); return; }
btnManual.disabled = true;
try { await registrarPresenca(aluno, 'manual'); sel.value = ''; }
catch (e) { console.error(e); deps.toast('Não foi possível registrar a presença.', 'error'); }
finally { btnManual.disabled = false; }
});
window.addEventListener('beforeunload', pararFaceId);
}
