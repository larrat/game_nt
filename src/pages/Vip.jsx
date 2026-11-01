import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/challenges-v4.css';

export default function Vip({ player, updatePlayer }) {
  const vipCredits = player?.vip_coins || 0;

  const { addToast } = useToast();
  const [vipResetAvailable, setVipResetAvailable] = useState(false);
  const [chosenAttribute, setChosenAttribute] = useState('forca');
  const [busy, setBusy] = useState(false);
  const attributes = [
    'forca','agilidade','resistencia','inteligencia','energia',
    'ninjutsu','taijutsu','genjutsu','bukijutsu','selo'
  ];

  useEffect(() => {
    let active = true;
    supabase.from('game_config').select('value').eq('key','vip_point_respec_enabled').maybeSingle()
      .then(({ data, error }) => {
        if (active && !error && data?.value === true) setVipResetAvailable(true);
      });
    return () => { active = false; };
  }, []);

  const handleResetTalent = async () => {
    if (!vipResetAvailable || busy || !player?.id) return;
    if ((player.vip_coins || 0) < 1) {
      addToast('Você precisa de 1 crédito VIP.', 'warning');
      return;
    }
    if (!window.confirm('Devolver 1 ponto de ' + chosenAttribute +
      ' à sua ficha por 1 crédito VIP? A operação será registrada.')) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('vip_reset_talento', {
        p_player_id: player.id, p_atributo: chosenAttribute
      });
      if (error || !data?.success) {
        addToast(error?.message || data?.error || 'O servidor recusou o reset.', 'error');
        return;
      }
      await updatePlayer(player.id);
      addToast('1 ponto devolvido. 1 crédito VIP debitado pelo servidor.', 'success');
    } catch (error) {
      addToast(error?.message || 'Falha ao redefinir atributo.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!player) return null;

  const milestones = [
    { spent: 5, reward: "Personagem Único Rank B" },
    { spent: 10, reward: "Personagem Único Rank A" },
    { spent: 20, reward: "Personagem Único Rank S" }
  ];

  return (
    <div className="page kuro-vip-v4">
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

      <div className="kuro-challenges-v4__grid">
        {/* VANTAGENS */}
        <div className="card kuro-ui-card">
          <h3 className="section-title">Serviços Ninja</h3>
          
          <div className="p-4 border-line-solid rounded-md mb-4">
            <div className="flex-between mb-2">
              <h4 className="paper text-xl">Reset de Talento Avulso</h4>
              <span className="mono gold">1 💎</span>
            </div>
            <p className="muted text-xs leading-relaxed mb-4">
              Errou na build? Use este serviço para resetar exatamente UM (1) ponto de atributo sem precisar resetar toda a sua ficha técnica.
            </p>
            <label htmlFor="vip-reset-attribute" className="muted text-xs mb-2 block">Atributo a ajustar</label>
            <select id="vip-reset-attribute" value={chosenAttribute}
              onChange={event => setChosenAttribute(event.target.value)}
              className="w-full bg-ink paper rounded-md p-2 mb-3" disabled={!vipResetAvailable || busy}>
              {attributes.map(attribute => <option key={attribute} value={attribute}>{attribute}</option>)}
            </select>
            <GameAction tone="quiet" className="w-full" loading={busy}
              onClick={handleResetTalent} disabled={!vipResetAvailable || busy || vipCredits < 1}>
              {vipResetAvailable ? 'Devolver 1 ponto — 1 crédito' : 'Resetar Talento — aguardando homologação'}
            </GameAction>
          </div>

          <div className="p-4 border-line-dashed border-danger rounded-md">
            <div className="flex-between mb-2">
              <h4 className="danger text-xl">Troca de Personagem</h4>
              <span className="mono gold">2 💎</span>
            </div>
            <p className="muted text-xs leading-relaxed mb-4">
              Permite trocar de personagem. <strong className="danger">Atenção:</strong> Seu personagem será totalmente resetado. Recomendado apenas para o 1º dia do round.
            </p>
            <GameAction tone="danger" className="w-full" disabled={!vipResetAvailable}>
              Trocar Personagem — indisponível
            </GameAction>
          </div>
        </div>

        {/* RECOMPENSA DE TEMPORADA */}
        <div className="card kuro-ui-card">
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

      <p className="muted text-xs mt-5" role="status">
        O reset de um ponto só será liberado após homologação da RPC transacional e será cobrado no servidor.
        A troca completa de personagem continua indisponível para preservar inventário, técnicas e histórico.
      </p>
    </div>
  );
}
