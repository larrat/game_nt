-- Harden explicit combat abandonment and enforce World Boss consumable restriction server-side.
CREATE OR REPLACE FUNCTION public.abandonar_combate_sessao(p_player_id integer, p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_enemy_turn jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players
    WHERE id=p_player_id AND user_id=auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id=p_session_id AND player_id=p_player_id FOR UPDATE;
    IF NOT FOUND OR v_session.status <> 'active' THEN
        RETURN jsonb_build_object('success',false,'error','Sessão de combate não está ativa.');
    END IF;

    -- Resolve the pending enemy response before closing a session. Without this,
    -- direct API callers could abandon immediately after attacking and avoid retaliation.
    IF COALESCE(v_session.awaiting_enemy_turn, false) IS TRUE THEN
        v_enemy_turn := public.responder_turno_combate_sessao(p_player_id, p_session_id);

        IF COALESCE((v_enemy_turn->>'success')::boolean, false) IS NOT TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', COALESCE(v_enemy_turn->>'error', 'Não foi possível resolver a resposta do inimigo.')
            );
        END IF;

        IF COALESCE((v_enemy_turn->>'player_defeated')::boolean, false) IS TRUE THEN
            RETURN jsonb_build_object(
                'success', true,
                'abandoned', false,
                'player_defeated', true,
                'enemy_turn_resolved', true,
                'is_exam', v_session.is_exam,
                'player_hp_remaining', v_enemy_turn->'player_hp_remaining'
            );
        END IF;
    END IF;

    UPDATE public.player_combat_sessions
    SET status='abandoned',awaiting_enemy_turn=false,last_action_at=clock_timestamp()
    WHERE session_id=p_session_id;

    IF v_session.is_exam THEN
        UPDATE public.player_chunin_exams
        SET status='failed',current_round=1,active_session_id=NULL,updated_at=now()
        WHERE player_id=p_player_id;
    END IF;

    RETURN jsonb_build_object('success',true,'abandoned',true,'enemy_turn_resolved',COALESCE(v_session.awaiting_enemy_turn,false),'is_exam',v_session.is_exam);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.usar_consumivel_inventario(p_player_id integer, p_inventory_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_inventory public.player_consumables%ROWTYPE;
    v_consumable public.consumables%ROWTYPE;
    v_max_hp integer;
    v_max_chakra integer;
    v_max_stamina integer;
    v_new_hp integer;
    v_new_chakra integer;
    v_new_stamina integer;
    v_value integer;
    v_type text;
    v_quantity_remaining integer;
    v_used_text text := '';
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    -- A modal cannot bypass combat restrictions by calling this RPC directly.
    IF EXISTS (
        SELECT 1
        FROM public.player_combat_sessions s
        WHERE s.player_id = p_player_id
          AND s.status = 'active'
          AND s.expires_at > now()
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consumíveis são proibidos durante combates.');
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.world_boss_sessions s
        WHERE s.player_id = p_player_id
          AND s.is_active IS TRUE
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consumíveis não estão disponíveis durante o Chefe Mundial.');
    END IF;

    SELECT * INTO v_inventory
    FROM public.player_consumables
    WHERE id = p_inventory_id
      AND player_id = p_player_id
      AND quantity > 0
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Consumível não encontrado no seu inventário.');
    END IF;

    SELECT * INTO v_consumable
    FROM public.consumables
    WHERE id = v_inventory.consumable_id
      AND COALESCE(is_active, true) IS TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este consumível não está mais disponível.');
    END IF;

    v_type := lower(COALESCE(v_consumable.type, ''));
    v_value := GREATEST(0, COALESCE(v_consumable.value, 0));

    v_max_hp := public.kurokage_player_max_stat(p_player_id, 'hp');
    v_max_chakra := public.kurokage_player_max_stat(p_player_id, 'chakra');
    v_max_stamina := public.kurokage_player_max_stat(p_player_id, 'stamina');

    v_new_hp := LEAST(v_max_hp, GREATEST(0, COALESCE(v_player.hp, v_max_hp)));
    v_new_chakra := LEAST(v_max_chakra, GREATEST(0, COALESCE(v_player.chakra, v_max_chakra)));
    v_new_stamina := LEAST(v_max_stamina, GREATEST(0, COALESCE(v_player.stamina, v_max_stamina)));

    IF v_type IN ('hp', 'all') THEN
        v_new_hp := LEAST(v_max_hp, v_new_hp + v_value);
        v_used_text := v_used_text || '+HP ';
    END IF;
    IF v_type IN ('cp', 'chakra', 'all') THEN
        v_new_chakra := LEAST(v_max_chakra, v_new_chakra + v_value);
        v_used_text := v_used_text || '+Chakra ';
    END IF;
    IF v_type IN ('sp', 'stamina', 'all') THEN
        v_new_stamina := LEAST(v_max_stamina, v_new_stamina + v_value);
        v_used_text := v_used_text || '+Stamina ';
    END IF;

    IF v_used_text = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tipo de consumível inválido.');
    END IF;

    IF v_new_hp = GREATEST(0, COALESCE(v_player.hp, v_max_hp))
       AND v_new_chakra = GREATEST(0, COALESCE(v_player.chakra, v_max_chakra))
       AND v_new_stamina = GREATEST(0, COALESCE(v_player.stamina, v_max_stamina)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Seus recursos já estão cheios.');
    END IF;

    UPDATE public.players
    SET hp = v_new_hp,
        chakra = v_new_chakra,
        stamina = v_new_stamina,
        is_fainted = CASE WHEN v_new_hp > 0 THEN false ELSE COALESCE(is_fainted, false) END,
        fainted_at = CASE WHEN v_new_hp > 0 THEN NULL ELSE fainted_at END
    WHERE id = p_player_id;

    v_quantity_remaining := GREATEST(0, v_inventory.quantity - 1);
    IF v_quantity_remaining = 0 THEN
        DELETE FROM public.player_consumables WHERE id = v_inventory.id;
    ELSE
        UPDATE public.player_consumables
        SET quantity = v_quantity_remaining
        WHERE id = v_inventory.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'consumable_id', v_consumable.id,
        'consumable_name', v_consumable.name,
        'type', v_type,
        'effect_value', v_value,
        'used_text', btrim(v_used_text),
        'quantity_remaining', v_quantity_remaining,
        'hp', v_new_hp,
        'chakra', v_new_chakra,
        'stamina', v_new_stamina,
        'max_hp', v_max_hp,
        'max_chakra', v_max_chakra,
        'max_stamina', v_max_stamina,
        'revived', COALESCE(v_player.is_fainted, false) AND v_new_hp > 0
    );
END;
$function$
;

NOTIFY pgrst, 'reload schema';
