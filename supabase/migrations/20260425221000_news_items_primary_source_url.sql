alter table news_items
  add column if not exists primary_source_url text;

comment on column news_items.primary_source_url is 'Canonical primary source URL for a published News story (used to keep already-published stories out of future pools)';
