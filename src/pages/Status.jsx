import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { VILLAGES } from '../constants';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import AvatarModal from '../components/AvatarModal';
import CharacterResourceMeter from '../components/CharacterResourceMeter';
import '../styles/character-status-v3.css';
import '../styles/status-v4.css';
import {
  calculateHP, calculateChakra, calculateStamina, calculateXPForLevel, calculateLevelFromXP,
  getTotalStat, calculateAtkTaiBuk, calculateAtkNinGen, calculateDefTaiBuk,
  calculateDefNinGen, calculatePerfuracao, calculatePrecisao, calculateConcentracao,
  calculatePercepcao, calculateConviccao, calculateDeterminacao,
  calculateCritChance, calculateDodgeChance, calculateChakraDiscount
} from '../utils/engine';
import { BASIC_ATTRIBUTES, getStatusAccountRows, formatStatusNumber } from '../utils/statusPresentation';

const TITLES = [
  'Nenhum(a)',
  'Aniversariante',
  'Genin',
  'Sasori',
  'Chuunin',
  'Guerreiro Iniciante',
  'Shinobi de Elite',
  'A Escuridão da Esperança',
  'O Renegado',
  'Jounin',
  'A Lenda Sannin',
  'Mais Forte que um Kage',
  'Campeão da Vila',
  'Um Novo Recomeço',
  'Transbordando Poder',
  'Exorcista',
  'ANBU',
  'Ninja Verificado'
];

export default function Status({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(player?.title || 'Nenhum(a)');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setCurrentTitle(player?.title || 'Nenhum(a)');
  }, [player?.id, player?.title]);

  if (!player) return null;

  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    setCurrentTitle(newTitle);
    setSavingTitle(true);
    
    const { data, error } = await supabase.rpc('atualizar_titulo_jogador', {
      p_player_id: player.id,
      p_title: newTitle
    });

    if (error || !data?.success) {
      addToast('Erro ao atualizar título: ' + (error?.message || data?.error || 'operação recusada'), 'error');
      setCurrentTitle(player.title || 'Nenhum(a)');
    } else {
      addToast('Título atualizado com sucesso!', 'success');
      if (updatePlayer) updatePlayer(player.id);
    }
    setSavingTitle(false);
  };

  // Calculando Atributos e XP
  const ninjaPower = ((player.taijutsu || 0) + (player.ninjutsu || 0) + (player.genjutsu || 0) + (player.bukijutsu || 0)) * 10 + (player.level || 1) * 100;

  const maxHp = calculateHP(player);
  const maxCp = calculateChakra(player);
  const maxSp = calculateStamina(player);
  const currentLvl = calculateLevelFromXP(player.xp || 0);
  const nextLvl = currentLvl + 1;
  const startXp = calculateXPForLevel(currentLvl);
  const nextLvlXp = calculateXPForLevel(nextLvl);
  const requiredRelativeXp = Math.max(1, nextLvlXp - startXp);
  const currentRelativeXp = Math.max(0, (Number(player.xp) || 0) - startXp);

  const resources = [
    { kind: 'hp', label: 'Vida', icon: '♥', current: player.hp, max: maxHp },
    { kind: 'chakra', label: 'Chakra', icon: '✧', current: player.chakra, max: maxCp },
    { kind: 'stamina', label: 'Stamina', icon: '⚡', current: player.stamina, max: maxSp },
    { kind: 'xp', label: 'Experiência', icon: '★', current: currentRelativeXp, max: requiredRelativeXp }
  ];

  const derivedAttributes = [
    { label: 'Ataque Tai/Buk', value: calculateAtkTaiBuk(player) },
    { label: 'Ataque Nin/Gen', value: calculateAtkNinGen(player) },
    { label: 'Defesa Tai/Buk', value: calculateDefTaiBuk(player) },
    { label: 'Defesa Nin/Gen', value: calculateDefNinGen(player) },
    { label: 'Perfuração', value: calculatePerfuracao(player) },
    { label: 'Precisão', value: calculatePrecisao(player) },
    { label: 'Concentração', value: calculateConcentracao(player) },
    { label: 'Percepção', value: calculatePercepcao(player) },
    { label: 'Convicção', value: calculateConviccao(player) },
    { label: 'Determinação', value: calculateDeterminacao(player) },
    { label: 'Chance crítica', value: calculateCritChance(player), suffix: '%' },
    { label: 'Esquiva', value: calculateDodgeChance(player), suffix: '%' },
    { label: 'Redução de Chakra', value: calculateChakraDiscount(player), suffix: '%' }
  ];
  const accountRows = getStatusAccountRows(player);

  return (
    <div className="kuro-status-page kuro-status-v2 kuro-status-v4 min-h-screen text-paper">
      <div className="page relative z-10 p-8">
        
        <PageHeader 
          eyebrow="Identidade Ninja"
          title="Status do Personagem"
          subtitle="Visualize seus atributos detalhados, poderes especiais e histórico de conta."
        />

        {/* Cartão de personagem com recursos autênticos do motor — sem reescrever regras de jogo. */}
        <motion.section
          className="kuro-status-v3__hero"
          aria-label="Resumo do personagem"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
        >
          <div className="kuro-status-v3__portrait-column">
            <button
              type="button"
              className="kuro-status-v3__portrait-button"
              onClick={() => setIsAvatarModalOpen(true)}
              aria-label={`Alterar avatar de ${player.name}`}
              title="Alterar avatar"
            >
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="" />
              ) : (
                <span aria-hidden="true" className="kuro-status-v3__portrait-fallback">忍</span>
              )}
            </button>
            <span className="kuro-status-v3__portrait-caption">ALTERAR AVATAR</span>
          </div>

          <div className="kuro-status-v3__summary">
            <p className="kuro-status-v3__eyebrow">
              {VILLAGES[player.village_id] || 'Nukenin'} · {player.rank || 'Estudante da Academia'}
            </p>
            <h2 className="kuro-status-v3__name">{player.name}</h2>
            <div className="kuro-status-v3__milestones" aria-label="Progressão de nível">
              <span className="kuro-status-v3__level">NÍVEL <strong>{currentLvl}</strong></span>
              <span className="kuro-status-v3__next">PRÓXIMO NÍVEL <strong>{nextLvl}</strong></span>
              <span className="kuro-status-v3__clan">{player.clan || 'Sem clã'}</span>
            </div>
            <div className="kuro-status-v3__resources">
              {resources.map(resource => (
                <CharacterResourceMeter key={resource.kind} {...resource} />
              ))}
            </div>
          </div>
        </motion.section>

<div className="kuro-status-v3__attribute-grid" aria-label="Atributos do ninja">
          <section className="kuro-status-v3__attributes" aria-labelledby="kuro-basic-title">
            <div className="kuro-status-v3__section-heading">
              <div>
                <span className="kuro-status-v3__section-eyebrow">TREINAMENTO</span>
                <h2 id="kuro-basic-title">Atributos básicos</h2>
              </div>
              <span className="kuro-status-v3__count">10 atributos</span>
            </div>
            <p className="kuro-status-v3__hint">Valores atuais do personagem, incluindo bônus de clã quando aplicáveis.</p>
            <div className="kuro-status-v3__stat-grid">
              {BASIC_ATTRIBUTES.map(attribute => {
                const base = player[attribute.key];
                const total = base == null ? null : getTotalStat(player, attribute.key);
                const difference = total === null ? 0 : total - Number(base);
                return (
                  <div className="kuro-status-v3__stat-row" key={attribute.key}>
                    <span>{attribute.label}</span>
                    <strong>{formatStatusNumber(total)}
                      {difference > 0 && <small title="Bônus de clã"> +{formatStatusNumber(difference)}</small>}
                    </strong>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="kuro-status-v3__attributes" aria-labelledby="kuro-derived-title">
            <div className="kuro-status-v3__section-heading">
              <div>
                <span className="kuro-status-v3__section-eyebrow">MOTOR DE JOGO</span>
                <h2 id="kuro-derived-title">Atributos derivados</h2>
              </div>
              <span className="kuro-status-v3__count">13 indicadores</span>
            </div>
            <p className="kuro-status-v3__hint">Calculados pelas fórmulas atuais do Kurokage. Não são valores do Naruto Game.</p>
            <div className="kuro-status-v3__stat-grid">
              {derivedAttributes.map(attribute => (
                <div className="kuro-status-v3__stat-row" key={attribute.label}>
                  <span>{attribute.label}</span>
                  <strong>{formatStatusNumber(attribute.value)}{attribute.suffix || ''}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="kuro-status-layout grid-responsive gap-lg">
          {/* Coluna Esquerda: Títulos */}
          <div className="flex-col gap-md flex-[1_1_300px]">
            <div className="kuro-status-identity kuro-ui-card card-glass border-line-solid p-6 flex-col items-center gap-md">
              <div className="flex-col w-full gap-sm">
                <div className="flex-between">
                  <span className="muted uppercase text-xs">Nome Ninja:</span>
                  <span className="gold font-bold text-lg">{player.name}</span>
                </div>
                
                <div className="flex-between items-center mt-2 border-t border-line-bright pt-3">
                  <span className="muted uppercase text-xs">Título:</span>
                  <select 
                    className="input text-sm w-[180px] px-2 py-1"
                    value={currentTitle}
                    onChange={handleTitleChange}
                    disabled={savingTitle}
                  >
                    {TITLES.map(title => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="kuro-status-info kuro-ui-card card-glass border-line-solid p-6">
              <h3 className="gold mb-4 border-b border-line-bright pb-2">Informações Gerais</h3>
              <div className="flex-col gap-sm">
                <div className="flex-between">
                  <span className="muted">Classe:</span>
                  <span className="paper font-bold capitalize">{player.class || 'Nenhum(a)'}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Vila Oculta:</span>
                  <span className="paper">{VILLAGES[player.village_id] || 'Nenhuma'}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Graduação:</span>
                  <span className="paper">{player.rank || 'Não informada'}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Nível calculado:</span>
                  <span className="gold font-bold">{currentLvl}</span>
                </div>
                <div className="flex-between">
                  <span className="muted" title="Índice indicativo calculado no cliente, não valor de combate registrado no banco">Índice de poder (estimado):</span>
                  <span className="paper font-bold">{ninjaPower}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Kuro Coins:</span>
                  <span className="gold">{formatStatusNumber(player.vip_coins)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Poderes Especiais e Estatísticas da Conta */}
          <div className="flex-col gap-lg flex-[2_1_500px]">
            
            <div className="kuro-status-powers kuro-ui-card card-glass border-line-solid p-6">
              <h3 className="gold mb-4 border-b border-line-bright pb-2 flex-row items-center gap-xs">
                <SidebarIcon name="sparkles" size={18} /> Poderes Especiais & Linhagens
              </h3>
              <p className="muted text-sm mb-4">Essas habilidades especiais podem ser adquiridas em eventos ou missões raras pelo mundo.</p>
              
              <div className="grid-3 gap-sm">
                <StatusPowerSlot label="Bijuu" value="Não disponível" icon="flame" />
                <StatusPowerSlot label="Espada da Névoa" value="Não disponível" icon="swords" />
                <StatusPowerSlot label="Clã" value={player.clan || 'Sem Clã'} icon="users" isActive={!!player.clan} />
                <StatusPowerSlot label="Selo Amaldiçoado" value="Não disponível" icon="shield" />
                <StatusPowerSlot label="Invocação" value="Não disponível" icon="paw" />
                <StatusPowerSlot label="Modo Sennin" value="Não disponível" icon="sparkles" />
                <StatusPowerSlot label="Hachimon Tonkou" value="Não disponível" icon="door" />
                <StatusPowerSlot label="Karma" value="Não disponível" icon="award" />
                <StatusPowerSlot label="Elemento" value={player.element || 'Não definido'} icon="zap" isActive={!!player.element} />
                <StatusPowerSlot label="Segundo elemento" value={player.element2 || 'Não definido'} icon="sparkles" isActive={!!player.element2} />
              </div>
            </div>

            <section className="kuro-status-account kuro-ui-card card-glass border-line-solid p-6" aria-labelledby="account-stats-title">
              <h3 id="account-stats-title" className="gold mb-4 border-b border-line-bright pb-2">Histórico registrado</h3>
              <p className="kuro-status-v3__hint">Dados registrados no personagem. Informações ainda não armazenadas aparecem como “—”.</p>
              <div className="kuro-status-v3__account-grid">
                {accountRows.map(stat => (
                  <div className="kuro-status-v3__account-row" key={stat.key}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
            </section>

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

// Mini-componente para os blocos de poder
function StatusPowerSlot({ label, value, icon, isActive }) {
  return (
    <div className={`kuro-status-v4__power-slot ${isActive ? 'is-active' : 'is-unavailable'}`}>
      <span className="muted uppercase text-[10px] tracking-wide">{label}</span>
      <div className="flex-row items-center gap-xs">
        <span className="kuro-status-v4__power-icon"><SidebarIcon name={icon} size={19} /></span>
        <span className={`font-bold text-sm ${isActive ? 'gold' : 'paper'}`}>{value}</span>
      </div>
    </div>
  );
}
