-- 072: asset provenance and approval gate. Research references are not licensed game assets.
-- No public.characters, public.avatars, public.npcs or gameplay_enabled changes.
SET lock_timeout = '5s';
SET statement_timeout = '30s';
CREATE SCHEMA IF NOT EXISTS content_reference;
REVOKE ALL ON SCHEMA content_reference FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS content_reference.art_rights_reviews (
  character_id text PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  observed_source_url text,
  approved_local_path text,
  rights_holder text,
  rights_basis text,
  permitted_scope text,
  license_document_ref text,
  approved_by text,
  reviewed_at timestamptz,
  review_status text NOT NULL DEFAULT 'pending_rights'
    CHECK(review_status IN ('pending_rights','rejected','approved')),
  CHECK (
    review_status <> 'approved'
    OR (
      approved_local_path IS NOT NULL
      AND approved_local_path LIKE '/images/%'
      AND position('..' IN approved_local_path)=0
      AND NULLIF(btrim(rights_holder),'') IS NOT NULL
      AND NULLIF(btrim(rights_basis),'') IS NOT NULL
      AND NULLIF(btrim(permitted_scope),'') IS NOT NULL
      AND NULLIF(btrim(license_document_ref),'') IS NOT NULL
      AND NULLIF(btrim(approved_by),'') IS NOT NULL
      AND reviewed_at IS NOT NULL
    )
  )
);
ALTER TABLE content_reference.art_rights_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_reference.art_rights_reviews FROM PUBLIC,anon,authenticated;

INSERT INTO content_reference.art_rights_reviews
(character_id,character_name,observed_source_url,approved_local_path,review_status)
SELECT c.id,c.name,c.base_avatar_url,NULL,'pending_rights'
FROM public.characters c
ON CONFLICT(character_id) DO NOTHING;

-- A function can bind only a reviewed local portrait to the operational NPC.
-- This function is inaccessible to the Data API roles; deployment requires manual
-- administrative approval of proof and a separately verified local asset path.
CREATE OR REPLACE FUNCTION content_reference.apply_approved_npc_portrait(p_character_id text)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,content_reference
AS $fn$
DECLARE v_asset text; v_count integer;
BEGIN
 SELECT approved_local_path INTO v_asset
 FROM content_reference.art_rights_reviews
 WHERE character_id=p_character_id AND review_status='approved'
 FOR UPDATE;
 IF v_asset IS NULL THEN
   RAISE EXCEPTION 'Rights review not approved for character %',p_character_id;
 END IF;
 UPDATE public.npcs n SET avatar=v_asset
 WHERE n.character_id=p_character_id;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END
$fn$;
REVOKE ALL ON FUNCTION content_reference.apply_approved_npc_portrait(text)
FROM PUBLIC,anon,authenticated;
