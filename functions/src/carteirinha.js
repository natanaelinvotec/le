// Carteirinha virtual do atleta — tudo o que vale como documento é calculado
// AQUI, no servidor. O app só mostra.
//
//   carteirinhasIndice/{uid}  (só o servidor lê/grava) → código, matrícula e a
//                             foto aprovada. Nunca se perde: uma foto nova
//                             "pendente" não apaga a aprovada.
//   carteirinhas/{codigo}     (qualquer pessoa LÊ UM pelo código; ninguém lista)
//                             → o mínimo para conferir o atleta pelo QR (v.html).
//   usuarios/{uid}.carteirinha → espelho para o app (código, matrícula, validade,
//                             foto). A pessoa não consegue gravar (regras).
//   beneficiarios/{uid}       → pai, mãe, irmãos e avós que o atleta cadastra;
//                             cada um vira carteirinhas/{codigo} tipo 'beneficiario'.
//   fotosCarteirinha/{uid}    → pedido de foto: solicitada → pendente →
//                             aprovada/recusada. A foto da carteirinha é
//                             SEPARADA da foto de perfil (a da Rede é livre).
import { randomBytes } from 'node:crypto';
import { coresDoCordao } from './compartilhado/escola.js';
import { ehMenor, usoImagemOk, pagamentosValidos } from './perfil.js';
import { notificar, gestoresDoNucleo } from './notificar.js';
import { escadaDaEscola } from './escada-escola.js';
import { listaDa, rotuloGraduacao } from './compartilhado/modalidades.js';

// Sem 0/O e 1/I: dá para ditar o código por telefone sem confusão.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function novoCodigo(n = 10) {
  const b = randomBytes(n); let s = '';
  for (const x of b) s += ALFABETO[x % ALFABETO.length];
  return s;
}

// Dias de tolerância depois do fim do mês pago (mensalidade vence no início do mês).
export const CARENCIA_DIAS = 10;

// Toda pessoa que treina tem carteirinha de ATLETA: aluno, instrutor, professor
// e mestre (conta só de Admin ou só de responsável não tem).
export const PAPEIS_ATLETA = ['aluno', 'instrutor', 'mestre'];
export const temCarteirinha = (u) => !!u && Array.isArray(u.papeis) && u.papeis.some((p) => PAPEIS_ATLETA.includes(p));

// Beneficiários: só pai, mãe, irmãos e avós do atleta. Outros graus ficam de fora.
export const PARENTESCOS = { pai: 'Pai', mae: 'Mãe', irmao: 'Irmão', irma: 'Irmã', avo: 'Avô', avoa: 'Avó' };
const LIMITE_POR_PARENTESCO = { pai: 1, mae: 1, avo: 2, avoa: 2, irmao: 6, irma: 6 };
export const MAX_BENEFICIARIOS = 10;

// Lista gravada pelo app (beneficiarios/{uid}.lista) → só o que vale.
export function limparBeneficiarios(lista) {
  const out = []; const conta = {}; const ids = new Set();
  for (const b of Array.isArray(lista) ? lista : []) {
    if (!b || typeof b !== 'object') continue;
    const id = String(b.id || '');
    const parentesco = String(b.parentesco || '');
    const nome = String(b.nome || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!/^[a-z0-9]{6,20}$/i.test(id) || ids.has(id) || !Object.prototype.hasOwnProperty.call(PARENTESCOS, parentesco) || nome.split(' ').length < 2) continue;
    if ((conta[parentesco] || 0) >= LIMITE_POR_PARENTESCO[parentesco]) continue;
    conta[parentesco] = (conta[parentesco] || 0) + 1; ids.add(id);
    out.push({ id, nome, parentesco });
    if (out.length >= MAX_BENEFICIARIOS) break;
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// JSON com chaves em ordem: o Firestore devolve mapas com as chaves ordenadas,
// então comparar com JSON.stringify comum faria o servidor regravar sem parar.
export function estavel(v) {
  if (Array.isArray(v)) return `[${v.map(estavel).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${estavel(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

// Nome na verificação pública (LGPD: o mínimo para identificar).
// Adulto: "Natanael A. Silva". Menor: "João S." (e sem foto pública).
const PARTICULAS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
export function nomePublico(nome, menor) {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'Atleta';
  const [primeiro, ...resto] = partes;
  if (!resto.length) return primeiro;
  const ultimo = resto[resto.length - 1];
  if (menor) return `${primeiro} ${ultimo.charAt(0).toUpperCase()}.`;
  const meio = resto.slice(0, -1).filter((p) => !PARTICULAS.has(p.toLowerCase())).map((p) => `${p.charAt(0).toUpperCase()}.`);
  return [primeiro, ...meio, ultimo].join(' ');
}

// Última mensalidade PAGA (competência "AAAA-MM") → vale até o fim daquele mês
// + a carência. Adicionais (uniforme, evento…) não contam. null = nenhuma paga.
export function validadeDePagamentos(pagamentos) {
  const comps = (pagamentos || [])
    .filter((p) => p && p.pago === true && (p.tipo || 'mensalidade') !== 'adicional' && /^\d{4}-\d{2}$/.test(String(p.competencia || '')))
    .map((p) => p.competencia).sort();
  if (!comps.length) return null;
  const [ano, mes] = comps[comps.length - 1].split('-').map(Number);
  const fim = new Date(ano, mes, 0); // dia 0 do mês seguinte = último dia do mês pago
  fim.setDate(fim.getDate() + CARENCIA_DIAS);
  return isoLocal(fim);
}

// Regra de validade da carteirinha. Devolve { controle, validaAte }:
//   'isento'      → bolsista marcado pelo núcleo: vale enquanto estiver ativo;
//   'mensalidade' → vale até validaAte (null = nenhuma mensalidade paga = vencida);
//   'livre'       → o núcleo ainda não lança mensalidades no app: vale enquanto ativo.
export async function regraDeValidade(ctx, u, uid) {
  if (u.isentoMensalidade === true) return { controle: 'isento', validaAte: null };
  const pags = await ctx.db.collection('pagamentos').where('alunoId', '==', uid).limit(120).get();
  const validaAte = validadeDePagamentos(pagamentosValidos(pags.docs.map((d) => d.data()), u));
  if (validaAte) return { controle: 'mensalidade', validaAte };
  if (!u.academiaId) return { controle: 'livre', validaAte: null };
  const doNucleo = await ctx.db.collection('pagamentos').where('academiaId', '==', u.academiaId).limit(1).get();
  return doNucleo.empty ? { controle: 'livre', validaAte: null } : { controle: 'mensalidade', validaAte: null };
}

// Situação no dia (a mesma conta que v.html e o app fazem). Sem foto aprovada
// pelo núcleo a carteirinha não vale: é a conferência humana que impede um
// autocadastro qualquer de ganhar carteirinha "válida" (e desconto de parceiro).
export function situacao(pub, hoje) {
  if (!pub || pub.ativo === false) return 'inativa';
  if (pub.fotoAprovada === false) return 'semfoto';
  if (pub.controle === 'mensalidade') return pub.validaAte && pub.validaAte >= hoje ? 'valida' : 'vencida';
  return 'valida';
}

// Emite (uma vez só) o código e a matrícula LE-AAAA-NNNN. A transação garante
// que dois gatilhos ao mesmo tempo não criem duas matrículas para a mesma pessoa.
async function emitir(ctx, uid) {
  const refIdx = ctx.db.doc(`carteirinhasIndice/${uid}`);
  const refCont = ctx.db.doc('sistema/contadores');
  return ctx.db.runTransaction(async (t) => {
    const si = await t.get(refIdx);
    if (si.exists) return si.data();
    const sc = await t.get(refCont);
    const n = (sc.exists ? Number(sc.data().matricula) || 0 : 0) + 1;
    const agora = new Date();
    const ind = { codigo: novoCodigo(), matricula: `LE-${agora.getFullYear()}-${String(n).padStart(4, '0')}`, emitidaEm: agora.toISOString() };
    t.set(refCont, { matricula: n }, { merge: true });
    t.set(refIdx, ind);
    return ind;
  });
}

const urlPublica = (bucket, caminho) => `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(caminho)}?alt=media`;
const apagarArquivo = async (ctx, caminho) => { if (ctx.bucket && caminho) { try { await ctx.bucket.file(caminho).delete(); } catch (e) { /* já não existe */ } } };

// Recalcula tudo de uma pessoa. Idempotente: só grava o que mudou (os
// gatilhos chamam várias vezes sem problema).
export async function sincronizarCarteirinha(ctx, uid) {
  const [su, si] = await Promise.all([ctx.db.doc(`usuarios/${uid}`).get(), ctx.db.doc(`carteirinhasIndice/${uid}`).get()]);
  if (!su.exists) { if (si.exists) await apagarCarteirinha(ctx, uid, si.data()); return null; }
  const u = su.data();
  if (!temCarteirinha(u)) {
    // Deixou de ser atleta: a verificação pública sai do ar; a matrícula fica guardada.
    if (si.exists && si.data().codigo) {
      await ctx.db.doc(`carteirinhas/${si.data().codigo}`).delete().catch(() => {});
      for (const c of Object.values(si.data().benef || {})) await ctx.db.doc(`carteirinhas/${c}`).delete().catch(() => {});
      if (Object.keys(si.data().benef || {}).length) await ctx.db.doc(`carteirinhasIndice/${uid}`).update({ benef: {} });
      await apagarArquivo(ctx, si.data().fotoPublicaCaminho);
      await ctx.db.doc(`carteirinhasIndice/${uid}`).set({ fotoPublicaCaminho: null, fotoPublicaDe: null }, { merge: true });
    }
    if (u.carteirinha) await ctx.db.doc(`usuarios/${uid}`).update({ carteirinha: null });
    return null;
  }

  let ind = si.exists ? si.data() : await emitir(ctx, uid);
  const refIdx = ctx.db.doc(`carteirinhasIndice/${uid}`);
  const menor = ehMenor(u);

  // Foto pública: só de adulto e só a aprovada. Menor nunca tem foto pública.
  // (e só com autorização de uso de imagem).
  const querPublica = !menor && usoImagemOk(u) && !!ind.fotoAprovadaCaminho && !!ctx.bucket;
  if (querPublica && ind.fotoPublicaDe !== ind.fotoAprovadaCaminho) {
    const destino = `carteirinha-publica/${ind.codigo}-${Date.now().toString(36)}.jpg`;
    try {
      await ctx.bucket.file(ind.fotoAprovadaCaminho).copy(ctx.bucket.file(destino));
      await apagarArquivo(ctx, ind.fotoPublicaCaminho);
      ind = { ...ind, fotoPublicaCaminho: destino, fotoPublicaDe: ind.fotoAprovadaCaminho };
      await refIdx.set({ fotoPublicaCaminho: destino, fotoPublicaDe: ind.fotoAprovadaCaminho }, { merge: true });
    } catch (e) { (ctx.log || console).warn('carteirinha: cópia da foto pública falhou', uid, e && e.message); }
  } else if (!querPublica && ind.fotoPublicaCaminho) {
    await apagarArquivo(ctx, ind.fotoPublicaCaminho);
    ind = { ...ind, fotoPublicaCaminho: null, fotoPublicaDe: null };
    await refIdx.set({ fotoPublicaCaminho: null, fotoPublicaDe: null }, { merge: true });
  }

  const { controle, validaAte } = await regraDeValidade(ctx, u, uid);
  // Nome do núcleo sempre do cadastro do núcleo (academiaNome o próprio atleta consegue editar).
  let nucleo = '';
  if (u.academiaId) { const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get(); nucleo = sn.exists ? String(sn.data().nome || '') : ''; }
  const cordao = u.cordaoAtual || 'Iniciante';
  const ativo = u.ativo !== false && u.statusAtual !== 'Inativo';

  // v34: escola de faixa — cores da escada da escola e o rótulo "Faixa Azul · 2º grau" para a conferência pública.
  let cores = coresDoCordao(cordao, u); let rotulo = null; let escola = null;
  if (u.escolaId && u.escolaId !== 'liberdade') {
    try {
      const escada = await escadaDaEscola(ctx, u.escolaId);
      const g = listaDa(escada, u.idade).find((x) => x.nome === cordao) || (escada.adulto || []).find((x) => x.nome === cordao);
      if (g) { cores = g.cor; const peca = String(escada.peca || 'faixa'); rotulo = `${peca.charAt(0).toUpperCase()}${peca.slice(1)} ${rotuloGraduacao(cordao, u.grausAtual, g)}`; }
      const sp = await ctx.db.doc(`escolasPublicas/${u.escolaId}`).get();
      if (sp.exists) {
        const e = sp.data();
        escola = { nome: String(e.nome || e.nomeCurto || '').slice(0, 80), logo: /^https:\/\/firebasestorage\.googleapis\.com\//.test(String(e.logo || '')) ? e.logo : null };
      }
    } catch (e) { (ctx.log || console).warn('carteirinha: escada da escola', uid, e && e.message); }
  }
  const pub = {
    nome: nomePublico(u.nome, menor), cordao, cores, ...(rotulo ? { rotulo } : {}), ...(escola ? { escola } : {}), nucleo,
    matricula: ind.matricula, validaAte, controle, ativo, menor, fotoAprovada: !!ind.fotoAprovadaCaminho,
    foto: ind.fotoPublicaCaminho && ctx.bucket ? urlPublica(ctx.bucket, ind.fotoPublicaCaminho) : '',
  };
  const refPub = ctx.db.doc(`carteirinhas/${ind.codigo}`);
  const sp = await refPub.get();
  const atual = sp.exists ? { ...sp.data() } : null; if (atual) delete atual.atualizadoEm;
  if (!atual || estavel(atual) !== estavel(pub)) await refPub.set({ ...pub, atualizadoEm: new Date().toISOString() });

  // Beneficiários: cada um ganha o próprio código (a validade é a do atleta).
  const sb = await ctx.db.doc(`beneficiarios/${uid}`).get();
  const lista = limparBeneficiarios(sb.exists ? sb.data().lista : []);
  const antigos = ind.benef || {};
  const benef = {};
  lista.forEach((b) => { benef[b.id] = antigos[b.id] || novoCodigo(); });
  for (const [id, c] of Object.entries(antigos)) if (!benef[id]) await ctx.db.doc(`carteirinhas/${c}`).delete().catch(() => {});
  if (estavel(antigos) !== estavel(benef)) { await refIdx.update({ benef }); ind = { ...ind, benef }; }
  const titular = { atletaNome: pub.nome, atletaCordao: cordao, nucleo, matricula: ind.matricula, validaAte, controle, ativo, fotoAprovada: pub.fotoAprovada };
  for (const b of lista) {
    const pb = { tipo: 'beneficiario', nome: nomePublico(b.nome, false), parentesco: PARENTESCOS[b.parentesco], ...titular };
    const rb = ctx.db.doc(`carteirinhas/${benef[b.id]}`);
    const sa = await rb.get();
    const at = sa.exists ? { ...sa.data() } : null; if (at) delete at.atualizadoEm;
    if (!at || estavel(at) !== estavel(pb)) await rb.set({ ...pb, atualizadoEm: new Date().toISOString() });
  }

  const espelho = {
    codigo: ind.codigo, matricula: ind.matricula, validaAte, controle, ativo, fotoAprovada: !!ind.fotoAprovadaCaminho, fotoUrl: ind.fotoAprovadaUrl || '',
    beneficiarios: lista.map((b) => ({ id: b.id, nome: b.nome, parentesco: b.parentesco, codigo: benef[b.id] })),
  };
  if (estavel(u.carteirinha || null) !== estavel(espelho)) await ctx.db.doc(`usuarios/${uid}`).update({ carteirinha: espelho });
  return { ...pub, codigo: ind.codigo };
}

// Conta apagada: some a verificação pública, a foto e o pedido de foto.
export async function apagarCarteirinha(ctx, uid, ind) {
  if (ind && ind.codigo) await ctx.db.doc(`carteirinhas/${ind.codigo}`).delete().catch(() => {});
  for (const c of Object.values((ind && ind.benef) || {})) await ctx.db.doc(`carteirinhas/${c}`).delete().catch(() => {});
  if (ind) await apagarArquivo(ctx, ind.fotoPublicaCaminho);
  await ctx.db.doc(`beneficiarios/${uid}`).delete().catch(() => {});
  await ctx.db.doc(`fotosCarteirinha/${uid}`).delete().catch(() => {});
  await ctx.db.doc(`carteirinhasIndice/${uid}`).delete().catch(() => {});
  if (ctx.bucket) { try { await ctx.bucket.deleteFiles({ prefix: `carteirinha/${uid}/` }); } catch (e) { /* ok */ } }
}

// O link gravado pelo app só vale se for DESTE arquivo (senão um link de outra
// foto seria mostrado no app enquanto outro arquivo vira a carteirinha).
// Sem isso, monta o link pelo token de download do próprio arquivo.
export async function urlDoArquivo(ctx, caminho, urlInformada) {
  const u = String(urlInformada || '');
  // Só do bucket DESTE projeto (auditoria 08/10: antes valia o mesmo caminho em qualquer bucket).
  const prefixo = ctx.bucket && ctx.bucket.name ? `https://firebasestorage.googleapis.com/v0/b/${ctx.bucket.name}/o/` : null;
  if (prefixo && u.startsWith(prefixo) && u.slice(prefixo.length).startsWith(`${encodeURIComponent(caminho)}?`)) return u;
  if (!ctx.bucket) return '';
  try {
    const [meta] = await ctx.bucket.file(caminho).getMetadata();
    const token = String((meta && meta.metadata && meta.metadata.firebaseStorageDownloadTokens) || '').split(',')[0];
    return token ? `https://firebasestorage.googleapis.com/v0/b/${ctx.bucket.name}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}` : '';
  } catch (e) { return ''; }
}

// ---------- fotosCarteirinha/{uid} ----------
const primeiroNome = (n) => String(n || '').split(' ')[0] || 'Atleta';

export async function aoEscreverFotoCarteirinha(ctx, ev) {
  const { uid } = ev.params; const { antes, depois } = ev;
  if (!depois) return;
  const mudouStatus = !antes || antes.status !== depois.status || antes.caminho !== depois.caminho;
  if (!mudouStatus) return;
  const su = await ctx.db.doc(`usuarios/${uid}`).get();
  if (!su.exists) return;
  const u = su.data();
  // Criança sem login próprio: a primeira foto enviada pelo responsável já emite a carteirinha.
  if (depois.status !== 'aprovada' && !(await ctx.db.doc(`carteirinhasIndice/${uid}`).get()).exists) await sincronizarCarteirinha(ctx, uid);
  const familia = [uid, u.responsavelUid].filter(Boolean);
  const nome = primeiroNome(u.nome);

  // Foto trocada antes de ser aprovada (ou recusada): o arquivo velho sai do
  // Storage — a aprovada nunca é apagada aqui.
  const velho = antes && antes.caminho && antes.caminho !== depois.caminho ? String(antes.caminho) : '';
  const recusadoAgora = depois.status === 'recusada' ? String(depois.caminho || '') : '';
  for (const c of [velho, recusadoAgora]) {
    if (!c || !c.startsWith(`carteirinha/${uid}/`)) continue;
    const si0 = await ctx.db.doc(`carteirinhasIndice/${uid}`).get();
    if (!si0.exists || si0.data().fotoAprovadaCaminho !== c) await apagarArquivo(ctx, c);
  }

  if (depois.status === 'solicitada') {
    await notificar(ctx, familia, {
      tipo: 'carteirinha', titulo: 'Envie a foto da carteirinha',
      texto: `O núcleo pediu uma foto de documento${u.responsavelUid ? ` de ${nome}` : ''}: de frente, fundo liso, sem óculos escuros nem boné.`,
      link: 'carteirinha.html', tag: `carteirinha_${uid}`,
    }, { idFixo: `carteirinha_${uid}` });
    return;
  }
  if (depois.status === 'pendente') {
    await notificar(ctx, await gestoresDoNucleo(ctx, u.academiaId), {
      tipo: 'carteirinha', titulo: 'Foto de carteirinha para aprovar',
      texto: `${u.nome || 'Um atleta'} enviou a foto da carteirinha.`, link: 'carteirinhas.html', tag: 'carteirinha_aprovar',
    }, { idFixo: `carteirinha_aprovar_${uid}` });
    return;
  }
  if (depois.status === 'recusada') {
    await notificar(ctx, familia, {
      tipo: 'carteirinha', titulo: 'Foto da carteirinha recusada',
      texto: depois.motivo ? `Motivo: ${String(depois.motivo).slice(0, 120)}. Envie outra.` : 'Envie outra foto, de frente e com fundo liso.',
      link: 'carteirinha.html', tag: `carteirinha_${uid}`,
    }, { idFixo: `carteirinha_${uid}` });
    return;
  }
  if (depois.status === 'aprovada') {
    // Só aceita arquivo da pasta desta pessoa (nunca copia a foto de outra).
    const caminho = String(depois.caminho || '');
    if (!caminho.startsWith(`carteirinha/${uid}/`) || caminho.includes('..')) return;
    const refIdx = ctx.db.doc(`carteirinhasIndice/${uid}`);
    const si = await refIdx.get();
    const anterior = si.exists ? si.data().fotoAprovadaCaminho : null;
    if (anterior === caminho) { await sincronizarCarteirinha(ctx, uid); return; }
    if (!si.exists) await sincronizarCarteirinha(ctx, uid); // emite código e matrícula primeiro
    await refIdx.set({ fotoAprovadaCaminho: caminho, fotoAprovadaUrl: await urlDoArquivo(ctx, caminho, depois.url), fotoAprovadaEm: new Date().toISOString() }, { merge: true });
    await sincronizarCarteirinha(ctx, uid);
    if (anterior && anterior !== caminho) await apagarArquivo(ctx, anterior);
    await notificar(ctx, familia, {
      tipo: 'carteirinha', titulo: 'Carteirinha pronta!',
      texto: `A foto foi aprovada. A carteirinha${u.responsavelUid ? ` de ${nome}` : ''} já está no app.`,
      link: 'carteirinha.html', tag: `carteirinha_${uid}`,
    }, { idFixo: `carteirinha_${uid}` });
  }
}
