# Mensagem para colar no Claude do navegador (com a extensão ativa)

Anexe junto: o ZIP do projeto (app.html, instalar.html, manifest.webmanifest, sw.js,
support.js, index.html, firebase.js, firestore.rules, pasta assets/, pasta _ds/).

---

## COLE A PARTIR DAQUI

Olá! Preciso de duas tarefas no meu navegador (já estou logado no GitHub e no Firebase).
Os arquivos estão no ZIP anexado. Siga na ordem e me avise ao terminar cada etapa.

### TAREFA 1 — Publicar no GitHub Pages

Repositório: https://github.com/natanaelinvotec/le (branch `main`, GitHub Pages já ativo).

1. Descompacte o ZIP e envie para a RAIZ do repositório, substituindo os existentes:
   - app.html
   - instalar.html
   - manifest.webmanifest
   - sw.js
   - support.js
   - index.html
   - firebase.js
   - firestore.rules
   - a pasta assets/ inteira (inclui icon-192.png, icon-512.png, icon-maskable-192.png,
     icon-maskable-512.png, apple-touch-icon.png, logo-liberdade.png e as fotos)
   - a pasta _ds/ inteira (design system — mantenha o nome da pasta exatamente igual)

   IMPORTANTE: manter a estrutura de pastas. Nada de renomear `_ds` nem `assets`.

2. Mensagem do commit:
   `App instalável: login por perfil, painel do mestre, master admin, financeiro e material de estudo`

3. Apague do repositório, se existirem: `painel.html`, `Gerenciar Site.dc.html` e a pasta `uploads/`.

4. Depois do deploy, abra https://natanaelinvotec.github.io/le/instalar.html e confirme
   que a página carrega e que o botão "Instalar agora" aparece no Chrome.

### TAREFA 2 — Criar o Firebase

1. https://console.firebase.google.com → Adicionar projeto → nome: `capoeira-liberdade`
   (pode desativar o Google Analytics).

2. Registre um app **Web** (ícone `</>`) com o apelido `app-liberdade`.
   COPIE o objeto `firebaseConfig` que aparecer e me mostre o conteúdo — eu preciso dele.

3. Authentication → Começar → ativar **E-mail/senha**.
   Em Users, criar estes 5 usuários, todos com a senha `capoeira2026`:
   - natanael@liberdade.com
   - simone@liberdade.com
   - profeta@liberdade.com
   - rafinha@liberdade.com
   - admin@liberdade.com

4. Firestore Database → Criar banco de dados → modo produção → região `southamerica-east1`.

5. Na aba **Regras** do Firestore, apague tudo e cole o conteúdo do arquivo
   `firestore.rules` que está no ZIP. Publicar.

6. Crie a coleção `usuarios` com um documento por usuário, usando o **UID** de cada um
   (copie da tela Authentication → Users) como ID do documento, com estes campos:

   | UID de | papel | nome | academia |
   |---|---|---|---|
   | natanael@liberdade.com | aluno | Natanael Silva | Mestre Profeta · Buriti |
   | simone@liberdade.com | responsavel | Simone Silva | Profª Taynara · Buriti |
   | profeta@liberdade.com | mestre | Mestre Profeta | Mestre Profeta · Buriti |
   | rafinha@liberdade.com | mestre | Profº Rafinha | Profº Rafinha · Rancho Alegre |
   | admin@liberdade.com | admin | Master Admin | (deixe vazio) |

   Todos os campos são do tipo string. No documento da Simone, adicione também um campo
   `responsavelPor` do tipo array com os nomes: Helena Silva, Théo Silva.

7. Authentication → Templates → Redefinição de senha → mude o idioma para
   Português (Brasil), para o e-mail de "esqueci minha senha" sair em português.

### O QUE PRECISO DE VOLTA

- O link do commit no GitHub.
- O objeto `firebaseConfig` completo (apiKey, authDomain, projectId, storageBucket,
  messagingSenderId, appId).
- Os 5 UIDs criados no Authentication.
- Um print do Firestore com a coleção `usuarios` pronta.

## FIM DA MENSAGEM
