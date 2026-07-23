import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { VILLAGES_LIST } from '../constants';
import PageHeader from '../components/PageHeader';

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
  const [characters, setCharacters] = useState([]);
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

      const { data: accData } = await supabase.from('players').select('avatar').eq('user_id', session.user.id);
      if (accData) {
        const aggregated = new Set();
        accData.forEach(p => {
          if (p.avatar) aggregated.add(p.avatar);
        });
      }
      
      const vStats = {};
      for (const v of VILLAGES_LIST) {
        if (v.id === 8) continue; // Skip Akatsuki for creation
        const { count } = await supabase
          .from('players')
          .select('id', { count: 'exact', head: true })
          .eq('village_id', v.id);
        vStats[v.id] = count || 0;
      }
      setVillageStats(vStats);
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
      ...baseStats
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
      // The parent App component will auto-redirect to dashboard when player state is set
    }
  };

  const currentClass = CLASSES.find(c => c.id === selectedClass);

  return (
    <div className="page auth-screen-layout">
      
      <header className="auth-header">
        <nav className="auth-nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="btn-ghost" onClick={() => navigate('/selecionar')}>Voltar</button>
          </div>
        </nav>
      </header>

      <div className="auth-title-container" style={{ position: 'relative', zIndex: 2 }}>
        <PageHeader 
          eyebrow="Novo Personagem"
          title="Crie sua Lenda"
          subtitle="Escolha seu caminho ninja com sabedoria."
        />
      </div>

      <div className="selection-showcase" style={{ alignItems: 'flex-start' }}>
        
        {/* Lado Esquerdo: Avatar e Nome */}
        <div className="flex-col" style={{ width: '300px', flexShrink: 0 }}>
          
          <div className="card card-glass flex-col" style={{ alignItems: 'center' }}>
             <div className="selection-avatar-container mb-4">
                {selectedAvatar?.startsWith('/') ? (
                  <img src={selectedAvatar} alt="Avatar" />
                ) : (
                  <img src={`https://placehold.co/250x250/1c1c22/b3232d?text=?`} alt="Avatar" />
                )}
             </div>

             <div className="w-full mb-4">
                <label className="muted uppercase block mb-2">Nome Ninja</label>
                <input 
                  className="input" 
                  type="text" 
                  placeholder="Nome do personagem..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={20}
                  className="w-full"
                />
             </div>

             <div className="w-full">
                <label className="muted uppercase block mb-2">Selecione o Visual</label>
                <div className="flex-wrap">
                  {characters.map(c => (
                    <img 
                      key={c.id} 
                      src={c.base_avatar_url} 
                      alt={c.name}
                      onClick={() => { setSelectedCharacter(c.id); setSelectedAvatar(c.base_avatar_url); }}
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        border: selectedCharacter === c.id ? '2px solid var(--gold)' : '1px solid var(--line-bright)',
                        opacity: selectedCharacter === c.id ? 1 : 0.6
                      }}
                    />
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Lado Direito: Vila e Classe */}
        <div className="flex-col flex-1">
          
          <div className="card card-glass mb-4">
            <h3 className="card-title">Vila Oculta</h3>
            <div className="grid-3">
              {VILLAGES_LIST.filter(v => v.id !== 8).map(v => (
                <div 
                  key={v.id} 
                  className={`create-class-card ${selectedVillage === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedVillage(v.id)}
                >
                  <img src={`/images/vilas/${v.id}.png`} alt={v.name} className="w-[40px] h-[40px] mb-2" onError={(e) => e.target.style.display='none'} />
                  <div className="gold mb-1">{v.name}</div>
                  <div className="muted text-xs">Habitantes: {villageStats[v.id] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card card-glass">
            <h3 className="card-title">Classe Ninja (Especialização)</h3>
            <div className="grid-2">
              {CLASSES.map(c => (
                <div 
                  key={c.id}
                  className={`create-class-card ${selectedClass === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedClass(c.id)}
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="gold mb-1">{c.name}</div>
                  <div className="muted text-xs">{c.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 border-line-solid rounded-sm bg-ink">
               <h4 className="gold mb-2 text-sm uppercase">Atributos Base ({currentClass.name})</h4>
               <div className="flex-wrap gap-2">
                  {Object.entries(currentClass.stats).map(([stat, val]) => val > 0 && (
                    <div key={stat} className="badge badge-muted">
                      <span className="capitalize">{stat}</span> <span className="gold">+{val}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>
          
          <div className="flex-row mt-4 justify-end">
             <button className="btn-primary py-3 px-8 text-base" onClick={handleCreate} disabled={loading}>
               <span>{loading ? 'Criando...' : 'Criar Personagem'}</span>
               <div className="stamp"></div>
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
