'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ArrowRight, CircleAlert, CircleCheck, Download, Gift, ImagePlus, Plus, Trash2, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { COVER_PRESETS, DEFAULT_COVER } from '@/lib/covers';
import { LIMITS } from '@/lib/config';
import { goalLimits, isValidSolanaAddress } from '@/lib/validation';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { celebrate } from '@/lib/client/confetti';
import { signWalletAuth } from '@/lib/client/wallet-auth';
import { usePrices } from '@/lib/client/use-prices';
import { dateLocale } from '@/lib/client/format';
import { CURRENCY_SYMBOL, formatMoney, isFiat } from '@/lib/money';
import { CURRENCIES, type Currency, type Wish } from '@/lib/types';
import { useToast } from '@/components/Toast';
import WishSummary from '@/components/wish/WishSummary';
import QrCode from '@/components/ui/QrCode';
import CopyButton from '@/components/ui/CopyButton';
import ShareRow from '@/components/ui/ShareRow';
import Spinner from '@/components/ui/Spinner';

type FieldName = 'title' | 'creatorName' | 'goal' | 'recipientWallet' | 'iconUrl' | 'items';
interface DraftItem {
  key: number;
  title: string;
  goal: string;
}

/** Шаблоны: тексты — в словаре (create.tpl), здесь — обложка. */
const TEMPLATES = [
  { key: 'birthday', cover: '/covers/birthday.jpg' },
  { key: 'wedding', cover: '/covers/flowers.jpg' },
  { key: 'housewarming', cover: '/covers/gift.jpg' },
  { key: 'dream', cover: '/covers/travel.jpg' },
] as const;
type TemplateKey = (typeof TEMPLATES)[number]['key'];

const today = () => new Date().toISOString().slice(0, 10);

export default function CreateWishPage() {
  const { t, locale } = useLanguage();
  const c = t.create;
  const toast = useToast();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();

  const [title, setTitle] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [currency, setCurrency] = useState<Currency>('SOL');
  const [mode, setMode] = useState<'one' | 'many'>('one');
  const [goal, setGoal] = useState('');
  const [items, setItems] = useState<DraftItem[]>([
    { key: 1, title: '', goal: '' },
    { key: 2, title: '', goal: '' },
  ]);
  const [eventDate, setEventDate] = useState('');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [cover, setCover] = useState<string>(DEFAULT_COVER);
  const [customCover, setCustomCover] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [saveToMy, setSaveToMy] = useState(true);
  const [template, setTemplate] = useState<TemplateKey | null>(null);

  const [errors, setErrors] = useState<Set<FieldName>>(new Set());
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Wish | null>(null);

  const prices = usePrices(isFiat(currency));
  const price = isFiat(currency) ? (prices?.[currency] ?? null) : null;
  const money = (v: number) => formatMoney(v, currency, dateLocale(locale));

  const recipientState = recipient.trim() ? (isValidSolanaAddress(recipient) ? 'ok' : 'bad') : 'empty';
  const iconUrl = useCustom && customCover.trim() ? customCover.trim() : cover;
  const filledItems = items.filter((i) => i.title.trim() || i.goal);
  const total =
    mode === 'many'
      ? filledItems.reduce((s, i) => s + (Number(i.goal) > 0 ? Number(i.goal) : 0), 0)
      : Number(goal) > 0
        ? Number(goal)
        : 0;
  const link = useMemo(
    () => (created && typeof window !== 'undefined' ? `${window.location.origin}/w/${created.id}` : ''),
    [created]
  );

  /** Шаблон заполняет название, историю, обложку и (для списков) названия желаний. Суммы вводит человек. */
  const applyTemplate = (key: TemplateKey) => {
    const tpl = c.tpl[key];
    setTemplate(key);
    setTitle(tpl.title);
    setDescription(tpl.desc);
    setCover(TEMPLATES.find((x) => x.key === key)!.cover);
    setUseCustom(false);
    if (tpl.items.length) {
      setMode('many');
      setItems(tpl.items.map((title, i) => ({ key: Date.now() + i, title, goal: '' })));
    } else {
      setMode('one');
    }
    setErrors(new Set());
  };

  const validate = (): Set<FieldName> => {
    const bad = new Set<FieldName>();
    if (title.trim().length < 2) bad.add('title');
    if (!creatorName.trim()) bad.add('creatorName');
    const { min, max } = goalLimits(currency);
    if (mode === 'many') {
      if (!filledItems.length || filledItems.some((i) => !i.title.trim() || !(Number(i.goal) > 0))) bad.add('items');
    }
    if (!(total >= min && total <= max)) bad.add('goal');
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
      // Подпись создателя (бесплатно) — чтобы вишлист появился в «Моих вишлистах» и им можно было управлять.
      const auth =
        saveToMy && publicKey && signMessage
          ? await signWalletAuth({ action: 'create-wish', target: 'new', publicKey, signMessage })
          : undefined;
      const { wish } = await fetchJson<{ wish: Wish }>('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          creatorName: creatorName.trim(),
          goalCurrency: currency,
          goal: mode === 'one' ? Number(goal) : undefined,
          items:
            mode === 'many'
              ? filledItems.map((i) => ({ title: i.title.trim(), goal: Number(i.goal) }))
              : undefined,
          recipientWallet: recipient.trim(),
          description: description.trim(),
          eventDate: eventDate || null,
          iconUrl,
          auth,
        }),
      });
      setCreated(wish);
      celebrate();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const msg = (err as Error)?.message || '';
      toast(/price_unavailable/.test(msg) ? c.errPrice : humanizeError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setTitle('');
    setCreatorName('');
    setGoal('');
    setItems([
      { key: 1, title: '', goal: '' },
      { key: 2, title: '', goal: '' },
    ]);
    setEventDate('');
    setDescription('');
    setCustomCover('');
    setUseCustom(false);
    setCover(DEFAULT_COVER);
    setTemplate(null);
    setErrors(new Set());
  };

  const err = (f: FieldName) => (errors.has(f) ? 'input-error' : '');
  const unit = currency === 'SOL' ? 'SOL' : CURRENCY_SYMBOL[currency];

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
          <a
            href={`/w/${created.id}/poster?download=1`}
            download
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
          >
            <Download className="h-4 w-4" />
            {c.poster}
          </a>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-canvas p-1.5 pl-3">
            <span className="flex-1 truncate text-left font-mono text-sm text-ink-2">{link}</span>
            <CopyButton value={link} className="btn-primary px-3 py-2 text-sm" />
          </div>
          {!created.creatorWallet && <p className="mt-2 text-xs text-warn">{c.saveLinkHint}</p>}

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

        <div className="mt-6">
          <p className="mb-2 text-sm font-semibold text-ink-2">{c.tplTitle}</p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(({ key }) => (
              <button
                key={key}
                type="button"
                aria-pressed={template === key}
                onClick={() => applyTemplate(key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  template === key
                    ? 'border-brand bg-brand-soft text-brand'
                    : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                }`}
              >
                {c.tpl[key].label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} noValidate className="card mt-5 space-y-6 p-5 sm:p-7">
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
              <label htmlFor="eventDate" className="field-label">
                <span>
                  {c.fEventDate} <span className="font-normal text-ink-3">· {t.common.optional}</span>
                </span>
              </label>
              <input
                id="eventDate"
                type="date"
                min={today()}
                className="input"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
              <p className="mt-1 text-xs text-ink-3">{c.fEventDateHint}</p>
            </div>
          </div>

          {/* Цель: валюта, один подарок или список */}
          <fieldset className="space-y-3">
            <legend className="field-label">{c.fGoal}</legend>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label={c.fCurrency} className="flex rounded-xl border border-line bg-surface p-0.5">
                {CURRENCIES.map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    aria-pressed={currency === cur}
                    onClick={() => setCurrency(cur)}
                    className={`rounded-[10px] px-2.5 py-1.5 text-xs font-bold transition ${
                      currency === cur ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                    }`}
                  >
                    {cur === 'SOL' ? 'SOL' : `${CURRENCY_SYMBOL[cur]} ${cur}`}
                  </button>
                ))}
              </div>
              <div role="group" className="flex rounded-xl bg-canvas p-0.5">
                {(['one', 'many'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                      mode === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-2'
                    }`}
                  >
                    {m === 'one' ? c.modeOne : c.modeMany}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'one' ? (
              <div className="relative">
                <input
                  id="goal"
                  aria-label={c.fGoal}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={goalLimits(currency).min}
                  className={`input pr-16 font-mono ${err('goal')}`}
                  value={goal}
                  placeholder={currency === 'SOL' ? '1.5' : currency === 'KZT' ? '150000' : '300'}
                  onChange={(e) => setGoal(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-3">
                  {unit}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={it.key} className="flex gap-2">
                    <input
                      aria-label={`${c.fTitle} ${idx + 1}`}
                      className={`input flex-1 ${errors.has('items') && !it.title.trim() && it.goal ? 'input-error' : ''}`}
                      value={it.title}
                      maxLength={LIMITS.itemTitleMax}
                      placeholder={c.itemTitlePh}
                      onChange={(e) =>
                        setItems((list) => list.map((x) => (x.key === it.key ? { ...x, title: e.target.value } : x)))
                      }
                    />
                    <div className="relative w-36 shrink-0">
                      <input
                        aria-label={c.itemGoal}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        className={`input pr-10 font-mono ${errors.has('items') && it.title.trim() && !(Number(it.goal) > 0) ? 'input-error' : ''}`}
                        value={it.goal}
                        placeholder={c.itemGoal}
                        onChange={(e) =>
                          setItems((list) => list.map((x) => (x.key === it.key ? { ...x, goal: e.target.value } : x)))
                        }
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-3">
                        {unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={c.removeItem}
                      disabled={items.length <= 1}
                      onClick={() => setItems((list) => list.filter((x) => x.key !== it.key))}
                      className="btn-ghost px-2.5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {items.length < LIMITS.itemsMax && (
                  <button
                    type="button"
                    onClick={() => setItems((list) => [...list, { key: Date.now(), title: '', goal: '' }])}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-strong"
                  >
                    <Plus className="h-4 w-4" />
                    {c.addItem}
                  </button>
                )}
                {total > 0 && <p className="text-sm font-semibold">{fmt(c.total, { total: money(total) })}</p>}
              </div>
            )}
            <p className="text-xs text-ink-3">
              {isFiat(currency) && price && total > 0
                ? `${fmt(c.fiatHint, { sol: (total / price).toFixed(3) })} · ${c.rateDemo}`
                : c.fGoalHint}
            </p>
          </fieldset>

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
                {recipientState === 'ok' ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
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

          {publicKey && signMessage && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas p-3">
              <input
                type="checkbox"
                checked={saveToMy}
                onChange={(e) => setSaveToMy(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>
                <span className="block text-sm font-semibold">{c.saveToMy}</span>
                <span className="block text-xs text-ink-3">{c.saveToMyHint}</span>
              </span>
            </label>
          )}

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
          currency={currency}
          goal={total > 0 ? total : currency === 'SOL' ? 1 : 100}
          progress={null}
          items={
            mode === 'many'
              ? filledItems
                  .filter((i) => i.title.trim())
                  .map((i, idx) => ({ id: `i${idx + 1}`, title: i.title.trim(), goal: Number(i.goal) || 0 }))
              : []
          }
          eventDate={eventDate || null}
          solPrice={price}
        />
      </aside>
    </div>
  );
}
