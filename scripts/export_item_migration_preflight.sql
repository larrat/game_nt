-- Kurokage: export de pré-voo para scripts/item-migration-preflight.mjs.
-- Somente leitura. NÃO inclui user_id, player_id, nomes de jogadores, senhas ou tokens.
-- Execute no editor SQL autorizado e salve apenas o JSON da coluna snapshot.
-- ATENÇÃO: esta consulta não modifica nenhuma tabela e não cria backup.
BEGIN READ ONLY;

SELECT jsonb_build_object(
  'schema_version', 1,
  'items', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', i.id, 'name', i.name, 'type', i.type
    ) ORDER BY i.id)
    FROM public.items i
  ), '[]'::jsonb),
  'inventory', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'item_id', inv.item_id,
      'is_equipped', COALESCE(inv.is_equipped,false),
      'is_favorite', COALESCE(inv.is_favorite,false)
    ) ORDER BY inv.item_id, inv.id)
    FROM public.player_inventory inv
  ), '[]'::jsonb),
  'consumables', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name
    ) ORDER BY c.id)
    FROM public.consumables c
  ), '[]'::jsonb),
  'consumable_inventory', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'consumable_id', pi.consumable_id
    ) ORDER BY pi.consumable_id, pi.id)
    FROM public.player_consumables pi
  ), '[]'::jsonb)
) AS snapshot;
COMMIT;
