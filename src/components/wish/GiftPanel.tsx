'use client';

import { useEffect, useMemo, useState } from 'react';
import { Buffer } from 'buffer';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  BadgeCheck,
  CircleCheck,
  ExternalLink,
  Gift,
  Info,
  QrCode as QrIcon,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { LIMITS, explorerTxUrl } from '@/lib/config';
import { formatSol, suggestedAmounts } from '@/lib/amounts';
import { buildWishMemo } from '@/lib/memo';
import { utf8Bytes } from '@/lib/validation';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { buildTransferRequestUrl } from '@/lib/client/solana-pay';
import { isInWalletBrowser, isMobileDevice, phantomBrowseUrl, solflareBrowseUrl } from '@/lib/client/mobile';
import { celebrate } from '@/lib/client/confetti';
import { useToast } from '@/components/Toast';
import { useIsClient, useLocationHref } from '@/lib/client/hooks';
import QrCode from '@/components/ui/QrCode';
import ShareRow from '@/components/ui/ShareRow';
import Spinner from '@/components/ui/Spinner';
import type { Wish } from '@/lib/types';

type Status = 'idle' | 'signing' | 'confirming';
type Tab = 'wallet' | 'phone';

export default function GiftPanel({
  wish,
  remaining,
  onSent,
}: {
  wish: Wish;
  remaining: number;
  onSent: () => void;
}) {
  const { t } = useLanguage();
  const w = t.wish;
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const presets = useMemo(() => suggestedAmounts(wish.amountSol, remaining), [wish.amountSol, remaining]);
  const [amount, setAmount] = useState<string>(() => String(presets[1] ?? presets[0] ?? 0.05));
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<Tab>('wallet');
  const [status, setStatus] = useState<Status>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const isClient = useIsClient();
  const pageUrl = useLocationHref();
  const mobile = isClient && isMobileDevice();
  const inWallet = isClient && isInWalletBrowser();

  const amountNum = Number(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= LIMITS.minGiftSol && amountNum <= LIMITS.maxGiftSol;
  const senderName = name.trim() || w.anonymous;
  const memo = buildWishMemo(wish.id, senderName, message.trim());
  const memoTooLong = utf8Bytes(memo) > LIMITS.memoMaxBytes;
  const canSend = amountValid && !memoTooLong;

  // ---------- Оплата с подключённого кошелька ----------
  const sendWithWallet = async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!amountValid) {
      toast(fmt(t.errors.invalidAmount, { min: LIMITS.minGiftSol, max: LIMITS.maxGiftSol }));
      return;
    }
    if (memoTooLong) {
      toast(t.errors.memoTooLong);
      return;
    }
    try {
      setStatus('signing');
      const qs = new URLSearchParams({ amount: String(amountNum), senderName, message: message.trim() });
      const { transaction } = await fetchJson<{ transaction: string }>(
        `/api/actions/gift/${wish.id}?${qs.toString()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: publicKey.toBase58() }),
        }
      );
      const tx = Transaction.from(Buffer.from(transaction, 'base64'));
      // Свежий blockhash прямо перед подписью — чтобы транзакция не «протухла».
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;

      const sig = await sendTransaction(tx, connection);
      setStatus('confirming');
      const result = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      if (result.value.err) throw new Error('transaction failed');

      setSignature(sig);
      celebrate();
      onSent();
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setStatus('idle');
    }
  };

  // ---------- Оплата с телефона через Solana Pay ----------
  // Новый reference-ключ на каждую комбинацию суммы и открытки: по нему находим оплату с телефона.
  const [reference, setReference] = useState<string>(() => Keypair.generate().publicKey.toBase58());
  const [referenceFor, setReferenceFor] = useState(`${amount}|${name}|${message}`);
  if (referenceFor !== `${amount}|${name}|${message}`) {
    setReferenceFor(`${amount}|${name}|${message}`);
    setReference(Keypair.generate().publicKey.toBase58());
  }

  const payUrl = useMemo(() => {
    if (!reference || !canSend) return '';
    return buildTransferRequestUrl({
      recipient: wish.recipientWallet,
      amount: amountNum,
      reference,
      label: 'SolWish',
      message: wish.title.slice(0, 60),
      memo,
    });
  }, [reference, canSend, wish.recipientWallet, wish.title, amountNum, memo]);

  useEffect(() => {
    if (tab !== 'phone' || !payUrl || signature) return;
    let stopped = false;
    const ref = new PublicKey(reference);
    const timer = setInterval(async () => {
      try {
        const sigs = await connection.getSignaturesForAddress(ref, { limit: 1 }, 'confirmed');
        if (!stopped && sigs[0] && !sigs[0].err) {
          stopped = true;
          clearInterval(timer);
          setSignature(sigs[0].signature);
          celebrate();
          onSent();
        }
      } catch {
        // временные ошибки RPC — просто ждём следующую попытку
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [tab, payUrl, reference, signature, connection, onSent]);

  // ---------- Успех ----------
  if (signature) {
    const cardUrl = pageUrl ? `${new URL(pageUrl).origin}/card/${signature}` : '';
    return (
      <div className="card animate-fade-up p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft text-mint">
            <CircleCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">{w.successTitle}</h2>
            <p className="text-sm text-ink-2">{w.successDesc}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-soft to-mint-soft p-4">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand">
            <BadgeCheck className="h-3.5 w-3.5" /> SPL Memo
          </p>
          <p className="whitespace-pre-line break-words text-ink">“{message.trim() || '🎁'}”</p>
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span className="text-ink-2">{fmt(w.from, { name: senderName })}</span>
            <span className="font-mono text-mint">+{formatSol(amountNum)} SOL</span>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <Link href={`/card/${signature}`} className="btn-primary">
            {w.viewCard}
          </Link>
          <a href={explorerTxUrl(signature)} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <ExternalLink className="h-4 w-4" />
            {w.viewExplorer}
          </a>
        </div>
        <p className="mb-2 mt-5 text-sm font-semibold text-ink-2">{w.shareCard}</p>
        <ShareRow url={cardUrl} text={`🎁 ${wish.title}`} />
        <button
          type="button"
          onClick={() => {
            setSignature(null);
            setMessage('');
          }}
          className="btn-ghost mt-3 w-full"
        >
          {w.sendAnother}
        </button>
      </div>
    );
  }

  const busy = status !== 'idle';
  const messageLeft = LIMITS.messageMax - message.length;

  // ---------- Форма ----------
  return (
    <div className="card p-5 sm:p-6">
      {/* Сумма */}
      <fieldset>
        <legend className="field-label">{w.amount}</legend>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              aria-pressed={Number(amount) === p}
              className={`rounded-xl border px-2 py-2.5 font-mono text-sm font-semibold transition ${
                Number(amount) === p
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-ink hover:border-line-strong'
              }`}
            >
              {formatSol(p)}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <input
            aria-label={w.custom}
            type="number"
            inputMode="decimal"
            step="any"
            min={LIMITS.minGiftSol}
            max={LIMITS.maxGiftSol}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`input pr-14 font-mono ${amount && !amountValid ? 'input-error' : ''}`}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
            SOL
          </span>
        </div>
        {amount && !amountValid && (
          <p className="mt-1 text-xs font-semibold text-danger">
            {fmt(t.errors.invalidAmount, { min: LIMITS.minGiftSol, max: LIMITS.maxGiftSol })}
          </p>
        )}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="gift-name" className="field-label">
          {w.yourName}
        </label>
        <input
          id="gift-name"
          className="input"
          maxLength={LIMITS.nameMax}
          value={name}
          placeholder={w.yourNamePh}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="gift-msg" className="field-label">
          {w.message}
          <span className={`text-xs font-medium ${messageLeft < 20 ? 'text-warn' : 'text-ink-3'}`}>
            {fmt(w.charsLeft, { n: messageLeft })}
          </span>
        </label>
        <textarea
          id="gift-msg"
          rows={3}
          maxLength={LIMITS.messageMax}
          className={`input resize-none ${memoTooLong ? 'input-error' : ''}`}
          value={message}
          placeholder={w.messagePh}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-3">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          {w.publicNote}
        </p>
      </div>

      {/* Способ оплаты */}
      <div role="tablist" className="mt-5 grid grid-cols-2 rounded-xl bg-canvas p-1">
        {(
          [
            ['wallet', w.tabWallet, Wallet],
            ['phone', w.tabPhone, QrIcon],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-sm font-semibold transition ${
              tab === key ? 'bg-surface text-ink shadow-sm' : 'text-ink-2'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'wallet' ? (
        <div className="mt-4 space-y-3">
          {mobile && !inWallet && !connected && pageUrl && (
            <div className="rounded-xl border border-line bg-canvas p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Smartphone className="h-4 w-4 text-brand" />
                {w.mobileTitle}
              </p>
              <p className="mt-1 text-xs text-ink-2">{w.mobileDesc}</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <a href={phantomBrowseUrl(pageUrl)} className="btn-secondary py-2 text-sm">
                  {w.openPhantom}
                </a>
                <a href={solflareBrowseUrl(pageUrl)} className="btn-secondary py-2 text-sm">
                  {w.openSolflare}
                </a>
              </div>
            </div>
          )}
          {connected ? (
            <button
              type="button"
              disabled={busy || !canSend}
              onClick={sendWithWallet}
              className="btn-primary w-full py-3.5 text-base"
            >
              {busy ? <Spinner /> : <Gift className="h-5 w-5" />}
              {status === 'signing'
                ? w.signing
                : status === 'confirming'
                  ? w.confirming
                  : fmt(w.send, { amount: amountValid ? formatSol(amountNum) : '—' })}
            </button>
          ) : (
            <button type="button" onClick={() => setVisible(true)} className="btn-primary w-full py-3.5 text-base">
              <Wallet className="h-5 w-5" />
              {w.connect}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center text-center">
          {payUrl ? (
            <>
              <QrCode value={payUrl} size={220} label={w.qrTitle} />
              <p className="mt-3 font-semibold">{w.qrTitle}</p>
              <p className="mt-1 text-sm text-ink-2">{w.qrDesc}</p>
              {mobile && (
                <a href={payUrl} className="btn-secondary mt-3 w-full">
                  <Wallet className="h-4 w-4" />
                  {fmt(w.send, { amount: formatSol(amountNum) })}
                </a>
              )}
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-ink-3">
                <Spinner /> {w.qrWaiting}
              </p>
            </>
          ) : (
            <p className="py-6 text-sm text-ink-3">
              {fmt(t.errors.invalidAmount, { min: LIMITS.minGiftSol, max: LIMITS.maxGiftSol })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
