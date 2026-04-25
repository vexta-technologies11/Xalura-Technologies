-- `publishAgenticArticle` and the site read `articles.subcategory`. If the table
-- predated this column, add it and refresh the API schema cache.
alter table public.articles add column if not exists subcategory text;

notify pgrst, 'reload schema';
