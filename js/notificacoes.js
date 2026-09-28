/* notificacoes.js — central de notificações + push no celular.
   Quem escreve as notificações é o servidor (Cloud Functions): curtidas,
   comentários, respostas, menções, mensagens, brasões, avisos, eventos,
   denúncias e revisões. Aqui o app só lê, marca como lida e liga o push. */
import {
  db, firebaseApp, collection, doc, query, where, orderBy, limit, onSnapshot, getDocs, updateDoc, setDoc, deleteDoc, writeBatch,
} from './firebase.js';
import { VAPID_KEY } from './escola.js';
import { folha, registrarServiceWorker } from './experiencia.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICONE = {
  curtida: 'fa-heart', comentario: 'fa-comment', resposta: 'fa-reply', mencao: 'fa-at', marcacao: 'fa-user-tag', mensagem: 'fa-envelope',
  brasao: 'fa-medal', cordao: 'fa-ribbon', aviso: 'fa-bullhorn', evento: 'fa-calendar-check', denuncia: 'fa-flag', revisao: 'fa-shield-halved',
  seguir: 'fa-user-plus', moderacao: 'fa-eye-slash', lgpd: 'fa-user-shield', solicitacao: 'fa-inbox',
};
function quando(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora'; if (s < 3600) return `${Math.floor(s / 60)} min`; if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// Bolinha com o número de não lidas num botão (sino). Devolve a função de parar.
export function ligarContador(uid, aoMudar) {
  if (!uid) return () => {};
  try {
    return onSnapshot(query(collection(db, 'notificacoes', uid, 'itens'), where('lida', '==', false), limit(30)),
      (s) => aoMudar(s.size), () => aoMudar(0));
  } catch (e) { aoMudar(0); return () => {}; }
}

export async function listar(uid, max = 40) {
  const s = await getDocs(query(collection(db, 'notificacoes', uid, 'itens'), orderBy('criadoEm', 'desc'), limit(max)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function marcarTodasLidas(uid, lista) {
  const pend = (lista || []).filter((n) => !n.lida);
  if (!pend.length) return;
  const lote = writeBatch(db); const agora = new Date().toISOString();
  pend.forEach((n) => lote.update(doc(db, 'notificacoes', uid, 'itens', n.id), { lida: true, lidaEm: agora }));
  await lote.commit();
}

export function itemHTML(n) {
  return `<a class="nt-item ${n.lida ? '' : 'nova'}" href="${esc(n.link || '#')}" data-nt="${esc(n.id)}">
    <span class="nt-ic t-${esc(n.tipo || 'aviso')}"><i class="fas ${ICONE[n.tipo] || 'fa-bell'}"></i></span>
    <span class="nt-tx"><b>${esc(n.titulo || '')}</b>${n.texto ? `<small>${esc(n.texto)}</small>` : ''}</span>
    <time>${n.criadoEm ? quando(n.criadoEm) : ''}</time></a>`;
}

export const CSS_NOTIF = `
.nt-lista{display:grid;gap:4px}
.nt-item{display:flex;gap:12px;align-items:center;padding:11px 10px;border-radius:14px;text-decoration:none;color:inherit;transition:background .25s cubic-bezier(.16,1,.3,1),transform .25s cubic-bezier(.16,1,.3,1)}
.nt-item:hover{background:rgba(56,158,146,.08);transform:translateX(2px)}
.nt-item.nova{background:rgba(0,230,118,.09)}
.nt-item.nova b::after{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:#00C853;margin-left:6px;vertical-align:middle}
.nt-ic{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;flex:none;color:#fff;background:linear-gradient(135deg,#389E92,#0B5C52)}
.nt-ic.t-curtida{background:linear-gradient(135deg,#ff5f7a,#d6245a)}.nt-ic.t-brasao,.nt-ic.t-cordao{background:linear-gradient(135deg,#f6c64d,#b9770e)}
.nt-ic.t-denuncia,.nt-ic.t-moderacao{background:linear-gradient(135deg,#ef5350,#b71c1c)}.nt-ic.t-mensagem{background:linear-gradient(135deg,#1b5fc2,#002D72)}
.nt-ic.t-aviso,.nt-ic.t-evento{background:linear-gradient(135deg,#00E676,#1E8449)}
.nt-tx{flex:1;min-width:0;display:grid;gap:2px}.nt-tx b{font-size:.88rem;line-height:1.25}.nt-tx small{font-size:.78rem;color:#5f6f7a;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.nt-item time{font-size:.7rem;color:#8a98a1;flex:none;align-self:flex-start;margin-top:3px}
.nt-vazio{text-align:center;color:#5f6f7a;padding:26px 8px;font-size:.9rem}
.nt-push{display:flex;gap:10px;align-items:center;background:#EAF2F1;border-radius:14px;padding:10px 12px;margin:6px 0 10px;font-size:.84rem}
.nt-push button{margin-left:auto}
`;

// ---------- Push ----------
export function estadoPush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'indisponivel';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}
async function hashToken(t) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return Array.from(new Uint8Array(b)).slice(0, 12).map((x) => x.toString(16).padStart(2, '0')).join('');
}
// Liga o push neste aparelho: pede permissão, pega o token do FCM e guarda em
// usuarios/{uid}/dispositivos. Devolve true/false.
export async function ativarPush(uid) {
  if (estadoPush() === 'indisponivel') throw new Error('Este navegador não recebe notificações. No iPhone, instale o app na tela inicial primeiro.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await registrarServiceWorker();
  if (!reg) throw new Error('Não foi possível preparar as notificações neste navegador.');
  const { getMessaging, getToken, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
  if (!(await isSupported())) throw new Error('Este navegador não suporta notificações do Firebase.');
  const token = await getToken(getMessaging(firebaseApp), { serviceWorkerRegistration: reg, ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}) });
  if (!token) return false;
  const base = new URL('.', location.href).href;
  const id = await hashToken(token);
  await setDoc(doc(db, 'usuarios', uid, 'dispositivos', id), { token, plataforma: /android/i.test(navigator.userAgent) ? 'android' : /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'web', base, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() });
  try { localStorage.setItem('le.pushId', id); } catch (e) { /* ok */ }
  return true;
}
export async function desativarPush(uid) {
  let id = null; try { id = localStorage.getItem('le.pushId'); } catch (e) { /* ok */ }
  if (id) { try { await deleteDoc(doc(db, 'usuarios', uid, 'dispositivos', id)); } catch (e) { /* ok */ } }
  try { localStorage.removeItem('le.pushId'); } catch (e) { /* ok */ }
}
// Com o app aberto a mensagem não vira notificação do sistema: mostra um aviso na tela.
export async function ouvirPushComAppAberto(aoChegar) {
  try {
    if (estadoPush() !== 'granted') return;
    const { getMessaging, onMessage, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js');
    if (!(await isSupported())) return;
    onMessage(getMessaging(firebaseApp), (m) => aoChegar && aoChegar(m.notification || {}, m.data || {}));
  } catch (e) { /* sem push */ }
}

// Central em folha (usada no app e no painel; a Rede tem a própria tela).
export async function abrirCentral(uid) {
  let lista = [];
  const { el } = folha(`<style>${CSS_NOTIF}</style><h3>Notificações <button class="xp-x" data-xp-fechar aria-label="Fechar"><i class="fas fa-xmark"></i></button></h3>
    <div id="ntPush"></div><div class="nt-lista" id="ntLista"><p class="nt-vazio">Carregando…</p></div>`);
  const pintarPush = () => {
    const box = el.querySelector('#ntPush'); const e = estadoPush();
    box.innerHTML = e === 'granted' ? '' : e === 'denied' ? '<div class="nt-push"><i class="fas fa-bell-slash"></i><span>Notificações bloqueadas no navegador. Libere nas configurações do site.</span></div>'
      : e === 'indisponivel' ? '<div class="nt-push"><i class="fas fa-mobile-screen"></i><span>No iPhone, instale o app na tela inicial para receber notificações.</span></div>'
      : '<div class="nt-push"><i class="fas fa-bell"></i><span>Receba aviso no celular mesmo com o app fechado.</span><button type="button" class="xp-btn p" id="ntAtivar" style="padding:8px 12px">Ativar</button></div>';
    const b = box.querySelector('#ntAtivar');
    if (b) b.addEventListener('click', async () => { b.disabled = true; try { await ativarPush(uid); } catch (err) { alert(err.message); } pintarPush(); });
  };
  pintarPush();
  try {
    lista = await listar(uid);
    el.querySelector('#ntLista').innerHTML = lista.length ? lista.map(itemHTML).join('') : '<p class="nt-vazio"><i class="far fa-bell" style="font-size:1.6rem;display:block;margin-bottom:8px"></i>Nada por aqui ainda.</p>';
    await marcarTodasLidas(uid, lista);
  } catch (e) { el.querySelector('#ntLista').innerHTML = '<p class="nt-vazio">Não foi possível carregar agora.</p>'; }
}
