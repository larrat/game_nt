import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';

const VILLAGES = {
  1: { name: 'Folha', icon: '🍃', color: '#4caf50' },
  2: { name: 'Areia', icon: '🏜️', color: '#ffb300' },
  3: { name: 'Névoa', icon: '🌫️', color: '#00bcd4' },
  4: { name: 'Pedra', icon: '⛰️', color: '#795548' },
  5: { name: 'Nuvem', icon: '☁️', color: '#e0e0e0' },
  6: { name: 'Som', icon: '🎵', color: '#9c27b0' },
  7: { name: 'Chuva', icon: '🌧️', color: '#3f51b5' }
};

const TRAVEL_COST = 100;

export default function Mapa({ player, updatePlayer }) {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  if (!player) return null;

  // Usa village_id como fallback caso vila_atual_id ainda seja null no DB
  const currentLoc = player.vila_atual_id || player.village_id;

  const handleTravel = async (targetId) => {
    setErrorMsg('');
    if (targetId === currentLoc) return;

    if (player.ryous < TRAVEL_COST) {
      setErrorMsg(`Você não tem Ryous suficientes. Custa ${TRAVEL_COST} Ryous para viajar.`);
      return;
    }

    setLoadingId(targetId);

    const newRyous = player.ryous - TRAVEL_COST;

    const { error } = await supabase
      .from('players')
      .update({ vila_atual_id: targetId, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      setErrorMsg('Erro ao viajar: ' + error.message);
      setLoadingId(null);
      return;
    }

    await updatePlayer(player.user_id);
    setLoadingId(null);
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">Exploração Global</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Mapa-múndi</h1>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
          O mundo shinobi é vasto e dividido por fronteiras perigosas. Você pode pagar mercenários e barqueiros para cruzar os territórios com segurança.
        </p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--ink)', padding: '16px', border: '1px solid var(--line)', flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '1px' }}>LOCALIZAÇÃO ATUAL</div>
            <div style={{ fontSize: '18px', fontFamily: "'Shippori Mincho', serif", color: 'var(--paper)' }}>
              {VILLAGES[currentLoc]?.icon} Vila da {VILLAGES[currentLoc]?.name}
            </div>
          </div>
          <div style={{ background: 'var(--ink)', padding: '16px', border: '1px solid var(--line)', flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '1px' }}>SEUS RYOUS</div>
            <div style={{ fontSize: '18px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}>
              {player.ryous} ¥
            </div>
          </div>
          <div style={{ background: 'var(--ink)', padding: '16px', border: '1px solid var(--line)', flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '1px' }}>VILA DE ORIGEM</div>
            <div style={{ fontSize: '18px', fontFamily: "'Shippori Mincho', serif", color: 'var(--paper)' }}>
              {VILLAGES[player.village_id]?.icon} Vila da {VILLAGES[player.village_id]?.name}
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#f44336', padding: '16px', marginBottom: '32px', border: '1px solid #f44336', borderRadius: '4px' }}>
          {errorMsg}
        </div>
      )}

      <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
        Destinos Disponíveis (Custo: {TRAVEL_COST} Ryous)
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
        {Object.entries(VILLAGES).map(([idStr, v]) => {
          const id = parseInt(idStr);
          const isCurrent = id === currentLoc;
          const isLoading = loadingId === id;

          return (
            <div key={id} className="card" style={{ 
              borderColor: isCurrent ? 'var(--seal-bright)' : 'var(--line)',
              background: isCurrent ? 'var(--ink-raised)' : 'var(--background)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {isCurrent && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--seal-bright)' }}></div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{ fontSize: '40px' }}>{v.icon}</div>
                <div>
                  <div style={{ fontSize: '18px', fontFamily: "'Shippori Mincho', serif", color: isCurrent ? 'var(--seal-bright)' : 'var(--paper)' }}>
                    Vila da {v.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Domínio Ninja</div>
                </div>
              </div>

              {isCurrent ? (
                <button disabled style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid var(--seal-bright)', color: 'var(--seal-bright)', cursor: 'not-allowed' }}>
                  VOCÊ ESTÁ AQUI
                </button>
              ) : (
                <button 
                  onClick={() => handleTravel(id)}
                  disabled={loadingId !== null || player.ryous < TRAVEL_COST}
                  className="btn" 
                  style={{ width: '100%', background: 'var(--ink-raised)' }}
                >
                  {isLoading ? 'VIAJANDO...' : `VIAJAR (${TRAVEL_COST} ¥)`}
                </button>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
