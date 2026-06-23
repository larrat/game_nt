import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './styles/main.css';

// Componentes
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Graduacoes from './pages/Graduacoes';
import Tarefas from './pages/Tarefas';

function App() {
  const [session, setSession] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadPlayerState(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadPlayerState(session.user.id);
      else {
        setPlayerState(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadPlayerState(userId) {
    const { data: dbPlayer, error } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', userId)
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
    setLoading(false);
  }

  if (loading) {
    return <div className="app"><div className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Carregando Kurokage...</div></div>;
  }

  // Se não estiver logado, por enquanto redireciona para login (legacy)
  // Até migrarmos o Login para React.
  if (!session) {
    window.location.href = '/legacy/login.html';
    return null;
  }

  return (
    <Router>
      <div className="grain"></div>
      <div className="app">
        <Sidebar player={playerState} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard player={playerState} />} />
            <Route path="/graduacoes" element={<Graduacoes player={playerState} updatePlayer={loadPlayerState} />} />
            <Route path="/tarefas" element={<Tarefas player={playerState} updatePlayer={loadPlayerState} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
