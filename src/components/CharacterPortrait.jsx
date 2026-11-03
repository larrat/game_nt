import React, { useEffect, useState } from 'react';
import { resolveLocalCharacterPortrait } from '../utils/localCharacterPortrait';
import '../styles/character-portraits.css';

// Accept local paths and HTTPS media URLs. All other schemes fall back safely.
export function isSupportedPortraitSource(src) {
  return typeof src === 'string' &&
    (/^\\/(?!\\/)/.test(src) || /^https:\\/\\/[^\\s/]+\\/[^\\s]*$/i.test(src));
}

export default function CharacterPortrait({
  src, alt = '', className = '', loading = 'lazy'
}) {
  const [failedIndex, setFailedIndex] = useState(0);
  useEffect(() => setFailedIndex(0), [src]);

  // Keep the source URL as fallback if an existing local copy cannot be loaded.
  // The remote URL remains the stable avatar ID in Supabase.
  const localSource = resolveLocalCharacterPortrait(src);
  const candidates = localSource !== src ? [localSource, src] : [src];
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
