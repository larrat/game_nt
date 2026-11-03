-- 073: Starting avatar authorization at the server boundary.
-- Apply only after two-account staging tests; no production player rows are changed.
-- Base selection remains valid for the current catalog characters.
-- Existing players are NOT modified or rebalanced by this migration.
-- Registration lifecycle: preserve the live server-assigned starting stats.
-- Apply before deploying frontend that calls excluir_personagem.
-- No player data changes at migration time.
CREATE OR REPLACE FUNCTION public.criar_personagem(p_name text, p_village_id integer, p_character_id text, p_avatar text, p_class text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_avatar text;
    v_class text := upper(trim(COALESCE(p_class, '')));
    v_name text := btrim(COALESCE(p_name, ''));
    v_existing_count integer;
    v_stats jsonb;
    v_starting_total integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;
    -- Prevent parallel requests from exceeding the account's character slots.
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 72919));
    SELECT count(*) INTO v_existing_count
      FROM public.players WHERE user_id = auth.uid();
    IF v_existing_count >= 3 THEN
        RAISE EXCEPTION 'Limite de 3 personagens por conta atingido.';
    END IF;

    IF length(v_name) < 3 OR length(v_name) > 24 OR v_name ~ '[[:cntrl:]]' THEN
        RAISE EXCEPTION 'O nome deve ter entre 3 e 24 caracteres.';
    END IF;
    IF v_class NOT IN ('NIN', 'TAI', 'GEN', 'BUK') THEN
        RAISE EXCEPTION 'Classe inválida.';
    END IF;
    -- All four classes start with the same ten allocated points.
    -- No extra free points at creation; specialist distributions differ only by class.
    v_stats := CASE v_class WHEN 'NIN' THEN '{"forca":0,"agilidade":1,"resistencia":1,"inteligencia":2,"energia":1,"ninjutsu":3,"taijutsu":0,"genjutsu":1,"bukijutsu":0,"selo":1}'::jsonb WHEN 'TAI' THEN '{"forca":2,"agilidade":2,"resistencia":1,"inteligencia":0,"energia":1,"ninjutsu":0,"taijutsu":3,"genjutsu":0,"bukijutsu":1,"selo":0}'::jsonb WHEN 'GEN' THEN '{"forca":0,"agilidade":1,"resistencia":1,"inteligencia":2,"energia":1,"ninjutsu":0,"taijutsu":0,"genjutsu":3,"bukijutsu":0,"selo":2}'::jsonb WHEN 'BUK' THEN '{"forca":2,"agilidade":2,"resistencia":1,"inteligencia":0,"energia":1,"ninjutsu":0,"taijutsu":0,"genjutsu":0,"bukijutsu":3,"selo":1}'::jsonb END;
    SELECT COALESCE(sum(t.value::integer), 0) INTO v_starting_total
      FROM pg_catalog.jsonb_each_text(v_stats) AS t;
    IF v_starting_total <> 10 OR pg_catalog.jsonb_object_length(v_stats) <> 10
       OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_each_text(v_stats) AS t WHERE t.value::integer < 0) THEN
        RAISE EXCEPTION 'Configuração de atributos iniciais inválida.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.villages WHERE id = p_village_id AND id <> 8) THEN
        RAISE EXCEPTION 'Vila inválida para criação de personagem.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.characters WHERE id = p_character_id) THEN
        RAISE EXCEPTION 'Personagem base inválido.';
    END IF;

    -- Only the explicitly selected starting appearance may be equipped.
    -- Reject locked evolutions and foreign character avatars at the API layer.
    SELECT a.id INTO v_avatar
    FROM public.avatars AS a
    WHERE a.id = p_avatar
      AND a.character_id = p_character_id
      AND a.is_base IS TRUE
    LIMIT 1;
    IF v_avatar IS NULL THEN
        RAISE EXCEPTION 'Visual inicial inválido ou não disponível para este personagem.';
    END IF;

    INSERT INTO public.players (
        user_id, name, village_id, character_id, avatar, class,
        level, xp, ryous, pontos_atributos,
        forca, agilidade, resistencia, inteligencia, energia,
        ninjutsu, taijutsu, genjutsu, bukijutsu, selo
    )
    VALUES (
        auth.uid(), v_name, p_village_id, p_character_id, v_avatar, v_class,
        1, 0, 1000, 0,
        (v_stats->>'forca')::integer,
        (v_stats->>'agilidade')::integer,
        (v_stats->>'resistencia')::integer,
        (v_stats->>'inteligencia')::integer,
        (v_stats->>'energia')::integer,
        (v_stats->>'ninjutsu')::integer,
        (v_stats->>'taijutsu')::integer,
        (v_stats->>'genjutsu')::integer,
        (v_stats->>'bukijutsu')::integer,
        (v_stats->>'selo')::integer
    )
    RETURNING * INTO v_player;

    RETURN jsonb_build_object('success', true, 'player', to_jsonb(v_player));
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Já existe um personagem com esse nome.';
END;
$function$;


REVOKE ALL ON FUNCTION public.criar_personagem(text,integer,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.criar_personagem(text,integer,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
