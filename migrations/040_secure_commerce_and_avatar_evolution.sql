-- Migration 040: restore safe, owner-checked commerce and avatar evolution RPCs.
-- Existing UI calls these functions directly. SECURITY DEFINER is required because client
-- roles no longer have direct UPDATE access to currency/progression columns.
-- Every state-changing RPC below validates auth.uid() against the character owner.

ALTER TABLE public.players
    ADD COLUMN IF NOT EXISTS unlocked_avatars jsonb NOT NULL DEFAULT '[]'::jsonb;


CREATE OR REPLACE FUNCTION public.comprar_ramen(
    p_player_id integer,
    p_consumable_id integer,
    p_quantidade integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_consumable public.consumables%ROWTYPE;
    v_total_ryous bigint;
    v_total_coins bigint;
    v_existing_inv uuid;
    v_existing_quantity integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_quantidade IS NULL OR p_quantidade < 1 OR p_quantidade > 50 THEN
        RAISE EXCEPTION 'Quantidade inválida. O limite é de 50 unidades por compra.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT * INTO v_consumable
    FROM public.consumables
    WHERE id = p_consumable_id AND COALESCE(is_active, true) IS TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consumível não encontrado ou indisponível.';
    END IF;

    IF COALESCE(v_consumable.cost_ryous, 0) < 0
       OR COALESCE(v_consumable.cost_coins, 0) < 0 THEN
        RAISE EXCEPTION 'Preço inválido no catálogo de consumíveis.';
    END IF;

    v_total_ryous := COALESCE(v_consumable.cost_ryous, 0)::bigint * p_quantidade;
    v_total_coins := COALESCE(v_consumable.cost_coins, 0)::bigint * p_quantidade;

    IF COALESCE(v_player.ryous, 0)::bigint < v_total_ryous THEN
        RAISE EXCEPTION 'Ryous insuficientes.';
    END IF;
    IF COALESCE(v_player.vip_coins, 0)::bigint < v_total_coins THEN
        RAISE EXCEPTION 'Kuro Coins insuficientes.';
    END IF;

    SELECT pc.id, pc.quantity
    INTO v_existing_inv, v_existing_quantity
    FROM public.player_consumables AS pc
    WHERE pc.player_id = p_player_id AND pc.consumable_id = p_consumable_id
    ORDER BY pc.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND COALESCE(v_existing_quantity, 0) > 2147483647 - p_quantidade THEN
        RAISE EXCEPTION 'Limite de quantidade do inventário excedido.';
    END IF;

    UPDATE public.players
    SET ryous = COALESCE(ryous, 0) - v_total_ryous::integer,
        vip_coins = COALESCE(vip_coins, 0) - v_total_coins::integer
    WHERE id = p_player_id;

    IF v_existing_inv IS NOT NULL THEN
        UPDATE public.player_consumables
        SET quantity = quantity + p_quantidade
        WHERE id = v_existing_inv;
    ELSE
        INSERT INTO public.player_consumables (player_id, consumable_id, quantity)
        VALUES (p_player_id, p_consumable_id, p_quantidade);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'consumable_id', p_consumable_id,
        'quantity_purchased', p_quantidade,
        'ryous_spent', v_total_ryous,
        'coins_spent', v_total_coins
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.comprar_ramen(integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.comprar_ramen(integer, integer, integer) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.doar_vila(
    p_player_id integer,
    p_building_type text,
    p_amount bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_building public.village_buildings%ROWTYPE;
    v_existing_donor uuid;
    v_new_donations bigint;
    v_new_level integer;
    v_new_cost bigint;
    v_amount bigint := 100000;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    IF p_amount IS DISTINCT FROM v_amount THEN
        RAISE EXCEPTION 'A doação permitida por operação é de ¥100.000.';
    END IF;
    IF p_building_type IS NULL OR length(p_building_type) > 40 THEN
        RAISE EXCEPTION 'Construção inválida.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;
    IF COALESCE(v_player.ryous, 0) < v_amount THEN
        RAISE EXCEPTION 'Ryous insuficientes para a doação.';
    END IF;

    SELECT * INTO v_building
    FROM public.village_buildings
    WHERE village_id = v_player.village_id
      AND building_type = p_building_type
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Construção não encontrada na sua vila.';
    END IF;
    IF COALESCE(v_building.level, 0) < 0 THEN
        RAISE EXCEPTION 'Esta construção está danificada e não aceita doações.';
    END IF;

    v_new_donations := GREATEST(0, COALESCE(v_building.current_donations, 0)) + v_amount;
    v_new_level := GREATEST(0, COALESCE(v_building.level, 0));
    v_new_cost := GREATEST(1, COALESCE(v_building.next_level_cost, 5000000));

    IF v_new_donations >= v_new_cost THEN
        v_new_level := v_new_level + 1;
        v_new_donations := v_new_donations - v_new_cost;
        v_new_cost := FLOOR(v_new_cost * 1.5)::bigint;
    END IF;

    UPDATE public.players
    SET ryous = COALESCE(ryous, 0) - v_amount::integer
    WHERE id = p_player_id;

    UPDATE public.village_buildings
    SET current_donations = v_new_donations,
        level = v_new_level,
        next_level_cost = v_new_cost
    WHERE id = v_building.id;

    SELECT id INTO v_existing_donor
    FROM public.village_donors
    WHERE building_id = v_building.id AND player_id = p_player_id
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.village_donors
        SET total_donated = COALESCE(total_donated, 0) + v_amount,
            last_donated_at = now()
        WHERE id = v_existing_donor;
    ELSE
        INSERT INTO public.village_donors (building_id, player_id, total_donated)
        VALUES (v_building.id, p_player_id, v_amount);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'new_donations', v_new_donations,
        'new_level', v_new_level,
        'new_cost', v_new_cost,
        'amount_donated', v_amount
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.doar_vila(integer, text, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.doar_vila(integer, text, bigint) TO authenticated, service_role;


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

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT * INTO v_current_avatar
    FROM public.avatars
    WHERE id = v_player.avatar;

    IF NOT FOUND OR v_current_avatar.evolution_target_id IS NULL THEN
        RAISE EXCEPTION 'Este avatar não possui uma evolução disponível.';
    END IF;

    IF v_current_avatar.evolution_target_id IS DISTINCT FROM p_avatar_id THEN
        RAISE EXCEPTION 'O avatar de destino não corresponde à evolução deste personagem.';
    END IF;

    SELECT * INTO v_target_avatar
    FROM public.avatars
    WHERE id = v_current_avatar.evolution_target_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'O avatar de evolução não existe no catálogo.';
    END IF;

    -- Required level comes only from the trusted avatar catalogue; p_req_level is ignored.
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


-- These legacy endpoints are not used by the current UI. Their parameters trusted client-supplied
-- prices or had no ownership validation; disable them until replaced by validated server RPCs.
REVOKE ALL ON FUNCTION public.comprar_item_loja(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.desbloquear_portao(integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vender_itens(integer, integer[]) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
