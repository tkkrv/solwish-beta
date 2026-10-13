import 'server-only';
import { customAlphabet } from 'nanoid';
import { getSupabase } from './supabase';
import { DEFAULT_COVER } from '../covers';
import type { CreateWishInput, UpdateWishInput } from '../validation';
import { wishIdSchema } from '../validation';
import { CURRENCIES, type Currency, type Wish, type WishItem } from '../types';

interface WishRow {
  id: string;
  title: string;
  description: string | null;
  amount_sol: number | string;
  recipient_wallet: string;
  icon_url: string | null;
  creator_name: string | null;
  created_at?: string | null;
  creator_wallet?: string | null;
  event_date?: string | null;
  goal_currency?: string | null;
  goal_fiat?: number | string | null;
  items?: unknown;
  closed?: boolean | null;
}

const newId = customAlphabet('0123456789abcdefghijkmnpqrstuvwxyz', 12);

function parseItems(raw: unknown): WishItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === 'object')
    .map((x: { id?: unknown; title?: unknown; goal?: unknown }) => ({
      id: String(x.id ?? ''),
      title: String(x.title ?? ''),
      goal: Number(x.goal ?? 0),
    }))
    .filter((x) => /^i\d{1,2}$/.test(x.id) && x.title && x.goal > 0);
}

function toWish(row: WishRow): Wish {
  const currency = (CURRENCIES as readonly string[]).includes(row.goal_currency || '')
    ? (row.goal_currency as Currency)
    : 'SOL';
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    amountSol: Number(row.amount_sol),
    recipientWallet: row.recipient_wallet,
    iconUrl: row.icon_url || DEFAULT_COVER,
    creatorName: row.creator_name || '',
    createdAt: row.created_at || null,
    creatorWallet: row.creator_wallet || null,
    eventDate: row.event_date || null,
    goalCurrency: currency,
    goalFiat: row.goal_fiat != null && currency !== 'SOL' ? Number(row.goal_fiat) : null,
    items: parseItems(row.items),
    closed: Boolean(row.closed),
  };
}

/** null = вишлиста нет (или id некорректный). Ошибки базы пробрасываются. */
export async function getWish(id: string): Promise<Wish | null> {
  if (!wishIdSchema.safeParse(id).success) return null;
  const { data, error } = await getSupabase().from('wishes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toWish(data as WishRow) : null;
}

export async function createWish(
  input: CreateWishInput,
  computed: { amountSol: number; goalFiat: number | null; creatorWallet: string | null }
): Promise<Wish> {
  const items = (input.items || []).map((it, idx) => ({
    id: `i${idx + 1}`,
    title: it.title,
    goal: Math.round(it.goal * 100) / 100,
  }));
  const row: Record<string, unknown> = {
    id: `wish_${newId()}`,
    title: input.title,
    description: input.description || '',
    amount_sol: computed.amountSol,
    recipient_wallet: input.recipientWallet,
    icon_url: input.iconUrl || DEFAULT_COVER,
    creator_name: input.creatorName,
  };
  // Новые колонки (миграция 0002) пишем только если они нужны,
  // чтобы простые вишлисты создавались и на базе без миграции.
  if (computed.creatorWallet) row.creator_wallet = computed.creatorWallet;
  if (input.eventDate) row.event_date = input.eventDate;
  if (input.goalCurrency !== 'SOL') {
    row.goal_currency = input.goalCurrency;
    row.goal_fiat = computed.goalFiat;
  }
  if (items.length) row.items = items;

  const { data, error } = await getSupabase().from('wishes').insert([row]).select().single();
  if (error) throw error;
  return toWish(data as WishRow);
}

export async function updateWish(id: string, patch: UpdateWishInput): Promise<Wish | null> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.creatorName !== undefined) row.creator_name = patch.creatorName;
  if (patch.iconUrl !== undefined) row.icon_url = patch.iconUrl;
  if (patch.eventDate !== undefined) row.event_date = patch.eventDate;
  if (patch.closed !== undefined) row.closed = patch.closed;
  const { data, error } = await getSupabase()
    .from('wishes')
    .update(row)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? toWish(data as WishRow) : null;
}

export async function deleteWish(id: string): Promise<void> {
  const { error } = await getSupabase().from('wishes').delete().eq('id', id);
  if (error) throw error;
}

/** Вишлисты, где кошелёк — получатель или подтверждённый создатель. */
export async function listWishesByWallet(wallet: string): Promise<Wish[]> {
  const sb = getSupabase();
  const [asRecipient, asCreator] = await Promise.all([
    sb.from('wishes').select('*').eq('recipient_wallet', wallet).order('created_at', { ascending: false }).limit(50),
    sb.from('wishes').select('*').eq('creator_wallet', wallet).order('created_at', { ascending: false }).limit(50),
  ]);
  if (asRecipient.error) throw asRecipient.error;
  // Если миграция 0002 не применена, колонки creator_wallet нет — показываем только «как получатель».
  const rows = [...(asRecipient.data || []), ...(asCreator.error ? [] : asCreator.data || [])] as WishRow[];
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .map(toWish)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Может ли кошелёк управлять вишлистом. */
export function canManage(wish: Wish, wallet: string): boolean {
  return wallet === wish.recipientWallet || (!!wish.creatorWallet && wallet === wish.creatorWallet);
}
