'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  if (compact) {
    return (
      <select
        aria-label="Language"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold text-ink"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    );
  }
  return (
    <div role="group" aria-label="Language" className="flex rounded-xl border border-line bg-surface p-0.5">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition ${
            locale === code ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}
