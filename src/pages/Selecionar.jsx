import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { VILLAGES } from '../constants';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';
import PageHeader from '../components/PageHeader';
import { getCharacterResources, formatCharacterRyous, getCharacterLevel } from '../utils/characterPresentation';

export default function Selecionar({ session, setPlayerState, updatePlayer }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    async function loadCharacters() {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', session.user.id)
        .order('id');
      
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

  const handleDelete = async (char) => {
    if (window.confirm(`Tem certeza que deseja deletar o personagem ${char.name}? Esta ação é irreversível.`)) {
      setLoading(true);
      const { error } = await supabase.from('players').delete().eq('id', char.id);
      if (error) {
        addToast('Erro ao deletar personagem: ' + error.message, 'error');
      } else {
        addToast('Personagem deletado com sucesso.', 'success');
        const updated = characters.filter(c => c.id !== char.id);
        setCharacters(updated);
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
      setLoading(false);
    }
  };

  const nextChar = () => {
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  };

  const prevChar = () => {
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  if (loading) return <div className="page flex-col items-center justify-center">Carregando personagens...</div>;

  const char = characters[currentIndex];
  const characterResources = char ? getCharacterResources(char, {
    hp: calculateHP(char),
    chakra: calculateChakra(char),
    stamina: calculateStamina(char)
  }) : [];

  return (
    <div className="page auth-screen-layout kuro-character-select">
      <div className="auth-bg-title">SELECIONE SEU PERSONAGEM</div>
      
      <header className="auth-header">
        <nav className="auth-nav">
          <div className="brand"><div className="mark"></div>KUROKAGE</div>
          <div className="nav-right">
            <button className="icon-btn logout-btn" onClick={handleLogout} title="Sair">⏻ Sair</button>
          </div>
        </nav>
      </header>

      <div className="auth-title-container relative z-[2]">
        <PageHeader 
          eyebrow="Início da Jornada"
          title="Selecione seu Personagem"
          subtitle="Escolha seu herói e entre no mundo shinobi."
        />
      </div>

      {characters.length === 0 ? (
        <div className="text-center relative z-[2]">
          <p className="muted mb-6">Você não possui nenhum personagem criado.</p>
          <button className="btn-primary" onClick={() => navigate('/criar')}><span>Criar Personagem</span><div className="stamp"></div></button>
        </div>
      ) : (
        <div className="kuro-character-select__stage" aria-live="polite">
        <div className="kuro-character-select__counter">
          <span>PERSONAGEM {currentIndex + 1} / {characters.length}</span>
          <span>{char.rank || 'Estudante da Academia'}</span>
        </div>
        <div className="selection-showcase" key={char.id}>
          {characters.length > 1 && (
            <button type="button" className="selection-nav-arrow" onClick={prevChar}
              aria-label="Personagem anterior">‹</button>
          )}

          <div className="selection-avatar-container">
            {char.avatar?.startsWith('/') ? (
              <img src={char.avatar} alt={char.name} />
            ) : (
              <span className="kuro-character-select__avatar-fallback" aria-label={char.name}>忍</span>
            )}
          </div>

          <div className="selection-details-container">
            <div className="selection-info-grid">
              
              <div className="selection-info-col">
                <h3>Informações</h3>
                <div className="selection-stat-row">
                  <span className="selection-stat-label">Nome:</span>
                  <span className="selection-stat-value">{char.name}</span>
                </div>
                <div className="selection-stat-row">
                  <span className="selection-stat-label">Level:</span>
                  <span className="selection-stat-value">{getCharacterLevel(char.level)}</span>
                </div>
                <div className="selection-stat-row">
                  <span className="selection-stat-label">Graduação:</span>
                  <span className="selection-stat-value">{char.rank || 'Estudante'}</span>
                </div>
                <div className="selection-stat-row">
                  <span className="selection-stat-label">Ryous:</span>
                  <span className="selection-stat-value">RY$ {formatCharacterRyous(char.ryous)}</span>
                </div>
                <div className="selection-stat-row">
                  <span className="selection-stat-label">Vila:</span>
                  <span className="selection-stat-value">{VILLAGES[char.village_id]}</span>
                </div>
              </div>

              <div className="selection-info-col">
                <h3>Atributos</h3>
                
                {characterResources.map(resource => (
                  <div className="selection-bar-row kuro-character-select__stat" key={resource.key}>
                    <div className="kuro-character-select__stat-heading">
                      <span className="selection-bar-label">{resource.label}</span>
                      <span className="kuro-character-select__stat-numbers">
                        {resource.current.toLocaleString('pt-BR')} / {resource.max.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <progress
                      className={'kuro-character-select__meter is-' + resource.key}
                      aria-label={resource.label}
                      value={resource.current}
                      max={resource.max}
                    />
                  </div>
                ))}
              </div>

            </div>

            <div className="selection-actions">
              <button type="button" className="selection-btn-play" onClick={() => handleSelect(char)}>
                Entrar no mundo ninja <span aria-hidden="true">↗</span>
              </button>
              <button type="button" className="selection-btn-delete" onClick={() => handleDelete(char)}>
                Remover personagem
              </button>
            </div>
          </div>
          
          {characters.length > 1 && (
            <button type="button" className="selection-nav-arrow" onClick={nextChar}
              aria-label="Próximo personagem">›</button>
          )}
        </div>
        </div>
      )}

      {characters.length > 0 && characters.length < 3 && (
         <div className="text-center mt-16 relative z-[2]">
            <button className="btn-ghost" onClick={() => navigate('/criar')}>+ Criar Novo Personagem</button>
         </div>
      )}
    </div>
  );
}
