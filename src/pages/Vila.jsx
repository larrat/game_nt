import React, { useState, useEffect } from 'react';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import { calculateVillageLevelFromXP, calculateVillageXPForLevel } from '../utils/engine';
import { supabase } from '../supabaseClient';


export default function Vila({ player }) {
  const [villageXP, setVillageXP] = useState(0);
  const [villageLevel, setVillageLevel] = useState(1);
  const [kage, setKage] = useState(null);
  const [villageData, setVillageData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!player) return;
    async function fetchData() {
      // Fetch Kage
      const { data: kageData } = await supabase
        .from('players')
        .select('name, level, class')
        .eq('village_id', player.village_id)
        .order('level', { ascending: false })
        .order('xp', { ascending: false })
        .limit(1);
      
      if (kageData && kageData.length > 0) {
        setKage(kageData[0]);
      }

      // Fetch Village
      const { data: vData } = await supabase
        .from('villages')
        .select('*')
        .eq('id', player.village_id)
        .single();
      
      if (vData) {
        setVillageData(vData);
      }
    }
    fetchData();
  }, [player]);

  if (!player) return null;

  const maxXP = calculateVillageXPForLevel(villageLevel + 1);
  const xpPercent = Math.min(100, (villageXP / maxXP) * 100);

  const addXP = (amount) => {
    let newXp = villageXP + amount;
    let newLevel = calculateVillageLevelFromXP(newXp);
    
    setVillageXP(newXp);
    setVillageLevel(newLevel);
  };

  return (
    <div className="page">
      <PageHeader eyebrow='Progresso & Edifícios' title={`Vila da ${villageData?.name || 'Desconhecida'}`} />

      <div className="card" style={{ marginBottom: '48px' }}>
        <h3 className="gold card-title" style={{ fontSize: '19px', marginBottom: '12px' }}>Melhorando sua Vila</h3>
        <p className="muted" style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>Os Kages precisam escolher as melhorias básicas para sua Vila. Para fazer essas melhorias, a Vila vai precisar subir de Level e ganhar pontos requeridos.</p>
        <ul className="muted" style={{ fontSize: '13px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Completar um Objetivo da Vila: <strong className="paper">500 EXP</strong></li>
          <li>Vencer um inimigo invasor na sua Vila: <strong className="paper">10 EXP</strong></li>
          <li>Completar um Evento de Vila: <strong className="paper">1000 EXP</strong></li>
        </ul>
      </div>

      <div className="grid-auto" style={{ gap: '24px', marginBottom: '48px' }}>
        <div className="card" style={{ textAlign: 'center', border: '1px solid var(--gold)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--gold)' }}></div>
          <div className="gold uppercase" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '12px', fontWeight: 'bold' }}>{villageData?.leader_title || 'Líder'}</div>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👑</div>
          <div className="paper" style={{ fontWeight: 600, marginBottom: '4px', fontSize: '18px' }}>{kage ? kage.name : 'Vago'}</div>
          <div className="muted" style={{ fontSize: '12px' }}>{kage ? `${kage.class || 'NIN'} - Lvl. ${kage.level}` : 'Nenhum líder'}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', opacity: 0.5 }}>
          <div className="muted uppercase" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>Conselheiro</div>
          <div style={{ fontSize: '40px', marginBottom: '12px', filter: 'grayscale(1)' }}>⛩️</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Vago</div>
          <div className="muted" style={{ fontSize: '12px' }}>Posição não ocupada</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '48px' }}>
        <div className="flex-between mono muted" style={{ marginBottom: '12px', fontSize: '11px' }}>
          <div>LEVEL ATUAL: <span className="paper" style={{ fontSize: '14px' }}>{villageLevel}</span></div>
          <div style={{ textAlign: 'right' }}>PRÓXIMO LEVEL: <span className="gold" style={{ fontSize: '14px' }}>{villageLevel + 1}</span></div>
        </div>
        <div className="progress-track" style={{ marginBottom: '12px' }}>
          <div className="progress-fill red" style={{ width: `${xpPercent}%` }}></div>
        </div>
        <div className="muted" style={{ textAlign: 'center', fontSize: '12px' }}>
          {villageXP} Exp de / {maxXP} Exp
        </div>
      </div>

      <div className="flex-row" style={{ marginBottom: '48px', gap: '16px', alignItems: 'center' }}>
        <h3 className="muted" style={{ fontSize: '13px' }}>Simular Ganho de Exp:</h3>
        <button className="btn-ghost" onClick={() => addXP(100)}>Doar Recursos (+100 XP)</button>
        <button className="btn-ghost" onClick={() => addXP(500)}>Missão de Vila (+500 XP)</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 className="section-title" style={{ fontSize: '22px', marginBottom: '8px' }}>Edifícios da Vila</h3>
        <p className="muted" style={{ fontSize: '13px' }}>Clique nas estruturas para acessá-las.</p>
      </div>

      <div className="grid-auto" style={{ gap: '24px' }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/hospital')}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
          <div className="gold" style={{ fontSize: '14px', marginBottom: '8px' }}>★ ★ ★ ☆ ☆</div>
          <h4 className="card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Hospital da Vila</h4>
          <p className="muted" style={{ fontSize: '12px' }}>Recupere sua Vida (HP) e Chakra pagando com Ryous.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => alert("Em breve!")}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍜</div>
          <div className="gold" style={{ fontSize: '14px', marginBottom: '8px' }}>★ ★ ☆ ☆ ☆</div>
          <h4 className="card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Ramen Ichiraku</h4>
          <p className="muted" style={{ fontSize: '12px' }}>Recupere sua Stamina comendo os melhores Ramens.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => alert("Em breve!")}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
          <div className="gold" style={{ fontSize: '14px', marginBottom: '8px' }}>★ ★ ★ ★ ☆</div>
          <h4 className="card-title" style={{ fontSize: '16px', marginBottom: '8px' }}>Painel de Missões</h4>
          <p className="muted" style={{ fontSize: '12px' }}>Missões de Rank D até S exclusivas da vila.</p>
        </div>
      </div>
    </div>
  );
}
