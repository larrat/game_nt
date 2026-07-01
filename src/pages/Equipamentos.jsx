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

  if (!player) return null;

  const loadInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_inventory')
      .select('*, items(*)')
      .eq('player_id', player.id);

    if (error) {
      addToast('Erro ao carregar equipamentos: ' + error.message, 'error');
    } else {
      setInventory(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [player.id]);

  const handleEquip = async (invItem) => {
    if (player.level < invItem.items.req_level) {
      addToast(`Nível insuficiente! Requer Nível ${invItem.items.req_level}`, 'error');
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
    updatePlayer(player.user_id); // Atualiza os stats do player na root
  };

  const handleUnequip = async (invItem) => {
    const { error } = await supabase.from('player_inventory').update({ is_equipped: false }).eq('id', invItem.id);
    if (error) {
      addToast('Erro ao remover equipamento: ' + error.message, 'error');
      return;
    }
    addToast(`${invItem.items.name} removido.`, 'info');
    loadInventory();
    updatePlayer(player.user_id);
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

    if (!window.confirm(`Deseja vender ${junkItems.length} itens lixo por RY$ ${totalRyous}? (Isso irá apagar seus itens Brancos e Verdes não-favoritados)`)) return;

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
    updatePlayer(player.user_id);
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
      <div className={equipped ? "card-glass" : "card"} style={{ 
        textAlign: 'center', width: '130px', 
        background: equipped ? 'var(--ink-card)' : 'transparent', 
        borderStyle: equipped ? 'solid' : 'dashed',
        borderColor: equipped ? getRarityColor(equipped.items.rarity) : 'var(--seal)'
      }}>
        <div className={equipped ? "page-title" : "page-title muted"} style={{ 
          color: equipped ? getRarityColor(equipped.items.rarity) : undefined 
        }}>
          {kanji}
        </div>
        <div className={equipped ? "uppercase paper" : "uppercase muted"}>{title}</div>
        
        {equipped && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--muted-bright)' }}>{equipped.items.name}</span>
            <button className="btn-ghost" onClick={() => handleUnequip(equipped)} style={{ padding: '4px', fontSize: '10px' }}>Remover</button>
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

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* LADO ESQUERDO: HERÓI & STATUS TOTAIS */}
        <div className="flex-col" style={{ flex: '1 1 350px', gap: '24px', maxWidth: '400px' }}>
          
          <div className="card-glass flex-col" style={{ alignItems: 'center', padding: '48px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle at top, rgba(212,162,42,0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />
            
            <div style={{ fontSize: '140px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.8))', zIndex: 1, marginBottom: '24px' }}>
              {player.avatar || '🥷'}
            </div>
            
            <h2 className="gold uppercase" style={{ letterSpacing: '2px', zIndex: 1, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{player.name}</h2>
            <div className="badge badge-gold" style={{ zIndex: 1, marginTop: '8px' }}>Nível {player.level}</div>
          </div>

          <div className="card flex-col">
            <h3 className="section-title gold" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Bônus de Equipamentos</h3>
            {Object.keys(totalBonus).length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>Nenhum bônus provido pelo equipamento atual.</div>
            ) : (
              <div className="grid-2" style={{ gap: '16px' }}>
                {Object.entries(totalBonus).map(([stat, val]) => (
                  <div key={stat} className="flex-between" style={{ background: 'var(--ink-raised)', padding: '12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span className="muted uppercase" style={{ fontSize: '11px', letterSpacing: '1px' }}>{stat}</span>
                    <span className="success mono" style={{ fontWeight: 'bold' }}>+{val}</span>
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
            <div className="flex-between" style={{ marginBottom: '24px', borderBottom: '1px solid var(--line)', paddingBottom: '16px' }}>
              <h3 className="section-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>Mochila</h3>
              
              <div className="flex-row" style={{ gap: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
                <div className="flex-row" style={{ gap: '8px' }}>
                  {['Todos', 'Favoritos', 'Cabeça', 'Tronco', 'Braços', 'Pernas', 'Arma', 'Acessório'].map(f => (
                    <button 
                      key={f} 
                      onClick={() => setFilter(f)}
                      className={filter === f ? 'btn-attr' : 'btn-ghost'}
                      style={{ fontSize: '11px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    >
                      {f === 'Favoritos' ? '⭐' : f}
                    </button>
                  ))}
                </div>
                
                <button onClick={handleMassSell} className="btn-ghost" style={{ fontSize: '11px', padding: '6px 12px', border: '1px solid #ef4444', color: '#ef4444', marginLeft: 'auto' }}>
                  🗑️ Vender Lixo
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="muted" style={{ textAlign: 'center', padding: '40px' }}>Vasculhando a mochila...</div>
            ) : displayedItems.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--line)' }}>
                {filter === 'Favoritos' ? 'Nenhum equipamento favoritado.' : 'Sua mochila está vazia para este filtro.'}
              </div>
            ) : (
              <div className="grid-auto" style={{ gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                {displayedItems.map(invItem => (
                  <div key={invItem.id} className="card-glass flex-col" style={{ 
                    position: 'relative', 
                    borderTop: `3px solid ${getRarityColor(invItem.rarity || invItem.items.rarity)}`,
                    padding: '16px',
                    gap: '12px'
                  }}>
                    
                    <button 
                        onClick={() => handleFavorite(invItem)}
                        style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', opacity: invItem.is_favorite ? 1 : 0.2, transition: 'all 0.2s' }}
                    >
                        ⭐
                    </button>

                    <div>
                      <h4 style={{ color: getRarityColor(invItem.rarity || invItem.items.rarity), paddingRight: '24px', fontSize: '14px', marginBottom: '4px' }}>
                          {invItem.items.name}
                      </h4>
                      <div className="muted" style={{ fontSize: '11px' }}>{invItem.rarity || invItem.items.rarity}</div>
                    </div>
                    
                    <div className="flex-row" style={{ gap: '8px' }}>
                      <span className="badge badge-muted" style={{ fontSize: '10px' }}>{invItem.items.type}</span>
                      <span className="badge badge-gold" style={{ fontSize: '10px' }}>Nv. {invItem.items.req_level}</span>
                    </div>

                    <div className="card" style={{ background: 'var(--ink)', padding: '8px', border: '1px solid var(--line)', marginTop: 'auto' }}>
                      <div className="mono" style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {Object.entries(invItem.rolled_stats || invItem.items.bonus_stats || {}).map(([stat, val]) => (
                          <div key={stat} className="flex-between">
                            <span className="muted uppercase">{stat}</span>
                            <span className="success">+{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className={player.level >= invItem.items.req_level ? "btn-primary" : "btn-danger"} 
                      onClick={() => handleEquip(invItem)} 
                      style={{ width: '100%', padding: '8px', fontSize: '12px', opacity: player.level >= invItem.items.req_level ? 1 : 0.5 }}
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
