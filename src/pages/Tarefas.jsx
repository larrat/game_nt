import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
import PageHeader from '../components/PageHeader';

const EMPTY_MISSIONS = [];

const TABS = [
  { id: 'tarefa_academia', label: 'Academia' },
  { id: 'D', label: 'Rank D' },
  { id: 'C', label: 'Rank C' },
  { id: 'B', label: 'Rank B' }
];

export default function Tarefas({ player, updatePlayer }) {
  const [tarefas, setTarefas] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tarefa_academia');
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  const activeMissions = Array.isArray(player?.active_missions) ? player.active_missions : EMPTY_MISSIONS;
  const slots = player?.mission_slots || 1;
  const SLOT_COST = Number(gameConfig?.mission_slot_cost) || 50;

  useEffect(() => {
    async function fetchMissions() {
      const { data } = await supabase.from('missions').select('*').eq('is_active', true).order('id', { ascending: true });
      if (data) {
        const formatted = data.map(m => ({
          id: m.id,
          title: m.title,
          desc: m.description,
          reqLevel: m.req_level,
          xp: m.xp,
          ryous: m.ryous,
          time: m.time_seconds,
          type: m.mission_type
        }));
        setTarefas(formatted);
      }
    }
    fetchMissions();
  }, []);

  useEffect(() => {
    if (!activeMissions.length) return;
    const interval = setInterval(() => {
      const now = new Date();
      setTimers(prev => {
        const next = { ...prev };
        activeMissions.forEach(m => {
          const endTime = new Date(m.end_time);
          const diff = Math.floor((endTime - now) / 1000);
          next[m.mission_id] = diff > 0 ? diff : 0;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeMissions]);

  const startTask = async (task) => {
    if (activeMissions.length >= slots) {
      addToast('Slots ocupados!', 'error');
      return;
    }
    setLoading(true);
    const endTime = new Date(Date.now() + task.time * 1000).toISOString();
    const newActive = [...activeMissions, { mission_id: task.id, end_time: endTime }];

    const { error } = await supabase.from('players').update({ active_missions: newActive }).eq('id', player.id);
    if (!error) {
      await updatePlayer(player.user_id);
      addToast(`Missão "${task.title}" iniciada!`, 'success');
    }
    setLoading(false);
  };

  const finishTask = async (taskDef) => {
    setLoading(true);
    try {
      // Chama a função RPC segura no banco de dados
      const { data, error } = await supabase.rpc('finalizar_missao', {
        p_player_id: player.id,
        p_mission_id: taskDef.id,
        p_mission_xp: taskDef.xp,
        p_mission_ryous: taskDef.ryous,
        p_mission_type: taskDef.type
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      await updatePlayer(player.user_id);
      addToast('Missão concluída!', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  if (!player) return null;

  const visibleTasks = tarefas.filter(t => t.type === activeTab);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Rotina Shinobi"
        title="Missões Ninja"
        subtitle="Envie seu personagem em missões cronometradas e resgate as recompensas quando o tempo terminar."
      />

      <div className="tabs" style={{ marginBottom: '24px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between" style={{ marginBottom: activeMissions.length ? '18px' : 0, gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h3 className="card-title" style={{ marginBottom: '6px' }}>Missões em andamento</h3>
            <p className="muted" style={{ fontSize: '13px' }}>
              Slots ocupados: <span className="gold mono">{activeMissions.length}/{slots}</span>
            </p>
          </div>
          <span className="badge badge-gold">Custo de slot: {SLOT_COST} KC</span>
        </div>

        {activeMissions.length === 0 ? (
          <div className="info-banner">Nenhuma missão ativa. Escolha uma missão abaixo para começar.</div>
        ) : (
          <div className="grid-3">
            {activeMissions.map((m, idx) => {
              const tDef = tarefas.find(t => t.id === m.mission_id);
              if (!tDef) return null;
              const remaining = timers[m.mission_id] || 0;
              const isDone = remaining <= 0;
              return (
                <div key={`${m.mission_id}-${idx}`} className="card" style={{ borderColor: isDone ? 'rgba(76,206,128,0.45)' : 'var(--line-bright)' }}>
                  <div className="flex-between" style={{ gap: '12px', marginBottom: '12px' }}>
                    <strong className="paper" style={{ fontSize: '14px' }}>{tDef.title}</strong>
                    <span className={`badge ${isDone ? 'badge-green' : 'badge-muted'}`}>
                      {isDone ? 'Pronta' : formatTime(remaining)}
                    </span>
                  </div>
                  <div className="flex-wrap" style={{ marginBottom: '16px' }}>
                    <span className="badge badge-muted">XP {tDef.xp}</span>
                    <span className="badge badge-gold">RY$ {tDef.ryous}</span>
                  </div>
                  <button
                    className={isDone ? 'btn-primary' : 'btn-ghost'}
                    onClick={() => finishTask(tDef)}
                    disabled={loading || !isDone}
                    style={{ width: '100%' }}
                    type="button"
                  >
                    <span>{isDone ? 'Resgatar' : 'Em progresso'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-responsive" style={{ marginBottom: 0, border: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Missão</th>
                <th>Tempo</th>
                <th>XP</th>
                <th>Ryous</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className="paper" style={{ fontWeight: 600 }}>{t.title}</div>
                    <div className="muted" style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'normal' }}>{t.desc}</div>
                  </td>
                  <td className="mono">{formatTime(t.time)}</td>
                  <td className="val-pos">{t.xp}</td>
                  <td className="val-pos">RY$ {t.ryous}</td>
                  <td>
                    <button
                      className="btn-primary"
                      onClick={() => startTask(t)}
                      disabled={loading || activeMissions.length >= slots}
                      style={{ padding: '9px 16px', fontSize: '11px' }}
                      type="button"
                    >
                      <span>Iniciar</span>
                    </button>
                  </td>
                </tr>
              ))}
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan="5" className="muted" style={{ textAlign: 'center', padding: '28px' }}>
                    Nenhuma missão disponível para esta categoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
