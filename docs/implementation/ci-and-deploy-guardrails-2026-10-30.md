# CI e segurança da publicação no Kurokage
Data: 30/10/2026.

## Alteração
`.github/workflows/engine-tests.yml` agora valida tanto a PR quanto os pushes na `master`, para arquivos de runtime, migrations, scripts de build, testes, `vite.config.js`, `tsconfig.json`, `vercel.json`, `.vercelignore` e manifests. O workflow executa `npm ci`, `npm test` e `npm run build` (inclui `tsc --noEmit`), com `contents: read` e cancelamento de runs obsoletas na mesma ref.

## Por quê
A versão anterior escutava `push` somente em duas branches antigas, e não verificava automaticamente `scripts/**` e certos arquivos de build quando eram os únicos modificados. Esta mudança torna falhas de deploy detectáveis nos commits posteriores à integração e simplifica o diagnóstico de regressões.

## Limites
- Não bloqueia merges por si só: regras de branch protection/required checks devem ser configuradas na administração do GitHub.
- Não executa automaticamente testes autenticados contra Supabase, por falta de conta descartável e segredos de CI.
- Não altera Vercel, cron, economia nem conteúdo do jogo.
