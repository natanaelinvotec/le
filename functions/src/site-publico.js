// Agenda pública do site da escola (agendaPublica/{tipo}_{id}).
//
// Eventos (eventos/{id}) e avisos (avisos/{id}) são lidos só por quem é da escola (regras).
// Quando o professor publica no app com "Mostrar no site" (campo noSite: true), o servidor
// copia para agendaPublica SÓ o que pode ser público — título, data, hora, local, texto curto
// e o nome do núcleo. Nada de quem criou, taxa, inscritos ou ids internos. Desmarcou, apagou
// ou o item ficou sem escola: a cópia some. O site (js/site-escola.js) lê por escolaId.
// Regras: agendaPublica é leitura pública e escrita só do servidor.

const TEXTO = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max) : '');
const DATA = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
const HORA = (v) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : '');

export const idPublico = (tipo, id) => `${tipo}_${String(id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100)}`;

// Pura (testável): o documento público a partir do evento/aviso, ou null se não deve aparecer.
export function itemPublico(tipo, dados, nomeNucleo = '') {
  const d = dados && typeof dados === 'object' ? dados : null;
  if (!d || d.noSite !== true) return null;
  const escolaId = TEXTO(d.escolaId, 60);
  if (!escolaId || escolaId.startsWith('_')) return null;
  const titulo = TEXTO(tipo === 'evento' ? d.nome : d.titulo, 80);
  if (!titulo) return null;
  return {
    escolaId,
    tipo,
    titulo,
    texto: TEXTO(tipo === 'evento' ? d.descricao : d.texto, 240),
    data: DATA(d.data),
    hora: HORA(d.hora),
    local: TEXTO(d.local, 140),
    nucleo: TEXTO(nomeNucleo, 60),
    criadoEm: TEXTO(d.criadoEm, 30) || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
}

async function nomeDoNucleo(ctx, academiaId) {
  if (!academiaId || typeof academiaId !== 'string') return '';
  try {
    const s = await ctx.db.doc(`nucleosPublicos/${academiaId}`).get();
    return s.exists ? TEXTO(s.data().nome, 60) : '';
  } catch (e) { return ''; }
}

// Chamado pelos gatilhos de eventos/avisos (gatilhos.js) em toda escrita: cria, atualiza ou apaga a cópia.
export async function espelharNoSite(ctx, tipo, id, depois) {
  const ref = ctx.db.doc(`agendaPublica/${idPublico(tipo, id)}`);
  const pub = itemPublico(tipo, depois, depois && depois.noSite === true ? await nomeDoNucleo(ctx, depois.academiaId) : '');
  if (pub) await ref.set(pub);
  else await ref.delete().catch(() => {});
  return pub;
}
