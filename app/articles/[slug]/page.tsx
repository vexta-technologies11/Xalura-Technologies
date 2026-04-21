import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { getArticleBySlug } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) return { title: "Article · Xalura Tech" };
  return {
    title: `${article.title} · Xalura Tech`,
    description: article.excerpt ?? undefined,
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const [pageContent, article] = await Promise.all([
    getPageContent(),
    getArticleBySlug(params.slug),
  ]);

  if (!article) notFound();

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <article className="wrap" style={{ maxWidth: 720 }}>
        <p className="label r">Article</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          {article.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--gray)", marginBottom: 32 }}>
          {article.author ? `${article.author} · ` : null}
          {article.published_at
            ? new Date(article.published_at).toLocaleDateString()
            : null}
        </p>
        {article.body ? (
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.75,
              color: "var(--mid)",
              fontSize: 17,
            }}
          >
            {article.body}
          </div>
        ) : null}
        <p style={{ marginTop: 48 }}>
          <Link href="/articles" style={{ color: "var(--blue)", fontWeight: 600 }}>
            ← All articles
          </Link>
        </p>
      </article>
    </PublicPageShell>
  );
}
