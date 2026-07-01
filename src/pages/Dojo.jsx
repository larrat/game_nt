import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { calculateHP, calculateChakra, calculateAtkTaiBuk, calculateDefTaiBuk, getPvPMatchRules } from '../utils/engine';
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
    const { data } = await supabase
      .from('player_jutsus')
      .select('*, jutsus(*, jutsu_effects(*, status_effects(*)))')
      .eq('player_id', rivalId)
      .eq('is_equipped', true);
    return data ? data.map(j => j.jutsus) : [];
  };

  const getDynamicNpcJutsus = (npc) => {
    if (!npc.element) return [];
    return [{
      name: `Liberação de ${npc.element}: Jutsu Padrão`,
      element: npc.element,
      damage: Math.floor(npc.level * 1.5) + 15,
      chakraCost: 20,
      accuracy: 90
    }];
  };

  const generateDynamicRogueNinja = (playerLevel) => {
    const levelDiff = Math.floor(Math.random() * 6) - 2; // -2 a +3
    const npcLevel = Math.max(1, playerLevel + levelDiff);
    
    const elements = ['Katon', 'Futon', 'Suiton', 'Doton', 'Raiton'];
    const element = elements[Math.floor(Math.random() * elements.length)];
    
    const clans = ['Uchiha', 'Senju', 'Hyuga', 'Uzumaki', 'Inuzuka', 'Aburame', 'Akimichi', 'Nara', 'Yamanaka', 'Hozuki', 'Kaguya', 'Yuki'];
    const clan = clans[Math.floor(Math.random() * clans.length)];
    const titles = ['Renegado', 'Mercenário', 'das Sombras', 'Desgarrado', 'Sanguinário', 'Oculto', 'Assassino'];
    const title = titles[Math.floor(Math.random() * titles.length)];
    
    const avatars = ['🥷', '👹', '👺', '👻', '💀', '👽', '👤', '🗡️'];
    
    const npc = {
      id: `rogue_${Date.now()}`,
      name: `${clan} ${title}`,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
      level: npcLevel,
      hp: 100 + (npcLevel * 45),
      chakra: 50 + (npcLevel * 25),
      atk: 10 + (npcLevel * 4),
      def: 5 + (npcLevel * 3),
      element: element,
      xpReward: Math.floor((npcLevel * 50) + 100),
      ryouReward: Math.floor((npcLevel * 25) + 50),
      desc: `Você foi emboscado por um ninja sem escrúpulos em treinamento!`
    };
    
    npc.activeJutsus = getDynamicNpcJutsus(npc);
    return npc;
  };

  const handleSearch = async () => {
    setLoadingId('search');
    await new Promise(r => setTimeout(r, 2000));
    
    const roll = Math.random();
    
    const pvpChance = Number(gameConfig?.dojo_pvp_chance) || 0.25;
    const npcChance = Number(gameConfig?.dojo_story_npc_chance) || 0.35;
    
    // 1) X% de chance de Invasão (Mirror)
    if (roll < pvpChance) {
      const rules = getPvPMatchRules(player.rank, player.level);
      
      let query = supabase
        .from('players')
        .select('*')
        .neq('id', player.id)
        .gte('level', rules.minLvl)
        .lte('level', rules.maxLvl)
        .limit(5);
        
      if (rules.targetRanks && rules.targetRanks.length > 0) {
        query = query.in('rank', rules.targetRanks);
      }
        
      const { data: rivals } = await query;
        
      if (rivals && rivals.length > 0) {
        const rival = rivals[Math.floor(Math.random() * rivals.length)];
        const isAlt = rival.user_id === player.user_id;
        const rivalJutsus = await fetchRivalJutsus(rival.id);
        
        const mirrorNpc = {
          id: `rival_${rival.id}`,
          name: rival.name,
          avatar: rival.avatar || '👤',
          level: rival.level,
          hp: calculateHP(rival),
          chakra: calculateChakra(rival),
          atk: calculateAtkTaiBuk(rival),
          def: calculateDefTaiBuk(rival),
          element: rival.element,
          activeJutsus: rivalJutsus,
          xpReward: Math.floor((rival.level * 60) + 150),
          ryouReward: Math.floor((rival.level * 30) + 80),
          desc: isAlt ? 'ALERTA! Você encontrou seu próprio alter ego (Wintrading Shield ativado)!' : 'ALERTA! Um Ninja Rival interceptou seu treinamento!'
        };
        
        setLoadingId(null);
        return navigate('/combate', { state: { npc: mirrorNpc, isMirror: true, isAltAutoBattle: isAlt } });
      }
    }
    
    // 2) Y% de chance de NPC do Banco de Dados (da História)
    if (roll >= pvpChance && roll < (pvpChance + npcChance)) {
      const { data: dojoNpcs } = await supabase
        .from('npcs')
        .select('*')
        .eq('is_map_npc', false)
        .lte('level', player.level + 5);

      if (dojoNpcs && dojoNpcs.length > 0) {
        const chosenNPC = dojoNpcs[Math.floor(Math.random() * dojoNpcs.length)];
        chosenNPC.activeJutsus = getDynamicNpcJutsus(chosenNPC);
        setLoadingId(null);
        return navigate('/combate', { state: { npc: chosenNPC, isMirror: false } });
      }
    }

    // 3) 40% (ou fallback dos de cima): Gerar Ninja Renegado Dinâmico
    const rogue = generateDynamicRogueNinja(player.level);
    setLoadingId(null);
    return navigate('/combate', { state: { npc: rogue, isMirror: false } });
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
      
      return navigate('/combate', { state: { npc: mirrorNpc, isMirror: true, isBetrayal: true } });
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
      
      return navigate('/combate', { state: { npc: mirrorNpc, isMirror: true, isBijuuHunt: true } });
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
    navigate('/combate', { state: { npc: dummyNPC, isMirror: false, fromDojoFree: true } });
  };

  return (
    <div className="page">
      <PageHeader eyebrow='Treinamento e Combate' title='Dojo da Vila' subtitle='Teste suas habilidades e desafie oponentes.' />

      <div className="info-banner" style={{ marginBottom: '48px', padding: '32px' }}>
        <h3 className="section-title gold" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '12px' }}>A Arena de Treinamento</h3>
        <p className="muted" style={{ lineHeight: '1.6' }}>
          O Dojo é o local onde você pode testar suas habilidades contra Mestres locais ou encontrar Invasores de outras vilas.<br/>
          <strong className="paper">Aviso:</strong> Se quiser apenas bater sem correr riscos, use o Treinamento Livre.
        </p>
      </div>

      <div className="grid-2">
        {/* Treino Livre */}
        <div className="card flex-col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '320px', textAlign: 'center', padding: '48px', borderStyle: 'dashed', background: 'transparent' }}>
          <div className="idle-ui flex-col" style={{ alignItems: 'center' }}>
            <div style={{ fontSize: '64px', opacity: 0.8 }}>🪵</div>
            <h2 className="page-title">Treinamento Livre</h2>
            <p className="muted" style={{ maxWidth: '400px', lineHeight: '1.6', marginBottom: '24px' }}>
              Duele contra um Boneco de Madeira infinito. Ideal para testar o limite do seu dano, a eficácia dos seus novos Jutsus e Equipamentos. (Sem custo, sem recompensas).
            </p>
            <button className="btn-ghost" onClick={handleFreeTraining} style={{ padding: '16px 40px', fontSize: '16px' }}>
              Bater no Boneco
            </button>
          </div>
        </div>

        {/* Luta Rankeada / Invasão */}
        <div className="card-glass flex-col" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '320px', textAlign: 'center', padding: '48px' }}>
          {loadingId === 'search' ? (
            <div className="searching-ui" style={{ animation: 'pulse 2s infinite' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'hue-rotate(180deg)' }}>👁️</div>
              <h2 className="mono danger" style={{ marginBottom: '8px' }}>Rastreando Assinaturas de Chakra...</h2>
              <p className="muted">Buscando um oponente nas redondezas.</p>
            </div>
          ) : (
            <div className="idle-ui flex-col" style={{ alignItems: 'center' }}>
              <div style={{ fontSize: '64px', opacity: 0.8 }}>⚔️</div>
              <h2 className="page-title">Combate Real</h2>
              <p className="muted" style={{ maxWidth: '400px', lineHeight: '1.6', marginBottom: '24px' }}>
                Enfrente instrutores do Dojo ou sofra o risco de encontrar um Jogador Rival de outra vila invadindo seu espaço (25% chance PvP).
              </p>
              <button className="btn-primary" onClick={handleSearch} style={{ padding: '16px 40px', fontSize: '16px' }}>
                <span>Procurar Luta</span>
                <div className="stamp"></div>
              </button>
            </div>
          )}
        </div>
      </div>

      {player.village_id !== 8 && (
        <div className="card" style={{ marginTop: '32px', border: '1px dashed #ef4444', textAlign: 'center' }}>
          <h3 className="danger">Renegado (Traição)</h3>
          <p className="muted" style={{ maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            Se você atacar um companheiro da sua própria vila e vencer, você rasgará sua bandana e se juntará imediatamente à Akatsuki (Vila Secreta). Não há caminho de volta.
          </p>
          <button 
            className="btn-ghost" 
            style={{ borderColor: '#ef4444', color: '#ef4444' }} 
            onClick={handleBetrayal} 
            disabled={loadingId !== null}
          >
            {loadingId === 'betray' ? 'Rastreando companheiro...' : 'Trair a Vila'}
          </button>
        </div>
      )}

      {player.village_id === 8 && (
        <div className="card" style={{ marginTop: '32px', border: '1px solid var(--gold)', background: 'var(--ink-raised)', textAlign: 'center' }}>
          <h3 className="gold">Caçada Jinchuuriki (Objetivo da Organização)</h3>
          <p className="muted" style={{ maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            Como membro da Akatsuki, seu objetivo é rastrear e abater jogadores que portam Bijuus para extrair o chakra deles. Jinchuurikis são <strong>extremamente poderosos</strong>.
          </p>
          <button 
            className="btn-primary" 
            onClick={handleBijuuHunt} 
            disabled={loadingId !== null}
          >
            <span>{loadingId === 'hunt' ? 'Rastreando Besta...' : 'Caçar Jinchuuriki'}</span>
            <div className="stamp"></div>
          </button>
        </div>
      )}
    </div>
  );
}
