import { NextResponse } from 'next/server';
import { createWishSchema } from '@/lib/validation';
import { createWish } from '@/lib/server/wishes';
import { getSolPrices } from '@/lib/server/price';
import { AuthError, verifyWalletAuth } from '@/lib/server/auth';
import { apiError, handleServerError } from '@/lib/server/http';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import { fiatToSol } from '@/lib/money';

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
    return apiError('invalid_input', 400, { fields: parsed.error.issues.map((i) => i.path.join('.')) });
  }
  const input = parsed.data;
  // Фиатные цели временно отключены: создаём только вишлисты в SOL.
  if (input.goalCurrency !== 'SOL') return apiError('invalid_input', 400, { fields: ['goalCurrency'] });

  try {
    // Создатель (необязательно) подтверждает кошелёк подписью — тогда вишлист появится в «Моих».
    let creatorWallet: string | null = null;
    if (input.auth) {
      try {
        creatorWallet = verifyWalletAuth(input.auth, 'create-wish', 'new');
      } catch (err) {
        if (err instanceof AuthError) return apiError('invalid_input', 400, { fields: ['auth'] });
        throw err;
      }
    }

    const total = input.items?.length ? input.items.reduce((s, i) => s + i.goal, 0) : input.goal!;
    let amountSol = total;
    let goalFiat: number | null = null;
    if (input.goalCurrency !== 'SOL') {
      const prices = await getSolPrices();
      if (!prices) return apiError('price_unavailable', 503);
      goalFiat = Math.round(total * 100) / 100;
      amountSol = Math.max(fiatToSol(total, prices[input.goalCurrency]), 0.000001);
    }

    const wish = await createWish(input, { amountSol, goalFiat, creatorWallet });
    return NextResponse.json({ wish }, { status: 201 });
  } catch (err) {
    return handleServerError(err, 'POST /api/wishes');
  }
}
