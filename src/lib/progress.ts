import type { Gift, Wish } from './types';
import { wishGoal } from './money';

export interface Progress {
  /** Собрано в валюте вишлиста. */
  raised: number;
  raisedSol: number;
  goal: number;
  count: number;
  /** Собрано по каждому желанию (в валюте вишлиста). */
  perItem: Record<string, number>;
}

/**
 * Сумма подарка в валюте вишлиста:
 * SOL — как есть; фиат — значение из memo на момент подарка, иначе по текущему курсу,
 * иначе по курсу на момент создания вишлиста (goalFiat / amountSol).
 */
export function giftValue(gift: Gift, wish: Wish, price: number | null): number {
  if (wish.goalCurrency === 'SOL') return gift.amountSol;
  if (gift.fiat != null && gift.fiat > 0) return gift.fiat;
  const rate = price ?? (wish.goalFiat && wish.amountSol ? wish.goalFiat / wish.amountSol : 0);
  return gift.amountSol * rate;
}

export function computeProgress(wish: Wish, gifts: Gift[], price: number | null): Progress {
  const perItem: Record<string, number> = {};
  let raised = 0;
  let raisedSol = 0;
  for (const g of gifts) {
    const v = giftValue(g, wish, price);
    raised += v;
    raisedSol += g.amountSol;
    if (g.itemId && wish.items.some((i) => i.id === g.itemId)) {
      perItem[g.itemId] = (perItem[g.itemId] || 0) + v;
    }
  }
  return { raised, raisedSol, goal: wishGoal(wish), count: gifts.length, perItem };
}

/** Дней до события (0 = сегодня, отрицательное = прошло). */
export function daysUntil(eventDate: string | null, now = new Date()): number | null {
  if (!eventDate) return null;
  const target = Date.parse(`${eventDate}T00:00:00`);
  if (Number.isNaN(target)) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}
