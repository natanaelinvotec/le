/* gerenciar.js — painel "Gerenciar o site" (gerenciar.html).

Edita TODO o conteúdo do site público (index.html): topo e slider, números,
faixa, a arte, graduação, núcleos, mestres, agenda, app, loja, chamada final e
rodapé — com prévia ao vivo ao lado e upload de fotos.

Onde fica: Firestore siteConteudo/site (leitura pública; gravação só do Admin
Master, garantida pelas regras do servidor — esta tela é só a primeira
camada). Fotos: Storage site/ (leitura pública; gravação só do Admin).
Antes de cada publicação a versão no ar é copiada para siteConteudo/site-anterior
(botão "Voltar à versão anterior"). */

import {
  db, storage, doc, getDoc, setDoc, collection, getDocs, storageRef, uploadBytes, getDownloadURL,
  observarSessao, entrar, sair, buscar, recuperarSenha,
} from './firebase.js';
import { SITE_PADRAO } from './site-padrao.js';
import { mesclar, url as urlSegura, urlLink, esc, hojeLocal } from './site-render.js';
import { CORDOES_ADULTO } from './escola.js';

const $ = (s, el = document) => el.querySelector(s);
const clonar = (o) => JSON.parse(JSON.stringify(o));
const DOC_SITE = () => doc(db, 'siteConteudo', 'site');
const DOC_ANTERIOR = () => doc(db, 'siteConteudo', 'site-anterior');

// ---------- o que cada seção tem ----------
// t: texto (padrão) | area | foto | posicao | data | telefone | link | sim | textos | cordoes | lista
const POS = [['50% 20%', 'Mostrar o alto da foto'], ['50% 50%', 'Centro'], ['50% 80%', 'Mostrar a parte de baixo'], ['25% 50%', 'Mais à esquerda'], ['75% 50%', 'Mais à direita']];
const cab = [{ c: 'selo', r: 'Etiqueta (letras pequenas acima do título)' }, { c: 'titulo', r: 'Título' }, { c: 'destaque', r: 'Final do título (em itálico)' }];
const SECOES = [
  { id: 'topo', r: 'Topo e slider', ajuda: 'A primeira coisa que as pessoas veem. As fotos do slider trocam sozinhas a cada 5 segundos.', campos: [
    { c: 'selo', r: 'Etiqueta' }, { c: 'titulo', r: 'Título grande' }, { c: 'destaque', r: 'Segunda linha (em itálico)' }, { c: 'texto', r: 'Texto', t: 'area' },
    { c: 'botao', r: 'Botão principal' }, { c: 'botao2', r: 'Botão secundário' },
    { c: 'slides', r: 'Fotos do slider', t: 'lista', max: 6, nomeItem: 'Foto', resumo: 'titulo', item: [
      { c: 'foto', r: 'Foto', t: 'foto', larga: true }, { c: 'posicao', r: 'Enquadramento', t: 'posicao' },
      { c: 'selo', r: 'Etiqueta do cartão' }, { c: 'titulo', r: 'Título do cartão' }, { c: 'texto', r: 'Texto do cartão', t: 'area' }] },
  ] },
  { id: 'numeros', r: 'Números', raizLista: true, ajuda: 'Os números embaixo do topo (até 4). Só números verdadeiros.', campos: [
    { c: '', r: 'Números', t: 'lista', max: 4, nomeItem: 'Número', resumo: 'rotulo', item: [{ c: 'valor', r: 'Número (ex.: 30+)' }, { c: 'rotulo', r: 'Legenda' }] }] },
  { id: 'faixa', r: 'Faixa que corre', raizLista: true, ajuda: 'Frases curtas que passam na faixa verde.', campos: [{ c: '', r: 'Frases', t: 'textos', max: 10 }] },
  { id: 'arte', r: 'O grupo / A arte', campos: [...cab, { c: 'texto', r: 'Texto', t: 'area' },
    { c: 'pilares', r: 'Cartões', t: 'lista', max: 6, nomeItem: 'Cartão', resumo: 'titulo', item: [{ c: 'titulo', r: 'Título' }, { c: 'texto', r: 'Texto', t: 'area' }, { c: 'foto', r: 'Foto', t: 'foto' }, { c: 'posicao', r: 'Enquadramento', t: 'posicao' }] }] },
  { id: 'graduacao', r: 'Graduação', ajuda: 'As cores dos cordões vêm do sistema (js/escola.js). Aqui você escolhe quais aparecem.', campos: [...cab, { c: 'texto', r: 'Texto', t: 'area' },
    { c: 'ocultar', r: 'Cordões que NÃO aparecem no site', t: 'cordoes' }, { c: 'infantil', r: 'Linha da trilha infantil' }, { c: 'botao', r: 'Botão' }] },
  { id: 'nucleos', r: 'Núcleos', campos: [...cab, { c: 'nota', r: 'Observação embaixo da lista', t: 'area' }, { c: 'convite', r: 'Mensagem pronta do WhatsApp', t: 'area' },
    { c: 'lista', r: 'Núcleos', t: 'lista', max: 40, nomeItem: 'Núcleo', resumo: 'nome', item: [
      { c: 'nome', r: 'Responsável' }, { c: 'bairro', r: 'Bairro / local' }, { c: 'dias', r: 'Dias' }, { c: 'horario', r: 'Horário' },
      { c: 'endereco', r: 'Endereço (usado no "Como chegar")' }, { c: 'whatsapp', r: 'WhatsApp com DDD', t: 'telefone' }, { c: 'foto', r: 'Foto do responsável', t: 'foto', quadrada: true },
      { c: 'infantil', r: 'Tem turma infantil', t: 'sim' }, { c: 'noite', r: 'Tem aula à noite', t: 'sim' }] }] },
  { id: 'mestres', r: 'Mestres', campos: [...cab, { c: 'texto', r: 'Texto', t: 'area' },
    { c: 'lista', r: 'Mestres, professores e instrutores', t: 'lista', max: 40, nomeItem: 'Pessoa', resumo: 'nome', item: [
      { c: 'nome', r: 'Nome' }, { c: 'cargo', r: 'Cargo / especialidade' }, { c: 'foto', r: 'Foto', t: 'foto', quadrada: true }, { c: 'instagram', r: 'Link do Instagram (opcional)', t: 'link' }] }] },
  { id: 'agenda', r: 'Agenda e fotos', ajuda: 'O evento futuro mais próximo vira o destaque. Eventos passados mostram "Ver fotos" quando têm link de álbum.', importar: true, campos: [...cab,
    { c: 'foto', r: 'Foto do destaque', t: 'foto', larga: true }, { c: 'aviso', r: 'Aviso embaixo da lista', t: 'area' },
    { c: 'lista', r: 'Eventos', t: 'lista', max: 60, nomeItem: 'Evento', resumo: 'titulo', item: [
      { c: 'titulo', r: 'Nome do evento' }, { c: 'data', r: 'Data', t: 'data' }, { c: 'dataTexto', r: 'Data escrita (opcional, ex.: "Novembro · a confirmar")' },
      { c: 'local', r: 'Local' }, { c: 'horario', r: 'Horário' }, { c: 'mapa', r: 'Endereço para o mapa' }, { c: 'fotos', r: 'Link do álbum de fotos (depois do evento)', t: 'link' }] }] },
  { id: 'app', r: 'App e Rede', campos: [...cab, { c: 'texto', r: 'Texto', t: 'area' },
    { c: 'recursos', r: 'O que o app oferece', t: 'lista', max: 8, nomeItem: 'Recurso', resumo: 'titulo', item: [{ c: 'titulo', r: 'Título' }, { c: 'texto', r: 'Explicação' }] },
    { c: 'printApp', r: 'Print do app (fundo transparente fica melhor)', t: 'foto', png: true }, { c: 'printRede', r: 'Print da Rede', t: 'foto', png: true }] },
  { id: 'loja', r: 'Loja', campos: [...cab, { c: 'texto', r: 'Texto', t: 'area' }, { c: 'whatsapp', r: 'WhatsApp que recebe os pedidos', t: 'telefone' },
    { c: 'produtos', r: 'Produtos', t: 'lista', max: 24, nomeItem: 'Produto', resumo: 'nome', item: [{ c: 'nome', r: 'Nome' }, { c: 'texto', r: 'Descrição', t: 'area' }, { c: 'preco', r: 'Preço (ex.: R$ 90,00)' }, { c: 'foto', r: 'Foto', t: 'foto' }] }] },
  { id: 'chamada', r: 'Aula grátis (final)', ajuda: 'O formulário abre o WhatsApp do núcleo escolhido com a mensagem pronta (lista de núcleos com WhatsApp).', campos: [
    { c: 'titulo', r: 'Título' }, { c: 'destaque', r: 'Final do título (em itálico)' }, { c: 'texto', r: 'Texto', t: 'area' }, { c: 'foto', r: 'Foto de fundo', t: 'foto', larga: true },
    { c: 'formTitulo', r: 'Título do formulário' }, { c: 'formAjuda', r: 'Texto embaixo do botão' }] },
  { id: 'rodape', r: 'Rodapé e contato', campos: [{ c: 'texto', r: 'Texto', t: 'area' }, { c: 'telefone', r: 'Telefone' }, { c: 'endereco', r: 'Endereço' },
    { c: 'instagram', r: 'Instagram (como aparece)' }, { c: 'instagramUrl', r: 'Link do Instagram', t: 'link' }, { c: 'facebook', r: 'Facebook (como aparece)' }, { c: 'facebookUrl', r: 'Link do Facebook', t: 'link' }] },
];

// ---------- estado ----------
let rascunho = mesclar(null);
let publicado = '';
let secaoAtual = 'topo';
let perfilAdmin = null;
const abertos = new Set(); // itens de lista abertos ("topo.slides.0")

const obter = (caminho) => caminho.split('.').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), rascunho);
function definir(caminho, valor) {
  const ps = caminho.split('.').filter(Boolean); let o = rascunho;
  for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]];
  o[ps[ps.length - 1]] = valor;
}
const caminhoDe = (sec, campo) => [sec.id, campo].filter(Boolean).join('.');
const limparTexto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max);
const sujo = () => JSON.stringify(rascunho) !== publicado;

function toast(msg, tipo = '') {
  document.querySelectorAll('.toast').forEach((x) => x.remove());
  const t = document.createElement('div'); t.className = `toast ${tipo}`; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.classList.add('sai'), 3200); setTimeout(() => t.remove(), 3700);
}
function estado() {
  const s = sujo(); const el = $('#estado');
  el.textContent = s ? 'Alterações não publicadas' : 'Tudo publicado';
  el.classList.toggle('pendente', s);
  $('#btPublicar').disabled = !s; $('#btDescartar').disabled = !s;
}

// ---------- prévia ao vivo ----------
let previaPronta = false; let tPrevia = null;
function mandarPrevia() {
  clearTimeout(tPrevia);
  tPrevia = setTimeout(() => {
    const f = $('#previa'); if (!f || !f.contentWindow || !previaPronta) return;
    f.contentWindow.postMessage({ tipo: 'le-site-previa', conteudo: rascunho }, location.origin);
    const ancora = { topo: 'inicio', numeros: 'inicio', faixa: 'inicio', arte: 'grupo', chamada: 'aula', rodape: 'topo' }[secaoAtual] || secaoAtual;
    setTimeout(() => { try { const alvo = f.contentWindow.document.getElementById(ancora); if (alvo) alvo.scrollIntoView({ block: 'start' }); } catch (e) { /* ok */ } }, 120);
  }, 250);
}
window.addEventListener('message', (ev) => {
  if (ev.origin === location.origin && ev.data && ev.data.tipo === 'le-site-pronto') { previaPronta = true; mandarPrevia(); }
});
function alterou() { estado(); mandarPrevia(); }

// ---------- formulários ----------
function campoHTML(def, caminho, valor) {
  const id = 'f-' + caminho.replace(/\./g, '-');
  const r = esc(def.r);
  switch (def.t) {
    case 'area': return `<label class="campo" for="${id}"><span>${r}</span><textarea id="${id}" data-c="${esc(caminho)}" data-max="700" rows="3">${esc(valor)}</textarea></label>`;
    case 'posicao': {
      const opcoes = POS.some(([v]) => v === valor) || !valor ? POS : [[valor, 'Enquadramento atual (personalizado)'], ...POS];
      return `<label class="campo" for="${id}"><span>${r}</span><select id="${id}" data-c="${esc(caminho)}">${opcoes.map(([v, t]) => `<option value="${esc(v)}"${v === valor ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
    }
    case 'data': return `<label class="campo" for="${id}"><span>${r}</span><input id="${id}" type="date" data-c="${esc(caminho)}" value="${esc(valor)}"></label>`;
    case 'telefone': return `<label class="campo" for="${id}"><span>${r}</span><input id="${id}" type="tel" inputmode="numeric" data-c="${esc(caminho)}" data-tipo="telefone" data-max="15" value="${esc(valor)}" placeholder="67 99999-9999"></label>`;
    case 'link': return `<label class="campo" for="${id}"><span>${r}</span><input id="${id}" type="url" data-c="${esc(caminho)}" data-tipo="link" data-max="400" value="${esc(valor)}" placeholder="https://"></label>`;
    case 'sim': return `<label class="campo sim" for="${id}"><input id="${id}" type="checkbox" data-c="${esc(caminho)}" data-tipo="sim"${valor ? ' checked' : ''}><span>${r}</span></label>`;
    case 'foto': {
      const u = urlSegura(valor);
      return `<div class="campo foto${def.quadrada ? ' quadrada' : ''}"><span>${r}</span><div class="foto-linha">
        <span class="miniatura">${u ? `<img src="${esc(u)}" alt="">` : '<i>sem foto</i>'}</span>
        <span class="foto-acoes"><label class="bt bt-claro" for="${id}">Trocar foto</label><input id="${id}" type="file" accept="image/*" class="oculto" data-foto="${esc(caminho)}" data-larga="${def.larga ? 1 : 0}" data-png="${def.png ? 1 : 0}" data-quadrada="${def.quadrada ? 1 : 0}">
        <small>${esc(u ? (u.startsWith('https://') ? 'Foto enviada pelo painel' : u) : 'Nenhuma foto')}</small></span></div></div>`;
    }
    case 'cordoes': {
      const marcados = Array.isArray(valor) ? valor : [];
      return `<fieldset class="campo cordoes"><legend>${r}</legend>${CORDOES_ADULTO.map((c, i) => `<label for="${id}-${i}"><input id="${id}-${i}" type="checkbox" data-cordao="${esc(c.nome)}" data-c="${esc(caminho)}"${marcados.includes(c.nome) ? ' checked' : ''}><span class="amostra" style="background:linear-gradient(90deg,${esc(c.cor[0])} 33%,${esc(c.cor[1])} 33% 66%,${esc(c.cor[2])} 66%)"></span>${esc(c.nome)}</label>`).join('')}</fieldset>`;
    }
    case 'textos': {
      const itens = Array.isArray(valor) ? valor : [];
      return `<div class="campo"><span>${r}</span><div class="textos">${itens.map((t, i) => `<div class="texto-item"><input aria-label="Frase ${i + 1}" data-c="${esc(caminho ? `${caminho}.${i}` : String(i))}" data-max="80" value="${esc(t)}"><button type="button" class="bt-mini" data-acao="remover" data-lista="${esc(caminho)}" data-i="${i}" aria-label="Remover frase ${i + 1}">×</button></div>`).join('')}</div>
        ${itens.length < (def.max || 10) ? `<button type="button" class="bt bt-claro" data-acao="add-texto" data-lista="${esc(caminho)}">+ Adicionar frase</button>` : ''}</div>`;
    }
    case 'lista': {
      const itens = Array.isArray(valor) ? valor : [];
      return `<div class="campo lista"><div class="lista-cab"><span>${r} <em>(${itens.length})</em></span>${itens.length < (def.max || 20) ? `<button type="button" class="bt bt-claro" data-acao="add" data-lista="${esc(caminho)}">+ ${esc(def.nomeItem || 'Item')}</button>` : ''}</div>
        ${itens.map((itBruto, i) => {
          const it = itBruto && typeof itBruto === 'object' ? itBruto : {};
          const ci = caminho ? `${caminho}.${i}` : String(i);
          const aberto = abertos.has(ci);
          const titulo = (it && it[def.resumo]) || `${def.nomeItem || 'Item'} ${i + 1}`;
          const fotoItem = def.item.find((f) => f.t === 'foto');
          const mini = fotoItem && urlSegura(it[fotoItem.c]);
          return `<div class="item${aberto ? ' aberto' : ''}" data-resumo="${esc(`${ci}.${def.resumo}`)}">
            <div class="item-cab">
              <button type="button" class="item-abre" data-acao="abrir" data-item="${esc(ci)}" aria-expanded="${aberto}">${mini ? `<img src="${esc(mini)}" alt="">` : `<b class="num">${i + 1}</b>`}<span>${esc(titulo)}</span></button>
              <span class="item-bts">
                <button type="button" class="bt-mini" data-acao="subir" data-lista="${esc(caminho)}" data-i="${i}" aria-label="Subir"${i === 0 ? ' disabled' : ''}>↑</button>
                <button type="button" class="bt-mini" data-acao="descer" data-lista="${esc(caminho)}" data-i="${i}" aria-label="Descer"${i === itens.length - 1 ? ' disabled' : ''}>↓</button>
                <button type="button" class="bt-mini perigo" data-acao="remover" data-lista="${esc(caminho)}" data-i="${i}" aria-label="Remover ${esc(titulo)}">×</button>
              </span>
            </div>
            ${aberto ? `<div class="item-corpo">${def.item.map((f) => campoHTML(f, `${ci}.${f.c}`, it[f.c])).join('')}</div>` : ''}
          </div>`;
        }).join('')}</div>`;
    }
    default: return `<label class="campo" for="${id}"><span>${r}</span><input id="${id}" type="text" data-c="${esc(caminho)}" data-max="160" value="${esc(valor)}"></label>`;
  }
}

function desenharMenu() {
  $('#secoes').innerHTML = SECOES.map((s) => `<button type="button" class="${s.id === secaoAtual ? 'on' : ''}" data-secao="${s.id}" aria-current="${s.id === secaoAtual}">${esc(s.r)}</button>`).join('');
}
function desenharForm() {
  const s = SECOES.find((x) => x.id === secaoAtual);
  const y = $('#form').scrollTop;
  $('#form').innerHTML = `<h2>${esc(s.r)}</h2>${s.ajuda ? `<p class="ajuda-sec">${esc(s.ajuda)}</p>` : ''}
    ${s.importar ? '<button type="button" class="bt bt-claro importar" data-acao="importar">Trazer eventos do app (painel de gestão)</button>' : ''}
    ${s.campos.map((f) => { const cam = s.raizLista ? s.id : caminhoDe(s, f.c); return campoHTML(f, cam, obter(cam)); }).join('')}`;
  $('#form').scrollTop = y;
}
function acharDef(caminhoLista) {
  // "nucleos.lista" → definição da lista; "numeros" → a lista da raiz
  const [secId, ...resto] = caminhoLista.split('.');
  const s = SECOES.find((x) => x.id === secId);
  if (s.raizLista) return s.campos[0];
  let defs = s.campos; let def = null;
  resto.forEach((p) => { if (/^\d+$/.test(p)) { defs = def.item; } else { def = defs.find((f) => f.c === p); } });
  return def;
}
function novoItem(def) {
  const o = {};
  def.item.forEach((f) => { o[f.c] = f.t === 'sim' ? false : f.t === 'posicao' ? '50% 50%' : ''; });
  return o;
}

// ---------- eventos do formulário ----------
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.dataset || !el.dataset.c || el.dataset.cordao !== undefined) return;
  const cam = el.dataset.c;
  let v;
  if (el.dataset.tipo === 'sim') v = el.checked;
  else if (el.dataset.tipo === 'telefone') v = el.value.replace(/\D/g, '').slice(0, 13);
  else v = limparTexto(el.value, Number(el.dataset.max) || 400);
  definir(cam, v);
  if (el.dataset.tipo === 'link') el.classList.toggle('invalido', !!v && !urlLink(v));
  // O nome do item na lista acompanha o que está sendo digitado.
  const item = el.closest('.item');
  if (item && item.dataset.resumo === cam) { const t = item.querySelector('.item-abre span'); if (t) t.textContent = v || '(sem nome)'; }
  alterou();
});
document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.cordao !== undefined) {
    const cam = el.dataset.c; const atuais = new Set(obter(cam) || []);
    if (el.checked) atuais.add(el.dataset.cordao); else atuais.delete(el.dataset.cordao);
    definir(cam, CORDOES_ADULTO.map((c) => c.nome).filter((n) => atuais.has(n))); alterou(); return;
  }
  if (el.tagName === 'SELECT' && el.dataset.c) { definir(el.dataset.c, el.value); alterou(); return; }
  if (el.dataset && el.dataset.tipo === 'sim') { definir(el.dataset.c, el.checked); alterou(); return; }
  if (el.dataset && el.dataset.foto && el.files && el.files[0]) {
    const arq = el.files[0]; el.value = '';
    const linha = el.closest('.campo'); linha.classList.add('enviando');
    // Guarda o objeto dono da foto ANTES do envio: se a lista for reordenada
    // enquanto sobe, a foto continua indo para o item certo.
    const partes = el.dataset.foto.split('.'); const chave = partes.pop();
    const dono = obter(partes.join('.'));
    try {
      const link = await enviarFotoDoSite(arq, { larga: el.dataset.larga === '1', png: el.dataset.png === '1', quadrada: el.dataset.quadrada === '1' });
      if (!dono || typeof dono !== 'object') throw new Error('O item foi removido enquanto a foto subia.');
      dono[chave] = link; desenharForm(); alterou(); toast('Foto enviada. Publique para ela aparecer no site.');
    } catch (err) { console.error(err); toast(err.message || 'Não foi possível enviar a foto.', 'erro'); linha.classList.remove('enviando'); }
  }
});

document.addEventListener('click', async (e) => {
  const sec = e.target.closest('[data-secao]');
  if (sec) { secaoAtual = sec.dataset.secao; desenharMenu(); desenharForm(); mandarPrevia(); document.body.classList.remove('mostra-previa'); return; }
  const b = e.target.closest('[data-acao]'); if (!b) return;
  const acao = b.dataset.acao; const cam = b.dataset.lista; const i = Number(b.dataset.i);
  if (acao === 'abrir') { const k = b.dataset.item; if (abertos.has(k)) abertos.delete(k); else abertos.add(k); desenharForm(); return; }
  if (acao === 'importar') { await importarEventos(); return; }
  const lista = obter(cam);
  if (!Array.isArray(lista)) return;
  if (acao === 'add') { const def = acharDef(cam); lista.push(novoItem(def)); abertos.add(`${cam}.${lista.length - 1}`); }
  if (acao === 'add-texto') lista.push('');
  if (acao === 'remover') { const nome = typeof lista[i] === 'string' ? lista[i] : (lista[i] && (lista[i].nome || lista[i].titulo)) || 'este item'; if (!confirm(`Remover "${nome}"?`)) return; lista.splice(i, 1); abertos.clear(); }
  if (acao === 'subir' && i > 0) { [lista[i - 1], lista[i]] = [lista[i], lista[i - 1]]; abertos.clear(); }
  if (acao === 'descer' && i < lista.length - 1) { [lista[i + 1], lista[i]] = [lista[i], lista[i + 1]]; abertos.clear(); }
  desenharForm(); alterou();
});

// ---------- fotos ----------
function carregarImagem(arq) {
  return new Promise((ok, erro) => { const u = URL.createObjectURL(arq); const i = new Image(); i.onload = () => { URL.revokeObjectURL(u); ok(i); }; i.onerror = () => { URL.revokeObjectURL(u); erro(new Error('Arquivo de imagem inválido.')); }; i.src = u; });
}
async function enviarFotoDoSite(arq, { larga, png, quadrada }) {
  if (!/^image\//.test(arq.type)) throw new Error('Escolha um arquivo de imagem.');
  if (arq.size > 25 * 1024 * 1024) throw new Error('Imagem muito grande (máx. 25 MB).');
  const img = await carregarImagem(arq);
  const max = quadrada ? 700 : larga ? 1920 : png ? 900 : 1400;
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k); const h = Math.round(img.naturalHeight * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high';
  if (!png) { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, w, h); }
  cx.drawImage(img, 0, 0, w, h);
  const tipo = png ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((ok) => cv.toBlob(ok, tipo, 0.82));
  if (!blob) throw new Error('Não foi possível preparar a imagem.');
  if (blob.size > 3 * 1024 * 1024) throw new Error('Mesmo comprimida a imagem passou de 3 MB — use uma foto menor.');
  const nome = `site/${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}.${png ? 'png' : 'jpg'}`;
  const r = storageRef(storage, nome);
  await uploadBytes(r, blob, { contentType: tipo, cacheControl: 'public,max-age=31536000' });
  return getDownloadURL(r);
}

// ---------- eventos do app ----------
async function importarEventos() {
  try {
    const snap = await getDocs(collection(db, 'eventos'));
    const hoje = hojeLocal();
    const lista = rascunho.agenda.lista;
    const ja = new Set(lista.map((e) => `${(e.titulo || '').toLowerCase()}|${e.data}`));
    let n = 0;
    snap.docs.map((d) => d.data()).forEach((ev) => {
      const titulo = limparTexto(ev.nome || ev.titulo || '', 160).trim();
      const data = /^\d{4}-\d{2}-\d{2}/.test(ev.data || '') ? ev.data.slice(0, 10) : '';
      if (!titulo || !data || data < hoje) return;
      const k = `${titulo.toLowerCase()}|${data}`; if (ja.has(k)) return;
      lista.push({ titulo, data, dataTexto: '', local: limparTexto(ev.local || ev.descricao || '', 160), horario: limparTexto(ev.horario || '', 40), mapa: limparTexto(ev.endereco || ev.local || '', 200), fotos: '' });
      ja.add(k); n++;
    });
    desenharForm(); alterou();
    toast(n ? `${n} evento(s) trazido(s) do app. Confira e publique.` : 'Nenhum evento futuro novo no app.');
  } catch (e) { console.error(e); toast('Não foi possível ler os eventos do app.', 'erro'); }
}

// ---------- validar, publicar, desfazer ----------
// Confere, pelo mapa das seções, todo campo de foto ou link (só https:// ou foto do próprio site).
function validar(c) {
  const problemas = [];
  const olhar = (defs, obj, onde) => defs.forEach((f) => {
    const v = f.c ? (obj || {})[f.c] : obj;
    if (f.t === 'foto' && typeof v === 'string' && v && !urlSegura(v)) problemas.push(`${onde} → ${f.r}: foto inválida`);
    if (f.t === 'link' && typeof v === 'string' && v && !urlLink(v)) problemas.push(`${onde} → ${f.r}: use o link completo, começando com https://`);
    if (f.t === 'lista' && Array.isArray(v)) v.forEach((it, i) => olhar(f.item, it, `${onde} › ${f.nomeItem || 'item'} ${i + 1}`));
  });
  SECOES.forEach((s) => olhar(s.campos, c[s.id], s.r));
  return problemas;
}
async function publicar() {
  const problemas = validar(rascunho);
  if (problemas.length) { toast(`Corrija antes de publicar: ${problemas[0]}`, 'erro'); return; }
  const bt = $('#btPublicar'); bt.disabled = true; bt.textContent = 'Publicando…';
  try {
    const atual = await getDoc(DOC_SITE());
    if (atual.exists()) await setDoc(DOC_ANTERIOR(), atual.data());
    // Documento é público: grava só o primeiro nome de quem publicou (nada de uid ou e-mail).
    const dados = { ...clonar(rascunho), versao: 1, atualizadoEm: new Date().toISOString(), atualizadoPor: String(perfilAdmin.nome || 'Admin').split(' ')[0] };
    await setDoc(DOC_SITE(), dados);
    publicado = JSON.stringify(rascunho);
    toast('Publicado! O site já mostra a versão nova.');
  } catch (e) {
    console.error(e);
    toast(e && e.code === 'permission-denied' ? 'Sem permissão: só o Admin Master publica o site.' : 'Não foi possível publicar. Verifique a internet e tente de novo.', 'erro');
  } finally { bt.textContent = 'Publicar'; estado(); }
}
async function voltarAnterior() {
  if (!confirm('Trazer de volta a versão publicada antes da última publicação? (Ela entra como rascunho; publique para confirmar.)')) return;
  const s = await getDoc(DOC_ANTERIOR());
  if (!s.exists()) { toast('Ainda não existe versão anterior.'); return; }
  rascunho = mesclar(s.data()); abertos.clear(); desenharForm(); alterou(); toast('Versão anterior carregada. Publique para confirmar.');
}

$('#btPublicar').addEventListener('click', publicar);
$('#btDescartar').addEventListener('click', () => { if (!confirm('Descartar as alterações não publicadas?')) return; rascunho = JSON.parse(publicado); abertos.clear(); desenharForm(); alterou(); });
$('#btAnterior').addEventListener('click', voltarAnterior);
$('#btPadrao').addEventListener('click', () => { if (!confirm('Trocar TODO o conteúdo pelo padrão original do site? (Entra como rascunho; publique para confirmar.)')) return; rascunho = mesclar(null); abertos.clear(); desenharForm(); alterou(); });
$('#btBaixar').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(rascunho, null, 2)], { type: 'application/json' }));
  a.download = `site-conteudo-${new Date().toISOString().slice(0, 10)}.json`; document.body.appendChild(a); a.click(); a.remove();
});
$('#btPrevia').addEventListener('click', () => document.body.classList.toggle('mostra-previa'));
document.querySelectorAll('[data-largura]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-largura]').forEach((x) => x.classList.toggle('on', x === b));
  $('#moldura').dataset.largura = b.dataset.largura;
}));
$('#btSair').addEventListener('click', async () => { if (sujo() && !confirm('Há alterações não publicadas. Sair mesmo assim?')) return; await sair(); location.reload(); });
window.addEventListener('beforeunload', (e) => { if (perfilAdmin && sujo()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- entrada (só Admin Master) ----------
function mostrar(tela) { ['telaCarregando', 'telaEntrar', 'telaPainel'].forEach((t) => { $('#' + t).hidden = t !== tela; }); }
$('#formEntrar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim(); const senha = $('#senha').value;
  const erro = $('#erroEntrar'); erro.textContent = '';
  if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha.'; return; }
  const bt = $('#btEntrar'); bt.disabled = true; bt.textContent = 'Entrando…';
  try { await entrar(email, senha); } catch (err) { erro.textContent = 'E-mail ou senha incorretos.'; } finally { bt.disabled = false; bt.textContent = 'Entrar'; }
});
$('#btEsqueci').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  if (!email) { $('#erroEntrar').textContent = 'Digite seu e-mail acima e toque de novo.'; return; }
  try { await recuperarSenha(email); } catch (e) { /* não revela se o e-mail existe */ }
  $('#erroEntrar').textContent = 'Se o e-mail estiver cadastrado, o link de nova senha chega em instantes.';
});

observarSessao(async (user) => {
  if (!user) { perfilAdmin = null; mostrar('telaEntrar'); return; }
  let perfil = null; try { perfil = await buscar('usuarios', user.uid); } catch (e) { perfil = null; }
  const papeis = (perfil && Array.isArray(perfil.papeis)) ? perfil.papeis : [];
  if (!papeis.includes('admin')) {
    mostrar('telaEntrar');
    $('#erroEntrar').textContent = 'Esta conta não tem acesso. Só o Admin Master edita o site.';
    await sair(); return;
  }
  perfilAdmin = { uid: user.uid, nome: perfil.nome || '', email: user.email || '' };
  $('#quem').textContent = perfilAdmin.nome || perfilAdmin.email;
  try {
    const s = await getDoc(DOC_SITE());
    rascunho = mesclar(s.exists() ? s.data() : null);
  } catch (e) { toast('Não foi possível ler o conteúdo publicado — mostrando o padrão.', 'erro'); rascunho = mesclar(null); }
  delete rascunho.atualizadoEm; delete rascunho.atualizadoPor;
  publicado = JSON.stringify(rascunho);
  mostrar('telaPainel');
  desenharMenu(); desenharForm(); estado();
  $('#previa').src = 'index.html?previa=1';
});
