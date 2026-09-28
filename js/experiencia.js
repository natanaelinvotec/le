/* experiencia.js — peças de experiência usadas em todas as telas (app, painel e Rede):
   - acessibilidade: tamanho do texto e alto contraste (fica salvo no aparelho);
   - aviso de "sem internet" e registro do modo offline (sw.js);
   - instalar o app / a Rede como ícone no celular;
   - tutorial de primeiro acesso (passo a passo com "Pular").
   O visual vem junto (CSS injetado), então basta importar e chamar. */

import { ESCOLA } from './escola.js';

const CHAVE_A11Y = 'le.acessibilidade';
const ESCALAS = [1, 1.12, 1.25, 1.4];
const lerA11y = () => { try { return JSON.parse(localStorage.getItem(CHAVE_A11Y) || '{}'); } catch (e) { return {}; } };
const gravarA11y = (v) => { try { localStorage.setItem(CHAVE_A11Y, JSON.stringify(v)); } catch (e) { /* aba privada */ } };

const CSS = `
:root{--xp-teal:#389E92;--xp-navy:#002D72;--xp-verde:#00E676;--xp-fundo:#EAF2F1;--xp-texto:#0f2230;--xp-card:#fff;--xp-borda:rgba(0,45,114,.14)}
html.xp-contraste{--xp-texto:#000;--xp-card:#fff;filter:contrast(1.18)}
html.xp-contraste body{text-shadow:none}
html.xp-contraste a, html.xp-contraste button{text-decoration-thickness:2px}
:focus-visible{outline:3px solid var(--xp-verde)!important;outline-offset:2px!important;border-radius:6px}
.xp-offline{position:fixed;left:50%;top:10px;transform:translate(-50%,-160%);z-index:99990;background:#1d2733;color:#fff;border-radius:999px;padding:9px 16px;font:600 .82rem/1.2 Manrope,system-ui,sans-serif;display:flex;gap:8px;align-items:center;box-shadow:0 10px 30px rgba(0,0,0,.28);transition:transform .45s cubic-bezier(.16,1,.3,1)}
.xp-offline.on{transform:translate(-50%,0)}
.xp-folha{position:fixed;inset:0;z-index:99980;background:rgba(6,20,40,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;animation:xpFundo .3s ease both}
.xp-folha .xp-cx{background:var(--xp-card);color:var(--xp-texto);width:min(520px,100%);border-radius:22px 22px 0 0;padding:20px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -18px 50px rgba(0,0,0,.25);animation:xpSobe .45s cubic-bezier(.16,1,.3,1) both;max-height:88vh;overflow:auto;font-family:Manrope,system-ui,sans-serif}
@media (min-width:700px){.xp-folha{align-items:center}.xp-folha .xp-cx{border-radius:22px}}
.xp-cx h3{font:800 1.05rem/1.2 Sora,Manrope,system-ui,sans-serif;margin:0 0 4px;color:var(--xp-navy);display:flex;justify-content:space-between;align-items:center;gap:8px}
.xp-cx p{margin:6px 0;color:#4b5b66;font-size:.9rem;line-height:1.5}
.xp-linha{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--xp-borda)}
.xp-linha b{display:block;font-size:.92rem}.xp-linha small{color:#5f6f7a;font-size:.78rem}
.xp-seg{display:flex;background:var(--xp-fundo);border-radius:12px;padding:3px;gap:3px}
.xp-seg button{border:0;background:transparent;border-radius:9px;padding:7px 11px;font:800 .8rem Manrope,system-ui,sans-serif;color:var(--xp-navy);cursor:pointer;transition:all .25s cubic-bezier(.16,1,.3,1)}
.xp-seg button.on{background:var(--xp-navy);color:#fff;box-shadow:0 4px 12px rgba(0,45,114,.3)}
.xp-sw{width:48px;height:28px;border-radius:999px;border:0;background:#cfd9d6;position:relative;cursor:pointer;transition:background .3s}
.xp-sw::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .35s cubic-bezier(.16,1,.3,1)}
.xp-sw.on{background:var(--xp-teal)}.xp-sw.on::after{transform:translateX(20px)}
.xp-btn{border:0;border-radius:14px;padding:12px 16px;font:800 .88rem Manrope,system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s}
.xp-btn:active{transform:scale(.97)}
.xp-btn.p{background:linear-gradient(135deg,var(--xp-teal),#0B5C52);color:#fff;box-shadow:0 8px 20px rgba(56,158,146,.35)}
.xp-btn.s{background:var(--xp-fundo);color:var(--xp-navy)}
.xp-x{border:0;background:var(--xp-fundo);color:var(--xp-navy);width:34px;height:34px;border-radius:50%;cursor:pointer;flex:none}
.xp-passos{display:flex;gap:6px;justify-content:center;margin:14px 0 4px}
.xp-passos i{width:8px;height:8px;border-radius:99px;background:#cfd9d6;transition:all .4s cubic-bezier(.16,1,.3,1)}
.xp-passos i.on{width:24px;background:linear-gradient(90deg,var(--xp-teal),var(--xp-verde))}
.xp-tut-ic{width:74px;height:74px;border-radius:24px;margin:6px auto 12px;display:grid;place-items:center;font-size:1.9rem;color:#fff;background:linear-gradient(135deg,var(--xp-teal),var(--xp-navy));box-shadow:0 14px 30px rgba(0,45,114,.3);animation:xpPula .6s cubic-bezier(.16,1,.3,1) both}
.xp-tut{text-align:center}.xp-tut h3{justify-content:center;font-size:1.2rem}.xp-tut p{font-size:.95rem}
.xp-acoes{display:flex;gap:8px;margin-top:16px}.xp-acoes .xp-btn{flex:1}
.xp-ios{display:grid;gap:10px;margin-top:10px}.xp-ios div{display:flex;gap:10px;align-items:center;background:var(--xp-fundo);border-radius:12px;padding:10px 12px;font-size:.88rem}
.xp-ios i{color:var(--xp-teal);font-size:1.1rem;width:22px;text-align:center}
@keyframes xpFundo{from{opacity:0}to{opacity:1}}
@keyframes xpSobe{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes xpPula{from{transform:scale(.6) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}
`;
let cssPosto = false;
function garantirCss() {
  if (cssPosto) return; cssPosto = true;
  const st = document.createElement('style'); st.id = 'xp-css'; st.textContent = CSS; document.head.appendChild(st);
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Acessibilidade ----------
export function aplicarAcessibilidade() {
  const a = lerA11y();
  const escala = ESCALAS[Math.max(0, Math.min(ESCALAS.length - 1, Number(a.escala) || 0))];
  document.documentElement.style.fontSize = escala === 1 ? '' : `${escala * 100}%`;
  document.documentElement.classList.toggle('xp-contraste', !!a.contraste);
}

export function folha(html, aoMontar) {
  garantirCss();
  const f = document.createElement('div'); f.className = 'xp-folha'; f.setAttribute('role', 'dialog'); f.setAttribute('aria-modal', 'true');
  f.innerHTML = `<div class="xp-cx">${html}</div>`;
  const fechar = () => { f.remove(); document.removeEventListener('keydown', tecla); };
  const tecla = (e) => { if (e.key === 'Escape') fechar(); };
  document.addEventListener('keydown', tecla);
  f.addEventListener('click', (e) => { if (e.target === f || e.target.closest('[data-xp-fechar]')) fechar(); });
  document.body.appendChild(f);
  if (aoMontar) aoMontar(f.querySelector('.xp-cx'), fechar);
  const foco = f.querySelector('button, [href], input, select'); if (foco) foco.focus({ preventScroll: true });
  return { el: f, fechar };
}

export function abrirAcessibilidade() {
  const a = lerA11y();
  folha(`<h3>Acessibilidade <button class="xp-x" data-xp-fechar aria-label="Fechar"><i class="fas fa-xmark"></i></button></h3>
    <p>Fica salvo neste aparelho.</p>
    <div class="xp-linha"><div><b>Tamanho do texto</b><small>Letras maiores em todo o app</small></div>
      <div class="xp-seg" role="group" aria-label="Tamanho do texto">${ESCALAS.map((e, i) => `<button type="button" data-escala="${i}" class="${(Number(a.escala) || 0) === i ? 'on' : ''}" aria-pressed="${(Number(a.escala) || 0) === i}">${['A', 'A+', 'A++', 'A+++'][i]}</button>`).join('')}</div></div>
    <div class="xp-linha"><div><b>Alto contraste</b><small>Cores mais fortes, bordas e textos mais nítidos</small></div>
      <button type="button" class="xp-sw ${a.contraste ? 'on' : ''}" id="xpContraste" role="switch" aria-checked="${!!a.contraste}" aria-label="Alto contraste"></button></div>`,
  (cx) => {
    cx.querySelectorAll('[data-escala]').forEach((b) => b.addEventListener('click', () => {
      const v = lerA11y(); v.escala = Number(b.dataset.escala); gravarA11y(v); aplicarAcessibilidade();
      cx.querySelectorAll('[data-escala]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    }));
    const sw = cx.querySelector('#xpContraste');
    sw.addEventListener('click', () => { const v = lerA11y(); v.contraste = !v.contraste; gravarA11y(v); aplicarAcessibilidade(); sw.classList.toggle('on', v.contraste); sw.setAttribute('aria-checked', String(v.contraste)); });
  });
}

// ---------- Offline ----------
function ligarAvisoOffline() {
  garantirCss();
  const av = document.createElement('div'); av.className = 'xp-offline'; av.setAttribute('role', 'status'); av.setAttribute('aria-live', 'polite');
  av.innerHTML = '<i class="fas fa-wifi"></i><span>Sem internet — mostrando o que já estava salvo</span>';
  document.body.appendChild(av);
  const atualizar = () => av.classList.toggle('on', navigator.onLine === false);
  window.addEventListener('online', () => { av.querySelector('span').textContent = 'Conectado de novo'; setTimeout(() => av.classList.remove('on'), 1800); });
  window.addEventListener('offline', () => { av.querySelector('span').textContent = 'Sem internet — mostrando o que já estava salvo'; atualizar(); });
  atualizar();
}

export async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('sw.js'); } catch (e) { return null; }
}

// ---------- Instalar ----------
let promptInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; document.dispatchEvent(new CustomEvent('xp:instalavel')); });
export const podeInstalarDireto = () => !!promptInstalar;
export const estaInstalado = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// nome: o que vai aparecer embaixo do ícone (ex.: "Rede Liberdade").
export async function instalar({ nome = 'o app', icone = 'assets/app-icon-192.png' } = {}) {
  if (promptInstalar) {
    const p = promptInstalar; promptInstalar = null;
    p.prompt();
    const r = await p.userChoice.catch(() => null);
    return r && r.outcome === 'accepted';
  }
  folha(`<h3>Instalar ${esc(nome)} <button class="xp-x" data-xp-fechar aria-label="Fechar"><i class="fas fa-xmark"></i></button></h3>
    <div style="display:flex;gap:12px;align-items:center;margin:8px 0"><img src="${esc(icone)}" alt="" style="width:56px;height:56px;border-radius:14px;box-shadow:0 8px 18px rgba(0,0,0,.18)"><p style="margin:0">Cria um ícone na tela inicial que abre direto, sem barra do navegador.</p></div>
    ${ehIOS() ? `<div class="xp-ios"><div><i class="fas fa-arrow-up-from-bracket"></i><span>No Safari, toque em <b>Compartilhar</b></span></div><div><i class="far fa-square-plus"></i><span>Escolha <b>Adicionar à Tela de Início</b></span></div><div><i class="fas fa-check"></i><span>Confirme em <b>Adicionar</b></span></div></div>`
    : `<div class="xp-ios"><div><i class="fas fa-ellipsis-vertical"></i><span>No Chrome, abra o menu <b>⋮</b></span></div><div><i class="fas fa-mobile-screen"></i><span>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></span></div></div>`}
    ${estaInstalado() ? '<p><b>Você já está usando a versão instalada.</b></p>' : ''}`);
  return false;
}

// ---------- Tutorial de primeiro acesso ----------
// passos: [{ icone: 'fa-...', titulo, texto }]. Mostra só uma vez por aparelho
// (a menos que forcar = true, usado no botão "Ver tutorial de novo").
export function tutorial(chave, passos, { forcar = false, aoTerminar } = {}) {
  const k = `le.tutorial.${chave}`;
  try { if (!forcar && localStorage.getItem(k)) return; } catch (e) { /* ok */ }
  if (!passos || !passos.length) return;
  let i = 0;
  const { el, fechar } = folha('<div class="xp-tut" id="xpTut"></div>');
  const marcar = () => { try { localStorage.setItem(k, new Date().toISOString()); } catch (e) { /* ok */ } };
  const desenhar = () => {
    const p = passos[i]; const box = el.querySelector('#xpTut');
    box.innerHTML = `<div class="xp-tut-ic"><i class="fas ${esc(p.icone || 'fa-star')}"></i></div><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p>
      <div class="xp-passos">${passos.map((x, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="xp-acoes"><button type="button" class="xp-btn s" id="xpPular">${i === passos.length - 1 ? 'Fechar' : 'Pular'}</button><button type="button" class="xp-btn p" id="xpProx">${i === passos.length - 1 ? 'Começar' : 'Próximo'} <i class="fas fa-arrow-right"></i></button></div>`;
    box.querySelector('#xpPular').addEventListener('click', () => { marcar(); fechar(); aoTerminar && aoTerminar(); });
    box.querySelector('#xpProx').addEventListener('click', () => { if (i < passos.length - 1) { i++; desenhar(); } else { marcar(); fechar(); aoTerminar && aoTerminar(); } });
  };
  desenhar();
}

// ---------- Aceite do termo de privacidade (LGPD) ----------
// Quem ainda não aceitou a versão atual (ESCOLA.versaoTermo) vê um aviso curto
// uma vez; o aceite fica gravado no cadastro (usuarios.consentimento).
// gravar(dados) = função que salva no próprio cadastro.
export function pedirAceiteSeNecessario(perfil, gravar) {
  if (!perfil || !gravar) return;
  const c = perfil.consentimento || {};
  if (c.versaoTermo === ESCOLA.versaoTermo) return;
  const k = `le.aceite.${ESCOLA.versaoTermo}`;
  try { if (sessionStorage.getItem(k)) return; } catch (e) { /* ok */ }
  const { el, fechar } = folha(`<div class="xp-tut"><div class="xp-tut-ic"><i class="fas fa-user-shield"></i></div><h3>Seus dados, seu controle</h3>
    <p>Atualizamos a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> do app: o que guardamos, quem vê, por quanto tempo e como baixar seus dados ou pedir a exclusão da conta.${Number(perfil.idade) > 0 && Number(perfil.idade) < 18 ? ' Como o atleta é menor de idade, o aceite deve ser dado pelo pai, mãe ou responsável.' : ''}</p>
    <div class="xp-acoes"><button type="button" class="xp-btn s" id="xpDepois">Depois</button><button type="button" class="xp-btn p" id="xpAceito">Li e aceito</button></div></div>`);
  el.querySelector('#xpDepois').addEventListener('click', () => { try { sessionStorage.setItem(k, '1'); } catch (e) { /* ok */ } fechar(); });
  el.querySelector('#xpAceito').addEventListener('click', async () => {
    const b = el.querySelector('#xpAceito'); b.disabled = true;
    try {
      await gravar({ consentimento: { versaoTermo: ESCOLA.versaoTermo, aceitoEm: new Date().toISOString(), aceitoPor: String(perfil.nome || '').slice(0, 120), usoImagem: String(perfil.usoImagem || ''), navegador: String(navigator.userAgent || '').slice(0, 160) } });
      perfil.consentimento = { versaoTermo: ESCOLA.versaoTermo };
      fechar();
    } catch (e) { b.disabled = false; b.textContent = 'Tentar de novo'; }
  });
}

// Chame uma vez por página.
export function iniciarExperiencia() {
  aplicarAcessibilidade();
  if (document.body) ligarAvisoOffline(); else document.addEventListener('DOMContentLoaded', ligarAvisoOffline, { once: true });
  registrarServiceWorker();
}
