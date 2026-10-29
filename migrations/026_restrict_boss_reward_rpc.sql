-- Restrict world-boss reward distribution to trusted server-side callers.
-- The routine grants XP, ryous, and inventory items to every participant and
-- is not an end-user action. It must not be callable via anon/authenticated RPC.
REVOKE EXECUTE ON FUNCTION public.distribute_boss_rewards(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_boss_rewards(bigint) TO service_role;
