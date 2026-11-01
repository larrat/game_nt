import React, { useEffect, useState } from 'react';
import { localArtworkPath } from '../utils/npcArtwork';

/** Um único fallback para os retratos do mapa, combate e World Boss. */
export default function CharacterArtwork({
  src, name, fallback = '🥷', className = '', loading = 'lazy'
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const path = localArtworkPath(src);
  const safeFallback = typeof fallback === 'string' && [...fallback].length <= 4 ? fallback : '🥷';

  if (path && !failed) {
    return <img src={path} alt={name || ''} className={className} loading={loading}
      onError={() => setFailed(true)} />;
  }
  return <span className={className} role="img" aria-label={name || 'Personagem sem retrato'}>
    {safeFallback}
  </span>;
}
