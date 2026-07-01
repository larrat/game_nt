import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';

export default function Vip({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (!player) return null;

  const vipCredits = player.vip_credits || 0;

  const handleSingleTalentReset = async () => {
    if (vipCredits < 1) {
      return addToast("Créditos VIP insuficientes! (Requer 1 Crédito)", "error");
    }

    // Como o reset avulso pede um talento específico, nós simularemos a interface:
    // Na prática o usuário escolheria um stat (ex: Ninjutsu), e nós diminuiríamos ele e devolveríamos 1 Ponto.
    // Aqui para o protótipo vamos fazer um mock via prompt ou apenas devolver 1 de Taijutsu como exemplo genérico
    const statToReset = window.prompt("Qual atributo você quer resetar? (Ex: taijutsu, ninjutsu, forca, agilidade...)");
    if (!statToReset || !player[statToReset.toLowerCase()]) {
      return addToast("Atributo inválido ou zerado.", "error");
    }

    const statKey = statToReset.toLowerCase();
    
    setLoading(true);
    const { error } = await supabase.from('players').update({
      vip_credits: vipCredits - 1,
      total_vip_spent: (player.total_vip_spent || 0) + 1,
      [statKey]: player[statKey] - 1,
      pontos_atributos: (player.pontos_atributos || 0) + 1
    }).eq('id', player.id);

    if (error) {
      addToast("Erro: " + error.message, "error");
    } else {
      addToast(`Sucesso! Você devolveu 1 ponto de ${statKey.toUpperCase()} e gastou 1 Crédito VIP.`, "success");
      updatePlayer(player.user_id);
    }
    setLoading(false);
  };

  const handleCharacterChange = async () => {
    if (vipCredits < 2) {
      return addToast("Créditos VIP insuficientes! (Requer 2 Créditos)", "error");
    }
    if (!window.confirm("Atenção: Essa vantagem só é recomendada no 1º Dia do Round. Ao aceitar, você perderá 2 Créditos VIP e será enviado à tela de seleção de personagem, onde sua conta será resetada para o personagem novo! Deseja prosseguir?")) {
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('players').update({
      vip_credits: vipCredits - 2,
      total_vip_spent: (player.total_vip_spent || 0) + 2,
      // Forçamos o reset das estatísticas principais aqui para simular o reset de conta
      level: 1,
      xp: 0,
      ryous: 1000,
      pontos_atributos: 0
    }).eq('id', player.id);

    if (!error) {
      addToast("Conta preparada para troca de personagem!", "success");
      updatePlayer(player.user_id);
      // Aqui faríamos a lógica de redirecionar para a tela de Seleção
      navigate('/selecionar');
    } else {
      addToast("Erro: " + error.message, "error");
    }
    setLoading(false);
  };

  const milestones = [
    { spent: 5, reward: "Personagem Único Rank B" },
    { spent: 10, reward: "Personagem Único Rank A" },
    { spent: 20, reward: "Personagem Único Rank S" }
  ];

  return (
    <div className="page">
      <PageHeader 
        eyebrow="Benefícios Exclusivos" 
        title="Vantagens VIP" 
        subtitle="Apoie o jogo e ganhe facilidades para sua jornada ninja."
      />

      <div className="points-banner" style={{ background: 'var(--seal-glow)', borderColor: 'var(--seal-bright)', marginBottom: '32px' }}>
        <div>
          <div className="pts-label" style={{ color: 'var(--seal-bright)' }}>Seus Créditos VIP</div>
          <div className="pts-val gold">{vipCredits} 💎</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="pts-label">Total Gasto na Temporada</div>
          <div className="paper mono" style={{ fontSize: '18px' }}>{player.total_vip_spent || 0} Créditos</div>
        </div>
      </div>

      <div className="grid-2">
        {/* VANTAGENS */}
        <div className="card">
          <h3 className="section-title">Serviços Ninja</h3>
          
          <div style={{ padding: '16px', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '16px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <h4 className="paper" style={{ fontSize: '16px' }}>Reset de Talento Avulso</h4>
              <span className="mono gold">1 💎</span>
            </div>
            <p className="muted" style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
              Errou na build? Use este serviço para resetar exatamente UM (1) ponto de atributo sem precisar resetar toda a sua ficha técnica.
            </p>
            <button className="btn-ghost" style={{ width: '100%', borderColor: 'var(--seal-bright)' }} onClick={handleSingleTalentReset} disabled={loading}>
              Resetar Talento Avulso
            </button>
          </div>

          <div style={{ padding: '16px', border: '1px dashed #ef4444', borderRadius: '8px' }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <h4 className="danger" style={{ fontSize: '16px' }}>Troca de Personagem</h4>
              <span className="mono gold">2 💎</span>
            </div>
            <p className="muted" style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>
              Permite trocar de personagem. <strong className="danger">Atenção:</strong> Seu personagem será totalmente resetado. Recomendado apenas para o 1º dia do round.
            </p>
            <button className="btn-ghost" style={{ width: '100%', borderColor: '#ef4444', color: '#ef4444' }} onClick={handleCharacterChange} disabled={loading}>
              Mudar Personagem Inicial
            </button>
          </div>
        </div>

        {/* RECOMPENSA DE TEMPORADA */}
        <div className="card">
          <h3 className="section-title">Recompensas da Temporada</h3>
          <p className="muted" style={{ fontSize: '13px', marginBottom: '24px' }}>
            O valor gasto em VIP desbloqueia personagens únicos ao final da rodada! Acompanhe seu progresso:
          </p>
          
          <div className="flex-col" style={{ gap: '16px' }}>
            {milestones.map((ms, idx) => {
              const spent = player.total_vip_spent || 0;
              const isAchieved = spent >= ms.spent;
              const percent = Math.min(100, (spent / ms.spent) * 100);
              
              return (
                <div key={idx} style={{ background: 'var(--ink-raised)', padding: '16px', borderRadius: '8px', border: isAchieved ? '1px solid var(--seal-bright)' : '1px solid var(--line)' }}>
                  <div className="flex-between" style={{ marginBottom: '8px' }}>
                    <span className={isAchieved ? "gold" : "paper"}>{ms.reward}</span>
                    <span className="mono muted">{spent}/{ms.spent} 💎</span>
                  </div>
                  <div className="progress-track" style={{ height: '6px' }}>
                    <div className="progress-fill gold" style={{ width: `${percent}%` }} />
                  </div>
                  {isAchieved && (
                    <div className="success mono" style={{ fontSize: '10px', marginTop: '8px', textAlign: 'right' }}>✓ DESBLOQUEADO</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
