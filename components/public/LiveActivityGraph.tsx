"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { IconType } from "@/types/employee";
import { MOCHI_MANUSCRIPT } from "@/lib/liveManuscript";
import { MALDITA_AUDIT_PARAGRAPH } from "@/lib/malditaSeoVisual";

export type LiveVisualVariant = IconType | "product";

type BaseProps = {
  seed: string;
  compact?: boolean;
};

const HEADER: Record<
  LiveVisualVariant,
  { title: string; badge: string }
> = {
  writer: { title: "Draft stream", badge: "Typing" },
  seo: { title: "Crawl & deep links", badge: "Auditing" },
  analyst: { title: "Signal fusion", badge: "Modeling" },
  designer: { title: "Visual layer", badge: "Composing" },
  product: { title: "Live knowledge stack", badge: "Indexing" },
};

function hashStep(seed: string, i: number) {
  let h = 0;
  for (let c = 0; c < seed.length; c++) {
    h = Math.imul(31, h) + seed.charCodeAt(c);
  }
  return Math.abs(h + i * 17) % 5;
}

function WriterVisual({ seed, compact }: BaseProps) {
  const fullText = MOCHI_MANUSCRIPT;
  const [pos, setPos] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      setPos((p) => {
        const step = 2 + hashStep(seed, p);
        const next = p + step;
        return next >= fullText.length ? 0 : next;
      });
    };
    const ms = compact ? 18 : 22;
    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [fullText.length, seed, compact]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [pos]);

  const shown = fullText.slice(0, pos);

  return (
    <div className={`live-visual-surface live-visual-writer${compact ? " live-visual-writer--compact" : ""}`}>
      <div className="live-writer-chrome">
        <span className="live-writer-label">article.md</span>
        <span className="live-writer-meta">{fullText.length.toLocaleString()} chars · loop</span>
      </div>
      <div className="live-writer-scroll" ref={scrollRef}>
        <p className="live-writer-text">
          {shown}
          <span className="live-writer-caret" aria-hidden>
            ▍
          </span>
        </p>
      </div>
    </div>
  );
}

const SEO_AUDIT_PATH = "/guides/catalytic-converter-efficiency";

function SeoAuditVisual({ seed, compact }: BaseProps) {
  const wordList = useMemo(
    () => MALDITA_AUDIT_PARAGRAPH.split(/\s+/).filter(Boolean),
    [],
  );
  const [active, setActive] = useState(0);
  const [urlTick, setUrlTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % Math.max(wordList.length, 1));
    }, 280);
    return () => clearInterval(id);
  }, [wordList.length]);

  useEffect(() => {
    const id = setInterval(() => setUrlTick((t) => t + 1), 2800);
    return () => clearInterval(id);
  }, []);

  const deepLinkPhrase = useMemo(() => {
    const phrases = [
      { kw: "oxygen sensor", path: "/guides/o2-sensor-symptoms" },
      { kw: "misfire", path: "/diagnostics/misfire-codes" },
      { kw: "fuel trim", path: "/learn/fuel-trim-basics" },
    ];
    return phrases[urlTick % phrases.length];
  }, [urlTick]);

  return (
    <div className={`live-visual-surface live-visual-seo${compact ? " live-visual-seo--compact" : ""}`}>
      <div className="seo-browser-bar">
        <span className="seo-dot" />
        <span className="seo-dot" />
        <span className="seo-dot" />
        <span className="seo-url">https://gearmedic.net{SEO_AUDIT_PATH}</span>
      </div>
      <div className="seo-audit-body">
        <p className="seo-paragraph">
          {wordList.map((w, i) => (
            <span key={`${w}-${i}`}>
              <span className={i === active ? "seo-token seo-token--pulse" : "seo-token"}>{w}</span>
              {i < wordList.length - 1 ? " " : null}
            </span>
          ))}
        </p>
        <div className="seo-deeplink">
          <span className="seo-deeplink-label">Deep link match</span>
          <span className="seo-deeplink-arrow" aria-hidden>
            →
          </span>
          <code className="seo-deeplink-code">
            &quot;{deepLinkPhrase.kw}&quot; → {deepLinkPhrase.path}
          </code>
        </div>
        <div className="seo-crawl">
          <span>Crawl segment {12 + (hashStep(seed, urlTick) % 8)}k URLs</span>
          <div className="seo-crawl-bar">
            <span className="seo-crawl-fill" style={{ width: `${40 + (urlTick % 55)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalystVisual({ seed, compact }: BaseProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  const m1 = (14.2 + (hashStep(seed, tick) % 10) / 10).toFixed(1);
  const m2 = (3.2 + (hashStep(seed, tick + 3) % 15) / 10).toFixed(1);
  const m3 = (0.88 + (hashStep(seed, tick + 7) % 12) / 100).toFixed(2);
  const gradId = useId().replace(/:/g, "");

  return (
    <div className={`live-visual-surface live-visual-analyst${compact ? " live-visual-analyst--compact" : ""}`}>
      <div className="analyst-metrics">
        <div className="analyst-cell">
          <span className="analyst-k">Query demand Δ</span>
          <span className="analyst-v">+{m1}%</span>
        </div>
        <div className="analyst-cell">
          <span className="analyst-k">CTR (model)</span>
          <span className="analyst-v">{m2}%</span>
        </div>
        <div className="analyst-cell">
          <span className="analyst-k">Intent fit</span>
          <span className="analyst-v">{m3}</span>
        </div>
      </div>
      <svg className="analyst-spark" viewBox="0 0 120 36" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(107, 139, 245, 0.5)" />
            <stop offset="100%" stopColor="rgba(23, 64, 224, 0.02)" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradId})`}
          d="M0,32 L0,24 Q20,8 40,20 T80,12 T120,18 L120,32 Z"
        />
        <path
          className="analyst-spark-line"
          fill="none"
          stroke="rgba(107, 139, 245, 0.9)"
          strokeWidth="1.25"
          d="M0,24 Q20,8 40,20 T80,12 T120,18"
        />
      </svg>
      <p className="analyst-caption">Search × traffic × market rows → briefs</p>
    </div>
  );
}

function DesignerVisual({ compact }: Pick<BaseProps, "compact">) {
  return (
    <div className={`live-visual-surface live-visual-designer${compact ? " live-visual-designer--compact" : ""}`}>
      <div className="design-swatches" aria-hidden>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="design-swatch" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <div className="design-board" aria-hidden>
        <div className="design-frame design-frame--sm" />
        <div className="design-frame design-frame--lg">
          <div className="design-shimmer" />
        </div>
        <div className="design-frame design-frame--sm" />
      </div>
      <p className="design-caption">Hero · in-article · thumbs · social crops</p>
    </div>
  );
}

const PRODUCT_CODES = ["P0420", "P0171", "P0304", "P0106", "P0455", "P2187"];
const PRODUCT_LINE = "GearMedic: fault-code intelligence + growing repair library — ";

function ProductVisual({ seed, compact }: BaseProps) {
  const [codeIdx, setCodeIdx] = useState(0);
  const [pos, setPos] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCodeIdx((i) => (i + 1) % PRODUCT_CODES.length), 1100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setPos(0);
  }, [codeIdx]);

  useEffect(() => {
    const line = PRODUCT_LINE + PRODUCT_CODES[codeIdx];
    const id = setInterval(() => {
      setPos((p) => {
        const next = p + 2 + (hashStep(seed, p) % 3);
        return next >= line.length ? 0 : next;
      });
    }, compact ? 28 : 32);
    return () => clearInterval(id);
  }, [codeIdx, seed, compact]);

  const line = PRODUCT_LINE + PRODUCT_CODES[codeIdx];
  const shown = line.slice(0, pos);

  return (
    <div className={`live-visual-surface live-visual-product${compact ? " live-visual-product--compact" : ""}`}>
      <div className="product-dtc-row" aria-hidden>
        {PRODUCT_CODES.map((c, i) => (
          <span
            key={c}
            className={i === codeIdx ? "product-dtc product-dtc--hot" : "product-dtc"}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="product-stack-line">
        <span className="product-stack-label">Stack</span>
        <p className="product-stack-text">
          {shown}
          <span className="live-writer-caret">▍</span>
        </p>
      </div>
    </div>
  );
}

type Props = BaseProps & {
  variant: LiveVisualVariant;
};

export function LiveActivityGraph({ seed, compact, variant }: Props) {
  const meta = HEADER[variant];
  const base = { seed, compact };
  let inner: ReactNode;
  switch (variant) {
    case "writer":
      inner = <WriterVisual {...base} />;
      break;
    case "seo":
      inner = <SeoAuditVisual {...base} />;
      break;
    case "analyst":
      inner = <AnalystVisual {...base} />;
      break;
    case "designer":
      inner = <DesignerVisual compact={compact} />;
      break;
    case "product":
      inner = <ProductVisual {...base} />;
      break;
    default:
      inner = <WriterVisual {...base} />;
  }

  const graphClass = [
    "live-activity-graph",
    compact ? "live-activity-graph--compact" : "",
    variant === "writer" ? "live-activity-graph--writer" : "",
    variant === "seo" ? "live-activity-graph--seo" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={graphClass} aria-hidden>
      <div className="live-graph-header">
        <span className="live-graph-title">{meta.title}</span>
        <span className="live-graph-badge">{meta.badge}</span>
      </div>
      {inner}
    </div>
  );
}
