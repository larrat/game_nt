import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

export default function MissionManager({ player, updatePlayer }) {
  const [tarefas, setTarefas] = useState([]);
  const { addToast } = useToast();
  const finishingRefs = useRef(new Set());
  const intervalRef = useRef(null);

  useEffect(() => {
    async function fetchMissions() {
      const { data } = await supabase.from('missions').select('*').eq('is_active', true);
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

  const finishTask = async (taskDef) => {
    if (!player) return;

    try {
      const { data, error } = await supabase.rpc('finalizar_missao', {
        p_player_id: player.id,
        p_mission_id: taskDef.id,
        p_mission_xp: taskDef.xp,
        p_mission_ryous: taskDef.ryous,
        p_mission_type: taskDef.type
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      await updatePlayer(player.user_id);
      addToast(`Missão concluída! +${taskDef.xp} XP e RY$ ${taskDef.ryous}.`, 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao finalizar missão.', 'error');
    }

    finishingRefs.current.delete(taskDef.id);
  };

  useEffect(() => {
    if (!player || !tarefas.length) return;

    const activeMissions = Array.isArray(player.active_missions) ? player.active_missions : [];
    if (activeMissions.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const now = new Date();

      activeMissions.forEach(m => {
        const endTime = new Date(m.end_time);
        const diff = Math.floor((endTime - now) / 1000);

        if (diff <= 0 && !finishingRefs.current.has(m.mission_id)) {
          const taskDef = tarefas.find(t => t.id === m.mission_id);
          if (taskDef) {
            finishingRefs.current.add(m.mission_id);
            finishTask(taskDef);
          }
        }
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [player, tarefas]);

  return null;
}
