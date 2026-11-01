-- 070: add remaining covering indexes identified by Supabase foreign-key advisor.
-- No player rows, economies, or gameplay state changes.
SET lock_timeout = '5s';
SET statement_timeout = '30s';
CREATE INDEX IF NOT EXISTS idx_clan_skills_clan_id_fk ON public.clan_skills(clan_id);
CREATE INDEX IF NOT EXISTS idx_clans_village_id_fk ON public.clans(village_id);
CREATE INDEX IF NOT EXISTS idx_organizations_village_id_fk ON public.organizations(village_id);
CREATE INDEX IF NOT EXISTS idx_player_quests_quest_id_fk ON public.player_quests(quest_id);
CREATE INDEX IF NOT EXISTS idx_player_summons_summon_id_fk ON public.player_summons(summon_id);
CREATE INDEX IF NOT EXISTS idx_players_avatar_fk ON public.players(avatar);
CREATE INDEX IF NOT EXISTS idx_players_active_task_id_fk ON public.players(active_task_id);
CREATE INDEX IF NOT EXISTS idx_players_character_id_fk ON public.players(character_id);
CREATE INDEX IF NOT EXISTS idx_players_clan_id_fk ON public.players(clan_id);
CREATE INDEX IF NOT EXISTS idx_players_org_id_fk ON public.players(org_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id_fk ON public.players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_vila_atual_id_fk ON public.players(vila_atual_id);
CREATE INDEX IF NOT EXISTS idx_players_village_id_fk ON public.players(village_id);
CREATE INDEX IF NOT EXISTS idx_story_quests_prerequisite_quest_id_fk ON public.story_quests(prerequisite_quest_id);
CREATE INDEX IF NOT EXISTS idx_teams_village_id_fk ON public.teams(village_id);
CREATE INDEX IF NOT EXISTS idx_village_donors_player_id_fk ON public.village_donors(player_id);
CREATE INDEX IF NOT EXISTS idx_world_boss_damage_event_id_fk ON public.world_boss_damage(event_id);
CREATE INDEX IF NOT EXISTS idx_world_boss_logs_player_id_fk ON public.world_boss_logs(player_id);
CREATE INDEX IF NOT EXISTS idx_world_boss_sessions_event_id_fk ON public.world_boss_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_world_boss_sessions_player_id_fk ON public.world_boss_sessions(player_id);
