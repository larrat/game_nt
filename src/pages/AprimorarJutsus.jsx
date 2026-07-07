import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { getJutsuEnhancementBonus } from '../utils/engine';
import PageHeader from '../components/PageHeader';
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
    
    const { data: rpcData, error } = await supabase.rpc('modificar_jutsu_slots', {
      p_player_id: player.id,
      p_jutsu_id: selectedJutsu.id,
      p_action: 'equip',
      p_slot_idx: slotIndex,
      p_essence_key: essenceKey,
      p_upgrade_cost: 0
    });

    if (error) {
      addToast('Erro ao equipar: ' + error.message, 'error');
    } else {
      addToast('Aprimoramento equipado!', 'success');
      setSelectedJutsu(rpcData.new_jutsu);
    }
    setLoading(false);
  };

  const removeEssence = async (slotIndex) => {
    if (!selectedJutsu || !selectedJutsu.slots[slotIndex]) return;

    setLoading(true);
    const essenceKey = selectedJutsu.slots[slotIndex];

    const { data: rpcData, error } = await supabase.rpc('modificar_jutsu_slots', {
      p_player_id: player.id,
      p_jutsu_id: selectedJutsu.id,
      p_action: 'unequip',
      p_slot_idx: slotIndex,
      p_essence_key: null,
      p_upgrade_cost: 0
    });

    if (error) {
      addToast('Erro ao remover: ' + error.message, 'error');
    } else {
      addToast('Aprimoramento removido para o inventário.', 'info');
      setSelectedJutsu(rpcData.new_jutsu);
    }
    setLoading(false);
  };

  const upgradeJutsuLevel = async () => {
    if (!selectedJutsu) return;
    const isFull = selectedJutsu.slots.every(s => s !== null);
    if (!isFull) {
      addToast('Você precisa preencher os 3 slots do jutsu antes de evoluí-lo.', 'warning');
      return;
    }

    const currentStars = selectedJutsu.stars || 1;
    if (currentStars >= 5) {
      addToast('Este jutsu já alcançou o nível máximo.', 'info');
      return;
    }

    const cost = 500 * currentStars;
    if (player.ryous < cost) {
      addToast(`Você precisa de ${cost} ¥ para evoluir este jutsu.`, 'error');
      return;
    }

    setLoading(true);

    const { data: rpcData, error } = await supabase.rpc('modificar_jutsu_slots', {
      p_player_id: player.id,
      p_jutsu_id: selectedJutsu.id,
      p_action: 'upgrade',
      p_slot_idx: 0,
      p_essence_key: null,
      p_upgrade_cost: cost
    });

    if (error) {
      addToast('Erro ao evoluir: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      setSelectedJutsu(rpcData.new_jutsu);
      addToast(`Jutsu evoluído para ${currentStars + 1} ⭐!`, 'success');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Treinamento"
        title="Aprimorar Jutsus"
        subtitle="Personalize suas habilidades com Essências Marciais."
      />

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
            <h2 className="card-title flex-row" style={{ alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className="gold">Nível {selectedJutsu.level}</span>
            </h2>
            
            {/* PAINEL ESTATÍSTICO (Antes e Depois) */}
            {(() => {
              const fullData = getFullJutsuData(selectedJutsu);
              const bonusDano = getJutsuEnhancementBonus(selectedJutsu, 'dano') + (selectedJutsu.absorbed_stats?.dano || 0);
              const bonusCusto = getJutsuEnhancementBonus(selectedJutsu, 'custo') + (selectedJutsu.absorbed_stats?.custo || 0); // Negativo
              const bonusLetal = getJutsuEnhancementBonus(selectedJutsu, 'letalidade') + (selectedJutsu.absorbed_stats?.letalidade || 0);
              const bonusProt = getJutsuEnhancementBonus(selectedJutsu, 'protecao') + (selectedJutsu.absorbed_stats?.protecao || 0);

              const baseDmg = fullData.damage || 0;
              const finalDmg = baseDmg + bonusDano;

              const baseCusto = fullData.cost || 0;
              const finalCusto = Math.max(0, baseCusto + bonusCusto);

              const baseAcc = fullData.accuracy || 0;
              const finalAcc = baseAcc;

              return (
                <div className="flex-col" style={{ gap: '8px', marginBottom: '16px', background: 'var(--ink)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <h4 className="gold mono" style={{ fontSize: '11px', marginBottom: '8px' }}>INSPEÇÃO ESTATÍSTICA</h4>
                  <div className="grid-2" style={{ gap: '12px' }}>
                    <div className="flex-between">
                      <span className="muted" style={{ fontSize: '12px' }}>🗡️ Dano Base:</span>
                      <span className="paper mono" style={{ fontSize: '12px' }}>
                        {baseDmg} {bonusDano > 0 ? <span style={{ color: '#ef4444' }}> ➔ {finalDmg}</span> : ''}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span className="muted" style={{ fontSize: '12px' }}>🔵 Custo (CP):</span>
                      <span className="paper mono" style={{ fontSize: '12px' }}>
                        {baseCusto} {bonusCusto < 0 ? <span style={{ color: '#60a5fa' }}> ➔ {finalCusto}</span> : ''}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span className="muted" style={{ fontSize: '12px' }}>🎯 Precisão:</span>
                      <span className="paper mono" style={{ fontSize: '12px' }}>{finalAcc}%</span>
                    </div>
                    {(bonusLetal > 0 || bonusProt > 0) && (
                      <div className="flex-between" style={{ gridColumn: 'span 2', borderTop: '1px dashed var(--line)', paddingTop: '8px' }}>
                        <span className="muted" style={{ fontSize: '12px' }}>✨ Efeitos Extras:</span>
                        <div className="flex-row" style={{ gap: '8px' }}>
                          {bonusLetal > 0 && <span className="gold mono" style={{ fontSize: '12px' }}>+{bonusLetal}% Crítico</span>}
                          {bonusProt > 0 && <span className="mono" style={{ fontSize: '12px', color: '#10b981' }}>+{bonusProt} Escudo</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <p className="muted" style={{ marginBottom: '16px' }}>Preencha os 3 slots com Pergaminhos. Ao encher os 3, você pode evoluir a habilidade para o próximo nível.</p>
            <div className="card" style={{ padding: '12px 16px', marginBottom: '24px', background: 'var(--ink)', border: '1px solid rgba(212,162,42,0.2)' }}>
              <div className="mono gold" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '8px' }}>📖 LEGENDA — O QUE CADA ESSÊNCIA FAZ</div>
              <div className="grid-2" style={{ gap: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>📜 <strong style={{ color: '#ef4444' }}>Dano</strong> — Aumenta o dano base do jutsu.</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>📜 <strong style={{ color: '#60a5fa' }}>Custo</strong> — Reduz o Chakra necessário para usar.</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>📜 <strong style={{ color: 'var(--gold)' }}>Letalidade</strong> — Aumenta a chance de acerto crítico.</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>📜 <strong style={{ color: '#10b981' }}>Proteção</strong> — Adiciona escudo passivo durante a luta.</div>
              </div>
              <div className="muted" style={{ fontSize: '10px', marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>💡 <em>Clique em um slot ocupado (📜) para devolver a essência ao seu inventário.</em></div>
            </div>

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
                  {Object.entries(inventoryEssences).filter(([k, v]) => v > 0).map(([key, count]) => {
                    const essenceDesc = {
                      dano: { cor: '#ef4444', desc: '+DMG ao jutsu' },
                      custo: { cor: '#60a5fa', desc: '-Chakra p/ usar' },
                      letalidade: { cor: 'var(--gold)', desc: '+% Crítico' },
                      protecao: { cor: '#10b981', desc: '+Proteção passiva' }
                    };
                    const tipo = key.split('_')[0];
                    const meta = essenceDesc[tipo] || { cor: 'var(--gold)', desc: 'Bônus especial' };
                    const tier = key.split('_')[1] ? ` T${key.split('_')[1]}` : '';
                    return (
                    <div key={key} className="flex-col" 
                         style={{ background: 'var(--ink)', border: `1px solid ${meta.cor}40`, padding: '8px', borderRadius: '4px', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s', gap: '2px' }}
                         onClick={() => {
                           const emptySlotIndex = selectedJutsu.slots.findIndex(s => s === null);
                           if (emptySlotIndex !== -1) equipEssence(emptySlotIndex, key);
                           else addToast('Todos os slots estão cheios!', 'error');
                         }}>
                      <span style={{ fontSize: '20px' }}>📜</span>
                      <span className="mono" style={{ fontSize: '10px', marginTop: '2px', textAlign: 'center', color: meta.cor, fontWeight: 'bold' }}>{tipo.toUpperCase()}{tier}</span>
                      <span style={{ fontSize: '9px', textAlign: 'center', color: 'var(--muted)' }}>{meta.desc}</span>
                      <span className="muted" style={{ fontSize: '9px' }}>Qtd: {count}</span>
                    </div>
                  );})}
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
