import React, { useState } from 'react';
import SidebarIcon from './SidebarIcon';
import { getJutsuArtworkUrl } from '../utils/jutsuArtwork';

export default function JutsuArtwork({ jutsu }) {
  const src = getJutsuArtworkUrl(jutsu);
  const [failedSrc, setFailedSrc] = useState(null);
  const name = jutsu?.name || 'Técnica sem nome';

  if (!src || failedSrc === src) {
    return (
      <span className="kuro-academy-v3__jutsu-fallback" role="img" aria-label={'Arte indisponível: ' + name}>
        <SidebarIcon name="scroll" size={30} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={'Arte da técnica ' + name}
      className="w-full h-full object-contain"
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
