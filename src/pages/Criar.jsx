import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { VILLAGES_LIST } from '../constants';
import PageHeader from '../components/PageHeader';
import SidebarIcon from '../components/SidebarIcon';
import {
  STARTING_CLASS_PROFILES, STARTING_ATTRIBUTES, STARTING_ATTRIBUTE_BUDGET,
  getStartingAttributeTotal, getStartingClassProfile
} from '../utils/startingClassProfiles';
import CharacterPortrait from '../components/CharacterPortrait';
import { filterCharacterCatalog, paginateCharacterCatalog, isStartingAvatar, chooseStartingAvatar } from '../utils/characterCatalog';
import { canCreateCharacter, MAX_CHARACTERS_PER_ACCOUNT, validateCharacterName } from '../utils/characterCreationRules';
import '../styles/character-creation.css';
import '../styles/auth-polish-v4.css';
import '../styles/character-creation-v5.css';

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
  const [appearanceFilter, setAppearanceFilter] = useState('all');
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
        // Stable alphabetical catalog; never expose order-by-ID as a visual hierarchy.
        const alphabetical = [...available].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setCharacters(alphabetical);
        setAvatars(eligibleAvatars);
        setSelectedCharacter(alphabetical[0].id);
        setSelectedAvatar(chooseStartingAvatar(eligibleAvatars, alphabetical[0]));
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
    if (!isStartingAvatar(avatars, selectedCharacter, selectedAvatar)) {
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

  const currentClass = getStartingClassProfile(selectedClass);
  const creationBlocked = loading || catalogLoading || Boolean(catalogError) || !canCreateCharacter(accountCount, characters.length);
  const initialVariantCounts = new Map();
  avatars.forEach(avatar => initialVariantCounts.set(avatar.character_id,
    (initialVariantCounts.get(avatar.character_id) || 0) + 1));
  const filteredCharacters = filterCharacterCatalog(characters, searchQuery)
    .filter(character => appearanceFilter === 'multiple'
      ? (initialVariantCounts.get(character.id) || 0) > 1 : true);
  const { items: visibleCharacters, totalPages: pageCount } = paginateCharacterCatalog(filteredCharacters, catalogPage);
  const selectedRecord = characters.find(character => character.id === selectedCharacter);
  const startingVariants = avatars.filter(avatar => avatar.character_id === selectedCharacter)
    .sort((a, b) => (a.id === selectedRecord?.base_avatar_url ? -1 : b.id === selectedRecord?.base_avatar_url ? 1 : a.name.localeCompare(b.name, 'pt-BR')));
  const selectedVariant = startingVariants.find(avatar => avatar.id === selectedAvatar);
  const selectedVillageRecord = VILLAGES_LIST.find(village => village.id === selectedVillage);
  const selectCharacter = character => {
    setSelectedCharacter(character.id);
    setSelectedAvatar(chooseStartingAvatar(avatars, character));
  };
  const clearSearch = () => {
    setSearchQuery('');
    setAppearanceFilter('all');
    setCatalogPage(0);
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
          subtitle="Três escolhas simples para começar sua história: aparência, especialização e identidade."
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
          <div className="kuro-create-v5__preview-label">
            <span>PRÉVIA DO SHINOBI</span>
            <span className="kuro-create-v6__preview-step">ETAPA 0{currentStep} / 03</span>
          </div>
          <div className="kuro-create-v5__portrait-stage">
            <CharacterPortrait
              src={selectedAvatar || selectedRecord?.base_avatar_url}
              alt={selectedRecord ? 'Retrato de ' + selectedRecord.name : 'Retrato do personagem'}
              className="kuro-create-v5__portrait"
              loading="eager"
            />
          </div>
          <div className="kuro-create-v5__preview-caption">
            <span>PERSONAGEM SELECIONADO</span>
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
              <div className="kuro-create-v6__catalog-toolbar">
                <label className="kuro-create-v5__search">
                  <SidebarIcon name="search" size={19} />
                  <span className="sr-only">Buscar personagem pelo nome</span>
                  <input type="search" value={searchQuery} placeholder="Buscar entre os personagens..."
                    onChange={event => { setSearchQuery(event.target.value); setCatalogPage(0); }}
                    aria-label="Buscar personagem pelo nome" />
                </label>
                <div className="kuro-create-v6__filters" role="group" aria-label="Filtros de aparências">
                  <button type="button" className={'kuro-create-v6__filter' + (appearanceFilter === 'all' ? ' is-active' : '')}
                    aria-pressed={appearanceFilter === 'all'} onClick={() => { setAppearanceFilter('all'); setCatalogPage(0); }}>
                    Todos
                  </button>
                  <button type="button" className={'kuro-create-v6__filter' + (appearanceFilter === 'multiple' ? ' is-active' : '')}
                    aria-pressed={appearanceFilter === 'multiple'} onClick={() => { setAppearanceFilter('multiple'); setCatalogPage(0); }}>
                    Mais de um visual
                  </button>
                </div>
              </div>
              <div className="kuro-create-v5__catalog" role="group" aria-labelledby="character-create-visual-label">
                {visibleCharacters.map(character => (
                  <button key={character.id} type="button"
                    className={'kuro-create-v5__character' + (selectedCharacter === character.id ? ' is-selected' : '')}
                    aria-label={'Escolher personagem ' + character.name + ', ' + (initialVariantCounts.get(character.id) || 0) + ' aparências iniciais'}
                    aria-pressed={selectedCharacter === character.id}
                    disabled={loading || catalogLoading}
                    onClick={() => selectCharacter(character)}>
                    <span className="kuro-create-v5__character-image">
                      <CharacterPortrait src={character.base_avatar_url} alt="" />
                    </span>
                    <strong>{character.name}</strong>
                    <small className="kuro-create-v6__character-count">
                      {initialVariantCounts.get(character.id) || 0} {(initialVariantCounts.get(character.id) || 0) === 1 ? 'aparência inicial' : 'aparências iniciais'}
                    </small>
                  </button>
                ))}
                {!catalogLoading && filteredCharacters.length === 0 &&
                  <div className="kuro-create-v5__empty" role="status">
                    <strong>Nenhum personagem encontrado</strong>
                    <p>Experimente outro nome ou remova os filtros.</p>
                    <button type="button" className="btn-ghost" onClick={clearSearch}>Limpar filtros</button>
                  </div>}
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
              <div className="kuro-create-v5__variants">
                <div className="kuro-create-v6__variant-header">
                  <h3>Aparências iniciais de {selectedRecord?.name || 'seu ninja'}</h3>
                  <span className="kuro-create-v6__variant-count">
                    {startingVariants.length} {startingVariants.length === 1 ? 'visual' : 'visuais'}
                  </span>
                </div>
                <p>Escolha o retrato que acompanhará seu ninja. Evoluções e transformações são desbloqueadas no jogo.</p>
                {startingVariants.length > 1 ? (
                  <div className="kuro-create-v5__variant-row" role="group" aria-label="Selecionar variante inicial">
                    {startingVariants.map(avatar => (
                      <button key={avatar.id} type="button"
                        className={'kuro-create-v5__variant' + (selectedAvatar === avatar.id ? ' is-selected' : '')}
                        aria-label={'Escolher ' + avatar.name} title={avatar.name}
                        aria-pressed={selectedAvatar === avatar.id}
                        onClick={() => setSelectedAvatar(avatar.id)}
                        disabled={loading}>
                        <CharacterPortrait src={avatar.id} alt="" />
                        <span>{avatar.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="kuro-create-v6__single-variant">
                    <SidebarIcon name="check-circle" size={19} />
                    <span>{startingVariants[0]?.name || 'Retrato inicial'} selecionado. Este personagem tem um visual inicial cadastrado.</span>
                  </div>
                )}
              </div>
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
                {STARTING_CLASS_PROFILES.map(c => (
                  <button key={c.id} type="button"
                    className={'kuro-create-v5__class' + (selectedClass === c.id ? ' is-selected' : '')}
                    onClick={() => setSelectedClass(c.id)}
                    aria-pressed={selectedClass === c.id}
                    disabled={loading}>
                    <span className="kuro-create-v5__class-icon"><SidebarIcon name={c.icon} size={22} /></span>
                    <span><strong>{c.name}</strong><small>{c.desc}</small><small>{getStartingAttributeTotal(c.stats)} pontos iniciais</small></span>
                  </button>
                ))}
              </div>
              <div className="kuro-create-v5__attribute-panel">
                <div className="kuro-create-v5__attribute-header">
                  <h3>Atributos iniciais · {currentClass.name}</h3>
                  <strong className="kuro-create-v5__attribute-budget" aria-label="Total de pontos distribuídos">
                    {getStartingAttributeTotal(currentClass.stats)} / {STARTING_ATTRIBUTE_BUDGET} pontos
                  </strong>
                </div>
                <p className="kuro-create-v5__attribute-description">Todas as classes começam com o mesmo total. A especialização altera apenas a distribuição.</p>
                <div className="kuro-create-v5__attribute-bars">
                  {STARTING_ATTRIBUTES.map(attribute => (
                    <div key={attribute.key} className="kuro-create-v5__attribute-row">
                      <span>{attribute.label}</span>
                      <progress
                        value={currentClass.stats[attribute.key]}
                        max={STARTING_ATTRIBUTE_BUDGET}
                        aria-label={attribute.label}
                        aria-valuetext={currentClass.stats[attribute.key] + ' de ' + STARTING_ATTRIBUTE_BUDGET + ' pontos'}
                      />
                      <strong>{currentClass.stats[attribute.key]}</strong>
                    </div>
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
                <div><span>Retrato</span><strong>{selectedVariant?.name || '—'}</strong></div>
                <div><span>Vila</span><strong>{selectedVillageRecord?.name || '—'}</strong></div>
                <div><span>Classe</span><strong>{currentClass.name}</strong></div>
                <div><span>Início</span><strong>Nível 1 · 1.000 ryous</strong></div>
                <div><span>Atributos iniciais</span><strong>{getStartingAttributeTotal(currentClass.stats)} / {STARTING_ATTRIBUTE_BUDGET} pontos</strong></div>
                <div><span>Pontos para distribuir</span><strong>0 (já distribuídos na classe)</strong></div>
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
