import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
import NpcPortrait from '../components/NpcPortrait';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/core-flows-v4.css';
import { createPlayerShadow } from '../utils/opponentRoster';

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
  kage:       { icon: '🏛️', label: 'Gabinete do Kage',     textClass: 'text-[#f59e0b]', borderClass: 'border-[#f59e0b]', bgClass: "bg-[url('/images/imgi_106_map_yellow2.png')]", route: null,        desc: 'Missões Rank-S e administração da Vila.' },
  hospital:   { icon: '🏥', label: 'Hospital',             textClass: 'text-[#ef4444]', borderClass: 'border-[#ef4444]', bgClass: "bg-[url('/images/imgi_105_map_red2.png')]",    route: '/hospital', desc: 'Recupere seu HP e cure debuffs.' },
  dojo:       { icon: '⚔️', label: 'Academia (Dojo)',      textClass: 'text-[#4b9eff]', borderClass: 'border-[#4b9eff]', bgClass: "bg-[url('/images/imgi_104_map_green2.png')]",  route: '/dojo',     desc: 'Treine com NPCs e ganhe XP.' },
  ichiraku:   { icon: '🍜', label: 'Restaurante Ichiraku', textClass: 'text-[#f97316]', borderClass: 'border-[#f97316]', bgClass: "bg-[url('/images/imgi_100_map_orange2.png')]", route: '/ichiraku', desc: 'Recupere sua Stamina com ramen.' },
  blacksmith: { icon: '🔨', label: 'Ferreiro',             textClass: 'text-[#a78bfa]', borderClass: 'border-[#a78bfa]', bgClass: "bg-[url('/images/imgi_103_map_gray.png')]",    route: '/ferreiro', desc: 'Forje e melhore seus equipamentos.' },
  historia:   { icon: '📜', label: 'Escritório do Hokage', textClass: 'text-[#fbbf24]', borderClass: 'border-[#fbbf24]', bgClass: "bg-[url('/images/imgi_106_map_yellow2.png')]", route: '/historia', desc: 'Aventure-se pelas Sagas.' },
  gates:      { icon: '⛩️', label: 'Portões da Vila',      textClass: 'text-[#9ca3af]', borderClass: 'border-[#6b7280]', bgClass: "bg-[url('/images/imgi_103_map_gray.png')]",    route: 'world',     desc: 'Saia para o Mapa Mundi e visite outras Vilas.' },
  portal_in:  { icon: '🌐', label: 'Portão de Invasão',    textClass: 'text-[#ef4444]', borderClass: 'border-[#ef4444]', bgClass: "bg-[url('/images/imgi_105_map_red2.png')]",    route: '/evento',   desc: 'Alerta! World Boss activo.' },
};

const TILE_TERRAIN_CLASS = {
  empty:  'bg-[#0f1e0f]/50 border border-[#1e3c1e]/30',
  path:   'bg-[#b48c46]/25 border border-[#c8a050]/40',
  player: "bg-[url('/images/imgi_99_map_blue2.png')] bg-center bg-contain bg-no-repeat bg-transparent border-0",
};

const TRAVEL_COST = 100;

function VillageTile({ type, onClick, isHovered, onHover, onLeave, playerAnimating }) {
  const building = BUILDING_CONFIG[type];
  const isPlayer = type === 'player';
  const isPath = type === 'path';
  const terrainClass = building
    ? `${building.bgClass} bg-center bg-contain bg-no-repeat bg-transparent border-0`
    : (TILE_TERRAIN_CLASS[type] || TILE_TERRAIN_CLASS.empty);

  const TileElement = building ? 'button' : 'div';
  return (
    <TileElement
      type={building ? 'button' : undefined}
      className={`kuro-map-v4__tile ${building ? 'is-building cursor-pointer' : 'cursor-default'} relative aspect-square rounded flex flex-col items-center justify-center transition-[transform,box-shadow] duration-150 ease-out overflow-visible ${terrainClass} ${isHovered && building ? 'scale-105 z-10 shadow-lg' : 'scale-100 z-1'}`}
      aria-label={building ? `Explorar ${building.label}` : undefined}
      onClick={building ? onClick : undefined}
      onMouseEnter={building ? onHover : undefined}
      onMouseLeave={building ? onLeave : undefined}
    >
      {isPath && (
        <div className="absolute inset-0 rounded-[3px] bg-[repeating-linear-gradient(45deg,rgba(200,160,80,0.1)_0px,rgba(200,160,80,0.1)_2px,transparent_2px,transparent_8px)]" />
      )}

      {building && (
        <>
          <div className={`text-[28px] leading-none transition-transform duration-150 ${isHovered ? '-translate-y-0.5' : ''}`}>
            {building.icon}
          </div>
          <div className={`text-[9px] font-bold mt-1 text-center leading-tight uppercase tracking-[0.5px] max-w-[90%] ${isHovered ? building.textClass : 'text-white/55'}`}>
            {building.label.split(' ')[0]}
          </div>

          {isHovered && (
            <div className={`absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0a0c12]/97 border ${building.borderClass} rounded px-2 py-[3px] text-[10px] ${building.textClass} font-bold z-20 pointer-events-none`}>
              {building.label}
            </div>
          )}
        </>
      )}

      {isPlayer && (
        <div className="flex flex-col items-center gap-0.5">
          <div className={`text-2xl drop-shadow-[0_0_8px_rgba(212,162,42,0.9)] ${playerAnimating ? 'animate-bounce' : ''}`}>
            🥷
          </div>
          <div className="text-[8px] text-[#d4a22a] font-bold uppercase tracking-[0.5px]">
            Você
          </div>
        </div>
      )}
    </TileElement>
  );
}

export default function Mapa({ player, updatePlayer }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  const [viewMode, setViewMode] = useState('village');
  const [hoveredTile, setHoveredTile] = useState(null);
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
      .from('npcs').select('*').eq('is_map_npc', true).eq('is_active', true);

    const { data: defeated } = await supabase
      .from('player_defeated_npcs').select('npc_id').eq('player_id', player.id);

    const defeatedIds = defeated ? defeated.map(d => d.npc_id) : [];

    const { data: topPlayers, error: profileError } = await supabase.rpc('listar_perfis_ninja', {
      p_limit: 100
    });

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

    if (!profileError && topPlayers?.length > 0) {
      const shuffled = topPlayers.filter(p => p.id !== player.id)
        .sort(() => Math.random() - 0.5).slice(0, 5);
      const ghosts = shuffled
        .map(p => createPlayerShadow(p, player.id))
        .filter(Boolean);
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

    const canonicalPool = npcs.filter(npc =>
      Number.isSafeInteger(Number(npc.id)) &&
      Number(npc.id) > 0 &&
      npc.character_id && !npc.is_ghost &&
      npc.is_map_npc === true && npc.is_story_mode === false &&
      npc.is_bingo_book === false && npc.is_chunin_exam === false &&
      npc.is_active === true
    );
    if (dist > 5 && Math.random() < 0.15 && canonicalPool.length) {
      const template = canonicalPool[Math.floor(Math.random() * canonicalPool.length)];
      setTimeout(() => {
        setIsWalking(false);
        addToast(`Você encontrou ${template.name} pelo caminho.`, 'info');
        navigate('/combate', {
          state: { bgType: 'map', npc: { ...template, activeJutsus: [] }, isMirror: false, fromMap: true }
        });
      }, 800);
    } else {
      setTimeout(() => setIsWalking(false), 1000);
    }
  };

  const visibleNpcs = npcs.filter(n => !hideStory || !n.is_story_mode);

  if (viewMode === 'village') {
    const selectedBldg = selectedBuilding ? BUILDING_CONFIG[selectedBuilding] : null;

    return (
      <div className="kuro-map-v4 kuro-map-v4--village" aria-label="Mapa interativo da vila">
        <div className="absolute inset-0 z-0 bg-[url('/images/imgi_67_mapbase.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 z-0 bg-black/45" />

        <div className="kuro-map-v4__topbar absolute top-0 left-0 right-0 z-20 bg-black/75 backdrop-blur-md border-b border-[#d4a22a]/25 flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-lg">{villages[currentLoc]?.icon || '🏯'}</span>
            <div>
              <div className="text-white/45 text-[10px] uppercase tracking-[1px]">Localização Atual</div>
              <div className="text-[#d4a22a] font-bold text-[15px]">
                Vila de {villages[currentLoc]?.name || 'Konoha'}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <div className="text-white/50 text-xs">Clique num edifício para interagir</div>
            <GameAction tone="quiet" className="kuro-map-v4__nav-action" onClick={() => setViewMode('world')} aria-label="Abrir mapa mundi"><SidebarIcon name="map" size={16} /> Mapa Mundi</GameAction>
          </div>
        </div>

        <div className="absolute top-[60px] bottom-0 left-0 right-0 flex items-center justify-center p-5 z-1">
          <div className="grid grid-cols-6 grid-rows-7 gap-[5px] w-[min(90vh,95vw)] aspect-[6/7]">
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

        {selectedBldg && (
          <div className={`map-panel kuro-map-v4__detail absolute right-5 top-20 w-[300px] bg-[#080c12]/97 border ${selectedBldg.borderClass} rounded-xl p-6 z-30 shadow-2xl`}>
            <div className="text-center mb-4">
              <div className="text-5xl mb-2">
                {selectedBldg.icon}
              </div>
              <h3 className={`text-lg font-bold m-0 ${selectedBldg.textClass}`}>
                {selectedBldg.label}
              </h3>
            </div>
            <p className="text-white/60 text-[13px] text-center mb-5 leading-relaxed">
              {selectedBldg.desc}
            </p>
            {selectedBldg.route && selectedBldg.route !== 'world' && (
              <GameAction tone="gold" className="kuro-map-v4__panel-action" onClick={() => navigate(selectedBldg.route)}>Entrar</GameAction>
            )}
            <GameAction tone="quiet" className="kuro-map-v4__panel-action" onClick={() => setSelectedBuilding(null)}>Fechar</GameAction>
          </div>
        )}

        <div className="kuro-map-v4__legend absolute bottom-4 left-4 z-20 flex flex-col gap-1">
          {Object.entries(BUILDING_CONFIG).slice(0, 4).map(([key, b]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-sm">{b.icon}</span>
              <span className={`text-[10px] font-bold ${b.textClass}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="kuro-map-v4 kuro-map-v4--world" onClick={handleMapClick} aria-label="Mapa mundi ninja">
      <div className="absolute inset-0 bg-[url('/images/mapa.png')] bg-cover bg-center z-0" />
      <div className="absolute inset-0 bg-black/30 z-1" />

      {Object.entries(villages).map(([vId, v]) => {
        if (v.x == null) return null;
        const isCurrent = currentLoc === parseInt(vId, 10);
        return (
          <button
            type="button"
            key={vId}
            className={`village-node kuro-map-v4__village-node absolute z-6 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${isCurrent ? 'cursor-default' : 'cursor-pointer'}`}
            aria-label={isCurrent ? `Voltar à vila de ${v.name}` : `Selecionar viagem para a vila de ${v.name}`}
            style={{ left: `${v.x}%`, top: `${v.y}%` }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isCurrent) setConfirmTarget(parseInt(vId, 10));
              else setViewMode('village');
            }}
          >
            <div className={`w-[52px] h-[52px] rounded-lg border-2 flex items-center justify-center text-[26px] transition-[transform,border-color,background-color] duration-200 ${isCurrent ? 'border-[#d4a22a] bg-[#d4a22a]/15 shadow-[0_0_20px_rgba(212,162,42,0.5)]' : 'border-white/30 bg-black/70 shadow-[0_2px_8px_rgba(0,0,0,0.8)] hover:scale-105'}`}>
              {v.icon || '🏯'}
            </div>
            <div className={`border text-[10px] font-bold px-2 py-[3px] rounded mt-1 whitespace-nowrap ${isCurrent ? 'bg-[#d4a22a]/90 border-[#d4a22a] text-black' : 'bg-black/80 border-white/25 text-white'}`}>
              {isCurrent ? '📍 ' : ''}{v.name}
            </div>
            {isCurrent && (
              <div className="text-[#d4a22a]/70 text-[9px] mt-0.5">
                (clique para voltar)
              </div>
            )}
          </button>
        );
      })}

      {visibleNpcs.slice(0, 30).map(npc => {
        const glowClass = npc.is_bingo_book
          ? 'drop-shadow-[0_0_4px_#ef4444]'
          : npc.is_ghost
            ? 'drop-shadow-[0_0_4px_#ab47bc]'
            : npc.is_story_mode
              ? 'drop-shadow-[0_0_4px_gold]'
              : 'drop-shadow-[0_0_4px_#fff]';
        return (
          <button
            type="button"
            key={npc.id}
            className="npc-node kuro-map-v4__npc-node absolute z-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer flex flex-col items-center p-0 border-0 bg-transparent transition-transform duration-150 hover:scale-110"
            style={{ left: `${npc.x}%`, top: `${npc.y}%` }}
            onClick={(e) => { e.stopPropagation(); attackNpc(npc); }}
            title={`${npc.name} - Lv. ${npc.level}`}
            aria-label={`Combater ${npc.name}, nível ${npc.level}`}
          >
            <span className={glowClass}>
              <NpcPortrait npc={npc} size={34} decorative />
            </span>
          </button>
        );
      })}

      <div
        className="absolute z-8 -translate-x-1/2 -translate-y-full transition-[left,top] duration-1000 ease-in-out flex flex-col items-center pointer-events-none"
        style={{ left: `${playerX}%`, top: `${playerY}%` }}
      >
        <div className={`text-[28px] drop-shadow-[0_0_8px_gold] ${isWalking ? 'animate-bounce' : ''}`}>
          🥷
        </div>
        <div className="bg-black/80 rounded-[3px] px-1.5 py-[1px] text-[9px] text-[#d4a22a] font-bold">
          Você
        </div>
      </div>

      <div className="map-panel kuro-map-v4__location absolute top-4 left-4 z-10">
        <div className="bg-[#080c12]/92 backdrop-blur-md border border-[#d4a22a]/30 rounded-[10px] px-4 py-3 flex flex-col gap-2 min-w-[200px]">
          <div className="text-white/40 text-[9px] uppercase tracking-[1.5px]">
            Mapa Mundi
          </div>
          <div className="text-[#d4a22a] font-bold text-sm">
            {villages[currentLoc]?.icon} Vila de {villages[currentLoc]?.name}
          </div>
          <GameAction tone="quiet" className="kuro-map-v4__nav-action" onClick={() => setViewMode('village')}><SidebarIcon name="arrowLeft" size={16} /> Voltar à Vila</GameAction>
        </div>
      </div>

      <div className="map-panel kuro-map-v4__radar-panel absolute top-4 right-4 z-10 w-[280px] flex flex-col gap-3 max-h-[calc(100vh-32px)]">
        {confirmTarget && (
          <div className="bg-[#080c12]/97 backdrop-blur-md border-2 border-[#d4a22a] rounded-[10px] p-5">
            <h3 className="text-[#d4a22a] mb-2.5 text-[15px]">⛺ Confirmar Viagem</h3>
            <p className="text-white/70 text-[13px] mb-4">
              Ir para a Vila de <strong className="text-white">{villages[confirmTarget]?.name}</strong>?
              <br />
              <span className="text-[#f59e0b] text-xs tabular-nums">Custo: 100 Ryous</span>
            </p>
            <div className="flex flex-col gap-2">
              <GameAction tone="gold" className="kuro-map-v4__panel-action" onClick={handleTravel} loading={loadingId !== null}>{loadingId ? 'Viajando…' : 'Confirmar viagem'}</GameAction>
              <GameAction tone="quiet" className="kuro-map-v4__panel-action" onClick={() => setConfirmTarget(null)}>Cancelar</GameAction>
            </div>
          </div>
        )}

        <div className="bg-[#080c12]/88 backdrop-blur-md border border-[#ef4444]/25 rounded-[10px] p-4 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[#ef4444] m-0 text-[13px]">📡 Radar de Ameaças</h3>
            <label className="flex items-center gap-1 cursor-pointer text-[11px]">
              <input type="checkbox" checked={hideStory} onChange={(e) => setHideStory(e.target.checked)} />
              <span className="text-white/40">Ocultar Sagas</span>
            </label>
          </div>

          {loadingMap ? (
            <div className="text-white/40 text-center p-5 text-xs">
              Escaneando...
            </div>
          ) : visibleNpcs.length === 0 ? (
            <div className="text-white/40 text-center p-5 text-xs">
              O mapa está seguro... por enquanto.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {visibleNpcs.slice(0, 12).map(npc => {
                const borderLeftClass = npc.is_bingo_book
                  ? 'border-l-[#ef4444]'
                  : npc.is_ghost
                    ? 'border-l-[#ab47bc]'
                    : npc.is_story_mode
                      ? 'border-l-[#d4a22a]'
                      : 'border-l-[#6b7280]';
                return (
                  <div
                    key={npc.id}
                    className={`flex items-center justify-between px-2.5 py-2 bg-white/[0.04] rounded-md border-l-3 ${borderLeftClass}`}
                  >
                    <div className="flex items-center gap-2">
                      <NpcPortrait npc={npc} size={30} decorative />
                      <div>
                        <div className="text-white font-bold text-[11px]">{npc.name}</div>
                        <div className="text-white/40 text-[10px] tabular-nums">Nv. {npc.level}</div>
                      </div>
                    </div>
                    <GameAction tone="danger" size="small" onClick={() => attackNpc(npc)}>Atacar</GameAction>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
