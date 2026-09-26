# Capoeira Liberdade e Expressão — site e app

Site público, app do aluno (PWA), painel de gestão e a Rede Liberdade do
Grupo de Capoeira Liberdade e Expressão (Mestre Profeta, Campo Grande — MS).

Publicado em **GitHub Pages** (`natanaelinvotec.github.io/le/`) e na **Vercel**
(`le-rho.vercel.app`). Backend: Firebase (projeto `capoeira-liberdade`) —
Authentication, Cloud Firestore e Storage.

## Estrutura

```
/                      páginas (os endereços continuam os mesmos)
├── index.html         site público do grupo
├── inscricao.html     ficha de inscrição (cria a conta)
├── login.html         entrada única (aluno, família, instrutor, mestre, admin)
├── app.html           app do aluno / família (PWA)
├── admin.html         painel de gestão (admin, mestre, professor, instrutor)
├── master.html        painel do fundador
├── brasoes.html       gerenciamento dos brasões
├── rede.html          Rede Liberdade (rede social interna)
├── checkin.html       check-in de presença
├── gerenciar.html     editor de conteúdo do site
├── instalar.html      como instalar o app no celular
├── manifest.webmanifest, sw.js   app instalável (PWA)
├── service-worker.js  desativado — só limpa aparelhos com a versão antiga
│
├── js/                lógica das páginas (módulos ES)
│   ├── firebase.js    configuração única do Firebase + funções de dados
│   ├── shared.js      utilidades (escapeHTML, sanitizeInput…)
│   ├── conta.js       minha conta: celular, troca de senha, apresentação
│   ├── apresentacao.js  vídeo de apresentação (Instrutor/Professor/Mestre)
│   ├── admin.js · master.js · login.js · inscricao.js · checkin.js
│   ├── rede.js · brasoes.js · brasoes-admin.js · faceid.js
│   └── support.js     runtime das telas feitas no editor de design
├── css/               estilos (admin, master, inscricao, rede)
├── assets/            logos, ícones do app e fotos do site
├── brasoes/           imagens (png/thumb) e modelos 3D (glb) dos brasões
├── apresentacoes/     vídeos de apresentação publicados junto com o site
├── _ds/               design system (tokens e componentes)
├── firebase/          regras do Firebase (copiar e colar no Console)
│   ├── firestore.rules
│   └── storage.rules
└── docs/              instruções, notas de segurança e histórico
```

## Publicar uma alteração

1. Envie os arquivos alterados para a **mesma pasta** em que eles estão aqui
   (ex.: `js/rede.js` vai dentro de `js/`). No GitHub: abra a pasta →
   *Add file → Upload files*.
2. Quando o arquivo muda, o número `?v=` que o chama na página também muda —
   isso força o navegador a baixar a versão nova.
3. Mudou alguma regra? Copie o arquivo de `firebase/` e cole no Console:
   - **Firestore → Regras** ← `firebase/firestore.rules`
   - **Storage → Regras** ← `firebase/storage.rules`

## Regras de ouro

- Nunca inventar dado de aluno: sem informação, a tela mostra "—" ou um aviso.
- Dados de menores: imagem só com autorização, conversas limitadas ao núcleo.
- Toda permissão é conferida duas vezes: na tela e nas regras do Firebase.
