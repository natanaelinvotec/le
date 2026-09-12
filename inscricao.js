/* inscricao.js — v3: cria uma conta de verdade no Firebase Authentication
   (em vez de gravar senha em hash direto no Firestore) e o perfil em
   usuarios/{uid} (coleção nova, ver firestore.rules). Todo mundo que se
   inscreve aqui entra com papeis:['aluno'] — inclusive quem um dia vai
   virar professor/mestre (isso o admin concede depois ao mesmo cadastro,
   sem precisar de uma inscrição separada).
*/
import { criarConta, enviarFoto, listarNucleosAtivos } from './firebase.js';
import { sanitizeInput, gerarSlug } from './shared.js';

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

// ===== Núcleos: mescla a lista fixa (já no HTML, garante que a inscrição
// funcione mesmo se o Firestore estiver fora do ar) com os núcleos ativos
// cadastrados pelo admin no sistema novo (mesmo id/slug reaproveitado). =====
const selectNucleo = document.getElementById('localTreinoSelect');
(async function popularNucleos() {
    try {
        const nucleos = await listarNucleosAtivos();
        nucleos.forEach((n) => {
            const existente = Array.from(selectNucleo.options).find((o) => o.value === n.id);
            if (existente) {
                existente.textContent = n.nome || existente.textContent;
            } else {
                const opt = document.createElement('option');
                opt.value = n.id;
                opt.textContent = n.nome || n.id;
                selectNucleo.appendChild(opt);
            }
        });
    } catch (e) {
        // Mantém a lista fixa que já está no HTML - a inscrição continua funcionando.
        console.warn('Não foi possível carregar núcleos do Firestore, usando lista padrão.', e);
    }
})();

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

    if (idade >= 18) {
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

function mensagemDeErro(codigoOuErro) {
    const codigo = (codigoOuErro && codigoOuErro.code) || '';
    if (codigo === 'auth/email-already-in-use') {
        return 'Este e-mail já tem cadastro. Se o esqueceu, use "Esqueci minha senha" na tela de login.';
    }
    if (codigo === 'auth/invalid-email') {
        return 'O e-mail informado não é válido. Confira e tente de novo.';
    }
    if (codigo === 'auth/weak-password') {
        return 'A senha é muito curta. Use pelo menos 6 caracteres.';
    }
    return 'Erro técnico ao salvar sua inscrição. Verifique sua conexão e tente novamente.';
}

const form = document.getElementById('formInscricao');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!fotoDataUrl.value) { alert("Tire a foto do aluno no Passo 1 antes de finalizar!"); return; }

    const idadeAluno = parseInt(inputIdade.value) || 0;
    const nomeAssinatura = document.getElementById('assinaturaNomeFicha');
    const dataHoraFicha = document.getElementById('dataHoraImpressaoFicha');

    if (idadeAluno >= 18) {
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

    const nomeAcademiaSelecionada = selectNucleo.selectedOptions[0] ? selectNucleo.selectedOptions[0].textContent : data.localTreino;
    const academiaId = data.localTreino || gerarSlug(nomeAcademiaSelecionada);

    try {
        const nomeArquivo = 'fotos_alunos/' + Date.now() + '_' + (data.nome || 'aluno').replace(/\s+/g, '_') + '.jpg';
        const fotoFinalUrl = await enviarFoto(nomeArquivo, fotoDataUrl.value);

        const dadosPerfil = {
            nome: data.nome,
            dataNasc: data.dataNasc,
            idade: idadeAluno,
            documento: data.documento,
            celular: data.telefone,
            endereco: data.endereco,
            bairro: data.bairro,
            cidade: data.cidade,
            academiaId,
            academiaNome: nomeAcademiaSelecionada,
            cordaoAtual: 'Iniciante',
            statusAtual: 'Ativo',
            fotoUrl: fotoFinalUrl,
            saude: {
                doencaCronica: data.doencaCronica, qualDoenca: data.qualDoenca || '',
                cardiaco: data.cardiaco, asma: data.asma,
                lesoes: data.lesoes, qualLesao: data.qualLesao || '',
                cirurgia: data.cirurgia, qualCirurgia: data.qualCirurgia || '',
                medicamentos: data.medicamentos, qualMedicamento: data.qualMedicamento || '',
                alergia: data.alergia, qualAlergia: data.qualAlergia || '',
                apto: data.apto,
            },
            experiencia: {
                jaPraticou: data.jaPraticou, ondePraticou: data.ondePraticou || '', tempoPratica: data.tempoPratica || '',
                tamCamiseta: data.tamCamiseta, tamCalca: data.tamCalca,
            },
            financeiro: { dataPagamento: data.dataPagamento, formaPagamento: data.formaPagamento },
            usoImagem: data.usoImagem,
            responsavelContato: idadeAluno < 18 ? {
                nome: data.emergenciaNome || '', telefone: data.emergenciaTel || '',
                parentesco: data.parentesco || '', email: (data.emailResponsavel || '').trim().toLowerCase(),
            } : null,
        };

        await criarConta(data.email, data.senha, dadosPerfil);

        alert("Inscrição salva com sucesso! Gerando ficha para impressão...");
        window.print();
        setTimeout(() => { window.location.href = 'app.html'; }, 1500);

    } catch (error) {
        console.error(error);
        alert(mensagemDeErro(error));
    } finally {
        btnSubmit.innerHTML = '<i class="fas fa-check-circle"></i> Enviar e Gerar PDF';
        btnSubmit.disabled = false;
    }
});
