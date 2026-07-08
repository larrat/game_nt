import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateXPForLevel, calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateAtkNinGen, getGlobalDebuffs } from '../utils/engine';
import { supabase } from '../supabaseClient';
import { fetchActiveGlobalEvents } from '../utils/eventUtils';
import { useToast } from '../context/ToastContext';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import AvatarModal from '../components/AvatarModal';
import '../styles/main.css';

const VILLAGES = {
  1: 'Folha', 2: 'Areia', 3: 'Névoa',
  4: 'Pedra', 5: 'Nuvem', 6: 'Som', 7: 'Chuva', 8: 'Akatsuki'
};

const DailyTaskItem = ({ 
  taskId, title, titleIcon, rewardText, 
  progressValue, progressMax, progressColor, 
  claimedList, handleClaimTask, claiming 
}) => {
  const progressPercent = Math.min(100, (progressValue / progressMax) * 100);
  const isDone = progressValue >= progressMax;
  const isClaimed = claimedList.includes(taskId);

  return (
    <div style={{ background: 'var(--ink-raised)', padding: '12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
      <div className="flex-between" style={{ marginBottom: '8px' }}>
        <span className="paper flex-row" style={{ fontSize: '13px', alignItems: 'center', gap: '6px' }}>
          <img src={titleIcon} style={{ width: '12px' }} alt="Icon" /> {title}
        </span>
        <span className="mono gold flex-row" style={{ fontSize: '11px', alignItems: 'center', gap: '4px' }}>
          <img src="/images/imgi_20_ryous.png" style={{ width: '10px' }} alt="Ryous" /> {rewardText}
        </span>
      </div>
      <div className="flex-between" style={{ alignItems: 'center', gap: '12px' }}>
        <div className="progress-track" style={{ flex: 1, height: '6px' }}>
          <div className={`progress-fill ${progressColor}`} style={{ width: `${progressPercent}%` }} />
        </div>
        {isClaimed ? (
          <span className="success mono" style={{ fontSize: '10px' }}>✓ FEITO</span>
        ) : isDone ? (
          <button className="btn-ghost" onClick={() => handleClaimTask(taskId, 'ryous', 20)} disabled={claiming} style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'var(--seal-bright)', color: 'var(--seal-bright)' }}>RESGATAR</button>
        ) : (
          <span className="muted mono" style={{ fontSize: '10px' }}>{progressValue}/{progressMax}</span>
        )}
      </div>
    </div>
  );
};

export default function Dashboard({ player, updatePlayer }) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({});
  const [avatarUrl, setAvatarUrl] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      // 2. Eventos
      const { data: eventsData } = await supabase.from('world_events').select('*').order('start_time', { ascending: true });
      if (eventsData) setUpcomingEvents(eventsData);
    }
    if (player) loadData();
    if (player) loadData();
  }, [player]);

  // Busca Eventos Ativos
  useEffect(() => {
    async function fetchEvents() {
      const active = await fetchActiveGlobalEvents(supabase);
      setActiveEvents(active);

      const { data: upcoming } = await supabase
        .from('global_events')
        .select('*')
        .eq('is_active', false)
        .order('id', { ascending: false });

      if (upcoming) setUpcomingEvents(upcoming);
    }
    fetchEvents();
  }, []);

  // Timer em Tempo Real para Múltiplos Eventos
  useEffect(() => {
    if (activeEvents.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const newTimes = {};

      activeEvents.forEach(event => {
        if (!event.ends_at) return;
        const end = new Date(event.ends_at);
        const diff = end - now;

        if (diff <= 0) {
          newTimes[event.id] = 'Evento Encerrado';
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);
          newTimes[event.id] = `${hours}h ${minutes}m ${seconds}s`;
        }
      });

      setTimeRemaining(newTimes);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeEvents]);

  // Lógica de Reset Diário Automático
  useEffect(() => {
    const checkDailyReset = async () => {
      if (!player) return;
      const today = new Date().toISOString().split('T')[0];
      if (player.last_daily_reset !== today) {
        const { error } = await supabase.from('players').update({
          last_daily_reset: today,
          daily_npcs_defeated: 0,
          daily_chakra_spent: 0,
          daily_trainings: 0,
          daily_rewards_claimed: []
        }).eq('id', player.id);

        if (!error) {
          updatePlayer(player.user_id);
        }
      }
    };
    checkDailyReset();
  }, [player, updatePlayer]);

  // Resgate de Bônus Diário (Fidelidade)
  const handleDailyFidelity = async () => {
    if (!player) return;
    const today = new Date().toISOString().split('T')[0];
    if (player.last_daily_claim === today) return;

    setClaiming(true);
    const { error } = await supabase.from('players').update({
      last_daily_claim: today,
      ryous: (player.ryous || 0) + 50
    }).eq('id', player.id);

    if (!error) {
      addToast("Bônus diário resgatado: +RY$ 50!", "success");
      updatePlayer(player.user_id);
    }
    setClaiming(false);
  };

  // Resgate de Tarefa Diária
  const handleClaimTask = async (taskId, rewardType, rewardAmount) => {
    if (!player) return;
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes(taskId)) return;

    setClaiming(true);

    const { error } = await supabase.rpc('reivindicar_recompensa_diaria', {
      p_player_id: player.id,
      p_day_index: taskId,
      p_reward_type: rewardType,
      p_reward_amount: rewardAmount
    });

    if (!error) {
      addToast(`Recompensa resgatada: +${rewardAmount} ${rewardType.toUpperCase()}!`, "success");
      updatePlayer(player.user_id);
    } else {
      addToast('Erro ao resgatar recompensa', 'error');
    }
    setClaiming(false);
  };

  // Resgate do Baú Diário (Kuro Coins)
  const handleClaimDailyChest = async () => {
    if (!player) return;
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes('chest')) return;

    setClaiming(true);
    const rewardCoins = Math.floor(Math.random() * 4) + 2;

    const { error } = await supabase.rpc('reivindicar_recompensa_diaria', {
      p_player_id: player.id,
      p_day_index: 'chest',
      p_reward_type: 'vip_coins',
      p_reward_amount: rewardCoins
    });

    if (!error) {
      addToast(`Baú Aberto! Você encontrou 🪙 ${rewardCoins} Kuro Coins!`, "success");
      updatePlayer(player.user_id);
    } else {
      addToast('Erro ao abrir baú', 'error');
    }
    setClaiming(false);
  };

  // Abrir Baús do World Boss (Loteria Justa)
  const handleOpenBossChest = async () => {
    if (!player || !player.pending_boss_boxes || player.pending_boss_boxes <= 0) return;
    setClaiming(true);

    const boxesToOpen = player.pending_boss_boxes;
    const customRates = { common_chance: 60, rare_chance: 25, epic_chance: 10, legendary_chance: 4, unique_chance: 1 };
    
    const { data: baseItems } = await supabase.from('items').select('*');
    if (!baseItems || baseItems.length === 0) {
      addToast('Erro: Nenhum item base cadastrado no sistema.', 'error');
      setClaiming(false);
      return;
    }

    let openedItems = [];
    let gotUnique = false;
    
    for (let i = 0; i < boxesToOpen; i++) {
      const randomBaseItem = baseItems[Math.floor(Math.random() * baseItems.length)];
      const rarity = await rollRarity(player.rank || 'Genin', customRates);
      const rolledStats = await generateLootStats(rarity, player.rank || 'Genin', '');
      
      if (rarity === 'Único') gotUnique = true;

      openedItems.push({
        player_id: player.id,
        item_id: randomBaseItem.id,
        is_equipped: false,
        is_favorite: false,
        rarity: rarity,
        rolled_stats: rolledStats
      });
    }

    const { error: insertError } = await supabase.from('player_inventory').insert(openedItems);
    
    if (!insertError) {
      await supabase.from('players').update({ pending_boss_boxes: 0 }).eq('id', player.id);
      if (gotUnique) {
        addToast(`🔥 IMPRESSIONANTE! Você abriu ${boxesToOpen} baús e conseguiu um Equipamento ÚNICO!`, 'success');
      } else {
        addToast(`🎉 Você abriu ${boxesToOpen} Baús do Colapso! Os itens foram enviados para o seu inventário.`, 'success');
      }
      updatePlayer(player.user_id);
    } else {
      addToast('Erro ao abrir baús: ' + insertError.message, 'error');
    }
    
    setClaiming(false);
  };

  if (!player) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const fidelityClaimed = player.last_daily_claim === todayStr;
  const claimedList = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
  const VILLAGES = { 1: 'Folha', 2: 'Areia', 3: 'Névoa', 4: 'Nuvem', 5: 'Pedra' };
  const bgImage = player.village_id ? `/images/bg_${player.village_id}.jpg` : '/images/bg_default.jpg';

  return (
    <div style={{
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      color: 'var(--paper)'
    }}>
      <div className="page" style={{ position: 'relative', zIndex: 1, padding: '32px' }}>
        
        {/* SÉTIMA VERSÃO: HERO BANNER (SLIM) */}
        <div className="card-glass flex-between" style={{ 
          padding: '24px 32px',
          borderRadius: '16px',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(10, 15, 25, 0.65)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          {/* Esquerda: Avatar e Info Básica */}
          <div className="flex-row" style={{ gap: '24px', alignItems: 'center' }}>
            <div 
              style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--gold)', background: 'var(--ink)', position: 'relative', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
              onClick={() => setIsAvatarModalOpen(true)}
              title="Trocar Imagem"
              className="avatar-container"
            >
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="dash-avatar-glyph" style={{ fontSize: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{player.avatar || '👤'}</span>
              )}
            </div>

            <div className="flex-col" style={{ gap: '4px' }}>
              <div className="muted mono" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Bem-vindo de volta,</div>
              <h2 className="paper" style={{ fontSize: '28px', textShadow: '1px 1px 4px rgba(0,0,0,1)', margin: 0, letterSpacing: '1px' }}>{player.name}</h2>
            </div>
          </div>

          {/* Direita: Badges de Identidade */}
          <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
            <div className="badge badge-gold" style={{ fontSize: '13px', padding: '8px 16px', textTransform: 'uppercase', letterSpacing: '1px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {player.rank || 'Estudante da Academia'}
            </div>
            <div className="badge" style={{ fontSize: '13px', padding: '8px 16px', background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)', textShadow: '1px 1px 2px #000', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              Vila da {VILLAGES[player.village_id]}
            </div>
          </div>
        </div>

      {/* CALENDÁRIO DE EVENTOS */}
      {upcomingEvents.length > 0 ? (
        <div className="card-glass" style={{ marginBottom: '24px' }}>
          <div className="flex-between" style={{ marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '12px' }}>
            <h3 className="paper" style={{ fontFamily: 'Shippori Mincho', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📅</span> Próximos Eventos
            </h3>
            <span className="muted mono" style={{ fontSize: '11px' }}>Cronograma Oficial</span>
          </div>
          <div className="grid-4">
            {upcomingEvents.map((evt, idx) => {
              let color = 'var(--gold)';
              if (evt.is_world_boss) color = '#ef4444';
              else if (idx % 2 === 0) color = '#3b82f6';

              return (
                <div key={evt.id} style={{ background: 'var(--ink-raised)', padding: '16px', borderRadius: '8px', border: '1px solid var(--line-bright)', borderLeft: `3px solid ${color}` }}>
                  <div className="mono" style={{ fontSize: '10px', marginBottom: '6px', color }}>{evt.ends_at ? new Date(evt.ends_at).toLocaleString() : 'Em breve'}</div>
                  <div className="paper" style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{evt.name}</div>
                  <div className="muted" style={{ fontSize: '11px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{evt.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card-glass flex-between" style={{ padding: '12px 24px', marginBottom: '24px', alignItems: 'center' }}>
          <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '18px', opacity: 0.6 }}>📅</span>
            <div className="muted mono" style={{ fontSize: '12px' }}>Nenhum evento futuro agendado no momento.</div>
          </div>
        </div>
      )}

      {/* ALERTA DE MÚLTIPLOS EVENTOS GLOBAIS */}
      {activeEvents.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(400px, 1fr))`,
          gap: '24px',
          marginBottom: '24px'
        }}>
          {activeEvents.map(event => (
            <div key={event.id} className="card" style={{ 
              background: 'radial-gradient(circle at right, rgba(239, 68, 68, 0.15) 0%, transparent 60%), linear-gradient(90deg, rgba(20,10,10,0.95) 0%, rgba(30,15,15,0.95) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)',
              position: 'relative', 
              overflow: 'hidden', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between' 
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'linear-gradient(180deg, #ef4444, #991b1b)', animation: 'pulse 2s infinite', boxShadow: '0 0 15px #ef4444' }}></div>

              <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ flex: '1 1 200px', position: 'relative', zIndex: 2 }}>
                  <h4 className="danger mono" style={{ marginBottom: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' }}>
                    <span style={{ fontSize: '14px', filter: 'drop-shadow(0 0 4px red)' }}>🦊</span>
                    EVENTO GLOBAL
                  </h4>
                  <div className="paper" style={{ fontSize: '22px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', minHeight: '44px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                    {event.name}
                  </div>
                  <div className="muted" style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '90%' }}>
                    {event.description}
                  </div>
                </div>

                <div className="flex-col" style={{ alignItems: 'center', gap: '12px', minWidth: '150px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px dashed #ef4444' }}>
                  <span className="mono muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Tempo Restante</span>
                  <span className="mono danger" style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }}>
                    {timeRemaining[event.id] || 'Calculando...'}
                  </span>
                  <button 
                    className="btn-primary" 
                    style={{ 
                      width: '100%', padding: '10px', fontSize: '12px', marginTop: '4px',
                      background: timeRemaining[event.id] === 'Evento Encerrado' ? '#555' : '#ef4444', 
                      borderColor: timeRemaining[event.id] === 'Evento Encerrado' ? '#555' : '#ef4444' 
                    }} 
                    onClick={() => navigate('/evento')}
                    disabled={timeRemaining[event.id] === 'Evento Encerrado'}
                  >
                    {timeRemaining[event.id] === 'Evento Encerrado' ? 'Encerrado' : 'Participar'}
                  </button>
                </div>
              </div>

              {/* Barra de Vida Cinematográfica do Boss */}
              {event.boss_hp !== null && (
                <div style={{ marginTop: '28px', position: 'relative', zIndex: 2 }}>
                  <div className="flex-between" style={{ marginBottom: '10px', fontSize: '12px' }}>
                    <span className="danger mono flex-row" style={{ alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                      <span style={{ fontSize: '12px' }}>❤️</span> HP DO CHEFE
                    </span>
                    <span className="mono" style={{ color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      {event.boss_hp.toLocaleString()} <span className="muted">/ {event.boss_max_hp.toLocaleString()}</span>
                    </span>
                  </div>
                  <div style={{ 
                    position: 'relative', height: '14px', borderRadius: '8px', 
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(239, 68, 68, 0.2)', 
                    overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)' 
                  }}>
                    <div style={{
                      width: `${Math.max(0, Math.min(100, (event.boss_hp / event.boss_max_hp) * 100))}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #7f1d1d, #ef4444, #f87171)',
                      boxShadow: '0 0 10px #ef4444, inset 0 0 5px rgba(255,255,255,0.4)',
                      transition: 'width 0.5s ease-out',
                      borderRadius: '8px'
                    }}></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3 Cards de Resumo */}
      <div className="grid-3">
        <div className="dashboard-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/imgi_112_1.png" style={{ width: '16px' }} alt="Combates" /> Combates
          </h4>
          <div className="stats-list">
            <div className="stat-win"><span>Vitórias Dojo:</span><span>{player.wins_dojo || 0}</span></div>
            <div className="stat-win"><span>Vitórias PVP:</span><span>{player.wins_pvp || 0}</span></div>
            <div className="stat-loss"><span>Derrotas Dojo:</span><span>{player.losses_dojo || 0}</span></div>
            <div className="stat-loss"><span>Derrotas PVP:</span><span>{player.losses_pvp || 0}</span></div>
            <div className="stat-neutral"><span>Fugas:</span><span>{player.fugas || 0}</span></div>
          </div>
        </div>

        <div className="dashboard-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/imgi_13_passe.png" style={{ width: '16px' }} alt="Missões" /> Missões
          </h4>
          <div className="stats-list">
            <div className="stat-win"><span>Rank S:</span><span>{player.missions_s || 0}</span></div>
            <div className="stat-win"><span>Rank A:</span><span>{player.missions_a || 0}</span></div>
            <div className="stat-neutral"><span>Rank B:</span><span>{player.missions_b || 0}</span></div>
            <div className="stat-neutral"><span>Rank C:</span><span>{player.missions_c || 0}</span></div>
            <div className="stat-neutral"><span>Rank D:</span><span>{player.missions_d || 0}</span></div>
            <div className="stat-highlight" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                <img src="/images/imgi_14_rotina.png" style={{ width: '12px' }} alt="Tarefas" /> Tarefas:
              </span>
              <span>{player.tasks_completed || 0}/10</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/images/imgi_32_star.png" style={{ width: '16px' }} alt="Extras" /> Extras
          </h4>
          <div className="stats-list">
            <div className="stat-gold">
              <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                <img src="/images/imgi_20_ryous.png" style={{ width: '12px' }} alt="Ryous" /> Ryous:
              </span>
              <span>RY$ {player.ryous}</span>
            </div>
            <div className="stat-highlight">
              <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                <img src="/images/imgi_126_star.png" style={{ width: '12px' }} alt="Pts" /> Pts. Atrib.:
              </span>
              <span>{player.pontos_atributos}</span>
            </div>
            <div className="stat-neutral"><span>Bingo Book:</span><span>0</span></div>
            <div className="stat-neutral"><span>Torneios:</span><span>0</span></div>
            <div className="stat-neutral"><span>Arenas:</span><span>0</span></div>
          </div>
        </div>
      </div>

      {player.pending_boss_boxes > 0 && (
        <div className="card-glass" style={{ marginBottom: '24px', border: '1px solid var(--seal-bright)', background: 'rgba(255,107,107,0.05)' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 className="gold" style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🦊 Recompensa do Evento!
              </h3>
              <p className="muted" style={{ fontSize: '12px' }}>
                Você tem <strong className="danger">{player.pending_boss_boxes} Baús do Colapso</strong> prontos para serem abertos. Podem conter itens Comuns, Raros, Épicos, Lendários e até mesmo os míticos itens <strong>Únicos</strong>!
              </p>
            </div>
            <button className="btn-primary" onClick={handleOpenBossChest} disabled={claiming} style={{ minWidth: '150px' }}>
              {claiming ? 'Abrindo...' : 'Abrir Baús agora!'}
            </button>
          </div>
        </div>
      )}

      {/* ── PAINEL DE OBJETIVOS DIÁRIOS ── */}
      <div className="grid-2" style={{ marginTop: '24px' }}>
        {/* 3. Coluna Principal: Atividades Diárias */}
        <div className="flex-col" style={{ flex: '2 1 400px', gap: '24px' }}>

          {/* AVISO DE DEBUFF GLOBAL */}
          {activeEvents.filter(e => e.is_world_boss).map(boss => {
            const debuffs = getGlobalDebuffs(boss);
            if (debuffs.currentPhase === 0) return null;
            return (
              <div key={boss.id} className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                <h4 className="card-title danger" style={{ marginBottom: '8px' }}>⚠️ Alerta Global: {boss.name}</h4>
                <div className="muted" style={{ fontSize: '13px', marginBottom: '12px' }}>A fúria deste evento está desestabilizando a economia e o chakra de todos os ninjas.</div>
                <div className="grid-2" style={{ gap: '8px' }}>
                  <div className="badge badge-muted">Fase Atual: {debuffs.currentPhase}/4</div>
                  {debuffs.currentPhase >= 1 && <div className="badge badge-danger">Stamina +30% (Combate)</div>}
                  {debuffs.currentPhase >= 2 && <div className="badge badge-danger">Precisão -15% (Combate)</div>}
                  {debuffs.currentPhase >= 3 && <div className="badge badge-danger">Custo do Hospital Dobrado</div>}
                  {debuffs.currentPhase >= 4 && <div className="badge badge-danger">Ryous ganhos -50%</div>}
                </div>
              </div>
            );
          })}

          {/* Fidelidade Diária */}
          <div className="card" style={{ border: fidelityClaimed ? '1px solid var(--line)' : '1px solid var(--seal-bright)', background: fidelityClaimed ? 'var(--ink)' : 'var(--seal-glow)' }}>
            <h4 className="card-title flex-row" style={{ marginBottom: '8px', alignItems: 'center', gap: '8px' }}>
              <img src="/images/imgi_16_fidelidade.png" style={{ width: '18px' }} alt="Fidelidade" /> Bônus de Fidelidade
            </h4>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
              Entre todos os dias no Kurokage e colete sua recompensa diária de sobrevivência.
            </p>
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <span className="gold mono flex-row" style={{ alignItems: 'center', gap: '6px' }}>
                <img src="/images/imgi_20_ryous.png" style={{ width: '14px' }} alt="Ryous" /> RY$ 50
              </span>
              <button
                className={fidelityClaimed ? "btn-ghost" : "btn-primary"}
                onClick={handleDailyFidelity}
                disabled={fidelityClaimed || claiming}
                style={{ padding: '8px 16px', fontSize: '12px' }}
              >
                {fidelityClaimed ? 'Resgatado Hoje' : 'Resgatar Bônus'}
              </button>
            </div>
          </div>

          {/* Tarefas Diárias */}
          <div className="card">
            <h4 className="card-title flex-row" style={{ marginBottom: '16px', alignItems: 'center', gap: '8px' }}>
              <img src="/images/imgi_14_rotina.png" style={{ width: '18px' }} alt="Tarefas" /> Objetivos Diários
            </h4>
            <div className="flex-col" style={{ gap: '12px' }}>

              {/* Tarefa 1 */}
              <DailyTaskItem 
                taskId="t1" 
                title="Derrote 3 inimigos" 
                titleIcon="/images/imgi_112_1.png" 
                rewardText="RY$ 20" 
                progressValue={player.daily_npcs_defeated || 0} 
                progressMax={3} 
                progressColor="green" 
                claimedList={claimedList} 
                handleClaimTask={handleClaimTask} 
                claiming={claiming} 
              />

              {/* Tarefa 2 */}
              <DailyTaskItem 
                taskId="t2" 
                title="Gaste 100 de Chakra" 
                titleIcon="/images/imgi_9_chakra.png" 
                rewardText="RY$ 20" 
                progressValue={player.daily_chakra_spent || 0} 
                progressMax={100} 
                progressColor="blue" 
                claimedList={claimedList} 
                handleClaimTask={handleClaimTask} 
                claiming={claiming} 
              />

              {/* Tarefa 3 */}
              <DailyTaskItem 
                taskId="t3" 
                title="Treine 1 vez" 
                titleIcon="/images/imgi_10_stamina.png" 
                rewardText="RY$ 20" 
                progressValue={player.daily_trainings || 0} 
                progressMax={1} 
                progressColor="red" 
                claimedList={claimedList} 
                handleClaimTask={handleClaimTask} 
                claiming={claiming} 
              />

              {/* Baú Diário de Esforço */}
              <div style={{ background: 'var(--ink-card)', padding: '16px', borderRadius: '6px', border: '1px solid var(--gold)', marginTop: '8px', textAlign: 'center' }}>
                <h4 className="gold mono" style={{ marginBottom: '8px' }}>📦 Baú de Esforço Diário</h4>
                <p className="muted" style={{ fontSize: '12px', marginBottom: '12px' }}>Complete as 3 tarefas acima para desbloquear Kuro Coins.</p>
                {claimedList.includes('chest') ? (
                  <span className="success mono" style={{ fontSize: '12px' }}>✓ BAÚ ABERTO HOJE</span>
                ) : claimedList.includes('t1') && claimedList.includes('t2') && claimedList.includes('t3') ? (
                  <button className="btn-primary" onClick={handleClaimDailyChest} disabled={claiming} style={{ width: '100%', background: 'linear-gradient(to right, #b45309, #d97706)', borderColor: '#d97706' }}>
                    Abrir Baú (🪙 2 a 5 Coins)
                  </button>
                ) : (
                  <span className="danger mono" style={{ fontSize: '11px' }}>🔒 COMPLETE AS TAREFAS PRIMEIRO</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        player={player}
        updatePlayer={updatePlayer}
      />
    </div>
    </div>
  );
}