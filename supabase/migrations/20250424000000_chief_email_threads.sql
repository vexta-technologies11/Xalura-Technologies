-- Chief ↔ allowlisted operator email (thread context for inbound replies; service role only).
-- Idempotent: safe to re-run.

create table if not exists public.chief_email_threads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chief_email_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid not null references public.chief_email_threads (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  rfc_message_id text,
  in_reply_to text,
  resend_inbound_id text,
  resend_outbound_id text,
  from_addr text not null default '',
  to_addr text,
  subject text,
  body_text text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists chief_email_messages_rfc_unique
  on public.chief_email_messages (rfc_message_id) where rfc_message_id is not null;
create unique index if not exists chief_email_messages_resend_inbound_unique
  on public.chief_email_messages (resend_inbound_id) where resend_inbound_id is not null;
create index if not exists chief_email_messages_thread_created_idx
  on public.chief_email_messages (thread_id, created_at asc);

comment on table public.chief_email_threads is 'Resend inbound/outbound email thread. Insert via SUPABASE_SERVICE_ROLE_KEY only; used for Chief back-read.';
comment on table public.chief_email_messages is 'Message bodies and RFC Message-Ids for `chief` threading; set CHIEF_EMAIL_THREAD_LOG_DISABLE=true to skip.';

alter table public.chief_email_threads enable row level security;
alter table public.chief_email_messages enable row level security;

notify pgrst, 'reload schema';
