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
