import type { Locale } from '@/i18n';

/** Локаль для дат. Если браузер не умеет kk-KZ, показываем даты по-русски, а не по-английски. */
export function dateLocale(locale: Locale): string {
  if (locale === 'kk') {
    try {
      return Intl.DateTimeFormat.supportedLocalesOf(['kk-KZ']).length ? 'kk-KZ' : 'ru-RU';
    } catch {
      return 'ru-RU';
    }
  }
  return locale === 'ru' ? 'ru-RU' : 'en-US';
}
