/* site-v3.js — atletapay.com.br v3 (17/10/2026): vitrine dos modelos de site, escada inteira e loja oficial.

Carregado pelo site-v2.js depois dos módulos do app. Nada aqui inventa dado: os modelos vêm do registro
real (/app/js/site-templates.js), as faixas são desenhadas pelo faixaSVG do app e os produtos pelo
site-loja.js. Os prints dos modelos ficam em assets/site/tpl/<id>.webp (regerar quando um template mudar).
Produtos e preços da loja são exemplos declarados da Academia Horizonte (escola fictícia da demonstração). */

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
const semMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CORES = { capoeira: '#0E9F6E', jiujitsu: '#1E4FD8', judo: '#0F7490', karate: '#E5484D', taekwondo: '#D98E04', muaythai: '#C62828', boxe: '#8E44AD', kickboxing: '#F57C00', mma: '#389E92', kungfu: '#B7472A', kravmaga: '#6B7C93', wrestling: '#2F6FED' };
const DESTAQUE = { capoeira: '#F2C94C', jiujitsu: '#F2C94C', judo: '#C8102E', karate: '#111111', taekwondo: '#E1262D', muaythai: '#D4AF37', boxe: '#F2C94C', kickboxing: '#111111', mma: '#00E676', kungfu: '#F2C94C', kravmaga: '#F5B301', wrestling: '#E1262D' };
const ORDEM = ['guarda', 'ippon', 'dobok', 'ginga', 'mongkon', 'luva', 'escudo', 'horizons'];

/* produtos de exemplo por arte (nomes que o site-loja.js sabe desenhar) */
const PRODUTOS = {
  jiujitsu: [['Kimono oficial da escola', 349], ['Faixa com bordado', 69], ['Rashguard da equipe', 129], ['Mochila do atleta', 159]],
  judo: [['Judogi da escola', 389], ['Faixa (obi) bordada', 69], ['Camiseta do dojô', 79], ['Mochila do atleta', 159]],
  taekwondo: [['Dobok oficial', 299], ['Faixa com nome', 59], ['Protetor de tronco (hogu)', 219], ['Capacete', 189]],
  capoeira: [['Abadá oficial', 149], ['Cordão da graduação', 49], ['Berimbau artesanal', 289], ['Pandeiro 10"', 169]],
  muaythai: [['Shorts de muay thai', 139], ['Prajied da graduação', 39], ['Luva 12 oz', 199], ['Bandagem 5 m', 29]],
  boxe: [['Luva de boxe 14 oz', 229], ['Bandagem 5 m', 29], ['Protetor bucal', 39], ['Camiseta do clube', 79]],
  kickboxing: [['Luva 12 oz', 199], ['Caneleira', 149], ['Shorts da equipe', 119], ['Protetor bucal', 39]],
  mma: [['Luva de MMA', 179], ['Rashguard da equipe', 129], ['Caneleira', 149], ['Garrafa do atleta', 49]],
  karate: [['Karategi oficial', 279], ['Faixa bordada', 59], ['Protetor bucal', 39], ['Mochila do atleta', 159]],
  kungfu: [['Uniforme da escola', 259], ['Faixa', 49], ['Bastão longo (bo)', 119], ['Camiseta da equipe', 79]],
  kravmaga: [['Camiseta de treino', 89], ['Luva de MMA', 179], ['Caneleira', 149], ['Protetor bucal', 39]],
  wrestling: [['Camiseta da equipe', 79], ['Protetor de cabeça', 169], ['Shorts de treino', 119], ['Garrafa do atleta', 49]],
};
const brlInt = (v) => 'R$ ' + v.toLocaleString('pt-BR');
const ZAP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
const SETA = '<svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';

let app = null, TEMPLATES = [], filtro = 'todas', tplAtual = null;
const arteAtual = () => (app && app.estado.arte) || 'jiujitsu';
const nomeArte = (a) => (app ? app.termos(a).arte : a);
const minusc = (n) => (n === 'MMA' ? n : n.toLowerCase());
const indicados = (arte) => TEMPLATES.filter((t) => t.para.includes(arte));
const ordenar = (arte) => [...indicados(arte), ...TEMPLATES.filter((t) => !t.para.includes(arte))];
const plural = (p) => ({ 'cordão': 'cordões', 'nível': 'níveis', 'graduação': 'graduações', prajied: 'prajieds' }[p] || `${p}s`);

/* registro real → lista da vitrine (só templates com módulo; o Arena é o padrão embutido) */
function montarTemplates(registro) {
  const ids = Object.keys(registro).filter((k) => registro[k].modulo);
  ids.sort((a, b) => (ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99));
  return ids.map((id) => {
    const t = registro[id];
    const para = (t.modalidades || []).filter((m) => m !== 'todas' && CORES[m]);
    let noAr = null;
    if (Array.isArray(t.noAr) && t.noAr[0] && t.noAr[0].url) { try { noAr = new URL(t.noAr[0].url).host; } catch (e) { noAr = null; } }
    return { id, nome: t.nome, desc: t.descricao, para, noAr, foto: `assets/site/tpl/${id}.webp` };
  });
}

/* ---------- vitrine ---------- */
function desenharVitrine(animar = true) {
  const arte = arteAtual(); const t = TEMPLATES.find((x) => x.id === tplAtual) || TEMPLATES[0];
  const tela = q('#vitTela'); if (!tela || !t) return;
  tela.innerHTML = '';
  const img = document.createElement('img'); img.src = t.foto; img.alt = ''; img.decoding = 'async'; img.width = 1120; img.height = 556;
  tela.append(img);
  tela.setAttribute('aria-label', `Prévia do modelo ${t.nome}`);
  if (animar && !semMovimento()) { tela.classList.remove('troca'); void tela.offsetWidth; tela.classList.add('troca'); }
  q('#vitNome').textContent = t.nome;
  q('#vitPara').textContent = t.para.length ? `Desenhado para ${t.para.slice(0, 2).map((a) => minusc(nomeArte(a))).join(' e ')}` : 'Serve para qualquer arte';
  q('#vitDesc').textContent = t.desc;
  const abrir = q('#vitAbrir'); if (abrir) abrir.href = `/app/vitrine?tpl=${encodeURIComponent(t.id)}&mod=${encodeURIComponent(arte)}`;
  const selos = [];
  if (t.para.includes(arte)) selos.push(`<span class="selo">Indicado para ${esc(nomeArte(arte))}</span>`);
  if (t.noAr) selos.push(`<span class="selo selo--ar">No ar · ${esc(t.noAr)}</span>`);
  if (!t.para.length) selos.push('<span class="selo selo--escuro">Para todas as artes</span>');
  q('#vitSelos').innerHTML = selos.join('');
  const todas = Object.keys(CORES);
  q('#vitTags').innerHTML = (t.para.length ? t.para : todas.slice(0, 6)).map((a) => `<span class="tag${a === arte ? ' on' : ''}"><i style="background:${CORES[a]}"></i>${esc(nomeArte(a))}</span>`).join('')
    + (t.para.length ? '<span class="tag">+ qualquer arte</span>' : '<span class="tag">+6 artes</span>');
  qa('#listaTpl .tpl').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tpl === t.id)));
}
function desenharLista() {
  const arte = arteAtual(); const ul = q('#listaTpl'); if (!ul) return;
  const lista = (filtro === 'arte' ? [...indicados(arte), ...TEMPLATES.filter((t) => !t.para.length)] : ordenar(arte));
  ul.innerHTML = lista.map((t) => `<li><button type="button" class="tpl" data-tpl="${esc(t.id)}" aria-pressed="${t.id === tplAtual}">`
    + `<span class="tpl__mini" aria-hidden="true"><img src="${esc(t.foto)}" alt="" loading="lazy" decoding="async" width="1120" height="556"></span>`
    + `<span><strong>${esc(t.nome)}</strong><span>${t.para.length ? 'Desenhado para ' + t.para.map((a) => esc(nomeArte(a))).join(', ') : 'Para qualquer arte'}${t.noAr ? ' · no ar' : ''}</span></span>`
    + (t.para.includes(arte) ? '<span class="ind">Indicado</span>' : '<span class="ind ind--serve">Serve</span>') + '</button></li>').join('');
  qa('.tpl', ul).forEach((b) => b.addEventListener('click', () => { tplAtual = b.dataset.tpl; desenharVitrine(); }));
}
function desenharHeroi() {
  const el = q('#arteSites'); if (!el || !TEMPLATES.length) return; const arte = arteAtual();
  const lista = ordenar(arte).slice(0, 3); const n = indicados(arte).length;
  const texto = n ? `${n} modelo${n > 1 ? 's' : ''} de site desenhado${n > 1 ? 's' : ''} para ${minusc(nomeArte(arte))}` : `${TEMPLATES.length} modelos de site para a sua escola`;
  el.innerHTML = `<a href="#sites"><span class="minis" aria-hidden="true">${lista.map((t) => `<span><img src="${esc(t.foto)}" alt="" decoding="async" width="1120" height="556"></span>`).join('')}</span><span>${esc(texto)}</span>${SETA}</a>`;
}

/* ---------- escada inteira ---------- */
function desenharEscada() {
  const el = q('#escada'); if (!el || !app) return;
  const lista = app.listaAtual(); const t = app.termos(arteAtual());
  const tit = q('#escadaTitulo'); if (tit) tit.textContent = `A escada inteira de ${minusc(t.arte)} — ${lista.length} ${lista.length === 1 ? t.peca : plural(t.peca)}`;
  el.innerHTML = '';
  lista.forEach((g, i) => {
    const max = Number(g.graus) || 0;
    const b = document.createElement('button'); b.type = 'button'; b.dataset.i = String(i); b.setAttribute('aria-pressed', String(i === app.estado.idx));
    b.innerHTML = app.fx.faixaSVG(g, { largura: 260, altura: 22 }).replace(/^\s*<svg([^>]*)>/, (m, a) => `<svg${a.replace(/ (width|height)="[^"]*"/g, '')} aria-hidden="true">`);
    const nome = document.createElement('strong'); nome.textContent = g.nome;
    const graus = document.createElement('small'); graus.textContent = max ? `${max} ${max > 1 ? 'graus' : 'grau'}` : 'sem graus';
    b.append(nome, graus);
    b.setAttribute('aria-label', `${g.nome}, ${max ? max + ' grau' + (max > 1 ? 's' : '') : 'sem graus'}`);
    b.addEventListener('click', () => {
      app.estado.idx = i; app.estado.graus = 0; app.estado.vermelhos = 0; app.desenharFaixa(true); desenharEscada();
      const alvo = q('#grad'); if (alvo) alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'nearest' });
    });
    el.append(b);
  });
}

/* ---------- loja ---------- */
function desenharLoja() {
  const el = q('#lojaGrid'); if (!el || !app || !app.loja) return; const arte = arteAtual();
  const cores = { principal: CORES[arte], destaque: DESTAQUE[arte] };
  el.innerHTML = (PRODUTOS[arte] || PRODUTOS.jiujitsu).map(([nome, preco]) => `<article class="prod chanfro"><div class="prod__img" aria-hidden="true">${app.loja.ilustracao(nome, cores)}</div>`
    + `<div class="prod__tx"><strong>${esc(nome)}</strong><span class="preco">${brlInt(preco)}<small>à vista</small></span><span class="zap" aria-hidden="true">${ZAP}Pedir no WhatsApp</span></div></article>`).join('');
}

function tudo() { desenharHeroi(); desenharLista(); desenharVitrine(false); desenharEscada(); desenharLoja(); }
const primeiro = () => (indicados(arteAtual())[0] || TEMPLATES[0] || {}).id || null;

export function init(a) {
  app = a; TEMPLATES = montarTemplates((a.tpls && a.tpls.TEMPLATES) || {}); tplAtual = primeiro();
  qa('.sites__filtro .chip').forEach((c) => c.addEventListener('click', () => {
    filtro = c.dataset.filtro; qa('.sites__filtro .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === c))); desenharLista();
  }));
  tudo();
}
export function arte() { tplAtual = primeiro(); tudo(); }
export function escada() { desenharEscada(); }
