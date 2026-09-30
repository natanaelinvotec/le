/* assinatura.js — assinatura REAL de quem assina os certificados (o Fundador,
Mestre Profeta, e o responsável de cada núcleo). A pessoa desenha com o dedo /
mouse ou envia a foto da assinatura no papel (o fundo branco vira transparente
e o traço fica azul-tinta). Vai para o Storage assinaturas/{uid}/… e o link em
assinaturas/{uid} — os certificados (novos e antigos) passam a mostrar a
imagem no lugar do nome em cursiva. Sem assinatura: continua o nome em cursiva.

  abrirAssinatura({ uid, nome, titulo, atual, toast }) → Promise<'salva'|'removida'|null> */
import { db, doc, setDoc, deleteDoc, enviarFoto, meuUid } from './firebase.js';

const TINTA = [11, 46, 112]; // #0B2E70, o azul da cursiva do certificado
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.ass-fundo{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(0,20,50,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:'Manrope',system-ui,sans-serif;animation:assEntra .3s cubic-bezier(.16,1,.3,1)}
@keyframes assEntra{from{opacity:0}}
.ass-caixa{width:100%;max-width:620px;max-height:94vh;overflow-y:auto;background:#fff;color:#0D211D;border-radius:24px;padding:22px 20px 20px;box-shadow:0 30px 80px -20px rgba(0,20,50,.5);display:flex;flex-direction:column;gap:14px;animation:assSobe .45s cubic-bezier(.16,1,.3,1)}
@keyframes assSobe{from{transform:translateY(30px);opacity:0}}
.ass-topo{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.ass-topo h2{margin:0;font:800 19px 'Sora',sans-serif;color:#002D72}
.ass-topo p{margin:4px 0 0;font-size:13px;line-height:1.5;color:#4A5D66}
.ass-x{flex:none;width:40px;height:40px;border:0;border-radius:12px;background:#EAF2F1;color:#002D72;font-size:20px;cursor:pointer}
.ass-abas{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;border-radius:14px;background:#EAF2F1}
.ass-abas button{height:40px;border:0;border-radius:11px;background:transparent;color:#002D72;font:800 13.5px 'Manrope',sans-serif;cursor:pointer;transition:background .3s cubic-bezier(.16,1,.3,1)}
.ass-abas button[aria-selected="true"]{background:#fff;box-shadow:0 2px 8px -2px rgba(0,45,114,.25)}
.ass-papel{position:relative;border-radius:16px;background:#F7FAF9;border:1.5px dashed #B9CCC8;overflow:hidden;touch-action:none}
.ass-papel canvas{display:block;width:100%;height:220px;cursor:crosshair}
.ass-papel .linha{position:absolute;left:8%;right:8%;bottom:54px;height:1px;background:#0D211D;opacity:.5;pointer-events:none}
.ass-papel .dica{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:12px;color:#7A8C88;pointer-events:none}
.ass-foto{display:flex;flex-direction:column;gap:10px}
.ass-foto label.ass-arquivo{display:flex;align-items:center;justify-content:center;gap:8px;height:54px;border-radius:14px;border:1.5px dashed #389E92;color:#1F6F66;font-weight:800;font-size:14px;cursor:pointer;background:#F2FAF8}
.ass-foto input{position:absolute;width:1px;height:1px;opacity:0}
.ass-foto small{font-size:12px;line-height:1.5;color:#4A5D66}
.ass-foto .limiar{display:flex;align-items:center;gap:10px;font-size:12.5px;font-weight:700;color:#4A5D66}
.ass-foto .limiar input{position:static;width:auto;height:auto;opacity:1;flex:1;accent-color:#389E92}
.ass-previa{display:flex;flex-direction:column;gap:6px;padding:14px 18px 12px;border-radius:14px;background:#F7FAF9;border:1px solid #D3E2DF}
.ass-previa small.rot{font-size:10.5px;font-weight:800;letter-spacing:.16em;color:#389E92}
.ass-previa .risco{height:60px;display:flex;align-items:flex-end}
.ass-previa .risco img{max-height:60px;max-width:100%;object-fit:contain;margin-bottom:-8px}
.ass-previa .risco span{font:italic 400 30px/1 'Instrument Serif',Georgia,serif;color:#0B2E70}
.ass-previa hr{margin:0;border:0;height:1px;background:#0D211D}
.ass-previa b{font-size:13px}.ass-previa em{font-style:normal;font-size:12px;color:#4A5D66}
.ass-bts{display:flex;flex-wrap:wrap;gap:8px}
.ass-bts button{height:46px;padding:0 16px;border:0;border-radius:13px;font:800 14px 'Manrope',sans-serif;cursor:pointer}
.ass-bts .salvar{flex:1;background:#00E676;color:#002D72}
.ass-bts .limpar{background:#EAF2F1;color:#002D72}
.ass-bts .remover{background:transparent;color:#B3261E;box-shadow:inset 0 0 0 1.5px rgba(179,38,30,.35)}
.ass-bts [disabled]{opacity:.5;cursor:not-allowed}
.ass-status{min-height:18px;margin:0;font-size:12.5px;font-weight:700;color:#1F6F66}
.ass-status.erro{color:#B3261E}
.ass-fundo [hidden]{display:none!important}
.ass-fundo :focus-visible{outline:3px solid #00E676;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.ass-fundo,.ass-caixa{animation:none}}`;
function garantirCss() {
  if (document.getElementById('le-ass-css')) return;
  const s = document.createElement('style'); s.id = 'le-ass-css'; s.textContent = CSS; document.head.appendChild(s);
}

// Recorta a área com tinta (pixels não transparentes) + margem. null se vazio.
function recortar(canvas, margem = 12) {
  const cx = canvas.getContext('2d'); const { width: w, height: h } = canvas;
  const d = cx.getImageData(0, 0, w, h).data;
  let x0 = w; let y0 = h; let x1 = -1; let y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0 || (x1 - x0) < 20 || (y1 - y0) < 6) return null;
  x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem); x1 = Math.min(w - 1, x1 + margem); y1 = Math.min(h - 1, y1 + margem);
  // Tamanho final: até 900×300 (fica leve e nítido no A4).
  const k = Math.min(1, 900 / (x1 - x0 + 1), 300 / (y1 - y0 + 1));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round((x1 - x0 + 1) * k)); out.height = Math.max(1, Math.round((y1 - y0 + 1) * k));
  const oc = out.getContext('2d'); oc.imageSmoothingQuality = 'high';
  oc.drawImage(canvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, out.width, out.height);
  return out;
}

// Foto da assinatura no papel → traço azul-tinta com fundo transparente.
// limiar (0–255): quanto mais alto, mais "claro" ainda conta como tinta.
function limparFoto(img, limiar) {
  const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0, c.width, c.height);
  const dados = cx.getImageData(0, 0, c.width, c.height); const p = dados.data;
  // Fundo de referência: o tom mais claro comum da foto (papel com sombra não vira tinta).
  let soma = 0; let n = 0;
  for (let i = 0; i < p.length; i += 4 * 37) { const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; if (l > 120) { soma += l; n++; } }
  const papel = n ? soma / n : 235;
  const corte = Math.min(papel - 12, limiar);
  for (let i = 0; i < p.length; i += 4) {
    const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const a = l >= corte ? 0 : Math.min(255, Math.round(((corte - l) / Math.max(20, corte - 40)) * 255 * 1.4));
    p[i] = TINTA[0]; p[i + 1] = TINTA[1]; p[i + 2] = TINTA[2]; p[i + 3] = a;
  }
  cx.putImageData(dados, 0, 0);
  return c;
}

export function abrirAssinatura({ uid, nome, titulo, atual = '', toast = () => {} }) {
  garantirCss();
  return new Promise((terminou) => {
    const raiz = document.createElement('div');
    raiz.className = 'ass-fundo'; raiz.setAttribute('role', 'dialog'); raiz.setAttribute('aria-modal', 'true'); raiz.setAttribute('aria-labelledby', 'assTit');
    const propria = uid === meuUid();
    raiz.innerHTML = `<div class="ass-caixa">
      <div class="ass-topo"><div><h2 id="assTit">${propria ? 'Minha assinatura' : `Assinatura de ${esc(nome)}`}</h2><p>Aparece nos certificados de graduação, acima de <b>${esc(titulo || nome)}</b>. Sem assinatura, o certificado mostra o nome em cursiva.</p></div><button type="button" class="ass-x" data-a="fechar" aria-label="Fechar">×</button></div>
      <div class="ass-abas" role="tablist"><button type="button" role="tab" aria-selected="true" data-aba="desenhar">Desenhar</button><button type="button" role="tab" aria-selected="false" data-aba="foto">Foto do papel</button></div>
      <div data-painel="desenhar"><div class="ass-papel"><canvas id="assPad" aria-label="Área para assinar com o dedo ou o mouse"></canvas><i class="linha"></i><span class="dica">Assine com o dedo ou com o mouse sobre a linha</span></div></div>
      <div data-painel="foto" class="ass-foto" hidden>
        <label class="ass-arquivo"><input type="file" id="assArquivo" accept="image/*">Escolher foto da assinatura</label>
        <small>Assine com caneta escura numa folha branca, fotografe de perto com boa luz e escolha a foto. O fundo some sozinho.</small>
        <label class="limiar">Traço fino <input type="range" id="assLimiar" min="90" max="220" value="170"> Traço forte</label>
      </div>
      <div class="ass-previa"><small class="rot">COMO FICA NO CERTIFICADO</small><div class="risco" id="assRisco">${atual ? `<img src="${esc(atual)}" alt="Assinatura atual">` : `<span>${esc(nome)}</span>`}</div><hr><b>${esc(titulo || nome)}</b><em>${esc(nome)}</em></div>
      <p class="ass-status" aria-live="polite"></p>
      <div class="ass-bts"><button type="button" class="limpar" data-a="limpar">Limpar</button>${atual ? '<button type="button" class="remover" data-a="remover">Remover assinatura</button>' : ''}<button type="button" class="salvar" data-a="salvar" disabled>Salvar assinatura</button></div>
    </div>`;
    document.body.appendChild(raiz);
    const $ = (s) => raiz.querySelector(s);
    const status = (t, erro = false) => { const s = $('.ass-status'); s.textContent = t; s.classList.toggle('erro', erro); };
    let aba = 'desenhar'; let resultado = null; let fotoImg = null;

    // ----- bloco de desenho (pointer events: dedo, caneta e mouse) -----
    const pad = $('#assPad'); const pc = pad.getContext('2d');
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const medir = () => { const r = pad.getBoundingClientRect(); pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr); pc.setTransform(dpr, 0, 0, dpr, 0, 0); pc.lineCap = 'round'; pc.lineJoin = 'round'; pc.strokeStyle = `rgb(${TINTA.join(',')})`; };
    medir();
    let desenhando = false; let ult = null; let rabiscou = false;
    const ponto = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure && e.pressure !== 0.5 ? e.pressure : 0.5 }; };
    pad.addEventListener('pointerdown', (e) => { desenhando = true; ult = ponto(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
    pad.addEventListener('pointermove', (e) => {
      if (!desenhando) return;
      const pts = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      pts.forEach((ev) => {
        const q = ponto(ev);
        const vel = Math.hypot(q.x - ult.x, q.y - ult.y);
        pc.lineWidth = Math.max(1.4, Math.min(3.6, 3.4 - vel * 0.06)) * (0.7 + q.p * 0.6); // traço mais fino quando rápido, como caneta
        pc.beginPath(); pc.moveTo(ult.x, ult.y); pc.quadraticCurveTo(ult.x, ult.y, (ult.x + q.x) / 2, (ult.y + q.y) / 2); pc.lineTo(q.x, q.y); pc.stroke();
        ult = q;
      });
      rabiscou = true; atualizarPrevia();
    });
    const soltar = () => { desenhando = false; };
    pad.addEventListener('pointerup', soltar); pad.addEventListener('pointercancel', soltar);

    let tPrev = null;
    function atualizarPrevia() {
      clearTimeout(tPrev);
      tPrev = setTimeout(() => {
        const origem = aba === 'desenhar' ? (rabiscou ? pad : null) : (fotoImg ? limparFoto(fotoImg, Number($('#assLimiar').value)) : null);
        resultado = origem ? recortar(origem, aba === 'desenhar' ? Math.round(10 * dpr) : 16) : null;
        $('#assRisco').innerHTML = resultado ? `<img src="${resultado.toDataURL('image/png')}" alt="Prévia da assinatura">` : (atual ? `<img src="${esc(atual)}" alt="Assinatura atual">` : `<span>${esc(nome)}</span>`);
        $('[data-a="salvar"]').disabled = !resultado;
        if (aba === 'foto' && fotoImg && !resultado) status('Não encontrei o traço na foto. Ajuste o controle "Traço forte" ou tire outra foto com mais luz.', true); else status('');
      }, aba === 'desenhar' ? 120 : 60);
    }

    // ----- foto do papel -----
    $('#assArquivo').addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { status('Escolha uma imagem (foto).', true); return; }
      const u = URL.createObjectURL(f); const img = new Image();
      img.onload = () => { fotoImg = img; URL.revokeObjectURL(u); atualizarPrevia(); };
      img.onerror = () => { URL.revokeObjectURL(u); status('Não consegui abrir esta imagem.', true); };
      img.src = u;
    });
    $('#assLimiar').addEventListener('input', atualizarPrevia);

    const fechar = (valor = null) => { raiz.remove(); document.removeEventListener('keydown', tecla); terminou(valor); };
    const tecla = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    raiz.addEventListener('click', async (e) => {
      if (e.target === raiz) { fechar(); return; }
      const t = e.target.closest('[data-aba],[data-a]'); if (!t) return;
      if (t.dataset.aba) {
        aba = t.dataset.aba;
        raiz.querySelectorAll('[data-aba]').forEach((b) => b.setAttribute('aria-selected', String(b === t)));
        raiz.querySelectorAll('[data-painel]').forEach((p) => { p.hidden = p.dataset.painel !== aba; });
        if (aba === 'desenhar') medir();
        rabiscou = false; atualizarPrevia(); return;
      }
      const a = t.dataset.a;
      if (a === 'fechar') { fechar(); return; }
      if (a === 'limpar') { pc.clearRect(0, 0, pad.width, pad.height); rabiscou = false; fotoImg = null; $('#assArquivo').value = ''; atualizarPrevia(); return; }
      if (a === 'remover') {
        if (!confirm('Remover a assinatura? Os certificados voltam a mostrar o nome em cursiva.')) return;
        t.disabled = true;
        try { await deleteDoc(doc(db, 'assinaturas', uid)); toast('Assinatura removida.', 'success'); fechar('removida'); } catch (er) { console.error(er); status('Não foi possível remover agora.', true); t.disabled = false; }
        return;
      }
      if (a === 'salvar' && resultado) {
        t.disabled = true; status('Enviando a assinatura…');
        try {
          const url = await enviarFoto(`assinaturas/${uid}/assinatura-${Date.now()}.png`, resultado.toDataURL('image/png'));
          await setDoc(doc(db, 'assinaturas', uid), { url, nome: String(nome || '').slice(0, 120), atualizadoEm: new Date().toISOString(), porUid: meuUid() });
          toast('Assinatura salva! Ela já aparece nos certificados.', 'success');
          fechar('salva');
        } catch (er) {
          console.error(er);
          status(/permission|unauthorized/i.test(String(er && (er.code || er.message))) ? 'Sem permissão: só a própria pessoa (responsável de núcleo ou Fundador) ou o Admin Master grava a assinatura.' : 'Não foi possível salvar agora. Confira a internet e tente de novo.', true);
          t.disabled = false;
        }
      }
    });
    setTimeout(() => { const b = raiz.querySelector('[data-aba="desenhar"]'); if (b) b.focus(); }, 60);
  });
}
