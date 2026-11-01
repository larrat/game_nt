import { CURRENT_SEASON_LABEL } from '../utils/season';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import '../styles/challenges-v4.css';
import { VILLAGES, KAGES } from '../constants';



export default function Ranking({ player }) {
  const [ranking, setRanking] = useState([]);
  const [kages, setKages] = useState({});
  const [filter, setFilter] = useState('geral');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      const [rankResult, leadersResult] = await Promise.all([
        supabase.rpc('listar_perfis_ninja', {
          p_village_id: filter === 'vila' && player ? player.village_id : null,
          p_limit: 50
        }),
        supabase.rpc('listar_lideres_vila')
      ]);
      setRanking(rankResult.error ? [] : (rankResult.data || []));
      const kageMap = {};
      if (!leadersResult.error) {
        (leadersResult.data || []).forEach(p => { kageMap[p.village_id] = p.name; });
      }
      setKages(kageMap);
      setLoading(false);
    }

    fetchRanking();
  }, [filter, player]);

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="page kuro-ranking-v4">
      <PageHeader
        eyebrow={CURRENT_SEASON_LABEL}
        title='Hall da Fama'
        actions={
          <div className="filters">
            <button type="button" aria-pressed={filter === 'geral'} onClick={() => setFilter('geral')}>Geral</button>
            <button type="button" aria-pressed={filter === 'vila'} onClick={() => setFilter('vila')}>Por Vila</button>

          </div>
        }
      />

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
                  <div className="card gold flex-col items-center justify-start pt-4 text-5xl border-line-solid border-gold podium-bar-1 border">1</div>
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

          <div className="kuro-ranking-v4__scroll"><div className="list-head muted uppercase grid-ranking items-center gap-sm p-4 border-line-solid border-b text-xs tracking-wide">
            <div>Pos.</div><div>Personagem</div><div>Vila</div><div>Nível</div><div>XP</div>
          </div>

          <div id="ranking-list">
            {ranking.map((p, index) => {
              const isMe = player && player.name === p.name;
              return (
              <div key={index} className={`attr-row-item grid-ranking gap-sm items-center border-l-3 ${isMe ? 'bg-gold-transparent border-gold' : 'border-transparent'}`}>
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
          </div></div>
        </>
      )}
    </div>
  );
}
