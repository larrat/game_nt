/**
 * Clan assets: locally served reference images, indexed by clan name (never ID).
 * Names use a canonical key; original URLs from the database are not hotlinked.
 * Image files are in public/images/clans/ and may be replaced by approved HD art.
 */
export const CLAN_IMAGE_FILES = Object.freeze({
  "uchiha": "uchiha.png",
  "hyuuga": "hyuuga.png",
  "kaguya": "kaguya.png",
  "senju": "senju.png",
  "aburame": "aburame.png",
  "yamanaka": "yamanaka.png",
  "akimichi": "akimichi.png",
  "inuzuka": "inuzuka.png",
  "ootsutsuki": "ootsutsuki.png",
  "nara": "nara.png",
  "sabaku": "sabaku.png",
  "chikamatsu": "chikamatsu.png",
  "kibaku nendo": "kibaku-nendo.png",
  "kami": "kami.png",
  "sumi": "sumi.png",
  "uzumaki": "uzumaki.png",
  "kurama": "kurama.png",
  "tsuyoi": "tsuyoi.png",
  "yuuhi": "yuuhi.png",
  "fuuma": "fuuma.png",
  "kamizuru": "kamizuru.png",
  "namikaze": "namikaze.png",
  "sarutobi": "sarutobi.png",
  "sougu": "sougu.png",
  "hoozuki": "hoozuki.png",
  "hatake": "hatake.png",
  "yakushi": "yakushi.png",
  "ryotenbin": "ryotenbin.png",
  "tenseigan": "tenseigan.png",
  "ashura": "ashura.png",
  "shiro hebi": "shiro-hebi.png",
  "indra": "indra.png",
  "haruno": "haruno.png",
  "jashin": "jashin.png",
  "shizen": "shizen.png",
  "shimura": "shimura.png",
  "chinoike": "chinoike.png",
  "hoshigaki": "hoshigaki.png",
  "yuki": "yuki.png",
  "nkiva": "nkiva.png"
});

export function normalizeClanName(name) {
  return String(name ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/^cl[aa]\s+/, '').replace(/\s+/g, ' ').trim();
}

export function getClanArtworkUrl(clan) {
  const normalized = normalizeClanName(typeof clan === 'string' ? clan : clan?.name);
  const aliases = { hyuga: 'hyuuga', hozuki: 'hoozuki', otsutsuki: 'ootsutsuki' };
  const file = CLAN_IMAGE_FILES[aliases[normalized] || normalized];
  if (file) return '/images/clans/' + file;
  const current = typeof clan === 'object' ? clan?.image_url || clan?.image : null;
  return typeof current === 'string' && /^\/images\/[a-z0-9/_-]+\.(png|webp|jpe?g|svg)$/i.test(current) && !current.includes('..')
    ? current : null;
}

export function getAttributeArtworkUrl(field) {
  const approvedFields = ['agilidade', 'selo', 'forca', 'inteligencia', 'resistencia', 'ninjutsu', 'genjutsu', 'taijutsu', 'energia', 'bukijutsu'];
  return approvedFields.includes(field) ? '/images/icons/' + field + '.jpg' : null;
}
