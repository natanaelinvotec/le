/* escola.js — identidade da escola (white-label).

Tudo o que muda de um grupo para outro fica AQUI: nome, cidade, cores, logos,
cordões, frase da celebração, chaves públicas do Firebase. Para montar o app de
outra escola: clone o repositório, crie um projeto Firebase novo, edite este
arquivo e siga docs/WHITE-LABEL.md. Nenhum outro arquivo de lógica precisa mudar.

Só entra aqui informação PÚBLICA (vai para o navegador de qualquer visitante).
Chave de conta de serviço, senha ou token secreto NUNCA entram neste arquivo. */

export const ESCOLA = {
  nome: 'Capoeira Liberdade e Expressão',
  nomeCurto: 'Liberdade e Expressão',
  nomeRede: 'Rede Liberdade',
  modalidade: 'capoeira',
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

// App Check (reCAPTCHA v3). Vazio = desligado. Cole aqui a CHAVE DO SITE (a
// pública) depois de registrar o app em Console → App Check (docs/SEGURANCA.md).
export const APP_CHECK_SITE_KEY = '';

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
// Idade abaixo da qual vale a escada infantil.
export const IDADE_KIDS = 12;

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
