"use client";

import { Button } from "@/components/shared/Button";

export function BillingTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          padding: "16px",
          borderRadius: "10px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: "4px" }}>
          Current Plan
        </div>
        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "rgba(240,245,255,0.95)" }}>
          Free
        </div>
        <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.5)", marginBottom: "12px" }}>
          5 generations per tool per day
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            window.location.href = "/pricing";
          }}
        >
          View Plans
        </Button>
      </div>

      <div
        style={{
          padding: "16px",
          borderRadius: "10px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: "4px" }}>
          Billing History
        </div>
        <div style={{ fontSize: "0.85rem", color: "rgba(200,210,230,0.5)", padding: "20px 0", textAlign: "center" }}>
          No billing history yet
        </div>
      </div>
    </div>
  );
}
