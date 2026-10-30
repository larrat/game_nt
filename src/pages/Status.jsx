import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { VILLAGES } from '../constants';
import PageHeader from '../components/PageHeader';
import AvatarModal from '../components/AvatarModal';
import CharacterResourceMeter from '../components/CharacterResourceMeter';
import '../styles/character-status-v3.css';
import { calculateHP, calculateChakra, calculateStamina, calculateXPForLevel, calculateLevelFromXP } from '../utils/engine';

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

  const bgImage = player.village_id ? `/images/bg_${player.village_id}.jpg` : '/images/bg_default.jpg';

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

  return (
    <div className="kuro-status-page bg-cover bg-center min-h-screen text-paper bg-fixed" style={{ backgroundImage: `url(${bgImage})` }}>
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

<div className="kuro-status-layout grid-responsive gap-lg">
          {/* Coluna Esquerda: Títulos */}
          <div className="flex-col gap-md flex-[1_1_300px]">
            <div className="kuro-status-identity card-glass border-line-solid p-6 flex-col items-center gap-md">
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

            <div className="kuro-status-info card-glass border-line-solid p-6">
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
                  <span className="muted">Profissão:</span>
                  <span className="paper">-</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Level:</span>
                  <span className="gold font-bold">{player.level || 1}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Poder Ninja:</span>
                  <span className="paper font-bold">{ninjaPower}</span>
                </div>
                <div className="flex-between">
                  <span className="muted">Kuro Coins:</span>
                  <span className="gold">{player.vip_coins || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Poderes Especiais e Estatísticas da Conta */}
          <div className="flex-col gap-lg flex-[2_1_500px]">
            
            <div className="kuro-status-powers card-glass border-line-solid p-6">
              <h3 className="gold mb-4 border-b border-line-bright pb-2 flex-row items-center gap-xs">
                <span>⚡</span> Poderes Especiais & Linhagens
              </h3>
              <p className="muted text-sm mb-4">Essas habilidades especiais podem ser adquiridas em eventos ou missões raras pelo mundo.</p>
              
              <div className="grid-3 gap-sm">
                <StatusPowerSlot label="Bijuu" value="Nenhum" icon="🦊" />
                <StatusPowerSlot label="Espada da Névoa" value="Nenhum" icon="🗡️" />
                <StatusPowerSlot label="Clã" value={player.clan || 'Sem Clã'} icon="⛩️" isActive={!!player.clan} />
                <StatusPowerSlot label="Selo Amaldiçoado" value="Nenhum" icon="🌑" />
                <StatusPowerSlot label="Invocação" value="Nenhum" icon="🐸" />
                <StatusPowerSlot label="Modo Sennin" value="Desativado" icon="🐸" />
                <StatusPowerSlot label="Hachimon Tonkou" value="Desativado" icon="🚪" />
                <StatusPowerSlot label="Karma" value="Nenhum" icon="♦️" />
                <StatusPowerSlot label="Elemento" value={player.element || "Não definido"} icon="🌪️" isActive={!!player.element} />
              </div>
            </div>

            <div className="kuro-status-account card-glass border-line-solid p-6">
              <h3 className="gold mb-4 border-b border-line-bright pb-2">Estatísticas da Conta</h3>
              <div className="grid-2 gap-x-8 gap-y-3 text-sm">
                
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Dias no round:</span>
                  <span className="paper">1</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Pacotes abertos:</span>
                  <span className="paper">0</span>
                </div>
                
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Pts. de Fidelidade:</span>
                  <span className="paper">0</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Fragmentos:</span>
                  <span className="paper">0</span>
                </div>

                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Qtd. Reforjas:</span>
                  <span className="paper">0</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Fragmentos Gastos:</span>
                  <span className="paper">0</span>
                </div>

                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Ranking (Vila):</span>
                  <span className="paper">-</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Ranking (Geral):</span>
                  <span className="paper">-</span>
                </div>

                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Score PVP:</span>
                  <span className="paper">0</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Pts. de Conquistas:</span>
                  <span className="gold font-bold">0</span>
                </div>

                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Equipe:</span>
                  <span className="paper">{player.team || 'Nenhuma'}</span>
                </div>
                <div className="flex-between border-b border-line-bright border-dashed pb-1">
                  <span className="muted">Organização:</span>
                  <span className="paper">{player.organization || 'Nenhuma'}</span>
                </div>

              </div>
            </div>

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
    <div className={`p-3 rounded-sm border-line-solid flex-col gap-xs ${isActive ? 'bg-ink-raised border-gold' : 'bg-ink-transparent opacity-60'}`}>
      <span className="muted uppercase text-[10px] tracking-wide">{label}</span>
      <div className="flex-row items-center gap-xs">
        <span className="text-sm">{icon}</span>
        <span className={`font-bold text-sm ${isActive ? 'gold' : 'paper'}`}>{value}</span>
      </div>
    </div>
  );
}
