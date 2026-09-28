// Testes das regras do Firestore (firebase/firestore.rules) no emulador.
// Rodam no GitHub Actions antes de publicar; se algum falhar, nada é publicado.
// Local: firebase emulators:exec --only firestore "cd tests/regras && npm test"
import { test, before, after } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc, collection, query, where, orderBy, limit, getDocs, arrayUnion,
} from 'firebase/firestore';

const REGRAS = readFileSync(fileURLToPath(new URL('../../firebase/firestore.rules', import.meta.url)), 'utf8');
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
let env;
const db = (uid) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const AGORA = new Date().toISOString();

before(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-le-regras', firestore: { rules: REGRAS, host, port: Number(port) } });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = ctx.firestore();
    const u = {
      admin: { nome: 'Admin', papeis: ['admin'] },
      profeta: { nome: 'Isaias', papeis: ['aluno', 'mestre'], acessoGeral: true, academiaId: 'profeta', academiaGerenciadaId: 'profeta' },
      tay: { nome: 'Taynara', papeis: ['aluno', 'mestre'], academiaId: 'profeta', academiaGerenciadaId: 'taynara' },
      nat: { nome: 'Natanael', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, cordaoAtual: 'Quilombola', idade: 30, notas: {}, acessoGeral: false },
      kid: { nome: 'Kid', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, cordaoAtual: 'Iniciante', idade: 10, responsavelUid: 'mae', notas: {} },
      mae: { nome: 'Mãe', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, idade: 40, notas: {} },
      estranho: { nome: 'Estranho', papeis: ['aluno'], academiaId: 'profeta', academiaGerenciadaId: null, idade: 25, notas: {} },
    };
    for (const [id, v] of Object.entries(u)) await setDoc(doc(d, 'usuarios', id), v);
    const pp = {
      nat: { nome: 'Natanael', cordaoAtual: 'Quilombola', academiaId: 'taynara', menor: false, seguidores: [], pedidosSeguir: [], brasoes: {} },
      kid: { nome: 'Kid', cordaoAtual: 'Iniciante', academiaId: 'taynara', menor: true, privado: true, seguidores: [], pedidosSeguir: [] },
      tay: { nome: 'Taynara', cordaoAtual: 'Professor', academiaId: 'profeta', academiaGerenciadaId: 'taynara', menor: false, seguidores: [] },
      estranho: { nome: 'Estranho', cordaoAtual: 'Iniciante', academiaId: 'profeta', menor: false, seguidores: [] },
      mae: { nome: 'Mãe', cordaoAtual: 'Iniciante', academiaId: 'taynara', menor: false, seguidores: [] },
    };
    for (const [id, v] of Object.entries(pp)) await setDoc(doc(d, 'perfisPublicos', id), v);
    const base = { texto: 't', midias: [], tipo: 'post', curtidas: [], comentariosCount: 0, criadoEm: AGORA };
    await setDoc(doc(d, 'posts', 'pub'), { ...base, autorUid: 'tay', autorAcademiaId: 'profeta', revisao: 'ok', publico: true, oculto: false });
    await setDoc(doc(d, 'posts', 'escondido'), { ...base, autorUid: 'nat', autorAcademiaId: 'taynara', revisao: 'ok', publico: false, oculto: true });
    await setDoc(doc(d, 'posts', 'pend'), { ...base, autorUid: 'kid', autorAcademiaId: 'taynara', nucleoId: 'taynara', revisao: 'pendente', publico: false, oculto: false, midias: [{ url: 'x', tipo: 'imagem' }] });
    await setDoc(doc(d, 'posts/pub/comentarios/c1'), { autorUid: 'nat', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'posts/escondido/comentarios/c1'), { autorUid: 'tay', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'conversas', 'kid__tay'), { tipo: 'direta', participantes: ['kid', 'tay'], nucleosIds: ['taynara', 'profeta'], envolveMenor: true, responsaveisIds: ['mae'] });
    await setDoc(doc(d, 'conversas/kid__tay/mensagens/m1'), { autorUid: 'tay', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'conversas', 'estranho__nat'), { tipo: 'direta', participantes: ['estranho', 'nat'], nucleosIds: ['profeta', 'taynara'], envolveMenor: false, responsaveisIds: [] });
    await setDoc(doc(d, 'notificacoes/nat/itens/n1'), { titulo: 'oi', lida: false, criadoEm: AGORA });
    await setDoc(doc(d, 'auditoria', 'a1'), { resumo: 'x' });
    await setDoc(doc(d, 'admins', 'antigo'), { senhaHash: 'abc' });
    await setDoc(doc(d, 'siteConteudo', 'landing'), { titulo: 'site' });
  });
});
after(async () => { if (env) await env.cleanup(); });

test('autocadastro: só aluno Iniciante, sem acesso geral nem brasões', async () => {
  const novo = { nome: 'Novo', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, cordaoAtual: 'Iniciante', notas: {}, responsavelUid: null, statusAtual: 'Ativo' };
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, acessoGeral: true }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, cordaoAtual: 'Mestre' }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, brasoesAdmin: { x: {} } }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, papeis: ['aluno', 'admin'] }));
  await assertSucceeds(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), novo));
});

test('a pessoa não muda a própria graduação, idade nem total de brasões', async () => {
  await assertSucceeds(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { celular: '(67) 99999-0000' }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { cordaoAtual: 'Mestre' }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { idade: 17 }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { brasoesTotal: 45 }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { acessoGeral: true }));
});

test('cartão público: a pessoa só mexe em bio/capa/privacidade', async () => {
  await assertSucceeds(updateDoc(doc(db('nat'), 'perfisPublicos', 'nat'), { bio: 'Capoeirista', privado: true }));
  await assertFails(updateDoc(doc(db('nat'), 'perfisPublicos', 'nat'), { brasoes: { 'cem-presencas': { em: AGORA } } }));
  await assertFails(updateDoc(doc(db('nat'), 'perfisPublicos', 'nat'), { cordaoAtual: 'Mestre' }));
  await assertFails(updateDoc(doc(db('kid'), 'perfisPublicos', 'kid'), { menor: false }));
  await assertSucceeds(updateDoc(doc(db('mae'), 'perfisPublicos', 'kid'), { privado: false }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'perfisPublicos', 'nat'), { seguidores: arrayUnion('tay') }));
  await assertFails(updateDoc(doc(db('tay'), 'perfisPublicos', 'nat'), { seguidores: arrayUnion('estranho') }));
});

test('post ocultado ou em revisão não vaza pela API', async () => {
  await assertSucceeds(getDoc(doc(db('estranho'), 'posts', 'pub')));
  await assertFails(getDoc(doc(db('estranho'), 'posts', 'escondido')));
  await assertFails(getDoc(doc(db('estranho'), 'posts', 'pend')));
  await assertSucceeds(getDoc(doc(db('nat'), 'posts', 'escondido')));
  await assertSucceeds(getDoc(doc(db('tay'), 'posts', 'pend')));
  await assertSucceeds(getDoc(doc(db('admin'), 'posts', 'escondido')));
  await assertSucceeds(getDocs(query(collection(db('estranho'), 'posts'), where('publico', '==', true), orderBy('criadoEm', 'desc'), limit(20))));
  await assertFails(getDocs(query(collection(db('estranho'), 'posts'), orderBy('criadoEm', 'desc'), limit(20))));
  await assertSucceeds(getDocs(query(collection(db('nat'), 'posts'), where('autorUid', '==', 'nat'))));
  await assertSucceeds(getDocs(query(collection(db('tay'), 'posts'), where('revisao', '==', 'pendente'), where('autorAcademiaId', '==', 'taynara'))));
  await assertFails(getDocs(collection(db('estranho'), 'posts/escondido/comentarios')));
  await assertSucceeds(getDocs(collection(db('estranho'), 'posts/pub/comentarios')));
});

test('publicar: "publico" coerente, menor com foto sempre em revisão, cordão real', async () => {
  const p = { autorUid: 'nat', texto: 'treino', midias: [], tipo: 'post', curtidas: [], comentariosCount: 0, criadoEm: AGORA, oculto: false };
  await assertSucceeds(addDoc(collection(db('nat'), 'posts'), { ...p, revisao: 'ok', publico: true, autorCordao: 'Quilombola' }));
  await assertFails(addDoc(collection(db('nat'), 'posts'), { ...p, revisao: 'pendente', publico: true }));
  await assertFails(addDoc(collection(db('nat'), 'posts'), { ...p, revisao: 'ok', publico: true, autorCordao: 'Mestre' }));
  await assertFails(addDoc(collection(db('nat'), 'posts'), { ...p, revisao: 'ok', publico: true, oculto: true }));
  const foto = { ...p, autorUid: 'kid', midias: [{ url: 'x', tipo: 'imagem' }] };
  await assertFails(addDoc(collection(db('kid'), 'posts'), { ...foto, revisao: 'ok', publico: true }));
  await assertSucceeds(addDoc(collection(db('kid'), 'posts'), { ...foto, revisao: 'pendente', publico: false }));
});

test('revisão e ocultar: só quem modera; o autor não se aprova', async () => {
  await assertFails(updateDoc(doc(db('kid'), 'posts', 'pend'), { revisao: 'ok', publico: true }));
  await assertFails(updateDoc(doc(db('tay'), 'posts', 'pend'), { revisao: 'ok', publico: false, revisadoPor: 'tay' }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'posts', 'pend'), { revisao: 'ok', publico: true, revisadoPor: 'tay' }));
  await assertFails(updateDoc(doc(db('tay'), 'posts', 'pub'), { oculto: true, publico: false, ocultadoPor: 'tay', ocultadoEm: AGORA }));
  await assertFails(updateDoc(doc(db('admin'), 'posts', 'pub'), { oculto: true, publico: true, ocultadoPor: 'admin', ocultadoEm: AGORA }));
  await assertSucceeds(updateDoc(doc(db('admin'), 'posts', 'pub'), { oculto: true, publico: false, ocultadoPor: 'admin', ocultadoEm: AGORA }));
  await assertFails(deleteDoc(doc(db('admin'), 'posts', 'escondido')));
  await assertSucceeds(getDoc(doc(db('estranho'), 'posts', 'nao-existe')));
  await assertFails(addDoc(collection(db('nat'), 'posts/pub/comentarios'), { autorUid: 'nat', texto: 'x', criadoEm: AGORA, oculto: false }));
});

test('conversas: o responsável legal acompanha o menor; o núcleo não lê conversa direta', async () => {
  await assertSucceeds(getDoc(doc(db('nat'), 'conversas', 'nat__tay')));
  await assertSucceeds(getDoc(doc(db('tay'), 'conversas', 'nucleo_taynara')));
  await assertSucceeds(getDoc(doc(db('mae'), 'conversas', 'kid__tay')));
  await assertSucceeds(getDocs(query(collection(db('mae'), 'conversas'), where('responsaveisIds', 'array-contains', 'mae'))));
  await assertSucceeds(getDocs(collection(db('mae'), 'conversas/kid__tay/mensagens')));
  await assertFails(addDoc(collection(db('mae'), 'conversas/kid__tay/mensagens'), { autorUid: 'mae', texto: 'oi', criadoEm: AGORA }));
  await assertSucceeds(getDoc(doc(db('tay'), 'conversas', 'kid__tay')));
  await assertFails(getDoc(doc(db('estranho'), 'conversas', 'kid__tay')));
  await assertFails(getDoc(doc(db('tay'), 'conversas', 'estranho__nat')));
  await assertSucceeds(getDoc(doc(db('profeta'), 'conversas', 'estranho__nat')));
  await assertFails(setDoc(doc(db('nat'), 'conversas', 'mae__nat'), { tipo: 'direta', participantes: ['mae', 'nat'], responsaveisIds: ['nat'] }));
  await assertSucceeds(setDoc(doc(db('nat'), 'conversas', 'mae__nat'), { tipo: 'direta', participantes: ['mae', 'nat'] }));
  await assertFails(setDoc(doc(db('estranho'), 'conversas', 'estranho__kid'), { tipo: 'direta', participantes: ['estranho', 'kid'] }));
});

test('notificações, aparelhos e auditoria', async () => {
  await assertSucceeds(getDoc(doc(db('nat'), 'notificacoes/nat/itens/n1')));
  await assertFails(getDoc(doc(db('tay'), 'notificacoes/nat/itens/n1')));
  await assertSucceeds(updateDoc(doc(db('nat'), 'notificacoes/nat/itens/n1'), { lida: true, lidaEm: AGORA }));
  await assertFails(updateDoc(doc(db('nat'), 'notificacoes/nat/itens/n1'), { titulo: 'x' }));
  await assertFails(addDoc(collection(db('nat'), 'notificacoes/tay/itens'), { titulo: 'spam' }));
  await assertSucceeds(setDoc(doc(db('nat'), 'usuarios/nat/dispositivos/d1'), { token: 'abc', plataforma: 'web', base: 'https://x/', criadoEm: AGORA }));
  await assertFails(setDoc(doc(db('nat'), 'usuarios/tay/dispositivos/d1'), { token: 'abc' }));
  await assertSucceeds(getDoc(doc(db('admin'), 'auditoria', 'a1')));
  await assertSucceeds(getDoc(doc(db('profeta'), 'auditoria', 'a1')));
  await assertFails(getDoc(doc(db('tay'), 'auditoria', 'a1')));
  await assertFails(setDoc(doc(db('admin'), 'auditoria', 'a2'), { resumo: 'forjado' }));
});

test('LGPD e coleções antigas', async () => {
  await assertSucceeds(addDoc(collection(db('nat'), 'solicitacoes'), { tipo: 'exclusao_conta', solicitanteUid: 'nat', status: 'pendente', criadoEm: AGORA }));
  await assertFails(addDoc(collection(db('nat'), 'solicitacoes'), { tipo: 'exclusao_conta', solicitanteUid: 'kid', status: 'pendente' }));
  await assertSucceeds(getDocs(query(collection(db('nat'), 'solicitacoes'), where('solicitanteUid', '==', 'nat'))));
  await assertFails(getDoc(doc(db(null), 'admins', 'antigo')));
  await assertFails(getDoc(doc(db('nat'), 'admins', 'antigo')));
  await assertSucceeds(getDoc(doc(db(null), 'siteConteudo', 'landing')));
  await assertFails(setDoc(doc(db('nat'), 'siteConteudo', 'landing'), { titulo: 'hack' }));
  await assertFails(setDoc(doc(db('admin'), 'config', 'migracoes'), { m1: 'x' }));
  await assertSucceeds(addDoc(collection(db('admin'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'admin', status: 'pendente' }));
  await assertFails(addDoc(collection(db('tay'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'tay', status: 'pendente' }));
  await assertFails(addDoc(collection(db('admin'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'outro', status: 'pendente' }));
});
