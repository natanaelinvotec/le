/* qr.js — gerador de QR Code (padrão ISO/IEC 18004), sem biblioteca externa.

Modo byte (UTF-8), versões 1 a 10 (até ~170 caracteres no nível Q — sobra
para o link da verificação), níveis de correção L, M, Q e H, escolha da
melhor máscara pela penalidade do padrão. Baseado no algoritmo público do
Projeto Nayuki (MIT), reescrito e enxugado para este app.

  qrMatriz('texto', 'Q') → { tamanho, escuro(x, y) }
  qrSvg('texto', { nivel: 'Q', margem: 4, cor: '#002D72' }) → '<svg …>' */

const NIVEIS = { L: 0, M: 1, Q: 2, H: 3 };
const BITS_FORMATO = [1, 0, 3, 2]; // L, M, Q, H
// Por versão (1..10): código de correção por bloco e número de blocos.
const ECC_POR_BLOCO = [
  [7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  [10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
  [13, 22, 18, 26, 18, 24, 18, 22, 20, 24],
  [17, 28, 22, 16, 22, 28, 26, 26, 24, 28],
];
const BLOCOS = [
  [1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  [1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
  [1, 1, 2, 2, 4, 4, 6, 6, 8, 8],
  [1, 1, 2, 4, 4, 4, 5, 6, 8, 8],
];

function modulosDeDados(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
}
const palavrasDeDados = (v, n) => Math.floor(modulosDeDados(v) / 8) - ECC_POR_BLOCO[n][v - 1] * BLOCOS[n][v - 1];

// ---------- Reed-Solomon em GF(256) ----------
function mult(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z & 0xff;
}
function divisor(grau) {
  const r = new Array(grau).fill(0); r[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = mult(r[j], raiz); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    raiz = mult(raiz, 0x02);
  }
  return r;
}
function resto(dados, div) {
  const r = new Array(div.length).fill(0);
  for (const b of dados) {
    const f = b ^ r.shift(); r.push(0);
    div.forEach((c, i) => { r[i] ^= mult(c, f); });
  }
  return r;
}

function utf8(texto) {
  if (typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(texto));
  return Array.from(Buffer.from(texto, 'utf8'));
}

export function qrMatriz(texto, nivelNome = 'M', mascaraFixa = null) {
  const n = NIVEIS[nivelNome] ?? 1;
  const bytes = utf8(String(texto));
  let v = 1;
  for (; v <= 10; v++) {
    const bitsContagem = v <= 9 ? 8 : 16;
    if (4 + bitsContagem + bytes.length * 8 <= palavrasDeDados(v, n) * 8) break;
  }
  if (v > 10) throw new Error('Texto longo demais para o QR.');

  // ---- bits de dados ----
  const bits = [];
  const por = (valor, qtd) => { for (let i = qtd - 1; i >= 0; i--) bits.push((valor >>> i) & 1); };
  por(0b0100, 4); por(bytes.length, v <= 9 ? 8 : 16); bytes.forEach((b) => por(b, 8));
  const capacidade = palavrasDeDados(v, n) * 8;
  por(0, Math.min(4, capacidade - bits.length));
  por(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacidade; pad ^= 0xec ^ 0x11) por(pad, 8);
  const dados = [];
  for (let i = 0; i < bits.length; i += 8) dados.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // ---- correção de erros + intercalação ----
  const nBlocos = BLOCOS[n][v - 1]; const eccLen = ECC_POR_BLOCO[n][v - 1];
  const brutos = Math.floor(modulosDeDados(v) / 8);
  const curtos = nBlocos - (brutos % nBlocos); const curtoLen = Math.floor(brutos / nBlocos);
  const div = divisor(eccLen);
  const blocos = [];
  for (let i = 0, k = 0; i < nBlocos; i++) {
    const dat = dados.slice(k, k + curtoLen - eccLen + (i < curtos ? 0 : 1)); k += dat.length;
    const ecc = resto(dat, div);
    if (i < curtos) dat.push(0);
    blocos.push(dat.concat(ecc));
  }
  const final = [];
  for (let i = 0; i < blocos[0].length; i++) blocos.forEach((b, j) => { if (i !== curtoLen - eccLen || j >= curtos) final.push(b[i]); });

  // ---- matriz ----
  const tam = v * 4 + 17;
  const mod = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const fun = Array.from({ length: tam }, () => new Array(tam).fill(false));
  const pos = (x, y, escuro) => { mod[y][x] = escuro; fun[y][x] = true; };
  for (let i = 0; i < tam; i++) { pos(6, i, i % 2 === 0); pos(i, 6, i % 2 === 0); }
  const localizador = (x, y) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)); const xx = x + dx; const yy = y + dy;
      if (xx >= 0 && xx < tam && yy >= 0 && yy < tam) pos(xx, yy, d !== 2 && d !== 4);
    }
  };
  localizador(3, 3); localizador(tam - 4, 3); localizador(3, tam - 4);
  if (v > 1) {
    const qtd = Math.floor(v / 7) + 2;
    const passo = Math.ceil((v * 4 + 4) / (qtd * 2 - 2)) * 2;
    const alin = [6];
    for (let p = tam - 7; alin.length < qtd; p -= passo) alin.splice(1, 0, p);
    alin.forEach((a, i) => alin.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === qtd - 1) || (i === qtd - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pos(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const formato = (mascara) => {
    const d = (BITS_FORMATO[n] << 3) | mascara;
    let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = ((d << 10) | r) ^ 0x5412;
    const bit = (i) => ((b >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) pos(8, i, bit(i));
    pos(8, 7, bit(6)); pos(8, 8, bit(7)); pos(7, 8, bit(8));
    for (let i = 9; i < 15; i++) pos(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) pos(tam - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) pos(8, tam - 15 + i, bit(i));
    pos(8, tam - 8, true);
  };
  formato(0); // reserva a área (os bits certos entram depois da máscara)
  if (v >= 7) {
    let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const b = (v << 12) | r;
    for (let i = 0; i < 18; i++) { const bit = ((b >>> i) & 1) !== 0; const a = tam - 11 + (i % 3); const c = Math.floor(i / 3); pos(a, c, bit); pos(c, a, bit); }
  }
  // Dados em zigue-zague, de baixo para cima, duas colunas por vez.
  let i = 0;
  for (let dir = tam - 1; dir >= 1; dir -= 2) {
    if (dir === 6) dir = 5;
    for (let vert = 0; vert < tam; vert++) for (let j = 0; j < 2; j++) {
      const x = dir - j; const sobe = ((dir + 1) & 2) === 0; const y = sobe ? tam - 1 - vert : vert;
      if (!fun[y][x] && i < final.length * 8) { mod[y][x] = ((final[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0; i++; }
    }
  }

  const MASCARAS = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const aplicar = (m) => { for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) if (!fun[y][x] && MASCARAS[m](x, y)) mod[y][x] = !mod[y][x]; };

  let melhor = 0; let menor = Infinity;
  for (let m = 0; m < 8; m++) {
    aplicar(m); formato(m);
    const p = penalidade(mod, tam);
    if (p < menor) { menor = p; melhor = m; }
    aplicar(m); // desfaz (a máscara é um XOR)
  }
  if (mascaraFixa !== null) melhor = mascaraFixa;
  aplicar(melhor); formato(melhor);
  return { tamanho: tam, versao: v, mascara: melhor, escuro: (x, y) => x >= 0 && y >= 0 && x < tam && y < tam && mod[y][x] };
}

// Penalidade (regras N1–N4 do padrão): menor = mais fácil de ler.
function penalidade(m, tam) {
  let p = 0;
  const linha = (get) => {
    let corrida = 1;
    for (let k = 1; k < tam; k++) {
      if (get(k) === get(k - 1)) { corrida++; if (corrida === 5) p += 3; else if (corrida > 5) p++; } else corrida = 1;
    }
    // Padrão parecido com o localizador (1:1:3:1:1 com 4 claros de um lado).
    const s = Array.from({ length: tam }, (_, k) => (get(k) ? '1' : '0')).join('');
    const re = /(?=(10111010000|00001011101))/g;
    p += 40 * ((s.match(re) || []).length);
  };
  for (let y = 0; y < tam; y++) linha((x) => m[y][x]);
  for (let x = 0; x < tam; x++) linha((y) => m[y][x]);
  let escuros = 0;
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    if (m[y][x]) escuros++;
    if (x < tam - 1 && y < tam - 1 && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  }
  const total = tam * tam;
  p += 10 * (Math.ceil(Math.abs(escuros * 20 - total * 10) / total) - 1);
  return p;
}

// SVG pronto para colocar na página (escala com o CSS; "crispEdges" deixa nítido).
export function qrSvg(texto, { nivel = 'Q', margem = 4, cor = '#002D72', fundo = '#FFFFFF', rotulo = 'Código QR' } = {}) {
  const q = qrMatriz(texto, nivel);
  const t = q.tamanho + margem * 2;
  let d = '';
  for (let y = 0; y < q.tamanho; y++) for (let x = 0; x < q.tamanho; x++) if (q.escuro(x, y)) d += `M${x + margem} ${y + margem}h1v1h-1z`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" role="img" aria-label="${esc(rotulo)}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="${esc(fundo)}"/><path d="${d}" fill="${esc(cor)}"/></svg>`;
}
