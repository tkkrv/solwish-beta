/** Готовые обложки (800×800 JPEG) в /public/covers, генерируются скриптом scripts/generate-covers.mjs. */
export const COVER_PRESETS = [
  { key: 'gift', path: '/covers/gift.jpg' },
  { key: 'birthday', path: '/covers/birthday.jpg' },
  { key: 'flowers', path: '/covers/flowers.jpg' },
  { key: 'tech', path: '/covers/tech.jpg' },
  { key: 'travel', path: '/covers/travel.jpg' },
  { key: 'books', path: '/covers/books.jpg' },
  { key: 'music', path: '/covers/music.jpg' },
  { key: 'charity', path: '/covers/charity.jpg' },
] as const;

export type CoverKey = (typeof COVER_PRESETS)[number]['key'];

export const DEFAULT_COVER = COVER_PRESETS[0].path;
