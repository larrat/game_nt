import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { getJutsuEnhancementBonus } from '../utils/engine';
import '../styles/main.css';

export default function AprimorarJutsus({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedJutsu, setSelectedJutsu] = useState(null);
  
  if (!player) return null;

  // Normaliza a lista crua (suporta string legada ou objeto {id, level, slots})
  const normalizeJutsus = (rawJutsus) => {
    if (!rawJutsus || !Array.isArray(rawJutsus)) return [];
    return rawJutsus.map(j => {
      if (typeof j === 'string') return { id: j, level: 1, slots: [null, null, null] };
      return {
        id: j.id,
        level: j.level || 1,
        slots: Array.isArray(j.slots) ? [...j.slots, null, null, null].slice(0, 3) : [null, null, null],
        absorbed_stats: j.absorbed_stats || { dano: 0, custo: 0, letalidade: 0, protecao: 0 }
      };
    });
  };

  // activeJutsus já tem os dados do Supabase (name, icon, etc) enriquecidos no App.jsx
  const learnedJutsus = normalizeJutsus(player.jutsus_learned);
  // Para exibir o nome/ícone, cruzamos com activeJutsus
  const getFullJutsuData = (jutsuObj) => {
    const data = (player.activeJutsus || []).find(j => j.id === jutsuObj.id);
    return data ? { ...data, ...jutsuObj } : jutsuObj;
  };

  const inventoryEssences = player.inventory_essences || {};

  const equipEssence = async (slotIndex, essenceKey) => {
    if (!selectedJutsu) return;
    
    // Verifica se tem a essência
    if ((inventoryEssences[essenceKey] || 0) <= 0) {
      addToast('Você não possui essa essência!', 'error');
      return;
    }

    setLoading(true);
    
    const newJutsus = learnedJutsus.map(j => {
      if (j.id === selectedJutsu.id) {
        const newSlots = [...j.slots];
        newSlots[slotIndex] = essenceKey;
        return { ...j, slots: newSlots };
      }
      return j;
    });

    const newInventory = { ...inventoryEssences, [essenceKey]: inventoryEssences[essenceKey] - 1 };

    const { error } = await supabase.from('players').update({
      jutsus_learned: newJutsus,
      inventory_essences: newInventory
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao equipar: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      setSelectedJutsu(newJutsus.find(j => j.id === selectedJutsu.id));
      addToast('Aprimoramento equipado!', 'success');
    }
    setLoading(false);
  };

  const removeEssence = async (slotIndex) => {
    if (!selectedJutsu || !selectedJutsu.slots[slotIndex]) return;

    setLoading(true);
    const essenceKey = selectedJutsu.slots[slotIndex];

    const newJutsus = learnedJutsus.map(j => {
      if (j.id === selectedJutsu.id) {
        const newSlots = [...j.slots];
        newSlots[slotIndex] = null;
        return { ...j, slots: newSlots };
      }
      return j;
    });

    const newInventory = { ...inventoryEssences, [essenceKey]: (inventoryEssences[essenceKey] || 0) + 1 };

    const { error } = await supabase.from('players').update({
      jutsus_learned: newJutsus,
      inventory_essences: newInventory
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao remover: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      setSelectedJutsu(newJutsus.find(j => j.id === selectedJutsu.id));
      addToast('Aprimoramento removido para o inventário.', 'info');
    }
    setLoading(false);
  };

  const upgradeJutsuLevel = async () => {
    if (!selectedJutsu) return;
    const isFull = selectedJutsu.slots.every(s => s !== null);
    if (!isFull) {
      addToast('Preencha os 3 slots com aprimoramentos antes de evoluir o Jutsu!', 'warning');
      return;
    }

    const cost = selectedJutsu.level * 15000;
    if (player.ryous < cost) {
      addToast(`Ryous insuficientes. Custa RY$ ${cost} para evoluir.`, 'error');
      return;
    }

    setLoading(true);
    const newJutsus = learnedJutsus.map(j => {
      if (j.id === selectedJutsu.id) {
        // Absorver atributos
        const newAbsorbed = { ...(j.absorbed_stats || { dano: 0, custo: 0, letalidade: 0, protecao: 0 }) };
        j.slots.forEach(slot => {
          if (!slot) return;
          const isDano = slot.startsWith('dano');
          const isCusto = slot.startsWith('custo');
          const isLetalidade = slot.startsWith('letalidade');
          const isProtecao = slot.startsWith('protecao');
          
          const tier = parseInt(slot.split('_')[1]) || 1;
          
          if (isDano) newAbsorbed.dano += (tier === 1 ? 5 : tier === 2 ? 15 : tier === 3 ? 30 : tier === 4 ? 50 : 100);
          if (isCusto) newAbsorbed.custo += (tier === 1 ? -2 : tier === 2 ? -5 : tier === 3 ? -10 : tier === 4 ? -15 : -25);
          if (isLetalidade) newAbsorbed.letalidade += (tier === 1 ? 2 : tier === 2 ? 5 : tier === 3 ? 10 : tier === 4 ? 15 : 25);
          if (isProtecao) newAbsorbed.protecao += (tier === 1 ? 10 : tier === 2 ? 25 : tier === 3 ? 50 : tier === 4 ? 100 : 200);
        });

        return { ...j, level: j.level + 1, slots: [null, null, null], absorbed_stats: newAbsorbed };
      }
      return j;
    });

    const { error } = await supabase.from('players').update({
      jutsus_learned: newJutsus,
      ryous: player.ryous - cost
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao evoluir: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      setSelectedJutsu(newJutsus.find(j => j.id === selectedJutsu.id));
      addToast(`Jutsu evoluiu para o Nível ${selectedJutsu.level + 1}! Os atributos foram absorvidos.`, 'success');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="eyebrow">Treinamento</div>
          <h1 className="page-title">Aprimorar Jutsus</h1>
          <div className="sub">Personalize suas habilidades com Essências Marciais.</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Lista de Jutsus */}
        <div className="card">
          <h2 className="card-title">Seus Jutsus</h2>
          <div className="flex-col" style={{ gap: '12px' }}>
            {learnedJutsus.map(jObj => {
              const fullData = getFullJutsuData(jObj);
              if (!fullData) return null;
              
              const isSelected = selectedJutsu?.id === jObj.id;
              const slotsFilled = jObj.slots.filter(s => s !== null).length;

              return (
                <div 
                  key={jObj.id} 
                  className="flex-between" 
                  style={{ 
                    padding: '12px', 
                    background: isSelected ? 'rgba(212,162,42,0.1)' : 'var(--ink-soft)', 
                    border: isSelected ? '1px solid var(--gold)' : '1px solid var(--line)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedJutsu(jObj)}
                >
                  <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--ink)', borderRadius: '4px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={fullData.icon || '/images/default_jutsu.png'} alt="icon" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                    </div>
                    <div>
                      <div className="paper" style={{ fontWeight: 'bold' }}>{fullData.name} <span className="gold mono" style={{ fontSize: '12px' }}>[Lv. {jObj.level}]</span></div>
                      <div className="muted" style={{ fontSize: '12px' }}>{fullData.type} - {fullData.damage_type || 'Suporte'}</div>
                    </div>
                  </div>
                  <div className="mono" style={{ fontSize: '12px', color: slotsFilled === 3 ? '#4ade80' : 'var(--muted)' }}>
                    Slots: {slotsFilled}/3
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel do Jutsu Selecionado */}
        {selectedJutsu ? (
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <h2 className="card-title flex-row" style={{ alignItems: 'center', gap: '8px' }}>
              <span className="gold">Nível {selectedJutsu.level}</span>
            </h2>
            <p className="muted" style={{ marginBottom: '24px' }}>Preencha os 3 slots com Pergaminhos de Aprimoramento. Eles darão bônus imediatos no combate. Ao encher os 3, você pode evoluir a habilidade.</p>

            <div className="flex-row" style={{ gap: '16px', justifyContent: 'center', marginBottom: '32px' }}>
              {[0, 1, 2].map(idx => {
                const slotted = selectedJutsu.slots[idx];
                return (
                  <div key={idx} className="flex-col" style={{ alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{
                        width: '64px', height: '64px', 
                        borderRadius: '50%', 
                        border: slotted ? '2px solid var(--gold)' : '2px dashed var(--muted)',
                        background: slotted ? 'rgba(212,162,42,0.1)' : 'rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '24px', cursor: slotted ? 'pointer' : 'default',
                        boxShadow: slotted ? '0 0 12px rgba(212,162,42,0.2)' : 'none'
                      }}
                      onClick={() => removeEssence(idx)}
                      title={slotted ? 'Clique para remover' : 'Slot Vazio'}
                    >
                      {slotted ? '📜' : '+'}
                    </div>
                    <div className="mono" style={{ fontSize: '10px', color: slotted ? 'var(--gold)' : 'var(--muted)', textAlign: 'center', maxWidth: '80px', wordWrap: 'break-word' }}>
                      {slotted ? slotted.replace('_', ' ').toUpperCase() : 'SLOT VAZIO'}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedJutsu.slots.every(s => s !== null) ? (
              <div style={{ textAlign: 'center' }}>
                <button className="btn-primary" onClick={upgradeJutsuLevel} disabled={loading} style={{ width: '100%', padding: '12px' }}>
                  Evoluir para Nível {selectedJutsu.level + 1} (RY$ {selectedJutsu.level * 15000})
                </button>
                <div className="muted" style={{ fontSize: '11px', marginTop: '8px' }}>O Jutsu absorverá os atributos dos 3 pergaminhos permanentemente.</div>
              </div>
            ) : (
              <div>
                <h4 className="paper" style={{ marginBottom: '12px' }}>Seu Inventário de Essências</h4>
                <div className="grid-3" style={{ gap: '8px' }}>
                  {Object.entries(inventoryEssences).filter(([k, v]) => v > 0).map(([key, count]) => (
                    <div key={key} className="flex-col" style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '8px', borderRadius: '4px', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => {
                           const emptySlotIndex = selectedJutsu.slots.findIndex(s => s === null);
                           if (emptySlotIndex !== -1) equipEssence(emptySlotIndex, key);
                           else addToast('Todos os slots estão cheios!', 'error');
                         }}>
                      <span style={{ fontSize: '20px' }}>📜</span>
                      <span className="mono" style={{ fontSize: '10px', marginTop: '4px', textAlign: 'center', color: 'var(--gold)' }}>{key.replace('_', ' ').toUpperCase()}</span>
                      <span className="muted" style={{ fontSize: '10px' }}>Qtd: {count}</span>
                    </div>
                  ))}
                  {Object.values(inventoryEssences).every(v => v === 0) && (
                    <div className="muted" style={{ gridColumn: 'span 3', textAlign: 'center', padding: '16px' }}>Você não tem pergaminhos. Batalhe no mapa ou compre na Loja.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card flex-col" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', minHeight: '300px' }}>
            <span style={{ fontSize: '32px', marginBottom: '16px' }}>🥷</span>
            Selecione um Jutsu na lista para aprimorá-lo.
          </div>
        )}
      </div>
    </div>
  );
}
