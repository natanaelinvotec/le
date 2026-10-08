// Gera o quadro de graduação vetorial a partir dos dados (js/modalidades.js) e do
// desenho das faixas (js/faixas.js). Uso: node tools/gerar-quadro-graduacoes.mjs
// Saída: assets/graduacoes/<modalidade>.svg — mudou a escada? rode de novo.
import { writeFileSync, mkdirSync } from 'node:fs';
import { escadaPadrao } from '../js/modalidades.js';
import { quadroGraduacoesSVG } from '../js/faixas.js';

const saida = new URL('../assets/graduacoes/', import.meta.url);
mkdirSync(saida, { recursive: true });
const svg = quadroGraduacoesSVG(escadaPadrao('jiujitsu'));
writeFileSync(new URL('jiu-jitsu.svg', saida), `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
console.log('assets/graduacoes/jiu-jitsu.svg', `${(svg.length / 1024).toFixed(1)} KB`);
