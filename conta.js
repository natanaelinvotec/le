/* conta.js — "minha conta" compartilhada por todas as telas (painel, app do
aluno e Rede Liberdade):

1) Trocar senha (a própria pessoa): pede a senha atual, reautentica no Firebase
   Authentication e grava a nova. Se esqueceu a atual, envia o link oficial.
2) Minha conta (painel): celular de contato + atalhos de senha e apresentação.
3) Apresentação em vídeo por PESSOA (Instrutor, Professor, Mestre, Fundador):
   dados em apresentacoes/{uid}; vídeo no Storage em apresentacoes/{uid}/.
   Quem edita: a própria pessoa, o Admin Master, o Fundador e o responsável do
   núcleo onde ela treina (as regras do Firestore/Storage conferem de novo).
4) Abertura automática ao entrar na plataforma (uma vez por login/sessão).

Nada aqui inventa dado: sem vídeo, sem botão; sem celular, campo vazio. */
import {
  db, storage, doc, getDoc, setDoc, deleteDoc, atualizar,
  storageRef, uploadBytes, getDownloadURL, deleteObject,
  trocarSenha, recuperarSenha, emailDaSessao, SENHA_PADRAO,
} from './firebase.js';
import { abrirApresentacao, temApresentacao, podeTerApresentacao, podeAbrirSozinho, textoCargo } from './apresentacao.js';

export { podeTerApresentacao, temApresentacao };

/* ---------------------------------------------------------------- estilo */
const CSS = `
.cta-fundo{position:fixed;inset:0;z-index:99990;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,20,50,.46);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);animation:ctaFundo .25s ease both;font-family:'Manrope',system-ui,sans-serif}
@media (min-width:640px){.cta-fundo{align-items:center;padding:18px}}
.cta-caixa [hidden]{display:none!important}
.cta-caixa{position:relative;width:100%;max-width:460px;max-height:92vh;overflow-y:auto;background:#fff;color:#0D211D;border-radius:26px 26px 0 0;padding:20px 18px 24px;box-shadow:0 -20px 60px -20px rgba(0,45,114,.45);animation:ctaSobe .38s cubic-bezier(0.16,1,0.3,1) both}
@media (min-width:640px){.cta-caixa{border-radius:24px}}
.cta-caixa::before{content:'';position:absolute;inset:0 0 auto 0;height:120px;border-radius:inherit;pointer-events:none;background:radial-gradient(60% 90% at 15% 0%,rgba(61,139,255,.16),transparent 70%),radial-gradient(50% 80% at 95% 0%,rgba(0,230,118,.12),transparent 70%)}
.cta-topo{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.cta-topo small{display:block;font-size:.66rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#1B5FC2}
.cta-topo h3{margin:2px 0 0;font-family:'Sora',system-ui,sans-serif;font-size:1.12rem;color:#002D72;line-height:1.2}
.cta-x{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid #E3EAF2;background:#fff;color:#5A6B72;cursor:pointer;font-size:1rem;line-height:1}
.cta-form{position:relative;display:flex;flex-direction:column;gap:11px}
.cta-form label{display:flex;flex-direction:column;gap:6px;font-size:.8rem;font-weight:700;color:#23343A}
.cta-form input[type=password],.cta-form input[type=text],.cta-form input[type=tel],.cta-form input[type=number],.cta-form input[type=email]{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #D5DEE8;border-radius:12px;font:500 .92rem 'Manrope',system-ui,sans-serif;color:#0D211D;background:#fff;transition:border-color .2s,box-shadow .2s}
.cta-form input:focus{outline:none;border-color:#3D8BFF;box-shadow:0 0 0 3px rgba(61,139,255,.18)}
.cta-form input[readonly]{background:#F3F7FB;color:#5A6B72}
.cta-ver{flex-direction:row!important;align-items:center;font-weight:600!important;color:#5A6B72!important}
.cta-regras{list-style:none;margin:0;padding:10px 12px;border-radius:12px;background:#F3F7FB;display:grid;gap:5px;font-size:.74rem;color:#5A6B72}
.cta-regras li{display:flex;gap:8px;align-items:center}
.cta-regras li::before{content:'';width:8px;height:8px;border-radius:50%;background:#C8D3DE;flex:none;transition:background .25s}
.cta-regras li.ok{color:#0B6B3A}.cta-regras li.ok::before{background:#00C46A}
.cta-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:13px 16px;font:800 .9rem 'Manrope',system-ui,sans-serif;cursor:pointer;transition:transform .25s cubic-bezier(0.16,1,0.3,1),box-shadow .25s,opacity .2s}
.cta-btn:active{transform:scale(.98)}
.cta-btn[disabled]{opacity:.55;cursor:progress}
.cta-btn:focus-visible,.cta-x:focus-visible,.cta-link:focus-visible{outline:2px solid #3D8BFF;outline-offset:2px}
.cta-primario{background:#002D72;color:#fff;box-shadow:0 12px 24px -14px rgba(0,45,114,.8)}
.cta-claro{background:#fff;color:#002D72;border:1px solid #D5DEE8}
.cta-ceu{background:#EAF2FF;color:#1B5FC2}
.cta-perigo{background:#fff;color:#C62828;border:1px solid #F3C6C6}
.cta-link{background:none;border:0;padding:4px 0;color:#1B5FC2;font:700 .78rem 'Manrope',system-ui,sans-serif;cursor:pointer;text-align:left;text-decoration:underline;text-underline-offset:3px}
.cta-msg{min-height:18px;font-size:.8rem;font-weight:700}
.cta-msg.erro{color:#C62828}.cta-msg.ok{color:#0B6B3A}
.cta-lista{display:grid;gap:8px;margin-top:4px}
.cta-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid #E3EAF2;border-radius:16px;background:#fff;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .2s,transform .25s cubic-bezier(0.16,1,0.3,1)}
.cta-item:hover{border-color:#B9CFF0;transform:translateY(-1px)}
.cta-item i.ic{width:36px;height:36px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;background:#EAF2FF;color:#1B5FC2;flex:none}
.cta-item b{display:block;font-size:.88rem;color:#0D211D}.cta-item small{display:block;font-size:.72rem;color:#5A6B72;margin-top:2px}
.cta-apr-estado{position:relative;display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;background:#F3F7FB;margin-bottom:12px}
.cta-apr-estado .play{width:44px;height:44px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#F5C24A,#DAA520);color:#fff;border:0;cursor:pointer;box-shadow:0 8px 18px -8px rgba(218,165,32,.9)}
.cta-apr-estado .play[disabled]{background:#C8D3DE;box-shadow:none;cursor:default}
.cta-apr-estado b{display:block;font-size:.88rem}.cta-apr-estado small{display:block;font-size:.74rem;color:#5A6B72;margin-top:2px}
.cta-grade{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cta-dica{margin:10px 0 0;font-size:.72rem;color:#5A6B72;line-height:1.45}
.cta-sep{height:1px;background:#E3EAF2;margin:14px 0}
@keyframes ctaFundo{from{opacity:0}to{opacity:1}}
@keyframes ctaSobe{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){.cta-fundo,.cta-caixa{animation:none}}
`;
let cssPronto = false;
function css() { if (cssPronto) return; cssPronto = true; const st = document.createElement('style'); st.id = 'conta-css'; st.textContent = CSS; document.head.appendChild(st); }
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"'`=/]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' }[c]));

// Janela genérica (fecha com Esc, clique fora ou no X; devolve o foco).
function janela(html, { rotulo }) {
  css();
  const antesFoco = document.activeElement;
  const fundo = document.createElement('div');
  fundo.className = 'cta-fundo';
  fundo.innerHTML = `<div class="cta-caixa" role="dialog" aria-modal="true" aria-label="${esc(rotulo)}">${html}</div>`;
  document.body.appendChild(fundo);
  const caixa = fundo.firstElementChild;
  const fechar = () => { document.removeEventListener('keydown', tecla); fundo.remove(); if (antesFoco && antesFoco.focus) try { antesFoco.focus({ preventScroll: true }); } catch (e) { /* ok */ } };
  const tecla = (ev) => { if (ev.key !== 'Escape' || document.querySelector('.apr')) return; const todas = document.querySelectorAll('.cta-fundo'); if (todas[todas.length - 1] === fundo) fechar(); };
  document.addEventListener('keydown', tecla);
  fundo.addEventListener('mousedown', (ev) => { if (ev.target === fundo) fechar(); });
  caixa.querySelectorAll('[data-cta="fechar"]').forEach((b) => b.addEventListener('click', fechar));
  setTimeout(() => { const f = caixa.querySelector('input:not([readonly]),button.cta-primario'); if (f) f.focus({ preventScroll: true }); }, 60);
  return { caixa, fechar };
}
const topo = (sobre, titulo) => `<div class="cta-topo"><div><small>${esc(sobre)}</small><h3>${esc(titulo)}</h3></div><button type="button" class="cta-x" data-cta="fechar" aria-label="Fechar">✕</button></div>`;
function mensagem(caixa, texto, tipo) { const m = caixa.querySelector('.cta-msg'); if (!m) return; m.textContent = texto || ''; m.className = `cta-msg ${tipo || ''}`; }

/* ------------------------------------------------------------- celular */
// Aceita qualquer digitação e devolve "(67) 99129-3269" (10 ou 11 dígitos, DDD incluso).
export function formatarCelular(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('55') && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
export function celularValido(v) { const n = String(v || '').replace(/\D/g, '').length; return n === 0 || n === 10 || n === 11; }
export function celularDe(pessoa) { return (pessoa && (pessoa.celular || pessoa.telefone || pessoa.whatsapp)) || ''; }

/* --------------------------------------------------------- trocar senha */
// Política da nova senha. Devolve '' quando está tudo certo, ou o motivo.
export function validarNovaSenha(atual, nova, confirmacao) {
  const n = String(nova || '');
  if (n.length < 8) return 'A nova senha precisa ter pelo menos 8 caracteres.';
  if (!/[A-Za-zÀ-ÿ]/.test(n) || !/\d/.test(n)) return 'Use letras e números na nova senha.';
  if (n === atual) return 'A nova senha precisa ser diferente da atual.';
  if (n.toLowerCase() === String(SENHA_PADRAO).toLowerCase()) return 'Essa é a senha padrão do grupo — escolha uma só sua.';
  const usuarioEmail = (emailDaSessao().split('@')[0] || '').toLowerCase();
  if (usuarioEmail && usuarioEmail.length >= 4 && n.toLowerCase().includes(usuarioEmail)) return 'Não use o seu e-mail dentro da senha.';
  if (n !== confirmacao) return 'A confirmação não bate com a nova senha.';
  return '';
}
function erroSenha(e) {
  const c = String((e && e.code) || '');
  if (c.includes('wrong-password') || c.includes('invalid-credential') || c.includes('invalid-login')) return 'Senha atual incorreta.';
  if (c.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (c.includes('weak-password')) return 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.';
  if (c.includes('network')) return 'Sem internet no momento. Tente de novo.';
  if (c.includes('no-current-user') || c.includes('user-token-expired') || c.includes('requires-recent-login')) return 'Sua sessão expirou. Saia e entre de novo para trocar a senha.';
  return 'Não foi possível trocar a senha agora.';
}
const mascaraEmail = (e) => { const [u, d] = String(e || '').split('@'); if (!d) return e || ''; return `${u.slice(0, 2)}${'•'.repeat(Math.max(1, u.length - 2))}@${d}`; };

export function abrirTrocaSenha() {
  const email = emailDaSessao();
  const { caixa, fechar } = janela(`${topo('Segurança da conta', 'Trocar senha')}
<form class="cta-form" novalidate>
<label>Senha atual<input type="password" name="atual" autocomplete="current-password" required></label>
<label>Nova senha<input type="password" name="nova" autocomplete="new-password" minlength="8" required></label>
<label>Confirmar nova senha<input type="password" name="conf" autocomplete="new-password" minlength="8" required></label>
<label class="cta-ver"><input type="checkbox" name="ver"> Mostrar senhas</label>
<ul class="cta-regras" aria-label="Regras da nova senha"><li data-r="tam">Pelo menos 8 caracteres</li><li data-r="mix">Letras e números</li><li data-r="dif">Diferente da senha atual</li><li data-r="conf">Confirmação igual</li></ul>
<div class="cta-msg" role="status" aria-live="polite"></div>
<button type="submit" class="cta-btn cta-primario">Salvar nova senha</button>
${email ? `<button type="button" class="cta-link" data-cta="link">Não lembro a senha atual — enviar link para ${esc(mascaraEmail(email))}</button>` : ''}
</form>`, { rotulo: 'Trocar senha' });
  const f = caixa.querySelector('form');
  const regras = () => {
    const a = f.atual.value; const n = f.nova.value; const c = f.conf.value;
    const set = (r, ok) => caixa.querySelector(`[data-r="${r}"]`).classList.toggle('ok', ok);
    set('tam', n.length >= 8); set('mix', /[A-Za-zÀ-ÿ]/.test(n) && /\d/.test(n)); set('dif', !!n && n !== a); set('conf', !!n && n === c);
  };
  f.addEventListener('input', regras);
  f.ver.addEventListener('change', () => { ['atual', 'nova', 'conf'].forEach((k) => { f[k].type = f.ver.checked ? 'text' : 'password'; }); });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!f.atual.value) { mensagem(caixa, 'Digite a sua senha atual.', 'erro'); f.atual.focus(); return; }
    const problema = validarNovaSenha(f.atual.value, f.nova.value, f.conf.value);
    if (problema) { mensagem(caixa, problema, 'erro'); return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Salvando…';
    try {
      await trocarSenha(f.atual.value, f.nova.value);
      mensagem(caixa, 'Senha alterada. Use a nova senha no próximo login.', 'ok');
      f.reset(); regras();
      setTimeout(fechar, 1600);
    } catch (e) {
      console.error(e); mensagem(caixa, erroSenha(e), 'erro');
    } finally { btn.disabled = false; btn.textContent = 'Salvar nova senha'; }
  });
  const link = caixa.querySelector('[data-cta="link"]');
  if (link) link.addEventListener('click', async () => {
    try { await recuperarSenha(email); mensagem(caixa, `Link enviado para ${mascaraEmail(email)}. Confira também o spam.`, 'ok'); } catch (e) { console.error(e); mensagem(caixa, 'Não foi possível enviar o link agora.', 'erro'); }
  });
}

/* --------------------------------------------------- apresentação: dados */
const cache = new Map();
let autor = { uid: '', nome: '' };
export function definirAutor(a) { autor = { uid: (a && (a.uid || a.id)) || '', nome: (a && a.nome) || '' }; }

export async function apresentacaoDe(uid, { recarregar = false } = {}) {
  if (!uid) return null;
  if (!recarregar && cache.has(uid)) return cache.get(uid);
  let ap = null;
  try { const s = await getDoc(doc(db, 'apresentacoes', uid)); ap = s.exists() ? s.data() : null; } catch (e) { ap = null; }
  if (!temApresentacao(ap)) ap = null;
  cache.set(uid, ap);
  return ap;
}
async function gravar(uid, dados) {
  if (dados) await setDoc(doc(db, 'apresentacoes', uid), dados);
  else await deleteDoc(doc(db, 'apresentacoes', uid));
  cache.set(uid, dados && temApresentacao(dados) ? dados : null);
}
// Versão anterior guardava o vídeo no núcleo: copia para a pessoa (se ela ainda não tiver).
export async function migrarApresentacao(uid, velho) {
  if (!uid || !velho || !velho.videoUrl) return false;
  if (await apresentacaoDe(uid, { recarregar: true })) return false;
  await gravar(uid, { videoUrl: velho.videoUrl, inicioNome: velho.inicioNome || null, titulo: velho.titulo || null, duracao: velho.duracao || null, atualizadoEm: new Date().toISOString(), porNome: autor.nome || '', porUid: autor.uid || '' });
  return true;
}
async function apagarArquivoAntigo(url) {
  if (!/^https:\/\/firebasestorage\.googleapis\.com\//.test(String(url || ''))) return;
  try { await deleteObject(storageRef(storage, url)); } catch (e) { /* já não existe ou sem permissão: segue */ }
}
function duracaoDoArquivo(file) {
  return new Promise((res) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); res(v.duration); }; v.onerror = () => res(NaN); v.src = URL.createObjectURL(file); });
}
const APR_MAX_MB = 15; const APR_MAX_SEG = 30;
const LINK_OK = /^(https:\/\/|apresentacoes\/)[^\s<>"']+$/i;

/* ------------------------------------------------ apresentação: tocar */
const CORES = {
  Iniciante: ['#CCC', '#CCC', '#CCC'], Escravo: ['#4F4F4F', '#4F4F4F', '#4F4F4F'], Fugitivo: ['#4F4F4F', '#DAA520', '#4F4F4F'],
  Quilombola: ['#DAA520', '#DAA520', '#DAA520'], Vagante: ['#4F4F4F', '#D32F2F', '#4F4F4F'], Liberto: ['#D32F2F', '#D32F2F', '#D32F2F'],
  Instrutor: ['#4F4F4F', '#DAA520', '#D32F2F'], Professor: ['#FFFFFF', '#D32F2F', '#FFFFFF'], Mestre: ['#F5F5F5', '#F5F5F5', '#F5F5F5'],
  'Mestre/Presidente': ['#FFFFFF', '#00B140', '#002D72'],
};
// extras: { direto, nucleoNome, total } — cada tela passa o que já sabe (dado real).
export function tocarApresentacao(pessoa, ap, { alvo = null, comSom = true, direto = '', nucleoNome = '', total = 0 } = {}) {
  if (!temApresentacao(ap)) return Promise.resolve();
  const p = pessoa || {};
  return abrirApresentacao({
    videoUrl: ap.videoUrl, inicioNome: ap.inicioNome, comSom, alvo,
    cargo: textoCargo(p, ap.titulo), nome: p.nome || '',
    chips: [
      p.cordaoAtual ? { texto: `Cordão ${p.cordaoAtual}`, ouro: true } : null,
      direto ? { texto: direto } : null,
      nucleoNome ? { texto: nucleoNome } : null,
      total ? { texto: `${total} atleta${total === 1 ? '' : 's'} no grupo` } : null,
    ],
    corda: CORES[p.cordaoAtual] || CORES.Professor,
  });
}

// Ao entrar na plataforma: toca uma vez por login (o login.js marca
// "apr.aoEntrar") e uma vez por sessão do navegador (app instalado reaberto).
export const CHAVE_LOGIN = 'apr.aoEntrar';
export async function tocarAoEntrar(pessoa, extras = {}) {
  const uid = pessoa && (pessoa.uid || pessoa.id);
  if (!uid || !podeTerApresentacao(pessoa)) return;
  let veioDoLogin = false; let jaTocou = false;
  try { veioDoLogin = sessionStorage.getItem(CHAVE_LOGIN) === '1'; jaTocou = sessionStorage.getItem(`apr.visto.${uid}`) === '1'; } catch (e) { /* navegador sem storage */ }
  if (jaTocou && !veioDoLogin) return;
  const ap = await apresentacaoDe(uid);
  try { sessionStorage.removeItem(CHAVE_LOGIN); sessionStorage.setItem(`apr.visto.${uid}`, '1'); } catch (e) { /* ok */ }
  if (!ap || !podeAbrirSozinho()) return;
  await tocarApresentacao(pessoa, ap, { comSom: true, ...extras });
}

/* ---------------------------------------------- apresentação: gerenciar */
// Janela de configurações da apresentação de UMA pessoa (ela mesma ou alguém
// que o Admin/Fundador/responsável do núcleo está editando).
export async function gerenciarApresentacao(pessoa, { extras = {}, aoMudar } = {}) {
  const uid = pessoa && (pessoa.uid || pessoa.id);
  if (!uid) return;
  const propria = uid === autor.uid;
  let ap = await apresentacaoDe(uid, { recarregar: true });
  const { caixa } = janela(`${topo(propria ? 'Minha apresentação' : 'Apresentação em vídeo', pessoa.nome || 'Atleta')}
<div class="cta-apr-estado"><button type="button" class="play" data-cta="ver" aria-label="Ver a apresentação">▶</button><div><b data-cta="titulo"></b><small data-cta="sub"></small></div></div>
<div class="cta-grade"><button type="button" class="cta-btn cta-primario" data-cta="enviar">Enviar vídeo</button><button type="button" class="cta-btn cta-claro" data-cta="abrir-link">Usar link</button></div>
<form class="cta-form" data-cta="form-link" hidden style="margin-top:10px"><label>Link ou caminho do vídeo<input type="text" name="url" placeholder="apresentacoes/nome.mp4 ou https://…" autocomplete="off"></label><button type="submit" class="cta-btn cta-ceu">Salvar link</button></form>
<div class="cta-sep"></div>
<form class="cta-form" data-cta="ajustes">
<label>Como chamar na apresentação<input type="text" name="titulo" maxlength="24" placeholder="Automático pelo cordão (ex.: Professora)"></label>
<label>Segundo em que o nome aparece<input type="number" name="inicio" min="0" max="30" step="0.1" placeholder="Automático"></label>
<button type="submit" class="cta-btn cta-ceu">Salvar ajustes</button>
</form>
<div class="cta-msg" role="status" aria-live="polite" style="margin-top:10px"></div>
<button type="button" class="cta-btn cta-perigo" data-cta="remover" style="width:100%;margin-top:6px">Remover apresentação</button>
<p class="cta-dica">Vídeo em pé (9:16), até ${APR_MAX_SEG} s e ${APR_MAX_MB} MB. O vídeo toca como foi gravado — velocidade e áudio originais. Se for curto, o último quadro segura na tela enquanto o nome entra. Abre sozinho quando ${propria ? 'você entra' : 'a pessoa entra'} na plataforma.</p>`, { rotulo: 'Configurar apresentação' });

  const q = (s) => caixa.querySelector(`[data-cta="${s}"]`);
  const ajustes = q('ajustes');
  function pintar() {
    const tem = temApresentacao(ap);
    q('ver').disabled = !tem;
    q('titulo').textContent = tem ? 'Vídeo publicado' : 'Sem vídeo ainda';
    q('sub').textContent = tem
      ? [ap.duracao ? `${String(ap.duracao).replace('.', ',')} s` : '', ap.titulo ? `"${ap.titulo}"` : '', ap.inicioNome ? `nome aos ${String(ap.inicioNome).replace('.', ',')} s` : 'nome automático'].filter(Boolean).join(' · ')
      : 'A foto clássica continua; o vídeo entra quando for enviado.';
    q('enviar').textContent = tem ? 'Trocar vídeo' : 'Enviar vídeo';
    ajustes.hidden = !tem; q('remover').hidden = !tem;
    ajustes.titulo.value = (tem && ap.titulo) || ''; ajustes.inicio.value = (tem && ap.inicioNome) || '';
  }
  pintar();
  const base = () => ({ inicioNome: (ap && ap.inicioNome) || null, titulo: (ap && ap.titulo) || null, duracao: (ap && ap.duracao) || null });
  async function salvar(dados, okTexto) {
    try {
      await gravar(uid, dados); ap = dados; pintar(); mensagem(caixa, okTexto, 'ok');
      if (typeof aoMudar === 'function') aoMudar(dados);
    } catch (e) {
      console.error(e);
      mensagem(caixa, String(e.code || '').includes('permission') ? 'Sem permissão para salvar esta apresentação (confira as regras do Firestore publicadas).' : 'Não foi possível salvar agora.', 'erro');
    }
  }
  const carimbo = () => ({ atualizadoEm: new Date().toISOString(), porNome: autor.nome || '', porUid: autor.uid || '' });

  q('ver').addEventListener('click', () => { if (ap) tocarApresentacao(pessoa, ap, { comSom: true, ...extras }); });
  q('abrir-link').addEventListener('click', () => { const f = q('form-link'); f.hidden = !f.hidden; if (!f.hidden) { f.url.value = (ap && ap.videoUrl) || ''; f.url.focus(); } });
  q('form-link').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const url = ev.target.url.value.trim();
    if (!LINK_OK.test(url)) { mensagem(caixa, 'Use um link https:// ou um caminho que comece com apresentacoes/.', 'erro'); return; }
    const antigo = ap && ap.videoUrl;
    await salvar({ videoUrl: url, ...base(), duracao: null, ...carimbo() }, 'Link salvo. Toque em ▶ para conferir.');
    if (antigo && antigo !== url) apagarArquivoAntigo(antigo);
    ev.target.hidden = true;
  });
  q('enviar').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'video/mp4,video/webm,video/quicktime';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      if (f.size > APR_MAX_MB * 1024 * 1024) { mensagem(caixa, `Vídeo acima de ${APR_MAX_MB} MB. Exporte em 720p ou me mande que eu comprimo.`, 'erro'); return; }
      const dur = await duracaoDoArquivo(f);
      if (!(dur > 0) || dur > APR_MAX_SEG) { mensagem(caixa, `O vídeo precisa ter até ${APR_MAX_SEG} s (este tem ${dur > 0 ? Math.round(dur) : '?'} s).`, 'erro'); return; }
      const btn = q('enviar'); btn.disabled = true; btn.textContent = 'Enviando…'; mensagem(caixa, 'Enviando o vídeo, não feche esta janela…', '');
      try {
        const ext = (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
        const r = storageRef(storage, `apresentacoes/${uid}/${Date.now()}.${ext}`);
        await uploadBytes(r, f, { contentType: f.type || 'video/mp4', cacheControl: 'public,max-age=31536000' });
        const url = await getDownloadURL(r);
        const antigo = ap && ap.videoUrl;
        await salvar({ videoUrl: url, ...base(), duracao: Math.round(dur * 10) / 10, ...carimbo() }, 'Vídeo publicado. Toque em ▶ para conferir.');
        if (antigo && antigo !== url) apagarArquivoAntigo(antigo);
      } catch (e) {
        console.error(e);
        mensagem(caixa, /storage/i.test(String(e.code || '')) ? `O vídeo não subiu (${e.code}). Confira as regras do Storage (pasta apresentacoes/).` : 'Não foi possível enviar o vídeo.', 'erro');
      } finally { btn.disabled = false; pintar(); }
    };
    inp.click();
  });
  ajustes.addEventListener('submit', async (ev) => {
    ev.preventDefault(); if (!ap) return;
    const titulo = ajustes.titulo.value.replace(/[<>"'`]/g, '').trim().slice(0, 24) || null;
    const bruto = String(ajustes.inicio.value || '').replace(',', '.').trim();
    const n = Number(bruto);
    const inicioNome = bruto && Number.isFinite(n) && n >= 0 && n <= 30 ? Math.round(n * 10) / 10 : null;
    await salvar({ ...ap, titulo, inicioNome, ...carimbo() }, 'Ajustes salvos.');
  });
  q('remover').addEventListener('click', async () => {
    if (!confirm('Remover a apresentação? O cartão volta a abrir direto com a foto.')) return;
    const antigo = ap && ap.videoUrl;
    await salvar(null, 'Apresentação removida.');
    if (antigo) apagarArquivoAntigo(antigo);
  });
}

/* ------------------------------------------------------- minha conta */
// Painel de gestão: dados de contato da própria pessoa + senha + apresentação.
export function abrirMinhaConta(pessoa, { extras = {}, aoSalvar } = {}) {
  const uid = pessoa && (pessoa.uid || pessoa.id);
  if (!uid) return;
  const temApr = podeTerApresentacao(pessoa);
  const { caixa } = janela(`${topo('Minha conta', pessoa.nome || 'Minha conta')}
<form class="cta-form" data-cta="dados" novalidate>
<label>E-mail de acesso<input type="email" value="${esc(pessoa.email || emailDaSessao())}" readonly></label>
<label>Celular / WhatsApp<input type="tel" name="celular" inputmode="tel" autocomplete="tel" placeholder="(67) 99129-3269" value="${esc(formatarCelular(celularDe(pessoa)))}"></label>
<div class="cta-msg" role="status" aria-live="polite"></div>
<button type="submit" class="cta-btn cta-primario">Salvar celular</button>
</form>
<div class="cta-sep"></div>
<div class="cta-lista">
<button type="button" class="cta-item" data-cta="senha"><i class="ic">🔑</i><span><b>Trocar senha</b><small>Com a senha atual; se esqueceu, enviamos um link</small></span></button>
${temApr ? '<button type="button" class="cta-item" data-cta="apr"><i class="ic">▶</i><span><b>Minha apresentação</b><small>Vídeo que abre quando você entra na plataforma</small></span></button>' : ''}
</div>`, { rotulo: 'Minha conta' });
  const f = caixa.querySelector('[data-cta="dados"]');
  f.celular.addEventListener('input', () => { const pos = f.celular.value.length; f.celular.value = formatarCelular(f.celular.value); if (pos >= f.celular.value.length) f.celular.setSelectionRange(f.celular.value.length, f.celular.value.length); });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const cel = formatarCelular(f.celular.value);
    if (!celularValido(cel)) { mensagem(caixa, 'Celular com DDD: 10 ou 11 números.', 'erro'); return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await atualizar('usuarios', uid, { celular: cel });
      pessoa.celular = cel; mensagem(caixa, 'Celular salvo.', 'ok');
      if (typeof aoSalvar === 'function') aoSalvar({ celular: cel });
    } catch (e) { console.error(e); mensagem(caixa, 'Não foi possível salvar o celular agora.', 'erro'); } finally { btn.disabled = false; }
  });
  caixa.querySelector('[data-cta="senha"]').addEventListener('click', abrirTrocaSenha);
  const b = caixa.querySelector('[data-cta="apr"]');
  if (b) b.addEventListener('click', () => gerenciarApresentacao(pessoa, { extras }));
}
