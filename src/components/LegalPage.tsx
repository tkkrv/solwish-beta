'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { LEGAL, LEGAL_UPDATED } from '@/content/legal';
import { TELEGRAM_BOT_URL } from '@/lib/config';
import { dateLocale } from '@/lib/client/format';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';

export default function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t, locale } = useLanguage();
  const doc = LEGAL[locale][kind];
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString(dateLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.legal[kind]}</h1>
      <p className="mt-2 text-sm text-ink-3">{fmt(t.legal.updated, { date: updated })}</p>
      <div className="card mt-8 space-y-6 p-6 sm:p-8">
        {doc.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-bold">{s.h}</h2>
            <p className="mt-1.5 leading-relaxed text-ink-2">{s.p}</p>
          </section>
        ))}
        <section>
          <h2 className="text-lg font-bold">{t.legal.contact}</h2>
          <p className="mt-1.5 text-ink-2">
            {CONTACT_EMAIL ? (
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:text-brand-strong">
                {CONTACT_EMAIL}
              </a>
            ) : null}
            {CONTACT_EMAIL ? ' · ' : ''}
            <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:text-brand-strong">
              Telegram
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
