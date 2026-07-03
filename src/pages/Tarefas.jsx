import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { calculateLevelFromXP } from '../utils/engine';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';

export default function Tarefas({ player, updatePlayer }) {
  const [tarefas, setTarefas] = useState([]);
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(false);
  const [showBuySlotModal, setShowBuySlotModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tarefa_academia');
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  const activeMissions = Array.isArray(player?.active_missions) ? player.active_missions : [];
  const slots = player?.mission_slots || 1;
  const vipCoins = player?.vip_coins || 0;
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

  return (
    <div className="page">
      <div className="topbar">
        <h1 className="page-title">Missões Ninja</h1>
      </div>

      <div className="flex-row" style={{ gap: '8px', marginBottom: '24px', overflowX: 'auto' }}>
        <button className="btn-ghost" onClick={() => setActiveTab('tarefa_academia')}>Academia</button>
        <button className="btn-ghost" onClick={() => setActiveTab('D')}>Rank D</button>
        <button className="btn-ghost" onClick={() => setActiveTab('C')}>Rank C</button>
        <button className="btn-ghost" onClick={() => setActiveTab('B')}>Rank B</button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3>Slots: {activeMissions.length} / {slots}</h3>
        <div className="grid-3">
          {activeMissions.map((m, idx) => {
            const tDef = tarefas.find(t => t.id === m.mission_id);
            if (!tDef) return null;
            const isDone = (timers[m.mission_id] || 0) <= 0;
            return (
              <div key={idx} className="card" style={{ border: isDone ? '1px solid green' : '1px solid gray' }}>
                <p>{tDef.title}</p>
                {isDone ?
                  <button onClick={() => finishTask(tDef)} disabled={loading}>Resgatar</button> :
                  <span>{formatTime(timers[m.mission_id] || 0)}</span>
                }
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <tbody>
            {tarefas.filter(t => t.type === activeTab).map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td><button onClick={() => startTask(t)} disabled={loading}>Iniciar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}