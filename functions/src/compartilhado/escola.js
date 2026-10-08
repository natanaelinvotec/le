/* escola.js — identidade da escola (white-label).

Tudo o que muda de um grupo para outro fica AQUI: nome, cidade, cores, logos,
cordões, frase da celebração, chaves públicas do Firebase. Para montar o app de
outra escola: clone o repositório, crie um projeto Firebase novo, edite este
arquivo e siga docs/WHITE-LABEL.md. Nenhum outro arquivo de lógica precisa mudar.

Só entra aqui informação PÚBLICA (vai para o navegador de qualquer visitante).
Chave de conta de serviço, senha ou token secreto NUNCA entram neste arquivo. */

export const ESCOLA = {
  id: 'liberdade', // escola nº 1 da plataforma (multi-escola: aplicarEscola troca tudo abaixo)
  nome: 'Capoeira Liberdade e Expressão',
  nomeCurto: 'Liberdade e Expressão',
  nomeRede: 'Rede Liberdade',
  modalidade: 'capoeira',
  // Como a arte chama a graduação e quem lidera (Jiu-Jitsu: 'faixa' / 'Professor').
  peca: 'cordão',
  lider: 'Mestre',
  mestre: 'Mestre Profeta',
  cidade: 'Campo Grande',
  uf: 'MS',
  // Complemento usado quando o endereço do núcleo não traz a cidade (link de rotas).
  cidadeParaMapa: 'Campo Grande - MS',
  // Rótulo da linhagem direta do Fundador ("Direto Liberdade e Expressão").
  rotuloLinhagem: 'Direto Liberdade e Expressão',
  // Frase do botão quando alguém ganha um brasão.
  fraseCelebracao: 'Shalom, capoeira!',
  // Frase curta depois de publicar na Rede.
  frasePublicado: 'Publicado! Shalom.',
  logo: 'assets/logo-liberdade.png',
  logoPequeno: 'assets/logo-liberdade150.png',
  cores: { teal: '#389E92', navy: '#002D72', verde: '#00E676', fundo: '#EAF2F1' },
  // Contato do encarregado de dados (LGPD). Deixe vazio para mostrar
  // "fale com a administração do grupo".
  contatoPrivacidade: '',
  // Versão atual do termo de uso/privacidade. Mude a data quando o texto de
  // privacidade.html mudar: quem entrar depois disso aceita a versão nova.
  versaoTermo: '2026-09-26',
};

// Chaves públicas do Firebase deste grupo (Console → Configurações do projeto).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBkwCDziIv-Uh7MLzsy9OYJmA_LMnn7jbg',
  authDomain: 'capoeira-liberdade.firebaseapp.com',
  projectId: 'capoeira-liberdade',
  storageBucket: 'capoeira-liberdade.firebasestorage.app',
  messagingSenderId: '492022804215',
  appId: '1:492022804215:web:c61aed556d9f1aa9576df2',
};

// App Check (reCAPTCHA Enterprise / Fraud Defense). Vazio = desligado. Cole aqui a CHAVE DO SITE (a
// pública) depois de registrar o app em Console → App Check (docs/SEGURANCA.md).
export const APP_CHECK_SITE_KEY = '6LccBdQtAAAAANJl-I6rIh-fMLOrl-RHaikSEjfY';

// Notificações push (Console → Cloud Messaging → Certificados push da Web).
// Vazio = usa a chave padrão do Firebase, que já funciona.
export const VAPID_KEY = '';

// Escada de cordões (ordem e cores das três faixas de cada cordão).
export const CORDOES_ADULTO = [
  { nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] },
  { nome: 'Escravo', cor: ['#4F4F4F', '#4F4F4F', '#4F4F4F'] },
  { nome: 'Fugitivo', cor: ['#4F4F4F', '#DAA520', '#4F4F4F'] },
  { nome: 'Quilombola', cor: ['#DAA520', '#DAA520', '#DAA520'] },
  { nome: 'Vagante', cor: ['#4F4F4F', '#D32F2F', '#4F4F4F'] },
  { nome: 'Liberto', cor: ['#D32F2F', '#D32F2F', '#D32F2F'] },
  { nome: 'Instrutor', cor: ['#4F4F4F', '#DAA520', '#D32F2F'] },
  { nome: 'Professor', cor: ['#FFFFFF', '#D32F2F', '#FFFFFF'] },
  { nome: 'Mestre', cor: ['#F5F5F5', '#F5F5F5', '#F5F5F5'] },
  { nome: 'Mestre/Presidente', cor: ['#FFFFFF', '#00B140', '#002D72'] },
];
export const CORDOES_KIDS = [
  { nome: 'Iniciante', cor: ['#CCC', '#CCC', '#CCC'] },
  { nome: 'Escravo', cor: ['#D3D3D3', '#D3D3D3', '#D3D3D3'] },
  { nome: 'Fugitivo', cor: ['#D3D3D3', '#EEDC82', '#D3D3D3'] },
  { nome: 'Quilombola', cor: ['#EEDC82', '#EEDC82', '#EEDC82'] },
];
export const ORDEM_CORDOES = CORDOES_ADULTO.map((c) => c.nome);
// Idade abaixo da qual vale a escada infantil (multi-escola: vem da escada da escola).
export let IDADE_KIDS = 12;

// Critérios avaliados pelo responsável (notas 0–10). reqAdulto = índice mínimo
// do cordão a partir do qual o critério conta; reqKids = conta na escada infantil.
export const CRITERIOS = [
  { id: 'c1', txt: 'Ginga e Base', reqAdulto: 0, reqKids: true }, { id: 'c2', txt: 'Acrobacias', reqAdulto: 3, reqKids: false },
  { id: 'c3', txt: 'Respeito', reqAdulto: 0, reqKids: true }, { id: 'c4', txt: 'Disciplina', reqAdulto: 0, reqKids: true },
  { id: 'c5', txt: 'Pontualidade', reqAdulto: 0, reqKids: true }, { id: 'c6', txt: 'Freq. Aulas', reqAdulto: 0, reqKids: true },
  { id: 'c7', txt: 'Freq. Rodas', reqAdulto: 0, reqKids: true }, { id: 'c8', txt: 'Eventos', reqAdulto: 0, reqKids: true },
  { id: 'c9', txt: 'Pandeiro', reqAdulto: 5, reqKids: false }, { id: 'c10', txt: 'Atabaque', reqAdulto: 5, reqKids: false },
  { id: 'c11', txt: 'Berimbau', reqAdulto: 5, reqKids: false }, { id: 'c12', txt: 'Canta/Responde', reqAdulto: 5, reqKids: false },
  { id: 'c13', txt: 'Higiene', reqAdulto: 0, reqKids: true }, { id: 'c14', txt: 'Aprendizado', reqAdulto: 0, reqKids: true },
  { id: 'c15', txt: 'Fundamentos', reqAdulto: 0, reqKids: true },
];
// Prontidão mínima (%) para aparecer na lista de aptos à troca de cordão.
export const META_PRONTIDAO = 70;

export const escadaDe = (pessoa) => ((Number(pessoa && pessoa.idade) || 0) > 0 && Number(pessoa.idade) < IDADE_KIDS ? CORDOES_KIDS : CORDOES_ADULTO);
export const coresDoCordao = (nome, pessoa) => {
  const lista = pessoa ? escadaDe(pessoa) : CORDOES_ADULTO;
  const item = lista.find((c) => c.nome === nome) || CORDOES_ADULTO.find((c) => c.nome === nome) || lista[0];
  return item.cor;
};
// Prontidão rumo ao próximo cordão (0–100) a partir das notas reais; null sem notas.
export function prontidao(u) {
  if (!u || !u.notas || !Object.keys(u.notas).length) return null;
  const idade = Number(u.idade) || 0; const kids = idade > 0 && idade < IDADE_KIDS;
  let idx = (kids ? CORDOES_KIDS : CORDOES_ADULTO).findIndex((c) => c.nome === (u.cordaoAtual || 'Iniciante')); if (idx === -1) idx = 0;
  const ativos = CRITERIOS.filter((c) => (kids ? c.reqKids : idx >= (c.reqAdulto - 1)));
  if (!ativos.length) return null;
  let total = 0; ativos.forEach((c) => { if (u.notas[c.id] !== undefined) total += Number(u.notas[c.id]) || 0; });
  return Math.min(100, Math.floor((total / (ativos.length * 10)) * 100));
}
export function proximoCordao(pessoa) {
  const lista = escadaDe(pessoa);
  const i = lista.findIndex((c) => c.nome === ((pessoa && pessoa.cordaoAtual) || 'Iniciante'));
  return lista[Math.min(lista.length - 1, (i === -1 ? 0 : i) + 1)];
}
// Link de rotas (Google Maps; no celular o sistema oferece Maps/Waze).
export function linkMapa(n) {
  const lat = Number(n && n.latitude); const lng = Number(n && n.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat || lng)) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const e = (n && n.endereco) || '';
  const temCidade = new RegExp(ESCOLA.cidade, 'i').test(e);
  return e ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e + (temCidade ? '' : `, ${ESCOLA.cidadeParaMapa}`))}` : '';
}
// Nome digitado TODO EM MAIÚSCULAS vira "Nome Próprio" (certificado, festa, card);
// quem escreveu normal fica como escreveu.
export function nomeBonito(nome) {
  const t = String(nome || '').trim().replace(/\s+/g, ' ');
  if (!t || t !== t.toUpperCase() || !/\p{Lu}/u.test(t)) return t;
  return t.toLowerCase().split(' ').map((p, i) => (i > 0 && /^(da|de|do|das|dos|e|d')$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');
}

// ===== Multi-escola (AtletaPay) =====
// O app nasce com a Liberdade (escola nº 1). Depois do login, js/escola-atual.js
// carrega o cartão público da escola de quem entrou e chama esta função: a
// identidade e a escada de graduação passam a ser as dela EM TODAS AS TELAS, sem
// mexer em cada uma — as listas são trocadas no lugar (mesmas referências que
// admin.js, gestao.js, rede.js… já importaram). Chamada uma vez por página.
export function aplicarEscola(cfg) {
  if (!cfg || !cfg.id || cfg.id === ESCOLA.id) return false;
  const nome = cfg.nome || cfg.nomeCurto || 'Escola';
  const curto = cfg.nomeCurto || nome;
  const e = cfg.escada || null;
  const resp = cfg.responsavel && cfg.responsavel.nome ? cfg.responsavel.nome : '';
  Object.assign(ESCOLA, {
    id: cfg.id, nome, nomeCurto: curto, nomeRede: `Rede ${curto}`, modalidade: cfg.modalidade || 'outra',
    peca: (e && e.peca) || cfg.pecaGraduacao || 'graduação', lider: (e && e.lider) || cfg.lider || 'Professor',
    mestre: resp, cidade: cfg.cidade || '', uf: cfg.uf || '',
    cidadeParaMapa: cfg.cidade ? `${cfg.cidade}${cfg.uf ? ` - ${cfg.uf}` : ''}` : '',
    rotuloLinhagem: `Direto ${curto}`,
    fraseCelebracao: cfg.modalidade === 'jiujitsu' || cfg.modalidade === 'judo' ? 'Oss!' : 'Parabéns!',
    frasePublicado: 'Publicado!',
    logo: cfg.logo || 'assets/app-icon-192.png', logoPequeno: cfg.logo || 'assets/app-icon-192.png',
    cores: { ...ESCOLA.cores, ...(cfg.cores || {}) },
    contatoPrivacidade: '',
  });
  if (e && Array.isArray(e.adulto) && e.adulto.length) {
    const copia = (l) => l.map((g) => ({ ...g, cor: Array.isArray(g.cor) ? g.cor.slice(0, 3) : [g.cor, g.cor, g.cor] }));
    const adulto = copia(e.adulto);
    const kids = Array.isArray(e.kids) && e.kids.length ? copia(e.kids) : null;
    CORDOES_ADULTO.splice(0, CORDOES_ADULTO.length, ...adulto);
    CORDOES_KIDS.splice(0, CORDOES_KIDS.length, ...(kids || adulto));
    ORDEM_CORDOES.splice(0, ORDEM_CORDOES.length, ...adulto.map((g) => g.nome));
    IDADE_KIDS = kids ? (Number(e.idadeKids) || 16) : 0;
    if (Array.isArray(e.criterios) && e.criterios.length) {
      CRITERIOS.splice(0, CRITERIOS.length, ...e.criterios.map((txt, i) => ({ id: `c${i + 1}`, txt, reqAdulto: 0, reqKids: true })));
    }
  }
  return true;
}
// Faixa/cordão com graus: "Azul · 2º grau" (sem graus, só o nome).
export function rotuloGrad(nome, graus) {
  const g = Math.max(0, Math.floor(Number(graus) || 0));
  // Faixas de mestre (coral, vermelha): o grau vem da própria faixa (7º, 8º, 9º) — igual ao servidor.
  const item = CORDOES_ADULTO.find((c) => c.nome === nome) || CORDOES_KIDS.find((c) => c.nome === nome);
  if (item && Number(item.grauDan) > 0) return `${nome} · ${Number(item.grauDan) + g}º grau`;
  return g ? `${nome} · ${g}º grau` : String(nome || '');
}
// Quantos graus a graduação admite na escada atual (0 = não usa graus).
export function grausPossiveis(nome, pessoa) {
  const item = (pessoa ? escadaDe(pessoa) : CORDOES_ADULTO).find((c) => c.nome === nome) || CORDOES_ADULTO.find((c) => c.nome === nome);
  return item && Number(item.graus) > 0 ? Number(item.graus) : 0;
}
