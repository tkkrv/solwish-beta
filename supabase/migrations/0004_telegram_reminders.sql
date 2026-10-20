-- SolWish beta: напоминания бота о дате события (каждое отправляется один раз).
-- Запуск после 0003: Supabase Dashboard → SQL Editor → Run.

create table if not exists public.telegram_reminders (
  wish_id    text not null,
  kind       text not null check (kind in ('d3', 'd1', 'summary')),
  created_at timestamptz not null default now(),
  primary key (wish_id, kind)
);

-- Пишет и читает только сервер (service_role обходит RLS).
alter table public.telegram_reminders enable row level security;

-- Бот ищет привязки по чату (/wishlists, /stop, inline-режим).
create index if not exists telegram_links_chat_id_idx on public.telegram_links (chat_id);
