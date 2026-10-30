# Auditoria de economia: loja, equipamentos e recompensas — 30/10/2026

## Escopo e evidência
Revisadas no Supabase as RPCs de compras de consumíveis, venda de inventário, refino, equipamentos e encerramento de combate. Os dados existentes de jogadores não foram alterados durante o levantamento; só foram feitas consultas de esquema, contagens e definições de função.

### Controles existentes confirmados
- `comprar_ramen` valida autenticação, jogador dono, produto ativo, preço e quantidade de 1 a 50; bloqueia a linha de jogador, calcula custo no servidor e atualiza saldo/inventário em uma transação.
- `vender_itens_inventario` valida dono, itens não equipados, não favoritos, tipos vendáveis e `is_server_acquired`; bloqueia registros antes do cálculo do pagamento.
- `finalizar_combate_sessao` requer sessão de combate vencida, dentro do prazo e não liquidada, vinculada ao jogador; a função `finalizar_combate(...,p_from_map)` é privada (sem EXECUTE a anon ou authenticated) e usa recompensas de NPC cadastrado.
- `player_inventory` possui trigger `player_inventory_trusted_insert` para certificar inserções privilegiadas. O levantamento contabilizou 8 itens de inventário, todos com `is_server_acquired = true`.
- `aprimorar_equipamento` verifica dono, duplicata, custo calculado no servidor e trava as linhas; `resolver_limpeza_rapida` valida dono, stamina, limite de 10 lutas e ausência de sessão ativa.
- Endpoints legados `comprar_item_loja` e `vender_itens` são `SECURITY INVOKER`, sem execução concedida a authenticated e anon. Não foram expostos novamente.

## Correções na migration 061
1. **Refino:** a duplicata a ser consumida precisa estar desequipada **e não favoritada**. Antes, o SQL do ferreiro podia consumir um favorito. A interface `Ferreiro.jsx` usa a mesma regra para listar itens válidos, e explica quando não há material suficiente. Não altera custo: RY$ 500 por nível de aprimoramento atual + 1.
2. **Essências:** `finalizar_combate` e `resolver_limpeza_rapida` passam a reconhecer `Sannin Lendário` / `Herói Mundial` (e aliases sem acento), respectivamente com tiers 4 e 5. Não modifica probabilidade de drop, recompensa XP/Ryous ou outros níveis.
3. **Permissões:** `finalizar_combate(..., p_from_map)` permanece executável por `service_role`, não por `anon` ou `authenticated`. Ferreiro e limpeza rápida permanecem restritos a jogadores autenticados.

A migração altera somente o comportamento de futuras operações. Não reprocessa loot antigo nem modifica registros ou saldos existentes.

## Validação
- `tests/commerceLootSecurity.test.js`: verifica elegibilidade da forja, manutenção da autorização e níveis dos títulos avançados no SQL.
- GitHub Actions: `npm test` e `npm run build`, após criar PR.
- Após `apply_migration` no Supabase, conferir que as 3 funções têm o corpo atualizado e privilégios originais; verificar contagem de inventário sem expor dados dos personagens.
- Teste funcional ainda exige conta autenticada de teste com duas cópias: uma favoritada e outra não. O saldo e as quantidades não devem variar em operação recusada.

## Recomendações seguintes
- Testar ponta a ponta a sequência comprar/consumir/refinar/vender com usuário de teste.
- Investigar lógica de limpeza rápida, eventos e quests contra automação excessiva, sem assumir exploit na falta de evidência.
- Revisar RLS de leitura de `players` e privilégios de `SECURITY DEFINER` caso a aplicação passe a armazenar informações pessoais no registro.
- Ativar proteção a senhas vazadas no painel Auth (configuração separada).
