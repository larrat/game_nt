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
            <div className={`filter cursor-pointer ${filter === 'geral' ? 'active' : ''}`} onClick={() => setFilter('geral')}>Geral</div>
            <div className={`filter cursor-pointer ${filter === 'vila' ? 'active' : ''}`} onClick={() => setFilter('vila')}>Por Vila</div>

          </div>
        }
      />

      {loading ? (
      {loading ? (
        <div className="text-center py-10">Carregando ninjas lendários...</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium flex-row justify-center items-end gap-md mb-8 pt-6">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="text-center podium-col">
                  <div className="paper text-lg mb-2">{top3[1].name}</div>
                  <div className="card flex-col items-center justify-start pt-4 text-4xl text-blue podium-bar-2">2</div>
                </div>
              )}
              {/* 1st Place */}
              {top3[0] && (
                <div className="text-center podium-col">
                  <div className="gold text-xl font-bold mb-2">
                    {top3[0].name}
                    {top3[0].name === kages[top3[0].village_id] && (
                      <div className="mt-1">
                        <span className="badge badge-gold">{KAGES[top3[0].village_id] || 'KAGE'}</span>
                      </div>
                    )}
                  </div>
                  <div className="card gold flex-col items-center justify-start pt-4 text-5xl border-line-solid border-gold podium-bar-1" style={{ borderWidth: '1px' }}>1</div>
                </div>
              )}
              {/* 3rd Place */}
              {top3[2] && (
                <div className="text-center podium-col">
                  <div className="paper text-lg mb-2">{top3[2].name}</div>
                  <div className="card flex-col items-center justify-start pt-4 text-3xl text-red podium-bar-3">3</div>
                </div>
              )}
            </div>
          )}

          <div className="list-head muted uppercase grid-ranking items-center gap-sm p-4 border-line-solid border-b text-xs tracking-wide" style={{ borderBottomWidth: '1px' }}>
            <div>Pos.</div><div>Personagem</div><div>Vila</div><div>Nível</div><div>XP</div>
          </div>

          <div id="ranking-list">
            {ranking.map((p, index) => {
              const isMe = player && player.name === p.name;
              return (
              <div key={index} className={`attr-row-item grid-ranking gap-sm items-center ${isMe ? 'bg-gold-transparent border-l-3 border-gold' : ''}`} style={{ borderLeftStyle: isMe ? 'solid' : 'none', borderLeftWidth: isMe ? '3px' : '0px' }}>
                <div className={index < 3 ? 'gold font-bold' : 'muted'}>#{index + 1}</div>
                <div className={isMe ? 'gold font-bold' : 'font-bold'}>
                  {p.name} <span className="muted text-xs mx-2 font-normal">[{p.class || 'NIN'}]</span>
                  {p.name === kages[p.village_id] && (
                    <span className="badge badge-gold ml-2">{KAGES[p.village_id] || 'KAGE'}</span>
                  )}
                </div>
                <div className="muted text-sm">{VILLAGES[p.village_id] || 'Desconhecida'}</div>
                <div className="mono">{p.level}</div>
                <div className="mono text-seal-bright">{p.xp}</div>
              </div>
              );
            })}
            {ranking.length === 0 && <div className="muted text-center py-6">Nenhum ninja encontrado.</div>}
          </div>
        </>
      )}
    </div>
  );
}
