-- Migration 043: server-authoritative passive HP/Chakra/Stamina regeneration.
-- Client timers may request regeneration, but cannot submit resource values or
-- choose the amount restored. One request can restore at most 40% of each max stat
-- and successful/empty ticks both advance the server-side cooldown.

ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS resources_regenerated_at timestamptz;

UPDATE public.players
SET resources_regenerated_at = now()
WHERE resources_regenerated_at IS NULL;

ALTER TABLE public.players
    ALTER COLUMN resources_regenerated_at SET DEFAULT now(),
    ALTER COLUMN resources_regenerated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.regenerar_recursos_jogador(p_player_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_now timestamptz := clock_timestamp();
    v_last timestamptz;
    v_max_hp integer;
    v_max_chakra integer;
    v_max_stamina integer;
    v_old_hp integer;
    v_old_chakra integer;
    v_old_stamina integer;
    v_new_hp integer;
    v_new_chakra integer;
    v_new_stamina integer;
    v_changed boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    v_last := COALESCE(v_player.resources_regenerated_at, v_now);
    IF v_now < v_last + interval '60 seconds' THEN
        RETURN jsonb_build_object(
            'success', true,
            'regenerated', false,
            'reason', 'cooldown'
        );
    END IF;

    IF COALESCE(v_player.is_fainted, false) THEN
        UPDATE public.players
        SET resources_regenerated_at = v_now
        WHERE id = p_player_id;

        RETURN jsonb_build_object(
            'success', true,
            'regenerated', false,
            'reason', 'fainted'
        );
    END IF;

    v_max_hp := public.kurokage_player_max_stat(p_player_id, 'hp');
    v_max_chakra := public.kurokage_player_max_stat(p_player_id, 'chakra');
    v_max_stamina := public.kurokage_player_max_stat(p_player_id, 'stamina');

    v_old_hp := LEAST(v_max_hp, GREATEST(0, COALESCE(v_player.hp, v_max_hp)));
    v_old_chakra := LEAST(v_max_chakra, GREATEST(0, COALESCE(v_player.chakra, v_max_chakra)));
    v_old_stamina := LEAST(v_max_stamina, GREATEST(0, COALESCE(v_player.stamina, v_max_stamina)));

    v_new_hp := LEAST(v_max_hp, v_old_hp + GREATEST(1, FLOOR(v_max_hp * 0.4)::integer));
    v_new_chakra := LEAST(v_max_chakra, v_old_chakra + GREATEST(1, FLOOR(v_max_chakra * 0.4)::integer));
    v_new_stamina := LEAST(v_max_stamina, v_old_stamina + GREATEST(1, FLOOR(v_max_stamina * 0.4)::integer));

    v_changed := v_new_hp > v_old_hp
        OR v_new_chakra > v_old_chakra
        OR v_new_stamina > v_old_stamina;

    UPDATE public.players
    SET hp = v_new_hp,
        chakra = v_new_chakra,
        stamina = v_new_stamina,
        resources_regenerated_at = v_now
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'regenerated', v_changed,
        'hp', v_new_hp,
        'chakra', v_new_chakra,
        'stamina', v_new_stamina,
        'max_hp', v_max_hp,
        'max_chakra', v_max_chakra,
        'max_stamina', v_max_stamina
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.regenerar_recursos_jogador(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regenerar_recursos_jogador(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
