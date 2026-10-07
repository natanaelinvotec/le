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
// Todo login de teste é da escola nº 1 (como o servidor grava nos custom claims), salvo quando o teste diz outra.
const db = (uid, claims = { escolaId: 'liberdade' }) => (uid ? env.authenticatedContext(uid, claims).firestore() : env.unauthenticatedContext().firestore());
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
    // Como o servidor deixa depois da migração m8: todo cadastro com a escola.
    for (const [id, v] of Object.entries(u)) await setDoc(doc(d, 'usuarios', id), { ...v, escolaId: 'liberdade' });
    await setDoc(doc(d, 'usuarios', 'rafa'), { nome: 'Rafa', papeis: ['aluno', 'mestre'], academiaId: 'gracie', academiaGerenciadaId: 'gracie', acessoGeral: true, escolaId: 'gracie-cg', notas: {} });
    for (const [id, e] of [['taynara', 'liberdade'], ['profeta', 'liberdade'], ['gracie', 'gracie-cg']]) await setDoc(doc(d, 'nucleos', id), { nome: id, ativo: true, escolaId: e });
    const pp = {
      nat: { nome: 'Natanael', cordaoAtual: 'Quilombola', academiaId: 'taynara', menor: false, seguidores: [], pedidosSeguir: [], brasoes: {} },
      kid: { nome: 'Kid', cordaoAtual: 'Iniciante', academiaId: 'taynara', menor: true, privado: true, seguidores: [], pedidosSeguir: [] },
      tay: { nome: 'Taynara', cordaoAtual: 'Professor', academiaId: 'profeta', academiaGerenciadaId: 'taynara', menor: false, seguidores: [] },
      estranho: { nome: 'Estranho', cordaoAtual: 'Iniciante', academiaId: 'profeta', menor: false, seguidores: [] },
      mae: { nome: 'Mãe', cordaoAtual: 'Iniciante', academiaId: 'taynara', menor: false, seguidores: [] },
    };
    for (const [id, v] of Object.entries(pp)) await setDoc(doc(d, 'perfisPublicos', id), { ...v, escolaId: 'liberdade' });
    await setDoc(doc(d, 'perfisPublicos', 'rafa'), { nome: 'Rafa', cordaoAtual: 'Faixa preta', academiaId: 'gracie', menor: false, seguidores: [], pedidosSeguir: [], escolaId: 'gracie-cg' });
    const base = { texto: 't', midias: [], tipo: 'post', curtidas: [], comentariosCount: 0, criadoEm: AGORA, escolaId: 'liberdade' };
    await setDoc(doc(d, 'posts', 'pub'), { ...base, autorUid: 'tay', autorAcademiaId: 'profeta', revisao: 'ok', publico: true, oculto: false });
    await setDoc(doc(d, 'posts', 'escondido'), { ...base, autorUid: 'nat', autorAcademiaId: 'taynara', revisao: 'ok', publico: false, oculto: true });
    await setDoc(doc(d, 'posts', 'pend'), { ...base, autorUid: 'kid', autorAcademiaId: 'taynara', nucleoId: 'taynara', revisao: 'pendente', publico: false, oculto: false, midias: [{ url: 'x', tipo: 'imagem' }] });
    await setDoc(doc(d, 'posts/pub/comentarios/c1'), { autorUid: 'nat', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'posts/escondido/comentarios/c1'), { autorUid: 'tay', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'conversas', 'kid__tay'), { tipo: 'direta', participantes: ['kid', 'tay'], nucleosIds: ['taynara', 'profeta'], envolveMenor: true, responsaveisIds: ['mae'], escolaId: 'liberdade' });
    await setDoc(doc(d, 'conversas/kid__tay/mensagens/m1'), { autorUid: 'tay', texto: 'oi', criadoEm: AGORA });
    await setDoc(doc(d, 'conversas', 'estranho__nat'), { tipo: 'direta', participantes: ['estranho', 'nat'], nucleosIds: ['profeta', 'taynara'], envolveMenor: false, responsaveisIds: [], escolaId: 'liberdade' });
    await setDoc(doc(d, 'notificacoes/nat/itens/n1'), { titulo: 'oi', lida: false, criadoEm: AGORA });
    await setDoc(doc(d, 'auditoria', 'a1'), { resumo: 'x', escolaId: 'liberdade' });
    await setDoc(doc(d, 'admins', 'antigo'), { senhaHash: 'abc' });
    await setDoc(doc(d, 'siteConteudo', 'landing'), { titulo: 'site' });
    await setDoc(doc(d, 'carteirinhas', 'ABCDEFGH23'), { nome: 'Natanael', cordao: 'Quilombola', ativo: true, controle: 'livre', validaAte: null });
    await setDoc(doc(d, 'carteirinhasIndice', 'nat'), { codigo: 'ABCDEFGH23', matricula: 'LE-2026-0001' });
    await setDoc(doc(d, 'certificados', 'CERT000001'), { numero: 'LE-CERT-2026-0001', nome: 'Natanael', cordao: 'Vagante', ativo: true });
    await setDoc(doc(d, 'certificadosDe', 'nat'), { itens: [{ codigo: 'CERT000001', cordao: 'Vagante' }] });
    await setDoc(doc(d, 'certificadosDe', 'kid'), { itens: [] });
    await setDoc(doc(d, 'campeonatos', 'camp1'), { nome: 'Interno', status: 'inscricoes', academiaId: 'taynara', organizadorUid: 'tay', data: '2026-11-01', escolaId: 'liberdade' });
    await setDoc(doc(d, 'campeonatos', 'campGrupo'), { nome: 'Do grupo', status: 'chaves', academiaId: null, organizadorUid: 'profeta', data: '2026-11-01', escolaId: 'liberdade' });
    // Conteúdo de outra escola (CT de Jiu-Jitsu) para provar o isolamento.
    await setDoc(doc(d, 'eventos', 'evLib'), { nome: 'Batizado', data: '2026-11-20', escolaId: 'liberdade' });
    await setDoc(doc(d, 'eventos', 'evGracie'), { nome: 'Graduação de faixas', data: '2026-11-21', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'eventos/evGracie/confirmados/rafa'), { nome: 'Rafa', em: AGORA });
    await setDoc(doc(d, 'avisos', 'avLib'), { titulo: 'Treino', criadoEm: AGORA, escolaId: 'liberdade' });
    await setDoc(doc(d, 'avisos', 'avGracie'), { titulo: 'Oss', criadoEm: AGORA, escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'materiais', 'matGracie'), { titulo: 'Apostila', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'stories', 'stGracie'), { autorUid: 'rafa', midiaUrl: 'x', criadoEm: AGORA, expiraEm: '2099-01-01T00:00:00.000Z', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'campeonatos', 'campGracie'), { nome: 'Interno do CT', status: 'inscricoes', academiaId: 'gracie', organizadorUid: 'rafa', tipo: 'interno', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'campeonatos', 'campAberto'), { nome: 'Open MS', status: 'inscricoes', academiaId: 'gracie', organizadorUid: 'rafa', tipo: 'externo', escolaId: 'gracie-cg' });
    // Rede e gestão da outra escola (1c partes 2 e 3).
    await setDoc(doc(d, 'posts', 'postGracie'), { ...base, autorUid: 'rafa', autorAcademiaId: 'gracie', nucleoId: 'gracie', revisao: 'ok', publico: true, oculto: false, escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'posts/postGracie/comentarios/c1'), { autorUid: 'rafa', texto: 'Oss', criadoEm: AGORA });
    await setDoc(doc(d, 'presencas', 'presGracie'), { uid: 'rafa', nucleoId: 'gracie', origem: 'manual', registradoPor: 'rafa', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'pagamentos', 'pagGracie'), { alunoId: 'rafa', academiaId: 'gracie', valor: 150, escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'solicitacoes', 'solGracie'), { tipo: 'mensalidade', academiaId: 'gracie', solicitanteUid: 'rafa', status: 'pendente', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'denuncias', 'denGracie'), { denuncianteUid: 'rafa', motivo: 'x', status: 'aberta', autorPostAcademiaId: 'gracie', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'auditoria', 'audGracie'), { resumo: 'y', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'conversas', 'outro__rafa'), { tipo: 'direta', participantes: ['outro', 'rafa'], responsaveisIds: [], escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'fotosCarteirinha', 'rafa'), { status: 'pendente', academiaId: 'gracie', escolaId: 'gracie-cg' });
    await setDoc(doc(d, 'beneficiarios', 'rafa'), { lista: [] });
    await setDoc(doc(d, 'usuarios/rafa/avaliacoes/a1'), { nota: 5 });
  });
});
after(async () => { if (env) await env.cleanup(); });

test('autocadastro: só aluno Iniciante, sem acesso geral nem brasões', async () => {
  const novo = { nome: 'Novo', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, cordaoAtual: 'Iniciante', notas: {}, responsavelUid: null, statusAtual: 'Ativo' };
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, acessoGeral: true }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, cordaoAtual: 'Mestre' }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, brasoesAdmin: { x: {} } }));
  await assertFails(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, papeis: ['aluno', 'admin'] }));
  // Atenção e inclusão: a própria pessoa grava na inscrição e pode corrigir depois; dado sensível, mas do próprio titular.
  await assertSucceeds(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), { ...novo, inclusao: { condicoes: ['TEA'], observacoes: 'avisar antes de mudar a atividade' } }));
  await assertSucceeds(updateDoc(doc(db('novo1'), 'usuarios', 'novo1'), { inclusao: { condicoes: [], observacoes: '' } }));
  await assertFails(getDoc(doc(db('estranho'), 'usuarios', 'novo1')), 'outro aluno não lê a ficha (inclusive a inclusão)');
  await assertSucceeds(setDoc(doc(db('novo1'), 'usuarios', 'novo1'), novo));
});

test('responsável legal atualiza SÓ a ficha de atenção e inclusão do dependente', async () => {
  const ficha = { condicoes: ['TEA'], apoios: ['aviso-mudanca', 'som-baixo'], observacoes: 'avisar antes de mudar a atividade' };
  await assertSucceeds(updateDoc(doc(db('mae'), 'usuarios', 'kid'), { inclusao: ficha }));
  await assertFails(updateDoc(doc(db('mae'), 'usuarios', 'kid'), { inclusao: ficha, cordaoAtual: 'Mestre' }), 'junto com outro campo, não');
  await assertFails(updateDoc(doc(db('mae'), 'usuarios', 'kid'), { nome: 'Outro nome' }), 'nada além da inclusão');
  await assertFails(updateDoc(doc(db('estranho'), 'usuarios', 'kid'), { inclusao: ficha }), 'quem não é o responsável não grava');
  await assertFails(updateDoc(doc(db('mae'), 'usuarios', 'nat'), { inclusao: ficha }), 'só do próprio dependente');
  await assertSucceeds(updateDoc(doc(db('tay'), 'usuarios', 'kid'), { inclusao: { condicoes: ['TEA', 'TDAH'], apoios: [], observacoes: '' } }), 'o professor do núcleo ajusta no card Avaliar/Editar');
});

test('presença pela foto da turma: só o responsável do núcleo, até 7 dias atrás, nunca no futuro', async () => {
  const DIA = 86400000;
  const base = { uid: 'nat', alunoNome: 'Natanael', nucleoId: 'taynara', confirmadoAos30: true, origem: 'faceid-foto', registradoPor: 'tay' };
  await assertSucceeds(setDoc(doc(db('tay'), 'presencas', 'ft1'), { ...base, entradaEm: new Date(), confirmadoEm: new Date() }));
  await assertSucceeds(setDoc(doc(db('tay'), 'presencas', 'ft2'), { ...base, entradaEm: new Date(Date.now() - 6 * DIA), confirmadoEm: new Date() }), 'treino da semana passada');
  await assertFails(setDoc(doc(db('tay'), 'presencas', 'ft3'), { ...base, entradaEm: new Date(Date.now() - 9 * DIA), confirmadoEm: new Date() }), 'mais de 8 dias, não');
  await assertFails(setDoc(doc(db('tay'), 'presencas', 'ft4'), { ...base, entradaEm: new Date(Date.now() + 2 * DIA), confirmadoEm: new Date() }), 'no futuro, não');
  await assertFails(setDoc(doc(db('tay'), 'presencas', 'ft5'), { ...base, entradaEm: AGORA, confirmadoEm: new Date() }), 'data como texto, não');
  await assertFails(setDoc(doc(db('estranho'), 'presencas', 'ft6'), { ...base, registradoPor: 'estranho', entradaEm: new Date(), confirmadoEm: new Date() }), 'aluno comum não lança presença');
  await assertFails(setDoc(doc(db('tay'), 'presencas', 'ft7'), { ...base, origem: 'foto', entradaEm: new Date(), confirmadoEm: new Date() }), 'origem desconhecida, não');
});

test('multi-escola: escolaId é do servidor; Fundador só mexe nos núcleos da própria escola', async () => {
  // Ninguém (além do Admin) troca a escola de um cadastro — nem o próprio, nem o professor.
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { escolaId: 'outra-escola' }), 'a pessoa não troca de escola sozinha');
  await assertFails(updateDoc(doc(db('tay'), 'usuarios', 'nat'), { escolaId: 'outra-escola' }), 'o professor não muda a escola do aluno');
  await assertFails(setDoc(doc(db('novo2'), 'usuarios', 'novo2'), { nome: 'Novo', papeis: ['aluno'], academiaId: 'taynara', academiaGerenciadaId: null, cordaoAtual: 'Iniciante', notas: {}, responsavelUid: null, statusAtual: 'Ativo', escolaId: 'outra-escola' }), 'inscrição não escolhe a escola (o servidor deduz pelo núcleo)');
  await assertSucceeds(updateDoc(doc(db('admin'), 'usuarios', 'nat'), { escolaId: 'liberdade' }), 'Admin pode');
  // Fundador (login da escola nº 1): cria núcleo da Liberdade, não de outra escola.
  await assertSucceeds(setDoc(doc(db('profeta'), 'nucleos', 'novo-nucleo'), { nome: 'Núcleo Novo', escolaId: 'liberdade' }));
  await assertFails(setDoc(doc(db('profeta'), 'nucleos', 'nucleo-alheio'), { nome: 'Alheio', escolaId: 'gracie-cg' }));
  await assertFails(updateDoc(doc(db('profeta'), 'nucleos', 'novo-nucleo'), { escolaId: 'gracie-cg' }), 'não leva núcleo para outra escola');
  await assertSucceeds(updateDoc(doc(db('profeta'), 'nucleos', 'novo-nucleo'), { nome: 'Núcleo Novo (Centro)' }));
  // Fundador de OUTRA escola (claim) não mexe em núcleo da Liberdade.
  const outro = env.authenticatedContext('profeta', { escolaId: 'gracie-cg' }).firestore();
  await assertFails(updateDoc(doc(outro, 'nucleos', 'novo-nucleo'), { nome: 'Invadido' }));
  await assertSucceeds(setDoc(doc(db('admin'), 'nucleos', 'gracie'), { nome: 'CT Gracie', escolaId: 'gracie-cg' }), 'Admin liga núcleo a qualquer escola');
  // Cartão público da escola e domínios: todo mundo lê, só o servidor escreve (nem o Admin pelo app).
  await assertSucceeds(getDoc(doc(db(null), 'escolasPublicas', 'liberdade')));
  await assertFails(setDoc(doc(db('admin'), 'escolasPublicas', 'liberdade'), { nome: 'X' }));
  await assertSucceeds(getDoc(doc(db(null), 'dominios', 'liberdadeeexpressao.com.br')));
  await assertFails(getDocs(collection(db('admin'), 'dominios')), 'ninguém lista os domínios');
  await assertFails(setDoc(doc(db('profeta'), 'dominios', 'x.com'), { escolaId: 'liberdade' }));
});

test('a pessoa não muda a própria graduação, idade nem total de brasões', async () => {
  await assertSucceeds(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { celular: '(67) 99999-0000' }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { cordaoAtual: 'Mestre' }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { idade: 17 }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { brasoesTotal: 45 }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { acessoGeral: true }));
  // Contadores dos brasões "Eu vou!" e "Mostrou o cordão": só o servidor soma.
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { eventosConfirmados: 99 }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { cardsCompartilhados: 99 }));
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
  await assertSucceeds(getDocs(query(collection(db('estranho'), 'posts'), where('escolaId', '==', 'liberdade'), where('publico', '==', true), orderBy('criadoEm', 'desc'), limit(20))));
  await assertFails(getDocs(query(collection(db('estranho'), 'posts'), where('publico', '==', true), orderBy('criadoEm', 'desc'), limit(20))), 'feed sem o filtro da escola');
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
  // Site novo: Admin publica em siteConteudo/site (e guarda a anterior); ninguém mais grava; outros ids fechados.
  await assertSucceeds(setDoc(doc(db('admin'), 'siteConteudo', 'site'), { versao: 1, topo: { titulo: 'A roda' } }));
  await assertSucceeds(setDoc(doc(db('admin'), 'siteConteudo', 'site-anterior'), { versao: 1 }));
  await assertSucceeds(getDoc(doc(db(null), 'siteConteudo', 'site')));
  await assertFails(getDoc(doc(db(null), 'siteConteudo', 'site-anterior')));
  await assertFails(setDoc(doc(db('profeta'), 'siteConteudo', 'site'), { versao: 1 }));
  await assertFails(setDoc(doc(db('admin'), 'siteConteudo', 'qualquer'), { versao: 1 }));
  await assertFails(setDoc(doc(db('admin'), 'config', 'migracoes'), { m1: 'x' }));
  await assertSucceeds(addDoc(collection(db('admin'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'admin', status: 'pendente' }));
  await assertFails(addDoc(collection(db('tay'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'tay', status: 'pendente' }));
  // Desfazer graduação: só o Admin Master pede (o responsável do núcleo registra de novo).
  await assertSucceeds(addDoc(collection(db('admin'), 'comandos'), { tipo: 'desfazerGraduacao', uid: 'nat', cordao: 'Vagante', em: AGORA, porUid: 'admin', status: 'pendente' }));
  await assertFails(addDoc(collection(db('tay'), 'comandos'), { tipo: 'desfazerGraduacao', uid: 'nat', cordao: 'Vagante', em: AGORA, porUid: 'tay', status: 'pendente' }));
  await assertFails(addDoc(collection(db('admin'), 'comandos'), { tipo: 'excluirConta', uid: 'nat', porUid: 'outro', status: 'pendente' }));
});

// ---------- Carteirinha virtual ----------
const urlFoto = (uid, arq = '1.jpg') => `https://firebasestorage.googleapis.com/v0/b/x/o/carteirinha%2F${uid}%2F${arq}?alt=media&token=t`;
const fotoDe = (uid, porUid, extra = {}) => ({
  url: urlFoto(uid), caminho: `carteirinha/${uid}/1.jpg`, status: 'pendente', academiaId: 'taynara', alunoNome: 'Atleta',
  enviadoPorUid: porUid, enviadoPorNome: 'Quem enviou', enviadoEm: AGORA, ...extra,
});

test('carteirinha: verificação pública abre pelo código, mas não lista nem grava', async () => {
  await assertSucceeds(getDoc(doc(db(null), 'carteirinhas', 'ABCDEFGH23')));
  await assertFails(getDocs(collection(db(null), 'carteirinhas')));
  await assertFails(getDocs(collection(db('admin'), 'carteirinhas')));
  await assertFails(setDoc(doc(db('nat'), 'carteirinhas', 'ABCDEFGH23'), { nome: 'Natanael', ativo: true, controle: 'isento' }));
  await assertFails(setDoc(doc(db('admin'), 'carteirinhas', 'NOVO'), { nome: 'x' }));
  await assertFails(getDoc(doc(db('nat'), 'carteirinhasIndice', 'nat')));
  await assertFails(setDoc(doc(db('admin'), 'sistema', 'contadores'), { matricula: 0 }));
});

test('carteirinha: a pessoa não grava o espelho nem se declara isenta; o núcleo marca bolsista', async () => {
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { carteirinha: { codigo: 'X', validaAte: '2099-12-31' } }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { isentoMensalidade: true }));
  await assertSucceeds(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { sincronizarEm: AGORA }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'usuarios', 'nat'), { isentoMensalidade: true }));
  // Remover brasão (brasoesBloqueados): só o Admin Master — nem o núcleo nem o próprio atleta.
  await assertFails(updateDoc(doc(db('tay'), 'usuarios', 'nat'), { 'brasoesBloqueados.formou-primeiro': { em: AGORA } }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { 'brasoesBloqueados.formou-primeiro': { em: AGORA } }));
  await assertSucceeds(updateDoc(doc(db('admin'), 'usuarios', 'nat'), { 'brasoesBloqueados.formou-primeiro': { em: AGORA } }));
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { brasoesBloqueados: {} }));
  await assertFails(updateDoc(doc(db('estranho'), 'usuarios', 'nat'), { isentoMensalidade: false }));
});

test('carteirinha: foto de documento — atleta/responsável enviam pendente; núcleo avalia', async () => {
  // Atleta envia a própria foto (só "pendente", só na própria pasta, só link do Storage).
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { status: 'aprovada' })));
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { caminho: 'carteirinha/tay/1.jpg' })));
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { url: 'https://site-estranho.com/f.jpg' })));
  // Link de OUTRO arquivo (o núcleo veria uma foto e aprovaria outra): negado.
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { url: urlFoto('nat', 'outra.jpg') })));
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { url: urlFoto('tay') })));
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat', { academiaId: 'profeta' })));
  await assertFails(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'tay')));
  await assertSucceeds(setDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'nat')));
  // Responsável legal envia a do filho; estranho não envia de ninguém.
  await assertSucceeds(setDoc(doc(db('mae'), 'fotosCarteirinha', 'kid'), fotoDe('kid', 'mae')));
  await assertFails(setDoc(doc(db('estranho'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'estranho')));
  // Leitura: dono, responsável e núcleo; estranho não.
  await assertSucceeds(getDoc(doc(db('mae'), 'fotosCarteirinha', 'kid')));
  await assertSucceeds(getDoc(doc(db('tay'), 'fotosCarteirinha', 'nat')));
  await assertFails(getDoc(doc(db('estranho'), 'fotosCarteirinha', 'nat')));
  // Lista do núcleo (aprovação): só o responsável do núcleo filtrando pelo próprio núcleo.
  await assertSucceeds(getDocs(query(collection(db('tay'), 'fotosCarteirinha'), where('academiaId', '==', 'taynara'), where('status', '==', 'pendente'))));
  await assertFails(getDocs(query(collection(db('nat'), 'fotosCarteirinha'), where('academiaId', '==', 'taynara'))));
  await assertSucceeds(getDocs(query(collection(db('profeta'), 'fotosCarteirinha'), where('escolaId', '==', 'liberdade'), where('academiaId', '==', 'taynara'))));
  // O atleta não aprova a própria foto; o núcleo aprova.
  await assertFails(updateDoc(doc(db('nat'), 'fotosCarteirinha', 'nat'), { status: 'aprovada', avaliadoPorUid: 'nat', avaliadoEm: AGORA }));
  await assertFails(updateDoc(doc(db('tay'), 'fotosCarteirinha', 'nat'), { status: 'aprovada', avaliadoPorUid: 'tay', caminho: 'carteirinha/nat/2.jpg' }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'fotosCarteirinha', 'nat'), { status: 'aprovada', avaliadoPorUid: 'tay', avaliadoPorNome: 'Taynara', avaliadoEm: AGORA }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'fotosCarteirinha', 'kid'), { status: 'recusada', motivo: 'Foto escura', avaliadoPorUid: 'tay', avaliadoEm: AGORA }));
  // Núcleo pede foto nova (não por cima de uma pendente) e também envia pelo atleta.
  await assertSucceeds(setDoc(doc(db('tay'), 'fotosCarteirinha', 'nat'), { status: 'solicitada', academiaId: 'taynara', alunoNome: 'Natanael', solicitadoPorUid: 'tay', solicitadoPorNome: 'Taynara', solicitadoEm: AGORA }));
  await assertFails(setDoc(doc(db('estranho'), 'fotosCarteirinha', 'nat'), { status: 'solicitada', academiaId: 'taynara', alunoNome: 'Natanael', solicitadoPorUid: 'estranho', solicitadoEm: AGORA }));
  await assertSucceeds(setDoc(doc(db('tay'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'tay', { status: 'aprovada', avaliadoPorUid: 'tay', avaliadoEm: AGORA })));
  await assertFails(setDoc(doc(db('tay'), 'fotosCarteirinha', 'nat'), fotoDe('nat', 'tay', { status: 'aprovada', avaliadoPorUid: 'outro' })));
  await assertFails(deleteDoc(doc(db('tay'), 'fotosCarteirinha', 'nat')));
});

test('carteirinha: beneficiários — atleta, responsável e núcleo gravam; estranho não', async () => {
  const lista = [{ id: 'mae00001', nome: 'Maria Silva', parentesco: 'mae' }];
  await assertSucceeds(setDoc(doc(db('nat'), 'beneficiarios', 'nat'), { lista, atualizadoEm: AGORA, porUid: 'nat' }));
  await assertFails(setDoc(doc(db('nat'), 'beneficiarios', 'nat'), { lista, porUid: 'tay' }));
  await assertFails(setDoc(doc(db('nat'), 'beneficiarios', 'nat'), { lista, porUid: 'nat', codigo: 'X' }));
  await assertFails(setDoc(doc(db('nat'), 'beneficiarios', 'nat'), { lista: Array.from({ length: 11 }, (_, i) => ({ id: `id${i}xxxx`, nome: 'A B', parentesco: 'irmao' })), porUid: 'nat' }));
  await assertSucceeds(setDoc(doc(db('mae'), 'beneficiarios', 'kid'), { lista: [], porUid: 'mae' }));
  await assertSucceeds(setDoc(doc(db('tay'), 'beneficiarios', 'nat'), { lista, porUid: 'tay' }));
  await assertFails(setDoc(doc(db('estranho'), 'beneficiarios', 'nat'), { lista, porUid: 'estranho' }));
  await assertFails(getDoc(doc(db('estranho'), 'beneficiarios', 'nat')));
  await assertSucceeds(getDoc(doc(db('nat'), 'beneficiarios', 'nat')));
});

test('certificado: abre pelo código; lista e escrita fechadas; lista da pessoa só para quem cuida', async () => {
  await assertSucceeds(getDoc(doc(db(null), 'certificados', 'CERT000001')));
  await assertFails(getDocs(collection(db(null), 'certificados')));
  await assertFails(setDoc(doc(db('nat'), 'certificados', 'FALSO00001'), { nome: 'Natanael', cordao: 'Mestre' }));
  await assertFails(setDoc(doc(db('admin'), 'certificados', 'FALSO00002'), { nome: 'x' }));
  await assertSucceeds(getDoc(doc(db('nat'), 'certificadosDe', 'nat')));
  await assertSucceeds(getDoc(doc(db('tay'), 'certificadosDe', 'nat')));
  await assertSucceeds(getDoc(doc(db('mae'), 'certificadosDe', 'kid')));
  await assertFails(getDoc(doc(db('estranho'), 'certificadosDe', 'nat')));
  await assertFails(setDoc(doc(db('nat'), 'certificadosDe', 'nat'), { itens: [{ codigo: 'FALSO', cordao: 'Mestre' }] }));
});

test('notificações: a pessoa marca a festa como vista (celebradoEm), sem mexer no resto', async () => {
  await assertSucceeds(updateDoc(doc(db('nat'), 'notificacoes/nat/itens/n1'), { celebradoEm: AGORA }));
  await assertFails(updateDoc(doc(db('nat'), 'notificacoes/nat/itens/n1'), { titulo: 'outro' }));
  await assertFails(updateDoc(doc(db('tay'), 'notificacoes/nat/itens/n1'), { celebradoEm: AGORA }));
});

test('assinaturas: quem assina (Fundador, responsável de núcleo) grava a própria; Admin grava de todos; aluno não', async () => {
  const url = (uid) => `https://firebasestorage.googleapis.com/v0/b/x/o/assinaturas%2F${uid}%2Fa.png?alt=media&token=t`;
  await assertSucceeds(setDoc(doc(db('tay'), 'assinaturas', 'tay'), { url: url('tay'), nome: 'Taynara', atualizadoEm: AGORA, porUid: 'tay' }));
  await assertSucceeds(setDoc(doc(db('profeta'), 'assinaturas', 'profeta'), { url: url('profeta'), nome: 'Isaias', atualizadoEm: AGORA, porUid: 'profeta' }));
  await assertSucceeds(setDoc(doc(db('admin'), 'assinaturas', 'profeta'), { url: url('profeta'), nome: 'Isaias', atualizadoEm: AGORA, porUid: 'admin' }));
  await assertFails(setDoc(doc(db('nat'), 'assinaturas', 'nat'), { url: url('nat'), nome: 'Natanael', atualizadoEm: AGORA, porUid: 'nat' }));
  await assertFails(setDoc(doc(db('tay'), 'assinaturas', 'profeta'), { url: url('profeta'), nome: 'Falsa', atualizadoEm: AGORA, porUid: 'tay' }));
  await assertFails(setDoc(doc(db('tay'), 'assinaturas', 'tay'), { url: url('profeta'), nome: 'Taynara', atualizadoEm: AGORA, porUid: 'tay' }));
  await assertSucceeds(getDoc(doc(db(null), 'assinaturas', 'tay')));
  await assertFails(getDocs(collection(db(null), 'assinaturas')));
  await assertSucceeds(updateDoc(doc(db('nat'), 'notificacoes/nat/itens/n1'), { compartilhadoEm: AGORA }));
});

test('campeonatos: atleta se inscreve só a si mesmo e só com inscrições abertas; organizador inscreve qualquer um e mexe nas chaves', async () => {
  const insc = { uid: 'nat', nome: 'Natanael', cordao: 'Quilombola', sexo: 'M', peso: 80, em: AGORA, por: 'nat', demo: false };
  await assertSucceeds(setDoc(doc(db('nat'), 'campeonatos/camp1/inscricoes/nat'), insc));
  await assertFails(setDoc(doc(db('nat'), 'campeonatos/camp1/inscricoes/kid'), { ...insc, uid: 'kid' }), 'não inscreve outro');
  await assertFails(setDoc(doc(db('nat'), 'campeonatos/camp1/inscricoes/nat'), { ...insc, bonus: 1 }), 'campo fora da lista');
  await assertFails(setDoc(doc(db('nat'), 'campeonatos/campGrupo/inscricoes/nat'), insc), 'inscrições já fechadas');
  await assertSucceeds(setDoc(doc(db('tay'), 'campeonatos/camp1/inscricoes/demo_01'), { ...insc, uid: 'demo_01', demo: true }), 'organizador inscreve demo');
  await assertFails(setDoc(doc(db('estranho'), 'campeonatos/camp1/inscricoes/estranho'), { ...insc, uid: 'estranho', demo: true }), 'atleta não se marca como demo');
  await assertFails(setDoc(doc(db('nat'), 'campeonatos/camp1/chaves/cat1'), { rodadas: [] }), 'atleta não monta chave');
  await assertSucceeds(setDoc(doc(db('tay'), 'campeonatos/camp1/chaves/cat1'), { rodadas: [] }));
  await assertSucceeds(setDoc(doc(db('profeta'), 'campeonatos/campGrupo/chaves/cat1'), { rodadas: [] }), 'campeonato do grupo: qualquer responsável');
  await assertFails(updateDoc(doc(db('nat'), 'campeonatos', 'camp1'), { status: 'encerrado' }));
  await assertSucceeds(updateDoc(doc(db('tay'), 'campeonatos', 'camp1'), { status: 'categorias' }));
  await assertFails(updateDoc(doc(db('tay'), 'campeonatos', 'camp1'), { status: 'qualquer' }), 'status inválido');
  await assertSucceeds(setDoc(doc(db('tay'), 'campeonatos', 'novo'), { nome: 'Novo', status: 'inscricoes', academiaId: 'taynara', organizadorUid: 'tay', escolaId: 'liberdade' }));
  await assertFails(setDoc(doc(db('tay'), 'campeonatos', 'novo1b'), { nome: 'Novo', status: 'inscricoes', academiaId: 'taynara', organizadorUid: 'tay', escolaId: 'gracie-cg' }), 'não cria na escola dos outros');
  await assertFails(setDoc(doc(db('tay'), 'campeonatos', 'novo2'), { nome: 'Novo', status: 'inscricoes', academiaId: 'profeta', organizadorUid: 'tay', escolaId: 'liberdade' }), 'não cria para outro núcleo');
  await assertFails(setDoc(doc(db('nat'), 'campeonatos', 'novo3'), { nome: 'Novo', status: 'inscricoes', academiaId: 'taynara', organizadorUid: 'nat', escolaId: 'liberdade' }), 'atleta não cria');
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { competicoes: { titulos: 99 } }), 'competições só pelo servidor');
});

test('AtletaPay: dono (sem usuarios/) cria slug + escola em rascunho, edita até "fila", não ativa; outro não lê; atleta vê só o slug', async () => {
  const dono = db('dono1'); const agora = AGORA;
  await assertSucceeds(setDoc(doc(dono, 'donos', 'dono1'), { nome: 'Dona', email: 'd@x.com', celular: '67', escolaId: null, criadoEm: agora, origem: 'atletapay.com.br' }));
  await assertFails(setDoc(doc(dono, 'donos', 'dono1'), { nome: 'Dona', papeis: ['admin'] }), 'campo fora da lista');
  await assertFails(setDoc(doc(db('estranho'), 'donos', 'dono1'), { nome: 'x' }), 'só o próprio');
  await assertSucceeds(setDoc(doc(dono, 'escolasSlugs', 'dragao'), { escolaId: 'dragao', donoUid: 'dono1', criadoEm: agora }));
  await assertFails(setDoc(doc(dono, 'escolasSlugs', 'www'), { escolaId: 'www', donoUid: 'dono1', criadoEm: agora }), 'slug curto/reservado pelo formato');
  await assertFails(setDoc(doc(dono, 'escolasSlugs', 'cadastro'), { escolaId: 'cadastro', donoUid: 'dono1', criadoEm: agora }), 'atletapay.com.br/cadastro é página da plataforma');
  const escola = { nome: 'Dragão', nomeCurto: 'Dragão', slug: 'dragao', donoUid: 'dono1', status: 'rascunho', plano: 'nucleo', modalidade: 'jiujitsu', cidade: 'Campo Grande', uf: 'MS', criadoEm: agora, fotos: {} };
  await assertSucceeds(setDoc(doc(dono, 'escolas', 'dragao'), escola));
  await assertFails(setDoc(doc(dono, 'escolas', 'outra'), { ...escola, slug: 'dragao' }), 'id tem de ser o slug');
  await assertFails(setDoc(doc(dono, 'escolas', 'tigre'), { ...escola, slug: 'tigre', status: 'ativa' }), 'nasce em rascunho');
  await assertFails(setDoc(doc(db('estranho'), 'escolas', 'lobo'), { ...escola, slug: 'lobo', donoUid: 'dono1' }), 'dono tem de ser quem cria');
  await assertSucceeds(getDoc(doc(dono, 'escolas', 'dragao')));
  await assertFails(getDoc(doc(db('estranho'), 'escolas', 'dragao')), 'outro não lê a escola');
  await assertSucceeds(getDoc(doc(db('nat'), 'escolasSlugs', 'dragao')), 'disponibilidade do endereço é consulta por id');
  await assertFails(getDocs(collection(db('nat'), 'escolasSlugs')), 'mas não lista');
  await assertSucceeds(updateDoc(doc(dono, 'escolas', 'dragao'), { status: 'fila', modelo: 'tatame', atualizadoEm: agora }));
  await assertFails(updateDoc(doc(dono, 'escolas', 'dragao'), { status: 'ativa' }), 'dono não ativa');
  await assertFails(updateDoc(doc(dono, 'escolas', 'dragao'), { donoUid: 'estranho' }), 'não troca de dono');
  await assertFails(updateDoc(doc(dono, 'escolas', 'dragao'), { assinatura: { status: 'ativa' } }), 'assinatura é do servidor/Admin');
  await assertSucceeds(updateDoc(doc(db('admin'), 'escolas', 'dragao'), { status: 'ativa', ativadaEm: agora }));
  await assertSucceeds(getDoc(doc(db('admin'), 'escolas', 'dragao')));
});

test('multi-escola (1c): cada escola só vê e escreve o próprio conteúdo; campeonato entre escolas é aberto', async () => {
  const nat = db('nat'); const rafa = db('rafa', { escolaId: 'gracie-cg' }); const semEscola = db('nat', {});
  // Leitura individual
  await assertSucceeds(getDoc(doc(nat, 'eventos', 'evLib')));
  await assertFails(getDoc(doc(nat, 'eventos', 'evGracie')), 'evento de outra escola');
  await assertFails(getDoc(doc(nat, 'avisos', 'avGracie')));
  await assertFails(getDoc(doc(nat, 'materiais', 'matGracie')));
  await assertFails(getDoc(doc(nat, 'stories', 'stGracie')));
  await assertFails(getDoc(doc(nat, 'campeonatos', 'campGracie')), 'campeonato interno de outra escola');
  await assertSucceeds(getDoc(doc(nat, 'campeonatos', 'campAberto')), 'campeonato entre escolas é aberto');
  await assertSucceeds(getDoc(doc(rafa, 'avisos', 'avGracie')));
  await assertFails(getDoc(doc(semEscola, 'eventos', 'evLib')), 'login sem escola ainda não lê nada de escola');
  // Listas: só com o filtro da própria escola
  await assertSucceeds(getDocs(query(collection(nat, 'eventos'), where('escolaId', '==', 'liberdade'))));
  await assertFails(getDocs(collection(nat, 'eventos')), 'lista sem filtro de escola');
  await assertFails(getDocs(query(collection(nat, 'eventos'), where('escolaId', '==', 'gracie-cg'))));
  await assertSucceeds(getDocs(query(collection(nat, 'avisos'), where('escolaId', '==', 'liberdade'), orderBy('criadoEm', 'desc'), limit(8))));
  await assertSucceeds(getDocs(query(collection(nat, 'stories'), where('escolaId', '==', 'liberdade'), where('expiraEm', '>', AGORA), orderBy('expiraEm', 'asc'), limit(120))));
  await assertSucceeds(getDocs(query(collection(nat, 'campeonatos'), where('tipo', '==', 'externo'), limit(60))));
  await assertSucceeds(getDocs(query(collection(nat, 'campeonatos'), where('escolaId', '==', 'liberdade'), limit(60))));
  await assertFails(getDocs(collection(nat, 'eventos/evGracie/confirmados')));
  await assertSucceeds(getDocs(collection(rafa, 'eventos/evGracie/confirmados')));
  // Escrita: o conteúdo nasce na escola de quem cria
  await assertSucceeds(setDoc(doc(db('profeta'), 'eventos', 'ev2'), { nome: 'Roda', data: '2026-12-01', escolaId: 'liberdade' }));
  await assertFails(setDoc(doc(db('profeta'), 'eventos', 'ev3'), { nome: 'Roda', data: '2026-12-01', escolaId: 'gracie-cg' }), 'Fundador não publica em outra escola');
  await assertFails(updateDoc(doc(db('profeta'), 'eventos', 'evGracie'), { nome: 'Invadido' }));
  await assertFails(updateDoc(doc(db('profeta'), 'eventos', 'evLib'), { escolaId: 'gracie-cg' }), 'não muda evento de escola');
  await assertFails(setDoc(doc(db('nat'), 'eventos/evGracie/confirmados/nat'), { nome: 'Nat', em: AGORA }), 'não confirma em evento de outra escola');
  await assertSucceeds(setDoc(doc(db('nat'), 'eventos/evLib/confirmados/nat'), { nome: 'Nat', em: AGORA }));
  await assertSucceeds(addDoc(collection(db('tay'), 'materiais'), { titulo: 'Ladainhas', escolaId: 'liberdade' }));
  await assertFails(addDoc(collection(db('tay'), 'materiais'), { titulo: 'X', escolaId: 'gracie-cg' }));
  await assertFails(updateDoc(doc(db('tay'), 'materiais', 'matGracie'), { titulo: 'Apagado' }), 'professor de outra escola não edita');
  await assertSucceeds(addDoc(collection(nat, 'stories'), { autorUid: 'nat', midiaUrl: 'https://x', texto: '', criadoEm: AGORA, expiraEm: '2099-01-01T00:00:00.000Z', escolaId: 'liberdade' }));
  await assertFails(addDoc(collection(nat, 'stories'), { autorUid: 'nat', midiaUrl: 'https://x', texto: '', criadoEm: AGORA, expiraEm: '2099-01-01T00:00:00.000Z' }), 'story sem escola');
  await assertSucceeds(addDoc(collection(db('tay'), 'avisos'), { titulo: 'Aula', academiaId: 'taynara', escolaId: 'liberdade', criadoEm: AGORA }));
  await assertFails(addDoc(collection(db('tay'), 'avisos'), { titulo: 'Aula', academiaId: 'taynara', criadoEm: AGORA }), 'aviso sem escola');
  // Campeonato entre escolas: atleta de outra escola se inscreve; no interno de outra escola, não.
  const insc = { uid: 'nat', nome: 'Natanael', cordao: 'Quilombola', academiaId: 'taynara', sexo: 'M', peso: 70, idade: 30, em: AGORA };
  await assertSucceeds(setDoc(doc(nat, 'campeonatos/campAberto/inscricoes/nat'), insc));
  await assertFails(setDoc(doc(nat, 'campeonatos/campGracie/inscricoes/nat'), insc));
  await assertFails(setDoc(doc(nat, 'campeonatos/campAberto/chaves/cat1'), { rodadas: [] }), 'não organiza campeonato de outra escola');
  await assertFails(setDoc(doc(db('profeta'), 'campeonatos/campGracie/chaves/cat1'), { rodadas: [] }), 'Fundador não mexe em campeonato de outra escola');
  // Admin da plataforma vê tudo
  await assertSucceeds(getDocs(collection(db('admin'), 'eventos')));
});

test('multi-escola (1c partes 2 e 3): Rede e poderes do Fundador ficam dentro da própria escola', async () => {
  const profeta = db('profeta'); const nat = db('nat'); const rafa = db('rafa', { escolaId: 'gracie-cg' });
  const L = where('escolaId', '==', 'liberdade');
  // Rede: post "público" vale só dentro da escola; cartões idem
  await assertFails(getDoc(doc(nat, 'posts', 'postGracie')), 'post público de outra escola');
  await assertSucceeds(getDoc(doc(rafa, 'posts', 'postGracie')));
  await assertFails(getDocs(collection(nat, 'posts/postGracie/comentarios')), 'comentários de post de outra escola');
  await assertFails(addDoc(collection(nat, 'posts/postGracie/comentarios'), { autorUid: 'nat', texto: 'oi', criadoEm: AGORA }));
  await assertFails(getDocs(query(collection(nat, 'posts'), where('escolaId', '==', 'gracie-cg'), where('publico', '==', true))));
  await assertFails(getDoc(doc(nat, 'perfisPublicos', 'rafa')), 'cartão de outra escola');
  await assertSucceeds(getDoc(doc(nat, 'perfisPublicos', 'tay')));
  await assertSucceeds(getDoc(doc(nat, 'perfisPublicos', 'ninguem')), 'cartão que não existe: "não existe"');
  await assertSucceeds(getDocs(query(collection(nat, 'perfisPublicos'), L, where('nomeBusca', '>=', 'na'), where('nomeBusca', '<=', 'na'), limit(6))));
  await assertFails(getDocs(query(collection(nat, 'perfisPublicos'), where('nomeBusca', '>=', 'ra'), limit(6))), 'busca sem filtro de escola');
  await assertFails(updateDoc(doc(nat, 'perfisPublicos', 'rafa'), { seguidores: arrayUnion('nat') }), 'não segue gente de outra escola (por enquanto)');
  // Publicar: escola e núcleo têm que ser os de quem publica
  const p = { autorUid: 'nat', texto: 'treino', midias: [], tipo: 'post', curtidas: [], comentariosCount: 0, criadoEm: AGORA, oculto: false, revisao: 'ok', publico: true };
  await assertSucceeds(addDoc(collection(nat, 'posts'), { ...p, escolaId: 'liberdade', nucleoId: 'taynara' }));
  await assertFails(addDoc(collection(nat, 'posts'), { ...p, escolaId: 'gracie-cg' }), 'post em outra escola');
  await assertFails(addDoc(collection(nat, 'posts'), { ...p, nucleoId: 'gracie' }), 'post marcado no núcleo de outra escola');
  await assertFails(addDoc(collection(nat, 'denuncias'), { denuncianteUid: 'nat', motivo: 'x', status: 'aberta', escolaId: 'gracie-cg' }));
  await assertFails(addDoc(collection(nat, 'solicitacoes'), { tipo: 'exclusao_conta', solicitanteUid: 'nat', academiaId: 'gracie', status: 'pendente' }), 'pedido apontando núcleo de outra escola');
  // Fundador da Liberdade: lê e mexe só na Liberdade
  await assertSucceeds(getDocs(query(collection(profeta, 'usuarios'), L)));
  await assertFails(getDocs(collection(profeta, 'usuarios')), 'lista sem filtro de escola');
  await assertFails(getDoc(doc(profeta, 'usuarios', 'rafa')), 'cadastro de outra escola');
  await assertFails(updateDoc(doc(profeta, 'usuarios', 'rafa'), { nome: 'Invadido' }));
  await assertFails(getDocs(collection(profeta, 'usuarios/rafa/avaliacoes')));
  for (const [col, id] of [['presencas', 'presGracie'], ['pagamentos', 'pagGracie'], ['solicitacoes', 'solGracie'], ['denuncias', 'denGracie'], ['auditoria', 'audGracie'], ['conversas', 'outro__rafa'], ['fotosCarteirinha', 'rafa'], ['beneficiarios', 'rafa'], ['posts', 'postGracie']]) {
    await assertFails(getDoc(doc(profeta, col, id)), `${col} de outra escola`);
  }
  for (const col of ['presencas', 'pagamentos', 'solicitacoes', 'denuncias', 'auditoria', 'fotosCarteirinha']) {
    await assertSucceeds(getDocs(query(collection(profeta, col), L, limit(10))), `${col}: lista da própria escola`);
    await assertFails(getDocs(query(collection(profeta, col), limit(10))), `${col}: lista sem filtro`);
  }
  await assertSucceeds(getDocs(query(collection(profeta, 'auditoria'), L, orderBy('quando', 'desc'), limit(200))));
  await assertSucceeds(getDocs(query(collection(profeta, 'posts'), L, where('revisao', '==', 'pendente'), limit(60))), 'moderação da própria escola');
  await assertFails(updateDoc(doc(profeta, 'solicitacoes', 'solGracie'), { status: 'aprovado' }));
  await assertFails(deleteDoc(doc(profeta, 'conversas', 'outro__rafa')));
  await assertFails(setDoc(doc(profeta, 'presencas', 'pInv'), { uid: 'rafa', nucleoId: 'gracie', origem: 'manual', registradoPor: 'profeta', entradaEm: new Date() }), 'presença em núcleo de outra escola');
  await assertSucceeds(setDoc(doc(profeta, 'presencas', 'pOk'), { uid: 'nat', nucleoId: 'taynara', origem: 'manual', registradoPor: 'profeta', entradaEm: new Date(), escolaId: 'liberdade' }));
  await assertFails(setDoc(doc(profeta, 'conversas', 'nucleo_gracie'), { tipo: 'grupo', nucleoId: 'gracie', participantes: ['profeta'] }), 'grupo de núcleo de outra escola');
  // Fundador da outra escola (CT): mesmos poderes, só na escola dele
  await assertSucceeds(getDoc(doc(rafa, 'presencas', 'presGracie')));
  await assertFails(getDocs(query(collection(rafa, 'usuarios'), L)), 'CT não lista cadastros da Liberdade');
  await assertFails(getDoc(doc(rafa, 'usuarios', 'nat')));
  await assertFails(setDoc(doc(rafa, 'config', 'brasoes'), { ativos: [] }), 'config ainda é da escola nº 1');
  await assertSucceeds(setDoc(doc(profeta, 'config', 'textos'), { x: 1 }));
  // Dado ainda sem escola (antes da migração m11) não aparece para o Fundador; o Admin vê tudo
  await assertSucceeds(getDoc(doc(db('admin'), 'presencas', 'presGracie')));
  await assertSucceeds(getDocs(collection(db('admin'), 'usuarios')));
});

test('ativação (etapa 2): dono não se ativa nem mexe na escada; só o Admin ativa; graus são travados', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'escolas', 'ct-teste'), { nome: 'CT Teste', slug: 'ct-teste', donoUid: 'dono1', status: 'fila', plano: 'nucleo' });
  });
  const dono = db('dono1', {});
  await assertFails(updateDoc(doc(dono, 'escolas', 'ct-teste'), { status: 'ativa' }), 'dono não se ativa');
  await assertFails(updateDoc(doc(dono, 'escolas', 'ct-teste'), { ativacao: { status: 'pedido' } }), 'dono não pede ativação');
  await assertFails(updateDoc(doc(dono, 'escolas', 'ct-teste'), { escada: { adulto: [{ nome: 'Preta' }] } }), 'escada é da AtletaPay/servidor');
  await assertSucceeds(updateDoc(doc(dono, 'escolas', 'ct-teste'), { modelo: 'tatame' }), 'o resto do cadastro continua dele');
  await assertSucceeds(updateDoc(doc(db('admin'), 'escolas', 'ct-teste'), { status: 'ativa' }), 'Admin ativa');
  await assertSucceeds(getDocs(collection(db('admin'), 'escolas')), 'Mega painel lista as escolas');
  await assertFails(getDocs(collection(db('profeta'), 'escolas')), 'Fundador de escola não lista as escolas da plataforma');
  await assertFails(updateDoc(doc(db('nat'), 'usuarios', 'nat'), { grausAtual: 4 }), 'ninguém se dá grau');
  await assertSucceeds(getDocs(query(collection(db(null), 'nucleos'), where('escolaId', '==', 'gracie-cg'), where('ativo', '==', true))), 'inscrição (sem login) lista os núcleos da escola do link');
});
