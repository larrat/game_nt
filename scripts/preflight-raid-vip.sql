-- Operator preflight for the currently connected project: READ ONLY.
-- Never toggles feature flags and never selects player rows or credits.
BEGIN READ ONLY;

SELECT key, value AS enabled
FROM public.game_config
WHERE key IN ('verified_raids_enabled','vip_point_respec_enabled')
ORDER BY key;

SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS signature,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS executable_authenticated,
       has_function_privilege('anon',p.oid,'EXECUTE') AS executable_anon
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('iniciar_raid_verificada','continuar_raid_verificada',
                   'estado_raid_verificada','vip_reset_talento')
ORDER BY p.proname;

SELECT 'app_private.raid_runs' AS resource,
  has_table_privilege('authenticated','app_private.raid_runs','SELECT') AS read_by_authenticated
UNION ALL
SELECT 'app_private.vip_point_respec_ledger',
  has_table_privilege('authenticated','app_private.vip_point_respec_ledger','SELECT');

COMMIT;
