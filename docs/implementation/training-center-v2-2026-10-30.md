# Centro de Treinamento 2.0 — 30/10/2026

## Escopo da entrega
A tela `/treino` apresenta saldo de pontos, teto por ação e o contador persistido `daily_trainings`. Passa a selecionar um atributo automaticamente (Energia se existir), permite seleção por teclado e oferece tela de erro + tentativa novamente quando o catálogo do Supabase não carregar.

O simulador utiliza os multiplicadores existentes da tabela `ranks` e as faixas `hero_min` e `hero_max` da tabela `attributes`. O limite continua **1–5 pontos por RPC**, nunca maior que o saldo atual. O resultado final é calculado por `public.treinar_atributos` e confirmado ao retornar `success=true`.

O painel **Último treino desta visita** usa apenas a resposta do RPC. Ele não pretende ser um extrato histórico entre sessões e não modifica o banco.

## Compatibilidade com a PR #34
No Naruto Game, um ponto de Energia foi associado a +2 Vida, +7 Chakra e +7 Stamina em uma amostra. Essa observação **não foi convertida** em coeficiente no Kurokage. A PR #34 não demonstrou os valores globais ou o saldo exato de pontos treináveis por round.

O Kurokage continua com um saldo único `players.pontos_atributos`, sem criar um limite diário hipotético. `daily_trainings` é exposto como contador atual, não como histórico auditável.

## Segurança e aceitação
- Não envia `hero_min` ou `hero_max` ao banco, somente `p_player_id`, `p_atributo` e `p_quantidade`.
- A função de banco confere `auth.uid()`, propriedade do personagem e pontos existentes sob bloqueio de linha.
- O frontend exibe o resultado do servidor, não uma recompensa inventada.
- Testes unitários verificam o orçamento, a faixa alinhada ao SQL e o recibo.
- CI deve executar `npm test` e `npm run build`.
- Verificação manual após publicação: carregar `/treino` em desktop/mobile; testar seleção por teclado, saldo zero e treino de personagem de teste; confirmar que a atualização do saldo e de atributos persiste após recarregar.

## Futuro (fora desta entrega)
Para introduzir pontos livres x treináveis e histórico real de operações, definir antes uma fonte autoritativa, uma política de round e migrações com trilha de auditoria. Não inventar regras ou converter uma única observação do Naruto Game em economia do Kurokage.
