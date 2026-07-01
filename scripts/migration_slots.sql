-- Migração: Suporte a Múltiplas Missões e Moeda Premium
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS vip_coins INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS mission_slots INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS active_missions JSONB DEFAULT '[]'::jsonb;
