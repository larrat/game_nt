import React, { useState } from 'react';

const GRID_SIZE = 20;

export default function MapGrid({ 
  playerX, 
  playerY, 
  onMove, 
  villages, 
  npcs, 
  currentLoc,
  onEnterVillage,
  onAttackNpc
}) {
  
  const renderGrid = () => {
    const tiles = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isPlayerHere = playerX === x && playerY === y;
        
        const villageId = Object.keys(villages).find(vId => {
          const vx = (parseInt(vId) * 5) % GRID_SIZE;
          const vy = (parseInt(vId) * 3) % GRID_SIZE;
          return vx === x && vy === y;
        });
        const village = villageId ? villages[villageId] : null;

        const npc = npcs.find(n => {
          const nx = Math.floor((n.x / 100) * GRID_SIZE);
          const ny = Math.floor((n.y / 100) * GRID_SIZE);
          return nx === x && ny === y;
        });

        tiles.push(
          <div 
            key={`${x}-${y}`} 
            onClick={() => onMove(x, y)}
            style={{
              width: '100%',
              paddingBottom: '100%',
              backgroundColor: '#1c1c22',
              border: '1px solid rgba(255, 255, 255, 0.02)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 162, 42, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1c1c22'}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              
              {village && (
                <div 
                  style={{ fontSize: '24px', filter: 'drop-shadow(0 0 5px ' + village.color + ')', zIndex: 1 }}
                  title={`Vila da ${village.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPlayerHere) onEnterVillage(villageId);
                    else onMove(x, y);
                  }}
                >
                  {village.icon}
                </div>
              )}

              {npc && !isPlayerHere && (
                <div 
                  style={{ fontSize: '20px', zIndex: 2, cursor: 'crosshair' }}
                  title={npc.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(x, y);
                    setTimeout(() => onAttackNpc(npc), 100);
                  }}
                >
                  {npc.is_ghost ? '👻' : (npc.is_bingo_book ? '💀' : '👹')}
                </div>
              )}

              {isPlayerHere && (
                <div style={{ fontSize: '24px', zIndex: 3, filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.8))' }}>
                  🥷
                </div>
              )}

            </div>
          </div>
        );
      }
    }
    return tiles;
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '600px', 
      margin: '0 auto', 
      background: '#0a0a0c', 
      border: '2px solid var(--gold)', 
      borderRadius: '8px', 
      overflow: 'hidden',
      boxShadow: '0 0 20px rgba(0,0,0,0.8)'
    }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, 
        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` 
      }}>
        {renderGrid()}
      </div>
      
      <div style={{ padding: '16px', textAlign: 'center', borderTop: '1px solid var(--line)', background: 'var(--ink)' }}>
        <p className="muted" style={{ fontSize: '12px', margin: 0 }}>Coord: X: {playerX}, Y: {playerY}</p>
      </div>
    </div>
  );
}
