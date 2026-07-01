-- Limpar as tarefas antigas
TRUNCATE TABLE public.tasks RESTART IDENTITY CASCADE;

-- Inserir as 10 tarefas da Academia (Segundos Rápidos)
INSERT INTO public.tasks (title, description, req_level, xp_reward, ryou_reward, duration_s, is_active) VALUES 
-- Nível 1 (Leva para o Nível 2)
('Limpar o Pátio da Academia', 'Ajude a varrer as folhas que caíram no pátio antes das aulas começarem.', 1, 870, 50, 2, true),
('Organizar Shurikens', 'Organize as caixas de ferramentas ninjas na sala de armazenamento.', 1, 871, 50, 3, true),

-- Nível 2 (Leva para o Nível 3)
('Entregar Recados aos Professores', 'Corra pelos corredores e entregue as notas de aula aos senseis.', 2, 935, 75, 4, true),
('Ajudar na Biblioteca', 'Recolha os pergaminhos devolvidos e coloque-os nas prateleiras corretas.', 2, 936, 75, 4, true),

-- Nível 3 (Leva para o Nível 4)
('Limpar o Monumento', 'Limpar as estátuas e monumentos da vila de pichações.', 3, 1225, 100, 5, true),
('Recuperar Gato Perdido', 'Encontrar Tora, a gata fujona, dentro dos limites da vila.', 3, 1225, 100, 5, true),

-- Nível 4 (Leva para o Nível 5)
('Auxiliar na Cozinha Escolar', 'Ajudar os cozinheiros a preparar o lanche dos estudantes.', 4, 1500, 150, 6, true),
('Arrumar o Campo de Treino', 'Recolher kunais e alvos quebrados do campo número 3.', 4, 1500, 150, 6, true),

-- Nível 5 (Bônus pós-nível 5)
('Estudar Selos Básicos', 'Passar um tempo memorizando os selos de mão ensinados hoje.', 5, 1500, 200, 8, true),
('Correr em Volta da Vila', 'Exercício de aquecimento obrigatório para o condicionamento físico.', 5, 1500, 200, 8, true);

-- Forçar o Supabase a reconhecer as mudanças
NOTIFY pgrst, 'reload schema';
