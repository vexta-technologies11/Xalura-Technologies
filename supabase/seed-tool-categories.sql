-- Run this in Supabase SQL Editor to create default categories and assign tools

-- Create categories
insert into tool_categories (name, display_order)
select 'Writing & Communication', 0
where not exists (select 1 from tool_categories where name = 'Writing & Communication');

insert into tool_categories (name, display_order)
select 'Productivity & Analysis', 1
where not exists (select 1 from tool_categories where name = 'Productivity & Analysis');

insert into tool_categories (name, display_order)
select 'Business & Career', 2
where not exists (select 1 from tool_categories where name = 'Business & Career');
-- Assign tools to categories
do $$
declare
  v_id uuid;
begin
  -- Writing & Communication
  select id into v_id from tool_categories where name = 'Writing & Communication' limit 1;
  if v_id is not null then
    insert into tool_category_items (category_id, tool_id, display_order)
    select v_id, t, d from (values
      ('email', 0), ('content', 1), ('letter', 2), ('captions', 3), ('translator', 4), ('report', 5)
    ) as v(t, d)
    where not exists (select 1 from tool_category_items where category_id = v_id and tool_id = v.t);
  end if;

  -- Productivity & Analysis
  select id into v_id from tool_categories where name = 'Productivity & Analysis' limit 1;
  if v_id is not null then
    insert into tool_category_items (category_id, tool_id, display_order)
    select v_id, t, d from (values
      ('summarizer', 0), ('study', 1), ('presentation', 2)
    ) as v(t, d)
    where not exists (select 1 from tool_category_items where category_id = v_id and tool_id = v.t);
  end if;

  -- Business & Career
  select id into v_id from tool_categories where name = 'Business & Career' limit 1;
  if v_id is not null then
    insert into tool_category_items (category_id, tool_id, display_order)
    select v_id, t, d from (values
      ('invoice', 0), ('resume', 1)
    ) as v(t, d)
    where not exists (select 1 from tool_category_items where category_id = v_id and tool_id = v.t);
  end if;
end $$;

