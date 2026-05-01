"use client";

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge?: string;
  cta: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  highlighted,
  badge,
  cta,
}: PricingCardProps) {
  return (
    <div
      style={{
        padding: "28px 24px",
        borderRadius: "16px",
        border: highlighted ? "2px solid #7c3aed" : "1px solid rgba(255,255,255,0.1)",
        background: highlighted ? "rgba(124,58,237,0.06)" : "rgba(0,0,0,0.3)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.15s",
      }}
    >
      {badge && (
        <div
          style={{
            position: "absolute",
            top: "-10px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            color: "#fff",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "4px 16px",
            borderRadius: "20px",
            letterSpacing: "0.05em",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </div>
      )}

      <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "rgba(240,245,255,0.95)", marginBottom: "4px" }}>
        {name}
      </div>
      <div style={{ marginBottom: "12px" }}>
        <span style={{ fontSize: "2.2rem", fontWeight: 700, color: "#fff" }}>{price}</span>
        <span style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.5)" }}>{period}</span>
      </div>
      <p style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.6)", margin: "0 0 16px", lineHeight: 1.5, flex: 1 }}>
        {description}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", fontSize: "0.82rem" }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              padding: "4px 0",
              color: "rgba(200,210,230,0.75)",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "#10b981", flexShrink: 0 }}>•</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        className={`ai-tools__btn ${highlighted ? "ai-tools__btn--primary" : ""}`}
        style={{
          width: "100%",
          padding: "12px",
          textAlign: "center",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
        onClick={() => {
          // Stub — wire to Stripe in Phase 4
        }}
      >
        {cta}
      </button>
    </div>
  );
}
