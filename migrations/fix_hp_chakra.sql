-- Script de Correção de Emergência: Adicionar colunas hp e chakra na tabela players

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS hp integer,
ADD COLUMN IF NOT EXISTS chakra integer;

-- Forçar o Supabase a reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';
