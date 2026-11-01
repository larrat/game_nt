import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import GameAction from '../components/ui/GameAction';
import '../styles/world-services-v4.css';
import { getNpcPortrait } from '../utils/npcPortrait';

export default function Historia({ player, updatePlayer }) {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeQuest, setActiveQuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState(0);

  useEffect(() => {
    if (player) loadStoryProgress();
  }, [player]);

  const loadStoryProgress = async () => {
    setLoading(true);
    // Busca todas as quests do jogador
    const { data: pQuests, error: pError } = await supabase
      .from('player_quests')
      .select('*, story_quests(*)')
      .eq('player_id', player.id);

    if (pError) {
      addToast("Erro ao carregar história.", "error");
      setLoading(false);
      return;
    }

    const { data: defeatedRows } = await supabase
      .from('player_defeated_npcs')
      .select('npc_id')
      .eq('player_id', player.id);
    const defeatedNpcIds = new Set((defeatedRows || []).map(row => Number(row.npc_id)));

    let current = null;

    if (!pQuests || pQuests.length === 0) {
      // Jogador não tem quest, buscar a Quest Inicial (ID 1)
      const { data: q1 } = await supabase.from('story_quests').select('*').eq('id', 1).single();
      if (q1) {
        current = { status: 'pending', story_quests: q1 };
      }
    } else {
      // Procurar quest ativa
      const active = pQuests.find(q => q.status === 'active');
      if (active) {
        current = active;
      } else {
        // Todas concluídas, buscar a próxima
        const completedQuests = pQuests.filter(q => q.status === 'completed');
        const lastCompletedId = Math.max(...completedQuests.map(q => q.quest_id));
        const { data: nextQ } = await supabase.from('story_quests').select('*').eq('prerequisite_quest_id', lastCompletedId).maybeSingle();
        
        if (nextQ) {
          current = { status: 'pending', story_quests: nextQ };
        }
      }
    }

    if (current?.story_quests?.objective_type === 'combat') {
      const requiredNpcId = Number(current.story_quests.objective_target?.npc_id);
      current = {
        ...current,
        objectiveSatisfied: Number.isInteger(requiredNpcId) && defeatedNpcIds.has(requiredNpcId)
      };
    }

    setActiveQuest(current);
    setLoading(false);
  };

  const handleStartDialog = () => {
    if (player.level < activeQuest.story_quests.req_level) {
      addToast(`Você precisa ser Nível ${activeQuest.story_quests.req_level} para iniciar esta saga.`, "error");
      return;
    }
    setDialogStep(0);
    setShowDialog(true);
  };

  const advanceDialog = async () => {
    const dialogs = activeQuest.story_quests.dialogue || [];
    if (dialogStep < dialogs.length - 1) {
      setDialogStep(dialogStep + 1);
    } else {
      // Fim do diálogo
      setShowDialog(false);
      
      // A transição de status é feita no servidor, nunca por INSERT direto do cliente.
      if (activeQuest.story_quests.objective_type === 'talk') {
        await completeQuest();
      } else if (activeQuest.status === 'pending') {
        const { data, error } = await supabase.rpc('iniciar_story_quest', {
          p_player_id: player.id,
          p_quest_id: activeQuest.story_quests.id
        });

        if (error || data?.success === false) {
          addToast(data?.message || error?.message || 'Não foi possível iniciar a missão.', 'error');
          return;
        }
        await loadStoryProgress();
      }
    }
  };

  const completeQuest = async () => {
    const questId = activeQuest.story_quests.id;
    const { data: startData, error: startError } = await supabase.rpc('iniciar_story_quest', {
      p_player_id: player.id,
      p_quest_id: questId
    });

    if (startError || startData?.success === false) {
      addToast(startData?.message || startError?.message || 'Não foi possível iniciar a missão.', 'error');
      return;
    }

    const { data, error } = await supabase.rpc('concluir_story_quest', {
      p_player_id: player.id,
      p_quest_id: questId
    });

    if (error || data?.success === false) {
      addToast(data?.message || error?.message || 'A missão ainda não pode ser concluída.', 'warning');
    } else if (data?.success) {
      addToast(`Quest Concluída! +${data.xp} XP | +${data.ryous} Ryous`, 'success');
      await updatePlayer(player.id);
      await loadStoryProgress();
    }
  };

  const handleCombat = async () => {
    const target = activeQuest.story_quests.objective_target?.npc;
    const npcId = Number(activeQuest.story_quests.objective_target?.npc_id);
    if (!target || !Number.isInteger(npcId) || npcId <= 0) {
      addToast('Esta missão ainda não possui um inimigo oficial configurado.', 'error');
      return;
    }

    const { data: npc, error } = await supabase
      .from('npcs')
      .select('*')
      .eq('id', npcId)
      .eq('is_active', true)
      .single();

    if (error || !npc || !(npc.is_story_mode || npc.is_bingo_book)) {
      addToast('Não foi possível carregar o inimigo oficial da missão.', 'error');
      return;
    }

    navigate('/combate', {
      state: {
        npc: { ...npc, storyQuestId: activeQuest.story_quests.id },
        isStoryQuest: true
      }
    });
  };

  if (loading) return <div className="page text-center muted p-8">Lendo pergaminhos de história...</div>;

  return (
    <div className="page kuro-story-page kuro-story-v4">
      <PageHeader 
        eyebrow="Narrativa Principal" 
        title="Escritório do Hokage" 
        subtitle="Siga a história do mundo ninja e desvende os mistérios da sua vila."
      />

      {!activeQuest ? (
        <div className="kuro-story-empty kuro-ui-card card text-center p-8">
          <span className="kuro-world-v4__emblem"><SidebarIcon name="scroll" size={32} /></span>
          <h3 className="section-title">Sem Missões</h3>
          <p className="muted">O Hokage não tem missões de história para você no momento. Continue treinando!</p>
        </div>
      ) : (
        <div className="kuro-story-quest kuro-ui-card card-glass border-gold p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent pointer-events-none" />
          
          <div className="flex-between mb-4 z-10 relative">
            <div>
              <span className="badge badge-gold mb-2 block w-fit">Missão Principal</span>
              <h3 className="gold text-2xl uppercase font-bold drop-shadow-md">{activeQuest.story_quests.title}</h3>
            </div>
            <div className="text-right">
              <span className="paper text-sm">Requisito: Nível {activeQuest.story_quests.req_level}</span>
            </div>
          </div>

          <p className="paper max-w-600 mb-6 z-10 relative">
            {activeQuest.story_quests.description}
          </p>

          <div className="flex-row gap-4 z-10 relative">
            {(activeQuest.status === 'pending' || activeQuest.story_quests.objective_type === 'talk') ? (
              <button className="btn-primary flex-1" onClick={handleStartDialog}>
                Conversar com {activeQuest.story_quests.npc_name}
              </button>
            ) : activeQuest.story_quests.objective_type === 'combat' ? (
              activeQuest.objectiveSatisfied ? (
                <button className="btn-primary flex-1 bg-green border-green" onClick={completeQuest}>
                  Relatar Conclusão
                </button>
              ) : (
                <button className="btn-danger flex-1" onClick={handleCombat}>
                  Ir para Batalha!
                </button>
              )
            ) : activeQuest.story_quests.objective_type === 'reach_level' ? (
              player.level >= (activeQuest.story_quests.objective_target?.level || 999) ? (
                 <button className="btn-primary flex-1 bg-green border-green" onClick={completeQuest}>
                   Relatar Conclusão
                 </button>
              ) : (
                 <button className="btn-ghost flex-1 opacity-50 cursor-not-allowed">
                   Requer Nível {activeQuest.story_quests.objective_target?.level}
                 </button>
              )
            ) : null}
          </div>
        </div>
      )}

      {/* MODAL DE DIÁLOGO */}
      {showDialog && (
        <div role="dialog" aria-modal="true" aria-label="Diálogo da história" className="kuro-story-dialog fixed inset-0 bg-ink/90 z-50 flex items-center justify-center p-4">
          <div className="kuro-story-dialog__panel w-full max-w-700 bg-ink-raised border-line-solid rounded-lg flex-row overflow-hidden shadow-2xl animate-fade-in">
            {/* Foto NPC */}
            <div className="kuro-story-dialog__portrait w-1/3 bg-ink relative border-r border-line-dashed">
              <div className="absolute inset-0 flex items-center justify-center muted"
                role="img" aria-label={`Retrato indisponível de ${activeQuest.story_quests.npc_name}`}>
                <SidebarIcon name="users" size={56} />
              </div>
              {getNpcPortrait({ name: activeQuest.story_quests.npc_name }) && (
                <img
                  src={getNpcPortrait({ name: activeQuest.story_quests.npc_name })}
                  alt={`Retrato de ${activeQuest.story_quests.npc_name}`}
                  onError={event => { event.currentTarget.style.display = 'none'; }}
                  className="relative w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all opacity-80 min-h-[300px]"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink to-transparent p-4">
                <span className="gold font-bold uppercase drop-shadow-md text-lg">{activeQuest.story_quests.npc_name}</span>
              </div>
            </div>

            {/* Texto */}
            <div className="kuro-story-dialog__text w-2/3 p-6 flex-col justify-between relative">
              <div className="paper text-lg leading-relaxed italic mb-8 mt-4">
                "{activeQuest.story_quests.dialogue[dialogStep]}"
              </div>

              <div className="flex-between items-center w-full mt-auto">
                <span className="muted text-xs mono">Falas: {dialogStep + 1} / {activeQuest.story_quests.dialogue?.length}</span>
                <button className="btn-primary" onClick={advanceDialog}>
                  {dialogStep < activeQuest.story_quests.dialogue?.length - 1 ? 'Avançar ▶' : 'Terminar Conversa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
