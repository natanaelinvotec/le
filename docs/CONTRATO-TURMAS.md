# Contrato técnico — Turmas por arte marcial (v37)

Repositório: este diretório (`le-v4`). App: HTML + CSS + JavaScript vanilla (ES modules, sem build),
Firebase (Auth, Firestore, Storage, Functions). Idioma de tudo (código, comentários, UI): português do Brasil.
Paleta institucional: teal #389E92, navy #002D72, verde #00E676, fundo #EAF2F1. Transições suaves
`cubic-bezier(0.16, 1, 0.3, 1)`. Botões simples, limpos, fáceis de entender (pedido explícito do dono).

## Conceito
- NÚCLEO (`nucleos/{id}`, campo `academiaId` nos usuários) continua sendo a casa: Rede, avisos, materiais,
  identidade, Painel do Fundador. Já existe e não muda.
- TURMA (`turmas/{id}`) = uma arte marcial dentro do núcleo, com os próprios alunos, presenças, graduação
  (escada da arte), mensalidade, relatórios e brasões da arte. Nada se mistura entre turmas.
- Aluno: `usuarios/{uid}.turmaId` (string). SEM `turmaId` = TURMA PADRÃO do núcleo (a que sempre existiu,
  virtual, usa a escada da escola). Assim a Liberdade e escolas antigas migram sem tocar em nenhum aluno.
- Turma ativa no painel: `localStorage['le.turma.<academiaId>']` ('' = padrão). Trocar a turma ativa troca
  a escada em uso e filtra TODO o painel (alunos, presenças, graduação, financeiro, relatórios, árvore).

## Módulo compartilhado `js/turmas.js` (já escrito — USE, não reimplemente)
```js
import { PALETA_TURMAS, COR_PADRAO, corOk, graduacaoDaArte, ARTES, turmaPadrao, carregarTurmas, turmasPublicas,
  buscarTurma, limparCacheTurmas, validarTurma, criarTurma, atualizarTurma, turmaAtivaId, definirTurmaAtiva,
  turmaIdDe, turmaDe, filtrarPorTurma, contarPorTurma, usarEscadaDa, rotuloTurma, descricaoHorario, nomeArte,
  seletorTurmaHTML, formTurmaHTML, lerFormTurma, ligarFormTurma, etiquetaTurmaHTML, garantirEstilosTurma, NOME_DIA } from './turmas.js';
```
- `turmaPadrao(academia)` → `{ id:'', padrao:true, nome, arte, cor, graduacao, escada:null, academiaId }`.
- `carregarTurmas(academiaId)` → lista (sem a padrão), cache por núcleo; `{forcar:true}` recarrega.
- `criarTurma(academia, dadosDoForm, sessao)` grava `turmas/{id}` com `escolaId` (claim), `academiaId`, `escada = escadaLimpa(escadaPadrao(arte))`.
- `filtrarPorTurma(lista, turmaId, turmas)`; `contarPorTurma(lista, turmas)` → `{ '': n, [id]: n }`.
- `usarEscadaDa(turma)` → aplica a escada da turma nas listas globais `CORDOES_ADULTO/KIDS/ORDEM_CORDOES/IDADE_KIDS/CRITERIOS`
  de `js/escola.js` (turma padrão → volta à escada da escola). Chame ANTES de redesenhar qualquer coisa que use a escada.
- `seletorTurmaHTML({turmas, ativaId, contagem, academia, podeCriar})` → HTML do bloco da barra lateral
  (`#turmaBloco`, `#turmaAtualBtn`, `#turmaLista` com `.turma-item[data-turma]`, `#turmaNovaBtn`). CSS vem de `garantirEstilosTurma()`.
- `formTurmaHTML({professores, sessao, academia})` + `ligarFormTurma(raiz)` + `lerFormTurma(raiz)` → formulário "Nova turma".
- `etiquetaTurmaHTML(turma)` → pílula pequena na cor da turma (vazia para a padrão).

## `js/escola.js` (já alterado)
- `aplicarEscada(e)`, `escadaAtual()`, `escadaDaEscola()`, `aplicarEscadaDaTurma(escadaOuNull)`.
- `rotuloGrad(nome, graus, grausVermelhos = 0)` → "Amarela · 4º grau + 2 vermelhos".

## `js/faixas.js` (já alterado)
- `faixaSVG(g, { graus, vagas, largura, altura, titulo, grausVermelhos })` — as primeiras `grausVermelhos`
  barras (mais perto da ponta) saem vermelhas (`COR_GRAU_VERMELHO = '#D32F2F'`).

## Graus (regras ditadas pelo dono, jiu-jitsu)
- Até `g.graus` (4) graus por faixa da branca à marrom, inseridos DA PONTA PARA CIMA (já é assim no SVG).
- Infantil (escada `kids`): depois dos 4 graus brancos entram graus VERMELHOS por cima dos brancos, também
  da ponta para cima. Campos: `usuarios.grausAtual` (brancos, 0–4) e `usuarios.grausVermelhos` (0–4, só infantil).
- Botão **"+ Adicionar grau"**: se `grausAtual < max` → `grausAtual + 1`; senão, se a escada da pessoa é a
  infantil e `grausVermelhos < max` → `grausVermelhos + 1`; senão desabilita com a dica "Máximo de graus — troque a faixa".
- Botão **"Trocar faixa"** SEMPRE disponível, com qualquer número de graus (quem decide é o professor): abre a
  escolha da faixa (a lista da escada) e, ao confirmar, zera `grausAtual` e `grausVermelhos`.
- Cada grau e cada troca viram um marco em `historicoGraduacoes` (formato existente:
  `{ cordao, grau?, anterior, anteriorGrau?, em, por, porNome, legado? }`; para vermelho acrescente `grauVermelho: n`).

## Regras do Firestore (quem mexe: agente de regras)
- `turmas/{id}`: read público (`allow read: if true` — nome, arte, cor, horário não são sensíveis; a inscrição sem login precisa);
  create/update por Fundador da escola (`fundadorDa(escolaId)`) ou gestor do núcleo (`ehGestor() && academiaId == minhaAcademiaGerenciada()`),
  sempre `escolaId == minhaEscola()`; delete só `ehAdmin()`.
- `usuarios`: `turmaId` e `grausVermelhos` entram em `camposTravadosDoProprio()` (o próprio atleta não mexe);
  autocadastro (inscrição) pode trazer `turmaId` (string) — nada mais muda.

## Servidor (functions)
- `functions/src/perfil.js`: copiar `turmaId` e `grausVermelhos` para `perfisPublicos` (lista de campos + montagem).
- `functions/src/gatilhos.js`: `CAMPOS_DA_CARTEIRINHA` += `grausVermelhos`, `turmaId`.
- `functions/src/carteirinha.js`: o rótulo da graduação usa a escada da TURMA (`turmas/{turmaId}.escada`) quando o aluno tem turma.
- `js/brasoes.js`, `js/escola.js`, `js/moderacao.js`, `js/modalidades.js` são copiados para `functions/src/compartilhado/` pelo
  workflow: NÃO use `document`/`window` fora de funções que só rodam no navegador.

## Carteirinha (modelo aprovado pelo dono = canvas "Mockup Turmas", tela 6)
- Mesma linguagem da carteirinha da Liberdade (fundo navy em gradiente com a cor da turma, guilhoché, brilho que
  varre, selo holográfico, micro-texto, matrícula em monoespaçada), LOGO COMO FOCO (marca d'água grande, logo no
  cabeçalho com anel, selo). Barra de baixo = a graduação: capoeira → cordão em 3 cores; faixas → corpo + ponteira
  com graus (vermelhos quando houver); níveis → N blocos acesos. Moldura da foto nas cores da graduação.
- Verso: QR, "Documento do atleta", MEMBRO DESDE, EM CASO DE PERDA, assinatura cursiva do professor responsável, logo,
  barra navy com o link de verificação `atletapay.com.br/<escola>/v/<código>`.

## Convenções
- Sem truncar lógica; sem `TODO` deixado para depois; `node --check` em cada .js alterado.
- Textos de UI em português, sem emoji. Sem bibliotecas novas. Mantenha o estilo do arquivo que está editando.
- Nunca grave campo à toa em escolas de capoeira (ex.: `grausVermelhos` só quando a escada tem graus).
