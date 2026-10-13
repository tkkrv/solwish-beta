'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Blink } from '@dialectlabs/blinks';
import { useBlinkSolanaWalletAdapter } from '@dialectlabs/blinks/hooks/solana';
import { BlinkInstance, setProxyUrl, unfurlUrlToBlinkApiUrl } from '@dialectlabs/blinks-core';
import { CircleAlert, ExternalLink, Zap } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fmt } from '@/i18n';
import { RPC_URL } from '@/lib/config';
import { useLocationHref } from '@/lib/client/hooks';
import Spinner from '@/components/ui/Spinner';

// Свой предпросмотр не зависит от серверов Dialect: запросы идут напрямую на наш домен,
// без proxy.dial.to (CORS на Action API у нас открыт).
setProxyUrl(null as unknown as string);

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; url: string }
  | { kind: 'ready'; url: string; blink: BlinkInstance }
  | { kind: 'error'; url: string };

export default function BlinkPreviewPage() {
  const { t } = useLanguage();
  const b = t.blinkPreview;
  const href = useLocationHref();
  const { adapter } = useBlinkSolanaWalletAdapter(RPC_URL);

  const origin = href ? new URL(href).origin : '';
  const fromQuery = href ? new URL(href).searchParams.get('url') || '' : '';
  const example = `${origin || 'https://solwish-beta.vercel.app'}/w/wish_…`;

  const [input, setInput] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });

  const value = input || fromQuery;
  const active = target ?? (fromQuery || null);

  // Та же цепочка, что у dial.to и X: ссылка → actions.json → Action API → карточка.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (alive) setState({ kind: 'loading', url: active });
        return unfurlUrlToBlinkApiUrl(new URL(active));
      })
      .then((apiUrl) => {
        if (!apiUrl) throw new Error('not_mapped');
        return BlinkInstance.fetch(apiUrl);
      })
      .then((blink) => alive && setState({ kind: 'ready', url: active, blink }))
      .catch((err) => {
        console.error('[blink-preview]', err);
        if (alive) setState({ kind: 'error', url: active });
      });
    return () => {
      alive = false;
    };
  }, [active]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    if (!next) return;
    setTarget(next);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('url', next);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // адресная строка не обязательна
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_420px]">
      <div>
        <span className="chip mb-4">
          <Zap className="h-3.5 w-3.5 text-brand" /> Solana Actions
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight">{b.title}</h1>
        <p className="mt-2 max-w-lg text-ink-2">{b.subtitle}</p>

        <form onSubmit={submit} className="card mt-8 p-5">
          <label htmlFor="blink-url" className="field-label">
            {b.urlLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="blink-url"
              type="url"
              className="input flex-1 font-mono text-sm"
              value={value}
              placeholder={example}
              spellCheck={false}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              {b.load}
            </button>
          </div>
        </form>

        <div className="card mt-6 p-5">
          <h2 className="font-bold">{b.steps}</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-ink-2">
            {[b.step1, b.step2, b.step3].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ink-3">{b.xNote}</p>
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        {state.kind === 'loading' && (
          <div className="card flex items-center justify-center gap-2 p-12 text-ink-3">
            <Spinner /> {b.loading}
          </div>
        )}
        {state.kind === 'error' && (
          <div className="card p-6 text-center">
            <CircleAlert className="mx-auto mb-3 h-7 w-7 text-warn" />
            <p className="text-sm text-ink-2">{fmt(b.error, { example })}</p>
          </div>
        )}
        {state.kind === 'ready' && (
          <div className="space-y-3">
            <Blink
              blink={state.blink}
              adapter={adapter}
              securityLevel="all"
              stylePreset="x-light"
              websiteUrl={state.url}
              websiteText={new URL(state.url).hostname}
            />
            <a href={state.url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
              <ExternalLink className="h-4 w-4" />
              {b.openWish}
            </a>
          </div>
        )}
        {state.kind === 'idle' && (
          <div className="card border-dashed p-10 text-center text-sm text-ink-3">{example}</div>
        )}
        <p className="mt-3 text-center text-xs text-ink-3">
          <Link href="/create" className="hover:text-ink">
            {t.nav.createWish}
          </Link>
        </p>
      </div>
    </div>
  );
}
