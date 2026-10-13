import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthError, verifyWalletAuth } from '@/lib/server/auth';
import { TELEGRAM_ENABLED, createLinkToken, isLinked, unlink } from '@/lib/server/telegram';
import { apiError, handleServerError } from '@/lib/server/http';
import { isValidSolanaAddress, walletAuthSchema } from '@/lib/validation';

/** Статус привязки Telegram для кошелька. */
export async function GET(req: Request) {
  if (!TELEGRAM_ENABLED) return NextResponse.json({ enabled: false, linked: false });
  const wallet = new URL(req.url).searchParams.get('wallet') || '';
  if (!isValidSolanaAddress(wallet)) return apiError('invalid_input', 400);
  try {
    return NextResponse.json({ enabled: true, linked: await isLinked(wallet) });
  } catch (err) {
    return handleServerError(err, 'GET /api/telegram/link');
  }
}

const body = z.object({ auth: walletAuthSchema, action: z.enum(['link', 'unlink']).default('link') });

/** Подписанный запрос → одноразовая ссылка на бота (или отключение уведомлений). */
export async function POST(req: Request) {
  if (!TELEGRAM_ENABLED) return apiError('not_found', 404);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('invalid_input', 400);
  try {
    const wallet = verifyWalletAuth(parsed.data.auth, 'link-telegram', parsed.data.action);
    if (parsed.data.action === 'unlink') {
      await unlink(wallet);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ url: await createLinkToken(wallet) });
  } catch (err) {
    if (err instanceof AuthError) return apiError('forbidden', 403);
    return handleServerError(err, 'POST /api/telegram/link');
  }
}
