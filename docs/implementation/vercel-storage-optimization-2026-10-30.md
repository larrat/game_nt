# Otimização do armazenamento de deploys — Kurokage

Data: 30/10/2026.

## Diagnóstico realizado no projeto real

- Vercel: time `larrats-projects`, plano `Hobby`, projeto `game-nt`.
- Foram encontrados pelo menos 100 deploys no histórico recente, com previews automáticos por commit.
- O Git tinha **553 arquivos versionados em `node_modules/` (~7,6 MB)**, apesar da presença de `node_modules` no `.gitignore`. Eles foram removidos do índice na branch: a instalação depende exclusivamente de `npm ci` e do `package-lock.json`.
- O conteúdo de `public/` somava ~91,8 MB, sendo imagens JPEG e PNG a maioria. Essas imagens representam boa parte de cada versão publicada.
- O endpoint de faturamento/métricas de Storage não retornou um valor utilizável; portanto **não foi medida a ocupação exata dos quase 10 GB** nesta revisão.

## Mudanças implementadas

1. Imagens `*.jpg`, `*.jpeg` e `*.png` com pelo menos 100 KiB são comprimidas no diretório `dist/`, **depois** de `vite build`, usando `sharp`.
   - JPEG: qualidade 82, JPEG progressivo, mozjpeg.
   - PNG: recompressão lossless, sem paleta reduzida.
   - Dimensão máxima de 2048 px somente para recursos maiores.
   - O arquivo original em `public/` permanece intacto e o caminho do asset no deploy não muda.
   - Não substitui imagem se a otimização não reduzir ao menos 4% do tamanho.
   - Ignora imagens animadas, multipágina e formatos não cobertos.
2. `.vercelignore` evita envio de testes, documentação e migrações como entrada de build quando aplicável.
3. Suíte de testes verifica preservação de formato/caminho, limite de resolução e conteúdo não-imagem.
4. Dependências de build sincronizadas em lockfile; CI exige `npm ci`, `npm test` e `npm run build`.

## Limites

- A redução aplica-se a **novos deploys**. Arquivos de deploys antigos não diminuem retroativamente.
- **Nenhum deploy foi excluído**, nenhuma política de retenção foi alterada e nenhuma publicação de produção foi desligada.
- O plano Hobby recebe 10 GB de Deployment Storage compartilhado por time. Se a métrica próxima de 10 GB for *Fast Data Transfer*, o tratamento é diferente.
- Para reduzir imediatamente espaço antigo, revisar a **Deployment Retention Policy** e deploys antigos no painel Vercel. O deploy atualmente publicado e branches ativos devem ser preservados.
- A compressão de JPEG é lossy (qualidade 82); conferir visualmente os mapas e personagens em telas reais antes de tratamentos mais agressivos.
