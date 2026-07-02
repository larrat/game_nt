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
  const SLOT_COST = Number(gameConfig?.mission_slot_cost) || 50; // Custo do novo Slot em Kuro Coins

  useEffect(() => {
    async function fetchMissions() {
      const { data } = await supabase.from('missions').select('*').eq('is_active', true).order('id', { ascending: true });
      if (data) {
        // Map database columns back to what the frontend expects
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
    if (!player?.active_missions || player.active_missions.length === 0) return;
    const interval = setInterval(() => {
      const now = new Date();
      setTimers(prev => {
        const next = { ...prev };
        player.active_missions.forEach(m => {
          const endTime = new Date(m.end_time);
          const diff = Math.floor((endTime - now) / 1000);
          next[m.mission_id] = diff > 0 ? diff : 0;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [player?.active_missions]);


  if (!player) return null;
  const tasksCompleted = player.tasks_completed || 0;

  const buySlot = () => {
    if (vipCoins < SLOT_COST) {
      addToast('Kuro Coins insuficientes. (Custa ' + SLOT_COST + ' 🪙)', 'error');
      return;
    }
    setShowBuySlotModal(true);
  };

  const confirmBuySlot = async () => {
    setShowBuySlotModal(false);
    setLoading(true);
    const { error } = await supabase.from('players').update({
      vip_coins: vipCoins - SLOT_COST,
      mission_slots: slots + 1
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao comprar slot.', 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast('Novo Slot desbloqueado com sucesso!', 'success');
    }
    setLoading(false);
  };

  const startTask = async (task) => {
    if (activeMissions.length >= slots) {
      addToast('Todos os seus Slots estão ocupados. Espere terminar ou compre mais!', 'error');
      return;
    }
    if (activeMissions.some(m => m.mission_id === task.id)) {
      addToast('Você já está realizando essa missão!', 'error');
      return;
    }

    setLoading(true);
    const endTime = new Date(Date.now() + task.time * 1000).toISOString();
    
    const newMission = { mission_id: task.id, end_time: endTime };
    const newActive = [...activeMissions, newMission];

    const { error } = await supabase.from('players').update({
      active_missions: newActive
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao iniciar missão.', 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast(`A missão "${task.title}" começou!`, 'success');
    }
    setLoading(false);
  };

  const abortTask = async (missionId) => {
    setLoading(true);
    const newActive = activeMissions.filter(m => m.mission_id !== missionId);

    const { error } = await supabase.from('players').update({
      active_missions: newActive
    }).eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
      addToast('Missão abortada.', 'info');
    }
    setLoading(false);
  };

  const finishTask = async (taskDef) => {
    setLoading(true);

    const newXp = player.xp + taskDef.xp;
    const newRyous = player.ryous + taskDef.ryous;
    const newTasksCount = player.tasks_completed + 1; // Para Tarefas Lineares
    const newLevel = calculateLevelFromXP(newXp);
    const levelsGained = newLevel > player.level ? newLevel - player.level : 0;
    const newPontos = (player.pontos_atributos || 0) + levelsGained;

    const newActive = activeMissions.filter(m => m.mission_id !== taskDef.id);
    
    // Atualiza contadores específicos no banco
    let updates = {
      xp: newXp,
      ryous: newRyous,
      level: newLevel,
      pontos_atributos: newPontos,
      active_missions: newActive
    };

    if (taskDef.type === 'tarefa_academia') updates.tasks_completed = (player.tasks_completed || 0) + 1;
    if (taskDef.type === 'D') updates.missions_d = (player.missions_d || 0) + 1;
    if (taskDef.type === 'C') updates.missions_c = (player.missions_c || 0) + 1;
    if (taskDef.type === 'B') updates.missions_b = (player.missions_b || 0) + 1;
    if (taskDef.type === 'A') updates.missions_a = (player.missions_a || 0) + 1;
    if (taskDef.type === 'S') updates.missions_s = (player.missions_s || 0) + 1;

    const { error } = await supabase.from('players').update(updates).eq('id', player.id);

    if (error) {
      addToast('Erro ao concluir missão.', 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast(`Missão concluída! +${taskDef.xp} XP / +${taskDef.ryous} RY`, 'success');
    }
    setLoading(false);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">Quadro de Avisos</div>
          <h1 className="page-title">Missões Ninja</h1>
          <div className="sub">Gerencie suas tarefas e missões oficiais da vila.</div>
        </div>
      </div>

      {/* Tabs de Ranks */}
      <div className="flex-row" style={{ gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px' }}>
        <button className={`btn-ghost ${activeTab === 'tarefa_academia' ? 'active' : ''}`} onClick={() => setActiveTab('tarefa_academia')}>Academia</button>
        {['genin', 'chunin', 'jounin', 'anbu', 'sannin', 'herói'].includes((player.rank || '').toLowerCase()) && (
          <>
            <button className={`btn-ghost ${activeTab === 'D' ? 'active' : ''}`} onClick={() => setActiveTab('D')}>Rank D</button>
            <button className={`btn-ghost ${activeTab === 'C' ? 'active' : ''}`} onClick={() => setActiveTab('C')}>Rank C</button>
          </>
        )}
        {['chunin', 'jounin', 'anbu', 'sannin', 'herói'].includes((player.rank || '').toLowerCase()) && (
          <button className={`btn-ghost ${activeTab === 'B' ? 'active' : ''}`} onClick={() => setActiveTab('B')}>Rank B</button>
        )}
        {['jounin', 'anbu', 'sannin', 'herói'].includes((player.rank || '').toLowerCase()) && (
          <button className={`btn-ghost ${activeTab === 'A' ? 'active' : ''}`} onClick={() => setActiveTab('A')}>Rank A</button>
        )}
        {['anbu', 'sannin', 'herói'].includes((player.rank || '').toLowerCase()) && (
          <button className={`btn-ghost ${activeTab === 'S' ? 'active' : ''}`} onClick={() => setActiveTab('S')}>Rank S</button>
        )}
      </div>

      {/* Slots & Missões Ativas */}
      <div className="card" style={{ marginBottom: '24px', background: 'var(--ink-soft)', border: '1px solid var(--gold)' }}>
        <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="gold flex-row" style={{ alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>👥</span> Slots de Times em Missão: {activeMissions.length} / {slots}
          </h3>
          <button className="btn-attr" onClick={buySlot} disabled={loading} style={{ background: 'rgba(212,162,42,0.1)', borderColor: 'var(--gold)', color: 'var(--gold)' }}>
            + Comprar Novo Slot (🪙 {SLOT_COST})
          </button>
        </div>

        <div className="grid-3" style={{ gap: '16px' }}>
          {/* Renderiza as missões ativas */}
          {activeMissions.map((activeM, idx) => {
            const tDef = tarefas.find(t => t.id === activeM.mission_id);
            if (!tDef) return null;
            
            const timeLeft = timers[activeM.mission_id] !== undefined ? timers[activeM.mission_id] : 0;
            const isDone = timeLeft <= 0;
            const progress = isDone ? 100 : ((tDef.time - timeLeft) / tDef.time) * 100;

            return (
              <div key={idx} style={{ background: 'var(--ink-card)', padding: '16px', borderRadius: '8px', border: isDone ? '1px solid #4ade80' : '1px solid var(--seal-bright)', position: 'relative', overflow: 'hidden' }}>
                <div className="flex-between" style={{ marginBottom: '8px', position: 'relative', zIndex: 2 }}>
                  <div className="paper uppercase" style={{ fontSize: '12px', fontWeight: 'bold' }}>{tDef.title}</div>
                  {isDone ? (
                    <span className="success mono" style={{ fontSize: '12px' }}>CONCLUÍDO</span>
                  ) : (
                    <span className="mono" style={{ color: 'var(--seal-bright)', fontSize: '14px', textShadow: '0 0 8px rgba(99,102,241,0.8)' }}>{formatTime(timeLeft)}</span>
                  )}
                </div>

                <div className="progress-track" style={{ height: '4px', marginBottom: '16px', position: 'relative', zIndex: 2, background: 'rgba(0,0,0,0.5)' }}>
                  <div className={`progress-fill ${isDone ? 'green' : 'blue'}`} style={{ width: `${progress}%`, transition: 'width 1s linear' }} />
                </div>

                <div className="flex-row" style={{ gap: '8px', position: 'relative', zIndex: 2 }}>
                  {isDone ? (
                    <button className="btn-primary" onClick={() => finishTask(tDef)} disabled={loading} style={{ flex: 1, padding: '6px' }}>
                      Resgatar Recompensa
                    </button>
                  ) : (
                    <button className="btn-ghost" onClick={() => abortTask(activeM.mission_id)} disabled={loading} style={{ flex: 1, padding: '6px', fontSize: '12px' }}>
                      Abortar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Renderiza Slots Vazios (se existirem) */}
          {Array.from({ length: Math.max(0, slots - activeMissions.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="flex-col" style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              <span style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}>🏕️</span>
              <span className="mono" style={{ fontSize: '12px', letterSpacing: '1px' }}>SLOT LIVRE</span>
              <span style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>Escolha uma missão abaixo para iniciar.</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de Missões */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead className="muted uppercase" style={{ fontSize: '11px', background: 'var(--ink)' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>Descrição</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Duração</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Recompensa</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tarefas.filter(t => t.type === activeTab).map((t, idx) => {
              const reqMet = player.level >= t.reqLevel;
              
              let playerCounter = 0;
              if (t.type === 'tarefa_academia') playerCounter = player.tasks_completed || 0;
              else if (t.type === 'D') playerCounter = player.missions_d || 0;
              else if (t.type === 'C') playerCounter = player.missions_c || 0;
              else if (t.type === 'B') playerCounter = player.missions_b || 0;
              else if (t.type === 'A') playerCounter = player.missions_a || 0;
              else if (t.type === 'S') playerCounter = player.missions_s || 0;

              const isCompleted = idx < playerCounter;
              const isLockedBySequence = idx > playerCounter;
              
              const isRunning = activeMissions.some(m => m.mission_id === t.id);

              return (
                <tr key={t.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--ink-soft)', opacity: (isCompleted || isLockedBySequence) ? 0.6 : 1 }}>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
                    <div className={isCompleted ? 'success' : (isLockedBySequence ? 'muted' : 'paper')} style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                      {isLockedBySequence ? '???' : t.title}
                    </div>
                    <div className="muted" style={{ fontSize: '12px', lineHeight: 1.4 }}>
                      {isLockedBySequence ? 'Conclua a missão anterior para desbloquear.' : t.desc}
                    </div>
                    {!isLockedBySequence && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: reqMet ? 'var(--gold)' : 'var(--danger)' }}>Requisito: Level {t.reqLevel}</div>
                    )}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                    {!isLockedBySequence && <span className="muted mono" style={{ fontSize: '12px' }}>{formatTime(t.time)}</span>}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center', fontSize: '12px' }}>
                    {!isLockedBySequence && (
                      <>
                        <div className="success">+{t.xp} XP</div>
                        <div className="info">+{t.ryous} RY</div>
                      </>
                    )}
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
                    {isRunning ? (
                      <span className="badge badge-blue">Em Andamento</span>
                    ) : isCompleted ? (
                      <span className="badge badge-green">✓ Concluída</span>
                    ) : isLockedBySequence ? (
                      <span className="badge badge-muted">🔒 Bloqueada</span>
                    ) : reqMet ? (
                      <button className="btn-ghost" onClick={() => startTask(t)} disabled={loading || activeMissions.length >= slots}>Iniciar</button>
                    ) : (
                      <span className="danger" style={{ fontSize: '12px' }}>Nível Insuf.</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Compra de Slot */}
      {showBuySlotModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3 className="card-title" style={{ fontSize: '20px', marginBottom: '16px' }}>Comprar Slot de Missão</h3>
            <p className="muted" style={{ marginBottom: '24px', lineHeight: '1.5' }}>
              Deseja comprar um novo Slot de Missão por <span className="gold">{SLOT_COST} Kuro Coins</span>?
            </p>
            <div className="flex-row" style={{ justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-ghost" onClick={() => setShowBuySlotModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmBuySlot}>Comprar Slot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
