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
      await updatePlayer(player.id);
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
      <div className="flex-between py-2 border-b border-line-solid">
        <span className="muted text-xs">{currentVal}</span>
        <div className="mono text-sm">
          <span className="paper">{currentStatus}</span>
          <span className="gold mx-2">➔</span>
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

      <div className="flex-between bg-ink-raised px-6 py-4 rounded-md border-line-solid border-seal-bright mb-6">
        <span className="muted uppercase mono tracking-wider text-sm">Pontos de Treino Disponíveis</span>
        <span className="gold mono text-4xl">{player.pontos_atributos || 0}</span>
      </div>

      <div className="grid-sidebar gap-6 items-start">
        
        {/* LISTA DE ATRIBUTOS */}
        <div className="card p-0 overflow-hidden">
          <div className="bg-ink-soft px-6 py-3 border-b border-line-solid">
            <h3 className="gold mono uppercase tracking-widest text-sm m-0">
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
                  className={`flex-between px-6 py-4 border-b border-line-alpha-05 items-center cursor-pointer transition-all ${isSelected ? 'bg-seal-glow border-l-4 border-l-seal-bright' : 'bg-transparent border-l-4 border-l-transparent'}`}
                  onClick={() => setSelectedAttr(attr)}
                >
                  <div className="flex-row gap-3 items-center">
                    <div className="w-10 h-10 bg-ink-raised rounded-sm flex-row items-center justify-center border-line-solid overflow-hidden">
                      <img src={`/images/icons/${attr.field}.jpg`} alt={attr.label} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-col">
                      <span className={`${isSelected ? "gold" : "paper"} uppercase font-bold text-sm`}>{attr.label}</span>
                      <span className="muted text-xs">{attrDesc[attr.field]?.text || attr.desc}</span>
                    </div>
                  </div>

                  <div className="flex-col items-end">
                    <div className="gold mono text-xl">{totalValue}</div>
                    {equipValue > 0 && <div className="success mono text-xs">+{equipValue} (Equip)</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIMULADOR DE BUILD (PAINEL DIREITO) */}
        <div className="sticky top-6">
          {selectedAttr ? (
            <div className="card border-line-solid border-seal-bright bg-ink">
              <div className="flex-row gap-3 items-center mb-4">
                <div className="w-12 h-12 rounded-sm overflow-hidden border-line-solid">
                  <img src={`/images/icons/${selectedAttr.field}.jpg`} alt={selectedAttr.label} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="gold m-0">Simulador: {selectedAttr.label}</h3>
                  <span className="muted text-xs">Previsão de crescimento ao treinar.</span>
                </div>
              </div>

              <div className="card-glass p-4 mb-6 border-line-dashed-bright">
                {(() => {
                  const { min, max, bonus } = getRange(selectedAttr.hero_min, selectedAttr.hero_max);
                  return (
                    <div className="flex-col gap-2">
                      <span className="muted uppercase mono text-xs">GANHO ESTIMADO POR TREINO:</span>
                      <span className="paper mono text-md">
                        +{min} a +{max} <span className="gold text-xs">(+{bonus} Bônus Rank)</span>
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="flex-col mb-6">
                <h4 className="muted uppercase mono text-xs mb-2 border-b border-line-solid pb-1">Impacto nos Status (Min ~ Max)</h4>
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
                className="btn-primary w-full p-4 text-md" 
                onClick={handleTrain} 
                disabled={loading || player.pontos_atributos <= 0}
              >
                Gastar 1 Ponto em {selectedAttr.label}
              </button>
            </div>
          ) : (
            <div className="card flex-col items-center justify-center h-[300px] text-center text-muted">
              <span className="text-5xl mb-4">⚖️</span>
              <h3>Selecione um Atributo</h3>
              <p className="text-sm">Clique em um atributo na lista ao lado para simular o crescimento do seu personagem antes de aplicar os pontos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
