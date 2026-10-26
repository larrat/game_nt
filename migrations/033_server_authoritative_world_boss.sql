-- Migration 033: server-authoritative world-boss sessions, damage, and rewards.
-- This replaces client-submitted boss HP/damage writes with an atomic RPC flow.

CREATE TABLE IF NOT EXISTS public.world_boss_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    event_id integer NOT NULL REFERENCES public.global_events(id) ON DELETE CASCADE,
    turn_count integer NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
    damage_total bigint NOT NULL DEFAULT 0 CHECK (damage_total >= 0),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz
);

ALTER TABLE public.world_boss_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.world_boss_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.world_boss_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.iniciar_world_boss(
    p_player_id integer,
    p_event_id integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_event public.global_events%ROWTYPE;
    v_today text := to_char(timezone('UTC', now()), 'YYYY-MM-DD');
    v_max_tickets integer;
    v_current_tickets integer;
    v_session_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.* INTO v_player
    FROM public.players AS p
    WHERE p.id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT e.* INTO v_event
    FROM public.global_events AS e
    WHERE e.id = p_event_id
      AND e.is_world_boss IS TRUE
      AND e.is_active IS TRUE
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_event.boss_hp, 0) <= 0 THEN
        RAISE EXCEPTION 'Este chefe mundial não está disponível.';
    END IF;

    IF v_event.ends_at IS NOT NULL AND v_event.ends_at <= now() THEN
        RAISE EXCEPTION 'O evento do chefe mundial já terminou.';
    END IF;

    IF extract(dow FROM timezone('America/Belem', now())) IN (0, 6) THEN
        RAISE EXCEPTION 'O World Boss descansa nos finais de semana.';
    END IF;

    v_max_tickets := CASE
        WHEN v_player.rank IN ('Chunin') THEN 3
        WHEN v_player.rank IN ('Jounin', 'ANBU') THEN 4
        WHEN v_player.rank IN ('Sannin', 'Herói') THEN 5
        ELSE 2
    END;

    v_current_tickets := CASE
        WHEN v_player.last_event_date = v_today
            THEN COALESCE(v_player.event_tickets, v_max_tickets)
        ELSE v_max_tickets
    END;

    IF v_current_tickets <= 0 THEN
        RAISE EXCEPTION 'Você não tem mais entradas diárias para hoje.';
    END IF;

    INSERT INTO public.world_boss_sessions (player_id, event_id)
    VALUES (p_player_id, p_event_id)
    RETURNING id INTO v_session_id;

    UPDATE public.players
    SET last_event_date = v_today,
        event_tickets = v_current_tickets - 1
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'event_id', v_event.id,
        'event_name', v_event.name,
        'boss_hp', v_event.boss_hp,
        'boss_max_hp', v_event.boss_max_hp,
        'tickets_remaining', v_current_tickets - 1
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.atacar_world_boss(
    p_player_id integer,
    p_session_id uuid,
    p_action text,
    p_jutsu_id integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.world_boss_sessions%ROWTYPE;
    v_event public.global_events%ROWTYPE;
    v_jutsu public.jutsus%ROWTYPE;
    v_jutsu_state jsonb;
    v_slot text;
    v_slot_type text;
    v_slot_tier integer;
    v_jutsu_damage_bonus integer := 0;
    v_jutsu_cost_bonus integer := 0;
    v_rank_value integer;
    v_required_rank_value integer;
    v_primary_stat numeric := 0;
    v_actual_stat numeric;
    v_req record;
    v_stamina_equipment numeric := 0;
    v_chakra_equipment numeric := 0;
    v_tai_equipment numeric := 0;
    v_buk_equipment numeric := 0;
    v_nin_equipment numeric := 0;
    v_gen_equipment numeric := 0;
    v_stamina_now integer;
    v_chakra_now integer;
    v_stamina_cost integer := 0;
    v_chakra_cost integer := 0;
    v_stamina_max integer;
    v_chakra_max integer;
    v_physical_attack numeric;
    v_jutsu_attr numeric := 0;
    v_damage integer := 0;
    v_actual_damage integer := 0;
    v_hit boolean := true;
    v_is_dead boolean := false;
    v_total_event_damage bigint := 0;
    v_mvp_player_id integer;
    v_bronze_item_id integer;
    v_silver_item_id integer;
    v_gold_item_id integer;
    v_damage_record record;
    v_rewards_distributed boolean := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.* INTO v_player
    FROM public.players AS p
    WHERE p.id = p_player_id
    FOR UPDATE;

    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT s.* INTO v_session
    FROM public.world_boss_sessions AS s
    WHERE s.id = p_session_id
      AND s.player_id = p_player_id
      AND s.is_active IS TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sessão de chefe mundial inválida ou encerrada.';
    END IF;

    IF v_session.turn_count >= 10 THEN
        RAISE EXCEPTION 'Você já completou os 10 turnos desta incursão.';
    END IF;

    SELECT e.* INTO v_event
    FROM public.global_events AS e
    WHERE e.id = v_session.event_id
      AND e.is_world_boss IS TRUE
      AND e.is_active IS TRUE
    FOR UPDATE;

    IF NOT FOUND OR COALESCE(v_event.boss_hp, 0) <= 0 THEN
        UPDATE public.world_boss_sessions
        SET is_active = false, ended_at = now()
        WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'error', 'O chefe mundial já foi derrotado ou o evento terminou.');
    END IF;

    -- Resolve equipment bonuses from the authoritative equipped inventory.
    SELECT
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'stamina'), 0),
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'chakra'), 0),
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'tai'), 0),
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'buk'), 0),
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'nin'), 0),
        COALESCE(SUM(floor(s.stat_value * (1 + COALESCE(pi.upgrade_level, 0) * 0.2))
            ) FILTER (WHERE s.stat_key = 'gen'), 0)
    INTO v_stamina_equipment, v_chakra_equipment,
         v_tai_equipment, v_buk_equipment, v_nin_equipment, v_gen_equipment
    FROM public.player_inventory AS pi
    JOIN public.items AS i ON i.id = pi.item_id
    CROSS JOIN LATERAL jsonb_each(COALESCE(i.bonus_stats, '{}'::jsonb) || COALESCE(pi.rolled_stats, '{}'::jsonb)) AS e(key, value)
    CROSS JOIN LATERAL (
        SELECT
            CASE lower(e.key)
                WHEN 'hp' THEN 'hp'
                WHEN 'vida' THEN 'hp'
                WHEN 'chakra' THEN 'chakra'
                WHEN 'stamina' THEN 'stamina'
                WHEN 'tai' THEN 'tai'
                WHEN 'taijutsu' THEN 'tai'
                WHEN 'ataque tai/buk' THEN 'tai'
                WHEN 'buk' THEN 'buk'
                WHEN 'bukijutsu' THEN 'buk'
                WHEN 'nin' THEN 'nin'
                WHEN 'ninjutsu' THEN 'nin'
                WHEN 'ataque nin/gen' THEN 'nin'
                WHEN 'gen' THEN 'gen'
                WHEN 'genjutsu' THEN 'gen'
                ELSE lower(e.key)
            END AS stat_key,
            COALESCE(NULLIF(regexp_replace(e.value #>> '{}', '[^0-9.-]', '', 'g'), ''), '0')::numeric AS stat_value
    ) AS s
    WHERE pi.player_id = p_player_id
      AND pi.is_equipped IS TRUE;

    v_stamina_max := 100
        + COALESCE(v_player.level, 1) * 20
        + COALESCE(v_player.energia, 0) * 5
        + COALESCE(v_player.taijutsu, 0) * 5
        + COALESCE(v_player.bukijutsu, 0) * 5
        + CASE v_player.rank
            WHEN 'Genin' THEN 150 WHEN 'Chunin' THEN 300
            WHEN 'Jounin' THEN 500 WHEN 'ANBU' THEN 800
            WHEN 'Sannin' THEN 1200 WHEN 'Herói' THEN 2000
            ELSE 0 END
        + COALESCE(v_stamina_equipment, 0);

    v_chakra_max := floor((
        100
        + COALESCE(v_player.level, 1) * 20
        + COALESCE(v_player.energia, 0) * 5
        + COALESCE(v_player.ninjutsu, 0) * 5
        + COALESCE(v_player.genjutsu, 0) * 5
        + CASE v_player.rank
            WHEN 'Genin' THEN 150 WHEN 'Chunin' THEN 300
            WHEN 'Jounin' THEN 500 WHEN 'ANBU' THEN 800
            WHEN 'Sannin' THEN 1200 WHEN 'Herói' THEN 2000
            ELSE 0 END
        + COALESCE(v_chakra_equipment, 0)
    ) * CASE v_player.clan WHEN 'Uzumaki' THEN 1.15 WHEN 'Hozuki' THEN 1.10 ELSE 1.0 END);

    v_stamina_now := LEAST(v_stamina_max, GREATEST(0, COALESCE(v_player.stamina, v_stamina_max)));
    v_chakra_now := LEAST(v_chakra_max, GREATEST(0, COALESCE(v_player.chakra, v_chakra_max)));
    v_physical_attack := COALESCE(v_player.forca, 0)
        + COALESCE(v_player.taijutsu, 0) * 2
        + COALESCE(v_player.bukijutsu, 0) * 2
        + 5 + COALESCE(v_tai_equipment, 0) + COALESCE(v_buk_equipment, 0);

    IF p_action = 'basic' THEN
        v_stamina_cost := 15;
        IF v_stamina_now < v_stamina_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stamina insuficiente.', 'stamina_remaining', v_stamina_now);
        END IF;

        v_stamina_now := v_stamina_now - v_stamina_cost;
        v_damage := GREATEST(floor(v_physical_attack * 0.15), floor(v_physical_attack - 250 / 2))::integer;

    ELSIF p_action = 'jutsu' THEN
        IF p_jutsu_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selecione um jutsu válido.');
        END IF;

        SELECT j.* INTO v_jutsu
        FROM public.jutsus AS j
        WHERE j.id = p_jutsu_id
          AND j.is_active IS TRUE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Jutsu indisponível.');
        END IF;

        SELECT item INTO v_jutsu_state
        FROM jsonb_array_elements(COALESCE(v_player.jutsus_learned, '[]'::jsonb)) AS learned(item)
        WHERE COALESCE(learned.item ->> 'id', trim(both '"' FROM learned.item::text)) = p_jutsu_id::text
        LIMIT 1;

        IF v_jutsu_state IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Você ainda não aprendeu este jutsu.');
        END IF;

        IF COALESCE(v_player.level, 1) < COALESCE(v_jutsu.req_level, 1) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Nível insuficiente para este jutsu.');
        END IF;

        v_rank_value := CASE
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%estudante%' THEN 0
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%genin%' THEN 1
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%chunin%' THEN 2
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%jounin%' OR lower(COALESCE(v_player.rank, '')) LIKE '%jonin%' THEN 3
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%anbu%' THEN 4
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%sannin%' OR lower(COALESCE(v_player.rank, '')) LIKE '%sanin%' THEN 5
            WHEN lower(COALESCE(v_player.rank, '')) LIKE '%herói%' OR lower(COALESCE(v_player.rank, '')) LIKE '%heroi%' THEN 6
            ELSE 0 END;

        v_required_rank_value := CASE
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%estudante%' THEN 0
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%genin%' THEN 1
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%chunin%' THEN 2
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%jounin%' OR lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%jonin%' THEN 3
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%anbu%' THEN 4
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%sannin%' OR lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%sanin%' THEN 5
            WHEN lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%herói%' OR lower(COALESCE(v_jutsu.req_rank, '')) LIKE '%heroi%' THEN 6
            ELSE 0 END;
        IF v_rank_value < v_required_rank_value THEN
            RETURN jsonb_build_object('success', false, 'error', 'Graduação insuficiente para este jutsu.');
        END IF;

        IF v_jutsu.req_clan IS NOT NULL
           AND lower(COALESCE(v_player.clan, '')) <> lower(v_jutsu.req_clan) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este jutsu exige um clã específico.');
        END IF;

        IF v_jutsu.element IS NOT NULL
           AND lower(COALESCE(v_player.element, '')) <> lower(v_jutsu.element) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Você não possui o elemento necessário para este jutsu.');
        END IF;

        IF COALESCE(v_player.selo, 0) < COALESCE(v_jutsu.req_seals, 0) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selo insuficiente para este jutsu.');
        END IF;

        v_primary_stat := CASE lower(COALESCE(v_jutsu.category, v_jutsu.type, 'ninjutsu'))
            WHEN 'taijutsu' THEN COALESCE(v_player.taijutsu, v_player.tai, 0)
            WHEN 'bukijutsu' THEN COALESCE(v_player.bukijutsu, v_player.buk, 0)
            WHEN 'genjutsu' THEN COALESCE(v_player.genjutsu, v_player.gen, 0)
            ELSE COALESCE(v_player.ninjutsu, v_player.nin, 0)
        END;
        IF COALESCE(v_jutsu.req_attr_value, 0) > v_primary_stat THEN
            RETURN jsonb_build_object('success', false, 'error', 'Atributos insuficientes para este jutsu.');
        END IF;

        IF v_jutsu.category = 'Taijutsu' THEN
            v_jutsu_attr := COALESCE(NULLIF(v_player.taijutsu, 0), v_player.tai, 0);
        ELSIF v_jutsu.category = 'Bukijutsu' THEN
            v_jutsu_attr := COALESCE(NULLIF(v_player.bukijutsu, 0), v_player.buk, 0);
        ELSIF v_jutsu.category = 'Genjutsu' THEN
            v_jutsu_attr := COALESCE(NULLIF(v_player.genjutsu, 0), v_player.gen, 0) + COALESCE(v_nin_equipment, 0);
        ELSE
            v_jutsu_attr := COALESCE(NULLIF(v_player.ninjutsu, 0), v_player.nin, 0) + COALESCE(v_nin_equipment, 0);
        END IF;

        v_jutsu_attr := v_jutsu_attr + CASE v_jutsu.category
            WHEN 'Taijutsu' THEN COALESCE(v_tai_equipment, 0)
            WHEN 'Bukijutsu' THEN COALESCE(v_buk_equipment, 0)
            WHEN 'Genjutsu' THEN COALESCE(v_gen_equipment, 0)
            ELSE COALESCE(v_nin_equipment, 0) END;

        v_jutsu_damage_bonus := COALESCE(NULLIF(regexp_replace(COALESCE(v_jutsu_state->'absorbed_stats'->>'dano', '0'), '[^0-9.-]', '', 'g'), ''), '0')::integer;
        v_jutsu_cost_bonus := COALESCE(NULLIF(regexp_replace(COALESCE(v_jutsu_state->'absorbed_stats'->>'custo', '0'), '[^0-9.-]', '', 'g'), ''), '0')::integer;

        FOR v_slot IN
            SELECT slot FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(v_jutsu_state->'slots') = 'array'
                    THEN v_jutsu_state->'slots' ELSE '[]'::jsonb END
            ) AS slots(slot)
        LOOP
            IF v_slot IS NULL OR v_slot = '' THEN CONTINUE; END IF;
            v_slot_type := split_part(v_slot, '_', 1);
            v_slot_tier := COALESCE(NULLIF(split_part(v_slot, '_', 2), '')::integer, 1);
            IF v_slot_type = 'dano' THEN
                v_jutsu_damage_bonus := v_jutsu_damage_bonus + CASE v_slot_tier
                    WHEN 1 THEN 5 WHEN 2 THEN 15 WHEN 3 THEN 30 WHEN 4 THEN 50 ELSE 100 END;
            ELSIF v_slot_type = 'custo' THEN
                v_jutsu_cost_bonus := v_jutsu_cost_bonus + CASE v_slot_tier
                    WHEN 1 THEN -2 WHEN 2 THEN -5 WHEN 3 THEN -10 WHEN 4 THEN -15 ELSE -25 END;
            END IF;
        END LOOP;

        v_jutsu_cost_bonus := GREATEST(-50, v_jutsu_cost_bonus);
        v_jutsu_damage_bonus := GREATEST(0, v_jutsu_damage_bonus);
        v_chakra_cost := GREATEST(1, floor(GREATEST(
            COALESCE(v_jutsu.chakra_cost, 20) * 0.1,
            (COALESCE(v_jutsu.chakra_cost, 20) + v_jutsu_cost_bonus)
              * (1 - LEAST(0.5, COALESCE(v_player.selo, 0) * 0.01))
        )))::integer;

        IF v_chakra_now < v_chakra_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Chakra insuficiente.', 'chakra_remaining', v_chakra_now);
        END IF;

        v_chakra_now := v_chakra_now - v_chakra_cost;
        v_damage := GREATEST(1, floor(v_jutsu_attr / 2)
            + COALESCE(v_jutsu.damage, 15)
            + v_jutsu_damage_bonus
            - floor(250 / 2))::integer;

    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Ação de combate inválida.');
    END IF;

    v_actual_damage := LEAST(COALESCE(v_event.boss_hp, 0), GREATEST(0, v_damage));
    v_is_dead := v_actual_damage >= COALESCE(v_event.boss_hp, 0);

    UPDATE public.players
    SET stamina = v_stamina_now,
        chakra = v_chakra_now,
        daily_chakra_spent = COALESCE(daily_chakra_spent, 0) + v_chakra_cost
    WHERE id = p_player_id;

    UPDATE public.global_events
    SET boss_hp = GREATEST(0, COALESCE(boss_hp, 0) - v_actual_damage),
        is_active = CASE WHEN v_is_dead THEN false ELSE is_active END
    WHERE id = v_event.id;

    UPDATE public.world_boss_sessions
    SET turn_count = turn_count + 1,
        damage_total = damage_total + v_actual_damage,
        is_active = CASE WHEN v_is_dead THEN false ELSE is_active END,
        ended_at = CASE WHEN v_is_dead THEN now() ELSE ended_at END
    WHERE id = p_session_id;

    INSERT INTO public.world_boss_damage (player_id, event_id, total_damage, is_last_hit)
    VALUES (p_player_id, v_event.id, v_actual_damage, v_is_dead)
    ON CONFLICT (player_id, event_id)
    DO UPDATE SET
        total_damage = public.world_boss_damage.total_damage + EXCLUDED.total_damage,
        is_last_hit = EXCLUDED.is_last_hit;

    IF v_is_dead THEN
        UPDATE public.world_boss_sessions
        SET is_active = false, ended_at = now()
        WHERE event_id = v_event.id;

        SELECT COALESCE(SUM(d.total_damage), 0)
        INTO v_total_event_damage
        FROM public.world_boss_damage AS d
        WHERE d.event_id = v_event.id;

        SELECT d.player_id
        INTO v_mvp_player_id
        FROM public.world_boss_damage AS d
        WHERE d.event_id = v_event.id
        ORDER BY d.total_damage DESC, d.player_id
        LIMIT 1;

        SELECT id INTO v_bronze_item_id FROM public.items WHERE name = 'Baú de Incursão (Bronze)' LIMIT 1;
        SELECT id INTO v_silver_item_id FROM public.items WHERE name = 'Baú de Incursão (Prata)' LIMIT 1;
        SELECT id INTO v_gold_item_id FROM public.items WHERE name = 'Baú de Incursão (Ouro)' LIMIT 1;

        FOR v_damage_record IN
            SELECT d.player_id, d.total_damage, d.is_last_hit
            FROM public.world_boss_damage AS d
            WHERE d.event_id = v_event.id
        LOOP
            UPDATE public.players
            SET xp = COALESCE(xp, 0) + 1000 + (v_damage_record.total_damage / 10)::integer,
                ryous = COALESCE(ryous, 0) + 2000 + (v_damage_record.total_damage / 5)::integer
            WHERE id = v_damage_record.player_id;

            IF v_bronze_item_id IS NOT NULL THEN
                INSERT INTO public.player_inventory (player_id, item_id, is_equipped, is_favorite, rarity, rolled_stats)
                VALUES (v_damage_record.player_id, v_bronze_item_id, false, false, 'Comum', '{}'::jsonb);
            END IF;

            IF v_silver_item_id IS NOT NULL AND v_total_event_damage > 0
               AND (v_damage_record.total_damage::numeric / v_total_event_damage::numeric) >= 0.05 THEN
                INSERT INTO public.player_inventory (player_id, item_id, is_equipped, is_favorite, rarity, rolled_stats)
                VALUES (v_damage_record.player_id, v_silver_item_id, false, false, 'Incomum', '{}'::jsonb);
            END IF;

            IF v_gold_item_id IS NOT NULL
               AND (v_damage_record.player_id = v_mvp_player_id OR v_damage_record.is_last_hit IS TRUE) THEN
                INSERT INTO public.player_inventory (player_id, item_id, is_equipped, is_favorite, rarity, rolled_stats)
                VALUES (v_damage_record.player_id, v_gold_item_id, false, false, 'Raro', '{}'::jsonb);
            END IF;
        END LOOP;

        v_rewards_distributed := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'hit', v_hit,
        'damage', v_actual_damage,
        'is_crit', false,
        'stamina_cost', v_stamina_cost,
        'chakra_cost', v_chakra_cost,
        'stamina_remaining', v_stamina_now,
        'chakra_remaining', v_chakra_now,
        'boss_hp', GREATEST(0, COALESCE(v_event.boss_hp, 0) - v_actual_damage),
        'boss_max_hp', v_event.boss_max_hp,
        'boss_defeated', v_is_dead,
        'session_turn_count', v_session.turn_count + 1,
        'session_damage_total', v_session.damage_total + v_actual_damage,
        'rewards_distributed', v_rewards_distributed
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.encerrar_world_boss(
    p_player_id integer,
    p_session_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player_user_id uuid;
    v_session public.world_boss_sessions%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.user_id INTO v_player_user_id
    FROM public.players AS p
    WHERE p.id = p_player_id;

    IF v_player_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    SELECT s.* INTO v_session
    FROM public.world_boss_sessions AS s
    WHERE s.id = p_session_id AND s.player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sessão não encontrada.');
    END IF;

    UPDATE public.world_boss_sessions
    SET is_active = false,
        ended_at = COALESCE(ended_at, now())
    WHERE id = p_session_id AND is_active IS TRUE;

    RETURN jsonb_build_object(
        'success', true,
        'damage_total', v_session.damage_total,
        'turn_count', v_session.turn_count
    );
END;
$function$;


ALTER TABLE public.global_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_events_read_active_world_boss ON public.global_events;
CREATE POLICY global_events_read_active_world_boss
ON public.global_events FOR SELECT TO anon, authenticated
USING (true);
REVOKE ALL ON TABLE public.global_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.global_events TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.world_boss_damage FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.world_boss_damage TO authenticated;

REVOKE ALL ON FUNCTION public.iniciar_world_boss(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_world_boss(integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.atacar_world_boss(integer, uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atacar_world_boss(integer, uuid, text, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.encerrar_world_boss(integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encerrar_world_boss(integer, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
