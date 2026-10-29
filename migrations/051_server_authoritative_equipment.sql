-- Make equipment state server-authoritative.
-- Direct column updates let a client flag multiple items from the same slot as equipped.
CREATE OR REPLACE FUNCTION public.alterar_equipamento_inventario(
    p_player_id integer,
    p_inventory_item_id integer,
    p_equipped boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_inventory public.player_inventory%ROWTYPE;
    v_item public.items%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_equipped IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Estado do equipamento inválido.');
    END IF;

    -- Serialize all equipment changes for this character.
    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT * INTO v_inventory
    FROM public.player_inventory
    WHERE id = p_inventory_item_id AND player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Item não encontrado ou não pertence ao personagem.');
    END IF;

    SELECT * INTO v_item
    FROM public.items
    WHERE id = v_inventory.item_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'O item não existe no catálogo.');
    END IF;

    IF v_item.type NOT IN ('Cabeça', 'Tronco', 'Braços', 'Pernas', 'Arma', 'Acessório') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este item não pode ser equipado.');
    END IF;

    IF p_equipped THEN
        IF COALESCE(v_player.level, 1) < COALESCE(v_item.req_level, 1) THEN
            RETURN jsonb_build_object('success', false, 'error',
                format('Nível insuficiente. Este item exige nível %s.', COALESCE(v_item.req_level, 1)));
        END IF;

        -- One active item per equipment type; change happens within a single transaction.
        UPDATE public.player_inventory AS pi
        SET is_equipped = false
        WHERE pi.player_id = p_player_id
          AND pi.is_equipped IS TRUE
          AND EXISTS (
              SELECT 1 FROM public.items AS old_item
              WHERE old_item.id = pi.item_id
                AND old_item.type = v_item.type
          )
          AND pi.id <> p_inventory_item_id;

        UPDATE public.player_inventory
        SET is_equipped = true
        WHERE id = p_inventory_item_id AND player_id = p_player_id;
    ELSE
        UPDATE public.player_inventory
        SET is_equipped = false
        WHERE id = p_inventory_item_id AND player_id = p_player_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'equipped', p_equipped,
        'item_id', p_inventory_item_id,
        'slot_type', v_item.type
    );
END;
$function$;

REVOKE UPDATE (is_equipped) ON TABLE public.player_inventory FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.alterar_equipamento_inventario(integer, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_equipamento_inventario(integer, integer, boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
