// Cloud Functions — Capoeira Liberdade e Expressão.
// Publicadas automaticamente pelo GitHub Actions (.github/workflows/firebase.yml).
// A lógica fica em src/ (testável sem Firebase); aqui só ligamos cada gatilho.
process.env.TZ = 'America/Campo_Grande'; // "no mês", "semana" e datas no horário do grupo

import { setGlobalOptions } from 'firebase-functions/v2';
import {
  onDocumentWrittenWithAuthContext, onDocumentCreatedWithAuthContext, onDocumentCreated, onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import * as G from './src/gatilhos.js';
import { rotinaDiaria, executarComando } from './src/rotinas.js';
import { criarVision } from './src/moderacao.js';
import { aoEscreverFotoCarteirinha, sincronizarCarteirinha } from './src/carteirinha.js';
import { processarLembretes } from './src/certificado.js';
import { processarAniversarios } from './src/aniversarios.js';
import { aoEscreverCampeonato } from './src/campeonatos.js';
import { comEscola, aoEscreverEscola } from './src/escolas.js';
import { aoAtivarEscola } from './src/ativacao.js';

// Região: a mesma do banco (o GitHub Actions descobre e grava em .env como REGIAO).
setGlobalOptions({ region: process.env.REGIAO || 'southamerica-east1', maxInstances: 5, memory: '256MiB' });

initializeApp();
const credencial = applicationDefault();
const ctxBase = () => ({
  db: getFirestore(),
  messaging: getMessaging(),
  auth: getAuth(),
  bucket: getStorage().bucket(),
  vision: criarVision(async () => (await credencial.getAccessToken()).access_token),
  log: console,
});

// Converte o evento do Firestore no formato simples que src/ usa.
const ev = (e) => ({
  params: e.params,
  antes: e.data && e.data.before && e.data.before.exists ? e.data.before.data() : null,
  depois: e.data && e.data.after && e.data.after.exists ? e.data.after.data() : null,
  authId: e.authId || null,
  authType: e.authType || null,
});
const evCriado = (e) => ({ params: e.params, antes: null, depois: e.data ? e.data.data() : null, authId: null, authType: null });
const evAtualizado = (e) => ({ params: e.params, antes: e.data.before.data(), depois: e.data.after.data(), authId: null, authType: null });
const seguro = (nome, fn) => async (e) => { try { await fn(e); } catch (err) { console.error(nome, err); } };

export const usuarioEscrito = onDocumentWrittenWithAuthContext('usuarios/{uid}', seguro('usuario', (e) => comEscola('usuarios', G.aoEscreverUsuario)(ctxBase(), ev(e))));
export const presencaEscrita = onDocumentWrittenWithAuthContext('presencas/{id}', seguro('presenca', (e) => comEscola('presencas', G.aoEscreverPresenca)(ctxBase(), ev(e))));
export const postEscrito = onDocumentWrittenWithAuthContext({ document: 'posts/{id}', memory: '512MiB' }, seguro('post', (e) => comEscola('posts', G.aoEscreverPost)(ctxBase(), ev(e))));
export const comentarioCriado = onDocumentCreated('posts/{postId}/comentarios/{cid}', seguro('comentario', (e) => G.aoCriarComentario(ctxBase(), evCriado(e))));
export const conversaCriada = onDocumentCreated('conversas/{id}', seguro('conversa', (e) => comEscola('conversas', G.aoCriarConversa)(ctxBase(), evCriado(e))));
export const mensagemCriada = onDocumentCreated('conversas/{id}/mensagens/{mid}', seguro('mensagem', (e) => G.aoCriarMensagem(ctxBase(), evCriado(e))));
export const perfilPublicoAtualizado = onDocumentUpdated('perfisPublicos/{uid}', seguro('seguir', (e) => G.aoAtualizarPerfilPublico(ctxBase(), evAtualizado(e))));
export const avisoEscrito = onDocumentWrittenWithAuthContext('avisos/{id}', seguro('aviso', (e) => comEscola('avisos', G.aoEscreverAviso)(ctxBase(), ev(e))));
export const eventoEscrito = onDocumentWrittenWithAuthContext('eventos/{id}', seguro('evento', (e) => comEscola('eventos', G.aoEscreverEvento)(ctxBase(), ev(e))));
export const denunciaCriada = onDocumentCreated('denuncias/{id}', seguro('denuncia', (e) => comEscola('denuncias', G.aoCriarDenuncia)(ctxBase(), evCriado(e))));
export const solicitacaoEscrita = onDocumentWrittenWithAuthContext('solicitacoes/{id}', seguro('solicitacao', (e) => comEscola('solicitacoes', G.aoEscreverSolicitacao)(ctxBase(), ev(e))));
export const pagamentoEscrito = onDocumentWrittenWithAuthContext('pagamentos/{id}', seguro('pagamento', (e) => comEscola('pagamentos', G.aoEscreverPagamento)(ctxBase(), ev(e))));
export const nucleoEscrito = onDocumentWrittenWithAuthContext('nucleos/{id}', seguro('nucleo', (e) => comEscola('nucleos', G.aoEscreverNucleo)(ctxBase(), ev(e))));
export const fotoCarteirinhaEscrita = onDocumentWrittenWithAuthContext('fotosCarteirinha/{uid}', seguro('fotoCarteirinha', (e) => comEscola('fotosCarteirinha', aoEscreverFotoCarteirinha)(ctxBase(), ev(e))));
// Pai, mãe, irmãos e avós do atleta: o servidor gera/remove o código de cada um.
export const beneficiariosEscritos = onDocumentWrittenWithAuthContext('beneficiarios/{uid}', seguro('beneficiarios', (e) => sincronizarCarteirinha(ctxBase(), e.params.uid)));
export const configEscrita = onDocumentWrittenWithAuthContext('config/{id}', seguro('config', (e) => G.aoEscreverConfig(ctxBase(), ev(e))));
// Brasões 46–71: "Eu vou", card compartilhado, apresentação e assinatura.
export const confirmadoEscrito = onDocumentWrittenWithAuthContext('eventos/{id}/confirmados/{uid}', seguro('confirmado', (e) => G.aoEscreverConfirmado(ctxBase(), ev(e))));
export const notificacaoEscrita = onDocumentWrittenWithAuthContext('notificacoes/{uid}/itens/{id}', seguro('notificacao', (e) => G.aoEscreverNotificacao(ctxBase(), ev(e))));
export const apresentacaoEscrita = onDocumentWrittenWithAuthContext('apresentacoes/{uid}', seguro('apresentacao', (e) => G.aoEscreverApresentacaoOuAssinatura(ctxBase(), ev(e))));
export const assinaturaEscrita = onDocumentWrittenWithAuthContext('assinaturas/{uid}', seguro('assinatura', (e) => G.aoEscreverApresentacaoOuAssinatura(ctxBase(), ev(e))));
// Campeonato encerrado → brasões de competição, post do pódio e parabéns.
// Cartão público + domínio; e, quando a escola passa a 'ativa', a ativação automática (sede, Fundador, graduações).
export const escolaEscrita = onDocumentWrittenWithAuthContext('escolas/{id}', seguro('escola', async (e) => {
  const ctx = ctxBase(); const evento = ev(e);
  await aoEscreverEscola(ctx, evento);
  await aoAtivarEscola(ctx, evento);
}));
export const campeonatoEscrito = onDocumentWrittenWithAuthContext('campeonatos/{id}', seguro('campeonato', (e) => comEscola('campeonatos', aoEscreverCampeonato)(ctxBase(), ev(e))));

// Todo dia às 3h (horário de Campo Grande): limpeza + brasões que dependem do tempo.
export const rotinaDaMadrugada = onSchedule({ schedule: 'every day 03:00', timeZone: 'America/Campo_Grande', timeoutSeconds: 540, memory: '512MiB' }, async () => {
  const r = await rotinaDiaria(ctxBase());
  console.log('rotina diária', JSON.stringify(r));
});

// Todo dia às 10h: lembrete "compartilhe o seu card" para quem trocou de cordão e ainda não compartilhou.
export const lembretesDoDia = onSchedule({ schedule: 'every day 10:00', timeZone: 'America/Campo_Grande' }, async () => {
  const n = await processarLembretes(ctxBase());
  console.log('lembretes enviados', n);
});

// Aniversários: aviso 48 h antes e no dia para o responsável do núcleo e o Admin Master.
export const aniversariosDoDia = onSchedule({ schedule: 'every day 07:00', timeZone: 'America/Campo_Grande' }, async () => {
  const n = await processarAniversarios(ctxBase());
  console.log('avisos de aniversário', n);
});

// ---------- Pedidos do painel (só Admin Master) ----------
// O painel grava um documento em comandos/{id} e o servidor executa. Assim o
// app não precisa saber em que região as funções estão.
export const comandoCriado = onDocumentCreatedWithAuthContext({ document: 'comandos/{id}', timeoutSeconds: 540, memory: '512MiB' },
  seguro('comando', (e) => executarComando(ctxBase(), { ...evCriado(e), authId: e.authId || null, authType: e.authType || null })));
