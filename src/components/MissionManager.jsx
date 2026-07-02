import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { calculateLevelFromXP } from '../utils/engine';
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

  const finishTask = async (taskDef, currentActive) => {
    if (!player) return;

    const newXp = player.xp + taskDef.xp;
    const newRyous = player.ryous + taskDef.ryous;
    const newTasksCount = (player.tasks_completed || 0) + 1; 
    const newLevel = calculateLevelFromXP(newXp);
    const levelsGained = newLevel > player.level ? newLevel - player.level : 0;
    const newPontos = (player.pontos_atributos || 0) + levelsGained;

    const newActive = currentActive.filter(m => m.mission_id !== taskDef.id);
    
    let updates = {
      xp: newXp,
      ryous: newRyous,
      tasks_completed: newTasksCount,
      level: newLevel,
      pontos_atributos: newPontos,
      active_missions: newActive
    };

    if (taskDef.type === 'tarefa_academia') updates.missions_d = (player.missions_d || 0) + 1;
    if (taskDef.type === 'missao_genin') updates.missions_c = (player.missions_c || 0) + 1;
    if (taskDef.type === 'missao_chunin') updates.missions_b = (player.missions_b || 0) + 1;
    if (taskDef.type === 'missao_jounin') updates.missions_a = (player.missions_a || 0) + 1;
    if (taskDef.type === 'missao_anbu') updates.missions_s = (player.missions_s || 0) + 1;

    const { error } = await supabase.from('players').update(updates).eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
      addToast(`Missão Concluída! Você recebeu ${taskDef.xp} XP e ${taskDef.ryous} Ryous.`, 'success');
      if (levelsGained > 0) {
        addToast(`Parabéns! Você subiu para o Nível ${newLevel}!`, 'success');
      }
    } else {
      addToast('Erro ao finalizar missão.', 'error');
    }
    
    // Remove do ref para permitir futuras execuções se o usuário pegar a mesma missão
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
      // O activeMissions aqui pega da closure do useEffect (que é atualizada toda vez que o player muda).
      // Então não precisamos nos preocupar com stale state desde que player seja dependência.
      
      activeMissions.forEach(m => {
        const endTime = new Date(m.end_time);
        const diff = Math.floor((endTime - now) / 1000);
        
        if (diff <= 0 && !finishingRefs.current.has(m.mission_id)) {
          const taskDef = tarefas.find(t => t.id === m.mission_id);
          if (taskDef) {
            finishingRefs.current.add(m.mission_id);
            finishTask(taskDef, activeMissions);
          }
        }
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [player, tarefas]);

  return null;
}
