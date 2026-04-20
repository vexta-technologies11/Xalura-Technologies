-- =============================================================================
-- Xalura site — full Supabase schema (single file)
-- Run the whole script in: Dashboard → SQL Editor → Run
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS / ON CONFLICT where possible
-- After changes, PostgREST reloads at the bottom (NOTIFY pgrst).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES (public)
--    Used by: lib/data.ts, admin pages, HomepageEditor, EmployeeForm, PartnerEditor
-- -----------------------------------------------------------------------------

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

-- Older databases: add columns without breaking existing rows
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

create index if not exists employees_display_order_idx on employees (display_order);
create index if not exists partners_display_order_idx on partners (display_order);
create index if not exists page_content_section_idx on page_content (section);
create index if not exists agent_activity_employee_id_idx on agent_activity (employee_id);

comment on table employees is 'AI team members for marketing site + admin';
comment on table partners is 'Partner logos / links for marketing site';
comment on table page_content is 'Homepage JSON per section (hero, mission, gearmedic, …)';
comment on table agent_activity is 'Optional activity log (authenticated-only via RLS)';

-- Keep updated_at fresh when content JSON is saved (HomepageEditor upsert)
create or replace function public.set_page_content_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_page_content_updated_at on page_content;
create trigger trg_page_content_updated_at
  before update on page_content
  for each row
  execute procedure public.set_page_content_updated_at ();

-- -----------------------------------------------------------------------------
-- 2. SEED DATA (only if tables are empty — avoids duplicate rows on re-run)
-- -----------------------------------------------------------------------------

insert into employees (name, role, role_badge, description, icon_type, avatar_url, display_order)
select * from (values
  (
    'Mochi',
    'Author and Publisher',
    'Author · Publisher',
    'Mochi writes and publishes GearMedic articles every day. She uses live trend research from Kimmy on what is popular and rising, turns it into clear explainers, then edits and ships them live. She keeps the library growing and deadlines met whether you watch every draft or not.',
    'writer',
    '/avatars/mochi.png',
    1
  ),
  (
    'Maldita',
    'SEO Manager',
    'SEO Manager',
    'Maldita audits the GearMedic site every day for SEO: where deeper internal links belong, which sentences and headings can rank better, and whether pages send the right signals to search. She finds deeplinking opportunities and reworks copy so the same traffic works harder — not keyword stuffing, just sharper on-page SEO.',
    'seo',
    '/avatars/maldita.svg',
    2
  ),
  (
    'Kimmy',
    'Researcher and Data Analyst',
    'Data Analyst',
    'Kimmy runs real-time data and trend research — what people search for most, what is spiking, and what is next. She tracks the latest and most popular automotive topics and turns that into briefs so Mochi always knows what to write and publish while it still matters.',
    'analyst',
    '/avatars/kimmy.png',
    3
  ),
  (
    'Milka',
    'Graphic Designer',
    'Graphic Designer',
    'Milka handles everything visual. Thumbnails, banners, social graphics, layout ideas. She makes sure the content the team produces actually looks good when it reaches people.',
    'designer',
    '/avatars/milka.png',
    4
  )
) as v(name, role, role_badge, description, icon_type, avatar_url, display_order)
where not exists (select 1 from employees limit 1);

insert into partners (name, logo_url, display_order)
select * from (values
  ('Amazon', '/logos/amazon.svg', 1),
  ('AutoZone', '/logos/autozone.svg', 2),
  ('eBay', '/logos/ebay.svg', 3),
  ('RockAuto', '/logos/rockauto.svg', 4),
  ('O''Reilly Auto', '/logos/oreilly.svg', 5),
  ('Google', '/logos/google.svg', 6),
  ('Vercel', '/logos/vercel.svg', 7)
) as v(name, logo_url, display_order)
where not exists (select 1 from partners limit 1);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (anon read marketing data; authenticated write)
-- -----------------------------------------------------------------------------

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

create policy "employees_select_public"
  on employees for select
  to anon, authenticated
  using (true);

create policy "employees_write_authenticated"
  on employees for all
  to authenticated
  using (true)
  with check (true);

create policy "partners_select_public"
  on partners for select
  to anon, authenticated
  using (true);

create policy "partners_write_authenticated"
  on partners for all
  to authenticated
  using (true)
  with check (true);

create policy "page_content_select_public"
  on page_content for select
  to anon, authenticated
  using (true);

create policy "page_content_write_authenticated"
  on page_content for all
  to authenticated
  using (true)
  with check (true);

create policy "agent_activity_select_authenticated"
  on agent_activity for select
  to authenticated
  using (true);

create policy "agent_activity_write_authenticated"
  on agent_activity for all
  to authenticated
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 4. STORAGE — employee avatar uploads (EmployeeForm → bucket employee-avatars)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('employee-avatars', 'employee-avatars', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "employee_avatars_public_read" on storage.objects;
drop policy if exists "employee_avatars_authenticated_insert" on storage.objects;
drop policy if exists "employee_avatars_authenticated_update" on storage.objects;
drop policy if exists "employee_avatars_authenticated_delete" on storage.objects;

-- Storage RLS is enabled by default on Supabase for storage.objects
create policy "employee_avatars_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'employee-avatars');

create policy "employee_avatars_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'employee-avatars');

create policy "employee_avatars_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'employee-avatars')
  with check (bucket_id = 'employee-avatars');

create policy "employee_avatars_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'employee-avatars');

-- -----------------------------------------------------------------------------
-- 5. Reload PostgREST schema cache (fixes “column not in schema cache” in API)
-- -----------------------------------------------------------------------------

notify pgrst, 'reload schema';
