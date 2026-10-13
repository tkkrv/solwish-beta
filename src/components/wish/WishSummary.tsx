'use client';

import { CalendarHeart, Lock, PartyPopper, Sparkles } from 'lucide-react';
import Cover from '@/components/ui/Cover';
import Progress from '@/components/ui/Progress';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatMoney, isFiat } from '@/lib/money';
import { daysUntil, type Progress as WishProgress } from '@/lib/progress';
import { dateLocale } from '@/lib/client/format';
import type { Currency, WishItem } from '@/lib/types';

/** Шапка вишлиста: обложка, название, для кого, дата, история, прогресс, список желаний. */
export default function WishSummary({
  title,
  description,
  creatorName,
  iconUrl,
  currency,
  goal,
  progress,
  items = [],
  eventDate = null,
  closed = false,
  solPrice = null,
  loadingProgress = false,
}: {
  title: string;
  description: string;
  creatorName: string;
  iconUrl: string;
  currency: Currency;
  goal: number;
  progress: Pick<WishProgress, 'raised' | 'raisedSol' | 'count' | 'perItem'> | null;
  items?: WishItem[];
  eventDate?: string | null;
  closed?: boolean;
  /** Курс SOL в валюте вишлиста — для подсказки «≈ X SOL». */
  solPrice?: number | null;
  loadingProgress?: boolean;
}) {
  const { t, locale } = useLanguage();
  const loc = dateLocale(locale);
  const money = (v: number) => formatMoney(v, currency, loc);
  const raised = progress?.raised ?? 0;
  const reached = goal > 0 && raised >= goal;
  const halfway = !reached && goal > 0 && raised >= goal / 2;
  const days = daysUntil(eventDate);

  return (
    <div className="card overflow-hidden">
      <div className="relative">
        <Cover src={iconUrl} alt={title} className="aspect-[16/9] w-full" />
        {days !== null && days >= 0 && !closed && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-ink shadow-card backdrop-blur">
            <CalendarHeart className="h-4 w-4 text-brand" />
            {days === 0 ? t.wish.today : fmt(t.wish.daysLeft, { n: days })}
          </span>
        )}
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          {creatorName && (
            <p className="text-sm font-semibold text-ink-3">{fmt(t.wish.forWhom, { name: creatorName })}</p>
          )}
          <h1 className="mt-0.5 break-words text-2xl font-extrabold tracking-tight">{title}</h1>
          {eventDate && (
            <p className="mt-1 text-sm text-ink-3">
              {new Date(`${eventDate}T00:00:00`).toLocaleDateString(loc, { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          {description && (
            <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-ink-2">{description}</p>
          )}
        </div>

        {closed && (
          <div className="flex items-start gap-2 rounded-xl bg-canvas px-4 py-3 text-sm">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
            <div>
              <p className="font-semibold">{t.wish.closedTitle}</p>
              <p className="text-ink-2">{t.wish.closedDesc}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Progress value={goal > 0 ? raised / goal : 0} />
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span className={loadingProgress ? 'animate-pulse text-ink-3' : 'text-ink'}>
              {fmt(t.wish.raised, { raised: money(raised), goal: money(goal) })}
            </span>
            <span className="shrink-0 text-ink-3">{fmt(t.wish.giftsCount, { count: progress?.count ?? 0 })}</span>
          </div>
          {isFiat(currency) && solPrice ? (
            <p className="text-xs text-ink-3">
              {fmt(t.wish.approx, { value: `${(goal / solPrice).toFixed(2)} SOL` })} · {t.create.rateDemo}
            </p>
          ) : null}
          {reached && (
            <div className="flex animate-fade-up items-center gap-2 rounded-xl bg-mint-soft px-4 py-3 text-sm font-semibold text-mint">
              <PartyPopper className="h-5 w-5 shrink-0" />
              {t.wish.goalReached}
            </div>
          )}
          {halfway && (
            <div className="flex animate-fade-up items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand">
              <Sparkles className="h-5 w-5 shrink-0" />
              {t.wish.halfway}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line pt-4">
            <p className="mb-3 text-sm font-bold">{t.wish.itemsTitle}</p>
            <ul className="space-y-3">
              {items.map((it) => {
                const r = progress?.perItem[it.id] ?? 0;
                return (
                  <li key={it.id}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="break-words font-semibold">{it.title}</span>
                      <span className="shrink-0 text-ink-3">
                        {fmt(t.wish.itemRaised, { raised: money(r), goal: money(it.goal) })}
                      </span>
                    </div>
                    <Progress value={it.goal > 0 ? r / it.goal : 0} />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
