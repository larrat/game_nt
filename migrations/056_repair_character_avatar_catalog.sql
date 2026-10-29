-- Migration 056: repair the character catalog and make avatar changes owner- and character-scoped.

-- Keep Sasuke's established ID (2), which is used by the original seed and existing player.
-- The duplicate row (99) owns the existing 28-avatar catalogue; move that catalogue to ID 2
-- before removing the duplicate row. No avatar IDs or player inventory entries are deleted.
UPDATE public.players
SET character_id = '2'
WHERE character_id = '99';

UPDATE public.avatars
SET character_id = '2'
WHERE character_id = '99';

UPDATE public.characters
SET name = 'Sasuke Uchiha (Clássico)',
    description = 'O último sobrevivente do clã Uchiha, movido pela vingança e em busca de poder a qualquer custo.',
    base_avatar_url = '/images/avatares/sasuke_01_kunai.png'
WHERE id = '2';

-- The former duplicate has no remaining player/avatar references after the reassignment above.
DELETE FROM public.characters c
WHERE c.id = '99'
  AND NOT EXISTS (SELECT 1 FROM public.players p WHERE p.character_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.avatars a WHERE a.character_id = c.id);

-- Naruto and Sakura had base images in the character picker but no rows in the avatar catalogue,
-- so character creation/avatar selection could leave them without a usable catalogued avatar.
INSERT INTO public.avatars (
    id, name, is_base, evolution_target_id, evolution_req_level, evolution_desc, character_id
)
VALUES
    ('/images/naruto.jpg', 'Naruto - Clássico', true, NULL, 0, NULL, '1'),
    ('/images/sakura.jpg', 'Sakura - Clássica', true, NULL, 0, NULL, '3')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    is_base = true,
    character_id = EXCLUDED.character_id;

-- Avatar changes must go through a server-side owner check. A client must not be able to equip
-- another character's avatar or select a locked evolution by calling the table API directly.
CREATE OR REPLACE FUNCTION public.alterar_avatar_jogador(
    p_player_id integer,
    p_avatar_id text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_avatar public.avatars%ROWTYPE;
    v_unlocked jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_avatar_id IS NULL OR length(p_avatar_id) > 300 THEN
        RAISE EXCEPTION 'Avatar inválido.';
    END IF;

    SELECT *
    INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT *
    INTO v_avatar
    FROM public.avatars
    WHERE id = p_avatar_id
      AND character_id::text = v_player.character_id::text;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Este avatar não pertence ao personagem selecionado.';
    END IF;

    v_unlocked := COALESCE(v_player.unlocked_avatars, '[]'::jsonb);
    IF jsonb_typeof(v_unlocked) <> 'array' THEN
        RAISE EXCEPTION 'Inventário de avatares inválido.';
    END IF;

    IF COALESCE(v_avatar.is_base, false) IS NOT TRUE
       AND NOT (v_unlocked @> jsonb_build_array(p_avatar_id)) THEN
        RAISE EXCEPTION 'Este avatar ainda está bloqueado.';
    END IF;

    UPDATE public.players
    SET avatar = p_avatar_id
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'avatar_id', v_avatar.id,
        'avatar_name', v_avatar.name
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.alterar_avatar_jogador(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_avatar_jogador(integer, text) TO authenticated, service_role;

-- A server-side evolution handler must also verify that both ends of an evolution belong to
-- the current character. This prevents crossing character catalogues through crafted RPC calls.
CREATE OR REPLACE FUNCTION public.desbloquear_avatar_templo(
    p_player_id integer,
    p_avatar_id text,
    p_req_level integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_current_avatar public.avatars%ROWTYPE;
    v_target_avatar public.avatars%ROWTYPE;
    v_required_level integer;
    v_unlocked jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;
    IF p_avatar_id IS NULL OR length(p_avatar_id) > 300 THEN
        RAISE EXCEPTION 'Avatar de destino inválido.';
    END IF;

    SELECT *
    INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT *
    INTO v_current_avatar
    FROM public.avatars
    WHERE id = v_player.avatar;

    IF NOT FOUND
       OR v_current_avatar.character_id::text IS DISTINCT FROM v_player.character_id::text
       OR v_current_avatar.evolution_target_id IS NULL THEN
        RAISE EXCEPTION 'Este avatar não possui uma evolução disponível para este personagem.';
    END IF;

    IF v_current_avatar.evolution_target_id IS DISTINCT FROM p_avatar_id THEN
        RAISE EXCEPTION 'O avatar de destino não corresponde à evolução deste personagem.';
    END IF;

    SELECT *
    INTO v_target_avatar
    FROM public.avatars
    WHERE id = v_current_avatar.evolution_target_id
      AND character_id::text = v_player.character_id::text;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'O avatar de evolução não existe no catálogo deste personagem.';
    END IF;

    -- The required level comes only from the trusted avatar catalogue; p_req_level is ignored.
    v_required_level := GREATEST(1, COALESCE(v_current_avatar.evolution_req_level, 10));
    IF COALESCE(v_player.level, 1) < v_required_level THEN
        RAISE EXCEPTION 'Nível insuficiente. Requer nível %.', v_required_level;
    END IF;

    v_unlocked := COALESCE(v_player.unlocked_avatars, '[]'::jsonb);
    IF jsonb_typeof(v_unlocked) <> 'array' THEN
        RAISE EXCEPTION 'Inventário de avatares inválido.';
    END IF;

    IF v_unlocked @> jsonb_build_array(p_avatar_id) THEN
        RAISE EXCEPTION 'Evolução já desbloqueada.';
    END IF;

    UPDATE public.players
    SET unlocked_avatars = v_unlocked || jsonb_build_array(p_avatar_id)
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'avatar_id', v_target_avatar.id,
        'avatar_name', v_target_avatar.name,
        'required_level', v_required_level
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.desbloquear_avatar_templo(integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.desbloquear_avatar_templo(integer, text, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
