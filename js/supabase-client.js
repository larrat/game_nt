// supabase-client.js
// Configuração do Cliente Supabase para o Frontend via CDN

const _SUPABASE_URL = 'https://gvtbixbyqayhdwowgqrp.supabase.co';
const _SUPABASE_ANON_KEY = 'sb_publishable_XOJ2L7eu-_EdeksfYCetyQ_hS1hK3yC';

// A biblioteca do Supabase precisa ser injetada via CDN no HTML (ex: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>)
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(_SUPABASE_URL, _SUPABASE_ANON_KEY);
  console.log("Supabase Client Inicializado!");
} else {
  console.error("A biblioteca do Supabase não foi carregada no HTML.");
}
