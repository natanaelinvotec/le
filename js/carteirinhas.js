/* carteirinhas.js — painel do núcleo (carteirinhas.html).

Quem usa: responsável do núcleo (só o próprio núcleo), Admin Master e Fundador
(escolhem o núcleo). As regras do Firestore conferem tudo de novo no servidor;
aqui é só a tela. Ações:
  • aprovar / recusar a foto de documento enviada pelo atleta ou responsável;
  • PEDIR a foto (o servidor notifica o atleta e o responsável legal);
  • enviar a foto pelo atleta (já entra aprovada);
  • marcar bolsista (carteirinha sem vencimento) e emitir as que faltam. */
import {
  observarSessao, db, storage, storageRef, getDownloadURL, doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, limit, enviarFoto, ondeEscola,
} from './firebase.js';
import { coresDoCordao } from './escola.js';
import { esc, situacao, textoValidade, iniciais, faixas, linkVerificacao, prepararFoto, ehAtleta } from './carteirinha-comum.js';

const pagina = document.getElementById('pagina');
const arquivo = document.getElementById('arqPeloAtleta');
const MOTIVOS = ['Foto escura ou borrada', 'Rosto cortado ou de lado', 'Óculos escuros, boné ou filtro', 'Não é foto de documento'];

let eu = null; let meuUid = null;
let podeEscolherNucleo = false;
let nucleos = []; let nucleoId = null;
let atletas = []; let fotos = {};
let aba = 'aprovar';
let alvoUpload = null;

const nomeCurto = (n) => String(n || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim();
const primeiro = (n) => String(n || '').split(' ')[0];
function toast(txt) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = txt;
  document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function semAcesso(texto) {
  pagina.innerHTML = `<div class="vazio"><b style="display:block;font:800 18px 'Sora',sans-serif;color:var(--marinho);margin-bottom:8px">Área do responsável do núcleo</b>${esc(texto)}<br><br><a class="bt bt-marinho" href="admin.html">Voltar ao painel</a></div>`;
}

observarSessao(async (user) => {
  if (!user) { location.replace('login.html'); return; }
  if (meuUid === user.uid) return;
  meuUid = user.uid;
  try {
    const s = await getDoc(doc(db, 'usuarios', meuUid));
    eu = s.exists() ? s.data() : {};
    const papeis = eu.papeis || [];
    const admin = papeis.includes('admin'); const fundador = eu.acessoGeral === true;
    podeEscolherNucleo = admin || fundador;
    if (!podeEscolherNucleo && !(papeis.includes('mestre') && eu.academiaGerenciadaId)) { semAcesso('Só quem administra um núcleo aprova as fotos das carteirinhas.'); return; }
    if (!podeEscolherNucleo) {
      const sn = await getDoc(doc(db, 'nucleos', eu.academiaGerenciadaId)).catch(() => null);
      nucleos = sn && sn.exists() ? [{ id: sn.id, ...sn.data() }] : [];
    } else {
      const sn = await getDocs(collection(db, 'nucleos'));
      nucleos = sn.docs.map((d) => ({ id: d.id, ...d.data() })).filter((n) => n.ativo !== false).sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    }
    let lembrado = null; try { lembrado = localStorage.getItem('le.carteirinhas.nucleo'); } catch (e) { /* ok */ }
    nucleoId = eu.academiaGerenciadaId || null;
    if (podeEscolherNucleo && lembrado && nucleos.some((n) => n.id === lembrado)) nucleoId = lembrado;
    if (!nucleoId && nucleos.length) nucleoId = nucleos[0].id;
    if (!nucleoId) { semAcesso('Nenhum núcleo cadastrado ainda.'); return; }
    await carregar();
  } catch (e) { console.error(e); semAcesso('Não foi possível carregar. Confira a internet e tente de novo.'); }
});

async function carregar() {
  pagina.innerHTML = '<div class="carregando"><span class="giro" aria-hidden="true"></span><p>Carregando os atletas…</p></div>';
  // Fundador: as regras só liberam a própria escola — por isso o filtro de escola em todas.
  const fe = await ondeEscola();
  const [su, sf, sg] = await Promise.all([
    getDocs(query(collection(db, 'usuarios'), ...fe, where('academiaId', '==', nucleoId), limit(600))),
    getDocs(query(collection(db, 'fotosCarteirinha'), ...fe, where('academiaId', '==', nucleoId), limit(600))),
    // Admin/Fundador: o mestre/professor que ADMINISTRA este núcleo também aparece
    // (ele treina em outro núcleo, mas a carteirinha dele é gerida daqui também).
    podeEscolherNucleo ? getDocs(query(collection(db, 'usuarios'), ...fe, where('academiaGerenciadaId', '==', nucleoId), limit(20))) : Promise.resolve({ docs: [] }),
  ]);
  const vistos = new Set();
  // Todo mundo que treina tem carteirinha: aluno, instrutor, professor e mestre.
  atletas = su.docs.concat(sg.docs).map((d) => ({ uid: d.id, ...d.data() }))
    .filter((u) => { if (vistos.has(u.uid)) return false; vistos.add(u.uid); return true; })
    .filter((u) => ehAtleta(u) && u.statusAtual !== 'Inativo' && u.ativo !== false)
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
  fotos = {}; sf.docs.forEach((d) => { fotos[d.id] = d.data(); });
  await Promise.all(atletas.filter((a) => a.academiaId !== nucleoId).map((a) => getDoc(doc(db, 'fotosCarteirinha', a.uid))
    .then((x) => { if (x.exists()) fotos[a.uid] = x.data(); }).catch(() => {})));
  if (aba === 'aprovar' && !atletas.some((a) => (fotos[a.uid] || {}).status === 'pendente')) aba = atletas.some((a) => !temFoto(a)) ? 'semfoto' : 'todos';
  desenhar();
}

const funcao = (a) => (a.academiaGerenciadaId ? 'Responsável de núcleo' : (a.papeis || []).includes('instrutor') ? 'Instrutor' : 'Atleta');
const temFoto = (a) => !!(a.carteirinha && a.carteirinha.fotoUrl);
const pendentes = () => atletas.filter((a) => (fotos[a.uid] || {}).status === 'pendente');
const semFoto = () => atletas.filter((a) => !temFoto(a) && (fotos[a.uid] || {}).status !== 'pendente');

function avatar(a) {
  const url = temFoto(a) ? a.carteirinha.fotoUrl : '';
  return `<span class="av" style="background:${faixas(coresDoCordao(a.cordaoAtual || 'Iniciante', a), '180deg')}"><div>${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : esc(iniciais(a.nome))}</div></span>`;
}
function pillFoto(a) {
  const st = (fotos[a.uid] || {}).status;
  if (st === 'pendente') return '<span class="pill pendente">FOTO EM ANÁLISE</span>';
  if (st === 'solicitada' && !temFoto(a)) return '<span class="pill solicitada" style="color:var(--verde-ok)">FOTO PEDIDA</span>';
  if (st === 'recusada') return '<span class="pill recusada">FOTO RECUSADA</span>';
  return temFoto(a) ? '<span class="pill aprovada">COM FOTO</span>' : '<span class="pill inativa">SEM FOTO</span>';
}
function pillSituacao(a) {
  const c = a.carteirinha;
  if (!c) return '<span class="pill inativa">NÃO EMITIDA</span>';
  const s = situacao(c);
  if (s === 'semfoto') return '<span class="pill pendente">SEM FOTO APROVADA</span>';
  return `<span class="pill ${s}">${s === 'valida' ? 'VÁLIDA' : s === 'vencida' ? 'VENCIDA' : 'INATIVA'} · ${esc(textoValidade(c).toUpperCase())}</span>`;
}

function desenhar() {
  const nomeNucleo = (nucleos.find((n) => n.id === nucleoId) || {}).nome || 'Meu núcleo';
  const seletor = podeEscolherNucleo && nucleos.length > 1
    ? `<label for="selNucleo" class="sr" style="position:absolute;left:-9999px">Núcleo</label><select id="selNucleo">${nucleos.map((n) => `<option value="${esc(n.id)}"${n.id === nucleoId ? ' selected' : ''}>${esc(n.nome)}</option>`).join('')}</select>` : '';
  const nP = pendentes().length; const nS = semFoto().length;
  const naoEmitidas = atletas.filter((a) => !a.carteirinha).length;
  let corpo = '';
  if (aba === 'aprovar') {
    corpo = nP ? `<div class="grade-fotos">${pendentes().map((a) => {
      const f = fotos[a.uid];
      return `<article class="cartao-foto" data-uid="${esc(a.uid)}"><div class="img"><img data-caminho="${esc(f.caminho || '')}" alt="Foto enviada por ${esc(f.enviadoPorNome || a.nome)}"><span class="guia" aria-hidden="true"></span></div>
        <div class="corpo"><strong>${esc(a.nome)}</strong><small>Cordão ${esc(a.cordaoAtual || 'Iniciante')}${f.enviadoPorUid && f.enviadoPorUid !== a.uid ? ` · enviada por ${esc(primeiro(f.enviadoPorNome))} (responsável)` : ''}</small>
        <label class="sr" style="position:absolute;left:-9999px" for="mot-${esc(a.uid)}">Motivo da recusa</label>
        <select id="mot-${esc(a.uid)}" data-motivo>${MOTIVOS.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
        <div class="bts"><button type="button" class="bt bt-verde" data-acao="aprovar">Aprovar</button><button type="button" class="bt bt-perigo" data-acao="recusar">Recusar</button></div></div></article>`;
    }).join('')}</div>` : '<div class="vazio">Nenhuma foto esperando aprovação. Quando um atleta enviar, você recebe uma notificação.</div>';
  } else {
    const lista = aba === 'semfoto' ? semFoto() : atletas;
    const lote = aba === 'semfoto' && lista.length
      ? `<div class="acoes-lote"><button type="button" class="bt bt-marinho" data-acao="pedir-todos">Pedir foto a todos (${lista.filter((a) => (fotos[a.uid] || {}).status !== 'solicitada').length})</button><small>Cada atleta (e o responsável, se for menor) recebe uma notificação no app.</small></div>`
      : aba === 'todos' && naoEmitidas ? `<div class="acoes-lote"><button type="button" class="bt bt-marinho" data-acao="emitir">Emitir as que faltam (${naoEmitidas})</button><small>Leva alguns segundos por atleta.</small></div>` : '';
    corpo = `${lote}${lista.length ? `<div class="lista">${lista.map((a) => {
      const st = (fotos[a.uid] || {}).status;
      const c = a.carteirinha;
      return `<div class="linha-atleta" data-uid="${esc(a.uid)}">${avatar(a)}
        <div class="info"><b>${esc(a.nome)}</b><small>${esc(funcao(a))} · Cordão ${esc(a.cordaoAtual || 'Iniciante')}${c ? ` · <span class="mono">${esc(c.matricula)}</span>` : ''}${c && Array.isArray(c.beneficiarios) && c.beneficiarios.length ? ` · ${c.beneficiarios.length} beneficiário${c.beneficiarios.length === 1 ? '' : 's'}` : ''}</small><div class="tags">${pillFoto(a)}${aba === 'todos' ? pillSituacao(a) : ''}</div></div>
        <div class="acoes">
          ${st !== 'pendente' && st !== 'solicitada' ? '<button type="button" class="bt bt-claro" data-acao="pedir">Pedir foto</button>' : ''}
          <button type="button" class="bt bt-claro" data-acao="enviar">Enviar foto</button>
          ${aba === 'todos' ? `<label class="interruptor"><input type="checkbox" data-acao="bolsista"${a.isentoMensalidade === true ? ' checked' : ''}> Bolsista</label>` : ''}
          ${aba === 'todos' && c && c.codigo ? `<a class="bt bt-claro" href="${esc(linkVerificacao(c.codigo))}" target="_blank" rel="noopener">Conferir</a>` : ''}
        </div></div>`;
    }).join('')}</div>` : `<div class="vazio">${aba === 'semfoto' ? 'Todos os atletas já têm a foto da carteirinha.' : 'Nenhum atleta ativo neste núcleo.'}</div>`}`;
  }
  setTimeout(mostrarFotosPendentes, 0);
  pagina.innerHTML = `<div class="barra-nucleo"><div><h2>${esc(nomeCurto(nomeNucleo))}</h2><p>${atletas.length} atletas ativos · foto de documento separada da foto de perfil da Rede</p></div>${seletor}</div>
    <div class="abas" role="tablist" aria-label="Carteirinhas">
      <button type="button" role="tab" data-aba="aprovar" aria-selected="${aba === 'aprovar'}">Para aprovar <span class="n">${nP}</span></button>
      <button type="button" role="tab" data-aba="semfoto" aria-selected="${aba === 'semfoto'}">Sem foto <span class="n">${nS}</span></button>
      <button type="button" role="tab" data-aba="todos" aria-selected="${aba === 'todos'}">Todos <span class="n">${atletas.length}</span></button>
    </div>
    ${corpo}`;
}

// A foto mostrada para aprovar é lida pelo "caminho" do arquivo — exatamente o
// que o servidor transforma em carteirinha.
function mostrarFotosPendentes() {
  pagina.querySelectorAll('img[data-caminho]').forEach((img) => {
    const c = img.dataset.caminho;
    if (!c || img.src) return;
    getDownloadURL(storageRef(storage, c)).then((u) => { img.src = u; }).catch(() => { img.alt = 'Foto não encontrada — peça outra ao atleta.'; });
  });
}

const quemSou = () => ({ uid: meuUid, nome: String(eu.nome || '').slice(0, 120) });

async function aprovar(uid, ok, motivo = '') {
  await updateDoc(doc(db, 'fotosCarteirinha', uid), {
    status: ok ? 'aprovada' : 'recusada', motivo: ok ? '' : motivo,
    avaliadoPorUid: meuUid, avaliadoPorNome: quemSou().nome, avaliadoEm: new Date().toISOString(),
  });
  fotos[uid] = { ...fotos[uid], status: ok ? 'aprovada' : 'recusada', motivo };
  if (ok) { const a = atletas.find((x) => x.uid === uid); if (a) a.carteirinha = { ...(a.carteirinha || {}), fotoUrl: fotos[uid].url }; }
}
async function pedirFoto(a) {
  await setDoc(doc(db, 'fotosCarteirinha', a.uid), {
    status: 'solicitada', academiaId: a.academiaId || null, alunoNome: String(a.nome || '').slice(0, 120),
    solicitadoPorUid: meuUid, solicitadoPorNome: quemSou().nome, solicitadoEm: new Date().toISOString(),
  });
  fotos[a.uid] = { status: 'solicitada' };
}

pagina.addEventListener('change', async (e) => {
  if (e.target.id === 'selNucleo') {
    nucleoId = e.target.value; aba = 'aprovar';
    try { localStorage.setItem('le.carteirinhas.nucleo', nucleoId); } catch (er) { /* ok */ }
    carregar().catch(() => semAcesso('Não foi possível carregar este núcleo.'));
    return;
  }
  if (e.target.dataset.acao === 'bolsista') {
    const uid = e.target.closest('[data-uid]').dataset.uid; const v = e.target.checked;
    try { await updateDoc(doc(db, 'usuarios', uid), { isentoMensalidade: v }); const a = atletas.find((x) => x.uid === uid); if (a) a.isentoMensalidade = v; toast(v ? 'Marcado como bolsista: a carteirinha não vence.' : 'Bolsa retirada: vale pela mensalidade.'); }
    catch (er) { console.error(er); e.target.checked = !v; toast('Não foi possível salvar.'); }
  }
});

pagina.addEventListener('click', async (e) => {
  const tab = e.target.closest('[data-aba]');
  if (tab) { aba = tab.dataset.aba; desenhar(); return; }
  const b = e.target.closest('button[data-acao]');
  if (!b) return;
  const acao = b.dataset.acao; const linha = b.closest('[data-uid]'); const uid = linha && linha.dataset.uid;
  const a = atletas.find((x) => x.uid === uid);
  b.disabled = true;
  try {
    if (acao === 'aprovar') { await aprovar(uid, true); toast(`Foto de ${primeiro(a && a.nome)} aprovada. A carteirinha atualiza em instantes.`); desenhar(); }
    else if (acao === 'recusar') { const m = linha.querySelector('[data-motivo]'); await aprovar(uid, false, m ? m.value : ''); toast('Foto recusada. O atleta foi avisado do motivo.'); desenhar(); }
    else if (acao === 'pedir') { await pedirFoto(a); toast(`Pedido enviado para ${primeiro(a.nome)}.`); desenhar(); }
    else if (acao === 'pedir-todos') {
      const alvos = semFoto().filter((x) => (fotos[x.uid] || {}).status !== 'solicitada');
      let n = 0; for (const x of alvos) { try { await pedirFoto(x); n++; } catch (er) { console.warn(er); } }
      toast(`Pedido enviado para ${n} atleta${n === 1 ? '' : 's'}.`); desenhar();
    } else if (acao === 'emitir') {
      const faltam = atletas.filter((x) => !x.carteirinha);
      let n = 0; for (const x of faltam) { try { await updateDoc(doc(db, 'usuarios', x.uid), { sincronizarEm: new Date().toISOString() }); n++; } catch (er) { console.warn(er); } }
      toast(`${n} carteirinha${n === 1 ? '' : 's'} em emissão. Atualizando…`);
      setTimeout(() => carregar().catch(() => {}), 6000);
    } else if (acao === 'enviar') { alvoUpload = a; arquivo.value = ''; arquivo.click(); }
  } catch (er) { console.error(er); toast('Não foi possível concluir. Confira a internet e tente de novo.'); }
  finally { b.disabled = false; }
});

// Enviar a foto pelo atleta (quem envia é o núcleo: já entra aprovada).
arquivo.addEventListener('change', async () => {
  const f = arquivo.files && arquivo.files[0]; const a = alvoUpload;
  if (!f || !a) return;
  toast('Enviando a foto…');
  try {
    const dataUrl = await prepararFoto(f);
    const caminho = `carteirinha/${a.uid}/${Date.now()}.jpg`;
    const url = await enviarFoto(caminho, dataUrl);
    const agora = new Date().toISOString();
    await setDoc(doc(db, 'fotosCarteirinha', a.uid), {
      url, caminho, status: 'aprovada', academiaId: a.academiaId || null, alunoNome: String(a.nome || '').slice(0, 120),
      enviadoPorUid: meuUid, enviadoPorNome: quemSou().nome, enviadoEm: agora,
      avaliadoPorUid: meuUid, avaliadoPorNome: quemSou().nome, avaliadoEm: agora,
    });
    fotos[a.uid] = { status: 'aprovada', url };
    a.carteirinha = { ...(a.carteirinha || {}), fotoUrl: url };
    toast(`Foto de ${primeiro(a.nome)} salva. A carteirinha atualiza em instantes.`);
    desenhar();
  } catch (er) { console.error(er); toast(er && er.message && !/firebase/i.test(er.message) ? er.message : 'Não foi possível enviar a foto.'); }
  finally { alvoUpload = null; }
});
