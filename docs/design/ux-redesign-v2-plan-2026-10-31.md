# Kurokage — diagnóstico de UX e direção do redesign integral
Data: 31/10/2026.

## Problemas constatados
- O usuário relatou entrada na conta ao clicar no link de recuperação, em vez de ser conduzido à troca de senha.
- `Login.jsx` solicita redirecionamento para `/redefinir-senha`; a rota existe em `App.jsx`. Entretanto a configuração Auth Site URL/Redirect URLs pode fazer o callback cair no domínio/rota padrão, com uma sessão estabelecida pelo Supabase. O frontend antigo não reconhecia o marcador `type=recovery` fora de `/redefinir-senha`.
- O jogo possui mais de vinte e cinco rotas, `src/styles/main.css` com aproximadamente 160 kB e CSS incremental em `rpg-shell.css`, `academy-v3.css`, `combat-v3.css`, `character-status-v3.css` etc. Isso multiplica especificidade, variantes locais e padrões visuais.
- A aba conectada do usuário foi inspecionada em modo somente leitura, mas exibiu o hospital do ninja em recuperação. Não houve captura de cada rota autenticada nem avaliação visual completa.

## Ajuste emergencial de Auth
A aplicação detecta `type=recovery` no hash/query mesmo quando o provedor retorna ao Site URL e move o browser para `/redefinir-senha`, preservando os parâmetros do callback. Isso não substitui a configuração correta em Supabase Auth: URLs `https://game-nt.vercel.app/redefinir-senha` e `https://game-nt-larrats-projects.vercel.app/redefinir-senha` devem constar na allowlist, com Site URL fixado no domínio canônico.

**Segurança importante:** a URL com código PKCE sem marcador de `type=recovery` depende de redirecionamento permitido para a rota. A tela de redefinição aceita uma sessão autenticada, portanto o E2E deve testar uma recuperação verdadeira e link inválido/expirado. Não afirmar que corrigimos a configuração Auth via código.

## Proposta: design system v2, não retoques isolados
**Princípios:** jogo em primeiro lugar; uma tarefa por tela; números de recurso verificáveis; poucos níveis de hierarquia; caminhos de navegação claros; resposta do servidor prevalece sobre animações.

**Identidade original:** carvão quente, papel envelhecido, vermelho selo, dourado controlado. Não copiar imagens e marcas Naruto Game. Três famílias de fonte no máximo, com monoespaçada somente para números de atributos.

**Tokens:** escala de espaçamento 4/8/12/16/24/32/48; raios 6/10/16; estados interativos neutro/hover/active/disabled/focus; cores semânticas Vida/Chakra/Stamina/XP separadas da cor de ações.

**Componentes essenciais:** `AppShell`, `PageHeader`, `Panel`, `PrimaryAction`, `ResourceBar`, `CharacterPortrait`, `RarityTag`, `JutsuTile`, `QuestCard`, `ConfirmDialog`, `StatusNotice`, `EmptyState`, `LoadingState`, `ActionReceipt`. Unificar CSS sem mudar a autoridade das RPCs.

**Arquitetura de informação proposta:** 6 zonas principais: Início; Ninja; Academia; Jornadas; Vila; Conta. Subrotas existentes continuam funcionando por links e redirects, sem reescrever todo backend.

## Ordem de execução por PR
1. **P0** Recuperação de conta: corrigir callback, URLs Auth, testar link de recuperação e janela de senha nova.
2. **P1** Design foundations: tokens, escala tipográfica, UI kit e contraste, CSS escopado, sem apagar estilos existentes de uma vez.
3. **P1** Navegação + dashboard: painel inicial funcional com próximos passos, metas, economia e status; mobile-first.
4. **P1** Identidade e seleção de personagem: retratos e progressão.
5. **P1** Academia, jutsus e missões: estados legíveis, custo/recompensa só do servidor.
6. **P1** Combate, mapa e Dojo: hierarquia de ação, cooldown, histórico e feedback em tempo real.
7. **P2** Vila, mercado, equipamentos e serviços; acessibilidade e polimento de telas restantes.

## Critérios para chamar redesign de pronto
- Figma/equivalente ou protótipo navegável antes de substituir telas em massa.
- Comparativo before/after por rota com captura própria, 390px/768px/1440px.
- Teste manual autenticado em desktop e celular, navegação por teclado e motion-reduction.
- `npm ci`, `npm test`, `npm run build`, preview Vercel READY e rollout gradual.
- Sem alteração inadvertida de autorização, dinheiro, atributos ou recompensas.
