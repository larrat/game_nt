import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';

export default function Equipamentos({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [confirmSell, setConfirmSell] = useState(false);

  const loadInventory = async () => {
    if (!player) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('player_inventory')
      .select('*, items(*)')
      .eq('player_id', player.id);

    if (error) {
      addToast('Erro ao carregar equipamentos: ' + error.message, 'error');
    } else {
      setInventory((data || []).filter(i => i.items));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [player?.id]);

  if (!player) return null;

  const handleEquip = async (invItem) => {
    if (!invItem?.items) {
      addToast('Item inválido no inventário.', 'error');
      return;
    }

    const typeToEquip = invItem.items.type;
    const currentlyEquipped = inventory.find(i => i.is_equipped && i.items.type === typeToEquip);

    // Desequipa o atual se existir
    if (currentlyEquipped) {
      await supabase.from('player_inventory').update({ is_equipped: false }).eq('id', currentlyEquipped.id);
    }

    // Equipa o novo
    const { error } = await supabase.from('player_inventory').update({ is_equipped: true }).eq('id', invItem.id);

    if (error) {
      addToast('Erro ao equipar: ' + error.message, 'error');
      return;
    }

    addToast(`${invItem.items.name} equipado com sucesso!`, 'success');
    loadInventory();
    updatePlayer(player.id);
  };

  const handleUnequip = async (invItem) => {
    if (!invItem?.items) return;
    const { error } = await supabase.from('player_inventory').update({ is_equipped: false }).eq('id', invItem.id);
    if (error) {
      addToast('Erro ao remover equipamento: ' + error.message, 'error');
      return;
    }
    addToast(`${invItem.items.name} removido.`, 'info');
    loadInventory();
    updatePlayer(player.id);
  };

  const handleFavorite = async (invItem) => {
    const newVal = !invItem.is_favorite;
    const { error } = await supabase.from('player_inventory').update({ is_favorite: newVal }).eq('id', invItem.id);
    if (error) {
      addToast('Erro ao atualizar favorito: ' + error.message, 'error');
      return;
    }
    addToast(newVal ? 'Item adicionado aos favoritos.' : 'Item removido dos favoritos.', 'success');
    loadInventory();
  };

  const handleMassSell = async () => {
    const junkItems = inventory.filter(i => 
      !i.is_equipped && 
      !i.is_favorite && 
      (i.rarity === 'Comum' || i.items.rarity === 'Comum' || i.rarity === 'Incomum' || i.items.rarity === 'Incomum')
    );

    if (junkItems.length === 0) {
      addToast('Você não tem itens Comuns/Incomuns destrancados na mochila.', 'info');
      return;
    }

    let totalRyous = 0;
    const idsToDelete = junkItems.map(i => {
      const r = i.rarity || i.items.rarity;
      if (r === 'Comum') totalRyous += 50;
      if (r === 'Incomum') totalRyous += 150;
      return i.id;
    });

    if (!confirmSell) {
      addToast(`Clique novamente para confirmar a venda de ${junkItems.length} itens por RY$ ${totalRyous}.`, 'info');
      setConfirmSell(true);
      setTimeout(() => setConfirmSell(false), 5000);
      return;
    }
    setConfirmSell(false);

    setLoading(true);
    const { error } = await supabase.from('player_inventory').delete().in('id', idsToDelete);
    if (error) {
      addToast('Erro ao vender: ' + error.message, 'error');
      setLoading(false);
      return;
    }

    await supabase.from('players').update({ ryous: (player.ryous || 0) + totalRyous }).eq('id', player.id);
    
    addToast(`Vendido com sucesso! Você ganhou RY$ ${totalRyous}.`, 'success');
    loadInventory();
    updatePlayer(player.id);
  };

  // Helper para agrupar os slots equipados
  const getEquipped = (type) => inventory.find(i => i.is_equipped && i.items.type === type);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'Único': return 'var(--danger)';
      case 'Épico': return 'var(--gold)';
      case 'Raro': return 'var(--info)';
      case 'Incomum': return 'var(--success)';
      default: return 'var(--paper)';
    }
  };

  const renderSlot = (title, kanji, type) => {
    const equipped = getEquipped(type);
    
    return (
      <div className={equipped ? "card-glass flex-col items-center justify-center text-center border-line-solid" : "card flex-col items-center justify-center text-center border-line-dashed"} style={{ 
        width: '130px', 
        background: equipped ? 'var(--ink-card)' : 'transparent', 
        borderColor: equipped ? getRarityColor(equipped.items.rarity) : 'var(--seal)'
      }}>
        <div className={equipped ? "page-title" : "page-title muted"} style={{ 
          color: equipped ? getRarityColor(equipped.items.rarity) : undefined 
        }}>
          {kanji}
        </div>
        <div className={equipped ? "uppercase paper text-xs" : "uppercase muted text-xs"}>{title}</div>
        
        {equipped && (
          <div className="flex-col gap-sm mt-3 items-center w-full">
            <span className="text-muted-bright text-xs">{equipped.items.name}</span>
            <button className="btn-ghost p-1 text-xs w-full" onClick={() => handleUnequip(equipped)}>Remover</button>
          </div>
        )}
      </div>
    );
  };

  const bagItems = inventory.filter(i => !i.is_equipped);
  const displayedItems = bagItems.filter(i => {
    if (filter === 'Todos') return true;
    if (filter === 'Favoritos') return i.is_favorite;
    return i.items.type === filter;
  });

  const calculateTotalBonus = () => {
    const totals = {};
    inventory.filter(i => i.is_equipped).forEach(invItem => {
      const b = invItem.rolled_stats || invItem.items?.bonus_stats || {};
      Object.keys(b).forEach(stat => {
        totals[stat] = (totals[stat] || 0) + parseInt(b[stat] || 0, 10);
      });
    });
    return totals;
  };

  const totalBonus = calculateTotalBonus();

  return (
    <div className="page">
      <PageHeader 
        eyebrow={`${player.name} · ${player.clan_id ? `Clã ID ${player.clan_id}` : 'Sem Clã'}`} 
        title='Arsenal e Arsenal Ninja' 
        subtitle='Gerencie seus equipamentos e veja o impacto nos seus atributos gerais.' 
      />

      <div className="flex-row gap-xl items-start flex-wrap">
        
        {/* LADO ESQUERDO: HERÓI & STATUS TOTAIS */}
        <div className="flex-col gap-lg flex-1" style={{ minWidth: '350px', maxWidth: '400px' }}>
          
          <div className="card-glass flex-col items-center p-8 relative overflow-hidden border-line-solid border-seal-bright">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at top, rgba(212,162,42,0.1) 0%, transparent 60%)' }} />
            
            <div className="bg-ink z-10 mb-4 rounded-md overflow-hidden flex-row items-center justify-center border-gold" style={{ width: '100px', height: '100px', borderWidth: '2px' }}>
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">🥷</span>
              )}
            </div>
            
            <h2 className="gold uppercase text-2xl z-10 tracking-wide" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{player.name}</h2>
            <div className="badge badge-gold z-10 mt-2">Nível {player.level}</div>
          </div>

          <div className="card flex-col">
            <h3 className="section-title gold mb-4 pb-3 border-line-solid" style={{ borderBottomWidth: '1px' }}>Bônus de Equipamentos</h3>
            {Object.keys(totalBonus).length === 0 ? (
              <div className="muted text-center py-6">Nenhum bônus provido pelo equipamento atual.</div>
            ) : (
              <div className="grid-2 gap-md">
                {Object.entries(totalBonus).map(([stat, val]) => (
                  <div key={stat} className="flex-between bg-ink-raised p-3 rounded-sm border-line-solid items-center">
                    <div className="flex-row items-center gap-sm">
                      <div className="rounded-xs overflow-hidden border-line-solid border-seal-bright" style={{ width: '20px', height: '20px' }}>
                        <img src={`/images/icons/${stat.toLowerCase()}.jpg`} alt={stat} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      </div>
                      <span className="muted uppercase text-xs tracking-wide">{stat}</span>
                    </div>
                    <span className="success mono font-bold">+{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: INVENTÁRIO */}
        <div className="flex-col" style={{ flex: '2 1 600px', gap: '32px' }}>
          
          {/* SLOTS EQUIPADOS */}
          <div className="card">
            <h3 className="section-title gold" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '24px' }}>Equipamentos Ativos</h3>
            <div className="flex-row" style={{ gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
              {renderSlot('Cabeça', '額', 'Cabeça')}
              {renderSlot('Tronco', '胴', 'Tronco')}
              {renderSlot('Braços', '腕', 'Braços')}
              {renderSlot('Pernas', '脚', 'Pernas')}
              {renderSlot('Arma', '刀', 'Arma')}
              {renderSlot('Acessório', '飾', 'Acessório')}
            </div>
          </div>

          {/* MOCHILA */}
          <div className="card">
            <div className="flex-between mb-6 pb-4 border-line-solid" style={{ borderBottomWidth: '1px' }}>
              <h3 className="section-title mb-0 pb-0" style={{ borderBottom: 'none' }}>Mochila</h3>
              
              <div className="flex-row gap-sm overflow-x-auto flex-wrap">
                <div className="flex-row gap-sm">
                  {['Todos', 'Favoritos', 'Cabeça', 'Tronco', 'Braços', 'Pernas', 'Arma', 'Acessório'].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setFilter(f)}
                      className={`text-xs p-2 whitespace-nowrap ${filter === f ? 'btn-attr' : 'btn-ghost'}`}
                    >
                      {f === 'Favoritos' ? '⭐' : f}
                    </button>
                  ))}
                </div>
                
                <button onClick={handleMassSell} className="btn-ghost text-xs p-2 ml-auto" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
                  🗑️ Vender Lixo
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="muted text-center py-10">Vasculhando a mochila...</div>
            ) : displayedItems.length === 0 ? (
              <div className="muted text-center py-10 border-line-dashed border-line">
                {filter === 'Favoritos' ? 'Nenhum equipamento favoritado.' : 'Sua mochila está vazia para este filtro.'}
              </div>
            ) : (
              <div className="grid-auto gap-md" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {displayedItems.map(invItem => (
                  <div key={invItem.id} className="card-glass flex-col relative p-4 gap-sm" style={{ 
                    borderTop: `3px solid ${getRarityColor(invItem.rarity || invItem.items.rarity)}`
                  }}>
                    
                    <button 
                        onClick={() => handleFavorite(invItem)}
                        className="absolute bg-transparent border-none cursor-pointer text-sm transition-all"
                        style={{ top: '12px', right: '12px', opacity: invItem.is_favorite ? 1 : 0.2 }}
                    >
                        ⭐
                    </button>

                    <div>
                      <h4 className="text-sm mb-1 pr-6" style={{ color: getRarityColor(invItem.rarity || invItem.items.rarity) }}>
                          {invItem.items.name}
                      </h4>
                      <div className="muted text-xs">{invItem.rarity || invItem.items.rarity}</div>
                    </div>
                    
                    <div className="flex-row gap-sm">
                      <span className="badge badge-muted text-xs">{invItem.items.type}</span>
                      <span className="badge badge-gold text-xs">Força Nv. {invItem.items.req_level}</span>
                    </div>

                    <div className="card bg-ink p-2 border-line-solid mt-auto">
                      <div className="mono text-xs flex-col gap-xs">
                        {Object.entries(invItem.rolled_stats || invItem.items.bonus_stats || {}).map(([stat, val]) => (
                          <div key={stat} className="flex-between">
                            <span className="muted uppercase">{stat}</span>
                            <span className="success">+{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className={`w-full p-2 text-xs ${player.level >= invItem.items.req_level ? "btn-primary" : "btn-danger"}`} 
                      onClick={() => handleEquip(invItem)} 
                      style={{ opacity: player.level >= invItem.items.req_level ? 1 : 0.5 }}
                      disabled={player.level < invItem.items.req_level}
                    >
                      {player.level >= invItem.items.req_level ? 'Equipar Item' : 'Nível Muito Baixo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
