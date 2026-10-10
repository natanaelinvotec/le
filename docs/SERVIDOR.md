# Servidor (Cloud Functions) e publicação automática

A partir desta versão, uma parte do app roda **no servidor do Firebase** (Cloud
Functions), e não mais no celular de cada pessoa. É isso que deixa os brasões,
as notificações e a moderação à prova de "jeitinho".

| O que o servidor faz | Quando |
| --- | --- |
| Calcula o cartão público (cordão, presenças, graduações, brasões) | quando muda cadastro, presença, post ou curtida; e toda madrugada |
| Envia notificação (central do app + push no celular) | curtida, comentário, resposta, menção, marcação, mensagem, brasão, cordão novo, aviso, evento, denúncia, revisão |
| Moderação automática | post com palavrão ou imagem imprópria vai para revisão; comentário ofensivo é escondido e vira denúncia |
| Auditoria | registra quem mudou papel, cordão, notas, brasões, núcleos, pagamentos, solicitações, posts ocultados e presenças manuais |
| Responsável legal nas conversas | anota o pai/mãe cadastrado nas conversas do filho menor |
| Limpeza (LGPD) | stories vencidos, notificações com mais de 90 dias, auditoria com mais de 2 anos |
| Exclusão de conta | quando o Admin confirma um pedido na aba LGPD do painel |

Tudo é publicado sozinho pelo **GitHub Actions** (`.github/workflows/firebase.yml`)
a cada upload nas pastas `firebase/`, `functions/` ou `tests/regras/`. Antes de
publicar, o GitHub roda os testes (lógica das funções + regras do Firestore no
emulador). **Se um teste falhar, nada é publicado.**

## Configuração (uma única vez, ~10 minutos)

### 1. Criar a conta de serviço no Google Cloud

1. Abra https://console.cloud.google.com/iam-admin/serviceaccounts?project=atletapay-br
2. **Criar conta de serviço** → nome `github-deploy` → Criar e continuar.
3. Em **Conceder acesso**, adicione estes papéis:
   - **Editor**
   - **Administrador do Cloud Functions**
   - **Usuário da conta de serviço**
   - **Administrador do Storage** (a cópia das fotos na migração precisa dele)
   - **Administrador do IAM do projeto** — só é necessário na **primeira** publicação
     (o Firebase libera permissões internas do Eventarc e do Pub/Sub). Depois que a
     primeira publicação der certo, pode remover esse papel.
4. Concluir. Na lista, abra a conta `github-deploy` → aba **Chaves** →
   **Adicionar chave → Criar nova chave → JSON**. Um arquivo `.json` é baixado.

> Guarde esse arquivo como uma senha. Ele não vai para o repositório: fica só
> como segredo do GitHub. Se a organização bloquear a criação de chaves
> (`iam.disableServiceAccountKeyCreation`), dá para usar *Workload Identity
> Federation* no lugar — me peça que eu ajusto o workflow.

### 2. Guardar a chave no GitHub

1. No repositório: **Settings → Secrets and variables → Actions → New repository secret**.
2. Nome: `ATLETAPAY_SERVICE_ACCOUNT` (o `FIREBASE_SERVICE_ACCOUNT` antigo é do projeto
   capoeira-liberdade e só serve para a migração e para desligar o projeto antigo)
3. Valor: abra o `.json` baixado num editor de texto e cole **o conteúdo inteiro**.
4. **Add secret**. Pode apagar o `.json` do computador depois.

### 3. Enviar os arquivos

1. Primeiro, todos os arquivos do pacote **menos** o workflow, por
   **Add file → Upload files**, cada um na sua pasta (`functions/`, `firebase/`,
   `tests/`, `js/`, `css/`, `assets/` e os da raiz).
2. **Por último** o workflow. O GitHub pelo navegador às vezes ignora pastas que
   começam com ponto quando você arrasta, então crie o arquivo à mão:
   **Add file → Create new file**, nome `.github/workflows/firebase.yml` (as barras
   criam as pastas), cole o conteúdo do arquivo do pacote → **Commit**.
   Esse commit dispara a primeira publicação.

### 4. Acompanhar

Aba **Actions** → "Firebase (regras, índices e funções)". A primeira vez leva de
5 a 10 minutos (liga as APIs, cria as funções e roda as migrações de dados).
Verde = publicado. Vermelho = abra o passo que falhou; a mensagem diz o porquê.

Na primeira publicação, as migrações:

- marcam cada post antigo como `publico` ou não (post ocultado/em revisão deixa de vazar pela API);
- movem fotos antigas guardadas como texto (base64) dentro do banco para o Storage;
- recalculam o cartão público e os brasões de todo mundo no servidor;
- anotam o responsável legal nas conversas de menores.

Cada migração roda uma vez só (fica marcada em `config/migracoes`). Para rodar de
novo: aba Actions → workflow → **Run workflow** → marque "Recalcular".

## Custos

O projeto já está no plano Blaze. Para o tamanho do grupo, o uso fica dentro das
cotas gratuitas mensais (funções, Firestore e mensagens push). O único item que
pode gerar centavos é a análise de imagens (Cloud Vision: 1.000 imagens grátis
por mês; depois, cerca de US$ 1,50 a cada 1.000). Recomendo criar um **alerta de
orçamento** de R$ 20/mês em https://console.cloud.google.com/billing.

## Desfazer

- Funções: no Console → Functions dá para apagar qualquer uma.
- Regras: Firestore → Regras → **Histórico** mostra as versões anteriores com botão de restaurar.
