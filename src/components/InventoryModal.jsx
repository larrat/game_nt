import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { playClickSound } from '../utils/audioEngine';

export default function InventoryModal({ isOpen, onClose, player, updatePlayer }) {
  const location = useLocation();
  const inCombat = location.pathname.includes('/combate');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && player) {
      fetchInventory();
    }
  }, [isOpen, player]);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_consumables')
      .select('id, quantity, consumables(*)')
      .eq('player_id', player.id)
      .gt('quantity', 0)
      .order('created_at', { ascending: false });

    if (error) {
      addToast('Erro ao carregar inventário.', 'error');
      setItems([]);
    } else {
      setItems((data || []).filter(i => i.consumables));
    }
    setLoading(false);
  };

  const handleUseItem = async (invItem) => {
    if (!player || !updatePlayer) return;
    const consumable = invItem.consumables;
    if (!consumable) {
      addToast('Item inválido no inventário.', 'error');
      return;
    }

    setUsingId(invItem.id);
    playClickSound();

    let newHp = player.hp ?? calculateHP(player);
    let newCp = player.chakra ?? calculateChakra(player);
    let newSp = player.stamina ?? calculateStamina(player);

    const maxHp = calculateHP(player);
    const maxCp = calculateChakra(player);
    const maxSp = calculateStamina(player);

    let usedText = '';

    if (consumable.type === 'hp' || consumable.type === 'all') {
      newHp = Math.min(maxHp, newHp + consumable.value);
      usedText += '+HP ';
    }
    if (consumable.type === 'cp' || consumable.type === 'all') {
      newCp = Math.min(maxCp, newCp + consumable.value);
      usedText += '+Chakra ';
    }
    if (consumable.type === 'sp' || consumable.type === 'all') {
      newSp = Math.min(maxSp, newSp + consumable.value);
      usedText += '+Stamina ';
    }

    const { error: playerError } = await supabase.from('players').update({
      hp: newHp,
      chakra: newCp,
      stamina: newSp,
      is_fainted: false
    }).eq('id', player.id);

    if (playerError) {
      addToast('Erro ao usar item: ' + playerError.message, 'error');
      setUsingId(null);
      return;
    }

    const newQuantity = invItem.quantity - 1;
    if (newQuantity <= 0) {
      await supabase.from('player_consumables').delete().eq('id', invItem.id);
    } else {
      await supabase.from('player_consumables').update({ quantity: newQuantity }).eq('id', invItem.id);
    }

    await updatePlayer(player.id);
    addToast(`Você usou ${consumable.name} (${usedText.trim()})`, 'success');

    setItems(prev => {
      if (newQuantity <= 0) return prev.filter(i => i.id !== invItem.id);
      return prev.map(i => i.id === invItem.id ? { ...i, quantity: newQuantity } : i);
    });

    setUsingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="avatar-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>

        <div className="modal-header">
          <h2 className="flex-row items-center gap-xs">
            🎒 Mochila de Suprimentos
          </h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content p-6 bg-ink">
          {loading ? (
            <div className="muted mono text-center p-10">Revirando a mochila...</div>
          ) : items.length === 0 ? (
            <div className="text-center p-10 bg-black-alpha-20 rounded-sm border-dashed border-line">
              <div className="text-5xl mb-4 grayscale opacity-50">🍜</div>
              <h3 className="paper mb-2">Mochila Vazia</h3>
              <p className="muted text-sm">Você não tem nenhum consumível. Visite o Ichiraku Ramen para comprar suprimentos para suas missões.</p>
            </div>
          ) : (
            <div className="flex-col gap-sm">
              {items.map(invItem => (
                <div key={invItem.id} className="flex-row bg-ink-raised border-line-solid rounded-sm p-3 items-center gap-md">
                  <div className="text-3xl w-12 h-12 bg-ink-card rounded-xs flex-row items-center justify-center border-line-solid border-line-bright">
                    {invItem.consumables.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex-row gap-xs items-baseline">
                      <span className="paper font-bold">{invItem.consumables.name}</span>
                      <span className="mono gold text-xs">x{invItem.quantity}</span>
                    </div>
                    <div className="muted text-xs mt-1">{invItem.consumables.description}</div>
                  </div>
                  <button
                    className={`btn-primary p-2 px-4 text-xs ${inCombat ? 'opacity-50' : 'opacity-100'}`}
                    onClick={() => handleUseItem(invItem)}
                    disabled={usingId === invItem.id || inCombat}
                    title={inCombat ? 'Consumíveis não podem ser usados em combate.' : ''}
                  >
                    {inCombat ? 'Bloqueado' : 'Usar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer flex-between items-center">
          <span className={`mono text-xs ${inCombat ? 'danger' : 'muted'}`}>
            {inCombat ? '⚠️ O uso de consumíveis é proibido durante batalhas.' : 'Dica: Cure-se antes de enfrentar desafios difíceis.'}
          </span>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </div>

      </div>
    </div>
  );
}
