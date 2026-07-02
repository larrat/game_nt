import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
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
      const now = new Date().getTime();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft(0);
        setIsRecovered(true);
      } else {
        setTimeLeft(Math.ceil(diff / 1000));
        setIsRecovered(false);
      }
        setTimeLeft(Math.ceil(diff / 1000));
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
    
    let updates = { 
      is_fainted: false, 
      fainted_at: null,
      hp: calculateHP(player),
      chakra: calculateChakra(player)
    };

    if (paid) {
      updates.ryous = player.ryous - cureCost;
    }

    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao sair do hospital: ' + error.message, 'error');
      setLoading(false);
      return;
    }

    await updatePlayer(player.user_id);
    addToast(paid ? 'Você pagou pelo tratamento e recebeu alta!' : 'Você se recuperou totalmente!', 'success');
    setLoading(false);
    navigate('/dashboard', { replace: true });
  };

  if (!player) return null;

  return (
    <div className="page" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'rgba(224, 54, 63, 0.05)'
    }}>
      <div className="card-glass" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
        {isRecovered ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌟</div>
            <h3 className="paper" style={{ fontSize: '24px', marginBottom: '8px' }}>Recuperação Concluída</h3>
            <p className="muted" style={{ marginBottom: '24px' }}>
              Seu corpo se recuperou totalmente. Você já pode voltar para suas missões.
            </p>
            <button 
              className="btn-primary" 
              onClick={() => handleCure(false)} 
              disabled={loading}
              style={{ fontSize: '18px', padding: '12px 32px' }}
            >
              {loading ? 'Recebendo Alta...' : 'Receber Alta e Voltar'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h3 className="paper" style={{ fontSize: '24px', marginBottom: '8px' }}>Tempo Restante</h3>
            <div className="mono danger" style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px' }}>
              {formatTime(timeLeft)}
            </div>
            <div className="muted mono" style={{ fontSize: '12px', marginBottom: '24px', opacity: 0.8 }}>
              O hospital da vila está cuidando de seus ferimentos...
            </div>
            
            <div style={{ background: 'var(--ink-raised)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line-bright)' }}>
              <p className="paper" style={{ marginBottom: '12px', fontSize: '14px' }}>Deseja acelerar sua recuperação?</p>
              <button 
                className="btn-primary" 
                onClick={() => handleCure(true)} 
                disabled={loading || player.ryous < cureCost}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <img src="/images/imgi_20_ryou.png" alt="ryous" style={{ width: '16px' }} onError={(e) => e.target.style.display='none'} />
                Pagar {cureCost} Ryous
              </button>
              {player.ryous < cureCost && (
                <div className="danger mono" style={{ fontSize: '10px', marginTop: '8px' }}>Ryous Insuficientes</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
