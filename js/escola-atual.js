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
import { ESCOLA } from './escola.js';

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

// Só o endereço (sem banco e sem login). null = o endereço não diz.
export function escolaIdDoEndereco(url = location) {
  try {
    const q = new URLSearchParams(url.search).get('escola');
    if (q && SLUG.test(q)) return q;
  } catch (e) { /* ok */ }
  const h = host();
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
}
