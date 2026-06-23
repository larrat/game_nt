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
    <div className="login-body" style={{ minHeight: '100vh', display: 'flex', width: '100%', position: 'absolute', top: 0, left: 0, background: 'var(--ink)', flexDirection: 'column' }}>
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
            <div className="eyebrow" style={{ justifyContent: 'center' }}><div className="dash"></div><span>Início da Jornada</span><div className="dash"></div></div>
            <h1 style={{ letterSpacing: '4px', textTransform: 'uppercase' }}>Selecione seu Personagem</h1>
          </div>
        </div>

        {characters.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>Você não possui nenhum personagem criado.</p>
            <button className="btn-primary" onClick={() => navigate('/criar')}><span>Criar Personagem</span><div className="stamp"></div></button>
          </div>
        ) : (
          <div className="showcase-grid" style={{ display: 'flex', gap: '48px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {characters.map(char => (
              <div key={char.id} style={{ border: '1px solid var(--line)', background: 'var(--ink-soft)', padding: '24px', width: '300px' }}>
                <img src={`https://placehold.co/400x600/1c1c22/b3232d?text=${char.name}`} alt={char.name} style={{ width: '100%', height: 'auto', objectFit: 'cover', filter: 'sepia(0.3) contrast(1.1)', marginBottom: '16px' }} />
                
                <h3 style={{ fontFamily: "'Shippori Mincho', serif", color: 'var(--gold)', fontSize: '20px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '12px' }}>
                  {char.name}
                </h3>
                
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Nível</span>
                  <span>{char.level}</span>
                </div>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Patente</span>
                  <span>{char.rank || 'Estudante'}</span>
                </div>
                <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Vila (ID)</span>
                  <span>{char.village_id}</span>
                </div>

                <button className="btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => handleSelect(char)}>
                  <span>Selecionar</span>
                  <div className="stamp"></div>
                </button>
              </div>
            ))}

            <div style={{ border: '1px dashed var(--line)', background: 'transparent', padding: '24px', width: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => navigate('/criar')}>
              <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>+</div>
                <div>Criar Novo Personagem</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
