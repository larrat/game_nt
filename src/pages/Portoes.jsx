import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/challenges-v4.css';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateAtkTaiBuk } from '../utils/engine';
import '../styles/main.css';

const PORTOES = [
  {
    id: 1,
    nome: '1º Portão — Abertura',
    kanji: '開門',
    textClass: 'text-[#4ade80]',
    bgClass: 'bg-[#4ade80]',
    borderClass: 'border-[#4ade80]/35',
    innerBorderClass: 'border-[#4ade80]/20',
    boost: { atk: 0.05, desc: '+5% de Ataque' },
    hpCusto: 0.05,
    desc: 'O primeiro passo além dos limites físicos. Libera o bloqueio básico do chakra no cérebro, aumentando levemente o poder de ataque.',
    reqLevel: 10,
  },
  {
    id: 2,
    nome: '2º Portão — Cura',
    kanji: '休門',
    textClass: 'text-[#22d3ee]',
    bgClass: 'bg-[#22d3ee]',
    borderClass: 'border-[#22d3ee]/35',
    innerBorderClass: 'border-[#22d3ee]/20',
    boost: { atk: 0.10, desc: '+10% de Ataque' },
    hpCusto: 0.10,
    desc: 'O fluxo de chakra é intensificado. A pele enrojece levemente com o esforço e o corpo atinge um novo patamar.',
    reqLevel: 20,
  },
  {
    id: 3,
    nome: '3º Portão — Vida',
    kanji: '生門',
    textClass: 'text-[#facc15]',
    bgClass: 'bg-[#facc15]',
    borderClass: 'border-[#facc15]/35',
    innerBorderClass: 'border-[#facc15]/20',
    boost: { atk: 0.20, desc: '+20% de Ataque' },
    hpCusto: 0.20,
    desc: 'O coração acelera além do normal. Músculos se expandem com poder bruto à custa da integridade do corpo.',
    reqLevel: 30,
  },
  {
    id: 4,
    nome: '4º Portão — Dano',
    kanji: '傷門',
    textClass: 'text-[#f97316]',
    bgClass: 'bg-[#f97316]',
    borderClass: 'border-[#f97316]/35',
    innerBorderClass: 'border-[#f97316]/20',
    boost: { atk: 0.35, desc: '+35% de Ataque' },
    hpCusto: 0.35,
    desc: 'O sangue começa a transpirar pelos poros. O limite do corpo humano começa a ser ultrapassado.',
    reqLevel: 40,
  },
  {
    id: 5,
    nome: '5º Portão — Fechamento',
    kanji: '杜門',
    textClass: 'text-[#ef4444]',
    bgClass: 'bg-[#ef4444]',
    borderClass: 'border-[#ef4444]/35',
    innerBorderClass: 'border-[#ef4444]/20',
    boost: { atk: 0.50, desc: '+50% de Ataque' },
    hpCusto: 0.50,
    desc: 'O corpo opera a 50% além do limite. A força é sobrehumana, mas os ossos começam a trincar.',
    reqLevel: 50,
  },
  {
    id: 6,
    nome: '6º Portão — Visão',
    kanji: '景門',
    textClass: 'text-[#c084fc]',
    bgClass: 'bg-[#c084fc]',
    borderClass: 'border-[#c084fc]/35',
    innerBorderClass: 'border-[#c084fc]/20',
    boost: { atk: 0.70, desc: '+70% de Ataque' },
    hpCusto: 0.65,
    desc: 'Os vasos sanguíneos explodem na pele. A visão além do normal é atingida — o preço é severo.',
    reqLevel: 60,
  },
  {
    id: 7,
    nome: '7º Portão — Maravilha',
    kanji: '驚門',
    textClass: 'text-[#f43f5e]',
    bgClass: 'bg-[#f43f5e]',
    borderClass: 'border-[#f43f5e]/35',
    innerBorderClass: 'border-[#f43f5e]/20',
    boost: { atk: 1.00, desc: '+100% de Ataque' },
    hpCusto: 0.80,
    desc: 'O suor se torna vapor. O poder duplica. Porém, o corpo começa a se destruir em tempo real.',
    reqLevel: 70,
  },
  {
    id: 8,
    nome: '8º Portão — Morte',
    kanji: '死門',
    textClass: 'text-[#b91c1c]',
    bgClass: 'bg-[#b91c1c]',
    borderClass: 'border-[#b91c1c]/35',
    innerBorderClass: 'border-[#b91c1c]/20',
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

  const maxHP = calculateHP(player || {});
  const baseAtk = calculateAtkTaiBuk(player || {});

  useEffect(() => {
    if (!player?.portoes_used_at) return;
    const COOLDOWN_MS = 30 * 60 * 1000;
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
    const diff = COOLDOWN_MS - (Date.now() - usedAt);
    setCooldownLeft(diff > 0 ? Math.ceil(diff / 1000) : 0);
    return () => clearInterval(interval);
  }, [player?.portoes_used_at]);

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

    setLoading(true);
    setActivePortao(portao.id);

    try {
      const { data, error } = await supabase.rpc('abrir_portao', {
        p_player_id: player.id,
        p_gate_id: portao.id
      });

      if (error || !data?.success) {
        addToast('Erro ao abrir portão: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      } else {
        await updatePlayer(player.id);
        if (data.is_fainted) {
          addToast(`☠️ ${portao.nome} foi aberto, mas você caiu inconsciente. (-${data.hp_cost} HP)`, 'error');
        } else {
          addToast(`⚡ ${portao.nome} ativado! ${portao.boost.desc} por 3 rodadas. (-${data.hp_cost} HP)`, 'success');
        }
      }
    } catch (error) {
      addToast('Erro ao abrir portão: ' + (error?.message || 'erro inesperado'), 'error');
    } finally {
      setLoading(false);
      setActivePortao(null);
    }
  };

  if (!player) return null;
  const currentHP = player.hp !== undefined && player.hp !== null ? player.hp : maxHP;
  const hpPercent = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));

  return (
    <div className="page kuro-gates-v4">
      <PageHeader
        eyebrow="Técnica Proibida"
        title="8 Portões do Chakra"
        subtitle="Abra os portões do corpo para liberar poder além dos limites humanos — à custa da sua própria vida."
      />

      <div className="card mb-8 border-line-solid">
        <div className="flex-between flex-wrap gap-6 items-center">
          <div className="flex-col gap-3 flex-1-300">
            <div className="flex-between text-xs">
              <span className="muted uppercase mono tracking-wider">Saúde Atual</span>
              <span className={`mono tabular-nums ${hpPercent > 50 ? 'text-success' : hpPercent > 25 ? 'text-yellow-500' : 'text-danger'}`}>
                {currentHP} / {maxHP}
              </span>
            </div>
            <div className="progress-track h-3">
              <div className="progress-fill red transition-[width] duration-500" style={{ width: `${hpPercent}%` }} />
            </div>
          </div>
          <div className="flex-col items-end gap-1">
            <div className="muted mono text-xs uppercase">Ataque Base</div>
            <div className="gold mono text-3xl tabular-nums">{baseAtk}</div>
          </div>
          {cooldownLeft > 0 && (
            <div className="card bg-danger-alpha-08 border-line-solid border-danger-alpha-30 px-6 py-3 text-center">
              <div className="muted mono text-xs uppercase mb-1">Recarga dos Portões</div>
              <div className="danger mono text-xl font-bold tabular-nums">{formatCooldown(cooldownLeft)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-danger-alpha-05 border-line-dashed border-danger-alpha-40 mb-8">
        <p className="muted text-sm leading-relaxed">
          ⚠️ <strong className="paper">Atenção:</strong> Cada portão consome uma porcentagem de seu HP máximo. Se o HP chegar a zero, você desmaíará.
          O <strong className="danger">8º Portão</strong> causa desmaio imediato mas concede +200% de Ataque por 1 rodada.
          Há um <strong className="paper">cooldown de 30 minutos</strong> entre ativações.
        </p>
      </div>

      <div className="kuro-challenges-v4__grid">
        {PORTOES.map((portao) => {
          const isUnlocked = player.level >= portao.reqLevel;
          const hpCusto = Math.floor(maxHP * portao.hpCusto);
          const atkComBoost = Math.floor(baseAtk * (1 + portao.boost.atk));
          const isLoading = loading && activePortao === portao.id;

          return (
            <div
              key={portao.id}
              className={`kuro-challenges-v4__card relative overflow-hidden border transition-[opacity,border-color] duration-300 ${isUnlocked ? `${portao.borderClass} opacity-100` : 'border-line opacity-50'}`}
              aria-disabled={!isUnlocked}
            >
              <div className={`absolute top-0 left-0 right-0 h-1 ${isUnlocked ? portao.bgClass : 'bg-line'}`} />

              <div className="flex-between mb-3 items-start">
                <div>
                  <div className={`mono text-3xl leading-none mb-1 ${portao.textClass}`}>
                    {portao.kanji}
                  </div>
                  <div className="paper font-semibold text-sm">{portao.nome}</div>
                </div>
                <div className="text-right">
                  <div className="muted mono text-xs uppercase mb-1">Req. Nível</div>
                  <div className={`mono text-lg font-bold tabular-nums ${isUnlocked ? 'text-gold' : 'text-danger'}`}>
                    {portao.reqLevel}
                  </div>
                </div>
              </div>

              <p className="muted text-xs leading-relaxed mb-4">
                {portao.desc}
              </p>

              <div className="grid-2 gap-2 mb-4">
                <div className={`bg-ink-raised p-2 rounded-md text-center border ${portao.innerBorderClass}`}>
                  <div className="muted mono text-xs uppercase mb-1">Ataque c/ Boost</div>
                  <div className={`mono text-md font-bold tabular-nums ${portao.textClass}`}>{atkComBoost}</div>
                </div>
                <div className="bg-ink-raised p-2 rounded-md text-center border-line-solid border-danger-alpha-20">
                  <div className="muted mono text-xs uppercase mb-1">Custo de HP</div>
                  <div className="mono danger text-md font-bold tabular-nums">-{hpCusto}</div>
                </div>
              </div>

              <GameAction
                tone={portao.id === 8 ? 'danger' : 'quiet'}
                className="w-full"
                loading={isLoading}
                disabled={!isUnlocked || loading || cooldownLeft > 0}
                onClick={() => handleAbrir(portao)}
              >
                <SidebarIcon name="flame" size={16} />
                {isLoading ? 'Abrindo...' : !isUnlocked ? `Nível ${portao.reqLevel}` : cooldownLeft > 0 ? formatCooldown(cooldownLeft) : `Abrir ${portao.kanji}`}
              </GameAction>
            </div>
          );
        })}
      </div>
    </div>
  );
}
