import 'server-only';
import type { FiatCurrency } from '../types';

export type SolPrices = Record<FiatCurrency, number>;

let cache: { at: number; prices: SolPrices } | null = null;
const TTL_MS = 120_000;
/** Если все источники недоступны, ещё столько времени отдаём последний известный курс. */
const STALE_MS = 6 * 3_600_000;

const valid = (p: Partial<SolPrices>): p is SolPrices =>
  (['USD', 'KZT', 'RUB', 'EUR'] as const).every((c) => typeof p[c] === 'number' && p[c]! > 0);

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

/** CoinGecko (без ключа или с бесплатным demo-ключом COINGECKO_API_KEY). */
async function fromCoinGecko(): Promise<SolPrices> {
  const key = process.env.COINGECKO_API_KEY;
  const data = (await getJson(
    process.env.PRICE_FEED_URL ||
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd,kzt,rub,eur',
    key ? { 'x-cg-demo-api-key': key } : {}
  )) as { solana?: Record<string, number> };
  const s = data.solana || {};
  const p = { USD: s.usd, KZT: s.kzt, RUB: s.rub, EUR: s.eur };
  if (!valid(p)) throw new Error('coingecko: bad payload');
  return p;
}

/** Coinbase: публичный курс без ключа, все нужные валюты в одном ответе. */
async function fromCoinbase(): Promise<SolPrices> {
  const data = (await getJson('https://api.coinbase.com/v2/exchange-rates?currency=SOL')) as {
    data?: { rates?: Record<string, string> };
  };
  const r = data.data?.rates || {};
  const p = { USD: Number(r.USD), KZT: Number(r.KZT), RUB: Number(r.RUB), EUR: Number(r.EUR) };
  if (!valid(p)) throw new Error('coinbase: bad payload');
  return p;
}

/**
 * Курс SOL в фиате. Кеш 2 минуты; источники по очереди: CoinGecko, затем Coinbase
 * (CoinGecko без ключа часто отвечает 429 на общих IP хостингов вроде Vercel).
 * Если оба недоступны — последний известный курс не старше 6 часов.
 * На devnet это курс настоящего SOL: используем его как «демо-курс».
 */
export async function getSolPrices(): Promise<SolPrices | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.prices;
  const sources = process.env.PRICE_FEED_URL ? [fromCoinGecko] : [fromCoinGecko, fromCoinbase];
  for (const source of sources) {
    try {
      const prices = await source();
      cache = { at: Date.now(), prices };
      return prices;
    } catch (err) {
      console.error('[price]', (err as Error).message);
    }
  }
  return cache && Date.now() - cache.at < STALE_MS ? cache.prices : null;
}
