-- ==========================================
-- SISTEMA DE CONSUMÍVEIS (ICHIRAKU RAMEN)
-- ==========================================

-- 1. Cria a tabela base dos itens disponíveis no jogo
CREATE TABLE IF NOT EXISTS public.consumables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'hp', 'cp', 'sp', 'all'
    value INTEGER NOT NULL DEFAULT 0, -- O quanto ele recupera
    cost_ryous INTEGER NOT NULL DEFAULT 0,
    cost_coins INTEGER NOT NULL DEFAULT 0,
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e Permissões
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.consumables FOR SELECT USING (true);

-- Inserir o cardápio padrão
INSERT INTO public.consumables (name, description, type, value, cost_ryous, cost_coins, icon) VALUES
('Ramen Pequeno', 'Um pequeno pote de ramen quente de porco. Restaura 200 de Saúde (HP).', 'hp', 200, 30, 0, '🍜'),
('Ramen Especial do Teuchi', 'A especialidade da casa! Caldo espesso e carne suculenta. Restaura 600 de Saúde (HP).', 'hp', 600, 100, 0, '🍲'),
('Pílula de Soldado Verde', 'Restaura a rede de Chakra superficial. Recupera 200 de Chakra (CP).', 'cp', 200, 30, 0, '💊'),
('Pílula de Soldado Azul', 'Uma pílula concentrada que força a produção de chakra celular. Recupera 600 de Chakra (CP).', 'cp', 600, 100, 0, '🔵'),
('Bebida Energética', 'Uma garrafa com ervas revitalizantes para combater o cansaço. Restaura 150 de Energia (SP).', 'sp', 150, 50, 0, '🍵'),
('Pílula do Renascimento', 'Uma rara pílula vermelha secreta. Cura todo o HP, Chakra e Stamina de uma vez.', 'all', 99999, 0, 5, '🔴');

-- ==========================================

-- 2. Cria a tabela de Mochila do Jogador
CREATE TABLE IF NOT EXISTS public.player_consumables (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id INTEGER REFERENCES public.players(id) ON DELETE CASCADE,
    consumable_id INTEGER REFERENCES public.consumables(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, consumable_id)
);

-- Habilitar RLS e Permissões
ALTER TABLE public.player_consumables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable ALL for users based on user_id" ON public.player_consumables 
FOR ALL USING (auth.uid() = (SELECT user_id FROM players WHERE players.id = player_consumables.player_id));
