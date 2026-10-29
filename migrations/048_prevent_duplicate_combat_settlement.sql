-- Migration 048: prevent duplicate or conflicting PvE victory settlement.
-- A defeated session is a pending reward until atomically settled. Reopening that encounter
-- recovers the same session; starting a different encounter is blocked until the pending win
-- is settled or expires. Chunin exam settlement is tied to its exact active round/session.

CREATE OR REPLACE FUNCTION public.finalizar_combate_sessao(p_player_id integer, p_session_id uuid, p_turn_count integer, p_combat_log jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_exam public.player_chunin_exams%ROWTYPE;
    v_reward jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id = p_session_id AND player_id = p_player_id
    FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Sessão de combate inválida.'); END IF;
    IF v_session.status <> 'defeated' OR v_session.enemy_hp_remaining > 0 THEN
        RETURN jsonb_build_object('success',false,'error','O servidor ainda não confirmou a vitória.');
    END IF;
    IF v_session.expires_at <= now() THEN
        UPDATE public.player_combat_sessions SET status = 'expired' WHERE session_id = p_session_id;
        RETURN jsonb_build_object('success',false,'error','Sessão de combate expirada.');
    END IF;

    IF v_session.is_exam THEN
        SELECT * INTO v_exam
        FROM public.player_chunin_exams
        WHERE player_id = p_player_id
        FOR UPDATE;

        IF NOT FOUND
           OR v_exam.status <> 'in_progress'
           OR v_exam.current_round <> v_session.exam_round
           OR v_exam.active_session_id IS DISTINCT FROM p_session_id THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Esta etapa não é mais a sessão ativa do Exame Chunin.'
            );
        END IF;
    ELSE
        IF EXISTS (
            SELECT 1
            FROM public.player_combat_sessions AS newer
            WHERE newer.player_id = p_player_id
              AND newer.session_id <> p_session_id
              AND (
                  newer.created_at > v_session.created_at
                  OR (
                      newer.created_at = v_session.created_at
                      AND newer.session_id > v_session.session_id
                  )
              )
        ) THEN
            UPDATE public.player_combat_sessions
            SET status = 'abandoned', awaiting_enemy_turn = false
            WHERE session_id = p_session_id;

            RETURN jsonb_build_object(
                'success', false,
                'error', 'Esta vitória pertence a uma sessão antiga e não pode gerar recompensas novamente.'
            );
        END IF;
    END IF;

    UPDATE public.player_combat_sessions SET status = 'settled' WHERE session_id = p_session_id;

    UPDATE public.players
    SET hp = v_session.player_hp,
        chakra = v_session.player_chakra,
        stamina = v_session.player_stamina,
        is_fainted = false,
        fainted_at = NULL,
        wins_dojo = CASE WHEN v_session.is_dojo THEN COALESCE(wins_dojo,0)+1 ELSE COALESCE(wins_dojo,0) END,
        dojo_clears = CASE WHEN v_session.is_dojo THEN COALESCE(dojo_clears,0)+1 ELSE COALESCE(dojo_clears,0) END,
        daily_map_battles = CASE WHEN v_session.from_map THEN COALESCE(daily_map_battles,0)+1 ELSE COALESCE(daily_map_battles,0) END
    WHERE id = p_player_id;

    IF v_session.is_exam THEN
        IF v_session.exam_round = 3 THEN
            UPDATE public.players SET passou_exame_chunin=true WHERE id=p_player_id;
            UPDATE public.player_chunin_exams
            SET status='completed',current_round=4,active_session_id=NULL,
                completed_at=now(),updated_at=now()
            WHERE player_id=p_player_id;
            RETURN jsonb_build_object(
                'success',true,'session_settled',true,'is_exam',true,
                'exam_round_completed',3,'exam_completed',true,
                'message','Exame Chunin concluído. Aprovação confirmada pelo servidor.'
            );
        ELSE
            UPDATE public.player_chunin_exams
            SET status='in_progress',current_round=v_session.exam_round+1,
                active_session_id=NULL,updated_at=now()
            WHERE player_id=p_player_id;
            RETURN jsonb_build_object(
                'success',true,'session_settled',true,'is_exam',true,
                'exam_round_completed',v_session.exam_round,
                'next_round',v_session.exam_round+1,
                'message','Etapa concluída. Prossiga para a próxima etapa.'
            );
        END IF;
    END IF;

    -- Story and bounty progress is recorded only after the server confirms a session victory.
    IF EXISTS (
        SELECT 1 FROM public.npcs n
        WHERE n.id = v_session.enemy_id
          AND (COALESCE(n.is_story_mode,false) OR COALESCE(n.is_bingo_book,false))
    ) THEN
        INSERT INTO public.player_defeated_npcs (player_id, npc_id)
        VALUES (p_player_id, v_session.enemy_id)
        ON CONFLICT DO NOTHING;
    END IF;

    v_reward := public.finalizar_combate(
        p_player_id,
        v_session.enemy_id,
        'win',
        GREATEST(0, LEAST(1000, COALESCE(p_turn_count,0))),
        COALESCE(p_combat_log, '[]'::jsonb),
        0,
        0,
        v_session.enemy_name,
        v_session.from_map
    );

    RETURN v_reward || jsonb_build_object(
        'success', COALESCE((v_reward->>'success')::boolean, false),
        'session_settled', true
    );
END;
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.iniciar_exame_chunin(p_player_id integer, p_round integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_exam public.player_chunin_exams%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_enemy public.npcs%ROWTYPE;
    v_session_id uuid;
    v_level integer;
    v_hp integer;
    v_chakra integer;
    v_atk integer;
    v_def integer;
    v_element text;
    v_max_hp integer;
    v_max_chakra integer;
    v_max_stamina integer;
    v_player_hp integer;
    v_player_chakra integer;
    v_player_stamina integer;
    v_hp_multiplier numeric;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    IF p_round IS NULL OR p_round NOT BETWEEN 1 AND 3 THEN
        RETURN jsonb_build_object('success',false,'error','Etapa de exame inválida.');
    END IF;

    SELECT * INTO v_player
    FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    IF lower(COALESCE(v_player.rank,'')) <> 'genin' THEN
        RETURN jsonb_build_object('success',false,'error','Somente ninjas Genin podem iniciar o Exame Chunin.');
    END IF;
    IF COALESCE(v_player.passou_exame_chunin,false) THEN
        RETURN jsonb_build_object('success',false,'error','Você já foi aprovado no Exame Chunin.');
    END IF;
    IF COALESCE(v_player.is_fainted,false) OR COALESCE(v_player.hp,0) <= 0 THEN
        RETURN jsonb_build_object('success',false,'error','Recupere-se no hospital antes de iniciar o exame.');
    END IF;

    SELECT * INTO v_exam
    FROM public.player_chunin_exams
    WHERE player_id = p_player_id
    FOR UPDATE;

    IF NOT FOUND THEN
        IF p_round <> 1 THEN
            RETURN jsonb_build_object('success',false,'error','O Exame deve começar pela Etapa 1.');
        END IF;
        INSERT INTO public.player_chunin_exams (player_id,current_round,status)
        VALUES (p_player_id,1,'in_progress')
        RETURNING * INTO v_exam;
    ELSIF v_exam.status = 'failed' THEN
        IF p_round <> 1 THEN
            RETURN jsonb_build_object('success',false,'error','Após uma reprovação, reinicie pela Etapa 1.');
        END IF;
        UPDATE public.player_chunin_exams
        SET current_round=1,status='in_progress',active_session_id=NULL,updated_at=now(),completed_at=NULL
        WHERE player_id=p_player_id
        RETURNING * INTO v_exam;
    ELSIF v_exam.status = 'completed' THEN
        RETURN jsonb_build_object('success',false,'error','Este exame já foi concluído.');
    END IF;

    IF v_exam.current_round <> p_round THEN
        RETURN jsonb_build_object('success',false,'error','Etapa fora de ordem. Conclua a etapa atual primeiro.');
    END IF;

    -- Do not let an ordinary PvE victory or an active ordinary fight be bypassed by entering the exam.
    IF EXISTS (
        SELECT 1
        FROM public.player_combat_sessions AS ordinary
        WHERE ordinary.player_id = p_player_id
          AND ordinary.is_exam IS NOT TRUE
          AND ordinary.expires_at > now()
          AND (
              ordinary.status = 'active'
              OR (ordinary.status = 'defeated' AND ordinary.enemy_hp_remaining <= 0)
          )
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Conclua o combate atual ou confirme a vitória pendente antes de iniciar o Exame Chunin.'
        );
    END IF;

    SELECT * INTO v_session
    FROM public.player_combat_sessions
    WHERE player_id = p_player_id
      AND is_exam IS TRUE
      AND exam_round = p_round
      AND expires_at > now()
      AND (
          status = 'active'
          OR (status = 'defeated' AND enemy_hp_remaining <= 0)
      )
    ORDER BY created_at DESC, session_id DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        UPDATE public.player_chunin_exams
        SET active_session_id = v_session.session_id, updated_at = now()
        WHERE player_id = p_player_id;

        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_session.session_id,
            'enemy_id', v_session.enemy_id,
            'enemy_name', v_session.enemy_name,
            'enemy_level', v_session.enemy_level,
            'enemy_hp', v_session.enemy_hp_remaining,
            'enemy_max_hp', v_session.enemy_max_hp,
            'enemy_atk', v_session.enemy_atk,
            'enemy_def', v_session.enemy_def,
            'enemy_chakra', v_session.enemy_chakra,
            'enemy_element', v_session.enemy_element,
            'xp_reward', 0,
            'ryou_reward', 0,
            'player_hp', v_session.player_hp,
            'player_chakra', v_session.player_chakra,
            'player_stamina', v_session.player_stamina,
            'player_max_hp', v_session.player_max_hp,
            'player_max_chakra', v_session.player_max_chakra,
            'player_max_stamina', v_session.player_max_stamina,
            'is_exam', true,
            'exam_round', v_session.exam_round,
            'pending_victory', v_session.status = 'defeated'
        );
    END IF;

    UPDATE public.player_chunin_exams
    SET active_session_id = NULL, updated_at = now()
    WHERE player_id = p_player_id;

    SELECT * INTO v_enemy FROM public.npcs
    WHERE is_chunin_exam IS TRUE AND exam_round = p_round AND COALESCE(is_active,true) IS TRUE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Catálogo interno do exame incompleto.'; END IF;

    v_level := LEAST(1000, GREATEST(1, COALESCE(v_player.level,1) +
        CASE p_round WHEN 1 THEN 0 WHEN 2 THEN 2 ELSE 4 END));
    v_hp_multiplier := CASE p_round WHEN 1 THEN 1.0 WHEN 2 THEN 1.2 ELSE 1.5 END;
    v_hp := LEAST(100000000, GREATEST(1, FLOOR(v_level * 100 * v_hp_multiplier)::integer));
    v_chakra := LEAST(100000000, v_level * 50);
    v_atk := LEAST(1000000, v_level * 8);
    v_def := LEAST(1000000, v_level * 6);
    v_element := (ARRAY['Katon','Suiton','Doton','Futon','Raiton'])[1 + FLOOR(random()*5)::integer];

    v_max_hp := public.kurokage_player_max_stat(p_player_id,'hp');
    v_max_chakra := public.kurokage_player_max_stat(p_player_id,'chakra');
    v_max_stamina := public.kurokage_player_max_stat(p_player_id,'stamina');
    v_player_hp := LEAST(v_max_hp,GREATEST(0,COALESCE(v_player.hp,v_max_hp)));
    v_player_chakra := LEAST(v_max_chakra,GREATEST(0,COALESCE(v_player.chakra,v_max_chakra)));
    v_player_stamina := LEAST(v_max_stamina,GREATEST(0,COALESCE(v_player.stamina,v_max_stamina)));
    IF v_player_hp <= 0 THEN
        RETURN jsonb_build_object('success',false,'error','Vida insuficiente para continuar o Exame Chunin.');
    END IF;

    UPDATE public.player_combat_sessions SET status='abandoned',awaiting_enemy_turn=false
    WHERE player_id=p_player_id AND status='active';

    INSERT INTO public.player_combat_sessions (
        player_id,enemy_id,enemy_name,enemy_max_hp,enemy_hp_remaining,
        enemy_atk,enemy_def,enemy_level,enemy_chakra,enemy_element,
        player_max_hp,player_max_chakra,player_max_stamina,
        player_hp,player_chakra,player_stamina,from_map,is_dojo,is_exam,exam_round
    ) VALUES (
        p_player_id,v_enemy.id,v_enemy.name,v_hp,v_hp,
        v_atk,v_def,v_level,v_chakra,v_element,
        v_max_hp,v_max_chakra,v_max_stamina,
        v_player_hp,v_player_chakra,v_player_stamina,false,false,true,p_round
    ) RETURNING session_id INTO v_session_id;

    UPDATE public.player_chunin_exams
    SET active_session_id=v_session_id,updated_at=now()
    WHERE player_id=p_player_id;

    RETURN jsonb_build_object(
        'success',true,'session_id',v_session_id,
        'enemy_id',v_enemy.id,'enemy_name',v_enemy.name,
        'enemy_level',v_level,'enemy_hp',v_hp,'enemy_max_hp',v_hp,
        'enemy_atk',v_atk,'enemy_def',v_def,'enemy_chakra',v_chakra,
        'enemy_element',v_element,'xp_reward',0,'ryou_reward',0,
        'player_hp',v_player_hp,'player_chakra',v_player_chakra,
        'player_stamina',v_player_stamina,'player_max_hp',v_max_hp,
        'player_max_chakra',v_max_chakra,'player_max_stamina',v_max_stamina,
        'is_exam',true,'exam_round',p_round
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalizar_combate_sessao(integer, uuid, integer, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_combate_sessao(integer, uuid, integer, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_combate_sessao(integer, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_combate_sessao(integer, integer, boolean, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_exame_chunin(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_exame_chunin(integer, integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
