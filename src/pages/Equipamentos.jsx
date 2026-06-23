import React from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const INVENTORY = [
  { id: 1, name: 'Kunai de Combate', type: 'Arma', stats: { tai: 15, vel: 5 }, desc: '+15 Ataque (Tai), +5 Velocidade' },
  { id: 2, name: 'Colete Tático ANBU', type: 'Tronco', stats: { def: 40, stamina: 10 }, desc: '+40 Defesa, +10 Stamina' }
];

export default function Equipamentos({ player, updatePlayer }) {
  if (!player) return null;

  const handleEquip = (item) => {
    // Para simplificar o protótipo: avisar que equipou
    alert(`${item.name} equipado com sucesso! Seus status seriam atualizados no banco de dados.`);
  };

  return (
    <div>
      <div className="topbar" style={{ marginBottom: '48px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">{player.name} · {player.clan ? `Clã ${player.clan}` : 'Sem Clã'}</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Equipamentos Ninja</h1>
      </div>

      <div className="equip-layout" style={{ display: 'flex', gap: '48px', justifyContent: 'center', marginBottom: '64px', flexWrap: 'wrap' }}>
        {/* Coluna Esquerda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--seal-bright)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>額</div>
            <div style={{ fontSize: '11px', color: 'var(--paper)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cabeça</div>
          </div>
          <div style={{ background: 'transparent', border: '1px dashed var(--line)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--muted)' }}>腕</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Braços</div>
          </div>
          <div style={{ background: 'transparent', border: '1px dashed var(--line)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--muted)' }}>飾</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Acessório</div>
          </div>
        </div>

        {/* Centro (Avatar/Silhueta) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '180px', color: 'var(--ink-raised)', textShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
          廉
        </div>

        {/* Coluna Direita */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--seal-bright)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>胴</div>
            <div style={{ fontSize: '11px', color: 'var(--paper)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tronco</div>
          </div>
          <div style={{ background: 'transparent', border: '1px dashed var(--line)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--muted)' }}>脚</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Pernas</div>
          </div>
          <div style={{ background: 'var(--ink-soft)', border: '1px solid var(--seal-bright)', padding: '24px', textAlign: 'center', width: '120px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>刀</div>
            <div style={{ fontSize: '11px', color: 'var(--paper)', textTransform: 'uppercase', letterSpacing: '1px' }}>Arma</div>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      <div>
        <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: 'var(--gold)', borderBottom: '1px solid var(--line)', paddingBottom: '8px', marginBottom: '24px', fontSize: '20px' }}>Bolsa de Equipamentos</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '24px' }}>
          {INVENTORY.map(item => (
            <div key={item.id} className="card" style={{ padding: '24px' }}>
               <h4 style={{ color: 'var(--seal-bright)', marginBottom: '12px', fontSize: '16px' }}>{item.name}</h4>
               <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '24px', fontFamily: "'JetBrains Mono', monospace", lineHeight: '1.5' }}>
                 {item.desc.split(', ').map((d, i) => <div key={i}>{d}</div>)}
               </div>
               <button className="btn-ghost" onClick={() => handleEquip(item)} style={{ width: '100%', padding: '10px', border: '1px solid var(--line)' }}>
                 Equipar {item.type}
               </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
