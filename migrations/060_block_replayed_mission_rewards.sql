-- 060: defesa contra recompensas duplicadas por replay de missões.
-- Muda apenas a validação de unicidade de missões concluídas.
-- Preserva 100% dos requisitos, tempos, preços, recompensas e contadores existentes.
-- Sem atualização de dados de personagens. Não reinicia missão nem remove progresso.
-- O servidor ignora os parâmetros fornecidos pelo cliente para duração e recompensas.

CREATE OR REPLACE FUNCTION public.iniciar_missao(p_player_id integer, p_mission_id integer, p_duration_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_mission public.missions%ROWTYPE;
    v_active jsonb;
    v_end_time timestamptz;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id AND is_active IS TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Missão indisponível.'); END IF;
    IF COALESCE(v_player.level, 1) < COALESCE(v_mission.req_level, 1) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nível insuficiente.');
    END IF;

    v_active := COALESCE(v_player.active_missions, '[]'::jsonb);
    IF jsonb_typeof(v_active) <> 'array' THEN RAISE EXCEPTION 'Estado de missões inválido.'; END IF;
    -- Segurança: uma missão concluída não pode gerar recompensas novamente.
    -- A linha do jogador já está bloqueada FOR UPDATE (evita corrida entre RPCs).
    IF jsonb_typeof(COALESCE(v_player.completed_missions, '[]'::jsonb)) <> 'array' THEN
        RAISE EXCEPTION 'Estado de missões concluídas inválido.';
    END IF;
    IF COALESCE(v_player.completed_missions, '[]'::jsonb) @> jsonb_build_array(p_mission_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta missão já foi concluída.');
    END IF;
    IF jsonb_array_length(v_active) >= GREATEST(1, COALESCE(v_player.mission_slots, 1)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Todos os espaços de missão estão ocupados.');
    END IF;
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_active) AS m(item)
        WHERE (m.item->>'mission_id')::integer = p_mission_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta missão já está ativa.');
    END IF;

    v_end_time := now() + make_interval(secs => GREATEST(1, COALESCE(v_mission.time_seconds, 1)));
    v_active := v_active || jsonb_build_array(jsonb_build_object(
        'mission_id', v_mission.id,
        'end_time', v_end_time,
        'title', v_mission.title
    ));
    UPDATE public.players SET active_missions = v_active WHERE id = p_player_id;
    RETURN jsonb_build_object('success', true, 'mission_id', p_mission_id, 'end_time', v_end_time);
END;
$function$
;
CREATE OR REPLACE FUNCTION public.finalizar_missao(p_player_id integer, p_mission_id integer, p_mission_xp integer, p_mission_ryous integer, p_mission_type text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_mission public.missions%ROWTYPE;
    v_active jsonb;
    v_completed jsonb;
    v_end_time timestamptz;
    v_new_xp bigint;
    v_new_level integer;
    v_levels_gained integer := 0;
    v_new_rank text;
    v_mission_type text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_mission FROM public.missions WHERE id = p_mission_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Missão inexistente.'); END IF;

    v_active := COALESCE(v_player.active_missions, '[]'::jsonb);
    IF jsonb_typeof(v_active) <> 'array' THEN RAISE EXCEPTION 'Estado de missões inválido.'; END IF;
    -- Defesa em profundidade: a conclusão também valida a unicidade do resgate.
    -- Isso bloqueia recompensas duplicadas em sessões antigas ou solicitações simultâneas.
    v_completed := COALESCE(v_player.completed_missions, '[]'::jsonb);
    IF jsonb_typeof(v_completed) <> 'array' THEN
        RAISE EXCEPTION 'Estado de missões concluídas inválido.';
    END IF;
    IF v_completed @> jsonb_build_array(p_mission_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta missão já foi concluída.');
    END IF;

    SELECT (m.item->>'end_time')::timestamptz INTO v_end_time
    FROM jsonb_array_elements(v_active) AS m(item)
    WHERE (m.item->>'mission_id')::integer = p_mission_id
    LIMIT 1;

    IF v_end_time IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Missão não encontrada na lista ativa.'); END IF;
    IF now() < v_end_time THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tempo da missão ainda não acabou.',
          'remaining_seconds', extract(epoch FROM (v_end_time - now())));
    END IF;

    SELECT COALESCE(jsonb_agg(m.item), '[]'::jsonb) INTO v_active
    FROM jsonb_array_elements(COALESCE(v_player.active_missions, '[]'::jsonb)) AS m(item)
    WHERE (m.item->>'mission_id')::integer <> p_mission_id;

    -- A verificação anterior garante que esta missão ainda não foi resgatada.
    v_completed := v_completed || jsonb_build_array(p_mission_id);

    v_new_xp := COALESCE(v_player.xp, 0) + GREATEST(0, COALESCE(v_mission.xp, 0));
    v_new_level := public.calcular_level_por_xp(v_new_xp);
    v_levels_gained := GREATEST(0, v_new_level - COALESCE(v_player.level, 1));
    v_new_rank := v_player.rank;
    v_mission_type := COALESCE(v_mission.mission_type, '');

    IF v_new_level >= 5 AND v_player.rank = 'Estudante da Academia' THEN
        v_new_rank := 'Genin';
    END IF;

    UPDATE public.players
    SET active_missions = v_active,
        completed_missions = v_completed,
        xp = v_new_xp,
        level = v_new_level,
        rank = v_new_rank,
        pontos_atributos = COALESCE(pontos_atributos, 0) + (v_levels_gained * 5),
        ryous = COALESCE(ryous, 0) + GREATEST(0, COALESCE(v_mission.ryous, 0)),
        tasks_completed = CASE WHEN v_mission_type = 'tarefa_academia' THEN COALESCE(tasks_completed, 0) + 1 ELSE tasks_completed END,
        missions_d = CASE WHEN v_mission_type = 'D' THEN COALESCE(missions_d, 0) + 1 ELSE missions_d END,
        missions_c = CASE WHEN v_mission_type = 'C' THEN COALESCE(missions_c, 0) + 1 ELSE missions_c END,
        missions_b = CASE WHEN v_mission_type = 'B' THEN COALESCE(missions_b, 0) + 1 ELSE missions_b END,
        missions_a = CASE WHEN v_mission_type = 'A' THEN COALESCE(missions_a, 0) + 1 ELSE missions_a END,
        missions_s = CASE WHEN v_mission_type = 'S' THEN COALESCE(missions_s, 0) + 1 ELSE missions_s END
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'xp_gained', GREATEST(0, COALESCE(v_mission.xp, 0)),
        'ryous_gained', GREATEST(0, COALESCE(v_mission.ryous, 0)), 'levels_gained', v_levels_gained, 'new_rank', v_new_rank);
END;
$function$
;
REVOKE ALL ON FUNCTION public.iniciar_missao(integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_missao(integer, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.finalizar_missao(integer, integer, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_missao(integer, integer, integer, integer, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
