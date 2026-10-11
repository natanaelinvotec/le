/* carteirinha-comum.js — o que o app, o painel e a página de verificação
mostram igual. A regra de validade de verdade é do servidor
(functions/src/carteirinha.js); aqui só lemos o resultado.

v37 (turmas): o cartão segue o modelo aprovado pelo dono — fundo navy em
gradiente com a cor da turma, guilhoché, brilho que varre, LOGO como foco
(marca d'água, logo no cabeçalho, selo holográfico) e a barra de baixo é a
GRADUAÇÃO: cordão em 3 cores (capoeira), faixa com ponteira e graus (brancos e
vermelhos) ou níveis acesos. A graduação desenhada sai da escada da TURMA do
atleta quando ele tem turma; sem turma, da escada da escola (como sempre). */

import { codificarCanvas, PERFIS } from './imagem.js';
import { faixaSVG } from './faixas.js';
import { rotuloGrad, escadaDe, coresDoCordao, CORDOES_ADULTO, CORDOES_KIDS, ESCOLA } from './escola.js';
import { MODALIDADES, listaDa } from './modalidades.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Só cor hexadecimal entra em style="" (o valor vem do banco).
const HEX = /^#[0-9a-f]{3,8}$/i;
export const corHex = (c, padrao = '#389E92') => (HEX.test(String(c || '')) ? String(c) : padrao);

// "Hoje" no fuso do grupo (a carteirinha não vence às 21h por causa do UTC).
export function hojeLocal(d = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Campo_Grande', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
  catch (e) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
}

// Mesma conta do servidor: inativa | semfoto | valida | vencida.
export function situacao(c, hoje = hojeLocal()) {
  if (!c || c.ativo === false) return 'inativa';
  if (c.fotoAprovada === false) return 'semfoto'; // só vale depois que o núcleo aprova a foto
  if (c.controle === 'mensalidade') return c.validaAte && c.validaAte >= hoje ? 'valida' : 'vencida';
  return 'valida';
}

export const dataBR = (iso) => (/^\d{4}-\d{2}-\d{2}$/.test(String(iso || '')) ? iso.split('-').reverse().join('/') : '');

// Texto da validade para o cartão e o selo.
export function textoValidade(c) {
  if (!c) return '—';
  if (c.ativo === false) return 'Inativa';
  if (c.controle === 'isento') return 'Bolsista';
  if (c.controle === 'mensalidade') return c.validaAte ? dataBR(c.validaAte) : 'Em aberto';
  return 'Atleta ativo';
}

export const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

// Faixas do cordão: "a b c" em gradiente de três partes.
export const faixas = (cores, dir = '90deg') => {
  // Só cor hexadecimal entra no estilo (o valor vem do banco).
  const ok = Array.isArray(cores) && cores.length === 3 && cores.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x)));
  const c = ok ? cores : ['#CCC', '#CCC', '#CCC'];
  return `linear-gradient(${dir}, ${c[0]} 0 33.3%, ${c[1]} 33.3% 66.6%, ${c[2]} 66.6%)`;
};

// Link da verificação pública: sempre no mesmo endereço em que o app está aberto.
export const linkVerificacao = (codigo) => `${new URL('v.html', location.href).href}#${encodeURIComponent(codigo)}`;

// Ícones (traço, sem emoji).
export const IC = {
  certo: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  alerta: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6"/><path d="M12 17h.01"/></svg>',
  cal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  qr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
  camera: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  galeria: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  virar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/></svg>',
  voltar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  fechar: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  sol: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  enviar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
  lixo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  escudo: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></svg>',
};

// ---------- graduação desenhada no cartão ----------
// Sistema de graduação a partir da "peça" da arte: cordão (capoeira), nível ou faixa.
export function tipoGraduacao(peca, graduacao = null) {
  // Desenho: cordas (capoeira contemporânea) = cordões (3 cores); prajied (muay thai) = faixa colorida.
  const g = String(graduacao || '');
  if (g === 'cordas') return 'cordoes';
  if (g === 'prajied') return 'faixas';
  if (['faixas', 'cordoes', 'niveis'].includes(g)) return g;
  const p = String(peca || '').toLowerCase();
  if (p === 'cordão' || p === 'cordao' || p === 'corda') return 'cordoes';
  if (p === 'nível' || p === 'nivel' || p === 'graduação' || p === 'graduacao') return 'niveis';
  return 'faixas';
}

/* A graduação do atleta como o cartão desenha. u = usuário (cordaoAtual, grausAtual,
   grausVermelhos, idade); turma = turmas/{turmaId} (escada própria) ou null → escada da escola
   (as listas de js/escola.js, já trocadas por aplicarEscola). Devolve:
   { tipo, g, lista, graus, grausVermelhos, cores, rotulo, peca, faixaSvg, nivel, total } */
export function graduacaoDoCartao(u, turma = null) {
  const nome = (u && u.cordaoAtual) || 'Iniciante';
  const escadaTurma = turma && turma.escada && Array.isArray(turma.escada.adulto) && turma.escada.adulto.length ? turma.escada : null;
  const peca = escadaTurma ? (escadaTurma.peca || (MODALIDADES[turma.arte] || MODALIDADES.outra).peca) : (ESCOLA.peca || 'cordão');
  const tipo = tipoGraduacao(peca, escadaTurma ? turma.graduacao : null);
  const lista = escadaTurma ? listaDa(escadaTurma, u && u.idade) : escadaDe(u || {});
  let g = lista.find((x) => x.nome === nome);
  if (!g && escadaTurma) g = (escadaTurma.adulto || []).find((x) => x.nome === nome) || ((escadaTurma.kids || []).find((x) => x.nome === nome));
  if (!g && !escadaTurma) g = CORDOES_ADULTO.find((x) => x.nome === nome) || CORDOES_KIDS.find((x) => x.nome === nome);
  if (!g) g = { nome, cor: escadaTurma ? ['#C8CED6', '#C8CED6', '#C8CED6'] : coresDoCordao(nome, u || {}) };
  const cores = Array.isArray(g.cor) && g.cor.length === 3 ? g.cor.map((c) => corHex(c, '#C8CED6')) : [corHex(g.cor, '#C8CED6'), corHex(g.cor, '#C8CED6'), corHex(g.cor, '#C8CED6')];
  const maxGraus = Number(g.graus) > 0 ? Number(g.graus) : 0;
  const graus = maxGraus ? Math.min(10, Math.max(0, Math.floor(Number(u && u.grausAtual) || 0))) : 0;
  // Graus vermelhos só existem onde há graus (infantil do jiu-jitsu); nunca em cordão.
  const grausVermelhos = maxGraus ? Math.min(graus, Math.max(0, Math.floor(Number(u && u.grausVermelhos) || 0))) : 0;
  const Peca = String(peca).charAt(0).toUpperCase() + String(peca).slice(1);
  let texto;
  if (Number(g.grauDan) > 0) texto = `${g.nome} · ${Number(g.grauDan) + graus}º grau`;
  else texto = rotuloGrad(g.nome, graus, grausVermelhos);
  const rotulo = tipo === 'niveis' ? texto : `${Peca} ${texto}`;
  const idx = lista.findIndex((x) => x.nome === g.nome);
  const out = { tipo, g, lista, graus, grausVermelhos, cores, rotulo, peca, nivel: idx < 0 ? 0 : idx, total: lista.length, faixaSvg: '' };
  if (tipo === 'faixas') {
    try {
      out.faixaSvg = faixaSVG({ ...g, cor: cores }, { graus, grausVermelhos, largura: 128, altura: 14, titulo: rotulo }).replace('<svg ', '<svg style="width:100%;height:auto" ');
    } catch (e) { out.faixaSvg = ''; }
  }
  return out;
}

// Moldura da foto nas cores da graduação (cordão: 3 faixas; faixa: corpo + ponteira; nível: cor da turma).
export function molduraDaGraduacao(grad, corTurma = '#389E92') {
  if (!grad) return faixas(null, '180deg');
  if (grad.tipo === 'cordoes') return faixas(grad.cores, '180deg');
  if (grad.tipo === 'niveis') return `linear-gradient(180deg, ${corHex(corTurma)} 0%, ${corHex(corTurma)} 60%, #04122B 100%)`;
  const g = grad.g || {};
  const corpo = grad.cores[0]; const meio = grad.cores[1];
  const ponteira = corHex(g.ponteira, '');
  if (g.padrao === 'blocos') return `repeating-linear-gradient(180deg, ${corpo} 0 12%, ${meio} 12% 24%)`;
  return ponteira ? `linear-gradient(180deg, ${corpo} 0 68%, ${ponteira} 68% 100%)` : `linear-gradient(180deg, ${corpo} 0 100%)`;
}

// A barra de baixo da frente (e a fina do verso) = a graduação.
export function barraGraduacaoHtml(grad, corTurma = '#389E92', classe = 'f-barra') {
  if (!grad) return `<div class="${classe} cordao"><i style="background:#CCC"></i><i style="background:#CCC"></i><i style="background:#CCC"></i></div>`;
  if (grad.tipo === 'cordoes') return `<div class="${classe} cordao" aria-hidden="true">${grad.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</div>`;
  if (grad.tipo === 'niveis') {
    const n = Math.max(1, Math.min(12, grad.total || 1)); const cor = corHex(corTurma);
    return `<div class="${classe} niveis" style="--turma:${cor}" aria-hidden="true">${Array.from({ length: n }, (_, i) => `<i class="${i <= grad.nivel ? 'aceso' : ''}"></i>`).join('')}</div>`;
  }
  const g = grad.g || {};
  const fundo = g.padrao === 'blocos' ? `repeating-linear-gradient(90deg, ${grad.cores[0]} 0 12.5%, ${grad.cores[1]} 12.5% 25%)` : grad.cores[0];
  const ponteira = corHex(g.ponteira, '');
  const vagas = Number(g.graus) > 0 ? Number(g.graus) : grad.graus;
  const barras = ponteira && vagas ? Array.from({ length: Math.max(vagas, grad.graus) }, (_, i) => `<i class="grau${i < grad.graus ? ' feito' : ''}${i < grad.grausVermelhos ? ' vermelho' : ''}"></i>`).join('') : '';
  const selo = !ponteira && Number(g.grauDan) > 0 ? `<em class="dan">${esc(`${Number(g.grauDan) + grad.graus}º`)}</em>` : '';
  return `<div class="${classe} faixa" style="background:${fundo}" aria-hidden="true">${ponteira ? `<span class="ponteira" style="background:${ponteira}">${barras}</span>` : ''}${selo}</div>`;
}

// Título do responsável para a linha do cabeçalho: "Prof. Igor Rodrigo", "Mestre Profeta".
const ABREV = { professor: 'Prof.', professora: 'Profa.', treinador: 'Treinador', treinadora: 'Treinadora' };
export function tituloLider(lider, nome) {
  const n = String(nome || '').trim(); const l = String(lider || '').trim();
  if (!n) return l;
  if (!l) return n;
  const semAcento = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const primeira = semAcento(n.split(/\s+/)[0]).replace(/\.$/, '');
  const base = semAcento(l);
  // Nome já vem com o título ("Mestre Profeta", "Prof. Igor"): não repete.
  if (primeira === base || primeira === semAcento(ABREV[base] || '').replace(/\.$/, '') || (base.startsWith(primeira) && primeira.length >= 4)) return n;
  return `${ABREV[base] || l} ${n}`;
}

// Pílula da situação no cartão (texto curto) a partir do espelho do servidor.
export function textoSituacao(c) {
  if (!c) return { classe: 'neutro', texto: 'Em emissão' };
  const s = situacao(c);
  if (s === 'valida') return { classe: 'ok', texto: c.controle === 'mensalidade' ? 'Em dia' : 'Ativo' };
  if (s === 'vencida') return { classe: 'ruim', texto: 'Pendente' };
  if (s === 'semfoto') return { classe: 'neutro', texto: 'Sem foto' };
  return { classe: 'ruim', texto: 'Inativo' };
}

// "março de 2024" a partir de um ISO (criadoEm). Vazio sem data.
export function membroDesdeTexto(iso) {
  const t = Date.parse(String(iso || ''));
  if (!Number.isFinite(t)) return '';
  try { const txt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(t)); return txt.charAt(0).toUpperCase() + txt.slice(1); } catch (e) { return String(iso).slice(0, 7); }
}

// Logo de verdade (arquivo ou https) × monograma gerado (data:) — sem logo o cartão desenha as iniciais.
const temLogo = (logo) => !!logo && !/^data:/i.test(String(logo));
const monogramaHtml = (nome, classe) => `<span class="${classe}" aria-hidden="true">${esc(iniciais(nome))}</span>`;
const logoHtml = (d, classe) => (temLogo(d.logo) ? `<img class="${classe}" src="${esc(d.logo)}" alt="">` : monogramaHtml(d.escola || d.grupo, `${classe} mono-escola`));

/* O cartão (frente + verso). d = { nome, cordao, cores, nucleo, matricula, validade, validadeOk,
   foto, qrSvg, link, logo, grupo } como sempre, mais (opcionais, v37):
   escola (nome completo), arte ("Jiu-jitsu"), lider ("Professor"), responsavel (nome),
   turma (nome), corTurma (#hex), grad (graduacaoDoCartao), c (espelho da carteirinha),
   membroDesde (ISO), telefone (do núcleo), cidade, uf, rotulo, faixaSvg (compatibilidade). */
export function cartaoHtml(d, virado = false) {
  const fotoInterna = d.foto
    ? `<img src="${esc(d.foto)}" alt="Foto da carteirinha" loading="eager" decoding="async">`
    : `${esc(iniciais(d.nome))}<small>SEM FOTO</small>`;
  const linkCurto = d.link ? String(d.link).replace(/^https?:\/\//, '') : '';
  const grad = d.grad || null;
  // Sem `grad` (chamada antiga): a barra de baixo segue as cores do cordão informadas.
  const gradBarra = grad || { tipo: 'cordoes', cores: Array.isArray(d.cores) && d.cores.length === 3 ? d.cores.map((c) => corHex(c, '#CCC')) : ['#CCC', '#CCC', '#CCC'] };
  const corTurma = corHex(d.corTurma, '#0B2E70');
  const padrao = !d.corTurma; // turma padrão (sem cor): navy puro, como a carteirinha da Liberdade
  const fundo = padrao
    ? 'linear-gradient(135deg, #0B2E70 0%, #061A3A 52%, #04122B 100%)'
    : `linear-gradient(135deg, ${corTurma} 0%, #0B2E70 52%, #04122B 100%)`;
  const escola = d.escola || d.grupo || ESCOLA.nome;
  const arte = d.arte || (MODALIDADES[ESCOLA.modalidade] || MODALIDADES.outra).nome;
  const arteLinha = String(ESCOLA.modalidade || '') === 'capoeira' && (!d.arte || /capoeira/i.test(d.arte)) ? 'Grupo de Capoeira' : arte;
  const lider = d.lider || ESCOLA.lider || 'Professor';
  const responsavel = d.responsavel || ESCOLA.mestre || '';
  const liderNome = tituloLider(lider, responsavel);
  const linhaTopo = [arteLinha, liderNome].filter(Boolean).join(' · ').toUpperCase();
  const cidade = [d.cidade ?? ESCOLA.cidade, d.uf ?? ESCOLA.uf].filter(Boolean).join(' ');
  const micro = [escola, arte, liderNome, cidade].filter(Boolean).map((t) => String(t).toUpperCase()).join(' • ');
  const microRepetido = `${micro} • `.repeat(4);
  const rotulo = grad ? grad.rotulo : (d.rotulo || `Cordão ${d.cordao || 'Iniciante'}`);
  const miniGrad = grad && grad.tipo === 'faixas' && grad.faixaSvg
    ? `<span class="f-mini-faixa">${grad.faixaSvg}</span>`
    : grad && grad.tipo === 'niveis'
      ? `<span class="f-mini-niveis" style="--turma:${corHex(d.corTurma)}">${Array.from({ length: Math.max(1, Math.min(12, grad.total || 1)) }, (_, i) => `<i class="${i <= grad.nivel ? 'aceso' : ''}"></i>`).join('')}</span>`
      : d.faixaSvg && !grad
        ? `<span class="f-mini-faixa">${d.faixaSvg}</span>`
        : `<i class="f-mini-cordao" style="background:${faixas(grad ? grad.cores : d.cores)}"></i>`;
  const sit = textoSituacao(d.c || null);
  const rotuloLider = String(lider || 'Professor').toUpperCase();
  const membroDesde = membroDesdeTexto(d.membroDesde);
  const telefone = String(d.telefone || '').replace(/[^\d\s()+-]/g, '').trim();
  const assinatura = String(responsavel || escola).replace(/^(mestre|prof\.?|professora?|sensei|treinadora?|coach|sabom|kru|sifu)\s+/i, '');
  return `<div class="vira${virado ? ' virado' : ''}">
    <div class="face frente" style="--turma:${corTurma};background:${fundo}">
      <div class="guilhoche" aria-hidden="true"></div>
      <div class="marca-dagua" aria-hidden="true">${temLogo(d.logo) ? `<img src="${esc(d.logo)}" alt="">` : `<span class="anel-mono">${esc(iniciais(escola))}</span>`}</div>
      <div class="f-conteudo">
        <div class="f-topo">
          <div class="f-marca">${logoHtml(d, 'f-logo')}<span class="f-marca-txt"><b>${esc(escola)}</b><small>${esc(linhaTopo)}</small></span></div>
          <div class="f-tipo"><span>CARTEIRINHA</span><span>DE ATLETA</span></div>
        </div>
        <div class="f-corpo">
          <div class="f-foto" style="background:${grad ? molduraDaGraduacao(grad, d.corTurma) : faixas(d.cores, '180deg')}"><div>${fotoInterna}</div></div>
          <div class="f-dados">
            <span class="f-nome">${esc(d.nome)}</span>
            <div class="f-pilulas">
              <span class="f-cordao" title="${esc(rotulo)}">${miniGrad}<span class="f-cordao-txt">${esc(rotulo)}</span></span>
              <span class="f-situ ${sit.classe}">${esc(sit.texto)}</span>
            </div>
            <div class="f-campos">
              <span><b>TURMA</b><em>${esc(d.turma || d.nucleo || '—')}</em></span>
              <span><b>${esc(rotuloLider)}</b><em>${esc(responsavel || '—')}</em></span>
              <span><b>MATRÍCULA</b><em class="mono">${esc(d.matricula || 'em emissão')}</em></span>
              <span><b>VÁLIDA ATÉ</b><em class="mono ${d.validadeOk ? 'ok' : 'ruim'}">${esc(d.validade)}</em></span>
            </div>
          </div>
        </div>
      </div>
      <div class="f-selo" aria-hidden="true"><span>${esc(iniciais(escola))}</span></div>
      <div class="f-micro" aria-hidden="true">${esc(microRepetido)}</div>
      ${barraGraduacaoHtml(gradBarra, d.corTurma, 'f-barra')}
    </div>
    <div class="face costas" style="--turma:${corTurma}">
      ${barraGraduacaoHtml(gradBarra, d.corTurma, 'c-barra')}
      <div class="c-conteudo">
        <div class="c-qr">${d.qrSvg || '<div class="sem">O QR aparece quando a matrícula for emitida.</div>'}${d.qrSvg ? logoHtml(d, 'c-qr-logo') : ''}</div>
        <div class="c-txt">
          <b>DOCUMENTO DO ATLETA</b>
          <strong>Carteirinha oficial de ${esc(d.grupo || escola)} · ${esc(arte)}</strong>
          <p>Identifica o atleta junto à escola, aos núcleos e aos parceiros. Uso pessoal e intransferível; vale com o cadastro ativo e a mensalidade em dia. A situação do dia é a que o QR mostra.</p>
          <div class="c-campos">
            ${membroDesde ? `<span><b>MEMBRO DESDE</b><em>${esc(membroDesde)}</em></span>` : ''}
            ${telefone ? `<span><b>EM CASO DE PERDA</b><em class="mono">${esc(telefone)}</em></span>` : ''}
          </div>
          <div class="c-assina"><span class="c-cursiva" aria-hidden="true">${esc(assinatura)}</span><i></i><small>${esc(liderNome || responsavel)}${lider ? ` · ${esc(lider)} responsável` : ''}</small></div>
        </div>
        ${logoHtml(d, 'c-logo')}
      </div>
      <div class="c-micro" aria-hidden="true">CARTEIRINHA OFICIAL • USO PESSOAL E INTRANSFERÍVEL • VERIFIQUE PELO QR</div>
      <div class="c-rodape">${linkCurto ? `<code>${esc(linkCurto)}</code>` : '<code>verificação pelo QR</code>'}<b>${esc(d.grupo || escola)}</b></div>
    </div>
  </div>`;
}

// Recorta no centro em 3:4 (retrato) e reduz para 600×800 — até 90 KB (js/imagem.js).
export function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !String(arquivo.type).startsWith('image/')) { reject(new Error('Escolha uma foto (imagem).')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (Math.min(w, h) < 240) { reject(new Error('Foto pequena demais. Use a câmera do celular.')); return; }
      let cw = w; let ch = Math.round(w * 4 / 3);
      if (ch > h) { ch = h; cw = Math.round(h * 3 / 4); }
      const sx = Math.round((w - cw) / 2); const sy = Math.round((h - ch) / 2);
      const cv = document.createElement('canvas'); cv.width = 600; cv.height = 800;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, 600, 800);
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, sx, sy, cw, ch, 0, 0, 600, 800);
      resolve(codificarCanvas(cv, PERFIS.carteirinha).dataUrl); // regra única de imagens: JPEG até 90 KB
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não deu para abrir essa foto. Tente outra.')); };
    img.src = url;
  });
}


// Quem treina tem carteirinha de atleta: aluno, instrutor, professor e mestre.
export const PAPEIS_ATLETA = ['aluno', 'instrutor', 'mestre'];
export const ehAtleta = (u) => !!u && Array.isArray(u.papeis) && u.papeis.some((p) => PAPEIS_ATLETA.includes(p));

// Beneficiários: só pai, mãe, irmãos e avós (o servidor confere de novo).
export const PARENTESCOS = { pai: 'Pai', mae: 'Mãe', irmao: 'Irmão', irma: 'Irmã', avo: 'Avô', avoa: 'Avó' };
export const LIMITE_POR_PARENTESCO = { pai: 1, mae: 1, avo: 2, avoa: 2, irmao: 6, irma: 6 };
export const MAX_BENEFICIARIOS = 10;
// "Mãe de Natanael", "Avô de Natanael"…
export const deAtleta = (parentesco, nomeAtleta) => `${PARENTESCOS[parentesco] || parentesco} de ${String(nomeAtleta || 'atleta').split(' ')[0]}`;
