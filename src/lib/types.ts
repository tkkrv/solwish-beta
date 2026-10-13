export interface Wish {
  id: string;
  title: string;
  description: string;
  amountSol: number;
  recipientWallet: string;
  /** Путь к пресету (/covers/*.png) или https-ссылка. */
  iconUrl: string;
  /** Для кого сбор (имя получателя). */
  creatorName: string;
  createdAt: string | null;
}

export interface Gift {
  signature: string;
  from: string;
  msg: string;
  amountSol: number;
  sender: string;
  blockTime: number | null;
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
  amountSol: number;
  sender: string;
  recipient: string;
  blockTime: number | null;
}
