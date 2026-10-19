import { APP_NAME } from './config';

/**
 * Открытка к подарку из вишлиста. Совместима с первой версией (to/date просто не пишем).
 * Короткие необязательные поля экономят байты Memo (а значит и compute):
 *   i — id желания из списка, f — сумма в валюте вишлиста на момент подарка, a — аноним.
 */
export interface WishMemo {
  app: typeof APP_NAME;
  v?: number;
  type?: 'wish';
  wishId: string;
  from: string;
  msg: string;
  i?: string;
  f?: number;
  a?: 1;
  /** Премиум-оформление (действует, только если в транзакции есть оплата в кошелёк SolWish). */
  s?: string;
}

/** Открытка к подарку-ссылке. */
export interface LinkMemo {
  app: typeof APP_NAME;
  v: number;
  type: 'link';
  from: string;
  msg: string;
}

/** Ответ «Спасибо» получателя на конкретный подарок (ref — подпись транзакции подарка). */
export interface ThanksMemo {
  app: typeof APP_NAME;
  v: number;
  type: 'thanks';
  ref: string;
  msg: string;
  from?: string;
}

export type SolWishMemo = WishMemo | LinkMemo | ThanksMemo;

export function buildWishMemo(
  wishId: string,
  from: string,
  msg: string,
  extra: { itemId?: string | null; fiat?: number | null; anonymous?: boolean; style?: string | null } = {}
): string {
  const memo: WishMemo = {
    app: APP_NAME,
    v: 1,
    wishId,
    from: extra.anonymous ? '' : from,
    msg,
  };
  if (extra.itemId) memo.i = extra.itemId;
  if (extra.fiat && Number.isFinite(extra.fiat)) memo.f = Math.round(extra.fiat * 100) / 100;
  if (extra.anonymous) memo.a = 1;
  if (extra.style) memo.s = extra.style;
  return JSON.stringify(memo);
}

export function buildLinkMemo(from: string, msg: string): string {
  const memo: LinkMemo = { app: APP_NAME, v: 1, type: 'link', from, msg };
  return JSON.stringify(memo);
}

export function buildThanksMemo(ref: string, msg: string): string {
  const memo: ThanksMemo = { app: APP_NAME, v: 1, type: 'thanks', ref, msg };
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
      if (data && typeof data === 'object' && data.app === APP_NAME) {
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
  return !!m && m.type !== 'link' && m.type !== 'thanks' && typeof (m as WishMemo).wishId === 'string';
}

export function isThanksMemo(m: SolWishMemo | null): m is ThanksMemo {
  return !!m && m.type === 'thanks' && typeof (m as ThanksMemo).ref === 'string';
}
