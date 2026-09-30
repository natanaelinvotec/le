/* certificados.js — "Meus certificados": todos os certificados de graduação do
atleta (e dos filhos, na conta família). A lista vem de certificadosDe/{uid}
(o servidor mantém: um por cordão, com data quando veio de um evento; sem
data para as graduações de antes do app). Cada miniatura é o certificado de
verdade (js/certificado-render.js) em escala, com Ver / PDF / Card. */
import { observarSessao, db, doc, getDoc, onSnapshot } from './firebase.js';
import { ESCOLA, escadaDe, coresDoCordao, nomeBonito } from './escola.js';
import { qrSvg } from './qr.js';
import { ehAtleta, iniciais } from './carteirinha-comum.js';
import { certificadoHtml, carregarAssinaturas, coresOk } from './certificado-render.js';
import { gerarCardStory, compartilharImagem, baixarImagem } from './card-story.js';

const pagina = document.getElementById('pagina');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataBR = (ymd) => (/^\d{4}-\d{2}-\d{2}$/.test(ymd || '') ? ymd.split('-').reverse().join('/') : '');
const linkCert = (cod) => new URL(`certificado.html#${encodeURIComponent(cod)}`, location.href).href;
const listras = (c, p = 5) => `repeating-linear-gradient(45deg,${c[0]} 0 ${p}px,${c[1]} ${p}px ${p * 2}px,${c[2]} ${p * 2}px ${p * 3}px)`;

let meuUid = null; let eu = {}; let alvos = []; let alvoUid = null; let dadosAlvo = {};
let desligar = null; let geracao = 0;
const docsCert = new Map(); // codigo → certificados/{codigo}
let assinaturas = {};

function mensagem(titulo, texto) {
  pagina.innerHTML = `<div class="vazio"><b>${esc(titulo)}</b><p>${esc(texto)}</p><a class="bt bt-marinho" href="app.html">Voltar para o app</a></div>`;
}

observarSessao(async (user) => {
  if (!user) { location.replace('login.html'); return; }
  if (meuUid === user.uid) return;
  meuUid = user.uid;
  try {
    const s = await getDoc(doc(db, 'usuarios', meuUid));
    eu = s.exists() ? s.data() : {};
    alvos = [];
    if (ehAtleta(eu)) alvos.push({ uid: meuUid, nome: eu.nome || 'Eu', foto: eu.fotoUrl || '', eu: true, dados: eu });
    const filhos = Array.isArray(eu.responsavelDe) ? eu.responsavelDe.filter((u) => typeof u === 'string' && u !== meuUid).slice(0, 12) : [];
    const docs = await Promise.all(filhos.map((u) => getDoc(doc(db, 'usuarios', u)).then((x) => (x.exists() ? { uid: u, ...x.data() } : null)).catch(() => null)));
    docs.filter(Boolean).forEach((d) => alvos.push({ uid: d.uid, nome: d.nome || 'Atleta', foto: d.fotoUrl || '', dados: d }));
    if (!alvos.length) { mensagem('Sua conta não tem certificados', 'Os certificados de graduação são dos atletas. Se você é responsável por um atleta, peça ao núcleo para vincular a conta família.'); return; }
    let pedido = ''; try { pedido = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* ok */ }
    let lembrado = null; try { lembrado = sessionStorage.getItem('le.carteirinha.alvo'); } catch (e) { /* ok */ }
    selecionar([pedido, lembrado].find((u) => u && alvos.some((a) => a.uid === u)) || alvos[0].uid);
  } catch (e) { console.error(e); mensagem('Não foi possível abrir os certificados', 'Confira a internet e tente de novo.'); }
});

function selecionar(uid) {
  if (desligar) { try { desligar(); } catch (e) { /* ok */ } }
  alvoUid = uid; dadosAlvo = (alvos.find((a) => a.uid === uid) || {}).dados || {};
  try { sessionStorage.setItem('le.carteirinha.alvo', uid); } catch (e) { /* ok */ }
  const g = ++geracao;
  desligar = onSnapshot(doc(db, 'certificadosDe', uid), async (s) => {
    const itens = s.exists() && Array.isArray(s.data().itens) ? s.data().itens : [];
    // Busca só os certificados que ainda não estão na memória (cada um é 1 leitura).
    const faltam = itens.map((i) => i.codigo).filter((c) => c && !docsCert.has(c));
    await Promise.all(faltam.map((c) => getDoc(doc(db, 'certificados', c)).then((x) => { if (x.exists()) docsCert.set(c, x.data()); }).catch(() => null)));
    const certs = itens.map((i) => docsCert.get(i.codigo)).filter(Boolean);
    const novas = await carregarAssinaturas(certs.filter((c) => (c.assinaturas || []).some((a) => a && a.uid && !(a.uid in assinaturas))), { db, doc, getDoc });
    assinaturas = { ...assinaturas, ...novas };
    if (g === geracao) desenhar(itens);
  }, (e) => { console.error(e); if (g === geracao) mensagem('Sem acesso aos certificados', 'Peça ao núcleo para conferir o vínculo da conta família.'); });
}

// Ordem da escada (do primeiro cordão ao atual): legado antes, depois por data.
function ordenar(itens) {
  const escada = escadaDe(dadosAlvo).map((c) => c.nome);
  return itens.slice().sort((a, b) => (escada.indexOf(a.cordao) - escada.indexOf(b.cordao)) || String(a.data || '').localeCompare(String(b.data || '')));
}

function desenhar(itensBrutos) {
  const itens = ordenar(itensBrutos);
  const nome = nomeBonito(dadosAlvo.nome || (alvos.find((a) => a.uid === alvoUid) || {}).nome || 'Atleta');
  const atual = dadosAlvo.cordaoAtual || (itens.length ? itens[itens.length - 1].cordao : 'Iniciante');
  const escada = escadaDe(dadosAlvo);
  const iAtual = Math.max(0, escada.findIndex((c) => c.nome === atual));
  const temCert = new Set(itens.map((i) => i.cordao));
  const familia = alvos.length > 1 ? `<nav class="familia" aria-label="Escolher atleta">${alvos.map((a) => `<button type="button" class="chip-pessoa" data-alvo="${esc(a.uid)}" aria-pressed="${a.uid === alvoUid}"><span class="av">${a.foto ? `<img src="${esc(a.foto)}" alt="">` : esc(iniciais(a.nome))}</span>${esc(a.eu ? 'Eu' : String(a.nome).split(' ')[0])}</button>`).join('')}</nav>` : '';
  const trilha = escada.slice(1).map((c, i) => `${i ? '<span class="seta" aria-hidden="true">›</span>' : ''}<span class="degrau${i + 1 > iAtual ? ' falta' : ''}${c.nome === atual ? ' atual' : ''}" title="${esc(c.nome)}${temCert.has(c.nome) ? ' — certificado emitido' : ''}"><i style="background:${listras(c.cor)}"></i>${esc(c.nome)}</span>`).join('');
  const codigos = itens.map((i) => i.codigo);
  const cartoes = itens.slice().reverse().map((i) => {
    const c = docsCert.get(i.codigo);
    const cores = coresOk(c && c.cores ? c.cores : coresDoCordao(i.cordao, dadosAlvo));
    const legado = i.legado === true || !i.data;
    const info = legado ? 'Graduação conquistada antes do registro digital do grupo.' : [dataBR(i.data), i.evento].filter(Boolean).join(' · ');
    return `<article class="cartao">
      <a class="miniatura" href="certificado.html#${esc(encodeURIComponent(i.codigo))}" aria-label="Abrir o certificado do Cordão ${esc(i.cordao)}">${c ? certificadoHtml(c, { qr: qrSvg(linkCert(i.codigo), { nivel: 'Q', margem: 0, cor: '#061A3A', rotulo: '' }), assinaturas }) : ''}</a>
      <div class="cartao-corpo">
        <div class="cartao-tit"><i style="background:${listras(cores)}" aria-hidden="true"></i><b>Cordão ${esc(i.cordao)}</b></div>
        <p class="cartao-info">${esc(info)}</p>
        <span><span class="etiqueta${legado ? ' legado' : ''}">${legado ? 'ANTERIOR AO APP' : (i.evento && /batizado/i.test(i.evento) ? 'BATIZADO' : 'GRADUAÇÃO')}</span> <small class="mono" style="color:var(--suave);font-size:11.5px;margin-left:6px">${esc((c && c.numero) || i.numero || '')}</small></span>
        <div class="cartao-bts">
          <a class="bt bt-marinho" href="certificado.html#${esc(encodeURIComponent(i.codigo))}">Ver</a>
          <a class="bt bt-claro" href="certificado.html?imprimir=1#${esc(encodeURIComponent(i.codigo))}">PDF</a>
          <button type="button" class="bt bt-verde" data-card="${esc(i.codigo)}">Card</button>
        </div>
      </div>
    </article>`;
  }).join('');
  pagina.innerHTML = `${familia}
    <section class="resumo" aria-labelledby="titResumo">
      <small>CERTIFICADOS DE GRADUAÇÃO</small>
      <h1 id="titResumo"><em>${esc(nome)}</em> · ${itens.length ? `${itens.length} ${itens.length === 1 ? 'certificado' : 'certificados'}` : 'nenhum certificado ainda'}</h1>
      <div class="trilha" aria-label="Trajetória de cordões">${trilha}</div>
      ${itens.length > 1 ? `<div class="acoes-topo"><a class="bt bt-verde" href="certificado.html?imprimir=1#${esc(codigos.map(encodeURIComponent).join(','))}">Baixar todos em PDF (${itens.length})</a></div>` : ''}
    </section>
    <p class="status" id="status" aria-live="polite"></p>
    ${itens.length ? `<div class="grade">${cartoes}</div>` : `<div class="vazio"><b>Ainda não há certificados</b><p>O certificado sai sozinho quando o responsável do núcleo registra a troca de cordão. Graduações de antes do app também ganham o seu certificado.</p></div>`}`;
  ajustarMiniaturas();
  pagina.querySelectorAll('[data-alvo]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.alvo !== alvoUid) selecionar(b.dataset.alvo); }));
  pagina.querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => card(b, b.dataset.card)));
}

// A folha tem 1123×794; a miniatura encolhe para a largura do cartão.
function ajustarMiniaturas() {
  pagina.querySelectorAll('.miniatura').forEach((m) => {
    const cert = m.querySelector('.cert'); const k = m.clientWidth / 1123;
    if (cert) cert.style.transform = `scale(${k})`;
    m.style.height = `${Math.round(794 * k)}px`;
  });
}
let tRes = null;
window.addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(ajustarMiniaturas, 120); });

async function card(botao, codigo) {
  const c = docsCert.get(codigo); if (!c) return;
  const status = (t) => { const s = document.getElementById('status'); if (s) s.textContent = t; };
  botao.disabled = true; status('Preparando o card…');
  try {
    const blob = await gerarCardStory({ tipo: 'cordao', nome: c.nome, cordao: c.cordao, cores: coresOk(c.cores), eyebrow: c.evento && c.evento.nome ? (/batizado/i.test(c.evento.nome) ? 'BATIZADO' : 'TROCA DE CORDÃO') : 'MEU CORDÃO' });
    const arquivo = `cordao-${String(c.cordao).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}.png`;
    const r = await compartilharImagem(blob, { texto: `Cordão ${c.cordao} — Grupo de Capoeira ${ESCOLA.nomeCurto}. ${ESCOLA.fraseCelebracao}`, link: linkCert(codigo), arquivo });
    if (r === 'sem-suporte') { baixarImagem(blob, arquivo); status('Imagem baixada: publique nos stories pela galeria.'); } else status(r === 'compartilhado' ? 'Compartilhado!' : '');
  } catch (e) { console.error(e); status('Não deu para gerar o card agora.'); }
  botao.disabled = false;
}
