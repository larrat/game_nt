import React, { useEffect, useState } from 'react';
import '../styles/character-portraits.css';

// Accept project-local media and HTTPS assets authorized by the project owner.
// Never turn arbitrary catalog text into an executable URL.
export function isSupportedPortraitSource(src) {
  return typeof src === 'string' &&
    (/^\/(?!\/)/.test(src) || /^https:\/\/[^\s/]+\/[^\s]*$/i.test(src));
}

export default function CharacterPortrait({
  src, alt = '', className = '', loading = 'lazy'
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!failed && isSupportedPortraitSource(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding="async"
        onError={() => setFailed(true)}
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
