-- Xalura — paste in Supabase → SQL Editor → Run (safe to re-run)

create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  name text not null default '',
  role text not null default '',
  role_badge text not null default '',
  description text not null default '',
  icon_type text not null default 'writer',
  avatar_url text,
  stats jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table employees add column if not exists avatar_url text;
alter table employees add column if not exists stats jsonb default '[]'::jsonb;
update employees set stats = '[]'::jsonb where stats is null;
alter table employees alter column stats set default '[]'::jsonb;
alter table employees alter column stats set not null;

create table if not exists partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  display_order integer not null default 0,
  is_active boolean not null default true
);

create table if not exists page_content (
  id uuid default gen_random_uuid() primary key,
  section text not null unique,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists agent_activity (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees (id) on delete set null,
  activity_text text not null,
  activity_type text not null,
  created_at timestamptz not null default now()
);

insert into employees (name, role, role_badge, description, icon_type, avatar_url, display_order)
select * from (values
  ('Mochi','Author and Publisher','Author · Publisher','Mochi writes and publishes GearMedic articles every day. She uses live trend research from Kimmy on what is popular and rising, turns it into clear explainers, then edits and ships them live. She keeps the library growing and deadlines met whether you watch every draft or not.','writer','/avatars/mochi.png',1),
  ('Maldita','SEO Manager','SEO Manager','Maldita audits the GearMedic site every day for SEO: where deeper internal links belong, which sentences and headings can rank better, and whether pages send the right signals to search. She finds deeplinking opportunities and reworks copy so the same traffic works harder — not keyword stuffing, just sharper on-page SEO.','seo','/avatars/maldita.svg',2),
  ('Kimmy','Researcher and Data Analyst','Data Analyst','Kimmy runs real-time data and trend research — what people search for most, what is spiking, and what is next. She tracks the latest and most popular automotive topics and turns that into briefs so Mochi always knows what to write and publish while it still matters.','analyst','/avatars/kimmy.png',3),
  ('Milka','Graphic Designer','Graphic Designer','Milka handles everything visual. Thumbnails, banners, social graphics, layout ideas. She makes sure the content the team produces actually looks good when it reaches people.','designer','/avatars/milka.png',4)
) as v(name, role, role_badge, description, icon_type, avatar_url, display_order)
where not exists (select 1 from employees limit 1);

insert into partners (name, logo_url, display_order)
select * from (values
  ('Amazon','/logos/amazon.svg',1),('AutoZone','/logos/autozone.svg',2),('eBay','/logos/ebay.svg',3),('RockAuto','/logos/rockauto.svg',4),
  ('O''Reilly Auto','/logos/oreilly.svg',5),('Google','/logos/google.svg',6),('Vercel','/logos/vercel.svg',7)
) as v(name, logo_url, display_order)
where not exists (select 1 from partners limit 1);

alter table employees enable row level security;
alter table partners enable row level security;
alter table page_content enable row level security;
alter table agent_activity enable row level security;

drop policy if exists "employees_select_public" on employees;
drop policy if exists "employees_write_authenticated" on employees;
drop policy if exists "partners_select_public" on partners;
drop policy if exists "partners_write_authenticated" on partners;
drop policy if exists "page_content_select_public" on page_content;
drop policy if exists "page_content_write_authenticated" on page_content;
drop policy if exists "agent_activity_select_authenticated" on agent_activity;
drop policy if exists "agent_activity_write_authenticated" on agent_activity;

create policy "employees_select_public" on employees for select to anon, authenticated using (true);
create policy "employees_write_authenticated" on employees for all to authenticated using (true) with check (true);
create policy "partners_select_public" on partners for select to anon, authenticated using (true);
create policy "partners_write_authenticated" on partners for all to authenticated using (true) with check (true);
create policy "page_content_select_public" on page_content for select to anon, authenticated using (true);
create policy "page_content_write_authenticated" on page_content for all to authenticated using (true) with check (true);
create policy "agent_activity_select_authenticated" on agent_activity for select to authenticated using (true);
create policy "agent_activity_write_authenticated" on agent_activity for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public) values ('employee-avatars', 'employee-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "employee_avatars_public_read" on storage.objects;
drop policy if exists "employee_avatars_authenticated_insert" on storage.objects;
drop policy if exists "employee_avatars_authenticated_update" on storage.objects;
drop policy if exists "employee_avatars_authenticated_delete" on storage.objects;

create policy "employee_avatars_public_read" on storage.objects for select to public using (bucket_id = 'employee-avatars');
create policy "employee_avatars_authenticated_insert" on storage.objects for insert to authenticated with check (bucket_id = 'employee-avatars');
create policy "employee_avatars_authenticated_update" on storage.objects for update to authenticated using (bucket_id = 'employee-avatars') with check (bucket_id = 'employee-avatars');
create policy "employee_avatars_authenticated_delete" on storage.objects for delete to authenticated using (bucket_id = 'employee-avatars');

-- Agentic article hero PNGs (`lib/articleCoverStorage.ts`). Service role uploads bypass RLS; public read for `getPublicUrl` on the site.
insert into storage.buckets (id, name, public) values ('article-covers', 'article-covers', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "article_covers_public_read" on storage.objects;
create policy "article_covers_public_read" on storage.objects for select to public using (bucket_id = 'article-covers');

-- ── Agent AI dashboard (API ingest + admin review + workload) ───────────────

create table if not exists agent_api_keys (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid not null references employees (id) on delete cascade,
  api_key text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (employee_id)
);

create table if not exists agent_updates (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees (id) on delete cascade,
  agent_external_id text not null default '',
  activity_text text not null,
  activity_type text not null default 'status',
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'declined')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint agent_updates_has_identifier check (
    employee_id is not null or length(trim(agent_external_id)) > 0
  )
);

create table if not exists agent_workload_daily (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid not null references employees (id) on delete cascade,
  day date not null default (timezone('utc', now()))::date,
  update_count integer not null default 0,
  unique (employee_id, day)
);

create or replace function public.agent_updates_workload_on_approve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.review_status = 'approved'
     and (old.review_status is distinct from 'approved')
     and new.employee_id is not null then
    insert into agent_workload_daily (employee_id, day, update_count)
    values (
      new.employee_id,
      (new.created_at at time zone 'utc')::date,
      1
    )
    on conflict (employee_id, day)
    do update set update_count = agent_workload_daily.update_count + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_agent_updates_workload on agent_updates;
create trigger tr_agent_updates_workload
  after update on agent_updates
  for each row
  execute function public.agent_updates_workload_on_approve();

-- Upgrade older agent_updates tables (nullable employee_id + external id for open ingest)
alter table agent_updates add column if not exists agent_external_id text not null default '';

update agent_updates u
set agent_external_id = left(
  case
    when trim(coalesce(e.name, '')) <> '' then trim(e.name)
    else u.employee_id::text
  end,
  200
)
from employees e
where u.employee_id is not null
  and e.id = u.employee_id
  and trim(coalesce(u.agent_external_id, '')) = '';

alter table agent_updates alter column employee_id drop not null;

alter table agent_updates drop constraint if exists agent_updates_has_identifier;
alter table agent_updates add constraint agent_updates_has_identifier check (
  employee_id is not null or length(trim(agent_external_id)) > 0
);

-- Next.js /api/agent-update uses SUPABASE_SERVICE_ROLE_KEY; the service_role JWT bypasses RLS.
-- Anon/authenticated policies below apply to clients using anon key, not server-side ingest.
alter table agent_api_keys enable row level security;
alter table agent_updates enable row level security;
alter table agent_workload_daily enable row level security;

drop policy if exists "agent_api_keys_authenticated" on agent_api_keys;
drop policy if exists "agent_updates_authenticated" on agent_updates;
drop policy if exists "agent_updates_public_approved" on agent_updates;
drop policy if exists "agent_workload_daily_select" on agent_workload_daily;

create policy "agent_api_keys_authenticated" on agent_api_keys
  for all to authenticated using (true) with check (true);

create policy "agent_updates_authenticated" on agent_updates
  for all to authenticated using (true) with check (true);

create policy "agent_updates_public_approved" on agent_updates
  for select to anon
  using (review_status = 'approved' and employee_id is not null);

create policy "agent_workload_daily_select" on agent_workload_daily
  for select to anon, authenticated using (true);

-- Realtime (idempotent): any row in `employees` can have keys/updates — not tied to seed names.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'agent_updates'
  ) then
    execute 'alter publication supabase_realtime add table public.agent_updates';
  end if;
end
$$;

-- ── Articles / courses (public site subpages) ────────────────────────────────

create table if not exists articles (
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
  subcategory text
);

-- If `articles` existed before `subcategory`, add the column in existing DBs.
alter table articles add column if not exists subcategory text;

create table if not exists courses (
  id uuid default gen_random_uuid() primary key,
  slug text not null unique,
  title text not null,
  description text,
  cover_image_url text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid not null references courses (id) on delete cascade,
  title text not null,
  body text,
  video_url text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table articles enable row level security;
alter table courses enable row level security;
alter table lessons enable row level security;

drop policy if exists "articles_select_public" on articles;
drop policy if exists "articles_write_authenticated" on articles;
drop policy if exists "courses_select_public" on courses;
drop policy if exists "courses_write_authenticated" on courses;
drop policy if exists "lessons_select_public" on lessons;
drop policy if exists "lessons_write_authenticated" on lessons;

create policy "articles_select_public" on articles
  for select to anon, authenticated using (is_published = true);

create policy "articles_write_authenticated" on articles
  for all to authenticated using (true) with check (true);

create policy "courses_select_public" on courses
  for select to anon, authenticated using (is_published = true);

create policy "courses_write_authenticated" on courses
  for all to authenticated using (true) with check (true);

create policy "lessons_select_public" on lessons
  for select to anon, authenticated using (
    exists (
      select 1 from courses c
      where c.id = lessons.course_id and c.is_published = true
    )
  );

create policy "lessons_write_authenticated" on lessons
  for all to authenticated using (true) with check (true);

insert into articles (slug, title, excerpt, body, author, is_published, published_at)
select * from (values
  (
    'internal-links-that-rank',
    'Internal links that actually rank',
    'How Maldita maps pages to stronger anchors without stuffing keywords.',
    'Maldita audits the GearMedic library for missed internal links: pages that should reference each other, anchors that describe intent, and headings that reinforce the topic cluster. The goal is not volume — it is clarity for readers and crawlers alike.',
    'Maldita',
    true,
    now() - interval '3 days'
  ),
  (
    'research-to-publish-pipeline',
    'From research spike to published draft',
    'Turning Kimmy''s briefs into shippable articles the same week they matter.',
    'When a topic spikes, the window is short. This walkthrough covers how briefs land in the queue, how Mochi drafts against a tight outline, and how Maldita tightens on-page signals before publish — so the same traffic works harder.',
    'Maldita',
    true,
    now() - interval '8 days'
  ),
  (
    'thumbnail-readability-checklist',
    'Thumbnail readability checklist',
    'Milka''s quick pass for contrast, subject, and title legibility at small sizes.',
    'Before a thumbnail ships, it has to read on a phone in a noisy feed. This checklist covers safe margins, type weight, brand color balance, and when to simplify the scene so the title stays legible.',
    'Maldita',
    true,
    now() - interval '14 days'
  )
) as v(slug, title, excerpt, body, author, is_published, published_at)
where not exists (select 1 from articles where slug = v.slug);

insert into courses (slug, title, description, is_published, display_order)
select * from (values
  (
    'automotive-content-ops',
    'Automotive content operations',
    'End-to-end workflow: research, drafting, SEO pass, and publish — tuned for GearMedic.',
    true,
    1
  ),
  (
    'visual-system-for-articles',
    'Visual system for articles',
    'Covers, social crops, and in-article graphics that stay on brand.',
    true,
    2
  )
) as v(slug, title, description, is_published, display_order)
where not exists (select 1 from courses where slug = v.slug);

insert into lessons (course_id, title, body, display_order)
select c.id, v.title, v.body, v.display_order
from courses c
cross join (values
  (
    'automotive-content-ops',
    'Research signals that matter',
    'How to read spikes, seasonality, and intent before you commit a headline.',
    1
  ),
  (
    'automotive-content-ops',
    'Drafting with a fixed outline',
    'Keep sections parallel, claims sourced, and CTAs honest.',
    2
  ),
  (
    'visual-system-for-articles',
    'Cover hierarchy',
    'Title, subtitle, and focal subject — what wins in the first 500ms.',
    1
  ),
  (
    'visual-system-for-articles',
    'Export presets',
    'Safe margins for YouTube, X, and in-feed cards.',
    2
  )
) as v(course_slug, title, body, display_order)
where c.slug = v.course_slug
  and not exists (
    select 1 from lessons l
    where l.course_id = c.id and l.display_order = v.display_order
  );

-- ── Agentic SEO topic bank (optional; survives read-only edge filesystems) ─
-- When `AGENTIC_TOPIC_BANK_USE_SUPABASE=true`, pipelines read/write this row instead of only `xalura-agentic/state/topic-bank.json`.
-- Service role bypasses RLS; do not grant anon/authenticated access to this table.
create table if not exists public.agentic_topic_bank (
  id text primary key default 'default',
  data jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.agentic_topic_bank is 'Agentic SEO topic vault JSON (`TopicBankFile`). Written by service role from Next/API routes.';

alter table public.agentic_topic_bank enable row level security;

-- Worker / Manager / Executive stage awareness (Supabase; service role only).
create table if not exists public.agentic_pipeline_stage_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  release_id text,
  department text not null,
  agent_lane_id text,
  stage text not null,
  event text not null,
  summary text not null,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists agentic_pipeline_stage_log_created_at_idx
  on public.agentic_pipeline_stage_log (created_at desc);
create index if not exists agentic_pipeline_stage_log_dept_idx
  on public.agentic_pipeline_stage_log (department, created_at desc);

comment on table public.agentic_pipeline_stage_log is 'Per-stage log from runDepartmentPipeline (Worker/Manager/Executive). Used for Chief awareness; insert via SUPABASE_SERVICE_ROLE_KEY only.';

alter table public.agentic_pipeline_stage_log enable row level security;
-- RLS: no policies — anon/authenticated blocked; service role bypasses for inserts/reads from app.

notify pgrst, 'reload schema';
