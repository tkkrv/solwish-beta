import 'server-only';
import type { FiatCurrency } from '../types';

export type SolPrices = Record<FiatCurrency, number>;

let cache: { at: number; prices: SolPrices } | null = null;
const TTL_MS = 120_000;

/**
 * Курс SOL в фиате (CoinGecko, без ключа). Кеш 2 минуты, при ошибке — последний известный курс.
 * На devnet это курс настоящего SOL: используем его как «демо-курс».
 */
export async function getSolPrices(): Promise<SolPrices | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.prices;
  try {
    const res = await fetch(
      process.env.PRICE_FEED_URL ||
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,kzt,rub,eur',
      { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4000), cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = (await res.json()) as { solana?: Record<string, number> };
    const s = data.solana;
    if (!s?.usd || !s?.kzt || !s?.rub || !s?.eur) throw new Error('coingecko: bad payload');
    cache = { at: Date.now(), prices: { USD: s.usd, KZT: s.kzt, RUB: s.rub, EUR: s.eur } };
    return cache.prices;
  } catch (err) {
    console.error('[price]', err);
    return cache?.prices ?? null;
  }
}
