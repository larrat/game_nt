import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Compass, Info, LockKeyhole, RefreshCw, Search, ShieldCheck, Swords, Users } from 'lucide-react';
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

const SOURCE_ICON = { catalog: Swords, npc: ShieldCheck, players: Users };

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
        actions={<button type="button" className="btn-ghost" onClick={() => navigate('/dojo')}>
          <ArrowLeft size={16} aria-hidden="true" /> Voltar ao Dojo
        </button>} />

      <section className="kuro-opponents-intro" aria-label="Visão geral dos adversários">
        <div>
          <span className="kuro-opponents-kicker">KUROKAGE · ARQUIVO DE AMEAÇAS</span>
          <h2>Conheça o inimigo antes da batalha.</h2>
          <p>Retratos, graduação e origem em um só lugar. A arena só libera confrontos após a validação das regras no servidor.</p>
        </div>
        <div className="kuro-opponents-intro-mark" aria-hidden="true"><Swords size={60} strokeWidth={1.3} /></div>
      </section>

      <div className="kuro-opponents-tabs" role="tablist" aria-label="Origem dos adversários">
        {OPPONENT_TABS.map(tab => {
          const Icon = SOURCE_ICON[tab.key];
          return (
            <button type="button" role="tab" key={tab.key} id={`opponent-tab-${tab.key}`}
              aria-selected={active === tab.key} aria-controls="opponents-panel"
              className={`kuro-opponents-tab ${active === tab.key ? 'is-active' : ''}`}
              onClick={() => selectTab(tab.key)}>
              <Icon size={19} aria-hidden="true" />
              <span><strong>{tab.label}</strong><small>{tab.description}</small></span>
              <span className="kuro-opponents-counter">{rowsByTab[tab.key]?.length ?? '—'}</span>
            </button>
          );
        })}
      </div>

      <section id="opponents-panel" role="tabpanel" aria-labelledby={`opponent-tab-${active}`}>
        <div className="kuro-opponents-toolbar">
          <label className="kuro-opponents-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Pesquisar adversário</span>
            <input type="search" value={query} onChange={e => search(e.target.value)}
              placeholder="Buscar por nome, patente ou elemento" autoComplete="off" />
          </label>
          <span className="kuro-opponents-results" aria-live="polite">{busy ? 'Carregando…' : `${filtered.length} encontrado(s)`}</span>
        </div>

        {errorsByTab[active] && (
          <div className="kuro-opponents-notice" role="alert">
            <Info size={18} aria-hidden="true" />
            <p>{errorsByTab[active]}</p>
            <button type="button" className="btn-ghost" onClick={retry}><RefreshCw size={16} aria-hidden="true" /> Tentar novamente</button>
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
                        <button className="kuro-opponents-link" type="button" onClick={() => navigate('/mapa')}>
                          <Compass size={15} aria-hidden="true" /> Procurar no mapa <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      ) : actionPlayer ? (
                        <button className="kuro-opponents-link" type="button" onClick={() => navigate('/mapa')}>
                          <Compass size={15} aria-hidden="true" /> Explorar projeções <ArrowRight size={15} aria-hidden="true" />
                        </button>
                      ) : (
                        <span className="kuro-opponents-locked"><LockKeyhole size={15} aria-hidden="true" /> Combate individual indisponível</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {pageCount > 1 && (
              <nav className="kuro-opponents-pages" aria-label="Páginas de adversários">
                <button type="button" className="btn-ghost" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</button>
                <span>Página {currentPage} de {pageCount}</span>
                <button type="button" className="btn-ghost" disabled={currentPage === pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Próxima</button>
              </nav>
            )}
          </>
        )}
      </section>

      <aside className="kuro-opponents-footer">
        <Info size={18} aria-hidden="true" />
        <p>Adversários do catálogo ainda não geram combate. Projeções são representações públicas, não PvP ao vivo. Os confrontos oficiais permanecem no Mapa, no Dojo e nas Missões, com validação do servidor para recompensas.</p>
      </aside>
    </div>
  );
}
