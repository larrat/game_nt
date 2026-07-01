import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Selecionar({ session, setPlayerState }) {
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

  const handleSelect = (char) => {
    setPlayerState({
      ...char,
      rank: char.rank || 'Estudante da Academia',
      ryous: char.ryous || 0,
      tasks_completed: char.tasks_completed || 0,
      activeJutsus: []
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>Carregando personagens...</div>;

  return (
    <div className="page login-body flex-col" style={{ 
      minHeight: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, 
      background: 'linear-gradient(to bottom, rgba(11, 11, 13, 0.85) 0%, rgba(11, 11, 13, 0.6) 100%), url(/images/bg_selecao.jpg) center/cover no-repeat'
    }}>
      <header className="header" style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
        <nav className="nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="icon-btn logout-btn" onClick={handleLogout}>⏻</button>
          </div>
        </nav>
      </header>

      <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingTop: '60px' }}>
        <div className="topbar" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '60px' }}>
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
          <div className="showcase-grid flex-row" style={{ gap: '48px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {characters.map(char => (
              <div key={char.id} className="dashboard-card flex-col" style={{ width: '320px', alignItems: 'center', background: 'rgba(20, 20, 25, 0.85)' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--gold)', marginBottom: '24px', boxShadow: '0 0 24px rgba(201, 162, 39, 0.3)' }}>
                  {char.avatar?.startsWith('/') ? (
                    <img src={char.avatar} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img src={`https://placehold.co/200x200/1c1c22/b3232d?text=${char.name.charAt(0)}`} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                
                <h3 className="gold card-title" style={{ marginBottom: '24px', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {char.name}
                </h3>
                
                <div className="card" style={{ width: '100%', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="info-row flex-between" style={{ marginBottom: '12px' }}>
                    <span className="muted" style={{ fontSize: '13px' }}>Nível</span>
                    <span className="mono" style={{ fontWeight: 'bold' }}>{char.level}</span>
                  </div>
                  <div className="info-row flex-between" style={{ marginBottom: '12px' }}>
                    <span className="muted" style={{ fontSize: '13px' }}>Patente</span>
                    <span style={{ color: 'var(--seal-bright)', fontWeight: 500 }}>{char.rank || 'Estudante'}</span>
                  </div>
                  <div className="info-row flex-between">
                    <span className="muted" style={{ fontSize: '13px' }}>Vila Oculta</span>
                    <span>{char.village_id === 1 ? 'Folha' : `ID: ${char.village_id}`}</span>
                  </div>
                </div>

                <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '14px', marginTop: 'auto' }} onClick={() => handleSelect(char)}>
                  <span>Entrar no Mundo</span>
                  <div className="stamp"></div>
                </button>
              </div>
            ))}

            <div className="dashboard-card flex-col" style={{ width: '320px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px', background: 'rgba(20, 20, 25, 0.5)' }} onClick={() => navigate('/criar')}>
              <div className="muted" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px', color: 'var(--seal-bright)', opacity: 0.8, textShadow: '0 0 16px rgba(212, 57, 63, 0.4)' }}>+</div>
                <div className="uppercase" style={{ fontSize: '16px', letterSpacing: '1px' }}>Criar Personagem</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
