-- Auditoria de superfície RPC. SOMENTE LEITURA: execute no SQL Editor Supabase.
-- Não modifica permissões, RLS ou dados de jogadores.
WITH exposed_functions AS (
  SELECT p.oid,p.proname,pg_get_function_identity_arguments(p.oid) AS signature,
         pg_get_functiondef(p.oid) AS body,
         p.prosecdef AS security_definer,
         has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
         has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
         EXISTS (
           SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) AS cfg
           WHERE cfg ILIKE 'search_path=%'
         ) AS has_fixed_search_path
  FROM pg_proc AS p
  WHERE p.pronamespace='public'::regnamespace
)
SELECT
  count(*) FILTER (WHERE security_definer AND authenticated_execute) AS authenticated_security_definers,
  count(*) FILTER (WHERE security_definer AND anon_execute) AS anon_security_definers,
  count(*) FILTER (WHERE security_definer AND authenticated_execute AND position('auth.uid()' in body)=0) AS without_auth_uid_reference,
  count(*) FILTER (WHERE security_definer AND authenticated_execute AND NOT has_fixed_search_path) AS without_fixed_search_path,
  count(*) FILTER (WHERE security_definer AND authenticated_execute AND body ILIKE '%EXECUTE format(%') AS uses_dynamic_format
FROM exposed_functions;

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS signature,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc AS p
WHERE p.pronamespace='public'::regnamespace
  AND p.prosecdef
  AND (
    has_function_privilege('anon',p.oid,'EXECUTE')
    OR (has_function_privilege('authenticated',p.oid,'EXECUTE') AND (
      position('auth.uid()' in pg_get_functiondef(p.oid))=0
      OR NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) AS cfg
        WHERE cfg ILIKE 'search_path=%'
      )
    ))
  )
ORDER BY p.proname;

SELECT c.relname AS table_name,c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select,
       has_table_privilege('authenticated',c.oid,'INSERT') AS authenticated_insert,
       has_table_privilege('authenticated',c.oid,'UPDATE') AS authenticated_update
FROM pg_class AS c
WHERE c.relnamespace='public'::regnamespace
  AND c.relname IN ('player_chunin_exams','player_combat_sessions','world_boss_sessions')
  AND c.relkind='r'
ORDER BY c.relname;
