"use client";

import { useState, useEffect } from "react";
import { setAdminMode } from "@/lib/usageStore";

const STORAGE_KEY = "xalura_pro_activated";

export function ProActivationToggle() {
  const [isProActive, setIsProActive] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const active = stored === "true";
    setIsProActive(active);
    // Sync admin mode to usage store — admin = unlimited generations
    setAdminMode(active);
  }, []);

  const togglePro = () => {
    const newVal = !isProActive;
    setIsProActive(newVal);
    if (newVal) {
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    // Sync admin mode
    setAdminMode(newVal);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "1.2rem" }}>
          {isProActive ? "⭐" : "🔒"}
        </span>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "rgba(240,245,255,0.95)",
            }}
          >
            Pro Version
          </div>
          <div
            style={{
              fontSize: "0.78rem",
              color: isProActive
                ? "rgba(16,185,129,0.8)"
                : "rgba(245,158,11,0.7)",
              fontWeight: 500,
            }}
          >
            {isProActive
              ? "Pro version is ACTIVE — unlimited generations"
              : "Pro version is DISABLED (coming soon)"}
          </div>
        </div>
      </div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <span
          style={{
            fontSize: "0.82rem",
            color: "rgba(200,210,230,0.7)",
          }}
        >
          {isProActive ? "Disable" : "Activate"}
        </span>
        <div
          onClick={togglePro}
          style={{
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            background: isProActive
              ? "linear-gradient(135deg, #10b981, #059669)"
              : "rgba(255,255,255,0.15)",
            position: "relative",
            transition: "background 0.3s ease",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "#fff",
              position: "absolute",
              top: "3px",
              left: isProActive ? "23px" : "3px",
              transition: "left 0.3s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }}
          />
        </div>
      </label>
    </div>
  );
}
