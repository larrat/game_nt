import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

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
      
      // Se a quest for do tipo 'talk', conclui na hora
      if (activeQuest.story_quests.objective_type === 'talk') {
        completeQuest();
      } else if (activeQuest.status === 'pending') {
        // Se ainda não iniciou no BD, salva como ativa
        await supabase.from('player_quests').insert({
          player_id: player.id,
          quest_id: activeQuest.story_quests.id,
          status: 'active'
        });
        loadStoryProgress();
      }
    }
  };

  const completeQuest = async () => {
    const { data, error } = await supabase.rpc('concluir_story_quest', {
      p_player_id: player.id,
      p_quest_id: activeQuest.story_quests.id
    });
    if (error) {
      addToast(error.message, "error");
    } else if (data && data.success) {
      addToast(`Quest Concluída! +${data.xp} XP | +${data.ryous} Ryous`, "success");
      updatePlayer(player.id);
      loadStoryProgress();
    }
  };

  const handleCombat = () => {
    const target = activeQuest.story_quests.objective_target?.npc;
    if (!target) return;

    const bossNpc = {
      id: `storyboss_${activeQuest.story_quests.id}`,
      name: target.name,
      avatar: target.avatar || '/images/imgi_26_scroll_blue.jpg',
      level: target.level || 1,
      hp: target.hp || 1000,
      maxHp: target.hp || 1000,
      chakra: target.chakra || 500,
      atk: target.atk || 10,
      def: target.def || 5,
      element: target.element || 'Normal',
      isStoryQuest: true,
      storyQuestId: activeQuest.story_quests.id
    };

    navigate('/combate', { state: { npc: bossNpc, isStoryQuest: true } });
  };

  if (loading) return <div className="page text-center muted p-8">Lendo pergaminhos de história...</div>;

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Narrativa Principal" 
        title="Escritório do Hokage" 
        subtitle="Siga a história do mundo ninja e desvende os mistérios da sua vila."
      />

      {!activeQuest ? (
        <div className="card text-center p-8">
          <div className="text-6xl mb-4 opacity-50">📜</div>
          <h3 className="section-title">Sem Missões</h3>
          <p className="muted">O Hokage não tem missões de história para você no momento. Continue treinando!</p>
        </div>
      ) : (
        <div className="card-glass border-gold p-6 relative overflow-hidden">
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
              <button className="btn-danger flex-1" onClick={handleCombat}>
                Ir para Batalha!
              </button>
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
        <div className="fixed inset-0 bg-ink/90 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-700 bg-ink-raised border-line-solid rounded-lg flex-row overflow-hidden shadow-2xl animate-fade-in">
            {/* Foto NPC */}
            <div className="w-1/3 bg-ink relative border-r border-line-dashed">
              <img 
                src={activeQuest.story_quests.npc_image_url || '/images/imgi_26_scroll_blue.jpg'} 
                alt={activeQuest.story_quests.npc_name}
                className="w-full h-full object-cover object-center grayscale hover:grayscale-0 transition-all opacity-80 min-h-[300px]"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink to-transparent p-4">
                <span className="gold font-bold uppercase drop-shadow-md text-lg">{activeQuest.story_quests.npc_name}</span>
              </div>
            </div>

            {/* Texto */}
            <div className="w-2/3 p-6 flex-col justify-between relative">
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
