import type { Metadata } from "next";
import Link from "next/link";
import { PricingCard } from "@/components/pricing/PricingCard";

export const metadata: Metadata = {
  title: "Pricing | Xalura Tech",
  description: "Choose the right plan for your needs. Free, Starter, Pro, or Agency.",
};

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started and exploring our AI tools.",
    features: [
      "5 generations per tool per day",
      "1,000 word input limit",
      "10 saved outputs",
      "Basic text formats",
      "Community support",
    ],
    highlighted: false,
    cta: "Current Plan",
  },
  {
    name: "Starter",
    price: "$12",
    period: "/month",
    description: "For professionals who need more power and upload support.",
    features: [
      "30 generations per tool per day",
      "5,000 word input limit",
      "100 saved outputs",
      "File upload support",
      "PDF exports",
      "Priority email support",
    ],
    highlighted: false,
    badge: "POPULAR",
    cta: "Upgrade to Starter",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For power users and small teams needing maximum output.",
    features: [
      "200 generations per tool per day",
      "50,000 word input limit",
      "1,000 saved outputs",
      "Unlimited exports",
      "All file types supported",
      "Priority chat support",
      "Early access to new tools",
    ],
    highlighted: true,
    badge: "BEST VALUE",
    cta: "Upgrade to Pro",
  },
  {
    name: "Agency",
    price: "$79",
    period: "/month",
    description: "For teams and agencies scaling their content operations.",
    features: [
      "Unlimited generations",
      "Unlimited word input",
      "Unlimited saved outputs",
      "Team accounts (coming soon)",
      "API access (coming soon)",
      "White-label exports",
      "Dedicated account manager",
    ],
    highlighted: false,
    badge: "COMING SOON",
    cta: "Contact Sales",
  },
];

export default function PricingPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/tools">
        ← Dashboard
      </Link>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1
          className="h1 r"
          style={{
            marginBottom: 8,
            fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
            letterSpacing: "-0.02em",
          }}
        >
          Simple, transparent pricing
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 540, margin: "0 auto", opacity: 0.9 }}>
          Start free and upgrade as you grow. All plans include our core AI tools.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        {PLANS.map((plan) => (
          <PricingCard key={plan.name} {...plan} />
        ))}
      </div>

      <div
        style={{
          marginTop: "48px",
          padding: "24px",
          borderRadius: "12px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.06)",
          maxWidth: 700,
          marginLeft: "auto",
          marginRight: "auto",
          textAlign: "center",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: "1rem", fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>
          Need something custom?
        </h3>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(200,210,230,0.6)" }}>
          We offer custom plans for large teams and enterprise needs. Contact us at{" "}
          <a href="mailto:sales@xalura.com" style={{ color: "#7c3aed" }}>
            sales@xalura.tech
          </a>
        </p>
      </div>
    </section>
  );
}
