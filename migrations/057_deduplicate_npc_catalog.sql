-- Migration 057: remove seven exact duplicate NPC records while preserving player references.

-- The duplicate pairs were verified to match on all gameplay fields; only IDs and created_at differ.
DO $validate$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            (1, 8), (2, 9), (3, 10), (4, 11),
            (5, 12), (6, 13), (7, 14)
        ) AS pair(keep_id, duplicate_id)
        JOIN public.npcs keep_npc ON keep_npc.id = pair.keep_id
        JOIN public.npcs duplicate_npc ON duplicate_npc.id = pair.duplicate_id
        WHERE (to_jsonb(keep_npc) - 'id' - 'created_at')
              IS DISTINCT FROM
              (to_jsonb(duplicate_npc) - 'id' - 'created_at')
    ) THEN
        RAISE EXCEPTION 'NPC duplicate catalog differs from the validated pairs; refusing to delete records.';
    END IF;
END;
$validate$;

-- If progress references both IDs for the same player, retain the canonical reference only.
DELETE FROM public.player_defeated_npcs defeated_duplicate
USING (VALUES
    (1, 8), (2, 9), (3, 10), (4, 11),
    (5, 12), (6, 13), (7, 14)
) AS pair(keep_id, duplicate_id)
WHERE defeated_duplicate.npc_id = pair.duplicate_id
  AND EXISTS (
      SELECT 1
      FROM public.player_defeated_npcs defeated_keep
      WHERE defeated_keep.player_id = defeated_duplicate.player_id
        AND defeated_keep.npc_id = pair.keep_id
  );

-- Preserve any remaining history/progress by remapping duplicate IDs to their canonical IDs.
UPDATE public.player_defeated_npcs defeated
SET npc_id = pair.keep_id
FROM (VALUES
    (1, 8), (2, 9), (3, 10), (4, 11),
    (5, 12), (6, 13), (7, 14)
) AS pair(keep_id, duplicate_id)
WHERE defeated.npc_id = pair.duplicate_id;

-- A current combat session retains its stats/state; the duplicate NPCs had identical gameplay fields.
UPDATE public.player_combat_sessions combat
SET enemy_id = pair.keep_id
FROM (VALUES
    (1, 8), (2, 9), (3, 10), (4, 11),
    (5, 12), (6, 13), (7, 14)
) AS pair(keep_id, duplicate_id)
WHERE combat.enemy_id = pair.duplicate_id;

-- Do not delete a duplicate if any reference remains; foreign keys and this condition fail closed.
DELETE FROM public.npcs npc
WHERE npc.id IN (8, 9, 10, 11, 12, 13, 14)
  AND NOT EXISTS (
      SELECT 1 FROM public.player_defeated_npcs d WHERE d.npc_id = npc.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM public.player_combat_sessions s WHERE s.enemy_id = npc.id
  );

DO $verify$
BEGIN
    IF EXISTS (SELECT 1 FROM public.npcs WHERE id IN (8, 9, 10, 11, 12, 13, 14)) THEN
        RAISE EXCEPTION 'NPC duplicate cleanup incomplete: duplicate IDs remain.';
    END IF;
    IF (SELECT count(*) FROM public.npcs) <> 15 THEN
        RAISE EXCEPTION 'NPC catalog total differs from expected 15 unique records; review migration.';
    END IF;
END;
$verify$;

NOTIFY pgrst, 'reload schema';
