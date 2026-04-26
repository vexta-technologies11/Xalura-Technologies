import Link from "next/link";
import type { NewsRow } from "@/types/learning";

type NewsCardProps = { item: NewsRow };

export function NewsCard({ item }: NewsCardProps) {
  return (
    <Link
      href={`/news/${item.slug}`}
      className="public-news-row"
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "20px 0",
      }}
    >
      {item.cover_image_url ? (
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.cover_image_url}
            alt=""
            width={640}
            height={360}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      ) : null}
      <h2
        className="public-news-row__title"
        style={{
          fontSize: "clamp(20px, 2.5vw, 26px)",
          fontFamily: "var(--font-cormorant), ui-serif, serif",
          margin: "0 0 8px",
        }}
      >
        {item.title}
      </h2>
      <p
        className="public-news-row__meta"
        style={{ fontSize: 13, color: "var(--gray)", margin: "10px 0 0" }}
      >
        {item.author ? `${item.author} · ` : null}
        {item.published_at
          ? new Date(item.published_at).toLocaleDateString()
          : null}
      </p>
    </Link>
  );
}
