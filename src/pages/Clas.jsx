import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const CLANS = [
  {
    id: 'Uchiha',
    name: 'Clã Uchiha',
    image: 'https://placehold.co/200x400/1c1c22/b3232d?text=Uchiha',
    description: 'Alguns dos membros do clã ganham o poder do Sharingan, um olho vermelho que tem a habilidade de copiar ninjutsus, genjutsus e taijutsus com muita facilidade e armazená-los na mente para usá-los quando bem entender. O Sharingan dá a habilidade de prever o oponente.',
    skills: [
      { name: 'Sharingan Nível 1', req: '+3 Nin, +2 Tai, +2 Gen', effect: '+2% Crítico' },
      { name: 'Sharingan Nível 2', req: '+6 Nin, +4 Tai, +4 Gen', effect: '+4% Crítico' },
      { name: 'Fuumetsu Mangekyou', req: '+15 Nin, +10 Tai', effect: '+10% Crítico, +5% Dano' },
    ]
  },
  {
    id: 'Hyuga',
    name: 'Clã Hyuga',
    image: 'https://placehold.co/200x400/1c1c22/c9a227?text=Hyuga',
    description: 'Os membros deste clã possuem o Byakugan, um dojutsu que lhes concede visão de 360 graus e a capacidade de ver o fluxo de chakra. Especialistas no estilo de combate Punho Suave (Juken).',
    skills: [
      { name: 'Byakugan Nível 1', req: '+4 Tai, +1 Agi', effect: '+3% Esquiva' },
      { name: 'Oito Trigramas', req: '+10 Tai, +5 Agi', effect: 'Bloqueia Chakra' },
    ]
  },
  {
    id: 'Senju',
    name: 'Clã Senju',
    image: 'https://placehold.co/200x400/1c1c22/4ade80?text=Senju',
    description: 'O clã com a maior força vital e reservas de chakra. Especialistas na Liberação de Madeira (Mokuton), são conhecidos pela vitalidade e técnicas de cura naturais.',
    skills: [
      { name: 'Cura Passiva', req: '+5 Stamina', effect: 'Regenera 5% HP' },
      { name: 'Mokuton', req: '+10 Nin, +10 Força', effect: 'Dano em Área' },
    ]
  }
];

export default function Clas({ player, updatePlayer }) {
  const [selectedClanIdx, setSelectedClanIdx] = useState(0);
  const [points, setPoints] = useState(7);
  const [formulaPoints, setFormulaPoints] = useState(3);
  
  // Stats distribution state
  const [stats, setStats] = useState({
    tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, def: 0
  });
  
  const [formulas, setFormulas] = useState({
    hp: 0, chakra: 0
  });

  if (!player) return null;

  const clan = CLANS[selectedClanIdx];

  const handleStatChange = (stat, amount) => {
    if (amount > 0 && points > 0) {
      setStats({ ...stats, [stat]: stats[stat] + 1 });
      setPoints(points - 1);
    } else if (amount < 0 && stats[stat] > 0) {
      setStats({ ...stats, [stat]: stats[stat] - 1 });
      setPoints(points + 1);
    }
  };

  const handleFormulaChange = (stat, amount) => {
    if (amount > 0 && formulaPoints > 0) {
      setFormulas({ ...formulas, [stat]: formulas[stat] + 1 });
      setFormulaPoints(formulaPoints - 1);
    } else if (amount < 0 && formulas[stat] > 0) {
      setFormulas({ ...formulas, [stat]: formulas[stat] - 1 });
      setFormulaPoints(formulaPoints + 1);
    }
  };

  const handleJoinClan = async () => {
    if (points > 0 || formulaPoints > 0) {
      alert("Distribua todos os seus pontos antes de entrar no Clã!");
      return;
    }

    const { error } = await supabase
      .from('players')
      .update({
        clan: clan.id,
        tai: (player.tai || 0) + stats.tai,
        nin: (player.nin || 0) + stats.nin,
        gen: (player.gen || 0) + stats.gen,
        buk: (player.buk || 0) + stats.buk,
        // we can map other stats if they exist in DB
      })
      .eq('id', player.id);

    if (error) {
      alert("Erro ao entrar no Clã: " + error.message);
    } else {
      alert(`Você agora é um membro do ${clan.name}!`);
      updatePlayer(player.user_id);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="eyebrow">Sangue e Linhagem</div>
          <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Escolha seu Clã</h1>
        </div>
      </div>

      {player.clan ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '24px', color: 'var(--seal-bright)', marginBottom: '16px' }}>
            Você pertence ao Clã {player.clan}
          </h2>
          <p style={{ color: 'var(--muted)' }}>Você já possui uma linhagem ninja registrada.</p>
        </div>
      ) : (
        <div className="clan-system">
          {/* CAROUSEL */}
          <div className="clan-carousel" style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px', justifyContent: 'center' }}>
            <button className="btn-ghost" onClick={() => setSelectedClanIdx(Math.max(0, selectedClanIdx - 1))}>❮</button>
            
            <div style={{ display: 'flex', gap: '16px', overflow: 'hidden', width: '600px', justifyContent: 'center' }}>
              {CLANS.map((c, idx) => (
                <div key={c.id} style={{ 
                  opacity: idx === selectedClanIdx ? 1 : 0.4, 
                  transform: idx === selectedClanIdx ? 'scale(1.1)' : 'scale(0.9)',
                  transition: 'all 0.3s ease',
                  border: idx === selectedClanIdx ? '2px solid var(--seal-bright)' : '2px solid transparent'
                }}>
                  <img src={c.image} alt={c.name} style={{ width: '150px', height: '250px', objectFit: 'cover' }} />
                </div>
              ))}
            </div>

            <button className="btn-ghost" onClick={() => setSelectedClanIdx(Math.min(CLANS.length - 1, selectedClanIdx + 1))}>❯</button>
          </div>

          {/* DESCRIÇÃO */}
          <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '28px', marginBottom: '16px' }}>{clan.name}</h2>
            <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>{clan.description}</p>
          </div>

          {/* DISTRIBUIÇÃO DE ATRIBUTOS */}
          <div className="card" style={{ marginBottom: '48px' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>Personalize os atributos do seu Clã</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}>
              {/* Stats group */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {['tai', 'nin', 'gen', 'buk', 'vel', 'def'].map(attr => (
                  <div key={attr} style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', background: 'var(--ink-raised)', border: '1px solid var(--line)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', textTransform: 'uppercase' }}>
                      {attr}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--ink)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--line)' }}>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--paper)', cursor: 'pointer' }} onClick={() => handleStatChange(attr, -1)}>-</button>
                      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{stats[attr]}</span>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--paper)', cursor: 'pointer' }} onClick={() => handleStatChange(attr, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', marginBottom: '32px', fontSize: '13px' }}>
              <div style={{ color: points > 0 ? 'var(--seal-bright)' : 'var(--muted)' }}>
                <strong>{points}</strong> Pontos Disponíveis para atributos
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className="btn-primary" onClick={handleJoinClan} disabled={points > 0 || formulaPoints > 0}>
                <span>Entrar no Clã</span>
                <div className="stamp"></div>
              </button>
            </div>
          </div>

          {/* KEKKEI GENKAI / JUTSUS PREVIEW */}
          <div>
            <h3 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--muted)' }}>Habilidades do Clã (Prévia)</h3>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '16px' }}>
              {clan.skills.map((skill, idx) => (
                <div key={idx} style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '24px', width: '250px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ width: '60px', height: '60px', background: 'var(--ink)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👁️</div>
                  <h4 style={{ color: 'var(--gold)', marginBottom: '16px', fontSize: '14px' }}>{skill.name}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Requisitos:</div>
                  <div style={{ fontSize: '11px', marginBottom: '16px' }}>{skill.req}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Efeito:</div>
                  <div style={{ fontSize: '13px', color: 'var(--paper)', marginBottom: '24px' }}>{skill.effect}</div>
                  
                  <button className="btn-ghost" style={{ width: '100%', padding: '8px' }} disabled>Treinar</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </>
  );
}
