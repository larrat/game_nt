import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/challenges-v4.css';
import { useToast } from '../context/ToastContext';
import { getDynamicNpcJutsus } from '../utils/engine';

export default function Exame({ player, updatePlayer }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.examFailed) {
      setCurrentRound(1);
      addToast('Exame interrompido. Você precisará reiniciar pela Etapa 1.', 'warning');
    }
    if (location.state?.roundWon) {
      const wonRound = Number(location.state.roundWon);
      if (wonRound === 3) {
        completeExame();
      } else if (wonRound === 1 || wonRound === 2) {
        setCurrentRound(wonRound + 1);
        addToast(`Você sobreviveu à Etapa ${wonRound}! Prepare-se para a próxima.`, 'info');
      }
    }
  }, [location]);

  const completeExame = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('passou_exame_chunin')
      .eq('id', player.id)
      .single();

    if (!error && data?.passou_exame_chunin === true) {
      addToast('Incrível! Você concluiu a Floresta da Morte e foi aprovado no Exame Chunin!', 'success');
      await updatePlayer(player.id);
      navigate('/graduacoes');
    } else {
      addToast('O servidor ainda não confirmou a aprovação no exame. Conclua a terceira etapa novamente se necessário.', 'error');
      setLoading(false);
    }
  };

  const startRound = async (round) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('iniciar_exame_chunin', {
        p_player_id: player.id,
        p_round: round
      });

      if (error || !data?.success || !data?.session_id) {
        addToast('Não foi possível iniciar esta etapa: ' + (error?.message || data?.error || 'sessão inválida'), 'error');
        return;
      }

      const npc = {
        id: data.enemy_id,
        name: data.enemy_name,
        avatar: round === 1 ? '🥷' : round === 2 ? '👺' : '👹',
        level: data.enemy_level,
        hp: data.enemy_max_hp,
        chakra: data.enemy_chakra,
        atk: data.enemy_atk,
        def: data.enemy_def,
        element: data.enemy_element,
        xpReward: 0,
        ryouReward: 0,
        desc: `Obstáculo da Etapa ${round} da Floresta da Morte.`,
        is_chunin_exam: true
      };

      navigate('/combate', {
        state: {
          npc,
          isExame: true,
          exameRound: round,
          isMirror: false,
          bgType: 'map'
        }
      });
    } catch (error) {
      addToast('Erro ao iniciar o exame: ' + (error?.message || 'erro inesperado'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  if (player.passou_exame_chunin) {
    return (
      <div className="page kuro-exam-v4">
        <PageHeader eyebrow="Evento" title="Floresta da Morte" subtitle="Exame Chunin" />
        <div className="card flex-col items-center p-12 bg-ink-raised border-line-solid border-gold">
          <span className="kuro-challenges-v4__illustration"><SidebarIcon name="award" size={33} /></span>
          <h2 className="gold mb-4">Você já foi Aprovado!</h2>
          <p className="muted max-w-400 text-center leading-relaxed">
            Você já obteve os Pergaminhos do Céu e da Terra e sobreviveu à Floresta. 
            Não há necessidade de arriscar sua vida novamente.
          </p>
          <GameAction tone="quiet" onClick={() => navigate('/graduacoes')}>Ir para Graduações</GameAction>
        </div>
      </div>
    );
  }

  return (
    <div className="page kuro-exam-v4">
      <PageHeader eyebrow="Evento de Sobrevivência" title="Exame Chunin: Floresta da Morte" subtitle="Enfrente 3 desafios seguidos SEM RECUPERAR VIDA E CHAKRA." />
      
      <div className="card mb-6 border-line-solid border-danger">
        <h3 className="danger mb-2">⚠️ REGRAS DO EXAME ⚠️</h3>
        <ul className="muted leading-loose ml-6">
          <li>Você enfrentará <strong>3 adversários</strong> em sequência.</li>
          <li>Sua <strong>Vida e Chakra não são restaurados</strong> entre as lutas.</li>
          <li>O uso de itens e consumíveis é <strong>ESTRITAMENTE PROIBIDO</strong> durante as lutas.</li>
          <li>Se você for derrotado (HP zerar), será reprovado e terá que começar da Etapa 1 novamente.</li>
          <li>Recompensa: Pergaminho do Céu e Terra + Status de Aprovação no Exame Chunin.</li>
        </ul>
      </div>

      <div className="kuro-challenges-v4__cards">
        {[1, 2, 3].map(round => {
          const isActive = currentRound === round;
          const isPassed = currentRound > round;
          
          let baseClasses = 'card flex-col p-8 text-center border-line-solid transition-all';
          if (isActive) baseClasses += ' border-gold bg-ink-raised opacity-100';
          else if (isPassed) baseClasses += ' border-success bg-green-alpha-10 opacity-80';
          else baseClasses += ' border-line opacity-50';

          return (
            <div key={round} className={baseClasses+" kuro-challenges-v4__card"}>
              <div className="text-5xl mb-4">
                {isPassed ? '✅' : (round === 1 ? '🌲' : round === 2 ? '🕷️' : '⛩️')}
              </div>
              <h3 className={isPassed ? 'success' : isActive ? 'gold' : 'muted'}>Etapa {round}</h3>
              <p className="muted text-xs my-4 min-h-40">
                {round === 1 && 'Um Genin inimigo tentará emboscá-lo logo na entrada da floresta.'}
                {round === 2 && 'O coração da floresta abriga mestres de armadilhas. Sobreviva!'}
                {round === 3 && 'Os portões da Torre. O guardião final o aguarda.'}
              </p>
              
              {isActive && (
                <GameAction tone="seal" loading={loading} onClick={() => startRound(round)}>
                  <SidebarIcon name="swords" size={17} /> {loading ? 'Entrando...' : 'Lutar!'}
                </GameAction>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
