import type { PageContentMap } from "@/types/content";

export function Founder({ content }: { content: PageContentMap["founder"] }) {
  return (
    <section className="wrap" id="founder">
      <div className="founder-inner r">
        <p className="label">{content.label}</p>
        <header className="founder-header">
          <h2 className="founder-name">
            {content.name}
            {content.postnominal ? (
              <span className="founder-name-suffix">, {content.postnominal}</span>
            ) : null}
          </h2>
          <p className="founder-role">{content.role}</p>
        </header>
        <blockquote className="founder-quote">{content.quote}</blockquote>
        <p className="body-text founder-prose">{content.bio}</p>
        <p className="body-text founder-prose" style={{ marginTop: 18 }}>
          {content.bio2}
        </p>
      </div>
    </section>
  );
}
