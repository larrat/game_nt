-- Migration 061: proteger equipamentos favoritos no refino e corrigir nível das essências de ranks avançados.
-- Apenas lógica futura. Nenhuma alteração retroativa de personagens, itens, XP, preços, probabilidades ou drop rates.
-- A fonte original de cada RPC foi obtida diretamente do Supabase antes desta alteração.
-- As políticas de EXECUTE são explicitamente preservadas; finalizar_combate continua interna.

CREATE OR REPLACE FUNCTION public.aprimorar_equipamento(p_player_id bigint, p_inventory_item_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player_user_id uuid;
    v_target_item public.player_inventory%ROWTYPE;
    v_duplicate_id integer;
    v_player_ryous integer;
    v_upgrade_cost integer;
    v_new_level integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Autenticação obrigatória.');
    END IF;

    SELECT p.user_id, p.ryous INTO v_player_user_id, v_player_ryous
    FROM public.players AS p WHERE p.id = p_player_id FOR UPDATE;

    IF NOT FOUND OR v_player_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Personagem não encontrado ou ação não autorizada.');
    END IF;

    SELECT pi.* INTO v_target_item
    FROM public.player_inventory AS pi
    WHERE pi.id = p_inventory_item_id AND pi.player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado ou não pertence ao jogador.');
    END IF;

    IF COALESCE(v_target_item.upgrade_level, 0) >= 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'O item já atingiu o nível máximo de refino (+10).');
    END IF;

    SELECT pi.id INTO v_duplicate_id
    FROM public.player_inventory AS pi
    WHERE pi.player_id = p_player_id
      AND pi.item_id = v_target_item.item_id
      AND pi.id <> p_inventory_item_id
      AND COALESCE(pi.is_equipped, false) = false
      AND COALESCE(pi.is_favorite, false) = false
    ORDER BY pi.id LIMIT 1 FOR UPDATE;

    IF v_duplicate_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa de uma cópia idêntica não equipada e não favoritada para o refino.');
    END IF;

    v_upgrade_cost := 500 * (COALESCE(v_target_item.upgrade_level, 0) + 1);
    IF COALESCE(v_player_ryous, 0) < v_upgrade_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ryous insuficientes. Custo: ' || v_upgrade_cost);
    END IF;

    UPDATE public.players SET ryous = COALESCE(ryous, 0) - v_upgrade_cost WHERE id = p_player_id;
    DELETE FROM public.player_inventory WHERE id = v_duplicate_id AND player_id = p_player_id;

    v_new_level := COALESCE(v_target_item.upgrade_level, 0) + 1;
    UPDATE public.player_inventory SET upgrade_level = v_new_level
    WHERE id = p_inventory_item_id AND player_id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Equipamento aprimorado com sucesso para +' || v_new_level || '!',
        'new_level', v_new_level, 'cost', v_upgrade_cost
    );
END;
$function$
;
CREATE OR REPLACE FUNCTION public.finalizar_combate(p_player_id integer, p_enemy_id integer, p_result text, p_turn_count integer, p_combat_log jsonb, p_fallback_xp integer, p_fallback_ryous integer, p_enemy_name text, p_from_map boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_enemy public.npcs%ROWTYPE;
    v_has_enemy boolean := false;
    v_xp integer := 0;
    v_ryous integer := 0;
    v_new_xp bigint;
    v_new_level integer;
    v_levels_gained integer := 0;
    v_final_enemy_name text;
    v_coin_drop integer := 0;
    v_loot jsonb;
    v_loot_name text;
    v_loot_rarity text;
    v_essence_key text;
    v_essence_type text;
    v_essences jsonb;
    v_tier integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    IF p_result NOT IN ('win','loss') THEN RAISE EXCEPTION 'Resultado de combate inválido.'; END IF;

    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_enemy FROM public.npcs WHERE id = p_enemy_id;
    v_has_enemy := FOUND;
    v_final_enemy_name := CASE WHEN v_has_enemy THEN v_enemy.name ELSE COALESCE(NULLIF(p_enemy_name,''),'Desconhecido') END;

    -- Client fallback XP/ryous parameters are retained for RPC compatibility only.
    -- Rewards only come from trusted NPC catalog rows; unknown client-spawned foes receive no economy rewards.
    IF p_result = 'win' AND v_has_enemy THEN
        v_xp := GREATEST(0, COALESCE(v_enemy.xp_reward,0));
        v_ryous := GREATEST(0, COALESCE(v_enemy.ryou_reward,0));
        v_new_xp := COALESCE(v_player.xp,0) + v_xp;
        v_new_level := public.calcular_level_por_xp(v_new_xp);
        v_levels_gained := GREATEST(0,v_new_level-COALESCE(v_player.level,1));

        IF random() <= 0.02 THEN v_coin_drop := 1; END IF;

        IF random() <= (CASE WHEN COALESCE(p_from_map,false) THEN 0.35 ELSE 0.25 END) THEN
            v_loot := public.kurokage_roll_loot(v_player.rank);
            IF COALESCE((v_loot->>'success')::boolean,false) THEN
                INSERT INTO public.player_inventory (player_id,item_id,is_equipped,is_favorite,rarity,rolled_stats)
                VALUES (p_player_id,(v_loot->>'item_id')::integer,false,false,v_loot->>'rarity',COALESCE(v_loot->'rolled_stats','{}'::jsonb));
                v_loot_name := v_loot->>'item_name';
                v_loot_rarity := v_loot->>'rarity';
            END IF;
        END IF;

        IF random() <= (CASE WHEN COALESCE(p_from_map,false) THEN 0.30 ELSE 0.15 END) THEN
            v_tier := CASE lower(COALESCE(v_player.rank,''))
                WHEN 'chunin' THEN 2 WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
                WHEN 'anbu' THEN 4
                WHEN 'sannin' THEN 4 WHEN 'sannin lendário' THEN 4 WHEN 'sannin lendario' THEN 4
                WHEN 'herói' THEN 5 WHEN 'heroi' THEN 5
                WHEN 'herói mundial' THEN 5 WHEN 'heroi mundial' THEN 5
                ELSE 1 END;
            v_essence_type := (ARRAY['dano','custo','letalidade','protecao'])[floor(random()*4)::integer + 1];
            v_essence_key := v_essence_type || '_' || v_tier::text;
            v_essences := COALESCE(v_player.inventory_essences,'{}'::jsonb);
            v_essences := jsonb_set(v_essences,ARRAY[v_essence_key],to_jsonb(COALESCE((v_essences->>v_essence_key)::integer,0)+1),true);
        ELSE
            v_essences := COALESCE(v_player.inventory_essences,'{}'::jsonb);
        END IF;

        UPDATE public.players
        SET xp = COALESCE(xp,0) + v_xp,
            level = v_new_level,
            pontos_atributos = COALESCE(pontos_atributos,0) + v_levels_gained * 5,
            ryous = COALESCE(ryous,0) + v_ryous,
            vip_coins = COALESCE(vip_coins,0) + v_coin_drop,
            inventory_essences = v_essences,
            npc_wins = COALESCE(npc_wins,0) + 1,
            daily_npcs_defeated = COALESCE(daily_npcs_defeated,0) + 1
        WHERE id = p_player_id;
    ELSE
        v_essences := COALESCE(v_player.inventory_essences,'{}'::jsonb);
    END IF;

    INSERT INTO public.battle_logs (player_id,enemy_name,result,xp_gained,ryous_gained,turn_count,combat_log)
    VALUES (p_player_id,v_final_enemy_name,p_result,v_xp,v_ryous,GREATEST(0,COALESCE(p_turn_count,0)),COALESCE(p_combat_log,'[]'::jsonb));

    RETURN jsonb_build_object('success',true,'xp_gained',v_xp,'ryous_gained',v_ryous,
        'levels_gained',v_levels_gained,'vip_coin_dropped',v_coin_drop > 0,
        'loot_item_name',v_loot_name,'loot_rarity',v_loot_rarity,'essence_key',v_essence_key,
        'enemy_in_catalog',v_has_enemy);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.resolver_limpeza_rapida(p_player_id integer, p_fight_count integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_current_stamina integer;
    v_stamina_cost integer;
    v_wins integer := 0;
    v_losses integer := 0;
    v_xp integer := 0;
    v_ryous integer := 0;
    v_new_xp bigint;
    v_new_level integer;
    v_levels_gained integer;
    v_coin_drops integer := 0;
    v_equipment_drops integer := 0;
    v_essence_drops integer := 0;
    v_essences jsonb;
    v_loot jsonb;
    v_drop_items jsonb := '[]'::jsonb;
    v_tier integer;
    v_essence_key text;
    v_essence_type text;
    v_i integer;
    v_j integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_fight_count IS NULL OR p_fight_count < 1 OR p_fight_count > 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantidade de lutas inválida (1 a 10).');
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF COALESCE(v_player.is_fainted, false) OR COALESCE(v_player.hp, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você está inconsciente e não pode realizar uma limpeza rápida.');
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.player_combat_sessions
        WHERE player_id = p_player_id
          AND status IN ('active', 'defeated', 'player_defeated')
          AND expires_at > now()
    ) OR EXISTS (
        SELECT 1
        FROM public.world_boss_sessions
        WHERE player_id = p_player_id
          AND is_active IS TRUE
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Encerre o combate atual antes de realizar uma limpeza rápida.');
    END IF;

    v_stamina_cost := p_fight_count * 25;
    v_current_stamina := COALESCE(
        v_player.stamina,
        100 + COALESCE(v_player.level, 1) * 20 + COALESCE(v_player.energia, 0) * 5
        + COALESCE(v_player.taijutsu, 0) * 5 + COALESCE(v_player.bukijutsu, 0) * 5
        + CASE
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%genin%' THEN 150
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%chunin%' THEN 300
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%jounin%'
              OR lower(COALESCE(v_player.rank, '')) LIKE '%jonin%' THEN 500
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%anbu%' THEN 800
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%sannin%' THEN 1200
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%heroi%'
              OR lower(COALESCE(v_player.rank, '')) LIKE '%herói%' THEN 2000
            ELSE 0
          END
    );

    IF v_current_stamina < v_stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'error', format('Stamina insuficiente: requer %s.', v_stamina_cost));
    END IF;

    FOR v_i IN 1..p_fight_count LOOP
        IF random() <= 0.85 THEN
            v_wins := v_wins + 1;
            v_xp := v_xp + floor(COALESCE(v_player.level, 1) * 40 + 150)::integer;
            v_ryous := v_ryous + floor(COALESCE(v_player.level, 1) * 25 + 80)::integer;
        ELSE
            v_losses := v_losses + 1;
        END IF;
    END LOOP;

    IF v_wins > 0 THEN
        v_xp := floor(v_xp * (0.9 + random() * 0.2))::integer;
        v_ryous := floor(v_ryous * (0.9 + random() * 0.2))::integer;

        v_tier := CASE lower(COALESCE(v_player.rank, ''))
            WHEN 'chunin' THEN 2 WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
            WHEN 'anbu' THEN 4
            WHEN 'sannin' THEN 4 WHEN 'sannin lendário' THEN 4 WHEN 'sannin lendario' THEN 4
            WHEN 'herói' THEN 5 WHEN 'heroi' THEN 5
            WHEN 'herói mundial' THEN 5 WHEN 'heroi mundial' THEN 5
            ELSE 1
        END;
        v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);

        FOR v_j IN 1..v_wins LOOP
            IF random() <= 0.02 THEN
                v_coin_drops := v_coin_drops + 1;
            END IF;

            IF random() <= 0.25 THEN
                v_loot := public.kurokage_roll_loot(v_player.rank);
                IF COALESCE((v_loot->>'success')::boolean, false) THEN
                    INSERT INTO public.player_inventory (
                        player_id, item_id, is_equipped, is_favorite, rarity, rolled_stats
                    )
                    VALUES (
                        p_player_id,
                        (v_loot->>'item_id')::integer,
                        false,
                        false,
                        v_loot->>'rarity',
                        COALESCE(v_loot->'rolled_stats', '{}'::jsonb)
                    );
                    v_equipment_drops := v_equipment_drops + 1;
                    v_drop_items := v_drop_items || jsonb_build_array(
                        jsonb_build_object('name', v_loot->>'item_name', 'rarity', v_loot->>'rarity')
                    );
                END IF;
            END IF;

            IF random() <= 0.15 THEN
                v_essence_type := (ARRAY['dano', 'custo', 'letalidade', 'protecao'])[floor(random() * 4)::integer + 1];
                v_essence_key := v_essence_type || '_' || v_tier::text;
                v_essences := jsonb_set(
                    v_essences,
                    ARRAY[v_essence_key],
                    to_jsonb(COALESCE((v_essences->>v_essence_key)::integer, 0) + 1),
                    true
                );
                v_essence_drops := v_essence_drops + 1;
            END IF;
        END LOOP;
    ELSE
        v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);
    END IF;

    v_new_xp := COALESCE(v_player.xp, 0) + v_xp;
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));

    UPDATE public.players
    SET stamina = v_current_stamina - v_stamina_cost,
        xp = v_new_xp,
        level = v_new_level,
        pontos_atributos = COALESCE(pontos_atributos, 0) + v_levels_gained * 3,
        ryous = COALESCE(ryous, 0) + v_ryous,
        vip_coins = COALESCE(vip_coins, 0) + v_coin_drops,
        inventory_essences = v_essences,
        wins_dojo = COALESCE(wins_dojo, 0) + v_wins,
        dojo_clears = COALESCE(dojo_clears, 0) + v_wins
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'wins', v_wins,
        'losses', v_losses,
        'xp_gained', v_xp,
        'ryous_gained', v_ryous,
        'levels_gained', v_levels_gained,
        'kuro_coins_dropped', v_coin_drops,
        'equipment_drops', v_equipment_drops,
        'essence_drops', v_essence_drops,
        'dropped_items', v_drop_items,
        'stamina_remaining', v_current_stamina - v_stamina_cost
    );
END;
$function$
;

-- Refino e limpeza rápida: somente jogadores autenticados.
REVOKE ALL ON FUNCTION public.aprimorar_equipamento(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprimorar_equipamento(bigint, bigint) TO authenticated;
REVOKE ALL ON FUNCTION public.resolver_limpeza_rapida(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_limpeza_rapida(integer, integer) TO authenticated;

-- Liquidação interna: não expor esta função diretamente aos jogadores.
REVOKE ALL ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb, integer, integer, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_combate(integer, integer, text, integer, jsonb, integer, integer, text, boolean) TO service_role;
NOTIFY pgrst, 'reload schema';
