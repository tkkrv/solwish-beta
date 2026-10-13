'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ArrowRight, CircleAlert, CircleCheck, Gift, ImagePlus, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { COVER_PRESETS, DEFAULT_COVER } from '@/lib/covers';
import { LIMITS } from '@/lib/config';
import { isValidSolanaAddress } from '@/lib/validation';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { celebrate } from '@/lib/client/confetti';
import { useToast } from '@/components/Toast';
import WishSummary from '@/components/wish/WishSummary';
import QrCode from '@/components/ui/QrCode';
import CopyButton from '@/components/ui/CopyButton';
import ShareRow from '@/components/ui/ShareRow';
import Spinner from '@/components/ui/Spinner';
import type { Wish } from '@/lib/types';

type FieldName = 'title' | 'creatorName' | 'amountSol' | 'recipientWallet' | 'iconUrl';

export default function CreateWishPage() {
  const { t } = useLanguage();
  const c = t.create;
  const toast = useToast();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();

  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string>(DEFAULT_COVER);
  const [customCover, setCustomCover] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [errors, setErrors] = useState<Set<FieldName>>(new Set());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Wish | null>(null);

  const recipientState = recipient.trim()
    ? isValidSolanaAddress(recipient)
      ? 'ok'
      : 'bad'
    : 'empty';
  const iconUrl = useCustom && customCover.trim() ? customCover.trim() : cover;
  const link = useMemo(
    () => (created && typeof window !== 'undefined' ? `${window.location.origin}/w/${created.id}` : ''),
    [created]
  );

  const validate = (): Set<FieldName> => {
    const bad = new Set<FieldName>();
    if (title.trim().length < 2) bad.add('title');
    if (!creatorName.trim()) bad.add('creatorName');
    const n = Number(amount);
    if (!Number.isFinite(n) || n < LIMITS.minGoalSol || n > LIMITS.maxGoalSol) bad.add('amountSol');
    if (recipientState !== 'ok') bad.add('recipientWallet');
    if (useCustom && customCover.trim() && !/^https:\/\/\S+$/i.test(customCover.trim())) bad.add('iconUrl');
    return bad;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bad = validate();
    setErrors(bad);
    if (bad.size) {
      toast(c.errRequired);
      return;
    }
    setLoading(true);
    try {
      const { wish } = await fetchJson<{ wish: Wish }>('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          creatorName: creatorName.trim(),
          amountSol: Number(amount),
          recipientWallet: recipient.trim(),
          description: description.trim(),
          iconUrl,
        }),
      });
      setCreated(wish);
      celebrate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setTitle('');
    setCreatorName('');
    setAmount('');
    setDescription('');
    setCustomCover('');
    setUseCustom(false);
    setCover(DEFAULT_COVER);
    setErrors(new Set());
  };

  const err = (f: FieldName) => (errors.has(f) ? 'input-error' : '');

  // ---------- Готово ----------
  if (created) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="card animate-fade-up p-6 text-center sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-mint">
            <CircleCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{c.readyTitle}</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-2">{c.readyDesc}</p>

          <div className="mt-6 flex justify-center">
            <QrCode value={link} size={200} label={c.qrHint} />
          </div>
          <p className="mt-2 text-xs text-ink-3">{c.qrHint}</p>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pl-3">
            <span className="flex-1 truncate text-left font-mono text-sm text-ink-2">{link}</span>
            <CopyButton value={link} className="btn-primary px-3 py-2 text-sm" />
          </div>
          <p className="mt-2 text-xs text-warn">{c.saveLinkHint}</p>

          <div className="mt-5">
            <ShareRow url={link} text={fmt(c.shareText, { title: created.title })} />
          </div>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href={`/w/${created.id}`} className="btn-secondary flex-1">
              {c.open}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button type="button" onClick={reset} className="btn-ghost flex-1">
              {c.createAnother}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Форма ----------
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_400px]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{c.title}</h1>
        <p className="mt-2 max-w-lg text-ink-2">{c.subtitle}</p>

        <form onSubmit={submit} noValidate className="card mt-8 space-y-5 p-5 sm:p-7">
          <div>
            <label htmlFor="title" className="field-label">
              {c.fTitle}
              <span className="text-xs font-medium text-ink-3">
                {title.length}/{LIMITS.titleMax}
              </span>
            </label>
            <input
              id="title"
              className={`input ${err('title')}`}
              value={title}
              maxLength={LIMITS.titleMax}
              placeholder={c.fTitlePh}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="creatorName" className="field-label">
                {c.fFor}
              </label>
              <input
                id="creatorName"
                className={`input ${err('creatorName')}`}
                value={creatorName}
                maxLength={LIMITS.nameMax}
                placeholder={c.fForPh}
                onChange={(e) => setCreatorName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="amount" className="field-label">
                {c.fGoal}
              </label>
              <div className="relative">
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={LIMITS.minGoalSol}
                  className={`input pr-14 font-mono ${err('amountSol')}`}
                  value={amount}
                  placeholder="1.5"
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
                  SOL
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-3">{c.fGoalHint}</p>
            </div>
          </div>

          <div>
            <div className="field-label">
              <label htmlFor="recipient">{c.fRecipient}</label>
              {publicKey ? (
                <button
                  type="button"
                  onClick={() => setRecipient(publicKey.toBase58())}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-strong"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {c.useMyWallet}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setVisible(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-strong"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  {c.connectToFill}
                </button>
              )}
            </div>
            <input
              id="recipient"
              className={`input font-mono text-sm ${recipientState === 'bad' || errors.has('recipientWallet') ? 'input-error' : ''}`}
              value={recipient}
              spellCheck={false}
              autoComplete="off"
              placeholder={c.fRecipientPh}
              onChange={(e) => setRecipient(e.target.value)}
            />
            {recipientState !== 'empty' && (
              <p
                className={`mt-1.5 flex items-center gap-1 text-xs font-semibold ${
                  recipientState === 'ok' ? 'text-mint' : 'text-danger'
                }`}
              >
                {recipientState === 'ok' ? (
                  <CircleCheck className="h-3.5 w-3.5" />
                ) : (
                  <CircleAlert className="h-3.5 w-3.5" />
                )}
                {recipientState === 'ok' ? c.addrOk : c.addrBad}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="story" className="field-label">
              <span>
                {c.fStory} <span className="font-normal text-ink-3">· {t.common.optional}</span>
              </span>
              <span className="text-xs font-medium text-ink-3">
                {description.length}/{LIMITS.descriptionMax}
              </span>
            </label>
            <textarea
              id="story"
              rows={3}
              className="input resize-none"
              value={description}
              maxLength={LIMITS.descriptionMax}
              placeholder={c.fStoryPh}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <fieldset>
            <legend className="field-label">{c.fCover}</legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
              {COVER_PRESETS.map((p) => {
                const active = !useCustom && cover === p.path;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-label={p.key}
                    aria-pressed={active}
                    onClick={() => {
                      setCover(p.path);
                      setUseCustom(false);
                    }}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      active ? 'border-brand ring-4 ring-brand-soft' : 'border-transparent hover:border-line-strong'
                    }`}
                  >
                    <img src={p.path} alt="" className="aspect-square w-full object-cover" />
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setUseCustom((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink"
            >
              <ImagePlus className="h-4 w-4" />
              {c.coverCustom}
            </button>
            {useCustom && (
              <div className="mt-2">
                <input
                  type="url"
                  className={`input ${err('iconUrl')}`}
                  value={customCover}
                  placeholder={c.coverCustomPh}
                  onChange={(e) => setCustomCover(e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-3">{c.coverCustomHint}</p>
              </div>
            )}
          </fieldset>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
            {loading ? <Spinner /> : <Gift className="h-5 w-5" />}
            {loading ? c.submitting : c.submit}
          </button>
        </form>
      </div>

      {/* Живое превью */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-3">{c.preview}</p>
        <WishSummary
          title={title.trim() || c.previewTitle}
          description={description.trim()}
          creatorName={creatorName.trim()}
          iconUrl={iconUrl}
          goal={Number(amount) > 0 ? Number(amount) : 1}
          raised={0}
          count={0}
        />
      </aside>
    </div>
  );
}
