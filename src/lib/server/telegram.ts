import 'server-only';
import { customAlphabet } from 'nanoid';
import { getSupabase } from './supabase';
import { formatSol } from '../amounts';
import { formatMoney } from '../money';
import { computeProgress } from '../progress';
import type { Gift, Wish } from '../types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const BOT_USERNAME = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
export const TELEGRAM_ENABLED = Boolean(BOT_TOKEN && BOT_USERNAME);

const newToken = customAlphabet('0123456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 24);

async function tg(method: string, payload: Record<string, unknown>) {
  if (!BOT_TOKEN) return null;
  const api = process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  const res = await fetch(`${api}/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) console.error('[telegram]', method, res.status, await res.text().catch(() => ''));
  return res.ok;
}

export function sendMessage(chatId: number, text: string) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: false },
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

const T = {
  ru: {
    linked: '✅ Готово! Буду присылать сюда уведомления о подарках на кошелёк',
    bad: 'Ссылка устарела. Откройте «Мои вишлисты» на сайте и нажмите «Подключить Telegram» ещё раз.',
    hello: 'Привет! Это бот SolWish. Подключить уведомления можно на сайте: «Мои вишлисты» → «Подключить Telegram».',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> подарил(а) ${amount} на «${title}»`,
    anon: 'Аноним',
    open: 'Открыть открытку',
    half: (title: string, raised: string, goal: string) => `🙌 Половина собрана: «${title}» — ${raised} из ${goal}`,
    full: (title: string, raised: string, goal: string) => `🎉 Цель достигнута: «${title}» — ${raised} из ${goal}!`,
  },
  kk: {
    linked: '✅ Дайын! Әмиянға түскен сыйлықтар туралы осында хабарлаймын',
    bad: 'Сілтеменің мерзімі өтті. Сайттағы «Менің тізімдерім» бөлімінде «Telegram қосу» батырмасын қайта басыңыз.',
    hello: 'Сәлем! Бұл SolWish боты. Хабарламаларды сайтта қосуға болады: «Менің тізімдерім» → «Telegram қосу».',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> «${title}» үшін ${amount} сыйлады`,
    anon: 'Аноним',
    open: 'Ашықхатты ашу',
    half: (title: string, raised: string, goal: string) => `🙌 Жартысы жиналды: «${title}» — ${goal} ішінен ${raised}`,
    full: (title: string, raised: string, goal: string) => `🎉 Мақсатқа жеттік: «${title}» — ${goal} ішінен ${raised}!`,
  },
  en: {
    linked: '✅ Done! I will notify you here about gifts to wallet',
    bad: 'This link has expired. Open “My wishlists” on the website and press “Connect Telegram” again.',
    hello: 'Hi! This is the SolWish bot. Turn on notifications on the website: “My wishlists” → “Connect Telegram”.',
    gift: (from: string, amount: string, title: string) => `🎁 <b>${from}</b> sent ${amount} for “${title}”`,
    anon: 'Anonymous',
    open: 'Open the card',
    half: (title: string, raised: string, goal: string) => `🙌 Halfway there: “${title}” — ${raised} of ${goal}`,
    full: (title: string, raised: string, goal: string) => `🎉 Goal reached: “${title}” — ${raised} of ${goal}!`,
  },
};
type Lang = keyof typeof T;
const pickLang = (code?: string | null): Lang => (code === 'kk' || code === 'en' ? code : code?.startsWith('kk') ? 'kk' : code?.startsWith('en') ? 'en' : 'ru');

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Обработка входящего апдейта бота: /start <token> привязывает чат к кошельку. */
export async function handleUpdate(update: {
  message?: { chat?: { id?: number }; text?: string; from?: { language_code?: string } };
}) {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text || '';
  if (!chatId) return;
  const lang = pickLang(update.message?.from?.language_code);
  const m = text.match(/^\/start\s+([A-Za-z0-9]{24})$/);
  if (!m) {
    await sendMessage(chatId, T[lang].hello);
    return;
  }
  const sb = getSupabase();
  const { data } = await sb.from('telegram_link_tokens').select('*').eq('token', m[1]).maybeSingle();
  await sb.from('telegram_link_tokens').delete().eq('token', m[1]);
  if (!data || Date.parse(data.expires_at) < Date.now()) {
    await sendMessage(chatId, T[lang].bad);
    return;
  }
  const { error } = await sb
    .from('telegram_links')
    .upsert([{ wallet: data.wallet, chat_id: chatId, lang, created_at: new Date().toISOString() }]);
  if (error) throw error;
  await sendMessage(chatId, `${T[lang].linked} <code>${data.wallet.slice(0, 4)}…${data.wallet.slice(-4)}</code>`);
}

/**
 * Уведомляет получателя (и создателя) о новых подарках.
 * Только подарки после момента привязки Telegram и только один раз (таблица notified_signatures).
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

  for (const g of fresh.filter((x) => mine.has(x.signature))) {
    for (const link of links as { chat_id: number; lang: string }[]) {
      const t = T[pickLang(link.lang)];
      const amount =
        wish.goalCurrency !== 'SOL' && g.fiat
          ? `${formatMoney(g.fiat, wish.goalCurrency)} (${formatSol(g.amountSol)} SOL)`
          : `${formatSol(g.amountSol)} SOL`;
      const lines = [
        t.gift(esc(g.anonymous || !g.from ? t.anon : g.from), amount, esc(wish.title)),
        g.msg ? `\n<i>«${esc(g.msg)}»</i>` : '',
        `\n<a href="${siteUrl}/card/${g.signature}">${t.open}</a>`,
      ];
      await sendMessage(link.chat_id, lines.join(''));
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
  const money = (v: number) => (wish.goalCurrency === 'SOL' ? `${formatSol(v)} SOL` : formatMoney(v, wish.goalCurrency));
  for (const link of links as { chat_id: number; lang: string }[]) {
    const t = T[pickLang(link.lang)];
    await sendMessage(
      link.chat_id,
      `${t[kind](esc(wish.title), money(after.raised), money(after.goal))}\n<a href="${siteUrl}/w/${wish.id}">${siteUrl.replace(/^https?:\/\//, '')}/w/${wish.id}</a>`
    );
  }
}
