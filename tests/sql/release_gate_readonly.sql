-- Read-only release gate for GAME_NT. Safe to run on production (no DML).
-- Review the result before changing ANY gameplay flag.
WITH flags AS (
 SELECT
  COALESCE((SELECT value='true'::jsonb FROM public.game_config WHERE key='verified_raids_enabled'),false) raids_enabled,
  COALESCE((SELECT value='true'::jsonb FROM public.game_config WHERE key='vip_point_respec_enabled'),false) vip_enabled
), stats AS (
 SELECT
  (SELECT count(*) FROM content_reference.art_rights_reviews WHERE review_status<>'approved') art_pending,
  (SELECT count(*) FROM content_reference.catalog_review_queue WHERE review_status<>'approved') catalog_pending,
  (SELECT count(*) FROM public.avatars a LEFT JOIN public.characters c ON c.id=a.character_id
   WHERE a.character_id IS NULL OR c.id IS NULL) variants_unlinked,
  (SELECT count(*) FROM public.characters WHERE NULLIF(btrim(base_avatar_url),'') IS NULL) portraits_missing
), permissions AS (
 SELECT
  bool_and(NOT has_function_privilege('anon',p.oid,'EXECUTE')) anonymous_blocked
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('iniciar_raid_verificada','continuar_raid_verificada','vip_reset_talento')
), obsolete AS (
 SELECT COALESCE(bool_and(NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
       AND NOT has_function_privilege('anon',p.oid,'EXECUTE')),false) legacy_reservation_blocked
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='reservar_raid_stamina'
)
SELECT flags.*, stats.*, permissions.anonymous_blocked,obsolete.legacy_reservation_blocked,
 CASE WHEN flags.raids_enabled OR flags.vip_enabled THEN 'REVIEW: live economic features enabled'
      ELSE 'SAFE DEFAULT: economic features disabled' END economic_gate,
 CASE WHEN stats.art_pending=0 AND stats.catalog_pending=0
       AND stats.variants_unlinked=0 AND stats.portraits_missing=0
      THEN 'CATALOG METADATA REVIEW COMPLETE (manual license verification still required)'
      ELSE 'BLOCK: catalog/art review outstanding' END catalog_gate
FROM flags CROSS JOIN stats CROSS JOIN permissions CROSS JOIN obsolete;

-- Note: passing this query is NOT proof of an A/B staging integration test.
-- Required separately: disposable A/B accounts, concurrent/replayed RPC calls,
-- three/five-fight settlement, exact stamina debits, VIP ledger reconciliation,
-- reward idempotency and zero effects on the other user's balances.
