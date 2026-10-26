-- Migration 034: server-authoritative economy, progression, daily claims, and trusted loot.
-- Intended for the live Kurokage schema inspected on 2026-10-26.

-- Mark existing inventory as trusted before new client-created rows are blocked.
ALTER TABLE public.player_inventory
  ADD COLUMN IF NOT EXISTS is_server_acquired boolean NOT NULL DEFAULT true;
UPDATE public.player_inventory SET is_server_acquired = true;
ALTER TABLE public.player_inventory ALTER COLUMN is_server_acquired SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.mark_server_acquired_inventory()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
    -- All server-owned SECURITY DEFINER inventory inserts run as postgres.
    -- API clients have no INSERT privilege and cannot set this marker.
    NEW.is_server_acquired := (current_user IN ('postgres', 'service_role'));
    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS player_inventory_trusted_insert ON public.player_inventory;
CREATE TRIGGER player_inventory_trusted_insert
BEFORE INSERT ON public.player_inventory
FOR EACH ROW EXECUTE FUNCTION public.mark_server_acquired_inventory();

REVOKE ALL ON FUNCTION public.mark_server_acquired_inventory() FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.kurokage_roll_loot(p_rank text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_item public.items%ROWTYPE;
    v_rank text := lower(COALESCE(p_rank, 'genin'));
    v_roll integer := floor(random() * 100)::integer + 1;
    v_rarity text;
    v_fixed_amount integer;
    v_stat_type text;
    v_stat record;
    v_stats jsonb := '{}'::jsonb;
    v_stat_name text;
    v_group text;
    v_min integer;
    v_max integer;
    v_value integer;
    v_i integer;
    v_extra boolean;
BEGIN
    SELECT * INTO v_item FROM public.items ORDER BY random() LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum item cadastrado.');
    END IF;

    IF v_rank LIKE '%sannin%' THEN
        v_rarity := CASE WHEN v_roll <= 25 THEN 'Lendário' ELSE 'Épico' END;
    ELSIF v_rank LIKE '%heroi%' OR v_rank LIKE '%herói%' THEN
        v_rarity := CASE WHEN v_roll <= 50 THEN 'Lendário' ELSE 'Épico' END;
    ELSIF v_rank LIKE '%anbu%' THEN
        v_rarity := CASE WHEN v_roll <= 15 THEN 'Lendário' WHEN v_roll <= 80 THEN 'Épico' ELSE 'Raro' END;
    ELSIF v_rank LIKE '%jonin%' OR v_rank LIKE '%jounin%' THEN
        v_rarity := CASE WHEN v_roll <= 7 THEN 'Lendário' WHEN v_roll <= 37 THEN 'Épico' ELSE 'Raro' END;
    ELSIF v_rank LIKE '%chunin%' THEN
        v_rarity := CASE WHEN v_roll <= 3 THEN 'Lendário' WHEN v_roll <= 10 THEN 'Épico' WHEN v_roll <= 90 THEN 'Raro' ELSE 'Comum' END;
    ELSE
        v_rarity := CASE WHEN v_roll <= 1 THEN 'Lendário' WHEN v_roll <= 5 THEN 'Épico' WHEN v_roll <= 15 THEN 'Raro' ELSE 'Comum' END;
    END IF;

    v_fixed_amount := CASE v_rarity
        WHEN 'Raro' THEN 2
        WHEN 'Épico' THEN 3
        WHEN 'Lendário' THEN 4
        WHEN 'Único' THEN 5
        ELSE 1
    END;

    FOR v_i IN 1..v_fixed_amount LOOP
        v_stat_type := CASE WHEN v_i % 2 = 1 THEN 'Base' ELSE 'Fórmula' END;
        SELECT s.name, s.is_percentage
          INTO v_stat
          FROM public.item_stat_types AS s
         WHERE s.stat_type = v_stat_type
           AND NOT (v_stats ? s.name)
         ORDER BY random()
         LIMIT 1;

        IF NOT FOUND THEN
            SELECT s.name, s.is_percentage
              INTO v_stat
              FROM public.item_stat_types AS s
             WHERE NOT (v_stats ? s.name)
             ORDER BY random()
             LIMIT 1;
        END IF;

        IF NOT FOUND THEN
            EXIT;
        END IF;

        v_stat_name := v_stat.name;
        v_group := CASE v_stat_name
            WHEN 'Energia' THEN 'energia'
            WHEN 'Ataque Tai/Buk' THEN 'attack'
            WHEN 'Ataque Nin/Gen' THEN 'attack'
            WHEN 'Defesa Tai/Buk' THEN 'attack'
            WHEN 'Defesa Nin/Gen' THEN 'attack'
            WHEN 'Precisão' THEN 'precision'
            WHEN 'Perfuração' THEN 'precision'
            WHEN 'HP' THEN 'hp'
            WHEN 'Chakra' THEN 'chakra'
            WHEN 'Stamina' THEN 'chakra'
            WHEN 'Concentração' THEN 'secondary'
            WHEN 'Percepção' THEN 'secondary'
            WHEN 'Convicção' THEN 'secondary'
            WHEN 'Determinação' THEN 'secondary'
            WHEN 'Dano Crítico' THEN 'secondary'
            WHEN 'Absorção' THEN 'secondary'
            ELSE 'base'
        END;

        IF v_rank LIKE '%heroi%' OR v_rank LIKE '%herói%' THEN
            v_min := CASE v_group WHEN 'base' THEN 6 WHEN 'energia' THEN 4 WHEN 'attack' THEN 3 WHEN 'precision' THEN 6 WHEN 'hp' THEN 24 WHEN 'chakra' THEN 6 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 9 WHEN 'energia' THEN 6 WHEN 'attack' THEN 4 WHEN 'precision' THEN 9 WHEN 'hp' THEN 48 WHEN 'chakra' THEN 8 ELSE 5 END;
        ELSIF v_rank LIKE '%sannin%' THEN
            v_min := CASE v_group WHEN 'base' THEN 5 WHEN 'energia' THEN 3 WHEN 'attack' THEN 3 WHEN 'precision' THEN 5 WHEN 'hp' THEN 20 WHEN 'chakra' THEN 4 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 7 WHEN 'energia' THEN 5 WHEN 'attack' THEN 3 WHEN 'precision' THEN 7 WHEN 'hp' THEN 40 WHEN 'chakra' THEN 8 ELSE 5 END;
        ELSIF v_rank LIKE '%anbu%' THEN
            v_min := CASE v_group WHEN 'base' THEN 4 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 4 WHEN 'hp' THEN 16 WHEN 'chakra' THEN 4 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 6 WHEN 'energia' THEN 4 WHEN 'attack' THEN 3 WHEN 'precision' THEN 6 WHEN 'hp' THEN 32 WHEN 'chakra' THEN 6 ELSE 5 END;
        ELSIF v_rank LIKE '%jonin%' OR v_rank LIKE '%jounin%' THEN
            v_min := CASE v_group WHEN 'base' THEN 3 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 3 WHEN 'hp' THEN 12 WHEN 'chakra' THEN 3 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 5 WHEN 'energia' THEN 3 WHEN 'attack' THEN 2 WHEN 'precision' THEN 5 WHEN 'hp' THEN 24 WHEN 'chakra' THEN 6 ELSE 5 END;
        ELSIF v_rank LIKE '%chunin%' THEN
            v_min := CASE v_group WHEN 'base' THEN 2 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 2 WHEN 'hp' THEN 8 WHEN 'chakra' THEN 2 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 4 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 4 WHEN 'hp' THEN 16 WHEN 'chakra' THEN 4 ELSE 5 END;
        ELSE
            v_min := CASE v_group WHEN 'base' THEN 1 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 1 WHEN 'hp' THEN 1 WHEN 'chakra' THEN 1 ELSE 1 END;
            v_max := CASE v_group WHEN 'base' THEN 3 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 2 WHEN 'hp' THEN 8 WHEN 'chakra' THEN 4 ELSE 5 END;
        END IF;

        v_value := v_min + floor(random() * (v_max - v_min + 1))::integer;
        IF COALESCE(v_stat.is_percentage, false) THEN
            v_stats := jsonb_set(v_stats, ARRAY[v_stat_name], to_jsonb(v_value::text || '%'), true);
        ELSE
            v_stats := jsonb_set(v_stats, ARRAY[v_stat_name], to_jsonb(v_value), true);
        END IF;
    END LOOP;

    v_extra := random() <= 0.30;
    IF v_extra THEN
        v_stat_type := CASE WHEN random() < 0.5 THEN 'Base' ELSE 'Fórmula' END;
        SELECT s.name, s.is_percentage
          INTO v_stat
          FROM public.item_stat_types AS s
         WHERE s.stat_type = v_stat_type
           AND NOT (v_stats ? s.name)
         ORDER BY random()
         LIMIT 1;
        IF FOUND THEN
            v_stat_name := v_stat.name;
            v_group := CASE v_stat_name
                WHEN 'Energia' THEN 'energia'
                WHEN 'Ataque Tai/Buk' THEN 'attack'
                WHEN 'Ataque Nin/Gen' THEN 'attack'
                WHEN 'Defesa Tai/Buk' THEN 'attack'
                WHEN 'Defesa Nin/Gen' THEN 'attack'
                WHEN 'Precisão' THEN 'precision'
                WHEN 'Perfuração' THEN 'precision'
                WHEN 'HP' THEN 'hp'
                WHEN 'Chakra' THEN 'chakra'
                WHEN 'Stamina' THEN 'chakra'
                WHEN 'Concentração' THEN 'secondary'
                WHEN 'Percepção' THEN 'secondary'
                WHEN 'Convicção' THEN 'secondary'
                WHEN 'Determinação' THEN 'secondary'
                WHEN 'Dano Crítico' THEN 'secondary'
                WHEN 'Absorção' THEN 'secondary'
                ELSE 'base'
            END;
            IF v_rank LIKE '%heroi%' OR v_rank LIKE '%herói%' THEN
                v_min := CASE v_group WHEN 'base' THEN 6 WHEN 'energia' THEN 4 WHEN 'attack' THEN 3 WHEN 'precision' THEN 6 WHEN 'hp' THEN 24 WHEN 'chakra' THEN 6 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 9 WHEN 'energia' THEN 6 WHEN 'attack' THEN 4 WHEN 'precision' THEN 9 WHEN 'hp' THEN 48 WHEN 'chakra' THEN 8 ELSE 5 END;
            ELSIF v_rank LIKE '%sannin%' THEN
                v_min := CASE v_group WHEN 'base' THEN 5 WHEN 'energia' THEN 3 WHEN 'attack' THEN 3 WHEN 'precision' THEN 5 WHEN 'hp' THEN 20 WHEN 'chakra' THEN 4 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 7 WHEN 'energia' THEN 5 WHEN 'attack' THEN 3 WHEN 'precision' THEN 7 WHEN 'hp' THEN 40 WHEN 'chakra' THEN 8 ELSE 5 END;
            ELSIF v_rank LIKE '%anbu%' THEN
                v_min := CASE v_group WHEN 'base' THEN 4 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 4 WHEN 'hp' THEN 16 WHEN 'chakra' THEN 4 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 6 WHEN 'energia' THEN 4 WHEN 'attack' THEN 3 WHEN 'precision' THEN 6 WHEN 'hp' THEN 32 WHEN 'chakra' THEN 6 ELSE 5 END;
            ELSIF v_rank LIKE '%jonin%' OR v_rank LIKE '%jounin%' THEN
                v_min := CASE v_group WHEN 'base' THEN 3 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 3 WHEN 'hp' THEN 12 WHEN 'chakra' THEN 3 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 5 WHEN 'energia' THEN 3 WHEN 'attack' THEN 2 WHEN 'precision' THEN 5 WHEN 'hp' THEN 24 WHEN 'chakra' THEN 6 ELSE 5 END;
            ELSIF v_rank LIKE '%chunin%' THEN
                v_min := CASE v_group WHEN 'base' THEN 2 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 2 WHEN 'hp' THEN 8 WHEN 'chakra' THEN 2 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 4 WHEN 'energia' THEN 2 WHEN 'attack' THEN 2 WHEN 'precision' THEN 4 WHEN 'hp' THEN 16 WHEN 'chakra' THEN 4 ELSE 5 END;
            ELSE
                v_min := CASE v_group WHEN 'base' THEN 1 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 1 WHEN 'hp' THEN 1 WHEN 'chakra' THEN 1 ELSE 1 END;
                v_max := CASE v_group WHEN 'base' THEN 3 WHEN 'energia' THEN 1 WHEN 'attack' THEN 1 WHEN 'precision' THEN 2 WHEN 'hp' THEN 8 WHEN 'chakra' THEN 4 ELSE 5 END;
            END IF;
            v_value := v_min + floor(random() * (v_max - v_min + 1))::integer;
            IF COALESCE(v_stat.is_percentage, false) THEN
                v_stats := jsonb_set(v_stats, ARRAY[v_stat_name], to_jsonb(v_value::text || '%'), true);
            ELSE
                v_stats := jsonb_set(v_stats, ARRAY[v_stat_name], to_jsonb(v_value), true);
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', v_item.id,
        'item_name', v_item.name,
        'rarity', v_rarity,
        'rolled_stats', v_stats
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.criar_personagem(
    p_name text,
    p_village_id integer,
    p_character_id text,
    p_avatar text,
    p_class text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_avatar text;
    v_class text := upper(trim(COALESCE(p_class, '')));
    v_name text := btrim(COALESCE(p_name, ''));
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;
    IF length(v_name) < 3 OR length(v_name) > 24 OR v_name ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION 'O nome deve ter entre 3 e 24 caracteres.';
    END IF;
    IF v_class NOT IN ('NIN', 'TAI', 'GEN', 'BUK') THEN
        RAISE EXCEPTION 'Classe inválida.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.villages WHERE id = p_village_id AND id <> 8) THEN
        RAISE EXCEPTION 'Vila inválida para criação de personagem.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = p_character_id) THEN
        RAISE EXCEPTION 'Personagem base inválido.';
    END IF;

    v_avatar := NULL;
    SELECT a.id INTO v_avatar
    FROM public.avatars AS a
    WHERE a.id = p_avatar AND (a.character_id IS NULL OR a.character_id::text = p_character_id)
    LIMIT 1;
    IF v_avatar IS NULL THEN
        SELECT a.id INTO v_avatar
        FROM public.avatars AS a
        WHERE a.character_id::text = p_character_id
        ORDER BY a.is_base DESC NULLS LAST, a.id
        LIMIT 1;
    END IF;

    INSERT INTO public.players (
        user_id, name, village_id, character_id, avatar, class,
        level, xp, ryous, pontos_atributos,
        forca, agilidade, resistencia, inteligencia, energia,
        ninjutsu, taijutsu, genjutsu, bukijutsu, selo
    )
    VALUES (
        auth.uid(), v_name, p_village_id, p_character_id, v_avatar, v_class,
        1, 0, 1000, 5,
        CASE v_class WHEN 'NIN' THEN 0 WHEN 'TAI' THEN 4 WHEN 'GEN' THEN 0 ELSE 3 END,
        CASE v_class WHEN 'NIN' THEN 2 WHEN 'TAI' THEN 3 WHEN 'GEN' THEN 2 ELSE 4 END,
        CASE v_class WHEN 'NIN' THEN 1 WHEN 'TAI' THEN 3 WHEN 'GEN' THEN 1 ELSE 2 END,
        CASE v_class WHEN 'NIN' THEN 4 WHEN 'TAI' THEN 1 WHEN 'GEN' THEN 4 ELSE 0 END,
        CASE v_class WHEN 'NIN' THEN 3 WHEN 'TAI' THEN 2 WHEN 'GEN' THEN 3 ELSE 1 END,
        CASE v_class WHEN 'NIN' THEN 5 WHEN 'TAI' THEN 1 WHEN 'GEN' THEN 1 ELSE 1 END,
        CASE v_class WHEN 'NIN' THEN 1 WHEN 'TAI' THEN 5 WHEN 'GEN' THEN 1 ELSE 1 END,
        CASE v_class WHEN 'NIN' THEN 1 WHEN 'TAI' THEN 0 WHEN 'GEN' THEN 5 ELSE 0 END,
        CASE v_class WHEN 'NIN' THEN 0 WHEN 'TAI' THEN 1 WHEN 'GEN' THEN 0 ELSE 5 END,
        CASE v_class WHEN 'NIN' THEN 3 WHEN 'TAI' THEN 0 WHEN 'GEN' THEN 3 ELSE 3 END
    )
    RETURNING * INTO v_player;

    RETURN jsonb_build_object('success', true, 'player', to_jsonb(v_player));
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Já existe um personagem com esse nome.';
END;
$function$;


CREATE OR REPLACE FUNCTION public.vender_itens_inventario(
    p_player_id integer,
    p_inventory_ids integer[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_owner uuid;
    v_ids integer[];
    v_total integer := 0;
    v_count integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;
    SELECT user_id INTO v_owner
    FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF v_owner IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;
    IF p_inventory_ids IS NULL OR cardinality(p_inventory_ids) = 0 OR cardinality(p_inventory_ids) > 100 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Seleção de itens inválida.');
    END IF;

    SELECT array_agg(x.id), COALESCE(sum(x.sell_value), 0)::integer, count(*)::integer
    INTO v_ids, v_total, v_count
    FROM (
        SELECT pi.id,
               CASE lower(COALESCE(pi.rarity, i.rarity, ''))
                   WHEN 'comum' THEN 50
                   WHEN 'incomum' THEN 150
                   ELSE 0
               END AS sell_value
        FROM public.player_inventory AS pi
        JOIN public.items AS i ON i.id = pi.item_id
        WHERE pi.player_id = p_player_id
          AND pi.id = ANY(p_inventory_ids)
          AND COALESCE(pi.is_equipped, false) = false
          AND COALESCE(pi.is_favorite, false) = false
          AND pi.is_server_acquired IS TRUE
        FOR UPDATE OF pi
    ) AS x
    WHERE x.sell_value > 0;

    IF COALESCE(v_count, 0) = 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum item elegível para venda.');
    END IF;

    DELETE FROM public.player_inventory
    WHERE player_id = p_player_id AND id = ANY(v_ids);

    UPDATE public.players
    SET ryous = COALESCE(ryous, 0) + v_total
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'sold_count', v_count, 'ryous_gained', v_total);
END;
$function$;


CREATE OR REPLACE FUNCTION public.reset_daily_progress(p_player_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_owner uuid;
    v_last_reset date;
    v_today date := (timezone('UTC', now()))::date;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT user_id, last_daily_reset INTO v_owner, v_last_reset
    FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    IF v_last_reset IS DISTINCT FROM v_today THEN
        UPDATE public.players
        SET last_daily_reset = v_today,
            daily_npcs_defeated = 0,
            daily_chakra_spent = 0,
            daily_trainings = 0,
            daily_rewards_claimed = '[]'::jsonb
        WHERE id = p_player_id;
        RETURN jsonb_build_object('success', true, 'reset', true, 'date', v_today);
    END IF;
    RETURN jsonb_build_object('success', true, 'reset', false, 'date', v_today);
END;
$function$;


CREATE OR REPLACE FUNCTION public.reivindicar_bonus_diario(p_player_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_owner uuid;
    v_last_claim date;
    v_today date := (timezone('UTC', now()))::date;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT user_id, last_daily_claim INTO v_owner, v_last_claim
    FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF v_owner IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;
    IF v_last_claim = v_today THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bônus diário já resgatado.');
    END IF;
    UPDATE public.players
    SET last_daily_claim = v_today,
        ryous = COALESCE(ryous, 0) + 50
    WHERE id = p_player_id;
    RETURN jsonb_build_object('success', true, 'reward_type', 'ryous', 'reward_amount', 50);
END;
$function$;


CREATE OR REPLACE FUNCTION public.reivindicar_recompensa_diaria(
    p_player_id integer,
    p_task_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_today date := (timezone('UTC', now()))::date;
    v_claimed jsonb;
    v_reward_type text;
    v_reward_amount integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player
    FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    IF v_player.last_daily_reset IS DISTINCT FROM v_today THEN
        UPDATE public.players
        SET last_daily_reset = v_today,
            daily_npcs_defeated = 0,
            daily_chakra_spent = 0,
            daily_trainings = 0,
            daily_rewards_claimed = '[]'::jsonb
        WHERE id = p_player_id;
        v_player.daily_npcs_defeated := 0;
        v_player.daily_chakra_spent := 0;
        v_player.daily_trainings := 0;
        v_player.daily_rewards_claimed := '[]'::jsonb;
    END IF;

    v_claimed := COALESCE(v_player.daily_rewards_claimed, '[]'::jsonb);
    IF v_claimed @> to_jsonb(p_task_key) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Recompensa já resgatada.');
    END IF;

    CASE p_task_key
        WHEN 't1' THEN
            IF COALESCE(v_player.daily_npcs_defeated, 0) < 3 THEN
                RETURN jsonb_build_object('success', false, 'error', 'Derrote 3 inimigos antes de resgatar.');
            END IF;
            v_reward_type := 'ryous';
            v_reward_amount := 20;
        WHEN 't2' THEN
            IF COALESCE(v_player.daily_chakra_spent, 0) < 100 THEN
                RETURN jsonb_build_object('success', false, 'error', 'Gaste 100 de Chakra antes de resgatar.');
            END IF;
            v_reward_type := 'ryous';
            v_reward_amount := 20;
        WHEN 't3' THEN
            IF COALESCE(v_player.daily_trainings, 0) < 1 THEN
                RETURN jsonb_build_object('success', false, 'error', 'Treine uma vez antes de resgatar.');
            END IF;
            v_reward_type := 'ryous';
            v_reward_amount := 20;
        WHEN 'chest' THEN
            IF NOT (v_claimed @> '["t1","t2","t3"]'::jsonb) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Complete as três tarefas antes de abrir o baú.');
            END IF;
            v_reward_type := 'vip_coins';
            v_reward_amount := floor(random() * 4)::integer + 2;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Tarefa diária inválida.');
    END CASE;

    v_claimed := v_claimed || to_jsonb(p_task_key);
    IF v_reward_type = 'ryous' THEN
        UPDATE public.players
        SET ryous = COALESCE(ryous, 0) + v_reward_amount,
            daily_rewards_claimed = v_claimed
        WHERE id = p_player_id;
    ELSE
        UPDATE public.players
        SET vip_coins = COALESCE(vip_coins, 0) + v_reward_amount,
            daily_rewards_claimed = v_claimed
        WHERE id = p_player_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'reward_type', v_reward_type, 'reward_amount', v_reward_amount);
END;
$function$;


CREATE OR REPLACE FUNCTION public.iniciar_missao(
    p_player_id integer,
    p_mission_id integer,
    p_duration_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_mission public.missions%ROWTYPE;
    v_active jsonb;
    v_end_time timestamptz;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active IS TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Missão indisponível.'); END IF;
    IF COALESCE(v_player.level, 1) < COALESCE(v_mission.req_level, 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nível insuficiente.');
    END IF;

    v_active := COALESCE(v_player.active_missions, '[]'::jsonb);
    IF jsonb_typeof(v_active) <> 'array' THEN RAISE EXCEPTION 'Estado de missões inválido.'; END IF;
    IF jsonb_array_length(v_active) >= GREATEST(1, COALESCE(v_player.mission_slots, 1)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Todos os espaços de missão estão ocupados.');
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_active) AS m(item)
        WHERE (m.item->>'mission_id')::integer = p_mission_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta missão já está ativa.');
    END IF;

    v_end_time := now() + make_interval(secs => GREATEST(1, COALESCE(v_mission.time_seconds, 1)));
    v_active := v_active || jsonb_build_array(jsonb_build_object(
        'mission_id', v_mission.id,
        'end_time', v_end_time,
        'title', v_mission.title
    ));
    UPDATE public.players SET active_missions = v_active WHERE id = p_player_id;
    RETURN jsonb_build_object('success', true, 'mission_id', p_mission_id, 'end_time', v_end_time);
END;
$function$;


CREATE OR REPLACE FUNCTION public.finalizar_missao(
    p_player_id integer,
    p_mission_id integer,
    p_mission_xp integer,
    p_mission_ryous integer,
    p_mission_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_mission public.missions%ROWTYPE;
    v_active jsonb;
    v_completed jsonb;
    v_end_time timestamptz;
    v_new_xp bigint;
    v_new_level integer;
    v_levels_gained integer := 0;
    v_new_rank text;
    v_mission_type text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Missão inexistente.'); END IF;

    v_active := COALESCE(v_player.active_missions, '[]'::jsonb);
    IF jsonb_typeof(v_active) <> 'array' THEN RAISE EXCEPTION 'Estado de missões inválido.'; END IF;

    SELECT (m.item->>'end_time')::timestamptz INTO v_end_time
    FROM jsonb_array_elements(v_active) AS m(item)
    WHERE (m.item->>'mission_id')::integer = p_mission_id
    LIMIT 1;

    IF v_end_time IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Missão não encontrada na lista ativa.'); END IF;
    IF now() < v_end_time THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tempo da missão ainda não acabou.',
          'remaining_seconds', extract(epoch FROM (v_end_time - now())));
    END IF;

    SELECT COALESCE(jsonb_agg(m.item), '[]'::jsonb) INTO v_active
    FROM jsonb_array_elements(COALESCE(v_player.active_missions, '[]'::jsonb)) AS m(item)
    WHERE (m.item->>'mission_id')::integer <> p_mission_id;

    v_completed := COALESCE(v_player.completed_missions, '[]'::jsonb);
    IF NOT (v_completed @> to_jsonb(p_mission_id)) THEN
        v_completed := v_completed || to_jsonb(p_mission_id);
    END IF;

    v_new_xp := COALESCE(v_player.xp, 0) + GREATEST(0, COALESCE(v_mission.xp, 0));
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));
    v_new_rank := v_player.rank;
    v_mission_type := COALESCE(v_mission.mission_type, '');

    IF v_new_level >= 5 AND v_player.rank = 'Estudante da Academia' THEN
        v_new_rank := 'Genin';
    END IF;

    UPDATE public.players
    SET active_missions = v_active,
        completed_missions = v_completed,
        xp = v_new_xp,
        level = v_new_level,
        rank = v_new_rank,
        pontos_atributos = COALESCE(pontos_atributos, 0) + (v_levels_gained * 5),
        ryous = COALESCE(ryous, 0) + GREATEST(0, COALESCE(v_mission.ryous, 0)),
        tasks_completed = CASE WHEN v_mission_type = 'tarefa_academia' THEN COALESCE(tasks_completed, 0) + 1 ELSE tasks_completed END,
        missions_d = CASE WHEN v_mission_type = 'D' THEN COALESCE(missions_d, 0) + 1 ELSE missions_d END,
        missions_c = CASE WHEN v_mission_type = 'C' THEN COALESCE(missions_c, 0) + 1 ELSE missions_c END,
        missions_b = CASE WHEN v_mission_type = 'B' THEN COALESCE(missions_b, 0) + 1 ELSE missions_b END,
        missions_a = CASE WHEN v_mission_type = 'A' THEN COALESCE(missions_a, 0) + 1 ELSE missions_a END,
        missions_s = CASE WHEN v_mission_type = 'S' THEN COALESCE(missions_s, 0) + 1 ELSE missions_s END
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'xp_gained', GREATEST(0, COALESCE(v_mission.xp, 0)),
        'ryous_gained', GREATEST(0, COALESCE(v_mission.ryous, 0)), 'levels_gained', v_levels_gained, 'new_rank', v_new_rank);
END;
$function$;


CREATE OR REPLACE FUNCTION public.treinar_atributo(
    p_player_id integer,
    p_atributo text,
    p_hero_min integer,
    p_hero_max integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_attribute public.attributes%ROWTYPE;
    v_rank public.ranks%ROWTYPE;
    v_min_gain integer;
    v_max_gain integer;
    v_roll integer;
    v_total_gain integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    IF p_atributo NOT IN ('ninjutsu','taijutsu','genjutsu','bukijutsu','forca','agilidade','resistencia','energia','selo','inteligencia') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atributo inválido.');
    END IF;

    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;
    IF COALESCE(v_player.pontos_atributos, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sem pontos de atributo.');
    END IF;

    SELECT * INTO v_attribute FROM public.attributes WHERE field = p_atributo LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Atributo indisponível.'); END IF;

    SELECT * INTO v_rank FROM public.ranks r
    WHERE lower(COALESCE(r.title, '')) = lower(COALESCE(v_player.rank, ''))
       OR lower(COALESCE(r.name_id, '')) = lower(COALESCE(v_player.rank, ''))
       OR (lower(COALESCE(v_player.rank,'')) = 'jounin' AND lower(COALESCE(r.name_id,'')) = 'jonin')
       OR (lower(COALESCE(v_player.rank,'')) = 'herói' AND lower(COALESCE(r.name_id,'')) = 'heroi')
    ORDER BY r.id LIMIT 1;

    v_min_gain := GREATEST(1, floor(COALESCE(v_attribute.hero_min, 1) * COALESCE(v_rank.train_min_mult, 0.2))::integer);
    v_max_gain := GREATEST(v_min_gain, floor(COALESCE(v_attribute.hero_max, 1) * COALESCE(v_rank.train_max_mult, 0.3))::integer);
    v_roll := v_min_gain + floor(random() * (v_max_gain - v_min_gain + 1))::integer;
    v_total_gain := v_roll + COALESCE(v_rank.train_bonus, 1);

    EXECUTE format(
        'UPDATE public.players SET %I = COALESCE(%I, 0) + $1, pontos_atributos = COALESCE(pontos_atributos,0) - 1, daily_trainings = COALESCE(daily_trainings,0) + 1 WHERE id = $2',
        p_atributo, p_atributo
    ) USING v_total_gain, p_player_id;

    RETURN jsonb_build_object('success', true, 'gained', v_total_gain, 'roll', v_roll, 'bonus', COALESCE(v_rank.train_bonus,1));
END;
$function$;


CREATE OR REPLACE FUNCTION public.promover_graduacao(
    p_player_id integer,
    p_novo_rank text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_current public.ranks%ROWTYPE;
    v_target public.ranks%ROWTYPE;
    v_jutsu_count integer;
    v_jutsu2_count integer;
    v_jutsu3_count integer;
    v_combat_points numeric;
    v_bonus integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_current FROM public.ranks r
    WHERE lower(r.name_id) = lower(v_player.rank)
       OR lower(r.title) = lower(v_player.rank)
       OR (lower(v_player.rank)='jounin' AND lower(r.name_id)='jonin')
       OR (lower(v_player.rank)='herói' AND lower(r.name_id)='heroi')
    ORDER BY r.id LIMIT 1;
    IF NOT FOUND THEN
        SELECT * INTO v_current FROM public.ranks WHERE lower(name_id)='estudante' LIMIT 1;
    END IF;

    SELECT * INTO v_target FROM public.ranks WHERE id = v_current.id + 1 LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Você já alcançou a graduação máxima.'); END IF;
    IF lower(COALESCE(p_novo_rank,'')) NOT IN (lower(v_target.title), lower(v_target.name_id),
       CASE WHEN v_target.name_id='jonin' THEN 'jounin' ELSE lower(v_target.title) END,
       CASE WHEN v_target.name_id='sannin' THEN 'sannin' ELSE lower(v_target.title) END,
       CASE WHEN v_target.name_id='heroi' THEN 'herói' ELSE lower(v_target.title) END) THEN
        RETURN jsonb_build_object('success', false, 'error', 'A próxima graduação foi alterada. Atualize a página.');
    END IF;

    v_combat_points := (((COALESCE(v_player.wins_pvp,0) + COALESCE(v_player.losses_pvp,0)) * 1.5)
        + COALESCE(v_player.npc_wins,0) + COALESCE(v_player.wins_dojo,0));
    SELECT count(*)::integer,
           count(*) FILTER (WHERE COALESCE((e.item->>'level')::integer,1) >= 2)::integer,
           count(*) FILTER (WHERE COALESCE((e.item->>'level')::integer,1) >= 3)::integer
      INTO v_jutsu_count, v_jutsu2_count, v_jutsu3_count
      FROM jsonb_array_elements(COALESCE(v_player.jutsus_learned,'[]'::jsonb)) AS e(item);

    IF COALESCE(v_player.level,1) < COALESCE(v_target.req_level,0)
       OR COALESCE(v_player.tasks_completed,0) < COALESCE(v_target.req_tasks,0)
       OR v_jutsu_count < COALESCE(v_target.req_jutsus,0)
       OR COALESCE(v_player.missions_d,0) < COALESCE(v_target.req_missions_d,0)
       OR COALESCE(v_player.missions_c,0) < COALESCE(v_target.req_missions_c,0)
       OR COALESCE(v_player.missions_b,0) < COALESCE(v_target.req_missions_b,0)
       OR COALESCE(v_player.missions_a,0) < COALESCE(v_target.req_missions_a,0)
       OR COALESCE(v_player.missions_s,0) < COALESCE(v_target.req_missions_s,0)
       OR COALESCE(v_player.npc_wins,0) < COALESCE(v_target.req_npc_wins,0)
       OR v_combat_points < COALESCE(v_target.req_combat_points,0)
       OR COALESCE(v_jutsu2_count,0) < COALESCE(v_target.req_jutsus_lvl2,0)
       OR COALESCE(v_jutsu3_count,0) < COALESCE(v_target.req_jutsus_lvl3,0)
       OR COALESCE(v_player.bingo_book_kills,0) < COALESCE(v_target.req_bingo_book,0)
       OR (v_target.name_id='chunin' AND COALESCE(v_player.passou_exame_chunin,false) IS NOT TRUE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Os requisitos de graduação ainda não foram cumpridos.');
    END IF;

    v_bonus := CASE v_target.name_id
        WHEN 'genin' THEN 5 WHEN 'chunin' THEN 10 WHEN 'jonin' THEN 20
        WHEN 'anbu' THEN 35 WHEN 'sannin' THEN 50 WHEN 'heroi' THEN 100 ELSE 0 END;

    UPDATE public.players
    SET rank = v_target.title,
        pontos_atributos = COALESCE(pontos_atributos,0) + v_bonus
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'new_rank', v_target.title, 'bonus_points', v_bonus);
END;
$function$;


CREATE OR REPLACE FUNCTION public.aprender_kinjutsu(
    p_player_id integer,
    p_jutsu_id integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_jutsu public.jutsus%ROWTYPE;
    v_cost integer;
    v_learned jsonb;
    v_rank_value integer;
    v_req_rank_value integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_jutsu FROM public.jutsus WHERE id = p_jutsu_id AND is_active IS TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Técnica indisponível.'); END IF;
    IF v_jutsu.req_clan IS NULL OR lower(translate(COALESCE(v_player.clan,''),'ūō','uo')) <> lower(translate(v_jutsu.req_clan,'ūō','uo')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta técnica exige um clã específico.');
    END IF;
    IF COALESCE(v_player.level,1) < COALESCE(v_jutsu.req_level,1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nível insuficiente.');
    END IF;

    v_rank_value := CASE
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%estudante%' THEN 0
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%genin%' THEN 1
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%chunin%' THEN 2
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%jounin%' OR lower(COALESCE(v_player.rank,'')) LIKE '%jonin%' THEN 3
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%anbu%' THEN 4
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%sannin%' THEN 5
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%heroi%' OR lower(COALESCE(v_player.rank,'')) LIKE '%herói%' THEN 6
        ELSE 0 END;
    v_req_rank_value := CASE
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%estudante%' THEN 0
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%genin%' THEN 1
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%chunin%' THEN 2
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%jounin%' OR lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%jonin%' THEN 3
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%anbu%' THEN 4
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%sannin%' THEN 5
        WHEN lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%heroi%' OR lower(COALESCE(v_jutsu.req_rank,'')) LIKE '%herói%' THEN 6
        ELSE 0 END;
    IF v_rank_value < v_req_rank_value THEN RETURN jsonb_build_object('success', false, 'error', 'Graduação insuficiente.'); END IF;
    IF COALESCE(v_player.selo,0) < COALESCE(v_jutsu.req_seals,0) THEN RETURN jsonb_build_object('success', false, 'error', 'Selo insuficiente.'); END IF;

    v_learned := COALESCE(v_player.jutsus_learned, '[]'::jsonb);
    IF jsonb_typeof(v_learned) <> 'array' THEN RAISE EXCEPTION 'Estado de jutsus inválido.'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_learned) AS e(item)
        WHERE COALESCE(e.item->>'id', trim(both '"' FROM e.item::text)) = p_jutsu_id::text) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você já aprendeu esta técnica.');
    END IF;

    v_cost := GREATEST(0, COALESCE(v_jutsu.cost_ryous, 0));
    IF COALESCE(v_player.ryous,0) < v_cost THEN RETURN jsonb_build_object('success', false, 'error', 'Ryous insuficientes.'); END IF;

    UPDATE public.players
    SET ryous = COALESCE(ryous,0) - v_cost,
        jutsus_learned = v_learned || jsonb_build_array(jsonb_build_object('id', p_jutsu_id, 'level', 1, 'slots', jsonb_build_array(NULL,NULL,NULL)))
    WHERE id = p_player_id;

    INSERT INTO public.player_jutsus (player_id, jutsu_id, level, is_equipped)
    VALUES (p_player_id, p_jutsu_id, 1, false);

    RETURN jsonb_build_object('success', true, 'cost', v_cost, 'jutsu_id', p_jutsu_id);
END;
$function$;


CREATE OR REPLACE FUNCTION public.resolver_limpeza_rapida(
    p_player_id integer,
    p_fight_count integer
) RETURNS jsonb
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
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    IF p_fight_count IS NULL OR p_fight_count < 1 OR p_fight_count > 10 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantidade de lutas inválida (1 a 10).');
    END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    v_stamina_cost := p_fight_count * 25;
    v_current_stamina := COALESCE(v_player.stamina,
        100 + COALESCE(v_player.level,1) * 20 + COALESCE(v_player.energia,0) * 5
        + COALESCE(v_player.taijutsu,0) * 5 + COALESCE(v_player.bukijutsu,0) * 5
        + CASE WHEN lower(COALESCE(v_player.rank,'')) LIKE '%genin%' THEN 150
               WHEN lower(COALESCE(v_player.rank,'')) LIKE '%chunin%' THEN 300
               WHEN lower(COALESCE(v_player.rank,'')) LIKE '%jounin%' OR lower(COALESCE(v_player.rank,'')) LIKE '%jonin%' THEN 500
               WHEN lower(COALESCE(v_player.rank,'')) LIKE '%anbu%' THEN 800
               WHEN lower(COALESCE(v_player.rank,'')) LIKE '%sannin%' THEN 1200
               WHEN lower(COALESCE(v_player.rank,'')) LIKE '%heroi%' OR lower(COALESCE(v_player.rank,'')) LIKE '%herói%' THEN 2000
               ELSE 0 END);
    IF v_current_stamina < v_stamina_cost THEN
        RETURN jsonb_build_object('success', false, 'error', format('Stamina insuficiente: requer %s.', v_stamina_cost));
    END IF;

    FOR v_i IN 1..p_fight_count LOOP
        IF random() <= 0.85 THEN
            v_wins := v_wins + 1;
            v_xp := v_xp + floor(COALESCE(v_player.level,1) * 40 + 150)::integer;
            v_ryous := v_ryous + floor(COALESCE(v_player.level,1) * 25 + 80)::integer;
        ELSE
            v_losses := v_losses + 1;
        END IF;
    END LOOP;

    IF v_wins > 0 THEN
        v_xp := floor(v_xp * (0.9 + random() * 0.2))::integer;
        v_ryous := floor(v_ryous * (0.9 + random() * 0.2))::integer;

        v_tier := CASE lower(COALESCE(v_player.rank,'')) 
            WHEN 'chunin' THEN 2 WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
            WHEN 'anbu' THEN 4 WHEN 'sannin' THEN 4 WHEN 'herói' THEN 5 WHEN 'heroi' THEN 5 ELSE 1 END;
        v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);

        FOR v_j IN 1..v_wins LOOP
            IF random() <= 0.02 THEN v_coin_drops := v_coin_drops + 1; END IF;

            IF random() <= 0.25 THEN
                v_loot := public.kurokage_roll_loot(v_player.rank);
                IF COALESCE((v_loot->>'success')::boolean,false) THEN
                    INSERT INTO public.player_inventory (player_id,item_id,is_equipped,is_favorite,rarity,rolled_stats)
                    VALUES (p_player_id,(v_loot->>'item_id')::integer,false,false,v_loot->>'rarity',COALESCE(v_loot->'rolled_stats','{}'::jsonb));
                    v_equipment_drops := v_equipment_drops + 1;
                    v_drop_items := v_drop_items || jsonb_build_array(jsonb_build_object('name',v_loot->>'item_name','rarity',v_loot->>'rarity'));
                END IF;
            END IF;

            IF random() <= 0.15 THEN
                v_essence_type := (ARRAY['dano','custo','letalidade','protecao'])[floor(random()*4)::integer + 1];
                v_essence_key := v_essence_type || '_' || v_tier::text;
                v_essences := jsonb_set(v_essences, ARRAY[v_essence_key], to_jsonb(COALESCE((v_essences->>v_essence_key)::integer,0)+1), true);
                v_essence_drops := v_essence_drops + 1;
            END IF;
        END LOOP;
    ELSE
        v_essences := COALESCE(v_player.inventory_essences, '{}'::jsonb);
    END IF;

    v_new_xp := COALESCE(v_player.xp,0) + v_xp;
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0,v_new_level-COALESCE(v_player.level,1));

    UPDATE public.players
    SET stamina = v_current_stamina - v_stamina_cost,
        xp = v_new_xp,
        level = v_new_level,
        pontos_atributos = COALESCE(pontos_atributos,0) + v_levels_gained * 3,
        ryous = COALESCE(ryous,0) + v_ryous,
        vip_coins = COALESCE(vip_coins,0) + v_coin_drops,
        inventory_essences = v_essences,
        wins_dojo = COALESCE(wins_dojo,0) + v_wins,
        dojo_clears = COALESCE(dojo_clears,0) + v_wins
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success',true,'wins',v_wins,'losses',v_losses,
        'xp_gained',v_xp,'ryous_gained',v_ryous,'levels_gained',v_levels_gained,
        'kuro_coins_dropped',v_coin_drops,'equipment_drops',v_equipment_drops,
        'essence_drops',v_essence_drops,'dropped_items',v_drop_items,
        'stamina_remaining',v_current_stamina-v_stamina_cost);
END;
$function$;


CREATE OR REPLACE FUNCTION public.finalizar_combate(
    p_player_id integer,
    p_enemy_id integer,
    p_result text,
    p_turn_count integer,
    p_combat_log jsonb,
    p_fallback_xp integer,
    p_fallback_ryous integer,
    p_enemy_name text,
    p_from_map boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
                WHEN 'anbu' THEN 4 WHEN 'sannin' THEN 4 WHEN 'herói' THEN 5 WHEN 'heroi' THEN 5 ELSE 1 END;
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
$function$;


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
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT p.* INTO v_player FROM public.players AS p WHERE p.id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT e.* INTO v_event FROM public.global_events AS e
    WHERE e.id = p_event_id AND e.is_world_boss IS TRUE AND e.is_active IS TRUE
    FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_event.boss_hp,0) <= 0 THEN RAISE EXCEPTION 'Este chefe mundial não está disponível.'; END IF;
    IF v_event.ends_at IS NOT NULL AND v_event.ends_at <= now() THEN RAISE EXCEPTION 'O evento do chefe mundial já terminou.'; END IF;
    IF extract(dow FROM timezone('America/Belem',now())) IN (0,6) THEN RAISE EXCEPTION 'O World Boss descansa nos finais de semana.'; END IF;

    v_max_tickets := CASE
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%chunin%' THEN 3
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%jounin%' OR lower(COALESCE(v_player.rank,'')) LIKE '%jonin%' OR lower(COALESCE(v_player.rank,'')) LIKE '%anbu%' THEN 4
        WHEN lower(COALESCE(v_player.rank,'')) LIKE '%sannin%' OR lower(COALESCE(v_player.rank,'')) LIKE '%herói%' OR lower(COALESCE(v_player.rank,'')) LIKE '%heroi%' THEN 5
        ELSE 2 END;
    v_current_tickets := CASE WHEN v_player.last_event_date = v_today THEN COALESCE(v_player.event_tickets,v_max_tickets) ELSE v_max_tickets END;
    IF v_current_tickets <= 0 THEN RAISE EXCEPTION 'Você não tem mais entradas diárias para hoje.'; END IF;

    INSERT INTO public.world_boss_sessions (player_id,event_id) VALUES (p_player_id,p_event_id) RETURNING id INTO v_session_id;
    UPDATE public.players SET last_event_date=v_today,event_tickets=v_current_tickets-1 WHERE id=p_player_id;

    RETURN jsonb_build_object('success',true,'session_id',v_session_id,'event_id',v_event.id,
        'event_name',v_event.name,'boss_hp',v_event.boss_hp,'boss_max_hp',v_event.boss_max_hp,'tickets_remaining',v_current_tickets-1);
END;
$function$;





























CREATE OR REPLACE FUNCTION public.trair_vila(p_player_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.players WHERE id=p_player_id AND user_id=auth.uid()) THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;
    UPDATE public.players SET village_id=8,vila_atual_id=8,clan=NULL,clan_id=NULL,rank='Nukenin' WHERE id=p_player_id;
    RETURN jsonb_build_object('success',true);
END;
$function$;


-- Economy-critical RPC permissions.
REVOKE ALL ON FUNCTION public.criar_personagem(text,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.criar_personagem(text,integer,text,text,text) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.vender_itens_inventario(integer,integer[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.vender_itens_inventario(integer,integer[]) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.resolver_limpeza_rapida(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolver_limpeza_rapida(integer,integer) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.reivindicar_bonus_diario(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reivindicar_bonus_diario(integer) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.reset_daily_progress(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reset_daily_progress(integer) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.reivindicar_recompensa_diaria(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reivindicar_recompensa_diaria(integer,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.reivindicar_recompensa_diaria(integer,integer,text,integer) FROM PUBLIC,anon,authenticated;

REVOKE ALL ON FUNCTION public.iniciar_missao(integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.iniciar_missao(integer,integer,integer) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.finalizar_missao(integer,integer,integer,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalizar_missao(integer,integer,integer,integer,text) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.treinar_atributo(integer,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.treinar_atributo(integer,text,integer,integer) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.promover_graduacao(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.promover_graduacao(integer,text) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.aprender_kinjutsu(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.aprender_kinjutsu(integer,integer) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.trair_vila(integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.trair_vila(integer) TO authenticated,service_role;

REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb,integer,integer,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb,integer,integer,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb,integer,integer,text,boolean) TO authenticated,service_role;

-- Remove direct client writes to core economy/progression and mission/daily state.
REVOKE INSERT ON public.players FROM PUBLIC,anon,authenticated;
REVOKE UPDATE ON public.players FROM PUBLIC,anon,authenticated;
DO $grant_safe_player_updates$
DECLARE
    c record;
    v_protected text[] := ARRAY[
        'id','user_id','created_at','level','xp','ryous','vip_coins','pontos_atributos',
        'last_daily_claim','last_daily_reset','daily_rewards_claimed',
        'event_tickets','last_event_date','active_missions','completed_missions',
        'daily_npcs_defeated','daily_trainings','rank'
    ];
BEGIN
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='players'
          AND NOT (column_name = ANY(v_protected))
    LOOP
        EXECUTE format('GRANT UPDATE (%I) ON TABLE public.players TO authenticated', c.column_name);
    END LOOP;
END;
$grant_safe_player_updates$;

GRANT SELECT,DELETE ON public.players TO authenticated;
REVOKE INSERT ON public.player_jutsus FROM PUBLIC,anon,authenticated;

-- Inventory writes are performed by SECURITY DEFINER reward/shop functions.
-- Clients can still equip/favorite and delete their own rows, but cannot create
-- trusted loot or change rarity, stats, item identity, or refinement level.
REVOKE INSERT,UPDATE ON public.player_inventory FROM PUBLIC,anon,authenticated;
GRANT UPDATE (is_equipped,is_favorite) ON public.player_inventory TO authenticated;

REVOKE ALL ON FUNCTION public.kurokage_roll_loot(text) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst, 'reload schema';
