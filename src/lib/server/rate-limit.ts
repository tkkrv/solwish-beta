import 'server-only';

/**
 * Простой лимит запросов в памяти процесса (скользящее окно).
 * На Vercel у каждого инстанса своя память, поэтому это защита «от дурака».
 * Для продакшена замените на Upstash Redis / Vercel KV.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return false;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5_000) hits.clear();
  return true;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}
