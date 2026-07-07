-- migrations/015_inserir_missoes.sql

-- Resolve a falta de auto-incremento (SERIAL) na tabela missions
CREATE SEQUENCE IF NOT EXISTS public.missions_id_seq;
ALTER TABLE public.missions ALTER COLUMN id SET DEFAULT nextval('public.missions_id_seq');
SELECT setval('public.missions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM public.missions));

-- RANK D (Genin - Mais 10 missões, totalizando 15 missões Rank D no BD)
INSERT INTO public.missions (title, description, req_level, xp, ryous, time_seconds, mission_type, is_active) VALUES 
('Recuperar Gato do Daimyo', 'Tora atacou novamente e sumiu. Encontre o gato antes que o lorde se irrite.', 6, 2500, 450, 300, 'D', true),
('Ajudar na Construção Civil', 'Levantar materiais pesados usando chakra para acelerar a ponte.', 7, 2600, 480, 400, 'D', true),
('Coletar Ervas Medicinais', 'Buscar ervas na floresta para o hospital da vila.', 8, 2800, 500, 600, 'D', true),
('Passear com os Cães Inuzuka', 'Ajudar o clã Inuzuka a treinar e passear com filhotes rebeldes.', 9, 3000, 520, 600, 'D', true),
('Limpar o Rio', 'Tirar o lixo e escombros que estão bloqueando o fluxo de água.', 10, 3200, 550, 750, 'D', true),
('Vigia Noturna Básica', 'Ficar de vigia nos portões da vila durante a madrugada.', 11, 3500, 600, 900, 'D', true),
('Investigar Cultivo Arruinado', 'Fazendeiros reclamam de animais roendo raízes. Verifique.', 12, 3800, 650, 900, 'D', true),
('Reparar Treinamento de Alvos', 'Consertar todos os manequins de madeira quebrados pelos Chunins.', 13, 4000, 700, 900, 'D', true),
('Entregar Mensagem Urgente', 'Correr até o posto avançado e entregar o pergaminho.', 14, 4200, 750, 1000, 'D', true),
('Caçar Javali Selvagem', 'Um javali agressivo está assustando lenhadores. Abata-o.', 14, 4500, 800, 1200, 'D', true);

-- RANK C (Genin/Chunin - Mais 15 missões, totalizando 20 missões Rank C)
INSERT INTO public.missions (title, description, req_level, xp, ryous, time_seconds, mission_type, is_active) VALUES 
('Guarda-costas de Genin novato', 'Escoltar genins novatos num exame florestal.', 16, 4800, 1250, 1800, 'C', true),
('Desarmar Armadilhas Inimigas', 'Explorar a fronteira e desarmar fios de aço plantados.', 17, 5000, 1300, 1800, 'C', true),
('Capturar Criminoso Menor', 'Um ladrão de lojas fugiu para a floresta. Traga-o vivo.', 18, 5200, 1400, 2000, 'C', true),
('Escoltar Comboio de Armas', 'Ferreiros precisam de escolta para entregar as espadas.', 19, 5400, 1500, 2400, 'C', true),
('Investigar Caverna Suspeita', 'Moradores ouviram ruídos em uma caverna fechada.', 20, 5600, 1600, 2400, 'C', true),
('Patrulhar a Floresta da Morte', 'Verificar se as cercas de contenção de bestas estão intactas.', 21, 5800, 1700, 2700, 'C', true),
('Resgatar Refém Civil', 'Bandidos comuns sequestraram o filho do banqueiro.', 22, 6000, 1800, 3000, 'C', true),
('Derrotar Grupo de Mercenários', 'Mercenários sem vila acamparam nas fronteiras.', 23, 6200, 1900, 3200, 'C', true),
('Defender Vilarejo Vizinho', 'Bandoleiros estão tentando saquear um vilarejo que nos paga tributo.', 24, 6500, 2000, 3600, 'C', true),
('Recuperar Artefato Oculto', 'Buscar um vaso de chakra roubado do museu.', 24, 6800, 2100, 3600, 'C', true);

-- RANK B (Chunin/Jonin - Mais 15 missões, totalizando 20 missões Rank B)
INSERT INTO public.missions (title, description, req_level, xp, ryous, time_seconds, mission_type, is_active) VALUES 
('Interceptar Mensageiro Inimigo', 'Abater o pombo de chakra ou mensageiro antes de cruzar a borda.', 26, 9000, 4200, 7200, 'B', true),
('Proteger Investigador', 'Um investigador descobriu um selo amaldiçoado. Proteja-o.', 27, 9500, 4400, 7200, 'B', true),
('Sabotar Estoque de Comida', 'Atrasar o exército inimigo destruindo seus mantimentos.', 28, 10000, 4600, 9000, 'B', true),
('Capturar Ninja Patife', 'Um ex-chunin nosso traiu a vila. Capture e traga para interrogatório.', 29, 10500, 4800, 9000, 'B', true),
('Escoltar Daimyo Secundário', 'Guarda-costas VIP num trajeto montanhoso perigoso.', 30, 11000, 5000, 10800, 'B', true),
('Investigar Laboratório Clandestino', 'Rumores de experimentos em corpos. Destrua as evidências.', 31, 11500, 5200, 10800, 'B', true),
('Destruir Base de Bandidos Ninja', 'Eles dominam ninjutsu elementar básico. Extermine a liderança.', 32, 12000, 5500, 12000, 'B', true),
('Mapear Território Oculto', 'Atravessar um vale tóxico desenhando a rota segura.', 33, 12500, 5800, 12000, 'B', true),
('Roubo de Documentos', 'Infiltrar o palácio inimigo e roubar alianças militares.', 34, 13000, 6000, 14400, 'B', true),
('Lidar com Mutação', 'Uma fera foi alterada geneticamente. Neutralize.', 34, 13500, 6500, 14400, 'B', true);

-- RANK A (Jonin/ANBU - Mais 15 missões, totalizando 19 missões Rank A)
INSERT INTO public.missions (title, description, req_level, xp, ryous, time_seconds, mission_type, is_active) VALUES 
('Assassinato de Elite', 'Matar o líder do esquadrão tático adversário.', 36, 17000, 8500, 28800, 'A', true),
('Interceptar Carga de Armas', 'Tomar o comboio de tarjas explosivas do país vizinho.', 37, 18000, 9000, 28800, 'A', true),
('Extração de Refém Militar', 'Invadir prisão de segurança máxima e tirar nosso ANBU.', 38, 19000, 9500, 32000, 'A', true),
('Duelo Contra Nukenin Rank B+', 'Ele está destruindo vilarejos usando Kinjutsu.', 39, 20000, 10000, 32000, 'A', true),
('Invasão Silenciosa', 'Colocar selos explosivos nas fundações da muralha inimiga.', 40, 21000, 10500, 36000, 'A', true),
('Detenção de Invocação Falha', 'Um Sannin conjurou algo que fugiu do controle.', 41, 22000, 11000, 36000, 'A', true),
('Combate Contra Esquadrão', 'Resistir a um pelotão inteiro enquanto reforços chegam.', 42, 23000, 11500, 40000, 'A', true),
('Recuperar Pergaminho Proibido', 'Foi roubado do nosso arquivo principal na última noite.', 43, 24000, 12000, 40000, 'A', true),
('Caçada às Cegas', 'Rastrear um mestre de Genjutsu que matou diplomatas.', 44, 25000, 13000, 43200, 'A', true),
('Aniquilação Frontal', 'Dizimar o forte fronteiriço sem deixar sobreviventes.', 44, 26000, 14000, 43200, 'A', true);

NOTIFY pgrst, 'reload schema';
