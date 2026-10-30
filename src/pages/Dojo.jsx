import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateStamina, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules, generateDynamicRogueNinja, getDynamicNpcJutsus, calculateLevelFromXP } from '../utils/engine';
import { rollRarity, generateLootStats } from '../utils/lootEngine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
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
    <div className="page">
      <PageHeader
        eyebrow='Treinamento e Combate'
        title='Dojo da Vila'
        subtitle='Escolha entre teste seguro, combate real e objetivos de risco.'
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-ink-card border border-line-solid p-4 flex flex-col items-center rounded shadow-sm">
          <div className="text-muted text-xs uppercase tracking-widest mb-1">Seu nível</div>
          <div className="text-xl font-bold text-paper">Nv. {player.level}</div>
        </div>
        <div className="bg-ink-card border border-line-solid p-4 flex flex-col items-center rounded shadow-sm">
          <div className="text-muted text-xs uppercase tracking-widest mb-1">Graduação</div>
          <div className="text-xl font-bold text-paper">{player.rank || 'Estudante'}</div>
        </div>
        <div className="bg-ink-card border border-line-solid p-4 flex flex-col items-center rounded shadow-sm">
          <div className="text-muted text-xs uppercase tracking-widest mb-1">Estado</div>
          <div className="text-xl font-bold text-paper">{loadingId ? 'Rastreando...' : 'Disponível'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="flex flex-col gap-4 bg-ink-card border border-line-solid p-6 rounded-lg transition-transform hover:-translate-y-1 hover:shadow-lg min-h-[260px]">
          <div className="w-12 h-12 flex items-center justify-center bg-ink-raised border border-line-bright rounded-md text-2xl">🪵</div>
          <h3 className="font-shippori text-xl font-bold text-paper">Treinamento Livre</h3>
          <p className="text-muted-bright text-sm leading-relaxed">Use um alvo sem risco para testar dano, jutsus e equipamentos. Não concede recompensas.</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <span className="bg-green/10 border border-green/40 text-green px-2 py-1 rounded text-xs">Seguro</span>
            <span className="bg-white/5 border border-line text-muted px-2 py-1 rounded text-xs">Sem custo</span>
          </div>
          <button className="btn-ghost w-full mt-2" onClick={handleFreeTraining} disabled={loadingId !== null}>
            Bater no Boneco
          </button>
        </section>

        <section className="flex flex-col gap-4 bg-gradient-to-b from-gold/10 to-ink-card border border-gold/30 p-6 rounded-lg transition-transform hover:-translate-y-1 hover:shadow-lg min-h-[260px]">
          <div className="w-12 h-12 flex items-center justify-center bg-ink-raised border border-line-bright rounded-md text-2xl">⚔️</div>
          <h3 className="font-shippori text-xl font-bold text-paper">Combate Real</h3>
          <p className="text-muted-bright text-sm leading-relaxed">Rastreia um instrutor ou oponente parelho para uma luta completa com risco e progressão.</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <span className="bg-gold/10 border border-gold text-gold px-2 py-1 rounded text-xs">Recomendado</span>
            <span className="bg-white/5 border border-line text-muted px-2 py-1 rounded text-xs">NPC ou rival</span>
          </div>
          <button className="btn-primary w-full mt-2" onClick={handleSearch} disabled={loadingId !== null}>
            {loadingId === 'search' ? 'Rastreando...' : 'Procurar Luta'}
          </button>
        </section>

        <section className="flex flex-col gap-4 bg-ink-card border border-line-solid p-6 rounded-lg transition-transform hover:-translate-y-1 hover:shadow-lg min-h-[260px]">
          <div className="w-12 h-12 flex items-center justify-center bg-ink-raised border border-line-bright rounded-md text-2xl">⚡</div>
          <h3 className="font-shippori text-xl font-bold text-paper">Incursão (Raid)</h3>
          <p className="text-muted-bright text-sm leading-relaxed">Lute várias vezes seguidas sem sair do combate. Custa Stamina antecipada — recompensas acumulam a cada vitória.</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <span className="bg-gold/10 border border-gold text-gold px-2 py-1 rounded text-xs">{RAID_STAMINA_COST} ST/luta</span>
            <span className="bg-white/5 border border-line text-muted px-2 py-1 rounded text-xs">Stamina: {player.stamina ?? calculateStamina(player)}</span>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <div className="flex flex-row gap-2 w-full">
              <button className="btn-ghost flex-1" onClick={() => handleRaid(3)} disabled={loadingId !== null}>
                Raid 3x
              </button>
              <button className="btn-primary flex-1" onClick={() => handleRaid(5)} disabled={loadingId !== null}>
                {loadingId === 'raid' ? '...' : 'Raid 5x'}
              </button>
            </div>
            {(player.dojo_clears || player.wins_dojo || 0) >= 3 && (
              <div className="flex flex-row gap-2 w-full">
                <button className="btn-ghost flex-1 text-gold border-gold" onClick={() => handleQuickClear(3)} disabled={loadingId !== null}>
                  ⚡ Limpar 3x
                </button>
                <button className="btn-ghost flex-1 text-gold border-gold" onClick={() => handleQuickClear(5)} disabled={loadingId !== null}>
                  ⚡ Limpar 5x
                </button>
              </div>
            )}
          </div>
        </section>

        <section className={`flex flex-col gap-4 border p-6 rounded-lg transition-transform hover:-translate-y-1 hover:shadow-lg min-h-[260px] ${isAkatsuki ? 'bg-gradient-to-b from-gold/10 to-ink-card border-gold/30' : 'bg-gradient-to-b from-danger/10 to-ink-card border-danger/30'}`}>
          <div className="w-12 h-12 flex items-center justify-center bg-ink-raised border border-line-bright rounded-md text-2xl">{isAkatsuki ? '☁️' : '⛔'}</div>
          <h3 className="font-shippori text-xl font-bold text-paper">{isAkatsuki ? 'Caçada Jinchuuriki' : 'Renegado'}</h3>
          <p className="text-muted-bright text-sm leading-relaxed">
            {isAkatsuki
              ? 'Rastreie portadores de Bijuus para cumprir os objetivos da organização. Alvos são extremamente perigosos.'
              : 'Ataque um companheiro de vila. Se vencer, você rasga a bandana e entra para a Akatsuki.'}
          </p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <span className={`px-2 py-1 rounded text-xs ${isAkatsuki ? 'bg-gold/10 border border-gold text-gold' : 'bg-seal-glow border border-seal-bright text-seal-bright'}`}>{isAkatsuki ? 'Objetivo' : 'Permanente'}</span>
            <span className="bg-white/5 border border-line text-muted px-2 py-1 rounded text-xs">Alto risco</span>
          </div>
          <button
            className={`w-full mt-2 ${isAkatsuki ? 'btn-primary' : 'btn-danger'}`}
            onClick={isAkatsuki ? handleBijuuHunt : handleBetrayal}
            disabled={loadingId !== null}
          >
            {isAkatsuki
              ? (loadingId === 'hunt' ? 'Rastreando...' : 'Caçar Jinchuuriki')
              : (loadingId === 'betray' ? 'Rastreando...' : 'Trair a Vila')}
          </button>
        </section>
      </div>

      <div className="mt-8 p-4 bg-gold/5 border border-gold/20 rounded-lg text-sm">
        <strong className="text-paper">Dica:</strong> use o Treinamento Livre depois de trocar equipamentos ou jutsus. Para progressão real, vá em Combate Real.
      </div>
    </div>
  );
}
