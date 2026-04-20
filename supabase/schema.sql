-- Run in Supabase SQL editor. Adjust RLS policies for your security model.

create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null,
  role_badge text not null,
  description text not null,
  icon_type text not null default 'writer',
  avatar_url text,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

alter table employees add column if not exists avatar_url text;
alter table employees add column if not exists stats jsonb default '[]'::jsonb;

create table if not exists partners (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  display_order integer default 0,
  is_active boolean default true
);

create table if not exists page_content (
  id uuid default gen_random_uuid() primary key,
  section text not null unique,
  content jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists agent_activity (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete set null,
  activity_text text not null,
  activity_type text not null,
  created_at timestamptz default now()
);

insert into employees (name, role, role_badge, description, icon_type, avatar_url, display_order) values
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
  '/avatars/maldita.png',
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
);

insert into partners (name, logo_url, display_order) values
('Amazon', '/logos/amazon.svg', 1),
('AutoZone', '/logos/autozone.svg', 2),
('eBay', '/logos/ebay.svg', 3),
('RockAuto', '/logos/rockauto.svg', 4),
('O''Reilly Auto', '/logos/oreilly.svg', 5),
('Google', '/logos/google.svg', 6),
('Vercel', '/logos/vercel.svg', 7);

-- Row Level Security: public can read marketing data; only signed-in users can write.
-- Run this after tables exist. Safe to re-run if you drop policies first.

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

-- Public site: anyone with anon key can read these tables.
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

-- Activity log is not used on the public homepage; lock to authenticated only.
create policy "agent_activity_select_authenticated"
  on agent_activity for select
  to authenticated
  using (true);

create policy "agent_activity_write_authenticated"
  on agent_activity for all
  to authenticated
  using (true)
  with check (true);
