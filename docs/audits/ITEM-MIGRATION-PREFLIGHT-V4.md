# Pré-voo da migração de itens (somente leitura)

**Status:** simulador sem efeitos colaterais, não é script de exclusão ou de migração. Referência: auditoria da PR #89 e issue #85.

## O que este lote entrega

- `src/utils/itemMigrationPreflight.js`: função pura que classifica os itens por nome, dependência das recompensas do chefe, inventário, equipamento e favoritos; valida chaves de item e consumível; **nunca** recomenda exclusão imediata.
- `scripts/export_item_migration_preflight.sql`: extrai um JSON mínimo de catálogo e inventário a partir do banco acessado; começa com `BEGIN READ ONLY`, sem nome, ID ou e-mail dos jogadores.
- `scripts/item-migration-preflight.mjs`: lê um arquivo JSON gerado pela consulta e imprime o relatório sem acessar a rede, sem conexão com Supabase, sem escrever arquivos e sem executar SQL.
- `tests/itemMigrationPreflight.test.js`: testes com catálogo sintético que reproduz as contagens observadas e simula integridade quebrada.

## Executar a simulação sem alterar o banco

1. No **Supabase conectado**, executar `scripts/export_item_migration_preflight.sql` e salvar **somente** o JSON da coluna `snapshot` em arquivo local `snapshot.json`. Os dados não incluem IDs de jogadores. Não colocar esse snapshot em commit.
2. Executar `node scripts/item-migration-preflight.mjs ./snapshot.json`. O stdout retorna `mode: DRY_RUN_READ_ONLY` e `approvedForDeletion: false`.
3. Examinar `classification`, `integrityErrors` e os gates. Se uma referência inválida for encontrada, o comando termina com código não zero. Se não houver erro, **isso não autoriza o DELETE**; só valida a integridade do snapshot.
4. Confirmar resultados com `npm test` e `npm run build`.

## Auditoria atual (31/10/2026)

Uma consulta somente leitura retornou:
- **13** linhas `items`;
- **8** linhas `player_inventory`, das quais **3** equipadas; IDs de catálogo referenciados: **1, 2, 4, 5, 9**;
- **6** linhas `consumables` e **2** linhas `player_consumables`;
- **1** coincidência de nome com as 73 referências: `Shuriken Gigante`.

Categorias do simulador para esse catálogo:
- **5** itens bloqueados por inventário, incluindo os 3 com equipamentos.
- **3** baús bloqueados por recompensa de chefe (Bronze, Prata e Ouro).
- **1** item com nome documentado equivalente, **sem conclusão automática** de atributos nem segurança de remoção.
- **4** legados sem referência direta no inventário, **mas ainda contemplados pelo sorteio de loot**: não excluir diretamente.

## Gates antes de qualquer migração

- [ ] Backup integral e recuperação testada no banco alvo.
- [ ] Novo catálogo original/aprovado com IDs, slots, bônus, preços, efeitos e condições de aquisição definitivos.
- [ ] Ajustar fonte da seleção de drop, `kurokage_roll_loot`, loja e recompensas do chefe.
- [ ] Remapear todos os IDs em `player_inventory` sem alterar os dados de raridade, refino, favoritos e `rolled_stats`.
- [ ] Confirmar integridade FK, economia e RPCs nas duas contas de homologação, testar o rollback.
- [ ] Testar telas de Equipamentos, Ichiraku, combate e recompensas na versão publicada.

O Supabase conectado é **um único projeto**; o domínio público Vercel aponta para ele, embora os dados sejam de homologação conforme o usuário informou. Nada neste lote modifica tabela, função ou inventário. A autorização anterior do usuário para limpeza na homologação será aplicada apenas depois de satisfeitas as dependências necessárias.
