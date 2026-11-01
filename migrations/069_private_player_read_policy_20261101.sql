-- 069: player sheet is private; public ranking/rival lists use curated RPCs.
-- All frontend direct player reads filter user_id or use the logged-in player ID.
-- No player rows, progression, or balance is changed.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $preflight$
BEGIN
 IF (SELECT COUNT(*) FROM public.players WHERE user_id IS NULL) > 0 THEN
   RAISE EXCEPTION 'Some players have no account owner. Refusing policy cutover.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='public'
   AND tablename='players' AND policyname='players_select_authenticated'
   AND cmd='SELECT'
 ) THEN
   RAISE EXCEPTION 'Expected SELECT policy is missing; migration not applied.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='players' AND cmd='SELECT'
     AND policyname<>'players_select_authenticated'
 ) THEN
   RAISE EXCEPTION 'Additional player SELECT policy exists. Audit first.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class WHERE oid='public.players'::regclass AND relrowsecurity
 ) THEN
   RAISE EXCEPTION 'RLS unexpectedly disabled on players.';
 END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS app_private.player_policy_backup_20261101 (
  policyname text PRIMARY KEY,
  definition jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.player_policy_backup_20261101 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.player_policy_backup_20261101 FROM PUBLIC,anon,authenticated;
INSERT INTO app_private.player_policy_backup_20261101 (policyname,definition)
SELECT policyname,to_jsonb(p) FROM pg_policies p
WHERE schemaname='public' AND tablename='players'
ON CONFLICT(policyname) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_players_owner_id ON public.players(user_id,id);

ALTER POLICY players_select_authenticated ON public.players
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
ALTER POLICY players_update_own ON public.players
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DO $verify$
BEGIN
 IF EXISTS(
  SELECT 1 FROM pg_policies
  WHERE schemaname='public' AND tablename='players'
    AND cmd='SELECT' AND qual NOT ILIKE '%auth.uid%'
 ) THEN RAISE EXCEPTION 'Player SELECT policy remains broad.'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname='public' AND tablename='players'
    AND policyname='players_update_own' AND with_check ILIKE '%auth.uid%'
 ) THEN RAISE EXCEPTION 'Player UPDATE ownership check is missing.'; END IF;
END $verify$;

NOTIFY pgrst,'reload schema';
