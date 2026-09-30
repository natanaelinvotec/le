/* carteirinha.js — tela "Minha carteirinha" do app (carteirinha.html).

O que o atleta vê aqui é o que o SERVIDOR calculou (usuarios/{uid}.carteirinha:
código, matrícula, validade e foto aprovada). A tela nunca decide validade.
A foto da carteirinha é de DOCUMENTO e passa pela aprovação do núcleo; a foto
de perfil da Rede continua livre. Conta família: o responsável vê e envia a
foto de cada dependente (regras: responsavelUid). */
import { observarSessao, db, doc, getDoc, setDoc, updateDoc, onSnapshot, enviarFoto } from './firebase.js';
import { ESCOLA, coresDoCordao } from './escola.js';
import { qrSvg } from './qr.js';
import { esc, situacao, textoValidade, dataBR, iniciais, linkVerificacao, cartaoHtml, prepararFoto, IC, ehAtleta, PARENTESCOS, LIMITE_POR_PARENTESCO, MAX_BENEFICIARIOS, deAtleta } from './carteirinha-comum.js';
import { mesclar, cartaoParceiro } from './site-render.js';
import { SITE_PADRAO } from './site-padrao.js';

const pagina = document.getElementById('pagina');
const camadas = document.getElementById('camadas');
const LOGO = ESCOLA.logoPequeno || ESCOLA.logo;

let meuUid = null;
let eu = null;
let alvos = [];            // [{ uid, nome, foto }]
let alvoUid = null;
let dadosAlvo = null;
let fotoDoc = null;
let listaBenef = [];       // beneficiarios/{alvo}.lista (o que foi pedido)
let formBenefAberto = false;
let certificados = [];      // certificadosDe/{alvo}.itens (emitidos pelo servidor)
let virado = false;
let desligar = [];
let parceiros = SITE_PADRAO.parceiros.lista;
let fotoPronta = null;     // dataURL da foto escolhida (antes de enviar)
let travaTela = null;      // Wake Lock do QR
let timerRelogio = null;

const nomeCurtoNucleo = (n) => String(n || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]\s+)?/i, '').trim();

// ---------- sessão e dados ----------
observarSessao(async (user) => {
  if (!user) { location.replace('login.html'); return; }
  if (meuUid === user.uid) return;
  meuUid = user.uid;
  try {
    const s = await getDoc(doc(db, 'usuarios', meuUid));
    eu = s.exists() ? s.data() : {};
    await montarAlvos();
  } catch (e) {
    console.error(e);
    mensagem('Não foi possível abrir a carteirinha', 'Confira a internet e tente de novo.');
  }
  carregarParceiros();
});

async function montarAlvos() {
  alvos = [];
  if (ehAtleta(eu)) alvos.push({ uid: meuUid, nome: eu.nome || 'Eu', foto: eu.fotoUrl || '' , eu: true });
  const filhos = Array.isArray(eu.responsavelDe) ? eu.responsavelDe.filter((u) => typeof u === 'string' && u !== meuUid).slice(0, 12) : [];
  const docs = await Promise.all(filhos.map((u) => getDoc(doc(db, 'usuarios', u)).then((s) => (s.exists() ? { uid: u, ...s.data() } : null)).catch(() => null)));
  docs.filter(Boolean).forEach((d) => alvos.push({ uid: d.uid, nome: d.nome || 'Atleta', foto: d.fotoUrl || '' }));
  if (!alvos.length) {
    mensagem('Sua conta não tem carteirinha de atleta', 'A carteirinha é de quem treina. Se você é responsável por um atleta, peça ao núcleo para vincular a conta família.');
    return;
  }
  let lembrado = null;
  try { lembrado = sessionStorage.getItem('le.carteirinha.alvo'); } catch (e) { /* ok */ }
  let pedido = ''; try { pedido = decodeURIComponent(location.hash.slice(1)); } catch (e) { /* link quebrado */ }
  const escolha = [pedido, lembrado].find((u) => u && alvos.some((a) => a.uid === u)) || alvos[0].uid;
  selecionar(escolha);
}

function selecionar(uid) {
  desligar.forEach((f) => { try { f(); } catch (e) { /* ok */ } });
  desligar = [];
  alvoUid = uid; dadosAlvo = null; fotoDoc = null; virado = false;
  try { sessionStorage.setItem('le.carteirinha.alvo', uid); } catch (e) { /* ok */ }
  desligar.push(onSnapshot(doc(db, 'usuarios', uid), (s) => {
    dadosAlvo = s.exists() ? s.data() : {};
    if (uid === meuUid && !dadosAlvo.carteirinha) pedirEmissao();
    desenhar();
  }, (e) => { console.error(e); mensagem('Sem acesso a esta carteirinha', 'Peça ao núcleo para conferir o vínculo da conta família.'); }));
  listaBenef = []; formBenefAberto = false; certificados = [];
  desligar.push(onSnapshot(doc(db, 'certificadosDe', uid), (s) => {
    certificados = s.exists() && Array.isArray(s.data().itens) ? s.data().itens.slice().reverse() : [];
    if (dadosAlvo) desenhar();
  }, () => { certificados = []; }));
  desligar.push(onSnapshot(doc(db, 'beneficiarios', uid), (s) => {
    listaBenef = s.exists() && Array.isArray(s.data().lista) ? s.data().lista : [];
    if (dadosAlvo) desenhar();
  }, () => { listaBenef = []; }));
  desligar.push(onSnapshot(doc(db, 'fotosCarteirinha', uid), (s) => {
    fotoDoc = s.exists() ? s.data() : null;
    if (dadosAlvo) desenhar();
  }, () => { fotoDoc = null; }));
}

// Carteirinha ainda não emitida: pede ao servidor (no máximo 1x a cada 10 min).
function pedirEmissao() {
  try {
    const ultimo = Number(sessionStorage.getItem('le.carteirinha.pedido') || 0);
    if (Date.now() - ultimo < 10 * 60000) return;
    sessionStorage.setItem('le.carteirinha.pedido', String(Date.now()));
  } catch (e) { /* ok */ }
  updateDoc(doc(db, 'usuarios', meuUid), { sincronizarEm: new Date().toISOString() }).catch(() => {});
}

// Parceiros: os mesmos do site (editados no painel "Gerenciar o site").
async function carregarParceiros() {
  try {
    const s = await getDoc(doc(db, 'siteConteudo', 'site'));
    const lista = mesclar(s.exists() ? s.data() : null).parceiros.lista;
    if (Array.isArray(lista)) { parceiros = lista.filter((p) => p && typeof p === 'object'); if (dadosAlvo) desenhar(); }
  } catch (e) { /* fica o padrão */ }
}

// ---------- tela ----------
function mensagem(titulo, texto) {
  pagina.innerHTML = `<div class="carregando"><span class="ic neutro tile" style="padding:0;width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center">${IC.escudo}</span>
    <p style="font:800 17px 'Sora',sans-serif;color:var(--marinho);margin:0;text-align:center">${esc(titulo)}</p>
    <p style="margin:0;text-align:center;max-width:320px;line-height:1.55">${esc(texto)}</p>
    <a class="bt bt-marinho" href="app.html">Voltar para o app</a></div>`;
}

function dadosDoCartao() {
  const u = dadosAlvo || {};
  const c = u.carteirinha || null;
  const cordao = u.cordaoAtual || 'Iniciante';
  const link = c && c.codigo ? linkVerificacao(c.codigo) : '';
  return {
    c, link,
    nome: u.nome || 'Atleta', cordao, cores: coresDoCordao(cordao, u),
    nucleo: nomeCurtoNucleo(u.academiaNome), matricula: c ? c.matricula : '',
    validade: c ? textoValidade(c) : 'em emissão', validadeOk: c ? situacao(c) === 'valida' : false,
    foto: c && c.fotoUrl ? c.fotoUrl : '',
    qrSvg: link ? qrSvg(link, { nivel: 'M', margem: 1, cor: '#061A3A', rotulo: 'QR de verificação da carteirinha' }) : '',
    logo: LOGO, grupo: ESCOLA.nomeCurto,
  };
}

function tiles(c) {
  if (!c) {
    return `<div class="tile"><span class="ic alerta">${IC.alerta}</span><b>Em emissão</b><small>O servidor gera a matrícula em alguns segundos.</small></div>
      <div class="tile"><span class="ic neutro">${IC.cal}</span><b>Matrícula</b><small>Aparece aqui sozinha.</small></div>`;
  }
  const sit = situacao(c);
  const t1 = {
    valida: [`<span class="ic ok">${IC.certo}</span>`, 'Carteirinha válida', c.controle === 'isento' ? 'Bolsista do núcleo' : c.controle === 'mensalidade' ? 'Mensalidade em dia' : 'Atleta ativo no núcleo'],
    vencida: [`<span class="ic ruim">${IC.alerta}</span>`, 'Mensalidade em aberto', 'Regularize com o núcleo e ela volta a valer na hora.'],
    inativa: [`<span class="ic ruim">${IC.alerta}</span>`, 'Cadastro inativo', 'Fale com o seu núcleo.'],
    semfoto: [`<span class="ic alerta">${IC.alerta}</span>`, 'Falta a foto aprovada', 'Passa a valer quando o núcleo aprovar a foto.'],
  }[sit];
  let t2;
  if (c.controle === 'mensalidade' && c.validaAte) t2 = [`Válida até ${dataBR(c.validaAte).slice(0, 5)}`, 'Renova sozinha quando a mensalidade é lançada.'];
  else if (c.controle === 'isento') t2 = ['Sem vencimento', 'Vale enquanto você estiver ativo.'];
  else if (c.controle === 'livre') t2 = ['Sem vencimento', 'Vale enquanto você estiver ativo no núcleo.'];
  else t2 = ['Sem mensalidade paga', 'Nenhuma mensalidade lançada ainda.'];
  return `<div class="tile">${t1[0]}<b>${esc(t1[1])}</b><small>${esc(t1[2])}</small></div>
    <div class="tile"><span class="ic neutro">${IC.cal}</span><b>${esc(t2[0])}</b><small>${esc(t2[1])}</small></div>`;
}

function blocoFoto(c, ehEu) {
  const quem = ehEu ? 'sua' : `de ${esc(String((dadosAlvo && dadosAlvo.nome) || 'o atleta').split(' ')[0])}`;
  const bts = `<div class="linha-bts"><button type="button" class="bt bt-verde" data-acao="foto">${IC.camera} Enviar foto</button><button type="button" class="bt bt-linha" style="color:#fff;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35)" data-acao="como">Como deve ser?</button></div>`;
  const st = fotoDoc && fotoDoc.status;
  if (st === 'pendente') {
    return `<section class="aviso-foto claro" aria-label="Foto em análise"><div class="mini">${fotoDoc.url ? `<img src="${esc(fotoDoc.url)}" alt="Foto enviada">` : ''}
      <div style="display:flex;flex-direction:column;gap:6px"><span class="pill pendente">EM ANÁLISE</span><p>O núcleo confere a foto ${quem} e a carteirinha atualiza sozinha.</p></div></div>
      <button type="button" class="link-sutil" data-acao="foto">Enviar outra foto</button></section>`;
  }
  if (st === 'recusada') {
    return `<section class="aviso-foto" aria-label="Foto recusada"><span class="pill recusada">FOTO RECUSADA</span><h2>Envie outra foto</h2>
      <p>${fotoDoc.motivo ? `Motivo: ${esc(fotoDoc.motivo)}. ` : ''}De frente, rosto inteiro e fundo liso.</p>${bts}</section>`;
  }
  if (st === 'solicitada' || !(c && c.fotoUrl)) {
    return `<section class="aviso-foto" aria-label="Foto da carteirinha">${st === 'solicitada' ? '<span class="pill solicitada">O NÚCLEO PEDIU</span>' : ''}
      <h2>Falta a foto da carteirinha</h2>
      <p>É a foto de documento, conferida pelo núcleo. A foto do perfil na Rede continua do jeito que você quiser.</p>${bts}</section>`;
  }
  return '';
}

function desenhar() {
  if (!dadosAlvo) return;
  const d = dadosDoCartao();
  const ehEu = alvoUid === meuUid;
  const alvoAtual = alvos.find((a) => a.uid === alvoUid) || {};
  document.getElementById('titulo').textContent = ehEu ? 'Minha carteirinha' : `Carteirinha de ${String(alvoAtual.nome || '').split(' ')[0]}`;
  const familia = alvos.length > 1 ? `<nav class="familia" aria-label="Escolher atleta">${alvos.map((a) => `<button type="button" class="chip-pessoa" data-alvo="${esc(a.uid)}" aria-pressed="${a.uid === alvoUid}"><span class="av">${a.foto ? `<img src="${esc(a.foto)}" alt="">` : esc(iniciais(a.nome))}</span>${esc(a.eu ? 'Eu' : String(a.nome).split(' ')[0])}</button>`).join('')}</nav>` : '';
  const sit = d.c ? situacao(d.c) : null;
  const cartoes = parceiros.map((p) => cartaoParceiro(p)).join('');
  pagina.innerHTML = `${familia}
    <button type="button" class="cena" data-acao="virar" aria-label="Virar a carteirinha (mostra ${virado ? 'a frente' : 'o verso com o QR'})">${cartaoHtml(d, virado)}</button>
    <p class="dica-virar">${IC.virar} Toque no cartão para ver o ${virado ? 'frente' : 'verso'}</p>
    <div class="grade-2">${tiles(d.c)}</div>
    ${blocoFoto(d.c, ehEu)}
    <button type="button" class="bt bt-verde bt-grande" data-acao="qr" ${d.link ? '' : 'disabled'}>${IC.qr} Mostrar QR para conferir</button>
    ${blocoBeneficiarios(d)}
    ${blocoCertificados()}
    ${d.c && d.c.fotoUrl && !(fotoDoc && ['pendente', 'recusada', 'solicitada'].includes(fotoDoc.status)) ? '<button type="button" class="link-sutil" data-acao="foto">Trocar a foto da carteirinha</button>' : ''}
    ${cartoes ? `<div class="sec-tit"><h2>Benefícios da carteirinha</h2><small>${sit === 'valida' ? 'Carteirinha válida' : 'Valem com a carteirinha válida'}</small></div>${cartoes}` : ''}
    <p class="nota">${IC.escudo.replace('width="18" height="18"', 'width="13" height="13" style="vertical-align:-2px"')} Quem lê o QR vê só nome, cordão, núcleo, matrícula e validade. Idade, telefone e endereço nunca aparecem.</p>`;
}

// ---------- ações ----------
pagina.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-alvo]');
  if (chip) { if (chip.dataset.alvo !== alvoUid) selecionar(chip.dataset.alvo); return; }
  const a = e.target.closest('[data-acao]');
  if (!a) return;
  const acao = a.dataset.acao;
  if (acao === 'virar') {
    virado = !virado;
    const v = a.querySelector('.vira'); if (v) v.classList.toggle('virado', virado);
    a.setAttribute('aria-label', `Virar a carteirinha (mostra ${virado ? 'a frente' : 'o verso com o QR'})`);
    const dica = pagina.querySelector('.dica-virar'); if (dica) dica.innerHTML = `${IC.virar} Toque no cartão para ver o ${virado ? 'frente' : 'verso'}`;
  } else if (acao === 'qr') abrirQR();
  else if (acao === 'qr-benef') abrirQR(benefDoEspelho(a.dataset.id));
  else if (acao === 'enviar-benef') compartilharBenef(benefDoEspelho(a.dataset.id));
  else if (acao === 'remover-benef') removerBenef(a.dataset.id);
  else if (acao === 'novo-benef') { formBenefAberto = true; desenhar(); const i = document.getElementById('benefNome'); if (i) i.focus(); }
  else if (acao === 'cancelar-benef') { formBenefAberto = false; desenhar(); }
  else if (acao === 'foto' || acao === 'como') abrirFolhaFoto();
});

// ---------- certificados de graduação (um por troca de cordão) ----------
function blocoCertificados() {
  if (!certificados.length) return '';
  const linhas = certificados.map((c) => {
    const cores = coresDoCordao(c.cordao, dadosAlvo || {});
    const data = /^\d{4}-\d{2}-\d{2}$/.test(c.data || '') ? c.data.split('-').reverse().join('/') : '';
    const link = `certificado.html#${encodeURIComponent(c.codigo)}`;
    return `<li class="benef"><span class="av-b" style="background:repeating-linear-gradient(45deg,${cores[0]} 0 5px,${cores[1]} 5px 10px,${cores[2]} 10px 15px)"></span>
      <span class="txt"><b>Cordão ${esc(c.cordao)}</b><small>${esc([data, c.evento].filter(Boolean).join(' · '))}</small></span>
      <span class="acoes-b"><a class="bt bt-claro" href="${esc(link)}" style="height:38px;padding:0 12px;font-size:12.5px">Ver</a><a class="bt bt-claro" href="certificado.html?imprimir=1#${esc(encodeURIComponent(c.codigo))}" style="height:38px;padding:0 12px;font-size:12.5px">PDF</a></span></li>`;
  }).join('');
  return `<section class="beneficiarios" aria-labelledby="titCert"><div class="sec-tit"><h2 id="titCert">Certificados de graduação</h2><small>${certificados.length}</small></div><ul class="lista-benef">${linhas}</ul><a class="bt bt-claro" href="certificados.html#${esc(encodeURIComponent(alvoUid || ''))}" style="margin-top:10px;width:100%">Ver todos os certificados</a></section>`;
}

// ---------- beneficiários (pai, mãe, irmãos e avós) ----------
const espelhoBenef = () => ((dadosAlvo && dadosAlvo.carteirinha && dadosAlvo.carteirinha.beneficiarios) || []);
const benefDoEspelho = (id) => espelhoBenef().find((b) => b.id === id) || null;

function blocoBeneficiarios(d) {
  const nomeAtleta = (dadosAlvo && dadosAlvo.nome) || 'Atleta';
  const prontos = espelhoBenef();
  // Pedidos que o servidor ainda não processou (ou que ele recusou por não serem da regra).
  const emEspera = listaBenef.filter((b) => b && !prontos.some((p) => p.id === b.id));
  const cheia = listaBenef.length >= MAX_BENEFICIARIOS;
  const linhas = prontos.map((b) => `<li class="benef" data-id="${esc(b.id)}">
      <span class="av-b">${esc(iniciais(b.nome))}</span>
      <span class="txt"><b>${esc(b.nome)}</b><small>${esc(deAtleta(b.parentesco, nomeAtleta))}</small></span>
      <span class="acoes-b">
        <button type="button" class="bt-ic" data-acao="qr-benef" data-id="${esc(b.id)}" aria-label="Mostrar QR de ${esc(b.nome)}" ${d.link ? '' : 'disabled'}>${IC.qr}</button>
        <button type="button" class="bt-ic" data-acao="enviar-benef" data-id="${esc(b.id)}" aria-label="Enviar a carteirinha para ${esc(b.nome)}">${IC.enviar}</button>
        <button type="button" class="bt-ic" data-acao="remover-benef" data-id="${esc(b.id)}" aria-label="Remover ${esc(b.nome)}">${IC.lixo}</button>
      </span></li>`).concat(emEspera.map((b) => `<li class="benef espera"><span class="av-b">${esc(iniciais(b.nome))}</span>
      <span class="txt"><b>${esc(b.nome)}</b><small>${esc(PARENTESCOS[b.parentesco] || '')} · gerando o QR…</small></span>
      <span class="acoes-b"><button type="button" class="bt-ic" data-acao="remover-benef" data-id="${esc(b.id)}" aria-label="Remover ${esc(b.nome)}">${IC.lixo}</button></span></li>`)).join('');
  const form = formBenefAberto ? `<form class="form-benef" id="formBenef" novalidate>
      <label for="benefNome">Nome completo<input id="benefNome" name="nome" type="text" maxlength="80" autocomplete="off" placeholder="Ex.: Maria Aparecida Silva" required></label>
      <label for="benefParentesco">Parentesco<select id="benefParentesco" name="parentesco">${Object.entries(PARENTESCOS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <p class="estado-envio" id="benefEstado" aria-live="polite"></p>
      <div class="grade-2"><button type="button" class="bt bt-linha" data-acao="cancelar-benef">Cancelar</button><button type="submit" class="bt bt-marinho">Adicionar</button></div>
    </form>` : '';
  return `<section class="beneficiarios" aria-labelledby="titBenef">
    <div class="sec-tit"><h2 id="titBenef">Beneficiários</h2><small>${listaBenef.length}/${MAX_BENEFICIARIOS}</small></div>
    <p class="ajuda-benef">Pai, mãe, irmãos e avós também usam os benefícios dos parceiros, com o QR próprio. Outros graus de parentesco não entram.</p>
    ${linhas ? `<ul class="lista-benef">${linhas}</ul>` : ''}
    ${form || (cheia ? '' : '<button type="button" class="bt bt-branco" data-acao="novo-benef" style="width:100%">+ Adicionar beneficiário</button>')}
  </section>`;
}

async function gravarBeneficiarios(lista) {
  await setDoc(doc(db, 'beneficiarios', alvoUid), { lista, atualizadoEm: new Date().toISOString(), porUid: meuUid });
}

pagina.addEventListener('submit', async (e) => {
  if (e.target.id !== 'formBenef') return;
  e.preventDefault();
  const f = e.target; const estado = document.getElementById('benefEstado');
  const aviso = (t, erro = true) => { estado.textContent = t; estado.classList.toggle('erro', erro); };
  const nome = String(f.nome.value || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const parentesco = f.parentesco.value;
  if (nome.split(' ').length < 2) { aviso('Escreva nome e sobrenome, como no documento.'); f.nome.focus(); return; }
  if (!Object.prototype.hasOwnProperty.call(PARENTESCOS, parentesco)) { aviso('Escolha o parentesco.'); return; }
  const mesmos = listaBenef.filter((b) => b.parentesco === parentesco).length;
  if (mesmos >= LIMITE_POR_PARENTESCO[parentesco]) { aviso(`Já tem ${PARENTESCOS[parentesco].toLowerCase()} cadastrado${parentesco === 'mae' || parentesco === 'avoa' || parentesco === 'irma' ? 'a' : ''} no limite.`); return; }
  if (listaBenef.length >= MAX_BENEFICIARIOS) { aviso(`O limite é ${MAX_BENEFICIARIOS} beneficiários.`); return; }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join('');
  f.querySelector('[type=submit]').disabled = true; aviso('Salvando…', false);
  try {
    await gravarBeneficiarios(listaBenef.concat([{ id, nome, parentesco }]));
    formBenefAberto = false;
  } catch (er) { console.error(er); f.querySelector('[type=submit]').disabled = false; aviso('Não foi possível salvar. Confira a internet e tente de novo.'); }
});

async function removerBenef(id) {
  const b = listaBenef.find((x) => x.id === id);
  if (!b || !confirm(`Remover ${b.nome} dos beneficiários? O QR dele deixa de valer na hora.`)) return;
  try { await gravarBeneficiarios(listaBenef.filter((x) => x.id !== id)); }
  catch (e) { console.error(e); alert('Não foi possível remover agora. Tente de novo.'); }
}

// Manda o link da carteirinha do beneficiário (ele abre no celular dele e mostra no parceiro).
async function compartilharBenef(b) {
  if (!b || !b.codigo) return;
  const link = linkVerificacao(b.codigo);
  const nomeAtleta = String((dadosAlvo && dadosAlvo.nome) || '').split(' ')[0];
  const texto = `${String(b.nome).split(' ')[0]}, esta é a sua carteirinha de beneficiário (${deAtleta(b.parentesco, nomeAtleta).toLowerCase()}) do grupo ${ESCOLA.nomeCurto}. Mostre no atendimento dos parceiros junto com um documento com foto:`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Carteirinha de beneficiário', text: texto, url: link }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${link}`)}`, '_blank', 'noopener');
}

// ---------- QR em tela cheia ----------
// benef = null → QR do atleta; benef = { nome, parentesco, codigo } → QR do beneficiário.
function abrirQR(benef = null) {
  const d = dadosDoCartao();
  if (!d.link) return;
  if (benef && !benef.codigo) return;
  const link = benef ? linkVerificacao(benef.codigo) : d.link;
  const qr = qrSvg(link, { nivel: 'Q', margem: 1, cor: '#061A3A', rotulo: 'QR de verificação da carteirinha' }).replace('<svg ', '<svg class="qr" ');
  camadas.innerHTML = `<div class="qr-tela" role="dialog" aria-modal="true" aria-label="QR da carteirinha">
    <span class="onda" aria-hidden="true"></span><span class="onda d2" aria-hidden="true"></span><span class="onda d3" aria-hidden="true"></span>
    <div class="qr-topo"><button type="button" class="bt-ic" data-fechar aria-label="Fechar">${IC.fechar}</button><span>${IC.sol} Brilho no máximo</span><span style="width:44px"></span></div>
    <div class="qr-cab"><b>${benef ? 'BENEFICIÁRIO' : 'CARTEIRINHA DE ATLETA'}</b><strong>Mostre para conferir</strong></div>
    <div class="qr-caixa">
      <svg class="anel" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48.6" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.6"/><circle cx="50" cy="50" r="48.6" fill="none" stroke="#00E676" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="60 246"/></svg>
      <div class="branco">${qr}<img class="selo-logo" src="${esc(LOGO)}" alt=""></div>
    </div>
    <div class="relogio" aria-live="off"><b id="relogio" class="mono">--:--:--</b><small id="relogioData"></small></div>
    ${benef
    ? `<div class="qr-quem"><span class="av"><div>${esc(iniciais(benef.nome))}</div></span>
      <span><strong>${esc(benef.nome)}</strong><small>${esc(deAtleta(benef.parentesco, d.nome))} · titular ${esc(d.matricula || '')}</small></span></div>
    <p class="qr-nota">Beneficiário: no atendimento, apresente também um documento com foto. O relógio anda ao vivo — print da tela não vale.</p>`
    : `<div class="qr-quem"><span class="av"><div>${d.foto ? `<img src="${esc(d.foto)}" alt="">` : esc(iniciais(d.nome))}</div></span>
      <span><strong>${esc(d.nome)}</strong><small>Cordão ${esc(d.cordao)}${d.nucleo ? ` · ${esc(d.nucleo)}` : ''}</small></span></div>
    <p class="qr-nota">O relógio anda ao vivo: print ou foto da tela não vale. Quem conferir aponta a câmera do celular e abre a página oficial de verificação do grupo.</p>`}
  </div>`;
  // faixas() usa "linear-gradient(dir, …)": para o anel do avatar, cone de 3 cores.
  const av = camadas.querySelector('.qr-quem .av');
  if (av) av.style.background = `conic-gradient(${d.cores[0]} 0 33.3%, ${d.cores[1]} 33.3% 66.6%, ${d.cores[2]} 66.6%)`;
  const tick = () => {
    const agora = new Date();
    const r = document.getElementById('relogio'); const rd = document.getElementById('relogioData');
    if (r) r.textContent = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (rd) rd.textContent = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  tick(); clearInterval(timerRelogio); timerRelogio = setInterval(tick, 1000);
  if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then((t) => { travaTela = t; }).catch(() => {});
  camadas.querySelector('[data-fechar]').focus();
}
function fecharCamadas() {
  clearInterval(timerRelogio); timerRelogio = null;
  if (travaTela) { travaTela.release().catch(() => {}); travaTela = null; }
  camadas.innerHTML = ''; fotoPronta = null;
}
camadas.addEventListener('click', (e) => {
  if (e.target.closest('[data-fechar]') || e.target.classList.contains('folha-fundo')) fecharCamadas();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && camadas.innerHTML) fecharCamadas(); });
document.addEventListener('visibilitychange', () => {
  // A trava de tela cai quando o app vai para o fundo; volta ao reabrir o QR.
  if (!document.hidden && camadas.querySelector('.qr-tela') && 'wakeLock' in navigator) navigator.wakeLock.request('screen').then((t) => { travaTela = t; }).catch(() => {});
});

// ---------- enviar foto de documento ----------
function abrirFolhaFoto() {
  const ehEu = alvoUid === meuUid;
  const primeiro = String((dadosAlvo && dadosAlvo.nome) || 'o atleta').split(' ')[0];
  camadas.innerHTML = `<div class="folha-fundo"><div class="folha" role="dialog" aria-modal="true" aria-labelledby="folhaTit">
    <span class="puxador" aria-hidden="true"></span>
    <h2 id="folhaTit">Foto da carteirinha${ehEu ? '' : ` de ${esc(primeiro)}`}</h2>
    <p>É a foto de documento que o núcleo confere antes de aprovar. Na Rede, o perfil continua com a foto que você quiser.</p>
    <ul class="regras">
      <li>${IC.certo}De frente, rosto inteiro</li><li>${IC.certo}Fundo liso e claro</li>
      <li>${IC.certo}Sem óculos escuros, boné ou filtro</li><li>${IC.certo}Pode ser com o abadá do grupo</li>
    </ul>
    <div class="moldura-foto" id="previa" hidden><img id="previaImg" alt="Prévia da foto da carteirinha"><span class="guia" aria-hidden="true"></span></div>
    <div class="grade-2">
      <label class="bt bt-marinho" for="arqCamera">${IC.camera} Tirar foto</label>
      <label class="bt bt-linha" for="arqGaleria">${IC.galeria} Da galeria</label>
    </div>
    <input id="arqCamera" class="oculto-arquivo" type="file" accept="image/*" capture="user">
    <input id="arqGaleria" class="oculto-arquivo" type="file" accept="image/*">
    <button type="button" class="bt bt-verde bt-grande" id="btEnviarFoto" hidden>Enviar para aprovação</button>
    <p class="estado-envio" id="estadoEnvio" aria-live="polite"></p>
    <button type="button" class="link-sutil" data-fechar>Agora não</button>
  </div></div>`;
  camadas.querySelectorAll('input[type=file]').forEach((i) => i.addEventListener('change', () => escolherArquivo(i.files && i.files[0])));
  document.getElementById('btEnviarFoto').addEventListener('click', enviarFotoCarteirinha);
}

const estadoEnvio = (txt, erro = false) => { const el = document.getElementById('estadoEnvio'); if (el) { el.textContent = txt; el.classList.toggle('erro', erro); } };

async function escolherArquivo(arquivo) {
  if (!arquivo) return;
  estadoEnvio('Preparando a foto…');
  try {
    fotoPronta = await prepararFoto(arquivo);
    const previa = document.getElementById('previa');
    document.getElementById('previaImg').src = fotoPronta;
    previa.hidden = false;
    document.getElementById('btEnviarFoto').hidden = false;
    estadoEnvio('Ficou boa? O rosto deve caber no oval.');
  } catch (e) { fotoPronta = null; estadoEnvio(e.message || 'Não deu para usar essa foto.', true); }
}

async function enviarFotoCarteirinha() {
  if (!fotoPronta || !alvoUid) return;
  const bt = document.getElementById('btEnviarFoto');
  bt.disabled = true; estadoEnvio('Enviando…');
  try {
    const caminho = `carteirinha/${alvoUid}/${Date.now()}.jpg`;
    const url = await enviarFoto(caminho, fotoPronta);
    await setDoc(doc(db, 'fotosCarteirinha', alvoUid), {
      url, caminho, status: 'pendente',
      academiaId: (dadosAlvo && dadosAlvo.academiaId) || null,
      alunoNome: String((dadosAlvo && dadosAlvo.nome) || '').slice(0, 120),
      enviadoPorUid: meuUid, enviadoPorNome: String((eu && eu.nome) || '').slice(0, 120), enviadoEm: new Date().toISOString(),
    });
    estadoEnvio('Enviada! O núcleo foi avisado para aprovar.');
    setTimeout(fecharCamadas, 1100);
  } catch (e) {
    console.error(e);
    bt.disabled = false;
    estadoEnvio('Não foi possível enviar. Confira a internet e tente de novo.', true);
  }
}

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
