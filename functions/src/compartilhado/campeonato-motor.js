/* campeonato-motor.js — regras puras dos campeonatos (sem Firebase, sem DOM).

Usado pelo navegador (campeonatos.html) e pelo servidor (functions/src/
compartilhado/, cópia feita pelo CI). Tudo aqui é determinístico e testável:

  gerarCategorias(config, inscritos)        → categorias + inscritos com categoriaId
  fundirCategorias(categorias, idA, idB)    → uma categoria só (nome composto)
  montarChave(atletas, { semente })         → chave de eliminação simples com byes
  registrarResultado(chave, lutaId, vencedorUid, placar) → chave avançada
  proximaLuta(chave) / lutasDaRodada(chave, i)
  podio(chave)                              → [ouro, prata, bronze, bronze]
  nomeRodada(indice, total)                 → "Final", "Semifinal", "Quartas"…

Modelo da chave: { formato:'simples', atletas:{uid:{nome,cordao,academiaId,...}},
rodadas:[ [luta, luta…], [luta…], [final] ], status:'pronta'|'andamento'|'encerrada' }
Luta: { id, a, b, vencedor, placar:[x,y]|null, bye:bool, ordem, aoVivo:bool }
'a'/'b' são uids (ou null enquanto a rodada anterior não terminou). */

export const SEXOS = [{ id: 'M', nome: 'Masculino' }, { id: 'F', nome: 'Feminino' }];

// Faixas de idade (opcionais): o organizador liga/desliga.
export const IDADES_PADRAO = [
  { id: 'infantil', nome: 'Infantil', min: 0, max: 11 },
  { id: 'juvenil', nome: 'Juvenil', min: 12, max: 17 },
  { id: 'adulto', nome: 'Adulto', min: 18, max: 39 },
  { id: 'master', nome: 'Master', min: 40, max: 200 },
];

// Faixas de peso em kg (o organizador edita). max = teto inclusivo; o último é aberto.
export const PESOS_PADRAO = [
  { id: 'pena', nome: 'Pena', max: 64 },
  { id: 'leve', nome: 'Leve', max: 73 },
  { id: 'medio', nome: 'Médio', max: 82 },
  { id: 'meio-pesado', nome: 'Meio-pesado', max: 91 },
  { id: 'pesado', nome: 'Pesado', max: null },
];

// Grupos de graduação: cordões vizinhos competem juntos.
export const GRUPOS_CORDAO_PADRAO = [
  { id: 'iniciantes', nome: 'Iniciante a Fugitivo', cordoes: ['Iniciante', 'Escravo', 'Fugitivo'] },
  { id: 'intermediarios', nome: 'Quilombola a Liberto', cordoes: ['Quilombola', 'Vagante', 'Liberto'] },
  { id: 'graduados', nome: 'Graduados', cordoes: ['Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'] },
];

export const CONFIG_PADRAO = { sexos: true, pesos: PESOS_PADRAO, gruposCordao: GRUPOS_CORDAO_PADRAO, idades: null, minimoPorCategoria: 3 };

const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function faixaDePeso(peso, faixas) {
  const p = Number(peso);
  if (!faixas || !faixas.length) return null;
  if (!(p > 0)) return null;
  for (const f of faixas) { if (f.max == null || p <= Number(f.max)) return f; }
  return faixas[faixas.length - 1];
}
export function grupoDeCordao(cordao, grupos) {
  if (!grupos || !grupos.length) return null;
  return grupos.find((g) => (g.cordoes || []).includes(cordao)) || grupos[0];
}
export function faixaDeIdade(idade, faixas) {
  if (!faixas || !faixas.length) return null;
  const i = Number(idade);
  if (!(i >= 0)) return null;
  return faixas.find((f) => i >= f.min && i <= f.max) || faixas[faixas.length - 1];
}

// Categoria = combinação dos eixos ligados. Devolve a lista de categorias com
// seus inscritos e cada inscrito com categoriaId. Inscritos sem dado para um
// eixo (sem peso, por exemplo) ficam em "pendentes" para o organizador completar.
export function gerarCategorias(config, inscritos) {
  const cfg = { ...CONFIG_PADRAO, ...(config || {}) };
  const mapa = new Map(); const pendentes = [];
  const comCategoria = (inscritos || []).map((ins) => {
    const g = grupoDeCordao(ins.cordao, cfg.gruposCordao);
    const p = cfg.pesos && cfg.pesos.length ? faixaDePeso(ins.peso, cfg.pesos) : null;
    const s = cfg.sexos ? (SEXOS.find((x) => x.id === ins.sexo) || null) : null;
    const i = cfg.idades && cfg.idades.length ? faixaDeIdade(ins.idade, cfg.idades) : null;
    const falta = (cfg.pesos && cfg.pesos.length && !p) || (cfg.sexos && !s) || (cfg.idades && cfg.idades.length && !i);
    if (falta) { pendentes.push(ins.uid); return { ...ins, categoriaId: null }; }
    const partes = [g && g.id, i && i.id, s && s.id, p && p.id].filter(Boolean);
    const id = partes.join('_') || 'unica';
    if (!mapa.has(id)) {
      const nome = [g && g.nome, i && i.nome, s && s.nome, p && (p.max == null ? `${p.nome} (acima de ${pesoAnterior(p, cfg.pesos)} kg)` : `${p.nome} (até ${p.max} kg)`)].filter(Boolean).join(' · ') || 'Categoria única';
      mapa.set(id, { id, nome, grupo: g ? g.id : null, idade: i ? i.id : null, sexo: s ? s.id : null, peso: p ? p.id : null, inscritos: [] });
    }
    mapa.get(id).inscritos.push(ins.uid);
    return { ...ins, categoriaId: id };
  });
  const categorias = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  categorias.forEach((c) => { c.poucos = c.inscritos.length < (cfg.minimoPorCategoria || 3); });
  return { categorias, inscritos: comCategoria, pendentes };
}
function pesoAnterior(p, faixas) { const i = faixas.indexOf(p); return i > 0 ? faixas[i - 1].max : 0; }

// Junta duas categorias (a pequena na vizinha). O nome vira "A + B".
export function fundirCategorias(categorias, inscritos, idA, idB) {
  const a = categorias.find((c) => c.id === idA); const b = categorias.find((c) => c.id === idB);
  if (!a || !b || a === b) return { categorias, inscritos };
  const novo = { ...a, id: `${a.id}+${b.id}`, nome: `${a.nome} + ${b.nome}`, inscritos: a.inscritos.concat(b.inscritos), fundida: true };
  novo.poucos = false;
  const resto = categorias.filter((c) => c !== a && c !== b).concat([novo]).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  const ins = inscritos.map((i) => (i.categoriaId === idA || i.categoriaId === idB ? { ...i, categoriaId: novo.id } : i));
  return { categorias: resto, inscritos: ins };
}

// Gerador determinístico (mulberry32) para o sorteio ser reproduzível.
function rng(semente) {
  let t = (Number(semente) || 1) >>> 0;
  return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
const potencia2 = (n) => { let p = 1; while (p < n) p *= 2; return p; };

// Ordem de sorteio que separa atletas do mesmo núcleo: embaralha, depois
// distribui por núcleo em "rodízio" para que iguais caiam em metades opostas.
export function ordemSorteio(atletas, semente = 1) {
  const r = rng(semente);
  const lista = atletas.slice();
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  const porNucleo = new Map();
  lista.forEach((a) => { const k = a.academiaId || '—'; if (!porNucleo.has(k)) porNucleo.set(k, []); porNucleo.get(k).push(a); });
  const filas = Array.from(porNucleo.values()).sort((x, y) => y.length - x.length);
  const saida = [];
  while (saida.length < lista.length) { for (const f of filas) { if (f.length) saida.push(f.shift()); } }
  return saida;
}

// Ordem "espalhada" dos lugares da chave (permutação por bits invertidos):
// quem entra em sequência cai em metades/quartos opostos. Assim atletas do
// mesmo núcleo (que vêm em rodízio) só se encontram nas rodadas finais, e os
// byes (que ficam no fim da fila) nunca caem dois na mesma luta.
function ordemEspalhada(tam) {
  const bits = Math.log2(tam);
  return Array.from({ length: tam }, (_, i) => { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); return r; });
}

export function montarChave(atletas, { semente = 1, formato = 'simples' } = {}) {
  const lista = (atletas || []).filter((a) => a && a.uid);
  const mapa = {}; lista.forEach((a) => { mapa[a.uid] = { nome: a.nome || 'Atleta', apelido: a.apelido || '', cordao: a.cordao || '', academiaId: a.academiaId || null, academiaNome: a.academiaNome || '', fotoUrl: a.fotoUrl || '', idade: a.idade ?? null, peso: a.peso ?? null }; });
  const n = lista.length;
  if (n === 0) return { formato, atletas: mapa, rodadas: [], status: 'vazia', criadaEm: new Date().toISOString() };
  if (n === 1) {
    return { formato, atletas: mapa, rodadas: [[{ id: 'r1l1', a: lista[0].uid, b: null, vencedor: lista[0].uid, placar: null, bye: true, ordem: 1, aoVivo: false }]], status: 'encerrada', podio: [lista[0].uid, null, null, null], criadaEm: new Date().toISOString() };
  }
  const tam = potencia2(n);
  const ordem = ordemSorteio(lista, semente);
  const slots = new Array(tam).fill(null);
  ordemEspalhada(tam).forEach((slot, i) => { slots[slot] = i < n ? ordem[i].uid : null; });
  const rodadas = []; let r1 = [];
  for (let i = 0; i < tam; i += 2) {
    const a = slots[i]; const b = slots[i + 1];
    const bye = !a || !b;
    r1.push({ id: `r1l${i / 2 + 1}`, a, b, vencedor: bye ? (a || b) : null, placar: null, bye, ordem: i / 2 + 1, aoVivo: false });
  }
  rodadas.push(r1);
  let anterior = r1; let r = 2;
  while (anterior.length > 1) {
    const atual = [];
    for (let i = 0; i < anterior.length; i += 2) {
      atual.push({ id: `r${r}l${i / 2 + 1}`, a: anterior[i].vencedor && anterior[i].bye ? anterior[i].vencedor : null, b: anterior[i + 1].vencedor && anterior[i + 1].bye ? anterior[i + 1].vencedor : null, vencedor: null, placar: null, bye: false, ordem: i / 2 + 1, aoVivo: false });
    }
    rodadas.push(atual); anterior = atual; r++;
  }
  // Byes na 1ª rodada já "sobem": propaga para a 2ª.
  propagar(rodadas);
  return { formato, atletas: mapa, rodadas, status: 'pronta', semente, criadaEm: new Date().toISOString() };
}

// Leva vencedores para a rodada seguinte (quem venceu a luta i vai para a luta
// floor(i/2) da próxima, lado a se i par, lado b se ímpar).
function propagar(rodadas) {
  for (let r = 0; r < rodadas.length - 1; r++) {
    rodadas[r].forEach((l, i) => {
      const prox = rodadas[r + 1][Math.floor(i / 2)];
      if (!prox) return;
      const lado = i % 2 === 0 ? 'a' : 'b';
      if (l.vencedor) prox[lado] = l.vencedor;
      else if (prox[lado] && !prox.vencedor) {
        // resultado desfeito: limpa o que dependia dele
        const dependia = [l.a, l.b].filter(Boolean);
        if (dependia.includes(prox[lado])) prox[lado] = null;
      }
    });
  }
}

export function lutaPorId(chave, lutaId) {
  for (let r = 0; r < chave.rodadas.length; r++) { const l = chave.rodadas[r].find((x) => x.id === lutaId); if (l) return { luta: l, rodada: r }; }
  return null;
}

// Grava o resultado e avança. vencedorUid null desfaz. placar = [pontosA, pontosB] ou null.
export function registrarResultado(chave, lutaId, vencedorUid, placar = null) {
  const c = clonar(chave);
  const achado = lutaPorId(c, lutaId); if (!achado) throw new Error('Luta não encontrada');
  const { luta, rodada } = achado;
  if (luta.bye) throw new Error('Luta com bye não tem resultado');
  if (vencedorUid && vencedorUid !== luta.a && vencedorUid !== luta.b) throw new Error('Vencedor não está nesta luta');
  if (vencedorUid && (!luta.a || !luta.b)) throw new Error('A luta ainda não tem os dois atletas');
  // Desfazer: só se a próxima luta deste vencedor ainda não aconteceu.
  if (!vencedorUid && luta.vencedor) {
    const prox = c.rodadas[rodada + 1] && c.rodadas[rodada + 1][Math.floor(c.rodadas[rodada].indexOf(luta) / 2)];
    if (prox && prox.vencedor) throw new Error('A luta seguinte já tem resultado; desfaça ela primeiro');
  }
  luta.vencedor = vencedorUid || null; luta.placar = vencedorUid && Array.isArray(placar) ? placar.slice(0, 2).map((x) => Math.max(0, Number(x) || 0)) : null;
  luta.aoVivo = false; luta.encerradaEm = vencedorUid ? new Date().toISOString() : null;
  propagar(c.rodadas);
  const final = c.rodadas[c.rodadas.length - 1][0];
  c.status = final.vencedor ? 'encerrada' : (c.rodadas.flat().some((l) => l.vencedor && !l.bye) ? 'andamento' : 'pronta');
  c.podio = final.vencedor ? podio(c) : null;
  return c;
}

export function marcarAoVivo(chave, lutaId) {
  const c = clonar(chave);
  c.rodadas.flat().forEach((l) => { l.aoVivo = l.id === lutaId && !l.vencedor; });
  if (c.status === 'pronta' && lutaId) c.status = 'andamento';
  return c;
}

// Próxima luta a acontecer: a primeira sem vencedor com os dois atletas, em ordem de rodada.
export function proximaLuta(chave) {
  const viva = chave.rodadas.flat().find((l) => l.aoVivo && !l.vencedor);
  if (viva) return viva;
  for (const r of chave.rodadas) { const l = r.find((x) => !x.vencedor && x.a && x.b); if (l) return l; }
  return null;
}

export function podio(chave) {
  const rod = chave.rodadas; if (!rod.length) return null;
  const final = rod[rod.length - 1][0];
  if (!final.vencedor) return null;
  const ouro = final.vencedor; const prata = final.a === ouro ? final.b : final.a;
  const semi = rod.length > 1 ? rod[rod.length - 2] : [];
  const bronzes = semi.map((l) => (l.vencedor && l.a && l.b ? (l.a === l.vencedor ? l.b : l.a) : null));
  return [ouro, prata || null, bronzes[0] || null, bronzes[1] || null];
}

export function nomeRodada(indice, total) {
  const faltam = total - indice; // 1 = final
  if (faltam === 1) return 'Final';
  if (faltam === 2) return 'Semifinal';
  if (faltam === 3) return 'Quartas de final';
  if (faltam === 4) return 'Oitavas de final';
  return `${indice + 1}ª rodada`;
}

export function resumoChave(chave) {
  const lutas = chave.rodadas.flat().filter((l) => !l.bye);
  const feitas = lutas.filter((l) => l.vencedor).length;
  return { lutas: lutas.length, feitas, faltam: lutas.length - feitas, atletas: Object.keys(chave.atletas || {}).length, rodadas: chave.rodadas.length };
}

const clonar = (o) => JSON.parse(JSON.stringify(o));

// O Firestore não aceita array dentro de array: as rodadas vão como
// [{ lutas: [...] }] e voltam como [[...]] ao ler.
export const empacotar = (ch) => ({ ...ch, rodadas: (ch.rodadas || []).map((r) => ({ lutas: r })) });
export const desempacotar = (d) => ({ ...d, rodadas: (d && d.rodadas ? d.rodadas : []).map((r) => (Array.isArray(r) ? r : (r && r.lutas) || [])) });

// Dados de demonstração (apresentações): 32 atletas fictícios distribuídos
// entre os núcleos informados. Sexo, grupo de cordão e faixa de peso giram em
// rodízio para que, com 2 faixas de peso e 2 grupos, saiam 8 categorias de 4.
export function atletasDemo(nucleos, semente = 7, total = 32) {
  const nomesM = ['Rafael', 'Lucas', 'Gabriel', 'Mateus', 'João', 'Pedro', 'Caio', 'Thiago', 'Bruno', 'Felipe', 'Diego', 'André', 'Vitor', 'Henrique', 'Igor', 'Samuel'];
  const nomesF = ['Ana', 'Beatriz', 'Camila', 'Larissa', 'Mariana', 'Juliana', 'Letícia', 'Bruna', 'Carla', 'Fernanda', 'Isabela', 'Paula', 'Natália', 'Raquel', 'Sofia', 'Tainá'];
  const sobren = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Ramos', 'Almeida', 'Lima', 'Araújo', 'Rocha', 'Barbosa', 'Nunes', 'Moreira', 'Cardoso', 'Teixeira'];
  const apelidos = ['Pimenta', 'Furacão', 'Gato', 'Faísca', 'Boneco', 'Ventania', 'Cabeça', 'Mola', 'Formiga', 'Trovão', 'Sereia', 'Onça', 'Bambu', 'Marreta', 'Flecha', 'Lua', 'Canela', 'Coruja', 'Peixe', 'Cigarra', 'Raio', 'Gaivota', 'Pantera', 'Brisa', 'Tubarão', 'Jiboia', 'Paçoca', 'Sabiá', 'Girassol', 'Tempestade', 'Carvão', 'Estrela'];
  const grupos = [['Escravo', 'Fugitivo', 'Fugitivo', 'Escravo'], ['Quilombola', 'Vagante', 'Liberto', 'Quilombola']];
  const r = rng(semente); const ns = nucleos && nucleos.length ? nucleos : [{ id: 'demo', nome: 'Núcleo Demonstração' }];
  const lista = [];
  for (let i = 0; i < total; i++) {
    const fem = i % 2 === 1; const grupo = (i >> 1) % 2; const pesado = (i >> 2) % 2 === 1;
    const nomes = fem ? nomesF : nomesM; const n = ns[i % ns.length];
    lista.push({
      uid: `demo_${String(i + 1).padStart(2, '0')}`, demo: true,
      nome: `${nomes[(i >> 1) % nomes.length]} ${sobren[Math.floor(r() * sobren.length)]}`, apelido: apelidos[i % apelidos.length],
      cordao: grupos[grupo][(i >> 3) % 4], sexo: fem ? 'F' : 'M',
      peso: pesado ? 76 + Math.round(r() * 19) : 58 + Math.round(r() * 17), idade: 16 + Math.floor(r() * 30),
      academiaId: n.id, academiaNome: n.nome, fotoUrl: '',
    });
  }
  return lista;
}
