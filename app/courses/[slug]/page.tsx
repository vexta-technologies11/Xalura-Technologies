import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getCourseBySlug, getLessonsForCourse } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const course = await getCourseBySlug(params.slug);
  if (!course) return { title: "Course · Xalura Tech" };
  return {
    title: `${course.title} · Xalura Tech`,
    description: course.description ?? undefined,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const [pageContent, course] = await Promise.all([
    getPageContent(),
    getCourseBySlug(params.slug),
  ]);

  if (!course) notFound();

  const lessons = await getLessonsForCourse(course.id);

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap" style={{ maxWidth: 720 }}>
        <p className="label r">Course</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          {course.title}
        </h1>
        {course.description ? (
          <p
            className="body-text r"
            style={{ marginBottom: 40, lineHeight: 1.65 }}
          >
            {course.description}
          </p>
        ) : null}

        <h2
          style={{
            fontFamily: "var(--font-cormorant), ui-serif, serif",
            fontSize: "clamp(22px, 3vw, 28px)",
            marginBottom: 20,
          }}
        >
          Lessons
        </h2>
        <ol style={{ paddingLeft: 22, margin: 0 }}>
          {lessons.map((lesson, i) => (
            <li
              key={lesson.id}
              style={{
                marginBottom: 28,
                paddingLeft: 8,
                lineHeight: 1.65,
              }}
            >
              <strong style={{ color: "var(--black)" }}>
                {i + 1}. {lesson.title}
              </strong>
              {lesson.body ? (
                <div
                  style={{
                    marginTop: 10,
                    whiteSpace: "pre-wrap",
                    color: "var(--mid)",
                  }}
                >
                  {lesson.body}
                </div>
              ) : null}
              {lesson.video_url ? (
                <p style={{ marginTop: 10 }}>
                  <a
                    href={lesson.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--blue)" }}
                  >
                    Watch
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ol>

        <p style={{ marginTop: 40 }}>
          <Link href="/courses" style={{ color: "var(--blue)", fontWeight: 600 }}>
            ← All courses
          </Link>
        </p>
      </section>
    </PublicPageShell>
  );
}
