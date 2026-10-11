# Artes marciais no app — escadas, termos, critérios e brasões (v37)

Fonte única das escadas: `js/modalidades.js` (cópia idêntica em `functions/src/compartilhado/modalidades.js`;
um teste do servidor confere). Brasões: `js/brasoes.js` (campo `escopo`). Inclusão: `js/inclusao.js`.
As tabelas abaixo foram geradas a partir desses arquivos — mudou o código, regere a tabela.

## Como as telas usam

- **Escada em uso**: `usarEscadaDa(turma)` (js/turmas.js) aplica a escada da turma ativa nas listas de `js/escola.js`.
  Turma padrão → escada da escola. Cada graduação pode trazer `codigo` ("8º kyu", "10º gub", "1º dan", "P1"),
  `graus`/`ponteira` (barras de grau), `grauDan` (faixas que já são um dan: o rótulo soma `grauDan + graus`),
  `permanenciaMeses`, `requisitoMeses`, `grausMeses`, `idadeMin`/`idadeMax`, `titulo`, `nota`. `escadaLimpa` preserva tudo isso.
- **Identidade da arte**: `identidadeDa(arte)` → `{ icone, termoTreino, termoLuta, termoLocal, saudacao }`;
  `termosDa(arte)` → `{ treino, luta, local, saudacao, arte, lider, peca }` para montar frases.
- **Brasões por arte**: `brasoesParaArte(arte)` (gerais + exclusivos da arte), `visivelNaArte(brasao, arte)`,
  `filtrarPorArte(listaAvaliada, arte)`, `artesComBrasao()`. A Sala de Brasões (`brasoes.html`) filtra pela
  arte da turma ativa (`turmaAtivaId` + `turmaDe`; turma padrão → `ESCOLA.modalidade`) e agrupa em
  "Gerais" e "Da arte: <nome>". O servidor (`avaliar`) continua calculando todos — quem exibe filtra.
  Os exclusivos de cada arte são MANUAIS (`regra.tipo = 'manual'`): só entram por concessão, então nunca
  "caem" na conta de um atleta de outra arte. Ids nunca mudam.
- **Inclusão por arte**: `materiaisHTML(condicoes, { modo, arte })`, `dicasPara(condicao, arte)`,
  `adaptarTexto(texto, arte)`, `apoiosDaArte(arte)`, `nomeApoio(id, arte)`, `apoiosChecklistHTML(inclusao, { arte })`,
  `apoiosHTML(inclusao, { arte })`, `materialDisponivel(id, arte)`. Os PDFs existentes em `materiais/inclusao/`
  são todos da capoeira (`tea.pdf`, `tdah.pdf`, `pc.pdf`, `sd.pdf`, `di.pdf`, `dvda.pdf`, `tdc.pdf`,
  `guia-inclusao-capoeira.pdf`); `MATERIAIS_EXISTENTES` diz o que há. Para outra arte o cartão aponta para o
  PDF geral com a legenda "guia geral (adaptado de capoeira) — versão para <arte> em preparação". Ao subir um
  PDF por arte, nomeie `<condicao>-<arte>.pdf` / `guia-inclusao-<arte>.pdf` e acrescente a chave em `MATERIAIS_EXISTENTES`.

## Fontes consultadas (11/10/2026)

| Arte | Sistema adotado | Fonte |
|---|---|---|
| Jiu-jitsu | Quadro CBJJ/IBJJF (faixas, graus, tempos, infantil até 15) | Quadro enviado pelo dono em 08/10/2026 (já estava no código) |
| Judô | Regulamento de Graduação da CBJ (09/02/2011): kyu com idade mínima e carência; pontas na escada infantil; preta aos 16; dan 2º–5º com 4/5/6/6 anos; vermelha e branca 6º–8º; vermelha 9º–10º | https://cbj.com.br/public/uploads/documentos/REGULAMENTO DE_GRADUACAO - DIVULGADO EM 09 DE FEV 2011.pdf |
| Taekwondo | WT/Kukkiwon como a CBTKD usa: 10º→1º gub com pontas, preta (dan) a partir dos 15; menores recebem poom | Regulamento específico de Taekwondo dos JEEGs 2026 (gub 8º = amarela, 3º = azul-escura, 2º = vermelha; https://goias.gov.br/educacao/wp-content/uploads/sites/40/2026/03/REGULAMENTO_ESPECIFICO_TAEKWONDO_JEEGS-2026-1.pdf) + regra Kukkiwon de poom para menores de 15 |
| Muay Thai | Prajied/kruang da Confederação Brasileira de Muay Thai (CBMT): branca → vermelha → azul-clara → azul-escura → preta → preta e branca → preta, branca e vermelha, sempre com a ponta anunciando a próxima | https://www.significados.com.br/muay-thai/ e https://blog.portaleducacao.com.br/as-cores-no-muaythai/ (ambas citam a CBMT). O arco-íris "branca, amarela, laranja, verde, azul, roxa, vermelha, marrom, preta" pedido na tarefa NÃO é o da CBMT — é variante de academias; a escola troca em Graduação |
| Kickboxing | Graduação CBKB/WAKO: branca, laranja, azul, amarela, verde, marrom, marrom ponta preta, preta (dan) | https://www.auditorioibirapuera.com.br/quais-sao-as-faixas-de-kickboxing/ (FKBERJ/CBKB) |
| Karatê | Kyu/dan; sequência Shotokan mais comum no Brasil (branca, amarela, vermelha, laranja, verde, roxa, marrom 2º–1º kyu, preta). Varia por estilo: a CBKT (Karatê Tradicional) começa em cinza 8º kyu e azul 7º kyu | https://def.uem.br/cdr/comunidade-externa/karate-do-tradicional/ProgramadeFaixasCBKTFKTPr.pdf (programa CBKT) + conhecimento geral do Shotokan |
| Krav Maga | Escolhido o sistema de NÍVEIS da IKMF: P1–P5, G1–G5, E1–E5 (patch, não faixa; cores só visuais). A linha FSAKM usa faixas branca→preta — a escola troca em Graduação | Sistema de graduação IKMF (conhecimento geral; sem documento oficial consultado) |
| Boxe, MMA, Wrestling | Sem faixa: níveis que o treinador reconhece (Iniciante, Intermediário, Avançado, Competidor, Profissional; wrestling sem Profissional) | Decisão do produto |
| Kung Fu | Sem padrão nacional único; mantida a escada anterior (branca, amarela, verde, azul, marrom, preta), editável | — |
| Capoeira | `js/escola.js` (cordões da Liberdade) | — |

## Tabela por arte

### Capoeira (`capoeira`)

| Campo | Valor |
|---|---|
| Peça / líder | cordão / Mestre |
| Escada adulta | js/escola.js (cordões da escola) |
| Graus / ponteira | — |
| Infantil | js/escola.js (CORDOES_KIDS, até 11 anos) |
| Termos (identidade) | ícone `fa-drum`, treino: treino, luta: jogo, local: roda, saudação: Salve |
| Critérios | js/escola.js (CRITERIOS da capoeira) |
| Brasões exclusivos | `iniciante`, `escravo`, `fugitivo`, `quilombola`, `vagante`, `liberto`, `instrutor`, `professor`, `mestre`, `mestre-fundador`, `batizado`, `roda-aberta`, `canta-muito`, `ginga-muito`, `primeiro-au-estrela-cadente`, `primeira-ponte`, `primeira-acrobacia`, `tocou-berimbau-na-roda`, `tocou-atabaque`, `aniversario-de-capoeira`, `trajetoria-completa`, `mostrou-o-cordao`, `dois-batizados`, `cinco-batizados`, `puxou-a-ladainha` |
| O que falta | PDFs próprios (7 condições + guia) |

### Jiu-jitsu (`jiujitsu`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Professor |
| Escada adulta | Branca ×4 graus → Azul ×4 graus → Roxa ×4 graus → Marrom ×4 graus → Preta ×6 graus → Coral vermelha e preta → Coral vermelha e branca → Vermelha |
| Graus / ponteira | Branca: 4 graus; Azul: 4 graus; Roxa: 4 graus; Marrom: 4 graus; Preta: 6 graus; Coral vermelha e preta: grau 7; Coral vermelha e branca: grau 8; Vermelha: grau 9 |
| Infantil | até 15 anos: Branca ×4 graus → Cinza ×4 graus → Amarela ×4 graus → Laranja ×4 graus → Verde ×4 graus |
| Termos (identidade) | ícone `fa-user-ninja`, treino: treino, luta: rola, local: tatame, saudação: Oss |
| Critérios | Postura e base, Quedas, Guarda, Passagem de guarda, Raspagens, Finalizações, Defesa pessoal, Respeito, Disciplina, Pontualidade, Frequência, Higiene, Aprendizado |
| Brasões exclusivos | `jj-primeira-finalizacao`, `jj-primeiro-grau`, `jj-faixa-nova`, `jj-competidor`, `jj-primeiro-rola`, `jj-cem-rolas`, `jj-primeira-raspagem`, `jj-passou-a-guarda`, `jj-kimono-limpo`, `jj-open-mat` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Judô (`judo`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Sensei |
| Escada adulta | Branca (iniciante) → Cinza (10º kyu) → Azul (8º kyu) → Amarela (6º kyu) → Laranja (4º kyu) → Verde (3º kyu) → Roxa (2º kyu) → Marrom (1º kyu) → Preta (1º dan) ×4 graus → Vermelha e branca (6º dan) ×2 graus → Vermelha (9º dan) ×1 graus |
| Graus / ponteira | Preta: grau 1–5; Vermelha e branca: grau 6–8; Vermelha: grau 9–10 |
| Infantil | até 14 anos: Branca (iniciante) → Branca ponta cinza (11º kyu) → Cinza (10º kyu) → Cinza ponta azul (9º kyu) → Azul (8º kyu) → Azul ponta amarela (7º kyu) → Amarela (6º kyu) → Amarela ponta laranja (5º kyu) → Laranja (4º kyu) → Verde (3º kyu) → Roxa (2º kyu) → Marrom (1º kyu) |
| Termos (identidade) | ícone `fa-people-arrows`, treino: treino, luta: randori, local: tatame, saudação: Oss |
| Critérios | Ukemi (quedas), Nage-waza (projeções), Ne-waza (solo), Kumi-kata (pegada), Randori, Etiqueta (rei) e disciplina, Frequência, Aprendizado |
| Brasões exclusivos | `judo-primeiro-ippon`, `judo-ukemi`, `judo-primeiro-shiai` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Karatê (`karate`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Sensei |
| Escada adulta | Branca (iniciante) → Amarela (7º kyu) → Vermelha (6º kyu) → Laranja (5º kyu) → Verde (4º kyu) → Roxa (3º kyu) → Marrom (2º e 1º kyu) ×2 graus → Preta (1º dan) ×4 graus |
| Graus / ponteira | Marrom: 2 graus; Preta: grau 1–5 |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-hand-fist`, treino: treino, luta: kumite, local: dojo, saudação: Oss |
| Critérios | Kihon (fundamentos), Kata, Kumite, Postura (dachi), Kime (potência), Etiqueta e disciplina, Frequência, Aprendizado |
| Brasões exclusivos | `karate-primeiro-kata`, `karate-primeiro-kumite`, `karate-oss` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Taekwondo (`taekwondo`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Sabom |
| Escada adulta | Branca (10º gub) → Branca ponta amarela (9º gub) → Amarela (8º gub) → Amarela ponta verde (7º gub) → Verde (6º gub) → Verde ponta azul (5º gub) → Azul (4º gub) → Azul ponta vermelha (3º gub) → Vermelha (2º gub) → Vermelha ponta preta (1º gub) → Preta (1º dan) ×8 graus |
| Graus / ponteira | Preta: grau 1–9 |
| Infantil | até 14 anos: Branca (10º gub) → Branca ponta amarela (9º gub) → Amarela (8º gub) → Amarela ponta verde (7º gub) → Verde (6º gub) → Verde ponta azul (5º gub) → Azul (4º gub) → Azul ponta vermelha (3º gub) → Vermelha (2º gub) → Vermelha ponta preta (1º gub) → Poom (1º poom) ×3 graus |
| Termos (identidade) | ícone `fa-shoe-prints`, treino: treino, luta: kyorugi, local: dojang, saudação: Taekwon |
| Critérios | Chutes (chagi), Poomsae, Kyorugi (combate), Base e postura, Flexibilidade, Etiqueta e disciplina, Frequência, Aprendizado |
| Brasões exclusivos | `tkd-primeiro-poomsae`, `tkd-chute-alto`, `tkd-primeiro-kyorugi` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Muay Thai (`muaythai`)

| Campo | Valor |
|---|---|
| Peça / líder | prajied / Kru |
| Escada adulta | Branca → Branca ponta vermelha → Vermelha → Vermelha ponta azul-clara → Azul-clara → Azul-clara ponta azul-escura → Azul-escura → Azul-escura ponta preta → Preta → Preta e branca → Preta, branca e vermelha |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-hand-fist`, treino: treino, luta: sparring, local: ringue, saudação: Sawasdee |
| Critérios | Base e guarda, Socos e cotovelos, Chutes e joelhadas, Clinch, Defesas e esquivas, Condicionamento, Wai Kru e respeito, Frequência |
| Brasões exclusivos | `mt-primeira-luta`, `mt-primeiro-sparring`, `mt-cem-rounds`, `mt-clinch-forte` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Boxe (`boxe`)

| Campo | Valor |
|---|---|
| Peça / líder | nível / Treinador |
| Escada adulta | Iniciante (nível 1) → Intermediário (nível 2) → Avançado (nível 3) → Competidor (nível 4) → Profissional (nível 5) |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-hand-back-fist`, treino: treino, luta: sparring, local: ringue, saudação: Bom treino |
| Critérios | Guarda e base, Jab e direto, Ganchos e uppercuts, Esquivas e bloqueios, Movimentação de pés, Condicionamento, Sparring, Frequência |
| Brasões exclusivos | `boxe-primeira-luta`, `boxe-primeiro-sparring`, `boxe-cem-rounds`, `boxe-guarda-solida`, `boxe-toque-de-luvas` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Kickboxing (`kickboxing`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Treinador |
| Escada adulta | Branca → Laranja → Azul → Amarela → Verde → Marrom → Marrom ponta preta → Preta (1º dan) ×4 graus |
| Graus / ponteira | Preta: grau 1–5 |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-bolt`, treino: treino, luta: sparring, local: ringue, saudação: Bom treino |
| Critérios | Guarda e base, Socos, Chutes, Defesas e esquivas, Combinações, Condicionamento, Sparring, Frequência |
| Brasões exclusivos | `kb-primeira-luta`, `kb-primeiro-sparring`, `kb-cem-rounds` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### MMA (`mma`)

| Campo | Valor |
|---|---|
| Peça / líder | nível / Coach |
| Escada adulta | Iniciante (nível 1) → Intermediário (nível 2) → Avançado (nível 3) → Competidor (nível 4) → Profissional (nível 5) |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-shield-halved`, treino: treino, luta: sparring, local: tatame, saudação: Bom treino |
| Critérios | Striking (luta em pé), Wrestling e quedas, Grappling (solo), Defesa de queda, Clinch e grade, Condicionamento, Sparring, Disciplina |
| Brasões exclusivos | `mma-primeira-luta`, `mma-primeiro-sparring`, `mma-primeira-finalizacao`, `mma-cinturao` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Wrestling (luta olímpica) (`wrestling`)

| Campo | Valor |
|---|---|
| Peça / líder | nível / Treinador |
| Escada adulta | Iniciante (nível 1) → Intermediário (nível 2) → Avançado (nível 3) → Competidor (nível 4) |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-people-arrows`, treino: treino, luta: combate, local: tatame, saudação: Bom treino |
| Critérios | Base e postura, Quedas (takedowns), Defesa de queda (sprawl), Pegadas e controle, Trabalho de solo, Condicionamento, Disciplina, Frequência |
| Brasões exclusivos | `wr-primeira-queda`, `wr-primeiro-combate`, `wr-pegada-de-ferro` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Krav Maga (`kravmaga`)

| Campo | Valor |
|---|---|
| Peça / líder | nível / Instrutor |
| Escada adulta | Iniciante (P0) → Practitioner 1 (P1) → Practitioner 2 (P2) → Practitioner 3 (P3) → Practitioner 4 (P4) → Practitioner 5 (P5) → Graduate 1 (G1) → Graduate 2 (G2) → Graduate 3 (G3) → Graduate 4 (G4) → Graduate 5 (G5) → Expert 1 (E1) → Expert 2 (E2) → Expert 3 (E3) → Expert 4 (E4) → Expert 5 (E5) |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-shield-halved`, treino: treino, luta: simulação, local: tatame, saudação: Kida |
| Critérios | Postura e base, Golpes (socos e chutes), Defesas contra agarrões, Defesa contra armas, Consciência situacional, Condicionamento, Controle emocional, Frequência |
| Brasões exclusivos | `km-primeira-defesa`, `km-primeira-simulacao` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Kung Fu (`kungfu`)

| Campo | Valor |
|---|---|
| Peça / líder | faixa / Sifu |
| Escada adulta | Branca → Amarela → Verde → Azul → Marrom → Preta |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-dragon`, treino: treino, luta: sanda, local: kwoon, saudação: Ni hao |
| Critérios | Posturas (bases), Formas (taolu), Golpes de mão, Chutes, Sanda (combate), Flexibilidade, Disciplina, Frequência |
| Brasões exclusivos | `kf-primeira-forma`, `kf-primeiro-sanda` |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |

### Outra arte marcial (`outra`)

| Campo | Valor |
|---|---|
| Peça / líder | graduação / Professor |
| Escada adulta | Iniciante → Intermediário → Avançado |
| Graus / ponteira | — |
| Infantil | sem sistema infantil oficial |
| Termos (identidade) | ícone `fa-medal`, treino: treino, luta: sparring, local: tatame, saudação: Bom treino |
| Critérios | Técnica, Condicionamento, Respeito, Disciplina, Pontualidade, Frequência, Eventos e competições, Higiene, Aprendizado, Fundamentos |
| Brasões exclusivos | — |
| O que falta | falta: PDFs de inclusão próprios (usa o guia geral da capoeira com legenda); arte própria dos brasões exclusivos (hoje reaproveitam PNG/WebP existentes) |


## Pendências

- PDFs de inclusão por arte (hoje só capoeira). Prioridade: jiu-jitsu (há escola ativa), depois boxe/muay thai/MMA.
- Arte própria (PNG 1024 + WebP 384 + thumb) dos brasões exclusivos de boxe, muay thai, MMA, taekwondo, judô, karatê,
  kickboxing, wrestling, krav maga e kung fu — hoje reaproveitam `jj-brasao-*` e `brasao-72-competidor`. Para trocar a arte
  basta mudar `arquivo` no catálogo (o id não muda).
- Capoeira dentro de uma TURMA (não a padrão): `escadaPadrao('capoeira')` ainda devolve a escada genérica (Iniciante,
  Intermediário, Avançado) porque a Liberdade usa `js/escola.js`; se um núcleo de outra arte abrir uma turma de capoeira,
  copie os cordões de `escola.js` para `MODALIDADES.capoeira.adulto/kids`.
- `atletapay/js/catalogo.js` (cadastro da plataforma) ainda lista o arco-íris do muay thai e não tem kickboxing/wrestling/krav maga.
