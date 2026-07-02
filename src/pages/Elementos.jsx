import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

const ELEMENT_POS = {
  'Katon': { top: '20px', left: '160px' },
  'Futon': { top: '116px', left: '293px' },
  'Raiton': { top: '274px', left: '242px' },
  'Doton': { top: '274px', left: '78px' },
  'Suiton': { top: '116px', left: '27px' }
};

export default function Elementos({ player, updatePlayer }) {
  const [elementsData, setElementsData] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // early return movido
  useEffect(() => {
    async function fetchElements() {
      const { data } = await supabase.from('elements').select('*');
      if (data) {
        const mapped = data.map(e => ({
          id: e.name_id,
          icon: e.icon,
          color: e.color_hex,
          name: e.name,
          desc: e.description,
          pos: ELEMENT_POS[e.name_id] || { top: '50%', left: '50%' },
          strong_against: e.strong_against,
          weak_against: e.weak_against
        }));
        setElementsData(mapped);
      }
    }
    fetchElements();
  }, []);

  // early return movido
  if (!player) return null;

  // Lógica de Requerimentos
  const isLevel5 = player.level >= 5;
  const isGenin = player.rank !== 'Estudante da Academia'; // Simplificado
  const canLearn = isLevel5 && isGenin && !player.element;
  const displayElement = selectedNode || hoveredElement;

  const handleLearnElement = async (elementId) => {
    if (!canLearn) return;
    setLoading(true);

    const { error } = await supabase
      .from('players')
      .update({ element: elementId })
      .eq('id', player.id);

    if (!error) {
      await updatePlayer(player.user_id);
      addToast(`Elemento ${elementId} dominado!`, 'success');
    } else {
      addToast('Erro ao aprender elemento: ' + error.message, 'error');
    }
    setLoading(false);
  };


  return (
    <div className="page flex-col" style={{ minHeight: '100vh' }}>
      <PageHeader eyebrow='Naturezas de Chakra' title='Elementos' subtitle='Descubra e domine sua natureza de chakra elementar.' />

      <div className="flex-row" style={{ flex: 1, gap: '32px', position: 'relative', alignItems: 'stretch' }}>
        
        {/* ÁREA DO CÍRCULO ELEMENTAL */}
        <div className="card flex-row" style={{ 
          flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center',
          overflow: 'hidden', minHeight: '600px', padding: 0
        }}>
          <div className="element-wheel-container">
            {/* SVG para desenhar as linhas de vantagem (Estrela) */}
            <svg className="element-wheel-svg">
              <line x1="160" y1="20" x2="293" y2="116" className={hoveredElement?.id === 'Katon' ? 'advantage-line' : hoveredElement?.id === 'Futon' ? 'disadvantage-line' : ''} /> {/* Fogo -> Vento */}
              <line x1="293" y1="116" x2="242" y2="274" className={hoveredElement?.id === 'Futon' ? 'advantage-line' : hoveredElement?.id === 'Raiton' ? 'disadvantage-line' : ''} /> {/* Vento -> Raio */}
              <line x1="242" y1="274" x2="78" y2="274" className={hoveredElement?.id === 'Raiton' ? 'advantage-line' : hoveredElement?.id === 'Doton' ? 'disadvantage-line' : ''} /> {/* Raio -> Terra */}
              <line x1="78" y1="274" x2="27" y2="116" className={hoveredElement?.id === 'Doton' ? 'advantage-line' : hoveredElement?.id === 'Suiton' ? 'disadvantage-line' : ''} /> {/* Terra -> Água */}
              <line x1="27" y1="116" x2="160" y2="20" className={hoveredElement?.id === 'Suiton' ? 'advantage-line' : hoveredElement?.id === 'Katon' ? 'disadvantage-line' : ''} /> {/* Água -> Fogo */}
            </svg>

            {/* Centro */}
            <div className="element-wheel-center">
              {player.element ? (
                <>
                  <div className="current-el" style={{ color: elementsData.find(e => e.id === player.element)?.color }}>
                    {elementsData.find(e => e.id === player.element)?.icon}
                  </div>
                  <div className="current-label">Dominado</div>
                </>
              ) : (
                <div className="current-label" style={{ color: 'var(--muted)', marginTop: '0' }}>Vazio</div>
              )}
            </div>

            {/* Nós (Elementos) */}
            {elementsData.map(el => {
              const isSelected = player.element === el.id;
              const isHovered = hoveredElement?.id === el.id;
              
              // Define Vantagens e Desvantagens dinâmicas
              let nodeClass = `element-node node-${el.id.toLowerCase()}`;
              if (isSelected || isHovered) nodeClass += ' active';
              
              if (hoveredElement) {
                if (hoveredElement.strong_against === el.id) nodeClass += ' advantage';
                if (hoveredElement.weak_against === el.id) nodeClass += ' disadvantage';
              }

              return (
                <div 
                  key={el.id}
                  className={nodeClass}
                  onMouseEnter={() => setHoveredElement(el)}
                  onMouseLeave={() => setHoveredElement(null)}
                  onClick={() => setSelectedNode(el)}
                  style={{ color: el.color, top: el.pos.top, left: el.pos.left, cursor: 'pointer' }}
                >
                  {el.icon}
                  <div className="el-label">{el.name.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOOLTIP FIXA NA DIREITA (INFORMAÇÕES) */}
        <div className="flex-col" style={{ width: '360px', flexShrink: 0 }}>
          
          <div className="card">
            <h3 className="card-title gold" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '8px' }}>Seu Elemento Atual</h3>
            {player.element ? (
              <div className="flex-row" style={{ marginTop: '16px' }}>
                <div className="flex-row" style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--gold)', justifyContent: 'center', fontSize: '24px' }}>
                  {elementsData.find(e => e.id === player.element)?.icon}
                </div>
                <div>
                  <div className="mono" style={{ fontWeight: 'bold' }}>{player.element}</div>
                  <div className="muted" style={{ fontSize: '12px' }}>Natureza de Chakra Dominada</div>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: '13px' }}>Você ainda não descobriu sua Natureza de Chakra. Passe o mouse sobre o círculo para estudar os elementos.</div>
            )}
          </div>

          {displayElement && (
            <div className="card" style={{ background: 'var(--ink-raised)', borderColor: displayElement.color, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05, pointerEvents: 'none', color: displayElement.color }}>{displayElement.icon}</div>
              <h3 className="page-title" style={{ color: displayElement.color, marginBottom: '16px', fontSize: '20px' }}>{displayElement.name}</h3>
              <p className="paper" style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
                {displayElement.desc}
              </p>

              <div style={{ borderTop: '1px dotted var(--line)', paddingTop: '16px' }}>
                <div className="uppercase" style={{ color: '#ff9800', marginBottom: '8px' }}>Requerimentos</div>
                <div className="mono flex-col" style={{ gap: '4px', fontSize: '12px' }}>
                  <div style={{ color: isLevel5 ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Level 5</div>
                  <div style={{ color: isGenin ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Genin</div>
                </div>
              </div>

              {!player.element && (
                <>
                  <div style={{ marginTop: '16px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed #ef4444', borderRadius: '4px', textAlign: 'center' }}>
                    <span className="mono" style={{ color: '#ef4444', fontSize: '11px', letterSpacing: '1px' }}>⚠️ AVISO: Esta escolha é permanente!</span>
                  </div>
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '12px', background: displayElement.color, opacity: canLearn ? 1 : 0.5, cursor: canLearn ? 'pointer' : 'not-allowed' }}
                    onClick={() => handleLearnElement(displayElement.id)}
                    disabled={!canLearn || loading}
                  >
                    {loading ? 'Aprendendo...' : canLearn ? 'Aprender Elemento' : 'Requisitos Incompletos'}
                  </button>
                </>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
