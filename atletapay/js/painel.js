/* painel.js — painel do dono da escola (atletapay.com.br/painel.html).
Mostra a situação (rascunho → fila → ativa), o checklist, os dados e o plano;
deixa trocar o modelo e completar fotos. Sem escola: manda para o cadastro. */
import { db, doc, getDoc, updateDoc, onSnapshot, observarSessao, entrar, recuperarSenha, sair, erroAmigavel, comprimir, enviarImagem } from './firebase.js?v=20261002';
import { porId, modalidadePorId, MODELOS, modeloPorId, FOTOS, brl, minimoDe, fotosFaltando, juntarFotos, contagemFotos } from './catalogo.js?v=20261007';

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (id) => document.getElementById(id);
const pagina = el('pagina');
let toastTimer = null;
function toast(msg) { const t = el('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3000); }
// Onde o app das escolas está publicado hoje (mesmo valor de master.js). Vira atletapay.com.br/<escola> depois.
const APP_URL = 'https://capoeira-liberdade.web.app';
const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
let usuario = null; let escola = null; let desligar = null;

el('btSair').addEventListener('click', async () => { await sair(); location.href = 'index.html'; });

observarSessao(async (u) => {
  usuario = u;
  if (!u) { el('quem').textContent = ''; el('btSair').hidden = true; renderLogin(); return; }
  el('btSair').hidden = false; el('quem').textContent = u.email || '';
  try {
    const d = await getDoc(doc(db, 'donos', u.uid));
    const escolaId = d.exists() ? d.data().escolaId : null;
    if (!escolaId) { location.replace('cadastro.html'); return; }
    if (desligar) desligar();
    desligar = onSnapshot(doc(db, 'escolas', escolaId), (s) => { if (!s.exists()) { location.replace('cadastro.html'); return; } escola = { id: s.id, ...s.data() }; if (escola.status === 'rascunho') { location.replace('cadastro.html'); return; } render(); }, (e) => { console.error(e); pagina.innerHTML = `<div class="wrap" style="padding:60px 0"><div class="erro-caixa">Sem acesso à escola. ${esc(erroAmigavel(e))}</div></div>`; });
  } catch (e) { console.error(e); pagina.innerHTML = `<div class="wrap" style="padding:60px 0"><div class="erro-caixa">${esc(erroAmigavel(e))}</div></div>`; }
});

function renderLogin() {
  pagina.innerHTML = `<div class="wrap" style="max-width:460px;padding:60px 16px"><span class="eyebrow">Minha escola</span><h2 style="margin-top:10px">Entrar</h2><p class="sub" style="margin-top:8px">Use a conta criada no cadastro da AtletaPay.</p>
    <form class="form" id="f"><div class="erro-caixa" id="erro" hidden></div><div class="campo"><label for="email">E-mail</label><input id="email" type="email" required autocomplete="email"></div><div class="campo"><label for="senha">Senha</label><input id="senha" type="password" required autocomplete="current-password"><small class="ajuda"><a href="#" id="esqueci">Esqueci minha senha</a></small></div><div class="acoes"><button type="submit" class="bt bt-laranja">Entrar <i class="fas fa-arrow-right"></i></button><span class="espaco"></span><a class="bt bt-branco" href="cadastro.html">Criar escola</a></div></form></div>`;
  el('esqueci').addEventListener('click', async (e) => { e.preventDefault(); const em = el('email').value.trim(); if (!em) { el('erro').hidden = false; el('erro').textContent = 'Digite o e-mail.'; return; } try { await recuperarSenha(em); toast('Enviamos o link para o seu e-mail.'); } catch (er) { el('erro').hidden = false; el('erro').textContent = erroAmigavel(er); } });
  el('f').addEventListener('submit', async (e) => { e.preventDefault(); try { await entrar(el('email').value, el('senha').value); } catch (er) { el('erro').hidden = false; el('erro').textContent = erroAmigavel(er); } });
}

function render() {
  const e = escola; const plano = porId(e.plano); const mod = modalidadePorId(e.modalidade); const modelo = e.modelo ? modeloPorId(e.modelo) : null;
  const faltando = fotosFaltando(e.fotos);
  const obrigOk = !faltando.length;
  const totalFotos = FOTOS.reduce((s, f) => s + ((e.fotos && e.fotos[f.id]) || []).length, 0);
  const ativa = e.status === 'ativa';
  const nova = new URLSearchParams(location.search).get('nova') === '1';
  const url = e.dominio ? `https://${e.dominio}` : `https://atletapay.com.br/${e.slug}`; // domínio próprio: ligado pelo suporte (campo dominio, só o Admin grava)
  const checks = [
    ['Conta criada e escola cadastrada', true],
    ['Plano escolhido', !!e.plano],
    [obrigOk ? `Logo, foto do responsável e galeria completos (${totalFotos} fotos)` : `Fotos: falta ${faltando.map((f) => (minimoDe(f) > 1 ? `${f.nome.toLowerCase()} (${((e.fotos && e.fotos[f.id]) || []).length} de ${minimoDe(f)})` : f.nome.toLowerCase())).join(', ')}`, obrigOk],
    ['Modelo do site escolhido', !!e.modelo],
    ['Ativação pela AtletaPay (site, app e painel no ar)', ativa],
    ['Pagamento cadastrado (depois do período de teste)', e.assinatura && e.assinatura.status === 'ativa'],
  ];
  pagina.innerHTML = `
    <section class="cab-painel"><div class="wrap"><div><span class="eyebrow" style="color:var(--laranja-claro)">${esc(mod.nome)} · ${esc(e.cidade || '')}${e.uf ? ` / ${esc(e.uf)}` : ''}</span><h1 style="font-size:clamp(1.6rem,3.6vw,2.6rem);margin-top:8px">${esc(e.nome)}</h1><p class="sub" style="margin-top:8px;color:var(--texto-inv-2)">${esc(url)}</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${ativa && e.ativacao && e.ativacao.status === 'ok' ? `<a class="bt bt-laranja" href="${APP_URL}/login.html">Abrir o painel da escola <i class="fas fa-arrow-up-right-from-square"></i></a>` : '<span class="bt bt-vidro" style="cursor:default"><i class="fas fa-hourglass-half"></i> Ativação em andamento</span>'}</div></div></section>
    <div class="wrap">
      <div class="cartoes">
        ${nova ? '<div class="ok-caixa" style="grid-column:1/-1"><i class="fas fa-check"></i> Escola criada! Recebemos tudo. A ativação é feita pela equipe da AtletaPay e você recebe um e-mail quando o site e o app estiverem no ar.</div>' : ''}
        <article class="cartao"><h3>Situação</h3><span class="status ${ativa ? 'ok' : ''}">${ativa ? '<i class="fas fa-circle-check"></i> Ativa' : e.status === 'fila' ? '<i class="fas fa-clock"></i> Na fila de ativação' : esc(e.status)}</span>
          <ul class="checklist" style="margin-top:14px">${checks.map(([t, ok]) => `<li class="${ok ? 'feito' : ''}"><i class="fas fa-check"></i><span>${esc(t)}</span></li>`).join('')}</ul>
          ${!ativa ? `<p class="sub" style="font-size:.85rem;margin-top:12px">Enquanto a ativação acontece, complete o que falta aqui. Teste grátis até <b>${dataBR(e.trialAte)}</b>.</p>` : ''}</article>
        ${ativa && e.ativacao && e.ativacao.status === 'ok' ? `<article class="cartao" style="grid-column:1/-1"><h3>Link de inscrição dos alunos</h3><p class="sub" style="font-size:.9rem;margin-bottom:12px">Mande este link no grupo da turma: cada aluno faz a ficha (com foto, responsável dos menores e termos) e já entra no seu núcleo.</p><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><code class="mono" style="padding:10px 12px;border-radius:10px;background:var(--areia);overflow-wrap:anywhere">${esc(`${APP_URL}/inscricao.html?escola=${e.id}`)}</code><button type="button" class="bt bt-branco bt-sm" id="btCopiarLink"><i class="fas fa-link"></i> Copiar</button></div><p class="sub" style="font-size:.85rem;margin-top:10px">Para entrar no painel, use o mesmo e-mail e senha da AtletaPay.</p></article>` : ''}
        <article class="cartao"><h3>Plano</h3><dl class="kv"><dt>Plano</dt><dd>${esc(plano.nome)} — ${plano.mensal ? `${brl(plano.mensal)}/mês` : 'sem mensalidade'}</dd><dt>Split</dt><dd>${brl(plano.split)} por aluno pago</dd><dt>Alunos</dt><dd>${plano.ate ? `até ${plano.ate} ativos` : 'ilimitados'}</dd><dt>Teste grátis</dt><dd>até ${dataBR(e.trialAte)}</dd></dl><p class="sub" style="font-size:.85rem;margin-top:12px">Para mudar de plano ou cadastrar o pagamento, fale com <a href="mailto:contato@atletapay.com.br">contato@atletapay.com.br</a> — em breve isso fica aqui mesmo.</p></article>
        <article class="cartao"><h3>Dados da escola</h3><dl class="kv"><dt>Nome curto</dt><dd>${esc(e.nomeCurto || '')}</dd><dt>Modalidade</dt><dd>${esc(mod.nome)}</dd><dt>Graduações</dt><dd>${esc((e.graduacoes || []).join(' › '))}</dd><dt>Responsável</dt><dd>${esc((e.responsavel && e.responsavel.nome) || e.donoNome || '')}${e.responsavel && e.responsavel.graduacao ? ` · ${esc(e.responsavel.graduacao)}` : ''}</dd>${e.endereco ? `<dt>Local de treino</dt><dd>${esc(e.endereco)}</dd>` : ''}${e.instagram ? `<dt>Instagram</dt><dd>${esc(e.instagram)}</dd>` : ''}<dt>Contato</dt><dd>${esc(e.donoEmail || '')}${e.donoCelular ? ` · ${esc(e.donoCelular)}` : ''}</dd></dl></article>
        <article class="cartao"><h3>Endereço do site</h3><dl class="kv"><dt>Endereço</dt><dd>${esc(url.replace('https://', ''))}</dd></dl><p class="sub" style="font-size:.85rem;margin-top:12px">${e.dominio ? 'Domínio próprio ligado pela AtletaPay.' : `Quer usar um domínio próprio (www.suaescola.com.br)? <a href="mailto:contato@atletapay.com.br?subject=${encodeURIComponent(`Domínio próprio — ${e.slug}`)}">Fale com o suporte da AtletaPay</a>: nós ligamos o domínio e o HTTPS para você.`}</p></article>
        <article class="cartao" style="grid-column:1/-1"><h3>Logo e fotos</h3><p class="sub" style="font-size:.9rem;margin-bottom:12px">Trocar ou completar. Logo, foto do responsável e pelo menos 10 fotos de membros, treinos e eventos destravam a montagem do site.</p><div class="fotos" id="fotos"></div></article>
        <article class="cartao" style="grid-column:1/-1"><h3>Modelo do site</h3><p class="sub" style="font-size:.9rem;margin-bottom:12px">Atual: <b>${modelo ? esc(modelo.nome) : 'não escolhido'}</b>. Trocar é um clique; o conteúdo continua o mesmo.</p><div class="opcoes" id="modelos">${MODELOS.map((m) => `<button type="button" class="opcao" data-modelo="${m.id}" aria-pressed="${m.id === e.modelo}"><span class="cores">${m.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(m.nome)}</b><small>${esc(m.para)}</small></button>`).join('')}</div></article>
      </div>
      <p class="sub" style="font-size:.8rem;margin:24px 0 48px;color:var(--texto-3)">Escola criada em ${dataBR(e.criadoEm)}${e.enviadoEm ? ` · enviada para ativação em ${dataBR(e.enviadoEm)}` : ''}. Para excluir a conta e os dados, escreva para contato@atletapay.com.br (LGPD).</p>
    </div>`;
  desenharFotos();
  const btLink = el('btCopiarLink');
  if (btLink) btLink.addEventListener('click', async () => { try { await navigator.clipboard.writeText(`${APP_URL}/inscricao.html?escola=${e.id}`); toast('Link copiado'); } catch (er) { toast('Copie o link acima.'); } });
  el('modelos').addEventListener('click', async (ev) => { const b = ev.target.closest('[data-modelo]'); if (!b) return; try { await updateDoc(doc(db, 'escolas', e.id), { modelo: b.dataset.modelo, atualizadoEm: new Date().toISOString() }); toast('Modelo atualizado'); } catch (er) { toast(erroAmigavel(er)); } });
}
function desenharFotos() {
  const e = escola;
  el('fotos').innerHTML = FOTOS.map((f) => { const urls = (e.fotos && e.fotos[f.id]) || []; const ok = urls.length >= Math.max(1, minimoDe(f)); const cheio = f.max > 1 && urls.length >= f.max; return `<div class="foto-item${ok ? ' ok' : ''}${urls.length && !ok ? ' parcial' : ''}"><div class="previa">${urls.slice(-3).map((u) => `<img src="${esc(u)}" alt="">`).join('')}</div><div><b>${esc(f.nome)}${f.obrigatoria ? ' <span style="color:var(--laranja)">*</span>' : ''}</b><small>${esc(f.dica)}${urls.length || minimoDe(f) > 1 ? ` <strong style="color:${ok ? '#0B8F5B' : '#C2410C'}">${esc(contagemFotos(f, urls.length))}</strong>` : ''}</small></div><div class="foto-bts"><label class="bt bt-branco bt-sm" style="position:relative;overflow:hidden${cheio ? ';opacity:.5;pointer-events:none' : ''}"><i class="fas fa-upload"></i> ${f.max > 1 ? (urls.length ? 'Adicionar' : 'Enviar') : (urls.length ? 'Trocar' : 'Enviar')}<input type="file" accept="image/*" ${f.max > 1 ? 'multiple' : ''} data-foto="${f.id}" ${cheio ? 'disabled' : ''}></label>${f.max > 1 && urls.length ? `<button type="button" class="bt bt-branco bt-sm" data-limpar="${f.id}"><i class="fas fa-rotate-left"></i> Recomeçar</button>` : ''}</div></div>`; }).join('');
  el('fotos').onchange = async (ev) => {
    const inp = ev.target.closest('input[type=file]'); if (!inp || !inp.files.length) return;
    const id = inp.dataset.foto; const def = FOTOS.find((x) => x.id === id);
    const atuais = (e.fotos && e.fotos[id]) || [];
    const espaco = def.max > 1 ? def.max - atuais.length : 1;
    try {
      const urls = [];
      const arquivos = Array.from(inp.files).filter((f) => /^image\//.test(f.type)).slice(0, Math.max(0, espaco));
      for (let i = 0; i < arquivos.length; i++) { toast(`Enviando ${i + 1} de ${arquivos.length}…`); const dataUrl = await comprimir(arquivos[i], id === 'logo' ? 1024 : 1600, id === 'logo' ? 1 : 0.86); const ext = /png/.test(dataUrl.slice(0, 20)) ? 'png' : 'jpg'; urls.push(await enviarImagem(`escolas/${e.id}/onboarding/${id}-${Date.now().toString(36)}-${i + 1}.${ext}`, dataUrl)); }
      if (urls.length) { await updateDoc(doc(db, 'escolas', e.id), { [`fotos.${id}`]: juntarFotos(def, atuais, urls), atualizadoEm: new Date().toISOString() }); toast(`${urls.length} enviada${urls.length > 1 ? 's' : ''}!`); }
    } catch (er) { console.error(er); toast(erroAmigavel(er)); }
  };
  el('fotos').onclick = async (ev) => {
    const b = ev.target.closest('[data-limpar]'); if (!b) return;
    if (!confirm('Apagar todas as fotos desse item e enviar de novo?')) return;
    try { await updateDoc(doc(db, 'escolas', e.id), { [`fotos.${b.dataset.limpar}`]: [], atualizadoEm: new Date().toISOString() }); } catch (er) { toast(erroAmigavel(er)); }
  };
}
