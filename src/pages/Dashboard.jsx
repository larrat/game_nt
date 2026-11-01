import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalDebuffs } from '../utils/engine';
import { supabase } from '../supabaseClient';
import { fetchActiveGlobalEvents } from '../utils/eventUtils';
import { useToast } from '../context/ToastContext';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import GamePanel from '../components/ui/GamePanel';
import GameEmptyState from '../components/ui/GameEmptyState';
import '../styles/main.css';
import '../styles/dashboard-operations-v5.css';

const DailyTaskItem = ({
  taskId, title, titleIcon, rewardText,
  progressValue, progressMax, progressColor,
  claimedList, handleClaimTask, claiming
}) => {
  const progressCurrent = Math.min(progressMax, Math.max(0, Number(progressValue) || 0));
  const isDone = progressValue >= progressMax;
  const isClaimed = claimedList.includes(taskId);

  return (
    <article className={"kuro-quest " + (isClaimed ? "is-claimed" : isDone ? "is-complete" : "")}>
      <div className="kuro-quest__icon"><img src={titleIcon} alt="" /></div>
      <div className="kuro-quest__body">
        <div className="kuro-quest__topline"><span className="kuro-quest__title">{title}</span><span className="kuro-quest__reward">{rewardText}</span></div>
        <div className="kuro-quest__progress">
          <div className="kuro-quest__track"><progress className={"kuro-quest__meter " + progressColor} value={progressCurrent} max={progressMax} aria-label={title + " — progresso"} /></div>
          <span className="kuro-quest__count">{progressValue}/{progressMax}</span>
        </div>
      </div>
      <div className="kuro-quest__action">
        {isClaimed ? <span className="kuro-state-tag is-done">Resgatado</span> : isDone ? (
          <button className="kuro-button kuro-button--small" onClick={() => handleClaimTask(taskId)} disabled={claiming}>Resgatar</button>
        ) : <span className="kuro-state-tag">Em andamento</span>}
      </div>
    </article>
  );
};

export default function Dashboard({ player, updatePlayer }) {
  const [claiming, setClaiming] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({});
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      // 2. Eventos
      const { data: eventsData } = await supabase.from('world_events').select('*').order('start_time', { ascending: true });
      if (eventsData) setUpcomingEvents(eventsData);
    }
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
        const { data, error } = await supabase.rpc('reset_daily_progress', {
          p_player_id: player.id
        });

        if (!error && data?.success) {
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
    const { data, error } = await supabase.rpc('reivindicar_bonus_diario', {
      p_player_id: player.id
    });

    if (!error && data?.success) {
      addToast(`Bônus diário resgatado: +RY$ ${data.reward_amount}!`, "success");
      await updatePlayer(player.id);
    } else {
      addToast(error?.message || data?.error || 'Bônus diário indisponível.', 'error');
    }
    setClaiming(false);
  };

  // Resgate de Tarefa Diária
  const handleClaimTask = async (taskId) => {
    if (!player) return;
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes(taskId)) return;

    setClaiming(true);
    const { data, error } = await supabase.rpc('reivindicar_recompensa_diaria', {
      p_player_id: player.id,
      p_task_key: taskId
    });

    if (!error && data?.success) {
      const rewardLabel = data.reward_type === 'vip_coins' ? 'KURO COINS' : 'RYOUS';
      addToast(`Recompensa resgatada: +${data.reward_amount} ${rewardLabel}!`, "success");
      await updatePlayer(player.id);
    } else {
      addToast(error?.message || data?.error || 'Erro ao resgatar recompensa.', 'error');
    }
    setClaiming(false);
  };

  // Resgate do Baú Diário (Kuro Coins)
  const handleClaimDailyChest = async () => {
    if (!player) return;
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes('chest')) return;

    setClaiming(true);
    const { data, error } = await supabase.rpc('reivindicar_recompensa_diaria', {
      p_player_id: player.id,
      p_task_key: 'chest'
    });

    if (!error && data?.success) {
      addToast(`Baú Aberto! Você encontrou 🪙 ${data.reward_amount} Kuro Coins!`, "success");
      await updatePlayer(player.id);
    } else {
      addToast(error?.message || data?.error || 'Erro ao abrir baú.', 'error');
    }
    setClaiming(false);
  };

  // Abrir Baús do World Boss (Loteria Justa)
  const handleOpenBossChest = async () => {
    addToast('Os baús antigos não possuem estado de resgate no banco atual. Use as recompensas de incursão do chefe mundial.', 'info');
  };

  if (!player) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const fidelityClaimed = player.last_daily_claim === todayStr;
  const claimedList = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
  const dailyTasks = [
    { key: "t1", complete: (player.daily_npcs_defeated || 0) >= 3 },
    { key: "t2", complete: (player.daily_chakra_spent || 0) >= 100 },
    { key: "t3", complete: (player.daily_trainings || 0) >= 1 }
  ];
  const dailyCompleted = dailyTasks.filter(task => task.complete).length;
  const claimedTasks = dailyTasks.filter(task => claimedList.includes(task.key)).length;

  return (
    <div className="kuro-dashboard kuro-dashboard-v2">
      <header className="kuro-dashboard__header">
        <div>
          <div className="kuro-eyebrow"><span className="kuro-eyebrow__line" /> CENTRAL SHINOBI <span className="kuro-eyebrow__season">TEMPORADA I</span></div>
          <h1>Painel do Ninja</h1>
          <p>Seu caminho, suas escolhas, sua lenda. Veja o que está acontecendo no mundo shinobi.</p>
        </div>
        <GameAction onClick={() => navigate("/historia")}>Continuar jornada <span aria-hidden="true">↗</span></GameAction>
      </header>

      <section className="kuro-dashboard-operations" aria-label="Prioridades de hoje">
        <div className="kuro-dashboard-operations__main">
          <span className="kuro-section__eyebrow">CENTRO DE OPERAÇÕES</span>
          <h2>Suas prioridades de hoje</h2>
          <p>Missões, recompensas e eventos estão aqui. Para consultar seu personagem e atributos, abra a ficha do ninja.</p>
          <GameAction tone="quiet" onClick={() => navigate("/status")}>
            <SidebarIcon name="user" size={17} /> Ver ficha do ninja <SidebarIcon name="arrowRight" size={15} />
          </GameAction>
        </div>
        <div className="kuro-dashboard-operations__metrics" aria-label="Atividades e oportunidades">
          <div><span>Objetivos concluídos</span><strong>{dailyCompleted}/3</strong><small>Rotina diária</small></div>
          <div><span>Prêmios resgatados</span><strong>{claimedTasks}/3</strong><small>Da rotina de hoje</small></div>
          <div><span>Eventos ativos</span><strong>{activeEvents.length}</strong><small>Oportunidades do mundo</small></div>
          <div><span>Pontos de atributo</span><strong>{(player.pontos_atributos || 0).toLocaleString('pt-BR')}</strong><small>Disponíveis para treinar</small></div>
        </div>
      </section>

      <section className="kuro-section">
        <div className="kuro-section__heading"><div><span className="kuro-section__eyebrow">ACESSO RÁPIDO</span><h2>Escolha seu próximo passo</h2></div><span className="kuro-section__hint">Sua próxima evolução começa aqui</span></div>
        <div className="kuro-shortcuts">
          <button className="kuro-shortcut" onClick={() => navigate("/dojo")}><span className="kuro-shortcut__icon"><SidebarIcon name="swords" size={24} /></span><span><strong>Entrar no Dojo</strong><small>Teste sua força</small></span><b>↗</b></button>
          <button className="kuro-shortcut" onClick={() => navigate("/treino")}><span className="kuro-shortcut__icon"><SidebarIcon name="dumbbell" size={24} /></span><span><strong>Treinar atributos</strong><small>Fortaleça seu ninja</small></span><b>↗</b></button>
          <button className="kuro-shortcut" onClick={() => navigate("/equipamentos")}><span className="kuro-shortcut__icon"><SidebarIcon name="shield" size={24} /></span><span><strong>Ver equipamentos</strong><small>Prepare seu arsenal</small></span><b>↗</b></button>
          <button className="kuro-shortcut" onClick={() => navigate("/ranking")}><span className="kuro-shortcut__icon"><SidebarIcon name="trophy" size={24} /></span><span><strong>Ver ranking</strong><small>Compare seu poder</small></span><b>↗</b></button>
          <button className="kuro-shortcut" onClick={() => navigate("/adversarios")}><span className="kuro-shortcut__icon"><SidebarIcon name="users" size={24} /></span><span><strong>Arquivo de adversários</strong><small>Conheça ninjas, NPCs e rivais</small></span><b>↗</b></button>
        </div>
      </section>

      <section className="kuro-section">
        <div className="kuro-section__heading"><div><span className="kuro-section__eyebrow">MUNDO SHINOBI</span><h2>Eventos e alertas</h2></div><button className="kuro-text-button" onClick={() => navigate("/evento")}>Central de eventos <span aria-hidden="true">→</span></button></div>
        {activeEvents.length > 0 ? (
          <div className="kuro-events">
            {activeEvents.map(event => {
              const debuffs = event.is_world_boss ? getGlobalDebuffs(event) : null;
              const bossHpPercent = event.boss_max_hp > 0 ? Math.max(0, Math.min(100, (event.boss_hp / event.boss_max_hp) * 100)) : 0;
              return (
                <article key={event.id} className={"kuro-event-card " + (event.is_world_boss ? "is-boss" : "")}>
                  <div className="kuro-event-card__mark">{event.is_world_boss ? "☠" : "✦"}</div>
                  <div className="kuro-event-card__content">
                    <span className="kuro-section__eyebrow">{event.is_world_boss ? "CHEFE MUNDIAL" : "EVENTO GLOBAL"} · ATIVO</span>
                    <h3>{event.name}</h3><p>{event.description || "Um evento está movimentando o mundo shinobi."}</p>
                    {event.is_world_boss && event.boss_hp !== null && event.boss_hp !== undefined && event.boss_max_hp > 0 && (
                      <div className="kuro-boss-meter"><div className="kuro-boss-meter__label"><span>VITALIDADE DO CHEFE</span><strong>{event.boss_hp.toLocaleString()} <i>/ {event.boss_max_hp.toLocaleString()}</i></strong></div><div className="kuro-meter"><div style={{ width: bossHpPercent + "%" }} /></div></div>
                    )}
                    {debuffs && debuffs.currentPhase > 0 && <span className="kuro-chip kuro-chip--danger">Fase de ameaça {debuffs.currentPhase}/4</span>}
                  </div>
                  <div className="kuro-event-card__action"><span className="kuro-live"><i /> AO VIVO</span><strong>{timeRemaining[event.id] || "Atualizando…"}</strong><button className="kuro-button kuro-button--primary" onClick={() => navigate("/evento")} disabled={timeRemaining[event.id] === "Evento Encerrado"}>{timeRemaining[event.id] === "Evento Encerrado" ? "Encerrado" : "Participar"}</button></div>
                </article>
              );
            })}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="kuro-event-grid">{upcomingEvents.slice(0, 3).map((event, index) => (
            <article key={event.id} className="kuro-upcoming-event"><span className="kuro-upcoming-event__number">0{index + 1}</span><span className="kuro-section__eyebrow">{event.ends_at ? new Date(event.ends_at).toLocaleDateString() : "EM BREVE"}</span><h3>{event.name}</h3><p>{event.description || "Prepare-se para o próximo desafio."}</p></article>
          ))}</div>
        ) : <GameEmptyState title="Sem eventos ativos neste momento" description="Continue treinando. Novos desafios aparecerão aqui quando forem publicados." />}
      </section>

      <div className="kuro-dashboard__columns">
        <GamePanel as="section" className="kuro-panel">
          <div className="kuro-section__heading"><div><span className="kuro-section__eyebrow">PROGRESSO DIÁRIO</span><h2>Rotina do shinobi</h2></div><span className="kuro-progress-pill">{dailyCompleted}/3 concluídas</span></div>
          <div className="kuro-daily-summary">
            <div className="kuro-daily-summary__ring"><strong>{Math.round(dailyCompleted / 3 * 100)}<small>%</small></strong></div>
            <div><strong>Treino de hoje</strong><p>Complete objetivos para receber ryous e liberar o baú diário.</p><div className="kuro-meter"><div style={{ width: (dailyCompleted / 3 * 100) + "%" }} /></div><small>{claimedTasks}/3 recompensas resgatadas</small></div>
          </div>
          <div className="kuro-quest-list">
            <DailyTaskItem taskId="t1" title="Derrote 3 inimigos" titleIcon="/images/imgi_112_1.png" rewardText="RY$ 20" progressValue={player.daily_npcs_defeated || 0} progressMax={3} progressColor="green" claimedList={claimedList} handleClaimTask={handleClaimTask} claiming={claiming} />
            <DailyTaskItem taskId="t2" title="Gaste 100 de Chakra" titleIcon="/images/imgi_9_chakra.png" rewardText="RY$ 20" progressValue={player.daily_chakra_spent || 0} progressMax={100} progressColor="blue" claimedList={claimedList} handleClaimTask={handleClaimTask} claiming={claiming} />
            <DailyTaskItem taskId="t3" title="Treine 1 vez" titleIcon="/images/imgi_10_stamina.png" rewardText="RY$ 20" progressValue={player.daily_trainings || 0} progressMax={1} progressColor="red" claimedList={claimedList} handleClaimTask={handleClaimTask} claiming={claiming} />
          </div>
          <div className="kuro-daily-chest">
            <div className="kuro-daily-chest__icon">▣</div><div className="kuro-daily-chest__copy"><strong>Baú de esforço diário</strong><p>Complete as três tarefas e receba Kuro Coins.</p></div>
            {claimedList.includes("chest") ? <span className="kuro-state-tag is-done">Aberto hoje</span> : claimedList.includes("t1") && claimedList.includes("t2") && claimedList.includes("t3") ? <button className="kuro-button kuro-button--gold" onClick={handleClaimDailyChest} disabled={claiming}>{claiming ? "Abrindo…" : "Abrir baú"}</button> : <span className="kuro-state-tag">Bloqueado</span>}
          </div>
        </GamePanel>

        <aside className="kuro-side-column">
          <section className={"kuro-panel kuro-fidelity " + (fidelityClaimed ? "is-claimed" : "")}>
            <div className="kuro-fidelity__top"><span className="kuro-section__eyebrow">RECOMPENSA DE PRESENÇA</span><span className="kuro-fidelity__seal">日</span></div>
            <h2>Bônus diário</h2><p>Entre no Kurokage todos os dias para manter sua jornada em movimento.</p>
            <div className="kuro-fidelity__reward"><img src="/images/imgi_20_ryous.png" alt="" /><strong>RY$ 50</strong><span>por dia</span></div>
            <button className={"kuro-button " + (fidelityClaimed ? "kuro-button--muted" : "kuro-button--primary")} onClick={handleDailyFidelity} disabled={fidelityClaimed || claiming}>{fidelityClaimed ? "Resgatado hoje" : claiming ? "Processando…" : "Resgatar bônus"}</button>
          </section>

          <section className="kuro-panel kuro-records">
            <div className="kuro-section__heading"><div><span className="kuro-section__eyebrow">HISTÓRICO</span><h2>Seu legado</h2></div></div>
            <div className="kuro-record-row"><span>Vitórias no dojo</span><strong>{(player.wins_dojo || 0).toLocaleString()}</strong></div>
            <div className="kuro-record-row"><span>Vitórias PvP</span><strong>{(player.wins_pvp || 0).toLocaleString()}</strong></div>
            <div className="kuro-record-row"><span>Derrotas no dojo</span><strong>{(player.losses_dojo || 0).toLocaleString()}</strong></div>
            <div className="kuro-record-row"><span>Derrotas PvP</span><strong>{(player.losses_pvp || 0).toLocaleString()}</strong></div>
            <div className="kuro-record-row"><span>Tarefas completas</span><strong>{(player.tasks_completed || 0).toLocaleString()}</strong></div>
            <button className="kuro-text-button kuro-records__link" onClick={() => navigate("/historico")}>Ver histórico <span aria-hidden="true">→</span></button>
          </section>

          {player.pending_boss_boxes > 0 && <section className="kuro-pending-reward"><div className="kuro-pending-reward__mark">✦</div><div><span className="kuro-section__eyebrow">RECOMPENSA PENDENTE</span><h3>{player.pending_boss_boxes} Baús do Colapso</h3><p>Há recompensas antigas associadas à sua conta.</p></div><button className="kuro-button kuro-button--muted" onClick={handleOpenBossChest} disabled={claiming}>Ver detalhes</button></section>}
        </aside>
      </div>
    </div>
  );
}