-- Migration 031: make public game catalogs read-only to API client roles.
-- Catalog rows remain readable without login; writes are reserved for trusted roles.

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jutsu_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_catalog_read ON public.items
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY story_quests_catalog_read ON public.story_quests
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY avatars_catalog_read ON public.avatars
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY status_effects_catalog_read ON public.status_effects
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY jutsu_effects_catalog_read ON public.jutsu_effects
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY npcs_catalog_read ON public.npcs
FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY tasks_catalog_read ON public.tasks
FOR SELECT TO anon, authenticated USING (true);

REVOKE ALL ON TABLE public.items, public.story_quests, public.avatars,
  public.status_effects, public.jutsu_effects, public.npcs, public.tasks
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.items, public.story_quests, public.avatars,
  public.status_effects, public.jutsu_effects, public.npcs, public.tasks
TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
