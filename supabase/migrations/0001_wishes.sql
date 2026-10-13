-- SolWish beta: таблица вишлистов и правила доступа (RLS).
-- Запуск: Supabase Dashboard → SQL Editor, либо `supabase db push`.
--
-- ВАЖНО: если beta использует ТУ ЖЕ базу, что и версия для Colosseum,
-- то после включения RLS старая версия перестанет создавать вишлисты
-- (она пишет в базу anon-ключом). Для beta лучше создать отдельный проект Supabase.

create table if not exists public.wishes (
  id               text primary key check (id ~ '^wish_[A-Za-z0-9_-]{5,32}$'),
  title            text not null check (char_length(title) between 2 and 80),
  description      text not null default '' check (char_length(description) <= 500),
  amount_sol       numeric(20, 9) not null check (amount_sol > 0 and amount_sol <= 10000),
  recipient_wallet text not null check (char_length(recipient_wallet) between 32 and 44),
  icon_url         text not null default '/covers/gift.jpg' check (char_length(icon_url) <= 500),
  creator_name     text not null default '' check (char_length(creator_name) <= 32),
  created_at       timestamptz not null default now()
);

create index if not exists wishes_recipient_wallet_idx on public.wishes (recipient_wallet);

alter table public.wishes enable row level security;

-- Читать вишлисты может кто угодно (страница вишлиста и Blink публичные).
drop policy if exists "wishes are public" on public.wishes;
create policy "wishes are public"
  on public.wishes for select
  to anon, authenticated
  using (true);

-- Политик на insert/update/delete для anon НЕТ намеренно:
-- создаёт вишлисты только сервер (API /api/wishes) с SUPABASE_SERVICE_ROLE_KEY,
-- который обходит RLS. Так никто не сможет подменить recipient_wallet в чужом вишлисте.
