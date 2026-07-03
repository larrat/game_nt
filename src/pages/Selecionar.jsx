import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { VILLAGES } from '../constants';

export default function Selecionar({ session, setPlayerState, updatePlayer }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCharacters() {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', session.user.id);
      
      if (!error && data) {
        setCharacters(data);
      }
      setLoading(false);
    }
    loadCharacters();
  }, [session]);

  const handleSelect = async (char) => {
    if (updatePlayer) {
      await updatePlayer(char.id);
    } else {
      setPlayerState({
        ...char,
        rank: char.rank || 'Estudante da Academia',
        ryous: char.ryous || 0,
        tasks_completed: char.tasks_completed || 0,
        activeJutsus: []
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>Carregando personagens...</div>;

  return (
    <div className="page auth-screen flex-col" style={{
      backgroundImage: 'url(/images/bg_selecao.jpg)'
    }}>
      <header className="auth-header">
        <nav className="auth-nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="icon-btn logout-btn" onClick={handleLogout} title="Sair">⏻</button>
          </div>
        </nav>
      </header>

      <main className="main flex-col" style={{ position: 'relative', zIndex: 1, flex: 1, maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '40px 20px', alignItems: 'center' }}>
        <div className="topbar" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '40px', marginTop: '40px' }}>
          <div>
            <div className="eyebrow gold" style={{ justifyContent: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}><div className="dash" style={{ background: 'var(--gold)' }}></div><span>Início da Jornada</span><div className="dash" style={{ background: 'var(--gold)' }}></div></div>
            <h1 className="page-title paper uppercase" style={{ letterSpacing: '4px', textShadow: '0 4px 16px rgba(0,0,0,0.9)' }}>Selecione seu Personagem</h1>
          </div>
        </div>

        {characters.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p className="muted" style={{ marginBottom: '24px' }}>Você não possui nenhum personagem criado.</p>
            <button className="btn-primary" onClick={() => navigate('/criar')}><span>Criar Personagem</span><div className="stamp"></div></button>
          </div>
        ) : (
          <div className="showcase-grid flex-row" style={{ gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {characters.map(char => (
              <div 
                key={char.id} 
                className="dashboard-card flex-col" 
                onDoubleClick={() => handleSelect(char)}
                style={{ width: '280px', alignItems: 'center', background: 'rgba(15, 15, 20, 0.9)', border: '1px solid var(--line-bright)', padding: '24px', cursor: 'pointer', transition: 'transform 0.2s' }}
              >
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--gold)', marginBottom: '16px', boxShadow: '0 0 16px rgba(201, 162, 39, 0.3)' }}>
                  {char.avatar?.startsWith('/') ? (
                    <img src={char.avatar} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={`https://placehold.co/200x200/1c1c22/b3232d?text=${char.name.charAt(0)}`} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                
                <h3 className="gold" style={{ fontSize: '18px', marginBottom: '4px', textShadow: '0 2px 8px rgba(0,0,0,0.5)', fontFamily: 'Shippori Mincho', textAlign: 'center' }}>
                  {char.name}
                </h3>
                <div className="muted mono" style={{ fontSize: '11px', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Nível {char.level}
                </div>
                
                <div className="card" style={{ width: '100%', padding: '12px', marginBottom: '20px', background: 'var(--ink)' }}>
                  <div className="info-row flex-between" style={{ marginBottom: '8px' }}>
                    <span className="muted" style={{ fontSize: '12px' }}>Patente</span>
                    <span style={{ color: 'var(--seal-bright)', fontWeight: 500, fontSize: '12px' }}>{char.rank || 'Estudante'}</span>
                  </div>
                  <div className="info-row flex-between">
                    <span className="muted" style={{ fontSize: '12px' }}>Vila Oculta</span>
                    <span style={{ fontSize: '12px' }}>{VILLAGES[char.village_id] || `ID: ${char.village_id}`}</span>
                  </div>
                </div>

                <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: '14px', marginTop: 'auto' }} onClick={() => handleSelect(char)}>
                  <span>Entrar no Mundo</span>
                </button>
              </div>
            ))}

            <div className="dashboard-card flex-col" style={{ width: '280px', height: 'auto', minHeight: '380px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px', background: 'rgba(20, 20, 25, 0.4)', transition: 'all 0.3s' }} onClick={() => navigate('/criar')}>
              <div className="muted" style={{ textAlign: 'center', transition: 'transform 0.2s' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--seal-bright)', opacity: 0.8, textShadow: '0 0 16px rgba(212, 57, 63, 0.4)' }}>+</div>
                <div className="uppercase mono" style={{ fontSize: '13px', letterSpacing: '1px' }}>Criar Personagem</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
