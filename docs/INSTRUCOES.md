# Como subir o site e o app — Grupo Capoeira Liberdade e Expressão

Guia completo. Siga na ordem. Não precisa saber programar, mas precisa de atenção.

---

## PARTE 1 — O que tem neste pacote

### Arquivos que DEVEM ir para o GitHub

| Arquivo / pasta | O que é |
|---|---|
| `index.html` | A landing page pública (o site novo) |
| `gerenciar.html` | Painel com senha para editar textos e imagens do site |
| `app.html` | Portal do Aluno + Painel do Mestre (protótipo novo) |
| `support.js` | Motor que faz as três páginas funcionarem — **obrigatório** |
| `assets/` | Brasão do grupo e todas as fotos usadas |
| `_ds/` | Estilos, cores e fontes (design system do grupo) |
| `github.md` | Registro de sincronização (opcional, mas ajuda) |
| `INSTRUCOES.md` | Este arquivo |

### ⚠️ APAGUE ESTES 3 ITENS DO SEU REPOSITÓRIO

Conferido no seu `github.com/natanaelinvotec/le` em 10/09. Apague:

| Item | Por quê |
|---|---|
| `Gerenciar Site.dc.html` | Cópia de trabalho minha. A versão publicável é o `gerenciar.html`, que já está lá. |
| `uploads/` (pasta) | Fotos originais sem tratamento, pesadas. As tratadas estão em `assets/`. |
| `painel.html` | Página que vocês mesmos marcaram como descontinuada. |

**Como apagar um arquivo:** abra o arquivo no GitHub → ícone de **lixeira** no canto superior direito → *Commit changes*.

**Como apagar a pasta `uploads/`:** entre na pasta, abra cada arquivo e apague um por um (o GitHub não deleta pasta pelo navegador). Se preferir por Git: `git rm -r uploads && git commit -m "remove uploads" && git push`.

### ⚠️ FALTA SUBIR ESTES 2 ARQUIVOS

Estão no zip mas não estão no repositório:

- **`app.html`** — o Portal do Aluno + Painel do Mestre novo. Sem ele o app novo não existe no ar.
- **`INSTRUCOES.md`** — este guia (opcional, mas útil deixar junto).

### ✅ NÃO apague (mesmo parecendo antigo)

- `logo-liberdade150.png` — as páginas antigas (`login.html`, `aluno.html`, `admin.html`, `inscricao.html`) ainda usam esse caminho. Se apagar, o logo delas quebra.
- `admin.css/html/js`, `aluno.html`, `login.html/js`, `inscricao.*`, `shared.js`, `firestore.rules`, `README-SEGURANCA.md` — é o sistema em produção de vocês. O site novo **não** substitui isso ainda.
- `_ds/`, `assets/`, `support.js`, `index.html`, `gerenciar.html`, `github.md` — já estão certos.

---

## PARTE 2 — Subir para o GitHub

### Opção A: pelo navegador (mais simples, recomendado)

1. Descompacte o `.zip` que você baixou.
2. Acesse `https://github.com/natanaelinvotec/le`
3. Clique em **Add file → Upload files**.
4. Arraste os arquivos da lista "DEVEM ir": `index.html`, `gerenciar.html`, `app.html`, `support.js`, `github.md`, `INSTRUCOES.md`.
5. Arraste também as pastas `assets` e `_ds` inteiras (o GitHub aceita arrastar pasta).
6. Em *Commit changes* escreva: `Novo site, painel de gerenciamento e app redesenhado`
7. Clique em **Commit changes**. Pronto.

> Se aparecer aviso de arquivo existente, ele vai **substituir** — é isso que queremos para o `index.html`.

### Opção B: pelo computador com Git

```bash
git clone https://github.com/natanaelinvotec/le.git
cd le

# copie os arquivos do zip para dentro desta pasta, então:
git add index.html gerenciar.html app.html support.js github.md INSTRUCOES.md assets _ds

# remova os obsoletos, se existirem
git rm -f painel.html

git commit -m "Novo site, painel de gerenciamento e app redesenhado"
git push origin main
```

### Publicar no ar (GitHub Pages)

1. No repositório: **Settings → Pages**
2. Em *Source* escolha **Deploy from a branch**
3. Branch: `main` · Folder: `/ (root)` → **Save**
4. Espere 2 minutos. O site fica em:
   `https://natanaelinvotec.github.io/le/`

Endereços finais:
- Site público → `https://natanaelinvotec.github.io/le/`
- Gerenciar site → `.../le/gerenciar.html` (senha `liberdade2026` — **troque na primeira vez**)
- App do aluno → `.../le/app.html`

---

## PARTE 3 — Correção urgente na ficha de inscrição

O campo do responsável está aparecendo só para menores de 12 anos. Deve aparecer para **menores de 18**.

Abra `inscricao.js` no GitHub, clique no lápis para editar e faça 2 trocas:

- **Linha 101**: onde está `if (idade >= 12)` → escreva `if (idade >= 18)`
- **Linha 178**: onde está `if (idadeAluno >= 12)` → escreva `if (idadeAluno >= 18)`

Abra `inscricao.html`:

- **Linha 109**: onde está `Obrigatório para menores de 12 anos` → escreva `Obrigatório para menores de 18 anos`

> ⚠️ **Não mexa** em outros `12` do código. O número 12 também separa a trilha de cordões infantil (até 11 anos) da adulta — se você trocar aqueles, quebra a graduação das crianças.

---

## PARTE 4 — Banco de dados (Firebase)

Hoje o conteúdo editado em `gerenciar.html` fica salvo **só no navegador de quem editou**. Para ficar salvo de verdade e aparecer para todo mundo, precisa ir para o Firestore.

### 4.1 — Criar as coleções

No [console do Firebase](https://console.firebase.google.com) → seu projeto → **Firestore Database**, crie:

**Coleção `siteConteudo`** — um único documento chamado `landing`:

```
textos     (map)   → heroT1, heroT2, heroSub, stat1v, stat1r ...
imagens    (map)   → heroFundo: URL da imagem no Storage
academias  (array) → nome, bairro, dias, horario, endereco, telefone,
                     whatsapp, instagramUrl, foto
mestres    (array) → nome, formacao, historia, foto
eventos    (array) → titulo, local, data, ano, quando, horario, mapa, drive
produtos   (array) → nome, desc, preco, img
loja       (map)   → whatsapp, pix, provedor, chaveApi
```

**Na coleção `alunos` que já existe**, adicione dois campos em cada aluno:

```
responsavelId  (string)  → o UID do pai/mãe. Alunos que treinam
                           sozinhos ficam com este campo VAZIO.
titular        (boolean) → true no responsável que faz o login
```

É esse `responsavelId` que faz a conta família funcionar: o login busca todos os alunos com o mesmo `responsavelId` e mostra a tela "Quem vai treinar?". Aluno sem esse campo entra direto no próprio painel — **é assim que a privacidade de quem treina sozinho fica garantida**.

### 4.2 — Regras de segurança

Em **Firestore Database → Rules**, cole:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Conteúdo do site: todos leem, só admin escreve
    match /siteConteudo/{doc} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.token.admin == true;
    }

    // Aluno: lê o próprio cadastro OU o dos filhos vinculados
    match /alunos/{alunoId} {
      allow read: if request.auth != null && (
        request.auth.uid == alunoId ||
        request.auth.uid == resource.data.responsavelId ||
        request.auth.token.professor == true ||
        request.auth.token.admin == true
      );
      allow write: if request.auth != null && (
        request.auth.token.professor == true ||
        request.auth.token.admin == true
      );
    }
  }
}
```

Clique em **Publish**.

### 4.3 — Imagens no Storage

As fotos que você subir pelo painel hoje ficam embutidas no navegador (pesado e não compartilha). O certo é:

1. **Storage → Rules** → permita escrita só para admin.
2. Crie a pasta `site/` no Storage.
3. Cada upload do painel salva ali e grava só a URL no Firestore.

### 4.4 — Ativar no código

O painel já está pronto para isso — falta só trocar a fonte de dados. Me mande a config do Firebase do projeto (aquele bloco `firebaseConfig` que já existe no `firebase-config.js` de vocês) e eu:

- troco o `localStorage` por leitura/gravação no Firestore no `gerenciar.html`
- faço a landing ler o `siteConteudo/landing`
- ligo o `responsavelId` na conta família do app
- ajusto o upload de imagem para o Storage

---

## PARTE 5 — Checklist final

- [ ] `app.html` subido
- [ ] `Gerenciar Site.dc.html` apagado
- [ ] Pasta `uploads/` apagada
- [ ] `painel.html` apagado
- [ ] GitHub Pages ativado e site abrindo
- [ ] `inscricao.js` e `inscricao.html` corrigidos (12 → 18)
- [ ] Senha do `gerenciar.html` trocada
- [ ] Coleção `siteConteudo` criada no Firestore
- [ ] Campo `responsavelId` adicionado nos alunos
- [ ] Regras de segurança publicadas
- [ ] Links do Google Drive de cada evento passado colados no painel

---

## Dúvidas frequentes

**Preciso subir a pasta `_ds`?** Sim. Sem ela o site abre sem cores nem fontes.

**Posso renomear `app.html`?** Pode, mas atualize o link no rodapé do `index.html`.

**O site funciona no celular?** Sim, as três páginas foram feitas primeiro para celular.

**Perdi a senha do gerenciar.** Abra o navegador, F12 → Application → Local Storage → apague a chave `leSiteSenha`. A senha volta para `liberdade2026`.


---

# App instalável — acessos e publicação (atualizado em 10/09/2026)

## Arquivos que vão para o repositório natanaelinvotec/le
app.html · instalar.html · manifest.webmanifest · sw.js · support.js · index.html · pasta assets/ · pasta _ds/
Suba na raiz, mantendo as pastas. Depois abra https://natanaelinvotec.github.io/le/instalar.html no celular.

## Acessos — senha padrão de todos: capoeira2026
- Aluno: natanael@liberdade.com — só a área do aluno
- Família (responsável): simone@liberdade.com — seletor de atletas + área do aluno
- Mestre: profeta@liberdade.com — só o painel do mestre
- Professor com academia: rafinha@liberdade.com — painel do mestre + troca de papel para aluno
- Master Admin: admin@liberdade.com — gestão, alunos e financeiro do grupo (acesso único, sem troca de papel)

Cada um troca a própria senha em Perfil → Meus dados.
O Master Admin redefine a senha de qualquer aluno no prontuário (Avaliar → Acesso do aluno):
"Senha padrão" volta para capoeira2026 e "Reenviar e-mail" manda o acesso de novo.

## Troca de papel
Habilitada só para professor ou instrutor que tem academia E cadastro de aluno vinculado.
O vínculo é feito em Gestão → Troca de papel.

## Material de estudo
Gestão → Publicar material: tipo (videoaula, oficina de canto, oficina de música, biblioteca, avaliação),
título, descrição, link do YouTube/Drive/formulário e a academia de destino.
Aparece na hora na aba Material do aluno, com filtro por tipo. A lixeira em "Materiais publicados" remove.

## Contas no aparelho
A tela de login guarda as contas já usadas: toque na foto para entrar direto,
arraste o cartão para a esquerda para remover o acesso daquele aparelho.

## Falta conectar
Firebase Auth (e-mail + senha) e Firestore para persistir alunos, avaliações, financeiro e materiais.
Envie o firebaseConfig do projeto e eu ligo.
