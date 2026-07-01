import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar variáveis manualmente
const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function seedCharacters() {
  const characters = [
    {
      id: 1,
      name: 'Naruto Uzumaki',
      description: 'O ninja hiperativo e cabeça-oca da Folha.',
      base_avatar_url: '/images/naruto.jpg'
    },
    {
      id: 2,
      name: 'Sasuke Uchiha',
      description: 'O último sobrevivente do clã Uchiha.',
      base_avatar_url: '/images/sasuke.jpg'
    },
    {
      id: 3,
      name: 'Sakura Haruno',
      description: 'Kunoichi inteligente com excelente controle de chakra.',
      base_avatar_url: '/images/sakura.jpg'
    },
    {
      id: 4,
      name: 'Kakashi Hatake',
      description: 'O Ninja Copiador da Aldeia da Folha.',
      base_avatar_url: '/images/kakashi.jpg'
    }
  ];

  for (const char of characters) {
    const { error } = await supabase.from('characters').upsert(char, { onConflict: 'id' });
    if (error) {
      console.error(`Erro ao inserir ${char.name}:`, error.message);
    } else {
      console.log(`✅ Inserido: ${char.name}`);
    }
  }
}

seedCharacters();
