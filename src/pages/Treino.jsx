import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';


export default function Treino({ player, updatePlayer }) {
  const [loading, setLoading] = useState(false);
  const [attrsData, setAttrsData] = useState([]);
  const [ranksData, setRanksData] = useState([]);
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
    ninjutsu: "Aumenta o dano de técnicas Ninjutsu.",
    taijutsu: "Aumenta o dano de técnicas Taijutsu.",
    genjutsu: "Aumenta o dano de técnicas Genjutsu.",
    inteligencia: "Aumenta ataque e defesa de Ninjutsu e Genjutsu.",
    forca: "Aumenta o dano de Taijutsu, Bukijutsu e Vida Máxima (HP).",
    agilidade: "Aumenta sua Esquiva e a chance de Crítico.",
    selo: "Reduz o custo de Chakra de todas as habilidades.",
    resistencia: "Aumenta drasticamente HP, Chakra, Stamina e Defesa."
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
            
            return (
              <div key={field} className="flex-between" style={{ padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                
                {/* Ícone e Nome */}
                <div className="flex-row" style={{ flex: 1.5, gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>{icon}</span>
                  <div className="flex-col">
                    <span className="paper uppercase" style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>{label}</span>
                    <span className="muted" style={{ fontSize: '10px', lineHeight: '1.4', maxWidth: '200px' }}>{attrDesc[field]}</span>
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
                    <span className="gold mono" style={{ fontSize: '18px' }}>{player[field] || 0}</span>
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
