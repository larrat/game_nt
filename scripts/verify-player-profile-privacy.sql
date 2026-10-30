-- Read-only acceptance queries for profile privacy migration.
-- Never log actual player rows. Check grants, RLS and signatures.
SELECT p.proname,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  p.prosecdef AS is_security_definer,
  EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) cfg WHERE cfg ILIKE 'search_path=%') AS fixed_search_path
FROM pg_proc p
WHERE p.pronamespace='public'::regnamespace
AND p.proname IN ('listar_perfis_ninja','listar_lideres_vila','contar_ninjas_vila','listar_rivais_dojo')
ORDER BY p.proname;

SELECT policyname,cmd,qual FROM pg_policies
WHERE schemaname='public' AND tablename='players' ORDER BY policyname;

-- After applying migration 064, public role should see zero rows without JWT:
BEGIN;
SET LOCAL ROLE authenticated;
SELECT count(*) AS no_session_can_read FROM public.players;
ROLLBACK;
