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
          req_seals: j.req_seals,
          req_stats: j.req_stats,
          cooldown: j.cooldown,
          element: j.element
        }));
        setAllJutsus(formatted);
      }
    }
    fetchJutsus();
  }, []);

  const hasRequirements = (jutsu, playerObj) => {
    if (jutsu.req_stats && Object.keys(jutsu.req_stats).length > 0) {
      for (const [statName, reqValue] of Object.entries(jutsu.req_stats)) {
        if ((playerObj[statName.toLowerCase()] || 0) < reqValue) return false;
      }
      return true;
    }
    const playerMastery = playerObj?.[jutsu.category?.toLowerCase()] || 0;
    if (jutsu.reqAttrValue && playerMastery < jutsu.reqAttrValue) return false;
    if (jutsu.req_seals && (playerObj.selo || 0) < jutsu.req_seals) return false;
    return true;
  };

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
    
    if (!hasRequirements(jutsu, player)) {
      addToast(`Atributos insuficientes! Verifique os requisitos na carta.`, 'error');
      return;
    }

    if (player?.ryous < jutsu.cost) {
      addToast(`Ryous insuficientes! Precisa de RY$ ${jutsu.cost}.`, 'error');
      return;
    }

    setLoading(true);
    const { error } = await supabase.rpc('aprender_jutsu', {
      p_player_id: player.id,
      p_jutsu_id: jutsu.id,
      p_cost: jutsu.cost
    });

    if (error) {
      addToast('Erro ao aprender jutsu: ' + error.message, 'error');
    } else {
      await updatePlayer(player.id);
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
      hasRequirements(j, player)
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
    const { error } = await supabase.rpc('aprender_jutsus_massa', {
      p_player_id: player.id,
      p_jutsus: newObjs,
      p_total_cost: totalCost
    });

    if (error) {
      addToast('Erro ao aprender em massa: ' + error.message, 'error');
    } else {
      await updatePlayer(player.id);
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
          <div className="card text-center">
            <div className="muted mono uppercase text-[10px] tracking-[2px] mb-1">RYOUS</div>
            <div className="gold mono text-2xl">RY$ {player.ryous || 0}</div>
          </div>
        }
      />

      {/* TABS */}
      <div className="tabs mb-8">
        <div className={`tab cursor-pointer ${tab === 'tecnicas' ? 'active' : ''}`} onClick={() => setTab('tecnicas')}>Técnicas</div>
        <div className={`tab cursor-pointer ${tab === 'aprendidas' ? 'active' : ''}`} onClick={() => setTab('aprendidas')}>
          Aprendidas <span className="ml-[6px] bg-seal-glow border border-solid border-seal-bright text-seal-bright rounded-full px-2 py-[1px] text-[10px] font-mono">{learnedIds.length}</span>
        </div>
      </div>

      {/* LISTA DE TÉCNICAS */}
      {tab === 'tecnicas' && (
        <>
          {/* Filtros por categoria e Bulk Learn */}
          <div className="flex-between mb-6 flex-wrap gap-4">
            <div className="flex-row gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`mono uppercase px-4 py-[6px] rounded-sm text-[11px] tracking-[1px] cursor-pointer border border-solid transition-all duration-200 ${filterCat === cat ? 'border-seal-bright bg-seal-glow text-seal-bright' : 'border-line bg-transparent text-muted'}`}
                >{cat}</button>
              ))}
            </div>

            {/* Vantagem VIP: Prodígio da Academia */}
            <button
              className="btn-ghost border-gold text-gold px-4 py-[6px] text-xs"
              onClick={handleBulkLearn}
              disabled={loading}
              title="Vantagem VIP: Aprender todos os Jutsus disponíveis para você de uma vez"
            >
              🌟 Aprender Todos (VIP)
            </button>
          </div>

          <div className="grid-auto gap-4">
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
          <div className="flex-between mb-6">
            <h3 className="gold text-base">Jutsus Aprendidos: {learnedIds.length}</h3>
            <span className="muted text-xs">Todos aparecem automaticamente durante as lutas.</span>
          </div>
          {learnedIds.length === 0 ? (
            <div className="muted text-center py-16">
              <div className="text-5xl mb-4">📖</div>
              <div className="card-title text-lg mb-2">Nenhum jutsu aprendido</div>
              <div className="text-[13px]">Vá até "Técnicas" e compre seus primeiros jutsus com Ryous.</div>
            </div>
          ) : (
            <div className="grid-auto gap-4">
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
