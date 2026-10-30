# Modernização do Kurokage — TypeScript e Motion — Etapa 1

Data: 30/10/2026. Repositório `larrat/game_nt`.

## Decisão arquitetural

Mantemos React 19, Vite 8, Tailwind 4, Supabase, PostgreSQL e Vercel.

- **TypeScript (incremental):** `tsconfig.json` valida apenas os novos arquivos `.ts/.tsx` com `strict: true`, `noEmit: true` e `checkJs: false`. JavaScript antigo continua executando, sem migração em massa.
- **Modelos de domínio:** `src/types/character.ts` define `CharacterIdentity`, `ResourceKind`, `ResourceMeter` e `ResourceProgress`.
- **Primeiro serviço tipado utilizado em produção:** `src/utils/resourceProgress.ts` normaliza percentuais exibidos na `TopBar.jsx`, evitando `NaN`, negativos e barras maiores que 100% sem mexer na fórmula dos status. Essa função só controla **apresentação**. Status reais continuam vindo do personagem e motor.
- **Motion for React:** `src/components/PageHeader.jsx` recebe animação discreta de entrada (`opacity` e `y`) com `useReducedMotion`. Usuários que solicitam movimento reduzido não recebem animação inicial. Sem novos assets, sons ou telas.
- **Build seguro:** `npm run build` chama `npm run typecheck` antes de `vite build`. `npm ci` continua sendo obrigatório em CI e Vercel, com dependências travadas no `package-lock.json`.
- **Testes:** utilitário de recursos é transpilado em ambiente Node e executado com entradas válidas e adversas; testes verificam Motion e etapa TypeScript no build.

## Escopo intencionalmente limitado

- Não migra todo o projeto para TypeScript de uma só vez.
- Não converte as funções financeiras nem muda economia, missões, XP, fórmulas de status, permissões ou RLS.
- Não introduz Phaser nesta etapa. O motor de combate permanece autoritativo no Supabase.
- Transições grandes, sequências de animação, modos de câmera e efeitos especiais serão introduzidos em PRs próprios, depois de avaliar UX e desempenho.
- `Motion` utiliza apenas uma animação de cabeçalho nesta primeira entrega; não é uma reescrita visual de todas as telas.

## Critérios de aceitação

1. Dependências `typescript` e `motion` são instaláveis por `npm ci`, sem atualizar versões transitivas inadvertidamente.
2. `npm test`, `npm run typecheck`, `npm run build` passam no GitHub Actions.
3. Preview da Vercel fica `READY`, e os componentes renderizam sem erro.
4. `PageHeader` anima discretamente e respeita `prefers-reduced-motion`.
5. Barra de Vida/Chakra/Stamina/XP mantém valores e limites corretos.
6. Teste manual com conta autenticada em desktop/mobile continua necessário para validar fluidez percebida.

## Próximas etapas previstas

- Converter componentes independentes para `.tsx`, começando por `PageHeader`, cartões e modelos de status.
- Criar primitives animadas padronizadas e foco/teclado acessíveis.
- Evoluir seleção de personagens, Status e Academia de Jutsus a partir do dossiê visual já versionado.
- Avaliar um protótipo isolado Phaser com personagem de teste, **sem** autorizar recompensas client-side.
