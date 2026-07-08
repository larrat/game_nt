import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const sql = fs.readFileSync('migrations/015_world_boss_and_dojo.sql', 'utf8');

async function run() {
  const { data, error } = await supabase.rpc('run_sql', { query: sql });
  if (error) {
     console.error("RPC run_sql failed:", error);
     console.log("Will try executing statements individually if possible, or advise.");
  } else {
     console.log("Migration executed successfully via run_sql!");
  }
}
run();
