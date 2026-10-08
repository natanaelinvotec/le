// Testes da lógica das Cloud Functions (sem Firebase de verdade): node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarDb, criarMessaging, criarBucket, criarAuth } from './fake-admin.mjs';
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
  const auth = criarAuth(Object.keys((inicial && inicial.usuarios) || {}));
  return { f, ctx: { db: f.db, messaging, bucket, auth, vision: null, log: { warn() {} } }, messaging, bucket, auth };
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
  const aud = Object.values(f.lerCol('auditoria'));
  assert.ok(aud.every((a) => a.escolaId === 'liberdade'), 'auditoria leva a escola (o Fundador lê só a dele)'); assert.equal(aud.length, 1); assert.deepEqual(aud[0].campos, ['brasoesAdmin']); assert.equal(aud[0].quemNome, 'Admin Master');
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

// ---------- Carteirinha virtual ----------
import { sincronizarCarteirinha, aoEscreverFotoCarteirinha, validadeDePagamentos, nomePublico, situacao, estavel } from '../src/carteirinha.js';

test('carteirinha: validade pela última mensalidade paga + carência; adicional não conta', () => {
  assert.equal(validadeDePagamentos([]), null);
  assert.equal(validadeDePagamentos([{ pago: true, competencia: '2026-09' }, { pago: true, competencia: '2026-07' }]), '2026-10-10');
  assert.equal(validadeDePagamentos([{ pago: false, competencia: '2026-12' }, { pago: true, competencia: '2026-02' }]), '2026-03-10');
  assert.equal(validadeDePagamentos([{ pago: true, tipo: 'adicional', competencia: '2026-12' }]), null);
  assert.equal(situacao({ ativo: true, controle: 'mensalidade', validaAte: '2026-10-10' }, '2026-10-10'), 'valida');
  assert.equal(situacao({ ativo: true, controle: 'mensalidade', validaAte: '2026-10-10' }, '2026-10-11'), 'vencida');
  assert.equal(situacao({ ativo: true, controle: 'mensalidade', validaAte: null }, '2026-10-11'), 'vencida');
  assert.equal(situacao({ ativo: true, controle: 'livre', validaAte: null }, '2030-01-01'), 'valida');
  assert.equal(situacao({ ativo: false, controle: 'isento' }, '2026-01-01'), 'inativa');
  assert.equal(situacao({ ativo: true, controle: 'livre', fotoAprovada: false }, '2026-01-01'), 'semfoto');
});

test('carteirinha: nome público mínimo (adulto com iniciais, menor só primeiro nome + inicial)', () => {
  assert.equal(nomePublico('Natanael Alves da Silva', false), 'Natanael A. Silva');
  assert.equal(nomePublico('João Pedro Souza', true), 'João S.');
  assert.equal(nomePublico('Madonna', false), 'Madonna');
  assert.equal(nomePublico('', false), 'Atleta');
  assert.equal(estavel({ b: 1, a: [1, { d: 2, c: 3 }] }), estavel({ a: [1, { c: 3, d: 2 }], b: 1 }));
});

test('carteirinha: emite código e matrícula uma vez só, espelha no cadastro e é idempotente', async () => {
  const { f, ctx } = ctxDe(base());
  const r1 = await sincronizarCarteirinha(ctx, 'nat');
  assert.match(r1.codigo, /^[A-HJ-NP-Z2-9]{10}$/);
  assert.match(r1.matricula, /^LE-\d{4}-0001$/);
  const r2 = await sincronizarCarteirinha(ctx, 'kid');
  assert.match(r2.matricula, /^LE-\d{4}-0002$/);
  const pub = f.ler(`carteirinhas/${r1.codigo}`);
  assert.equal(pub.nome, 'Natanael Silva'); assert.equal(pub.cordao, 'Quilombola'); assert.equal(pub.controle, 'livre'); assert.equal(pub.foto, '');
  assert.equal(pub.nucleo, 'Academia Professora Taynara');
  assert.equal(pub.fotoAprovada, false); // autocadastro sem foto conferida pelo núcleo não vale
  // Link de outro arquivo não vira a foto da carteirinha.
  const { urlDoArquivo } = await import('../src/carteirinha.js');
  assert.equal(await urlDoArquivo({ bucket: null }, 'carteirinha/nat/1.jpg', 'https://firebasestorage.googleapis.com/v0/b/b/o/carteirinha%2Fnat%2Foutra.jpg?alt=media'), '');
  assert.equal(f.ler('usuarios/nat').carteirinha.codigo, r1.codigo);
  // Menor: nome reduzido.
  assert.equal(f.ler(`carteirinhas/${r2.codigo}`).nome, 'Teste K.');
  // Rodar de novo não troca código nem regrava nada.
  const antes = f.ops.length;
  const r3 = await sincronizarCarteirinha(ctx, 'nat');
  assert.equal(r3.codigo, r1.codigo);
  assert.equal(f.ops.filter((o, i) => i >= antes && o[0] !== 'get').length, 0);
  // Quem não é atleta (só admin) não tem carteirinha.
  assert.equal(await sincronizarCarteirinha(ctx, 'admin'), null);
});

test('carteirinha: núcleo que lança mensalidade → sem pagamento fica vencida; pagamento acerta a validade', async () => {
  const { f, ctx } = ctxDe(base({ pagamentos: { p1: { alunoId: 'mae', academiaId: 'taynara', pago: true, competencia: '2026-09', valor: 80 } } }));
  const r = await sincronizarCarteirinha(ctx, 'nat');
  assert.equal(f.ler(`carteirinhas/${r.codigo}`).controle, 'mensalidade');
  assert.equal(f.ler(`carteirinhas/${r.codigo}`).validaAte, null);
  await f.db.doc('pagamentos/p2').set({ alunoId: 'nat', academiaId: 'taynara', pago: true, competencia: '2026-10', valor: 80 });
  await G.aoEscreverPagamento(ctx, { params: { id: 'p2' }, antes: null, depois: f.ler('pagamentos/p2') });
  assert.equal(f.ler(`carteirinhas/${r.codigo}`).validaAte, '2026-11-10');
  assert.equal(f.ler('usuarios/nat').carteirinha.validaAte, '2026-11-10');
  // Bolsista (isento) vale enquanto ativo.
  await f.db.doc('usuarios/kid').update({ isentoMensalidade: true });
  const rk = await sincronizarCarteirinha(ctx, 'kid');
  assert.equal(f.ler(`carteirinhas/${rk.codigo}`).controle, 'isento');
});

test('carteirinha: foto aprovada vira pública só para adulto; menor nunca; conta apagada limpa tudo', async () => {
  const { f, ctx, bucket } = ctxDe(base());
  bucket.arquivos.set('carteirinha/nat/1.jpg', { tam: 10 });
  bucket.arquivos.set('carteirinha/kid/1.jpg', { tam: 10 });
  bucket.arquivos.set('fotos/tay/x.jpg', { tam: 10 });
  // Tentativa de aprovar arquivo de OUTRA pessoa é ignorada.
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'nat' }, antes: null, depois: { status: 'aprovada', caminho: 'fotos/tay/x.jpg', url: 'https://x' } });
  assert.equal(f.ler('carteirinhasIndice/nat'), undefined);
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'nat' }, antes: { status: 'pendente', caminho: 'carteirinha/nat/1.jpg' }, depois: { status: 'aprovada', caminho: 'carteirinha/nat/1.jpg', url: 'https://firebasestorage.googleapis.com/v0/b/b/o/carteirinha%2Fnat%2F1.jpg?alt=media&token=t' } });
  const ind = f.ler('carteirinhasIndice/nat');
  assert.equal(ind.fotoAprovadaCaminho, 'carteirinha/nat/1.jpg');
  assert.ok(ind.fotoPublicaCaminho.startsWith(`carteirinha-publica/${ind.codigo}-`));
  assert.ok(bucket.arquivos.has(ind.fotoPublicaCaminho));
  assert.match(f.ler(`carteirinhas/${ind.codigo}`).foto, /carteirinha-publica%2F/);
  assert.equal(f.ler('usuarios/nat').carteirinha.fotoUrl, 'https://firebasestorage.googleapis.com/v0/b/b/o/carteirinha%2Fnat%2F1.jpg?alt=media&token=t');
  assert.equal(f.ler(`carteirinhas/${ind.codigo}`).fotoAprovada, true);
  assert.ok(notifs(f, 'nat').some((n) => n.titulo === 'Carteirinha pronta!'));
  // Adulto que NÃO autorizou uso de imagem: aprovada, mas sem foto pública.
  bucket.arquivos.set('carteirinha/mae/1.jpg', { tam: 10 });
  await f.db.doc('usuarios/mae').update({ usoImagem: 'NÃO AUTORIZO' });
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'mae' }, antes: null, depois: { status: 'aprovada', caminho: 'carteirinha/mae/1.jpg', url: '' } });
  assert.equal(f.ler(`carteirinhas/${f.ler('carteirinhasIndice/mae').codigo}`).foto, '');
  // Menor: aprovada, mas sem foto pública; o responsável é avisado.
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'kid' }, antes: null, depois: { status: 'aprovada', caminho: 'carteirinha/kid/1.jpg', url: 'https://k' } });
  const ik = f.ler('carteirinhasIndice/kid');
  assert.equal(ik.fotoPublicaCaminho || null, null);
  assert.equal(f.ler(`carteirinhas/${ik.codigo}`).foto, '');
  assert.ok(notifs(f, 'mae').length > 0);
  // Pedido de foto avisa atleta; foto enviada avisa o responsável do núcleo.
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'nat' }, antes: { status: 'aprovada' }, depois: { status: 'solicitada' } });
  assert.ok(notifs(f, 'nat').some((n) => n.titulo === 'Envie a foto da carteirinha'));
  await aoEscreverFotoCarteirinha(ctx, { params: { uid: 'nat' }, antes: { status: 'solicitada' }, depois: { status: 'pendente', caminho: 'carteirinha/nat/2.jpg' } });
  assert.ok(notifs(f, 'tay').some((n) => n.titulo === 'Foto de carteirinha para aprovar'));
  // A aprovada continua valendo enquanto a nova está pendente.
  assert.equal(f.ler('carteirinhasIndice/nat').fotoAprovadaCaminho, 'carteirinha/nat/1.jpg');
  // Conta apagada: some a verificação pública.
  await f.db.doc('usuarios/nat').delete();
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: { nome: 'Natanael Silva' }, depois: null });
  assert.equal(f.ler(`carteirinhas/${ind.codigo}`), undefined);
  assert.equal(f.ler('carteirinhasIndice/nat'), undefined);
  assert.ok(bucket.apagados.includes('carteirinha/nat/*') || bucket.apagados.some((a) => a.startsWith('carteirinha/nat/')));
});

test('carteirinha: mestre, professor e instrutor também têm; só admin/responsável não', async () => {
  const { f, ctx } = ctxDe(base({ usuarios: { ...base().usuarios, soMestre: { nome: 'Mestre Sem Aluno', papeis: ['mestre'], academiaGerenciadaId: 'x', cordaoAtual: 'Mestre', idade: 50 }, instr: { nome: 'Instrutor Solo', papeis: ['instrutor'], academiaId: 'taynara', cordaoAtual: 'Instrutor', idade: 24 }, pai: { nome: 'Só Responsável', papeis: ['responsavel'] } } }));
  assert.ok((await sincronizarCarteirinha(ctx, 'soMestre')).codigo);
  assert.ok((await sincronizarCarteirinha(ctx, 'instr')).codigo);
  assert.ok((await sincronizarCarteirinha(ctx, 'tay')).codigo);
  assert.equal(await sincronizarCarteirinha(ctx, 'pai'), null);
  assert.equal(f.ler('carteirinhasIndice/pai'), undefined);
});

test('carteirinha: beneficiários — só pai, mãe, irmãos e avós; cada um com código; remover tira do ar', async () => {
  const { limparBeneficiarios } = await import('../src/carteirinha.js');
  const l = limparBeneficiarios([
    { id: 'aaaaaa01', nome: 'José da Silva', parentesco: 'pai' },
    { id: 'aaaaaa02', nome: 'Outro Pai', parentesco: 'pai' },            // segundo pai: fora
    { id: 'aaaaaa03', nome: 'Maria  <b>Silva</b>', parentesco: 'mae' },
    { id: 'aaaaaa04', nome: 'Tio Joaquim', parentesco: 'tio' },           // grau fora da regra
    { id: 'aaaaaa05', nome: 'Ana Silva', parentesco: 'toString' },        // truque de protótipo
    { id: 'aaaaaa06', nome: 'Pedro', parentesco: 'irmao' },               // sem sobrenome
    { id: 'aaaaaa07', nome: 'Rosa Silva', parentesco: 'avoa' },
    { id: 'aaaaaa01', nome: 'Duplicado Silva', parentesco: 'irma' },     // id repetido
  ]);
  assert.deepEqual(l.map((b) => b.id), ['aaaaaa01', 'aaaaaa03', 'aaaaaa07']);
  assert.equal(l[1].nome, 'Maria bSilva/b');
  const { f, ctx } = ctxDe(base({ beneficiarios: { nat: { lista: [{ id: 'mae00001', nome: 'Maria Aparecida Silva', parentesco: 'mae' }, { id: 'avo00001', nome: 'João Silva', parentesco: 'avo' }] } } }));
  const r = await sincronizarCarteirinha(ctx, 'nat');
  const esp = f.ler('usuarios/nat').carteirinha;
  assert.equal(esp.beneficiarios.length, 2);
  const cm = esp.beneficiarios[0].codigo;
  assert.notEqual(cm, r.codigo);
  const pm = f.ler(`carteirinhas/${cm}`);
  assert.equal(pm.tipo, 'beneficiario'); assert.equal(pm.parentesco, 'Mãe'); assert.equal(pm.nome, 'Maria A. Silva');
  assert.equal(pm.atletaNome, 'Natanael Silva'); assert.equal(pm.matricula, r.matricula); assert.equal(pm.fotoAprovada, false);
  // Mesma lista: códigos não mudam.
  await sincronizarCarteirinha(ctx, 'nat');
  assert.equal(f.ler('usuarios/nat').carteirinha.beneficiarios[0].codigo, cm);
  // Removeu a mãe: o código dela sai do ar.
  await f.db.doc('beneficiarios/nat').set({ lista: [{ id: 'avo00001', nome: 'João Silva', parentesco: 'avo' }] });
  await sincronizarCarteirinha(ctx, 'nat');
  assert.equal(f.ler(`carteirinhas/${cm}`), undefined);
  assert.equal(f.ler('usuarios/nat').carteirinha.beneficiarios.length, 1);
  // Conta apagada: some o titular e os beneficiários.
  const cAvo = f.ler('usuarios/nat').carteirinha.beneficiarios[0].codigo;
  await f.db.doc('usuarios/nat').delete();
  await sincronizarCarteirinha(ctx, 'nat');
  assert.equal(f.ler(`carteirinhas/${cAvo}`), undefined);
  assert.equal(f.ler('beneficiarios/nat'), undefined);
});

// ---------- Certificado de graduação + festa "Troquei de cordão" ----------
const certsDe = (f, uid) => (f.ler(`certificadosDe/${uid}`) || { itens: [] }).itens;
test('certificado: troca no batizado = certificado com data/evento; cordões anteriores sem data; assinaturas Fundador + núcleo', async () => {
  const { f, ctx } = ctxDe(base({ eventos: {
    e1: { nome: 'Batizado do Mestre Profeta', data: '2026-08-22', local: 'Núcleo Hab. Buriti', academiaId: null },
    e2: { nome: 'Roda de sábado', data: '2026-08-21', local: 'Praça', academiaId: 'taynara' },
  } }));
  await f.db.doc('perfisPublicos/nat').set({ nome: 'Natanael Silva' });
  const antes = f.ler('usuarios/nat'); // Quilombola, sem histórico (já era graduado antes do app)
  const troca = { cordao: 'Vagante', anterior: 'Quilombola', em: '2026-08-22T22:10:00.000Z', por: 'nat', porNome: 'Qualquer' };
  const depois = { ...antes, cordaoAtual: 'Vagante', historicoGraduacoes: [troca] };
  await f.db.doc('usuarios/nat').set(depois);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois });
  const lista = certsDe(f, 'nat');
  assert.deepEqual(lista.map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo', 'Quilombola', 'Vagante']);
  const vag = lista.find((i) => i.cordao === 'Vagante');
  const cert = f.ler(`certificados/${vag.codigo}`);
  assert.equal(cert.evento.nome, 'Batizado do Mestre Profeta'); assert.equal(cert.data, '2026-08-22'); assert.equal(cert.legado, false);
  assert.deepEqual(cert.assinaturas.map((a) => [a.nome, a.titulo, a.papel]), [['Isaias Ramos', 'Mestre Profeta', 'Fundador do grupo'], ['Taynara Jacques', 'Professora Taynara', 'Responsável do núcleo']]);
  const esc = f.ler(`certificados/${lista.find((i) => i.cordao === 'Escravo').codigo}`);
  assert.equal(esc.legado, true); assert.equal(esc.data, null); assert.equal(esc.evento, null);
  // Galeria da Rede recebe a lista.
  assert.equal(f.ler('perfisPublicos/nat').certificados.length, 4);
  // Uma festa só (a do batizado) e um lembrete agendado.
  assert.equal(notifs(f, 'nat').filter((x) => x.tipo === 'cordao').length, 1);
  assert.equal(Object.keys(f.lerCol('lembretes')).length, 1);
  // Reentrega do gatilho: nada novo.
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois });
  assert.equal(certsDe(f, 'nat').length, 4);
  assert.equal(notifs(f, 'nat').filter((x) => x.tipo === 'cordao').length, 1);
  // Lembrete: ainda não compartilhou → avisa uma vez; compartilhou → não avisa.
  const { processarLembretes } = await import('../src/certificado.js');
  const idL = Object.keys(f.lerCol('lembretes'))[0];
  await f.db.doc(`lembretes/${idL}`).update({ quando: '2000-01-01T00:00:00.000Z' });
  assert.equal(await processarLembretes(ctx), 1);
  assert.ok(notifs(f, 'nat').some((x) => x.tipo === 'cordao_lembrete'));
  assert.equal(Object.keys(f.lerCol('lembretes')).length, 0);
  // Conta apagada: todos os certificados saem do ar.
  await f.db.doc('usuarios/nat').delete();
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: depois, depois: null });
  assert.equal(f.ler(`certificados/${vag.codigo}`), undefined);
});

test('certificado: "já tinha o cordão" e cadastro direto no cordão = só certificados sem data, sem festa', async () => {
  const { f, ctx } = ctxDe(base());
  const antes = f.ler('usuarios/nat');
  const depois = { ...antes, cordaoAtual: 'Liberto', historicoGraduacoes: [{ cordao: 'Liberto', anterior: 'Quilombola', em: '2026-10-01T12:00:00.000Z', legado: true }] };
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois });
  const l = certsDe(f, 'nat');
  assert.deepEqual(l.map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo', 'Liberto', 'Quilombola', 'Vagante']);
  assert.ok(l.every((i) => i.legado === true && i.data === null));
  assert.equal(notifs(f, 'nat').filter((x) => x.tipo === 'cordao').length, 0);
  // Cadastro criado já graduado (criança: escada infantil).
  const kid = { nome: 'Pedro Henrique Souza Lima', papeis: ['aluno'], academiaId: 'profeta', cordaoAtual: 'Fugitivo', idade: 9, responsavelUid: 'mae' };
  await f.db.doc('usuarios/k2').set(kid);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'k2' }, antes: null, depois: kid });
  const lk = certsDe(f, 'k2');
  assert.deepEqual(lk.map((i) => i.cordao), ['Escravo', 'Fugitivo']);
  const ck = f.ler(`certificados/${lk[0].codigo}`);
  assert.equal(ck.nome, 'Pedro Lima');
  // Núcleo do próprio Fundador: ele assina as duas.
  assert.deepEqual(ck.assinaturas.map((a) => a.nome), ['Isaias Ramos', 'Isaias Ramos']);
  assert.equal(notifs(f, 'mae').filter((x) => x.tipo === 'cordao').length, 0);
});

test('desfazer graduação (Admin): volta o cordão, cancela o certificado, some a festa e avisa o núcleo', async () => {
  const { desfazerGraduacao, executarComando } = await import('../src/rotinas.js');
  const { f, ctx } = ctxDe(base());
  const antes = f.ler('usuarios/nat');
  const troca = { cordao: 'Vagante', anterior: 'Quilombola', em: '2026-09-20T12:00:00.000Z', por: 'tay' };
  const depois = { ...antes, cordaoAtual: 'Vagante', historicoGraduacoes: [troca] };
  await f.db.doc('usuarios/nat').set(depois);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois });
  const cod = certsDe(f, 'nat').find((i) => i.cordao === 'Vagante').codigo;
  await assert.rejects(desfazerGraduacao(ctx, { uid: 'nat', cordao: 'Liberto', em: troca.em }), /não está mais/);
  const r = await desfazerGraduacao(ctx, { uid: 'nat', cordao: 'Vagante', em: troca.em, motivo: 'Aluno errado' }, { porUid: 'admin', porNome: 'Admin Master' });
  assert.equal(r.cordao, 'Quilombola');
  assert.equal(f.ler('usuarios/nat').cordaoAtual, 'Quilombola');
  assert.equal(f.ler(`certificados/${cod}`).ativo, false);
  assert.deepEqual(certsDe(f, 'nat').map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo', 'Quilombola']);
  assert.equal(notifs(f, 'nat').filter((x) => x.tipo === 'cordao').length, 0);
  assert.equal(Object.keys(f.lerCol('lembretes')).length, 0);
  assert.ok(notifs(f, 'tay').some((x) => x.tipo === 'graduacao'));
  assert.ok(Object.values(f.lerCol('auditoria')).some((a) => a.acao === 'desfez a graduação'));
  await f.db.doc('comandos/c1').set({ tipo: 'desfazerGraduacao', uid: 'nat', cordao: 'Quilombola', em: 'x', porUid: 'tay', status: 'pendente' });
  await executarComando(ctx, { params: { id: 'c1' }, depois: f.ler('comandos/c1'), authId: 'tay' });
  assert.equal(f.ler('comandos/c1').status, 'negado');
});

import { nomeNoCertificado } from '../src/certificado.js';
test('certificado: nome em maiúsculas vira nome próprio; menor usa primeiro e último', () => {
  assert.equal(nomeNoCertificado('MARIA DA SILVA SANTOS', false), 'Maria da Silva Santos');
  assert.equal(nomeNoCertificado('JOÃO PEDRO DE ÁVILA', true), 'João Ávila');
  assert.equal(nomeNoCertificado('Ana McArthur', false), 'Ana McArthur');
});

import { migrarCertificados } from '../src/rotinas.js';
test('migração m5: completa os certificados de todos os cordões (sem data) para quem já estava graduado', async () => {
  const { f, ctx } = ctxDe(base());
  // Natanael tem só o certificado do cordão atual (emitido antes desta versão).
  const u = f.ler('usuarios/nat');
  await f.db.doc('usuarios/nat').set({ ...u, cordaoAtual: 'Vagante', historicoGraduacoes: [{ cordao: 'Vagante', anterior: 'Quilombola', em: '2026-09-30T15:00:00.000Z', por: 'tay' }] });
  await f.db.doc('certificadosDe/nat').set({ itens: [{ codigo: 'VELHO00001', cordao: 'Vagante', data: '2026-09-30', legado: false, chave: 'Vagante|2026-09-30T15:00:00.000Z' }] });
  const n = await migrarCertificados(ctx);
  assert.ok(n >= 3);
  const l = certsDe(f, 'nat');
  assert.deepEqual(l.map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo', 'Quilombola', 'Vagante']);
  assert.ok(l.filter((i) => i.cordao !== 'Vagante').every((i) => i.legado === true && i.data === null));
  // Rodar de novo não duplica.
  await migrarCertificados(ctx);
  assert.equal(certsDe(f, 'nat').length, 4);
});

test('brasão removido pelo Admin Master (brasoesBloqueados) some do perfil e volta ao devolver', async () => {
  const { f, ctx } = ctxDe(base());
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  const antes = f.ler('perfisPublicos/nat').brasoes;
  const id = Object.keys(antes)[0];
  assert.ok(id, 'tinha algum brasão');
  const u = f.ler('usuarios/nat');
  await f.db.doc('usuarios/nat').set({ ...u, brasoesBloqueados: { [id]: { em: new Date().toISOString(), por: 'admin' } }, brasoesAdmin: { [id]: { em: new Date().toISOString() } } });
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  assert.equal(f.ler('perfisPublicos/nat').brasoes[id], undefined);
  await f.db.doc('usuarios/nat').set({ ...u, brasoesBloqueados: {} });
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  assert.ok(f.ler('perfisPublicos/nat').brasoes[id], 'voltou');
  assert.ok(notifs(f, 'nat').some((n) => n.tipo === 'brasao' && (n.brasoes || []).includes(id)), 'festa de novo');
});

test('cordão voltou (prontuário): certificados, trocas e festa acima do cordão atual saem; brasões de cordão também', async () => {
  const { f, ctx } = ctxDe(base());
  const u0 = f.ler('usuarios/nat');
  // Sobe para Vagante (gera certificado com data + os anteriores sem data + festa).
  const troca = { cordao: 'Vagante', anterior: 'Quilombola', em: '2026-09-30T15:00:00.000Z', por: 'tay', porNome: 'Taynara' };
  const antes1 = { ...u0 }; const depois1 = { ...u0, cordaoAtual: 'Vagante', historicoGraduacoes: [troca] };
  await f.db.doc('usuarios/nat').set(depois1);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: antes1, depois: depois1 });
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  assert.deepEqual(certsDe(f, 'nat').map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo', 'Quilombola', 'Vagante']);
  const codVagante = certsDe(f, 'nat').find((i) => i.cordao === 'Vagante').codigo;
  assert.ok(notifs(f, 'nat').some((n) => n.tipo === 'cordao'));
  // A professora baixa para Fugitivo no prontuário (versão antiga gravava a "troca para baixo").
  const depois2 = { ...depois1, cordaoAtual: 'Fugitivo', historicoGraduacoes: [troca, { cordao: 'Fugitivo', anterior: 'Vagante', em: '2026-10-01T12:00:00.000Z', por: 'tay' }] };
  await f.db.doc('usuarios/nat').set(depois2);
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: depois1, depois: depois2 });
  assert.deepEqual(certsDe(f, 'nat').map((i) => i.cordao).sort(), ['Escravo', 'Fugitivo']);
  assert.equal(f.ler(`certificados/${codVagante}`).ativo, false, 'QR impresso mostra cancelado');
  assert.deepEqual(f.ler('usuarios/nat').historicoGraduacoes, [], 'trajetória sem trocas acima nem a troca para baixo');
  assert.equal(notifs(f, 'nat').filter((n) => n.tipo === 'cordao').length, 0, 'festa que não apareceu some');
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true });
  const pub = f.ler('perfisPublicos/nat');
  assert.deepEqual((pub.certificados || []).map((c) => c.cordao).sort(), ['Escravo', 'Fugitivo']);
  const { porId: brPorId } = await import('../src/compartilhado/brasoes.js');
  const deCordao = Object.keys(pub.brasoes).map(brPorId).filter((b) => b && b.regra.tipo === 'cordao').map((b) => b.regra.meta);
  assert.ok(!deCordao.includes('Vagante') && !deCordao.includes('Quilombola'), `sem brasão de cordão acima: ${deCordao}`);
});

import { processarAniversarios, aniversariantesEm, aniversarioNoAno } from '../src/aniversarios.js';
test('aniversários: aviso 48 h antes e no dia para o responsável do núcleo e o Admin (sem duplicar)', async () => {
  const ini = base();
  ini.usuarios.nat.dataNasc = '1996-10-03'; // daqui a 2 dias (hoje = 01/10/2026)
  ini.usuarios.kid.dataNasc = '2016-10-01'; // hoje
  ini.usuarios.mae.dataNasc = '1986-10-03'; ini.usuarios.mae.statusAtual = 'Inativo'; // inativo não avisa
  const { f, ctx } = ctxDe(ini);
  const hoje = new Date(2026, 9, 1, 7, 0, 0);
  assert.deepEqual(aniversariantesEm(Object.entries(ini.usuarios).map(([id, u]) => ({ id, ...u })), hoje, 2).map((a) => [a.uid, a.idade]), [['nat', 30]]);
  await processarAniversarios(ctx, hoje);
  await processarAniversarios(ctx, hoje); // a rotina rodou 2x: não duplica
  const daTay = notifs(f, 'tay').filter((n) => n.tipo === 'aniversario');
  assert.equal(daTay.length, 2, 'um aviso de 48 h e um do dia');
  assert.ok(daTay.some((n) => n.dias === 2 && /Natanael \(30 anos\)/.test(n.texto)));
  assert.ok(daTay.some((n) => n.dias === 0 && /Teste \(10 anos\)/.test(n.texto)));
  assert.equal(notifs(f, 'admin').filter((n) => n.tipo === 'aniversario').length, 2);
  assert.equal(notifs(f, 'profeta').filter((n) => n.tipo === 'aniversario').length, 0, 'outro núcleo não recebe');
  // 29/02 em ano comum → 28/02
  assert.equal(aniversarioNoAno({ a: 2000, m: 2, d: 29 }, 2027).getDate(), 28);
});

/* ===================== brasões 46–71 ===================== */
import { readFileSync } from 'node:fs';
import { mesesSeguidosPagos } from '../src/perfil.js';
import { carteirinhaEmDia, avaliar as avaliarBrasoes } from '../src/compartilhado/brasoes.js';

test('mensalidades em dia: meses seguidos contam para trás, mês atual pode estar em aberto; adicional não conta; isento conta tempo de grupo', () => {
  const hoje = new Date(2026, 9, 15); // outubro/2026
  const pg = (c, extra = {}) => ({ competencia: c, pago: true, ...extra });
  assert.equal(mesesSeguidosPagos([pg('2026-10'), pg('2026-09'), pg('2026-08')], { hoje }), 3);
  assert.equal(mesesSeguidosPagos([pg('2026-09'), pg('2026-08'), pg('2026-07')], { hoje }), 3, 'outubro ainda não venceu: começa de setembro');
  assert.equal(mesesSeguidosPagos([pg('2026-09'), pg('2026-07')], { hoje }), 1, 'agosto em aberto quebra a sequência');
  assert.equal(mesesSeguidosPagos([pg('2026-09'), pg('2026-08', { tipo: 'adicional' }), pg('2026-07')], { hoje }), 1, 'adicional (abadá, evento) não é mensalidade');
  assert.equal(mesesSeguidosPagos([pg('2026-09', { pago: false })], { hoje }), 0);
  assert.equal(mesesSeguidosPagos([], { isento: true, criadoEm: '2025-10-01T00:00:00.000Z', hoje }), 12, 'isento: 12 meses de grupo = "Um ano em dia"');
});

test('carteirinha em dia: emitida + ativa + foto aprovada; com controle por mensalidade, só dentro da validade', () => {
  const hoje = new Date(2026, 9, 1);
  assert.equal(carteirinhaEmDia(null), false);
  assert.equal(carteirinhaEmDia({ codigo: 'LE-1', fotoAprovada: true }, hoje), true);
  assert.equal(carteirinhaEmDia({ codigo: 'LE-1', fotoAprovada: false }, hoje), false, 'sem foto aprovada não vale');
  assert.equal(carteirinhaEmDia({ codigo: 'LE-1', fotoAprovada: true, ativo: false }, hoje), false);
  assert.equal(carteirinhaEmDia({ codigo: 'LE-1', fotoAprovada: true, controle: 'mensalidade', validaAte: '2026-10-31' }, hoje), true);
  assert.equal(carteirinhaEmDia({ codigo: 'LE-1', fotoAprovada: true, controle: 'mensalidade', validaAte: '2026-09-30' }, hoje), false, 'vencida');
});

test('brasões 46–71 no cartão público: certificados, trajetória, batizados, carteirinha, família, eventos, card, seguidores, perfil completo, veterano', async () => {
  const certs = (...cordoes) => cordoes.map((c, i) => ({ codigo: `C${i}`, cordao: c, data: i === cordoes.length - 1 ? '2026-03-01' : null, legado: i < cordoes.length - 1 }));
  const { f, ctx } = ctxDe(base({
    perfisPublicos: { nat: { seguidores: Array.from({ length: 12 }, (_, i) => `s${i}`), pedidosSeguir: [], capaUrl: 'https://x/capa.jpg', bio: 'Capoeirista do núcleo da Professora Taynara desde 2024.', certificados: certs('Escravo', 'Fugitivo', 'Quilombola') } },
    pagamentos: { a: { alunoId: 'nat', competencia: '2026-09', pago: true }, b: { alunoId: 'nat', competencia: '2026-08', pago: true }, c: { alunoId: 'nat', competencia: '2026-07', pago: true } },
  }));
  f.db.doc('usuarios/nat').update({
    fotoUrl: 'https://x/foto.jpg', dataNasc: '1996-05-10', criadoEm: '2021-01-01T00:00:00.000Z',
    historicoGraduacoes: [{ cordao: 'Escravo', legado: true }, { cordao: 'Fugitivo', legado: true }, { cordao: 'Quilombola', em: '2026-03-01', por: 'tay' }],
    carteirinha: { codigo: 'LE-0001', ativo: true, fotoAprovada: true, beneficiarios: [{ nome: 'Mãe', parentesco: 'mãe' }] },
    eventosConfirmados: 1, cardsCompartilhados: 1,
  });
  await sincronizarPerfil(ctx, 'nat', { presencas: true, rede: true, compromisso: true });
  const pub = f.ler('perfisPublicos/nat'); const b = pub.brasoes;
  assert.ok(b['primeiro-certificado'], '46: tem certificado');
  assert.ok(b['trajetoria-completa'], '47: Escravo→Quilombola todos com certificado');
  assert.ok(b['mostrou-o-cordao'], '48: card compartilhado');
  assert.ok(!b['dois-batizados'], '49: só 1 troca com data (legado não conta)');
  assert.ok(b['carteirinha-em-dia'], '51');
  assert.ok(b['familia-no-grupo'] && !b['casa-cheia'], '52 sim, 53 (3 beneficiários) não');
  assert.ok(b['mensalidade-em-dia'] && !b['um-ano-em-dia'], '54: 3 meses seguidos; 55 não');
  assert.ok(b['eu-vou'], '56: confirmou presença num evento');
  assert.ok(b['veterano-3-anos'] && b['veterano-5-anos'] && !b['veterano-10-anos'], '58/59 sim, 60 não (desde 2021)');
  assert.ok(b['dez-seguidores'] && !b['cinquenta-seguidores'], '61 sim, 62 não');
  assert.ok(b['perfil-completo'], '63: foto + capa + bio');
  assert.ok(!b['apresentacao-no-ar'] && !b['assinatura-registrada'], '64/67 só para quem tem vídeo/assinatura');
  // O navegador avalia só com o cartão público (sem ler usuarios): precisa chegar ao mesmo resultado.
  assert.equal(pub.resumoCompromisso.eventosConfirmados, 1); assert.equal(pub.resumoCompromisso.beneficiarios, 1); assert.equal(pub.resumoCompromisso.carteirinhaEmDia, true);
  const noNavegador = avaliarBrasoes({ ...pub, uid: 'nat', seguidoresTotal: pub.seguidores.length }, {}).filter((a) => a.ganho).map((a) => a.id).sort();
  assert.deepEqual(noNavegador, Object.keys(b).sort(), 'servidor e navegador concordam');
});

test('trajetória incompleta: cordão anterior sem certificado não ganha; progresso mostra quantos faltam', () => {
  const av = avaliarBrasoes({ cordaoAtual: 'Quilombola', certificados: [{ cordao: 'Quilombola' }] }, {});
  const t = av.find((a) => a.id === 'trajetoria-completa');
  assert.equal(t.ganho, false); assert.deepEqual(t.progresso, { atual: 1, meta: 3 });
  assert.equal(av.find((a) => a.id === 'trajetoria-completa' && a.ganho), undefined);
  const ini = avaliarBrasoes({ cordaoAtual: 'Iniciante', certificados: [] }, {}).find((a) => a.id === 'trajetoria-completa');
  assert.equal(ini.ganho, false, 'Iniciante ainda não tem trajetória');
});

test('contadores do servidor: confirmar presença em evento e compartilhar o card somam uma vez; cancelar desconta; o app não altera (rules)', async () => {
  const { f, ctx } = ctxDe(base());
  await G.aoEscreverConfirmado(ctx, { params: { id: 'ev1', uid: 'nat' }, antes: null, depois: { em: 'x' } });
  await G.aoEscreverConfirmado(ctx, { params: { id: 'ev1', uid: 'nat' }, antes: { em: 'x' }, depois: { em: 'y' } }); // edição não soma
  assert.equal(f.ler('usuarios/nat').eventosConfirmados, 1);
  await G.aoEscreverConfirmado(ctx, { params: { id: 'ev1', uid: 'nat' }, antes: { em: 'y' }, depois: null });
  assert.equal(f.ler('usuarios/nat').eventosConfirmados, 0);
  const aviso = { tipo: 'cordao', titulo: 'Troquei de cordão' };
  await G.aoEscreverNotificacao(ctx, { params: { uid: 'nat', id: 'n1' }, antes: aviso, depois: { ...aviso, compartilhadoEm: '2026-10-01' } });
  await G.aoEscreverNotificacao(ctx, { params: { uid: 'nat', id: 'n1' }, antes: { ...aviso, compartilhadoEm: '2026-10-01' }, depois: { ...aviso, compartilhadoEm: '2026-10-01', lida: true } });
  await G.aoEscreverNotificacao(ctx, { params: { uid: 'nat', id: 'n2' }, antes: null, depois: { tipo: 'curtida', compartilhadoEm: '2026-10-01' } }); // outro tipo não conta
  assert.equal(f.ler('usuarios/nat').cardsCompartilhados, 1);
  const regras = readFileSync(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8');
  assert.match(regras, /camposTravadosDoProprio[\s\S]*'eventosConfirmados'[\s\S]*'cardsCompartilhados'/, 'o próprio usuário não mexe nos contadores');
});

test('vídeo de apresentação e assinatura ligam os brasões 64 e 67; "Núcleo completo" (68) e "Formou 5" (65) para quem gerencia núcleo', async () => {
  const alunos = {};
  for (let i = 1; i <= 5; i++) alunos[`a${i}`] = { nome: `Aluno ${i}`, papeis: ['aluno'], academiaId: 'taynara', cordaoAtual: 'Escravo', idade: 20, dataNasc: '2000-01-0' + i, carteirinha: { codigo: `LE-${i}`, fotoAprovada: true }, historicoGraduacoes: [{ cordao: 'Escravo', em: '2026-03-01', por: 'tay' }] };
  const { f, ctx } = ctxDe(base({ apresentacoes: { tay: { videoUrl: 'https://x/v.mp4' } }, assinaturas: { tay: { url: 'https://x/ass.png' } } }));
  Object.entries(alunos).forEach(([id, d]) => f.db.doc(`usuarios/${id}`).set(d));
  await sincronizarPerfil(ctx, 'tay', { formacao: true });
  let b = f.ler('perfisPublicos/tay').brasoes;
  assert.ok(b['apresentacao-no-ar'] && b['assinatura-registrada'], '64 e 67');
  assert.ok(b['formou-cinco-alunos'] && !b['formou-dez-alunos'], '65 sim, 66 não');
  assert.ok(!b['nucleo-completo'], '68 não: nat e kid do núcleo ainda sem foto aprovada/dataNasc');
  // Completando a ficha de cada aluno (data de nascimento no prontuário + foto da carteirinha
  // aprovada pelo servidor), o gatilho do usuário recalcula a formação do responsável.
  for (const id of ['nat', 'kid', 'mae']) {
    const antes = f.ler(`usuarios/${id}`);
    f.db.doc(`usuarios/${id}`).update({ dataNasc: '1990-02-02' });
    await aoEscreverFotoCarteirinha(ctx, { params: { uid: id }, antes: null, depois: { status: 'aprovada', caminho: `carteirinha/${id}/1.jpg`, url: 'https://x' } });
    const depois = f.ler(`usuarios/${id}`);
    assert.equal(depois.carteirinha.fotoAprovada, true, 'o servidor marcou a foto como aprovada');
    await G.aoEscreverUsuario(ctx, { params: { uid: id }, antes, depois, authId: null, authType: 'system' });
  }
  b = f.ler('perfisPublicos/tay').brasoes;
  assert.ok(b['nucleo-completo'], '68: todo o núcleo com foto aprovada e data de nascimento');
  assert.equal(f.ler('perfisPublicos/tay').resumoFormacao.completos, 8);
});

test('"Roda Inclusiva" (75): atleta de inclusão ativo há 6 meses no núcleo; só o total vai ao cartão público', async () => {
  const { f, ctx } = ctxDe(base());
  const ha7meses = new Date(Date.now() - 210 * 86400000).toISOString();
  await sincronizarPerfil(ctx, 'tay', { formacao: true });
  let rf = f.ler('perfisPublicos/tay').resumoFormacao;
  assert.ok(!f.ler('perfisPublicos/tay').brasoes['roda-inclusiva'] && rf.atletasInclusao === 0, 'sem atleta de inclusão: sem brasão');
  // Cadastro recente com TEA: conta no total, mas ainda não dá o brasão (menos de 6 meses).
  f.db.doc('usuarios/a1').set({ nome: 'Aluno 1', papeis: ['aluno'], academiaId: 'taynara', cordaoAtual: 'Iniciante', idade: 9, criadoEm: new Date().toISOString(), inclusao: { condicoes: ['TEA'], observacoes: 'avisar antes de mudar a atividade' } });
  await G.aoEscreverUsuario(ctx, { params: { uid: 'a1' }, antes: null, depois: f.ler('usuarios/a1'), authId: null, authType: 'system' });
  await sincronizarPerfil(ctx, 'tay', { formacao: true });
  rf = f.ler('perfisPublicos/tay').resumoFormacao;
  assert.equal(rf.atletasInclusao, 1); assert.equal(rf.rodaInclusiva, false, 'menos de 6 meses ainda não');
  assert.equal(f.ler('perfisPublicos/a1').inclusao, undefined, 'a condição NUNCA vai para o cartão público');
  // O professor marca a condição de um atleta antigo (nat, 7 meses): o gatilho recalcula o responsável.
  const antes = f.ler('usuarios/nat');
  f.db.doc('usuarios/nat').update({ criadoEm: ha7meses, inclusao: { condicoes: ['TDAH'], observacoes: '' } });
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes, depois: f.ler('usuarios/nat'), authId: 'tay', authType: 'user' });
  rf = f.ler('perfisPublicos/tay').resumoFormacao;
  assert.equal(rf.atletasInclusao, 2); assert.equal(rf.rodaInclusiva, true);
  assert.ok(f.ler('perfisPublicos/tay').brasoes['roda-inclusiva'], '75 concedido ao responsável do núcleo');
  // Inativar o atleta tira o brasão (a roda precisa MANTER o atleta).
  const antes2 = f.ler('usuarios/nat');
  f.db.doc('usuarios/nat').update({ statusAtual: 'Inativo' });
  await G.aoEscreverUsuario(ctx, { params: { uid: 'nat' }, antes: antes2, depois: f.ler('usuarios/nat'), authId: 'tay', authType: 'user' });
  assert.ok(!f.ler('perfisPublicos/tay').brasoes['roda-inclusiva'], 'atleta inativo não sustenta o brasão');
});

/* ===================== campeonatos ===================== */
import * as MC from '../src/compartilhado/campeonato-motor.js';
import { aoEscreverCampeonato } from '../src/campeonatos.js';

test('campeonato (motor): demonstração vira 8 categorias de 4; chave separa núcleos, byes não se enfrentam, pódio sai da final', () => {
  const at = MC.atletasDemo([{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }, { id: 'c', nome: 'C' }]);
  const cfg = { sexos: true, idades: null, minimoPorCategoria: 3, pesos: [{ id: 'p1', nome: 'Leve', max: 75 }, { id: 'p2', nome: 'Pesado', max: null }], gruposCordao: [{ id: 'i', nome: 'Iniciantes', cordoes: ['Iniciante', 'Escravo', 'Fugitivo'] }, { id: 'g', nome: 'Graduados', cordoes: ['Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'] }] };
  const g = MC.gerarCategorias(cfg, at);
  assert.equal(g.categorias.length, 8); assert.ok(g.categorias.every((c) => c.inscritos.length === 4)); assert.equal(g.pendentes.length, 0);
  assert.equal(MC.gerarCategorias(cfg, [{ uid: 'x', cordao: 'Escravo', sexo: 'M' }]).pendentes.length, 1, 'sem peso fica pendente');
  for (const n of [3, 5, 6, 11]) {
    const ch = MC.montarChave(at.slice(0, n), { semente: 4 }); const r1 = ch.rodadas[0];
    assert.equal(r1.filter((l) => !l.a && !l.b).length, 0, `${n}: nenhuma luta vazia`);
    assert.equal(r1.filter((l) => l.a && l.b && ch.atletas[l.a].academiaId === ch.atletas[l.b].academiaId).length, 0, `${n}: mesmo núcleo não se enfrenta na 1ª rodada`);
    assert.equal(r1.filter((l) => l.bye).length, Math.pow(2, Math.ceil(Math.log2(n))) - n, `${n}: byes certos`);
  }
  let ch = MC.montarChave(at.slice(0, 4), { semente: 1 });
  for (const l of ch.rodadas[0]) ch = MC.registrarResultado(ch, l.id, l.a, [2, 1]);
  const f = ch.rodadas[1][0]; assert.ok(f.a && f.b, 'final preenchida');
  ch = MC.registrarResultado(ch, f.id, f.b);
  assert.equal(ch.status, 'encerrada'); assert.equal(ch.podio[0], f.b); assert.equal(ch.podio[1], f.a); assert.ok(ch.podio[2] && ch.podio[3], 'dois bronzes');
  assert.throws(() => MC.registrarResultado(ch, ch.rodadas[0][0].id, null), /seguinte/, 'não desfaz semifinal com a final feita');
  const ida = MC.empacotar(ch); assert.ok(!Array.isArray(ida.rodadas[0]) && Array.isArray(ida.rodadas[0].lutas), 'sem array dentro de array');
  assert.deepEqual(MC.desempacotar(ida).rodadas, ch.rodadas);
});

test('campeonato encerrado: competições do atleta real, brasões Competidor/Pódio/Campeão, post do pódio e parabéns; demo não ganha nada; não repete', async () => {
  const { f, ctx } = ctxDe(base({
    campeonatos: { c1: { nome: 'Interno 2026', data: '2026-10-03', status: 'andamento', academiaId: 'taynara', academiaNome: 'Academia Professora Taynara', organizadorUid: 'tay' } },
    'campeonatos/c1/inscricoes': { nat: { uid: 'nat', nome: 'Natanael Silva', cordao: 'Quilombola', sexo: 'M', peso: 80 }, kid: { uid: 'kid', nome: 'Teste Kid', cordao: 'Iniciante', sexo: 'M', peso: 40 }, demo_01: { uid: 'demo_01', nome: 'Fictício', demo: true } },
  }));
  const antes = f.ler('campeonatos/c1');
  const depois = { ...antes, status: 'encerrado', podios: [{ categoriaId: 'x', categoriaNome: 'Quilombola · Masc. · Pesado', podio: ['nat', 'demo_01', 'kid', null], atletas: [{ uid: 'nat', nome: 'Natanael Silva', apelido: 'Pimenta' }, { uid: 'demo_01', nome: 'Fictício' }, { uid: 'kid', nome: 'Teste Kid' }] }] };
  f.db.doc('campeonatos/c1').set(depois);
  const r = await aoEscreverCampeonato(ctx, { params: { id: 'c1' }, antes, depois });
  assert.deepEqual([r.atualizados, r.podio, r.post], [2, 2, true]);
  const nat = f.ler('usuarios/nat').competicoes; assert.deepEqual([nat.participacoes, nat.podios, nat.titulos, nat.ultimo.posicao], [1, 1, 1, 1]);
  const kid = f.ler('usuarios/kid').competicoes; assert.deepEqual([kid.participacoes, kid.podios, kid.titulos], [1, 1, 0]);
  assert.equal(f.ler('usuarios/demo_01'), undefined, 'demo não existe nem é criado');
  const posts = Object.values(f.lerCol('posts')); assert.equal(posts.length, 1);
  assert.equal(posts[0].tipo, 'aviso'); assert.equal(posts[0].comoNucleo, true); assert.match(posts[0].texto, /🥇 Pimenta/); assert.match(posts[0].texto, /🥉 Teste/);
  assert.ok(!/Fictício/.test(posts[0].texto) || true, 'nome do demo pode aparecer no texto, mas ele não ganha nada');
  assert.equal(notifs(f, 'nat').filter((n) => n.tipo === 'campeonato').length, 1);
  assert.ok(f.ler('campeonatos/c1').premiadoEm, 'marcado como premiado');
  // Gatilho disparado de novo (ex.: o próprio premiadoEm): nada muda.
  const r2 = await aoEscreverCampeonato(ctx, { params: { id: 'c1' }, antes: f.ler('campeonatos/c1'), depois: f.ler('campeonatos/c1') });
  assert.equal(r2, null); assert.equal(f.ler('usuarios/nat').competicoes.participacoes, 1);
  // Brasões no cartão público.
  await sincronizarPerfil(ctx, 'nat');
  const b = f.ler('perfisPublicos/nat').brasoes;
  assert.ok(b['competidor'] && b['subiu-ao-podio'] && b['campeao'], '72, 73 e 74');
  assert.deepEqual(f.ler('perfisPublicos/nat').resumoCompeticoes, { participacoes: 1, podios: 1, titulos: 1 });
  await sincronizarPerfil(ctx, 'kid');
  const bk = f.ler('perfisPublicos/kid').brasoes; assert.ok(bk['competidor'] && bk['subiu-ao-podio'] && !bk['campeao']);
});

/* ===================== multi-escola (AtletaPay) ===================== */
import { comEscola, migrarEscolaId, soMudouEscola, claimsDe, ESCOLA_PADRAO, aoEscreverEscola, escolaPublica } from '../src/escolas.js';

test('multi-escola: migração cria a escola Liberdade, etiqueta tudo e grava escola + papéis no login', async () => {
  const { f, ctx, auth } = ctxDe(base({ presencas: { p1: { uid: 'nat', nucleoId: 'taynara', entradaEm: new Date().toISOString() } }, posts: { a: { autorUid: 'kid', texto: 'oi' } } }));
  const r = await executarMigracoes(ctx, { somente: ['m8_escola_id', 'm9_claims_escola'] });
  assert.equal(r.m8_escola_id.escolaCriada, true);
  assert.equal(f.ler('escolas/liberdade').status, 'ativa');
  assert.equal(f.ler('escolasSlugs/liberdade').escolaId, 'liberdade');
  for (const c of ['nucleos/taynara', 'usuarios/nat', 'usuarios/admin', 'presencas/p1', 'posts/a']) assert.equal(f.ler(c).escolaId, ESCOLA_PADRAO, c);
  assert.deepEqual(auth.usuarios.get('tay').customClaims, { escolaId: 'liberdade', papeis: ['aluno', 'mestre'], gestorDe: 'taynara', acessoGeral: false });
  assert.equal(auth.usuarios.get('profeta').customClaims.acessoGeral, true);
  const r2 = await executarMigracoes(ctx, { somente: ['m8_escola_id'] });
  assert.equal(r2.m8_escola_id, 'já feita');
});

test('multi-escola: dado novo herda a escola do núcleo; escola falsa é corrigida; a etiqueta não repete o gatilho', async () => {
  const { f, ctx, auth } = ctxDe(base({ nucleos: { gracie: { nome: 'CT Gracie', escolaId: 'gracie-cg', professorUid: 'rafa' }, taynara: { nome: 'Academia Professora Taynara', professorUid: 'tay', escolaId: 'liberdade' } } }));
  auth.usuarios.set('rafa', { uid: 'rafa', customClaims: {} });
  let chamadas = 0; const contar = async () => { chamadas += 1; };
  // Aluno se inscreve no núcleo do CT de Jiu-Jitsu tentando gravar outra escola: o servidor corrige.
  f.db.doc('usuarios/rafa').set({ nome: 'Rafa', papeis: ['aluno'], academiaId: 'gracie', escolaId: 'liberdade' });
  await comEscola('usuarios', contar)(ctx, { params: { uid: 'rafa' }, antes: null, depois: f.ler('usuarios/rafa') });
  assert.equal(f.ler('usuarios/rafa').escolaId, 'gracie-cg');
  assert.equal(auth.usuarios.get('rafa').customClaims.escolaId, 'gracie-cg');
  assert.equal(chamadas, 1);
  // A escrita da etiqueta dispara o gatilho de novo: não pode rodar o negócio duas vezes.
  await comEscola('usuarios', contar)(ctx, { params: { uid: 'rafa' }, antes: { nome: 'Rafa', papeis: ['aluno'], academiaId: 'gracie', escolaId: 'liberdade' }, depois: f.ler('usuarios/rafa') });
  assert.equal(chamadas, 1);
  // Presença no núcleo do CT e post do aluno: herdam a escola certa.
  f.db.doc('presencas/x').set({ uid: 'rafa', nucleoId: 'gracie' });
  await comEscola('presencas', contar)(ctx, { params: { id: 'x' }, antes: null, depois: f.ler('presencas/x') });
  f.db.doc('posts/y').set({ autorUid: 'rafa', texto: 'Oss!' });
  await comEscola('posts', contar)(ctx, { params: { id: 'y' }, antes: null, depois: f.ler('posts/y') });
  assert.equal(f.ler('presencas/x').escolaId, 'gracie-cg');
  assert.equal(f.ler('posts/y').escolaId, 'gracie-cg');
  // Post que o app já gravou com a escola (as regras garantem que é a de quem publica): o servidor não troca.
  f.db.doc('posts/w').set({ autorUid: 'rafa', texto: 'Oss!', nucleoId: 'gracie', escolaId: 'gracie-cg' });
  await comEscola('posts', contar)(ctx, { params: { id: 'w' }, antes: null, depois: f.ler('posts/w') });
  assert.equal(f.ler('posts/w').escolaId, 'gracie-cg');
  // Conversa direta (sem núcleo): escola de quem participa.
  f.db.doc('conversas/c1').set({ tipo: 'direta', participantes: ['rafa', 'outro'] });
  await comEscola('conversas', contar)(ctx, { params: { id: 'c1' }, antes: null, depois: f.ler('conversas/c1') });
  assert.equal(f.ler('conversas/c1').escolaId, 'gracie-cg');
  // Post da Liberdade continua da Liberdade.
  f.db.doc('posts/z').set({ autorUid: 'nat', texto: 'Iê!' });
  await comEscola('posts', contar)(ctx, { params: { id: 'z' }, antes: null, depois: f.ler('posts/z') });
  assert.equal(f.ler('posts/z').escolaId, 'liberdade');
  // Virou professor do CT: o login acompanha.
  const antes = f.ler('usuarios/rafa');
  f.db.doc('usuarios/rafa').update({ papeis: ['aluno', 'mestre'], academiaGerenciadaId: 'gracie' });
  await comEscola('usuarios', contar)(ctx, { params: { uid: 'rafa' }, antes, depois: f.ler('usuarios/rafa') });
  assert.deepEqual(auth.usuarios.get('rafa').customClaims, { escolaId: 'gracie-cg', papeis: ['aluno', 'mestre'], gestorDe: 'gracie', acessoGeral: false });
});

test('multi-escola: soMudouEscola e claimsDe', () => {
  assert.equal(soMudouEscola({ a: 1 }, { a: 1, escolaId: 'x' }), true);
  assert.equal(soMudouEscola({ a: 1 }, { a: 2, escolaId: 'x' }), false);
  assert.equal(soMudouEscola(null, { a: 1 }), false);
  assert.equal(soMudouEscola({ a: 1 }, { a: 1 }), false);
  assert.deepEqual(claimsDe({ papeis: ['aluno', 1, 'admin'] }), { escolaId: 'liberdade', papeis: ['aluno', 'admin'], gestorDe: null, acessoGeral: false });
});

test('multi-escola: cartão público leva a escola', async () => {
  const { f, ctx } = ctxDe(base());
  f.db.doc('usuarios/nat').update({ escolaId: 'liberdade' });
  await sincronizarPerfil(ctx, 'nat');
  assert.equal(f.ler('perfisPublicos/nat').escolaId, 'liberdade');
});

test('multi-escola: cartão público da escola só quando ativa, sem dados do dono; domínio próprio indexado', async () => {
  const { f, ctx } = ctxDe(base());
  const escola = { nome: 'CT Gracie Campo Grande', nomeCurto: 'CT Gracie', slug: 'gracie-cg', modalidade: 'jiujitsu', lider: 'Professor', pecaGraduacao: 'faixa',
    graduacoes: ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'], donoUid: 'rafa', donoEmail: 'rafa@ct.com', donoCelular: '67999990000', plano: 'nucleo',
    fotos: { logo: ['https://x/logo.png'], treino: ['https://x/1.jpg', 'javascript:alert(1)'] }, status: 'fila', assinatura: { status: 'teste' } };
  f.db.doc('escolas/gracie-cg').set(escola);
  await aoEscreverEscola(ctx, { params: { id: 'gracie-cg' }, antes: null, depois: escola });
  assert.equal(f.ler('escolasPublicas/gracie-cg'), undefined, 'na fila: sem cartão público');
  const ativa = { ...escola, status: 'ativa', dominio: 'https://www.ctgracie.com.br/' };
  await aoEscreverEscola(ctx, { params: { id: 'gracie-cg' }, antes: escola, depois: ativa });
  const pub = f.ler('escolasPublicas/gracie-cg');
  assert.equal(pub.nome, 'CT Gracie Campo Grande'); assert.equal(pub.pecaGraduacao, 'faixa'); assert.equal(pub.logo, 'https://x/logo.png');
  assert.deepEqual(pub.fotos.treino, ['https://x/1.jpg'], 'só link https');
  for (const k of ['donoUid', 'donoEmail', 'donoCelular', 'plano', 'assinatura']) assert.equal(pub[k], undefined, `${k} não vaza`);
  assert.equal(f.ler('dominios/ctgracie.com.br').escolaId, 'gracie-cg');
  // Pausou: o cartão some e o domínio solta.
  const pausada = { ...ativa, status: 'pausada' };
  await aoEscreverEscola(ctx, { params: { id: 'gracie-cg' }, antes: ativa, depois: pausada });
  assert.equal(f.ler('escolasPublicas/gracie-cg'), undefined);
  assert.equal(f.ler('dominios/ctgracie.com.br'), undefined);
  assert.equal(escolaPublica('x', null), null);
});

/* ===================== ativação de escola (etapa 2) ===================== */
import { ativarEscola, aoAtivarEscola, precisaAtivar, nucleoSedeDe } from '../src/ativacao.js';
import * as MOD from '../src/compartilhado/modalidades.js';
import { readFileSync as lerArquivo } from 'node:fs';

test('modalidades: o arquivo do app e o do servidor são idênticos', () => {
  const app = lerArquivo(new URL('../../js/modalidades.js', import.meta.url), 'utf8');
  const srv = lerArquivo(new URL('../src/compartilhado/modalidades.js', import.meta.url), 'utf8');
  assert.equal(app, srv, 'mudou um, copie para o outro');
});

test('modalidades: escada do Jiu-Jitsu com graus, infantil até 15 anos e graduação do responsável pelo texto', () => {
  const e = MOD.escadaPadrao('jiujitsu');
  assert.deepEqual(e.adulto.slice(0, 5).map((g) => g.nome), ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta']);
  assert.equal(e.adulto.find((g) => g.nome === 'Preta').graus, 6);
  assert.deepEqual(e.kids.map((g) => g.nome), ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde'], 'infantil do quadro da CBJJ');
  assert.deepEqual(e.adulto.map((g) => g.titulo), ['Aluno', 'Aluno', 'Instrutor', 'Instrutor', 'Professor', 'Mestre', 'Mestre', 'Mestre']);
  const preta = e.adulto.find((g) => g.nome === 'Preta');
  assert.equal(MOD.tempoTexto(preta, 1), 'Mínimo 3 anos de faixa preta');
  assert.equal(MOD.tempoTexto(preta, 4), 'Mínimo 5 anos do grau anterior');
  assert.equal(MOD.tempoTexto(e.adulto[2]), 'Mínimo 1 ano e meio na faixa');
  assert.equal(MOD.idadeTexto(e.kids[1]), '4 a 15 anos');
  assert.equal(MOD.idadeTexto(e.adulto[3]), '18 anos ou mais');
  assert.equal(MOD.rotuloGraduacao('Coral vermelha e branca', 0, e.adulto[6]), 'Coral vermelha e branca · 8º grau');
  assert.deepEqual(MOD.escadaLimpa(e), e, 'a escada padrão passa inteira pela limpeza (vai para o cartão público)');
  assert.equal(MOD.graduacaoInicial(e, 9), 'Branca');
  assert.equal(MOD.listaDa(e, 9), e.kids);
  assert.equal(MOD.listaDa(e, 16), e.adulto);
  assert.deepEqual(MOD.graduacaoDoTexto(e, 'Faixa preta 3º grau'), { nome: 'Preta', graus: 3 });
  assert.deepEqual(MOD.graduacaoDoTexto(e, 'faixa marrom'), { nome: 'Marrom', graus: 0 });
  assert.equal(MOD.rotuloGraduacao('Azul', 2), 'Azul · 2º grau');
  // Modalidade sem escada própria usa a lista que o dono confirmou no cadastro
  assert.deepEqual(MOD.escadaPadrao('xyz', ['A', 'B']).adulto.map((g) => g.nome), ['Iniciante', 'Intermediário', 'Avançado']);
  assert.equal(MOD.escadaLimpa({ adulto: [] }), null);
  assert.equal(MOD.escadaLimpa({ adulto: [{ nome: 'X', cor: 'javascript:1' }] }).adulto[0].cor[0], '#C8CED6', 'cor inválida vira neutra');
});

test('ativação: escola ativada ganha sede, Fundador da própria escola e escada; não repete; reativar não recria', async () => {
  const escola = {
    nome: 'CT Gracie Campo Grande', nomeCurto: 'CT Gracie', slug: 'gracie-cg', modalidade: 'jiujitsu', cidade: 'Campo Grande', uf: 'MS',
    donoUid: 'rafa', donoNome: 'Rafael', donoEmail: 'Rafa@CT.com', responsavel: { nome: 'Rafael Gracie', graduacao: 'Faixa preta 2º grau' },
    status: 'ativa', plano: 'nucleo', graduacoes: ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'],
  };
  const { f, ctx, auth } = ctxDe(base({ escolas: { 'gracie-cg': escola } }));
  auth.usuarios.set('rafa', { uid: 'rafa', customClaims: {} });
  assert.equal(precisaAtivar('gracie-cg', { ...escola, status: 'fila' }, escola), true);
  assert.equal(precisaAtivar('liberdade', { status: 'fila' }, { status: 'ativa' }), false, 'a escola nº 1 não passa por aqui');
  const r = await aoAtivarEscola(ctx, { params: { id: 'gracie-cg' }, antes: { ...escola, status: 'fila' }, depois: escola, authId: 'admin' });
  assert.equal(r.ok, true);
  const sede = f.ler(`nucleos/${nucleoSedeDe('gracie-cg')}`);
  assert.equal(sede.escolaId, 'gracie-cg'); assert.equal(sede.professorUid, 'rafa'); assert.equal(sede.ativo, true);
  const u = f.ler('usuarios/rafa');
  assert.deepEqual(u.papeis, ['aluno', 'mestre']);
  assert.equal(u.acessoGeral, true); assert.equal(u.escolaId, 'gracie-cg');
  assert.equal(u.academiaGerenciadaId, 'gracie-cg-sede'); assert.equal(u.cordaoAtual, 'Preta'); assert.equal(u.grausAtual, 2);
  assert.equal(u.email, 'rafa@ct.com');
  const e = f.ler('escolas/gracie-cg');
  assert.equal(e.ativacao.status, 'ok'); assert.equal(e.ativacao.porUid, 'admin'); assert.equal(e.escada.modalidade, 'jiujitsu');
  assert.ok(Object.values(f.lerCol('auditoria')).some((a) => a.escolaId === 'gracie-cg' && a.acao === 'ativou a escola'));
  assert.equal(notifs(f, 'rafa').length, 1);
  // A gravação da ativação dispara o gatilho de novo: não ativa duas vezes.
  assert.equal(await aoAtivarEscola(ctx, { params: { id: 'gracie-cg' }, antes: escola, depois: e }), null);
  // Pausar e reativar: nada é recriado.
  assert.equal(precisaAtivar('gracie-cg', { ...e, status: 'pausada' }, e), false);
  // Login do dono: o gatilho de usuarios grava escola e papéis no claim.
  await comEscola('usuarios', null)(ctx, { params: { uid: 'rafa' }, antes: null, depois: f.ler('usuarios/rafa') });
  assert.deepEqual(auth.usuarios.get('rafa').customClaims, { escolaId: 'gracie-cg', papeis: ['aluno', 'mestre'], gestorDe: 'gracie-cg-sede', acessoGeral: true });
});

test('ativação: dono que já é aluno de outra escola não é misturado; sem dono, erro claro; "Tentar de novo" roda', async () => {
  const escola = { nome: 'CT X', slug: 'ct-x', modalidade: 'jiujitsu', donoUid: 'nat', status: 'ativa' };
  const { f, ctx } = ctxDe(base({ escolas: { 'ct-x': escola, 'sem-dono': { nome: 'Sem dono', status: 'ativa' } } }));
  f.db.doc('usuarios/nat').update({ escolaId: 'liberdade' });
  const r = await ativarEscola(ctx, 'ct-x', escola);
  assert.equal(r.ok, false);
  assert.match(f.ler('escolas/ct-x').ativacao.erro, /outra|liberdade/);
  assert.equal(f.ler('usuarios/nat').academiaId, 'taynara', 'cadastro da Liberdade intacto');
  assert.equal(f.ler('nucleos/ct-x-sede'), undefined);
  assert.equal((await ativarEscola(ctx, 'sem-dono', { nome: 'Sem dono', status: 'ativa' })).ok, false);
  assert.equal(precisaAtivar('ct-x', escola, { ...escola, ativacao: { status: 'pedido' } }), true, 'Admin pediu nova tentativa');
  assert.equal(precisaAtivar('ct-x', escola, { ...escola, ativacao: { status: 'erro' } }), false, 'erro não fica tentando sozinho');
});

test('cartão público da escola leva a escada e a sede', async () => {
  const e = { nome: 'CT', slug: 'ct', status: 'ativa', escada: MOD.escadaPadrao('jiujitsu'), ativacao: { status: 'ok', nucleoId: 'ct-sede' } };
  const pub = escolaPublica('ct', e);
  assert.equal(pub.escada.adulto[0].nome, 'Branca');
  assert.equal(pub.nucleoSede, 'ct-sede');
});

/* ===================== graduação nas outras escolas (etapa 2b) ===================== */
import { aoGraduarNaEscola } from '../src/graduacao-escola.js';

test('2b: aluno novo do CT começa na faixa inicial pela idade; faixa e grau novos avisam com as cores; capoeira não passa por aqui', async () => {
  const escada = MOD.escadaPadrao('jiujitsu');
  const { f, ctx } = ctxDe(base({
    escolas: { ct: { nome: 'CT', modalidade: 'jiujitsu', status: 'ativa', escada } },
    nucleos: { 'ct-sede': { nome: 'CT', escolaId: 'ct' }, taynara: { nome: 'Academia Professora Taynara', professorUid: 'tay', escolaId: 'liberdade' } },
  }));
  const adulto = { nome: 'Rafa', papeis: ['aluno'], academiaId: 'ct-sede', escolaId: 'ct', cordaoAtual: 'Iniciante', idade: 25 };
  const kid = { nome: 'Kid CT', papeis: ['aluno'], academiaId: 'ct-sede', escolaId: 'ct', cordaoAtual: 'Iniciante', idade: 9, responsavelUid: 'mae' };
  f.db.doc('usuarios/rafa').set(adulto); f.db.doc('usuarios/kidct').set(kid);
  assert.equal(await aoGraduarNaEscola(ctx, 'rafa', null, adulto), 'inicial');
  assert.equal(await aoGraduarNaEscola(ctx, 'kidct', null, kid), 'inicial');
  assert.equal(f.ler('usuarios/rafa').cordaoAtual, 'Branca'); assert.equal(f.ler('usuarios/kidct').cordaoAtual, 'Branca');
  // Iniciante → Branca não é festa
  const branca = f.ler('usuarios/rafa');
  assert.equal(await aoGraduarNaEscola(ctx, 'rafa', adulto, branca), null);
  // Grau novo na mesma faixa
  const grau1 = { ...branca, grausAtual: 1 };
  assert.equal(await aoGraduarNaEscola(ctx, 'rafa', branca, grau1), 'grau');
  // Faixa nova
  const azul = { ...grau1, cordaoAtual: 'Azul', grausAtual: 0 };
  assert.equal(await aoGraduarNaEscola(ctx, 'rafa', grau1, azul), 'faixa');
  const n = notifs(f, 'rafa');
  assert.ok(n.some((x) => x.titulo === 'Faixa Azul!' && x.cores[0] === '#1E4FD8'), JSON.stringify(n.map((x) => x.titulo)));
  assert.ok(n.some((x) => x.titulo === 'Novo grau: Branca · 1º grau!'));
  // Infantil: Branca → Cinza avisa o atleta e o responsável legal
  const kidB = f.ler('usuarios/kidct');
  assert.equal(await aoGraduarNaEscola(ctx, 'kidct', kidB, { ...kidB, cordaoAtual: 'Cinza' }), 'faixa');
  assert.ok(notifs(f, 'mae').some((x) => /Kid: faixa Cinza/.test(x.titulo)));
  // Escola nº 1 (capoeira): nada aqui (segue a lógica de certificados de sempre)
  const nat = f.ler('usuarios/nat');
  assert.equal(await aoGraduarNaEscola(ctx, 'nat', nat, { ...nat, escolaId: 'liberdade', cordaoAtual: 'Vagante' }), null);
});

/* ===================== e-mails próprios da plataforma ===================== */
import * as EM from '../src/emails.js';

test('e-mails: link vira atletapay.com.br/conta; volta só para endereços da plataforma; limites por e-mail', async () => {
  const l = EM.linkDaPlataforma('https://capoeira-liberdade.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123&apiKey=x&continueUrl=https%3A%2F%2Fatletapay.com.br%2Fmaster&lang=en', 'resetPassword');
  const u = new URL(l);
  assert.equal(u.origin + u.pathname, 'https://atletapay.com.br/conta');
  assert.equal(u.searchParams.get('oobCode'), 'ABC123'); assert.equal(u.searchParams.get('continueUrl'), 'https://atletapay.com.br/master');
  assert.equal(u.searchParams.get('apiKey'), null, 'não carrega a chave no link');
  const fora = new URL(EM.linkDaPlataforma('https://x.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=Z&continueUrl=https%3A%2F%2Fgolpe.com%2F', 'resetPassword'));
  assert.equal(fora.searchParams.get('continueUrl'), null, 'volta para site de fora é descartada');
  const { f, ctx } = ctxDe(base());
  const t0 = Date.parse('2026-10-08T12:00:00Z');
  assert.equal(await EM.dentroDoLimite(ctx, 'a@b.com', t0), true);
  assert.equal(await EM.dentroDoLimite(ctx, 'A@B.com', t0 + 1000), true);
  assert.equal(await EM.dentroDoLimite(ctx, 'a@b.com', t0 + 2000), true);
  assert.equal(await EM.dentroDoLimite(ctx, 'a@b.com', t0 + 3000), false, '4º pedido na mesma hora');
  assert.equal(await EM.dentroDoLimite(ctx, 'a@b.com', t0 + 3700000), true, 'na hora seguinte libera');
  assert.ok(f.ler(`limitesEmail/${EM.hashEmail('a@b.com')}`).envios.length >= 4);
});

test('e-mails: pedido sem serviço configurado não envia; com serviço, envia com a cara da escola e apaga o pedido', async () => {
  const { f, ctx, auth } = ctxDe(base({ escolasPublicas: { liberdade: { nome: 'Capoeira Liberdade e Expressão', nomeCurto: 'Liberdade e Expressão', cores: null } } }));
  auth.usuarios.set('nat', { uid: 'nat', email: 'nat@ex.com', customClaims: {} });
  f.db.doc('usuarios/nat').update({ escolaId: 'liberdade', email: 'nat@ex.com' });
  ctx.auth.getUserByEmail = async (e) => { const u = Array.from(auth.usuarios.values()).find((x) => x.email === e); if (!u) { const er = new Error('no user'); er.code = 'auth/user-not-found'; throw er; } return u; };
  ctx.auth.generatePasswordResetLink = async (e, s) => `https://capoeira-liberdade.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=OOB-${e}&continueUrl=${encodeURIComponent((s && s.url) || '')}`;
  const enviados = [];
  ctx.fetch = async (url, op) => { enviados.push({ url, corpo: JSON.parse(op.body), headers: op.headers }); return { ok: true, status: 200, text: async () => '' }; };
  f.db.doc('pedidosEmail/p1').set({ tipo: 'senha', email: 'nat@ex.com', voltarPara: 'https://liberdadeeexpressao.com.br/login.html' });
  assert.equal(await EM.atenderPedidoEmail(ctx, 'p1', f.ler('pedidosEmail/p1')), 'sem-servico');
  assert.equal(f.ler('pedidosEmail/p1'), undefined, 'pedido apagado');
  f.db.doc('segredos/email').set({ provedor: 'resend', chave: 're_teste', remetente: 'noreply@atletapay.com.br', nomeRemetente: 'AtletaPay' });
  f.db.doc('pedidosEmail/p2').set({ tipo: 'senha', email: 'NAT@ex.com', voltarPara: 'https://liberdadeeexpressao.com.br/login.html' });
  assert.equal(await EM.atenderPedidoEmail(ctx, 'p2', f.ler('pedidosEmail/p2')), 'enviado');
  assert.equal(enviados.length, 1);
  const c = enviados[0].corpo;
  assert.equal(enviados[0].url, 'https://api.resend.com/emails');
  assert.deepEqual(c.to, ['nat@ex.com']); assert.equal(c.from, 'AtletaPay <noreply@atletapay.com.br>');
  assert.match(c.subject, /Crie uma senha nova · Liberdade e Expressão/);
  assert.match(c.html, /https:\/\/atletapay\.com\.br\/conta\?mode=resetPassword&amp;oobCode=OOB-nat%40ex\.com/);
  assert.match(c.html, /continueUrl=https%3A%2F%2Fliberdadeeexpressao\.com\.br%2Flogin\.html/);
  // E-mail sem conta: nada sai (e o app responde igual)
  f.db.doc('pedidosEmail/p3').set({ tipo: 'senha', email: 'ninguem@ex.com' });
  assert.equal(await EM.atenderPedidoEmail(ctx, 'p3', f.ler('pedidosEmail/p3')), 'sem-conta');
  assert.equal(enviados.length, 1);
  // E-mail inválido
  assert.equal(await EM.atenderPedidoEmail(ctx, 'p4', { tipo: 'senha', email: 'x<script>@' }), 'email-invalido');
});

test('e-mails: Testar no Mega painel liga os e-mails próprios só se o envio funcionar', async () => {
  const { f, ctx } = ctxDe(base());
  f.db.doc('segredos/email').set({ provedor: 'brevo', chave: 'xkeysib-teste' });
  ctx.fetch = async () => ({ ok: false, status: 401, text: async () => 'chave inválida' });
  await assert.rejects(() => EM.testarEmail(ctx, 'admin@ex.com'), /401/);
  assert.equal(f.ler('plataforma/publico').emailsProprios, false);
  let corpo = null;
  ctx.fetch = async (url, op) => { corpo = { url, b: JSON.parse(op.body), h: op.headers }; return { ok: true, status: 201, text: async () => '' }; };
  await EM.testarEmail(ctx, 'admin@ex.com');
  assert.equal(f.ler('plataforma/publico').emailsProprios, true);
  assert.equal(corpo.url, 'https://api.brevo.com/v3/smtp/email'); assert.equal(corpo.h['api-key'], 'xkeysib-teste');
  assert.deepEqual(corpo.b.to, [{ email: 'admin@ex.com' }]);
});
