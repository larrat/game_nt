import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarIcon from '../components/SidebarIcon';
import GameAction from '../components/ui/GameAction';
import { supabase } from '../supabaseClient';
import PageHeader from '../components/PageHeader';
import NpcPortrait from '../components/NpcPortrait';
import { OPPONENT_TABS, filterOpponentRows, opponentStatus, toOpponentRows } from '../utils/opponentBrowse';
import '../styles/opponents.css';

const PAGE_SIZE = 24;

async function fetchOpponents(source) {
  if (source === 'catalog') {
    return supabase.from('characters').select('id,name,base_avatar_url').order('name');
  }
  if (source === 'npc') {
    return supabase.from('npcs').select('id,name,avatar,level,rank,is_active,is_map_npc')
      .eq('is_active', true).order('level');
  }
  return supabase.rpc('listar_perfis_ninja', { p_limit: 100 });
}

const SOURCE_ICON = { catalog: 'swords', npc: 'shield', players: 'users' };

export default function Adversarios({ player }) {
  const navigate = useNavigate();
  const [active, setActive] = useState('catalog');
  const [rowsByTab, setRowsByTab] = useState({ catalog: null, npc: null, players: null });
  const [errorsByTab, setErrorsByTab] = useState({});
  const [loadingTab, setLoadingTab] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const cached = rowsByTab[active];

  useEffect(() => {
    if (!player?.id || cached !== null) return;
    let cancelled = false;
    setLoadingTab(active);
    (async () => {
      try {
        const { data, error } = await fetchOpponents(active);
        if (cancelled) return;
        if (error) {
          setErrorsByTab(old => ({ ...old, [active]: 'Não foi possível consultar a lista. Tente novamente.' }));
          setRowsByTab(old => ({ ...old, [active]: [] }));
          return;
        }
        setRowsByTab(old => ({ ...old, [active]: toOpponentRows(active, data, player.id) }));
      } catch {
        if (!cancelled) {
          setErrorsByTab(old => ({ ...old, [active]: 'O catálogo está temporariamente indisponível.' }));
          setRowsByTab(old => ({ ...old, [active]: [] }));
        }
      } finally {
        if (!cancelled) setLoadingTab(null);
      }
    })();
    return () => { cancelled = true; };
  }, [active, cached, player?.id]);

  const rows = cached || [];
  const filtered = useMemo(() => filterOpponentRows(rows, query), [rows, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const busy = cached === null || loadingTab === active;

  const selectTab = key => { setActive(key); setQuery(''); setPage(1); };
  const search = value => { setQuery(value); setPage(1); };
  const retry = () => {
    setErrorsByTab(old => ({ ...old, [active]: null }));
    setRowsByTab(old => ({ ...old, [active]: null }));
  };

  if (!player) return null;

  return (
    <div className="page kuro-opponents">
      <PageHeader eyebrow="Academia Ninja · Inteligência de combate"
        title="Arquivo de Adversários"
        subtitle="Explore personagens do universo ninja, NPCs cadastrados e projeções públicas de jogadores. A seleção não altera os combates ou recompensas."
        actions={<GameAction type="button" tone="quiet" onClick={() => navigate('/dojo')}>
          <SidebarIcon name="arrowLeft" size={16} /> Voltar ao Dojo
        </GameAction>} />

      <section className="kuro-opponents-intro" aria-label="Visão geral dos adversários">
        <div>
          <span className="kuro-opponents-kicker">KUROKAGE · ARQUIVO DE AMEAÇAS</span>
          <h2>Conheça o inimigo antes da batalha.</h2>
          <p>Retratos, graduação e origem em um só lugar. A arena só libera confrontos após a validação das regras no servidor.</p>
        </div>
        <div className="kuro-opponents-intro-mark" aria-hidden="true"><SidebarIcon name="swords" size={60} /></div>
      </section>

      <div className="kuro-opponents-tabs" role="tablist" aria-label="Origem dos adversários">
        {OPPONENT_TABS.map(tab => {
          const iconName = SOURCE_ICON[tab.key];
          return (
            <button type="button" role="tab" key={tab.key} id={`opponent-tab-${tab.key}`}
              aria-selected={active === tab.key} aria-controls="opponents-panel"
              className={`kuro-opponents-tab ${active === tab.key ? 'is-active' : ''}`}
              onClick={() => selectTab(tab.key)}>
              <SidebarIcon name={iconName} size={19} />
              <span><strong>{tab.label}</strong><small>{tab.description}</small></span>
              <span className="kuro-opponents-counter">{rowsByTab[tab.key]?.length ?? '—'}</span>
            </button>
          );
        })}
      </div>

      <section id="opponents-panel" role="tabpanel" aria-labelledby={`opponent-tab-${active}`}>
        <div className="kuro-opponents-toolbar">
          <label className="kuro-opponents-search">
            <SidebarIcon name="search" size={18} />
            <span className="sr-only">Pesquisar adversário</span>
            <input type="search" value={query} onChange={e => search(e.target.value)}
              placeholder="Buscar por nome, patente ou elemento" autoComplete="off" />
          </label>
          <span className="kuro-opponents-results" aria-live="polite">{busy ? 'Carregando…' : `${filtered.length} encontrado(s)`}</span>
        </div>

        {errorsByTab[active] && (
          <div className="kuro-opponents-notice" role="alert">
            <SidebarIcon name="info" size={18} />
            <p>{errorsByTab[active]}</p>
            <GameAction type="button" tone="quiet" onClick={retry}><SidebarIcon name="refresh" size={16} /> Tentar novamente</GameAction>
          </div>
        )}

        {!errorsByTab[active] && busy && (
          <div className="kuro-opponents-loading" role="status">Consultando o arquivo ninja…</div>
        )}

        {!errorsByTab[active] && !busy && filtered.length === 0 && (
          <div className="kuro-opponents-empty">Nenhum adversário encontrado. Experimente outro termo ou categoria.</div>
        )}

        {!errorsByTab[active] && !busy && filtered.length > 0 && (
          <>
            <div className="kuro-opponents-grid">
              {visible.map(entry => {
                const isNpc = active === 'npc';
                const actionAvailable = isNpc && entry.is_map_npc === true;
                const actionPlayer = active === 'players';
                return (
                  <article className="kuro-opponents-card" key={String(entry.id)}>
                    <div className="kuro-opponents-card-portrait"><NpcPortrait npc={entry} size={90} /></div>
                    <div className="kuro-opponents-card-main">
                      <span className="kuro-opponents-type">{active === 'catalog' ? 'Personagem do catálogo' : isNpc ? 'NPC do mundo' : 'Projeção de jogador'}</span>
                      <h3 title={entry.name}>{entry.name}</h3>
                      <div className="kuro-opponents-tags">
                        {Number.isFinite(Number(entry.level)) && entry.level != null && <span>NV. {entry.level}</span>}
                        {entry.rank && <span>{entry.rank}</span>}
                      </div>
                      <p className="kuro-opponents-status">{opponentStatus(active, entry)}</p>
                    </div>
                    <div className="kuro-opponents-card-action">
                      {actionAvailable ? (
                        <GameAction tone="quiet" className="kuro-opponents-link" type="button" onClick={() => navigate('/mapa')}>
                          <SidebarIcon name="compass" size={15} /> Procurar no mapa <SidebarIcon name="arrowRight" size={15} />
                        </GameAction>
                      ) : actionPlayer ? (
                        <GameAction tone="quiet" className="kuro-opponents-link" type="button" onClick={() => navigate('/mapa')}>
                          <SidebarIcon name="compass" size={15} /> Explorar projeções <SidebarIcon name="arrowRight" size={15} />
                        </GameAction>
                      ) : (
                        <span className="kuro-opponents-locked"><SidebarIcon name="lock" size={15} /> Combate individual indisponível</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {pageCount > 1 && (
              <nav className="kuro-opponents-pages" aria-label="Páginas de adversários">
                <GameAction type="button" tone="quiet" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</GameAction>
                <span>Página {currentPage} de {pageCount}</span>
                <GameAction type="button" tone="quiet" disabled={currentPage === pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Próxima</GameAction>
              </nav>
            )}
          </>
        )}
      </section>

      <aside className="kuro-opponents-footer">
        <SidebarIcon name="info" size={18} />
        <p>Adversários do catálogo ainda não geram combate. Projeções são representações públicas, não PvP ao vivo. Os confrontos oficiais permanecem no Mapa, no Dojo e nas Missões, com validação do servidor para recompensas.</p>
      </aside>
    </div>
  );
}
