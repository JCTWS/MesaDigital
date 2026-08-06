# Sacramento — Ficha & Mesa

App único com duas abas:
- **Ficha**: a ficha de personagem completa (a mesma que você já tinha).
- **Mesa**: entrar/criar uma mesa com nome+PIN e ver o quadro de iniciativa,
  com a vida de cada personagem atualizando ao vivo.

Quando a ficha está "conectada" a uma mesa (aba Mesa → entrar), toda vez que
você muda nome, Vida ou Dor na ficha, isso é enviado pro Supabase (com um
pequeno atraso de ~0.6s) e todo mundo na mesma mesa vê a barrinha de vida
mudar no quadro de iniciativa, em tempo real (via Supabase Realtime).

## 1. Criar o projeto no Supabase

1. Crie uma conta/projeto em https://supabase.com (você já tem conta).
2. No painel do projeto, vá em **SQL Editor → New query**, cole o conteúdo
   de [`supabase/schema.sql`](./supabase/schema.sql) inteiro e rode.
3. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key

## 2. Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env com a URL e a anon key que você copiou
npm run dev
```

Abre em `http://localhost:5173`.

## 3. Publicar no GitHub Pages

1. Crie um repositório no GitHub e suba este projeto:
   ```bash
   git init
   git add .
   git commit -m "primeira versão"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
   git push -u origin main
   ```
2. Abra `vite.config.js` e troque `base: "/sacramento-app/"` pelo nome real
   do seu repositório (ex: `base: "/NOME-DO-REPO/"`), depois faça commit e
   push dessa mudança.
3. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
4. No GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**, crie:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (mesmos valores do `.env`)
5. Dê um push em `main` — o workflow em `.github/workflows/deploy.yml`
   builda e publica sozinho. O link fica em **Settings → Pages**.

Alternativa mais manual (sem Actions), se preferir: `npm run deploy` (usa o
pacote `gh-pages` já incluso no `package.json`).

## Sobre a "segurança" do PIN

Não tem login de verdade — é nome + PIN por mesa, pensado pra afastar gente
aleatória, não pra proteger dados sensíveis. Qualquer um com o código e o
PIN certos consegue ler e mexer na mesa inteira. Para um grupo de RPG isso
costuma ser suficiente; se um dia quiser mais rigor, dá pra trocar por
Supabase Auth de verdade (magic link por e-mail) sem mudar o resto da
estrutura.

## Próximos passos possíveis

- Levar mais campos da ficha pro quadro (Dor, não só Vida).
- Indicador de "quem está online agora" (Supabase Realtime Presence).
- Um papel de "mestre" que pode editar qualquer personagem, e jogadores só
  o próprio.
