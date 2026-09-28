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

1. Crie uma chave **reCAPTCHA v3** em https://www.google.com/recaptcha/admin
   com os domínios `natanaelinvotec.github.io` e `le-rho.vercel.app`.
2. Firebase Console → **App Check** → Apps → o app da Web → **reCAPTCHA v3** →
   cole a **chave secreta** → Salvar.
3. Em `js/escola.js`, cole a **chave do site** (pública) em `APP_CHECK_SITE_KEY` e envie o arquivo.
4. Deixe uns dias em **monitoramento** (App Check → APIs → veja as métricas). Quando
   quase todo o tráfego aparecer como "verificado", clique em **Aplicar** no
   Firestore e no Storage.

## Testes das regras

`tests/regras/regras.test.mjs` cobre cada brecha acima (a pessoa tentando se
promover, se dar brasão, ler post oculto, ler conversa de outro, forjar
auditoria…). Roda no GitHub a cada publicação; se falhar, nada é publicado.
