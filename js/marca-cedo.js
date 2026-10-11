/* marca-cedo.js — evita o "pisca" da logo da escola nº 1 (v38).

Roda ANTES do HTML pintar (script comum no <head>, sem módulo): em atletapay.com.br/<escola>/…
a página nasce com a logo da Liberdade no HTML e só troca quando js/escola-atual.js lê o
cartão da escola (~1 s). Aqui, se o endereço é da plataforma e a escola NÃO é a Liberdade,
as logos ficam invisíveis até aplicarIdentidade() trocar e tirar a classe `marca-pendente`.
Mesmas regras de js/escola-atual.js (hosts, ?escola, 1º pedaço do caminho, última escola). */
(function () {
  try {
    var host = String(location.hostname || '').toLowerCase().replace(/^www\./, '');
    var PLATAFORMA = ['atletapay.com.br', 'atletapay-br.web.app', 'atletapay-br.firebaseapp.com'];
    if (PLATAFORMA.indexOf(host) === -1) return;
    var ROTAS = ['cadastro', 'painel', 'privacidade', 'termos', 'index', 'css', 'js', 'img', 'assets', 'fotos', 'global', 'rede', 'escolas', 'inscricao', 'entrar', 'sair', 'login', 'admin', 'app', 'master', 'conta'];
    var SLUG = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
    var slug = '';
    try { slug = new URLSearchParams(location.search).get('escola') || ''; } catch (e) { slug = ''; }
    if (!slug) { var p = location.pathname.split('/').filter(Boolean)[0] || ''; if (SLUG.test(p) && ROTAS.indexOf(p) === -1) slug = p; }
    if (!slug && !/inscricao/.test(location.pathname)) { try { slug = localStorage.getItem('le.ultimaEscola') || ''; } catch (e) { slug = ''; } }
    if (slug === 'liberdadeeexpressao' || slug === 'liberdade') return; // a logo do HTML já é a certa
    var raiz = document.documentElement;
    raiz.classList.add('marca-pendente');
    var estilo = document.createElement('style');
    estilo.id = 'marca-cedo';
    estilo.textContent = 'img[src*="logo-liberdade"],img[src*="app-icon"],.nav-logo,.topo-logo{transition:opacity .35s cubic-bezier(.16,1,.3,1)}' +
      'html.marca-pendente img[src*="logo-liberdade"],html.marca-pendente .nav-logo,html.marca-pendente .topo-logo{opacity:0!important}';
    (document.head || raiz).appendChild(estilo);
    // Rede de segurança: nunca deixa a página sem logo se a identidade não chegar.
    setTimeout(function () { raiz.classList.remove('marca-pendente'); }, 5000);
  } catch (e) { /* sem efeito: a página segue como sempre */ }
})();
