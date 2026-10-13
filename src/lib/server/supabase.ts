import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
}

/**
 * Серверный клиент Supabase. Браузер к базе напрямую больше не ходит.
 * Предпочитаем service-role ключ (при включённом RLS anon может только читать).
 * Anon-ключ остаётся запасным вариантом, чтобы beta запускалась на старой базе.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new DatabaseNotConfiguredError();
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
