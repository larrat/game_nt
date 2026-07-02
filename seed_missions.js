import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const missions = [
  { title: 'Capturar Gato Fugitivo (D)', description: 'A Sra. Shijimi perdeu o seu amado gato Tora de novo. Traga-o de volta em segurança.', req_level: 1, xp: 30, ryous: 20, time_seconds: 60, is_active: true, mission_type: 'D' },
  { title: 'Limpar o Rio da Vila (D)', description: 'O rio que cruza a vila está acumulando lixo. Ajude a limpá-lo.', req_level: 1, xp: 20, ryous: 15, time_seconds: 45, is_active: true, mission_type: 'D' },
  { title: 'Colheita na Fazenda (D)', description: 'Ajudar os agricultores com a colheita antes que a tempestade chegue.', req_level: 2, xp: 40, ryous: 25, time_seconds: 90, is_active: true, mission_type: 'D' },
  { title: 'Entrega de Pergaminhos (D)', description: 'Entregar pergaminhos importantes para os mensageiros da fronteira.', req_level: 2, xp: 35, ryous: 30, time_seconds: 75, is_active: true, mission_type: 'D' },
  { title: 'Passear com os Cães Inuzuka (D)', description: 'Ajudar o clã Inuzuka a treinar e passear com seus cães ninjas novatos.', req_level: 3, xp: 45, ryous: 30, time_seconds: 100, is_active: true, mission_type: 'D' },
  { title: 'Recuperar Ferramentas Ninjas (D)', description: 'Algumas ferramentas de treino foram perdidas na floresta. Encontre-as.', req_level: 3, xp: 50, ryous: 40, time_seconds: 120, is_active: true, mission_type: 'D' },
  { title: 'Vigiar os Portões (D)', description: 'Ajudar os Jounins a vigiar a entrada da vila por algumas horas.', req_level: 4, xp: 60, ryous: 50, time_seconds: 150, is_active: true, mission_type: 'D' }
];

async function seed() {
  const { data, error } = await supabase.from('missions').insert(missions);
  if (error) console.error('Erro ao inserir:', error);
  else console.log('Missões Rank D inseridas com sucesso!');
}

seed();
