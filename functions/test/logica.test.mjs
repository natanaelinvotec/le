// Testes da lógica das Cloud Functions (sem Firebase de verdade): node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb, criarMessaging, criarBucket } from './fake-admin.mjs';
import { sincronizarPerfil } from '../src/perfil.js';
import * as G from '../src/gatilhos.js';
import { registrar } from '../src/auditoria.js';
import { executarMigracoes, excluirConta, rotinaDiaria } from '../src/rotinas.js';
import { termosOfensivos } from '../src/compartilhado/moderacao.js';
import { motivosSafeSearch, urlParaGs } from '../src/moderacao.js';

const DIA = 86400000;
const agoIso = (ms) => new Date(Date.now() - ms).toISOString();
function base(extra = {}) {
  return {
    usuarios: {
      admin: { nome: 'Admin Master', papeis: ['admin'], academiaId: null },
      profeta: { nome: 'Isaias Ramos', papeis: ['aluno', 'mestre'], acessoGeral: true, academiaId: 'profeta', academiaGerenciadaId: 'profeta', cordaoAtual: 'Mestre/Presidente', idade: 58 },
      tay: { nome: 'Taynara Jacques', papeis: ['aluno', 'mestre'], academiaId: 'profeta', academiaGerenciadaId: 'taynara', cordaoAtual: 'Professor', idade: 26, usoImagem: 'AUTORIZO' },
      nat: { nome: 'Natanael Silva', papeis: ['aluno'], academiaId: 'taynara', academiaNome: 'Academia Professora Taynara', cordaoAtual: 'Quilombola', idade: 30, notas: { c1: 8, c3: 7 }, usoImagem: 'AUTORIZO', criadoEm: '2024-01-01T00:00:00.000Z' },
      kid: { nome: 'Teste Kid', papeis: ['aluno'], academiaId: 'taynara', cordaoAtual: 'Iniciante', idade: 10, usoImagem: 'NÃO AUTORIZO', responsavelUid: 'mae' },
      mae: { nome: 'Mãe do Kid', papeis: ['aluno'], academiaId: 'taynara', idade: 40 },
    },
    nucleos: { profeta: { nome: 'Academia Mestre Profeta', professorUid: 'profeta' }, taynara: { nome: 'Academia Professora Taynara', professorUid: 'tay' } },
    config: { brasoes: {} },
    ...extra,
  };
}
function ctxDe(inicial) {
  const f = criarDb(inicial);
  const messaging = criarMessaging(); const bucket = criarBucket();
  return { f, ctx: { db: f.db, messaging, bucket, vision: null, log: { warn() {} } }, messaging, bucket };
}
const notifs = (f, uid) => Object.values(f.lerCol(`notificacoes/${uid}/itens`));

test('cartão público calculado no servidor: presenças, brasões, menor privado', async () => {
  const { f, ctx } = ctxDe(base({ presencas: { p1: { uid: 'nat', nucleoId: 'taynara', entradaEm: agoIso(DIA) }, p2: { uid: 'nat', nucleoId: 'taynara', nucleoVisitadoId: 'profeta', entradaEm: agoIso(8 * DIA) } } }));
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  const pub = f.ler('perfisPublicos/nat');
  assert.equal(pub.nome, 'Natanael Silva');
  assert.equal(pub.cordaoAtual, 'Quilombola');
  assert.equal(pub.resumoPresencas.total, 2);
  assert.equal(pub.menor, false);
  assert.equal(pub.privado, false);
  assert.ok(pub.brasoes['primeira-presenca'], 'ganhou 1ª presença');
  assert.ok(pub.brasoes['quilombola'] && pub.brasoes['iniciante'], 'cordões cumulativos');
  assert.ok(pub.brasoes['um-nucleo'] && pub.brasoes['sede-do-fundador'], 'visitou o núcleo do Fundador');
  assert.ok(pub.brasoes['aniversario-de-capoeira'], 'mais de 1 ano no grupo');
  assert.equal(f.ler('usuarios/nat').brasoesTotal, pub.brasoesTotal);
  assert.equal(notifs(f, 'nat').length, 0, 'a 1ª sincronização não notifica');
  await sincronizarPerfil(ctx, 'kid');
  const kid = f.ler('perfisPublicos/kid');
  assert.equal(kid.menor, true); assert.equal(kid.privado, true); assert.equal(kid.idade, 10); assert.equal(kid.usoImagemOk, false);
});

test('concessão do Admin vira brasão + notificação; Presidente não se concede', async () => {
  const { f, ctx } = ctxDe(base());
  await sincronizarPerfil(ctx, 'nat');
  const antes = f.ler('usuarios/nat');
  const depois = { ...antes, brasoesAdmin: { 'cem-presencas': { em: '2026-09-01T00:00:00.000Z', porNome: 'Admin' }, 'mestre-fundador': { em: '2026-09-01T00:00:00.000Z' } } };
  await f.db.doc('usuarios/nat').set(depois);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois, authId: 'admin', authType: 'app_user' });
  const pub = f.ler('perfisPublicos/nat');
  assert.ok(pub.brasoes['cem-presencas'] && pub.brasoes['cem-presencas'].admin);
  assert.equal(pub.brasoes['mestre-fundador'], undefined, 'Presidente travado');
  const n = notifs(f, 'nat'); assert.equal(n.length, 1); assert.equal(n[0].tipo, 'brasao');
  const aud = Object.values(f.lerCol('auditoria')); assert.equal(aud.length, 1); assert.deepEqual(aud[0].campos, ['brasoesAdmin']); assert.equal(aud[0].quemNome, 'Admin Master');
  // revogar: o brasão SAI do mapa (antes o merge deixava ele lá)
  const semConcessao = { ...depois, brasoesAdmin: {} };
  await f.db.doc('usuarios/nat').set(semConcessao);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: depois, depois: semConcessao, authId: 'admin', authType: 'app_user' });
  assert.equal(f.ler('perfisPublicos/nat').brasoes['cem-presencas'], undefined);
});

test('Fundador tem o brasão de Presidente; outro com acessoGeral não', async () => {
  const ini = base(); ini.usuarios.outro = { nome: 'Outro', papeis: ['aluno'], acessoGeral: true, academiaId: 'taynara' };
  const { f, ctx } = ctxDe(ini);
  await sincronizarPerfil(ctx, 'profeta'); await sincronizarPerfil(ctx, 'outro');
  assert.ok(f.ler('perfisPublicos/profeta').brasoes['mestre-fundador']);
  assert.equal(f.ler('perfisPublicos/outro').brasoes['mestre-fundador'], undefined);
});

test('post com palavrão vai para revisão e avisa responsável, Admin e autor', async () => {
  const { f, ctx } = ctxDe(base({ posts: { p1: { autorUid: 'nat', autorNome: 'Natanael Silva', autorAcademiaId: 'taynara', nucleoId: 'taynara', texto: 'que treino da p0rr4', midias: [], revisao: 'ok', publico: true, oculto: false, curtidas: [] } } }));
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: null, depois: f.ler('posts/p1'), authId: 'nat', authType: 'app_user' });
  const p = f.ler('posts/p1');
  assert.equal(p.revisao, 'pendente'); assert.equal(p.publico, false); assert.match(p.moderacaoAuto.motivos[0], /porra/);
  assert.equal(notifs(f, 'tay').length, 1); assert.equal(notifs(f, 'admin').length, 1); assert.equal(notifs(f, 'nat').length, 1);
  assert.equal(f.ler('perfisPublicos/nat').resumoRede.posts, 1);
});

test('imagem imprópria (Vision) vai para revisão; capoeira comum passa', async () => {
  const url = 'https://firebasestorage.googleapis.com/v0/b/b1/o/rede%2Fnat%2Ffoto.jpg?alt=media&token=x';
  assert.equal(urlParaGs(url), 'gs://b1/rede/nat/foto.jpg');
  assert.deepEqual(motivosSafeSearch({ adult: 'VERY_UNLIKELY', violence: 'LIKELY', racy: 'VERY_LIKELY' }), []);
  const { f, ctx } = ctxDe(base({ posts: { p1: { autorUid: 'nat', autorNome: 'Nat', texto: 'roda', midias: [{ url, tipo: 'imagem' }], revisao: 'ok', publico: true, oculto: false, curtidas: [] } } }));
  ctx.vision = async (gs) => gs.map(() => ({ safeSearchAnnotation: { adult: 'LIKELY', violence: 'UNLIKELY' } }));
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: null, depois: f.ler('posts/p1') });
  assert.equal(f.ler('posts/p1').publico, false);
  assert.deepEqual(f.ler('posts/p1').moderacaoAuto.motivos, ['imagem adulta']);
});

test('foto de menor aguardando revisão: marcados só são avisados depois da aprovação', async () => {
  const { f, ctx } = ctxDe(base({ posts: { p1: { autorUid: 'kid', autorNome: 'Teste Kid', autorAcademiaId: 'taynara', nucleoId: 'taynara', autorMenor: true, texto: 'meu treino', midias: [{ url: 'x', tipo: 'imagem' }], marcados: [{ uid: 'nat', nome: 'Nat' }], revisao: 'pendente', publico: false, oculto: false, curtidas: [] } } }));
  const p = f.ler('posts/p1');
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: null, depois: p });
  assert.equal(notifs(f, 'tay')[0].tipo, 'revisao');
  assert.equal(notifs(f, 'nat').length, 0);
  const aprovado = { ...p, revisao: 'ok', publico: true };
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: p, depois: aprovado });
  assert.equal(notifs(f, 'nat')[0].tipo, 'marcacao');
  assert.equal(notifs(f, 'kid')[0].titulo, 'Seu post foi aprovado');
});

test('curtidas: soma no resumo, uma notificação por post, sem vibrar de novo em 15 min', async () => {
  const ini = base({ posts: { p1: { autorUid: 'nat', autorNome: 'Nat', texto: 'oi', midias: [], revisao: 'ok', publico: true, oculto: false, curtidas: [] } } });
  const { f, ctx, messaging } = ctxDe(ini);
  f.docs.set('usuarios/nat/dispositivos/d1', { token: 'tok-nat', base: 'https://le-rho.vercel.app/' });
  await sincronizarPerfil(ctx, 'nat', { rede: true });
  await sincronizarPerfil(ctx, 'tay'); await sincronizarPerfil(ctx, 'kid');
  const p0 = f.ler('posts/p1'); const p1 = { ...p0, curtidas: ['tay'] }; const p2 = { ...p0, curtidas: ['tay', 'kid'] };
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: p0, depois: p1 });
  await G.aoEscreverPost(ctx, { params: { id: 'p1' }, antes: p1, depois: p2 });
  assert.equal(f.ler('perfisPublicos/nat').resumoRede.curtidas, 2);
  const n = notifs(f, 'nat'); assert.equal(n.length, 1); assert.match(n[0].texto, /Teste e mais 1/);
  assert.equal(messaging.enviadas.length, 1, 'só um push');
  assert.equal(messaging.enviadas[0].webpush.fcmOptions.link, 'https://le-rho.vercel.app/rede.html#post/p1');
});

test('comentário ofensivo é escondido e vira denúncia; resposta e menção avisam as pessoas certas', async () => {
  const { f, ctx } = ctxDe(base({
    posts: { p1: { autorUid: 'tay', autorNome: 'Taynara', autorAcademiaId: 'profeta', texto: 'roda', revisao: 'ok', publico: true, oculto: false, curtidas: [] } },
    'posts/p1/comentarios': { c1: { autorUid: 'nat', autorNome: 'Natanael', texto: 'Shalom!' }, c2: { autorUid: 'kid', autorNome: 'Kid', texto: 'seu otário' } },
  }));
  await G.aoCriarComentario(ctx, { params: { postId: 'p1', cid: 'c2' }, depois: f.ler('posts/p1/comentarios/c2') });
  assert.equal(f.ler('posts/p1/comentarios/c2').oculto, true);
  assert.equal(Object.values(f.lerCol('denuncias'))[0].tipoAlvo, 'comentario');
  f.docs.set('posts/p1/comentarios/c3', { autorUid: 'mae', autorNome: 'Mãe', texto: '@Natanael valeu', respostaA: 'c1', mencoes: [{ uid: 'profeta', nome: 'Isaias' }] });
  await G.aoCriarComentario(ctx, { params: { postId: 'p1', cid: 'c3' }, depois: f.ler('posts/p1/comentarios/c3') });
  assert.equal(notifs(f, 'nat')[0].tipo, 'resposta');
  assert.equal(notifs(f, 'profeta')[0].tipo, 'mencao');
  assert.equal(notifs(f, 'tay')[0].tipo, 'comentario');
});

test('conversa com menor: o responsável legal acompanha; mensagem avisa o outro', async () => {
  const { f, ctx } = ctxDe(base({ conversas: { 'kid__tay': { tipo: 'direta', participantes: ['kid', 'tay'], envolveMenor: true } } }));
  await G.aoCriarConversa(ctx, { params: { id: 'kid__tay' }, depois: f.ler('conversas/kid__tay') });
  assert.deepEqual(f.ler('conversas/kid__tay').responsaveisIds, ['mae']);
  await G.aoCriarMensagem(ctx, { params: { id: 'kid__tay', mid: 'm1' }, depois: { autorUid: 'tay', autorNome: 'Taynara', texto: 'Treino amanhã' } });
  assert.equal(notifs(f, 'kid')[0].tipo, 'mensagem');
  assert.equal(notifs(f, 'tay').length, 0);
  // responsável legal trocado → conversas atualizadas
  const antes = f.ler('usuarios/kid'); const depois = { ...antes, responsavelUid: 'nat' };
  await f.db.doc('usuarios/kid').set(depois);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'kid' }, antes, depois, authId: 'tay', authType: 'app_user' });
  assert.deepEqual(f.ler('conversas/kid__tay').responsaveisIds, ['nat']);
});

test('auditoria: mudança de papel registrada; escrita do servidor não; presença manual sim', async () => {
  const { f, ctx } = ctxDe(base());
  const a = f.ler('usuarios/nat');
  await registrar(ctx, { colecao: 'usuarios', docId: 'nat', antes: a, depois: { ...a, papeis: ['aluno', 'instrutor'], fotoUrl: 'x' }, authId: 'admin', authType: 'app_user' });
  await registrar(ctx, { colecao: 'usuarios', docId: 'nat', antes: a, depois: { ...a, cordaoAtual: 'Vagante' }, authId: null, authType: 'service_account' });
  await registrar(ctx, { colecao: 'presencas', docId: 'pr', antes: null, depois: { uid: 'nat', origem: 'manual' }, authId: 'tay', authType: 'app_user' });
  await registrar(ctx, { colecao: 'presencas', docId: 'pr2', antes: null, depois: { uid: 'nat', origem: 'faceid' }, authId: 'tay', authType: 'app_user' });
  const aud = Object.values(f.lerCol('auditoria'));
  assert.equal(aud.length, 2);
  assert.ok(aud.some((x) => x.resumo === 'Admin Master alterou cadastro (Natanael Silva): papeis'));
});

test('push: token vencido é apagado', async () => {
  const { f, ctx } = ctxDe(base());
  f.docs.set('usuarios/nat/dispositivos/d1', { token: 'token-vencido', base: 'https://x.app/' });
  f.docs.set('usuarios/nat/dispositivos/d2', { token: 'bom', base: 'https://x.app/' });
  const { notificar } = await import('../src/notificar.js');
  const r = await notificar(ctx, ['nat'], { tipo: 'aviso', titulo: 'Oi', texto: 't', link: 'app.html' });
  assert.equal(r.enviadas, 1);
  assert.equal(f.ler('usuarios/nat/dispositivos/d1'), undefined);
  // quem desligou o push só recebe na central
  await f.db.doc('usuarios/nat').update({ notificacoesPush: false });
  const r2 = await notificar(ctx, ['nat'], { tipo: 'aviso', titulo: 'Oi 2', texto: 't', link: 'app.html' });
  assert.equal(r2.enviadas, 0); assert.equal(notifs(f, 'nat').length, 2);
});

test('migrações: posts ganham publico/oculto, foto base64 vai pro Storage, marca e não repete', async () => {
  const ini = base({ posts: { a: { autorUid: 'nat', texto: 'x' }, b: { autorUid: 'nat', texto: 'y', revisao: 'pendente' }, c: { autorUid: 'nat', texto: 'z', oculto: true } } });
  ini.usuarios.nat.fotoUrl = 'data:image/jpeg;base64,' + Buffer.from('foto').toString('base64');
  const { f, ctx, bucket } = ctxDe(ini);
  ctx.silencioso = true;
  const r = await executarMigracoes(ctx);
  assert.equal(r.m1_posts_publico, 3);
  assert.equal(f.ler('posts/a').publico, true); assert.equal(f.ler('posts/b').publico, false); assert.equal(f.ler('posts/c').publico, false); assert.equal(f.ler('posts/a').oculto, false);
  assert.equal(r.m2_fotos_storage, 1);
  assert.match(f.ler('usuarios/nat').fotoUrl, /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/teste\.firebasestorage\.app\/o\/fotos%2Fnat%2F/);
  assert.equal(bucket.arquivos.size, 1);
  assert.ok(f.ler('perfisPublicos/nat') && f.ler('perfisPublicos/kid'));
  const r2 = await executarMigracoes(ctx);
  assert.equal(r2.m1_posts_publico, 'já feita');
});

test('exclusão de conta (LGPD) apaga dados e anonimiza pagamentos', async () => {
  const { f, ctx, bucket } = ctxDe(base({
    posts: { p1: { autorUid: 'nat', texto: 'x' } }, 'posts/p1/comentarios': { c1: { autorUid: 'tay', texto: 'oi' } },
    presencas: { pr1: { uid: 'nat' } }, pagamentos: { g1: { alunoId: 'nat', alunoNome: 'Natanael', valor: 80 } },
    conversas: { 'nat__tay': { tipo: 'direta', participantes: ['nat', 'tay'] } }, 'conversas/nat__tay/mensagens': { m1: { autorUid: 'nat' } },
    solicitacoes: { s1: { tipo: 'exclusao_conta', solicitanteUid: 'nat', status: 'pendente' } },
  }));
  const deletados = []; ctx.auth = { deleteUser: async (u) => deletados.push(u) };
  const r = await excluirConta(ctx, 'nat', { porUid: 'admin', porNome: 'Admin Master' });
  assert.equal(r.posts, 1); assert.equal(f.ler('posts/p1'), undefined); assert.equal(f.ler('posts/p1/comentarios/c1'), undefined);
  assert.equal(f.ler('presencas/pr1'), undefined); assert.equal(f.ler('usuarios/nat'), undefined); assert.deepEqual(deletados, ['nat']);
  assert.equal(f.ler('pagamentos/g1').alunoNome, '(conta excluída)'); assert.equal(f.ler('pagamentos/g1').valor, 80);
  assert.equal(f.ler('conversas/nat__tay'), undefined);
  assert.equal(f.ler('solicitacoes/s1').status, 'concluida');
  assert.ok(bucket.apagados.includes('fotos/nat/*'));
});

test('rotina diária: apaga story vencido e notificação velha', async () => {
  const { f, ctx, bucket } = ctxDe(base({
    stories: { s1: { autorUid: 'nat', midiaUrl: 'https://firebasestorage.googleapis.com/v0/b/b/o/rede%2Fnat%2Fs.jpg?alt=media', expiraEm: agoIso(3 * DIA) }, s2: { autorUid: 'nat', midiaUrl: 'x', expiraEm: new Date(Date.now() + DIA).toISOString() } },
    'notificacoes/nat/itens': { n1: { criadoEm: agoIso(120 * DIA) }, n2: { criadoEm: agoIso(DIA) } },
  }));
  const r = await rotinaDiaria(ctx);
  assert.equal(r.storiesApagados, 1); assert.deepEqual(bucket.apagados, ['rede/nat/s.jpg']);
  assert.equal(r.notificacoesApagadas, 1); assert.ok(f.ler('notificacoes/nat/itens/n2'));
  assert.ok(r.perfis >= 6);
});

test('filtro de palavras: pega variações, não pega capoeira nem palavras parecidas', () => {
  assert.deepEqual(termosOfensivos('Que p0rr4 é essa'), ['porra']);
  assert.ok(termosOfensivos('FILHO DA PUTA').length);
  assert.deepEqual(termosOfensivos('Macaco, rolê, a roda rola e o pau do berimbau'), []);
  assert.deepEqual(termosOfensivos('computador e disputa de título'), []);
  assert.deepEqual(termosOfensivos('isso é xpto', ['xpto']), ['xpto']);
});

test('pedidos do painel: só o Admin executa', async () => {
  const { executarComando } = await import('../src/rotinas.js');
  const { f, ctx } = ctxDe(base({ comandos: { c1: { tipo: 'recalcularAtleta', uid: 'nat', porUid: 'tay', status: 'pendente' }, c2: { tipo: 'recalcularAtleta', uid: 'nat', porUid: 'admin', status: 'pendente' }, c3: { tipo: 'excluirConta', uid: 'admin', porUid: 'admin', status: 'pendente' } } }));
  await executarComando(ctx, { params: { id: 'c1' }, depois: f.ler('comandos/c1'), authId: 'tay' });
  assert.equal(f.ler('comandos/c1').status, 'negado');
  await executarComando(ctx, { params: { id: 'c2' }, depois: f.ler('comandos/c2'), authId: 'admin' });
  assert.equal(f.ler('comandos/c2').status, 'ok'); assert.ok(f.ler('perfisPublicos/nat'));
  await executarComando(ctx, { params: { id: 'c3' }, depois: f.ler('comandos/c3'), authId: 'admin' });
  assert.equal(f.ler('comandos/c3').status, 'erro'); assert.ok(f.ler('usuarios/admin'));
});
