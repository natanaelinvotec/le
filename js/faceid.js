/* faceid.js — Check-in por reconhecimento facial (tablet do professor).

Como funciona, em uma frase: a câmera do painel compara o rosto de quem está
na frente do tablet com a FOTO DE PERFIL de cada aluno do núcleo e, quando
reconhece com segurança, grava a presença em presencas/{id} (origem 'faceid').

Decisões importantes:
- Tudo roda no navegador (face-api / TensorFlow.js carregados sob demanda do
  jsDelivr, só quando o professor aperta "Iniciar câmera"). Nenhum quadro da
  câmera sai do aparelho nem é gravado em lugar nenhum.
- Atenção e inclusão: quando o aluno tem alguma condição marcada (usuarios.inclusao),
  a chamada mostra um aviso ao professor com os laços, a ficha de adaptação e as
  orientações — na hora em que o aluno chega, que é quando a informação serve.
- O "cadastro do rosto" de cada aluno é o vetor de 128 números (descritor)
  calculado a partir da foto de perfil dele (usuarios/{uid}.fotoUrl). Ele fica
  salvo no próprio cadastro (faceDescriptor) pra não recalcular a cada aula, e
  é refeito sozinho se a foto mudar (faceDescriptorFotoHash).
- Só reconhece quem tem foto de perfil real e legível: aluno sem foto, ou cuja
  foto não tem um rosto detectável, aparece na lista de "sem rosto cadastrado"
  e pode ser marcado manualmente — nunca é "chutado".
- Registra uma presença por aluno por sessão de câmera, e nunca duas no mesmo
  dia pro mesmo núcleo (confere o histórico já carregado quando ele existe).

Chamada pela FOTO DA TURMA (fim do treino), na mesma aba Presenças:
- O professor envia (ou tira) a foto de formação da turma. A foto é lida só no
  navegador — não é enviada nem gravada; só as presenças confirmadas vão ao banco.
- Detecta todos os rostos (SSD MobileNet, melhor em foto de grupo; se não
  carregar, o detector leve), compara com os descritores dos alunos do núcleo e
  faz a atribuição 1-para-1 (o mesmo aluno nunca é marcado em dois rostos).
- Mostra a lista para o professor CONFERIR: miniatura do rosto recortado da foto
  ao lado da foto de cadastro, nome e semelhança. Seguros vêm marcados; parecidos
  vêm desmarcados com "confira"; rosto não reconhecido ganha um seletor para
  escolher o aluno. Alunos que não aparecem na foto podem ser marcados também.
- Só ao tocar em "Confirmar presenças" grava presencas/{id} com origem
  'faceid-foto' (as regras aceitam até 7 dias para trás, para a foto do treino de ontem).
*/

import { CONDICOES, lacosHTML, apoiosHTML, normalizarInclusao, temInclusao, garantirEstilos as estilosInclusao } from './inclusao.js?v=20261006';
estilosInclusao();

const FACEAPI_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/dist/face-api.esm.js';
const MODELOS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model/';
const LIMIAR_DISTANCIA = 0.5;        // menor = mais rigoroso (0.6 é o padrão da lib; 0.5 evita confundir irmãos/parecidos)
const QUADROS_PARA_CONFIRMAR = 4;    // quadros seguidos reconhecendo a MESMA pessoa antes de registrar — o reconhecimento é a confirmação (não existe mais "confirmar aos 30 min")
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
let rostos = [];                     // [{ aluno, descritor }] — mesmos dados do matcher, para a foto da turma
let alvoStatus = 'faceidStatus';     // a foto da turma escreve no próprio status

function el(id) { return document.getElementById(id); }

function hashFoto(fotoUrl) {
// hash simples e estável só pra saber se a foto mudou desde o último cálculo
let h = 0; const s = String(fotoUrl || '');
for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
return `${s.length}:${h}`;
}

function status(texto, erro = false) {
const st = el(alvoStatus);
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
// Foto da carteirinha (de documento, aprovada) reconhece melhor que a de perfil da Rede.
const foto = (a.carteirinha && a.carteirinha.fotoUrl) || a.fotoUrl;
if (!foto || /placeholder/i.test(foto)) { semRosto.push({ aluno: a, motivo: 'sem foto de perfil nem de carteirinha' }); continue; }
const hash = hashFoto(foto);
if (Array.isArray(a.faceDescriptor) && a.faceDescriptor.length === 128 && a.faceDescriptorFotoHash === hash) {
comRosto.push({ aluno: a, descritor: new Float32Array(a.faceDescriptor) });
continue;
}
try {
status(`Lendo a foto de ${a.nome || 'aluno'}...`);
const img = await carregarImagem(foto);
const det = await faceapi.detectSingleFace(img, opcoesDetector()).withFaceLandmarks(true).withFaceDescriptor();
if (!det) { semRosto.push({ aluno: a, motivo: 'rosto não encontrado na foto' }); continue; }
comRosto.push({ aluno: a, descritor: det.descriptor });
try { await salvarDescritor(a, Array.from(det.descriptor), hash); a.faceDescriptor = Array.from(det.descriptor); a.faceDescriptorFotoHash = hash; } catch (e) { console.warn('Não deu pra salvar o descritor de', a.nome, e); }
} catch (e) {
semRosto.push({ aluno: a, motivo: 'foto não pôde ser lida' });
}
}
rotulos = {};
rostos = comRosto;
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

// Já tem presença neste dia (padrão: hoje)? Confere a sessão da câmera e o
// histórico recente do núcleo já carregado (contexto.presencasHoje, ~200 últimas).
function jaRegistradoHoje(uid, dia = new Date()) {
const alvo = dia.toDateString();
const daSessao = registradosNaSessao.get(uid);
if (daSessao && daSessao.toDateString() === alvo) return true;
return (contexto.presencasHoje || []).some((p) => {
if (p.uid !== uid) return false;
const d = p.entradaEm && p.entradaEm.toDate ? p.entradaEm.toDate() : new Date(p.entradaEm);
return d.toDateString() === alvo;
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
<span class="foto-com-lacos"><img src="${deps.escapeHTML(aluno.fotoUrl || 'https://via.placeholder.com/34')}" alt="">${lacosHTML(aluno.inclusao, { px: 16 })}</span>
<div><strong>${deps.escapeHTML(aluno.nome || 'Aluno')}</strong><small>${hora} · ${origem === 'faceid' ? 'reconhecido pela câmera' : origem === 'faceid-foto' ? 'foto da turma, conferido' : 'marcado manualmente'}</small></div>
<span class="pill pill-aprovado"><i class="fas fa-check"></i></span>
</div>`);
}

// Aviso de atenção e inclusão: aparece no momento da chamada, com os laços, a ficha
// de adaptação (apoios marcados) e as orientações da família. Some sozinho em 45 s,
// ou quando o professor fecha. No máximo 3 avisos ao mesmo tempo (os mais novos em cima).
function avisarInclusao(aluno) {
const caixa = el('faceidAvisos');
if (!caixa || !temInclusao(aluno)) return;
const incl = normalizarInclusao(aluno.inclusao);
const dicas = incl.condicoes.map((id) => CONDICOES.find((c) => c.id === id)).filter(Boolean);
const aviso = document.createElement('div');
aviso.className = 'aviso-inclusao';
aviso.setAttribute('role', 'status');
aviso.innerHTML = `
${lacosHTML(aluno.inclusao, { px: 30, classe: 'lacos-linha', comSigla: true })}
<div style="flex:1;min-width:0">
<h4>${deps.escapeHTML((aluno.nome || 'Aluno').split(' ')[0])} chegou — ${deps.escapeHTML(dicas.map((c) => c.nome).join(' · '))}</h4>
${incl.observacoes ? `<p><i class="fas fa-comment" aria-hidden="true"></i> ${deps.escapeHTML(incl.observacoes)}</p>` : ''}
${apoiosHTML(incl) || `<p>${dicas.map((c) => deps.escapeHTML(c.dica)).join(' ')}</p>`}
</div>
<button type="button" class="fechar" aria-label="Fechar aviso">×</button>`;
aviso.querySelector('.fechar').addEventListener('click', () => aviso.remove());
caixa.prepend(aviso);
while (caixa.children.length > 3) caixa.lastElementChild.remove();
setTimeout(() => { if (aviso.isConnected) { aviso.style.transition = 'opacity .6s'; aviso.style.opacity = '0'; setTimeout(() => aviso.remove(), 650); } }, 45000);
}

// opts: { em: Date da presença (padrão agora), silencioso: sem toast/aviso por aluno (foto da turma) }
async function registrarPresenca(aluno, origem, opts = {}) {
const em = opts.em instanceof Date ? opts.em : new Date();
if (opts.silencioso && jaRegistradoHoje(aluno.id, em)) return false;
if (jaRegistradoHoje(aluno.id)) {
deps.toast(`${aluno.nome || 'Aluno'} já tem presença registrada hoje neste núcleo.`);
if (!registradosNaSessao.has(aluno.id)) avisarInclusao(aluno); // presença veio de outro aparelho: ainda assim avisa o professor
registradosNaSessao.set(aluno.id, new Date());
return false;
}
const nucleoId = contexto.nucleoIdPara(aluno);
if (!nucleoId) { deps.toast('Este aluno não está vinculado a um núcleo — não dá pra registrar presença.', 'error'); return false; }
const agora = new Date();
await deps.criar('presencas', {
uid: aluno.id,
alunoNome: aluno.nome || '',
nucleoId,
entradaEm: em,
confirmadoAos30: true,           // presença 100% confirmada no ato: o reconhecimento facial É a confirmação
confirmadoEm: agora,
origem,                          // 'faceid' | 'manual' | 'faceid-foto' (foto da turma conferida pelo professor)
registradoPor: contexto.registradoPor,
registradoPorNome: contexto.registradoPorNome,
});
registradosNaSessao.set(aluno.id, em);
(contexto.presencasHoje = contexto.presencasHoje || []).push({ uid: aluno.id, entradaEm: em });
adicionarNaLista(aluno, origem);
if (opts.silencioso) return true;
avisarInclusao(aluno);
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
// Núcleo mudou: a foto analisada era de outra turma.
rostos = []; matcher = null;
if (el('fotoTurmaCard')) limparFotoTurma();
const subFoto = el('fotoTurmaSub');
if (subFoto) subFoto.textContent = contexto.nucleoNome ? `Núcleo: ${contexto.nucleoNome}. Envie a foto de formação do fim do treino: o app acha cada rosto, você confere e confirma.` : 'Selecione um núcleo para usar a chamada pela foto.';
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
configurarFotoTurma();
}

/* ======================================================================
   CHAMADA PELA FOTO DA TURMA (fim do treino)
   ====================================================================== */
const FOTO_MAX_LADO = 1600;          // a foto é reduzida antes de analisar (rápido e suficiente para rostos de ~40 px)
const FOTO_LIMIAR_SEGURO = 0.5;      // até aqui: vem marcado
const FOTO_LIMIAR_CONFERIR = 0.58;   // entre os dois: aparece desmarcado com "confira"
const FOTO_DIAS_ATRAS = 7;           // as regras aceitam até 8 dias; a tela oferece 7
let ssdPronto = null;                // null = não tentou; true/false = carregou ou não
let foto = null;                     // { canvas, faces: [{ box, thumb, uid, dist, escolha }], ausentes: Set }

function hojeISO(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function diaEscolhido() {
const v = (el('fotoTurmaDia') || {}).value || hojeISO();
const hoje = hojeISO();
if (v === hoje) return new Date();                 // treino de hoje: hora real do registro
const [a, m, d] = v.split('-').map(Number);
return new Date(a, m - 1, d, 19, 0, 0);            // dia anterior: fixa 19h (horário típico de treino)
}

async function carregarDetectorDeGrupo() {
if (ssdPronto !== null) return ssdPronto;
try { await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELOS_URL); ssdPronto = true; }
catch (e) { console.warn('SSD indisponível, usando o detector leve', e); ssdPronto = false; }
return ssdPronto;
}
function opcoesGrupo() {
return ssdPronto ? new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 80 })
: new faceapi.TinyFaceDetectorOptions({ inputSize: 800, scoreThreshold: 0.35 });
}

// Lê o arquivo, respeita a orientação da câmera (EXIF) e reduz para FOTO_MAX_LADO.
async function arquivoParaCanvas(arquivo) {
let fonte;
try { fonte = await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); }
catch (e) { const u = URL.createObjectURL(arquivo); try { fonte = await carregarImagem(u); } finally { setTimeout(() => URL.revokeObjectURL(u), 5000); } }
const w0 = fonte.width; const h0 = fonte.height;
const k = Math.min(1, FOTO_MAX_LADO / Math.max(w0, h0));
const c = document.createElement('canvas');
c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
c.getContext('2d').drawImage(fonte, 0, 0, c.width, c.height);
if (fonte.close) fonte.close();
return c;
}

// Recorte quadrado do rosto (com folga) para a miniatura de conferência.
function recorte(canvas, box, lado = 112) {
const folga = Math.max(box.width, box.height) * 0.35;
const tam = Math.max(box.width, box.height) + folga * 2;
const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
const t = document.createElement('canvas'); t.width = lado; t.height = lado;
t.getContext('2d').drawImage(canvas, cx - tam / 2, cy - tam / 2, tam, tam, 0, 0, lado, lado);
return t.toDataURL('image/jpeg', 0.82);
}

// Atribuição 1-para-1: todos os pares (rosto, aluno) abaixo do limiar, do mais parecido
// para o menos; cada rosto e cada aluno entram uma vez só.
function atribuir(descritores) {
const pares = [];
descritores.forEach((d, i) => rostos.forEach(({ aluno, descritor }) => {
const dist = faceapi.euclideanDistance(d, descritor);
if (dist < FOTO_LIMIAR_CONFERIR) pares.push({ i, uid: aluno.id, dist });
}));
pares.sort((a, b) => a.dist - b.dist);
const usadosRosto = new Set(); const usadosAluno = new Set(); const res = {};
for (const p of pares) {
if (usadosRosto.has(p.i) || usadosAluno.has(p.uid)) continue;
usadosRosto.add(p.i); usadosAluno.add(p.uid); res[p.i] = p;
}
return res;
}

function statusFoto(texto, erro = false) { alvoStatus = 'fotoTurmaStatus'; status(texto, erro); alvoStatus = 'faceidStatus'; }

async function analisarFotoTurma(arquivo) {
if (!arquivo || !deps) return;
if (!/^image\//.test(arquivo.type || 'image/')) { statusFoto('Escolha um arquivo de imagem (JPG ou PNG).', true); return; }
const card = el('fotoTurmaCard');
card.classList.add('ft-ocupado');
el('fotoTurmaConfirmar').disabled = true;
try {
const ctx = await deps.obterContexto();
if (!ctx || !ctx.alunos || !ctx.alunos.length) { statusFoto('Selecione um núcleo com alunos antes de enviar a foto.', true); return; }
contexto = ctx;
statusFoto('Abrindo a foto...');
const canvas = await arquivoParaCanvas(arquivo);
alvoStatus = 'fotoTurmaStatus';
try {
await carregarBiblioteca();
await carregarDetectorDeGrupo();
await prepararRostos(); // descritores já salvos no cadastro: só lê fotos novas ou trocadas
} finally { alvoStatus = 'faceidStatus'; }
statusFoto('Procurando os rostos na foto...');
const det = await faceapi.detectAllFaces(canvas, opcoesGrupo()).withFaceLandmarks(true).withFaceDescriptors();
if (!det.length) { foto = null; desenharFoto(canvas, []); renderListaFoto(); statusFoto('Nenhum rosto encontrado. Tente uma foto mais próxima, de frente e com boa luz.', true); return; }
const ordem = det.map((d, i) => ({ d, i })).sort((a, b) => (Math.abs(a.d.detection.box.y - b.d.detection.box.y) > a.d.detection.box.height * 0.6 ? a.d.detection.box.y - b.d.detection.box.y : a.d.detection.box.x - b.d.detection.box.x));
const dets = ordem.map((o) => o.d); // de cima para baixo, da esquerda para a direita (como se lê a foto)
const atrib = atribuir(dets.map((d) => d.descriptor));
const dia = diaEscolhido();
foto = {
canvas,
faces: dets.map((d, i) => {
const a = atrib[i];
const ja = a ? jaRegistradoHoje(a.uid, dia) : false;
return { box: d.detection.box, thumb: recorte(canvas, d.detection.box), uid: a ? a.uid : '', dist: a ? a.dist : null, escolha: a && a.dist < FOTO_LIMIAR_SEGURO && !ja };
}),
extras: new Set(),
};
desenharFoto(canvas, foto.faces);
renderListaFoto();
const rec = foto.faces.filter((f) => f.uid).length;
statusFoto(`${det.length} rosto${det.length > 1 ? 's' : ''} na foto · ${rec} reconhecido${rec === 1 ? '' : 's'}. Confira a lista e confirme.`);
} catch (e) {
console.error(e);
statusFoto('Não foi possível analisar a foto agora. Tente de novo ou use a marcação manual.', true);
} finally {
card.classList.remove('ft-ocupado');
}
}

// Foto com as caixas numeradas (verde = reconhecido, âmbar = confira, branco = sem nome).
function desenharFoto(canvas, faces, destaque = -1) {
const palco = el('fotoTurmaPalco');
if (!palco) return;
let tela = palco.querySelector('canvas');
if (!tela) { palco.innerHTML = ''; tela = document.createElement('canvas'); palco.appendChild(tela); }
tela.width = canvas.width; tela.height = canvas.height;
const g = tela.getContext('2d');
g.drawImage(canvas, 0, 0);
const esp = Math.max(2, Math.round(canvas.width / 400));
faces.forEach((f, i) => {
const { x, y, width: w, height: h } = f.box;
const cor = !f.uid ? '#FFFFFF' : (f.dist < FOTO_LIMIAR_SEGURO ? '#00E676' : '#FFB300');
g.lineWidth = i === destaque ? esp * 2.2 : esp; g.strokeStyle = cor;
if (i === destaque) { g.fillStyle = 'rgba(0,230,118,.18)'; g.fillRect(x, y, w, h); }
g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, Math.min(w, h) * 0.18); else g.rect(x, y, w, h); g.stroke();
const r = Math.max(11, Math.round(w * 0.2));
g.fillStyle = cor; g.beginPath(); g.arc(x + w / 2, y - r * 0.4, r, 0, Math.PI * 2); g.fill();
g.fillStyle = '#002D72'; g.font = `800 ${Math.round(r * 1.15)}px Manrope, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
g.fillText(String(i + 1), x + w / 2, y - r * 0.4 + 1);
});
palco.classList.add('com-foto');
}

function nomeDeUid(uid) { const a = (contexto.alunos || []).find((x) => x.id === uid); return a ? a.nome || 'Aluno' : ''; }

function renderListaFoto() {
const lista = el('fotoTurmaLista'); const aus = el('fotoTurmaAusentes'); const btn = el('fotoTurmaConfirmar');
if (!lista) return;
if (!foto) { lista.innerHTML = '<p class="cascata-vazio">Envie a foto da turma para ver a lista.</p>'; if (aus) aus.innerHTML = ''; btn.disabled = true; btn.querySelector('span').textContent = 'Confirmar presenças'; return; }
const dia = diaEscolhido();
const esc = deps.escapeHTML;
const usados = new Set(foto.faces.map((f) => f.uid).filter(Boolean));
const alunosOrd = (contexto.alunos || []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
lista.innerHTML = foto.faces.map((f, i) => {
const a = f.uid ? (contexto.alunos || []).find((x) => x.id === f.uid) : null;
const ja = a ? jaRegistradoHoje(a.id, dia) : false;
const conf = f.dist == null ? 0 : Math.max(0, Math.round((1 - f.dist) * 100));
const nivel = !a ? 'novo' : (f.dist < FOTO_LIMIAR_SEGURO ? 'ok' : 'confira');
const fotoCad = a ? ((a.carteirinha && a.carteirinha.fotoUrl) || a.fotoUrl || '') : '';
return `<div class="ft-linha ft-${nivel}${ja ? ' ft-ja' : ''}" data-i="${i}">
<label class="ft-check" title="${ja ? 'Já tem presença neste dia' : 'Marcar presença'}"><input type="checkbox" data-ft-i="${i}" ${f.escolha ? 'checked' : ''} ${!a || ja ? 'disabled' : ''} aria-label="Marcar presença do rosto ${i + 1}"></label>
<span class="ft-num">${i + 1}</span>
<img class="ft-rosto" src="${f.thumb}" alt="Rosto ${i + 1} recortado da foto">
<i class="fas fa-arrow-right-long ft-seta" aria-hidden="true"></i>
${a ? `<span class="foto-com-lacos"><img class="ft-cad" src="${esc(fotoCad || 'assets/logo-liberdade.png')}" alt="Foto de cadastro de ${esc(a.nome || 'aluno')}">${lacosHTML(a.inclusao, { px: 16 })}</span>` : '<span class="ft-cad ft-cad-vazio"><i class="fas fa-question"></i></span>'}
<div class="ft-info">
${a ? `<strong>${esc(a.nome || 'Aluno')}</strong><small>${esc(a.cordaoAtual || 'Iniciante')} · ${f.manual ? 'escolhido por você' : `${conf}% de semelhança`}</small>` : '<strong>Não reconhecido</strong><small>Escolha quem é, ou deixe em branco</small>'}
<select class="ft-trocar input-padrao" data-ft-sel="${i}" aria-label="Quem é o rosto ${i + 1}?"><option value="">${a ? 'Trocar pessoa…' : 'Quem é?'}</option>${alunosOrd.filter((x) => x.id === f.uid || !usados.has(x.id)).map((x) => `<option value="${esc(x.id)}" ${x.id === f.uid ? 'selected' : ''}>${esc(x.nome || 'Aluno')}</option>`).join('')}<option value="__nenhum">Não é aluno do núcleo</option></select>
</div>
<span class="pill ${ja ? 'pill-aprovado' : nivel === 'ok' ? 'pill-aprovado' : nivel === 'confira' ? 'pill-pendente' : 'pill-neutro'}">${ja ? 'Já presente' : f.manual ? 'Conferido' : nivel === 'ok' ? 'Reconhecido' : nivel === 'confira' ? 'Confira' : 'Sem nome'}</span>
</div>`;
}).join('');
// Quem não apareceu na foto (saiu antes, estava atrás de alguém): dá para marcar também.
const fora = alunosOrd.filter((a) => !usados.has(a.id));
if (aus) {
aus.innerHTML = fora.length ? `<details${foto.extras.size ? ' open' : ''}><summary>Não aparecem na foto (${fora.length}) — marcar quem treinou e saiu antes</summary><div class="ft-ausentes">${fora.map((a) => { const ja = jaRegistradoHoje(a.id, dia); return `<label class="ft-aus${ja ? ' ft-ja' : ''}"><input type="checkbox" data-ft-extra="${esc(a.id)}" ${foto.extras.has(a.id) ? 'checked' : ''} ${ja ? 'disabled' : ''}><img src="${esc((a.carteirinha && a.carteirinha.fotoUrl) || a.fotoUrl || 'assets/logo-liberdade.png')}" alt=""><span>${esc(a.nome || 'Aluno')}${ja ? ' <em>já presente</em>' : ''}</span></label>`; }).join('')}</div></details>` : '';
}
atualizarBotaoFoto();
}

function selecionadosFoto() {
if (!foto) return [];
const dia = diaEscolhido();
const ids = foto.faces.filter((f) => f.uid && f.escolha).map((f) => f.uid).concat([...foto.extras]);
return [...new Set(ids)].filter((uid) => !jaRegistradoHoje(uid, dia)).map((uid) => (contexto.alunos || []).find((a) => a.id === uid)).filter(Boolean);
}
function atualizarBotaoFoto() {
const btn = el('fotoTurmaConfirmar'); if (!btn) return;
const n = selecionadosFoto().length;
btn.disabled = n === 0;
btn.querySelector('span').textContent = n ? `Confirmar ${n} presença${n > 1 ? 's' : ''}` : 'Confirmar presenças';
}

async function confirmarFotoTurma() {
const alvos = selecionadosFoto();
if (!alvos.length) return;
const dia = diaEscolhido();
const btn = el('fotoTurmaConfirmar'); btn.disabled = true;
let ok = 0; const falhas = [];
for (const a of alvos) {
try { if (await registrarPresenca(a, 'faceid-foto', { em: dia, silencioso: true })) ok += 1; }
catch (e) { console.error(e); falhas.push(a.nome || 'aluno'); }
}
if (deps.aoRegistrar) deps.aoRegistrar();
foto.faces.forEach((f) => { f.escolha = false; }); foto.extras.clear();
renderListaFoto();
const quando = hojeISO(dia) === hojeISO() ? 'hoje' : dia.toLocaleDateString('pt-BR');
statusFoto(falhas.length ? `${ok} presença(s) gravada(s) para ${quando}; falhou: ${falhas.join(', ')}.` : `${ok} presença${ok === 1 ? '' : 's'} gravada${ok === 1 ? '' : 's'} para ${quando}. A foto não foi guardada.`, !!falhas.length);
deps.toast(falhas.length ? `${ok} gravada(s), ${falhas.length} com erro.` : `${ok} presença${ok === 1 ? '' : 's'} confirmada${ok === 1 ? '' : 's'} pela foto da turma!`, falhas.length ? 'error' : 'success');
}

function limparFotoTurma() {
foto = null;
const palco = el('fotoTurmaPalco');
if (palco) { palco.classList.remove('com-foto'); palco.innerHTML = '<div class="ft-vazio"><i class="fas fa-people-group"></i><span>A foto aparece aqui com cada rosto numerado.</span></div>'; }
renderListaFoto();
}

function configurarFotoTurma() {
const card = el('fotoTurmaCard');
if (!card) return;
const dia = el('fotoTurmaDia');
if (dia) {
const hoje = new Date(); const min = new Date(); min.setDate(hoje.getDate() - FOTO_DIAS_ATRAS);
dia.value = hojeISO(hoje); dia.max = hojeISO(hoje); dia.min = hojeISO(min);
dia.addEventListener('change', () => {
if (!dia.value || dia.value > dia.max || dia.value < dia.min) dia.value = hojeISO();
if (foto) { const d = diaEscolhido(); foto.faces.forEach((f) => { if (f.uid && jaRegistradoHoje(f.uid, d)) f.escolha = false; }); renderListaFoto(); }
});
}
['fotoTurmaArquivo', 'fotoTurmaCamera'].forEach((id) => {
const inp = el(id); if (!inp) return;
inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) analisarFotoTurma(f); });
});
// Arrastar a foto para o palco (computador).
const palco = el('fotoTurmaPalco');
if (palco) {
palco.addEventListener('dragover', (e) => { e.preventDefault(); palco.classList.add('arrastando'); });
palco.addEventListener('dragleave', () => palco.classList.remove('arrastando'));
palco.addEventListener('drop', (e) => { e.preventDefault(); palco.classList.remove('arrastando'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) analisarFotoTurma(f); });
}
const lista = el('fotoTurmaLista');
lista.addEventListener('change', (e) => {
const cb = e.target.closest('[data-ft-i]'); const sel = e.target.closest('[data-ft-sel]');
if (!foto) return;
if (cb) { foto.faces[Number(cb.dataset.ftI)].escolha = cb.checked; atualizarBotaoFoto(); }
if (sel) {
const f = foto.faces[Number(sel.dataset.ftSel)];
if (sel.value === '__nenhum') { f.uid = ''; f.dist = null; f.escolha = false; f.manual = false; }
else if (sel.value) {
f.uid = sel.value; f.escolha = !jaRegistradoHoje(sel.value, diaEscolhido());
f.dist = 0; f.manual = true; // escolhido pelo professor: conta como conferido
foto.extras.delete(sel.value);
}
desenharFoto(foto.canvas, foto.faces);
renderListaFoto();
}
});
// Passar o mouse/focar numa linha acende o rosto na foto.
const acender = (e) => { const l = e.target.closest('.ft-linha'); if (foto && l) desenharFoto(foto.canvas, foto.faces, Number(l.dataset.i)); };
lista.addEventListener('mouseover', acender); lista.addEventListener('focusin', acender);
lista.addEventListener('mouseleave', () => { if (foto) desenharFoto(foto.canvas, foto.faces); });
const aus = el('fotoTurmaAusentes');
if (aus) aus.addEventListener('change', (e) => { const cb = e.target.closest('[data-ft-extra]'); if (!cb || !foto) return; if (cb.checked) foto.extras.add(cb.dataset.ftExtra); else foto.extras.delete(cb.dataset.ftExtra); atualizarBotaoFoto(); });
el('fotoTurmaConfirmar').addEventListener('click', confirmarFotoTurma);
const limpar = el('fotoTurmaLimpar'); if (limpar) limpar.addEventListener('click', limparFotoTurma);
limparFotoTurma();
}
