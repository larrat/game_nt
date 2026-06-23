import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';

export default function Hospital({ player, updatePlayer }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!player) return null;

  // Assuming max HP/Chakra is calculated similarly to the Dashboard
  const maxHP = 100 + (player.level * 20) + ((player.stamina_pts || 0) * 2);
  const maxChakra = 50 + (player.level * 10) + ((player.stamina_pts || 0) * 1);

  // We don't have current_hp or current_chakra in DB yet for this prototype,
  // so we'll just simulate the action.
  const healCost = player.level * 10; // 10 Ryous per level to full heal

  const handleHeal = async () => {
    if (player.ryous < healCost) {
      return alert("Você não tem Ryous suficientes para pagar o tratamento!");
    }
    
    setLoading(true);
    
    const { error } = await supabase
      .from('players')
      .update({
        ryous: player.ryous - healCost,
        // current_hp: maxHP, current_chakra: maxChakra 
      })
      .eq('id', player.id);

    if (error) {
      alert("Erro no tratamento: " + error.message);
    } else {
      alert("Tratamento concluído! Você está com HP e Chakra cheios.");
      updatePlayer(player.user_id);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow" onClick={() => navigate('/vila')} style={{ cursor: 'pointer' }}>❮ Voltar para Vila</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Hospital da Vila</h1>
      </div>

      <div style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* INFO COLUMN */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <img src="https://placehold.co/800x400/1c1c22/4ade80?text=Hospital" alt="Hospital" style={{ width: '100%', height: 'auto', objectFit: 'cover', filter: 'sepia(0.3) contrast(1.1)', marginBottom: '24px', border: '1px solid var(--line)' }} />
          <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '24px', marginBottom: '16px' }}>Pronto Atendimento Ninja</h2>
          <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginBottom: '24px' }}>
            Os combates e missões deixam cicatrizes e esgotam suas reservas de chakra. Nossa equipe médica especializada está pronta para tratar seus ferimentos instantaneamente... mediante o pagamento de uma taxa de serviço.
          </p>
        </div>

        {/* ACTION COLUMN */}
        <div className="card" style={{ flex: '1', minWidth: '300px' }}>
          <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>Tratamento Intensivo</h3>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
            <span style={{ color: 'var(--muted)' }}>Vida Máxima Restaurada</span>
            <span style={{ color: '#4ade80', fontFamily: "'JetBrains Mono', monospace" }}>{maxHP} HP</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '14px' }}>
            <span style={{ color: 'var(--muted)' }}>Chakra Máximo Restaurado</span>
            <span style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono', monospace" }}>{maxChakra} CP</span>
          </div>

          <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)' }}>Custo do Tratamento</span>
            <span style={{ fontSize: '18px', color: 'var(--gold)', fontWeight: 'bold' }}>RY$ {healCost}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', fontSize: '13px' }}>
            <span style={{ color: 'var(--muted)' }}>Seus fundos:</span>
            <span style={{ color: player.ryous >= healCost ? 'var(--paper)' : '#ef4444' }}>RY$ {player.ryous}</span>
          </div>

          <button className="btn-primary" style={{ width: '100%', padding: '16px' }} onClick={handleHeal} disabled={loading || player.ryous < healCost}>
            <span>{loading ? 'Curando...' : 'Pagar e Curar'}</span>
            <div className="stamp"></div>
          </button>
        </div>
      </div>
    </div>
  );
}
