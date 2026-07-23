-- Migration 025: Múltiplos requisitos de Jutsus e Segundo Elemento

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS element2 TEXT DEFAULT NULL;

ALTER TABLE public.jutsus
ADD COLUMN IF NOT EXISTS req_stats JSONB DEFAULT '{}'::jsonb;

-- Popula os requisitos baseados no req_attr_value atual, exigindo stats complementares da classe!

-- Genjutsu (Foco em Genjutsu, Inteligência e Selo)
UPDATE public.jutsus 
SET req_stats = jsonb_build_object(
  'genjutsu', GREATEST(1, req_attr_value),
  'inteligencia', GREATEST(1, floor(req_attr_value * 0.8)),
  'selo', GREATEST(1, floor(req_attr_value * 0.6))
)
WHERE type = 'Genjutsu' AND req_attr_value > 0;

-- Ninjutsu (Foco em Ninjutsu, Selo e Energia)
UPDATE public.jutsus 
SET req_stats = jsonb_build_object(
  'ninjutsu', GREATEST(1, req_attr_value),
  'selo', GREATEST(1, floor(req_attr_value * 0.8)),
  'energia', GREATEST(1, floor(req_attr_value * 0.6))
)
WHERE type = 'Ninjutsu' AND req_attr_value > 0;

-- Taijutsu (Foco em Taijutsu, Agilidade e Força)
UPDATE public.jutsus 
SET req_stats = jsonb_build_object(
  'taijutsu', GREATEST(1, req_attr_value),
  'agilidade', GREATEST(1, floor(req_attr_value * 0.8)),
  'forca', GREATEST(1, floor(req_attr_value * 0.6))
)
WHERE type = 'Taijutsu' AND req_attr_value > 0;

-- Bukijutsu (Foco em Bukijutsu, Agilidade e Força)
UPDATE public.jutsus 
SET req_stats = jsonb_build_object(
  'bukijutsu', GREATEST(1, req_attr_value),
  'agilidade', GREATEST(1, floor(req_attr_value * 0.8)),
  'forca', GREATEST(1, floor(req_attr_value * 0.6))
)
WHERE type = 'Bukijutsu' AND req_attr_value > 0;
