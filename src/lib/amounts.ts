import { LIMITS } from './config';

/** Красиво округляет сумму SOL для кнопок: 0.0123 → 0.012, 1.234 → 1.2 */
export function roundNice(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)) - 1);
  return Number((Math.round(value / magnitude) * magnitude).toPrecision(2));
}

export function formatSol(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value === 0) return '0';
  if (value < 0.001) return value.toFixed(6).replace(/0+$/, '');
  return Number(value.toFixed(4)).toString();
}

/** Подсказки сумм от цели: 10%, 25%, 50% и «закрыть остаток». */
export function suggestedAmounts(goal: number, remaining: number): number[] {
  const set = new Set<number>();
  for (const share of [0.1, 0.25, 0.5]) {
    const v = roundNice(goal * share);
    if (v >= LIMITS.minGiftSol && v <= LIMITS.maxGiftSol) set.add(v);
  }
  const rest = Number(remaining.toFixed(4));
  if (rest >= LIMITS.minGiftSol && rest <= LIMITS.maxGiftSol) set.add(rest);
  if (set.size === 0) set.add(0.01);
  return [...set].sort((a, b) => a - b);
}
