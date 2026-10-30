-- Phase 2/2: apply ONLY AFTER the new frontend is live and tested.
-- Public identity reads now use restricted RPCs defined in migration 063.
-- Full player records are visible exclusively to the account owner.
DROP POLICY IF EXISTS players_select_authenticated ON public.players;
DROP POLICY IF EXISTS players_select_own ON public.players;
CREATE POLICY players_select_own ON public.players
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
NOTIFY pgrst,'reload schema';
