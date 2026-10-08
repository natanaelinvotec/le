/* conta.js — ações da conta que chegam por e-mail (atletapay.com.br/conta).

O Firebase manda: ?mode=resetPassword|verifyEmail|recoverEmail|verifyAndChangeEmail
&oobCode=<código de uso único>&continueUrl=<para onde voltar>&lang=…
Segurança:
  • o código sai da barra de endereço assim que é lido (não fica no histórico nem em print);
  • a página não manda "Referer" para ninguém (meta referrer = no-referrer);
  • a volta (continueUrl) só vale para endereços da plataforma e das escolas — nada de
    redirecionar para site de fora (golpe de "link de recuperação" falso). */
import { conferirCodigoSenha, gravarNovaSenha, aplicarCodigo, conferirCodigo, erroAmigavel } from './firebase.js?v=20261008';

const el = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cartao = document.querySelector('.conta-cartao');

const p = new URLSearchParams(location.search);
const modo = p.get('mode') || '';
const codigo = p.get('oobCode') || '';
const voltar = voltaSegura(p.get('continueUrl'));
// Some com o código da barra de endereço (e do histórico) — a página já tem o que precisa.
try { history.replaceState(null, '', location.pathname); } catch (e) { /* ok */ }

// Endereços para onde a página pode devolver a pessoa depois de terminar.
function voltaSegura(url) {
  const HOSTS = ['atletapay.com.br', 'www.atletapay.com.br', 'atletapay.web.app', 'atletapay.firebaseapp.com',
    'liberdadeeexpressao.com.br', 'www.liberdadeeexpressao.com.br', 'capoeira-liberdade.web.app', 'capoeira-liberdade.firebaseapp.com', 'natanaelinvotec.github.io'];
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !HOSTS.includes(u.hostname)) return null;
    return { url: u.href, onde: u.hostname.replace(/^www\./, '') };
  } catch (e) { return null; }
}
const btVoltar = (rotulo = 'Entrar agora') => (voltar
  ? `<a class="bt bt-laranja" href="${esc(voltar.url)}">${esc(rotulo)} <i class="fas fa-arrow-right"></i></a>`
  : '<a class="bt bt-laranja" href="painel">Ir para a AtletaPay <i class="fas fa-arrow-right"></i></a>');
const destino = () => (voltar ? `<p class="conta-destino"><i class="fas fa-arrow-turn-down fa-rotate-270"></i> Depois você volta para <b>${esc(voltar.onde)}</b>.</p>` : '');

function tela({ icone, tom = '', titulo, texto, corpo = '' }) {
  cartao.innerHTML = `<span class="conta-icone ${tom}" aria-hidden="true"><i class="fas ${icone}"></i></span><h1>${titulo}</h1>${texto ? `<p class="sub">${texto}</p>` : ''}${corpo}`;
}
const erro = (e) => tela({ icone: 'fa-link-slash', tom: 'ruim', titulo: 'Este link não vale mais', texto: esc(erroAmigavel(e)), corpo: `<div class="acoes">${btVoltar('Voltar para entrar')}</div>` });

// Força da senha: comprimento + variedade (letras, números, símbolos) — orienta, não decide.
function forca(s) {
  let n = 0;
  if (s.length >= 8) n++; if (s.length >= 12) n++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++; if (/\d/.test(s)) n++; if (/[^A-Za-z0-9]/.test(s)) n++;
  return Math.min(4, n);
}
const ROTULO_FORCA = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte'];

async function novaSenha() {
  let email = '';
  try { email = await conferirCodigoSenha(codigo); } catch (e) { erro(e); return; }
  tela({
    icone: 'fa-key', titulo: 'Crie uma senha nova', texto: `Para a conta <b>${esc(email)}</b>.`,
    corpo: `<form class="form conta-form" id="f" novalidate>
      <div class="erro-caixa" id="erro" hidden></div>
      <div class="campo"><label for="s1">Senha nova</label>
        <div class="senha-campo"><input id="s1" type="password" autocomplete="new-password" minlength="8" required aria-describedby="forcaTxt"><button type="button" class="ver-senha" id="ver" aria-label="Mostrar senha"><i class="fas fa-eye"></i></button></div>
        <div class="forca" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <small class="ajuda" id="forcaTxt">Use pelo menos 8 caracteres, com letras e números.</small></div>
      <div class="campo"><label for="s2">Repita a senha</label><input id="s2" type="password" autocomplete="new-password" required></div>
      <input type="text" autocomplete="username" value="${esc(email)}" hidden readonly>
      <div class="acoes"><button type="submit" class="bt bt-laranja" id="ok">Salvar senha nova <i class="fas fa-check"></i></button></div>
      ${destino()}
    </form>`,
  });
  const s1 = el('s1'); const s2 = el('s2'); const barras = cartao.querySelectorAll('.forca span');
  s1.addEventListener('input', () => {
    const f = s1.value ? forca(s1.value) : 0; const ativas = s1.value ? Math.max(1, f) : 0;
    barras.forEach((b, i) => { b.className = i < ativas ? `on n${ativas}` : ''; });
    el('forcaTxt').textContent = s1.value ? `${ROTULO_FORCA[f]}${s1.value.length < 8 ? ' — faltam ' + (8 - s1.value.length) + ' caracteres' : ''}` : 'Use pelo menos 8 caracteres, com letras e números.';
  });
  el('ver').addEventListener('click', () => { const mostrar = s1.type === 'password'; s1.type = s2.type = mostrar ? 'text' : 'password'; el('ver').innerHTML = `<i class="fas fa-eye${mostrar ? '-slash' : ''}"></i>`; el('ver').setAttribute('aria-label', mostrar ? 'Esconder senha' : 'Mostrar senha'); });
  el('f').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const caixa = el('erro'); const avisar = (m) => { caixa.hidden = false; caixa.textContent = m; };
    if (s1.value.length < 8 || !/[A-Za-z]/.test(s1.value) || !/\d/.test(s1.value)) { avisar('Use pelo menos 8 caracteres, com letras e números.'); s1.focus(); return; }
    if (s1.value !== s2.value) { avisar('As duas senhas não são iguais.'); s2.focus(); return; }
    const b = el('ok'); b.disabled = true; b.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando…';
    try {
      await gravarNovaSenha(codigo, s1.value);
      tela({ icone: 'fa-circle-check', tom: 'bom', titulo: 'Senha nova salva', texto: `Pronto! Entre com <b>${esc(email)}</b> e a senha que você acabou de criar. Por segurança, os outros aparelhos vão pedir a senha de novo.`, corpo: `<div class="acoes">${btVoltar()}</div>` });
    } catch (e) { b.disabled = false; b.innerHTML = 'Salvar senha nova <i class="fas fa-check"></i>'; avisar(erroAmigavel(e)); }
  });
  s1.focus();
}

async function confirmarEmail() {
  try { await aplicarCodigo(codigo); } catch (e) { erro(e); return; }
  tela({ icone: 'fa-envelope-circle-check', tom: 'bom', titulo: 'E-mail confirmado', texto: 'Obrigado! Seu e-mail está confirmado.', corpo: `<div class="acoes">${btVoltar('Continuar')}</div>` });
}

async function desfazerTrocaDeEmail() {
  let email = '';
  try { const info = await conferirCodigo(codigo); email = (info && info.data && info.data.email) || ''; await aplicarCodigo(codigo); } catch (e) { erro(e); return; }
  tela({ icone: 'fa-rotate-left', tom: 'bom', titulo: 'E-mail da conta restaurado', texto: `A conta voltou para <b>${esc(email)}</b>. Se não foi você que trocou o e-mail, crie uma senha nova agora pela opção "Esqueci minha senha".`, corpo: `<div class="acoes">${btVoltar('Ir para entrar')}</div>` });
}

if (!codigo) tela({ icone: 'fa-envelope-open-text', titulo: 'Abra pelo link do e-mail', texto: 'Esta página funciona a partir do link que enviamos por e-mail (nova senha ou confirmação). Peça um link novo na tela de entrar.', corpo: '<div class="acoes"><a class="bt bt-laranja" href="painel">Ir para a AtletaPay <i class="fas fa-arrow-right"></i></a></div>' });
else if (modo === 'resetPassword') novaSenha();
else if (modo === 'verifyEmail' || modo === 'verifyAndChangeEmail') confirmarEmail();
else if (modo === 'recoverEmail') desfazerTrocaDeEmail();
else tela({ icone: 'fa-circle-question', tom: 'ruim', titulo: 'Link desconhecido', texto: 'Não reconhecemos este link. Peça um link novo na tela de entrar.', corpo: `<div class="acoes">${btVoltar('Voltar')}</div>` });
