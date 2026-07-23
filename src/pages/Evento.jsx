import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { fetchActiveWorldBoss, isEventExpired } from '../utils/eventUtils';

export default function Evento({ player, updatePlayer }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchEvent = async () => {
    setLoading(true);
    const data = await fetchActiveWorldBoss(supabase);
    setEvent(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvent();
  }, []);

  useEffect(() => {
    if (!event?.ends_at) return;
    const tick = () => {
      const diff = new Date(event.ends_at) - new Date();
      if (diff <= 0) {
        setTimeLeft('Renovando...');
        fetchEvent();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [event?.id, event?.ends_at]);

  const getRankMaxTickets = (rank) => {
    switch (rank) {
      case 'Estudante da Academia':
      case 'Genin': return 2;
      case 'Chunin': return 3;
      case 'Jounin':
      case 'ANBU': return 4;
      case 'Sannin':
      case 'Herói': return 5;
      default: return 2;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const maxTickets = getRankMaxTickets(player?.rank);
  const currentTickets = player?.last_event_date === todayStr ? (player?.event_tickets ?? maxTickets) : maxTickets;

  const dayOfWeek = new Date().getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const eventExpired = event ? isEventExpired(event) : false;

  const handleAttack = async () => {
    if (!event || event.boss_hp <= 0 || eventExpired) return;
    if (isWeekend) {
      addToast('O World Boss descansa nos finais de semana!', 'error');
      return;
    }
    if (currentTickets <= 0) {
      addToast('Você não tem mais entradas diárias para hoje!', 'error');
      return;
    }

    setAttacking(true);
    const { error } = await supabase.from('players').update({
      last_event_date: todayStr,
      event_tickets: currentTickets - 1
    }).eq('id', player.id);

    if (error) {
      addToast('Erro ao consumir ticket: ' + error.message, 'error');
      setAttacking(false);
      return;
    }
    await updatePlayer(player.id);
    setAttacking(false);

    const bossNpc = {
      id: `worldboss_${event.id}`,
      name: event.name,
      avatar: '/images/imgi_125_kurama.jpg',
      level: 100,
      hp: event.boss_hp,
      maxHp: event.boss_max_hp,
      chakra: 99999,
      atk: 500,
      def: 250,
      element: 'Katon',
      isWorldBoss: true,
      eventId: event.id
    };

    navigate('/combate', { state: { npc: bossNpc, isWorldBoss: true } });
  };

  if (!player) return null;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Guerra Ninja"
        title="Evento Global"
        subtitle="Una forças com outros ninjas para combater ameaças ao mundo shinobi."
      />

      {loading ? (
        <div className="muted text-center p-10">Procurando anomalias no mundo...</div>
      ) : isWeekend ? (
        <div className="card text-center px-6 py-12">
          <h2 className="muted">Fim de Semana de Descanso</h2>
          <p className="muted max-w-400 mx-auto mt-4">Os Kages ordenaram que as expedições param aos sábados e domingos para a manutenção das barreiras da Vila. Volte segunda-feira!</p>
          <button className="btn-ghost mt-6" onClick={() => navigate('/dashboard')}>Voltar</button>
        </div>
      ) : !event ? (
        <div className="card text-center px-6 py-12">
          <h2 className="muted">Nenhum Evento Ativo</h2>
          <p className="muted max-w-400 mx-auto mt-4">O mundo ninja está em paz no momento. Continue seu treinamento.</p>
          <button className="btn-ghost mt-6" onClick={() => navigate('/dashboard')}>Voltar</button>
        </div>
      ) : (
        <div className="card-glass flex-col items-center p-12 relative overflow-hidden border-danger">

          <div className="absolute inset-0 bg-gradient-radial-danger pointer-events-none" />

          <h2 className="danger uppercase text-4xl mb-2 z-10 drop-shadow-danger">
            {event.name}
          </h2>
          <p className="paper max-w-600 text-center mb-4 z-10">
            {event.description}
          </p>

          <div className="flex-row gap-md mb-8 z-10 flex-wrap justify-center">
            <span className="badge badge-gold">Tickets: {currentTickets} / {maxTickets}</span>
            {timeLeft && <span className="badge badge-muted">Termina em: {timeLeft}</span>}
          </div>

          <div className="text-8xl mb-8 animate-pulse z-10">
            🦊
          </div>

          <div className="w-full max-w-600 mb-8 z-10">
            <div className="flex-between mb-2">
              <span className="danger mono text-sm">HP DO CHEFE</span>
              <span className="paper mono text-sm">{event.boss_hp} / {event.boss_max_hp}</span>
            </div>
            <div className="progress-track h-6 bg-danger-alpha-10 border-danger-alpha-30">
              <div className="progress-fill bg-danger shadow-danger transition-all" style={{ width: `${(event.boss_hp / event.boss_max_hp) * 100}%` }}></div>
            </div>
          </div>

          <button
            className="btn-primary px-12 py-4 text-xl bg-danger border-danger z-10"
            onClick={handleAttack}
            disabled={attacking || event.boss_hp <= 0 || currentTickets <= 0 || eventExpired}
          >
            <span>{event.boss_hp <= 0 ? 'Chefe Morto' : currentTickets <= 0 ? 'Sem Tickets' : attacking ? 'Entrando...' : 'Atacar o Chefe!'}</span>
            <div className="stamp"></div>
          </button>

          <div className="muted mono mt-4 text-sm z-10 text-center">
            Sua patente ({player.rank}) garante {maxTickets} entradas diárias. <br/> Você ganha XP e Ryous proporcionais ao dano causado.
          </div>
        </div>
      )}
    </div>
  );
}
