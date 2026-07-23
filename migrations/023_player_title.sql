-- Migration 023: Adiciona a coluna title na tabela de players

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS title VARCHAR(100) DEFAULT 'Nenhum(a)';
