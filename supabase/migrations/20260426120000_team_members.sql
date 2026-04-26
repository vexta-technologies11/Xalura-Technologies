-- Public "Meet the team" directory (separate from AI `employees` personas)

create table if not exists team_members (
  id uuid default gen_random_uuid() primary key,
  name text not null default '',
  title text not null default '',
  department text not null default 'leadership',
  /** Short note for the small corner badge, e.g. "US" or a region (optional) */
  region_badge text,
  avatar_url text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists team_members_department_idx on team_members(department);
create index if not exists team_members_order_idx on team_members(display_order);

alter table team_members enable row level security;

drop policy if exists "team_members_select_public" on team_members;
drop policy if exists "team_members_write_authenticated" on team_members;

create policy "team_members_select_public" on team_members for select to anon, authenticated using (true);
create policy "team_members_write_authenticated" on team_members for all to authenticated using (true) with check (true);
