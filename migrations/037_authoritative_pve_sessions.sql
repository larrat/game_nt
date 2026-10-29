-- Migration 037: make ordinary PvE rewards depend on server-owned combat sessions.
-- Client-side enemy HP, victory flags, player attack stats, and jutsu payloads are not trusted.

CREATE TABLE IF NOT EXISTS public.player_combat_sessions (
    session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    enemy_id integer NOT NULL REFERENCES public.npcs(id),
    enemy_name text NOT NULL,
    enemy_max_hp integer NOT NULL CHECK (enemy_max_hp > 0),
    enemy_hp_remaining integer NOT NULL CHECK (enemy_hp_remaining >= 0),
    enemy_atk integer NOT NULL CHECK (enemy_atk >= 0),
    enemy_def integer NOT NULL CHECK (enemy_def >= 0),
    enemy_level integer NOT NULL CHECK (enemy_level >= 1),
    enemy_chakra integer NOT NULL DEFAULT 0,
    enemy_element text,
    player_max_hp integer NOT NULL CHECK (player_max_hp > 0),
    player_max_chakra integer NOT NULL CHECK (player_max_chakra > 0),
    player_max_stamina integer NOT NULL CHECK (player_max_stamina > 0),
    player_hp integer NOT NULL CHECK (player_hp >= 0),
    player_chakra integer NOT NULL CHECK (player_chakra >= 0),
    player_stamina integer NOT NULL CHECK (player_stamina >= 0),
    awaiting_enemy_turn boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'defeated', 'player_defeated', 'settled', 'abandoned', 'expired')),
    turn_count integer NOT NULL DEFAULT 0 CHECK (turn_count >= 0),
    last_jutsu_id integer,
    last_jutsu_turn integer,
    from_map boolean NOT NULL DEFAULT false,
    is_dojo boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_action_at timestamptz,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes')
);

ALTER TABLE public.player_combat_sessions
    ADD COLUMN IF NOT EXISTS is_exam boolean NOT NULL DEFAULT false;
ALTER TABLE public.player_combat_sessions
    ADD COLUMN IF NOT EXISTS exam_round integer;

ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS is_chunin_exam boolean NOT NULL DEFAULT false;
ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS exam_round integer;
CREATE UNIQUE INDEX IF NOT EXISTS npcs_chunin_exam_round_unique_idx
    ON public.npcs(exam_round)
    WHERE is_chunin_exam IS TRUE AND exam_round IS NOT NULL;

INSERT INTO public.npcs
    (name, level, hp, chakra, atk, def, element, avatar, xp_reward, ryou_reward,
     rank, is_active, is_map_npc, is_story_mode, is_bingo_book, description,
     is_chunin_exam, exam_round)
VALUES
    ('Exame Chunin — Etapa 1', 1, 100, 50, 8, 6, 'Katon', '🥷', 0, 0,
     'Genin', true, false, false, false, 'Encontro interno do Exame Chunin — Etapa 1.', true, 1),
    ('Exame Chunin — Etapa 2', 1, 100, 50, 8, 6, 'Suiton', '👺', 0, 0,
     'Genin', true, false, false, false, 'Encontro interno do Exame Chunin — Etapa 2.', true, 2),
    ('Exame Chunin — Etapa 3', 1, 100, 50, 8, 6, 'Doton', '👹', 0, 0,
     'Genin', true, false, false, false, 'Encontro interno do Exame Chunin — Etapa 3.', true, 3)
ON CONFLICT (exam_round) WHERE is_chunin_exam IS TRUE AND exam_round IS NOT NULL
DO UPDATE SET
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    hp = EXCLUDED.hp,
    chakra = EXCLUDED.chakra,
    atk = EXCLUDED.atk,
    def = EXCLUDED.def,
    element = EXCLUDED.element,
    avatar = EXCLUDED.avatar,
    xp_reward = 0,
    ryou_reward = 0,
    rank = EXCLUDED.rank,
    is_active = true,
    is_map_npc = false,
    is_story_mode = false,
    is_bingo_book = false,
    description = EXCLUDED.description;

CREATE TABLE IF NOT EXISTS public.player_chunin_exams (
    player_id integer PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    current_round integer NOT NULL DEFAULT 1 CHECK (current_round BETWEEN 1 AND 4),
    status text NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress','completed','failed')),
    active_session_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);
ALTER TABLE public.player_chunin_exams ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.player_chunin_exams FROM PUBLIC, anon, authenticated;

ALTER TABLE public.player_combat_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.player_combat_sessions FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION public.kurokage_equipment_bonus(
    p_player_id integer,
    p_stat_name text
) RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
    SELECT COALESCE(SUM(
        CASE
          WHEN s.value ~ '^[+-]?[0-9]+([.][0-9]+)?$'
            THEN s.value::numeric * (1 + GREATEST(0, COALESCE(pi.upgrade_level, 0)) * 0.2)
          ELSE 0
        END
    ), 0)
    FROM public.player_inventory AS pi
    JOIN public.items AS it ON it.id = pi.item_id
    CROSS JOIN LATERAL jsonb_each_text(
        CASE
          WHEN jsonb_typeof(pi.rolled_stats) = 'object'
            THEN COALESCE(it.bonus_stats, '{}'::jsonb) || pi.rolled_stats
          ELSE COALESCE(it.bonus_stats, '{}'::jsonb)
        END
    ) AS s(key, value)
    WHERE pi.player_id = p_player_id
      AND pi.is_equipped IS TRUE
      AND lower(s.key) = lower(p_stat_name);
$function$;


CREATE OR REPLACE FUNCTION public.kurokage_player_max_stat(
    p_player_id integer,
    p_stat_name text
) RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_level integer;
    v_rank_hp integer := 0;
    v_rank_chakra integer := 0;
    v_rank_stamina integer := 0;
    v_value numeric;
BEGIN
    SELECT * INTO v_player FROM public.players WHERE id = p_player_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado.'; END IF;

    v_level := GREATEST(1, COALESCE(v_player.level, 1));

    v_rank_hp := CASE lower(COALESCE(v_player.rank, ''))
        WHEN 'genin' THEN 150 WHEN 'chunin' THEN 350
        WHEN 'jounin' THEN 600 WHEN 'jonin' THEN 600
        WHEN 'anbu' THEN 1000 WHEN 'sannin' THEN 1500
        WHEN 'herói' THEN 2500 WHEN 'heroi' THEN 2500 ELSE 0 END;
    v_rank_chakra := CASE lower(COALESCE(v_player.rank, ''))
        WHEN 'genin' THEN 150 WHEN 'chunin' THEN 300
        WHEN 'jounin' THEN 500 WHEN 'jonin' THEN 500
        WHEN 'anbu' THEN 800 WHEN 'sannin' THEN 1200
        WHEN 'herói' THEN 2000 WHEN 'heroi' THEN 2000 ELSE 0 END;
    v_rank_stamina := CASE lower(COALESCE(v_player.rank, ''))
        WHEN 'genin' THEN 150 WHEN 'chunin' THEN 300
        WHEN 'jounin' THEN 500 WHEN 'jonin' THEN 500
        WHEN 'anbu' THEN 800 WHEN 'sannin' THEN 1200
        WHEN 'herói' THEN 2000 WHEN 'heroi' THEN 2000 ELSE 0 END;

    IF lower(p_stat_name) = 'hp' THEN
        v_value := 100 + v_level * 30
            + GREATEST(0, COALESCE(v_player.resistencia, 0)) * 15
            + GREATEST(0, COALESCE(v_player.energia, 0)) * 20
            + GREATEST(0, COALESCE(v_player.forca, 0)) * 5
            + v_rank_hp
            + public.kurokage_equipment_bonus(p_player_id, 'hp');
        v_value := v_value * CASE lower(COALESCE(v_player.clan, ''))
            WHEN 'senju' THEN 1.10 WHEN 'uzumaki' THEN 1.05
            WHEN 'akimichi' THEN 1.08 ELSE 1.00 END;
    ELSIF lower(p_stat_name) = 'chakra' THEN
        v_value := 100 + v_level * 20
            + GREATEST(0, COALESCE(v_player.energia, 0)) * 5
            + GREATEST(0, COALESCE(v_player.ninjutsu, COALESCE(v_player.nin, 0))) * 5
            + GREATEST(0, COALESCE(v_player.genjutsu, COALESCE(v_player.gen, 0))) * 5
            + v_rank_chakra
            + public.kurokage_equipment_bonus(p_player_id, 'chakra');
        v_value := v_value * CASE lower(COALESCE(v_player.clan, ''))
            WHEN 'uzumaki' THEN 1.15
            WHEN 'hozuki' THEN 1.10
            ELSE 1.00 END;
    ELSIF lower(p_stat_name) = 'stamina' THEN
        v_value := 100 + v_level * 20
            + GREATEST(0, COALESCE(v_player.energia, 0)) * 5
            + GREATEST(0, COALESCE(v_player.taijutsu, COALESCE(v_player.tai, 0))) * 5
            + GREATEST(0, COALESCE(v_player.bukijutsu, COALESCE(v_player.buk, 0))) * 5
            + v_rank_stamina
            + public.kurokage_equipment_bonus(p_player_id, 'stamina');
    ELSE
        RAISE EXCEPTION 'Atributo máximo inválido.';
    END IF;

    RETURN GREATEST(1, LEAST(1000000000, FLOOR(v_value)))::integer;
END;
$function$;


CREATE OR REPLACE FUNCTION public.kurokage_elemental_multiplier(
    p_attacker_element text,
    p_defender_element text
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $function$
    SELECT CASE
      WHEN lower(COALESCE(p_attacker_element,'')) = 'suiton' AND lower(COALESCE(p_defender_element,'')) = 'katon' THEN 1.2
      WHEN lower(COALESCE(p_attacker_element,'')) = 'katon' AND lower(COALESCE(p_defender_element,'')) = 'futon' THEN 1.2
      WHEN lower(COALESCE(p_attacker_element,'')) = 'futon' AND lower(COALESCE(p_defender_element,'')) = 'raiton' THEN 1.2
      WHEN lower(COALESCE(p_attacker_element,'')) = 'raiton' AND lower(COALESCE(p_defender_element,'')) = 'doton' THEN 1.2
      WHEN lower(COALESCE(p_attacker_element,'')) = 'doton' AND lower(COALESCE(p_defender_element,'')) = 'suiton' THEN 1.2
      ELSE 1.0
    END;
$function$;


CREATE OR REPLACE FUNCTION public.iniciar_exame_chunin(
    p_player_id integer,
    p_round integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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

    IF v_exam.active_session_id IS NOT NULL THEN
        SELECT * INTO v_session FROM public.player_combat_sessions
        WHERE session_id = v_exam.active_session_id AND player_id = p_player_id;
        IF FOUND AND v_session.status = 'active' AND v_session.expires_at > now() THEN
            RETURN jsonb_build_object(
                'success',true,'session_id',v_session.session_id,
                'enemy_id',v_session.enemy_id,'enemy_name',v_session.enemy_name,
                'enemy_level',v_session.enemy_level,'enemy_hp',v_session.enemy_hp_remaining,
                'enemy_max_hp',v_session.enemy_max_hp,'enemy_atk',v_session.enemy_atk,
                'enemy_def',v_session.enemy_def,'enemy_chakra',v_session.enemy_chakra,
                'enemy_element',v_session.enemy_element,'xp_reward',0,'ryou_reward',0,
                'player_hp',v_session.player_hp,'player_chakra',v_session.player_chakra,
                'player_stamina',v_session.player_stamina,
                'player_max_hp',v_session.player_max_hp,
                'player_max_chakra',v_session.player_max_chakra,
                'player_max_stamina',v_session.player_max_stamina,
                'is_exam',true,'exam_round',v_session.exam_round
            );
        END IF;
        UPDATE public.player_chunin_exams
        SET active_session_id=NULL,updated_at=now()
        WHERE player_id=p_player_id;
    END IF;

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

REVOKE ALL ON FUNCTION public.iniciar_exame_chunin(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_exame_chunin(integer,integer) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.iniciar_combate_sessao(
    p_player_id integer,
    p_enemy_id integer,
    p_from_map boolean DEFAULT false,
    p_is_dojo boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_enemy public.npcs%ROWTYPE;
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
    IF COALESCE(v_player.is_fainted, false) IS TRUE THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você está inconsciente e não pode iniciar um combate.');
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


CREATE OR REPLACE FUNCTION public.resolver_turno_combate_sessao(
    p_player_id integer,
    p_session_id uuid,
    p_action text,
    p_jutsu_id integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_jutsu public.jutsus%ROWTYPE;
    v_enemy public.npcs%ROWTYPE;
    v_learned_jutsu jsonb;
    v_slot text;
    v_slot_tier integer;
    v_bonus_damage integer := 0;
    v_bonus_cost integer := 0;
    v_stamina_cost integer := 0;
    v_chakra_cost integer := 0;
    v_stamina integer;
    v_chakra integer;
    v_attack_physical integer;
    v_attack_magic integer;
    v_attack integer;
    v_target_def integer;
    v_accuracy integer;
    v_crit_chance integer;
    v_damage integer := 0;
    v_hit boolean := true;
    v_crit boolean := false;
    v_attacker_element text;
    v_category text;
    v_base_cost integer;
    v_new_enemy_hp integer;
    v_new_stamina integer;
    v_new_chakra integer;
    v_max_stamina integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id = p_session_id AND player_id = p_player_id
    FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Sessão de combate inválida.'); END IF;
    IF v_session.expires_at <= now() THEN
        UPDATE public.player_combat_sessions SET status = 'expired' WHERE session_id = p_session_id;
        RETURN jsonb_build_object('success', false, 'error', 'Sessão de combate expirada.');
    END IF;
    IF v_session.status <> 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta sessão de combate não está ativa.');
    END IF;
    IF v_session.awaiting_enemy_turn THEN
        RETURN jsonb_build_object('success', false, 'error', 'O turno do inimigo ainda não foi resolvido.');
    END IF;

    SELECT * INTO v_enemy FROM public.npcs WHERE id = v_session.enemy_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Inimigo não encontrado.'); END IF;

    v_stamina := GREATEST(0, LEAST(v_session.player_max_stamina, v_session.player_stamina));
    v_chakra := GREATEST(0, LEAST(v_session.player_max_chakra, v_session.player_chakra));
    v_max_stamina := v_session.player_max_stamina;
    v_attack_physical := GREATEST(1,
        COALESCE(v_player.forca, 0)
        + 2 * GREATEST(0, COALESCE(v_player.taijutsu, COALESCE(v_player.tai, 0)))
        + 2 * GREATEST(0, COALESCE(v_player.bukijutsu, COALESCE(v_player.buk, 0)))
        + 5
        + FLOOR(public.kurokage_equipment_bonus(p_player_id, 'tai'))::integer
        + FLOOR(public.kurokage_equipment_bonus(p_player_id, 'buk'))::integer
    );
    v_attack_magic := GREATEST(1,
        2 * GREATEST(0, COALESCE(v_player.inteligencia, 0))
        + 2 * GREATEST(0, COALESCE(v_player.ninjutsu, COALESCE(v_player.nin, 0)))
        + 2 * GREATEST(0, COALESCE(v_player.genjutsu, COALESCE(v_player.gen, 0)))
        + 10
        + FLOOR(public.kurokage_equipment_bonus(p_player_id, 'nin'))::integer
        + FLOOR(public.kurokage_equipment_bonus(p_player_id, 'gen'))::integer
    );
    v_target_def := GREATEST(0, v_session.enemy_def);
    v_crit_chance := LEAST(50, GREATEST(0, FLOOR(COALESCE(v_player.agilidade, 0) / 10)::integer));
    IF lower(COALESCE(v_player.clan, '')) = 'uchiha' THEN
        v_crit_chance := LEAST(50, v_crit_chance + 15);
    END IF;

    IF p_action = 'basic' THEN
        v_stamina_cost := 15;
        IF v_stamina < v_stamina_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Stamina insuficiente.', 'stamina_remaining', v_stamina);
        END IF;
        v_stamina := v_stamina - v_stamina_cost;
        v_accuracy := 80;
        v_hit := random() * 100 <= v_accuracy;
        IF v_hit THEN
            v_damage := GREATEST(1, FLOOR(v_attack_physical - v_target_def / 2)::integer);
            v_attacker_element := v_player.element;
        END IF;
    ELSIF p_action = 'jutsu' THEN
        IF p_jutsu_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Jutsu inválido.');
        END IF;

        SELECT * INTO v_jutsu FROM public.jutsus
        WHERE id = p_jutsu_id AND COALESCE(is_active, true) IS TRUE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este jutsu não está disponível.');
        END IF;

        IF jsonb_typeof(v_player.jutsus_learned) = 'array' THEN
            SELECT item INTO v_learned_jutsu
            FROM jsonb_array_elements(v_player.jutsus_learned) AS x(item)
            WHERE COALESCE(item->>'id', item #>> '{}') = p_jutsu_id::text
            LIMIT 1;
        END IF;

        IF v_learned_jutsu IS NULL AND NOT EXISTS (
            SELECT 1 FROM public.player_jutsus pj
            WHERE pj.player_id = p_player_id AND pj.jutsu_id = p_jutsu_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Você ainda não aprendeu este jutsu.');
        END IF;

        IF COALESCE(v_jutsu.cooldown, 0) > 0
           AND v_session.last_jutsu_id = p_jutsu_id
           AND (v_session.turn_count - COALESCE(v_session.last_jutsu_turn, 0)) < v_jutsu.cooldown THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este jutsu ainda está em recarga.');
        END IF;

        IF v_learned_jutsu IS NOT NULL THEN
            IF jsonb_typeof(v_learned_jutsu->'absorbed_stats') = 'object' THEN
                IF COALESCE(v_learned_jutsu->'absorbed_stats'->>'dano', '') ~ '^[+-]?[0-9]+$' THEN
                    v_bonus_damage := (v_learned_jutsu->'absorbed_stats'->>'dano')::integer;
                END IF;
                IF COALESCE(v_learned_jutsu->'absorbed_stats'->>'custo', '') ~ '^[+-]?[0-9]+$' THEN
                    v_bonus_cost := (v_learned_jutsu->'absorbed_stats'->>'custo')::integer;
                END IF;
            END IF;
            IF jsonb_typeof(v_learned_jutsu->'slots') = 'array' THEN
                FOR v_slot IN SELECT value FROM jsonb_array_elements_text(v_learned_jutsu->'slots') AS s(value)
                LOOP
                    IF v_slot ~ '^dano_[1-5]$' THEN
                        v_slot_tier := split_part(v_slot, '_', 2)::integer;
                        v_bonus_damage := v_bonus_damage + CASE v_slot_tier
                            WHEN 1 THEN 5 WHEN 2 THEN 15 WHEN 3 THEN 30 WHEN 4 THEN 50 ELSE 100 END;
                    ELSIF v_slot ~ '^custo_[1-5]$' THEN
                        v_slot_tier := split_part(v_slot, '_', 2)::integer;
                        v_bonus_cost := v_bonus_cost + CASE v_slot_tier
                            WHEN 1 THEN -2 WHEN 2 THEN -5 WHEN 3 THEN -10 WHEN 4 THEN -15 ELSE -25 END;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        v_bonus_cost := GREATEST(-50, v_bonus_cost);
        v_base_cost := GREATEST(1, COALESCE(v_jutsu.chakra_cost, 20) + v_bonus_cost);
        v_chakra_cost := GREATEST(1, FLOOR(
            GREATEST(COALESCE(v_jutsu.chakra_cost, 20) * 0.1, v_base_cost * (1 - LEAST(0.5, FLOOR(COALESCE(v_player.selo, 0) / 5)::numeric * 0.01)))
        )::integer);

        IF v_chakra < v_chakra_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Chakra insuficiente.', 'chakra_remaining', v_chakra);
        END IF;
        v_chakra := v_chakra - v_chakra_cost;
        v_category := lower(COALESCE(v_jutsu.category, 'ninjutsu'));
        v_attack := CASE WHEN v_category IN ('taijutsu','bukijutsu') THEN v_attack_physical ELSE v_attack_magic END;
        v_accuracy := LEAST(100, GREATEST(1, COALESCE(v_jutsu.accuracy, 100)));
        v_hit := random() * 100 <= v_accuracy;
        IF v_hit THEN
            v_damage := GREATEST(1, FLOOR(v_attack + COALESCE(v_jutsu.damage,15) + v_bonus_damage - v_target_def / 2)::integer);
            v_attacker_element := COALESCE(v_jutsu.element, v_player.element);
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Ação de combate inválida.');
    END IF;

    IF v_damage > 0 THEN
        IF random() * 100 <= v_crit_chance THEN
            v_crit := true;
            v_damage := GREATEST(1, FLOOR(v_damage * 1.5)::integer);
        END IF;
        v_damage := GREATEST(1, FLOOR(v_damage * public.kurokage_elemental_multiplier(v_attacker_element, v_session.enemy_element))::integer);
    END IF;

    v_new_enemy_hp := GREATEST(0, v_session.enemy_hp_remaining - v_damage);
    v_session.player_stamina := v_stamina;
    v_session.player_chakra := v_chakra;

    UPDATE public.player_combat_sessions
    SET enemy_hp_remaining = v_new_enemy_hp,
        player_stamina = v_stamina,
        player_chakra = v_chakra,
        awaiting_enemy_turn = (v_new_enemy_hp > 0),
        status = CASE WHEN v_new_enemy_hp <= 0 THEN 'defeated' ELSE 'active' END,
        turn_count = turn_count + 1,
        last_action_at = clock_timestamp(),
        last_jutsu_id = CASE WHEN p_action = 'jutsu' THEN p_jutsu_id ELSE last_jutsu_id END,
        last_jutsu_turn = CASE WHEN p_action = 'jutsu' THEN turn_count + 1 ELSE last_jutsu_turn END
    WHERE session_id = p_session_id;

    UPDATE public.players
    SET stamina = v_stamina, chakra = v_chakra,
        daily_chakra_spent = COALESCE(daily_chakra_spent, 0) + v_chakra_cost
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'hit', v_hit,
        'damage', v_damage,
        'is_crit', v_crit,
        'stamina_cost', v_stamina_cost,
        'chakra_cost', v_chakra_cost,
        'stamina_remaining', v_stamina,
        'chakra_remaining', v_chakra,
        'enemy_hp_remaining', v_new_enemy_hp,
        'enemy_defeated', (v_new_enemy_hp <= 0),
        'turn_count', v_session.turn_count + 1
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.responder_turno_combate_sessao(
    p_player_id integer,
    p_session_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_player_def integer;
    v_dodge_chance integer;
    v_damage integer;
    v_dodged boolean;
    v_new_player_hp integer;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id = p_session_id AND player_id = p_player_id
    FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Sessão de combate inválida.'); END IF;
    IF v_session.expires_at <= now() THEN
        UPDATE public.player_combat_sessions SET status = 'expired' WHERE session_id = p_session_id;
        RETURN jsonb_build_object('success', false, 'error', 'Sessão de combate expirada.');
    END IF;
    IF v_session.status <> 'active' OR NOT v_session.awaiting_enemy_turn THEN
        RETURN jsonb_build_object('success', false, 'error', 'Não há um turno inimigo pendente nesta sessão.');
    END IF;

    v_player_def := GREATEST(0, FLOOR(
        GREATEST(0, COALESCE(v_player.resistencia, 0))
        + (GREATEST(0, COALESCE(v_player.taijutsu, COALESCE(v_player.tai, 0)))
          + GREATEST(0, COALESCE(v_player.bukijutsu, COALESCE(v_player.buk, 0)))) / 4.0
        + public.kurokage_equipment_bonus(p_player_id, 'def')
    )::integer);
    v_dodge_chance := LEAST(50, GREATEST(0, FLOOR(COALESCE(v_player.agilidade, 0) / 10)::integer));
    v_dodged := random() * 100 <= v_dodge_chance;
    v_damage := CASE WHEN v_dodged THEN 0 ELSE GREATEST(1, v_session.enemy_atk - v_player_def) END;
    v_new_player_hp := GREATEST(0, v_session.player_hp - v_damage);

    UPDATE public.player_combat_sessions
    SET player_hp = v_new_player_hp,
        awaiting_enemy_turn = false,
        status = CASE WHEN v_new_player_hp <= 0 THEN 'player_defeated' ELSE 'active' END,
        last_action_at = clock_timestamp()
    WHERE session_id = p_session_id;

    UPDATE public.players
    SET hp = v_new_player_hp,
        is_fainted = (v_new_player_hp <= 0),
        fainted_at = CASE WHEN v_new_player_hp <= 0 THEN now() ELSE NULL END
    WHERE id = p_player_id;

    IF v_new_player_hp <= 0 AND v_session.is_exam THEN
        UPDATE public.player_chunin_exams
        SET status='failed',current_round=1,active_session_id=NULL,updated_at=now()
        WHERE player_id=p_player_id;
    END IF;

    IF v_new_player_hp <= 0 AND v_session.is_dojo THEN
        UPDATE public.players SET losses_dojo = COALESCE(losses_dojo,0)+1 WHERE id = p_player_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'player_hp_remaining', v_new_player_hp,
        'damage', v_damage,
        'dodged', v_dodged,
        'player_defeated', (v_new_player_hp <= 0),
        'session_status', CASE WHEN v_new_player_hp <= 0 THEN 'player_defeated' ELSE 'active' END
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.usar_consumivel_combate_sessao(
    p_player_id integer,
    p_session_id uuid,
    p_consumable_id integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
    v_consumable public.consumables%ROWTYPE;
    v_inventory public.player_consumables%ROWTYPE;
    v_new_hp integer;
    v_new_chakra integer;
    v_new_stamina integer;
    v_value integer;
    v_type text;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;

    SELECT * INTO v_player FROM public.players
    WHERE id = p_player_id AND user_id = auth.uid()
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id = p_session_id AND player_id = p_player_id
    FOR UPDATE;
    IF NOT FOUND OR v_session.status <> 'active' OR v_session.awaiting_enemy_turn OR v_session.expires_at <= now() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sessão não está pronta para usar consumível.');
    END IF;
    IF v_session.is_exam THEN
        RETURN jsonb_build_object('success',false,'error','Consumíveis são proibidos durante o Exame Chunin.');
    END IF;

    SELECT * INTO v_consumable FROM public.consumables
    WHERE id = p_consumable_id AND COALESCE(is_active,true) IS TRUE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Consumível inválido.'); END IF;

    SELECT * INTO v_inventory FROM public.player_consumables
    WHERE player_id = p_player_id AND consumable_id = p_consumable_id AND quantity > 0
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','Você não possui este consumível.'); END IF;

    v_value := GREATEST(0, COALESCE(v_consumable.value, 0));
    v_type := lower(COALESCE(v_consumable.type,''));
    v_new_hp := v_session.player_hp;
    v_new_chakra := v_session.player_chakra;
    v_new_stamina := v_session.player_stamina;

    IF v_type IN ('hp','all') THEN
        v_new_hp := LEAST(v_session.player_max_hp, v_new_hp + v_value);
    END IF;
    IF v_type IN ('cp','chakra','all') THEN
        v_new_chakra := LEAST(v_session.player_max_chakra, v_new_chakra + v_value);
    END IF;
    IF v_type IN ('sp','stamina','all') THEN
        v_new_stamina := LEAST(v_session.player_max_stamina, v_new_stamina + v_value);
    END IF;

    IF v_new_hp = v_session.player_hp
       AND v_new_chakra = v_session.player_chakra
       AND v_new_stamina = v_session.player_stamina THEN
        RETURN jsonb_build_object('success',false,'error','Seus recursos já estão cheios.');
    END IF;

    UPDATE public.player_consumables
    SET quantity = quantity - 1
    WHERE id = v_inventory.id;

    UPDATE public.player_combat_sessions
    SET player_hp = v_new_hp,
        player_chakra = v_new_chakra,
        player_stamina = v_new_stamina,
        awaiting_enemy_turn = true,
        turn_count = turn_count + 1,
        last_action_at = clock_timestamp()
    WHERE session_id = p_session_id;

    UPDATE public.players
    SET hp = v_new_hp, chakra = v_new_chakra, stamina = v_new_stamina
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success',true,'hp_remaining',v_new_hp,'chakra_remaining',v_new_chakra,
        'stamina_remaining',v_new_stamina,'quantity_remaining',GREATEST(0,v_inventory.quantity-1),
        'effect_value',v_value,'type',v_type
    );
END;
$function$;


CREATE OR REPLACE FUNCTION public.finalizar_combate_sessao(
    p_player_id integer,
    p_session_id uuid,
    p_turn_count integer,
    p_combat_log jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
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


CREATE OR REPLACE FUNCTION public.abandonar_combate_sessao(
    p_player_id integer,
    p_session_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_player public.players%ROWTYPE;
    v_session public.player_combat_sessions%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    SELECT * INTO v_player FROM public.players
    WHERE id=p_player_id AND user_id=auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    SELECT * INTO v_session FROM public.player_combat_sessions
    WHERE session_id=p_session_id AND player_id=p_player_id FOR UPDATE;
    IF NOT FOUND OR v_session.status <> 'active' THEN
        RETURN jsonb_build_object('success',false,'error','Sessão de combate não está ativa.');
    END IF;

    UPDATE public.player_combat_sessions
    SET status='abandoned',awaiting_enemy_turn=false,last_action_at=clock_timestamp()
    WHERE session_id=p_session_id;

    IF v_session.is_exam THEN
        UPDATE public.player_chunin_exams
        SET status='failed',current_round=1,active_session_id=NULL,updated_at=now()
        WHERE player_id=p_player_id;
    END IF;

    RETURN jsonb_build_object('success',true,'abandoned',true,'is_exam',v_session.is_exam);
END;
$function$;

REVOKE ALL ON FUNCTION public.abandonar_combate_sessao(integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandonar_combate_sessao(integer,uuid) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.aprender_jutsu(
    p_player_id integer,
    p_jutsu_id integer,
    p_cost integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
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
        WHEN 'estudante da academia' THEN 0
        WHEN 'genin' THEN 1 WHEN 'chunin' THEN 2
        WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
        WHEN 'anbu' THEN 4 WHEN 'sannin' THEN 5
        WHEN 'herói' THEN 6 WHEN 'heroi' THEN 6
        ELSE 0 END;
    v_required_rank := CASE lower(COALESCE(v_jutsu.req_rank,''))
        WHEN '' THEN 0 WHEN 'estudante da academia' THEN 0
        WHEN 'genin' THEN 1 WHEN 'chunin' THEN 2
        WHEN 'jounin' THEN 3 WHEN 'jonin' THEN 3
        WHEN 'anbu' THEN 4 WHEN 'sannin' THEN 5
        WHEN 'herói' THEN 6 WHEN 'heroi' THEN 6
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
$function$;



CREATE OR REPLACE FUNCTION public.aprender_jutsus_massa(
    p_player_id integer,
    p_jutsus jsonb,
    p_total_cost integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
    v_item jsonb;
    v_id_text text;
    v_jutsu_id integer;
    v_result jsonb;
    v_count integer := 0;
    v_total integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória.'; END IF;
    IF p_jutsus IS NULL OR jsonb_typeof(p_jutsus) <> 'array' OR jsonb_array_length(p_jutsus) = 0 THEN
        RETURN jsonb_build_object('success',false,'error','Nenhum jutsu foi informado.');
    END IF;
    IF jsonb_array_length(p_jutsus) > 50 THEN
        RETURN jsonb_build_object('success',false,'error','Limite de 50 jutsus por operação.');
    END IF;

    -- Lock the character once; client-provided p_total_cost is intentionally ignored.
    PERFORM 1 FROM public.players WHERE id = p_player_id AND user_id = auth.uid() FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou ação não autorizada.'; END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_jutsus) AS x(value)
    LOOP
        v_id_text := COALESCE(v_item->>'id', v_item #>> '{}');
        IF v_id_text IS NULL OR v_id_text = '' OR length(v_id_text) > 10
           OR v_id_text !~ '^[0-9]' OR v_id_text ~ '[^0-9]' THEN
            RAISE EXCEPTION 'Um dos jutsus enviados possui identificador inválido.';
        END IF;
        v_jutsu_id := v_id_text::integer;

        v_result := public.aprender_jutsu(p_player_id, v_jutsu_id, NULL);
        IF COALESCE((v_result->>'success')::boolean, false) IS NOT TRUE THEN
            RAISE EXCEPTION '%', COALESCE(v_result->>'error','Não foi possível aprender o jutsu.');
        END IF;
        v_count := v_count + 1;
        v_total := v_total + GREATEST(0, COALESCE((v_result->>'cost')::integer,0));
    END LOOP;

    RETURN jsonb_build_object('success',true,'learned_count',v_count,'total_cost',v_total);
END;
$function$;

REVOKE ALL ON FUNCTION public.aprender_jutsus_massa(integer,jsonb,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_jutsus_massa(integer,jsonb,integer) TO authenticated, service_role;

-- The browser must not edit permanent stats, learned jutsus, essence inventory, or daily chakra totals.
REVOKE UPDATE (tai, nin, gen, buk, taijutsu, bukijutsu, ninjutsu, genjutsu,
    forca, agilidade, inteligencia, selo, resistencia, energia,
    jutsus_learned, inventory_essences, daily_chakra_spent,
    passou_exame_chunin)
ON public.players FROM PUBLIC, anon, authenticated;


-- API users can call only the authenticated RPC entry points. Internal calculation helpers are private.
REVOKE ALL ON FUNCTION public.kurokage_equipment_bonus(integer,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.kurokage_player_max_stat(integer,text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.kurokage_elemental_multiplier(text,text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_combate_sessao(integer,integer,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_combate_sessao(integer,integer,boolean,boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.iniciar_exame_chunin(integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_exame_chunin(integer,integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.abandonar_combate_sessao(integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.abandonar_combate_sessao(integer,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.resolver_turno_combate_sessao(integer,uuid,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolver_turno_combate_sessao(integer,uuid,text,integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.responder_turno_combate_sessao(integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_turno_combate_sessao(integer,uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.usar_consumivel_combate_sessao(integer,uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usar_consumivel_combate_sessao(integer,uuid,integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.finalizar_combate_sessao(integer,uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_combate_sessao(integer,uuid,integer,jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.aprender_jutsu(integer,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprender_jutsu(integer,integer,integer) TO authenticated, service_role;

-- Prevent direct client calls that submit arbitrary victory flags and fallback rewards.
REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb,integer,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalizar_combate(integer,integer,text,integer,jsonb,integer,integer,text,boolean) FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
