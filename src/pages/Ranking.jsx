import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const VILLAGES = {
  1: 'Folha',
  2: 'Areia',
  3: 'Névoa',
  4: 'Pedra',
  5: 'Nuvem',
  6: 'Som',
  7: 'Chuva'
};

export default function Ranking({ player }) {
  const [ranking, setRanking] = useState([]);
  const [filter, setFilter] = useState('geral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      let query = supabase
        .from('players')
        .select('name, class:classe, level, xp, village_id')
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
      setLoading(false);
    }

    fetchRanking();
  }, [filter, player]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div>
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow">Temporada IV</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Hall da Fama</h1>
        </div>
        <div className="filters">
          <div className={`filter ${filter === 'geral' ? 'active' : ''}`} onClick={() => setFilter('geral')} style={{ cursor: 'pointer' }}>Geral</div>
          <div className={`filter ${filter === 'vila' ? 'active' : ''}`} onClick={() => setFilter('vila')} style={{ cursor: 'pointer' }}>Por Vila</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>Carregando ninjas lendários...</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '16px', marginBottom: '48px', paddingTop: '40px' }}>
              {/* 2nd Place */}
              {top3[1] && (
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--paper)' }}>{top3[1].name}</div>
                  <div style={{ height: '140px', background: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '32px', color: '#cbd5e1' }}>2</div>
                </div>
              )}
              {/* 1st Place */}
              {top3[0] && (
                <div style={{ textAlign: 'center', width: '220px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: 'var(--gold)' }}>{top3[0].name}</div>
                  <div style={{ height: '180px', background: 'var(--ink-soft)', border: '1px solid var(--gold)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '40px', color: 'var(--gold)' }}>1</div>
                </div>
              )}
              {/* 3rd Place */}
              {top3[2] && (
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px', color: 'var(--paper)' }}>{top3[2].name}</div>
                  <div style={{ height: '120px', background: 'var(--ink-soft)', border: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '16px', fontSize: '28px', color: '#b45309' }}>3</div>
                </div>
              )}
            </div>
          )}

          <div className="list-head" style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr', gap: '16px', padding: '16px', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            <div>Pos.</div><div>Personagem</div><div>Vila</div><div>Nível</div><div>XP</div>
          </div>

          <div id="ranking-list">
            {ranking.map((p, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '60px 2fr 1fr 1fr 1fr', gap: '16px', padding: '16px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ color: index < 3 ? 'var(--gold)' : 'var(--muted)', fontWeight: index < 3 ? 'bold' : 'normal' }}>#{index + 1}</div>
                <div style={{ fontWeight: 600 }}>{p.name} <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 'normal' }}>[{p.class || 'NIN'}]</span></div>
                <div style={{ color: 'var(--muted)', fontSize: '13px' }}>{VILLAGES[p.village_id] || 'Desconhecida'}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.level}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--seal-bright)' }}>{p.xp}</div>
              </div>
            ))}
            {ranking.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>Nenhum ninja encontrado.</div>}
          </div>
        </>
      )}
    </div>
  );
}
