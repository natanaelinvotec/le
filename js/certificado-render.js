/* certificado-render.js — o desenho do certificado de graduação (A4 deitado,
1123×794 px), idêntico ao mockup aprovado. Usado pela página do certificado
(certificado.html, uma folha ou várias), pela lista "Meus certificados" e pelo
PDF em lote do painel. Estilos em css/certificado.css (.cert …).

  certificadoHtml(c, { qr, assinaturas })  → <article class="cert">…</article>
    c           = certificados/{codigo} (dados do servidor)
    qr          = <svg> do QR de verificação (ou '' na miniatura)
    assinaturas = { [uid]: url da imagem da assinatura real } */
import { ESCOLA, nomeBonito } from './escola.js';
import { faixaSVG } from './faixas.js';

export const BRASAO = 'assets/marca/brasao-1024.png';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const dataLonga = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '')); return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}` : ''; };
export const coresOk = (c) => (Array.isArray(c) && c.length === 3 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(String(x))) ? c : ['#4F4F4F', '#DAA520', '#D32F2F']);
const listras = (c, p = 9) => `repeating-linear-gradient(45deg,${c[0]} 0 ${p}px,${c[1]} ${p}px ${p * 2}px,${c[2]} ${p * 2}px ${p * 3}px)`;
const sombraV = 'linear-gradient(90deg,rgba(0,0,0,.35),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.35))';
const sombraH = 'linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 30%,rgba(255,255,255,.3) 50%,rgba(0,0,0,0) 70%,rgba(0,0,0,.3))';
const urlImagemOk = (u) => /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(u || ''));
const tituloDoNucleo = (nome) => String(nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]s?\s+)?/i, '').trim();

let seq = 0;
function selo(topo, baixo) {
  const id = `arcoSelo${++seq}`;
  return `<svg class="selo-cert" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Selo ${esc(topo)} ${esc(baixo)}">
    <defs><path id="${id}" d="M64 64 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0"></path></defs>
    <circle cx="64" cy="64" r="62" fill="#DAA520"></circle>
    <circle cx="64" cy="64" r="58" fill="none" stroke="#FFF6D6" stroke-width="1.5" stroke-dasharray="3 3"></circle>
    <circle cx="64" cy="64" r="38" fill="#B8860B"></circle>
    <text font-family="Manrope, sans-serif" font-size="9.5" font-weight="800" letter-spacing="2.4" fill="#FFFFFF"><textPath href="#${id}">LIBERDADE E EXPRESSÃO · CAPOEIRA ·</textPath></text>
    <text x="64" y="60" text-anchor="middle" font-family="Sora, sans-serif" font-size="11" font-weight="800" fill="#FFF6D6">${esc(topo)}</text>
    <text x="64" y="78" text-anchor="middle" font-family="Sora, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${esc(baixo)}</text>
  </svg>`;
}

// Uma assinatura: a imagem real (se a pessoa já enviou) ou o nome em cursiva.
function assinatura(a, imgs) {
  const url = a.uid && imgs ? imgs[a.uid] : '';
  const titulo = a.titulo || a.nome || '';
  const risco = urlImagemOk(url)
    ? `<img class="ass-img" src="${esc(url)}" alt="Assinatura de ${esc(a.nome || titulo)}">`
    : `<span class="cursiva">${esc(a.nome || titulo)}</span>`;
  return `<div class="assinatura">${risco}<hr><b>${esc(titulo)}</b><small>${esc(a.papel || '')}</small></div>`;
}

// v34 — certificado de FAIXA/GRAU das escolas da plataforma (Jiu-Jitsu, Judô…). A identidade
// vem do próprio documento (c.escola), não da escola "no ar" no navegador: a página pública
// abre sem login e mostra a escola certa. Mesmo papel A4 e mesmas classes do de capoeira.
const monograma = (nome, cor) => {
  const ini = String(nome || 'E').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase().replace(/[^A-Z0-9À-Ú]/g, '') || 'E';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" rx="28" fill="${cor}"/><text x="60" y="76" text-anchor="middle" font-family="Arial,sans-serif" font-size="46" font-weight="800" fill="#fff">${ini}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
const hexOk = (v, p) => (/^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? String(v) : p);
function seloEscola(topo, baixo, nomeArco, cor) {
  const id = `arcoSelo${++seq}`;
  return `<svg class="selo-cert" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Selo ${esc(topo)} ${esc(baixo)}">
    <defs><path id="${id}" d="M64 64 m-47 0 a47 47 0 1 1 94 0 a47 47 0 1 1 -94 0"></path></defs>
    <circle cx="64" cy="64" r="62" fill="${cor}"></circle>
    <circle cx="64" cy="64" r="58" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="3 3"></circle>
    <circle cx="64" cy="64" r="38" fill="#000" fill-opacity=".22"></circle>
    <text font-family="Manrope, sans-serif" font-size="9" font-weight="800" letter-spacing="2" fill="#FFFFFF"><textPath href="#${id}">${esc(String(nomeArco).toUpperCase().slice(0, 34))} ·</textPath></text>
    <text x="64" y="60" text-anchor="middle" font-family="Sora, sans-serif" font-size="10.5" font-weight="800" fill="#FFFFFF">${esc(topo)}</text>
    <text x="64" y="78" text-anchor="middle" font-family="Sora, sans-serif" font-size="18" font-weight="800" fill="#FFFFFF">${esc(baixo)}</text>
  </svg>`;
}
export function certificadoFaixaHtml(c, { qr = '', assinaturas = {} } = {}) {
  const e = c.escola || {};
  const fx = c.faixa || {};
  const cor = coresOk(c.cores || fx.cor);
  const base = cor[0]; const meio = cor[1];
  const corEscola = hexOk(e.cor, '#1E2A78');
  const logo = urlImagemOk(e.logo) ? e.logo : monograma(e.curto || e.nome, corEscola);
  const ev = c.evento && c.evento.nome ? c.evento : null;
  const nucleo = tituloDoNucleo(c.nucleo);
  const local = e.cidade ? `, ${esc(e.cidade)}${e.uf ? ` / ${esc(e.uf)}` : ''}` : '';
  const peca = String(e.peca || 'faixa'); const Peca = peca.charAt(0).toUpperCase() + peca.slice(1);
  const graus = Math.max(0, Number(c.graus) || 0);
  const ehGrau = graus > 0 && c.anterior === c.cordao;
  const texto = ev
    ? `recebeu no <b>${esc(ev.nome)}</b>, realizado em ${esc(dataLonga(c.data))}${ev.local ? ` no ${esc(ev.local)}` : ''}${local}, ${ehGrau ? 'o grau de' : 'a graduação de'}`
    : `recebeu em ${esc(dataLonga(c.data))}${nucleo ? `, no <b>${esc(nucleo)}</b>` : ''}${local}, ${ehGrau ? 'o grau de' : 'a graduação de'}`;
  const rotulo = String(c.rotulo || c.cordao || '').replace(/\s*·\s*/, ' · ');
  const desenho = faixaSVG({ nome: c.cordao, cor, ponteira: fx.ponteira, padrao: fx.padrao, grauDan: fx.grauDan, graus: fx.graus }, { graus, largura: 300, altura: 26, titulo: rotulo });
  const ano = String(c.data || '').slice(0, 4);
  const ass = (Array.isArray(c.assinaturas) ? c.assinaturas : []).slice(0, 2);
  const listra = `linear-gradient(180deg,${base},${base} 40%,${meio} 40%,${meio} 60%,${base} 60%)`;
  return `<article class="cert cert-faixa" aria-label="Certificado de graduação — ${esc(Peca)} ${esc(rotulo)}">
    <div class="gui"></div>
    <div class="faixa">
      <div class="corda" style="background:${sombraV},${base};border-radius:0 0 6px 6px"></div>
      <div class="no" style="background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.35),rgba(0,0,0,0) 55%),${base};border-radius:8px"></div>
      <div class="franja" style="background:${listra};border-radius:3px 3px 6px 6px"></div>
      <img class="faixa-brasao" src="${esc(logo)}" alt="">
    </div>
    <div class="moldura1"></div><div class="moldura2"></div>
    <img class="dagua" src="${esc(logo)}" alt="">
    <div class="miolo">
      <div class="topo">
        <div class="grupo"><img src="${esc(logo)}" alt="Logo ${esc(e.curto || e.nome || '')}" style="border-radius:18px;object-fit:contain;background:#fff"><span><small>${esc(String(e.modalidade || 'Artes marciais').toUpperCase())}</small><b>${esc(e.curto || e.nome || '')}</b><em>${e.responsavel ? `${esc(e.lider || 'Professor')}: ${esc(e.responsavel)}` : esc(e.nome || '')}${e.cidade ? ` · ${esc(e.cidade)}${e.uf ? ` / ${esc(e.uf)}` : ''}` : ''}</em></span></div>
        <div class="numero"><small>CERTIFICADO Nº</small><b>${esc(c.numero || '')}</b></div>
      </div>
      <div class="texto">
        <span class="eyebrow">CERTIFICADO DE ${ehGrau ? 'GRAU' : 'GRADUAÇÃO'}</span>
        <span class="certificamos">Certificamos que</span>
        <span class="nome${String(c.nome || '').length > 28 ? ' longo' : ''}">${esc(nomeBonito(c.nome))}</span>
        <span class="recebeu">${texto}</span>
        <div class="linha-cordao"><span${(ehGrau ? rotulo : `${Peca} ${rotulo}`).length > 16 ? ' style="font-size:30px"' : ''}>${esc(ehGrau ? rotulo : `${Peca} ${rotulo}`)}</span><span class="faixa-svg" style="display:inline-block;width:300px;line-height:0;filter:drop-shadow(0 6px 10px rgba(0,0,0,.25))">${desenho}</span></div>
        <span class="criterios">Graduação concedida pelo responsável técnico de ${esc(e.curto || e.nome || 'escola')}, conforme o sistema de ${esc(/ão$/.test(peca) ? peca.replace(/ão$/, 'ões') : /l$/.test(peca) ? peca.replace(/l$/, 'is') : `${peca}s`)}${fx.graus ? ' e graus' : ''} de ${esc(e.modalidade || 'artes marciais')}: tempo mínimo, idade e avaliação técnica.</span>
      </div>
      <div class="base">
        ${ass.map((a) => assinatura(a, assinaturas)).join('')}${ass.length < 2 ? '<div></div>'.repeat(2 - ass.length) : ''}
        ${seloEscola(ehGrau ? 'GRAU' : 'GRADUAÇÃO', ano, `${e.curto || e.nome || ''} · ${e.modalidade || ''}`, corEscola)}
        <div class="autentica">${qr ? `<div class="qr">${qr}</div>` : '<div class="qr"></div>'}<span><small>AUTENTICIDADE</small><p>Aponte a câmera para conferir na página oficial.</p>${c.matricula ? `<b class="mat">Matrícula<br>${esc(c.matricula)}</b>` : ''}</span></div>
      </div>
    </div>
    ${c.ativo === false ? '<div class="cancelado"><span>CANCELADO</span></div>' : ''}
  </article>`;
}

// Textos curtos (título da página, lista, compartilhar) para os dois tipos de certificado.
export function tituloDoCertificado(c, item = {}) {
  if (c && c.tipo === 'faixa') {
    const peca = String((c.escola && c.escola.peca) || 'faixa'); const Peca = peca.charAt(0).toUpperCase() + peca.slice(1);
    const rot = c.rotulo || c.cordao || '';
    return (Number(c.graus) || 0) > 0 && c.anterior === c.cordao ? rot : `${Peca} ${rot}`;
  }
  return `Cordão ${(c && c.cordao) || item.cordao || ''}`;
}
export const grupoDoCertificado = (c) => (c && c.tipo === 'faixa' && c.escola ? (c.escola.curto || c.escola.nome || '') : `Grupo de Capoeira ${ESCOLA.nomeCurto}`);

export function certificadoHtml(c, { qr = '', assinaturas = {} } = {}) {
  if (c && c.tipo === 'faixa' && c.escola) return certificadoFaixaHtml(c, { qr, assinaturas });
  const cor = coresOk(c.cores);
  const ev = c.evento && c.evento.nome ? c.evento : null;
  const legado = c.legado === true || !c.data;
  const nucleo = tituloDoNucleo(c.nucleo);
  let texto;
  if (legado) texto = `possui, no ${nucleo ? `núcleo <b>${esc(nucleo)}</b> do ` : ''}Grupo de Capoeira ${esc(ESCOLA.nomeCurto)}, a graduação de`;
  else if (ev) texto = `recebeu no <b>${esc(ev.nome)}</b>, realizado em ${esc(dataLonga(c.data))}${ev.local ? ` no ${esc(ev.local)}` : ''}, ${esc(ESCOLA.cidade)} / ${esc(ESCOLA.uf)}, a graduação de`;
  else texto = `recebeu em ${esc(dataLonga(c.data))}${nucleo ? `, no núcleo <b>${esc(nucleo)}</b>` : ''}, ${esc(ESCOLA.cidade)} / ${esc(ESCOLA.uf)}, a graduação de`;
  const criterios = legado
    ? 'Graduação conquistada antes do registro digital do grupo e reconhecida pelo seu mestre: fundamentos, jogo, musicalidade, história e filosofia da capoeira.'
    : 'Aprovado com 70% ou mais nos 15 critérios avaliados pelo seu mestre: fundamentos, jogo, musicalidade, história e filosofia da capoeira.';
  const ano = String(c.data || '').slice(0, 4);
  const seloHtml = legado ? selo('GRADUAÇÃO', 'LE') : selo(ev && /batizado/i.test(ev.nome) ? 'BATIZADO' : 'GRADUAÇÃO', ano);
  const ass = (Array.isArray(c.assinaturas) ? c.assinaturas : []).slice(0, 2);
  return `<article class="cert${legado ? ' legado' : ''}" aria-label="Certificado de graduação — Cordão ${esc(c.cordao)}">
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
        <div class="grupo"><img src="${BRASAO}" alt="Brasão do Grupo ${esc(ESCOLA.nomeCurto)}"><span><small>GRUPO DE CAPOEIRA</small><b>${esc(ESCOLA.nomeCurto)}</b><em>Fundador: ${esc(ESCOLA.mestre)} · ${esc(ESCOLA.cidade)} / ${esc(ESCOLA.uf)}</em></span></div>
        <div class="numero"><small>CERTIFICADO Nº</small><b>${esc(c.numero || '')}</b></div>
      </div>
      <div class="texto">
        <span class="eyebrow">CERTIFICADO DE GRADUAÇÃO</span>
        <span class="certificamos">Certificamos que</span>
        <span class="nome${String(c.nome || '').length > 28 ? ' longo' : ''}">${esc(nomeBonito(c.nome))}</span>
        <span class="recebeu">${texto}</span>
        <div class="linha-cordao"><span>Cordão ${esc(c.cordao || '')}</span><i style="background:${sombraH},${listras(cor)};${cor.every((x) => /^#(f|e)/i.test(x)) ? 'box-shadow:0 0 0 1px #B9C9C5,0 6px 12px -6px rgba(0,0,0,.45)' : ''}"></i></div>
        <span class="criterios">${criterios}</span>
      </div>
      <div class="base">
        ${ass.map((a) => assinatura(a, assinaturas)).join('')}${ass.length < 2 ? '<div></div>'.repeat(2 - ass.length) : ''}
        ${seloHtml}
        <div class="autentica">${qr ? `<div class="qr">${qr}</div>` : '<div class="qr"></div>'}<span><small>AUTENTICIDADE</small><p>Aponte a câmera para conferir na página oficial.</p>${c.matricula ? `<b class="mat">Matrícula<br>${esc(c.matricula)}</b>` : ''}</span></div>
      </div>
    </div>
    ${c.ativo === false ? '<div class="cancelado"><span>CANCELADO</span></div>' : ''}
  </article>`;
}

// Busca as imagens das assinaturas reais (assinaturas/{uid}) de uma lista de certificados.
// getDocFn/docFn: do Firestore (normal ou Lite), para servir às duas páginas.
export async function carregarAssinaturas(certs, { db, doc, getDoc }) {
  const uids = Array.from(new Set(certs.flatMap((c) => (Array.isArray(c.assinaturas) ? c.assinaturas : []).map((a) => a && a.uid).filter(Boolean))));
  const mapa = {};
  await Promise.all(uids.map((u) => getDoc(doc(db, 'assinaturas', u)).then((s) => { if (s.exists() && urlImagemOk(s.data().url)) mapa[u] = s.data().url; }).catch(() => null)));
  return mapa;
}
