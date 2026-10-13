import 'server-only';
import {
  type ActionGetResponse,
  type ActionPostRequest,
  BLOCKCHAIN_IDS,
  createActionHeaders,
  createPostResponse,
} from '@solana/actions';
import { PublicKey } from '@solana/web3.js';
import { LIMITS, NETWORK, absoluteUrl } from '../config';
import { giftParamsSchema } from '../validation';
import { getWish } from './wishes';
import { getWishGifts } from './chain';
import { getSolPrices } from './price';
import { buildGiftTransaction, GiftInputError } from './gift-tx';
import { DatabaseNotConfiguredError } from './supabase';
import { formatSol, suggestedAmounts } from '../amounts';
import { computeProgress } from '../progress';
import { fiatToSol, formatMoney, isFiat, roundFiat, solToFiat } from '../money';
import type { Wish } from '../types';

export const ACTION_HEADERS = createActionHeaders({
  chainId: NETWORK === 'mainnet-beta' ? BLOCKCHAIN_IDS.mainnet : BLOCKCHAIN_IDS.devnet,
  actionVersion: '2.4',
});

function actionError(message: string, status: number) {
  return Response.json({ message }, { status, headers: ACTION_HEADERS });
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);
}

/** Тенге и рубли привычнее видеть как «15 000 ₸», доллары и евро — как «$15». */
function blinkLocale(wish: Wish) {
  return wish.goalCurrency === 'KZT' || wish.goalCurrency === 'RUB' ? 'ru-RU' : 'en-US';
}

async function priceFor(wish: Wish): Promise<number | null> {
  if (!isFiat(wish.goalCurrency)) return null;
  const prices = await withTimeout(getSolPrices(), 2500);
  return prices?.[wish.goalCurrency] ?? null;
}

/** Быстрые суммы: для фиатных вишлистов — круглые суммы в валюте, переведённые в SOL по курсу. */
function presetButtons(wish: Wish, remaining: number, price: number | null) {
  if (isFiat(wish.goalCurrency) && price) {
    const goal = wish.goalFiat ?? 0;
    const fiat = [...new Set([0.1, 0.25, 0.5].map((s) => roundFiat(goal * s)))].filter(
      (v) => v > 0 && fiatToSol(v, price) >= LIMITS.minGiftSol && fiatToSol(v, price) <= LIMITS.maxGiftSol
    );
    return fiat.slice(0, 3).map((v) => ({
      sol: fiatToSol(v, price),
      label: `${formatMoney(v, wish.goalCurrency, blinkLocale(wish))} (${formatSol(fiatToSol(v, price))} SOL)`,
    }));
  }
  return suggestedAmounts(wish.amountSol, remaining)
    .slice(0, 3)
    .map((sol) => ({ sol, label: `${formatSol(sol)} SOL` }));
}

export async function handleActionGet(req: Request, wishId: string | null) {
  const url = new URL(req.url);
  if (!wishId) return actionError('Wishlist id is missing', 400);

  try {
    const wish = await getWish(wishId);
    if (!wish) return actionError('Wishlist not found', 404);

    const [summary, price] = await Promise.all([withTimeout(getWishGifts(wish), 2500), priceFor(wish)]);
    const progress = summary ? computeProgress(wish, summary.gifts, price) : null;
    const money = (v: number) => formatMoney(v, wish.goalCurrency, blinkLocale(wish));
    const progressText = !progress
      ? ` · Goal: ${money(wish.goalCurrency === 'SOL' ? wish.amountSol : wish.goalFiat ?? 0)}.`
      : progress.count === 0
        ? ` · Goal: ${money(progress.goal)}. Be the first to gift!`
        : ` · Raised ${money(progress.raised)} of ${money(progress.goal)} from ${progress.count} ${progress.count === 1 ? 'friend' : 'friends'}.`;

    const base = `${url.origin}/api/actions/gift/${wish.id}`;
    const forWhom = wish.creatorName ? `For ${wish.creatorName}. ` : '';
    const remainingSol = summary ? Math.max(wish.amountSol - summary.totalSol, 0) : wish.amountSol;
    const presets = presetButtons(wish, remainingSol, price);
    const card = presets[Math.min(1, presets.length - 1)];

    const payload: ActionGetResponse = {
      type: 'action',
      icon: absoluteUrl(wish.iconUrl, url.origin),
      title: wish.title,
      description: `${forWhom}${wish.description || 'Send a gift with an on-chain greeting card.'}${progressText}`.slice(0, 600),
      label: wish.closed ? 'Wishlist is closed' : 'Send gift',
      disabled: wish.closed,
      links: wish.closed
        ? undefined
        : {
            // Blink-клиенты (Dialect, X) прячут кнопки, если есть форма из 2+ полей.
            // Поэтому только одиночные поля: быстрые суммы + открытка + своя сумма.
            actions: [
              ...presets.map((p) => ({
                type: 'transaction' as const,
                label: p.label,
                href: `${base}?amount=${p.sol}`,
              })),
              ...(card
                ? [
                    {
                      type: 'transaction' as const,
                      label: `Gift ${card.label.replace(/ \(.*\)$/, '')} with card`,
                      href: `${base}?amount=${card.sol}&message={message}`,
                      parameters: [
                        {
                          type: 'text' as const,
                          name: 'message',
                          label: `Greeting card, public (up to ${LIMITS.messageMax} chars)`,
                          required: true,
                        },
                      ],
                    },
                  ]
                : []),
              {
                type: 'transaction',
                label: 'Gift',
                href: `${base}?amount={amount}`,
                parameters: [
                  {
                    type: 'number',
                    name: 'amount',
                    label: 'Custom amount (SOL)',
                    required: true,
                    min: LIMITS.minGiftSol,
                    max: LIMITS.maxGiftSol,
                  },
                ],
              },
            ],
          },
    };
    return Response.json(payload, { headers: ACTION_HEADERS });
  } catch (err) {
    if (err instanceof DatabaseNotConfiguredError) {
      return actionError('Database is not configured', 503);
    }
    console.error('[action GET]', err);
    return actionError('Server error', 500);
  }
}

/** Значение параметра: сначала из URL (шаблоны href), потом из body.data. Незаполненный шаблон = пусто. */
function param(url: URL, body: ActionPostRequest, name: string): string {
  const fromUrl = url.searchParams.get(name);
  const fromBody = body.data?.[name as never];
  const value = fromUrl ?? (Array.isArray(fromBody) ? fromBody[0] : fromBody) ?? '';
  return /^\{.+\}$/.test(String(value)) ? '' : String(value);
}

export async function handleActionPost(req: Request, wishId: string | null) {
  const url = new URL(req.url);
  if (!wishId) return actionError('Wishlist id is missing', 400);

  let body: ActionPostRequest;
  try {
    body = (await req.json()) as ActionPostRequest;
  } catch {
    return actionError('Invalid request body', 400);
  }

  let sender: PublicKey;
  try {
    sender = new PublicKey(body.account);
  } catch {
    return actionError('Invalid "account"', 400);
  }

  const parsed = giftParamsSchema.safeParse({
    amount: param(url, body, 'amount'),
    senderName: param(url, body, 'senderName'),
    message: param(url, body, 'message'),
    item: param(url, body, 'item'),
    anon: param(url, body, 'anon'),
  });
  if (!parsed.success) {
    return actionError(
      `Amount must be between ${LIMITS.minGiftSol} and ${LIMITS.maxGiftSol} SOL; message up to ${LIMITS.messageMax} chars`,
      400
    );
  }

  try {
    const wish = await getWish(wishId);
    if (!wish) return actionError('Wishlist not found', 404);
    const price = await priceFor(wish);

    const { transaction } = await buildGiftTransaction({
      wish,
      sender,
      amountSol: parsed.data.amount,
      senderName: parsed.data.senderName || 'Friend',
      message: parsed.data.message,
      itemId: parsed.data.item ?? null,
      anonymous: parsed.data.anon,
      fiatValue: price ? solToFiat(parsed.data.amount, price) : null,
    });

    const payload = await createPostResponse({
      fields: {
        type: 'transaction',
        transaction,
        message: `Gift of ${formatSol(parsed.data.amount)} SOL with an on-chain greeting card`,
      },
    });
    return Response.json(payload, { headers: ACTION_HEADERS });
  } catch (err) {
    if (err instanceof GiftInputError) {
      const text =
        err.message === 'memo_too_long'
          ? 'Greeting card is too long'
          : err.message === 'closed'
            ? 'This wishlist is closed'
            : 'Invalid amount';
      return actionError(text, 400);
    }
    if (err instanceof DatabaseNotConfiguredError) {
      return actionError('Database is not configured', 503);
    }
    console.error('[action POST]', err);
    return actionError('Could not build the transaction', 500);
  }
}
