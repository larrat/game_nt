-- Migration 044: retire legacy client-driven combat calculation RPCs.
-- The React client now uses server-owned combat sessions for normal PvE/Chunin
-- encounters and the world-boss session RPC for bosses. Other temporary/special
-- encounters use the explicitly non-rewarding local simulator and must not call
-- a SECURITY DEFINER calculation RPC with client-supplied NPC or jutsu data.

REVOKE ALL ON FUNCTION public.resolver_turno_combate(
    integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb
) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolver_turno_combate(
    integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb, integer, integer
) FROM PUBLIC, anon, authenticated, service_role;

-- Keep the obsolete UUID form disabled as a defense-in-depth invariant.
REVOKE ALL ON FUNCTION public.resolver_turno_combate(
    uuid, text, jsonb, text, uuid, jsonb, jsonb, jsonb, jsonb, numeric
) FROM PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
