-- Migration 039: pin search_path for remaining legacy public RPCs/helpers.
-- This preserves their current code and permissions while preventing object shadowing
-- through a mutable caller-controlled search_path.

ALTER FUNCTION public.calcular_level_por_xp(bigint)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.comprar_item_loja(integer, integer)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.comprar_ramen(integer, integer, integer)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.desbloquear_avatar_templo(integer, text, integer)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.desbloquear_portao(integer, integer, integer, integer)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.distribute_boss_rewards(bigint)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.doar_vila(integer, text, bigint)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_clan_bonus(text)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_equipment_bonus(jsonb, text)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.get_rank_bonus(text)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.reivindicar_recompensa_diaria(integer, integer, text, integer)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.resolver_turno_combate(uuid, text, jsonb, text, uuid, jsonb, jsonb, jsonb, jsonb, numeric)
    SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.vender_itens(integer, integer[])
    SET search_path = pg_catalog, public, pg_temp;

NOTIFY pgrst, 'reload schema';
