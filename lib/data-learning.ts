import { createClient } from "@/lib/supabase/server";
import type { ArticleRow, CourseRow, LessonRow, NewsRow } from "@/types/learning";

function hasSupabaseEnv() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getPublishedArticles(): Promise<ArticleRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data as ArticleRow[];
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<ArticleRow | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as ArticleRow;
  } catch {
    return null;
  }
}

export async function getPublishedNews(): Promise<NewsRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("news_items")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data as NewsRow[];
  } catch {
    return [];
  }
}

export async function getLatestNews(limit: number): Promise<NewsRow[]> {
  if (!hasSupabaseEnv()) return [];
  const n = Math.max(1, Math.min(Math.floor(limit), 20));
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("news_items")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(n);
    if (error || !data) return [];
    return data as NewsRow[];
  } catch {
    return [];
  }
}

export async function getLatestArticles(limit: number): Promise<ArticleRow[]> {
  if (!hasSupabaseEnv()) return [];
  const n = Math.max(1, Math.min(Math.floor(limit), 20));
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(n);
    if (error || !data) return [];
    return data as ArticleRow[];
  } catch {
    return [];
  }
}

export async function getNewsBySlug(slug: string): Promise<NewsRow | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("news_items")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as NewsRow;
  } catch {
    return null;
  }
}

export async function getPublishedCourses(): Promise<CourseRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_published", true)
      .order("display_order");
    if (error || !data) return [];
    return data as CourseRow[];
  } catch {
    return [];
  }
}

export async function getCourseBySlug(slug: string): Promise<CourseRow | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error || !data) return null;
    return data as CourseRow;
  } catch {
    return null;
  }
}

export async function getLessonsForCourse(courseId: string): Promise<LessonRow[]> {
  if (!hasSupabaseEnv()) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("display_order");
    if (error || !data) return [];
    return data as LessonRow[];
  } catch {
    return [];
  }
}
