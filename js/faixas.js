/* faixas.js — desenho vetorial (SVG) das faixas e do quadro de graduação.

Tudo sai dos DADOS da escada (js/modalidades.js ou escolas/{id}.escada): cor da
faixa, ponteira (a barra preta/vermelha onde ficam os graus), graus e as faixas
de mestre (coral em blocos, vermelha). Nada de imagem pronta: o mesmo código
desenha a faixa no perfil do aluno, na carteirinha e o quadro completo
(assets/graduacoes/jiu-jitsu.svg, gerado por tools/gerar-quadro-graduacoes.mjs).

Funções puras (só texto SVG): rodam no navegador e no Node. */
import { idadeTexto, tempoTexto } from './modalidades.js';

const X = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COR_OK = (c, padrao = '#C8CED6') => (/^#[0-9a-f]{3,6}$/i.test(String(c)) ? String(c) : padrao);
// Faixa clara (branca, cinza, amarela) pede costura e contorno escuros.
function clara(hex) {
  let h = COR_OK(hex).slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
}
let seq = 0;

/* Uma faixa. g = graduação da escada; graus = graus atuais (barras brancas na ponteira);
   vagas = quantas barras mostrar apagadas (capacidade, ex.: "lisa até 4 graus"). */
export function faixaSVG(g, { graus = 0, vagas = null, largura = 300, altura = 28, titulo = null, id = null, selo = null } = {}) {
  const W = largura; const H = altura; const u = id || `fx${(seq += 1)}`;
  const base = COR_OK(g && g.cor && g.cor[0]);
  const meio = COR_OK(g && g.cor && g.cor[1], base);
  const blocos = g && g.padrao === 'blocos';
  const p0 = Math.round(W * 0.66); const p1 = Math.round(W * 0.9); // ponteira
  const temPonteira = !!(g && g.ponteira);
  const r = Math.round(H * 0.18);
  const linha = clara(base) ? 'rgba(20,24,33,.28)' : 'rgba(255,255,255,.26)';
  const partes = [];
  // corpo
  if (blocos) {
    const n = 8; const w = W / n;
    for (let i = 0; i < n; i++) partes.push(`<rect x="${(i * w).toFixed(2)}" y="0" width="${(w + 0.6).toFixed(2)}" height="${H}" fill="${i % 2 ? meio : base}"/>`);
  } else partes.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${base}"/>`);
  // ponteira + graus
  const total = Math.max(0, Math.floor(Number(vagas ?? (g && g.graus) ?? 0)));
  const feitos = Math.min(total || 10, Math.max(0, Math.floor(Number(graus) || 0)));
  if (temPonteira) {
    partes.push(`<rect x="${p0}" y="0" width="${p1 - p0}" height="${H}" fill="${COR_OK(g.ponteira)}"/>`);
    const n = Math.max(total, feitos);
    if (n) {
      const bw = Math.max(3, Math.round(W * 0.014)); const gap = Math.max(3, Math.round(W * 0.012));
      let x = p1 - gap - bw;
      for (let i = 0; i < n; i++) {
        partes.push(`<rect x="${x}" y="${Math.round(H * 0.08)}" width="${bw}" height="${H - Math.round(H * 0.16)}" rx="1" fill="#FFFFFF" opacity="${i < feitos ? 1 : 0.2}"/>`);
        x -= bw + gap;
      }
    }
  }
  // Faixas de mestre (coral, vermelha): o grau vai num selo branco perto da ponta.
  const grauSelo = selo ?? (g && g.grauDan ? `${g.grauDan}º` : null);
  if (grauSelo && !temPonteira) {
    const sw = Math.round(H * 1.25); const sx = Math.round(W * 0.78 - sw / 2);
    partes.push(`<rect x="${sx}" y="${Math.round(H * 0.14)}" width="${sw}" height="${H - Math.round(H * 0.28)}" rx="${Math.round(H * 0.3)}" fill="#FFFFFF" opacity=".95"/>`);
    partes.push(`<text x="${sx + sw / 2}" y="${(H / 2 + H * 0.17).toFixed(1)}" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="${Math.round(H * 0.46)}" font-weight="800" fill="#7A1C12">${X(grauSelo)}</text>`);
  }
  // costura (pesponto) e trama
  partes.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#${u}t)"/>`);
  partes.push(`<line x1="${r}" y1="${(H * 0.2).toFixed(1)}" x2="${W - r}" y2="${(H * 0.2).toFixed(1)}" stroke="${linha}" stroke-width="1" stroke-dasharray="4 3"/>`);
  partes.push(`<line x1="${r}" y1="${(H * 0.8).toFixed(1)}" x2="${W - r}" y2="${(H * 0.8).toFixed(1)}" stroke="${linha}" stroke-width="1" stroke-dasharray="4 3"/>`);
  partes.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#${u}b)"/>`);
  const rotulo = titulo || (g && g.nome) || 'faixa';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${X(rotulo)}">
<defs>
<clipPath id="${u}c"><rect width="${W}" height="${H}" rx="${r}"/></clipPath>
<linearGradient id="${u}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<pattern id="${u}t" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="5" stroke="#000" stroke-opacity=".06" stroke-width="1.6"/></pattern>
</defs>
<g clip-path="url(#${u}c)">${partes.join('')}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${r}" fill="none" stroke="rgba(10,12,20,.22)"/>
</svg>`;
}

// Linhas do quadro na ordem do quadro da CBJJ: infantil + adulto por título; a preta abre
// em lisa + cada grau; a vermelha em 9º e 10º (10º só os pioneiros).
export function linhasDoQuadro(escada) {
  const adulto = (escada && escada.adulto) || []; const kids = (escada && escada.kids) || [];
  const linhas = [];
  const nomes = new Set();
  [...kids, ...adulto].forEach((g) => {
    if (nomes.has(g.nome)) return; nomes.add(g.nome);
    const titulo = g.titulo || 'Aluno';
    if (g.grausMeses && g.grausMeses.length) {
      const ant = adulto[adulto.indexOf(g) - 1];
      const depois = ant && ant.permanenciaMeses ? `Após ${tempoTexto(ant).replace(/^Mínimo /, 'mínimo ').replace(/ na faixa$/, '')} de ${ant.nome.toLowerCase()}` : '';
      linhas.push({ g, titulo, graus: 0, vagas: g.graus, nome: `${g.nome} (lisa)`, idade: idadeTexto(g), tempo: depois, grausTxt: `Até ${g.graus} graus` });
      g.grausMeses.forEach((_, i) => linhas.push({ g, titulo, graus: i + 1, vagas: g.graus, nome: `${g.nome} · ${i + 1}º grau`, idade: idadeTexto(g), tempo: tempoTexto(g, i + 1), grausTxt: `${i + 1}º grau` }));
      return;
    }
    if (g.grauDan) {
      linhas.push({ g, titulo, graus: 0, vagas: 0, nome: `${g.nome}`, idade: idadeTexto(g), tempo: tempoTexto(g), grausTxt: `${g.grauDan}º grau`, selo: `${g.grauDan}º` });
      if (g.nota) linhas.push({ g, titulo, graus: 0, vagas: 0, nome: `${g.nome}`, idade: idadeTexto(g), tempo: 'Só os pioneiros (ver nota)', grausTxt: `${g.grauDan + 1}º grau`, selo: `${g.grauDan + 1}º`, honorario: true });
      return;
    }
    const infantil = !!(g.idadeMax && g.idadeMax < ((escada && escada.idadeKids) || 99));
    const inicial = !!g.requisito; // a primeira faixa (iniciante)
    linhas.push({ g, titulo, graus: 0, vagas: g.graus || 0, nome: g.nome, infantil, idade: inicial ? 'Qualquer idade' : idadeTexto(g),
      tempo: tempoTexto(g) || (inicial ? 'Iniciante' : infantil ? 'Faixa infantil' : ''), grausTxt: g.graus ? `Lisa até ${g.graus} graus` : '' });
  });
  return linhas;
}

const GRUPOS = {
  Aluno: { fundo: '#E6E9EF', texto: '#141821' },
  Instrutor: { fundo: '#B9C0CC', texto: '#141821' },
  Professor: { fundo: '#4B5160', texto: '#FFFFFF' },
  Mestre: { fundo: '#101219', texto: '#FFFFFF' },
};

/* Quadro completo de graduação (vetorial), no espírito do quadro da CBJJ, redesenhado. */
export function quadroGraduacoesSVG(escada, { titulo = 'Graduação no Jiu-Jitsu', subtitulo = 'Faixas, graus, idade mínima e tempo de permanência — quadro de graduação da CBJJ', rodape = '' } = {}) {
  const linhas = linhasDoQuadro(escada);
  const W = 1400; const topo = 196; const LH = 54; const esq = 40;
  const col = { faixa: 210, nome: 506, idade: 756, tempo: 924, graus: 1214 };
  const nota = ((escada && escada.adulto) || []).map((g) => g.nota).filter(Boolean)[0] || '';
  const H = topo + linhas.length * LH + (nota ? 150 : 90);
  const fonte = "Manrope, 'Segoe UI', Roboto, Arial, sans-serif";
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${fonte}" role="img" aria-label="${X(titulo)}">`);
  out.push(`<rect width="${W}" height="${H}" fill="#F4F5F8"/>`);
  out.push(`<rect x="20" y="20" width="${W - 40}" height="${H - 40}" rx="28" fill="#FFFFFF" stroke="#E2E5EC"/>`);
  // cabeçalho
  out.push(`<text x="${esq + 20}" y="88" font-size="40" font-weight="800" fill="#101219" letter-spacing="-.5">${X(titulo)}</text>`);
  out.push(`<text x="${esq + 20}" y="122" font-size="17" font-weight="600" fill="#5B6170">${X(subtitulo)}</text>`);
  // legenda da ponteira
  const lx = W - 410;
  out.push(`<g transform="translate(${lx} 62)">${faixaSVG((escada.adulto || [])[0] || { cor: ['#F4F4F4'], ponteira: '#151515', graus: 4 }, { graus: 2, vagas: 4, largura: 210, altura: 24, id: 'leg' }).replace('<svg ', '<svg x="0" y="0" ')}</g>`);
  out.push(`<text x="${lx + 222}" y="72" font-size="13" font-weight="700" fill="#101219">Ponteira</text>`);
  out.push(`<text x="${lx + 222}" y="90" font-size="12.5" fill="#5B6170">barras brancas = graus</text>`);
  out.push(`<text x="${lx + 222}" y="106" font-size="12.5" fill="#5B6170">apagadas = graus possíveis</text>`);
  // títulos das colunas
  const yc = topo - 26;
  [['Título', esq + 20], ['Faixa', col.faixa], ['Graduação', col.nome], ['Idade', col.idade], ['Tempo mínimo', col.tempo], ['Graus', col.graus]]
    .forEach(([t, x]) => out.push(`<text x="${x}" y="${yc}" font-size="12.5" font-weight="800" fill="#8A90A0" letter-spacing="1.4">${X(t.toUpperCase())}</text>`));
  out.push(`<line x1="${esq}" y1="${topo - 12}" x2="${W - esq}" y2="${topo - 12}" stroke="#E2E5EC" stroke-width="1.5"/>`);
  // faixas de grupo (Aluno, Instrutor, Professor, Mestre)
  let i = 0;
  while (i < linhas.length) {
    const t = linhas[i].titulo; let j = i; while (j < linhas.length && linhas[j].titulo === t) j++;
    const y0 = topo + i * LH; const h = (j - i) * LH - 8; const cor = GRUPOS[t] || GRUPOS.Aluno;
    out.push(`<rect x="${esq}" y="${y0}" width="150" height="${h}" rx="14" fill="${cor.fundo}"/>`);
    out.push(`<text x="${esq + 75}" y="${y0 + h / 2 + 6}" text-anchor="middle" font-size="16" font-weight="800" letter-spacing="2" fill="${cor.texto}">${X(t.toUpperCase())}</text>`);
    i = j;
  }
  // linhas
  linhas.forEach((l, k) => {
    const y = topo + k * LH;
    if (k % 2 === 0) out.push(`<rect x="${col.faixa - 14}" y="${y - 2}" width="${W - esq - col.faixa + 14}" height="${LH - 6}" rx="10" fill="#F7F8FB"/>`);
    out.push(`<g transform="translate(${col.faixa} ${y + 10})">${faixaSVG(l.g, { graus: l.graus, vagas: l.vagas, largura: 270, altura: 26, id: `q${k}`, selo: l.selo || null })}</g>`);
    out.push(`<text x="${col.nome}" y="${y + 29}" font-size="16" font-weight="800" fill="#101219">${X(l.nome)}</text>`);
    if (l.infantil) out.push(`<rect x="${col.nome + 8 + l.nome.length * 9.4}" y="${y + 13}" width="66" height="22" rx="11" fill="#FFF1E6"/><text x="${col.nome + 41 + l.nome.length * 9.4}" y="${y + 29}" text-anchor="middle" font-size="11.5" font-weight="800" fill="#B4530A">INFANTIL</text>`);
    out.push(`<text x="${col.idade}" y="${y + 29}" font-size="15" font-weight="600" fill="#2C313D">${X(l.idade)}</text>`);
    out.push(`<text x="${col.tempo}" y="${y + 29}" font-size="15" font-weight="600" fill="${l.honorario ? '#B42318' : (/^(Iniciante|Faixa infantil)$/.test(l.tempo) ? '#8A90A0' : '#2C313D')}">${X(l.tempo)}</text>`);
    out.push(`<text x="${col.graus}" y="${y + 29}" font-size="15" font-weight="700" fill="#5B6170">${X(l.grausTxt)}</text>`);
  });
  // nota (10º grau) e rodapé
  let yn = topo + linhas.length * LH + 16;
  if (nota) {
    out.push(`<rect x="${esq}" y="${yn}" width="${W - esq * 2}" height="62" rx="14" fill="#FFF4F2" stroke="#F6C9C2"/>`);
    out.push(`<text x="${esq + 22}" y="${yn + 38}" font-size="15.5" font-weight="700" fill="#7A1C12">${X(nota)}</text>`);
    yn += 80;
  }
  out.push(`<text x="${esq + 4}" y="${yn + 18}" font-size="12.5" fill="#8A90A0">${X(rodape || 'Tempos mínimos de cada faixa e grau. A graduação depende também da avaliação técnica e da conduta do atleta, a critério do professor responsável.')}</text>`);
  out.push('</svg>');
  return out.join('\n');
}
