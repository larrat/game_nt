-- migrations/018_fix_mission_rankup.sql

CREATE OR REPLACE FUNCTION public.finalizar_missao(
    p_player_id INT,
    p_mission_id INT,
    p_mission_xp INT,
    p_mission_ryous INT,
    p_mission_type TEXT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_mission JSONB;
    v_missions_array JSONB;
    v_end_time TIMESTAMP WITH TIME ZONE;
    v_new_array JSONB;
    v_now TIMESTAMP WITH TIME ZONE;
    v_new_xp BIGINT;
    v_new_level INT;
    v_levels_gained INT := 0;
    v_new_rank TEXT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    v_missions_array := COALESCE(v_player.active_missions, '[]'::jsonb);
    IF jsonb_array_length(v_missions_array) = 0 THEN
        RETURN jsonb_build_object('error', 'Nenhuma missão ativa');
    END IF;

    FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions_array) LOOP
        IF (v_mission->>'mission_id')::INT = p_mission_id THEN
            v_end_time := (v_mission->>'end_time')::TIMESTAMP WITH TIME ZONE;
            EXIT;
        END IF;
    END LOOP;

    IF v_end_time IS NULL THEN
        RETURN jsonb_build_object('error', 'Missão não encontrada na lista do jogador');
    END IF;

    v_now := now();
    IF v_now < v_end_time THEN
        RETURN jsonb_build_object(
            'error', 'Tempo da missão ainda não acabou',
            'remaining_seconds', EXTRACT(EPOCH FROM (v_end_time - v_now))
        );
    END IF;

    SELECT jsonb_agg(elem) INTO v_new_array
    FROM jsonb_array_elements(v_missions_array) elem
    WHERE (elem->>'mission_id')::INT != p_mission_id;

    IF v_new_array IS NULL THEN
        v_new_array := '[]'::jsonb;
    END IF;

    -- Cálculos de XP e Level
    v_new_xp := COALESCE(v_player.xp, 0) + p_mission_xp;
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));
    v_new_rank := v_player.rank;

    -- Promoção Automática de Estudante -> Genin ao atingir nível 5
    IF v_new_level >= 5 AND v_player.rank = 'Estudante da Academia' THEN
        v_new_rank := 'Genin';
    END IF;

    UPDATE players
    SET active_missions = v_new_array,
        xp = v_new_xp,
        level = v_new_level,
        rank = v_new_rank,
        pontos_atributos = COALESCE(pontos_atributos, 0) + (v_levels_gained * 5),
        ryous = COALESCE(ryous, 0) + p_mission_ryous,
        tasks_completed = CASE WHEN p_mission_type = 'tarefa_academia' THEN COALESCE(tasks_completed, 0) + 1 ELSE tasks_completed END,
        missions_d = CASE WHEN p_mission_type = 'D' THEN COALESCE(missions_d, 0) + 1 ELSE missions_d END,
        missions_c = CASE WHEN p_mission_type = 'C' THEN COALESCE(missions_c, 0) + 1 ELSE missions_c END,
        missions_b = CASE WHEN p_mission_type = 'B' THEN COALESCE(missions_b, 0) + 1 ELSE missions_b END,
        missions_a = CASE WHEN p_mission_type = 'A' THEN COALESCE(missions_a, 0) + 1 ELSE missions_a END,
        missions_s = CASE WHEN p_mission_type = 'S' THEN COALESCE(missions_s, 0) + 1 ELSE missions_s END
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'xp_gained', p_mission_xp, 'ryous_gained', p_mission_ryous, 'levels_gained', v_levels_gained, 'new_rank', v_new_rank);
END;
$$ LANGUAGE plpgsql;
