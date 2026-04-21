import Link from "next/link";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getPublishedArticles } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

export const metadata = {
  title: "Articles · Xalura Tech",
  description: "GearMedic and Xalura articles on SEO, research, and publishing.",
};

export default async function ArticlesPage() {
  const [pageContent, articles] = await Promise.all([
    getPageContent(),
    getPublishedArticles(),
  ]);

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Library</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          Articles
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 560 }}>
          Long-form notes from the team — research, SEO, and production craft.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
          {articles.length === 0 ? (
            <li style={{ color: "var(--mid)" }}>No articles yet.</li>
          ) : (
            articles.map((a) => (
              <li
                key={a.id}
                style={{
                  padding: "24px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Link
                  href={`/articles/${a.slug}`}
                  style={{
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontFamily: "var(--font-cormorant), ui-serif, serif",
                    color: "var(--black)",
                    textDecoration: "none",
                  }}
                >
                  {a.title}
                </Link>
                {a.excerpt ? (
                  <p
                    style={{
                      margin: "12px 0 0",
                      color: "var(--mid)",
                      lineHeight: 1.6,
                    }}
                  >
                    {a.excerpt}
                  </p>
                ) : null}
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--gray)" }}>
                  {a.author ? `${a.author} · ` : null}
                  {a.published_at
                    ? new Date(a.published_at).toLocaleDateString()
                    : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </PublicPageShell>
  );
}
