/** Serializable article row for the public library (client-safe). */
export type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  author: string | null;
  published_at: string | null;
  subcategory: string | null;
};
