import { NextResponse } from 'next/server';
import { TELEGRAM_ENABLED, tg } from '@/lib/server/telegram';
import { ABOUT, COMMANDS } from '@/lib/server/telegram-texts';
import { cronAuthorized } from '@/lib/server/cron-auth';
import { getSiteUrl } from '@/lib/server/site';

/**
 * Разовая настройка бота: webhook, меню команд и описание на трёх языках.
 * Открыть в браузере: /api/telegram/setup?key=<CRON_SECRET>. Повторный запуск безопасен.
 */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  if (!TELEGRAM_ENABLED) return NextResponse.json({ ok: false, error: 'telegram_disabled' }, { status: 400 });
  const site = await getSiteUrl();
  const steps: Record<string, boolean> = {};

  steps.webhook = Boolean(
    await tg('setWebhook', {
      url: `${site}/api/telegram/webhook`,
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query', 'inline_query'],
    })
  );
  // Русский — по умолчанию (для всех языков), казахский и английский — отдельно.
  for (const [lang, code] of [['ru', undefined], ['ru', 'ru'], ['kk', 'kk'], ['en', 'en']] as const) {
    const key = code ?? 'default';
    steps[`commands_${key}`] = Boolean(await tg('setMyCommands', { commands: COMMANDS[lang], language_code: code }));
    steps[`description_${key}`] = Boolean(
      await tg('setMyDescription', { description: ABOUT[lang].description, language_code: code })
    );
    steps[`short_${key}`] = Boolean(
      await tg('setMyShortDescription', { short_description: ABOUT[lang].short, language_code: code })
    );
  }
  const me = await tg<{ username?: string; supports_inline_queries?: boolean }>('getMe', {});
  return NextResponse.json({
    ok: Object.values(steps).every(Boolean),
    webhook: `${site}/api/telegram/webhook`,
    steps,
    bot: me?.username,
    // Inline-режим включается только вручную: @BotFather → /setinline.
    inlineMode: Boolean(me?.supports_inline_queries),
  });
}
