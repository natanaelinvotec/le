# Como publicar uma atualização do app

1. Suba os arquivos novos na **raiz** do repositório (substituindo os antigos).
2. Abra `sw.js` e mude **só** a linha do topo:

   ```js
   const VERSAO = 'le-app-v17';   →   const VERSAO = 'le-app-v18';
   ```

3. Pronto. Quem estiver com o app aberto vê "Versão nova pronta · Atualizar";
   quem abrir depois já entra na versão nova. O cache antigo é apagado sozinho.

## Por que isso basta

O app guarda no aparelho **tudo** (telas, scripts, estilos, fontes, ícones,
bibliotecas do Firebase e fotos) e abre direto de lá, sem conferir cada arquivo
com o servidor a cada abertura. A única coisa que manda baixar tudo de novo é a
`VERSAO` do `sw.js`. Há ainda uma checagem leve, uma vez por dia, para o app
instalado no celular que fica aberto por muito tempo.

Os `?v=...` nos HTMLs não precisam mais ser mexidos: o cache ignora o `?v=` dos
arquivos do próprio site. Eles só ajudam navegadores sem service worker.

## Se alguém reclamar que "não atualizou"

- Confira se a `VERSAO` foi mudada no `sw.js` publicado.
- Peça para fechar TODAS as abas/janelas do app e abrir de novo (ou tocar em
  "Atualizar" na pílula verde).
- Em último caso: Configurações do navegador → Dados do site → limpar.
