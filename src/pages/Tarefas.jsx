import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
import PageHeader from '../components/PageHeader';

const EMPTY_MISSIONS = [];

const TABS = [
  { id: 'tarefa_academia', label: 'Academia', minLevel: 1 },
  { id: 'D', label: 'Rank D', minLevel: 5 },
  { id: 'C', label: 'Rank C', minLevel: 15 },
  { id: 'B', label: 'Rank B', minLevel: 25 }
];

export default function Tarefas({ player, updatePlayer }) {
  const [tarefas, setTarefas] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(false);
  const [startingTaskIds, setStartingTaskIds] = useState({});
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

  const isMissionActive = (missionId) =>
    activeMissions.some(m => m.mission_id === missionId);

  const getMissionBlockReason = (task) => {
    if (player.level < task.reqLevel) return `Nv.${task.reqLevel}`;
    const tabReq = TABS.find(t => t.id === task.type);
    if (tabReq && player.level < tabReq.minLevel) {
      return `Rank ${tabReq.label.split(' ').pop()}`;
    }
    if (activeMissions.length >= slots) return 'Sem slots';
    return null;
  };

  const startTask = async (task) => {
    if (loading || startingTaskIds[task.id]) return;

    const blockReason = getMissionBlockReason(task);
    if (blockReason) {
      addToast(`Requisito não atendido: ${blockReason}`, 'error');
      return;
    }
    if (isMissionActive(task.id)) {
      addToast('Esta missão já está em andamento!', 'error');
      return;
    }

    setLoading(true);
    setStartingTaskIds(prev => ({ ...prev, [task.id]: true }));
    try {
      const { data, error } = await supabase.rpc('iniciar_missao', {
        p_player_id: player.id,
        p_mission_id: task.id,
        p_duration_seconds: task.time
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      await updatePlayer(player.id);
      addToast(`Missão "${task.title}" iniciada!`, 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao iniciar missão.', 'error');
    } finally {
      setLoading(false);
      setStartingTaskIds(prev => ({ ...prev, [task.id]: false }));
    }
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

      await updatePlayer(player.id);
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
  const missionsByType = TABS.reduce((acc, tab) => {
    acc[tab.id] = tarefas.filter(t => t.type === tab.id).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <PageHeader
        eyebrow="Rotina Shinobi"
        title="Missões Ninja"
        subtitle="Envie seu personagem em missões cronometradas e resgate as recompensas quando o tempo terminar."
      />

      <div className="segmented-tabs" role="tablist" aria-label="Categorias de missão">
        {TABS.map(tab => {
          const locked = player.level < tab.minLevel;
          return (
            <button
              key={tab.id}
              className={`segmented-tab ${activeTab === tab.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
              onClick={() => {
                if (locked) {
                  addToast(`${tab.label} requer nível ${tab.minLevel}+`, 'error');
                  return;
                }
                setActiveTab(tab.id);
              }}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              title={locked ? `Requer Nv.${tab.minLevel}` : undefined}
            >
              {locked ? '🔒 ' : ''}{tab.label}
              <span className="count">{missionsByType[tab.id] || 0}</span>
            </button>
          );
        })}
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
                <th>Requisito</th>
                <th>Tempo</th>
                <th>XP</th>
                <th>Ryous</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((t) => {
                const blockReason = getMissionBlockReason(t);
                const locked = !!blockReason && !isMissionActive(t.id);
                return (
                <tr key={t.id}>
                  <td>
                    <div className="paper" style={{ fontWeight: 600 }}>{t.title}</div>
                    <div className="muted" style={{ fontSize: '11px', marginTop: '4px', whiteSpace: 'normal' }}>{t.desc}</div>
                  </td>
                  <td className="mono" style={{ fontSize: '11px', color: player.level >= t.reqLevel ? 'var(--green)' : 'var(--danger)' }}>
                    Nv.{t.reqLevel}
                  </td>
                  <td className="mono">{formatTime(t.time)}</td>
                  <td className="val-pos">{t.xp}</td>
                  <td className="val-pos">RY$ {t.ryous}</td>
                  <td>
                    {isMissionActive(t.id) ? (
                      <span className="badge badge-muted">Em andamento</span>
                    ) : locked ? (
                      <span className="badge badge-red" title={blockReason}>🔒 {blockReason}</span>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={() => startTask(t)}
                        disabled={loading || startingTaskIds[t.id]}
                        style={{ padding: '9px 16px', fontSize: '11px' }}
                        type="button"
                      >
                        <span>{startingTaskIds[t.id] ? 'Iniciando...' : 'Iniciar'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );})}
              {visibleTasks.length === 0 && (
                <tr>
                  <td colSpan="6" className="muted" style={{ textAlign: 'center', padding: '28px' }}>
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
