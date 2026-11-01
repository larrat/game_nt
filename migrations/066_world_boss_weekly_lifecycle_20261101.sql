-- 066_world_boss_weekly_lifecycle_20261101
-- Cron legado tentava recompensar uma tabela inexistente (world_boss_events).
-- As recompensas por DERROTA do chefe são autoritativas em atacar_world_boss.
-- Este procedimento não inventa premiação por mero vencimento de prazo.
-- Histórico de dano de rounds antigos é ARQUIVADO antes da limpeza da rodada.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
   RAISE EXCEPTION 'pg_cron não está instalado; rollback.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='open_kyuubi_event')
    OR NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='close_kyuubi_event') THEN
   RAISE EXCEPTION 'Jobs originais ausentes; revisar configuração antes de alterar.';
 END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS app_private.world_boss_cron_snapshot_20261101 (
  jobname text PRIMARY KEY,
  snapshot jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.world_boss_round_damage_archive (
  event_id integer NOT NULL,
  previous_ends_at timestamptz NOT NULL,
  player_id integer NOT NULL,
  total_damage bigint NOT NULL,
  is_last_hit boolean NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, previous_ends_at, player_id)
);
ALTER TABLE app_private.world_boss_cron_snapshot_20261101 ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.world_boss_round_damage_archive ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA app_private FROM public, anon, authenticated;
INSERT INTO app_private.world_boss_cron_snapshot_20261101(jobname,snapshot)
SELECT jobname,to_jsonb(j) FROM cron.job j
WHERE jobname IN ('open_kyuubi_event','close_kyuubi_event')
ON CONFLICT (jobname) DO NOTHING;

CREATE OR REPLACE FUNCTION app_private.rollover_world_boss_weekly()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,app_private
AS $function$
DECLARE
  v_event public.global_events%ROWTYPE;
  v_end timestamptz;
  v_day integer;
BEGIN
  v_day := extract(isodow FROM timezone('America/Belem',now()));
  -- Executado no começo da segunda-feira pelo cron (03:01 UTC).
  IF v_day <> 1 THEN RETURN; END IF;
  v_end := (
    date_trunc('week',timezone('America/Belem',now()))
    + interval '4 days'
  ) AT TIME ZONE 'America/Belem';
  IF v_end <= now() THEN RETURN; END IF;

  SELECT * INTO v_event
  FROM public.global_events
  WHERE name='A Fúria da Raposa' AND is_world_boss IS TRUE
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_event.is_active IS TRUE AND v_event.ends_at > now() THEN
    RETURN; -- não reinicializar um round em andamento
  END IF;
  IF EXISTS (SELECT 1 FROM public.world_boss_sessions
             WHERE event_id=v_event.id AND is_active IS TRUE) THEN
    RETURN; -- evitar descartar contribuição de sessão em curso
  END IF;

  -- Preserva participação de rounds anteriores fora do catálogo operacional.
  INSERT INTO app_private.world_boss_round_damage_archive
      (event_id,previous_ends_at,player_id,total_damage,is_last_hit)
  SELECT event_id,COALESCE(v_event.ends_at,'1970-01-01'::timestamptz),
         player_id,total_damage,is_last_hit
  FROM public.world_boss_damage WHERE event_id=v_event.id
  ON CONFLICT(event_id,previous_ends_at,player_id) DO UPDATE
    SET total_damage=excluded.total_damage,
        is_last_hit=excluded.is_last_hit;

  DELETE FROM public.world_boss_damage WHERE event_id=v_event.id;
  UPDATE public.global_events
     SET boss_hp=boss_max_hp, is_active=true, ends_at=v_end
   WHERE id=v_event.id;
END $function$;
REVOKE ALL ON FUNCTION app_private.rollover_world_boss_weekly() FROM public,anon,authenticated;

-- Atualizar os mesmos jobs, preservando nomes e horários originais.
-- PG CRON executa os dois comandos sob a conta administrativa do job.
SELECT cron.schedule(
  'open_kyuubi_event', '1 3 * * 1',
  'SELECT app_private.rollover_world_boss_weekly();'
);
SELECT cron.schedule(
  'close_kyuubi_event', '0 3 * * 5',
  'UPDATE public.global_events SET is_active=false WHERE name=''A Fúria da Raposa'' AND is_world_boss IS TRUE AND ends_at <= now();'
);

-- Inativa somente registros claramente expirados e sem sessão em andamento.
UPDATE public.global_events e SET is_active=false
WHERE e.is_world_boss IS TRUE AND e.ends_at <= now() AND e.is_active IS TRUE
 AND NOT EXISTS(
   SELECT 1 FROM public.world_boss_sessions s
   WHERE s.event_id=e.id AND s.is_active IS TRUE
 );

NOTIFY pgrst,'reload schema';
