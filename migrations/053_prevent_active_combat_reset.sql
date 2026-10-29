-- Prevent replacing an active PvE session before the enemy response is resolved.
-- Same-target sessions recover from reload; other targets require explicit abandonment.
CREATE OR REPLACE FUNCTION public.iniciar_combate_sessao(p_player_id integer, p_enemy_id integer, p_from_map boolean DEFAULT false, p_is_dojo boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_enemy public.npcs%ROWTYPE;
    v_pending_session public.player_combat_sessions%ROWTYPE;
    v_active_session public.player_combat_sessions%ROWTYPE;
    v_session_id uuid;
    v_hp integer;
    v_atk integer;
    v_def integer;
    v_level integer;
    v_chakra integer;
    v_max_hp integer;
    v_max_chakra integer;
    v_max_stamina integer;
    v_player_hp integer;
    v_player_chakra integer;
    v_player_stamina integer;
    v_scale_ratio numeric := 1;
    v_early_nerf numeric := 1;
    v_from_map boolean := false;
    v_is_dojo boolean := false;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;
    IF COALESCE(v_player.is_fainted, false) IS TRUE OR COALESCE(v_player.hp, 0) <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você está inconsciente e não pode iniciar um combate.');
    END IF;

    -- Expired defeats cannot be recovered.
    UPDATE public.player_combat_sessions
    SET status = 'expired', awaiting_enemy_turn = false
    WHERE player_id = p_player_id
      AND status = 'defeated'
      AND expires_at <= now();

    -- An active session past its lifetime can no longer block or be resumed.
    UPDATE public.player_combat_sessions
    SET status = 'expired', awaiting_enemy_turn = false
    WHERE player_id = p_player_id
      AND status = 'active'
      AND expires_at <= now();

    -- Legacy duplicate starts may have left an older victory beside a later session.
    -- Retire only stale ordinary PvE wins; exam wins are reconciled through the exam pointer below.
    UPDATE public.player_combat_sessions AS older
    SET status = 'abandoned', awaiting_enemy_turn = false
    WHERE older.player_id = p_player_id
      AND older.is_exam IS NOT TRUE
      AND older.status = 'defeated'
      AND EXISTS (
          SELECT 1
          FROM public.player_combat_sessions AS newer
          WHERE newer.player_id = older.player_id
            AND (
                newer.created_at > older.created_at
                OR (
                    newer.created_at = older.created_at
                    AND newer.session_id > older.session_id
                )
            )
      );

    SELECT * INTO v_pending_session
    FROM public.player_combat_sessions
    WHERE player_id = p_player_id
      AND status = 'defeated'
      AND enemy_hp_remaining <= 0
      AND expires_at > now()
    ORDER BY created_at DESC, session_id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        IF v_pending_session.is_exam IS TRUE THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Você tem uma vitória pendente do Exame Chunin. Retorne ao Exame para confirmar a etapa antes de iniciar outro combate.'
            );
        END IF;

        IF v_pending_session.enemy_id <> p_enemy_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Você tem uma vitória pendente contra ' || v_pending_session.enemy_name ||
                    '. Reabra essa batalha para registrar o resultado antes de iniciar outra.'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'pending_victory', true,
            'session_id', v_pending_session.session_id,
            'enemy_id', v_pending_session.enemy_id,
            'enemy_name', v_pending_session.enemy_name,
            'enemy_level', v_pending_session.enemy_level,
            'enemy_hp', v_pending_session.enemy_hp_remaining,
            'enemy_max_hp', v_pending_session.enemy_max_hp,
            'enemy_atk', v_pending_session.enemy_atk,
            'enemy_def', v_pending_session.enemy_def,
            'enemy_chakra', v_pending_session.enemy_chakra,
            'enemy_element', v_pending_session.enemy_element,
            'xp_reward', COALESCE((SELECT n.xp_reward FROM public.npcs AS n WHERE n.id = v_pending_session.enemy_id), 0),
            'ryou_reward', COALESCE((SELECT n.ryou_reward FROM public.npcs AS n WHERE n.id = v_pending_session.enemy_id), 0),
            'player_hp', v_pending_session.player_hp,
            'player_chakra', v_pending_session.player_chakra,
            'player_stamina', v_pending_session.player_stamina,
            'player_max_hp', v_pending_session.player_max_hp,
            'player_max_chakra', v_pending_session.player_max_chakra,
            'player_max_stamina', v_pending_session.player_max_stamina,
            'from_map', v_pending_session.from_map,
            'is_dojo', v_pending_session.is_dojo
        );
    END IF;

    -- An exam session cannot be silently abandoned by starting an ordinary encounter.
    IF EXISTS (
        SELECT 1
        FROM public.player_combat_sessions AS exam_session
        JOIN public.player_chunin_exams AS exam
          ON exam.active_session_id = exam_session.session_id
        WHERE exam.player_id = p_player_id
          AND exam.status = 'in_progress'
          AND exam_session.is_exam IS TRUE
          AND exam_session.status = 'active'
          AND exam_session.expires_at > now()
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Você tem uma etapa ativa do Exame Chunin. Retorne ao Exame antes de iniciar outro combate.'
        );
    END IF;

    -- Resume the current ordinary encounter or reject switching targets mid-turn.
    -- This prevents callers from abandoning an active session to skip the enemy response.
    SELECT * INTO v_active_session
    FROM public.player_combat_sessions
    WHERE player_id = p_player_id
      AND is_exam IS NOT TRUE
      AND status = 'active'
      AND expires_at > now()
    ORDER BY created_at DESC, session_id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        IF v_active_session.enemy_id <> p_enemy_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Você tem um combate ativo contra ' || v_active_session.enemy_name ||
                    '. Retome essa batalha ou abandone-a explicitamente antes de iniciar outra.'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'resumed_session', true,
            'session_id', v_active_session.session_id,
            'enemy_id', v_active_session.enemy_id,
            'enemy_name', v_active_session.enemy_name,
            'enemy_level', v_active_session.enemy_level,
            'enemy_hp', v_active_session.enemy_hp_remaining,
            'enemy_max_hp', v_active_session.enemy_max_hp,
            'enemy_atk', v_active_session.enemy_atk,
            'enemy_def', v_active_session.enemy_def,
            'enemy_chakra', v_active_session.enemy_chakra,
            'enemy_element', v_active_session.enemy_element,
            'xp_reward', COALESCE((SELECT n.xp_reward FROM public.npcs AS n WHERE n.id = v_active_session.enemy_id), 0),
            'ryou_reward', COALESCE((SELECT n.ryou_reward FROM public.npcs AS n WHERE n.id = v_active_session.enemy_id), 0),
            'player_hp', v_active_session.player_hp,
            'player_chakra', v_active_session.player_chakra,
            'player_stamina', v_active_session.player_stamina,
            'player_max_hp', v_active_session.player_max_hp,
            'player_max_chakra', v_active_session.player_max_chakra,
            'player_max_stamina', v_active_session.player_max_stamina,
            'from_map', v_active_session.from_map,
            'is_dojo', v_active_session.is_dojo,
            'awaiting_enemy_turn', COALESCE(v_active_session.awaiting_enemy_turn, false),
            'turn_count', v_active_session.turn_count
        );
    END IF;

    SELECT * INTO v_enemy
    FROM public.npcs
    WHERE id = p_enemy_id AND COALESCE(is_active, true) IS TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Inimigo não encontrado no catálogo oficial.');
    END IF;
    IF COALESCE(v_enemy.is_chunin_exam,false) THEN
        RETURN jsonb_build_object('success',false,'error','Este inimigo só pode ser acessado pelo fluxo oficial do Exame Chunin.');
    END IF;

    v_hp := GREATEST(1, COALESCE(v_enemy.hp, 1));
    v_atk := GREATEST(0, COALESCE(v_enemy.atk, 0));
    v_def := GREATEST(0, COALESCE(v_enemy.def, 0));
    v_level := GREATEST(1, COALESCE(v_enemy.level, 1));
    v_chakra := GREATEST(0, COALESCE(v_enemy.chakra, 0));

    IF COALESCE(v_enemy.is_story_mode, false) IS TRUE THEN
        v_level := GREATEST(v_level, GREATEST(1, COALESCE(v_player.level, 1)) + FLOOR(v_level::numeric / 5)::integer);
        v_scale_ratio := v_level::numeric / GREATEST(1, COALESCE(v_player.level, 1));
        v_early_nerf := CASE WHEN COALESCE(v_player.level, 1) < 15 THEN 0.7 ELSE 1.0 END;
        v_atk := GREATEST(1, FLOOR((v_atk * v_scale_ratio * v_early_nerf) + (v_level * 4))::integer);
        v_def := GREATEST(0, FLOOR((v_def * v_scale_ratio * v_early_nerf) + (v_level * 2))::integer);
        v_hp := GREATEST(1, FLOOR((v_hp + v_level * 50) * v_early_nerf)::integer);
        v_chakra := GREATEST(0, FLOOR((v_chakra + v_level * 25) * v_early_nerf)::integer);
    END IF;

    v_max_hp := public.kurokage_player_max_stat(p_player_id, 'hp');
    v_max_chakra := public.kurokage_player_max_stat(p_player_id, 'chakra');
    v_max_stamina := public.kurokage_player_max_stat(p_player_id, 'stamina');
    v_player_hp := LEAST(v_max_hp, GREATEST(0, COALESCE(v_player.hp, v_max_hp)));
    v_player_chakra := LEAST(v_max_chakra, GREATEST(0, COALESCE(v_player.chakra, v_max_chakra)));
    v_player_stamina := LEAST(v_max_stamina, GREATEST(0, COALESCE(v_player.stamina, v_max_stamina)));

    IF v_player_hp <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sua vida está zerada. Vá ao hospital antes de lutar.');
    END IF;

    IF COALESCE(p_from_map, false) AND NOT COALESCE(v_enemy.is_map_npc, false)
       AND NOT COALESCE(v_enemy.is_story_mode, false)
       AND NOT COALESCE(v_enemy.is_bingo_book, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este inimigo não está disponível no mapa.');
    END IF;

    IF COALESCE(p_is_dojo, false) AND (
       COALESCE(v_enemy.is_map_npc, false)
       OR COALESCE(v_enemy.is_story_mode, false)
       OR COALESCE(v_enemy.is_bingo_book, false)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este inimigo não pertence à lista de combates do Dojo.');
    END IF;

    IF NOT COALESCE(p_from_map, false)
       AND NOT COALESCE(p_is_dojo, false)
       AND NOT COALESCE(v_enemy.is_story_mode, false)
       AND NOT COALESCE(v_enemy.is_bingo_book, false)
       AND NOT COALESCE(v_enemy.is_map_npc, false) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Contexto de combate inválido.');
    END IF;

    IF (COALESCE(v_enemy.is_story_mode, false) OR COALESCE(v_enemy.is_bingo_book, false))
       AND EXISTS (
          SELECT 1 FROM public.player_defeated_npcs d
          WHERE d.player_id = p_player_id AND d.npc_id = v_enemy.id
       ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este inimigo já foi registrado como derrotado.');
    END IF;

    v_from_map := COALESCE(p_from_map, false) AND COALESCE(v_enemy.is_map_npc, false);
    v_is_dojo := COALESCE(p_is_dojo, false) AND NOT COALESCE(v_enemy.is_map_npc, false)
        AND NOT COALESCE(v_enemy.is_story_mode, false)
        AND NOT COALESCE(v_enemy.is_bingo_book, false);

    UPDATE public.player_combat_sessions
    SET status = 'abandoned', awaiting_enemy_turn = false
    WHERE player_id = p_player_id AND status = 'active';

    INSERT INTO public.player_combat_sessions (
        player_id, enemy_id, enemy_name, enemy_max_hp, enemy_hp_remaining,
        enemy_atk, enemy_def, enemy_level, enemy_chakra, enemy_element,
        player_max_hp, player_max_chakra, player_max_stamina,
        player_hp, player_chakra, player_stamina, from_map, is_dojo
    ) VALUES (
        p_player_id, v_enemy.id, v_enemy.name, v_hp, v_hp,
        v_atk, v_def, v_level, v_chakra, v_enemy.element,
        v_max_hp, v_max_chakra, v_max_stamina,
        v_player_hp, v_player_chakra, v_player_stamina, v_from_map, v_is_dojo
    )
    RETURNING session_id INTO v_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'enemy_id', v_enemy.id,
        'enemy_name', v_enemy.name,
        'enemy_level', v_level,
        'enemy_hp', v_hp,
        'enemy_max_hp', v_hp,
        'enemy_atk', v_atk,
        'enemy_def', v_def,
        'enemy_chakra', v_chakra,
        'enemy_element', v_enemy.element,
        'xp_reward', COALESCE(v_enemy.xp_reward, 0),
        'ryou_reward', COALESCE(v_enemy.ryou_reward, 0),
        'player_hp', v_player_hp,
        'player_chakra', v_player_chakra,
        'player_stamina', v_player_stamina,
        'player_max_hp', v_max_hp,
        'player_max_chakra', v_max_chakra,
        'player_max_stamina', v_max_stamina,
        'from_map', v_from_map,
        'is_dojo', v_is_dojo
    );
END;
$function$
;

NOTIFY pgrst, 'reload schema';
