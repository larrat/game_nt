-- migrations/007_fix_missions_duplicate.sql

CREATE OR REPLACE FUNCTION public.iniciar_missao(
    p_player_id INT,
    p_mission_id INT,
    p_duration_seconds INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_mission RECORD;
    v_missions_array JSONB;
    v_mission_elem JSONB;
    v_slots INT;
    v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Bloqueio rigoroso da linha do jogador para prevenir concorrência (double clicks)
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_mission FROM missions WHERE id = p_mission_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Missão não encontrada ou inativa');
    END IF;

    IF COALESCE(v_player.level, 1) < COALESCE(v_mission.req_level, 1) THEN
        RETURN jsonb_build_object('error', 'Nível insuficiente para esta missão');
    END IF;

    v_missions_array := COALESCE(v_player.active_missions, '[]'::jsonb);
    v_slots := COALESCE(v_player.mission_slots, 1);

    -- Verifica se o array já atingiu o limite de slots
    IF jsonb_array_length(v_missions_array) >= v_slots THEN
        RETURN jsonb_build_object('error', 'Slots ocupados');
    END IF;

    -- Verifica duplicação da MESMA missão de forma robusta
    IF jsonb_array_length(v_missions_array) > 0 THEN
        FOR v_mission_elem IN SELECT * FROM jsonb_array_elements(v_missions_array) LOOP
            -- Trata possível problema de tipagem
            IF (v_mission_elem->>'mission_id')::text = p_mission_id::text THEN
                RETURN jsonb_build_object('error', 'Esta missão já está em andamento');
            END IF;
        END LOOP;
    END IF;

    v_end_time := now() + (p_duration_seconds || ' seconds')::interval;
    
    -- Anexar a nova missão
    v_missions_array := v_missions_array || jsonb_build_array(
        jsonb_build_object('mission_id', p_mission_id, 'end_time', v_end_time)
    );

    UPDATE players SET active_missions = v_missions_array WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'end_time', v_end_time);
END;
$$ LANGUAGE plpgsql;
