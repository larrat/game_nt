import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateXPForLevel, calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateAtkNinGen, getGlobalDebuffs } from '../utils/engine';
import { supabase } from '../supabaseClient';
import { fetchActiveGlobalEvents } from '../utils/eventUtils';
import { useToast } from '../context/ToastContext';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import AvatarModal from '../components/AvatarModal';
import PageHeader from '../components/PageHeader';
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
    <div className="bg-ink-raised p-3 rounded-sm border-line-solid">
      <div className="flex-between mb-2">
        <span className="paper flex-row items-center gap-xs text-sm">
          <img src={titleIcon} className="w-3" alt="Icon" /> {title}
        </span>
        <span className="mono gold flex-row items-center gap-xs text-xs">
          <img src="/images/imgi_20_ryous.png" className="w-3" alt="Ryous" /> {rewardText}
        </span>
      </div>
      <div className="flex-between items-center gap-sm">
        <div className="progress-track flex-1 h-2">
          <div className={`progress-fill ${progressColor}`} style={{ width: `${progressPercent}%` }} />
        </div>
        {isClaimed ? (
          <span className="success mono text-xs">✓ FEITO</span>
        ) : isDone ? (
          <button className="btn-ghost p-1 text-xs text-seal-bright border-seal-bright" onClick={() => handleClaimTask(taskId, 'ryous', 20)} disabled={claiming}>RESGATAR</button>
        ) : (
          <span className="muted mono text-xs">{progressValue}/{progressMax}</span>
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
          updatePlayer(player.id);
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
      updatePlayer(player.id);
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
      updatePlayer(player.id);
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
      updatePlayer(player.id);
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
      updatePlayer(player.id);
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
    <div className="bg-cover bg-center min-h-screen text-paper bg-fixed" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="page relative z-10 p-8">
        
        <PageHeader 
          eyebrow="Painel Ninja"
          title="Dashboard"
          subtitle="Acompanhe seu progresso diário e eventos do mundo."
        />

        {/* SÉTIMA VERSÃO: HERO BANNER (SLIM) */}
        <div className="card-glass flex-between p-6 rounded-lg items-center flex-wrap gap-lg mb-8 border-line-solid shadow-xl bg-ink-transparent">
          {/* Esquerda: Avatar e Info Básica */}
          <div className="flex-row items-center gap-lg">
            <div 
              className="w-20 h-20 rounded-full overflow-hidden border-gold border-2 bg-ink relative cursor-pointer shadow-md avatar-container flex-col items-center justify-center"
              onClick={() => setIsAvatarModalOpen(true)}
              title="Trocar Imagem"
            >
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="dash-avatar-glyph text-4xl flex-col items-center justify-center w-full h-full">{player.avatar || '👤'}</span>
              )}
            </div>

            <div className="flex-col gap-xs">
              <div className="muted mono text-xs tracking-wide uppercase">Bem-vindo de volta,</div>
              <h2 className="paper text-3xl m-0 tracking-wide text-shadow">{player.name}</h2>
            </div>
          </div>

          {/* Direita: Badges de Identidade */}
          <div className="flex-row items-center gap-md">
            <div className="badge badge-gold uppercase tracking-wide px-4 py-2 text-sm shadow-md">
              {player.rank || 'Estudante da Academia'}
            </div>
            <div className="badge uppercase px-4 py-2 text-sm shadow-md border-line-solid bg-ink-transparent text-shadow">
              Vila da {VILLAGES[player.village_id]}
            </div>
          </div>
        </div>

      {/* CALENDÁRIO DE EVENTOS */}
      {/* CALENDÁRIO DE EVENTOS */}
      {upcomingEvents.length > 0 ? (
        <div className="card-glass mb-6">
          <div className="flex-between mb-4 border-line-solid pb-3 border-b">
            <h3 className="paper flex-row items-center gap-xs text-lg font-shippori">
              <span className="text-base">📅</span> Próximos Eventos
            </h3>
            <span className="muted mono text-xs">Cronograma Oficial</span>
          </div>
          <div className="grid-4">
            {upcomingEvents.map((evt, idx) => {
              let color = 'var(--gold)';
              if (evt.is_world_boss) color = '#ef4444';
              else if (idx % 2 === 0) color = '#3b82f6';

              return (
                <div key={evt.id} className="bg-ink-raised p-4 rounded-sm border-line-solid border-line-bright border-l-3" style={{ borderLeftColor: color }}>
                  <div className="mono text-xs mb-1" style={{ color }}>{evt.ends_at ? new Date(evt.ends_at).toLocaleString() : 'Em breve'}</div>
                  <div className="paper font-bold text-sm mb-1">{evt.name}</div>
                  <div className="muted text-xs line-clamp-2">{evt.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card-glass flex-between p-3 px-6 mb-6 items-center">
          <div className="flex-row items-center gap-sm">
            <span className="text-lg opacity-60">📅</span>
            <div className="muted mono text-xs">Nenhum evento futuro agendado no momento.</div>
          </div>
        </div>
      )}

      {/* ALERTA DE MÚLTIPLOS EVENTOS GLOBAIS */}
      {activeEvents.length > 0 && (
        <div className="grid-responsive gap-lg mb-6">
          {activeEvents.map(event => (
            <div key={event.id} className="card relative overflow-hidden p-6 flex-col justify-between border-line-solid border-danger bg-event-card shadow-event">
              <div className="absolute top-0 left-0 w-1 h-full animate-pulse shadow-pulse bg-gradient-to-b from-red-500 to-red-800"></div>

              <div className="flex-between items-start flex-wrap gap-lg">
                <div className="flex-1 relative z-10 min-w-[200px]">
                  <h4 className="danger mono mb-2 text-xs flex-row items-center gap-sm tracking-wide">
                    <span className="text-sm drop-shadow-red">🦊</span>
                    EVENTO GLOBAL
                  </h4>
                  <div className="paper text-xl font-bold uppercase tracking-wide mb-2 text-shadow min-h-[44px]">
                    {event.name}
                  </div>
                  <div className="muted text-sm leading-relaxed max-w-[90%]">
                    {event.description}
                  </div>
                </div>

                <div className="flex-col items-center gap-sm p-4 rounded-sm border-dashed border-danger bg-black-alpha-30 min-w-[150px]">
                  <span className="mono muted text-xs uppercase">Tempo Restante</span>
                  <span className="mono danger text-xl font-bold text-shadow-red">
                    {timeRemaining[event.id] || 'Calculando...'}
                  </span>
                  <button 
                    className={`btn-primary w-full p-2 text-xs mt-1 ${timeRemaining[event.id] === 'Evento Encerrado' ? 'bg-[#555] border-[#555]' : 'bg-red-500 border-red-500'}`}
                    onClick={() => navigate('/evento')}
                    disabled={timeRemaining[event.id] === 'Evento Encerrado'}
                  >
                    {timeRemaining[event.id] === 'Evento Encerrado' ? 'Encerrado' : 'Participar'}
                  </button>
                </div>
              </div>

              {/* Barra de Vida Cinematográfica do Boss */}
              {event.boss_hp !== null && (
                <div className="mt-7 relative z-10">
                  <div className="flex-between mb-2 text-xs">
                    <span className="danger mono flex-row items-center gap-sm font-bold">
                      <span className="text-xs">❤️</span> HP DO CHEFE
                    </span>
                    <span className="mono text-white text-shadow">
                      {event.boss_hp.toLocaleString()} <span className="muted">/ {event.boss_max_hp.toLocaleString()}</span>
                    </span>
                  </div>
                  <div className="relative h-3 rounded-sm bg-black-alpha-60 border-line-solid border-danger-alpha overflow-hidden shadow-inner-dark">
                    <div className="h-full rounded-sm transition-all duration-500 ease-out shadow-bar-glow bg-gradient-to-r from-red-900 via-red-500 to-red-400" style={{
                      width: `${Math.max(0, Math.min(100, (event.boss_hp / event.boss_max_hp) * 100))}%`
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
          <h4 className="flex-row gap-xs items-center">
            <img src="/images/imgi_112_1.png" className="w-4" alt="Combates" /> Combates
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
          <h4 className="flex-row gap-xs items-center">
            <img src="/images/imgi_13_passe.png" className="w-4" alt="Missões" /> Missões
          </h4>
          <div className="stats-list">
            <div className="stat-win"><span>Rank S:</span><span>{player.missions_s || 0}</span></div>
            <div className="stat-win"><span>Rank A:</span><span>{player.missions_a || 0}</span></div>
            <div className="stat-neutral"><span>Rank B:</span><span>{player.missions_b || 0}</span></div>
            <div className="stat-neutral"><span>Rank C:</span><span>{player.missions_c || 0}</span></div>
            <div className="stat-neutral"><span>Rank D:</span><span>{player.missions_d || 0}</span></div>
            <div className="stat-highlight mt-2 pt-2 border-t border-white/5">
              <span className="flex-row items-center gap-xs">
                <img src="/images/imgi_14_rotina.png" className="w-3" alt="Tarefas" /> Tarefas:
              </span>
              <span>{player.tasks_completed || 0}/10</span>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <h4 className="flex-row gap-xs items-center">
            <img src="/images/imgi_32_star.png" className="w-4" alt="Extras" /> Extras
          </h4>
          <div className="stats-list">
            <div className="stat-gold">
              <span className="flex-row items-center gap-xs">
                <img src="/images/imgi_20_ryous.png" className="w-3" alt="Ryous" /> Ryous:
              </span>
              <span>RY$ {player.ryous}</span>
            </div>
            <div className="stat-highlight">
              <span className="flex-row items-center gap-xs">
                <img src="/images/imgi_126_star.png" className="w-3" alt="Pts" /> Pts. Atrib.:
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
        <div className="card-glass mb-6 border-line-solid border-seal-bright bg-danger-alpha-5">
          <div className="flex-between flex-wrap gap-md">
            <div>
              <h3 className="gold text-lg mb-2 flex-row items-center gap-xs">
                🦊 Recompensa do Evento!
              </h3>
              <p className="muted text-xs">
                Você tem <strong className="danger">{player.pending_boss_boxes} Baús do Colapso</strong> prontos para serem abertos. Podem conter itens Comuns, Raros, Épicos, Lendários e até mesmo os míticos itens <strong>Únicos</strong>!
              </p>
            </div>
            <button className="btn-primary min-w-[150px]" onClick={handleOpenBossChest} disabled={claiming}>
              {claiming ? 'Abrindo...' : 'Abrir Baús agora!'}
            </button>
          </div>
        </div>
      )}

      {/* ── PAINEL DE OBJETIVOS DIÁRIOS ── */}
      <div className="grid-2 mt-6">
        {/* 3. Coluna Principal: Atividades Diárias */}
        <div className="flex-col gap-lg flex-[2_1_400px]">

          {/* AVISO DE DEBUFF GLOBAL */}
          {activeEvents.filter(e => e.is_world_boss).map(boss => {
            const debuffs = getGlobalDebuffs(boss);
            if (debuffs.currentPhase === 0) return null;
            return (
              <div key={boss.id} className="card border-l-4 border-danger">
                <h4 className="card-title danger mb-2">⚠️ Alerta Global: {boss.name}</h4>
                <div className="muted text-sm mb-3">A fúria deste evento está desestabilizando a economia e o chakra de todos os ninjas.</div>
                <div className="grid-2 gap-sm">
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
          <div className={`card ${fidelityClaimed ? 'border-line bg-ink' : 'border-seal-bright bg-seal-glow'}`}>
            <h4 className="card-title flex-row items-center gap-xs mb-2">
              <img src="/images/imgi_16_fidelidade.png" className="w-4" alt="Fidelidade" /> Bônus de Fidelidade
            </h4>
            <p className="muted text-sm mb-4 leading-relaxed">
              Entre todos os dias no Kurokage e colete sua recompensa diária de sobrevivência.
            </p>
            <div className="flex-between items-center">
              <span className="gold mono flex-row items-center gap-xs">
                <img src="/images/imgi_20_ryous.png" className="w-3" alt="Ryous" /> RY$ 50
              </span>
              <button
                className={`p-2 text-xs ${fidelityClaimed ? "btn-ghost" : "btn-primary"}`}
                onClick={handleDailyFidelity}
                disabled={fidelityClaimed || claiming}
              >
                {fidelityClaimed ? 'Resgatado Hoje' : 'Resgatar Bônus'}
              </button>
            </div>
          </div>

          {/* Tarefas Diárias */}
          <div className="card">
            <h4 className="card-title flex-row items-center gap-xs mb-4">
              <img src="/images/imgi_14_rotina.png" className="w-4" alt="Tarefas" /> Objetivos Diários
            </h4>
            <div className="flex-col gap-md">

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
              <div className="bg-ink-card p-4 rounded-sm border-line-solid border-gold mt-2 text-center">
                <h4 className="gold mono mb-2">📦 Baú de Esforço Diário</h4>
                <p className="muted text-xs mb-3">Complete as 3 tarefas acima para desbloquear Kuro Coins.</p>
                {claimedList.includes('chest') ? (
                  <span className="success mono text-xs">✓ BAÚ ABERTO HOJE</span>
                ) : claimedList.includes('t1') && claimedList.includes('t2') && claimedList.includes('t3') ? (
                  <button className="btn-primary w-full bg-gradient-to-r from-amber-700 to-amber-600 border-amber-600" onClick={handleClaimDailyChest} disabled={claiming}>
                    Abrir Baú (🪙 2 a 5 Coins)
                  </button>
                ) : (
                  <span className="danger mono text-xs">🔒 COMPLETE AS TAREFAS PRIMEIRO</span>
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