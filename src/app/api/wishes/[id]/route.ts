import { NextResponse } from 'next/server';
import { getWish } from '@/lib/server/wishes';
import { apiError, handleServerError } from '@/lib/server/http';

export async function GET(_req: Request, ctx: RouteContext<'/api/wishes/[id]'>) {
  const { id } = await ctx.params;
  try {
    const wish = await getWish(id);
    if (!wish) return apiError('not_found', 404);
    return NextResponse.json({ wish });
  } catch (err) {
    return handleServerError(err, 'GET /api/wishes/[id]');
  }
}
