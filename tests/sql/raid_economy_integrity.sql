-- Disposable database only. No real account or project data is used.
\set ON_ERROR_STOP on
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

-- Flags prevent all economic changes until deliberate staging approval.
DO $test$
DECLARE v_result jsonb;
BEGIN
 v_result:=public.iniciar_raid_verificada(100,3);
 IF COALESCE((v_result->>'success')::boolean,false) THEN
   RAISE EXCEPTION 'Raid was enabled by default'; END IF;
 v_result:=public.vip_reset_talento(100,'forca');
 IF COALESCE((v_result->>'success')::boolean,false) THEN
   RAISE EXCEPTION 'VIP was enabled by default'; END IF;
 IF (SELECT stamina FROM public.players WHERE id=100)<>125 THEN
   RAISE EXCEPTION 'Disabled Raid charged stamina'; END IF;
 IF (SELECT vip_coins FROM public.players WHERE id=100)<>3 THEN
   RAISE EXCEPTION 'Disabled VIP charged credits'; END IF;
END $test$;

-- RLS: same table returns only the owner when invoked as authenticated.
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY players_read_own ON public.players FOR SELECT TO authenticated
USING(user_id=(SELECT auth.uid()));
GRANT SELECT ON public.players TO authenticated;
SET ROLE authenticated;
DO $isolation$
BEGIN
 IF (SELECT count(*) FROM public.players)<>1 THEN
   RAISE EXCEPTION 'RLS leaks B rows to A';
 END IF;
 IF EXISTS(SELECT 1 FROM public.players WHERE id=200) THEN
   RAISE EXCEPTION 'Account B visible to A';
 END IF;
END $isolation$;
RESET ROLE;

UPDATE public.game_config SET value='true'::jsonb
WHERE key IN ('verified_raids_enabled','vip_point_respec_enabled');

DO $raid$
DECLARE
 v jsonb;
 v_sid uuid;
 v_s integer;
 v_owner uuid := '11111111-1111-4111-8111-111111111111'::uuid;
BEGIN
 PERFORM set_config('request.jwt.claim.sub',v_owner::text,false);
 -- Player A cannot start or spend from player B.
 BEGIN
   PERFORM public.iniciar_raid_verificada(200,3);
   RAISE EXCEPTION 'Cross-account raid unexpectedly succeeded';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='Cross-account raid unexpectedly succeeded' THEN RAISE; END IF;
 END;

 v:=public.iniciar_raid_verificada(100,3);
 IF COALESCE((v->>'success')::boolean,false) IS NOT TRUE
   OR (v->>'raid_current')::integer<>1 THEN
   RAISE EXCEPTION 'Raid 3x did not start: %',v;
 END IF;
 v_sid:=(v->>'session_id')::uuid;
 SELECT stamina INTO v_s FROM public.players WHERE id=100;
 IF v_s<>100 OR (SELECT player_stamina FROM public.player_combat_sessions
   WHERE session_id=v_sid)<>100 THEN
   RAISE EXCEPTION 'First fight did not charge once and persist cost';
 END IF;

 v:=public.iniciar_raid_verificada(100,3);
 IF COALESCE((v->>'success')::boolean,false) IS TRUE
   OR (SELECT stamina FROM public.players WHERE id=100)<>100 THEN
   RAISE EXCEPTION 'Replay of Raid start double-charged player';
 END IF;

 -- B cannot advance A's Raid.
 PERFORM set_config('request.jwt.claim.sub',
   '22222222-2222-4222-8222-222222222222',false);
 BEGIN
   PERFORM public.continuar_raid_verificada(100);
   RAISE EXCEPTION 'Cross-account continuation unexpectedly succeeded';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='Cross-account continuation unexpectedly succeeded' THEN RAISE; END IF;
 END;
 PERFORM set_config('request.jwt.claim.sub',v_owner::text,false);

 v:=public.continuar_raid_verificada(100);
 IF COALESCE((v->>'success')::boolean,false) IS TRUE
   OR (SELECT stamina FROM public.players WHERE id=100)<>100 THEN
    RAISE EXCEPTION 'Continuing an unfinished fight double-charged';
 END IF;
 UPDATE public.player_combat_sessions SET status='settled' WHERE session_id=v_sid;
 v:=public.continuar_raid_verificada(100);
 IF COALESCE((v->>'success')::boolean,false) IS NOT TRUE
   OR (v->>'raid_current')::integer<>2 THEN
    RAISE EXCEPTION 'Raid second fight failed: %',v;
 END IF;
 v_sid:=(v->>'session_id')::uuid;
 IF (SELECT stamina FROM public.players WHERE id=100)<>75
  OR (SELECT player_stamina FROM public.player_combat_sessions
   WHERE session_id=v_sid)<>75 THEN
   RAISE EXCEPTION 'Second fight cost not persisted';
 END IF;
 UPDATE public.player_combat_sessions SET status='settled' WHERE session_id=v_sid;
 v:=public.continuar_raid_verificada(100);
 IF COALESCE((v->>'success')::boolean,false) IS NOT TRUE
   OR (v->>'raid_current')::integer<>3 THEN
   RAISE EXCEPTION 'Raid third fight failed: %',v;
 END IF;
 v_sid:=(v->>'session_id')::uuid;
 IF (SELECT stamina FROM public.players WHERE id=100)<>50
  OR (SELECT player_stamina FROM public.player_combat_sessions
   WHERE session_id=v_sid)<>50 THEN
   RAISE EXCEPTION 'Third fight cost not persisted';
 END IF;
 UPDATE public.player_combat_sessions SET status='settled' WHERE session_id=v_sid;
 v:=public.continuar_raid_verificada(100);
 IF COALESCE((v->>'success')::boolean,false) IS NOT TRUE
   OR (v->>'raid_completed')::boolean IS NOT TRUE
   OR (v->>'raid_stamina_charged')::integer<>75 THEN
    RAISE EXCEPTION 'Raid did not complete atomically: %',v;
 END IF;
 IF EXISTS(SELECT 1 FROM app_private.raid_runs WHERE player_id=100
  AND status='active') THEN RAISE EXCEPTION 'Completed raid still active'; END IF;
 IF (SELECT stamina FROM public.players WHERE id=200)<>125 THEN
   RAISE EXCEPTION 'Raid changed B stamina';
 END IF;
END $raid$;

DO $vip$
DECLARE v jsonb;
BEGIN
 PERFORM set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
 v:=public.vip_reset_talento(100,'forca');
 IF COALESCE((v->>'success')::boolean,false) IS NOT TRUE
   OR (v->>'credits_charged')::integer<>1 THEN
   RAISE EXCEPTION 'VIP one-point reset failed: %',v; END IF;
 IF (SELECT forca FROM public.players WHERE id=100)<>4
   OR (SELECT pontos_atributos FROM public.players WHERE id=100)<>1
   OR (SELECT vip_coins FROM public.players WHERE id=100)<>2
   OR (SELECT total_vip_spent FROM public.players WHERE id=100)<>1
   OR (SELECT count(*) FROM app_private.vip_point_respec_ledger
       WHERE player_id=100)<>1 THEN
   RAISE EXCEPTION 'VIP was not transactional'; END IF;
 v:=public.vip_reset_talento(100,'illegal_column');
 IF COALESCE((v->>'success')::boolean,false) IS TRUE THEN
   RAISE EXCEPTION 'Unknown stat was accepted'; END IF;
 IF (SELECT vip_coins FROM public.players WHERE id=100)<>2 THEN
   RAISE EXCEPTION 'Invalid VIP input charged credits'; END IF;

 -- B cannot debit A, with all data synthetically seeded.
 PERFORM set_config('request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',false);
 BEGIN
   PERFORM public.vip_reset_talento(100,'forca');
   RAISE EXCEPTION 'Cross-account VIP unexpectedly succeeded';
 EXCEPTION WHEN OTHERS THEN
   IF SQLERRM='Cross-account VIP unexpectedly succeeded' THEN RAISE; END IF;
 END;
 IF (SELECT vip_coins FROM public.players WHERE id=200)<>3 THEN
   RAISE EXCEPTION 'VIP changed B balance'; END IF;
END $vip$;

DO $art$
BEGIN
 IF (SELECT count(*) FROM content_reference.art_rights_reviews
    WHERE review_status='pending_rights')<>2 THEN
   RAISE EXCEPTION 'Art rights queue not seeded'; END IF;
 IF (SELECT count(*) FROM content_reference.catalog_review_queue
    WHERE review_status='pending_review')<>1 THEN
   RAISE EXCEPTION 'Reference queue not seeded'; END IF;
 IF EXISTS(SELECT 1 FROM content_reference.art_rights_reviews
    WHERE review_status='approved') THEN
   RAISE EXCEPTION 'Art auto-approved without rights'; END IF;
END $art$;

SELECT 'SQL QA PASSED: staged A/B identity, per-fight debits, replay, three wins, private VIP ledger, art review' as result;
