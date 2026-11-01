import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import GameAction from '../components/ui/GameAction';
import ItemArtwork from '../components/ItemArtwork';
import '../styles/world-services-v4.css';
import { getRefinableItems } from '../utils/refinement';

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
    if (!selectedItem || loading) return;
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

  // O servidor só consome uma duplicata não equipada nem favoritada.
  const upgradableItems = getRefinableItems(inventory);

  const cost = selectedItem ? 500 * ((selectedItem.upgrade_level || 0) + 1) : 0;
  const canAfford = player.ryous >= cost;

  return (
    <div className="page kuro-smith-v4">
      <PageHeader 
        eyebrow="Forja" 
        title="Ferreiro da Vila" 
        subtitle="Refine equipamentos fundindo duplicatas. Itens favoritos e equipados nunca são consumidos."
      />

      <div className="kuro-world-v4__columns">
        <div className="card kuro-ui-card">
          <h3 className="section-title">Itens Disponíveis para Refino</h3>
          {upgradableItems.length === 0 ? (
            <div className="muted mono text-sm p-4 text-center border-line-dashed">
              Você precisa de uma duplicata não equipada e não favoritada para refinar um item.
            </div>
          ) : (
            <div className="flex-col gap-3">
              {upgradableItems.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className="kuro-smith-v4__item"
                  aria-pressed={selectedItem?.id === item.id}
                  onClick={() => setSelectedItem(item)}
                >
                  <ItemArtwork name={item.items.name} size={40} />
                  <div className="flex-col">
                    <span className={item.rarity === 'Lendário' ? 'gold' : item.rarity === 'Raro' ? 'success' : 'paper'}>
                      {item.items.name} {item.upgrade_level > 0 ? `+${item.upgrade_level}` : ''}
                    </span>
                    <span className="muted text-xs">{item.items.type.toUpperCase()}</span>
                  </div>
                  {item.is_equipped && <span className="badge badge-gold">Equipado</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card kuro-ui-card flex-col items-center gap-6">
          <h3 className="section-title w-full text-left">Bigorna</h3>
          
          <div className="flex-col items-center p-6 border-line-dashed rounded-md w-full min-h-[200px] justify-center">
            {selectedItem ? (
              <>
                <span className="kuro-smith-v4__anvil"><SidebarIcon name="hammer" size={32} /></span>
                <h4 className="gold text-lg mb-2">{selectedItem.items.name} +{(selectedItem.upgrade_level || 0)} ➔ +{(selectedItem.upgrade_level || 0) + 1}</h4>
                <p className="muted text-sm text-center max-w-400 mb-6">
                  Este processo consumirá uma cópia não equipada e não favoritada deste item.
                </p>
                <div className="flex-between w-full p-3 bg-ink rounded-md border-line-solid mb-4">
                  <span className="muted">Custo de Refino:</span>
                  <span className={canAfford ? "gold mono" : "danger mono"}>¥ {cost.toLocaleString()}</span>
                </div>
                
                <GameAction tone="seal" loading={loading} disabled={!canAfford} onClick={handleUpgrade} className="w-full">
                  <SidebarIcon name="hammer" size={17} /> {loading ? 'Forjando...' : 'Forjar Equipamento'}
                </GameAction>
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
