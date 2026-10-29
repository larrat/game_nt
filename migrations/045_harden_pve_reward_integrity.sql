-- Migration 045: harden PvE reward integrity and make story combat server-authoritative.
-- Row Level Security does not constrain TRUNCATE; strip non-application table privileges
-- from public client roles and centralize story-quest state transitions in trusted RPCs.

REVOKE TRUNCATE, REFERENCES, TRIGGER
ON ALL TABLES IN SCHEMA public
FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM PUBLIC, anon, authenticated;

-- Story progress must only be advanced by the ownership-checked RPCs below.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON TABLE public.player_quests
FROM PUBLIC, authenticated;

REVOKE INSERT, UPDATE, DELETE
ON TABLE public.player_defeated_npcs, public.world_boss_damage, public.world_boss_logs
FROM PUBLIC, authenticated;

REVOKE DELETE ON TABLE public.players FROM PUBLIC, authenticated;

DROP POLICY IF EXISTS player_quests_insert_active_own ON public.player_quests;
DROP POLICY IF EXISTS player_defeated_npcs_insert_own ON public.player_defeated_npcs;
DROP POLICY IF EXISTS world_boss_damage_insert_own ON public.world_boss_damage;
DROP POLICY IF EXISTS world_boss_damage_update_own ON public.world_boss_damage;
DROP POLICY IF EXISTS world_boss_logs_insert_own ON public.world_boss_logs;

-- The second story mission previously spawned a client-created, non-catalog NPC.
-- Give it a catalog identity so the normal server combat-session/reward pipeline can validate it.
DO $migration$
DECLARE
    v_npc_id integer;
BEGIN
    SELECT n.id
    INTO v_npc_id
    FROM public.npcs AS n
    WHERE n.name = 'Ladrão de Pergaminhos'
    ORDER BY n.id
    LIMIT 1;

    IF v_npc_id IS NULL THEN
        INSERT INTO public.npcs (
            name, level, hp, chakra, atk, def, element, avatar,
            xp_reward, ryou_reward, rank, is_active, is_map_npc,
            is_story_mode, is_bingo_book, description, is_chunin_exam
        )
        VALUES (
            'Ladrão de Pergaminhos', 3, 1500, 500, 15, 5, 'Vento',
            '/images/char_rogue_ninja_1782968348009.jpg',
            0, 0, 'Genin', true, false, true, false,
            'Inimigo exclusivo da missão principal O Teste do Hokage.',
            false
        )
        RETURNING id INTO v_npc_id;
    ELSE
        UPDATE public.npcs
        SET level = 3,
            hp = 1500,
            chakra = 500,
            atk = 15,
            def = 5,
            element = 'Vento',
            avatar = '/images/char_rogue_ninja_1782968348009.jpg',
            xp_reward = 0,
            ryou_reward = 0,
            rank = 'Genin',
            is_active = true,
            is_map_npc = false,
            is_story_mode = true,
            is_bingo_book = false,
            description = 'Inimigo exclusivo da missão principal O Teste do Hokage.',
            is_chunin_exam = false
        WHERE id = v_npc_id;
    END IF;

    UPDATE public.story_quests
    SET objective_target = jsonb_set(
        COALESCE(objective_target, '{}'::jsonb),
        '{npc_id}',
        to_jsonb(v_npc_id),
        true
    )
    WHERE id = 2
      AND objective_type = 'combat';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Story quest id=2 / objective_type=combat was not found.';
    END IF;
END;
$migration$;

CREATE OR REPLACE FUNCTION public.iniciar_story_quest(
    p_player_id bigint,
    p_quest_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_quest public.story_quests%ROWTYPE;
    v_player_quest public.player_quests%ROWTYPE;
    v_has_player_quest boolean;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT * INTO v_quest
    FROM public.story_quests
    WHERE id = p_quest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest não encontrada.');
    END IF;

    IF COALESCE(v_player.level, 1) < COALESCE(v_quest.req_level, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nível insuficiente para esta quest.');
    END IF;

    IF v_quest.prerequisite_quest_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.player_quests AS prerequisite
           WHERE prerequisite.player_id = p_player_id
             AND prerequisite.quest_id = v_quest.prerequisite_quest_id
             AND prerequisite.status = 'completed'
       ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pré-requisito da quest não concluído.');
    END IF;

    SELECT * INTO v_player_quest
    FROM public.player_quests
    WHERE player_id = p_player_id
      AND quest_id = p_quest_id
    FOR UPDATE;
    v_has_player_quest := FOUND;

    IF v_has_player_quest AND v_player_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest já foi concluída.');
    END IF;

    IF v_has_player_quest AND v_player_quest.status = 'active' THEN
        RETURN jsonb_build_object('success', true, 'already_active', true);
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.player_quests AS pq
        WHERE pq.player_id = p_player_id
          AND pq.status = 'active'
          AND pq.quest_id <> p_quest_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Conclua a missão principal ativa antes de iniciar outra.');
    END IF;

    IF v_has_player_quest THEN
        UPDATE public.player_quests
        SET status = 'active',
            completed_at = NULL
        WHERE player_id = p_player_id
          AND quest_id = p_quest_id
          AND status = 'pending';
    ELSE
        INSERT INTO public.player_quests (player_id, quest_id, status)
        VALUES (p_player_id, p_quest_id, 'active');
    END IF;

    RETURN jsonb_build_object('success', true, 'already_active', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.concluir_story_quest(
    p_player_id bigint,
    p_quest_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_quest public.story_quests%ROWTYPE;
    v_player_quest public.player_quests%ROWTYPE;
    v_has_player_quest boolean;
    v_target_level integer;
    v_target_npc_id integer;
    v_rewards jsonb;
    v_xp_reward integer := 0;
    v_ryous_reward integer := 0;
    v_new_xp bigint;
    v_new_level integer;
    v_levels_gained integer := 0;
    v_next_quest_id integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Autenticação obrigatória.';
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id
      AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.';
    END IF;

    SELECT * INTO v_quest
    FROM public.story_quests
    WHERE id = p_quest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest não encontrada.');
    END IF;

    IF COALESCE(v_player.level, 1) < COALESCE(v_quest.req_level, 1) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nível insuficiente para esta quest.');
    END IF;

    IF v_quest.prerequisite_quest_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.player_quests AS prerequisite
           WHERE prerequisite.player_id = p_player_id
             AND prerequisite.quest_id = v_quest.prerequisite_quest_id
             AND prerequisite.status = 'completed'
       ) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Pré-requisito da quest não concluído.');
    END IF;

    SELECT * INTO v_player_quest
    FROM public.player_quests AS pq
    WHERE pq.player_id = p_player_id
      AND pq.quest_id = p_quest_id
    FOR UPDATE;
    v_has_player_quest := FOUND;

    IF v_has_player_quest AND v_player_quest.status = 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Quest já foi concluída.');
    END IF;

    IF NOT v_has_player_quest OR v_player_quest.status <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Inicie a quest antes de concluí-la.');
    END IF;

    CASE v_quest.objective_type
        WHEN 'talk' THEN
            NULL;
        WHEN 'reach_level' THEN
            v_target_level := COALESCE(
                NULLIF(v_quest.objective_target ->> 'level', '')::integer,
                COALESCE(v_quest.req_level, 1)
            );
            IF COALESCE(v_player.level, 1) < v_target_level THEN
                RETURN jsonb_build_object('success', false, 'message', 'O nível exigido para esta quest ainda não foi alcançado.');
            END IF;
        WHEN 'combat' THEN
            v_target_npc_id := NULLIF(v_quest.objective_target ->> 'npc_id', '')::integer;
            IF v_target_npc_id IS NULL OR NOT EXISTS (
                SELECT 1
                FROM public.player_defeated_npcs AS defeated
                JOIN public.npcs AS npc ON npc.id = defeated.npc_id
                WHERE defeated.player_id = p_player_id
                  AND defeated.npc_id = v_target_npc_id
                  AND (COALESCE(npc.is_story_mode, false) OR COALESCE(npc.is_bingo_book, false))
            ) THEN
                RETURN jsonb_build_object('success', false, 'message', 'A vitória exigida ainda não foi validada pelo servidor.');
            END IF;
        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'Tipo de objetivo de quest inválido.');
    END CASE;

    v_rewards := COALESCE(v_quest.rewards, '{}'::jsonb);
    v_xp_reward := GREATEST(0, COALESCE((v_rewards ->> 'xp')::integer, 0));
    v_ryous_reward := GREATEST(0, COALESCE((v_rewards ->> 'ryous')::integer, 0));
    v_new_xp := COALESCE(v_player.xp, 0) + v_xp_reward;
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));

    UPDATE public.players
    SET xp = v_new_xp,
        level = v_new_level,
        pontos_atributos = COALESCE(pontos_atributos, 0) + (v_levels_gained * 5),
        ryous = COALESCE(ryous, 0) + v_ryous_reward
    WHERE id = p_player_id;

    UPDATE public.player_quests
    SET status = 'completed',
        completed_at = now()
    WHERE player_id = p_player_id
      AND quest_id = p_quest_id
      AND status = 'active';

    SELECT q.id INTO v_next_quest_id
    FROM public.story_quests AS q
    WHERE q.prerequisite_quest_id = p_quest_id
    ORDER BY q.id
    LIMIT 1;

    IF v_next_quest_id IS NOT NULL THEN
        INSERT INTO public.player_quests AS existing (player_id, quest_id, status)
        VALUES (p_player_id, v_next_quest_id, 'active')
        ON CONFLICT (player_id, quest_id)
        DO UPDATE SET status = 'active', completed_at = NULL
        WHERE existing.status = 'pending';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Quest concluída!',
        'xp', v_xp_reward,
        'ryous', v_ryous_reward,
        'levels_gained', v_levels_gained,
        'next_quest_id', v_next_quest_id
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.iniciar_story_quest(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_story_quest(bigint, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.concluir_story_quest(bigint, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_story_quest(bigint, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
