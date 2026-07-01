import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { VILLAGES, KAGES } from '../constants';



export default function Ranking({ player }) {
  const [ranking, setRanking] = useState([]);
  const [kages, setKages] = useState({});
  const [filter, setFilter] = useState('geral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      let query = supabase
        .from('players')
        .select('name, class, level, xp, village_id')
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(50);

      if (filter === 'vila' && player) {
        query = query.eq('village_id', player.village_id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setRanking(data);
      }

      // Fetch kages for all villages
      const { data: allPlayers } = await supabase
        .from('players')
        .select('name, village_id')
        .order('level', { ascending: false })
        .order('xp', { ascending: false });
      
      const kageMap = {};
      if (allPlayers) {
        allPlayers.forEach(p => {
          if (!kageMap[p.village_id]) {
            kageMap[p.village_id] = p.name;
          }
        });
      }
      setKages(kageMap);

      setLoading(false);
    }

    fetchRanking();
  }, [filter, player]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="page">
      <PageHeader
        eyebrow='Temporada IV'
        title='Hall da Fama'
        actions={
          <div className="filters">
            <div className={`filter ${filter === 'geral' ? 'active' : ''}`} onClick={() => setFilter('geral')} style={{ cursor: 'pointer' }}>Geral</div>
            <div className={`filter ${filter === 'vila' ? 'active' : ''}`} onClick={() => setFilter('vila')} style={{ cursor: 'pointer' }}>Por Vila</div>

          </div>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Carregando ninjas lendários...</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '16px', marginBottom: '48px', paddingTop: '40px' }}>
              {/* 2nd Place */}
              {top3[1] && (
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div className="paper" style={{ fontSize: '18px', marginBottom: '8px' }}>{top3[1].name}</div>
                  <div className="card" style={{ height: '140px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '32px', color: '#cbd5e1' }}>2</div>
                </div>
              )}
              {/* 1st Place */}
              {top3[0] && (
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <div className="gold" style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                    {top3[0].name}
                    {top3[0].name === kages[top3[0].village_id] && (
                      <div style={{ marginTop: '4px' }}>
                        <span className="badge badge-gold">{KAGES[top3[0].village_id] || 'KAGE'}</span>
                      </div>
                    )}
                  </div>
                  <div className="card gold" style={{ height: '180px', border: '1px solid var(--gold)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '40px' }}>1</div>
                </div>
              )}
              {/* 3rd Place */}
              {top3[2] && (
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div className="paper" style={{ fontSize: '18px', marginBottom: '8px' }}>{top3[2].name}</div>
                  <div className="card" style={{ height: '120px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '28px', color: '#b45309' }}>3</div>
                </div>
              )}
            </div>
          )}

          <div className="list-head muted uppercase" style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr', gap: '16px', padding: '16px', borderBottom: '1px solid var(--line)', fontSize: '11px', letterSpacing: '1px' }}>
            <div>Pos.</div><div>Personagem</div><div>Vila</div><div>Nível</div><div>XP</div>
          </div>

          <div id="ranking-list">
            {ranking.map((p, index) => {
              const isMe = player && player.name === p.name;
              return (
              <div key={index} className="attr-row-item" style={{ 
                display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr', gap: '16px', alignItems: 'center',
                borderLeft: isMe ? '3px solid var(--gold)' : 'none',
                background: isMe ? 'rgba(212,162,42,0.1)' : 'transparent'
              }}>
                <div className={index < 3 ? 'gold' : 'muted'} style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>#{index + 1}</div>
                <div style={{ fontWeight: 600, color: isMe ? 'var(--gold)' : 'inherit' }}>
                  {p.name} <span className="muted" style={{ fontSize: '11px', fontWeight: 'normal', margin: '0 8px' }}>[{p.class || 'NIN'}]</span>
                  {p.name === kages[p.village_id] && (
                    <span className="badge badge-gold" style={{ marginLeft: '8px' }}>{KAGES[p.village_id] || 'KAGE'}</span>
                  )}
                </div>
                <div className="muted" style={{ fontSize: '13px' }}>{VILLAGES[p.village_id] || 'Desconhecida'}</div>
                <div className="mono">{p.level}</div>
                <div className="mono" style={{ color: 'var(--seal-bright)' }}>{p.xp}</div>
              </div>
              );
            })}
            {ranking.length === 0 && <div className="muted" style={{ textAlign: 'center', padding: '24px' }}>Nenhum ninja encontrado.</div>}
          </div>
        </>
      )}
    </div>
  );
}
