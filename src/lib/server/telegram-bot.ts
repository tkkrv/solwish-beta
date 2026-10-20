import 'server-only';
import { getSupabase } from './supabase';
import { getWish, listWishesByWallet } from './wishes';
import { getWishGifts } from './chain';
import { computeProgress, daysUntil } from '../progress';
import { formatSol } from '../amounts';
import { BOT_USERNAME, money, sendMessage, tg, wishUrl, type Keyboard, type TgLink } from './telegram';
import { T, esc, pickLang, type Lang } from './telegram-texts';
import type { Wish } from '../types';

type TgUser = { id?: number; language_code?: string };
type Update = {
  message?: { chat?: { id?: number; type?: string }; text?: string; from?: TgUser };
  callback_query?: { id: string; from?: TgUser; data?: string; message?: { chat?: { id?: number } } };
  inline_query?: { id: string; from?: TgUser; query?: string };
};

const short = (w: string) => `${w.slice(0, 4)}…${w.slice(-4)}`;
const withBot = (s: string) => s.replaceAll('{bot}', BOT_USERNAME);

/** Дата «сегодня» по Казахстану (UTC+5), чтобы дни до события совпадали с ощущениями пользователей. */
export const kzNow = () => new Date(Date.now() + 5 * 3_600_000);

async function linksForChat(chatId: number): Promise<TgLink[]> {
  const { data, error } = await getSupabase().from('telegram_links').select('*').eq('chat_id', chatId);
  if (error) throw error;
  return (data || []) as TgLink[];
}

/** Вишлисты всех кошельков, привязанных к чату (без повторов, новые сверху). */
async function wishesForChat(chatId: number): Promise<{ links: TgLink[]; wishes: Wish[] }> {
  const links = await linksForChat(chatId);
  const lists = await Promise.all(links.map((l) => listWishesByWallet(l.wallet)));
  const seen = new Set<string>();
  const wishes = lists
    .flat()
    .filter((w) => (seen.has(w.id) ? false : (seen.add(w.id), true)))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { links, wishes };
}

async function withProgress(wishes: Wish[]) {
  return Promise.all(
    wishes.map(async (wish) => {
      const gifts = await getWishGifts(wish).catch(() => null);
      return { wish, gifts: gifts?.gifts || [], progress: computeProgress(wish, gifts?.gifts || [], null) };
    })
  );
}

const startButtons = (site: string, t: (typeof T)[Lang], linked: boolean): Keyboard => [
  linked
    ? [
        { text: t.btnMy, callback_data: 'my' },
        { text: t.btnStats, callback_data: 'stats' },
      ]
    : [{ text: t.btnConnect, url: `${site}/my` }],
  [
    { text: t.btnCreate, url: `${site}/create` },
    { text: t.btnDemo, url: `${site}/demo` },
  ],
];

async function sendStart(chatId: number, lang: Lang, site: string) {
  const t = T[lang];
  const links = await linksForChat(chatId);
  const text = links.length ? t.helloLinked(links.map((l) => `<code>${short(l.wallet)}</code>`).join(', ')) : t.hello;
  await sendMessage(chatId, text, startButtons(site, t, links.length > 0));
}

async function sendWishlists(chatId: number, lang: Lang, site: string) {
  const t = T[lang];
  const { links, wishes } = await wishesForChat(chatId);
  if (!links.length) return sendMessage(chatId, t.notLinked, [[{ text: t.btnConnect, url: `${site}/my` }]]);
  if (!wishes.length) return sendMessage(chatId, t.noWishes, [[{ text: t.btnCreate, url: `${site}/create` }]]);

  const rows = await withProgress(wishes.slice(0, 8));
  const now = kzNow();
  const lines = rows.map(({ wish, progress }, i) => {
    const days = daysUntil(wish.eventDate, now);
    const extra = [wish.closed ? t.closed : null, days != null && days >= -1 ? t.daysLeft(days) : null].filter(Boolean);
    return (
      `${i + 1}. <a href="${wishUrl(site, wish)}"><b>${esc(wish.title)}</b></a>\n` +
      `    ${t.progress(money(wish, progress.raised), money(wish, progress.goal), progress.count)}` +
      (extra.length ? ` · ${extra.join(' · ')}` : '')
    );
  });
  // По кнопке «Поделиться» на каждый вишлист (не больше 5 строк, чтобы клавиатура не разрасталась).
  const kb: Keyboard = rows.slice(0, 5).map(({ wish }, i) => [
    { text: `${i + 1}. ${t.btnShare}`, switch_inline_query: wish.id },
    { text: t.btnOpen, url: wishUrl(site, wish) },
  ]);
  kb.push([{ text: t.btnCreate, url: `${site}/create` }]);
  await sendMessage(chatId, `${t.listTitle}\n\n${lines.join('\n\n')}`, kb);
}

async function sendStats(chatId: number, lang: Lang, site: string) {
  const t = T[lang];
  const { links, wishes } = await wishesForChat(chatId);
  if (!links.length) return sendMessage(chatId, t.notLinked, [[{ text: t.btnConnect, url: `${site}/my` }]]);
  const rows = await withProgress(wishes.slice(0, 20));
  const gifts = rows.reduce((s, r) => s + r.progress.count, 0);
  const sol = rows.reduce((s, r) => s + r.progress.raisedSol, 0);
  await sendMessage(chatId, t.stats(wishes.length, gifts, `${formatSol(sol)} SOL`), [[{ text: t.btnMy, callback_data: 'my' }]]);
}

async function stop(chatId: number, lang: Lang, site: string) {
  await getSupabase().from('telegram_links').delete().eq('chat_id', chatId);
  await sendMessage(chatId, T[lang].stopped, [[{ text: T[lang].btnConnect, url: `${site}/my` }]]);
}

async function linkWallet(chatId: number, token: string, lang: Lang) {
  const t = T[lang];
  const sb = getSupabase();
  const { data } = await sb.from('telegram_link_tokens').select('*').eq('token', token).maybeSingle();
  await sb.from('telegram_link_tokens').delete().eq('token', token);
  if (!data || Date.parse(data.expires_at) < Date.now()) {
    await sendMessage(chatId, t.bad);
    return;
  }
  const { error } = await sb
    .from('telegram_links')
    .upsert([{ wallet: data.wallet, chat_id: chatId, lang, created_at: new Date().toISOString() }]);
  if (error) throw error;
  await sendMessage(chatId, `${t.linked} <code>${short(data.wallet)}</code>\n\n${withBot(t.linkedNext)}`, [
    [
      { text: t.btnMy, callback_data: 'my' },
      { text: t.btnStats, callback_data: 'stats' },
    ],
  ]);
}

/** Inline-режим: «@бот» в любом чате → список своих вишлистов; «@бот wish_…» → конкретный вишлист. */
async function answerInline(q: NonNullable<Update['inline_query']>, site: string) {
  const lang = pickLang(q.from?.language_code);
  const t = T[lang];
  const query = (q.query || '').trim();
  let wishes: Wish[] = [];
  const byId = query.match(/wish_[A-Za-z0-9_-]{5,32}/)?.[0];
  if (byId) {
    const w = await getWish(byId);
    if (w) wishes = [w];
  } else if (q.from?.id) {
    // В личке chat_id совпадает с id пользователя, поэтому вишлисты ищем по нему.
    const all = (await wishesForChat(q.from.id)).wishes.filter((w) => !w.closed);
    const needle = query.toLowerCase();
    wishes = (needle ? all.filter((w) => w.title.toLowerCase().includes(needle)) : all).slice(0, 10);
  }

  const rows = await withProgress(wishes);
  const results = rows.map(({ wish, progress }) => {
    const url = wishUrl(site, wish);
    const raised = money(wish, progress.raised);
    const goal = money(wish, progress.goal);
    const cover = wish.iconUrl.startsWith('/') ? `${site}${wish.iconUrl}` : wish.iconUrl;
    return {
      type: 'article',
      id: wish.id,
      title: wish.title,
      description: t.progress(raised, goal, progress.count),
      ...(/^https:\/\//.test(cover) ? { thumbnail_url: cover } : {}),
      input_message_content: {
        message_text: `${t.inlineMsg(esc(wish.title), esc(wish.creatorName), raised, goal)}\n${url}`,
        parse_mode: 'HTML',
        link_preview_options: { url, prefer_large_media: true, show_above_text: false },
      },
      ...(/^https:\/\//.test(url) ? { reply_markup: { inline_keyboard: [[{ text: t.btnGift, url }]] } } : {}),
    };
  });

  await tg('answerInlineQuery', {
    inline_query_id: q.id,
    results,
    cache_time: byId ? 30 : 10,
    is_personal: !byId,
    // Нет своих вишлистов — кнопка над результатами ведёт в бота, где можно подключить кошелёк.
    ...(!results.length ? { button: { text: t.inlineConnect, start_parameter: 'connect' } } : {}),
  });
}

/** Обработка входящего апдейта бота. */
export async function handleUpdate(update: Update, site: string) {
  if (update.inline_query) return answerInline(update.inline_query, site);

  if (update.callback_query) {
    const cq = update.callback_query;
    await tg('answerCallbackQuery', { callback_query_id: cq.id });
    const chatId = cq.message?.chat?.id;
    if (!chatId) return;
    const lang = pickLang(cq.from?.language_code);
    if (cq.data === 'my') return sendWishlists(chatId, lang, site);
    if (cq.data === 'stats') return sendStats(chatId, lang, site);
    if (cq.data === 'help') return sendMessage(chatId, withBot(T[lang].help));
    return;
  }

  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (!msg || !chatId) return;
  const text = (msg.text || '').trim();
  const lang = pickLang(msg.from?.language_code);
  const [rawCmd, arg] = text.split(/\s+/, 2);
  const cmd = (rawCmd || '').replace(/@\w+$/, '').toLowerCase();

  // /id — показать chat id (нужен для TELEGRAM_ADMIN_CHAT_ID, куда приходят заявки от бизнеса).
  if (cmd === '/id') return sendMessage(chatId, `Chat id: <code>${chatId}</code>`);

  // В группах отвечаем только на явные команды, чтобы не мешать переписке.
  const isPrivate = !msg.chat?.type || msg.chat.type === 'private';

  switch (cmd) {
    case '/start':
      if (arg && /^[A-Za-z0-9]{24}$/.test(arg)) return linkWallet(chatId, arg, lang);
      return sendStart(chatId, lang, site);
    case '/wishlists':
    case '/my':
      return sendWishlists(chatId, lang, site);
    case '/stats':
      return sendStats(chatId, lang, site);
    case '/help':
      return sendMessage(chatId, withBot(T[lang].help), [[{ text: T[lang].btnMy, callback_data: 'my' }]]);
    case '/stop':
      return stop(chatId, lang, site);
    default:
      if (!isPrivate) return;
      return sendMessage(chatId, T[lang].unknown, [[{ text: T[lang].btnMy, callback_data: 'my' }]]);
  }
}

