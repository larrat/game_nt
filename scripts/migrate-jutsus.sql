-- 1. ADICIONANDO AS NOVAS COLUNAS (SE NÃO EXISTIREM)
ALTER TABLE public.jutsus ADD COLUMN IF NOT EXISTS req_attr_value INTEGER DEFAULT 0;
ALTER TABLE public.jutsus ADD COLUMN IF NOT EXISTS req_seals INTEGER DEFAULT 0;
ALTER TABLE public.jutsus ADD COLUMN IF NOT EXISTS cooldown INTEGER DEFAULT 0;

-- 2. LIMPANDO OS JUTSUS ANTIGOS (Preservando IDs caso existam amarras, ou apenas deletando tudo exceto algum fixo)
DELETE FROM public.jutsus;

-- 3. INSERINDO OS 24 JUTSUS OFICIAIS DO LOTE 4

INSERT INTO public.jutsus 
(name, description, req_rank, req_level, category, type, damage, chakra_cost, cost_ryous, accuracy, req_attr_value, req_seals, cooldown, is_active)
VALUES

-- RANK 1: Estudante da Academia
('Arte Ninja: Passos Leves', 'Aumenta a velocidade e agilidade básica do usuário. (Foco em Buff)', 'Estudante da Academia', 1, 'Ninjutsu', 'Suporte', 15, 10, 50, 100, 5, 5, 0, true),
('Clone de Ilusão', 'Cria uma ilusão frágil para distrair o inimigo. (Foco em Debuff)', 'Estudante da Academia', 1, 'Genjutsu', 'Ilusão', 15, 10, 50, 100, 5, 5, 0, true),
('Aquecimento Físico', 'Prepara os músculos para combate intenso. (Foco em Buff)', 'Estudante da Academia', 1, 'Taijutsu', 'Corpo-a-Corpo', 15, 10, 50, 100, 5, 5, 0, true),
('Arremesso de Shuriken', 'Dispara shurikens básicas para perfurar a defesa. (Foco em Debuff)', 'Estudante da Academia', 1, 'Bukijutsu', 'Armas', 15, 10, 50, 100, 5, 5, 0, true),

-- RANK 2: Genin
('Clonagem das Sombras', 'Cria clones reais que dividem o dano recebido. (Foco em Buff)', 'Genin', 5, 'Ninjutsu', 'Ataque', 40, 25, 300, 100, 15, 15, 1, true),
('Ilusão Demoníaca: Falsa Visão', 'Confunde o alvo, reduzindo sua precisão. (Foco em Debuff)', 'Genin', 5, 'Genjutsu', 'Ilusão', 40, 25, 300, 100, 15, 15, 1, true),
('Furacão da Folha', 'Chute giratório devastador que joga o inimigo no ar. (Foco em Buff)', 'Genin', 5, 'Taijutsu', 'Corpo-a-Corpo', 40, 25, 300, 100, 15, 15, 1, true),
('Fios de Aço Cruzados', 'Prende o alvo temporariamente com fios de aço. (Foco em Debuff)', 'Genin', 5, 'Bukijutsu', 'Armas', 40, 25, 300, 100, 15, 15, 1, true),

-- RANK 3: Chunin
('Múltiplos Clones das Sombras', 'Evolução da técnica de clonagem, sobrecarregando o inimigo. (Foco em Buff)', 'Chunin', 15, 'Ninjutsu', 'Ataque', 90, 55, 1200, 100, 30, 30, 2, true),
('Estilo Ilusão: Queda Infinita', 'Faz o alvo acreditar que está caindo no vazio, quebrando sua guarda. (Foco em Debuff)', 'Chunin', 15, 'Genjutsu', 'Ilusão', 90, 55, 1200, 100, 30, 30, 2, true),
('Rajada de Leões', 'Combo aéreo fulminante focado em quebrar a resistência inimiga. (Foco em Buff)', 'Chunin', 15, 'Taijutsu', 'Corpo-a-Corpo', 90, 55, 1200, 100, 30, 30, 2, true),
('Invocação de Armas: Moinho', 'Dispara uma Fūma Shuriken gigante cortando armaduras. (Foco em Debuff)', 'Chunin', 15, 'Bukijutsu', 'Armas', 90, 55, 1200, 100, 30, 30, 2, true),

-- RANK 4: Jounin
('Rasengan', 'Esfera espiral de puro chakra que moí o inimigo com impacto extremo. (Foco em Buff)', 'Jounin', 25, 'Ninjutsu', 'Ataque', 180, 95, 4500, 100, 60, 60, 3, true),
('Visão do Purgatório', 'Tortura mental intensa que sela os movimentos do alvo. (Foco em Debuff)', 'Jounin', 25, 'Genjutsu', 'Ilusão', 180, 95, 4500, 100, 60, 60, 3, true),
('Lótus Primária', 'Agarra o alvo no ar e despenca de cabeça no chão. Requer limite do corpo. (Foco em Buff)', 'Jounin', 25, 'Taijutsu', 'Corpo-a-Corpo', 180, 95, 4500, 100, 60, 60, 3, true),
('Dança das Kunais Explosivas', 'Chuva de explosivos que anula a defesa e causa dano residual. (Foco em Debuff)', 'Jounin', 25, 'Bukijutsu', 'Armas', 180, 95, 4500, 100, 60, 60, 3, true),

-- RANK 5: ANBU
('Rasengan Gigante', 'Versão avassaladora do Rasengan, engolindo alvos grandes. (Foco em Buff)', 'ANBU', 35, 'Ninjutsu', 'Ataque', 350, 160, 10000, 100, 100, 100, 4, true),
('Prisão de Paralisia Tática', 'Genjutsu de alto nível usado pelas forças especiais para interrogatório. (Foco em Debuff)', 'ANBU', 35, 'Genjutsu', 'Ilusão', 350, 160, 10000, 100, 100, 100, 4, true),
('Lótus Oculta', 'Velocidade além da percepção visual desferindo golpes fatais. (Foco em Buff)', 'ANBU', 35, 'Taijutsu', 'Corpo-a-Corpo', 350, 160, 10000, 100, 100, 100, 4, true),
('Tempestade de Pergaminhos', 'Desencela milhares de armas simultaneamente destruindo a área. (Foco em Debuff)', 'ANBU', 35, 'Bukijutsu', 'Armas', 350, 160, 10000, 100, 100, 100, 4, true),

-- RANK 6: Kage
('Arte Sábia: Super Rasengan', 'O auge do chakra condensado, capaz de pulverizar montanhas. (Foco em Buff)', 'Kage', 45, 'Ninjutsu', 'Ataque', 600, 300, 25000, 100, 150, 150, 5, true),
('Tsukuyomi (Adaptação Livre)', 'Dimensão de tortura mental controlada pelo usuário, quebra espiritual completa. (Foco em Debuff)', 'Kage', 45, 'Genjutsu', 'Ilusão', 600, 300, 25000, 100, 150, 150, 5, true),
('Oitavo Portão: Elefante do Anoitecer', 'Golpes que distorcem o próprio ar. Exige sacrifício físico extremo. (Foco em Buff)', 'Kage', 45, 'Taijutsu', 'Corpo-a-Corpo', 600, 300, 25000, 100, 150, 150, 5, true),
('Arsenal Infinito: Marionete Mestra', 'Invocação e controle de cem armamentos pesados selando totalmente o inimigo. (Foco em Debuff)', 'Kage', 45, 'Bukijutsu', 'Armas', 600, 300, 25000, 100, 150, 150, 5, true);
