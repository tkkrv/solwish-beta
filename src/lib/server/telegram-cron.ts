import 'server-only';
import { getSupabase } from './supabase';
import { listWishesByWallet } from './wishes';
import { getWishGifts } from './chain';
import { computeProgress, daysUntil } from '../progress';
import { TELEGRAM_ENABLED, money, notifyNewGifts, sendMessage, wishButtons, wishUrl, type TgLink } from './telegram';
import { kzNow } from './telegram-bot';
import { T, esc, pickLang } from './telegram-texts';
import type { Gift, Wish } from '../types';

const MAX_WISHES = 60;

type Kind = 'd3' | 'd1' | 'summary';

/** Какое напоминание положено сегодня (каждое отправляется один раз — таблица telegram_reminders). */
function reminderKind(wish: Wish, days: number | null, raised: number, goal: number, count: number): Kind | null {
  if (days == null) return null;
  const fresh = wish.createdAt && Date.now() - Date.parse(wish.createdAt) < 12 * 3_600_000;
  const short = goal > 0 && raised < goal;
  if (!wish.closed && !fresh && short && days >= 2 && days <= 3) return 'd3';
  if (!wish.closed && !fresh && short && days >= 0 && days <= 1) return 'd1';
  if (days >= -3 && days <= -1 && count > 0) return 'summary';
  return null;
}

async function claimReminder(wishId: string, kind: Kind): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('telegram_reminders')
    .upsert([{ wish_id: wishId, kind }], { onConflict: 'wish_id,kind', ignoreDuplicates: true })
    .select('wish_id');
  if (error) {
    // Миграция 0004 не применена — напоминания просто не шлём.
    console.error('[telegram cron] reminders:', error.message);
    return false;
  }
  return Boolean(data?.length);
}

async function remind(wish: Wish, gifts: Gift[], links: TgLink[], site: string): Promise<boolean> {
  const p = computeProgress(wish, gifts, null);
  const days = daysUntil(wish.eventDate, kzNow());
  const kind = reminderKind(wish, days, p.raised, p.goal, p.count);
  if (!kind || days == null) return false;
  const chats = links.filter((l) => l.wallet === wish.recipientWallet || l.wallet === wish.creatorWallet);
  if (!chats.length || !(await claimReminder(wish.id, kind))) return false;

  const seen = new Set<number>();
  for (const link of chats) {
    if (seen.has(link.chat_id)) continue;
    seen.add(link.chat_id);
    const t = T[pickLang(link.lang)];
    if (kind === 'summary') {
      const names = [...new Set(gifts.filter((g) => g.from && !g.anonymous && !g.hidden).map((g) => esc(g.from)))];
      const list = names.slice(0, 10).join(', ') + (names.length > 10 ? '…' : '');
      await sendMessage(link.chat_id, t.summary(esc(wish.title), p.count, money(wish, p.raised), list), [
        [{ text: t.btnOpen, url: wishUrl(site, wish) }],
      ]);
    } else {
      const left = money(wish, Math.max(p.goal - p.raised, 0));
      await sendMessage(link.chat_id, t.remind(esc(wish.title), days, money(wish, p.raised), money(wish, p.goal), left), [
        wishButtons(site, wish, t),
      ]);
    }
  }
  return true;
}

/**
 * Запускается по расписанию:
 * 1) проверяет подарки на вишлисты с подключённым Telegram — уведомления приходят, даже если страницу никто не открывал;
 * 2) отправляет напоминания за 3 дня и за 1 день до события и итоги после него.
 */
export async function runTelegramCron(site: string) {
  if (!TELEGRAM_ENABLED) return { enabled: false };
  const { data, error } = await getSupabase().from('telegram_links').select('*');
  if (error) throw error;
  const links = (data || []) as TgLink[];
  const wallets = [...new Set(links.map((l) => l.wallet))];

  const seen = new Set<string>();
  const wishes: Wish[] = [];
  for (const w of wallets) {
    for (const wish of await listWishesByWallet(w).catch(() => [] as Wish[])) {
      if (seen.has(wish.id)) continue;
      seen.add(wish.id);
      const days = daysUntil(wish.eventDate, kzNow());
      // Закрытые сборы проверяем только ради итогов сразу после события.
      if (wish.closed && !(days != null && days >= -3 && days <= -1)) continue;
      wishes.push(wish);
    }
  }
  wishes.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  let checked = 0;
  let reminders = 0;
  let failed = 0;
  const queue = wishes.slice(0, MAX_WISHES);
  // По 3 вишлиста параллельно — чтобы не упереться в лимиты RPC.
  for (let i = 0; i < queue.length; i += 3) {
    await Promise.all(
      queue.slice(i, i + 3).map(async (wish) => {
        try {
          const { gifts } = await getWishGifts(wish);
          await notifyNewGifts(wish, gifts, site);
          if (await remind(wish, gifts, links, site)) reminders++;
          checked++;
        } catch (err) {
          failed++;
          console.error('[telegram cron]', wish.id, (err as Error).message);
        }
      })
    );
  }
  return { enabled: true, wallets: wallets.length, wishes: wishes.length, checked, reminders, failed };
}
