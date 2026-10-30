# Seleção de personagens — transições e estados de carregamento
Data: 30/10/2026.

- `Selecionar.jsx` usa Motion e `AnimatePresence` para trocar retratos/personagens, respeitando `useReducedMotion`.
- Erros de consulta ao Supabase passam a mostrar mensagem e botão de tentar novamente; antes uma falha podia ser confundida com "nenhum personagem".
- Entrar bloqueia cliques repetidos, apresenta "Entrando..." e exibe erro caso `updatePlayer` falhe.
- Botão de remover personagem mantém a confirmação anterior e acrescenta filtro explícito por `user_id`; o RLS continua sendo a proteção efetiva no banco.
- Não houve alteração em inventário, XP, saldos, banco ou APIs de criação/exclusão.
- A animação CSS anterior é desabilitada para não ocorrer dupla transição.
- CI verifica compilação e contratos estáticos. **Teste visual autenticado com 0, 1 e múltiplos personagens permanece pendente**, incluindo seleção, troca, erro de rede e acessibilidade no celular.
