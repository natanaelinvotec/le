/* shared.js
   Módulo central de utilidades reutilizado por login.js, inscricao.js e admin.js.
   Mantém uma única fonte da verdade para:
   - Sanitização de saída (previne XSS em innerHTML)
   - Geração de slugs e função debounce
   Autenticação e sessão são responsabilidade do Firebase Authentication (ver firebase.js) —
   este módulo não lida mais com senha nem com guarda de rota. */

/** Escapa qualquer string antes de injetar em innerHTML. Sempre use isto
 *  em volta de QUALQUER dado vindo do Firestore/usuário antes de exibir. */
export function escapeHTML(value) {
    const str = (value === null || value === undefined) ? '' : String(value);
    return str.replace(/[&<>"'`=\/]/g, (ch) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
        "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;'
    }[ch]));
}

/** Remove tags/espaços indevidos de um input de texto simples antes de salvar. */
export function sanitizeInput(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>?/gm, '').trim();
}



/** Gera um identificador estavel (slug) a partir do nome de uma academia,
 * ex.: "Mestre Abraao" -> "mestre-abraao". Base do campo academiaId,
 * gravado em academias/alunos para preparar o sistema para multiplas
 * academias (multi-tenant) no futuro, sem quebrar nada do fluxo atual. */
export function gerarSlug(nome) {
if (!nome) return 'geral';
return String(nome)
.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
.toLowerCase()
.replace(/[^a-z0-9]+/g, '-')
.replace(/^-+|-+$/g, '') || 'geral';
}

/** Debounce simples para inputs de busca/filtro. */
export function debounce(fn, wait = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
