-- Migration 059: normalizar os nomes de graduação nas RPCs atuais.
-- Repete exatamente as verificações e recompensas de 2026-10-30.
-- Somente normaliza aliases de ranks e rejeita rank desconhecido;
-- nenhuma atualização de dados, experiência, créditos ou atributos.
-- Revisar e publicar em CI antes da aplicação em produção.

CREATE OR REPLACE FUNCTION public.aprender_jutsu(p_player_id integer, p_jutsu_id integer, p_cost integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_jutsu public.jutsus%ROWTYPE;
    v_learned jsonb;
    v_required_rank integer;
    v_player_rank integer;
    v_attr integer;
    v_cost integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_jutsu FROM public.jutsus
    WHERE id = p_jutsu_id AND COALESCE(is_active,true) IS TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Jutsu não encontrado.'); END IF;

    v_learned := COALESCE(v_player.jutsus_learned,'[]'::jsonb);
    IF jsonb_typeof(v_learned) <> 'array' THEN v_learned := '[]'::jsonb; END IF;

    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_learned) AS x(item)
        WHERE COALESCE(item->>'id', item #>> '{}') = p_jutsu_id::text
    ) OR EXISTS (
        SELECT 1 FROM public.player_jutsus pj WHERE pj.player_id = p_player_id AND pj.jutsu_id = p_jutsu_id
    ) THEN
        RETURN jsonb_build_object('success',false,'error','Você já conhece este jutsu.');
    END IF;

    v_player_rank := CASE lower(COALESCE(v_player.rank,''))
        WHEN 'estudante da academia' THEN 0 WHEN 'estudante' THEN 0
        WHEN 'genin' THEN 1 WHEN 'chunin' THEN 2
        WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
        WHEN 'anbu' THEN 4
        WHEN 'sannin' THEN 5 WHEN 'sannin lendário' THEN 5 WHEN 'sannin lendario' THEN 5
        WHEN 'herói' THEN 6 WHEN 'heroi' THEN 6
        WHEN 'herói mundial' THEN 6 WHEN 'heroi mundial' THEN 6
        ELSE -1 END;
    IF v_player_rank < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Graduação atual não reconhecida.');
    END IF;
    v_required_rank := CASE lower(COALESCE(v_jutsu.req_rank,''))
        WHEN '' THEN 0 WHEN 'estudante da academia' THEN 0 WHEN 'estudante' THEN 0
        WHEN 'genin' THEN 1 WHEN 'chunin' THEN 2
        WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
        WHEN 'anbu' THEN 4
        WHEN 'sannin' THEN 5 WHEN 'sannin lendário' THEN 5 WHEN 'sannin lendario' THEN 5
        WHEN 'herói' THEN 6 WHEN 'heroi' THEN 6
        WHEN 'herói mundial' THEN 6 WHEN 'heroi mundial' THEN 6
        ELSE 99 END;

    IF COALESCE(v_player.level,1) < COALESCE(v_jutsu.req_level,1)
       OR v_player_rank < v_required_rank THEN
        RETURN jsonb_build_object('success',false,'error','Requisitos de nível ou graduação não atendidos.');
    END IF;

    IF COALESCE(v_jutsu.req_class,'') <> ''
       AND lower(v_jutsu.req_class) NOT IN ('todos','qualquer','all')
       AND lower(v_jutsu.req_class) <> lower(COALESCE(v_player.class,'')) THEN
        RETURN jsonb_build_object('success',false,'error','Classe incompatível com este jutsu.');
    END IF;

    IF COALESCE(v_jutsu.req_seals,0) > COALESCE(v_player.selo,0) THEN
        RETURN jsonb_build_object('success',false,'error','Nível de selos insuficiente.');
    END IF;

    IF COALESCE(v_jutsu.req_attr_value,0) > 0 THEN
        v_attr := CASE lower(COALESCE(v_jutsu.category,''))
          WHEN 'taijutsu' THEN COALESCE(v_player.taijutsu,COALESCE(v_player.tai,0))
          WHEN 'bukijutsu' THEN COALESCE(v_player.bukijutsu,COALESCE(v_player.buk,0))
          WHEN 'genjutsu' THEN COALESCE(v_player.genjutsu,COALESCE(v_player.gen,0))
          ELSE COALESCE(v_player.ninjutsu,COALESCE(v_player.nin,0)) END;
        IF v_attr < v_jutsu.req_attr_value THEN
            RETURN jsonb_build_object('success',false,'error','Atributo insuficiente para este jutsu.');
        END IF;
    END IF;

    IF COALESCE(v_jutsu.req_clan,'') <> ''
       AND lower(v_jutsu.req_clan) NOT IN ('todos','qualquer','all')
       AND lower(v_jutsu.req_clan) <> lower(COALESCE(v_player.clan,'')) THEN
        RETURN jsonb_build_object('success',false,'error','Seu clã não pode aprender este jutsu.');
    END IF;

    IF COALESCE(v_jutsu.element,'') <> ''
       AND lower(v_jutsu.element) NOT IN ('todos','qualquer','all')
       AND lower(v_jutsu.element) <> lower(COALESCE(v_player.element,'')) THEN
        RETURN jsonb_build_object('success',false,'error','Você não possui o elemento necessário para este jutsu.');
    END IF;

    v_cost := GREATEST(0, COALESCE(v_jutsu.cost_ryous,0));
    IF COALESCE(v_player.ryous,0) < v_cost THEN
        RETURN jsonb_build_object('success',false,'error','Ryous insuficientes.','cost',v_cost);
    END IF;

    UPDATE public.players
    SET ryous = COALESCE(ryous,0) - v_cost,
        jutsus_learned = v_learned || jsonb_build_array(jsonb_build_object(
          'id', p_jutsu_id, 'level', 1, 'slots', jsonb_build_array(NULL,NULL,NULL)
        ))
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success',true,'jutsu_id',p_jutsu_id,'cost',v_cost);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.promover_graduacao(p_player_id integer, p_novo_rank text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_current public.ranks%ROWTYPE;
    v_target public.ranks%ROWTYPE;
    v_jutsu_count integer;
    v_jutsu2_count integer;
    v_jutsu3_count integer;
    v_combat_points numeric;
    v_bonus integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
    IF NOT FOUND OR v_player.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Ação não autorizada.'; END IF;

    SELECT * INTO v_current FROM public.ranks r
    WHERE lower(r.name_id) = lower(v_player.rank)
       OR lower(r.title) = lower(v_player.rank)
       OR (lower(v_player.rank)='jounin' AND lower(r.name_id)='jonin')
       OR (lower(v_player.rank)='herói' AND lower(r.name_id)='heroi')
    ORDER BY r.id LIMIT 1;
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Graduação atual não reconhecida. Atualize seu personagem ou contate o suporte.'
        );
    END IF;

    SELECT * INTO v_target FROM public.ranks WHERE id = v_current.id + 1 LIMIT 1;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Você já alcançou a graduação máxima.'); END IF;
    IF lower(COALESCE(p_novo_rank,'')) NOT IN (lower(v_target.title), lower(v_target.name_id),
       CASE WHEN v_target.name_id='jonin' THEN 'jounin' ELSE lower(v_target.title) END,
       CASE WHEN v_target.name_id='sannin' THEN 'sannin' ELSE lower(v_target.title) END,
       CASE WHEN v_target.name_id='heroi' THEN 'herói' ELSE lower(v_target.title) END) THEN
        RETURN jsonb_build_object('success', false, 'error', 'A próxima graduação foi alterada. Atualize a página.');
    END IF;

    v_combat_points := (((COALESCE(v_player.wins_pvp,0) + COALESCE(v_player.losses_pvp,0)) * 1.5)
        + COALESCE(v_player.npc_wins,0) + COALESCE(v_player.wins_dojo,0));
    SELECT count(*)::integer,
           count(*) FILTER (WHERE COALESCE((e.item->>'level')::integer,1) >= 2)::integer,
           count(*) FILTER (WHERE COALESCE((e.item->>'level')::integer,1) >= 3)::integer
      INTO v_jutsu_count, v_jutsu2_count, v_jutsu3_count
      FROM jsonb_array_elements(COALESCE(v_player.jutsus_learned,'[]'::jsonb)) AS e(item);

    IF COALESCE(v_player.level,1) < COALESCE(v_target.req_level,0)
       OR COALESCE(v_player.tasks_completed,0) < COALESCE(v_target.req_tasks,0)
       OR v_jutsu_count < COALESCE(v_target.req_jutsus,0)
       OR COALESCE(v_player.missions_d,0) < COALESCE(v_target.req_missions_d,0)
       OR COALESCE(v_player.missions_c,0) < COALESCE(v_target.req_missions_c,0)
       OR COALESCE(v_player.missions_b,0) < COALESCE(v_target.req_missions_b,0)
       OR COALESCE(v_player.missions_a,0) < COALESCE(v_target.req_missions_a,0)
       OR COALESCE(v_player.missions_s,0) < COALESCE(v_target.req_missions_s,0)
       OR COALESCE(v_player.npc_wins,0) < COALESCE(v_target.req_npc_wins,0)
       OR v_combat_points < COALESCE(v_target.req_combat_points,0)
       OR COALESCE(v_jutsu2_count,0) < COALESCE(v_target.req_jutsus_lvl2,0)
       OR COALESCE(v_jutsu3_count,0) < COALESCE(v_target.req_jutsus_lvl3,0)
       OR COALESCE(v_player.bingo_book_kills,0) < COALESCE(v_target.req_bingo_book,0)
       OR (v_target.name_id='chunin' AND COALESCE(v_player.passou_exame_chunin,false) IS NOT TRUE) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Os requisitos de graduação ainda não foram cumpridos.');
    END IF;

    v_bonus := CASE v_target.name_id
        WHEN 'genin' THEN 5 WHEN 'chunin' THEN 10 WHEN 'jonin' THEN 20
        WHEN 'anbu' THEN 35 WHEN 'sannin' THEN 50 WHEN 'heroi' THEN 100 ELSE 0 END;

    UPDATE public.players
    SET rank = v_target.title,
        pontos_atributos = COALESCE(pontos_atributos,0) + v_bonus
    WHERE id = p_player_id;

    RETURN jsonb_build_object('success', true, 'new_rank', v_target.title, 'bonus_points', v_bonus);
END;
$function$
;
REVOKE ALL ON FUNCTION public.aprender_jutsu(integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_jutsu(integer, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.promover_graduacao(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promover_graduacao(integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
