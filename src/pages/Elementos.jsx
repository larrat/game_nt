import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

const ELEMENTS = [
  { id: 'Katon', icon: '火', color: '#ff5252', name: 'Fogo (Katon)', desc: 'Usuários deste elemento são mestres do Fogo. Esse elemento tem grande vantagem contra o Fuuton (Vento), porém tem fraqueza ao elemento Suiton (Água).', pos: { top: '10%', left: '50%' } },
  { id: 'Futon', icon: '風', color: '#4caf50', name: 'Vento (Fuuton)', desc: 'Técnicas de alto poder destrutivo utilizando o Vento. Tem grande vantagem contra o Raiton (Trovão), porém fraqueza ao elemento Katon (Fogo).', pos: { top: '38%', left: '85%' } },
  { id: 'Raiton', icon: '雷', color: '#ffeb3b', name: 'Trovão (Raiton)', desc: 'O poder de rasgar os céus com o Trovão. Tem grande vantagem contra o Doton (Terra), porém fraqueza ao elemento Fuuton (Vento).', pos: { top: '85%', left: '70%' } },
  { id: 'Doton', icon: '土', color: '#ff9800', name: 'Terra (Doton)', desc: 'Técnicas a base da força da Terra. Tem grande vantagem contra o Suiton (Água), porém fraqueza ao elemento Raiton (Trovão).', pos: { top: '85%', left: '30%' } },
  { id: 'Suiton', icon: '水', color: '#2196f3', name: 'Água (Suiton)', desc: 'As técnicas que usam o elemento primordial a vida, água. Tem grande vantagem contra o Katon (Fogo), porém fraqueza ao elemento Doton (Terra).', pos: { top: '38%', left: '15%' } },
];

export default function Elementos({ player, updatePlayer }) {
  const [hoveredElement, setHoveredElement] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!player) return null;

  // Lógica de Requerimentos
  const isLevel5 = player.level >= 5;
  const isGenin = player.rank !== 'Estudante da Academia'; // Simplificado
  const canLearn = isLevel5 && isGenin && !player.element;

  const handleLearnElement = async (elementId) => {
    if (!canLearn) return;
    setLoading(true);

    const { error } = await supabase
      .from('players')
      .update({ element: elementId })
      .eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
    }
    setLoading(false);
  };

  return (
    <div style={{ paddingBottom: '60px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">Naturezas de Chakra</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Elementos</h1>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '32px', position: 'relative' }}>
        
        {/* ÁREA DO CÍRCULO ELEMENTAL */}
        <div style={{ 
          flex: 1, background: 'var(--ink-soft)', border: '1px solid var(--line)', 
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', minHeight: '600px'
        }}>
          {/* Fundo decorativo */}
          <div style={{ position: 'absolute', width: '400px', height: '400px', border: '1px solid var(--line)', borderRadius: '50%', opacity: 0.2 }}></div>
          <div style={{ position: 'absolute', width: '250px', height: '250px', border: '1px solid var(--line)', borderRadius: '50%', opacity: 0.1 }}></div>

          {/* SVG para desenhar as linhas de vantagem (Estrela) */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.3 }}>
            {/* Linhas conectando os elementos em ordem de vantagem */}
            <line x1="50%" y1="10%" x2="85%" y2="38%" stroke="#ff5252" strokeWidth="2" /> {/* Fogo -> Vento */}
            <line x1="85%" y1="38%" x2="70%" y2="85%" stroke="#4caf50" strokeWidth="2" /> {/* Vento -> Raio */}
            <line x1="70%" y1="85%" x2="30%" y2="85%" stroke="#ffeb3b" strokeWidth="2" /> {/* Raio -> Terra */}
            <line x1="30%" y1="85%" x2="15%" y2="38%" stroke="#ff9800" strokeWidth="2" /> {/* Terra -> Água */}
            <line x1="15%" y1="38%" x2="50%" y2="10%" stroke="#2196f3" strokeWidth="2" /> {/* Água -> Fogo */}
          </svg>

          {/* Nós (Elementos) */}
          <div style={{ position: 'absolute', width: '100%', height: '100%', maxWidth: '600px', maxHeight: '600px' }}>
            {ELEMENTS.map(el => {
              const isSelected = player.element === el.id;
              return (
                <div 
                  key={el.id}
                  onMouseEnter={() => setHoveredElement(el)}
                  onMouseLeave={() => setHoveredElement(null)}
                  style={{
                    position: 'absolute',
                    top: el.pos.top,
                    left: el.pos.left,
                    transform: 'translate(-50%, -50%)',
                    width: '64px', height: '64px',
                    borderRadius: '50%',
                    background: 'var(--ink-raised)',
                    border: `3px solid ${el.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Shippori Mincho', serif", fontSize: '28px', color: el.color,
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 0 20px ${el.color}` : 'none',
                    transition: 'all 0.3s',
                    zIndex: 2
                  }}
                >
                  {el.icon}
                </div>
              );
            })}
          </div>
        </div>

        {/* TOOLTIP FIXA NA DIREITA (INFORMAÇÕES) */}
        <div style={{ width: '360px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ background: 'var(--ink)', border: '1px solid var(--line)', padding: '24px' }}>
            <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '18px', color: 'var(--gold)', marginBottom: '8px' }}>Seu Elemento Atual</h3>
            {player.element ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {ELEMENTS.find(e => e.id === player.element)?.icon}
                </div>
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 'bold' }}>{player.element}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Natureza de Chakra Dominada</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Você ainda não descobriu sua Natureza de Chakra. Passe o mouse sobre o círculo para estudar os elementos.</div>
            )}
          </div>

          {hoveredElement && (
            <div style={{ background: 'var(--ink-raised)', border: `1px solid ${hoveredElement.color}`, padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05, pointerEvents: 'none', color: hoveredElement.color }}>{hoveredElement.icon}</div>
              <h3 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '20px', color: hoveredElement.color, marginBottom: '16px' }}>{hoveredElement.name}</h3>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--paper)', marginBottom: '24px' }}>
                {hoveredElement.desc}
              </p>

              <div style={{ borderTop: '1px dotted var(--line)', paddingTop: '16px' }}>
                <div style={{ fontSize: '12px', color: '#ff9800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Requerimentos</div>
                <div style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: isLevel5 ? '#4caf50' : '#f44336' }}>• Ser Level 5</div>
                  <div style={{ color: isGenin ? '#4caf50' : '#f44336' }}>• Ser Genin</div>
                </div>
              </div>

              {!player.element && (
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', marginTop: '24px', background: hoveredElement.color, opacity: canLearn ? 1 : 0.5, cursor: canLearn ? 'pointer' : 'not-allowed' }}
                  onClick={() => handleLearnElement(hoveredElement.id)}
                  disabled={!canLearn || loading}
                >
                  {loading ? 'Aprendendo...' : canLearn ? 'Aprender Elemento' : 'Requisitos Incompletos'}
                </button>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
