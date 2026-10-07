// Firestore em memória com a mesma "cara" do firebase-admin (só o que src/ usa).
// Serve para testar a lógica das Cloud Functions sem internet nem emulador.
export function criarDb(inicial = {}) {
  const docs = new Map(); // caminho completo → dados
  Object.entries(inicial).forEach(([col, itens]) => Object.entries(itens).forEach(([id, d]) => docs.set(`${col}/${id}`, structuredClone(d))));
  const ops = [];

  const snap = (caminho) => {
    const d = docs.get(caminho);
    const id = caminho.split('/').pop();
    return { id, exists: d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)), ref: docRef(caminho) };
  };
  function docRef(caminho) {
    return {
      id: caminho.split('/').pop(), path: caminho,
      async get() { return snap(caminho); },
      async set(dados, opts = {}) {
        ops.push(['set', caminho, dados]);
        const atual = docs.get(caminho) || {};
        if (opts.mergeFields) { const n = { ...atual }; opts.mergeFields.forEach((k) => { n[k] = structuredClone(dados[k]); }); docs.set(caminho, n); }
        else if (opts.merge) docs.set(caminho, mesclar(atual, structuredClone(dados)));
        else docs.set(caminho, structuredClone(dados));
      },
      async update(dados) {
        ops.push(['update', caminho, dados]);
        if (!docs.has(caminho)) { const e = new Error('NOT_FOUND'); e.code = 5; throw e; }
        docs.set(caminho, { ...docs.get(caminho), ...structuredClone(dados) });
      },
      async delete() { ops.push(['delete', caminho]); docs.delete(caminho); },
      collection: (sub) => colRef(`${caminho}/${sub}`),
    };
  }
  function mesclar(a, b) {
    const out = { ...a };
    Object.entries(b).forEach(([k, v]) => { out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? mesclar(a[k], v) : v; });
    return out;
  }
  function consulta(filtro, clausulas = []) {
    const api = {
      where: (f, op, v) => consulta(filtro, [...clausulas, { k: 'where', f, op, v }]),
      orderBy: (f, dir = 'asc') => consulta(filtro, [...clausulas, { k: 'order', f, dir }]),
      limit: (n) => consulta(filtro, [...clausulas, { k: 'limit', n }]),
      startAfter: (s) => consulta(filtro, [...clausulas, { k: 'after', id: s.ref ? s.ref.path : s }]),
      async get() {
        let itens = Array.from(docs.keys()).filter(filtro).map((c) => ({ c, d: docs.get(c) }));
        clausulas.filter((x) => x.k === 'where').forEach((w) => {
          itens = itens.filter(({ d }) => {
            const val = d[w.f];
            switch (w.op) {
              case '==': return JSON.stringify(val) === JSON.stringify(w.v);
              case '<': return val !== undefined && val < w.v;
              case '>': return val !== undefined && val > w.v;
              case '>=': return val !== undefined && val >= w.v;
              case '<=': return val !== undefined && val <= w.v;
              case 'array-contains': return Array.isArray(val) && val.includes(w.v);
              default: throw new Error(`op ${w.op}`);
            }
          });
        });
        itens.sort((a, b) => (a.c < b.c ? -1 : 1));
        const after = clausulas.find((x) => x.k === 'after'); if (after) itens = itens.filter(({ c }) => c > after.id);
        const lim = clausulas.find((x) => x.k === 'limit'); if (lim) itens = itens.slice(0, lim.n);
        const lista = itens.map(({ c }) => snap(c));
        return { docs: lista, empty: !lista.length, size: lista.length };
      },
    };
    return api;
  }
  function colRef(caminho) {
    const prof = caminho.split('/').length;
    return {
      ...consulta((c) => c.startsWith(`${caminho}/`) && c.split('/').length === prof + 1),
      doc: (id) => docRef(`${caminho}/${id || 'auto' + Math.random().toString(36).slice(2, 10)}`),
      async add(dados) { const id = 'auto' + Math.random().toString(36).slice(2, 10); ops.push(['add', caminho, dados]); docs.set(`${caminho}/${id}`, structuredClone(dados)); return docRef(`${caminho}/${id}`); },
    };
  }
  const db = {
    doc: (c) => docRef(c),
    collection: (c) => colRef(c),
    // Transação simplificada (sequencial): mesmo formato do firebase-admin.
    async runTransaction(fn) {
      return fn({ get: (ref) => ref.get(), set: (ref, d, o) => ref.set(d, o), update: (ref, d) => ref.update(d), delete: (ref) => ref.delete() });
    },
    collectionGroup: (nome) => consulta((c) => { const p = c.split('/'); return p.length % 2 === 0 && p[p.length - 2] === nome; }),
  };
  const lerCol = (col) => Object.fromEntries(Array.from(docs.entries()).filter(([c]) => c.startsWith(`${col}/`) && c.split('/').length === col.split('/').length + 1).map(([c, d]) => [c.split('/').pop(), d]));
  return { db, docs, ops, ler: (c) => (docs.has(c) ? structuredClone(docs.get(c)) : undefined), lerCol };
}

export function criarMessaging() {
  const enviadas = [];
  return {
    enviadas,
    async sendEach(msgs) {
      msgs.forEach((m) => enviadas.push(m));
      return { responses: msgs.map((m) => (m.token === 'token-vencido' ? { success: false, error: { code: 'messaging/registration-token-not-registered' } } : { success: true })) };
    },
  };
}

export function criarBucket() {
  const arquivos = new Map(); const apagados = [];
  return {
    name: 'teste.firebasestorage.app', arquivos, apagados,
    file: (p) => ({
      nome: p,
      async delete() { apagados.push(p); if (!arquivos.has(p)) { const e = new Error('No such object'); e.code = 404; throw e; } arquivos.delete(p); },
      async save(buf, opts) { arquivos.set(p, { tam: buf.length, opts }); },
      async copy(destino) { if (!arquivos.has(p)) throw new Error(`No such object: ${p}`); arquivos.set(destino.nome || destino, { ...arquivos.get(p), copiaDe: p }); },
    }),
    async deleteFiles({ prefix }) { apagados.push(`${prefix}*`); },
  };
}

// Authentication em memória: só o que src/ usa (claims e exclusão).
export function criarAuth(uids = []) {
  const usuarios = new Map(uids.map((u) => [u, { uid: u, customClaims: {} }]));
  const naoAchou = () => { const e = new Error('user not found'); e.code = 'auth/user-not-found'; return e; };
  return {
    usuarios,
    async getUser(uid) { if (!usuarios.has(uid)) throw naoAchou(); return structuredClone(usuarios.get(uid)); },
    async setCustomUserClaims(uid, c) { if (!usuarios.has(uid)) throw naoAchou(); usuarios.get(uid).customClaims = structuredClone(c || {}); },
    async deleteUser(uid) { if (!usuarios.delete(uid)) throw naoAchou(); },
  };
}
