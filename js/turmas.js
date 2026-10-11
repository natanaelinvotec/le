/* turmas.js — turmas por arte marcial dentro do MESMO núcleo (v37, 11/10/2026).

A ideia: um professor dá aula de várias artes (jiu-jitsu, boxe, taekwondo…). O
NÚCLEO continua sendo a casa (Rede, avisos, materiais, identidade, Painel do
Fundador). A TURMA é a unidade de gestão: alunos, presenças, graduação (a escada
da arte), mensalidade, relatórios, brasões da arte — nada se mistura entre turmas.

Banco: coleção `turmas/{id}`:
  { escolaId, academiaId (núcleo), nome, arte (chave de MODALIDADES), cor (#hex),
    graduacao: 'faixas'|'cordoes'|'niveis', escada (escadaPadrao(arte) limpa),
    professorUid, professorNome, mensalidade (número, R$), dias: ['seg','qua'], hora: '19:30',
    ativa: true, padrao: false, criadoEm, criadoPor }
Aluno: usuarios/{uid}.turmaId (string). SEM turmaId = turma PADRÃO do núcleo (a
que já existia). Assim a Liberdade e qualquer escola antiga migram sem mexer em
um aluno sequer: a turma padrão é virtual até alguém criar a primeira turma extra.

Turma ativa no painel: guardada por núcleo em localStorage ('le.turma.<academiaId>').
'' (vazio) = turma padrão. Trocar a turma ativa troca a escada em uso
(aplicarEscadaDaTurma) e TODO o painel filtra por ela (filtrarPorTurma). */
import { db, collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, minhaEscolaId } from './firebase.js';
import { MODALIDADES, escadaPadrao, escadaLimpa } from './modalidades.js';
import { ESCOLA, aplicarEscadaDaTurma, escadaDaEscola, ESCADA_CAPOEIRA } from './escola.js';

// Cores fixas de turma (contrastam entre si também para daltônicos: azul/laranja antes de verde/vermelho).
export const PALETA_TURMAS = [
  { id: 'azul', hex: '#2F6FED', nome: 'Azul' }, { id: 'vermelho', hex: '#E5484D', nome: 'Vermelho' },
  { id: 'roxo', hex: '#8E44AD', nome: 'Roxo' }, { id: 'ambar', hex: '#D98E04', nome: 'Âmbar' },
  { id: 'verde', hex: '#0E9F6E', nome: 'Verde' }, { id: 'petroleo', hex: '#0F7490', nome: 'Azul-petróleo' },
  { id: 'rosa', hex: '#C2185B', nome: 'Rosa' }, { id: 'grafite', hex: '#4B5A6B', nome: 'Grafite' },
];
export const COR_PADRAO = '#389E92'; // turma padrão (sem turmaId) usa a cor da escola
const HEX = /^#[0-9a-f]{6}$/i;
export const corOk = (c, padrao = COR_PADRAO) => (HEX.test(String(c || '')) ? String(c) : padrao);

// Sistemas de graduação (v38). `peca` é a palavra usada em todas as telas da turma
// ("Trocar corda", "Corda Instrutor", "Prajied vermelho"…).
export const SISTEMAS = {
  faixas: { rotulo: 'Faixas', peca: 'faixa' },
  cordoes: { rotulo: 'Cordões', peca: 'cordão' },
  cordas: { rotulo: 'Cordas', peca: 'corda' },
  prajied: { rotulo: 'Prajied', peca: 'prajied' },
  niveis: { rotulo: 'Níveis / sem graduação', peca: 'nível' },
};
// Quais sistemas cada arte usa de verdade (o 1º é o padrão). Capoeira: cada grupo chama de um jeito —
// "cordões" (ex.: Capitães da Areia) ou "cordas" (capoeira contemporânea); a escada é a mesma.
export const SISTEMAS_DA_ARTE = {
  capoeira: ['cordoes', 'cordas'],
  jiujitsu: ['faixas'], judo: ['faixas'], karate: ['faixas'], taekwondo: ['faixas'],
  muaythai: ['prajied', 'niveis'], kickboxing: ['faixas', 'niveis'], kungfu: ['faixas', 'niveis'],
  kravmaga: ['niveis', 'faixas'], mma: ['niveis', 'faixas'], boxe: ['niveis'], wrestling: ['niveis'],
  outra: ['faixas', 'cordoes', 'cordas', 'prajied', 'niveis'],
};
export const sistemasDaArte = (arte) => SISTEMAS_DA_ARTE[arte] || SISTEMAS_DA_ARTE.outra;
export const graduacaoDaArte = (arte) => sistemasDaArte(arte)[0];
export const pecaDoSistema = (sistema, arte) => (SISTEMAS[sistema] ? SISTEMAS[sistema].peca : ((MODALIDADES[arte] || MODALIDADES.outra).peca || 'graduação'));
// Dica embaixo do sistema de graduação, na linguagem de cada arte.
export function dicaGraduacao(arte) {
  const m = MODALIDADES[arte] || MODALIDADES.outra;
  if (arte === 'capoeira') return 'Escolha como o seu grupo chama: Cordões (ex.: Capitães da Areia) ou Cordas (capoeira contemporânea). A escada de capoeira já vem preenchida; você ajusta em Graduação.';
  if (['boxe', 'mma', 'wrestling'].includes(arte)) return `${m.nome} não usa faixa: os alunos sobem por níveis (Iniciante → Competidor). Se a sua academia usa faixas, escolha Faixas e monte a escada em Graduação.`;
  if (arte === 'muaythai') return 'Prajied: a braçadeira do muay thai, na ordem da Confederação Brasileira (branca → vermelha → azul → preta). Você ajusta em Graduação.';
  if (arte === 'kravmaga') return 'Krav Maga: níveis P1–P5, G1–G5, E1–E5 (IKMF). Se a sua linha usa faixas, escolha Faixas.';
  if (arte === 'outra') return 'Escolha o sistema e monte a escada depois em Graduação.';
  return `A escada oficial de ${m.nome.toLowerCase()} já vem preenchida${m.adulto && m.adulto.some((g) => Number(g.graus) > 0) ? ', com os graus de cada faixa' : ''}; você pode ajustar em Graduação.`;
}
// Artes em ordem alfabética, "Outra" no fim.
export const ARTES = Object.entries(MODALIDADES).map(([id, m]) => ({ id, nome: m.nome, peca: m.peca, lider: m.lider }))
  .sort((a, b) => (a.id === 'outra') - (b.id === 'outra') || a.nome.localeCompare(b.nome, 'pt-BR'));

// ---------- turma padrão (virtual) ----------
// A turma "padrão" representa o núcleo como ele sempre foi: usa a escada da escola.
export function turmaPadrao(academia) {
  const arte = (ESCOLA && ESCOLA.modalidade) || 'capoeira';
  const m = MODALIDADES[arte] || MODALIDADES.outra;
  return {
    id: '', padrao: true, nome: m.nome, arte, cor: corOk(ESCOLA && ESCOLA.cores && ESCOLA.cores.teal, COR_PADRAO),
    graduacao: graduacaoDaArte(arte), escada: null, academiaId: (academia && academia.id) || null, ativa: true,
    mensalidade: academia && Number(academia.mensalidade) > 0 ? Number(academia.mensalidade) : null,
  };
}

// ---------- leitura ----------
const cache = new Map(); // academiaId -> turmas (sem a padrão)
export async function carregarTurmas(academiaId, { forcar = false } = {}) {
  if (!academiaId) return [];
  if (!forcar && cache.has(academiaId)) return cache.get(academiaId);
  const e = await minhaEscolaId().catch(() => null);
  const filtros = [where('academiaId', '==', academiaId)];
  if (e) filtros.unshift(where('escolaId', '==', e));
  let lista = [];
  try {
    const s = await getDocs(query(collection(db, 'turmas'), ...filtros));
    lista = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.ativa !== false).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
  } catch (err) { console.warn('turmas', err); lista = []; }
  cache.set(academiaId, lista);
  return lista;
}
// Turmas públicas de uma escola (inscrição sem login: a regra deixa ler `turmas`).
export async function turmasPublicas(escolaId) {
  try {
    const s = await getDocs(query(collection(db, 'turmas'), where('escolaId', '==', escolaId)));
    return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.ativa !== false);
  } catch (e) { return []; }
}
export async function buscarTurma(id) {
  if (!id) return null;
  try { const s = await getDoc(doc(db, 'turmas', id)); return s.exists() ? { id: s.id, ...s.data() } : null; } catch (e) { return null; }
}
export const limparCacheTurmas = (academiaId) => { if (academiaId) cache.delete(academiaId); else cache.clear(); };

// ---------- escrita ----------
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
export const NOME_DIA = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
// Horários da turma: [{ dias: ['seg','qua'], hora: '19:30' }, { dias: ['sex'], hora: '18:00' }].
// Turmas antigas (só dias + hora) viram uma linha. Linhas vazias somem.
export const MAX_HORARIOS = 8;
export function horariosDe(t) {
  const lista = t && Array.isArray(t.horarios) && t.horarios.length ? t.horarios : (t && ((Array.isArray(t.dias) && t.dias.length) || t.hora) ? [{ dias: t.dias || [], hora: t.hora || '' }] : []);
  return lista.map((h) => ({ dias: Array.isArray(h && h.dias) ? h.dias.filter((x) => typeof x === 'string') : [], hora: String((h && h.hora) || '') }))
    .filter((h) => h.dias.length || h.hora);
}
export function validarTurma(d) {
  const erros = [];
  if (!d.nome || String(d.nome).trim().length < 2) erros.push('Dê um nome à turma (ex.: "Boxe · Adultos").');
  if (!MODALIDADES[d.arte]) erros.push('Escolha a arte marcial.');
  if (!HEX.test(String(d.cor || ''))) erros.push('Escolha a cor da turma.');
  if (d.mensalidade != null && (!Number.isFinite(Number(d.mensalidade)) || Number(d.mensalidade) < 0)) erros.push('Mensalidade inválida.');
  if (d.graduacao && !SISTEMAS[d.graduacao]) erros.push('Sistema de graduação inválido.');
  const horarios = horariosDe(d);
  if (horarios.length > MAX_HORARIOS) erros.push(`No máximo ${MAX_HORARIOS} horários por turma.`);
  horarios.forEach((h, i) => {
    if (h.hora && !/^\d{2}:\d{2}$/.test(String(h.hora))) erros.push(`Horário ${i + 1}: use o formato 19:30.`);
    if (h.dias.some((x) => !DIAS.includes(x))) erros.push(`Horário ${i + 1}: dia da semana inválido.`);
    if (h.hora && !h.dias.length) erros.push(`Horário ${i + 1}: marque pelo menos um dia.`);
  });
  return erros;
}
export async function criarTurma(academia, dados, sessao) {
  const erros = validarTurma(dados);
  if (erros.length) throw new Error(erros.join(' '));
  const e = await minhaEscolaId();
  if (!e) throw new Error('Sua conta ainda está sendo preparada. Tente de novo em alguns segundos.');
  const arte = dados.arte;
  const sistema = SISTEMAS[dados.graduacao] ? dados.graduacao : graduacaoDaArte(arte);
  // Capoeira: a escada de cordões da escola nº 1 (escadaPadrao('capoeira') é genérica).
  const escada = escadaLimpa(arte === 'capoeira' ? ESCADA_CAPOEIRA : escadaPadrao(arte));
  if (escada) escada.peca = pecaDoSistema(sistema, arte);
  const horarios = horariosDe(dados).map((h) => ({ dias: h.dias.filter((x) => DIAS.includes(x)), hora: h.hora })).slice(0, MAX_HORARIOS);
  const turma = {
    escolaId: e, academiaId: academia.id, nome: String(dados.nome).trim().slice(0, 60), arte, cor: dados.cor,
    graduacao: sistema, escada,
    professorUid: dados.professorUid || (sessao && sessao.uid) || null, professorNome: dados.professorNome || (sessao && sessao.nome) || '',
    mensalidade: dados.mensalidade != null && dados.mensalidade !== '' ? Number(dados.mensalidade) : null,
    horarios, dias: horarios[0] ? horarios[0].dias : [], hora: horarios[0] ? horarios[0].hora : '', // dias/hora: compatibilidade
    ativa: true, padrao: false, criadoEm: new Date().toISOString(), criadoPor: (sessao && sessao.uid) || null,
  };
  const ref = await addDoc(collection(db, 'turmas'), turma);
  cache.delete(academia.id);
  return { id: ref.id, ...turma };
}
export async function atualizarTurma(id, academiaId, dados) {
  const permitidos = ['nome', 'cor', 'professorUid', 'professorNome', 'mensalidade', 'dias', 'hora', 'horarios', 'graduacao', 'ativa', 'escada'];
  const limpo = {};
  permitidos.forEach((k) => { if (dados[k] !== undefined) limpo[k] = dados[k]; });
  if (limpo.horarios !== undefined) {
    const h = horariosDe({ horarios: limpo.horarios }).slice(0, MAX_HORARIOS);
    limpo.horarios = h; limpo.dias = h[0] ? h[0].dias : []; limpo.hora = h[0] ? h[0].hora : '';
  }
  if (limpo.mensalidade !== undefined && limpo.mensalidade !== null) limpo.mensalidade = Number(limpo.mensalidade);
  limpo.atualizadoEm = new Date().toISOString();
  await updateDoc(doc(db, 'turmas', id), limpo);
  cache.delete(academiaId);
}

// ---------- turma ativa (por núcleo, neste aparelho) ----------
const CHAVE = (academiaId) => `le.turma.${academiaId || 'geral'}`;
export function turmaAtivaId(academiaId) { try { return localStorage.getItem(CHAVE(academiaId)) || ''; } catch (e) { return ''; } }
export function definirTurmaAtiva(academiaId, turmaId) { try { if (turmaId) localStorage.setItem(CHAVE(academiaId), turmaId); else localStorage.removeItem(CHAVE(academiaId)); } catch (e) { /* ok */ } }

// A turma de um aluno dentro da lista (SEM turmaId = padrão).
export const turmaIdDe = (u) => (u && typeof u.turmaId === 'string' && u.turmaId ? u.turmaId : '');
export function turmaDe(u, turmas, academia) {
  const id = turmaIdDe(u);
  return (id && (turmas || []).find((t) => t.id === id)) || turmaPadrao(academia);
}
// Filtra uma lista de usuários pela turma ativa ('' = padrão = quem não tem turmaId ou cujo turmaId não existe mais).
export function filtrarPorTurma(lista, turmaId, turmas = []) {
  const existentes = new Set((turmas || []).map((t) => t.id));
  return (lista || []).filter((u) => {
    const id = turmaIdDe(u);
    const efetivo = id && existentes.has(id) ? id : '';
    return efetivo === (turmaId || '');
  });
}
export function contarPorTurma(lista, turmas = []) {
  const n = { '': 0 };
  (turmas || []).forEach((t) => { n[t.id] = 0; });
  const existentes = new Set((turmas || []).map((t) => t.id));
  (lista || []).forEach((u) => { const id = turmaIdDe(u); const k = id && existentes.has(id) ? id : ''; n[k] = (n[k] || 0) + 1; });
  return n;
}

// Escada de graduação em uso no painel = a da turma ativa (padrão → a da escola).
export function usarEscadaDa(turma) {
  if (!turma || turma.padrao || !turma.escada) aplicarEscadaDaTurma(null);
  else aplicarEscadaDaTurma(turma.escada);
}
export { escadaDaEscola };

// Rótulos
export const rotuloTurma = (t) => (t ? `${t.nome}${t.padrao ? '' : ''}` : 'Turma');
// "Seg · Qua 19:30  |  Sex 18:00"
export const descricaoHorario = (t) => horariosDe(t).map((h) => [h.dias.map((d) => NOME_DIA[d] || d).join(' · '), h.hora].filter(Boolean).join(' ')).join('  |  ');
export const nomeArte = (arte) => ((MODALIDADES[arte] || MODALIDADES.outra).nome);

// ---------- UI: bloco "Turma ativa" da barra lateral (admin.html) ----------
const X = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function seletorTurmaHTML({ turmas, ativaId, contagem = {}, academia, podeCriar = true }) {
  const padrao = turmaPadrao(academia);
  const todas = [padrao, ...(turmas || [])];
  const ativa = todas.find((t) => (t.id || '') === (ativaId || '')) || padrao;
  const item = (t) => `<button type="button" class="turma-item${(t.id || '') === (ativa.id || '') ? ' ativa' : ''}" data-turma="${X(t.id || '')}" title="${X(t.nome)}${t.padrao ? ' (turma do núcleo)' : ''}">
    <span class="turma-cor" style="background:${X(corOk(t.cor))}"></span><span class="turma-nome">${X(t.nome)}</span><span class="turma-qtd">${Number(contagem[t.id || ''] || 0)}</span></button>`;
  return `<div class="turma-bloco" id="turmaBloco" data-sem-trocas>
    <span class="nav-grupo">Turma ativa</span>
    <button type="button" class="turma-atual" id="turmaAtualBtn" aria-expanded="false" aria-controls="turmaLista" style="border-color:${X(corOk(ativa.cor))}">
      <span class="turma-cor" style="background:${X(corOk(ativa.cor))}"></span>
      <span class="turma-txt"><b>${X(ativa.nome)}</b><small>${X(nomeArte(ativa.arte))}${ativa.padrao ? ' · turma do núcleo' : ''} · ${Number(contagem[ativa.id || ''] || 0)} aluno${Number(contagem[ativa.id || ''] || 0) === 1 ? '' : 's'}</small></span>
      <i class="fas fa-chevron-down" aria-hidden="true"></i>
    </button>
    <div class="turma-lista" id="turmaLista" hidden>${todas.map(item).join('')}</div>
    ${podeCriar ? '<button type="button" class="turma-nova" id="turmaNovaBtn"><i class="fas fa-plus" aria-hidden="true"></i> Nova turma</button>' : ''}
  </div>`;
}

// Formulário "Nova turma" (conteúdo de um modal). O chamador liga os botões e lê lerFormTurma().
// data-sem-trocas: a identidade da escola (escola-atual.js) troca "capoeira"/"cordão" pelos termos da
// arte da ESCOLA em todo texto da página — aqui não, senão "Capoeira" vira "Jiu-jitsu" no seletor.
const radiosGraduacao = (arte, marcado) => {
  const lista = sistemasDaArte(arte);
  const escolhido = lista.includes(marcado) ? marcado : lista[0];
  return lista.map((id) => `<label><input type="radio" name="turmaGrad" value="${id}" ${id === escolhido ? 'checked' : ''}> ${X(SISTEMAS[id].rotulo)}</label>`).join('');
};
const linhaHorario = (n, h = { dias: [], hora: '' }) => `<div class="turma-horario" data-linha="${n}" role="group" aria-label="Horário ${n + 1}">
    <div class="turma-dias">${DIAS.map((d) => `<label class="turma-dia"><input type="checkbox" name="turmaDia-${n}" value="${d}" ${h.dias.includes(d) ? 'checked' : ''}><span>${NOME_DIA[d]}</span></label>`).join('')}</div>
    <label class="turma-hora">às <input type="time" class="turma-hora-input" aria-label="Horário ${n + 1}" value="${X(h.hora)}"></label>
    <button type="button" class="turma-rem-horario" aria-label="Remover o horário ${n + 1}" title="Remover este horário"><i class="fas fa-xmark" aria-hidden="true"></i></button>
  </div>`;
export function formTurmaHTML({ professores = [], sessao = null, academia = null } = {}) {
  const opcoesArte = '<option value="" disabled selected>Escolha a arte marcial</option>' + ARTES.map((a) => `<option value="${X(a.id)}">${X(a.nome)}</option>`).join('');
  const profs = (professores || []).map((p) => `<option value="${X(p.id)}" ${sessao && p.id === sessao.uid ? 'selected' : ''}>${X(p.nome)}${sessao && p.id === sessao.uid ? ' (eu)' : ''}</option>`).join('');
  const cores = PALETA_TURMAS.map((c, i) => `<label class="turma-swatch" title="${X(c.nome)}"><input type="radio" name="turmaCor" value="${X(c.hex)}" ${i === 0 ? 'checked' : ''} aria-label="${X(c.nome)}"><span style="background:${X(c.hex)}"></span></label>`).join('');
  return `<form id="formTurma" class="form-turma" autocomplete="off" data-sem-trocas>
    <p class="form-turma-intro">Uma turma é uma arte marcial com os próprios alunos, graduação e mensalidade. A Rede e os avisos continuam sendo do núcleo${academia && academia.nome ? ` ${X(academia.nome)}` : ''}.</p>
    <div class="form-turma-grid">
      <label>Arte marcial<select id="turmaArte" required>${opcoesArte}</select></label>
      <label>Nome da turma<input id="turmaNome" type="text" maxlength="60" placeholder="Ex.: Boxe · Adultos" required></label>
    </div>
    <div class="form-turma-campo"><span>Cor da turma <small>— aparece no cartão, nos gráficos e na etiqueta dos posts</small></span><div class="turma-swatches">${cores}</div></div>
    <div class="form-turma-campo"><span>Sistema de graduação</span>
      <div class="turma-radios" id="turmaGradOpcoes" role="radiogroup" aria-label="Sistema de graduação">${radiosGraduacao('outra', 'faixas')}</div>
      <small id="turmaGradDica">Escolha a arte marcial: o sistema de graduação acompanha a arte.</small></div>
    <div class="form-turma-grid">
      <label>Professor responsável<select id="turmaProfessor">${profs || '<option value="">Eu</option>'}</select></label>
      <label>Mensalidade (R$)<input id="turmaMensalidade" type="number" min="0" step="0.01" placeholder="Ex.: 130"></label>
    </div>
    <div class="form-turma-campo"><span>Dias e horários <small>— um horário por linha: ex. Seg e Qua às 19:30, Sex às 18:00</small></span>
      <div class="turma-horarios" id="turmaHorarios">${linhaHorario(0)}</div>
      <button type="button" class="turma-add-horario" id="turmaAddHorario"><i class="fas fa-plus" aria-hidden="true"></i> Adicionar horário</button>
    </div>
  </form>`;
}
export function lerFormTurma(raiz = document) {
  const q = (id) => raiz.querySelector(`#${id}`);
  const arte = q('turmaArte') ? q('turmaArte').value : '';
  const corEl = raiz.querySelector('input[name="turmaCor"]:checked');
  const gradEl = raiz.querySelector('input[name="turmaGrad"]:checked');
  const profSel = q('turmaProfessor');
  const horarios = [...raiz.querySelectorAll('.turma-horario')].map((linha) => ({
    dias: [...linha.querySelectorAll('input[type="checkbox"]:checked')].map((i) => i.value),
    hora: (linha.querySelector('.turma-hora-input') || {}).value || '',
  })).filter((h) => h.dias.length || h.hora);
  return {
    arte, nome: q('turmaNome') ? q('turmaNome').value : '', cor: corEl ? corEl.value : '',
    graduacao: gradEl ? gradEl.value : graduacaoDaArte(arte),
    professorUid: profSel && profSel.value ? profSel.value : null,
    professorNome: profSel && profSel.selectedOptions[0] ? profSel.selectedOptions[0].textContent.replace(/\s*\(eu\)$/, '') : '',
    mensalidade: q('turmaMensalidade') && q('turmaMensalidade').value !== '' ? Number(q('turmaMensalidade').value) : null,
    horarios, dias: horarios[0] ? horarios[0].dias : [], hora: horarios[0] ? horarios[0].hora : '',
  };
}
// Ao trocar a arte: sugere o nome e troca as opções do sistema de graduação (as da arte).
// "Adicionar horário" cria uma linha nova (dias + hora); cada linha tem o seu "remover".
export function ligarFormTurma(raiz = document) {
  const arte = raiz.querySelector('#turmaArte'); const nome = raiz.querySelector('#turmaNome');
  const opcoes = raiz.querySelector('#turmaGradOpcoes'); const dica = raiz.querySelector('#turmaGradDica');
  if (arte) {
    const sugerir = () => {
      if (!arte.value) return;
      const marcado = (raiz.querySelector('input[name="turmaGrad"]:checked') || {}).value;
      if (opcoes) opcoes.innerHTML = radiosGraduacao(arte.value, marcado);
      if (dica) dica.textContent = dicaGraduacao(arte.value);
      if (nome && (!nome.value || nome.dataset.sugerido === nome.value)) { nome.value = `${nomeArte(arte.value)} · Adultos`; nome.dataset.sugerido = nome.value; }
    };
    arte.addEventListener('change', sugerir); sugerir();
  }
  const lista = raiz.querySelector('#turmaHorarios'); const add = raiz.querySelector('#turmaAddHorario');
  if (!lista || !add) return;
  const renumerar = () => {
    const linhas = [...lista.querySelectorAll('.turma-horario')];
    linhas.forEach((l, n) => {
      l.dataset.linha = String(n); l.setAttribute('aria-label', `Horário ${n + 1}`);
      l.querySelectorAll('input[type="checkbox"]').forEach((c) => { c.name = `turmaDia-${n}`; });
      const h = l.querySelector('.turma-hora-input'); if (h) h.setAttribute('aria-label', `Horário ${n + 1}`);
      const r = l.querySelector('.turma-rem-horario'); if (r) { r.hidden = linhas.length === 1; r.setAttribute('aria-label', `Remover o horário ${n + 1}`); }
    });
    add.disabled = linhas.length >= MAX_HORARIOS;
  };
  add.addEventListener('click', () => {
    const n = lista.querySelectorAll('.turma-horario').length;
    if (n >= MAX_HORARIOS) return;
    lista.insertAdjacentHTML('beforeend', linhaHorario(n));
    renumerar();
    const nova = lista.lastElementChild; const primeiro = nova && nova.querySelector('input');
    if (primeiro) primeiro.focus();
  });
  lista.addEventListener('click', (e) => {
    const bt = e.target.closest('.turma-rem-horario'); if (!bt) return;
    const linha = bt.closest('.turma-horario'); if (linha && lista.children.length > 1) { linha.remove(); renumerar(); add.focus(); }
  });
  renumerar();
}

// Etiqueta pequena da turma (cartões, Rede, carteirinha).
export const etiquetaTurmaHTML = (t) => (t && !t.padrao ? `<span class="turma-etiqueta" data-sem-trocas style="--turma:${X(corOk(t.cor))}"><span class="turma-cor"></span>${X(t.nome)}</span>` : '');

// CSS do bloco (injetado uma vez; admin.css pode sobrescrever).
let cssPronto = false;
export function garantirEstilosTurma() {
  if (cssPronto || typeof document === 'undefined') return; cssPronto = true;
  const s = document.createElement('style'); s.id = 'css-turmas';
  s.textContent = `
.turma-bloco{display:flex;flex-direction:column;gap:6px;margin:6px 0 10px}
.turma-atual{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:2px solid var(--primary-teal,#389E92);border-radius:12px;background:#fff;text-align:left;cursor:pointer;font:inherit;color:inherit;transition:box-shadow .25s cubic-bezier(.16,1,.3,1)}
.turma-atual:hover{box-shadow:0 6px 18px -10px rgba(0,45,114,.5)}
.turma-atual .turma-txt{display:flex;flex-direction:column;flex:1;min-width:0}
.turma-atual .turma-txt b{font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.turma-atual .turma-txt small{font-size:.72rem;color:var(--text-muted,#5B6B7F);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.turma-atual i{color:var(--text-muted,#5B6B7F);transition:transform .3s cubic-bezier(.16,1,.3,1)}
.turma-atual[aria-expanded="true"] i{transform:rotate(180deg)}
.turma-cor{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
.turma-lista{display:flex;flex-direction:column;gap:2px;padding:2px 0}
.turma-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border:0;border-radius:10px;background:transparent;font:inherit;color:inherit;text-align:left;cursor:pointer;font-size:.9rem}
.turma-item:hover{background:var(--bg-app,#EAF2F1)}
.turma-item.ativa{background:var(--bg-app,#EAF2F1);font-weight:700}
.turma-item .turma-nome{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.turma-item .turma-qtd{font-size:.75rem;color:var(--text-muted,#5B6B7F)}
.turma-nova{display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;border:1.5px dashed var(--primary-teal,#389E92);border-radius:10px;background:#F3FAF9;color:#1F7A70;font:inherit;font-weight:600;font-size:.9rem;cursor:pointer}
.turma-etiqueta{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 7px;border-radius:999px;background:color-mix(in srgb,var(--turma) 12%,#fff);color:var(--turma);font-size:.75rem;font-weight:700;border:1px solid color-mix(in srgb,var(--turma) 30%,#fff)}
.turma-etiqueta .turma-cor{background:var(--turma);width:8px;height:8px}
.form-turma{display:flex;flex-direction:column;gap:16px}
.form-turma-intro{margin:0;color:var(--text-muted,#5B6B7F);font-size:.9rem;line-height:1.5}
.form-turma-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.form-turma label{display:flex;flex-direction:column;gap:6px;font-size:.85rem;font-weight:600}
.form-turma input[type=text],.form-turma input[type=number],.form-turma input[type=time],.form-turma select{padding:11px 12px;border:1px solid #C9D6D4;border-radius:10px;font:inherit;font-size:.95rem;background:#fff}
.form-turma-campo{display:flex;flex-direction:column;gap:8px;font-size:.85rem;font-weight:600}
.form-turma-campo small{font-weight:400;color:var(--text-muted,#5B6B7F)}
.turma-swatches{display:flex;flex-wrap:wrap;gap:10px}
.turma-swatch input{position:absolute;opacity:0;width:0;height:0}
.turma-swatch span{display:block;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #D9E5E3;cursor:pointer;transition:transform .25s cubic-bezier(.16,1,.3,1)}
.turma-swatch input:checked+span{border-color:#0F2340;transform:scale(1.08)}
.turma-swatch input:focus-visible+span{outline:2px solid #0F2340;outline-offset:2px}
.turma-radios{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.turma-radios label{flex-direction:row;align-items:center;gap:8px;padding:10px 12px;border:1px solid #C9D6D4;border-radius:10px;font-weight:500;cursor:pointer}
.turma-radios label:has(input:checked){border:2px solid #0F2340;background:#F6FAF9}
.turma-dias{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.turma-dia input{position:absolute;opacity:0;width:0;height:0}
.turma-dia span{display:inline-block;padding:8px 13px;border:1px solid #C9D6D4;border-radius:999px;font-weight:500;cursor:pointer}
.turma-dia input:checked+span{background:#0F2340;border-color:#0F2340;color:#fff}
.turma-hora{flex-direction:row;align-items:center;gap:8px;font-weight:500;margin-left:6px}
.turma-horarios{display:flex;flex-direction:column;gap:10px}
.turma-horario{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:10px 12px;border:1px solid #D9E5E3;border-radius:12px;background:#F8FBFA;animation:turmaEntra .35s cubic-bezier(.16,1,.3,1)}
.turma-horario .turma-dias{flex:1 1 320px}
.turma-rem-horario{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#5B6B7F;cursor:pointer;font-size:1rem;transition:background .25s cubic-bezier(.16,1,.3,1),color .25s}
.turma-rem-horario:hover{background:#FDECEC;color:#A32D2D}
.turma-add-horario{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border:1.5px dashed var(--primary-teal,#389E92);border-radius:10px;background:#F3FAF9;color:#1F7A70;font:inherit;font-weight:600;font-size:.88rem;cursor:pointer}
.turma-add-horario:disabled{opacity:.5;cursor:not-allowed}
@keyframes turmaEntra{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.turma-horario{animation:none}}
@media (max-width:640px){.form-turma-grid,.turma-radios{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
