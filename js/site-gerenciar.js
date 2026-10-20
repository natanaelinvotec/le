/* site-gerenciar.js — aba "Meu site" do painel (admin.html), F4.2.
 *
 * O Admin Master da escola edita textos e fotos do site público SEM programar nada: o
 * formulário é montado a partir do `schema` que cada template exporta (js/site-tpl-<nome>.js,
 * registro em js/site-templates.js). Template novo na biblioteca = gerenciador novo de graça.
 *
 * Layout (v56, igual ao antigo "Gerenciar o site"): seções à esquerda, formulário da seção
 * ativa no meio, prévia ao vivo à direita. O VISUAL (template) NÃO se troca aqui — fica fixo no
 * que a escola escolheu no cadastro / painel AtletaPay e aparece só como etiqueta "Visual: X".
 * No celular a lista de seções vira um seletor e a prévia abre pelo botão "Ver prévia".
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
 * Gerar textos com IA (Projeto Agentes, etapa 1): o Admin responde 4 perguntas; o painel grava um
 * pedido em pedidosIA/{id} (regras: só o Admin da própria escola) e espera o servidor responder no
 * mesmo documento (functions/src/ia-site.js chama a API com a chave do Secret Manager). O que volta
 * é RASCUNHO: entra no formulário (por padrão só nos campos vazios), aparece na prévia e só vai ao
 * ar quando o Admin clica em Publicar. Nenhum dado de aluno sai do app — só as respostas e o que
 * já é público no cartão da escola.
 *
 * Segurança: nada do que o Admin digita vira HTML aqui (textContent / value); no site, cada
 * texto passa por esc() e cada URL por url() dentro do template. Antes de gravar, o rascunho
 * é "limpo" (só strings e listas de objetos de strings, com limites de tamanho).
 */
import { db, doc, getDoc, setDoc, addDoc, collection, onSnapshot, storage, storageRef, uploadBytes, getDownloadURL, minhaEscolaId, meuUid } from './firebase.js';
import { prepararImagem } from './imagem.js';
import { TEMPLATES, TEMPLATE_PADRAO, templateExiste, carregarTemplate } from './site-templates.js?v=56';

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
#meuSite .ms-visual{display:inline-flex;align-items:center;gap:8px;font-size:.8rem;color:var(--ms-mut);border:1px solid var(--ms-b);border-radius:999px;padding:7px 12px;background:var(--ms-bg)}
#meuSite .ms-visual i{width:14px;height:14px;border-radius:4px;background:linear-gradient(135deg,#002D72,#389E92);flex:none}
#meuSite .ms-grid{display:grid;grid-template-columns:210px minmax(0,1fr) minmax(340px,38%);gap:0;align-items:stretch;border:1px solid var(--ms-b);border-radius:16px;background:var(--ms-bg);overflow:hidden;min-height:560px}
#meuSite .ms-nav{display:grid;gap:4px;align-content:start;padding:14px 10px;border-right:1px solid var(--ms-b);background:color-mix(in srgb,var(--ms-bg) 80%,#EAF2F1)}
#meuSite .ms-nav button{display:flex;align-items:center;justify-content:space-between;gap:8px;text-align:left;border:0;background:transparent;color:inherit;font:inherit;font-size:.88rem;padding:9px 12px;border-radius:12px;cursor:pointer;transition:background .3s,color .3s,transform .35s var(--ms-ease)}
#meuSite .ms-nav button:hover{background:color-mix(in srgb,var(--ms-ac) 10%,transparent)}
#meuSite .ms-nav button.on{background:var(--primary-blue,#002D72);color:#fff;font-weight:600}
#meuSite .ms-nav button .pt{width:7px;height:7px;border-radius:50%;background:var(--accent-green,#00E676);flex:none;opacity:0}
#meuSite .ms-nav button.novo .pt{opacity:1}
#meuSite .ms-navsel{display:none;padding:12px 16px 0}
#meuSite .ms-navsel select{width:100%;font:inherit;font-size:.95rem;color:inherit;border:1px solid var(--ms-b);border-radius:10px;padding:9px 12px;background:var(--ms-bg)}
#meuSite .ms-form{padding:20px 22px 24px;display:grid;gap:12px;align-content:start;min-width:0}
#meuSite .ms-form h3{margin:0;font-size:1.25rem;font-weight:500;letter-spacing:-.01em}
#meuSite .ms-form .ms-passos{display:flex;justify-content:space-between;gap:8px;margin-top:8px;padding-top:12px;border-top:1px solid var(--ms-b)}
#meuSite .ms-verprevia{display:none}
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
#meuSite .ms-previa{border-left:1px solid var(--ms-b);background:var(--ms-bg);display:grid;grid-template-rows:auto 1fr;min-width:0}
#meuSite .ms-previa .bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--ms-b);font-size:.84rem;color:var(--ms-mut)}
#meuSite .ms-previa .bar .seg{display:inline-flex;border:1px solid var(--ms-b);border-radius:999px;overflow:hidden}
#meuSite .ms-previa .bar .seg button{border:0;background:transparent;padding:5px 10px;cursor:pointer;color:inherit;font:inherit;font-size:.8rem}
#meuSite .ms-previa .bar .seg button.on{background:var(--ms-ac);color:#fff}
#meuSite .ms-frame{display:grid;place-items:start center;background:#EAF2F1;padding:12px;min-height:420px}
#meuSite .ms-frame>div{position:sticky;top:12px;width:100%;display:grid;justify-items:center}
#meuSite .ms-frame iframe{border:0;background:#fff;width:100%;height:min(78vh,900px);border-radius:10px;box-shadow:0 20px 50px -30px rgba(0,0,0,.4);transition:width .4s var(--ms-ease)}
#meuSite .ms-frame.mobile iframe{width:390px;max-width:100%}
#meuSite .ms-aviso{border-radius:12px;padding:12px 14px;font-size:.9rem;margin-bottom:14px;display:none}
#meuSite .ms-aviso.on{display:block}
#meuSite .ms-aviso.ok{background:#E6F7F1;color:#0B5C52}#meuSite .ms-aviso.erro{background:#FDECEC;color:#8A1C1C}#meuSite .ms-aviso.info{background:var(--sky-soft,#EAF2FF);color:var(--sky-texto,#1B5FC2)}
#meuSite .ms-vazio{border:1px dashed var(--ms-b);border-radius:14px;padding:18px;color:var(--ms-mut);font-size:.92rem;line-height:1.5}
#meuSite .ms-btn.ia{border-color:color-mix(in srgb,var(--ms-ac) 35%,var(--ms-b));background:linear-gradient(135deg,color-mix(in srgb,var(--ms-ac) 10%,#fff),#fff)}
#meuSite .ms-btn.ia i{color:var(--ms-ac)}
dialog.ms-ia{margin:auto;border:0;border-radius:20px;padding:0;width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);box-shadow:0 30px 80px -30px rgba(0,45,114,.45);color:inherit;background:var(--card-bg,#fff)}
dialog.ms-ia::backdrop{background:rgba(0,26,77,.45);backdrop-filter:blur(3px)}
dialog.ms-ia form{display:grid;gap:14px;padding:22px 22px 18px}
dialog.ms-ia h3{margin:0;font-size:1.15rem;font-weight:500;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
dialog.ms-ia h3 i{color:var(--primary-teal,#0B5C52)}
dialog.ms-ia p{margin:0;font-size:.88rem;line-height:1.5;color:var(--text-muted,#5B6B68)}
dialog.ms-ia .ms-campo textarea{min-height:64px}
dialog.ms-ia .ms-ia-opc{display:flex;align-items:center;gap:8px;font-size:.86rem;color:var(--text-muted,#5B6B68)}
dialog.ms-ia .ms-ia-opc input{width:16px;height:16px;accent-color:var(--primary-teal,#0B5C52)}
dialog.ms-ia .ms-ia-pe{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border-color,#E8EEF4);padding-top:14px}
dialog.ms-ia .ms-ia-pe small{font-size:.76rem;color:var(--text-muted,#5B6B68);line-height:1.4;flex:1 1 100%}
dialog.ms-ia .ms-ia-pe .ms-btn{flex:1 1 auto;justify-content:center}
dialog.ms-ia .ms-ia-st{display:none;align-items:center;gap:10px;font-size:.9rem;padding:12px 14px;border-radius:12px;background:var(--sky-soft,#EAF2FF);color:var(--sky-texto,#1B5FC2)}
dialog.ms-ia .ms-ia-st.on{display:flex}
dialog.ms-ia .ms-ia-st.erro{background:#FDECEC;color:#8A1C1C}
dialog.ms-ia .ms-ia-st i.fa-spin{color:inherit}
@media (max-width:1100px){#meuSite .ms-grid{grid-template-columns:200px minmax(0,1fr)}#meuSite .ms-previa{grid-column:1/-1;border-left:0;border-top:1px solid var(--ms-b)}}
@media (max-width:760px){#meuSite .ms-grid{grid-template-columns:1fr;min-height:0}#meuSite .ms-nav{display:none}#meuSite .ms-navsel{display:block}#meuSite .ms-form{padding:16px}#meuSite .ms-previa{display:none}#meuSite.ms-com-previa .ms-previa{display:grid}#meuSite.ms-com-previa .ms-form,#meuSite.ms-com-previa .ms-navsel{display:none}#meuSite .ms-verprevia{display:inline-flex}#meuSite .ms-frame iframe{height:70vh}}
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

// Formulário de UMA seção (a ativa). Antes eram <details> empilhados; agora a navegação é por seção.
function secaoHTML(sec) {
  const form = el('div', { class: 'ms-form', 'data-secao': sec.id });
  form.append(el('div', {}, el('h3', { text: sec.r }), sec.ajuda ? el('p', { class: 'ms-ajuda', style: 'margin-top:4px', text: sec.ajuda }) : null));
  sec.campos.forEach((def) => {
    if (def.t === 'lista') form.append(campoLista(def, sec.id));
    else form.append(campo(def, () => valor(sec.id, def.c), (v) => definir(sec.id, def.c, limparTexto(v, def.max || MAX_TEXTO))));
  });
  const lista = estado.schema.secoes; const i = lista.findIndex((x) => x.id === sec.id);
  form.append(el('div', { class: 'ms-passos' },
    i > 0 ? el('button', { type: 'button', class: 'ms-btn peq', onclick: () => irParaSecao(lista[i - 1].id) }, el('i', { class: 'fas fa-arrow-left' }), lista[i - 1].r) : el('span'),
    i < lista.length - 1 ? el('button', { type: 'button', class: 'ms-btn peq', onclick: () => irParaSecao(lista[i + 1].id) }, lista[i + 1].r, el('i', { class: 'fas fa-arrow-right' })) : el('span')));
  return form;
}

/* ------------------------------------------------------------------ editor */
function irParaSecao(id) {
  if (!estado.schema || !estado.schema.secoes.some((x) => x.id === id)) return;
  estado.secaoAtiva = id;
  estado.novas?.delete(id);
  pintarEditor();
  try { estado.root.querySelector('.ms-form')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ok */ }
}

function pintarEditor() {
  const nav = estado.root.querySelector('.ms-nav');
  const sel = estado.root.querySelector('.ms-navsel select');
  const box = estado.root.querySelector('.ms-formbox');
  if (!nav || !box) return;
  if (!estado.schema) {
    nav.replaceChildren(); if (sel) sel.replaceChildren();
    box.replaceChildren(el('div', { class: 'ms-form' }, el('div', { class: 'ms-vazio' },
      `O visual "${TEMPLATES[estado.template]?.nome || estado.template}" ainda não tem textos editáveis: ele monta o site só com os dados do cadastro da escola (nome, cores, logo, fotos, líder, graduação, núcleos, endereço). Publique para colocá-lo no ar.`)));
    return;
  }
  const lista = estado.schema.secoes;
  if (!lista.some((x) => x.id === estado.secaoAtiva)) estado.secaoAtiva = lista[0].id;
  nav.replaceChildren(...lista.map((sec) => el('button', { type: 'button', class: `${sec.id === estado.secaoAtiva ? 'on' : ''}${estado.novas?.has(sec.id) ? ' novo' : ''}`, 'aria-current': sec.id === estado.secaoAtiva ? 'true' : null, title: estado.novas?.has(sec.id) ? 'Tem rascunho novo da IA' : null, onclick: () => irParaSecao(sec.id) }, el('span', { text: sec.r }), el('span', { class: 'pt' }))));
  if (sel) {
    sel.replaceChildren(...lista.map((sec) => el('option', { value: sec.id, text: `${sec.r}${estado.novas?.has(sec.id) ? ' •' : ''}` })));
    sel.value = estado.secaoAtiva;
  }
  box.replaceChildren(secaoHTML(lista.find((x) => x.id === estado.secaoAtiva)));
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
  // O visual não se troca nesta aba: volta só os textos/fotos; o template fica o da escola.
  estado.secoes = JSON.parse(JSON.stringify(ant.secoes || {}));
  pintarEditor();
  marcarSujo();
  await publicar();
}

/* ------------------------------------------------------------------ IA (Projeto Agentes) */
const IA_PERGUNTAS = [
  { c: 'historia', r: 'Conte a história da escola em poucas linhas', ph: 'Quando começou, quem fundou, de onde vem a linhagem, o que mudou até hoje…', max: 600, t: 'area', linhas: 3 },
  { c: 'diferencial', r: 'O que faz a sua escola diferente?', ph: 'Como são as aulas, o que o aluno sente nos primeiros meses, o que o Mestre mais valoriza…', max: 600, t: 'area', linhas: 3 },
  { c: 'publico', r: 'Para quem são as aulas?', ph: 'Crianças a partir de que idade, adultos iniciantes, quem já treina, famílias…', max: 600, t: 'area', linhas: 2 },
  { c: 'observacoes', r: 'Algo que NÃO pode faltar (ou não pode aparecer)', ph: 'Ex.: não falar de competição; destacar a roda de sábado…', max: 600, t: 'area', linhas: 2 },
];
const IA_TONS = [['acolhedor', 'Acolhedor e próximo'], ['tradicional', 'Tradicional e respeitoso'], ['energico', 'Energético e motivador'], ['profissional', 'Profissional e direto']];
const IA_TEMPO_MAX = 110000; // o servidor tem 120 s
let iaDialog = null; let iaParar = null;

function vazio(v) { return v == null || v === '' || (Array.isArray(v) && !v.length); }

// Rascunho → formulário. Só substitui o que já está escrito se o Admin desmarcar "só os vazios".
function aplicarRascunho(secoes, soVazios) {
  let n = 0; const tocadas = new Set();
  const schemaIds = new Map((estado.schema?.secoes || []).map((sec) => [sec.id, new Set(sec.campos.map((c) => c.c))]));
  for (const [sid, sec] of Object.entries(secoes || {})) {
    const permitidos = schemaIds.get(sid); if (!permitidos || !sec || typeof sec !== 'object') continue;
    for (const [c, v] of Object.entries(sec)) {
      if (!permitidos.has(c)) continue;
      if (soVazios && !vazio(valor(sid, c))) continue;
      estado.secoes[sid] = estado.secoes[sid] || {};
      estado.secoes[sid][c] = Array.isArray(v) ? v.map((x) => ({ ...x })) : String(v);
      n++; tocadas.add(sid);
    }
  }
  if (n) {
    estado.novas = tocadas; // bolinha verde na lista de seções: "tem rascunho novo aqui"
    const primeira = (estado.schema.secoes.find((sec) => tocadas.has(sec.id)) || {}).id;
    if (primeira && !tocadas.has(estado.secaoAtiva)) estado.secaoAtiva = primeira;
    tocadas.delete(estado.secaoAtiva);
    pintarEditor();
    marcarSujo();
  }
  return n;
}

function statusIA(msg, tipo = 'info', girando = false) {
  const st = iaDialog?.querySelector('.ms-ia-st'); if (!st) return;
  st.className = `ms-ia-st on ${tipo}`;
  st.replaceChildren(el('i', { class: girando ? 'fas fa-circle-notch fa-spin' : (tipo === 'erro' ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check') }), el('span', { text: msg }));
  try { st.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* ok */ }
}

async function gerarIA(form) {
  const uid = meuUid();
  if (!uid) { statusIA('Sessão expirada — entre de novo.', 'erro'); return; }
  if (!estado.schema) { statusIA('O visual desta escola ainda não tem textos editáveis.', 'erro'); return; }
  const respostas = {};
  IA_PERGUNTAS.forEach((q) => { const v = limparTexto(form.elements[q.c]?.value || '', q.max); if (v) respostas[q.c] = v; });
  const tom = String(form.elements.tom?.value || ''); if (IA_TONS.some(([v]) => v === tom)) respostas.tom = tom;
  const soVazios = !!form.elements.soVazios?.checked;
  if (!respostas.historia && !respostas.diferencial) { statusIA('Conte ao menos a história ou o diferencial da escola: é daí que saem os textos.', 'erro'); return; }

  const botoes = form.querySelectorAll('button'); botoes.forEach((b) => { b.disabled = true; });
  statusIA('Enviando o pedido…', 'info', true);
  let ref;
  try {
    ref = await addDoc(collection(db, 'pedidosIA'), { tipo: 'textosSite', escolaId: estado.escolaId, template: estado.template, respostas, porUid: uid, status: 'pendente', criadoEm: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    statusIA(/permission|insufficient/i.test(String(e && e.code || e)) ? 'Só o Admin Master desta escola pode gerar textos.' : 'Não foi possível enviar o pedido. Tente de novo.', 'erro');
    botoes.forEach((b) => { b.disabled = false; });
    return;
  }
  statusIA('Escrevendo o rascunho com base nas suas respostas… (até 1 minuto)', 'info', true);
  const encerrar = () => { if (iaParar) { iaParar(); iaParar = null; } botoes.forEach((b) => { b.disabled = false; }); };
  const tempo = setTimeout(() => { encerrar(); statusIA('Demorou mais que o esperado. Feche e tente de novo em um minuto.', 'erro'); }, IA_TEMPO_MAX);
  const parar = onSnapshot(ref, (snap) => {
    const d = snap.data(); if (!d) return;
    if (d.status === 'gerando') { statusIA('A IA está escrevendo…', 'info', true); return; }
    if (d.status === 'pendente') return;
    clearTimeout(tempo); encerrar();
    if (d.status === 'ok') {
      const n = aplicarRascunho(d.secoes, soVazios);
      const resto = Number.isFinite(d.restantesHoje) ? ` Você ainda pode gerar ${d.restantesHoje} ${d.restantesHoje === 1 ? 'vez' : 'vezes'} hoje.` : '';
      if (!n) { statusIA(`O rascunho veio, mas todos os campos já estavam preenchidos. Desmarque "só os vazios" para substituir.${resto}`, 'erro'); return; }
      iaDialog.close();
      aviso(`Rascunho aplicado em ${n} ${n === 1 ? 'campo' : 'campos'}. Revise na prévia e clique em Publicar — nada foi publicado ainda.${resto}`, 'ok');
    } else statusIA(d.erro || 'Não foi possível gerar os textos.', 'erro');
  }, (e) => { console.error(e); clearTimeout(tempo); encerrar(); statusIA('Perdi a conexão com o pedido. Tente de novo.', 'erro'); });
  iaParar = parar;
}

function abrirIA() {
  if (!estado) return;
  // Dentro da aba (#meuSite): os estilos dos campos são escopados nela. Se a aba foi remontada, refaz.
  if (!iaDialog || !estado.root.contains(iaDialog)) {
    const form = el('form', { method: 'dialog' });
    form.append(
      el('h3', {}, el('i', { class: 'fas fa-wand-magic-sparkles' }), 'Gerar textos com IA'),
      el('p', { text: 'Responda com as suas palavras. A IA escreve um rascunho para as seções do template a partir disso e do que já é público no cadastro da escola (nome, cidade, modalidade, graduações). Ela não inventa horários, preços, telefones, nomes nem números — esses campos ficam para você.' }),
      ...IA_PERGUNTAS.map((q) => { const l = campoTexto(q, () => '', () => {}); l.querySelector('textarea').name = q.c; return l; }),
      (() => { const l = campoSelect({ r: 'Tom dos textos', opcoes: IA_TONS, ph: 'Acolhedor e próximo (padrão)' }, () => '', () => {}); l.querySelector('select').name = 'tom'; return l; })(),
      el('label', { class: 'ms-ia-opc' }, el('input', { type: 'checkbox', name: 'soVazios', checked: true }), 'Preencher só os campos que estão vazios (o que você já escreveu fica)'),
      el('div', { class: 'ms-ia-st' }),
      el('div', { class: 'ms-ia-pe' },
        el('small', { text: 'Enviamos só estas respostas e os dados públicos da escola. Nenhum dado de aluno. O resultado é um rascunho: nada vai ao ar sem você publicar.' }),
        el('button', { type: 'button', class: 'ms-btn', onclick: () => iaDialog.close() }, 'Cancelar'),
        el('button', { type: 'button', class: 'ms-btn pri', onclick: () => gerarIA(form) }, el('i', { class: 'fas fa-wand-magic-sparkles' }), 'Gerar rascunho')));
    iaDialog = el('dialog', { class: 'ms-ia' }, form);
    iaDialog.addEventListener('close', () => { if (iaParar) { iaParar(); iaParar = null; } form.querySelectorAll('button').forEach((b) => { b.disabled = false; }); });
    estado.root.appendChild(iaDialog);
  }
  const st = iaDialog.querySelector('.ms-ia-st'); st.className = 'ms-ia-st'; st.replaceChildren();
  if (!estado.schema) statusIA('O visual desta escola ainda não tem textos editáveis.', 'erro');
  iaDialog.showModal();
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

  estado.secaoAtiva = estado.schema ? estado.schema.secoes[0].id : null;
  estado.novas = new Set();

  const dominio = (pub.dominio && /^[a-z0-9.-]+$/i.test(pub.dominio)) ? pub.dominio : '';
  const urlSite = dominio ? `https://${dominio}` : `${location.origin}/${encodeURIComponent(slug)}`;
  const urlPrevia = `${PREVIA_PAGINA}?escola=${encodeURIComponent(slug)}&previa=1&t=${Date.now()}`;
  const frame = el('div', { class: 'ms-frame' }, el('div', {}, el('iframe', { src: urlPrevia, title: 'Prévia do site', loading: 'lazy' })));
  const seg = el('span', { class: 'seg' },
    el('button', { type: 'button', class: 'on', onclick: (e) => { frame.classList.remove('mobile'); seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, el('i', { class: 'fas fa-desktop' }), ' Computador'),
    el('button', { type: 'button', onclick: (e) => { frame.classList.add('mobile'); seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.currentTarget.classList.add('on'); } }, el('i', { class: 'fas fa-mobile-screen' }), ' Celular'));
  const quando = docAtual?.atualizadoEm ? new Date(docAtual.atualizadoEm) : null;
  const publicadoEm = quando && !Number.isNaN(quando.getTime()) ? ` · publicado em ${quando.toLocaleDateString('pt-BR')} às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ' · ainda com os dados do cadastro';
  const nomeVisual = TEMPLATES[template]?.nome || template;
  const selNav = el('select', { 'aria-label': 'Seção do site', onchange: (e) => irParaSecao(e.target.value) });
  const btnVerPrevia = el('button', { type: 'button', class: 'ms-btn peq ms-verprevia', onclick: () => { root.classList.toggle('ms-com-previa'); btnVerPrevia.lastChild.textContent = root.classList.contains('ms-com-previa') ? 'Voltar a editar' : 'Ver prévia'; if (root.classList.contains('ms-com-previa')) enviarPrevia(); } }, el('i', { class: 'fas fa-eye' }), 'Ver prévia');

  root.replaceChildren(
    el('div', { class: 'ms-top' },
      el('div', {}, el('h2', { text: 'Meu site' }), el('p', { text: `${dominio || `${location.host}/${slug}`}${publicadoEm}` })),
      el('div', { class: 'ms-acoes' },
        el('span', { class: 'ms-visual', title: 'O visual é definido no cadastro da escola; aqui você edita só o conteúdo' }, el('i'), `Visual: ${nomeVisual}`),
        el('a', { class: 'ms-btn', href: urlSite, target: '_blank', rel: 'noopener' }, el('i', { class: 'fas fa-arrow-up-right-from-square' }), 'Abrir o site'),
        el('button', { type: 'button', class: 'ms-btn ia', 'data-ms': 'ia', title: 'Rascunho de textos a partir das suas respostas — nada é publicado sem você revisar', onclick: abrirIA }, el('i', { class: 'fas fa-wand-magic-sparkles' }), 'Gerar textos com IA'),
        el('button', { type: 'button', class: 'ms-btn', 'data-ms': 'desfazer', disabled: !Object.keys(docAtual?.anterior || {}).length, onclick: desfazer }, el('i', { class: 'fas fa-rotate-left' }), 'Voltar à versão anterior'),
        btnVerPrevia,
        el('button', { type: 'button', class: 'ms-btn pri', 'data-ms': 'publicar', disabled: true, onclick: publicar }, el('i', { class: 'fas fa-paper-plane' }), 'Publicar'))),
    el('div', { class: 'ms-aviso' }),
    el('div', { class: 'ms-grid' },
      el('nav', { class: 'ms-nav', 'aria-label': 'Seções do site' }),
      el('div', { style: 'min-width:0' }, el('div', { class: 'ms-navsel' }, selNav), el('div', { class: 'ms-formbox' })),
      el('div', { class: 'ms-previa' },
        el('div', { class: 'bar' }, el('span', { text: 'Prévia ao vivo' }), seg), frame)));

  pintarEditor();
  if (!docAtual) aviso('Seu site já está no ar com os dados do cadastro. Tudo aqui é opcional: o que ficar em branco usa o padrão.', 'info');
  addEventListener('beforeunload', (e) => { if (estado?.sujo) { e.preventDefault(); e.returnValue = ''; } });
}
