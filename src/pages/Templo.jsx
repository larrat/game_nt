import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';

// Removemos EVOLUTION_TREES mock

export default function Templo({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [evolution, setEvolution] = useState(null);

  React.useEffect(() => {
    async function checkEvolution() {
      if (!player) return;
      // Busca a definição do avatar atual do banco
      const { data: currentAvatarData } = await supabase.from('avatars').select('*').eq('id', player.avatar).maybeSingle();
      
      if (currentAvatarData && currentAvatarData.evolution_target_id) {
        // Busca os dados do avatar alvo para pegar o nome e a imagem dele
        const { data: targetAvatarData } = await supabase.from('avatars').select('*').eq('id', currentAvatarData.evolution_target_id).maybeSingle();
        
        if (targetAvatarData) {
          setEvolution({
            nextId: targetAvatarData.id,
            nextName: targetAvatarData.name,
            desc: currentAvatarData.evolution_desc || 'Atinja o nível necessário para desbloquear.',
            requirements: { level: currentAvatarData.evolution_req_level || 10 }
          });
        }
      } else {
        setEvolution(null);
      }
    }
    checkEvolution();
  }, [player]);

  if (!player) return null;

  const unlocked = player.unlocked_avatars || [];

  const handleUnlock = async () => {
    if (!evolution) return;
    
    // Validations
    if (player.level < evolution.requirements.level) {
      return addToast(`Nível insuficiente. Você precisa ser Nível ${evolution.requirements.level}.`, "error");
    }
    const defeated = player.tasks_completed || 0; // Usando tasks_completed genérico por enquanto ou total de NPCs (que teríamos que agregar)
    // Para simplificar, vou checar vitórias diárias ou vitórias totais. Temos daily_npcs_defeated, mas seria ideal um total_npcs_defeated.
    // Vamos apenas usar level e Ryous como fallback para a demo
    
    setLoading(true);
    const { error } = await supabase.rpc('desbloquear_avatar_templo', {
      p_player_id: player.id,
      p_avatar_id: evolution.nextId,
      p_req_level: evolution.requirements.level
    });

    if (!error) {
      addToast(`${evolution.nextName} desbloqueado com sucesso!`, "success");
      updatePlayer(player.id);
    } else {
      addToast("Erro ao desbloquear: " + error.message, "error");
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Legado e Herança" 
        title="Templo Ninja" 
        subtitle="Prove seu valor no campo de batalha para desbloquear versões poderosas de seus ninjas."
      />

      <div className="info-banner mb-8">
        <h3 className="gold mb-2">O Despertar do Poder</h3>
        <p className="muted leading-relaxed">
          Jogue com as versões clássicas de seus personagens favoritos e cumpra os requisitos exigidos para despertar suas formas maduras ou supremas de forma permanente na sua conta.
        </p>
      </div>

      <div className="card">
        {evolution ? (
          unlocked.includes(evolution.nextId) ? (
            <div className="text-center py-12">
              <h3 className="success mono">✓ Forma Suprema Desbloqueada</h3>
              <p className="muted mt-2">Você já liberou a evolução deste personagem. Tente evoluir outros ninjas!</p>
            </div>
          ) : (
            <div className="flex-row gap-8 items-center justify-center flex-wrap">
              
              {/* Personagem Atual */}
              <div className="flex-col items-center gap-4">
                <div className="w-[140px] h-[140px] rounded-full overflow-hidden border-2 border-line-solid">
                  <img src={player.avatar} alt="Current" className="w-full h-full object-cover" />
                </div>
                <div className="muted mono text-sm">FORMA ATUAL</div>
              </div>

              {/* Seta de Evolução */}
              <div className="text-4xl text-seal-bright animate-pulse">
                →
              </div>

              {/* Próxima Evolução */}
              <div className="flex-col items-center gap-4">
                <div className="w-[180px] h-[180px] rounded-full overflow-hidden border-3 border-gold shadow-gold-lg">
                  <img src={evolution.nextId} alt="Next" className="w-full h-full object-cover" />
                </div>
                <div className="gold mono">{evolution.nextName}</div>
              </div>

              {/* Requisitos e Botão */}
              <div className="flex-1 min-w-[300px] bg-ink-raised p-6 rounded-md border-line-solid">
                <h4 className="mb-4 text-md">Requisitos de Despertar</h4>
                <p className="muted text-sm mb-6 leading-relaxed">
                  {evolution.desc}
                </p>

                <div className="flex-col gap-3 mb-6">
                  <div className="flex-between">
                    <span className="paper text-sm">Level Requerido</span>
                    <span className={player.level >= evolution.requirements.level ? "success mono" : "danger mono"}>
                      {player.level} / {evolution.requirements.level}
                    </span>
                  </div>
                  {/* Podemos adicionar mais métricas aqui no futuro */}
                </div>

                <button 
                  className="btn-primary w-full" 
                  onClick={handleUnlock}
                  disabled={loading || player.level < evolution.requirements.level}
                >
                  <span>{loading ? 'Despertando...' : 'Desbloquear Personagem'}</span>
                  <div className="stamp"></div>
                </button>
              </div>

            </div>
          )
        ) : (
          <div className="text-center py-12">
            <h3 className="muted mono text-md">Nenhum despertar disponível</h3>
            <p className="muted mt-2 max-w-400 mx-auto leading-relaxed">
              Seu ninja atual não possui uma linha evolutiva descoberta ou já atingiu sua forma máxima.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
