# AtletaPay · Roteiro da v33 e próximos passos

> Para revisar com calma. Está tudo num pacote só (v33), então você sobe uma vez.
> Depois é só seguir a lista de conferência (parte 3) e as tarefas que só você pode fazer (parte 4).
> Data: 08/10/2026 · Service worker: `le-app-v31` · 54 testes de lógica passando.

---

## 0. Resumo em 1 minuto

| O que | Para quem | Muda algo na Liberdade? |
|---|---|---|
| O app **veste a escola do login**: nome, logo, cores, termos ("faixa" em vez de "cordão") e a escada de graduação | Escolas novas (Jiu-Jitsu etc.) | Não. A escola nº 1 continua igual e não faz nenhuma leitura a mais |
| **Graus** (Jiu-Jitsu): o professor escolhe o grau ao avaliar, e o perfil mostra "Azul · 2º grau" com a **faixa desenhada em vetor** | Escolas de faixa | Não. Capoeira não tem graus, então o campo nem aparece |
| **Aviso de graduação** pelo servidor: faixa nova ou grau novo vira notificação, inclusive para o responsável do menor | Escolas novas | Não. A Liberdade continua com certificados e festa de cordão |
| **E-mails próprios da plataforma**: nova senha e confirmação com o nome, o logo e a cor da escola, link em **atletapay.com.br/conta** | Todas as escolas | Só quando você ligar (parte 4). Até lá tudo segue pelo e-mail padrão do Firebase |
| **Mega painel**: aba **Configurações** (e-mails), botões **Números**, **Editar dados** e **Abrir o app da escola** | Você (Admin Master) | — |
| **Painel do dono**: cartão **Números da escola** | Dono de cada escola | — |
| Inscrição **nunca usa a "última escola"** do aparelho | Todas | Protege celular compartilhado (evita inscrever alguém na escola errada) |
| Botão **Entrar** com a cor da escola | Escolas novas | Não |

---

## 1. O que entra na v33 (detalhado)

### 1.1 App veste a escola do login (etapa 2b)
- **Como funciona**
  - Ao entrar, `observarSessao` (js/firebase.js) chama `prepararEscola()` uma vez por página, antes de qualquer tela desenhar.
  - Se a escola não é a nº 1, ela carrega o cartão público (`escolasPublicas/{id}`) e aplica tudo:
    - `aplicarEscola`: nome, peça ("faixa"), líder ("Professor"), escada adulto/infantil, idade infantil e critérios de avaliação.
    - `aplicarIdentidade`: troca os textos da tela, o logo (ou um monograma com as iniciais, ex.: "CD"), o favicon, a cor da barra do celular e as cores.
  - Um observador continua trocando os textos que aparecem depois (listas, janelas, avisos).
- **Telas cobertas:** entrar, app do aluno, painel (admin/professor), rede e inscrição.
- **Idade infantil por escola:** no Jiu-Jitsu, infantil vai até 15 anos (`IDADE_KIDS` = 16). Na capoeira continua 12. Admin, app e rede usam o valor da escola, não mais o "12" fixo.
- **Escolhendo a escola na tela de entrar:**
  - `login.html?escola=<id>` abre com a cara da escola.
  - Sem `?escola`, usa a última escola usada naquele aparelho.
  - Depois do login vale sempre a escola da conta.

### 1.2 Graus (Jiu-Jitsu e artes com graus)
- **Painel do professor:** na avaliação aparece "Graus na ponteira" somente quando a faixa escolhida tem graus. O select é refeito ao trocar a faixa.
- **Ao salvar:**
  - grava `grausAtual`;
  - o histórico ganha uma linha "grau" (de qual grau para qual, quando e por quem);
  - na troca de faixa o grau vai junto no histórico.
- **Rede:** o título e a pílula do perfil mostram "Azul · 2º grau". Nas escolas de faixa, a faixa aparece desenhada em vetor (`js/faixas.js`) com os graus na ponteira.
- **App do aluno:** o nome da graduação atual já inclui o grau.

### 1.3 Servidor: graduação das outras escolas (`functions/src/graduacao-escola.js`)
- **Cadastro novo** entra como "Iniciante" (o valor neutro da inscrição). O servidor troca para a 1ª graduação da escada pela idade (Branca no Jiu-Jitsu, adulto ou infantil) com 0 graus.
- **Subiu de faixa:** notificação "Faixa Azul!" para o atleta.
- **Subiu de grau:** "Novo grau: Azul · 2º grau!".
- **Menor de idade:** o responsável recebe a mesma notificação ("Kid: faixa Cinza!").
- Cada notificação tem um id fixo por graduação, então não duplica.
- Certificado e brasões de cordão continuam só da Liberdade (`!outraEscola`). O certificado de faixa fica para a v34 (parte 5).

### 1.4 E-mails próprios da plataforma (`functions/src/emails.js`)
- **Por quê:** o Firebase recusou editar os modelos de e-mail neste projeto. Por isso o link vinha como `capoeira-liberdade.firebaseapp.com/__/auth/action…&lang=en`.
- **Como funciona:**
  1. O app (ou a AtletaPay) grava um pedido em `pedidosEmail` com tipo, e-mail e página de volta. A regra só aceita esses campos, e ninguém lê os pedidos.
  2. O servidor gera o link oficial (Admin SDK) e o reescreve para **https://atletapay.com.br/conta**. Ele mantém só o código, a volta segura e o idioma pt-BR.
  3. O servidor monta o e-mail com o nome, o logo e a cor da escola da pessoa, e manda pelo Resend ou pelo Brevo.
- **Limites contra abuso:**
  - 3 por hora e 6 por dia por e-mail;
  - 300 por hora na plataforma toda.
  - O e-mail é guardado como hash.
  - E-mail sem conta não recebe nada, e a resposta é igual para não revelar quem tem conta.
- **Chave do serviço:**
  - fica em `segredos/email`;
  - **ninguém lê** pelas regras, nem você no painel;
  - só o Admin grava, e só o servidor usa.
- **Liga/desliga:** a flag `plataforma/publico.emailsProprios` só é ligada pelo servidor depois de um teste que funcionou. Se o teste falhar, desliga sozinho e o app volta ao e-mail do Firebase.

### 1.5 Mega painel (atletapay.com.br/master)
- **Aba Configurações** → "E-mails da plataforma":
  - escolha do serviço, chave, remetente e nome;
  - **Salvar e mandar um teste para mim** e **Desligar**;
  - passo a passo embutido.
  - Novo: dá para trocar só o remetente ou o nome sem colar a chave de novo.
- **Cartão da escola:**
  - **Números**: alunos, ativos, núcleos, presenças e posts. É uma contagem no servidor, 1 leitura cada, nunca a lista inteira.
  - **Editar dados**: nome, cidade, contatos etc. O servidor republica o cartão público na hora.
  - **Abrir o app da escola**: abre `login.html?escola=<id>`.
- A lista ao vivo não "pula" enquanto você digita num formulário.

### 1.6 Painel do dono (atletapay.com.br/painel)
- Cartão **Números da escola**, que aparece depois da ativação.
- Link "Entrar no app" já com `?escola=`.

### 1.7 Segurança (regras do Firestore)
- `pedidosEmail`:
  - criação pública e enxuta: campos fixos, e-mail validado, tamanho máximo;
  - tipo "confirmar" só para o próprio e-mail logado;
  - leitura, edição e apagar: ninguém.
- `segredos/email`:
  - leitura: ninguém;
  - gravação: só o Admin, com serviço válido, chave de 10 a 300 caracteres, remetente até 120 e nome até 60.
- `plataforma/*`: leitura pública, gravação só pelo servidor.
- `comandos`: aceita o tipo `testarEmail`, que só o Admin dispara.
- **Testes:**
  - 54 de lógica, com 4 novos: aluno novo do CT e 3 de e-mail.
  - 1 teste de regras novo para os e-mails próprios. Ele roda no GitHub Actions.

---

## 2. Como subir (uma vez só)

1. Descompacte o `.zip`. Ele não é `.rar`, porque aqui só consigo gerar `.zip`.
2. Abra https://github.com/natanaelinvotec/le/upload/main.
3. Arraste **as pastas e arquivos de dentro** do zip: `js`, `functions`, `firebase`, `tests`, `atletapay`, `docs` e os `.html` + `sw.js` soltos.
4. Mensagem do commit: `v33 — escola do login, graus, e-mails próprios, Mega painel`. Depois clique em **Commit changes**.
5. Me avise com "publiquei". Eu confiro arquivo por arquivo com o GitHub e acompanho o Actions (Firebase: regras + funções + sites).

> A pasta `.github` não vai no pacote: o upload do GitHub ignora essa pasta, e o workflow atual já funciona.

**Lista de arquivos (36):**

- **App:**
  - `admin.html`, `app.html`, `inscricao.html`, `login.html`, `rede.html`, `sw.js`
  - `js/admin.js`, `js/escola.js`, `js/escola-atual.js`, `js/firebase.js`, `js/inscricao.js`, `js/login.js`, `js/rede.js`
- **Servidor:**
  - `functions/index.js`
  - `functions/src/emails.js` *(novo)*, `functions/src/graduacao-escola.js` *(novo)*
  - `functions/src/gatilhos.js`, `functions/src/perfil.js`, `functions/src/rotinas.js`
  - `functions/src/compartilhado/escola.js`
  - `functions/test/logica.test.mjs`
- **Regras e testes:** `firebase/firestore.rules`, `tests/regras/regras.test.mjs`
- **AtletaPay:**
  - `atletapay/cadastro.html`, `atletapay/conta.html`, `atletapay/index.html`, `atletapay/master.html`, `atletapay/painel.html`, `atletapay/privacidade.html`
  - `atletapay/css/atletapay.css`
  - `atletapay/js/cadastro.js`, `atletapay/js/conta.js`, `atletapay/js/firebase.js`, `atletapay/js/master.js`, `atletapay/js/painel.js`
- **Este roteiro:** `docs/ROTEIRO-v33.md`

---

## 3. Lista de conferência depois de subir

### 3.1 Publicação
- [ ] GitHub → **Actions**: o workflow do Firebase fica **verde** (regras, índices, funções e os dois sites).
- [ ] Se ficar vermelho, me mande o print do passo que falhou. As regras novas são testadas no próprio Actions.

### 3.2 A Liberdade continua igual (o mais importante)
- [ ] Entrar com uma conta da Liberdade: logo, nome e cores de sempre. Nada de "faixa".
- [ ] Painel do professor: avaliar um aluno. **Não** aparece "Graus na ponteira", e salvar funciona.
- [ ] App do aluno: termômetro e cordão normais. Um aluno com menos de 12 anos continua nas regras Kids.
- [ ] Rede: perfil com a pílula do cordão e **sem** a faixa desenhada.
- [ ] "Esqueci minha senha": o e-mail continua chegando (ainda pelo Firebase, até ligar a parte 4).

### 3.3 Uma escola nova (ex.: o CT de Jiu-Jitsu da fila)
- [ ] Mega painel → **Na fila** → **Ativar**. A ativação fica "ok", com sede criada e o dono como Fundador.
- [ ] **Abrir o app da escola**: a tela de entrar aparece com o nome, o logo ou monograma e o botão na cor da escola.
- [ ] O dono entra e cai no painel com o **nome da escola**. A palavra "cordão" vira "faixa".
- [ ] **Copiar link de inscrição** → inscrever um aluno de teste (adulto) → ele aparece como **Branca**, não "Iniciante".
- [ ] Inscrever um aluno de 10 anos → ele usa a escada infantil.
- [ ] Avaliar o aluno:
  - [ ] Dar **1 grau**: o aluno recebe "Novo grau: Branca · 1º grau!".
  - [ ] Depois passar para **Azul**: recebe "Faixa Azul!". Se for menor, o responsável também recebe.
- [ ] Rede → perfil do aluno: "Azul · 1º grau" e a faixa azul desenhada com a ponteira preta.
- [ ] Mega painel → **Números** da escola mostra as contagens.
- [ ] Mega painel → **Editar dados**: trocar a cidade → o app da escola mostra a cidade nova.
- [ ] Painel do dono (atletapay.com.br/painel) → **Números da escola**.

### 3.4 E-mails (só depois da parte 4)
- [ ] Mega painel → Configurações → **Salvar e mandar um teste para mim** → chega "Teste de e-mail · AtletaPay".
- [ ] "Esqueci minha senha" no app da Liberdade:
  - [ ] o e-mail chega **com o logo da Liberdade**;
  - [ ] o link abre **atletapay.com.br/conta**, em português;
  - [ ] depois de trocar a senha, a pessoa volta ao app.
- [ ] O mesmo numa escola nova: o e-mail sai com o nome e a cor do CT.
- [ ] Pedir 4 vezes seguidas: a 4ª não chega (limite de 3 por hora).

---

## 4. Tarefas que só você pode fazer

Eu não posso criar contas, aceitar termos, colar chaves secretas nem salvar DNS por você. Isso protege a sua conta.

### 4.1 Resend (uns 15 minutos)
1. Crie a conta em **resend.com** com o e-mail da AtletaPay. O plano grátis cobre **100 e-mails por dia e 3.000 por mês**, com até 3 domínios. Isso sobra para senhas e confirmações no piloto.
2. Vá em **Domains → Add domain** → `atletapay.com.br`. Região: São Paulo, se aparecer como opção; senão, a padrão.
3. O Resend mostra 3 ou 4 registros (MX e TXT de SPF num subdomínio `send`, e TXT de DKIM `resend._domainkey`).
4. **Registro.br** → atletapay.com.br → **Configurar zona DNS** → **Nova entrada** para cada registro → **Salvar alterações**. Esse "Salvar" tem que ser você: para mim ele é bloqueado.
5. No Resend, clique em **Verify**. Pode levar de minutos a algumas horas.
6. **API Keys → Create API key**, com permissão *Sending access* e domínio atletapay.com.br. Copie a chave (começa com `re_`).
7. **Mega painel → Configurações**:
   - serviço: Resend;
   - cole a chave;
   - remetente `noreply@atletapay.com.br`;
   - nome `AtletaPay`.
   - Depois clique em **Salvar e mandar um teste para mim**.

> **Alternativa:** Brevo (300 por dia grátis) funciona do mesmo jeito, com a chave começando em `xkeysib-`.

### 4.2 O que ficou do DNS do Firebase (pode ignorar)
- As 4 entradas do Firebase no Registro.br **não foram salvas**:
  - SPF `_spf.firebasemail.com`;
  - TXT `firebase=…`;
  - os dois CNAMEs `firebase1/2._domainkey`.
- A verificação do "domínio de e-mail personalizado" no Firebase foi **cancelada**.
- Com o Resend ligado, **nada disso é necessário**. Os e-mails passam a sair pela plataforma.
- **Não** coloque dois registros SPF no domínio raiz: o Resend usa o subdomínio `send`, então não há conflito.

### 4.3 Conferências no Console do Firebase (2 minutos)
- [ ] **Authentication → Settings → Authorized domains**: precisa ter `atletapay.com.br`. É para o link de volta e para a página /conta.
- [ ] Se o **App Check** estiver em modo obrigatório: no reCAPTCHA, a chave precisa listar `atletapay.com.br` entre os domínios.
- [ ] (Opcional) **Google Auth Platform → Branding** → nome do app "AtletaPay". Isso tira o `%APP_NAME%` dos e-mails antigos do Firebase. Com os e-mails próprios ligados, quase não aparece mais. Essa etapa pede para aceitar a política do Google, por isso fica com você.

### 4.4 Lembrete das contas
- **Admin Master** do Mega painel: `liberdadeeexpressaooficial@gmail.com`.
- `natanael.invotec@gmail.com` é cadastro de **aluno**: no Mega painel ele vê "sem acesso", e isso é o certo.

---

## 5. Próximas etapas (proposta, em ordem)

Cada etapa é um pacote. Os números das versões são só uma sugestão.

### v34 — Faixa completa no dia a dia (escolas de faixa)
- **Certificado de faixa e de grau** para escolas novas:
  - mesmo motor do certificado da Liberdade, com a faixa vetorial;
  - assinatura do professor;
  - verificação por QR (`v.html`).
- **Carteirinha** com a faixa desenhada e os graus.
- **Avaliação com o quadro da CBJJ:**
  - aviso de "tempo mínimo na faixa" (azul 2 anos, roxa 1 ano e meio, marrom 1 ano…);
  - idade mínima para mudar de faixa;
  - um "pronto para graduar" que considera tempo + critérios.
- **Quadro de graduação** (`assets/graduacoes/jiu-jitsu.svg`) numa aba "Graduações" do app.
- **App instalável com a cara da escola:**
  - hoje, quem instala o app de uma escola nova vê o nome e o ícone da Liberdade na tela inicial;
  - solução: um manifesto por escola gerado pelo servidor (`/m/<id>.webmanifest`).

### v35 — Endereço próprio de cada escola
- Servir o app em **atletapay.com.br/<endereço>**, por reescrita do Hosting.
- O link de inscrição e a tela de entrar ficam com o endereço da escola, sem `?escola=`.
- **Separar endereço de identificação**:
  - o id interno fica fixo, e o endereço vira apelido (`escolasSlugs/{endereço}`);
  - botão **Trocar endereço** no Mega painel;
  - o endereço antigo redireciona.
  - Isso responde à pergunta do "gracie-cg mudar o nome": nome, logo e cores **já** mudam livremente em "Editar dados"; o endereço passa a mudar também.
- Trocar o `APP_URL` do Mega painel e do painel do dono para o endereço novo.
- **Domínio próprio da escola** (www.escola.com.br): fluxo do suporte com o campo `dominio`, que só o Admin grava (já está pronto nas regras).

### v36 — Financeiro (Asaas)
- O comparativo já está no projeto (`claude/comparativo-gateways-split.md`).
- **Subconta Asaas por escola**, criada na ativação, com os dados do responsável e a conta para repasse.
- **Mensalidade por PIX e cartão com split automático**: a comissão da AtletaPay vai para a conta da plataforma e o restante cai direto na escola.
- **Webhooks** de pago, vencido e estornado:
  - atualizam `pagamentos`;
  - notificam o aluno e o responsável;
  - abastecem o painel de inadimplência.
- **Mega painel → Financeiro**: assinaturas das escolas, repasses, inadimplência e relatório mensal.
- **NFS-e automática** pela API do Asaas (precisa do cadastro municipal da empresa).
- **Lojinha** (abadás, kimonos, instrumentos) usando o mesmo checkout.

### v37 — Rede Global
- Aba **Global**, só esporte:
  - categorias obrigatórias;
  - moderação;
  - denúncias com prioridade.
- **Menores:** proposta inicial = fora da Global (nem postam, nem aparecem). Fica para decidirmos juntos.
- Conversa direta entre adultos de escolas diferentes: decidir se fica liberada, se exige seguir de volta ou se é bloqueada.

### v38 — Escala (10 mil escolas)
- **Regras só com custom claims:**
  - tirar os `get()` que ainda leem o perfil para saber o papel;
  - menos leituras e regras mais rápidas.
- **Números pré-calculados** (`estatisticas/{escolaId}` por dia) para o Mega painel e para o painel do dono, sem contagem a cada abertura.
- **Índices compostos** revisados para todas as listas com `escolaId` + paginação.
- `config/*` e `materiaisFormacao` **por escola**. Hoje esses dois são só da Liberdade.

### Piloto
- 2 ou 3 mestres e professores de confiança: o CT de Jiu-Jitsu + 1 ou 2 da capoeira.
- **Duas semanas de uso real:** inscrição, aulas, avaliação, graduação e mensalidade.
- **Feedback em formulário simples.** Eu ajusto em pacotes semanais.

---

## 6. Decisões que ficam com você

1. **Rede Global e menores:** fora da Global (minha recomendação) ou visíveis só com autorização do responsável?
2. **Endereço das escolas:** `atletapay.com.br/<endereço>` (recomendado, já combinado) ou também `app.atletapay.com.br/<endereço>`?
3. **Comissão da plataforma no split:** percentual fixo, valor fixo por mensalidade ou plano mensal da escola + taxa menor?
4. **Planos da AtletaPay:** grátis até X alunos? Quais recursos ficam no plano pago (financeiro, certificados, Rede Global)?
5. **E-mails:** Resend (recomendado) ou Brevo?
6. **Instalável por escola (v34):** prioridade alta (o professor vai instalar no primeiro dia) ou depois do certificado?

---

## 7. Pontos de atenção (para não ser surpresa)

- **Escola nova, primeiros milissegundos:** a página nasce com o texto da Liberdade e troca logo depois do login. Em celular lento pode aparecer um "piscar" rápido. A correção definitiva vem com o endereço próprio (v35), quando a escola é conhecida antes de carregar.
- **Troca de textos:** a troca automática cobre os termos conhecidos (cordão, batizado, abadá, capoeira, nome da escola, "Mestre Profeta"). Se você vir algum texto da Liberdade dentro de uma escola nova, mande o print e a tela que eu ajusto.
- **Teste de e-mail que falha desliga os e-mails próprios** de propósito. Assim ninguém fica sem link de senha: o app volta ao e-mail do Firebase até um novo teste dar certo.
- **Contagens do Mega painel** são feitas na hora (1 leitura por número). Com muitas escolas, passam para os números pré-calculados (v38).
- **App instalado de escola nova** ainda mostra o ícone da Liberdade na tela inicial do celular. Isso fica para a v34.

---

## 8. Notas técnicas (para referência)

- **Fluxo da escola no navegador:** `observarSessao` → `prepararEscolaDaPagina()` (import dinâmico de `escola-atual.js`, evitando o ciclo) → `resolverEscolaId()` (login → endereço `?escola=`/última → domínio próprio → Liberdade) → `carregarEscola(id)` (`escolasPublicas`) → `aplicarEscola` (troca as listas **no lugar**, com `splice`, para quem já importou continuar vendo) + `aplicarIdentidade`.
- **`IDADE_KIDS` é `export let`:** os módulos que importam veem o valor novo (ligação viva dos módulos ES). O `app.html` tem cópias locais, sincronizadas por `sincronizarEscolaApp`.
- **Servidor:** `aoEscreverUsuario` → `ehOutraEscola(depois)`? → `aoGraduarNaEscola`. Certificados e brasões de cordão ficam só na escola nº 1.
- **E-mail:** `pedidosEmail` (create) → `pedidoEmailCriado` → `atenderPedidoEmail`:
  1. confere o limite;
  2. `generatePasswordResetLink` / `generateEmailVerificationLink`;
  3. `linkDaPlataforma`;
  4. `marcaDoEmail` (escola da conta);
  5. `montarEmail`;
  6. `enviar` (Resend/Brevo);
  7. apaga o pedido.
- **Teste:** `comandos {tipo:'testarEmail'}` → `testarEmail` → liga ou desliga `plataforma/publico.emailsProprios`.
