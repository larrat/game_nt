-- Migration 028: isolate player-owned tables from anonymous and cross-player access.
-- Authenticated SELECT on players remains broad for in-game profiles/rankings.
-- RLS controls which rows may be changed or read in player-owned tables.

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_jutsus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_boss_damage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_boss_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY players_select_authenticated
ON public.players FOR SELECT TO authenticated USING (true);
CREATE POLICY players_insert_own
ON public.players FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY players_update_own
ON public.players FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY players_delete_own
ON public.players FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY player_inventory_select_own
ON public.player_inventory FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_inventory.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_inventory_insert_own
ON public.player_inventory FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_inventory.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_inventory_update_own
ON public.player_inventory FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_inventory.player_id AND p.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_inventory.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_inventory_delete_own
ON public.player_inventory FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_inventory.player_id AND p.user_id = (SELECT auth.uid())));

CREATE POLICY player_jutsus_select_own
ON public.player_jutsus FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_jutsus.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_jutsus_insert_own
ON public.player_jutsus FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_jutsus.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_jutsus_update_own
ON public.player_jutsus FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_jutsus.player_id AND p.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_jutsus.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_jutsus_delete_own
ON public.player_jutsus FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_jutsus.player_id AND p.user_id = (SELECT auth.uid())));

CREATE POLICY player_quests_select_own
ON public.player_quests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_quests.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_quests_insert_active_own
ON public.player_quests FOR INSERT TO authenticated
WITH CHECK (
  status = 'active'
  AND EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_quests.player_id AND p.user_id = (SELECT auth.uid()))
);

CREATE POLICY battle_logs_select_own
ON public.battle_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = battle_logs.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY battle_logs_insert_own
ON public.battle_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = battle_logs.player_id AND p.user_id = (SELECT auth.uid())));

CREATE POLICY world_boss_damage_select_own
ON public.world_boss_damage FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_damage.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY world_boss_damage_insert_own
ON public.world_boss_damage FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_damage.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY world_boss_damage_update_own
ON public.world_boss_damage FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_damage.player_id AND p.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_damage.player_id AND p.user_id = (SELECT auth.uid())));

CREATE POLICY world_boss_logs_select_own
ON public.world_boss_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_logs.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY world_boss_logs_insert_own
ON public.world_boss_logs FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = world_boss_logs.player_id AND p.user_id = (SELECT auth.uid())));

-- Remove broad anonymous grants, including privileges that should never be
-- available to API clients. Authenticated grants are narrowed to app operations;
-- row access is enforced by the policies above.
REVOKE ALL ON TABLE public.players, public.player_inventory, public.player_jutsus,
  public.player_quests, public.battle_logs, public.world_boss_damage, public.world_boss_logs
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.player_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.player_jutsus TO authenticated;
GRANT SELECT, INSERT ON TABLE public.player_quests TO authenticated;
GRANT SELECT, INSERT ON TABLE public.battle_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.world_boss_damage TO authenticated;
GRANT SELECT, INSERT ON TABLE public.world_boss_logs TO authenticated;

NOTIFY pgrst, 'reload schema';
