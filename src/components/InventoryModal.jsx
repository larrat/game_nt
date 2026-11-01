import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useLocation } from 'react-router-dom';
import { playClickSound } from '../utils/audioEngine';
import '../styles/inventory-modal.css';

export default function InventoryModal({ isOpen, onClose, player, updatePlayer }) {
  const location = useLocation();
  const inCombat = location.pathname.includes('/combate');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingId, setUsingId] = useState(null);
  const { addToast } = useToast();
  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const priorFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(modalRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      ) || []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (priorFocus?.isConnected) priorFocus.focus();
    };
  }, [isOpen]);

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
    if (inCombat) {
      addToast('Consumíveis não podem ser usados durante o combate.', 'error');
      return;
    }

    const consumable = invItem.consumables;
    if (!consumable) {
      addToast('Item inválido no inventário.', 'error');
      return;
    }

    setUsingId(invItem.id);
    playClickSound();

    try {
      const { data, error } = await supabase.rpc('usar_consumivel_inventario', {
        p_player_id: player.id,
        p_inventory_id: invItem.id
      });

      if (error || !data?.success) {
        addToast('Erro ao usar item: ' + (error?.message || data?.error || 'operação recusada'), 'error');
        return;
      }

      await updatePlayer(player.id);
      addToast(
        `Você usou ${data.consumable_name || consumable.name} (${data.used_text || 'recursos atualizados'})`,
        'success'
      );

      const newQuantity = Number(data.quantity_remaining ?? Math.max(0, invItem.quantity - 1));
      setItems(prev => {
        if (newQuantity <= 0) return prev.filter(i => i.id !== invItem.id);
        return prev.map(i => i.id === invItem.id ? { ...i, quantity: newQuantity } : i);
      });
    } catch (error) {
      addToast('Erro inesperado ao usar item: ' + (error?.message || 'tente novamente.'), 'error');
    } finally {
      setUsingId(null);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay inventory-modal__overlay" onClick={onClose}>
      
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="kuro-inventory-title"
        className="avatar-modal inventory-modal__panel" onClick={e => e.stopPropagation()}>

        <div className="modal-header">
          <h2 id="kuro-inventory-title" className="flex-row items-center gap-xs">
            🎒 Mochila de Suprimentos
          </h2>
          <button ref={closeButtonRef} type="button" className="btn-close" aria-label="Fechar mochila" onClick={onClose}>×</button>
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
    </div>,
    document.body
  );
}
