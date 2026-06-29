import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './styles/main.css';

// Componentes
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Treino from './pages/Treino';
import Elementos from './pages/Elementos';
import Graduacoes from './pages/Graduacoes';
import Tarefas from './pages/Tarefas';
import Clas from './pages/Clas';
import Tecnicas from './pages/Tecnicas';
import Equipamentos from './pages/Equipamentos';
import Ranking from './pages/Ranking';
import Vila from './pages/Vila';
import Hospital from './pages/Hospital';
import Mapa from './pages/Mapa';
import Dojo from './pages/Dojo';
import Combate from './pages/Combate';

// Novas telas Fullscreen (Lote 1)
import Login from './pages/Login';
import Selecionar from './pages/Selecionar';
import Criar from './pages/Criar';

const MainLayout = ({ children, playerState }) => (
  <div className="app">
    <Sidebar player={playerState} />
    <main className="main">{children}</main>
  </div>
);

function App() {
  const [session, setSession] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setPlayerState(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function updatePlayer(userId) {
    if (!playerState) return;
    const { data: dbPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerState.id)
      .single();

    if (dbPlayer) {
      setPlayerState({
        ...dbPlayer,
        rank: dbPlayer.rank || 'Estudante da Academia',
        ryous: dbPlayer.ryous || 0,
        tasks_completed: dbPlayer.tasks_completed || 0,
        activeJutsus: []
      });
    }
  }

  if (loading) {
    return <div className="app"><div className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Kurokage...</div></div>;
  }

  // ESTADO 1: Não Logado
  if (!session) {
    return (
      <Router>
        <div className="grain"></div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // ESTADO 2: Logado, mas sem personagem selecionado
  if (session && !playerState) {
    return (
      <Router>
        <div className="grain"></div>
        <Routes>
          <Route path="/selecionar" element={<Selecionar session={session} setPlayerState={setPlayerState} />} />
          <Route path="/criar" element={<Criar session={session} setPlayerState={setPlayerState} />} />
          <Route path="*" element={<Navigate to="/selecionar" replace />} />
        </Routes>
      </Router>
    );
  }

  // ESTADO 3: Jogo (Personagem selecionado)
  return (
    <Router>
      <div className="grain"></div>
      <MainLayout playerState={playerState}>
        <Routes>
          <Route path="/" element={<Dashboard player={playerState} updatePlayer={updatePlayer} session={session} setPlayerState={setPlayerState} />} />
          <Route path="/dashboard" element={<Dashboard player={playerState} />} />
          <Route path="/treino" element={<Treino player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/elementos" element={<Elementos player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/tecnicas" element={<Tecnicas player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/equipamentos" element={<Equipamentos player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/graduacoes" element={<Graduacoes player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/tarefas" element={<Tarefas player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/clas" element={<Clas player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/vila" element={<Vila player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/hospital" element={<Hospital player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/mapa" element={<Mapa player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/dojo" element={<Dojo player={playerState} />} />
          <Route path="/combate" element={<Combate player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="/ranking" element={<Ranking player={playerState} updatePlayer={updatePlayer} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
