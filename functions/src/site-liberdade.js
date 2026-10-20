// site-liberdade.js — migração única: o site antigo da Liberdade (index.html + siteConteudo/site,
// formato de js/site-padrao.js) vira conteúdo do template Ginga (siteConteudo/liberdade), que foi
// desenhado a partir dele: mesmas seções, mesmos textos, mesmas fotos (todas em assets/ do repo).
//
// Regras: não inventa nada — só reorganiza o que o Admin já tinha publicado; respeita os limites do
// schema do Ginga (mesma limpeza da aba "Meu site"); NÃO sobrescreve se siteConteudo/liberdade já
// tiver seções (o Admin pode ter mexido); e marca escolas/liberdade.template = 'ginga' (o servidor
// copia para escolasPublicas e o site passa a abrir no Ginga, com o conteúdo migrado).

import { ESCOLA_PADRAO } from './escolas.js';

const MAX_TEXTO = 400;
const MAX_ITENS = 12;
const s = (v, max = MAX_TEXTO) => String(v ?? '').replace(/\r/g, '').replace(/[^\S\n]+/g, ' ').replace(/\n{2,}/g, '\n').trim().slice(0, max);
const urlOk = (u) => /^https:\/\/[^\s"'<>\\]+$/i.test(u) || (/^[a-z0-9][a-z0-9._/-]*$/i.test(u) && !u.includes('..'));
const sim = (v) => (v === true || v === '1' || v === 1 || v === 'sim' ? '1' : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

// Formato antigo → seções do Ginga (ids e campos do schema em js/site-tpl-ginga.js).
export function converterSiteAntigo(site) {
  if (!site || typeof site !== 'object') return {};
  const topo = obj(site.topo); const arte = obj(site.arte); const grad = obj(site.graduacao); const nuc = obj(site.nucleos);
  const mes = obj(site.mestres); const ag = obj(site.agenda); const app = obj(site.app); const loja = obj(site.loja);
  const ch = obj(site.chamada); const par = obj(site.parceiros); const rod = obj(site.rodape);
  const out = {
    topo: { selo: topo.selo, titulo: topo.titulo, destaque: topo.destaque, texto: topo.texto, botao: topo.botao, botao2: topo.botao2,
      slides: arr(topo.slides).map((x) => ({ foto: x.foto, selo: x.selo, titulo: x.titulo, texto: x.texto })) },
    numeros: { itens: arr(site.numeros).map((x) => ({ valor: x.valor, rotulo: x.rotulo })) },
    faixa: { palavras: Array.isArray(site.faixa) ? site.faixa.filter((x) => typeof x === 'string' && x.trim()).slice(0, 8).join(', ') : site.faixa },
    arte: { selo: arte.selo, titulo: arte.titulo, destaque: arte.destaque, texto: arte.texto,
      pilares: arr(arte.pilares).map((x) => ({ titulo: x.titulo, texto: x.texto, foto: x.foto })) },
    graduacao: { selo: grad.selo, titulo: grad.titulo, destaque: grad.destaque, texto: grad.texto, infantil: grad.infantil, botao: grad.botao },
    nucleos: { selo: nuc.selo, titulo: nuc.titulo, destaque: nuc.destaque, nota: nuc.nota, convite: nuc.convite,
      lista: arr(nuc.lista).map((x) => ({ nome: x.nome, bairro: x.bairro, dias: x.dias, horario: x.horario, endereco: x.endereco,
        whatsapp: String(x.whatsapp ?? '').replace(/\D/g, ''), foto: x.foto, infantil: sim(x.infantil), noite: sim(x.noite) })) },
    mestres: { selo: mes.selo, titulo: mes.titulo, destaque: mes.destaque, texto: mes.texto,
      lista: arr(mes.lista).map((x) => ({ nome: x.nome, cargo: x.cargo, foto: x.foto, instagram: x.instagram })) },
    agenda: { selo: ag.selo, titulo: ag.titulo, destaque: ag.destaque, foto: ag.foto, aviso: ag.aviso,
      lista: arr(ag.lista).map((x) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x.data || ''));
        return { titulo: x.titulo, dia: m ? m[3] : '', mes: m ? m[2] : '', ano: m ? m[1] : '', horario: x.horario, local: x.local, mapa: x.mapa, fotos: x.fotos };
      }) },
    app: { selo: app.selo, titulo: app.titulo, destaque: app.destaque, texto: app.texto },
    loja: { selo: loja.selo, titulo: loja.titulo, destaque: loja.destaque, texto: loja.texto, whatsapp: String(loja.whatsapp ?? '').replace(/\D/g, ''),
      produtos: arr(loja.produtos).map((x) => ({ nome: x.nome, texto: x.texto, preco: x.preco, foto: x.foto })) },
    chamada: { titulo: ch.titulo, destaque: ch.destaque, texto: ch.texto, foto: ch.foto, formTitulo: ch.formTitulo, formAjuda: ch.formAjuda },
    parceiros: { selo: par.selo, titulo: par.titulo, destaque: par.destaque, texto: par.texto,
      lista: arr(par.lista).map((x) => ({ nome: x.nome, logo: x.logo, frase: x.frase, destaque: x.destaque, beneficio: x.beneficio, como: x.como,
        whatsapp: String(x.whatsapp ?? '').replace(/\D/g, ''), mensagem: x.mensagem, link: x.link })) },
    rodape: { texto: rod.texto, telefone: rod.telefone,
      facebook: rod.facebookUrl || (rod.facebook ? `https://www.facebook.com/${String(rod.facebook).replace(/^@/, '')}` : '') },
  };
  return out;
}

// Mesma limpeza da aba "Meu site" (js/site-gerenciar.js): só strings e listas de objetos de strings,
// limites do schema, fotos/links só com URL válida, vazios caem.
export function limparPeloSchema(secoes, schema) {
  const out = {};
  const limites = {};
  (schema?.secoes || []).forEach((sec) => sec.campos.forEach((c) => { limites[`${sec.id}.${c.c}`] = c; }));
  for (const [sid, sec] of Object.entries(secoes || {})) {
    if (!sec || typeof sec !== 'object' || !/^[a-z][a-z0-9]{0,30}$/i.test(sid)) continue;
    const o = {};
    for (const [c, v] of Object.entries(sec)) {
      const def = limites[`${sid}.${c}`];
      if (!def) continue; // campo que o template não tem (ex.: posicao, recursos, ocultar)
      if (Array.isArray(v)) {
        const itens = v.filter((x) => x && typeof x === 'object').slice(0, Math.min(MAX_ITENS, def.max || MAX_ITENS)).map((x) => {
          const it = {};
          for (const [k, val] of Object.entries(x)) {
            const dk = (def.item || []).find((d) => d.c === k);
            if (!dk || (typeof val !== 'string' && typeof val !== 'number')) continue;
            const t = s(val, dk.max || MAX_TEXTO);
            if (!t) continue;
            if (dk.t === 'foto' || dk.t === 'link') { if (urlOk(t)) it[k] = t; continue; }
            if (dk.t === 'select') { if ((dk.opcoes || []).some((op) => (Array.isArray(op) ? op[0] : op) === t)) it[k] = t; continue; }
            it[k] = t;
          }
          return it;
        }).filter((it) => Object.keys(it).length);
        if (itens.length) o[c] = itens;
      } else if (typeof v === 'string' || typeof v === 'number') {
        const t = s(v, def.max || MAX_TEXTO);
        if (t && ((def.t !== 'foto' && def.t !== 'link') || urlOk(t))) o[c] = t;
      }
    }
    if (Object.keys(o).length) out[sid] = o;
  }
  return out;
}

export const contarTextos = (secoes) => Object.values(secoes || {}).reduce((n, sec) => n + Object.values(sec).reduce((m, v) => m + (Array.isArray(v) ? v.length : 1), 0), 0);

// A migração (MIGRACOES em rotinas.js). importar: injetável nos testes.
export async function migrarSiteLiberdade(ctx, { importar = (id) => import(`./compartilhado/site-tpl-${id}.js`), agora = new Date() } = {}) {
  const id = ESCOLA_PADRAO;
  const antigo = await ctx.db.doc('siteConteudo/site').get();
  if (!antigo.exists) return 'sem siteConteudo/site';
  const atual = await ctx.db.doc(`siteConteudo/${id}`).get();
  if (atual.exists && atual.data().secoes && Object.keys(atual.data().secoes).length) return 'já tinha conteúdo (não sobrescrito)';
  const mod = await importar('ginga');
  const secoes = limparPeloSchema(converterSiteAntigo(antigo.data()), mod && mod.schema);
  const n = contarTextos(secoes);
  if (!n) return 'nada para migrar';
  const quando = agora.toISOString();
  await ctx.db.doc(`siteConteudo/${id}`).set({ template: 'ginga', secoes, anterior: {}, atualizadoEm: quando, atualizadoPor: 'servidor:migracao', versao: 1 });
  const esc = await ctx.db.doc(`escolas/${id}`).get();
  if (esc.exists && esc.data().template !== 'ginga') await ctx.db.doc(`escolas/${id}`).set({ template: 'ginga', modelo: 'ginga' }, { merge: true });
  return n;
}
