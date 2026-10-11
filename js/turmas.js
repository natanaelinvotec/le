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
import { ESCOLA, aplicarEscadaDaTurma, escadaDaEscola } from './escola.js';

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

// Sistema de graduação pela arte: cordões (capoeira), níveis (boxe, mma…) ou faixas.
export function graduacaoDaArte(arte) {
  const m = MODALIDADES[arte] || MODALIDADES.outra;
  if (arte === 'capoeira') return 'cordoes';
  return m.peca === 'nível' || m.peca === 'graduação' ? 'niveis' : 'faixas';
}
export const ARTES = Object.entries(MODALIDADES).map(([id, m]) => ({ id, nome: m.nome, peca: m.peca, lider: m.lider }));

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
export function validarTurma(d) {
  const erros = [];
  if (!d.nome || String(d.nome).trim().length < 2) erros.push('Dê um nome à turma (ex.: "Boxe · Adultos").');
  if (!MODALIDADES[d.arte]) erros.push('Escolha a arte marcial.');
  if (!HEX.test(String(d.cor || ''))) erros.push('Escolha a cor da turma.');
  if (d.mensalidade != null && (!Number.isFinite(Number(d.mensalidade)) || Number(d.mensalidade) < 0)) erros.push('Mensalidade inválida.');
  if (d.hora && !/^\d{2}:\d{2}$/.test(String(d.hora))) erros.push('Horário no formato 19:30.');
  if (Array.isArray(d.dias) && d.dias.some((x) => !DIAS.includes(x))) erros.push('Dia da semana inválido.');
  return erros;
}
export async function criarTurma(academia, dados, sessao) {
  const erros = validarTurma(dados);
  if (erros.length) throw new Error(erros.join(' '));
  const e = await minhaEscolaId();
  if (!e) throw new Error('Sua conta ainda está sendo preparada. Tente de novo em alguns segundos.');
  const arte = dados.arte;
  const escada = escadaLimpa(escadaPadrao(arte));
  const turma = {
    escolaId: e, academiaId: academia.id, nome: String(dados.nome).trim().slice(0, 60), arte, cor: dados.cor,
    graduacao: dados.graduacao || graduacaoDaArte(arte), escada,
    professorUid: dados.professorUid || (sessao && sessao.uid) || null, professorNome: dados.professorNome || (sessao && sessao.nome) || '',
    mensalidade: dados.mensalidade != null && dados.mensalidade !== '' ? Number(dados.mensalidade) : null,
    dias: Array.isArray(dados.dias) ? dados.dias.filter((x) => DIAS.includes(x)) : [], hora: dados.hora || '',
    ativa: true, padrao: false, criadoEm: new Date().toISOString(), criadoPor: (sessao && sessao.uid) || null,
  };
  const ref = await addDoc(collection(db, 'turmas'), turma);
  cache.delete(academia.id);
  return { id: ref.id, ...turma };
}
export async function atualizarTurma(id, academiaId, dados) {
  const permitidos = ['nome', 'cor', 'professorUid', 'professorNome', 'mensalidade', 'dias', 'hora', 'ativa', 'escada'];
  const limpo = {};
  permitidos.forEach((k) => { if (dados[k] !== undefined) limpo[k] = dados[k]; });
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
export const descricaoHorario = (t) => (t && Array.isArray(t.dias) && t.dias.length ? `${t.dias.map((d) => NOME_DIA[d] || d).join(' · ')}${t.hora ? `, ${t.hora}` : ''}` : (t && t.hora ? t.hora : ''));
export const nomeArte = (arte) => ((MODALIDADES[arte] || MODALIDADES.outra).nome);

// ---------- UI: bloco "Turma ativa" da barra lateral (admin.html) ----------
const X = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function seletorTurmaHTML({ turmas, ativaId, contagem = {}, academia, podeCriar = true }) {
  const padrao = turmaPadrao(academia);
  const todas = [padrao, ...(turmas || [])];
  const ativa = todas.find((t) => (t.id || '') === (ativaId || '')) || padrao;
  const item = (t) => `<button type="button" class="turma-item${(t.id || '') === (ativa.id || '') ? ' ativa' : ''}" data-turma="${X(t.id || '')}" title="${X(t.nome)}${t.padrao ? ' (turma do núcleo)' : ''}">
    <span class="turma-cor" style="background:${X(corOk(t.cor))}"></span><span class="turma-nome">${X(t.nome)}</span><span class="turma-qtd">${Number(contagem[t.id || ''] || 0)}</span></button>`;
  return `<div class="turma-bloco" id="turmaBloco">
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
export function formTurmaHTML({ professores = [], sessao = null, academia = null } = {}) {
  const opcoesArte = ARTES.filter((a) => a.id !== 'outra').map((a) => `<option value="${X(a.id)}">${X(a.nome)}</option>`).join('') + '<option value="outra">Outra arte marcial</option>';
  const profs = (professores || []).map((p) => `<option value="${X(p.id)}" ${sessao && p.id === sessao.uid ? 'selected' : ''}>${X(p.nome)}${sessao && p.id === sessao.uid ? ' (eu)' : ''}</option>`).join('');
  const cores = PALETA_TURMAS.map((c, i) => `<label class="turma-swatch" title="${X(c.nome)}"><input type="radio" name="turmaCor" value="${X(c.hex)}" ${i === 0 ? 'checked' : ''}><span style="background:${X(c.hex)}"></span></label>`).join('');
  const dias = DIAS.map((d) => `<label class="turma-dia"><input type="checkbox" name="turmaDia" value="${d}"><span>${NOME_DIA[d]}</span></label>`).join('');
  return `<form id="formTurma" class="form-turma" autocomplete="off">
    <p class="form-turma-intro">Uma turma é uma arte marcial com os próprios alunos, graduação e mensalidade. A Rede e os avisos continuam sendo do núcleo${academia && academia.nome ? ` ${X(academia.nome)}` : ''}.</p>
    <div class="form-turma-grid">
      <label>Arte marcial<select id="turmaArte" required>${opcoesArte}</select></label>
      <label>Nome da turma<input id="turmaNome" type="text" maxlength="60" placeholder="Ex.: Boxe · Adultos" required></label>
    </div>
    <div class="form-turma-campo"><span>Cor da turma <small>— aparece no cartão, nos gráficos e na etiqueta dos posts</small></span><div class="turma-swatches">${cores}</div></div>
    <div class="form-turma-campo"><span>Sistema de graduação</span><div class="turma-radios">
      <label><input type="radio" name="turmaGrad" value="faixas" checked> Faixas</label>
      <label><input type="radio" name="turmaGrad" value="cordoes"> Cordões</label>
      <label><input type="radio" name="turmaGrad" value="niveis"> Níveis / sem graduação</label></div>
      <small id="turmaGradDica">Jiu-jitsu, judô, karatê, taekwondo e capoeira já vêm com a escada preenchida; as outras você monta depois em Graduação.</small></div>
    <div class="form-turma-grid">
      <label>Professor responsável<select id="turmaProfessor">${profs || '<option value="">Eu</option>'}</select></label>
      <label>Mensalidade (R$)<input id="turmaMensalidade" type="number" min="0" step="0.01" placeholder="Ex.: 130"></label>
    </div>
    <div class="form-turma-campo"><span>Dias e horário</span><div class="turma-dias">${dias}<label class="turma-hora">às <input id="turmaHora" type="time"></label></div></div>
  </form>`;
}
export function lerFormTurma(raiz = document) {
  const q = (id) => raiz.querySelector(`#${id}`);
  const arte = q('turmaArte') ? q('turmaArte').value : 'outra';
  const corEl = raiz.querySelector('input[name="turmaCor"]:checked');
  const gradEl = raiz.querySelector('input[name="turmaGrad"]:checked');
  const profSel = q('turmaProfessor');
  return {
    arte, nome: q('turmaNome') ? q('turmaNome').value : '', cor: corEl ? corEl.value : '',
    graduacao: gradEl ? gradEl.value : graduacaoDaArte(arte),
    professorUid: profSel && profSel.value ? profSel.value : null,
    professorNome: profSel && profSel.selectedOptions[0] ? profSel.selectedOptions[0].textContent.replace(/\s*\(eu\)$/, '') : '',
    mensalidade: q('turmaMensalidade') && q('turmaMensalidade').value !== '' ? Number(q('turmaMensalidade').value) : null,
    dias: [...raiz.querySelectorAll('input[name="turmaDia"]:checked')].map((i) => i.value),
    hora: q('turmaHora') ? q('turmaHora').value : '',
  };
}
// Ao trocar a arte no formulário: sugere nome e sistema de graduação.
export function ligarFormTurma(raiz = document) {
  const arte = raiz.querySelector('#turmaArte'); const nome = raiz.querySelector('#turmaNome');
  if (!arte) return;
  const sugerir = () => {
    const g = graduacaoDaArte(arte.value);
    const r = raiz.querySelector(`input[name="turmaGrad"][value="${g}"]`); if (r) r.checked = true;
    if (nome && (!nome.value || nome.dataset.sugerido === nome.value)) { nome.value = `${nomeArte(arte.value)} · Adultos`; nome.dataset.sugerido = nome.value; }
  };
  arte.addEventListener('change', sugerir); sugerir();
}

// Etiqueta pequena da turma (cartões, Rede, carteirinha).
export const etiquetaTurmaHTML = (t) => (t && !t.padrao ? `<span class="turma-etiqueta" style="--turma:${X(corOk(t.cor))}"><span class="turma-cor"></span>${X(t.nome)}</span>` : '');

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
.turma-radios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.turma-radios label{flex-direction:row;align-items:center;gap:8px;padding:10px 12px;border:1px solid #C9D6D4;border-radius:10px;font-weight:500;cursor:pointer}
.turma-radios label:has(input:checked){border:2px solid #0F2340;background:#F6FAF9}
.turma-dias{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.turma-dia input{position:absolute;opacity:0;width:0;height:0}
.turma-dia span{display:inline-block;padding:8px 13px;border:1px solid #C9D6D4;border-radius:999px;font-weight:500;cursor:pointer}
.turma-dia input:checked+span{background:#0F2340;border-color:#0F2340;color:#fff}
.turma-hora{flex-direction:row;align-items:center;gap:8px;font-weight:500;margin-left:6px}
@media (max-width:640px){.form-turma-grid,.turma-radios{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}
