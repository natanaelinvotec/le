repo: natanaelinvotec/le
branch: main

## Last sync
date: 2026-09-10T04:30:34Z

### Updated in this project
- Landing page pública (index.html) com dados reais do grupo: núcleos, mestres, cordões, agenda e loja.
- Painel de gerenciamento do site com senha (gerenciar.html) — edita textos, imagens, academias, mestres, agenda e loja.
- App do aluno e Painel do Mestre redesenhados como protótipo mobile (App Capoeira.dc.html).
- Correção pendente no repo: campo do responsável deve aparecer para menores de 18 (hoje é 12).

## Screen map
| Tela do projeto | Arquivos do repositório |
|---|---|
| index.html (landing) | aluno.html, admin.js, inscricao.html, logo-liberdade150.png |
| gerenciar.html (CMS do site) | — (novo; espelha os dados de aluno.html e admin.js) |
| App Capoeira.dc.html (app aluno + painel do mestre) | aluno.html (cordões, critérios, mensalidade, loja, videoaulas), admin.js (regras de kids/adulto, filtros, indicadores), login.js / login.html |

## Correções a aplicar no repositório
- `inscricao.js` linha 101: `if (idade >= 12)` → `if (idade >= 18)`
- `inscricao.js` linha 178: `if (idadeAluno >= 12)` → `if (idadeAluno >= 18)`
- `inscricao.html` linha 109: "Obrigatório para menores de 12 anos" → "menores de 18 anos"
- Não alterar as regras de cordão kids (`idade < 12`) — são independentes.
