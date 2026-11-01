import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { VILLAGES_LIST } from '../constants';
import PageHeader from '../components/PageHeader';
import { canCreateCharacter, MAX_CHARACTERS_PER_ACCOUNT, validateCharacterName } from '../utils/characterCreationRules';
import '../styles/character-creation.css';
import '../styles/auth-polish-v4.css';

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
  const [accountCount, setAccountCount] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const creatingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    async function loadData() {
      setCatalogLoading(true);
      setCatalogError('');
      setAccountCount(null);

      try {
        const [catalogResult, accountResult, villageResult] = await Promise.all([
          supabase.from('characters').select('id,name,base_avatar_url').order('id'),
          supabase.from('players').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
          supabase.rpc('contar_ninjas_vila')
        ]);
        if (!active) return;

        if (catalogResult.error) throw catalogResult.error;
        const available = (catalogResult.data || []).filter(item => item.id && item.base_avatar_url);
        if (!available.length) throw new Error('Nenhum visual está disponível no catálogo.');
        setCharacters(available);
        setSelectedCharacter(previous => available.some(item => item.id === previous) ? previous : available[0].id);
        setSelectedAvatar(previous => available.some(item => item.base_avatar_url === previous) ? previous : available[0].base_avatar_url);

        if (accountResult.error || accountResult.count == null) {
          setCatalogError('Não foi possível verificar seus espaços de personagem. Tente novamente.');
        } else {
          setAccountCount(accountResult.count);
        }
        const stats = {};
        VILLAGES_LIST.filter(v => v.id !== 8).forEach(v => {
          if (villageResult.error) {
            stats[v.id] = null;
          } else {
            stats[v.id] = (villageResult.data || []).find(x => x.village_id === v.id)?.count ?? 0;
          }
        });
        setVillageStats(stats);
      } catch {
        if (active) {
          setCharacters([]);
          setCatalogError('Não foi possível carregar os personagens disponíveis. Tente novamente.');
        }
      } finally {
        if (active) setCatalogLoading(false);
      }
    }

    if (session?.user?.id) loadData();
    else {
      setCatalogError('Entre na sua conta antes de criar um personagem.');
      setCatalogLoading(false);
    }
    return () => { active = false; };
  }, [session?.user?.id, loadVersion]);

  const handleCreate = async () => {
    if (creatingRef.current || loading) return;
    const cleanedName = name.trim();
    const nameError = validateCharacterName(cleanedName);
    if (nameError) {
      addToast(nameError, 'error');
      return;
    }
    if (catalogLoading || catalogError || !canCreateCharacter(accountCount, characters.length)) {
      addToast(accountCount !== null && accountCount >= MAX_CHARACTERS_PER_ACCOUNT
        ? 'Você atingiu o limite de três personagens nesta conta.'
        : 'O catálogo ou os espaços da conta não estão disponíveis. Tente novamente.', 'error');
      return;
    }
    if (!characters.some(item => item.id === selectedCharacter && item.base_avatar_url === selectedAvatar)) {
      addToast('Selecione um visual válido para o personagem.', 'error');
      return;
    }

    creatingRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('criar_personagem', {
        p_name: cleanedName,
        p_village_id: selectedVillage,
        p_character_id: selectedCharacter,
        p_avatar: selectedAvatar,
        p_class: selectedClass
      });
      if (error || !data?.success || !data?.player) {
        throw new Error(error?.message || data?.error || 'Não foi possível criar o personagem.');
      }

      addToast('Personagem criado com sucesso!', 'success');
      setPlayerState({ ...data.player, activeJutsus: [] });
      // O estado do personagem redireciona para o dashboard.
    } catch (error) {
      addToast('Erro ao criar personagem: ' + (error?.message || 'Tente novamente.'), 'error');
    } finally {
      creatingRef.current = false;
      setLoading(false);
    }
  };

  const currentClass = CLASSES.find(c => c.id === selectedClass) || CLASSES[0];
  const creationBlocked = loading || catalogLoading || Boolean(catalogError) || !canCreateCharacter(accountCount, characters.length);

  return (
    <div className="page auth-screen-layout kuro-creation-v4">
      
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

<div className="kuro-character-create__feedback" role="status" aria-live="polite">
        <strong>Espaços de personagens:</strong> {accountCount ?? '—'} / {MAX_CHARACTERS_PER_ACCOUNT}
        {catalogLoading && <span> · Carregando visuais...</span>}
        {accountCount !== null && accountCount >= MAX_CHARACTERS_PER_ACCOUNT &&
          <p>Limite atingido. Volte à seleção para entrar com um personagem existente.</p>}
        {catalogError && <div className="kuro-character-create__error" role="alert">
          {catalogError}
          <button type="button" className="btn-ghost" onClick={() => setLoadVersion(v => v + 1)}>Tentar novamente</button>
        </div>}
      </div>

      <div className="selection-showcase kuro-character-create__layout" style={{ alignItems: 'flex-start' }}>
        
        {/* Lado Esquerdo: Avatar e Nome */}
        <div className="flex-col kuro-character-create__portrait-panel">
          
          <div className="card card-glass flex-col" style={{ alignItems: 'center' }}>
             <div className="selection-avatar-container mb-4">
                {selectedAvatar?.startsWith('/') ? (
                  <img src={selectedAvatar} alt="Avatar" />
                ) : (
                  <span className="kuro-character-create__fallback" aria-label="Avatar não selecionado">忍</span>
                )}
             </div>

             <div className="w-full mb-4">
                <label htmlFor="character-create-name" className="muted uppercase block mb-2">Nome Ninja</label>
                <input 
                  id="character-create-name"
                  className="input" 
                  type="text" 
                  placeholder="Nome do personagem..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  minLength={3}
                  maxLength={24}
                  autoComplete="off"
                  disabled={loading}
                />
             </div>

             <div className="w-full">
                <p id="character-create-visual-label" className="muted uppercase block mb-2">Selecione o Visual</p>
                <div className="flex-wrap kuro-character-create__visuals" role="group" aria-labelledby="character-create-visual-label">
                  {characters.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={'kuro-character-create__visual-choice ' + (selectedCharacter === c.id ? 'active' : '')}
                      aria-label={'Escolher visual ' + c.name}
                      aria-pressed={selectedCharacter === c.id}
                      onClick={() => { setSelectedCharacter(c.id); setSelectedAvatar(c.base_avatar_url); }}
                      disabled={loading || catalogLoading}
                    >
                      <img src={c.base_avatar_url} alt="" loading="lazy" />
                    </button>
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
                <button
                  key={v.id}
                  type="button"
                  className={`create-class-card ${selectedVillage === v.id ? 'active' : ''}`}
                  onClick={() => setSelectedVillage(v.id)}
                  aria-pressed={selectedVillage === v.id}
                  disabled={loading}
                >
                  <img src={`/images/bg_${v.id}.jpg`} alt={`Paisagem da ${v.name}`} className="w-12 h-12 mb-2 rounded-md object-cover border border-line-bright" loading="lazy" />
                  <div className="gold mb-1">{v.name}</div>
                  <div className="muted text-xs">Habitantes: {villageStats[v.id] ?? '—'}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="card card-glass">
            <h3 className="card-title">Classe Ninja (Especialização)</h3>
            <div className="grid-2">
              {CLASSES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className={`create-class-card ${selectedClass === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedClass(c.id)}
                  aria-pressed={selectedClass === c.id}
                  disabled={loading}
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="gold mb-1">{c.name}</div>
                  <div className="muted text-xs">{c.desc}</div>
                </button>
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
             <button className="btn-primary py-3 px-8 text-base" onClick={handleCreate} disabled={creationBlocked}>
               <span>{loading ? 'Criando...' : catalogLoading ? 'Carregando...' : accountCount >= MAX_CHARACTERS_PER_ACCOUNT ? 'Limite atingido' : 'Criar Personagem'}</span>
               <div className="stamp"></div>
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
