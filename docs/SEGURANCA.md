# Segurança — o que mudou em setembro de 2026

## Brechas fechadas nas regras do Firestore

| Antes | Agora |
| --- | --- |
| Qualquer pessoa podia **se cadastrar com `acessoGeral: true`** (virava "Fundador" e lia o grupo todo) ou já com cordão alto e brasões. | O autocadastro só aceita aluno Iniciante, sem núcleo próprio, sem acesso geral, sem notas nem brasões. |
| A própria pessoa podia trocar o **próprio cordão, histórico de graduação, idade** (idade define se é menor) e o instrutor. | Esses campos só mudam pelo responsável do núcleo, instrutor, Fundador ou Admin. |
| O cartão público (`perfisPublicos`) era gravado pelo celular de cada um: dava para **se dar brasões**, mudar o cordão exibido ou deixar de ser "menor" (e burlar a regra de conversa das crianças). | Esses campos são calculados e gravados **só pelo servidor**. A pessoa mexe apenas em bio, apelido, capa, cidade, funções e privacidade. |
| Post **ocultado** pelo Admin ou **foto de menor em revisão** continuava legível pela API. | Só é lido por quem tem direito: o público lê apenas posts com `publico == true`. |
| O próprio autor podia se "auto-aprovar" (mudar `revisao`). | Autor só edita texto, marcações e o selo de melhor momento. |
| Menor com foto podia publicar direto chamando a API. | A regra obriga revisão para foto/vídeo de menor. |
| Coleções antigas `admins`, `academias`, `alunos` e `site_*` abertas para **qualquer pessoa na internet ler e gravar** (a `admins` tinha hash de senha). | Só o Admin Master lê/grava. `siteConteudo` (site público) continua com leitura aberta, mas só o Admin edita. |
| O núcleo lia as conversas diretas envolvendo seus alunos. | O núcleo modera só o grupo do núcleo; conversas de menores são acompanhadas pelo **responsável legal** (pai/mãe cadastrado). |
| Cadastro antigo sem o campo `acessoGeral` não conseguia salvar o próprio celular/foto. | Comparações usam valor padrão (`get`) e não travam mais. |

## Storage

- Fotos de perfil agora vão para `fotos/<uid>/` (só a pessoa, o responsável do
  núcleo, o instrutor dela, o Fundador e o Admin gravam; só logado vê). A pasta
  antiga `fotos_alunos/` virou somente leitura.
- A inscrição subia a foto **antes** de criar o login — com as regras do Storage
  isso falhava para visitantes novos. Agora a foto sobe logo depois do login criado.

## App Check (recomendado — 10 minutos)

Impede que scripts fora do site usem a configuração do Firebase para ler, gravar
ou gerar custo.

1. A chave do site fica em https://www.google.com/recaptcha/admin (a mesma aparece em
   Google Cloud → Segurança → Fraud Defense → Chaves). Nos **domínios** da chave têm de
   estar todos os endereços em que o app abre: `natanaelinvotec.github.io`,
   `capoeira-liberdade.web.app`, `liberdadeeexpressao.com.br`, `atletapay.com.br`, `atletapay.web.app`.
2. Firebase Console → **App Check** → Apps → o app da Web → provedor **Fraud Defense
   (reCAPTCHA Enterprise)** → a **mesma chave do site** → Salvar. (Em 03/10/2026 estava
   registrada uma chave que não existia mais: o cliente recebia HTTP 400 e nunca tinha token.)
3. Em `js/escola.js`, a **chave do site** (pública) fica em `APP_CHECK_SITE_KEY`; o código usa
   `ReCaptchaEnterpriseProvider` — o provedor do código e o do Console precisam ser o mesmo.
4. Deixe uns dias em **monitoramento** (App Check → APIs → veja as métricas). Quando
   quase todo o tráfego aparecer como "verificado", clique em **Aplicar** no
   Firestore e no Storage.

> **Velocidade (28/09/2026):** o App Check liga ~3 s depois que a tela abre
> (`APP_CHECK_IMEDIATO = false` em `js/firebase.js`). Ligado logo no início, o
> reCAPTCHA (~800 KB) fazia o login e o banco esperarem o token: 2–4 s a mais em
> cada tela. Em modo monitoramento isso não muda nada na proteção.
> **Antes de clicar em "Aplicar"**, troque para `APP_CHECK_IMEDIATO = true` e
> envie o arquivo — senão as primeiras leituras de cada tela seriam barradas.

## Testes das regras

`tests/regras/regras.test.mjs` cobre cada brecha acima (a pessoa tentando se
promover, se dar brasão, ler post oculto, ler conversa de outro, forjar
auditoria…). Roda no GitHub a cada publicação; se falhar, nada é publicado.
