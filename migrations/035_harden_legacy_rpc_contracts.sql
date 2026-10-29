-- Migration 035: harden legacy client-callable RPCs and restore server-side travel.
-- Keep RPC signatures stable for the current frontend, but never trust client-supplied
-- prices, upgrade costs, recovery caps, or player ownership.

CREATE OR REPLACE FUNCTION public.hospital_alta(
    p_player_id integer,
    p_paid boolean,
    p_max_hp integer,
    p_max_cp integer,
    p_global_hospital_cost_mult numeric DEFAULT 1.0
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_cure_cost integer;
    v_target_time timestamptz;
    v_multiplier numeric := 1.0;
    v_boss_hp integer;
    v_boss_max_hp integer;
    v_equipment_hp numeric := 0;
    v_equipment_chakra numeric := 0;
    v_rank_hp integer := 0;
    v_rank_chakra integer := 0;
    v_max_hp integer;
    v_max_chakra integer;
    v_level integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    IF COALESCE(v_player.is_fainted, false) IS NOT TRUE THEN
        RETURN jsonb_build_object('error', 'Player is not fainted');
    END IF;

    SELECT e.boss_hp, e.boss_max_hp
    INTO v_boss_hp, v_boss_max_hp
    FROM public.global_events AS e
    WHERE e.is_active IS TRUE AND e.is_world_boss IS TRUE
    ORDER BY e.created_at DESC
    LIMIT 1;

    IF v_boss_max_hp > 0
       AND (v_boss_hp::numeric / v_boss_max_hp::numeric) <= 0.5 THEN
        v_multiplier := 2.0;
    END IF;

    v_level := GREATEST(1, COALESCE(v_player.level, 1));
    v_cure_cost := GREATEST(50, v_level * 50) * v_multiplier;

    IF COALESCE(p_paid, false) THEN
        IF COALESCE(v_player.ryous, 0) < v_cure_cost THEN
            RETURN jsonb_build_object('error', 'Ryous insuficientes', 'cost', v_cure_cost);
        END IF;
    ELSE
        IF v_player.fainted_at IS NULL THEN
            RETURN jsonb_build_object('error', 'Timestamp de desmaio não encontrado');
        END IF;

        v_target_time := v_player.fainted_at + interval '5 minutes';
        IF now() < v_target_time THEN
            RETURN jsonb_build_object(
                'error', 'Ainda em recuperação',
                'remaining_seconds', EXTRACT(EPOCH FROM (v_target_time - now()))
            );
        END IF;
    END IF;

    -- Equipment bonuses are derived from database-owned inventory, never the browser's
    -- p_max_hp/p_max_cp values. Unknown/non-numeric stat values safely contribute zero.
    SELECT
        COALESCE(SUM(
            CASE WHEN lower(s.key) = 'hp'
                   AND regexp_replace(s.value, '[^0-9.-]', '', 'g') ~ '^-?[0-9]+([.][0-9]+)?$'
                 THEN FLOOR(regexp_replace(s.value, '[^0-9.-]', '', 'g')::numeric
                      * (1 + GREATEST(0, COALESCE(pi.upgrade_level, 0)) * 0.2))
                 ELSE 0 END
        ), 0),
        COALESCE(SUM(
            CASE WHEN lower(s.key) = 'chakra'
                   AND regexp_replace(s.value, '[^0-9.-]', '', 'g') ~ '^-?[0-9]+([.][0-9]+)?$'
                 THEN FLOOR(regexp_replace(s.value, '[^0-9.-]', '', 'g')::numeric
                      * (1 + GREATEST(0, COALESCE(pi.upgrade_level, 0)) * 0.2))
                 ELSE 0 END
        ), 0)
    INTO v_equipment_hp, v_equipment_chakra
    FROM public.player_inventory AS pi
    JOIN public.items AS it ON it.id = pi.item_id
    CROSS JOIN LATERAL (
        SELECT CASE
          WHEN jsonb_typeof(pi.rolled_stats) = 'object' AND pi.rolled_stats <> '{}'::jsonb
            THEN pi.rolled_stats
          WHEN jsonb_typeof(it.bonus_stats) = 'object'
            THEN it.bonus_stats
          ELSE '{}'::jsonb
        END AS stats
    ) AS equipment_stats
    CROSS JOIN LATERAL jsonb_each_text(equipment_stats.stats) AS s(key, value)
    WHERE pi.player_id = p_player_id AND pi.is_equipped IS TRUE;

    v_rank_hp := CASE lower(COALESCE(v_player.rank, ''))
        WHEN 'genin' THEN 150 WHEN 'chunin' THEN 350 WHEN 'jounin' THEN 600
        WHEN 'jonin' THEN 600 WHEN 'anbu' THEN 1000 WHEN 'sannin' THEN 1500
        WHEN 'herói' THEN 2500 WHEN 'heroi' THEN 2500 ELSE 0 END;
    v_rank_chakra := CASE lower(COALESCE(v_player.rank, ''))
        WHEN 'genin' THEN 150 WHEN 'chunin' THEN 300 WHEN 'jounin' THEN 500
        WHEN 'jonin' THEN 500 WHEN 'anbu' THEN 800 WHEN 'sannin' THEN 1200
        WHEN 'herói' THEN 2000 WHEN 'heroi' THEN 2000 ELSE 0 END;

    v_max_hp := GREATEST(1, FLOOR(
        (100 + v_level * 30
          + COALESCE(v_player.resistencia, 0) * 15
          + COALESCE(v_player.energia, 0) * 20
          + COALESCE(v_player.forca, 0) * 5
          + v_rank_hp + v_equipment_hp)
        * CASE lower(COALESCE(v_player.clan, ''))
            WHEN 'senju' THEN 1.10 WHEN 'uzumaki' THEN 1.05
            WHEN 'akimichi' THEN 1.08 ELSE 1.00 END
    )::integer);
    v_max_chakra := GREATEST(1, FLOOR(
        (100 + v_level * 20
          + COALESCE(v_player.energia, 0) * 5
          + COALESCE(v_player.ninjutsu, COALESCE(v_player.nin, 0)) * 5
          + COALESCE(v_player.genjutsu, COALESCE(v_player.gen, 0)) * 5
          + v_rank_chakra + v_equipment_chakra)
        * CASE lower(COALESCE(v_player.clan, ''))
            WHEN 'uzumaki' THEN 1.15 ELSE 1.00 END
    )::integer);

    UPDATE public.players
    SET is_fainted = false,
        fainted_at = NULL,
        hp = v_max_hp,
        chakra = v_max_chakra,
        ryous = CASE WHEN COALESCE(p_paid, false)
                     THEN COALESCE(ryous, 0) - v_cure_cost
                     ELSE COALESCE(ryous, 0) END
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'paid', COALESCE(p_paid, false),
        'cost', CASE WHEN COALESCE(p_paid, false) THEN v_cure_cost ELSE 0 END,
        'max_hp', v_max_hp,
        'max_chakra', v_max_chakra
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.modificar_jutsu_slots(
    p_player_id integer,
    p_jutsu_id integer,
    p_action text,
    p_slot_idx integer,
    p_essence_key text,
    p_upgrade_cost integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_jutsus jsonb;
    v_essences jsonb;
    v_jutsu jsonb;
    v_raw_slots jsonb;
    v_slots jsonb;
    v_jutsu_idx integer := -1;
    v_stars integer := 1;
    v_stars_text text;
    v_val integer;
    v_val_text text;
    v_cost integer := 0;
    v_current_essence text;
    i integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    IF p_action NOT IN ('equip', 'unequip', 'upgrade') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ação inválida.');
    END IF;

    IF p_action IN ('equip', 'unequip') AND (p_slot_idx IS NULL OR p_slot_idx < 0 OR p_slot_idx > 2) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Slot inválido.');
    END IF;

    v_jutsus := COALESCE(v_player.jutsus_learned, '[]'::jsonb);
    v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);

    IF jsonb_typeof(v_jutsus) <> 'array' OR jsonb_typeof(v_essences) <> 'object' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inventário de jutsus inválido.');
    END IF;

    IF jsonb_array_length(v_jutsus) > 0 THEN
        FOR i IN 0..(jsonb_array_length(v_jutsus) - 1) LOOP
            IF COALESCE(v_jutsus->i->>'id', '') = p_jutsu_id::text THEN
                v_jutsu := v_jutsus->i;
                v_jutsu_idx := i;
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF v_jutsu_idx = -1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Jutsu não aprendido.');
    END IF;

    v_stars_text := v_jutsu->>'stars';
    IF v_stars_text IS NOT NULL AND v_stars_text !~ '^[0-9]{1,2}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nível de jutsu inválido.');
    END IF;
    v_stars := GREATEST(1, COALESCE(v_stars_text::integer, 1));

    v_raw_slots := v_jutsu->'slots';
    v_slots := jsonb_build_array(
        CASE WHEN jsonb_typeof(v_raw_slots) = 'array' THEN COALESCE(v_raw_slots->0, 'null'::jsonb) ELSE 'null'::jsonb END,
        CASE WHEN jsonb_typeof(v_raw_slots) = 'array' THEN COALESCE(v_raw_slots->1, 'null'::jsonb) ELSE 'null'::jsonb END,
        CASE WHEN jsonb_typeof(v_raw_slots) = 'array' THEN COALESCE(v_raw_slots->2, 'null'::jsonb) ELSE 'null'::jsonb END
    );

    IF p_action = 'equip' THEN
        IF p_essence_key IS NULL OR length(p_essence_key) > 80 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Essência inválida.');
        END IF;
        IF v_slots->p_slot_idx <> 'null'::jsonb THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este slot já está ocupado.');
        END IF;

        v_val_text := v_essences->>p_essence_key;
        IF v_val_text IS NULL OR v_val_text !~ '^[0-9]{1,9}$' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Essência não encontrada no inventário.');
        END IF;
        v_val := v_val_text::integer;
        IF v_val <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Você não possui essa essência.');
        END IF;

        v_slots := jsonb_set(v_slots, ARRAY[p_slot_idx::text], to_jsonb(p_essence_key), true);
        v_essences := jsonb_set(v_essences, ARRAY[p_essence_key], to_jsonb(v_val - 1), true);

    ELSIF p_action = 'unequip' THEN
        v_current_essence := v_slots->>p_slot_idx;
        IF v_current_essence IS NULL OR length(v_current_essence) > 80 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Slot já está vazio.');
        END IF;

        v_val_text := v_essences->>v_current_essence;
        IF v_val_text IS NOT NULL AND v_val_text !~ '^[0-9]{1,9}$' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Inventário de essências inválido.');
        END IF;
        v_val := COALESCE(v_val_text::integer, 0);

        v_slots := jsonb_set(v_slots, ARRAY[p_slot_idx::text], 'null'::jsonb, true);
        v_essences := jsonb_set(v_essences, ARRAY[v_current_essence], to_jsonb(v_val + 1), true);

    ELSIF p_action = 'upgrade' THEN
        IF v_stars >= 5 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este jutsu já alcançou o nível máximo.');
        END IF;
        IF v_slots->0 = 'null'::jsonb OR v_slots->1 = 'null'::jsonb OR v_slots->2 = 'null'::jsonb THEN
            RETURN jsonb_build_object('success', false, 'error', 'É necessário preencher os 3 slots.');
        END IF;

        -- Server formula: 500 ryous per current star. p_upgrade_cost is ignored.
        v_cost := 500 * v_stars;
        IF COALESCE(v_player.ryous, 0) < v_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Ryous insuficientes para transcender.', 'cost', v_cost);
        END IF;

        v_slots := '[null, null, null]'::jsonb;
        v_jutsu := jsonb_set(v_jutsu, '{stars}', to_jsonb(v_stars + 1), true);
    END IF;

    v_jutsu := jsonb_set(v_jutsu, '{slots}', v_slots, true);
    v_jutsus := jsonb_set(v_jutsus, ARRAY[v_jutsu_idx::text], v_jutsu, true);

    UPDATE public.players
    SET ryous = COALESCE(ryous, 0) - v_cost,
        jutsus_learned = v_jutsus,
        inventory_essences = v_essences
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_jutsu', v_jutsu,
        'new_essences', v_essences,
        'cost', v_cost
    );
END;
$function$;


-- The legacy summon RPC is only permission-hardened below. Its catalogue tables are absent in this live schema,
-- so replacing it here would create a misleading function that cannot work; the feature needs a separate schema repair.

CREATE OR REPLACE FUNCTION public.viajar_mapa(
    p_player_id integer,
    p_target_village integer,
    p_cost integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_current_village integer;
    v_cost integer := 100;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.villages v WHERE v.id = p_target_village) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vila de destino inválida.');
    END IF;

    v_current_village := COALESCE(v_player.vila_atual_id, v_player.village_id);
    IF v_current_village = p_target_village THEN
        RETURN jsonb_build_object('success', true, 'cost', 0, 'village_id', p_target_village);
    END IF;

    IF COALESCE(v_player.ryous, 0) < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ryous insuficientes.', 'cost', v_cost);
    END IF;

    UPDATE public.players
    SET ryous = COALESCE(ryous, 0) - v_cost,
        vila_atual_id = p_target_village
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'cost', v_cost, 'village_id', p_target_village);
END;
$function$;


-- These are authenticated game actions, not anonymous/public endpoints.
REVOKE ALL ON FUNCTION public.hospital_alta(integer, boolean, integer, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hospital_alta(integer, boolean, integer, integer, numeric) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.modificar_jutsu_slots(integer, integer, text, integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.modificar_jutsu_slots(integer, integer, text, integer, text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.assinar_invocacao(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_invocacao(integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.viajar_mapa(integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.viajar_mapa(integer, integer, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
