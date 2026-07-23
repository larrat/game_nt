-- Migração 016: Security RPCs para client-side exploits
-- Estas funções executam as validações do lado do servidor (banco) para impedir trapaças via DevTools.

-- =========================================================================
-- 1. VIAJAR MAPA
-- =========================================================================
CREATE OR REPLACE FUNCTION viajar_mapa(p_player_id int, p_target_village int, p_cost int)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_ryous int;
BEGIN
    SELECT user_id, ryous INTO v_user_id, v_ryous FROM players WHERE id = p_player_id;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF v_ryous < p_cost THEN
        RAISE EXCEPTION 'Ryous insuficientes para viajar.';
    END IF;

    UPDATE players
    SET ryous = ryous - p_cost,
        vila_atual_id = p_target_village
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 2. APRENDER JUTSU ÚNICO
-- =========================================================================
CREATE OR REPLACE FUNCTION aprender_jutsu(p_player_id int, p_jutsu_id int, p_cost int)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_ryous int;
    v_jutsus jsonb;
    v_new_jutsu jsonb;
BEGIN
    SELECT user_id, ryous, jutsus_learned INTO v_user_id, v_ryous, v_jutsus FROM players WHERE id = p_player_id;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF v_ryous < p_cost THEN
        RAISE EXCEPTION 'Ryous insuficientes para aprender o jutsu.';
    END IF;

    -- Constrói o objeto do jutsu
    v_new_jutsu := jsonb_build_object('id', p_jutsu_id, 'level', 1, 'slots', jsonb_build_array(null, null, null));

    -- Garante que o jutsus_learned é um array e não nulo
    IF v_jutsus IS NULL THEN
        v_jutsus := '[]'::jsonb;
    END IF;

    UPDATE players
    SET ryous = ryous - p_cost,
        jutsus_learned = v_jutsus || v_new_jutsu
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 3. APRENDER JUTSUS EM MASSA (VIP)
-- =========================================================================
CREATE OR REPLACE FUNCTION aprender_jutsus_massa(p_player_id int, p_jutsus jsonb, p_total_cost int)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_ryous int;
    v_current_jutsus jsonb;
    v_is_vip boolean;
BEGIN
    SELECT user_id, ryous, jutsus_learned, is_vip INTO v_user_id, v_ryous, v_current_jutsus, v_is_vip 
    FROM players WHERE id = p_player_id;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF NOT v_is_vip THEN
        RAISE EXCEPTION 'Apenas jogadores VIP podem aprender em massa.';
    END IF;

    IF v_ryous < p_total_cost THEN
        RAISE EXCEPTION 'Ryous insuficientes para aprender todos os jutsus.';
    END IF;

    IF v_current_jutsus IS NULL THEN
        v_current_jutsus := '[]'::jsonb;
    END IF;

    UPDATE players
    SET ryous = ryous - p_total_cost,
        jutsus_learned = v_current_jutsus || p_jutsus
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 4. VIP RESET TALENTO
-- =========================================================================
CREATE OR REPLACE FUNCTION vip_reset_talento(p_player_id int, p_stat_name text)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_vip_coins int;
    v_stat_value int;
BEGIN
    -- Validar stat name para prevenir SQL injection na atualização dinâmica
    IF p_stat_name NOT IN ('ninjutsu', 'taijutsu', 'genjutsu', 'bukijutsu', 'forca', 'agilidade', 'resistencia', 'energia', 'selo', 'inteligencia') THEN
        RAISE EXCEPTION 'Atributo inválido.';
    END IF;

    EXECUTE format('SELECT user_id, vip_coins, %I FROM players WHERE id = $1', p_stat_name)
    INTO v_user_id, v_vip_coins, v_stat_value
    USING p_player_id;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF v_vip_coins < 1 THEN
        RAISE EXCEPTION 'Créditos VIP insuficientes.';
    END IF;

    IF v_stat_value <= 0 THEN
        RAISE EXCEPTION 'O atributo já está zerado.';
    END IF;

    EXECUTE format('
        UPDATE players
        SET vip_coins = COALESCE(vip_coins, 0) - 1,
            total_vip_spent = COALESCE(total_vip_spent, 0) + 1,
            pontos_atributos = COALESCE(pontos_atributos, 0) + 1,
            %I = %I - 1
        WHERE id = $1
    ', p_stat_name, p_stat_name)
    USING p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================================
-- 5. VIP RESET PERSONAGEM
-- =========================================================================
CREATE OR REPLACE FUNCTION vip_reset_personagem(p_player_id int)
RETURNS void AS $$
DECLARE
    v_user_id uuid;
    v_vip_coins int;
BEGIN
    SELECT user_id, vip_coins INTO v_user_id, v_vip_coins FROM players WHERE id = p_player_id;
    
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF v_vip_coins < 2 THEN
        RAISE EXCEPTION 'Créditos VIP insuficientes (Requer 2).';
    END IF;

    UPDATE players
    SET vip_coins = COALESCE(vip_coins, 0) - 2,
        total_vip_spent = COALESCE(total_vip_spent, 0) + 2,
        level = 1,
        xp = 0,
        ryous = 1000,
        pontos_atributos = 0
    WHERE id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
