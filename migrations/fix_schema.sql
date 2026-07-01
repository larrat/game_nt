-- 1. Colunas Faltantes em Players
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS hp integer,
ADD COLUMN IF NOT EXISTS chakra integer;

-- 2. Coluna Faltante em Eventos Globais
ALTER TABLE public.global_events
ADD COLUMN IF NOT EXISTS is_world_boss boolean DEFAULT false;

-- 3. Criar tabela de Dano no Boss Mundial
CREATE TABLE IF NOT EXISTS public.world_boss_damage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id integer REFERENCES public.players(id) ON DELETE CASCADE,
  event_id integer REFERENCES public.global_events(id) ON DELETE CASCADE,
  total_damage bigint DEFAULT 0,
  is_last_hit boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(player_id, event_id)
);

-- 4. Adicionar Foreign Keys que estavam faltando
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_vila_atual_id_fkey;
ALTER TABLE public.players ADD CONSTRAINT players_vila_atual_id_fkey FOREIGN KEY (vila_atual_id) REFERENCES public.villages(id) ON DELETE SET NULL;

ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_active_task_id_fkey;
ALTER TABLE public.players ADD CONSTRAINT players_active_task_id_fkey FOREIGN KEY (active_task_id) REFERENCES public.tasks(id) ON DELETE SET NULL;

-- 5. Atualizar Chaves Estrangeiras para ON DELETE CASCADE (Prevenção de Lixo)

-- player_jutsus
ALTER TABLE public.player_jutsus DROP CONSTRAINT IF EXISTS player_jutsus_player_id_fkey;
ALTER TABLE public.player_jutsus ADD CONSTRAINT player_jutsus_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- player_inventory
ALTER TABLE public.player_inventory DROP CONSTRAINT IF EXISTS player_inventory_player_id_fkey;
ALTER TABLE public.player_inventory ADD CONSTRAINT player_inventory_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- player_defeated_npcs
ALTER TABLE public.player_defeated_npcs DROP CONSTRAINT IF EXISTS player_defeated_npcs_player_id_fkey;
ALTER TABLE public.player_defeated_npcs ADD CONSTRAINT player_defeated_npcs_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- village_donors
ALTER TABLE public.village_donors DROP CONSTRAINT IF EXISTS village_donors_player_id_fkey;
ALTER TABLE public.village_donors ADD CONSTRAINT village_donors_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- player_consumables
ALTER TABLE public.player_consumables DROP CONSTRAINT IF EXISTS player_consumables_player_id_fkey;
ALTER TABLE public.player_consumables ADD CONSTRAINT player_consumables_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;

-- Atualizar Cache
NOTIFY pgrst, 'reload schema';
