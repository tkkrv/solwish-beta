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
import { buildGiftTransaction, GiftInputError } from './gift-tx';
import { DatabaseNotConfiguredError } from './supabase';
import { suggestedAmounts, formatSol } from '../amounts';

export const ACTION_HEADERS = createActionHeaders({
  chainId: NETWORK === 'mainnet-beta' ? BLOCKCHAIN_IDS.mainnet : BLOCKCHAIN_IDS.devnet,
  actionVersion: '2.4',
});

function actionError(message: string, status: number) {
  return Response.json({ message }, { status, headers: ACTION_HEADERS });
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(
    () => null
  );
}

export async function handleActionGet(req: Request, wishId: string | null) {
  const url = new URL(req.url);
  if (!wishId) return actionError('Wishlist id is missing', 400);

  try {
    const wish = await getWish(wishId);
    if (!wish) return actionError('Wishlist not found', 404);

    const summary = await withTimeout(getWishGifts(wish), 2500);
    const progress = !summary
      ? ` · Goal: ${formatSol(wish.amountSol)} SOL.`
      : summary.count === 0
        ? ` · Goal: ${formatSol(wish.amountSol)} SOL. Be the first to gift!`
        : ` · Raised ${formatSol(summary.totalSol)} of ${formatSol(wish.amountSol)} SOL from ${summary.count} ${summary.count === 1 ? 'friend' : 'friends'}.`;

    const base = `${url.origin}/api/actions/gift/${wish.id}`;
    const forWhom = wish.creatorName ? `For ${wish.creatorName}. ` : '';
    const remaining = summary ? Math.max(wish.amountSol - summary.totalSol, 0) : wish.amountSol;
    const presets = suggestedAmounts(wish.amountSol, remaining).slice(0, 3);

    const payload: ActionGetResponse = {
      type: 'action',
      icon: absoluteUrl(wish.iconUrl, url.origin),
      title: wish.title,
      description: `${forWhom}${wish.description || 'Send a gift with an on-chain greeting card.'}${progress}`.slice(0, 600),
      label: 'Send gift',
      links: {
        actions: [
          // Быстрые суммы — без полей, в один клик.
          ...presets.map((amount) => ({
            type: 'transaction' as const,
            label: `${formatSol(amount)} SOL`,
            href: `${base}?amount=${amount}`,
          })),
          {
            type: 'transaction',
            label: 'Send gift',
            href: `${base}?amount={amount}&senderName={senderName}&message={message}`,
            parameters: [
              {
                type: 'number',
                name: 'amount',
                label: 'Amount (SOL)',
                required: true,
                min: LIMITS.minGiftSol,
                max: LIMITS.maxGiftSol,
              },
              { type: 'text', name: 'senderName', label: 'Your name', required: false },
              {
                type: 'textarea',
                name: 'message',
                label: `Greeting card (public, up to ${LIMITS.messageMax} chars)`,
                required: false,
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

    const { transaction } = await buildGiftTransaction({
      wish,
      sender,
      amountSol: parsed.data.amount,
      senderName: parsed.data.senderName || 'Friend',
      message: parsed.data.message,
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
      return actionError(
        err.message === 'memo_too_long' ? 'Greeting card is too long' : 'Invalid amount',
        400
      );
    }
    if (err instanceof DatabaseNotConfiguredError) {
      return actionError('Database is not configured', 503);
    }
    console.error('[action POST]', err);
    return actionError('Could not build the transaction', 500);
  }
}
