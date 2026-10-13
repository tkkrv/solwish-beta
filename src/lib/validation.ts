import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';
import { LIMITS } from './config';
import { COVER_PRESETS } from './covers';
import { CURRENCIES } from './types';

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

export const solanaAddress = z
  .string()
  .trim()
  .refine(isValidSolanaAddress, { message: 'invalid_address' });

const coverUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => COVER_PRESETS.some((c) => c.path === v) || /^https:\/\/[^\s]+$/i.test(v), {
    message: 'invalid_cover',
  });

/** Дата события: YYYY-MM-DD, не раньше вчера и не позже чем через 2 года. */
const eventDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    if (Number.isNaN(t)) return false;
    const day = 86_400_000;
    return t >= Date.now() - 2 * day && t <= Date.now() + 731 * day;
  }, 'invalid_date');

/** Подпись кошельком (см. lib/auth-message.ts). */
export const walletAuthSchema = z.object({
  wallet: solanaAddress,
  message: z.string().max(600),
  signature: z.string().max(200),
});
export type WalletAuth = z.infer<typeof walletAuthSchema>;

const itemSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.itemTitleMax),
  goal: z.coerce.number().finite().positive(),
});

export function goalLimits(currency: string) {
  return currency === 'SOL'
    ? { min: LIMITS.minGoalSol, max: LIMITS.maxGoalSol }
    : { min: LIMITS.minGoalFiat, max: LIMITS.maxGoalFiat };
}

/** Тело запроса на создание вишлиста. */
export const createWishSchema = z
  .object({
    title: z.string().trim().min(2).max(LIMITS.titleMax),
    description: z.string().trim().max(LIMITS.descriptionMax).optional().default(''),
    goalCurrency: z.enum(CURRENCIES).default('SOL'),
    /** Цель в валюте goalCurrency. При наличии items игнорируется (цель = сумма пунктов). */
    goal: z.coerce.number().finite().positive().optional(),
    items: z.array(itemSchema).max(LIMITS.itemsMax).optional(),
    recipientWallet: solanaAddress,
    iconUrl: coverUrl.optional(),
    creatorName: z.string().trim().min(1).max(LIMITS.nameMax),
    eventDate: eventDate.optional().nullable(),
    /** Необязательно: подтверждение, что создатель владеет кошельком (для «Моих вишлистов»). */
    auth: walletAuthSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const total = v.items?.length ? v.items.reduce((s, i) => s + i.goal, 0) : v.goal;
    const { min, max } = goalLimits(v.goalCurrency);
    if (!total || total < min || total > max) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['goal'], message: 'invalid_goal' });
    }
  });

export type CreateWishInput = z.infer<typeof createWishSchema>;

/** Изменение вишлиста владельцем. */
export const updateWishSchema = z.object({
  title: z.string().trim().min(2).max(LIMITS.titleMax).optional(),
  description: z.string().trim().max(LIMITS.descriptionMax).optional(),
  creatorName: z.string().trim().min(1).max(LIMITS.nameMax).optional(),
  iconUrl: coverUrl.optional(),
  eventDate: eventDate.nullable().optional(),
  closed: z.boolean().optional(),
});
export type UpdateWishInput = z.infer<typeof updateWishSchema>;

/** Параметры подарка (из формы или Blink-клиента). */
export const giftParamsSchema = z.object({
  amount: z.coerce.number().finite().min(LIMITS.minGiftSol).max(LIMITS.maxGiftSol),
  senderName: z.string().trim().max(LIMITS.nameMax).optional().default(''),
  message: z.string().trim().max(LIMITS.messageMax).optional().default(''),
  item: z
    .string()
    .regex(/^i\d{1,2}$/)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  anon: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

export const wishIdSchema = z.string().regex(/^wish_[A-Za-z0-9_-]{5,32}$/);
