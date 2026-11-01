import React, { useState } from 'react';
import SidebarIcon from './SidebarIcon';
import { getClanArtworkUrl } from '../utils/clanArtwork';

/** Single clan visual source for selection, clan profile, and progression cards. */
export default function ClanArtwork({ clan, className = '', iconSize = 34 }) {
  const src = getClanArtworkUrl(clan);
  const [failedSrc, setFailedSrc] = useState(null);
  const clanName = clan?.name || 'Clã desconhecido';

  if (!src || failedSrc === src) {
    return (
      <span className={'kuro-clan-art-fallback ' + className} role="img" aria-label={'Imagem indisponível: ' + clanName}>
        <SidebarIcon name="users" size={iconSize} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={'Emblema do ' + clanName}
      className={className}
      loading="lazy"
      onError={() => setFailedSrc(src)}
    />
  );
}
