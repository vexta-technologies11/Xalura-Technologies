import type { PageContentMap } from "@/types/content";
import { HeroBentoGrid } from "./HeroBentoGrid";

export function Hero({ content }: { content: PageContentMap["hero"] }) {
  const lines = (content.headline ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <section className="hero hero--bento">
      <div className="hero-bento-layer">
        <HeroBentoGrid />
      </div>
      <div className="hero-veil" aria-hidden />
      <p className="hero-bento-hint">
        Drag and explore our curated stack — live analytics, models, and pipelines.
      </p>
      <div className="hero-content">
        <p className="label">{content.label}</p>
        <h1 className="h1">
          {lines.map((line, i) => (
            <span key={i}>
              {i === lines.length - 1 ? <em>{line}</em> : line}
              {i < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h1>
        <p className="body-text">{content.subhead}</p>
        <div className="hero-btns">
          <a className="btn btn-dark" href="#mission">
            {content.primaryCta}
          </a>
          <a className="btn btn-outline" href="#ai-employees">
            {content.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
