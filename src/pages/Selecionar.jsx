import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { VILLAGES } from '../constants';
import { useToast } from '../context/ToastContext';
import { calculateHP, calculateChakra, calculateStamina } from '../utils/engine';
import PageHeader from '../components/PageHeader';
import '../styles/character-selection.css';
import { getCharacterResources, formatCharacterRyous, getCharacterLevel } from '../utils/characterPresentation';

export default function Selecionar({ session, setPlayerState, updatePlayer }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [retryVersion, setRetryVersion] = useState(0);
  const [joining, setJoining] = useState(null);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    async function loadCharacters() {
      setLoading(true);
      setLoadError('');
      try {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', session.user.id)
          .order('id');
        if (error) throw error;
        if (!active) return;
        setCharacters(data || []);
        setCurrentIndex(previous => Math.min(previous, Math.max(0, (data || []).length - 1)));
      } catch {
        if (active) {
          setLoadError('Não foi possível carregar seus personagens. Verifique a conexão e tente novamente.');
          setCharacters([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    if (session?.user?.id) loadCharacters();
    return () => { active = false; };
  }, [session?.user?.id, retryVersion]);

  const handleSelect = async (char) => {
    if (joining !== null) return;
    setJoining(char.id);
    try {
      if (updatePlayer) {
        const loaded = await updatePlayer(char.id);
      if (loaded === false) throw new Error('Personagem não encontrado ou não pertence à conta.');
      } else {
        setPlayerState({
          ...char,
          rank: char.rank || 'Estudante da Academia',
          ryous: char.ryous || 0,
          tasks_completed: char.tasks_completed || 0,
          activeJutsus: []
        });
      }
    } catch {
      addToast('Não foi possível entrar com este personagem. Tente novamente.', 'error');
    } finally {
      setJoining(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleDelete = async (char) => {
    if (loading || joining !== null) return;
    const confirmation = window.prompt(
      `Esta ação é irreversível e apagará o progresso, itens e histórico de ${char.name}. Para confirmar, digite exatamente: ${char.name}`
    );
    if (confirmation === null) return;
    if (confirmation !== char.name) {
      addToast('O nome digitado não corresponde ao personagem. Nada foi excluído.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('excluir_personagem', {
        p_player_id: char.id,
        p_confirmation: confirmation
      });
      if (error || !data?.success || Number(data?.deleted_id) !== Number(char.id)) {
        throw new Error(error?.message || 'O servidor não confirmou a exclusão.');
      }
      addToast('Personagem removido com sucesso.', 'success');
      const updated = characters.filter(c => c.id !== char.id);
      setCharacters(updated);
      setCurrentIndex(index => Math.min(index, Math.max(0, updated.length - 1)));
    } catch (error) {
      addToast('Não foi possível remover o personagem: ' + (error?.message || 'Tente novamente.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const nextChar = () => {
    setCurrentIndex((prev) => (prev + 1) % characters.length);
  };

  const prevChar = () => {
    setCurrentIndex((prev) => (prev - 1 + characters.length) % characters.length);
  };

  if (loading) return <div className="page flex-col items-center justify-center kuro-character-select__loading" role="status" aria-live="polite">Carregando personagens...</div>;

  const char = characters[currentIndex];
  const characterResources = char ? getCharacterResources(char, {
    hp: calculateHP(char),
    chakra: calculateChakra(char),
    stamina: calculateStamina(char)
  }) : [];

  return (
    <div className="page auth-screen-layout kuro-character-select kuro-select-v2">
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

      {loadError ? (
        <div className="kuro-character-select__error card" role="alert">
          <p>{loadError}</p>
          <button type="button" className="btn-primary"
            onClick={() => setRetryVersion(v => v + 1)}>Tentar novamente</button>
        </div>
      ) : characters.length === 0 ? (
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
        <AnimatePresence mode="wait">
        <motion.div
          className="selection-showcase"
          key={char.id}
          initial={reduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -14 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          {characters.length > 1 && (
            <button type="button" className="selection-nav-arrow" onClick={prevChar} disabled={joining !== null || loading}
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
            <div className="kuro-select-v2__identity">
              <p className="kuro-select-v2__subtitle">SEU PERSONAGEM · NÍVEL {getCharacterLevel(char.level)}</p>
              <h2 className="kuro-select-v2__name">{char.name}</h2>
              <p className="kuro-select-v2__subtitle">{char.rank || 'Estudante da Academia'} · {VILLAGES[char.village_id] || 'Vila não informada'}</p>
            </div>
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
              <button type="button" className="selection-btn-play" disabled={joining !== null || loading} onClick={() => handleSelect(char)}>
                {joining === char.id ? 'Entrando...' : 'Entrar no mundo ninja'} <span aria-hidden="true">↗</span>
              </button>
              <button type="button" className="selection-btn-delete" disabled={joining !== null || loading} onClick={() => handleDelete(char)}>
                Remover personagem
              </button>
            </div>
          </div>
          
          {characters.length > 1 && (
            <button type="button" className="selection-nav-arrow" onClick={nextChar} disabled={joining !== null || loading}
              aria-label="Próximo personagem">›</button>
          )}
        </motion.div>
        </AnimatePresence>
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
