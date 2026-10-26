-- Auditoria Supabase: SOMENTE LEITURA.
-- Execute no SQL Editor do projeto alvo; não modifica esquema nem dados.
-- Salve os resultados junto com a data e o ambiente (staging/produção).

-- 1) Tabelas públicas e estado RLS (não informa por si só se as policies são corretas).
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- 2) Políticas RLS efetivas declaradas: comandos, roles, USING e WITH CHECK.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) Colunas que identificam usuário e personagem em tabelas críticas.
SELECT
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'players', 'jutsus', 'player_jutsus', 'missions',
    'story_quests', 'player_quests', 'npcs',
    'battle_logs', 'world_boss_events', 'world_boss_damage',
    'player_inventory', 'inventory'
  )
ORDER BY table_name, ordinal_position;

-- 4) Assinaturas reais das RPCs críticas, SECURITY DEFINER e search_path.
-- Compare esta saída com as chamadas supabase.rpc(...) e as migrações versionadas.
SELECT
  p.oid::regprocedure AS function_signature,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  pg_get_userbyid(p.proowner) AS owner,
  p.proacl AS raw_acl,
  p.prosrc ILIKE '%auth.uid%' AS mentions_auth_uid
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
    'viajar_mapa',
    'aprender_jutsu',
    'aprender_jutsus_massa',
    'vip_reset_talento',
    'vip_reset_personagem',
    'treinar_atributo',
    'iniciar_missao',
    'finalizar_missao',
    'finalizar_combate',
    'resolver_turno_combate',
    'concluir_story_quest',
    'distribute_boss_rewards',
    'modificar_jutsu_slots',
    'aprimorar_equipamento'
  )
ORDER BY p.proname, p.oid::regprocedure::text;

-- 5) Privilégios EXECUTE concedidos explicitamente ou por padrão (inclui PUBLIC).
-- Grantee OID zero significa PUBLIC. ACLs são mostradas sem assumir que um nome de role exista.
SELECT
  p.oid::regprocedure AS function_signature,
  CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS grantee,
  a.privilege_type,
  a.is_grantable,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) AS a
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN (
    'viajar_mapa',
    'aprender_jutsu',
    'aprender_jutsus_massa',
    'vip_reset_talento',
    'vip_reset_personagem',
    'treinar_atributo',
    'iniciar_missao',
    'finalizar_missao',
    'finalizar_combate',
    'resolver_turno_combate',
    'concluir_story_quest',
    'distribute_boss_rewards',
    'modificar_jutsu_slots',
    'aprimorar_equipamento'
  )
ORDER BY p.proname, function_signature::text, grantee;

-- 6) Funções SECURITY DEFINER no schema public sem uma configuração explícita
-- search_path na função. Resultado é uma lista para revisão manual, não prova isolada de exploit.
SELECT
  p.oid::regprocedure AS function_signature,
  pg_get_userbyid(p.proowner) AS owner,
  p.proconfig AS function_settings,
  p.prosrc ILIKE '%auth.uid%' AS mentions_auth_uid,
  p.prosrc ILIKE '%SET search_path%' AS mentions_search_path_in_body
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.prosecdef
  AND NOT EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
    WHERE setting ILIKE 'search_path=%'
  )
ORDER BY p.proname, p.oid::regprocedure::text;

-- 7) Integridade de duplicidade nos dados relacionados a progresso e recompensas.
-- Apenas leitura; contagens servem como triagem, não como correção automática.
SELECT 'player_quests_duplicate_player_quest' AS check_name, COUNT(*) AS affected_groups
FROM (
  SELECT player_id, quest_id
  FROM public.player_quests
  GROUP BY player_id, quest_id
  HAVING COUNT(*) > 1
) d
UNION ALL
SELECT 'world_boss_damage_duplicate_player_event', COUNT(*)
FROM (
  SELECT player_id, event_id
  FROM public.world_boss_damage
  GROUP BY player_id, event_id
  HAVING COUNT(*) > 1
) d;
