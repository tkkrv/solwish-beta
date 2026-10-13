'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Settings2, Zap } from 'lucide-react';
import { useLocationHref } from '@/lib/client/hooks';
import { usePrices } from '@/lib/client/use-prices';
import WishSummary from '@/components/wish/WishSummary';
import GiftPanel from '@/components/wish/GiftPanel';
import GreetingWall from '@/components/wish/GreetingWall';
import { useLanguage } from '@/i18n/LanguageProvider';
import { computeProgress } from '@/lib/progress';
import { isFiat, wishGoal } from '@/lib/money';
import type { GiftsSummary, Wish } from '@/lib/types';

export default function WishView({ wish }: { wish: Wish }) {
  const { t } = useLanguage();
  const { publicKey } = useWallet();
  const [summary, setSummary] = useState<GiftsSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const href = useLocationHref();
  const siteOrigin = href ? new URL(href).origin : '';
  const prices = usePrices(isFiat(wish.goalCurrency));
  const price = isFiat(wish.goalCurrency) ? (prices?.[wish.goalCurrency] ?? null) : null;

  // Подарки читаются из блокчейна через наш API; обновляем раз в 30 секунд.
  useEffect(() => {
    let alive = true;
    fetch(`/api/wishes/${wish.id}/gifts`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<GiftsSummary>;
      })
      .then((data) => {
        if (!alive) return;
        setSummary(data);
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    const timer = setTimeout(() => setTick((n) => n + 1), 30_000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [wish.id, tick]);

  // После отправки RPC может отдать подпись не сразу — обновляем несколько раз.
  const refreshSoon = useCallback(() => {
    [1500, 5000, 12000].forEach((ms) => setTimeout(() => setTick((n) => n + 1), ms));
  }, []);

  const progress = useMemo(
    () => (summary ? computeProgress(wish, summary.gifts, price) : null),
    [summary, wish, price]
  );
  const goal = wishGoal(wish);
  const me = publicKey?.toBase58();
  const isOwner = !!me && (me === wish.recipientWallet || me === wish.creatorWallet);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_420px] lg:py-12">
      <div className="space-y-8">
        <WishSummary
          title={wish.title}
          description={wish.description}
          creatorName={wish.creatorName}
          iconUrl={wish.iconUrl}
          currency={wish.goalCurrency}
          goal={goal}
          progress={progress}
          items={wish.items}
          eventDate={wish.eventDate}
          closed={wish.closed}
          solPrice={price}
          loadingProgress={!summary && !failed}
        />
        {failed && !summary && (
          <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">{t.wish.loadError}</p>
        )}
        <div className="hidden lg:block">
          <GreetingWall gifts={summary?.gifts ?? null} wish={wish} price={price} />
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <GiftPanel
          wish={wish}
          price={price}
          perItem={progress?.perItem ?? {}}
          remaining={Math.max(wish.amountSol - (summary?.totalSol ?? 0), 0)}
          onSent={refreshSoon}
        />
        <div className="mt-3 flex items-center justify-center gap-5 text-sm font-semibold text-ink-2">
          <Link
            href={`/blink-preview?url=${encodeURIComponent(`${siteOrigin}/w/${wish.id}`)}`}
            className="inline-flex items-center gap-1.5 hover:text-brand"
          >
            <Zap className="h-4 w-4" />
            {t.blinkPreview.cta}
          </Link>
          {isOwner && (
            <Link href={`/w/${wish.id}/manage`} className="inline-flex items-center gap-1.5 hover:text-brand">
              <Settings2 className="h-4 w-4" />
              {t.wish.manage}
            </Link>
          )}
        </div>
      </div>

      <div className="lg:hidden">
        <GreetingWall gifts={summary?.gifts ?? null} wish={wish} price={price} />
      </div>
    </div>
  );
}
