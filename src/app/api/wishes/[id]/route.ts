import { NextResponse } from 'next/server';
import { z } from 'zod';
import { GoalChangeError, canManage, deleteWish, getWish, updateWish } from '@/lib/server/wishes';
import { AuthError, verifyWalletAuth } from '@/lib/server/auth';
import { apiError, handleServerError } from '@/lib/server/http';
import { updateWishSchema, walletAuthSchema } from '@/lib/validation';
import { moderate } from '@/lib/server/ai';

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

const patchBody = z.object({ auth: walletAuthSchema, patch: updateWishSchema });
const deleteBody = z.object({ auth: walletAuthSchema });

/** Проверяет подпись и права владельца. Возвращает вишлист или готовый ответ с ошибкой. */
async function authorize(id: string, auth: z.infer<typeof walletAuthSchema>) {
  const wish = await getWish(id);
  if (!wish) return { error: apiError('not_found', 404) };
  try {
    const wallet = verifyWalletAuth(auth, 'manage-wish', id);
    if (!canManage(wish, wallet)) return { error: apiError('forbidden', 403) };
  } catch (err) {
    if (err instanceof AuthError) return { error: apiError('forbidden', 403, { reason: err.message }) };
    throw err;
  }
  return { wish };
}

export async function PATCH(req: Request, ctx: RouteContext<'/api/wishes/[id]'>) {
  const { id } = await ctx.params;
  const parsed = patchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('invalid_input', 400, { fields: parsed.error.issues.map((i) => i.path.join('.')) });
  try {
    const res = await authorize(id, parsed.data.auth);
    if ('error' in res) return res.error;
    const p = parsed.data.patch;
    const mod = await moderate([p.title, p.description, p.creatorName, ...(p.items || []).map((i) => i.title)]);
    if (!mod.ok) return apiError('moderation', 400, { reason: mod.reason });
    const wish = await updateWish(res.wish, p);
    return NextResponse.json({ wish });
  } catch (err) {
    if (err instanceof GoalChangeError) return apiError('invalid_input', 400, { fields: ['goal'] });
    return handleServerError(err, 'PATCH /api/wishes/[id]');
  }
}

export async function DELETE(req: Request, ctx: RouteContext<'/api/wishes/[id]'>) {
  const { id } = await ctx.params;
  const parsed = deleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('invalid_input', 400);
  try {
    const res = await authorize(id, parsed.data.auth);
    if ('error' in res) return res.error;
    await deleteWish(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleServerError(err, 'DELETE /api/wishes/[id]');
  }
}
