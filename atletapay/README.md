# AtletaPay — atletapay.com.br

Site da plataforma (vitrine, plano único, simulador), cadastro das escolas e painel do dono.
Estático, publicado pelo **Firebase Hosting** (site `atletapay` do projeto `capoeira-liberdade`)
a partir desta pasta do repositório `le` — o GitHub Actions (`.github/workflows/hosting.yml`)
publica sozinho a cada envio na `main`. Firebase (Auth, Firestore, Storage) do mesmo projeto do
app; as regras das coleções `escolas/`, `escolasSlugs/` e `donos/` e da pasta `escolas/` no
Storage ficam em `firebase/firestore.rules` e `firebase/storage.rules`.

## Arquivos
- `index.html` + `js/site.js` — vitrine: proposta, como funciona, módulos, planos com simulador, campeonatos, FAQ.
- `cadastro.html` + `js/cadastro.js` — assistente em 5 etapas (conta, escola, plano, logo e fotos, modelo). Grava `escolas/{slug}`.
- `painel.html` + `js/painel.js` — painel do dono: situação, checklist, plano, dados, fotos e modelo.
- `privacidade.html` — termos e privacidade (versão do período de testes).
- `js/catalogo.js` — plano único (R$ 39,90 até 80 alunos ativos + R$ 0,49 por aluno ativo acima disso), modalidades, modelos, fotos pedidas, regras de subdomínio.
- `js/firebase.js` — inicialização do Firebase (chaves públicas).
- `css/atletapay.css` — identidade visual ("a faixa e o placar").

## Publicar
Automático: qualquer envio na `main` roda o workflow *Hosting (app e AtletaPay)* e publica
`https://atletapay.web.app` (e `atletapay.com.br` quando o DNS apontar). Configuração em
`firebase.json` (entrada `"site": "atletapay"`, `public: "atletapay"`, `cleanUrls`).

Feito uma vez, no Console do Firebase / Registro.br:
1. Hosting → *Adicionar outro site* → id `atletapay`.
2. Hosting → site `atletapay` → *Adicionar domínio personalizado* → `atletapay.com.br` (e `www`), copiar os registros `A`/`TXT` que o Firebase mostrar.
3. Registro.br → DNS → modo avançado → criar os registros do passo 2 (propagação: minutos a horas; o certificado HTTPS vem sozinho depois).
4. Authentication → Settings → *Authorized domains* → `atletapay.com.br`, `www.atletapay.com.br`, `atletapay.web.app`.
5. Google reCAPTCHA (chave do App Check) → adicionar `atletapay.com.br` e `atletapay.web.app` aos domínios.

## Fluxo da escola
Conta → Escola (`escolas/{slug}` nasce `rascunho`; `escolasSlugs/{slug}` reserva o endereço) → Plano → Fotos
(Storage `escolas/{slug}/onboarding/`) → Modelo (`status: 'fila'`, `trialAte` = hoje + 14).
A ativação (`status: 'ativa'`) é feita pelo Admin Master enquanto o gerador automático não existe.
