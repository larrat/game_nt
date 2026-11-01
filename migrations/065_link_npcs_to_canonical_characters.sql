-- 065: todos os NPCs persistidos representam personagens do catálogo.
-- Não altera IDs, atributos, flags de encontro, recompensas, progresso ou sessões.
-- Snapshot privado antes de mudanças e preflight com rollback transacional.
SET lock_timeout = '5s';
SET statement_timeout = '30s';

CREATE SCHEMA IF NOT EXISTS content_reference;
REVOKE ALL ON SCHEMA content_reference FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS content_reference.npc_identity_before_20261101 (
    npc_id integer PRIMARY KEY,
    old_record jsonb NOT NULL,
    captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE content_reference.npc_identity_before_20261101 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON content_reference.npc_identity_before_20261101 FROM PUBLIC, anon, authenticated;

CREATE TEMP TABLE npc_character_map (
    npc_id integer PRIMARY KEY,
    character_id text NOT NULL UNIQUE
) ON COMMIT DROP;
INSERT INTO npc_character_map (npc_id, character_id) VALUES
    (1,'1'), (2,'ng-initial-95'), (3,'ng-initial-3'),
    (4,'ng-initial-57'), (5,'ng-initial-4'), (6,'ng-initial-55'),
    (7,'ng-initial-54'), (15,'ng-initial-43'), (16,'ng-initial-52'),
    (17,'ng-initial-47'), (18,'ng-initial-44'),
    (49,'ng-initial-62'), (50,'ng-initial-69'), (51,'2'),
    (54,'ng-initial-167');

DO $validate_npc_catalog$
BEGIN
  IF (SELECT COUNT(*) FROM public.npcs) <> 15
     OR (SELECT COUNT(*) FROM npc_character_map) <> 15
     OR EXISTS (SELECT 1 FROM public.npcs n
                WHERE NOT EXISTS (SELECT 1 FROM npc_character_map m WHERE m.npc_id=n.id))
     OR EXISTS (SELECT 1 FROM npc_character_map m
                WHERE NOT EXISTS (SELECT 1 FROM public.npcs n WHERE n.id=m.npc_id))
     OR EXISTS (SELECT 1 FROM npc_character_map m
                WHERE NOT EXISTS (SELECT 1 FROM public.characters c WHERE c.id=m.character_id))
  THEN
     RAISE EXCEPTION 'Catálogo NPC divergiu do pré-flight; abortando sem alterações.';
  END IF;
END $validate_npc_catalog$;

INSERT INTO content_reference.npc_identity_before_20261101 (npc_id,old_record)
SELECT id,to_jsonb(n) FROM public.npcs n ON CONFLICT(npc_id) DO NOTHING;

ALTER TABLE public.npcs ADD COLUMN IF NOT EXISTS character_id text;
UPDATE public.npcs n SET
  character_id = m.character_id,
  name = c.name,
  avatar = CASE
    WHEN c.base_avatar_url LIKE '/images/%'
     AND position('..' in c.base_avatar_url)=0
      THEN c.base_avatar_url
    ELSE NULL
  END,
  -- Não atribuir elementos aleatórios aos personagens de etapa de exame.
  element = CASE WHEN n.id IN (49,50,54) THEN NULL
                 WHEN n.id=51 THEN 'Katon'
                 ELSE n.element END,
  description = CASE n.id
    WHEN 17 THEN 'Temari, ninja de Sunagakure, encontrada no deserto.'
    WHEN 18 THEN 'Haku, shinobi da Névoa associado à história de Zabuza.'
    WHEN 49 THEN 'Shikamaru Nara, adversário da primeira etapa do Exame Chunin.'
    WHEN 50 THEN 'Hinata Hyuuga, adversária da segunda etapa do Exame Chunin.'
    WHEN 51 THEN 'Sasuke Uchiha, adversário da terceira etapa do Exame Chunin.'
    WHEN 54 THEN 'Mizuki Touji, o responsável pelo roubo do pergaminho na missão O Teste do Hokage.'
    ELSE n.description END
FROM npc_character_map m
JOIN public.characters c ON c.id=m.character_id
WHERE n.id=m.npc_id;

ALTER TABLE public.npcs ALTER COLUMN avatar DROP DEFAULT;
ALTER TABLE public.npcs ALTER COLUMN character_id SET NOT NULL;
DO $add_npc_fk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.npcs'::regclass
                 AND conname='npcs_character_id_fkey') THEN
    ALTER TABLE public.npcs
      ADD CONSTRAINT npcs_character_id_fkey FOREIGN KEY(character_id)
      REFERENCES public.characters(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.npcs'::regclass
                 AND conname='npcs_avatar_local_or_null') THEN
    ALTER TABLE public.npcs ADD CONSTRAINT npcs_avatar_local_or_null CHECK
      (avatar IS NULL OR (avatar LIKE '/images/%'
        AND position('..' IN avatar)=0 AND avatar NOT LIKE '//%'));
  END IF;
END $add_npc_fk$;

-- Mantém a quest 2 apontando ao NPC 54, agora explicitamente Mizuki.
UPDATE public.story_quests SET
  description = 'Prove seu valor enfrentando Mizuki Touji, o responsável pelo roubo do pergaminho.',
  npc_name = 'Hiruzen Sarutobi',
  npc_image_url = NULL,
  objective_target = jsonb_set(
    jsonb_set(objective_target, '{npc,name}', to_jsonb('Mizuki Touji'::text), true),
    '{npc,avatar}', 'null'::jsonb, true
  )
WHERE id=2 AND objective_type='combat'
  AND objective_target->>'npc_id'='54';

DO $verify_npc_catalog$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.npcs n
    LEFT JOIN public.characters c ON c.id=n.character_id
    WHERE c.id IS NULL OR n.name IS DISTINCT FROM c.name OR n.avatar IS NOT NULL
          AND (n.avatar NOT LIKE '/images/%' OR position('..' IN n.avatar)>0)
  ) OR (SELECT COUNT(*) FROM public.npcs) <> 15
  THEN RAISE EXCEPTION 'Integridade da identidade canônica do NPC falhou.'; END IF;
  IF (SELECT objective_target->>'npc_id' FROM public.story_quests WHERE id=2) <> '54'
  THEN RAISE EXCEPTION 'ID da missão 2 alterado; rollback.'; END IF;
END $verify_npc_catalog$;

NOTIFY pgrst, 'reload schema';
