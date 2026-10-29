-- Migration 046: finish removing direct client writes from catalogs and combat history.
-- Server-owned SECURITY DEFINER RPCs continue to write with their owner privileges.
-- Client writes that are intentionally supported remain limited to player title and
-- the is_equipped/is_favorite columns of the authenticated player's inventory.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE
    public.attributes,
    public.clan_skills,
    public.clans,
    public.consumables,
    public.elements,
    public.game_config,
    public.item_stat_types,
    public.jutsus,
    public.loot_drop_rates,
    public.missions,
    public.ranks,
    public.villages
FROM PUBLIC, anon, authenticated;

-- Battle logs must be written by the server after a validated combat outcome.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLE public.battle_logs
FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS battle_logs_insert_own ON public.battle_logs;

-- Clear obsolete direct-write policies on tables whose mutations already go through RPCs.
DROP POLICY IF EXISTS players_insert_own ON public.players;
DROP POLICY IF EXISTS players_delete_own ON public.players;

DROP POLICY IF EXISTS player_inventory_insert_own ON public.player_inventory;
DROP POLICY IF EXISTS player_inventory_delete_own ON public.player_inventory;

DROP POLICY IF EXISTS player_jutsus_insert_own ON public.player_jutsus;
DROP POLICY IF EXISTS player_jutsus_update_own ON public.player_jutsus;
DROP POLICY IF EXISTS player_jutsus_delete_own ON public.player_jutsus;

-- Replace the former ALL policy with an explicit owner-only read policy.
DROP POLICY IF EXISTS "Enable ALL for users based on user_id" ON public.player_consumables;
DROP POLICY IF EXISTS player_consumables_select_own ON public.player_consumables;
CREATE POLICY player_consumables_select_own
ON public.player_consumables
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.players AS p
        WHERE p.id = player_consumables.player_id
          AND p.user_id = (SELECT auth.uid())
    )
);

-- Future application tables/functions created by postgres must not become writable
-- or executable by client roles solely through broad default ACLs.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON TABLES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
