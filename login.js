// login.js — v3: autenticação real via Firebase Authentication.
// Substitui o esquema antigo (hash SHA-256 comparado direto no Firestore).
import { entrar, recuperarSenha } from './firebase.js';

const form = document.getElementById('loginForm');
const campoEmail = document.getElementById('loginIdentificador');
const campoSenha = document.getElementById('senha');
const btn = document.getElementById('btnAcessar');
const erroBox = document.getElementById('errorMsg');
const erroTexto = document.getElementById('errorMsgText');
const infoBox = document.getElementById('infoMsg');
const infoTexto = document.getElementById('infoMsgText');
const linkEsqueci = document.getElementById('linkEsqueciSenha');

let tentativas = 0;
let bloqueadoAte = 0;

function mostrarErro(msg) {
  infoBox.style.display = 'none';
  erroTexto.textContent = msg;
  erroBox.style.display = 'block';
  form.classList.remove('shake');
  void form.offsetWidth; // reinicia a animação
  form.classList.add('shake');
}

function mostrarInfo(msg) {
  erroBox.style.display = 'none';
  infoTexto.textContent = msg;
  infoBox.style.display = 'block';
}

function destinoPorPapeis(papeis) {
  if (!Array.isArray(papeis)) return 'app.html';
  if (papeis.includes('admin') || papeis.includes('mestre')) return 'admin.html';
  return 'app.html';
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const agora = Date.now();
  if (agora < bloqueadoAte) {
    const seg = Math.ceil((bloqueadoAte - agora) / 1000);
    mostrarErro(`Muitas tentativas. Tente novamente em ${seg}s.`);
    return;
  }

  const email = campoEmail.value.trim();
  const senha = campoSenha.value;
  if (!email || !senha) return;

  btn.disabled = true;
  btn.innerHTML = 'Entrando... <i class="fas fa-spinner fa-spin"></i>';
  try {
    const perfil = await entrar(email, senha);
    tentativas = 0;
    window.location.href = destinoPorPapeis(perfil.papeis);
  } catch (e) {
    tentativas += 1;
    if (tentativas >= 5) {
      bloqueadoAte = Date.now() + 30000;
      tentativas = 0;
      mostrarErro('Muitas tentativas incorretas. Aguarde 30s antes de tentar de novo.');
    } else {
      // Mensagem genérica (não revela se o e-mail existe ou não).
      mostrarErro('E-mail ou senha incorretos.');
    }
    btn.disabled = false;
    btn.innerHTML = 'Acessar Painel <i class="fas fa-arrow-right"></i>';
  }
});

linkEsqueci.addEventListener('click', async (ev) => {
  ev.preventDefault();
  const email = campoEmail.value.trim();
  if (!email) {
    mostrarErro('Digite seu e-mail no campo acima e clique em "Esqueci minha senha" de novo.');
    return;
  }
  try {
    await recuperarSenha(email);
  } catch (e) {
    // Não revela se o e-mail existe - mesma mensagem em qualquer caso.
  }
  mostrarInfo('Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.');
});
