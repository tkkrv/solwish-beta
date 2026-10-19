import { PublicKey } from '@solana/web3.js';

/**
 * Премиум-открытки: даритель доплачивает небольшую сумму в кошелёк SolWish в ТОЙ ЖЕ транзакции,
 * что и подарок. Оформление показывается, только если оплата есть в транзакции, поэтому
 * «премиум» нельзя подделать, просто дописав поле в memo.
 *
 * Включается переменной NEXT_PUBLIC_SOLWISH_TREASURY (адрес кошелька SolWish).
 */
export const PREMIUM_STYLES = ['aurora', 'confetti', 'gold'] as const;
export type PremiumStyle = (typeof PREMIUM_STYLES)[number];

export const PREMIUM_PRICE_SOL = Number(process.env.NEXT_PUBLIC_PREMIUM_CARD_SOL || '0.01');
export const PREMIUM_LAMPORTS = Math.round(PREMIUM_PRICE_SOL * 1_000_000_000);

function validTreasury(value: string): string {
  try {
    return value ? new PublicKey(value).toBase58() : '';
  } catch {
    return '';
  }
}

export const TREASURY = validTreasury(process.env.NEXT_PUBLIC_SOLWISH_TREASURY || '');
export const PREMIUM_ENABLED = Boolean(TREASURY) && PREMIUM_LAMPORTS > 0;

export function isPremiumStyle(value: unknown): value is PremiumStyle {
  return typeof value === 'string' && (PREMIUM_STYLES as readonly string[]).includes(value);
}

/** Классы Tailwind для оформления: рамка, фон карточки и образец в выборе стиля. */
export const STYLE_CLASSES: Record<PremiumStyle, { frame: string; inner: string; swatch: string; ring: string }> = {
  aurora: {
    frame:
      'bg-[linear-gradient(120deg,#9945FF,#14F195,#7C3AED,#FF7AC6,#9945FF)] bg-[length:300%_300%] motion-safe:animate-aurora p-[5px]',
    inner:
      'bg-surface bg-[radial-gradient(circle_at_15%_0%,#EFE6FF,transparent_55%),radial-gradient(circle_at_100%_100%,#DBFBEE,transparent_50%)]',
    swatch: 'bg-[linear-gradient(135deg,#9945FF,#14F195,#FF7AC6)]',
    ring: 'ring-2 ring-[#9945FF]/50',
  },
  confetti: {
    frame: 'bg-[linear-gradient(135deg,#FF7AC6,#F59E0B,#14F195,#7C3AED)] p-[5px]',
    inner:
      'bg-[#FFFBF3] bg-[radial-gradient(#F59E0B_2px,transparent_2.5px),radial-gradient(#7C3AED_2px,transparent_2.5px),radial-gradient(#14F195_2px,transparent_2.5px)] bg-[length:46px_46px,58px_58px,70px_70px] bg-[position:0_0,17px_23px,31px_9px]',
    swatch:
      'bg-[#FFFBF3] bg-[radial-gradient(#F59E0B_2px,transparent_2.5px),radial-gradient(#7C3AED_2px,transparent_2.5px)] bg-[length:12px_12px,16px_16px] bg-[position:0_0,6px_8px]',
    ring: 'ring-2 ring-[#F59E0B]/50',
  },
  gold: {
    frame: 'bg-[linear-gradient(135deg,#F7D774,#B8860B,#F7D774,#C9A227)] p-[5px]',
    inner: 'bg-[#FFFBEF] bg-[radial-gradient(circle_at_50%_0%,#FFF1C2,transparent_60%)]',
    swatch: 'bg-[linear-gradient(135deg,#F7D774,#B8860B)]',
    ring: 'ring-2 ring-[#C9A227]/60',
  },
};
