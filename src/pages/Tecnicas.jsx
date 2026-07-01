import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

// Helper para checar rank
const rankValue = (rank) => {
  if (!rank) return 0;
  const r = rank.toLowerCase();
  if (r.includes('estudante')) return 0;
  if (r.includes('genin')) return 1;
  if (r.includes('chunin')) return 2;
  if (r.includes('jounin')) return 3;
  if (r.includes('anbu')) return 4;
  if (r.includes('kage') || r.includes('lider')) return 5;
  return 0;
};

const CATEGORIES = ['Todos', 'Ninjutsu', 'Taijutsu', 'Genjutsu', 'Geral'];

export default function Tecnicas({ player, updatePlayer }) {
  const [allJutsus, setAllJutsus] = useState([]);
  const [tab, setTab] = useState('tecnicas');
  const [filterCat, setFilterCat] = useState('Todos');
  const [learnMsg, setLearnMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  // Jutsus já aprendidos (salvos como array JSON no campo player.jutsus_learned)
  const learnedIds = Array.isArray(player.jutsus_learned) ? player.jutsus_learned : [];

  useEffect(() => {
    async function fetchJutsus() {
      const { data } = await supabase.from('jutsus').select('*').eq('is_active', true).order('id', { ascending: true });
      if (data) {
        const formatted = data.map(j => ({
          id: j.id,
          lvl: j.req_level,
          name: j.name,
          reqRank: j.req_rank,
          desc: j.description,
          type: j.type,
          cost: j.cost_ryous,
          chakraCost: j.chakra_cost,
          damage: j.damage,
          accuracy: j.accuracy,
          category: j.category
        }));
        setAllJutsus(formatted);
      }
    }
    fetchJutsus();
  }, []);

  const handleLearn = async (jutsu) => {
    if (learnedIds.includes(jutsu.id)) {
      setLearnMsg({ type: 'info', text: `Você já conhece ${jutsu.name}!` });
      return;
    }
    if (player.level < jutsu.lvl) {
      setLearnMsg({ type: 'error', text: `Nível insuficiente! Precisa de Nv.${jutsu.lvl}.` });
      return;
    }
    if (jutsu.reqRank && rankValue(player.rank) < rankValue(jutsu.reqRank)) {
      setLearnMsg({ type: 'error', text: `Graduação insuficiente! Precisa ser ${jutsu.reqRank}.` });
      return;
    }
    if (player.ryous < jutsu.cost) {
      setLearnMsg({ type: 'error', text: `Ryous insuficientes! Precisa de RY$ ${jutsu.cost}.` });
      return;
    }

    setLoading(true);
    const newLearned = [...learnedIds, jutsu.id];
    const newRyous = player.ryous - jutsu.cost;

    const { error } = await supabase
      .from('players')
      .update({ jutsus_learned: newLearned, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      player.jutsus_learned = newLearned;
      player.ryous = newRyous;
      setLearnMsg({ type: 'success', text: `${jutsu.name} aprendido! (Salvo localmente)` });
    } else {
      await updatePlayer(player.user_id);
      setLearnMsg({ type: 'success', text: `${jutsu.name} aprendido com sucesso! -RY$ ${jutsu.cost}` });
    }

    setLoading(false);
    setTimeout(() => setLearnMsg(null), 4000);
  };

  const handleBulkLearn = async () => {
    // Apenas filtra o que ele AINDA NÃO TEM e PODE COMPRAR (Lv + Rank)
    const availableToLearn = allJutsus.filter(j => 
      !learnedIds.includes(j.id) && 
      player.level >= j.lvl && 
      (!j.reqRank || rankValue(player.rank) >= rankValue(j.reqRank))
    );

    if (availableToLearn.length === 0) {
      setLearnMsg({ type: 'info', text: 'Você já aprendeu tudo que estava disponível para o seu nível/graduação!' });
      return;
    }

    // Calcula o custo total
    const totalCost = availableToLearn.reduce((sum, j) => sum + j.cost, 0);

    if (player.ryous < totalCost) {
      setLearnMsg({ type: 'error', text: `Você precisa de RY$ ${totalCost} para aprender as ${availableToLearn.length} técnicas disponíveis.` });
      return;
    }

    if (!window.confirm(`Aprender ${availableToLearn.length} jutsus de uma vez por RY$ ${totalCost}?`)) return;

    setLoading(true);
    
    const newLearnedIds = [...learnedIds, ...availableToLearn.map(j => j.id)];
    const newRyous = player.ryous - totalCost;

    const { error } = await supabase
      .from('players')
      .update({ jutsus_learned: newLearnedIds, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      setLearnMsg({ type: 'error', text: 'Erro ao aprender em massa: ' + error.message });
    } else {
      await updatePlayer(player.user_id);
      setLearnMsg({ type: 'success', text: `Prodígio da Academia ativado! Você aprendeu ${availableToLearn.length} jutsus por RY$ ${totalCost}!` });
    }
    setLoading(false);
    setTimeout(() => setLearnMsg(null), 4000);
  };

  const filtered = filterCat === 'Todos'
    ? ALL_JUTSUS
    : ALL_JUTSUS.filter(j => j.category === filterCat);

  return (
    <div className="page">
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '32px' }}>
        <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div className="flex-row" style={{ alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '24px', height: '1px', background: 'var(--seal-bright)' }} />
              <span className="mono gold uppercase" style={{ fontSize: '10px', letterSpacing: '3px' }}>
                {player.name} · Graduação: {player.rank}
              </span>
            </div>
            <h1 className="page-title">Academia Ninja</h1>
            <p className="muted" style={{ fontSize: '13px', marginTop: '6px' }}>
              Aprenda jutsus usando Ryous. Jutsus aprendidos ficam disponíveis no combate.
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted mono uppercase" style={{ fontSize: '10px', letterSpacing: '2px', marginBottom: '4px' }}>RYOUS</div>
            <div className="gold mono" style={{ fontSize: '24px' }}>RY$ {player.ryous || 0}</div>
          </div>
        </div>
        <div className="divider-glow" style={{ marginTop: '20px' }} />
      </div>

      {/* TABS */}
      <div className="tabs" style={{ marginBottom: '32px' }}>
        <div className={`tab ${tab === 'tecnicas' ? 'active' : ''}`} onClick={() => setTab('tecnicas')} style={{ cursor: 'pointer' }}>Técnicas</div>
        <div className={`tab ${tab === 'aprendidas' ? 'active' : ''}`} onClick={() => setTab('aprendidas')} style={{ cursor: 'pointer' }}>
          Aprendidas <span style={{ marginLeft: '6px', background: 'var(--seal-glow)', border: '1px solid var(--seal-bright)', color: 'var(--seal-bright)', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>{learnedIds.length}</span>
        </div>
      </div>

      {/* TOAST DE FEEDBACK */}
      {learnMsg && (
        <div style={{
          marginBottom: '24px', padding: '14px 20px', borderRadius: '8px',
          background: learnMsg.type === 'success' ? 'rgba(76,206,128,0.08)' : learnMsg.type === 'error' ? 'rgba(224,54,63,0.08)' : 'rgba(212,162,42,0.08)',
          border: `1px solid ${learnMsg.type === 'success' ? 'rgba(76,206,128,0.4)' : learnMsg.type === 'error' ? 'var(--seal-bright)' : 'var(--gold)'}`,
          color: learnMsg.type === 'success' ? '#4cce80' : learnMsg.type === 'error' ? 'var(--seal-bright)' : 'var(--gold)',
          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          {learnMsg.type === 'success' ? '✅' : learnMsg.type === 'error' ? '❌' : 'ℹ️'}
          {learnMsg.text}
        </div>
      )}

      {/* LISTA DE TÉCNICAS */}
      {tab === 'tecnicas' && (
        <>
          {/* Filtros por categoria e Bulk Learn */}
          <div className="flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="flex-row" style={{ gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className="mono uppercase"
                  style={{
                    padding: '6px 16px', borderRadius: '4px', fontSize: '11px', letterSpacing: '1px',
                    cursor: 'pointer', border: '1px solid',
                    transition: 'all 0.2s',
                    borderColor: filterCat === cat ? 'var(--seal-bright)' : 'var(--line)',
                    background: filterCat === cat ? 'var(--seal-glow)' : 'transparent',
                    color: filterCat === cat ? 'var(--seal-bright)' : 'var(--muted)',
                  }}
                >{cat}</button>
              ))}
            </div>

            {/* Vantagem VIP: Prodígio da Academia */}
            <button 
              className="btn-ghost" 
              onClick={handleBulkLearn}
              disabled={loading}
              style={{ borderColor: 'var(--gold)', color: 'var(--gold)', padding: '6px 16px', fontSize: '12px' }}
              title="Vantagem VIP: Aprender todos os Jutsus disponíveis para você de uma vez"
            >
              🌟 Aprender Todos (VIP)
            </button>
          </div>

          <div className="grid-auto" style={{ gap: '16px' }}>
            {allJutsus.filter(j => filterCat === 'Todos' || j.category === filterCat).map(jutsu => {
              const isUnlockedLvl = player.level >= jutsu.lvl;
              const isUnlockedRank = !jutsu.reqRank || rankValue(player.rank) >= rankValue(jutsu.reqRank);
              const isUnlocked = isUnlockedLvl && isUnlockedRank;
              const isLearned = learnedIds.includes(jutsu.id);
              const canAfford = player.ryous >= jutsu.cost;

              return (
                <div key={jutsu.id} className="card" style={{
                  border: `1px solid ${isLearned ? 'rgba(76,206,128,0.3)' : isUnlocked ? 'var(--line-bright)' : 'var(--line)'}`,
                  opacity: isUnlocked ? 1 : 0.5,
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {isLearned && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #4cce80, transparent)' }} />
                  )}

                  <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div className={`mono uppercase ${isUnlocked ? 'gold' : 'muted'}`} style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
                      NV.{jutsu.lvl} {jutsu.reqRank ? `· ${jutsu.reqRank} ` : ''}· {jutsu.type}
                    </div>
                    {isLearned && (
                      <span className="badge badge-green" style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>✓ APRENDIDO</span>
                    )}
                  </div>

                  <h4 className={`card-title ${isUnlocked ? 'paper' : 'muted'}`} style={{ fontSize: '18px', marginBottom: '8px' }}>
                    {jutsu.name}
                  </h4>
                  <p className="muted" style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                    {jutsu.desc}
                  </p>

                  {jutsu.damage > 0 && (
                    <div className="mono flex-row" style={{ gap: '12px', marginBottom: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
                      <span className="danger">⚔ DMG: {jutsu.damage}</span>
                      <span className="info">💧 CP: -{jutsu.chakraCost}</span>
                      <span className="gold">🎯 Prec: {jutsu.accuracy}%</span>
                    </div>
                  )}

                  <div className="flex-between" style={{ alignItems: 'center' }}>
                    <div className={`mono ${canAfford && isUnlocked ? 'gold' : 'muted'}`} style={{ fontSize: '12px' }}>
                      RY$ {jutsu.cost}
                    </div>

                    {isLearned ? (
                      <div className="success" style={{ fontSize: '12px' }}>✓ Disponível no Combate</div>
                    ) : isUnlocked ? (
                      <button
                        className="btn-ghost"
                        onClick={() => handleLearn(jutsu)}
                        disabled={loading || !canAfford}
                        style={{
                          padding: '8px 16px',
                          opacity: canAfford ? 1 : 0.4,
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          fontSize: '11px',
                        }}
                      >
                        {!canAfford ? 'Ryous Insuficientes' : 'Aprender Jutsu'}
                      </button>
                    ) : (
                      <div className="mono danger" style={{ fontSize: '11px' }}>
                        🔒 Requer {!isUnlockedLvl ? `Nv.${jutsu.lvl}` : jutsu.reqRank}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* APRENDIDAS */}
      {tab === 'aprendidas' && (
        <div>
          {learnedIds.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
              <div className="card-title" style={{ fontSize: '18px', marginBottom: '8px' }}>Nenhum jutsu aprendido</div>
              <div style={{ fontSize: '13px' }}>Vá até "Técnicas" e compre seus primeiros jutsus com Ryous.</div>
            </div>
          ) : (
            <div className="grid-auto" style={{ gap: '16px' }}>
              {allJutsus.filter(j => learnedIds.includes(j.id)).map(jutsu => (
                <div key={jutsu.id} className="card" style={{
                  border: '1px solid rgba(76,206,128,0.25)',
                  borderTop: '2px solid rgba(76,206,128,0.5)',
                }}>
                  <div className="mono gold uppercase" style={{ fontSize: '10px', letterSpacing: '1.5px', marginBottom: '8px' }}>
                    {jutsu.type} · {jutsu.category}
                  </div>
                  <h4 className="card-title" style={{ fontSize: '17px', marginBottom: '8px' }}>{jutsu.name}</h4>
                  <p className="muted" style={{ fontSize: '12px', lineHeight: '1.6' }}>{jutsu.desc}</p>
                  {jutsu.damage > 0 && (
                    <div className="mono flex-row" style={{ marginTop: '12px', gap: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
                      <span className="danger">⚔ DMG: {jutsu.damage}</span>
                      <span className="info">💧 CP: -{jutsu.chakraCost}</span>
                      <span className="gold">🎯 Prec: {jutsu.accuracy}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
