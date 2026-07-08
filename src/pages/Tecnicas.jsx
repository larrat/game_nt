import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import JutsuIcon from '../components/JutsuIcon';
import JutsuCard from '../components/JutsuCard';

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

const CATEGORIES = ['Ninjutsu', 'Taijutsu', 'Genjutsu', 'Bukijutsu', 'Elementar'];

export default function Tecnicas({ player, updatePlayer }) {
  const getHighestAttr = () => {
    if (!player) return 'Ninjutsu';
    const attrs = [
      { name: 'Ninjutsu', val: player.ninjutsu || 0 },
      { name: 'Taijutsu', val: player.taijutsu || 0 },
      { name: 'Genjutsu', val: player.genjutsu || 0 },
      { name: 'Bukijutsu', val: player.bukijutsu || 0 },
    ];
    attrs.sort((a,b) => b.val - a.val);
    return attrs[0].val > 0 ? attrs[0].name : 'Ninjutsu';
  };

  const [allJutsus, setAllJutsus] = useState([]);
  const [tab, setTab] = useState('tecnicas');
  const [filterCat, setFilterCat] = useState(getHighestAttr);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const rawLearned = Array.isArray(player?.jutsus_learned) ? player.jutsus_learned : [];
  const learnedIds = rawLearned.map(j => typeof j === 'string' ? j : j.id);

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
      (!j.element || j.element === player?.element) &&
      (!j.reqAttrValue || (player?.[j.category?.toLowerCase()] || 0) >= j.reqAttrValue)
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

  if (!player) return null;

  return (
    <div className="page">
      {/* PAGE HEADER */}
      <PageHeader
        eyebrow={`${player.name} · Graduação: ${player.rank}`}
        title="Academia Ninja"
        subtitle="Aprenda jutsus usando Ryous. Todos os jutsus aprendidos ficam disponíveis automaticamente no combate."
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
            {allJutsus.filter(j => {
              if (filterCat === 'Elementar') return !!j.element && j.element === player?.element;
              return (filterCat === 'Todos' || j.category === filterCat) && (!j.element || j.element === player?.element);
            }).map(jutsu => {
              const isLearned = learnedIds.includes(jutsu.id);
              return (
                <JutsuCard 
                  key={jutsu.id} 
                  jutsu={jutsu} 
                  player={player} 
                  isLearned={isLearned} 
                  learnCost={`RY$ ${jutsu.cost}`} 
                  onLearn={() => handleLearn(jutsu)}
                  showRequisites={true}
                />
              );
            })}
          </div>
        </>
      )}

      {/* APRENDIDAS */}
      {tab === 'aprendidas' && (
        <div>
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h3 className="gold" style={{ fontSize: '16px' }}>Jutsus Aprendidos: {learnedIds.length}</h3>
            <span className="muted" style={{ fontSize: '12px' }}>Todos aparecem automaticamente durante as lutas.</span>
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
                <JutsuCard 
                  key={jutsu.id} 
                  jutsu={jutsu} 
                  player={player} 
                  isLearned={true} 
                  showRequisites={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
