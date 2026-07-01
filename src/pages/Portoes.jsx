import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateAtkTaiBuk } from '../utils/engine';
import '../styles/main.css';

const PORTOES = [
  {
    id: 1,
    nome: '1º Portão — Abertura',
    kanji: '開門',
    color: '#4ade80',
    boost: { atk: 0.05, desc: '+5% de Ataque' },
    hpCusto: 0.05,
    desc: 'O primeiro passo além dos limites físicos. Libera o bloqueio básico do chakra no cérebro, aumentando levemente o poder de ataque.',
    reqLevel: 10,
  },
  {
    id: 2,
    nome: '2º Portão — Cura',
    kanji: '休門',
    color: '#22d3ee',
    boost: { atk: 0.10, desc: '+10% de Ataque' },
    hpCusto: 0.10,
    desc: 'O fluxo de chakra é intensificado. A pele enrojece levemente com o esforço e o corpo atinge um novo patamar.',
    reqLevel: 20,
  },
  {
    id: 3,
    nome: '3º Portão — Vida',
    kanji: '生門',
    color: '#facc15',
    boost: { atk: 0.20, desc: '+20% de Ataque' },
    hpCusto: 0.20,
    desc: 'O coração acelera além do normal. Músculos se expandem com poder bruto à custa da integridade do corpo.',
    reqLevel: 30,
  },
  {
    id: 4,
    nome: '4º Portão — Dano',
    kanji: '傷門',
    color: '#f97316',
    boost: { atk: 0.35, desc: '+35% de Ataque' },
    hpCusto: 0.35,
    desc: 'O sangue começa a transpirar pelos poros. O limite do corpo humano começa a ser ultrapassado.',
    reqLevel: 40,
  },
  {
    id: 5,
    nome: '5º Portão — Fechamento',
    kanji: '杜門',
    color: '#ef4444',
    boost: { atk: 0.50, desc: '+50% de Ataque' },
    hpCusto: 0.50,
    desc: 'O corpo opera a 50% além do limite. A força é sobrehumana, mas os ossos começam a trincar.',
    reqLevel: 50,
  },
  {
    id: 6,
    nome: '6º Portão — Visão',
    kanji: '景門',
    color: '#c084fc',
    boost: { atk: 0.70, desc: '+70% de Ataque' },
    hpCusto: 0.65,
    desc: 'Os vasos sanguíneos explodem na pele. A visão além do normal é atingida — o preço é severo.',
    reqLevel: 60,
  },
  {
    id: 7,
    nome: '7º Portão — Maravilha',
    kanji: '驚門',
    color: '#f43f5e',
    boost: { atk: 1.00, desc: '+100% de Ataque' },
    hpCusto: 0.80,
    desc: 'O suor se torna vapor. O poder duplica. Porém, o corpo começa a se destruir em tempo real.',
    reqLevel: 70,
  },
  {
    id: 8,
    nome: '8º Portão — Morte',
    kanji: '死門',
    color: '#b91c1c',
    boost: { atk: 2.00, desc: '+200% de Ataque' },
    hpCusto: 1.00,
    desc: 'O portal proibido. Poder absoluto por um instante — ao custo da própria vida. Após abrir o 8º Portão, você desmaíará inevitavelmente.',
    reqLevel: 80,
  },
];

export default function Portoes({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activePortao, setActivePortao] = useState(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  if (!player) return null;

  const maxHP = calculateHP(player);
  const baseAtk = calculateAtkTaiBuk(player);

  // Verifica cooldown (usa campo portoes_used_at no player)
  useEffect(() => {
    if (!player.portoes_used_at) return;
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutos
    const usedAt = new Date(player.portoes_used_at).getTime();
    const interval = setInterval(() => {
      const diff = COOLDOWN_MS - (Date.now() - usedAt);
      if (diff <= 0) {
        setCooldownLeft(0);
        clearInterval(interval);
      } else {
        setCooldownLeft(Math.ceil(diff / 1000));
      }
    }, 1000);
    // Define imediatamente
    const diff = COOLDOWN_MS - (Date.now() - usedAt);
    setCooldownLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    return () => clearInterval(interval);
  }, [player.portoes_used_at]);

  const formatCooldown = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleAbrir = async (portao) => {
    if (cooldownLeft > 0) {
      addToast(`Os 8 Portões ainda estão em recarga. (${formatCooldown(cooldownLeft)})`, 'error');
      return;
    }
    if (player.level < portao.reqLevel) {
      addToast(`Você precisa ser Nível ${portao.reqLevel} para abrir o ${portao.nome}.`, 'error');
      return;
    }
    if (player.is_fainted) {
      addToast('Você não pode abrir os Portões estando inconsciente!', 'error');
      return;
    }

    const hpCusto = Math.floor(maxHP * portao.hpCusto);
    const currentHP = player.hp !== undefined && player.hp !== null ? player.hp : maxHP;
    const novoHP = Math.max(0, currentHP - hpCusto);
    const isMortal = portao.id === 8;

    setLoading(true);
    setActivePortao(portao.id);

    const updates = {
      hp: novoHP,
      portoes_used_at: new Date().toISOString(),
    };

    if (isMortal || novoHP === 0) {
      updates.is_fainted = true;
      updates.fainted_at = new Date().toISOString();
    }

    const { error } = await supabase.from('players').update(updates).eq('id', player.id);

    if (error) {
      addToast('Erro ao abrir portão: ' + error.message, 'error');
    } else {
      await updatePlayer(player.user_id);
      if (isMortal) {
        addToast(`☠️ O 8º Portão foi aberto! Poder absoluto... mas você caiu inconsciente.`, 'error');
      } else {
        addToast(`⚡ ${portao.nome} ativado! ${portao.boost.desc} por 3 rodadas. (-${hpCusto} HP)`, 'success');
      }
    }

    setLoading(false);
    setActivePortao(null);
  };

  const currentHP = player.hp !== undefined && player.hp !== null ? player.hp : maxHP;
  const hpPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

  return (
    <div className="page">
      <PageHeader
        eyebrow="Técnica Proibida"
        title="8 Portões do Chakra"
        subtitle="Abra os portões do corpo para liberar poder além dos limites humanos — à custa da sua própria vida."
      />

      {/* Status atual */}
      <div className="card" style={{ marginBottom: '32px', border: '1px solid var(--line)' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div className="flex-col" style={{ gap: '12px', flex: '1 1 300px' }}>
            <div className="flex-between" style={{ fontSize: '12px' }}>
              <span className="muted uppercase mono" style={{ letterSpacing: '1px' }}>Saúde Atual</span>
              <span className="mono" style={{ color: hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#facc15' : '#ef4444' }}>
                {currentHP} / {maxHP}
              </span>
            </div>
            <div className="progress-track" style={{ height: '10px' }}>
              <div className="progress-fill red" style={{ width: `${hpPercent}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div className="flex-col" style={{ alignItems: 'flex-end', gap: '4px' }}>
            <div className="muted mono" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Ataque Base</div>
            <div className="gold mono" style={{ fontSize: '24px' }}>{baseAtk}</div>
          </div>
          {cooldownLeft > 0 && (
            <div className="card" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px 24px', textAlign: 'center' }}>
              <div className="muted mono" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Recarga dos Portões</div>
              <div className="danger mono" style={{ fontSize: '22px', fontWeight: 'bold' }}>{formatCooldown(cooldownLeft)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Aviso */}
      <div className="card" style={{ background: 'rgba(239,68,68,0.05)', border: '1px dashed rgba(239,68,68,0.4)', marginBottom: '32px' }}>
        <p className="muted" style={{ fontSize: '13px', lineHeight: '1.6' }}>
          ⚠️ <strong className="paper">Atenção:</strong> Cada portão consome uma porcentagem de seu HP máximo. Se o HP chegar a zero, você desmaíará.
          O <strong className="danger">8º Portão</strong> causa desmaio imediato mas concede +200% de Ataque por 1 rodada.
          Há um <strong className="paper">cooldown de 30 minutos</strong> entre ativações.
        </p>
      </div>

      {/* Grid dos 8 portões */}
      <div className="grid-2" style={{ gap: '24px' }}>
        {PORTOES.map((portao) => {
          const isUnlocked = player.level >= portao.reqLevel;
          const hpCusto = Math.floor(maxHP * portao.hpCusto);
          const atkComBoost = Math.floor(baseAtk * (1 + portao.boost.atk));
          const isLoading = loading && activePortao === portao.id;

          return (
            <div
              key={portao.id}
              className="card"
              style={{
                border: `1px solid ${isUnlocked ? portao.color + '55' : 'var(--line)'}`,
                opacity: isUnlocked ? 1 : 0.5,
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              {/* Linha decorativa no topo */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: isUnlocked ? portao.color : 'var(--line)' }} />

              <div className="flex-between" style={{ marginBottom: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div className="mono" style={{ color: portao.color, fontSize: '28px', lineHeight: 1, marginBottom: '4px' }}>
                    {portao.kanji}
                  </div>
                  <div className="paper" style={{ fontWeight: 600, fontSize: '14px' }}>{portao.nome}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="muted mono" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Req. Nível</div>
                  <div className="mono" style={{ color: isUnlocked ? 'var(--gold)' : 'var(--danger)', fontSize: '18px', fontWeight: 'bold' }}>
                    {portao.reqLevel}
                  </div>
                </div>
              </div>

              <p className="muted" style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px' }}>
                {portao.desc}
              </p>

              <div className="grid-2" style={{ gap: '8px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--ink-raised)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: `1px solid ${portao.color}33` }}>
                  <div className="muted mono" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>Ataque c/ Boost</div>
                  <div className="mono" style={{ color: portao.color, fontSize: '16px', fontWeight: 'bold' }}>{atkComBoost}</div>
                </div>
                <div style={{ background: 'var(--ink-raised)', padding: '8px', borderRadius: '6px', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="muted mono" style={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>Custo de HP</div>
                  <div className="mono danger" style={{ fontSize: '16px', fontWeight: 'bold' }}>-{hpCusto}</div>
                </div>
              </div>

              <button
                className={portao.id === 8 ? 'btn-danger' : 'btn-ghost'}
                style={{
                  width: '100%',
                  borderColor: portao.color,
                  color: isUnlocked ? portao.color : 'var(--muted)',
                  opacity: isUnlocked && !loading && cooldownLeft === 0 ? 1 : 0.5,
                  cursor: isUnlocked && !loading && cooldownLeft === 0 ? 'pointer' : 'not-allowed',
                }}
                disabled={!isUnlocked || loading || cooldownLeft > 0}
                onClick={() => handleAbrir(portao)}
              >
                {isLoading ? 'Abrindo...' : !isUnlocked ? `🔒 Level ${portao.reqLevel}` : cooldownLeft > 0 ? `⏳ ${formatCooldown(cooldownLeft)}` : `Abrir ${portao.kanji}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
