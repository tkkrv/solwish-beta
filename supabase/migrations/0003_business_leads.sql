-- SolWish beta 0.5: заявки от бизнеса со страницы «Тарифы».
-- Запись и чтение только с сервера (service_role); публичного доступа нет.

create table if not exists public.business_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  company text check (char_length(company) <= 120),
  contact text not null check (char_length(contact) between 3 and 120),
  kind text not null default 'other',
  message text check (char_length(message) <= 1000),
  locale text
);

alter table public.business_leads enable row level security;
-- Политик нет намеренно: anon-ключ не может ни читать, ни писать заявки.
