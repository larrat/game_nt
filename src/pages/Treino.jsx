import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { 
  calculateHP, 
  calculateChakra, 
  calculateStamina,
  calculateAtkTaiBuk,
  calculateAtkNinGen,
  calculateDefTaiBuk,
  calculateDefNinGen,
  calculatePerfuracao,
  calculatePrecisao,
  calculateConcentracao,
  calculatePercepcao,
  calculateConviccao,
  calculateDeterminacao
} from '../utils/engine';

export default function Treino({ player, updatePlayer }) {
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  // Fórmulas
  const f_hp = calculateHP(player);
  const f_chakra = calculateChakra(player);
  const f_stamina = calculateStamina(player);
  const f_atk_tai_buk = calculateAtkTaiBuk(player);
  const f_atk_nin_gen = calculateAtkNinGen(player);
  const f_def_tai_buk = calculateDefTaiBuk(player);
  const f_def_nin_gen = calculateDefNinGen(player);
  const f_perfuracao = calculatePerfuracao(player);
  const f_precisao = calculatePrecisao(player);
  const f_concentracao = calculateConcentracao(player);
  const f_percepcao = calculatePercepcao(player);
  const f_conviccao = calculateConviccao(player);
  const f_determinacao = calculateDeterminacao(player);

  const handleAddAttribute = async (attrName) => {
    if (player.pontos_atributos <= 0) return;
    setLoading(true);

    const newVal = (player[attrName] || 0) + 1;
    const newPts = player.pontos_atributos - 1;

    const { error } = await supabase
      .from('players')
      .update({ [attrName]: newVal, pontos_atributos: newPts })
      .eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
    }
    setLoading(false);
  };

  const renderAttrRow = (icon, label, dbField) => {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--paper)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--muted)' }}>+ {player[dbField] || 0}</span>
          {player.pontos_atributos > 0 && (
            <button 
              onClick={() => handleAddAttribute(dbField)} 
              disabled={loading}
              style={{ background: 'var(--seal-bright)', color: 'black', border: 'none', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}
            >
              +
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFormulaRow = (icon, label, value, tooltip) => {
    return (
      <div title={tooltip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)' }}>{label}</span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--paper)' }}>{value}</span>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">Atributos e Fórmulas</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Treinamento Ninja</h1>
      </div>

      <div style={{ background: 'var(--ink)', padding: '24px', border: '1px solid var(--line)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '1px' }}>PONTOS DISPONÍVEIS</div>
          <div style={{ fontSize: '32px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--gold)' }}>{player.pontos_atributos || 0}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', letterSpacing: '1px' }}>STATUS</div>
          <div style={{ color: player.pontos_atributos > 0 ? 'var(--seal-bright)' : 'var(--muted)' }}>
            {player.pontos_atributos > 0 ? 'Pontos para distribuir!' : 'Nenhum ponto disponível'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Atributos Base</h3>
          
          <div style={{ marginBottom: '24px' }}>
            {renderAttrRow('🥋', 'Taijutsu', 'taijutsu')}
            {renderAttrRow('⚔️', 'Bukijutsu', 'bukijutsu')}
            {renderAttrRow('🔥', 'Ninjutsu', 'ninjutsu')}
            {renderAttrRow('👁️', 'Genjutsu', 'genjutsu')}
          </div>

          <div style={{ marginBottom: '24px' }}>
            {renderAttrRow('💪', 'Força', 'forca')}
            {renderAttrRow('⚡', 'Agilidade', 'agilidade')}
            {renderAttrRow('🧠', 'Inteligência', 'inteligencia')}
          </div>

          <div>
            {renderAttrRow('📜', 'Selo', 'selo')}
            {renderAttrRow('🛡️', 'Resistência', 'resistencia')}
            {renderAttrRow('🔋', 'Energia', 'energia')}
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
          <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '16px' }}>Fórmulas Derivadas</h3>
          
          <div style={{ marginBottom: '24px' }}>
            {renderFormulaRow('❤️', 'Vida', f_hp, 'HP Máximo')}
            {renderFormulaRow('🌀', 'Chakra', f_chakra, 'Chakra Máximo')}
            {renderFormulaRow('⚡', 'Stamina', f_stamina, 'Energia Física')}
          </div>

          <div style={{ marginBottom: '24px' }}>
            {renderFormulaRow('⚔️', 'Ataque (Físico)', f_atk_tai_buk, 'Ataque de Taijutsu/Bukijutsu')}
            {renderFormulaRow('🔥', 'Ataque (Mágico)', f_atk_nin_gen, 'Ataque de Ninjutsu/Genjutsu')}
            {renderFormulaRow('🛡️', 'Defesa (Física)', f_def_tai_buk, 'Defesa contra Taijutsu/Bukijutsu')}
            {renderFormulaRow('🔮', 'Defesa (Mágica)', f_def_nin_gen, 'Defesa contra Ninjutsu/Genjutsu')}
          </div>

          <div>
            {renderFormulaRow('🎯', 'Perfuração', f_perfuracao, 'Ignora defesas físicas')}
            {renderFormulaRow('👁️', 'Precisão', f_precisao, 'Ignora defesas mágicas')}
            {renderFormulaRow('🧘', 'Concentração', f_concentracao, 'Bônus de dano extra em jutsus')}
            {renderFormulaRow('🦅', 'Percepção', f_percepcao, 'Reduz chance de acerto crítico inimigo')}
            {renderFormulaRow('🔥', 'Convicção', f_conviccao, 'Aumenta acerto crítico de magias')}
            {renderFormulaRow('✊', 'Determinação', f_determinacao, 'Aumenta acerto crítico de físicos')}
          </div>
        </div>
      </div>
    </div>
  );
}
