/* escola-atual.js — em que escola o app está agora (multi-escola / AtletaPay).

Ordem de decisão (a primeira que responder vence):
  1. Login: a escola gravada pelo servidor no próprio login (custom claim
     `escolaId`). Quem está logado sempre vê a PRÓPRIA escola, venha de onde vier.
  2. Endereço: ?escola=<slug>, atletapay.com.br/<slug>/..., ou um domínio próprio
     (liberdadeeexpressao.com.br, ou o que estiver em dominios/{host}).
  3. Padrão: a escola nº 1 (Liberdade), como sempre foi.

A identidade vem de escolasPublicas/{id} (o servidor publica só o que é
público, só de escola ATIVA) mesclada sobre os padrões de js/escola.js — a
Liberdade continua idêntica mesmo antes do cartão existir. Nada aqui libera
acesso a dado: quem isola as escolas são as regras do banco. */
import { db, doc, getDoc, auth } from './firebase.js';
import { ESCOLA, aplicarEscola } from './escola.js';
import { MODALIDADES } from './modalidades.js';

// Textos da escola nº 1 como estão no HTML/JS (capturados ANTES de qualquer troca).
const ORIGINAL = { nome: ESCOLA.nome, nomeCurto: ESCOLA.nomeCurto, nomeRede: ESCOLA.nomeRede, mestre: ESCOLA.mestre };

export const ESCOLA_PADRAO = 'liberdade';
const SLUG = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
// Endereços que já sabemos de cor (sem consultar o banco).
const HOSTS = {
  'liberdadeeexpressao.com.br': ESCOLA_PADRAO,
  'capoeira-liberdade.web.app': ESCOLA_PADRAO,
  'capoeira-liberdade.firebaseapp.com': ESCOLA_PADRAO,
  'natanaelinvotec.github.io': ESCOLA_PADRAO,
};
// Hosts da plataforma: a escola vem do 1º pedaço do caminho (atletapay.com.br/<slug>/...).
const HOSTS_PLATAFORMA = ['atletapay.com.br', 'atletapay.web.app', 'atletapay.firebaseapp.com'];
// Pedaços de caminho que são páginas da plataforma, não escolas (mesma ideia de RESERVADOS).
const ROTAS = new Set(['cadastro', 'painel', 'privacidade', 'termos', 'index', 'css', 'js', 'img', 'assets', 'fotos', 'global', 'rede', 'escolas', 'inscricao', 'entrar', 'sair', 'login', 'admin', 'app', 'master']);

const host = () => String(location.hostname || '').toLowerCase().replace(/^www\./, '');
// Endereços do APP compartilhados por todas as escolas (não são "o site" de nenhuma):
// sem ?escola, a tela de entrar lembra a última escola usada neste aparelho.
const HOSTS_APP = ['capoeira-liberdade.web.app', 'capoeira-liberdade.firebaseapp.com', 'natanaelinvotec.github.io'];
const CHAVE_ULTIMA = 'le.ultimaEscola';
const ultimaEscola = () => { try { const v = localStorage.getItem(CHAVE_ULTIMA); return v && SLUG.test(v) ? v : null; } catch (e) { return null; } };
const lembrarEscola = (id) => { try { if (id && SLUG.test(id)) localStorage.setItem(CHAVE_ULTIMA, id); } catch (e) { /* ok */ } };

// Só o endereço (sem banco e sem login). null = o endereço não diz.
// usarUltima: na tela de entrar, lembra a última escola deste aparelho; na INSCRIÇÃO não
// (aparelho compartilhado não pode matricular ninguém na escola errada).
export function escolaIdDoEndereco(url = location, { usarUltima = true } = {}) {
  try {
    const q = new URLSearchParams(url.search).get('escola');
    if (q && SLUG.test(q)) return q;
  } catch (e) { /* ok */ }
  const h = host();
  if (usarUltima && HOSTS_APP.includes(h)) { const u = ultimaEscola(); if (u) return u; }
  if (HOSTS[h]) return HOSTS[h];
  if (HOSTS_PLATAFORMA.includes(h)) {
    const primeiro = String(url.pathname || '').split('/').filter(Boolean)[0] || '';
    if (SLUG.test(primeiro) && !ROTAS.has(primeiro)) return primeiro;
  }
  return null;
}

async function escolaIdDoDominio() {
  const h = host();
  if (!h || HOSTS[h] || HOSTS_PLATAFORMA.includes(h) || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h)) return null;
  try { const s = await getDoc(doc(db, 'dominios', h)); return s.exists() ? s.data().escolaId || null : null; } catch (e) { return null; }
}

async function escolaIdDoLogin() {
  const u = auth.currentUser;
  if (!u) return null;
  try { const t = await u.getIdTokenResult(); return typeof t.claims.escolaId === 'string' ? t.claims.escolaId : null; } catch (e) { return null; }
}

// A escola em que o app deve abrir agora.
export async function resolverEscolaId() {
  return (await escolaIdDoLogin()) || escolaIdDoEndereco() || (await escolaIdDoDominio()) || ESCOLA_PADRAO;
}

// Padrões neutros para escola que não é a Liberdade (marca AtletaPay até ela subir a própria).
const NEUTRO = {
  nomeRede: 'Rede da escola',
  fraseCelebracao: 'Parabéns!',
  frasePublicado: 'Publicado!',
  logo: 'assets/app-icon-192.png',
  logoPequeno: 'assets/app-icon-192.png',
  cores: { teal: '#389E92', navy: '#002D72', verde: '#00E676', fundo: '#EAF2F1' },
};

const CHAVE = (id) => `le.escola.${id}`;
const VALIDADE_MS = 10 * 60 * 1000;
const naMemoria = new Map();

// Identidade completa da escola `id` (ou da atual). Nunca falha: sem rede ou
// sem cartão publicado, devolve os padrões (Liberdade = js/escola.js).
export async function carregarEscola(id) {
  const alvo = id || (await resolverEscolaId());
  if (naMemoria.has(alvo)) return naMemoria.get(alvo);
  let pub = null;
  try {
    const c = JSON.parse(sessionStorage.getItem(CHAVE(alvo)) || 'null');
    if (c && Date.now() - c.em < VALIDADE_MS) pub = c.pub;
  } catch (e) { /* sem cache */ }
  if (!pub) {
    try {
      const s = await getDoc(doc(db, 'escolasPublicas', alvo));
      pub = s.exists() ? s.data() : null;
      try { sessionStorage.setItem(CHAVE(alvo), JSON.stringify({ em: Date.now(), pub })); } catch (e) { /* ok */ }
    } catch (e) { pub = null; }
  }
  const base = alvo === ESCOLA_PADRAO ? ESCOLA : { ...ESCOLA, ...NEUTRO, nome: '', nomeCurto: '', mestre: '', rotuloLinhagem: '' };
  const cfg = {
    ...base,
    ...(pub ? Object.fromEntries(Object.entries(pub).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))) : {}),
    id: alvo,
    ativa: alvo === ESCOLA_PADRAO || !!pub,
    cores: { ...base.cores, ...((pub && pub.cores) || {}) },
    logo: (pub && pub.logo) || base.logo,
    logoPequeno: (pub && pub.logo) || base.logoPequeno,
  };
  naMemoria.set(alvo, cfg);
  return cfg;
}

// Palavras que mudam de uma arte marcial para outra ("cordão"/"faixa", "Mestre"/"Professor").
export function termosDe(cfg = {}) {
  const peca = String(cfg.pecaGraduacao || (cfg.modalidade === 'capoeira' || !cfg.modalidade ? 'cordão' : 'faixa')).toLowerCase();
  const plural = peca.endsWith('ão') ? `${peca.slice(0, -2)}ões` : `${peca}s`;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  return {
    graduacao: peca, graduacoes: plural, Graduacao: cap(peca), Graduacoes: cap(plural),
    lider: cfg.lider || (cfg.modalidade === 'capoeira' || !cfg.modalidade ? 'Mestre' : 'Professor'),
    trocaDeGraduacao: `troca de ${peca}`,
  };
}

// Aplica as cores da escola nas variáveis CSS da página (quando a tela quiser).
export function aplicarCores(cfg, raiz = document.documentElement) {
  const c = (cfg && cfg.cores) || {};
  const mapa = { teal: '--primary-teal', navy: '--primary-blue', verde: '--accent-green', fundo: '--bg-app' };
  Object.entries(mapa).forEach(([k, v]) => { if (/^#[0-9a-f]{6}$/i.test(String(c[k] || ''))) raiz.style.setProperty(v, c[k]); });
  // Botão principal das telas sem login (Entrar): cor da escola, não o verde da escola nº 1.
  // Variável própria para não pintar com a cor da marca os avisos de "deu certo" (--green).
  if (/^#[0-9a-f]{6}$/i.test(String(c.teal || ''))) {
    raiz.style.setProperty('--btn-principal', c.teal);
    raiz.style.setProperty('--btn-sombra', `${c.teal}cc`);
  }
}

// ===== Preparar a página para a escola atual (multi-escola) =====
// Chamada pelo observarSessao (js/firebase.js) antes de cada tela desenhar, e pelas telas
// sem login (entrar, inscrição). Escola nº 1: nada muda (zero leituras a mais).
// Outra escola: troca nome, logo, cores, termos e a escada (aplicarEscola) — uma vez por página.
let preparo = null;
export function prepararEscola() {
  if (!preparo) {
    preparo = (async () => {
      const id = await resolverEscolaId();
      lembrarEscola(id);
      if (id === ESCOLA_PADRAO) return { id, aplicada: false };
      const cfg = await carregarEscola(id);
      if (!cfg.ativa) return { id, aplicada: false };
      aplicarEscola(cfg);
      if (typeof document !== 'undefined') aplicarIdentidade(cfg);
      return { ...cfg, aplicada: true };
    })().catch((e) => { console.warn('escola atual', e); return { id: ESCOLA_PADRAO, aplicada: false }; });
  }
  return preparo;
}

const re = (palavra, flags = 'gu') => new RegExp(`(?<![\\p{L}\\p{N}])${palavra}(?![\\p{L}\\p{N}])`, flags);
const escRe = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
function plural(p) { return p.endsWith('ão') ? `${p.slice(0, -2)}ões` : p.endsWith('l') ? `${p.slice(0, -1)}is` : `${p}s`; }

// Trocas de texto da escola nº 1 → escola atual (nomes sempre; termos da capoeira só
// quando a arte é outra). Ordem importa: do texto mais longo para o mais curto.
export function trocasDeTexto(cfg) {
  const nome = cfg.nome || cfg.nomeCurto || 'Escola'; const curto = cfg.nomeCurto || nome;
  const mod = MODALIDADES[cfg.modalidade] || MODALIDADES.outra;
  const peca = String((cfg.escada && cfg.escada.peca) || cfg.pecaGraduacao || mod.peca || 'graduação').toLowerCase();
  const lider = (cfg.responsavel && cfg.responsavel.nome) || curto;
  const t = [
    [/Grupo de Capoeira Liberdade e Expressão/g, nome], [new RegExp(escRe(ORIGINAL.nome), 'g'), nome],
    [/Liberdade e Expressão/g, curto], [new RegExp(escRe(ORIGINAL.nomeRede), 'g'), `Rede ${curto}`], [/Capoeira Liberdade/g, curto],
    [new RegExp(escRe(ORIGINAL.mestre), 'g'), lider],
  ];
  if ((cfg.modalidade || 'capoeira') !== 'capoeira') {
    const arte = mod.nome; const uniforme = ['jiujitsu', 'judo'].includes(cfg.modalidade) ? 'kimono' : 'uniforme';
    t.push(
      [re('Troca de cordão'), `Troca de ${peca}`], [re('troca de cordão'), `troca de ${peca}`],
      [re('cordões'), plural(peca)], [re('Cordões'), cap(plural(peca))], [re('cordão'), peca], [re('Cordão'), cap(peca)],
      [re('cordoada'), 'graduação'], [/Corda:/g, `${cap(peca)}:`], [re('capoeiristas'), 'atletas'], [re('capoeirista'), 'atleta'],
      [re('batizados'), 'graduações'], [re('Batizados'), 'Graduações'], [re('batizado'), 'graduação'], [re('Batizado'), 'Graduação'],
      [re('abadás'), `${uniforme}s`], [re('abadá'), uniforme], [re('Abadá'), cap(uniforme)],
      [re('capoeira'), arte.toLowerCase()], [re('Capoeira'), arte], [re('CAPOEIRA'), arte.toUpperCase()],
    );
  }
  return t;
}
const PULAR = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SVG']);
function trocarTexto(v, trocas) { let r = v; for (const [rx, por] of trocas) r = r.replace(rx, por); return r; }

// Monograma (quando a escola ainda não tem logo): iniciais sobre a cor da escola.
function monograma(cfg) {
  const ini = String(cfg.nomeCurto || cfg.nome || 'E').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const cor = (cfg.cores && cfg.cores.navy) || '#1E2A78';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${cor}"/><text x="48" y="61" text-anchor="middle" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="#fff">${ini.replace(/[<&>]/g, '')}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Aplica a identidade na página: título, logos, ícone, cor do navegador, cores do tema
// e textos — inclusive o que as telas desenharem depois (MutationObserver).
export function aplicarIdentidade(cfg) {
  const trocas = trocasDeTexto(cfg);
  const logo = /^https:\/\//.test(cfg.logo || '') ? cfg.logo : monograma(cfg);
  const tratarEl = (el) => {
    if (el.tagName === 'IMG' && /logo-liberdade|app-icon|brasao-1024/.test(el.getAttribute('src') || '')) { el.src = logo; el.alt = `Logo ${cfg.nomeCurto || cfg.nome}`; }
    ['placeholder', 'title', 'aria-label', 'alt'].forEach((a) => { const v = el.getAttribute && el.getAttribute(a); if (v) { const n = trocarTexto(v, trocas); if (n !== v) el.setAttribute(a, n); } });
  };
  const tratar = (raiz) => {
    if (!raiz) return;
    if (raiz.nodeType === 3) { const p = raiz.parentElement; if (p && !PULAR.has(p.tagName) && !p.isContentEditable) { const n = trocarTexto(raiz.nodeValue, trocas); if (n !== raiz.nodeValue) raiz.nodeValue = n; } return; }
    if (raiz.nodeType !== 1 || PULAR.has(raiz.tagName) || raiz.isContentEditable) return;
    tratarEl(raiz);
    raiz.querySelectorAll('img,[placeholder],[title],[aria-label]').forEach(tratarEl);
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    const nos = []; while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(tratar);
  };
  document.title = trocarTexto(document.title, trocas);
  document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach((l) => { l.href = logo; });
  const tema = (cfg.cores && cfg.cores.navy) || null;
  if (tema) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', tema));
  aplicarCores(cfg);
  document.documentElement.dataset.escola = cfg.id;
  const comecar = () => {
    tratar(document.body);
    let fila = []; let agendado = false;
    new MutationObserver((ms) => {
      ms.forEach((m) => { if (m.type === 'characterData' || m.type === 'attributes') fila.push(m.target); else m.addedNodes.forEach((n) => fila.push(n)); });
      if (agendado) return; agendado = true;
      requestAnimationFrame(() => { const lote = fila; fila = []; agendado = false; lote.forEach(tratar); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'placeholder', 'title', 'aria-label'] });
  };
  if (document.body) comecar(); else document.addEventListener('DOMContentLoaded', comecar, { once: true });
}
