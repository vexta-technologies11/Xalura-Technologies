import type { PageContentMap } from "@/types/content";
import { HeroBentoGrid } from "./HeroBentoGrid";

type HeroTemplate = "default" | "palantir";

export function Hero({
  content,
  template = "default",
}: {
  content: PageContentMap["hero"];
  template?: HeroTemplate;
}) {
  const lines = (content.headline ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (template === "palantir") {
    return (
      <section className="hero hero--ph">
        <div className="hero-content hero-content--ph">
          <p className="ph-hero-kicker">{content.label}</p>
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
            <a className="btn btn-ph-primary" href="#mission">
              {content.primaryCta}
            </a>
            <a className="btn btn-ph-secondary" href="#brand-offer">
              {content.secondaryCta}
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="hero hero--bento">
      <div className="hero-bento-layer">
        <HeroBentoGrid />
      </div>
      <div className="hero-veil" aria-hidden />
      <p className="hero-bento-hint">
        {content.bentoHint?.trim() ||
          "Track what matters across technology and industry. News, deep dives, tools, and courses in one place."}
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
          <a className="btn btn-outline" href="#brand-offer">
            {content.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}
