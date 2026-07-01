import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';

export default function Clas({ player, updatePlayer }) {
  const [clansData, setClansData] = useState([]);
  const [selectedClanIdx, setSelectedClanIdx] = useState(0);
  const { addToast } = useToast();

  React.useEffect(() => {
    async function fetchClans() {
      const { data } = await supabase.from('clans').select('*, clan_skills(*)').order('id', { ascending: true });
      if (data) {
        const mapped = data.map(c => ({
          id: c.id,
          name: c.name,
          image: c.image_url,
          description: c.description,
          skills: c.clan_skills.map(s => ({
            name: s.name,
            req: s.req_label,
            effect: s.description,
            icon: s.icon_url
          }))
        }));
        setClansData(mapped);
      }
    }
    fetchClans();
  }, []);

  if (!player || clansData.length === 0) return <div>Carregando...</div>;

  const clan = clansData[selectedClanIdx];

  const handleJoinClan = async () => {
    if (player.clan_id) {
      addToast("Você já possui um clã!", "error");
      return;
    }

    const { error } = await supabase
      .from('players')
      .update({
        clan_id: clan.id,
      })
      .eq('id', player.id);

    if (error) {
      addToast("Erro ao entrar no Clã: " + error.message, "error");
    } else {
      addToast(`Sucesso! Agora você despertou a linhagem do ${clan.name}!`, "success");
      updatePlayer(player.user_id);
    }
  };

  return (
    <div className="page">
      <PageHeader eyebrow='Sangue e Linhagem' title='Clãs Ninja' />

      {player.clan_id ? (
        <div className="card flex-col" style={{ alignItems: 'center', padding: '48px' }}>
          <h2 className="page-title danger" style={{ marginBottom: '16px' }}>
            Linhagem Ativa
          </h2>
          <p className="muted">O sangue ancestral já corre nas suas veias.</p>
        </div>
      ) : (
        <div className="clan-system">
          {/* CAROUSEL */}
          <div className="clan-carousel flex-row" style={{ gap: '24px', marginBottom: '40px', justifyContent: 'center' }}>
            <button className="btn-ghost" onClick={() => setSelectedClanIdx(Math.max(0, selectedClanIdx - 1))}>❮</button>
            
            <div className="flex-row" style={{ gap: '16px', overflow: 'hidden', width: '600px', justifyContent: 'center' }}>
              {clansData.map((c, idx) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedClanIdx(idx)}
                  style={{ 
                    opacity: idx === selectedClanIdx ? 1 : 0.4, 
                    transform: idx === selectedClanIdx ? 'scale(1.1)' : 'scale(0.9)',
                    transition: 'all 0.3s ease',
                    border: idx === selectedClanIdx ? '2px solid var(--seal-bright)' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <img src={c.image} alt={c.name} style={{ width: '150px', height: '250px', objectFit: 'cover', borderRadius: '4px' }} />
                </div>
              ))}
            </div>

            <button className="btn-ghost" onClick={() => setSelectedClanIdx(Math.min(clansData.length - 1, selectedClanIdx + 1))}>❯</button>
          </div>

          {/* DESCRIÇÃO */}
          <div className="flex-col" style={{ maxWidth: '800px', margin: '0 auto', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
            <h2 className="page-title" style={{ marginBottom: '16px' }}>{clan.name}</h2>
            <p className="muted" style={{ lineHeight: '1.6' }}>{clan.description}</p>
          </div>

          <div className="card flex-col" style={{ marginBottom: '48px', alignItems: 'center' }}>
            <h3 className="card-title" style={{ textAlign: 'center' }}>Despertar Sanguíneo</h3>
            <p className="muted" style={{ marginBottom: '24px', textAlign: 'center' }}>Juntar-se a um clã é uma escolha para a vida toda. O bônus passivo será ativado imediatamente nas suas batalhas.</p>
            <div style={{ textAlign: 'center' }}>
              <button className="btn-primary" onClick={handleJoinClan}>
                <span>Despertar {clan.name}</span>
                <div className="stamp"></div>
              </button>
            </div>
          </div>

          {/* KEKKEI GENKAI / JUTSUS PREVIEW */}
          <div className="flex-col" style={{ gap: '24px' }}>
            <h3 className="section-title muted" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: '0' }}>Habilidades do Clã (Prévia)</h3>
            <div className="flex-row" style={{ gap: '24px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '16px' }}>
              {clan.skills.map((skill, idx) => (
                <div key={idx} className="card flex-col" style={{ width: '250px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 16px' }}>
                    <div className="flex-row" style={{ width: '100%', height: '100%', background: 'var(--ink)', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      {skill.icon ? (
                        <img src={skill.icon} alt={skill.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        '👁️'
                      )}
                    </div>
                  </div>
                  <h4 className="gold" style={{ marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>{skill.name}</h4>
                  <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Efeito:</div>
                  <div className="paper" style={{ fontSize: '13px', marginBottom: '24px' }}>{skill.effect}</div>
                  
                  <button className="btn-ghost" style={{ width: '100%' }} disabled>Treinar</button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
