/* site.js — site público (index.html): conteúdo + movimento.

1. O index.html já chega com o conteúdo padrão desenhado (abre instantâneo).
2. Se este aparelho já viu o site, redesenha na hora com a última versão guardada.
3. Busca no Firestore (siteConteudo/site, leitura pública) a versão editada no
   painel "Gerenciar o site" e redesenha se mudou.
4. Liga os efeitos: slider do topo, brasão girando em volta do mestre, menu do
   celular, filtros de núcleos, entrada suave dos cartões e o formulário de
   aula grátis (abre o WhatsApp do núcleo escolhido).

Modo prévia (gerenciar.html abre o site num iframe com ?previa=1): não lê o
banco — desenha o rascunho que o painel manda por postMessage (mesma origem). */

import { renderizarSite } from './site-render.js';
import { FIREBASE_CONFIG } from './escola.js';

const CHAVE_CACHE = 'le.site.v1';
const raiz = document.getElementById('site');
const previa = new URLSearchParams(location.search).get('previa') === '1' && window.parent !== window;
let assinaturaAtual = raiz.dataset.assinatura || 'padrao';
let timerSlide = null;
let retomarSlider = null;
let observador = null;

document.documentElement.classList.add('js');

// Devolve true se desenhou. Conteúdo fora do formato nunca derruba o site:
// fica o que já está na tela (o padrão pré-desenhado) e os efeitos continuam.
function desenhar(conteudo, assinatura) {
  if (assinatura && assinatura === assinaturaAtual) return true;
  let html;
  try { html = renderizarSite(conteudo); } catch (e) { console.warn('Conteúdo do site com formato inesperado', e); return false; }
  const y = window.scrollY;
  raiz.innerHTML = html;
  assinaturaAtual = assinatura || String(Date.now());
  ligar();
  if (y) window.scrollTo(0, y);
  return true;
}

// ---------- conteúdo ----------
function lerCache() { try { const t = localStorage.getItem(CHAVE_CACHE); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function gravarCache(c) { try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(c)); } catch (e) { /* aba privada */ } }
const assinar = (c) => { try { return String(c && c.atualizadoEm ? c.atualizadoEm : JSON.stringify(c).length); } catch (e) { return String(Date.now()); } };

async function buscarNoBanco() {
  const [{ initializeApp }, { getFirestore, doc, getDoc }] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-lite.js'),
  ]);
  const app = initializeApp(FIREBASE_CONFIG, 'site-publico');
  const snap = await getDoc(doc(getFirestore(app), 'siteConteudo', 'site'));
  return snap.exists() ? snap.data() : null;
}

if (previa) {
  window.addEventListener('message', (ev) => {
    if (ev.origin !== location.origin || !ev.data || ev.data.tipo !== 'le-site-previa') return;
    desenhar(ev.data.conteudo, 'previa-' + Date.now());
  });
  window.parent.postMessage({ tipo: 'le-site-pronto' }, location.origin);
  ligar();
} else {
  const guardado = lerCache();
  if (!guardado || !desenhar(guardado, assinar(guardado))) {
    if (guardado) { try { localStorage.removeItem(CHAVE_CACHE); } catch (e) { /* ok */ } }
    ligar();
  }
  buscarNoBanco().then((remoto) => {
    if (remoto && desenhar(remoto, assinar(remoto))) gravarCache(remoto);
  }).catch(() => { /* sem internet ou banco fora: fica o que já está na tela */ });
}

// ---------- movimento e interações ----------
function ligar() {
  ligarSlider();
  ligarRevelar();
  const hero = raiz.querySelector('[data-hero]');
  const palco = raiz.querySelector('[data-palco]');
  if (hero && palco) {
    const on = () => hero.classList.add('girando');
    const off = () => hero.classList.remove('girando');
    palco.addEventListener('mouseenter', on);
    palco.addEventListener('mouseleave', off);
    palco.addEventListener('focus', on);
    palco.addEventListener('blur', off);
    palco.addEventListener('touchstart', () => hero.classList.toggle('girando'), { passive: true });
    palco.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hero.classList.toggle('girando'); } });
  }
}

function ligarSlider() {
  clearInterval(timerSlide);
  const slides = [...raiz.querySelectorAll('.slide')];
  const pontos = [...raiz.querySelectorAll('.ponto')];
  const leg = raiz.querySelector('.legenda');
  if (slides.length < 2) { retomarSlider = null; return; }
  let atual = 0;
  const ir = (i) => {
    atual = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('on', n === atual));
    pontos.forEach((p, n) => { p.classList.toggle('on', n === atual); p.setAttribute('aria-current', n === atual ? 'true' : 'false'); });
    const s = slides[atual];
    if (leg) {
      leg.classList.remove('troca'); void leg.offsetWidth; leg.classList.add('troca');
      leg.querySelector('.l-selo').textContent = s.dataset.selo || '';
      leg.querySelector('.l-tit').textContent = s.dataset.titulo || '';
      leg.querySelector('.l-txt').textContent = s.dataset.texto || '';
    }
  };
  const iniciar = () => { clearInterval(timerSlide); timerSlide = setInterval(() => ir(atual + 1), 5500); };
  pontos.forEach((p) => p.addEventListener('click', () => { ir(Number(p.dataset.ir) || 0); iniciar(); }));
  // Deslizar o dedo na foto troca o slide.
  const janela = raiz.querySelector('.janela');
  if (janela) {
    let x0 = null;
    janela.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    janela.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { ir(atual + (dx < 0 ? 1 : -1)); iniciar(); } x0 = null; });
  }
  retomarSlider = iniciar;
  iniciar();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timerSlide); else if (retomarSlider) retomarSlider(); });

function ligarRevelar() {
  const itens = [...raiz.querySelectorAll('.revela')];
  if (!('IntersectionObserver' in window)) { itens.forEach((el) => el.classList.add('visto')); return; }
  if (observador) observador.disconnect();
  observador = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visto'); observador.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  itens.forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 90}ms`; observador.observe(el); });
}

// Cliques (delegados: continuam valendo depois de redesenhar).
document.addEventListener('click', (e) => {
  const hamb = e.target.closest('.hamb');
  if (hamb) {
    const aberto = document.body.classList.toggle('menu-aberto');
    hamb.setAttribute('aria-expanded', String(aberto));
    hamb.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    return;
  }
  if (e.target.closest('#menu a')) {
    document.body.classList.remove('menu-aberto');
    const h = document.querySelector('.hamb'); if (h) { h.setAttribute('aria-expanded', 'false'); h.setAttribute('aria-label', 'Abrir menu'); }
  }
  const f = e.target.closest('[data-filtro]');
  if (f) {
    const tipo = f.dataset.filtro;
    raiz.querySelectorAll('[data-filtro]').forEach((b) => { b.classList.toggle('on', b === f); b.setAttribute('aria-pressed', String(b === f)); });
    let mostrados = 0;
    raiz.querySelectorAll('.nucleo').forEach((c) => {
      const ok = tipo === 'todos' || c.dataset[tipo] === '1';
      c.hidden = !ok; if (ok) mostrados++;
    });
    const vazio = raiz.querySelector('.vazio-filtro'); if (vazio) vazio.hidden = mostrados > 0;
  }
});

// Aula grátis: monta a mensagem e abre o WhatsApp do núcleo escolhido.
document.addEventListener('submit', (e) => {
  const form = e.target.closest('.form-aula');
  if (!form) return;
  e.preventDefault();
  const ajuda = form.querySelector('.ajuda');
  const nome = String(form.nome.value || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 80);
  if (nome.length < 2) { ajuda.textContent = 'Escreva seu nome para o professor saber quem vai chegar.'; form.nome.focus(); return; }
  const opt = form.nucleo.selectedOptions[0];
  const numero = opt ? String(opt.dataset.w || '').replace(/\D/g, '') : '';
  if (!numero) { ajuda.textContent = 'Escolha um núcleo.'; return; }
  const msg = `Olá! Sou ${nome}. Quero agendar a primeira aula grátis de capoeira (${form.publico.value.toLowerCase()}) no núcleo ${opt.textContent.trim()}.`;
  const d = numero.startsWith('55') && numero.length >= 12 ? numero : '55' + numero;
  window.open(`https://wa.me/${d}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  ajuda.textContent = 'Abrimos o WhatsApp do núcleo com a sua mensagem pronta. É só enviar!';
});

// Topo fica sólido ao rolar.
let rolando = false;
window.addEventListener('scroll', () => {
  if (rolando) return; rolando = true;
  requestAnimationFrame(() => { document.body.classList.toggle('rolou', window.scrollY > 40); rolando = false; });
}, { passive: true });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
