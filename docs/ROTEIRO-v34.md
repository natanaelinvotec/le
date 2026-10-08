# AtletaPay · Roteiro da v34 (inclui a v33) — para revisar com calma

> Um pacote só, um upload só.
> Ele traz três blocos:
> 1. **Auditoria de segurança** com as correções (**o mais importante**);
> 2. tudo o que era a **v33** (escola do login, graus, e-mails próprios, Mega painel);
> 3. a **v34** (certificado e carteirinha de faixa, quadro da CBJJ, app instalável por escola).
>
> Data: 08/10/2026 · Service worker `le-app-v32` · **64 testes de lógica passando** · 2 testes de regras novos (rodam no GitHub).

---

## 0. Antes de tudo (leia isto primeiro)

**A auditoria achou falhas graves que já estão no ar hoje.** Elas existem desde que as escolas novas passaram a ter Fundador (v30). Este pacote fecha todas.

| # | Falha (antes desta versão) | Gravidade | Corrigido em |
|---|---|---|---|
| 1 | O **dono de qualquer escola** conseguia se dar o papel `admin` e virar **Admin da plataforma inteira** | Crítica | regras + servidor |
| 2 | Um dono ou professor conseguia **puxar alunos de outra escola**, inclusive menores, trocando o núcleo do cadastro (o servidor mudava a escola e o login da pessoa) | Crítica | regras + servidor desfaz |
| 3 | "Aceitar transferência" funcionava **sem pedido nenhum** e entre escolas | Alta | regras (agora exige o pedido) |
| 4 | Um professor podia se colocar como **responsável legal** de um menor e passar a ler as conversas dele | Alta | regras |
| 5 | Um aviso "para a escola toda" ia para os **1000 primeiros cadastros da plataforma** (todas as escolas) | Alta | servidor |
| 6 | Núcleo criado sem escola caía **dentro da Liberdade** | Alta | regras |
| 7 | O dono de qualquer escola via **fotos e documentos (carteirinha) de todas as escolas** no Storage | Alta | regras do Storage |
| 8 | **Idade exata e foto de menores** (mesmo sem o termo de imagem) no cartão público | Alta | servidor |
| 9 | Vários pontos onde um texto ou id malicioso viraria **código rodando no navegador** de outra pessoa (XSS), inclusive um link de material com `javascript:` | Alta | telas |

Outras falhas corrigidas, de gravidade média ou baixa:
- campeonato e certificado podiam ser "forjados";
- carteirinha podia ser validada "até 2099";
- spam de notificações;
- cota de e-mail podia ser esgotada por um robô;
- links de outro "bucket";
- curtidas e seguidores podiam ser inflados.

A lista completa está na **parte 2**.

**Recomendação:** não ative nenhuma escola nova no Mega painel até este pacote estar publicado e o Actions ficar verde. Na parte 4.0 há uma conferência rápida para ver se alguém já abusou disso.

---

## 1. Como subir (uma vez só)

1. Descompacte o `.zip`. Ele não é `.rar`, porque aqui só consigo gerar `.zip`.
2. Abra https://github.com/natanaelinvotec/le/upload/main.
3. Arraste **as pastas e os arquivos de dentro** do zip: `js`, `functions`, `firebase`, `tests`, `atletapay`, `docs` e os `.html` + `sw.js` soltos.
4. Mensagem do commit: `v34 — auditoria de segurança, faixas (certificado/carteirinha), escola do login, e-mails`. Depois clique em **Commit changes**.
5. Me avise com "publiquei". Eu confiro arquivo por arquivo e acompanho o Actions.

> - A pasta `.github` não vai no pacote: o upload do GitHub ignora essa pasta.
> - O Actions publica primeiro as **regras**, depois as **funções** e por último o site. As regras sozinhas já fecham as falhas críticas.

**São 65 arquivos** (lista completa na parte 9).

---

## 2. Auditoria de segurança — o que foi feito

Cinco revisores trabalharam em paralelo: regras, servidor, telas (duas partes) e um revisor das próprias correções. Cada achado foi conferido no código antes de corrigir. Os que não eram reais foram descartados.

### 2.1 Regras do banco (`firebase/firestore.rules`)

**Cadastro de pessoas (`usuarios`):**
- **Fundador:**
  - não põe nem tira o papel `admin`;
  - não mexe em "acesso geral" nem no responsável legal;
  - só aponta núcleo (onde a pessoa treina ou o que administra) para um núcleo **que existe e é da própria escola**.
- **Professor do núcleo (gestor):**
  - nunca edita o **próprio** cadastro por esse caminho (antes ele podia se dar cordão/faixa);
  - nunca mexe no responsável legal nem no núcleo administrado de um aluno.
- **Aceitar transferência:** só com o **pedido pendente** (`transferenciaId`) para aquele aluno, saindo do núcleo onde ele está e vindo para o meu, e só os campos da transferência. O painel já manda o id do pedido.
- **Inscrição:** o núcleo escolhido precisa existir e estar ativo.

**Núcleos:** a escola (`escolaId`) é obrigatória e é sempre a de quem cria. O painel já manda.

**Pedidos (`solicitacoes`):**
- o professor só **resolve** pedido pendente (aprovar ou recusar);
- um pedido resolvido não pode ser reaberto.

**Avisos e eventos:** não podem citar núcleo de outra escola.

**Mensalidades:** o professor só lança para aluno do **próprio** núcleo e não troca o aluno nem o núcleo de um lançamento.

**Rede:**
- **Listas por post:** até 10 marcações, 10 menções e 10 hashtags (cada marcação vira notificação).
- **Curtidas:** a mesma curtida não conta duas vezes.
- **Perfil privado:** quem é de fora só **pede** para seguir; o dono só transforma pedido em seguidor (não "inventa" seguidores).
- **Grupo do núcleo:** cada membro só entra a si mesmo; só o professor põe ou tira outras pessoas.
- **Card de graduação:** o compartilhamento conta uma vez só.

**Campeonatos:** o organizador e as marcas de premiação não mudam pelo app.

**Escolas (AtletaPay):**
- campos do Admin (ativação, domínio, escada, assinatura) não podem vir nem na criação;
- o teste grátis é gravado uma vez só.

**Ids de documentos** criados pelo app (posts, comentários, conversas, mensagens, pedidos, mensalidades etc.): só letras, números, `_` e `-`.

**Links de foto** de carteirinha e assinatura: só do Storage **deste** projeto.

**Chave do e-mail:** tamanho máximo de remetente e nome.

### 2.2 Regras do Storage (`firebase/storage.rules`)
- O "Fundador" só alcança fotos e documentos **da própria escola**.
- As pastas `fotos/`, `fotos_alunos/`, `rede/` e `apresentacoes/` agora permitem abrir um arquivo pelo nome, mas **não listar a pasta**.

### 2.3 Servidor (Cloud Functions)
- **Trava de escola** (`escolas.js`): se alguém que não é Admin tentar mudar uma pessoa de escola pelo núcleo, o servidor **desfaz** e registra na auditoria. É a defesa em segundo nível, caso uma regra futura falhe.
- **Avisos e eventos:** vão só para a escola do aviso, com paginação (escola grande não perde ninguém).
- **Notificações:**
  - o nome do remetente vem do cartão público, não do post (ninguém assina "Suporte AtletaPay");
  - marcações e menções só avisam gente da mesma escola, até 10;
  - pedidos para seguir e denúncias não vibram o celular sem parar.
- **Denúncia automática** de comentário fica na escola do post (antes caía na Liberdade).
- **Cartão público de menor:**
  - sem a idade exata; só a marca "kids", que escolhe a escada infantil;
  - **foto só com o termo de imagem**;
  - a idade é calculada pela data de nascimento quando ela existe.
- **Carteirinha e brasões de mensalidade:** só contam mensalidades lançadas pelo núcleo do aluno (o atual ou o de onde veio), da mesma escola, até 12 meses à frente.
- **Campeonato:**
  - só sobe ao pódio quem estava inscrito;
  - o post do resultado fica na escola do campeonato, em nome do organizador só se ele for dessa escola.
- **E-mails:**
  - limite em transação: pedidos simultâneos não furam o limite de 3 por hora;
  - e-mail sem conta não gasta a cota geral;
  - o pedido é apagado sempre, mesmo se o envio falhar;
  - o erro do serviço não vai mais para a página pública (só o código; o detalhe fica no teste, que só o Admin vê).
- **Chave do e-mail:** toda troca vira registro na auditoria (sem a chave) e aviso para os Admins.
- **LGPD — a exclusão de conta agora também apaga:**
  - comentários em posts de outras pessoas;
  - inscrições em campeonatos;
  - assinatura e arquivo da assinatura;
  - beneficiários;
  - cadastro de dono de escola.
- **Certificados de capoeira:**
  - o evento do certificado precisa ser da mesma escola;
  - o "Fundador do grupo" é o da escola nº 1.
- **Quem escreveu:** a regra que decide "foi uma pessoa ou o servidor" não depende mais de um rótulo que o Firestore pode não mandar. Isso vale para a trava de escola e para a auditoria.

### 2.4 Telas (navegador)
- Novos ajudantes em `js/shared.js`:
  - `urlSegura` / `urlImagem`: só aceitam `https://`, caminho do próprio site ou imagem embutida;
  - `argJS`: argumento seguro para botões.
- **Rede:**
  - ids de documento escapados em todos os atributos;
  - número de comentários sempre como número;
  - hora de aviso e dia de evento escapados;
  - **toda foto e vídeo** passa pelo filtro de link.
- **Painel:**
  - todos os botões `onclick` com id passaram para `argJS` (antes, um id com aspas virava código);
  - link de **material** e de **formação**: só `https://`, tanto ao salvar quanto ao mostrar;
  - fotos pelo filtro;
  - hora de aviso escapada.
- **App do aluno:** link de material só `https://`.
- **Campeonatos:** nomes dos inscritos, placar e pontos escapados; regulamento só com `https://`.
- **Service worker:** tocar numa notificação só abre página do próprio app.

### 2.5 O que ficou para depois (decisão sua ou trabalho maior)
1. **Inscrição aberta:**
   - hoje qualquer pessoa entra em qualquer escola escolhendo um núcleo, e passa a ver os cartões da Rede daquela escola;
   - proposta: a inscrição nasce **"aguardando aprovação"** do núcleo.
   - Quero sua decisão (parte 6).
2. **Visibilidade "só o núcleo" / "só seguidores" e perfil privado:**
   - hoje isso é respeitado pela tela, mas pela API qualquer pessoa **da mesma escola** lê os posts públicos;
   - corrigir exige mudar o feed. Vai junto com a Rede Global (v37).
3. **Content-Security-Policy:**
   - limita o estrago se algum XSS escapar;
   - exige tirar os scripts embutidos das páginas. Hardening para depois.
4. **Chave do e-mail no Secret Manager** em vez do banco:
   - hoje está protegida pelas regras e com alerta a cada troca;
   - a troca exige mexer no deploy pelo terminal.
5. **Versões travadas das bibliotecas do servidor** (lockfile + `npm ci`): exige mexer no `.github`, que o upload ignora.
6. Na exclusão de conta ainda ficam as confirmações "Eu vou" em eventos.
7. Fotos de post de menor aguardando revisão continuam abríveis por quem tem o link (o link é secreto).

---

## 3. O que entra de funcionalidade

### 3.1 v33 — o app veste a escola do login
- **Identidade da escola:**
  - nome, logo (ou monograma com as iniciais), cores, botão Entrar na cor da escola;
  - "faixa" no lugar de "cordão";
  - escada adulta e infantil, idade infantil (Jiu-Jitsu: até 15 anos) e critérios de avaliação.
- **Onde vale:** entrar, app do aluno, painel, Rede e inscrição.
- **Escola nº 1 (Liberdade):** nada muda, e nenhuma leitura a mais.
- **Graus:**
  - o professor escolhe o grau ao avaliar;
  - o perfil mostra "Azul · 2º grau" com a **faixa desenhada**;
  - aluno e responsável recebem o aviso de faixa ou grau novos.
- **E-mails próprios** (nova senha e confirmação):
  - saem com a cara da escola;
  - o link abre em **atletapay.com.br/conta**;
  - ligue quando quiser (parte 4.2). Até lá, segue o e-mail do Firebase.
- **Mega painel:**
  - aba **Configurações** (e-mails);
  - botões **Números**, **Editar dados** e **Abrir o app da escola**.
- **Painel do dono:** cartão **Números da escola**.

### 3.2 v34 — faixa de verdade no dia a dia
- **Certificado de faixa e de grau** (escolas novas):
  - sai sozinho quando o professor registra a graduação, com logo, nome, cidade e cor da escola;
  - traz a faixa desenhada com os graus, as assinaturas do responsável técnico e do professor do núcleo, e o QR de verificação;
  - **número próprio por escola** (ex.: `CT4F-CERT-2026-0001`).
  - A página pública do certificado mostra a escola certa mesmo sem login.
  - "Já tinha" (graduação anterior ao app) não gera certificado nem festa.
  - "Desfazer graduação" cancela o certificado e devolve o grau anterior.
- **Aviso de tempo mínimo e idade (quadro da CBJJ)** na avaliação:
  - ex.: "Tempo mínimo: 2 anos na faixa Azul. Faz 1 ano e 7 meses — faltam 5 meses";
  - "A faixa Azul pede 16 anos ou mais".
  - **Só avisa:** quem decide é o professor.
  - Não aparece na capoeira.
- **Quadro de graduação da escola:** na Rede → perfil → Trajetória, botão "Quadro de graduação da escola", com faixas, graus, idade e tempos.
- **Carteirinha com a faixa:**
  - desenho com os graus e "Faixa Azul · 2º grau";
  - a conferência pública (QR) mostra a cor certa, o nome e o logo da escola.
- **App instalável com o nome e o ícone da escola:**
  - no Android/Chrome, instalar a partir do app de uma escola nova cria um app com o nome e o logo dela (ou monograma);
  - no iPhone, o nome da tela inicial também é o da escola.
- **Graduação em lote** (Gestão): a faixa nova começa lisa (0 graus), e a sua própria graduação fica para o Fundador.
- **Passagem da escada infantil para a adulta** (ex.: Verde → Azul aos 16) conta como faixa nova (festa + certificado).

---

## 4. Lista de conferência depois de subir

### 4.0 Segurança (5 minutos, logo depois de publicar)
- [ ] GitHub → **Actions**: os passos "Publicar regras" e "Publicar as funções" ficam **verdes**.
- [ ] **Console do Firebase → Firestore**, coleção `usuarios`, filtro `papeis` *array-contains* `admin`. Só devem aparecer as contas de Admin que você conhece. Se aparecer outra, me avise na hora.
- [ ] Mega painel → aba **Ativas**: confira se há alguma escola ativa que você não ativou.
- [ ] No app da Liberdade, como professor: avaliar um aluno, aprovar uma transferência pendente e lançar uma mensalidade continuam funcionando.

### 4.1 A Liberdade continua igual
- [ ] Entrar e conferir logo, cores e cordões de sempre.
- [ ] Avaliar um aluno. Não aparece "Graus" nem aviso de tempo.
- [ ] Rede: post, curtida, comentário, seguir um perfil aberto e pedir para seguir um perfil privado.
- [ ] Certificados de cordão e carteirinha iguais. O "Card de stories" continua no certificado de cordão.
- [ ] "Esqueci minha senha" continua chegando.

### 4.2 Escola nova (o CT de Jiu-Jitsu)
- [ ] Mega painel → **Ativar** → **Abrir o app da escola**. A tela de entrar aparece com a cara do CT.
- [ ] Inscrever um aluno adulto: ele entra como **Branca**. Uma criança de 10 anos entra na escada infantil.
- [ ] Avaliar:
  - [ ] o aviso de tempo e idade aparece;
  - [ ] dar 1 grau gera aviso e certificado "Branca · 1º grau";
  - [ ] passar para Azul gera "Faixa Azul!" e o certificado da faixa.
- [ ] Abrir o certificado pelo QR **sem estar logado**: logo e nome do CT no topo.
- [ ] Carteirinha com a faixa desenhada. A conferência pública mostra o CT.
- [ ] Rede → perfil → Trajetória → **Quadro de graduação da escola**.
- [ ] No Android, instalar o app pelo app do CT: o ícone e o nome são do CT.
- [ ] Mega painel → **Números** e **Editar dados**.

### 4.3 E-mails (depois de ligar o Resend — parte 5.1)
- [ ] Clicar em **Salvar e mandar um teste para mim**: chega o e-mail de teste.
- [ ] "Esqueci minha senha": o e-mail chega com a cara da escola e o link abre em atletapay.com.br/conta.
- [ ] Os Admins recebem o aviso "Chave de e-mail da plataforma alterada". É o alerta novo.

---

## 5. Tarefas que só você pode fazer

### 5.1 Resend (uns 15 minutos)
1. Crie a conta em **resend.com**. O plano grátis cobre 100 e-mails por dia e 3.000 por mês.
2. **Domains → Add domain** → `atletapay.com.br`.
3. Crie no **Registro.br** os registros que o Resend mostrar e clique em **Salvar alterações**. Esse passo tem que ser você.
4. No Resend, **Verify**.
5. **API Keys → Create API key** (Sending access).
6. **Mega painel → Configurações** → cole a chave → **Salvar e mandar um teste para mim**.

> - As entradas de DNS do Firebase **não foram salvas**, e o domínio de e-mail do Firebase foi cancelado. Com o Resend, nada disso é necessário.
> - Alternativa: Brevo, com 300 e-mails por dia grátis.

### 5.2 Console do Firebase (2 minutos)
- [ ] Authentication → Authorized domains: `atletapay.com.br` está na lista?
- [ ] App Check obrigatório? Então a chave do reCAPTCHA precisa listar `atletapay.com.br`.
- [ ] (Opcional) Marca "AtletaPay" no Google Auth Platform.

### 5.3 Contas
- Admin Master: `liberdadeeexpressaooficial@gmail.com`.
- `natanael.invotec@gmail.com` é cadastro de aluno.

---

## 6. Decisões que ficam com você

1. **Inscrição com aprovação do núcleo?** (recomendo "sim")
   - A pessoa só passa a ver a escola depois que o professor aceita.
   - Fecha o item 2.5-1.
2. **Menores na Rede Global:** fora (recomendo) ou com autorização do responsável?
3. **Comissão no split:** percentual, valor fixo por mensalidade, ou plano mensal com taxa menor?
4. **Planos da AtletaPay:** o que fica no grátis e o que fica no pago?
5. **E-mails:** Resend (recomendado) ou Brevo?
6. **Card de stories da faixa:** fazer um card próprio para a faixa (hoje o botão não aparece no certificado de faixa)?

---

## 7. Próximas etapas (proposta)

### v35 — Endereço próprio e inscrição com aprovação
- App em **atletapay.com.br/<endereço>**.
- Separar endereço da identificação, com botão **Trocar endereço** no Mega painel.
- Domínio próprio da escola.
- Inscrição **aguardando aprovação** (se você aprovar a decisão 1), com fila no painel do professor.

### v36 — Financeiro (Asaas)
- Subconta por escola.
- Mensalidade por PIX ou cartão com **split**.
- Webhooks de pago e vencido, inadimplência.
- Aba Financeiro no Mega painel.
- **NFS-e**.
- Lojinha.

### v37 — Rede Global + privacidade de verdade
- Aba Global (só esporte), com moderação.
- Regra de menores.
- Visibilidade "núcleo/seguidores" e perfil privado garantidos pelo banco (item 2.5-2).

### v38 — Escala e hardening
- Regras só com claims.
- Números pré-calculados.
- `config/*` por escola.
- CSP.
- Chave no Secret Manager.
- Lockfile.

### Piloto
- CT de Jiu-Jitsu + 1 ou 2 escolas de capoeira.
- Duas semanas de uso real, com ajustes semanais.

---

## 8. Pontos de atenção
- **App instalável por escola:** funciona no Chrome/Android. Se o celular já tiver o app da Liberdade instalado pelo mesmo endereço, pode ser preciso desinstalar e instalar de novo para ver o nome da escola.
- **Certificado:**
  - se a numeração falhar 4 vezes seguidas (muito raro), o certificado daquela troca não sai e o aviso diz só "Parabéns". É só registrar de novo.
  - na v35 entra uma rotina noturna de conferência para as escolas novas.
- **Cartões públicos já existentes** ainda guardam a idade do menor até o próximo recálculo. Depois de publicar, peça no painel **"Recalcular todos"** (Admin) para limpar de uma vez.
- **Avaliação da própria pessoa:**
  - o professor não lança mais a própria graduação (o painel avisa);
  - quem lança é o Fundador ou o Admin.

---

## 9. Arquivos do pacote (65)

**Página e app:**
- `admin.html`, `app.html`, `campeonatos.html`, `carteirinha.html`, `certificado.html`, `certificados.html`, `inscricao.html`, `login.html`, `master.html`, `rede.html`, `v.html`, `sw.js`
- `js/`: `admin.js`, `campeonatos.js`, `carteirinha-comum.js`, `carteirinha.js`, `certificado-render.js`, `certificado.js`, `certificados.js`, `escola-atual.js`, `escola.js`, `faixas.js`, `firebase.js`, `gestao.js`, `inscricao.js`, `login.js`, `master.js`, `modalidades.js`, `rede.js`, `shared.js`, `verificar.js`

**AtletaPay:**
- `atletapay/`: `cadastro.html`, `conta.html`, `index.html`, `master.html`, `painel.html`, `privacidade.html`
- `atletapay/css/atletapay.css`
- `atletapay/js/`: `cadastro.js`, `conta.js`, `firebase.js`, `master.js`, `painel.js`

**Regras:**
- `firebase/firestore.rules`, `firebase/firestore.indexes.json`, `firebase/storage.rules`

**Servidor:**
- `functions/index.js`
- `functions/src/`:
  - `auditoria.js`, `campeonatos.js`, `carteirinha.js`, `certificado.js`, `emails.js`, `escolas.js`, `gatilhos.js`, `graduacao-escola.js`, `notificar.js`, `perfil.js`, `rotinas.js`
  - novos: `certificado-escola.js`, `escada-escola.js`
  - `compartilhado/escola.js`, `compartilhado/modalidades.js`
- `functions/test/logica.test.mjs`

**Testes:** `tests/regras/regras.test.mjs`

**Este roteiro:** `docs/ROTEIRO-v34.md`

---

## 10. Notas técnicas (referência)
- **Quem escreveu** (servidor x pessoa): `escritaDoServidor(ev)` = sem `authId`, ou `authType` igual a `service_account`/`system`, ou `authId` com "@". O resto é pessoa. Admin é conferido no perfil.
- **Certificado de faixa:**
  - `certificados/{codigo}` com `tipo: 'faixa'`, `escola`, `faixa`, `rotulo`, `graus`;
  - `certificadosDe/{uid}` em transação;
  - chave `faixa|grau|data` (ou `sem-data`);
  - contador `sistema/contadores.cert_<escola>`.
- **Aviso de graduação:** `idAvisoGraduacao(faixa, graus)` (o "desfazer" apaga o mesmo id).
- **Tempo mínimo:** `conferirTempo(lista, pessoa, novaFaixa, novosGraus)` em `modalidades.js` (cópia idêntica no servidor; o teste confere).
- **Manifesto por escola:** `aplicarManifesto(cfg)` em `escola-atual.js`, com blob: da mesma origem e `id`/`start_url` com `?escola=`.
