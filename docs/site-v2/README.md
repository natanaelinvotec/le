# Site atletapay.com.br v2 — "Arena" (publicado no código em 11/10/2026)

Arquivos: `atletapay/index.html`, `atletapay/css/site.css`, `atletapay/js/site-v2.js`, `atletapay/assets/heroi/` (vídeo e pôsteres), `atletapay/assets/site/` (capturas da demo).
O site antigo (`css/atletapay.css`, `js/site.js`) continua servindo as outras páginas (cadastro, painel, conta, privacidade).

## Como funciona
- **Herói:** vídeo dos 4 lutadores com o loop costurado e sem áudio.
  - Formatos: AV1 e H.264 em 640 (celular) e 960 (computador), com pôster WebP.
  - O vídeo só baixa depois do `load` e pausa fora da tela.
  - Com movimento reduzido ou economia de dados não toca sozinho.
  - O botão de pausa também para as faíscas e o grão, e a escolha fica salva no aparelho (`ap.video.pausado`).
- **"Qual é a sua arte?":** 12 artes, com os dados lidos do próprio app (`/app/js/modalidades.js`, `escola.js`, `faixas.js`, `brasoes.js`). A arte escolhida fica salva em `ap.arte`. Ela troca:
  - o vocabulário (saudação, peça, local, luta);
  - a faixa desenhada pelo `faixaSVG` do app;
  - a carteirinha do celular;
  - os brasões exclusivos;
  - a cor do travessão do logo.
- **Prévia "nome da sua escola":** só local, nada é enviado.
- **Simulador:** usa `js/catalogo.js` (`valorDoMes`).
- **Campeonato:** roda uma vez ao aparecer na tela; depois aparece "Rodar de novo".
- **Movimento:**
  - só o que está abaixo da dobra é escondido para a entrada; sem JS tudo aparece;
  - o JS mínimo cuida do menu (com `inert`), do cabeçalho que some e volta e do fio de progresso com 4 graus.

## Honestidade (revisão da equipe)
- **Pix integrado:** ainda não existe no código e aparece como "em breve". Hoje a mensalidade é lançada e acompanhada no painel.
- **Rede entre escolas (Global):** ainda não existe e aparece como "vem aí".
- **Campeonato:** o pódio gera brasão e post na Rede. Não gera certificado nem tem check-in por QR.
- **Brasões:** são 50 gerais mais os exclusivos da arte. Os exclusivos fora da capoeira são concedidos pelo professor.
- **Sem invenções:** nenhum contador, depoimento ou número de clientes. A única urgência é o preço de lançamento para quem assinar em 2026.

## Pendências para o dono
- Rodapé (Decreto 7.962/2013): razão social ou responsável, CNPJ e endereço.
- Forma de pagamento da assinatura e o que acontece no fim do teste.
- Botão de cancelamento no painel; hoje o cancelamento é pelo e-mail.
- Versão de lançamento dos termos.
- Texto de consentimento da biometria.
- Fontes servidas pelo próprio site (woff2 em `/assets/fontes/`) para não depender do Google.
- Loop do vídeo gerado com o primeiro e o último quadro iguais (a emenda atual usa crossfade de 0,5 s).

## Site da escola, domínio e marketing (11/10/2026)
- Nova seção `#site-escola` com três cartões:
  - Incluso no plano: o endereço atletapay.com.br/suaescola, com identidade, inscrição e app.
  - Domínio profissional: www.suaescola.com.br por **R$ 129,99/ano**. Inclui o registro .com.br (R$ 40,00/ano, conferido em registro.br/dominio/valores) e a hospedagem com HTTPS. Exemplo no ar: liberdadeeexpressao.com.br.
  - Marketing: redes sociais e Perfil da Empresa no Google (Google Maps). Contato por contato@atletapay.com.br.
- O card "Uma escola real no ar" leva ao site (liberdadeeexpressao.com.br) e ao app (/liberdadeeexpressao).
- ATENÇÃO, o produto ainda não acompanha a promessa:
  - Hoje só a Liberdade tem site público completo (index.html + siteConteudo/site, uma escola só).
  - Para as outras escolas, atletapay.com.br/<escola> abre a tela de entrada/login com a identidade da escola. O modelo de site escolhido no cadastro (5 modelos) é gravado, mas ainda não há gerador de site por escola.
  - Domínio próprio de outra escola hoje cairia na landing da AtletaPay na raiz.
  - Para vender o pacote de R$ 129,99, falta: site público por escola (site-render multi-escola lendo escolasPublicas + siteConteudo/{escolaId}) e a raiz do domínio próprio abrindo o site da escola.
