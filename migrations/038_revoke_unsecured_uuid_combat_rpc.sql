-- Remove access to the obsolete UUID-based combat calculation endpoint.
-- It does not verify player ownership; current client code uses the integer-ID RPC.
REVOKE ALL ON FUNCTION public.resolver_turno_combate(uuid,text,jsonb,text,uuid,jsonb,jsonb,jsonb,jsonb,numeric)
    FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
