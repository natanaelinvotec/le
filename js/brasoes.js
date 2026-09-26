/* brasoes.js — catálogo e motor dos 45 brasões do Capoeira Liberdade e Expressão.

Regra de ouro: um brasão só é "ganho" quando o dado real que o sustenta existe.
Nada aqui inventa número. As fontes são:
- cordaoAtual / historicoGraduacoes / acessoGeral  → usuarios/{uid} (o mestre grava no painel)
- resumoPresencas                                   → presenças do Face ID/painel (coleção presencas)
- resumoRede                                        → posts do próprio atleta na Rede
- resumoFormacao                                    → alunos do núcleo que ele administra com graduação dada por ele
- brasoesManuais                                    → concedidos pelo responsável do núcleo/Admin/Fundador (brasoes.html)

Métrica de cada brasão:
  tipo 'cordao'      → cordaoAtual está no nível do brasão ou acima (graduação é cumulativa)
  tipo 'fundador'    → acessoGeral === true
  tipo 'presencas'   → resumoPresencas.total ≥ meta
  tipo 'sequencia'   → resumoPresencas.maiorSequencia (semanas seguidas, recorde) ≥ meta
  tipo 'nucleos'     → resumoPresencas.nucleosVisitados ≥ meta
  tipo 'graduacoes'  → historicoGraduacoes.length ≥ meta (troca de cordão registrada = batizado)
  tipo 'sedeFundador'→ treinou como visitante no núcleo do Fundador (config.nucleoFundadorId)
  tipo 'posts' | 'momentos' | 'curtidas' → resumoRede.{posts|momentos|curtidas} ≥ meta
  tipo 'formados'    → resumoFormacao.formados ≥ meta
  tipo 'responsavel' → academiaGerenciadaId preenchido
  tipo 'linhagem'    → treina no núcleo do Fundador (academiaId == nucleoFundadorId) ou é o Fundador
  tipo 'aniversario' → anos completos desde criadoEm ≥ meta
  tipo 'manual'      → só por concessão (brasoesManuais[id])
Os números das medalhas (1, 10, 50…) estão GRAVADOS na arte — por isso as metas
numéricas não são editáveis no painel; o que se edita é nome/descrição e ativo/inativo. */

export const ORDEM_CORDOES = ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre', 'Mestre/Presidente'];
export const PASTA = 'brasoes';
export const NIVEIS = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', platina: 'Platina' };

export const SERIES = {
cordoes: { nome: 'Cordões', sub: 'A escada de graduação, do Iniciante ao Fundador', icone: 'fa-ribbon', forma: 'hex' },
presencas: { nome: 'Presenças', sub: 'Check-ins reais registrados pelo Face ID ou pelo painel', icone: 'fa-location-dot', forma: 'medalha' },
sequencia: { nome: 'Sequência', sub: 'Semanas seguidas treinando (recorde)', icone: 'fa-fire', forma: 'medalha' },
nucleos: { nome: 'Núcleos visitados', sub: 'Treinou como visitante em outros núcleos', icone: 'fa-map', forma: 'medalha' },
eventos: { nome: 'Eventos e rodas', sub: 'Batizado automático; os demais o responsável concede', icone: 'fa-calendar-check', forma: 'hex' },
rede: { nome: 'Rede Liberdade', sub: 'Publicações, melhores momentos e curtidas recebidas', icone: 'fa-camera', forma: 'medalha' },
formacao: { nome: 'Formação', sub: 'Quem forma, quem lidera e a linhagem do Fundador', icone: 'fa-sitemap', forma: 'hex' },
destaques: { nome: 'Destaques na capoeira', sub: 'Concedidos pelo responsável quando o atleta mostra a evolução', icone: 'fa-star', forma: 'hex' },
};

const b = (n, slug, nome, serie, regra, extra = {}) => ({ id: slug, n, arquivo: `brasao-${String(n).padStart(2, '0')}-${slug}`, nome, serie, forma: SERIES[serie].forma, regra, nivel: null, glb: null, ...extra });

export const BRASOES = [
// ---- A · Cordões (hexagonal) ----
b(1, 'iniciante', 'Iniciante', 'cordoes', { tipo: 'cordao', meta: 'Iniciante' }, { glb: 'cordao-01-iniciante', como: 'Entrar no grupo e começar a treinar.', descricao: 'Broto verde nascendo: o começo da jornada.' }),
b(2, 'escravo', 'Escravo', 'cordoes', { tipo: 'cordao', meta: 'Escravo' }, { glb: 'cordao-02-escravo', como: 'Receber o cordão Escravo no batizado.', descricao: 'Corrente fechada: o cinza vem da corrente.' }),
b(3, 'fugitivo', 'Fugitivo', 'cordoes', { tipo: 'cordao', meta: 'Fugitivo' }, { glb: 'cordao-03-fugitivo', como: 'Receber o cordão Fugitivo.', descricao: 'Corrente rompida: rompeu as correntes e fugiu.' }),
b(4, 'quilombola', 'Quilombola', 'cordoes', { tipo: 'cordao', meta: 'Quilombola' }, { glb: 'cordao-04-quilombola', como: 'Receber o cordão Quilombola.', descricao: 'A mata: encontrou um novo lar e começou a aprender capoeira.' }),
b(5, 'vagante', 'Vagante', 'cordoes', { tipo: 'cordao', meta: 'Vagante' }, { glb: 'cordao-05-vagante', como: 'Receber o cordão Vagante.', descricao: 'Rosa-dos-ventos: saiu da mata em busca da liberdade.' }),
b(6, 'liberto', 'Liberto', 'cordoes', { tipo: 'cordao', meta: 'Liberto' }, { glb: 'cordao-06-liberto', como: 'Receber o cordão Liberto.', descricao: 'Gota vermelha e corrente caindo: derramou sangue pela liberdade.' }),
b(7, 'instrutor', 'Instrutor', 'cordoes', { tipo: 'cordao', meta: 'Instrutor' }, { glb: 'cordao-07-instrutor', como: 'Receber o cordão Instrutor.', descricao: 'Berimbau do aluno ao lado do berimbau do instrutor: começou a passar o conhecimento.' }),
b(8, 'professor', 'Professor', 'cordoes', { tipo: 'cordao', meta: 'Professor' }, { glb: 'cordao-08-professor', como: 'Receber o cordão Professor.', descricao: 'Pomba branca sobre branco e vermelho: sangue e paz.' }),
b(9, 'mestre', 'Mestre', 'cordoes', { tipo: 'cordao', meta: 'Mestre' }, { glb: 'cordao-09-mestre', como: 'Receber o cordão Mestre.', descricao: 'Dois berimbaus cruzados e louros: formou outro professor para continuar a jornada.' }),
b(10, 'mestre-fundador', 'Mestre / Presidente', 'cordoes', { tipo: 'fundador' }, { glb: 'cordao-10-mestre-fundador', como: 'Exclusivo do Fundador do grupo (Acesso Geral).', descricao: 'Cores da bandeira do grupo, louros e coroa.' }),
// ---- B · Presenças (medalha) ----
b(11, 'primeira-presenca', '1ª presença', 'presencas', { tipo: 'presencas', meta: 1 }, { nivel: 'bronze', como: 'Ter a primeira presença registrada pelo Face ID ou pelo painel.' }),
b(12, 'dez-presencas', '10 presenças', 'presencas', { tipo: 'presencas', meta: 10 }, { nivel: 'prata', como: 'Acumular 10 presenças registradas.' }),
b(13, 'cinquenta-presencas', '50 presenças', 'presencas', { tipo: 'presencas', meta: 50 }, { nivel: 'ouro', como: 'Acumular 50 presenças registradas.' }),
b(14, 'cem-presencas', '100 presenças', 'presencas', { tipo: 'presencas', meta: 100 }, { nivel: 'platina', como: 'Acumular 100 presenças registradas.' }),
b(15, 'duzentas-presencas', '200 presenças', 'presencas', { tipo: 'presencas', meta: 200 }, { nivel: 'platina', como: 'Acumular 200 presenças registradas.' }),
// ---- C · Sequência (medalha) ----
b(16, 'duas-semanas', '2 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 2 }, { nivel: 'bronze', como: 'Treinar em 2 semanas consecutivas.' }),
b(17, 'quatro-semanas', '4 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 4 }, { nivel: 'prata', como: 'Treinar em 4 semanas consecutivas.' }),
b(18, 'oito-semanas', '8 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 8 }, { nivel: 'ouro', como: 'Treinar em 8 semanas consecutivas.' }),
b(19, 'doze-semanas', '12 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 12 }, { nivel: 'platina', como: 'Treinar em 12 semanas consecutivas.' }),
b(20, 'vinte-semanas', '20 semanas seguidas', 'sequencia', { tipo: 'sequencia', meta: 20 }, { nivel: 'platina', como: 'Treinar em 20 semanas consecutivas.' }),
// ---- D · Núcleos visitados (medalha) ----
b(21, 'um-nucleo', '1 núcleo visitado', 'nucleos', { tipo: 'nucleos', meta: 1 }, { nivel: 'bronze', como: 'Treinar como visitante em 1 núcleo diferente do seu.' }),
b(22, 'dois-nucleos', '2 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 2 }, { nivel: 'prata', como: 'Treinar como visitante em 2 núcleos diferentes.' }),
b(23, 'tres-nucleos', '3 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 3 }, { nivel: 'ouro', como: 'Treinar como visitante em 3 núcleos diferentes.' }),
b(24, 'cinco-nucleos', '5 núcleos visitados', 'nucleos', { tipo: 'nucleos', meta: 5 }, { nivel: 'platina', como: 'Treinar como visitante em 5 núcleos diferentes.' }),
// ---- E · Eventos e rodas (hex) ----
b(25, 'batizado', 'Batizado', 'eventos', { tipo: 'graduacoes', meta: 1 }, { como: 'Ter uma troca de cordão registrada pelo mestre (batizado).' }),
b(26, 'roda-aberta', 'Presente em Roda Aberta', 'eventos', { tipo: 'manual' }, { como: 'Concedido pelo responsável do núcleo a quem participou de uma roda aberta.' }),
b(27, 'evento-do-grupo', 'Presente em evento do grupo', 'eventos', { tipo: 'manual' }, { como: 'Concedido pelo responsável do núcleo a quem esteve num evento oficial do grupo.' }),
b(28, 'sede-do-fundador', 'Visitou a sede do Fundador', 'eventos', { tipo: 'sedeFundador' }, { como: 'Treinar como visitante no núcleo do Fundador (presença registrada lá).' }),
// ---- F · Rede Liberdade (medalha) ----
b(29, 'primeira-publicacao', 'Primeira publicação', 'rede', { tipo: 'posts', meta: 1 }, { nivel: 'bronze', como: 'Publicar o primeiro post na Rede Liberdade.' }),
b(30, 'primeiro-melhor-momento', 'Primeiro melhor momento', 'rede', { tipo: 'momentos', meta: 1 }, { nivel: 'ouro', como: 'Marcar um post seu como melhor momento.' }),
b(31, 'dez-melhores-momentos', '10 melhores momentos', 'rede', { tipo: 'momentos', meta: 10 }, { nivel: 'platina', como: 'Ter 10 posts marcados como melhor momento.' }),
b(32, 'cem-curtidas', '100 curtidas recebidas', 'rede', { tipo: 'curtidas', meta: 100 }, { nivel: 'ouro', como: 'Somar 100 curtidas nos seus posts.' }),
b(33, 'contador-de-historias', 'Contador de histórias', 'rede', { tipo: 'posts', meta: 50 }, { nivel: 'platina', como: 'Publicar 50 posts na Rede Liberdade.' }),
// ---- G · Formação (hex) ----
b(34, 'formou-o-primeiro-aluno', 'Formou o primeiro aluno', 'formacao', { tipo: 'formados', meta: 1 }, { como: 'Registrar a primeira troca de cordão de um aluno do núcleo que você administra.' }),
b(35, 'responsavel-de-nucleo', 'Responsável de núcleo', 'formacao', { tipo: 'responsavel' }, { como: 'Ser o responsável cadastrado por um núcleo.' }),
b(36, 'linhagem-do-fundador', 'Direto Liberdade e Expressão', 'formacao', { tipo: 'linhagem' }, { como: 'Treinar diretamente no núcleo do Fundador (linhagem direta).' }),
// ---- H · Destaques (hex, manuais) ----
b(37, 'nota-boa-na-escola', 'Nota boa na escola', 'destaques', { tipo: 'manual' }, { como: 'O responsável concede quando a família mostra o boletim com boas notas.' }),
b(38, 'canta-muito', 'Canta muito', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem puxa e responde os cantos na roda com firmeza.' }),
b(39, 'ginga-muito', 'Ginga muito', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem mostra ginga fluida e malícia no jogo.' }),
b(40, 'primeiro-au-estrela-cadente', 'Primeiro aú · Estrela cadente', 'destaques', { tipo: 'manual' }, { como: 'Concedido no dia do primeiro aú completo.' }),
b(41, 'primeira-ponte', 'Primeira ponte', 'destaques', { tipo: 'manual' }, { como: 'Concedido no dia da primeira ponte.' }),
b(42, 'primeira-acrobacia', 'Primeira acrobacia', 'destaques', { tipo: 'manual' }, { como: 'Concedido na primeira acrobacia executada na roda.' }),
b(43, 'tocou-berimbau-na-roda', 'Tocou berimbau na roda', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem tocou berimbau numa roda de verdade.' }),
b(44, 'tocou-atabaque', 'Tocou atabaque', 'destaques', { tipo: 'manual' }, { como: 'Concedido a quem tocou atabaque numa roda de verdade.' }),
b(45, 'aniversario-de-capoeira', 'Aniversário de capoeira', 'destaques', { tipo: 'aniversario', meta: 1 }, { como: 'Completar 1 ano desde a entrada no grupo.' }),
];

export const porId = (id) => BRASOES.find((x) => x.id === id) || null;
export const urlThumb = (brasao) => `${PASTA}/thumb/${brasao.arquivo}.png`;
export const urlPng = (brasao) => `${PASTA}/png/${brasao.arquivo}.png`;
export const urlGlb = (brasao) => (brasao.glb ? `${PASTA}/glb/${brasao.glb}.glb` : null);
export const ehManual = (brasao) => brasao.regra.tipo === 'manual';

// Texto humano da métrica (usado no painel e no detalhe do brasão).
export function textoMetrica(brasao) {
const r = brasao.regra;
switch (r.tipo) {
case 'cordao': return `Cordão ${r.meta} ou acima`;
case 'fundador': return 'Acesso Geral (Fundador)';
case 'presencas': return `${r.meta} presença${r.meta > 1 ? 's' : ''} registrada${r.meta > 1 ? 's' : ''}`;
case 'sequencia': return `${r.meta} semanas seguidas (recorde)`;
case 'nucleos': return `${r.meta} núcleo${r.meta > 1 ? 's' : ''} visitado${r.meta > 1 ? 's' : ''}`;
case 'graduacoes': return 'Troca de cordão registrada';
case 'sedeFundador': return 'Presença como visitante no núcleo do Fundador';
case 'posts': return `${r.meta} publicaç${r.meta > 1 ? 'ões' : 'ão'} na Rede`;
case 'momentos': return `${r.meta} melhor${r.meta > 1 ? 'es' : ''} momento${r.meta > 1 ? 's' : ''}`;
case 'curtidas': return `${r.meta} curtidas recebidas`;
case 'formados': return 'Graduou um aluno do próprio núcleo';
case 'responsavel': return 'Responsável cadastrado por um núcleo';
case 'linhagem': return 'Treina no núcleo do Fundador';
case 'aniversario': return `${r.meta} ano${r.meta > 1 ? 's' : ''} no grupo`;
default: return 'Concessão do responsável do núcleo';
}
}

// Avalia todos os brasões para uma pessoa. `dados` só traz o que existe de verdade;
// campo ausente = brasão fica bloqueado (nunca "chuta").
export function avaliar(dados, config) {
dados = dados || {}; config = config || {};
const ativos = config.ativos || {};
const textos = config.textos || {};
const rp = dados.resumoPresencas || null;
const rr = dados.resumoRede || null;
const rf = dados.resumoFormacao || null;
const manuais = dados.brasoesManuais || {};
const idxCordao = ORDEM_CORDOES.indexOf(dados.cordaoAtual || 'Iniciante');
const anos = dados.criadoEm ? Math.floor((Date.now() - new Date(dados.criadoEm).getTime()) / (365.25 * 86400000)) : 0;
const nucleoFundador = config.nucleoFundadorId || null;
return BRASOES.map((br) => {
const r = br.regra; let ganho = false; let progresso = null;
const num = (atual, meta) => { progresso = { atual: Math.min(atual, meta), meta }; return atual >= meta; };
switch (r.tipo) {
case 'cordao': { const alvo = ORDEM_CORDOES.indexOf(r.meta); ganho = idxCordao >= alvo; break; }
case 'fundador': ganho = dados.fundador === true; break;
case 'presencas': ganho = rp ? num(rp.total || 0, r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'sequencia': ganho = rp ? num(Math.max(rp.maiorSequencia || 0, rp.semanasSeguidas || 0), r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'nucleos': ganho = rp ? num(rp.nucleosVisitados || 0, r.meta) : false; if (!rp) progresso = { atual: 0, meta: r.meta }; break;
case 'graduacoes': ganho = num((dados.historicoGraduacoes || []).length, r.meta); break;
case 'sedeFundador': ganho = !!(nucleoFundador && rp && Array.isArray(rp.nucleosVisitadosIds) && rp.nucleosVisitadosIds.includes(nucleoFundador)); break;
case 'posts': ganho = rr ? num(rr.posts || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'momentos': ganho = rr ? num(rr.momentos || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'curtidas': ganho = rr ? num(rr.curtidas || 0, r.meta) : false; if (!rr) progresso = { atual: 0, meta: r.meta }; break;
case 'formados': ganho = rf ? num(rf.formados || 0, r.meta) : false; break;
case 'responsavel': ganho = !!dados.academiaGerenciadaId; break;
case 'linhagem': ganho = dados.fundador === true || (!!nucleoFundador && dados.academiaId === nucleoFundador); break;
case 'aniversario': ganho = dados.criadoEm ? num(anos, r.meta) : false; break;
default: ganho = false;
}
const manual = manuais[br.id] || null;
if (manual) ganho = true;
// data real da conquista quando ela existe no cadastro (troca de cordão registrada pelo mestre)
let emReal = null;
if (r.tipo === 'cordao') { const h = (dados.historicoGraduacoes || []).find((x) => x.cordao === r.meta); if (h && h.em) emReal = h.em; }
if (r.tipo === 'graduacoes') { const h = (dados.historicoGraduacoes || [])[0]; if (h && h.em) emReal = h.em; }
const ativo = ativos[br.id] !== false;
const t = textos[br.id] || {};
const anterior = (dados.brasoes || {})[br.id] || null;
return {
...br, nome: t.nome || br.nome, como: t.como || br.como, descricao: t.descricao || br.descricao,
ativo, ganho: ativo && ganho, progresso, manual: !!manual,
em: manual ? manual.em : (anterior ? anterior.em : emReal), por: manual ? (manual.porNome || null) : null,
};
});
}

// Junta a avaliação com o que já estava gravado: mantém a data do primeiro
// desbloqueio e devolve os ids que acabaram de ser conquistados agora.
export function consolidar(avaliacao, anteriores) {
anteriores = anteriores || {}; const mapa = {}; const novos = [];
avaliacao.forEach((a) => {
if (!a.ganho) return;
const antes = anteriores[a.id];
mapa[a.id] = { em: (antes && antes.em) || a.em || new Date().toISOString(), ...(a.manual ? { manual: true, por: a.por || null } : {}) };
if (!antes) novos.push(a.id);
});
return { mapa, novos, total: Object.keys(mapa).length };
}

// Resumo de presenças honesto (mesma lógica em todo o app): total, no mês,
// sequência atual, recorde de sequência, núcleos visitados (ids) e última.
export function resumirPresencas(lista) {
const dataDe = (v) => (v && v.toDate ? v.toDate() : new Date(v));
const datas = (lista || []).map((p) => dataDe(p.entradaEm)).filter((d) => !isNaN(d)).sort((a, b) => b - a);
const visitados = new Set((lista || []).filter((p) => p.nucleoVisitadoId && p.nucleoVisitadoId !== p.nucleoId).map((p) => p.nucleoVisitadoId));
const semanaDe = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.getTime(); };
const semanas = Array.from(new Set(datas.map(semanaDe))).sort((a, b) => b - a);
const SEM = 7 * 86400000;
let atual = 0; const semanaHoje = semanaDe(new Date());
if (semanas.length && (semanas[0] === semanaHoje || semanas[0] === semanaHoje - SEM)) { atual = 1; for (let i = 1; i < semanas.length; i++) { if (semanas[i - 1] - semanas[i] === SEM) atual++; else break; } }
let recorde = semanas.length ? 1 : 0, corrida = 1;
for (let i = 1; i < semanas.length; i++) { if (semanas[i - 1] - semanas[i] === SEM) { corrida++; recorde = Math.max(recorde, corrida); } else corrida = 1; }
const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
return {
total: datas.length, noMes: datas.filter((d) => d >= inicioMes).length, semanasSeguidas: atual, maiorSequencia: recorde,
nucleosVisitados: visitados.size, nucleosVisitadosIds: Array.from(visitados), ultima: datas[0] ? datas[0].toISOString() : null, calculadoEm: new Date().toISOString(),
};
}
