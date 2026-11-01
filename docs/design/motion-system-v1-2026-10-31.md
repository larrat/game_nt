# Kurokage — Motion System v1 (31/10/2026)

## Objetivo
Aplicar animações discretas e consistentes em superfícies compartilhadas do jogo, sem reescrever telas, criar custos adicionais ou modificar gameplay.

## Implementação
- **Navegação:** expandir/recolher grupos com Motion (altura e opacidade). Atributos `aria-expanded`, `aria-controls`, `aria-hidden` e `inert` impedem foco em rotas recolhidas; busca continua abrindo os grupos encontrados.
- **Microinterações:** feedback de hover/press em atalhos, links de menu, botões existentes e bordas de cards do UI Kit, sem deslocamento de layout e sem alterar handlers.
- **Notificações:** Motion `AnimatePresence` para entrada/saída de avisos; mensagens de erro como `alert` e as demais como `status`; IDs sem colisão em mensagens emitidas no mesmo milissegundo; timers liberados ao desmontar.
- **Tokens:** `src/utils/motionPresets.js` contém durações rápidas, sem interpolação de dados econômicos ou recursos autoritativos.

## Acessibilidade e desempenho
- Toda animação controlada por Motion observa `useReducedMotion`. Os efeitos CSS ficam desativados em `prefers-reduced-motion: reduce`.
- Não animar HP, Chakra, XP, recompensa ou resultado antes de confirmação do Supabase; as alterações nesta fase são apenas de apresentação.
- Evitar efeitos grandes, loops infinitos, blur e movimentação do conteúdo durante o combate.

## QA pendente
1. `npm ci && npm test && npm run build` no GitHub Actions.
2. Conferir mouse, teclado e leitor de tela: menu abre/fecha, busca e foco continuam corretos.
3. Testar notificações simultâneas, falha e sucesso, celular/desktop e preferência por movimento reduzido.
4. Verificar Vercel Preview antes de qualquer merge. Nenhum banco/serviço pago será criado.

## Próxima fase
Transições de páginas selecionadas e feedback de ações de missões/combate em PR independente, evitando animação dupla em páginas que já usam Motion.
