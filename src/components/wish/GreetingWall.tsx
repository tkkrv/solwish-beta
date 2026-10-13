'use client';

import Link from 'next/link';
import { BadgeCheck, MessageCircle } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatSol } from '@/lib/amounts';
import { dateLocale } from '@/lib/client/format';
import type { Gift } from '@/lib/types';
import type { Locale } from '@/i18n';

function formatDate(ts: number | null, locale: Locale) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
  });
}

/** Стена открыток: данные берутся из блокчейна, а не из нашей базы. */
export default function GreetingWall({ gifts }: { gifts: Gift[] | null }) {
  const { t, locale } = useLanguage();

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold tracking-tight">
        <MessageCircle className="h-5 w-5 text-brand" />
        {t.wish.wallTitle}
        {gifts && gifts.length > 0 && <span className="chip">{gifts.length}</span>}
      </h2>

      {gifts === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-surface/60" />
          ))}
        </div>
      ) : gifts.length === 0 ? (
        <div className="card border-dashed p-8 text-center text-ink-2">{t.wish.wallEmpty}</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {gifts.map((g) => (
            <li key={g.signature}>
              <Link
                href={`/card/${g.signature}`}
                className="card flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-pop"
              >
                <p className="flex-1 whitespace-pre-line break-words leading-snug text-ink">
                  {g.msg ? `“${g.msg}”` : '🎁'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-ink-2">
                    {fmt(t.wish.from, { name: g.from || t.wish.anonymous })}
                  </span>
                  <span className="shrink-0 font-mono font-semibold text-mint">+{formatSol(g.amountSol)} SOL</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-3">
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" /> SPL Memo
                  </span>
                  <span>{formatDate(g.blockTime, locale)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
