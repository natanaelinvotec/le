// imagem.js — REGRA ÚNICA DE IMAGENS do app e da AtletaPay (08/10/2026).
//
// Toda foto que sobe para o Storage passa por aqui antes do envio:
//   1. reduz para o tamanho do uso (PERFIS: perfil 540 px, post 1280 px, logo 512 px…);
//   2. grava em WebP quando o navegador sabe (25–35% menor que JPEG) e cai para
//      JPEG (ou PNG, se precisar de transparência) quando não sabe;
//   3. vai baixando a qualidade — e, se preciso, o tamanho — até caber no alvo em KB.
// O Storage (firebase/storage.rules) recusa arquivos acima do teto de cada pasta,
// e a rotina otimizarImagens do servidor reduz as fotos antigas.
//
// ATENÇÃO: atletapay/js/imagem.js é CÓPIA IDÊNTICA deste arquivo (o site da AtletaPay
// é servido em outra raiz). Mude os dois juntos — o teste de lógica confere.

// Tipos de foto. lado = maior lado em px; alvoKB = teto do arquivo; alfa = mantém
// transparência; formato 'jpeg' = força JPEG (carteirinha: a cópia pública é .jpg).
export const PERFIS = {
  perfil: { lado: 540, alvoKB: 60 },
  carteirinha: { lado: 800, alvoKB: 90, formato: 'jpeg' },
  post: { lado: 1280, alvoKB: 220 },
  story: { lado: 1080, alvoKB: 200 },
  capaRede: { lado: 1400, alvoKB: 220 },
  chat: { lado: 1024, alvoKB: 150 },
  capaVideo: { lado: 720, alvoKB: 70 },
  card: { lado: 1920, alvoKB: 260 },
  site: { lado: 1400, alvoKB: 240 },
  siteLarga: { lado: 1920, alvoKB: 320 },
  siteQuadrada: { lado: 700, alvoKB: 110 },
  sitePng: { lado: 900, alvoKB: 160, alfa: true },
  logo: { lado: 512, alvoKB: 120, alfa: true },
  fotoEscola: { lado: 1600, alvoKB: 280 },
};

const QUALIDADES = [0.82, 0.76, 0.7, 0.64, 0.58, 0.52];
const RODADAS = 4; // cada rodada sem caber reduz o tamanho em 15%

let webpOk = null;
export function suportaWebp() {
  if (webpOk === null) {
    try { const c = document.createElement('canvas'); c.width = c.height = 2; webpOk = c.toDataURL('image/webp', 0.8).startsWith('data:image/webp'); } catch (e) { webpOk = false; }
  }
  return webpOk;
}

export const bytesDataUrl = (d) => { const i = String(d).indexOf(','); return i < 0 ? 0 : Math.floor(((String(d).length - i - 1) * 3) / 4); };
export const extensaoDe = (tipo) => ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[tipo] || 'jpg');

export function dataUrlParaBlob(dataUrl) {
  const [cab, dados] = String(dataUrl).split(',');
  const tipo = (/data:([^;]+)/.exec(cab) || [])[1] || 'application/octet-stream';
  const bin = atob(dados || ''); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: tipo });
}

// Abre File/Blob, dataURL, <img>, <canvas> ou ImageBitmap como algo desenhável.
async function abrir(fonte) {
  if (!fonte) throw new Error('Escolha uma imagem.');
  if (typeof HTMLCanvasElement !== 'undefined' && fonte instanceof HTMLCanvasElement) return { el: fonte, w: fonte.width, h: fonte.height, fechar() {} };
  if (typeof ImageBitmap !== 'undefined' && fonte instanceof ImageBitmap) return { el: fonte, w: fonte.width, h: fonte.height, fechar() {} };
  if (typeof HTMLImageElement !== 'undefined' && fonte instanceof HTMLImageElement) return { el: fonte, w: fonte.naturalWidth, h: fonte.naturalHeight, fechar() {} };
  let blob = fonte;
  if (typeof fonte === 'string') {
    if (!fonte.startsWith('data:image/')) throw new Error('Imagem inválida.');
    blob = dataUrlParaBlob(fonte);
  }
  if (!(blob instanceof Blob) || (blob.type && !blob.type.startsWith('image/'))) throw new Error('Escolha um arquivo de imagem.');
  // createImageBitmap já respeita a orientação da câmera (EXIF) e não trava a tela.
  if (typeof createImageBitmap === 'function') {
    try { const b = await createImageBitmap(blob, { imageOrientation: 'from-image' }); return { el: b, w: b.width, h: b.height, fechar() { try { b.close(); } catch (e) { /* ok */ } } }; } catch (e) { /* cai no <img> */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Não foi possível ler a imagem.')); i.src = url; });
    return { el: img, w: img.naturalWidth, h: img.naturalHeight, fechar() {} };
  } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
}

function desenhar(fonteEl, w, h, alfa) {
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const cx = c.getContext('2d'); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
  if (!alfa) { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, c.width, c.height); } // PNG transparente não vira fundo preto no JPEG
  cx.drawImage(fonteEl, 0, 0, c.width, c.height);
  return c;
}

// Codifica um canvas já pronto (recorte feito por quem chama) dentro do alvo.
export function codificarCanvas(canvas, opcoes = {}) {
  const { alvoKB = 200, alfa = false, formato = null } = opcoes;
  const alvo = alvoKB * 1024;
  const tipo = formato === 'jpeg' ? 'image/jpeg' : suportaWebp() ? 'image/webp' : alfa ? 'image/png' : 'image/jpeg';
  let atual = canvas; let menor = null;
  for (let rodada = 0; rodada < RODADAS; rodada++) {
    const qs = tipo === 'image/png' ? [undefined] : QUALIDADES;
    for (const q of qs) {
      const d = atual.toDataURL(tipo, q); const b = bytesDataUrl(d);
      if (!menor || b < menor.bytes) menor = { dataUrl: d, bytes: b, largura: atual.width, altura: atual.height };
      if (b <= alvo) return { ...menor, tipo, ext: extensaoDe(tipo) };
    }
    // não coube: 15% menor e tenta de novo (o último recurso é o menor arquivo gerado)
    atual = desenhar(atual, atual.width * 0.85, atual.height * 0.85, alfa || tipo !== 'image/jpeg');
  }
  return { ...menor, tipo, ext: extensaoDe(tipo) };
}

// Ponto de entrada: prepararImagem(arquivo, 'post') ou prepararImagem(arquivo, { lado, alvoKB }).
// Devolve { dataUrl, tipo, ext, largura, altura, bytes, original, blob() }.
export async function prepararImagem(fonte, perfil = 'post') {
  const p = typeof perfil === 'string' ? PERFIS[perfil] : perfil;
  if (!p) throw new Error(`Tipo de imagem desconhecido: ${perfil}`);
  const original = fonte && typeof fonte.size === 'number' ? fonte.size : typeof fonte === 'string' ? bytesDataUrl(fonte) : 0;
  const img = await abrir(fonte);
  try {
    if (!img.w || !img.h) throw new Error('Não foi possível ler a imagem.');
    const k = Math.min(1, (p.lado || 1600) / Math.max(img.w, img.h));
    const canvas = desenhar(img.el, img.w * k, img.h * k, !!p.alfa && p.formato !== 'jpeg');
    const r = codificarCanvas(canvas, p);
    return { ...r, original, blob: () => dataUrlParaBlob(r.dataUrl) };
  } finally { img.fechar(); }
}

// "4,2 MB → 180 KB" para mostrar ao usuário.
export const tamanhoLegivel = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
