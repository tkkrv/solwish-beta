import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AI_ENABLED, TONES, suggestGreetings } from '@/lib/server/ai';
import { getWish } from '@/lib/server/wishes';
import { apiError } from '@/lib/server/http';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import { LIMITS } from '@/lib/config';

const body = z.object({
  wishId: z.string().max(40).optional(),
  lang: z.enum(['ru', 'kk', 'en']).default('ru'),
  tone: z.enum(TONES).default('warm'),
  draft: z.string().max(LIMITS.messageMax).optional().default(''),
});

/** Помощник открытки: три варианта поздравления под вишлист, язык и тон. */
export async function POST(req: Request) {
  if (!AI_ENABLED) return apiError('ai_disabled', 503);
  const ip = clientIp(req);
  if (!rateLimit(`ai:${ip}`, 8, 60_000) || !rateLimit(`ai-day:${ip}`, 60, 86_400_000)) {
    return apiError('rate_limited', 429);
  }
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('invalid_input', 400);
  const { wishId, lang, tone, draft } = parsed.data;

  const wish = wishId ? await getWish(wishId).catch(() => null) : null;
  try {
    const options = await suggestGreetings({
      lang,
      tone,
      occasion: wish ? `${wish.title}${wish.description ? ` — ${wish.description.slice(0, 160)}` : ''}` : '',
      recipient: wish?.creatorName || '',
      draft,
    });
    if (!options.length) return apiError('server_error', 502);
    return NextResponse.json({ options });
  } catch (err) {
    console.error('[ai greeting]', (err as Error).message);
    return apiError('server_error', 502);
  }
}
