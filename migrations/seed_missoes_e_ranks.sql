-- 1. ADICIONAR COLUNAS NA TABELA RANKS SE NÃO EXISTIREM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_combat_points') THEN
        ALTER TABLE public.ranks ADD COLUMN req_combat_points double precision DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_jutsus_lvl2') THEN
        ALTER TABLE public.ranks ADD COLUMN req_jutsus_lvl2 integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_jutsus_lvl3') THEN
        ALTER TABLE public.ranks ADD COLUMN req_jutsus_lvl3 integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_bingo_book') THEN
        ALTER TABLE public.ranks ADD COLUMN req_bingo_book integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_gate_lvl') THEN
        ALTER TABLE public.ranks ADD COLUMN req_gate_lvl integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_clan_lvl') THEN
        ALTER TABLE public.ranks ADD COLUMN req_clan_lvl integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_karma_lvl') THEN
        ALTER TABLE public.ranks ADD COLUMN req_karma_lvl integer DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ranks' AND column_name='req_invocation_lvl') THEN
        ALTER TABLE public.ranks ADD COLUMN req_invocation_lvl integer DEFAULT 0;
    END IF;
END $$;

-- 2. RECRIAR OS RANKS (GRADUAÇÕES) COM A NOVA ESTRUTURA
TRUNCATE TABLE public.ranks RESTART IDENTITY CASCADE;

INSERT INTO public.ranks (
  id, name_id, title, icon_src, description, 
  req_level, req_tasks, req_jutsus, req_combat_points, 
  req_missions_d, req_missions_c, req_missions_b, req_missions_a, req_missions_s, 
  req_jutsus_lvl2, req_jutsus_lvl3, req_bingo_book, 
  req_gate_lvl, req_clan_lvl, req_karma_lvl, req_invocation_lvl
) VALUES
(1, 'estudante', 'Estudante da Academia', 'https://cdn-icons-png.flaticon.com/512/3602/3602120.png', 'Iniciante aprendendo o básico.', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(2, 'genin', 'Genin', 'https://cdn-icons-png.flaticon.com/512/3581/3581173.png', 'Ninja apto a realizar missões oficiais de baixo risco.', 5, 10, 1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(3, 'chunin', 'Chunin', 'https://cdn-icons-png.flaticon.com/512/1763/1763261.png', 'Ninja apto a liderar esquadrões.', 15, 0, 9, 75, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
(4, 'jonin', 'Jonin', 'https://cdn-icons-png.flaticon.com/512/8157/8157451.png', 'Elite da vila, domina múltiplos elementos e estilos.', 25, 0, 16, 175, 0, 10, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0),
(5, 'anbu', 'ANBU', 'https://cdn-icons-png.flaticon.com/512/3224/3224522.png', 'Forças especiais, agem nas sombras.', 35, 0, 22, 275, 0, 0, 15, 0, 0, 0, 5, 1, 0, 0, 0, 0),
(6, 'sannin', 'Sannin Lendário', 'https://cdn-icons-png.flaticon.com/512/10706/10706788.png', 'O pilar militar da vila.', 45, 0, 28, 650, 0, 0, 0, 15, 0, 0, 10, 2, 6, 4, 6, 4),
(7, 'heroi', 'Herói Mundial', 'https://cdn-icons-png.flaticon.com/512/4836/4836465.png', 'O pináculo do poder ninja. O mundo conhece o seu nome.', 55, 0, 34, 1000, 0, 0, 0, 0, 15, 0, 15, 3, 8, 5, 8, 5);


-- 3. RECRIAR MISSÕES E TAREFAS
TRUNCATE TABLE public.missions RESTART IDENTITY CASCADE;

INSERT INTO public.missions (id, title, description, req_level, xp, ryous, time_seconds, mission_type, is_active) VALUES 
-- TAREFAS ACADEMIA (Segundos Rápidos)
(1, 'Limpar o Pátio da Academia', 'Varrer folhas do pátio.', 1, 870, 50, 2, 'tarefa_academia', true),
(2, 'Organizar Shurikens', 'Organizar as caixas de ferramentas.', 1, 871, 50, 3, 'tarefa_academia', true),
(3, 'Entregar Recados', 'Entregar notas aos senseis.', 2, 935, 75, 4, 'tarefa_academia', true),
(4, 'Ajudar na Biblioteca', 'Recolher pergaminhos devolvidos.', 2, 936, 75, 4, 'tarefa_academia', true),
(5, 'Limpar o Monumento', 'Limpar as estátuas da vila.', 3, 1225, 100, 5, 'tarefa_academia', true),
(6, 'Recuperar Gato Perdido', 'Encontrar Tora, a gata fujona.', 3, 1225, 100, 5, 'tarefa_academia', true),
(7, 'Auxiliar na Cozinha', 'Preparar lanches escolares.', 4, 1500, 150, 6, 'tarefa_academia', true),
(8, 'Arrumar Campo de Treino', 'Recolher kunais nos alvos.', 4, 1500, 150, 6, 'tarefa_academia', true),
(9, 'Estudar Selos', 'Memorizar selos ensinados.', 5, 1500, 200, 8, 'tarefa_academia', true),
(10, 'Correr na Vila', 'Exercício de aquecimento.', 5, 1500, 200, 8, 'tarefa_academia', true),

-- RANK D (Genins - 5 a 15 Minutos) 
(11, 'Proteger Plantação Rural', 'Afugentar animais e proteger a colheita dos fazendeiros locais.', 5, 2500, 500, 300, 'D', true), -- 5 minutos
(12, 'Recuperar Item Valioso', 'Um morador perdeu sua herança no bosque da vila. Vá encontrar.', 5, 3000, 600, 600, 'D', true), -- 10 minutos
(13, 'Patrulha Periférica', 'Fazer ronda na fronteira leste da vila procurando invasores.', 5, 4500, 800, 900, 'D', true), -- 15 minutos
(14, 'Entregar Suprimentos', 'Caminhar até a vila vizinha entregando suprimentos básicos.', 10, 4800, 900, 900, 'D', true), -- 15 mins
(15, 'Cuidar de Animais Ninjas', 'Alimentar e limpar os canis/criadouros de animais ninjas.', 10, 2600, 550, 300, 'D', true), -- 5 mins

-- RANK C (Genins Experientes / Chunins - 30 a 60 Minutos)
(16, 'Escolta de Mercador', 'Escoltar um mercador famoso através da rota comercial da folha.', 15, 15000, 2500, 1800, 'C', true), -- 30 mins
(17, 'Caça aos Bandidos', 'Neutralizar uma gangue de saqueadores nas montanhas.', 15, 22000, 3200, 2700, 'C', true), -- 45 mins
(18, 'Capturar Urso Gigante', 'Um urso mutante está aterrorizando mineradores. Contenha-o.', 15, 30000, 4000, 3600, 'C', true), -- 1 hora
(19, 'Guarda-Costas Pessoal', 'Garantir a segurança de um lorde feudal durante sua viagem.', 20, 32000, 4500, 3600, 'C', true), -- 1 hora
(20, 'Investigar Ruínas', 'Procurar rastros recentes nas ruínas abandonadas do clã extinto.', 20, 16000, 2800, 1800, 'C', true), -- 30 mins

-- RANK B (Chunins / Jonins - 2 a 4 Horas)
(21, 'Infiltração em Acampamento', 'Espionar movimentações de ninjas renegados sem ser detectado.', 25, 100000, 12000, 7200, 'B', true), -- 2 horas
(22, 'Combate Frontal de Fronteira', 'Liderar esquadrão de defesa num confronto direto de fronteira.', 25, 150000, 18000, 10800, 'B', true), -- 3 horas
(23, 'Roubo de Pergaminho Secreto', 'Invadir o forte mercenário e recuperar informações roubadas.', 25, 200000, 25000, 14400, 'B', true), -- 4 horas
(24, 'Destruir Ponte de Suprimentos', 'Sabotar a logística inimiga cortando suas rotas vitais.', 30, 210000, 26000, 14400, 'B', true), -- 4 horas
(25, 'Caçar Nukenin C-Rank', 'Rastrear e derrotar um Nukenin perigoso que fugiu recentemente.', 30, 110000, 13000, 7200, 'B', true), -- 2 horas

-- RANK A (Jonins / Anbu - 8 a 12 Horas)
(26, 'Assassinato Político', 'Silenciar um lorde feudal inimigo que está financiando terroristas.', 35, 500000, 75000, 28800, 'A', true), -- 8 horas
(27, 'Resgate em Território Hostil', 'Salvar agentes espiões capturados no país vizinho.', 35, 750000, 100000, 43200, 'A', true), -- 12 horas
(28, 'Proteger Daimyo', 'Missão de altíssimo risco protegendo o Daimyo do País da Água.', 40, 760000, 110000, 43200, 'A', true), -- 12 horas
(29, 'Sabotagem Militar', 'Infiltrar-se e explodir a base oculta do exército inimigo.', 40, 520000, 80000, 28800, 'A', true), -- 8 horas

-- RANK S (Elite Sannin - 24 Horas)
(30, 'Guerra: Linha de Frente', 'Ser o general no campo de batalha decisivo, derrotando dezenas.', 45, 1500000, 300000, 86400, 'S', true), -- 24 horas
(31, 'Enfrentar Bijuu Selvagem', 'Conter a fúria de uma Besta com Cauda e selá-la novamente.', 45, 1650000, 350000, 86400, 'S', true), -- 24 horas
(32, 'Caçar Membro da Akatsuki', 'Localizar e destruir uma ameaça existencial para a vila.', 50, 1800000, 400000, 86400, 'S', true); -- 24 horas

NOTIFY pgrst, 'reload schema';
