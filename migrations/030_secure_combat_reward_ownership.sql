CREATE OR REPLACE FUNCTION public.finalizar_combate(p_player_id integer, p_enemy_id integer, p_result text, p_turn_count integer, p_combat_log jsonb, p_fallback_xp integer DEFAULT 100, p_fallback_ryous integer DEFAULT 50, p_enemy_name text DEFAULT 'Desconhecido'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player RECORD;
    v_enemy RECORD;
    v_xp_gained INT := 0;
    v_ryous_gained INT := 0;
    v_new_xp BIGINT;
    v_new_level INT;
    v_levels_gained INT := 0;
    v_final_enemy_name TEXT;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.players AS owner_player
        WHERE owner_player.id = p_player_id
          AND owner_player.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    -- Tenta encontrar o inimigo no banco de dados
    SELECT * INTO v_enemy FROM npcs WHERE id = p_enemy_id;
    
    -- Se encontrou, usa os dados do banco, senão usa os fallbacks passados via parâmetro (para clones, players, inimigos gerados)
    IF FOUND THEN
        v_xp_gained := COALESCE(v_enemy.xp_reward, p_fallback_xp);
        v_ryous_gained := COALESCE(v_enemy.ryou_reward, p_fallback_ryous);
        v_final_enemy_name := v_enemy.name;
    ELSE
        v_xp_gained := p_fallback_xp;
        v_ryous_gained := p_fallback_ryous;
        v_final_enemy_name := p_enemy_name;
    END IF;

    IF p_result = 'win' THEN
        v_new_xp := COALESCE(v_player.xp, 0) + v_xp_gained;
        v_new_level := public.calcular_level_por_xp(v_new_xp);
        v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));
        
        UPDATE players 
        SET 
            xp = v_new_xp, 
            level = v_new_level,
            pontos_atributos = COALESCE(pontos_atributos, 0) + (v_levels_gained * 5), -- Ganha 5 pontos por nível
            ryous = COALESCE(ryous, 0) + v_ryous_gained,
            npc_wins = COALESCE(npc_wins, 0) + 1,
            daily_npcs_defeated = COALESCE(daily_npcs_defeated, 0) + 1
        WHERE id = p_player_id;
    END IF;

    INSERT INTO battle_logs (player_id, enemy_name, result, xp_gained, ryous_gained, turn_count, combat_log)
    VALUES (p_player_id, v_final_enemy_name, p_result, v_xp_gained, v_ryous_gained, p_turn_count, p_combat_log);

    RETURN jsonb_build_object('success', true, 'xp_gained', v_xp_gained, 'ryous_gained', v_ryous_gained, 'levels_gained', v_levels_gained);
END;
$function$;

CREATE OR REPLACE FUNCTION public.finalizar_combate(p_player_id integer, p_enemy_id integer, p_result text, p_turn_count integer, p_combat_log jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player RECORD;
    v_enemy RECORD;
    v_xp_gained INT := 0;
    v_ryous_gained INT := 0;
    v_new_xp BIGINT;
    v_new_level INT;
    v_levels_gained INT;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.players AS owner_player
        WHERE owner_player.id = p_player_id
          AND owner_player.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_enemy FROM npcs WHERE id = p_enemy_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Inimigo não encontrado');
    END IF;

    IF p_result = 'win' THEN
        v_xp_gained := v_enemy.xp_reward;
        v_ryous_gained := v_enemy.ryou_reward;

        v_new_xp := COALESCE(v_player.xp, 0) + v_xp_gained;
        v_new_level := public.calcular_level_por_xp(v_new_xp);
        v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));
        
        UPDATE players 
        SET 
            xp = v_new_xp, 
            level = v_new_level,
            pontos_atributos = COALESCE(pontos_atributos, 0) + v_levels_gained,
            ryous = COALESCE(ryous, 0) + v_ryous_gained,
            npc_wins = COALESCE(npc_wins, 0) + 1,
            daily_npcs_defeated = COALESCE(daily_npcs_defeated, 0) + 1
        WHERE id = p_player_id;
    END IF;

    INSERT INTO battle_logs (player_id, enemy_name, result, xp_gained, ryous_gained, turn_count, combat_log)
    VALUES (p_player_id, v_enemy.name, p_result, v_xp_gained, v_ryous_gained, p_turn_count, p_combat_log);

    RETURN jsonb_build_object('success', true, 'xp_gained', v_xp_gained, 'ryous_gained', v_ryous_gained, 'levels_gained', v_levels_gained);
END;
$function$;

REVOKE ALL ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb, integer, integer, text) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
