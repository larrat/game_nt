import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { calculateLevelFromXP } from '../utils/engine';

const TAREFAS = [
  { id: 1, title: "Primeira Lição", desc: "Seja bem vindo estudante. Hoje vamos dar início a sua vida como ninja...", reqLevel: 1, xp: 1782, ryous: 200, time: 15 },
  { id: 2, title: "Segunda Lição", desc: "Quem disse que sua caminhada para se tornar um Shinobi seria fácil?", reqLevel: 1, xp: 1800, ryous: 200, time: 15 },
  { id: 3, title: "Terceira Lição", desc: "Você esta indo bem! Mais algumas lições e você pode se tornar um Genin.", reqLevel: 2, xp: 1900, ryous: 200, time: 15 },
  { id: 4, title: "Quarta Lição", desc: "Parabéns, você esta aprendendo rápido e logo se tornará um grande ninja!", reqLevel: 2, xp: 1950, ryous: 200, time: 15 },
  { id: 5, title: "Quinta Lição", desc: "Sua vida vai começar a ficar mais perigosa, então tome mais cuidado.", reqLevel: 3, xp: 2000, ryous: 200, time: 15 },
  { id: 6, title: "Sexta Lição", desc: "Um verdadeiro ninja nunca foge de um combate.", reqLevel: 3, xp: 2200, ryous: 200, time: 15 },
  { id: 7, title: "Sétima Lição", desc: "Nunca perca o controle sobre seus sentimentos durante uma batalha.", reqLevel: 4, xp: 2500, ryous: 200, time: 15 },
  { id: 8, title: "Oitava Lição", desc: "O controle do chakra é o mais importante para o uso de qualquer jutsu.", reqLevel: 4, xp: 2800, ryous: 200, time: 15 },
  { id: 9, title: "Nona Lição", desc: "Você já está pronto para ir lutar.", reqLevel: 5, xp: 3000, ryous: 200, time: 15 },
  { id: 10, title: "Décima Lição", desc: "Esta é a sua prova final. Onde você terá que mostrar tudo o que aprendeu.", reqLevel: 5, xp: 3500, ryous: 200, time: 15 },
];

export default function Tarefas({ player, updatePlayer }) {
  const [activeTask, setActiveTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer = null;
    if (activeTask && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (activeTask && timeLeft === 0) {
      setIsDone(true);
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [activeTask, timeLeft]);

  if (!player) return null;

  const startTask = (task) => {
    setActiveTask(task);
    setTimeLeft(task.time);
    setIsDone(false);
  };

  const finishTask = async () => {
    if (!activeTask) return;
    setLoading(true);

    const newXp = player.xp + activeTask.xp;
    const newRyous = player.ryous + activeTask.ryous;
    const newTasksCount = player.tasks_completed + 1;
    const newLevel = calculateLevelFromXP(newXp);

    const { error } = await supabase
      .from('players')
      .update({
        xp: newXp,
        level: newLevel,
        ryous: newRyous,
        tasks_completed: newTasksCount
      })
      .eq('id', player.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      setLoading(false);
      return;
    }

    // Refresh and close
    await updatePlayer(player.user_id);
    setActiveTask(null);
    setIsDone(false);
    setLoading(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `00:${m}:${s}`;
  };

  // ACTIVE TASK VIEW
  if (activeTask) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h2 style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '14px', letterSpacing: '2px' }}>STATUS DA MISSÃO</h2>
        <div style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '32px', marginBottom: '24px', textTransform: 'uppercase' }}>
          {activeTask.title}
        </div>

        {!isDone ? (
          <div>
            <p style={{ color: 'var(--muted)' }}>Sua caminhada ninja está indo bem. O treinamento está em andamento...</p>
            <div style={{ fontSize: '48px', color: 'var(--seal-bright)', fontWeight: 'bold', margin: '20px 0', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: 'var(--muted)' }}>Sua caminhada ninja está indo bem. Parabéns, a lição está finalizada!</p>
            <p style={{ marginTop: '8px' }}>Como recompensa você receberá:</p>
            <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '24px', borderRadius: '8px', display: 'inline-block', textAlign: 'left', marginTop: '20px' }}>
              <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '8px' }}>+ {activeTask.xp} Pontos de Experiência</div>
              <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>+ RY$ {activeTask.ryous.toFixed(2)}</div>
            </div>
            <br /><br />
            <button className="btn-primary" onClick={finishTask} disabled={loading}>
              <span>{loading ? 'Recebendo...' : 'Finalizar e Receber'}</span>
              <div className="stamp"></div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // LIST VIEW
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="eyebrow">Academia</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Tarefas Iniciais</h1>
          <div className="sub">Complete o treinamento básico da sua Vila.</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ background: 'var(--ink)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>Descrição</th>
              <th style={{ background: 'var(--ink)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Duração</th>
              <th style={{ background: 'var(--ink)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Recompensa</th>
              <th style={{ background: 'var(--ink)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Level</th>
              <th style={{ background: 'var(--ink)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--line)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {TAREFAS.map((t, idx) => {
              const reqMet = player.level >= t.reqLevel;
              return (
                <tr key={t.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--ink-soft)' }}>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', verticalAlign: 'top' }}>
                    <div style={{ color: 'var(--seal-bright)', fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{t.title}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '12px', lineHeight: 1.4 }}>{t.desc}</div>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>00:00:{t.time}</span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center', verticalAlign: 'middle', fontSize: '12px' }}>
                    <div style={{ color: '#4ade80' }}>+{t.xp} XP</div>
                    <div style={{ color: '#3b82f6' }}>+{t.ryous} RY</div>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center', verticalAlign: 'middle', fontSize: '13px' }}>
                    <span style={{ color: reqMet ? 'var(--paper)' : '#ef4444' }}>{t.reqLevel}</span>
                  </td>
                  <td style={{ padding: '16px', borderBottom: '1px solid var(--line)', textAlign: 'center', verticalAlign: 'middle' }}>
                    {reqMet ? (
                      <button className="btn-ghost" onClick={() => startTask(t)}>Aceitar Missão</button>
                    ) : (
                      <span style={{ color: '#ef4444', fontSize: '12px' }}>Level Insuficiente</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
