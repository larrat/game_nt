import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import './styles/main.css';
import { ToastProvider } from './context/ToastContext';

// Componentes
import Sidebar from './components/Sidebar';
import MissionManager from './components/MissionManager';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Treino from './pages/Treino';
import Elementos from './pages/Elementos';
import Graduacoes from './pages/Graduacoes';
import Tarefas from './pages/Tarefas';
import Clas from './pages/Clas';
import Tecnicas from './pages/Tecnicas';
import AprimorarJutsus from './pages/AprimorarJutsus';
import Equipamentos from './pages/Equipamentos';
import Ranking from './pages/Ranking';
import Vila from './pages/Vila';


import Historico from './pages/Historico';
import Hospital from './pages/Hospital';
import Mapa from './pages/Mapa';
import Dojo from './pages/Dojo';
import Combate from './pages/Combate';
import Vip from './pages/Vip';
import Templo from './pages/Templo';
import Evento from './pages/Evento';
import Portoes from './pages/Portoes';
import Ichiraku from './pages/Ichiraku';
import Exame from './pages/Exame';
import Invocacoes from './pages/Invocacoes';

// Novas telas Fullscreen (Lote 1)
import Login from './pages/Login';
import Selecionar from './pages/Selecionar';
import Criar from './pages/Criar';


const VipMissionBlock = ({ player, children }) => {
  if (!player) return children;

  const hasActiveMissions = player.active_missions && player.active_missions.length > 0;
  // Regra de VIP: Ou flag is_vip ou comprou algum Kuro Coin
  const isVip = player.is_vip || (player.vip_coins && player.vip_coins > 0);

  if (hasActiveMissions && !isVip) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: '60px' }}>
        <h2 className="gold" style={{ fontSize: '32px' }}>Você está em Missão!</h2>
        <p className="muted" style={{ maxWidth: '500px', margin: '24px auto', fontSize: '18px' }}>
          Jogadores <span style={{ color: 'var(--danger)' }}>Padrão</span> não podem realizar outras atividades enquanto uma missão está ativa no plano de fundo.
          Aguarde a missão terminar.
        </p>
        <p style={{ maxWidth: '500px', margin: '0 auto 24px auto' }}>
          Torne-se <strong className="gold">VIP</strong> (Adquirindo Kuro Coins) para liberar o Modo Multitarefa e jogar no Dojo e Mapa enquanto suas missões rodam automaticamente!
        </p>
      </div>
    );
  }

  return children;
};

const MainLayout = ({ children, playerState, updatePlayer }) => (
  <div className="app">
    <Sidebar player={playerState} />
    <MissionManager player={playerState} updatePlayer={updatePlayer} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <TopBar player={playerState} updatePlayer={updatePlayer} />
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

  async function updatePlayer(explicitPlayerId) {
    // Aceita o id numérico do player diretamente ou usa o playerState atual
    let currentPlayerId = playerState?.id;
    if (typeof explicitPlayerId === 'number') {
      currentPlayerId = explicitPlayerId;
    }

    if (!currentPlayerId) return;
    const { data: dbPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('id', currentPlayerId)
      .single();

    if (dbPlayer) {
      const { data: invData } = await supabase
        .from('player_inventory')
        .select('*, items(*)')
        .eq('player_id', dbPlayer.id)
        .eq('is_equipped', true);

      const equippedItems = invData ? invData.map(i => i.items) : [];

      const { data: consData } = await supabase
        .from('player_consumables')
        .select('*, consumables(*)')
        .eq('player_id', dbPlayer.id)
        .gt('quantity', 0);

      const playerConsumables = consData ? consData.map(c => ({ ...c.consumables, quantity: c.quantity, pc_id: c.id })) : [];

      let activeJutsus = [];
      if (dbPlayer.jutsus_learned && dbPlayer.jutsus_learned.length > 0) {
        const jutsuIds = dbPlayer.jutsus_learned.map(j => typeof j === 'string' ? j : j.id);
        const { data: jutsuData } = await supabase
          .from('jutsus')
          .select('*')
          .in('id', jutsuIds)
          .eq('is_active', true);

        if (jutsuData) {
          activeJutsus = jutsuData.map(jData => {
            const ref = dbPlayer.jutsus_learned.find(j => (typeof j === 'string' ? j : j.id) === jData.id);
            if (ref && typeof ref === 'object') {
              return { ...jData, level: ref.level || 1, slots: ref.slots || [null, null, null] };
            }
            return { ...jData, level: 1, slots: [null, null, null] };
          });
        }
      }

      setPlayerState({
        ...dbPlayer,
        rank: dbPlayer.rank || 'Estudante da Academia',
        ryous: dbPlayer.ryous || 0,
        vip_coins: dbPlayer.vip_coins || 0,
        mission_slots: dbPlayer.mission_slots || 1,
        active_missions: dbPlayer.active_missions || [],
        tasks_completed: dbPlayer.tasks_completed || 0,
        activeJutsus: activeJutsus,
        equipped_items: equippedItems,
        consumables: playerConsumables
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
            <Route path="/selecionar" element={<Selecionar session={session} setPlayerState={setPlayerState} updatePlayer={updatePlayer} />} />
            <Route path="/criar" element={<Criar session={session} setPlayerState={setPlayerState} updatePlayer={updatePlayer} />} />
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
        <MainLayout playerState={playerState} updatePlayer={updatePlayer}>
          <Routes>
            <Route path="/" element={<Dashboard player={playerState} updatePlayer={updatePlayer} session={session} setPlayerState={setPlayerState} />} />
            <Route path="/dashboard" element={<Dashboard player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/treino" element={<VipMissionBlock player={playerState}><Treino player={playerState} updatePlayer={updatePlayer} /></VipMissionBlock>} />
            <Route path="/elementos" element={<Elementos player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/tecnicas" element={<Tecnicas player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/aprimorar-jutsus" element={<AprimorarJutsus player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/equipamentos" element={<Equipamentos player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/graduacoes" element={<Graduacoes player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/tarefas" element={<Tarefas player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/clas" element={<Clas player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/vila" element={<Vila player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/hospital" element={<Hospital player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/mapa" element={<VipMissionBlock player={playerState}><Mapa player={playerState} updatePlayer={updatePlayer} /></VipMissionBlock>} />
            <Route path="/dojo" element={<VipMissionBlock player={playerState}><Dojo player={playerState} /></VipMissionBlock>} />
            <Route path="/combate" element={<Combate player={playerState} updatePlayer={updatePlayer} setPlayerState={setPlayerState} />} />
            <Route path="/ranking" element={<Ranking player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/portoes" element={<Portoes player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/vip" element={<Vip player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/templo" element={<Templo player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/historico" element={<Historico player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/summons" element={<Summons player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/evento" element={<Evento player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/exame" element={<Exame player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/ichiraku" element={<Ichiraku player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="/invocacoes" element={<Invocacoes player={playerState} updatePlayer={updatePlayer} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </ToastProvider>
  );
}

export default App;
