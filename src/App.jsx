import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { normalizeBonusStats } from './utils/engine';
import './styles/main.css';
import { ToastProvider } from './context/ToastContext';

import Sidebar from './components/Sidebar';
import MissionManager from './components/MissionManager';
import TopBar from './components/TopBar';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Treino = React.lazy(() => import('./pages/Treino'));
const Elementos = React.lazy(() => import('./pages/Elementos'));
const Graduacoes = React.lazy(() => import('./pages/Graduacoes'));
const Tarefas = React.lazy(() => import('./pages/Tarefas'));
const Clas = React.lazy(() => import('./pages/Clas'));
const Tecnicas = React.lazy(() => import('./pages/Tecnicas'));
const AprimorarJutsus = React.lazy(() => import('./pages/AprimorarJutsus'));
const Equipamentos = React.lazy(() => import('./pages/Equipamentos'));
const Ranking = React.lazy(() => import('./pages/Ranking'));
const Vila = React.lazy(() => import('./pages/Vila'));

const Mapa = React.lazy(() => import('./pages/Mapa'));
const Templo = React.lazy(() => import('./pages/Templo'));
const Historico = React.lazy(() => import('./pages/Historico'));
const Hospital = React.lazy(() => import('./pages/Hospital'));
const Dojo = React.lazy(() => import('./pages/Dojo'));
const Combate = React.lazy(() => import('./pages/Combate'));
const Vip = React.lazy(() => import('./pages/Vip'));
const Ferreiro = React.lazy(() => import('./pages/Ferreiro'));
const Evento = React.lazy(() => import('./pages/Evento'));
const Portoes = React.lazy(() => import('./pages/Portoes'));
const Ichiraku = React.lazy(() => import('./pages/Ichiraku'));
const Exame = React.lazy(() => import('./pages/Exame'));
const Invocacoes = React.lazy(() => import('./pages/Invocacoes'));
const Historia = React.lazy(() => import('./pages/Historia'));
const Status = React.lazy(() => import('./pages/Status'));

const Login = React.lazy(() => import('./pages/Login'));
const Selecionar = React.lazy(() => import('./pages/Selecionar'));
const Criar = React.lazy(() => import('./pages/Criar'));


const VipMissionBlock = ({ player, children }) => {
  if (!player) return children;

  const hasActiveMissions = player.active_missions && player.active_missions.length > 0;
  // Regra de VIP: Ou flag is_vip ou comprou algum Kuro Coin
  const isVip = player.is_vip || (player.vip_coins && player.vip_coins > 0);

  if (hasActiveMissions && !isVip) {
    return (
      <div className="page text-center pt-16">
        <h2 className="text-gold text-3xl font-bold mb-4">Você está em Missão!</h2>
        <p className="text-muted max-w-lg mx-auto my-6 text-lg">
          Jogadores <span className="text-danger">Padrão</span> não podem realizar outras atividades enquanto uma missão está ativa no plano de fundo.
          Aguarde a missão terminar.
        </p>
        <p className="max-w-lg mx-auto mb-6">
          Torne-se <strong className="text-gold">VIP</strong> (Adquirindo Kuro Coins) para liberar o Modo Multitarefa e jogar no Dojo e Mapa enquanto suas missões rodam automaticamente!
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
    <div className="flex-1 flex flex-col min-w-0">
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

  const currentPlayerIdFromState = playerState?.id;

  const updatePlayer = useCallback(async (explicitPlayerId) => {
    // Aceita o id numérico do player diretamente ou usa o playerState atual
    let currentPlayerId = currentPlayerIdFromState;
    if (typeof explicitPlayerId === 'number') {
      currentPlayerId = explicitPlayerId;
    }

    if (!currentPlayerId) return;
    const { data: dbPlayer, error: dbError } = await supabase
      .from('players')
      .select('*')
      .eq('id', currentPlayerId)
      .single();

    if (dbError) {
      console.error('Erro ao buscar jogador:', dbError);
      return;
    }

    if (dbPlayer) {
      const { data: invData, error: invError } = await supabase
        .from('player_inventory')
        .select('*, items(*)')
        .eq('player_id', dbPlayer.id)
        .eq('is_equipped', true);
        
      if (invError) console.error('Erro ao buscar inventário:', invError);

      const equippedItems = invData
        ? invData
            .filter(i => i.items)
            .map(i => {
              const merged = { ...(i.items.bonus_stats || {}), ...(i.rolled_stats || {}) };
              return {
                ...i.items,
                bonus_stats: merged,
                normalized_stats: normalizeBonusStats(merged),
                inv_id: i.id,
                rolled_stats: i.rolled_stats,
                upgrade_level: i.upgrade_level || 0
              };
            })
        : [];

      const { data: consData, error: consError } = await supabase
        .from('player_consumables')
        .select('*, consumables(*)')
        .eq('player_id', dbPlayer.id)
        .gt('quantity', 0);
        
      if (consError) console.error('Erro ao buscar consumíveis:', consError);

      const playerConsumables = consData ? consData.map(c => ({ ...c.consumables, quantity: c.quantity, pc_id: c.id })) : [];

      let activeJutsus = [];
      if (dbPlayer.jutsus_learned && dbPlayer.jutsus_learned.length > 0) {
        const jutsuIds = dbPlayer.jutsus_learned.map(j => typeof j === 'string' ? j : j.id);
        const { data: jutsuData, error: jutsuError } = await supabase
          .from('jutsus')
          .select('*')
          .in('id', jutsuIds)
          .eq('is_active', true);
          
        if (jutsuError) console.error('Erro ao buscar jutsus:', jutsuError);

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
  }, [currentPlayerIdFromState]);

  if (loading) {
    return <div className="app"><div className="main flex items-center justify-center h-full">Carregando Kurokage...</div></div>;
  }

  // ESTADO 1: Não Logado
  if (!session) {
    return (
      <ToastProvider>
        <Router>
          <div className="grain"></div>
          <Suspense fallback={<div className="page flex items-center justify-center min-h-screen text-muted">Carregando...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
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
          <Suspense fallback={<div className="page flex items-center justify-center min-h-screen text-muted">Carregando...</div>}>
            <Routes>
              <Route path="/selecionar" element={<Selecionar session={session} setPlayerState={setPlayerState} updatePlayer={updatePlayer} />} />
              <Route path="/criar" element={<Criar session={session} setPlayerState={setPlayerState} updatePlayer={updatePlayer} />} />
              <Route path="*" element={<Navigate to="/selecionar" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    );
  }

  if (playerState.is_fainted || playerState.fainted_at) {
    return (
      <ToastProvider>
        <Router>
          <div className="grain"></div>
          <Suspense fallback={<div className="page flex items-center justify-center min-h-screen text-muted">Carregando...</div>}>
            <Routes>
              <Route path="*" element={<Hospital player={playerState} updatePlayer={updatePlayer} />} />
            </Routes>
          </Suspense>
        </Router>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <div className="grain"></div>
        <MainLayout playerState={playerState} updatePlayer={updatePlayer}>
          <Suspense fallback={<div className="page flex items-center justify-center min-h-[50vh] text-muted">Carregando Tela...</div>}>
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
              <Route path="/ferreiro" element={<Ferreiro player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/historia" element={<Historia player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/status" element={<Status player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/vip" element={<Vip player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/templo" element={<Templo player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/historico" element={<Historico player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/evento" element={<Evento player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/exame" element={<Exame player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/ichiraku" element={<Ichiraku player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="/invocacoes" element={<Invocacoes player={playerState} updatePlayer={updatePlayer} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </Router>
    </ToastProvider>
  );
}

export default App;
