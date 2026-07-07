-- migrations/012_inserir_jutsus_completos.sql

-- 1. Adicionar coluna req_clan se não existir
ALTER TABLE public.jutsus ADD COLUMN IF NOT EXISTS req_clan TEXT;

-- 2. Limpar os jutsus atuais para recriar o catálogo completo (Opcional, mas recomendado para evitar duplicatas em testes)
-- TRUNCATE TABLE public.jutsus RESTART IDENTITY CASCADE;

-- 3. Inserir Jutsus Básicos (Estudante e Genin)
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan) VALUES
('Técnica de Substituição (Kawarimi)', 'Substitui seu corpo por um tronco para evitar dano.', 'Ninjutsu', 'Ninjutsu', 1, 'Estudante da Academia', 100, 10, 0, 100, 5, 2, true, NULL, NULL),
('Técnica de Clonagem (Bunshin)', 'Cria ilusões de si mesmo para confundir o inimigo.', 'Ninjutsu', 'Ninjutsu', 2, 'Estudante da Academia', 150, 15, 10, 95, 5, 0, true, NULL, NULL),
('Taijutsu Básico', 'Uma sequência de socos e chutes diretos.', 'Taijutsu', 'Taijutsu', 3, 'Estudante da Academia', 200, 0, 20, 90, 0, 0, true, NULL, NULL),
('Combo Leão (Shishi Rendan)', 'Um combo aéreo fulminante com chutes pesados.', 'Taijutsu', 'Taijutsu', 8, 'Genin', 800, 5, 50, 85, 0, 1, true, NULL, NULL);


-- 4. Inserir Jutsus Elementais
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan) VALUES
-- KATON
('Katon: Bola de Fogo', 'Cospe uma grande bola de fogo no oponente.', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Katon', NULL),
('Katon: Dragão de Fogo', 'Um dragão de chamas escaldantes que queima o campo todo.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 80, 120, 85, 30, 2, true, 'Katon', NULL),
-- SUITON
('Suiton: Projétil de Água', 'Dispara água em alta velocidade como uma bala.', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Suiton', NULL),
('Suiton: Dragão de Água', 'Um gigantesco dragão de água morde e arrasta o alvo.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 80, 120, 85, 30, 2, true, 'Suiton', NULL),
-- DOTON
('Doton: Projétil de Lama', 'Atira lama endurecida como pedras pesadas.', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Doton', NULL),
('Doton: Prisão de Pedra', 'Esmeaga o alvo prendendo-o em blocos de terra.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 80, 120, 85, 30, 2, true, 'Doton', NULL),
-- RAITON
('Raiton: Raio Rastejante', 'Um raio viaja pelo chão e paralisa o inimigo.', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 35, 65, 95, 15, 1, true, 'Raiton', NULL),
('Raiton: Fera Elétrica', 'Cria um lobo de raio guiado que morde o alvo.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 85, 130, 90, 30, 2, true, 'Raiton', NULL),
-- FUTON
('Futon: Palma Vendaval', 'Um golpe de vento que empurra e corta o inimigo.', 'Ninjutsu', 'Ninjutsu', 10, 'Genin', 1000, 30, 60, 90, 15, 1, true, 'Futon', NULL),
('Futon: Esfera de Vácuo', 'Balas de vento perfurantes que ignoram escudos.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 2500, 80, 120, 85, 30, 2, true, 'Futon', NULL);


-- 5. Inserir Jutsus Secretos / Exclusivos de Clã
INSERT INTO public.jutsus (name, description, type, category, req_level, req_rank, cost_ryous, chakra_cost, damage, accuracy, req_seals, cooldown, is_active, element, req_clan) VALUES
-- UCHIHA
('Chidori', 'Concentra raio puro na mão para um ataque perfurante.', 'Ninjutsu', 'Ninjutsu', 15, 'Chunin', 3000, 60, 150, 100, 20, 2, true, 'Raiton', 'Uchiha'),
('Amaterasu', 'Chamas negras que queimam tudo que o olho foca.', 'Ninjutsu', 'Genjutsu', 40, 'Sannin', 10000, 200, 400, 100, 0, 4, true, 'Katon', 'Uchiha'),

-- HYUGA
('Oito Trigramas: 64 Golpes', 'Bloqueia múltiplos Tenketsus do inimigo instantaneamente.', 'Taijutsu', 'Taijutsu', 20, 'Chunin', 3500, 40, 140, 100, 0, 3, true, NULL, 'Hyūga'),
('Kaiten (Rotação)', 'Uma defesa absoluta que repela ataques girando chakra.', 'Taijutsu', 'Taijutsu', 30, 'Jounin', 5000, 80, 80, 100, 0, 2, true, NULL, 'Hyūga'),

-- UZUMAKI
('Correntes de Selamento Diamantina', 'Prende Bijuus e oponentes drenando o chakra.', 'Ninjutsu', 'Fuinjutsu', 35, 'Jounin', 6000, 100, 200, 90, 40, 4, true, NULL, 'Uzumaki'),

-- SENJU
('Mokuton: Nascimento das Árvores', 'Cria uma floresta brutal para esmagar e prender o inimigo.', 'Ninjutsu', 'Ninjutsu', 40, 'Jounin', 8000, 150, 250, 95, 60, 3, true, 'Doton', 'Senju'),

-- NARA
('Kagemane no Jutsu', 'Prende a sombra do inimigo, obrigando-o a imitar os movimentos.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 2000, 40, 50, 100, 10, 2, true, NULL, 'Nara'),
('Costura das Sombras', 'A sombra perfura o inimigo fisicamente.', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 4000, 80, 150, 90, 20, 2, true, NULL, 'Nara'),

-- YAMANAKA
('Shintenshin no Jutsu', 'Transfere a própria consciência para o corpo do alvo.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 2000, 50, 30, 95, 10, 3, true, NULL, 'Yamanaka'),

-- AKIMICHI
('Baika no Jutsu (Expansão)', 'Aumenta o próprio tamanho para causar dano estrondoso.', 'Taijutsu', 'Taijutsu', 15, 'Genin', 2000, 40, 100, 85, 0, 2, true, NULL, 'Akimichi'),
('Tanque da Bala Humana', 'Gira como um rolo compressor para esmagar tudo.', 'Taijutsu', 'Taijutsu', 25, 'Chunin', 4000, 70, 160, 85, 0, 2, true, NULL, 'Akimichi'),

-- ABURAME
('Mushi Jamingu no Jutsu', 'Insetos devoram o chakra e confundem o alvo.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 2000, 30, 70, 100, 15, 2, true, NULL, 'Aburame'),

-- INUZUKA
('Gatsūga (Presa Sobre Presa)', 'Gira violentamente em conjunto com o Ninken.', 'Taijutsu', 'Taijutsu', 15, 'Genin', 2000, 30, 110, 80, 0, 1, true, NULL, 'Inuzuka'),

-- SARUTOBI
('Lançamento de Shuriken das Sombras', 'Clona uma shuriken em milhares no ar.', 'Ninjutsu', 'Ninjutsu', 25, 'Chunin', 3500, 60, 130, 90, 25, 2, true, NULL, 'Sarutobi'),

-- HATAKE
('Raikiri (Corte Relâmpago)', 'Um golpe perfurante de raio letal e concentrado.', 'Ninjutsu', 'Ninjutsu', 35, 'Jounin', 7000, 120, 300, 100, 30, 3, true, 'Raiton', 'Hatake'),

-- KAGUYA
('Dança dos Salgueiros', 'Usa os próprios ossos como lâminas.', 'Taijutsu', 'Taijutsu', 25, 'Chunin', 3000, 20, 140, 95, 0, 1, true, NULL, 'Kaguya'),
('Dança da Samambaia', 'Uma floresta de ossos surge no solo matando o inimigo.', 'Taijutsu', 'Taijutsu', 45, 'Sannin', 9000, 150, 350, 90, 0, 4, true, NULL, 'Kaguya'),

-- YUKI
('Agulhas de Gelo Voadoras', 'Múltiplos espinhos de gelo congelam o inimigo.', 'Ninjutsu', 'Ninjutsu', 15, 'Genin', 2500, 40, 90, 95, 20, 1, true, 'Suiton', 'Yuki'),
('Espelhos Demoníacos', 'Encurrala o inimigo em espelhos refletivos atacando implacavelmente.', 'Ninjutsu', 'Ninjutsu', 30, 'Jounin', 6000, 100, 220, 100, 40, 3, true, 'Suiton', 'Yuki'),

-- HOZUKI
('Mizu Teppō (Pistola de Água)', 'Dispara um jato de água pressurizado que fura como bala.', 'Ninjutsu', 'Ninjutsu', 20, 'Chunin', 3500, 50, 140, 95, 10, 2, true, 'Suiton', 'Hōzuki'),

-- JUGO
('Golpe do Pistão', 'Transforma o braço para impulsionar um soco esmagador.', 'Taijutsu', 'Taijutsu', 20, 'Chunin', 3000, 30, 150, 85, 0, 2, true, NULL, 'Jūgo');
