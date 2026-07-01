import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';
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
  
  // Coordenadas mockadas locais para testar a exploração 2D
  const [playerX, setPlayerX] = useState(5);
  const [playerY, setPlayerY] = useState(5);

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
    navigate('/combate', { state: { npc: npc, isMirror: false, fromMap: true, isGhost: npc.is_ghost } });
  };

  const visibleNpcs = npcs.filter(n => !hideStory || !n.is_story_mode);

  return (
    <div className="page" style={{ paddingBottom: '60px' }}>
      <div className="topbar flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <PageHeader eyebrow="Exploração Global" title="Mapa-múndi" subtitle="Navegue pelas fronteiras, encontre batalhas e viaje para outras vilas." />
        
        <div className="flex-row" style={{ gap: '12px' }}>
          <label className="flex-row" style={{ gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
            <input 
              type="checkbox" 
              checked={hideStory} 
              onChange={(e) => setHideStory(e.target.checked)} 
            />
            <span className="muted">Ocultar Modo História</span>
          </label>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="flex-row" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <div className="card-glass" style={{ flex: 1, minWidth: '200px' }}>
            <div className="muted uppercase" style={{ fontSize: '12px', marginBottom: '8px', letterSpacing: '1px' }}>LOCALIZAÇÃO ATUAL</div>
            <div className="paper" style={{ fontSize: '18px', fontFamily: "'Shippori Mincho', serif" }}>
              {villages[currentLoc]?.icon} Vila da {villages[currentLoc]?.name}
            </div>
          </div>
          <div className="card-glass" style={{ flex: 1, minWidth: '200px' }}>
            <div className="muted uppercase" style={{ fontSize: '12px', marginBottom: '8px', letterSpacing: '1px' }}>SEUS RYOUS</div>
            <div className="mono gold" style={{ fontSize: '18px' }}>
              {player.ryous} ¥
            </div>
          </div>
        </div>
      </div>

      <div className="grid-sidebar">
        
        {/* GRID MAP */}
        <MapGrid 
          playerX={playerX}
          playerY={playerY}
          onMove={handleMove}
          villages={villages}
          npcs={visibleNpcs}
          currentLoc={currentLoc}
          onEnterVillage={(vId) => {
            requestTravel(parseInt(vId));
          }}
          onAttackNpc={attackNpc}
        />

        {/* Radar Sidebar */}
        <div className="flex-col" style={{ gap: '16px' }}>
          
          {confirmTarget && (
            <div className="card" style={{ border: '2px solid var(--gold)', animation: 'fadeIn 0.3s ease' }}>
              <h3 className="gold" style={{ marginBottom: '8px' }}>Confirmar Entrada</h3>
              <p className="paper" style={{ fontSize: '14px', marginBottom: '16px' }}>Você está no portão da Vila da {villages[confirmTarget]?.name}.</p>
              <div className="flex-col" style={{ gap: '12px' }}>
                <button className="btn-primary" style={{ width: '100%' }} onClick={handleTravel} disabled={loadingId !== null}>
                  {loadingId === confirmTarget ? 'Entrando...' : 'Entrar (100 Ryous)'}
                </button>
                <button className="btn-ghost" style={{ width: '100%' }} onClick={cancelTravel}>Cancelar</button>
              </div>
            </div>
          )}

          <h3 className="section-title gold" style={{ borderBottom: 'none' }}>Radar de Ameaças</h3>
          
          {loadingMap ? (
             <div className="muted">Escaneando o continente...</div>
          ) : visibleNpcs.length === 0 ? (
             <div className="card-glass muted">O mapa está seguro... por enquanto.</div>
          ) : (
            <div className="flex-col" style={{ gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {visibleNpcs.map(npc => (
                <div key={npc.id} className="card-glass flex-row" style={{ 
                  justifyContent: 'space-between', 
                  borderLeft: `3px solid ${npc.is_bingo_book ? 'var(--danger)' : npc.is_ghost ? '#ab47bc' : npc.is_story_mode ? 'var(--gold)' : 'var(--seal)'}`
                }}>
                  <div className="flex-row" style={{ gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>{npc.avatar}</div>
                    <div className="flex-col">
                      <div className="paper" style={{ fontWeight: 600 }}>{npc.name}</div>
                      <div className="muted" style={{ fontSize: '11px' }}>
                        Nv. {npc.level} • {npc.is_bingo_book ? 'ALVO BINGO BOOK' : npc.is_ghost ? 'Fantasma' : npc.is_story_mode ? 'Modo História' : 'Ameaça Local'}
                      </div>
                    </div>
                  </div>
                  <button className="btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => attackNpc(npc)}>Atacar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
