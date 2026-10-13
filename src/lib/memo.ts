import { APP_NAME } from './config';

/** Открытка к подарку из вишлиста. Формат v1 совместим с первой версией (поля to/date просто не пишем). */
export interface WishMemo {
  app: typeof APP_NAME;
  v?: number;
  type?: 'wish';
  wishId: string;
  from: string;
  msg: string;
}

/** Открытка к gift-ссылке. */
export interface LinkMemo {
  app: typeof APP_NAME;
  v: number;
  type: 'link';
  from: string;
  msg: string;
}

export type SolWishMemo = WishMemo | LinkMemo;

export function buildWishMemo(wishId: string, from: string, msg: string): string {
  const memo: WishMemo = { app: APP_NAME, v: 1, wishId, from, msg };
  return JSON.stringify(memo);
}

export function buildLinkMemo(from: string, msg: string): string {
  const memo: LinkMemo = { app: APP_NAME, v: 1, type: 'link', from, msg };
  return JSON.stringify(memo);
}

/**
 * RPC отдаёт memo в виде "[len] text" (несколько memo через "; ").
 * Возвращает первый распознанный JSON SolWish.
 */
export function parseSolWishMemo(raw: string | null | undefined): SolWishMemo | null {
  if (!raw) return null;
  const candidates = [raw, ...raw.split(/;\s(?=\[\d+\])/)];
  for (const part of candidates) {
    const text = part.replace(/^\[\d+\]\s*/, '').trim();
    const start = text.indexOf('{');
    if (start === -1) continue;
    try {
      const data = JSON.parse(text.slice(start));
      if (data && data.app === APP_NAME && typeof data === 'object') {
        return {
          ...data,
          from: typeof data.from === 'string' ? data.from : '',
          msg: typeof data.msg === 'string' ? data.msg : '',
        } as SolWishMemo;
      }
    } catch {
      // не наш memo
    }
  }
  return null;
}

export function isWishMemo(m: SolWishMemo | null): m is WishMemo {
  return !!m && m.type !== 'link' && typeof (m as WishMemo).wishId === 'string';
}
