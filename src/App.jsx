import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './styles/main.css';
import { ToastProvider } from './context/ToastContext';

// Componentes
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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
import Vip from './pages/Vip';
import Templo from './pages/Templo';
import Evento from './pages/Evento';

// Novas telas Fullscreen (Lote 1)
import Login from './pages/Login';
import Selecionar from './pages/Selecionar';
import Criar from './pages/Criar';

const MainLayout = ({ children, playerState }) => (
  <div className="app">
    <Sidebar player={playerState} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TopBar player={playerState} />
      <main className="main">{children}</main>
    </div>
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
      const { data: invData } = await supabase
        .from('player_inventory')
        .select('*, items(*)')
        .eq('player_id', dbPlayer.id)
        .eq('is_equipped', true);

      const equippedItems = invData ? invData.map(i => i.items) : [];

      const { data: jutsuData } = await supabase
        .from('player_jutsus')
        .select('*, jutsus(*, jutsu_effects(*, status_effects(*)))')
        .eq('player_id', dbPlayer.id)
        .eq('is_equipped', true);

      // Extract the nested jutsu data
      const activeJutsus = jutsuData ? jutsuData.map(j => j.jutsus) : [];

      setPlayerState({
        ...dbPlayer,
        rank: dbPlayer.rank || 'Estudante da Academia',
        ryous: dbPlayer.ryous || 0,
        vip_coins: dbPlayer.vip_coins || 0,
        mission_slots: dbPlayer.mission_slots || 1,
        active_missions: dbPlayer.active_missions || [],
        tasks_completed: dbPlayer.tasks_completed || 0,
        activeJutsus: activeJutsus,
        equipped_items: equippedItems
      });
    }
  }

  if (loading) {
    return <div className="app"><div className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Kurokage...</div></div>;
  }

  // ESTADO 1: Não Logado
  if (!session) {
    return (
      <ToastProvider>
        <Router>
          <div className="grain"></div>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    );
  }

  // ESTADO 2: Logado, mas sem personagem selecionado
  if (session && !playerState) {
    return (
      <ToastProvider>
        <Router>
          <div className="grain"></div>
          <Routes>
            <Route path="/selecionar" element={<Selecionar session={session} setPlayerState={setPlayerState} />} />
            <Route path="/criar" element={<Criar session={session} setPlayerState={setPlayerState} />} />
            <Route path="*" element={<Navigate to="/selecionar" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    );
  }

  if (playerState.is_fainted || playerState.fainted_at) {
    return (
      <ToastProvider>
        <Router>
          <div className="grain"></div>
          <Routes>
            <Route path="*" element={<Hospital player={playerState} updatePlayer={updatePlayer} />} />
          </Routes>
        </Router>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <div className="grain"></div>
        <MainLayout playerState={playerState}>
          <Routes>
            <Route path="/" element={<Dashboard player={playerState} updatePlayer={updatePlayer} session={session} setPlayerState={setPlayerState} />} />
            <Route path="/dashboard" element={<Dashboard player={playerState} updatePlayer={updatePlayer} />} />
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
            <Route path="/vip" element={<Vip player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/templo" element={<Templo player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/evento" element={<Evento player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </ToastProvider>
  );
}

export default App;
