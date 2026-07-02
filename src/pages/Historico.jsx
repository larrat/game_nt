import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import '../styles/main.css';

export default function Historico({ player }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      if (!player) return;
      const { data } = await supabase
        .from('battle_logs')
        .select('*')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setLogs(data);
      setLoading(false);
    }
    fetchLogs();
  }, [player]);

  if (!player) return null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Relatórios de Combate"
        title="Histórico de Batalhas"
        subtitle="Analise seus últimos 20 confrontos."
      />
      
      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Últimos Confrontos</h3>
          {loading ? (
            <div className="muted mono">Carregando relatórios...</div>
          ) : logs.length === 0 ? (
            <div className="muted mono">Nenhum registro de batalha encontrado.</div>
          ) : (
            <div className="flex-col" style={{ gap: '8px' }}>
              {logs.map(log => (
                <button 
                  key={log.id}
                  className={`btn-ghost flex-between ${selectedLog?.id === log.id ? 'active' : ''}`}
                  onClick={() => setSelectedLog(log)}
                  style={{ padding: '12px', border: '1px solid var(--line)', background: selectedLog?.id === log.id ? 'var(--ink-soft)' : 'transparent' }}
                >
                  <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>{log.result === 'Vitória' ? '🏆' : '💀'}</span>
                    <div className="flex-col" style={{ alignItems: 'flex-start' }}>
                      <span className="paper" style={{ fontSize: '14px', fontWeight: 'bold' }}>vs {log.enemy_name}</span>
                      <span className="muted mono" style={{ fontSize: '10px' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-col" style={{ alignItems: 'flex-end', fontSize: '12px' }}>
                    <span className={log.result === 'Vitória' ? 'success' : 'danger'}>{log.result}</span>
                    <span className="muted mono" style={{ fontSize: '10px' }}>{log.turn_count} turnos</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ position: 'sticky', top: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '16px' }}>Detalhes do Combate</h3>
          {!selectedLog ? (
            <div className="muted mono" style={{ textAlign: 'center', padding: '40px 0' }}>Selecione uma batalha para ver os detalhes.</div>
          ) : (
            <div>
              <div className="flex-row" style={{ gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="card-glass flex-col" style={{ flex: 1, alignItems: 'center', padding: '12px' }}>
                  <span className="muted mono" style={{ fontSize: '10px' }}>RESULTADO</span>
                  <span className={selectedLog.result === 'Vitória' ? 'success' : 'danger'} style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedLog.result}</span>
                </div>
                <div className="card-glass flex-col" style={{ flex: 1, alignItems: 'center', padding: '12px' }}>
                  <span className="muted mono" style={{ fontSize: '10px' }}>XP OBTIDO</span>
                  <span className="success" style={{ fontSize: '16px', fontWeight: 'bold' }}>+{selectedLog.xp_gained}</span>
                </div>
                <div className="card-glass flex-col" style={{ flex: 1, alignItems: 'center', padding: '12px' }}>
                  <span className="muted mono" style={{ fontSize: '10px' }}>RYOUS OBTIDOS</span>
                  <span className="gold" style={{ fontSize: '16px', fontWeight: 'bold' }}>+{selectedLog.ryous_gained}</span>
                </div>
              </div>

              <h4 className="gold mono" style={{ fontSize: '12px', marginBottom: '8px' }}>Log de Turnos:</h4>
              <div 
                className="card-glass" 
                style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  background: '#0a0a0f', 
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '11px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {(selectedLog.combat_log || []).map((msg, i) => {
                  let color = '#9ca3af';
                  if (msg.includes('Vitória') || msg.includes('derrotou') || msg.includes('sucumbiu')) color = '#4ade80';
                  else if (msg.includes('dano') && (msg.includes('Você') || msg.includes('Causou'))) color = '#ef4444';
                  else if (msg.includes('dano') && msg.includes('usou')) color = '#ef4444'; // Inimigo atacando
                  else if (msg.includes('CRÍTICO')) color = 'var(--gold)';
                  else if (msg.includes('curou') || msg.includes('recuperou')) color = '#4ade80';
                  
                  return <div key={i} style={{ color }}>{`> ${msg}`}</div>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
