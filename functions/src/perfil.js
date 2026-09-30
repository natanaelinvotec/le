// Cartão público (perfisPublicos/{uid}) calculado NO SERVIDOR.
//
// Antes o próprio app de cada pessoa calculava presenças, brasões e cordão e
// gravava no cartão público — dava para "se dar" um brasão chamando a API
// direto. Agora as regras só deixam a pessoa mexer em bio/capa/privacidade, e
// tudo o que vale conquista vem daqui, lido das fontes reais:
//   usuarios/{uid}  → nome, foto, cordão, graduações, núcleo, papéis, concessões
//   presencas       → resumoPresencas (Face ID / painel)
//   posts           → resumoRede (publicações, melhores momentos, curtidas)
//   usuarios do núcleo que administra → resumoFormacao (alunos que graduou)
import { avaliar, consolidar, resumirPresencas, porId } from './compartilhado/brasoes.js';
import { prontidao } from './compartilhado/escola.js';
import { notificar } from './notificar.js';

// Campos de usuarios/{uid} que mudam o cartão público. Mudança só em outros
// campos (seguindo, salvos, faceDescriptor, brasoesTotal…) não recalcula nada.
export const CAMPOS_DO_CARTAO = [
  'nome', 'fotoUrl', 'cordaoAtual', 'idade', 'academiaId', 'academiaNome', 'academiaGerenciadaId', 'papeis',
  'acessoGeral', 'usoImagem', 'historicoGraduacoes', 'notas', 'criadoEm', 'brasoesManuais', 'brasoesAdmin', 'ativo',
  'sincronizarEm', // o app pede um recálculo completo quando o cartão está velho
];

const semAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const ehMenor = (u) => Number(u && u.idade) > 0 && Number(u.idade) < 18;
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
    const f = await ctx.db.collection('usuarios').where('acessoGeral', '==', true).limit(5).get();
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

export async function calcularResumoPresencas(ctx, uid) {
  const snap = await ctx.db.collection('presencas').where('uid', '==', uid).limit(400).get();
  return resumirPresencas(snap.docs.map((d) => d.data()));
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
  return { formados, calculadoEm: new Date().toISOString() };
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

  const resumoPresencas = (refazer.presencas || !pub || !pub.resumoPresencas) ? await calcularResumoPresencas(ctx, uid) : pub.resumoPresencas;
  const resumoRede = (refazer.rede || !pub || !pub.resumoRede) ? await calcularResumoRede(ctx, uid) : pub.resumoRede;
  let resumoFormacao = pub ? (pub.resumoFormacao || null) : null;
  if (u.academiaGerenciadaId && (refazer.formacao || !resumoFormacao)) resumoFormacao = await calcularResumoFormacao(ctx, uid, u.academiaGerenciadaId);
  if (!u.academiaGerenciadaId) resumoFormacao = null;

  const dados = {
    nome: u.nome || 'Capoeirista',
    nomeBusca: semAcento(u.nome),
    fotoUrl: /^(https:\/\/|data:image\/)/.test(u.fotoUrl || '') ? u.fotoUrl : '',
    cordaoAtual: u.cordaoAtual || 'Iniciante',
    idade: menor ? (Number(u.idade) || 0) : null, // idade só escolhe a escada kids; adulto não expõe
    menor,
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
    sincronizadoEm: new Date().toISOString(),
  };
  if (!pub || pub.privado === undefined) dados.privado = menor; // menor nasce privado
  if (!pub) { dados.seguidores = []; dados.pedidosSeguir = []; }

  const avaliacao = avaliar({ ...dados, uid, brasoesManuais: u.brasoesManuais || {}, brasoesAdmin: u.brasoesAdmin || {}, brasoes: (pub && pub.brasoes) || {} }, cfg);
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
