-- migrations/013_rebalancear_economia.sql

-- Atualização das Recompensas das Tarefas da Academia
UPDATE public.missions SET xp = 800, ryous = 50 WHERE id = 1;
UPDATE public.missions SET xp = 900, ryous = 75 WHERE id = 2;
UPDATE public.missions SET xp = 1000, ryous = 100 WHERE id = 3;
UPDATE public.missions SET xp = 1100, ryous = 125 WHERE id = 4;
UPDATE public.missions SET xp = 1200, ryous = 150 WHERE id = 5;
UPDATE public.missions SET xp = 1300, ryous = 175 WHERE id = 6;
UPDATE public.missions SET xp = 1400, ryous = 200 WHERE id = 7;
UPDATE public.missions SET xp = 1500, ryous = 225 WHERE id = 8;
UPDATE public.missions SET xp = 1600, ryous = 250 WHERE id = 9;
UPDATE public.missions SET xp = 1800, ryous = 300 WHERE id = 10;

-- Atualização das Missões Rank D (5 - 15 mins)
UPDATE public.missions SET xp = 1500, ryous = 350 WHERE id = 11;
UPDATE public.missions SET xp = 1800, ryous = 400 WHERE id = 12;
UPDATE public.missions SET xp = 2100, ryous = 450 WHERE id = 13;
UPDATE public.missions SET xp = 2300, ryous = 500 WHERE id = 14;
UPDATE public.missions SET xp = 1600, ryous = 380 WHERE id = 15;

-- Atualização das Missões Rank C (30 - 60 mins)
UPDATE public.missions SET xp = 3000, ryous = 800 WHERE id = 16;
UPDATE public.missions SET xp = 3500, ryous = 900 WHERE id = 17;
UPDATE public.missions SET xp = 4000, ryous = 1000 WHERE id = 18;
UPDATE public.missions SET xp = 4500, ryous = 1200 WHERE id = 19;
UPDATE public.missions SET xp = 3200, ryous = 850 WHERE id = 20;

-- Atualização das Missões Rank B (2 - 4 Horas)
UPDATE public.missions SET xp = 6000, ryous = 2500 WHERE id = 21;
UPDATE public.missions SET xp = 7000, ryous = 3000 WHERE id = 22;
UPDATE public.missions SET xp = 8000, ryous = 3500 WHERE id = 23;
UPDATE public.missions SET xp = 8500, ryous = 4000 WHERE id = 24;
UPDATE public.missions SET xp = 6500, ryous = 2800 WHERE id = 25;

-- Atualização das Missões Rank A (8 - 12 Horas)
UPDATE public.missions SET xp = 12000, ryous = 6000 WHERE id = 26;
UPDATE public.missions SET xp = 14000, ryous = 7000 WHERE id = 27;
UPDATE public.missions SET xp = 16000, ryous = 8000 WHERE id = 28;
UPDATE public.missions SET xp = 13000, ryous = 6500 WHERE id = 29;

-- Atualização das Missões Rank S (24 Horas)
UPDATE public.missions SET xp = 25000, ryous = 15000 WHERE id = 30;
UPDATE public.missions SET xp = 30000, ryous = 18000 WHERE id = 31;
UPDATE public.missions SET xp = 35000, ryous = 20000 WHERE id = 32;

NOTIFY pgrst, 'reload schema';
