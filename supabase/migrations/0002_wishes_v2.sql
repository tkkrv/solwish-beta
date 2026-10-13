-- SolWish beta v2: владелец, дата события, цель в фиате, несколько желаний, закрытие сбора,
-- привязка Telegram и дедупликация уведомлений.
-- Запуск после 0001: Supabase Dashboard → SQL Editor → Run.

alter table public.wishes
  add column if not exists creator_wallet text
    check (creator_wallet is null or char_length(creator_wallet) between 32 and 44),
  add column if not exists event_date date,
  add column if not exists goal_currency text not null default 'SOL'
    check (goal_currency in ('SOL', 'USD', 'KZT', 'RUB', 'EUR')),
  add column if not exists goal_fiat numeric(20, 2)
    check (goal_fiat is null or goal_fiat > 0),
  -- [{ "id": "i1", "title": "Наушники", "goal": 50000 }] — goal в валюте goal_currency
  add column if not exists items jsonb
    check (items is null or jsonb_typeof(items) = 'array'),
  add column if not exists closed boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists wishes_creator_wallet_idx on public.wishes (creator_wallet);

-- Telegram: какой чат уведомлять о подарках на кошелёк.
create table if not exists public.telegram_links (
  wallet     text primary key check (char_length(wallet) between 32 and 44),
  chat_id    bigint not null,
  lang       text not null default 'ru',
  created_at timestamptz not null default now()
);

-- Одноразовые токены для привязки (/start <token> в боте).
create table if not exists public.telegram_link_tokens (
  token      text primary key,
  wallet     text not null,
  expires_at timestamptz not null
);

-- Подписи, о которых уже отправили уведомление (чтобы не слать дважды).
create table if not exists public.notified_signatures (
  signature  text primary key,
  created_at timestamptz not null default now()
);

-- Эти таблицы читает и пишет только сервер (service_role обходит RLS).
alter table public.telegram_links enable row level security;
alter table public.telegram_link_tokens enable row level security;
alter table public.notified_signatures enable row level security;
