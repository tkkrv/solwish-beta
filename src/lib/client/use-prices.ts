'use client';

import { useEffect, useState } from 'react';
import type { FiatCurrency } from '../types';

type Prices = Record<FiatCurrency, number>;
let cached: { at: number; prices: Prices } | null = null;
let inflight: Promise<Prices | null> | null = null;

function load(): Promise<Prices | null> {
  if (cached && Date.now() - cached.at < 60_000) return Promise.resolve(cached.prices);
  inflight ??= fetch('/api/price')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { prices?: Prices } | null) => {
      if (d?.prices) cached = { at: Date.now(), prices: d.prices };
      return d?.prices ?? cached?.prices ?? null;
    })
    .catch(() => cached?.prices ?? null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Курс SOL в фиате (общий кеш на вкладку, обновление раз в минуту). */
export function usePrices(enabled = true): Prices | null {
  const [prices, setPrices] = useState<Prices | null>(cached?.prices ?? null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = () => load().then((p) => alive && p && setPrices(p));
    tick();
    const timer = setInterval(tick, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [enabled]);
  return enabled ? prices : null;
}
