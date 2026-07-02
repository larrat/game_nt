-- migrations/002_timers_rpc.sql

-- 1. Hospital: Alta e Cura Paga
CREATE OR REPLACE FUNCTION hospital_alta(
    p_player_id UUID,
    p_paid BOOLEAN,
    p_max_hp INT,
    p_max_cp INT,
    p_global_hospital_cost_mult NUMERIC DEFAULT 1.0
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_cure_cost INT;
    v_target_time TIMESTAMP WITH TIME ZONE;
    v_max_hp INT;
    v_max_cp INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Player not found'); END IF;
    
    IF NOT v_player.is_fainted THEN
        RETURN jsonb_build_object('error', 'Player is not fainted');
    END IF;

    -- Calcular custo
    v_cure_cost := GREATEST(50, COALESCE(v_player.level, 1) * 50) * p_global_hospital_cost_mult;

    IF p_paid THEN
        IF COALESCE(v_player.ryous, 0) < v_cure_cost THEN
            RETURN jsonb_build_object('error', 'Ryous insuficientes', 'cost', v_cure_cost);
        END IF;
        -- Deduzir ryous
        UPDATE players SET ryous = ryous - v_cure_cost WHERE id = p_player_id;
    ELSE
        -- Validar tempo (5 minutos)
        IF v_player.fainted_at IS NULL THEN
            RETURN jsonb_build_object('error', 'Timestamp de desmaio não encontrado');
        END IF;
        
        v_target_time := (v_player.fainted_at::timestamp with time zone) + interval '5 minutes';
        IF now() < v_target_time THEN
            RETURN jsonb_build_object('error', 'Ainda em recuperação', 'remaining_seconds', EXTRACT(EPOCH FROM (v_target_time - now())));
        END IF;
    END IF;

    -- Recuperar HP e CP baseados nos atributos. 
    -- Como a formula completa fica em engine.js, podemos apenas setar null ou um valor genérico, mas a tabela
    -- não tem uma view que calcula os max automaticamente sem o RPC. 
    -- Para a Fase A.2, como só precisamos redefinir o estado, vamos assumir MaxHP = 99999 e MaxCP = 99999 
    -- ou usar a formula aproximada aqui (ja fizemos isso na RPC 001, mas para manter simples...)
    -- O client faz calculateHP(). Podemos passar v_max_hp do client como param só pro banco salvar o max correto.
    -- (O banco não calcula os bônus de equip sem uma função complexa).

    UPDATE players 
    SET is_fainted = false, 
        fainted_at = null,
        hp = p_max_hp,
        chakra = p_max_cp
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'paid', p_paid, 'cost', CASE WHEN p_paid THEN v_cure_cost ELSE 0 END);
END;
$$ LANGUAGE plpgsql;

-- 2. Missões: Validação e Finalização
CREATE OR REPLACE FUNCTION finalizar_missao(
    p_player_id UUID,
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
    SELECT * INTO v_player FROM players WHERE id = p_player_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Player not found'); END IF;

    v_missions_array := v_player.active_missions;
    IF v_missions_array IS NULL OR jsonb_array_length(v_missions_array) = 0 THEN
        RETURN jsonb_build_object('error', 'Nenhuma missão ativa');
    END IF;

    -- Encontrar a missão no array
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
        RETURN jsonb_build_object('error', 'Tempo da missão ainda não acabou', 'remaining_seconds', EXTRACT(EPOCH FROM (v_end_time - v_now)));
    END IF;

    -- Remover a missão do array (Postgres 12+ usa - para jsonb, mas para elementos precisamos recriar ou usar jsonpath)
    SELECT jsonb_agg(elem) INTO v_new_array 
    FROM jsonb_array_elements(v_missions_array) elem 
    WHERE (elem->>'mission_id')::INT != p_mission_id;

    IF v_new_array IS NULL THEN
        v_new_array := '[]'::jsonb;
    END IF;

    -- Aumentar XP e Ryous e atualizar active_missions
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

    -- Nota: O nível (level) sobe baseado em curva exp. 
    -- Para não duplicar a math de calcular level (500 * L^1.8) no postgres, vamos deixar o Client ler o novo XP e rodar o updateLevel se upar.

    RETURN jsonb_build_object('success', true, 'xp_gained', p_mission_xp, 'ryous_gained', p_mission_ryous);
END;
$$ LANGUAGE plpgsql;
