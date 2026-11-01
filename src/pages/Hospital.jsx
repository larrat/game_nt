import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/world-services-v4.css';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, calculateStamina, getGlobalDebuffs } from '../utils/engine';

export default function Hospital({ player, updatePlayer }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecovered, setIsRecovered] = useState(false);

  const RECOVERY_TIME_MINUTES = 5;
  const RECOVERY_TIME_MS = RECOVERY_TIME_MINUTES * 60 * 1000;

  const [globalDebuffs, setGlobalDebuffs] = useState(getGlobalDebuffs(null));

  useEffect(() => {
    async function checkDebuffs() {
      const { data } = await supabase.from('global_events').select('*').eq('is_active', true).eq('is_world_boss', true).single();
      if (data) setGlobalDebuffs(getGlobalDebuffs(data));
    }
    checkDebuffs();
  }, []);

  // O custo de cura escala com o nível e pode dobrar se o debuff de fase 3 da Bijuu estiver ativo
  // Usa optional chaining para não quebrar se player ainda estiver carregando
  const cureCost = Math.max(50, (player?.level || 1) * 50) * globalDebuffs.hospitalCostMultiplier;

  useEffect(() => {
    if (!player || !player.fainted_at) return;

    const faintedTime = new Date(player.fainted_at).getTime();
    const targetTime = faintedTime + RECOVERY_TIME_MS;

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(0);
        setIsRecovered(true);
      } else {
        setTimeLeft(Math.ceil(diff / 1000));
        setIsRecovered(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [player]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCure = async (paid) => {
    if (paid && player.ryous < cureCost) {
      addToast('Ryous insuficientes!', 'error');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('hospital_alta', {
      p_player_id: player.id,
      p_paid: paid,
      p_max_hp: calculateHP(player),
      p_max_cp: calculateChakra(player),
      p_global_hospital_cost_mult: globalDebuffs.hospitalCostMultiplier
    });

    if (error || data.error) {
      addToast(error ? error.message : data.error, 'error');
      setLoading(false);
      return;
    }

    await updatePlayer(player.id);
    addToast(paid ? 'Você pagou pelo tratamento e recebeu alta!' : 'Você se recuperou totalmente!', 'success');
    setLoading(false);
    navigate('/dashboard', { replace: true });
  };

  if (!player) return null;

  return (
    <div className="page kuro-hospital-v4 flex-col items-center justify-center h-full bg-danger-alpha-05 min-h-screen">
      <div className="kuro-hospital-v4__panel kuro-ui-card card-glass w-full text-center p-4 max-w-480">
        {isRecovered ? (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="sparkles" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Recuperação Concluída</h3>
            <p className="muted mb-6">
              Seu corpo se recuperou totalmente. Você já pode voltar para suas missões.
            </p>
            <GameAction tone="seal" className="w-full" loading={loading} onClick={() => handleCure(false)}>
              <SidebarIcon name="heart" size={17} /> {loading ? 'Recebendo Alta...' : 'Receber Alta e Voltar'}
            </GameAction>
          </>
        ) : (
          <>
            <span className="kuro-world-v4__emblem"><SidebarIcon name="activity" size={32} /></span>
            <h3 className="paper mb-2 text-2xl">Tempo Restante</h3>
            <div className="mono danger font-bold mb-6 text-4xl">
              {formatTime(timeLeft)}
            </div>
            <div className="muted mono text-md mb-6 opacity-80">
              O hospital da vila está cuidando de seus ferimentos...
            </div>

            <div className="bg-ink p-4 rounded-md border-line-solid">
              <p className="paper mb-3 text-lg">Deseja acelerar sua recuperação?</p>
              <GameAction tone="gold" className="w-full" onClick={() => handleCure(true)} disabled={player.ryous < cureCost} loading={loading}>
                <SidebarIcon name="coins" size={17} /> Pagar {cureCost} Ryous
              </GameAction>
              {player.ryous < cureCost && (
                <div className="danger mono text-xs mt-2">Ryous Insuficientes</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
