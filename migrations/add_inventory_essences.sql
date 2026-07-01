-- Adiciona a coluna inventory_essences caso não exista
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='players' AND column_name='inventory_essences') THEN
        ALTER TABLE public.players ADD COLUMN inventory_essences JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
