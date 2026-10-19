import { NextResponse } from 'next/server';
import { z } from 'zod';
import { moderate } from '@/lib/server/ai';
import { apiError } from '@/lib/server/http';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';

const body = z.object({ texts: z.array(z.string().max(600)).max(5) });

/** Проверка текста открытки перед отправкой (словарь + AI, если включён). */
export async function POST(req: Request) {
  if (!rateLimit(`mod:${clientIp(req)}`, 20, 60_000)) return apiError('rate_limited', 429);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError('invalid_input', 400);
  return NextResponse.json(await moderate(parsed.data.texts));
}
