-- migrations/014_inserir_catalogo_jutsus.sql

-- 1. Adicionar as novas colunas de restrição por atributo (se não existirem)
ALTER TABLE public.jutsus 
ADD COLUMN IF NOT EXISTS req_attr_value INTEGER DEFAULT 0;

-- 2. Limpar a tabela de Jutsus atual para evitar dados velhos ou mal escalados
-- Como a tabela player_jutsus tem ON DELETE CASCADE, os jogadores perderão os jutsus antigos
-- Mas como é um Wipe/Beta, isso é esperado para rebalancear.
TRUNCATE TABLE public.jutsus RESTART IDENTITY CASCADE;

-- ==========================================
-- SESSÃO 1: BÁSICOS (NINJUTSU)
-- ==========================================
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan, req_attr_value) VALUES
-- Estudante (Sem req de atributo, apenas para iniciar)
('Técnica de Substituição (Kawarimi)', 'Substitui seu corpo por um tronco.', 'Ninjutsu', 'Ninjutsu', 1, 'Estudante da Academia', 100, 10, 0, 100, 5, 2, true, NULL, NULL, 0),
('Técnica de Clonagem (Bunshin)', 'Cria ilusões de si mesmo.', 'Ninjutsu', 'Ninjutsu', 2, 'Estudante da Academia', 150, 15, 10, 95, 5, 0, true, NULL, NULL, 0),
('Corda de Chakra', 'Prende o alvo temporariamente com uma corda fraca.', 'Ninjutsu', 'Ninjutsu', 3, 'Estudante da Academia', 200, 20, 20, 90, 10, 1, true, NULL, NULL, 0),
-- Genin
('Agulhas de Chakra', 'Dispara agulhas minúsculas de chakra. (Tier 1)', 'Ninjutsu', 'Ninjutsu', 5, 'Genin', 500, 20, 35, 95, 15, 0, true, NULL, NULL, 5),
('Shuriken das Sombras', 'Uma shuriken escondida na sombra de outra. (Tier 2)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 800, 30, 50, 90, 20, 1, true, NULL, NULL, 15),
('Técnica de Ocultação Camuflada', 'Ataca de surpresa após se mesclar com o ambiente. (Tier 3)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1200, 40, 70, 85, 25, 2, true, NULL, NULL, 25),
-- Chunin
('Kage Bunshin no Jutsu', 'Clones reais e sólidos que dividem a mente. (Tier 1)', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 50, 100, 100, 30, 2, true, NULL, NULL, 35),
('Bomba de Fumaça Aprimorada', 'Explosão de chakra denso que cega e fere o inimigo. (Tier 2)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3000, 65, 130, 90, 35, 2, true, NULL, NULL, 45),
('Formação de Barreira Simples', 'Prende o alvo em uma barreira prismática de dor. (Tier 3)', 'Ninjutsu', 'Ninjutsu', 30, 'Chunin', 3500, 80, 160, 95, 40, 3, true, NULL, NULL, 55),
-- Jonin
('Rastreamento Perfeito', 'Uma onda sensorial que paralisa o alvo temporariamente. (Tier 1)', 'Ninjutsu', 'Ninjutsu', 35, 'Jonin', 6000, 120, 220, 100, 45, 3, true, NULL, NULL, 70),
('Selamento Parcial: Cadeias', 'Cadeias roxas brotam do chão apertando o inimigo. (Tier 2)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 7000, 150, 260, 90, 50, 3, true, NULL, NULL, 85),
('Onda de Destruição', 'Uma enorme liberação frontal de chakra puro. (Tier 3)', 'Ninjutsu', 'Ninjutsu', 45, 'Jonin', 8500, 180, 320, 95, 60, 4, true, NULL, NULL, 100);


-- ==========================================
-- SESSÃO 2: BÁSICOS (TAIJUTSU)
-- ==========================================
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan, req_attr_value) VALUES
-- Estudante
('Soco Básico', 'Um cruzado direto de direita.', 'Taijutsu', 'Taijutsu', 1, 'Estudante da Academia', 100, 0, 15, 95, 0, 0, true, NULL, NULL, 0),
('Rasteira Dupla', 'Derruba o alvo.', 'Taijutsu', 'Taijutsu', 2, 'Estudante da Academia', 150, 0, 25, 90, 0, 0, true, NULL, NULL, 0),
-- Genin
('Combo Leão (Shishi Rendan)', 'Combo aéreo fulminante. (Tier 1)', 'Taijutsu', 'Taijutsu', 5, 'Genin', 500, 10, 40, 85, 0, 1, true, NULL, NULL, 5),
('Furacão da Folha', 'Chute giratório forte. (Tier 2)', 'Taijutsu', 'Taijutsu', 10, 'Genin', 800, 15, 60, 90, 0, 1, true, NULL, NULL, 15),
('Queda de Calcanhar', 'Esmaga o ombro do adversário caindo do céu. (Tier 3)', 'Taijutsu', 'Taijutsu', 15, 'Genin', 1200, 20, 80, 85, 0, 2, true, NULL, NULL, 25),
-- Chunin
('Gota da Folha', 'Ataque em queda livre fortíssimo. (Tier 1)', 'Taijutsu', 'Taijutsu', 20, 'Chunin', 2500, 30, 110, 90, 0, 2, true, NULL, NULL, 35),
('Redemoinho da Folha', 'Chutes múltiplos giratórios. (Tier 2)', 'Taijutsu', 'Taijutsu', 25, 'Chunin', 3000, 35, 140, 85, 0, 2, true, NULL, NULL, 45),
('Primeiro Portão: Portão da Abertura', 'Abre os músculos liberando limite mental. (Tier 3)', 'Taijutsu', 'Taijutsu', 30, 'Chunin', 4000, 40, 180, 100, 0, 3, true, NULL, NULL, 60),
-- Jonin
('Lótus Primária (Omote Renge)', 'Agarra o alvo no céu e choca no chão. (Tier 1)', 'Taijutsu', 'Taijutsu', 35, 'Jonin', 6500, 60, 250, 95, 0, 3, true, NULL, NULL, 75),
('Pavão da Manhã (Asakujaku)', 'Socos rápidos que criam fogo na fricção. (Tier 2)', 'Taijutsu', 'Taijutsu', 45, 'Jonin', 9000, 90, 350, 90, 0, 4, true, NULL, NULL, 110);


-- ==========================================
-- SESSÃO 3: ELEMENTAIS (Com req ninjutsu médio)
-- ==========================================
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan, req_attr_value) VALUES
-- KATON
('Katon: Bola de Fogo', 'Cospe uma grande bola de fogo. (Genin Tier 1)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Katon', NULL, 10),
('Katon: Flor da Fênix', 'Múltiplas bolas de fogo teleguiadas. (Genin Tier 2)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1500, 40, 85, 95, 20, 2, true, 'Katon', NULL, 20),
('Katon: Dragão de Fogo', 'Um dragão de chamas. (Chunin Tier 1)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 75, 150, 85, 30, 2, true, 'Katon', NULL, 40),
('Katon: Grande Aniquilação do Fogo', 'Paredão de fogo monstruoso. (Jonin Tier 1)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 8000, 140, 300, 90, 45, 3, true, 'Katon', NULL, 90),

-- SUITON
('Suiton: Projétil de Água', 'Dispara uma bala de água. (Genin Tier 1)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 95, 15, 1, true, 'Suiton', NULL, 10),
('Suiton: Muro de Água', 'Barreira defensiva e repulsiva. (Genin Tier 2)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1500, 40, 80, 100, 20, 2, true, 'Suiton', NULL, 20),
('Suiton: Dragão de Água', 'Mordida esmagadora. (Chunin Tier 1)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 75, 150, 85, 30, 2, true, 'Suiton', NULL, 40),
('Suiton: Colisão de Ondas', 'Maremoto que engole o campo. (Jonin Tier 1)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 8000, 140, 300, 95, 45, 3, true, 'Suiton', NULL, 90),

-- DOTON
('Doton: Projétil de Lama', 'Atira pedras de lama pesadas. (Genin Tier 1)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 65, 85, 15, 1, true, 'Doton', NULL, 10),
('Doton: Prisão de Pedra', 'Esmeaga o alvo. (Genin Tier 2)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1500, 40, 90, 90, 20, 2, true, 'Doton', NULL, 20),
('Doton: Pântano do Submundo', 'Afoga o inimigo na terra. (Chunin Tier 1)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 75, 160, 80, 30, 2, true, 'Doton', NULL, 40),
('Doton: Parede Terrestre', 'Um muro indestrutível que cai sobre o alvo. (Jonin Tier 1)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 8000, 140, 310, 85, 45, 3, true, 'Doton', NULL, 90),

-- RAITON
('Raiton: Raio Rastejante', 'Paralisa o inimigo. (Genin Tier 1)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 55, 100, 15, 1, true, 'Raiton', NULL, 10),
('Raiton: Flecha Trovão', 'Atira um feixe elétrico rápido. (Genin Tier 2)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1500, 40, 85, 95, 20, 2, true, 'Raiton', NULL, 20),
('Raiton: Fera Elétrica', 'Lobo de raio guiado. (Chunin Tier 1)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 75, 155, 90, 30, 2, true, 'Raiton', NULL, 40),
('Raiton: Pantera Negra', 'Trovão obscuro mortal. (Jonin Tier 1)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 8000, 140, 320, 95, 45, 3, true, 'Raiton', NULL, 90),

-- FUTON
('Futon: Palma Vendaval', 'Empurra e corta o inimigo. (Genin Tier 1)', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Futon', NULL, 10),
('Futon: Foice de Vento', 'Lâmina invisível voadora. (Genin Tier 2)', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 1500, 40, 80, 95, 20, 2, true, 'Futon', NULL, 20),
('Futon: Esfera de Vácuo', 'Balas de vento perfurantes. (Chunin Tier 1)', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 75, 150, 90, 30, 2, true, 'Futon', NULL, 40),
('Futon: Grande Foice', 'Cortador de florestas inteiras. (Jonin Tier 1)', 'Ninjutsu', 'Ninjutsu', 40, 'Jonin', 8000, 140, 290, 100, 45, 3, true, 'Futon', NULL, 90);


-- ==========================================
-- SESSÃO 4: CLÃS (CUSTO ABSURDO, DANO ABSURDO)
-- Sem req de Atributo, apenas o fato de Ser do Clã
-- ==========================================
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan) VALUES
-- UCHIHA
('Estilo Uchiha: Halo Dance', 'Combinação de Taijutsu e Katon furioso.', 'Taijutsu', 'Taijutsu', 15, 'Genin', 3000, 80, 180, 95, 0, 2, true, 'Katon', 'Uchiha'),
('Chidori (Uchiha)', 'Raio puríssimo para assassinato rápido.', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 6000, 180, 400, 100, 20, 3, true, 'Raiton', 'Uchiha'),
('Amaterasu', 'Chamas negras inesgotáveis.', 'Ninjutsu', 'Genjutsu', 50, 'Sannin Lendário', 20000, 600, 1500, 100, 0, 5, true, 'Katon', 'Uchiha'),

-- HYUGA
('Punho Gentil: Agulha de Chakra', 'Dano crítico em pontos vitais.', 'Taijutsu', 'Taijutsu', 15, 'Genin', 3000, 50, 160, 100, 0, 2, true, NULL, 'Hyūga'),
('Oito Trigramas: 64 Golpes', 'Ataque brutal no sistema de chakra.', 'Taijutsu', 'Taijutsu', 25, 'Chunin', 6000, 120, 350, 100, 0, 3, true, NULL, 'Hyūga'),
('Oito Trigramas: Leões Gêmeos', 'Punhos massivos de puro chakra sugador.', 'Taijutsu', 'Taijutsu', 50, 'Sannin Lendário', 20000, 400, 1200, 100, 0, 5, true, NULL, 'Hyūga'),

-- UZUMAKI
('Cadeias Adamantinas Básicas', 'Correntes para prender o alvo.', 'Ninjutsu', 'Fuinjutsu', 15, 'Genin', 3000, 90, 170, 95, 20, 2, true, NULL, 'Uzumaki'),
('Fuinjutsu: Selo de 4 Símbolos', 'Esmeaga a barriga do alvo com selos.', 'Ninjutsu', 'Fuinjutsu', 25, 'Chunin', 6000, 160, 380, 100, 40, 3, true, NULL, 'Uzumaki'),
('Cadeias de Selamento de Bijuu', 'Drena o poder absoluto do alvo.', 'Ninjutsu', 'Fuinjutsu', 50, 'Sannin Lendário', 20000, 650, 1600, 90, 60, 5, true, NULL, 'Uzumaki'),

-- SENJU
('Mokuton: Estaca de Madeira', 'Empala o inimigo com madeira afiada.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 3000, 80, 175, 90, 15, 2, true, 'Doton', 'Senju'),
('Mokuton: Prisão de Quatro Pilares', 'Esmaga dentro de uma cabana indestrutível.', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 6000, 170, 420, 95, 30, 3, true, 'Doton', 'Senju'),
('Mokuton: Nascimento do Mundo de Árvores', 'Floresta massiva.', 'Ninjutsu', 'Ninjutsu', 50, 'Sannin Lendário', 20000, 700, 1800, 95, 50, 5, true, 'Doton', 'Senju'),

-- NARA
('Kagemane: Aperto Sombrio', 'Sombra constritora simples.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 3000, 70, 160, 100, 10, 2, true, NULL, 'Nara'),
('Kage Nui (Costura das Sombras)', 'Lâminas escuras perfurantes.', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 6000, 150, 360, 95, 20, 3, true, NULL, 'Nara'),
('Sombra Gigante', 'Aperto massivo impossível de escapar.', 'Ninjutsu', 'Ninjutsu', 50, 'Sannin Lendário', 20000, 500, 1400, 100, 30, 5, true, NULL, 'Nara');

NOTIFY pgrst, 'reload schema';
