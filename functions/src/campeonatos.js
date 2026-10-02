// Campeonatos: quando o organizador encerra (status → 'encerrado'), o servidor
// transforma o resultado em conquistas e divulgação:
//   usuarios/{uid}.competicoes  → { participacoes, podios, titulos, ultimo }  (só o servidor escreve;
//                                   alimenta os brasões Competidor / Subiu ao pódio / Campeão)
//   posts                       → um aviso do núcleo organizador com o pódio de cada categoria
//   notificacoes                → parabéns a quem subiu ao pódio
// Atletas fictícios da demonstração (uid demo_*) nunca ganham nada.
import { notificar } from './notificar.js';

const primeiro = (n) => String(n || 'Atleta').trim().split(/\s+/)[0];
const ehDemo = (uid) => /^demo_/.test(String(uid || ''));
const POS = ['🥇', '🥈', '🥉', '🥉'];

export async function aoEscreverCampeonato(ctx, ev) {
  const { id } = ev.params; const { antes, depois } = ev;
  if (!depois || depois.status !== 'encerrado' || (antes && antes.status === 'encerrado')) return null;
  if (depois.premiadoEm) return null; // idempotente: já processado
  const podios = Array.isArray(depois.podios) ? depois.podios : [];
  const inscritos = (await ctx.db.collection(`campeonatos/${id}/inscricoes`).limit(500).get()).docs.map((d) => ({ uid: d.id, ...d.data() }));
  const reais = inscritos.filter((i) => !ehDemo(i.uid) && i.demo !== true);
  const posicaoDe = {}; // uid → melhor posição (1..3)
  podios.forEach((p) => (p.podio || []).forEach((u, i) => { if (u && !ehDemo(u)) posicaoDe[u] = Math.min(posicaoDe[u] || 9, i === 3 ? 3 : i + 1); }));

  let atualizados = 0;
  for (const i of reais) {
    const ref = ctx.db.doc(`usuarios/${i.uid}`); const s = await ref.get(); if (!s.exists) continue;
    const c = s.data().competicoes || {};
    const pos = posicaoDe[i.uid] || null;
    await ref.update({
      competicoes: {
        participacoes: (Number(c.participacoes) || 0) + 1,
        podios: (Number(c.podios) || 0) + (pos ? 1 : 0),
        titulos: (Number(c.titulos) || 0) + (pos === 1 ? 1 : 0),
        ultimo: { campeonatoId: id, nome: depois.nome || '', data: depois.data || '', posicao: pos, categoria: (podios.find((p) => (p.podio || []).includes(i.uid)) || {}).categoriaNome || '' },
      },
    });
    atualizados++;
  }

  // Post do pódio (aviso do núcleo organizador, ou do organizador quando é do grupo inteiro).
  const linhas = podios.filter((p) => p.podio && p.podio[0]).map((p) => {
    const nomeDe = (u) => { const a = (p.atletas || []).find((x) => x.uid === u); return a ? (a.apelido || primeiro(a.nome)) : null; };
    const nomes = (p.podio || []).map((u, i) => (u && nomeDe(u) ? `${POS[i]} ${nomeDe(u)}` : null)).filter(Boolean);
    return `${p.categoriaNome || 'Categoria'}: ${nomes.join(' · ')}`;
  });
  if (linhas.length) {
    const org = depois.organizadorUid ? await ctx.db.doc(`usuarios/${depois.organizadorUid}`).get() : null;
    const o = org && org.exists ? org.data() : {};
    const texto = `🏆 ${depois.nome}${depois.data ? ` — ${String(depois.data).split('-').reverse().join('/')}` : ''}\n\n${linhas.join('\n')}\n\nParabéns a todos os atletas! #campeonato #capoeira`.slice(0, 1800);
    await ctx.db.collection('posts').add({
      autorUid: depois.organizadorUid || '', autorNome: o.nome || depois.organizadorNome || 'Organização', autorFoto: /^https:/.test(o.fotoUrl || '') ? o.fotoUrl : '',
      autorAcademiaId: depois.academiaId || o.academiaId || null, autorAcademiaNome: depois.academiaNome || o.academiaNome || '', autorCordao: o.cordaoAtual || '', autorMenor: false,
      texto, fotoUrl: '', midias: [], tipo: 'aviso', comoNucleo: !!depois.academiaId, nucleoId: depois.academiaId || null, nucleoNome: depois.academiaNome || '',
      marcados: Object.keys(posicaoDe).slice(0, 12).map((u) => { const a = podios.flatMap((p) => p.atletas || []).find((x) => x.uid === u); return { uid: u, nome: a ? a.nome : 'Atleta' }; }),
      visibilidade: 'rede', hashtags: ['campeonato', 'capoeira'], revisao: 'ok', oculto: false, publico: true,
      criadoEm: new Date().toISOString(), curtidas: [], comentariosCount: 0, campeonatoId: id, origem: 'campeonato',
    });
  }

  // Parabéns a quem subiu ao pódio.
  const noPodio = Object.keys(posicaoDe);
  if (noPodio.length) {
    for (const u of noPodio) {
      const pos = posicaoDe[u];
      await notificar(ctx, [u], { tipo: 'campeonato', titulo: pos === 1 ? 'Você é campeão!' : `Você ficou em ${pos}º lugar!`, texto: `${depois.nome}: ${POS[pos - 1]} ${pos}º lugar. O brasão já está no seu perfil.`, link: `campeonatos.html#c/${id}`, campeonatoId: id, posicao: pos }, { idFixo: `camp_${id}_${u}` });
    }
  }
  await ctx.db.doc(`campeonatos/${id}`).update({ premiadoEm: new Date().toISOString(), premiados: noPodio.length, participantesReais: atualizados });
  return { atualizados, podio: noPodio.length, post: linhas.length > 0 };
}
