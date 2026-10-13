import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { LIMITS } from './config';
import { COVER_PRESETS } from './covers';

export function isValidSolanaAddress(value: string): boolean {
  try {
    const key = new PublicKey(value.trim());
    // Отсекаем PDA (адреса вне кривой): у них нет приватного ключа, подарок с них не забрать.
    return PublicKey.isOnCurve(key.toBytes());
  } catch {
    return false;
  }
}

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

const solanaAddress = z
  .string()
  .trim()
  .refine(isValidSolanaAddress, { message: 'invalid_address' });

const coverUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) =>
      COVER_PRESETS.some((c) => c.path === v) || /^https:\/\/[^\s]+$/i.test(v),
    { message: 'invalid_cover' }
  );

/** Тело запроса на создание вишлиста. */
export const createWishSchema = z.object({
  title: z.string().trim().min(2).max(LIMITS.titleMax),
  description: z.string().trim().max(LIMITS.descriptionMax).optional().default(''),
  amountSol: z.coerce
    .number()
    .finite()
    .min(LIMITS.minGoalSol)
    .max(LIMITS.maxGoalSol),
  recipientWallet: solanaAddress,
  iconUrl: coverUrl.optional(),
  creatorName: z.string().trim().min(1).max(LIMITS.nameMax),
});

export type CreateWishInput = z.infer<typeof createWishSchema>;

/** Параметры подарка (из формы или Blink-клиента). */
export const giftParamsSchema = z.object({
  amount: z.coerce.number().finite().min(LIMITS.minGiftSol).max(LIMITS.maxGiftSol),
  senderName: z.string().trim().max(LIMITS.nameMax).optional().default(''),
  message: z.string().trim().max(LIMITS.messageMax).optional().default(''),
});

export const wishIdSchema = z.string().regex(/^wish_[A-Za-z0-9_-]{5,32}$/);
