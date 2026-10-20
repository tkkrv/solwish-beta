'use client';

import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import WishSummary from '@/components/wish/WishSummary';
import GiftPanel from '@/components/wish/GiftPanel';
import GreetingWall from '@/components/wish/GreetingWall';
import { computeProgress } from '@/lib/progress';
import type { Gift, Wish } from '@/lib/types';

// Валидный адрес для построения (неиспользуемой) ссылки Solana Pay; в демо транзакции не отправляются.
const DEMO_WALLET = '11111111111111111111111111111111';

/**
 * Демо без кошелька: пример вишлиста и форма подарка в демо-режиме.
 * Нужна для проверяющих (Microsoft, AWS и т. п.) и для людей без криптокошелька:
 * AI-помощник, модерация и премиум-оформление работают по-настоящему, но деньги не двигаются.
 */
export default function DemoPage() {
  const { t } = useLanguage();
  const d = t.demo;
  const now = 1_790_000_000;

  const wish: Wish = {
    id: 'wish_demo',
    title: d.wishTitle,
    description: d.wishDesc,
    amountSol: 5,
    recipientWallet: DEMO_WALLET,
    iconUrl: '/covers/music.jpg',
    creatorName: d.wishFor,
    createdAt: null,
    creatorWallet: null,
    eventDate: null,
    goalCurrency: 'SOL',
    goalFiat: null,
    items: [
      { id: 'i1', title: d.items[0], goal: 3.5 },
      { id: 'i2', title: d.items[1], goal: 1.5 },
    ],
    closed: false,
  };

  const gifts: Gift[] = d.gifts.map((msg, i) => ({
    signature: `demo-${i}`,
    from: d.givers[i],
    msg,
    amountSol: [1.2, 0.8, 0.5][i],
    sender: '',
    blockTime: now - 3600 * (i + 2),
    anonymous: false,
    itemId: i === 2 ? 'i2' : 'i1',
    fiat: null,
    style: (['gold', null, 'aurora'] as const)[i],
  }));
  const progress = computeProgress(wish, gifts, null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <div>
            <p className="font-bold text-brand">{d.banner}</p>
            <p className="text-sm text-ink-2">{d.bannerDesc}</p>
          </div>
        </div>
        <Link href="/create" className="btn-primary shrink-0 px-4 py-2 text-sm">
          {d.createOwn}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        <div className="space-y-8">
          <WishSummary
            title={wish.title}
            description={wish.description}
            creatorName={wish.creatorName}
            iconUrl={wish.iconUrl}
            currency="SOL"
            goal={wish.amountSol}
            progress={progress}
            items={wish.items}
          />
          <div className="hidden lg:block">
            <GreetingWall gifts={gifts} wish={wish} demo />
          </div>
        </div>
        <div id="gift" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <GiftPanel
            wish={wish}
            demo
            remaining={Math.max(wish.amountSol - progress.raisedSol, 0)}
            perItem={progress.perItem}
            onSent={() => {}}
          />
        </div>
        <div className="lg:hidden">
          <GreetingWall gifts={gifts} wish={wish} demo />
        </div>
      </div>
    </div>
  );
}
