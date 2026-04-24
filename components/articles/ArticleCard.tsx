import Image from "next/image";
import Link from "next/link";
import type { ArticleListItem } from "./types";

type ArticleCardProps = { article: ArticleListItem };

export function ArticleCard({ article }: ArticleCardProps) {
  const { slug, title, excerpt, cover_image_url, author, published_at } = article;
  const dateLine = published_at
    ? new Date(published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <Link href={`/articles/${slug}`} className="article-card">
      <div className="article-card__image-wrap">
        {cover_image_url ? (
          <Image
            src={cover_image_url}
            alt=""
            fill
            className="article-card__image"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 720px"
          />
        ) : (
          <div className="article-card__image-placeholder" aria-hidden />
        )}
      </div>
      <div className="article-card__body">
        {article.subcategory ? (
          <p className="article-card__tag label">{article.subcategory}</p>
        ) : null}
        <h2 className="article-card__title">{title}</h2>
        {excerpt ? <p className="article-card__excerpt body-text">{excerpt}</p> : null}
        <p className="article-card__meta">
          {author ? <span>{author}</span> : null}
          {author && dateLine ? <span className="article-card__meta-sep">·</span> : null}
          {dateLine ? <span>{dateLine}</span> : null}
        </p>
      </div>
    </Link>
  );
}
