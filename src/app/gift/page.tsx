'use client';

import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { CircleCheck, Link2, ShieldAlert, Undo2, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { CLAIM_FEE_LAMPORTS, LIMITS } from '@/lib/config';
import { formatSol } from '@/lib/amounts';
import { buildLinkMemo } from '@/lib/memo';
import { checkText } from '@/lib/moderation';
import { utf8Bytes } from '@/lib/validation';
import {
  buildFundTransaction,
  claimLink,
  createLinkKeypair,
  keypairFromHash,
  linkUrl,
  loadStoredLinks,
  saveStoredLink,
  type StoredLink,
} from '@/lib/client/gift-link';
import { humanizeError } from '@/lib/client/errors';
import { celebrate } from '@/lib/client/confetti';
import { useToast } from '@/components/Toast';
import QrCode from '@/components/ui/QrCode';
import CopyButton from '@/components/ui/CopyButton';
import ShareRow from '@/components/ui/ShareRow';
import Spinner from '@/components/ui/Spinner';

const PRESETS = [0.05, 0.1, 0.25, 0.5];

export default function GiftLinkPage() {
  const { t } = useLanguage();
  const l = t.link;
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const [amount, setAmount] = useState('0.1');
  const [from, setFrom] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<StoredLink | null>(null);

  const [links, setLinks] = useState<StoredLink[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [reclaiming, setReclaiming] = useState<string | null>(null);

  const [linksTick, setLinksTick] = useState(0);
  const refreshLinks = useCallback(() => setLinksTick((n) => n + 1), []);

  // «Мои ссылки» хранятся только в этом браузере; статус (забрана или нет) берём из блокчейна.
  useEffect(() => {
    let alive = true;
    Promise.resolve(loadStoredLinks())
      .then((list) => {
        if (!alive) return null;
        setLinks(list);
        if (!list.length) return null;
        return connection
          .getMultipleAccountsInfo(list.map((x) => new PublicKey(x.pubkey)))
          .then((infos) => ({ list, infos }));
      })
      .then((res) => {
        if (!alive || !res) return;
        const next: Record<string, number> = {};
        res.list.forEach((x, i) => (next[x.pubkey] = res.infos[i]?.lamports ?? 0));
        setBalances(next);
      })
      .catch(() => {
        // статус ссылок не критичен
      });
    return () => {
      alive = false;
    };
  }, [connection, linksTick]);

  const amountNum = Number(amount);
  const amountValid =
    Number.isFinite(amountNum) && amountNum >= LIMITS.minLinkSol && amountNum <= LIMITS.maxLinkSol;
  const memoTooLong = utf8Bytes(buildLinkMemo(from.trim(), message.trim())) > LIMITS.memoMaxBytes;
  const textCheck = checkText(`${from} ${message}`);

  const create = async () => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    if (!amountValid) {
      toast(fmt(l.minAmount, { min: LIMITS.minLinkSol }));
      return;
    }
    setBusy(true);
    const keypair = createLinkKeypair();
    const url = linkUrl(window.location.origin, keypair);
    const record: StoredLink = {
      pubkey: keypair.publicKey.toBase58(),
      url,
      amountSol: amountNum,
      message: message.trim(),
      createdAt: Date.now(),
      funded: false,
    };
    // Сохраняем ДО отправки: если вкладка закроется, ключ от денег не потеряется.
    saveStoredLink(record);
    try {
      const tx = buildFundTransaction({
        sender: publicKey,
        link: keypair.publicKey,
        amountSol: amountNum,
        from: from.trim() || t.wish.anonymous,
        message: message.trim(),
      });
      const latest = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = publicKey;
      const signature = await sendTransaction(tx, connection);
      const result = await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
      if (result.value.err) throw new Error('transaction failed');

      const funded = { ...record, funded: true };
      saveStoredLink(funded);
      setCreated(funded);
      celebrate();
      refreshLinks();
    } catch (err) {
      toast(humanizeError(err, t));
      refreshLinks();
    } finally {
      setBusy(false);
    }
  };

  const reclaim = async (link: StoredLink) => {
    if (!publicKey) {
      setVisible(true);
      return;
    }
    const keypair = keypairFromHash(link.url.split('#')[1] || '');
    if (!keypair) return;
    setReclaiming(link.pubkey);
    try {
      await claimLink(connection, keypair, publicKey);
      toast(l.reclaimed, 'success');
      refreshLinks();
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setReclaiming(null);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{l.title}</h1>
        <p className="mt-2 max-w-lg text-ink-2">{l.subtitle}</p>

        {created ? (
          <div className="card mt-8 animate-fade-up p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-mint-soft text-mint">
                <CircleCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">{l.readyTitle}</h2>
                <p className="text-sm text-ink-2">{l.readyDesc}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <QrCode value={created.url} size={180} />
              <div className="w-full min-w-0 flex-1 space-y-3">
                <p className="text-3xl font-extrabold">
                  {formatSol(created.amountSol)} <span className="text-lg text-ink-3">SOL</span>
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pl-3">
                  <span className="flex-1 truncate font-mono text-sm text-ink-2">{created.url}</span>
                  <CopyButton value={created.url} className="btn-primary px-3 py-2 text-sm" />
                </div>
                <p className="flex items-start gap-1.5 text-xs font-medium text-warn">
                  <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                  {l.secretWarning}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ShareRow url={created.url} text={l.shareText} />
            </div>
            <button type="button" onClick={() => setCreated(null)} className="btn-ghost mt-3 w-full">
              {t.create.createAnother}
            </button>
          </div>
        ) : (
          <div className="card mt-8 space-y-5 p-5 sm:p-7">
            <fieldset>
              <legend className="field-label">{l.amount}</legend>
              <div className="grid grid-cols-4 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={amountNum === p}
                    onClick={() => setAmount(String(p))}
                    className={`rounded-xl border px-2 py-2.5 font-mono text-sm font-semibold transition ${
                      amountNum === p
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="relative mt-2">
                <input
                  aria-label={l.amount}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={LIMITS.minLinkSol}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`input pr-14 font-mono ${amount && !amountValid ? 'input-error' : ''}`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
                  SOL
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-3">{fmt(l.minAmount, { min: LIMITS.minLinkSol })}</p>
            </fieldset>

            <div>
              <label htmlFor="link-from" className="field-label">
                {l.from}
              </label>
              <input
                id="link-from"
                className="input"
                maxLength={LIMITS.nameMax}
                value={from}
                placeholder={l.fromPh}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="link-msg" className="field-label">
                {l.message}
                <span className="text-xs font-medium text-ink-3">
                  {fmt(t.wish.charsLeft, { n: LIMITS.messageMax - message.length })}
                </span>
              </label>
              <textarea
                id="link-msg"
                rows={3}
                maxLength={LIMITS.messageMax}
                className={`input resize-none ${memoTooLong ? 'input-error' : ''}`}
                value={message}
                placeholder={l.messagePh}
                onChange={(e) => setMessage(e.target.value)}
              />
              {!textCheck.ok && (
                <p role="alert" className="mt-1.5 text-xs font-semibold text-danger">
                  {textCheck.reason === 'link' ? t.wish.modLink : t.wish.modProfanity}
                </p>
              )}
              <p className="mt-1.5 text-xs text-ink-3">{t.wish.publicNote}</p>
            </div>

            {connected ? (
              <button
                type="button"
                disabled={busy || !amountValid || memoTooLong || !textCheck.ok}
                onClick={create}
                className="btn-primary w-full py-3.5 text-base"
              >
                {busy ? <Spinner /> : <Link2 className="h-5 w-5" />}
                {busy ? l.creating : fmt(l.create, { amount: amountValid ? formatSol(amountNum) : '—' })}
              </button>
            ) : (
              <button type="button" onClick={() => setVisible(true)} className="btn-primary w-full py-3.5 text-base">
                <Wallet className="h-5 w-5" />
                {t.wish.connect}
              </button>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-6 lg:pt-[5.5rem]">
        <div className="card p-5">
          <h2 className="font-bold">{l.howTitle}</h2>
          <ol className="mt-3 space-y-3 text-sm text-ink-2">
            {[l.how1, l.how2, l.how3].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-5">
          <h2 className="font-bold">{l.myLinks}</h2>
          {links.length === 0 ? (
            <p className="mt-2 text-sm text-ink-3">{l.myLinksEmpty}</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {links.map((x) => {
                const lamports = balances[x.pubkey];
                const known = lamports !== undefined;
                const active = known && lamports > CLAIM_FEE_LAMPORTS;
                return (
                  <li key={x.pubkey} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold">
                        {known ? formatSol(Math.max(lamports - CLAIM_FEE_LAMPORTS, 0) / LAMPORTS_PER_SOL) : formatSol(x.amountSol)}{' '}
                        SOL
                      </p>
                      <p className="truncate text-xs text-ink-3">
                        {new Date(x.createdAt).toLocaleDateString()} · {x.message || '🎁'}
                      </p>
                    </div>
                    {known && (
                      <span className={`chip ${active ? 'text-brand' : 'text-ink-3'}`}>
                        {active ? l.statusActive : l.statusClaimed}
                      </span>
                    )}
                    {active && (
                      <div className="flex gap-1">
                        <CopyButton value={x.url} className="btn-ghost px-2 py-1.5 text-xs" label=" " />
                        <button
                          type="button"
                          title={l.reclaim}
                          aria-label={l.reclaim}
                          onClick={() => reclaim(x)}
                          disabled={reclaiming === x.pubkey}
                          className="btn-ghost px-2 py-1.5 text-xs"
                        >
                          {reclaiming === x.pubkey ? <Spinner /> : <Undo2 className="h-4 w-4" />}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
