export const CURRENCIES = ['SOL', 'USD', 'KZT', 'RUB', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];
export type FiatCurrency = Exclude<Currency, 'SOL'>;

export interface WishItem {
  id: string;
  title: string;
  /** Цель в валюте вишлиста (goalCurrency). */
  goal: number;
}

export interface Wish {
  id: string;
  title: string;
  description: string;
  /** Цель в SOL. Для фиатных вишлистов — по курсу на момент создания (для Blink и совместимости). */
  amountSol: number;
  recipientWallet: string;
  /** Путь к пресету (/covers/*.jpg) или https-ссылка. */
  iconUrl: string;
  /** Для кого сбор (имя получателя). */
  creatorName: string;
  createdAt: string | null;
  /** Кошелёк создателя, подтверждённый подписью (может управлять вишлистом). */
  creatorWallet: string | null;
  /** YYYY-MM-DD */
  eventDate: string | null;
  goalCurrency: Currency;
  /** Цель в фиате (если goalCurrency ≠ SOL). */
  goalFiat: number | null;
  items: WishItem[];
  closed: boolean;
}

export interface Gift {
  signature: string;
  from: string;
  msg: string;
  amountSol: number;
  sender: string;
  blockTime: number | null;
  anonymous: boolean;
  /** id желания из списка (если подарок на конкретный пункт). */
  itemId: string | null;
  /** Сумма в валюте вишлиста на момент подарка (из memo), если записана. */
  fiat: number | null;
  /** Текст скрыт модерацией (грубые слова или ссылки). */
  hidden?: boolean;
  /** Премиум-оформление открытки (только если оплачено в той же транзакции). */
  style?: string | null;
}

export interface GiftsSummary {
  gifts: Gift[];
  totalSol: number;
  count: number;
}

export interface GreetingCard {
  signature: string;
  kind: 'wish' | 'link';
  wishId: string | null;
  from: string;
  msg: string;
  anonymous: boolean;
  amountSol: number;
  sender: string;
  recipient: string;
  blockTime: number | null;
  hidden?: boolean;
  style?: string | null;
}

export interface ThankYou {
  signature: string;
  msg: string;
  blockTime: number | null;
}

export interface SentGift {
  signature: string;
  wishId: string | null;
  kind: 'wish' | 'link';
  msg: string;
  amountSol: number;
  recipient: string;
  blockTime: number | null;
}
