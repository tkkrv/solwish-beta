import type { Currency, FiatCurrency, Wish } from './types';
import { formatSol } from './amounts';

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  SOL: 'SOL',
  USD: '$',
  KZT: '₸',
  RUB: '₽',
  EUR: '€',
};

export function isFiat(c: Currency): c is FiatCurrency {
  return c !== 'SOL';
}

/** 150000 KZT → «150 000 ₸», 12.5 USD → «$12.50». */
export function formatMoney(value: number, currency: Currency, locale = 'ru-RU'): string {
  if (currency === 'SOL') return `${formatSol(value)} SOL`;
  const digits = currency === 'KZT' || currency === 'RUB' ? 0 : value < 100 ? 2 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${Math.round(value)} ${CURRENCY_SYMBOL[currency]}`;
  }
}

/** Красивое округление фиатной суммы для кнопок: шаг — половина старшего разряда (37 500 → 40 000, 15 000 → 15 000). */
export function roundFiat(value: number): number {
  if (value <= 0) return 0;
  if (value < 10) return Math.round(value * 10) / 10;
  const step = Math.pow(10, Math.floor(Math.log10(value))) / 2;
  return Math.max(step, Math.round(value / step) * step);
}

export function fiatToSol(fiat: number, price: number): number {
  return price > 0 ? Number((fiat / price).toFixed(6)) : 0;
}

export function solToFiat(sol: number, price: number): number {
  return Math.round(sol * price * 100) / 100;
}

/** Цель вишлиста в его валюте. */
export function wishGoal(wish: Pick<Wish, 'goalCurrency' | 'goalFiat' | 'amountSol'>): number {
  return wish.goalCurrency === 'SOL' ? wish.amountSol : wish.goalFiat ?? 0;
}
