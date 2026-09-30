/* certificado.js — certificado.html#CODIGO: mostra, imprime/salva em PDF e
confere o certificado de graduação. Lê UM documento certificados/{codigo}
(as regras não deixam listar) com o Firestore Lite, sem login.
O card de stories e o WhatsApp usam js/card-story.js. */
import { FIREBASE_CONFIG, ESCOLA } from './escola.js';
import { qrSvg } from './qr.js';
import { gerarCardStory, compartilharImagem, linkWhatsApp, baixarImagem } from './card-story.js';

const pagina = document.getElementById('pagina');
const selo = document.getElementById('seloOk');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let codigo = '';
try { codigo = decodeURIComponent(location.hash.slice(1)).trim().toUpperCase(); } catch (e) { codigo = ''; }
const imprimirJa = new URLSearchParams(location.search).get('imprimir') === '1';
const BRASAO = 'assets/marca/brasao-1024.png';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataLonga = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : ''; };
const cores = (c) => (Array.isArray(c) && c.length === 3 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x))) ? c : ['#4F4F4F', '#DAA520', '#D32F2F']);
const listras = (c, p = 9) => `repeating-linear-gradient(45deg,${c[0]} 0 ${p}px,${c[1]} ${p}px ${p * 2}px,${c[2]} ${p * 2}px ${p * 3}px)`;
const sombraV = 'linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.35))';
const sombraH = 'linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.3))';
const linkLimpo = () => `${location.origin}${location.pathname}#${encodeURIComponent(codigo)}`;

function aviso(titulo, texto) {
  pagina.innerHTML = `<div class="aviso"><b>${esc(titulo)}</b><p>${esc(texto)}</p><a class="bt bt-marinho" href="index.html" style="align-self:center">Conhecer o grupo</a></div>`;
}

function seloAno(ano) {
  return `<svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Selo ${esc(ano)}">
    <defs><path id="arcoSelo" d="M64 64 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0"></path></defs>
    <circle cx="64" cy="64" r="62" fill="#DAA520"></circle>
    <circle cx="64" cy="64" r="58" fill="none" stroke="#FFF6D6" stroke-width="1.5" stroke-dasharray="3 3"></circle>
    <circle cx="64" cy="64" r="38" fill="#B8860B"></circle>
    <text font-family="Manrope, sans-serif" font-size="9.5" font-weight="800" letter-spacing="2.4" fill="#FFFFFF"><textPath href="#arcoSelo">LIBERDADE E EXPRESSÃO · CAPOEIRA ·</textPath></text>
    <text x="64" y="60" text-anchor="middle" font-family="Sora, sans-serif" font-size="11" font-weight="800" fill="#FFF6D6">GRADUAÇÃO</text>
    <text x="64" y="78" text-anchor="middle" font-family="Sora, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${esc(ano)}</text>
  </svg>`;
}

function desenhar(c) {
  const cor = cores(c.cores);
  const ev = c.evento && c.evento.nome ? c.evento : null;
  const quando = dataLonga(c.data);
  const onde = ev ? `no <b>${esc(ev.nome)}</b>, realizado em ${esc(quando)}` : `em ${esc(quando)}`;
  const nucleo = c.nucleo ? `, pelo núcleo <b>${esc(String(c.nucleo).replace(/^\s*(academia|núcleo|nucleo)\s+/i, ''))}</b>` : '';
  const assinaturas = (Array.isArray(c.assinaturas) ? c.assinaturas : []).slice(0, 2);
  const qr = qrSvg(linkLimpo(), { nivel: 'Q', margem: 0, cor: '#061A3A', rotulo: 'QR de verificação do certificado' });
  const ano = String(c.data || '').slice(0, 4);
  document.title = `Certificado — ${c.nome} · Cordão ${c.cordao}`;
  selo.hidden = false;
  selo.classList.toggle('ruim', c.ativo === false);
  selo.textContent = c.ativo === false ? 'Certificado cancelado' : '✓ Certificado autêntico';
  pagina.innerHTML = `
    <div class="acoes nao-imprime">
      <button type="button" class="bt bt-verde" id="btImprimir">Imprimir ou salvar PDF</button>
      <button type="button" class="bt bt-marinho" id="btStory">Card de stories</button>
      <a class="bt bt-zap" id="btZap" target="_blank" rel="noopener">WhatsApp</a>
    </div>
    <p class="status" id="status" aria-live="polite"></p>
    <div class="folha-caixa" id="caixa"><article class="cert" id="cert" aria-label="Certificado de graduação">
      <div class="gui"></div>
      <div class="faixa">
        <div class="corda" style="background:${sombraV},${listras(cor)}"></div>
        <div class="no" style="background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.35),rgba(0,0,0,0) 55%),${listras(cor)}"></div>
        <div class="franja" style="background:repeating-linear-gradient(90deg,${cor[0]} 0 3px,${cor[1]} 3px 6px,${cor[2]} 6px 9px)"></div>
        <img class="faixa-brasao" src="${BRASAO}" alt="">
      </div>
      <div class="moldura1"></div><div class="moldura2"></div>
      <img class="dagua" src="${BRASAO}" alt="">
      <div class="miolo">
        <div class="topo">
          <div class="grupo"><img src="${BRASAO}" alt="Brasão do grupo"><span><small>GRUPO DE CAPOEIRA</small><b>${esc(ESCOLA.nomeCurto)}</b><em>Fundador: ${esc(ESCOLA.mestre)} · ${esc(ESCOLA.cidade)} / ${esc(ESCOLA.uf)}</em></span></div>
          <div class="numero"><small>CERTIFICADO Nº</small><b>${esc(c.numero)}</b></div>
        </div>
        <div class="texto">
          <span class="eyebrow">CERTIFICADO DE GRADUAÇÃO</span>
          <span class="certificamos">Certificamos que</span>
          <span class="nome${String(c.nome).length > 28 ? ' longo' : ''}">${esc(c.nome)}</span>
          <span class="recebeu">recebeu ${onde}${nucleo}, a graduação de</span>
          <div class="linha-cordao"><span>Cordão ${esc(c.cordao)}</span><i style="background:${sombraH},${listras(cor)}"></i></div>
          <span class="criterios">Graduação avaliada pelo seu mestre nos critérios do grupo: fundamentos, jogo, musicalidade, história e filosofia da capoeira.</span>
        </div>
        <div class="base${assinaturas.length < 2 ? ' uma' : ''}">
          ${assinaturas.map((a) => `<div class="assinatura"><span class="cursiva">${esc(a.nome)}</span><hr><b>${esc(a.nome)}</b><small>${esc(a.papel)}</small></div>`).join('')}
          ${assinaturas.length < 2 ? '<div></div>' : ''}
          ${seloAno(ano)}
          <div class="autentica"><div class="qr">${qr}</div><span><small>AUTENTICIDADE</small><p>Aponte a câmera para conferir na página oficial.</p></span></div>
        </div>
      </div>
      ${c.ativo === false ? '<div class="cancelado"><span>CANCELADO</span></div>' : ''}
    </article></div>`;
  ajustarEscala();
  const texto = `Troquei de cordão: Cordão ${c.cordao}! Grupo de Capoeira ${ESCOLA.nomeCurto}. ${ESCOLA.fraseCelebracao}`;
  document.getElementById('btZap').href = linkWhatsApp(texto, linkLimpo());
  document.getElementById('btImprimir').addEventListener('click', () => window.print());
  const status = (t) => { document.getElementById('status').textContent = t; };
  document.getElementById('btStory').addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; status('Preparando a imagem…');
    try {
      const blob = await gerarCardStory({ tipo: 'cordao', nome: c.nome, cordao: c.cordao, cores: cor, eyebrow: ev ? 'BATIZADO' : 'TROCA DE CORDÃO' });
      const arquivo = `troquei-de-cordao-${String(c.cordao).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
      const r = await compartilharImagem(blob, { texto, link: linkLimpo(), arquivo });
      if (r === 'sem-suporte') { baixarImagem(blob, arquivo); status('Imagem baixada: publique nos stories pela galeria.'); } else status(r === 'compartilhado' ? 'Compartilhado!' : '');
    } catch (er) { console.error(er); status('Não deu para gerar a imagem agora.'); }
    b.disabled = false;
  });
  // PDF só depois das fontes e do brasão carregados (senão sai com letra do sistema).
  if (imprimirJa) {
    const imgs = [...document.querySelectorAll('#cert img')].map((i) => (i.decode ? i.decode().catch(() => null) : null));
    Promise.race([Promise.all([document.fonts.ready, ...imgs]), new Promise((r) => setTimeout(r, 5000))]).then(() => setTimeout(() => window.print(), 150));
  }
}

// A folha tem tamanho real (1123×794); na tela ela encolhe para caber.
function ajustarEscala() {
  const caixa = document.getElementById('caixa'); const cert = document.getElementById('cert');
  if (!caixa || !cert) return;
  const k = Math.min(1, caixa.clientWidth / 1123);
  cert.style.transform = k < 1 ? `scale(${k})` : '';
  caixa.style.height = `${Math.round(794 * k)}px`;
}
window.addEventListener('resize', ajustarEscala);

async function conferir() {
  if (!/^[A-Z0-9]{6,20}$/.test(codigo)) { document.getElementById('carregando')?.remove(); aviso('Código inválido', 'Aponte a câmera para o QR impresso no certificado.'); return; }
  try {
    const [{ initializeApp }, { getFirestore, doc, getDoc }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-lite.js'),
    ]);
    const snap = await getDoc(doc(getFirestore(initializeApp(FIREBASE_CONFIG, 'certificado')), 'certificados', codigo));
    if (!snap.exists()) { aviso('Certificado não encontrado', 'Este código não existe ou foi cancelado. Confira com o núcleo do atleta.'); return; }
    desenhar(snap.data());
  } catch (e) {
    console.error(e);
    aviso('Sem conexão', 'Não foi possível conferir agora. Verifique a internet e tente de novo.');
  }
}
conferir();
window.addEventListener('hashchange', () => location.reload());
