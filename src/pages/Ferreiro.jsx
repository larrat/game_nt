import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';

export default function Ferreiro({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (player) loadInventory();
  }, [player]);

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from('player_inventory')
      .select('*, items(*)')
      .eq('player_id', player.id)
      .order('id', { ascending: false });
    
    if (error) {
      addToast("Erro ao carregar inventário: " + error.message, "error");
    } else {
      setInventory((data || []).filter(i => i.items));
    }
  };

  const handleUpgrade = async () => {
    if (!selectedItem) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('aprimorar_equipamento', {
      p_player_id: player.id,
      p_inventory_item_id: selectedItem.id
    });

    if (error) {
      addToast("Erro: " + error.message, "error");
    } else if (data && data.success) {
      addToast(data.message, "success");
      updatePlayer(player.id);
      loadInventory();
      setSelectedItem(null);
    } else if (data) {
      addToast(data.message, "error");
    }
    setLoading(false);
  };

  // Agrupar itens por ID base para saber se temos cópias
  const itemCounts = inventory.reduce((acc, curr) => {
    acc[curr.item_id] = (acc[curr.item_id] || 0) + 1;
    return acc;
  }, {});

  // Itens que podem ser refinados: qualquer item que tenha pelo menos 2 cópias totais no inventário
  const upgradableItems = inventory.filter(i => itemCounts[i.item_id] >= 2);

  const cost = selectedItem ? 500 * ((selectedItem.upgrade_level || 0) + 1) : 0;
  const canAfford = player.ryous >= cost;

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Forja" 
        title="Ferreiro da Vila" 
        subtitle="Refine seus equipamentos fundindo duplicatas. Aumente seus atributos bônus."
      />

      <div className="grid-2">
        <div className="card">
          <h3 className="section-title">Itens Disponíveis para Refino</h3>
          {upgradableItems.length === 0 ? (
            <div className="muted mono text-sm p-4 text-center border-line-dashed">
              Você não possui itens duplicados para refinar.
            </div>
          ) : (
            <div className="flex-col gap-3">
              {upgradableItems.map(item => (
                <div 
                  key={item.id} 
                  className={`p-3 border-line-solid rounded-md cursor-pointer flex-row flex-between ${selectedItem?.id === item.id ? 'border-seal-bright bg-ink-raised' : 'bg-ink'}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex-col">
                    <span className={item.rarity === 'Lendário' ? 'gold' : item.rarity === 'Raro' ? 'success' : 'paper'}>
                      {item.items.name} {item.upgrade_level > 0 ? `+${item.upgrade_level}` : ''}
                    </span>
                    <span className="muted text-xs">{item.items.type.toUpperCase()}</span>
                  </div>
                  {item.is_equipped && <span className="badge badge-gold">Equipado</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card flex-col items-center gap-6">
          <h3 className="section-title w-full text-left">Bigorna</h3>
          
          <div className="flex-col items-center p-6 border-line-dashed rounded-md w-full min-h-[200px] justify-center">
            {selectedItem ? (
              <>
                <div className="text-4xl mb-4 filter drop-shadow-md">⚔️</div>
                <h4 className="gold text-lg mb-2">{selectedItem.items.name} +{(selectedItem.upgrade_level || 0)} ➔ +{(selectedItem.upgrade_level || 0) + 1}</h4>
                <p className="muted text-sm text-center max-w-400 mb-6">
                  Este processo consumirá uma cópia não equipada deste item.
                </p>
                <div className="flex-between w-full p-3 bg-ink rounded-md border-line-solid mb-4">
                  <span className="muted">Custo de Refino:</span>
                  <span className={canAfford ? "gold mono" : "danger mono"}>¥ {cost.toLocaleString()}</span>
                </div>
                
                <button 
                  className="btn-primary w-full" 
                  onClick={handleUpgrade} 
                  disabled={loading || !canAfford}
                >
                  {loading ? 'Forjando...' : 'Forjar Equipamento'}
                </button>
              </>
            ) : (
              <div className="muted mono text-sm text-center">
                Selecione um item à esquerda para forjar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
