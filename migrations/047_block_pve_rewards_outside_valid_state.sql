-- Migration 047: prevent alternate PvE reward paths during incapacitation or active combat.
-- Fast-clear and raid stamina reservations already calculate costs and rewards server-side,
-- but both must honor the same combat-state invariants as normal PvE and world-boss RPCs.

CREATE OR REPLACE FUNCTION public.reservar_raid_stamina(
    p_player_id integer,
    p_fight_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_max_stamina integer;
    v_current_stamina integer;
    v_cost integer;
    v_remaining integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_fight_count IS NULL OR p_fight_count NOT IN (3, 5) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantidade de lutas inválida para uma incursão.');
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    IF COALESCE(v_player.is_fainted, false) OR COALESCE(v_player.hp, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você está inconsciente e não pode iniciar uma incursão.');
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
        RETURN jsonb_build_object('success', false, 'error', 'Finalize o combate atual antes de iniciar uma incursão.');
    END IF;

    v_max_stamina := public.kurokage_player_max_stat(p_player_id, 'stamina');
    v_current_stamina := LEAST(v_max_stamina, GREATEST(0, COALESCE(v_player.stamina, v_max_stamina)));
    v_cost := p_fight_count * 25;

    IF v_current_stamina < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stamina insuficiente.', 'required', v_cost, 'current', v_current_stamina);
    END IF;

    v_remaining := v_current_stamina - v_cost;
    UPDATE public.players SET stamina = v_remaining WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'stamina', v_remaining, 'cost', v_cost, 'fight_count', p_fight_count);
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolver_limpeza_rapida(
    p_player_id integer,
    p_fight_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
            WHEN 'anbu' THEN 4 WHEN 'sannin' THEN 4 WHEN 'herói' THEN 5 WHEN 'heroi' THEN 5
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
$function$;

REVOKE ALL ON FUNCTION public.reservar_raid_stamina(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reservar_raid_stamina(integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolver_limpeza_rapida(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_limpeza_rapida(integer, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
