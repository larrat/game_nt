-- Read-only readiness report for migration 064_private_player_select_rls.sql.
-- Run in staging first and preserve only metadata/boolean outputs.
-- DOES NOT apply migrations, impersonate users, or read any player records.
--
-- RLS ownership tests REQUIRE two separate authenticated disposable sessions;
-- running these statements as postgres/service_role CANNOT validate ownership.

-- 1. Which SELECT policies currently govern public.players?
SELECT
  t.schemaname,
  t.tablename,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  t.policyname,
  t.cmd,
  t.roles::text AS policy_roles,
  t.qual AS policy_using,
  t.with_check AS policy_check
FROM pg_policies t
JOIN pg_class c ON c.oid = format('%I.%I', t.schemaname, t.tablename)::regclass
WHERE t.schemaname = 'public'
  AND t.tablename = 'players'
ORDER BY t.policyname;

-- 2. Privileges by role: these do not by themselves demonstrate RLS safety.
SELECT
  role_name,
  has_table_privilege(role_name, 'public.players', 'SELECT') AS can_select_players_table,
  has_table_privilege(role_name, 'public.players', 'UPDATE') AS can_update_players_table
FROM (VALUES ('anon'), ('authenticated')) AS roles(role_name);

-- 3. Public-profile RPC availability/privileges before dropping the broad SELECT policy.
SELECT
  p.proname AS rpc,
  pg_get_function_identity_arguments(p.oid) AS signature,
  p.prosecdef AS security_definer,
  COALESCE(EXISTS (
    SELECT 1 FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
  ), false) AS fixed_search_path,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anonymous_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'listar_perfis_ninja',
    'listar_lideres_vila',
    'contar_ninjas_vila',
    'listar_rivais_dojo'
  )
ORDER BY p.proname, signature;

-- 4. A compact status signal. All 4 APIs must exist and all should reject anon.
-- This is metadata readiness only, not the two-user E2E security acceptance.
SELECT
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.players'::regclass) AS players_rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='players'
      AND policyname='players_select_authenticated' AND cmd='SELECT'
      AND replace(coalesce(qual, ''), ' ', '') = 'true'
  ) AS broad_select_still_active,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='players'
      AND policyname='players_select_own' AND cmd='SELECT'
      AND qual ILIKE '%auth.uid()%'
  ) AS owner_select_policy_exists,
  (
    SELECT count(DISTINCT p.proname) FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN (
        'listar_perfis_ninja','listar_lideres_vila',
        'contar_ninjas_vila','listar_rivais_dojo'
      )
      AND p.prosecdef
      AND has_function_privilege('authenticated',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
  ) AS usable_public_profile_rpc_count;
