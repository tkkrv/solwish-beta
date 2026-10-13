import { NextResponse } from 'next/server';
import { createWishSchema } from '@/lib/validation';
import { createWish } from '@/lib/server/wishes';
import { apiError, handleServerError } from '@/lib/server/http';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';

export async function POST(req: Request) {
  if (!rateLimit(`create:${clientIp(req)}`, 10, 10 * 60_000)) {
    return apiError('rate_limited', 429);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('invalid_input', 400);
  }

  const parsed = createWishSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_input', 400, {
      fields: parsed.error.issues.map((i) => i.path.join('.')),
    });
  }

  try {
    const wish = await createWish(parsed.data);
    return NextResponse.json({ wish }, { status: 201 });
  } catch (err) {
    return handleServerError(err, 'POST /api/wishes');
  }
}
