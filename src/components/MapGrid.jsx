import React from 'react';

const GRID_SIZE = 20;

export default function MapGrid({
  playerX,
  playerY,
  onMove,
  villages,
  npcs,
  onEnterVillage,
  onAttackNpc
}) {
  const renderGrid = () => {
    const tiles = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isPlayerHere = playerX === x && playerY === y;

        const villageId = Object.keys(villages).find(vId => {
          const vx = (parseInt(vId, 10) * 5) % GRID_SIZE;
          const vy = (parseInt(vId, 10) * 3) % GRID_SIZE;
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
            className="w-full pb-[100%] bg-[#1c1c22] hover:bg-gold/20 border border-white/[0.02] relative cursor-pointer transition-colors duration-200"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              {village && (
                <div
                  className="text-2xl z-1 drop-shadow-[0_0_5px_rgba(212,162,42,0.85)]"
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
                  className="text-xl z-2 cursor-crosshair"
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
                <div className="text-2xl z-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
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
    <div className="w-full max-w-[600px] mx-auto bg-[#0a0a0c] border-2 border-gold rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-20 grid-rows-20">
        {renderGrid()}
      </div>

      <div className="p-4 text-center border-t border-line bg-ink">
        <p className="muted text-xs m-0 tabular-nums">Coord: X: {playerX}, Y: {playerY}</p>
      </div>
    </div>
  );
}
