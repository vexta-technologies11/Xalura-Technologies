-- Distinguish Resend threads: Chief vs Head of News vs Chief of Audit (News) — same messages table, tagged thread row.
alter table public.chief_email_threads
  add column if not exists inbox text not null default 'chief';

create index if not exists chief_email_threads_inbox_idx
  on public.chief_email_threads (inbox, created_at desc);

comment on column public.chief_email_threads.inbox is
  'Inbound persona: chief | head_of_news | chief_of_audit_news (drives reply agent + optional UI).';
