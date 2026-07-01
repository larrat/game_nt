import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { playClickSound, playHitSound } from '../utils/audioEngine'; // Podemos usar playHitSound ou algo similar para o barulho de uso

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

    if (!error && data) {
      setItems(data);
    }
    setLoading(false);
  };

  const handleUseItem = async (invItem) => {
    if (!player) return;
    setUsingId(invItem.id);
    playClickSound();

    const consumable = invItem.consumables;
    let newHp = player.hp || calculateHP(player);
    let newCp = player.chakra || calculateChakra(player);
    let newSp = player.stamina || calculateStamina(player);

    const maxHp = calculateHP(player);
    const maxCp = calculateChakra(player);
    const maxSp = calculateStamina(player);

    let usedText = '';

    if (consumable.type === 'hp' || consumable.type === 'all') {
      newHp = Math.min(maxHp, newHp + consumable.value);
      usedText += `+HP `;
    }
    if (consumable.type === 'cp' || consumable.type === 'all') {
      newCp = Math.min(maxCp, newCp + consumable.value);
      usedText += `+Chakra `;
    }
    if (consumable.type === 'sp' || consumable.type === 'all') {
      newSp = Math.min(maxSp, newSp + consumable.value);
      usedText += `+Stamina `;
    }

    // Atualiza jogador
    await supabase.from('players').update({
      hp: newHp,
      chakra: newCp,
      is_fainted: false // Revive se estiver desmaiado e usar um item (opcional, pode ser util para a Pilula de Renascimento)
    }).eq('id', player.id);

    // Atualiza inventário
    const newQuantity = invItem.quantity - 1;
    if (newQuantity <= 0) {
      await supabase.from('player_consumables').delete().eq('id', invItem.id);
    } else {
      await supabase.from('player_consumables').update({ quantity: newQuantity }).eq('id', invItem.id);
    }

    await updatePlayer(player.user_id);
    addToast(`Você usou ${consumable.name} (${usedText.trim()})`, 'success');
    
    // Atualiza a lista local para não precisar fazer refetch
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
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎒 Mochila de Suprimentos
          </h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-content" style={{ padding: '24px', background: 'var(--ink)' }}>
          {loading ? (
            <div className="muted mono" style={{ textAlign: 'center', padding: '40px' }}>Revirando a mochila...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed var(--line)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'grayscale(1)', opacity: 0.5 }}>🍜</div>
              <h3 className="paper" style={{ marginBottom: '8px' }}>Mochila Vazia</h3>
              <p className="muted" style={{ fontSize: '13px' }}>Você não tem nenhum consumível. Visite o Ichiraku Ramen para comprar suprimentos para suas missões.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map(invItem => (
                <div key={invItem.id} style={{ display: 'flex', background: 'var(--ink-raised)', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '32px', width: '48px', height: '48px', background: 'var(--ink-card)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--line-bright)' }}>
                    {invItem.consumables.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex-row" style={{ gap: '8px', alignItems: 'baseline' }}>
                      <span className="paper" style={{ fontWeight: 'bold' }}>{invItem.consumables.name}</span>
                      <span className="mono gold" style={{ fontSize: '11px' }}>x{invItem.quantity}</span>
                    </div>
                    <div className="muted" style={{ fontSize: '12px', marginTop: '4px' }}>{invItem.consumables.description}</div>
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '8px 16px', fontSize: '12px', opacity: inCombat ? 0.5 : 1 }}
                    onClick={() => handleUseItem(invItem)}
                    disabled={usingId === invItem.id || inCombat}
                    title={inCombat ? "Consumíveis não podem ser usados em combate." : ""}
                  >
                    {inCombat ? 'Bloqueado' : 'Usar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer flex-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="muted mono" style={{ fontSize: '11px', color: inCombat ? 'var(--danger)' : 'var(--muted)' }}>
            {inCombat ? '⚠️ O uso de consumíveis é proibido durante batalhas.' : 'Dica: Cure-se antes de enfrentar desafios difíceis.'}
          </span>
          <button className="btn-ghost" onClick={onClose}>Fechar</button>
        </div>

      </div>
    </div>
  );
}
