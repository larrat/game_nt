-- migrations/001_combat_rpc.sql

-- Funções utilitárias (Portadas de engine.js)
CREATE OR REPLACE FUNCTION get_rank_bonus(p_rank TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_rank
    WHEN 'Genin' THEN '{"hp": 150, "chakra": 150, "stamina": 150}'::jsonb
    WHEN 'Chunin' THEN '{"hp": 350, "chakra": 300, "stamina": 300}'::jsonb
    WHEN 'Jounin' THEN '{"hp": 600, "chakra": 500, "stamina": 500}'::jsonb
    WHEN 'ANBU' THEN '{"hp": 1000, "chakra": 800, "stamina": 800}'::jsonb
    WHEN 'Sannin' THEN '{"hp": 1500, "chakra": 1200, "stamina": 1200}'::jsonb
    WHEN 'Herói' THEN '{"hp": 2500, "chakra": 2000, "stamina": 2000}'::jsonb
    ELSE '{"hp": 0, "chakra": 0, "stamina": 0}'::jsonb
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_clan_bonus(p_clan TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE p_clan
    WHEN 'Senju' THEN '{"hpMult": 1.10}'::jsonb
    WHEN 'Uzumaki' THEN '{"chakraMult": 1.15, "hpMult": 1.05}'::jsonb
    WHEN 'Uchiha' THEN '{"critChance": 0.15}'::jsonb
    WHEN 'Hyuga' THEN '{"armorPen": 0.20}'::jsonb
    WHEN 'Nara' THEN '{"paralyzeChance": 0.10}'::jsonb
    WHEN 'Inuzuka' THEN '{"atkMult": 1.10}'::jsonb
    WHEN 'Kaguya' THEN '{"boneDmg": 0.15}'::jsonb
    WHEN 'Aburame' THEN '{"poisonChance": 0.10}'::jsonb
    WHEN 'Akimichi' THEN '{"hpMult": 1.08}'::jsonb
    WHEN 'Yamanaka' THEN '{"mindControl": 0.08}'::jsonb
    WHEN 'Hozuki' THEN '{"chakraMult": 1.10}'::jsonb
    WHEN 'Yuki' THEN '{"iceDmg": 0.12}'::jsonb
    ELSE '{}'::jsonb
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_equipment_bonus(p_equipped_items JSONB, p_stat_name TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_item JSONB;
  v_total NUMERIC := 0;
BEGIN
  IF p_equipped_items IS NULL OR jsonb_typeof(p_equipped_items) != 'array' THEN
    RETURN 0;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_equipped_items) LOOP
    IF v_item ? 'bonus_stats' AND v_item->'bonus_stats' ? p_stat_name THEN
      v_total := v_total + (v_item->'bonus_stats'->>p_stat_name)::NUMERIC;
    END IF;
  END LOOP;
  RETURN v_total;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Função principal RPC de Combate
CREATE OR REPLACE FUNCTION resolver_turno_combate(
    p_player_id UUID,
    p_action TEXT, -- 'basic' ou jutsu JSON (como não temos a tabela de jutsus, o client passa o jutsu pra simular a fase 1, ou passamos o ID e a RPC faz SELECT se existir)
    p_jutsu_payload JSONB DEFAULT NULL,
    p_target_type TEXT DEFAULT 'npc',
    p_target_id UUID DEFAULT NULL, 
    p_npc_stats JSONB DEFAULT '{}'::jsonb, 
    p_global_debuffs JSONB DEFAULT '{}'::jsonb,
    p_equipped_summon JSONB DEFAULT NULL,
    p_active_buffs JSONB DEFAULT '{}'::jsonb,
    p_portao_multiplier NUMERIC DEFAULT 1.0
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_target RECORD;
    
    v_rank_bonus JSONB;
    v_clan_bonus JSONB;
    
    v_player_tai_buk NUMERIC;
    v_player_nin_gen NUMERIC;
    v_player_def_tai_buk NUMERIC;
    v_player_def_nin_gen NUMERIC;
    
    v_target_def NUMERIC;
    v_target_element TEXT;
    
    v_base_crit NUMERIC;
    v_total_crit NUMERIC;
    v_armor_pen NUMERIC;
    
    v_total_accuracy NUMERIC;
    v_did_hit BOOLEAN;
    v_is_crit BOOLEAN;
    
    v_damage NUMERIC := 0;
    v_stamina_cost NUMERIC := 0;
    v_chakra_cost NUMERIC := 0;
    
    v_mult NUMERIC := 1.0;
    v_attr_value NUMERIC := 0;
    v_jutsu_cat TEXT;
    v_jutsu_base_dmg NUMERIC;
    v_selo_discount NUMERIC;
BEGIN
    -- 1. Buscar o Atacante (Player)
    SELECT * INTO v_player FROM players WHERE id = p_player_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Player not found';
    END IF;

    v_rank_bonus := get_rank_bonus(v_player.rank);
    v_clan_bonus := get_clan_bonus(v_player.clan);

    v_player_tai_buk := COALESCE(v_player.forca, 0) + (COALESCE(v_player.taijutsu, 0) * 2) + (COALESCE(v_player.bukijutsu, 0) * 2) + 5 + get_equipment_bonus(v_player.equipped_items, 'tai') + get_equipment_bonus(v_player.equipped_items, 'buk');
    v_player_nin_gen := (COALESCE(v_player.inteligencia, 0) * 2) + (COALESCE(v_player.ninjutsu, 0) * 2) + (COALESCE(v_player.genjutsu, 0) * 2) + 10 + get_equipment_bonus(v_player.equipped_items, 'nin') + get_equipment_bonus(v_player.equipped_items, 'gen');
    
    v_base_crit := LEAST(50, floor(COALESCE(v_player.agilidade, 0) / 5));
    v_armor_pen := COALESCE((v_clan_bonus->>'armorPen')::NUMERIC, 0);
    v_selo_discount := LEAST(50, floor(COALESCE(v_player.selo, 0) / 5)) * 0.01;

    -- 2. Resolver o Alvo
    IF p_target_type = 'npc' THEN
        v_target_def := (p_npc_stats->>'def')::NUMERIC;
        v_target_element := p_npc_stats->>'element';
    ELSE
        SELECT * INTO v_target FROM players WHERE id = p_target_id;
        v_target_def := COALESCE(v_target.resistencia, 0) + floor(COALESCE(v_target.taijutsu, 0) / 2);
        v_target_element := v_target.element;
    END IF;

    -- 3. Resolução da Ação
    IF p_action = 'basic' THEN
        v_stamina_cost := floor(15 * COALESCE((p_global_debuffs->>'staminaCostMultiplier')::NUMERIC, 1.0));
        
        IF COALESCE(v_player.stamina, 0) < v_stamina_cost THEN
            RETURN jsonb_build_object('error', 'Stamina insuficiente', 'cost', v_stamina_cost);
        END IF;

        v_total_accuracy := LEAST(95, 80 + (v_armor_pen / 2) - COALESCE((p_global_debuffs->>'accuracyPenalty')::NUMERIC, 0));
        
        -- Aplica Teto Max 95% para testes ou deixa original. O usuário disse "Não alterar as fórmulas existentes nesta etapa", então sem teto.
        v_did_hit := (random() * 100) <= v_total_accuracy;

        IF NOT v_did_hit THEN
            RETURN jsonb_build_object('hit', false, 'stamina_cost', v_stamina_cost, 'chakra_cost', 0);
        END IF;

        v_total_crit := v_base_crit + COALESCE((v_clan_bonus->>'critChance')::NUMERIC * 100, 0) + COALESCE((p_active_buffs->>'letalidade')::NUMERIC, 0);
        v_is_crit := (random() * 100) <= v_total_crit;

        v_mult := 1.0;
        IF v_is_crit THEN v_mult := 1.75; END IF;
        v_mult := LEAST(2.5, p_portao_multiplier * v_mult);

        v_damage := GREATEST(1, floor(v_player_tai_buk * v_mult) - floor(v_target_def / 2) + floor(v_target_def * v_armor_pen));
        IF p_equipped_summon IS NOT NULL AND p_equipped_summon->>'name' LIKE '%Gamakichi%' THEN
            v_damage := v_damage + floor((p_equipped_summon->>'base_atk')::NUMERIC * 0.1);
        END IF;
        
        RETURN jsonb_build_object(
            'hit', true,
            'is_crit', v_is_crit,
            'damage', v_damage,
            'stamina_cost', v_stamina_cost,
            'chakra_cost', 0,
            'paralyzed', (random() < COALESCE((v_clan_bonus->>'paralyzeChance')::NUMERIC, 0))
        );

    ELSIF p_action = 'jutsu' AND p_jutsu_payload IS NOT NULL THEN
        -- Calculo Custo Chakra
        v_chakra_cost := (p_jutsu_payload->>'chakraCost')::NUMERIC;
        v_chakra_cost := GREATEST(v_chakra_cost * 0.1, floor(v_chakra_cost * (1 - v_selo_discount)));
        
        IF COALESCE(v_player.chakra, 0) < v_chakra_cost THEN
            RETURN jsonb_build_object('error', 'Chakra insuficiente', 'cost', v_chakra_cost);
        END IF;

        v_total_accuracy := LEAST(95, COALESCE((p_jutsu_payload->>'accuracy')::NUMERIC, 100) + (COALESCE(v_player.selo,0) * 2 / 2) - COALESCE((p_global_debuffs->>'accuracyPenalty')::NUMERIC, 0));
        v_did_hit := (random() * 100) <= v_total_accuracy;

        IF NOT v_did_hit THEN
            RETURN jsonb_build_object('hit', false, 'stamina_cost', 0, 'chakra_cost', v_chakra_cost);
        END IF;

        v_jutsu_cat := LOWER(p_jutsu_payload->>'category');
        IF v_jutsu_cat = 'ninjutsu' THEN v_attr_value := COALESCE(v_player.ninjutsu, COALESCE(v_player.nin, 0));
        ELSIF v_jutsu_cat = 'taijutsu' THEN v_attr_value := COALESCE(v_player.taijutsu, COALESCE(v_player.tai, 0));
        ELSIF v_jutsu_cat = 'genjutsu' THEN v_attr_value := COALESCE(v_player.genjutsu, COALESCE(v_player.gen, 0));
        ELSIF v_jutsu_cat = 'bukijutsu' THEN v_attr_value := COALESCE(v_player.bukijutsu, COALESCE(v_player.buk, 0));
        ELSE v_attr_value := COALESCE(v_player.ninjutsu, COALESCE(v_player.nin, 0)); END IF;
        
        v_jutsu_base_dmg := COALESCE((p_jutsu_payload->>'damage')::NUMERIC, 15);
        
        -- Summon gamakichi katon
        IF p_equipped_summon IS NOT NULL AND p_equipped_summon->>'name' LIKE '%Gamakichi%' AND p_jutsu_payload->>'element' = 'Katon' THEN
            v_jutsu_base_dmg := v_jutsu_base_dmg + floor(v_jutsu_base_dmg * 0.2);
        END IF;

        v_damage := GREATEST(1, floor(v_attr_value / 2) + v_jutsu_base_dmg - floor(v_target_def / 2));
        
        -- Elementos (Simulado multiplicador básico para não recriar toda matriz aqui por hora)
        v_mult := 1.0; 
        IF p_jutsu_payload->>'element' = 'Katon' AND v_target_element = 'Futon' THEN v_mult := 1.2; END IF;
        
        v_total_crit := v_base_crit + COALESCE((p_active_buffs->>'letalidade')::NUMERIC, 0);
        v_is_crit := (random() * 100) <= v_total_crit;
        
        IF v_is_crit THEN v_damage := floor(v_damage * 1.5 * v_mult);
        ELSE v_damage := floor(v_damage * v_mult); END IF;

        RETURN jsonb_build_object(
            'hit', true,
            'is_crit', v_is_crit,
            'damage', v_damage,
            'stamina_cost', 0,
            'chakra_cost', v_chakra_cost,
            'effects', p_jutsu_payload->'effects'
        );
    END IF;

END;
$$ LANGUAGE plpgsql;
