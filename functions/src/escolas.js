// Escolas (multi-escola / AtletaPay) — fundação no servidor.
//
// Regra de ouro: quem diz a que escola um registro pertence é o SERVIDOR.
// O app nunca precisa gravar `escolaId`; esta camada deduz pelo vínculo real
// (núcleo do registro → escola do núcleo; senão, a escola de quem escreveu) e
// corrige o campo se alguém tentar gravar outra escola. Assim:
//   1. todo dado novo já nasce etiquetado, sem mexer em cada tela do app;
//   2. a migração m8 etiqueta o que já existe (a Liberdade vira a escola nº 1);
//   3. o login de cada pessoa leva a escola e os papéis (custom claims), para
//      as regras do banco isolarem as escolas sem ler o perfil a cada acesso.
// As regras só passam a EXIGIR `escolaId` depois que tudo estiver etiquetado
// (fase "contrato"); até lá o app atual continua funcionando igual.

export const ESCOLA_PADRAO = 'liberdade';

// Dados da escola nº 1 (a mesma identidade de js/escola.js). Só usados para
// criar escolas/liberdade se ainda não existir — depois o Mega painel edita.
export const ESCOLA_LIBERDADE = {
  nome: 'Capoeira Liberdade e Expressão',
  nomeCurto: 'Liberdade e Expressão',
  slug: ESCOLA_PADRAO,
  modalidade: 'capoeira',
  lider: 'Mestre',
  pecaGraduacao: 'cordão',
  cidade: 'Campo Grande',
  uf: 'MS',
  dominio: 'liberdadeeexpressao.com.br',
  status: 'ativa',
  plano: 'federacao',
  origem: 'fundadora',
};

// Coleções que recebem escolaId automaticamente (as que têm gatilho no servidor).
// conversas fica de fora de propósito: a aba Global vai permitir conversa entre escolas.
export const COLECOES_COM_ESCOLA = ['usuarios', 'nucleos', 'presencas', 'posts', 'avisos', 'eventos', 'solicitacoes', 'pagamentos', 'campeonatos', 'denuncias'];
// A migração etiqueta também estas (sem gatilho próprio; o app novo já grava certo).
export const COLECOES_SO_MIGRACAO = ['stories', 'materiais', 'perfisPublicos'];
// 1c (parte 3): também ganham escola — o Fundador passa a ver só a própria escola nelas.
// auditoria: o servidor já grava com escola; conversas e fotos de carteirinha: gatilho comEscola.
export const COLECOES_1C = ['auditoria', 'conversas', 'fotosCarteirinha'];
// Coleções em que o app grava escolaId e as regras garantem que é a escola de quem grava
// (claim do login). Nelas o servidor só COMPLETA quando falta — não troca o que veio.
// usuarios e nucleos ficam de fora: a escola deles é sempre a que o servidor deduz.
const ESCOLA_DEDUZIDA_SEMPRE = new Set(['usuarios', 'nucleos']);

const CAMPOS_USUARIO = ['uid', 'autorUid', 'alunoId', 'solicitanteUid', 'organizadorUid', 'criadoPor', 'registradoPor', 'denuncianteUid', 'quemUid'];

function cache(ctx) { if (!ctx._escolas) ctx._escolas = { nucleo: new Map(), usuario: new Map() }; return ctx._escolas; }

export async function escolaDoNucleo(ctx, nucleoId) {
  if (!nucleoId) return null;
  const c = cache(ctx).nucleo;
  if (c.has(nucleoId)) return c.get(nucleoId);
  const s = await ctx.db.doc(`nucleos/${nucleoId}`).get();
  const id = s.exists ? (s.data().escolaId || ESCOLA_PADRAO) : null;
  c.set(nucleoId, id);
  return id;
}

export async function escolaDoUsuario(ctx, uid) {
  if (!uid) return null;
  const c = cache(ctx).usuario;
  if (c.has(uid)) return c.get(uid);
  const s = await ctx.db.doc(`usuarios/${uid}`).get();
  let id = null;
  if (s.exists) { const u = s.data(); id = u.escolaId || (await escolaDoNucleo(ctx, u.academiaId)) || ESCOLA_PADRAO; }
  c.set(uid, id);
  return id;
}

// A escola "verdadeira" de um registro, pelo vínculo que ele tem.
export async function escolaDe(ctx, colecao, d, docId = null) {
  if (!d) return null;
  if (colecao === 'nucleos') return d.escolaId || ESCOLA_PADRAO; // núcleo: definido na ativação da escola (servidor)
  if (colecao === 'usuarios') {
    const pelaAcademia = await escolaDoNucleo(ctx, d.academiaId);
    if (pelaAcademia) return pelaAcademia;
    const peloNucleoGerenciado = await escolaDoNucleo(ctx, d.academiaGerenciadaId);
    return peloNucleoGerenciado || d.escolaId || ESCOLA_PADRAO;
  }
  const pelaSede = (await escolaDoNucleo(ctx, d.nucleoId)) || (await escolaDoNucleo(ctx, d.academiaId));
  if (pelaSede) return pelaSede;
  if (['perfisPublicos', 'fotosCarteirinha'].includes(colecao) && docId) { const e = await escolaDoUsuario(ctx, docId); if (e) return e; }
  if (colecao === 'conversas' && Array.isArray(d.participantes)) {
    for (const u of d.participantes) { const e = await escolaDoUsuario(ctx, u); if (e) return e; }
  }
  for (const k of CAMPOS_USUARIO) {
    const e = await escolaDoUsuario(ctx, d[k]);
    if (e) return e;
  }
  return ESCOLA_PADRAO;
}

// Etiqueta (ou corrige) o escolaId de um documento recém-escrito.
// Devolve a escola gravada, ou null se não precisou mexer.
export async function etiquetarEscola(ctx, colecao, id, depois) {
  if (!depois) return null;
  if (depois.escolaId && !ESCOLA_DEDUZIDA_SEMPRE.has(colecao)) return null;
  const certa = await escolaDe(ctx, colecao, depois, id);
  if (!certa || depois.escolaId === certa) return null;
  if (depois.escolaId && depois.escolaId !== certa) (ctx.log || console).warn('escolaId corrigido', colecao, id, depois.escolaId, '→', certa);
  await ctx.db.doc(`${colecao}/${id}`).update({ escolaId: certa });
  if (colecao === 'usuarios') cache(ctx).usuario.set(id, certa);
  return certa;
}

// Escrita que mudou SÓ o escolaId (a nossa própria etiqueta): os gatilhos de
// negócio ignoram — senão um post recém-criado notificaria duas vezes.
export function soMudouEscola(antes, depois) {
  if (!antes || !depois) return false;
  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  let mudouEscola = false;
  for (const k of chaves) {
    if (JSON.stringify(antes[k]) === JSON.stringify(depois[k])) continue;
    if (k === 'escolaId') { mudouEscola = true; continue; }
    return false;
  }
  return mudouEscola;
}

// ---------- Login com a escola e os papéis (custom claims) ----------
// As regras do banco vão ler request.auth.token.escolaId / .papeis em vez de
// abrir usuarios/{uid} a cada leitura (mais rápido e mais barato com milhares de escolas).
export function claimsDe(u) {
  if (!u) return null;
  const papeis = Array.isArray(u.papeis) ? u.papeis.filter((p) => typeof p === 'string').slice(0, 8) : [];
  return {
    escolaId: u.escolaId || ESCOLA_PADRAO,
    papeis,
    gestorDe: u.academiaGerenciadaId || null,
    acessoGeral: u.acessoGeral === true,
  };
}

export async function sincronizarClaims(ctx, uid, u) {
  if (!ctx.auth || !uid) return false;
  let atuais = {};
  try { atuais = (await ctx.auth.getUser(uid)).customClaims || {}; }
  catch (e) { if (e && e.code === 'auth/user-not-found') return false; throw e; }
  const novos = claimsDe(u);
  if (!novos) {
    // Cadastro apagado: tira o que é nosso e mantém o resto.
    const { escolaId, papeis, gestorDe, acessoGeral, ...resto } = atuais; // eslint-disable-line no-unused-vars
    if (Object.keys(resto).length === Object.keys(atuais).length) return false;
    await ctx.auth.setCustomUserClaims(uid, resto);
    return true;
  }
  const iguais = ['escolaId', 'papeis', 'gestorDe', 'acessoGeral'].every((k) => JSON.stringify(atuais[k] ?? null) === JSON.stringify(novos[k] ?? null));
  if (iguais) return false;
  await ctx.auth.setCustomUserClaims(uid, { ...atuais, ...novos });
  return true;
}

// ---------- Migração: a Liberdade vira a escola nº 1 ----------
export async function garantirEscolaFundadora(ctx) {
  const ref = ctx.db.doc(`escolas/${ESCOLA_PADRAO}`);
  const s = await ref.get();
  if (s.exists) return false;
  const slug = await ctx.db.doc(`escolasSlugs/${ESCOLA_PADRAO}`).get();
  if (slug.exists && slug.data().escolaId !== ESCOLA_PADRAO) throw new Error(`O endereço "${ESCOLA_PADRAO}" já foi reservado por outra escola.`);
  const agora = new Date().toISOString();
  await ref.set({ ...ESCOLA_LIBERDADE, donoUid: null, criadoEm: agora, atualizadoEm: agora, ativadaEm: agora, ativadaPor: 'migracao' });
  await ctx.db.doc(`escolasSlugs/${ESCOLA_PADRAO}`).set({ escolaId: ESCOLA_PADRAO, donoUid: null, criadoEm: agora });
  return true;
}

async function emLotes(consulta, fn, tamanho = 300) {
  let ultimo = null; let total = 0;
  for (;;) {
    let q = consulta.limit(tamanho);
    if (ultimo) q = q.startAfter(ultimo);
    const s = await q.get();
    if (s.empty) break;
    for (let i = 0; i < s.docs.length; i += 25) {
      const r = await Promise.all(s.docs.slice(i, i + 25).map(fn));
      total += r.filter(Boolean).length;
    }
    ultimo = s.docs[s.docs.length - 1];
    if (s.size < tamanho) break;
  }
  return total;
}

// Etiqueta TUDO o que ainda não tem escola. Idempotente: rodar de novo só corrige o que faltar.
export async function migrarEscolaId(ctx) {
  const r = { escolaCriada: await garantirEscolaFundadora(ctx) };
  // Núcleos primeiro: as outras coleções deduzem a escola por eles.
  for (const col of ['nucleos', 'usuarios', ...COLECOES_COM_ESCOLA.filter((c) => !['nucleos', 'usuarios'].includes(c)), ...COLECOES_SO_MIGRACAO]) {
    r[col] = await emLotes(ctx.db.collection(col).orderBy('__name__'), async (d) => etiquetarEscola(ctx, col, d.id, d.data()));
  }
  return r;
}

// 1c (parte 3): etiqueta auditoria, conversas e fotos de carteirinha que ainda não têm escola.
export async function migrarEscolaId1c(ctx) {
  const r = {};
  for (const col of COLECOES_1C) r[col] = await emLotes(ctx.db.collection(col).orderBy('__name__'), async (d) => etiquetarEscola(ctx, col, d.id, d.data()));
  return r;
}

// Logins de todo mundo com escola e papéis.
// Sem permissão de Admin do Authentication, falha de propósito (a migração
// não fica marcada como feita e roda de novo pelo botão "Migrar" do painel).
export async function migrarClaims(ctx) {
  if (!ctx.auth) throw new Error('Migração de logins precisa do Firebase Authentication (ctx.auth).');
  let semPermissao = null;
  const n = await emLotes(ctx.db.collection('usuarios').orderBy('__name__'), async (d) => sincronizarClaims(ctx, d.id, d.data()).catch((e) => {
    if (/permission|PERMISSION_DENIED|insufficient/i.test(String((e && (e.code || e.message)) || ''))) semPermissao = e;
    (ctx.log || console).warn('claims', d.id, e && e.message);
    return false;
  }));
  if (semPermissao) throw new Error(`Sem permissão para gravar os logins: ${semPermissao.message || semPermissao.code}`);
  return n;
}

// ---------- Gatilho com escola ----------
// Embrulha um gatilho de negócio: etiqueta/corrige a escola do documento,
// atualiza o login (custom claims) quando é um cadastro, e não repete o
// gatilho quando a única mudança foi a nossa etiqueta.
const CAMPOS_DOS_CLAIMS = ['papeis', 'academiaId', 'academiaGerenciadaId', 'acessoGeral', 'escolaId'];
export function comEscola(colecao, handler) {
  return async (ctx, ev) => {
    const id = ev.params && Object.values(ev.params)[0];
    let e = ev;
    if (e.depois && id) {
      const nova = await etiquetarEscola(ctx, colecao, id, e.depois);
      if (nova) e = { ...e, depois: { ...e.depois, escolaId: nova } };
    }
    if (colecao === 'usuarios' && id) {
      const mudouLogin = !e.antes || !e.depois || CAMPOS_DOS_CLAIMS.some((k) => JSON.stringify(e.antes[k] ?? null) !== JSON.stringify(e.depois[k] ?? null));
      if (mudouLogin) await sincronizarClaims(ctx, id, e.depois).catch((err) => (ctx.log || console).warn('claims', id, err && err.message));
    }
    if (soMudouEscola(e.antes, e.depois)) return null;
    return handler ? handler(ctx, e) : null;
  };
}

// ---------- Cartão público da escola (escolasPublicas/{id}) ----------
// escolas/{id} tem dados do dono, plano e cobrança (só dono e Admin leem).
// O app, o site e a inscrição precisam só da identidade: o servidor copia,
// campo a campo, para escolasPublicas/{id} (leitura pública) enquanto a escola
// estiver ATIVA. Pausada/cancelada: o cartão some e o app volta ao padrão.
// dominios/{host} → { escolaId }: o app descobre a escola pelo endereço.
const TEXTO = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
const URLS = (v, max = 20) => (Array.isArray(v) ? v.filter((u) => typeof u === 'string' && /^https:\/\//.test(u)).slice(0, max) : []);
export const normalizarDominio = (h) => String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');

export function escolaPublica(id, e) {
  if (!e || e.status !== 'ativa') return null;
  const f = e.fotos || {};
  return {
    id,
    slug: TEXTO(e.slug || id, 30),
    nome: TEXTO(e.nome, 80),
    nomeCurto: TEXTO(e.nomeCurto, 30),
    modalidade: TEXTO(e.modalidade, 30) || 'capoeira',
    lider: TEXTO(e.lider, 30),
    pecaGraduacao: TEXTO(e.pecaGraduacao, 20),
    graduacoes: Array.isArray(e.graduacoes) ? e.graduacoes.filter((g) => typeof g === 'string').slice(0, 30).map((g) => g.slice(0, 40)) : [],
    cidade: TEXTO(e.cidade, 60),
    uf: TEXTO(e.uf, 2),
    endereco: TEXTO(e.endereco, 140),
    instagram: TEXTO(e.instagram, 60),
    responsavel: e.responsavel ? { nome: TEXTO(e.responsavel.nome, 80), graduacao: TEXTO(e.responsavel.graduacao, 60) } : null,
    modelo: TEXTO(e.modelo, 20),
    dominio: normalizarDominio(e.dominio) || null,
    logo: URLS(f.logo, 1)[0] || null,
    fotoLider: URLS(f.lider, 1)[0] || null,
    fotos: { equipe: URLS(f.equipe, 1), treino: URLS(f.treino, 20), fachada: URLS(f.fachada, 1) },
    cores: e.cores && typeof e.cores === 'object' ? Object.fromEntries(Object.entries(e.cores).filter(([k, v]) => /^[a-z]{2,12}$/.test(k) && /^#[0-9a-f]{6}$/i.test(String(v))).slice(0, 6)) : null,
    status: 'ativa',
    atualizadoEm: new Date().toISOString(),
  };
}

export async function aoEscreverEscola(ctx, ev) {
  const id = ev.params.id;
  const pub = escolaPublica(id, ev.depois);
  const dominioAntes = normalizarDominio(ev.antes && ev.antes.dominio);
  const dominioDepois = pub ? pub.dominio : null;
  if (pub) await ctx.db.doc(`escolasPublicas/${id}`).set(pub);
  else await ctx.db.doc(`escolasPublicas/${id}`).delete().catch(() => {});
  if (dominioAntes && dominioAntes !== dominioDepois) {
    const s = await ctx.db.doc(`dominios/${dominioAntes}`).get();
    if (s.exists && s.data().escolaId === id) await ctx.db.doc(`dominios/${dominioAntes}`).delete();
  }
  if (dominioDepois) {
    const s = await ctx.db.doc(`dominios/${dominioDepois}`).get();
    if (s.exists && s.data().escolaId !== id) (ctx.log || console).warn('domínio já ligado a outra escola', dominioDepois, s.data().escolaId);
    else await ctx.db.doc(`dominios/${dominioDepois}`).set({ escolaId: id, atualizadoEm: new Date().toISOString() });
  }
  return pub;
}

export async function migrarEscolasPublicas(ctx) {
  return emLotes(ctx.db.collection('escolas').orderBy('__name__'), async (d) => !!(await aoEscreverEscola(ctx, { params: { id: d.id }, antes: null, depois: d.data() })));
}
