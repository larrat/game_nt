import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/academy-progression-v4.css';
import { useToast } from '../context/ToastContext';

const ELEMENT_POS_CLASSES = {
  Katon: 'top-[20px] left-[160px]',
  Futon: 'top-[116px] left-[293px]',
  Raiton: 'top-[274px] left-[242px]',
  Doton: 'top-[274px] left-[78px]',
  Suiton: 'top-[116px] left-[27px]'
};

const ELEMENT_THEME_CLASSES = {
  Katon: { text: 'text-[#ef4444]', border: 'border-[#ef4444]' },
  Futon: { text: 'text-[#22c55e]', border: 'border-[#22c55e]' },
  Raiton: { text: 'text-[#facc15]', border: 'border-[#facc15]' },
  Doton: { text: 'text-[#a16207]', border: 'border-[#a16207]' },
  Suiton: { text: 'text-[#3b82f6]', border: 'border-[#3b82f6]' }
};

export default function Elementos({ player, updatePlayer }) {
  const [elementsData, setElementsData] = useState([]);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

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
          posClass: ELEMENT_POS_CLASSES[e.name_id] || 'top-1/2 left-1/2',
          theme: ELEMENT_THEME_CLASSES[e.name_id] || { text: 'text-gold', border: 'border-gold' },
          strong_against: e.strong_against,
          weak_against: e.weak_against
        }));
        setElementsData(mapped);
      }
    }
    fetchElements();
  }, []);

  if (!player) return null;

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

    try {
      const { data, error } = await supabase.rpc('aprender_elemento', {
        p_player_id: player.id,
        p_element_id: elementId
      });

      if (error || !data?.success) {
        addToast('Erro ao aprender elemento: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      } else {
        await updatePlayer(player.id);
        addToast(`Elemento ${elementId} dominado!`, 'success');
      }
    } catch (error) {
      addToast('Erro ao aprender elemento: ' + (error?.message || 'erro inesperado'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page kuro-elements-v4 flex-col min-h-screen">
      <PageHeader eyebrow="Naturezas de Chakra" title="Elementos" subtitle="Descubra e domine sua natureza de chakra elementar." />

      <div className="element-summary">
        <div className="summary-tile">
          <div className="label">Status</div>
          <div className="value">{player.element ? 'Elemento dominado' : 'Pendente'}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Requisito</div>
          <div className="value tabular-nums">{isLevel5 ? 'Level liberado' : `Level ${player.level}/5`}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Graduação</div>
          <div className="value">{isGenin ? 'Apto' : 'Genin necessário'}</div>
        </div>
      </div>

      <div className="element-layout">
        <div className="card element-stage kuro-ui-card">
          <div className="element-wheel-container">
            <svg className="element-wheel-svg">
              <line x1="160" y1="20" x2="293" y2="116" className={hoveredElement?.id === 'Katon' ? 'advantage-line' : hoveredElement?.id === 'Futon' ? 'disadvantage-line' : ''} />
              <line x1="293" y1="116" x2="242" y2="274" className={hoveredElement?.id === 'Futon' ? 'advantage-line' : hoveredElement?.id === 'Raiton' ? 'disadvantage-line' : ''} />
              <line x1="242" y1="274" x2="78" y2="274" className={hoveredElement?.id === 'Raiton' ? 'advantage-line' : hoveredElement?.id === 'Doton' ? 'disadvantage-line' : ''} />
              <line x1="78" y1="274" x2="27" y2="116" className={hoveredElement?.id === 'Doton' ? 'advantage-line' : hoveredElement?.id === 'Suiton' ? 'disadvantage-line' : ''} />
              <line x1="27" y1="116" x2="160" y2="20" className={hoveredElement?.id === 'Suiton' ? 'advantage-line' : hoveredElement?.id === 'Katon' ? 'disadvantage-line' : ''} />
            </svg>

            <div className="element-wheel-center flex-col gap-1 items-center justify-center">
              {currentElement ? (
                <div className="flex gap-3 items-center">
                  <div className="flex-col items-center">
                    <div className={`current-el ${currentElement.theme.text} ${currentElement2 ? 'text-2xl' : 'text-[32px]'}`}>
                      {currentElement.icon}
                    </div>
                    <div className="current-label text-[10px]">Primário</div>
                  </div>
                  {currentElement2 && (
                    <div className="flex-col items-center">
                      <div className={`current-el ${currentElement2.theme.text} text-2xl`}>
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

            {elementsData.map(el => {
              const isSelected = player.element === el.id || player.element2 === el.id;
              const isHovered = hoveredElement?.id === el.id;

              let nodeClass = `element-node node-${el.id.toLowerCase()} ${el.posClass} ${el.theme.text} cursor-pointer`;
              if (isSelected || isHovered) nodeClass += ' active';

              if (hoveredElement) {
                if (hoveredElement.strong_against === el.id) nodeClass += ' advantage';
                if (hoveredElement.weak_against === el.id) nodeClass += ' disadvantage';
              }

              return (
                <button
                  type="button"
                  key={el.id}
                  className={nodeClass}
                  aria-label={`Consultar elemento ${el.name}`}
                  aria-pressed={selectedNode?.id === el.id}
                  onMouseEnter={() => setHoveredElement(el)}
                  onMouseLeave={() => setHoveredElement(null)}
                  onFocus={() => setHoveredElement(el)}
                  onBlur={() => setHoveredElement(null)}
                  onClick={() => setSelectedNode(el)}
                >
                  {el.icon}
                  <span className="el-label">{el.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="element-side">
          <div className="card kuro-ui-card">
            <h3 className="card-title gold border-b-0 pb-0 mb-2"><SidebarIcon name="sparkles" size={19} /> Seus Elementos</h3>
            {currentElement ? (
              <div className="flex-col gap-sm mt-4">
                <div className="flex-row">
                  <div className={`flex-row w-12 h-12 rounded-full border-2 ${currentElement.theme.border} justify-center text-2xl`}>
                    {currentElement.icon}
                  </div>
                  <div>
                    <div className="mono font-bold">{currentElement.name}</div>
                    <div className="muted text-xs">Elemento Primário (Genin)</div>
                  </div>
                </div>
                {currentElement2 && (
                  <div className="flex-row mt-2">
                    <div className={`flex-row w-12 h-12 rounded-full border-2 ${currentElement2.theme.border} justify-center text-2xl`}>
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
            <div className={`card kuro-ui-card kuro-elements-v4__detail bg-ink-raised border ${displayElement.theme.border} relative overflow-hidden`}>
              <div className={`absolute -top-5 -right-5 text-[120px] opacity-5 pointer-events-none ${displayElement.theme.text}`}>{displayElement.icon}</div>
              <h3 className={`page-title mb-4 text-xl ${displayElement.theme.text}`}>{displayElement.name}</h3>
              <p className="paper text-[13px] leading-relaxed mb-6">
                {displayElement.desc}
              </p>

              <div className="border-t border-dotted border-line pt-4">
                <div className="uppercase text-[#ff9800] mb-2">Requerimentos</div>
                <div className="mono flex-col gap-1 text-xs">
                  {(!player.element) ? (
                    <>
                      <div className={isLevel5 ? 'text-green' : 'text-seal-bright'}>• Ser Nível 5</div>
                      <div className={isGenin ? 'text-green' : 'text-seal-bright'}>• Ser Genin</div>
                    </>
                  ) : (!player.element2) ? (
                    <>
                      <div className={isLevel15 ? 'text-green' : 'text-seal-bright'}>• Ser Nível 15</div>
                      <div className={isChunin ? 'text-green' : 'text-seal-bright'}>• Ser Chunin</div>
                    </>
                  ) : (
                    <div className="text-green">Você já aprendeu o máximo de elementos disponíveis.</div>
                  )}
                </div>
              </div>

              {(!player.element || !player.element2) && displayElement.id !== player.element && displayElement.id !== player.element2 && (
                <>
                  <div className="mt-4 p-2 bg-danger/10 border border-dashed border-danger rounded-md text-center">
                    <span className="mono text-danger text-[11px] tracking-[1px]">⚠️ AVISO: Esta escolha é permanente!</span>
                  </div>
                  <GameAction
                    tone="seal"
                    loading={loading}
                    onClick={() => handleLearnElement(displayElement.id)}
                    disabled={!canLearn}
                  >
                    <SidebarIcon name="sparkles" size={16} />
                    {loading ? 'Aprendendo...' : canLearn ? 'Aprender Elemento' : 'Requisitos Incompletos'}
                  </GameAction>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
