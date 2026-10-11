# Vitrine de demonstração e sessão por escola (v39)

## Uma sessão por escola no mesmo navegador
- Problema: em atletapay.com.br todas as escolas usavam o mesmo "app" do Firebase. Entrar no painel da Liberdade derrubava o login do Team Igor aberto na outra aba.
- Agora `js/firebase.js` abre um app nomeado por escola: `escola-<id>`.
  - A escola é lida do endereço: `?escola`, depois o 1º pedaço do caminho, depois `le.ultimaEscola`.
  - A Liberdade e os endereços próprios dela continuam no app padrão `[DEFAULT]`, então nenhuma sessão existente cai.
- Cada app tem a própria sessão (`firebase:authUser:<apiKey>:<app>` no localStorage) e o próprio cache do Firestore.
- Migração automática: quem já estava logado no app padrão com o claim `escolaId` desta escola muda de "gaveta" uma vez e não precisa entrar de novo.
- Conta de outra escola entrando por esta tela (ex.: conta da Liberdade em /teamigor/login):
  - a sessão vai para a gaveta da escola da conta;
  - `le.ultimaEscola` vira a escola da conta e a próxima tela abre nela;
  - a gaveta desta escola fica livre.
- Endereço diferente do id (`escolasSlugs`): `js/escola-atual.js` grava `le.enderecos` (endereço → id) para a sessão abrir na gaveta certa.
- Em outro computador nada mudou: o Firebase sempre aceitou vários aparelhos logados ao mesmo tempo, e sair num não desconecta os outros.

## Vitrine (marketing): atletapay.com.br/demo e /demo/fundador
- `tools/montar-dist.mjs` gera, a cada publicação, `dist/app/demo.html` (de admin.html) e `dist/app/demo-fundador.html` (de master.html). Cada página recebe:
  - um import map que troca as URLs `https://www.gstatic.com/firebasejs/10.12.0/firebase-*.js` por `js/demo/sdk-demo.js`;
  - um script que desliga o service worker e os tutoriais de primeira visita;
  - `js/demo/vitrine.js`.
- `js/demo/sdk-demo.js`: Firebase falso em memória (app, auth, Firestore com where/orderBy/limit/onSnapshot/batch, storage, messaging, App Check).
  - Nenhum login real, nenhuma leitura ou gravação no banco real. Recarregar volta ao exemplo.
  - Serve também de banco falso para testes: `globalThis.__BANCO_DEMO__` e `__CONTAS_DEMO__`.
- `js/demo/dados-demo.js`: escola fictícia "Academia Horizonte" (id `demo`, reservado), com datas sempre relativas a hoje.
  - 2 núcleos e 4 turmas: Jiu-jitsu (padrão), Jiu-jitsu Kids com graus vermelhos, Muay Thai (prajied), Capoeira (cordas).
  - 46 pessoas, presenças de 60 dias, 6 meses de mensalidades, pedidos, avisos, eventos e árvore de formação.
  - Avatares desenhados em canvas: nenhuma foto de pessoa real.
- `js/demo/vitrine.js`:
  - faixa "Demonstração" fixa no rodapé, com os botões Painel do Fundador ↔ Painel de Gestão e "Quero o AtletaPay na minha escola" (`/#planos`);
  - links para outras telas do app mostram um aviso em vez de abrir;
  - o painel abre no núcleo sede.
- `firebase.json`: `/demo`, `/demo/fundador` e `/demo/**` vêm antes das rotas `/*/…`.
- O site da AtletaPay ganhou o botão "Ver o painel funcionando" e o link no rodapé.

## Ajustes para todas as escolas (não só capoeira)
- Indicador 7 estrelas: segue a escada da escola (`ORDEM_ESTRELA` atualizada em `calcularEstrelaViva`).
  - Liberdade: Escravo → Professor, como sempre.
  - Jiu-jitsu: Azul → Vermelha.
- Painel do Fundador: textos de faixa, cordão ou prajied conforme a escola. Para escolas que não são a Liberdade, "Anel giratório nas cores da escola".
- Relatórios gerais (`gestao.js`): "Ativos por graduação" e "Graduações" usam a escada em uso. Antes eram listas só de capoeira e ficavam vazios no jiu-jitsu.
- Barra lateral do Admin Master/Fundador com "Todos os núcleos": o bloco "Turmas" mostra um seletor de núcleo. Antes ficava escondido.
