import { Suspense } from "react";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { NewsList } from "@/components/news/NewsList";
import { getPublishedNews } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

export const metadata = {
  title: "News · Xalura Tech",
  description: "Stay informed with same-day reporting on technology, AI, and industry shifts. News that explains what matters for your work.",
};

export default async function NewsPage() {
  const [pageContent, list] = await Promise.all([getPageContent(), getPublishedNews()]);

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Stay Informed</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          News
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 560 }}>
          What is changing in technology and industry, and what it means for your work. Same-day reporting that gives you context, not just headlines.
        </p>
        <Suspense
          fallback={
            <p className="body-text" style={{ marginTop: 24 }}>
              Loading…
            </p>
          }
        >
          <NewsList items={list} />
        </Suspense>
      </section>
    </PublicPageShell>
  );
}
