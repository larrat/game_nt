import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/main.css';

const NPCS = [
  {
    id: 1,
    name: 'Estudante Rebelde',
    avatar: '👦',
    level: 1,
    hp: 120,
    chakra: 60,
    atk: 10,
    def: 5,
    xpReward: 150,
    ryouReward: 50,
    desc: 'Um estudante da academia que sempre falta nas aulas.'
  },
  {
    id: 2,
    name: 'Ladrão de Pergaminhos',
    avatar: '🥷',
    level: 5,
    hp: 250,
    chakra: 100,
    atk: 25,
    def: 15,
    xpReward: 400,
    ryouReward: 120,
    desc: 'Um mercenário de nível baixo roubando segredos da vila.'
  },
  {
    id: 3,
    name: 'Chunin Traidor',
    avatar: '👺',
    level: 15,
    hp: 800,
    chakra: 300,
    atk: 60,
    def: 40,
    xpReward: 1200,
    ryouReward: 450,
    desc: 'Um ninja experiente que abandonou sua lealdade.'
  }
];

export default function Dojo({ player }) {
  const navigate = useNavigate();

  if (!player) return null;

  const handleChallenge = (npc) => {
    navigate('/combate', { state: { npc } });
  };

  return (
    <div>
      <div className="topbar" style={{ marginBottom: '48px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">Treinamento e Combate</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Dojo da Vila</h1>
      </div>

      <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '32px', marginBottom: '48px' }}>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '19px', color: 'var(--gold)', marginBottom: '12px' }}>A Arena de Treinamento</h3>
        <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.6' }}>
          O Dojo é o local onde você pode testar suas habilidades contra NPCs do mundo ninja.
          Lute para ganhar experiência, testar suas novas Kekkei Genkais e coletar Ryous.<br/>
          <strong style={{ color: 'var(--paper)' }}>Aviso:</strong> Se você for derrotado, não perderá progresso, mas se fugir, a batalha será cancelada.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {NPCS.map(npc => (
          <div key={npc.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '60px', height: '60px', background: 'var(--ink-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '1px solid var(--line)' }}>
                {npc.avatar}
              </div>
              <div>
                <h4 style={{ fontSize: '16px', color: 'var(--seal-bright)', marginBottom: '4px' }}>{npc.name}</h4>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>Nível {npc.level}</div>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5' }}>{npc.desc}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--ink)', padding: '12px', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Vida (HP): <span style={{ color: '#4ade80' }}>{npc.hp}</span></div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Ataque: <span style={{ color: 'var(--paper)' }}>{npc.atk}</span></div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Chakra: <span style={{ color: '#3b82f6' }}>{npc.chakra}</span></div>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Defesa: <span style={{ color: 'var(--paper)' }}>{npc.def}</span></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11px' }}>
                <div style={{ color: '#4ade80' }}>+{npc.xpReward} XP</div>
                <div style={{ color: '#3b82f6' }}>+{npc.ryouReward} RY</div>
              </div>
              <button className="btn-ghost" style={{ padding: '8px 16px', border: '1px solid var(--seal-bright)' }} onClick={() => handleChallenge(npc)}>
                Desafiar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
