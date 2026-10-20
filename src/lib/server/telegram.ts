import 'server-only';
import { customAlphabet } from 'nanoid';
import { getSupabase } from './supabase';
import { formatSol } from '../amounts';
import { formatMoney } from '../money';
import { computeProgress } from '../progress';
import { T, esc, pickLang } from './telegram-texts';
import type { Gift, Wish } from '../types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const BOT_USERNAME = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
export const TELEGRAM_ENABLED = Boolean(BOT_TOKEN && BOT_USERNAME);

const newToken = customAlphabet('0123456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 24);

export type Button = { text: string; url?: string; callback_data?: string; switch_inline_query?: string };
export type Keyboard = Button[][];

/** Вызов Bot API. Возвращает result или null при ошибке (ошибки только логируем). */
export async function tg<R = unknown>(method: string, payload: Record<string, unknown>): Promise<R | null> {
  if (!BOT_TOKEN) return null;
  const api = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  try {
    const res = await fetch(`${api}/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: R; description?: string } | null;
    if (!res.ok || !data?.ok) {
      console.error('[telegram]', method, res.status, data?.description || '');
      return null;
    }
    return (data.result ?? true) as R;
  } catch (err) {
    console.error('[telegram]', method, (err as Error).message);
    return null;
  }
}

/** Telegram не принимает кнопки-ссылки на http://localhost — в разработке отправляем без них. */
const publicUrl = (url: string) => /^https:\/\//.test(url);

export function keyboard(rows: Keyboard): { inline_keyboard: Keyboard } | undefined {
  const clean = rows
    .map((row) => row.filter((b) => !b.url || publicUrl(b.url)))
    .filter((row) => row.length);
  return clean.length ? { inline_keyboard: clean } : undefined;
}

export function sendMessage(chatId: number, text: string, rows?: Keyboard, preview = false) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: !preview },
    reply_markup: rows ? keyboard(rows) : undefined,
  });
}

/** Одноразовая ссылка t.me/<bot>?start=<token> для привязки кошелька к чату (действует 15 минут). */
export async function createLinkToken(wallet: string): Promise<string> {
  const token = newToken();
  const { error } = await getSupabase()
    .from('telegram_link_tokens')
    .insert([{ token, wallet, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }]);
  if (error) throw error;
  return `https://t.me/${BOT_USERNAME}?start=${token}`;
}

export async function isLinked(wallet: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('telegram_links').select('wallet').eq('wallet', wallet).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function unlink(wallet: string) {
  const { error } = await getSupabase().from('telegram_links').delete().eq('wallet', wallet);
  if (error) throw error;
}

export type TgLink = { wallet: string; chat_id: number; lang: string; created_at: string };

/** Сумма в валюте цели вишлиста (сейчас всегда SOL). */
export const money = (wish: Wish, v: number) =>
  wish.goalCurrency === 'SOL' ? `${formatSol(v)} SOL` : formatMoney(v, wish.goalCurrency);

export const wishUrl = (site: string, wish: Wish) => `${site}/w/${wish.id}`;

/** Кнопки «Открыть» и «Поделиться» (поделиться = выбрать чат и вставить карточку вишлиста через inline-режим). */
export const wishButtons = (site: string, wish: Wish, t: (typeof T)['ru']): Button[] => [
  { text: t.btnOpen, url: wishUrl(site, wish) },
  { text: t.btnShare, switch_inline_query: wish.id },
];

/**
 * Уведомляет получателя (и создателя) о новых подарках.
 * Только подарки после момента привязки Telegram и только один раз (таблица notified_signatures).
 * Вызывается при открытии страницы вишлиста и по расписанию (/api/cron/telegram).
 */
export async function notifyNewGifts(wish: Wish, gifts: Gift[], siteUrl: string) {
  if (!TELEGRAM_ENABLED || !gifts.length) return;
  const sb = getSupabase();
  const wallets = [...new Set([wish.recipientWallet, wish.creatorWallet].filter(Boolean))] as string[];
  const { data: links, error } = await sb.from('telegram_links').select('*').in('wallet', wallets);
  if (error || !links?.length) return;

  const { data: done } = await sb
    .from('notified_signatures')
    .select('signature')
    .in('signature', gifts.map((g) => g.signature));
  const already = new Set((done || []).map((d: { signature: string }) => d.signature));
  const linkedSince = Math.min(...links.map((l: { created_at: string }) => Date.parse(l.created_at) / 1000));
  const fresh = gifts.filter((g) => !already.has(g.signature) && (g.blockTime ?? 0) >= linkedSince).slice(0, 10);
  if (!fresh.length) return;

  // Сначала помечаем (insert с PK не даст двум запросам отправить одно и то же дважды).
  const { data: claimed } = await sb
    .from('notified_signatures')
    .upsert(fresh.map((g) => ({ signature: g.signature })), { onConflict: 'signature', ignoreDuplicates: true })
    .select('signature');
  const mine = new Set((claimed || []).map((c: { signature: string }) => c.signature));

  // Один чат может быть привязан и к получателю, и к создателю — шлём в каждый чат один раз.
  const chats = new Map<number, TgLink>();
  for (const l of links as TgLink[]) {
    const prev = chats.get(l.chat_id);
    if (!prev || l.wallet === wish.recipientWallet) chats.set(l.chat_id, l);
  }

  for (const g of fresh.filter((x) => mine.has(x.signature))) {
    for (const link of chats.values()) {
      const t = T[pickLang(link.lang)];
      const amount =
        wish.goalCurrency !== 'SOL' && g.fiat
          ? `${formatMoney(g.fiat, wish.goalCurrency)} (${formatSol(g.amountSol)} SOL)`
          : `${formatSol(g.amountSol)} SOL`;
      const text = [
        t.gift(esc(g.anonymous || !g.from ? t.anon : g.from), amount, esc(wish.title)),
        g.msg ? `\n<i>«${esc(g.msg)}»</i>` : '',
      ].join('');
      const card = `${siteUrl}/card/${g.signature}`;
      // «Спасибо» может отправить только получатель (его кошелёк подписывает ответ).
      const row: Button[] = [{ text: t.btnCard, url: card }];
      if (link.wallet === wish.recipientWallet) row.push({ text: t.btnThanks, url: `${card}#thanks` });
      await sendMessage(link.chat_id, text, [row]);
    }
  }

  // Отметки 50% и 100%: сообщаем, если именно эти новые подарки пересекли порог.
  // Без живого курса — по суммам из memo (или курсу на момент создания), чтобы не зависеть от колебаний.
  const sent = gifts.filter((g) => mine.has(g.signature));
  if (!sent.length) return;
  const after = computeProgress(wish, gifts, null);
  const before = computeProgress(wish, gifts.filter((g) => !mine.has(g.signature)), null);
  if (!(after.goal > 0)) return;
  const crossed = (p: number) => before.raised < after.goal * p && after.raised >= after.goal * p;
  const kind = crossed(1) ? 'full' : crossed(0.5) ? 'half' : null;
  if (!kind) return;
  for (const link of chats.values()) {
    const t = T[pickLang(link.lang)];
    await sendMessage(link.chat_id, t[kind](esc(wish.title), money(wish, after.raised), money(wish, after.goal)), [
      wishButtons(siteUrl, wish, t),
    ]);
  }
}
