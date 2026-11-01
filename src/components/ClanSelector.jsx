import React, { useMemo, useState } from 'react';
import ClanArtwork from './ClanArtwork';
import SidebarIcon from './SidebarIcon';
import { normalizeClanName } from '../utils/clanArtwork';

/**
 * Catalog selection is based on the real DB records; duplicate names retain
 * their distinct IDs so we cannot silently change the clan the player joins.
 */
export default function ClanSelector({ clans, selectedIndex, onSelect }) {
  const [search, setSearch] = useState('');
  const selected = clans[selectedIndex];
  const duplicates = useMemo(() => {
    const counts = new Map();
    for (const clan of clans) {
      const key = normalizeClanName(clan.name);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [clans]);
  const filtered = clans.map((clan, index) => ({ clan, index }))
    .filter(({ clan }) => normalizeClanName(clan.name).includes(normalizeClanName(search)));

  if (!selected) return null;
  return (
    <section className="kuro-clan-selector" aria-label="Selecionar linhagem ninja">
      <div className="kuro-clan-selector__featured">
        <div className="kuro-clan-selector__portrait">
          <ClanArtwork clan={selected} className="kuro-clan-selector__featured-image" iconSize={64} />
        </div>
        <div className="kuro-clan-selector__featured-info">
          <span className="kuro-clan-selector__eyebrow">CLÃ SELECIONADO · {selectedIndex + 1} DE {clans.length}</span>
          <h2 aria-live="polite">{selected.name}</h2>
          <p>{selected.description || 'Descrição não cadastrada para este clã.'}</p>
          {duplicates.get(normalizeClanName(selected.name)) > 1 && (
            <p className="kuro-clan-selector__notice">
              Há mais de um cadastro para este nome no jogo. Você está selecionando o registro #{selected.id}.
            </p>
          )}
          <div className="kuro-clan-selector__controls">
            <button type="button" onClick={() => onSelect(Math.max(0, selectedIndex - 1))}
              disabled={selectedIndex === 0} aria-label="Ver clã anterior">
              <SidebarIcon name="arrowLeft" size={18} /> Anterior
            </button>
            <button type="button" onClick={() => onSelect(Math.min(clans.length - 1, selectedIndex + 1))}
              disabled={selectedIndex === clans.length - 1} aria-label="Ver próximo clã">
              Próximo <SidebarIcon name="arrowRight" size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className="kuro-clan-selector__browse">
        <div className="kuro-clan-selector__heading">
          <div><h3>Escolha seu clã</h3><p>Selecione uma imagem para ver a linhagem antes de entrar.</p></div>
          <label>
            <span className="sr-only">Buscar clã por nome</span>
            <input type="search" value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Buscar clã..." aria-label="Buscar clã por nome" />
          </label>
        </div>
        <div className="kuro-clan-selector__grid" aria-label="Clãs disponíveis">
          {filtered.map(({ clan, index }) => {
            const selectedClan = index === selectedIndex;
            const duplicate = duplicates.get(normalizeClanName(clan.name)) > 1;
            return (
              <button key={clan.id} type="button"
                onClick={() => onSelect(index)}
                aria-pressed={selectedClan}
                aria-label={'Selecionar ' + clan.name + (duplicate ? ', registro ' + clan.id : '')}
                className={'kuro-clan-selector__choice' + (selectedClan ? ' is-selected' : '')}>
                <ClanArtwork clan={clan} className="kuro-clan-selector__choice-image" iconSize={30} />
                <span className="kuro-clan-selector__choice-name">{clan.name}</span>
                {duplicate && <small>Registro #{clan.id}</small>}
                {selectedClan && <span className="kuro-clan-selector__selected-tag">Selecionado</span>}
              </button>
            );
          })}
        </div>
        {filtered.length === 0 && <p className="kuro-clan-selector__empty" role="status">Nenhum clã corresponde à busca.</p>}
      </div>
    </section>
  );
}
