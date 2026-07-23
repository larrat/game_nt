import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';

export default function Vip({ player, updatePlayer }) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showTalentModal, setShowTalentModal] = useState(false);
  const [talentInput, setTalentInput] = useState('taijutsu');
  const [showCharModal, setShowCharModal] = useState(false);
  const navigate = useNavigate();

  if (!player) return null;

  const vipCredits = player.vip_coins || 0;

  const handleSingleTalentReset = () => {
    if (vipCredits < 1) {
      return addToast("Créditos VIP insuficientes! (Requer 1 Crédito)", "error");
    }
    setShowTalentModal(true);
  };

  const confirmSingleTalentReset = async () => {
    setShowTalentModal(false);
    if (!talentInput || !player[talentInput]) {
      return addToast("Atributo inválido ou zerado.", "error");
    }

    const statKey = talentInput;
    
    setLoading(true);
    const { error } = await supabase.rpc('vip_reset_talento', {
      p_player_id: player.id,
      p_stat_name: statKey
    });

    if (error) {
      addToast("Erro: " + error.message, "error");
    } else {
      addToast(`Sucesso! Você devolveu 1 ponto de ${statKey.toUpperCase()} e gastou 1 Crédito VIP.`, "success");
      updatePlayer(player.id);
    }
    setLoading(false);
  };

  const handleCharacterChange = () => {
    if (vipCredits < 2) {
      return addToast("Créditos VIP insuficientes! (Requer 2 Créditos)", "error");
    }
    setShowCharModal(true);
  };

  const confirmCharacterChange = async () => {
    setShowCharModal(false);
    setLoading(true);
    const { error } = await supabase.rpc('vip_reset_personagem', {
      p_player_id: player.id
    });

    if (!error) {
      addToast("Conta preparada para troca de personagem!", "success");
      updatePlayer(player.id);
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

      <div className="points-banner bg-seal-glow border-seal-bright mb-8">
        <div>
          <div className="pts-label text-seal-bright">Seus Créditos VIP</div>
          <div className="pts-val gold">{vipCredits} 💎</div>
        </div>
        <div className="text-right">
          <div className="pts-label">Total Gasto na Temporada</div>
          <div className="paper mono text-lg">{player.total_vip_spent || 0} Créditos</div>
        </div>
      </div>

      <div className="grid-2">
        {/* VANTAGENS */}
        <div className="card">
          <h3 className="section-title">Serviços Ninja</h3>
          
          <div className="p-4 border-line-solid rounded-md mb-4">
            <div className="flex-between mb-2">
              <h4 className="paper text-xl">Reset de Talento Avulso</h4>
              <span className="mono gold">1 💎</span>
            </div>
            <p className="muted text-xs leading-relaxed mb-4">
              Errou na build? Use este serviço para resetar exatamente UM (1) ponto de atributo sem precisar resetar toda a sua ficha técnica.
            </p>
            <button className="btn-ghost w-full border-seal-bright" onClick={handleSingleTalentReset} disabled={loading}>
              Resetar Talento Avulso
            </button>
          </div>

          <div className="p-4 border-line-dashed border-danger rounded-md">
            <div className="flex-between mb-2">
              <h4 className="danger text-xl">Troca de Personagem</h4>
              <span className="mono gold">2 💎</span>
            </div>
            <p className="muted text-xs leading-relaxed mb-4">
              Permite trocar de personagem. <strong className="danger">Atenção:</strong> Seu personagem será totalmente resetado. Recomendado apenas para o 1º dia do round.
            </p>
            <button className="btn-ghost w-full border-danger text-danger" onClick={handleCharacterChange} disabled={loading}>
              Mudar Personagem Inicial
            </button>
          </div>
        </div>

        {/* RECOMPENSA DE TEMPORADA */}
        <div className="card">
          <h3 className="section-title">Recompensas da Temporada</h3>
          <p className="muted text-sm mb-6">
            O valor gasto em VIP desbloqueia personagens únicos ao final da rodada! Acompanhe seu progresso:
          </p>
          
          <div className="flex-col gap-4">
            {milestones.map((ms, idx) => {
              const spent = player.total_vip_spent || 0;
              const isAchieved = spent >= ms.spent;
              const percent = Math.min(100, (spent / ms.spent) * 100);
              
              return (
                <div key={idx} className={`bg-ink-raised p-4 rounded-md ${isAchieved ? 'border-line-solid border-seal-bright' : 'border-line-solid'}`}>
                  <div className="flex-between mb-2">
                    <span className={isAchieved ? "gold" : "paper"}>{ms.reward}</span>
                    <span className="mono muted">{spent}/{ms.spent} 💎</span>
                  </div>
                  <div className="progress-track h-2">
                    <div className="progress-fill gold" style={{ width: `${percent}%` }} />
                  </div>
                  {isAchieved && (
                    <div className="success mono text-xs mt-2 text-right">✓ DESBLOQUEADO</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Reset Talento */}
      {showTalentModal && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3 className="card-title text-xl mb-4">Reset de Talento</h3>
            <p className="muted mb-4 leading-relaxed">
              Selecione qual atributo você deseja remover 1 ponto. Você receberá 1 ponto livre para redistribuir.
              <br/><span className="gold">Custo: 1 Crédito VIP</span>
            </p>
            <div className="mb-6">
              <select 
                value={talentInput}
                onChange={(e) => setTalentInput(e.target.value)}
                className="w-full p-3 bg-ink border-line-solid text-paper rounded-md"
              >
                <option value="taijutsu">Taijutsu (Atual: {player.taijutsu || 0})</option>
                <option value="ninjutsu">Ninjutsu (Atual: {player.ninjutsu || 0})</option>
                <option value="genjutsu">Genjutsu (Atual: {player.genjutsu || 0})</option>
                <option value="bukijutsu">Bukijutsu (Atual: {player.bukijutsu || 0})</option>
                <option value="forca">Força (Atual: {player.forca || 0})</option>
                <option value="agilidade">Agilidade (Atual: {player.agilidade || 0})</option>
                <option value="resistencia">Resistência (Atual: {player.resistencia || 0})</option>
                <option value="energia">Energia (Atual: {player.energia || 0})</option>
                <option value="selo">Selo (Atual: {player.selo || 0})</option>
                <option value="inteligencia">Inteligência (Atual: {player.inteligencia || 0})</option>
              </select>
            </div>
            <div className="flex-row justify-end gap-3">
              <button className="btn-ghost" onClick={() => setShowTalentModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={confirmSingleTalentReset}>Confirmar Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Troca Personagem */}
      {showCharModal && (
        <div className="modal-overlay">
          <div className="modal-content card border-danger-solid">
            <h3 className="card-title danger text-xl mb-4">Troca de Personagem</h3>
            <p className="muted mb-6 leading-relaxed">
              <strong className="danger">Atenção:</strong> Essa vantagem só é recomendada no 1º Dia do Round. Ao aceitar, você perderá <span className="gold">2 Créditos VIP</span> e será enviado à tela de seleção de personagem, onde sua conta será resetada para o personagem novo! Deseja prosseguir?
            </p>
            <div className="flex-row justify-end gap-3">
              <button className="btn-ghost" onClick={() => setShowCharModal(false)}>Cancelar</button>
              <button className="btn-danger py-2 px-4" onClick={confirmCharacterChange}>Resetar Personagem</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
