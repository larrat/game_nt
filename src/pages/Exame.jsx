import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { getDynamicNpcJutsus } from '../utils/engine';

export default function Exame({ player, updatePlayer }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [currentRound, setCurrentRound] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.roundWon) {
      const wonRound = location.state.roundWon;
      if (wonRound === 3) {
        completeExame();
      } else {
        setCurrentRound(wonRound + 1);
        addToast(`Você sobreviveu à Etapa ${wonRound}! Prepare-se para a próxima.`, 'info');
      }
    }
  }, [location]);

  const completeExame = async () => {
    setLoading(true);
    const { error } = await supabase.from('players').update({ passou_exame_chunin: true }).eq('id', player.id);
    if (!error) {
      addToast('Incrível! Você concluiu a Floresta da Morte e foi aprovado no Exame Chunin!', 'success');
      await updatePlayer(player.id);
      navigate('/graduacoes');
    } else {
      addToast('Erro ao salvar progresso do Exame: ' + error.message, 'error');
      setLoading(false);
    }
  };

  const startRound = async (round) => {
    setLoading(true);
    
    // Gera um inimigo difícil dependendo do round
    const npcsMap = {
      1: { name: 'Genin Experiente', levelBonus: 0, hpMult: 1.0, icon: '🥷' },
      2: { name: 'Especialista em Armadilhas', levelBonus: 2, hpMult: 1.2, icon: '👺' },
      3: { name: 'Prodígio Inimigo', levelBonus: 4, hpMult: 1.5, icon: '👹' }
    };
    
    const config = npcsMap[round];
    
    // Geramos um NPC estilo Rogue mas adaptado pro Exame
    const targetLevel = player.level + config.levelBonus;
    
    const npc = {
      id: `exame_${round}`,
      name: config.name,
      avatar: config.icon,
      level: targetLevel,
      hp: Math.floor(targetLevel * 100 * config.hpMult),
      chakra: Math.floor(targetLevel * 50),
      atk: Math.floor(targetLevel * 8),
      def: Math.floor(targetLevel * 6),
      element: ['Katon', 'Suiton', 'Doton', 'Futon', 'Raiton'][Math.floor(Math.random() * 5)],
      xpReward: Math.floor(targetLevel * 50),
      ryouReward: 0,
      desc: `Obstáculo da Etapa ${round} da Floresta da Morte.`,
      eventId: null,
      activeJutsus: [] // Pode adicionar jutsus genéricos se quiser depois
    };

    setLoading(false);
    navigate('/combate', { state: { npc, isExame: true, exameRound: round, isMirror: true } });
  };

  if (!player) return null;

  if (player.passou_exame_chunin) {
    return (
      <div className="page">
        <PageHeader eyebrow="Evento" title="Floresta da Morte" subtitle="Exame Chunin" />
        <div className="card flex-col items-center p-12 bg-ink-raised border-line-solid border-gold">
          <div className="text-6xl mb-6">📜</div>
          <h2 className="gold mb-4">Você já foi Aprovado!</h2>
          <p className="muted max-w-400 text-center leading-relaxed">
            Você já obteve os Pergaminhos do Céu e da Terra e sobreviveu à Floresta. 
            Não há necessidade de arriscar sua vida novamente.
          </p>
          <button className="btn-ghost mt-6" onClick={() => navigate('/graduacoes')}>Ir para Graduações</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
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

      <div className="grid-3 gap-lg">
        {[1, 2, 3].map(round => {
          const isActive = currentRound === round;
          const isPassed = currentRound > round;
          
          let baseClasses = 'card flex-col p-8 text-center border-line-solid transition-all';
          if (isActive) baseClasses += ' border-gold bg-ink-raised opacity-100';
          else if (isPassed) baseClasses += ' border-success bg-green-alpha-10 opacity-80';
          else baseClasses += ' border-line opacity-50';

          return (
            <div key={round} className={baseClasses}>
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
                <button 
                  className="btn-primary" 
                  onClick={() => startRound(round)}
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Lutar!'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
