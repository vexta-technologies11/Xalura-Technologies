import type { PageContentMap } from "@/types/content";

function BodyParas({
  text,
  gap,
  className = "body-text",
}: {
  text: string;
  gap?: number;
  className?: string;
}) {
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {parts.map((p, i) => (
        <p
          key={i}
          className={className}
          style={i > 0 ? { marginTop: gap ?? 20 } : undefined}
        >
          {p}
        </p>
      ))}
    </>
  );
}

export function BrandPositioning({
  content,
  template = "default",
}: {
  content: PageContentMap["brand"];
  template?: "default" | "palantir";
}) {
  const ph = template === "palantir";

  return (
    <div
      id="brand-offer"
      className={ph ? "brand--ph" : undefined}
      style={{ scrollMarginTop: 96 }}
    >
      <section className="wrap" style={{ paddingTop: 56, paddingBottom: 24 }}>
        <p className="label r">{content.offerLabel}</p>
        <h2
          className={ph ? "h2 r ph-brand-offer-h" : "h2 r"}
          style={
            ph
              ? {
                  fontSize: "clamp(1.5rem, 2.2vw, 1.75rem)",
                  maxWidth: 700,
                  marginTop: 8,
                  marginBottom: 32,
                }
              : {
                  fontSize: "clamp(24px, 2.5vw, 32px)",
                  maxWidth: 640,
                  marginTop: 8,
                  marginBottom: 32,
                  transitionDelay: "0.05s",
                }
          }
        >
          {content.offerBlockHeadline}
        </h2>
        <div
          className="r"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 24,
            transitionDelay: "0.1s",
          }}
        >
          {ph ? (
            <>
              <div className="ph-offer-card" style={{ padding: "1.5rem 1.75rem" }}>
                <h3 className="h2 ph-brand-offer-h ph-brand-card-title">News</h3>
                <p className="ph-brand-prose" style={{ margin: 0 }}>
                  {content.offerNews}
                </p>
              </div>
              <div className="ph-offer-card" style={{ padding: "1.5rem 1.75rem" }}>
                <h3 className="h2 ph-brand-offer-h ph-brand-card-title">Articles</h3>
                <p className="ph-brand-prose" style={{ margin: 0 }}>
                  {content.offerArticles}
                </p>
              </div>
              <div className="ph-offer-card" style={{ padding: "1.5rem 1.75rem" }}>
                <h3 className="h2 ph-brand-offer-h ph-brand-card-title">Courses</h3>
                <p className="ph-brand-prose" style={{ margin: 0 }}>
                  {content.offerCourses}
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
                <h3 className="h2" style={{ fontSize: 20, marginBottom: 12 }}>
                  News
                </h3>
                <p className="body-text" style={{ margin: 0 }}>
                  {content.offerNews}
                </p>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
                <h3 className="h2" style={{ fontSize: 20, marginBottom: 12 }}>
                  Articles
                </h3>
                <p className="body-text" style={{ margin: 0 }}>
                  {content.offerArticles}
                </p>
              </div>
              <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 24 }}>
                <h3 className="h2" style={{ fontSize: 20, marginBottom: 12 }}>
                  Courses
                </h3>
                <p className="body-text" style={{ margin: 0 }}>
                  {content.offerCourses}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section
        className={ph ? "wrap ph-brand-pad" : "wrap"}
        style={ph ? { paddingTop: 48, paddingBottom: 48 } : { paddingTop: 32, paddingBottom: 32 }}
      >
        {ph ? (
          <h2 className="h2 r ph-brand-section-title">{content.howLabel}</h2>
        ) : (
          <p className="label r">{content.howLabel}</p>
        )}
        <div
          className="r ph-brand-text-col"
          style={ph ? { maxWidth: 800, marginTop: 20 } : { maxWidth: 640, marginTop: 8 }}
        >
          <BodyParas
            text={content.howBody}
            className={ph ? "ph-brand-prose" : "body-text"}
            gap={ph ? 24 : 16}
          />
        </div>
      </section>

      <section
        className={ph ? "wrap ph-brand-pad" : "wrap"}
        style={ph ? { paddingTop: 8, paddingBottom: 48 } : { paddingTop: 8, paddingBottom: 32 }}
      >
        {ph ? (
          <h2 className="h2 r ph-brand-section-title">{content.whoLabel}</h2>
        ) : (
          <p className="label r">{content.whoLabel}</p>
        )}
        <div
          className="r ph-brand-text-col"
          style={ph ? { maxWidth: 800, marginTop: 20 } : { maxWidth: 640, marginTop: 8 }}
        >
          <BodyParas
            text={content.whoBody}
            className={ph ? "ph-brand-prose" : "body-text"}
            gap={ph ? 20 : 16}
          />
        </div>
      </section>

      <section
        className={ph ? "wrap ph-brand-pad" : "wrap"}
        style={ph ? { paddingTop: 8, paddingBottom: 48 } : { paddingTop: 8, paddingBottom: 32 }}
      >
        {ph ? (
          <h2 className="h2 r ph-brand-section-title">{content.apartLabel}</h2>
        ) : (
          <p className="label r">{content.apartLabel}</p>
        )}
        <div
          className="r ph-brand-text-col"
          style={ph ? { maxWidth: 800, marginTop: 20 } : { maxWidth: 700, marginTop: 8 }}
        >
          <BodyParas
            text={content.apartBody}
            className={ph ? "ph-brand-prose" : "body-text"}
            gap={ph ? 24 : 16}
          />
        </div>
      </section>

      <section
        className={["wrap", "ph-brand-divider", ph ? "ph-brand-approach" : ""]
          .filter(Boolean)
          .join(" ")}
        style={
          ph
            ? { paddingTop: 40, paddingBottom: 80, borderTop: "1px solid var(--line)" }
            : { paddingTop: 8, paddingBottom: 56, borderTop: "1px solid var(--line)" }
        }
      >
        {ph ? (
          <h2 className="h2 r ph-brand-approach-title">{content.approachLabel}</h2>
        ) : (
          <p className="label r" style={{ color: "var(--blue)" }}>
            {content.approachLabel}
          </p>
        )}
        <div
          className="r ph-brand-text-col"
          style={ph ? { maxWidth: 800, marginTop: 24 } : { maxWidth: 720, marginTop: 12 }}
        >
          <BodyParas
            text={content.approachBody}
            className={ph ? "ph-brand-prose ph-brand-prose--larger" : "body-text"}
            gap={ph ? 28 : 16}
          />
        </div>
      </section>
    </div>
  );
}
