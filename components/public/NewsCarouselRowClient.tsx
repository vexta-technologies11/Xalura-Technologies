"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewsRow } from "@/types/learning";

function brief(text: string | null | undefined, max = 120) {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

type Props = { items: NewsRow[]; template: "default" | "palantir" };

export function NewsCarouselRowClient({ items, template }: Props) {
  const ph = template === "palantir";
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (items.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth * 0.85;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  return (
    <div className="home-news-carousel" data-palantir={ph || undefined}>
      <button
        type="button"
        className="home-news-carousel__arrow home-news-carousel__arrow--prev"
        onClick={() => scroll(-1)}
        aria-label="Scroll news left"
      >
        <ChevronLeft size={22} strokeWidth={1.5} />
      </button>
      <div
        ref={scrollerRef}
        className="home-news-carousel__scroller"
        style={{
          display: "flex",
          gap: ph ? 20 : 16,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          paddingBottom: 8,
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((n) => (
          <Link
            key={n.id}
            href={`/news/${n.slug}`}
            className="home-news-carousel__card"
            style={{
              flex: "0 0 min(100%, 320px)",
              scrollSnapAlign: "start",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              className="home-news-carousel__card-img"
              style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "#1a1a1a" }}
            >
              {n.cover_image_url ? (
                <Image
                  src={n.cover_image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 320px"
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #2a2a2a, #0f0f0f)",
                    color: "rgba(255,255,255,0.25)",
                    fontSize: 12,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                  }}
                >
                  News
                </div>
              )}
            </div>
            <div
              className="home-news-carousel__card-text"
              style={{ padding: ph ? "1rem 0" : "12px 0 0" }}
            >
              <h3
                className="home-news-carousel__card-title"
                style={{
                  fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                  fontSize: 17,
                  fontWeight: 600,
                  lineHeight: 1.35,
                  margin: 0,
                  color: ph ? "#fafaf9" : "var(--black)",
                }}
              >
                {n.title}
              </h3>
              {brief(n.excerpt || n.body, 100) ? (
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: ph ? "rgba(200,200,200,0.9)" : "var(--gray)",
                    margin: "8px 0 0",
                  }}
                >
                  {brief(n.excerpt || n.body, 100)}
                </p>
              ) : null}
              <span
                className="home-news-carousel__read"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  color: ph ? "#fafaf9" : "var(--blue)",
                }}
              >
                Read more
                <span aria-hidden>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="home-news-carousel__arrow home-news-carousel__arrow--next"
        onClick={() => scroll(1)}
        aria-label="Scroll news right"
      >
        <ChevronRight size={22} strokeWidth={1.5} />
      </button>
    </div>
  );
}
