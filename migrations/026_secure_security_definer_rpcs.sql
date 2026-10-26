-- Migration 026: protect player-mutating SECURITY DEFINER RPCs.
-- This migration preserves the current function signatures used by the client.
-- Review and test in a staging project before applying to production.

-- Keep search_path limited to trusted built-ins/temp objects and schema-qualify
-- every application object in these SECURITY DEFINER functions.

CREATE OR REPLACE FUNCTION public.viajar_mapa(
    p_player_id integer,
    p_target_village integer,
    p_cost integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_cost integer := 100;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.*
      INTO v_player
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado.';
    END IF;

    IF v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF p_target_village IS NULL
       OR NOT EXISTS (
          SELECT 1 FROM public.villages AS v WHERE v.id = p_target_village
       ) THEN
        RAISE EXCEPTION 'Vila de destino inválida.';
    END IF;

    -- Retain p_cost for RPC compatibility, but never trust a client-supplied
    -- price. The current client uses a fixed travel cost of 100 ryous.
    IF p_cost IS DISTINCT FROM v_cost THEN
        RAISE EXCEPTION 'Custo de viagem inválido.';
    END IF;

    IF COALESCE(v_player.ryous, 0) < v_cost THEN
        RAISE EXCEPTION 'Ryous insuficientes para viajar.';
    END IF;

    UPDATE public.players
       SET ryous = COALESCE(ryous, 0) - v_cost,
           vila_atual_id = p_target_village
     WHERE id = p_player_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.aprender_jutsu(
    p_player_id integer,
    p_jutsu_id integer,
    p_cost integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_jutsu public.jutsus%ROWTYPE;
    v_jutsus jsonb;
    v_cost integer;
    v_player_rank text;
    v_required_rank text;
    v_player_rank_value integer := -1;
    v_required_rank_value integer := -1;
    v_player_clan text;
    v_required_clan text;
    v_primary_stat text;
    v_actual_stat numeric;
    v_requirement record;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.*
      INTO v_player
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado.';
    END IF;

    IF v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    SELECT j.*
      INTO v_jutsu
      FROM public.jutsus AS j
     WHERE j.id = p_jutsu_id
       AND j.is_active IS TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jutsu não encontrado ou inativo.';
    END IF;

    v_cost := v_jutsu.cost_ryous;
    IF v_cost IS NULL OR v_cost < 0 THEN
        RAISE EXCEPTION 'Custo do jutsu inválido no catálogo.';
    END IF;

    IF COALESCE(v_player.level, 1) < COALESCE(v_jutsu.req_level, 1) THEN
        RAISE EXCEPTION 'Nível insuficiente para aprender este jutsu.';
    END IF;

    -- Match the rank ordering used in the current client, accepting both
    -- "Jonin" and "Jounin" spellings already present in historical data.
    v_player_rank := lower(COALESCE(v_player.rank, ''));
    v_player_rank_value := CASE
        WHEN v_player_rank LIKE '%estudante%' THEN 0
        WHEN v_player_rank LIKE '%genin%' THEN 1
        WHEN v_player_rank LIKE '%chunin%' THEN 2
        WHEN v_player_rank LIKE '%jounin%' OR v_player_rank LIKE '%jonin%' THEN 3
        WHEN v_player_rank LIKE '%anbu%' THEN 4
        WHEN v_player_rank LIKE '%sannin%' OR v_player_rank LIKE '%sanin%' THEN 5
        WHEN v_player_rank LIKE '%heroi%' OR v_player_rank LIKE '%herói%' THEN 6
        ELSE -1
    END;

    IF v_jutsu.req_rank IS NOT NULL THEN
        v_required_rank := lower(v_jutsu.req_rank);
        v_required_rank_value := CASE
            WHEN v_required_rank LIKE '%estudante%' THEN 0
            WHEN v_required_rank LIKE '%genin%' THEN 1
            WHEN v_required_rank LIKE '%chunin%' THEN 2
            WHEN v_required_rank LIKE '%jounin%' OR v_required_rank LIKE '%jonin%' THEN 3
            WHEN v_required_rank LIKE '%anbu%' THEN 4
            WHEN v_required_rank LIKE '%sannin%' OR v_required_rank LIKE '%sanin%' THEN 5
            WHEN v_required_rank LIKE '%heroi%' OR v_required_rank LIKE '%herói%' THEN 6
            ELSE -1
        END;

        IF v_required_rank_value < 0 OR v_player_rank_value < v_required_rank_value THEN
            RAISE EXCEPTION 'Graduação insuficiente para aprender este jutsu.';
        END IF;
    END IF;

    IF v_jutsu.req_clan IS NOT NULL
       AND translate(lower(COALESCE(v_player.clan, '')), 'ūō', 'uo')
           <> translate(lower(v_jutsu.req_clan), 'ūō', 'uo') THEN
        RAISE EXCEPTION 'Este jutsu exige um clã específico.';
    END IF;

    IF v_jutsu.element IS NOT NULL
       AND lower(v_jutsu.element) NOT IN (
           lower(COALESCE(v_player.element, '')),
           lower(COALESCE(v_player.element2, ''))
       ) THEN
        RAISE EXCEPTION 'Você não possui o elemento necessário para este jutsu.';
    END IF;

    IF v_jutsu.req_stats IS NOT NULL
       AND pg_catalog.jsonb_typeof(v_jutsu.req_stats) <> 'object' THEN
        RAISE EXCEPTION 'Requisitos de atributos inválidos no catálogo.';
    END IF;

    IF COALESCE(v_jutsu.req_stats, '{}'::jsonb) <> '{}'::jsonb THEN
        FOR v_requirement IN
            SELECT key, value
              FROM pg_catalog.jsonb_each(v_jutsu.req_stats)
        LOOP
            v_actual_stat := CASE lower(v_requirement.key)
                WHEN 'ninjutsu' THEN COALESCE(v_player.ninjutsu, 0)
                WHEN 'taijutsu' THEN COALESCE(v_player.taijutsu, 0)
                WHEN 'genjutsu' THEN COALESCE(v_player.genjutsu, 0)
                WHEN 'bukijutsu' THEN COALESCE(v_player.bukijutsu, 0)
                WHEN 'agilidade' THEN COALESCE(v_player.agilidade, 0)
                WHEN 'forca' THEN COALESCE(v_player.forca, 0)
                WHEN 'resistencia' THEN COALESCE(v_player.resistencia, 0)
                WHEN 'energia' THEN COALESCE(v_player.energia, 0)
                WHEN 'selo' THEN COALESCE(v_player.selo, 0)
                WHEN 'inteligencia' THEN COALESCE(v_player.inteligencia, 0)
                ELSE NULL
            END;

            IF v_actual_stat IS NULL THEN
                RAISE EXCEPTION 'Requisito de atributo desconhecido: %.', v_requirement.key;
            END IF;

            IF v_actual_stat < (v_requirement.value #>> '{}')::numeric THEN
                RAISE EXCEPTION 'Atributos insuficientes para aprender este jutsu.';
            END IF;
        END LOOP;
    ELSE
        v_primary_stat := lower(COALESCE(v_jutsu.category, v_jutsu.type, ''));
        v_actual_stat := CASE v_primary_stat
            WHEN 'ninjutsu' THEN COALESCE(v_player.ninjutsu, 0)
            WHEN 'taijutsu' THEN COALESCE(v_player.taijutsu, 0)
            WHEN 'genjutsu' THEN COALESCE(v_player.genjutsu, 0)
            WHEN 'bukijutsu' THEN COALESCE(v_player.bukijutsu, 0)
            ELSE NULL
        END;

        IF COALESCE(v_jutsu.req_attr_value, 0) > 0
           AND (v_actual_stat IS NULL OR v_actual_stat < v_jutsu.req_attr_value) THEN
            RAISE EXCEPTION 'Atributo principal insuficiente para aprender este jutsu.';
        END IF;
    END IF;

    IF COALESCE(v_player.selo, 0) < COALESCE(v_jutsu.req_seals, 0) THEN
        RAISE EXCEPTION 'Selo insuficiente para aprender este jutsu.';
    END IF;

    v_jutsus := COALESCE(v_player.jutsus_learned, '[]'::jsonb);
    IF pg_catalog.jsonb_typeof(v_jutsus) <> 'array' THEN
        RAISE EXCEPTION 'Estado de jutsus do personagem inválido.';
    END IF;

    IF EXISTS (
        SELECT 1
          FROM pg_catalog.jsonb_array_elements(v_jutsus) AS learned(item)
         WHERE COALESCE(learned.item ->> 'id', trim(both '"' FROM learned.item::text)) = p_jutsu_id::text
    ) THEN
        RAISE EXCEPTION 'Este jutsu já foi aprendido.';
    END IF;

    IF COALESCE(v_player.ryous, 0) < v_cost THEN
        RAISE EXCEPTION 'Ryous insuficientes para aprender o jutsu.';
    END IF;

    -- p_cost remains in the signature for backwards compatibility. The cost
    -- applied is always the catalog value, never the request parameter.
    UPDATE public.players
       SET ryous = COALESCE(ryous, 0) - v_cost,
           jutsus_learned = v_jutsus || pg_catalog.jsonb_build_array(
               pg_catalog.jsonb_build_object(
                   'id', p_jutsu_id,
                   'level', 1,
                   'slots', pg_catalog.jsonb_build_array(NULL, NULL, NULL)
               )
           )
     WHERE id = p_player_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.aprender_jutsus_massa(
    p_player_id integer,
    p_jutsus jsonb,
    p_total_cost integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_item jsonb;
    v_id_text text;
    v_jutsu_id integer;
    v_count integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.*
      INTO v_player
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado.';
    END IF;

    IF v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF COALESCE(v_player.is_vip, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Aprender em massa é exclusivo para jogadores VIP.';
    END IF;

    IF p_jutsus IS NULL
       OR pg_catalog.jsonb_typeof(p_jutsus) <> 'array'
       OR pg_catalog.jsonb_array_length(p_jutsus) = 0
       OR pg_catalog.jsonb_array_length(p_jutsus) > 100 THEN
        RAISE EXCEPTION 'Lista de jutsus inválida (limite: 1 a 100).';
    END IF;

    FOR v_item IN
        SELECT value FROM pg_catalog.jsonb_array_elements(p_jutsus)
    LOOP
        v_id_text := CASE
            WHEN pg_catalog.jsonb_typeof(v_item) = 'object' THEN v_item ->> 'id'
            ELSE v_item #>> '{}'
        END;

        IF v_id_text IS NULL OR v_id_text !~ '^[0-9]+$' THEN
            RAISE EXCEPTION 'Identificador de jutsu inválido.';
        END IF;

        v_jutsu_id := v_id_text::integer;

        -- Reuse the single-jutsu validation and catalog-derived price.
        -- If one item fails, PostgreSQL rolls back the entire RPC call.
        PERFORM public.aprender_jutsu(p_player_id, v_jutsu_id, 0);
        v_count := v_count + 1;
    END LOOP;

    IF v_count = 0 THEN
        RAISE EXCEPTION 'Nenhum jutsu foi informado.';
    END IF;

    -- p_total_cost remains in the signature for backwards compatibility.
    -- The inner function deducts each authoritative catalog price atomically.
END;
$function$;


CREATE OR REPLACE FUNCTION public.vip_reset_talento(
    p_player_id integer,
    p_stat_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    v_user_id uuid;
    v_vip_coins integer;
    v_stat_value integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_stat_name IS NULL OR p_stat_name NOT IN (
        'ninjutsu', 'taijutsu', 'genjutsu', 'bukijutsu',
        'forca', 'agilidade', 'resistencia', 'energia', 'selo', 'inteligencia'
    ) THEN
        RAISE EXCEPTION 'Atributo inválido.';
    END IF;

    EXECUTE pg_catalog.format(
        'SELECT user_id, vip_coins, %I FROM public.players WHERE id = $1 FOR UPDATE',
        p_stat_name
    )
    INTO v_user_id, v_vip_coins, v_stat_value
    USING p_player_id;

    IF v_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF COALESCE(v_vip_coins, 0) < 1 THEN
        RAISE EXCEPTION 'Créditos VIP insuficientes.';
    END IF;

    IF COALESCE(v_stat_value, 0) <= 0 THEN
        RAISE EXCEPTION 'O atributo já está zerado.';
    END IF;

    EXECUTE pg_catalog.format(
        'UPDATE public.players
            SET vip_coins = COALESCE(vip_coins, 0) - 1,
                total_vip_spent = COALESCE(total_vip_spent, 0) + 1,
                pontos_atributos = COALESCE(pontos_atributos, 0) + 1,
                %I = %I - 1
          WHERE id = $1',
        p_stat_name, p_stat_name
    )
    USING p_player_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.vip_reset_personagem(
    p_player_id integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $function$
DECLARE
    v_user_id uuid;
    v_vip_coins integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT p.user_id, p.vip_coins
      INTO v_user_id, v_vip_coins
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado.';
    END IF;

    IF v_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF COALESCE(v_vip_coins, 0) < 2 THEN
        RAISE EXCEPTION 'Créditos VIP insuficientes (requer 2).';
    END IF;

    UPDATE public.players
       SET vip_coins = COALESCE(vip_coins, 0) - 2,
           total_vip_spent = COALESCE(total_vip_spent, 0) + 2,
           level = 1,
           xp = 0,
           ryous = 1000,
           pontos_atributos = 0
     WHERE id = p_player_id;
END;
$function$;


-- SECURITY DEFINER routines should not be executable by anonymous callers.
REVOKE ALL ON FUNCTION public.viajar_mapa(integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.viajar_mapa(integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.viajar_mapa(integer, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aprender_jutsu(integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aprender_jutsu(integer, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.aprender_jutsu(integer, integer, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aprender_jutsus_massa(integer, jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aprender_jutsus_massa(integer, jsonb, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.aprender_jutsus_massa(integer, jsonb, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.vip_reset_talento(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vip_reset_talento(integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.vip_reset_talento(integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.vip_reset_personagem(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vip_reset_personagem(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.vip_reset_personagem(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
