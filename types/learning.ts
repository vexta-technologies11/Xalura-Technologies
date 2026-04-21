export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  author: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
};

export type LessonRow = {
  id: string;
  course_id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  display_order: number;
  created_at: string;
};
