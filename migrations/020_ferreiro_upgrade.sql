-- Adiciona coluna upgrade_level na tabela player_inventory se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='player_inventory' AND column_name='upgrade_level') THEN
        ALTER TABLE public.player_inventory ADD COLUMN upgrade_level integer DEFAULT 0;
    END IF;
END $$;

-- Cria a RPC para forjar equipamento
CREATE OR REPLACE FUNCTION public.aprimorar_equipamento(
    p_player_id bigint,
    p_inventory_item_id bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_item record;
    v_duplicate_id bigint;
    v_player_ryous integer;
    v_upgrade_cost integer;
    v_new_level integer;
BEGIN
    -- 1. Obter informações do item alvo
    SELECT * INTO v_target_item FROM public.player_inventory 
    WHERE id = p_inventory_item_id AND player_id = p_player_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Item não encontrado ou não pertence ao jogador.');
    END IF;

    -- Limite máximo de refino, por exemplo, +10
    IF v_target_item.upgrade_level >= 10 THEN
        RETURN jsonb_build_object('success', false, 'message', 'O item já atingiu o nível máximo de refino (+10).');
    END IF;

    -- 2. Encontrar um item duplicado do MESMO tipo (item_id) que NÃO seja o próprio item alvo, NÃO esteja equipado
    SELECT id INTO v_duplicate_id FROM public.player_inventory
    WHERE player_id = p_player_id
      AND item_id = v_target_item.item_id
      AND id != p_inventory_item_id
      AND is_equipped = false
    LIMIT 1;

    IF v_duplicate_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa de uma cópia desequipada idêntica deste item para o refino.');
    END IF;

    -- 3. Calcular o custo em Ryous
    v_upgrade_cost := 500 * (v_target_item.upgrade_level + 1);

    -- 4. Verificar se o jogador tem Ryous suficientes
    SELECT ryous INTO v_player_ryous FROM public.players WHERE id = p_player_id;

    IF v_player_ryous < v_upgrade_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Ryous insuficientes. Custo: ' || v_upgrade_cost);
    END IF;

    -- 5. Realizar a forja:
    -- A) Deduzir Ryous
    UPDATE public.players 
    SET ryous = ryous - v_upgrade_cost
    WHERE id = p_player_id;

    -- B) Deletar a cópia consumida
    DELETE FROM public.player_inventory WHERE id = v_duplicate_id;

    -- C) Aumentar o nível do item alvo
    v_new_level := v_target_item.upgrade_level + 1;
    UPDATE public.player_inventory 
    SET upgrade_level = v_new_level
    WHERE id = p_inventory_item_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Equipamento aprimorado com sucesso para +' || v_new_level || '!',
        'new_level', v_new_level,
        'cost', v_upgrade_cost
    );
END;
$$;
