import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
import { generateDynamicRogueNinja } from '../utils/engine';

// =============================================
// CONFIGURAÇÃO DO GRID DA VILA
// Cada tile tem um tipo: 'empty', 'building', 'path', 'portal'
// =============================================
const VILLAGE_GRID = [
  ['empty', 'empty',    'portal_in', 'empty',    'empty',    'empty'],
  ['empty', 'kage',     'empty',     'empty',     'hospital', 'empty'],
  ['empty', 'empty',    'path',      'path',      'empty',    'dojo'],
  ['historia', 'path',  'player',    'path',      'empty',    'empty'],
  ['empty', 'empty',    'path',      'path',      'empty',    'ichiraku'],
  ['empty', 'empty',    'empty',     'blacksmith','empty',    'empty'],
  ['empty', 'empty',    'gates',     'empty',     'empty',    'empty'],
];

const BUILDING_CONFIG = {
  kage:        { icon: '🏛️',  label: 'Gabinete do Kage', color: '#f59e0b', bgImage: '/images/imgi_106_map_yellow2.png', route: null,       desc: 'Missões Rank-S e administração da Vila.' },
  hospital:    { icon: '🏥',  label: 'Hospital',           color: '#ef4444', bgImage: '/images/imgi_105_map_red2.png', route: '/hospital', desc: 'Recupere seu HP e cure debuffs.' },
  dojo:        { icon: '⚔️',  label: 'Academia (Dojo)',    color: '#4b9eff', bgImage: '/images/imgi_104_map_green2.png', route: '/dojo',     desc: 'Treine com NPCs e ganhe XP.' },
  ichiraku:    { icon: '🍜',  label: 'Restaurante Ichiraku',color: '#f97316', bgImage: '/images/imgi_100_map_orange2.png', route: '/ichiraku', desc: 'Recupere sua Stamina com ramen.' },
  blacksmith:  { icon: '🔨',  label: 'Ferreiro',           color: '#a78bfa', bgImage: '/images/imgi_103_map_gray.png', route: '/ferreiro', desc: 'Forje e melhore seus equipamentos.' },
  historia:    { icon: '📜',  label: 'Escritório do Hokage',color: '#fbbf24', bgImage: '/images/imgi_106_map_yellow2.png', route: '/historia', desc: 'Aventure-se pelas Sagas.' },
  gates:       { icon: '⛩️',  label: 'Portões da Vila',    color: '#6b7280', bgImage: '/images/imgi_103_map_gray.png', route: 'world',     desc: 'Saia para o Mapa Mundi e visite outras Vilas.' },
  portal_in:   { icon: '🌐',  label: 'Portão de Invasão',  color: '#ef4444', bgImage: '/images/imgi_105_map_red2.png', route: '/evento',   desc: 'Alerta! World Boss activo.' },
};

const TILE_TERRAIN = {
  empty: { bg: 'rgba(15, 30, 15, 0.5)', border: 'rgba(30, 60, 30, 0.3)', bgImage: null },
  path:  { bg: 'rgba(180, 140, 70, 0.25)', border: 'rgba(200, 160, 80, 0.4)', bgImage: null },
  player:{ bg: 'rgba(180, 140, 70, 0.25)', border: 'rgba(200, 160, 80, 0.4)', bgImage: '/images/imgi_99_map_blue2.png' },
};

const TRAVEL_COST = 100;

// =============================================
// TILE COMPONENT
// =============================================
function VillageTile({ type, onClick, isHovered, onHover, onLeave, playerAnimating }) {
  const building = BUILDING_CONFIG[type];
  const isPlayer = type === 'player';
  const terrain = TILE_TERRAIN[type] || TILE_TERRAIN['empty'];
  const isPath = type === 'path';

  const baseBg = building ? building.bgImage : terrain.bgImage;

  return (
    <div
      onClick={building ? onClick : undefined}
      onMouseEnter={building ? onHover : undefined}
      onMouseLeave={building ? onLeave : undefined}
      style={{
        position: 'relative',
        aspectRatio: '1',
        background: baseBg ? `url(${baseBg}) center/contain no-repeat` : terrain.bg,
        backgroundColor: baseBg ? 'transparent' : terrain.bg,
        border: baseBg ? 'none' : `1px solid ${isHovered && building ? building.color : terrain.border}`,
        borderRadius: '4px',
        cursor: building ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.18s ease',
        transform: isHovered && building ? 'scale(1.06)' : 'scale(1)',
        boxShadow: isHovered && building ? `0 0 18px ${building.color}55` : 'none',
        overflow: 'visible',
        zIndex: isHovered ? 10 : 1,
      }}
    >
      {/* Texture overlay for path/player tiles */}
      {isPath && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'repeating-linear-gradient(45deg, rgba(200,160,80,0.1) 0px, rgba(200,160,80,0.1) 2px, transparent 2px, transparent 8px)',
          borderRadius: '3px',
        }} />
      )}

      {/* Building icon */}
      {building && (
        <>
          <div style={{
            fontSize: '28px',
            lineHeight: 1,
            filter: `drop-shadow(0 0 6px ${building.color})`,
            transition: 'transform 0.15s',
            transform: isHovered ? 'translateY(-2px)' : 'none',
          }}>
            {building.icon}
          </div>
          <div style={{
            fontSize: '9px',
            color: isHovered ? building.color : 'rgba(255,255,255,0.55)',
            fontWeight: 'bold',
            marginTop: '4px',
            textAlign: 'center',
            lineHeight: 1.1,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            maxWidth: '90%',
          }}>
            {building.label.split(' ')[0]}
          </div>

          {/* Level badge */}
          {isHovered && (
            <div style={{
              position: 'absolute',
              bottom: '-28px',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              background: 'rgba(10,12,18,0.97)',
              border: `1px solid ${building.color}`,
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '10px',
              color: building.color,
              fontWeight: 'bold',
              zIndex: 20,
              pointerEvents: 'none',
            }}>
              {building.label}
            </div>
          )}
        </>
      )}

      {/* Player marker */}
      {isPlayer && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}>
          <div style={{
            fontSize: '24px',
            filter: 'drop-shadow(0 0 8px rgba(212,162,42,0.9))',
            animation: playerAnimating ? 'bounce 0.5s ease infinite alternate' : 'none',
          }}>🥷</div>
          <div style={{
            fontSize: '8px',
            color: '#d4a22a',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>Você</div>
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function Mapa({ player, updatePlayer }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  const [viewMode, setViewMode] = useState('village'); // 'village' | 'world'
  const [hoveredTile, setHoveredTile] = useState(null); // key in BUILDING_CONFIG
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [npcs, setNpcs] = useState([]);
  const [villages, setVillages] = useState({});
  const [hideStory, setHideStory] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [playerX, setPlayerX] = useState(50);
  const [playerY, setPlayerY] = useState(50);
  const [isWalking, setIsWalking] = useState(false);

  useEffect(() => {
    if (player?.is_fainted) navigate('/hospital');
  }, [player, navigate]);

  const currentLoc = player?.vila_atual_id || player?.village_id;

  const loadMapData = useCallback(async () => {
    if (!player) return;
    setLoadingMap(true);

    const { data: allNpcs, error: npcErr } = await supabase
      .from('npcs').select('*').eq('is_map_npc', true);

    const { data: defeated } = await supabase
      .from('player_defeated_npcs').select('npc_id').eq('player_id', player.id);

    const defeatedIds = defeated ? defeated.map(d => d.npc_id) : [];

    const { data: topPlayers } = await supabase
      .from('players')
      .select('id, name, level, hp, chakra, stamina, avatar, element, atk, def, ninjutsu, genjutsu, taijutsu, bukijutsu')
      .neq('id', player.id)
      .order('level', { ascending: false })
      .limit(100);

    const { data: villagesData } = await supabase.from('villages').select('*');
    if (villagesData) {
      const vMap = {};
      villagesData.forEach(v => {
        vMap[v.id] = { name: v.name, icon: v.icon, color: v.color_hex, x: v.map_x_percent, y: v.map_y_percent };
      });
      setVillages(vMap);
    }

    let activeNpcs = [];
    if (!npcErr && allNpcs) {
      activeNpcs = allNpcs.map(npc => ({
        ...npc,
        x: npc.map_x !== null ? npc.map_x : 10 + ((npc.id * 17) % 80),
        y: npc.map_y !== null ? npc.map_y : 10 + ((npc.id * 23) % 80),
      })).filter(npc => {
        if ((npc.is_story_mode || npc.is_bingo_book) && defeatedIds.includes(npc.id)) return false;
        return true;
      });
    }

    if (topPlayers?.length > 0) {
      const shuffled = [...topPlayers].sort(() => Math.random() - 0.5).slice(0, 5);
      const ghosts = shuffled.map(p => ({
        id: `ghost_${p.id}`, name: p.name, level: p.level,
        avatar: '🥷', hp: p.hp || p.level * 50, chakra: p.chakra || p.level * 50,
        atk: p.atk || p.level * 5, def: p.def || p.level * 3,
        nin: p.ninjutsu || p.level, element: p.element || 'Katon',
        is_ghost: true,
        xpReward: Math.floor(p.level * 3), ryouReward: Math.floor(p.level * 2),
        x: 10 + ((p.id.charCodeAt(0) * 17) % 80),
        y: 10 + ((p.id.charCodeAt(p.id.length - 1) * 23) % 80),
      }));
      activeNpcs = [...activeNpcs, ...ghosts];
    }

    setNpcs(activeNpcs);
    setLoadingMap(false);
  }, [player]);

  useEffect(() => { loadMapData(); }, [loadMapData]);

  if (!player) return null;

  const handleTileClick = (type) => {
    const bldg = BUILDING_CONFIG[type];
    if (!bldg) return;
    if (bldg.route === 'world') {
      setViewMode('world');
      return;
    }
    if (bldg.route) {
      navigate(bldg.route);
      return;
    }
    setSelectedBuilding(type);
  };

  const handleTravel = async () => {
    if (!confirmTarget) return;
    const targetId = confirmTarget;
    if (player.ryous < TRAVEL_COST) {
      addToast(`Você precisa de ${TRAVEL_COST} Ryous para viajar.`, 'error');
      setConfirmTarget(null);
      return;
    }
    setLoadingId(targetId);
    const { error } = await supabase.rpc('viajar_mapa', {
      p_player_id: player.id,
      p_target_village: targetId,
      p_cost: TRAVEL_COST
    });

    if (error) {
      addToast('Erro ao viajar: ' + error.message, 'error');
    } else {
      await updatePlayer(player.id);
      addToast(`Chegou na Vila de ${villages[targetId]?.name}!`, 'success');
      setViewMode('village');
    }
    setLoadingId(null);
    setConfirmTarget(null);
  };

  const attackNpc = (npc) => {
    const maxBeginnerLevel = Number(gameConfig?.beginner_max_level) || 9;
    const maxBeginnerBattles = Number(gameConfig?.beginner_daily_battles) || 20;
    if (player.level <= maxBeginnerLevel && (player.daily_map_battles || 0) >= maxBeginnerBattles) {
      addToast(`Limite de ${maxBeginnerBattles} lutas por dia atingido.`, 'error');
      return;
    }
    navigate('/combate', { state: { bgType: 'map', npc, isMirror: false, fromMap: true, isGhost: npc.is_ghost } });
  };

  const handleMapClick = (e) => {
    if (e.target.closest('.village-node, .npc-node, .map-panel')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
    setPlayerX(x); setPlayerY(y); setIsWalking(true);
    if (dist > 5 && Math.random() < 0.15) {
      const rogue = generateDynamicRogueNinja(player, Math.floor(dist / 10));
      setTimeout(() => {
        setIsWalking(false);
        addToast(rogue.desc, 'error');
        navigate('/combate', { state: { bgType: 'map', npc: rogue, isMirror: true, fromMap: true } });
      }, 800);
    } else {
      setTimeout(() => setIsWalking(false), 1000);
    }
  };

  const visibleNpcs = npcs.filter(n => !hideStory || !n.is_story_mode);

  // ========================
  // RENDER: VILLAGE MODE
  // ========================
  if (viewMode === 'village') {
    const selectedBldg = selectedBuilding ? BUILDING_CONFIG[selectedBuilding] : null;

    return (
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Background image from the new assets */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: "url('/images/imgi_67_mapbase.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        {/* Dark overlay to make the grid pop out */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'rgba(0, 0, 0, 0.45)',
        }} />

        {/* Top info bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(212,162,42,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>{villages[currentLoc]?.icon || '🏯'}</span>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Localização Atual</div>
              <div style={{ color: '#d4a22a', fontWeight: 'bold', fontSize: '15px' }}>
                Vila de {villages[currentLoc]?.name || 'Konoha'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Clique num edifício para interagir</div>
            <button
              onClick={() => setViewMode('world')}
              style={{
                background: 'rgba(212,162,42,0.12)',
                border: '1px solid rgba(212,162,42,0.4)',
                color: '#d4a22a',
                borderRadius: '6px',
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              🌍 Mapa Mundi
            </button>
          </div>
        </div>

        {/* The tile grid */}
        <div style={{
          position: 'absolute',
          top: '60px', bottom: 0,
          left: 0, right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${VILLAGE_GRID[0].length}, 1fr)`,
            gridTemplateRows: `repeat(${VILLAGE_GRID.length}, 1fr)`,
            gap: '5px',
            width: 'min(90vh, 95vw)',
            aspectRatio: `${VILLAGE_GRID[0].length} / ${VILLAGE_GRID.length}`,
          }}>
            {VILLAGE_GRID.map((row, rowIdx) =>
              row.map((type, colIdx) => {
                const key = `${rowIdx}-${colIdx}`;
                return (
                  <VillageTile
                    key={key}
                    type={type}
                    isHovered={hoveredTile === key}
                    onHover={() => setHoveredTile(key)}
                    onLeave={() => setHoveredTile(null)}
                    onClick={() => handleTileClick(type)}
                    playerAnimating={false}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Building info panel (side panel) */}
        {selectedBldg && (
          <div className="map-panel" style={{
            position: 'absolute',
            right: '20px',
            top: '80px',
            width: '300px',
            background: 'rgba(8,12,18,0.97)',
            border: `1px solid ${selectedBldg.color}`,
            borderRadius: '12px',
            padding: '24px',
            zIndex: 30,
            boxShadow: `0 0 40px ${selectedBldg.color}33`,
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '8px', filter: `drop-shadow(0 0 12px ${selectedBldg.color})` }}>
                {selectedBldg.icon}
              </div>
              <h3 style={{ color: selectedBldg.color, fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                {selectedBldg.label}
              </h3>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              {selectedBldg.desc}
            </p>
            {selectedBldg.route && selectedBldg.route !== 'world' && (
              <button
                onClick={() => navigate(selectedBldg.route)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: selectedBldg.color,
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              >
                Entrar
              </button>
            )}
            <button
              onClick={() => setSelectedBuilding(null)}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Legend bottom-left */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          {Object.entries(BUILDING_CONFIG).slice(0, 4).map(([key, b]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{b.icon}</span>
              <span style={{ color: b.color, fontSize: '10px', fontWeight: 'bold' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========================
  // RENDER: WORLD MAP MODE
  // ========================
  return (
    <div style={{ padding: 0, overflow: 'hidden', position: 'fixed', inset: 0 }} onClick={handleMapClick}>

      {/* Map background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: "url('/images/mapa.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        zIndex: 0,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1 }} />

      {/* Village tiles on the world map */}
      {Object.entries(villages).map(([vId, v]) => v.x != null && (
        <div
          key={vId}
          className="village-node"
          style={{
            position: 'absolute', zIndex: 6,
            left: `${v.x}%`, top: `${v.y}%`,
            transform: 'translate(-50%, -50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            cursor: currentLoc !== parseInt(vId) ? 'pointer' : 'default',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (currentLoc !== parseInt(vId)) setConfirmTarget(parseInt(vId));
            else { setViewMode('village'); }
          }}
        >
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '8px',
            border: `2px solid ${currentLoc === parseInt(vId) ? '#d4a22a' : 'rgba(255,255,255,0.3)'}`,
            background: currentLoc === parseInt(vId) ? 'rgba(212,162,42,0.15)' : 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
            boxShadow: currentLoc === parseInt(vId) ? '0 0 20px rgba(212,162,42,0.5)' : '0 2px 8px rgba(0,0,0,0.8)',
            transition: 'all 0.2s',
          }}>
            {v.icon || '🏯'}
          </div>
          <div style={{
            background: currentLoc === parseInt(vId) ? 'rgba(212,162,42,0.9)' : 'rgba(0,0,0,0.8)',
            border: `1px solid ${currentLoc === parseInt(vId) ? '#d4a22a' : 'rgba(255,255,255,0.25)'}`,
            color: currentLoc === parseInt(vId) ? '#000' : '#fff',
            fontSize: '10px', fontWeight: 'bold',
            padding: '3px 8px', borderRadius: '4px', marginTop: '4px',
            whiteSpace: 'nowrap',
          }}>
            {currentLoc === parseInt(vId) ? '📍 ' : ''}{v.name}
          </div>
          {currentLoc === parseInt(vId) && (
            <div style={{ color: 'rgba(212,162,42,0.7)', fontSize: '9px', marginTop: '2px' }}>
              (clique para voltar)
            </div>
          )}
        </div>
      ))}

      {/* NPC markers */}
      {visibleNpcs.slice(0, 30).map(npc => (
        <div
          key={npc.id}
          className="npc-node"
          style={{
            position: 'absolute', zIndex: 7,
            left: `${npc.x}%`, top: `${npc.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}
          onClick={(e) => { e.stopPropagation(); attackNpc(npc); }}
          title={`${npc.name} - Lv. ${npc.level}`}
        >
          <div style={{
            fontSize: '20px',
            filter: `drop-shadow(0 0 4px ${npc.is_bingo_book ? '#ef4444' : npc.is_ghost ? '#ab47bc' : npc.is_story_mode ? 'gold' : '#fff'})`,
          }}>
            {npc.avatar || '👹'}
          </div>
        </div>
      ))}

      {/* Player marker on world map */}
      <div style={{
        position: 'absolute', zIndex: 8,
        left: `${playerX}%`, top: `${playerY}%`,
        transform: 'translate(-50%, -100%)',
        transition: 'left 1s ease-in-out, top 1s ease-in-out',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px gold)', animation: isWalking ? 'shake 0.4s infinite' : 'none' }}>
          🥷
        </div>
        <div style={{ background: 'rgba(0,0,0,0.8)', borderRadius: '3px', padding: '1px 6px', fontSize: '9px', color: '#d4a22a', fontWeight: 'bold' }}>
          Você
        </div>
      </div>

      {/* TOP LEFT: Location + back button */}
      <div className="map-panel" style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
        <div style={{
          background: 'rgba(8,12,18,0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(212,162,42,0.3)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          minWidth: '200px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Mapa Mundi
          </div>
          <div style={{ color: '#d4a22a', fontWeight: 'bold', fontSize: '14px' }}>
            {villages[currentLoc]?.icon} Vila de {villages[currentLoc]?.name}
          </div>
          <button
            onClick={() => setViewMode('village')}
            style={{
              background: 'rgba(212,162,42,0.12)',
              border: '1px solid rgba(212,162,42,0.4)',
              color: '#d4a22a',
              borderRadius: '6px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            ← Voltar à Vila
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Travel confirm + Threat radar */}
      <div className="map-panel" style={{
        position: 'absolute', top: '16px', right: '16px',
        zIndex: 10, width: '280px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        maxHeight: 'calc(100vh - 32px)',
      }}>

        {/* Travel confirm */}
        {confirmTarget && (
          <div style={{
            background: 'rgba(8,12,18,0.97)',
            backdropFilter: 'blur(8px)',
            border: '2px solid #d4a22a',
            borderRadius: '10px',
            padding: '20px',
          }}>
            <h3 style={{ color: '#d4a22a', marginBottom: '10px', fontSize: '15px' }}>⛺ Confirmar Viagem</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', marginBottom: '16px' }}>
              Ir para a Vila de <strong style={{ color: '#fff' }}>{villages[confirmTarget]?.name}</strong>?
              <br />
              <span style={{ color: '#f59e0b', fontSize: '12px' }}>Custo: 100 Ryous</span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleTravel}
                disabled={loadingId !== null}
                style={{
                  width: '100%', padding: '10px',
                  background: '#d4a22a', border: 'none',
                  borderRadius: '6px', color: '#000',
                  fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
                }}
              >
                {loadingId ? 'Viajando...' : '🚀 Viajar'}
              </button>
              <button
                onClick={() => setConfirmTarget(null)}
                style={{
                  width: '100%', padding: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '6px', color: 'rgba(255,255,255,0.5)',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Threat radar */}
        <div style={{
          background: 'rgba(8,12,18,0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '10px',
          padding: '16px',
          flex: 1,
          overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>📡 Radar de Ameaças</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px' }}>
              <input type="checkbox" checked={hideStory} onChange={(e) => setHideStory(e.target.checked)} />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Ocultar Sagas</span>
            </label>
          </div>

          {loadingMap ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
              Escaneando...
            </div>
          ) : visibleNpcs.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px', fontSize: '12px' }}>
              O mapa está seguro... por enquanto.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {visibleNpcs.slice(0, 12).map(npc => (
                <div
                  key={npc.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${npc.is_bingo_book ? '#ef4444' : npc.is_ghost ? '#ab47bc' : npc.is_story_mode ? '#d4a22a' : '#6b7280'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{npc.avatar}</span>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '11px' }}>{npc.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px' }}>Nv. {npc.level}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => attackNpc(npc)}
                    style={{
                      background: 'rgba(239,68,68,0.15)',
                      border: '1px solid rgba(239,68,68,0.4)',
                      color: '#ef4444',
                      borderRadius: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Atacar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
