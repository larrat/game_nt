import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import '../styles/main.css';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import GameAction from '../components/ui/GameAction';
import SidebarIcon from '../components/SidebarIcon';
import '../styles/academy-progression-v4.css';
import JutsuCard from '../components/JutsuCard';
import '../styles/academy-v3.css';
import {
  filterJutsuCatalog, getJutsuEligibility, jutsuCatalogTabs,
  selectBulkJutsus, toJutsuId
} from '../utils/jutsuEligibility';

export default function Tecnicas({ player, updatePlayer }) {
  const [allJutsus, setAllJutsus] = useState([]);
  const [tab, setTab] = useState('tecnicas');
  const [filterCat, setFilterCat] = useState('Todos');
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    let active = true;
    async function fetchJutsus() {
      setCatalogLoading(true);
      setCatalogError('');
      const { data, error } = await supabase.from('jutsus')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });
      if (!active) return;
      if (error) {
        setCatalogError('Não foi possível carregar os jutsus. Tente novamente.');
        setAllJutsus([]);
      } else {
        setAllJutsus((data || []).map(j => ({
          ...j,
          lvl: j.req_level,
          reqRank: j.req_rank,
          desc: j.description,
          cost: j.cost_ryous,
          chakraCost: j.chakra_cost,
          reqAttrValue: j.req_attr_value
        })));
      }
      setCatalogLoading(false);
    }
    fetchJutsus().catch(() => {
      if (active) {
        setCatalogError('Falha ao carregar o catálogo. Verifique a conexão.');
        setCatalogLoading(false);
      }
    });
    return () => { active = false; };
  }, [catalogVersion]);

  const learnedIds = useMemo(() => new Set(
    (Array.isArray(player?.jutsus_learned) ? player.jutsus_learned : []).map(toJutsuId)
  ), [player?.jutsus_learned]);

  const categories = useMemo(() => jutsuCatalogTabs(allJutsus), [allJutsus]);
  const displayedJutsus = useMemo(() => filterJutsuCatalog(allJutsus, filterCat)
    .filter(j => j.name?.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))),
  [allJutsus, filterCat, search]);
  const bulk = useMemo(() => selectBulkJutsus(allJutsus, player, learnedIds), [allJutsus, player, learnedIds]);

  const updatePlayerSafely = async () => {
    try {
      await updatePlayer(player.id);
    } catch {
      addToast('Operação concluída, mas o personagem não foi recarregado. Atualize a página.', 'info');
    }
  };

  const handleLearn = async (jutsu) => {
    if (loading || !player) return;
    const eligibility = getJutsuEligibility(jutsu, player, learnedIds.has(toJutsuId(jutsu.id)));
    if (!eligibility.eligible) {
      addToast('Requisitos pendentes: ' + eligibility.reasons.join(', '), 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('aprender_jutsu', {
        p_player_id: player.id,
        p_jutsu_id: jutsu.id,
        p_cost: jutsu.cost
      });
      if (error || data?.success !== true) {
        throw new Error(error?.message || data?.error || 'Aprendizado recusado.');
      }
      const actualCost = Number(data.cost);
      addToast(`${jutsu.name} aprendido! ${Number.isFinite(actualCost) ? `Custo confirmado: RY$ ${actualCost.toLocaleString('pt-BR')}` : 'Saldo atualizado pelo servidor.'}`, 'success');
      await updatePlayerSafely();
    } catch (error) {
      addToast('Não foi possível aprender: ' + (error?.message || 'falha inesperada'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPreview = () => {
    if (!player?.is_vip) {
      addToast('Aprendizado em massa é exclusivo de jogadores VIP.', 'error');
      return;
    }
    if (bulk.selected.length === 0) {
      addToast('Não há jutsus elegíveis para aprender no momento.', 'info');
      return;
    }
    if (Number(player.ryous || 0) < bulk.totalCost) {
      addToast(`Saldo insuficiente para o lote: RY$ ${bulk.totalCost.toLocaleString('pt-BR')} necessários.`, 'error');
      return;
    }
    setConfirmBulk(true);
  };

  const handleBulkLearn = async () => {
    if (loading || !confirmBulk || !player?.is_vip) return;
    if (bulk.selected.length === 0 || Number(player.ryous || 0) < bulk.totalCost) {
      setConfirmBulk(false);
      addToast('Requisitos ou saldo alterados. Confira a lista antes de tentar novamente.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('aprender_jutsus_massa', {
        p_player_id: player.id,
        p_jutsus: bulk.selected.map(j => ({ id: j.id, level: 1, slots: [null, null, null] })),
        p_total_cost: bulk.totalCost
      });
      if (error || data?.success !== true) {
        throw new Error(error?.message || data?.error || 'Aprendizado em massa recusado.');
      }
      setConfirmBulk(false);
      addToast(`Academia VIP: ${data.learned_count} jutsu(s) aprendidos. Total confirmado: RY$ ${Number(data.total_cost).toLocaleString('pt-BR')}.`, 'success');
      await updatePlayerSafely();
    } catch (error) {
      addToast('Não foi possível aprender em massa: ' + (error?.message || 'falha inesperada'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!player) return null;

  return (
    <div className="page kuro-jutsu-academy-page kuro-techniques-v4">
      <PageHeader
        eyebrow={`${player.name} · Graduação: ${player.rank}`}
        title="Academia de Jutsus"
        subtitle="Explore as técnicas, veja os requisitos reais e aprenda com segurança."
        actions={
          <div className="card text-center">
            <div className="muted mono uppercase text-[10px] tracking-[2px] mb-1">RYOUS</div>
            <div className="gold mono text-2xl">RY$ {Number(player.ryous || 0).toLocaleString('pt-BR')}</div>
            <div className="muted text-xs mt-2">Classe: {player.class || 'Não definida'}</div>
          </div>
        }
      />

      <section className="kuro-progression-v4__metrics" aria-label="Resumo de técnicas">
        <div className="kuro-progression-v4__metric">
          <span className="kuro-ui-label"><SidebarIcon name="scroll" size={15} /> TÉCNICAS NO CATÁLOGO</span>
          <strong>{allJutsus.length}</strong><small>Todos os estilos e naturezas</small>
        </div>
        <div className="card p-4">
          <span className="kuro-ui-label"><SidebarIcon name="book" size={15} /> JUTSUS APRENDIDOS</span>
          <strong>{learnedIds.size}</strong><small>Aprendidos no personagem</small>
        </div>
        <div className="card p-4">
          <span className="kuro-ui-label"><SidebarIcon name="sparkles" size={15} /> DISPONÍVEIS PARA APRENDER</span>
          <strong>{allJutsus.filter(j =>
            getJutsuEligibility(j, player, learnedIds.has(toJutsuId(j.id))).eligible).length}</strong><small>Requisitos atendidos neste momento</small>
        </div>
      </section>

      <div className="tabs mb-6" role="tablist" aria-label="Abas da academia">
        <button type="button" role="tab" aria-selected={tab === 'tecnicas'}
          className={`tab ${tab === 'tecnicas' ? 'active' : ''}`}
          onClick={() => setTab('tecnicas')}>Técnicas</button>
        <button type="button" role="tab" aria-selected={tab === 'aprendidas'}
          className={`tab ${tab === 'aprendidas' ? 'active' : ''}`}
          onClick={() => setTab('aprendidas')}>Aprendidas ({learnedIds.size})</button>
      </div>

      {catalogLoading ? (
        <div className="card p-8 muted" role="status">Carregando academia...</div>
      ) : catalogError ? (
        <div className="card p-8" role="alert">
          <p className="text-danger mb-4">{catalogError}</p>
          <GameAction tone="quiet" onClick={() => setCatalogVersion(v => v + 1)}><SidebarIcon name="refresh" size={16} /> Tentar novamente</GameAction>
        </div>
      ) : tab === 'tecnicas' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex flex-wrap gap-2" aria-label="Categorias de jutsu">
              {categories.map(cat => (
                <button key={cat} type="button" aria-pressed={cat === filterCat}
                  onClick={() => setFilterCat(cat)}
                  className="kuro-techniques-v4__category">
                  {cat}
                </button>
              ))}
            </div>
            <GameAction tone="gold" onClick={handleBulkPreview} disabled={loading} title="Aprender técnicas elegíveis em lote (VIP)">
              <SidebarIcon name="book" size={16} /> Aprender em massa (VIP)
            </GameAction>
          </div>
          <div className="mb-5">
            <label htmlFor="jutsu-search" className="text-sm muted block mb-2">Buscar técnicas</label>
            <input id="jutsu-search" type="search" className="w-full max-w-md bg-ink-raised border border-line-bright rounded-sm p-3 paper"
              value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Nome do jutsu..." />
          </div>
          <p className="muted text-xs mb-4">{displayedJutsus.length} técnica(s) nesta seleção. Jutsus bloqueados continuam visíveis para consulta.</p>
          {displayedJutsus.length === 0 ? (
            <div className="card p-8 muted text-center">Nenhum jutsu encontrado. Altere os filtros ou a busca.</div>
          ) : (
            <div className="kuro-academy-v3__catalog-grid grid-auto gap-4">
              {displayedJutsus.map(jutsu => (
                <JutsuCard key={jutsu.id} jutsu={jutsu} player={player}
                  isLearned={learnedIds.has(toJutsuId(jutsu.id))}
                  onLearn={() => handleLearn(jutsu)} loading={loading} showRequisites />
              ))}
            </div>
          )}
        </>
      ) : (
        learnedIds.size === 0 ? (
          <div className="card p-8 muted text-center">Nenhum jutsu aprendido. Explore a aba Técnicas.</div>
        ) : (
          <div className="kuro-academy-v3__catalog-grid grid-auto gap-4">
            {allJutsus.filter(j => learnedIds.has(toJutsuId(j.id))).map(jutsu => (
              <JutsuCard key={jutsu.id} jutsu={jutsu} player={player} isLearned
                showRequisites={false} />
            ))}
          </div>
        )
      )}

      {confirmBulk && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => !loading && setConfirmBulk(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="bulk-title"
            className="kuro-techniques-v4__modal card w-full max-w-md p-6" onClick={event => event.stopPropagation()}>
            <h3 id="bulk-title" className="gold text-xl mb-3">Confirmar aprendizado VIP</h3>
            <p className="paper mb-3">Aprender {bulk.selected.length} jutsu(s) elegíveis por até RY$ {bulk.totalCost.toLocaleString('pt-BR')}.</p>
            <p className="muted text-sm mb-5">O servidor verifica cada requisito novamente e determina o custo real. A operação é atômica.</p>
            {bulk.remaining > 0 && <p className="text-gold text-xs mb-4">Mais {bulk.remaining} técnica(s) ficarão para o próximo lote (limite de 50).</p>}
            <div className="flex gap-3 justify-end">
              <GameAction tone="quiet" disabled={loading} onClick={() => setConfirmBulk(false)}>Cancelar</GameAction>
              <GameAction tone="seal" loading={loading} onClick={handleBulkLearn}><span>{loading ? 'Aprendendo...' : 'Confirmar aprendizado'}</span></GameAction>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
