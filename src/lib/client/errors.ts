import { fmt, type Dictionary } from '@/i18n';
import { LIMITS } from '../config';

/** Переводит ошибки кошелька, RPC и нашего API в понятный текст. */
export function humanizeError(err: unknown, t: Dictionary): string {
  const e = err as { name?: string; message?: string; code?: string | number } | undefined;
  const name = e?.name || '';
  const msg = `${e?.message || ''} ${String(e?.code || '')}`.toLowerCase();

  if (
    name === 'WalletSignTransactionError' ||
    name === 'WalletSendTransactionError' ||
    name === 'WalletNotReadyError'
  ) {
    if (/reject|cancel|denied|declined|4001/.test(msg)) return t.errors.rejected;
  }
  if (/user rejected|rejected the request|declined|cancelled|canceled|4001/.test(msg)) {
    return t.errors.rejected;
  }
  if (/insufficient|no record of a prior credit|0x1\b|debit an account/.test(msg)) {
    return t.errors.insufficient;
  }
  if (/blockhash not found|block height exceeded|expired/.test(msg)) {
    return t.errors.expired;
  }
  if (/moderation|not allowed/.test(msg)) return t.errors.moderation;
  if (/rate_limited|429/.test(msg)) return t.errors.rateLimited;
  if (/db_not_configured/.test(msg)) return t.errors.dbNotConfigured;
  if (/memo_too_long|too long/.test(msg)) return t.errors.memoTooLong;
  if (/invalid_amount|amount must/.test(msg)) {
    return fmt(t.errors.invalidAmount, { min: LIMITS.minGiftSol, max: LIMITS.maxGiftSol });
  }
  if (/not_found|not found/.test(msg)) return t.errors.notFound;
  if (/wallet not connected|walletnotconnected/.test(msg + name.toLowerCase())) {
    return t.errors.walletNotConnected;
  }
  if (/computational budget exceeded|exceeded cus meter|compute units/.test(msg)) return t.errors.memoTooLong;
  if (/simulation failed|transaction failed|custom program error|network/.test(msg)) {
    return t.errors.network;
  }
  return t.errors.generic;
}

/** fetch → JSON; при ошибке бросает Error с кодом API в message. */
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && (data.error || data.message)) || `http_${res.status}`);
  }
  return data as T;
}
