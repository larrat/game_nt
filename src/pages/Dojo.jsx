import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules, generateDynamicRogueNinja, getDynamicNpcJutsus, calculateLevelFromXP } from '../utils/engine';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { Activity, ArrowRight, Compass, Flame, Shield, Swords, Target, Zap } from 'lucide-react';
import '../styles/dojo-v4.css';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';

export default function Dojo({ player, updatePlayer }) {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const { addToast } = useToast();
  const gameConfig = useGameConfig();

  useEffect(() => {
    if (player && player.is_fainted) {
      navigate('/hospital');
    }
  }, [player, navigate]);

  if (!player) return null;

  const fetchRivalJutsus = async (jutsuIds) => {
    const learned = Array.isArray(jutsuIds) ? jutsuIds : [];
    const ids = learned.map(j => typeof j === 'string' ? j : j.id).filter(Boolean);
    if (!ids.length) return [];

    const { data } = await supabase
      .from('jutsus')
      .select('*, jutsu_effects(*, status_effects(*))')
      .in('id', ids);

    return data || [];
  };

  const handleSearch = async () => {
    setLoadingId('search');
    await new Promise(r => setTimeout(r, 2000));
    
    const roll = Math.random();
    
    // A pedido do usuário, o sistema de espelho (PvP no Dojo) foi desativado temporariamente
    // para focar na criação de NPCs perfeitamente parelhos (paralelos) com os status do jogador.
    
    // 1) Checa se existe NPC da História disponível no banco
    const npcChance = Number(gameConfig?.dojo_story_npc_chance) || 0.35;
    if (roll < npcChance) {
      const { data: dojoNpcs } = await supabase
        .from('npcs')
        .select('*')
        .eq('is_map_npc', false)
        .eq('is_active', true)
        .lte('level', player.level + 5);

      if (dojoNpcs && dojoNpcs.length > 0) {
        const chosenNPC = dojoNpcs[Math.floor(Math.random() * dojoNpcs.length)];
        chosenNPC.activeJutsus = getDynamicNpcJutsus(chosenNPC);
        setLoadingId(null);
        return navigate('/combate', { state: { bgType: 'dojo', npc: chosenNPC, isMirror: false } });
      }
    }

    // 2) Fallback para Gerar Ninja Renegado Dinâmico Parelho
    // Simulamos um IsMirror para garantir que as fórmulas de Combate usem os atributos recém gerados!
    const rogue = generateDynamicRogueNinja(player);
    setLoadingId(null);
    return navigate('/combate', { state: { bgType: 'dojo', npc: rogue, isMirror: true } });
  };

  const handleBetrayal = async () => {
    setLoadingId('betray');
    await new Promise(r => setTimeout(r, 2000));

    const rules = getPvPMatchRules(player.rank, player.level);

    const { data: targets, error: rivalError } = await supabase.rpc('listar_rivais_dojo', {
      p_player_id: player.id,
      p_min_level: Math.max(1, rules.minLvl),
      p_max_level: rules.maxLvl,
      p_target_ranks: rules.targetRanks?.length ? rules.targetRanks : null
    });

    setLoadingId(null);

    if (rivalError) {
      addToast('Não foi possível consultar rivais do Dojo.', 'error');
    } else if (targets && targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const targetJutsus = await fetchRivalJutsus(target.jutsu_ids);

      const mirrorNpc = {
        id: `rival_${target.id}`,
        real_id: target.id,
        name: target.name,
        avatar: target.avatar || '👤',
        level: target.level,
        hp: calculateHP(target),
        chakra: calculateChakra(target),
        atk: calculateAtkTaiBuk(target),
        def: calculateDefTaiBuk(target),
        element: target.element,
        activeJutsus: targetJutsus,
        desc: 'Você está prestes a cometer alta traição contra um companheiro de vila!'
      };
      
      return navigate('/combate', { state: { bgType: 'dojo', npc: mirrorNpc, isMirror: true, isBetrayal: true } });
    } else {
      addToast('Não há membros de sua vila por perto no momento para trair.', 'info');
    }
  };

  const handleBijuuHunt = async () => {
    // No has_bijuu attribute exists in the current players schema.
    addToast('Caçada às Bijuus indisponível até o cadastro de Jinchuurikis no servidor.', 'info');
  };

  const RAID_STAMINA_COST = 25;

  const handleRaid = async (fightCount) => {
    setLoadingId('raid');
    try {
      const { data, error } = await supabase.rpc('reservar_raid_stamina', {
        p_player_id: player.id,
        p_fight_count: fightCount
      });

      if (error || !data?.success) {
        addToast('Erro ao iniciar incursão: ' + (error?.message || data?.error || 'operação recusada'), 'error');
        return;
      }

      await updatePlayer(player.id);
      await new Promise(r => setTimeout(r, 400));
      const rogue = generateDynamicRogueNinja(player);
      navigate('/combate', {
        state: {
          bgType: 'dojo',
          npc: rogue,
          isMirror: true,
          raidTotal: fightCount,
          raidCurrent: 1
        }
      });
    } catch (error) {
      addToast('Erro ao iniciar incursão: ' + (error?.message || 'erro inesperado'), 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleQuickClear = async (fightCount) => {
    if (!player) return;
    setLoadingId(`quick_${fightCount}`);

    try {
      const { data, error } = await supabase.rpc('resolver_limpeza_rapida', {
        p_player_id: player.id,
        p_fight_count: fightCount
      });

      if (error || !data?.success) {
        addToast('Erro na limpeza rápida: ' + (error?.message || data?.error || 'A operação não foi concluída.'), 'error');
        return;
      }

      const wins = data.wins || 0;
      const losses = data.losses || 0;
      let dropMsg = '';
      if (data.equipment_drops > 0) dropMsg += ` | ⚔️ ${data.equipment_drops} Equipamentos`;
      if (data.essence_drops > 0) dropMsg += ` | 📜 ${data.essence_drops} Essências`;
      if (data.kuro_coins_dropped > 0) dropMsg += ` | 🪙 ${data.kuro_coins_dropped} Kuro Coins`;

      if (wins === 0) {
        addToast(`⚡ A Limpeza Rápida falhou! Você perdeu todas as ${losses} lutas.`, 'error');
      } else if (losses > 0) {
        addToast(`⚡ Limpeza Parcial! Venceu ${wins} e Perdeu ${losses}. +${data.xp_gained} XP | +${data.ryous_gained} Ryous${dropMsg}`, 'info');
      } else {
        addToast(`⚡ Limpeza Rápida Perfeita! Venceu todas as ${wins} lutas. +${data.xp_gained} XP | +${data.ryous_gained} Ryous${dropMsg}`, 'success');
      }
      if (data.levels_gained > 0) {
        addToast(`🎉 Você subiu ${data.levels_gained} Níveis!`, 'success');
      }
      await updatePlayer(player.id);
    } catch (err) {
      addToast('Erro na limpeza rápida: ' + (err?.message || 'Falha inesperada.'), 'error');
    } finally {
      setLoadingId(null);
    }
  };


  const handleFreeTraining = () => {
    const dummyNPC = {
      id: 'dummy',
      name: 'Boneco de Madeira',
      avatar: '🪵',
      level: 1,
      hp: 9999,
      chakra: 0,
      atk: 0,
      def: 0,
      element: null,
      xpReward: 0,
      ryouReward: 0,
      desc: 'Teste de Dano. O boneco não ataca de volta nem dá experiência.',
      is_dummy: true
    };
    navigate('/combate', { state: { bgType: 'dojo', npc: dummyNPC, isMirror: false, fromDojoFree: true } });
  };

  const isAkatsuki = player.village_id === 8;


  return (
    <div className="page kuro-dojo-v4">
      <PageHeader
        eyebrow="Arena shinobi · Quartel Ninja"
        title="Dojo da Vila"
        subtitle="Treine, enfrente rivais e trace o caminho da sua próxima vitória."
        actions={<button type="button" className="btn-ghost kuro-dojo-v4__archive-action" onClick={() => navigate('/adversarios')}>
          <Compass size={17} aria-hidden="true" /> Arquivo de adversários <ArrowRight size={16} aria-hidden="true" />
        </button>}
      />

      <section className="kuro-dojo-v4__hero" aria-label="Situação do ninja">
        <div className="kuro-dojo-v4__hero-content">
          <span className="kuro-dojo-v4__eyebrow"><span className="kuro-dojo-v4__status-dot" /> POSTO DE COMBATE · {loadingId ? 'EM ATIVIDADE' : 'PRONTO PARA AÇÃO'}</span>
          <h2>A vitória começa <em>antes do duelo.</em></h2>
          <p>Conheça seu poder, escolha o risco e domine a arena. Os resultados oficiais dependem das regras do servidor.</p>
          <div className="kuro-dojo-v4__hero-actions">
            <button type="button" className="btn-primary" onClick={handleSearch} disabled={loadingId !== null}>
              <Swords size={17} aria-hidden="true" /> {loadingId === 'search' ? 'Rastreando oponente…' : 'Buscar combate real'} <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn-ghost" onClick={() => navigate('/adversarios')}>
              Ver adversários
            </button>
          </div>
        </div>
        <div className="kuro-dojo-v4__hero-mark" aria-hidden="true"><Swords size={82} strokeWidth={1.15} /></div>
      </section>

      <section className="kuro-dojo-v4__overview" aria-label="Informações atuais do personagem">
        <div className="kuro-dojo-v4__metric"><span><Target size={15} aria-hidden="true" /> NÍVEL</span><strong>{player.level}</strong><small>Poder atual do ninja</small></div>
        <div className="kuro-dojo-v4__metric"><span><Shield size={15} aria-hidden="true" /> GRADUAÇÃO</span><strong>{player.rank || 'Estudante'}</strong><small>Patente do personagem</small></div>
        <div className="kuro-dojo-v4__metric"><span><Zap size={15} aria-hidden="true" /> STAMINA</span><strong>{player.stamina ?? calculateStamina(player)}</strong><small>Recurso para incursões</small></div>
        <div className="kuro-dojo-v4__metric"><span><Activity size={15} aria-hidden="true" /> ESTADO</span><strong>{loadingId ? 'Em atividade' : 'Disponível'}</strong><small>{loadingId ? 'Aguarde a ação atual' : 'Arena liberada'}</small></div>
      </section>

      <div className="kuro-dojo-v4__section-heading">
        <div><span className="kuro-dojo-v4__eyebrow">SELEÇÃO DE TREINAMENTO</span><h2>Escolha seu confronto</h2></div>
        <p>Do teste sem risco às batalhas que definem sua jornada.</p>
      </div>

      <div className="kuro-dojo-v4__grid" aria-label="Modalidades de combate">
        <section className="kuro-dojo-v4__card kuro-dojo-v4__card--primary">
          <span className="kuro-dojo-v4__card-number">01 / DESAFIO PRINCIPAL</span>
          <span className="kuro-dojo-v4__card-icon"><Swords size={27} strokeWidth={1.6} aria-hidden="true" /></span>
          <span className="kuro-dojo-v4__card-label">ARENA · PROGRESSÃO</span>
          <h3>Combate Real</h3>
          <p>Encontre um NPC ou adversário parelho e lute pela progressão do personagem.</p>
          <div className="kuro-dojo-v4__tags"><span>Confronto real</span><span>Risco de derrota</span></div>
          <button type="button" className="btn-primary kuro-dojo-v4__card-button" onClick={handleSearch} disabled={loadingId !== null}>
            {loadingId === 'search' ? 'Rastreando…' : 'Procurar luta'} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>

        <section className="kuro-dojo-v4__card">
          <span className="kuro-dojo-v4__card-number">02 / PREPARAÇÃO</span>
          <span className="kuro-dojo-v4__card-icon"><Target size={27} strokeWidth={1.6} aria-hidden="true" /></span>
          <span className="kuro-dojo-v4__card-label">ACADEMIA · SIMULAÇÃO</span>
          <h3>Treinamento Livre</h3>
          <p>Teste dano, equipamentos e jutsus em um boneco de madeira sem recompensa.</p>
          <div className="kuro-dojo-v4__tags"><span>Sem custo</span><span>Sem recompensa</span></div>
          <button type="button" className="btn-ghost kuro-dojo-v4__card-button" onClick={handleFreeTraining} disabled={loadingId !== null}>
            Bater no boneco <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>

        <section className="kuro-dojo-v4__card">
          <span className="kuro-dojo-v4__card-number">03 / RESISTÊNCIA</span>
          <span className="kuro-dojo-v4__card-icon"><Zap size={27} strokeWidth={1.6} aria-hidden="true" /></span>
          <span className="kuro-dojo-v4__card-label">DESAFIO · SEQUÊNCIA</span>
          <h3>Incursão (Raid)</h3>
          <p>Enfrente uma sequência de lutas. O servidor reserva a stamina antes de começar.</p>
          <div className="kuro-dojo-v4__tags"><span>{RAID_STAMINA_COST} ST por luta</span><span>Stamina: {player.stamina ?? calculateStamina(player)}</span></div>
          <div className="kuro-dojo-v4__actions-row">
            <button type="button" className="btn-ghost" onClick={() => handleRaid(3)} disabled={loadingId !== null}>Raid 3x</button>
            <button type="button" className="btn-primary" onClick={() => handleRaid(5)} disabled={loadingId !== null}>{loadingId === 'raid' ? 'Iniciando…' : 'Raid 5x'}</button>
          </div>
          {(player.dojo_clears || player.wins_dojo || 0) >= 3 && (
            <div className="kuro-dojo-v4__actions-row kuro-dojo-v4__quick">
              <button type="button" className="btn-ghost" onClick={() => handleQuickClear(3)} disabled={loadingId !== null}>Limpar 3x</button>
              <button type="button" className="btn-ghost" onClick={() => handleQuickClear(5)} disabled={loadingId !== null}>Limpar 5x</button>
            </div>
          )}
        </section>

        <section className={'kuro-dojo-v4__card kuro-dojo-v4__card--danger' + (isAkatsuki ? ' is-akatsuki' : '')}>
          <span className="kuro-dojo-v4__card-number">04 / ALTO RISCO</span>
          <span className="kuro-dojo-v4__card-icon"><Flame size={27} strokeWidth={1.6} aria-hidden="true" /></span>
          <span className="kuro-dojo-v4__card-label">{isAkatsuki ? 'AKATSUKI · OBJETIVO' : 'VILA · DECISÃO PERMANENTE'}</span>
          <h3>{isAkatsuki ? 'Caçada Jinchuuriki' : 'Renegado'}</h3>
          <p>{isAkatsuki
            ? 'Rastreie portadores de Bijuus quando essa modalidade estiver autorizada no servidor.'
            : 'Ataque um companheiro de vila. Se vencer, você abandona sua bandana e ingressa na Akatsuki.'}</p>
          <div className="kuro-dojo-v4__tags"><span>Alto risco</span><span>{isAkatsuki ? 'Aguardando servidor' : 'Consequência permanente'}</span></div>
          <button type="button" className="btn-danger kuro-dojo-v4__card-button"
            onClick={isAkatsuki ? handleBijuuHunt : handleBetrayal} disabled={loadingId !== null || isAkatsuki}>
            {isAkatsuki ? 'Caçada indisponível' : loadingId === 'betray' ? 'Rastreando…' : 'Trair a vila'}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>
      </div>

      <aside className="kuro-dojo-v4__note">
        <Shield size={18} aria-hidden="true" />
        <p><strong>Preparação inteligente.</strong> Use o Treinamento Livre para testar sua build. Para explorar NPCs, personagens do catálogo e projeções de jogadores, visite o <button type="button" onClick={() => navigate('/adversarios')}>Arquivo de Adversários <ArrowRight size={14} aria-hidden="true" /></button>. As projeções não são PvP ao vivo.</p>
      </aside>
    </div>
  );
}
