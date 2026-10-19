import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/server/supabase';
import { apiError, handleServerError } from '@/lib/server/http';
import { clientIp, rateLimit } from '@/lib/server/rate-limit';
import { sendMessage } from '@/lib/server/telegram';
import { checkText } from '@/lib/moderation';

const LEAD_KINDS = ['corporate', 'event', 'brand', 'other'] as const;

const body = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).optional().default(''),
  contact: z.string().trim().min(3).max(120),
  kind: z.enum(LEAD_KINDS).default('other'),
  message: z.string().trim().max(1000).optional().default(''),
  locale: z.enum(['ru', 'kk', 'en']).optional(),
  // Ловушка для ботов: настоящий человек это поле не видит и не заполняет.
  website: z.string().max(0).optional(),
});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Заявка от бизнеса со страницы «Тарифы». */
export async function POST(req: Request) {
  if (!rateLimit(`lead:${clientIp(req)}`, 5, 10 * 60_000)) return apiError('rate_limited', 429);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError('invalid_input', 400, { fields: parsed.error.issues.map((i) => i.path.join('.')) });
  }
  const lead = parsed.data;
  // Ссылки в заявке допустимы (сайт компании), грубые слова — нет.
  const withoutLinks = (t: string) => t.replace(/\S*(https?:\/\/|www\.|\.[a-z]{2,})\S*/gi, '');
  if ([lead.name, lead.company, lead.message].some((t) => !checkText(withoutLinks(t)).ok)) {
    return apiError('moderation', 400);
  }
  try {
    const { error } = await getSupabase()
      .from('business_leads')
      .insert([{ name: lead.name, company: lead.company, contact: lead.contact, kind: lead.kind, message: lead.message, locale: lead.locale }]);
    if (error) throw error;

    const admin = Number(process.env.TELEGRAM_ADMIN_CHAT_ID || 0);
    if (admin) {
      await sendMessage(
        admin,
        `💼 <b>Новая заявка для бизнеса</b>\n${esc(lead.name)}${lead.company ? ` · ${esc(lead.company)}` : ''}\n${esc(lead.contact)} · ${lead.kind}\n${esc(lead.message).slice(0, 600)}`
      )?.catch(() => null);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleServerError(err, 'POST /api/leads');
  }
}
