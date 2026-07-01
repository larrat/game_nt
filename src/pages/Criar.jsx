import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { VILLAGES_LIST } from '../constants';

const CLASSES = [
  { id: 'NIN', name: 'Ninjutsu', icon: '📜', desc: 'Especialista em magias.', stats: { ninjutsu: 5, inteligencia: 4, selo: 3, energia: 3, agilidade: 2, resistencia: 1, genjutsu: 1, taijutsu: 1, forca: 0, bukijutsu: 0 } },
  { id: 'TAI', name: 'Taijutsu', icon: '👊', desc: 'Corpo-a-corpo letal.', stats: { taijutsu: 5, forca: 4, agilidade: 3, resistencia: 3, energia: 2, ninjutsu: 1, bukijutsu: 1, inteligencia: 1, genjutsu: 0, selo: 0 } },
  { id: 'GEN', name: 'Genjutsu', icon: '👁️', desc: 'Mestre das ilusões.', stats: { genjutsu: 5, inteligencia: 4, energia: 3, selo: 3, agilidade: 2, resistencia: 1, ninjutsu: 1, taijutsu: 1, forca: 0, bukijutsu: 0 } },
  { id: 'BUK', name: 'Bukijutsu', icon: '🗡️', desc: 'Arsenal ninja.', stats: { bukijutsu: 5, agilidade: 4, forca: 3, selo: 3, resistencia: 2, taijutsu: 1, ninjutsu: 1, energia: 1, inteligencia: 0, genjutsu: 0 } }
];

export default function Criar({ session, setPlayerState }) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('NIN');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountUnlocked, setAccountUnlocked] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [charStats, setCharStats] = useState({});
  const [villageStats, setVillageStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const { data: chars } = await supabase.from('characters').select('*').order('id');
      if (chars && chars.length > 0) {
        setCharacters(chars);
        setSelectedCharacter(chars[0].id);
        setSelectedAvatar(chars[0].base_avatar_url);
      }

      const { data: playerData } = await supabase.from('players').select('unlocked_avatars').eq('user_id', session.user.id);
      if (playerData) {
        const aggregated = new Set();
        playerData.forEach(p => {
          if (Array.isArray(p.unlocked_avatars)) {
            p.unlocked_avatars.forEach(av => aggregated.add(av));
          }
        });
        setAccountUnlocked(Array.from(aggregated));
      }
      
      const { data: statsData } = await supabase.from('players').select('character_id, village_id');
      if (statsData) {
        const cStats = {};
        const vStats = {};
        statsData.forEach(p => {
          if (p.character_id) cStats[p.character_id] = (cStats[p.character_id] || 0) + 1;
          if (p.village_id) vStats[p.village_id] = (vStats[p.village_id] || 0) + 1;
        });
        setCharStats(cStats);
        setVillageStats(vStats);
      }
    }
    loadData();
  }, [session.user.id]);

  const handleCreate = async () => {
    if (!name) { addToast('Digite um nome para o personagem!', 'error'); return; }
    setLoading(true);

    const baseStats = CLASSES.find(c => c.id === selectedClass).stats;

    const newPlayer = {
      user_id: session.user.id,
      name: name.trim(),
      village_id: selectedVillage,
      character_id: selectedCharacter,
      avatar: selectedAvatar,
      class: selectedClass,
      level: 1,
      xp: 0,
      ryous: 1000,
      pontos_atributos: 5,
      ...baseStats,
      unlocked_avatars: accountUnlocked
    };

    const { data, error } = await supabase
      .from('players')
      .insert([newPlayer])
      .select()
      .single();

    if (error) {
      addToast('Erro ao criar personagem: ' + error.message, 'error');
      setLoading(false);
    } else {
      addToast('Personagem criado com sucesso!', 'success');
      setPlayerState({
        ...data,
        activeJutsus: []
      });
    }
  };

  return (
    <div className="page" style={{ 
      backgroundImage: `url(/images/bg_login.jpg)`,
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      height: '100vh', 
      overflow: 'auto',
      padding: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(10,10,15,0.95) 30%, rgba(10,10,15,0.7) 100%)', pointerEvents: 'none' }} />

      <header style={{ position: 'relative', zIndex: 10, padding: '24px 48px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="nav-left gold mono" style={{ fontSize: '20px', letterSpacing: '2px', textTransform: 'uppercase' }}>Kurokage</div>
          <div className="nav-right">
            <button className="btn-ghost" onClick={() => navigate('/selecionar')}>Voltar para Seleção</button>
          </div>
        </nav>
      </header>

      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexWrap: 'wrap', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px', height: '600px' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, rgba(0,0,0,0) 70%)', pointerEvents: 'none' }}></div>
            <img src={selectedAvatar} alt="Herói" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.8))', transition: 'all 0.3s ease' }} />
          </div>
        </div>

        <div style={{ flex: '1 1 600px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px' }}>
          
          <div style={{ marginBottom: '40px' }}>
            <h1 className="paper" style={{ fontSize: '48px', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '2px' }}>Forja de Heróis</h1>
            <p className="muted" style={{ fontSize: '16px', lineHeight: '1.6', maxWidth: '500px' }}>
              Seu caminho ninja começa aqui. Escolha o herói que deseja encarnar, a vila que irá defender e sua especialização.
            </p>
          </div>

          <div style={{ background: 'rgba(15,15,20,0.8)', padding: '32px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            
            <div style={{ marginBottom: '32px' }}>
              <label className="gold mono uppercase" style={{ fontSize: '12px', letterSpacing: '1px', marginBottom: '16px', display: 'block' }}>Selecione o Herói (Visual)</label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {characters.map(char => (
                  <div 
                    key={char.id} 
                    className="flex-col" 
                    style={{ alignItems: 'center', gap: '8px', cursor: 'pointer', width: '72px' }} 
                    onClick={() => { setSelectedCharacter(char.id); setSelectedAvatar(char.base_avatar_url); }}
                    title={char.name}
                  >
                    <div style={{
                      width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden',
                      border: selectedCharacter === char.id ? '2px solid var(--gold)' : '1px solid var(--line)',
                      opacity: selectedCharacter === char.id ? 1 : 0.5,
                      transition: 'all 0.2s ease', background: 'var(--ink)'
                    }}>
                      <img src={char.base_avatar_url} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <span className={selectedCharacter === char.id ? 'gold' : 'muted'} style={{ fontSize: '11px', textAlign: 'center', lineHeight: '1.2' }}>
                      {char.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="gold mono uppercase" style={{ fontSize: '12px', letterSpacing: '1px', marginBottom: '16px', display: 'block' }}>Especialização Ninja (Status Base)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {CLASSES.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedClass(c.id)}
                    style={{ 
                      padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px',
                      background: selectedClass === c.id ? 'rgba(234, 179, 8, 0.1)' : 'var(--ink-raised)',
                      border: selectedClass === c.id ? '1px solid var(--gold)' : '1px solid var(--line)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div className="flex-row" style={{ gap: '12px', alignItems: 'center' }}>
                      <div style={{ fontSize: '24px' }}>{c.icon}</div>
                      <div>
                        <div className="paper" style={{ fontSize: '14px', fontWeight: 'bold' }}>{c.name}</div>
                        <div className="muted" style={{ fontSize: '11px' }}>{c.desc}</div>
                      </div>
                    </div>
                    <div className="flex-row" style={{ flexWrap: 'wrap', gap: '4px' }}>
                      {Object.entries(c.stats).filter(([k, v]) => v > 0).map(([k, v]) => (
                         <span key={k} className="badge badge-muted" style={{ fontSize: '10px', padding: '2px 4px' }}>
                           <span className="gold">{k.substring(0,3).toUpperCase()}</span>: {v}
                         </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="gold mono uppercase" style={{ fontSize: '12px', letterSpacing: '1px', marginBottom: '16px', display: 'block' }}>Vila de Origem</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {VILLAGES_LIST.filter(v => v.id !== 8).map(v => (
                  <div 
                    key={v.id}
                    onClick={() => setSelectedVillage(v.id)}
                    style={{ 
                      padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      background: selectedVillage === v.id ? 'rgba(234, 179, 8, 0.1)' : 'var(--ink-raised)',
                      border: selectedVillage === v.id ? '1px solid var(--gold)' : '1px solid var(--line)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '24px' }}>{v.icon}</div>
                    <div className="paper" style={{ fontSize: '12px', textAlign: 'center' }}>{v.name}</div>
                    <div className="muted mono" style={{ fontSize: '10px' }}>Pop: {villageStats[v.id] || 0}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '40px' }}>
              <label className="gold mono uppercase" style={{ fontSize: '12px', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>Identidade</label>
              <input 
                type="text" 
                placeholder="Digite seu nome ninja" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--line)', borderRadius: '8px', color: '#fff' }}
              />
            </div>

            <button className="btn-primary" style={{ width: '100%', padding: '18px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '2px', position: 'relative', overflow: 'hidden' }} onClick={handleCreate} disabled={loading}>
              <span style={{ position: 'relative', zIndex: 2 }}>{loading ? 'Forjando Destino...' : 'Despertar Personagem'}</span>
              <div className="stamp" style={{ position: 'absolute', zIndex: 1, top: '50%', right: '20px', transform: 'translateY(-50%)', opacity: 0.2 }}>
                <img src="/images/imgi_126_star.png" style={{ width: '32px', height: '32px' }} />
              </div>
            </button>
            
          </div>
        </div>
      </main>
    </div>
  );
}

