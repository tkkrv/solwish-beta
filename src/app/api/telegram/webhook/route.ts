import { NextResponse } from 'next/server';
import { TELEGRAM_ENABLED, handleUpdate } from '@/lib/server/telegram';

/**
 * Webhook бота. Telegram присылает секрет в заголовке X-Telegram-Bot-Api-Secret-Token
 * (задаётся при setWebhook), чужие запросы отбрасываем.
 */
export async function POST(req: Request) {
  if (!TELEGRAM_ENABLED) return NextResponse.json({ ok: false }, { status: 404 });
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    await handleUpdate(await req.json());
  } catch (err) {
    console.error('[telegram webhook]', err);
  }
  // Всегда 200, иначе Telegram будет повторять апдейт.
  return NextResponse.json({ ok: true });
}
