-- Kurokage / GAME_NT — auditoria SOMENTE LEITURA, 2026-10-31.
-- Fonte: src/data/documentedItemVisuals.js (73 nomes catalogados na documentação).
-- NÃO usar a documentação externa como fonte de preços, bonus_stats ou item IDs.
-- Este SQL NÃO cria, edita ou remove registros. Aplicável ao banco conectado.
BEGIN READ ONLY;

WITH documented(name) AS (
  VALUES
    ('Shuriken'),
    ('Kunai'),
    ('Makibishi'),
    ('Senbons'),
    ('Tarja Explosiva'),
    ('Shuriken com Linha'),
    ('Shuriken Gigante'),
    ('Bomba de Luz'),
    ('Sensei Shuriken'),
    ('Sensei Shuriken com Linha'),
    ('Sensei Senbons'),
    ('Sensei Shuriken Gigante'),
    ('Sensei Makibishi'),
    ('Sensei Kunai'),
    ('Etiqueta de Selamento'),
    ('Bomba de Fumaça'),
    ('Etiqueta Perfurante'),
    ('Nunchaku'),
    ('Tantou'),
    ('Ninjaken'),
    ('Tonfa de Madeira'),
    ('Aian Nakkuru'),
    ('Bastão'),
    ('Leque'),
    ('Fuuma Shuriken'),
    ('Espada de Kusanagi'),
    ('Kunai de 3 Pontas'),
    ('Kunai Curvada'),
    ('Foice Jashin'),
    ('Ken no Hachi'),
    ('Raijin no Ken'),
    ('Pincel'),
    ('Senbon Guizo'),
    ('Mateki'),
    ('Espada de Garian'),
    ('Totsuka Yata'),
    ('Nunchaku Energizado'),
    ('Kunai Curvada Gigante'),
    ('Fuuma Shuriken Dupla'),
    ('Kunai de Teletransporte'),
    ('Tonfa de Ferro'),
    ('Bastão do Rei Macaco'),
    ('Aian Nakkuru de Chakra'),
    ('Foice Jashin Tripla'),
    ('Ken no Hachi do Trovão'),
    ('Pincel Gigante'),
    ('Mateki San'),
    ('Senbons Guizo Múltiplos'),
    ('Tantou de Chakra Branco'),
    ('Dragão de Garian'),
    ('Ninjaken Dupla do Sapo'),
    ('Leque Gigante'),
    ('Totsuka no Tsurugi'),
    ('Espada do Deus Kusanagi'),
    ('Raijin no Ken Amplificada'),
    ('Jidanda'),
    ('Jouhyou'),
    ('Braço Melódico'),
    ('Punhos Melódicos'),
    ('Guarda-chuva Triplo'),
    ('Guarda-chuva'),
    ('Lançador de Injeção'),
    ('Lançador de Senbons'),
    ('Espada Cutelo Duplo'),
    ('Espada Cutelo'),
    ('Pergaminho de Teletransporte para Konoha'),
    ('Pergaminho de Teletransporte para Areia'),
    ('Pergaminho de Teletransporte para Névoa'),
    ('Pergaminho de Teletransporte para Pedra'),
    ('Pergaminho de Teletransporte para Nuvem'),
    ('Pergaminho de Teletransporte para Akatsuki'),
    ('Pergaminho de Teletransporte para Som'),
    ('Pergaminho de Teletransporte para Chuva')
), refs AS (
  SELECT item_id, count(*)::int AS inventory_refs,
    count(*) FILTER (WHERE is_equipped)::int AS equipped_refs,
    count(*) FILTER (WHERE is_favorite)::int AS favorite_refs
  FROM public.player_inventory GROUP BY item_id
)
SELECT i.id, i.name, i.type, i.rarity, i.req_level, i.image_url,
  COALESCE(r.inventory_refs,0) AS inventory_refs,
  COALESCE(r.equipped_refs,0) AS equipped_refs,
  COALESCE(r.favorite_refs,0) AS favorite_refs,
  CASE
    WHEN d.name IS NOT NULL THEN 'EXATO_DOCUMENTADO'
    WHEN COALESCE(r.inventory_refs,0)>0 THEN 'LEGADO_EM_USO_NAO_REMOVER'
    ELSE 'LEGADO_SEM_REFERENCIAS_DIRETAS_REVISAR_DEPENDENCIAS'
  END AS suggested_classification
FROM public.items i
LEFT JOIN documented d ON lower(btrim(d.name))=lower(btrim(i.name))
LEFT JOIN refs r ON r.item_id=i.id
ORDER BY i.id;

SELECT 'items' entity, count(*)::int total FROM public.items
UNION ALL SELECT 'player_inventory', count(*)::int FROM public.player_inventory
UNION ALL SELECT 'items_equipados', count(*)::int FROM public.player_inventory WHERE is_equipped
UNION ALL SELECT 'consumables', count(*)::int FROM public.consumables
UNION ALL SELECT 'player_consumables', count(*)::int FROM public.player_consumables;

-- Consumíveis ficam em outra tabela e não devem ser misturados aos 73 nomes.
SELECT c.id,c.name,c.type,c.value,c.cost_ryous,c.cost_coins,
  count(pc.id)::int AS linked_inventory_rows
FROM public.consumables c
LEFT JOIN public.player_consumables pc ON pc.consumable_id=c.id
GROUP BY c.id,c.name,c.type,c.value,c.cost_ryous,c.cost_coins
ORDER BY c.id;

-- Detecta dependências explícitas do catálogo em funções do servidor.
SELECT p.proname AS rpc, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND pg_get_functiondef(p.oid) ~* '(player_inventory|public[.]items|FROM items|INTO items|item_id|consumables)'
ORDER BY p.proname;

COMMIT;
