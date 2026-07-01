import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

export default function Graduacoes({ player, updatePlayer }) {
  const [ranksData, setRanksData] = useState([]);
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);
  const [newRank, setNewRank] = useState('');

  React.useEffect(() => {
    async function fetchRanks() {
      const { data } = await supabase.from('ranks').select('*').order('id', { ascending: true });
      if (data) {
        const mappedRanks = data.map(r => {
          const reqs = [];
          if (r.req_level > 0) reqs.push({ label: `Nível ${r.req_level} ou superior`, check: (p) => p.level >= r.req_level, progress: (p) => `${p.level}/${r.req_level}` });
          if (r.req_tasks > 0) reqs.push({ label: `Completar ${r.req_tasks} Tarefas`, check: (p) => (p.tasks_completed || 0) >= r.req_tasks, progress: (p) => `${p.tasks_completed || 0}/${r.req_tasks}` });
          if (r.req_jutsus > 0) reqs.push({ label: `Ter ${r.req_jutsus} Jutsus Aprendidos`, check: (p) => (p.jutsus_learned?.length || 0) >= r.req_jutsus, progress: (p) => `${p.jutsus_learned?.length || 0}/${r.req_jutsus}` });
          if (r.req_npc_wins > 0) reqs.push({ label: `Ter ${r.req_npc_wins} Vitórias contra NPC`, check: (p) => (p.npc_wins || 0) >= r.req_npc_wins, progress: (p) => `${p.npc_wins || 0}/${r.req_npc_wins}` });
          if (r.req_missions_d > 0) reqs.push({ label: `Completar ${r.req_missions_d} Missões Rank D`, check: (p) => (p.missions_d || 0) >= r.req_missions_d, progress: (p) => `${p.missions_d || 0}/${r.req_missions_d}` });
          if (r.req_missions_c > 0) reqs.push({ label: `Completar ${r.req_missions_c} Missões Rank C`, check: (p) => (p.missions_c || 0) >= r.req_missions_c, progress: (p) => `${p.missions_c || 0}/${r.req_missions_c}` });
          if (r.req_missions_b > 0) reqs.push({ label: `Completar ${r.req_missions_b} Missões Rank B`, check: (p) => (p.missions_b || 0) >= r.req_missions_b, progress: (p) => `${p.missions_b || 0}/${r.req_missions_b}` });
          if (r.req_missions_a > 0) reqs.push({ label: `Completar ${r.req_missions_a} Missões Rank A`, check: (p) => (p.missions_a || 0) >= r.req_missions_a, progress: (p) => `${p.missions_a || 0}/${r.req_missions_a}` });
          if (r.req_missions_s > 0) reqs.push({ label: `Completar ${r.req_missions_s} Missões Rank S`, check: (p) => (p.missions_s || 0) >= r.req_missions_s, progress: (p) => `${p.missions_s || 0}/${r.req_missions_s}` });
          
          return {
            id: r.name_id,
            iconSrc: r.icon_src,
            title: r.title,
            desc: r.description,
            reqs: reqs
          };
        });
        setRanksData(mappedRanks);
      }
    }
    fetchRanks();
  }, []);

  if (!player || ranksData.length === 0) return <div>Carregando...</div>;

  const currentIndex = ranksData.findIndex(r => r.id === player.rank);
  const nextRank = ranksData[currentIndex + 1];

  let canGraduate = true;

  async function graduarPara(novoRank) {
    setNewRank(novoRank);
    setIsCeremonyActive(true);

    const { error } = await supabase
      .from('players')
      .update({ rank: novoRank })
      .eq('id', player.id);

    if (error) {
      alert("Erro ao graduar: " + error.message);
      setIsCeremonyActive(false);
      return;
    }

    setTimeout(() => {
      updatePlayer(player.user_id);
      setIsCeremonyActive(false);
    }, 5000);
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
            <div className="grad-icon" style={{ fontSize: '64px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80px' }}>
              {nextRank.iconSrc ? (
                <img src={nextRank.iconSrc} alt={nextRank.title} style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} />
              ) : (
                <span>🥷</span>
              )}
            </div>
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

      {isCeremonyActive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 1s forwards'
        }}>
          <div style={{
            fontSize: '100px',
            marginBottom: '24px',
            animation: 'zoomIn 2s forwards',
            filter: 'drop-shadow(0 0 30px rgba(230, 57, 70, 0.8))'
          }}>
            {ranksData.find(r => r.id === newRank)?.iconSrc ? (
              <img src={ranksData.find(r => r.id === newRank).iconSrc} alt={newRank} style={{ maxWidth: '150px', maxHeight: '150px' }} />
            ) : (
              <span>🥷</span>
            )}
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
