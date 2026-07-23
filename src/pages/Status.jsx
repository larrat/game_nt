import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { VILLAGES } from '../constants';
import PageHeader from '../components/PageHeader';
import AvatarModal from '../components/AvatarModal';
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

  if (!player) return null;

  const handleTitleChange = async (e) => {
    const newTitle = e.target.value;
    setCurrentTitle(newTitle);
    setSavingTitle(true);
    
    const { error } = await supabase
      .from('players')
      .update({ title: newTitle })
      .eq('id', player.id);

    if (error) {
      addToast('Erro ao atualizar título: ' + error.message, 'error');
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
  const currentHp = player.hp !== undefined ? Math.min(player.hp, maxHp) : maxHp;
  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  const maxCp = calculateChakra(player);
  const currentCp = player.chakra !== undefined ? Math.min(player.chakra, maxCp) : maxCp;
  const cpPercent = Math.max(0, Math.min(100, (currentCp / maxCp) * 100));

  const maxSp = calculateStamina(player);
  const currentSp = player.stamina !== undefined ? Math.min(player.stamina, maxSp) : maxSp;
  const spPercent = Math.max(0, Math.min(100, (currentSp / maxSp) * 100));

  let xpPercent = 0;
  let currentRelativeXp = 0;
  let requiredRelativeXp = 100;
  const currentLvl = calculateLevelFromXP(player.xp || 0);
  const nextLvl = currentLvl + 1;
  const startXp = calculateXPForLevel(currentLvl);
  const nextLvlXp = calculateXPForLevel(nextLvl);
  
  requiredRelativeXp = nextLvlXp - startXp;
  currentRelativeXp = (player.xp || 0) - startXp;
  xpPercent = Math.min(100, Math.max(0, (currentRelativeXp / requiredRelativeXp) * 100));

  return (
    <div className="bg-cover bg-center min-h-screen text-paper bg-fixed" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="page relative z-10 p-8">
        
        {/* BIG STATUS BAR BANNER */}
        <div className="card border-line-solid p-6 mb-8 flex-col items-center bg-ink shadow-xl relative mt-[120px]">
           
           {/* Imagem do personagem pulando pra fora do banner (ESTILO A IMAGEM REFERÊNCIA) */}
           <div 
             className="absolute cursor-pointer transition-transform hover:scale-105 top-[-160px] left-1/2 -translate-x-1/2 z-10" 
             onClick={() => setIsAvatarModalOpen(true)}
             title="Trocar Avatar"
           >
              {player.avatar?.startsWith('/') ? (
                <img src={player.avatar} alt="Avatar" className="h-[300px] object-contain drop-shadow-2xl" />
              ) : (
                <div className="w-[200px] h-[200px] bg-seal rounded-full flex items-center justify-center text-6xl border-4 border-gold shadow-2xl">👤</div>
              )}
           </div>

           <div className="flex-between w-full relative z-10 pt-20">
              
              {/* Level Atual */}
              <div className="flex-col items-center w-[100px]">
                 <span className="muted text-lg tracking-widest">LVL</span>
                 <span className="text-5xl font-bold text-white text-shadow">{currentLvl}</span>
              </div>

              {/* Centro: Barras (Vida, Chakra, Stamina, XP) */}
              <div className="flex-col items-center gap-md flex-1 max-w-[700px]">
                 
                 <div className="flex-between w-full gap-md">
                    {/* Vida */}
                    <div className="flex-row items-center gap-sm flex-1">
                       <span className="text-[32px]">❤️</span>
                       <div className="flex-col w-full">
                          <span className="text-xs font-bold text-center mb-1 text-shadow">{currentHp}/{maxHp}</span>
                          <div className="h-2 w-full bg-black-alpha-60 rounded-full overflow-hidden border border-line-bright shadow-inner-dark">
                             <div className="h-full bg-danger transition-all duration-300" style={{ width: `${hpPercent}%` }}></div>
                          </div>
                       </div>
                    </div>

                    {/* Chakra */}
                    <div className="flex-row items-center gap-sm flex-1">
                       <span className="text-[32px] text-blue-500">🔥</span>
                       <div className="flex-col w-full">
                          <span className="text-xs font-bold text-center mb-1 text-shadow">{currentCp}/{maxCp}</span>
                          <div className="h-2 w-full bg-black-alpha-60 rounded-full overflow-hidden border border-line-bright shadow-inner-dark">
                             <div className="h-full bg-blue transition-all duration-300" style={{ width: `${cpPercent}%` }}></div>
                          </div>
                       </div>
                    </div>

                    {/* Stamina */}
                    <div className="flex-row items-center gap-sm flex-1">
                       <span className="text-[32px]">⚡</span>
                       <div className="flex-col w-full">
                          <span className="text-xs font-bold text-center mb-1 text-shadow">{currentSp}/{maxSp}</span>
                          <div className="h-2 w-full bg-black-alpha-60 rounded-full overflow-hidden border border-line-bright shadow-inner-dark">
                             <div className="h-full bg-warning transition-all duration-300" style={{ width: `${spPercent}%` }}></div>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* XP BAR */}
                 <div className="w-full flex-row items-center mt-2 relative">
                    <div className="h-4 w-full bg-black-alpha-60 rounded-sm overflow-hidden border border-line-bright shadow-inner-dark">
                       <div className="h-full bg-success transition-all duration-300 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.1),rgba(255,255,255,0.1)_8px,transparent_8px,transparent_16px)]" style={{ width: `${xpPercent}%` }}></div>
                    </div>
                    <span className="absolute w-full text-center text-xs font-bold text-white text-shadow-dark pointer-events-none">
                       EXP: {currentRelativeXp}/{requiredRelativeXp}
                    </span>
                 </div>

              </div>

              {/* Level Seguinte */}
              <div className="flex-col items-center opacity-50 w-[100px]">
                 <span className="muted text-lg tracking-widest">LVL</span>
                 <span className="text-5xl font-bold text-white text-shadow">{nextLvl}</span>
              </div>

           </div>
        </div>

        <PageHeader 
          eyebrow="Identidade Ninja"
          title="Status do Personagem"
          subtitle="Visualize seus atributos detalhados, poderes especiais e histórico de conta."
        />

        <div className="grid-responsive gap-lg">
          {/* Coluna Esquerda: Títulos */}
          <div className="flex-col gap-md flex-[1_1_300px]">
            <div className="card-glass border-line-solid p-6 flex-col items-center gap-md">
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

            <div className="card-glass border-line-solid p-6">
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
            
            <div className="card-glass border-line-solid p-6">
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
                <StatusPowerSlot label="Elemento" value="Vento" icon="🌪️" isActive={true} />
              </div>
            </div>

            <div className="card-glass border-line-solid p-6">
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
