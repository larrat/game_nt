import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/challenges-v4.css';
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
    <div className="page kuro-history-v4">
      <PageHeader
        eyebrow="Relatórios de Combate"
        title="Histórico de Batalhas"
        subtitle="Analise seus últimos 20 confrontos."
      />
      
      <div className="kuro-history-v4__layout">
        <div className="card">
          <h3 className="card-title mb-4">Últimos Confrontos</h3>
          {loading ? (
            <div className="muted mono">Carregando relatórios...</div>
          ) : logs.length === 0 ? (
            <div className="muted mono">Nenhum registro de batalha encontrado.</div>
          ) : (
            <div className="flex-col gap-2">
              {logs.map(log => (
                <button 
                  key={log.id}
                  className="kuro-history-v4__log" aria-pressed={selectedLog?.id === log.id}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex-row gap-3 items-center">
                    <SidebarIcon name={log.result === 'Vitória' ? 'trophy' : 'shield'} size={20} />
                    <div className="flex-col items-start">
                      <span className="paper text-sm font-bold">vs {log.enemy_name}</span>
                      <span className="muted mono text-[10px]">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-col items-end text-xs">
                    <span className={log.result === 'Vitória' ? 'success' : 'danger'}>{log.result}</span>
                    <span className="muted mono text-[10px]">{log.turn_count} turnos</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card sticky top-6">
          <h3 className="card-title mb-4">Detalhes do Combate</h3>
          {!selectedLog ? (
            <div className="muted mono text-center py-10">Selecione uma batalha para ver os detalhes.</div>
          ) : (
            <div>
              <div className="flex-row gap-4 mb-4 flex-wrap">
                <div className="card-glass flex-col flex-1 items-center p-3">
                  <span className="muted mono text-[10px]">RESULTADO</span>
                  <span className={`text-base font-bold ${selectedLog.result === 'Vitória' ? 'success' : 'danger'}`}>{selectedLog.result}</span>
                </div>
                <div className="card-glass flex-col flex-1 items-center p-3">
                  <span className="muted mono text-[10px]">XP OBTIDO</span>
                  <span className="success text-base font-bold">+{selectedLog.xp_gained}</span>
                </div>
                <div className="card-glass flex-col flex-1 items-center p-3">
                  <span className="muted mono text-[10px]">RYOUS OBTIDOS</span>
                  <span className="gold text-base font-bold">+{selectedLog.ryous_gained}</span>
                </div>
              </div>

              <h4 className="gold mono text-xs mb-2">Log de Turnos:</h4>
              <div 
                className="card-glass bg-black-alpha-40 border border-solid border-line rounded-sm p-4 h-[400px] max-h-[400px] overflow-y-auto flex-col gap-1 font-mono text-[11px]"
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
