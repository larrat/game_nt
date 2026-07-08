import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import PageHeader from '../components/PageHeader';
import { useToast } from '../context/ToastContext';
import { rankValue } from '../utils/engine';

export default function Clas({ player, updatePlayer }) {
  const [clansData, setClansData] = useState([]);
  const [clanJutsus, setClanJutsus] = useState([]);
  const [myLearnedJutsus, setMyLearnedJutsus] = useState([]);
  const [selectedClanIdx, setSelectedClanIdx] = useState(0);
  const { addToast } = useToast();

  const fetchLearned = async () => {
    if (!player) return;
    const { data } = await supabase.from('player_jutsus').select('jutsu_id').eq('player_id', player.id);
    if (data) setMyLearnedJutsus(data.map(d => d.jutsu_id));
  };

  React.useEffect(() => {
    async function fetchClans() {
      // Busca os Clãs e as Passivas
      const { data: cData } = await supabase.from('clans').select('*, clan_skills(*)').order('id', { ascending: true });
      // Busca os Jutsus Ocultos de Clã
      const { data: jData } = await supabase.from('jutsus').select('*').not('req_clan', 'is', null);

      if (cData) {
        const mapped = cData.map(c => ({
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
      if (jData) setClanJutsus(jData);
      await fetchLearned();
    }
    if (player) fetchClans();
  }, [player]);

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
        clan: clan.name,
      })
      .eq('id', player.id);

    if (error) {
      addToast("Erro ao entrar no Clã: " + error.message, "error");
    } else {
      addToast(`Sucesso! Agora você despertou a linhagem do ${clan.name}!`, "success");
      updatePlayer(player.user_id);
    }
  };

  const handleLearnKinjutsu = async (jutsu) => {
    const cost = jutsu.cost_ryous || (jutsu.lvl * 150); // Fallback caso não tenha cost_ryous
    if (player.ryous < cost) {
      addToast(`Ryous insuficientes! Custa RY$ ${cost}.`, "error");
      return;
    }

    const { error: err1 } = await supabase.from('players').update({ ryous: player.ryous - cost }).eq('id', player.id);
    if (err1) {
      addToast("Erro ao deduzir ryous.", "error");
      return;
    }

    const { error: err2 } = await supabase.from('player_jutsus').insert({ player_id: player.id, jutsu_id: jutsu.id });
    if (err2) {
      addToast("Erro ao aprender kinjutsu.", "error");
      return;
    }

    addToast(`Você aprendeu a técnica secreta: ${jutsu.name}!`, "success");
    await fetchLearned();
    updatePlayer(player.user_id);
  };

  const renderClanContent = (myClan) => {
    const myJutsus = clanJutsus.filter(j => myClan.name.includes(j.req_clan) || j.req_clan.includes(myClan.name)).sort((a,b) => a.lvl - b.lvl);

    return (
      <>
        <div className="flex-col" style={{ maxWidth: '800px', margin: '0 auto', alignItems: 'center', textAlign: 'center', marginBottom: '48px' }}>
          <img src={myClan.image} alt={myClan.name} style={{ width: '150px', height: '250px', objectFit: 'cover', borderRadius: '4px', marginBottom: '24px', border: '2px solid var(--seal-bright)' }} />
          <h2 className="page-title" style={{ marginBottom: '16px' }}>{myClan.name}</h2>
          <p className="muted" style={{ lineHeight: '1.6' }}>{myClan.description}</p>
        </div>

        {/* ÁRVORE DE PASSIVAS */}
        <div className="flex-col" style={{ gap: '24px', marginBottom: '48px' }}>
          <h3 className="section-title muted" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: '0' }}>Despertar (Bônus Passivo)</h3>
          <div className="flex-row" style={{ gap: '24px', justifyContent: 'center', overflowX: 'auto', paddingBottom: '16px' }}>
            {myClan.skills.map((skill, idx) => (
              <div key={`passive-${idx}`} className="card flex-col" style={{ width: '250px', textAlign: 'center', flexShrink: 0, border: '1px solid var(--gold)' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 16px' }}>
                  <div className="flex-row" style={{ width: '100%', height: '100%', background: 'var(--ink)', justifyContent: 'center', border: '1px solid var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                    {skill.icon ? <img src={skill.icon} alt={skill.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👁️'}
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

        {/* JUTSUS OCULTOS (ÁRVORE DE HABILIDADES) */}
        {myJutsus.length > 0 && (
          <div className="flex-col" style={{ gap: '24px' }}>
            <h3 className="section-title danger" style={{ textAlign: 'center', borderBottom: 'none', paddingBottom: '0' }}>Técnicas Ocultas (Kinjutsu)</h3>
            <p className="muted" style={{ textAlign: 'center', marginBottom: '16px' }}>Esses Jutsus só podem ser aprendidos na Academia Ninja por membros deste clã.</p>
            <div className="grid-3" style={{ gap: '16px' }}>
              {myJutsus.map(jutsu => {
                const isRankUnlocked = !jutsu.req_rank || rankValue(player.rank) >= rankValue(jutsu.req_rank);
                const isLvlUnlocked = player.level >= jutsu.lvl;
                const isUnlocked = isRankUnlocked && isLvlUnlocked;

                return (
                  <div key={jutsu.id} className="card flex-col" style={{ border: isUnlocked ? '1px solid #ef4444' : '1px solid var(--line)', opacity: isUnlocked ? 1 : 0.6 }}>
                    <div className="flex-row" style={{ alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ width: '48px', height: '48px', background: 'var(--ink)', borderRadius: '4px', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <img src={jutsu.icon_url || '/images/default_jutsu.png'} alt={jutsu.name} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                      </div>
                      <div>
                        <h4 className="paper" style={{ fontSize: '14px', fontWeight: 'bold' }}>{jutsu.name}</h4>
                        <div className="badge badge-muted" style={{ fontSize: '10px', marginTop: '4px' }}>{jutsu.req_rank || 'Genin'}</div>
                      </div>
                    </div>
                    
                    <div className="grid-2 mono" style={{ gap: '8px', fontSize: '11px', marginBottom: '16px' }}>
                      <div style={{ color: '#ef4444' }}>Dano: {jutsu.damage}</div>
                      <div style={{ color: '#60a5fa' }}>CP: {jutsu.cost}</div>
                      <div style={{ color: 'var(--muted)' }}>Precisão: {jutsu.accuracy}%</div>
                      <div style={{ color: 'var(--gold)' }}>Recarga: {jutsu.cooldown || 0}T</div>
                    </div>

                    {!isUnlocked ? (
                       <div className="muted" style={{ fontSize: '11px', textAlign: 'center', marginTop: 'auto' }}>
                         Bloqueado (Requer: Lvl {jutsu.lvl} / {jutsu.req_rank})
                       </div>
                    ) : myLearnedJutsus.includes(jutsu.id) ? (
                       <div className="success" style={{ fontSize: '11px', textAlign: 'center', marginTop: 'auto', padding: '8px', background: 'rgba(34,197,94,0.1)', borderRadius: '4px' }}>
                         ✓ Técnica Aprendida
                       </div>
                    ) : (
                       <button 
                         className="btn-primary" 
                         style={{ marginTop: 'auto', width: '100%', fontSize: '12px', padding: '8px' }}
                         onClick={() => handleLearnKinjutsu(jutsu)}
                       >
                         Aprender (RY$ {jutsu.cost_ryous || (jutsu.lvl * 150)})
                       </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
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
            const myClan = clansData.find(c => c.id == player.clan_id);
            if (!myClan) return <div className="muted" style={{textAlign:'center'}}>Clã não encontrado no banco de dados.</div>;
            return renderClanContent(myClan);
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

          {/* PREVIEW DO CLÃ */}
          {renderClanContent(clan)}

        </div>
      )}
    </div>
  );
}
