# 01 — Estratégia de conversão e textos do site atletapay.com.br (v2)

Autor: estrategista de conversão / redator-chefe. Data: 11/10/2026.
Base: site atual (`le-v4/atletapay/index.html`), `CONTRATO-TURMAS.md`, `ARTES.md`, `DEMO-E-SESSOES.md`, `PESQUISA-MERCADO-2026.md` e os fatos do briefing. Nenhum número, depoimento ou contagem de clientes foi inventado. Onde um texto depende de algo que precisa ser confirmado com o dono, está marcado **[CONFIRMAR]**.

---

## 1. Narrativa e gancho

### A narrativa em uma frase
**"Tudo o que uma escola de verdade construiu no tatame em anos (app, carteirinha, graduação, cobrança, campeonato) está pronto para a sua escola hoje, e você pode abrir e mexer antes de pagar um centavo."**

### O gancho de curiosidade central: "Escolha o seu lutador"
O vídeo do herói tem 4 lutadores (capoeira, jiu-jitsu, muay thai, boxe). Abaixo do vídeo há 4 chips (mais "Outra arte ▾" com as 12) e a pergunta **"Qual é a sua arte?"**. Ao escolher, **o site inteiro se transforma para a arte da pessoa**, sem recarregar:

- o vocabulário muda (jiu-jitsu: "faixa", "tatame", "Oss"; capoeira: "cordão", "roda", "Salve"; muay thai: "prajied"), usando os termos que já existem em `ARTES.md`;
- a faixa da seção de graduação vira a escada daquela arte (faixas com graus, cordões, cordas, prajied, níveis);
- os brasões exibidos passam a ser os exclusivos da arte (ex.: `jj-primeira-finalizacao`, `puxou-a-ladainha`);
- a carteirinha do celular de exemplo ganha a cor e a peça daquela arte.

Segundo gancho, encadeado no primeiro: **"Digite o nome da sua escola"**. O mockup do celular mostra na hora `atletapay.com.br/<nome-da-escola>`, a carteirinha com esse nome e a tela de boas-vindas do aluno. Tudo acontece no navegador e nada é enviado ao servidor.

Por que funciona: a pessoa deixa de ler sobre um produto e passa a ver **a escola dela** dentro dele. O que ela ainda não sabe ("como fica o resto?") só se descobre rolando.

Fio visual da página: a **faixa amarrada** da marca é o indicador de progresso. Uma barra fina no topo é uma faixa que ganha 1 grau na ponta a cada marco da página (4 graus). No fim: "Quatro graus. Falta amarrar." Isso dá a sensação de caminho até a graduação, que é exatamente o que o produto vende.

Por que é ético: tudo o que a pessoa vê é o produto real (telas, escadas, termos e brasões que existem). A personalização é local, sem coleta de dados. Nenhuma informação é escondida para ser "liberada" em troca de e-mail.

---

## 2. Arquitetura (11 seções, em ordem)

| # | Seção | Objetivo | Mecanismo de curiosidade/FOMO honesto | Por que é ético |
|---|---|---|---|---|
| 1 | **Herói (vídeo)** | Parar o polegar em 2 s, dizer o que é e para quem, iniciar o gancho "escolha sua arte" | Interação que transforma o site; vídeo de 4 s em loop | Mostra o produto real; a escolha não exige cadastro |
| 2 | **Amanhã, no celular do aluno** | Fazer o dono imaginar o aluno abrindo o app da escola dele | Personalização ao vivo (nome da escola → endereço, carteirinha, boas-vindas) | Prévia local, nada é enviado; é o que o aluno vai ver de fato |
| 3 | **Sem / Com** | Nomear a dor (caderno, planilha, cobrar no grupo do WhatsApp) e mostrar a troca | Comparação lado a lado com um controle deslizante que "arrasta" o tatame bagunçado para o organizado | Descreve rotinas que a pessoa reconhece; sem estatística inventada |
| 4 | **Graduação na palma da mão** | Provar que o produto entende de faixa/cordão melhor que qualquer sistema genérico | Faixa interativa: "+ Adicionar grau" coloca grau da ponta para cima; no infantil, os vermelhos por cima dos brancos; "Trocar faixa" sempre livre; barra de prontidão enche | É a regra real do produto (`CONTRATO-TURMAS.md`); quem é do tatame confere na hora |
| 5 | **Uma escola, várias artes** | Mostrar turmas por arte e o Painel do Fundador | Revelação progressiva: o gráfico começa com 1 turma e, ao rolar, entram as outras, cada uma com a sua cor | Dados da escola fictícia, rotulados como exemplo |
| 6 | **O que o aluno conquista** | Gerar desejo e orgulho: carteirinha, certificado verificável, brasões, Rede | Brasões "trancados" que se revelam ao rolar ou ao tocar ("como se ganha?"); certificado com QR que abre página pública | Mostra a mecânica real de conquista; não promete resultado de retenção |
| 7 | **Dia de campeonato** | Mostrar o "uau" coletivo: chave ao vivo na TV | Chave que avança sozinha na tela (animação de exemplo) | Rotulado como exemplo; a função existe |
| 8 | **Escola inclusiva** | Diferencial humano: TEA, TDAH, PC, SD, DI, DV/DA, TDC | Laço discreto que se abre na chamada e mostra a ficha de apoios | Explica onde a informação aparece e onde não aparece (privacidade em primeiro plano) |
| 9 | **O dinheiro é seu** | Tirar o medo nº 1 ("vocês ficam com meu dinheiro?") e mostrar o custo real | Simulador: custo do plano vs. o que entra; campo opcional "quantos alunos atrasam por mês?" preenchido **pelo próprio dono** | Os números são do usuário e da tabela de preço; não prometemos recuperar inadimplência |
| 10 | **Não acredite no site. Abra o painel.** | Prova real: escola no ar e demo aberta sem login | "Desafio" de abrir a demo e uma escola real; contraste com concorrentes que pedem reunião | É verificável em 1 clique; prova em vez de promessa |
| 11 | **Preço + Dúvidas + Chamada final** | Fechar: um plano, preço de lançamento 2026, 14 dias grátis | Prazo real (assinaturas em 2026); faixa amarrada completa; "sua escola pode estar no ar hoje" | O prazo existe e não reinicia; o risco é zero (sem cartão, cancela quando quiser) |

Observação de layout: o cabeçalho tem "Entrar" e "Criar minha escola" fixos. No celular, a barra inferior fixa mostra "Ver demo" e "Criar grátis" depois que o herói sai da tela.

---

## 3. Textos finais, seção por seção

Tom: tatame. Frases curtas. Verbo na frente. Orgulho de quem treina. Nada de "solução completa", "revolucione", "otimize sua gestão".

### Seção 1 — Herói (vídeo)

**Título: 3 opções para teste A/B**
- **A:** O tatame é seu. O resto, a gente amarra.
- **B:** Sua escola no celular de cada aluno. Hoje.
- **C:** Feito no tatame. Pronto para o seu.

Recomendação: A como controle (conversa com a marca "A faixa amarrada"); B como desafiante (mais literal, tende a converter mais no tráfego frio); C para tráfego que veio de capoeira ou de indicação.

**Subtítulo:**
Site, app, carteirinha, graduação, campeonato e mensalidade via Pix direto na conta da academia. Para 12 artes marciais, e para a sua, se não estiver na lista.

**Pergunta-gancho (abaixo do vídeo):** Qual é a sua arte?
Chips: `Capoeira` `Jiu-jitsu` `Muay Thai` `Boxe` `Outra ▾`
Após escolher: "Pronto. O site agora fala [jiu-jitsu]. Role para ver a sua escola." (com o termo da arte: "Oss." / "Salve." aparece pequeno ao lado)

**Botões:**
- Primário: **Criar minha escola grátis**
- Secundário: **Abrir o painel de demonstração** (vai para `/demo`)

**Microcopy:** 14 dias grátis · Sem cartão · Cancela quando quiser · R$ 39,90/mês

Acessibilidade do vídeo: botão de pausar visível; com `prefers-reduced-motion`, mostrar o pôster parado. Legenda alternativa: "Quatro lutadores em movimento: capoeira, jiu-jitsu, muay thai e boxe."

### Seção 2 — Amanhã, no celular do aluno

- **Título:** Amanhã, isto está no celular do seu aluno.
- **Subtítulo:** Digite o nome da sua escola e veja como fica. Nada é salvo; é só para você ver.
- Campo: placeholder "Nome da sua escola" → o celular mostra `atletapay.com.br/suaescola`.
- Abas do celular (toque para trocar): **Carteirinha** · **Minha graduação** · **Brasões** · **Rede**
- Bullets ao lado:
  - App que instala na tela inicial. Sem loja, sem espera.
  - Site da escola com 5 modelos. Escolha um e troque quando quiser.
  - Inscrição com foto pelo celular. Menor de idade entra com o responsável.
  - Carteirinha com QR e a logo da escola em destaque.
- **Botões:** **Colocar a minha escola no ar** · **Ver uma escola real** (abre `atletapay.com.br/liberdadeeexpressao`)
- Nota de rodapé da prévia: "Prévia ilustrativa. O endereço definitivo é escolhido no cadastro."

### Seção 3 — Sem / Com

- **Título:** Segunda-feira, 19h. Duas academias.
- **Subtítulo:** Mesmo professor, mesma turma. Muda a ferramenta.
- Controle deslizante "Arraste" entre as duas colunas.

| Sem | Com AtletaPay |
|---|---|
| Chamada no caderno. Que some. | Chamada por QR ou reconhecimento facial. Fica no histórico. |
| "Professor, falta quanto para eu trocar de faixa?" | O aluno vê a barra de prontidão no celular. |
| Cobrar mensalidade no grupo do WhatsApp. Constrangimento. | Cobrança via Pix com lembrete. O dinheiro cai na conta da academia. |
| Certificado feito no editor de texto. | Certificado com página pública que qualquer um verifica. |
| Ficha de inscrição em papel, sem foto. | Inscrição com foto e responsável, direto no app. |
| Campeonato com chave na cartolina. | Chave ao vivo na TV. O pódio vira brasão. |

- **Botão:** **Quero a segunda-feira da direita**

### Seção 4 — Graduação na palma da mão

- **Título:** Graduação do jeito que o tatame faz.
- **Subtítulo:** Grau da ponta para cima. No infantil, vermelho por cima do branco. E "Trocar faixa" sempre livre, porque quem decide é o professor.
- Faixa interativa com os botões reais: **+ Adicionar grau** · **Trocar faixa** · alternador **Adulto / Infantil**
- Ao chegar no máximo: "Máximo de graus. Troque a faixa." (mesma dica do produto)
- Bullets (o texto muda conforme a arte escolhida no herói):
  - Faixas, cordões, cordas da capoeira contemporânea, prajied, níveis. Cada arte com a sua escada.
  - Avaliação por estrelas em cada fundamento.
  - Barra de prontidão para a próxima graduação, que o aluno acompanha no app.
  - Cada grau e cada troca ficam no histórico do aluno.
- **Botões:** **Montar a escada da minha escola** · **Ver no painel de demonstração**

### Seção 5 — Uma escola, várias artes

- **Título:** Jiu-jitsu às 18h. Muay thai às 19h30.
- **Subtítulo:** Cada arte vira uma turma, com a sua graduação, os seus horários e os seus alunos. Nada se mistura.
- Gráfico do Painel do Fundador: começa com 1 linha; ao rolar entram as outras ("cada cor, uma turma"). Rótulo fixo: "Exemplo: Academia Horizonte (escola fictícia da demonstração)".
- Bullets:
  - Vários horários por turma.
  - Painel do Fundador com gráficos por turma.
  - Troque a turma ativa e o painel inteiro se filtra.
  - Capoeira com cordões ou cordas. Muay thai com prajied. Jiu-jitsu kids com graus vermelhos.
- **Botões:** **Abrir o Painel do Fundador** (vai para `/demo/fundador`) · **Criar minhas turmas**

### Seção 6 — O que o aluno conquista

- **Título:** Treino que vira conquista.
- **Subtítulo:** Brasões que aparecem sozinhos, pelos dados reais: presença, graduação, pódio. Toque num brasão trancado para descobrir como se ganha.
- Grade de brasões: alguns abertos, a maioria em silhueta. Toque → "Como se ganha: [regra]".
- Bullets:
  - **75 brasões gerais + 42 por arte.** Conquistas automáticas.
  - **Carteirinha digital com QR**, estilizada com a logo da escola.
  - **Certificado de graduação** com página pública verificável.
  - **Rede do grupo** e **Rede Global** entre escolas.
  - **Árvore de formação**: a linhagem da escola, com fotos.
- **Botões:** **Ver um certificado verificável** [CONFIRMAR: link de um certificado público de exemplo] · **Dar isso aos meus alunos**

### Seção 7 — Dia de campeonato

- **Título:** Chave ao vivo. Na TV. Sem cartolina.
- **Subtítulo:** O árbitro marca no celular. A chave anda sozinha na tela. O pódio vira brasão e certificado.
- Bullets:
  - Categorias por graduação, peso e sexo.
  - Check-in pelo QR da carteirinha.
  - Tela de área com cronômetro, placar e "a seguir".
- **Botão:** **Quero campeonato na minha escola**
- Rótulo da tela de exemplo: "Exemplo ilustrativo".

### Seção 8 — Escola inclusiva

- **Título:** O professor sabe. A turma não precisa saber.
- **Subtítulo:** A família informa, se quiser, a condição e o que ajuda na aula. Vira um laço discreto na foto, visível só no painel do professor.
- Bullets:
  - TEA, TDAH, PC, síndrome de Down, DI, DV/DA e TDC.
  - Ficha de apoios marcada por quem conhece o aluno.
  - Aviso na chamada, quando o aluno chega.
  - Nunca na Rede, na carteirinha ou no perfil público.
  - Dados exportáveis a qualquer momento (LGPD).
- **Botões:** **Quero uma escola inclusiva** · **Ler o guia da equipe** (PDF atual)

### Seção 9 — O dinheiro é seu

- **Título:** A mensalidade cai na sua conta. Não na nossa.
- **Subtítulo:** O Pix vai direto para a conta da academia, numa instituição autorizada pelo Banco Central. A AtletaPay cobra só o plano, uma vez por mês.
- **Simulador** (3 controles):
  1. "Alunos ativos hoje" (10–1500)
  2. "Mensalidade média" (R$ 40–300)
  3. Opcional: "Quantos alunos atrasam ou esquecem por mês?" (0–50, padrão 0)
- Resultado mostrado:
  - "Seu plano: R$ X/mês" (R$ 39,90 até 80; acima, + R$ 0,49 por aluno ativo).
  - "Isso é Y% do que entra em mensalidades." (Ex.: 120 alunos × R$ 100 = R$ 12.000; plano R$ 59,50 = 0,5%.)
  - Se o campo 3 > 0: "Você disse que N alunos atrasam por mês. São R$ Z que você precisa cobrar todo mês. Com o lembrete automático, quem cobra é o app, não você."
- Nota obrigatória: "A tarifa do meio de pagamento (Pix) é descontada antes do repasse e aparece no extrato. Para R$ 100, a academia recebe cerca de R$ 98." (texto do site atual)
- **Botão:** **Começar com o meu número**

### Seção 10 — Prova real

- **Título:** Não acredite no site. Abra o painel.
- **Subtítulo:** Sem login, sem formulário, sem vendedor. A Academia Horizonte é uma escola fictícia com o painel de verdade. Mexa à vontade; recarregou, voltou ao começo.
- Três cartões:
  1. **Painel de gestão** — alunos, turmas, chamada, graduação, mensalidades. → **Abrir a demonstração**
  2. **Painel do Fundador** — gráficos por turma, cada cor uma turma. → **Abrir o Painel do Fundador**
  3. **Uma escola real no ar** — o Grupo de Capoeira Liberdade e Expressão, de Campo Grande (MS), onde a AtletaPay nasceu e é usada todo dia. → **Visitar a escola**
- Linha de origem: "Nasceu dentro de uma roda de capoeira. Hoje também roda no tatame do jiu-jitsu." [CONFIRMAR: autorização para citar o Team Igor pelo nome; se sim: "Segunda escola no ar: Team Igor, jiu-jitsu."]

### Seção 11 — Preço, dúvidas e chamada final

**Preço**
- **Título:** Um plano. Tudo dentro. R$ 39,90.
- **Subtítulo:** Até 80 alunos ativos, o valor é fixo. Passou disso, R$ 0,49 por aluno ativo, contado sozinho. Aluno inativo não conta.
- Cartão do plano "AtletaPay Completo":
  - Tudo liberado desde o primeiro dia: site, app, carteirinha, certificados, brasões, Rede, turmas, campeonatos, inclusão, Pix.
  - 14 dias grátis, sem cartão.
  - Cancela quando quiser, sem multa. Os dados saem com você (exportação LGPD).
- Selo de urgência honesta: **"Preço de lançamento para quem assinar em 2026."** [CONFIRMAR: quem assina em 2026 mantém o preço depois? Se sim, escrever "Assine em 2026 e mantenha este preço." Se não, escrever só "Preço de lançamento válido para assinaturas feitas em 2026." e dizer qual será a regra depois.]
- **Botão:** **Criar minha escola grátis**

**Dúvidas** (manter as 7 do site atual, que já são honestas, e acrescentar):
- *Dá para ter jiu-jitsu, muay thai e capoeira na mesma escola?* Sim. Cada arte vira uma turma, com a própria graduação e os próprios horários.
- *Preciso instalar alguma coisa?* Não. O app abre no navegador e se instala na tela inicial do celular.
- *A chamada por reconhecimento facial é obrigatória?* Não. Também dá para usar o QR da carteirinha ou marcar à mão. [CONFIRMAR o texto sobre consentimento da biometria.]

**Chamada final**
- **Título:** Quatro graus. Falta amarrar.
- **Subtítulo:** Sua escola pode estar no ar hoje. 14 dias grátis, sem cartão.
- **Botões:** **Amarrar a minha faixa** (primário; leva ao cadastro) · **Abrir a demonstração antes**

---

## 4. O que NÃO fazer

1. **Nada de número de cliente inventado**: "+500 escolas", "milhares de alunos", contador ao vivo de cadastros. Hoje são 2 escolas; dizer isso com orgulho ("nasceu numa escola real") convence mais.
2. **Nada de depoimento, nota de estrela ou logo de "parceiro" sem autorização por escrito.** Depoimento só com nome real, escola real e consentimento guardado.
3. **Nada de cronômetro falso** que reinicia ao recarregar, nem "só restam 3 vagas". O único prazo é o preço de lançamento de 2026, mostrado como data fixa.
4. **Números de exemplo sempre rotulados.** O placar do herói atual (R$ 18.760, 212 alunos, 4%) parece dado real. Em qualquer tela de exemplo, escrever "Exemplo: Academia Horizonte (fictícia)".
5. **Não prometer ganho**: nada de "aumente sua receita em 30%" ou "zere a inadimplência". O simulador usa só o número que o dono digitar.
6. **Não dizer "sem taxa"** sobre o Pix: há a tarifa do meio de pagamento, e ela precisa aparecer perto do simulador.
7. **Não vender o que ainda não existe** como pronto: recorrência no cartão, Pix Automático, reserva com lista de espera, exame com taxa, WhatsApp automático (são pontos cegos de `PESQUISA-MERCADO-2026.md`). Se entrar, só como "Em breve", com data real ou sem data.
8. **Sem "confirmshaming"** ("Não, prefiro perder alunos"). O botão de recusa é neutro: "Agora não".
9. **Sem pop-up de saída**, sem captura de e-mail para liberar a demo, sem chat que abre sozinho.
10. **Sem cartão escondido no "grátis"**: se o cadastro pedir cartão em algum momento, o texto "sem cartão" precisa sair do site.
11. **Prévia personalizada não grava nada.** Se um dia o campo "nome da escola" for enviado ao servidor (ex.: checar se o endereço está livre), avisar na tela e não guardar o nome sem consentimento. Não mostrar "disponível!" sem consulta real.
12. **Inclusão não é isca.** Nada de foto de criança com deficiência como chamariz, nem "escola inclusiva" como selo de marketing: o texto mostra a função e a privacidade.
13. **Cuidado com marcas e nomes de terceiros**: usar "reconhecimento facial" no site público (Face ID é marca da Apple); não comparar com concorrente pelo nome sem fonte e data na própria página.
14. **Movimento com freio**: vídeo e animações respeitam `prefers-reduced-motion`; nenhum conteúdo essencial só aparece com animação.

---

## Pendências para o dono [CONFIRMAR]
- O preço de lançamento fica travado para quem assinar em 2026?
- Podemos citar o Team Igor pelo nome?
- Link de um certificado público de exemplo (da Academia Horizonte, de preferência).
- "15 minutos para pôr a escola no ar" (texto do site atual): foi medido? Se não, usar "no ar hoje".
- "O que levou dois anos para construir" (texto do site atual): confirmar o prazo antes de reutilizar.
- Texto oficial de consentimento da biometria e a alternativa por QR.
