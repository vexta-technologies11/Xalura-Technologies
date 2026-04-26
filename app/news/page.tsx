import { Suspense } from "react";
import { PublicPageShell } from "@/components/public/PublicPageShell";
import { NewsList } from "@/components/news/NewsList";
import { getPublishedNews } from "@/lib/data-learning";
import { getPageContent } from "@/lib/data";

export const metadata = {
  title: "News · Xalura Tech",
  description: "Same-day tech and AI news, produced by the agentic News team.",
};

export default async function NewsPage() {
  const [pageContent, list] = await Promise.all([getPageContent(), getPublishedNews()]);

  return (
    <PublicPageShell footerContent={pageContent.footer}>
      <section className="wrap">
        <p className="label r">Feed</p>
        <h1 className="h2 r" style={{ marginBottom: 16 }}>
          News
        </h1>
        <p className="body-text r" style={{ marginBottom: 40, maxWidth: 560 }}>
          Same-day reporting from the News desk, with editorial review and audit behind every
          story. Clean, sourced, and published as soon as it is ready.
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
