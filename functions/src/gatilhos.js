// O que o servidor faz quando algo muda no banco. Cada função recebe:
//   ctx = { db, messaging, bucket, vision, log }
//   ev  = { params, antes, depois, authId, authType }  (antes/depois = dados ou null)
// index.js liga cada uma ao gatilho do Firestore correspondente.
import { sincronizarPerfil, somarCurtidas, CAMPOS_DO_CARTAO, ehMenor } from './perfil.js';
import { notificar, gestoresDoNucleo, admins, membros } from './notificar.js';
import { registrar } from './auditoria.js';
import { checarTexto, checarImagens } from './moderacao.js';
import { sincronizarCarteirinha } from './carteirinha.js';
import { emitirCertificado, apagarCertificados, idAvisoCordao, garantirCertificados, agendarLembrete, alinharAoCordaoAtual } from './certificado.js';
import { coresDoCordao } from './compartilhado/escola.js';
import { aoGraduarNaEscola, ehOutraEscola } from './graduacao-escola.js';
import { escolaDoUsuario, ESCOLA_PADRAO } from './escolas.js';

// Campos de usuarios/{uid} que mudam a carteirinha (o próprio espelho entra:
// se alguém mexer nele, o servidor regrava o valor certo).
const CAMPOS_DA_CARTEIRINHA = ['nome', 'cordaoAtual', 'grausAtual', 'idade', 'academiaId', 'academiaNome', 'papeis', 'ativo', 'statusAtual', 'isentoMensalidade', 'carteirinha', 'sincronizarEm'];

const mudouAlgum = (antes, depois, campos) => campos.some((k) => JSON.stringify((antes || {})[k] ?? null) !== JSON.stringify((depois || {})[k] ?? null));
const primeiroNome = (n) => String(n || 'Alguém').split(' ')[0];
const ORDEM = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
const uidsDe = (lista) => (Array.isArray(lista) ? lista : []).map((x) => (typeof x === 'string' ? x : x && x.uid)).filter(Boolean);
// Auditoria 08/10: quem aparece como remetente de uma notificação é o que o SERVIDOR sabe
// (cartão público), não o nome que veio no post/comentário/mensagem (dava para assinar
// "Suporte AtletaPay"). E marcações/menções só avisam gente da MESMA escola, no máximo 10.
async function pessoaReal(ctx, uid, fallback = {}) {
  if (!uid) return { uid, nome: fallback.nome || '', foto: fallback.foto || '', academiaId: null };
  const s = await ctx.db.doc(`perfisPublicos/${uid}`).get();
  const p = s.exists ? s.data() : {};
  return { uid, nome: p.nome || fallback.nome || '', foto: p.fotoUrl || fallback.foto || '', academiaId: p.academiaId || null };
}
export async function soDaEscola(ctx, uids, escolaId, max = 10) {
  const out = [];
  for (const u of Array.from(new Set(uids)).slice(0, 30)) {
    if (out.length >= max) break;
    if (!escolaId || (await escolaDoUsuario(ctx, u)) === escolaId) out.push(u);
  }
  return out;
}

async function auditar(ctx, colecao, ev) {
  try { await registrar(ctx, { colecao, docId: ev.params.id || ev.params.uid, antes: ev.antes, depois: ev.depois, authId: ev.authId, authType: ev.authType }); }
  catch (e) { (ctx.log || console).warn('auditoria', e && e.message); }
}

// ---------- usuarios/{uid} ----------
export async function aoEscreverUsuario(ctx, ev) {
  const { uid } = ev.params; const { antes, depois } = ev;
  await auditar(ctx, 'usuarios', ev);
  if (!depois) { await sincronizarPerfil(ctx, uid); await carteirinhaSegura(ctx, uid); await apagarCertificados(ctx, uid).catch(() => {}); return; }
  const criado = !antes;
  // Escolas da plataforma com outra arte (Jiu-Jitsu…): faixa inicial e festa de faixa/grau pela escada DELAS.
  const outraEscola = ehOutraEscola(depois);
  if (outraEscola) {
    // (a correção para a faixa inicial é uma nova escrita: o gatilho roda de novo e atualiza o cartão)
    try { await aoGraduarNaEscola(ctx, uid, antes, depois); } catch (e) { (ctx.log || console).warn('graduação (escola)', uid, e && e.message); }
  }
  if (criado || mudouAlgum(antes, depois, CAMPOS_DA_CARTEIRINHA)) await carteirinhaSegura(ctx, uid);
  if (criado || mudouAlgum(antes, depois, CAMPOS_DO_CARTAO)) {
    const gerenciadoMudou = mudouAlgum(antes, depois, ['academiaGerenciadaId']);
    const pedidoDoApp = mudouAlgum(antes, depois, ['sincronizarEm']);
    // Pedido de recálculo repetido em menos de 10 min (só isso mudou) é ignorado — evita abuso.
    if (pedidoDoApp && !criado && !mudouAlgum(antes, depois, CAMPOS_DO_CARTAO.filter((k) => k !== 'sincronizarEm'))) {
      const sp = await ctx.db.doc(`perfisPublicos/${uid}`).get();
      const ultimo = sp.exists ? new Date(sp.data().sincronizadoEm || 0).getTime() : 0;
      if (Date.now() - ultimo < 10 * 60000) return;
    }
    await sincronizarPerfil(ctx, uid, criado || pedidoDoApp ? { presencas: true, rede: true, formacao: true } : { formacao: gerenciadoMudou });
  }
  // "Núcleo completo" (68) e "Roda Inclusiva" (75) do responsável dependem da ficha de cada aluno:
  // foto da carteirinha aprovada, data de nascimento, ativo/inativo, inclusão e o próprio núcleo.
  if (!criado && mudouAlgum(antes, depois, ['carteirinha', 'dataNasc', 'ativo', 'statusAtual', 'academiaId', 'inclusao'])) {
    const nucleos = Array.from(new Set([antes.academiaId, depois.academiaId].filter(Boolean)));
    for (const nid of nucleos) {
      for (const g of await gestoresDoNucleo(ctx, nid)) {
        if (g === uid) continue;
        try { await sincronizarPerfil(ctx, g, { formacao: true }); } catch (e) { (ctx.log || console).warn('formação', g, e && e.message); }
      }
    }
  }
  // Troca de cordão: parabéns ao atleta e recalcula "formou o primeiro aluno" de quem graduou.
  if (!criado && mudouAlgum(antes, depois, ['historicoGraduacoes'])) {
    const velhos = new Set((antes.historicoGraduacoes || []).map((h) => JSON.stringify(h)));
    const novos = (depois.historicoGraduacoes || []).filter((h) => !velhos.has(JSON.stringify(h)));
    const formadores = Array.from(new Set(novos.filter((h) => h && !h.legado).map((h) => h.por).filter((p) => p && p !== uid)));
    for (const f of formadores) await sincronizarPerfil(ctx, f, { formacao: true });
  }
  // Cadastro já nasce num cordão (atleta que já era graduado antes do app):
  // certificados de todos os cordões até o atual, sem data e sem festa.
  if (!outraEscola && criado && (depois.cordaoAtual || 'Iniciante') !== 'Iniciante') {
    try { await garantirCertificados(ctx, uid, depois); } catch (e) { (ctx.log || console).warn('certificados legados', uid, e && e.message); }
  }
  if (!outraEscola && !criado && antes.cordaoAtual !== depois.cordaoAtual && ORDEM.indexOf(depois.cordaoAtual) > ORDEM.indexOf(antes.cordaoAtual)) {
    // Certificado de graduação (servidor) + aviso que vira a festa "Troquei de
    // cordão!" na tela principal do atleta no próximo acesso.
    const velhos = new Set((antes.historicoGraduacoes || []).map((h) => JSON.stringify(h)));
    const troca = (depois.historicoGraduacoes || []).filter((h) => h && !velhos.has(JSON.stringify(h)) && h.cordao === depois.cordaoAtual).pop()
      || { cordao: depois.cordaoAtual, anterior: antes.cordaoAtual || 'Iniciante', em: new Date().toISOString() };
    let cert = null;
    // Troca de verdade (batizado): certificado com data. "Já tinha o cordão": só os sem data.
    if (!troca.legado) { try { cert = await emitirCertificado(ctx, uid, depois, troca); } catch (e) { (ctx.log || console).warn('certificado', uid, e && e.message); } }
    // Cordões pulados (ou todos, se "já tinha") ganham certificado sem data.
    try { await garantirCertificados(ctx, uid, depois); } catch (e) { (ctx.log || console).warn('certificados legados', uid, e && e.message); }
    if (!troca.legado) {
      // Gatilho reentregue (o Firestore pode entregar 2x): mesmo documento de aviso, sem festa dupla.
      const idAviso = idAvisoCordao(troca, uid);
      const dados = {
        tipo: 'cordao', link: cert ? `certificado.html#${cert.codigo}` : `rede.html#perfil/${uid}`,
        atletaUid: uid, atletaNome: String(depois.nome || '').slice(0, 80), cordao: depois.cordaoAtual, anterior: antes.cordaoAtual || 'Iniciante',
        cores: coresDoCordao(depois.cordaoAtual, depois),
        ...(cert ? { certificado: cert.codigo, certificadoNumero: cert.numero, evento: cert.evento || '' } : {}),
      };
      const txt = cert ? 'Parabéns pela nova graduação. O certificado já está no app.' : 'Parabéns pela nova graduação. Veja na sua trajetória.';
      await notificar(ctx, [uid], { ...dados, titulo: `Cordão ${depois.cordaoAtual}!`, texto: txt }, { idFixo: idAviso });
      if (depois.responsavelUid && depois.responsavelUid !== uid) {
        await notificar(ctx, [depois.responsavelUid], { ...dados, titulo: `${primeiroNome(depois.nome)} trocou de cordão!`, texto: `Agora é Cordão ${depois.cordaoAtual}. ${cert ? 'O certificado já está no app.' : ''}`.trim() }, { idFixo: idAviso });
      }
      // Dia seguinte: se ainda não compartilhou o card, um lembrete.
      if (!cert || !cert.repetido) { try { await agendarLembrete(ctx, uid, idAviso, { cordao: depois.cordaoAtual, cores: dados.cores, certificado: dados.certificado || '', atletaNome: dados.atletaNome, evento: dados.evento || '' }); } catch (e) { /* ok */ } }
    }
  }
  // Cordão VOLTOU: certificados, trocas da trajetória e festas acima do cordão atual saem.
  if (!outraEscola && !criado && antes.cordaoAtual !== depois.cordaoAtual && ORDEM.indexOf(depois.cordaoAtual || 'Iniciante') < ORDEM.indexOf(antes.cordaoAtual || 'Iniciante')) {
    try { await alinharAoCordaoAtual(ctx, uid, depois, `Cordão voltou de ${antes.cordaoAtual} para ${depois.cordaoAtual || 'Iniciante'}`); } catch (e) { (ctx.log || console).warn('cordão voltou', uid, e && e.message); }
  }
  if (!criado && mudouAlgum(antes, depois, ['responsavelUid', 'idade'])) await atualizarResponsaveisDasConversas(ctx, uid);
}

// ---------- presencas/{id} ----------
export async function aoEscreverPresenca(ctx, ev) {
  await auditar(ctx, 'presencas', ev);
  const p = ev.depois || ev.antes;
  if (p && p.uid && (!ev.antes || !ev.depois)) await sincronizarPerfil(ctx, p.uid, { presencas: true });
}

// ---------- posts/{id} ----------
export async function aoEscreverPost(ctx, ev) {
  const { id } = ev.params; const { antes, depois } = ev;
  await auditar(ctx, 'posts', ev);
  const autorUid = (depois || antes).autorUid;
  const autor = await pessoaReal(ctx, autorUid, { nome: (depois || antes).autorNome, foto: (depois || antes).autorFoto });
  const de = { uid: autorUid, nome: autor.nome, foto: autor.foto };
  const escolaPost = (depois || antes).escolaId || null;

  if (!antes && depois) { // publicado
    const motivos = [...(await checarTexto(ctx, depois.texto)).map((t) => `palavra "${t}"`),
      ...(await checarImagens(ctx, (depois.midias || []).filter((m) => m.tipo !== 'video').map((m) => m.url)))];
    const ref = ctx.db.doc(`posts/${id}`);
    const destino = [...(await gestoresDoNucleo(ctx, autor.academiaId || null)), ...(await gestoresDoNucleo(ctx, depois.nucleoId))];
    if (motivos.length) {
      await ref.update({ revisao: 'pendente', publico: false, moderacaoAuto: { motivos, em: new Date().toISOString() } });
      await notificar(ctx, [...destino, ...(await admins(ctx, escolaPost || ESCOLA_PADRAO))], { tipo: 'revisao', titulo: 'Post foi para revisão automática', texto: `${de.nome}: ${motivos.join(', ')}`, link: 'rede.html#moderacao' });
      await notificar(ctx, [autorUid], { tipo: 'revisao', titulo: 'Seu post está em revisão', texto: 'O filtro automático pediu uma olhada do responsável antes de ele aparecer na rede.', link: `rede.html#perfil/${autorUid}` });
    } else if (depois.revisao === 'pendente') {
      await notificar(ctx, destino, { tipo: 'revisao', titulo: 'Post aguardando sua revisão', texto: `${de.nome} publicou ${depois.autorMenor ? '(menor de idade) ' : ''}com foto.`, link: 'rede.html#moderacao', de });
    }
    if (!motivos.length) {
      const marcados = await soDaEscola(ctx, uidsDe(depois.marcados), escolaPost);
      const mencionados = await soDaEscola(ctx, uidsDe(depois.mencoes).filter((u) => !marcados.includes(u)), escolaPost);
      if (depois.revisao !== 'pendente') {
        await notificar(ctx, marcados, { tipo: 'marcacao', titulo: `${primeiroNome(de.nome)} marcou você`, texto: String(depois.texto || 'Numa publicação da Rede').slice(0, 120), link: `rede.html#post/${id}`, de });
        await notificar(ctx, mencionados, { tipo: 'mencao', titulo: `${primeiroNome(de.nome)} mencionou você`, texto: String(depois.texto || '').slice(0, 120), link: `rede.html#post/${id}`, de });
      }
    }
    await sincronizarPerfil(ctx, autorUid, { rede: true });
    return;
  }
  if (antes && !depois) { // apagado pelo autor: limpa comentários e arquivos
    await apagarSubcolecao(ctx, `posts/${id}/comentarios`);
    await apagarArquivosDoStorage(ctx, (antes.midias || []).map((m) => m.url).concat(antes.fotoUrl || [], antes.posterUrl || []), `rede/${autorUid}/`);
    await sincronizarPerfil(ctx, autorUid, { rede: true });
    return;
  }
  // alterado
  const antesC = antes.curtidas || []; const depoisC = depois.curtidas || [];
  const delta = depoisC.length - antesC.length;
  if (delta) {
    await somarCurtidas(ctx, autorUid, delta);
    const novos = depoisC.filter((u) => !antesC.includes(u) && u !== autorUid);
    if (novos.length) {
      const s = await ctx.db.doc(`perfisPublicos/${novos[novos.length - 1]}`).get();
      const nome = s.exists ? s.data().nome : 'Alguém';
      await notificar(ctx, [autorUid], {
        tipo: 'curtida', titulo: 'Curtiram seu post', tag: `curtida_${id}`,
        texto: depoisC.length > 1 ? `${primeiroNome(nome)} e mais ${depoisC.length - 1} curtiram.` : `${primeiroNome(nome)} curtiu.`,
        link: `rede.html#post/${id}`, de: { uid: novos[novos.length - 1], nome },
      }, { idFixo: `curtida_${id}` });
    }
  }
  if (mudouAlgum(antes, depois, ['melhorMomento', 'oculto'])) await sincronizarPerfil(ctx, autorUid, { rede: true });
  if (antes.revisao === 'pendente' && depois.revisao === 'ok' && depois.publico) {
    await notificar(ctx, [autorUid], { tipo: 'revisao', titulo: 'Seu post foi aprovado', texto: 'Já aparece para a rede.', link: `rede.html#post/${id}` });
    await notificar(ctx, await soDaEscola(ctx, uidsDe(depois.marcados), escolaPost), { tipo: 'marcacao', titulo: `${primeiroNome(de.nome)} marcou você`, texto: String(depois.texto || 'Numa publicação da Rede').slice(0, 120), link: `rede.html#post/${id}`, de });
  }
  if (!antes.oculto && depois.oculto) {
    await notificar(ctx, [autorUid], { tipo: 'moderacao', titulo: 'Seu post foi ocultado', texto: 'O Admin Master ocultou este post da rede. Ele continua visível só para você.', link: `rede.html#post/${id}` }, { push: false });
  }
}

// ---------- posts/{postId}/comentarios/{cid} (criado) ----------
export async function aoCriarComentario(ctx, ev) {
  const { postId, cid } = ev.params; const c = ev.depois; if (!c) return;
  const sp = await ctx.db.doc(`posts/${postId}`).get(); if (!sp.exists) return;
  const post = sp.data();
  const termos = await checarTexto(ctx, c.texto);
  if (termos.length) {
    await ctx.db.doc(`posts/${postId}/comentarios/${cid}`).update({ oculto: true, moderacaoAuto: { motivos: termos.map((t) => `palavra "${t}"`), em: new Date().toISOString() } });
    await ctx.db.collection('denuncias').add({
      tipoAlvo: 'comentario', postId, comentarioId: cid, autorPostUid: post.autorUid, autorPostAcademiaId: post.autorAcademiaId || null,
      autorComentarioUid: c.autorUid, denuncianteUid: 'sistema', denuncianteNome: 'Filtro automático', motivo: `Comentário com ${termos.join(', ')}: "${String(c.texto).slice(0, 120)}"`,
      criadoEm: new Date().toISOString(), status: 'aberta',
      // a escola do POST (antes caía na escola nº 1: 'sistema' não é cadastro)
      ...(post.escolaId ? { escolaId: post.escolaId } : {}),
    });
    return;
  }
  const quem = await pessoaReal(ctx, c.autorUid, { nome: c.autorNome, foto: c.autorFoto });
  const de = { uid: c.autorUid, nome: quem.nome, foto: quem.foto };
  const link = `rede.html#post/${postId}`;
  const avisados = new Set([c.autorUid]);
  if (c.respostaA) {
    const r = await ctx.db.doc(`posts/${postId}/comentarios/${c.respostaA}`).get();
    if (r.exists && !avisados.has(r.data().autorUid)) { avisados.add(r.data().autorUid); await notificar(ctx, [r.data().autorUid], { tipo: 'resposta', titulo: `${primeiroNome(de.nome)} respondeu você`, texto: String(c.texto).slice(0, 140), link, de }); }
  }
  const mencionados = (await soDaEscola(ctx, uidsDe(c.mencoes), post.escolaId || null)).filter((u) => !avisados.has(u));
  mencionados.forEach((u) => avisados.add(u));
  await notificar(ctx, mencionados, { tipo: 'mencao', titulo: `${primeiroNome(de.nome)} mencionou você`, texto: String(c.texto).slice(0, 140), link, de });
  if (!avisados.has(post.autorUid)) await notificar(ctx, [post.autorUid], { tipo: 'comentario', titulo: `${primeiroNome(de.nome)} comentou seu post`, texto: String(c.texto).slice(0, 140), link, de, tag: `coment_${postId}` }, { idFixo: `coment_${postId}` });
}

// ---------- conversas ----------
// Responsáveis legais que acompanham a conversa de um menor.
export async function responsaveisDe(ctx, participantes) {
  const ids = new Set();
  for (const p of participantes || []) {
    const s = await ctx.db.doc(`usuarios/${p}`).get();
    if (s.exists && ehMenor(s.data()) && s.data().responsavelUid && !participantes.includes(s.data().responsavelUid)) ids.add(s.data().responsavelUid);
  }
  return Array.from(ids);
}
export async function aoCriarConversa(ctx, ev) {
  const c = ev.depois; if (!c || c.tipo !== 'direta') return;
  await ctx.db.doc(`conversas/${ev.params.id}`).update({ responsaveisIds: await responsaveisDe(ctx, c.participantes) });
}
export async function atualizarResponsaveisDasConversas(ctx, uid) {
  const s = await ctx.db.collection('conversas').where('participantes', 'array-contains', uid).limit(200).get();
  for (const d of s.docs) { if (d.data().tipo === 'direta') await d.ref.update({ responsaveisIds: await responsaveisDe(ctx, d.data().participantes) }); }
}
export async function aoCriarMensagem(ctx, ev) {
  const { id } = ev.params; const m = ev.depois; if (!m) return;
  const sc = await ctx.db.doc(`conversas/${id}`).get(); if (!sc.exists) return;
  const c = sc.data();
  const alvos = (c.participantes || []).filter((u) => u !== m.autorUid);
  const autor = await pessoaReal(ctx, m.autorUid, { nome: m.autorNome });
  const titulo = c.tipo === 'grupo' ? `${c.nome || 'Grupo do núcleo'}` : (autor.nome || 'Mensagem nova');
  const texto = c.tipo === 'grupo' ? `${primeiroNome(autor.nome)}: ${m.texto || '📷 Foto'}` : (m.texto || '📷 Foto');
  await notificar(ctx, alvos, { tipo: 'mensagem', titulo, texto: String(texto).slice(0, 140), link: `rede.html#mensagens/${id}`, de: { uid: m.autorUid, nome: autor.nome }, tag: `msg_${id}` }, { idFixo: `msg_${id}` });
}

// ---------- seguir ----------
export async function aoAtualizarPerfilPublico(ctx, ev) {
  const { uid } = ev.params; const { antes, depois } = ev; if (!antes || !depois) return;
  // Seguidores, capa, bio ou certificados mudaram → brasões da Rede/Certificados (46–48, 61–63).
  // Depois do recálculo esses campos ficam iguais, então o gatilho não entra em laço.
  const n = (x) => (Array.isArray(x) ? x.length : 0);
  if (n(antes.seguidores) !== n(depois.seguidores) || (antes.capaUrl || '') !== (depois.capaUrl || '') || (antes.bio || '') !== (depois.bio || '') || n(antes.certificados) !== n(depois.certificados)) {
    try { await sincronizarPerfil(ctx, uid); } catch (e) { (ctx.log || console).warn('perfil (rede)', uid, e && e.message); }
  }
  const pedidos = (depois.pedidosSeguir || []).filter((u) => !(antes.pedidosSeguir || []).includes(u));
  const seguidores = (depois.seguidores || []).filter((u) => !(antes.seguidores || []).includes(u) && !(antes.pedidosSeguir || []).includes(u));
  for (const u of pedidos) { const s = await ctx.db.doc(`perfisPublicos/${u}`).get(); const nome = s.exists ? s.data().nome : 'Alguém'; await notificar(ctx, [uid], { tipo: 'seguir', titulo: `${primeiroNome(nome)} pediu para seguir você`, texto: 'Aceite ou recuse no seu perfil.', link: 'rede.html#perfil', de: { uid: u, nome } }, { idFixo: `seguir_${u}` }); }
  for (const u of seguidores) { const s = await ctx.db.doc(`perfisPublicos/${u}`).get(); const nome = s.exists ? s.data().nome : 'Alguém'; await notificar(ctx, [uid], { tipo: 'seguir', titulo: `${primeiroNome(nome)} começou a seguir você`, texto: '', link: `rede.html#perfil/${u}`, de: { uid: u, nome } }, { push: false }); }
}

// ---------- avisos / eventos ----------
export async function aoEscreverAviso(ctx, ev) {
  await auditar(ctx, 'avisos', ev);
  if (ev.antes || !ev.depois) return;
  const a = ev.depois;
  await notificar(ctx, await membros(ctx, a.academiaId || null, a.escolaId || null), { tipo: 'aviso', titulo: a.titulo || 'Aviso do grupo', texto: String(a.texto || '').slice(0, 160), link: 'rede.html#feed', tag: `aviso_${ev.params.id}` });
}
export async function aoEscreverEvento(ctx, ev) {
  await auditar(ctx, 'eventos', ev);
  if (ev.antes || !ev.depois) return;
  const e = ev.depois;
  const quando = e.data ? new Date(`${e.data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
  await notificar(ctx, await membros(ctx, e.academiaId || null, e.escolaId || null), { tipo: 'evento', titulo: `Evento: ${e.nome || 'novo evento'}`, texto: `${quando}${e.local ? ` · ${e.local}` : ''} — confirme sua presença.`, link: `rede.html#agenda/${ev.params.id}`, tag: `evento_${ev.params.id}` });
}

// ---------- denúncias / solicitações ----------
export async function aoCriarDenuncia(ctx, ev) {
  const d = ev.depois; if (!d || d.denuncianteUid === 'sistema' && d.tipoAlvo !== 'comentario') return;
  let nucleoAutor = null;
  if (d.autorPostUid) nucleoAutor = (await pessoaReal(ctx, d.autorPostUid)).academiaId;
  const alvos = [...(await admins(ctx, d.escolaId || ESCOLA_PADRAO)), ...(await gestoresDoNucleo(ctx, nucleoAutor))];
  await notificar(ctx, alvos, { tipo: 'denuncia', titulo: 'Nova denúncia na Rede', texto: String(d.motivo || '').slice(0, 140), link: 'rede.html#moderacao', tag: 'denuncia' }, { idFixo: 'denuncias' });
}
export async function aoEscreverSolicitacao(ctx, ev) {
  await auditar(ctx, 'solicitacoes', ev);
  const { antes, depois } = ev;
  if (!antes && depois && depois.tipo === 'exclusao_conta') {
    await notificar(ctx, await admins(ctx, depois.escolaId || (depois.solicitanteUid ? await escolaDoUsuario(ctx, depois.solicitanteUid) : null) || ESCOLA_PADRAO), { tipo: 'lgpd', titulo: 'Pedido de exclusão de conta', texto: `${depois.solicitanteNome || 'Um atleta'} pediu para apagar a conta e os dados (LGPD).`, link: 'admin.html#lgpd' });
  }
  if (antes && depois && antes.status !== depois.status && ['aprovado', 'rejeitado', 'concluida'].includes(depois.status) && depois.solicitanteUid) {
    await notificar(ctx, [depois.solicitanteUid], { tipo: 'solicitacao', titulo: depois.status === 'rejeitado' ? 'Solicitação recusada' : 'Solicitação atendida', texto: String(depois.tipo || '').replace(/_/g, ' '), link: 'admin.html' }, { push: true });
  }
}
export async function aoEscreverPagamento(ctx, ev) {
  await auditar(ctx, 'pagamentos', ev);
  // Mensalidade paga/estornada muda a validade da carteirinha.
  const alunos = new Set([ev.antes && ev.antes.alunoId, ev.depois && ev.depois.alunoId].filter((a) => a && !String(a).startsWith('excluido_')));
  for (const a of alunos) {
    await carteirinhaSegura(ctx, a);
    // Meses seguidos pagos → brasões "Mensalidade em dia" / "Um ano em dia".
    try { await sincronizarPerfil(ctx, a, { compromisso: true }); } catch (e) { (ctx.log || console).warn('compromisso', a, e && e.message); }
  }
}

// ---------- brasões 46–71: contadores e recálculos ----------
// "Eu vou" num evento: eventos/{id}/confirmados/{uid} criado/apagado → contador no cadastro
// (campo que só o servidor grava; o gatilho de usuarios recalcula o cartão).
export async function aoEscreverConfirmado(ctx, ev) {
  const { uid } = ev.params; if (!uid) return;
  const delta = ev.depois && !ev.antes ? 1 : (!ev.depois && ev.antes ? -1 : 0);
  if (!delta) return;
  const ref = ctx.db.doc(`usuarios/${uid}`); const s = await ref.get(); if (!s.exists) return;
  await ref.update({ eventosConfirmados: Math.max(0, (Number(s.data().eventosConfirmados) || 0) + delta) });
}
// Card "Troquei de cordão" compartilhado (o app marca compartilhadoEm no aviso) → contador.
export async function aoEscreverNotificacao(ctx, ev) {
  const { uid } = ev.params; const { antes, depois } = ev;
  if (!uid || !depois || depois.tipo !== 'cordao' || !depois.compartilhadoEm || (antes && antes.compartilhadoEm)) return;
  if (depois.compartilhamentoContado) return; // cada card conta uma vez só
  const ref = ctx.db.doc(`usuarios/${uid}`); const s = await ref.get(); if (!s.exists) return;
  await ref.update({ cardsCompartilhados: (Number(s.data().cardsCompartilhados) || 0) + 1 });
  await ctx.db.doc(`notificacoes/${uid}/itens/${ev.params.id}`).update({ compartilhamentoContado: true }).catch(() => {});
}
// Vídeo de apresentação ou assinatura cadastrada/removida → brasões 64 e 67.
export async function aoEscreverApresentacaoOuAssinatura(ctx, ev) {
  const { uid } = ev.params; if (!uid) return;
  try { await sincronizarPerfil(ctx, uid); } catch (e) { (ctx.log || console).warn('perfil (apresentação/assinatura)', uid, e && e.message); }
}
// Falha na carteirinha nunca derruba o resto do gatilho.
async function carteirinhaSegura(ctx, uid) {
  try { await sincronizarCarteirinha(ctx, uid); } catch (e) { (ctx.log || console).warn('carteirinha', uid, e && e.message); }
}
export const aoEscreverNucleo = (ctx, ev) => auditar(ctx, 'nucleos', ev);
export const aoEscreverConfig = (ctx, ev) => auditar(ctx, 'config', ev);

// ---------- utilidades ----------
export async function apagarSubcolecao(ctx, caminho) {
  for (let i = 0; i < 20; i++) {
    const s = await ctx.db.collection(caminho).limit(200).get();
    if (s.empty) return;
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }
}
export function caminhoDoStorage(url) {
  const m = String(url || '').match(/\/o\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
// Só apaga arquivos dentro do prefixo esperado (ex.: rede/<autor>/) — um link
// estranho num post nunca apaga arquivo de outra pessoa.
export async function apagarArquivosDoStorage(ctx, urls, prefixo) {
  if (!ctx.bucket) return 0;
  let n = 0;
  for (const u of urls || []) {
    const p = caminhoDoStorage(u);
    if (p && p.startsWith(prefixo)) { try { await ctx.bucket.file(p).delete(); n++; } catch (e) { /* já não existe */ } }
  }
  return n;
}
