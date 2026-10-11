# 03 — Referências de UI/UX, movimento e conversão (site v2 do AtletaPay)

Pesquisa feita em 11/10/2026. As páginas foram lidas via WebFetch e são retratos do momento: números e seções podem mudar. Os sites UFC Fight Pass, Tecnofit e EVO/W12 bloquearam a leitura automática (página vazia ou robots); onde aparecem abaixo, a informação veio de fontes secundárias.

---

## 0. O que cada referência faz (anotações rápidas)

| Site | O que vale copiar |
|---|---|
| **PFL** — pflmma.com | Herói = **próximo evento real** com contagem regressiva, data/hora explícitas, card de lutas e CTAs "Comprar ingresso / Ver confrontos". A urgência vem de um evento que existe de verdade. |
| **ONE Championship** — onefc.com | Card "Next Event" com status (Coming Soon / Live / Finished), CTAs duplos (Assistir / Ingressos), cards de atletas 3:2, vídeos 16:9 com duração visível. Ponto negativo: muitos pop-ups sobrepostos (cookie, clube, ingresso, newsletter, app). |
| **Gracie University** — gracieuniversity.com | Herói com **vídeo em loop + imagem de fallback**. A headline é a própria prova social, com número exato e não arredondado ("493773 alunos em 196 países"). CTAs: "Entrar grátis" + "Fazer o tour". Grade de "O que você quer fazer?" com 8 caminhos e 6 aulas gratuitas abertas, sem cadastro. |
| **Glofox (ABC)** — glofox.com | Herói com **vídeo em loop do painel real** de fundo, campo de e-mail + botão no próprio herói e notas G2/Capterra logo abaixo. Seletor "Quem atendemos" com 9 modalidades. **Tour do produto em abas (1/9)** com vídeos curtos de cada função. |
| **Mindbody** — mindbodyonline.com/business | Herói animado **com botão "Pausar animação"** (cumpre WCAG 2.2.2). Abas de funcionalidades com print real. Bloco "O que você recebe" (suporte, migração, setup 1:1). Estatística de receita com nota "os resultados variam", um exemplo de prova social honesta. |
| **Kicksite** — kicksite.com | Exemplo de **preço público por faixa de alunos** (US$ 49 a 199, "todas as funções em todos os planos"). Barra de confiança com 4 números (escolas, anos, nota, países). Abas de funções com GIF/vídeo, depoimentos em vídeo de professores conhecidos e seção própria de **graduação/faixas**. |
| **PushPress** — pushpress.com | Seletor "Feito para o seu tipo de academia" logo depois do herói. Casos com métrica no título ("Dominion MMA: de 20 para quase 400 alunos"). **Plano gratuito real** (Core Free US$ 0 + taxa por transação) e contrato mensal sem fidelidade. Ponto negativo: o preço só aparece escondido no FAQ. |
| **Zen Planner** — zenplanner.com | Tagline curta e concreta ("Run your MMA gym. Not spreadsheets."), FAQ que responde preço ("a partir de US$ 99/mês") e link para comparativos com concorrentes. Não tem vídeo nem teste grátis, só demo agendada. |
| **Wodify** — wodify.com | Vídeo no herói e resultados ligados ao logo do cliente (45% de crescimento etc.). Ponto negativo: modal promocional com texto *lorem ipsum* publicado, um alerta de QA. |
| **Whoop** — whoop.com | 3 planos anuais lado a lado, **teste grátis de 1 mês** como CTA secundário fixo e textos regulatórios/médicos no rodapé (transparência). |
| **Strava** — strava.com | Cadastro em 1 clique (Google / Apple / e-mail) já no herói. "Grátis para entrar, grátis para usar" e só depois o "Assinatura: mais recursos". Um único número grande de comunidade. |
| **Hevy** — hevyapp.com | Headline empilhada em 3 verbos ("Registre. Evolua. Mantenha a motivação."), nota 4,9 com **número de avaliações**, faixa "Saiu em" e um **cartão B2B separado para treinadores** (Hevy Coach). É o mesmo modelo aluno → professor do AtletaPay. |
| **Smoothcomp** — smoothcomp.com | Divide o público já no herói: organizador / professor / atleta, cada um com o seu "Saiba mais". Destaques: chaves, cronograma e placar em tempo real. |
| **BJJ Fanatics** — bjjfanatics.com | **Contraexemplo.** Contagem regressiva diária, "nunca mais verá esse preço", "primeiros 100 compradores", preços riscados e superlativos sem prova ("o mais confiável do mundo"). Vale estudar os bons pontos (autoridade dos instrutores, 96 mil avaliações), mas **não copiar a urgência**. |
| **Nike "Why Do It?" (2025)** — about.nike.com | O manifesto vem antes do produto: frase-pergunta curta, atletas reais e corte rápido de vídeo. Serve de tom para o herói, não de layout. |
| **21 TSI** (FWA/Awwwards/CSSDA) — 21tsi.com | Esporte em movimento com **grid suíço, monocromia e tipografia rígida**, transições com morphing e WebGL leve. Tudo em site estático para continuar rápido. |
| **Awwwards: categoria Esporte 2026** — awwwards.com/websites/sports | SOTD recentes: Lacoste Ace Breaker (gamificação jogável, Developer Award) e Nick Ho Motorsports (out/2026). Tendência: **interação jogável** e tipografia gigante. |
| **Next Fit (BR)** — nextfit.com.br | CTA "Demonstração gratuita" repetido, grade de modalidades (inclui lutas), seção de suporte com SLA ("chat responde em menos de 10 min") e agentes de IA no WhatsApp. Não mostra preço, não tem teste grátis e os depoimentos estavam vazios na leitura. |

---

## 1. Top 12 padrões para copiar

1. **Herói = vídeo curto e real + headline com promessa concreta** (Gracie University, Glofox). Loop de 6 a 10 s com cenas reais de treino (roda, faixa sendo amarrada, celular mostrando o termômetro). *Por que funciona:* o visitante entende o produto antes de ler.
2. **Dois CTAs no herói com pesos diferentes:** primário "Testar grátis, sem cartão" e secundário "Ver o painel por dentro (tour)" (Gracie "Join for free / Take the tour", Navattic). *Por que funciona:* o tour não pede compromisso e atende quem ainda não confia. Os melhores demos deixam o CTA acima da dobra.
3. **Seletor de modalidade logo após o herói** (PushPress, Glofox, Next Fit): Capoeira · Jiu-jitsu · Muay thai · Boxe · MMA · Judô, e o texto e as imagens trocam conforme a escolha. *Por que funciona:* o mestre de capoeira se vê no site, não "uma academia genérica".
4. **Tour interativo sem cadastro, de 5 a 8 passos** (Glofox 1/9; relatório Navattic 2025: demos sem formulário engajam cerca de 10% mais, e os melhores têm de 5 a 12 passos e cerca de 2 min). Passos para o AtletaPay: inscrição com foto → avaliação por estrelas → termômetro da graduação → cobrança Pix → repasse via split.
5. **Preço público e simples, por faixa de alunos** (Kicksite), com "todas as funções em todos os planos" e "sem fidelidade" (PushPress). *Por que funciona:* esconder preço é o padrão dos concorrentes, e mostrar gera confiança imediata.
6. **Prova social com número exato e verificável** (Gracie: "493773", não "500 mil+"). Para o AtletaPay em piloto: "X academias no piloto fechado · Y alunos avaliados", contados ao vivo pelo Firestore, ou nada. Em casos, a métrica vai no título com o nome da academia (PushPress).
7. **Disclaimer honesto junto da estatística** (Mindbody: "os resultados variam"). Toda métrica de caso traz período, base e fonte.
8. **Urgência só baseada em evento real** (PFL/ONE): "Próximo exame de cordão da sua turma: 14/11", ou "Vagas do piloto: 3 academias até 30/11" **se for verdade**, com data e critério públicos.
9. **Bloco "O que está incluso"** (Mindbody), com migração da planilha, ajuda no setup e suporte humano no WhatsApp com prazo de resposta declarado (Next Fit: "< 10 min").
10. **Um card para cada público** (Smoothcomp; Hevy com o cartão Coach): Dono/Mestre · Professor · Aluno/Responsável. Cada um tem o próprio CTA e a própria página.
11. **Visual de faixas e cordões como linguagem gráfica:** barras de progresso coloridas, cards de evento com status (Em breve / Ao vivo / Encerrado, como no ONE) e números grandes em fonte condensada. Grid rígido e tipografia forte, com movimento contido (21 TSI). *Por que funciona:* passa energia de luta sem cara de template.
12. **Controle de movimento visível e respeitoso:** botão "Pausar vídeo" no herói (Mindbody), animações que respeitam `prefers-reduced-motion` e nada de pop-ups empilhados (o contrário do ONE). Para microinterações, use a curva da casa `cubic-bezier(0.16,1,0.3,1)` em 200 a 400 ms, botão com leve escala ao pressionar e checagem animada ao concluir um passo do tour.

---

## 2. Cinco coisas que os concorrentes diretos NÃO fazem (diferencial AtletaPay)

Base: leitura das homes de Zen Planner, Kicksite, Glofox, PushPress, Wodify e Next Fit, mais fontes secundárias para Tecnofit, EVO/W12 e sistemas BR de lutas (NFE.io).

1. **Teste grátis sem cartão e sem vendedor.** Zen Planner, Kicksite, Glofox, Wodify e Next Fit levam tudo para "agendar demonstração". O AtletaPay deixa o mestre entrar e usar na hora (opt-in sem cartão é o modelo de 68% dos SaaS, segundo a Flint), com o WhatsApp como apoio e não como barreira.
2. **Demonstração interativa real do produto na própria página.** Nenhum dos concorrentes diretos tem tour clicável sem cadastro, só prints, GIFs ou vídeo. O "termômetro de prontidão" jogável no navegador vira a vitrine do produto.
3. **Pedagogia da graduação como centro, e não "belt tracking" como item de lista.** Os concorrentes tratam faixa como checkbox. O AtletaPay mostra a avaliação por fundamentos (estrelas) até a prontidão para o próximo cordão, com a capoeira como primeira cidadã (cordões, batizado, troca de cordão), algo que nenhum estrangeiro cobre.
4. **Pix nativo + split transparente explicado com números.** Os estrangeiros não têm Pix. Os BR citam Pix só como forma de pagamento do aluno. Diferencial: simulador público "Mensalidade R$ 120 → academia recebe R$ X, taxa R$ Y", com taxas por extenso e Pix Automático (BCB, desde 16/06/2025) para recorrência.
5. **Preço público em reais + prova social honesta e auditável.** Next Fit, Glofox, Wodify e Mindbody escondem preço. O AtletaPay publica a tabela, sem fidelidade, mostra o contador de academias e alunos ligado ao banco e se compromete por escrito a não usar urgência falsa (selo "Sem letras miúdas" com link para a política). A transparência vira argumento de venda.

---

## 3. Regras técnicas para o herói em vídeo

**Marcação base**
```html
<link rel="preload" as="image" href="/hero/poster-1280.avif" fetchpriority="high"
      imagesrcset="/hero/poster-720.avif 720w, /hero/poster-1280.avif 1280w" imagesizes="100vw">
<video class="hero-video" autoplay muted loop playsinline preload="metadata"
       poster="/hero/poster-1280.avif" aria-hidden="true" disablepictureinpicture>
  <source src="/hero/hero-720.av1.webm" type='video/webm; codecs="av01.0.05M.08"'>
  <source src="/hero/hero-720.vp9.webm" type="video/webm">
  <source src="/hero/hero-720.h264.mp4" type="video/mp4">
</video>
<button class="hero-pause" aria-pressed="false">Pausar vídeo</button>
```

**Regras**
1. **`autoplay muted loop playsinline` sempre.** Autoplay sem som é sempre permitido no Chrome. No iOS, `muted` libera o autoplay e `playsinline` evita a tela cheia no iPhone. O WebKit pausa o vídeo fora da tela.
2. **Poster obrigatório**, no mesmo enquadramento do 1º frame, em AVIF/WebP com menos de 60 KB e mesma proporção do vídeo, com `object-fit: cover`. O LCP usa o **mais cedo entre o poster e o 1º frame**, por isso o poster com preload `fetchpriority="high"` é o que define o LCP. **Não** dê preload no arquivo de vídeo (o Chrome não suporta).
3. **Meta: LCP ≤ 2,5 s no p75 em celular.** A headline em texto HTML também concorre ao LCP: renderize o texto já no HTML, sem esperar JS ou fonte (`font-display: swap` e preload só da fonte do título).
4. **Peso:** loop de 6 a 10 s, **sem trilha de áudio** (`-an`), 720p no mobile e 1080p no desktop, com alvo de **menos de 1,5 MB no mobile e menos de 3 MB no desktop**. Ordem das fontes: AV1 WebM → VP9 WebM → H.264 MP4. A WebM vem primeiro porque o navegador usa a primeira fonte suportada.
5. **Carregar o vídeo só quando fizer sentido:** no mobile ou com `navigator.connection.saveData`/`effectiveType` em "2g"/"3g", mostre **só o poster**. Para vídeos fora do herói, use IntersectionObserver para trocar o `src`.
6. **`prefers-reduced-motion: reduce` → sem vídeo** (`video.pause()` + poster) e sem parallax ou scroll-jacking.
7. **Botão "Pausar" visível e acessível por teclado** (WCAG 2.2.2: movimento automático com mais de 5 s precisa de pausar/parar/ocultar). Guarde a escolha em `localStorage` dentro de try/catch.
8. **Nunca presuma que o vídeo tocou:** trate a rejeição de `video.play()` (por exemplo, no Modo Pouca Energia do iOS) mostrando o poster, e só mostre o botão "Pausar" se o vídeo estiver tocando de fato (orientação do Chrome).
9. **Contraste do texto sobre o vídeo:** overlay em gradiente (#002D72 a 60–75%) para manter 4,5:1 em qualquer frame. O vídeo é decorativo (`aria-hidden`), então a mensagem toda fica no texto.
10. **Sem CLS:** reserve a altura do herói com `aspect-ratio` ou `min-height: 100svh` e não injete banner acima do herói depois do carregamento.
11. **Hospedagem:** arquivos estáticos no Firebase Hosting/CDN com `Cache-Control: public, max-age=31536000, immutable` e nome com hash. Nada de embed do YouTube no herói, porque o iframe pesado piora LCP e INP.

---

## 4. Conversão no Brasil e limites éticos/legais (resumo aplicável)

- **WhatsApp é o canal principal:** 82% dos pequenos negócios o usam como principal canal de comunicação e vendas (Sebrae, Pulso dos Pequenos Negócios, abr/2026). Use um botão flutuante "Falar com um mestre do time" com mensagem pré-preenchida, sem coletar dado antes.
- **Pix:** o Pix Automático (recorrência) entrou em vigor em 16/06/2025. Destaque "mensalidade no Pix Automático, sem boleto e sem maquininha".
- **Teste sem cartão:** é o modelo dominante (68% dos SaaS). Gera mais cadastros com menos fricção. A qualificação vem do onboarding e do WhatsApp, não do cartão.
- **O que é proibido ou arriscado (não fazer):**
  - **CDC art. 37:** publicidade enganosa, inclusive por omissão, é proibida. **Art. 30:** a oferta vincula, ou seja, o que estiver no site tem de ser cumprido. **Art. 38:** quem anuncia é quem precisa provar que é verdade. **Art. 67:** publicidade enganosa é crime.
  - **Decreto 7.962/2013 (e-commerce):** exige CNPJ, endereço, preço total com taxas, condições e restrições da oferta em destaque, resumo do contrato antes de contratar e cancelamento pelo mesmo meio usado para contratar (art. 5).
  - **Academias pequenas podem ter proteção do CDC** quando comprovam vulnerabilidade (teoria finalista mitigada, STJ AgInt no AREsp 1.454.583/PE). Trate o mestre como consumidor.
  - **Padrões manipulativos a evitar** (Idec, 2024; FTC, "Bringing Dark Patterns to Light", 2022): contador que reinicia, "restam 2 vagas" inventado, preço riscado fictício, teste grátis que vira cobrança sem aviso, cancelamento difícil, *confirmshaming* ("Não, prefiro perder alunos"), depoimento ou logo de quem não é cliente, pop-ups empilhados e consentimento de cookies pré-marcado (LGPD).
  - **CONAR (Código Brasileiro de Autorregulamentação Publicitária):** depoimentos precisam ser reais e autorizados (Anexo Q, testemunhais).

---

## 5. Fontes

**Sites de referência (lidos em 11/10/2026)**
- PFL — https://www.pflmma.com/
- ONE Championship — https://www.onefc.com/
- Gracie University — https://www.gracieuniversity.com/
- Glofox — https://www.glofox.com/
- Mindbody Business — https://www.mindbodyonline.com/business
- Kicksite — https://www.kicksite.com/
- PushPress — https://www.pushpress.com/
- Zen Planner (MMA) — https://zenplanner.com/martial-arts-software/
- Wodify — https://www.wodify.com/
- Whoop — https://www.whoop.com/
- Strava — https://www.strava.com/
- Hevy — https://www.hevyapp.com/
- Smoothcomp — https://smoothcomp.com/en
- BJJ Fanatics (contraexemplo) — https://bjjfanatics.com/
- Next Fit — https://nextfit.com.br/
- Nike "Why Do It?" (2025) — https://about.nike.com/newsroom/releases/nike-why-do-it-campaign
- 21 TSI / Codrops (jul/2025) — https://tympanus.net/codrops/2025/07/21/beyond-the-corporate-mold-how-21-tsi-sets-the-future-of-sports-in-motion/
- Awwwards: Esporte — https://www.awwwards.com/websites/sports/
- Sistemas BR para lutas (NFE.io, 2023) — https://nfe.io/blog/gestao-empresarial/melhores-sistemas-academia-artes-marciais/

**Vídeo, performance e acessibilidade**
- web.dev: LCP — https://web.dev/articles/lcp
- web.dev: Video performance — https://web.dev/learn/performance/video-performance
- DebugBear: Optimize video LCP — https://www.debugbear.com/blog/optimize-video-lcp
- Chromium: mudança no LCP para vídeo (2023) — https://chromium.googlesource.com/chromium/src/+/main/docs/speed/metrics_changelog/2023_08_lcp.md
- Chrome: Autoplay policy — https://developer.chrome.com/blog/autoplay
- WebKit: New video policies for iOS — https://webkit.org/blog/6784/new-video-policies-for-ios/
- WCAG 2.2.2 Pause, Stop, Hide — https://wcag.com/designers/2-2-2-pause-stop-hide/
- MDN: prefers-reduced-motion — https://developer.mozilla.org/docs/Web/CSS/@media/prefers-reduced-motion

**Conversão SaaS / Brasil**
- Navattic: State of the Interactive Product Demo 2025 — https://navattic.com/report/state-of-the-interactive-product-demo-2025
- Flint: B2B SaaS free trial conversion statistics — https://www.flint.com/blog/b2b-saas-free-trial-conversion-rate-statistics
- Sebrae: WhatsApp nas vendas on-line (abr/2026) — https://agenciasebrae.com.br/dados/whatsapp-se-consolida-nas-vendas-on-line-enquanto-facebook-e-lojas-proprias-perdem-folego/
- Pix Automático (16/06/2025) — https://timesbrasil.com.br/brasil/economia-brasileira/banco-central-lanca-hoje-o-pix-automatico-entenda-como-funciona/

**Ética e legislação**
- CDC (Lei 8.078/1990) — https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Decreto 7.962/2013 — https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm
- Idec: Deceptive patterns (2024) — https://idec.org.br/dicas-e-direitos/deceptive-patterns-voce-ja-ouviu-falar-de-padroes-enganosos
- Idec: Propaganda enganosa — https://idec.org.br/dicas-e-direitos/propaganda-enganosa
- ConJur: Dark patterns e LGPD (mai/2026) — https://www.conjur.com.br/2026-mai-21/dark-patterns-e-o-paradoxo-do-consentimento-na-lgpd/
- Dizer o Direito: CDC e pessoa jurídica (STJ) — https://www.dizerodireito.com.br/2023/12/em-regra-o-cdc-nao-e-aplicado-para-os.html
- FTC: Dark patterns report (2022), resumo — https://www.venable.com/insights/blogs/2022/09/the-ftc-brings-more-light-to-dark-patterns-in-new
- CONAR: Código — http://www.conar.org.br/codigo/codigo.php

---

## Resumo (10 linhas)

1. Os concorrentes diretos (Zen Planner, Kicksite, Glofox, Wodify, Next Fit) levam tudo para "agendar demo" e quase todos escondem o preço.
2. Copiar do esporte: o herói vira evento real com data (PFL/ONE), e a urgência vem do calendário, nunca de contador falso.
3. Copiar do SaaS: vídeo do painel no herói (Glofox), tour em abas e preço por faixa de alunos (Kicksite).
4. A prova social precisa de número exato e verificável (Gracie: 493773) e de "resultados variam" (Mindbody).
5. Os diferenciais do AtletaPay: teste sem cartão, tour clicável sem cadastro, pedagogia de graduação, Pix + split explicado e preço em R$.
6. O herói em vídeo leva `autoplay muted loop playsinline`, poster AVIF pré-carregado e nenhum preload do vídeo.
7. Peso: loop de 6 a 10 s sem áudio, AV1 → VP9 → H.264, menos de 1,5 MB no mobile, e só poster com reduced-motion ou Save-Data.
8. Botão "Pausar" é obrigatório (WCAG 2.2.2), e a meta é LCP ≤ 2,5 s no p75 mobile, com a headline em HTML.
9. Brasil: o WhatsApp é o canal de 82% dos pequenos negócios, e o Pix Automático (desde jun/2025) resolve a mensalidade.
10. Proibido: urgência ou escassez falsa, preço riscado fictício, cancelamento difícil e depoimento inventado (CDC arts. 30/37/38/67, Decreto 7.962, CONAR).
