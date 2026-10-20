import { clusterApiUrl, PublicKey } from '@solana/web3.js';

/** Сеть, в которой работает beta. Меняется одной переменной окружения. */
export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as
  | 'devnet'
  | 'testnet'
  | 'mainnet-beta';

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK);

export const IS_DEVNET = NETWORK !== 'mainnet-beta';

export const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export const APP_NAME = 'SolWish';
export const TELEGRAM_BOT_URL = 'https://t.me/Sol_Wish_bot';
/** Почта для пользователей (страницы «Условия», «Конфиденциальность», «О проекте»). */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'support@solwish.com';
/** Почта основателя: партнёрства и инвесторы. */
export const FOUNDER_EMAIL = process.env.NEXT_PUBLIC_FOUNDER_EMAIL || 'founder@solwish.com';
export const FAUCET_URL = 'https://faucet.solana.com';

/** Лимиты, которые проверяются и в форме, и на сервере. */
export const LIMITS = {
  titleMax: 80,
  descriptionMax: 500,
  nameMax: 24,
  /**
   * SPL Memo дорогой по compute: ~300–400 CU на байт (проверено в LiteSVM: 399 байт ≈ 145k CU).
   * 140 символов кириллицы + имя 24 символа + служебные поля ≈ 450 байт ≈ 160k CU — с запасом
   * укладывается в лимит 300k, который мы ставим в своих транзакциях.
   */
  messageMax: 140,
  memoMaxBytes: 480,
  itemsMax: 8,
  itemTitleMax: 60,
  minGoalFiat: 1,
  maxGoalFiat: 1_000_000_000,
  minGiftSol: 0.001,
  maxGiftSol: 100,
  minGoalSol: 0.01,
  maxGoalSol: 10_000,
  /** Мин. сумма gift-ссылки: аккаунт должен быть rent-exempt (~0.00089 SOL). */
  minLinkSol: 0.002,
  maxLinkSol: 50,
} as const;

/** Лимит compute для наших транзакций с Memo (комиссия от него не растёт, priority fee = 0). */
export const GIFT_TX_COMPUTE_UNITS = 300_000;

/** Сколько лампортов оставляем на ссылке под комиссию за claim. */
export const CLAIM_FEE_LAMPORTS = 5_000;

export function explorerTxUrl(signature: string) {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function explorerAddressUrl(address: string) {
  const cluster = NETWORK === 'mainnet-beta' ? '' : `?cluster=${NETWORK}`;
  return `https://explorer.solana.com/address/${address}${cluster}`;
}

export function shortAddress(address: string, chars = 4) {
  if (!address) return '';
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

/** Абсолютный URL (нужен для Blink-иконок и OG-картинок). */
export function absoluteUrl(pathOrUrl: string, origin: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(pathOrUrl, origin).toString();
}
