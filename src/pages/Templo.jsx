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
      const { data: currentAvatarData } = await supabase.from('avatars').select('*').eq('id', player.avatar).single();
      
      if (currentAvatarData && currentAvatarData.evolution_target_id) {
        // Busca os dados do avatar alvo para pegar o nome e a imagem dele
        const { data: targetAvatarData } = await supabase.from('avatars').select('*').eq('id', currentAvatarData.evolution_target_id).single();
        
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
    const newUnlocked = [...unlocked, evolution.nextId];

    const { error } = await supabase.from('players').update({
      unlocked_avatars: newUnlocked
    }).eq('id', player.id);

    if (!error) {
      addToast(`${evolution.nextName} desbloqueado com sucesso!`, "success");
      updatePlayer(player.user_id);
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

      <div className="info-banner" style={{ marginBottom: '32px' }}>
        <h3 className="gold" style={{ marginBottom: '8px' }}>O Despertar do Poder</h3>
        <p className="muted" style={{ lineHeight: '1.5' }}>
          Jogue com as versões clássicas de seus personagens favoritos e cumpra os requisitos exigidos para despertar suas formas maduras ou supremas de forma permanente na sua conta.
        </p>
      </div>

      <div className="card">
        {evolution ? (
          unlocked.includes(evolution.nextId) ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <h3 className="success mono">✓ Forma Suprema Desbloqueada</h3>
              <p className="muted" style={{ marginTop: '8px' }}>Você já liberou a evolução deste personagem. Tente evoluir outros ninjas!</p>
            </div>
          ) : (
            <div className="flex-row" style={{ gap: '32px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              
              {/* Personagem Atual */}
              <div className="flex-col" style={{ alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--line)' }}>
                  <img src={player.avatar} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="muted mono" style={{ fontSize: '13px' }}>FORMA ATUAL</div>
              </div>

              {/* Seta de Evolução */}
              <div style={{ fontSize: '32px', color: 'var(--seal-bright)', animation: 'pulse 2s infinite' }}>
                →
              </div>

              {/* Próxima Evolução */}
              <div className="flex-col" style={{ alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--gold)', boxShadow: '0 0 30px rgba(234, 179, 8, 0.2)' }}>
                  <img src={evolution.nextId} alt="Next" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="gold mono">{evolution.nextName}</div>
              </div>

              {/* Requisitos e Botão */}
              <div style={{ flex: '1 1 300px', background: 'var(--ink-raised)', padding: '24px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '15px' }}>Requisitos de Despertar</h4>
                <p className="muted" style={{ fontSize: '13px', marginBottom: '24px', lineHeight: '1.5' }}>
                  {evolution.desc}
                </p>

                <div className="flex-col" style={{ gap: '12px', marginBottom: '24px' }}>
                  <div className="flex-between">
                    <span className="paper" style={{ fontSize: '14px' }}>Level Requerido</span>
                    <span className={player.level >= evolution.requirements.level ? "success mono" : "danger mono"}>
                      {player.level} / {evolution.requirements.level}
                    </span>
                  </div>
                  {/* Podemos adicionar mais métricas aqui no futuro */}
                </div>

                <button 
                  className="btn-primary" 
                  style={{ width: '100%' }}
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
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <h3 className="muted mono" style={{ fontSize: '16px' }}>Nenhum despertar disponível</h3>
            <p className="muted" style={{ marginTop: '8px', maxWidth: '400px', margin: '8px auto 0', lineHeight: '1.5' }}>
              Seu ninja atual não possui uma linha evolutiva descoberta ou já atingiu sua forma máxima.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
