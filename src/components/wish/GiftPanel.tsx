'use client';

import { useEffect, useState } from 'react';
import { Buffer } from 'buffer';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import {
  BadgeCheck,
  CircleCheck,
  ExternalLink,
  Gift,
  Info,
  Lock,
  QrCode as QrIcon,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { LIMITS, explorerTxUrl } from '@/lib/config';
import { formatSol, suggestedAmounts } from '@/lib/amounts';
import { fiatToSol, formatMoney, isFiat, roundFiat, solToFiat } from '@/lib/money';
import { dateLocale } from '@/lib/client/format';
import { buildWishMemo } from '@/lib/memo';
import { utf8Bytes } from '@/lib/validation';
import { checkText } from '@/lib/moderation';
import { PREMIUM_ENABLED, PREMIUM_PRICE_SOL, PREMIUM_STYLES, STYLE_CLASSES, type PremiumStyle } from '@/lib/premium';
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
type Tone = 'warm' | 'funny' | 'formal' | 'short';
const TONES: Tone[] = ['warm', 'funny', 'formal', 'short'];

export default function GiftPanel({
  wish,
  remaining,
  onSent,
  price = null,
  perItem = {},
}: {
  wish: Wish;
  remaining: number;
  onSent: () => void;
  /** Курс SOL в валюте вишлиста (для фиатных вишлистов). */
  price?: number | null;
  perItem?: Record<string, number>;
}) {
  const { t } = useLanguage();
  const w = t.wish;
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const { locale } = useLanguage();
  const fiat = isFiat(wish.goalCurrency) && !!price;
  const money = (v: number) => formatMoney(v, wish.goalCurrency, dateLocale(locale));

  // Быстрые суммы: в фиатных вишлистах — круглые суммы в валюте, переведённые в SOL.
  const presets =
    fiat && price && wish.goalFiat
      ? [...new Set([0.1, 0.25, 0.5].map((x) => roundFiat(wish.goalFiat! * x)))]
          .map((v) => ({ sol: fiatToSol(v, price), label: money(v), sub: `${formatSol(fiatToSol(v, price))} SOL` }))
          .filter((p) => p.sol >= LIMITS.minGiftSol && p.sol <= LIMITS.maxGiftSol)
          .slice(0, 4)
      : suggestedAmounts(wish.amountSol, remaining).map((sol) => ({ sol, label: formatSol(sol), sub: '' }));
  const [amount, setAmount] = useState<string>('');
  const effectiveAmount = amount || String(presets[1]?.sol ?? presets[0]?.sol ?? 0.05);
  const [itemId, setItemId] = useState<string>('');
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [tabChoice, setTab] = useState<Tab | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  // Премиум-оформление (оплачивается в той же транзакции; только при оплате через кошелёк).
  const [cardStyle, setCardStyle] = useState<PremiumStyle | ''>('');
  const [sentStyle, setSentStyle] = useState<PremiumStyle | ''>('');
  // AI-помощник открытки (кнопка появляется, только если AI включён на сервере).
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState<Tone | null>(null);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => alive && setAiEnabled(Boolean(d.enabled)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const isClient = useIsClient();
  const pageUrl = useLocationHref();
  const mobile = isClient && isMobileDevice();
  const inWallet = isClient && isInWalletBrowser();
  // Нет кошелька в браузере (или телефон вне приложения кошелька) → сразу оплата без подключения (QR / Solana Pay).
  const hasWallet = connected || inWallet || wallets.some((x) => x.readyState === WalletReadyState.Installed);
  const tab: Tab = tabChoice ?? (isClient && !hasWallet ? 'phone' : 'wallet');

  const amountNum = Number(effectiveAmount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= LIMITS.minGiftSol && amountNum <= LIMITS.maxGiftSol;
  const senderName = name.trim() || w.anonymous;
  const fiatValue = fiat && price && amountValid ? solToFiat(amountNum, price) : null;
  const memo = buildWishMemo(wish.id, senderName, message.trim(), {
    itemId: itemId || null,
    fiat: fiatValue,
    anonymous,
  });
  const memoTooLong = utf8Bytes(memo) > LIMITS.memoMaxBytes;
  // Открытка навсегда в блокчейне: грубые слова и ссылки ловим сразу, ещё до отправки.
  const textCheck = checkText(`${name} ${message}`);
  const canSend = amountValid && !memoTooLong && textCheck.ok;

  const suggest = async (tone: Tone) => {
    setAiBusy(tone);
    try {
      const { options } = await fetchJson<{ options: string[] }>('/api/ai/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId: wish.id, lang: locale, tone, draft: message.trim() }),
      });
      setAiOptions(options);
    } catch (err) {
      const m = (err as Error)?.message || '';
      toast(/rate_limited/.test(m) ? t.errors.rateLimited : w.aiError);
    } finally {
      setAiBusy(null);
    }
  };

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
      // Если AI включён — дополнительная проверка смысла текста (словарь уже проверил грубые слова).
      if (aiEnabled && message.trim()) {
        const mod = await fetchJson<{ ok: boolean }>('/api/ai/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [name.trim(), message.trim()] }),
        }).catch(() => ({ ok: true }));
        if (!mod.ok) {
          toast(w.modAi);
          return;
        }
      }
      const qs = new URLSearchParams({ amount: String(amountNum), senderName, message: message.trim() });
      if (itemId) qs.set('item', itemId);
      if (anonymous) qs.set('anon', '1');
      if (PREMIUM_ENABLED && cardStyle) qs.set('style', cardStyle);
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

      setSentStyle(PREMIUM_ENABLED ? cardStyle : '');
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
  const refKey = `${effectiveAmount}|${name}|${message}|${itemId}|${anonymous}`;
  const [referenceFor, setReferenceFor] = useState(refKey);
  if (referenceFor !== refKey) {
    setReferenceFor(refKey);
    setReference(Keypair.generate().publicKey.toBase58());
  }

  const payUrl =
    reference && canSend
      ? buildTransferRequestUrl({
          recipient: wish.recipientWallet,
          amount: amountNum,
          reference,
          label: 'SolWish',
          message: wish.title.slice(0, 60),
          memo,
        })
      : '';

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
          setSentStyle('');
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
        <div className={`rounded-2xl ${sentStyle ? `${STYLE_CLASSES[sentStyle].frame}` : 'p-0'}`}>
        <div
          className={`rounded-2xl p-4 ${
            sentStyle ? STYLE_CLASSES[sentStyle].inner : 'bg-gradient-to-br from-brand-soft to-mint-soft'
          }`}
        >
          <p className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand">
            <BadgeCheck className="h-3.5 w-3.5" /> SPL Memo
            {sentStyle && <span className="ml-auto text-ink-2">{w.premiumNames[sentStyle]}</span>}
          </p>
          <p className="whitespace-pre-line break-words text-ink">“{message.trim() || '🎁'}”</p>
          <div className="mt-2 flex justify-between text-sm font-semibold">
            <span className="text-ink-2">{fmt(w.from, { name: anonymous ? w.anonymousLabel : senderName })}</span>
            <span className="font-mono text-mint">+{formatSol(amountNum)} SOL</span>
          </div>
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

  if (wish.closed) {
    return (
      <div className="card p-6 text-center">
        <Lock className="mx-auto mb-3 h-7 w-7 text-ink-3" />
        <p className="font-bold">{w.closedTitle}</p>
        <p className="mt-1 text-sm text-ink-2">{w.closedDesc}</p>
      </div>
    );
  }

  // ---------- Форма ----------
  return (
    <div className="card p-5 sm:p-6">
      {/* Выбор желания (если в вишлисте несколько подарков) */}
      {wish.items.length > 0 && (
        <fieldset className="mb-4">
          <legend className="field-label">{w.forItem}</legend>
          <div className="flex flex-wrap gap-2">
            {[{ id: '', title: w.anyItem, goal: 0 }, ...wish.items].map((it) => {
              const left = it.id ? Math.max(it.goal - (perItem[it.id] ?? 0), 0) : null;
              const active = itemId === it.id;
              return (
                <button
                  key={it.id || 'any'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setItemId(it.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface hover:border-line-strong'
                  }`}
                >
                  {it.title}
                  {left !== null && left > 0 && <span className="ml-1.5 font-medium text-ink-3">· {money(left)}</span>}
                  {left === 0 && <span className="ml-1.5 text-mint">✓</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Сумма */}
      <fieldset>
        <legend className="field-label">{w.amount}</legend>
        <div className={`grid gap-2 ${presets.length >= 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {presets.map((p) => {
            const active = Number(effectiveAmount) === p.sol;
            return (
              <button
                key={p.sol}
                type="button"
                onClick={() => setAmount(String(p.sol))}
                aria-pressed={active}
                className={`rounded-xl border px-2 py-2 text-sm font-semibold transition ${
                  active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:border-line-strong'
                } ${fiat ? '' : 'font-mono'}`}
              >
                {p.label}
                {p.sub && <span className="block font-mono text-[11px] font-medium text-ink-3">{p.sub}</span>}
              </button>
            );
          })}
        </div>
        <div className="relative mt-2">
          <input
            aria-label={w.custom}
            type="number"
            inputMode="decimal"
            step="any"
            min={LIMITS.minGiftSol}
            max={LIMITS.maxGiftSol}
            value={effectiveAmount}
            onChange={(e) => setAmount(e.target.value)}
            className={`input pr-14 font-mono ${!amountValid ? 'input-error' : ''}`}
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
            SOL
          </span>
        </div>
        {fiat && amountValid && fiatValue !== null && (
          <p className="mt-1 text-xs text-ink-3">{fmt(w.approx, { value: money(fiatValue) })}</p>
        )}
        {!amountValid && (
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
          disabled={anonymous}
          className="input"
          maxLength={LIMITS.nameMax}
          value={name}
          placeholder={w.yourNamePh}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong accent-brand"
          />
          {w.anonymousToggle}
        </label>
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
        {!textCheck.ok && (
          <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">
            {textCheck.reason === 'link' ? w.modLink : w.modProfanity}
          </p>
        )}
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-ink-3">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          {w.publicNote}
        </p>
        {aiEnabled && (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={aiOpen}
              onClick={() => setAiOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
            >
              <Sparkles className="h-4 w-4" />
              {w.aiHelp}
            </button>
            {aiOpen && (
              <div className="mt-2 rounded-xl border border-line bg-canvas p-3">
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      disabled={!!aiBusy}
                      onClick={() => suggest(tone)}
                      className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      {aiBusy === tone && <Spinner />}
                      {w.aiTones[tone]}
                    </button>
                  ))}
                </div>
                {aiBusy && <p className="mt-2 text-xs text-ink-3">{w.aiLoading}</p>}
                {aiOptions.length > 0 && (
                  <>
                    <ul className="mt-2 space-y-1.5">
                      {aiOptions.map((o) => (
                        <li key={o}>
                          <button
                            type="button"
                            onClick={() => {
                              setMessage(o.slice(0, LIMITS.messageMax));
                              setAiOpen(false);
                              setAiOptions([]);
                            }}
                            className="w-full break-words rounded-lg border border-line bg-surface px-3 py-2 text-left text-sm hover:border-brand"
                          >
                            {o}
                          </button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1.5 text-xs text-ink-3">{w.aiPick}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {PREMIUM_ENABLED && (
        <fieldset className="mt-4">
          <legend className="field-label">{w.premiumTitle}</legend>
          <div className="grid grid-cols-4 gap-2">
            {(['', ...PREMIUM_STYLES] as const).map((st) => {
              const active = cardStyle === st;
              return (
                <button
                  key={st || 'classic'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCardStyle(st)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-1.5 text-[11px] font-semibold transition ${
                    active ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                  }`}
                >
                  <span
                    className={`h-8 w-full rounded-lg ${st ? STYLE_CLASSES[st].swatch : 'bg-gradient-to-br from-brand-soft to-mint-soft'}`}
                  />
                  {st ? w.premiumNames[st] : w.premiumFree}
                  <span className="font-mono font-medium text-ink-3">
                    {st ? fmt(w.premiumPrice, { price: formatSol(PREMIUM_PRICE_SOL) }) : '0'}
                  </span>
                </button>
              );
            })}
          </div>
          {cardStyle && <p className="mt-1.5 text-xs text-ink-3">{w.premiumHint}</p>}
        </fieldset>
      )}

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
                  : fmt(cardStyle ? w.sendPremium : w.send, { amount: amountValid ? formatSol(amountNum) : '—' })}
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
          {cardStyle && payUrl && (
            <p className="mb-3 w-full rounded-xl bg-warn-soft px-3 py-2 text-xs font-medium text-warn">{w.premiumWalletOnly}</p>
          )}
          {payUrl ? (
            <>
              {mobile && !inWallet && (
                <div className="mb-4 w-full space-y-2">
                  <a href={payUrl} className="btn-primary w-full py-3.5 text-base">
                    <Wallet className="h-5 w-5" />
                    {fmt(w.payInApp, { amount: formatSol(amountNum) })}
                  </a>
                  {pageUrl && (
                    <div className="grid grid-cols-2 gap-2">
                      <a href={phantomBrowseUrl(pageUrl)} className="btn-secondary py-2 text-sm">
                        {w.openPhantom}
                      </a>
                      <a href={solflareBrowseUrl(pageUrl)} className="btn-secondary py-2 text-sm">
                        {w.openSolflare}
                      </a>
                    </div>
                  )}
                  <p className="pt-1 text-xs text-ink-3">{w.qrOtherDevice}</p>
                </div>
              )}
              <QrCode value={payUrl} size={mobile ? 180 : 220} label={w.qrTitle} />
              <p className="mt-3 font-semibold">{w.qrTitle}</p>
              <p className="mt-1 text-sm text-ink-2">{w.qrDesc}</p>
              {mobile && inWallet && (
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
