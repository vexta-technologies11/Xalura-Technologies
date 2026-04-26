import Image from "next/image";
import Link from "next/link";
import type { ArticleRow, NewsRow } from "@/types/learning";
import { formatOnDate } from "@/lib/formatPublishedDate";
import { NewsCarouselRowClient } from "./NewsCarouselRowClient";

function brief(text: string | null | undefined, max = 220) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function excerptFromRow(row: { excerpt?: string | null; body?: string | null }) {
  if (row.excerpt?.trim()) return row.excerpt.trim();
  return brief(row.body, 240);
}

function newsTag(n: NewsRow): string {
  const t = n.track?.trim();
  if (t) return t.length > 12 ? t.slice(0, 12).toUpperCase() : t.toUpperCase();
  return "NEWS";
}

function articleTag(a: ArticleRow): string {
  const s = a.subcategory?.trim();
  if (s) return s.length > 14 ? s.slice(0, 14).toUpperCase() : s.toUpperCase();
  return "ARTICLES";
}

type Props = {
  news: NewsRow[];
  articles: ArticleRow[];
  template?: "default" | "palantir";
};

/**
 * Home: News (featured + carousel) on top, Articles grid below — data from latest published rows.
 */
export function HomeNewsArticles({ news, articles, template = "palantir" }: Props) {
  const ph = template === "palantir";
  const featured = news[0];
  const carouselNews = news.slice(1);
  const articleGrid = articles.slice(0, 6);

  if (news.length === 0 && articleGrid.length === 0) return null;

  return (
    <div
      id="featured"
      className="home-na"
      data-palantir={ph || undefined}
      style={{ scrollMarginTop: 88 }}
    >
      {news.length > 0 ? (
        <section className="wrap home-na__section home-na__news" id="home-news" aria-labelledby="home-news-heading">
          <div className="home-na__section-head">
            <h2 id="home-news-heading" className="home-na__h2">
              News
            </h2>
            <p className="home-na__lede">
              Same-day reporting and analysis—what changed, and what it means for your work.
            </p>
          </div>

          {featured ? (
            <Link
              href={`/news/${featured.slug}`}
              className="home-na__featured"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="home-na__featured-img">
                {featured.cover_image_url ? (
                  <Image
                    src={featured.cover_image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="home-na__placeholder" aria-hidden>
                    <span>News</span>
                  </div>
                )}
              </div>
              <div className="home-na__featured-body">
                <div className="home-na__meta">
                  <span className="home-na__pill">{newsTag(featured)}</span>
                  {featured.published_at ? (
                    <time className="home-na__date" dateTime={featured.published_at}>
                      {formatOnDate(featured.published_at)}
                    </time>
                  ) : null}
                </div>
                <h3 className="home-na__featured-title">{featured.title}</h3>
                {excerptFromRow(featured) ? <p className="home-na__excerpt">{excerptFromRow(featured)}</p> : null}
                <span className="home-na__cta">Read the full article →</span>
              </div>
            </Link>
          ) : null}

          {carouselNews.length > 0 ? (
            <div className="home-na__carousel-wrap" style={{ marginTop: 40 }}>
              <NewsCarouselRowClient items={carouselNews} template={template} />
            </div>
          ) : null}

          <p className="home-na__all-link">
            <Link href="/news">View all news</Link>
          </p>
        </section>
      ) : null}

      {articleGrid.length > 0 ? (
        <section className="wrap home-na__section home-na__articles" id="home-articles" aria-labelledby="home-articles-heading">
          <div className="home-na__section-head">
            <h2 id="home-articles-heading" className="home-na__h2">
              Articles
            </h2>
            <p className="home-na__lede">
              Long-form guides and explainers on tools, strategy, and the next era of work.
            </p>
          </div>
          <div className="home-na__article-grid">
            {articleGrid.map((a) => (
              <Link
                key={a.id}
                href={`/articles/${a.slug}`}
                className="home-na__article-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="home-na__article-card-inner">
                  <div className="home-na__meta home-na__meta--tight">
                    <span className="home-na__pill home-na__pill--sm">{articleTag(a)}</span>
                    {a.published_at ? (
                      <time className="home-na__date" dateTime={a.published_at}>
                        {formatOnDate(a.published_at)}
                      </time>
                    ) : null}
                  </div>
                  <h3 className="home-na__article-title">{a.title}</h3>
                </div>
              </Link>
            ))}
          </div>
          <p className="home-na__all-link">
            <Link href="/articles">View all articles</Link>
          </p>
        </section>
      ) : null}
    </div>
  );
}
