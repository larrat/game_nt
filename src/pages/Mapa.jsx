import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
import { generateDynamicRogueNinja } from '../utils/engine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import MapGrid from '../components/MapGrid';

const TRAVEL_COST = 100;

export default function Mapa({ player, updatePlayer }) {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const gameConfig = useGameConfig();
  
  const [loadingId, setLoadingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  
  const [npcs, setNpcs] = useState([]);
  const [villages, setVillages] = useState({});
  const [hideStory, setHideStory] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  
  // Coordenadas em porcentagem (0-100)
  const [playerX, setPlayerX] = useState(50);
  const [playerY, setPlayerY] = useState(50);
  const [isWalking, setIsWalking] = useState(false);

  useEffect(() => {
    if (player && player.is_fainted) {
      navigate('/hospital');
    }
  }, [player, navigate]);

  if (!player) return null;
  const currentLoc = player.vila_atual_id || player.village_id;

  const loadMapData = async () => {
    setLoadingMap(true);
    
    // 1. Puxa todos os NPCs do mapa
    const { data: allNpcs, error: npcErr } = await supabase
      .from('npcs')
      .select('*')
      .eq('is_map_npc', true);
      
    // 2. Puxa NPCs já derrotados pelo jogador
    const { data: defeated } = await supabase
      .from('player_defeated_npcs')
      .select('npc_id')
      .eq('player_id', player.id);

    const defeatedIds = defeated ? defeated.map(d => d.npc_id) : [];

    // 3. Puxa Top 100 Jogadores para gerar Fantasmas
    const { data: topPlayers } = await supabase
      .from('players')
      .select('id, name, level, hp, chakra, stamina, avatar, element, atk, def, ninjutsu, genjutsu, taijutsu, bukijutsu')
      .neq('id', player.id)
      .order('level', { ascending: false })
      .limit(100);

    // 4. Puxa as vilas do banco
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
      activeNpcs = allNpcs.map(npc => {
        const pseudoRandomX = npc.map_x !== null ? npc.map_x : 10 + ((npc.id * 17) % 80);
        const pseudoRandomY = npc.map_y !== null ? npc.map_y : 10 + ((npc.id * 23) % 80);
        return { ...npc, x: pseudoRandomX, y: pseudoRandomY };
      }).filter(npc => {
        if ((npc.is_story_mode || npc.is_bingo_book) && defeatedIds.includes(npc.id)) {
          return false;
        }
        return true;
      });
    }

    // 4. Mistura 5 Fantasmas
    if (topPlayers && topPlayers.length > 0) {
      const shuffled = [...topPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const top5Ghost = shuffled.slice(0, 5);
      const ghosts = top5Ghost.map((p, idx) => ({
        id: `ghost_${p.id}`,
        name: p.name,
        level: p.level,
        avatar: p.avatar?.startsWith('/') ? '🥷' : (p.avatar || '🥷'), // fallback
        hp: p.hp || (p.level * 50),
        chakra: p.chakra || (p.level * 50),
        atk: p.atk || (p.level * 5),
        def: p.def || (p.level * 3),
        nin: p.ninjutsu || p.level,
        element: p.element || 'Katon',
        is_ghost: true,
        xpReward: Math.floor(p.level * 3),
        ryouReward: Math.floor(p.level * 2),
        x: 10 + ((p.id.charCodeAt(0) * 17) % 80),
        y: 10 + ((p.id.charCodeAt(p.id.length-1) * 23) % 80)
      }));
      activeNpcs = [...activeNpcs, ...ghosts];
    }
      
    setNpcs(activeNpcs);
    setLoadingMap(false);
  };

  useEffect(() => {
    loadMapData();
  }, [player.id]);

  const requestTravel = (targetId) => {
    if (targetId === currentLoc) return;
    setConfirmTarget(targetId);
  };

  const cancelTravel = () => {
    setConfirmTarget(null);
  };

  const handleTravel = async () => {
    if (!confirmTarget) return;
    const targetId = confirmTarget;
    
    if (player.ryous < TRAVEL_COST) {
      addToast(`Você não tem Ryous suficientes. Custa ${TRAVEL_COST} Ryous para viajar.`, 'error');
      setConfirmTarget(null);
      return;
    }

    setLoadingId(targetId);
    const newRyous = player.ryous - TRAVEL_COST;

    const { error } = await supabase
      .from('players')
      .update({ vila_atual_id: targetId, ryous: newRyous })
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao viajar: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      addToast(`Chegou na Vila da ${villages[targetId]?.name}!`, 'success');
      navigate('/vila'); // auto-redirect to vila
    }

    setLoadingId(null);
    setConfirmTarget(null);
  };

  const handleMove = (newX, newY) => {
    // Checagem de Encontro Aleatório (15%)
    if (Math.random() < 0.15) {
       // Calcular distância da vila mais próxima (ou da vila atual)
       let dist = 0;
       const vIdStr = String(currentLoc);
       const village = villages[vIdStr];
       if (village) {
         const vx = (parseInt(vIdStr) * 5) % 20;
         const vy = (parseInt(vIdStr) * 3) % 20;
         dist = Math.abs(newX - vx) + Math.abs(newY - vy);
       } else {
         dist = Math.abs(newX - 5) + Math.abs(newY - 5);
       }
       
       // Zonas de Perigo: A cada 3 blocos de distância, +1 no extraLevelBonus
       const extraLevel = Math.floor(dist / 3);
       const rogue = generateDynamicRogueNinja(player, extraLevel);
       
       addToast(rogue.desc, "error");
       navigate('/combate', { state: { bgType: 'map', npc: rogue, isMirror: true, fromMap: true } });
       return;
    }
    
    setPlayerX(newX);
    setPlayerY(newY);
  };

  const attackNpc = (npc) => {
    const maxBeginnerLevel = Number(gameConfig?.beginner_max_level) || 9;
    const maxBeginnerBattles = Number(gameConfig?.beginner_daily_battles) || 20;

    if (player.level <= maxBeginnerLevel) {
      if ((player.daily_map_battles || 0) >= maxBeginnerBattles) {
        addToast(`Você atingiu o limite de ${maxBeginnerBattles} lutas livres de mapa por dia (Para Iniciantes).`, "error");
        return;
      }
    }
    navigate('/combate', { state: { bgType: 'map', npc: npc, isMirror: false, fromMap: true, isGhost: npc.is_ghost } });
  };

  const handleMapClick = (e) => {
    if (e.target.closest('.card, .card-glass, .village-node, .npc-node')) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const dist = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
    
    setPlayerX(x);
    setPlayerY(y);
    setIsWalking(true);

    // Rola encontro aleatório se a caminhada for razoável (10% de chance)
    if (dist > 5 && Math.random() < 0.15) {
       const extraLevel = Math.floor(dist / 10);
       const rogue = generateDynamicRogueNinja(player, extraLevel);
       setTimeout(() => {
         setIsWalking(false);
         addToast(rogue.desc, "error");
         navigate('/combate', { state: { bgType: 'map', npc: rogue, isMirror: true, fromMap: true } });
       }, 800); // Dá tempo do avatar andar um pouco
    } else {
       setTimeout(() => setIsWalking(false), 1000);
    }
  };

  const visibleNpcs = npcs.filter(n => !hideStory || !n.is_story_mode);

  return (
    <div style={{ padding: 0, overflow: 'hidden', position: 'fixed', inset: 0 }} onClick={handleMapClick}>
      
      {/* Mapa Fullscreen */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/mapa.png')", backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
      {/* Overlay escuro suave para legibilidade */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1 }} />

      {/* Vilas posicionadas no mapa */}
      {Object.entries(villages).map(([vId, v]) => v.x != null && (
        <div key={vId} className="village-node" style={{
          position: 'absolute', zIndex: 6,
          left: `${v.x}%`, top: `${v.y}%`,
          transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          cursor: currentLoc !== parseInt(vId) ? 'pointer' : 'default',
        }} onClick={(e) => { e.stopPropagation(); currentLoc !== parseInt(vId) && setConfirmTarget(parseInt(vId)); }}>
          <div style={{
            fontSize: '28px',
            filter: currentLoc === parseInt(vId) ? 'drop-shadow(0 0 12px gold)' : 'drop-shadow(0 0 6px rgba(0,0,0,0.8))',
            transition: 'transform 0.2s'
          }}>{v.icon || '🏯'}</div>
          <div style={{
            background: currentLoc === parseInt(vId) ? 'rgba(212,162,42,0.9)' : 'rgba(0,0,0,0.75)',
            border: `1px solid ${currentLoc === parseInt(vId) ? 'gold' : 'rgba(255,255,255,0.3)'}`,
            color: currentLoc === parseInt(vId) ? '#000' : '#fff',
            fontSize: '10px', fontWeight: 'bold',
            padding: '2px 8px', borderRadius: '4px', marginTop: '4px',
            whiteSpace: 'nowrap'
          }}>
            {currentLoc === parseInt(vId) ? '📍 ' : ''}{v.name}
          </div>
        </div>
      ))}

      {/* NPCs como pontos no mapa */}
      {visibleNpcs.slice(0, 30).map(npc => (
        <div key={npc.id} className="npc-node" style={{
          position: 'absolute', zIndex: 7,
          left: `${npc.x}%`, top: `${npc.y}%`,
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }} onClick={(e) => { e.stopPropagation(); attackNpc(npc); }}
          title={`${npc.name} - Lv. ${npc.level}`}
        >
          <div style={{
            fontSize: '20px',
            filter: `drop-shadow(0 0 4px ${npc.is_bingo_book ? '#ef4444' : npc.is_ghost ? '#ab47bc' : npc.is_story_mode ? 'gold' : '#fff'})`,
            animation: npc.is_bingo_book ? 'pulse 2s infinite' : 'none'
          }}>{npc.avatar || '👹'}</div>
        </div>
      ))}

      {/* Avatar do Jogador */}
      <div style={{
        position: 'absolute', zIndex: 8,
        left: `${playerX}%`, top: `${playerY}%`,
        transform: 'translate(-50%, -100%)',
        transition: 'left 1s ease-in-out, top 1s ease-in-out',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{
          fontSize: '32px',
          filter: 'drop-shadow(0 0 8px gold)',
          animation: isWalking ? 'shake 0.4s infinite' : 'none'
        }}>🥷</div>
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: 'gold', fontWeight: 'bold' }}>
          Você
        </div>
      </div>

      {/* Painel flutuante superior esquerdo - Localização */}
      <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>
        <div className="card-glass" style={{ padding: '12px 20px', background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(212,162,42,0.4)' }}>
          <div className="muted" style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '4px' }}>LOCALIZAÇÃO ATUAL</div>
          <div className="paper" style={{ fontSize: '16px', fontFamily: "'Shippori Mincho', serif", fontWeight: 'bold' }}>
            {villages[currentLoc]?.icon} Vila da {villages[currentLoc]?.name}
          </div>
        </div>
      </div>

      {/* Radar / Lista de Ameaças - painel direito flutuante */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, width: '280px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: 'calc(100vh - 32px)' }}>
        
        {/* Caixa de confirmação de viagem */}
        {confirmTarget && (
          <div className="card" style={{ border: '2px solid var(--gold)', background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(8px)' }}>
            <h3 className="gold" style={{ marginBottom: '8px' }}>Confirmar Viagem</h3>
            <p className="paper" style={{ fontSize: '13px', marginBottom: '16px' }}>
              Ir para a Vila da {villages[confirmTarget]?.name}?
            </p>
            <div className="flex-col" style={{ gap: '8px' }}>
              <button className="btn-primary" style={{ width: '100%' }} onClick={handleTravel} disabled={loadingId !== null}>
                {loadingId === confirmTarget ? 'Entrando...' : 'Viajar (100 ¥)'}
              </button>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={cancelTravel}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Radar */}
        <div className="card-glass" style={{ background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,75,75,0.25)', flex: 1, overflowY: 'auto' }}>
          <div className="flex-between" style={{ marginBottom: '12px' }}>
            <h3 className="danger" style={{ fontSize: '14px', margin: 0 }}>📡 Radar de Ameaças</h3>
            <label className="flex-row" style={{ gap: '6px', cursor: 'pointer', fontSize: '11px' }}>
              <input type="checkbox" checked={hideStory} onChange={(e) => setHideStory(e.target.checked)} />
              <span className="muted">Ocultar História</span>
            </label>
          </div>
          
          {loadingMap ? (
            <div className="muted" style={{ textAlign: 'center', padding: '16px' }}>Escaneando...</div>
          ) : visibleNpcs.length === 0 ? (
            <div className="muted" style={{ textAlign: 'center', padding: '16px' }}>O mapa está seguro... por enquanto.</div>
          ) : (
            <div className="flex-col" style={{ gap: '8px' }}>
              {visibleNpcs.slice(0, 15).map(npc => (
                <div key={npc.id} className="flex-between" style={{
                  padding: '8px', borderRadius: '6px',
                  background: 'rgba(255,255,255,0.05)',
                  borderLeft: `3px solid ${npc.is_bingo_book ? '#ef4444' : npc.is_ghost ? '#ab47bc' : npc.is_story_mode ? 'var(--gold)' : 'var(--seal)'}`
                }}>
                  <div className="flex-row" style={{ gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '18px' }}>{npc.avatar}</span>
                    <div className="flex-col">
                      <span className="paper" style={{ fontSize: '12px', fontWeight: 600 }}>{npc.name}</span>
                      <span className="muted" style={{ fontSize: '10px' }}>Nv. {npc.level}</span>
                    </div>
                  </div>
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '10px', flexShrink: 0 }} onClick={() => attackNpc(npc)}>Atacar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
