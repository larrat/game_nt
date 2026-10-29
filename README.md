# Kurokage (game_nt)

Jogo RPG ninja desenvolvido em React + Vite, com autenticação e dados de personagens no Supabase. A interface utiliza Tailwind CSS 4 e estilos legados em `src/styles/main.css`.

## Executar localmente

1. Instale Node.js 22+ e execute `npm ci`.
2. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e a chave **publicável/anon** do projeto Supabase.
3. Execute `npm run dev`. Testes do motor: `npm test`. Build: `npm run build`.

Nunca configure uma `service_role`, `secret key` ou senha de banco em variável `VITE_...`, pois o Vite embute esses valores no JavaScript enviado ao navegador. O arquivo local `.env` não deve ser versionado.

## Publicação na Vercel

- Projeto: `game-nt`, framework Vite, branch de produção `master`.
- URL oficial: https://game-nt.vercel.app
- Variáveis de ambiente necessárias no build (Production e Preview): `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Configure-as no painel Vercel; não dependa de arquivos `.env` no Git.
- O `vercel.json` redireciona as rotas React Router para `/index.html`; testa-se diretamente `/login`, `/selecionar`, `/dashboard` e `/redefinir-senha`.
- Produção é pública; autenticação SSO da Vercel deve proteger somente os deployments Preview. A autenticação dos jogadores continua no Supabase.

## Configuração necessária no Supabase Auth

No painel do projeto, abra **Authentication → URL Configuration**.

- **Site URL:** `https://game-nt.vercel.app`
- **Redirect URLs** (adicione exatamente estas URLs de produção):
  - `https://game-nt.vercel.app/selecionar` (confirmação de cadastro)
  - `https://game-nt.vercel.app/redefinir-senha` (recuperação de senha)
- Para desenvolvimento local, autorize também os endereços com a porta Vite usada (padrão `http://localhost:5173`). Para Preview na Vercel, use uma allowlist restrita à conta/equipe, se for testar links enviados por e-mail em ambientes de prévia.

A lista de Redirect URLs é administrada no Supabase e não pode ser substituída pelo `vercel.json`. Se o e-mail retornar ao domínio errado, verifique esta seção e os templates de e-mail do Supabase.

Documentação: https://supabase.com/docs/guides/auth/redirect-urls

## Segurança e operações

- Toda modificação de economia, combate e inventário deve usar as RPCs e políticas de acesso já existentes, não atualizar colunas protegidas no cliente.
- Migrações SQL ficam em `migrations/`. Nunca execute migrações destrutivas em produção sem revisão e cópia de segurança.
- Antes de publicar, verifique a execução dos testes do GitHub Actions e o status `READY` do deploy da Vercel. Um build aprovado não substitui os testes manuais de autenticação e gameplay.
