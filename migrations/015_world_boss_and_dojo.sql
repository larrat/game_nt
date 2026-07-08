-- 1. Add dojo_clears to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS dojo_clears integer DEFAULT 0;

-- 2. Create Lootbox Items
INSERT INTO items (name, type, rarity, req_level, bonus_stats, price, image_url)
VALUES 
  ('Baú de Incursão (Bronze)', 'Consumível', 'Comum', 1, '{"desc": "Recompensa básica por ajudar a enfrentar um Chefe Mundial."}'::jsonb, 0, '/images/imgi_26_scroll_blue.jpg'),
  ('Baú de Incursão (Prata)', 'Consumível', 'Raro', 1, '{"desc": "Recompensa avançada por causar muito dano ao Chefe Mundial."}'::jsonb, 0, '/images/imgi_27_scroll_red.jpg'),
  ('Baú de Incursão (Ouro)', 'Consumível', 'Lendário', 1, '{"desc": "Recompensa suprema concedida ao MVP da Guerra Ninja."}'::jsonb, 0, '/images/imgi_29_scroll_gold.jpg');

-- 3. Overhaul Boss Rewards RPC
CREATE OR REPLACE FUNCTION distribute_boss_rewards(p_event_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    boss_record RECORD;
    damage_record RECORD;
    total_event_damage integer;
    mvp_player_id uuid;
    item_bronze_id integer;
    item_prata_id integer;
    item_ouro_id integer;
BEGIN
    SELECT * INTO boss_record FROM world_boss_events WHERE id = p_event_id;
    IF NOT FOUND THEN RETURN; END IF;

    -- Pega os IDs das caixas
    SELECT id INTO item_bronze_id FROM items WHERE name = 'Baú de Incursão (Bronze)' LIMIT 1;
    SELECT id INTO item_prata_id FROM items WHERE name = 'Baú de Incursão (Prata)' LIMIT 1;
    SELECT id INTO item_ouro_id FROM items WHERE name = 'Baú de Incursão (Ouro)' LIMIT 1;

    -- Soma o dano total pra calcular proporções
    SELECT COALESCE(SUM(total_damage), 1) INTO total_event_damage FROM world_boss_damage WHERE event_id = p_event_id;
    
    -- Descobre o MVP
    SELECT player_id INTO mvp_player_id FROM world_boss_damage WHERE event_id = p_event_id ORDER BY total_damage DESC LIMIT 1;

    FOR damage_record IN SELECT * FROM world_boss_damage WHERE event_id = p_event_id LOOP
        -- Recompensa Base (Participação)
        UPDATE players 
        SET 
            xp = xp + 1000 + (damage_record.total_damage / 10),
            ryous = ryous + 2000 + (damage_record.total_damage / 5)
        WHERE id = damage_record.player_id;

        -- Dar Baú Bronze para todos
        IF item_bronze_id IS NOT NULL THEN
            INSERT INTO inventory (player_id, item_id, quantity) 
            VALUES (damage_record.player_id, item_bronze_id, 1)
            ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = inventory.quantity + 1;
        END IF;

        -- Dar Baú Prata se bateu pelo menos 5% do HP do boss
        IF (damage_record.total_damage::numeric / total_event_damage::numeric) >= 0.05 AND item_prata_id IS NOT NULL THEN
            INSERT INTO inventory (player_id, item_id, quantity) 
            VALUES (damage_record.player_id, item_prata_id, 1)
            ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = inventory.quantity + 1;
        END IF;

        -- Dar Baú Ouro para o MVP ou Golpe Final
        IF (damage_record.player_id = mvp_player_id OR damage_record.is_last_hit) AND item_ouro_id IS NOT NULL THEN
            INSERT INTO inventory (player_id, item_id, quantity) 
            VALUES (damage_record.player_id, item_ouro_id, 1)
            ON CONFLICT (player_id, item_id) DO UPDATE SET quantity = inventory.quantity + 1;
        END IF;

    END LOOP;

END;
$$;
