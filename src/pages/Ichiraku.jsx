import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

export default function Ichiraku({ player, updatePlayer }) {
  const [consumables, setConsumables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
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

    // Subtrair moedas do jogador
    const newRyous = (player.ryous || 0) - item.cost_ryous;
    const newCoins = (player.vip_coins || 0) - item.cost_coins;

    const { error: playerError } = await supabase
      .from('players')
      .update({ ryous: newRyous, vip_coins: newCoins })
      .eq('id', player.id);

    if (playerError) {
      addToast('Erro ao processar pagamento.', 'error');
      setBuyingId(null);
      return;
    }

    // Checar se já existe o item na mochila
    const { data: existing } = await supabase
      .from('player_consumables')
      .select('id, quantity')
      .eq('player_id', player.id)
      .eq('consumable_id', item.id)
      .single();

    if (existing) {
      // Atualizar quantidade
      await supabase
        .from('player_consumables')
        .update({ quantity: existing.quantity + 1 })
        .eq('id', existing.id);
    } else {
      // Inserir novo registro
      await supabase
        .from('player_consumables')
        .insert({
          player_id: player.id,
          consumable_id: item.id,
          quantity: 1
        });
    }

    await updatePlayer(player.user_id);
    addToast(`Você comprou 1x ${item.name}! Foi enviado para sua mochila.`, 'success');
    setBuyingId(null);
  };

  if (!player) return null;

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Comércio" 
        title="Ichiraku Ramen" 
        subtitle="Sente-se, relaxe e coma uma boa tigela de Ramen. Restauramos sua energia para a próxima missão!" 
      />

      <div style={{
        backgroundImage: `url('/images/bg_selecao.jpg')`, // Fundo improvisado (pode ser substituído por uma arte do Ichiraku)
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '32px',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '24px',
        border: '1px solid var(--line-bright)'
      }}>
        <div style={{ background: 'linear-gradient(90deg, rgba(15,15,20,0.95) 0%, rgba(15,15,20,0.7) 100%)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ fontSize: '64px', background: 'var(--ink-raised)', borderRadius: '50%', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--gold)' }}>
            🍜
          </div>
          <div>
            <h2 className="paper" style={{ margin: '0 0 8px 0', fontFamily: 'Shippori Mincho' }}>Teuchi</h2>
            <p className="muted" style={{ margin: 0, maxWidth: '500px', fontSize: '14px', lineHeight: '1.5' }}>
              "Bem-vindo! Tem sido um dia difícil? Um bom shinobi precisa estar bem alimentado. Escolha algo do cardápio, preparamos com os melhores ingredientes da Vila!"
            </p>
          </div>
        </div>
      </div>

      <div className="card-glass">
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h3 className="paper flex-row" style={{ alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📜</span> Cardápio
          </h3>
          <div className="flex-row" style={{ gap: '16px', background: 'var(--ink)', padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
            <span className="flex-row" style={{ gap: '6px', fontSize: '13px' }}><span style={{ fontSize: '14px' }}>💴</span> {player.ryous || 0}</span>
            <div style={{ width: '1px', height: '16px', background: 'var(--line-bright)' }}></div>
            <span className="gold flex-row mono" style={{ gap: '6px', fontSize: '13px' }}><span style={{ fontSize: '14px' }}>🪙</span> {player.vip_coins || 0}</span>
          </div>
        </div>

        {loading ? (
          <div className="muted mono" style={{ textAlign: 'center', padding: '40px' }}>Preparando a cozinha...</div>
        ) : (
          <div className="grid-3">
            {consumables.map(item => (
              <div key={item.id} style={{ background: 'var(--ink-card)', border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <div className="flex-row" style={{ gap: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '32px', width: '48px', height: '48px', background: 'var(--ink-raised)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="paper" style={{ fontWeight: 'bold', fontSize: '15px' }}>{item.name}</div>
                    <div className="badge badge-muted" style={{ marginTop: '4px', display: 'inline-block' }}>
                      Restaura {item.value} {item.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                <div className="muted" style={{ fontSize: '12px', lineHeight: '1.5', flex: 1, marginBottom: '16px' }}>
                  {item.description}
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
                  onClick={() => handleBuy(item)}
                  disabled={buyingId === item.id}
                >
                  {buyingId === item.id ? 'Comprando...' : (
                    <>
                      <span>Comprar por</span>
                      {item.cost_ryous > 0 && <span className="mono flex-row" style={{ gap: '4px' }}>{item.cost_ryous} 💴</span>}
                      {item.cost_coins > 0 && <span className="mono gold flex-row" style={{ gap: '4px' }}>{item.cost_coins} 🪙</span>}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
