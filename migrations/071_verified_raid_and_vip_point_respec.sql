-- 071: server-owned sequential raids and one-point VIP respec.
-- Disabled in UI until staging tests; no live player rows are modified.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS app_private.raid_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  fight_total integer NOT NULL CHECK (fight_total IN (3,5)),
  fights_completed integer NOT NULL DEFAULT 0 CHECK (fights_completed BETWEEN 0 AND 5),
  stamina_spent integer NOT NULL DEFAULT 0 CHECK (stamina_spent BETWEEN 0 AND 125),
  current_session_id uuid REFERENCES public.player_combat_sessions(session_id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS raid_runs_one_active_per_player
  ON app_private.raid_runs(player_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS raid_runs_owner_id ON app_private.raid_runs(owner_id,created_at DESC);
ALTER TABLE app_private.raid_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.raid_runs FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS app_private.vip_point_respec_ledger (
  operation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id integer NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  attribute text NOT NULL,
  old_value integer NOT NULL,
  new_value integer NOT NULL,
  credits_charged integer NOT NULL CHECK (credits_charged=1),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.vip_point_respec_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.vip_point_respec_ledger FROM PUBLIC,anon,authenticated;

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS total_vip_spent integer NOT NULL DEFAULT 0;
ALTER TABLE public.players ADD CONSTRAINT players_total_vip_spent_nonnegative CHECK (total_vip_spent>=0);

CREATE OR REPLACE FUNCTION public.iniciar_raid_verificada(p_player_id integer,p_fight_count integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE
 v_player public.players%ROWTYPE;
 v_previous app_private.raid_runs%ROWTYPE;
 v_enemy integer;
 v_start jsonb;
 v_id uuid;
 v_cost constant integer := 25;
 v_max_stamina integer;
 v_current_stamina integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 IF p_fight_count NOT IN (3,5) OR p_fight_count IS NULL THEN
   RETURN jsonb_build_object('success',false,'error','Raid precisa ter 3 ou 5 lutas.');
 END IF;
 SELECT * INTO v_player FROM public.players
 WHERE id=p_player_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não pertence à conta.'; END IF;

 SELECT * INTO v_previous FROM app_private.raid_runs
 WHERE player_id=p_player_id AND status='active' FOR UPDATE;
 IF FOUND THEN
   RETURN jsonb_build_object('success',false,'error','Já existe uma Raid ativa. Continue-a antes de iniciar outra.');
 END IF;
 IF COALESCE(v_player.is_fainted,false) OR COALESCE(v_player.hp,0)<=0 THEN
   RETURN jsonb_build_object('success',false,'error','Personagem inconsciente.');
 END IF;
 IF EXISTS(SELECT 1 FROM public.player_combat_sessions
    WHERE player_id=p_player_id AND status IN ('active','defeated')
      AND expires_at>now())
 OR EXISTS(SELECT 1 FROM public.world_boss_sessions
    WHERE player_id=p_player_id AND is_active IS TRUE) THEN
   RETURN jsonb_build_object('success',false,'error','Finalize o combate pendente primeiro.');
 END IF;
 v_max_stamina := public.kurokage_player_max_stat(p_player_id,'stamina');
 v_current_stamina := LEAST(v_max_stamina,GREATEST(0,COALESCE(v_player.stamina,v_max_stamina)));
 IF v_current_stamina<v_cost THEN
   RETURN jsonb_build_object('success',false,'error','Stamina insuficiente.','required',v_cost);
 END IF;
 SELECT id INTO v_enemy FROM public.npcs
 WHERE is_active IS TRUE AND is_map_npc IS FALSE
   AND is_story_mode IS FALSE AND is_bingo_book IS FALSE
   AND is_chunin_exam IS FALSE AND character_id IS NOT NULL
   AND level <= COALESCE(v_player.level,1)+5
 ORDER BY id LIMIT 1;
 IF v_enemy IS NULL THEN
   RETURN jsonb_build_object('success',false,'error','Nenhum NPC elegível para esta Raid.');
 END IF;

 v_start := public.iniciar_combate_sessao(p_player_id,v_enemy,false,true);
 IF COALESCE((v_start->>'success')::boolean,false) IS NOT TRUE
   OR COALESCE((v_start->>'resumed_session')::boolean,false)
   OR COALESCE((v_start->>'pending_victory')::boolean,false)
   OR NOT (v_start ? 'session_id') THEN
    RAISE EXCEPTION 'Não foi possível abrir uma nova sessão oficial de Raid: %',
      COALESCE(v_start->>'error','sessão inválida');
 END IF;

 INSERT INTO app_private.raid_runs(player_id,owner_id,fight_total,current_session_id,stamina_spent)
 VALUES (p_player_id,auth.uid(),p_fight_count,(v_start->>'session_id')::uuid,v_cost)
 RETURNING id INTO v_id;
 UPDATE public.players SET stamina=v_current_stamina-v_cost WHERE id=p_player_id;

 RETURN v_start || jsonb_build_object('raid_id',v_id,'raid_total',p_fight_count,
   'raid_current',1,'raid_completed',false,'raid_stamina_charged',v_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.continuar_raid_verificada(p_player_id integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE
 v_player public.players%ROWTYPE;
 v_raid app_private.raid_runs%ROWTYPE;
 v_session public.player_combat_sessions%ROWTYPE;
 v_enemy integer;
 v_start jsonb;
 v_max integer;
 v_current integer;
 v_next integer;
 v_cost constant integer := 25;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 SELECT * INTO v_player FROM public.players
 WHERE id=p_player_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não pertence à conta.'; END IF;
 SELECT * INTO v_raid FROM app_private.raid_runs
 WHERE player_id=p_player_id AND owner_id=auth.uid() AND status='active' FOR UPDATE;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('success',false,'error','Não há Raid ativa.');
 END IF;
 SELECT * INTO v_session FROM public.player_combat_sessions
 WHERE session_id=v_raid.current_session_id AND player_id=p_player_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Sessão da Raid está ausente; estado bloqueado para revisão.'; END IF;

 IF v_session.status='active' AND v_session.expires_at>now() THEN
   RETURN jsonb_build_object('success',false,'error','Conclua o combate atual antes de prosseguir.');
 END IF;
 IF v_session.status='defeated' AND v_session.expires_at>now() THEN
   RETURN jsonb_build_object('success',false,'error','Registre a vitória pendente antes de avançar.');
 END IF;
 IF v_session.status<>'settled' THEN
   UPDATE app_private.raid_runs SET status='failed',updated_at=now()
   WHERE id=v_raid.id;
   RETURN jsonb_build_object('success',false,'raid_failed',true,
      'error','Incursão encerrada após combate não concluído. Stamina usada somente nas lutas iniciadas.');
 END IF;

 v_next := v_raid.fights_completed+1;
 IF v_next>=v_raid.fight_total THEN
   UPDATE app_private.raid_runs SET status='completed',fights_completed=v_next,
     updated_at=now() WHERE id=v_raid.id;
   RETURN jsonb_build_object('success',true,'raid_completed',true,
      'raid_total',v_raid.fight_total,'raid_current',v_next,
      'raid_stamina_charged',v_raid.stamina_spent);
 END IF;
 IF COALESCE(v_player.is_fainted,false) OR COALESCE(v_player.hp,0)<=0 THEN
   RETURN jsonb_build_object('success',false,'error','Recupere a vida antes da próxima luta.');
 END IF;
 v_max:=public.kurokage_player_max_stat(p_player_id,'stamina');
 v_current:=LEAST(v_max,GREATEST(0,COALESCE(v_player.stamina,v_max)));
 IF v_current<v_cost THEN
   RETURN jsonb_build_object('success',false,'error','Stamina insuficiente para continuar.',
     'required',v_cost,'remaining',v_current);
 END IF;
 SELECT id INTO v_enemy FROM public.npcs
 WHERE is_active IS TRUE AND is_map_npc IS FALSE
   AND is_story_mode IS FALSE AND is_bingo_book IS FALSE
   AND is_chunin_exam IS FALSE AND character_id IS NOT NULL
   AND level<=COALESCE(v_player.level,1)+5
 ORDER BY id OFFSET (v_next % GREATEST(1,
     (SELECT count(*) FROM public.npcs
       WHERE is_active IS TRUE AND is_map_npc IS FALSE
       AND is_story_mode IS FALSE AND is_bingo_book IS FALSE
       AND is_chunin_exam IS FALSE AND character_id IS NOT NULL
       AND level<=COALESCE(v_player.level,1)+5)
  )) LIMIT 1;
 IF v_enemy IS NULL THEN
   RETURN jsonb_build_object('success',false,'error','Nenhum adversário elegível.');
 END IF;
 v_start:=public.iniciar_combate_sessao(p_player_id,v_enemy,false,true);
 IF COALESCE((v_start->>'success')::boolean,false) IS NOT TRUE
    OR COALESCE((v_start->>'resumed_session')::boolean,false)
    OR COALESCE((v_start->>'pending_victory')::boolean,false)
    OR NOT (v_start ? 'session_id') THEN
   RAISE EXCEPTION 'Falha ao iniciar a próxima sessão da Raid: %',
     COALESCE(v_start->>'error','sessão inválida');
 END IF;

 UPDATE public.players SET stamina=v_current-v_cost WHERE id=p_player_id;
 UPDATE app_private.raid_runs
 SET fights_completed=v_next,current_session_id=(v_start->>'session_id')::uuid,
     stamina_spent=stamina_spent+v_cost,updated_at=now()
 WHERE id=v_raid.id;
 RETURN v_start || jsonb_build_object('raid_id',v_raid.id,'raid_total',v_raid.fight_total,
    'raid_current',v_next+1,'raid_completed',false,'raid_stamina_charged',v_raid.stamina_spent+v_cost);
END;
$function$;

CREATE OR REPLACE FUNCTION public.estado_raid_verificada(p_player_id integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE v_raid app_private.raid_runs%ROWTYPE;
 v_session public.player_combat_sessions%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.players WHERE id=p_player_id AND user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO v_raid FROM app_private.raid_runs
 WHERE player_id=p_player_id AND owner_id=auth.uid() AND status='active';
 IF NOT FOUND THEN RETURN jsonb_build_object('success',true,'active',false); END IF;
 SELECT * INTO v_session FROM public.player_combat_sessions
 WHERE session_id=v_raid.current_session_id AND player_id=p_player_id;
 RETURN jsonb_build_object('success',true,'active',true,
   'raid_total',v_raid.fight_total,'fights_completed',v_raid.fights_completed,
   'current_status',v_session.status,'session_id',v_raid.current_session_id,
   'enemy_id',v_session.enemy_id,'stamina_spent',v_raid.stamina_spent);
END;
$function$;

CREATE OR REPLACE FUNCTION public.vip_reset_talento(p_player_id integer,p_atributo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE v_player public.players%ROWTYPE; v_old integer;
 v_base integer; v_operation uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
 IF p_atributo NOT IN ('forca','agilidade','resistencia','inteligencia','energia',
  'ninjutsu','taijutsu','genjutsu','bukijutsu','selo') OR p_atributo IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','Atributo inválido.');
 END IF;
 SELECT * INTO v_player FROM public.players
 WHERE id=p_player_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não pertence à conta'; END IF;
 IF COALESCE(v_player.vip_coins,0)<1 THEN
   RETURN jsonb_build_object('success',false,'error','Créditos VIP insuficientes.');
 END IF;
 IF EXISTS(SELECT 1 FROM public.player_combat_sessions
   WHERE player_id=p_player_id AND status IN ('active','defeated') AND expires_at>now())
 OR EXISTS(SELECT 1 FROM public.world_boss_sessions
   WHERE player_id=p_player_id AND is_active IS TRUE)
 OR EXISTS(SELECT 1 FROM app_private.raid_runs
   WHERE player_id=p_player_id AND status='active')
 THEN RETURN jsonb_build_object('success',false,'error','Finalize suas batalhas antes de alterar atributos.'); END IF;

 -- 1 ponto abaixo do valor BASE da classe nunca pode ser consumido.
 v_base:=CASE upper(COALESCE(v_player.class,''))
   WHEN 'NIN' THEN CASE p_atributo
     WHEN 'forca' THEN 0 WHEN 'agilidade' THEN 2 WHEN 'resistencia' THEN 1
     WHEN 'inteligencia' THEN 4 WHEN 'energia' THEN 3 WHEN 'ninjutsu' THEN 5
     WHEN 'taijutsu' THEN 1 WHEN 'genjutsu' THEN 1 WHEN 'bukijutsu' THEN 0 ELSE 3 END
   WHEN 'TAI' THEN CASE p_atributo
     WHEN 'forca' THEN 4 WHEN 'agilidade' THEN 3 WHEN 'resistencia' THEN 3
     WHEN 'inteligencia' THEN 1 WHEN 'energia' THEN 2 WHEN 'ninjutsu' THEN 1
     WHEN 'taijutsu' THEN 5 WHEN 'genjutsu' THEN 0 WHEN 'bukijutsu' THEN 1 ELSE 0 END
   WHEN 'GEN' THEN CASE p_atributo
     WHEN 'forca' THEN 0 WHEN 'agilidade' THEN 2 WHEN 'resistencia' THEN 1
     WHEN 'inteligencia' THEN 4 WHEN 'energia' THEN 3 WHEN 'ninjutsu' THEN 1
     WHEN 'taijutsu' THEN 1 WHEN 'genjutsu' THEN 5 WHEN 'bukijutsu' THEN 0 ELSE 3 END
   WHEN 'BUK' THEN CASE p_atributo
     WHEN 'forca' THEN 3 WHEN 'agilidade' THEN 4 WHEN 'resistencia' THEN 2
     WHEN 'inteligencia' THEN 0 WHEN 'energia' THEN 1 WHEN 'ninjutsu' THEN 1
     WHEN 'taijutsu' THEN 1 WHEN 'genjutsu' THEN 0 WHEN 'bukijutsu' THEN 5 ELSE 3 END
   ELSE NULL END;
 IF v_base IS NULL THEN
  RETURN jsonb_build_object('success',false,'error','Classe não suportada para respec.');
 END IF;
 EXECUTE format('SELECT %I FROM public.players WHERE id=$1',p_atributo)
 INTO v_old USING p_player_id;
 IF COALESCE(v_old,0)<=v_base THEN
  RETURN jsonb_build_object('success',false,'error','Nenhum ponto acima da base para devolver.');
 END IF;
 EXECUTE format(
 'UPDATE public.players SET %I=%I-1,pontos_atributos=COALESCE(pontos_atributos,0)+1,vip_coins=vip_coins-1,total_vip_spent=total_vip_spent+1 WHERE id=$1',
 p_atributo,p_atributo) USING p_player_id;
 INSERT INTO app_private.vip_point_respec_ledger
   (player_id,owner_id,attribute,old_value,new_value,credits_charged)
 VALUES (p_player_id,auth.uid(),p_atributo,v_old,v_old-1,1)
 RETURNING operation_id INTO v_operation;
 RETURN jsonb_build_object('success',true,'attribute',p_atributo,
    'old_value',v_old,'new_value',v_old-1,
    'points_refunded',1,'credits_charged',1,'operation_id',v_operation);
END;
$function$;

-- Existing unsafe reservation can be called directly otherwise; block it.
REVOKE ALL ON FUNCTION public.reservar_raid_stamina(integer,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.iniciar_raid_verificada(integer,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.continuar_raid_verificada(integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.estado_raid_verificada(integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.vip_reset_talento(integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.iniciar_raid_verificada(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.continuar_raid_verificada(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estado_raid_verificada(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vip_reset_talento(integer,text) TO authenticated;
NOTIFY pgrst,'reload schema';
