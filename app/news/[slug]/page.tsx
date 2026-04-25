import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleMarkdown } from "@/components/article/ArticleMarkdown";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getNewsBySlug } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const row = await getNewsBySlug(params.slug);
  if (!row) return { title: "News · Xalura Tech" };
  return {
    title: `${row.title} · Xalura Tech`,
    description: row.excerpt ?? undefined,
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const [pageContent, n] = await Promise.all([getPageContent(), getNewsBySlug(params.slug)]);

  if (!n) notFound();

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <article className="wrap" style={{ maxWidth: 720 }}>
        <p className="label r">News</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          {n.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 32 }}>
          {n.author ? `${n.author} · ` : null}
          {n.published_at ? new Date(n.published_at).toLocaleDateString() : null}
        </p>
        {n.cover_image_url ? (
          <div style={{ marginBottom: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={n.cover_image_url}
              alt=""
              width={720}
              height={405}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: 12,
                display: "block",
              }}
            />
          </div>
        ) : null}
        {n.body ? <ArticleMarkdown source={n.body} /> : null}
        <p style={{ marginTop: 48 }}>
          <Link href="/news" style={{ color: "var(--blue)", fontWeight: 600 }}>
            ← All news
          </Link>
        </p>
      </article>
    </PublicPageShell>
  );
}
