import { en, type Dictionary } from './en';
import { ru } from './ru';
import { kk } from './kk';

export const LOCALES = ['ru', 'kk', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'solwish_lang';

export const LOCALE_LABELS: Record<Locale, string> = { ru: 'RU', kk: 'KZ', en: 'EN' };

export const dictionaries: Record<Locale, Dictionary> = { en, ru, kk };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Язык из cookie, иначе из Accept-Language. 'kz' из первой версии тоже понимаем. */
export function resolveLocale(cookieValue?: string | null, acceptLanguage?: string | null): Locale {
  if (cookieValue === 'kz') return 'kk';
  if (isLocale(cookieValue)) return cookieValue;
  const header = (acceptLanguage || '').toLowerCase();
  for (const part of header.split(',')) {
    const code = part.trim().slice(0, 2);
    if (code === 'kk' || code === 'kz') return 'kk';
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
  }
  return DEFAULT_LOCALE;
}

/** Подстановка {name} в строку. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

export type { Dictionary };
