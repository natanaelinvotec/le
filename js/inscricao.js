/* inscricao.js — v3: cria uma conta de verdade no Firebase Authentication
(em vez de gravar senha em hash direto no Firestore) e o perfil em
usuarios/{uid} (coleção nova, ver firestore.rules). Todo mundo que se
inscreve aqui entra com papeis:['aluno'] — inclusive quem um dia vai
virar professor/mestre (isso o admin concede depois ao mesmo cadastro,
sem precisar de uma inscrição separada).
*/
import { criarConta, listarNucleosAtivos, comprimirImagemDataUrl, arquivoParaDataUrlComprimido, registroConsentimento } from './firebase.js';
import { sanitizeInput, gerarSlug } from './shared.js';
import { escolaIdDoEndereco, carregarEscola, aplicarCores, ESCOLA_PADRAO } from './escola-atual.js';
import { MODALIDADES } from './modalidades.js';

// Multi-escola: o link de inscrição de cada escola é inscricao.html?escola=<id> (o
// Mega painel e o painel do dono mostram o link). Sem ?escola, é a escola do endereço
// (liberdadeeexpressao.com.br → Liberdade). Núcleos, nome nos termos e logo seguem a escola.
const ESCOLA_ID = escolaIdDoEndereco(location, { usarUltima: false }) || ESCOLA_PADRAO;
let escolaCfg = null;
import { CONDICOES, SEM_LIMITACOES, nomeDe, siglaDe, lacoSVG, lacosHTML, normalizarInclusao, apoiosChecklistHTML, ligarChecklist, apoiosMarcados, garantirEstilos } from './inclusao.js?v=20261006';

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
    const nucleos = (await listarNucleosAtivos(ESCOLA_ID)).sort((a, b) => Number(!!b.sede) - Number(!!a.sede) || String(a.nome || '').localeCompare(String(b.nome || '')));
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
    if (nucleos.length === 1) selectNucleo.value = nucleos[0].id; // escola com uma sede só: já vem escolhida
  } catch (e) {
    // Mantém a lista fixa que já está no HTML - a inscrição continua funcionando.
    console.warn('Não foi possível carregar núcleos do Firestore, usando lista padrão.', e);
  }
})();

// Identidade da escola do link (só quando não é a Liberdade: a página já nasce com a dela).
if (ESCOLA_ID !== ESCOLA_PADRAO) {
  carregarEscola(ESCOLA_ID).then((cfg) => {
    escolaCfg = cfg;
    if (!cfg.ativa) {
      document.querySelector('.container').innerHTML = '<div class="form-step active" style="text-align:center;padding:32px 12px"><h2>Inscrição indisponível</h2><p>Este link de inscrição não pertence a uma escola ativa. Confira o link com o seu professor.</p></div>';
      return;
    }
    marcarEscola(cfg);
  }).catch((e) => console.warn('identidade da escola', e));
}
function marcarEscola(cfg) {
  const mod = MODALIDADES[cfg.modalidade] || MODALIDADES.outra;
  const nome = cfg.nome || cfg.nomeCurto || 'a escola'; const curto = cfg.nomeCurto || nome;
  const arte = mod.nome; const arteMin = arte.toLowerCase(); const peca = (cfg.escada && cfg.escada.peca) || mod.peca || 'graduação';
  const trocas = [
    [/Grupo de Capoeira Liberdade e Expressão/g, nome], [/Capoeira Liberdade e Expressão/g, nome], [/Liberdade e Expressão/g, curto],
    [/Capoeira Liberdade/g, curto], [/\bcapoeira\b/g, arteMin], [/\bCapoeira\b/g, arte], [/\bcordão\b/g, peca],
  ];
  const andar = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const textos = []; while (andar.nextNode()) textos.push(andar.currentNode);
  textos.forEach((t) => { let v = t.nodeValue; trocas.forEach(([re, por]) => { v = v.replace(re, por); }); if (v !== t.nodeValue) t.nodeValue = v; });
  document.querySelectorAll('img[alt]').forEach((i) => { i.alt = i.alt.replace(/Capoeira/g, arte); });
  // Uniforme é de cada escola: o professor orienta.
  document.querySelectorAll('li').forEach((li) => { if (/calça branca/i.test(li.textContent)) li.innerHTML = '<strong>Uniforme:</strong> o da escola — o professor orienta na primeira aula.'; });
  const logo = document.querySelector('.header img'); if (logo && /^https:\/\//.test(cfg.logo || '')) { logo.src = cfg.logo; logo.alt = `Logo ${nome}`; }
  document.title = `Inscrição - ${nome}`;
  aplicarCores(cfg);
}

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
const btnGaleria = document.getElementById('btnGaleria');
const inputGaleria = document.getElementById('inputGaleria');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snapBtn = document.getElementById('snapBtn');
const fotoDataUrl = document.getElementById('fotoDataUrl');
const fotoStatus = document.getElementById('fotoStatus');
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

function mostrarFotoNoCanvas(dataUrlComprimido) {
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
    canvas.style.display = 'block';
  };
  img.src = dataUrlComprimido;
}

snapBtn.addEventListener('click', async () => {
  const canvasBruto = document.createElement('canvas');
  canvasBruto.width = video.videoWidth;
  canvasBruto.height = video.videoHeight;
  canvasBruto.getContext('2d').drawImage(video, 0, 0);
  const bruto = canvasBruto.toDataURL('image/jpeg', 0.9);

  pararCamera();
  video.style.display = 'none';
  snapBtn.style.display = 'none';
  flipCamBtn.style.display = 'none';

  try {
    if (fotoStatus) fotoStatus.textContent = 'Ajustando o tamanho da foto...';
    const comprimida = await comprimirImagemDataUrl(bruto, 540, 0.82);
    fotoDataUrl.value = comprimida;
    mostrarFotoNoCanvas(comprimida);
    if (fotoStatus) fotoStatus.textContent = 'Foto pronta.';
  } catch (err) {
    console.error(err);
    fotoDataUrl.value = bruto;
    mostrarFotoNoCanvas(bruto);
    if (fotoStatus) fotoStatus.textContent = '';
  }

  startCamBtn.innerHTML = '<i class="fas fa-redo"></i> Tirar Outra Foto';
  startCamBtn.style.display = 'inline-block';
});

// ===== Upload da galeria — mesmo resultado final da câmera: comprime pra
// no máximo 540px no maior lado antes de gravar em fotoDataUrl. =====
btnGaleria.addEventListener('click', () => inputGaleria.click());
inputGaleria.addEventListener('change', async () => {
  const arquivo = inputGaleria.files && inputGaleria.files[0];
  if (!arquivo) return;
  pararCamera();
  video.style.display = 'none';
  snapBtn.style.display = 'none';
  flipCamBtn.style.display = 'none';
  try {
    if (fotoStatus) fotoStatus.textContent = 'Ajustando o tamanho da foto...';
    const comprimida = await arquivoParaDataUrlComprimido(arquivo, 540, 0.82);
    fotoDataUrl.value = comprimida;
    mostrarFotoNoCanvas(comprimida);
    if (fotoStatus) fotoStatus.textContent = 'Foto pronta.';
    startCamBtn.innerHTML = '<i class="fas fa-redo"></i> Tirar Outra Foto';
    startCamBtn.style.display = 'inline-block';
  } catch (err) {
    console.error(err);
    alert('Não foi possível usar essa imagem. Tente outra foto.');
    if (fotoStatus) fotoStatus.textContent = '';
  } finally {
    inputGaleria.value = '';
  }
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


// ---------- Atenção e inclusão (laços) ----------
// "Sem limitações" é o padrão. Cada condição escolhida vira um chip (com X para
// tirar) e um laço no canto da foto; a lista vai em usuarios/{uid}.inclusao.
garantirEstilos();
const inclusaoSelect = document.getElementById('inclusaoSelect');
const inclusaoChips = document.getElementById('inclusaoChips');
const inclusaoHidden = document.getElementById('inclusaoCondicoes');
const wrapInclusaoObs = document.getElementById('wrapInclusaoObs');
const fotoLacos = document.getElementById('fotoLacos');
const inclusaoApoios = document.getElementById('inclusaoApoios');
let condicoesEscolhidas = [];
// Ficha de adaptação (o que ajuda na aula): checklist desenhado uma vez; os sugeridos acompanham as condições.
if (inclusaoApoios) { inclusaoApoios.innerHTML = apoiosChecklistHTML({ condicoes: [] }); ligarChecklist(inclusaoApoios, () => condicoesEscolhidas); }
if (inclusaoSelect) {
  CONDICOES.forEach((c) => { const o = document.createElement('option'); o.value = c.id; o.textContent = `${c.sigla} — ${c.nome}`; inclusaoSelect.appendChild(o); });
  const desenharInclusao = () => {
    inclusaoHidden.value = JSON.stringify(condicoesEscolhidas);
    inclusaoChips.innerHTML = condicoesEscolhidas.map((id) => `<span class="laco-chip" data-nome="${siglaDe(id)} · ${nomeDe(id)}" title="${nomeDe(id)}">${lacoSVG(id, 20)}<b>${siglaDe(id)}</b><button type="button" data-tirar="${id}" aria-label="Tirar ${nomeDe(id)}">×</button></span>`).join('');
    if (fotoLacos) fotoLacos.innerHTML = condicoesEscolhidas.map((id) => `<span class="laco-chip" data-nome="${siglaDe(id)} · ${nomeDe(id)}" title="${nomeDe(id)}">${lacoSVG(id, 26)}</span>`).join('');
    wrapInclusaoObs.hidden = condicoesEscolhidas.length === 0;
    if (inclusaoApoios && inclusaoApoios.atualizarSugeridos) inclusaoApoios.atualizarSugeridos();
    // Com uma condição marcada, o seletor volta a oferecer as outras; sem nenhuma, mostra "Sem limitações".
    inclusaoSelect.options[0].textContent = condicoesEscolhidas.length ? 'Adicionar outra condição…' : SEM_LIMITACOES;
    [...inclusaoSelect.options].forEach((o) => { o.disabled = !!o.value && condicoesEscolhidas.includes(o.value); });
    inclusaoSelect.value = '';
  };
  inclusaoSelect.addEventListener('change', () => { const v = inclusaoSelect.value; if (v && !condicoesEscolhidas.includes(v)) condicoesEscolhidas.push(v); desenharInclusao(); });
  inclusaoChips.addEventListener('click', (e) => { const b = e.target.closest('[data-tirar]'); if (!b) return; condicoesEscolhidas = condicoesEscolhidas.filter((x) => x !== b.dataset.tirar); desenharInclusao(); });
  desenharInclusao();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!fotoDataUrl.value) { alert("Tire a foto do aluno (ou envie uma da galeria) no Passo 1 antes de finalizar!"); return; }

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
      // Atenção e inclusão: lista vazia = "Sem limitações". Só o núcleo e a
      // administração leem (não entra no cartão público).
      inclusao: normalizarInclusao({ condicoes: (() => { try { return JSON.parse(data.inclusaoCondicoes || '[]'); } catch (e) { return []; } })(), apoios: apoiosMarcados(inclusaoApoios), observacoes: data.inclusaoObs || '' }),
      usoImagem: data.usoImagem,
      // Aceite do termo e da política de privacidade (LGPD): quem aceitou e quando.
      consentimento: registroConsentimento(idadeAluno < 18 ? (inputResponsavel.value || data.emergenciaNome || data.nome) : data.nome, data.usoImagem, { id: ESCOLA_ID, nome: (escolaCfg && escolaCfg.nome) || '' }),
      responsavelContato: idadeAluno < 18 ? {
        nome: data.emergenciaNome || '', telefone: data.emergenciaTel || '',
        parentesco: data.parentesco || '', email: (data.emailResponsavel || '').trim().toLowerCase(),
      } : null,
    };

    // A foto sobe depois do login criado, direto na pasta do aluno (fotos/<uid>/).
    await criarConta(data.email, data.senha, dadosPerfil, fotoDataUrl.value);

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
