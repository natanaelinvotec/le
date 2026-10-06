/* site-render.js — monta o HTML do site público a partir do conteúdo.

Funções puras (sem DOM): o navegador usa para desenhar o site com o conteúdo
do Firestore, e tools/gerar-site.mjs usa no Node para gravar a versão padrão
dentro do index.html (abre instantâneo e funciona até sem JavaScript).

Segurança: TODO texto vindo do conteúdo passa por esc() e todo link/foto por
url() — o painel é só do Admin, mas o site nunca confia no que está gravado. */

import { ESCOLA, CORDOES_ADULTO } from './escola.js';
import { SITE_PADRAO } from './site-padrao.js?v=20261006';

// ---------- utilidades seguras ----------
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Só aceita caminho do próprio site (assets/...) ou https://. Nada de javascript:, data:, etc.
export function url(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^https:\/\/[^\s"'<>\\]+$/i.test(s)) return s;
  if (/^[a-z0-9][a-z0-9._\/-]*$/i.test(s) && !s.includes('..')) return s;
  return '';
}
// Links para fora (Instagram, álbum, mapa): só https:// completo.
export const urlLink = (u) => { const s = String(u ?? '').trim(); return /^https:\/\/[^\s"'<>\\]+$/i.test(s) ? s : ''; };
// Site digitado sem o https:// (ex.: "celulams.com.br" ou "www.loja.com.br/x") vira link completo.
// Qualquer outra coisa (javascript:, http:// sem TLS, espaços) continua recusada.
export const urlSite = (u) => {
  const s = String(u ?? '').trim();
  if (urlLink(s)) return s;
  return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/[^\s"'<>\\]*)?$/i.test(s) ? `https://${s}` : '';
};
const hostDe = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
// "Hoje" no fuso de Campo Grande (evento às 19h não vira "passado" às 20h por causa do UTC).
export function hojeLocal(d = new Date()) {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Campo_Grande', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
  catch (e) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
}
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
export function linkWhats(numero, texto) {
  let d = digitos(numero);
  if (!d) return '';
  if (!(d.startsWith('55') && d.length >= 12)) d = '55' + d;
  return `https://wa.me/${d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}
const linkMapa = (endereco) => (endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : '');
const posicao = (p) => (/^\d{1,3}% \d{1,3}%$/.test(String(p || '')) ? p : '50% 50%');
const lista = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const textos = (v) => (Array.isArray(v) ? v.map((x) => String(x ?? '')).filter(Boolean) : []);

// Junta o conteúdo salvo com o padrão: seção por seção, campo por campo.
// Listas salvas substituem as do padrão (inclusive vazias, se o Admin apagou tudo).
export function mesclar(remoto, padraoBase = SITE_PADRAO) {
  const padrao = JSON.parse(JSON.stringify(padraoBase)); // cópia: quem edita o resultado nunca mexe no padrão
  const out = {};
  const r = remoto && typeof remoto === 'object' ? remoto : {};
  Object.keys(padrao).forEach((k) => {
    const p = padrao[k]; const v = r[k];
    if (Array.isArray(p)) out[k] = Array.isArray(v) ? v : p;
    else if (p && typeof p === 'object') {
      const sec = { ...p };
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.keys(v).forEach((c) => {
          if (Array.isArray(p[c]) && !Array.isArray(v[c])) return; // tipo errado: fica o padrão
          if (typeof p[c] === 'string' && typeof v[c] !== 'string') return;
          sec[c] = v[c];
        });
      }
      out[k] = sec;
    } else out[k] = v !== undefined ? v : p;
  });
  return out;
}

// ---------- ícones (traço, sem emoji) ----------
const I = {
  seta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
  pino: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  pessoa: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  relogio: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  conversa: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.7-5.2A8.5 8.5 0 1 1 21 12z"/></svg>',
  rota: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  play: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
  certo: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  baixar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  fechar: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  globo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  mais: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
};

const titulo = (sec, tag = 'h2') => `<${tag} class="tit">${esc(sec.titulo)} <em>${esc(sec.destaque)}</em></${tag}>`;
const selo = (t) => (t ? `<span class="selo">${esc(t)}</span>` : '');
const img = (src, alt, extra = '') => { const u = url(src); return u ? `<img src="${esc(u)}" alt="${esc(alt)}" loading="lazy" decoding="async"${extra}>` : `<span class="sem-foto" role="img" aria-label="${esc(alt)}"></span>`; };
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// ---------- seções ----------
function navegacao() {
  const links = [['#grupo', 'O grupo'], ['#graduacao', 'Graduação'], ['#nucleos', 'Núcleos'], ['#mestres', 'Mestres'], ['#agenda', 'Agenda'], ['#loja', 'Loja'], ['#app', 'App']];
  return `<header class="nav" id="topo">
  <a class="marca" href="#inicio" aria-label="${esc(ESCOLA.nome)} — início">
    <img src="${esc(ESCOLA.logo)}" alt="" width="52" height="52">
    <span><b>${esc(ESCOLA.nomeCurto)}</b><small>CAPOEIRA · ${esc(ESCOLA.mestre.toUpperCase())}</small></span>
  </a>
  <nav class="links" id="menu" aria-label="Principal">
    ${links.map(([h, t]) => `<a class="nl" href="${h}">${t}</a>`).join('')}
    <a class="nl so-celular" href="login.html">Área do aluno</a>
    <a class="nl so-celular" href="instalar.html">Instalar o app</a>
  </nav>
  <div class="acoes">
    <a class="bt bt-linha esconde-celular" href="login.html">${I.pessoa} Área do aluno</a>
    <a class="bt bt-verde" href="#aula">Aula grátis</a>
    <button class="hamb" type="button" aria-label="Abrir menu" aria-controls="menu" aria-expanded="false">${I.menu}</button>
  </div>
</header>`;
}

function hero(t, numeros) {
  const slides = lista(t.slides).filter((s) => url(s.foto));
  const s0 = slides[0] || { selo: '', titulo: '', texto: '' };
  return `<section class="hero" id="inicio" data-hero>
  <div class="anel anel-a" aria-hidden="true"><svg viewBox="0 0 900 900"><circle cx="450" cy="450" r="449" fill="none" stroke="rgba(56,158,146,.45)" stroke-width="1.2" stroke-dasharray="2 12"/><circle cx="450" cy="1" r="6" fill="#00E676"/></svg></div>
  <div class="anel anel-b" aria-hidden="true"><svg viewBox="0 0 660 660"><circle cx="330" cy="330" r="329" fill="none" stroke="rgba(127,211,199,.3)" stroke-width="1"/><circle cx="1" cy="330" r="4" fill="#7FE3C8"/></svg></div>
  <span class="onda" aria-hidden="true"></span><span class="onda d2" aria-hidden="true"></span><span class="onda d3" aria-hidden="true"></span>
  <div class="hero-grade">
    <div class="hero-texto">
      ${t.selo ? `<span class="pilula"><i></i>${esc(t.selo)}</span>` : ''}
      <h1>${esc(t.titulo)}<br><em>${esc(t.destaque)}</em></h1>
      <p>${esc(t.texto)}</p>
      <div class="hero-bts">
        <a class="bt bt-verde bt-grande pulsa" href="#aula">${esc(t.botao)} ${I.seta}</a>
        <a class="bt bt-linha bt-grande" href="#nucleos">${I.pino} ${esc(t.botao2)}</a>
      </div>
    </div>
    <div class="hero-foto">
      <div class="palco" data-palco tabindex="0" aria-label="Fotos do grupo — toque para girar o brasão">
        <span class="rastro" aria-hidden="true"></span>
        <div class="janela">
          ${slides.map((s, i) => `<img class="slide${i === 0 ? ' on' : ''}" src="${esc(url(s.foto))}" alt="${esc(s.titulo || 'Foto do grupo')}" style="object-position:${posicao(s.posicao)}" data-selo="${esc(s.selo)}" data-titulo="${esc(s.titulo)}" data-texto="${esc(s.texto)}"${i === 0 ? ' fetchpriority="high"' : ' loading="lazy"'}>`).join('')}
          <span class="sombra" aria-hidden="true"></span>
        </div>
        <div class="orbita" aria-hidden="true"><img class="sat" src="${esc(ESCOLA.logo)}" alt=""></div>
        ${slides.length > 1 ? `<div class="pontos">${slides.map((_, i) => `<button type="button" class="ponto${i === 0 ? ' on' : ''}" data-ir="${i}" aria-label="Ver foto ${i + 1}"></button>`).join('')}</div>` : ''}
      </div>
      <div class="legenda" aria-live="polite"><span class="l-selo">${esc(s0.selo)}</span><b class="l-tit">${esc(s0.titulo)}</b><span class="l-txt">${esc(s0.texto)}</span></div>
    </div>
  </div>
  <div class="numeros">${lista(numeros).slice(0, 4).map((n) => `<div><b>${esc(n.valor)}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div>
</section>`;
}

function faixa(itens) {
  const um = textos(itens).map((x) => `<span>${esc(x)}</span><i aria-hidden="true">●</i>`).join('');
  return um ? `<div class="faixa" aria-label="${esc(textos(itens).join(', '))}"><div class="marquee" aria-hidden="true">${um}${um}</div></div>` : '';
}

function arte(a) {
  return `<section class="sec" id="grupo">
  <div class="cab dupla"><div>${selo(a.selo)}${titulo(a)}</div><p class="lead">${esc(a.texto)}</p></div>
  <div class="grade-3">${lista(a.pilares).map((p, i) => `<article class="card zoom revela">
    <div class="foto">${img(p.foto, p.titulo, ` style="object-position:${posicao(p.posicao)}"`)}</div>
    <div class="corpo"><h3><em>${String(i + 1).padStart(2, '0')}</em> ${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>
  </article>`).join('')}</div>
</section>`;
}

function graduacao(g) {
  const ocultar = textos(g.ocultar);
  const cordoes = CORDOES_ADULTO.filter((c) => !ocultar.includes(c.nome));
  return `<section class="bloco-escuro grad" id="graduacao">
  <span class="anel-canto" aria-hidden="true"></span>
  <div class="cab dupla"><div>${selo(g.selo)}${titulo(g)}</div><p class="lead">${esc(g.texto)}</p></div>
  <div class="cordoes" style="--n:${cordoes.length}">${cordoes.map((c, i) => `<div class="cordao" style="--h:${160 + i * Math.round(160 / Math.max(1, cordoes.length - 1))}px">
      <span class="corda" style="--a:${esc(c.cor[0])};--b:${esc(c.cor[1])};--c:${esc(c.cor[2])}"></span><b>${esc(c.nome.replace('/', ' / '))}</b></div>`).join('')}</div>
  <div class="grad-rodape"><span>${esc(g.infantil)}</span><a class="bt bt-branco" href="login.html">${esc(g.botao)} ${I.seta}</a></div>
</section>`;
}

function nucleos(n) {
  const itens = lista(n.lista);
  return `<section class="sec" id="nucleos">
  <div class="cab linha"><div>${selo(n.selo)}${titulo(n)}</div>
    <div class="filtros" role="group" aria-label="Filtrar núcleos">
      <button type="button" class="on" data-filtro="todos" aria-pressed="true">Todos</button>
      <button type="button" data-filtro="infantil" aria-pressed="false">Infantil</button>
      <button type="button" data-filtro="noite" aria-pressed="false">Noite</button>
    </div></div>
  <div class="grade-3 nucleos">${itens.map((x) => `<article class="card nucleo revela" data-infantil="${x.infantil ? 1 : 0}" data-noite="${x.noite ? 1 : 0}">
    <div class="pessoa"><span class="aro">${img(x.foto, x.nome)}</span><div><span class="mini">${esc(x.bairro)}</span><h3>${esc(x.nome)}</h3></div></div>
    <ul class="info"><li>${I.cal}${esc(x.dias)}</li><li>${I.relogio}${esc(x.horario)}</li><li>${I.pino}${esc(x.endereco)}</li></ul>
    <div class="nucleo-bts">
      ${linkWhats(x.whatsapp) ? `<a class="bt bt-marinho" href="${esc(linkWhats(x.whatsapp, n.convite))}" target="_blank" rel="noopener">${I.conversa} Chamar no WhatsApp</a>` : ''}
      ${x.endereco ? `<a class="bt bt-icone" href="${esc(linkMapa(x.endereco))}" target="_blank" rel="noopener" aria-label="Como chegar — ${esc(x.nome)}">${I.rota}</a>` : ''}
    </div>
  </article>`).join('')}</div>
  <p class="vazio-filtro" hidden>Nenhum núcleo com esse filtro — fale com a secretaria.</p>
  ${n.nota ? `<p class="nota">${esc(n.nota)}</p>` : ''}
</section>`;
}

function mestres(m) {
  return `<section class="sec branco" id="mestres">
  <div class="cab linha"><div>${selo(m.selo)}${titulo(m)}</div><p class="lead">${esc(m.texto)}</p></div>
  <div class="mestres">${lista(m.lista).map((x) => {
    const link = urlLink(x.instagram);
    const tag = link ? 'a' : 'div';
    return `<${tag} class="card mestre revela"${link ? ` href="${esc(link)}" target="_blank" rel="noopener"` : ''}>
      <span class="aro grande">${img(x.foto, x.nome)}${link ? `<i class="play">${I.play}</i>` : ''}</span>
      <b>${esc(x.nome)}</b><span>${esc(x.cargo)}</span></${tag}>`;
  }).join('')}</div>
</section>`;
}

function agenda(a, hoje) {
  const itens = lista(a.lista).filter((e) => e.titulo).map((e) => ({ ...e, d: typeof e.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.data) ? e.data : '' }));
  const futuros = itens.filter((e) => e.d && e.d >= hoje).sort((x, y) => x.d.localeCompare(y.d));
  const passados = itens.filter((e) => !e.d || e.d < hoje).sort((x, y) => y.d.localeCompare(x.d));
  const destaque = futuros[0] || null;
  const resto = futuros.slice(1).concat(passados).slice(0, 5);
  const quando = (e) => {
    if (e.dataTexto) return e.dataTexto;
    if (!e.d) return '';
    const [ano, mes, dia] = e.d.split('-').map(Number);
    return `${dia} de ${MESES_LONGOS[mes - 1]} de ${ano}`;
  };
  const linha = (e) => {
    const [, mes, dia] = (e.d || '--').split('-');
    const fotos = urlLink(e.fotos);
    const passado = e.d && e.d < hoje;
    const alvo = passado && fotos ? fotos : (e.mapa ? linkMapa(e.mapa) : '');
    return `<a class="evento"${alvo ? ` href="${esc(alvo)}" target="_blank" rel="noopener"` : ''}>
      <span class="data"><b>${esc(dia || '—')}</b><small>${esc(mes ? MESES[Number(mes) - 1] : '')}</small></span>
      <span class="ev-txt"><b>${esc(e.titulo)}</b><small>${esc(e.local)}${passado ? '' : ` · ${esc(e.horario)}`}</small></span>
      <span class="ev-acao">${passado ? (fotos ? 'Ver fotos' : 'Realizado') : 'Como chegar'} ${I.mais}</span>
    </a>`;
  };
  return `<section class="sec agenda" id="agenda">
  <div class="destaque zoom-lento">
    ${img(a.foto, 'Roda de capoeira do grupo', ' class="kb"')}
    <span class="veu" aria-hidden="true"></span>
    <div class="dest-txt">${destaque ? `<span class="tag-verde">PRÓXIMO EVENTO</span>
      <h3>${esc(destaque.titulo)}</h3>
      <p>${esc(quando(destaque))}${destaque.local ? ` · ${esc(destaque.local)}` : ''}${destaque.horario ? ` · ${esc(destaque.horario)}` : ''}</p>
      <div class="linha-bts"><a class="bt bt-branco" href="#aula">Quero participar</a>${destaque.mapa ? `<a class="bt bt-linha" href="${esc(linkMapa(destaque.mapa))}" target="_blank" rel="noopener">Como chegar</a>` : ''}</div>`
      : `<span class="tag-verde">AGENDA</span><h3>Novos eventos em breve</h3><p>Acompanhe pelo app e pelo Instagram do grupo.</p>`}</div>
  </div>
  <div class="agenda-lista">${selo(a.selo)}${titulo(a)}
    <div class="eventos">${resto.map(linha).join('') || '<p class="nota">Nenhum outro evento cadastrado.</p>'}</div>
    ${a.aviso ? `<p class="nota">${esc(a.aviso)}</p>` : ''}
  </div>
</section>`;
}

function appSec(a) {
  return `<section class="bloco-escuro app" id="app">
  <span class="brilho" aria-hidden="true"></span>
  <div class="app-txt">${selo(a.selo)}${titulo(a)}<p class="lead">${esc(a.texto)}</p>
    <ul class="recursos">${lista(a.recursos).map((r) => `<li><i>${I.certo}</i><span><b>${esc(r.titulo)}</b><small>${esc(r.texto)}</small></span></li>`).join('')}</ul>
    <div class="linha-bts"><a class="bt bt-verde bt-grande" href="instalar.html">${I.baixar} Instalar o app e a Rede</a>
      <span class="icones"><img src="assets/app-icon-192.png" alt="Ícone do app" width="48" height="48"><img src="assets/rede-icon-192.png" alt="Ícone da Rede Liberdade" width="48" height="48"></span></div>
  </div>
  <div class="app-prints" aria-hidden="false">
    ${url(a.printApp) ? `<figure class="print p1 flutua">${img(a.printApp, 'Tela inicial do app do aluno')}<figcaption>App do aluno</figcaption></figure>` : ''}
    ${url(a.printRede) ? `<figure class="print p2 flutua d2">${img(a.printRede, 'Perfil na Rede Liberdade')}<figcaption class="verde">Rede Liberdade</figcaption></figure>` : ''}
  </div>
</section>`;
}

function loja(l) {
  return `<section class="sec" id="loja">
  <div class="cab linha"><div>${selo(l.selo)}${titulo(l)}</div><p class="lead">${esc(l.texto)}</p></div>
  <div class="grade-3">${lista(l.produtos).map((p) => {
    const w = linkWhats(l.whatsapp, `Olá! Quero comprar: ${p.nome || ''}${p.preco ? ` (${p.preco})` : ''}.`);
    return `<article class="card produto zoom revela"><div class="foto">${img(p.foto, p.nome)}</div>
      <div class="corpo"><h3>${esc(p.nome)}</h3><p>${esc(p.texto)}</p>
      <div class="preco"><b>${esc(p.preco)}</b>${w ? `<a class="bt bt-claro" href="${esc(w)}" target="_blank" rel="noopener">Comprar</a>` : ''}</div></div></article>`;
  }).join('')}</div>
</section>`;
}

function chamada(c, n) {
  const opcoes = lista(n.lista).filter((x) => linkWhats(x.whatsapp));
  return `<section class="chamada" id="aula">
  ${img(c.foto, 'O grupo reunido', ' class="kb fundo"')}
  <span class="veu-lado" aria-hidden="true"></span>
  <div class="chamada-grade">
    <div>${titulo(c)}<p class="lead">${esc(c.texto)}</p></div>
    <form class="form-aula" novalidate>
      <b>${esc(c.formTitulo)}</b>
      <label for="aula-nome">Nome<input id="aula-nome" name="nome" type="text" autocomplete="name" maxlength="80" placeholder="Seu nome" required></label>
      <label for="aula-idade">Para quem é a aula?<select id="aula-idade" name="publico"><option>Para mim (adulto)</option><option>Para meu filho(a)</option><option>Para a família toda</option></select></label>
      <label for="aula-nucleo">Núcleo<select id="aula-nucleo" name="nucleo">${opcoes.map((x, i) => `<option value="${i}" data-w="${esc(digitos(x.whatsapp))}">${esc(x.bairro)} — ${esc(x.nome)}</option>`).join('')}</select></label>
      <button class="bt bt-verde bt-grande" type="submit">Quero minha aula grátis ${I.seta}</button>
      <small class="ajuda" aria-live="polite">${esc(c.formAjuda)}</small>
    </form>
  </div>
</section>`;
}

// Parceiros: um cartão por parceiro. Sozinho ele ocupa a largura toda.
// Botões: site do parceiro (aceita "celulams.com.br" sem https) e atendimento
// online pelo WhatsApp com a mensagem pronta (editável no painel, por parceiro).
export const MENSAGEM_PARCEIRO = `Olá, sou do grupo de capoeira ${ESCOLA.nomeCurto} e gostaria de solicitar orçamento com o perfil Atleta!`;
export function cartaoParceiro(p, extraClasse = '') {
  const mensagem = String(p.mensagem || '').trim() || MENSAGEM_PARCEIRO;
  const w = linkWhats(p.whatsapp, mensagem);
  const l = urlSite(p.link);
  const rotuloSite = String(p.rotuloLink || '').trim() || (hostDe(l) ? `Visitar ${hostDe(l)}` : 'Visitar o site');
  const rotuloWhats = String(p.rotuloWhats || '').trim() || 'Atendimento online';
  const frase = String(p.frase || '');
  // A última palavra da frase ganha o destaque em itálico ("…começa no *movimento!*").
  const corte = frase.trim().lastIndexOf(' ');
  const fraseHtml = corte > 0 ? `${esc(frase.slice(0, corte))} <em>${esc(frase.slice(corte + 1))}</em>` : esc(frase);
  return `<article class="parceiro ${extraClasse}">
    <div class="parc-logo"><span class="parc-aura" aria-hidden="true"></span>${img(p.logo, `Logo ${p.nome || 'do parceiro'}`, ' class="parc-img"')}</div>
    <div class="parc-txt">
      <span class="parc-selo">${I.certo} Parceiro oficial · ${esc(p.nome)}</span>
      ${frase ? `<h3 class="parc-frase">${fraseHtml}</h3>` : ''}
      ${p.destaque || p.beneficio ? `<p class="parc-oferta">${p.destaque ? `<b>${esc(p.destaque)}</b>` : ''}${p.beneficio ? `<span>${esc(p.beneficio)}</span>` : ''}</p>` : ''}
      ${p.como ? `<p class="parc-como">${esc(p.como)}</p>` : ''}
      ${w || l ? `<div class="parc-bts">${l ? `<a class="bt bt-claro parc-bt-site" href="${esc(l)}" target="_blank" rel="noopener">${I.globo} ${esc(rotuloSite)}</a>` : ''}${w ? `<a class="bt bt-verde parc-bt-whats" href="${esc(w)}" target="_blank" rel="noopener" aria-label="${esc(`${rotuloWhats} pelo WhatsApp com ${p.nome || 'o parceiro'}`)}">${I.conversa} ${esc(rotuloWhats)}</a>` : ''}</div>` : ''}
    </div>
  </article>`;
}

function parceiros(p) {
  const itens = lista(p.lista);
  if (!itens.length) return '';
  return `<section class="sec" id="parceiros">
  <div class="cab linha"><div>${selo(p.selo)}${titulo(p)}</div><p class="lead">${esc(p.texto)}</p></div>
  <div class="parceiros${itens.length === 1 ? ' so-um' : ''}">${itens.map((x) => cartaoParceiro(x, 'revela')).join('')}</div>
</section>`;
}

function rodape(r) {
  const ig = urlLink(r.instagramUrl); const fb = urlLink(r.facebookUrl);
  return `<footer class="rodape">
  <div class="rod-marca"><img src="${esc(ESCOLA.logo)}" alt="" width="56" height="56"><b>Capoeira<br>${esc(ESCOLA.nomeCurto)}</b><p>${esc(r.texto)}</p></div>
  <div><span class="mini">CONTATO</span><p>${esc(r.telefone)}</p><p>${esc(r.endereco)}</p></div>
  <div><span class="mini">REDES</span>${ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener">${esc(r.instagram)}</a>` : ''}${fb ? `<a href="${esc(fb)}" target="_blank" rel="noopener">${esc(r.facebook)}</a>` : ''}</div>
  <div><span class="mini">SISTEMA</span><a href="login.html">Área do aluno</a><a href="inscricao.html">Ficha de inscrição</a><a href="admin.html">Painel do professor</a><a href="instalar.html">Instalar o app e a Rede</a><a href="gerenciar.html">Gerenciar o site</a></div>
  <p class="copy">© ${new Date().getFullYear()} ${esc(ESCOLA.nome)}. Todos os direitos reservados.</p>
</footer>`;
}

// Página inteira (conteúdo do <body>). hoje = 'AAAA-MM-DD' (separa próximos de passados).
export function renderizarSite(conteudo, hoje = hojeLocal()) {
  const d = mesclar(conteudo);
  return [
    navegacao(),
    '<main id="conteudo">',
    hero(d.topo, d.numeros), faixa(d.faixa), arte(d.arte), graduacao(d.graduacao), nucleos(d.nucleos),
    mestres(d.mestres), agenda(d.agenda, hoje), appSec(d.app), loja(d.loja), chamada(d.chamada, d.nucleos),
    parceiros(d.parceiros),
    '</main>',
    rodape(d.rodape),
  ].join('\n');
}
