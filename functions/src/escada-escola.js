// Escada de graduação de uma escola da plataforma (escolas/{id}.escada, gravada na ativação),
// com cache por execução. Módulo próprio para perfil.js e graduacao-escola.js não se importarem
// em círculo (v34).
import { escadaLimpa, escadaPadrao } from './compartilhado/modalidades.js';

export async function escadaDaEscola(ctx, escolaId) {
  if (!ctx._escadas) ctx._escadas = new Map();
  if (ctx._escadas.has(escolaId)) return ctx._escadas.get(escolaId);
  const s = await ctx.db.doc(`escolas/${escolaId}`).get();
  const e = s.exists ? s.data() : {};
  const escada = escadaLimpa(e.escada) || escadaPadrao(e.modalidade || 'outra', Array.isArray(e.graduacoes) ? e.graduacoes : []);
  ctx._escadas.set(escolaId, escada);
  return escada;
}
