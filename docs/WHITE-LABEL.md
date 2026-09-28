# Montar o app para outra escola (AtletaPay / white-label)

Cada escola tem **o próprio repositório e o próprio projeto Firebase** (dados
100% separados — decisão de 20/09). Tudo o que muda de uma escola para outra
fica em um arquivo: `js/escola.js`.

## Passo a passo

1. **GitHub**: crie o repositório novo (Use this template ou fork) a partir deste.
2. **Firebase**: crie um projeto novo, ative Authentication (e-mail/senha),
   Firestore, Storage e mude para o plano Blaze. Em Configurações do projeto →
   Seus apps → Web, copie a configuração.
3. **`js/escola.js`**: troque
   - `ESCOLA` — nome, nome curto, nome da rede, mestre, cidade/UF, frases, cores, logos, contato de privacidade;
   - `FIREBASE_CONFIG` — a configuração copiada no passo 2;
   - `CORDOES_ADULTO` / `CORDOES_KIDS` — a escada de graduação e as cores (para
     outras artes marciais: faixas no lugar de cordões);
   - `CRITERIOS` e `META_PRONTIDAO` — o que é avaliado e a meta para graduar.
4. Rode uma vez, na raiz do repositório: `node tools/aplicar-escola.mjs`
   (atualiza os manifestos do app e da Rede, o `sw.js`, o `.firebaserc`, o workflow
   e o script de migração com o projeto novo).
5. Troque as imagens em `assets/`: `logo-liberdade*.png`, `app-icon-*`, `rede-icon-*`
   (mesmos nomes e tamanhos).
6. Siga `docs/SERVIDOR.md` no projeto novo (conta de serviço + segredo no GitHub).
7. Publique o site (GitHub Pages ou Vercel) e crie a conta do Admin Master no
   Firebase Authentication; no Firestore, crie `usuarios/<uid>` com `papeis: ['admin']`.

## O que já é configurável sem mexer no código

- Nomes e descrições dos brasões e quais ficam ativos: painel → Brasões → Configurar.
- Palavras extras bloqueadas na Rede: documento `config/moderacao`, campo `palavras` (lista).
- Núcleos, mensalidades, eventos e avisos: pelo painel.
