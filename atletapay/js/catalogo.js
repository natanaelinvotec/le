/* catalogo.js — planos, modalidades e modelos de site da AtletaPay.
Uma fonte só para a vitrine, o simulador, o cadastro e o painel da escola. */

// Planos por faixa de alunos ativos (valores aprovados no Plano Mestre, 02/10/2026).
export const PLANOS = [
  { id: 'roda', nome: 'Roda', ate: 60, mensal: 0, split: 1.5, frase: 'Para começar sem custo fixo', itens: ['Site com 1 modelo', 'App do aluno e painel do núcleo', 'Carteirinha, certificados e brasões', 'Rede do grupo', 'Mensalidade via Pix com split'] },
  { id: 'nucleo', nome: 'Núcleo', ate: 200, mensal: 79, split: 1.0, frase: 'Para a academia que já tem turma cheia', destaque: true, itens: ['Tudo do Roda', '5 modelos de site e domínio próprio', 'Aniversários e lembretes automáticos', 'Relatórios financeiros', 'Suporte por WhatsApp'] },
  { id: 'grupo', nome: 'Grupo', ate: 600, mensal: 199, split: 1.0, frase: 'Para grupos com vários núcleos', itens: ['Tudo do Núcleo', 'Vários núcleos e professores', 'Campeonato interno com chaves', 'Rede Global entre escolas', 'Tela de área para TV'] },
  { id: 'federacao', nome: 'Federação', ate: null, mensal: 499, split: 0.5, frase: 'Para federações e redes de escolas', itens: ['Tudo do Grupo', 'Campeonato externo entre escolas', 'Ranking público e API', 'Suporte prioritário', 'Onboarding assistido'] },
];
export const porId = (id) => PLANOS.find((p) => p.id === id) || PLANOS[1];
export const planoPara = (alunos) => PLANOS.find((p) => p.ate == null || alunos <= p.ate) || PLANOS[PLANOS.length - 1];
export const TRIAL_DIAS = 14;
export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: v % 1 ? 2 : 0 });

// Modalidades com a escada de graduações (editável depois pela escola).
export const MODALIDADES = [
  { id: 'capoeira', nome: 'Capoeira', lider: 'Mestre', peca: 'cordão', graduacoes: ['Iniciante', 'Escravo', 'Fugitivo', 'Quilombola', 'Vagante', 'Liberto', 'Instrutor', 'Professor', 'Mestre'] },
  { id: 'jiujitsu', nome: 'Jiu-jitsu', lider: 'Professor', peca: 'faixa', graduacoes: ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'] },
  { id: 'judo', nome: 'Judô', lider: 'Sensei', peca: 'faixa', graduacoes: ['Branca', 'Cinza', 'Azul', 'Amarela', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta'] },
  { id: 'karate', nome: 'Karatê', lider: 'Sensei', peca: 'faixa', graduacoes: ['Branca', 'Amarela', 'Vermelha', 'Laranja', 'Verde', 'Roxa', 'Marrom', 'Preta'] },
  { id: 'taekwondo', nome: 'Taekwondo', lider: 'Sabom', peca: 'faixa', graduacoes: ['Branca', 'Amarela', 'Verde', 'Azul', 'Vermelha', 'Preta'] },
  { id: 'muaythai', nome: 'Muay Thai', lider: 'Kru', peca: 'prajied', graduacoes: ['Branca', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Vermelha', 'Marrom', 'Preta'] },
  { id: 'boxe', nome: 'Boxe', lider: 'Treinador', peca: 'nível', graduacoes: ['Iniciante', 'Intermediário', 'Avançado', 'Competidor'] },
  { id: 'mma', nome: 'MMA', lider: 'Coach', peca: 'nível', graduacoes: ['Iniciante', 'Intermediário', 'Avançado', 'Competidor'] },
  { id: 'kungfu', nome: 'Kung Fu', lider: 'Sifu', peca: 'faixa', graduacoes: ['Branca', 'Amarela', 'Verde', 'Azul', 'Marrom', 'Preta'] },
  { id: 'outra', nome: 'Outra arte marcial', lider: 'Professor', peca: 'graduação', graduacoes: ['Iniciante', 'Intermediário', 'Avançado'] },
];
export const modalidadePorId = (id) => MODALIDADES.find((m) => m.id === id) || MODALIDADES[MODALIDADES.length - 1];

// Modelos de site: 5 famílias visuais.
export const MODELOS = [
  { id: 'roda', nome: 'Roda', para: 'Capoeira e artes de tradição', cores: ['#EAF2F1', '#002D72', '#00E676'], resumo: 'Fundo claro, cordão trançado como divisor, cards com o gradiente da graduação.' },
  { id: 'tatame', nome: 'Tatame', para: 'Jiu-jitsu, judô, karatê', cores: ['#F6F7F9', '#111318', '#2F6BFF'], resumo: 'Grade sobre branco-gelo, faixas como barras de progresso, fotos em preto e branco.' },
  { id: 'arena', nome: 'Arena', para: 'Muay thai, boxe, MMA', cores: ['#0B0E1F', '#FF7A1A', '#FFFFFF'], resumo: 'Fundo escuro, tipografia condensada, números grandes, vídeo no herói.' },
  { id: 'dojo', nome: 'Dojo', para: 'Taekwondo, aikidô, kung fu', cores: ['#FFFFFF', '#1A1A1A', '#C8102E'], resumo: 'Muito espaço em branco, uma cor só, seções curtas, caligrafia como textura.' },
  { id: 'quintal', nome: 'Quintal', para: 'Escolas de bairro e projetos sociais', cores: ['#FFF4E6', '#7A3E00', '#FF9F1C'], resumo: 'Cores quentes, mosaico de fotos da turma, seção "como apoiar".' },
];
export const modeloPorId = (id) => MODELOS.find((m) => m.id === id) || MODELOS[0];

// Fotos que o onboarding pede (o que cada uma vira no site e no app).
export const FOTOS = [
  { id: 'logo', nome: 'Logo', dica: 'PNG com fundo transparente, quadrado. Vira ícone do app e marca do site.', obrigatoria: true, max: 1 },
  { id: 'lider', nome: 'Foto do responsável (mestre, professor, sensei)', dica: 'Retrato, de frente, fundo limpo. Aparece em "Sobre" e no perfil do responsável.', obrigatoria: true, max: 1 },
  { id: 'equipe', nome: 'Foto da equipe', dica: 'Turma reunida, horizontal. Vira capa da Rede.', obrigatoria: false, max: 1 },
  { id: 'treino', nome: 'Fotos dos membros, treinos e eventos', dica: 'Turma, treinos, graduações, campeonatos e eventos. Mínimo de 10, até 20 — montam o herói, a galeria do site e a capa da Rede. Pode enviar aos poucos.', obrigatoria: true, min: 10, max: 20 },
  { id: 'fachada', nome: 'Fachada ou local', dica: 'Onde a turma treina. Entra em "Horários e núcleos" com o mapa.', obrigatoria: false, max: 1 },
];

// Quantas fotos cada item pede (obrigatória sem "min" = 1) e o que ainda falta.
export const minimoDe = (f) => (f.obrigatoria ? (f.min || 1) : 0);
export const fotosFaltando = (fotos) => FOTOS.filter((f) => ((fotos && fotos[f.id]) || []).length < minimoDe(f));
// Envio de várias: soma às que já estão (até o máximo); de uma só: troca.
export const juntarFotos = (f, atuais, novas) => (f.max > 1 ? [...(atuais || []), ...novas].slice(0, f.max) : novas.slice(0, 1));
export function contagemFotos(f, n) {
  if (f.max <= 1) return n ? 'Enviada.' : '';
  const min = minimoDe(f);
  if (min && n < min) return `${n} de ${min} (mínimo) · faltam ${min - n}.`;
  return `${n} de até ${f.max} enviadas.`;
}

// Subdomínio: letras, números e hífen; 3–30; sem reservados.
// O endereço é atletapay.com.br/<slug>: as páginas e pastas do próprio site também ficam reservadas.
// Mudou aqui? Mude também slugLivre() em firebase/firestore.rules.
export const RESERVADOS = ['www', 'app', 'api', 'admin', 'painel', 'master', 'suporte', 'ajuda', 'blog', 'docs', 'mail', 'email', 'ftp', 'cdn', 'static', 'assets', 'atletapay', 'redbull', 'teste', 'demo', 'login', 'conta', 'pagamentos', 'pix',
  'cadastro', 'privacidade', 'termos', 'index', 'css', 'js', 'img', 'fotos', 'sitemap', 'robots', 'favicon', 'sobre', 'contato', 'planos', 'precos', 'global', 'rede', 'escolas', 'inscricao', 'entrar', 'sair'];
export const slugDe = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'e').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 30);
export const slugValido = (s) => /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(s) && !RESERVADOS.includes(s);
