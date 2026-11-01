-- Disposable PostgreSQL test DB ONLY. Synthetic users, NPCs, and characters.
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE SCHEMA IF NOT EXISTS content_reference;
CREATE TABLE public.players (
  id integer PRIMARY KEY,
  user_id uuid,
  class text,
  level integer,
  hp integer,
  chakra integer,
  stamina integer,
  is_fainted boolean DEFAULT false,
  vip_coins integer DEFAULT 0,
  pontos_atributos integer DEFAULT 0,
  forca integer DEFAULT 1,
  agilidade integer DEFAULT 1,
  resistencia integer DEFAULT 1,
  inteligencia integer DEFAULT 1,
  energia integer DEFAULT 1,
  ninjutsu integer DEFAULT 1,
  taijutsu integer DEFAULT 1,
  genjutsu integer DEFAULT 1,
  bukijutsu integer DEFAULT 1,
  selo integer DEFAULT 1
);
CREATE TABLE public.characters (
  id text PRIMARY KEY, name text NOT NULL, base_avatar_url text
);
CREATE TABLE public.npcs (
  id integer PRIMARY KEY, name text NOT NULL,
  is_active boolean DEFAULT true,
  is_map_npc boolean DEFAULT false,
  is_story_mode boolean DEFAULT false,
  is_bingo_book boolean DEFAULT false,
  is_chunin_exam boolean DEFAULT false,
  character_id text REFERENCES public.characters(id),
  level integer DEFAULT 1
);
CREATE TABLE public.game_config(key text PRIMARY KEY,value jsonb);
CREATE TABLE public.player_combat_sessions (
 session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 player_id integer REFERENCES public.players(id),
 enemy_id integer REFERENCES public.npcs(id),
 status text NOT NULL DEFAULT 'active',
 expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes',
 player_stamina integer NOT NULL
);
CREATE TABLE public.world_boss_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id integer REFERENCES public.players(id),
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE content_reference.entries (
  batch_id text NOT NULL,entity_kind text NOT NULL,
  reference_id text NOT NULL,display_name text,source_path text,
  PRIMARY KEY(batch_id,entity_kind,reference_id)
);

CREATE OR REPLACE FUNCTION public.kurokage_player_max_stat(p_player_id integer,p_stat text)
RETURNS integer LANGUAGE sql STABLE AS $$ SELECT 200 $$;

-- Narrow integration double for the established session RPC, not the real combat engine.
CREATE OR REPLACE FUNCTION public.iniciar_combate_sessao(
  p_player_id integer,p_enemy_id integer,p_from_map boolean,p_is_dojo boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $fn$
DECLARE v_session uuid; v_stamina integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.players WHERE id=p_player_id AND user_id=auth.uid()
 ) THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF NOT p_is_dojo OR NOT EXISTS(
   SELECT 1 FROM public.npcs WHERE id=p_enemy_id AND is_active IS TRUE
   AND is_map_npc IS FALSE AND is_story_mode IS FALSE
   AND is_bingo_book IS FALSE AND is_chunin_exam IS FALSE) THEN
   RETURN jsonb_build_object('success',false,'error','Contexto inválido');
 END IF;
 SELECT session_id INTO v_session FROM public.player_combat_sessions
 WHERE player_id=p_player_id AND status='active' AND expires_at>now()
 LIMIT 1;
 IF FOUND THEN RETURN jsonb_build_object('success',true,
  'resumed_session',true,'session_id',v_session,'enemy_id',p_enemy_id); END IF;
 SELECT stamina INTO v_stamina FROM public.players WHERE id=p_player_id;
 INSERT INTO public.player_combat_sessions(player_id,enemy_id,player_stamina)
 VALUES (p_player_id,p_enemy_id,v_stamina) RETURNING session_id INTO v_session;
 RETURN jsonb_build_object('success',true,'session_id',v_session,'enemy_id',p_enemy_id,
   'player_stamina',v_stamina);
END;
$fn$;
CREATE OR REPLACE FUNCTION public.reservar_raid_stamina(p_player_id integer,p_fight_count integer)
RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('legacy',true)$$;

INSERT INTO public.characters(id,name,base_avatar_url)
VALUES ('1','Naruto Uzumaki','/images/naruto.jpg'),
       ('2','Sasuke Uchiha','https://example.org/reference-only.png');
INSERT INTO public.npcs(id,name,character_id,level)
VALUES(4,'Naruto Uzumaki','1',1),(5,'Sasuke Uchiha','2',2);
INSERT INTO public.players(id,user_id,class,level,hp,chakra,stamina,
 vip_coins,pontos_atributos,forca)
VALUES
(100,'11111111-1111-4111-8111-111111111111','NIN',5,100,100,125,3,0,5),
(200,'22222222-2222-4222-8222-222222222222','TAI',5,100,100,125,3,0,6);
INSERT INTO content_reference.entries(batch_id,entity_kind,reference_id,display_name,source_path)
VALUES ('synthetic','character','1','Naruto Uzumaki','data/fixture.json');
