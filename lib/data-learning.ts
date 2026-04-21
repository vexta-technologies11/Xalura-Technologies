import { createClient } from "@/lib/supabase/server";
import type { ArticleRow, CourseRow, LessonRow } from "@/types/learning";

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
