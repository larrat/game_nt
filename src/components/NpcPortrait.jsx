import React, { useEffect, useState } from 'react';
import { getNpcPortrait, getNpcFallback } from '../utils/npcPortrait';

/** Retrato reutilizável: mesmo NPC, mesma identidade no mapa, no radar e no combate. */
export default function NpcPortrait({ npc, size = 32, decorative = false }) {
  const src = getNpcPortrait(npc);
  const [failedSrc, setFailedSrc] = useState(null);
  useEffect(() => { setFailedSrc(null); }, [src]);

  const label = npc?.name || npc?.npc_name || 'NPC';
  const frameStyle = {
    width: size,
    height: size,
    display: 'inline-grid',
    placeItems: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid rgba(212, 162, 42, 0.45)',
    background: 'rgba(9, 16, 28, 0.86)'
  };
  return (
    <span style={frameStyle} aria-hidden={decorative || undefined}>
      {src && failedSrc !== src ? (
        <img
          src={src}
          alt={decorative ? '' : `Retrato de ${label}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : `Retrato indisponível de ${label}`}
          style={{ fontSize: Math.round(size * 0.55), lineHeight: 1 }}>
          {getNpcFallback(npc) || <span aria-hidden="true" style={{ display: 'block', width: '45%', height: '58%', borderRadius: '45% 45% 20% 20%', background: 'rgba(212, 162, 42, 0.25)' }} />}
        </span>
      )}
    </span>
  );
}
