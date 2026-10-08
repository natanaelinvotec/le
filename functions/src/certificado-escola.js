// v34 — Certificado de FAIXA e de GRAU das escolas da plataforma (Jiu-Jitsu, Judô…).
//
// A escola nº 1 (capoeira) continua com certificado.js (cordões, brasão do grupo,
// Mestre Profeta). Aqui o certificado leva a identidade da PRÓPRIA escola dentro do
// documento (escola: nome, logo, cores, cidade, modalidade) — a página pública
// certificado.html#CODIGO é aberta sem login e desenha com esses dados, sem depender
// de qual escola está "no ar" no navegador de quem confere.
//
//   certificados/{codigo}  → tipo 'faixa', faixa (cores/ponteira/graus), escola, assinaturas
//   certificadosDe/{uid}   → mesma lista do app (item com graus)
//
// Numeração por escola: <PREFIXO>-CERT-AAAA-0001 (contador em sistema/contadores, campo
// cert_<escolaId>). Um certificado por troca (chave = faixa + grau + data da troca).
import { createHash } from 'node:crypto';
import { novoCodigo } from './carteirinha.js';
import { ehMenor } from './perfil.js';
import { nomeNoCertificado, publicarNoPerfil, tituloDoNucleo } from './certificado.js';
import { rotuloGraduacao, MODALIDADES } from './compartilhado/modalidades.js';

const pad = (n) => String(n).padStart(2, '0');
const dataLocal = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const TXT = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const HEX = (v) => (/^#[0-9a-f]{3,8}$/i.test(String(v || '')) ? String(v) : null);
const URL_OK = (v, bucket) => (/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\//.test(String(v || '')) &&
  (!bucket || String(v).startsWith(`https://firebasestorage.googleapis.com/v0/b/${bucket}/`)) ? String(v) : null);
const PLURAL = (p) => (/ão$/.test(p) ? p.replace(/ão$/, 'ões') : /l$/.test(p) ? p.replace(/l$/, 'is') : `${p}s`);

// Prefixo do número: até 6 letras do endereço + 2 de um resumo do id (dois "gracie-…" não se repetem).
export const prefixoDaEscola = (id) => {
  const base = String(id || 'ESC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'ESC';
  const resumo = createHash('sha1').update(String(id || '')).digest('hex').slice(0, 2).toUpperCase();
  return `${base}${resumo}`;
};
export { PLURAL as pluralDaPeca };

// Identidade pública da escola (o que o certificado mostra) — do cartão público.
export async function identidadeDaEscola(ctx, escolaId) {
  if (!ctx._identidades) ctx._identidades = new Map();
  if (ctx._identidades.has(escolaId)) return ctx._identidades.get(escolaId);
  const [sp, se] = await Promise.all([ctx.db.doc(`escolasPublicas/${escolaId}`).get(), ctx.db.doc(`escolas/${escolaId}`).get()]);
  const p = sp.exists ? sp.data() : {}; const e = se.exists ? se.data() : {};
  const mod = MODALIDADES[p.modalidade || e.modalidade] || MODALIDADES.outra;
  const cores = p.cores || e.cores || {};
  const id = {
    id: escolaId,
    nome: TXT(p.nome || e.nome, 80) || escolaId,
    curto: TXT(p.nomeCurto || e.nomeCurto || p.nome || e.nome, 30) || escolaId,
    modalidade: mod.nome, peca: TXT((p.escada && p.escada.peca) || mod.peca, 20) || 'faixa', lider: TXT((p.escada && p.escada.lider) || mod.lider, 20) || 'Professor',
    cidade: TXT(p.cidade || e.cidade, 60), uf: TXT(p.uf || e.uf, 2),
    logo: URL_OK(p.logo, ctx.bucket && ctx.bucket.name) || null,
    responsavel: TXT((p.responsavel && p.responsavel.nome) || (e.responsavel && e.responsavel.nome), 80),
    cor: HEX(cores.navy) || HEX(cores.teal) || '#1E2A78', acento: HEX(cores.verde) || HEX(cores.teal) || '#FF7A1A',
    donoUid: e.donoUid || null,
  };
  ctx._identidades.set(escolaId, id);
  return id;
}

// Assinam: o responsável técnico da escola (dono/Fundador) e o professor do núcleo do atleta (se for outra pessoa).
async function assinaturasDaEscola(ctx, esc, u) {
  const nomeDe = async (uid) => { if (!uid) return ''; const s = await ctx.db.doc(`usuarios/${uid}`).get(); return s.exists ? TXT(s.data().nome, 80) : ''; };
  const lista = [];
  if (esc.donoUid) lista.push({ uid: esc.donoUid, nome: (await nomeDe(esc.donoUid)) || esc.responsavel, titulo: (await nomeDe(esc.donoUid)) || esc.responsavel || esc.lider, papel: `Responsável técnico · ${esc.curto}` });
  else if (esc.responsavel) lista.push({ uid: null, nome: esc.responsavel, titulo: esc.responsavel, papel: `Responsável técnico · ${esc.curto}` });
  if (u.academiaId) {
    const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get();
    const n = sn.exists ? sn.data() : null;
    if (n && n.professorUid && n.professorUid !== esc.donoUid) {
      const nome = (await nomeDe(n.professorUid)) || tituloDoNucleo(n.nome);
      lista.push({ uid: n.professorUid, nome, titulo: nome, papel: `${esc.lider} do núcleo` });
    }
  }
  return lista.slice(0, 2);
}

// Emite (uma vez) o certificado de uma graduação. troca = { cordao, graus, anterior, anteriorGraus, em, eventoId? }.
export async function emitirCertificadoEscola(ctx, uid, u, item, troca) {
  if (!u || !u.escolaId || !item || !troca || !troca.cordao) return null;
  const graus = Math.min(Math.max(0, Number(troca.graus) || 0), Number(item.graus) || 10);
  const data = dataLocal(troca.em || new Date().toISOString()) || dataLocal(new Date().toISOString());
  // Sem a linha no histórico: chave fixa (reentrega do gatilho não duplica).
  const chave = `${troca.cordao}|${graus}|${troca.em ? String(troca.em).slice(0, 19) : 'sem-data'}`;
  const refDe = ctx.db.doc(`certificadosDe/${uid}`);
  const sd = await refDe.get();
  const itens = sd.exists && Array.isArray(sd.data().itens) ? sd.data().itens : [];
  const ja = itens.find((i) => i.chave === chave);
  if (ja) return { ...ja, repetido: true };

  const esc = await identidadeDaEscola(ctx, u.escolaId);
  let nucleo = '';
  if (u.academiaId) { const sn = await ctx.db.doc(`nucleos/${u.academiaId}`).get(); nucleo = sn.exists && (sn.data().escolaId || u.escolaId) === u.escolaId ? TXT(sn.data().nome, 80) : ''; }
  let evento = null;
  if (troca.eventoId) {
    const se = await ctx.db.doc(`eventos/${troca.eventoId}`).get();
    if (se.exists && se.data().nome && se.data().escolaId === u.escolaId) evento = { nome: TXT(se.data().nome, 120), local: TXT(se.data().local, 120), data: se.data().data || data };
  }
  const assinaturas = await assinaturasDaEscola(ctx, esc, u);
  const si = await ctx.db.doc(`carteirinhasIndice/${uid}`).get();
  const matricula = si.exists ? TXT(si.data().matricula, 30) : '';
  const agora = new Date();
  const refCont = ctx.db.doc('sistema/contadores');
  const campo = `cert_${String(u.escolaId).replace(/[^A-Za-z0-9_]/g, '_')}`;
  let numero = null;
  for (let tentativa = 0; tentativa < 4 && !numero; tentativa++) {
    try {
      numero = await ctx.db.runTransaction(async (t) => {
        const sc = await t.get(refCont);
        const n = (sc.exists ? Number(sc.data()[campo]) || 0 : 0) + 1;
        t.set(refCont, { [campo]: n }, { merge: true });
        return `${prefixoDaEscola(u.escolaId)}-CERT-${agora.getFullYear()}-${String(n).padStart(4, '0')}`;
      });
    } catch (e) {
      if (tentativa === 3) throw e;
      await new Promise((r) => setTimeout(r, 300 * (tentativa + 1) + Math.random() * 400));
    }
  }
  const menor = ehMenor(u);
  const cor = Array.isArray(item.cor) ? item.cor.slice(0, 3).map((c) => HEX(c) || '#C8CED6') : ['#C8CED6', '#C8CED6', '#C8CED6'];
  const pub = {
    tipo: 'faixa', numero, nome: nomeNoCertificado(u.nome, menor),
    cordao: troca.cordao, graus, rotulo: rotuloGraduacao(troca.cordao, graus, item),
    anterior: troca.anterior || null, anteriorGraus: Math.max(0, Number(troca.anteriorGraus) || 0),
    faixa: { cor, ponteira: HEX(item.ponteira), padrao: item.padrao === 'blocos' ? 'blocos' : null, grauDan: Number(item.grauDan) || null, graus: Number(item.graus) || 0, titulo: TXT(item.titulo, 30) },
    cores: cor, nucleo, data, evento, assinaturas, menor, legado: false, matricula,
    escola: { id: esc.id, nome: esc.nome, curto: esc.curto, modalidade: esc.modalidade, peca: esc.peca, lider: esc.lider, cidade: esc.cidade, uf: esc.uf, logo: esc.logo, responsavel: esc.responsavel, cor: esc.cor, acento: esc.acento },
    grupo: esc.nome, escolaId: u.escolaId, ativo: true, emitidoEm: agora.toISOString(),
  };
  const codigo = novoCodigo();
  const reg = { codigo, numero, cordao: troca.cordao, graus, data, evento: evento ? evento.nome : '', chave, legado: false };
  // Lista da pessoa e certificado juntos, numa transação: duas graduações seguidas não se apagam
  // e uma reentrega simultânea não cria dois certificados da mesma troca.
  const criado = await ctx.db.runTransaction(async (t) => {
    const atual = await t.get(refDe);
    const lista = atual.exists && Array.isArray(atual.data().itens) ? atual.data().itens : [];
    const repetido = lista.find((i) => i.chave === chave);
    if (repetido) return { ...repetido, repetido: true };
    t.set(ctx.db.doc(`certificados/${codigo}`), pub);
    t.set(refDe, { itens: lista.concat([reg]).slice(-60), atualizadoEm: agora.toISOString() }, { merge: true });
    return reg;
  });
  if (!criado.repetido) await publicarNoPerfil(ctx, uid);
  return criado;
}
