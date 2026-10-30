-- Phase 1/2: sanitized, authenticated read endpoints for rankings, villages, ghosts and dojo.
-- Apply before deploying the frontend; does not change RLS yet.
-- SECURITY DEFINER is intentional and scoped: only explicit display fields are returned.
CREATE OR REPLACE FUNCTION public.listar_perfis_ninja(
  p_village_id integer DEFAULT NULL,
  p_limit integer DEFAULT 50
) RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF p_village_id IS NOT NULL AND p_village_id NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'Vila inválida';
  END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'id', p.id, 'name', p.name, 'class', p.class,
    'level', p.level, 'xp', p.xp, 'village_id', p.village_id,
    'rank', p.rank, 'avatar', p.avatar, 'element', p.element
  )
  FROM public.players AS p
  WHERE p_village_id IS NULL OR p.village_id = p_village_id
  ORDER BY p.level DESC NULLS LAST, p.xp DESC NULLS LAST, p.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500);
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_lideres_vila()
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object(
    'name', ranked.name, 'level', ranked.level,
    'class', ranked.class, 'village_id', ranked.village_id
  )
  FROM (
    SELECT DISTINCT ON (p.village_id)
      p.name, p.level, p.class, p.village_id
    FROM public.players p
    WHERE p.village_id IS NOT NULL
    ORDER BY p.village_id, p.level DESC NULLS LAST, p.xp DESC NULLS LAST, p.id
  ) ranked ORDER BY ranked.village_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.contar_ninjas_vila()
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  RETURN QUERY
  SELECT jsonb_build_object('village_id',p.village_id,'count',count(*)::integer)
  FROM public.players p
  WHERE p.village_id IS NOT NULL
  GROUP BY p.village_id
  ORDER BY p.village_id;
END;
$$;

-- Opponent-specific data can be discovered only by an authenticated player
-- in the same village and level/rank window. No user ID, currency, inventory,
-- tokens, quest history or equipment is returned.
CREATE OR REPLACE FUNCTION public.listar_rivais_dojo(
  p_player_id integer,
  p_min_level integer,
  p_max_level integer,
  p_target_ranks text[] DEFAULT NULL
) RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_village_id integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF p_player_id IS NULL OR p_min_level IS NULL OR p_max_level IS NULL
     OR p_min_level < 1 OR p_max_level < p_min_level OR p_max_level > 100000
     OR COALESCE(cardinality(p_target_ranks),0) > 12 THEN
    RAISE EXCEPTION 'Parâmetros de busca inválidos';
  END IF;
  SELECT village_id INTO v_village_id FROM public.players
  WHERE id=p_player_id AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Personagem não encontrado ou acesso negado'; END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id',p.id,'name',p.name,'avatar',p.avatar,'level',p.level,
    'rank',p.rank,'element',p.element,'clan',p.clan,'clan_lvl',p.clan_lvl,
    'clan_custom_stats',p.clan_custom_stats,
    'forca',p.forca,'agilidade',p.agilidade,'resistencia',p.resistencia,
    'inteligencia',p.inteligencia,'energia',p.energia,'selo',p.selo,
    'taijutsu',p.taijutsu,'bukijutsu',p.bukijutsu,
    'ninjutsu',p.ninjutsu,'genjutsu',p.genjutsu,
    'jutsu_ids',COALESCE(
      (
        SELECT jsonb_agg(
          CASE WHEN jsonb_typeof(j.elem) = 'string' THEN j.elem
               ELSE to_jsonb(j.elem->>'id') END
        )
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.jutsus_learned) = 'array'
               THEN p.jutsus_learned ELSE '[]'::jsonb END
        ) AS j(elem)
        WHERE jsonb_typeof(j.elem) = 'string' OR j.elem ? 'id'
      ),'[]'::jsonb)
  )
  FROM public.players p
  WHERE p.village_id=v_village_id
    AND p.id<>p_player_id
    AND p.level BETWEEN p_min_level AND p_max_level
    AND (p_target_ranks IS NULL OR p.rank = ANY(p_target_ranks))
  ORDER BY p.level DESC NULLS LAST, p.id
  LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_perfis_ninja(integer,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.listar_lideres_vila() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.contar_ninjas_vila() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.listar_rivais_dojo(integer,integer,integer,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.listar_perfis_ninja(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_lideres_vila() TO authenticated;
GRANT EXECUTE ON FUNCTION public.contar_ninjas_vila() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_rivais_dojo(integer,integer,integer,text[]) TO authenticated;
NOTIFY pgrst,'reload schema';
