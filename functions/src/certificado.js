// Certificado de graduação — emitido pelo SERVIDOR quando o cordão sobe.
//
//   certificados/{codigo}   (qualquer pessoa ABRE UM pelo código; ninguém lista)
//                           → o que o certificado mostra + a verificação
//                             (certificado.html#CODIGO, o mesmo link do QR).
//   certificadosDe/{uid}    (só a pessoa, o responsável legal e o núcleo leem;
//                           só o servidor grava) → a lista da pessoa no app.
//
// O painel só troca o cordão (historicoGraduacoes); ninguém consegue "se dar"
// um certificado pelo app, e um certificado nunca é emitido duas vezes para a
// mesma troca (chave = cordão + data da troca).
import { coresDoCordao, ESCOLA } from './compartilhado/escola.js';
import { ehMenor } from './perfil.js';
import { novoCodigo } from './carteirinha.js';

const pad = (n) => String(n).padStart(2, '0');
const dataLocal = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const somarDias = (ymd, n) => { const [a, m, d] = ymd.split('-').map(Number); const x = new Date(a, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Nome no certificado: adulto por extenso; menor só primeiro e último nome
// (o link pode circular fora do grupo).
export function nomeNoCertificado(nome, menor) {
  const p = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return 'Atleta';
  return menor && p.length > 2 ? `${p[0]} ${p[p.length - 1]}` : p.join(' ');
}

// O batizado em que a troca aconteceu: evento da agenda até 3 dias antes ou
// depois da troca, preferindo "batizado" e o núcleo do atleta.
export async function eventoDaTroca(ctx, dataYmd, academiaId) {
  if (!dataYmd) return null;
  const s = await ctx.db.collection('eventos').where('data', '>=', somarDias(dataYmd, -3)).where('data', '<=', somarDias(dataYmd, 3)).limit(20).get();
  const lista = s.docs.map((d) => d.data()).filter((e) => e && e.nome);
  const nota = (e) => (sem(e.nome).includes('batizado') ? 2 : 0) + (e.academiaId && e.academiaId === academiaId ? 1 : 0) + (!e.academiaId ? 0.5 : 0);
  lista.sort((a, b) => nota(b) - nota(a));
  const e = lista[0];
  return e ? { nome: String(e.nome).slice(0, 120), local: String(e.local || '').slice(0, 120), data: e.data || dataYmd } : null;
}

// Emite (uma vez) o certificado de uma troca de cordão. `troca` = item do
// historicoGraduacoes: { cordao, anterior, em, por, porNome }.
// opcoes.assinanteUid: quem gravou a troca de verdade (authId do gatilho) —
// vale mais que o "por" que o app mandou.
export async function emitirCertificado(ctx, uid, u, troca, opcoes = {}) {
  if (!troca || !troca.cordao) return null;
  const chave = `${troca.cordao}|${troca.em || ''}`;
  const refDe = ctx.db.doc(`certificadosDe/${uid}`);
  const sd = await refDe.get();
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const ja = itens.find((i) => i.chave === chave);
  if (ja) return { ...ja, repetido: true };

  const data = dataLocal(troca.em || new Date().toISOString()) || dataLocal(new Date().toISOString());
  let nucleo = '';
  if (u.academiaId) { const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get(); nucleo = sn.exists ? String(sn.data().nome || '') : ''; }
  // O evento escolhido no painel (graduação em lote) vale mais que a busca pela data.
  let evento = null;
  if (troca.eventoId) {
    const se = await ctx.db.doc(`eventos/${troca.eventoId}`).get();
    if (se.exists && se.data().nome) evento = { nome: String(se.data().nome).slice(0, 120), local: String(se.data().local || '').slice(0, 120), data: se.data().data || data };
  }
  if (!evento) evento = await eventoDaTroca(ctx, data, u.academiaId || null);

  // Assinaturas: quem graduou (nome do cadastro dele, não o que o app mandou) e o Fundador.
  const assinaturas = [];
  let porEhFundador = false;
  const assinante = opcoes.assinanteUid || troca.por;
  if (assinante) {
    const sp = await ctx.db.doc(`usuarios/${assinante}`).get();
    if (sp.exists) {
      const p = sp.data();
      porEhFundador = p.acessoGeral === true;
      assinaturas.push({ nome: String(p.nome || troca.porNome || '').slice(0, 80), papel: porEhFundador ? `${ESCOLA.mestre} · Fundador` : (p.academiaGerenciadaId ? 'Responsável do núcleo' : 'Graduado por') });
    }
  }
  if (!porEhFundador) assinaturas.push({ nome: ESCOLA.mestre, papel: 'Fundador do grupo' });

  const agora = new Date();
  const refCont = ctx.db.doc('sistema/contadores');
  const codigo = novoCodigo();
  // Batizado registrado em lote = muitas trocas ao mesmo tempo no mesmo contador:
  // tenta de novo com espera (a rotina da madrugada ainda confere o que faltar).
  let numero = null;
  for (let tentativa = 0; tentativa < 4 && !numero; tentativa++) {
    try {
      numero = await ctx.db.runTransaction(async (t) => {
        const sc = await t.get(refCont);
        const n = (sc.exists ? Number(sc.data().certificado) || 0 : 0) + 1;
        t.set(refCont, { certificado: n }, { merge: true });
        return `LE-CERT-${agora.getFullYear()}-${String(n).padStart(4, '0')}`;
      });
    } catch (e) {
      if (tentativa === 3) throw e;
      await new Promise((r) => setTimeout(r, 300 * (tentativa + 1) + Math.random() * 400));
    }
  }
  const menor = ehMenor(u);
  const pub = {
    numero, nome: nomeNoCertificado(u.nome, menor), cordao: troca.cordao, anterior: troca.anterior || null,
    cores: coresDoCordao(troca.cordao, u), nucleo, data, evento, assinaturas, menor,
    grupo: ESCOLA.nome, ativo: true, emitidoEm: agora.toISOString(),
  };
  await ctx.db.doc(`certificados/${codigo}`).set(pub);
  const item = { codigo, numero, cordao: troca.cordao, anterior: troca.anterior || null, data, evento: evento ? evento.nome : '', chave };
  await refDe.set({ itens: itens.concat([item]).slice(-40), atualizadoEm: agora.toISOString() }, { merge: true });
  return item;
}

// Conta apagada (LGPD): os certificados saem do ar.
export async function apagarCertificados(ctx, uid) {
  const refDe = ctx.db.doc(`certificadosDe/${uid}`);
  const sd = await refDe.get();
  if (!sd.exists) return 0;
  const itens = Array.isArray(sd.data().itens) ? sd.data().itens : [];
  for (const i of itens) if (i && i.codigo) await ctx.db.doc(`certificados/${i.codigo}`).delete().catch(() => {});
  await refDe.delete().catch(() => {});
  return itens.length;
}

// Rotina da madrugada: troca de cordão (para cima) sem certificado — por falha
// no dia ou graduação anterior a esta função — ganha o certificado, sem aviso.
const ORDEM = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
export async function conferirCertificados(ctx, uid, u) {
  const hist = Array.isArray(u && u.historicoGraduacoes) ? u.historicoGraduacoes : [];
  const subidas = hist.filter((h) => h && h.cordao && ORDEM.indexOf(h.cordao) > ORDEM.indexOf(h.anterior || 'Iniciante'));
  if (!subidas.length) return 0;
  const sd = await ctx.db.doc(`certificadosDe/${uid}`).get();
  const chaves = new Set((sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : []).map((i) => i.chave));
  let n = 0;
  for (const h of subidas) {
    if (chaves.has(`${h.cordao}|${h.em || ''}`)) continue;
    await emitirCertificado(ctx, uid, u, h); n++;
  }
  return n;
}
