import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const Ranks = [
  { id: "Estudante da Academia", next: "Genin" },
  {
    id: "Genin",
    icon: "🥷",
    title: "Genin",
    desc: "Seu primeiro dia depois da academia ninja. Você receberá sua bandana e poderá explorar o que está além dos portões da Vila.",
    reqs: [
      { label: "Nível 5 ou superior", check: (p) => p.level >= 5, progress: (p) => `${p.level}/5` },
      { label: "Completar 10 Tarefas Iniciais", check: (p) => p.tasks_completed >= 10, progress: (p) => `${p.tasks_completed}/10` },
      { label: "Ter 1 Jutsu Aprendido", check: (p) => p.activeJutsus?.length >= 1, progress: (p) => `${p.activeJutsus?.length || 0}/1` },
      { label: "Ter 5 Vitórias contra NPC", check: (p) => p.npc_wins >= 5, progress: (p) => `${p.npc_wins}/5` }
    ]
  },
  {
    id: "Chuunin",
    icon: "⚔️",
    title: "Chuunin",
    desc: "Ninja graduado e com elevado nível de confiança na Vila. Pode participar de equipes e torneios ninjas.",
    reqs: [
      { label: "Nível 15 ou superior", check: (p) => p.level >= 15, progress: (p) => `${p.level}/15` },
      { label: "Completar 10 Missões Rank D", check: (p) => p.missions_d >= 10, progress: (p) => `${p.missions_d}/10` },
      { label: "Ter 9 Jutsus Aprendidos", check: (p) => false, progress: () => `0/9` },
      { label: "Ter 75 Vitórias NPC", check: (p) => p.npc_wins >= 75, progress: (p) => `${p.npc_wins}/75` }
    ]
  }
];

export default function Graduacoes({ player, updatePlayer }) {
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);
  const [newRank, setNewRank] = useState('');

  if (!player) return <div>Carregando...</div>;

  const currentIndex = Ranks.findIndex(r => r.id === player.rank);
  const nextRank = Ranks[currentIndex + 1];

  let canGraduate = true;

  async function graduarPara(novoRank) {
    // Inicia a cerimônia de graduação (Modal tela cheia escurecido)
    setNewRank(novoRank);
    setIsCeremonyActive(true);

    // Faz o update no banco silenciosamente enquanto a animação rola
    const { error } = await supabase
      .from('players')
      .update({ rank: novoRank })
      .eq('id', player.id);

    if (error) {
      alert("Erro ao graduar: " + error.message);
      setIsCeremonyActive(false);
      return;
    }

    // Espera a animação terminar para atualizar o estado global
    setTimeout(() => {
      updatePlayer(player.user_id);
      setIsCeremonyActive(false);
    }, 5000); // 5 segundos de animação
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Academia Ninja</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Graduações</h1>
          <div className="sub">Prove seu valor e suba na hierarquia shinobi.</div>
        </div>
      </div>

      <div className="grad-container" style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
        {!nextRank ? (
          <div className="grad-card active" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--seal-bright)' }}>
            <div className="grad-icon" style={{ fontSize: '64px' }}>👑</div>
            <div className="grad-title" style={{ color: 'var(--seal-bright)', fontSize: '24px', margin: '16px 0' }}>Nível Máximo</div>
            <div className="grad-desc" style={{ color: 'var(--text-muted)' }}>Você alcançou o topo da hierarquia Ninja.</div>
          </div>
        ) : (
          <div className="grad-card active" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--seal-bright)', borderRadius: '8px', maxWidth: '400px' }}>
            <div className="grad-icon" style={{ fontSize: '64px' }}>{nextRank.icon}</div>
            <div className="grad-title" style={{ color: 'var(--seal-bright)', fontSize: '24px', margin: '16px 0' }}>{nextRank.title}</div>
            <div className="grad-desc" style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{nextRank.desc}</div>
            
            <div className="req-list" style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '6px', textAlign: 'left', marginBottom: '24px' }}>
              {nextRank.reqs.map((req, idx) => {
                const isMet = req.check(player);
                if (!isMet) canGraduate = false;
                return (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '13px', color: isMet ? '#4ade80' : '#ef4444' }}>
                    <span>{isMet ? '✓' : '✗'}</span>
                    <span>{req.label} ({req.progress(player)})</span>
                  </div>
                );
              })}
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', opacity: canGraduate ? 1 : 0.5, cursor: canGraduate ? 'pointer' : 'not-allowed' }}
              disabled={!canGraduate} 
              onClick={() => graduarPara(nextRank.id)}
            >
              <span>{canGraduate ? 'Realizar Exame Ninja' : 'Requisitos Incompletos'}</span>
              <div className="stamp"></div>
            </button>
          </div>
        )}
      </div>

      {/* CERIMÔNIA MODAL */}
      {isCeremonyActive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 1s forwards'
        }}>
          <div style={{
            fontSize: '100px',
            animation: 'zoomIn 2s forwards',
            filter: 'drop-shadow(0 0 30px rgba(230, 57, 70, 0.8))'
          }}>
            {Ranks.find(r => r.id === newRank)?.icon || '🥷'}
          </div>
          <h1 style={{
            fontFamily: "'Shippori Mincho', serif", 
            color: 'var(--seal-bright)', 
            fontSize: '48px', 
            marginTop: '30px',
            opacity: 0,
            animation: 'slideUpFade 1s forwards 1.5s'
          }}>
            Parabéns, {player.name}!
          </h1>
          <p style={{
            color: 'var(--paper)',
            fontSize: '20px',
            marginTop: '16px',
            opacity: 0,
            animation: 'slideUpFade 1s forwards 2.5s'
          }}>
            Você agora é oficialmente um {newRank} da sua Vila.
          </p>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUpFade { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </>
  );
}
