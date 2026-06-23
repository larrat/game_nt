import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase usando Variáveis de Ambiente da Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req, res) {
  // CORS Headers para caso o Frontend (Vercel) tente acessar
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Exemplo: Buscar jogador pelo ID passado na query (?id=123)
    const { id } = req.query;
    
    if (!id) return res.status(400).json({ error: "Faltou o ID do jogador" });

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    // Salvar/Atualizar o estado do jogador no banco
    const body = req.body;
    
    if (!body.id) return res.status(400).json({ error: "Faltou o ID do jogador para salvar" });

    const { data, error } = await supabase
      .from('players')
      .upsert(body) // Faz o Update se o ID existir, ou Insert se não existir
      .select();

    if (error) return res.status(500).json({ error: error.message });
    
    return res.status(200).json({ message: "Salvo com sucesso!", data });
  }

  return res.status(405).json({ message: "Método HTTP não permitido." });
}
