import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import '../styles/academy-v3.css';
import { useToast } from '../context/ToastContext';
import { findRankIndex } from '../utils/progression';
import { getTrainingBudget, getTrainingRange, formatTrainingReceipt } from '../utils/training';
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
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [lastTraining, setLastTraining] = useState(null);
  const { addToast } = useToast();

  React.useEffect(() => {
    let active = true;
    async function loadData() {
      setCatalogLoading(true);
      setCatalogError('');
      try {
        const [attrsRes, ranksRes] = await Promise.all([
          supabase.from('attributes').select('*').order('id', { ascending: true }),
          supabase.from('ranks').select('*').order('id', { ascending: true })
        ]);
        if (attrsRes.error || ranksRes.error) {
          throw new Error(attrsRes.error?.message || ranksRes.error?.message || 'Falha ao carregar catálogo.');
        }
        if (!active) return;
        const attributes = attrsRes.data || [];
        const ranks = ranksRes.data || [];
        setAttrsData(attributes);
        setRanksData(ranks);
        setSelectedAttr(previous =>
          attributes.find(attr => attr.field === previous?.field) ||
          attributes.find(attr => attr.field === 'energia') ||
          attributes[0] || null
        );
        if (!attributes.length || !ranks.length) {
          setCatalogError('Não foi possível encontrar os atributos ou as graduações do servidor.');
        }
      } catch (error) {
        if (active) setCatalogError('Não foi possível carregar os dados de treinamento. Verifique sua conexão e tente novamente.');
      } finally {
        if (active) setCatalogLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [catalogVersion]);

  if (!player) return null;

  if (catalogLoading) {
    return (
      <div className="page kuro-training-page" role="status" aria-live="polite">
        <PageHeader eyebrow="Academia Ninja" title="Centro de Treinamento" subtitle="Carregando atributos..." />
        <div className="card p-6 muted">Preparando simulador de treinamento...</div>
      </div>
    );
  }

  if (catalogError) {
    return (
      <div className="page kuro-training-page" role="alert">
        <PageHeader eyebrow="Academia Ninja" title="Centro de Treinamento" subtitle="Os atributos não estão disponíveis no momento." />
        <div className="card p-6">
          <p className="text-danger mb-4">{catalogError}</p>
          <button type="button" className="btn-ghost" onClick={() => setCatalogVersion(version => version + 1)}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const playerRank = player.rank || 'Estudante da Academia';
  const rankIndex = findRankIndex(ranksData.map(rank => ({ id: rank.name_id, title: rank.title })), playerRank);
  const playerRankData = rankIndex >= 0 ? ranksData[rankIndex] : ranksData[0];
  const {
    points: availablePoints,
    maxPerAction: maxQuantity,
    quantity,
    remaining
  } = getTrainingBudget(player.pontos_atributos, selectedQuantity);

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

  const getRange = (heroMin, heroMax) =>
    getTrainingRange({ hero_min: heroMin, hero_max: heroMax }, playerRankData);

  const handleTrain = async () => {
    if (!selectedAttr || loading) return;
    if (quantity < 1) {
      addToast('Você não tem pontos disponíveis para treinar.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('treinar_atributos', {
        p_player_id: player.id,
        p_atributo: selectedAttr.field,
        p_quantidade: quantity
      });

      if (error || data?.success !== true) {
        throw new Error(error?.message || data?.error || 'Não foi possível treinar.');
      }
      const receipt = formatTrainingReceipt(data, selectedAttr.label);
      setLastTraining({
        playerId: player.id,
        attribute: selectedAttr.label,
        gained: data.gained,
        quantity: data.quantity,
        remaining: data.remaining_points
      });
      addToast(receipt || 'Treino registrado! Atualizando atributos.', 'success');
      try {
        await updatePlayer(player.id);
      } catch {
        addToast('Treino concluído, mas os dados não foram atualizados. Recarregue a página.', 'info');
      }
    } catch (error) {
      addToast('Erro no treinamento: ' + (error?.message || 'Falha inesperada.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funções de Simulação
  const getSimulatedPlayer = (attrField, amountAdded) => {
    return { ...player, [attrField]: (Number(player[attrField]) || 0) + amountAdded };
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
    <div className="page kuro-training-page">
      <PageHeader 
        eyebrow={`Graduação: ${playerRank}`} 
        title='Centro de Treinamento' 
        subtitle='Escolha seu atributo, simule os efeitos e confirme a distribuição de até 5 pontos por ação.' 
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6" aria-label="Resumo dos pontos de treinamento">
        <div className="card border-line-solid border-seal-bright p-4">
          <p className="muted uppercase mono tracking-wider text-xs mb-2">Pontos disponíveis</p>
          <p className="gold mono text-3xl m-0">{availablePoints}</p>
          <p className="muted text-xs mt-2">Saldo oficial do personagem</p>
        </div>
        <div className="card border-line-solid p-4">
          <p className="muted uppercase mono tracking-wider text-xs mb-2">Limite nesta ação</p>
          <p className="paper mono text-3xl m-0">{maxQuantity} <span className="muted text-sm">/ 5</span></p>
          <p className="muted text-xs mt-2">Respeita o saldo disponível</p>
        </div>
        <div className="card border-line-solid p-4">
          <p className="muted uppercase mono tracking-wider text-xs mb-2">Contador de treinos</p>
          <p className="paper mono text-3xl m-0">{Math.max(0, Number(player.daily_trainings) || 0)}</p>
          <p className="muted text-xs mt-2">Contagem registrada no servidor</p>
        </div>
      </div>

      {lastTraining?.playerId === player.id && (
        <div className="card kuro-academy-v3__receipt border border-success mb-6 p-4" role="status" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-success font-semibold text-sm">Último treino desta visita</p>
              <p className="paper mt-1">+{Number(lastTraining.gained).toLocaleString('pt-BR')} em {lastTraining.attribute} usando {lastTraining.quantity} ponto(s).</p>
            </div>
            {Number.isFinite(Number(lastTraining.remaining)) && (
              <span className="badge badge-green">Saldo informado pelo servidor: {lastTraining.remaining}</span>
            )}
          </div>
        </div>
      )}

      <div className="kuro-training-layout grid-sidebar gap-6 items-start">
        
        {/* LISTA DE ATRIBUTOS */}
        <div className="kuro-training-attributes card p-0 overflow-hidden">
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
                <button
                  key={attr.field}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Simular treino de ${attr.label}`}
                  disabled={loading}
                  className={`kuro-training-attribute flex-between w-full text-left px-6 py-4 border-b border-line-alpha-05 items-center cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-gold ${isSelected ? 'bg-seal-glow border-l-4 border-l-seal-bright' : 'bg-transparent border-l-4 border-l-transparent'}`}
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
                </button>
              );
            })}
          </div>
        </div>

        {/* SIMULADOR DE BUILD (PAINEL DIREITO) */}
        <div className="kuro-training-simulator kuro-academy-v3__training-simulator sticky top-6">
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

              <div className="card-glass kuro-academy-v3__estimate p-4 mb-6 border-line-dashed-bright" role="note">
                {(() => {
                  const { min, max, bonus } = getRange(selectedAttr.hero_min, selectedAttr.hero_max);
                  return (
                    <div className="flex-col gap-2">
                      <span className="muted uppercase mono text-xs">GANHO ESTIMADO POR {quantity} PONTO(S):</span>
                      <span className="paper mono text-md">
                        +{min * quantity} a +{max * quantity} <span className="gold text-xs">({bonus} de bônus por ponto, já incluído)</span>
                      </span>
                      <p className="muted text-xs leading-relaxed">
                        Estimativa baseada nas regras atuais. O servidor sorteia o resultado de cada ponto separadamente.
                      </p>
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
                      {renderSimChange('HP Máximo', field, min * quantity, max * quantity, calculateHP)}
                      {renderSimChange('Chakra (CP)', field, min * quantity, max * quantity, calculateChakra)}
                      {renderSimChange('Stamina (SP)', field, min * quantity, max * quantity, calculateStamina)}
                      {renderSimChange('Atk (Físico)', field, min * quantity, max * quantity, calculateAtkTaiBuk)}
                      {renderSimChange('Atk (Mágico)', field, min * quantity, max * quantity, calculateAtkNinGen)}
                      {renderSimChange('Def (Física)', field, min * quantity, max * quantity, calculateDefTaiBuk)}
                      {renderSimChange('Def (Mágica)', field, min * quantity, max * quantity, calculateDefNinGen)}
                      {renderSimChange('Chance Crítico', field, min * quantity, max * quantity, calculateCritChance)}
                      {renderSimChange('Esquiva', field, min * quantity, max * quantity, calculateDodgeChance)}
                    </div>
                  );
                })()}
              </div>

              <div className="flex-between gap-4 mb-4">
                <label htmlFor="training-quantity" className="muted text-sm">Pontos a gastar (até 5)</label>
                <select
                  id="training-quantity"
                  className="bg-ink-raised paper border-line-solid rounded-sm p-2"
                  value={maxQuantity > 0 ? quantity : ''}
                  onChange={(event) => setSelectedQuantity(Number(event.target.value))}
                  disabled={loading || maxQuantity === 0}
                >
                  {maxQuantity === 0 && <option value="">Sem pontos</option>}
                  {Array.from({ length: maxQuantity }, (_, index) => (
                    <option value={index + 1} key={index + 1}>{index + 1}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between text-sm muted border-t border-line-solid pt-3 mb-4" aria-live="polite">
                <span>Saldo após esta ação</span>
                <strong className="gold mono">{remaining} ponto(s)</strong>
              </div>
              <button
                type="button"
                className="btn-primary w-full p-4 text-md"
                onClick={handleTrain}
                disabled={loading || maxQuantity === 0}
              >
                <span>{loading ? 'Treinando...' : maxQuantity === 0 ? 'Sem pontos disponíveis' : `Confirmar ${quantity} ponto(s) em ${selectedAttr.label}`}</span>
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
