/* shared.js
   Módulo central de segurança e utilidades reutilizado por login.js, inscricao.js,
   admin.js e aluno.html. Mantém uma única fonte da verdade para:
   - Sanitização de saída (previne XSS em innerHTML)
   - Hash de senha (Web Crypto API) — nunca gravamos senha em texto puro
   - Guarda de rota por papel (sessionStorage) com verificação de expiração
*/

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

/** Hash SHA-256 (hex) client-side. Não substitui um backend com salt único
 *  por usuário + bcrypt/argon2, mas elimina senhas em texto puro no banco —
 *  a mitigação correta de longo prazo é migrar para Firebase Authentication. */
export async function hashPassword(password) {
    const pepper = 'CapoeiraLiberdade::v1::'; // pepper estático apenas para dificultar rainbow tables triviais
    const enc = new TextEncoder().encode(pepper + String(password || ''));
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Garante que a sessão do papel exigido existe; caso contrário redireciona
 *  para o login. Use no topo de qualquer página restrita. */
export function exigirSessao(chave, papeisPermitidos, redirectPara = 'login.html') {
    let sessao = null;
    try { sessao = JSON.parse(sessionStorage.getItem(chave)); } catch (_) { sessao = null; }

    if (!sessao || (papeisPermitidos && papeisPermitidos.length && !papeisPermitidos.includes(sessao.role))) {
        sessionStorage.removeItem(chave);
        window.location.href = redirectPara;
        return null;
    }
    return sessao;
}

/** Debounce simples para inputs de busca/filtro. */
export function debounce(fn, wait = 250) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
