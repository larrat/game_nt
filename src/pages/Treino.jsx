import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { 
  getEquipmentBonus, 
  calculateHP, 
  calculateChakra, 
  calculateStamina, 
  calculateAtkTaiBuk, 
  calculateAtkNinGen, 
  calculateDefTaiBuk, 
  calculateDefNinGen,
  calculateCritChance,
  calculateDodgeChance,
  calculateChakraDiscount
} from '../utils/engine';

export default function Treino({ player, updatePlayer }) {
  const [loading, setLoading] = useState(false);
  const [attrsData, setAttrsData] = useState([]);
  const [ranksData, setRanksData] = useState([]);
  const [selectedAttr, setSelectedAttr] = useState(null);
  const { addToast } = useToast();

  React.useEffect(() => {
    async function loadData() {
      const [attrsRes, ranksRes] = await Promise.all([
        supabase.from('attributes').select('*').order('id', { ascending: true }),
        supabase.from('ranks').select('*')
      ]);
      if (attrsRes.data) setAttrsData(attrsRes.data);
      if (ranksRes.data) setRanksData(ranksRes.data);
    }
    loadData();
  }, []);

  if (!player || attrsData.length === 0 || ranksData.length === 0) return null;

  const playerRank = player.rank || 'Genin';
  const playerRankData = ranksData.find(r => r.name_id === playerRank) || ranksData.find(r => r.name_id === 'Genin');
  
  const rankMultiplier = {
    minMult: playerRankData.train_min_mult,
    maxMult: playerRankData.train_max_mult,
    bonus: playerRankData.train_bonus
  };

  const attrDesc = {
    ninjutsu: { text: "Aumenta dano de Ninjutsu.", detail: "Jutsus elementais usam este valor.", color: '#60a5fa' },
    taijutsu: { text: "Aumenta dano corpo-a-corpo.", detail: "Ataques físicos usam este valor.", color: '#f97316' },
    genjutsu: { text: "Aumenta dano de Ilusorismos.", detail: "Jutsus de Genjutsu usam este valor.", color: '#a78bfa' },
    inteligencia: { text: "Amplifica Magia.", detail: "Multiplica dano mágico.", color: '#34d399' },
    forca: { text: "Aumenta Taijutsu e HP.", detail: "Base de combate físico e vida.", color: '#ef4444' },
    agilidade: { text: "Aumenta Esquiva e Crítico.", detail: "Furtividade e precisão letal.", color: '#facc15' },
    selo: { text: "Desconta Chakra.", detail: "Reduz o custo dos jutsus.", color: '#c084fc' },
    resistencia: { text: "Defesa e Sobrevivência.", detail: "Base de defesa física e mágica.", color: '#2dd4bf' },
    energia: { text: "Vitalidade Bruta.", detail: "Aumenta massivamente HP, CP e SP.", color: '#d97706' },
    bukijutsu: { text: "Manejo de Armas.", detail: "Dano com espadas e ferramentas.", color: '#9ca3af' }
  };

  const getRange = (heroMin, heroMax) => {
    const min = Math.max(1, Math.floor(heroMin * rankMultiplier.minMult));
    const max = Math.max(1, Math.floor(heroMax * rankMultiplier.maxMult));
    return { min, max, bonus: rankMultiplier.bonus };
  };

  const handleTrain = async () => {
    if (!selectedAttr) return;
    if (player.pontos_atributos <= 0) {
      addToast('Você não tem Pontos de Atributo disponíveis!', 'error');
      return;
    }
    
    setLoading(true);
    const { min, max } = getRange(selectedAttr.hero_min, selectedAttr.hero_max);
    
    const { data, error } = await supabase.rpc('treinar_atributo', {
      p_player_id: player.id,
      p_atributo: selectedAttr.field,
      p_hero_min: min,
      p_hero_max: max
    });

    if (error) {
      addToast('Erro no treinamento: ' + error.message, 'error');
    } else {
      addToast(`Você ganhou +${data.gained} em ${selectedAttr.label}!`, 'success');
      await updatePlayer(player.user_id);
    }
    setLoading(false);
  };

  // Funções de Simulação
  const getSimulatedPlayer = (attrField, amountAdded) => {
    return { ...player, [attrField]: (player[attrField] || 0) + amountAdded };
  };

  const renderSimChange = (currentVal, attrField, gainMin, gainMax, calcFunc) => {
    const currentStatus = calcFunc(player);
    const simMin = calcFunc(getSimulatedPlayer(attrField, gainMin));
    const simMax = calcFunc(getSimulatedPlayer(attrField, gainMax));

    if (simMin === currentStatus && simMax === currentStatus) return null; // Não muda

    return (
      <div className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
        <span className="muted" style={{ fontSize: '12px' }}>{currentVal}</span>
        <div className="mono" style={{ fontSize: '13px' }}>
          <span className="paper">{currentStatus}</span>
          <span className="gold" style={{ margin: '0 8px' }}>➔</span>
          <span className="success">{simMin === simMax ? simMin : `${simMin} ~ ${simMax}`}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <PageHeader 
        eyebrow={`Graduação: ${playerRank}`} 
        title='Centro de Treinamento' 
        subtitle='Simule e treine os seus atributos com base nos seus Pontos Livres disponíveis.' 
      />

      <div className="flex-between" style={{ background: 'var(--ink-raised)', padding: '16px 24px', borderRadius: '8px', border: '1px solid var(--seal-bright)', marginBottom: '24px' }}>
        <span className="muted uppercase mono" style={{ fontSize: '13px', letterSpacing: '1px' }}>Pontos de Treino Disponíveis</span>
        <span className="gold mono" style={{ fontSize: '32px' }}>{player.pontos_atributos || 0}</span>
      </div>

      <div className="grid-sidebar" style={{ gap: '24px', alignItems: 'start' }}>
        
        {/* LISTA DE ATRIBUTOS */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: 'var(--ink-soft)', padding: '12px 24px', borderBottom: '1px solid var(--line)' }}>
            <h3 className="gold mono uppercase" style={{ letterSpacing: '2px', fontSize: '14px', margin: 0 }}>
              Seus Atributos Base
            </h3>
          </div>
          <div className="flex-col">
            {attrsData.map((attr) => {
              const isSelected = selectedAttr?.field === attr.field;
              const baseValue = player[attr.field] || 0;
              const equipValue = getEquipmentBonus(player, attr.field);
              const totalValue = baseValue + equipValue;
              
              return (
                <div 
                  key={attr.field} 
                  className="flex-between" 
                  onClick={() => setSelectedAttr(attr)}
                  style={{ 
                    padding: '16px 24px', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--seal-glow)' : 'transparent',
                    borderLeft: isSelected ? '4px solid var(--seal-bright)' : '4px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '40px', height: '40px', 
                      background: 'var(--ink-raised)', 
                      borderRadius: '8px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--line)',
                      overflow: 'hidden'
                    }}>
                      <img src={`/images/icons/${attr.field}.jpg`} alt={attr.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="flex-col">
                      <span className={isSelected ? "gold uppercase" : "paper uppercase"} style={{ fontSize: '14px', fontWeight: 'bold' }}>{attr.label}</span>
                      <span className="muted" style={{ fontSize: '11px' }}>{attrDesc[attr.field]?.text || attr.desc}</span>
                    </div>
                  </div>

                  <div className="flex-col" style={{ alignItems: 'flex-end' }}>
                    <div className="gold mono" style={{ fontSize: '20px' }}>{totalValue}</div>
                    {equipValue > 0 && <div className="success mono" style={{ fontSize: '10px' }}>+{equipValue} (Equip)</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIMULADOR DE BUILD (PAINEL DIREITO) */}
        <div style={{ position: 'sticky', top: '24px' }}>
          {selectedAttr ? (
            <div className="card" style={{ border: '1px solid var(--seal-bright)', background: 'var(--ink)' }}>
              <div className="flex-row" style={{ gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img src={`/images/icons/${selectedAttr.field}.jpg`} alt={selectedAttr.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <h3 className="gold" style={{ margin: 0 }}>Simulador: {selectedAttr.label}</h3>
                  <span className="muted" style={{ fontSize: '12px' }}>Previsão de crescimento ao treinar.</span>
                </div>
              </div>

              <div className="card-glass" style={{ padding: '16px', marginBottom: '24px', border: '1px dashed var(--line-bright)' }}>
                {(() => {
                  const { min, max, bonus } = getRange(selectedAttr.hero_min, selectedAttr.hero_max);
                  return (
                    <div className="flex-col" style={{ gap: '8px' }}>
                      <span className="muted uppercase mono" style={{ fontSize: '11px' }}>GANHO ESTIMADO POR TREINO:</span>
                      <span className="paper mono" style={{ fontSize: '16px' }}>
                        +{min} a +{max} <span className="gold" style={{ fontSize: '12px' }}>(+{bonus} Bônus Rank)</span>
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex-col" style={{ marginBottom: '24px' }}>
                <h4 className="muted uppercase mono" style={{ fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '4px' }}>Impacto nos Status (Min ~ Max)</h4>
                {(() => {
                  const { min, max } = getRange(selectedAttr.hero_min, selectedAttr.hero_max);
                  const field = selectedAttr.field;
                  
                  return (
                    <div className="flex-col">
                      {renderSimChange('HP Máximo', field, min, max, calculateHP)}
                      {renderSimChange('Chakra (CP)', field, min, max, calculateChakra)}
                      {renderSimChange('Stamina (SP)', field, min, max, calculateStamina)}
                      {renderSimChange('Atk (Físico)', field, min, max, calculateAtkTaiBuk)}
                      {renderSimChange('Atk (Mágico)', field, min, max, calculateAtkNinGen)}
                      {renderSimChange('Def (Física)', field, min, max, calculateDefTaiBuk)}
                      {renderSimChange('Def (Mágica)', field, min, max, calculateDefNinGen)}
                      {renderSimChange('Chance Crítico', field, min, max, calculateCritChance)}
                      {renderSimChange('Esquiva', field, min, max, calculateDodgeChance)}
                    </div>
                  );
                })()}
              </div>

              <button 
                className="btn-primary" 
                onClick={handleTrain} 
                disabled={loading || player.pontos_atributos <= 0}
                style={{ width: '100%', padding: '16px', fontSize: '16px' }}
              >
                Gastar 1 Ponto em {selectedAttr.label}
              </button>
            </div>
          ) : (
            <div className="card flex-col" style={{ alignItems: 'center', justifyContent: 'center', height: '300px', textAlign: 'center', color: 'var(--muted)' }}>
              <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚖️</span>
              <h3>Selecione um Atributo</h3>
              <p style={{ fontSize: '14px' }}>Clique em um atributo na lista ao lado para simular o crescimento do seu personagem antes de aplicar os pontos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
