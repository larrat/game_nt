import React from 'react';

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const JutsuIcon = ({ jutsu, size = 64 }) => {
  const name = (jutsu.name || '').toLowerCase();
  const cat = (jutsu.category || '').toLowerCase();
  const elem = (jutsu.element || cat).toLowerCase();

  const nameSlug = slugify(jutsu.name || '');

  // Fallback category images
  let fallbackSrc = '/images/jutsus/jutsu_ninjutsu.jpg'; // default

  if (name.includes('substituição') || name.includes('kawarimi')) {
    fallbackSrc = '/images/jutsus/jutsu_kawarimi.jpg';
  } else if (name.includes('clonagem') || name.includes('bunshin')) {
    fallbackSrc = '/images/jutsus/jutsu_bunshin.jpg';
  } else if (name.includes('espada') || elem === 'kenjutsu' || cat === 'bukijutsu') {
    fallbackSrc = '/images/jutsus/jutsu_bukijutsu.jpg';
  } else if (cat === 'genjutsu') {
    fallbackSrc = '/images/jutsus/jutsu_genjutsu.jpg';
  } else if (cat === 'taijutsu' || elem === 'goken' || elem === 'juken') {
    fallbackSrc = '/images/jutsus/jutsu_taijutsu.jpg';
  }

  // Tries to load specific jutsu image, falls back to category
  const primarySrc = `/images/jutsus/jutsu_${nameSlug}.jpg`;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <img 
        src={primarySrc} 
        alt={jutsu.name} 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          if (e.target.src.includes(primarySrc)) {
            e.target.src = fallbackSrc;
          } else if (e.target.src.includes(fallbackSrc) && fallbackSrc !== '/images/jutsus/jutsu_ninjutsu.jpg') {
             e.target.src = '/images/jutsus/jutsu_ninjutsu.jpg';
          }
        }}
      />
    </div>
  );
};

export default JutsuIcon;

