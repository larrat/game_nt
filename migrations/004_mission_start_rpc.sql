-- RPC para iniciar missão com validação atômica (sem duplicatas, respeita slots)

CREATE OR REPLACE FUNCTION iniciar_missao(
    p_player_id INT,
    p_mission_id INT,
    p_duration_seconds INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_missions_array JSONB;
    v_mission JSONB;
    v_slots INT;
    v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    v_missions_array := COALESCE(v_player.active_missions, '[]'::jsonb);
    v_slots := COALESCE(v_player.mission_slots, 1);

    FOR v_mission IN SELECT * FROM jsonb_array_elements(v_missions_array) LOOP
        IF (v_mission->>'mission_id')::INT = p_mission_id THEN
            RETURN jsonb_build_object('error', 'Missão já está em andamento');
        END IF;
    END LOOP;

    IF jsonb_array_length(v_missions_array) >= v_slots THEN
        RETURN jsonb_build_object('error', 'Slots ocupados');
    END IF;

    v_end_time := now() + (p_duration_seconds || ' seconds')::interval;
    v_missions_array := v_missions_array || jsonb_build_array(
        jsonb_build_object('mission_id', p_mission_id, 'end_time', v_end_time)
    );

    UPDATE players SET active_missions = v_missions_array WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'end_time', v_end_time);
END;
$$ LANGUAGE plpgsql;
