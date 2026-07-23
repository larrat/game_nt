-- Migration 024: Adiciona colunas de customização de clã na tabela de players

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS clan_custom_stats JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS clan_lvl INT DEFAULT 0;
