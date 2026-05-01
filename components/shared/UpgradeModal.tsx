"use client";

import { Modal } from "@/components/shared/Modal";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerSource?: string | null;
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Great for getting started",
    features: [
      "15 generations/day",
      "2,000 word input limit",
      "Text copy export",
      "Basic tools access",
    ],
    highlighted: false,
    disabled: false,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "$7.99",
    period: "/month",
    description: "For daily productivity power users",
    features: [
      "100 generations/day",
      "10,000 word input limit",
      "PDF & DOCX exports",
      "File upload support",
      "90-day history",
      "Priority support",
    ],
    highlighted: true,
    badge: "BEST VALUE",
    disabled: true,
    comingSoon: true,
  },
  {
    name: "Ultra",
    price: "$11.99",
    period: "/month",
    description: "For teams and heavy users",
    features: [
      "Unlimited generations",
      "50,000 word input limit",
      "All export formats",
      "File upload + images",
      "Unlimited history",
      "API access",
      "Priority support",
    ],
    highlighted: false,
    disabled: true,
    comingSoon: true,
  },
];

export function UpgradeModal({ isOpen, onClose, triggerSource }: UpgradeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upgrade Your Plan" maxWidth="700px">
      <p
        style={{
          color: "rgba(200,210,230,0.6)",
          fontSize: "0.9rem",
          margin: "0 0 24px",
        }}
      >
        {triggerSource
          ? `You've hit the free limit (15/day) for ${triggerSource}. Choose a plan for more.`
          : "You've hit your free daily limit. Upgrade for more generations and features."}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        {tiers.map((tier) => (
          <div
            key={tier.name}
            style={{
              padding: "20px 16px",
              borderRadius: "12px",
              border: tier.highlighted
                ? "2px solid #7c3aed"
                : "1px solid rgba(255,255,255,0.1)",
              background: tier.highlighted
                ? "rgba(124,58,237,0.08)"
                : "rgba(0,0,0,0.2)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              opacity: tier.disabled ? 0.55 : 1,
            }}
          >
            {tier.badge && (
              <div
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "12px",
                  background:
                    tier.comingSoon
                      ? "linear-gradient(135deg, #f59e0b, #e8a838)"
                      : "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff",
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.05em",
                }}
              >
                {tier.badge}
              </div>
            )}
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "rgba(240,245,255,0.95)",
                marginBottom: "4px",
              }}
            >
              {tier.name}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>
                {tier.price}
              </span>
              <span style={{ fontSize: "0.8rem", color: "rgba(200,210,230,0.5)" }}>
                {tier.period}
              </span>
            </div>
            <p
              style={{
                fontSize: "0.78rem",
                color: "rgba(200,210,230,0.6)",
                margin: "0 0 12px",
                lineHeight: 1.4,
              }}
            >
              {tier.description}
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                fontSize: "0.78rem",
                flex: 1,
              }}
            >
              {tier.features.map((f) => (
                <li
                  key={f}
                  style={{
                    padding: "3px 0",
                    color: "rgba(200,210,230,0.7)",
                    display: "flex",
                    gap: "6px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ color: "#10b981" }}>•</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`ai-tools__btn ${
                tier.highlighted && !tier.disabled
                  ? "ai-tools__btn--primary"
                  : ""
              }`}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                textAlign: "center",
                fontWeight: 600,
                cursor: tier.disabled ? "not-allowed" : "pointer",
                opacity: tier.disabled ? 0.5 : 1,
                ...(tier.highlighted && tier.disabled ? {
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  color: "rgba(200,210,230,0.7)",
                } : {}),
              }}
              disabled={tier.disabled}
              onClick={() => {
                if (!tier.disabled) {
                  // Stub — wire to Stripe in Phase 4
                  onClose();
                }
              }}
            >
              {tier.comingSoon ? "Coming Soon" : tier.highlighted ? "Upgrade Now" : "Current Plan"}
            </button>
            {tier.comingSoon && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.65rem",
                  color: "#f59e0b",
                  marginTop: "4px",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                }}
              >
                Stripe billing coming soon
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "0.78rem",
          color: "rgba(200,210,230,0.45)",
        }}
      >
        Free tier: 15 generations/day, resets every 24 hours.
        <br />
        Pro and Ultra coming with Stripe billing — cancel anytime.
      </div>
    </Modal>
  );
}
