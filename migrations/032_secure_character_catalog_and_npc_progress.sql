-- Migration 032: protect NPC progress and make remaining reference/group tables read-only.
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_defeated_npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY characters_catalog_read ON public.characters
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY teams_read ON public.teams
FOR SELECT TO authenticated USING (true);
CREATE POLICY organizations_read ON public.organizations
FOR SELECT TO authenticated USING (true);

CREATE POLICY player_defeated_npcs_select_own ON public.player_defeated_npcs
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_defeated_npcs.player_id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY player_defeated_npcs_insert_own ON public.player_defeated_npcs
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_defeated_npcs.player_id AND p.user_id = (SELECT auth.uid())));

REVOKE ALL ON TABLE public.characters, public.teams, public.organizations,
  public.player_defeated_npcs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.characters TO anon, authenticated;
GRANT SELECT ON TABLE public.teams, public.organizations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.player_defeated_npcs TO authenticated;

NOTIFY pgrst, 'reload schema';
