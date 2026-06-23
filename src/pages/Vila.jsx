import React, { useState } from 'react';
import '../styles/main.css';
import { useNavigate } from 'react-router-dom';
import { calculateVillageLevelFromXP, calculateVillageXPForLevel } from '../utils/engine';

const VILLAGES = {
  1: 'Folha',
  2: 'Areia',
  3: 'Névoa',
  4: 'Pedra',
  5: 'Nuvem',
  6: 'Som',
  7: 'Chuva'
};

export default function Vila({ player }) {
  const [villageXP, setVillageXP] = useState(0);
  const [villageLevel, setVillageLevel] = useState(1);
  const navigate = useNavigate();

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
    <div>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">Progresso & Edifícios</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>
          Vila da {VILLAGES[player.village_id] || 'Desconhecida'}
        </h1>
      </div>

      <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '32px', marginBottom: '48px' }}>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '19px', color: 'var(--gold)', marginBottom: '12px' }}>Melhorando sua Vila</h3>
        <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6', marginBottom: '16px' }}>Os Kages precisam escolher as melhorias básicas para sua Vila. Para fazer essas melhorias, a Vila vai precisar subir de Level e ganhar pontos requeridos.</p>
        <ul style={{ color: 'var(--muted)', fontSize: '13px', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>Completar um Objetivo da Vila: <strong style={{ color: 'var(--paper)' }}>500 EXP</strong></li>
          <li>Vencer um inimigo invasor na sua Vila: <strong style={{ color: 'var(--paper)' }}>10 EXP</strong></li>
          <li>Completar um Evento de Vila: <strong style={{ color: 'var(--paper)' }}>1000 EXP</strong></li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Hokage</div>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>獅</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Leo</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Herói - Lvl. 67</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--gold)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>Conselheiro</div>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>剣</div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>Fakuart</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Herói - Lvl. 56</div>
        </div>
      </div>

      <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '24px', marginBottom: '48px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: 'var(--muted)' }}>
          <div>LEVEL ATUAL: <span style={{ color: 'var(--paper)', fontSize: '14px' }}>{villageLevel}</span></div>
          <div style={{ textAlign: 'right' }}>PRÓXIMO LEVEL: <span style={{ color: 'var(--gold)', fontSize: '14px' }}>{villageLevel + 1}</span></div>
        </div>
        <div style={{ height: '8px', background: 'var(--ink-raised)', position: 'relative', marginBottom: '12px' }}>
          <div style={{ width: `${xpPercent}%`, height: '100%', background: 'var(--seal-bright)', transition: 'width 0.3s' }}></div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
          {villageXP} Exp de / {maxXP} Exp
        </div>
      </div>

      <div style={{ marginBottom: '48px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13px', color: 'var(--muted)' }}>Simular Ganho de Exp:</h3>
        <button className="btn-ghost" onClick={() => addXP(100)} style={{ padding: '8px 16px' }}>Doar Recursos (+100 XP)</button>
        <button className="btn-ghost" onClick={() => addXP(500)} style={{ padding: '8px 16px' }}>Missão de Vila (+500 XP)</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '22px', marginBottom: '8px' }}>Edifícios da Vila</h3>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Clique nas estruturas para acessá-las.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '24px' }}>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => navigate('/hospital')}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏥</div>
          <div style={{ color: 'var(--gold)', fontSize: '14px', marginBottom: '8px' }}>★ ★ ★ ☆ ☆</div>
          <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Hospital da Vila</h4>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Recupere sua Vida (HP) e Chakra pagando com Ryous.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => alert("Em breve!")}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍜</div>
          <div style={{ color: 'var(--gold)', fontSize: '14px', marginBottom: '8px' }}>★ ★ ☆ ☆ ☆</div>
          <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Ramen Ichiraku</h4>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Recupere sua Stamina comendo os melhores Ramens.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => alert("Em breve!")}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
          <div style={{ color: 'var(--gold)', fontSize: '14px', marginBottom: '8px' }}>★ ★ ★ ★ ☆</div>
          <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Painel de Missões</h4>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Missões de Rank D até S exclusivas da vila.</p>
        </div>
      </div>
    </div>
  );
}
