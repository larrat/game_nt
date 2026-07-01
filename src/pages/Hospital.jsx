import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';

export default function Hospital({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const RECOVERY_TIME_MINUTES = 5;
  const RECOVERY_TIME_MS = RECOVERY_TIME_MINUTES * 60 * 1000;
  
  // O custo de cura escala com o nível (ex: 50 Ryous por nível)
  const cureCost = Math.max(50, player?.level * 50);

  useEffect(() => {
    if (!player || !player.fainted_at) return;

    const faintedTime = new Date(player.fainted_at).getTime();
    const targetTime = faintedTime + RECOVERY_TIME_MS;

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;
      if (diff <= 0) {
        setTimeLeft(0);
      } else {
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
      chakra: calculateChakra(player),
      stamina: calculateStamina(player)
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
        <h1 className="page-title danger" style={{ fontSize: '28px', marginBottom: '8px' }}>Hospital da Vila</h1>
        <p className="muted" style={{ marginBottom: '24px' }}>
          Você desmaiou de exaustão ou ferimentos graves em sua última batalha. 
          As ninjas médicas estão cuidando de você.
        </p>

        <div className="card" style={{ background: 'var(--ink-raised)', borderColor: 'var(--seal-bright)', marginBottom: '24px' }}>
          <div className="eyebrow danger" style={{ marginBottom: '8px' }}>Tempo para Alta Médica</div>
          <div className="mono" style={{ fontSize: '32px', color: timeLeft === 0 ? 'var(--green)' : 'var(--paper)' }}>
            {timeLeft > 0 ? formatTime(timeLeft) : 'Recuperado!'}
          </div>
        </div>

        <div className="flex-col" style={{ gap: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={() => handleCure(false)} 
            disabled={timeLeft > 0 || loading}
            style={{ opacity: timeLeft > 0 ? 0.5 : 1 }}
          >
            <span>{loading ? 'Saindo...' : 'Receber Alta Gratuita'}</span>
            <div className="stamp"></div>
          </button>

          <button 
            className="btn-ghost" 
            onClick={() => handleCure(true)} 
            disabled={timeLeft === 0 || loading}
            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
          >
            Pagar Tratamento Vip ({cureCost} Ryous)
          </button>
        </div>
      </div>
    </div>
  );
}
