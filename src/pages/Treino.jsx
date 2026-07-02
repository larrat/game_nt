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
  const [flashAttr, setFlashAttr] = useState(null);
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
    ninjutsu: { text: "Aumenta dano de Ninjutsu.", detail: "Jutsus como Katon, Suiton e elementos usam este valor.", color: '#60a5fa' },
    taijutsu: { text: "Aumenta dano corpo-a-corpo.", detail: "Ataques físicos e Taijutsu direto usam este valor.", color: '#f97316' },
    genjutsu: { text: "Aumenta dano de Ilusorismos.", detail: "Jutsus de Genjutsu e efeitos de status usam este valor.", color: '#a78bfa' },
    inteligencia: { text: "Amplifica Ninjutsu + Genjutsu.", detail: "Cada ponto de INT multiplica seu dano mágico.", color: '#34d399' },
    forca: { text: "Aumenta Taijutsu e HP Máximo.", detail: "Cada ponto de FOR aumenta também quantos PV você carrega.", color: '#ef4444' },
    agilidade: { text: "Aumenta Esquiva e Crítico.", detail: "Chance de não ser acertado e de causar dano duplo.", color: '#facc15' },
    selo: { text: "Desconta o custo de Chakra.", detail: "Cada ponto de Selo reduz 1% do custo de todos os jutsus (máx 50%).", color: '#c084fc' },
    resistencia: { text: "Aumenta HP, Chakra e Def.", detail: "O atributo mais versátil: aumenta tudo relacionado à sua durabilidade.", color: '#2dd4bf' },
    energia: { text: "Vitalidade Bruta.", detail: "Aumenta massivamente seu HP Máximo, Chakra e Stamina. Base para sobrevivência longa.", color: '#d97706' }
  };

  const getRange = (heroMin, heroMax) => {
    const min = Math.max(1, Math.floor(heroMin * rankMultiplier.minMult));
    const max = Math.max(1, Math.floor(heroMax * rankMultiplier.maxMult));
    return { min, max, bonus: rankMultiplier.bonus };
  };

  const handleTrain = async (field, label, heroMin, heroMax) => {
    if (player.pontos_atributos <= 0) {
      addToast('Você não tem Pontos de Atributo disponíveis!', 'error');
      return;
    }
    
    setLoading(true);
    
    const { min, max, bonus } = getRange(heroMin, heroMax);
    const roll = Math.floor(Math.random() * (max - min + 1)) + min;
    const totalGained = roll + bonus;

    const newDailyTrainings = (player.daily_trainings || 0) + 1;

    const { error } = await supabase
      .from('players')
      .update({ 
        [field]: (player[field] || 0) + totalGained, 
        pontos_atributos: player.pontos_atributos - 1,
        daily_trainings: newDailyTrainings
      })
      .eq('id', player.id);

    if (error) {
      addToast('Erro no treinamento: ' + error.message, 'error');
    } else {
      addToast(`Treinamento concluído! Você ganhou +${totalGained} em ${label} (Rolou ${roll} + ${bonus} Bônus)`, 'success');
      await updatePlayer(player.user_id);
      setFlashAttr(field);
      setTimeout(() => setFlashAttr(null), 800);
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <PageHeader 
        eyebrow={`Graduação: ${playerRank}`} 
        title='Centro de Treinamento' 
        subtitle='Gaste seus pontos de atributo para rolar os dados. O valor ganho depende da sua Graduação atual!' 
      />

      <div className="flex-between" style={{ background: 'var(--ink-raised)', padding: '16px 24px', borderRadius: '8px', border: '1px solid var(--seal-bright)', marginBottom: '24px' }}>
        <span className="muted uppercase mono" style={{ fontSize: '13px', letterSpacing: '1px' }}>Pontos Disponíveis para Treino</span>
        <span className="gold mono" style={{ fontSize: '32px' }}>{player.pontos_atributos || 0}</span>
      </div>

      <div className="grid-4" style={{ marginBottom: '24px', gap: '16px' }}>
        <div className="card-glass flex-col" style={{ padding: '16px', border: '1px solid var(--seal-bright)', alignItems: 'center', textAlign: 'center' }}>
           <span className="muted uppercase mono" style={{ fontSize: '11px', marginBottom: '8px' }}>HP / CP / SP</span>
           <span className="gold mono" style={{ fontSize: '15px' }}>{calculateHP(player)} / {calculateChakra(player)} / {calculateStamina(player)}</span>
        </div>
        <div className="card-glass flex-col" style={{ padding: '16px', border: '1px solid var(--seal-bright)', alignItems: 'center', textAlign: 'center' }}>
           <span className="muted uppercase mono" style={{ fontSize: '11px', marginBottom: '8px' }}>Atk (Fís / Mag)</span>
           <span className="danger mono" style={{ fontSize: '15px' }}>{calculateAtkTaiBuk(player)} / {calculateAtkNinGen(player)}</span>
        </div>
        <div className="card-glass flex-col" style={{ padding: '16px', border: '1px solid var(--seal-bright)', alignItems: 'center', textAlign: 'center' }}>
           <span className="muted uppercase mono" style={{ fontSize: '11px', marginBottom: '8px' }}>Def (Fís / Mag)</span>
           <span className="success mono" style={{ fontSize: '15px' }}>{calculateDefTaiBuk(player)} / {calculateDefNinGen(player)}</span>
        </div>
        <div className="card-glass flex-col" style={{ padding: '16px', border: '1px solid var(--seal-bright)', alignItems: 'center', textAlign: 'center' }}>
           <span className="muted uppercase mono" style={{ fontSize: '11px', marginBottom: '8px' }}>Crítico / Esquiva</span>
           <span className="gold mono" style={{ fontSize: '15px' }}>{calculateCritChance(player)}% / {calculateDodgeChance(player)}%</span>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Título da Tabela parecido com a imagem */}
        <div style={{ background: 'var(--ink-soft)', padding: '12px 24px', borderBottom: '1px solid var(--line)', textAlign: 'center' }}>
          <h3 className="gold mono uppercase" style={{ letterSpacing: '2px', fontSize: '14px', margin: 0 }}>
            Tabela de Treinamento — {playerRank}
          </h3>
        </div>

        {/* Linhas da Tabela */}
        <div className="flex-col">
          {attrsData.map(({ icon, label, field, hero_min, hero_max }) => {
            const { min, max, bonus } = getRange(hero_min, hero_max);
            const baseValue = player[field] || 0;
            const equipValue = getEquipmentBonus(player, field);
            const totalValue = baseValue + equipValue;
            
            return (
              <div key={field} className="flex-between" style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                
                {/* Ícone e Nome */}
                <div className="flex-row" style={{ flex: 1.5, gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px', marginTop: '2px' }}>{icon}</span>
                  <div className="flex-col">
                    <div className="flex-row" style={{ gap: '8px', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="paper uppercase" style={{ fontSize: '13px', fontWeight: 'bold' }}>{label}</span>
                      <span className="mono" style={{ 
                        fontSize: '11px', 
                        background: `${attrDesc[field]?.color}20`, 
                        color: attrDesc[field]?.color, 
                        borderRadius: '3px', 
                        padding: '1px 6px', 
                        border: `1px solid ${attrDesc[field]?.color}40`,
                        transition: 'all 0.3s ease',
                        transform: flashAttr === field ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: flashAttr === field ? `0 0 15px ${attrDesc[field]?.color}` : 'none'
                      }}>
                        {totalValue} pts {equipValue > 0 ? `(+${equipValue} Equip)` : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: attrDesc[field]?.color, marginBottom: '1px' }}>{attrDesc[field]?.text}</span>
                    <span className="muted" style={{ fontSize: '10px', lineHeight: '1.4', maxWidth: '280px' }}>{attrDesc[field]?.detail}</span>
                  </div>
                </div>

                {/* Range e Bonus */}
                <div className="flex-row" style={{ flex: 1, justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
                  <span className="muted mono uppercase" style={{ fontSize: '11px' }}>Range ({min} até {max} pts)</span>
                  <span className="danger mono" style={{ fontSize: '12px', fontWeight: 'bold' }}>+{bonus} 🔥</span>
                </div>

                {/* Valor Atual e Botão */}
                <div className="flex-row" style={{ flex: 1, justifyContent: 'flex-end', gap: '24px', alignItems: 'center' }}>
                  <div className="flex-col" style={{ alignItems: 'flex-end' }}>
                    <span className="muted mono" style={{ fontSize: '10px' }}>TOTAL</span>
                    <span className="gold mono" style={{ fontSize: '18px' }}>{totalValue}</span>
                  </div>
                  
                  <button 
                    className="btn-primary" 
                    onClick={() => handleTrain(field, label, hero_min, hero_max)}
                    disabled={loading || player.pontos_atributos <= 0}
                    style={{ padding: '8px 24px', fontSize: '12px' }}
                  >
                    TREINAR
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
