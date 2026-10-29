-- Migration 042: keep mutable progression and legacy combat data server-owned.
-- The current UI edits only players.title directly. State transitions for avatar,
-- location, missions, wins, tasks, and progression must use validated server RPCs.

REVOKE UPDATE (
    active_task_end_time,
    active_task_id,
    avatar,
    bingo_book_kills,
    character_id,
    class,
    fugas,
    losses_pvp,
    mission_slots,
    missions_a,
    missions_b,
    missions_c,
    missions_d,
    missions_s,
    name,
    npc_wins,
    org_id,
    pvp_wins,
    stamina_pts,
    tasks_completed,
    team_id,
    vila_atual_id,
    village_id,
    wins_pvp
) ON TABLE public.players FROM PUBLIC, anon, authenticated;

-- player_jutsus is read by the current UI; learning/upgrading is performed by
-- SECURITY DEFINER RPCs. Do not allow direct row edits that can fake learned jutsu,
-- levels, equipped flags, or player ownership.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.player_jutsus FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.player_jutsus TO authenticated;

-- The current world-boss flow records damage in server-owned session/damage tables.
-- world_boss_logs has no current client writer or server routine dependency; keep
-- owner-scoped reads but stop clients from forging or editing combat-log rows.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.world_boss_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.world_boss_logs TO authenticated;

-- Inventory sale is handled by vender_itens_inventario. Prevent direct deletion
-- from bypassing the validated sale path; leave the UI's limited equipped/favorite
-- column updates unchanged for compatibility in this migration.
REVOKE DELETE ON TABLE public.player_inventory FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
