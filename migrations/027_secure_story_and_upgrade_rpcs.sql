-- Migration 027: enforce authenticated ownership for story rewards and equipment upgrades.
-- Function signatures are preserved for the current React client.

CREATE OR REPLACE FUNCTION public.concluir_story_quest(
    p_player_id bigint,
    p_quest_id integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player_user_id uuid;
    v_player_level integer;
    v_quest public.story_quests%ROWTYPE;
    v_player_quest public.player_quests%ROWTYPE;
    v_rewards jsonb;
    v_xp_reward integer := 0;
    v_ryous_reward integer := 0;
    v_next_quest_id integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    -- Serialize reward claims for a player and validate ownership first.
    SELECT p.user_id, p.level
      INTO v_player_user_id, v_player_level
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND OR v_player_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT q.*
      INTO v_quest
      FROM public.story_quests AS q
     WHERE q.id = p_quest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest não encontrada.');
    END IF;

    IF COALESCE(v_player_level, 1) < COALESCE(v_quest.req_level, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nível insuficiente para esta quest.');
    END IF;

    IF v_quest.prerequisite_quest_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
             FROM public.player_quests AS pq
            WHERE pq.player_id = p_player_id
              AND pq.quest_id = v_quest.prerequisite_quest_id
              AND pq.status = 'completed'
       ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pré-requisito da quest não concluído.');
    END IF;

    SELECT pq.*
      INTO v_player_quest
      FROM public.player_quests AS pq
     WHERE pq.player_id = p_player_id
       AND pq.quest_id = p_quest_id
     FOR UPDATE;

    IF FOUND AND v_player_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest já foi concluída.');
    END IF;

    -- Combat quests must have been started through the story flow.
    -- Talk quests may be claimed from the initial pending state used by the UI.
    IF v_quest.objective_type = 'combat'
       AND (NOT FOUND OR v_player_quest.status IS DISTINCT FROM 'active') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Inicie a quest antes de concluí-la.');
    END IF;

    IF FOUND AND v_player_quest.status NOT IN ('active', 'pending') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Estado da quest inválido.');
    END IF;

    v_rewards := v_quest.rewards;
    IF v_rewards IS NOT NULL THEN
        v_xp_reward := GREATEST(0, COALESCE((v_rewards->>'xp')::integer, 0));
        v_ryous_reward := GREATEST(0, COALESCE((v_rewards->>'ryous')::integer, 0));

        UPDATE public.players
           SET xp = COALESCE(xp, 0) + v_xp_reward,
               ryous = COALESCE(ryous, 0) + v_ryous_reward
         WHERE id = p_player_id;
    END IF;

    INSERT INTO public.player_quests (player_id, quest_id, status, completed_at)
    VALUES (p_player_id, p_quest_id, 'completed', now())
    ON CONFLICT (player_id, quest_id)
    DO UPDATE SET status = 'completed', completed_at = now();

    SELECT q.id
      INTO v_next_quest_id
      FROM public.story_quests AS q
     WHERE q.prerequisite_quest_id = p_quest_id
     ORDER BY q.id
     LIMIT 1;

    IF v_next_quest_id IS NOT NULL THEN
        INSERT INTO public.player_quests (player_id, quest_id, status)
        VALUES (p_player_id, v_next_quest_id, 'active')
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Quest concluída!',
        'xp', v_xp_reward,
        'ryous', v_ryous_reward,
        'next_quest_id', v_next_quest_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.aprimorar_equipamento(
    p_player_id bigint,
    p_inventory_item_id bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player_user_id uuid;
    v_target_item public.player_inventory%ROWTYPE;
    v_duplicate_id integer;
    v_player_ryous integer;
    v_upgrade_cost integer;
    v_new_level integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Autenticação obrigatória.');
    END IF;

    SELECT p.user_id, p.ryous
      INTO v_player_user_id, v_player_ryous
      FROM public.players AS p
     WHERE p.id = p_player_id
     FOR UPDATE;

    IF NOT FOUND OR v_player_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Personagem não encontrado ou ação não autorizada.');
    END IF;

    SELECT pi.*
      INTO v_target_item
      FROM public.player_inventory AS pi
     WHERE pi.id = p_inventory_item_id
       AND pi.player_id = p_player_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado ou não pertence ao jogador.');
    END IF;

    IF COALESCE(v_target_item.upgrade_level, 0) >= 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'O item já atingiu o nível máximo de refino (+10).');
    END IF;

    SELECT pi.id
      INTO v_duplicate_id
      FROM public.player_inventory AS pi
     WHERE pi.player_id = p_player_id
       AND pi.item_id = v_target_item.item_id
       AND pi.id <> p_inventory_item_id
       AND COALESCE(pi.is_equipped, false) = false
     ORDER BY pi.id
     LIMIT 1
     FOR UPDATE;

    IF v_duplicate_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa de uma cópia desequipada idêntica deste item para o refino.');
    END IF;

    v_upgrade_cost := 500 * (COALESCE(v_target_item.upgrade_level, 0) + 1);

    IF COALESCE(v_player_ryous, 0) < v_upgrade_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ryous insuficientes. Custo: ' || v_upgrade_cost);
    END IF;

    UPDATE public.players
       SET ryous = COALESCE(ryous, 0) - v_upgrade_cost
     WHERE id = p_player_id;

    DELETE FROM public.player_inventory
     WHERE id = v_duplicate_id
       AND player_id = p_player_id;

    v_new_level := COALESCE(v_target_item.upgrade_level, 0) + 1;

    UPDATE public.player_inventory
       SET upgrade_level = v_new_level
     WHERE id = p_inventory_item_id
       AND player_id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Equipamento aprimorado com sucesso para +' || v_new_level || '!',
        'new_level', v_new_level,
        'cost', v_upgrade_cost
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.concluir_story_quest(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_story_quest(bigint, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aprimorar_equipamento(bigint, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprimorar_equipamento(bigint, bigint) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
