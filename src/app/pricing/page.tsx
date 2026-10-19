'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Briefcase, Check, CircleCheck, Clock, Gift, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { formatSol } from '@/lib/amounts';
import { PREMIUM_ENABLED, PREMIUM_PRICE_SOL, PREMIUM_STYLES, STYLE_CLASSES } from '@/lib/premium';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { useToast } from '@/components/Toast';
import Spinner from '@/components/ui/Spinner';

const KINDS = ['corporate', 'event', 'brand', 'other'] as const;
type Kind = (typeof KINDS)[number];

function Plan({
  icon: Icon,
  title,
  price,
  items,
  badge,
  accent = false,
  children,
}: {
  icon: typeof Gift;
  title: string;
  price: string;
  items: string[];
  badge?: string;
  accent?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`card flex flex-col p-6 ${accent ? 'ring-2 ring-brand/40' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="h-5 w-5" />
        </div>
        {badge && <span className="chip border-mint/30 bg-mint-soft text-mint">{badge}</span>}
      </div>
      <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
      <p className="mt-1 text-lg font-bold text-brand">{price}</p>
      <ul className="mt-4 flex-1 space-y-2.5 text-sm text-ink-2">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
            {it}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

export default function PricingPage() {
  const { t, locale } = useLanguage();
  const p = t.pricing;
  const toast = useToast();
  const [form, setForm] = useState({ name: '', company: '', contact: '', kind: 'corporate' as Kind, message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const price = formatSol(PREMIUM_PRICE_SOL);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.contact.trim().length < 3) {
      toast(t.create.errRequired);
      return;
    }
    setBusy(true);
    try {
      await fetchJson('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locale }),
      });
      setSent(true);
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{p.title}</h1>
        <p className="mt-3 text-lg text-ink-2">{p.subtitle}</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <Plan icon={Gift} title={p.freeTitle} price={p.freePrice} items={p.freeItems}>
          <Link href="/create" className="btn-secondary mt-6">
            {t.nav.createWish}
          </Link>
        </Plan>
        <Plan
          icon={Sparkles}
          title={p.premiumTitle}
          price={fmt(p.premiumPrice, { price })}
          items={p.premiumItems}
          badge={PREMIUM_ENABLED ? p.premiumNow : undefined}
          accent
        >
          <div className="mt-6 grid grid-cols-3 gap-2">
            {PREMIUM_STYLES.map((st) => (
              <div key={st} className="text-center text-xs font-semibold text-ink-2">
                <div className={`mb-1 h-12 rounded-xl ${STYLE_CLASSES[st].swatch}`} />
                {t.wish.premiumNames[st]}
              </div>
            ))}
          </div>
        </Plan>
        <Plan icon={Briefcase} title={p.bizTitle} price={p.bizPrice} items={p.bizItems}>
          <a href="#business" className="btn-primary mt-6">
            {p.bizCta}
          </a>
        </Plan>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[1fr_2fr]">
        <div className="card p-6">
          <p className="flex items-center gap-2 font-bold">
            <Clock className="h-4 w-4 text-brand" />
            {p.soonTitle}
          </p>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            {p.soonItems.map((it) => (
              <li key={it}>· {it}</li>
            ))}
          </ul>
        </div>
        <p className="card flex items-center p-6 text-sm text-ink-2">{p.note}</p>
      </div>

      <section id="business" className="mt-14 scroll-mt-24">
        <div className="card mx-auto max-w-2xl p-6 sm:p-8">
          {sent ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint-soft text-mint">
                <CircleCheck className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-extrabold">{p.sentTitle}</h2>
              <p className="mt-2 text-ink-2">{p.sentDesc}</p>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight">{p.formTitle}</h2>
                <p className="mt-1 text-ink-2">{p.formDesc}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="lead-name" className="field-label">
                    {p.fName}
                  </label>
                  <input
                    id="lead-name"
                    className="input"
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="lead-company" className="field-label">
                    {p.fCompany}
                  </label>
                  <input
                    id="lead-company"
                    className="input"
                    maxLength={120}
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lead-contact" className="field-label">
                  {p.fContact}
                </label>
                <input
                  id="lead-contact"
                  className="input"
                  maxLength={120}
                  placeholder={p.fContactPh}
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                />
              </div>
              <fieldset>
                <legend className="field-label">{p.fType}</legend>
                <div className="flex flex-wrap gap-2">
                  {KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={form.kind === k}
                      onClick={() => setForm((f) => ({ ...f, kind: k }))}
                      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                        form.kind === k ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2'
                      }`}
                    >
                      {p.types[k]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div>
                <label htmlFor="lead-msg" className="field-label">
                  {p.fMessage}
                </label>
                <textarea
                  id="lead-msg"
                  rows={4}
                  maxLength={1000}
                  className="input resize-none"
                  placeholder={p.fMessagePh}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                />
              </div>
              {/* Ловушка для ботов: скрыта от людей */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              />
              <button type="submit" disabled={busy} className="btn-primary w-full py-3.5">
                {busy ? <Spinner /> : <Briefcase className="h-5 w-5" />}
                {p.submit}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
