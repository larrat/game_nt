import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules, generateDynamicRogueNinja, getDynamicNpcJutsus } from '../utils/engine';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { useGameConfig } from '../context/GameConfigContext';

export default function Dojo({ player }) {
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

  const fetchRivalJutsus = async (rivalId) => {
    const { data: rival } = await supabase
      .from('players')
      .select('jutsus_learned')
      .eq('id', rivalId)
      .single();

    const learned = Array.isArray(rival?.jutsus_learned) ? rival.jutsus_learned : [];
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

    let query = supabase
      .from('players')
      .select('*')
      .neq('id', player.id)
      .eq('village_id', player.village_id)
      .gte('level', rules.minLvl)
      .lte('level', rules.maxLvl)
      .limit(5);

    if (rules.targetRanks && rules.targetRanks.length > 0) {
      query = query.in('rank', rules.targetRanks);
    }

    const { data: targets } = await query;

    setLoadingId(null);

    if (targets && targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const targetJutsus = await fetchRivalJutsus(target.id);

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
        xpReward: Math.floor((target.level * 100) + 200),
        ryouReward: Math.floor((target.level * 50) + 100),
        desc: 'Você está prestes a cometer alta traição contra um companheiro de vila!'
      };
      
      return navigate('/combate', { state: { bgType: 'dojo', npc: mirrorNpc, isMirror: true, isBetrayal: true } });
    } else {
      addToast('Não há membros de sua vila por perto no momento para trair.', 'info');
    }
  };

  const handleBijuuHunt = async () => {
    setLoadingId('hunt');
    await new Promise(r => setTimeout(r, 2000));

    // Busca Jinchuurikis (tem_bijuu = true)
    const { data: targets } = await supabase
      .from('players')
      .select('*')
      .neq('id', player.id)
      .eq('has_bijuu', true)
      .limit(5);

    setLoadingId(null);

    if (targets && targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      const mirrorNpc = {
        id: `bijuu_${target.id}`,
        real_id: target.id,
        name: target.name + ' (Jinchuuriki)',
        avatar: target.avatar || '👤',
        level: target.level + 5, // Jinchuurikis são buffados no pvp assimétrico
        hp: calculateHP(target) * (Number(gameConfig?.bijuu_hp_mult) || 2.0), // Multiplicador de HP
        chakra: calculateChakra(target) * (Number(gameConfig?.bijuu_chakra_mult) || 3.0),
        atk: calculateAtkTaiBuk(target) * 1.5,
        def: calculateDefTaiBuk(target) * 1.5,
        element: target.element,
        xpReward: Math.floor((target.level * 300) + 500),
        ryouReward: Math.floor((target.level * 150) + 300),
        desc: 'Você rastreou uma Bijuu! Extraia o chakra para a Akatsuki!',
        isBijuuHunt: true
      };
      
      return navigate('/combate', { state: { bgType: 'dojo', npc: mirrorNpc, isMirror: true, isBijuuHunt: true } });
    } else {
      addToast('O radar da Akatsuki não encontrou nenhum Jinchuuriki no momento.', 'info');
    }
  };

  const handleFreeTraining = () => {
    const dummyNPC = {
      id: 'dummy',
      name: 'Boneco de Madeira',
      avatar: '🪵',
      level: 1,
      hp: 9999, // Muito HP para não morrer rápido
      chakra: 0,
      atk: 0, // Não bate de volta
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

      <div className="element-summary">
        <div className="summary-tile">
          <div className="label">Seu nível</div>
          <div className="value">Nv. {player.level}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Graduação</div>
          <div className="value">{player.rank || 'Estudante'}</div>
        </div>
        <div className="summary-tile">
          <div className="label">Estado</div>
          <div className="value">{loadingId ? 'Rastreando...' : 'Disponível'}</div>
        </div>
      </div>

      <div className="action-grid">
        <section className="action-card">
          <div className="action-card-icon">🪵</div>
          <h3>Treinamento Livre</h3>
          <p>Use um alvo sem risco para testar dano, jutsus e equipamentos. Não concede recompensas.</p>
          <div className="meta-row">
            <span className="badge badge-green">Seguro</span>
            <span className="badge badge-muted">Sem custo</span>
          </div>
          <button className="btn-ghost" onClick={handleFreeTraining} disabled={loadingId !== null} style={{ width: '100%' }}>
            Bater no Boneco
          </button>
        </section>

        <section className="action-card featured">
          <div className="action-card-icon">⚔️</div>
          <h3>Combate Real</h3>
          <p>Rastreia um instrutor ou oponente parelho para uma luta completa com risco e progressão.</p>
          <div className="meta-row">
            <span className="badge badge-gold">Recomendado</span>
            <span className="badge badge-muted">NPC ou rival</span>
          </div>
          <button className="btn-primary" onClick={handleSearch} disabled={loadingId !== null} style={{ width: '100%' }}>
            <span>{loadingId === 'search' ? 'Rastreando...' : 'Procurar Luta'}</span>
            <div className="stamp"></div>
          </button>
        </section>

        <section className={`action-card ${isAkatsuki ? 'featured' : 'danger-zone'}`}>
          <div className="action-card-icon">{isAkatsuki ? '☁️' : '⛔'}</div>
          <h3>{isAkatsuki ? 'Caçada Jinchuuriki' : 'Renegado'}</h3>
          <p>
            {isAkatsuki
              ? 'Rastreie portadores de Bijuus para cumprir os objetivos da organização. Alvos são extremamente perigosos.'
              : 'Ataque um companheiro de vila. Se vencer, você rasga a bandana e entra para a Akatsuki.'}
          </p>
          <div className="meta-row">
            <span className={`badge ${isAkatsuki ? 'badge-gold' : 'badge-red'}`}>{isAkatsuki ? 'Objetivo' : 'Permanente'}</span>
            <span className="badge badge-muted">Alto risco</span>
          </div>
          <button
            className={isAkatsuki ? 'btn-primary' : 'btn-danger'}
            onClick={isAkatsuki ? handleBijuuHunt : handleBetrayal}
            disabled={loadingId !== null}
            style={{ width: '100%' }}
          >
            <span>
              {isAkatsuki
                ? (loadingId === 'hunt' ? 'Rastreando...' : 'Caçar Jinchuuriki')
                : (loadingId === 'betray' ? 'Rastreando...' : 'Trair a Vila')}
            </span>
            {isAkatsuki && <div className="stamp"></div>}
          </button>
        </section>
      </div>

      <div className="info-banner" style={{ marginTop: '24px' }}>
        <strong className="paper">Dica:</strong> use o Treinamento Livre depois de trocar equipamentos ou jutsus. Para progressão real, vá em Combate Real.
      </div>
    </div>
  );
}
