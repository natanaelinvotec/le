# 02 — Motion, formas e UI do site atletapay.com.br (v2)

Autor: diretor de motion e UI. Data: 11/10/2026.
Base: kit da marca "A faixa amarrada" (`logo-kit/*.svg`), vídeo e imagem do herói (`site-v2/ref/`), diretrizes do projeto (cubic-bezier(0.16, 1, 0.3, 1), glassmorphism, barras animadas, gradientes de faixa, menu hambúrguer), arquitetura de 11 seções de `01-estrategia-e-textos.md` e regras de vídeo de `03-referencias.md`.
Medições feitas de verdade neste documento: contraste WCAG de cada par de cores usado e pesos/qualidade (SSIM) de recompressões do vídeo com ffmpeg. Os números que não medi estão marcados como estimativa.

---

## 0. Dois achados no material bruto (resolver antes de codar)

1. **O loop do vídeo tem um corte seco.** O último quadro (nº 96) e o primeiro (nº 0) são muito diferentes: SSIM 0,19 (dois quadros vizinhos dão ~0,93). Também muda o zoom da câmera. Resultado: um "pulo" a cada 4 s. A correção com crossfade de 0,5 s (receita na seção 2.7) sobe a costura para SSIM 0,68 e deixa o loop com 3,54 s. O ideal é pedir ao gerador um loop com o primeiro e o último quadro iguais.
2. **O arquivo tem trilha de áudio AAC (204 kbps) e 5,7 Mbps de vídeo, 2,9 MB no total.** Para o site, o arquivo vai sem áudio e recomprimido. Medido: **293 KB no celular (AV1) e 474 KB no desktop (AV1)**, com H.264 de reserva (374 KB e 673 KB).

Contraste: três pares da paleta **reprovam** no AA para texto. Ver a tabela 5.1.
- **Branco sobre teal #389E92 dá 3,24:1** e não serve para texto de botão.
- **Teal #389E92 sobre fundo claro #EAF2F1 dá 2,85:1.**
- **Verde #00E676 sobre fundo claro dá 1,47:1.** Nunca use verde como texto ou ícone em fundo claro.

---

## 1. Direção de arte (5 linhas)

1. **Look "Arena Noturna — cartaz de luta":** página escura (#060B16, um navy quase preto derivado de #002D72) com áreas claras em #EAF2F1 para respirar nas seções de produto. Cada seção é um "card de luta": título enorme e condensado, uma faixa com graus como divisor e um único destaque verde #00E676 por tela.
2. **Tipografia:** títulos em **Big Shoulders Display 800/900**, um grotesco ultracondensado de cartaz de Chicago, com cara de pôster de evento de luta. Funciona em CAIXA ALTA com entrelinha 0,88 e cabe "SUA ESCOLA NO CENTRO DA ARENA" em 3 linhas no celular. O texto corrido vai em **Archivo** variável, que tem eixo de largura 62–125 e peso 100–900: `wdth 100` para leitura e `wdth 75` para rótulos, botões e números tabulares, tudo no mesmo arquivo. Plano B para o título, se a família tiver mudado de nome no Google Fonts (pode estar como "Big Shoulders" com eixo `opsz`): **Barlow Condensed 800**. Hospede os woff2 no Firebase (licença OFL) em vez de buscar no fonts.googleapis.com, porque isso economiza 2 conexões no 4G.
3. **Superfícies:** vidro escuro (`rgb(8 18 40 / .55)` com `backdrop-filter: blur(14px) saturate(160%)`) só no cabeçalho, no menu, nos botões do herói e no botão de pausa, com no máximo 4 superfícies de vidro reais na tela. Os cards usam "vidro falso", que é um gradiente translúcido com borda de 1 px e não tem `backdrop-filter`. Todos os cantos são **chanfrados em octógono** (clip-path), nunca arredondados: o octógono é o atleta na arena.
4. **Textura:** grão de filme em SVG (`feTurbulence`) a 6–7 % por cima do vídeo e dos fundos escuros. Faixas com trama nos gradientes: cordão torcido com `repeating-linear-gradient` a −55° e faixa lisa com ponteira #151515 e 4 graus brancos.
5. **Luz:** a luz vem do vídeo. Há fogo laranja (#FF8A3D) à esquerda, névoa azul no centro e holofotes frios no alto. O site responde com um halo verde #00E676 nos elementos ativos (glow difuso, não sombra dura), uma vinheta nas bordas e o "holofote" que segue o cursor nas seções escuras.

---

## 2. Herói com vídeo

### 2.1 Estrutura (HTML)

```html
<section class="heroi" aria-labelledby="heroi-titulo">
  <!-- brilho ambiente: miniatura 32×24 do pôster ampliada (desfoque "de graça", ~300 bytes inline) -->
  <div class="heroi__ambiente" aria-hidden="true"></div>

  <div class="heroi__palco" data-heroi>
    <picture>
      <!-- desktop com movimento reduzido: a imagem panorâmica 1983×793 encaixa melhor que o 4:3 -->
      <source media="(min-width: 1024px) and (prefers-reduced-motion: reduce)"
              srcset="/media/heroi-panorama-1600.webp" type="image/webp">
      <source srcset="/media/heroi-poster-640.webp 640w, /media/heroi-poster-960.webp 960w"
              sizes="(min-width: 1024px) 58vw, 100vw" type="image/webp">
      <img class="heroi__poster" src="/media/heroi-poster-960.webp" width="960" height="720"
           fetchpriority="high" decoding="async"
           alt="Quatro lutadores em movimento numa arena: capoeira, jiu-jitsu, muay thai e boxe.">
    </picture>

    <!-- sem autoplay e sem <source> no HTML: o JS decide se e qual arquivo carregar -->
    <video class="heroi__video" muted playsinline loop preload="none" aria-hidden="true" tabindex="-1"
           disablepictureinpicture disableremoteplayback width="960" height="720"></video>

    <canvas class="heroi__faiscas" aria-hidden="true"></canvas>
    <div class="heroi__scrim" aria-hidden="true"></div>
    <div class="heroi__grao" aria-hidden="true"></div>

    <!-- efeito assinatura: o octógono que se desenha e vira a moldura da arena -->
    <svg class="heroi__octo" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
      <path pathLength="1" d="M200 0 H376 L400 24 V276 L376 300 H200"/>
      <path pathLength="1" d="M200 0 H24 L0 24 V276 L24 300 H200"/>
    </svg>
    <span class="heroi__no" aria-hidden="true"></span>

    <button class="btn-icone btn-icone--vidro heroi__pausa" type="button" aria-pressed="false"
            aria-label="Pausar vídeo de fundo" hidden>
      <svg class="i-pausa" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>
      <svg class="i-play"  viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z"/></svg>
    </button>
  </div>

  <div class="heroi__conteudo">
    <p class="sobretitulo">Gestão para escolas de artes marciais</p>
    <h1 id="heroi-titulo" class="heroi__titulo">
      <span class="linha" style="--i:0"><span>O tatame é seu.</span></span>
      <span class="linha" style="--i:1"><span>O resto, a gente</span></span>
      <span class="linha linha--destaque" style="--i:2"><span>amarra.</span></span>
    </h1>
    <span class="heroi__faixa faixa-mini" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <p class="heroi__lead">Site, app, carteirinha, graduação, campeonato e mensalidade via Pix direto na conta da academia.</p>
    <div class="heroi__acoes">
      <a class="btn btn--primario" href="/criar">
        <span class="btn__txt">Criar minha escola grátis</span>
        <span class="btn__ponta" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      </a>
      <a class="btn btn--vidro" href="/demo">
        <span class="btn__txt">Abrir o painel de demonstração</span>
        <svg class="btn__seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
      </a>
    </div>
    <p class="heroi__micro">14 dias grátis · Sem cartão · Cancela quando quiser</p>
  </div>
</section>
```

O texto do título vem do teste A/B da opção A em `01-estrategia-e-textos.md`. Troque pelo que vencer o teste.

### 2.2 Recorte do 4:3 por breakpoint

A composição do vídeo é um friso: os 4 lutadores ocupam toda a largura, os rostos ficam entre 12 % e 35 % da altura e o chão molhado fica nos 25 % de baixo. Qualquer corte lateral elimina uma arte. Por isso a regra é **nunca cortar a largura e, se precisar cortar, cortar o chão**.

| Faixa de tela | Layout | Proporção do palco | `object-position` | O que se perde |
|---|---|---|---|---|
| Celular retrato (< 768 px) | Palco no topo, texto embaixo, subindo 14vw por cima do degradê | 4:3 nativo | `50% 50%` | nada |
| Tablet retrato (768–1023 px) | igual ao celular | 4:3 nativo | `50% 50%` | nada |
| Celular deitado (`landscape` e `max-height: 520px`) | Palco em tela cheia, texto por cima, à esquerda | ~2,1:1 (100vw × 100svh) | `50% 28%` | ~35 % do chão |
| Desktop (≥ 1024 px) | Grade 5/7: texto à esquerda, palco 4:3 à direita, `max-height: 80svh` | 4:3; vira até 1,65:1 em notebook baixo | `50% 30%` | 0–20 % do chão |
| Ultrawide (`min-aspect-ratio: 2/1`) | igual ao desktop | ~1,6:1 | `50% 32%` | ~18 % do chão |

No desktop, o palco 4:3 ao lado do texto mostra o vídeo inteiro em 1440×900 e em 1920×1080. Só corta quando a altura útil é menor que 80svh.

```css
.heroi{
  position: relative; isolation: isolate; overflow: clip;
  display: grid; background: var(--c-noite); color: var(--c-tinta-escuro-1);
}
.heroi__ambiente{
  position: absolute; inset: -10%; z-index: -1; opacity: .35;
  background: center / cover no-repeat url("data:image/webp;base64,…32x24…");
}
.heroi__palco{
  --foco: 50% 50%;
  position: relative; width: 100%; aspect-ratio: 4 / 3;
  background: var(--c-noite-2);
  /* chanfro em %, igual ao viewBox do SVG (24/400 = 6 %, 24/300 = 8 %) */
  clip-path: polygon(6% 0, 94% 0, 100% 8%, 100% 92%, 94% 100%, 6% 100%, 0 92%, 0 8%);
}
.heroi__poster, .heroi__video, .heroi__faiscas{
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: var(--foco);
}
.heroi__video{ opacity: 0; transition: opacity var(--dur-5) var(--ease-out); }
.heroi__video.is-rodando{ opacity: 1; }          /* entra por cima do pôster só quando o vídeo estiver tocando */
.heroi__faiscas{ pointer-events: none; }

.heroi__conteudo{ position: relative; z-index: 2; padding: 0 16px 48px; margin-top: -14vw; }

/* celular deitado */
@media (orientation: landscape) and (max-height: 520px){
  .heroi{ min-height: 100svh; }
  .heroi__palco{ position: absolute; inset: 0; aspect-ratio: auto; clip-path: none; --foco: 50% 28%; }
  .heroi__octo, .heroi__no{ display: none; }
  .heroi__conteudo{ align-self: end; max-width: 30rem; margin: 0; padding: 0 24px 20px; }
  .heroi__scrim{ background: var(--scrim-lateral), var(--scrim-base), var(--vinheta); }
}

/* desktop */
@media (min-width: 1024px) and (min-height: 521px){
  .heroi{
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); align-items: center; column-gap: clamp(24px, 3vw, 56px);
    min-height: min(100svh, 980px);
    padding: calc(var(--altura-header) + 24px) clamp(24px, 4vw, 64px) 48px;
  }
  .heroi__palco{ grid-area: 1 / 2; max-height: 80svh; max-width: 1180px; justify-self: end; --foco: 50% 30%; }
  .heroi__conteudo{ grid-area: 1 / 1; margin: 0; padding: 0; }
}
@media (min-width: 1024px) and (min-aspect-ratio: 2/1){ .heroi__palco{ --foco: 50% 32%; } }
```

### 2.3 Sobreposições (scrim, vinheta, grão)

```css
:root{
  --vinheta: radial-gradient(120% 90% at 50% 40%, transparent 55%, rgb(4 8 18 / .72) 100%);
  --scrim-base: linear-gradient(to top, var(--c-noite) 0%, rgb(6 11 22 / .62) 18%, transparent 42%);
  --scrim-lateral: linear-gradient(to right, rgb(6 11 22 / .88) 0%, rgb(6 11 22 / .55) 32%, transparent 60%);
  --scrim-borda-esq: linear-gradient(to right, var(--c-noite) 0, transparent 10%);
  --grao: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.heroi__scrim{
  position: absolute; inset: 0; pointer-events: none;
  background: var(--scrim-base), var(--vinheta);
}
@media (min-width: 1024px){
  /* no desktop o vídeo "nasce" do fundo escuro pela borda esquerda (overlay, sem mask-image sobre o vídeo) */
  .heroi__scrim{ background: var(--scrim-borda-esq), var(--scrim-base), var(--vinheta); }
}
.heroi__grao{
  position: absolute; inset: -50%; pointer-events: none; opacity: .07;
  background: var(--grao);
}
/* grão animado só no desktop: transform em degraus, roda no compositor */
@media (min-width: 1024px) and (prefers-reduced-motion: no-preference){
  .heroi__grao{ animation: grao 1s steps(6) infinite; }
  .heroi.is-pausado .heroi__grao{ animation-play-state: paused; }
}
@keyframes grao{
  0%  { transform: translate3d(0, 0, 0) }
  20% { transform: translate3d(-4%, 3%, 0) }
  40% { transform: translate3d(3%, -2%, 0) }
  60% { transform: translate3d(-2%, -4%, 0) }
  80% { transform: translate3d(4%, 2%, 0) }
  100%{ transform: translate3d(0, 0, 0) }
}
```

Contraste do título sobre o vídeo: no pior quadro (reflexo laranja do chão ~#C08040 sob scrim de 60 %), o branco fica acima de 9:1. Some-se `text-shadow: 0 2px 24px rgb(0 0 0 / .5)` como seguro. No celular deitado, o `--scrim-lateral` escurece o capoeirista onde o texto fica por cima, e esse é o único caso em que isso acontece.

### 2.4 Como o título entra

O título é HTML puro (é forte candidato a LCP) e a animação é só CSS, então não depende de JS. A entrada é curta para não atrasar o LCP: a última linha termina em ~1,1 s.

```css
.heroi__titulo{
  font: 900 clamp(2.75rem, 1.4rem + 6.2vw, 6.5rem)/.88 var(--fonte-display);
  text-transform: uppercase; letter-spacing: -.005em; text-wrap: balance;
  text-shadow: 0 2px 24px rgb(0 0 0 / .5);
}
.heroi__titulo .linha{ display: block; overflow: hidden; overflow: clip; padding-block: .04em; }
.heroi__titulo .linha > span{ display: block; }
.heroi__titulo .linha--destaque{ color: var(--c-verde); }       /* 11,79:1 sobre --c-noite */

@media (prefers-reduced-motion: no-preference){
  .heroi__titulo .linha > span{
    animation: subir var(--dur-5) var(--ease-out) both;
    animation-delay: calc(120ms + var(--i) * 90ms);             /* 120 / 210 / 300 ms */
  }
  .heroi__faixa{ animation: faixa-desenha var(--dur-5) var(--ease-out) 420ms both; transform-origin: left; }
  .heroi__faixa i{ animation: grau-pop 360ms var(--ease-snap) both; animation-delay: calc(980ms + var(--g) * 90ms); }
  .heroi__lead, .heroi__acoes, .heroi__micro{ animation: surgir var(--dur-5) var(--ease-out) both; }
  .heroi__lead { animation-delay: 380ms; }
  .heroi__acoes{ animation-delay: 460ms; }
  .heroi__micro{ animation-delay: 540ms; }
}
@keyframes subir        { from{ transform: translate3d(0, 105%, 0); } }
@keyframes surgir       { from{ opacity: 0; transform: translate3d(0, 16px, 0); } }
@keyframes faixa-desenha{ from{ transform: scaleX(0); } }
@keyframes grau-pop     { from{ opacity: 0; transform: scaleY(0); } 60%{ transform: scaleY(1.3); } }

/* o travessão da marca em miniatura */
.faixa-mini{
  display: flex; justify-content: flex-end; align-items: center; gap: 4px;
  width: 168px; height: 10px; margin-block: 18px 20px; padding-right: 10px;
  background: linear-gradient(90deg, var(--c-teal) 0 calc(100% - 46px), var(--c-ponteira) calc(100% - 46px));
}
.faixa-mini i{ width: 3px; height: 14px; background: #fff; border-radius: 1px; }
.faixa-mini i:nth-child(1){ --g: 0 } .faixa-mini i:nth-child(2){ --g: 1 }
.faixa-mini i:nth-child(3){ --g: 2 } .faixa-mini i:nth-child(4){ --g: 3 }
```

A `.faixa-mini` embaixo do título é o travessão da marca: uma barra teal de 10 px com ponteira #151515 e 4 graus brancos que "acendem" um a um. É a primeira vez que a pessoa vê a faixa ganhar graus, e esse gesto se repete no site inteiro.

### 2.5 Pôster, fallback, `prefers-reduced-motion`, `Save-Data`, pausa fora da tela

Regras:
- O **pôster é o primeiro quadro do loop já costurado** (WebP 640 = 38 KB, 960 = 64 KB, medidos). Ele fica como `<img fetchpriority="high">` embaixo do `<video>`, não como atributo `poster`, para ter `srcset`, AVIF/WebP e prioridade de LCP. O vídeo só aparece (opacity 0 → 1 em 720 ms) no evento `playing`, então não há tela preta.
- **Sem JS:** o pôster aparece e o vídeo nunca baixa.
- **`prefers-reduced-motion: reduce`, `saveData` ou `effectiveType` 2g/3g:** o vídeo não toca sozinho e não baixa. O botão aparece como "Reproduzir vídeo de fundo" (opt-in). No desktop com movimento reduzido, o `<picture>` troca o pôster 4:3 pela **panorâmica 1983×793**, que tem composição feita para tela larga.
- **Pausa fora da tela:** IntersectionObserver com limiar de 25 %, mais `visibilitychange`.
- **Botão de pausar sempre visível quando o vídeo toca** (WCAG 2.2.2), lembrado em `localStorage` com try/catch. Ele também pausa o grão animado.
- **O vídeo começa a baixar só depois do `load`** (em `requestIdleCallback`), para não competir com o pôster e as fontes.

Divergência com `03-referencias.md`: lá se sugere só o pôster em todo celular. Eu proponho vídeo também no celular em 4G, porque a versão de 640 px em AV1 pesa 293 KB (medido) e carrega depois do `load`. O pôster fica para Save-Data, 2g e 3g. Lá também se sugere VP9 WebM, mas no teste o VP9 saiu **maior** que o H.264 (1,2 MB contra 1,13 MB em 1112 px), por isso deixei VP9 fora. Decisão final: diretor do projeto.

```js
// heroi.js — vídeo só quando faz sentido (≈1,4 KB min)
(() => {
  const heroi = document.querySelector('.heroi');
  const palco = heroi?.querySelector('[data-heroi]');
  const video = palco?.querySelector('.heroi__video');
  const botao = palco?.querySelector('.heroi__pausa');
  if (!video || !botao) return;

  const reduzir = matchMedia('(prefers-reduced-motion: reduce)');
  const con = navigator.connection || {};
  const economia = con.saveData === true || /2g|3g/.test(con.effectiveType || '');
  let salvo = null;
  try { salvo = localStorage.getItem('ap:video'); } catch {}
  let pausado = salvo === 'pausado' || (salvo !== 'tocando' && (reduzir.matches || economia));

  const tam = palco.clientWidth * Math.min(devicePixelRatio || 1, 2) > 800 ? 960 : 640;
  const fontes = [
    [`/media/heroi-${tam}.av1.mp4`,  `video/mp4; codecs="av01.0.0${tam === 960 ? 5 : 4}M.08"`],
    [`/media/heroi-${tam}.h264.mp4`, 'video/mp4; codecs="avc1.64001F"'],
  ];

  let carregado = false, liberado = false, visivel = false;
  function carregar(){
    if (carregado) return; carregado = true;
    for (const [src, type] of fontes){
      if (!video.canPlayType(type)) continue;            // '' = não toca (ex.: AV1 sem decodificador em hardware no Safari)
      const s = document.createElement('source'); s.src = src; s.type = type; video.append(s);
    }
    video.load();
  }
  async function tocar(){
    if (!liberado || pausado || !visivel || document.hidden) return;
    carregar();
    try { await video.play(); }
    catch { pausado = true; refletir(); }                  // Modo Pouca Energia do iOS etc.: fica o pôster
  }
  const pausar = () => { if (!video.paused) video.pause(); };

  function refletir(){
    botao.hidden = false;
    botao.setAttribute('aria-pressed', String(pausado));
    botao.setAttribute('aria-label', pausado ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo');
    heroi.classList.toggle('is-pausado', pausado);
  }

  video.addEventListener('playing', () => video.classList.add('is-rodando'), { once: true });
  botao.addEventListener('click', () => {
    pausado = !pausado;
    try { localStorage.setItem('ap:video', pausado ? 'pausado' : 'tocando'); } catch {}
    refletir(); pausado ? pausar() : tocar();
  });
  reduzir.addEventListener('change', (e) => { if (e.matches){ pausado = true; refletir(); pausar(); } });

  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting && e.intersectionRatio >= 0.25;
    visivel ? tocar() : pausar();
  }, { threshold: [0, 0.25] }).observe(palco);
  document.addEventListener('visibilitychange', () => (document.hidden ? pausar() : tocar()));

  const iniciar = () => { liberado = true; refletir(); tocar(); };
  const ocioso = () => ('requestIdleCallback' in window ? requestIdleCallback(iniciar, { timeout: 2000 }) : setTimeout(iniciar, 300));
  document.readyState === 'complete' ? ocioso() : addEventListener('load', ocioso, { once: true });
})();
```

```css
.heroi__pausa{ position: absolute; right: 4%; bottom: 6%; z-index: 3; }
.heroi__pausa .i-play{ display: none; }
.heroi__pausa[aria-pressed="true"] .i-play{ display: block; }
.heroi__pausa[aria-pressed="true"] .i-pausa{ display: none; }
```

### 2.6 Efeito assinatura: "o octógono vira a arena" + faíscas

**A. O octógono que se desenha (todas as telas, CSS puro, roda 1 vez):**
1. **0–360 ms:** o nó verde (um octógono de 14 px, o mesmo do topo do "A") surge no centro do topo do palco com `scale 0 → 1.15 → 1`.
2. **300–1500 ms:** dois traços verdes de 2 px saem do nó, um para cada lado, contornam os chanfros e se encontram embaixo. É a faixa sendo amarrada em volta da arena.
3. **1500–2100 ms:** o traço baixa para 35 % de opacidade e fica como fio da moldura. O nó continua aceso, e a arena passa a ter "a marca no topo".

```css
.heroi__octo{ position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.heroi__octo path{
  fill: none; stroke: var(--c-verde); stroke-width: 2; vector-effect: non-scaling-stroke;
  stroke-dasharray: 1; stroke-dashoffset: 0; opacity: .35;
  filter: drop-shadow(0 0 6px rgb(0 230 118 / .6));      /* estático: rasteriza uma vez */
}
.heroi__no{
  position: absolute; left: 50%; top: 0; width: 14px; height: 14px; translate: -50% -50%;
  background: var(--c-verde);
  clip-path: polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%);
}
@media (prefers-reduced-motion: no-preference){
  .heroi__no{ animation: no-pop 360ms var(--ease-snap) 80ms both; }
  .heroi__octo path{ animation: octo-desenha 1200ms var(--ease-in-out) 300ms both, octo-repouso 600ms var(--ease-out) 1500ms both; }
}
@keyframes no-pop{ from{ transform: scale(0); } 60%{ transform: scale(1.15); } }
@keyframes octo-desenha{ from{ stroke-dashoffset: 1; opacity: 1; } to{ stroke-dashoffset: 0; opacity: 1; } }
@keyframes octo-repouso{ from{ opacity: 1; } to{ opacity: .35; } }
```

`stroke-dashoffset` não é composto (repinta). É exceção aceita porque roda uma vez, por 1,2 s, num SVG de 2 caminhos.

**B. Faíscas que reagem ao cursor (desktop) e ao toque (celular):** um canvas 2D por cima do vídeo. Com mouse, o movimento solta 2 faíscas a cada 24 px percorridos, herdando a direção. No toque, cada toque solta uma explosão de 14. Limites: 60 partículas, DPR limitado a 1,5, o rAF para quando não há partículas, e tudo pausa fora da tela e com movimento reduzido. As cores vêm do fogo do vídeo (#FFE3A3 → #FF8A3D) em modo `lighter`.

```js
// faiscas.js (≈1 KB min)
(() => {
  const palco = document.querySelector('[data-heroi]');
  const cv = palco?.querySelector('.heroi__faiscas');
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d'), MAX = 60, dpr = Math.min(devicePixelRatio || 1, 1.5);
  const P = []; let raf = 0, w = 0, h = 0, r = null, ultimo = 0, ativo = true, lx = 0, ly = 0;

  const medir = () => { r = palco.getBoundingClientRect(); w = r.width; h = r.height;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  new ResizeObserver(medir).observe(palco);
  new IntersectionObserver(([e]) => { ativo = e.isIntersecting; if (!ativo){ P.length = 0; cancelAnimationFrame(raf); raf = 0; ctx.clearRect(0, 0, w, h); } }).observe(palco);

  function emitir(x, y, n, vx0 = 0, vy0 = 0){
    for (let i = 0; i < n && P.length < MAX; i++){
      const a = Math.random() * 6.283, v = 1.5 + Math.random() * 3.5;
      P.push({ x, y, vx: Math.cos(a) * v + vx0 * .15, vy: Math.sin(a) * v - 2 + vy0 * .15,
               vida: 1, decai: .018 + Math.random() * .02, raio: 1 + Math.random() * 1.6 });
    }
    if (!raf && ativo){ ultimo = performance.now(); raf = requestAnimationFrame(passo); }
  }
  function passo(t){
    const dt = Math.min((t - ultimo) / 16.67, 2); ultimo = t;          // igual a 60 ou 120 Hz
    ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
    for (let i = P.length - 1; i >= 0; i--){
      const p = P[i];
      p.vy += .12 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= p.decai * dt;
      if (p.vida <= 0){ P.splice(i, 1); continue; }
      ctx.globalAlpha = p.vida; ctx.fillStyle = p.vida > .6 ? '#FFE3A3' : '#FF8A3D';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.raio, 0, 6.283); ctx.fill();
    }
    raf = P.length ? requestAnimationFrame(passo) : 0;
  }
  palco.addEventListener('pointerenter', medir);
  palco.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const x = e.clientX - r.left, y = e.clientY - r.top, dx = x - lx, dy = y - ly;
    if (dx * dx + dy * dy < 576) return;                                  // 24 px
    lx = x; ly = y; emitir(x, y, 2, dx, dy);
  }, { passive: true });
  palco.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return; medir();
    emitir(e.clientX - r.left, e.clientY - r.top, 14);
  }, { passive: true });
})();
```

### 2.7 Peso do vídeo e receita ffmpeg (medida neste material)

| Arquivo | Resolução | Codec | Peso medido | SSIM vs. original |
|---|---|---|---|---|
| original | 1112×834 | H.264 + AAC | 2.999 KB | — |
| `heroi-960.av1.mp4` | 960×720 | AV1 CRF 44 | **474 KB** | 0,967 (sem costura) |
| `heroi-960.h264.mp4` | 960×720 | H.264 CRF 28 | **673 KB** | 0,963 |
| `heroi-640.av1.mp4` | 640×480 | AV1 CRF 44 | **293 KB** | 0,948 |
| `heroi-640.h264.mp4` | 640×480 | H.264 CRF 28 | **374 KB** | 0,935 |
| `heroi-poster-960.webp` / `-640.webp` | — | WebP q70 | **64 KB / 38 KB** | — |
| `heroi-panorama-1600.webp` | 1600×640 | WebP q72 | **166 KB** | — |

**Alvo:** no celular, pôster de 38 KB + vídeo de 293–374 KB (carregado depois do `load`). No desktop, 64 KB + 474–673 KB. O SSIM ~0,95 no celular é imperceptível com grão e scrim por cima.

```bash
# 0) costura do loop (crossfade de 0,5 s) + remoção do áudio → mestre quase sem perdas (3,54 s)
ffmpeg -i heroi.mp4 -an -filter_complex \
 "[0:v]split[a][b];[a]trim=start=0.5,setpts=PTS-STARTPTS[corpo];[b]trim=end=0.5,setpts=PTS-STARTPTS[cabeca];\
  [corpo][cabeca]xfade=transition=fade:duration=0.5:offset=3.04,format=yuv420p[v]" \
 -map "[v]" -c:v libx264 -preset slow -crf 12 heroi-mestre.mp4

# 1) versões finais (sem áudio, faststart, GOP de 2–4 s)
for T in 960:720 640:480; do W=${T%%:*}
  ffmpeg -i heroi-mestre.mp4 -an -vf "scale=$T:flags=lanczos" \
    -c:v libsvtav1 -preset 4 -crf 44 -g 96 -pix_fmt yuv420p -movflags +faststart heroi-$W.av1.mp4
  ffmpeg -i heroi-mestre.mp4 -an -vf "scale=$T:flags=lanczos" \
    -c:v libx264 -preset veryslow -crf 28 -profile:v high -level:v 3.1 -g 48 -pix_fmt yuv420p \
    -movflags +faststart heroi-$W.h264.mp4
done

# 2) pôsteres = 1º quadro do loop costurado; panorâmica; miniatura do brilho ambiente
ffmpeg -i heroi-mestre.mp4 -frames:v 1 -vf scale=960:720 -c:v libwebp -quality 70 heroi-poster-960.webp
ffmpeg -i heroi-mestre.mp4 -frames:v 1 -vf scale=640:480 -c:v libwebp -quality 70 heroi-poster-640.webp
ffmpeg -i heroi.png -vf scale=1600:-2 -c:v libwebp -quality 72 heroi-panorama-1600.webp
ffmpeg -i heroi-mestre.mp4 -frames:v 1 -vf scale=32:24 -c:v libwebp -quality 50 heroi-ambiente.webp   # vira data: URI

# 3) conferir
ffprobe -v error -show_entries stream=codec_name,profile,level,width,height -of compact heroi-960.av1.mp4
```

Notas:
- O `offset` é igual a (duração − 0,5 − 0,5) = 4,04 − 1 = 3,04. Se o vídeo mudar, recalcule.
- Codecs do `<source>`: AV1 960 = `av01.0.05M.08` (nível 3.1), AV1 640 = `av01.0.04M.08` (nível 3.0), H.264 = `avc1.64001F`. Confira com `ffprobe` (`level`).
- AV1 vai em contêiner MP4. Chrome, Firefox e Edge tocam. O Safari só toca com decodificador em hardware, e o `canPlayType` filtra esse caso, então cai no H.264.
- No Firebase Hosting, use nome com hash e `Cache-Control: public, max-age=31536000, immutable` em `/media/**`. Depois do deploy, confira que `curl -sI -H "Range: bytes=0-1" https://atletapay.com.br/media/heroi-640.h264.mp4` responde **206**, porque o Safari exige range requests para vídeo.

---

## 3. Sistema de botões: forma e movimento

### 3.1 A gramática de forma (vem da marca)

| Elemento da marca | Vira no botão |
|---|---|
| Octógono verde (o atleta na arena) | Cantos chanfrados em todos os botões (`clip-path`). O botão de ícone é um octógono regular. |
| Travessão = ponteira #151515 com 4 graus | A ponta direita do botão primário é a ponteira. Os 4 graus **acendem em sequência no hover** e **viram o indicador de carregamento**. |
| A faixa que amarra | No clique, a ponteira dá um "puxão" (recua, estica e volta) e os graus piscam: o botão "amarra". |
| A faixa (traço) | O link-seta tem uma faixa verde que se desenha embaixo do texto, com ponta escura. |

**Por que o clip-path vai num pseudo-elemento:** `clip-path` corta também o `outline` e o `box-shadow`. O fundo chanfrado fica no `::before`, o elemento real não tem clip, e assim o anel de foco aparece inteiro. A sombra é um `::after` com glow difuso que anima só a `opacity`.

### 3.2 Tempos e curvas

| Estado | O que muda | Duração | Curva |
|---|---|---|---|
| hover (entrada) | sobe 2 px, fundo clareia, glow 0 → .55, graus acendem com 45 ms entre um e outro, a ponteira avança 3 px | 200 ms (cor), 320 ms (forma) | `--ease-out` = cubic-bezier(0.16, 1, 0.3, 1) |
| hover (saída) | volta | 320 ms | `--ease-out` |
| `:focus-visible` | anel de 3 px com afastamento de 4 px e graus acesos (como no hover) | instantâneo | — |
| `:active` / pressionado | `scale(.98)`, ponteira recua 4 px | 80 ms | `--ease-out` |
| clique (amarrar) | ponteira −4 → +5 px (`scaleX 1.08`) → −1 → 0; graus piscam | 420 ms | `--ease-snap` = cubic-bezier(0.34, 1.56, 0.64, 1) |
| carregando | graus acendem em onda, em loop | 960 ms, 120 ms entre graus | `--ease-in-out` = cubic-bezier(0.65, 0, 0.35, 1) |
| desabilitado | sem movimento, cores apagadas | — | — |

### 3.3 CSS completo

```css
/* ---------- base comum ---------- */
.btn{
  --cut: var(--cut-sm);
  --h: 52px;
  --btn-bg: var(--c-verde);
  --btn-bg-hover: var(--c-verde-claro);
  --btn-tinta: var(--c-navy-900);
  --btn-glow: var(--c-verde);
  --ponta-bg: var(--c-ponteira);
  position: relative; isolation: isolate;
  display: inline-flex; align-items: center; gap: 14px;
  min-height: var(--h); padding-inline: 22px 0;
  border: 0; background: none; color: var(--btn-tinta);
  font: 700 .9375rem/1 var(--fonte-texto); font-stretch: 75%; letter-spacing: .06em; text-transform: uppercase;
  text-decoration: none; white-space: nowrap; cursor: pointer; user-select: none;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: transform var(--dur-2) var(--ease-out);
}

/* chanfro octogonal reutilizado (pseudo-elementos não aceitam classe, por isso a lista) */
.chanfro, .btn::before, .btn--vidro::after, .chip::before, .card{
  clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)),
                     calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
}

.btn::before{                                   /* corpo chanfrado */
  content: ""; position: absolute; inset: 0; z-index: -1;
  background-color: var(--btn-bg);
  transition: background-color var(--dur-2) var(--ease-out), transform var(--dur-3) var(--ease-out);
}
.btn--primario::after{                          /* sombra dinâmica = glow que só muda opacity/transform */
  content: ""; position: absolute; inset: 20% 8% -6%; z-index: -2; pointer-events: none;
  background: var(--btn-glow); filter: blur(18px);
  opacity: 0; transform: translateY(4px) scale(.9);
  transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-3) var(--ease-out);
}
.btn__txt{ position: relative; }

/* ---------- ponteira com 4 graus ---------- */
.btn__ponta{
  align-self: stretch; display: flex; align-items: center; justify-content: center; gap: 4px;
  width: 46px; margin-left: 6px; background: var(--ponta-bg); transform-origin: left center;
  clip-path: polygon(0 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, 0 100%);
  transition: transform var(--dur-3) var(--ease-out);
}
.btn__ponta i{
  width: 3px; height: 42%; border-radius: 1px; background: #fff;
  opacity: .32; transform: scaleY(.7);
  transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-3) var(--ease-snap);
  transition-delay: calc(var(--g) * 45ms);
}
.btn__ponta i:nth-child(1){ --g: 0 } .btn__ponta i:nth-child(2){ --g: 1 }
.btn__ponta i:nth-child(3){ --g: 2 } .btn__ponta i:nth-child(4){ --g: 3 }

/* ---------- hover só com mouse de verdade ---------- */
@media (hover: hover) and (pointer: fine){
  .btn:is(:hover):not(:disabled, [aria-disabled="true"], [aria-busy="true"]){ transform: translateY(-2px); }
  .btn:hover:not(:disabled, [aria-disabled="true"])::before{ background-color: var(--btn-bg-hover); }
  .btn--primario:hover:not(:disabled, [aria-disabled="true"])::after{ opacity: .55; transform: translateY(8px) scale(1); }
  .btn:hover:not(:disabled, [aria-disabled="true"]) .btn__ponta{ transform: translateX(3px); }
}
.btn:is(:hover, :focus-visible, .is-pressionado):not(:disabled, [aria-disabled="true"]) .btn__ponta i{
  opacity: 1; transform: scaleY(1);
}

/* ---------- foco ---------- */
.btn:focus-visible{ outline: 3px solid var(--c-foco); outline-offset: 4px; }
.sobre-claro .btn:focus-visible{ outline-color: var(--c-foco-claro); }

/* ---------- pressionar e amarrar ---------- */
.btn:active, .btn.is-pressionado{ transform: scale(.98); transition-duration: var(--dur-0); }
.btn:active .btn__ponta, .btn.is-pressionado .btn__ponta{ transform: translateX(-4px); transition-duration: var(--dur-0); }
.btn.is-amarrando .btn__ponta  { animation: amarrar 420ms var(--ease-snap) both; }
.btn.is-amarrando .btn__ponta i{ animation: grau-flash 420ms var(--ease-out) both; animation-delay: calc(var(--g) * 40ms); }
@keyframes amarrar{
  0%  { transform: translateX(-4px); }
  35% { transform: translateX(5px) scaleX(1.08); }
  65% { transform: translateX(-1px); }
  100%{ transform: none; }
}
@keyframes grau-flash{ 0%{ opacity: .3; } 40%{ opacity: 1; transform: scaleY(1.3); } 100%{ opacity: 1; transform: scaleY(1); } }

/* ---------- carregando: os graus viram o spinner ---------- */
.btn[aria-busy="true"]{ cursor: progress; }
.btn[aria-busy="true"] .btn__ponta i{ animation: grau-carrega 960ms var(--ease-in-out) infinite; animation-delay: calc(var(--g) * 120ms); }
@keyframes grau-carrega{ 0%, 100%{ opacity: .25; transform: scaleY(.6); } 40%{ opacity: 1; transform: scaleY(1.15); } }

/* ---------- desabilitado ---------- */
.btn:disabled, .btn[aria-disabled="true"]{
  --btn-bg: #2A3850; --btn-bg-hover: #2A3850; --btn-tinta: #A9B8CC; --ponta-bg: #1C2638;   /* 5,85:1 */
  cursor: not-allowed; transform: none;
}
.btn:disabled .btn__ponta i, .btn[aria-disabled="true"] .btn__ponta i{ opacity: .15; }

/* ---------- primário sobre fundo claro (verde não tem contraste em #EAF2F1) ---------- */
.sobre-claro .btn--primario{
  --btn-bg: var(--c-navy); --btn-bg-hover: #0E3F92; --btn-tinta: #fff;                     /* 12,98:1 */
  --btn-glow: var(--c-navy); --ponta-bg: var(--c-teal);
}

/* ---------- secundário de vidro ---------- */
.btn--vidro{
  --btn-tinta: #fff; padding-inline: 22px 18px;
}
.btn--vidro::before{                            /* "borda" = octógono de gradiente embaixo do vidro */
  background-color: transparent;
  background-image: linear-gradient(135deg, rgb(255 255 255 / .6), rgb(255 255 255 / .14) 45%, rgb(0 230 118 / .6));
}
.btn--vidro::after{                             /* vidro, 1 px para dentro */
  content: ""; position: absolute; inset: 1px; z-index: -1;
  background: rgb(8 18 40 / .55);
  -webkit-backdrop-filter: blur(14px) saturate(160%); backdrop-filter: blur(14px) saturate(160%);
  transition: background-color var(--dur-2) var(--ease-out);
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){
  .btn--vidro::after{ background: rgb(8 18 40 / .88); }
}
.btn--vidro .btn__txt::after{                   /* faixa verde que se desenha sob o texto */
  content: ""; position: absolute; left: 0; right: 0; bottom: -6px; height: 2px;
  background: var(--c-verde); transform: scaleX(0); transform-origin: right;
  transition: transform var(--dur-3) var(--ease-out);
}
.btn__seta{ width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: square;
  transition: transform var(--dur-3) var(--ease-out); }
@media (hover: hover) and (pointer: fine){
  .btn--vidro:hover::after{ background-color: rgb(8 18 40 / .38); }
  .btn--vidro:hover .btn__txt::after{ transform: scaleX(1); transform-origin: left; }
  .btn--vidro:hover .btn__seta{ transform: translateX(4px); }
}
.btn--vidro:focus-visible .btn__txt::after{ transform: scaleX(1); }
.btn--vidro:active .btn__seta, .btn--vidro.is-pressionado .btn__seta{ transform: translateX(8px); transition-duration: var(--dur-1); }
.sobre-claro .btn--vidro{ --btn-tinta: var(--c-navy); }
.sobre-claro .btn--vidro::after{ background: rgb(255 255 255 / .62); }
.sobre-claro .btn--vidro::before{ background-image: linear-gradient(135deg, rgb(0 45 114 / .45), rgb(0 45 114 / .12) 45%, rgb(56 158 146 / .7)); }

/* ---------- link-seta ---------- */
.link-seta{
  position: relative; display: inline-flex; align-items: center; gap: 8px; padding-block: 6px;
  color: var(--c-teal-claro); font: 600 1rem/1.2 var(--fonte-texto); text-decoration: none;   /* 10,58:1 no escuro */
}
.sobre-claro .link-seta{ color: var(--c-teal-tinta); }                                            /* 4,53:1 no claro */
.link-seta > span{
  background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat;          /* sublinhado fino em repouso (WCAG 1.4.1) */
}
.link-seta::after{                              /* a faixa: verde com ponteira escura de 12 px */
  content: ""; position: absolute; left: 0; right: 26px; bottom: 0; height: 4px;
  background: linear-gradient(90deg, var(--c-verde) 0 calc(100% - 12px), var(--c-ponteira) calc(100% - 12px));
  transform: scaleX(0); transform-origin: right; transition: transform var(--dur-3) var(--ease-out);
}
.link-seta svg{ width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2.2; transition: transform var(--dur-3) var(--ease-out); }
@media (hover: hover) and (pointer: fine){
  .link-seta:hover::after{ transform: scaleX(1); transform-origin: left; }
  .link-seta:hover svg{ transform: translateX(4px); }
}
.link-seta:focus-visible{ outline: 3px solid var(--c-foco); outline-offset: 3px; }
.link-seta:focus-visible::after{ transform: scaleX(1); }
.link-seta:active svg{ transform: translateX(8px); transition-duration: var(--dur-1); }

/* ---------- botão de ícone (octógono regular) ---------- */
.btn-icone{
  position: relative; isolation: isolate; display: inline-grid; place-items: center;
  width: 48px; height: 48px; border: 0; background: none; color: #fff; cursor: pointer;
  -webkit-tap-highlight-color: transparent; touch-action: manipulation;
  transition: transform var(--dur-1) var(--ease-out);
}
.btn-icone::before{
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: rgb(8 18 40 / .55); box-shadow: inset 0 0 0 1px rgb(255 255 255 / .22);
  clip-path: polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%);
  transition: transform var(--dur-4) var(--ease-out), background-color var(--dur-2) var(--ease-out);
}
.btn-icone--vidro::before{ -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.btn-icone svg{ width: 22px; height: 22px; fill: currentColor; }
@media (hover: hover) and (pointer: fine){
  /* gira 45°: o estado final é idêntico (octógono regular); o giro só é visto durante a transição */
  .btn-icone:hover::before{ transform: rotate(45deg); background-color: rgb(0 230 118 / .22); }
}
.btn-icone:focus-visible{ outline: 3px solid var(--c-foco); outline-offset: 3px; }
.btn-icone:active, .btn-icone.is-pressionado{ transform: scale(.92); }

/* ---------- hambúrguer: a faixa do meio é puxada e vira X ---------- */
.menu-btn .barras{ position: relative; width: 22px; height: 16px; }
.menu-btn .barras i{
  position: absolute; left: 0; width: 100%; height: 2px; background: #fff; border-radius: 1px;
  transition: transform var(--dur-4) var(--ease-out), opacity var(--dur-2) var(--ease-out);
}
.menu-btn .barras i:nth-child(1){ top: 0; }
.menu-btn .barras i:nth-child(2){ top: 7px; background: linear-gradient(90deg, var(--c-verde) 0 70%, var(--c-ponteira) 70%); transform-origin: right; }
.menu-btn .barras i:nth-child(3){ top: 14px; }
.menu-btn[aria-expanded="true"] .barras i:nth-child(1){ transform: translateY(7px) rotate(45deg); }
.menu-btn[aria-expanded="true"] .barras i:nth-child(2){ transform: scaleX(0); }
.menu-btn[aria-expanded="true"] .barras i:nth-child(3){ transform: translateY(-7px) rotate(-45deg); }

.menu{                                           /* folha de vidro em tela cheia */
  position: fixed; inset: 0; z-index: var(--z-menu); display: grid; align-content: center; gap: 8px;
  padding: calc(var(--altura-header) + 24px) 24px 24px;
  background: rgb(6 11 22 / .86); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
  opacity: 0; visibility: hidden; transform: translateY(-8px);
  transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-4) var(--ease-out), visibility 0s linear var(--dur-4);
}
.menu.is-aberto{ opacity: 1; visibility: visible; transform: none; transition-delay: 0s; }
.menu a{ font: 800 clamp(2rem, 9vw, 3rem)/1 var(--fonte-display); text-transform: uppercase; color: #fff;
  opacity: 0; transform: translateY(12px); transition: opacity var(--dur-3) var(--ease-out), transform var(--dur-4) var(--ease-out); }
.menu.is-aberto a{ opacity: 1; transform: none; transition-delay: calc(80ms + var(--i) * 40ms); }
```

**JS mínimo do menu:** alterna `aria-expanded` e `.is-aberto`, usa `inert` no `<main>` enquanto o menu está aberto (o que prende o foco sem biblioteca), fecha com Esc e ao clicar num link, devolve o foco ao botão e trava a rolagem com `document.documentElement.style.overflow = 'hidden'`. Sem JS, o menu é um `<details>` no lugar do botão, ou os links aparecem empilhados no rodapé do cabeçalho.

### 3.4 Versão de toque (celular)

- **Nada depende de hover:** todo hover está dentro de `@media (hover: hover) and (pointer: fine)`. No toque, o que "acende os graus" é o **pressionar**.
- **Retorno imediato:** `:active` no iOS só funciona com um ouvinte `touchstart`. Por isso uso a classe `.is-pressionado` no `pointerdown`, com no mínimo 120 ms, para o toque rápido também ser visível. No `click`, roda o "amarrar".
- **Tamanhos:** altura de 52 px no primário e no vidro, 48×48 nos ícones e 8 px de espaço entre alvos (WCAG 2.5.8 pede 24 px; a meta aqui é 48). Abaixo de 480 px, os dois CTAs do herói ficam com largura de 100 %, empilhados.
- **Barra fixa inferior** ("Ver demo" + "Criar grátis", conforme o doc 01): aparece com `translateY(100%) → 0` em 480 ms `--ease-out` quando o herói sai da tela (IntersectionObserver no herói). Tem `padding-bottom: env(safe-area-inset-bottom)` e vidro.

```css
@media (max-width: 479px){ .heroi__acoes{ display: grid; gap: 10px; } .heroi__acoes .btn{ justify-content: space-between; width: 100%; } }
```

```js
// pressionar.js (≈0,5 KB)
(() => {
  const sel = '.btn, .btn-icone, .chip';
  const soltar = (b) => setTimeout(() => b.classList.remove('is-pressionado'), 120);
  document.addEventListener('touchstart', () => {}, { passive: true });          // habilita :active no iOS
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest(sel);
    if (!b || b.matches(':disabled, [aria-disabled="true"], [aria-busy="true"]')) return;
    b.classList.add('is-pressionado');
    const fim = () => { soltar(b); ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.removeEventListener(t, fim)); };
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, fim, { once: true }));
  }, { passive: true });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.btn');
    if (!b || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    b.classList.remove('is-amarrando'); void b.offsetWidth;                         // reinicia a animação
    b.classList.add('is-amarrando');
    b.addEventListener('animationend', () => b.classList.remove('is-amarrando'), { once: true });
  });
})();
```

O "carregando" de formulário: `aria-busy="true"` e `aria-disabled="true"` no botão, o texto troca para "Criando sua escola…", e uma região `aria-live="polite"` anuncia o estado. Com movimento reduzido, os graus ficam parados a 50 % e só o texto muda.

---

## 4. Movimento por seção

### 4.1 Regra de ouro das entradas: visível em repouso

Nada nasce com `opacity: 0` no CSS. **Só o JS esconde, e só o que está abaixo da dobra no momento em que roda.** Quem chega pelo link `#preco`, quem imprime, quem usa leitor de tela, quem desativou JS e quem tem movimento reduzido sempre vê tudo.

```css
[data-revelar]{
  transition: opacity var(--dur-4) var(--ease-out), transform var(--dur-5) var(--ease-out);
  transition-delay: calc(var(--i, 0) * var(--escalonar));
}
[data-revelar="aguardando"]{ opacity: 0; transform: translate3d(0, 24px, 0); }
[data-revelar="aguardando"][data-revelar-tipo="escala"]{ transform: scale(.96); }
@media print{ [data-revelar]{ opacity: 1 !important; transform: none !important; } }
```

```js
// revelar.js (≈0,6 KB)
(() => {
  if (!matchMedia('(prefers-reduced-motion: no-preference)').matches || !('IntersectionObserver' in window)) return;
  const els = [...document.querySelectorAll('[data-revelar]')];
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting){
      e.target.dataset.revelar = 'visto'; e.target.dispatchEvent(new CustomEvent('revelado')); io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });
  const dobra = innerHeight;
  const tops = els.map((el) => el.getBoundingClientRect().top);       // leitura em lote: 1 layout só
  els.forEach((el, k) => { if (tops[k] > dobra){ el.dataset.revelar = 'aguardando'; io.observe(el); } });
  addEventListener('beforeprint', () => els.forEach((el) => (el.dataset.revelar = 'visto')));
})();
```

### 4.2 Peças reutilizáveis

**Contadores:** o valor final já está no HTML. A animação conta só a parte visual, enquanto o leitor de tela lê o valor final num `.sr-only`. Use `tabular-nums` e `min-width` em `ch` para não ter CLS.

```html
<p class="numero"><span class="sr-only">12 artes marciais</span>
  <span aria-hidden="true" data-contar="12" data-revelar>12</span> artes</p>
```
```js
// contar.js — easing exponencial (~mesma sensação do cubic-bezier(0.16,1,0.3,1))
document.querySelectorAll('[data-contar]').forEach((el) => {
  const alvo = Number(el.dataset.contar), suf = el.dataset.sufixo || '', fmt = new Intl.NumberFormat('pt-BR');
  el.style.minWidth = `${fmt.format(alvo).length + suf.length}ch`;
  el.addEventListener('revelado', () => {
    const t0 = performance.now(), dur = 1400;
    const passo = (t) => { const p = Math.min((t - t0) / dur, 1), e = p === 1 ? 1 : 1 - 2 ** (-10 * p);
      el.textContent = fmt.format(Math.round(alvo * e)) + suf; if (p < 1) requestAnimationFrame(passo); };
    el.textContent = '0' + suf; requestAnimationFrame(passo);
  }, { once: true });
});
```
Atenção ao doc 01: **nenhum número inventado.** Só conte o que for fato (12 artes, 14 dias, R$ 39,90). Não use contador para "milhares de alunos" sem dado.

**Barra de prontidão** (a faixa desliza para dentro da bainha): o preenchimento tem a largura toda e o gradiente do cordão, e se desloca com `translateX`. Isso não distorce o gradiente (o que aconteceria com `scaleX`) e não mexe no layout (o que aconteceria com `width`). A ponteira com graus é a ponta que avança.

```html
<div class="prontidao" role="progressbar" aria-label="Prontidão para a próxima graduação"
     aria-valuemin="0" aria-valuemax="100" aria-valuenow="72" style="--p:.72; --i:0" data-revelar>
  <div class="prontidao__trilho"><div class="prontidao__fill" style="--faixa: var(--grad-cordao-capoeira)">
    <span class="prontidao__ponta" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div></div>
  <span class="prontidao__valor"><span aria-hidden="true" data-contar="72" data-sufixo="%">72%</span></span>
</div>
```
```css
.prontidao__trilho{ height: 14px; overflow: hidden; background: rgb(255 255 255 / .08);
  clip-path: polygon(4px 0, 100% 0, 100% 100%, 4px 100%, 0 50%); }
.prontidao__fill{
  position: relative; height: 100%; background: var(--faixa);
  transform: translateX(calc((var(--p) - 1) * 100%));                 /* repouso = valor final */
  transition: transform var(--dur-6) var(--ease-out) calc(150ms + var(--i, 0) * 120ms);
}
[data-revelar="aguardando"] .prontidao__fill{ transform: translateX(-100%); }
.prontidao__ponta{ position: absolute; right: 0; top: 0; bottom: 0; width: 30px; background: var(--c-ponteira);
  display: flex; align-items: center; justify-content: center; gap: 3px; }
.prontidao__ponta i{ width: 2px; height: 60%; background: #fff; }
```

**A faixa que ganha graus** (seção 4 e fio da página):
```css
.faixa{ --cor: var(--faixa-azul); position: relative; height: 28px; background: var(--cor);
  box-shadow: inset 0 -3px 0 rgb(0 0 0 / .18), inset 0 2px 0 rgb(255 255 255 / .12); }
.faixa__ponta{ position: absolute; right: 8%; top: 0; bottom: 0; width: 22%; background: var(--c-ponteira);
  display: flex; flex-direction: row-reverse; align-items: center; gap: 6%; padding-inline: 6%; }   /* grau entra da ponta para dentro */
.faixa__ponta i{ width: 7%; height: 70%; background: #fff; border-radius: 1px;
  transform: scaleY(0); opacity: 0; transition: transform 420ms var(--ease-snap), opacity var(--dur-2) var(--ease-out); }
.faixa__ponta i.is-aceso{ transform: scaleY(1); opacity: 1; }
.faixa--infantil .faixa__ponta i.is-vermelho{ background: var(--faixa-ponta-vermelha); }           /* regra do doc 01 */
```
O botão "+ Adicionar grau" adiciona `.is-aceso` ao próximo `<i>` e dispara um anel de luz de 600 ms (pseudo com `opacity` e `scale`) em volta do grau novo. Se a faixa já tem 4 graus, o botão vira "Trocar faixa", a faixa inteira desliza para fora (`translateX(110%)`, 480 ms) e a próxima entra pela esquerda.

**Cards com inclinação (tilt leve, só mouse):** no máximo 6° e `perspective(900px)`. O brilho é um pseudo que se move por `transform`, sem repintar o gradiente.

```css
.card{ --cut: var(--cut-md); position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgb(255 255 255 / .09), rgb(255 255 255 / .03));
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / .12);
  transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform var(--dur-5) var(--ease-out); }
.card.is-tilt{ transition-duration: var(--dur-1); }
.card::after{ content: ""; position: absolute; width: 200%; aspect-ratio: 1; left: -50%; top: -50%; pointer-events: none;
  background: radial-gradient(closest-side, rgb(255 255 255 / .14), transparent 70%);
  opacity: 0; transform: translate(var(--gx, 0%), var(--gy, 0%)); transition: opacity var(--dur-3) var(--ease-out); }
.card.is-tilt::after{ opacity: 1; }
```
```js
// inclinar.js (≈0,6 KB)
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
  const MAX = 6;
  document.querySelectorAll('[data-tilt]').forEach((c) => {
    let r, raf = 0, x = 0, y = 0;
    const aplicar = () => { raf = 0;
      c.style.setProperty('--rx', `${(-y * MAX).toFixed(2)}deg`); c.style.setProperty('--ry', `${(x * MAX).toFixed(2)}deg`);
      c.style.setProperty('--gx', `${(x * 50).toFixed(1)}%`);    c.style.setProperty('--gy', `${(y * 50).toFixed(1)}%`); };
    c.addEventListener('pointerenter', () => { r = c.getBoundingClientRect(); c.style.willChange = 'transform'; c.classList.add('is-tilt'); });
    c.addEventListener('pointermove', (e) => { x = (e.clientX - r.left) / r.width - .5; y = (e.clientY - r.top) / r.height - .5;
      if (!raf) raf = requestAnimationFrame(aplicar); }, { passive: true });
    c.addEventListener('pointerleave', () => { x = y = 0; aplicar(); c.classList.remove('is-tilt');
      c.addEventListener('transitionend', () => (c.style.willChange = ''), { once: true }); });
  });
})();
```

**Holofote do cursor (seções escuras, só mouse):** um único elemento fixo de 640 px com gradiente radial verde-azulado a 10 %, movido por `translate3d` em rAF. Aparece (`opacity`) só sobre seções com `data-holofote`. O cursor do sistema nunca é substituído, por acessibilidade. Também: `::selection { background: var(--c-verde); color: var(--c-navy-900); }` (11,17:1).

**Fio da página (faixa de progresso com 4 graus, do doc 01):** é uma barra fixa de 3 px no topo, sob o cabeçalho. O preenchimento usa `animation-timeline: scroll()` onde houver suporte, com fallback em rAF de `scroll` passivo escrevendo `transform: scaleX()`. Os 4 graus na ponta acendem quando as seções 3, 5, 8 e 11 entram (IntersectionObserver), com `grau-pop`. No fim, a frase "Quatro graus. Falta amarrar." e o CTA final executam o "amarrar" uma vez, sozinhos.

```css
.fio{ position: fixed; inset: var(--altura-header) 0 auto; height: 3px; z-index: var(--z-header); pointer-events: none; }
.fio__fill{ height: 100%; background: linear-gradient(90deg, var(--c-teal), var(--c-verde)); transform-origin: left; transform: scaleX(var(--progresso, 0)); }
@supports (animation-timeline: scroll()){
  .fio__fill{ animation: encher linear both; animation-timeline: scroll(root); }
}
@keyframes encher{ from{ transform: scaleX(0); } to{ transform: scaleX(1); } }
```

### 4.3 Mapa seção a seção (arquitetura do doc 01)

| # | Seção | Entrada (1 vez) | Interação | Contínuo? | Fica estático |
|---|---|---|---|---|---|
| — | Cabeçalho | logo: nó pop + graus acendem (500 ms) | some ao rolar para baixo (`translateY(-100%)`, 320 ms) e volta ao subir; vidro aparece depois do herói; graus do logo acendem no hover | não | links |
| 1 | Herói | título por linhas, faixa-mini, octógono que se desenha | faíscas; chips "Qual é a sua arte?" | **vídeo (o único loop da página)** | — |
| 1b | Chips de arte | chips surgem com 40 ms entre um e outro | chip escolhido: fundo chanfrado preenche da esquerda (`scaleX`, 320 ms); o tema troca com **View Transition** (`document.startViewTransition`, 480 ms `--ease-out`) onde existir, ou com transição de cor no fallback; o travessão do logo vira a peça da arte | não | — |
| 2 | Amanhã, no celular do aluno | celular sobe 24 px + sombra cresce | digitar o nome atualiza a URL e a carteirinha com crossfade de 200 ms; cursor de digitação piscando só com o campo em foco | não | moldura do celular |
| 3 | Sem / Com | os dois lados entram com 70 ms entre si | controle deslizante (`clip-path: inset()` no lado "Com"; o arraste é do usuário, com teclado pelas setas); a alça é um octógono com 4 graus | não | textos |
| 4 | Graduação na palma da mão | a faixa desliza para dentro, os graus acendem 1 a 1, as barras de prontidão enchem (1,2 s, escalonadas em 120 ms) | "+ Adicionar grau", "Trocar faixa" | não | legenda das regras |
| 5 | Uma escola, várias artes | barras do gráfico (`scaleY`, origem embaixo); cada turma entra com 150 ms, na cor da sua arte | hover num card destaca a turma no gráfico | não | eixos e rótulos |
| 6 | O que o aluno conquista | brasões "trancados" (cinza, cadeado); ao revelar, giram 180° em Y e acendem (600 ms, `--ease-snap`) | tocar no brasão mostra "como se ganha?" | não | certificado (só o QR pulsa 1 vez) |
| 7 | Dia de campeonato | a chave avança 1 rodada a cada 900 ms **uma única vez**, ao entrar na tela; depois aparece "Rodar de novo" | botão de reprisar | **não** (roda 1 vez) | placar final |
| 8 | Escola inclusiva | o laço se abre (`rotate` + `opacity`, 600 ms) | abrir a ficha de apoios (`<details>`; ícone gira 45°) | não | texto de privacidade |
| 9 | O dinheiro é seu | valores do simulador surgem | ao digitar, os números fazem tween de 400 ms (`Intl.NumberFormat`); barra "plano × o que entra" com `scaleX` | não | notas e fontes |
| 10 | Prova real | cards entram | tilt nos 2 cards ("abrir demo", "escola real") | não | — |
| 11 | Preço, dúvidas, CTA final | preço com o 4º grau acendendo; o CTA final "amarra" sozinho uma vez | seletor mensal/anual com indicador deslizante (`translateX`); FAQ em `<details>`, ícone + vira × (45°), conteúdo com `opacity` + 8 px. Altura animada só com `interpolate-size: allow-keywords` (progressivo) | não | tabela, rodapé |

### 4.4 Orçamento de animação

- **Um único loop contínuo por página: o vídeo do herói** (o grão vai junto e pausa com ele). O spinner dos graus existe só durante um envio.
- **Proibidos:** marquee de logos/modalidades, carrossel automático de depoimentos, parallax no celular, scroll-jacking, cursor customizado, Lottie, GSAP e qualquer biblioteca de animação.
- **Entradas:** cada elemento anima uma vez. No máximo 6 elementos por grupo, com 70 ms entre eles. Um grupo inteiro termina em até 700 ms (as barras de prontidão podem ir a 1,4 s).
- **Interação:** hover em até 320 ms, pressionar em 80 ms, amarrar em 420 ms. Nenhuma resposta a clique começa depois de 100 ms (INP).
- **Vidro real (`backdrop-filter`):** no máximo 4 superfícies visíveis ao mesmo tempo (cabeçalho, 2 botões do herói, pausa ou menu). Cards usam vidro falso.
- **Celular:** sem tilt, sem holofote e sem faíscas de movimento (só no toque). O grão fica parado e o tema muda sem View Transition se o aparelho tiver menos de 4 GB (`navigator.deviceMemory < 4`).
- **JS de movimento:** abaixo de 6 KB min+gzip somando tudo: heroi, faiscas, revelar, contar, inclinar, pressionar, fio e menu.
- **Ficam sempre estáticos:** textos longos, preços, tabela, rodapé, formulários (só foco e erro), imagens de tela do produto, legendas, logos de parceiros.

### 4.5 Regras de performance

1. **Animação contínua ou de rolagem só usa `transform` e `opacity`.** Exceções medidas e aceitas: `stroke-dashoffset` do octógono (1 vez, 1,2 s); `background-color` em micro-transições de botão (pintura pequena); `clip-path: inset()` do comparador Sem/Com (o arraste é do usuário, num único elemento).
2. **`will-change` pontual:** só no vídeo, no grão e durante a interação (posto no `pointerenter`, tirado no `transitionend`). Nunca em lista e nunca via CSS em `.card`.
3. **Sombras dinâmicas = pseudo com `filter: blur()` estático e `opacity` animada.** Nunca animar `box-shadow` nem `filter: drop-shadow()`. Lembrete: `clip-path` corta `box-shadow`, então a sombra de peça chanfrada é sempre um pseudo fora do clip.
4. **IntersectionObserver em vez de `scroll` listener.** O único ouvinte de `scroll` (fio de progresso no fallback) é `passive` e escreve em rAF.
5. **Ler e depois escrever:** medir com `getBoundingClientRect` em lote e escrever num rAF. Nada de ler layout dentro de `pointermove` (o tilt guarda o `rect` no `pointerenter`).
6. **`content-visibility: auto` + `contain-intrinsic-size: auto 900px`** nas seções 5 a 11.
7. **Fontes:** preload só do woff2 do título (subset latin, ~25–35 KB, estimativa), `font-display: swap` e `@font-face` de fallback com `size-adjust`/`ascent-override` calibrados (ferramenta: pacote `fontaine` ou "Fallback Font Generator") para CLS ≈ 0 na troca.
8. **Metas no celular (Moto G Power / iPhone SE em 4G lento):** LCP ≤ 2,5 s, CLS ≤ 0,05, INP ≤ 200 ms, Lighthouse mobile ≥ 90, peso inicial sem vídeo ≤ 350 KB. Conferir no DevTools com Rendering → "Paint flashing" e "Layer borders": nenhuma faixa verde contínua fora do vídeo.
9. **Movimento reduzido global:**
```css
@media (prefers-reduced-motion: reduce){
  :root{ --dur-1: 1ms; --dur-2: 1ms; --dur-3: 1ms; --dur-4: 1ms; --dur-5: 1ms; --dur-6: 1ms; --escalonar: 0ms; }
  *, *::before, *::after{ animation-duration: 1ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
```
Mudanças de cor e de estado continuam a acontecer, só que instantâneas. Os graus do botão "carregando" ficam acesos fixos e o texto informa o estado.

---

## 5. Tokens CSS

### 5.1 Contraste medido (WCAG 2.x)

| Texto / elemento | Fundo | Razão | Uso |
|---|---|---|---|
| #04122B (navy-900) | #00E676 verde | **11,17** | texto do botão primário |
| #04122B | #33EB8F verde-claro | 11,91 | primário em hover |
| #FFFFFF | #002D72 navy | 12,98 | primário sobre claro, títulos |
| #00E676 | #060B16 noite | 11,79 | destaque, foco no escuro |
| #5FD0C2 teal-claro | #060B16 | 10,58 | link no escuro |
| #8FA3BF | #0B1528 | 7,08 | texto secundário no escuro |
| #FF8A3D fogo | #0B1528 | 7,77 | detalhe ou rótulo de ênfase |
| #1F7A70 teal-tinta | #EAF2F1 | 4,53 | link e texto teal no claro (AA) |
| #FFFFFF | #1F7A70 | 5,15 | botão teal com texto branco (se precisar) |
| #4B5B70 | #EAF2F1 | 6,10 | texto secundário no claro |
| #A9B8CC | #2A3850 | 5,85 | botão desabilitado |
| #FFFFFF | #389E92 teal da marca | **3,24 ✗** | só para texto ≥ 24 px ou peso 700 ≥ 18,66 px; nunca em botão |
| #389E92 | #EAF2F1 | **2,85 ✗** | só decoração (faixas, ícones grandes com rótulo) |
| #00E676 | #EAF2F1 | **1,47 ✗** | nunca como texto, ícone ou borda de componente no claro |

### 5.2 Bloco `:root`

```css
:root{
  /* ---------- cores da marca ---------- */
  --c-navy: #002D72;
  --c-navy-900: #04122B;          /* tinta sobre verde */
  --c-teal: #389E92;              /* decorativo: travessão, faixas, ícones grandes */
  --c-teal-tinta: #1F7A70;        /* texto teal sobre claro (4,53:1) */
  --c-teal-claro: #5FD0C2;        /* texto teal sobre escuro (10,58:1) */
  --c-verde: #00E676;             /* o nó / atleta: um destaque por tela */
  --c-verde-claro: #33EB8F;
  --c-ponteira: #151515;
  --c-fundo: #EAF2F1;
  --c-branco: #FFFFFF;

  /* ---------- noite (superfícies escuras) ---------- */
  --c-noite: #060B16;
  --c-noite-2: #0B1528;
  --c-noite-3: #0E2A5C;
  --c-vidro: rgb(8 18 40 / .55);
  --c-vidro-forte: rgb(6 11 22 / .86);
  --c-vidro-claro: rgb(255 255 255 / .62);
  --c-linha-escuro: rgb(255 255 255 / .12);
  --c-linha-claro: rgb(0 45 114 / .14);

  /* ---------- tintas de texto ---------- */
  --c-tinta-escuro-1: #FFFFFF;    /* sobre noite */
  --c-tinta-escuro-2: #C9D6E8;    /* 13,37:1 */
  --c-tinta-escuro-3: #8FA3BF;    /* 7,65:1 */
  --c-tinta-claro-1: #002D72;     /* sobre #EAF2F1: 11,41:1 */
  --c-tinta-claro-2: #4B5B70;     /* 6,10:1 */

  /* ---------- luz do vídeo ---------- */
  --c-fogo: #FF8A3D;
  --c-fogo-claro: #FFE3A3;
  --c-nevoa: #3A6BFF;

  /* ---------- foco ---------- */
  --c-foco: #00E676;              /* no escuro */
  --c-foco-claro: #002D72;        /* no claro */

  /* ---------- faixas, cordões e prajieds (padrão; cada escola configura a sua escada) ---------- */
  --faixa-branca: #F4F6F8;  --faixa-azul: #1F4FD1;  --faixa-roxa: #6B2FB3;
  --faixa-marrom: #6B3E1E;  --faixa-preta: #111111;
  --faixa-ponta-preta: #151515;  --faixa-ponta-vermelha: #C8102E;
  --grad-cordao-capoeira: repeating-linear-gradient(-55deg, #009C3B 0 7px, #FFDF00 7px 14px, #002776 14px 21px);
  --grad-faixa-azul: linear-gradient(180deg, #2A5BE0, #1F4FD1 55%, #173CA3);
  --grad-prajied: repeating-linear-gradient(-55deg, #C8102E 0 6px, #F2C14E 6px 9px, #C8102E 9px 15px);
  --grad-niveis: linear-gradient(90deg, #389E92, #00E676);
  --grad-marca: linear-gradient(135deg, #002D72 0%, #389E92 60%, #00E676 100%);

  /* ---------- tipografia ---------- */
  --fonte-display: "Big Shoulders Display", "Barlow Condensed", "Display Fallback", "Arial Narrow", sans-serif;
  --fonte-texto: "Archivo", "Texto Fallback", system-ui, sans-serif;
  --t-hero: clamp(2.75rem, 1.4rem + 6.2vw, 6.5rem);
  --t-h2: clamp(2rem, 1.2rem + 3.6vw, 4rem);
  --t-h3: clamp(1.375rem, 1.1rem + 1.2vw, 1.75rem);
  --t-corpo: clamp(1rem, .95rem + .25vw, 1.125rem);
  --t-rotulo: .8125rem;

  /* ---------- formas (chanfros octogonais em vez de raios) ---------- */
  --cut-xs: 4px;   /* chips, tags */
  --cut-sm: 8px;   /* botões */
  --cut-md: 14px;  /* cards */
  --cut-lg: 24px;  /* painéis, palco */
  --octo-regular: polygon(29.3% 0, 70.7% 0, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0 70.7%, 0 29.3%);
  --raio-campo: 6px;   /* inputs (exceção: legibilidade do campo) */

  /* ---------- sombras (estáticas; o "dinâmico" é a opacity de um pseudo) ---------- */
  --sombra-1: 0 1px 2px rgb(4 18 43 / .25), 0 2px 8px rgb(4 18 43 / .18);
  --sombra-2: 0 8px 24px -6px rgb(4 18 43 / .45), 0 2px 6px rgb(4 18 43 / .2);
  --sombra-3: 0 24px 60px -12px rgb(4 18 43 / .6);
  --glow-verde: 0 10px 30px -8px rgb(0 230 118 / .55);
  --glow-fogo: 0 10px 40px -10px rgb(255 138 61 / .5);

  /* ---------- tempos ---------- */
  --dur-0: 80ms;     /* pressionar */
  --dur-1: 120ms;    /* retorno instantâneo */
  --dur-2: 200ms;    /* cor, opacidade de hover */
  --dur-3: 320ms;    /* forma de hover */
  --dur-4: 480ms;    /* entradas pequenas, menu */
  --dur-5: 720ms;    /* entradas de bloco, título */
  --dur-6: 1200ms;   /* barras, contadores */
  --escalonar: 70ms;

  /* ---------- curvas ---------- */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);       /* curva oficial do projeto */
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);        /* saídas */
  --ease-snap: cubic-bezier(0.34, 1.56, 0.64, 1);  /* "amarrar", graus: leve ultrapassagem */

  /* ---------- camadas ---------- */
  --z-fundo: -1;
  --z-base: 0;
  --z-palco: 1;
  --z-sobre-palco: 2;
  --z-controle: 3;
  --z-header: 50;
  --z-barra-fixa: 60;
  --z-menu: 80;
  --z-toast: 90;
  --z-modal: 100;

  /* ---------- medidas ---------- */
  --altura-header: 64px;
  --gutter: 16px;
  --largura-max: 1240px;
}
@media (min-width: 1024px){ :root{ --altura-header: 76px; --gutter: clamp(24px, 4vw, 64px); } }
```

---

## Resumo (10 linhas)

1. O look é **"Arena Noturna — cartaz de luta"**: fundo #060B16, títulos em Big Shoulders Display 900 ultracondensado, texto em Archivo variável (wdth 75/100), cantos sempre chanfrados em octógono e um verde por tela.
2. Herói: palco 4:3 **sem corte lateral**. No celular, o palco fica inteiro no topo e o texto embaixo. No desktop, a grade 5/7 mostra o vídeo inteiro. Quando precisa cortar, corta o chão com `object-position` entre 50% 28% e 50% 32%.
3. O vídeo atual tem **corte seco no loop** (SSIM 0,19 entre o último e o primeiro quadro) e áudio embutido. A receita ffmpeg costura com crossfade de 0,5 s e remove o áudio.
4. Pesos medidos: **AV1 293 KB no celular e 474 KB no desktop**, H.264 de reserva com 374/673 KB, pôsteres WebP de 38/64 KB. O VP9 saiu maior que o H.264 e ficou fora.
5. O vídeo só baixa depois do `load`. Pausa fora da tela, respeita movimento reduzido e Save-Data/2g/3g (opt-in) e tem botão de pausa persistente (WCAG 2.2.2).
6. Efeito assinatura: o **nó verde nasce no topo e a faixa se desenha em volta da arena**, virando a moldura chanfrada do palco. Faíscas de fogo reagem ao cursor e ao toque, limitadas a 60 partículas.
7. Botões: primário com **ponteira de 4 graus que acendem no hover e "amarram" no clique**, vidro com borda em gradiente, link-seta com faixa que se desenha e ícone octogonal que gira. O carregando usa os graus como spinner.
8. Contraste medido: o primário navy-900 sobre verde dá 11,17:1. **Branco sobre teal (3,24), teal sobre claro (2,85) e verde sobre claro (1,47) reprovam**, e por isso existem os tokens `--c-teal-tinta` (4,53) e o primário navy nas seções claras.
9. Movimento: entradas só escondidas pelo JS e só abaixo da dobra, barras de prontidão em `translateX` (o gradiente não distorce), graus que acendem, tilt de no máximo 6° só com mouse e um único loop contínuo na página.
10. Performance: só `transform`/`opacity`, `will-change` só durante a interação, no máximo 4 vidros reais, menos de 6 KB de JS de movimento, metas LCP ≤ 2,5 s / CLS ≤ 0,05 / INP ≤ 200 ms no 4G.
