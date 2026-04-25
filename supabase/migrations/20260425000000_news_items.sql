-- Public news (agentic News team) + run timeline for Head of News
create table if not exists news_items (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_image_url text,
  author text,
  published_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  track text,
  source_citations jsonb
);

create index if not exists news_items_published_at_idx
  on news_items (published_at desc nulls last)
  where is_published = true;

create table if not exists news_run_events (
  id uuid default gen_random_uuid() primary key,
  run_id text not null,
  stage text not null,
  summary text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists news_run_events_run_id_idx on news_run_events (run_id, created_at);

alter table news_items enable row level security;
alter table news_run_events enable row level security;

drop policy if exists "news_items_select_public" on news_items;
drop policy if exists "news_items_write_authenticated" on news_items;
drop policy if exists "news_run_events_authenticated" on news_run_events;
drop policy if exists "news_run_events_select_auth" on news_run_events;

create policy "news_items_select_public" on news_items
  for select to anon, authenticated using (is_published = true);

create policy "news_items_write_authenticated" on news_items
  for all to authenticated using (true) with check (true);

-- Inserts: service role only (bypasses RLS). Optional: authenticated select for future admin.
create policy "news_run_events_select_auth" on news_run_events
  for select to authenticated using (true);

comment on table news_items is 'Agentic News team published stories';
comment on table news_run_events is 'Head of News / pipeline stage log (run_id = one pipeline execution)';
