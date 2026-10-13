'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Download, Gift, Link2, Plus, QrCode as QrIcon, Settings2, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatSol } from '@/lib/amounts';
import { explorerTxUrl } from '@/lib/config';
import { formatMoney, wishGoal } from '@/lib/money';
import { computeProgress, daysUntil } from '@/lib/progress';
import { dateLocale } from '@/lib/client/format';
import { useLocationHref } from '@/lib/client/hooks';
import Cover from '@/components/ui/Cover';
import Progress from '@/components/ui/Progress';
import Spinner from '@/components/ui/Spinner';
import CopyButton from '@/components/ui/CopyButton';
import QrCode from '@/components/ui/QrCode';
import TelegramCard from '@/components/my/TelegramCard';
import type { GiftsSummary, SentGift, Wish } from '@/lib/types';

type Tab = 'wishes' | 'sent';

/** Карточка вишлиста с прогрессом (подарки подгружаются из блокчейна отдельно). */
function WishRow({ wish, me }: { wish: Wish; me: string }) {
  const { t, locale } = useLanguage();
  const [summary, setSummary] = useState<GiftsSummary | null>(null);
  const [showQr, setShowQr] = useState(false);
  const href = useLocationHref();
  const link = href ? `${new URL(href).origin}/w/${wish.id}` : '';
  useEffect(() => {
    let alive = true;
    fetch(`/api/wishes/${wish.id}/gifts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setSummary(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wish.id]);
  // Для списка — без живого курса: фиат по значениям из memo или по курсу на момент создания.
  const progress = summary ? computeProgress(wish, summary.gifts, null) : null;
  const goal = wishGoal(wish);
  const money = (v: number) => formatMoney(v, wish.goalCurrency, dateLocale(locale));
  const days = daysUntil(wish.eventDate);

  return (
    <li className="card p-4">
      <div className="flex gap-4">
        <Link href={`/w/${wish.id}`} className="shrink-0">
          <Cover src={wish.iconUrl} alt={wish.title} className="h-20 w-20 rounded-xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="chip py-0.5">{wish.recipientWallet === me ? t.my.roleRecipient : t.my.roleCreator}</span>
            {wish.closed && <span className="chip py-0.5 text-ink-3">{t.my.closedBadge}</span>}
            {days !== null && days >= 0 && !wish.closed && (
              <span className="chip py-0.5 text-brand">{days === 0 ? t.wish.today : fmt(t.wish.daysLeft, { n: days })}</span>
            )}
          </div>
          <Link href={`/w/${wish.id}`} className="mt-1 block truncate font-bold hover:text-brand">
            {wish.title}
          </Link>
          <div className="mt-2">
            <Progress value={progress && goal ? progress.raised / goal : 0} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-ink-2">
            <span className={progress ? '' : 'animate-pulse text-ink-3'}>
              {fmt(t.wish.raised, { raised: money(progress?.raised ?? 0), goal: money(goal) })}
            </span>
            <span className="text-ink-3">{fmt(t.wish.giftsCount, { count: progress?.count ?? 0 })}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <CopyButton value={link} label={t.my.copyLink} className="btn-secondary px-3 py-1.5 text-sm" />
        <button
          type="button"
          aria-expanded={showQr}
          onClick={() => setShowQr((v) => !v)}
          className={`btn-secondary px-3 py-1.5 text-sm ${showQr ? 'border-brand text-brand' : ''}`}
        >
          <QrIcon className="h-4 w-4" />
          {t.my.qr}
        </button>
        <Link href={`/w/${wish.id}/manage`} className="btn-ghost ml-auto px-3 py-1.5 text-sm">
          <Settings2 className="h-4 w-4" />
          {t.wish.manage}
        </Link>
      </div>
      {showQr && link && (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-xl bg-canvas p-4 sm:flex-row">
          <QrCode value={link} size={150} label={t.create.qrHint} />
          <div className="text-center sm:text-left">
            <p className="text-sm text-ink-2">{t.create.qrHint}</p>
            <a href={`/w/${wish.id}/poster?download=1`} download className="btn-primary mt-3 px-3 py-2 text-sm">
              <Download className="h-4 w-4" />
              {t.my.poster}
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

export default function MyPage() {
  const { t, locale } = useLanguage();
  const m = t.my;
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const me = publicKey?.toBase58() ?? null;
  const [tab, setTab] = useState<Tab>('wishes');
  const [data, setData] = useState<{ wallet: string; wishes: Wish[] | null; sent: SentGift[] | null } | null>(null);

  useEffect(() => {
    if (!me) return;
    let alive = true;
    Promise.resolve()
      .then(() => alive && setData({ wallet: me, wishes: null, sent: null }))
      .then(() => fetch(`/api/my/wishes?wallet=${me}`))
      .then((r) => (r.ok ? r.json() : { wishes: [] }))
      .then((d) => alive && setData((s) => (s && s.wallet === me ? { ...s, wishes: d.wishes ?? [] } : s)))
      .catch(() => alive && setData((s) => (s ? { ...s, wishes: [] } : s)));
    fetch(`/api/my/gifts?wallet=${me}`)
      .then((r) => (r.ok ? r.json() : { gifts: [] }))
      .then((d) => alive && setData((s) => (s && s.wallet === me ? { ...s, sent: d.gifts ?? [] } : s)))
      .catch(() => alive && setData((s) => (s ? { ...s, sent: [] } : s)));
    return () => {
      alive = false;
    };
  }, [me]);

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold">{m.title}</h1>
          <p className="mt-2 text-ink-2">{m.connectPrompt}</p>
          <button type="button" onClick={() => setVisible(true)} className="btn-primary mt-6 w-full">
            {t.wish.connect}
          </button>
        </div>
      </div>
    );
  }

  const wishes = data?.wallet === me ? data.wishes : null;
  const sent = data?.wallet === me ? data.sent : null;
  const loc = dateLocale(locale);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{m.title}</h1>
            <p className="mt-2 max-w-lg text-ink-2">{m.subtitle}</p>
          </div>
          <Link href="/create" className="btn-primary">
            <Plus className="h-4 w-4" />
            {t.nav.createWish}
          </Link>
        </div>

        <div role="tablist" className="mt-8 inline-flex rounded-xl bg-surface p-1 shadow-sm">
          {(['wishes', 'sent'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`rounded-[10px] px-4 py-2 text-sm font-semibold transition ${
                tab === k ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {k === 'wishes' ? m.tabWishes : m.tabSent}
              {k === 'wishes' && wishes && <span className="ml-1.5 opacity-60">{wishes.length}</span>}
              {k === 'sent' && sent && <span className="ml-1.5 opacity-60">{sent.length}</span>}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === 'wishes' ? (
            wishes === null ? (
              <div className="flex items-center gap-2 py-10 text-ink-3">
                <Spinner /> {t.common.loading}
              </div>
            ) : wishes.length === 0 ? (
              <div className="card border-dashed p-10 text-center text-ink-2">{m.empty}</div>
            ) : (
              <ul className="space-y-3">
                {wishes.map((w) => (
                  <WishRow key={w.id} wish={w} me={me} />
                ))}
              </ul>
            )
          ) : sent === null ? (
            <div className="flex items-center gap-2 py-10 text-ink-3">
              <Spinner /> {t.common.loading}
            </div>
          ) : sent.length === 0 ? (
            <div className="card border-dashed p-10 text-center text-ink-2">{m.emptySent}</div>
          ) : (
            <ul className="space-y-2">
              {sent.map((g) => (
                <li key={g.signature}>
                  <a
                    href={g.kind === 'wish' ? `/card/${g.signature}` : explorerTxUrl(g.signature)}
                    target={g.kind === 'wish' ? undefined : '_blank'}
                    rel={g.kind === 'wish' ? undefined : 'noopener noreferrer'}
                    className="card flex items-center gap-3 p-4 transition hover:shadow-pop"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                      {g.kind === 'wish' ? <Gift className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink-3">
                        {g.kind === 'wish' ? m.toWish : m.toLink}
                        {g.blockTime ? ` · ${new Date(g.blockTime * 1000).toLocaleDateString(loc)}` : ''}
                      </p>
                      <p className="truncate text-sm">{g.msg ? `“${g.msg}”` : '🎁'}</p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold">−{formatSol(g.amountSol)} SOL</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:pt-[7.5rem]">
        <TelegramCard wallet={me} />
      </aside>
    </div>
  );
}
