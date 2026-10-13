import 'server-only';
import { customAlphabet } from 'nanoid';
import { getSupabase } from './supabase';
import { DEFAULT_COVER } from '../covers';
import type { CreateWishInput } from '../validation';
import { wishIdSchema } from '../validation';
import type { Wish } from '../types';

interface WishRow {
  id: string;
  title: string;
  description: string | null;
  amount_sol: number | string;
  recipient_wallet: string;
  icon_url: string | null;
  creator_name: string | null;
  created_at?: string | null;
}

const newId = customAlphabet('0123456789abcdefghijkmnpqrstuvwxyz', 12);

function toWish(row: WishRow): Wish {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    amountSol: Number(row.amount_sol),
    recipientWallet: row.recipient_wallet,
    iconUrl: row.icon_url || DEFAULT_COVER,
    creatorName: row.creator_name || '',
    createdAt: row.created_at || null,
  };
}

/** null = вишлиста нет (или id некорректный). Ошибки базы пробрасываются. */
export async function getWish(id: string): Promise<Wish | null> {
  if (!wishIdSchema.safeParse(id).success) return null;
  const { data, error } = await getSupabase()
    .from('wishes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toWish(data as WishRow) : null;
}

export async function createWish(input: CreateWishInput): Promise<Wish> {
  const row = {
    id: `wish_${newId()}`,
    title: input.title,
    description: input.description || '',
    amount_sol: input.amountSol,
    recipient_wallet: input.recipientWallet,
    icon_url: input.iconUrl || DEFAULT_COVER,
    creator_name: input.creatorName,
  };
  const { data, error } = await getSupabase()
    .from('wishes')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return toWish(data as WishRow);
}
