-- Migration 041: make village construction progress and donor totals server-owned.
-- The Vila page reads these tables directly but performs donations only through
-- public.doar_vila(), which validates auth.uid(), the character owner and the fixed
-- donation amount before changing ryous, building progress and donor totals.

DROP POLICY IF EXISTS "Enable update for all users" ON public.village_buildings;

DROP POLICY IF EXISTS "Enable insert for all users" ON public.village_donors;
DROP POLICY IF EXISTS "Enable update for all users" ON public.village_donors;

-- Remove direct client write privileges, including grants inherited from PUBLIC.
-- The SECURITY DEFINER donation RPC retains its owner privileges.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON TABLE public.village_buildings, public.village_donors
    FROM PUBLIC, anon, authenticated;

-- Preserve the existing public read experience for the village and donor displays.
GRANT SELECT ON TABLE public.village_buildings, public.village_donors
    TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
