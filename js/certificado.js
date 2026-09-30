/* certificado.js — certificado.html#CODIGO (um) ou #COD1,COD2,… (vários, PDF em
lote do painel): mostra, imprime/salva em PDF e confere o certificado de
graduação. Lê certificados/{codigo} (as regras não deixam listar) e as
assinaturas reais (assinaturas/{uid}) com o Firestore Lite, sem login.
O desenho está em js/certificado-render.js (idêntico ao mockup). */
import { FIREBASE_CONFIG, ESCOLA } from './escola.js';
import { qrSvg } from './qr.js';
import { gerarCardStory, compartilharImagem, linkWhatsApp, baixarImagem } from './card-story.js';
import { certificadoHtml, carregarAssinaturas, coresOk } from './certificado-render.js';

const pagina = document.getElementById('pagina');
const selo = document.getElementById('seloOk');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let codigos = [];
try { codigos = decodeURIComponent(location.hash.slice(1)).split(',').map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 80); } catch (e) { codigos = []; }
const imprimirJa = new URLSearchParams(location.search).get('imprimir') === '1';
const linkDe = (cod) => `${location.origin}${location.pathname}#${encodeURIComponent(cod)}`;

function aviso(titulo, texto) {
  pagina.innerHTML = `<div class="aviso"><b>${esc(titulo)}</b><p>${esc(texto)}</p><a class="bt bt-marinho" href="index.html" style="align-self:center">Conhecer o grupo</a></div>`;
}

function desenhar(lista, assinaturas) {
  const um = lista.length === 1;
  const c0 = lista[0].c;
  if (um) {
    document.title = `Certificado — ${c0.nome} · Cordão ${c0.cordao}`;
    selo.hidden = false;
    selo.classList.toggle('ruim', c0.ativo === false);
    selo.textContent = c0.ativo === false ? 'Certificado cancelado' : '✓ Certificado autêntico';
  } else {
    document.title = `Certificados de graduação (${lista.length})`;
    selo.hidden = false; selo.classList.remove('ruim'); selo.textContent = `${lista.length} certificados`;
  }
  pagina.innerHTML = `
    <div class="acoes nao-imprime">
      <button type="button" class="bt bt-verde" id="btImprimir">${um ? 'Imprimir ou salvar PDF' : `Imprimir ou salvar PDF (${lista.length})`}</button>
      ${um ? '<button type="button" class="bt bt-marinho" id="btStory">Card de stories</button><a class="bt bt-zap" id="btZap" target="_blank" rel="noopener">WhatsApp</a>' : ''}
    </div>
    <p class="status" id="status" aria-live="polite"></p>
    ${lista.map(({ cod, c }) => `<div class="folha-caixa">${certificadoHtml(c, { qr: qrSvg(linkDe(cod), { nivel: 'Q', margem: 0, cor: '#061A3A', rotulo: 'QR de verificação do certificado' }), assinaturas })}</div>`).join('')}`;
  ajustarEscala();
  document.getElementById('btImprimir').addEventListener('click', () => window.print());
  if (um) {
    const cor = coresOk(c0.cores);
    const texto = `Troquei de cordão: Cordão ${c0.cordao}! Grupo de Capoeira ${ESCOLA.nomeCurto}. ${ESCOLA.fraseCelebracao}`;
    document.getElementById('btZap').href = linkWhatsApp(texto, linkDe(lista[0].cod));
    const status = (t) => { document.getElementById('status').textContent = t; };
    document.getElementById('btStory').addEventListener('click', async (e) => {
      const b = e.currentTarget; b.disabled = true; status('Preparando a imagem…');
      try {
        const blob = await gerarCardStory({ tipo: 'cordao', nome: c0.nome, cordao: c0.cordao, cores: cor, eyebrow: c0.evento ? 'BATIZADO' : 'MEU CORDÃO' });
        const arquivo = `troquei-de-cordao-${String(c0.cordao).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
        const r = await compartilharImagem(blob, { texto, link: linkDe(lista[0].cod), arquivo });
        if (r === 'sem-suporte') { baixarImagem(blob, arquivo); status('Imagem baixada: publique nos stories pela galeria.'); } else status(r === 'compartilhado' ? 'Compartilhado!' : '');
      } catch (er) { console.error(er); status('Não deu para gerar a imagem agora.'); }
      b.disabled = false;
    });
  }
  // PDF só depois das fontes, do brasão e das assinaturas carregados.
  if (imprimirJa) {
    const imgs = [...document.querySelectorAll('.cert img')].map((i) => (i.decode ? i.decode().catch(() => null) : null));
    Promise.race([Promise.all([document.fonts.ready, ...imgs]), new Promise((r) => setTimeout(r, 6000))]).then(() => setTimeout(() => window.print(), 200));
  }
}

// A folha tem tamanho real (1123×794); na tela ela encolhe para caber.
function ajustarEscala() {
  document.querySelectorAll('.folha-caixa').forEach((caixa) => {
    const cert = caixa.querySelector('.cert'); if (!cert) return;
    const k = Math.min(1, caixa.clientWidth / 1123);
    cert.style.transform = k < 1 ? `scale(${k})` : '';
    caixa.style.height = `${Math.round(794 * k)}px`;
  });
}
window.addEventListener('resize', ajustarEscala);

async function conferir() {
  const validos = codigos.filter((c) => /^[A-Z0-9]{6,20}$/.test(c));
  if (!validos.length) { aviso('Código inválido', 'Aponte a câmera para o QR impresso no certificado.'); return; }
  try {
    const [{ initializeApp }, { getFirestore, doc, getDoc }] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-lite.js'),
    ]);
    const db = getFirestore(initializeApp(FIREBASE_CONFIG, 'certificado'));
    const achados = (await Promise.all(validos.map((cod) => getDoc(doc(db, 'certificados', cod)).then((s) => (s.exists() ? { cod, c: s.data() } : null)).catch(() => null)))).filter(Boolean);
    if (!achados.length) { aviso('Certificado não encontrado', 'Este código não existe ou foi cancelado. Confira com o núcleo do atleta.'); return; }
    const assinaturas = await carregarAssinaturas(achados.map((x) => x.c), { db, doc, getDoc });
    desenhar(achados, assinaturas);
  } catch (e) {
    console.error(e);
    aviso('Sem conexão', 'Não foi possível conferir agora. Verifique a internet e tente de novo.');
  }
}
// Voltar: para a tela de onde veio (app, Meus certificados, Rede, painel).
// Quem chegou pelo QR impresso (sem página anterior do site) vai para o início.
function voltar() {
  let veioDoSite = false;
  try { veioDoSite = !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1; } catch (e) { veioDoSite = false; }
  if (veioDoSite) history.back();
  else if (window.opener && history.length <= 1) window.close(); // aberto pelo painel (PDF em lote)
  else location.href = 'index.html';
}
const btVoltar = document.getElementById('btVoltar');
if (btVoltar) btVoltar.addEventListener('click', (e) => { e.preventDefault(); voltar(); });
// No celular: deslizar o dedo da borda esquerda para a direita também volta.
let toque = null;
document.addEventListener('touchstart', (e) => { const t = e.touches[0]; toque = t && t.clientX < 40 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!toque) return; const t = e.changedTouches[0];
  if (t && t.clientX - toque.x > 80 && Math.abs(t.clientY - toque.y) < 60) voltar();
  toque = null;
}, { passive: true });

conferir();
window.addEventListener('hashchange', () => location.reload());
