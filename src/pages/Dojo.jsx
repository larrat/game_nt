import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules } from '../utils/engine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import GameAction from '../components/ui/GameAction';
import '../styles/dojo-v4.css';
import { useToast } from '../context/ToastContext';

export default function Dojo({ player, updatePlayer }) {
  const navigate = useNavigate();
  const [loadingId, setLoadingId] = useState(null);
  const { addToast } = useToast();

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

  const loadCanonicalDojoNpcs = async () => {
    // Somente adversários oficiais: o RPC iniciar_combate_sessao aceita
    // p_is_dojo=true exclusivamente para NPCs não-mapa, não-história e não-bingo.
    const { data, error } = await supabase.from('npcs').select('*')
      .eq('is_active', true)
      .eq('is_map_npc', false)
      .eq('is_story_mode', false)
      .eq('is_bingo_book', false)
      .eq('is_chunin_exam', false)
      .not('character_id', 'is', null);
    if (error) throw error;
    return (data || []).filter(npc =>
      Number.isSafeInteger(Number(npc.id)) &&
      Number(npc.id) > 0 &&
      npc.character_id && npc.name
    );
  };

  const handleSearch = async () => {
    if (loadingId) return;
    setLoadingId('search');
    try {
      const pool = await loadCanonicalDojoNpcs();
      const candidates = pool.filter(npc => Number(npc.level) <= Number(player.level) + 5);
      if (!candidates.length) {
        addToast('Não há adversários oficiais do Dojo disponíveis para seu nível.', 'info');
        return;
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      // O servidor carrega estatísticas e autoriza recompensas pelo ID real.
      // Nunca usar isMirror ou IDs temporários em partidas com progressão.
      navigate('/combate', {
        state: { bgType: 'dojo', npc: { ...chosen, activeJutsus: [] }, isMirror: false }
      });
    } catch (error) {
      addToast('Não foi possível consultar os adversários do catálogo.', 'error');
    } finally {
      setLoadingId(null);
    }
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

  // Raids antigas reservam stamina sem criar sessões de combate verificáveis.
  // Manter o recurso indisponível até existir uma RPC transacional por incursão.
  const raidUnavailable = true;

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
        actions={<GameAction type="button" tone="quiet" className="kuro-dojo-v4__archive-action" onClick={() => navigate('/adversarios')}>
          <SidebarIcon name="compass" size={17} /> Arquivo de adversários <SidebarIcon name="arrowRight" size={16} />
        </GameAction>}
      />

      <section className="kuro-dojo-v4__hero" aria-label="Situação do ninja">
        <div className="kuro-dojo-v4__hero-content">
          <span className="kuro-dojo-v4__eyebrow"><span className="kuro-dojo-v4__status-dot" /> POSTO DE COMBATE · {loadingId ? 'EM ATIVIDADE' : 'PRONTO PARA AÇÃO'}</span>
          <h2>A vitória começa <em>antes do duelo.</em></h2>
          <p>Conheça seu poder, escolha o risco e domine a arena. Os resultados oficiais dependem das regras do servidor.</p>
          <div className="kuro-dojo-v4__hero-actions">
            <GameAction type="button" tone="seal" onClick={handleSearch} disabled={loadingId !== null}>
              <SidebarIcon name="swords" size={17} /> {loadingId === 'search' ? 'Rastreando oponente…' : 'Buscar combate real'} <SidebarIcon name="arrowRight" size={16} />
            </GameAction>
            <GameAction type="button" tone="quiet" onClick={() => navigate('/adversarios')}>
              Ver adversários
            </GameAction>
          </div>
        </div>
        <div className="kuro-dojo-v4__hero-mark" aria-hidden="true"><SidebarIcon name="swords" size={82} /></div>
      </section>

      <section className="kuro-dojo-v4__overview" aria-label="Informações atuais do personagem">
        <div className="kuro-dojo-v4__metric"><span><SidebarIcon name="target" size={15} /> NÍVEL</span><strong>{player.level}</strong><small>Poder atual do ninja</small></div>
        <div className="kuro-dojo-v4__metric"><span><SidebarIcon name="shield" size={15} /> GRADUAÇÃO</span><strong>{player.rank || 'Estudante'}</strong><small>Patente do personagem</small></div>
        <div className="kuro-dojo-v4__metric"><span><SidebarIcon name="zap" size={15} /> STAMINA</span><strong>{player.stamina ?? calculateStamina(player)}</strong><small>Recurso para incursões</small></div>
        <div className="kuro-dojo-v4__metric"><span><SidebarIcon name="activity" size={15} /> ESTADO</span><strong>{loadingId ? 'Em atividade' : 'Disponível'}</strong><small>{loadingId ? 'Aguarde a ação atual' : 'Arena liberada'}</small></div>
      </section>

      <div className="kuro-dojo-v4__section-heading">
        <div><span className="kuro-dojo-v4__eyebrow">SELEÇÃO DE TREINAMENTO</span><h2>Escolha seu confronto</h2></div>
        <p>Do teste sem risco às batalhas que definem sua jornada.</p>
      </div>

      <div className="kuro-dojo-v4__grid" aria-label="Modalidades de combate">
        <section className="kuro-dojo-v4__card kuro-dojo-v4__card--primary">
          <span className="kuro-dojo-v4__card-number">01 / DESAFIO PRINCIPAL</span>
          <span className="kuro-dojo-v4__card-icon"><SidebarIcon name="swords" size={27} /></span>
          <span className="kuro-dojo-v4__card-label">ARENA · PROGRESSÃO</span>
          <h3>Combate Real</h3>
          <p>Enfrente um personagem cadastrado em uma batalha validada pelo servidor.</p>
          <div className="kuro-dojo-v4__tags"><span>Confronto real</span><span>Risco de derrota</span></div>
          <GameAction type="button" tone="seal" className="kuro-dojo-v4__card-button" onClick={handleSearch} disabled={loadingId !== null}>
            {loadingId === 'search' ? 'Rastreando…' : 'Procurar luta'} <SidebarIcon name="arrowRight" size={16} />
          </GameAction>
        </section>

        <section className="kuro-dojo-v4__card">
          <span className="kuro-dojo-v4__card-number">02 / PREPARAÇÃO</span>
          <span className="kuro-dojo-v4__card-icon"><SidebarIcon name="target" size={27} /></span>
          <span className="kuro-dojo-v4__card-label">ACADEMIA · SIMULAÇÃO</span>
          <h3>Treinamento Livre</h3>
          <p>Teste dano, equipamentos e jutsus em um boneco de madeira sem recompensa.</p>
          <div className="kuro-dojo-v4__tags"><span>Sem custo</span><span>Sem recompensa</span></div>
          <GameAction type="button" tone="quiet" className="kuro-dojo-v4__card-button" onClick={handleFreeTraining} disabled={loadingId !== null}>
            Bater no boneco <SidebarIcon name="arrowRight" size={16} />
          </GameAction>
        </section>

        <section className="kuro-dojo-v4__card">
          <span className="kuro-dojo-v4__card-number">03 / RESISTÊNCIA</span>
          <span className="kuro-dojo-v4__card-icon"><SidebarIcon name="zap" size={27} /></span>
          <span className="kuro-dojo-v4__card-label">DESAFIO · SEQUÊNCIA</span>
          <h3>Incursão (Raid)</h3>
          <p>Incursões em sequência aguardam sessões verificáveis no servidor. Nenhuma stamina será cobrada enquanto o recurso estiver indisponível.</p>
          <div className="kuro-dojo-v4__tags"><span>Indisponível temporariamente</span><span>Stamina preservada</span></div>
          <div className="kuro-dojo-v4__actions-row">
            <GameAction type="button" tone="quiet" disabled={raidUnavailable}>Raid 3x — indisponível</GameAction>
            <GameAction type="button" tone="seal" disabled={raidUnavailable}>Raid 5x — indisponível</GameAction>
          </div>
          {(player.dojo_clears || player.wins_dojo || 0) >= 3 && (
            <div className="kuro-dojo-v4__actions-row kuro-dojo-v4__quick">
              <GameAction type="button" tone="quiet" onClick={() => handleQuickClear(3)} disabled={loadingId !== null}>Limpar 3x</GameAction>
              <GameAction type="button" tone="quiet" onClick={() => handleQuickClear(5)} disabled={loadingId !== null}>Limpar 5x</GameAction>
            </div>
          )}
        </section>

        <section className={'kuro-dojo-v4__card kuro-dojo-v4__card--danger' + (isAkatsuki ? ' is-akatsuki' : '')}>
          <span className="kuro-dojo-v4__card-number">04 / ALTO RISCO</span>
          <span className="kuro-dojo-v4__card-icon"><SidebarIcon name="flame" size={27} /></span>
          <span className="kuro-dojo-v4__card-label">{isAkatsuki ? 'AKATSUKI · OBJETIVO' : 'VILA · DECISÃO PERMANENTE'}</span>
          <h3>{isAkatsuki ? 'Caçada Jinchuuriki' : 'Renegado'}</h3>
          <p>{isAkatsuki
            ? 'Rastreie portadores de Bijuus quando essa modalidade estiver autorizada no servidor.'
            : 'Ataque um companheiro de vila. Se vencer, você abandona sua bandana e ingressa na Akatsuki.'}</p>
          <div className="kuro-dojo-v4__tags"><span>Alto risco</span><span>{isAkatsuki ? 'Aguardando servidor' : 'Consequência permanente'}</span></div>
          <GameAction type="button" tone="danger" className="kuro-dojo-v4__card-button"
            onClick={isAkatsuki ? handleBijuuHunt : handleBetrayal} disabled={loadingId !== null || isAkatsuki}>
            {isAkatsuki ? 'Caçada indisponível' : loadingId === 'betray' ? 'Rastreando…' : 'Trair a vila'}
            <SidebarIcon name="arrowRight" size={16} />
          </GameAction>
        </section>
      </div>

      <aside className="kuro-dojo-v4__note">
        <SidebarIcon name="shield" size={18} />
        <p><strong>Preparação inteligente.</strong> Use o Treinamento Livre para testar sua build. Para explorar NPCs, personagens do catálogo e projeções de jogadores, visite o <GameAction type="button" onClick={() => navigate('/adversarios')}>Arquivo de Adversários <SidebarIcon name="arrowRight" size={14} /></GameAction>. As projeções não são PvP ao vivo.</p>
      </aside>
    </div>
  );
}
