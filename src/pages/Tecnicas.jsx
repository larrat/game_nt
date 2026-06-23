import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const ALL_JUTSUS = [
  { id: 1, lvl: 1, name: 'Clones das Sombras (Falso)', desc: 'Cria clones ilusórios que não causam dano.', type: 'ATIVA' },
  { id: 2, lvl: 3, name: 'Corte Silencioso', desc: 'Desloca o usuário através de uma cortina de névoa, evitando o próximo ataque.', type: 'ATIVA' },
  { id: 3, lvl: 5, name: 'Passo de Névoa', desc: 'Desloca o usuário através de uma cortina de névoa.', type: 'ATIVA' },
  { id: 4, lvl: 8, name: 'Sussurro do Vento', desc: 'Reduz a velocidade do inimigo por dois turnos.', type: 'ATIVA' },
  { id: 5, lvl: 16, name: 'Véu de Mil Sombras', desc: 'Invoca clones de névoa para distrair múltiplos oponentes.', type: 'ATIVA' },
  { id: 6, lvl: 18, name: 'Marca Silente', desc: 'Aplica uma marca que revela a posição do inimigo por 3 turnos.', type: 'ATIVA' },
];

export default function Tecnicas({ player, updatePlayer }) {
  const [tab, setTab] = useState('tecnicas');

  if (!player) return null;

  const handleEquip = async (jutsu) => {
    // Para simplificar o protótipo inicial: 
    // Em App.jsx não estamos gravando no banco ainda.
    // Vamos apenas avisar e simular.
    const currentActive = player.activeJutsus || [];
    if (currentActive.find(j => j.id === jutsu.id)) {
      return alert("Você já equipou este Jutsu!");
    }
    if (currentActive.length >= 4) {
      return alert("Você só pode equipar 4 Jutsus por vez!");
    }

    player.activeJutsus = [...currentActive, jutsu];
    
    // updatePlayer normally fetches from DB, but we do a local mutation for now 
    // until we create the JSONB column in Supabase.
    alert(`${jutsu.name} equipado com sucesso! Veja na sua ficha.`);
  };

  return (
    <div>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">{player.name} · {player.clan ? `Clã ${player.clan}` : 'Sem Clã'}</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Técnicas & Inventário</h1>
      </div>

      <div className="tabs" style={{ marginBottom: '32px' }}>
        <div className={`tab ${tab === 'tecnicas' ? 'active' : ''}`} onClick={() => setTab('tecnicas')} style={{ cursor: 'pointer' }}>Técnicas</div>
        <div className={`tab ${tab === 'inventario' ? 'active' : ''}`} onClick={() => setTab('inventario')} style={{ cursor: 'pointer' }}>Inventário</div>
      </div>

      {tab === 'tecnicas' && (
        <>
          <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Você tem <strong style={{ color: 'var(--paper)' }}>3 pontos de técnica</strong> disponíveis para distribuir.</div>
            <div style={{ color: 'var(--muted)', fontSize: '13px' }}>Nível atual: <strong style={{ color: 'var(--paper)' }}>{player.level}</strong></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {ALL_JUTSUS.map(jutsu => {
              const isUnlocked = player.level >= jutsu.lvl;
              return (
                <div key={jutsu.id} style={{ background: 'var(--ink-soft)', border: `1px solid ${isUnlocked ? 'var(--seal-bright)' : 'var(--line)'}`, padding: '24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '2px', color: isUnlocked ? 'var(--gold)' : 'var(--muted)', marginBottom: '12px' }}>
                    {isUnlocked ? `NÍVEL ${jutsu.lvl} · ${jutsu.type}` : `REQUER NÍVEL ${jutsu.lvl}`}
                  </div>
                  <h4 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', marginBottom: '12px', color: isUnlocked ? 'var(--paper)' : 'var(--muted)' }}>
                    {jutsu.name}
                  </h4>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                    {jutsu.desc}
                  </p>
                  
                  {isUnlocked ? (
                    <button className="btn-ghost" style={{ width: '100%', padding: '8px' }} onClick={() => handleEquip(jutsu)}>
                      Equipar Jutsu
                    </button>
                  ) : (
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', textAlign: 'center' }}>
                      Bloqueada
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'inventario' && (
        <div style={{ marginTop: '48px' }}>
          <div style={{ marginBottom: '18px' }}>
            <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '19px' }}>Mochila Ninja</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>🔪</div><div style={{ fontSize: '11px' }}>Kunai x12</div></div>
            <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>💊</div><div style={{ fontSize: '11px' }}>Elixir x3</div></div>
            <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--line)', padding: '16px', textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>📜</div><div style={{ fontSize: '11px' }}>Pergaminho x1</div></div>
            <div style={{ background: 'transparent', border: '1px dashed var(--line)', height: '100px' }}></div>
            <div style={{ background: 'transparent', border: '1px dashed var(--line)', height: '100px' }}></div>
            <div style={{ background: 'transparent', border: '1px dashed var(--line)', height: '100px' }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
