-- migrations/008_migracao_economia_lojas.sql

-- 1. Comprar Item Loja
CREATE OR REPLACE FUNCTION public.comprar_item_loja(
    p_player_id INT,
    p_item_id INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_item FROM items WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Item not found');
    END IF;

    IF v_player.level < v_item.req_level THEN
        RETURN jsonb_build_object('error', 'Nível muito baixo');
    END IF;

    IF v_player.ryous < v_item.price THEN
        RETURN jsonb_build_object('error', 'Ryous insuficientes');
    END IF;

    -- Subtrair dinheiro
    UPDATE players SET ryous = ryous - v_item.price WHERE id = p_player_id;

    -- Inserir item no inventário
    INSERT INTO player_inventory (player_id, item_id, rarity)
    VALUES (p_player_id, p_item_id, v_item.rarity);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 2. Vender Itens (Em massa)
CREATE OR REPLACE FUNCTION public.vender_itens(
    p_player_id INT,
    p_inventory_ids INT[]
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_total_value INT := 0;
    v_items_count INT;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    -- Garantir que todos os itens pertencem ao jogador e calcular o valor
    SELECT SUM(floor(i.price * 0.3)::INT), COUNT(*) INTO v_total_value, v_items_count
    FROM player_inventory pi
    JOIN items i ON pi.item_id = i.id
    WHERE pi.id = ANY(p_inventory_ids) AND pi.player_id = p_player_id AND pi.is_equipped = false;

    IF v_items_count != array_length(p_inventory_ids, 1) THEN
        RETURN jsonb_build_object('error', 'Um ou mais itens não pertencem a você ou estão equipados');
    END IF;

    -- Excluir os itens
    DELETE FROM player_inventory WHERE id = ANY(p_inventory_ids) AND player_id = p_player_id;

    -- Adicionar dinheiro
    UPDATE players SET ryous = ryous + v_total_value WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'ryous_gained', v_total_value);
END;
$$ LANGUAGE plpgsql;


-- 3. Comprar Ramen (Consumíveis)
CREATE OR REPLACE FUNCTION public.comprar_ramen(
    p_player_id INT,
    p_consumable_id INT,
    p_quantidade INT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_consumable RECORD;
    v_total_ryous INT;
    v_total_coins INT;
    v_existing_inv UUID;
BEGIN
    IF p_quantidade <= 0 THEN
        RETURN jsonb_build_object('error', 'Quantidade inválida');
    END IF;

    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    SELECT * INTO v_consumable FROM consumables WHERE id = p_consumable_id AND is_active = true;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Consumível não encontrado');
    END IF;

    v_total_ryous := v_consumable.cost_ryous * p_quantidade;
    v_total_coins := v_consumable.cost_coins * p_quantidade;

    IF v_player.ryous < v_total_ryous THEN
        RETURN jsonb_build_object('error', 'Ryous insuficientes');
    END IF;
    IF v_player.vip_coins < v_total_coins THEN
        RETURN jsonb_build_object('error', 'Coins insuficientes');
    END IF;

    -- Subtrair moedas
    UPDATE players 
    SET ryous = ryous - v_total_ryous, vip_coins = vip_coins - v_total_coins 
    WHERE id = p_player_id;

    -- Adicionar consumível (se já existe incrementa, se não cria)
    SELECT id INTO v_existing_inv FROM player_consumables 
    WHERE player_id = p_player_id AND consumable_id = p_consumable_id LIMIT 1;

    IF FOUND THEN
        UPDATE player_consumables SET quantity = quantity + p_quantidade WHERE id = v_existing_inv;
    ELSE
        INSERT INTO player_consumables (player_id, consumable_id, quantity) 
        VALUES (p_player_id, p_consumable_id, p_quantidade);
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;


-- 4. Doar para a Vila
CREATE OR REPLACE FUNCTION public.doar_vila(
    p_player_id INT,
    p_building_type TEXT,
    p_amount BIGINT
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_building RECORD;
    v_existing_donor UUID;
    v_new_donations BIGINT;
    v_new_level INT;
    v_new_cost BIGINT;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('error', 'Valor inválido');
    END IF;

    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Player not found');
    END IF;

    IF v_player.ryous < p_amount THEN
        RETURN jsonb_build_object('error', 'Ryous insuficientes');
    END IF;

    SELECT * INTO v_building FROM village_buildings 
    WHERE village_id = v_player.village_id AND building_type = p_building_type LIMIT 1 FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Construção não encontrada');
    END IF;

    -- Lógica de Level Up
    v_new_donations := COALESCE(v_building.current_donations, 0) + p_amount;
    v_new_level := v_building.level;
    v_new_cost := COALESCE(v_building.next_level_cost, 5000000);

    IF v_new_donations >= v_new_cost THEN
        v_new_level := v_new_level + 1;
        v_new_donations := v_new_donations - v_new_cost;
        v_new_cost := floor(v_new_cost * 1.5)::BIGINT;
    END IF;

    -- Tirar ryous
    UPDATE players SET ryous = ryous - p_amount WHERE id = p_player_id;

    -- Colocar na vila
    UPDATE village_buildings 
    SET current_donations = v_new_donations, level = v_new_level, next_level_cost = v_new_cost
    WHERE id = v_building.id;

    -- Atualizar ranking de doadores
    SELECT id INTO v_existing_donor FROM village_donors 
    WHERE building_id = v_building.id AND player_id = p_player_id LIMIT 1;

    IF FOUND THEN
        UPDATE village_donors SET total_donated = total_donated + p_amount, last_donated_at = now() 
        WHERE id = v_existing_donor;
    ELSE
        INSERT INTO village_donors (building_id, player_id, total_donated) 
        VALUES (v_building.id, p_player_id, p_amount);
    END IF;

    RETURN jsonb_build_object('success', true, 'new_donations', v_new_donations, 'new_level', v_new_level, 'new_cost', v_new_cost);
END;
$$ LANGUAGE plpgsql;
