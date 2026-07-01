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
        clan: clan.name,   // Salva o nome para o motor de combate usar os bônus passivos
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
        <div className="clan-system">
          <div className="card flex-col" style={{ alignItems: 'center', padding: '48px', marginBottom: '40px', border: '1px solid var(--seal-bright)', background: 'rgba(212, 57, 63, 0.05)' }}>
            <h2 className="page-title danger" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🩸</span> Linhagem Ativa
            </h2>
            <p className="muted" style={{ textAlign: 'center' }}>O sangue ancestral já corre nas suas veias. Você possui os benefícios vitais deste clã.</p>
          </div>
          
          {(() => {
            const myClan = clansData.find(c => c.id === player.clan_id);
            if (!myClan) return null;
            return (
              <>
                <div className="flex-col" style={{ maxWidth: '800px', margin: '0 auto', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
                  <img src={myClan.image} alt={myClan.name} style={{ width: '150px', height: '250px', objectFit: 'cover', borderRadius: '4px', marginBottom: '24px', border: '2px solid var(--seal-bright)' }} />
                  <h2 className="page-title" style={{ marginBottom: '16px' }}>{myClan.name}</h2>
                  <p className="muted" style={{ lineHeight: '1.6' }}>{myClan.description}</p>
                </div>

                <div className="flex-col" style={{ gap: '24px' }}>
                  <h3 className="section-title muted" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: '0' }}>Habilidades da Linhagem</h3>
                  <div className="flex-row" style={{ gap: '24px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '16px' }}>
                    {myClan.skills.map((skill, idx) => (
                      <div key={idx} className="card flex-col" style={{ width: '250px', textAlign: 'center', flexShrink: 0, border: '1px solid var(--seal-dim)' }}>
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
                        <div className="badge badge-gold" style={{ fontSize: '10px', alignSelf: 'center', marginBottom: '12px' }}>{skill.req || 'Passiva'}</div>
                        <div className="muted" style={{ fontSize: '12px', marginBottom: '8px' }}>Efeito:</div>
                        <div className="paper" style={{ fontSize: '13px', marginBottom: '24px' }}>{skill.effect}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
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
            <p className="muted" style={{ marginBottom: '8px', textAlign: 'center' }}>Juntar-se a um clã é uma escolha para a vida toda. O bônus passivo será ativado imediatamente nas suas batalhas.</p>
            <p className="danger" style={{ fontSize: '12px', marginBottom: '24px', textAlign: 'center' }}>⚠️ Atenção: esta escolha é <strong>permanente e irreversível</strong>.</p>
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
