import { NextResponse } from 'next/server';
import { runTelegramCron } from '@/lib/server/telegram-cron';
import { cronAuthorized } from '@/lib/server/cron-auth';
import { getSiteUrl } from '@/lib/server/site';
import { handleServerError } from '@/lib/server/http';

export const maxDuration = 60;

/** Проверка подарков и напоминания бота. Запускается по расписанию (Vercel Cron и/или cron-job.org). */
export async function GET(req: Request) {
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const result = await runTelegramCron(await getSiteUrl());
    return NextResponse.json({ ok: true, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return handleServerError(err, 'GET /api/cron/telegram');
  }
}
