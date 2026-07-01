import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

export default function Evento({ player, updatePlayer }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchEvent = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('global_events')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: false })
      .limit(1)
      .single();
    
    if (data) setEvent(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvent();
  }, []);

  const handleAttack = async () => {
    if (!event || event.boss_hp <= 0) return;
    
    // Converte o Evento em um NPC para a engine de combate
    const bossNpc = {
      id: `worldboss_${event.id}`,
      name: event.name,
      avatar: '/images/imgi_125_kurama.jpg', // Podíamos colocar uma imagem real se tivéssemos, mas vamos usar um emoji se falhar, ou algo genérico
      level: 100, // Nível simbólico de World Boss
      hp: event.boss_hp, // HP Real do Boss
      maxHp: event.boss_max_hp,
      chakra: 99999,
      atk: 500, // Dano Base Alto
      def: 250, // Defesa Base Alta
      element: 'Katon', // Kurama = Fogo
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
        <div className="muted" style={{ textAlign: 'center', padding: '40px' }}>Procurando anomalias no mundo...</div>
      ) : !event ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <h2 className="muted">Nenhum Evento Ativo</h2>
          <p className="muted" style={{ maxWidth: '400px', margin: '16px auto 0' }}>O mundo ninja está em paz no momento. Continue seu treinamento.</p>
          <button className="btn-ghost" onClick={() => navigate('/dashboard')} style={{ marginTop: '24px' }}>Voltar</button>
        </div>
      ) : (
        <div className="card-glass flex-col" style={{ alignItems: 'center', padding: '48px', position: 'relative', overflow: 'hidden', border: '1px solid #ef4444' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

          <h2 className="danger uppercase" style={{ fontSize: '32px', textShadow: '0 0 20px rgba(239,68,68,0.5)', marginBottom: '8px', zIndex: 1 }}>
            {event.name}
          </h2>
          <p className="paper" style={{ maxWidth: '600px', textAlign: 'center', marginBottom: '32px', zIndex: 1 }}>
            {event.description}
          </p>

          <div style={{ fontSize: '100px', marginBottom: '32px', animation: 'pulse 2s infinite', zIndex: 1 }}>
            🦊
          </div>

          <div style={{ width: '100%', maxWidth: '600px', marginBottom: '32px', zIndex: 1 }}>
            <div className="flex-between" style={{ marginBottom: '8px' }}>
              <span className="danger mono" style={{ fontSize: '14px' }}>HP DO CHEFE</span>
              <span className="paper mono" style={{ fontSize: '14px' }}>{event.boss_hp} / {event.boss_max_hp}</span>
            </div>
            <div className="progress-track" style={{ height: '24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="progress-fill" style={{ width: `${(event.boss_hp / event.boss_max_hp) * 100}%`, background: '#ef4444', boxShadow: '0 0 10px #ef4444', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ padding: '16px 48px', fontSize: '18px', background: (event.ends_at && new Date(event.ends_at) <= new Date()) ? '#555' : '#ef4444', borderColor: (event.ends_at && new Date(event.ends_at) <= new Date()) ? '#555' : '#ef4444', zIndex: 1 }}
            onClick={handleAttack}
            disabled={attacking || event.boss_hp <= 0 || (event.ends_at && new Date(event.ends_at) <= new Date())}
          >
            <span>{event.boss_hp <= 0 ? 'Chefe Morto' : (event.ends_at && new Date(event.ends_at) <= new Date()) ? 'Tempo Esgotado' : attacking ? 'Atacando...' : 'Atacar o Chefe!'}</span>
            <div className="stamp"></div>
          </button>
          
          <div className="muted mono" style={{ marginTop: '16px', fontSize: '11px', zIndex: 1 }}>
            Você ganha XP e Ryous proporcionais ao dano causado.
          </div>
        </div>
      )}
    </div>
  );
}
