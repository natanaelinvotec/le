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
//
// Assinaturas: SEMPRE o Mestre Profeta (Fundador) e o professor(a) responsável
// pelo núcleo onde o atleta treina. A imagem da assinatura real de cada um fica
// em assinaturas/{uid} (enviada no painel) e é buscada na hora de mostrar.
//
// Cordões que o atleta já tinha antes do app (a professora coloca o aluno direto
// no cordão atual) ganham certificado SEM data e sem evento ("legado"), sem festa.
import { coresDoCordao, ESCOLA, escadaDe, nomeBonito } from './compartilhado/escola.js';
import { ehMenor, carregarConfigBrasoes } from './perfil.js';
import { notificar } from './notificar.js';
import { novoCodigo } from './carteirinha.js';

const pad = (n) => String(n).padStart(2, '0');
const dataLocal = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const somarDias = (ymd, n) => { const [a, m, d] = ymd.split('-').map(Number); const x = new Date(a, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
const sem = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Nome no certificado: adulto por extenso; menor só primeiro e último nome
// (o link pode circular fora do grupo).
export function nomeNoCertificado(nome, menor) {
  const p = nomeBonito(nome).split(/\s+/).filter(Boolean);
  if (!p.length) return 'Atleta';
  return menor && p.length > 2 ? `${p[0]} ${p[p.length - 1]}` : p.join(' ');
}

// O batizado em que a troca aconteceu: evento da agenda até 3 dias antes ou
// depois da troca, preferindo "batizado" e o núcleo do atleta.
export async function eventoDaTroca(ctx, dataYmd, academiaId, escolaId = 'liberdade') {
  if (!dataYmd) return null;
  const s = await ctx.db.collection('eventos').where('data', '>=', somarDias(dataYmd, -3)).where('data', '<=', somarDias(dataYmd, 3)).limit(20).get();
  // Só eventos da escola do certificado (auditoria 08/10: antes entrava evento de outra escola).
  const lista = s.docs.map((d) => d.data()).filter((e) => e && e.nome && (!e.escolaId || e.escolaId === escolaId));
  const nota = (e) => (sem(e.nome).includes('batizado') ? 2 : 0) + (e.academiaId && e.academiaId === academiaId ? 1 : 0) + (!e.academiaId ? 0.5 : 0);
  lista.sort((a, b) => nota(b) - nota(a));
  const e = lista[0];
  return e ? { nome: String(e.nome).slice(0, 120), local: String(e.local || '').slice(0, 120), data: e.data || dataYmd } : null;
}

// Título curto do responsável a partir do nome do núcleo: "Academia Professora Taynara" → "Professora Taynara".
export const tituloDoNucleo = (nome) => String(nome || '').replace(/^\s*(academia|núcleo|nucleo)\s+(d[oa]s?\s+)?/i, '').trim();

// As duas assinaturas do certificado: Fundador + responsável do núcleo do atleta
// (se o núcleo é do próprio Fundador, ele assina as duas).
export async function assinaturasDoCertificado(ctx, u) {
  const cfg = await carregarConfigBrasoes(ctx);
  const nomeDe = async (uid) => { if (!uid) return ''; const s = await ctx.db.doc(`usuarios/${uid}`).get(); return s.exists ? String(s.data().nome || '').slice(0, 80) : ''; };
  const fundUid = cfg.presidenteUid || null;
  const lista = [{ uid: fundUid, nome: (await nomeDe(fundUid)) || ESCOLA.mestre, titulo: ESCOLA.mestre, papel: 'Fundador do grupo' }];
  if (u.academiaId) {
    const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get();
    const n = sn.exists ? sn.data() : null;
    if (n && n.professorUid) lista.push({ uid: n.professorUid, nome: (await nomeDe(n.professorUid)) || tituloDoNucleo(n.nome), titulo: tituloDoNucleo(n.nome) || 'Responsável do núcleo', papel: 'Responsável do núcleo' });
  }
  return lista;
}

const chaveDe = (troca) => (troca.legado ? `${troca.cordao}|legado` : `${troca.cordao}|${troca.em || ''}`);

// Emite (uma vez) o certificado de uma troca de cordão. `troca` = item do
// historicoGraduacoes: { cordao, anterior, em, por, porNome, eventoId?, legado? }.
export async function emitirCertificado(ctx, uid, u, troca) {
  if (!troca || !troca.cordao) return null;
  const chave = chaveDe(troca);
  const refDe = ctx.db.doc(`certificadosDe/${uid}`);
  const sd = await refDe.get();
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const ja = itens.find((i) => i.chave === chave || (troca.legado && i.cordao === troca.cordao));
  if (ja) return { ...ja, repetido: true };

  const legado = !!troca.legado;
  const data = legado ? null : (dataLocal(troca.em || new Date().toISOString()) || dataLocal(new Date().toISOString()));
  let nucleo = '';
  if (u.academiaId) { const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get(); nucleo = sn.exists ? String(sn.data().nome || '') : ''; }
  // O evento escolhido no painel (graduação em lote) vale mais que a busca pela data.
  let evento = null;
  if (!legado && troca.eventoId) {
    const se = await ctx.db.doc(`eventos/${troca.eventoId}`).get();
    if (se.exists && se.data().nome) evento = { nome: String(se.data().nome).slice(0, 120), local: String(se.data().local || '').slice(0, 120), data: se.data().data || data };
  }
  if (!legado && !evento) evento = await eventoDaTroca(ctx, data, u.academiaId || null);
  const assinaturas = await assinaturasDoCertificado(ctx, u);
  const si = await ctx.db.doc(`carteirinhasIndice/${uid}`).get();
  const matricula = si.exists ? String(si.data().matricula || '') : '';
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
    cores: coresDoCordao(troca.cordao, u), nucleo, data, evento, assinaturas, menor, legado, matricula,
    grupo: ESCOLA.nome, ativo: true, emitidoEm: agora.toISOString(),
  };
  await ctx.db.doc(`certificados/${codigo}`).set(pub);
  const item = { codigo, numero, cordao: troca.cordao, anterior: troca.anterior || null, data, evento: evento ? evento.nome : '', chave, legado };
  await refDe.set({ itens: itens.concat([item]).slice(-40), atualizadoEm: agora.toISOString() }, { merge: true });
  await publicarNoPerfil(ctx, uid);
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

// Garante um certificado para CADA cordão da escada até o atual. Troca registrada
// no app (com data) → certificado com data e evento; cordão que o atleta já tinha
// antes do app → certificado sem data ("legado"). Não avisa ninguém.
// Chamado na troca de cordão, no cadastro e pela rotina da madrugada.
export async function garantirCertificados(ctx, uid, u) {
  const escada = escadaDe(u).map((c) => c.nome);
  const idx = escada.indexOf(u.cordaoAtual || 'Iniciante');
  if (idx <= 0) return 0;
  const sd = await ctx.db.doc(`certificadosDe/${uid}`).get();
  const tem = new Set((sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : []).map((i) => i.cordao));
  const hist = Array.isArray(u.historicoGraduacoes) ? u.historicoGraduacoes : [];
  let n = 0;
  for (let i = 1; i <= idx; i++) {
    const cordao = escada[i];
    if (tem.has(cordao)) continue;
    const h = hist.filter((x) => x && x.cordao === cordao && !x.legado && x.em).pop();
    await emitirCertificado(ctx, uid, u, h || { cordao, anterior: escada[i - 1], legado: true });
    n++;
  }
  if (n) await publicarNoPerfil(ctx, uid);
  return n;
}
export const conferirCertificados = garantirCertificados; // nome antigo (rotina)

// Galeria/trajetória da Rede: a lista (sem dados pessoais) vai para o cartão público.
export async function publicarNoPerfil(ctx, uid) {
  const [sd, sp] = await Promise.all([ctx.db.doc(`certificadosDe/${uid}`).get(), ctx.db.doc(`perfisPublicos/${uid}`).get()]);
  if (!sp.exists) return;
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const lista = itens.map((i) => ({ codigo: i.codigo, cordao: i.cordao, ...(i.graus ? { graus: i.graus } : {}), data: i.data || null, legado: !!i.legado, evento: i.evento || '' }));
  await ctx.db.doc(`perfisPublicos/${uid}`).set({ certificados: lista }, { mergeFields: ['certificados'] });
}

// Graduação desfeita: cordões ACIMA do atual perdem o certificado (inclusive os sem data).
export async function cancelarAcimaDe(ctx, uid, u, cordaoAtual, motivo = '') {
  const escada = escadaDe(u).map((c) => c.nome);
  const idx = escada.indexOf(cordaoAtual || 'Iniciante');
  const sd = await ctx.db.doc(`certificadosDe/${uid}`).get();
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const cancelados = [];
  for (const i of itens.filter((x) => escada.indexOf(x.cordao) > idx)) { cancelados.push(await cancelarCertificado(ctx, uid, i.chave, motivo)); }
  return cancelados.filter(Boolean);
}

// Cordão VOLTOU (a professora baixou no prontuário, ou o Admin desfez): tudo o
// que é de graduação acima do cordão atual sai — certificados (ficam CANCELADOS
// para quem ler o QR impresso), as trocas da trajetória (a Rede e o brasão de
// "graduações" param de contar), a festa que ainda não apareceu e o lembrete.
// Os brasões de cordão somem sozinhos no recálculo do cartão (vêm do cordão atual).
// Idempotente: roda no gatilho, na rotina da madrugada e na migração.
export async function alinharAoCordaoAtual(ctx, uid, u, motivo = '') {
  const escada = escadaDe(u).map((c) => c.nome);
  const atual = u.cordaoAtual || 'Iniciante';
  const idx = Math.max(0, escada.indexOf(atual));
  const acima = (nome) => escada.indexOf(nome) > idx;
  const texto = motivo || `Cordão voltou para ${atual}`;
  const cancelados = await cancelarAcimaDe(ctx, uid, u, atual, texto);
  const hist = Array.isArray(u.historicoGraduacoes) ? u.historicoGraduacoes : [];
  // Sai também a "troca para baixo" que o prontuário antigo gravava (não é graduação).
  const rebaixou = (h) => h.anterior && escada.indexOf(h.cordao) < escada.indexOf(h.anterior);
  const sai = hist.filter((h) => h && (acima(h.cordao) || rebaixou(h)));
  if (sai.length) {
    await ctx.db.doc(`usuarios/${uid}`).update({ historicoGraduacoes: hist.filter((h) => !sai.includes(h)) });
    for (const h of sai) {
      const idAviso = idAvisoCordao(h, uid);
      for (const dono of [uid, u.responsavelUid].filter(Boolean)) {
        await ctx.db.doc(`notificacoes/${dono}/itens/${idAviso}`).delete().catch(() => {});
        await ctx.db.doc(`notificacoes/${dono}/itens/lembrete_${idAviso}`).delete().catch(() => {});
      }
      await ctx.db.doc(`lembretes/${idAviso}`).delete().catch(() => {});
    }
  }
  return { certificados: cancelados.length, trocas: sai.length };
}

// ---------- lembrete "compartilhe o seu card" (dia seguinte ao batizado) ----------
export async function agendarLembrete(ctx, uid, idAviso, dados) {
  await ctx.db.doc(`lembretes/${idAviso}`).set({ uid, notifId: idAviso, quando: new Date(Date.now() + 6 * 3600000).toISOString(), ...dados });
}
// Todo dia de manhã: quem ainda não compartilhou a troca de cordão recebe um lembrete (uma vez).
export async function processarLembretes(ctx) {
  const s = await ctx.db.collection('lembretes').where('quando', '<=', new Date().toISOString()).limit(300).get();
  let enviados = 0;
  for (const d of s.docs) {
    const l = d.data();
    const sn = await ctx.db.doc(`notificacoes/${l.uid}/itens/${l.notifId}`).get();
    if (sn.exists && !sn.data().compartilhadoEm) {
      await notificar(ctx, [l.uid], {
        tipo: 'cordao_lembrete', titulo: 'Mostre o seu novo cordão!', texto: `Compartilhe o card "Troquei de cordão!" do Cordão ${l.cordao || ''} com a família e os amigos.`,
        link: l.certificado ? `certificado.html#${l.certificado}` : 'app.html',
        cordao: l.cordao || '', cores: l.cores || null, certificado: l.certificado || '', atletaUid: l.uid, atletaNome: l.atletaNome || '', evento: l.evento || '',
      }, { idFixo: `lembrete_${l.notifId}` });
      enviados++;
    }
    await d.ref.delete();
  }
  return enviados;
}

// Id fixo do aviso "Troquei de cordão" de uma troca (o mesmo para gatilho reentregue e para desfazer).
export const idAvisoCordao = (troca, uid) => `cordao_${String((troca && troca.cordao) || '').replace(/[^A-Za-z0-9]/g, '')}_${String((troca && troca.em) || '').replace(/[^0-9]/g, '').slice(0, 14)}_${uid}`;

// Graduação desfeita pelo Admin: o certificado fica CANCELADO (quem ler o QR de
// uma impressão antiga vê "cancelado") e sai da lista do atleta.
export async function cancelarCertificado(ctx, uid, chave, motivo = '') {
  const refDe = ctx.db.doc(`certificadosDe/${uid}`);
  const sd = await refDe.get();
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const alvo = itens.find((i) => i.chave === chave);
  if (!alvo) return null;
  await ctx.db.doc(`certificados/${alvo.codigo}`).set({ ativo: false, canceladoEm: new Date().toISOString(), motivoCancelamento: String(motivo || '').slice(0, 200) }, { merge: true });
  await refDe.set({ itens: itens.filter((i) => i.chave !== chave), atualizadoEm: new Date().toISOString() }, { merge: true });
  await publicarNoPerfil(ctx, uid);
  return alvo.codigo;
}
