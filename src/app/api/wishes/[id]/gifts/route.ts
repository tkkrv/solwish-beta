import { NextResponse, after } from 'next/server';
import { getWish } from '@/lib/server/wishes';
import { getWishGifts } from '@/lib/server/chain';
import { notifyNewGifts } from '@/lib/server/telegram';
import { getSiteUrl } from '@/lib/server/site';
import { apiError, handleServerError } from '@/lib/server/http';

export async function GET(_req: Request, ctx: RouteContext<'/api/wishes/[id]/gifts'>) {
  const { id } = await ctx.params;
  try {
    const wish = await getWish(id);
    if (!wish) return apiError('not_found', 404);
    const summary = await getWishGifts(wish);
    // Уведомления о новых подарках (в т.ч. через Blink и QR) — после ответа, не задерживая страницу.
    const site = await getSiteUrl();
    after(() => notifyNewGifts(wish, summary.gifts, site).catch((e) => console.error('[notify]', e)));
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60' },
    });
  } catch (err) {
    return handleServerError(err, 'GET /api/wishes/[id]/gifts');
  }
}
