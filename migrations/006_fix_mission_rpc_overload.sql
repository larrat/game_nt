-- Remove overload ambíguo: players.id é INTEGER, não UUID.
-- Rode este script se aparecer:
-- "Could not choose the best candidate function between ... finalizar_missao ... integer ... uuid"

DROP FUNCTION IF EXISTS public.finalizar_missao(uuid, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.finalizar_missao(integer, integer, integer, integer, text);

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

    UPDATE players
    SET active_missions = v_new_array,
        xp = COALESCE(xp, 0) + p_mission_xp,
        ryous = COALESCE(ryous, 0) + p_mission_ryous,
        tasks_completed = CASE WHEN p_mission_type = 'tarefa_academia' THEN COALESCE(tasks_completed, 0) + 1 ELSE tasks_completed END,
        missions_d = CASE WHEN p_mission_type = 'D' THEN COALESCE(missions_d, 0) + 1 ELSE missions_d END,
        missions_c = CASE WHEN p_mission_type = 'C' THEN COALESCE(missions_c, 0) + 1 ELSE missions_c END,
        missions_b = CASE WHEN p_mission_type = 'B' THEN COALESCE(missions_b, 0) + 1 ELSE missions_b END,
        missions_a = CASE WHEN p_mission_type = 'A' THEN COALESCE(missions_a, 0) + 1 ELSE missions_a END,
        missions_s = CASE WHEN p_mission_type = 'S' THEN COALESCE(missions_s, 0) + 1 ELSE missions_s END
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'xp_gained', p_mission_xp, 'ryous_gained', p_mission_ryous);
END;
$$ LANGUAGE plpgsql;

-- Garante iniciar_missao também só com INT (caso exista versão UUID)
DROP FUNCTION IF EXISTS public.iniciar_missao(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.iniciar_missao(integer, integer, integer);

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

-- hospital_alta: mesmo problema de tipo (players.id é INT)
DROP FUNCTION IF EXISTS public.hospital_alta(uuid, boolean, integer, integer, numeric);
DROP FUNCTION IF EXISTS public.hospital_alta(integer, boolean, integer, integer, numeric);

CREATE OR REPLACE FUNCTION public.hospital_alta(
    p_player_id INT,
    p_paid BOOLEAN,
    p_max_hp INT,
    p_max_cp INT,
    p_global_hospital_cost_mult NUMERIC DEFAULT 1.0
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_cure_cost INT;
    v_target_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Player not found'); END IF;

    IF NOT v_player.is_fainted THEN
        RETURN jsonb_build_object('error', 'Player is not fainted');
    END IF;

    v_cure_cost := GREATEST(50, COALESCE(v_player.level, 1) * 50) * p_global_hospital_cost_mult;

    IF p_paid THEN
        IF COALESCE(v_player.ryous, 0) < v_cure_cost THEN
            RETURN jsonb_build_object('error', 'Ryous insuficientes', 'cost', v_cure_cost);
        END IF;
        UPDATE players SET ryous = ryous - v_cure_cost WHERE id = p_player_id;
    ELSE
        IF v_player.fainted_at IS NULL THEN
            RETURN jsonb_build_object('error', 'Timestamp de desmaio não encontrado');
        END IF;

        v_target_time := (v_player.fainted_at::timestamp with time zone) + interval '5 minutes';
        IF now() < v_target_time THEN
            RETURN jsonb_build_object('error', 'Ainda em recuperação', 'remaining_seconds', EXTRACT(EPOCH FROM (v_target_time - now())));
        END IF;
    END IF;

    UPDATE players
    SET is_fainted = false,
        fainted_at = null,
        hp = p_max_hp,
        chakra = p_max_cp
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'paid', p_paid, 'cost', CASE WHEN p_paid THEN v_cure_cost ELSE 0 END);
END;
$$ LANGUAGE plpgsql;
