/* master.js — Mega painel da AtletaPay (atletapay.com.br/master.html).

Primeira peça (etapa 2): a fila de escolas. A equipe confere o cadastro (dono,
responsável, fotos, modelo) e clica em "Ativar": o servidor faz o resto
(functions/src/ativacao.js) e o resultado volta aqui em tempo real
(escolas/{id}.ativacao). Também: pausar/reativar, "Tentar de novo" quando a
ativação deu erro e mandar ao dono o link de nova senha (o Firebase envia o
e-mail; ninguém vê nem define senha de ninguém).

Segurança: a tela só abre para conta com papel admin (usuarios/{uid}.papeis), e
quem garante de verdade são as regras do banco — só o Admin lista e muda escolas. */
import { db, doc, getDoc, setDoc, addDoc, updateDoc, collection, onSnapshot, query, where, getCountFromServer, observarSessao, entrar, recuperarSenha, sair, erroAmigavel } from './firebase.js?v=20261009';
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
  { id: 'config', nome: 'Configurações', filtro: () => false, config: true },
];
const STATUS = { fila: ['Na fila', ''], ativa: ['Ativa', 'ok'], pausada: ['Pausada', 'pausada'], cancelada: ['Cancelada', 'pausada'], rascunho: ['Rascunho', 'pausada'] };
let aba = 'fila'; let escolas = []; let busca = ''; let desligar = null; let meuUid = null;
let plataforma = {}; let desligarPlat = null;
const numeros = new Map(); // escolaId → { carregando, alunos, nucleos, presencas, posts }
const editando = new Set(); // cartões com o formulário "Editar dados" aberto

el('btSair').addEventListener('click', async () => { if (desligar) desligar(); await sair(); location.reload(); });

observarSessao(async (u) => {
  if (desligar) { desligar(); desligar = null; }
  if (!u) { el('quem').textContent = ''; el('btSair').hidden = true; renderLogin(); return; }
  meuUid = u.uid; el('btSair').hidden = false; el('quem').textContent = u.email || '';
  try {
    const p = await getDoc(doc(db, 'usuarios', u.uid));
    const papeis = p.exists() && Array.isArray(p.data().papeis) ? p.data().papeis : [];
    if (!papeis.includes('admin')) { semAcesso(u.email, papeis); return; }
  } catch (e) { semAcesso(u.email, []); return; }
  if (desligarPlat) desligarPlat();
  desligarPlat = onSnapshot(doc(db, 'plataforma', 'publico'), (s) => { plataforma = s.exists() ? s.data() : {}; if (aba === 'config') render(); }, () => {});
  desligar = onSnapshot(collection(db, 'escolas'), (s) => {
    escolas = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.enviadoEm || b.criadoEm || '').localeCompare(String(a.enviadoEm || a.criadoEm || '')));
    render();
  }, (e) => { console.error(e); pagina.innerHTML = `<div class="wrap" style="padding:60px 16px"><div class="erro-caixa">Não deu para listar as escolas. ${esc(erroAmigavel(e))}</div></div>`; });
});

// Conta logada sem papel de admin (ex.: o mesmo navegador já estava logado como aluno ou dono):
// diz QUAL conta entrou e oferece trocar — sem revelar quem é o administrador.
function semAcesso(email, papeis) {
  const tipo = papeis.includes('mestre') ? 'de professor' : papeis.includes('aluno') ? 'de aluno' : 'sem papel de administrador';
  pagina.innerHTML = `<div class="wrap acesso-negado"><div class="cartao">
    <span class="an-icone" aria-hidden="true"><i class="fas fa-user-shield"></i></span>
    <h2>Esta conta não é da equipe AtletaPay</h2>
    <p class="sub">Você está conectado como <b>${esc(email || 'conta sem e-mail')}</b>, que é uma conta ${esc(tipo)}. O Mega painel só abre com a conta de administrador da plataforma.</p>
    <div class="acoes"><button type="button" class="bt bt-laranja" id="btTrocar"><i class="fas fa-right-left"></i> Entrar com outra conta</button><a class="bt bt-branco" href="painel">Sou dono de escola</a></div>
  </div></div>`;
  el('btTrocar').addEventListener('click', async () => { if (desligar) { desligar(); desligar = null; } await sair(); });
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
  // Formulários abertos não podem sumir quando a lista atualiza ao vivo.
  if (document.querySelector('.ec-editar form, .config-email form') && document.activeElement && document.activeElement.closest('form')) return;
  const ehConfig = aba === 'config';
  pagina.innerHTML = `
    <section class="cab-painel"><div class="wrap"><div><span class="eyebrow" style="color:var(--laranja-claro)">Equipe AtletaPay</span><h1 style="font-size:clamp(1.6rem,3.6vw,2.6rem);margin-top:8px">${ehConfig ? 'Configurações' : 'Escolas'}</h1>
      <p class="sub" style="margin-top:8px;color:var(--texto-inv-2)"><b class="mono">${ativas}</b> ativa${ativas === 1 ? '' : 's'} · <b class="mono">${fila}</b> esperando ativação · <b class="mono">${escolas.length}</b> no total</p></div></div></section>
    <div class="wrap master">
      <div class="master-barra">
        <div class="abas" role="tablist">${ABAS.map((a) => `<button type="button" role="tab" class="aba" aria-selected="${a.id === aba}" data-aba="${a.id}">${a.config ? '<i class="fas fa-sliders"></i> ' : ''}${esc(a.nome)}${a.config ? '' : ` <span class="mono">${contagem[a.id]}</span>`}</button>`).join('')}</div>
        ${ehConfig ? '' : `<input type="search" id="busca" class="busca" placeholder="Buscar escola, cidade ou dono…" aria-label="Buscar escola" value="${esc(busca)}">`}
      </div>
      ${ehConfig ? painelConfig() : `<div class="lista-escolas">${lista.map(cartaoEscola).join('') || `<div class="cartao vazio"><i class="fas fa-inbox"></i><b>Nada por aqui</b><span>${aba === 'fila' ? 'Nenhuma escola esperando ativação.' : 'Nenhuma escola nesta lista.'}</span></div>`}</div>`}
    </div>`;
  pagina.querySelector('.abas').addEventListener('click', (ev) => { const b = ev.target.closest('[data-aba]'); if (!b) return; aba = b.dataset.aba; render(); });
  if (ehConfig) { ligarConfig(); return; }
  const bu = el('busca'); bu.addEventListener('input', () => { busca = bu.value; render(); });
  if (buscaFocada) { bu.focus(); bu.setSelectionRange(pos, pos); } // a lista atualiza ao vivo sem tirar o cursor da busca
  pagina.querySelector('.lista-escolas').addEventListener('click', acao);
  pagina.querySelector('.lista-escolas').addEventListener('submit', salvarEdicao);
}

// ===== Configurações da plataforma: e-mails próprios (nova senha com a cara da escola) =====
function painelConfig() {
  const p = plataforma || {};
  const ligado = p.emailsProprios === true;
  return `<div class="config-grade">
    <article class="cartao config-email">
      <header class="ce-topo"><span class="conta-icone ${ligado ? 'bom' : ''}" aria-hidden="true"><i class="fas fa-envelope-open-text"></i></span>
        <div><h3>E-mails da plataforma</h3><p class="sub">Nova senha e confirmação de e-mail saindo de <b>${esc(p.remetenteEmail || 'noreply@atletapay.com.br')}</b>, com o nome, o logo e a cor de cada escola — e o link abrindo atletapay.com.br/conta.</p></div>
        <span class="status ${ligado ? 'ok' : 'pausada'}">${ligado ? '<i class="fas fa-circle-check"></i> Ligado' : 'Desligado'}</span></header>
      ${ligado ? `<p class="ok-caixa"><i class="fas fa-paper-plane"></i> Funcionando pelo ${esc(p.provedorEmail === 'brevo' ? 'Brevo' : 'Resend')} · testado em ${dataBR(p.testadoEm)}.</p>` : '<p class="ok-caixa espera"><i class="fas fa-circle-info"></i> Desligado: o app usa o e-mail padrão do Firebase (link capoeira-liberdade.firebaseapp.com).</p>'}
      ${p.erroEmail ? `<div class="erro-caixa"><i class="fas fa-triangle-exclamation"></i> Último teste falhou: ${esc(p.erroEmail)}</div>` : ''}
      <form class="form ce-form" id="formEmail" autocomplete="off">
        <div class="ce-campos">
          <div class="campo"><label for="ceProvedor">Serviço de envio</label><select id="ceProvedor"><option value="resend">Resend (recomendado · grátis até 100/dia e 3.000/mês)</option><option value="brevo">Brevo (300/dia grátis)</option></select></div>
          <div class="campo"><label for="ceChave">Chave da API</label><input id="ceChave" type="password" autocomplete="new-password" placeholder="${ligado ? 'Já configurada — cole outra só para trocar' : 're_… (Resend) ou xkeysib-… (Brevo)'}" minlength="10" maxlength="300"></div>
          <div class="campo"><label for="ceRemetente">Remetente</label><input id="ceRemetente" type="email" value="${esc(p.remetenteEmail || 'noreply@atletapay.com.br')}"></div>
          <div class="campo"><label for="ceNome">Nome do remetente</label><input id="ceNome" value="${esc(p.nomeRemetente || 'AtletaPay')}" maxlength="40"></div>
        </div>
        <div class="acoes"><button type="submit" class="bt bt-laranja" id="ceSalvar"><i class="fas fa-paper-plane"></i> Salvar e mandar um teste para mim</button>${ligado ? '<button type="button" class="bt bt-branco perigo" id="ceDesligar"><i class="fas fa-power-off"></i> Desligar</button>' : ''}</div>
        <p class="sub ce-resultado" id="ceResultado" aria-live="polite"></p>
      </form>
      <details class="ce-ajuda"><summary>Como ligar (uma vez, uns 15 minutos)</summary><ol>
        <li>Crie a conta grátis em <b>resend.com</b> com o e-mail da AtletaPay.</li>
        <li>Em <b>Domains → Add domain</b>, digite <span class="mono">atletapay.com.br</span>. O Resend mostra 3 ou 4 registros (TXT e MX).</li>
        <li>No <b>Registro.br</b> → atletapay.com.br → <b>Configurar zona DNS</b> → <b>Nova entrada</b> para cada registro, depois <b>Salvar alterações</b>. Em alguns minutos o Resend marca o domínio como verificado.</li>
        <li>Em <b>API Keys → Create API key</b> (permissão "Sending access"), copie a chave e cole aqui. A chave fica guardada no servidor: nem este painel consegue ler de volta.</li>
        <li>Clique em <b>Salvar e mandar um teste para mim</b>. Chegou? Pronto: todos os pedidos de nova senha passam a sair pela AtletaPay.</li>
      </ol></details>
    </article>
  </div>`;
}
function ligarConfig() {
  const f = el('formEmail'); if (!f) return;
  const res = el('ceResultado');
  const esperarComando = (ref) => new Promise((ok) => {
    const parar = onSnapshot(ref, (s) => { const c = s.data() || {}; if (['ok', 'erro', 'negado'].includes(c.status)) { parar(); ok(c); } }, () => { parar(); ok({ status: 'erro', erro: 'Sem acesso ao resultado.' }); });
    setTimeout(() => { parar(); ok({ status: 'erro', erro: 'O servidor demorou para responder. Confira as funções no GitHub (Actions).' }); }, 90000);
  });
  const testar = async () => {
    const ref = await addDoc(collection(db, 'comandos'), { tipo: 'testarEmail', porUid: meuUid, status: 'pendente', criadoEm: new Date().toISOString() });
    return esperarComando(ref);
  };
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const chave = el('ceChave').value.trim(); const provedor = el('ceProvedor').value;
    const b = el('ceSalvar'); b.disabled = true; res.textContent = 'Salvando…';
    try {
      if (chave) {
        if (chave.length < 10) throw new Error('A chave parece curta demais.');
        await setDoc(doc(db, 'segredos', 'email'), { provedor, chave, remetente: el('ceRemetente').value.trim().toLowerCase() || 'noreply@atletapay.com.br', nomeRemetente: el('ceNome').value.trim().slice(0, 40) || 'AtletaPay', atualizadoEm: new Date().toISOString(), porUid: meuUid });
        el('ceChave').value = '';
      } else if (plataforma.emailsProprios !== true) throw new Error('Cole a chave da API do serviço de envio.');
      else {
        // Já ligado e sem chave nova: troca só remetente/nome (merge mantém a chave guardada,
        // que nem este painel consegue ler — as regras conferem o documento final).
        await setDoc(doc(db, 'segredos', 'email'), { remetente: el('ceRemetente').value.trim().toLowerCase() || 'noreply@atletapay.com.br', nomeRemetente: el('ceNome').value.trim().slice(0, 40) || 'AtletaPay', atualizadoEm: new Date().toISOString(), porUid: meuUid }, { merge: true });
      }
      res.textContent = 'Mandando um e-mail de teste para você…';
      const r = await testar();
      res.textContent = r.status === 'ok' ? `Pronto! Teste enviado para ${r.resultado && r.resultado.enviadoPara}. Confira a caixa de entrada (e o spam).` : `Não funcionou: ${r.erro || 'erro desconhecido'}`;
    } catch (er) { res.textContent = erroAmigavel(er); }
    b.disabled = false;
  });
  const d = el('ceDesligar');
  if (d) d.addEventListener('click', async () => {
    if (!confirm('Desligar os e-mails da plataforma? O app volta a usar o e-mail padrão do Firebase.')) return;
    d.disabled = true;
    try { await setDoc(doc(db, 'segredos', 'email'), { provedor: 'resend', chave: 'desligado-pelo-admin', atualizadoEm: new Date().toISOString(), porUid: meuUid }); await testar(); toast('E-mails da plataforma desligados.'); } catch (er) { toast(erroAmigavel(er)); }
  });
}

// ===== Números de uma escola (contagens no servidor: 1 leitura cada, nunca a lista inteira) =====
async function carregarNumeros(id) {
  numeros.set(id, { carregando: true }); render();
  const contar = async (col, ...filtros) => { try { return (await getCountFromServer(query(collection(db, col), where('escolaId', '==', id), ...filtros))).data().count; } catch (e) { console.warn('contagem', col, e); return null; } };
  const [alunos, ativos, nucleos, presencas, posts] = await Promise.all([
    contar('usuarios'), contar('usuarios', where('statusAtual', '==', 'Ativo')), contar('nucleos'), contar('presencas'), contar('posts'),
  ]);
  numeros.set(id, { alunos, ativos, nucleos, presencas, posts, em: new Date() });
  render();
}
const numeroHTML = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR'));

// ===== Editar dados da escola (o servidor republica o cartão público na hora) =====
async function salvarEdicao(ev) {
  const f = ev.target.closest('form[data-editar]'); if (!f) return;
  ev.preventDefault();
  const id = f.dataset.editar; const v = (n) => String(f.elements[n].value || '').trim();
  const cor = (n) => (/^#[0-9a-f]{6}$/i.test(v(n)) ? v(n) : null);
  const dados = {
    nome: v('nome').slice(0, 80), nomeCurto: v('nomeCurto').slice(0, 30), cidade: v('cidade').slice(0, 60), uf: v('uf').toUpperCase().slice(0, 2),
    endereco: v('endereco').slice(0, 140), instagram: v('instagram').replace(/^@/, '').slice(0, 60),
    cores: Object.fromEntries([['navy', cor('corNavy')], ['teal', cor('corTeal')], ['verde', cor('corVerde')]].filter(([, c]) => c)),
    atualizadoEm: new Date().toISOString(),
  };
  if (!dados.nome) { toast('O nome não pode ficar vazio.'); return; }
  const b = f.querySelector('button[type=submit]'); b.disabled = true;
  try { await updateDoc(doc(db, 'escolas', id), dados); editando.delete(id); if (document.activeElement) document.activeElement.blur(); toast('Dados salvos. O site e o app já mostram a versão nova.'); render(); }
  catch (er) { b.disabled = false; toast(erroAmigavel(er)); }
}
function formEdicao(e) {
  const c = e.cores || {};
  return `<div class="ec-editar"><form class="form" data-editar="${esc(e.id)}">
    <div class="ce-campos">
      <div class="campo"><label>Nome</label><input name="nome" value="${esc(e.nome || '')}" maxlength="80" required></div>
      <div class="campo"><label>Nome curto</label><input name="nomeCurto" value="${esc(e.nomeCurto || '')}" maxlength="30"></div>
      <div class="campo"><label>Cidade</label><input name="cidade" value="${esc(e.cidade || '')}" maxlength="60"></div>
      <div class="campo"><label>UF</label><input name="uf" value="${esc(e.uf || '')}" maxlength="2"></div>
      <div class="campo" style="grid-column:1/-1"><label>Endereço</label><input name="endereco" value="${esc(e.endereco || '')}" maxlength="140"></div>
      <div class="campo"><label>Instagram</label><input name="instagram" value="${esc(e.instagram || '')}" maxlength="60" placeholder="@escola"></div>
      <div class="campo"><label>Cores (principal · destaque · botão)</label><div class="ce-cores"><input type="color" name="corNavy" value="${esc(c.navy || '#1E2A78')}" aria-label="Cor principal"><input type="color" name="corTeal" value="${esc(c.teal || '#389E92')}" aria-label="Cor de destaque"><input type="color" name="corVerde" value="${esc(c.verde || '#FF7A1A')}" aria-label="Cor dos botões"></div></div>
    </div>
    <div class="acoes"><button type="submit" class="bt bt-laranja bt-sm"><i class="fas fa-check"></i> Salvar dados</button><button type="button" class="bt bt-branco bt-sm" data-fechar-edicao="${esc(e.id)}">Cancelar</button></div>
  </form></div>`;
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
  if (e.status === 'ativa' && a.status === 'ok') bts.push(`<a class="bt bt-branco bt-sm" href="${esc(`${APP_URL}/login.html?escola=${encodeURIComponent(e.id)}`)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Abrir o app da escola</a>`);
  bts.push(`<button type="button" class="bt bt-branco bt-sm" data-numeros="${esc(e.id)}"><i class="fas fa-chart-simple"></i> Números</button>`);
  bts.push(`<button type="button" class="bt bt-branco bt-sm" data-editar="${esc(e.id)}"><i class="fas fa-pen"></i> Editar dados</button>`);
  if (e.status === 'ativa') bts.push(`<button type="button" class="bt bt-branco bt-sm perigo" data-pausar="${esc(e.id)}"><i class="fas fa-pause"></i> Pausar</button>`);
  const n = numeros.get(e.id);
  const blocoNumeros = !n ? '' : n.carregando ? '<div class="ec-numeros"><span class="sub"><i class="fas fa-spinner fa-spin"></i> Contando…</span></div>'
    : `<div class="ec-numeros">${[['Cadastros', n.alunos], ['Ativos', n.ativos], ['Núcleos', n.nucleos], ['Presenças', n.presencas], ['Posts na Rede', n.posts]].map(([r, v]) => `<div><b class="mono">${numeroHTML(v)}</b><span>${r}</span></div>`).join('')}</div>`;
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
    ${blocoNumeros}
    ${editando.has(e.id) ? formEdicao(e) : ''}
    <div class="ec-acoes">${bts.join('')}</div>
  </article>`;
}

async function acao(ev) {
  const b = ev.target.closest('button'); if (!b || b.disabled) return;
  if (b.dataset.numeros) { carregarNumeros(b.dataset.numeros); return; }
  if (b.dataset.editar) { editando.add(b.dataset.editar); render(); return; }
  if (b.dataset.fecharEdicao) { editando.delete(b.dataset.fecharEdicao); render(); return; }
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
      await recuperarSenha(b.dataset.senha, 'https://atletapay.com.br/painel'); // o dono volta para o painel da escola dele
      toast('Link de nova senha enviado ao dono.');
      b.disabled = false;
    } else if (b.dataset.copiar) {
      await navigator.clipboard.writeText(b.dataset.copiar);
      toast('Link de inscrição copiado.');
    }
  } catch (er) { console.error(er); b.disabled = false; toast(erroAmigavel(er)); }
}
