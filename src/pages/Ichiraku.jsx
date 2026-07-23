import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';

export default function Ichiraku({ player, updatePlayer }) {
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const [tab, setTab] = useState('loja'); // loja | mochila
  const { addToast } = useToast();

  useEffect(() => {
    fetchConsumables();
  }, []);

  const fetchConsumables = async () => {
    const { data, error } = await supabase
      .from('consumables')
      .select('*')
      .eq('is_active', true)
      .order('cost_coins', { ascending: true })
      .order('cost_ryous', { ascending: true });

    if (!error && data) {
      setConsumables(data);
    }
    setLoading(false);
  };

  const handleBuy = async (item) => {
    if (!player) return;

    // Verificar saldo
    if (item.cost_ryous > 0 && (player.ryous || 0) < item.cost_ryous) {
      addToast('Ryous insuficientes!', 'error');
      return;
    }
    if (item.cost_coins > 0 && (player.vip_coins || 0) < item.cost_coins) {
      addToast('Kuro Coins insuficientes!', 'error');
      return;
    }

    setBuyingId(item.id);

    const { error } = await supabase.rpc('comprar_ramen', {
      p_player_id: player.id,
      p_consumable_id: item.id,
      p_quantidade: 1
    });

    if (error) {
      addToast(error.message || 'Erro ao processar pagamento.', 'error');
      setBuyingId(null);
      return;
    }

    await updatePlayer(player.id);
    addToast(`Você comprou ${item.name}!`, 'success');
    setBuyingId(null);
  };

  const [usingId, setUsingId] = useState(null);

  const handleUse = async (item) => {
    if (!player) return;
    setUsingId(item.id);

    const healVal = item.value;
    let updates = {};

    if (item.type === 'hp') {
      const maxHP = calculateHP(player);
      updates.hp = Math.min(maxHP, (player.hp || maxHP) + healVal);
    } else if (item.type === 'cp' || item.type === 'chakra') {
      const maxCP = calculateChakra(player);
      updates.chakra = Math.min(maxCP, (player.chakra || maxCP) + healVal);
    } else if (item.type === 'st' || item.type === 'stamina') {
      const maxSt = calculateStamina(player);
      updates.stamina = Math.min(maxSt, (player.stamina || maxSt) + healVal);
    }

    // 1. Consumir item
    if (item.quantity > 1) {
       await supabase.from('player_consumables').update({ quantity: item.quantity - 1 }).eq('id', item.pc_id);
    } else {
       await supabase.from('player_consumables').delete().eq('id', item.pc_id);
    }

    // 2. Atualizar jogador
    if (Object.keys(updates).length > 0) {
       await supabase.from('players').update(updates).eq('id', player.id);
    }

    await updatePlayer(player.id);
    addToast(`Você consumiu ${item.name}!`, 'success');
    setUsingId(null);
  };

  if (!player) return null;

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Comércio" 
        title="Ichiraku Ramen" 
        subtitle="Sente-se, relaxe e coma uma boa tigela de Ramen. Restauramos sua energia para a próxima missão!" 
      />

      <div className="bg-ichiraku-hero p-8 rounded-lg relative overflow-hidden mb-6 border-line-solid border-line-bright">
        <div className="absolute inset-0 bg-ichiraku-overlay pointer-events-none" />
        
        <div className="relative z-10 flex-row gap-6 items-center">
          <div className="text-6xl bg-ink-raised rounded-full w-100px h-100px flex-row items-center justify-center border-2 border-gold">
            🍜
          </div>
          <div>
            <h2 className="paper shippori m-0 mb-2">Teuchi</h2>
            <p className="muted m-0 max-w-480 text-sm leading-relaxed">
              "Bem-vindo! Tem sido um dia difícil? Um bom shinobi precisa estar bem alimentado. Escolha algo do cardápio, preparamos com os melhores ingredientes da Vila!"
            </p>
          </div>
        </div>
      </div>

      <div className="card-glass">
        <div className="tabs mb-6">
          <div className={`tab ${tab === 'loja' ? 'active' : ''}`} onClick={() => setTab('loja')}>Cardápio</div>
          <div className={`tab ${tab === 'mochila' ? 'active' : ''}`} onClick={() => setTab('mochila')}>
            Sua Mochila 
            <span className="ml-2 bg-seal-glow border-line-solid border-seal-bright text-seal-bright rounded-sm px-2 py-1 text-xs">
              {player.consumables?.length || 0}
            </span>
          </div>
        </div>

        <div className="flex-between mb-6">
          <h3 className="paper flex-row items-center gap-sm">
            <span className="text-xl">{tab === 'loja' ? '📜' : '🎒'}</span> {tab === 'loja' ? 'Cardápio' : 'Seus Itens'}
          </h3>
          <div className="flex-row gap-4 bg-ink px-4 py-2 rounded-md border-line-solid">
            <span className="flex-row gap-xs text-sm"><span className="text-md">💴</span> {player.ryous || 0}</span>
            <div className="w-px h-4 bg-line-bright"></div>
            <span className="gold flex-row gap-xs mono text-sm"><span className="text-md">🪙</span> {player.vip_coins || 0}</span>
          </div>
        </div>

        {tab === 'loja' && (
          loading ? (
            <div className="muted mono text-center p-10">Preparando a cozinha...</div>
          ) : (
            <div className="grid-3">
              {consumables.map(item => (
                <div key={item.id} className="bg-ink-card border-line-solid rounded-md p-4 flex-col">
                <div className="flex-row gap-sm mb-3">
                  <div className="text-4xl w-12 h-12 bg-ink-raised rounded-sm flex-row items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <div className="paper font-bold text-md">{item.name}</div>
                    <div className="badge badge-muted mt-1 inline-block">
                      Restaura {item.value} {item.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div className="muted text-xs leading-relaxed flex-1 mb-4">
                  {item.description}
                </div>

                <button 
                  className="btn-primary w-full flex-row justify-center gap-sm p-3" 
                  onClick={() => handleBuy(item)}
                  disabled={buyingId === item.id}
                >
                  {buyingId === item.id ? 'Comprando...' : (
                    <>
                      <span>Comprar por</span>
                      {item.cost_ryous > 0 && <span className="mono flex-row gap-xs">{item.cost_ryous} 💴</span>}
                      {item.cost_coins > 0 && <span className="mono gold flex-row gap-xs">{item.cost_coins} 🪙</span>}
                    </>
                  )}
                </button>
              </div>
              ))}
            </div>
          )
        )}

        {tab === 'mochila' && (
          <div className="grid-3">
            {!player.consumables || player.consumables.length === 0 ? (
              <div className="muted text-center p-10 col-span-full">Sua mochila está vazia.</div>
            ) : (
              player.consumables.map(item => (
                <div key={item.pc_id} className="bg-ink-card border-line-solid rounded-md p-4 flex-col">
                  <div className="flex-row flex-between mb-3">
                    <div className="flex-row gap-sm">
                      <div className="text-4xl w-12 h-12 bg-ink-raised rounded-sm flex-row items-center justify-center">
                        {item.icon}
                      </div>
                      <div>
                        <div className="paper font-bold text-md">{item.name}</div>
                        <div className="badge badge-muted mt-1 inline-block">
                          Restaura {item.value} {item.type.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="badge badge-gold px-2 py-1 text-sm">
                      x{item.quantity}
                    </div>
                  </div>
                  
                  <div className="muted text-xs leading-relaxed flex-1 mb-4">
                    {item.description}
                  </div>
                  
                  <button 
                    className="btn-primary w-full p-3 text-sm" 
                    onClick={() => handleUse(item)}
                    disabled={usingId === item.id}
                  >
                    {usingId === item.id ? 'Usando...' : 'Usar Item'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
