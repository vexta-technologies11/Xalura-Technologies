import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminArticlesPage() {
  const supabase = createClient();
  const { data: articles } = await supabase
    .from("articles")
    .select("id, slug, title, is_published, published_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
            Articles
          </h1>
          <p className="admin-page-lead" style={{ marginBottom: 0 }}>
            Published pieces for the public library. Edit content in Supabase or extend
            this admin view later.
          </p>
        </div>
      </div>

      <div className="admin-card admin-card-pad">
        {articles?.length ? (
          <ul className="admin-link-list">
            {articles.map((a) => (
              <li
                key={a.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontWeight: 650 }}>{a.title}</span>
                <span style={{ fontSize: "0.8125rem", color: "#64748b" }}>
                  {a.is_published ? "Published" : "Draft"} · {a.slug}
                </span>
                <Link href={`/articles/${a.slug}`} target="_blank" rel="noreferrer">
                  View live →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#64748b" }}>
            No rows yet. Run <code>supabase/schema.sql</code> in the SQL editor to
            seed articles.
          </p>
        )}
      </div>
    </div>
  );
}
