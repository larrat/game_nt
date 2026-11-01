-- 068: indexes on critical foreign-key access paths.
-- Data-preserving; no grants, policies, player rows, rewards or economics change.
SET lock_timeout='5s';
SET statement_timeout='30s';

CREATE INDEX IF NOT EXISTS idx_avatars_character_id
 ON public.avatars(character_id);
CREATE INDEX IF NOT EXISTS idx_npcs_character_id
 ON public.npcs(character_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_player_created
 ON public.battle_logs(player_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_combat_sessions_player_status
 ON public.player_combat_sessions(player_id,status,expires_at);
CREATE INDEX IF NOT EXISTS idx_player_combat_sessions_enemy_id
 ON public.player_combat_sessions(enemy_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_player_id
 ON public.player_inventory(player_id);
CREATE INDEX IF NOT EXISTS idx_player_inventory_item_id
 ON public.player_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_player_consumables_consumable_id
 ON public.player_consumables(consumable_id);
CREATE INDEX IF NOT EXISTS idx_player_defeated_npcs_npc_id
 ON public.player_defeated_npcs(npc_id);
CREATE INDEX IF NOT EXISTS idx_player_jutsus_player_id
 ON public.player_jutsus(player_id);
CREATE INDEX IF NOT EXISTS idx_player_jutsus_jutsu_id
 ON public.player_jutsus(jutsu_id);
CREATE INDEX IF NOT EXISTS idx_jutsu_effects_jutsu_id
 ON public.jutsu_effects(jutsu_id);
CREATE INDEX IF NOT EXISTS idx_jutsu_effects_effect_id
 ON public.jutsu_effects(effect_id);
