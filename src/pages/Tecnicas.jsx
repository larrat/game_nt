import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import JutsuIcon from '../components/JutsuIcon';

const rankValue = (rank) => {
  if (!rank) return 0;
  const r = rank.toLowerCase();
  if (r.includes('estudante')) return 0;
  if (r.includes('genin')) return 1;
  if (r.includes('chunin')) return 2;
  if (r.includes('jounin')) return 3;
  if (r.includes('anbu')) return 4;
  if (r.includes('sannin') || r.includes('sanin')) return 5;
  if (r.includes('heroi') || r.includes('herói')) return 6;
  return 0;
};

const CATEGORIES = ['Todos', 'Ninjutsu', 'Taijutsu', 'Genjutsu', 'Bukijutsu'];

export default function Tecnicas({ player, updatePlayer }) {
  const [allJutsus, setAllJutsus] = useState([]);
  const [tab, setTab] = useState('tecnicas');
  const [filterCat, setFilterCat] = useState('Todos');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Early return moved below hooks
  // Jutsus já aprendidos (agora suporta objetos {id, level, slots})
  const rawLearned = Array.isArray(player?.jutsus_learned) ? player.jutsus_learned : [];
  const learnedIds = rawLearned.map(j => typeof j === 'string' ? j : j.id);
  const equippedJutsus = Array.isArray(player?.equipped_jutsus) ? player.equipped_jutsus : [];
  const MAX_EQUIPPED = 4;

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
          category: j.category,
          reqAttrValue: j.req_attr_value,
          reqSeals: j.req_seals,
          cooldown: j.cooldown,
          element: j.element
        }));
        setAllJutsus(formatted);
      }
    }
    fetchJutsus();
  }, []);

  const handleLearn = async (jutsu) => {
    if (learnedIds.includes(jutsu.id)) {
      addToast(`Você já conhece ${jutsu.name}!`, 'info');
      return;
    }
    if (player.level < jutsu.lvl) {
      addToast(`Nível insuficiente! Precisa de Nv.${jutsu.lvl}.`, 'error');
      return;
    }
    if (jutsu.reqRank && rankValue(player.rank) < rankValue(jutsu.reqRank)) {
      addToast(`Graduação insuficiente! Precisa ser ${jutsu.reqRank}.`, 'error');
      return;
    }
    // Trava de Maestria (Lote 4)
    // Trava de Maestria (Lote 4)
    const playerMastery = player?.[jutsu.category.toLowerCase()] || 0;
    if (jutsu.reqAttrValue && playerMastery < jutsu.reqAttrValue) {
      addToast(`Maestria insuficiente! Você precisa de ${jutsu.reqAttrValue} em ${jutsu.category}.`, 'error');
      return;
    }
    if (player?.ryous < jutsu.cost) {
      addToast(`Ryous insuficientes! Precisa de RY$ ${jutsu.cost}.`, 'error');
      return;
    }

    setLoading(true);
    const newLearned = [...rawLearned, { id: jutsu.id, level: 1, slots: [null, null, null] }];
    const newRyous = player.ryous - jutsu.cost;

    const { error } = await supabase
      .from('players')
      .update({ jutsus_learned: newLearned, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao aprender jutsu: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast(`${jutsu.name} aprendido com sucesso! -RY$ ${jutsu.cost}`, 'success');
    }

    setLoading(false);
  };

  const handleBulkLearn = async () => {
    // Apenas filtra o que ele AINDA NÃO TEM e PODE COMPRAR (Lv + Rank)
    const availableToLearn = allJutsus.filter(j =>
      !learnedIds.includes(j.id) &&
      player.level >= j.lvl &&
      (!j.reqRank || rankValue(player.rank) >= rankValue(j.reqRank)) &&
      (!j.element || j.element === player?.element)
    );

    if (availableToLearn.length === 0) {
      addToast('Você já aprendeu tudo que estava disponível para o seu nível/graduação!', 'info');
      setConfirmBulk(false);
      return;
    }

    // VERIFICAR VIP
    if (!player.is_vip) {
      addToast('Aprender em massa é um recurso exclusivo para jogadores VIP!', 'error');
      return;
    }

    // Calcula o custo total
    const totalCost = availableToLearn.reduce((sum, j) => sum + j.cost, 0);

    if (player.ryous < totalCost) {
      addToast(`Você precisa de RY$ ${totalCost} para aprender as ${availableToLearn.length} técnicas disponíveis.`, 'error');
      setConfirmBulk(false);
      return;
    }

    if (!confirmBulk) {
      addToast(`Atenção: Aprender ${availableToLearn.length} jutsus de uma vez custará RY$ ${totalCost}. Clique novamente para confirmar.`, 'info');
      setConfirmBulk(true);
      setTimeout(() => setConfirmBulk(false), 3000);
      return;
    }
    setConfirmBulk(false);

    setLoading(true);

    const newObjs = availableToLearn.map(j => ({ id: j.id, level: 1, slots: [null, null, null] }));
    const newLearned = [...rawLearned, ...newObjs];
    const newRyous = player.ryous - totalCost;

    const { error } = await supabase
      .from('players')
      .update({ jutsus_learned: newLearned, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao aprender em massa: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast(`Prodígio da Academia ativado! Você aprendeu ${availableToLearn.length} jutsus por RY$ ${totalCost}!`, 'success');
    }
    setLoading(false);
  };

  const handleToggleEquip = async (jutsuId) => {
    if (loading) return;
    setLoading(true);
    let newEquipped = [...equippedJutsus];

    if (newEquipped.includes(jutsuId)) {
      newEquipped = newEquipped.filter(id => id !== jutsuId);
    } else {
      if (newEquipped.length >= MAX_EQUIPPED) {
        addToast(`Você só pode equipar no máximo ${MAX_EQUIPPED} jutsus!`, 'error');
        setLoading(false);
        return;
      }
      newEquipped.push(jutsuId);
    }

    const { error } = await supabase.from('players').update({ equipped_jutsus: newEquipped }).eq('id', player.id);
    if (!error) {
      await updatePlayer(player.user_id);
      addToast(newEquipped.includes(jutsuId) ? 'Jutsu equipado!' : 'Jutsu desequipado.', 'success');
    } else {
      addToast('Erro ao equipar jutsu.', 'error');
    }
    setLoading(false);
  };

  if (!player) return null;

  return (
    <div className="page">
      {/* PAGE HEADER */}
      <PageHeader
        eyebrow={`${player.name} · Graduação: ${player.rank}`}
        title="Academia Ninja"
        subtitle="Aprenda jutsus usando Ryous. Jutsus aprendidos ficam disponíveis no combate."
        actions={
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="muted mono uppercase" style={{ fontSize: '10px', letterSpacing: '2px', marginBottom: '4px' }}>RYOUS</div>
            <div className="gold mono" style={{ fontSize: '24px' }}>RY$ {player.ryous || 0}</div>
          </div>
        }
      />

      {/* TABS */}
      <div className="tabs" style={{ marginBottom: '32px' }}>
        <div className={`tab ${tab === 'tecnicas' ? 'active' : ''}`} onClick={() => setTab('tecnicas')} style={{ cursor: 'pointer' }}>Técnicas</div>
        <div className={`tab ${tab === 'aprendidas' ? 'active' : ''}`} onClick={() => setTab('aprendidas')} style={{ cursor: 'pointer' }}>
          Aprendidas <span style={{ marginLeft: '6px', background: 'var(--seal-glow)', border: '1px solid var(--seal-bright)', color: 'var(--seal-bright)', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>{learnedIds.length}</span>
        </div>
      </div>

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
            {allJutsus.filter(j => (filterCat === 'Todos' || j.category === filterCat) && (!j.element || j.element === player?.element)).map(jutsu => {
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
                    <div className="flex-row" style={{ gap: '12px' }}>
                      <div style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                        <JutsuIcon jutsu={jutsu} />
                      </div>
                      <div className="flex-col" style={{ gap: '4px' }}>
                        <div className={`mono uppercase ${isUnlocked ? 'gold' : 'muted'}`} style={{ fontSize: '10px', letterSpacing: '1.5px' }}>
                          NV.{jutsu.lvl} {jutsu.reqRank ? `· ${jutsu.reqRank} ` : ''}· {jutsu.type}
                        </div>
                        {isLearned && (
                          <span className="badge badge-green" style={{ fontSize: '10px', width: 'fit-content', fontFamily: "'JetBrains Mono', monospace" }}>✓ APRENDIDO</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <h4 className={`card-title ${isUnlocked ? 'paper' : 'muted'}`} style={{ fontSize: '18px', marginBottom: '8px' }}>
                    {jutsu.name}
                  </h4>
                  <p className="muted" style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                    {jutsu.desc}
                  </p>

                  <div className="mono flex-row" style={{ gap: '12px', marginBottom: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
                    {jutsu.damage > 0 && <span className="danger">⚔ DMG: {jutsu.damage}</span>}
                    {jutsu.chakraCost > 0 && <span className="info">💧 CP: -{jutsu.chakraCost}</span>}
                    {jutsu.cooldown !== undefined && <span className="paper">⏳ CD: {jutsu.cooldown > 0 ? `${jutsu.cooldown}T` : 'Nenhum'}</span>}
                  </div>

                  <div className="mono flex-col" style={{ gap: '4px', marginBottom: '16px', fontSize: '10px' }}>
                    {jutsu.reqAttrValue > 0 && (
                      <span className={(player[jutsu.category?.toLowerCase()] || 0) >= jutsu.reqAttrValue ? "success" : "danger"}>
                        {(player[jutsu.category?.toLowerCase()] || 0) >= jutsu.reqAttrValue ? "✓" : "✗"} Maestria: {player[jutsu.category?.toLowerCase()] || 0}/{jutsu.reqAttrValue} {jutsu.category}
                      </span>
                    )}
                    {jutsu.reqSeals > 0 && (
                      <span className="gold">
                        🎯 Precisão Real: {Math.min(100, Math.floor(((player.selo || 0) / jutsu.reqSeals) * 100))}% (Selo: {player.selo || 0}/{jutsu.reqSeals})
                      </span>
                    )}
                  </div>

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
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h3 className="gold" style={{ fontSize: '16px' }}>Slot de Combate: {equippedJutsus.length}/{MAX_EQUIPPED}</h3>
            <span className="muted" style={{ fontSize: '12px' }}>Os jutsus equipados aparecerão durante as lutas.</span>
          </div>
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
                  <div className="flex-row" style={{ gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '48px', flexShrink: 0 }}>
                      <JutsuIcon jutsu={jutsu} />
                    </div>
                    <div className="flex-col">
                      <div className="mono gold uppercase" style={{ fontSize: '10px', letterSpacing: '1.5px', marginBottom: '4px' }}>
                        {jutsu.type} · {jutsu.category}
                      </div>
                      <h4 className="card-title" style={{ fontSize: '17px', margin: 0 }}>{jutsu.name}</h4>
                    </div>
                  </div>
                  <p className="muted" style={{ fontSize: '12px', lineHeight: '1.6' }}>{jutsu.desc}</p>
                  
                  <div className="mono flex-row" style={{ gap: '12px', marginTop: '12px', marginBottom: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
                    {jutsu.damage > 0 && <span className="danger">⚔ DMG: {jutsu.damage}</span>}
                    {jutsu.chakraCost > 0 && <span className="info">💧 CP: -{jutsu.chakraCost}</span>}
                    {jutsu.cooldown !== undefined && <span className="paper">⏳ CD: {jutsu.cooldown > 0 ? `${jutsu.cooldown}T` : 'Nenhum'}</span>}
                  </div>

                  <div className="mono flex-col" style={{ gap: '4px', marginBottom: '16px', fontSize: '10px' }}>
                    {jutsu.reqAttrValue > 0 && (
                      <span className={(player[jutsu.category?.toLowerCase()] || 0) >= jutsu.reqAttrValue ? "success" : "danger"}>
                        {(player[jutsu.category?.toLowerCase()] || 0) >= jutsu.reqAttrValue ? "✓" : "✗"} Maestria: {player[jutsu.category?.toLowerCase()] || 0}/{jutsu.reqAttrValue} {jutsu.category}
                      </span>
                    )}
                    {jutsu.reqSeals > 0 && (
                      <span className="gold">
                        🎯 Precisão Real: {Math.min(100, Math.floor(((player.selo || 0) / jutsu.reqSeals) * 100))}% (Selo: {player.selo || 0}/{jutsu.reqSeals})
                      </span>
                    )}
                  </div>

                  <div className="flex-row" style={{ marginTop: '16px' }}>
                    <button 
                      className={equippedJutsus.includes(jutsu.id) ? 'btn-danger' : 'btn-ghost'}
                      onClick={() => handleToggleEquip(jutsu.id)}
                      disabled={loading}
                      style={{ width: '100%', fontSize: '12px', padding: '8px' }}
                    >
                      {equippedJutsus.includes(jutsu.id) ? 'Desequipar' : 'Equipar Jutsu'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
