-- migrations/010_migracao_avancada_jutsus.sql

-- 1. Assinar Invocação
CREATE OR REPLACE FUNCTION public.assinar_invocacao(
    p_player_id INT,
    p_invocacao_id INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_invocacao RECORD;
    v_cost INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_invocacao FROM summons WHERE id = p_invocacao_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invocação não encontrada');
    END IF;

    v_cost := v_invocacao.req_level * 100;

    IF v_player.ryous < v_cost THEN
        RETURN jsonb_build_object('error', 'Ryous insuficientes');
    END IF;

    IF v_player.level < v_invocacao.req_level THEN
        RETURN jsonb_build_object('error', 'Nível insuficiente');
    END IF;

    -- Subtrair dinheiro
    UPDATE players SET ryous = ryous - v_cost WHERE id = p_player_id;

    -- Inserir nova invocação desequipada
    INSERT INTO player_summons (player_id, summon_id, is_equipped)
    VALUES (p_player_id, p_invocacao_id, false);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 2. Desbloquear Portão Interno
CREATE OR REPLACE FUNCTION public.desbloquear_portao(
    p_player_id INT,
    p_portao_idx INT,
    p_req_level INT,
    p_req_ryous INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    IF v_player.level < p_req_level THEN
        RETURN jsonb_build_object('error', 'Nível insuficiente para este portão');
    END IF;

    IF v_player.ryous < p_req_ryous THEN
        RETURN jsonb_build_object('error', 'Ryous insuficientes');
    END IF;

    IF COALESCE(v_player.portao_interno_ativo, 0) >= p_portao_idx THEN
        RETURN jsonb_build_object('error', 'Portão já está desbloqueado');
    END IF;

    -- Subtrair dinheiro e upar o portão
    UPDATE players 
    SET ryous = ryous - p_req_ryous, portao_interno_ativo = p_portao_idx 
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 3. Desbloquear Avatar Templo
CREATE OR REPLACE FUNCTION public.desbloquear_avatar_templo(
    p_player_id INT,
    p_avatar_id TEXT,
    p_req_level INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_unlocked JSONB;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    IF v_player.level < p_req_level THEN
        RETURN jsonb_build_object('error', 'Nível insuficiente');
    END IF;

    v_unlocked := COALESCE(v_player.unlocked_avatars, '[]'::jsonb);

    IF v_unlocked @> (p_avatar_id::text)::jsonb THEN
        RETURN jsonb_build_object('error', 'Evolução já desbloqueada');
    END IF;

    v_unlocked := v_unlocked || (p_avatar_id::text)::jsonb;

    UPDATE players SET unlocked_avatars = v_unlocked WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 4. Aprimorar Jutsu (Slots e Estrelas)
CREATE OR REPLACE FUNCTION public.modificar_jutsu_slots(
    p_player_id INT,
    p_jutsu_id INT,
    p_action TEXT,          -- 'equip', 'unequip', 'upgrade'
    p_slot_idx INT,         -- 0, 1, 2 (apenas para equip/unequip)
    p_essence_key TEXT,     -- Chave da essência (ex: 'dano_1') (apenas para equip)
    p_upgrade_cost INT      -- Ryous necessários para upar a estrela (apenas upgrade)
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_jutsus JSONB;
    v_essences JSONB;
    v_jutsu JSONB;
    v_jutsu_idx INT := -1;
    v_slots JSONB;
    v_stars INT;
    i INT;
    v_val INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    v_jutsus := COALESCE(v_player.jutsus_learned, '[]'::jsonb);
    v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);

    -- Encontrar o jutsu no array
    FOR i IN 0 .. jsonb_array_length(v_jutsus) - 1 LOOP
        IF (v_jutsus->i->>'id')::INT = p_jutsu_id THEN
            v_jutsu := v_jutsus->i;
            v_jutsu_idx := i;
            EXIT;
        END IF;
    END LOOP;

    IF v_jutsu_idx = -1 THEN
        RETURN jsonb_build_object('error', 'Jutsu não aprendido');
    END IF;

    v_slots := COALESCE(v_jutsu->'slots', '[null, null, null]'::jsonb);
    v_stars := COALESCE((v_jutsu->>'stars')::INT, 1);

    IF p_action = 'equip' THEN
        v_val := COALESCE((v_essences->>p_essence_key)::INT, 0);
        IF v_val <= 0 THEN
            RETURN jsonb_build_object('error', 'Você não possui essa essência');
        END IF;
        
        -- Atualiza slot e desconta essência
        v_slots := jsonb_set(v_slots, ARRAY[p_slot_idx::text], to_jsonb(p_essence_key));
        v_essences := jsonb_set(v_essences, ARRAY[p_essence_key], to_jsonb(v_val - 1));

    ELSIF p_action = 'unequip' THEN
        p_essence_key := v_slots->>p_slot_idx;
        IF p_essence_key IS NULL THEN
            RETURN jsonb_build_object('error', 'Slot já está vazio');
        END IF;

        v_val := COALESCE((v_essences->>p_essence_key)::INT, 0);
        
        -- Limpa slot e devolve essência
        v_slots := jsonb_set(v_slots, ARRAY[p_slot_idx::text], 'null'::jsonb);
        v_essences := jsonb_set(v_essences, ARRAY[p_essence_key], to_jsonb(v_val + 1));

    ELSIF p_action = 'upgrade' THEN
        IF v_slots->>0 IS NULL OR v_slots->>1 IS NULL OR v_slots->>2 IS NULL THEN
            RETURN jsonb_build_object('error', 'É necessário preencher os 3 slots');
        END IF;
        
        IF v_player.ryous < p_upgrade_cost THEN
            RETURN jsonb_build_object('error', 'Ryous insuficientes para transcender');
        END IF;

        -- Subtrai dinheiro, limpa slots, upa estrela
        UPDATE players SET ryous = ryous - p_upgrade_cost WHERE id = p_player_id;
        v_slots := '[null, null, null]'::jsonb;
        v_stars := v_stars + 1;
        v_jutsu := jsonb_set(v_jutsu, '{stars}', to_jsonb(v_stars));
    ELSE
        RETURN jsonb_build_object('error', 'Ação inválida');
    END IF;

    -- Salva as mudanças de volta no objeto do jutsu e no array
    v_jutsu := jsonb_set(v_jutsu, '{slots}', v_slots);
    v_jutsus := jsonb_set(v_jutsus, ARRAY[v_jutsu_idx::text], v_jutsu);

    -- Atualiza jogador
    UPDATE players SET jutsus_learned = v_jutsus, inventory_essences = v_essences WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'new_jutsu', v_jutsu, 'new_essences', v_essences);
END;
$$ LANGUAGE plpgsql;
