-- Singleton row tracks last Marketing → Zernio post time for cooldown (service role only; RLS enabled, no public policies).
create table if not exists public.agentic_marketing_zernio_state (
  id text primary key default 'default' check (id = 'default'),
  last_post_at timestamptz not null,
  updated_at timestamptz not null default now()
);

comment on table public.agentic_marketing_zernio_state is 'One row: last time Marketing pipeline posted to Zernio; used for minimum hours between posts.';

alter table public.agentic_marketing_zernio_state enable row level security;
