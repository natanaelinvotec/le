// Cartão público (perfisPublicos/{uid}) calculado NO SERVIDOR.
//
// Antes o próprio app de cada pessoa calculava presenças, brasões e cordão e
// gravava no cartão público — dava para "se dar" um brasão chamando a API
// direto. Agora as regras só deixam a pessoa mexer em bio/capa/privacidade, e
// tudo o que vale conquista vem daqui, lido das fontes reais:
//   usuarios/{uid}  → nome, foto, cordão, graduações, núcleo, papéis, concessões
//   presencas       → resumoPresencas (Face ID / painel)
//   posts           → resumoRede (publicações, melhores momentos, curtidas)
//   usuarios do núcleo que administra → resumoFormacao (alunos que graduou, núcleo completo, roda inclusiva)
//   pagamentos      → resumoCompromisso (meses seguidos de mensalidade paga)
//   certificados, carteirinha, seguidores, apresentação e assinatura → brasões 46–71
import { avaliar, consolidar, resumirPresencas, porId, carteirinhaEmDia, beneficiariosDe } from './compartilhado/brasoes.js';
import { ESCOLA_PADRAO } from './escolas.js';
import { prontidao } from './compartilhado/escola.js';
import { notificar } from './notificar.js';
import { escadaDaEscola } from './escada-escola.js';

// Campos de usuarios/{uid} que mudam o cartão público. Mudança só em outros
// campos (seguindo, salvos, faceDescriptor, brasoesTotal…) não recalcula nada.
export const CAMPOS_DO_CARTAO = [
  'nome', 'fotoUrl', 'cordaoAtual', 'grausAtual', 'idade', 'academiaId', 'academiaNome', 'academiaGerenciadaId', 'papeis',
  'acessoGeral', 'usoImagem', 'historicoGraduacoes', 'notas', 'criadoEm', 'brasoesManuais', 'brasoesAdmin', 'brasoesBloqueados', 'ativo',
  'carteirinha', 'dataNasc', 'isentoMensalidade', 'eventosConfirmados', 'cardsCompartilhados', // brasões 46–71
  'competicoes', // brasões 72–74 (campeonatos)
  'sincronizarEm', // o app pede um recálculo completo quando o cartão está velho
];

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Idade: pela data de nascimento quando existe (AAAA-MM-DD); senão o campo idade.
export function idadeDe(u, hoje = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String((u && u.dataNasc) || ''));
  if (m) {
    let a = hoje.getUTCFullYear() - Number(m[1]);
    const mes = hoje.getUTCMonth() + 1; const dia = hoje.getUTCDate();
    if (mes < Number(m[2]) || (mes === Number(m[2]) && dia < Number(m[3]))) a -= 1;
    if (a >= 0 && a < 120) return a;
  }
  return Number(u && u.idade) || 0;
}
export const ehMenor = (u) => { const i = idadeDe(u); return i > 0 && i < 18; };
export const usoImagemOk = (u) => {
  const v = String((u && u.usoImagem) || '').toUpperCase();
  return v.startsWith('AUTORIZO') && !v.startsWith('NÃO') && !v.startsWith('NAO');
};

// Configuração dos brasões + as duas âncoras do Fundador (mesma regra do app):
// núcleo do Fundador e a trava do Presidente do Grupo.
export async function carregarConfigBrasoes(ctx) {
  if (ctx._cfgBrasoes) return ctx._cfgBrasoes;
  const s = await ctx.db.doc('config/brasoes').get();
  const cfg = { ...(s.exists ? s.data() : {}) };
  if (!cfg.nucleoFundadorId || !cfg.presidenteUid) {
    // Fundador da escola nº 1 (os certificados com brasão são dela) — não um dono de outra escola.
    const f0 = await ctx.db.collection('usuarios').where('acessoGeral', '==', true).limit(20).get();
    const f = { docs: f0.docs.filter((d) => (d.data().escolaId || ESCOLA_PADRAO) === ESCOLA_PADRAO) };
    // O Fundador é quem tem Acesso Geral E administra um núcleo.
    const fund = f.docs.find((d) => d.data().academiaGerenciadaId) || f.docs[0];
    if (fund) {
      if (!cfg.nucleoFundadorId && fund.data().academiaGerenciadaId) cfg.nucleoFundadorId = fund.data().academiaGerenciadaId;
      if (!cfg.presidenteUid && cfg.nucleoFundadorId) {
        const n = await ctx.db.doc(`nucleos/${cfg.nucleoFundadorId}`).get();
        cfg.presidenteUid = (n.exists && n.data().professorUid) || fund.id;
      }
    }
  }
  ctx._cfgBrasoes = cfg;
  return cfg;
}

export async function calcularResumoPresencas(ctx, uid, dataNasc = null) {
  const snap = await ctx.db.collection('presencas').where('uid', '==', uid).limit(400).get();
  return resumirPresencas(snap.docs.map((d) => d.data()), dataNasc);
}

// Meses SEGUIDOS com mensalidade paga, contando para trás a partir do mês atual
// (ou do anterior, se o atual ainda não foi pago). Bolsista (isentoMensalidade):
// conta os meses desde a entrada no grupo. Núcleo que não lança mensalidade no
// app: 0 (o brasão fica bloqueado, sem "chutar").
export function mesesSeguidosPagos(pagamentos, { isento = false, criadoEm = null, hoje = new Date() } = {}) {
  const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const voltar = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
  if (isento) {
    if (!criadoEm) return 0;
    const c = new Date(criadoEm); if (isNaN(c)) return 0;
    return Math.max(0, (hoje.getFullYear() - c.getFullYear()) * 12 + hoje.getMonth() - c.getMonth());
  }
  const pagos = new Set((pagamentos || []).filter((p) => p && p.pago === true && (p.tipo || 'mensalidade') !== 'adicional' && /^\d{4}-\d{2}$/.test(String(p.competencia || ''))).map((p) => p.competencia));
  if (!pagos.size) return 0;
  let d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  if (!pagos.has(chave(d))) d = voltar(d); // o mês atual pode ainda não ter vencido
  let n = 0;
  while (pagos.has(chave(d)) && n < 240) { n++; d = voltar(d); }
  return n;
}
// Auditoria 08/10: só valem mensalidades lançadas pelo núcleo do aluno (o atual ou o de onde
// veio transferido), da mesma escola, e com competência até 12 meses à frente. Antes, o
// responsável de QUALQUER núcleo lançava "pago até 2099" para qualquer aluno (carteirinha
// válida para sempre e brasões de mensalidade).
export function pagamentosValidos(pags, u, hoje = new Date()) {
  const limite = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 12, 1)).toISOString().slice(0, 7);
  const nucleos = new Set([u && u.academiaId, u && u.academiaAnteriorId].filter(Boolean));
  return (pags || []).filter((p) => p &&
    (!p.academiaId || nucleos.has(p.academiaId)) &&
    (!p.escolaId || !u || !u.escolaId || p.escolaId === u.escolaId) &&
    String(p.competencia || '') <= limite);
}
export async function calcularResumoCompromisso(ctx, uid, u) {
  const snap = await ctx.db.collection('pagamentos').where('alunoId', '==', uid).limit(400).get();
  return { mesesSeguidos: mesesSeguidosPagos(pagamentosValidos(snap.docs.map((d) => d.data()), u), { isento: u.isentoMensalidade === true, criadoEm: u.criadoEm || null }), calculadoEm: new Date().toISOString() };
}

export async function calcularResumoRede(ctx, uid) {
  const snap = await ctx.db.collection('posts').where('autorUid', '==', uid).limit(300).get();
  const meus = snap.docs.map((d) => d.data()).filter((p) => p.oculto !== true);
  return {
    posts: meus.length,
    momentos: meus.filter((p) => p.melhorMomento).length,
    curtidas: meus.reduce((s, p) => s + ((p.curtidas || []).length), 0),
    calculadoEm: new Date().toISOString(),
  };
}

export async function calcularResumoFormacao(ctx, uid, academiaGerenciadaId) {
  if (!academiaGerenciadaId) return null;
  const snap = await ctx.db.collection('usuarios').where('academiaId', '==', academiaGerenciadaId).limit(400).get();
  const formados = snap.docs.filter((d) => d.id !== uid && (d.data().historicoGraduacoes || []).some((h) => h && h.por === uid && !h.legado)).length; // "já tinha" (antes do app) não conta como formado
  // Núcleo completo: todo atleta ATIVO do núcleo com foto de carteirinha aprovada e data de nascimento (mínimo 3).
  const atletas = snap.docs.map((d) => d.data()).filter((x) => Array.isArray(x.papeis) && x.papeis.some((p) => ['aluno', 'instrutor', 'mestre'].includes(p)) && x.ativo !== false && x.statusAtual !== 'Inativo');
  const completo = (x) => !!(x.carteirinha && x.carteirinha.fotoAprovada === true) && /^\d{4}-\d{2}-\d{2}/.test(String(x.dataNasc || ''));
  const nucleoCompleto = atletas.length >= 3 && atletas.every(completo);
  // Roda Inclusiva (brasão 75): atleta ATIVO com alguma condição em usuarios.inclusao e cadastro há ≥ 180 dias.
  // Só o TOTAL vai para o cartão público — quem é cada um fica no documento privado do atleta (LGPD).
  const comInclusao = (x) => !!(x.inclusao && Array.isArray(x.inclusao.condicoes) && x.inclusao.condicoes.length);
  const seisMeses = Date.now() - 180 * 86400000;
  const atletasInclusao = atletas.filter(comInclusao).length;
  const rodaInclusiva = atletas.some((x) => comInclusao(x) && x.criadoEm && new Date(x.criadoEm).getTime() <= seisMeses);
  return { formados, nucleoCompleto, atletas: atletas.length, completos: atletas.filter(completo).length, atletasInclusao, rodaInclusiva, calculadoEm: new Date().toISOString() };
}

// Recalcula e grava o cartão público. `refazer` escolhe quais resumos buscar
// de novo nas fontes (o resto reaproveita o que já está no cartão):
//   { presencas, rede, formacao } — padrão: só recalcula o que ainda não existe.
export async function sincronizarPerfil(ctx, uid, refazer = {}) {
  const [su, sp] = await Promise.all([ctx.db.doc(`usuarios/${uid}`).get(), ctx.db.doc(`perfisPublicos/${uid}`).get()]);
  if (!su.exists) {
    if (sp.exists) await ctx.db.doc(`perfisPublicos/${uid}`).delete();
    return { removido: true };
  }
  const u = su.data();
  const pub = sp.exists ? sp.data() : null;
  const cfg = await carregarConfigBrasoes(ctx);
  const papeis = Array.isArray(u.papeis) ? u.papeis : [];
  const menor = ehMenor(u);
  // Auditoria 08/10: o cartão público é lido por toda a escola — de menor não sai a idade
  // exata (só "kids", que escolhe a escada infantil) nem a foto sem o termo de imagem.
  const idadeReal = idadeDe(u);
  let idadeKids = 12; // escola nº 1 (capoeira)
  if ((u.escolaId || ESCOLA_PADRAO) !== ESCOLA_PADRAO) {
    try { const esc = await escadaDaEscola(ctx, u.escolaId); idadeKids = esc && esc.kids ? (Number(esc.idadeKids) || 16) : 0; } catch (e) { idadeKids = 0; }
  }
  const kids = menor && idadeKids > 0 && idadeReal > 0 && idadeReal < idadeKids;
  const fotoOk = /^(https:\/\/|data:image\/)/.test(u.fotoUrl || '') && (!menor || usoImagemOk(u));

  const resumoPresencas = (refazer.presencas || !pub || !pub.resumoPresencas || pub.resumoPresencas.treinouNoAniversario === undefined) ? await calcularResumoPresencas(ctx, uid, u.dataNasc || null) : pub.resumoPresencas;
  // Meses pagos custam uma consulta (só quando pedido ou na 1ª vez); os contadores do
  // cadastro são baratos e entram sempre — é por eles que o navegador avalia os brasões
  // de carteirinha, eventos e card compartilhado sem ler o documento privado do atleta.
  const base = (refazer.compromisso || !pub || !pub.resumoCompromisso) ? await calcularResumoCompromisso(ctx, uid, u) : pub.resumoCompromisso;
  const resumoCompromisso = {
    ...base,
    eventosConfirmados: Math.max(0, Number(u.eventosConfirmados) || 0),
    cardsCompartilhados: Math.max(0, Number(u.cardsCompartilhados) || 0),
    beneficiarios: beneficiariosDe(u.carteirinha),
    carteirinhaEmDia: carteirinhaEmDia(u.carteirinha),
  };
  // Apresentação em vídeo e assinatura dos certificados: só quem pode ter (2 leituras pequenas).
  const podeTerVideo = papeis.includes('mestre') || papeis.includes('instrutor') || u.acessoGeral === true || ['Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'].includes(u.cordaoAtual);
  const [sa, ss] = podeTerVideo ? await Promise.all([ctx.db.doc(`apresentacoes/${uid}`).get(), ctx.db.doc(`assinaturas/${uid}`).get()]) : [null, null];
  const temApresentacao = !!(sa && sa.exists && sa.data().videoUrl);
  const temAssinatura = !!(ss && ss.exists && /^https:/.test(String(ss.data().url || '')));
  const resumoRede = (refazer.rede || !pub || !pub.resumoRede) ? await calcularResumoRede(ctx, uid) : pub.resumoRede;
  let resumoFormacao = pub ? (pub.resumoFormacao || null) : null;
  if (u.academiaGerenciadaId && (refazer.formacao || !resumoFormacao)) resumoFormacao = await calcularResumoFormacao(ctx, uid, u.academiaGerenciadaId);
  if (!u.academiaGerenciadaId) resumoFormacao = null;

  const dados = {
    nome: u.nome || ((u.escolaId || ESCOLA_PADRAO) === ESCOLA_PADRAO ? 'Capoeirista' : 'Atleta'),
    nomeBusca: semAcento(u.nome),
    fotoUrl: fotoOk ? u.fotoUrl : '',
    cordaoAtual: u.cordaoAtual || 'Iniciante',
    grausAtual: Math.max(0, Math.min(10, Number(u.grausAtual) || 0)), // faixas com graus (Jiu-Jitsu…)
    idade: null, // idade exata não vai para o cartão público (antes: idade do menor)
    menor,
    kids,
    escolaId: u.escolaId || ESCOLA_PADRAO, // rede da escola x aba Global
    academiaId: u.academiaId || null,
    academiaNome: u.academiaNome || '',
    academiaGerenciadaId: u.academiaGerenciadaId || null,
    mestre: papeis.includes('mestre'),
    instrutor: papeis.includes('instrutor'),
    fundador: u.acessoGeral === true,
    usoImagemOk: usoImagemOk(u),
    historicoGraduacoes: Array.isArray(u.historicoGraduacoes) ? u.historicoGraduacoes : [],
    prontidao: prontidao(u),
    criadoEm: u.criadoEm || null,
    resumoPresencas,
    resumoRede,
    resumoFormacao,
    resumoCompromisso,
    // Campeonatos (só o servidor escreve usuarios.competicoes; aqui vai o resumo público).
    resumoCompeticoes: { participacoes: Number((u.competicoes || {}).participacoes) || 0, podios: Number((u.competicoes || {}).podios) || 0, titulos: Number((u.competicoes || {}).titulos) || 0 },
    temApresentacao,
    temAssinatura,
    sincronizadoEm: new Date().toISOString(),
  };
  if (!pub || pub.privado === undefined) dados.privado = menor; // menor nasce privado
  if (!pub) { dados.seguidores = []; dados.pedidosSeguir = []; }

  const avaliacao = avaliar({
    ...dados, uid, brasoesManuais: u.brasoesManuais || {}, brasoesAdmin: u.brasoesAdmin || {}, brasoesBloqueados: u.brasoesBloqueados || {}, brasoes: (pub && pub.brasoes) || {},
    // Fontes dos brasões 46–71 (dados reais do cadastro e do cartão público).
    certificados: (pub && Array.isArray(pub.certificados)) ? pub.certificados : [],
    carteirinha: u.carteirinha || null, cardsCompartilhados: Number(u.cardsCompartilhados) || 0, eventosConfirmados: Number(u.eventosConfirmados) || 0,
    seguidoresTotal: (pub && Array.isArray(pub.seguidores)) ? pub.seguidores.length : 0, capaUrl: (pub && pub.capaUrl) || '', bio: (pub && pub.bio) || '',
  }, cfg);
  const cons = consolidar(avaliacao, (pub && pub.brasoes) || {});
  dados.brasoes = cons.mapa;
  dados.brasoesTotal = cons.total;

  // mergeFields: cada campo é SUBSTITUÍDO inteiro (um brasão revogado sai do mapa).
  await ctx.db.doc(`perfisPublicos/${uid}`).set(dados, { mergeFields: Object.keys(dados) });
  if ((u.brasoesTotal || 0) !== cons.total) await ctx.db.doc(`usuarios/${uid}`).update({ brasoesTotal: cons.total });

  // Brasão novo → notificação (a 1ª sincronização não faz festa de tudo de uma vez).
  const novos = pub && pub.brasoes ? cons.novos : [];
  if (novos.length) {
    const nomes = novos.map((id) => (porId(id) || {}).nome || id);
    await notificar(ctx, [uid], {
      tipo: 'brasao', titulo: novos.length > 1 ? `${novos.length} brasões novos!` : 'Brasão novo!',
      texto: nomes.slice(0, 3).join(', ') + (nomes.length > 3 ? '…' : ''), link: `rede.html#brasoes/${uid}`, brasoes: novos,
    });
  }
  return { dados, novos };
}

// Ajuste leve depois de uma curtida: soma no resumo (sem reler os posts) e reavalia.
export async function somarCurtidas(ctx, uid, delta) {
  if (!delta) return null;
  const sp = await ctx.db.doc(`perfisPublicos/${uid}`).get();
  if (!sp.exists || !sp.data().resumoRede) return sincronizarPerfil(ctx, uid, { rede: true });
  const r = sp.data().resumoRede;
  await ctx.db.doc(`perfisPublicos/${uid}`).update({ resumoRede: { ...r, curtidas: Math.max(0, (r.curtidas || 0) + delta) } });
  return sincronizarPerfil(ctx, uid);
}
