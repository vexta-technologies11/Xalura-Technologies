import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCoursesPage() {
  const supabase = createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug, title, is_published, display_order")
    .order("display_order", { ascending: true });

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
            Courses
          </h1>
          <p className="admin-page-lead" style={{ marginBottom: 0 }}>
            Lessons roll up under each course. Use the public course page to verify
            ordering.
          </p>
        </div>
      </div>

      <div className="admin-card admin-card-pad">
        {courses?.length ? (
          <ul className="admin-link-list">
            {courses.map((c) => (
              <li
                key={c.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 650 }}>{c.title}</span>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  {c.is_published ? "Published" : "Draft"} · {c.slug}
                </span>
                <Link href={`/courses/${c.slug}`} target="_blank" rel="noreferrer">
                  View live →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#64748b" }}>
            No rows yet. Run <code>supabase/schema.sql</code> in the SQL editor to
            seed courses and lessons.
          </p>
        )}
      </div>
    </div>
  );
}
