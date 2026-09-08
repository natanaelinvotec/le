# Capoeira Liberdade — Pacote v2 (Design + Segurança)

## O que mudou em cada arquivo

| Arquivo | Principais mudanças |
|---|---|
| `shared.js` **(novo)** | Módulo central: `escapeHTML`, `sanitizeInput`, `hashPassword` (SHA-256), `exigirSessao` (guarda de rota), `debounce`. Importado por todas as páginas restritas. |
| `login.js` / `login.html` | Removida a senha de admin hardcoded no bundle JS. Login por hash de senha. Busca de alunos via `query()` indexada em vez de varrer a coleção inteira. Bloqueio progressivo simples contra força bruta. Animação de "shake" no erro. |
| `inscricao.js` / `.html` / `.css` | Sanitização de todos os campos antes de salvar. Senha nunca mais é gravada em texto puro. Câmera libera corretamente os recursos (`getTracks().stop()`) ao trocar de câmera, sair da aba ou fechar a página. Foco visível e `autocomplete` corretos. |
| `admin.js` / `.html` / `.css` | Guarda de sessão centralizada. **Toda** inserção de dados via `innerHTML` agora passa por `escapeHTML()` — corrige XSS armazenado (ex.: nome de aluno com `<img onerror=...>`). Senha de professor com hash. Toasts não bloqueantes substituem `alert()`. Skeleton loading com shimmer. Cards com entrada animada e escalonada (`--card-index`). **Gráficos Chart.js**: função central `criarGrafico()` sempre chama `.destroy()` na instância anterior antes de recriar — e todas as instâncias são destruídas também em `beforeunload`. |
| `aluno.html` | Guarda de sessão via `shared.js`. Toda renderização dinâmica trocada para `textContent`/`createElement` (nunca `innerHTML` com dado do usuário) — já era majoritariamente seguro, agora é integralmente. |
| `painel.html` | **Descontinuado de propósito.** Tinha uma senha mestra fixa (`liberdade2026`) no próprio JavaScript, visível a qualquer pessoa e sem nenhuma verificação real — uma vulnerabilidade crítica. Agora redireciona para `login.html`, que já cobre o mesmo caso de uso (professor/admin) com senha em hash. `painel.js` foi removido do pacote. |
| `firestore.rules` **(novo)** | Regras estruturais por coleção (formato dos dados aceitos, tamanho de hash, campos permitidos em updates). |

## O que é uma melhoria real vs. o que ainda é uma limitação estrutural

**Resolvido nesta versão:**
- Nenhuma senha (admin, professor ou aluno) é mais gravada em texto puro — tudo em SHA-256.
- Nenhuma credencial fica mais hardcoded no código-fonte entregue ao navegador.
- XSS armazenado corrigido em todos os pontos que usavam `innerHTML` com dados do Firestore.
- Vazamento de memória dos gráficos Chart.js corrigido (destroy antes de recriar, e no unload).
- Vazamento de câmera (stream não finalizado) corrigido.
- Página com senha mestra fixa (`painel.html`) descontinuada.

**Limitação que nenhuma quantidade de front-end resolve sozinha:**
Este app não usa Firebase Authentication — "estar logado" é apenas um valor no
`sessionStorage` do navegador. Isso significa que:
- As Firestore Rules não conseguem verificar *quem* está pedindo os dados, só *o formato* do pedido.
- Um usuário técnico pode, em teoria, chamar a API do Firestore diretamente (com a `apiKey`
  pública, que é normal existir no front-end) e contornar toda a lógica de papéis do site.

**Isso é aceitável** para um sistema interno de baixo risco (não há dados de cartão de
crédito, por exemplo), mas se o grupo crescer ou lidar com dados mais sensíveis, o próximo
passo real de segurança é migrar login para **Firebase Authentication** (e-mail/senha) +
uma coleção `roles/{uid}` + regras baseadas em `request.auth.uid`. Isso é uma mudança de
arquitetura maior (contas de professor passam a ser criadas via Auth, não mais só um
documento no Firestore) e foi deixada fora deste pacote para não arriscar entregar algo
não testado — mas se você quiser, posso implementar essa migração como próximo passo.

## Antes de publicar

1. Crie a coleção `admins` no Firestore manualmente (pelo Console) com um documento contendo
   `{ nome, email, senhaHash }` — gere o hash rodando no console do navegador:
   `await crypto.subtle.digest('SHA-256', new TextEncoder().encode('CapoeiraLiberdade::v1::SUA_SENHA'))`
   (ou simplesmente tente logar uma vez com a senha desejada e capture o hash pelo log de erro,
   depois cole manualmente no Firestore).
2. Publique `firestore.rules` no seu projeto Firebase.
3. Apague `senha.txt` do repositório/hospedagem — credenciais nunca devem ficar em arquivo texto público.
