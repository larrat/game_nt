import React, { useEffect, useState } from 'react';
import { hasLocalCharacterPortrait, resolveLocalCharacterPortrait } from '../utils/localCharacterPortrait';
import '../styles/character-portraits.css';

// Aceita apenas caminhos locais (/images/...) ou IDs de catálogo que resolvem
// para nossas imagens locais em public/images/. Nenhuma URL externa (https:) é carregada.
export function isSupportedPortraitSource(src) {
  return hasLocalCharacterPortrait(src);
}

export default function CharacterPortrait({
  src, alt = '', className = '', loading = 'lazy'
}) {
  const [failedIndex, setFailedIndex] = useState(0);
  useEffect(() => setFailedIndex(0), [src]);

  const localSource = resolveLocalCharacterPortrait(src);
  const candidates = hasLocalCharacterPortrait(localSource) ? [localSource] : [];
  const activeSource = candidates[failedIndex];

  if (isSupportedPortraitSource(activeSource)) {
    return (
      <img
        src={activeSource}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        onError={() => setFailedIndex(index => index + 1)}
      />
    );
  }

  return (
    <span className={'kuro-character-portrait__fallback ' + className}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >忍</span>
  );
}
