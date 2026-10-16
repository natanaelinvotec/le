/* site-gerenciar.js — aba "Meu site" do painel (admin.html), F4.2.
 *
 * O Admin Master da escola escolhe o template do site público e edita textos e fotos
 * SEM programar nada: o formulário é montado a partir do `schema` que cada template
 * exporta (js/site-tpl-<nome>.js, registro em js/site-templates.js). Template novo na
 * biblioteca = gerenciador novo de graça.
 *
 * Onde fica: Firestore siteConteudo/{escolaId} — { template, secoes, anterior, atualizadoEm,
 * atualizadoPor, versao }. Leitura pública (é o conteúdo do site); gravação só do Admin da
 * própria escola (claim escolaId) — regra em firebase/firestore.rules. Fotos: Storage
 * site/<uid>/ (grava só o próprio login; a URL só aparece no site se for gravada no doc).
 *
 * Prévia ao vivo: iframe do PRÓPRIO site (site-escola.html?escola=<slug>&previa=1) que recebe
 * o rascunho por postMessage (mesma origem) e re-renderiza sem gravar nada. O que o Admin vê
 * na prévia é exatamente o que o visitante verá depois de publicar.
 *
 * Segurança: nada do que o Admin digita vira HTML aqui (textContent / value); no site, cada
 * texto passa por esc() e cada URL por url() dentro do template. Antes de gravar, o rascunho
 * é "limpo" (só strings e listas de objetos de strings, com limites de tamanho).
 */
import { db, doc, getDoc, setDoc, storage, storageRef, uploadBytes, getDownloadURL, minhaEscolaId, meuUid } from './firebase.js';
import { prepararImagem } from './imagem.js';
import { TEMPLATES, TEMPLATE_PADRAO, templateExiste, carregarTemplate } from './site-templates.js';

const MAX_TEXTO = 400;
const MAX_ITENS = 12;
const PREVIA_PAGINA = 'site-escola.html';

let estado = null; // { root, escolaId, slug, pub, doc, template, secoes, schema, previaPronta, sujo }

/* ------------------------------------------------------------------ util */
const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const f of filhos) if (f != null) n.append(f);
  return n;
};
// Mantém quebras de linha (tópicos e horários usam uma por linha); colapsa o resto do espaço.
const limparTexto = (v, max = MAX_TEXTO) => String(v ?? '').replace(/\r/g, '').replace(/[^\S\n]+/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, max);
const ehUrlOk = (u) => /^https:\/\/[^\s"'<>\\]+$/i.test(u) || (/^[a-z0-9][a-z0-9._/-]*$/i.test(u) && !u.includes('..'));

// Só o que o site lê: strings (até 400) e listas (até 12) de objetos de strings. Vazios caem.
function limparSecoes(secoes, schema) {
  const out = {};
  if (!secoes || typeof secoes !== 'object') return out;
  const limites = {};
  (schema?.secoes || []).forEach((s) => s.campos.forEach((c) => { limites[`${s.id}.${c.c}`] = c; }));
  for (const [sid, sec] of Object.entries(secoes)) {
    if (!sec || typeof sec !== 'object' || !/^[a-z][a-z0-9]{0,30}$/i.test(sid)) continue;
    const o = {};
    for (const [c, v] of Object.entries(sec)) {
      if (!/^[a-z][a-z0-9]{0,30}$/i.test(c)) continue;
      const def = limites[`${sid}.${c}`];
      if (Array.isArray(v)) {
        const itens = v.filter((x) => x && typeof x === 'object').slice(0, Math.min(MAX_ITENS, def?.max || MAX_ITENS)).map((x) => {
          const it = {};
          for (const [k, val] of Object.entries(x)) {
            if (!/^[a-z][a-z0-9]{0,30}$/i.test(k) || typeof val !== 'string') continue;
            const dk = (def?.item || []).find((d) => d.c === k);
            const t = limparTexto(val, dk?.max || MAX_TEXTO);
            if (t && (dk?.t !== 'foto' || ehUrlOk(t))) it[k] = t;
          }
          return it;
        }).filter((it) => Object.keys(it).length);
        if (itens.length) o[c] = itens;
      } else if (typeof v === 'string') {
        const t = limparTexto(v, def?.max || MAX_TEXTO);
        if (t && ((def?.t !== 'foto' && def?.t !== 'link') || ehUrlOk(t))) o[c] = t;
      }
    }
    if (Object.keys(o).length) out[sid] = o;
  }
  return out;
}

/* ------------------------------------------------------------------ CSS */
function estilos() {
  if (document.getElementById('ms-css')) return;
  const st = document.createElement('style'); st.id = 'ms-css';
  st.textContent = `
#meuSite{--ms-b:var(--border-color,#E8EEF4);--ms-bg:var(--card-bg,#fff);--ms-ac:var(--primary-teal,#0B5C52);--ms-mut:var(--text-muted,#5B6B68);--ms-ease:cubic-bezier(.16,1,.3,1)}
#meuSite .ms-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
#meuSite .ms-top h2{margin:0;font-size:1.25rem;font-weight:800}
#meuSite .ms-top p{margin:4px 0 0;color:var(--ms-mut);font-size:.92rem}
#meuSite .ms-acoes{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#meuSite .ms-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--ms-b);background:var(--ms-bg);color:inherit;border-radius:999px;padding:9px 16px;font:inherit;font-weight:700;font-size:.9rem;cursor:pointer;transition:transform .35s var(--ms-ease),box-shadow .35s var(--ms-ease),background .35s}
#meuSite .ms-btn:hover{transform:translateY(-1px);box-shadow:0 8px 20px -12px rgba(0,0,0,.35)}
#meuSite .ms-btn:disabled{opacity:.5;cursor:default;transform:none;box-shadow:none}
#meuSite .ms-btn.pri{background:var(--ms-ac);color:#fff;border-color:var(--ms-ac)}
#meuSite .ms-btn.peq{padding:6px 12px;font-size:.8rem}
#meuSite .ms-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(360px,44%);gap:20px;align-items:start}
#meuSite .ms-tpls{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin:8px 0 20px}
#meuSite .ms-tpl{position:relative;text-align:left;border:2px solid var(--ms-b);border-radius:16px;background:var(--ms-bg);padding:12px;cursor:pointer;font:inherit;color:inherit;transition:border-color .3s,transform .35s var(--ms-ease),box-shadow .35s var(--ms-ease)}
#meuSite .ms-tpl:hover{transform:translateY(-2px);box-shadow:0 14px 30px -18px rgba(0,0,0,.35)}
#meuSite .ms-tpl.on{border-color:var(--ms-ac);box-shadow:0 0 0 3px color-mix(in srgb,var(--ms-ac) 18%,transparent)}
#meuSite .ms-tpl .mini{aspect-ratio:16/10;border-radius:10px;background:#EAF2F1;overflow:hidden;margin-bottom:10px;display:grid;place-items:center;color:var(--ms-mut);font-size:.8rem}
#meuSite .ms-tpl .mini img{width:100%;height:100%;object-fit:cover;display:block}
#meuSite .ms-tpl b{display:block;font-size:.98rem}
#meuSite .ms-tpl small{display:block;color:var(--ms-mut);font-size:.8rem;line-height:1.4;margin-top:4px}
#meuSite .ms-tpl .sel{position:absolute;top:10px;right:10px;background:var(--ms-ac);color:#fff;border-radius:999px;font-size:.68rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px}
#meuSite details.ms-sec{border:1px solid var(--ms-b);border-radius:14px;background:var(--ms-bg);margin-bottom:10px;overflow:hidden}
#meuSite details.ms-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;font-weight:800}
#meuSite details.ms-sec>summary::-webkit-details-marker{display:none}
#meuSite details.ms-sec>summary i{transition:transform .35s var(--ms-ease);color:var(--ms-mut)}
#meuSite details.ms-sec[open]>summary i{transform:rotate(180deg)}
#meuSite .ms-corpo{padding:0 16px 16px;display:grid;gap:12px}
#meuSite .ms-ajuda{margin:0;color:var(--ms-mut);font-size:.86rem;line-height:1.5}
#meuSite .ms-campo{display:grid;gap:5px;font-size:.84rem;font-weight:600;color:var(--ms-mut)}
#meuSite .ms-campo>span:first-child{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
#meuSite .ms-campo input,#meuSite .ms-campo textarea,#meuSite .ms-campo select{width:100%;font:inherit;font-size:.95rem;color:inherit;border:1px solid var(--ms-b);border-radius:10px;padding:9px 12px;background:var(--ms-bg)}
#meuSite .ms-campo textarea{min-height:76px;resize:vertical}
#meuSite .ms-campo input:focus,#meuSite .ms-campo textarea:focus{outline:2px solid var(--ms-ac);outline-offset:1px;border-color:transparent}
#meuSite .ms-cont{justify-self:end;font-size:.72rem;font-weight:500}
#meuSite .ms-foto{display:flex;align-items:center;gap:12px;border:1px dashed var(--ms-b);border-radius:12px;padding:10px}
#meuSite .ms-foto .th{width:84px;height:64px;border-radius:8px;background:repeating-conic-gradient(#e9eef2 0 25%,#fff 0 50%) 0 0/16px 16px;display:grid;place-items:center;overflow:hidden;flex:none;color:var(--ms-mut)}
#meuSite .ms-foto .th img{width:100%;height:100%;object-fit:cover;display:block}
#meuSite .ms-foto .ac{display:flex;gap:8px;flex-wrap:wrap}
#meuSite .ms-foto input[type=file]{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
#meuSite .ms-lista{display:grid;gap:10px}
#meuSite .ms-item{border:1px solid var(--ms-b);border-radius:12px;padding:12px;display:grid;gap:10px;background:color-mix(in srgb,var(--ms-bg) 70%,#EAF2F1)}
#meuSite .ms-item .cab{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:700;font-size:.9rem}
#meuSite .ms-item .cab span{display:flex;gap:4px}
#meuSite .ms-item .cab button{border:1px solid var(--ms-b);background:var(--ms-bg);border-radius:8px;width:30px;height:30px;cursor:pointer;color:inherit}
#meuSite .ms-previa{position:sticky;top:16px;border:1px solid var(--ms-b);border-radius:16px;background:var(--ms-bg);overflow:hidden}
#meuSite .ms-previa .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--ms-b);font-size:.84rem;color:var(--ms-mut)}
#meuSite .ms-previa .bar .seg{display:inline-flex;border:1px solid var(--ms-b);border-radius:999px;overflow:hidden}
#meuSite .ms-previa .bar .seg button{border:0;background:transparent;padding:5px 10px;cursor:pointer;color:inherit;font:inherit;font-size:.8rem}
#meuSite .ms-previa .bar .seg button.on{background:var(--ms-ac);color:#fff}
#meuSite .ms-frame{display:grid;place-items:center;background:#EAF2F1;padding:12px;min-height:420px}
#meuSite .ms-frame iframe{border:0;background:#fff;width:100%;height:min(78vh,900px);border-radius:10px;box-shadow:0 20px 50px -30px rgba(0,0,0,.4);transition:width .4s var(--ms-ease)}
#meuSite .ms-frame.mobile iframe{width:390px;max-width:100%}
#meuSite .ms-aviso{border-radius:12px;padding:12px 14px;font-size:.9rem;margin-bottom:14px;display:none}
#meuSite .ms-aviso.on{display:block}
#meuSite .ms-aviso.ok{background:#E6F7F1;color:#0B5C52}#meuSite .ms-aviso.erro{background:#FDECEC;color:#8A1C1C}#meuSite .ms-aviso.info{background:var(--sky-soft,#EAF2FF);color:var(--sky-texto,#1B5FC2)}
#meuSite .ms-vazio{border:1px dashed var(--ms-b);border-radius:14px;padding:18px;color:var(--ms-mut);font-size:.92rem;line-height:1.5}
@media (max-width:1100px){#meuSite .ms-grid{grid-template-columns:1fr}#meuSite .ms-previa{position:static}}
`;
  document.head.appendChild(st);
}

/* ------------------------------------------------------------------ aviso */
function aviso(msg, tipo = 'info') {
  const a = estado?.root.querySelector('.ms-aviso');
  if (!a) return;
  a.className = `ms-aviso on ${tipo}`; a.textContent = msg;
  clearTimeout(aviso.t);
  if (tipo !== 'erro') aviso.t = setTimeout(() => a.classList.remove('on'), 4500);
}

/* ------------------------------------------------------------------ fotos */
async function enviarFotoDoSite(arq, { png } = {}) {
  if (!arq || !/^image\//.test(arq.type)) throw new Error('Escolha um arquivo de imagem.');
  if (arq.size > 25 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 25 MB).');
  const img = await prepararImagem(arq, png ? 'sitePng' : 'site');
  if (img.bytes > 2 * 1024 * 1024) throw new Error('Mesmo comprimida a imagem passou de 2 MB — use uma foto menor.');
  const uid = meuUid();
  if (!uid) throw new Error('Sessão expirada — entre de novo para enviar as fotos.');
  const nome = `site/${uid}/${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}.${img.ext}`;
  const r = storageRef(storage, nome);
  await uploadBytes(r, img.blob(), { contentType: img.tipo, cacheControl: 'public,max-age=31536000' });
  return getDownloadURL(r);
}

/* ------------------------------------------------------------------ prévia */
let previaTimer = null;
function agendarPrevia() {
  clearTimeout(previaTimer);
  previaTimer = setTimeout(enviarPrevia, 350);
}
function enviarPrevia() {
  const fr = estado?.root.querySelector('iframe');
  if (!fr || !fr.contentWindow || !estado.previaPronta) return;
  const conteudo = { template: estado.template, secoes: limparSecoes(estado.secoes, estado.schema) };
  try { fr.contentWindow.postMessage({ tipo: 'ap-previa', conteudo }, location.origin); } catch (e) { /* ok */ }
}
function ouvirPrevia() {
  if (ouvirPrevia.ligado) return; ouvirPrevia.ligado = true;
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || e.data.tipo !== 'ap-previa-pronta' || !estado) return;
    estado.previaPronta = true;
    enviarPrevia();
  });
}

/* ------------------------------------------------------------------ campos */
function marcarSujo() {
  estado.sujo = true;
  const b = estado.root.querySelector('[data-ms=publicar]'); if (b) b.disabled = false;
  agendarPrevia();
}
function valor(sid, c) { return estado.secoes?.[sid]?.[c]; }
function definir(sid, c, v) {
  estado.secoes[sid] = estado.secoes[sid] || {};
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete estado.secoes[sid][c]; else estado.secoes[sid][c] = v;
  marcarSujo();
}

function campoSelect(def, get, set) {
  const sel = el('select');
  sel.append(el('option', { value: '', text: def.ph || 'Escolha…' }));
  (def.opcoes || []).forEach((o) => { const [v, r] = Array.isArray(o) ? o : [o, o]; sel.append(el('option', { value: v, text: r })); });
  sel.value = (def.opcoes || []).some((o) => (Array.isArray(o) ? o[0] : o) === get()) ? get() : '';
  sel.addEventListener('change', () => set(sel.value));
  return el('label', { class: 'ms-campo' }, el('span', {}, def.r), sel);
}

function campoTexto(def, get, set) {
  const area = def.t === 'area';
  const input = el(area ? 'textarea' : 'input', { maxlength: def.max || MAX_TEXTO, placeholder: def.ph || '' });
  if (!area) input.type = 'text';
  if (area && def.linhas) input.rows = def.linhas;
  input.value = get() || '';
  const cont = el('span', { class: 'ms-cont' });
  const atualizaCont = () => { cont.textContent = `${input.value.length}/${def.max || MAX_TEXTO}`; };
  atualizaCont();
  input.addEventListener('input', () => { set(input.value); atualizaCont(); });
  return el('label', { class: 'ms-campo' }, el('span', {}, def.r, cont), input);
}

function campoFoto(def, get, set) {
  const th = el('div', { class: 'th' });
  const pintar = () => { th.replaceChildren(get() ? el('img', { src: get(), alt: '' }) : el('i', { class: 'fas fa-image' })); };
  pintar();
  const file = el('input', { type: 'file', accept: def.png ? 'image/png,image/webp' : 'image/*' });
  const btn = el('button', { type: 'button', class: 'ms-btn peq', onclick: () => file.click() }, el('i', { class: 'fas fa-upload' }), get() ? 'Trocar' : 'Enviar foto');
  const rem = el('button', { type: 'button', class: 'ms-btn peq', onclick: () => { set(''); pintar(); btn.lastChild.textContent = 'Enviar foto'; } }, 'Remover');
  file.addEventListener('change', async () => {
    const arq = file.files && file.files[0]; file.value = '';
    if (!arq) return;
    btn.disabled = true; btn.lastChild.textContent = 'Enviando…';
    try { set(await enviarFotoDoSite(arq, { png: def.png })); pintar(); btn.lastChild.textContent = 'Trocar'; aviso('Foto enviada. Publique para ela aparecer no site.', 'ok'); }
    catch (e) { aviso(e.message || 'Não foi possível enviar a foto.', 'erro'); btn.lastChild.textContent = get() ? 'Trocar' : 'Enviar foto'; }
    finally { btn.disabled = false; }
  });
  return el('div', { class: 'ms-campo' }, el('span', { text: def.r + (def.png ? ' · PNG/WebP sem fundo' : '') }),
    el('div', { class: 'ms-foto' }, th, el('div', { class: 'ac' }, btn, rem, file)));
}

function campoLista(def, sid) {
  const wrap = el('div', { class: 'ms-lista' });
  const max = Math.min(MAX_ITENS, def.max || MAX_ITENS);
  const itens = () => (Array.isArray(valor(sid, def.c)) ? valor(sid, def.c) : []);
  const salvar = (arr) => definir(sid, def.c, arr);
  const pintar = () => {
    const arr = itens();
    wrap.replaceChildren(
      ...arr.map((item, i) => {
        const titulo = item[def.resumo || 'titulo'] || `${def.nomeItem || 'Item'} ${i + 1}`;
        const cab = el('div', { class: 'cab' }, el('b', { text: titulo }), el('span', {},
          el('button', { type: 'button', title: 'Subir', 'aria-label': 'Subir', disabled: i === 0, onclick: () => { const a = itens().slice(); [a[i - 1], a[i]] = [a[i], a[i - 1]]; salvar(a); pintar(); } }, el('i', { class: 'fas fa-arrow-up' })),
          el('button', { type: 'button', title: 'Descer', 'aria-label': 'Descer', disabled: i === arr.length - 1, onclick: () => { const a = itens().slice(); [a[i + 1], a[i]] = [a[i], a[i + 1]]; salvar(a); pintar(); } }, el('i', { class: 'fas fa-arrow-down' })),
          el('button', { type: 'button', title: 'Remover', 'aria-label': 'Remover', onclick: () => { const a = itens().slice(); a.splice(i, 1); salvar(a); pintar(); } }, el('i', { class: 'fas fa-trash' }))));
        const campos = (def.item || []).map((d) => campo(d, () => itens()[i]?.[d.c], (v) => { const a = itens().slice(); a[i] = { ...a[i], [d.c]: v }; if (!v) delete a[i][d.c]; salvar(a); if (d.c === (def.resumo || 'titulo')) cab.firstChild.textContent = v || `${def.nomeItem || 'Item'} ${i + 1}`; }));
        return el('div', { class: 'ms-item' }, cab, ...campos);
      }),
      arr.length < max ? el('button', { type: 'button', class: 'ms-btn peq', onclick: () => { salvar(itens().concat([{}])); pintar(); } }, el('i', { class: 'fas fa-plus' }), `Adicionar ${(def.nomeItem || 'item').toLowerCase()}`) : el('p', { class: 'ms-ajuda', text: `Máximo de ${max} ${(def.nomeItem || 'itens').toLowerCase()}s neste template.` })
    );
  };
  pintar();
  return el('div', { class: 'ms-campo' }, el('span', { text: `${def.r} (até ${max})` }), wrap);
}

function campo(def, get, set) {
  if (def.t === 'foto') return campoFoto(def, get, set);
  if (def.t === 'select') return campoSelect(def, get, set);
  return campoTexto(def, get, set);
}

function secaoHTML(sec, aberta) {
  const corpo = el('div', { class: 'ms-corpo' });
  if (sec.ajuda) corpo.append(el('p', { class: 'ms-ajuda', text: sec.ajuda }));
  sec.campos.forEach((def) => {
    if (def.t === 'lista') corpo.append(campoLista(def, sec.id));
    else corpo.append(campo(def, () => valor(sec.id, def.c), (v) => definir(sec.id, def.c, limparTexto(v, def.max || MAX_TEXTO))));
  });
  return el('details', { class: 'ms-sec', open: aberta }, el('summary', {}, el('span', { text: sec.r }), el('i', { class: 'fas fa-chevron-down' })), corpo);
}

/* ------------------------------------------------------------------ editor */
async function trocarTemplate(id) {
  if (!templateExiste(id)) return;
  estado.template = id;
  const mod = await carregarTemplate(id);
  estado.schema = mod && mod.schema && Array.isArray(mod.schema.secoes) ? mod.schema : null;
  pintarEditor();
  marcarSujo();
}

function pintarTemplates() {
  const box = estado.root.querySelector('.ms-tpls');
  box.replaceChildren(...Object.entries(TEMPLATES).map(([id, t]) => {
    const on = id === estado.template;
    const mini = el('div', { class: 'mini' });
    if (t.miniatura) { const img = el('img', { src: t.miniatura, alt: '' }); img.onerror = () => mini.replaceChildren(el('span', { text: t.nome })); mini.append(img); } else mini.append(el('span', { text: t.nome }));
    return el('button', { type: 'button', class: `ms-tpl${on ? ' on' : ''}`, 'aria-pressed': on ? 'true' : 'false', onclick: () => trocarTemplate(id) },
      on ? el('span', { class: 'sel', text: 'Em uso' }) : null, mini, el('b', { text: t.nome }), el('small', { text: t.descricao }));
  }));
}

function pintarEditor() {
  pintarTemplates();
  const box = estado.root.querySelector('.ms-secoes');
  if (!estado.schema) {
    box.replaceChildren(el('div', { class: 'ms-vazio' },
      `O template "${TEMPLATES[estado.template]?.nome || estado.template}" ainda não tem campos editáveis: ele monta o site só com os dados do cadastro da escola (nome, cores, logo, fotos, líder, graduação, núcleos, endereço). Publique para usá-lo, ou escolha um template com edição.`));
    return;
  }
  box.replaceChildren(...estado.schema.secoes.map((sec, i) => secaoHTML(sec, i === 0)));
}

/* ------------------------------------------------------------------ publicar */
async function publicar() {
  const b = estado.root.querySelector('[data-ms=publicar]');
  b.disabled = true; b.lastChild.textContent = 'Publicando…';
  try {
    const uid = meuUid();
    if (!uid) throw new Error('Sessão expirada — entre de novo.');
    const atual = estado.doc || null;
    const novo = {
      template: estado.template,
      secoes: limparSecoes(estado.secoes, estado.schema),
      anterior: atual ? { template: atual.template || '', secoes: atual.secoes || {} } : {},
      atualizadoEm: new Date().toISOString(),
      atualizadoPor: uid,
      versao: (Number(atual?.versao) || 0) + 1,
    };
    await setDoc(doc(db, 'siteConteudo', estado.escolaId), novo);
    estado.doc = novo; estado.sujo = false;
    estado.root.querySelector('[data-ms=desfazer]').disabled = !Object.keys(novo.anterior || {}).length;
    aviso('Site publicado. Quem abrir o endereço da escola já vê a nova versão.', 'ok');
  } catch (e) {
    console.error(e);
    aviso(/permission|insufficient/i.test(String(e && e.code || e)) ? 'Sem permissão para publicar: só o Admin Master desta escola pode.' : (e.message || 'Não foi possível publicar.'), 'erro');
    b.disabled = false;
  } finally { b.lastChild.textContent = 'Publicar'; }
}

async function desfazer() {
  const ant = estado.doc?.anterior;
  if (!ant || !Object.keys(ant).length) return;
  if (!confirm('Voltar o site para a versão publicada antes desta? A versão atual passa a ser a "anterior".')) return;
  estado.template = templateExiste(ant.template) ? ant.template : estado.template;
  estado.secoes = JSON.parse(JSON.stringify(ant.secoes || {}));
  const mod = await carregarTemplate(estado.template);
  estado.schema = mod && mod.schema ? mod.schema : null;
  pintarEditor();
  marcarSujo();
  await publicar();
}

/* ------------------------------------------------------------------ montagem */
export async function montarMeuSite(root) {
  estilos(); ouvirPrevia();
  if (estado && estado.root === root && estado.escolaId) { agendarPrevia(); return; }
  root.replaceChildren(el('p', { class: 'ms-ajuda', text: 'Carregando o seu site…' }));

  const escolaId = await minhaEscolaId();
  if (!escolaId) { root.replaceChildren(el('div', { class: 'ms-vazio', text: 'Sua conta ainda está sendo preparada (sem escola no login). Tente de novo em alguns segundos.' })); return; }
  let pub = null, docAtual = null;
  try { const s = await getDoc(doc(db, 'escolasPublicas', escolaId)); pub = s.exists() ? s.data() : null; } catch (e) { pub = null; }
  try { const s = await getDoc(doc(db, 'siteConteudo', escolaId)); docAtual = s.exists() ? s.data() : null; } catch (e) { docAtual = null; }
  if (!pub) { root.replaceChildren(el('div', { class: 'ms-vazio', text: 'Esta escola ainda não está ativa na AtletaPay, então o site público ainda não existe. Assim que a ativação for concluída, o site aparece aqui.' })); return; }

  const slug = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(String(pub.slug || '')) ? pub.slug : escolaId;
  const template = templateExiste(docAtual?.template) ? docAtual.template : (templateExiste(pub.template) ? pub.template : TEMPLATE_PADRAO);
  const mod = await carregarTemplate(template);
  estado = {
    root, escolaId, slug, pub, doc: docAtual, template,
    secoes: JSON.parse(JSON.stringify(docAtual?.secoes || {})),
    schema: mod && mod.schema && Array.isArray(mod.schema.secoes) ? mod.schema : null,
    previaPronta: false, sujo: false,
  };

  const urlSite = `${location.origin}/${encodeURIComponent(slug)}`;
  const urlPrevia = `${PREVIA_PAGINA}?escola=${encodeURIComponent(slug)}&previa=1&t=${Date.now()}`;
  const frame = el('div', { class: 'ms-frame' }, el('iframe', { src: urlPrevia, title: 'Prévia do site', loading: 'lazy' }));
  const seg = el('span', { class: 'seg' },
    el('button', { type: 'button', class: 'on', onclick: (e) => { frame.classList.remove('mobile'); seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, el('i', { class: 'fas fa-desktop' })),
    el('button', { type: 'button', onclick: (e) => { frame.classList.add('mobile'); seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, el('i', { class: 'fas fa-mobile-screen' })));

  root.replaceChildren(
    el('div', { class: 'ms-top' },
      el('div', {}, el('h2', { text: 'Meu site' }), el('p', { text: `O site público da ${pub.nomeCurto || pub.nome || 'escola'}: escolha o visual, troque textos e fotos e publique. Endereço: ${urlSite}` })),
      el('div', { class: 'ms-acoes' },
        el('a', { class: 'ms-btn', href: urlSite, target: '_blank', rel: 'noopener' }, el('i', { class: 'fas fa-arrow-up-right-from-square' }), 'Abrir o site'),
        el('button', { type: 'button', class: 'ms-btn', 'data-ms': 'desfazer', disabled: !Object.keys(docAtual?.anterior || {}).length, onclick: desfazer }, el('i', { class: 'fas fa-rotate-left' }), 'Voltar à versão anterior'),
        el('button', { type: 'button', class: 'ms-btn pri', 'data-ms': 'publicar', disabled: true, onclick: publicar }, el('i', { class: 'fas fa-paper-plane' }), 'Publicar'))),
    el('div', { class: 'ms-aviso' }),
    el('div', { class: 'ms-grid' },
      el('div', {},
        el('h3', { text: 'Visual do site', style: 'margin:0 0 4px;font-size:1rem' }),
        el('p', { class: 'ms-ajuda', text: 'Trocar o template muda só o visual: o que você escreveu aqui continua guardado.' }),
        el('div', { class: 'ms-tpls' }),
        el('h3', { text: 'Textos e fotos', style: 'margin:16px 0 8px;font-size:1rem' }),
        el('div', { class: 'ms-secoes' })),
      el('div', { class: 'ms-previa' },
        el('div', { class: 'bar' }, el('span', { text: 'Prévia ao vivo — o que você muda aparece aqui antes de publicar' }), seg), frame)));

  pintarEditor();
  if (!docAtual) aviso('Seu site já está no ar com os dados do cadastro. Tudo aqui é opcional: o que ficar em branco usa o padrão.', 'info');
  addEventListener('beforeunload', (e) => { if (estado?.sujo) { e.preventDefault(); e.returnValue = ''; } });
}
