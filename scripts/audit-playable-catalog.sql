-- Read-only catalog audit; no player rows, financial data or mutations.
BEGIN READ ONLY;

SELECT 'characters' AS catalog, count(*) AS total FROM public.characters
UNION ALL SELECT 'avatars', count(*) FROM public.avatars
UNION ALL SELECT 'jutsus', count(*) FROM public.jutsus
UNION ALL SELECT 'npcs', count(*) FROM public.npcs;

SELECT 'avatar_without_character' AS problem, count(*) AS affected FROM public.avatars a
LEFT JOIN public.characters c ON c.id=a.character_id WHERE c.id IS NULL
UNION ALL
SELECT 'npc_without_canonical_character', count(*) FROM public.npcs n
LEFT JOIN public.characters c ON c.id=n.character_id
WHERE c.id IS NULL OR n.character_id IS NULL
UNION ALL
SELECT 'npc_name_mismatch', count(*) FROM public.npcs n
JOIN public.characters c ON c.id=n.character_id
WHERE lower(btrim(n.name)) <> lower(btrim(c.name))
UNION ALL
SELECT 'character_without_base_avatar', count(*) FROM public.characters c
WHERE NOT EXISTS (
  SELECT 1 FROM public.avatars a WHERE a.character_id=c.id AND a.is_base IS TRUE
)
UNION ALL
SELECT 'invalid_jutsu_cost_or_requirement', count(*) FROM public.jutsus
WHERE coalesce(chakra_cost,0)<0 OR coalesce(req_level,1)<1
 OR coalesce(cost_ryous,0)<0 OR coalesce(cooldown,0)<0;

SELECT count(*) AS characters_with_external_base_images FROM public.characters
WHERE base_avatar_url LIKE 'https://%';

COMMIT;
