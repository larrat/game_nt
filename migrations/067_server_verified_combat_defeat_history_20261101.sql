-- 067: historical defeat logs only from server-authorized combat sessions.
-- Does not import or mutate existing player sessions or historical log rows.
CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM public,anon,authenticated;

CREATE OR REPLACE FUNCTION app_private.log_official_pve_defeat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
BEGIN
  -- Trigger fires only when a valid session moves to the server-defined
  -- player_defeated status, not on a client-provided battle result.
  IF NEW.status <> 'player_defeated'
     OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.battle_logs
    (player_id,enemy_name,result,xp_gained,ryous_gained,turn_count,combat_log)
  VALUES
    (NEW.player_id,COALESCE(NULLIF(NEW.enemy_name,''),'Adversário'),
     'Derrota',0,0,GREATEST(0,COALESCE(NEW.turn_count,0)),
     jsonb_build_array(jsonb_build_object(
       'origin','server_verified_pve',
       'session_id',NEW.session_id,
       'enemy_id',NEW.enemy_id,
       'exam',NEW.is_exam,
       'from_map',NEW.from_map,
       'dojo',NEW.is_dojo
     )));
  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION app_private.log_official_pve_defeat() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS pve_log_verified_defeat ON public.player_combat_sessions;
CREATE TRIGGER pve_log_verified_defeat
AFTER UPDATE OF status ON public.player_combat_sessions
FOR EACH ROW
WHEN (NEW.status='player_defeated' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION app_private.log_official_pve_defeat();
