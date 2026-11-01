import React, { useEffect, useState } from 'react';
import SidebarIcon from './SidebarIcon';
import { resolveDocumentedItemVisual } from '../data/documentedItemVisuals';

/**
 * Art of an existing inventory item. Icons are the default; only explicitly
 * approved local artwork can replace them. Never hotlink documentary assets.
 */
export default function ItemArtwork({ name, size = 46, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const visual = resolveDocumentedItemVisual(name);
  useEffect(() => { setImageFailed(false); }, [name]);

  const image = typeof visual.approvedImage === 'string'
    && /^\/images\/item-art\/[a-z0-9/_-]+\.(png|webp|svg)$/i.test(visual.approvedImage)
      ? visual.approvedImage : null;

  return (
    <span
      className={['kuro-item-artwork', className].filter(Boolean).join(' ')}
      style={{ '--kuro-item-art-size': `${Math.min(96, Math.max(30, Number(size) || 46))}px` }}
      role="img"
      aria-label={`Representação de ${name || 'item ninja'}`}
    >
      {image && !imageFailed ? (
        <img src={image} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
      ) : (
        <SidebarIcon name={visual.icon} size={Math.round(Math.min(96, Math.max(30, Number(size) || 46)) * .57)} />
      )}
    </span>
  );
}
