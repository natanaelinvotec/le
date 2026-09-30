/* celebrar.js — a festa na TELA PRINCIPAL (app do atleta e painel do núcleo).

Quando a professora troca o cordão no painel, ou o atleta ganha um brasão, o
servidor grava uma notificação (tipo 'cordao' ou 'brasao'). No próximo acesso
esta tela "salta" com a festa, uma vez só (marca celebradoEm na notificação),
e oferece: card de stories (Instagram, WhatsApp, Facebook…), WhatsApp direto,
postar na Rede Liberdade, baixar a imagem e — na troca de cordão — ver o
certificado. O mesmo painel abre depois para compartilhar qualquer brasão.

  verificarCelebracoes(uid, perfil)      → mostra o que ainda não foi festejado
  abrirFesta(festa, { uid, perfil })     → abre a festa / o compartilhamento */
import { db, storage, storageRef, uploadString, getDownloadURL, collection, query, where, limit, getDocs, getDoc, doc, updateDoc, addDoc } from './firebase.js';
import { ESCOLA, coresDoCordao } from './escola.js';
import { porId as brasaoPorId, urlPng } from './brasoes.js';
import { gerarCardStory, compartilharImagem, linkWhatsApp, baixarImagem } from './card-story.js';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const primeiro = (n) => String(n || '').trim().split(/\s+/)[0] || 'Atleta';
const DIAS_VALIDOS = 30; // aviso mais antigo que isso não vira festa (só fica na central)
// Avisos de antes desta versão não viram festa (no dia da atualização não salta tudo de uma vez).
const FESTAS_DESDE = '2026-09-30T15:00:00.000Z';
const linkSite = () => new URL('index.html', location.href).href;

const CSS = `
.festa{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,18,43,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Manrope',system-ui,sans-serif;animation:festaFundo .4s cubic-bezier(.16,1,.3,1)}
@keyframes festaFundo{from{opacity:0}}
.festa-caixa{position:relative;width:100%;max-width:420px;max-height:calc(100vh - 32px);overflow-y:auto;border-radius:28px;background:radial-gradient(120% 70% at 50% 18%,#0E3172 0%,#061A3A 62%);color:#fff;padding:26px 20px 20px;text-align:center;box-shadow:0 40px 80px -30px rgba(0,0,0,.8);animation:festaSalta .7s cubic-bezier(.16,1,.3,1)}
@keyframes festaSalta{0%{transform:scale(.6) translateY(40px);opacity:0}60%{transform:scale(1.04)}100%{transform:none;opacity:1}}
.festa-x{position:absolute;right:12px;top:12px;width:40px;height:40px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font-size:20px;line-height:1;cursor:pointer}
.festa-eyebrow{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.22em;color:#7FD3C7}
.festa h2{margin:8px 0 0;font:800 30px/1.08 'Sora',sans-serif;letter-spacing:-.02em}
.festa-nome{margin:6px 0 0;font:italic 400 26px 'Instrument Serif',Georgia,serif;color:#fff}
.festa-palco{position:relative;height:190px;margin:14px 0 6px;display:flex;align-items:center;justify-content:center}
.festa-palco img{max-width:180px;max-height:180px;filter:drop-shadow(0 18px 28px rgba(0,0,0,.55));animation:festaGira 1.1s cubic-bezier(.16,1,.3,1) both}
@keyframes festaGira{from{transform:rotateY(180deg) scale(.4);opacity:0}to{transform:none;opacity:1}}
.festa-palco .aura{position:absolute;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(218,165,32,.45),rgba(218,165,32,0) 70%);animation:festaPulsa 2.4s ease-in-out infinite}
@keyframes festaPulsa{50%{transform:scale(1.12);opacity:.7}}
.festa-corda{width:92%;height:26px;border-radius:13px;margin:0 auto;box-shadow:0 12px 22px -10px rgba(0,0,0,.7);animation:festaCorda 1s cubic-bezier(.16,1,.3,1) both;transform-origin:left center}
@keyframes festaCorda{from{transform:scaleX(0)}}
.festa-cordao-rotulo{margin-top:14px;display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.1);font:800 17px 'Sora',sans-serif}
.festa-mini{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:6px}
.festa-mini span{display:flex;flex-direction:column;align-items:center;gap:4px;width:74px;font-size:10.5px;font-weight:700;color:rgba(255,255,255,.85)}
.festa-mini img{width:52px;height:52px;object-fit:contain}
.festa p.festa-txt{margin:10px 6px 0;font-size:13.5px;line-height:1.55;color:rgba(255,255,255,.82)}
.festa-bts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:16px}
.festa-bts button,.festa-bts a{height:48px;border:0;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font:800 13.5px 'Manrope',sans-serif;cursor:pointer;text-decoration:none;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.festa-bts button:active,.festa-bts a:active{transform:scale(.97)}
.festa-bts .principal{grid-column:1/-1;height:54px;background:#00E676;color:#002D72;font-size:15px}
.festa-bts .zap{background:#25D366;color:#063B1C}
.festa-bts .rede{background:#fff;color:#002D72}
.festa-bts .sutil{background:rgba(255,255,255,.1);color:#fff}
.festa-bts [disabled]{opacity:.5;cursor:wait}
.festa-status{min-height:18px;margin-top:10px;font-size:12.5px;font-weight:700;color:#7FD3C7}
.festa-ok{margin-top:10px;width:100%;height:46px;border:0;border-radius:14px;background:transparent;color:#fff;font:800 14px 'Manrope',sans-serif;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.3);cursor:pointer}
.confete{position:fixed;top:-20px;width:10px;height:16px;border-radius:2px;z-index:9001;pointer-events:none;animation:cai linear forwards}
@keyframes cai{to{transform:translateY(110vh) rotate(720deg)}}
@media (prefers-reduced-motion:reduce){.festa-caixa,.festa-palco img,.festa-corda,.festa-palco .aura{animation:none}.confete{display:none}}
`;
function garantirCss() {
  if (document.getElementById('le-festa-css')) return;
  const s = document.createElement('style'); s.id = 'le-festa-css'; s.textContent = CSS; document.head.appendChild(s);
  if (!document.querySelector('link[data-fontes-card]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.fontesCard = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Manrope:wght@700;800&family=Instrument+Serif:ital@1&display=swap';
    document.head.appendChild(l);
  }
}
const listras = (c, passo = 9) => `linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.3)),repeating-linear-gradient(45deg,${c[0]} 0 ${passo}px,${c[1]} ${passo}px ${passo * 2}px,${c[2]} ${passo * 2}px ${passo * 3}px)`;
const coresSeguras = (c) => (Array.isArray(c) && c.length === 3 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x))) ? c : ['#4F4F4F', '#DAA520', '#D32F2F']);

function confetes(cores) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const paleta = cores.concat(['#00E676', '#7FD3C7', '#DAA520']);
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('span'); p.className = 'confete';
    p.style.left = `${Math.random() * 100}vw`; p.style.background = paleta[i % paleta.length];
    p.style.animationDuration = `${2.2 + Math.random() * 2.2}s`; p.style.animationDelay = `${Math.random() * 0.8}s`;
    p.style.opacity = String(0.7 + Math.random() * 0.3);
    document.body.appendChild(p); setTimeout(() => p.remove(), 5600);
  }
}

// ---------- postar na Rede Liberdade ----------
async function paraJpeg(blob) {
  const u = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return { dataUrl: c.toDataURL('image/jpeg', 0.88), w: img.width, h: img.height };
  } finally { URL.revokeObjectURL(u); }
}
export async function postarNaRede({ uid, perfil, blob, texto }) {
  const sp = await getDoc(doc(db, 'perfisPublicos', uid));
  if (!sp.exists()) throw new Error('Abra a Rede Liberdade uma vez para criar o seu perfil e tente de novo.');
  const pub = sp.data();
  const { dataUrl, w, h } = await paraJpeg(blob);
  const r = storageRef(storage, `rede/${uid}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`);
  await uploadString(r, dataUrl, 'data_url', { cacheControl: 'public,max-age=31536000' });
  const url = await getDownloadURL(r);
  // Menor publicando imagem: passa pela revisão do núcleo (mesma regra da Rede).
  const revisao = pub.menor ? 'pendente' : 'ok';
  const t = String(texto || '').slice(0, 800);
  await addDoc(collection(db, 'posts'), {
    autorUid: uid, autorNome: (perfil && perfil.nome) || pub.nome || '', autorFoto: /^https:/.test((perfil && perfil.fotoUrl) || '') ? perfil.fotoUrl : '',
    autorAcademiaId: (perfil && perfil.academiaId) || null, autorAcademiaNome: (perfil && perfil.academiaNome) || '', autorCordao: pub.cordaoAtual || '',
    autorMenor: !!pub.menor, texto: t, fotoUrl: url, midias: [{ url, tipo: 'imagem', w, h }],
    tipo: 'post', melhorMomento: false, nucleoId: (perfil && perfil.academiaId) || null, nucleoNome: (perfil && perfil.academiaNome) || '',
    marcados: [], visibilidade: 'rede', hashtags: Array.from(new Set((t.match(/#[\p{L}\p{N}_]+/gu) || []).map((x) => x.slice(1).toLowerCase()))).slice(0, 10),
    revisao, oculto: false, publico: revisao === 'ok', criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0,
  });
  return revisao;
}

// ---------- a festa ----------
// festa = { tipo:'cordao'|'brasao', nome, proprio, cordao, cores, certificado, brasoes:[ids], evento, compartilhar(bool: só compartilhar, sem confete) }
export function abrirFesta(festa, { uid, perfil } = {}) {
  garantirCss();
  return new Promise((fechou) => {
    const ehBrasao = festa.tipo === 'brasao';
    const lista = ehBrasao ? (festa.brasoes || []).map(brasaoPorId).filter(Boolean) : [];
    if (ehBrasao && !lista.length) { fechou(); return; }
    const principal = lista[0];
    const cores = coresSeguras(festa.cores);
    const nome = festa.nome || 'Atleta';
    const proprio = festa.proprio !== false;
    const quem = proprio ? '' : primeiro(nome);
    const eyebrow = ehBrasao ? (festa.compartilhar ? 'MEU BRASÃO' : (lista.length > 1 ? `${lista.length} BRASÕES NOVOS` : 'BRASÃO NOVO')) : (festa.evento ? String(festa.evento).toUpperCase().slice(0, 40) : 'TROCA DE CORDÃO');
    const titulo = ehBrasao ? (festa.compartilhar ? principal.nome : (proprio ? 'Você conquistou um brasão!' : `${quem} conquistou um brasão!`)) : (proprio ? 'Troquei de cordão!' : `${quem} trocou de cordão!`);
    const linkCert = festa.certificado ? new URL(`certificado.html#${encodeURIComponent(festa.certificado)}`, location.href).href : '';
    const textoZap = ehBrasao
      ? `${proprio ? 'Conquistei' : `${quem} conquistou`} o brasão "${principal.nome}" no Grupo de Capoeira ${ESCOLA.nomeCurto}! ${ESCOLA.fraseCelebracao}`
      : `${proprio ? 'Troquei de cordão' : `${quem} trocou de cordão`}: agora é Cordão ${festa.cordao}! Grupo de Capoeira ${ESCOLA.nomeCurto}. ${ESCOLA.fraseCelebracao}`;
    const linkZap = linkCert || linkSite();
    const textoRede = ehBrasao ? `Conquistei o brasão ${principal.nome}! #brasao #capoeira` : `Troquei de cordão: agora sou Cordão ${festa.cordao}! #batizado #capoeira`;

    const raiz = document.createElement('div');
    raiz.className = 'festa';
    raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-label', titulo);
    raiz.innerHTML = `<div class="festa-caixa">
      <button type="button" class="festa-x" data-f="fechar" aria-label="Fechar">×</button>
      <span class="festa-eyebrow">${esc(eyebrow)}</span>
      <h2>${esc(titulo)}</h2>
      ${ehBrasao ? `<div class="festa-palco"><span class="aura" aria-hidden="true"></span><img src="${esc(urlPng(principal))}" alt="${esc(principal.nome)}"></div>
        ${festa.compartilhar ? '' : `<p class="festa-nome">${esc(principal.nome)}</p>`}
        ${lista.length > 1 ? `<div class="festa-mini">${lista.slice(1, 5).map((b) => `<span><img src="${esc(urlPng(b))}" alt="">${esc(b.nome)}</span>`).join('')}</div>` : ''}
        <p class="festa-txt">${esc(principal.como || '')}</p>`
      : `<p class="festa-nome">${esc(nome)}</p>
        <div class="festa-palco" style="height:auto;flex-direction:column;padding:10px 0 4px"><div class="festa-corda" style="background:${listras(cores)}"></div>
        <span class="festa-cordao-rotulo">Cordão ${esc(festa.cordao || '')}</span></div>
        <p class="festa-txt">${festa.certificado ? 'O certificado de graduação já está pronto para baixar e imprimir.' : 'Parabéns pela nova graduação!'}</p>`}
      <div class="festa-bts">
        <button type="button" class="principal" data-f="stories">Compartilhar (Instagram, WhatsApp…)</button>
        <a class="zap" href="${esc(linkWhatsApp(textoZap, linkZap))}" target="_blank" rel="noopener">WhatsApp</a>
        ${uid && proprio ? '<button type="button" class="rede" data-f="rede">Postar na Rede</button>' : '<button type="button" class="rede" data-f="baixar">Baixar imagem</button>'}
        ${linkCert ? `<a class="sutil" href="${esc(linkCert)}">Ver certificado</a>` : ''}
        ${uid && proprio ? '<button type="button" class="sutil" data-f="baixar">Baixar imagem</button>' : ''}
      </div>
      <p class="festa-status" aria-live="polite"></p>
      <button type="button" class="festa-ok" data-f="fechar">${esc(ESCOLA.fraseCelebracao)}</button>
    </div>`;
    document.body.appendChild(raiz);
    if (!festa.compartilhar) confetes(ehBrasao ? ['#DAA520', '#F2C94C', '#B8860B'] : cores);
    const status = (t) => { raiz.querySelector('.festa-status').textContent = t; };
    let card = null; let pedido = null;
    const obterCard = async () => {
      if (card) return card;
      if (pedido) return pedido;
      pedido = gerarCardStory(ehBrasao
        ? { tipo: 'brasao', nome, brasaoNome: principal.nome, brasaoImg: urlPng(principal), nivel: principal.nivel ? principal.nivel[0].toUpperCase() + principal.nivel.slice(1) : '', eyebrow: 'BRASÃO NOVO' }
        : { tipo: 'cordao', nome, cordao: festa.cordao, cores, eyebrow: festa.evento ? 'BATIZADO' : 'TROCA DE CORDÃO' });
      card = await pedido;
      return card;
    };
    obterCard().catch(() => null); // já prepara a imagem enquanto a festa aparece
    const fechar = () => { raiz.remove(); document.removeEventListener('keydown', tecla); fechou(); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    raiz.addEventListener('click', async (e) => {
      if (e.target === raiz) { fechar(); return; }
      const b = e.target.closest('[data-f]'); if (!b) return;
      const f = b.dataset.f;
      if (f === 'fechar') { fechar(); return; }
      b.disabled = true;
      try {
        if (!card) status('Preparando a imagem…');
        const blob = await obterCard();
        status('');
        const arquivo = ehBrasao ? `brasao-${principal.id}.png` : `troquei-de-cordao-${String(festa.cordao || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        if (f === 'stories') {
          const r = await compartilharImagem(blob, { texto: textoZap, link: linkZap, arquivo });
          if (r === 'sem-suporte') { baixarImagem(blob, arquivo); status('Imagem baixada: publique nos stories pela galeria.'); }
          else if (r === 'compartilhado') status('Compartilhado!');
        } else if (f === 'baixar') { baixarImagem(blob, arquivo); status('Imagem salva no aparelho.'); }
        else if (f === 'rede') {
          status('Publicando na Rede…');
          const rev = await postarNaRede({ uid, perfil, blob, texto: textoRede });
          status(rev === 'pendente' ? 'Enviado! O responsável do núcleo revisa antes de aparecer.' : 'Publicado na Rede Liberdade!');
          b.textContent = 'Publicado ✓';
          return; // não deixa publicar duas vezes
        }
      } catch (er) { console.error(er); status(er && er.message && !/firebase|permission/i.test(er.message) ? er.message : 'Não deu certo agora. Tente de novo.'); }
      b.disabled = false;
    });
    setTimeout(() => { const x = raiz.querySelector('[data-f="stories"]'); if (x) x.focus(); }, 60);
  });
}

// ---------- o que ainda não foi festejado ----------
export async function verificarCelebracoes(uid, perfil) {
  if (!uid) return;
  let docs = [];
  try {
    const s = await getDocs(query(collection(db, 'notificacoes', uid, 'itens'), where('tipo', 'in', ['cordao', 'brasao']), limit(40)));
    docs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return; }
  const limite = Date.now() - DIAS_VALIDOS * 86400000;
  const pendentes = docs.filter((n) => !n.celebradoEm && String(n.criadoEm || '') > FESTAS_DESDE && new Date(n.criadoEm || 0).getTime() > limite)
    .sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
  if (!pendentes.length) return;
  // Sem esperar o servidor: offline a gravação fica na fila e a festa aparece na hora.
  const marcar = (lista) => { lista.forEach((n) => { updateDoc(doc(db, 'notificacoes', uid, 'itens', n.id), { celebradoEm: new Date().toISOString() }).catch(() => {}); }); };

  // Brasões que a pessoa já viu festejados na Rede (neste aparelho) não saltam de novo.
  let vistos = null; try { vistos = JSON.parse(localStorage.getItem(`rede.brasoesVistos.${uid}`) || 'null'); } catch (e) { vistos = null; }

  for (const n of pendentes.filter((x) => x.tipo === 'cordao')) {
    const atletaUid = n.atletaUid || uid;
    const proprio = atletaUid === uid;
    const nomeAtleta = n.atletaNome || (proprio ? (perfil && perfil.nome) : '') || 'Atleta';
    const cordao = n.cordao || String(n.titulo || '').replace(/^Cordão\s+/i, '').replace(/!$/, '');
    marcar([n]);
    await abrirFesta({ tipo: 'cordao', nome: nomeAtleta, proprio, cordao, cores: Array.isArray(n.cores) ? n.cores : coresDoCordao(cordao, proprio ? perfil : null), certificado: n.certificado || '', evento: n.evento || '' }, { uid, perfil });
  }
  const notBrasoes = pendentes.filter((x) => x.tipo === 'brasao');
  if (notBrasoes.length) {
    let ids = Array.from(new Set(notBrasoes.flatMap((n) => (Array.isArray(n.brasoes) ? n.brasoes : []))));
    if (Array.isArray(vistos)) ids = ids.filter((id) => !vistos.includes(id));
    marcar(notBrasoes);
    if (ids.length) {
      if (Array.isArray(vistos)) { try { localStorage.setItem(`rede.brasoesVistos.${uid}`, JSON.stringify(Array.from(new Set(vistos.concat(ids))))); } catch (e) { /* ok */ } }
      await abrirFesta({ tipo: 'brasao', nome: (perfil && perfil.nome) || 'Atleta', brasoes: ids }, { uid, perfil });
    }
  }
}
