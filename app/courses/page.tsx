import Link from "next/link";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPublishedCourses } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

export const metadata = {
  title: "Courses · Xalura Tech",
  description: "Short courses on content operations and visual systems.",
};

export default async function CoursesPage() {
  const [pageContent, courses] = await Promise.all([
    getPageContent(),
    getPublishedCourses(),
  ]);

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Learn</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          Courses
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 560 }}>
          Structured lessons you can follow end to end — same workflows the team
          uses on GearMedic.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
          {courses.length === 0 ? (
            <li style={{ color: "var(--mid)" }}>No courses yet.</li>
          ) : (
            courses.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: "24px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Link
                  href={`/courses/${c.slug}`}
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontFamily: "var(--font-cormorant), ui-serif, serif",
                    color: "var(--black)",
                    textDecoration: "none",
                  }}
                >
                  {c.title}
                </Link>
                {c.description ? (
                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "var(--mid)",
                      lineHeight: 1.6,
                    }}
                  >
                    {c.description}
                  </p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>
    </PublicPageShell>
  );
}
