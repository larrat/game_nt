import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import ItemArtwork from '../components/ItemArtwork';
import GameAction from '../components/ui/GameAction';
import '../styles/core-flows-v4.css';

const RARITY_STYLES = {
  'Único':   { text: 'text-danger',  border: 'border-danger',  borderTop: 'border-t-danger' },
  'Épico':   { text: 'text-gold',    border: 'border-gold',    borderTop: 'border-t-gold' },
  'Raro':    { text: 'text-[#4b9eff]', border: 'border-[#4b9eff]', borderTop: 'border-t-[#4b9eff]' },
  'Incomum': { text: 'text-success', border: 'border-success', borderTop: 'border-t-success' },
  default:   { text: 'text-paper',   border: 'border-line',    borderTop: 'border-t-line' }
};

function getRarityClasses(rarity) {
  return RARITY_STYLES[rarity] || RARITY_STYLES.default;
}

export default function Equipamentos({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
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
    if (actionBusy || loading) return;
    if (!invItem?.items) {
      addToast('Item inválido no inventário.', 'error');
      return;
    }

    setActionBusy(true);
    try {
      const { data, error } = await supabase.rpc('alterar_equipamento_inventario', {
        p_player_id: player.id,
        p_inventory_item_id: invItem.id,
        p_equipped: true
      });

      if (error || !data?.success) {
        addToast('Erro ao equipar: ' + (error?.message || data?.error || 'Não foi possível equipar o item.'), 'error');
        return;
      }

      addToast(`${invItem.items.name} equipado com sucesso!`, 'success');
      await Promise.all([loadInventory(), updatePlayer(player.id)]);
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnequip = async (invItem) => {
    if (actionBusy || loading || !invItem?.items) return;
    setActionBusy(true);
    try {
      const { data, error } = await supabase.rpc('alterar_equipamento_inventario', {
        p_player_id: player.id,
        p_inventory_item_id: invItem.id,
        p_equipped: false
      });
      if (error || !data?.success) {
        addToast('Erro ao remover equipamento: ' + (error?.message || data?.error || 'Não foi possível remover o item.'), 'error');
        return;
      }
      addToast(`${invItem.items.name} removido.`, 'info');
      await Promise.all([loadInventory(), updatePlayer(player.id)]);
    } finally {
      setActionBusy(false);
    }
  };

  const handleFavorite = async (invItem) => {
    if (actionBusy || loading) return;
    setActionBusy(true);
    try {
      const newVal = !invItem.is_favorite;
      const { error } = await supabase
        .from('player_inventory')
        .update({ is_favorite: newVal })
        .eq('id', invItem.id)
        .eq('player_id', player.id);
      if (error) {
        addToast('Erro ao atualizar favorito: ' + error.message, 'error');
        return;
      }
      addToast(newVal ? 'Item adicionado aos favoritos.' : 'Item removido dos favoritos.', 'success');
      await loadInventory();
    } finally {
      setActionBusy(false);
    }
  };

  const handleMassSell = async () => {
    if (actionBusy || loading) return;
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
    setActionBusy(true);
    try {
      const { data, error } = await supabase.rpc('vender_itens_inventario', {
        p_player_id: player.id,
        p_inventory_ids: idsToDelete
      });

      if (error || !data?.success) {
        addToast('Erro ao vender: ' + (error?.message || data?.message || 'Venda não concluída.'), 'error');
        return;
      }

      addToast(`Vendido com sucesso! ${data.sold_count} itens por RY$ ${data.ryous_gained}.`, 'success');
      await Promise.all([loadInventory(), updatePlayer(player.id)]);
    } finally {
      setLoading(false);
      setActionBusy(false);
    }
  };

  const getEquipped = (type) => inventory.find(i => i.is_equipped && i.items.type === type);

  const renderSlot = (title, kanji, type) => {
    const equipped = getEquipped(type);
    const rarityCls = equipped ? getRarityClasses(equipped.items.rarity) : null;

    return (
      <div className={`kuro-equipment-slot flex-col items-center justify-center text-center w-[130px] ${equipped ? `card-glass bg-ink border-line-solid ${rarityCls.border}` : 'card border-line-dashed bg-transparent border-seal'}`}>
        <div className={equipped ? `page-title ${rarityCls.text}` : 'page-title muted'}>
          {kanji}
        </div>
        <div className={equipped ? 'uppercase paper text-xs' : 'uppercase muted text-xs'}>{title}</div>

        {equipped && (
          <div className="flex-col gap-sm mt-3 items-center w-full">
            <ItemArtwork name={equipped.items.name} size={42} />
            <span className="text-muted-bright text-xs">{equipped.items.name}</span>
            <GameAction tone="quiet" size="small" className="w-full" disabled={actionBusy} onClick={() => handleUnequip(equipped)}>Remover</GameAction>
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
    <div className="page kuro-equipment-page kuro-equipment-v4">
      <PageHeader
        eyebrow={`${player.name} · ${player.clan_id ? `Clã ID ${player.clan_id}` : 'Sem Clã'}`}
        title="Arsenal Ninja"
        subtitle="Gerencie seus equipamentos e veja o impacto nos seus atributos gerais."
      />

      <section className="kuro-equipment-v4__overview" aria-label="Resumo de equipamentos">
        <div><span className="kuro-ui-label"><SidebarIcon name="shield" size={15} /> ITENS EQUIPADOS</span><strong className="tabular-nums">{inventory.filter(i => i.is_equipped).length} / 6</strong><small>Espaços de equipamento em uso</small></div>
        <div><span className="kuro-ui-label"><SidebarIcon name="users" size={15} /> MOCHILA</span><strong className="tabular-nums">{bagItems.length}</strong><small>Itens disponíveis para equipar</small></div>
        <div><span className="kuro-ui-label"><SidebarIcon name="sparkles" size={15} /> BÔNUS ATIVOS</span><strong className="tabular-nums">{Object.keys(totalBonus).length}</strong><small>Atributos afetados pelo arsenal</small></div>
      </section>
      <div className="kuro-equipment-layout flex-row gap-xl items-start flex-wrap">

        <div className="flex-col gap-lg flex-1 min-w-[350px] max-w-[400px]">
          <div className="kuro-equipment-profile kuro-ui-card card-glass flex-col items-center p-8 relative overflow-hidden border-line-solid border-seal-bright">
            <div className="absolute inset-0 pointer-events-none bg-gradient-radial-gold" />

            <div className="bg-ink z-10 mb-4 rounded-md overflow-hidden flex-row items-center justify-center border-gold border-2 w-[100px] h-[100px]">
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="kuro-equipment-v4__avatar-fallback" aria-hidden="true">忍</span>
              )}
            </div>

            <h2 className="gold uppercase text-2xl z-10 tracking-wide drop-shadow-md">{player.name}</h2>
            <div className="badge badge-gold z-10 mt-2 tabular-nums">Nível {player.level}</div>
          </div>

          <div className="kuro-equipment-bonuses kuro-ui-card card flex-col">
            <h3 className="section-title gold mb-4 pb-3 border-line-solid border-b">Bônus de Equipamentos</h3>
            {Object.keys(totalBonus).length === 0 ? (
              <div className="muted text-center py-6">Nenhum bônus provido pelo equipamento atual.</div>
            ) : (
              <div className="grid-2 gap-md">
                {Object.entries(totalBonus).map(([stat, val]) => (
                  <div key={stat} className="flex-between bg-ink-raised p-3 rounded-sm border-line-solid items-center">
                    <div className="flex-row items-center gap-sm">
                      <div className="rounded-xs overflow-hidden border-line-solid border-seal-bright w-5 h-5">
                        <img src={`/images/icons/${stat.toLowerCase()}.jpg`} alt={stat} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.classList.add('hidden'); }} />
                      </div>
                      <span className="muted uppercase text-xs tracking-wide">{stat}</span>
                    </div>
                    <span className="success mono font-bold tabular-nums">+{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="kuro-equipment-main flex-col flex-[2_1_600px] gap-xl">
          <div className="kuro-equipment-slots kuro-ui-card card">
            <h3 className="section-title gold border-b border-line pb-3 mb-6">Equipamentos Ativos</h3>
            <div className="flex-row gap-md overflow-x-auto pb-4">
              {renderSlot('Cabeça', '額', 'Cabeça')}
              {renderSlot('Tronco', '胴', 'Tronco')}
              {renderSlot('Braços', '腕', 'Braços')}
              {renderSlot('Pernas', '脚', 'Pernas')}
              {renderSlot('Arma', '刀', 'Arma')}
              {renderSlot('Acessório', '飾', 'Acessório')}
            </div>
          </div>

          <div className="kuro-equipment-backpack kuro-ui-card card">
            <div className="kuro-inventory-toolbar flex-between mb-6 pb-4 border-line-solid border-b">
              <h3 className="section-title mb-0 pb-0 border-none">Mochila</h3>

              <div className="flex-row gap-sm overflow-x-auto flex-wrap">
                <div className="flex-row gap-sm">
                  {['Todos', 'Favoritos', 'Cabeça', 'Tronco', 'Braços', 'Pernas', 'Arma', 'Acessório'].map(f => (
                    <GameAction
                      key={f}
                      tone={filter === f ? 'gold' : 'quiet'}
                      size="small"
                      aria-pressed={filter === f}
                      onClick={() => setFilter(f)}
                      className="kuro-equipment-v4__filter"
                    >
                      {f === 'Favoritos' && <SidebarIcon name="star" size={14} />}{f}
                    </GameAction>
                  ))}
                </div>

                <GameAction tone="danger" size="small" disabled={actionBusy || loading} onClick={handleMassSell} className="kuro-equipment-v4__sell">
                  <SidebarIcon name="trash" size={15} /> Vender itens comuns
                </GameAction>
              </div>
            </div>

            {loading ? (
              <div className="kuro-equipment-v4__empty" role="status">Consultando seu inventário…</div>
            ) : displayedItems.length === 0 ? (
              <div className="kuro-equipment-v4__empty" role="status">
                {filter === 'Favoritos' ? 'Nenhum equipamento favoritado.' : 'Sua mochila está vazia para este filtro.'}
              </div>
            ) : (
              <div className="grid-auto gap-md grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
                {displayedItems.map(invItem => {
                  const rarityCls = getRarityClasses(invItem.rarity || invItem.items.rarity);
                  return (
                    <div key={invItem.id} className={`kuro-equipment-item kuro-ui-card card-glass flex-col relative p-4 gap-sm border-t-3 ${rarityCls.borderTop}`}>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleFavorite(invItem)}
                        aria-label={invItem.is_favorite ? `Remover ${invItem.items.name} dos favoritos` : `Adicionar ${invItem.items.name} aos favoritos`}
                        aria-pressed={Boolean(invItem.is_favorite)}
                        className={`kuro-equipment-v4__favorite ${invItem.is_favorite ? 'is-active' : ''}`}
                      >
                        <SidebarIcon name="star" size={18} />
                      </button>

                      <div className="kuro-equipment-v4__item-heading">
                        <ItemArtwork name={invItem.items.name} size={44} />
                        <div>
                          <h4 className={`text-sm mb-1 pr-6 ${rarityCls.text}`}>
                            {invItem.items.name}
                          </h4>
                          <div className="muted text-xs">{invItem.rarity || invItem.items.rarity}</div>
                        </div>
                      </div>

                      <div className="flex-row gap-sm">
                        <span className="badge badge-muted text-xs">{invItem.items.type}</span>
                        <span className="badge badge-gold text-xs tabular-nums">Força Nv. {invItem.items.req_level}</span>
                      </div>

                      <div className="card bg-ink p-2 border-line-solid mt-auto">
                        <div className="mono text-xs flex-col gap-xs">
                          {Object.entries(invItem.rolled_stats || invItem.items.bonus_stats || {}).map(([stat, val]) => (
                            <div key={stat} className="flex-between">
                              <span className="muted uppercase">{stat}</span>
                              <span className="success tabular-nums">+{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <GameAction
                        tone={player.level >= invItem.items.req_level ? 'seal' : 'quiet'}
                        className="w-full"
                        onClick={() => handleEquip(invItem)}
                        disabled={actionBusy || player.level < invItem.items.req_level}
                      >
                        <SidebarIcon name="shield" size={16} />
                        {player.level >= invItem.items.req_level ? 'Equipar item' : 'Nível insuficiente'}
                      </GameAction>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
