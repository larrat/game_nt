import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/main.css';

export default function Combate({ player, updatePlayer }) {
  const location = useLocation();
  const navigate = useNavigate();
  const npcInit = location.state?.npc;

  // Se não tiver NPC (ex: acessou URL direta), volta pro Dojo
  useEffect(() => {
    if (!npcInit || !player) {
      navigate('/dojo');
    }
  }, [npcInit, player, navigate]);

  if (!npcInit || !player) return null;

  // Calculando os status máximos do Jogador
  const maxPlayerHP = 100 + (player.level * 20) + ((player.stamina_pts || 0) * 2);
  const maxPlayerCP = 50 + (player.level * 10) + ((player.stamina_pts || 0) * 1);
  const playerAtk = Math.floor((player.tai || 0) / 2) + 5;
  const playerDef = Math.floor((player.def || 0) / 2);

  // Estados da Batalha
  const [playerHP, setPlayerHP] = useState(maxPlayerHP);
  const [playerCP, setPlayerCP] = useState(maxPlayerCP);
  
  const [npcHP, setNpcHP] = useState(npcInit.hp);
  const [npcCP, setNpcCP] = useState(npcInit.chakra);

  const [logs, setLogs] = useState([`Um combate se inicia contra ${npcInit.name}!`]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [battleResult, setBattleResult] = useState(null); // 'win', 'lose', 'flee'
  const [loading, setLoading] = useState(false);

  const logsEndRef = useRef(null);

  // Scroll to bottom dos logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
  };

  const handleWin = async () => {
    setLoading(true);
    const newXp = player.xp + npcInit.xpReward;
    const newRyous = player.ryous + npcInit.ryouReward;
    let newLevel = player.level;

    while (newXp >= newLevel * 1000) {
      newLevel++;
    }

    await supabase
      .from('players')
      .update({ xp: newXp, level: newLevel, ryous: newRyous })
      .eq('id', player.id);

    await updatePlayer(player.user_id);
    navigate('/dojo');
  };

  const handleLoseOrFlee = () => {
    navigate('/dojo');
  };

  const npcTurn = (currentNpcHP) => {
    if (currentNpcHP <= 0) return; // NPC morto não ataca

    setTimeout(() => {
      addLog(`${npcInit.name} está atacando...`);
      setTimeout(() => {
        const damage = Math.max(1, npcInit.atk - playerDef);
        const newPlayerHP = Math.max(0, playerHP - damage);
        
        setPlayerHP(newPlayerHP);
        addLog(`${npcInit.name} causou ${damage} de dano!`);

        if (newPlayerHP <= 0) {
          addLog('Você foi derrotado...');
          setBattleResult('lose');
        } else {
          setIsPlayerTurn(true);
        }
      }, 1000);
    }, 1000);
  };

  const handleBasicAttack = () => {
    if (!isPlayerTurn || battleResult) return;
    setIsPlayerTurn(false);

    const damage = Math.max(1, playerAtk - Math.floor(npcInit.def / 2));
    const newNpcHP = Math.max(0, npcHP - damage);
    
    setNpcHP(newNpcHP);
    addLog(`Você usou Ataque Básico (Taijutsu) e causou ${damage} de dano!`);

    if (newNpcHP <= 0) {
      addLog(`Vitória! Você derrotou ${npcInit.name}.`);
      addLog(`Recompensas: +${npcInit.xpReward} XP, +${npcInit.ryouReward} Ryous.`);
      setBattleResult('win');
    } else {
      npcTurn(newNpcHP);
    }
  };

  const handleJutsu = (jutsu) => {
    if (!isPlayerTurn || battleResult) return;
    
    const cost = 20; // Custo genérico provisório
    if (playerCP < cost) {
      return alert("Chakra insuficiente!");
    }

    setIsPlayerTurn(false);
    setPlayerCP(prev => prev - cost);
    
    // Dano mágico básico
    const magicDmg = Math.floor((player.nin || 0) / 2) + 15;
    const damage = Math.max(1, magicDmg - Math.floor(npcInit.def / 2));
    const newNpcHP = Math.max(0, npcHP - damage);

    setNpcHP(newNpcHP);
    addLog(`Você usou [${jutsu.name}] e causou ${damage} de dano elemental! (Custou ${cost} CP)`);

    if (newNpcHP <= 0) {
      addLog(`Vitória magistral! Você derrotou ${npcInit.name}.`);
      addLog(`Recompensas: +${npcInit.xpReward} XP, +${npcInit.ryouReward} Ryous.`);
      setBattleResult('win');
    } else {
      npcTurn(newNpcHP);
    }
  };

  const handleFlee = () => {
    addLog('Você fugiu da batalha como um covarde...');
    setBattleResult('flee');
  };

  // Porcentagens para as barras
  const pHPPercent = (playerHP / maxPlayerHP) * 100;
  const pCPPercent = (playerCP / maxPlayerCP) * 100;
  const nHPPercent = (npcHP / npcInit.hp) * 100;
  const nCPPercent = (npcCP / npcInit.chakra) * 100;

  return (
    <div>
      <div className="topbar" style={{ marginBottom: '32px', flexDirection: 'column', gap: '8px' }}>
        <div className="eyebrow">A Fúria dos Shinobis</div>
        <h1 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '30px', fontWeight: 600 }}>Combate</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* INIMIGO */}
        <div className="card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '80px', background: 'var(--ink-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: '1px solid var(--seal-bright)' }}>
            {npcInit.avatar}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', color: 'var(--seal-bright)', marginBottom: '8px' }}>{npcInit.name} (Lvl. {npcInit.level})</h3>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>HP</span><span>{npcHP} / {npcInit.hp}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--ink)' }}>
                <div style={{ width: `${nHPPercent}%`, height: '100%', background: '#4ade80', transition: 'width 0.3s' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>Chakra</span><span>{npcCP} / {npcInit.chakra}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--ink)' }}>
                <div style={{ width: `${nCPPercent}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* LOG DE BATALHA */}
        <div className="card" style={{ background: '#121216', height: '250px', overflowY: 'auto', padding: '16px', border: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', lineHeight: '1.6' }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '8px', color: log.includes('Você foi derrotado') || log.includes('causou') ? (log.includes('Você usou') ? '#4ade80' : '#ef4444') : 'var(--muted)' }}>
              &gt; {log}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* PLAYER */}
        <div className="card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '18px', color: 'var(--paper)', marginBottom: '8px' }}>{player.name} (Lvl. {player.level})</h3>
            
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>HP</span><span>{playerHP} / {maxPlayerHP}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--ink)' }}>
                <div style={{ width: `${pHPPercent}%`, height: '100%', background: '#4ade80', transition: 'width 0.3s' }}></div>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>
                <span>Chakra</span><span>{playerCP} / {maxPlayerCP}</span>
              </div>
              <div style={{ height: '8px', background: 'var(--ink)' }}>
                <div style={{ width: `${pCPPercent}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>
          <div style={{ width: '80px', height: '80px', background: 'var(--ink-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', border: '1px solid var(--line)' }}>
            忍
          </div>
        </div>

        {/* PAINEL DE AÇÕES */}
        {!battleResult ? (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <button 
              className="btn-ghost" 
              style={{ flex: 1, padding: '16px', border: '1px solid var(--line)', opacity: isPlayerTurn ? 1 : 0.5 }} 
              disabled={!isPlayerTurn}
              onClick={handleBasicAttack}
            >
              <div style={{ fontSize: '20px', marginBottom: '8px' }}>👊</div>
              Ataque Básico
            </button>
            
            {player.activeJutsus?.map((jutsu, idx) => (
              <button 
                key={idx}
                className="btn-ghost" 
                style={{ flex: 1, padding: '16px', border: '1px solid var(--seal-bright)', opacity: isPlayerTurn ? 1 : 0.5 }} 
                disabled={!isPlayerTurn}
                onClick={() => handleJutsu(jutsu)}
              >
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>📜</div>
                {jutsu.name}
              </button>
            ))}

            <button 
              className="btn-ghost" 
              style={{ width: '100%', padding: '16px', border: '1px dashed #ef4444', color: '#ef4444', opacity: isPlayerTurn ? 1 : 0.5, marginTop: '8px' }} 
              disabled={!isPlayerTurn}
              onClick={handleFlee}
            >
              Fugir da Batalha
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', border: `1px solid ${battleResult === 'win' ? 'var(--gold)' : '#ef4444'}`, background: 'var(--ink-soft)' }}>
            <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '24px', color: battleResult === 'win' ? 'var(--gold)' : '#ef4444', marginBottom: '16px' }}>
              {battleResult === 'win' ? 'Vitória!' : (battleResult === 'lose' ? 'Derrota' : 'Fuga')}
            </h2>
            <button className="btn-primary" onClick={battleResult === 'win' ? handleWin : handleLoseOrFlee} disabled={loading}>
              <span>{loading ? 'Retornando...' : 'Retornar ao Dojo'}</span>
              <div className="stamp"></div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
