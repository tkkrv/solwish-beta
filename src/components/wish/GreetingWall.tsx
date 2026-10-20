'use client';

import Link from 'next/link';
import { BadgeCheck, MessageCircle, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatSol } from '@/lib/amounts';
import { dateLocale } from '@/lib/client/format';
import type { Gift, Wish } from '@/lib/types';
import { formatMoney, isFiat } from '@/lib/money';
import { giftValue } from '@/lib/progress';
import type { Locale } from '@/i18n';
import { STYLE_CLASSES, isPremiumStyle } from '@/lib/premium';

function formatDate(ts: number | null, locale: Locale) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleDateString(dateLocale(locale), {
    day: 'numeric',
    month: 'short',
  });
}

/** Стена открыток: данные берутся из блокчейна, а не из нашей базы. */
export default function GreetingWall({
  gifts,
  wish,
  price = null,
  demo = false,
}: {
  gifts: Gift[] | null;
  wish?: Wish;
  price?: number | null;
  /** На демо-странице открытки не настоящие — ссылки ведут к форме подарка. */
  demo?: boolean;
}) {
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
                href={demo ? '#gift' : `/card/${g.signature}`}
                className={`card flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-pop ${
                  isPremiumStyle(g.style) ? `${STYLE_CLASSES[g.style].inner} ${STYLE_CLASSES[g.style].ring}` : ''
                }`}
              >
                {isPremiumStyle(g.style) && (
                  <span className="mb-2 inline-flex items-center gap-1 self-start text-[11px] font-bold uppercase tracking-wider text-brand">
                    <Sparkles className="h-3.5 w-3.5" />
                    {t.wish.premiumBadge}
                  </span>
                )}
                <p className="flex-1 whitespace-pre-line break-words leading-snug text-ink">
                  {g.hidden ? <span className="text-sm text-ink-3">{t.wish.hiddenMsg}</span> : g.msg ? `“${g.msg}”` : '🎁'}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-ink-2">
                    {fmt(t.wish.from, {
                      name: g.anonymous ? t.wish.anonymousLabel : g.from || t.wish.anonymous,
                    })}
                  </span>
                  <span className="shrink-0 text-right font-mono font-semibold text-mint">
                    +{formatSol(g.amountSol)} SOL
                    {wish && isFiat(wish.goalCurrency) && (
                      <span className="block text-[11px] font-medium text-ink-3">
                        ≈ {formatMoney(giftValue(g, wish, price), wish.goalCurrency, dateLocale(locale))}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-3">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {(g.itemId && wish?.items.find((i) => i.id === g.itemId)?.title) || 'SPL Memo'}
                    </span>
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
