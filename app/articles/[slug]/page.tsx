import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleMarkdown } from "@/components/article/ArticleMarkdown";
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
        {article.body ? <ArticleMarkdown source={article.body} /> : null}
        <p style={{ marginTop: 48 }}>
          <Link href="/articles" style={{ color: "var(--blue)", fontWeight: 600 }}>
            ← All articles
          </Link>
        </p>
      </article>
    </PublicPageShell>
  );
}
