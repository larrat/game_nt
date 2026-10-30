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

REVOKE ALL ON FUNCTION public.criar_personagem(text,integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_personagem(text,integer,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.excluir_personagem(
    p_player_id integer,
    p_confirmation text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;
    IF p_player_id IS NULL OR p_player_id <= 0 THEN
        RAISE EXCEPTION 'Personagem inválido.';
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text, 72919));

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou acesso não autorizado.';
    END IF;
    IF p_confirmation IS DISTINCT FROM v_player.name THEN
        RAISE EXCEPTION 'Confirme digitando o nome exato do personagem.';
    END IF;

    -- The one NO ACTION foreign key requires removing battle logs explicitly.
    -- Other player-owned dependent tables have ON DELETE CASCADE.
    DELETE FROM public.battle_logs WHERE player_id = v_player.id;
    DELETE FROM public.players WHERE id = v_player.id AND user_id = auth.uid();
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível remover o personagem.';
    END IF;

    RETURN jsonb_build_object('success', true, 'deleted_id', v_player.id);
END;
$function$;

REVOKE ALL ON FUNCTION public.excluir_personagem(integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_personagem(integer,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
