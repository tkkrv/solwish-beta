'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { CircleAlert, CircleCheck, ExternalLink, Gift, Smartphone, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { CLAIM_FEE_LAMPORTS, explorerTxUrl } from '@/lib/config';
import { formatSol } from '@/lib/amounts';
import { isValidSolanaAddress } from '@/lib/validation';
import { claimLink, keypairFromHash, readLinkCard } from '@/lib/client/gift-link';
import { humanizeError } from '@/lib/client/errors';
import { celebrate } from '@/lib/client/confetti';
import { isInWalletBrowser, isMobileDevice, phantomBrowseUrl } from '@/lib/client/mobile';
import { useToast } from '@/components/Toast';
import { useIsClient, useLocationHash } from '@/lib/client/hooks';
import Spinner from '@/components/ui/Spinner';

type State =
  | { kind: 'loading' }
  | { kind: 'invalid' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'ready'; lamports: number; from: string; msg: string }
  | { kind: 'claimed'; signature: string; lamports: number };

export default function ClaimPage() {
  const { t } = useLanguage();
  const c = t.claim;
  const toast = useToast();
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const hash = useLocationHash();
  const isClient = useIsClient();
  const keypair = useMemo(() => (hash ? keypairFromHash(hash) : null), [hash]);
  const mobile = isClient && isMobileDevice() && !isInWalletBrowser();

  const [loaded, setLoaded] = useState<{ key: string; state: State } | null>(null);
  const [claimed, setClaimed] = useState<State | null>(null);
  const [target, setTarget] = useState<'wallet' | 'address'>('wallet');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  // Баланс ссылки и открытка читаются прямо из блокчейна.
  useEffect(() => {
    if (!keypair) return;
    let alive = true;
    const key = keypair.publicKey.toBase58();
    Promise.all([
      connection.getBalance(keypair.publicKey, 'confirmed'),
      readLinkCard(connection, keypair.publicKey).catch(() => null),
    ])
      .then(([lamports, card]) => {
        if (!alive) return;
        setLoaded({
          key,
          state:
            lamports <= CLAIM_FEE_LAMPORTS
              ? { kind: 'empty' }
              : { kind: 'ready', lamports: lamports - CLAIM_FEE_LAMPORTS, from: card?.from || '', msg: card?.msg || '' },
        });
      })
      // Ошибка сети ≠ битая ссылка: предлагаем повторить, а не пугаем «неверной ссылкой».
      .catch(() => alive && setLoaded({ key, state: { kind: 'error' } }));
    return () => {
      alive = false;
    };
  }, [keypair, connection, retry]);

  const state: State =
    claimed ??
    (!isClient
      ? { kind: 'loading' }
      : !keypair
        ? { kind: 'invalid' }
        : loaded && loaded.key === keypair.publicKey.toBase58()
          ? loaded.state
          : { kind: 'loading' });

  const destination =
    target === 'wallet'
      ? publicKey
      : isValidSolanaAddress(address)
        ? new PublicKey(address.trim())
        : null;

  const claim = async () => {
    if (!keypair) return;
    if (!destination) {
      if (target === 'wallet') setVisible(true);
      return;
    }
    setBusy(true);
    try {
      const { signature, lamports } = await claimLink(connection, keypair, destination);
      setClaimed({ kind: 'claimed', signature, lamports });
      celebrate();
    } catch (err) {
      if ((err as Error)?.message === 'link_empty') setClaimed({ kind: 'empty' });
      else toast(humanizeError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const wrap = (children: React.ReactNode) => (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card animate-fade-up overflow-hidden">{children}</div>
    </div>
  );

  if (state.kind === 'loading') {
    return wrap(
      <div className="flex items-center justify-center gap-2 p-12 text-ink-3">
        <Spinner /> {t.common.loading}
      </div>
    );
  }

  if (state.kind === 'error') {
    return wrap(
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warn-soft text-warn">
          <CircleAlert className="h-7 w-7" />
        </div>
        <p className="font-semibold">{t.errors.generic}</p>
        <button
          type="button"
          onClick={() => {
            setLoaded(null);
            setRetry((n) => n + 1);
          }}
          className="btn-primary mt-6 w-full"
        >
          {t.common.tryAgain}
        </button>
      </div>
    );
  }

  if (state.kind === 'invalid' || state.kind === 'empty') {
    const invalid = state.kind === 'invalid';
    return wrap(
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-3">
          <CircleAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold">{invalid ? c.invalidTitle : c.emptyTitle}</h1>
        <p className="mt-2 text-ink-2">{invalid ? c.invalidDesc : c.emptyDesc}</p>
        <Link href="/gift" className="btn-primary mt-6 w-full">
          {t.home.linkCta}
        </Link>
      </div>
    );
  }

  if (state.kind === 'claimed') {
    return wrap(
      <div className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-mint">
          <CircleCheck className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold">{c.claimedTitle}</h1>
        <p className="mt-1 text-ink-2">{c.claimedDesc}</p>
        <p className="mt-4 text-4xl font-extrabold">
          +{formatSol(state.lamports / LAMPORTS_PER_SOL)} <span className="text-xl text-ink-3">SOL</span>
        </p>
        <a
          href={explorerTxUrl(state.signature)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-6 w-full"
        >
          <ExternalLink className="h-4 w-4" />
          {t.wish.viewExplorer}
        </a>
        <Link href="/create" className="btn-primary mt-2 w-full">
          {t.wish.createOwn}
        </Link>
      </div>
    );
  }

  const sol = formatSol(state.lamports / LAMPORTS_PER_SOL);

  return wrap(
    <>
      <div className="bg-sol-gradient px-6 pb-8 pt-8 text-center text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Gift className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold">{c.title}</h1>
        {state.from && <p className="mt-1 text-white/85">{fmt(c.from, { name: state.from })}</p>}
        <p className="mt-4 text-5xl font-extrabold tracking-tight">
          {sol} <span className="text-2xl text-white/75">SOL</span>
        </p>
      </div>

      <div className="space-y-5 p-6">
        {state.msg && (
          <blockquote className="whitespace-pre-line break-words rounded-2xl bg-canvas p-4 text-lg font-semibold leading-snug">
            “{state.msg}”
          </blockquote>
        )}

        <div>
          <p className="field-label">{c.claimTo}</p>
          <div role="tablist" className="grid grid-cols-2 rounded-xl bg-canvas p-1">
            {(
              [
                ['wallet', c.myWallet],
                ['address', c.otherAddress],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={target === key}
                onClick={() => setTarget(key)}
                className={`rounded-[10px] py-2 text-sm font-semibold transition ${
                  target === key ? 'bg-surface text-ink shadow-sm' : 'text-ink-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {target === 'address' && (
            <input
              className={`input mt-2 font-mono text-sm ${address && !isValidSolanaAddress(address) ? 'input-error' : ''}`}
              value={address}
              spellCheck={false}
              placeholder={c.addressPh}
              onChange={(e) => setAddress(e.target.value)}
            />
          )}
        </div>

        {target === 'wallet' && !connected ? (
          <button type="button" onClick={() => setVisible(true)} className="btn-primary w-full py-3.5 text-base">
            <Wallet className="h-5 w-5" />
            {t.wish.connect}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !destination}
            onClick={claim}
            className="btn-primary w-full py-3.5 text-base"
          >
            {busy ? <Spinner /> : <Gift className="h-5 w-5" />}
            {busy ? c.claiming : fmt(c.claim, { amount: sol })}
          </button>
        )}

        {!connected && (
          <div className="rounded-2xl border border-line p-4">
            <p className="font-semibold">{c.noWalletTitle}</p>
            <p className="mt-1 text-sm text-ink-2">{c.noWalletDesc}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href="https://phantom.com/download" target="_blank" rel="noopener noreferrer" className="btn-secondary flex-1 py-2 text-sm">
                {c.installPhantom}
              </a>
              {mobile && (
                <a href={phantomBrowseUrl(window.location.href)} className="btn-secondary flex-1 py-2 text-sm">
                  <Smartphone className="h-4 w-4" />
                  {t.wish.openPhantom}
                </a>
              )}
            </div>
          </div>
        )}
        <p className="text-center text-xs text-ink-3">{c.keepLink}</p>
      </div>
    </>
  );
}
