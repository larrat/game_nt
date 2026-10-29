-- 058: treinamento de atributos em lote, validado e atômico.
-- Mantém a RPC treinar_atributo para compatibilidade com clientes antigos.
-- Cada ponto realiza uma rolagem independente com as mesmas regras atuais.
CREATE OR REPLACE FUNCTION public.treinar_atributos(
    p_player_id integer,
    p_atributo text,
    p_quantidade integer
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
    v_bonus integer;
    v_roll integer;
    v_total_gain integer := 0;
    v_index integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_quantidade IS NULL OR p_quantidade NOT BETWEEN 1 AND 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selecione de 1 a 5 pontos de treino.');
    END IF;

    IF p_atributo IS NULL OR p_atributo NOT IN (
        'ninjutsu','taijutsu','genjutsu','bukijutsu','forca',
        'agilidade','resistencia','energia','selo','inteligencia'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atributo inválido.');
    END IF;

    SELECT * INTO v_player
      FROM public.players
     WHERE id = p_player_id
     FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Ação não autorizada.';
    END IF;

    IF COALESCE(v_player.pontos_atributos, 0) < p_quantidade THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pontos de atributo insuficientes.');
    END IF;

    SELECT * INTO v_attribute FROM public.attributes
     WHERE field = p_atributo LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Atributo indisponível.');
    END IF;

    SELECT * INTO v_rank FROM public.ranks r
     WHERE lower(COALESCE(r.title, '')) = lower(COALESCE(v_player.rank, ''))
        OR lower(COALESCE(r.name_id, '')) = lower(COALESCE(v_player.rank, ''))
        OR (lower(COALESCE(v_player.rank, '')) = 'jounin' AND lower(COALESCE(r.name_id, '')) = 'jonin')
        OR (lower(COALESCE(v_player.rank, '')) = 'herói' AND lower(COALESCE(r.name_id, '')) = 'heroi')
     ORDER BY r.id LIMIT 1;

    v_min_gain := GREATEST(1,
        floor(COALESCE(v_attribute.hero_min, 1) * COALESCE(v_rank.train_min_mult, 0.2))::integer
    );
    v_max_gain := GREATEST(v_min_gain,
        floor(COALESCE(v_attribute.hero_max, 1) * COALESCE(v_rank.train_max_mult, 0.3))::integer
    );
    v_bonus := COALESCE(v_rank.train_bonus, 1);

    FOR v_index IN 1..p_quantidade LOOP
        v_roll := v_min_gain + floor(random() * (v_max_gain - v_min_gain + 1))::integer;
        v_total_gain := v_total_gain + v_roll + v_bonus;
    END LOOP;

    EXECUTE format(
        'UPDATE public.players SET %I = COALESCE(%I, 0) + $1, pontos_atributos = pontos_atributos - $2, daily_trainings = COALESCE(daily_trainings, 0) + $2 WHERE id = $3',
        p_atributo, p_atributo
    ) USING v_total_gain, p_quantidade, p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'gained', v_total_gain,
        'quantity', p_quantidade,
        'attribute', p_atributo,
        'min_per_point', v_min_gain + v_bonus,
        'max_per_point', v_max_gain + v_bonus,
        'remaining_points', v_player.pontos_atributos - p_quantidade
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.treinar_atributos(integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.treinar_atributos(integer, text, integer) TO authenticated;
