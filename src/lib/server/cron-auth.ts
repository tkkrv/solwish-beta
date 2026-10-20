import 'server-only';

/**
 * Доступ к служебным эндпоинтам по секрету CRON_SECRET.
 * Vercel Cron сам присылает заголовок `Authorization: Bearer <CRON_SECRET>`;
 * внешние планировщики (cron-job.org) могут прислать тот же заголовок или ?key=<CRON_SECRET>.
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get('key') === secret;
}
