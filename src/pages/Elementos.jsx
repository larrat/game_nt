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

  // Helpers para checar rank
  const rankVal = (r) => {
    if (!r) return 0;
    const rl = r.toLowerCase();
    if (rl.includes('genin')) return 1;
    if (rl.includes('chunin')) return 2;
    if (rl.includes('jounin')) return 3;
    if (rl.includes('anbu')) return 4;
    if (rl.includes('sannin') || rl.includes('sanin')) return 5;
    if (rl.includes('heroi') || rl.includes('herói')) return 6;
    return 0;
  };

  // Lógica de Requerimentos
  const isLevel5 = player.level >= 5;
  const isGenin = rankVal(player.rank) >= 1;
  const isLevel15 = player.level >= 15;
  const isChunin = rankVal(player.rank) >= 2;

  const canLearnFirst = isLevel5 && isGenin && !player.element;
  const canLearnSecond = isLevel15 && isChunin && player.element && !player.element2;
  const canLearn = canLearnFirst || canLearnSecond;

  const currentElement = elementsData.find(e => e.id === player.element);
  const currentElement2 = elementsData.find(e => e.id === player.element2);
  const displayElement = selectedNode || hoveredElement || currentElement;

  const handleLearnElement = async (elementId) => {
    if (!canLearn) return;
    if (player.element === elementId || player.element2 === elementId) {
      addToast('Você já possui este elemento!', 'error');
      return;
    }
    setLoading(true);

    const updateData = {};
    if (!player.element) {
      updateData.element = elementId;
    } else {
      updateData.element2 = elementId;
    }

    const { error } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', player.id);

    if (!error) {
      await updatePlayer(player.id);
      addToast(`Elemento ${elementId} dominado!`, 'success');
    } else {
      addToast('Erro ao aprender elemento: ' + error.message, 'error');
    }
    setLoading(false);
  };


  return (
    <div className="page flex-col min-h-screen">
      <PageHeader eyebrow='Naturezas de Chakra' title='Elementos' subtitle='Descubra e domine sua natureza de chakra elementar.' />

      <div className="element-summary">
        <div className="summary-tile">
          <div className="label">Status</div>
          <div className="value">{player.element ? 'Elemento dominado' : 'Pendente'}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Requisito</div>
          <div className="value">{isLevel5 ? 'Level liberado' : `Level ${player.level}/5`}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Graduação</div>
          <div className="value">{isGenin ? 'Apto' : 'Genin necessário'}</div>
        </div>
      </div>

      <div className="element-layout">
        
        {/* ÁREA DO CÍRCULO ELEMENTAL */}
        <div className="card element-stage">
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
            <div className="element-wheel-center flex-col gap-1 items-center justify-center">
              {currentElement ? (
                <div className="flex gap-3 items-center">
                  <div className="flex-col items-center">
                    <div className="current-el" style={{ color: currentElement.color, fontSize: currentElement2 ? '24px' : '32px' }}>
                      {currentElement.icon}
                    </div>
                    <div className="current-label text-[10px]">Primário</div>
                  </div>
                  {currentElement2 && (
                    <div className="flex-col items-center">
                      <div className="current-el" style={{ color: currentElement2.color, fontSize: '24px' }}>
                        {currentElement2.icon}
                      </div>
                      <div className="current-label text-[10px]">Secundário</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="current-label text-muted mt-0">Vazio</div>
              )}
            </div>

            {/* Nós (Elementos) */}
            {elementsData.map(el => {
              const isSelected = player.element === el.id || player.element2 === el.id;
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
        <div className="element-side">
          
          <div className="card">
            <h3 className="card-title gold border-b-0 pb-0 mb-2">Seus Elementos</h3>
            {currentElement ? (
              <div className="flex-col gap-sm mt-4">
                <div className="flex-row">
                  <div className="flex-row" style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${currentElement.color}`, justifyContent: 'center', fontSize: '24px' }}>
                    {currentElement.icon}
                  </div>
                  <div>
                    <div className="mono font-bold">{currentElement.name}</div>
                    <div className="muted text-xs">Elemento Primário (Genin)</div>
                  </div>
                </div>
                {currentElement2 && (
                  <div className="flex-row mt-2">
                    <div className="flex-row" style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${currentElement2.color}`, justifyContent: 'center', fontSize: '24px' }}>
                      {currentElement2.icon}
                    </div>
                    <div>
                      <div className="mono font-bold">{currentElement2.name}</div>
                      <div className="muted text-xs">Elemento Secundário (Chunin)</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="muted text-[13px] leading-relaxed">Você ainda não descobriu sua Natureza de Chakra. Selecione um elemento no círculo para estudar vantagens, requisitos e confirmar sua escolha.</div>
            )}
          </div>

          {displayElement && (
            <div className="card" style={{ background: 'var(--ink-raised)', borderColor: displayElement.color, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '120px', opacity: 0.05, pointerEvents: 'none', color: displayElement.color }}>{displayElement.icon}</div>
              <h3 className="page-title" style={{ color: displayElement.color, marginBottom: '16px', fontSize: '20px' }}>{displayElement.name}</h3>
              <p className="paper text-[13px] leading-relaxed mb-6">
                {displayElement.desc}
              </p>

              <div className="border-t border-dotted border-line pt-4">
                <div className="uppercase text-[#ff9800] mb-2">Requerimentos</div>
                <div className="mono flex-col gap-1 text-xs">
                  {(!player.element) ? (
                    <>
                      <div style={{ color: isLevel5 ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Nível 5</div>
                      <div style={{ color: isGenin ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Genin</div>
                    </>
                  ) : (!player.element2) ? (
                    <>
                      <div style={{ color: isLevel15 ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Nível 15</div>
                      <div style={{ color: isChunin ? 'var(--green)' : 'var(--seal-bright)' }}>• Ser Chunin</div>
                    </>
                  ) : (
                    <div style={{ color: 'var(--green)' }}>Você já aprendeu o máximo de elementos disponíveis.</div>
                  )}
                </div>
              </div>

              {(!player.element || !player.element2) && displayElement.id !== player.element && displayElement.id !== player.element2 && (
                <>
                  <div className="mt-4 p-2 bg-danger/10 border border-dashed border-danger rounded-md text-center">
                    <span className="mono text-danger text-[11px] tracking-[1px]">⚠️ AVISO: Esta escolha é permanente!</span>
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
