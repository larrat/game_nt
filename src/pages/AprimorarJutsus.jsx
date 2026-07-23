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
      await updatePlayer(player.id);
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
          <div className="flex-col gap-md">
            {learnedJutsus.map(jObj => {
              const fullData = getFullJutsuData(jObj);
              if (!fullData) return null;
              
              const isSelected = selectedJutsu?.id === jObj.id;
              const slotsFilled = jObj.slots.filter(s => s !== null).length;

              return (
                <div 
                  key={jObj.id} 
                  className={`flex-between p-3 rounded-md cursor-pointer ${isSelected ? 'bg-gold-alpha-10 border-line-solid border-gold' : 'bg-ink-soft border-line-solid'}`}
                  onClick={() => setSelectedJutsu(jObj)}
                >
                  <div className="flex-row gap-md items-center">
                    <div className="bg-ink rounded-sm border-line-solid flex-row items-center justify-center w-[40px] h-[40px]">
                      <img src={fullData.icon || '/images/default_jutsu.png'} alt="icon" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <div className="paper font-bold">{fullData.name} <span className="gold mono text-md">[Lv. {jObj.level}]</span></div>
                      <div className="muted text-md">{fullData.type} - {fullData.damage_type || 'Suporte'}</div>
                    </div>
                  </div>
                  <div className={`mono text-md ${slotsFilled === 3 ? 'success' : 'muted'}`}>
                    Slots: {slotsFilled}/3
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel do Jutsu Selecionado */}
        {selectedJutsu ? (
          <div className="card sticky top-6">
            <h2 className="card-title flex-row items-center gap-sm mb-2">
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
                <div className="flex-col gap-sm mb-4 bg-ink p-4 rounded-md border-line-solid">
                  <h4 className="gold mono text-sm mb-2">INSPEÇÃO ESTATÍSTICA</h4>
                  <div className="grid-2 gap-md">
                    <div className="flex-between">
                      <span className="muted text-md">🗡️ Dano Base:</span>
                      <span className="paper mono text-md">
                        {baseDmg} {bonusDano > 0 ? <span className="text-red"> ➔ {finalDmg}</span> : ''}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span className="muted text-md">🔵 Custo (CP):</span>
                      <span className="paper mono text-md">
                        {baseCusto} {bonusCusto < 0 ? <span className="text-blue"> ➔ {finalCusto}</span> : ''}
                      </span>
                    </div>
                    <div className="flex-between">
                      <span className="muted text-md">🎯 Precisão:</span>
                      <span className="paper mono text-md">{finalAcc}%</span>
                    </div>
                    {(bonusLetal > 0 || bonusProt > 0) && (
                      <div className="flex-between border-line-dashed border-t mt-2 pt-2 col-span-2">
                        <span className="muted text-md">✨ Efeitos Extras:</span>
                        <div className="flex-row gap-sm">
                          {bonusLetal > 0 && <span className="gold mono text-md">+{bonusLetal}% Crítico</span>}
                          {bonusProt > 0 && <span className="mono text-md text-green">+{bonusProt} Escudo</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <p className="muted mb-4">Preencha os 3 slots com Pergaminhos. Ao encher os 3, você pode evoluir a habilidade para o próximo nível.</p>
            <div className="card p-3 mb-6 bg-ink border-line-solid border-gold-alpha-20">
              <div className="mono gold text-sm mb-2 tracking-wider">📖 LEGENDA — O QUE CADA ESSÊNCIA FAZ</div>
              <div className="grid-2 gap-xs">
                <div className="text-sm muted">📜 <strong className="danger">Dano</strong> — Aumenta o dano base do jutsu.</div>
                <div className="text-sm muted">📜 <strong className="blue">Custo</strong> — Reduz o Chakra necessário para usar.</div>
                <div className="text-sm muted">📜 <strong className="gold">Letalidade</strong> — Aumenta a chance de acerto crítico.</div>
                <div className="text-sm muted">📜 <strong className="success">Proteção</strong> — Adiciona escudo passivo durante a luta.</div>
              </div>
              <div className="muted text-xs mt-2 pt-2 border-line-solid border-t">💡 <em>Clique em um slot ocupado (📜) para devolver a essência ao seu inventário.</em></div>
            </div>

            <div className="flex-row gap-lg justify-center mb-8">
              {[0, 1, 2].map(idx => {
                const slotted = selectedJutsu.slots[idx];
                return (
                  <div key={idx} className="flex-col items-center gap-sm">
                    <div 
                      className={`rounded-full flex-row items-center justify-center text-center text-2xl ${slotted ? 'border-2 border-gold bg-gold-alpha-10 cursor-pointer shadow-gold' : 'border-2 border-dashed border-muted bg-black-alpha-20 cursor-default shadow-none'}`}
                      style={{ width: '64px', height: '64px' }}
                      onClick={() => removeEssence(idx)}
                      title={slotted ? 'Clique para remover' : 'Slot Vazio'}
                    >
                      {slotted ? '📜' : '+'}
                    </div>
                    <div className={`mono text-xs break-word text-center max-w-[80px] ${slotted ? 'gold' : 'muted'}`}>
                      {slotted ? slotted.replace('_', ' ').toUpperCase() : 'SLOT VAZIO'}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedJutsu.slots.every(s => s !== null) ? (
              <div className="text-center">
                <button className="btn-primary w-full p-3" onClick={upgradeJutsuLevel} disabled={loading}>
                  Evoluir para Nível {selectedJutsu.level + 1} (RY$ {selectedJutsu.level * 15000})
                </button>
                <div className="muted text-sm mt-2">O Jutsu absorverá os atributos dos 3 pergaminhos permanentemente.</div>
              </div>
            ) : (
              <div>
                <h4 className="paper mb-3">Seu Inventário de Essências</h4>
                <div className="grid-3 gap-sm">
                  {Object.entries(inventoryEssences).filter(([k, v]) => v > 0).map(([key, count]) => {
                    const essenceDesc = {
                      dano: { cor: 'danger', desc: '+DMG ao jutsu', hex: '#ef4444' },
                      custo: { cor: 'blue', desc: '-Chakra p/ usar', hex: '#60a5fa' },
                      letalidade: { cor: 'gold', desc: '+% Crítico', hex: 'var(--gold)' },
                      protecao: { cor: 'success', desc: '+Proteção passiva', hex: '#10b981' }
                    };
                    const tipo = key.split('_')[0];
                    const meta = essenceDesc[tipo] || { cor: 'gold', desc: 'Bônus especial', hex: 'var(--gold)' };
                    const tier = key.split('_')[1] ? ` T${key.split('_')[1]}` : '';
                    return (
                    <div key={key} className="flex-col bg-ink p-2 rounded-sm items-center cursor-pointer gap-xs border-line-solid hover-border-gold transition-colors" 
                         style={{ borderColor: `${meta.hex}40` }}
                         onClick={() => {
                           const emptySlotIndex = selectedJutsu.slots.findIndex(s => s === null);
                           if (emptySlotIndex !== -1) equipEssence(emptySlotIndex, key);
                           else addToast('Todos os slots estão cheios!', 'error');
                         }}>
                      <span className="text-xl">📜</span>
                      <span className={`mono text-xs mt-1 text-center font-bold ${meta.cor}`}>{tipo.toUpperCase()}{tier}</span>
                      <span className="text-center muted text-[9px]">{meta.desc}</span>
                      <span className="muted text-[9px]">Qtd: {count}</span>
                    </div>
                  );})}
                  {Object.values(inventoryEssences).every(v => v === 0) && (
                    <div className="muted text-center p-4 col-span-full">Você não tem pergaminhos. Batalhe no mapa ou compre na Loja.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card flex-col items-center justify-center muted min-h-[300px]">
            <span className="mb-4 text-3xl">🥷</span>
            Selecione um Jutsu na lista para aprimorá-lo.
          </div>
        )}
      </div>
    </div>
  );
}
