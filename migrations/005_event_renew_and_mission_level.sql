-- Renova evento Kyuubi expirado e valida nível na missão

UPDATE global_events
SET ends_at = now() + interval '7 days',
    boss_hp = CASE WHEN boss_hp <= 0 THEN boss_max_hp ELSE boss_hp END
WHERE is_active = true
  AND is_world_boss = true
  AND (ends_at IS NULL OR ends_at <= now());

CREATE OR REPLACE FUNCTION iniciar_missao(
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
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_mission FROM missions WHERE id = p_mission_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Missão não encontrada');
    END IF;

    IF COALESCE(v_player.level, 1) < COALESCE(v_mission.req_level, 1) THEN
        RETURN jsonb_build_object('error', 'Nível insuficiente para esta missão');
    END IF;

    v_missions_array := COALESCE(v_player.active_missions, '[]'::jsonb);
    v_slots := COALESCE(v_player.mission_slots, 1);

    FOR v_mission_elem IN SELECT * FROM jsonb_array_elements(v_missions_array) LOOP
        IF (v_mission_elem->>'mission_id')::INT = p_mission_id THEN
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
