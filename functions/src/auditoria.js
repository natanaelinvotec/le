// Registro de auditoria: quem fez o quê, quando, e o antes/depois dos campos
// que importam. Gravado só pelo servidor em auditoria/{id}; o Admin e o
// Fundador leem na aba "Auditoria" do painel. Ninguém edita nem apaga pelo app.

// Campos acompanhados por coleção (o resto é ruído: foto, descritor facial…).
export const CAMPOS_AUDITADOS = {
  usuarios: ['nome', 'email', 'papeis', 'academiaId', 'academiaGerenciadaId', 'cordaoAtual', 'notas', 'brasoesAdmin', 'brasoesManuais',
    'acessoGeral', 'statusAtual', 'ativo', 'instrutorUid', 'responsavelUid', 'responsavelDe', 'historicoGraduacoes'],
  posts: ['oculto', 'revisao'],
  pagamentos: null, // null = todos os campos
  nucleos: null,
  config: null,
  solicitacoes: ['status'],
  presencas: null,
  eventos: null,
  avisos: null,
};

const ROTULO = {
  usuarios: 'cadastro', posts: 'post da Rede', pagamentos: 'pagamento', nucleos: 'núcleo', config: 'configuração',
  solicitacoes: 'solicitação', presencas: 'presença', eventos: 'evento', avisos: 'aviso',
};

// Só registra criação nestas coleções (post e presença por Face ID são muitos).
const AUDITA_CRIACAO = new Set(['usuarios', 'pagamentos', 'nucleos', 'config', 'eventos', 'avisos']);

function enxuto(v) {
  if (v === undefined) return null;
  if (typeof v === 'string') return v.length > 300 ? `${v.slice(0, 60)}… (${v.length} caracteres)` : v;
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (Array.isArray(v)) return v.length > 30 ? `${v.length} itens` : v.map(enxuto);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).slice(0, 40).forEach((k) => { o[k] = enxuto(v[k]); }); return o; }
  return v;
}
const igual = (a, b) => JSON.stringify(enxuto(a)) === JSON.stringify(enxuto(b));

export function camposMudados(colecao, antes, depois) {
  const lista = CAMPOS_AUDITADOS[colecao];
  const chaves = lista || Array.from(new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})]));
  return chaves.filter((k) => !igual((antes || {})[k], (depois || {})[k]));
}

// evento: { colecao, docId, antes, depois, authId, authType }
export async function registrar(ctx, ev) {
  const { colecao, docId, antes, depois, authId, authType } = ev;
  if (!(colecao in CAMPOS_AUDITADOS)) return null;
  // Escritas do próprio servidor (sincronização, migração) não entram.
  if (authType && authType !== 'app_user') return null;
  let acao; let campos;
  if (!antes && depois) { if (!AUDITA_CRIACAO.has(colecao) && !(colecao === 'presencas' && ['manual', 'faceid-foto'].includes(depois.origem))) return null; acao = 'criou'; campos = Object.keys(depois); }
  else if (antes && !depois) { acao = 'apagou'; campos = Object.keys(antes); }
  else { acao = 'alterou'; campos = camposMudados(colecao, antes, depois); if (!campos.length) return null; }
  const lista = CAMPOS_AUDITADOS[colecao];
  const recorte = (o) => { if (!o) return null; const r = {}; (lista || Object.keys(o)).forEach((k) => { if (k in o && (acao !== 'alterou' || campos.includes(k))) r[k] = enxuto(o[k]); }); return r; };
  let quemNome = '';
  if (authId) { try { const s = await ctx.db.doc(`usuarios/${authId}`).get(); quemNome = s.exists ? (s.data().nome || '') : ''; } catch (e) { /* ok */ } }
  const alvoNome = (depois && (depois.nome || depois.alunoNome || depois.titulo || depois.autorNome)) || (antes && (antes.nome || antes.alunoNome || antes.titulo || antes.autorNome)) || '';
  const registro = {
    quando: new Date().toISOString(),
    quemUid: authId || null,
    quemNome,
    colecao,
    docId,
    alvoNome,
    acao,
    campos,
    resumo: `${quemNome || 'Alguém'} ${acao} ${ROTULO[colecao] || colecao}${alvoNome ? ` (${alvoNome})` : ''}${acao === 'alterou' ? `: ${campos.join(', ')}` : ''}`,
    antes: acao === 'criou' ? null : recorte(antes),
    depois: acao === 'apagou' ? null : recorte(depois),
  };
  await ctx.db.collection('auditoria').add(registro);
  return registro;
}
