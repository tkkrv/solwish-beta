'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BellRing, Send } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { signWalletAuth } from '@/lib/client/wallet-auth';
import { useToast } from '@/components/Toast';
import Spinner from '@/components/ui/Spinner';

/** Подключение уведомлений в Telegram: подпись кошельком → одноразовая ссылка на бота. */
export default function TelegramCard({ wallet }: { wallet: string }) {
  const { t } = useLanguage();
  const m = t.my;
  const toast = useToast();
  const { publicKey, signMessage } = useWallet();
  const [status, setStatus] = useState<{ enabled: boolean; linked: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/telegram/link?wallet=${wallet}`)
      .then((r) => r.json())
      .then((d) => alive && setStatus({ enabled: !!d.enabled, linked: !!d.linked }))
      .catch(() => alive && setStatus({ enabled: false, linked: false }));
    return () => {
      alive = false;
    };
  }, [wallet, tick]);

  // Пока пользователь в боте — проверяем, привязался ли чат.
  useEffect(() => {
    if (!botUrl || status?.linked) return;
    const timer = setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(timer);
  }, [botUrl, status?.linked]);

  const run = async (action: 'link' | 'unlink') => {
    if (!publicKey || !signMessage) return;
    setBusy(true);
    try {
      const auth = await signWalletAuth({ action: 'link-telegram', target: action, publicKey, signMessage });
      const res = await fetchJson<{ url?: string }>('/api/telegram/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, action }),
      });
      if (action === 'link' && res.url) {
        setBotUrl(res.url);
        window.open(res.url, '_blank', 'noopener,noreferrer');
      } else {
        setBotUrl(null);
        setTick((n) => n + 1);
      }
    } catch (err) {
      toast(humanizeError(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#229ED9]/10 text-[#229ED9]">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">{m.tgTitle}</h2>
          <p className="mt-0.5 text-sm text-ink-2">{m.tgDesc}</p>
        </div>
      </div>
      <div className="mt-4">
        {!status ? (
          <Spinner />
        ) : !status.enabled ? (
          <p className="text-sm text-ink-3">{m.tgDisabled}</p>
        ) : status.linked ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-mint">✓ {m.tgConnected}</span>
            <button type="button" disabled={busy} onClick={() => run('unlink')} className="btn-ghost px-3 py-1.5 text-sm">
              {m.tgDisconnect}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !signMessage}
              onClick={() => run('link')}
              className="btn-secondary w-full"
            >
              {busy ? <Spinner /> : <Send className="h-4 w-4" />}
              {m.tgConnect}
            </button>
            {botUrl && (
              <p className="mt-2 text-xs text-ink-3">
                <a href={botUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand">
                  t.me
                </a>{' '}
                · {m.tgOpenBot}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
