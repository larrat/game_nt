-- Migration 022: Story Quests (Missões Narrativas)

CREATE TABLE IF NOT EXISTS public.story_quests (
    id serial PRIMARY KEY,
    title character varying(255) NOT NULL,
    description text,
    npc_name character varying(255),
    npc_image_url character varying(255),
    dialogue jsonb, -- Array de strings: ["Fala 1", "Fala 2"]
    objective_type character varying(50), -- 'talk', 'combat', 'reach_level'
    objective_target jsonb, -- Ex: { level: 10 } ou { npc: { name: 'Mizuki', hp: 1000 ... } }
    req_level integer DEFAULT 1,
    prerequisite_quest_id integer REFERENCES public.story_quests(id),
    rewards jsonb -- { xp: 1000, ryous: 500, item_id: 10 }
);

CREATE TABLE IF NOT EXISTS public.player_quests (
    id serial PRIMARY KEY,
    player_id bigint REFERENCES public.players(id) ON DELETE CASCADE,
    quest_id integer REFERENCES public.story_quests(id) ON DELETE CASCADE,
    status character varying(50) DEFAULT 'active', -- 'active', 'completed'
    completed_at timestamp with time zone,
    UNIQUE(player_id, quest_id)
);

-- RPC para validar recompensa e avanço de Quest
CREATE OR REPLACE FUNCTION public.concluir_story_quest(
    p_player_id bigint,
    p_quest_id integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_quest record;
    v_player_quest record;
    v_rewards jsonb;
    v_xp_reward integer := 0;
    v_ryous_reward integer := 0;
    v_next_quest_id integer;
BEGIN
    -- Obter a Quest
    SELECT * INTO v_quest FROM public.story_quests WHERE id = p_quest_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest não encontrada.');
    END IF;

    -- Verificar se já foi concluída
    SELECT * INTO v_player_quest FROM public.player_quests 
    WHERE player_id = p_player_id AND quest_id = p_quest_id;

    IF FOUND AND v_player_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest já foi concluída.');
    END IF;

    -- Conceder recompensas
    v_rewards := v_quest.rewards;
    IF v_rewards IS NOT NULL THEN
        v_xp_reward := COALESCE((v_rewards->>'xp')::integer, 0);
        v_ryous_reward := COALESCE((v_rewards->>'ryous')::integer, 0);

        UPDATE public.players 
        SET xp = xp + v_xp_reward, ryous = ryous + v_ryous_reward
        WHERE id = p_player_id;

        -- TODO: Entregar item, se aplicável (item_id)
    END IF;

    -- Marcar como concluída
    INSERT INTO public.player_quests (player_id, quest_id, status, completed_at)
    VALUES (p_player_id, p_quest_id, 'completed', now())
    ON CONFLICT (player_id, quest_id) 
    DO UPDATE SET status = 'completed', completed_at = now();

    -- Buscar próxima quest (onde prerequisite_quest_id = p_quest_id)
    SELECT id INTO v_next_quest_id FROM public.story_quests 
    WHERE prerequisite_quest_id = p_quest_id LIMIT 1;

    -- Se tiver próxima quest, já iniciar para o jogador (opcional)
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
$$;

-- Inserir Dados de Teste: Saga Formatura Genin
INSERT INTO public.story_quests (id, title, description, npc_name, npc_image_url, dialogue, objective_type, objective_target, req_level, prerequisite_quest_id, rewards)
VALUES 
(1, 'O Despertar do Shinobi', 'Fale com Iruka-sensei na Academia.', 'Iruka Umino', '/images/imgi_26_scroll_blue.jpg', 
'["Ei, você aí! Acorde!", "Hoje é um dia importante. O Hokage quer ver você na sala dele imediatamente.", "Vá até lá e descubra o que ele quer."]', 
'talk', '{}'::jsonb, 1, NULL, '{"xp": 100, "ryous": 500}'::jsonb);

INSERT INTO public.story_quests (id, title, description, npc_name, npc_image_url, dialogue, objective_type, objective_target, req_level, prerequisite_quest_id, rewards)
VALUES 
(2, 'O Teste do Hokage', 'Prove seu valor derrotando o Ladrão de Pergaminhos.', 'Terceiro Hokage', '/images/imgi_29_scroll_gold.jpg', 
'["Então você chegou...", "Para provar que você está pronto para se tornar um Genin, preciso que resolva um problema.", "Um ladrão roubou um pergaminho de rank D. Encontre-o e derrote-o."]', 
'combat', '{"npc": {"name": "Ladrão de Pergaminhos", "level": 3, "hp": 1500, "chakra": 500, "atk": 15, "def": 5, "avatar": "/images/char_rogue_ninja_1782968348009.jpg", "element": "Vento"}}'::jsonb, 1, 1, '{"xp": 500, "ryous": 1500}'::jsonb);

-- Atualiza a sequence serial da tabela
SELECT setval('story_quests_id_seq', (SELECT MAX(id) FROM story_quests));
