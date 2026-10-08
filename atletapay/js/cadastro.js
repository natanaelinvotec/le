/* cadastro.js — assistente de criação da escola.

Etapas: 1 Conta · 2 Escola · 3 Plano · 4 Logo e fotos · 5 Modelo.
O rascunho fica em sessionStorage (recarregar não perde nada). A escola é
gravada em escolas/{slug} já na etapa 2 (status 'rascunho') — é isso que
libera o upload das fotos para escolas/{slug}/... no Storage — e vira 'fila'
na etapa 5. escolasSlugs/{slug} garante que dois donos não peguem o mesmo
subdomínio. donos/{uid} aponta a conta para a escola. */
import { db, doc, getDoc, setDoc, updateDoc, writeBatch, observarSessao, criarConta, entrar, recuperarSenha, sair, erroAmigavel, comprimir, enviarImagem } from './firebase.js?v=20261010';
import { PLANO, MODALIDADES, modalidadePorId, MODELOS, FOTOS, TRIAL_DIAS, brl, slugDe, slugValido, RESERVADOS, minimoDe, fotosFaltando, juntarFotos, contagemFotos } from './catalogo.js?v=20261010';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
let toastTimer = null;
function toast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3000); }
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
const ETAPAS = [['conta', 'Sua conta'], ['escola', 'A escola'], ['plano', 'Plano'], ['fotos', 'Logo e fotos'], ['modelo', 'Modelo do site']];

// ---------- rascunho ----------
const CHAVE = 'atletapay.cadastro';
let r = { etapa: 0, plano: PLANO.id, fotos: {} };
try { r = { ...r, ...JSON.parse(sessionStorage.getItem(CHAVE) || '{}') }; } catch (e) { /* ok */ }
const salvarRascunho = () => { try { sessionStorage.setItem(CHAVE, JSON.stringify(r)); } catch (e) { /* ok */ } };
let usuario = null; let escolaDoc = null;

observarSessao(async (u) => {
  usuario = u;
  if (u) {
    // Já tem escola? Vai para o painel. Tem rascunho gravado? Retoma.
    let conferido = false; escolaDoc = null;
    try {
      const d = await getDoc(doc(db, 'donos', u.uid)); conferido = true;
      if (d.exists() && d.data().escolaId) {
        const e = await getDoc(doc(db, 'escolas', d.data().escolaId));
        if (e.exists()) {
          escolaDoc = { id: e.id, ...e.data() };
          if (escolaDoc.status !== 'rascunho') { location.replace('painel.html'); return; }
          r.escolaId = escolaDoc.id; r.escola = { nome: escolaDoc.nome, nomeCurto: escolaDoc.nomeCurto, modalidade: escolaDoc.modalidade, cidade: escolaDoc.cidade, uf: escolaDoc.uf, slug: escolaDoc.slug, endereco: escolaDoc.endereco || '', responsavel: escolaDoc.responsavel || null, instagram: escolaDoc.instagram || '' };
          r.plano = escolaDoc.plano || r.plano; r.fotos = escolaDoc.fotos || r.fotos; r.modelo = escolaDoc.modelo || r.modelo;
          if (r.etapa < 2) r.etapa = 2;
        }
      }
    } catch (e) { console.warn(e); }
    // Rascunho guardado no navegador de OUTRA conta (trocou de login no meio do cadastro):
    // a escola não é desta pessoa, então volta para a etapa "A escola" sem ela.
    if (conferido && r.escolaId && (!escolaDoc || escolaDoc.id !== r.escolaId)) {
      r.escolaId = null; r.escola = null; r.fotos = {}; r.modelo = null; if (r.etapa > 1) r.etapa = 1;
    }
    if (r.etapa < 1) r.etapa = 1;
  } else if (r.etapa > 0 && !r.escolaId) r.etapa = 0;
  salvarRascunho(); render();
});

function render() {
  el('etapas').innerHTML = ETAPAS.map(([k, t], i) => `<li class="etapa ${i === r.etapa ? 'atual' : i < r.etapa ? 'feita' : ''}"><i>${i < r.etapa ? '✓' : i + 1}</i><span>${t}</span></li>`).join('');
  el('progresso').style.width = `${((r.etapa + 1) / ETAPAS.length) * 100}%`;
  const passos = [passoConta, passoEscola, passoPlano, passoFotos, passoModelo];
  passos[r.etapa]();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
const ir = (n) => { r.etapa = Math.max(0, Math.min(ETAPAS.length - 1, n)); salvarRascunho(); render(); };
const erro = (msg) => { const c = el('erro'); if (c) { c.textContent = msg; c.hidden = !msg; } };

/* ---------- 1 · conta ---------- */
function passoConta() {
  if (usuario) {
    el('passo').innerHTML = `<span class="eyebrow">Etapa 1 de 5</span><h2 style="margin-top:10px">Você já está conectado</h2><p class="sub" style="margin-top:8px">Entrando como <b>${esc(usuario.email || usuario.displayName || '')}</b>.</p><div class="acoes" style="margin-top:20px"><button type="button" class="bt bt-laranja" id="btSeguir">Continuar <i class="fas fa-arrow-right"></i></button><button type="button" class="bt bt-branco" id="btTrocar">Trocar de conta</button></div>`;
    el('btSeguir').addEventListener('click', () => ir(1));
    el('btTrocar').addEventListener('click', async () => { try { sessionStorage.removeItem(CHAVE); } catch (e) { /* ok */ } await sair(); r = { etapa: 0, plano: r.plano, fotos: {} }; render(); });
    return;
  }
  let modo = 'criar';
  const desenhar = () => {
    el('passo').innerHTML = `
      <span class="eyebrow">Etapa 1 de 5</span>
      <h2 style="margin-top:10px">${modo === 'criar' ? 'Crie a sua conta' : 'Entre na sua conta'}</h2>
      <p class="sub" style="margin-top:8px">${modo === 'criar' ? 'É você quem vai administrar a escola. Depois dá para convidar professores.' : 'Use o e-mail e a senha da AtletaPay.'}</p>
      <form class="form" id="f" autocomplete="on">
        <div class="erro-caixa" id="erro" hidden></div>
        ${modo === 'criar' ? `<div class="linha"><div class="campo"><label for="nome">Seu nome</label><input id="nome" name="name" required maxlength="80" autocomplete="name" value="${esc(r.conta && r.conta.nome || '')}"></div><div class="campo"><label for="celular">Celular / WhatsApp</label><input id="celular" name="tel" inputmode="tel" required maxlength="20" autocomplete="tel" placeholder="(67) 99999-0000" value="${esc(r.conta && r.conta.celular || '')}"></div></div>` : ''}
        <div class="linha"><div class="campo"><label for="email">E-mail</label><input id="email" name="email" type="email" required autocomplete="email" value="${esc(r.conta && r.conta.email || '')}"></div><div class="campo"><label for="senha">Senha</label><input id="senha" name="password" type="password" required minlength="8" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}"><small class="ajuda">${modo === 'criar' ? 'Mínimo de 8 caracteres.' : '<a href="#" id="esqueci">Esqueci minha senha</a>'}</small></div></div>
        ${modo === 'criar' ? `<label style="display:flex;gap:10px;align-items:flex-start;font-size:.88rem;color:var(--texto-2)"><input type="checkbox" id="aceite" required style="margin-top:4px;width:18px;height:18px"> <span>Li e aceito os <a href="privacidade.html" target="_blank">termos de uso e a política de privacidade</a>. A AtletaPay trata os dados dos alunos como operadora, por conta da escola (LGPD).</span></label>` : ''}
        <div class="acoes"><button type="submit" class="bt bt-laranja" id="btOk">${modo === 'criar' ? 'Criar conta e continuar' : 'Entrar'} <i class="fas fa-arrow-right"></i></button><span class="espaco"></span><button type="button" class="bt bt-branco" id="btModo">${modo === 'criar' ? 'Já tenho conta' : 'Criar conta nova'}</button></div>
      </form>`;
    el('btModo').addEventListener('click', () => { modo = modo === 'criar' ? 'entrar' : 'criar'; desenhar(); });
    const esq = el('esqueci'); if (esq) esq.addEventListener('click', async (e) => { e.preventDefault(); const em = el('email').value.trim(); if (!em) { erro('Digite o e-mail para receber o link de redefinição.'); return; } try { await recuperarSenha(em); toast('Enviamos o link para o seu e-mail.'); } catch (er) { erro(erroAmigavel(er)); } });
    el('f').addEventListener('submit', async (e) => {
      e.preventDefault(); erro(''); const bt = el('btOk'); bt.disabled = true;
      try {
        if (modo === 'criar') {
          r.conta = { nome: el('nome').value.trim(), celular: el('celular').value.trim(), email: el('email').value.trim().toLowerCase() };
          const u = await criarConta(r.conta.nome, r.conta.email, el('senha').value);
          await setDoc(doc(db, 'donos', u.uid), { nome: r.conta.nome, email: r.conta.email, celular: r.conta.celular, escolaId: null, criadoEm: new Date().toISOString(), origem: 'atletapay.com.br' });
          toast('Conta criada! Enviamos um e-mail de confirmação.');
        } else {
          await entrar(el('email').value, el('senha').value);
          r.conta = { ...(r.conta || {}), email: el('email').value.trim().toLowerCase() };
        }
        salvarRascunho(); // observarSessao decide a etapa (escola existente → painel)
      } catch (er) { console.error(er); erro(erroAmigavel(er)); bt.disabled = false; }
    });
  };
  desenhar();
}

/* ---------- 2 · escola ---------- */
function passoEscola() {
  const e = r.escola || {}; const travado = !!r.escolaId;
  el('passo').innerHTML = `
    <span class="eyebrow">Etapa 2 de 5</span>
    <h2 style="margin-top:10px">Conte sobre a escola</h2>
    <p class="sub" style="margin-top:8px">${usuario && usuario.displayName ? `Olá, ${esc(usuario.displayName.split(' ')[0])}. ` : ''}Esses dados viram o nome do site, do app e da carteirinha. Dá para ajustar depois.</p>
    <form class="form" id="f">
      <div class="erro-caixa" id="erro" hidden></div>
      <div class="linha">
        <div class="campo" style="grid-column:1/-1"><label for="eNome">Nome da escola, academia ou centro de treinamento</label><input id="eNome" required maxlength="80" placeholder="Ex.: CT Dragão de Ferro Jiu-Jitsu" value="${esc(e.nome || '')}"></div>
        <div class="campo"><label for="eCurto">Nome curto (aparece no app)</label><input id="eCurto" required maxlength="30" placeholder="Ex.: Dragão de Ferro" value="${esc(e.nomeCurto || '')}"></div>
        <div class="campo"><label for="eCidade">Cidade</label><input id="eCidade" required maxlength="60" value="${esc(e.cidade || '')}"></div>
        <div class="campo"><label for="eUf">Estado</label><select id="eUf" required><option value="">UF</option>${UFS.map((u) => `<option ${u === (e.uf || 'MS') ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
        <div class="campo" style="grid-column:1/-1"><label for="eEndereco">Endereço do local de treino</label><input id="eEndereco" required maxlength="140" autocomplete="street-address" placeholder="Rua, número, bairro" value="${esc(e.endereco || '')}"><small class="ajuda">Vai para o site com o botão "Como chegar".</small></div>
        <div class="campo"><label for="eRespNome">Responsável técnico</label><input id="eRespNome" required maxlength="80" autocomplete="name" value="${esc((e.responsavel && e.responsavel.nome) || (usuario && usuario.displayName) || (r.conta && r.conta.nome) || '')}"></div>
        <div class="campo"><label for="eRespGrad">Graduação / título do responsável</label><input id="eRespGrad" required maxlength="60" placeholder="Ex.: Faixa-preta 3º grau" value="${esc((e.responsavel && e.responsavel.graduacao) || '')}"></div>
        <div class="campo"><label for="eInsta">Instagram da academia (opcional)</label><input id="eInsta" maxlength="60" placeholder="@suaacademia" value="${esc(e.instagram || '')}"></div>
        <div class="campo" style="grid-column:1/-1"><label>Arte marcial</label><div class="opcoes" id="modalidades">${MODALIDADES.map((m) => `<button type="button" class="opcao" data-mod="${m.id}" aria-pressed="${m.id === (e.modalidade || 'capoeira')}"><b>${esc(m.nome)}</b><small>${esc(m.lider)} · ${m.graduacoes.length} ${esc(m.peca)}s</small><span class="grads">${m.graduacoes.map(() => '<i></i>').join('')}</span></button>`).join('')}</div><small class="ajuda">A escada de graduações vem pronta para a modalidade e pode ser editada no painel.</small></div>
        <div class="campo" style="grid-column:1/-1"><label for="eSlug">Endereço da escola na AtletaPay</label><div class="prefixo prefixo-antes"><span>atletapay.com.br/</span><input id="eSlug" required maxlength="30" ${travado ? 'readonly' : ''} value="${esc(e.slug || '')}" placeholder="dragaodeferro"></div><small class="ajuda" id="slugAjuda">${travado ? 'Endereço reservado para a sua escola.' : 'Letras, números e hífen. Verificamos a disponibilidade enquanto você digita. Quer usar um domínio próprio (www.suaescola.com.br)? Depois da ativação, fale com o suporte da AtletaPay.'}</small></div>
      </div>
      <div class="acoes"><button type="button" class="bt bt-branco" id="btVoltar"><i class="fas fa-arrow-left"></i> Voltar</button><span class="espaco"></span><button type="submit" class="bt bt-laranja" id="btOk">Continuar <i class="fas fa-arrow-right"></i></button></div>
    </form>`;
  let modalidade = e.modalidade || 'capoeira'; let slugOk = travado; let timer = null;
  el('modalidades').addEventListener('click', (ev) => { const b = ev.target.closest('[data-mod]'); if (!b) return; modalidade = b.dataset.mod; el('modalidades').querySelectorAll('.opcao').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  const ajuda = el('slugAjuda'); const inp = el('eSlug');
  const conferir = async () => {
    const s = slugDe(inp.value); if (inp.value !== s) inp.value = s;
    slugOk = false;
    if (!s) { ajuda.className = 'ajuda'; ajuda.textContent = 'Letras, números e hífen.'; return; }
    if (!slugValido(s)) { ajuda.className = 'ajuda erro'; ajuda.textContent = RESERVADOS.includes(s) ? 'Esse endereço é reservado.' : 'Use de 3 a 30 caracteres, começando e terminando com letra ou número.'; return; }
    ajuda.className = 'ajuda'; ajuda.textContent = 'Verificando…';
    try { const d = await getDoc(doc(db, 'escolasSlugs', s)); if (d.exists()) { ajuda.className = 'ajuda erro'; ajuda.textContent = `atletapay.com.br/${s} já está em uso.`; } else { slugOk = true; ajuda.className = 'ajuda ok'; ajuda.textContent = `atletapay.com.br/${s} está disponível!`; } } catch (er) { ajuda.className = 'ajuda erro'; ajuda.textContent = 'Não deu para verificar agora.'; }
  };
  if (!travado) {
    inp.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(conferir, 450); });
    el('eNome').addEventListener('input', () => { if (!inp.dataset.tocado) { inp.value = slugDe(el('eNome').value); clearTimeout(timer); timer = setTimeout(conferir, 450); } });
    inp.addEventListener('keydown', () => { inp.dataset.tocado = '1'; });
    if (inp.value) conferir();
  }
  el('btVoltar').addEventListener('click', () => ir(0));
  el('f').addEventListener('submit', async (ev) => {
    ev.preventDefault(); erro(''); const bt = el('btOk'); bt.disabled = true;
    const limpo = (id, max) => el(id).value.replace(/[<>]/g, '').trim().slice(0, max);
    const insta = limpo('eInsta', 60).replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@?/, '').replace(/[^\w.]/g, '');
    const dados = { nome: limpo('eNome', 80), nomeCurto: limpo('eCurto', 30), cidade: limpo('eCidade', 60), uf: el('eUf').value, modalidade, slug: slugDe(inp.value),
      endereco: limpo('eEndereco', 140), responsavel: { nome: limpo('eRespNome', 80), graduacao: limpo('eRespGrad', 60) }, instagram: insta ? `@${insta}` : '' };
    try {
      if (!usuario) throw new Error('Entre na sua conta para continuar.');
      if (!travado) {
        if (!slugOk) { await conferir(); if (!slugOk) throw new Error('Escolha um endereço disponível.'); }
        const mod = modalidadePorId(modalidade); const agora = new Date().toISOString();
        const b = writeBatch(db);
        b.set(doc(db, 'escolasSlugs', dados.slug), { escolaId: dados.slug, donoUid: usuario.uid, criadoEm: agora });
        b.set(doc(db, 'escolas', dados.slug), { ...dados, donoUid: usuario.uid, donoNome: usuario.displayName || (r.conta && r.conta.nome) || '', donoEmail: usuario.email || '', donoCelular: (r.conta && r.conta.celular) || '', status: 'rascunho', plano: PLANO.id, graduacoes: mod.graduacoes, lider: mod.lider, pecaGraduacao: mod.peca, fotos: {}, modelo: null, criadoEm: agora, atualizadoEm: agora, origem: 'atletapay.com.br' });
        b.set(doc(db, 'donos', usuario.uid), { escolaId: dados.slug, atualizadoEm: agora }, { merge: true });
        await b.commit();
        r.escolaId = dados.slug;
      } else {
        await updateDoc(doc(db, 'escolas', r.escolaId), { nome: dados.nome, nomeCurto: dados.nomeCurto, cidade: dados.cidade, uf: dados.uf, endereco: dados.endereco, responsavel: dados.responsavel, instagram: dados.instagram, modalidade, graduacoes: modalidadePorId(modalidade).graduacoes, lider: modalidadePorId(modalidade).lider, pecaGraduacao: modalidadePorId(modalidade).peca, atualizadoEm: new Date().toISOString() });
      }
      r.escola = dados; ir(2);
    } catch (er) { console.error(er); erro(/already-exists|ALREADY_EXISTS/.test(String(er.code || er.message)) ? 'Esse endereço acabou de ser reservado por outra escola. Escolha outro.' : erroAmigavel(er)); bt.disabled = false; }
  });
}

/* ---------- 3 · plano ---------- */
// Plano único: não há escolha, só a confirmação do que está incluso e de como o valor cresce.
function passoPlano() {
  el('passo').innerHTML = `
    <span class="eyebrow">Etapa 3 de 5</span>
    <h2 style="margin-top:10px">Seu plano</h2>
    <p class="sub" style="margin-top:8px">${TRIAL_DIAS} dias grátis, sem cartão. Você só cadastra o pagamento quando a escola estiver no ar e o teste acabar.</p>
    <div class="form"><div class="erro-caixa" id="erro" hidden></div>
      <div class="plano-cadastro">
        <div class="topo-pc"><b>${esc(PLANO.nome)}</b><span class="preco">${brl(PLANO.mensal)}<small>por mês</small></span></div>
        <div class="regra">Inclui até <b>${PLANO.inclusos} alunos ativos</b>. Acima disso, <b>+ ${brl(PLANO.porAlunoExtra)} por aluno ativo</b>, contado automaticamente todo mês. Aluno inativo não conta.</div>
        <ul>${PLANO.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>
      <div class="acoes"><button type="button" class="bt bt-branco" id="btVoltar"><i class="fas fa-arrow-left"></i> Voltar</button><span class="espaco"></span><button type="button" class="bt bt-laranja" id="btOk">Continuar <i class="fas fa-arrow-right"></i></button></div>
    </div>`;
  el('btVoltar').addEventListener('click', () => ir(1));
  el('btOk').addEventListener('click', async (ev) => {
    const bt = ev.currentTarget; bt.disabled = true;
    try { r.plano = PLANO.id; await updateDoc(doc(db, 'escolas', r.escolaId), { plano: PLANO.id, atualizadoEm: new Date().toISOString() }); ir(3); } catch (er) { erro(erroAmigavel(er)); bt.disabled = false; }
  });
}

/* ---------- 4 · fotos ---------- */
function passoFotos() {
  const lista = () => FOTOS.map((f) => { const tem = (r.fotos[f.id] || []).length; const ok = tem >= Math.max(1, minimoDe(f)); const cheio = f.max > 1 && tem >= f.max; return `
    <div class="foto-item${ok ? ' ok' : ''}${tem && !ok ? ' parcial' : ''}" id="fi_${f.id}">
      <div class="previa">${(r.fotos[f.id] || []).slice(-3).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div>
      <div><b>${esc(f.nome)}${f.obrigatoria ? ' <span style="color:var(--laranja)">*</span>' : ''}</b><small>${esc(f.dica)}${tem || minimoDe(f) > 1 ? ` <strong style="color:${ok ? '#0B8F5B' : '#C2410C'}">${esc(contagemFotos(f, tem))}</strong>` : ''}</small><small class="progresso-foto" hidden></small></div>
      <div class="foto-bts"><label class="bt bt-branco bt-sm" style="position:relative;overflow:hidden${cheio ? ';opacity:.5;pointer-events:none' : ''}"><i class="fas fa-upload"></i> ${f.max > 1 ? (tem ? 'Adicionar' : 'Enviar') : (tem ? 'Trocar' : 'Enviar')}<input type="file" accept="image/*" ${f.max > 1 ? 'multiple' : ''} data-foto="${f.id}" ${cheio ? 'disabled' : ''}></label>${f.max > 1 && tem ? `<button type="button" class="bt bt-branco bt-sm" data-limpar="${f.id}" title="Apagar todas e enviar de novo"><i class="fas fa-rotate-left"></i> Recomeçar</button>` : ''}</div>
    </div>`; }).join('');
  el('passo').innerHTML = `
    <span class="eyebrow">Etapa 4 de 5</span>
    <h2 style="margin-top:10px">Logo e fotos</h2>
    <p class="sub" style="margin-top:8px">Com elas montamos o site, o ícone do app, a capa da Rede e a página do responsável. Precisamos do logo, da sua foto e de pelo menos 10 fotos de membros, treinos e eventos. Pode completar depois pelo painel.</p>
    <div class="form"><div class="erro-caixa" id="erro" hidden></div><div class="fotos" id="fotos">${lista()}</div>
      <div class="acoes"><button type="button" class="bt bt-branco" id="btVoltar"><i class="fas fa-arrow-left"></i> Voltar</button><span class="espaco"></span><button type="button" class="bt bt-branco" id="btPular">Enviar depois</button><button type="button" class="bt bt-laranja" id="btOk">Continuar <i class="fas fa-arrow-right"></i></button></div>
    </div>`;
  el('fotos').addEventListener('change', async (ev) => {
    const inp = ev.target.closest('input[type=file]'); if (!inp || !inp.files.length) return;
    const id = inp.dataset.foto; const def = FOTOS.find((x) => x.id === id);
    const espaco = def.max > 1 ? def.max - (r.fotos[id] || []).length : 1;
    const arquivos = Array.from(inp.files).filter((f) => /^image\//.test(f.type)).slice(0, Math.max(0, espaco));
    const item = el(`fi_${id}`); const prog = item.querySelector('.progresso-foto'); item.style.opacity = '.7'; erro('');
    try {
      const urls = [];
      for (let i = 0; i < arquivos.length; i++) {
        prog.hidden = false; prog.textContent = `Enviando ${i + 1} de ${arquivos.length}…`;
        const dataUrl = await comprimir(arquivos[i], id === 'logo' ? 1024 : 1600, id === 'logo' ? 1 : 0.86);
        const ext = /png/.test(dataUrl.slice(0, 20)) ? 'png' : 'jpg';
        urls.push(await enviarImagem(`onboarding/${usuario.uid}/${r.escolaId}/${id}-${Date.now().toString(36)}-${i + 1}.${ext}`, dataUrl));
      }
      if (urls.length) { r.fotos[id] = juntarFotos(def, r.fotos[id], urls); await updateDoc(doc(db, 'escolas', r.escolaId), { [`fotos.${id}`]: r.fotos[id], atualizadoEm: new Date().toISOString() }); salvarRascunho(); el('fotos').innerHTML = lista(); toast(`${def.nome}: ${urls.length} enviada${urls.length > 1 ? 's' : ''}!`); }
      if (Array.from(inp.files).length > arquivos.length) toast(`Limite de ${def.max} fotos: as demais ficaram de fora.`);
    } catch (er) { console.error(er); erro(erroAmigavel(er)); item.style.opacity = '1'; prog.hidden = true; }
  });
  el('fotos').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-limpar]'); if (!b) return;
    if (!confirm('Apagar todas as fotos desse item e enviar de novo?')) return;
    try { r.fotos[b.dataset.limpar] = []; await updateDoc(doc(db, 'escolas', r.escolaId), { [`fotos.${b.dataset.limpar}`]: [], atualizadoEm: new Date().toISOString() }); salvarRascunho(); el('fotos').innerHTML = lista(); } catch (er) { erro(erroAmigavel(er)); }
  });
  el('btVoltar').addEventListener('click', () => ir(2));
  el('btPular').addEventListener('click', () => ir(4));
  el('btOk').addEventListener('click', () => { const faltam = fotosFaltando(r.fotos); if (faltam.length) { erro(`Para o site ficar pronto falta: ${faltam.map((f) => `${f.nome}${minimoDe(f) > 1 ? ` (${(r.fotos[f.id] || []).length} de ${minimoDe(f)})` : ''}`).join(' · ')}. Pode completar depois pelo painel, clicando em "Enviar depois".`); return; } ir(4); });
}

/* ---------- 5 · modelo ---------- */
function passoModelo() {
  const mod = modalidadePorId((r.escola || {}).modalidade);
  const sugerido = r.modelo || ({ capoeira: 'roda', jiujitsu: 'tatame', judo: 'tatame', karate: 'tatame', taekwondo: 'dojo', kungfu: 'dojo', muaythai: 'arena', boxe: 'arena', mma: 'arena' }[mod.id] || 'roda');
  let modelo = sugerido;
  const previa = (m) => `<div style="border-radius:12px;overflow:hidden;border:1px solid var(--borda);background:${m.cores[0]};aspect-ratio:16/10;display:grid;grid-template-rows:auto 1fr auto;padding:8px;gap:6px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="width:28px;height:6px;border-radius:3px;background:${m.cores[1]}"></span><span style="width:40px;height:10px;border-radius:5px;background:${m.cores[2]}"></span></div><div style="display:grid;grid-template-columns:1.2fr 1fr;gap:6px"><div style="border-radius:8px;background:${m.cores[1]};opacity:.9"></div><div style="display:grid;gap:4px"><span style="height:6px;border-radius:3px;background:${m.cores[1]};opacity:.5"></span><span style="height:6px;border-radius:3px;background:${m.cores[1]};opacity:.35;width:70%"></span><span style="height:6px;border-radius:3px;background:${m.cores[2]};width:40%"></span></div></div><div style="height:6px;border-radius:3px;background:repeating-linear-gradient(-45deg,${m.cores[1]} 0 6px,${m.cores[2]} 6px 12px)"></div></div>`;
  el('passo').innerHTML = `
    <span class="eyebrow">Etapa 5 de 5</span>
    <h2 style="margin-top:10px">Escolha o modelo do site</h2>
    <p class="sub" style="margin-top:8px">Sugerimos o <b>${esc((MODELOS.find((m) => m.id === sugerido) || MODELOS[0]).nome)}</b> para ${esc(mod.nome.toLowerCase())}. Todos têm as mesmas seções; muda a cara. Troque quando quiser no painel.</p>
    <div class="form"><div class="erro-caixa" id="erro" hidden></div>
      <div class="opcoes" id="modelos" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">${MODELOS.map((m) => `<button type="button" class="opcao" data-modelo="${m.id}" aria-pressed="${m.id === modelo}">${previa(m)}<b>${esc(m.nome)}</b><small>${esc(m.para)}</small><small>${esc(m.resumo)}</small></button>`).join('')}</div>
      <div class="acoes"><button type="button" class="bt bt-branco" id="btVoltar"><i class="fas fa-arrow-left"></i> Voltar</button><span class="espaco"></span><button type="button" class="bt bt-laranja" id="btOk"><i class="fas fa-rocket"></i> Criar a minha escola</button></div>
    </div>`;
  el('modelos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-modelo]'); if (!b) return; modelo = b.dataset.modelo; el('modelos').querySelectorAll('.opcao').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
  el('btVoltar').addEventListener('click', () => ir(3));
  el('btOk').addEventListener('click', async () => {
    const bt = el('btOk'); bt.disabled = true; erro('');
    try {
      const agora = new Date(); const fimTrial = new Date(agora.getTime() + TRIAL_DIAS * 86400000);
      await updateDoc(doc(db, 'escolas', r.escolaId), { modelo, status: 'fila', enviadoEm: agora.toISOString(), trialAte: fimTrial.toISOString().slice(0, 10), atualizadoEm: agora.toISOString() });
      try { sessionStorage.removeItem(CHAVE); } catch (e) { /* ok */ }
      location.replace('painel.html?nova=1');
    } catch (er) { console.error(er); erro(erroAmigavel(er)); bt.disabled = false; }
  });
}

// Sair (link discreto no rodapé do lado esquerdo, para trocar de conta)
document.querySelector('.lado .nota').insertAdjacentHTML('beforeend', ' <a href="#" id="sairLink" style="color:var(--texto-inv-2)">Trocar de conta</a>');
el('sairLink').addEventListener('click', async (e) => { e.preventDefault(); try { sessionStorage.removeItem(CHAVE); } catch (er) { /* ok */ } await sair(); location.reload(); });
