'use client';

import { useState } from 'react';
import { Buffer } from 'buffer';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ComputeBudgetProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { buildThanksMemo } from '@/lib/memo';
import { utf8Bytes } from '@/lib/validation';
import { humanizeError } from '@/lib/client/errors';
import { celebrate } from '@/lib/client/confetti';
import { useLocationHref } from '@/lib/client/hooks';
import { useToast } from '@/components/Toast';
import Spinner from '@/components/ui/Spinner';

import Link from 'next/link';
import { BadgeCheck, ExternalLink, Gift, Heart, ImageDown } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { GIFT_TX_COMPUTE_UNITS, LIMITS, MEMO_PROGRAM_ID, NETWORK, explorerTxUrl, shortAddress } from '@/lib/config';
import { formatSol } from '@/lib/amounts';
import { dateLocale } from '@/lib/client/format';
import ShareRow from '@/components/ui/ShareRow';
import type { GreetingCard, ThankYou, Wish } from '@/lib/types';
import { STYLE_CLASSES, isPremiumStyle } from '@/lib/premium';

export default function CardView({
  card,
  wish,
  thanks: initialThanks,
}: {
  card: GreetingCard;
  wish: Wish | null;
  thanks: ThankYou | null;
}) {
  const { t, locale } = useLanguage();
  const c = t.card;
  const date = card.blockTime
    ? new Date(card.blockTime * 1000).toLocaleString(dateLocale(locale), {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '';
  const to = wish?.creatorName || shortAddress(card.recipient);
  const url = useLocationHref();
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [thanks, setThanks] = useState<ThankYou | null>(initialThanks);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const isRecipient = publicKey?.toBase58() === card.recipient;
  const fromName = card.anonymous ? t.wish.anonymousLabel : card.from || t.wish.anonymous;
  const style = isPremiumStyle(card.style) ? card.style : null;

  // «Спасибо» — отдельная транзакция только с Memo, подписанная получателем (без перевода денег).
  const sendThanks = async () => {
    if (!publicKey || !reply.trim()) return;
    setSending(true);
    try {
      const memo = buildThanksMemo(card.signature, reply.trim());
      if (utf8Bytes(memo) > LIMITS.memoMaxBytes) throw new Error('memo_too_long');
      const latest = await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({ feePayer: publicKey, ...latest }).add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: GIFT_TX_COMPUTE_UNITS }),
        new TransactionInstruction({
          keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
          programId: MEMO_PROGRAM_ID,
          data: Buffer.from(memo, 'utf-8'),
        })
      );
      const signature = await sendTransaction(tx, connection);
      const res = await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
      if (res.value.err) throw new Error('transaction failed');
      setThanks({ signature, msg: reply.trim(), blockTime: Math.floor(Date.now() / 1000) });
      toast(c.thanksSent, 'success');
      celebrate();
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <article
        className={`relative overflow-hidden rounded-[1.75rem] shadow-pop ${style ? STYLE_CLASSES[style].frame : 'bg-sol-gradient p-[2px]'}`}
      >
        <div className={`rounded-[calc(1.75rem-5px)] p-7 sm:p-9 ${style ? STYLE_CLASSES[style].inner : 'bg-surface'}`}>
          <div className="flex items-center justify-between">
            <span className="chip border-mint/30 bg-mint-soft text-mint">
              <BadgeCheck className="h-3.5 w-3.5" />
              {fmt(c.verified, { network: NETWORK === 'mainnet-beta' ? 'Mainnet' : 'Devnet' })}
            </span>
            {style ? (
              <span className="chip border-brand/30 bg-brand-soft text-brand">{t.wish.premiumNames[style]}</span>
            ) : (
              <Gift className="h-6 w-6 text-brand" />
            )}
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-3">{c.to}</p>
          <p className="text-2xl font-extrabold tracking-tight">{to}</p>
          {wish && <p className="mt-0.5 text-ink-2">{wish.title}</p>}

          <blockquote className="my-8 whitespace-pre-line break-words text-2xl font-semibold leading-snug text-ink">
            {card.hidden ? <span className="text-base font-medium text-ink-3">{t.wish.hiddenMsg}</span> : card.msg ? `“${card.msg}”` : '🎁'}
          </blockquote>

          <dl className="grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-ink-3">{c.from}</dt>
              <dd className="font-semibold">{fromName}</dd>
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

      {thanks ? (
        <div className="card mt-4 p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand">
            <Heart className="h-3.5 w-3.5" />
            {fmt(c.thanksFrom, { name: to })}
          </p>
          <p className="mt-2 whitespace-pre-line break-words text-lg font-semibold">“{thanks.msg}”</p>
          <a
            href={explorerTxUrl(thanks.signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink"
          >
            <BadgeCheck className="h-3.5 w-3.5" /> SPL Memo
          </a>
        </div>
      ) : (
        isRecipient && (
          <div className="card mt-4 p-5">
            <p className="field-label">{c.sayThanks}</p>
            <textarea
              rows={2}
              maxLength={LIMITS.messageMax}
              className="input resize-none"
              value={reply}
              placeholder={c.thanksPh}
              onChange={(e) => setReply(e.target.value)}
            />
            <button
              type="button"
              disabled={sending || !reply.trim()}
              onClick={sendThanks}
              className="btn-primary mt-3 w-full"
            >
              {sending ? <Spinner /> : <Heart className="h-4 w-4" />}
              {c.sendThanks}
            </button>
            <p className="mt-2 text-xs text-ink-3">{t.wish.publicNote}</p>
          </div>
        )
      )}

      <div className="mt-6 grid gap-2">
        <a href={`/card/${card.signature}/story`} download={`solwish-card-${card.signature.slice(0, 8)}.png`} className="btn-secondary">
          <ImageDown className="h-4 w-4" />
          {c.storyDownload}
        </a>
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
