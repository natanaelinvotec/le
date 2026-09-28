// Moderação automática da Rede.
// Texto: mesma lista de palavras do app (js/moderacao.js) + as que o Admin
// cadastrar em config/moderacao.palavras.
// Imagem: Google Cloud Vision (SafeSearch). Nada é apagado: o post vai para a
// fila de revisão do responsável do núcleo/Admin, que decide.
import { termosOfensivos } from './compartilhado/moderacao.js';

const NIVEL = { UNKNOWN: 0, VERY_UNLIKELY: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, VERY_LIKELY: 5 };

export async function palavrasExtras(ctx) {
  if (ctx._palavrasExtras) return ctx._palavrasExtras;
  try {
    const s = await ctx.db.doc('config/moderacao').get();
    ctx._palavrasExtras = s.exists && Array.isArray(s.data().palavras) ? s.data().palavras : [];
  } catch (e) { ctx._palavrasExtras = []; }
  return ctx._palavrasExtras;
}

export async function checarTexto(ctx, texto) {
  return termosOfensivos(texto, await palavrasExtras(ctx));
}

// URL de download do Storage → gs://bucket/caminho (o Vision lê direto do bucket).
export function urlParaGs(url) {
  const m = String(url || '').match(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  return m ? `gs://${m[1]}/${decodeURIComponent(m[2])}` : null;
}

// Capoeira parece luta nas fotos: "violência" só pesa no nível máximo, e
// "insinuante" (racy) nem entra (roupa de treino, sem camisa…).
export function motivosSafeSearch(ss) {
  if (!ss) return [];
  const m = [];
  if ((NIVEL[ss.adult] || 0) >= NIVEL.LIKELY) m.push('imagem adulta');
  if ((NIVEL[ss.violence] || 0) >= NIVEL.VERY_LIKELY) m.push('imagem violenta');
  return m;
}

export async function checarImagens(ctx, urls) {
  if (!ctx.vision) return [];
  const gs = (urls || []).map(urlParaGs).filter(Boolean).slice(0, 4);
  if (!gs.length) return [];
  try {
    const respostas = await ctx.vision(gs);
    return Array.from(new Set(respostas.flatMap((r) => motivosSafeSearch(r && r.safeSearchAnnotation))));
  } catch (e) {
    (ctx.log || console).warn('vision indisponível', e && e.message);
    return [];
  }
}

// Chamada real ao Vision (usada em produção; os testes trocam por um falso).
export function criarVision(obterToken) {
  return async (gsUris) => {
    const token = await obterToken();
    const r = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: gsUris.map((u) => ({ image: { source: { imageUri: u } }, features: [{ type: 'SAFE_SEARCH_DETECTION' }] })) }),
    });
    if (!r.ok) throw new Error(`vision ${r.status}`);
    const j = await r.json();
    return j.responses || [];
  };
}
