import { Suspense } from "react";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { ArticlesBrowser } from "@/components/articles/ArticlesBrowser";
import { getPublishedArticles } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";
import { isArticleSubcategoryLabel } from "@/lib/articleSubcategoryGate";

export const metadata = {
  title: "Articles · Xalura Tech",
  description: "Practical, well-researched articles on the tools, strategies, and ideas shaping the next era of work.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { subcategory?: string | string[] };
}) {
  const [pageContent, articles] = await Promise.all([
    getPageContent(),
    getPublishedArticles(),
  ]);

  const raw = searchParams?.subcategory;
  const one = Array.isArray(raw) ? raw[0] : raw;
  const defaultSubcategory =
    one && isArticleSubcategoryLabel(one) ? one.trim() : null;

  const list = articles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    cover_image_url: a.cover_image_url,
    author: a.author,
    published_at: a.published_at,
    subcategory: a.subcategory ?? null,
  }));

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Learn</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          Articles
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 560 }}>
          Long-form guides and explainers on the tools, strategies, and ideas defining the next era of work. Practical enough to use. Deep enough to matter.
        </p>
        <Suspense
          fallback={
            <p className="body-text" style={{ marginTop: 24 }}>
              Loading articles…
            </p>
          }
        >
          <ArticlesBrowser
            articles={list}
            defaultSubcategory={defaultSubcategory}
          />
        </Suspense>
      </section>
    </PublicPageShell>
  );
}
