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

const AVATARS = [
  { id: '/images/avatares/sasuke_01_kunai.png', tag: 'Sasuke - Kunai' },
  { id: '/images/avatares/sasuke_02_selagem.png', tag: 'Sasuke - Selagem' },
  { id: '/images/avatares/sasuke_03_flauta.png', tag: 'Sasuke - Flauta' },
  { id: '/images/avatares/sasuke_04_corrida.png', tag: 'Sasuke - Corrida' },
  { id: '/images/avatares/sasuke_05_costas_katana.png', tag: 'Sasuke - Katana' },
  { id: '/images/avatares/sasuke_06_kunais.png', tag: 'Sasuke - Kunais' },
  { id: '/images/avatares/sasuke_07_sharingan.png', tag: 'Sasuke - Sharingan' },
  { id: '/images/avatares/sasuke_08_chidori.png', tag: 'Sasuke - Chidori' },
  { id: '/images/avatares/sasuke_09_roupa_preta.png', tag: 'Sasuke - Som' },
  { id: '/images/avatares/sasuke_10_chidori_preto.png', tag: 'Sasuke - Chidori II' },
  { id: '/images/avatares/sasuke_11_kunai_boca.png', tag: 'Sasuke - Furtivo' },
  { id: '/images/avatares/sasuke_12_maldição.png', tag: 'Sasuke - Maldição' },
  { id: '/images/avatares/sasuke_13_combate.png', tag: 'Sasuke - Combate' },
  { id: '/images/avatares/sasuke_14_sorrindo.png', tag: 'Sasuke - Sorrindo' },
  { id: '/images/avatares/sasuke_15_velocidade.png', tag: 'Sasuke - Velocidade' },
  { id: '/images/avatares/sasuke_16_sharingan_preto.png', tag: 'Sasuke - Sharingan II' },
  { id: '/images/avatares/sasuke_17_fogo.png', tag: 'Sasuke - Fogo' },
  { id: '/images/avatares/sasuke_18_jovem.png', tag: 'Sasuke - Jovem' },
  { id: '/images/avatares/sasuke_19_hebi.png', tag: 'Sasuke - Hebi' },
  { id: '/images/avatares/sasuke_20_sharingan_adulto.png', tag: 'Sasuke - Adulto' },
  { id: '/images/avatares/sasuke_21_folhas.png', tag: 'Sasuke - Folhas' },
  { id: '/images/avatares/sasuke_22_neji_like.png', tag: 'Sasuke - Bandanas' },
  { id: '/images/avatares/sasuke_23_susanoo.png', tag: 'Sasuke - Susanoo' },
  { id: '/images/avatares/sasuke_24_eletrico.png', tag: 'Sasuke - Elétrico' },
  { id: '/images/avatares/sasuke_25_chidori_adulto.png', tag: 'Sasuke - Chidori III' },
  { id: '/images/avatares/sasuke_26_voo.png', tag: 'Sasuke - Voo' },
  { id: '/images/avatares/sasuke_27_adulto_full.png', tag: 'Sasuke - Full Art' },
  { id: '/images/avatares/sasuke_28_espada.png', tag: 'Sasuke - Espada' },
];

export default function Criar({ session, setPlayerState }) {
  const [name, setName] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(1);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!name) return alert('Digite um nome para o personagem!');
    setLoading(true);

    const newPlayer = {
      user_id: session.user.id,
      name: name,
      avatar: selectedAvatar,
      village_id: selectedVillage,
      level: 1,
      xp: 0,
      ryous: 1000, // Dinheiro inicial
      rank: 'Estudante da Academia',
      classe: 'NIN', // Base class
      // Novos 10 Atributos
      taijutsu: 0,
      ninjutsu: 0,
      genjutsu: 0,
      bukijutsu: 0,
      forca: 0,
      agilidade: 0,
      inteligencia: 0,
      selo: 0,
      resistencia: 0,
      energia: 0,
      pontos_atributos: 5
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
    <div className="login-body" style={{ minHeight: '100vh', display: 'flex', width: '100%', position: 'absolute', top: 0, left: 0, background: 'var(--ink)', flexDirection: 'column', overflowY: 'auto' }}>
      <header className="header" style={{ position: 'relative', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
        <nav className="nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="icon-btn" onClick={() => navigate('/selecionar')}>Voltar</button>
          </div>
        </nav>
      </header>

      <main className="main" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '60px 24px', flexShrink: 0 }}>
        <div className="topbar" style={{ justifyContent: 'center', textAlign: 'center', marginBottom: '60px' }}>
          <div>
            <div className="eyebrow" style={{ justifyContent: 'center' }}><div className="dash"></div><span>Forja de Heróis</span><div className="dash"></div></div>
            <h1 style={{ letterSpacing: '4px', textTransform: 'uppercase' }}>Criar Personagem</h1>
          </div>
        </div>

        <div className="showcase-grid" style={{ display: 'flex', gap: '48px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* COLUMN 1: PORTRAIT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '320px' }}>
            <div className="char-portrait" style={{ height: '400px', overflow: 'hidden' }}>
              <img src={selectedAvatar} alt="Base" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>
              <span>{loading ? 'Forjando...' : 'Criar Personagem'}</span>
              <div className="stamp"></div>
            </button>
          </div>

          {/* COLUMN 2: INFO */}
          <div className="info-block" style={{ flex: 1, minWidth: '320px', maxWidth: '500px' }}>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label style={{ color: 'var(--gold)' }}>Nome do Personagem</label>
              <input type="text" placeholder="Digite seu nome ninja" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', letterSpacing: '1px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Selecione seu Avatar
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                {AVATARS.map(av => (
                  <div 
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.id)}
                    style={{ 
                      aspectRatio: '1/1', background: 'var(--ink-raised)', border: '2px solid',
                      borderColor: selectedAvatar === av.id ? 'var(--gold)' : 'var(--line)',
                      cursor: 'pointer', overflow: 'hidden', transition: 'all 0.2s'
                    }}
                  >
                    <img src={av.id} alt={av.tag} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
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
            <div className="info-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Pontos Atributos Extras</span>
              <span style={{ color: 'var(--seal-bright)' }}>5</span>
            </div>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
