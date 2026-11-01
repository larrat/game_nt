import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/world-services-v4.css';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, getGlobalDebuffs } from '../utils/engine';
import { getHospitalViewState } from '../utils/hospitalState';

const RECOVERY_TIME_MS = 5 * 60 * 1000;

export default function Hospital({ player, updatePlayer }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [globalDebuffs, setGlobalDebuffs] = useState(getGlobalDebuffs(null));

  useEffect(() => {
    let active = true;
    async function checkDebuffs() {
      const { data, error } = await supabase.from('global_events')
        .select('*').eq('is_active', true).eq('is_world_boss', true).maybeSingle();
      if (!error && active && data) setGlobalDebuffs(getGlobalDebuffs(data));
    }
    checkDebuffs();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    if (!player?.is_fainted) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [player?.id, player?.is_fainted, player?.fainted_at]);

  if (!player) return null;

  const view = getHospitalViewState(player, now, RECOVERY_TIME_MS);
  // Somente exibir custo enquanto uma recuperação paga ainda faz sentido.
  // A autorização e a cobrança efetiva permanecem no RPC hospital_alta.
  const cureCost = Math.max(50, (player.level || 1) * 50) * globalDebuffs.hospitalCostMultiplier;

  const formatTime = seconds => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const refreshState = async () => {
    setLoading(true);
    try {
      const updated = await updatePlayer(player.id);
      if (!updated) addToast('Não foi possível atualizar seu estado. Tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCure = async (paid) => {
    if (loading || view.status !== (paid ? 'recovering' : 'ready_for_discharge')) return;
    if (paid && (player.ryous || 0) < cureCost) {
      addToast('Ryous insuficientes!', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('hospital_alta', {
        p_player_id: player.id,
        p_paid: paid,
        p_max_hp: calculateHP(player),
        p_max_cp: calculateChakra(player),
        p_global_hospital_cost_mult: globalDebuffs.hospitalCostMultiplier
      });
      if (error || !data?.success) {
        addToast(error?.message || data?.error || 'Alta não autorizada pelo servidor.', 'error');
        return;
      }

      const updated = await updatePlayer(player.id);
      if (!updated) {
        addToast('Alta registrada. Atualize o personagem para sincronizar o estado.', 'warning');
        return;
      }
      addToast(paid ? 'Tratamento concluído e alta registrada!' : 'Você se recuperou e recebeu alta!', 'success');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      addToast('Falha ao solicitar alta: ' + (error?.message || 'tente novamente'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page kuro-hospital-v4 flex-col items-center justify-center h-full bg-danger-alpha-05 min-h-screen">
      <div className="kuro-hospital-v4__panel kuro-ui-card card-glass w-full text-center p-4 max-w-480">
        {view.status === 'healthy' ? (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="heart" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Nenhum tratamento necessário</h3>
            <p className="muted mb-6">
              Seu personagem não está desmaiado. Não existe recuperação hospitalar ou cobrança pendente.
            </p>
            <GameAction tone="seal" className="w-full" onClick={() => navigate('/dashboard', { replace: true })}>
              Voltar ao Painel
            </GameAction>
          </>
        ) : view.status === 'needs_sync' ? (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="activity" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Estado hospitalar indisponível</h3>
            <p className="muted mb-6">
              O servidor informou um desmaio, mas não há horário válido para calcular a alta.
              Nenhum tratamento será cobrado até esse estado ser corrigido.
            </p>
            <GameAction tone="quiet" className="w-full" loading={loading} onClick={refreshState}>
              Consultar situação novamente
            </GameAction>
          </>
        ) : view.status === 'ready_for_discharge' ? (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="sparkles" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Recuperação Concluída</h3>
            <p className="muted mb-6">
              O tempo de recuperação terminou. Solicite a alta gratuita para remover o estado de desmaio.
            </p>
            <GameAction tone="seal" className="w-full" loading={loading} onClick={() => handleCure(false)}>
              <SidebarIcon name="heart" size={17} /> {loading ? 'Recebendo Alta...' : 'Receber Alta Grátis'}
            </GameAction>
          </>
        ) : (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="activity" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Tempo Restante</h3>
            <div className="mono danger font-bold mb-6 text-4xl">
              {formatTime(view.remainingSeconds)}
            </div>
            <div className="muted mono text-md mb-6 opacity-80">
              O hospital da vila está cuidando de seus ferimentos...
            </div>
            <div className="bg-ink p-4 rounded-md border-line-solid">
              <p className="paper mb-3 text-lg">Deseja antecipar sua alta?</p>
              <GameAction tone="gold" className="w-full" onClick={() => handleCure(true)}
                disabled={(player.ryous || 0) < cureCost} loading={loading}>
                <SidebarIcon name="coins" size={17} /> Pagar {cureCost} Ryous
              </GameAction>
              {(player.ryous || 0) < cureCost && (
                <div className="danger mono text-xs mt-2">Ryous Insuficientes</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
