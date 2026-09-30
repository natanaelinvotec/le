/* card-story.js — imagem 1080×1920 para stories/WhatsApp ("Troquei de cordão!",
"Conquistei um brasão!") e o compartilhamento dela. Desenhada no aparelho
(canvas), sem servidor e sem biblioteca externa.

  const blob = await gerarCardStory({ tipo: 'cordao', nome, cordao, cores, eyebrow })
  const blob = await gerarCardStory({ tipo: 'brasao', nome, brasaoNome, brasaoImg, nivel })
  await compartilharImagem(blob, { texto, link, arquivo })  → 'compartilhado' | 'cancelado' | 'sem-suporte'
  linkWhatsApp(texto, link) · baixarImagem(blob, nome) */
import { ESCOLA } from './escola.js';

const W = 1080; const H = 1920;
const BRASAO_GRUPO = 'assets/marca/brasao-1024.png';
const INSTAGRAM = '@capoeiraliberdadeeexpressao';

let fontesProntas = null;
function carregarFontes() {
  if (fontesProntas) return fontesProntas;
  if (!document.querySelector('link[data-fontes-card]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.fontesCard = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Manrope:wght@700;800&family=Instrument+Serif:ital@1&display=swap';
    document.head.appendChild(l);
  }
  const pedir = ['800 120px Sora', '700 40px Sora', '800 30px Manrope', '700 30px Manrope', 'italic 100px "Instrument Serif"'];
  fontesProntas = Promise.race([
    Promise.all(pedir.map((f) => document.fonts.load(f).catch(() => null))),
    new Promise((r) => setTimeout(r, 2500)), // sem internet: segue com a fonte do sistema
  ]);
  return fontesProntas;
}

function imagem(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const i = new Image();
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i); i.onerror = () => resolve(null);
    i.src = src;
  });
}

// Texto centralizado que diminui até caber na largura.
function textoCentral(cx, txt, y, { fonte, tamanho, max = 920, cor = '#FFFFFF', minimo = 40 }) {
  let t = tamanho;
  do { cx.font = fonte.replace('{t}', t); t -= 4; } while (cx.measureText(txt).width > max && t > minimo);
  cx.fillStyle = cor; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
  cx.fillText(txt, W / 2, y);
}
function espacado(cx, txt, y, fonte, cor, espaco) {
  cx.font = fonte; cx.fillStyle = cor; cx.textAlign = 'left';
  const letras = [...txt]; const larg = letras.reduce((s, l) => s + cx.measureText(l).width, 0) + espaco * (letras.length - 1);
  let x = (W - larg) / 2;
  letras.forEach((l) => { cx.fillText(l, x, y); x += cx.measureText(l).width + espaco; });
}
function retanguloRedondo(cx, x, y, w, h, r) {
  cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath();
}
// Cordão trançado: listras a 45° nas 3 cores + sombra de corda.
function cordaoTrancado(cx, x, y, w, h, cores, passo = 22) {
  cx.save();
  retanguloRedondo(cx, x, y, w, h, h / 2); cx.clip();
  for (let i = -h * 2, n = 0; i < w + h * 2; i += passo, n++) {
    cx.fillStyle = cores[n % 3];
    cx.beginPath(); cx.moveTo(x + i, y + h); cx.lineTo(x + i + h, y); cx.lineTo(x + i + h + passo, y); cx.lineTo(x + i + passo, y + h); cx.closePath(); cx.fill();
  }
  const g = cx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.3)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
  cx.fillStyle = g; cx.fillRect(x, y, w, h);
  cx.restore();
  const claro = cores.every((c) => /^#(f|e|d)/i.test(c));
  if (claro) { cx.save(); retanguloRedondo(cx, x, y, w, h, h / 2); cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 3; cx.stroke(); cx.restore(); }
}

export async function gerarCardStory(d) {
  await carregarFontes();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const cx = c.getContext('2d');
  // fundo marinho com luz no topo
  const g = cx.createRadialGradient(W / 2, 420, 60, W / 2, 420, 1300);
  g.addColorStop(0, '#0E3172'); g.addColorStop(0.62, '#061A3A'); g.addColorStop(1, '#04122B');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  cx.strokeStyle = 'rgba(127,211,199,.16)'; cx.lineWidth = 2;
  [400, 500].forEach((r) => { cx.beginPath(); cx.arc(W / 2, 470, r, 0, Math.PI * 2); cx.stroke(); });

  const cores = Array.isArray(d.cores) && d.cores.length === 3 ? d.cores : ['#4F4F4F', '#DAA520', '#D32F2F'];
  const ehBrasao = d.tipo === 'brasao';

  // peça principal
  if (ehBrasao) {
    const img = await imagem(d.brasaoImg);
    const brilho = cx.createRadialGradient(W / 2, 470, 20, W / 2, 470, 380);
    brilho.addColorStop(0, 'rgba(218,165,32,.45)'); brilho.addColorStop(1, 'rgba(218,165,32,0)');
    cx.fillStyle = brilho; cx.fillRect(0, 60, W, 820);
    if (img) { const t = 560; const r = img.width / img.height; const w = r >= 1 ? t : t * r; const h = r >= 1 ? t / r : t; cx.drawImage(img, (W - w) / 2, 470 - h / 2, w, h); }
  } else {
    const img = await imagem(BRASAO_GRUPO);
    cx.save(); cx.shadowColor = 'rgba(0,0,0,.6)'; cx.shadowBlur = 60; cx.shadowOffsetY = 30;
    cx.fillStyle = '#FFFFFF'; cx.beginPath(); cx.arc(W / 2, 300, 150, 0, Math.PI * 2); cx.fill(); cx.restore();
    cx.strokeStyle = 'rgba(255,255,255,.08)'; cx.lineWidth = 28; cx.beginPath(); cx.arc(W / 2, 300, 164, 0, Math.PI * 2); cx.stroke();
    if (img) { cx.save(); cx.beginPath(); cx.arc(W / 2, 300, 140, 0, Math.PI * 2); cx.clip(); cx.drawImage(img, W / 2 - 140, 160, 280, 280); cx.restore(); }
  }

  // títulos
  const topoTexto = ehBrasao ? 940 : 570;
  espacado(cx, String(d.eyebrow || (ehBrasao ? 'BRASÃO NOVO' : 'BATIZADO')).toUpperCase(), topoTexto, '800 30px Manrope, sans-serif', '#7FD3C7', 9);
  const linhas = ehBrasao ? ['Conquistei', 'um brasão!'] : ['Troquei de', 'cordão!'];
  linhas.forEach((l, i) => textoCentral(cx, l, topoTexto + 140 + i * 122, { fonte: '800 {t}px Sora, sans-serif', tamanho: 124 }));

  // cordão atravessando (troca) ou faixa dourada (brasão)
  cx.save(); cx.translate(W / 2, ehBrasao ? 1312 : 1040); cx.rotate((ehBrasao ? -7 : -11) * Math.PI / 180);
  cx.shadowColor = 'rgba(0,0,0,.6)'; cx.shadowBlur = 40; cx.shadowOffsetY = 24;
  if (ehBrasao) { cordaoTrancado(cx, -700, -18, 1400, 36, ['#DAA520', '#F2C94C', '#B8860B'], 18); }
  else cordaoTrancado(cx, -700, -32, 1400, 64, cores);
  cx.restore();

  // nome + selo
  const yNome = ehBrasao ? 1478 : 1320;
  textoCentral(cx, String(d.nome || 'Atleta'), yNome, { fonte: 'italic {t}px "Instrument Serif", Georgia, serif', tamanho: 104, max: 940 });
  const rotulo = ehBrasao ? String(d.brasaoNome || 'Brasão') + (d.nivel ? ` · ${d.nivel}` : '') : `Cordão ${d.cordao || ''}`;
  cx.font = '800 44px Sora, sans-serif';
  const larg = Math.min(940, cx.measureText(rotulo).width + (ehBrasao ? 80 : 190));
  const px = (W - larg) / 2; const py = yNome + 50;
  cx.fillStyle = 'rgba(255,255,255,.1)'; retanguloRedondo(cx, px, py, larg, 96, 48); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,.14)'; cx.lineWidth = 2; cx.stroke();
  if (!ehBrasao) cordaoTrancado(cx, px + 24, py + 31, 110, 34, cores, 12);
  cx.fillStyle = '#FFFFFF'; cx.textAlign = ehBrasao ? 'center' : 'left'; cx.textBaseline = 'middle';
  let tRot = 44; while (cx.measureText(rotulo).width > larg - (ehBrasao ? 60 : 170) && tRot > 26) { tRot -= 2; cx.font = `800 ${tRot}px Sora, sans-serif`; }
  cx.fillText(rotulo, ehBrasao ? W / 2 : px + 158, py + 50);
  cx.textBaseline = 'alphabetic';

  // rodapé
  textoCentral(cx, `Grupo de Capoeira ${ESCOLA.nomeCurto}`, H - 250, { fonte: '800 {t}px Sora, sans-serif', tamanho: 40 });
  textoCentral(cx, `${ESCOLA.mestre} · ${ESCOLA.cidade} / ${ESCOLA.uf}`, H - 196, { fonte: '700 {t}px Manrope, sans-serif', tamanho: 32, cor: '#7FD3C7' });
  textoCentral(cx, INSTAGRAM, H - 130, { fonte: '700 {t}px Manrope, sans-serif', tamanho: 30, cor: '#00E676' });

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

export const linkWhatsApp = (texto, link) => `https://wa.me/?text=${encodeURIComponent([texto, link].filter(Boolean).join(' '))}`;

export function baixarImagem(blob, nome = 'capoeira-liberdade.png') {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

// Compartilha a imagem pelo menu do celular (Instagram, WhatsApp, Facebook…).
export async function compartilharImagem(blob, { texto = '', link = '', arquivo = 'capoeira-liberdade.png' } = {}) {
  try {
    const file = new File([blob], arquivo, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: [texto, link].filter(Boolean).join(' ') });
      return 'compartilhado';
    }
  } catch (e) { if (e && e.name === 'AbortError') return 'cancelado'; }
  return 'sem-suporte';
}
