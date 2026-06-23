import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const VILLAGES = [
  { id: 1, name: 'Folha', icon: '🍃' },
  { id: 2, name: 'Areia', icon: '⏳' },
  { id: 3, name: 'Névoa', icon: '🌫️' },
  { id: 4, name: 'Pedra', icon: '🪨' },
  { id: 5, name: 'Nuvem', icon: '☁️' },
  { id: 6, name: 'Som', icon: '🎵' },
  { id: 7, name: 'Chuva', icon: '🌧️' },
];

export default function Criar({ session, setPlayerState }) {
  const [name, setName] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name) return alert('Digite um nome para o personagem!');
    setLoading(true);

    const newPlayer = {
      user_id: session.user.id,
      name: name,
      village_id: selectedVillage,
      level: 1,
      xp: 0,
      ryous: 1000, // Dinheiro inicial
      rank: 'Estudante da Academia',
      classe: 'NIN', // Base class
      tai: 0, nin: 0, gen: 0, buk: 0, vel: 0, def: 0, stamina_pts: 100
    };

    const { data, error } = await supabase
      .from('players')
      .insert([newPlayer])
      .select()
      .single();

    if (error) {
      alert("Erro ao criar personagem: " + error.message);
      setLoading(false);
    } else {
      alert("Personagem criado com sucesso!");
      // Automatically select the new character
      setPlayerState({
        ...data,
        activeJutsus: []
      });
    }
  };

  return (
    <div className="login-body" style={{ minHeight: '100vh', display: 'flex', width: '100%', position: 'absolute', top: 0, left: 0, background: 'var(--ink)', flexDirection: 'column' }}>
      <header className="header" style={{ position: 'relative', borderBottom: '1px solid var(--line)' }}>
        <nav className="nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="icon-btn" onClick={() => navigate('/selecionar')}>Voltar</button>
          </div>
        </nav>
      </header>

      <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingTop: '60px' }}>
        <div className="topbar" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '60px' }}>
          <div>
            <div className="eyebrow" style={{ justifyContent: 'center' }}><div className="dash"></div><span>Forja de Heróis</span><div className="dash"></div></div>
            <h1 style={{ letterSpacing: '4px', textTransform: 'uppercase' }}>Criar Personagem</h1>
          </div>
        </div>

        <div className="showcase-grid" style={{ display: 'flex', gap: '48px', justifyContent: 'center' }}>
          {/* COLUMN 1: PORTRAIT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
            <div className="char-portrait">
              <img src="https://placehold.co/400x600/1c1c22/b3232d?text=Personagem" alt="Base" style={{ width: '100%', height: 'auto', objectFit: 'cover', filter: 'sepia(0.3) contrast(1.1)' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>
              <span>{loading ? 'Forjando...' : 'Criar Personagem'}</span>
              <div className="stamp"></div>
            </button>
          </div>

          {/* COLUMN 2: INFO */}
          <div className="info-block" style={{ flex: 1, maxWidth: '500px' }}>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ color: 'var(--gold)' }}>Nome do Personagem</label>
              <input type="text" placeholder="Digite seu nome ninja" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '1px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Vila de Origem
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {VILLAGES.map(v => (
                  <div 
                    key={v.id} 
                    title={v.name}
                    onClick={() => setSelectedVillage(v.id)}
                    style={{
                      width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', cursor: 'pointer', border: '1px solid',
                      borderColor: selectedVillage === v.id ? 'var(--seal-bright)' : 'var(--line)',
                      background: selectedVillage === v.id ? 'var(--ink-raised)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    {v.icon}
                  </div>
                ))}
              </div>
            </div>

            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Personagem Base</span>
              <span>Nível 1 (Estudante)</span>
            </div>
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Ryous Iniciais</span>
              <span style={{ color: 'var(--gold)' }}>1000</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
