CREATE OR REPLACE FUNCTION public.resolver_turno_combate(p_player_id integer, p_action text, p_target_type text, p_npc_stats jsonb, p_global_debuffs jsonb, p_equipped_summon jsonb DEFAULT NULL::jsonb, p_active_buffs jsonb DEFAULT NULL::jsonb, p_portao_multiplier numeric DEFAULT 1.0, p_jutsu_payload jsonb DEFAULT NULL::jsonb, p_player_atk_fis integer DEFAULT 0, p_player_atk_mag integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_damage INTEGER := 0;
    v_hit BOOLEAN := true;
    v_crit BOOLEAN := false;
    v_cost INTEGER := 0;
    v_stamina_cost INTEGER := 15;
    v_npc_def INTEGER;
    v_cat TEXT;
    v_jutsu_base_dmg INTEGER;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.players AS owner_player
        WHERE owner_player.id = p_player_id
          AND owner_player.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;
    -- 1. Extrai a defesa do NPC que veio da engine
    v_npc_def := COALESCE((p_npc_stats->>'def')::INTEGER, 10);

    -- 2. Dano de Ataque Básico
    IF p_action = 'basic' THEN
        v_stamina_cost := FLOOR(15 * COALESCE((p_global_debuffs->>'staminaCostMultiplier')::NUMERIC, 1.0));
        
        -- Garante 15% de dano mínimo (Penetração)
        v_damage := GREATEST(
            FLOOR(p_player_atk_fis * 0.15), 
            FLOOR((p_player_atk_fis * p_portao_multiplier) - (v_npc_def / 2))
        );
        
    -- 3. Dano de Jutsus
    ELSIF p_action = 'jutsu' THEN
        v_stamina_cost := 0;
        v_cost := COALESCE((p_jutsu_payload->>'chakraCost')::INTEGER, 20);
        v_jutsu_base_dmg := COALESCE((p_jutsu_payload->>'damage')::INTEGER, 15);
        v_cat := LOWER(COALESCE(p_jutsu_payload->>'category', 'ninjutsu'));

        IF v_cat = 'taijutsu' OR v_cat = 'bukijutsu' THEN
            -- Jutsu Físico (Puxa os 5 + Dano do Jutsu)
            v_damage := GREATEST(
                FLOOR(p_player_atk_fis * 0.15), 
                FLOOR(p_player_atk_fis * p_portao_multiplier + v_jutsu_base_dmg - (v_npc_def / 2))
            );
        ELSE
            -- Jutsu Mágico (AQUI A MÁGICA ACONTECE: Puxa os 102 + Dano do Jutsu)
            v_damage := GREATEST(
                FLOOR(p_player_atk_mag * 0.15), 
                FLOOR(p_player_atk_mag + v_jutsu_base_dmg - (v_npc_def / 2))
            );
        END IF;
    END IF;

    -- Retorna o pacote para o React
    RETURN json_build_object(
        'hit', v_hit,
        'is_crit', v_crit,
        'damage', v_damage,
        'chakra_cost', v_cost,
        'stamina_cost', v_stamina_cost,
        'paralyzed', false
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolver_turno_combate(p_player_id integer, p_action text, p_target_type text DEFAULT 'npc'::text, p_npc_stats jsonb DEFAULT '{}'::jsonb, p_global_debuffs jsonb DEFAULT '{}'::jsonb, p_equipped_summon jsonb DEFAULT NULL::jsonb, p_active_buffs jsonb DEFAULT '{}'::jsonb, p_portao_multiplier numeric DEFAULT 1.0, p_jutsu_payload jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player RECORD;
    v_hit BOOLEAN := true;
    v_is_crit BOOLEAN := false;
    v_paralyzed BOOLEAN := false;
    v_damage INTEGER := 0;
    v_stamina_cost INTEGER := 0;
    v_chakra_cost INTEGER := 0;
    
    -- Variáveis de Matemática do Combate
    v_atk NUMERIC;
    v_def NUMERIC;
    v_acc NUMERIC;
    v_crit_chance NUMERIC;
    v_base_dmg NUMERIC;
    v_selo_discount NUMERIC;
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.players AS owner_player
        WHERE owner_player.id = p_player_id
          AND owner_player.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;
    -- 1. Buscar dados oficiais e seguros do jogador
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF v_player IS NULL THEN
        RETURN jsonb_build_object('error', 'Jogador não encontrado.');
    END IF;

    -- Pega a defesa do NPC enviada ou usa 10 como padrão
    v_def := COALESCE((p_npc_stats->>'def')::NUMERIC, 10.0);

    -- ==========================================
    -- AÇÃO 1: ATAQUE BÁSICO
    -- ==========================================
    IF p_action = 'basic' THEN
        v_stamina_cost := 15;
        
        -- Cálculo de Precisão (Base 80 + bônus de Taijutsu)
        v_acc := LEAST(95.0, 80.0 + (COALESCE(v_player.tai, v_player.taijutsu, 0)::NUMERIC / 20.0));
        IF (random() * 100) > v_acc THEN
            RETURN jsonb_build_object('hit', false, 'stamina_cost', v_stamina_cost, 'damage', 0);
        END IF;

        -- Cálculo de Crítico (Base 5% + buffs + clã)
        v_crit_chance := 5.0 + COALESCE((p_active_buffs->>'letalidade')::NUMERIC, 0.0);
        IF COALESCE(v_player.clan, '') = 'Uchiha' THEN
            v_crit_chance := v_crit_chance + 15.0;
        END IF;
        
        IF (random() * 100) <= v_crit_chance THEN
            v_is_crit := true;
        END IF;

        -- FÓRMULA DE DANO CORRIGIDA:
        -- Em vez de subtrair direto, suavizamos a defesa inimiga (Defesa * 0.35)
        v_atk := COALESCE(v_player.tai, v_player.taijutsu, 15)::NUMERIC;
        v_base_dmg := (v_atk * p_portao_multiplier) - (v_def * 0.35);
        
        IF v_is_crit THEN
            v_base_dmg := v_base_dmg * 1.5;
        END IF;

        -- Garantimos que um ataque básico bem-sucedido dê pelo menos 8 de dano!
        v_damage := GREATEST(8, FLOOR(v_base_dmg)::INTEGER);

        -- Sombra Nara (Paralisia)
        IF COALESCE(v_player.clan, '') = 'Nara' AND (random() * 100) <= 10.0 THEN
            v_paralyzed := true;
        END IF;

        RETURN jsonb_build_object(
            'hit', true,
            'damage', v_damage,
            'is_crit', v_is_crit,
            'stamina_cost', v_stamina_cost,
            'paralyzed', v_paralyzed
        );

    -- ==========================================
    -- AÇÃO 2: JUTSU
    -- ==========================================
    ELSIF p_action = 'jutsu' THEN
        IF p_jutsu_payload IS NULL THEN
            RETURN jsonb_build_object('error', 'Dados do Jutsu não fornecidos.');
        END IF;

        -- Desconto de Chakra pelo atributo Selo
        v_selo_discount := LEAST(0.5, COALESCE(v_player.selos, 0)::NUMERIC * 0.01);
        v_chakra_cost := FLOOR(COALESCE((p_jutsu_payload->>'chakraCost')::NUMERIC, 20.0) * (1.0 - v_selo_discount))::INTEGER;
        v_chakra_cost := GREATEST(1, v_chakra_cost);
        
        -- Precisão do Jutsu
        v_acc := LEAST(95.0, COALESCE((p_jutsu_payload->>'accuracy')::NUMERIC, 90.0));
        IF (random() * 100) > v_acc THEN
            RETURN jsonb_build_object('hit', false, 'chakra_cost', v_chakra_cost, 'damage', 0);
        END IF;

        -- Crítico do Jutsu
        v_crit_chance := 5.0 + COALESCE((p_active_buffs->>'letalidade')::NUMERIC, 0.0);
        IF (random() * 100) <= v_crit_chance THEN
            v_is_crit := true;
        END IF;

        -- Dano Mágico (Dano Base do Jutsu + 80% do Ninjutsu - 25% da Defesa Inimiga)
        v_atk := COALESCE(v_player.nin, v_player.ninjutsu, 20)::NUMERIC;
        v_base_dmg := COALESCE((p_jutsu_payload->>'damage')::NUMERIC, 25.0) + (v_atk * 0.8) - (v_def * 0.25);

        IF v_is_crit THEN
            v_base_dmg := v_base_dmg * 1.5;
        END IF;

        -- Garantimos que um Jutsu cause pelo menos 15 de dano!
        v_damage := GREATEST(15, FLOOR(v_base_dmg)::INTEGER);

        RETURN jsonb_build_object(
            'hit', true,
            'damage', v_damage,
            'is_crit', v_is_crit,
            'chakra_cost', v_chakra_cost
        );
    ELSE
        RETURN jsonb_build_object('error', 'Ação inválida.');
    END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolver_turno_combate(integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_turno_combate(integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolver_turno_combate(integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_turno_combate(integer, text, text, jsonb, jsonb, jsonb, jsonb, numeric, jsonb, integer, integer) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';
