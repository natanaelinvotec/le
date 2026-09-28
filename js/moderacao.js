/* moderacao.js — filtro de palavras ofensivas (Rede Liberdade).

Usado em DOIS lugares com o mesmo código: no navegador (avisa antes de
publicar) e no servidor (Cloud Functions conferem de novo e mandam o post para
revisão se passar algo). O Admin pode acrescentar palavras em config/moderacao
(campo "palavras", lista) sem mexer no código.

Cuidado com falso positivo: termos da capoeira como "macaco" (golpe), "rolê",
"rola" (a roda rola) e "pau" (berimbau) NÃO entram na lista. */

const BASE = [
  'porra', 'caralho', 'krl', 'puta', 'puto', 'putaria', 'merda', 'foder', 'fuder', 'fodase', 'foda se', 'fdp',
  'filho da puta', 'arrombado', 'arrombada', 'cuzao', 'cuzão', 'buceta', 'boceta', 'piroca', 'pau no cu',
  'vai tomar no cu', 'tomar no cu', 'vtnc', 'viado', 'viadinho', 'bicha', 'sapatao', 'vagabunda', 'vadia',
  'otario', 'otaria', 'babaca', 'retardado', 'retardada', 'punheta', 'boquete', 'xoxota', 'xereca', 'corno',
  'escroto', 'escrota', 'desgracado', 'desgracada', 'nazista', 'estuprador',
];

// Normaliza: minúsculas, sem acento, números/símbolos comuns viram letras,
// letras repetidas ("porrrra") viram uma só.
export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[0@4]/g, (c) => ({ 0: 'o', '@': 'a', 4: 'a' }[c]))
    .replace(/1/g, 'i').replace(/3/g, 'e').replace(/5|\$/g, 's').replace(/7/g, 't')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/([a-z])\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devolve a lista de termos encontrados (vazia = texto ok).
export function termosOfensivos(texto, extras = []) {
  const t = ` ${normalizar(texto)} `;
  if (!t.trim()) return [];
  const lista = Array.from(new Set(BASE.concat(extras || []).map(normalizar).filter(Boolean)));
  return lista.filter((p) => t.includes(` ${p} `) || t.includes(` ${p.replace(/ /g, '')} `));
}

export const temOfensa = (texto, extras) => termosOfensivos(texto, extras).length > 0;

// Motivos de denúncia (tela e servidor usam os mesmos rótulos).
export const MOTIVOS_DENUNCIA = [
  { id: 'ofensivo', rotulo: 'Conteúdo ofensivo ou palavrão' },
  { id: 'menor', rotulo: 'Expõe uma criança ou adolescente' },
  { id: 'imagem', rotulo: 'Uso de imagem sem autorização' },
  { id: 'assedio', rotulo: 'Assédio ou bullying' },
  { id: 'spam', rotulo: 'Propaganda ou spam' },
  { id: 'outro', rotulo: 'Outro motivo' },
];
