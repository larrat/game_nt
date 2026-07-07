-- migrations/009_migracao_xp_combate_treino.sql

-- 1. Treinar Atributo
CREATE OR REPLACE FUNCTION public.treinar_atributo(
    p_player_id INT,
    p_atributo TEXT,
    p_hero_min INT,
    p_hero_max INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_rank RECORD;
    v_min_gain INT;
    v_max_gain INT;
    v_roll INT;
    v_total_gain INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    IF v_player.pontos_atributos <= 0 THEN
        RETURN jsonb_build_object('error', 'Sem pontos de atributo');
    END IF;

    -- Buscar os multiplicadores da graduação
    SELECT * INTO v_rank FROM ranks WHERE title = v_player.rank LIMIT 1;
    IF NOT FOUND THEN
        -- Default fallbacks
        v_min_gain := GREATEST(1, floor(p_hero_min * 0.1)::INT);
        v_max_gain := GREATEST(1, floor(p_hero_max * 0.2)::INT);
        v_total_gain := v_min_gain + floor(random() * (v_max_gain - v_min_gain + 1))::INT;
    ELSE
        v_min_gain := GREATEST(1, floor(p_hero_min * COALESCE(v_rank.train_min_mult, 0.2))::INT);
        v_max_gain := GREATEST(1, floor(p_hero_max * COALESCE(v_rank.train_max_mult, 0.3))::INT);
        v_roll := v_min_gain + floor(random() * (v_max_gain - v_min_gain + 1))::INT;
        v_total_gain := v_roll + COALESCE(v_rank.train_bonus, 1);
    END IF;

    -- Atualizar jogador
    EXECUTE format('UPDATE players SET %I = COALESCE(%I, 0) + $1, pontos_atributos = pontos_atributos - 1, daily_trainings = COALESCE(daily_trainings, 0) + 1 WHERE id = $2', p_atributo, p_atributo)
    USING v_total_gain, p_player_id;

    RETURN jsonb_build_object('success', true, 'gained', v_total_gain, 'roll', v_roll, 'bonus', v_rank.train_bonus);
END;
$$ LANGUAGE plpgsql;


-- Função Auxiliar: Calcular Level por XP
CREATE OR REPLACE FUNCTION public.calcular_level_por_xp(p_xp BIGINT) RETURNS INT AS $$
DECLARE
    v_level INT := 1;
BEGIN
    WHILE p_xp >= floor(500 * power(v_level + 1, 1.8)) LOOP
        v_level := v_level + 1;
    END LOOP;
    RETURN v_level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Finalizar Combate (PvE)
CREATE OR REPLACE FUNCTION public.finalizar_combate(
    p_player_id INT,
    p_enemy_id INT,
    p_result TEXT,
    p_turn_count INT,
    p_combat_log JSONB
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_enemy RECORD;
    v_xp_gained INT := 0;
    v_ryous_gained INT := 0;
    v_new_xp BIGINT;
    v_new_level INT;
    v_levels_gained INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_enemy FROM npcs WHERE id = p_enemy_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Inimigo não encontrado');
    END IF;

    IF p_result = 'win' THEN
        v_xp_gained := COALESCE(v_enemy.xp_reward, 100);
        v_ryous_gained := COALESCE(v_enemy.ryou_reward, 50);

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
$$ LANGUAGE plpgsql;


-- 3. Reivindicar Recompensa Diária
CREATE OR REPLACE FUNCTION public.reivindicar_recompensa_diaria(
    p_player_id INT,
    p_day_index INT,
    p_reward_type TEXT,
    p_reward_amount INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_claimed JSONB;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    v_claimed := COALESCE(v_player.daily_rewards_claimed, '[]'::jsonb);

    -- Verifica se já pegou (busca exata)
    IF v_claimed @> (p_day_index::text)::jsonb THEN
        RETURN jsonb_build_object('error', 'Recompensa já resgatada');
    END IF;

    v_claimed := v_claimed || (p_day_index::text)::jsonb;

    IF p_reward_type = 'ryous' THEN
        UPDATE players SET ryous = COALESCE(ryous, 0) + p_reward_amount, daily_rewards_claimed = v_claimed WHERE id = p_player_id;
    ELSIF p_reward_type = 'xp' THEN
        UPDATE players SET xp = COALESCE(xp, 0) + p_reward_amount, daily_rewards_claimed = v_claimed WHERE id = p_player_id;
    ELSIF p_reward_type = 'vip_coins' THEN
        UPDATE players SET vip_coins = COALESCE(vip_coins, 0) + p_reward_amount, daily_rewards_claimed = v_claimed WHERE id = p_player_id;
    ELSE
        -- Fallback seguro
        UPDATE players SET daily_rewards_claimed = v_claimed WHERE id = p_player_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
