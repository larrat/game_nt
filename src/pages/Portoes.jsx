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

  // Early return removido (movido para o final dos hooks)

  const maxHP = calculateHP(player || {});
  const baseAtk = calculateAtkTaiBuk(player || {});

  // Verifica cooldown (usa campo portoes_used_at no player)
  useEffect(() => {
    if (!player?.portoes_used_at) return;
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
      await updatePlayer(player.id);
      if (isMortal) {
        addToast(`☠️ O 8º Portão foi aberto! Poder absoluto... mas você caiu inconsciente.`, 'error');
      } else {
        addToast(`⚡ ${portao.nome} ativado! ${portao.boost.desc} por 3 rodadas. (-${hpCusto} HP)`, 'success');
      }
    }

    setLoading(false);
    setActivePortao(null);
  };

  if (!player) return null;
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
      <div className="card mb-8 border-line-solid">
        <div className="flex-between flex-wrap gap-6 items-center">
          <div className="flex-col gap-3 flex-1-300">
            <div className="flex-between text-xs">
              <span className="muted uppercase mono tracking-wider">Saúde Atual</span>
              <span className={`mono ${hpPercent > 50 ? 'text-success' : hpPercent > 25 ? 'text-yellow-500' : 'text-danger'}`}>
                {currentHP} / {maxHP}
              </span>
            </div>
            <div className="progress-track h-3">
              <div className="progress-fill red transition-all duration-500" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
          <div className="flex-col items-end gap-1">
            <div className="muted mono text-xs uppercase">Ataque Base</div>
            <div className="gold mono text-3xl">{baseAtk}</div>
          </div>
          {cooldownLeft > 0 && (
            <div className="card bg-danger-alpha-08 border-line-solid border-danger-alpha-30 px-6 py-3 text-center">
              <div className="muted mono text-xs uppercase mb-1">Recarga dos Portões</div>
              <div className="danger mono text-xl font-bold">{formatCooldown(cooldownLeft)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Aviso */}
      <div className="card bg-danger-alpha-05 border-line-dashed border-danger-alpha-40 mb-8">
        <p className="muted text-sm leading-relaxed">
          ⚠️ <strong className="paper">Atenção:</strong> Cada portão consome uma porcentagem de seu HP máximo. Se o HP chegar a zero, você desmaíará.
          O <strong className="danger">8º Portão</strong> causa desmaio imediato mas concede +200% de Ataque por 1 rodada.
          Há um <strong className="paper">cooldown de 30 minutos</strong> entre ativações.
        </p>
      </div>

      {/* Grid dos 8 portões */}
      <div className="grid-2 gap-6">
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
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: isUnlocked ? portao.color : 'var(--line)' }} />

              <div className="flex-between mb-3 items-start">
                <div>
                  <div className="mono text-3xl leading-none mb-1" style={{ color: portao.color }}>
                    {portao.kanji}
                  </div>
                  <div className="paper font-semibold text-sm">{portao.nome}</div>
                </div>
                <div className="text-right">
                  <div className="muted mono text-xs uppercase mb-1">Req. Nível</div>
                  <div className="mono text-lg font-bold" style={{ color: isUnlocked ? 'var(--gold)' : 'var(--danger)' }}>
                    {portao.reqLevel}
                  </div>
                </div>
              </div>

              <p className="muted text-xs leading-relaxed mb-4">
                {portao.desc}
              </p>

              <div className="grid-2 gap-2 mb-4">
                <div className="bg-ink-raised p-2 rounded-md text-center" style={{ border: `1px solid ${portao.color}33` }}>
                  <div className="muted mono text-xs uppercase mb-1">Ataque c/ Boost</div>
                  <div className="mono text-md font-bold" style={{ color: portao.color }}>{atkComBoost}</div>
                </div>
                <div className="bg-ink-raised p-2 rounded-md text-center border-line-solid border-danger-alpha-20">
                  <div className="muted mono text-xs uppercase mb-1">Custo de HP</div>
                  <div className="mono danger text-md font-bold">-{hpCusto}</div>
                </div>
              </div>

              <button
                className={`${portao.id === 8 ? 'btn-danger' : 'btn-ghost'} w-full ${(!isUnlocked || loading || cooldownLeft > 0) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  borderColor: portao.color,
                  color: isUnlocked ? portao.color : 'var(--muted)',
                  opacity: isUnlocked && !loading && cooldownLeft === 0 ? 1 : 0.5,
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
