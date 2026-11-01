# Planejador de substituição reversível — catálogo Kurokage

**Etapa:** preparar remapeamento; ainda **não** executar migração. Continuação da auditoria (#89) e do simulador de pré-voo (#90).

## O que mudou

A função pura `evaluateItemReplacementPlan`, em `src/utils/itemReplacementPlan.js`, analisa uma proposta de aposentadoria de IDs existentes e um catálogo futuro **original**, com os dados completos definidos pelo Kurokage. A saída não contém SQL ou instrução de exclusão: `mode: DRY_RUN_ONLY` e `executable: false` em todos os casos.

Rejeita remapeamentos de slots incompatíveis, itens usados sem destino, colapso de dois IDs no mesmo destino, itens inexistentes, catálogo proposto incompleto, imagens sem procedência, baús vinculados a recompensas, dependência da seleção global de loot, ausência de backup testado, rollback não verificado e falta de testes autenticados.

### Entrada
1. `snapshot.json`: JSON anonimizado gerado pela consulta `scripts/export_item_migration_preflight.sql` (existente na master).
2. `proposta.json`: objeto com estas chaves:
   - `retireItemIds`: array de números de IDs do catálogo antigo que serão aposentados.
   - `mappings`: `[{ "sourceItemId": 7, "targetKey": "kunai-kuro-v1" }]`; **somente exemplo de formato**, não autorização de preço ou drop.
   - `targetCatalog`: array de objetos futuros `{key,name,type,rarity,req_level,price,bonus_stats}`, com *dados próprios do jogo*, não copiados do Naruto Game; imagens opcionais só se `licensingVerified` quando usadas.
   - `lootSelectionReplaced`, `bossRewardLogicReplaced`, `verifiedDatabaseBackup`, `rollbackVerified`, `authenticatedGameplayVerified`: sinalizadores de verificações externas; declarar `true` sem verificar na prática **não torna uma migração segura**.

Não existe lista de substitutos aprovada automaticamente. A documentação do concorrente apresenta sobretudo **armas e pergaminhos**, enquanto há três equipamentos equipados em slots de **Cabeça, Braços e Arma** e um equipamento de **Tronco** guardado. Trocar um equipamento de cabeça por uma Kunai é bloqueado. Os 73 nomes da coleta descrevem opções visuais, não um catálogo econômico funcional.

### Executar a simulação
```bash
node scripts/item-migration-preflight.mjs ./snapshot.json ./proposta.json
```

O comando produz JSON com `accepted`, `blockers`, `retiredRows`, `preservedRows`, quantidade de registros de inventário envolvidos e flags obrigatórias a preservar. Sai com erro se existirem bloqueios; **nunca** modifica SQL ou arquivos. Para consultar apenas o estado atual, execute sem o segundo argumento, como no pré-voo #90.

### Sequência para executar uma migração real mais adiante
1. Definir e versionar o catálogo autoritativo com nomes próprios, atributos, raridades, preços, limites e imagens permitidas; **não** inferir regras dos 73 nomes externos.
2. Criar versão controlada da seleção de loot, RPCs de compra/venda/refino, distribuição de baús e seed. Validação simultânea para evitar janela de recompensa inválida.
3. Backup verificável da **mesma base alvo**, com teste de restauração e rollback. Uma snapshot de pré-voo **não é** backup.
4. Construir script transacional de migração real preservando `player_inventory.id`, `player_id`, `is_equipped`, `is_favorite`, `rarity`, `rolled_stats`, `upgrade_level` e `is_server_acquired`; a simulação não contém `player_id` deliberadamente.
5. Verificar que nenhuma FK aponta para IDs aposentados e que equipamentos, loot, lojas, combate e recompensas funcionam; somente depois apagar ou arquivar legados, com retorno reversível.
6. A autorização existente se refere ao jogo em homologação. O único projeto Supabase conectado também é usado pelo domínio Vercel público; nunca supor que outra base foi validada ou que dados de jogadores podem desaparecer.

### Resultado de referência para o catálogo atualmente observado

A auditoria tinha **13 itens**, **8 entradas no inventário**, **3 equipadas**, **6 consumíveis** e **2 entradas de consumíveis**. Entre os 13, cinco IDs estão nos inventários, três são baús de chefe e `Shuriken Gigante` tem nome exatamente documentado. Os demais itens sem referência direta **ainda não são seguros para apagar**, porque `kurokage_roll_loot` atualmente escolhe entre todos os itens.

**Validação:** `npm test` (incluindo `tests/itemReplacementPlan.test.js`) e `npm run build`; a suíte usa fixtures, sem alterar banco.
