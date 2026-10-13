'use client';

import Link from 'next/link';
import { BadgeCheck, ExternalLink, Gift } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { NETWORK, explorerTxUrl, shortAddress } from '@/lib/config';
import { formatSol } from '@/lib/amounts';
import { dateLocale } from '@/lib/client/format';
import ShareRow from '@/components/ui/ShareRow';
import type { GreetingCard, Wish } from '@/lib/types';

export default function CardView({ card, wish }: { card: GreetingCard; wish: Wish | null }) {
  const { t, locale } = useLanguage();
  const c = t.card;
  const date = card.blockTime
    ? new Date(card.blockTime * 1000).toLocaleString(dateLocale(locale), {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '';
  const to = wish?.creatorName || shortAddress(card.recipient);
  const url = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <article className="relative overflow-hidden rounded-[1.75rem] bg-sol-gradient p-[2px] shadow-pop">
        <div className="rounded-[calc(1.75rem-2px)] bg-surface p-7 sm:p-9">
          <div className="flex items-center justify-between">
            <span className="chip border-mint/30 bg-mint-soft text-mint">
              <BadgeCheck className="h-3.5 w-3.5" />
              {fmt(c.verified, { network: NETWORK === 'mainnet-beta' ? 'Mainnet' : 'Devnet' })}
            </span>
            <Gift className="h-6 w-6 text-brand" />
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-3">{c.to}</p>
          <p className="text-2xl font-extrabold tracking-tight">{to}</p>
          {wish && <p className="mt-0.5 text-ink-2">{wish.title}</p>}

          <blockquote className="my-8 whitespace-pre-line break-words text-2xl font-semibold leading-snug text-ink">
            {card.msg ? `“${card.msg}”` : '🎁'}
          </blockquote>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-ink-3">{c.from}</dt>
              <dd className="font-semibold">{card.from || t.wish.anonymous}</dd>
            </div>
            <div className="text-right">
              <dt className="text-ink-3">{c.amount}</dt>
              <dd className="font-mono font-semibold text-mint">+{formatSol(card.amountSol)} SOL</dd>
            </div>
            {date && (
              <div className="col-span-2">
                <dt className="text-ink-3">{c.date}</dt>
                <dd className="font-semibold">{date}</dd>
              </div>
            )}
          </dl>
        </div>
      </article>

      <div className="mt-6 grid gap-2">
        <a href={explorerTxUrl(card.signature)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <ExternalLink className="h-4 w-4" />
          {c.viewExplorer}
        </a>
        {wish ? (
          <Link href={`/w/${wish.id}`} className="btn-primary">
            {c.openWish}
          </Link>
        ) : (
          <Link href="/create" className="btn-primary">
            {c.makeOwn}
          </Link>
        )}
      </div>
      {url && (
        <div className="mt-5">
          <ShareRow url={url} text={`🎁 ${card.msg ? card.msg.slice(0, 100) : 'SolWish'}`} />
        </div>
      )}
    </div>
  );
}
