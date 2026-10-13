'use client';

import Cover from '@/components/ui/Cover';
import Progress from '@/components/ui/Progress';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatSol } from '@/lib/amounts';

/** Шапка вишлиста: обложка, название, для кого, история, прогресс. Используется и в превью, и на странице. */
export default function WishSummary({
  title,
  description,
  creatorName,
  iconUrl,
  goal,
  raised,
  count,
  loadingProgress = false,
}: {
  title: string;
  description: string;
  creatorName: string;
  iconUrl: string;
  goal: number;
  raised: number;
  count: number;
  loadingProgress?: boolean;
}) {
  const { t } = useLanguage();
  const reached = goal > 0 && raised >= goal;

  return (
    <div className="card overflow-hidden">
      <Cover src={iconUrl} alt={title} className="aspect-[16/9] w-full" />
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          {creatorName && (
            <p className="text-sm font-semibold text-ink-3">{fmt(t.wish.forWhom, { name: creatorName })}</p>
          )}
          <h1 className="mt-0.5 break-words text-2xl font-extrabold tracking-tight">{title}</h1>
          {description && (
            <p className="mt-2 whitespace-pre-line break-words leading-relaxed text-ink-2">{description}</p>
          )}
        </div>
        <div className="space-y-2">
          <Progress value={goal > 0 ? raised / goal : 0} />
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className={loadingProgress ? 'animate-pulse text-ink-3' : 'text-ink'}>
              {fmt(t.wish.raised, { raised: formatSol(raised), goal: formatSol(goal) })}
            </span>
            <span className="text-ink-3">{fmt(t.wish.giftsCount, { count })}</span>
          </div>
          {reached && <p className="text-sm font-semibold text-mint">{t.wish.goalReached}</p>}
        </div>
      </div>
    </div>
  );
}
