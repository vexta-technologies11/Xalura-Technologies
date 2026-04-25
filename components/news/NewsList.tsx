import type { NewsRow } from "@/types/learning";
import { NewsCard } from "./NewsCard";

export function NewsList({ items }: { items: NewsRow[] }) {
  if (items.length === 0) {
    return <p className="body-text" style={{ color: "var(--mid)" }}>No news yet.</p>;
  }
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 720 }}>
      {items.map((a) => (
        <li key={a.id}>
          <NewsCard item={a} />
        </li>
      ))}
    </ul>
  );
}
