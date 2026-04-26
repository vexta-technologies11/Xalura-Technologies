import Image from "next/image";
import type { PageContentMap } from "@/types/content";
import { LiveActivityGraph } from "./LiveActivityGraph";

export function GearMedic({
  content,
  className,
}: {
  content: PageContentMap["gearmedic"];
  className?: string;
}) {
  const parts = (content.headline ?? "").split("\n");
  const line1 = parts[0] ?? "";
  const line2 = parts[1] ?? "";
  return (
    <section
      className={["product-section wrap", className].filter(Boolean).join(" ")}
      id="products"
    >
      <p className="label r">{content.label}</p>
      <h2 className="h2 r" style={{ transitionDelay: "0.1s" }}>
        {line1}
        {line2 ? (
          <>
            <br />
            <em>{line2}</em>
          </>
        ) : null}
      </h2>
      <div className="product-card r" style={{ transitionDelay: "0.2s" }}>
        <div className="product-info">
          <span className="product-tag">Live — MVP Active</span>
          <h3 className="product-name">GearMedic</h3>
          <div className="product-live-stack">
            <LiveActivityGraph
              seed="gearmedic-knowledge-base"
              compact
              variant="product"
            />
            {Array.isArray(content.metrics) && content.metrics.length > 0 ? (
              <div className="product-metrics" aria-label="GearMedic at a glance">
                {content.metrics.map((m) => (
                  <div key={`${m.value}-${m.label}`} className="product-metric">
                    <span className="product-metric-value">{m.value}</span>
                    <span className="product-metric-label">{m.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <p className="product-body">{content.body}</p>
          <p className="product-body" style={{ marginTop: 12 }}>
            {content.body2}
          </p>
          <ul className="feat-list" style={{ marginTop: 20 }}>
            {(Array.isArray(content.features) ? content.features : []).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <a className="product-link" href="#">
            {content.cta}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M2 7h10M10 4l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
        <div className="product-vis product-vis-feature">
          <Image
            src="/images/gearmedic-feature.jpg"
            alt="GearMedic: vehicle diagnostic session on mobile"
            width={614}
            height={1024}
            className="product-feature-img"
            sizes="(min-width: 768px) min(42vw, 380px), 88vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}
