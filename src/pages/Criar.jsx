import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { VILLAGES_LIST } from '../constants';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import CharacterPortrait from '../components/CharacterPortrait';
import { canCreateCharacter, MAX_CHARACTERS_PER_ACCOUNT, validateCharacterName } from '../utils/characterCreationRules';
import '../styles/character-creation.css';
import '../styles/auth-polish-v4.css';
import '../styles/character-creation-v5.css';

const CLASSES = [
  { id: 'NIN', name: 'Ninjutsu', icon: 'scroll', desc: 'Especialista em magias.', stats: { ninjutsu: 5, inteligencia: 4, selo: 3, energia: 3, agilidade: 2, resistencia: 1, genjutsu: 1, taijutsu: 1, forca: 0, bukijutsu: 0 } },
  { id: 'TAI', name: 'Taijutsu', icon: 'swords', desc: 'Corpo-a-corpo letal.', stats: { taijutsu: 5, forca: 4, agilidade: 3, resistencia: 3, energia: 2, ninjutsu: 1, bukijutsu: 1, inteligencia: 1, genjutsu: 0, selo: 0 } },
  { id: 'GEN', name: 'Genjutsu', icon: 'sparkles', desc: 'Mestre das ilusões.', stats: { genjutsu: 5, inteligencia: 4, energia: 3, selo: 3, agilidade: 2, resistencia: 1, ninjutsu: 1, taijutsu: 1, forca: 0, bukijutsu: 0 } },
  { id: 'BUK', name: 'Bukijutsu', icon: 'shield', desc: 'Arsenal ninja.', stats: { bukijutsu: 5, agilidade: 4, forca: 3, selo: 3, resistencia: 2, taijutsu: 1, ninjutsu: 1, energia: 1, inteligencia: 0, genjutsu: 0 } }
];

const PAGE_SIZE = 18;
const normalizeName = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export default function Criar({ session, setPlayerState }) {
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [selectedVillage, setSelectedVillage] = useState(1);
  const [selectedClass, setSelectedClass] = useState('NIN');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState([]);
  const [avatars, setAvatars] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
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
        const [catalogResult, avatarResult, accountResult, villageResult] = await Promise.all([
          supabase.from('characters').select('id,name,base_avatar_url').order('id'),
          supabase.from('avatars').select('id,name,character_id,is_base').eq('is_base', true),
          supabase.from('players').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
          supabase.rpc('contar_ninjas_vila')
        ]);
        if (!active) return;

        if (catalogResult.error) throw catalogResult.error;
        if (avatarResult.error) throw avatarResult.error;
        const eligibleAvatars = (avatarResult.data || []).filter(avatar => avatar.id && avatar.character_id && avatar.is_base === true);
        const available = (catalogResult.data || []).filter(item =>
          item.id && item.base_avatar_url &&
          eligibleAvatars.some(avatar => avatar.character_id === item.id)
        );
        if (!available.length) throw new Error('Nenhum personagem inicial está disponível.');
        setCharacters(available);
        setAvatars(eligibleAvatars);
        setSelectedCharacter(available[0].id);
        setSelectedAvatar(eligibleAvatars.find(avatar =>
          avatar.character_id === available[0].id && avatar.id === available[0].base_avatar_url
        )?.id || eligibleAvatars.find(avatar => avatar.character_id === available[0].id)?.id || '');
        setCatalogPage(0);

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
          setAvatars([]);
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
    if (!avatars.some(avatar => avatar.id === selectedAvatar && avatar.character_id === selectedCharacter && avatar.is_base === true)) {
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
  const filteredCharacters = characters.filter(character =>
    normalizeName(character.name).includes(normalizeName(searchQuery.trim()))
  );
  const pageCount = Math.max(1, Math.ceil(filteredCharacters.length / PAGE_SIZE));
  const visibleCharacters = filteredCharacters.slice(catalogPage * PAGE_SIZE, (catalogPage + 1) * PAGE_SIZE);
  const selectedRecord = characters.find(character => character.id === selectedCharacter);
  const startingVariants = avatars.filter(avatar => avatar.character_id === selectedCharacter);
  const selectedVariant = startingVariants.find(avatar => avatar.id === selectedAvatar);
  const selectedVillageRecord = VILLAGES_LIST.find(village => village.id === selectedVillage);
  const selectCharacter = character => {
    setSelectedCharacter(character.id);
    setSelectedAvatar(
      avatars.find(avatar => avatar.character_id === character.id && avatar.id === character.base_avatar_url)?.id ||
      avatars.find(avatar => avatar.character_id === character.id)?.id || ''
    );
  };

  return (
    <div className="page auth-screen-layout kuro-creation-v4 kuro-create-v5">
      <header className="auth-header">
        <nav className="auth-nav" aria-label="Navegação da criação">
          <div className="brand"><div className="mark" />KUROKAGE</div>
          <div className="nav-right">
            <button type="button" className="btn-ghost" onClick={() => navigate('/selecionar')}>Voltar aos personagens</button>
          </div>
        </nav>
      </header>

      <div className="kuro-create-v5__intro">
        <PageHeader
          eyebrow="Novo Shinobi"
          title="Crie sua Lenda"
          subtitle="Escolha seu personagem, defina seu caminho e confirme sua jornada."
        />
        <ol className="kuro-create-v5__steps" aria-label="Etapas de criação">
          {[
            ['Personagem', 'Escolha seu visual'],
            ['Vila e classe', 'Defina seu estilo'],
            ['Identidade', 'Confirme seu ninja']
          ].map(([title, description], index) => (
            <li key={title}
              className={'kuro-create-v5__step' + (currentStep === index + 1 ? ' is-current' : '') + (currentStep > index + 1 ? ' is-completed' : '')}
              aria-current={currentStep === index + 1 ? 'step' : undefined}>
              <span className="kuro-create-v5__step-number">{index + 1}</span>
              <span><strong>{title}</strong><small>{description}</small></span>
            </li>
          ))}
        </ol>
      </div>

      <div className="kuro-character-create__feedback" role="status" aria-live="polite">
        <strong>Espaços de personagem:</strong> {accountCount ?? '—'} / {MAX_CHARACTERS_PER_ACCOUNT}
        {catalogLoading && <span> · Carregando catálogo...</span>}
        {accountCount !== null && accountCount >= MAX_CHARACTERS_PER_ACCOUNT &&
          <p>O limite de três personagens foi atingido. Volte à seleção para continuar jogando.</p>}
        {catalogError && <div className="kuro-character-create__error" role="alert">
          {catalogError}
          <button type="button" className="btn-ghost" onClick={() => setLoadVersion(v => v + 1)}>Tentar novamente</button>
        </div>}
      </div>

      <div className="kuro-create-v5__layout">
        <aside className="kuro-create-v5__preview" aria-label="Prévia do personagem">
          <div className="kuro-create-v5__preview-label">PRÉVIA DO SHINOBI</div>
          <div className="kuro-create-v5__portrait-stage">
            <CharacterPortrait
              src={selectedAvatar || selectedRecord?.base_avatar_url}
              alt={selectedRecord ? 'Retrato de ' + selectedRecord.name : 'Retrato do personagem'}
              className="kuro-create-v5__portrait"
              loading="eager"
            />
          </div>
          <div className="kuro-create-v5__preview-caption">
            <span>PERSONAGEM BASE</span>
            <h2>{selectedRecord?.name || 'Selecione um ninja'}</h2>
            <p>{selectedVariant?.name || 'Visual inicial'}</p>
          </div>
          <div className="kuro-create-v5__preview-meta">
            <div><span>VILA</span><strong>{selectedVillageRecord?.name || '—'}</strong></div>
            <div><span>CLASSE</span><strong>{currentClass.name}</strong></div>
          </div>
        </aside>

        <div className="kuro-create-v5__editor">
          {currentStep === 1 && (
            <section aria-labelledby="character-create-visual-label">
              <div className="kuro-create-v5__section-heading">
                <div>
                  <p className="kuro-create-v5__eyebrow">ETAPA 01</p>
                  <h2 id="character-create-visual-label">Escolha seu personagem</h2>
                  <p>Encontre seu ninja. A aparência inicial é selecionada junto com o personagem.</p>
                </div>
                <span className="kuro-create-v5__counter">{filteredCharacters.length} personagens</span>
              </div>
              <label className="kuro-create-v5__search">
                <SidebarIcon name="search" size={19} />
                <span className="sr-only">Buscar personagem pelo nome</span>
                <input type="search" value={searchQuery} placeholder="Buscar personagem pelo nome..."
                  onChange={event => { setSearchQuery(event.target.value); setCatalogPage(0); }}
                  aria-label="Buscar personagem pelo nome" />
              </label>
              <div className="kuro-create-v5__catalog" role="group" aria-labelledby="character-create-visual-label">
                {visibleCharacters.map(character => (
                  <button key={character.id} type="button"
                    className={'kuro-create-v5__character' + (selectedCharacter === character.id ? ' is-selected' : '')}
                    aria-label={'Escolher visual ' + character.name}
                    aria-pressed={selectedCharacter === character.id}
                    disabled={loading || catalogLoading}
                    onClick={() => selectCharacter(character)}>
                    <span className="kuro-create-v5__character-image">
                      <CharacterPortrait src={character.base_avatar_url} alt="" />
                    </span>
                    <strong>{character.name}</strong>
                  </button>
                ))}
                {!catalogLoading && filteredCharacters.length === 0 &&
                  <p className="kuro-create-v5__empty">Nenhum personagem encontrado. Tente outro nome.</p>}
              </div>
              {pageCount > 1 && (
                <nav className="kuro-create-v5__pagination" aria-label="Páginas de personagens">
                  <button type="button" className="btn-ghost"
                    onClick={() => setCatalogPage(page => Math.max(0, page - 1))}
                    disabled={catalogPage === 0}>Anterior</button>
                  <span>Página {catalogPage + 1} de {pageCount}</span>
                  <button type="button" className="btn-ghost"
                    onClick={() => setCatalogPage(page => Math.min(pageCount - 1, page + 1))}
                    disabled={catalogPage >= pageCount - 1}>Próxima</button>
                </nav>
              )}
              {startingVariants.length > 1 && (
                <div className="kuro-create-v5__variants">
                  <h3>Visuais iniciais disponíveis</h3>
                  <p>Variações desbloqueadas durante a jornada não aparecem nesta etapa.</p>
                  <div className="kuro-create-v5__variant-row" role="group" aria-label="Selecionar variante inicial">
                    {startingVariants.map(avatar => (
                      <button key={avatar.id} type="button"
                        className={'kuro-create-v5__variant' + (selectedAvatar === avatar.id ? ' is-selected' : '')}
                        aria-label={'Escolher ' + avatar.name}
                        title={avatar.name}
                        aria-pressed={selectedAvatar === avatar.id}
                        onClick={() => setSelectedAvatar(avatar.id)}
                        disabled={loading}>
                        <CharacterPortrait src={avatar.id} alt="" />
                        <span>{avatar.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {currentStep === 2 && (
            <section aria-labelledby="character-create-village-title">
              <div className="kuro-create-v5__section-heading">
                <div>
                  <p className="kuro-create-v5__eyebrow">ETAPA 02</p>
                  <h2 id="character-create-village-title">Vila e especialização</h2>
                  <p>Escolha sua origem e a escola de combate do seu ninja.</p>
                </div>
              </div>
              <h3 className="kuro-create-v5__field-title">Vila oculta</h3>
              <div className="kuro-create-v5__villages">
                {VILLAGES_LIST.filter(v => v.id !== 8).map(v => (
                  <button key={v.id} type="button"
                    className={'kuro-create-v5__village' + (selectedVillage === v.id ? ' is-selected' : '')}
                    onClick={() => setSelectedVillage(v.id)}
                    aria-pressed={selectedVillage === v.id}
                    disabled={loading}>
                    <img src={'/images/bg_' + v.id + '.jpg'} alt="" loading="lazy" />
                    <span><strong>{v.name}</strong><small>Habitantes: {villageStats[v.id] ?? '—'}</small></span>
                  </button>
                ))}
              </div>
              <h3 className="kuro-create-v5__field-title">Especialização ninja</h3>
              <div className="kuro-create-v5__classes">
                {CLASSES.map(c => (
                  <button key={c.id} type="button"
                    className={'kuro-create-v5__class' + (selectedClass === c.id ? ' is-selected' : '')}
                    onClick={() => setSelectedClass(c.id)}
                    aria-pressed={selectedClass === c.id}
                    disabled={loading}>
                    <span className="kuro-create-v5__class-icon"><SidebarIcon name={c.icon} size={22} /></span>
                    <span><strong>{c.name}</strong><small>{c.desc}</small></span>
                  </button>
                ))}
              </div>
              <div className="kuro-create-v5__attribute-panel">
                <h3>Atributos base · {currentClass.name}</h3>
                <div className="kuro-create-v5__attributes">
                  {Object.entries(currentClass.stats).filter(([, val]) => val > 0).map(([stat, val]) => (
                    <span key={stat} className="kuro-create-v5__attribute">
                      <span>{stat}</span><strong>+{val}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section aria-labelledby="character-create-final-title">
              <div className="kuro-create-v5__section-heading">
                <div>
                  <p className="kuro-create-v5__eyebrow">ETAPA 03</p>
                  <h2 id="character-create-final-title">Seu nome, sua história</h2>
                  <p>Revise as escolhas e confirme para começar no nível 1.</p>
                </div>
              </div>
              <label className="kuro-create-v5__name-label" htmlFor="character-create-name">Nome ninja</label>
              <input id="character-create-name" className="input kuro-create-v5__name-input"
                type="text" value={name} placeholder="Digite o nome do seu personagem"
                onChange={event => setName(event.target.value)}
                minLength={3} maxLength={24} autoComplete="off" disabled={loading} />
              <p className="kuro-create-v5__hint">Entre 3 e 24 caracteres. O nome precisa estar disponível.</p>
              <div className="kuro-create-v5__review" aria-label="Resumo de criação">
                <div><span>Personagem</span><strong>{selectedRecord?.name || '—'}</strong></div>
                <div><span>Vila</span><strong>{selectedVillageRecord?.name || '—'}</strong></div>
                <div><span>Classe</span><strong>{currentClass.name}</strong></div>
                <div><span>Início</span><strong>Nível 1 · 1.000 ryous</strong></div>
              </div>
              <p className="kuro-create-v5__warning">Confirme suas escolhas. A classe e a vila inicial são definidas na criação.</p>
            </section>
          )}

          <div className="kuro-create-v5__actions">
            {currentStep > 1 && (
              <button type="button" className="btn-ghost"
                onClick={() => setCurrentStep(step => Math.max(1, step - 1))}
                disabled={loading}>Etapa anterior</button>
            )}
            {currentStep < 3 ? (
              <button type="button" className="btn-primary"
                onClick={() => setCurrentStep(step => Math.min(3, step + 1))}
                disabled={creationBlocked || !selectedAvatar}>
                Continuar <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button type="button" className="btn-primary"
                onClick={handleCreate} disabled={creationBlocked}>
                {loading ? 'Criando...' : 'Criar Personagem'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
