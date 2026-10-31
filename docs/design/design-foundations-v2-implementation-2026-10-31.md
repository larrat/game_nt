# Kurokage Design Foundations v2 — lote 1 (31/10/2026)

## Escopo deste lote
- Tokens semânticos e escalas de espaçamento/raio em `src/styles/design-foundations-v2.css`, exclusivos da área autenticada.
- Componentes reutilizáveis em `src/components/ui`: `GameAction`, `GamePanel`, `ResourceMeter`, `GameEmptyState`.
- Aplicação piloto no Dashboard: CTA, painel de rotina, indicadores Vida/Chakra/Stamina, empty state de eventos.
- Cenário da vila via classe estática e XP via `<progress>`: sem usar estilo inline no piloto.
- Preservar as RPCs de recompensas, eventos e a origem dos valores do Supabase.

## Premissas
- Não fazer cópia visual, importação de imagens ou código do Naruto Game.
- Não alterar schema, RLS, preços, missões, percentuais, combate ou autenticação.
- Manter estilos antigos enquanto a migração é feita por rota.
- Estado de recuperação de senha permanece P0 independente, pois o código não configura allowlist de Auth.

## Próximas entregas
1. Transformar a página de Dashboard inteira em composição dos componentes compartilhados.
2. Uniformizar telas de Seleção e Status sem duplicar o PR #44 de seleção.
3. Migrar Treino, Técnicas e Tarefas para o kit e estados explícitos (bloqueado/pendente/concluído).
4. Por último, refatorar arena, mapa, Vila e serviços com testes autenticados e snapshots.

## Checklist de validação
- `npm ci`, `npm test`, `npm run build`
- Verificar em 390/768/1440px com sessão real
- Teclado, `prefers-reduced-motion` e contraste dos tokens
- Validar valores e resgates contra respostas efetivas do servidor
- Somente publicar produção após preview Vercel READY e revisão manual

**Nota:** criar o código não equivale a comprovar testes no navegador.
