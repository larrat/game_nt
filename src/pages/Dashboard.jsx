import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { calculateXPForLevel, calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateAtkNinGen, getGlobalDebuffs } from '../utils/engine';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import AvatarModal from '../components/AvatarModal';
import '../styles/main.css';

const VILLAGES = {
  1: 'Folha', 2: 'Areia', 3: 'Névoa',
  4: 'Pedra', 5: 'Nuvem', 6: 'Som', 7: 'Chuva', 8: 'Akatsuki'
};

export default function Dashboard({ player, updatePlayer }) {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState({}); // Mapa de { event_id: string }
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Busca Eventos Ativos
  useEffect(() => {
    async function fetchEvents() {
      const { data } = await supabase
        .from('global_events')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: false });
      
      if (data && data.length > 0) setActiveEvents(data);
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

  if (!player) return null;

  // Lógica de Reset Diário Automático
  useEffect(() => {
    const checkDailyReset = async () => {
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
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes(taskId)) return;

    setClaiming(true);
    const newClaimed = [...claimed, taskId];
    
    let updates = { daily_rewards_claimed: newClaimed };
    if (rewardType === 'ryous') updates.ryous = (player.ryous || 0) + rewardAmount;
    if (rewardType === 'xp') updates.xp = (player.xp || 0) + rewardAmount;

    const { error } = await supabase.from('players').update(updates).eq('id', player.id);

    if (!error) {
      addToast(`Recompensa resgatada: +${rewardAmount} ${rewardType.toUpperCase()}!`, "success");
      updatePlayer(player.user_id);
    }
    setClaiming(false);
  };

  // Resgate do Baú Diário (Kuro Coins)
  const handleClaimDailyChest = async () => {
    const claimed = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];
    if (claimed.includes('chest')) return;
    
    setClaiming(true);
    const rewardCoins = Math.floor(Math.random() * 4) + 2; // 2 a 5 Kuro Coins
    const newClaimed = [...claimed, 'chest'];
    
    const { error } = await supabase.from('players').update({
      daily_rewards_claimed: newClaimed,
      vip_coins: (player.vip_coins || 0) + rewardCoins
    }).eq('id', player.id);

    if (!error) {
      addToast(`Baú Aberto! Você encontrou 🪙 ${rewardCoins} Kuro Coins!`, "success");
      updatePlayer(player.user_id);
    }
    setClaiming(false);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const fidelityClaimed = player.last_daily_claim === todayStr;
  const claimedList = Array.isArray(player.daily_rewards_claimed) ? player.daily_rewards_claimed : [];

  const nextLevelXP   = calculateXPForLevel(player.level + 1);
  const xpPercent     = Math.min(100, (player.xp / nextLevelXP) * 100);
  const maxHP         = calculateHP(player);
  const maxChakra     = calculateChakra(player);
  const maxStamina    = calculateStamina(player);
  const bgImage       = player.village_id === 1 ? '/images/bg_1.jpg' : '/images/bg_default.jpg';

  return (
    <div className="page">

      {/* HERO SECTION COMPLETA (SEMPRE NO TOPO) */}
      <div style={{ 
        backgroundImage: `url(${bgImage})`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '40px', 
        borderRadius: '16px', 
        display: 'flex', 
        gap: '32px', 
        alignItems: 'center', 
        flexWrap: 'wrap',
        position: 'relative', 
        overflow: 'hidden', 
        marginBottom: '24px', 
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Overlay Escuro com Fade Lateral */}
        <div style={{ background: 'linear-gradient(90deg, rgba(15,15,20,0.95) 0%, rgba(15,15,20,0.7) 45%, rgba(15,15,20,0.3) 100%)', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }} />

        {/* 1. Esquerda: Avatar e Info Básica */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '32px', alignItems: 'center', flex: '1 1 400px' }}>
          
          {/* Moldura da Imagem */}
          <div style={{ width: '160px', height: '160px', borderRadius: '12px', border: '2px solid var(--gold)', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,0,0,0.6)', background: 'var(--ink)' }}>
            {player.avatar?.startsWith('/') ? (
              <img src={player.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span className="dash-avatar-glyph" style={{ fontSize: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>{player.avatar || '👤'}</span>
            )}
          </div>
          
          {/* Informações Pessoais */}
          <div className="flex-col" style={{ gap: '12px' }}>
            <h2 className="paper" style={{ fontSize: '36px', textShadow: '2px 2px 8px rgba(0,0,0,1)', margin: 0 }}>{player.name}</h2>
            <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
              <div className="badge badge-gold" style={{ fontSize: '13px', padding: '6px 12px' }}>{player.rank || 'Estudante da Academia'}</div>
              <div className="muted mono" style={{ fontSize: '13px' }}>Vila da {VILLAGES[player.village_id]}</div>
            </div>
            <div className="flex-row" style={{ gap: '12px', marginTop: '8px' }}>
              <button className="btn-ghost" onClick={() => setIsAvatarModalOpen(true)} style={{ padding: '6px 16px', fontSize: '12px', background: 'rgba(0,0,0,0.4)' }}>🖼️ Trocar Imagem</button>
            </div>
          </div>

        </div>

        {/* 2. Direita: Barras de Status e Level */}
        <div className="flex-col" style={{ position: 'relative', zIndex: 1, gap: '20px', minWidth: '320px', flex: '1 1 320px', background: 'rgba(10,10,15,0.6)', padding: '24px', borderRadius: '16px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div className="flex-between" style={{ alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <div className="flex-col">
              <span className="muted uppercase mono" style={{ fontSize: '11px', letterSpacing: '2px', marginBottom: '4px' }}>Level</span>
              <span className="gold mono" style={{ fontSize: '42px', lineHeight: '1' }}>{player.level}</span>
            </div>
            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
               <span className="muted uppercase mono" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>Poder Ninja</span>
               <span className="paper mono" style={{ fontSize: '20px' }}>{(player.level * 150) + (player.pontos_atributos * 50)}</span>
            </div>
          </div>

          {/* FICHA TÉCNICA (Substitui antiga XP bar) */}
          <div style={{ marginTop: '4px' }}>
            <div className="muted uppercase mono" style={{ fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>Ficha de Combate</div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #ef4444' }}>
                <div className="muted mono" style={{ fontSize: '10px', marginBottom: '4px' }}>Dano Físico</div>
                <div className="paper mono" style={{ fontSize: '14px' }}>{calculateAtkTaiBuk(player)}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid #3b82f6' }}>
                <div className="muted mono" style={{ fontSize: '10px', marginBottom: '4px' }}>Dano Mágico</div>
                <div className="paper mono" style={{ fontSize: '14px' }}>{calculateAtkNinGen(player)}</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid var(--gold)' }}>
                <div className="muted mono" style={{ fontSize: '10px', marginBottom: '4px' }}>Selos Místicos</div>
                <div className="paper mono" style={{ fontSize: '14px' }}>{player.precisao || player.pre || 0} pts</div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 12px', borderRadius: '6px', borderLeft: '2px solid var(--success)' }}>
                <div className="muted mono" style={{ fontSize: '10px', marginBottom: '4px' }}>Vantagem do Clã</div>
                <div className="paper mono" style={{ fontSize: '14px', color: 'var(--success)' }}>
                  {player.clan === 'Uchiha' ? '+15% Crítico' : 
                   player.clan === 'Hyuga' ? 'Ignora Armadura' : 
                   player.clan === 'Nara' ? '+10% Paralisia' : '---'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALERTA DE MÚLTIPLOS EVENTOS GLOBAIS */}
      {activeEvents.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(auto-fit, minmax(400px, 1fr))`, 
          gap: '24px', 
          marginBottom: '24px' 
        }}>
          {activeEvents.map(event => (
            <div key={event.id} className="card" style={{ background: 'linear-gradient(90deg, rgba(30,10,10,1) 0%, rgba(20,20,25,1) 100%)', border: '1px solid #ef4444', position: 'relative', overflow: 'hidden', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444', animation: 'pulse 2s infinite', boxShadow: '0 0 10px #ef4444' }}></div>
              
              <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <h4 className="danger mono" style={{ marginBottom: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '1px' }}>
                    <img src="/images/imgi_34_megafone.png" alt="Megafone" style={{ width: '12px', height: '12px' }} />
                    EVENTO GLOBAL
                  </h4>
                  <div className="paper" style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', minHeight: '44px' }}>
                    {event.name}
                  </div>
                  <div className="muted" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                    {event.description}
                  </div>
                </div>

                <div className="flex-col" style={{ alignItems: 'center', gap: '12px', minWidth: '150px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px dashed #ef4444' }}>
                  <span className="mono muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Tempo Restante</span>
                  <span className="mono danger" style={{ fontSize: '20px', fontWeight: 'bold', textShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }}>
                    {timeRemaining[event.id] || 'Calculando...'}
                  </span>
                  <button className="btn-primary" style={{ width: '100%', padding: '10px', fontSize: '12px', background: '#ef4444', borderColor: '#ef4444', marginTop: '4px' }} onClick={() => navigate('/evento')}>
                    Participar
                  </button>
                </div>
              </div>

              {/* Barra de Vida do Boss (se houver) */}
              {event.boss_hp !== null && (
                <div style={{ marginTop: '24px' }}>
                  <div className="flex-between" style={{ marginBottom: '8px', fontSize: '12px' }}>
                    <span className="danger mono flex-row" style={{ alignItems: 'center', gap: '8px' }}>
                      <img src="/images/imgi_8_heart.png" style={{ width: '12px', height: '12px' }} />
                      HP DO CHEFE
                    </span>
                    <span className="muted mono">{event.boss_hp} / {event.boss_max_hp}</span>
                  </div>
                  <div className="progress-track" style={{ height: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div className="progress-fill" style={{ width: `${(event.boss_hp / event.boss_max_hp) * 100}%`, background: '#ef4444', boxShadow: '0 0 10px #ef4444' }}></div>
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
              <img src="/images/imgi_112_1.png" style={{ width: '16px' }} /> Combates
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
              <img src="/images/imgi_13_passe.png" style={{ width: '16px' }} /> Missões
            </h4>
            <div className="stats-list">
              <div className="stat-win"><span>Rank S:</span><span>{player.missions_s || 0}</span></div>
              <div className="stat-win"><span>Rank A:</span><span>{player.missions_a || 0}</span></div>
              <div className="stat-neutral"><span>Rank B:</span><span>{player.missions_b || 0}</span></div>
              <div className="stat-neutral"><span>Rank C:</span><span>{player.missions_c || 0}</span></div>
              <div className="stat-neutral"><span>Rank D:</span><span>{player.missions_d || 0}</span></div>
              <div className="stat-highlight" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_14_rotina.png" style={{ width: '12px' }} /> Tarefas:
                </span>
                <span>{player.tasks_completed || 0}/10</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/images/imgi_32_star.png" style={{ width: '16px' }} /> Extras
            </h4>
            <div className="stats-list">
              <div className="stat-gold">
                <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_20_ryous.png" style={{ width: '12px' }} /> Ryous:
                </span>
                <span>RY$ {player.ryous}</span>
              </div>
              <div className="stat-highlight">
                <span className="flex-row" style={{ alignItems: 'center', gap: '4px' }}>
                  <img src="/images/imgi_126_star.png" style={{ width: '12px' }} /> Pts. Atrib.:
                </span>
                <span>{player.pontos_atributos}</span>
              </div>
              <div className="stat-neutral"><span>Bingo Book:</span><span>0</span></div>
              <div className="stat-neutral"><span>Torneios:</span><span>0</span></div>
              <div className="stat-neutral"><span>Arenas:</span><span>0</span></div>
            </div>
          </div>

        </div>

        {/* ── PAINEL DE OBJETIVOS DIÁRIOS ── */}
        <div className="grid-2" style={{ marginTop: '24px' }}>
          
        {/* 3. Coluna Principal: Atividades Diárias (100% no mobile, preenche espaço no desktop) */}
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
              <img src="/images/imgi_16_fidelidade.png" style={{ width: '18px' }} /> Bônus de Fidelidade
            </h4>
            <p className="muted" style={{ fontSize: '13px', marginBottom: '16px', lineHeight: '1.5' }}>
              Entre todos os dias no Kurokage e colete sua recompensa diária de sobrevivência.
            </p>
            <div className="flex-between" style={{ alignItems: 'center' }}>
              <span className="gold mono flex-row" style={{ alignItems: 'center', gap: '6px' }}>
                <img src="/images/imgi_20_ryous.png" style={{ width: '14px' }} /> RY$ 50
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
              <img src="/images/imgi_14_rotina.png" style={{ width: '18px' }} /> Objetivos Diários
            </h4>
            <div className="flex-col" style={{ gap: '12px' }}>
              
              {/* Tarefa 1 */}
              <div style={{ background: 'var(--ink-raised)', padding: '12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span className="paper flex-row" style={{ fontSize: '13px', alignItems: 'center', gap: '6px' }}>
                    <img src="/images/imgi_112_1.png" style={{ width: '12px' }} /> Derrote 3 inimigos
                  </span>
                  <span className="mono gold flex-row" style={{ fontSize: '11px', alignItems: 'center', gap: '4px' }}>
                    <img src="/images/imgi_20_ryous.png" style={{ width: '10px' }} /> RY$ 20
                  </span>
                </div>
                <div className="flex-between" style={{ alignItems: 'center', gap: '12px' }}>
                  <div className="progress-track" style={{ flex: 1, height: '6px' }}>
                    <div className="progress-fill green" style={{ width: `${Math.min(100, ((player.daily_npcs_defeated || 0) / 3) * 100)}%` }} />
                  </div>
                  {claimedList.includes('t1') ? (
                    <span className="success mono" style={{ fontSize: '10px' }}>✓ FEITO</span>
                  ) : (player.daily_npcs_defeated || 0) >= 3 ? (
                    <button className="btn-ghost" onClick={() => handleClaimTask('t1', 'ryous', 20)} disabled={claiming} style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'var(--seal-bright)', color: 'var(--seal-bright)' }}>RESGATAR</button>
                  ) : (
                    <span className="muted mono" style={{ fontSize: '10px' }}>{(player.daily_npcs_defeated || 0)}/3</span>
                  )}
                </div>
              </div>

              {/* Tarefa 2 */}
              <div style={{ background: 'var(--ink-raised)', padding: '12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span className="paper flex-row" style={{ fontSize: '13px', alignItems: 'center', gap: '6px' }}>
                    <img src="/images/imgi_9_chakra.png" style={{ width: '12px' }} /> Gaste 100 de Chakra
                  </span>
                  <span className="mono gold flex-row" style={{ fontSize: '11px', alignItems: 'center', gap: '4px' }}>
                    <img src="/images/imgi_20_ryous.png" style={{ width: '10px' }} /> RY$ 20
                  </span>
                </div>
                <div className="flex-between" style={{ alignItems: 'center', gap: '12px' }}>
                  <div className="progress-track" style={{ flex: 1, height: '6px' }}>
                    <div className="progress-fill blue" style={{ width: `${Math.min(100, ((player.daily_chakra_spent || 0) / 100) * 100)}%` }} />
                  </div>
                  {claimedList.includes('t2') ? (
                    <span className="success mono" style={{ fontSize: '10px' }}>✓ FEITO</span>
                  ) : (player.daily_chakra_spent || 0) >= 100 ? (
                    <button className="btn-ghost" onClick={() => handleClaimTask('t2', 'ryous', 20)} disabled={claiming} style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'var(--seal-bright)', color: 'var(--seal-bright)' }}>RESGATAR</button>
                  ) : (
                    <span className="muted mono" style={{ fontSize: '10px' }}>{(player.daily_chakra_spent || 0)}/100</span>
                  )}
                </div>
              </div>

              {/* Tarefa 3 */}
              <div style={{ background: 'var(--ink-raised)', padding: '12px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                <div className="flex-between" style={{ marginBottom: '8px' }}>
                  <span className="paper flex-row" style={{ fontSize: '13px', alignItems: 'center', gap: '6px' }}>
                    <img src="/images/imgi_10_stamina.png" style={{ width: '12px' }} /> Treine 1 vez
                  </span>
                  <span className="mono gold flex-row" style={{ fontSize: '11px', alignItems: 'center', gap: '4px' }}>
                    <img src="/images/imgi_20_ryous.png" style={{ width: '10px' }} /> RY$ 20
                  </span>
                </div>
                <div className="flex-between" style={{ alignItems: 'center', gap: '12px' }}>
                  <div className="progress-track" style={{ flex: 1, height: '6px' }}>
                    <div className="progress-fill red" style={{ width: `${Math.min(100, ((player.daily_trainings || 0) / 1) * 100)}%` }} />
                  </div>
                  {claimedList.includes('t3') ? (
                    <span className="success mono" style={{ fontSize: '10px' }}>✓ FEITO</span>
                  ) : (player.daily_trainings || 0) >= 1 ? (
                    <button className="btn-ghost" onClick={() => handleClaimTask('t3', 'ryous', 20)} disabled={claiming} style={{ padding: '4px 8px', fontSize: '10px', borderColor: 'var(--seal-bright)', color: 'var(--seal-bright)' }}>RESGATAR</button>
                  ) : (
                    <span className="muted mono" style={{ fontSize: '10px' }}>{(player.daily_trainings || 0)}/1</span>
                  )}
                </div>
              </div>

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


      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        player={player}
        updatePlayer={updatePlayer}
      />
    </div>
  );
}
