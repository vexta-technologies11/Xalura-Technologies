import Link from "next/link";
import type { NewsRow } from "@/types/learning";

/**
 * Home: 2–3 latest news with link to full /news.
 */
export function LatestNewsStrip({ items }: { items: NewsRow[] }) {
  if (items.length === 0) return null;
  const show = items.slice(0, 3);
  return (
    <section
      className="wrap"
      style={{
        paddingTop: 48,
        paddingBottom: 8,
        borderTop: "1px solid var(--line)",
        marginTop: 24,
      }}
    >
      <p className="label r" style={{ marginBottom: 8 }}>
        News
      </p>
      <h2
        className="h2 r"
        style={{ fontSize: "clamp(24px, 3vw, 36px)", marginBottom: 24, maxWidth: 560 }}
      >
        Latest from the feed
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          maxWidth: 900,
        }}
      >
        {show.map((n) => (
          <Link
            key={n.id}
            href={`/news/${n.slug}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 16,
              minHeight: 100,
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-cormorant), ui-serif, serif",
                fontSize: 20,
                margin: "0 0 8px",
                lineHeight: 1.25,
              }}
            >
              {n.title}
            </p>
          </Link>
        ))}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link
          href="/news"
          style={{ color: "var(--blue)", fontWeight: 600, fontSize: 16 }}
        >
          View all news
        </Link>{" "}
        <span style={{ color: "var(--gray)", margin: "0 6px" }}>·</span>{" "}
        <Link href="/articles" style={{ color: "var(--blue)", fontWeight: 500, fontSize: 16 }}>
          Articles
        </Link>
      </p>
    </section>
  );
}
