/* master.js — Mega painel da AtletaPay (atletapay.com.br/master.html).

Primeira peça (etapa 2): a fila de escolas. A equipe confere o cadastro (dono,
responsável, fotos, modelo) e clica em "Ativar": o servidor faz o resto
(functions/src/ativacao.js) e o resultado volta aqui em tempo real
(escolas/{id}.ativacao). Também: pausar/reativar, "Tentar de novo" quando a
ativação deu erro e mandar ao dono o link de nova senha (o Firebase envia o
e-mail; ninguém vê nem define senha de ninguém).

Segurança: a tela só abre para conta com papel admin (usuarios/{uid}.papeis), e
quem garante de verdade são as regras do banco — só o Admin lista e muda escolas. */
import { db, doc, getDoc, updateDoc, collection, onSnapshot, observarSessao, entrar, recuperarSenha, sair, erroAmigavel } from './firebase.js?v=20261002';
import { modalidadePorId, porId, FOTOS, fotosFaltando } from './catalogo.js?v=20261007';

// Onde o app das escolas está publicado hoje (a inscrição de cada escola é ?escola=<id>).
// Quando o app for servido em atletapay.com.br/<escola>, troca aqui.
const APP_URL = 'https://capoeira-liberdade.web.app';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urlSegura = (u) => (/^https:\/\/[^\s"'<>]+$/.test(String(u || '')) ? String(u) : '');
const el = (id) => document.getElementById(id);
const pagina = el('pagina');
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
let toastTimer = null;
function toast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3200); }

const ABAS = [
  { id: 'fila', nome: 'Na fila', filtro: (e) => e.status === 'fila' },
  { id: 'ativa', nome: 'Ativas', filtro: (e) => e.status === 'ativa' },
  { id: 'pausada', nome: 'Pausadas', filtro: (e) => e.status === 'pausada' || e.status === 'cancelada' },
  { id: 'rascunho', nome: 'Cadastro incompleto', filtro: (e) => e.status === 'rascunho' },
  { id: 'todas', nome: 'Todas', filtro: () => true },
];
const STATUS = { fila: ['Na fila', ''], ativa: ['Ativa', 'ok'], pausada: ['Pausada', 'pausada'], cancelada: ['Cancelada', 'pausada'], rascunho: ['Rascunho', 'pausada'] };
let aba = 'fila'; let escolas = []; let busca = ''; let desligar = null; let meuUid = null;

el('btSair').addEventListener('click', async () => { if (desligar) desligar(); await sair(); location.reload(); });

observarSessao(async (u) => {
  if (desligar) { desligar(); desligar = null; }
  if (!u) { el('quem').textContent = ''; el('btSair').hidden = true; renderLogin(); return; }
  meuUid = u.uid; el('btSair').hidden = false; el('quem').textContent = u.email || '';
  try {
    const p = await getDoc(doc(db, 'usuarios', u.uid));
    const papeis = p.exists() && Array.isArray(p.data().papeis) ? p.data().papeis : [];
    if (!papeis.includes('admin')) { semAcesso(); return; }
  } catch (e) { semAcesso(); return; }
  desligar = onSnapshot(collection(db, 'escolas'), (s) => {
    escolas = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.enviadoEm || b.criadoEm || '').localeCompare(String(a.enviadoEm || a.criadoEm || '')));
    render();
  }, (e) => { console.error(e); pagina.innerHTML = `<div class="wrap" style="padding:60px 16px"><div class="erro-caixa">Não deu para listar as escolas. ${esc(erroAmigavel(e))}</div></div>`; });
});

function semAcesso() {
  pagina.innerHTML = '<div class="wrap" style="max-width:520px;padding:60px 16px"><div class="erro-caixa"><i class="fas fa-lock"></i> Área só da equipe AtletaPay. Esta conta não tem acesso ao Mega painel.</div><p class="sub" style="margin-top:14px">É dono de escola? O painel da sua escola fica em <a href="painel.html">Minha escola</a>.</p></div>';
}

function renderLogin() {
  pagina.innerHTML = `<div class="wrap" style="max-width:460px;padding:60px 16px"><span class="eyebrow">Equipe AtletaPay</span><h2 style="margin-top:10px">Mega painel</h2><p class="sub" style="margin-top:8px">Entre com a conta de administrador.</p>
    <form class="form" id="f"><div class="erro-caixa" id="erro" hidden></div><div class="campo"><label for="email">E-mail</label><input id="email" type="email" required autocomplete="username"></div><div class="campo"><label for="senha">Senha</label><input id="senha" type="password" required autocomplete="current-password"><small class="ajuda"><a href="#" id="esqueci">Esqueci minha senha</a></small></div><div class="acoes"><button type="submit" class="bt bt-laranja">Entrar <i class="fas fa-arrow-right"></i></button></div></form></div>`;
  const erro = (m) => { el('erro').hidden = false; el('erro').textContent = m; };
  el('esqueci').addEventListener('click', async (e) => { e.preventDefault(); const em = el('email').value.trim(); if (!em) { erro('Digite o e-mail.'); return; } try { await recuperarSenha(em); toast('Enviamos o link para o seu e-mail.'); } catch (er) { erro(erroAmigavel(er)); } });
  el('f').addEventListener('submit', async (e) => { e.preventDefault(); try { await entrar(el('email').value, el('senha').value); } catch (er) { erro(erroAmigavel(er)); } });
}

function render() {
  const buscaFocada = document.activeElement && document.activeElement.id === 'busca';
  const pos = buscaFocada ? (document.activeElement.selectionStart ?? busca.length) : 0;
  const contagem = Object.fromEntries(ABAS.map((a) => [a.id, escolas.filter(a.filtro).length]));
  const f = busca.toLowerCase();
  const lista = escolas.filter(ABAS.find((a) => a.id === aba).filtro)
    .filter((e) => !f || `${e.nome} ${e.slug} ${e.cidade} ${e.donoNome} ${e.donoEmail}`.toLowerCase().includes(f));
  const ativas = contagem.ativa; const fila = contagem.fila;
  pagina.innerHTML = `
    <section class="cab-painel"><div class="wrap"><div><span class="eyebrow" style="color:var(--laranja-claro)">Equipe AtletaPay</span><h1 style="font-size:clamp(1.6rem,3.6vw,2.6rem);margin-top:8px">Escolas</h1>
      <p class="sub" style="margin-top:8px;color:var(--texto-inv-2)"><b class="mono">${ativas}</b> ativa${ativas === 1 ? '' : 's'} · <b class="mono">${fila}</b> esperando ativação · <b class="mono">${escolas.length}</b> no total</p></div></div></section>
    <div class="wrap master">
      <div class="master-barra">
        <div class="abas" role="tablist">${ABAS.map((a) => `<button type="button" role="tab" class="aba" aria-selected="${a.id === aba}" data-aba="${a.id}">${esc(a.nome)} <span class="mono">${contagem[a.id]}</span></button>`).join('')}</div>
        <input type="search" id="busca" class="busca" placeholder="Buscar escola, cidade ou dono…" aria-label="Buscar escola" value="${esc(busca)}">
      </div>
      <div class="lista-escolas">${lista.map(cartaoEscola).join('') || `<div class="cartao vazio"><i class="fas fa-inbox"></i><b>Nada por aqui</b><span>${aba === 'fila' ? 'Nenhuma escola esperando ativação.' : 'Nenhuma escola nesta lista.'}</span></div>`}</div>
    </div>`;
  pagina.querySelector('.abas').addEventListener('click', (ev) => { const b = ev.target.closest('[data-aba]'); if (!b) return; aba = b.dataset.aba; render(); });
  const bu = el('busca'); bu.addEventListener('input', () => { busca = bu.value; render(); });
  if (buscaFocada) { bu.focus(); bu.setSelectionRange(pos, pos); } // a lista atualiza ao vivo sem tirar o cursor da busca
  pagina.querySelector('.lista-escolas').addEventListener('click', acao);
}

function cartaoEscola(e) {
  const mod = modalidadePorId(e.modalidade); const plano = porId(e.plano);
  const [rot, cls] = STATUS[e.status] || [e.status || '—', 'pausada'];
  const a = e.ativacao || {};
  const faltando = fotosFaltando(e.fotos);
  const fotos = FOTOS.flatMap((x) => ((e.fotos && e.fotos[x.id]) || []).map((u) => ({ u: urlSegura(u), tipo: x.id }))).filter((x) => x.u);
  const logo = urlSegura(e.fotos && e.fotos.logo && e.fotos.logo[0]);
  const endereco = e.dominio ? e.dominio : `atletapay.com.br/${e.slug || e.id}`;
  const linkInscricao = `${APP_URL}/inscricao.html?escola=${encodeURIComponent(e.id)}`;
  const resp = e.responsavel || {};
  const checks = [
    [faltando.length ? `Fotos: falta ${faltando.map((x) => x.nome.toLowerCase()).join(', ')}` : `Fotos completas (${fotos.length})`, !faltando.length],
    [e.modelo ? `Modelo do site: ${e.modelo}` : 'Modelo do site não escolhido', !!e.modelo],
    [e.donoEmail ? 'Dono com e-mail' : 'Dono sem e-mail', !!e.donoEmail],
  ];
  let ativacao = '';
  if (e.status === 'ativa') {
    if (a.status === 'ok') ativacao = `<div class="ok-caixa"><i class="fas fa-circle-check"></i> No ar desde ${dataBR(a.em)} · sede <span class="mono">${esc(a.nucleoId)}</span> · Fundador: ${esc(resp.nome || e.donoNome || '')}</div>`;
    else if (a.status === 'erro') ativacao = `<div class="erro-caixa"><i class="fas fa-triangle-exclamation"></i> A ativação não terminou: ${esc(a.erro || 'erro desconhecido')}</div>`;
    else ativacao = '<div class="ok-caixa espera"><i class="fas fa-spinner fa-spin"></i> Ativando: criando a sede, o Fundador e as graduações…</div>';
  }
  const bts = [];
  if (['fila', 'pausada', 'cancelada'].includes(e.status)) bts.push(`<button type="button" class="bt bt-laranja bt-sm" data-ativar="${esc(e.id)}"><i class="fas fa-rocket"></i> ${e.status === 'fila' ? 'Ativar' : 'Reativar'}</button>`);
  if (e.status === 'ativa' && a.status === 'erro') bts.push(`<button type="button" class="bt bt-laranja bt-sm" data-tentar="${esc(e.id)}"><i class="fas fa-rotate-right"></i> Tentar de novo</button>`);
  if (e.status === 'ativa' && a.status === 'ok') bts.push(`<button type="button" class="bt bt-branco bt-sm" data-copiar="${esc(linkInscricao)}"><i class="fas fa-link"></i> Copiar link de inscrição</button>`);
  if (e.donoEmail) bts.push(`<button type="button" class="bt bt-branco bt-sm" data-senha="${esc(e.donoEmail)}"><i class="fas fa-key"></i> Enviar link de nova senha ao dono</button>`);
  if (e.status === 'ativa') bts.push(`<button type="button" class="bt bt-branco bt-sm perigo" data-pausar="${esc(e.id)}"><i class="fas fa-pause"></i> Pausar</button>`);
  return `<article class="cartao escola-card">
    <header class="ec-topo">
      <div class="ec-logo">${logo ? `<img src="${esc(logo)}" alt="">` : `<span>${esc(String(e.nomeCurto || e.nome || '?').slice(0, 2).toUpperCase())}</span>`}</div>
      <div class="ec-titulo"><h3>${esc(e.nome || e.id)}</h3><p>${esc(mod.nome)} · ${esc(e.cidade || '')}${e.uf ? `/${esc(e.uf)}` : ''} · <span class="mono">${esc(endereco)}</span></p></div>
      <span class="status ${cls}">${esc(rot)}</span>
    </header>
    ${ativacao}
    <div class="ec-corpo">
      <dl class="kv">
        <dt>Dono</dt><dd>${esc(e.donoNome || '—')}${e.donoEmail ? ` · <a href="mailto:${esc(e.donoEmail)}">${esc(e.donoEmail)}</a>` : ''}${e.donoCelular ? ` · ${esc(e.donoCelular)}` : ''}</dd>
        <dt>Responsável</dt><dd>${esc(resp.nome || '—')}${resp.graduacao ? ` · ${esc(resp.graduacao)}` : ''}</dd>
        <dt>Plano</dt><dd>${esc(plano.nome)} · teste até ${dataBR(e.trialAte)}</dd>
        <dt>Datas</dt><dd>criada ${dataBR(e.criadoEm)}${e.enviadoEm ? ` · enviada ${dataBR(e.enviadoEm)}` : ''}${e.ativadaEm ? ` · ativada ${dataBR(e.ativadaEm)}` : ''}</dd>
        ${e.instagram ? `<dt>Instagram</dt><dd>${esc(e.instagram)}</dd>` : ''}
      </dl>
      <ul class="checklist">${checks.map(([t, ok]) => `<li class="${ok ? 'feito' : ''}"><i class="fas fa-check"></i><span>${esc(t)}</span></li>`).join('')}</ul>
    </div>
    ${fotos.length ? `<div class="miniaturas">${fotos.slice(0, 8).map((x) => `<a href="${esc(x.u)}" target="_blank" rel="noopener noreferrer" title="${esc(x.tipo)}"><img src="${esc(x.u)}" alt="" loading="lazy"></a>`).join('')}${fotos.length > 8 ? `<span class="mais">+${fotos.length - 8}</span>` : ''}</div>` : ''}
    <div class="ec-acoes">${bts.join('')}</div>
  </article>`;
}

async function acao(ev) {
  const b = ev.target.closest('button'); if (!b || b.disabled) return;
  const achar = (id) => escolas.find((x) => x.id === id);
  try {
    if (b.dataset.ativar) {
      const e = achar(b.dataset.ativar);
      const falta = fotosFaltando(e.fotos);
      const aviso = falta.length ? `\n\nAtenção: ainda faltam fotos (${falta.map((x) => x.nome.toLowerCase()).join(', ')}).` : '';
      if (!confirm(`Ativar "${e.nome}"?\n\nO servidor cria a sede da escola, dá ao dono (${e.donoEmail || 'sem e-mail'}) o papel de Fundador da escola e grava as graduações de ${modalidadePorId(e.modalidade).nome}.${aviso}`)) return;
      b.disabled = true;
      await updateDoc(doc(db, 'escolas', e.id), { status: 'ativa', atualizadoEm: new Date().toISOString(), ...(e.ativacao && e.ativacao.status === 'erro' ? { 'ativacao.status': 'pedido' } : {}) });
      toast('Ativando… o resultado aparece no cartão.');
    } else if (b.dataset.tentar) {
      b.disabled = true;
      await updateDoc(doc(db, 'escolas', b.dataset.tentar), { ativacao: { status: 'pedido', em: new Date().toISOString(), porUid: meuUid }, atualizadoEm: new Date().toISOString() });
      toast('Tentando de novo…');
    } else if (b.dataset.pausar) {
      const e = achar(b.dataset.pausar);
      if (!confirm(`Pausar "${e.nome}"?\n\nO site público sai do ar. Os dados, a sede e os cadastros dos alunos continuam guardados — "Reativar" volta tudo.`)) return;
      b.disabled = true;
      await updateDoc(doc(db, 'escolas', e.id), { status: 'pausada', atualizadoEm: new Date().toISOString() });
      toast('Escola pausada.');
    } else if (b.dataset.senha) {
      if (!confirm(`Enviar para ${b.dataset.senha} o e-mail do Firebase com o link para criar uma senha nova?`)) return;
      b.disabled = true;
      await recuperarSenha(b.dataset.senha);
      toast('Link de nova senha enviado ao dono.');
      b.disabled = false;
    } else if (b.dataset.copiar) {
      await navigator.clipboard.writeText(b.dataset.copiar);
      toast('Link de inscrição copiado.');
    }
  } catch (er) { console.error(er); b.disabled = false; toast(erroAmigavel(er)); }
}
