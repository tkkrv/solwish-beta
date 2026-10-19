import 'server-only';
import { LIMITS } from '../config';
import { checkText, type ModerationReason } from '../moderation';

/**
 * AI через любой OpenAI-совместимый Chat Completions API:
 * OpenAI, Azure OpenAI (endpoint …/openai/v1), а также сервисы с тем же форматом.
 * Без AI_API_KEY все AI-функции выключены, а сайт работает как раньше.
 */
const API_URL = (process.env.AI_API_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const API_KEY = process.env.AI_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'gpt-5-nano';
const REASONING = /^(gpt-5|o\d)/i.test(MODEL);
export const AI_ENABLED = Boolean(API_KEY);

type Message = { role: 'system' | 'user'; content: string };

async function chat(messages: Message[], { maxTokens = 400, timeoutMs = 8000 } = {}): Promise<string> {
  const res = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // OpenAI ждёт Bearer, Azure OpenAI — api-key. Отправляем оба.
      authorization: `Bearer ${API_KEY}`,
      'api-key': API_KEY,
    },
    body: JSON.stringify(
      // Модели-«рассуждалки» (gpt-5*, o*) не принимают temperature и max_tokens, зато тратят токены на размышления.
      REASONING
        ? {
            model: MODEL,
            messages,
            max_completion_tokens: maxTokens * 4,
            reasoning_effort: 'minimal',
            response_format: { type: 'json_object' },
          }
        : {
            model: MODEL,
            messages,
            temperature: 0.8,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }
    ),
    signal: AbortSignal.timeout(timeoutMs),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`ai ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content || '';
}

function parseJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export const TONES = ['warm', 'funny', 'formal', 'short'] as const;
export type Tone = (typeof TONES)[number];

const LANG_NAME = { ru: 'Russian', kk: 'Kazakh', en: 'English' } as const;
const TONE_HINT: Record<Tone, string> = {
  warm: 'warm and heartfelt',
  funny: 'light and funny, kind humour only',
  formal: 'polite and formal, suitable for a colleague or boss',
  short: 'very short, one sentence',
};

/** Три варианта поздравления. Текст только предлагается — человек правит и отправляет сам. */
export async function suggestGreetings(opts: {
  lang: keyof typeof LANG_NAME;
  tone: Tone;
  occasion: string;
  recipient: string;
  draft?: string;
}): Promise<string[]> {
  const max = LIMITS.messageMax - 10;
  const system = [
    'You write greeting-card messages that friends attach to a money gift on SolWish.',
    `Write in ${LANG_NAME[opts.lang]}. Tone: ${TONE_HINT[opts.tone]}.`,
    `Each message must be at most ${max} characters, plain text, at most one emoji, no hashtags, no links, no quotes around it.`,
    'Do not mention money amounts, crypto or blockchain.',
    'Return JSON: {"options": ["…", "…", "…"]} with three different messages.',
  ].join(' ');
  const user = [
    opts.occasion && `Occasion / wishlist: ${opts.occasion.slice(0, 120)}`,
    opts.recipient && `Recipient name: ${opts.recipient.slice(0, 40)}`,
    opts.draft && `Improve this draft, keep its meaning: ${opts.draft.slice(0, 200)}`,
  ]
    .filter(Boolean)
    .join('\n');
  const raw = await chat([
    { role: 'system', content: system },
    { role: 'user', content: user || 'A birthday gift.' },
  ]);
  const options = parseJson<{ options?: unknown }>(raw)?.options;
  if (!Array.isArray(options)) return [];
  return options
    .filter((o): o is string => typeof o === 'string')
    .map((o) => o.trim().replace(/^["«“]|["»”]$/g, '').slice(0, LIMITS.messageMax))
    .filter((o) => o && checkText(o).ok)
    .slice(0, 3);
}

/** AI-модерация (если включена) поверх быстрого словаря. При сбое AI не блокируем — остаётся словарь. */
export async function moderate(
  texts: (string | null | undefined)[]
): Promise<{ ok: true } | { ok: false; reason: ModerationReason | 'ai' }> {
  const list = texts.map((t) => (t || '').trim()).filter(Boolean);
  for (const t of list) {
    const r = checkText(t);
    if (!r.ok) return r;
  }
  if (!AI_ENABLED || !list.length) return { ok: true };
  try {
    const raw = await chat(
      [
        {
          role: 'system',
          content:
            'You moderate short public texts for a gifting website (wishlists and greeting cards). ' +
            'Flag insults, hate, harassment, sexual content, threats, scams or phishing (e.g. "claim airdrop"), ' +
            'and requests to send money elsewhere. Friendly jokes and normal wishes are fine. ' +
            'Texts may be in Russian, Kazakh or English. Return JSON {"flag": true|false}.',
        },
        { role: 'user', content: list.join('\n---\n').slice(0, 2000) },
      ],
      { maxTokens: 20, timeoutMs: 4000 }
    );
    const flag = parseJson<{ flag?: unknown }>(raw)?.flag;
    return flag === true ? { ok: false, reason: 'ai' } : { ok: true };
  } catch (err) {
    console.error('[ai moderate]', (err as Error).message);
    return { ok: true };
  }
}
