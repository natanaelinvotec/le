/* site-v2.js — atletapay.com.br v3 (17/10/2026; base v2 "Arena", 11/10/2026). Sem Firebase, sem coleta de dados.
- v3: carrega também /app/js/site-loja.js e /app/js/site-templates.js e entrega tudo ao site-v3.js
  (vitrine dos modelos de site, escada inteira e loja oficial), que reage ao chip "Qual é a sua arte?".

- Vídeo do herói: só baixa depois do `load`; não toca sozinho com movimento reduzido ou economia
  de dados; pausa fora da tela; botão de pausa lembrado no aparelho.
- "Qual é a sua arte?": 12 artes. Os dados (nome, saudação, peça, escada, brasões) vêm do PRÓPRIO
  app (/app/js/modalidades.js, escola.js, faixas.js, brasoes.js), então o site nunca mostra uma
  graduação que o produto não tem. Se o app não carregar, o site segue com o texto padrão.
- Prévia "nome da sua escola": tudo local; nada é enviado nem salvo.
- Graduação interativa com a faixa desenhada pelo mesmo código do app (faixaSVG).
- Simulador com o preço oficial (js/catalogo.js).
- Movimento: entradas só para o que está abaixo da dobra quando o JS roda; sem JS tudo aparece. */
import { valorDoMes, brl, slugDe } from './catalogo.js?v=20261017';

document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduzir = matchMedia('(prefers-reduced-motion: reduce)');
const semMovimento = () => reduzir.matches;
const lerLocal = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ok */ } };

/* ============================== botões: pressionar e "amarrar" ============================== */
(() => {
  const sel = '.btn, .btn-vidro, .btn-icone, .chip';
  document.addEventListener('touchstart', () => {}, { passive: true }); // :active no iOS
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest(sel);
    if (!b || b.matches(':disabled, [aria-disabled="true"]')) return;
    b.classList.add('is-pressionado');
    const fim = () => setTimeout(() => b.classList.remove('is-pressionado'), 120);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, fim, { once: true }));
  }, { passive: true });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b || semMovimento()) return;
    b.classList.remove('is-amarrando'); void b.offsetWidth;
    b.classList.add('is-amarrando');
    b.addEventListener('animationend', () => b.classList.remove('is-amarrando'), { once: true });
  });
})();

/* ============================== cabeçalho, fio de progresso, menu ============================== */
const topo = $('#topo');
const fio = $('.fio');
const grausFio = $$('.fio__ponta i');
const heroi = $('.heroi');
let ultimoY = window.scrollY;
const menuEl = $('#menu');
let altHeroi = heroi ? heroi.offsetHeight : 400;
if (heroi && 'ResizeObserver' in window) new ResizeObserver(() => { altHeroi = heroi.offsetHeight; }).observe(heroi);
let agendado = false;
function aoRolar() {
  agendado = false;
  const y = window.scrollY;
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const p = Math.min(1, Math.max(0, y / max));
  fio.style.setProperty('--p', p.toFixed(4));
  grausFio.forEach((g, i) => g.classList.toggle('on', p >= (i + 1) * 0.25 - 0.001));
  topo.classList.toggle('solido', y > 40);
  const passouHeroi = y > altHeroi * 0.6;
  const menuAberto = menuEl.classList.contains('aberto');
  topo.classList.toggle('escondido', passouHeroi && y > ultimoY + 4 && !menuAberto && !topo.contains(document.activeElement));
  if (y < ultimoY - 4 || y < 80) topo.classList.remove('escondido');
  ultimoY = y;
}
window.addEventListener('scroll', () => { if (!agendado) { agendado = true; requestAnimationFrame(aoRolar); } }, { passive: true });
aoRolar();

(() => {
  const btn = $('#menuBtn'); const menu = $('#menu'); const fora = [$('#conteudo'), $('.rodape'), $('#barraFixa'), $('.pular')];
  if (!btn || !menu) return;
  const fechar = (devolver = true) => {
    menu.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir o menu');
    fora.forEach((el) => { if (el) el.inert = false; }); document.documentElement.style.overflow = '';
    if (devolver) btn.focus();
  };
  btn.addEventListener('click', () => {
    if (menu.classList.contains('aberto')) return fechar();
    menu.classList.add('aberto'); btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Fechar o menu');
    fora.forEach((el) => { if (el) el.inert = true; }); document.documentElement.style.overflow = 'hidden';
    const primeiro = menu.querySelector('a'); if (primeiro) setTimeout(() => primeiro.focus(), 60);
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) fechar(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('aberto')) fechar(); });
  matchMedia('(min-width: 1200px)').addEventListener('change', (m) => { if (m.matches && menu.classList.contains('aberto')) fechar(false); });
})();

/* ============================== vídeo do herói ============================== */
(() => {
  const v = $('#heroiVideo'); const pausa = $('#pausaVideo');
  if (!v || !pausa) return;
  const conexao = navigator.connection || {};
  const economia = conexao.saveData === true || /(^|-)2g|3g/.test(String(conexao.effectiveType || ''));
  let pausadoPeloUsuario = lerLocal('ap.video.pausado') === '1' || semMovimento() || economia;
  let carregado = false;
  const marcar = () => {
    pausa.setAttribute('aria-pressed', String(pausadoPeloUsuario));
    if (heroi) heroi.classList.toggle('pausado', pausadoPeloUsuario);
  };
  const carregar = () => {
    if (carregado) return; carregado = true;
    let fontes = [];
    try { fontes = JSON.parse(v.dataset.fontes || '[]'); } catch (e) { fontes = []; }
    fontes.forEach((f) => { const s = document.createElement('source'); s.src = f.src; s.type = f.type; if (f.media) s.media = f.media; v.appendChild(s); });
    v.muted = true; v.preload = 'auto'; v.load();
    v.addEventListener('playing', () => v.classList.add('pronto'), { once: true });
  };
  const tocar = () => { carregar(); const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  marcar();
  pausa.addEventListener('click', () => {
    pausadoPeloUsuario = !pausadoPeloUsuario;
    gravarLocal('ap.video.pausado', pausadoPeloUsuario ? '1' : '0');
    marcar();
    if (pausadoPeloUsuario) v.pause(); else tocar();
  });
  const iniciar = () => { if (!pausadoPeloUsuario) tocar(); };
  if (document.readyState === 'complete') setTimeout(iniciar, 200); else window.addEventListener('load', () => setTimeout(iniciar, 200), { once: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      if (!carregado || pausadoPeloUsuario) return;
      if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    }, { threshold: 0.15 }).observe(v);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) v.pause(); else if (carregado && !pausadoPeloUsuario) v.play().catch(() => {}); });
})();

/* ============================== barra fixa (celular) ============================== */
(() => {
  const barra = $('#barraFixa');
  if (!barra || !heroi || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => {
    const mostrar = !e.isIntersecting;
    barra.classList.toggle('visivel', mostrar);
    barra.setAttribute('aria-hidden', String(!mostrar));
    $$('a', barra).forEach((a) => (mostrar ? a.removeAttribute('tabindex') : a.setAttribute('tabindex', '-1')));
  }, { threshold: 0.05 }).observe(heroi);
})();

/* ============================== entradas ao rolar ============================== */
(() => {
  const secoes = $$('main section').filter((s) => s.querySelector('[data-entra], .barra, .fio-preco'));
  if (!('IntersectionObserver' in window) || semMovimento()) { secoes.forEach((s) => s.classList.add('visto')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visto'); io.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  secoes.forEach((s) => {
    const r = s.getBoundingClientRect();
    if (r.top < innerHeight * 0.9) { s.classList.add('visto'); return; } // já na tela: nunca esconde
    s.classList.add('revelar'); io.observe(s);
  });
  // nunca deixar nada escondido: se o observador falhar (aba em segundo plano, impressão), revela tudo
  setTimeout(() => secoes.forEach((s) => s.classList.add('visto')), 9000);
  window.addEventListener('beforeprint', () => secoes.forEach((s) => s.classList.add('visto')));
})();

/* ============================== prévia "nome da sua escola" ============================== */
(() => {
  const campo = $('#nomeEscola'); const slug = $('#celSlug'); const nome = $('#celNome');
  if (!campo) return;
  campo.addEventListener('input', () => {
    const t = campo.value.replace(/\s+/g, ' ').trim().slice(0, 40);
    slug.textContent = slugDe(t) || 'suaescola';
    nome.textContent = t || 'Sua escola aqui';
    clearTimeout(campo._t); campo._t = setTimeout(() => { const av = $('#previaAviso'); if (av) av.textContent = `Prévia: ${nome.textContent}, atletapay.com.br/${slug.textContent}`; }, 600);
  });
})();

/* ============================== simulador ============================== */
(() => {
  const a = $('#simAlunos'); const m = $('#simMens');
  if (!a || !m) return;
  const atualizar = () => {
    const alunos = Number(a.value) || 0; const mens = Number(m.value) || 0;
    const entra = alunos * mens; const plano = valorDoMes(alunos);
    $('#outAlunos').textContent = String(alunos);
    $('#outMens').textContent = brl(mens);
    $('#outEntra').textContent = brl(entra);
    $('#outPlano').textContent = brl(plano);
    m.setAttribute('aria-valuetext', brl(mens)); a.setAttribute('aria-valuetext', `${alunos} alunos`);
    $('#outPeso').textContent = `O plano (${brl(plano)}) é ${(plano / Math.max(1, entra) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% dos ${brl(entra)} que entram em mensalidades.`;
  };
  a.addEventListener('input', atualizar); m.addEventListener('input', atualizar);
  atualizar();
})();

/* ============================== campeonato (roda uma vez ao aparecer) ============================== */
(() => {
  const chave = $('#chave'); if (!chave) return;
  const L = (k) => chave.querySelector(`[data-l="${k}"]`);
  const s1 = $('#semi1'); const s2 = $('#semi2'); const podio = $('#podio'); const de = $('#reprisar');
  let timers = [];
  const zerar = () => { timers.forEach(clearTimeout); timers = []; $$('.luta', chave).forEach((l) => l.classList.remove('vence', 'perde')); s1.textContent = 'aguardando…'; s2.textContent = 'aguardando…'; podio.textContent = 'Final às 11h40'; de.hidden = true; };
  const passos = [
    () => { L('a').classList.add('vence'); L('b').classList.add('perde'); s1.innerHTML = 'Furacão <b>3</b>'; },
    () => { L('d').classList.add('vence'); L('c').classList.add('perde'); s2.innerHTML = 'Trovão <b>2</b>'; },
    () => { s1.classList.add('vence'); s2.classList.add('perde'); podio.textContent = 'Furacão · ouro e brasão'; de.hidden = false; },
  ];
  const rodar = () => { zerar(); if (semMovimento()) { passos.forEach((f) => f()); return; } passos.forEach((f, i) => timers.push(setTimeout(f, 700 + i * 900))); };
  de.addEventListener('click', () => { s1.classList.remove('vence', 'perde'); s2.classList.remove('vence', 'perde'); rodar(); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { rodar(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(chave);
  } else rodar();
})();

/* ============================== artes: dados do próprio app ============================== */
const CORES_ARTE = { capoeira: '#0E9F6E', jiujitsu: '#1E4FD8', judo: '#0F7490', karate: '#E5484D', taekwondo: '#D98E04', muaythai: '#C62828', boxe: '#8E44AD', kickboxing: '#F57C00', mma: '#389E92', kungfu: '#B7472A', kravmaga: '#6B7C93', wrestling: '#2F6FED' };
const NOMES_CURTOS = { wrestling: 'Wrestling' };
const plural = (p) => ({ 'cordão': 'cordões', 'nível': 'níveis', 'graduação': 'graduações', prajied: 'prajieds' }[p] || `${p}s`);
const ehFem = (p) => ['faixa', 'corda', 'graduação'].includes(p);
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

async function carregarApp() {
  const [mod, esc, fx, br, loja, tpls, v3] = await Promise.all([
    import('/app/js/modalidades.js'), import('/app/js/escola.js'), import('/app/js/faixas.js'), import('/app/js/brasoes.js'),
    import('/app/js/site-loja.js'), import('/app/js/site-templates.js'), import('./site-v3.js?v=20261017'),
  ]);
  return { mod, esc, fx, br, loja, tpls, v3 };
}

new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(r, { timeout: 1500 }) : setTimeout(r, 300))).then(carregarApp).then(({ mod, esc, fx, br, loja, tpls, v3 }) => {
  const estado = { arte: 'jiujitsu', escolhida: false, infantil: false, idx: 1, graus: 0, vermelhos: 0 };
  const escadaDe = (arte) => (arte === 'capoeira' ? esc.ESCADA_CAPOEIRA : mod.escadaPadrao(arte));
  const termos = (arte) => {
    const t = mod.termosDa(arte);
    const peca = arte === 'capoeira' ? 'cordão' : t.peca;
    return { ...t, peca, arte: NOMES_CURTOS[arte] || t.arte };
  };

  /* ---------- textos que mudam com a arte ---------- */
  function aplicarTextos() {
    const t = termos(estado.arte);
    $$('[data-t="arte"]').forEach((e) => { e.textContent = t.arte; });
    $$('[data-t="peca"]').forEach((e) => { e.textContent = t.peca; });
    $$('[data-t="PecaMai"]').forEach((e) => { e.textContent = maiuscula(t.peca); });
    if (estado.escolhida) $$('[data-t="saudacao"]').forEach((e) => { e.textContent = t.saudacao; });
    document.documentElement.style.setProperty('--arte', CORES_ARTE[estado.arte] || '#1E4FD8');
    const trav = $('.marca .travessao'); if (trav && estado.escolhida) trav.setAttribute('stroke', CORES_ARTE[estado.arte] || '#389E92');
    // carteirinha do celular: 2ª graduação da escada (a 1ª costuma ser a branca/iniciante)
    const e = escadaDe(estado.arte); const g = e.adulto[Math.min(estado.arte === 'capoeira' ? 3 : 1, e.adulto.length - 1)];
    $('#celGrad').textContent = g.nome;
    $('#celFaixa').innerHTML = fx.faixaSVG(g, { largura: 280, altura: 16 });
  }

  /* ---------- graduação interativa ---------- */
  const elNome = $('#gradNome'); const elGraus = $('#gradGraus'); const elFaixa = $('#gradFaixa'); const elAviso = $('#gradAviso');
  const btAdulto = $('#verAdulto'); const btInfantil = $('#verInfantil');
  const listaAtual = () => { const e = escadaDe(estado.arte); return estado.infantil && e.kids && e.kids.length ? e.kids : e.adulto; };
  function desenharFaixa(animar = false) {
    const lista = listaAtual();
    estado.idx = Math.min(estado.idx, lista.length - 1);
    const g = lista[estado.idx]; const max = Number(g.graus) || 0;
    const t = termos(estado.arte);
    elNome.textContent = g.nome;
    elGraus.textContent = max
      ? `${estado.graus} de ${max} grau${max > 1 ? 's' : ''}${estado.vermelhos ? ` + ${estado.vermelhos} vermelho${estado.vermelhos > 1 ? 's' : ''}` : ''}`
      : 'Sem graus';
    elFaixa.innerHTML = fx.faixaSVG(g, { graus: estado.graus, vagas: max || null, largura: 900, altura: 64, grausVermelhos: estado.vermelhos });
    const svg = elFaixa.querySelector('svg'); if (svg) { svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('aria-hidden', 'true'); }
    elFaixa.setAttribute('aria-label', `${maiuscula(t.peca)} ${g.nome}${max ? `, ${estado.graus} grau${estado.graus === 1 ? '' : 's'}` : ''}`);
    if (animar && !semMovimento()) { elFaixa.classList.remove('troca'); void elFaixa.offsetWidth; elFaixa.classList.add('troca'); }
    const temKids = !!(escadaDe(estado.arte).kids && escadaDe(estado.arte).kids.length);
    btInfantil.setAttribute('aria-disabled', String(!temKids));
    btAdulto.setAttribute('aria-pressed', String(!estado.infantil));
    btInfantil.setAttribute('aria-pressed', String(estado.infantil));
    if (v3) v3.escada();
  }
  $('#addGrau').addEventListener('click', () => {
    const g = listaAtual()[estado.idx]; const max = Number(g.graus) || 0; const t = termos(estado.arte);
    elAviso.textContent = '';
    const art = ehFem(t.peca) ? 'a' : 'o';
    if (!max) { elAviso.textContent = `${ehFem(t.peca) ? 'Nesta' : 'Neste'} ${t.peca} não há graus: o próximo passo é "Trocar ${t.peca}".`; return; }
    if (estado.graus < max) { estado.graus += 1; }
    else if (estado.infantil && estado.arte === 'jiujitsu' && estado.vermelhos < max) { estado.vermelhos += 1; elAviso.textContent = 'Grau vermelho por cima do branco, da ponta para cima.'; }
    else { elAviso.textContent = `Máximo de graus. Troque ${art} ${t.peca}.`; }
    desenharFaixa();
  });
  $('#trocarFaixa').addEventListener('click', () => {
    const lista = listaAtual();
    estado.idx = (estado.idx + 1) % lista.length; estado.graus = 0; estado.vermelhos = 0; elAviso.textContent = '';
    desenharFaixa(true);
  });
  btAdulto.addEventListener('click', () => { estado.infantil = false; estado.idx = 1; estado.graus = 0; estado.vermelhos = 0; elAviso.textContent = ''; desenharFaixa(true); });
  btInfantil.addEventListener('click', () => {
    const e = escadaDe(estado.arte);
    if (!(e.kids && e.kids.length)) { elAviso.textContent = `${termos(estado.arte).arte} usa a mesma escada em todas as idades.`; return; }
    estado.infantil = true; estado.idx = 1; estado.graus = 0; estado.vermelhos = 0; elAviso.textContent = ''; desenharFaixa(true);
  });

  /* ---------- brasões reais: abertos + trancados (com a regra de como se ganha) ---------- */
  const caixa = $('#brasoes');
  const ABERTOS = ['primeira-presenca', 'dez-presencas', 'duas-semanas'];
  const TRANCADOS_GERAIS = ['cinquenta-presencas', 'oito-semanas'];
  function desenharBrasoes() {
    const porId = (id) => br.porId(id);
    const exclusivos = estado.arte === 'capoeira'
      ? ['batizado', 'roda-aberta', 'tocou-berimbau-na-roda'].map(porId).filter(Boolean)
      : br.BRASOES.filter((b) => br.escopoDe(b) === estado.arte).slice(0, 3);
    const itens = [
      ...ABERTOS.map(porId).filter(Boolean).map((b) => ({ b, aberto: true })),
      ...TRANCADOS_GERAIS.map(porId).filter(Boolean).map((b) => ({ b, aberto: false })),
      ...exclusivos.map((b) => ({ b, aberto: false, exclusivo: true })),
    ];
    caixa.innerHTML = '';
    let nEx = 0;
    itens.forEach(({ b, aberto, exclusivo }) => {
      const rotuloFechado = exclusivo ? `Exclusivo de ${termos(estado.arte).arte} ${(nEx += 1)}` : `Brasão secreto ${b.n}`;
      const el = document.createElement(aberto ? 'div' : 'button');
      el.className = `brasao-item${aberto ? '' : ' trancado'}`;
      if (!aberto) { el.type = 'button'; el.setAttribute('aria-pressed', 'false'); }
      const img = document.createElement('img');
      img.className = 'brasao'; img.loading = 'lazy'; img.decoding = 'async'; img.width = 92; img.height = 92; img.alt = '';
      img.src = `/app/${br.urlThumb(b)}`;
      const nome = document.createElement('span'); nome.textContent = aberto ? b.nome : rotuloFechado;
      el.append(img, nome);
      if (!aberto) {
        const dica = document.createElement('span'); dica.className = 'dica'; dica.textContent = 'Como se ganha?';
        el.append(dica);
        const revelar = (sim) => {
          el.classList.toggle('revelado', sim); el.setAttribute('aria-pressed', String(sim));
          nome.textContent = sim ? b.nome : rotuloFechado;
          dica.textContent = sim ? (b.como || 'Conquista automática') : 'Como se ganha?';
          if (sim) { const av = $('#brasaoDica'); if (av) av.textContent = `${b.nome}: ${b.como || 'conquista automática'}`; }
        };
        let viaMouse = false;
        el.addEventListener('click', () => { if (viaMouse) { viaMouse = false; revelar(true); return; } revelar(!el.classList.contains('revelado')); });
        el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { viaMouse = true; revelar(true); } });
        el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { viaMouse = false; revelar(false); } });
      }
      caixa.append(el);
    });
    const resto = document.createElement('div');
    resto.className = 'brasao-item trancado';
    resto.innerHTML = `<span class="brasao trancado" aria-hidden="true">+${Math.max(0, br.brasoesParaArte(estado.arte).length - itens.length)}</span><span>para descobrir</span>`;
    caixa.append(resto);
  }

  /* ---------- "Qual é a sua arte?" ---------- */
  const chips = $$('#chipsArte .chip');
  const frase = $('#fraseArte');
  function escolher(arte) {
    const mudar = () => {
      estado.arte = arte; estado.escolhida = true; estado.infantil = false; estado.idx = 1; estado.graus = 0; estado.vermelhos = 0;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.arte === arte)));
      const t = termos(arte);
      frase.innerHTML = '';
      const b = document.createElement('b'); b.textContent = `${t.saudacao}!`;
      frase.append(b, document.createTextNode(` Pronto: a página agora fala ${t.arte === 'MMA' ? 'MMA' : t.arte.toLowerCase()} — ${plural(t.peca)}, ${t.local}, ${t.luta}. Role e veja a sua escola.`));
      elAviso.textContent = '';
      aplicarTextos(); desenharFaixa(true); desenharBrasoes(); v3.arte();
      gravarLocal('ap.arte', arte);
      const marca = $('.marca'); if (marca) { marca.classList.add('acende'); setTimeout(() => marca.classList.remove('acende'), 900); }
    };
    if (document.startViewTransition && !semMovimento() && !(navigator.deviceMemory && navigator.deviceMemory < 4)) document.startViewTransition(mudar); else mudar();
  }
  chips.forEach((c) => c.addEventListener('click', () => escolher(c.dataset.arte)));

  aplicarTextos(); desenharFaixa(); desenharBrasoes();
  try { v3.init({ mod, esc, fx, br, loja, tpls, estado, termos, escadaDe, listaAtual, desenharFaixa }); } catch (e) { console.warn('AtletaPay: site-v3', e); }
  const lembrada = lerLocal('ap.arte');
  if (lembrada && CORES_ARTE[lembrada]) escolher(lembrada);
}).catch((e) => {
  // Sem o app (ex.: abriu o arquivo solto): o site continua com os textos padrão.
  console.warn('AtletaPay: dados das artes indisponíveis', e);
  const frase = $('#fraseArte'); if (frase) frase.textContent = 'Capoeira, jiu-jitsu, judô, karatê, taekwondo, muay thai, boxe, kickboxing, MMA, kung fu, krav maga e wrestling — cada uma com a sua escada.';
  $$('#chipsArte .chip').forEach((c) => c.addEventListener('click', () => $$('#chipsArte .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c)))));
});
