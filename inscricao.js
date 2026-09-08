/* inscricao.js — v2
   Melhorias:
   - Sanitização de todos os campos de texto antes de gravar no Firestore.
   - Senha nunca é gravada em texto puro (hash SHA-256, ver shared.js).
   - Câmera: paramos as tracks corretamente ao trocar de câmera/sair da página (evita vazamento de recurso).
   - Tratamento de erro mais claro no upload da foto.
*/
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { hashPassword, sanitizeInput } from "./shared.js";

const firebaseConfig = {
  apiKey: "AIzaSyBkwCDziiV-Uh7MLzsy9OYJmA_LMnn7jbg",
  authDomain: "capoeira-liberdade.firebaseapp.com",
  projectId: "capoeira-liberdade",
  storageBucket: "capoeira-liberdade.firebasestorage.app",
  messagingSenderId: "492022804215",
  appId: "1:492022804215:web:c61aed556d9f1aa9576df2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const steps = document.querySelectorAll('.form-step');
const indicators = document.querySelectorAll('.step-indicator');
const btnNext = document.getElementById('btnNext');
const btnPrev = document.getElementById('btnPrev');
const btnSubmit = document.getElementById('btnSubmit');
let currentStep = 0;

function updateFormSteps() {
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === currentStep);
        indicators[index].classList.toggle('active', index <= currentStep);
    });

    btnPrev.style.display = currentStep > 0 ? 'inline-block' : 'none';

    if (currentStep === steps.length - 1) {
        btnNext.style.display = 'none';
        btnSubmit.style.display = 'inline-block';
    } else {
        btnNext.style.display = 'inline-block';
        btnSubmit.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

btnNext.addEventListener('click', () => {
    const currentInputs = steps[currentStep].querySelectorAll('input[required], select[required]');
    let allValid = true;
    let primeiroInvalido = null;
    currentInputs.forEach(input => {
        if (!input.value) {
            allValid = false;
            if (!primeiroInvalido) primeiroInvalido = input;
        }
    });

    if (!allValid) {
        alert("Preencha todos os campos obrigatórios desta etapa.");
        if (primeiroInvalido) primeiroInvalido.focus();
        return;
    }
    currentStep++;
    updateFormSteps();
});

btnPrev.addEventListener('click', () => {
    currentStep--;
    updateFormSteps();
});

const inputDataNasc = document.getElementById('dataNasc');
const inputIdade = document.getElementById('campoIdade');
const secaoResponsavel = document.getElementById('secaoResponsavel');
const inputsResponsavel = secaoResponsavel.querySelectorAll('input');
const inputNome = document.getElementById('inputNome');
const inputResponsavel = document.getElementById('inputResponsavel');

inputDataNasc.addEventListener('change', (e) => {
    if (!e.target.value) return;
    const hoje = new Date();
    const nascimento = new Date(e.target.value);

    if (nascimento > hoje) {
        alert("Data de nascimento inválida.");
        e.target.value = '';
        return;
    }

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) idade--;

    inputIdade.value = idade;

    if (idade >= 12) {
        secaoResponsavel.style.display = 'none';
        inputsResponsavel.forEach(input => { input.removeAttribute('required'); input.value = ''; });
    } else {
        secaoResponsavel.style.display = 'block';
        document.getElementById('inputResponsavel').setAttribute('required', 'true');
        document.getElementById('celularResponsavel').setAttribute('required', 'true');
    }
});

const startCamBtn = document.getElementById('startCam');
const flipCamBtn = document.getElementById('flipCam');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapBtn = document.getElementById('snapBtn');
const fotoDataUrl = document.getElementById('fotoDataUrl');
let stream;
let currentFacingMode = 'user';

function pararCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

async function initCamera() {
    pararCamera();
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode } });
        video.srcObject = stream;
        video.style.display = 'block';
        snapBtn.style.display = 'inline-block';
        flipCamBtn.style.display = 'inline-block';
        startCamBtn.style.display = 'none';
        canvas.style.display = 'none';
    } catch (err) {
        alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
    }
}

startCamBtn.addEventListener('click', initCamera);
flipCamBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    initCamera();
});

snapBtn.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    fotoDataUrl.value = canvas.toDataURL('image/jpeg', 0.8);

    pararCamera();
    video.style.display = 'none';
    snapBtn.style.display = 'none';
    flipCamBtn.style.display = 'none';
    canvas.style.display = 'block';

    startCamBtn.innerHTML = '<i class="fas fa-redo"></i> Tirar Outra Foto';
    startCamBtn.style.display = 'inline-block';
});

// Libera a câmera se o usuário sair/recarregar a página com ela ativa
window.addEventListener('beforeunload', pararCamera);
document.addEventListener('visibilitychange', () => { if (document.hidden) pararCamera(); });

const form = document.getElementById('formInscricao');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fotoDataUrl.value) { alert("Tire a foto do aluno no Passo 1 antes de finalizar!"); return; }

    const idadeAluno = parseInt(inputIdade.value) || 0;
    const nomeAssinatura = document.getElementById('assinaturaNomeFicha');
    const dataHoraFicha = document.getElementById('dataHoraImpressaoFicha');

    if (idadeAluno >= 12) {
        nomeAssinatura.textContent = inputNome.value ? inputNome.value : "_________________________________";
    } else {
        nomeAssinatura.textContent = inputResponsavel.value ? inputResponsavel.value : "_________________________________";
    }

    const agora = new Date();
    dataHoraFicha.textContent = `Data e Hora da Inscrição: ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';
    btnSubmit.disabled = true;

    const formData = new FormData(e.target);
    const dataRaw = Object.fromEntries(formData.entries());

    // Sanitiza todos os campos de texto vindos do formulário
    const data = {};
    Object.keys(dataRaw).forEach(k => { data[k] = sanitizeInput(dataRaw[k]); });

    try {
        const senhaHash = await hashPassword(data.senha || '');
        const nomeArquivo = 'fotos_alunos/' + Date.now() + '_' + (data.nome || 'aluno').replace(/\s+/g, '_') + '.jpg';
        const fotoRef = ref(storage, nomeArquivo);
        await uploadString(fotoRef, fotoDataUrl.value, 'data_url');
        const fotoFinalUrl = await getDownloadURL(fotoRef);

        const { senha, fotoDataUrl: _descartado, ...dataSemSenha } = data;

        await addDoc(collection(db, "alunos"), {
            ...dataSemSenha,
            email: (data.email || '').trim().toLowerCase(),
            celular: (data.telefone || '').trim(),
            senhaHash,
            emailResponsavel: (data.emailResponsavel || '').trim().toLowerCase(),
            celularResponsavel: (data.emergenciaTel || '').trim(),
            fotoUrl: fotoFinalUrl,
            dataCadastro: new Date().toISOString(),
            statusAtual: "Ativo",
            cordaoAtual: "Iniciante",
            notas: {}
        });

        alert("Inscrição salva com sucesso! Gerando PDF para impressão...");
        window.print();
        setTimeout(() => { location.reload(); }, 2000);

    } catch (error) {
        console.error(error);
        alert("Erro técnico ao salvar sua inscrição. Verifique sua conexão e tente novamente.");
    } finally {
        btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Enviar e Gerar PDF';
        btnSubmit.disabled = false;
    }
});
